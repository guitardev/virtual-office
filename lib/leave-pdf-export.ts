import { jsPDF } from "jspdf";
import {
  formatThaiDateFull,
  formatThaiDateParts,
  formatThaiDateSlash,
  LeaveRequestItem,
} from "./leave-utils";

// A4 Portrait at ~200 DPI: 21.0 cm x 29.7 cm -> 1654 x 2339 px
// 1 pt = 200 / 72 = 2.778 px
// ฟอนต์ Sarabun บนเว็บที่ 31-32 px (~11.5pt) จะมีขนาดตัวอักษรเทียบเท่า TH Sarabun New 15-16pt บนกระดาษ A4 จริง
const PAGE_W = 1654;
const PAGE_H = 2339;
// กั้นหน้า 2.5 cm = 197 px, กั้นหลัง 2.0 cm = 158 px, ขอบบน/ล่าง 2.0 cm = 158 px
const MARGIN_LEFT = 197;
const MARGIN_RIGHT = 158;
const MARGIN_TOP = 158;
const RIGHT_LIMIT = PAGE_W - MARGIN_RIGHT; // 1496 px
const CONTENT_W = RIGHT_LIMIT - MARGIN_LEFT; // 1299 px

function getFontFamily(): string {
  if (typeof window !== "undefined") {
    const computed = window.getComputedStyle(document.body).fontFamily;
    if (computed) return computed;
  }
  return "'TH Sarabun New', 'Sarabun', sans-serif";
}

function segmentThaiWords(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter("th", { granularity: "word" });
    return Array.from(seg.segment(text), (s) => s.segment);
  }
  return Array.from(text);
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [""];
  const paragraphs = text.split("\n");
  const lines: string[] = [];

  for (const para of paragraphs) {
    if (!para) {
      lines.push("");
      continue;
    }
    const tokens = segmentThaiWords(para);
    let current = "";
    for (const token of tokens) {
      const candidate = current + token;
      if (current && ctx.measureText(candidate).width > maxWidth) {
        lines.push(current.trimEnd());
        current = token.trimStart();
      } else {
        current = candidate;
      }
    }
    if (current) {
      lines.push(current);
    }
  }
  return lines.length > 0 ? lines : [""];
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 46,
  align: CanvasTextAlign = "left"
): number {
  ctx.textAlign = align;
  const lines = wrapTextLines(ctx, text, maxWidth);
  let curY = y;
  for (const line of lines) {
    ctx.fillText(line, x, curY);
    curY += lineHeight;
  }
  return curY;
}

