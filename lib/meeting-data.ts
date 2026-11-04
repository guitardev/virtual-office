import { MeetingCategory, MeetingType, MeetingItem, MeetingRoomMaster } from "./types";
import { getMeetingDateRange } from "./calendar";

export interface MeetingPresetTemplate {
  id: string;
  name: string;
  title: string;
  category: MeetingCategory;
  type: MeetingType;
  location: string;
  meetingLink?: string;
  defaultDurationHours: number;
  description: string;
}

export const MEETING_CATEGORY_CONFIG: Record<
  MeetingCategory,
  { label: string; icon: string; bg: string; text: string; border: string }
> = {
  general: {
    label: "ประชุมทั่วไป",
    icon: "📋",
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
  },
  division: {
    label: "ประชุมกลุ่มงาน/ฝ่าย",
    icon: "🏢",
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
  },
  management: {
    label: "ประชุมผู้บริหาร",
    icon: "👔",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
  },
  urgent: {
    label: "ประชุมด่วน/เฉพาะกิจ",
    icon: "🚨",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
  },
  external: {
    label: "ประชุมภายนอก/เครือข่าย",
    icon: "🌐",
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
  },
};

export const MEETING_TYPE_CONFIG: Record<
  MeetingType,
  { label: string; icon: string; bg: string; text: string; border: string }
> = {
  online: {
    label: "ออนไลน์ (Google Meet / Teams)",
    icon: "🌐",
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
  },
  onsite: {
    label: "ออนไซต์ (ห้องประชุมใน สนง.)",
    icon: "🏢",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  hybrid: {
    label: "ไฮบริด (ออนไซต์ + ออนไลน์)",
    icon: "🔄",
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
  },
};

export const DEFAULT_ROOMS: MeetingRoomMaster[] = [
  {
    id: "room_1",
    name: "ห้องประชุม 1 (ศาลากลางจังหวัด ชั้น 2)",
    building: "ศาลากลางจังหวัดกำแพงเพชร (อาคารใหม่ ชั้น 2)",
    capacity: 40,
    equipment: ["จอโปรเจกเตอร์ 4K", "ไมโครโฟนไร้สาย 4 ตัว", "เครื่องเสียงห้องประชุม", "กล้อง Hybrid PTZ (Zoom/Meet)", "WiFi ความเร็วสูง"],
    status: "available",
    notes: "ห้องประชุมใหญ่สำหรับประชุมข้าราชการประจำเดือนและคณะทำงานจังหวัด",
  },
  {
    id: "room_2",
    name: "ห้องประชุม 2 (ศาลากลางจังหวัด ชั้น 4)",
    building: "ศาลากลางจังหวัดกำแพงเพชร (อาคารใหม่ ชั้น 4)",
    capacity: 25,
    equipment: ["Smart TV 75 นิ้ว", "Soundbar + ไมค์คอนเฟอเรนซ์", "กล้อง Web Conference", "ไวท์บอร์ด"],
    status: "available",
    notes: "ห้องประชุมขนาดกลาง เหมาะสำหรับการประชุมพิจารณาโครงการและติดตามงาน",
  },
  {
    id: "room_3",
    name: "ห้องประชุมกลุ่มนโยบายและวิชาการ",
    building: "สำนักงาน พมจ. กำแพงเพชร (ห้องกลุ่มนโยบาย)",
    capacity: 12,
    equipment: ["Smart TV 55 นิ้ว", "ลำโพงบลูทูธพกพา", "สาย HDMI / Wireless Cast"],
    status: "available",
    notes: "การประชุมภายในกลุ่มงานและวิเคราะห์ข้อมูลสถิติ",
  },
  {
    id: "room_4",
    name: "ห้องประชุมกลุ่มการพัฒนาสังคมและสวัสดิการ",
    building: "สำนักงาน พมจ. กำแพงเพชร (ห้องกลุ่มสวัสดิการ)",
    capacity: 15,
    equipment: ["จอ Monitor 65 นิ้ว", "ไมค์ห้องประชุม", "แท่นบรรยาย"],
    status: "available",
    notes: "ประชุมทีมช่วยเหลือผู้ประสบปัญหาทางสังคมและเครือข่าย พม.",
  },
  {
    id: "room_5",
    name: "ห้องประชุมฝ่ายบริหารทั่วไป",
    building: "สำนักงาน พมจ. กำแพงเพชร (ห้องฝ่ายบริหาร)",
    capacity: 10,
    equipment: ["จอ Monitor 43 นิ้ว", "สายเชื่อมต่อสารบรรณและบัญชี"],
    status: "available",
    notes: "ประชุมการเงิน พัสดุ และงานธุรการทั่วไป",
  },
  {
    id: "room_6",
    name: "ห้องประชุม War Room ศูนย์ปฏิบัติการ พมจ.",
    building: "สำนักงาน พมจ. กำแพงเพชร (War Room 1300)",
    capacity: 8,
    equipment: ["Multi-Screen Video Wall", "ระบบ Hotline 1300 บูรณาการ", "ไมค์ตั้งโต๊ะ", "บันทึกเสียงอัตโนมัติ"],
    status: "available",
    notes: "ศูนย์ประสานงานสถานการณ์ฉุกเฉินและช่วยเหลือรายกรณีเร่งด่วน",
  },
];

export const ROOM_PRESETS = DEFAULT_ROOMS.map((r) => r.name);

export const STORAGE_MEETING_ROOMS_KEY = "smartmso_meeting_rooms_master";

/**
 * Return default meeting rooms in memory.
 * Proactively purges legacy localStorage key to avoid display inconsistencies or resurrected deleted rooms.
 */
export function loadStoredRooms(): MeetingRoomMaster[] {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_MEETING_ROOMS_KEY);
    } catch {}
  }
  return DEFAULT_ROOMS;
}

