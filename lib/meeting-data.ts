import { MeetingCategory, MeetingType, MeetingItem } from "./types";

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

export const ROOM_PRESETS = [
  "ห้องประชุม 1 (ศาลากลางจังหวัด ชั้น 2)",
  "ห้องประชุม 2 (ศาลากลางจังหวัด ชั้น 4)",
  "ห้องประชุมกลุ่มนโยบายและวิชาการ",
  "ห้องประชุมกลุ่มการพัฒนาสังคมและสวัสดิการ",
  "ห้องประชุมฝ่ายบริหารทั่วไป",
  "ห้องประชุม War Room ศูนย์ปฏิบัติการ พมจ.",
];

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
