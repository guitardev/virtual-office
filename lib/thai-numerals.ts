/**
 * ยูทิลิตี้สำหรับแปลงตัวเลขและวันที่ให้เป็นรูปแบบตามระเบียบงานสารบรรณภาครัฐ
 * (Official Thai Saraban Numerals & Date Formatter)
 */

const THAI_NUMERALS = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"];

const THAI_MONTHS_FULL = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

/**
 * แปลงตัวเลขอารบิก (0-9) ให้เป็นตัวเลขไทย (๐-๙)
 */
export function toThaiDigits(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return "";
  return String(val).replace(/[0-9]/g, (d) => THAI_NUMERALS[parseInt(d, 10)]);
}

/**
 * แปลงสตริงหรือ Date ให้เป็นวันที่ภาษาไทยพร้อมตัวเลขไทยตามระเบียบสารบรรณ
 * เช่น "2026-10-27" -> "๒๗ ตุลาคม ๒๕๖๙"
 * หรือ "27 ตุลาคม 2569" -> "๒๗ ตุลาคม ๒๕๖๙"
 */
export function toThaiDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "";

  // กรณีเป็นข้อความระบุเดือนภาษาไทยอยู่แล้ว ให้แปลงเฉพาะเลขเป็นเลขไทย
  const hasThaiMonth = THAI_MONTHS_FULL.some((m) => dateStr.includes(m));
  if (hasThaiMonth) {
    return toThaiDigits(dateStr);
  }

  // กรณีเป็น ISO string หรือ Date string ทั่วไป
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const month = THAI_MONTHS_FULL[d.getMonth()];
      const year = d.getFullYear() + 543;
      return toThaiDigits(`${day} ${month} ${year}`);
    }
  } catch {
    // fallback
  }

  return toThaiDigits(dateStr);
}

/**
 * แปลงวันและเวลาให้อยู่ในรูปตัวเลขไทย เช่น "๒๗ ตุลาคม ๒๕๖๙ เวลา ๑๔:๓๐ น."
 */
export function toThaiDateTime(dateStr: string | undefined | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const month = THAI_MONTHS_FULL[d.getMonth()];
      const year = d.getFullYear() + 543;
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return toThaiDigits(`${day} ${month} ${year} เวลา ${hours}:${minutes} น.`);
    }
  } catch {
    // fallback
  }
  return toThaiDigits(dateStr);
}
