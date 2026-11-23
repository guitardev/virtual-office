import { DEFAULT_THAI_HOLIDAYS } from "./thai-holidays";

export type LeaveType =
  | "sick_leave"
  | "personal_leave"
  | "maternity_leave"
  | "vacation_leave"
  | "cancel_leave";

export type LeaveFormKind = "general" | "vacation" | "cancel";

export type LeaveDayPeriod = "full" | "morning" | "afternoon";

export type LeaveStatus =
  | "pending_verifier"
  | "pending_supervisor"
  | "pending_approver"
  | "approved"
  | "rejected"
  | "returned"
  | "cancelled";

export interface ExcludedHolidayInfo {
  date: string;
  name: string;
}

export interface LeaveRequestItem {
  id: string;
  requestNo: string;
  leaveType: LeaveType;
  leaveDayPeriod: LeaveDayPeriod;
  writtenAt: string;
  writtenDate: string;
  subject: string;
  toRecipient: string;
  applicantUserId: string;
  applicantName: string;
  applicantPosition: string;
  applicantDivision: string;
  reason: string;
  startDate: string;
  endDate: string;
  totalWorkingDays: number;
  cancelledDays: number;
  cancelTargetLeaveId: string | null;
  cancelTargetRequestNo: string | null;
  cancelTargetLeaveType: string | null;
  cancelTargetStartDate: string | null;
  cancelTargetEndDate: string | null;
  cancelTargetDays: number | null;
  lastLeaveType: string | null;
  lastLeaveStartDate: string | null;
  lastLeaveEndDate: string | null;
  lastLeaveDays: number | null;
  contactInfo: string;
  contactPhone: string;
  vacationAccumulatedDays: number;
  vacationAnnualDays: number;
  actingPersonUserId: string | null;
  actingPersonName: string;
  actingPersonPosition: string;
  fiscalYear: number;
  prevSickDays: number;
  prevPersonalDays: number;
  prevMaternityDays: number;
  prevVacationDays: number;
  status: LeaveStatus;
  verifierUserId: string | null;
  verifierName: string | null;
  verifierPosition: string | null;
  verifierNote: string | null;
  verifiedAt: string | null;
  supervisorUserId: string | null;
  supervisorName: string | null;
  supervisorPosition: string | null;
  supervisorComment: string | null;
  supervisorReviewedAt: string | null;
  approverUserId: string | null;
  approverName: string | null;
  approverPosition: string | null;
  orderDecision: "approved" | "rejected" | null;
  orderComment: string | null;
  orderedAt: string | null;
  applicantSignature: string | null;
  actingPersonSignature: string | null;
  verifierSignature: string | null;
  supervisorSignature: string | null;
  approverSignature: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentStorage: string | null;
  excludedHolidays: ExcludedHolidayInfo[];
  returnedByName: string | null;
  returnedNote: string | null;
  returnedAt: string | null;
  syncedToAttendance: boolean;
  syncedAt: string | null;
  syncNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalanceItem {
  id?: string;
  userId: string;
  fiscalYear: number;
  sickDaysCarried: number;
  personalDaysCarried: number;
  maternityDaysCarried: number;
  vacationAccumulatedDays: number;
  vacationAnnualDays: number;
  vacationDaysCarried: number;
  updatedBy?: string | null;
  updatedAt?: string;
}

export const SOLE_LEAVE_APPROVER = {
  userId: "syno_มะลิวัน",
  name: "นางสาวมะลิวัน สิทธิโยธี",
  position: "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
} as const;

export const DEFAULT_LEAVE_ORDER_OPERATOR = {
  userId: "syno_ยุทธนา",
  name: "นายยุทธนา เจนจบ",
  position: "เจ้าพนักงานธุรการปฏิบัติงาน",
} as const;

export const LEAVE_DAY_PERIOD_LABELS: Record<LeaveDayPeriod, string> = {
  full: "เต็มวัน",
  morning: "ครึ่งเช้า (08:30–12:00 น.)",
  afternoon: "ครึ่งบ่าย (13:00–16:30 น.)",
};

export const LEAVE_DAY_PERIOD_SHORT: Record<LeaveDayPeriod, string> = {
  full: "เต็มวัน",
  morning: "ครึ่งเช้า",
  afternoon: "ครึ่งบ่าย",
};

export const LEAVE_TYPE_META: Record<
  LeaveType,
  {
    label: string;
    shortLabel: string;
    formKind: LeaveFormKind;
    defaultSubject: string;
    icon: string;
    badgeClass: string;
    dailyNoteType: "sick_leave" | "personal_leave" | "vacation_leave" | "other";
  }
> = {
  sick_leave: {
    label: "ลาป่วย",
    shortLabel: "ป่วย",
    formKind: "general",
    defaultSubject: "ขออนุญาตลาป่วย",
    icon: "🤒",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60",
    dailyNoteType: "sick_leave",
  },
  personal_leave: {
    label: "ลากิจส่วนตัว",
    shortLabel: "กิจส่วนตัว",
    formKind: "general",
    defaultSubject: "ขออนุญาตลากิจส่วนตัว",
    icon: "📋",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60",
    dailyNoteType: "personal_leave",
  },
  maternity_leave: {
    label: "ลาคลอดบุตร",
    shortLabel: "คลอดบุตร",
    formKind: "general",
    defaultSubject: "ขออนุญาตลาคลอดบุตร",
    icon: "👶",
    badgeClass: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/50 dark:text-pink-300 dark:border-pink-800/60",
    dailyNoteType: "other",
  },
  vacation_leave: {
    label: "ลาพักผ่อน",
    shortLabel: "พักผ่อน",
    formKind: "vacation",
    defaultSubject: "ขอลาพักผ่อน",
    icon: "🌴",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60",
    dailyNoteType: "vacation_leave",
  },
  cancel_leave: {
    label: "ขอยกเลิกวันลา",
    shortLabel: "ยกเลิกวันลา",
    formKind: "cancel",
    defaultSubject: "ขอยกเลิกวันลา",
    icon: "↩️",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800/60",
    dailyNoteType: "other",
  },
};

export const LEAVE_STATUS_META: Record<
  LeaveStatus,
  { label: string; badgeClass: string; stepIndex: number }
> = {
  pending_verifier: {
    label: "รอผู้ตรวจสอบสถิติ",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60",
    stepIndex: 1,
  },
  pending_supervisor: {
    label: "รอหัวหน้ากลุ่ม/ฝ่ายลงความเห็น",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60",
    stepIndex: 2,
  },
  pending_approver: {
    label: "รอเสนอแฟ้ม พมจ. / ปรับสถานะ",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800/60",
    stepIndex: 3,
  },
  approved: {
    label: "อนุญาตแล้ว",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60",
    stepIndex: 4,
  },
  rejected: {
    label: "ไม่อนุญาต",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60",
    stepIndex: 4,
  },
  returned: {
    label: "ตีกลับให้แก้ไข",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-700/70",
    stepIndex: 1,
  },
  cancelled: {
    label: "ยกเลิกแล้ว",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    stepIndex: 0,
  },
};

export const THAI_MONTHS = [
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

export function getTodayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** ปีงบประมาณไทย (พ.ศ.): 1 ต.ค. - 30 ก.ย. เช่น ต.ค. 2569 (2026) = ปีงบประมาณ 2570 */
export function getFiscalYear(dateStr?: string): number {
  const base = dateStr ? new Date(`${dateStr.slice(0, 10)}T00:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) {
    const now = new Date();
    return now.getMonth() >= 9 ? now.getFullYear() + 544 : now.getFullYear() + 543;
  }
  const month = base.getMonth(); // 0..11, 9 = Oct
  return month >= 9 ? base.getFullYear() + 544 : base.getFullYear() + 543;
}

/** รอบ 6 เดือนสำหรับประเมินเลื่อนขั้นเงินเดือน: รอบ 1 (1 ต.ค.–31 มี.ค.), รอบ 2 (1 เม.ย.–30 ก.ย.) */
export function getHalfYearRange(dateStr?: string): {
  label: string;
  startDate: string;
  endDate: string;
} {
  const base = dateStr ? new Date(`${dateStr.slice(0, 10)}T00:00:00`) : new Date();
  const year = base.getFullYear();
  const month = base.getMonth(); // 0..11
  if (month >= 9) {
    return {
      label: `รอบที่ 1 (1 ต.ค. ${year + 543 - 2500} – 31 มี.ค. ${year + 544 - 2500})`,
      startDate: `${year}-10-01`,
      endDate: `${year + 1}-03-31`,
    };
  }
  if (month <= 2) {
    return {
      label: `รอบที่ 1 (1 ต.ค. ${year + 542 - 2500} – 31 มี.ค. ${year + 543 - 2500})`,
      startDate: `${year - 1}-10-01`,
      endDate: `${year}-03-31`,
    };
  }
  return {
    label: `รอบที่ 2 (1 เม.ย. ${year + 543 - 2500} – 30 ก.ย. ${year + 543 - 2500})`,
    startDate: `${year}-04-01`,
    endDate: `${year}-09-30`,
  };
}

/** จำนวนวันลาสุทธิหลังหักวันที่ขอยกเลิกวันลาแล้ว */
export function getEffectiveLeaveDays(
  item: Pick<LeaveRequestItem, "totalWorkingDays" | "cancelledDays" | "leaveType">
): number {
  if (item.leaveType === "cancel_leave") return 0;
  return Math.max(
    0,
    Math.round((Number(item.totalWorkingDays || 0) - Number(item.cancelledDays || 0)) * 10) / 10
  );
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * คืนรายการวันที่ทำงาน (จันทร์-ศุกร์ และไม่ตรงกับวันหยุดราชการไทย) ในช่วง startDate..endDate
 */
export function getWorkingDatesBetween(
  startDate: string,
  endDate: string,
  holidayMap: Record<string, string> = DEFAULT_THAI_HOLIDAYS
): string[] {
  if (!startDate || !endDate) return [];
  const start = new Date(`${startDate.slice(0, 10)}T00:00:00`);
  const end = new Date(`${endDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return [];
  }
  const dates: string[] = [];
  const cursor = new Date(start);
  let guard = 0;
  while (cursor <= end && guard < 366) {
    const day = cursor.getDay();
    const iso = toIsoDate(cursor);
    if (day !== 0 && day !== 6 && !holidayMap[iso]) {
      dates.push(iso);
    }
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return dates;
}

export interface LeaveCalculationResult {
  workingDates: string[];
  allCalendarDays: number;
  totalWorkingDays: number;
  skippedWeekends: number;
  skippedHolidays: ExcludedHolidayInfo[];
  isCalendarCount: boolean;
}

/**
 * คำนวณวันลาอย่างละเอียดตามระเบียบราชการ:
 * - ลาคลอดบุตร นับวันต่อเนื่องรวมวันหยุด (ปฏิทิน)
 * - ลาป่วย/กิจ/พักผ่อน/ยกเลิกวันลา ตัดเสาร์-อาทิตย์ และวันหยุดราชการไทย
 * - ลาวันเดียวแบบครึ่งเช้า/ครึ่งบ่าย คิดเป็น 0.5 วันทำการ
 */
export function calculateLeavePeriodDetails({
  startDate,
  endDate,
  leaveType,
  leaveDayPeriod = "full",
  holidayMap = DEFAULT_THAI_HOLIDAYS,
}: {
  startDate: string;
  endDate: string;
  leaveType: LeaveType;
  leaveDayPeriod?: LeaveDayPeriod;
  holidayMap?: Record<string, string>;
}): LeaveCalculationResult {
  if (!startDate || !endDate) {
    return {
      workingDates: [],
      allCalendarDays: 0,
      totalWorkingDays: 0,
      skippedWeekends: 0,
      skippedHolidays: [],
      isCalendarCount: false,
    };
  }

  const start = new Date(`${startDate.slice(0, 10)}T00:00:00`);
  const end = new Date(`${endDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return {
      workingDates: [],
      allCalendarDays: 0,
      totalWorkingDays: 0,
      skippedWeekends: 0,
      skippedHolidays: [],
      isCalendarCount: false,
    };
  }

  const workingDates: string[] = [];
  const skippedHolidays: ExcludedHolidayInfo[] = [];
  let skippedWeekends = 0;
  let allCalendarDays = 0;

  const cursor = new Date(start);
  let guard = 0;
  while (cursor <= end && guard < 366) {
    allCalendarDays += 1;
    const day = cursor.getDay();
    const iso = toIsoDate(cursor);
    if (day === 0 || day === 6) {
      skippedWeekends += 1;
    } else if (holidayMap[iso]) {
      skippedHolidays.push({ date: iso, name: holidayMap[iso] });
    } else {
      workingDates.push(iso);
    }
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }

  if (leaveType === "maternity_leave") {
    return {
      workingDates,
      allCalendarDays,
      totalWorkingDays: allCalendarDays,
      skippedWeekends,
      skippedHolidays,
      isCalendarCount: true,
    };
  }

  const isSingleDate = startDate.slice(0, 10) === endDate.slice(0, 10);
  if (isSingleDate && (leaveDayPeriod === "morning" || leaveDayPeriod === "afternoon")) {
    return {
      workingDates,
      allCalendarDays,
      totalWorkingDays: workingDates.length === 1 ? 0.5 : 0,
      skippedWeekends,
      skippedHolidays,
      isCalendarCount: false,
    };
  }

  return {
    workingDates,
    allCalendarDays,
    totalWorkingDays: workingDates.length,
    skippedWeekends,
    skippedHolidays,
    isCalendarCount: false,
  };
}

/**
 * ตรวจสอบการยื่นวันลาซ้อนทับ (Overlap) กับใบลาที่ยังมีผลอยู่ของผู้ขอลาคนเดียวกัน
 * - อนุญาตกรณีวันเดียวกันแต่คนละช่วงเวลา (ครึ่งเช้า กับ ครึ่งบ่าย)
 * - ละเว้นใบลาที่ถูกยกเลิก (cancelled), ไม่อนุญาต (rejected), หรือใบขอยกเลิกวันลา (cancel_leave)
 */
export function detectLeaveOverlap({
  candidateStart,
  candidateEnd,
  candidatePeriod = "full",
  existingRequests,
  excludeLeaveId,
}: {
  candidateStart: string;
  candidateEnd: string;
  candidatePeriod?: LeaveDayPeriod;
  existingRequests: LeaveRequestItem[];
  excludeLeaveId?: string;
}): { hasOverlap: boolean; conflicts: LeaveRequestItem[] } {
  const s = candidateStart?.slice(0, 10);
  const e = candidateEnd?.slice(0, 10);
  if (!s || !e || e < s) {
    return { hasOverlap: false, conflicts: [] };
  }

  const blockingStatuses = new Set<LeaveStatus>([
    "pending_verifier",
    "pending_supervisor",
    "pending_approver",
    "returned",
    "approved",
  ]);

  const isCandidateSingleDay = s === e;
  const conflicts: LeaveRequestItem[] = [];

  for (const r of existingRequests) {
    if (excludeLeaveId && r.id === excludeLeaveId) continue;
    if (r.leaveType === "cancel_leave") continue;
    if (!blockingStatuses.has(r.status)) continue;
    if (getEffectiveLeaveDays(r) <= 0) continue;

    const rs = String(r.startDate || "").slice(0, 10);
    const re = String(r.endDate || "").slice(0, 10);
    if (!rs || !re) continue;

    if (rs <= e && re >= s) {
      const isExistingSingleDay = rs === re;
      const existingPeriod = r.leaveDayPeriod || "full";
      if (
        isCandidateSingleDay &&
        isExistingSingleDay &&
        rs === s &&
        ((candidatePeriod === "morning" && existingPeriod === "afternoon") ||
          (candidatePeriod === "afternoon" && existingPeriod === "morning"))
      ) {
        continue;
      }
      conflicts.push(r);
    }
  }

  return {
    hasOverlap: conflicts.length > 0,
    conflicts,
  };
}

/**
 * นับวันลาเฉพาะส่วนที่ตกอยู่ในช่วงรอบประเมิน 6 เดือน (แก้ปัญหาใบลาคร่อมรอบ 31 มี.ค. / 30 ก.ย.)
 */
export function countWorkingDaysInRange(
  leave: LeaveRequestItem,
  rangeStart: string,
  rangeEnd: string,
  holidayMap: Record<string, string> = DEFAULT_THAI_HOLIDAYS
): number {
  const effective = getEffectiveLeaveDays(leave);
  if (effective <= 0) return 0;

  const ls = String(leave.startDate || "").slice(0, 10);
  const le = String(leave.endDate || "").slice(0, 10);
  if (!ls || !le || le < rangeStart || ls > rangeEnd) return 0;

  // หากอยู่ภายในช่วงทั้งหมด คืนยอดสุทธิทันที (รองรับครึ่งวันและหักวันยกเลิกแล้ว)
  if (ls >= rangeStart && le <= rangeEnd) {
    return effective;
  }

  const overlapStart = ls > rangeStart ? ls : rangeStart;
  const overlapEnd = le < rangeEnd ? le : rangeEnd;
  const totalInRange = getWorkingDatesBetween(overlapStart, overlapEnd, holidayMap).length;
  return Math.min(effective, totalInRange);
}

/**
 * แปลง path หรือ URL ของไฟล์แนบใบลา (เช่น ใบรับรองแพทย์บน NAS หรือ R2/Supabase) ให้เปิดดูได้
 */
export function resolveLeaveAttachmentUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/api/") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }
  return `/api/nas/download?path=${encodeURIComponent(trimmed)}&mode=open`;
}

export function formatThaiDateParts(dateStr?: string | null): {
  day: string;
  month: string;
  monthShort: string;
  yearBE: string;
  yearBEShort: string;
} {
  if (!dateStr) {
    return { day: "", month: "", monthShort: "", yearBE: "", yearBEShort: "" };
  }
  const clean = dateStr.slice(0, 10);
  const [yStr, mStr, dStr] = clean.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (!y || !m || !d) {
    return { day: "", month: "", monthShort: "", yearBE: "", yearBEShort: "" };
  }
  const yearBE = String(y + 543);
  return {
    day: String(d),
    month: THAI_MONTHS[m - 1] || "",
    monthShort: THAI_MONTHS_SHORT[m - 1] || "",
    yearBE,
    yearBEShort: yearBE.slice(-2),
  };
}

export function formatThaiDateFull(dateStr?: string | null): string {
  const p = formatThaiDateParts(dateStr);
  if (!p.day) return "-";
  return `${p.day} ${p.month} ${p.yearBE}`;
}

export function formatThaiDateShort(dateStr?: string | null): string {
  const p = formatThaiDateParts(dateStr);
  if (!p.day) return "-";
  return `${p.day} ${p.monthShort} ${p.yearBE}`;
}

export function formatThaiDateSlash(dateStr?: string | null): string {
  const p = formatThaiDateParts(dateStr);
  if (!p.day) return "........ / ........ / ........";
  return `${p.day} / ${p.monthShort} / ${p.yearBE}`;
}

export interface LastLeaveNormalizationResult {
  lastLeaveType: string | null;
  lastLeaveStartDate: string | null;
  lastLeaveEndDate: string | null;
  lastLeaveDays: number | null;
  calculatedDays: number | null;
  error: string | null;
}

/**
 * หาใบลาทั่วไป (ป่วย/กิจ/คลอด) ที่ได้รับอนุญาตแล้วและมีช่วงวันที่ลาล่าสุดตามปฏิทินจริง (endDate -> startDate)
 */
export function findLatestApprovedGeneralLeave(
  requests: LeaveRequestItem[]
): LeaveRequestItem | null {
  const candidates = requests.filter(
    (r) =>
      r.status === "approved" &&
      (r.leaveType === "sick_leave" ||
        r.leaveType === "personal_leave" ||
        r.leaveType === "maternity_leave") &&
      getEffectiveLeaveDays(r) > 0
  );
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    const endCmp = String(b.endDate || "").localeCompare(String(a.endDate || ""));
    if (endCmp !== 0) return endCmp;
    const startCmp = String(b.startDate || "").localeCompare(String(a.startDate || ""));
    if (startCmp !== 0) return startCmp;
    return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
  });
  return candidates[0];
}

/**
 * คำนวณและตรวจสอบความถูกต้องของข้อมูล "ประวัติการลาครั้งสุดท้าย"
 * - ถ้าไม่กรอกประเภทและวันที่ จะคืนค่า null ทั้งหมด (ไม่บันทึก 0.0)
 * - ถ้ากรอกช่วงวันที่ จะคำนวณวันทำการจริง (หักเสาร์-อาทิตย์และวันหยุดราชการไทยสำหรับป่วย/กิจ, นับวันปฏิทินสำหรับคลอด)
 * - ป้องกันวันสิ้นสุดน้อยกว่าวันเริ่มต้น และป้องกันกรอกจำนวนวันเกินวันทำการจริงของช่วงวันที่นั้น (ยังคงอนุญาต 0.5 สำหรับวันเดียว)
 */
export function normalizeAndValidateLastLeave({
  lastLeaveType,
  lastLeaveStartDate,
  lastLeaveEndDate,
  lastLeaveDays,
  holidayMap = DEFAULT_THAI_HOLIDAYS,
}: {
  lastLeaveType?: string | null;
  lastLeaveStartDate?: string | null;
  lastLeaveEndDate?: string | null;
  lastLeaveDays?: number | string | null;
  holidayMap?: Record<string, string>;
}): LastLeaveNormalizationResult {
  const type = String(lastLeaveType || "").trim() || null;
  const start = String(lastLeaveStartDate || "").trim().slice(0, 10) || null;
  const end = String(lastLeaveEndDate || "").trim().slice(0, 10) || null;

  const rawDaysStr =
    lastLeaveDays !== null && lastLeaveDays !== undefined
      ? String(lastLeaveDays).trim()
      : "";
  const parsedDays =
    rawDaysStr !== "" && !Number.isNaN(Number(rawDaysStr))
      ? Math.round(Number(rawDaysStr) * 10) / 10
      : null;

  if (!type && !start && !end) {
    return {
      lastLeaveType: null,
      lastLeaveStartDate: null,
      lastLeaveEndDate: null,
      lastLeaveDays: null,
      calculatedDays: null,
      error: null,
    };
  }

  if ((start && !end) || (!start && end)) {
    return {
      lastLeaveType: type,
      lastLeaveStartDate: start,
      lastLeaveEndDate: end,
      lastLeaveDays: parsedDays,
      calculatedDays: null,
      error: "กรุณาระบุทั้งวันที่เริ่มต้นและวันที่สิ้นสุดของการลาครั้งสุดท้ายให้ครบถ้วน",
    };
  }

  if (start && end) {
    if (end < start) {
      return {
        lastLeaveType: type,
        lastLeaveStartDate: start,
        lastLeaveEndDate: end,
        lastLeaveDays: parsedDays,
        calculatedDays: null,
        error: "วันที่สิ้นสุดการลาครั้งสุดท้ายต้องไม่น้อยกว่าวันที่เริ่มต้น",
      };
    }

    const calcType: LeaveType =
      type === "maternity_leave" ? "maternity_leave" : "sick_leave";
    const calc = calculateLeavePeriodDetails({
      startDate: start,
      endDate: end,
      leaveType: calcType,
      holidayMap,
    });

    if (calc.totalWorkingDays <= 0) {
      return {
        lastLeaveType: type,
        lastLeaveStartDate: start,
        lastLeaveEndDate: end,
        lastLeaveDays: null,
        calculatedDays: 0,
        error: "ช่วงวันที่ลาครั้งสุดท้ายที่ระบุตรงกับวันหยุดทั้งหมด ไม่มีวันทำการ",
      };
    }

    if (parsedDays === null) {
      return {
        lastLeaveType: type,
        lastLeaveStartDate: start,
        lastLeaveEndDate: end,
        lastLeaveDays: calc.totalWorkingDays,
        calculatedDays: calc.totalWorkingDays,
        error: null,
      };
    }

    if (parsedDays <= 0) {
      return {
        lastLeaveType: type,
        lastLeaveStartDate: start,
        lastLeaveEndDate: end,
        lastLeaveDays: parsedDays,
        calculatedDays: calc.totalWorkingDays,
        error: "จำนวนวันลาครั้งสุดท้ายต้องมากกว่า 0 วัน",
      };
    }

    if (parsedDays > calc.totalWorkingDays) {
      return {
        lastLeaveType: type,
        lastLeaveStartDate: start,
        lastLeaveEndDate: end,
        lastLeaveDays: parsedDays,
        calculatedDays: calc.totalWorkingDays,
        error: `จำนวนวันลาครั้งสุดท้าย (${parsedDays} วัน) มากกว่าจำนวนวันทำการจริงในช่วงวันที่ที่ระบุ (${calc.totalWorkingDays} วัน)`,
      };
    }

    return {
      lastLeaveType: type,
      lastLeaveStartDate: start,
      lastLeaveEndDate: end,
      lastLeaveDays: parsedDays,
      calculatedDays: calc.totalWorkingDays,
      error: null,
    };
  }

  // มีเฉพาะประเภทการลาโดยไม่ได้ระบุวันที่
  if (parsedDays !== null && parsedDays < 0) {
    return {
      lastLeaveType: type,
      lastLeaveStartDate: null,
      lastLeaveEndDate: null,
      lastLeaveDays: parsedDays,
      calculatedDays: null,
      error: "จำนวนวันลาครั้งสุดท้ายต้องไม่ติดลบ",
    };
  }

  return {
    lastLeaveType: type,
    lastLeaveStartDate: null,
    lastLeaveEndDate: null,
    lastLeaveDays: parsedDays && parsedDays > 0 ? parsedDays : null,
    calculatedDays: null,
    error: null,
  };
}
