import JSZip from "jszip";
import {
  formatThaiDateFull,
  formatThaiDateParts,
  formatThaiDateSlash,
  LEAVE_DAY_PERIOD_SHORT,
  LEAVE_TYPE_META,
  type LeaveRequestItem,
  type LeaveType,
} from "./leave-utils";

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const WP_NS = "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
const A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main";
const PIC_NS = "http://schemas.openxmlformats.org/drawingml/2006/picture";

const FONT = "TH Sarabun New";
const R_FONTS = `<w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:eastAsia="${FONT}" w:cs="${FONT}"/>`;
const DEFAULT_RUN_SIZE = 32; // 16pt TH Sarabun New

export interface SignatureRels {
  applicant?: string;
  actingPerson?: string;
  verifier?: string;
  supervisor?: string;
  approver?: string;
}

let docPrCounter = 1;

function xmlEsc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function makeRun(
  text: string,
  opts: { bold?: boolean; underline?: boolean; size?: number } = {}
): string {
  const size = opts.size ?? DEFAULT_RUN_SIZE;
  return `<w:r><w:rPr>${R_FONTS}${opts.bold ? "<w:b/><w:bCs/>" : ""
    }${opts.underline ? '<w:u w:val="single"/>' : ""
    }<w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:color w:val="000000"/></w:rPr><w:t xml:space="preserve">${xmlEsc(
      text
    )}</w:t></w:r>`;
}

function makeBreakRun(size = DEFAULT_RUN_SIZE): string {
  return `<w:r><w:rPr>${R_FONTS}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:color w:val="000000"/></w:rPr><w:br/></w:r>`;
}

function formatWrittenAtShort(writtenAt?: string | null): string {
  const trimmed = (writtenAt || "").trim();
  if (
    !trimmed ||
    trimmed === "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร" ||
    trimmed === "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์ จังหวัดกำแพงเพชร"
  ) {
    return "สนง.พมจ.กำแพงเพชร";
  }
  return trimmed;
}

function buildPositionRuns(
  position: string | null | undefined,
  size = DEFAULT_RUN_SIZE
): string {
  const raw = (position || "").trim();
  if (!raw) {
    return makeRun(" ....................................", { size });
  }
  if (raw.length > 35 && raw.includes("จังหวัด")) {
    const idx = raw.indexOf("จังหวัด");
    const before = raw.slice(0, idx).trimEnd();
    const after = raw.slice(idx);
    if (before && after) {
      return makeRun(` ${before}`, { size }) + makeBreakRun(size) + makeRun(after, { size });
    }
  }
  return makeRun(` ${raw}`, { size });
}

function formatActingPersonLine(actingPersonName?: string | null): string {
  const trimmed = (actingPersonName || "").trim();
  if (trimmed) {
    return `${trimmed} ปฏิบัติหน้าที่แทน`;
  }
  return "นาย/นาง/นางสาว .................................. ปฏิบัติหน้าที่แทน";
}

function makeSignatureDrawingPara(
  rId?: string,
  opts: { align?: "left" | "center" | "right"; leftIndent?: number } = {}
): string {
  if (!rId) return "";
  const idNum = docPrCounter++;
  const cx = 1080000; // ~3.0 cm
  const cy = 300000; // ~0.83 cm (compact to keep entire form on 1 A4 page)
  const align = opts.align ?? "center";
  const indXml = opts.leftIndent ? `<w:ind w:left="${opts.leftIndent}"/>` : "";
  const drawing = `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${idNum}" name="Signature_${idNum}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="${A_NS}" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="${A_NS}"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="${PIC_NS}"><pic:nvPicPr><pic:cNvPr id="0" name="Signature_${idNum}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
  return `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="200" w:lineRule="auto"/>${indXml}<w:jc w:val="${align}"/></w:pPr>${drawing}</w:p>`;
}

function makePara(
  runsXml: string,
  opts: {
    align?: "left" | "center" | "right";
    before?: number;
    after?: number;
    line?: number;
    leftIndent?: number;
    firstLine?: number;
  } = {}
): string {
  const align = opts.align ?? "left";
  const before = opts.before ?? 0;
  const after = opts.after ?? 20;
  const line = opts.line ?? 220;
  const indAttrs = [
    opts.leftIndent ? `w:left="${opts.leftIndent}"` : "",
    opts.firstLine ? `w:firstLine="${opts.firstLine}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const indXml = indAttrs ? `<w:ind ${indAttrs}/>` : "";
  return `<w:p><w:pPr><w:spacing w:before="${before}" w:after="${after}" w:line="${line}" w:lineRule="auto"/>${indXml}<w:jc w:val="${align}"/></w:pPr>${runsXml}</w:p>`;
}

function makeTableCell(
  innerXml: string,
  widthDxa: number,
  opts: { borders?: boolean; fill?: string; vAlign?: "top" | "center" } = {}
): string {
  const borderXml = opts.borders
    ? `<w:tcBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
      </w:tcBorders>`
    : `<w:tcBorders>
        <w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/>
      </w:tcBorders>`;
  const shdXml = opts.fill
    ? `<w:shd w:val="clear" w:color="auto" w:fill="${opts.fill}"/>`
    : "";
  return `<w:tc>
    <w:tcPr>
      <w:tcW w:w="${widthDxa}" w:type="dxa"/>
      ${borderXml}
      ${shdXml}
      <w:tcMar>
        <w:top w:w="20" w:type="dxa"/>
        <w:bottom w:w="20" w:type="dxa"/>
        <w:left w:w="60" w:type="dxa"/>
        <w:right w:w="60" w:type="dxa"/>
      </w:tcMar>
      <w:vAlign w:val="${opts.vAlign ?? "top"}"/>
    </w:tcPr>
    ${innerXml}
  </w:tc>`;
}

