import { jsPDF } from "jspdf";
import {
  formatThaiDateFull,
  formatThaiDateParts,
  formatThaiDateSlash,
  LeaveRequestItem,
} from "./leave-utils";

// A4 Portrait at ~200 DPI: 210mm x 297mm -> 1654 x 2339 px
const PAGE_W = 1654;
const PAGE_H = 2339;
const MARGIN_X = 115;

function getFontFamily(): string {
  if (typeof window !== "undefined") {
    const computed = window.getComputedStyle(document.body).fontFamily;
    if (computed) return computed;
  }
  return "'TH Sarabun New', 'Sarabun', sans-serif";
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
  ctx.font = `400 26px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText(label, x + size + 10, y);
  return x + size + 10 + ctx.measureText(label).width + 28;
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

  let y = 130;
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "alphabetic";

  ctx.font = `700 38px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.fillText("ใบลาพักผ่อน", PAGE_W / 2, y);
  y += 70;

  ctx.font = `400 26px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText(
    `เขียนที่ ${
      leave.writtenAt ||
      "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์ จังหวัดกำแพงเพชร"
    }`,
    760,
    y
  );
  y += 42;
  ctx.fillText(
    `วันที่ ${writtenParts.day || "...."} เดือน ${
      writtenParts.month || "............"
    } พ.ศ. ${writtenParts.yearBE || "......"}`,
    840,
    y
  );
  y += 65;

  ctx.font = `700 26px ${fontFamily}`;
  ctx.fillText("เรื่อง", MARGIN_X, y);
  ctx.font = `400 26px ${fontFamily}`;
  ctx.fillText(leave.subject || "ขอลาพักผ่อน", MARGIN_X + 75, y);
  y += 45;

  ctx.font = `700 26px ${fontFamily}`;
  ctx.fillText("เรียน", MARGIN_X, y);
  ctx.font = `400 26px ${fontFamily}`;
  ctx.fillText(
    leave.toRecipient || "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
    MARGIN_X + 75,
    y
  );
  y += 65;

  ctx.fillText(
    `ข้าพเจ้า ${leave.applicantName}   ตำแหน่ง ${leave.applicantPosition || "-"}`,
    MARGIN_X + 110,
    y
  );
  y += 44;
  ctx.fillText(
    `กลุ่ม/ฝ่าย ${
      leave.applicantDivision || "-"
    }   สังกัด สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร`,
    MARGIN_X,
    y
  );
  y += 44;
  ctx.fillText(
    `มีวันลาพักผ่อนสะสม ${leave.vacationAccumulatedDays} วันทำการ  มีสิทธิลาพักผ่อนประจำปีอีก ${leave.vacationAnnualDays} วันทำการ  รวมเป็น ${totalEntitled} วันทำการ`,
    MARGIN_X,
    y
  );
  y += 44;
  ctx.fillText(
    `ขอลาพักผ่อนตั้งแต่วันที่ ${startParts.day} เดือน ${startParts.month} พ.ศ. ${startParts.yearBE} ถึงวันที่ ${endParts.day} เดือน ${endParts.month} พ.ศ. ${endParts.yearBE} มีกำหนด ${leave.totalWorkingDays} วัน`,
    MARGIN_X,
    y
  );
  y += 44;
  ctx.fillText(
    `ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่ ${
      leave.contactInfo || "-"
    }   หมายเลขโทรศัพท์ ${leave.contactPhone || "-"}`,
    MARGIN_X,
    y
  );
  y += 110;

  ctx.textAlign = "center";
  ctx.fillText(
    "(ลงชื่อ)......................................................",
    1180,
    y
  );
  y += 40;
  ctx.fillText(`(${leave.applicantName})`, 1180, y);
  y += 95;

  // Left: Stats table + Verifier + Acting person
  const leftX = MARGIN_X;
  const colW = 210;
  ctx.font = `700 26px ${fontFamily}`;
  ctx.fillText("สถิติการลาในปีงบประมาณนี้", leftX + colW * 1.5, y);
  y += 22;

  const headers = ["ลามาแล้ว (วันทำการ)", "ลาครั้งนี้ (วันทำการ)", "รวมเป็น (วันทำการ)"];
  const vals = [
    String(leave.prevVacationDays),
    String(leave.totalWorkingDays),
    String(totalUsed),
  ];

  const row1Y = y;
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(leftX + i * colW, row1Y, colW, 56);
    ctx.font = `700 22px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.fillText(headers[i], leftX + i * colW + colW / 2, row1Y + 35);

    ctx.strokeRect(leftX + i * colW, row1Y + 56, colW, 48);
    ctx.font = i === 2 ? `700 24px ${fontFamily}` : `400 24px ${fontFamily}`;
    ctx.fillText(vals[i], leftX + i * colW + colW / 2, row1Y + 88);
  }

  let ly = row1Y + 170;
  ctx.textAlign = "left";
  ctx.font = `400 25px ${fontFamily}`;
  ctx.fillText(
    `(ลงชื่อ) ${leave.verifierName || "................................."} ผู้ตรวจสอบ`,
    leftX,
    ly
  );
  ly += 40;
  ctx.fillText(
    `(${leave.verifierName || "................................................"})`,
    leftX + 90,
    ly
  );
  ly += 40;
  ctx.fillText(
    `(ตำแหน่ง) ${leave.verifierPosition || "...................................."}`,
    leftX,
    ly
  );
  ly += 40;
  ctx.fillText(
    `วันที่ ${
      leave.verifiedAt
        ? formatThaiDateSlash(leave.verifiedAt)
        : "........ / ........ / ........"
    }`,
    leftX,
    ly
  );
  ly += 85;

  ctx.fillText("ในระหว่างที่ข้าพเจ้าลาพักผ่อนมอบหมายให้", leftX, ly);
  ly += 40;
  ctx.fillText(
    `นาย/นาง/นางสาว ${
      leave.actingPersonName || ".................................."
    } ปฏิบัติหน้าที่แทน`,
    leftX,
    ly
  );
  ly += 60;
  ctx.fillText("(ลงชื่อ)........................................ ผู้มอบ", leftX, ly);
  ly += 38;
  ctx.fillText(`(${leave.applicantName})`, leftX + 90, ly);
  ly += 60;
  ctx.fillText(
    "(ลงชื่อ)........................................ ผู้ปฏิบัติหน้าที่แทน",
    leftX,
    ly
  );
  ly += 38;
  ctx.fillText(
    `(${leave.actingPersonName || "........................................"})`,
    leftX + 90,
    ly
  );

  // Right: Supervisor + Order
  const rightX = 880;
  let ry = y - 22;
  ctx.font = `700 26px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.fillText("ความเห็นผู้บังคับบัญชา", rightX + 300, ry);
  ry += 52;
  ctx.font = `400 25px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText(
    leave.supervisorComment ||
      "....................................................................................",
    rightX,
    ry
  );
  ry += 65;
  ctx.fillText(
    `(ลงชื่อ) ${
      leave.supervisorReviewedAt && leave.supervisorName
        ? leave.supervisorName
        : "........................................"
    }`,
    rightX,
    ry
  );
  ry += 40;
  ctx.fillText(
    `(${leave.supervisorName || "........................................"})`,
    rightX + 90,
    ry
  );
  ry += 40;
  ctx.fillText(
    `(ตำแหน่ง) ${leave.supervisorPosition || "...................................."}`,
    rightX,
    ry
  );
  ry += 40;
  ctx.fillText(
    `วันที่ ${
      leave.supervisorReviewedAt
        ? formatThaiDateSlash(leave.supervisorReviewedAt)
        : "........ / ........ / ........"
    }`,
    rightX,
    ry
  );

  ry += 95;
  ctx.font = `700 26px ${fontFamily}`;
  ctx.fillText("คำสั่ง", rightX, ry);
  let cx = drawCheckbox(
    ctx,
    rightX + 90,
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
  ry += 45;
  if (leave.orderComment) {
    ctx.fillText(leave.orderComment, rightX, ry);
  }
  ry += 55;
  ctx.fillText(
    `(ลงชื่อ) ${
      leave.orderedAt && leave.approverName
        ? leave.approverName
        : "........................................"
    }`,
    rightX,
    ry
  );
  ry += 40;
  ctx.fillText(
    `(${leave.approverName || "........................................"})`,
    rightX + 90,
    ry
  );
  ry += 40;
  ctx.fillText(
    `(ตำแหน่ง) ${leave.approverPosition || "...................................."}`,
    rightX,
    ry
  );
  ry += 40;
  ctx.fillText(
    `วันที่ ${
      leave.orderedAt
        ? formatThaiDateSlash(leave.orderedAt)
        : "........ / ........ / ........"
    }`,
    rightX,
    ry
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

  let y = 125;
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "alphabetic";

  ctx.font = `700 38px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.fillText("ใบลาป่วย ลาคลอดบุตร ลากิจส่วนตัว", PAGE_W / 2, y);
  y += 65;

  ctx.font = `400 26px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText(
    `เขียนที่ ${
      leave.writtenAt ||
      "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"
    }`,
    760,
    y
  );
  y += 40;
  ctx.fillText(
    `วันที่ ${writtenParts.day || "...."} เดือน ${
      writtenParts.month || "............"
    } พ.ศ. ${writtenParts.yearBE || "......"}`,
    840,
    y
  );
  y += 60;

  ctx.font = `700 26px ${fontFamily}`;
  ctx.fillText("เรื่อง", MARGIN_X, y);
  ctx.font = `400 26px ${fontFamily}`;
  ctx.fillText(leave.subject, MARGIN_X + 75, y);
  y += 42;

  ctx.font = `700 26px ${fontFamily}`;
  ctx.fillText("เรียน", MARGIN_X, y);
  ctx.font = `400 26px ${fontFamily}`;
  ctx.fillText(
    leave.toRecipient || "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
    MARGIN_X + 75,
    y
  );
  y += 60;

  ctx.fillText(
    `ข้าพเจ้า ${leave.applicantName}   ตำแหน่ง ${leave.applicantPosition || "-"}`,
    MARGIN_X + 110,
    y
  );
  y += 42;
  ctx.fillText(
    `สังกัด ${
      leave.applicantDivision
        ? `${leave.applicantDivision} (สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร)`
        : "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"
    }`,
    MARGIN_X,
    y
  );
  y += 48;

  let cx = drawCheckbox(
    ctx,
    MARGIN_X + 110,
    y,
    leave.leaveType === "sick_leave",
    "ป่วย",
    fontFamily
  );
  if (leave.leaveType === "sick_leave" && leave.reason) {
    ctx.fillText(`เนื่องจาก ${leave.reason}`, cx, y);
  }
  y += 42;

  ctx.fillText("ขอลา", MARGIN_X + 30, y);
  cx = drawCheckbox(
    ctx,
    MARGIN_X + 110,
    y,
    leave.leaveType === "personal_leave",
    "กิจส่วนตัว",
    fontFamily
  );
  ctx.fillText(
    `เนื่องจาก ${
      leave.leaveType === "personal_leave"
        ? leave.reason || "-"
        : "............................................................"
    }`,
    cx,
    y
  );
  y += 42;

  cx = drawCheckbox(
    ctx,
    MARGIN_X + 110,
    y,
    leave.leaveType === "maternity_leave",
    "คลอดบุตร",
    fontFamily
  );
  if (leave.leaveType === "maternity_leave" && leave.reason) {
    ctx.fillText(`(${leave.reason})`, cx, y);
  }
  y += 50;

  ctx.fillText(
    `ตั้งแต่วันที่ ${formatThaiDateFull(
      leave.startDate
    )} ถึงวันที่ ${formatThaiDateFull(leave.endDate)} มีกำหนด ${
      leave.totalWorkingDays
    } วัน`,
    MARGIN_X,
    y
  );
  y += 42;

  ctx.fillText("ข้าพเจ้าได้ลา", MARGIN_X, y);
  cx = drawCheckbox(
    ctx,
    MARGIN_X + 155,
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
  ctx.fillText(
    `ครั้งสุดท้ายตั้งแต่วันที่ ${
      leave.lastLeaveStartDate
        ? formatThaiDateFull(leave.lastLeaveStartDate)
        : "-"
    }`,
    cx,
    y
  );
  y += 42;

  const contactCombined =
    [leave.contactInfo, leave.contactPhone].filter(Boolean).join(" โทร. ") ||
    "-";
  ctx.fillText(
    `ถึงวันที่ ${
      leave.lastLeaveEndDate
        ? formatThaiDateFull(leave.lastLeaveEndDate)
        : "-"
    } มีกำหนด ${
      leave.lastLeaveDays ?? "-"
    } วัน  ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่ ${contactCombined}`,
    MARGIN_X,
    y
  );
  y += 85;

  ctx.textAlign = "center";
  ctx.fillText("ขอแสดงความนับถือ", 1180, y);
  y += 70;
  ctx.fillText(
    "(ลงชื่อ)......................................................",
    1180,
    y
  );
  y += 38;
  ctx.fillText(`(${leave.applicantName})`, 1180, y);
  y += 85;

  // Left: Stats table + Verifier
  const leftX = MARGIN_X;
  const colWidths = [165, 165, 165, 165];
  const tableW = colWidths.reduce((a, b) => a + b, 0);
  ctx.font = `700 26px ${fontFamily}`;
  ctx.fillText("สถิติการลาในปีงบประมาณนี้", leftX + tableW / 2, y);
  y += 20;

  const tHeaders = ["ประเภทลา", "ลามาแล้ว", "ลาครั้งนี้", "รวมเป็น"];
  const tRows = [
    ["ป่วย", String(leave.prevSickDays), curSick ? String(curSick) : "", String(leave.prevSickDays + curSick)],
    ["กิจส่วนตัว", String(leave.prevPersonalDays), curPersonal ? String(curPersonal) : "", String(leave.prevPersonalDays + curPersonal)],
    ["คลอดบุตร", String(leave.prevMaternityDays), curMaternity ? String(curMaternity) : "", String(leave.prevMaternityDays + curMaternity)],
  ];

  let ty = y;
  let tx = leftX;
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tx, ty, colWidths[i], 52);
    ctx.font = `700 22px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.fillText(tHeaders[i], tx + colWidths[i] / 2, ty + 33);
    tx += colWidths[i];
  }
  ty += 52;

  for (const r of tRows) {
    tx = leftX;
    for (let i = 0; i < 4; i++) {
      ctx.strokeRect(tx, ty, colWidths[i], 44);
      ctx.font = i === 3 ? `700 23px ${fontFamily}` : `400 23px ${fontFamily}`;
      ctx.fillText(r[i], tx + colWidths[i] / 2, ty + 30);
      tx += colWidths[i];
    }
    ty += 44;
  }

  let ly = ty + 65;
  ctx.textAlign = "left";
  ctx.font = `400 25px ${fontFamily}`;
  ctx.fillText(
    `(ลงชื่อ) ${leave.verifierName || "................................."} ผู้ตรวจสอบ`,
    leftX,
    ly
  );
  ly += 38;
  ctx.fillText(
    `(${leave.verifierName || "................................................"})`,
    leftX + 90,
    ly
  );
  ly += 38;
  ctx.fillText(
    `ตำแหน่ง ${leave.verifierPosition || "...................................."}`,
    leftX,
    ly
  );
  ly += 38;
  ctx.fillText(
    `วันที่ ${verifiedParts.day || "...."} เดือน ${
      verifiedParts.month || "............"
    } พ.ศ. ${verifiedParts.yearBE || "......"}`,
    leftX,
    ly
  );

  // Right: Supervisor + Order
  const rightX = 880;
  let ry = y - 20;
  ctx.font = `700 26px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.fillText("ความเห็นผู้บังคับบัญชา", rightX + 300, ry);
  ry += 50;
  ctx.font = `400 25px ${fontFamily}`;
  ctx.textAlign = "left";
  ctx.fillText(
    leave.supervisorComment ||
      "....................................................................................",
    rightX,
    ry
  );
  ry += 60;
  ctx.fillText(
    `(ลงชื่อ) ${
      leave.supervisorReviewedAt && leave.supervisorName
        ? leave.supervisorName
        : "........................................"
    }`,
    rightX,
    ry
  );
  ry += 38;
  ctx.fillText(
    `ตำแหน่ง ${leave.supervisorPosition || "...................................."}`,
    rightX,
    ry
  );
  ry += 38;
  ctx.fillText(
    `วันที่ ${supParts.day || "...."} เดือน ${
      supParts.month || "............"
    } พ.ศ. ${supParts.yearBE || "......"}`,
    rightX,
    ry
  );

  ry += 80;
  ctx.font = `700 26px ${fontFamily}`;
  ctx.fillText("คำสั่ง", rightX, ry);
  cx = drawCheckbox(
    ctx,
    rightX + 90,
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
    ctx.fillText(leave.orderComment, rightX, ry);
  }
  ry += 50;
  ctx.fillText(
    `(ลงชื่อ) ${
      leave.orderedAt && leave.approverName
        ? leave.approverName
        : "........................................"
    }`,
    rightX,
    ry
  );
  ry += 38;
  ctx.fillText(
    `ตำแหน่ง ${leave.approverPosition || "...................................."}`,
    rightX,
    ry
  );
  ry += 38;
  ctx.fillText(
    `วันที่ ${ordParts.day || "...."} เดือน ${
      ordParts.month || "............"
    } พ.ศ. ${ordParts.yearBE || "......"}`,
    rightX,
    ry
  );

  // Footer note
  const noteY = Math.max(ly, ry) + 90;
  ctx.font = `700 24px ${fontFamily}`;
  ctx.fillText("หมายเหตุ :-", MARGIN_X, noteY);
  ctx.font = `400 24px ${fontFamily}`;
  ctx.fillText(
    "การลากิจ + ลาป่วย ต้องไม่เกิน 23 วันทำการ จึงมีสิทธิเลื่อนขั้นเงินเดือน/ค่าจ้าง",
    MARGIN_X + 135,
    noteY
  );
  ctx.fillText(
    "ในรอบ 6 เดือน คือ 1 ต.ค. – 31 มี.ค. , 1 เม.ย. – 30 ก.ย.",
    MARGIN_X + 135,
    noteY + 36
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
