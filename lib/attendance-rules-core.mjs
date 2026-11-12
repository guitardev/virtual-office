/**
 * Smart MSO - Attendance Official Hours & Thai Fiscal Calendar Utility Core
 * -------------------------------------------------------------------------
 * Pure JavaScript ESM implementation (zero Node-only or browser-only deps)
 * Safe to run in Node.js scripts (scripts/sync-attendance.mjs), Next.js App Router,
 * Supabase client functions, and browser Client Components.
 */

export const THAI_MONTHS_FULL = Object.freeze([
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
]);

export const THAI_MONTHS_SHORT = Object.freeze([
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
]);

/**
 * ลำดับเดือนตามปฏิทินปีงบประมาณไทย (เริ่มตุลาคม = 1 ถึง กันยายน = 12)
 * [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9]
 */
export const THAI_FISCAL_MONTH_ORDER = Object.freeze([
  10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9,
]);

export const ATTENDANCE_IO_LABELS = Object.freeze({
  1: 'เข้าราชการเช้า (ปกติ)',
  2: 'ออกราชการ (Check-Out)',
  3: 'สาย / อาจลา (08:31-12:00)',
  4: 'สแกนระหว่างวัน / ก่อน 16:30',
});

/**
 * แปลงรหัส ioMode (1..4) เป็นป้ายกำกับภาษาไทยตามระเบียบงานราชการ
 * @param {number} ioMode
 * @returns {string}
 */
export function getAttendanceIoLabel(ioMode) {
  return ATTENDANCE_IO_LABELS[ioMode] || `โหมด ${ioMode}`;
}

/**
 * จำแนกช่วงเวลาลงเวลาตามระเบียบเวลาราชการ (08:30 - 16:30 น.)
 *
 * ช่วงเวลา (HH:mm:ss):
 * - 05:00:00 – 08:30:59 -> 1: เข้าราชการเช้า (ปกติ)
 * - 08:31:00 – 12:00:59 -> 3: สาย / อาจลา (08:31-12:00)
 * - 12:01:00 – 16:29:59 -> 4: สแกนระหว่างวัน / ก่อน 16:30
 * - 16:30:00 – 23:59:59 -> 2: ออกราชการ (Check-Out)
 * - 00:00:00 – 04:59:59 -> 4: สแกนระหว่างวัน / ก่อน 16:30
 *
 * @param {string} timestamp e.g. "2026-11-12 08:30:00" or ISO or "08:30:00"
 * @returns {{ ioMode: 1 | 2 | 3 | 4, ioLabel: string }}
 */
export function classifyAttendanceByOfficialHours(timestamp) {
  if (!timestamp) {
    return { ioMode: 1, ioLabel: getAttendanceIoLabel(1) };
  }

  const str = String(timestamp).trim();
  const match = str.match(/(?:^|\s|T)(\d{2}):(\d{2})(?::(\d{2}))?/);

  if (!match) {
    return { ioMode: 1, ioLabel: getAttendanceIoLabel(1) };
  }

  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const second = match[3] !== undefined ? parseInt(match[3], 10) : 0;

  const pad = (n) => String(n).padStart(2, '0');
  const timeStr = `${pad(hour)}:${pad(minute)}:${pad(second)}`;

  let ioMode = 4;

  if (timeStr >= '05:00:00' && timeStr <= '08:30:59') {
    ioMode = 1;
  } else if (timeStr >= '08:31:00' && timeStr <= '12:00:59') {
    ioMode = 3;
  } else if (timeStr >= '16:30:00' && timeStr <= '23:59:59') {
    ioMode = 2;
  } else {
    // 00:00:00–04:59:59 หรือ 12:01:00–16:29:59
    ioMode = 4;
  }

  return {
    ioMode,
    ioLabel: getAttendanceIoLabel(ioMode),
  };
}