/**
 * Deprecated: Meeting rooms are now centrally stored in Supabase with in-memory caching.
 * Ensures localStorage does not hold stale meeting rooms.
 */
export function saveStoredRooms(_rooms: MeetingRoomMaster[]) {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_MEETING_ROOMS_KEY);
    } catch {}
  }
}

export function checkMeetingRoomConflict(
  roomNameOrId: string,
  startDateTime: Date | string,
  endDateTime: Date | string,
  meetings: MeetingItem[],
  excludeMeetingId?: string | number
): { hasConflict: boolean; conflictingMeetings: MeetingItem[] } {
  if (!roomNameOrId || roomNameOrId.includes("ออนไลน์") || roomNameOrId.includes("Google Meet")) {
    return { hasConflict: false, conflictingMeetings: [] };
  }

  const newStart = new Date(startDateTime).getTime();
  const newEnd = new Date(endDateTime).getTime();

  if (isNaN(newStart) || isNaN(newEnd)) {
    return { hasConflict: false, conflictingMeetings: [] };
  }

  const conflictingMeetings = meetings.filter((m) => {
    if (excludeMeetingId && String(m.id) === String(excludeMeetingId)) return false;
    if (m.status === "cancelled") return false;
    if (m.type === "online") return false;

    // Check location matching room name
    const mLoc = (m.location || "").trim().toLowerCase();
    const targetRoom = roomNameOrId.trim().toLowerCase();
    const isSameRoom =
      mLoc === targetRoom ||
      mLoc.includes(targetRoom) ||
      targetRoom.includes(mLoc);

    if (!isSameRoom) return false;

    const { startDate, endDate } = getMeetingDateRange(m);
    const mStart = startDate.getTime();
    const mEnd = endDate.getTime();

    // Standard interval overlap: (StartA < EndB) and (EndA > StartB)
    return newStart < mEnd && newEnd > mStart;
  });

  return {
    hasConflict: conflictingMeetings.length > 0,
    conflictingMeetings,
  };
}

