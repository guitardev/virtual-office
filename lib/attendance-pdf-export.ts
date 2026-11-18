import { jsPDF } from "jspdf";
import type { DailyReportSheetSpec } from "./attendance-xlsx-export";

// A4 Portrait at ~200 DPI: 210mm x 297mm -> 1654 x 2339 px
const PAGE_W = 1654;
const PAGE_H = 2339;
const MARGIN_X = 95;
const MARGIN_TOP = 95;
const MARGIN_BOTTOM = 95;
const CONTENT_W = PAGE_W - MARGIN_X * 2; // 1464px

// สัดส่วนคอลัมน์เดียวกับ XLSX/DOCX (10 : 36 : 12 : 12 : 28)
const COL_WIDTHS = [149, 538, 179, 179, 419];

function getFontFamily(): string {
  if (typeof window !== "undefined") {
    const computed = window.getComputedStyle(document.body).fontFamily;
    if (computed) return computed;
  }
  return "'TH Sarabun New', 'Sarabun', sans-serif";
}

function createA4Canvas(): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Cannot create 2D canvas context");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  return { canvas, ctx };
}

function drawTruncatedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  align: CanvasTextAlign
) {
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  let display = text;
  if (ctx.measureText(display).width > maxWidth) {
    while (display.length > 1 && ctx.measureText(`${display}…`).width > maxWidth) {
      display = display.slice(0, -1);
    }
    display = `${display}…`;
  }
  ctx.fillText(display, x, y);
}

function renderSheetPages(
  spec: DailyReportSheetSpec,
  fontFamily: string
): HTMLCanvasElement[] {
  const pages: HTMLCanvasElement[] = [];
  let { canvas, ctx } = createA4Canvas();
  pages.push(canvas);

  let y = MARGIN_TOP;
  const maxY = PAGE_H - MARGIN_BOTTOM;

  const drawReportHeader = () => {
    ctx.fillStyle = "#000000";
    ctx.font = `700 28px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
      PAGE_W / 2,
      y + 18
    );
    y += 40;
    ctx.fillText(spec.subtitle, PAGE_W / 2, y + 18);
    y += 40;
    ctx.fillText(`วันที่ ${spec.dateLabel}`, PAGE_W / 2, y + 18);
    y += 52;
  };

  const drawTableHeader = () => {
    const rowH = 48;
    const headers = ["ลำดับที่", "ชื่อ - สกุล", "เข้า", "ออก", "หมายเหตุ"];
    let x = MARGIN_X;
    for (let i = 0; i < headers.length; i++) {
      const w = COL_WIDTHS[i];
      ctx.fillStyle = "#E8F1FA";
      ctx.fillRect(x, y, w, rowH);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, rowH);

      ctx.fillStyle = "#000000";
      ctx.font = `700 24px ${fontFamily}`;
      drawTruncatedText(ctx, headers[i], x + w / 2, y + rowH / 2, w - 16, "center");
      x += w;
    }
    y += rowH;
  };

  drawReportHeader();
  drawTableHeader();

  const rowH = 42;
  for (const row of spec.rows) {
    if (y + rowH > maxY) {
      const next = createA4Canvas();
      canvas = next.canvas;
      ctx = next.ctx;
      pages.push(canvas);
      y = MARGIN_TOP;
      drawTableHeader();
    }

    const cells: Array<{ val: string; align: CanvasTextAlign }> = [
      { val: String(row.orderNo), align: "center" },
      { val: row.name, align: "left" },
      { val: row.checkInDisplay, align: "center" },
      { val: row.checkOutDisplay, align: "center" },
      { val: row.noteDisplay, align: "left" },
    ];

    let x = MARGIN_X;
    for (let i = 0; i < cells.length; i++) {
      const w = COL_WIDTHS[i];
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x, y, w, rowH);

      ctx.fillStyle = "#000000";
      ctx.font = `400 23px ${fontFamily}`;
      const textX =
        cells[i].align === "center" ? x + w / 2 : x + 14;
      drawTruncatedText(
        ctx,
        cells[i].val,
        textX,
        y + rowH / 2,
        w - 24,
        cells[i].align
      );
      x += w;
    }
    y += rowH;
  }

  // ส่วนลงนามผู้ตรวจ (จัดกึ่งกลางคอลัมน์ C เหมือน XLSX)
  const sigHeight = 170;
  if (y + sigHeight > maxY) {
    const next = createA4Canvas();
    canvas = next.canvas;
    ctx = next.ctx;
    pages.push(canvas);
    y = MARGIN_TOP;
  }

  const colCCenterX = MARGIN_X + COL_WIDTHS[0] + COL_WIDTHS[1] + COL_WIDTHS[2] / 2;
  y += 72;
  ctx.fillStyle = "#000000";
  ctx.font = `400 24px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    "ผู้ตรวจ..................................................................................",
    colCCenterX,
    y
  );
  y += 38;
  ctx.fillText("(นางสาวมะลิวัน  สิทธิโยธี)", colCCenterX, y);
  y += 38;
  ctx.fillText("พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร", colCCenterX, y);

  return pages;
}

export async function downloadDailyAttendancePdf(
  sheets: DailyReportSheetSpec[],
  filename: string
): Promise<void> {
  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready;
  }
  const fontFamily = getFontFamily();
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  let isFirstPage = true;
  for (const sheet of sheets) {
    const canvases = renderSheetPages(sheet, fontFamily);
    for (const c of canvases) {
      if (!isFirstPage) {
        doc.addPage("a4", "portrait");
      }
      isFirstPage = false;
      const imgData = c.toDataURL("image/png");
      doc.addImage(imgData, "PNG", 0, 0, 210, 297, undefined, "FAST");
    }
  }

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