/**
 * คำนวณข้อมูลปีงบประมาณไทยและรายละเอียดปฏิทินจากวันที่ ISO หรือ Timestamp
 *
 * @param {string} isoDateOrTimestamp e.g. "2026-09-30" หรือ "2026-10-01 08:00:00"
 * @returns {{
 *   fiscalYear: number,
 *   calendarYearBE: number,
 *   month: number,
 *   day: number,
 *   monthShort: string,
 *   monthFull: string,
 *   fiscalMonthOrder: number,
 *   quarter: 1 | 2 | 3 | 4,
 *   yearMonth: string,
 *   monthYearLabel: string,
 *   fiscalLabel: string,
 *   dateShortBE: string,
 *   dateFiscalLabel: string
 * }}
 */
export function getThaiFiscalPeriod(isoDateOrTimestamp) {
  const str = String(isoDateOrTimestamp || '').trim();
  const match = str.match(/(\d{4})-(\d{2})-(\d{2})/);

  let year = 2026;
  let month = 10;
  let day = 1;

  if (match) {
    year = parseInt(match[1], 10);
    month = parseInt(match[2], 10);
    day = parseInt(match[3], 10);
  } else {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      year = d.getFullYear();
      month = d.getMonth() + 1;
      day = d.getDate();
    }
  }

  const calendarYearBE = year + 543;
  const fiscalYear = month >= 10 ? calendarYearBE + 1 : calendarYearBE;
  const monthShort = THAI_MONTHS_SHORT[month - 1] || '';
  const monthFull = THAI_MONTHS_FULL[month - 1] || '';

  // ต.ค. = 1, พ.ย. = 2, ..., ก.ย. = 12
  const fiscalMonthOrder = month >= 10 ? month - 9 : month + 3;
  const quarter = Math.ceil(fiscalMonthOrder / 3);

  const pad = (n) => String(n).padStart(2, '0');
  const yearMonth = `${year}-${pad(month)}`;
  const monthYearLabel = `${monthFull} ${calendarYearBE}`;
  const fiscalLabel = `ปีงบประมาณ ${fiscalYear}`;
  const dateShortBE = `${day} ${monthShort} ${calendarYearBE}`;
  const dateFiscalLabel = `${dateShortBE} • ปีงบ ${fiscalYear}`;

  return {
    fiscalYear,
    calendarYearBE,
    month,
    day,
    monthShort,
    monthFull,
    fiscalMonthOrder,
    quarter,
    yearMonth,
    monthYearLabel,
    fiscalLabel,
    dateShortBE,
    dateFiscalLabel,
  };
}

/**
 * คำนวณช่วงวันที่ (dateFrom - dateTo) สำหรับเดือนที่ระบุ ("YYYY-MM")
 * รองรับปีอธิกสุรทิน (Leap Year) เช่น กุมภาพันธ์ 2024 = 29 วัน, 2026 = 28 วัน
 *
 * @param {string} yearMonth e.g. "2026-02"
 * @returns {{ dateFrom: string, dateTo: string }}
 */
