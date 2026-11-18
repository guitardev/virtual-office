import JSZip from "jszip";
import type { DailyReportSheetSpec } from "./attendance-xlsx-export";

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const FONT = "TH Sarabun New";
const R_FONTS = `<w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:eastAsia="${FONT}" w:cs="${FONT}"/>`;

// ความกว้างหน้า A4 แนวตั้ง (11906 dxa) ลบขอบซ้าย-ขวา (690 + 690) = 10526 dxa
// สัดส่วนเดียวกับ XLSX (10 : 36 : 12 : 12 : 28) เพื่อให้คอลัมน์พอดีกับข้อมูลทุกช่อง
const COL_WIDTHS = [1020, 3870, 1290, 1290, 3056];
const TOTAL_TABLE_WIDTH = COL_WIDTHS.reduce((a, b) => a + b, 0);

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
  opts: { bold?: boolean; size?: number; color?: string } = {}
): string {
  const size = opts.size ?? 32; // 16pt
  const color = opts.color ?? "000000";
  return `<w:r><w:rPr>${R_FONTS}${
    opts.bold ? "<w:b/><w:bCs/>" : ""
  }<w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:color w:val="${color}"/></w:rPr><w:t xml:space="preserve">${xmlEsc(
    text
  )}</w:t></w:r>`;
}

function makePara(
  text: string,
  opts: {
    align?: "left" | "center" | "right";
    bold?: boolean;
    size?: number;
    before?: number;
    after?: number;
    line?: number;
    leftIndent?: number;
    pageBreakBefore?: boolean;
  } = {}
): string {
  const align = opts.align ?? "left";
  const before = opts.before ?? 0;
  const after = opts.after ?? 40;
  const line = opts.line ?? 260;
  const indXml = opts.leftIndent ? `<w:ind w:left="${opts.leftIndent}"/>` : "";
  const pbXml = opts.pageBreakBefore ? "<w:pageBreakBefore/>" : "";
  return `<w:p><w:pPr>${pbXml}<w:spacing w:before="${before}" w:after="${after}" w:line="${line}" w:lineRule="auto"/>${indXml}<w:jc w:val="${align}"/></w:pPr>${makeRun(
    text,
    { bold: opts.bold, size: opts.size }
  )}</w:p>`;
}

function makeCell(
  text: string,
  widthDxa: number,
  opts: {
    align?: "left" | "center" | "right";
    bold?: boolean;
    fill?: string;
    size?: number;
  } = {}
): string {
  const align = opts.align ?? "left";
  const shdXml = opts.fill
    ? `<w:shd w:val="clear" w:color="auto" w:fill="${opts.fill}"/>`
    : "";
  return `<w:tc>
    <w:tcPr>
      <w:tcW w:w="${widthDxa}" w:type="dxa"/>
      ${shdXml}
      <w:tcMar>
        <w:top w:w="40" w:type="dxa"/>
        <w:bottom w:w="40" w:type="dxa"/>
        <w:left w:w="90" w:type="dxa"/>
        <w:right w:w="90" w:type="dxa"/>
      </w:tcMar>
      <w:vAlign w:val="center"/>
    </w:tcPr>
    <w:p>
      <w:pPr>
        <w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/>
        <w:jc w:val="${align}"/>
      </w:pPr>
      ${makeRun(text, { bold: opts.bold, size: opts.size })}
    </w:p>
  </w:tc>`;
}