function chk(checked: boolean): string {
  return checked ? "☑" : "☐";
}

function getPeriodSuffix(leave: LeaveRequestItem): string {
  return leave.leaveDayPeriod && leave.leaveDayPeriod !== "full"
    ? ` (${LEAVE_DAY_PERIOD_SHORT[leave.leaveDayPeriod]})`
    : "";
}

function base64DataUrlToBytes(dataUrl?: string | null): Uint8Array | null {
  if (!dataUrl || !dataUrl.startsWith("data:image/png;base64,")) return null;
  const b64 = dataUrl.slice("data:image/png;base64,".length);
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

function buildCancelLeaveBody(leave: LeaveRequestItem, sigRels: SignatureRels): string {
  const writtenParts = formatThaiDateParts(leave.writtenDate);
  const targetLabel =
    leave.cancelTargetLeaveType &&
      LEAVE_TYPE_META[leave.cancelTargetLeaveType as LeaveType]
      ? LEAVE_TYPE_META[leave.cancelTargetLeaveType as LeaveType].label
      : "ลา";

  const parts: string[] = [];

  parts.push(
    makePara(makeRun("แบบใบขอยกเลิกวันลา", { bold: true, size: 36 }), {
      align: "center",
      after: 120,
    })
  );

  parts.push(
    makePara(
      makeRun("เขียนที่", { bold: true }) +
      makeRun(` ${formatWrittenAtShort(leave.writtenAt)}`),
      { leftIndent: 5540, firstLine: 220, after: 20 }
    )
  );
  parts.push(
    makePara(
      makeRun("วันที่", { bold: true }) +
      makeRun(` ${writtenParts.day || "...."} `) +
      makeRun("เดือน", { bold: true }) +
      makeRun(` ${writtenParts.month || "............"} `) +
      makeRun("พ.ศ.", { bold: true }) +
      makeRun(` ${writtenParts.yearBE || "......"}`),
      { leftIndent: 5100, firstLine: 660, after: 120 }
    )
  );

  parts.push(
    makePara(
      makeRun("เรื่อง  ", { bold: true }) +
      makeRun(leave.subject || "ขอยกเลิกวันลา"),
      { after: 40 }
    )
  );
  parts.push(
    makePara(
      makeRun("เรียน  ", { bold: true }) +
      makeRun(
        leave.toRecipient ||
        "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"
      ),
      { after: 100 }
    )
  );

  parts.push(
    makePara(
      makeRun("ข้าพเจ้า", { bold: true }) +
      makeRun(` ${leave.applicantName}   `) +
      makeRun("ตำแหน่ง", { bold: true }) +
      makeRun(` ${leave.applicantPosition || "-"}  `) +
      makeRun("กลุ่ม/ฝ่าย", { bold: true }) +
      makeRun(` ${leave.applicantDivision || "-"}   `) +
      makeRun("สังกัด", { bold: true }) +
      makeRun(" สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"),
      { firstLine: 720, after: 60 }
    )
  );
  parts.push(
    makePara(
      makeRun(
        `ได้รับอนุญาตให้${targetLabel} (เลขที่ ${leave.cancelTargetRequestNo || "-"
        }) ตั้งแต่วันที่ ${leave.cancelTargetStartDate
          ? formatThaiDateFull(leave.cancelTargetStartDate)
          : "-"
        } ถึงวันที่ ${leave.cancelTargetEndDate
          ? formatThaiDateFull(leave.cancelTargetEndDate)
          : "-"
        } รวม ${leave.cancelTargetDays ?? "-"} วัน นั้น`
      ),
      { firstLine: 720, after: 60 }
    )
  );
  parts.push(
    makePara(
      makeRun(
        `เนื่องจาก ${leave.reason || "-"
        } จึงขอยกเลิกวันลา${targetLabel} ตั้งแต่วันที่ ${formatThaiDateFull(
          leave.startDate
        )} ถึงวันที่ ${formatThaiDateFull(leave.endDate)} จำนวน ${leave.totalWorkingDays
        } วันทำการ${getPeriodSuffix(leave)}`
      ),
      { firstLine: 720, after: 180 }
    )
  );

  parts.push(
    makePara(makeRun("ขอแสดงความนับถือ"), {
      leftIndent: 4500,
      align: "center",
      after: 40,
    })
  );
  if (sigRels.applicant) {
    parts.push(
      makeSignatureDrawingPara(sigRels.applicant, {
        align: "center",
        leftIndent: 4500,
      })
    );
  }
  parts.push(
    makePara(
      makeRun("(ลงชื่อ)", { bold: true }) +
      makeRun("......................................................"),
      {
        leftIndent: 4500,
        align: "center",
        after: 20,
      }
    )
  );
  parts.push(
    makePara(makeRun(`   (${leave.applicantName})`), {
      leftIndent: 4500,
      align: "center",
      after: 20,
    })
  );
  parts.push(
    makePara(
      makeRun("ตำแหน่ง", { bold: true }) +
      makeRun(` ${leave.applicantPosition || "-"}`),
      {
        leftIndent: 4500,
        align: "center",
        after: 200,
      }
    )
  );

  const leftColXml = [
    makePara(makeRun("ความเห็นผู้บังคับบัญชา", { bold: true, underline: true }), {
      align: "center",
      after: 60,
    }),
    makePara(
      makeRun(
        leave.supervisorComment ||
        ".................................................................................."
      ),
      { align: "center", after: 100 }
    ),
    makeSignatureDrawingPara(sigRels.supervisor, { align: "center" }),
    makePara(
      makeRun("(ลงชื่อ)", { bold: true }) +
      makeRun(" ..............................................."),
      { align: "center", after: 20 }
    ),
    makePara(
      makeRun(
        `(${leave.supervisorName || "........................................"})`
      ),
      { align: "center", after: 20 }
    ),
    makePara(
      makeRun("(ตำแหน่ง)", { bold: true }) +
      buildPositionRuns(leave.supervisorPosition),
      { align: "center", after: 20 }
    ),
    makePara(
      makeRun("วันที่", { bold: true }) +
      makeRun(
        ` ${leave.supervisorReviewedAt
          ? formatThaiDateSlash(leave.supervisorReviewedAt)
          : "........ / ........ / ........"
        }`
      ),
      { align: "center", after: 0 }
    ),
  ].join("");

  const rightColXml = [
    makePara(
      makeRun("คำสั่ง   ", { bold: true }) +
      makeRun(
        `${chk(leave.orderDecision === "approved")} อนุญาต    ${chk(
          leave.orderDecision === "rejected"
        )} ไม่อนุญาต`
      ),
      { align: "center", after: 60 }
    ),
    leave.orderComment
      ? makePara(makeRun(leave.orderComment), { align: "center", after: 80 })
      : makePara(makeRun(""), { after: 80 }),
    makeSignatureDrawingPara(sigRels.approver, { align: "center" }),
    makePara(
      makeRun("(ลงชื่อ)", { bold: true }) +
      makeRun(" ................................................."),
      { align: "center", after: 20 }
    ),
    makePara(
      makeRun(
        `(${leave.approverName || "........................................"})`
      ),
      { align: "center", after: 20 }
    ),
    makePara(
      makeRun("(ตำแหน่ง)", { bold: true }) +
      buildPositionRuns(leave.approverPosition),
      { align: "center", after: 20 }
    ),
    makePara(
      makeRun("วันที่", { bold: true }) +
      makeRun(
        ` ${leave.orderedAt
          ? formatThaiDateSlash(leave.orderedAt)
          : "........ / ........ / ........"
        }`
      ),
      { align: "center", after: 0 }
    ),
  ].join("");

  parts.push(`<w:tbl>
    <w:tblPr>
      <w:tblW w:w="9582" w:type="dxa"/>
      <w:tblInd w:w="60" w:type="dxa"/>
      <w:tblLayout w:type="fixed"/>
      <w:tblCellMar>
        <w:left w:w="10" w:type="dxa"/>
        <w:right w:w="10" w:type="dxa"/>
      </w:tblCellMar>
      <w:tblBorders>
        <w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid><w:gridCol w:w="4712"/><w:gridCol w:w="363"/><w:gridCol w:w="4507"/></w:tblGrid>
    <w:tr>
      ${makeTableCell(leftColXml, 4712)}
      ${makeTableCell(makePara(makeRun("")), 363)}
      ${makeTableCell(rightColXml, 4507)}
    </w:tr>
  </w:tbl>`);

  return parts.join("");
}

function buildVacationLeaveBody(leave: LeaveRequestItem, sigRels: SignatureRels): string {
  const writtenParts = formatThaiDateParts(leave.writtenDate);
  const startParts = formatThaiDateParts(leave.startDate);
  const endParts = formatThaiDateParts(leave.endDate);
  const totalEntitled =
    Number(leave.vacationAccumulatedDays || 0) +
    Number(leave.vacationAnnualDays || 0);
  const totalUsed =
    Number(leave.prevVacationDays || 0) + Number(leave.totalWorkingDays || 0);

  const parts: string[] = [];

  // 1. Title (18pt / sz=36 bold centered)
  parts.push(
    makePara(makeRun("ใบลาพักผ่อน", { bold: true, size: 36 }), {
      align: "center",
      after: 40,
    })
  );

  // 2. เขียนที่ & วันที่เขียน
  parts.push(
    makePara(
      makeRun("เขียนที่", { bold: true }) +
      makeRun(` ${formatWrittenAtShort(leave.writtenAt)}`),
      { leftIndent: 5540, firstLine: 220, after: 0 }
    )
  );
  parts.push(
    makePara(
      makeRun("วันที่", { bold: true }) +
      makeRun(` ${writtenParts.day || "...."} `) +
      makeRun("เดือน", { bold: true }) +
      makeRun(` ${writtenParts.month || "............"} `) +
      makeRun("พ.ศ.", { bold: true }) +
      makeRun(` ${writtenParts.yearBE || "......"}`),
      { leftIndent: 5100, firstLine: 660, after: 40 }
    )
  );

  // 3. เรื่อง / เรียน
  parts.push(
    makePara(
      makeRun("เรื่อง  ", { bold: true }) +
      makeRun(leave.subject || "ขอลาพักผ่อน"),
      { after: 20 }
    )
  );
  parts.push(
    makePara(
      makeRun("เรียน  ", { bold: true }) +
      makeRun(
        leave.toRecipient ||
        "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"
      ),
      { after: 40 }
    )
  );

  // 4. ย่อหน้าข้อมูลผู้ขอลา
  parts.push(
    makePara(
      makeRun("ข้าพเจ้า", { bold: true }) +
      makeRun(` ${leave.applicantName}   `) +
      makeRun("ตำแหน่ง", { bold: true }) +
      makeRun(` ${leave.applicantPosition || "-"}  `) +
      makeRun("กลุ่ม/ฝ่าย", { bold: true }) +
      makeRun(` ${leave.applicantDivision || "-"}   `) +
      makeRun("สังกัด", { bold: true }) +
      makeRun(" สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"),
      { firstLine: 720, after: 20 }
    )
  );

  // 5. ย่อหน้าสิทธิ์วันลาพักผ่อน
  parts.push(
    makePara(
      makeRun("มีวันลาพักผ่อนสะสม", { bold: true }) +
      makeRun(` ${leave.vacationAccumulatedDays} `) +
      makeRun("วันทำการ", { bold: true }) +
      makeRun("  ") +
      makeRun("มีสิทธิลาพักผ่อนประจำปีอีก", { bold: true }) +
      makeRun(` ${leave.vacationAnnualDays} `) +
      makeRun("วันทำการ", { bold: true }) +
      makeRun("  ") +
      makeRun("รวมเป็น", { bold: true }) +
      makeRun(` ${totalEntitled} `) +
      makeRun("วันทำการ", { bold: true }),
      { after: 20 }
    )
  );

  // 6. ย่อหน้าช่วงวันลา + ติดต่อ (มี <w:br/> ก่อน มีกำหนด)
  const periodSuffix = getPeriodSuffix(leave);
  parts.push(
    makePara(
      makeRun("ขอลาพักผ่อนตั้งแต่วันที่", { bold: true }) +
      makeRun(` ${startParts.day} `) +
      makeRun("เดือน", { bold: true }) +
      makeRun(` ${startParts.month} `) +
      makeRun("พ.ศ.", { bold: true }) +
      makeRun(` ${startParts.yearBE} `) +
      makeRun("ถึงวันที่", { bold: true }) +
      makeRun(` ${endParts.day} `) +
      makeRun("เดือน", { bold: true }) +
      makeRun(` ${endParts.month} `) +
      makeRun("พ.ศ.", { bold: true }) +
      makeRun(` ${endParts.yearBE} `) +
      makeBreakRun() +
      makeRun("มีกำหนด", { bold: true }) +
      makeRun(` ${leave.totalWorkingDays} `) +
      makeRun("วัน", { bold: true }) +
      (periodSuffix ? makeRun(periodSuffix) : "") +
      makeRun("  ") +
      makeRun("ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่", { bold: true }) +
      makeRun(
        ` ${leave.contactInfo || "-"}  หมายเลขโทรศัพท์ ${leave.contactPhone || "-"
        }`
      ),
      { after: 30 }
    )
  );

  // 7. คำลงท้ายและลายเซ็นผู้ขอลา
  parts.push(
    makePara(makeRun("ขอแสดงความนับถือ"), {
      leftIndent: 4500,
      align: "center",
      after: 0,
    })
  );
  if (sigRels.applicant) {
    parts.push(
      makeSignatureDrawingPara(sigRels.applicant, {
        align: "center",
        leftIndent: 4500,
      })
    );
  }
  parts.push(
    makePara(
      makeRun("(ลงชื่อ)", { bold: true }) +
      makeRun("......................................................"),
      {
        leftIndent: 4500,
        align: "center",
        after: 0,
      }
    )
  );
  parts.push(
    makePara(makeRun(`   (${leave.applicantName})`), {
      leftIndent: 4500,
      align: "center",
      after: 0,
    })
  );
  parts.push(
    makePara(
      makeRun("ตำแหน่ง", { bold: true }) +
      makeRun(` ${leave.applicantPosition || "-"}`),
      {
        leftIndent: 4500,
        align: "center",
        after: 60,
      }
    )
  );

  // 8. ตารางสถิติการลาในปีงบประมาณนี้
  const statsTable = `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="4485" w:type="dxa"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
      </w:tblBorders>
      <w:tblLayout w:type="fixed"/>
      <w:tblCellMar>
        <w:left w:w="10" w:type="dxa"/>
        <w:right w:w="10" w:type="dxa"/>
      </w:tblCellMar>
    </w:tblPr>
    <w:tblGrid><w:gridCol w:w="1495"/><w:gridCol w:w="1495"/><w:gridCol w:w="1495"/></w:tblGrid>
    <w:tr>
      <w:trPr><w:trHeight w:val="640"/></w:trPr>
      ${makeTableCell(
    makePara(makeRun("ลามาแล้ว (วันทำการ)", { bold: true, size: 32 }), {
      align: "center",
      after: 0,
    }),
    1495,
    { borders: true, vAlign: "center" }
  )}
      ${makeTableCell(
    makePara(makeRun("ลาครั้งนี้ (วันทำการ)", { bold: true, size: 32 }), {
      align: "center",
      after: 0,
    }),
    1495,
    { borders: true, vAlign: "center" }
  )}
      ${makeTableCell(
    makePara(makeRun("รวมเป็น (วันทำการ)", { bold: true, size: 32 }), {
      align: "center",
      after: 0,
    }),
    1495,
    { borders: true, vAlign: "center" }
  )}
    </w:tr>
    <w:tr>
      <w:trPr><w:trHeight w:val="360"/></w:trPr>
      ${makeTableCell(
    makePara(makeRun(String(leave.prevVacationDays), { size: 32 }), {
      align: "center",
      after: 0,
    }),
    1495,
    { borders: true, vAlign: "center" }
  )}
      ${makeTableCell(
    makePara(makeRun(String(leave.totalWorkingDays), { size: 32 }), {
      align: "center",
      after: 0,
    }),
    1495,
    { borders: true, vAlign: "center" }
  )}
      ${makeTableCell(
    makePara(makeRun(String(totalUsed), { bold: true, size: 32 }), {
      align: "center",
      after: 0,
    }),
    1495,
    { borders: true, vAlign: "center" }
  )}
    </w:tr>
  </w:tbl>`;

  const leftColXml = [
    makePara(makeRun("สถิติการลาในปีงบประมาณนี้", { bold: true }), {
      align: "center",
      after: 20,
    }),
    statsTable,
    makeSignatureDrawingPara(sigRels.verifier, { align: "left", leftIndent: 500 }),
    makePara(
      makeRun("(ลงชื่อ)", { bold: true }) +
      makeRun("                               ", { bold: true }) +
      makeRun("ผู้ตรวจสอบ", { bold: true }),
      { before: sigRels.verifier ? 0 : 80, after: 0 }
    ),
    makePara(
      makeRun(
        `(${leave.verifierName || "................................................"})`
      ),
      { leftIndent: 700, after: 0 }
    ),
    makePara(
      makeRun("(ตำแหน่ง)", { bold: true }) +
      makeRun(` ${leave.verifierPosition || "...................................."}`),
      { after: 0 }
    ),
    makePara(
      makeRun("         ") +
      makeRun("วันที่", { bold: true }) +
      makeRun(
        ` ${leave.verifiedAt
          ? formatThaiDateSlash(leave.verifiedAt)
          : "........ / ........ / ........"
        }`
      ),
      { after: 80 }
    ),
    makePara(makeRun("ในระหว่างที่ข้าพเจ้าลาพักผ่อนมอบหมายให้"), { after: 0 }),
    makePara(makeRun(formatActingPersonLine(leave.actingPersonName)), {
      after: 30,
    }),
    makeSignatureDrawingPara(sigRels.applicant, { align: "left", leftIndent: 500 }),
    makePara(
      makeRun("(ลงชื่อ)", { bold: true }) +
      makeRun(".......................................... ") +
      makeRun("ผู้มอบ", { bold: true }),
      { after: 0 }
    ),
    makePara(makeRun(`(${leave.applicantName})`), {
      leftIndent: 700,
      after: 30,
    }),
    makeSignatureDrawingPara(sigRels.actingPerson, {
      align: "left",
      leftIndent: 500,
    }),
    makePara(
      makeRun("(ลงชื่อ)", { bold: true }) +
      makeRun("........................................... ") +
      makeRun("ผู้ปฏิบัติหน้าที่แทน", { bold: true }),
      { after: 0 }
    ),
    makePara(
      makeRun(
        `(${leave.actingPersonName || "........................................"})`
      ),
      { leftIndent: 700, after: 0 }
    ),
  ].join("");

  const rightColXml = [
    makePara(makeRun("ความเห็นผู้บังคับบัญชา", { bold: true, underline: true }), {
      align: "center",
      after: 20,
    }),
    makePara(
      makeRun(
        leave.supervisorComment ||
        ".................................................................................."
      ),
      { after: 40 }
    ),
    makeSignatureDrawingPara(sigRels.supervisor, { align: "center" }),
    makePara(
      makeRun("(ลงชื่อ)", { bold: true }) +
      makeRun(" ..............................................."),
      { align: "center", after: 0 }
    ),
    makePara(
      makeRun(
        `(${leave.supervisorName || "........................................"})`
      ),
      { align: "center", after: 0 }
    ),
    makePara(
      makeRun("(ตำแหน่ง)", { bold: true }) +
      buildPositionRuns(leave.supervisorPosition),
      { align: "center", after: 0 }
    ),
    makePara(
      makeRun("วันที่", { bold: true }) +
      makeRun(
        ` ${leave.supervisorReviewedAt
          ? formatThaiDateSlash(leave.supervisorReviewedAt)
          : "........ / ........ / ........"
        }`
      ),
      { align: "center", after: 80 }
    ),
    makePara(
      makeRun("คำสั่ง   ", { bold: true }) +
      makeRun(
        `${chk(leave.orderDecision === "approved")} อนุญาต    ${chk(
          leave.orderDecision === "rejected"
        )} ไม่อนุญาต`
      ),
      { align: "center", after: 20 }
    ),
    leave.orderComment
      ? makePara(makeRun(leave.orderComment), { align: "center", after: 40 })
      : makePara(makeRun(""), { after: 40 }),
    makeSignatureDrawingPara(sigRels.approver, { align: "center" }),
    makePara(
      makeRun("(ลงชื่อ)", { bold: true }) +
      makeRun(" ................................................."),
      { align: "center", after: 0 }
    ),
    makePara(
      makeRun(
        `(${leave.approverName || "........................................"})`
      ),
      { align: "center", after: 0 }
    ),
    makePara(
      makeRun("(ตำแหน่ง)", { bold: true }) +
      buildPositionRuns(leave.approverPosition),
      { align: "center", after: 0 }
    ),
    makePara(
      makeRun("วันที่", { bold: true }) +
      makeRun(
        ` ${leave.orderedAt
          ? formatThaiDateSlash(leave.orderedAt)
          : "........ / ........ / ........"
        }`
      ),
      { align: "center", after: 0 }
    ),
  ].join("");

  parts.push(`<w:tbl>
    <w:tblPr>
      <w:tblW w:w="9582" w:type="dxa"/>
      <w:tblInd w:w="60" w:type="dxa"/>
      <w:tblLayout w:type="fixed"/>
      <w:tblCellMar>
        <w:left w:w="10" w:type="dxa"/>
        <w:right w:w="10" w:type="dxa"/>
      </w:tblCellMar>
      <w:tblBorders>
        <w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid><w:gridCol w:w="4712"/><w:gridCol w:w="363"/><w:gridCol w:w="4507"/></w:tblGrid>
    <w:tr>
      ${makeTableCell(leftColXml, 4712)}
      ${makeTableCell(makePara(makeRun("")), 363)}
      ${makeTableCell(rightColXml, 4507)}
    </w:tr>
  </w:tbl>`);

  return parts.join("");
}

function buildGeneralLeaveBody(leave: LeaveRequestItem, sigRels: SignatureRels): string {
  const writtenParts = formatThaiDateParts(leave.writtenDate);
  const verifiedParts = formatThaiDateParts(leave.verifiedAt);
  const supParts = formatThaiDateParts(leave.supervisorReviewedAt);
  const ordParts = formatThaiDateParts(leave.orderedAt);

  const curSick = leave.leaveType === "sick_leave" ? leave.totalWorkingDays : 0;
  const curPersonal =
    leave.leaveType === "personal_leave" ? leave.totalWorkingDays : 0;
  const curMaternity =
    leave.leaveType === "maternity_leave" ? leave.totalWorkingDays : 0;

  const parts: string[] = [];

  parts.push(
    makePara(
      makeRun("ใบลาป่วย ลาคลอดบุตร ลากิจส่วนตัว", { bold: true, size: 36 }),
      { align: "center", after: 40 }
    )
  );

  parts.push(
    makePara(
      makeRun("เขียนที่", { bold: true }) +
      makeRun(` ${formatWrittenAtShort(leave.writtenAt)}`),
      { leftIndent: 5540, firstLine: 220, after: 0 }
    )
  );
  parts.push(
    makePara(
      makeRun("วันที่", { bold: true }) +
      makeRun(` ${writtenParts.day || "...."} `) +
      makeRun("เดือน", { bold: true }) +
      makeRun(` ${writtenParts.month || "............"} `) +
      makeRun("พ.ศ.", { bold: true }) +
      makeRun(` ${writtenParts.yearBE || "......"}`),
      { leftIndent: 5100, firstLine: 660, after: 40 }
    )
  );

  parts.push(
    makePara(makeRun("เรื่อง  ", { bold: true }) + makeRun(leave.subject), {
      after: 20,
    })
  );
  parts.push(
    makePara(
      makeRun("เรียน  ", { bold: true }) +
      makeRun(
        leave.toRecipient ||
        "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"
      ),
      { after: 40 }
    )
  );

  parts.push(
    makePara(
      makeRun("ข้าพเจ้า", { bold: true }) +
      makeRun(` ${leave.applicantName}   `) +
      makeRun("ตำแหน่ง", { bold: true }) +
      makeRun(` ${leave.applicantPosition || "-"}  `) +
      makeRun("กลุ่ม/ฝ่าย", { bold: true }) +
      makeRun(` ${leave.applicantDivision || "-"}   `) +
      makeRun("สังกัด", { bold: true }) +
      makeRun(" สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"),
      { firstLine: 720, after: 20 }
    )
  );

  parts.push(
    makePara(
      makeRun(
        `${chk(leave.leaveType === "sick_leave")} ป่วย${leave.leaveType === "sick_leave" && leave.reason
          ? `  เนื่องจาก ${leave.reason}`
          : ""
        }`
      ),
      { leftIndent: 900, after: 0 }
    )
  );
  parts.push(
    makePara(
      makeRun(
        `ขอลา   ${chk(
          leave.leaveType === "personal_leave"
        )} กิจส่วนตัว   เนื่องจาก ${leave.leaveType === "personal_leave"
          ? leave.reason || "-"
          : "............................................................"
        }`
      ),
      { leftIndent: 260, after: 0 }
    )
  );
  parts.push(
    makePara(
      makeRun(
        `${chk(leave.leaveType === "maternity_leave")} คลอดบุตร${leave.leaveType === "maternity_leave" && leave.reason
          ? ` (${leave.reason})`
          : ""
        }`
      ),
      { leftIndent: 900, after: 20 }
    )
  );

  parts.push(
    makePara(
      makeRun(
        `ตั้งแต่วันที่ ${formatThaiDateFull(
          leave.startDate
        )} ถึงวันที่ ${formatThaiDateFull(leave.endDate)} มีกำหนด ${leave.totalWorkingDays
        } วัน${getPeriodSuffix(leave)}`
      ),
      { after: 20 }
    )
  );

  parts.push(
    makePara(
      makeRun(
        `ข้าพเจ้าได้ลา  ${chk(leave.lastLeaveType === "sick_leave")} ป่วย  ${chk(
          leave.lastLeaveType === "personal_leave"
        )} กิจส่วนตัว  ${chk(
          leave.lastLeaveType === "maternity_leave"
        )} คลอดบุตร  ครั้งสุดท้ายตั้งแต่วันที่ ${leave.lastLeaveStartDate
          ? formatThaiDateFull(leave.lastLeaveStartDate)
          : "-"
        }`
      ),
      { after: 0 }
    )
  );

  const contactCombined =
    [leave.contactInfo, leave.contactPhone].filter(Boolean).join(" โทร. ") ||
    "-";
  parts.push(
    makePara(
      makeRun(
        `ถึงวันที่ ${leave.lastLeaveEndDate
          ? formatThaiDateFull(leave.lastLeaveEndDate)
          : "-"
        } มีกำหนด ${leave.lastLeaveDays ?? "-"
        } วัน  ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่ ${contactCombined}`
      ),
      { after: 40 }
    )
  );

  parts.push(
    makePara(makeRun("ขอแสดงความนับถือ"), {
      leftIndent: 4500,
      align: "center",
      after: 0,
    })
  );
  if (sigRels.applicant) {
    parts.push(
      makeSignatureDrawingPara(sigRels.applicant, {
        align: "center",
        leftIndent: 4500,
      })
    );
  }
  parts.push(
    makePara(
      makeRun("(ลงชื่อ)", { bold: true }) +
      makeRun("......................................................"),
      {
        leftIndent: 4500,
        align: "center",
        after: 0,
      }
    )
  );
  parts.push(
    makePara(makeRun(`   (${leave.applicantName})`), {
      leftIndent: 4500,
      align: "center",
      after: 0,
    })
  );
  parts.push(
    makePara(
      makeRun("ตำแหน่ง", { bold: true }) +
      makeRun(` ${leave.applicantPosition || "-"}`),
      {
        leftIndent: 4500,
        align: "center",
        after: 60,
      }
    )
  );

  const statRow = (
    label: string,
    prev: number,
    cur: number
  ) => `<w:tr>
    ${makeTableCell(makePara(makeRun(label, { size: 28 }), { after: 0 }), 1121, {
    borders: true,
    vAlign: "center",
  })}
    ${makeTableCell(
    makePara(makeRun(String(prev), { size: 28 }), {
      align: "center",
      after: 0,
    }),
    1121,
    { borders: true, vAlign: "center" }
  )}
    ${makeTableCell(
    makePara(makeRun(cur ? String(cur) : "", { size: 28 }), {
      align: "center",
      after: 0,
    }),
    1121,
    { borders: true, vAlign: "center" }
  )}
    ${makeTableCell(
    makePara(makeRun(String(prev + cur), { bold: true, size: 28 }), {
      align: "center",
      after: 0,
    }),
    1122,
    { borders: true, vAlign: "center" }
  )}
  </w:tr>`;

  const statsTable = `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="4485" w:type="dxa"/>
      <w:tblLayout w:type="fixed"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid><w:gridCol w:w="1121"/><w:gridCol w:w="1121"/><w:gridCol w:w="1121"/><w:gridCol w:w="1122"/></w:tblGrid>
    <w:tr>
      ${makeTableCell(
    makePara(makeRun("ประเภทลา", { bold: true, size: 28 }), {
      align: "center",
      after: 0,
    }),
    1121,
    { borders: true, vAlign: "center" }
  )}
      ${makeTableCell(
    makePara(makeRun("ลามาแล้ว\n(วันทำการ)", { bold: true, size: 26 }), {
      align: "center",
      after: 0,
    }),
    1121,
    { borders: true, vAlign: "center" }
  )}
      ${makeTableCell(
    makePara(makeRun("ลาครั้งนี้\n(วันทำการ)", { bold: true, size: 26 }), {
      align: "center",
      after: 0,
    }),
    1121,
    { borders: true, vAlign: "center" }
  )}
      ${makeTableCell(
    makePara(makeRun("รวมเป็น\n(วันทำการ)", { bold: true, size: 26 }), {
      align: "center",
      after: 0,
    }),
    1122,
    { borders: true, vAlign: "center" }
  )}
    </w:tr>
    ${statRow("ป่วย", leave.prevSickDays, curSick)}
    ${statRow("กิจส่วนตัว", leave.prevPersonalDays, curPersonal)}
    ${statRow("คลอดบุตร", leave.prevMaternityDays, curMaternity)}
  </w:tbl>`;

  const leftColXml = [
    makePara(makeRun("สถิติการลาในปีงบประมาณนี้", { bold: true }), {
      align: "center",
      after: 20,
    }),
    statsTable,
    makeSignatureDrawingPara(sigRels.verifier, { align: "left", leftIndent: 500 }),
    makePara(
      makeRun("(ลงชื่อ)", { bold: true }) +
      makeRun("                               ", { bold: true }) +
      makeRun("ผู้ตรวจสอบ", { bold: true }),
      { before: sigRels.verifier ? 0 : 80, after: 0 }
    ),
    makePara(
      makeRun(
        `(${leave.verifierName || "................................................"})`
      ),
      { leftIndent: 700, after: 0 }
    ),
    makePara(
      makeRun("(ตำแหน่ง)", { bold: true }) +
      makeRun(` ${leave.verifierPosition || "...................................."}`),
      { after: 0 }
    ),
    makePara(
      makeRun("วันที่", { bold: true }) +
      makeRun(
        ` ${verifiedParts.day || "...."} เดือน ${verifiedParts.month || "............"
        } พ.ศ. ${verifiedParts.yearBE || "......"}`
      ),
      { after: 0 }
    ),
  ].join("");

  const rightColXml = [
    makePara(makeRun("ความเห็นผู้บังคับบัญชา", { bold: true, underline: true }), {
      align: "center",
      after: 20,
    }),
    makePara(
      makeRun(
        leave.supervisorComment ||
        ".................................................................................."
      ),
      { after: 40 }
    ),
    makeSignatureDrawingPara(sigRels.supervisor, { align: "center" }),
    makePara(
      makeRun("(ลงชื่อ)", { bold: true }) +
      makeRun(" ..............................................."),
      { align: "center", after: 0 }
    ),
    makePara(
      makeRun(
        `(${leave.supervisorName || "........................................"})`
      ),
      { align: "center", after: 0 }
    ),
    makePara(
      makeRun("(ตำแหน่ง)", { bold: true }) +
      buildPositionRuns(leave.supervisorPosition),
      { align: "center", after: 0 }
    ),
    makePara(
      makeRun("วันที่", { bold: true }) +
      makeRun(
        ` ${supParts.day || "...."} เดือน ${supParts.month || "............"
        } พ.ศ. ${supParts.yearBE || "......"}`
      ),
      { align: "center", after: 60 }
    ),
    makePara(
      makeRun("คำสั่ง   ", { bold: true }) +
      makeRun(
        `${chk(leave.orderDecision === "approved")} อนุญาต    ${chk(
          leave.orderDecision === "rejected"
        )} ไม่อนุญาต`
      ),
      { align: "center", after: 20 }
    ),
    leave.orderComment
      ? makePara(makeRun(leave.orderComment), { align: "center", after: 30 })
      : makePara(makeRun(""), { after: 30 }),
    makeSignatureDrawingPara(sigRels.approver, { align: "center" }),
    makePara(
      makeRun("(ลงชื่อ)", { bold: true }) +
      makeRun(" ................................................."),
      { align: "center", after: 0 }
    ),
    makePara(
      makeRun(
        `(${leave.approverName || "........................................"})`
      ),
      { align: "center", after: 0 }
    ),
    makePara(
      makeRun("(ตำแหน่ง)", { bold: true }) +
      buildPositionRuns(leave.approverPosition),
      { align: "center", after: 0 }
    ),
    makePara(
      makeRun("วันที่", { bold: true }) +
      makeRun(
        ` ${ordParts.day || "...."} เดือน ${ordParts.month || "............"
        } พ.ศ. ${ordParts.yearBE || "......"}`
      ),
      { align: "center", after: 0 }
    ),
  ].join("");

  parts.push(`<w:tbl>
    <w:tblPr>
      <w:tblW w:w="9582" w:type="dxa"/>
      <w:tblInd w:w="60" w:type="dxa"/>
      <w:tblLayout w:type="fixed"/>
      <w:tblCellMar>
        <w:left w:w="10" w:type="dxa"/>
        <w:right w:w="10" w:type="dxa"/>
      </w:tblCellMar>
      <w:tblBorders>
        <w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tblGrid><w:gridCol w:w="4712"/><w:gridCol w:w="363"/><w:gridCol w:w="4507"/></w:tblGrid>
    <w:tr>
      ${makeTableCell(leftColXml, 4712)}
      ${makeTableCell(makePara(makeRun("")), 363)}
      ${makeTableCell(rightColXml, 4507)}
    </w:tr>
  </w:tbl>`);

  parts.push(
    makePara(
      makeRun("หมายเหตุ :-  ", { bold: true, size: 28 }) +
      makeRun(
        "การลากิจ + ลาป่วย ต้องไม่เกิน 23 วันทำการ จึงมีสิทธิเลื่อนขั้นเงินเดือน/ค่าจ้าง",
        { size: 28 }
      ) +
      makeBreakRun(28) +
      makeRun(
        "                ในรอบ 6 เดือน คือ 1 ต.ค. – 31 มี.ค. , 1 เม.ย. – 30 ก.ย.",
        { size: 28 }
      ),
      { before: 40, after: 0 }
    )
  );

  return parts.join("");
}

export function buildLeaveDocumentXml(
  leave: LeaveRequestItem,
  sigRels: SignatureRels = {}
): string {
  docPrCounter = 1;
  const body =
    leave.leaveType === "cancel_leave"
      ? buildCancelLeaveBody(leave, sigRels)
      : leave.leaveType === "vacation_leave"
        ? buildVacationLeaveBody(leave, sigRels)
        : buildGeneralLeaveBody(leave, sigRels);

  // Strict A4 page size (210mm × 297mm = 11906 × 16838 dxa) with compact 1cm top/bottom margins to fit cleanly on 1 single page
  const section = `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="567" w:right="1134" w:bottom="567" w:left="1417" w:header="360" w:footer="360" w:gutter="0"/><w:cols w:space="720"/></w:sectPr>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W_NS}" xmlns:r="${R_NS}" xmlns:wp="${WP_NS}" xmlns:a="${A_NS}" xmlns:pic="${PIC_NS}"><w:body>${body}${section}</w:body></w:document>`;
}

export async function buildLeaveDocxUint8Array(
  leave: LeaveRequestItem
): Promise<Uint8Array> {
  const zip = new JSZip();
  docPrCounter = 1;

  // Prepare PNG signatures if present
  const sigRels: SignatureRels = {};
  const extraWordRels: string[] = [];
  let relIdx = 2; // rId1 reserved for styles.xml

  const sigEntries: Array<[keyof SignatureRels, string | null | undefined]> = [
    ["applicant", leave.applicantSignature],
    ["actingPerson", leave.actingPersonSignature],
    ["verifier", leave.verifierSignature],
    ["supervisor", leave.supervisorSignature],
    ["approver", leave.approverSignature],
  ];

  for (const [key, dataUrl] of sigEntries) {
    const bytes = base64DataUrlToBytes(dataUrl);
    if (bytes) {
      const rId = `rId${relIdx++}`;
      const fileName = `sig_${key}.png`;
      sigRels[key] = rId;
      zip.file(`word/media/${fileName}`, bytes);
      extraWordRels.push(
        `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${fileName}"/>`
      );
    }
  }

  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-officedocument.package.core-properties+xml"/></Types>`;
  const rel = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
  const wordRel = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${extraWordRels.join("")}</Relationships>`;
  const now = new Date().toISOString();
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEsc(
    `${leave.requestNo} ${leave.applicantName}`
  )}</dc:title><dc:creator>สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created></cp:coreProperties>`;

  const documentXml = buildLeaveDocumentXml(leave, sigRels);
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="${W_NS}"><w:docDefaults><w:rPrDefault><w:rPr>${R_FONTS}<w:sz w:val="32"/><w:szCs w:val="32"/><w:lang w:val="th-TH" w:eastAsia="th-TH" w:bidi="th-TH"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="20" w:line="220" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;

  zip.file("[Content_Types].xml", types);
  zip.file("_rels/.rels", rel);
  zip.file("word/_rels/document.xml.rels", wordRel);
  zip.file("word/styles.xml", stylesXml);
  zip.file("word/document.xml", documentXml);
  zip.file("docProps/core.xml", core);

  return zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
  });
}

export async function downloadLeaveDocx(leave: LeaveRequestItem): Promise<void> {
  const bytes = await buildLeaveDocxUint8Array(leave);
  const blob = new Blob([bytes.slice().buffer], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${leave.requestNo}_${leave.applicantName}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
