import JSZip from "jszip";
import {
  formatThaiDateShort,
  getEffectiveLeaveDays,
  LEAVE_DAY_PERIOD_SHORT,
  type LeaveBalanceItem,
  type LeaveRequestItem,
} from "./leave-utils";

export interface LeaveRegisterMemberInfo {
  userId: string;
  name: string;
  position: string;
  division?: string;
}

export interface LeaveRegisterRow {
  id: string;
  dateLabel: string;
  sickCount: number | null;
  sickDays: number | null;
  sickTotal: number | null;
  personalCount: number | null;
  personalDays: number | null;
  personalTotal: number | null;
  vacationCount: number | null;
  vacationDays: number | null;
  vacationTotal: number | null;
  vacationRemaining: number | null;
  note: string;
  leaveType?: LeaveRequestItem["leaveType"];
  requestNo?: string;
}

export interface LeaveRegisterData {
  member: LeaveRegisterMemberInfo;
  fiscalYear: number;
  vacationAccumulatedDays: number;
  vacationAnnualDays: number;
  vacationEntitledDays: number;
  sickDaysCarried: number;
  personalDaysCarried: number;
  vacationDaysCarried: number;
  openingNote: string;
  rows: LeaveRegisterRow[];
  summary: {
    sickCount: number;
    sickTotal: number;
    personalCount: number;
    personalTotal: number;
    vacationCount: number;
    vacationTotal: number;
    vacationRemaining: number;
    maternityTotal: number;
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function formatNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return "";
  return Number.isInteger(n) ? String(n) : String(round1(n));
}

function xmlEsc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * สร้างข้อมูลทะเบียนคุมวันลารายบุคคลเรียงตามลำดับวันที่ลา (ใช้ทั้งใน UI ตาราง A4 และไฟล์ Excel)
 */
export function buildLeaveRegisterData({
  member,
  fiscalYear,
  requests,
  balance,
}: {
  member: LeaveRegisterMemberInfo;
  fiscalYear: number;
  requests: LeaveRequestItem[];
  balance?: LeaveBalanceItem | null;
}): LeaveRegisterData {
  const sickDaysCarried = round1(Number(balance?.sickDaysCarried || 0));
  const personalDaysCarried = round1(Number(balance?.personalDaysCarried || 0));
  const maternityDaysCarried = round1(Number(balance?.maternityDaysCarried || 0));
  const vacationAccumulatedDays = round1(
    Number(balance?.vacationAccumulatedDays || 0)
  );
  const vacationAnnualDays = round1(
    balance?.vacationAnnualDays !== undefined &&
      balance?.vacationAnnualDays !== null
      ? Number(balance.vacationAnnualDays)
      : 10
  );
  const vacationDaysCarried = round1(Number(balance?.vacationDaysCarried || 0));
  const vacationEntitledDays = round1(
    vacationAccumulatedDays + vacationAnnualDays
  );

  const approvedLeaves = requests
    .filter(
      (r) =>
        r.applicantUserId === member.userId &&
        r.fiscalYear === fiscalYear &&
        r.status === "approved" &&
        r.leaveType !== "cancel_leave" &&
        getEffectiveLeaveDays(r) > 0
    )
    .sort((a, b) => {
      const dateCmp = String(a.startDate || "").localeCompare(
        String(b.startDate || "")
      );
      if (dateCmp !== 0) return dateCmp;
      return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
    });

  let sickCount = 0;
  let sickTotal = sickDaysCarried;
  let personalCount = 0;
  let personalTotal = personalDaysCarried;
  let vacationCount = 0;
  let vacationTotal = vacationDaysCarried;
  let vacationRemaining = round1(
    Math.max(0, vacationEntitledDays - vacationTotal)
  );
  let maternityTotal = maternityDaysCarried;

  const rows: LeaveRegisterRow[] = approvedLeaves.map((leave) => {
    const days = round1(getEffectiveLeaveDays(leave));
    const dateLabel =
      leave.startDate === leave.endDate
        ? formatThaiDateShort(leave.startDate)
        : `${formatThaiDateShort(leave.startDate)} – ${formatThaiDateShort(
            leave.endDate
          )}`;

    const noteParts: string[] = [];
    if (leave.leaveDayPeriod && leave.leaveDayPeriod !== "full") {
      noteParts.push(LEAVE_DAY_PERIOD_SHORT[leave.leaveDayPeriod]);
    }
    if (leave.cancelledDays > 0) {
      noteParts.push(`ยกเลิกบางส่วน -${formatNum(leave.cancelledDays)} วัน`);
    }

    const row: LeaveRegisterRow = {
      id: leave.id,
      dateLabel,
      sickCount: null,
      sickDays: null,
      sickTotal: null,
      personalCount: null,
      personalDays: null,
      personalTotal: null,
      vacationCount: null,
      vacationDays: null,
      vacationTotal: null,
      vacationRemaining: null,
      note: "",
      leaveType: leave.leaveType,
      requestNo: leave.requestNo,
    };

    if (leave.leaveType === "sick_leave") {
      sickCount += 1;
      sickTotal = round1(sickTotal + days);
      row.sickCount = sickCount;
      row.sickDays = days;
      row.sickTotal = sickTotal;
    } else if (leave.leaveType === "personal_leave") {
      personalCount += 1;
      personalTotal = round1(personalTotal + days);
      row.personalCount = personalCount;
      row.personalDays = days;
      row.personalTotal = personalTotal;
    } else if (leave.leaveType === "vacation_leave") {
      vacationCount += 1;
      vacationTotal = round1(vacationTotal + days);
      vacationRemaining = round1(
        Math.max(0, vacationEntitledDays - vacationTotal)
      );
      row.vacationCount = vacationCount;
      row.vacationDays = days;
      row.vacationTotal = vacationTotal;
      row.vacationRemaining = vacationRemaining;
    } else if (leave.leaveType === "maternity_leave") {
      maternityTotal = round1(maternityTotal + days);
      noteParts.unshift(`ลาคลอดบุตร ${formatNum(days)} วัน`);
    }

    if (leave.requestNo) {
      noteParts.push(leave.requestNo);
    }
    row.note = noteParts.join(" · ");
    return row;
  });

  const openingNote = `สะสม ${formatNum(vacationAccumulatedDays)} ประจำปี ${formatNum(
    vacationAnnualDays
  )}`;

  return {
    member,
    fiscalYear,
    vacationAccumulatedDays,
    vacationAnnualDays,
    vacationEntitledDays,
    sickDaysCarried,
    personalDaysCarried,
    vacationDaysCarried,
    openingNote,
    rows,
    summary: {
      sickCount,
      sickTotal,
      personalCount,
      personalTotal,
      vacationCount,
      vacationTotal,
      vacationRemaining,
      maternityTotal,
    },
  };
}

/**
 * สร้างไฟล์ Excel (.xlsx) ทะเบียนคุมวันลารายบุคคลตรงตามโครงสร้างไฟล์ต้นแบบ (A1:L30+, Merge Headers, TH Sarabun New)
 */
export async function buildLeaveRegisterXlsxUint8Array(
  data: LeaveRegisterData
): Promise<Uint8Array> {
  const zip = new JSZip();

  const cols = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
  const cellInlineStr = (ref: string, text: string, styleIdx: number) =>
    `<c r="${ref}" s="${styleIdx}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(
      text
    )}</t></is></c>`;
  const cellNum = (ref: string, val: number, styleIdx: number) =>
    `<c r="${ref}" s="${styleIdx}"><v>${val}</v></c>`;
  const cellEmpty = (ref: string, styleIdx: number) =>
    `<c r="${ref}" s="${styleIdx}"/>`;

  const rowXmls: string[] = [];

  // Row 1: Title
  rowXmls.push(
    `<row r="1" ht="26" customHeight="1">${cellInlineStr(
      "A1",
      "สถิติวันลาของข้าราชการ/พนักงานราชการ/พนักงานกองทุน",
      1
    )}${cols
      .slice(1)
      .map((c) => cellEmpty(`${c}1`, 1))
      .join("")}</row>`
  );

  // Row 2: Organization
  rowXmls.push(
    `<row r="2" ht="24" customHeight="1">${cellInlineStr(
      "A2",
      `สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร (ปีงบประมาณ ${data.fiscalYear})`,
      1
    )}${cols
      .slice(1)
      .map((c) => cellEmpty(`${c}2`, 1))
      .join("")}</row>`
  );

  // Row 3: Name & Position
  rowXmls.push(
    `<row r="3" ht="24" customHeight="1">${cellInlineStr(
      "A3",
      `ชื่อ  ${data.member.name}          ตำแหน่ง  ${data.member.position || "-"}`,
      1
    )}${cols
      .slice(1)
      .map((c) => cellEmpty(`${c}3`, 1))
      .join("")}</row>`
  );

  // Row 4: Spacer
  rowXmls.push(`<row r="4" ht="10" customHeight="1"/>`);

  // Row 5: Header Group Row
  rowXmls.push(
    `<row r="5" ht="24" customHeight="1">${[
      cellInlineStr("A5", "วัน/เดือน/ปี", 2),
      cellInlineStr("B5", "ลาป่วย", 2),
      cellEmpty("C5", 2),
      cellEmpty("D5", 2),
      cellInlineStr("E5", "ลากิจ", 2),
      cellEmpty("F5", 2),
      cellEmpty("G5", 2),
      cellInlineStr("H5", "ลาพักผ่อน", 2),
      cellEmpty("I5", 2),
      cellEmpty("J5", 2),
      cellEmpty("K5", 2),
      cellInlineStr("L5", "หมายเหตุ", 2),
    ].join("")}</row>`
  );

  // Row 6: Header Sub-columns
  rowXmls.push(
    `<row r="6" ht="24" customHeight="1">${[
      cellEmpty("A6", 2),
      cellInlineStr("B6", "ครั้งที่", 2),
      cellInlineStr("C6", "วัน", 2),
      cellInlineStr("D6", "รวม", 2),
      cellInlineStr("E6", "ครั้งที่", 2),
      cellInlineStr("F6", "วัน", 2),
      cellInlineStr("G6", "รวม", 2),
      cellInlineStr("H6", "ครั้งที่", 2),
      cellInlineStr("I6", "วัน", 2),
      cellInlineStr("J6", "รวม", 2),
      cellInlineStr("K6", "คงเหลือ", 2),
      cellEmpty("L6", 2),
    ].join("")}</row>`
  );

  // Row 7: Opening balance / entitlement row (L7 = สะสม ... ประจำปี ...)
  const hasCarried =
    data.sickDaysCarried > 0 ||
    data.personalDaysCarried > 0 ||
    data.vacationDaysCarried > 0;
  const openingVacRemaining = round1(
    Math.max(0, data.vacationEntitledDays - data.vacationDaysCarried)
  );
  rowXmls.push(
    `<row r="7" ht="24" customHeight="1">${[
      hasCarried
        ? cellInlineStr("A7", "ยอดยกมา", 3)
        : cellEmpty("A7", 3),
      cellEmpty("B7", 3),
      cellEmpty("C7", 3),
      data.sickDaysCarried > 0
        ? cellNum("D7", data.sickDaysCarried, 3)
        : cellEmpty("D7", 3),
      cellEmpty("E7", 3),
      cellEmpty("F7", 3),
      data.personalDaysCarried > 0
        ? cellNum("G7", data.personalDaysCarried, 3)
        : cellEmpty("G7", 3),
      cellEmpty("H7", 3),
      cellEmpty("I7", 3),
      data.vacationDaysCarried > 0
        ? cellNum("J7", data.vacationDaysCarried, 3)
        : cellEmpty("J7", 3),
      cellNum("K7", openingVacRemaining, 3),
      cellInlineStr("L7", data.openingNote, 4),
    ].join("")}</row>`
  );

  // Rows 8+: Chronological approved leaves + padded empty rows up to row 30
  const totalRows = Math.max(23, data.rows.length);
  for (let i = 0; i < totalRows; i++) {
    const rNum = 8 + i;
    const item = data.rows[i];
    if (item) {
      rowXmls.push(
        `<row r="${rNum}" ht="24" customHeight="1">${[
          cellInlineStr(`A${rNum}`, item.dateLabel, 4),
          item.sickCount !== null
            ? cellNum(`B${rNum}`, item.sickCount, 3)
            : cellEmpty(`B${rNum}`, 3),
          item.sickDays !== null
            ? cellNum(`C${rNum}`, item.sickDays, 3)
            : cellEmpty(`C${rNum}`, 3),
          item.sickTotal !== null
            ? cellNum(`D${rNum}`, item.sickTotal, 3)
            : cellEmpty(`D${rNum}`, 3),
          item.personalCount !== null
            ? cellNum(`E${rNum}`, item.personalCount, 3)
            : cellEmpty(`E${rNum}`, 3),
          item.personalDays !== null
            ? cellNum(`F${rNum}`, item.personalDays, 3)
            : cellEmpty(`F${rNum}`, 3),
          item.personalTotal !== null
            ? cellNum(`G${rNum}`, item.personalTotal, 3)
            : cellEmpty(`G${rNum}`, 3),
          item.vacationCount !== null
            ? cellNum(`H${rNum}`, item.vacationCount, 3)
            : cellEmpty(`H${rNum}`, 3),
          item.vacationDays !== null
            ? cellNum(`I${rNum}`, item.vacationDays, 3)
            : cellEmpty(`I${rNum}`, 3),
          item.vacationTotal !== null
            ? cellNum(`J${rNum}`, item.vacationTotal, 3)
            : cellEmpty(`J${rNum}`, 3),
          item.vacationRemaining !== null
            ? cellNum(`K${rNum}`, item.vacationRemaining, 3)
            : cellEmpty(`K${rNum}`, 3),
          cellInlineStr(`L${rNum}`, item.note, 4),
        ].join("")}</row>`
      );
    } else {
      rowXmls.push(
        `<row r="${rNum}" ht="24" customHeight="1">${cols
          .map((c) => cellEmpty(`${c}${rNum}`, 3))
          .join("")}</row>`
      );
    }
  }

  const lastRow = 7 + totalRows;

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:L${lastRow}"/>
  <sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="24"/>
  <cols>
    <col min="1" max="1" width="22" customWidth="1"/>
    <col min="2" max="11" width="8.5" customWidth="1"/>
    <col min="12" max="12" width="24" customWidth="1"/>
  </cols>
  <sheetData>${rowXmls.join("")}</sheetData>
  <mergeCells count="8">
    <mergeCell ref="A1:L1"/>
    <mergeCell ref="A2:L2"/>
    <mergeCell ref="A3:L3"/>
    <mergeCell ref="A5:A6"/>
    <mergeCell ref="B5:D5"/>
    <mergeCell ref="E5:G5"/>
    <mergeCell ref="H5:K5"/>
    <mergeCell ref="L5:L6"/>
  </mergeCells>
  <printOptions horizontalCentered="1"/>
  <pageMargins left="0.4" right="0.3" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
  <pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><sz val="14"/><name val="TH Sarabun New"/></font>
    <font><b/><sz val="16"/><name val="TH Sarabun New"/></font>
    <font><b/><sz val="14"/><name val="TH Sarabun New"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FF000000"/></left>
      <right style="thin"><color rgb="FF000000"/></right>
      <top style="thin"><color rgb="FF000000"/></top>
      <bottom style="thin"><color rgb="FF000000"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="5">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
  </cellXfs>
</styleSheet>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="ทะเบียนคุมวันลา" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  zip.file("[Content_Types].xml", contentTypes);
  zip.file("_rels/.rels", rootRels);
  zip.file("xl/workbook.xml", workbookXml);
  zip.file("xl/_rels/workbook.xml.rels", wbRels);
  zip.file("xl/styles.xml", stylesXml);
  zip.file("xl/worksheets/sheet1.xml", sheetXml);

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

export async function downloadLeaveRegisterXlsx(
  data: LeaveRegisterData
): Promise<void> {
  const bytes = await buildLeaveRegisterXlsxUint8Array(data);
  const blob = new Blob([bytes.slice().buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ทะเบียนคุมวันลา_${data.fiscalYear}_${data.member.name}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