function drawCheckbox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  checked: boolean,
  label: string,
  fontFamily: string
): number {
  const size = 25;
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y - size + 4, size, size);
  if (checked) {
    ctx.beginPath();
    ctx.moveTo(x + 4, y - size / 2 + 4);
    ctx.lineTo(x + 10, y - 2);
    ctx.lineTo(x + size - 4, y - size + 8);
    ctx.stroke();
  }
  ctx.fillStyle = "#000000";
  ctx.font = `400 31px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText(label, x + size + 10, y);
  return x + size + 10 + ctx.measureText(label).width + 24;
}

function drawVacationForm(
  ctx: CanvasRenderingContext2D,
  leave: LeaveRequestItem,
  fontFamily: string
) {
  const writtenParts = formatThaiDateParts(leave.writtenDate);
  const startParts = formatThaiDateParts(leave.startDate);
  const endParts = formatThaiDateParts(leave.endDate);
  const totalEntitled =
    Number(leave.vacationAccumulatedDays || 0) +
    Number(leave.vacationAnnualDays || 0);
  const totalUsed =
    Number(leave.prevVacationDays || 0) + Number(leave.totalWorkingDays || 0);

  let y = MARGIN_TOP + 20;
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "alphabetic";

  ctx.font = `700 44px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.fillText("ใบลาพักผ่อน", PAGE_W / 2, y);
  y += 72;

  ctx.font = `400 30px ${fontFamily}`;
  y = drawWrappedText(
    ctx,
    `เขียนที่ ${
      leave.writtenAt ||
      "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์ จังหวัดกำแพงเพชร"
    }`,
    720,
    y,
    RIGHT_LIMIT - 720,
    44
  );
  y = drawWrappedText(
    ctx,
    `วันที่ ${writtenParts.day || "...."} เดือน ${
      writtenParts.month || "............"
    } พ.ศ. ${writtenParts.yearBE || "......"}`,
    800,
    y + 2,
    RIGHT_LIMIT - 800,
    44
  );
  y += 26;

  ctx.font = `700 31px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText("เรื่อง", MARGIN_LEFT, y);
  ctx.font = `400 31px ${fontFamily}`;
  y = drawWrappedText(
    ctx,
    leave.subject || "ขอลาพักผ่อน",
    MARGIN_LEFT + 82,
    y,
    CONTENT_W - 82,
    46
  );

  ctx.font = `700 31px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText("เรียน", MARGIN_LEFT, y + 4);
  ctx.font = `400 31px ${fontFamily}`;
  y = drawWrappedText(
    ctx,
    leave.toRecipient || "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
    MARGIN_LEFT + 82,
    y + 4,
    CONTENT_W - 82,
    46
  );
  y += 22;

  y = drawWrappedText(
    ctx,
    `ข้าพเจ้า ${leave.applicantName}   ตำแหน่ง ${leave.applicantPosition || "-"}`,
    MARGIN_LEFT + 95,
    y,
    CONTENT_W - 95,
    46
  );
  y = drawWrappedText(
    ctx,
    `กลุ่ม/ฝ่าย ${
      leave.applicantDivision || "-"
    }   สังกัด สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร`,
    MARGIN_LEFT,
    y,
    CONTENT_W,
    46
  );
  y = drawWrappedText(
    ctx,
    `มีวันลาพักผ่อนสะสม ${leave.vacationAccumulatedDays} วันทำการ  มีสิทธิลาพักผ่อนประจำปีอีก ${leave.vacationAnnualDays} วันทำการ  รวมเป็น ${totalEntitled} วันทำการ`,
    MARGIN_LEFT,
    y,
    CONTENT_W,
    46
  );
  y = drawWrappedText(
    ctx,
    `ขอลาพักผ่อนตั้งแต่วันที่ ${startParts.day} เดือน ${startParts.month} พ.ศ. ${startParts.yearBE} ถึงวันที่ ${endParts.day} เดือน ${endParts.month} พ.ศ. ${endParts.yearBE} มีกำหนด ${leave.totalWorkingDays} วัน`,
    MARGIN_LEFT,
    y,
    CONTENT_W,
    46
  );
  y = drawWrappedText(
    ctx,
    `ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่ ${
      leave.contactInfo || "-"
    }   หมายเลขโทรศัพท์ ${leave.contactPhone || "-"}`,
    MARGIN_LEFT,
    y,
    CONTENT_W,
    46
  );
  y += 55;

  const sigCenterX = RIGHT_LIMIT - 285;
  ctx.textAlign = "center";
  ctx.font = `400 30px ${fontFamily}`;
  ctx.fillText(
    "(ลงชื่อ)......................................................",
    sigCenterX,
    y
  );
  y += 42;
  ctx.fillText(`(${leave.applicantName})`, sigCenterX, y);
  y += 42;
  ctx.fillText(`ตำแหน่ง ${leave.applicantPosition || "-"}`, sigCenterX, y);
  y += 72;

  // 2-Column bottom section within CONTENT_W
  const leftX = MARGIN_LEFT;
  const leftMaxW = 610;
  const colW = 200;
  ctx.font = `700 29px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.fillText("สถิติการลาในปีงบประมาณนี้", leftX + colW * 1.5, y);
  y += 22;

  const headers = [
    "ลามาแล้ว (วันทำการ)",
    "ลาครั้งนี้ (วันทำการ)",
    "รวมเป็น (วันทำการ)",
  ];
  const vals = [
    String(leave.prevVacationDays),
    String(leave.totalWorkingDays),
    String(totalUsed),
  ];

  const row1Y = y;
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(leftX + i * colW, row1Y, colW, 58);
    ctx.font = `700 24px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.fillText(headers[i], leftX + i * colW + colW / 2, row1Y + 37);

    ctx.strokeRect(leftX + i * colW, row1Y + 58, colW, 48);
    ctx.font = i === 2 ? `700 27px ${fontFamily}` : `400 27px ${fontFamily}`;
    ctx.fillText(vals[i], leftX + i * colW + colW / 2, row1Y + 90);
  }

  let ly = row1Y + 165;
  ctx.font = `400 28px ${fontFamily}`;
  ly = drawWrappedText(
    ctx,
    `(ลงชื่อ) ${
      leave.verifiedAt && leave.verifierName
        ? leave.verifierName
        : "................................."
    } ผู้ตรวจสอบ`,
    leftX,
    ly,
    leftMaxW,
    42
  );
  ly = drawWrappedText(
    ctx,
    `(${leave.verifierName || "................................................"})`,
    leftX + 70,
    ly,
    leftMaxW - 70,
    42
  );
  ly = drawWrappedText(
    ctx,
    `(ตำแหน่ง) ${leave.verifierPosition || "...................................."}`,
    leftX,
    ly,
    leftMaxW,
    42
  );
  ly = drawWrappedText(
    ctx,
    `วันที่ ${
      leave.verifiedAt
        ? formatThaiDateSlash(leave.verifiedAt)
        : "........ / ........ / ........"
    }`,
    leftX,
    ly,
    leftMaxW,
    42
  );
  ly += 38;

  ly = drawWrappedText(
    ctx,
    "ในระหว่างที่ข้าพเจ้าลาพักผ่อนมอบหมายให้",
    leftX,
    ly,
    leftMaxW,
    42
  );
  ly = drawWrappedText(
    ctx,
    `นาย/นาง/นางสาว ${
      leave.actingPersonName || ".................................."
    } ปฏิบัติหน้าที่แทน`,
    leftX,
    ly,
    leftMaxW,
    42
  );
  ly += 18;
  ly = drawWrappedText(
    ctx,
    "(ลงชื่อ)........................................ ผู้มอบ",
    leftX,
    ly,
    leftMaxW,
    42
  );
  ly = drawWrappedText(
    ctx,
    `(${leave.applicantName})`,
    leftX + 70,
    ly,
    leftMaxW - 70,
    42
  );
  ly += 18;
  ly = drawWrappedText(
    ctx,
    "(ลงชื่อ)........................................ ผู้ปฏิบัติหน้าที่แทน",
    leftX,
    ly,
    leftMaxW,
    42
  );
  drawWrappedText(
    ctx,
    `(${leave.actingPersonName || "........................................"})`,
    leftX + 70,
    ly,
    leftMaxW - 70,
    42
  );

  // Right column
  const rightX = 865;
  const rightMaxW = RIGHT_LIMIT - rightX; // 631 px
  let ry = y - 22;
  ctx.font = `700 29px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.fillText("ความเห็นผู้บังคับบัญชา", rightX + rightMaxW / 2, ry);
  ry += 50;
  ctx.font = `400 28px ${fontFamily}`;
  ry = drawWrappedText(
    ctx,
    leave.supervisorComment ||
      "........................................................................",
    rightX,
    ry,
    rightMaxW,
    42
  );
  const rightCenterX = rightX + rightMaxW / 2;
  ry += 22;
  ry = drawWrappedText(
    ctx,
    `(ลงชื่อ) ${
      leave.supervisorReviewedAt && leave.supervisorName
        ? leave.supervisorName
        : "..............................................."
    }`,
    rightCenterX,
    ry,
    rightMaxW,
    42,
    "center"
  );
  ry = drawWrappedText(
    ctx,
    `(${leave.supervisorName || "........................................"})`,
    rightCenterX,
    ry,
    rightMaxW,
    42,
    "center"
  );
  ry = drawWrappedText(
    ctx,
    `(ตำแหน่ง) ${leave.supervisorPosition || "...................................."}`,
    rightCenterX,
    ry,
    rightMaxW,
    42,
    "center"
  );
  ry = drawWrappedText(
    ctx,
    `วันที่ ${
      leave.supervisorReviewedAt
        ? formatThaiDateSlash(leave.supervisorReviewedAt)
        : "........ / ........ / ........"
    }`,
    rightCenterX,
    ry,
    rightMaxW,
    42,
    "center"
  );

  ry += 55;
  ctx.font = `700 29px ${fontFamily}`;
  ctx.textAlign = "left";
  const orderStartX = rightCenterX - 185;
  ctx.fillText("คำสั่ง", orderStartX, ry);
  const cx = drawCheckbox(
    ctx,
    orderStartX + 90,
    ry,
    leave.orderDecision === "approved",
    "อนุญาต",
    fontFamily
  );
  drawCheckbox(
    ctx,
    cx,
    ry,
    leave.orderDecision === "rejected",
    "ไม่อนุญาต",
    fontFamily
  );
  ry += 46;
  ctx.font = `400 28px ${fontFamily}`;
  if (leave.orderComment) {
    ry = drawWrappedText(ctx, leave.orderComment, rightCenterX, ry, rightMaxW, 42, "center");
  }
  ry += 22;
  ry = drawWrappedText(
    ctx,
    `(ลงชื่อ) ${
      leave.orderedAt && leave.approverName
        ? leave.approverName
        : "................................................."
    }`,
    rightCenterX,
    ry,
    rightMaxW,
    42,
    "center"
  );
  ry = drawWrappedText(
    ctx,
    `(${leave.approverName || "........................................"})`,
    rightCenterX,
    ry,
    rightMaxW,
    42,
    "center"
  );
  ry = drawWrappedText(
    ctx,
    `(ตำแหน่ง) ${leave.approverPosition || "...................................."}`,
    rightCenterX,
    ry,
    rightMaxW,
    42,
    "center"
  );
  drawWrappedText(
    ctx,
    `วันที่ ${
      leave.orderedAt
        ? formatThaiDateSlash(leave.orderedAt)
        : "........ / ........ / ........"
    }`,
    rightCenterX,
    ry,
    rightMaxW,
    42,
    "center"
  );
}

function drawGeneralForm(
  ctx: CanvasRenderingContext2D,
  leave: LeaveRequestItem,
  fontFamily: string
) {
  const writtenParts = formatThaiDateParts(leave.writtenDate);
  const verifiedParts = formatThaiDateParts(leave.verifiedAt);
  const supParts = formatThaiDateParts(leave.supervisorReviewedAt);
  const ordParts = formatThaiDateParts(leave.orderedAt);

  const curSick = leave.leaveType === "sick_leave" ? leave.totalWorkingDays : 0;
  const curPersonal =
    leave.leaveType === "personal_leave" ? leave.totalWorkingDays : 0;
  const curMaternity =
    leave.leaveType === "maternity_leave" ? leave.totalWorkingDays : 0;

  let y = MARGIN_TOP + 20;
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "alphabetic";

  ctx.font = `700 44px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.fillText("ใบลาป่วย ลาคลอดบุตร ลากิจส่วนตัว", PAGE_W / 2, y);
  y += 68;

  ctx.font = `400 30px ${fontFamily}`;
  y = drawWrappedText(
    ctx,
    `เขียนที่ ${
      leave.writtenAt ||
      "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"
    }`,
    720,
    y,
    RIGHT_LIMIT - 720,
    42
  );
  y = drawWrappedText(
    ctx,
    `วันที่ ${writtenParts.day || "...."} เดือน ${
      writtenParts.month || "............"
    } พ.ศ. ${writtenParts.yearBE || "......"}`,
    800,
    y + 2,
    RIGHT_LIMIT - 800,
    42
  );
  y += 22;

  ctx.font = `700 31px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText("เรื่อง", MARGIN_LEFT, y);
  ctx.font = `400 31px ${fontFamily}`;
  y = drawWrappedText(
    ctx,
    leave.subject,
    MARGIN_LEFT + 82,
    y,
    CONTENT_W - 82,
    44
  );

  ctx.font = `700 31px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText("เรียน", MARGIN_LEFT, y + 4);
  ctx.font = `400 31px ${fontFamily}`;
  y = drawWrappedText(
    ctx,
    leave.toRecipient || "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
    MARGIN_LEFT + 82,
    y + 4,
    CONTENT_W - 82,
    44
  );
  y += 18;

  y = drawWrappedText(
    ctx,
    `ข้าพเจ้า ${leave.applicantName}   ตำแหน่ง ${leave.applicantPosition || "-"}`,
    MARGIN_LEFT + 95,
    y,
    CONTENT_W - 95,
    44
  );
  y = drawWrappedText(
    ctx,
    `กลุ่ม/ฝ่าย ${
      leave.applicantDivision || "-"
    } สังกัด สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร`,
    MARGIN_LEFT,
    y,
    CONTENT_W,
    44
  );
  y += 8;

  let cx = drawCheckbox(
    ctx,
    MARGIN_LEFT + 95,
    y,
    leave.leaveType === "sick_leave",
    "ป่วย",
    fontFamily
  );
  if (leave.leaveType === "sick_leave" && leave.reason) {
    y = drawWrappedText(
      ctx,
      `เนื่องจาก ${leave.reason}`,
      cx,
      y,
      RIGHT_LIMIT - cx,
      44
    );
  } else {
    y += 44;
  }

  ctx.textAlign = "left";
  ctx.fillText("ขอลา", MARGIN_LEFT + 20, y);
  cx = drawCheckbox(
    ctx,
    MARGIN_LEFT + 95,
    y,
    leave.leaveType === "personal_leave",
    "กิจส่วนตัว",
    fontFamily
  );
  y = drawWrappedText(
    ctx,
    `เนื่องจาก ${
      leave.leaveType === "personal_leave"
        ? leave.reason || "-"
        : "........................................................"
    }`,
    cx,
    y,
    RIGHT_LIMIT - cx,
    44
  );

  cx = drawCheckbox(
    ctx,
    MARGIN_LEFT + 95,
    y,
    leave.leaveType === "maternity_leave",
    "คลอดบุตร",
    fontFamily
  );
  if (leave.leaveType === "maternity_leave" && leave.reason) {
    y = drawWrappedText(
      ctx,
      `(${leave.reason})`,
      cx,
      y,
      RIGHT_LIMIT - cx,
      44
    );
  } else {
    y += 46;
  }

  y = drawWrappedText(
    ctx,
    `ตั้งแต่วันที่ ${formatThaiDateFull(
      leave.startDate
    )} ถึงวันที่ ${formatThaiDateFull(leave.endDate)} มีกำหนด ${
      leave.totalWorkingDays
    } วัน`,
    MARGIN_LEFT,
    y,
    CONTENT_W,
    44
  );

  ctx.textAlign = "left";
  ctx.fillText("ข้าพเจ้าได้ลา", MARGIN_LEFT, y);
  cx = drawCheckbox(
    ctx,
    MARGIN_LEFT + 165,
    y,
    leave.lastLeaveType === "sick_leave",
    "ป่วย",
    fontFamily
  );
  cx = drawCheckbox(
    ctx,
    cx,
    y,
    leave.lastLeaveType === "personal_leave",
    "กิจส่วนตัว",
    fontFamily
  );
  cx = drawCheckbox(
    ctx,
    cx,
    y,
    leave.lastLeaveType === "maternity_leave",
    "คลอดบุตร",
    fontFamily
  );
  y = drawWrappedText(
    ctx,
    `ครั้งสุดท้ายตั้งแต่วันที่ ${
      leave.lastLeaveStartDate
        ? formatThaiDateFull(leave.lastLeaveStartDate)
        : "-"
    }`,
    cx,
    y,
    RIGHT_LIMIT - cx,
    44
  );

  const contactCombined =
    [leave.contactInfo, leave.contactPhone].filter(Boolean).join(" โทร. ") ||
    "-";
  y = drawWrappedText(
    ctx,
    `ถึงวันที่ ${
      leave.lastLeaveEndDate
        ? formatThaiDateFull(leave.lastLeaveEndDate)
        : "-"
    } มีกำหนด ${
      leave.lastLeaveDays ?? "-"
    } วัน  ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่ ${contactCombined}`,
    MARGIN_LEFT,
    y,
    CONTENT_W,
    44
  );
  y += 38;

  const sigCenterX = RIGHT_LIMIT - 285;
  ctx.textAlign = "center";
  ctx.font = `400 30px ${fontFamily}`;
  ctx.fillText(
    "(ลงชื่อ)......................................................",
    sigCenterX,
    y
  );
  y += 40;
  ctx.fillText(`(${leave.applicantName})`, sigCenterX, y);
  y += 40;
  ctx.fillText(`ตำแหน่ง ${leave.applicantPosition || "-"}`, sigCenterX, y);
  y += 65;

  // Left: Stats table + Verifier
  const leftX = MARGIN_LEFT;
  const leftMaxW = 610;
  const colWidths = [150, 150, 150, 150];
  const tableW = colWidths.reduce((a, b) => a + b, 0);
  ctx.font = `700 29px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.fillText("สถิติการลาในปีงบประมาณนี้", leftX + tableW / 2, y);
  y += 20;

  const tHeaders = ["ประเภทลา", "ลามาแล้ว", "ลาครั้งนี้", "รวมเป็น"];
  const tRows = [
    [
      "ป่วย",
      String(leave.prevSickDays),
      curSick ? String(curSick) : "",
      String(leave.prevSickDays + curSick),
    ],
    [
      "กิจส่วนตัว",
      String(leave.prevPersonalDays),
      curPersonal ? String(curPersonal) : "",
      String(leave.prevPersonalDays + curPersonal),
    ],
    [
      "คลอดบุตร",
      String(leave.prevMaternityDays),
      curMaternity ? String(curMaternity) : "",
      String(leave.prevMaternityDays + curMaternity),
    ],
  ];

  let ty = y;
  let tx = leftX;
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tx, ty, colWidths[i], 54);
    ctx.font = `700 24px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.fillText(tHeaders[i], tx + colWidths[i] / 2, ty + 35);
    tx += colWidths[i];
  }
  ty += 54;

  for (const r of tRows) {
    tx = leftX;
    for (let i = 0; i < 4; i++) {
      ctx.strokeRect(tx, ty, colWidths[i], 46);
      ctx.font = i === 3 ? `700 26px ${fontFamily}` : `400 26px ${fontFamily}`;
      ctx.fillText(r[i], tx + colWidths[i] / 2, ty + 31);
      tx += colWidths[i];
    }
    ty += 46;
  }

  let ly = ty + 55;
  ctx.font = `400 28px ${fontFamily}`;
  ly = drawWrappedText(
    ctx,
    `(ลงชื่อ) ${
      leave.verifiedAt && leave.verifierName
        ? leave.verifierName
        : "................................."
    } ผู้ตรวจสอบ`,
    leftX,
    ly,
    leftMaxW,
    40
  );
  ly = drawWrappedText(
    ctx,
    `(${leave.verifierName || "................................................"})`,
    leftX + 70,
    ly,
    leftMaxW - 70,
    40
  );
  ly = drawWrappedText(
    ctx,
    `ตำแหน่ง ${leave.verifierPosition || "...................................."}`,
    leftX,
    ly,
    leftMaxW,
    40
  );
  ly = drawWrappedText(
    ctx,
    `วันที่ ${verifiedParts.day || "...."} เดือน ${
      verifiedParts.month || "............"
    } พ.ศ. ${verifiedParts.yearBE || "......"}`,
    leftX,
    ly,
    leftMaxW,
    40
  );

  // Right: Supervisor + Order
  const rightX = 865;
  const rightMaxW = RIGHT_LIMIT - rightX; // 631 px
  let ry = y - 20;
  ctx.font = `700 29px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.fillText("ความเห็นผู้บังคับบัญชา", rightX + rightMaxW / 2, ry);
  ry += 48;
  ctx.font = `400 28px ${fontFamily}`;
  ry = drawWrappedText(
    ctx,
    leave.supervisorComment ||
      "........................................................................",
    rightX,
    ry,
    rightMaxW,
    40
  );
  const rightCenterX = rightX + rightMaxW / 2;
  ry += 20;
  ry = drawWrappedText(
    ctx,
    `(ลงชื่อ) ${
      leave.supervisorReviewedAt && leave.supervisorName
        ? leave.supervisorName
        : "..............................................."
    }`,
    rightCenterX,
    ry,
    rightMaxW,
    40,
    "center"
  );
  ry = drawWrappedText(
    ctx,
    `(${leave.supervisorName || "........................................"})`,
    rightCenterX,
    ry,
    rightMaxW,
    40,
    "center"
  );
  ry = drawWrappedText(
    ctx,
    `ตำแหน่ง ${leave.supervisorPosition || "...................................."}`,
    rightCenterX,
    ry,
    rightMaxW,
    40,
    "center"
  );
  ry = drawWrappedText(
    ctx,
    `วันที่ ${supParts.day || "...."} เดือน ${
      supParts.month || "............"
    } พ.ศ. ${supParts.yearBE || "......"}`,
    rightCenterX,
    ry,
    rightMaxW,
    40,
    "center"
  );

  ry += 48;
  ctx.font = `700 29px ${fontFamily}`;
  ctx.textAlign = "left";
  const orderStartX = rightCenterX - 185;
  ctx.fillText("คำสั่ง", orderStartX, ry);
  cx = drawCheckbox(
    ctx,
    orderStartX + 90,
    ry,
    leave.orderDecision === "approved",
    "อนุญาต",
    fontFamily
  );
  drawCheckbox(
    ctx,
    cx,
    ry,
    leave.orderDecision === "rejected",
    "ไม่อนุญาต",
    fontFamily
  );
  ry += 44;
  ctx.font = `400 28px ${fontFamily}`;
  if (leave.orderComment) {
    ry = drawWrappedText(ctx, leave.orderComment, rightCenterX, ry, rightMaxW, 40, "center");
  }
  ry += 20;
  ry = drawWrappedText(
    ctx,
    `(ลงชื่อ) ${
      leave.orderedAt && leave.approverName
        ? leave.approverName
        : "................................................."
    }`,
    rightCenterX,
    ry,
    rightMaxW,
    40,
    "center"
  );
  ry = drawWrappedText(
    ctx,
    `(${leave.approverName || "........................................"})`,
    rightCenterX,
    ry,
    rightMaxW,
    40,
    "center"
  );
  ry = drawWrappedText(
    ctx,
    `ตำแหน่ง ${leave.approverPosition || "...................................."}`,
    rightCenterX,
    ry,
    rightMaxW,
    40,
    "center"
  );
  ry = drawWrappedText(
    ctx,
    `วันที่ ${ordParts.day || "...."} เดือน ${
      ordParts.month || "............"
    } พ.ศ. ${ordParts.yearBE || "......"}`,
    rightCenterX,
    ry,
    rightMaxW,
    40,
    "center"
  );

  // Footer note
  const noteY = Math.max(ly, ry) + 46;
  ctx.font = `700 27px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText("หมายเหตุ :-", MARGIN_LEFT, noteY);
  ctx.font = `400 27px ${fontFamily}`;
  drawWrappedText(
    ctx,
    "การลากิจ + ลาป่วย ต้องไม่เกิน 23 วันทำการ จึงมีสิทธิเลื่อนขั้นเงินเดือน/ค่าจ้าง\nในรอบ 6 เดือน คือ 1 ต.ค. – 31 มี.ค. , 1 เม.ย. – 30 ก.ย.",
    MARGIN_LEFT + 145,
    noteY,
    CONTENT_W - 145,
    38
  );
}

export async function downloadLeavePdf(leave: LeaveRequestItem): Promise<void> {
  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready;
  }
  const fontFamily = getFontFamily();
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Cannot create 2D canvas context");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  if (leave.leaveType === "vacation_leave") {
    drawVacationForm(ctx, leave, fontFamily);
  } else {
    drawGeneralForm(ctx, leave, fontFamily);
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  const imgData = canvas.toDataURL("image/png");
  doc.addImage(imgData, "PNG", 0, 0, 210, 297, undefined, "FAST");
  doc.save(`${leave.requestNo}_${leave.applicantName}.pdf`);
}
