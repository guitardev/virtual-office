// Zero-dependency offline OOXML (.docx) generator adapted from MSO-Logbook report template.
// Produces a valid A4 WordprocessingML (.docx) package using TH Sarabun New.

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const FONT = "TH Sarabun New";
const R_FONTS = `<w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:eastAsia="${FONT}" w:cs="${FONT}"/>`;

function xmlEsc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface RunOptions {
  size?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
}

interface ParaOptions extends RunOptions {
  align?: "left" | "center" | "right" | "both";
  after?: number;
  before?: number;
  indent?: number;
  keepNext?: boolean;
  heading?: number;
  shade?: string | null;
}

function makeRun(text: string, options: RunOptions = {}): string {
  if (!text) return "";
  const opts = { size: 22, color: "24354B", ...options };
  const rpr = `<w:rPr>${R_FONTS}${opts.bold ? "<w:b/><w:bCs/>" : ""}${
    opts.italic ? "<w:i/>" : ""
  }<w:sz w:val="${opts.size}"/><w:szCs w:val="${opts.size}"/><w:color w:val="${opts.color}"/></w:rPr>`;
  return `<w:r>${rpr}<w:t xml:space="preserve">${xmlEsc(text)}</w:t></w:r>`;
}

function makeInline(node: Node, options: RunOptions = {}): string {
  if (node.nodeType === 3) return makeRun(node.nodeValue || "", options);
  if (node.nodeType !== 1) return "";
  const el = node as HTMLElement;
  if (el.tagName === "BR") return "<w:r><w:br/></w:r>";
  if (el.classList?.contains("print:hidden") || el.getAttribute("data-docx-ignore") === "true") {
    return "";
  }
  const bold = options.bold || ["STRONG", "B", "TH"].includes(el.tagName);
  const italic = options.italic || ["EM", "I"].includes(el.tagName);
  const color = el.classList?.contains("no-plan")
    ? "9E315C"
    : el.classList?.contains("pct")
    ? "216398"
    : options.color;
  return Array.from(el.childNodes)
    .map((child) => makeInline(child, { ...options, bold, italic, color }))
    .join("");
}

function makePara(body: string | Node, options: ParaOptions = {}): string {
  const o: Required<ParaOptions> = {
    align: "left",
    after: 110,
    before: 0,
    indent: 0,
    size: 22,
    bold: false,
    italic: false,
    color: "24354B",
    keepNext: false,
    heading: 0,
    shade: null,
    ...options,
  };
  const ppr =
    `<w:pPr><w:spacing w:before="${o.before}" w:after="${o.after}" w:line="350" w:lineRule="auto"/>` +
    `<w:jc w:val="${o.align}"/>${o.indent ? `<w:ind w:firstLine="${o.indent}"/>` : ""}${
      o.keepNext ? "<w:keepNext/>" : ""
    }${o.shade ? `<w:shd w:val="clear" w:color="auto" w:fill="${o.shade}"/>` : ""}${
      o.heading ? `<w:outlineLvl w:val="${o.heading - 1}"/>` : ""
    }</w:pPr>`;
  const r = typeof body === "string" ? makeRun(body, o) : makeInline(body, o);
  return `<w:p>${ppr}${r}</w:p>`;
}