function buildSectionXml(spec: DailyReportSheetSpec, isFirst: boolean): string {
  const parts: string[] = [];

  // หัวรายงาน 3 บรรทัด (ตรงกับแถว 1-3 ของ XLSX)
  parts.push(
    makePara("สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร", {
      align: "center",
      bold: true,
      after: 20,
      pageBreakBefore: !isFirst,
    })
  );
  parts.push(
    makePara(spec.subtitle, {
      align: "center",
      bold: true,
      after: 20,
    })
  );
  parts.push(
    makePara(`วันที่ ${spec.dateLabel}`, {
      align: "center",
      bold: true,
      after: 140,
    })
  );

  // ตาราง fixed layout ความกว้างคอลัมน์ตรงตามข้อมูลและ XLSX
  const gridCols = COL_WIDTHS.map((w) => `<w:gridCol w:w="${w}"/>`).join("");

  const headerCells = [
    makeCell("ลำดับที่", COL_WIDTHS[0], {
      align: "center",
      bold: true,
      fill: "E8F1FA",
    }),
    makeCell("ชื่อ - สกุล", COL_WIDTHS[1], {
      align: "center",
      bold: true,
      fill: "E8F1FA",
    }),
    makeCell("เข้า", COL_WIDTHS[2], {
      align: "center",
      bold: true,
      fill: "E8F1FA",
    }),
    makeCell("ออก", COL_WIDTHS[3], {
      align: "center",
      bold: true,
      fill: "E8F1FA",
    }),
    makeCell("หมายเหตุ", COL_WIDTHS[4], {
      align: "center",
      bold: true,
      fill: "E8F1FA",
    }),
  ].join("");

  const headerRow = `<w:tr><w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>${headerCells}</w:tr>`;

  const dataRows = spec.rows
    .map((row) => {
      const cells = [
        makeCell(String(row.orderNo), COL_WIDTHS[0], { align: "center" }),
        makeCell(row.name, COL_WIDTHS[1], { align: "left" }),
        makeCell(row.checkInDisplay, COL_WIDTHS[2], { align: "center" }),
        makeCell(row.checkOutDisplay, COL_WIDTHS[3], { align: "center" }),
        makeCell(row.noteDisplay, COL_WIDTHS[4], { align: "left" }),
      ].join("");
      return `<w:tr><w:trPr><w:cantSplit/></w:trPr>${cells}</w:tr>`;
    })
    .join("");

  const tableXml = `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="${TOTAL_TABLE_WIDTH}" w:type="dxa"/>
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
    <w:tblGrid>${gridCols}</w:tblGrid>
    ${headerRow}
    ${dataRows}
  </w:tbl>`;

  parts.push(tableXml);

  // ส่วนลงนามผู้ตรวจ (จัดตำแหน่งกึ่งกลางค่อนขวาตรงแนวคอลัมน์ C เช่นเดียวกับ XLSX)
  parts.push(
    makePara(
      "ผู้ตรวจ..................................................................................",
      { align: "center", before: 320, after: 20, leftIndent: 1200 }
    )
  );
  parts.push(
    makePara("(นางสาวมะลิวัน  สิทธิโยธี)", {
      align: "center",
      after: 20,
      leftIndent: 1200,
    })
  );
  parts.push(
    makePara("พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร", {
      align: "center",
      after: 0,
      leftIndent: 1200,
    })
  );

  return parts.join("");
}

export async function buildDailyAttendanceDocxBlob(
  sheets: DailyReportSheetSpec[],
  title: string
): Promise<Blob> {
  const zip = new JSZip();

  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-officedocument.package.core-properties+xml"/></Types>`;
  const rel = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
  const wordRel = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const now = new Date().toISOString();
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEsc(
    title
  )}</dc:title><dc:creator>สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created></cp:coreProperties>`;

  const body = sheets.map((s, idx) => buildSectionXml(s, idx === 0)).join("");
  const section = `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="720" w:right="690" w:bottom="700" w:left="690" w:header="360" w:footer="360"/><w:cols w:space="720"/><w:docGrid w:linePitch="360"/></w:sectPr>`;
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W_NS}"><w:body>${body}${section}</w:body></w:document>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="${W_NS}"><w:docDefaults><w:rPrDefault><w:rPr>${R_FONTS}<w:sz w:val="32"/><w:szCs w:val="32"/><w:lang w:val="th-TH" w:eastAsia="th-TH"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="40" w:line="260" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;

  zip.file("[Content_Types].xml", types);
  zip.file("_rels/.rels", rel);
  zip.file("word/_rels/document.xml.rels", wordRel);
  zip.file("word/styles.xml", stylesXml);
  zip.file("word/document.xml", documentXml);
  zip.file("docProps/core.xml", core);

  return await zip.generateAsync({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    compression: "DEFLATE",
  });
}

export async function downloadDailyAttendanceDocx(
  sheets: DailyReportSheetSpec[],
  title: string,
  filename: string
): Promise<void> {
  const blob = await buildDailyAttendanceDocxBlob(sheets, title);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".docx") ? filename : `${filename}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