export const MEETING_TEMPLATES: MeetingPresetTemplate[] = [
  {
    id: "tpl_monthly_all",
    name: "ประชุมประจำเดือนข้าราชการและเจ้าหน้าที่ พมจ.",
    title: "การประชุมประจำเดือนข้าราชการและเจ้าหน้าที่สำนักงาน พมจ.กำแพงเพชร",
    category: "general",
    type: "hybrid",
    location: "ห้องประชุม 1 (ศาลากลางจังหวัด ชั้น 2)",
    meetingLink: "https://meet.google.com/kpp-msoc",
    defaultDurationHours: 2.5,
    description: `วาระที่ ๑: เรื่องที่ประธานแจ้งให้ที่ประชุมทราบ (นโยบายกระทรวง พม. และข้อสั่งการผู้ว่าราชการจังหวัด)
วาระที่ ๒: รับรองรายงานการประชุมครั้งที่ผ่านมา
วาระที่ ๓: เรื่องสืบเนื่องจากการประชุมครั้งก่อน
วาระที่ ๔: เรื่องเพื่อทราบและถือปฏิบัติ
  ๔.๑ รายงานผลการเบิกจ่ายงบประมาณ ประจำเดือน
  ๔.๒ รายงานความก้าวหน้าโครงการตามแผนปฏิบัติราชการ
  ๔.๓ การประเมินคุณธรรมและความโปร่งใส (ITA)
วาระที่ ๕: เรื่องเพื่อพิจารณา
วาระที่ ๖: เรื่องอื่นๆ`,
  },
  {
    id: "tpl_budget_followup",
    name: "ประชุมติดตามเร่งรัดการเบิกจ่ายงบประมาณ",
    title: "ประชุมคณะทำงานติดตามเร่งรัดการเบิกจ่ายงบประมาณและการใช้จ่ายภาครัฐ",
    category: "management",
    type: "onsite",
    location: "ห้องประชุมฝ่ายบริหารทั่วไป",
    defaultDurationHours: 1.5,
    description: `ระเบียบวาระการประชุม:
๑. สรุปผลการเบิกจ่ายงบประมาณรายจ่ายประจำปี (งบดำเนินงานและงบลงทุน)
๒. ปัญหาอุปสรรคในการจัดซื้อจัดจ้างและการเบิกจ่ายเงินอุดหนุน
๓. แผนการจัดสรรและเร่งรัดการเบิกจ่ายให้เป็นไปตามเป้าหมายของกรม/กระทรวง
๔. การเตรียมข้อมูลรายงานระบบ GFMIS`,
  },
  {
    id: "tpl_policy_tech",
    name: "ประชุมกลุ่มนโยบายและวิชาการ (Smart MSO & ข้อมูล)",
    title: "ประชุมขับเคลื่อนระบบสำนักงานเสมือนจริง Smart MSO และงานเทคโนโลยีสารสนเทศ",
    category: "division",
    type: "online",
    location: "ห้องประชุมออนไลน์ Google Meet",
    meetingLink: "https://meet.google.com/kpp-msoc",
    defaultDurationHours: 1.5,
    description: `วาระการประชุม:
๑. การใช้งานระบบ Virtual Office และการเชื่อมโยงระบบจัดเก็บไฟล์ Synology NAS
๒. การพัฒนาระบบแจ้งเตือนและระบบแชทราชการ
๓. ความปลอดภัยทางไซเบอร์และการคุ้มครองข้อมูลส่วนบุคคล (PDPA)
๔. การปรับปรุงฐานข้อมูลกลุ่มเปราะบางระดับจังหวัด`,
  },
  {
    id: "tpl_urgent_case",
    name: "ประชุมด่วน ช่วยเหลือผู้ประสบปัญหาทางสังคมเฉพาะหน้า",
    title: "ประชุมด่วนศูนย์ช่วยเหลือสังคม กรณีช่วยเหลือผู้ประสบปัญหาความเดือดร้อนเร่งด่วน",
    category: "urgent",
    type: "hybrid",
    location: "ห้องประชุม War Room ศูนย์ปฏิบัติการ พมจ.",
    meetingLink: "https://meet.google.com/kpp-msoc",
    defaultDurationHours: 1,
    description: `ระเบียบวาระเร่งด่วน:
๑. สรุปสถานการณ์และข้อเท็จจริงกรณีร้องเรียน/ขอความช่วยเหลือเร่งด่วน
๒. การประสานทีม One Home พม.กำแพงเพชร และหน่วยงานภาคีเครือข่าย
๓. มาตรการลงพื้นที่ช่วยเหลือ สงเคราะห์ และคุ้มครองสวัสดิภาพทันที`,
  },
];
