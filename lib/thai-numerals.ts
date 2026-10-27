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

export const THAI_MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

/**
 * แปลงตัวเลขอารบิก (0-9) ให้เป็นตัวเลขไทย (๐-๙)
 */
export function toThaiDigits(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return "";
  return String(val).replace(/[0-9]/g, (d) => THAI_NUMERALS[parseInt(d, 10)]);
}

/**
 * ได้รับวันที่ปัจจุบันในรูปแบบ ISO "YYYY-MM-DD"
 */
export function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * แปลงวันที่ในรูปแบบ ISO "YYYY-MM-DD" หรือ Date string ให้เป็นวันที่ภาษาไทยพร้อมตัวเลขไทย
 * เช่น "2026-10-27" -> "๒๗ ตุลาคม ๒๕๖๙"
 */
export function formatIsoToThaiDate(isoDate: string | undefined | null): string {
  if (!isoDate) return "";
  const trimmed = isoDate.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10) + 543;
    const monthIndex = parseInt(match[2], 10) - 1;
    const month = THAI_MONTHS_FULL[monthIndex] || "";
    const day = parseInt(match[3], 10);
    return toThaiDigits(`${day} ${month} ${year}`);
  }
  return toThaiDate(trimmed);
}

/**
 * วันที่ปัจจุบันในรูปแบบภาษาไทยและตัวเลขไทย เช่น "๒๗ ตุลาคม ๒๕๖๙"
 */
export function getTodayThaiDate(): string {
  return formatIsoToThaiDate(getTodayIsoDate());
}

/**
 * แปลงข้อความวันที่ภาษาไทย (เช่น "๒๗ ตุลาคม ๒๕๖๙" หรือ "10 ตุลาคม 2569") กลับเป็น ISO "YYYY-MM-DD"
 * เพื่อใช้ซิงค์กับ HTML5 Calendar Date Picker
 */
export function thaiDateToIso(thaiDateStr: string | undefined | null): string {
  if (!thaiDateStr) return getTodayIsoDate();
  const str = thaiDateStr.trim();

  // หากเป็นรูปแบบ ISO อยู่แล้ว
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // แปลงเลขไทยเป็นเลขอารบิก
  const arabicStr = str.replace(/[๐-๙]/g, (ch) => {
    const idx = THAI_NUMERALS.indexOf(ch);
    return idx !== -1 ? String(idx) : ch;
  });

  // ค้นหาเดือนภาษาไทย
  let foundMonthIndex = -1;
  for (let i = 0; i < THAI_MONTHS_FULL.length; i++) {
    if (arabicStr.includes(THAI_MONTHS_FULL[i])) {
      foundMonthIndex = i;
      break;
    }
  }

  if (foundMonthIndex !== -1) {
    const numbers = arabicStr.match(/\d+/g);
    if (numbers && numbers.length >= 2) {
      const day = parseInt(numbers[0], 10);
      let year = parseInt(numbers[1], 10);
      if (year > 2400) {
        year -= 543;
      }
      const mm = String(foundMonthIndex + 1).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    }
  }

  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  } catch {
    // fallback
  }

  return getTodayIsoDate();
}

/**
 * แปลงสตริงหรือ Date ให้เป็นวันที่ภาษาไทยพร้อมตัวเลขไทยตามระเบียบสารบรรณ
 * เช่น "2026-10-27" -> "๒๗ ตุลาคม ๒๕๖๙"
 * หรือ "27 ตุลาคม 2569" -> "๒๗ ตุลาคม ๒๕๖๙"
 */
export function toThaiDate(dateStr: string | undefined | null): string {
  if (!dateStr) return "";

  // กรณีเป็น ISO YYYY-MM-DD
  const isoMatch = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10) + 543;
    const monthIndex = parseInt(isoMatch[2], 10) - 1;
    const month = THAI_MONTHS_FULL[monthIndex] || "";
    const day = parseInt(isoMatch[3], 10);
    return toThaiDigits(`${day} ${month} ${year}`);
  }

  // กรณีเป็นข้อความระบุเดือนภาษาไทยอยู่แล้ว ให้แปลงเฉพาะเลขเป็นเลขไทย
  const hasThaiMonth = THAI_MONTHS_FULL.some((m) => dateStr.includes(m));
  if (hasThaiMonth) {
    return toThaiDigits(dateStr);
  }

  // กรณีเป็น Date string ทั่วไป
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

/**
 * แปลงสตริงวันที่หรือ ISO string ให้เป็นวันที่ย่อภาษาไทยพร้อมตัวเลขไทยกระชับ
 * เช่น "2026-10-30T00:00:00.000Z" -> "๓๐ ต.ค. ๖๙" (หาก twoDigitYear=true) หรือ "๓๐ ต.ค. ๒๕๖๙"
 */
export function toThaiShortDate(
  dateStr: string | undefined | null,
  twoDigitYear: boolean = true
): string {
  if (!dateStr) return "";
  const trimmed = dateStr.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const fullYear = parseInt(isoMatch[1], 10) + 543;
    const monthIndex = parseInt(isoMatch[2], 10) - 1;
    const month = THAI_MONTHS_SHORT[monthIndex] || "";
    const day = parseInt(isoMatch[3], 10);
    const year = twoDigitYear ? String(fullYear).slice(-2) : String(fullYear);
    return toThaiDigits(`${day} ${month} ${year}`);
  }
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const month = THAI_MONTHS_SHORT[d.getMonth()];
      const fullYear = d.getFullYear() + 543;
      const year = twoDigitYear ? String(fullYear).slice(-2) : String(fullYear);
      return toThaiDigits(`${day} ${month} ${year}`);
    }
  } catch {
    // fallback
  }
  return toThaiDigits(trimmed);
}
