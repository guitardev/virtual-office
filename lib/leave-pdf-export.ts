import { jsPDF } from "jspdf";
import {
  formatThaiDateFull,
  formatThaiDateParts,
  formatThaiDateSlash,
  LeaveRequestItem,
} from "./leave-utils";

// A4 Portrait at ~200 DPI: 21.0 cm x 29.7 cm -> 1654 x 2339 px
const PAGE_W = 1654;
const PAGE_H = 2339;
// กั้นหน้า 2.5 cm = 197 px, กั้นหลัง 2.0 cm = 158 px
const MARGIN_LEFT = 197;
const MARGIN_RIGHT = 158;
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
  lineHeight = 40,
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
  const size = 22;
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y - size + 4, size, size);
  if (checked) {
    ctx.beginPath();
    ctx.moveTo(x + 4, y - size / 2 + 4);
    ctx.lineTo(x + 9, y - 2);
    ctx.lineTo(x + size - 4, y - size + 8);
    ctx.stroke();
  }
  ctx.fillStyle = "#000000";
  ctx.font = `400 25px ${fontFamily}`;
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

  let y = 125;
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "alphabetic";

  ctx.font = `700 36px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.fillText("ใบลาพักผ่อน", PAGE_W / 2, y);
  y += 65;

  ctx.font = `400 25px ${fontFamily}`;
  y = drawWrappedText(
    ctx,
    `เขียนที่ ${
      leave.writtenAt ||
      "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์ จังหวัดกำแพงเพชร"
    }`,
    740,
    y,
    RIGHT_LIMIT - 740,
    38
  );
  y = drawWrappedText(
    ctx,
    `วันที่ ${writtenParts.day || "...."} เดือน ${
      writtenParts.month || "............"
    } พ.ศ. ${writtenParts.yearBE || "......"}`,
    820,
    y + 2,
    RIGHT_LIMIT - 820,
    38
  );
  y += 24;

  ctx.font = `700 25px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText("เรื่อง", MARGIN_LEFT, y);
  ctx.font = `400 25px ${fontFamily}`;
  y = drawWrappedText(
    ctx,
    leave.subject || "ขอลาพักผ่อน",
    MARGIN_LEFT + 72,
    y,
    CONTENT_W - 72,
    38
  );

  ctx.font = `700 25px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText("เรียน", MARGIN_LEFT, y + 4);
  ctx.font = `400 25px ${fontFamily}`;
  y = drawWrappedText(
    ctx,
    leave.toRecipient || "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
    MARGIN_LEFT + 72,
    y + 4,
    CONTENT_W - 72,
    38
  );
  y += 20;

  y = drawWrappedText(
    ctx,
    `ข้าพเจ้า ${leave.applicantName}   ตำแหน่ง ${leave.applicantPosition || "-"}`,
    MARGIN_LEFT + 95,
    y,
    CONTENT_W - 95,
    40
  );
  y = drawWrappedText(
    ctx,
    `กลุ่ม/ฝ่าย ${
      leave.applicantDivision || "-"
    }   สังกัด สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร`,
    MARGIN_LEFT,
    y,
    CONTENT_W,
    40
  );
  y = drawWrappedText(
    ctx,
    `มีวันลาพักผ่อนสะสม ${leave.vacationAccumulatedDays} วันทำการ  มีสิทธิลาพักผ่อนประจำปีอีก ${leave.vacationAnnualDays} วันทำการ  รวมเป็น ${totalEntitled} วันทำการ`,
    MARGIN_LEFT,
    y,
    CONTENT_W,
    40
  );
  y = drawWrappedText(
    ctx,
    `ขอลาพักผ่อนตั้งแต่วันที่ ${startParts.day} เดือน ${startParts.month} พ.ศ. ${startParts.yearBE} ถึงวันที่ ${endParts.day} เดือน ${endParts.month} พ.ศ. ${endParts.yearBE} มีกำหนด ${leave.totalWorkingDays} วัน`,
    MARGIN_LEFT,
    y,
    CONTENT_W,
    40
  );
  y = drawWrappedText(
    ctx,
    `ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่ ${
      leave.contactInfo || "-"
    }   หมายเลขโทรศัพท์ ${leave.contactPhone || "-"}`,
    MARGIN_LEFT,
    y,
    CONTENT_W,
    40
  );
  y += 55;

  const sigCenterX = RIGHT_LIMIT - 280;
  ctx.textAlign = "center";
  ctx.fillText(
    "(ลงชื่อ)......................................................",
    sigCenterX,
    y
  );
  y += 38;
  ctx.fillText(`(${leave.applicantName})`, sigCenterX, y);
  y += 85;

  // 2-Column bottom section within CONTENT_W
  const leftX = MARGIN_LEFT;
  const leftMaxW = 610;
  const colW = 200;
  ctx.font = `700 25px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.fillText("สถิติการลาในปีงบประมาณนี้", leftX + colW * 1.5, y);
  y += 20;

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
    ctx.strokeRect(leftX + i * colW, row1Y, colW, 54);
    ctx.font = `700 21px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.fillText(headers[i], leftX + i * colW + colW / 2, row1Y + 34);

    ctx.strokeRect(leftX + i * colW, row1Y + 54, colW, 46);
    ctx.font = i === 2 ? `700 23px ${fontFamily}` : `400 23px ${fontFamily}`;
    ctx.fillText(vals[i], leftX + i * colW + colW / 2, row1Y + 84);
  }

  let ly = row1Y + 160;
  ctx.font = `400 24px ${fontFamily}`;
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
    36
  );
  ly = drawWrappedText(
    ctx,
    `(${leave.verifierName || "................................................"})`,
    leftX + 70,
    ly,
    leftMaxW - 70,
    36
  );
  ly = drawWrappedText(
    ctx,
    `(ตำแหน่ง) ${leave.verifierPosition || "...................................."}`,
    leftX,
    ly,
    leftMaxW,
    36
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
    36
  );
  ly += 40;

  ly = drawWrappedText(
    ctx,
    "ในระหว่างที่ข้าพเจ้าลาพักผ่อนมอบหมายให้",
    leftX,
    ly,
    leftMaxW,
    36
  );
  ly = drawWrappedText(
    ctx,
    `นาย/นาง/นางสาว ${
      leave.actingPersonName || ".................................."
    } ปฏิบัติหน้าที่แทน`,
    leftX,
    ly,
    leftMaxW,
    36
  );
  ly += 20;
  ly = drawWrappedText(
    ctx,
    "(ลงชื่อ)........................................ ผู้มอบ",
    leftX,
    ly,
    leftMaxW,
    36
  );
  ly = drawWrappedText(ctx, `(${leave.applicantName})`, leftX + 70, ly, leftMaxW - 70, 36);
  ly += 20;
  ly = drawWrappedText(
    ctx,
    "(ลงชื่อ)........................................ ผู้ปฏิบัติหน้าที่แทน",
    leftX,
    ly,
    leftMaxW,
    36
  );
  drawWrappedText(
    ctx,
    `(${leave.actingPersonName || "........................................"})`,
    leftX + 70,
    ly,
    leftMaxW - 70,
    36
  );

  // Right column
  const rightX = 870;
  const rightMaxW = RIGHT_LIMIT - rightX; // 626 px
  let ry = y - 20;
  ctx.font = `700 25px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.fillText("ความเห็นผู้บังคับบัญชา", rightX + rightMaxW / 2, ry);
  ry += 46;
  ctx.font = `400 24px ${fontFamily}`;
  ry = drawWrappedText(
    ctx,
    leave.supervisorComment ||
      "........................................................................",
    rightX,
    ry,
    rightMaxW,
    36
  );
  ry += 22;
  ry = drawWrappedText(
    ctx,
    `(ลงชื่อ) ${
      leave.supervisorReviewedAt && leave.supervisorName
        ? leave.supervisorName
        : "........................................"
    }`,
    rightX,
    ry,
    rightMaxW,
    36
  );
  ry = drawWrappedText(
    ctx,
    `(${leave.supervisorName || "........................................"})`,
    rightX + 70,
    ry,
    rightMaxW - 70,
    36
  );
  ry = drawWrappedText(
    ctx,
    `(ตำแหน่ง) ${leave.supervisorPosition || "...................................."}`,
    rightX,
    ry,
    rightMaxW,
    36
  );
  ry = drawWrappedText(
    ctx,
    `วันที่ ${
      leave.supervisorReviewedAt
        ? formatThaiDateSlash(leave.supervisorReviewedAt)
        : "........ / ........ / ........"
    }`,
    rightX,
    ry,
    rightMaxW,
    36
  );

  ry += 55;
  ctx.font = `700 25px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText("คำสั่ง", rightX, ry);
  const cx = drawCheckbox(
    ctx,
    rightX + 85,
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
  ry += 42;
  if (leave.orderComment) {
    ry = drawWrappedText(ctx, leave.orderComment, rightX, ry, rightMaxW, 36);
  }
  ry += 20;
  ry = drawWrappedText(
    ctx,
    `(ลงชื่อ) ${
      leave.orderedAt && leave.approverName
        ? leave.approverName
        : "........................................"
    }`,
    rightX,
    ry,
    rightMaxW,
    36
  );
  ry = drawWrappedText(
    ctx,
    `(${leave.approverName || "........................................"})`,
    rightX + 70,
    ry,
    rightMaxW - 70,
    36
  );
  ry = drawWrappedText(
    ctx,
    `(ตำแหน่ง) ${leave.approverPosition || "...................................."}`,
    rightX,
    ry,
    rightMaxW,
    36
  );
  drawWrappedText(
    ctx,
    `วันที่ ${
      leave.orderedAt
        ? formatThaiDateSlash(leave.orderedAt)
        : "........ / ........ / ........"
    }`,
    rightX,
    ry,
    rightMaxW,
    36
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

  let y = 120;
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "alphabetic";

  ctx.font = `700 36px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.fillText("ใบลาป่วย ลาคลอดบุตร ลากิจส่วนตัว", PAGE_W / 2, y);
  y += 60;

  ctx.font = `400 25px ${fontFamily}`;
  y = drawWrappedText(
    ctx,
    `เขียนที่ ${
      leave.writtenAt ||
      "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"
    }`,
    740,
    y,
    RIGHT_LIMIT - 740,
    38
  );
  y = drawWrappedText(
    ctx,
    `วันที่ ${writtenParts.day || "...."} เดือน ${
      writtenParts.month || "............"
    } พ.ศ. ${writtenParts.yearBE || "......"}`,
    820,
    y + 2,
    RIGHT_LIMIT - 820,
    38
  );
  y += 22;

  ctx.font = `700 25px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText("เรื่อง", MARGIN_LEFT, y);
  ctx.font = `400 25px ${fontFamily}`;
  y = drawWrappedText(
    ctx,
    leave.subject,
    MARGIN_LEFT + 72,
    y,
    CONTENT_W - 72,
    38
  );

  ctx.font = `700 25px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText("เรียน", MARGIN_LEFT, y + 4);
  ctx.font = `400 25px ${fontFamily}`;
  y = drawWrappedText(
    ctx,
    leave.toRecipient || "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
    MARGIN_LEFT + 72,
    y + 4,
    CONTENT_W - 72,
    38
  );
  y += 18;

  y = drawWrappedText(
    ctx,
    `ข้าพเจ้า ${leave.applicantName}   ตำแหน่ง ${leave.applicantPosition || "-"}`,
    MARGIN_LEFT + 95,
    y,
    CONTENT_W - 95,
    38
  );
  y = drawWrappedText(
    ctx,
    `สังกัด ${
      leave.applicantDivision
        ? `${leave.applicantDivision} (สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร)`
        : "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"
    }`,
    MARGIN_LEFT,
    y,
    CONTENT_W,
    38
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
      38
    );
  } else {
    y += 38;
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
    38
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
      38
    );
  } else {
    y += 42;
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
    38
  );

  ctx.textAlign = "left";
  ctx.fillText("ข้าพเจ้าได้ลา", MARGIN_LEFT, y);
  cx = drawCheckbox(
    ctx,
    MARGIN_LEFT + 145,
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
    38
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
    38
  );
  y += 45;

  const sigCenterX = RIGHT_LIMIT - 280;
  ctx.textAlign = "center";
  ctx.fillText("ขอแสดงความนับถือ", sigCenterX, y);
  y += 62;
  ctx.fillText(
    "(ลงชื่อ)......................................................",
    sigCenterX,
    y
  );
  y += 36;
  ctx.fillText(`(${leave.applicantName})`, sigCenterX, y);
  y += 75;

  // Left: Stats table + Verifier
  const leftX = MARGIN_LEFT;
  const leftMaxW = 610;
  const colWidths = [150, 150, 150, 150];
  const tableW = colWidths.reduce((a, b) => a + b, 0);
  ctx.font = `700 25px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.fillText("สถิติการลาในปีงบประมาณนี้", leftX + tableW / 2, y);
  y += 18;

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
    ctx.strokeRect(tx, ty, colWidths[i], 50);
    ctx.font = `700 21px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.fillText(tHeaders[i], tx + colWidths[i] / 2, ty + 32);
    tx += colWidths[i];
  }
  ty += 50;

  for (const r of tRows) {
    tx = leftX;
    for (let i = 0; i < 4; i++) {
      ctx.strokeRect(tx, ty, colWidths[i], 42);
      ctx.font = i === 3 ? `700 22px ${fontFamily}` : `400 22px ${fontFamily}`;
      ctx.fillText(r[i], tx + colWidths[i] / 2, ty + 28);
      tx += colWidths[i];
    }
    ty += 42;
  }

  let ly = ty + 55;
  ctx.font = `400 24px ${fontFamily}`;
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
    36
  );
  ly = drawWrappedText(
    ctx,
    `(${leave.verifierName || "................................................"})`,
    leftX + 70,
    ly,
    leftMaxW - 70,
    36
  );
  ly = drawWrappedText(
    ctx,
    `ตำแหน่ง ${leave.verifierPosition || "...................................."}`,
    leftX,
    ly,
    leftMaxW,
    36
  );
  ly = drawWrappedText(
    ctx,
    `วันที่ ${verifiedParts.day || "...."} เดือน ${
      verifiedParts.month || "............"
    } พ.ศ. ${verifiedParts.yearBE || "......"}`,
    leftX,
    ly,
    leftMaxW,
    36
  );

  // Right: Supervisor + Order
  const rightX = 870;
  const rightMaxW = RIGHT_LIMIT - rightX; // 626 px
  let ry = y - 18;
  ctx.font = `700 25px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.fillText("ความเห็นผู้บังคับบัญชา", rightX + rightMaxW / 2, ry);
  ry += 46;
  ctx.font = `400 24px ${fontFamily}`;
  ry = drawWrappedText(
    ctx,
    leave.supervisorComment ||
      "........................................................................",
    rightX,
    ry,
    rightMaxW,
    36
  );
  ry += 22;
  ry = drawWrappedText(
    ctx,
    `(ลงชื่อ) ${
      leave.supervisorReviewedAt && leave.supervisorName
        ? leave.supervisorName
        : "........................................"
    }`,
    rightX,
    ry,
    rightMaxW,
    36
  );
  ry = drawWrappedText(
    ctx,
    `(${leave.supervisorName || "........................................"})`,
    rightX + 70,
    ry,
    rightMaxW - 70,
    36
  );
  ry = drawWrappedText(
    ctx,
    `ตำแหน่ง ${leave.supervisorPosition || "...................................."}`,
    rightX,
    ry,
    rightMaxW,
    36
  );
  ry = drawWrappedText(
    ctx,
    `วันที่ ${supParts.day || "...."} เดือน ${
      supParts.month || "............"
    } พ.ศ. ${supParts.yearBE || "......"}`,
    rightX,
    ry,
    rightMaxW,
    36
  );

  ry += 50;
  ctx.font = `700 25px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText("คำสั่ง", rightX, ry);
  cx = drawCheckbox(
    ctx,
    rightX + 85,
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
  ry += 40;
  if (leave.orderComment) {
    ry = drawWrappedText(ctx, leave.orderComment, rightX, ry, rightMaxW, 36);
  }
  ry += 20;
  ry = drawWrappedText(
    ctx,
    `(ลงชื่อ) ${
      leave.orderedAt && leave.approverName
        ? leave.approverName
        : "........................................"
    }`,
    rightX,
    ry,
    rightMaxW,
    36
  );
  ry = drawWrappedText(
    ctx,
    `(${leave.approverName || "........................................"})`,
    rightX + 70,
    ry,
    rightMaxW - 70,
    36
  );
  ry = drawWrappedText(
    ctx,
    `ตำแหน่ง ${leave.approverPosition || "...................................."}`,
    rightX,
    ry,
    rightMaxW,
    36
  );
  ry = drawWrappedText(
    ctx,
    `วันที่ ${ordParts.day || "...."} เดือน ${
      ordParts.month || "............"
    } พ.ศ. ${ordParts.yearBE || "......"}`,
    rightX,
    ry,
    rightMaxW,
    36
  );

  // Footer note
  const noteY = Math.max(ly, ry) + 55;
  ctx.font = `700 23px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText("หมายเหตุ :-", MARGIN_LEFT, noteY);
  ctx.font = `400 23px ${fontFamily}`;
  drawWrappedText(
    ctx,
    "การลากิจ + ลาป่วย ต้องไม่เกิน 23 วันทำการ จึงมีสิทธิเลื่อนขั้นเงินเดือน/ค่าจ้าง\nในรอบ 6 เดือน คือ 1 ต.ค. – 31 มี.ค. , 1 เม.ย. – 30 ก.ย.",
    MARGIN_LEFT + 130,
    noteY,
    CONTENT_W - 130,
    34
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
