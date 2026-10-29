import JSZip from "jszip";
import fs from "fs";
import path from "path";

// Embedded base64 fallback
const TEMPLATE_DOCX_BASE64 =
  "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";

function escapeXml(unsafe?: string): string {
  return (unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rText(text: string, isBold: boolean = false): string {
  const parts = text.split("\t");
  let inner = "";
  parts.forEach((part, index) => {
    if (index > 0) {
      inner += "<w:tab/>";
    }
    if (part.length > 0) {
      inner += `<w:t xml:space="preserve">${escapeXml(part)}</w:t>`;
    }
  });

  return `<w:r><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:cs="TH SarabunPSK" w:eastAsia="TH SarabunPSK" w:hAnsi="TH SarabunPSK"/><w:sz w:val="32"/><w:szCs w:val="32"/>${
    isBold ? "<w:b/><w:bCs/>" : ""
  }</w:rPr>${inner}</w:r>`;
}

// Generates text with Underline style = Dotted (<w:u w:val="dotted"/>)
function rDotted(text?: string, minWidthChars: number = 0): string {
  let val = (text || "").trim();
  if (!val) {
    val = "\u00A0".repeat(minWidthChars || 15);
  } else if (minWidthChars > 0 && val.length < minWidthChars) {
    const pad = Math.floor((minWidthChars - val.length) / 2);
    val =
      "\u00A0".repeat(Math.max(1, pad)) +
      val +
      "\u00A0".repeat(Math.max(1, minWidthChars - val.length - pad));
  } else {
    val = `\u00A0${val}\u00A0`;
  }

  return `<w:r><w:rPr><w:rFonts w:ascii="TH SarabunPSK" w:cs="TH SarabunPSK" w:eastAsia="TH SarabunPSK" w:hAnsi="TH SarabunPSK"/><w:sz w:val="32"/><w:szCs w:val="32"/><w:u w:val="dotted"/></w:rPr><w:t xml:space="preserve">${escapeXml(
    val
  )}</w:t></w:r>`;
}

async function loadTemplateBuffer(): Promise<Buffer> {
  // Candidate 1: FormTemplates/Form_ขอใช้รถ_Template.docx (New official template)
  const p1 = path.join(process.cwd(), "FormTemplates", "Form_ขอใช้รถ_Template.docx");
  if (fs.existsSync(p1)) {
    return fs.readFileSync(p1);
  }

  // Candidate 2: public/templates/Form_ขอใช้รถ_Template.docx
  const p2 = path.join(process.cwd(), "public", "templates", "Form_ขอใช้รถ_Template.docx");
  if (fs.existsSync(p2)) {
    return fs.readFileSync(p2);
  }

  // Candidate 3: FormTemplates/Form_ขอใช้รถ.docx
  const p3 = path.join(process.cwd(), "FormTemplates", "Form_ขอใช้รถ.docx");
  if (fs.existsSync(p3)) {
    return fs.readFileSync(p3);
  }

  // Candidate 4: Embedded base64 fallback
  return Buffer.from(TEMPLATE_DOCX_BASE64, "base64");
}

const THAI_MONTHS_MAP: Record<string, string> = {
  "ม.ค.": "มกราคม",
  "ก.พ.": "กุมภาพันธ์",
  "มี.ค.": "มีนาคม",
  "เม.ย.": "เมษายน",
  "พ.ค.": "พฤษภาคม",
  "มิ.ย.": "มิถุนายน",
  "ก.ค.": "กรกฎาคม",
  "ส.ค.": "สิงหาคม",
  "ก.ย.": "กันยายน",
  "ต.ค.": "ตุลาคม",
  "พ.ย.": "พฤศจิกายน",
  "ธ.ค.": "ธันวาคม",
};

function cleanPersonName(name?: string): string {
  if (!name) return "";
  return name.replace(/\s*\([^)]*\)\s*$/g, "").trim();
}

function cleanVehicleName(vehName?: string, plate?: string): string {
  if (!vehName) return "รถยนต์ส่วนกลาง";
  let cleaned = vehName;
  if (plate && plate !== "-") {
    const escapedPlate = plate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    cleaned = cleaned
      .replace(new RegExp(`\\s*\\(${escapedPlate}\\)`, "gi"), "")
      .replace(new RegExp(`\\s*${escapedPlate}`, "gi"), "")
      .trim();
  }
  return cleaned || "รถยนต์ส่วนกลาง";
}

function parseThaiDateParts(dateStr?: string): { day: string; month: string; year: string } {
  if (dateStr) {
    const match = dateStr.match(/(\d{1,2})\s+([^\s\d,]+)\s+(\d{4})/);
    if (match) {
      const day = match[1];
      let month = match[2];
      const year = match[3];
      if (THAI_MONTHS_MAP[month]) {
        month = THAI_MONTHS_MAP[month];
      }
      return { day, month, year };
    }

    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return {
          day: d.getDate().toString(),
          month: d.toLocaleDateString("th-TH", { month: "long" }),
          year: (d.getFullYear() + 543).toString(),
        };
      }
    } catch {}
  }

  const now = new Date();
  return {
    day: now.getDate().toString(),
    month: now.toLocaleDateString("th-TH", { month: "long" }),
    year: (now.getFullYear() + 543).toString(),
  };
}