function makeTable(el: HTMLElement): string {
  const trs = Array.from(el.querySelectorAll("tr"));
  if (!trs.length) return "";
  const cols = Math.max(
    1,
    ...trs.map((tr) =>
      Array.from(tr.children).reduce(
        (n, c) => n + (Number(c.getAttribute("colspan")) || 1),
        0
      )
    )
  );
  const width = 10500;
  const cellWidth = Math.floor(width / cols);
  const grid = Array.from({ length: cols }, () => `<w:gridCol w:w="${cellWidth}"/>`).join("");
  const borders = ["top", "left", "bottom", "right", "insideH", "insideV"]
    .map((x) => `<w:${x} w:val="single" w:sz="4" w:color="CCD9E6"/>`)
    .join("");

  const rowXml = trs
    .map((tr, rowIdx) => {
      const isHeader =
        rowIdx === 0 && (tr.parentElement?.tagName === "THEAD" || Boolean(tr.querySelector("th")));
      const isTotal =
        tr.classList.contains("total-row") || tr.getAttribute("data-total-row") === "true";
      const cells = Array.from(tr.children)
        .map((cell) => {
          const span = Number(cell.getAttribute("colspan")) || 1;
          const fill = isHeader
            ? "E8F1FA"
            : isTotal
            ? "EAF2F9"
            : rowIdx % 2 === 0
            ? "F8FBFE"
            : "FFFFFF";
          const isNumeric =
            cell.classList.contains("num") || cell.classList.contains("text-right");
          const textOpts: ParaOptions = {
            size: cols >= 7 ? 16 : cols >= 6 ? 17 : 19,
            bold: isHeader || isTotal,
            color: isHeader ? "193857" : "26394D",
            align: isNumeric ? "right" : cell.classList.contains("text-center") ? "center" : "left",
            indent: 0,
            after: 45,
          };
          const cp = `<w:tcPr><w:tcW w:w="${cellWidth * span}" w:type="dxa"/>${
            span > 1 ? `<w:gridSpan w:val="${span}"/>` : ""
          }<w:shd w:fill="${fill}"/><w:vAlign w:val="center"/><w:tcMar><w:top w:w="65" w:type="dxa"/><w:bottom w:w="65" w:type="dxa"/><w:left w:w="95" w:type="dxa"/><w:right w:w="95" w:type="dxa"/></w:tcMar></w:tcPr>`;
          return `<w:tc>${cp}${makePara(cell, textOpts)}</w:tc>`;
        })
        .join("");
      return `<w:tr><w:trPr>${isHeader ? '<w:tblHeader w:val="true"/>' : ""}<w:cantSplit/></w:trPr>${cells}</w:tr>`;
    })
    .join("");

  return `<w:tbl><w:tblPr><w:tblW w:w="${width}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${borders}</w:tblBorders><w:tblCellSpacing w:w="0" w:type="dxa"/></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${rowXml}</w:tbl>${makePara("", { after: 65 })}`;
}

function makeSummaryGrid(el: HTMLElement): string {
  const items = Array.from(el.querySelectorAll("[data-summary-card]")).map((box) => ({
    label: box.querySelector("[data-summary-k]")?.textContent?.trim() || "",
    value: box.querySelector("[data-summary-v]")?.textContent?.trim() || "",
    sub: box.querySelector("[data-summary-sub]")?.textContent?.trim() || "",
  }));
  if (!items.length) return "";
  const rows: string[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const pair = items.slice(i, i + 2);
    const cells = pair
      .map(
        (item) =>
          `<w:tc><w:tcPr><w:tcW w:w="5250" w:type="dxa"/><w:shd w:fill="F1F6FB"/><w:tcMar><w:top w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:left w:w="140" w:type="dxa"/><w:right w:w="140" w:type="dxa"/></w:tcMar></w:tcPr>${makePara(
            item.label,
            { size: 18, bold: true, color: "3B5A78", after: 20 }
          )}${makePara(item.value, { size: 26, bold: true, color: "142F52", after: item.sub ? 20 : 40 })}${
            item.sub ? makePara(item.sub, { size: 17, color: "4C657A", after: 20 }) : ""
          }</w:tc>`
      )
      .join("");
    const emptyFiller =
      pair.length === 1
        ? `<w:tc><w:tcPr><w:tcW w:w="5250" w:type="dxa"/></w:tcPr>${makePara("")}</w:tc>`
        : "";
    rows.push(`<w:tr>${cells}${emptyFiller}</w:tr>`);
  }
  return `<w:tbl><w:tblPr><w:tblW w:w="10500" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:insideH w:val="single" w:sz="3" w:color="DAE5EE"/><w:insideV w:val="single" w:sz="3" w:color="DAE5EE"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="5250"/><w:gridCol w:w="5250"/></w:tblGrid>${rows.join("")}</w:tbl>${makePara("", { after: 75 })}`;
}