export function getMonthDateRange(yearMonth) {
  const match = String(yearMonth || '').match(/(\d{4})-(\d{2})/);
  if (!match) {
    return { dateFrom: '', dateTo: '' };
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const pad = (n) => String(n).padStart(2, '0');

  return {
    dateFrom: `${year}-${pad(month)}-01`,
    dateTo: `${year}-${pad(month)}-${pad(lastDay)}`,
  };
}

/**
 * คำนวณช่วงวันที่ (1 ต.ค. – 30 ก.ย.) ของปีงบประมาณไทยที่ระบุ (พ.ศ.)
 * e.g. 2570 -> { dateFrom: "2026-10-01", dateTo: "2027-09-30" }
 *
 * @param {number} fiscalYearBE e.g. 2570
 * @returns {{ dateFrom: string, dateTo: string }}
 */
export function getFiscalYearDateRange(fiscalYearBE) {
  const fy = Number(fiscalYearBE);
  const startCE = fy - 544;
  const endCE = fy - 543;

  return {
    dateFrom: `${startCE}-10-01`,
    dateTo: `${endCE}-09-30`,
  };
}

/**
 * จัดกลุ่มเดือน ("YYYY-MM") ตามปีงบประมาณไทย
 * เรียงปีงบประมาณจากมากไปน้อย (ล่าสุดก่อน)
 * และเรียงเดือนภายในปีงบประมาณตามลำดับปฏิทินงบประมาณ (ต.ค. -> ก.ย.)
 *
 * @param {string[]} yearMonths e.g. ["2026-09", "2026-10", "2026-11", "2025-10", "2026-01"]
 * @returns {Array<{
 *   fiscalYear: number,
 *   label: string,
 *   fiscalLabel: string,
 *   months: string[],
 *   dateFrom: string,
 *   dateTo: string
 * }>}
 */
export function groupMonthsByFiscalYear(yearMonths) {
  if (!Array.isArray(yearMonths) || yearMonths.length === 0) {
    return [];
  }

  const groupsMap = new Map();

  for (const ym of yearMonths) {
    const match = String(ym).match(/(\d{4})-(\d{2})/);
    if (!match) continue;

    const period = getThaiFiscalPeriod(`${match[1]}-${match[2]}-01`);
    const fy = period.fiscalYear;

    if (!groupsMap.has(fy)) {
      groupsMap.set(fy, {
        fiscalYear: fy,
        label: `ปีงบประมาณ ${fy}`,
        fiscalLabel: `ปีงบประมาณ ${fy}`,
        months: new Set(),
      });
    }

    groupsMap.get(fy).months.add(period.yearMonth);
  }

  const result = [];
  const sortedYears = Array.from(groupsMap.keys()).sort((a, b) => b - a);

  for (const fy of sortedYears) {
    const group = groupsMap.get(fy);
    const monthsArray = Array.from(group.months);

    // เรียงเดือนตาม THAI_FISCAL_MONTH_ORDER (10, 11, 12, 1, 2, ..., 9)
    monthsArray.sort((a, b) => {
      const ma = parseInt(a.slice(5, 7), 10);
      const mb = parseInt(b.slice(5, 7), 10);
      const orderA = THAI_FISCAL_MONTH_ORDER.indexOf(ma);
      const orderB = THAI_FISCAL_MONTH_ORDER.indexOf(mb);
      return orderA - orderB;
    });

    const range = getFiscalYearDateRange(fy);

    result.push({
      fiscalYear: fy,
      label: group.label,
      fiscalLabel: group.fiscalLabel,
      months: monthsArray,
      dateFrom: range.dateFrom,
      dateTo: range.dateTo,
    });
  }

  return result;
}

/**
 * ดึงรายการเดือน ("YYYY-MM") ที่มีข้อมูล จากรายการ logs หรือวันที่ใดๆ
 * คืนค่า Array ของ "YYYY-MM" ที่ไม่ซ้ำกัน และเรียงจากล่าสุดไปอดีต (descending)
 *
 * @param {Array<string | { scanTimestamp?: string, scan_timestamp?: string, timestamp?: string, originalTimestamp?: string, original_timestamp?: string, date?: string }>} logsOrDates
 * @returns {string[]}
 */
export function collectAvailableMonths(logsOrDates) {
  if (!Array.isArray(logsOrDates) || logsOrDates.length === 0) {
    return [];
  }

  const monthsSet = new Set();

  for (const item of logsOrDates) {
    if (!item) continue;
    let raw = '';
    if (typeof item === 'string') {
      raw = item;
    } else if (typeof item === 'object') {
      raw =
        item.scanTimestamp ||
        item.scan_timestamp ||
        item.timestamp ||
        item.originalTimestamp ||
        item.original_timestamp ||
        item.date ||
        '';
    }

    const match = String(raw).match(/(\d{4}-\d{2})/);
    if (match) {
      monthsSet.add(match[1]);
    }
  }

  return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
}