export async function generateCarBookingDocx(bookingData: any): Promise<Buffer> {
  const templateBuffer = await loadTemplateBuffer();
  const zip = await JSZip.loadAsync(templateBuffer);
  const docXmlFile = zip.file("word/document.xml");

  if (!docXmlFile) {
    throw new Error("Invalid DOCX template: word/document.xml missing");
  }

  const docXml = await docXmlFile.async("text");

  // Extract fields with fallbacks & name sanitization
  const reqName = cleanPersonName(bookingData.requesterName);
  const reqPos = bookingData.requesterPosition || "";
  const licPlate = bookingData.licensePlate && bookingData.licensePlate !== "-" ? bookingData.licensePlate : "กฉ 5196 กำแพงเพชร";
  const rawVehName = bookingData.vehicleName && bookingData.vehicleName !== "รอฝ่ายบริหารจัดสรร" ? bookingData.vehicleName : "รถยนต์ส่วนกลาง";
  const vehName = cleanVehicleName(rawVehName, licPlate);
  const driver = bookingData.assignedDriver && bookingData.assignedDriver !== "รอฝ่ายบริหารจัดสรร" 
    ? bookingData.assignedDriver 
    : (bookingData.requireDriver === false ? "(ผู้ขอขับขี่เอง)" : "นายสมชาย ใจดี");
  const dest = bookingData.destination || "";
  const purpose = bookingData.purpose || "";
  const passengers = bookingData.passengersList || "-";
  
  // Total passengers with driver
  const calcTotalPassengers = bookingData.totalPassengerCountWithDriver
    ? bookingData.totalPassengerCountWithDriver
    : (bookingData.passengerCount || 1) + (bookingData.requireDriver !== false ? 1 : 0);
  const passengerCountStr = String(calcTotalPassengers);
  const distanceStr = String(bookingData.estimatedDistance || 150);
  
  const startDate = bookingData.startDateThai || "";
  const startTime = bookingData.startTime || "";
  const endDate = bookingData.endDateThai || "";
  const endTime = bookingData.endTime || "";

  // Fuel Budget formatting
  let fuelAmountText = "- บาท";
  if (bookingData.fuelBudgetRequested && bookingData.fuelBudgetAmount) {
    const amtStr = Number(bookingData.fuelBudgetAmount).toLocaleString();
    if (bookingData.fuelProjectName) {
      fuelAmountText = `${amtStr} บาท (โครงการ: ${bookingData.fuelProjectName})`;
    } else if (bookingData.fuelBudgetSource) {
      fuelAmountText = `${amtStr} บาท (${bookingData.fuelBudgetSource})`;
    } else {
      fuelAmountText = `${amtStr} บาท`;
    }
  }

  // Date parsing
  const topDate = parseThaiDateParts(bookingData.createdAt || bookingData.startDateThai);
  const divDate = parseThaiDateParts(bookingData.divisionReviewerActionAt || bookingData.createdAt);
  const admDate = parseThaiDateParts(bookingData.adminHeadActionAt || bookingData.fleetDispatcherActionAt || bookingData.createdAt);
  const appDate = parseThaiDateParts(bookingData.approverDate || bookingData.createdAt);

  // Signatures
  const divReviewerName = cleanPersonName(bookingData.divisionReviewerName) || "นายวรวุฒิ พึ่งพัก";
  const divReviewerPos = bookingData.divisionReviewerPosition || "นักพัฒนาสังคมชำนาญการพิเศษ (หัวหน้ากลุ่มการพัฒนาสังคมและสวัสดิการ)";

  const adminHeadName = cleanPersonName(
    bookingData.adminHeadName ||
    bookingData.fleetDispatcherName ||
    bookingData.managerName ||
    "นายเสกพล ดิษฐโชติ"
  );
  const adminHeadPos =
    bookingData.adminHeadPosition ||
    "นักพัฒนาสังคมชำนาญการ (หัวหน้าฝ่ายบริหารทั่วไป)";
  const adminHeadNotes =
    bookingData.adminHeadNotes ||
    bookingData.managerNotes ||
    (licPlate ? `เห็นควรอนุญาตให้ใช้รถยนต์ส่วนกลางหมายเลขทะเบียน ${licPlate} พนักงานขับรถ ${driver}` : "เห็นควรอนุญาตให้ใช้รถยนต์ราชการ");

  const isApproved = bookingData.status === "approved";
  const isRejected = bookingData.status === "rejected";
  const approverName = cleanPersonName(
    bookingData.approverName || "นางสาวมะลิวัน สิทธิโยธี"
  );

  // Split paragraphs by </w:p>
  const rawParagraphs = docXml.split("</w:p>");

  let state = "init";

  const modifiedParagraphs = rawParagraphs.map((pXml, i) => {
    if (i >= rawParagraphs.length - 1 && !pXml.trim()) {
      return pXml;
    }
    const fullText = pXml.replace(/<[^>]+>/g, "").trim();

    if (fullText.includes("ผู้ขออนุญาต")) state = "after_requester_sig";
    else if (fullText.includes("หัวหน้ากลุ่ม/ฝ่าย")) state = "after_div_head_sig";
    else if (fullText.includes("หัวหน้าฝ่ายบริหารทั่วไป")) state = "after_admin_head_sig";
    else if (fullText.includes("ผู้อนุญาต")) state = "after_provincial_sig";

    let runs: string | null = null;

    if (
      fullText.includes("วันที่") &&
      fullText.includes("เดือน") &&
      fullText.includes("พ.ศ.") &&
      !fullText.includes("ในวันที่") &&
      !fullText.includes("ถึงวันที่") &&
      !fullText.includes("/")
    ) {
      // Top date line
      runs =
        rText("\t                                                          วันที่ ") +
        rDotted(topDate.day, 6) +
        rText(" เดือน ") +
        rDotted(topDate.month, 14) +
        rText(" พ.ศ. ") +
        rDotted(topDate.year, 8);
    } else if (fullText.includes("ข้าพเจ้า")) {
      // Requester info
      runs =
        rText("\t                    ข้าพเจ้า ") +
        rDotted(reqName, 26) +
        rText(" ตำแหน่ง ") +
        rDotted(reqPos, 26);
    } else if (fullText.includes("ขออนุญาตใช้รถยนต์")) {
      // Vehicle info
      runs =
        rText("ขออนุญาตใช้รถยนต์ ") +
        rDotted(vehName, 20) +
        rText(" หมายเลขทะเบียน ") +
        rDotted(licPlate, 20);
    } else if (fullText.includes("เป็นพนักงานขับรถยนต์ไปราชการที่")) {
      // Driver and mission
      runs =
        rText("โดยมี ") +
        rDotted(driver, 24) +
        rText(" เป็นพนักงานขับรถยนต์ไปราชการที่ ") +
        rDotted(dest, 45) +
        rText(" เพื่อ ") +
        rDotted(purpose, 45) +
        rText("  พร้อมด้วย");
    } else if (fullText.includes("รายชื่อผู้ร่วมเดินทาง") || i === 6) {
      // Passengers
      runs = rDotted(passengers, 65);
    } else if (fullText.includes("มีคนนั่งทั้งสิ้น") || fullText.includes("มีคนนั่ง")) {
      // Passenger count and distance
      runs =
        rText("มีคนนั่งทั้งสิ้น ") +
        rDotted(passengerCountStr, 6) +
        rText(" คน   ระยะทางโดยประมาณ ") +
        rDotted(distanceStr, 10) +
        rText(" กิโลเมตร");
    } else if (fullText.includes("ในวันที่")) {
      // Departure date and time
      runs =
        rText("ในวันที่ ") +
        rDotted(startDate, 18) +
        rText(" เวลา ") +
        rDotted(startTime, 10) +
        rText(" น.");
    } else if (fullText.includes("ถึงวันที่")) {
      // Return date and time
      runs =
        rText("ถึงวันที่ ") +
        rDotted(endDate, 18) +
        rText(" เวลา ") +
        rDotted(endTime, 10) +
        rText(" น.");
    } else if (fullText.includes("ขอเบิกน้ำมันเชื้อเพลิง")) {
      // Fuel budget
      runs =
        rText("ขอเบิกน้ำมันเชื้อเพลิงและหล่อลื่น  จำนวน ") +
        rDotted(fuelAmountText, 26);
    } else if (fullText.startsWith("(") && state === "after_requester_sig") {
      // Requester signature name
      runs =
        rText("\t                                                                  ( ") +
        rDotted(reqName, 26) +
        rText(" )");
      state = "requester_pos_next";
    } else if (fullText.startsWith("ตำแหน่ง") && state === "requester_pos_next") {
      // Requester signature position
      runs =
        rText("\t                                                           ตำแหน่ง ") +
        rDotted(reqPos, 26);
      state = "requester_date_next";
    } else if (fullText.includes("/") && state === "requester_date_next") {
      // Requester signature date
      runs =
        rText("\t                                                                       ") +
        rDotted(topDate.day, 4) +
        rText(" / ") +
        rDotted(topDate.month, 10) +
        rText(" / ") +
        rDotted(topDate.year, 6);
      state = "ready_for_next_block";
    } else if (fullText.startsWith("(") && state === "after_div_head_sig") {
      // Division reviewer signature name
      runs =
        rText("\t                                                           ( ") +
        rDotted(divReviewerName, 26) +
        rText(" )");
      state = "div_pos_next";
    } else if (fullText.startsWith("ตำแหน่ง") && state === "div_pos_next") {
      // Division reviewer signature position
      runs =
        rText("\t                                                           ตำแหน่ง ") +
        rDotted(divReviewerPos, 26);
      state = "div_date_next";
    } else if (fullText.includes("/") && state === "div_date_next") {
      // Division reviewer signature date
      runs =
        rText("\t                                                                       ") +
        rDotted(divDate.day, 4) +
        rText(" / ") +
        rDotted(divDate.month, 10) +
        rText(" / ") +
        rDotted(divDate.year, 6);
      state = "ready_for_next_block";
    } else if (fullText.startsWith("ความเห็น")) {
      // Admin head opinion
      runs =
        rText(" ความเห็น ") +
        rDotted(adminHeadNotes, 65);
    } else if (fullText.startsWith("(") && state === "after_admin_head_sig") {
      // Admin head signature name
      runs =
        rText("\t                                                            ( ") +
        rDotted(adminHeadName, 26) +
        rText(" )");
      state = "admin_pos_next";
    } else if (fullText.startsWith("ตำแหน่ง") && state === "admin_pos_next") {
      // Admin head signature position
      runs =
        rText("\t                                                           ตำแหน่ง ") +
        rDotted(adminHeadPos, 26);
      state = "admin_date_next";
    } else if (fullText.includes("/") && state === "admin_date_next") {
      // Admin head signature date
      runs =
        rText("\t                                                                       ") +
        rDotted(admDate.day, 4) +
        rText(" / ") +
        rDotted(admDate.month, 10) +
        rText(" / ") +
        rDotted(admDate.year, 6);
      state = "ready_for_next_block";
    } else if (fullText.includes("อนุญาต") && fullText.includes("ไม่อนุญาต")) {
      // Approval checkboxes
      const appMark = isApproved ? "✓" : " ";
      const rejMark = isRejected ? "✓" : " ";
      runs =
        rText("\t\t                                                   ( ") +
        rDotted(appMark, 3) +
        rText(" ) อนุญาต   ( ") +
        rDotted(rejMark, 3) +
        rText(" ) ไม่อนุญาต");
    } else if (fullText.startsWith("(") && state === "after_provincial_sig") {
      // Provincial signature name
      runs =
        rText("\t                                                                  ( ") +
        rDotted(approverName, 26) +
        rText(" )");
      state = "provincial_date_next";
    } else if (fullText.includes("/") && (state === "after_provincial_sig" || state === "provincial_date_next" || i === 36)) {
      // Provincial signature date
      runs =
        rText("\t                 ") +
        rDotted(appDate.day, 4) +
        rText(" / ") +
        rDotted(appDate.month, 10) +
        rText(" / ") +
        rDotted(appDate.year, 6);
    }

    if (runs !== null) {
      const pPrEndIndex = pXml.indexOf("</w:pPr>");
      if (pPrEndIndex !== -1) {
        return pXml.substring(0, pPrEndIndex + 8) + runs;
      } else {
        const pOpenEnd = pXml.indexOf(">");
        return pXml.substring(0, pOpenEnd + 1) + runs;
      }
    }

    return pXml;
  });

  const modifiedXml = modifiedParagraphs.join("</w:p>");
  zip.file("word/document.xml", modifiedXml);

  return await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}