function nodeToWordXml(node: Node): string {
  if (node.nodeType !== 1) return "";
  const el = node as HTMLElement;
  if (el.classList?.contains("print:hidden") || el.getAttribute("data-docx-ignore") === "true") {
    return "";
  }
  const tag = el.tagName;
  if (tag === "TABLE") return makeTable(el);
  if (el.hasAttribute("data-summary-grid")) return makeSummaryGrid(el);

  const headingMap: Record<string, ParaOptions> = {
    H1: { size: 32, bold: true, color: "142F52", align: "center", before: 100, after: 70, keepNext: true, heading: 1 },
    H2: { size: 27, bold: true, color: "335C81", align: "center", after: 110, keepNext: true, heading: 2 },
    H3: { size: 25, bold: true, color: "142F52", before: 160, after: 110, keepNext: true, heading: 2, shade: "EDF3F9" },
    H4: { size: 23, bold: true, color: "142F52", before: 120, after: 80, keepNext: true, heading: 3 },
  };
  if (headingMap[tag]) return makePara(el, headingMap[tag]);

  if (tag === "P") {
    const isCentered = el.classList.contains("text-center");
    const isCaption = el.hasAttribute("data-caption");
    if (isCaption) {
      return makePara(el, { size: 19, bold: true, color: "193E62", before: 70, after: 40, keepNext: true });
    }
    return makePara(el, {
      size: 22,
      indent: isCentered ? 0 : 420,
      align: isCentered ? "center" : "both",
      after: 120,
    });
  }
  if (el.hasAttribute("data-eyebrow")) {
    return makePara(el, { size: 18, color: "315E88", bold: true, align: "center", after: 35 });
  }
  if (el.hasAttribute("data-date")) {
    return makePara(el, { size: 18, color: "4C657A", align: "center", after: 100 });
  }
  if (tag === "BR") return makePara("");

  return Array.from(el.children).map(nodeToWordXml).join("");
}

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c ^= bytes[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function zipStore(files: Record<string, string>): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const directory: Uint8Array[] = [];
  let offset = 0;
  const put16 = (v: number, a: Uint8Array, p: number) => new DataView(a.buffer).setUint16(p, v, true);
  const put32 = (v: number, a: Uint8Array, p: number) => new DataView(a.buffer).setUint32(p, v, true);

  for (const [path, content] of Object.entries(files)) {
    const name = enc.encode(path);
    const bytes = enc.encode(content);
    const crc = crc32(bytes);

    const local = new Uint8Array(30 + name.length);
    put32(0x04034b50, local, 0);
    put16(20, local, 4);
    put16(0x0800, local, 6);
    put32(crc, local, 14);
    put32(bytes.length, local, 18);
    put32(bytes.length, local, 22);
    put16(name.length, local, 26);
    local.set(name, 30);
    parts.push(local, bytes);

    const central = new Uint8Array(46 + name.length);
    put32(0x02014b50, central, 0);
    put16(20, central, 4);
    put16(20, central, 6);
    put16(0x0800, central, 8);
    put32(crc, central, 16);
    put32(bytes.length, central, 20);
    put32(bytes.length, central, 24);
    put16(name.length, central, 28);
    put32(offset, central, 42);
    central.set(name, 46);
    directory.push(central);

    offset += local.length + bytes.length;
  }

  const dirLen = directory.reduce((n, a) => n + a.length, 0);
  const end = new Uint8Array(22);
  put32(0x06054b50, end, 0);
  put16(directory.length, end, 8);
  put16(directory.length, end, 10);
  put32(dirLen, end, 12);
  put32(offset, end, 16);

  const all = new Uint8Array(offset + dirLen + 22);
  let pos = 0;
  for (const chunk of [...parts, ...directory, end]) {
    all.set(chunk, pos);
    pos += chunk.length;
  }
  return all;
}

export function buildDocxBlob(root: HTMLElement, title: string): Blob {
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-officedocument.package.core-properties+xml"/></Types>`;
  const rel = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
  const wordRel = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const now = new Date().toISOString();
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEsc(
    title
  )}</dc:title><dc:creator>สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created></cp:coreProperties>`;

  const body = Array.from(root.children).map(nodeToWordXml).join("");
  const section = `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="720" w:right="690" w:bottom="700" w:left="690" w:header="360" w:footer="360"/><w:cols w:space="720"/><w:docGrid w:linePitch="360"/></w:sectPr>`;
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W_NS}"><w:body>${body}${section}</w:body></w:document>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="${W_NS}"><w:docDefaults><w:rPrDefault><w:rPr>${R_FONTS}<w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="th-TH" w:eastAsia="th-TH"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="350" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`;

  const bytes = zipStore({
    "[Content_Types].xml": types,
    "_rels/.rels": rel,
    "word/_rels/document.xml.rels": wordRel,
    "word/styles.xml": stylesXml,
    "word/document.xml": documentXml,
    "docProps/core.xml": core,
  });

  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

export function downloadElementAsDocx(root: HTMLElement, title: string, filename: string): void {
  const blob = buildDocxBlob(root, title);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".docx") ? filename : `${filename}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
