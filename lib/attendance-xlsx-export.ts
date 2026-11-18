import JSZip from "jszip";

export interface DailyReportSheetRow {
  orderNo: number;
  name: string;
  checkInDisplay: string;
  checkOutDisplay: string;
  noteDisplay: string;
}

export interface DailyReportSheetSpec {
  sheetName: string;
  subtitle: string;
  dateLabel: string;
  rows: DailyReportSheetRow[];
}

function xmlEsc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function colLetter(idx0: number): string {
  let s = "";
  let n = idx0 + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function buildWorksheetXml(spec: DailyReportSheetSpec): string {
  const rowsXml: string[] = [];

  const makeRow = (
    rowNum: number,
    cells: Array<{ col: number; val: string | number; type?: "s" | "n"; style?: number }>
  ) => {
    const cellsXml = cells
      .map((c) => {
        const ref = `${colLetter(c.col)}${rowNum}`;
        const styleAttr = c.style !== undefined ? ` s="${c.style}"` : "";
        if (c.type === "n") {
          return `<c r="${ref}"${styleAttr}><v>${c.val}</v></c>`;
        }
        return `<c r="${ref}" t="inlineStr"${styleAttr}><is><t xml:space="preserve">${xmlEsc(
          c.val
        )}</t></is></c>`;
      })
      .join("");
    return `<row r="${rowNum}">${cellsXml}</row>`;
  };

  // Row 1-3: Official Header
  rowsXml.push(
    makeRow(1, [
      { col: 0, val: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร", style: 1 },
    ])
  );
  rowsXml.push(makeRow(2, [{ col: 0, val: spec.subtitle, style: 1 }]));
  rowsXml.push(makeRow(3, [{ col: 0, val: `วันที่ ${spec.dateLabel}`, style: 1 }]));

  // Row 5: Table Headers
  rowsXml.push(
    makeRow(5, [
      { col: 0, val: "ลำดับที่", style: 2 },
      { col: 1, val: "ชื่อ - สกุล", style: 2 },
      { col: 2, val: "เข้า", style: 2 },
      { col: 3, val: "ออก", style: 2 },
      { col: 4, val: "หมายเหตุ", style: 2 },
    ])
  );

  let rNum = 6;
  for (const row of spec.rows) {
    rowsXml.push(
      makeRow(rNum, [
        { col: 0, val: row.orderNo, type: "n", style: 4 },
        { col: 1, val: row.name, style: 3 },
        { col: 2, val: row.checkInDisplay, style: 4 },
        { col: 3, val: row.checkOutDisplay, style: 4 },
        { col: 4, val: row.noteDisplay, style: 3 },
      ])
    );
    rNum++;
  }

  // Signature block (+3 blank rows)
  const sigStart = rNum + 3;
  rowsXml.push(
    makeRow(sigStart, [
      {
        col: 2,
        val: "ผู้ตรวจ..................................................................................",
        style: 5,
      },
    ])
  );
  rowsXml.push(
    makeRow(sigStart + 1, [{ col: 2, val: "(นางสาวมะลิวัน  สิทธิโยธี)", style: 5 }])
  );
  rowsXml.push(
    makeRow(sigStart + 2, [
      { col: 2, val: "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร", style: 5 },
    ])
  );

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <cols>
    <col min="1" max="1" width="10" customWidth="1"/>
    <col min="2" max="2" width="36" customWidth="1"/>
    <col min="3" max="3" width="12" customWidth="1"/>
    <col min="4" max="4" width="12" customWidth="1"/>
    <col min="5" max="5" width="28" customWidth="1"/>
  </cols>
  <sheetData>${rowsXml.join("")}</sheetData>
  <mergeCells count="3">
    <mergeCell ref="A1:E1"/>
    <mergeCell ref="A2:E2"/>
    <mergeCell ref="A3:E3"/>
  </mergeCells>
  <pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
  <pageSetup paperSize="9" orientation="portrait"/>
</worksheet>`;
}

export async function buildDailyAttendanceXlsxBlob(
  sheets: DailyReportSheetSpec[]
): Promise<Blob> {
  const zip = new JSZip();

  const sheetOverrides = sheets
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${
          i + 1
        }.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join("");

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheetOverrides}
</Types>`
  );

  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
  );

  const sheetsXml = sheets
    .map(
      (s, i) =>
        `<sheet name="${xmlEsc(s.sheetName)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
    )
    .join("");

  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetsXml}</sheets>
</workbook>`
  );

  const wbRels = sheets
    .map(
      (_, i) =>
        `<Relationship Id="rId${
          i + 1
        }" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${
          i + 1
        }.xml"/>`
    )
    .join("");

  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${wbRels}
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
  );

  zip.file(
    "xl/styles.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><sz val="16"/><name val="TH Sarabun New"/></font>
    <font><b/><sz val="16"/><name val="TH Sarabun New"/></font>
    <font><b/><sz val="16"/><name val="TH Sarabun New"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFE8F1FA"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="6">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`
  );

  sheets.forEach((s, i) => {
    zip.file(`xl/worksheets/sheet${i + 1}.xml`, buildWorksheetXml(s));
  });

  return await zip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    compression: "DEFLATE",
  });
}

export async function downloadDailyAttendanceXlsx(
  sheets: DailyReportSheetSpec[],
  filename: string
): Promise<void> {
  const blob = await buildDailyAttendanceXlsxBlob(sheets);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
