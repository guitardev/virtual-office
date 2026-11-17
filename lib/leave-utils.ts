export type LeaveType =
  | "sick_leave"
  | "personal_leave"
  | "maternity_leave"
  | "vacation_leave";

export type LeaveFormKind = "general" | "vacation";

export type LeaveStatus =
  | "pending_verifier"
  | "pending_supervisor"
  | "pending_approver"
  | "approved"
  | "rejected"
  | "cancelled";

export interface LeaveRequestItem {
  id: string;
  requestNo: string;
  leaveType: LeaveType;
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
  attachmentUrl: string | null;
  attachmentName: string | null;
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
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    dailyNoteType: "sick_leave",
  },
  personal_leave: {
    label: "ลากิจส่วนตัว",
    shortLabel: "กิจส่วนตัว",
    formKind: "general",
    defaultSubject: "ขออนุญาตลากิจส่วนตัว",
    icon: "📋",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    dailyNoteType: "personal_leave",
  },
  maternity_leave: {
    label: "ลาคลอดบุตร",
    shortLabel: "คลอดบุตร",
    formKind: "general",
    defaultSubject: "ขออนุญาตลาคลอดบุตร",
    icon: "👶",
    badgeClass: "bg-pink-50 text-pink-700 border-pink-200",
    dailyNoteType: "other",
  },
  vacation_leave: {
    label: "ลาพักผ่อน",
    shortLabel: "พักผ่อน",
    formKind: "vacation",
    defaultSubject: "ขอลาพักผ่อน",
    icon: "🌴",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dailyNoteType: "vacation_leave",
  },
};

export const LEAVE_STATUS_META: Record<
  LeaveStatus,
  { label: string; badgeClass: string; stepIndex: number }
> = {
  pending_verifier: {
    label: "รอผู้ตรวจสอบสถิติ",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    stepIndex: 1,
  },
  pending_supervisor: {
    label: "รอความเห็นผู้บังคับบัญชา",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    stepIndex: 2,
  },
  pending_approver: {
    label: "รอคำสั่งอนุญาต",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    stepIndex: 3,
  },
  approved: {
    label: "อนุญาตแล้ว",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    stepIndex: 4,
  },
  rejected: {
    label: "ไม่อนุญาต",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    stepIndex: 4,
  },
  cancelled: {
    label: "ยกเลิกแล้ว",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
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
    // Oct..Dec -> 1 Oct (year) to 31 Mar (year+1)
    return {
      label: `รอบที่ 1 (1 ต.ค. ${year + 543 - 2500} – 31 มี.ค. ${year + 544 - 2500})`,
      startDate: `${year}-10-01`,
      endDate: `${year + 1}-03-31`,
    };
  }
  if (month <= 2) {
    // Jan..Mar -> 1 Oct (year-1) to 31 Mar (year)
    return {
      label: `รอบที่ 1 (1 ต.ค. ${year + 542 - 2500} – 31 มี.ค. ${year + 543 - 2500})`,
      startDate: `${year - 1}-10-01`,
      endDate: `${year}-03-31`,
    };
  }
  // Apr..Sep -> 1 Apr (year) to 30 Sep (year)
  return {
    label: `รอบที่ 2 (1 เม.ย. ${year + 543 - 2500} – 30 ก.ย. ${year + 543 - 2500})`,
    startDate: `${year}-04-01`,
    endDate: `${year}-09-30`,
  };
}

/** คืนรายการวันที่ทำงาน (จันทร์-ศุกร์) ในช่วง startDate..endDate */
export function getWorkingDatesBetween(startDate: string, endDate: string): string[] {
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
    if (day !== 0 && day !== 6) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, "0");
      const d = String(cursor.getDate()).padStart(2, "0");
      dates.push(`${y}-${m}-${d}`);
    }
    cursor.setDate(cursor.getDate() + 1);
    guard += 1;
  }
  return dates;
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
