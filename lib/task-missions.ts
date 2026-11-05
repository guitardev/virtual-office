/**
 * Smart MSO - Kamphaeng Phet Provincial Social Development and Human Security Office
 * Mission Groups, Deadline Intelligence, and LINE Notifications Helper
 */

import { TaskItem } from "./types";
import { toThaiDate, toThaiShortDate, thaiDateToIso } from "./thai-numerals";

export interface MsoMissionGroup {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  division: string;
  color: string;
  bgLight: string;
  borderLight: string;
  description: string;
}

export const MSO_MISSION_GROUPS: MsoMissionGroup[] = [
  {
    id: "vulnerable_household",
    name: "งานช่วยเหลือกลุ่มเปราะบางรายครัวเรือน (TPMAP / ศูนย์ ศรส.)",
    shortName: "กลุ่มเปราะบาง/ศรส.",
    icon: "🤝",
    division: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
    color: "text-rose-700",
    bgLight: "bg-rose-50",
    borderLight: "border-rose-200",
    description: "การลงพื้นที่ช่วยเหลือผู้ประสบปัญหาทางสังคมรายครัวเรือนตามฐานข้อมูล TPMAP และศูนย์เร่งรัดจัดการสวัสดิภาพประชาชน",
  },
  {
    id: "child_support",
    name: "งานเงินอุดหนุนเพื่อการเลี้ยงดูเด็กแรกเกิด",
    shortName: "เงินอุดหนุนเด็ก",
    icon: "👶",
    division: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
    color: "text-amber-700",
    bgLight: "bg-amber-50",
    borderLight: "border-amber-200",
    description: "การตรวจสอบสิทธิ์ รับคำขอ อนุมัติเบิกจ่าย และติดตามเงินอุดหนุนเพื่อการเลี้ยงดูเด็กแรกเกิด 600 บาท/เดือน",
  },
  {
    id: "disabilities_fund",
    name: "งานศูนย์บริการคนพิการและกองทุนคนพิการ",
    shortName: "คนพิการ/กองทุน",
    icon: "♿",
    division: "ศูนย์บริการคนพิการจังหวัดกำแพงเพชร",
    color: "text-blue-700",
    bgLight: "bg-blue-50",
    borderLight: "border-blue-200",
    description: "ออกบัตรประจำตัวคนพิการ อนุมัติเงินกู้ยืมประกอบอาชีพ จัดหากายอุปกรณ์ และสนับสนุนศูนย์บริการคนพิการทั่วไป",
  },
  {
    id: "elderly_family",
    name: "งานสวัสดิการผู้สูงอายุและการพัฒนาครอบครัว",
    shortName: "ผู้สูงอายุ/ครอบครัว",
    icon: "👵",
    division: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
    color: "text-emerald-700",
    bgLight: "bg-emerald-50",
    borderLight: "border-emerald-200",
    description: "การปรับสภาพแวดล้อมที่อยู่อาศัยผู้สูงอายุ เงินสงเคราะห์ผู้สูงอายุในภาวะยากลำบาก และงานโรงเรียนผู้สูงอายุ",
  },
  {
    id: "policy_strategic",
    name: "งานนโยบาย ยุทธศาสตร์ แผนงาน และงบประมาณ",
    shortName: "นโยบาย/แผนงาน",
    icon: "📊",
    division: "กลุ่มนโยบายและวิชาการ",
    color: "text-indigo-700",
    bgLight: "bg-indigo-50",
    borderLight: "border-indigo-200",
    description: "การจัดทำแผนปฏิบัติการ พมจ. กำกับติดตามงบประมาณ รายงานผลสัมฤทธิ์โครงการ และประสานงาน กบจ.",
  },
  {
    id: "anti_trafficking",
    name: "งานคุ้มครองสวัสดิภาพและต่อต้านการค้ามนุษย์",
    shortName: "ต่อต้านการค้ามนุษย์",
    icon: "🛡️",
    division: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
    color: "text-purple-700",
    bgLight: "bg-purple-50",
    borderLight: "border-purple-200",
    description: "ทีมสหวิชาชีพตรวจคัดกรอง คุ้มครองผู้เสียหาย และขับเคลื่อนกลไกการส่งต่อระดับชาติ (National Referral Mechanism)",
  },
  {
    id: "admin_finance_hr",
    name: "งานสารบรรณ พัสดุ การเงิน และบริหารทั่วไป",
    shortName: "บริหารทั่วไป/การเงิน",
    icon: "🏢",
    division: "ฝ่ายบริหารทั่วไป",
    color: "text-slate-700",
    bgLight: "bg-slate-100",
    borderLight: "border-slate-300",
    description: "งานรับ-ส่งหนังสือราชการ เบิกจ่ายงบประมาณ งานพัสดุและยานพาหนะ และการบริหารงานบุคคล",
  },
  {
    id: "special_ad_hoc",
    name: "ภารกิจเฉพาะกิจ / งานมอบหมายพิเศษของ พมจ.",
    shortName: "ภารกิจเฉพาะกิจ",
    icon: "⭐",
    division: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร (ผู้บริหาร)",
    color: "text-cyan-700",
    bgLight: "bg-cyan-50",
    borderLight: "border-cyan-200",
    description: "งานรับเสด็จฯ งานพิธีการราชการ โครงการพิเศษตามนโยบายกระทรวง และงานตรวจราชการของผู้ตรวจราชการ พม.",
  },
];

/**
 * Find mission group metadata by id or name
 */
export function getMissionGroupInfo(missionGroupIdOrName?: string): MsoMissionGroup {
  if (!missionGroupIdOrName) return MSO_MISSION_GROUPS[6]; // Default to บริหารทั่วไป
  const match = MSO_MISSION_GROUPS.find(
    (g) =>
      g.id === missionGroupIdOrName ||
      g.name === missionGroupIdOrName ||
      g.shortName === missionGroupIdOrName ||
      missionGroupIdOrName.includes(g.shortName)
  );
  return match || {
    id: "other",
    name: missionGroupIdOrName,
    shortName: missionGroupIdOrName,
    icon: "📌",
    division: "ทุกกลุ่มงาน",
    color: "text-slate-700",
    bgLight: "bg-slate-100",
    borderLight: "border-slate-200",
    description: "ภารกิจราชการทั่วไป",
  };
}

export type DeadlineUrgency = "overdue" | "due_today" | "due_soon" | "upcoming" | "no_due";

export interface DeadlineStatus {
  urgency: DeadlineUrgency;
  label: string;
  diffDays: number;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  icon: string;
  rawDate: Date | null;
}

/**
 * Calculates real-time deadline status from due string
 */
export function getDeadlineStatus(dueStr?: string): DeadlineStatus {
  if (!dueStr || dueStr === "วันนี้") {
    if (dueStr === "วันนี้") {
      return {
        urgency: "due_today",
        label: "ครบกำหนดวันนี้",
        diffDays: 0,
        badgeBg: "bg-rose-50",
        badgeText: "text-rose-700",
        badgeBorder: "border-rose-200",
        icon: "🚨",
        rawDate: new Date(),
      };
    }
    return {
      urgency: "no_due",
      label: "ไม่ระบุกำหนดส่ง",
      diffDays: 999,
      badgeBg: "bg-slate-50",
      badgeText: "text-slate-500",
      badgeBorder: "border-slate-200",
      icon: "⏳",
      rawDate: null,
    };
  }

  // Parse ISO date (YYYY-MM-DD) or Thai date (e.g. "1 พ.ย. 2569", "5 พฤศจิกายน 2569")
  let targetDate: Date | null = null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dueStr)) {
    const [y, m, d] = dueStr.split("-").map(Number);
    targetDate = new Date(y, m - 1, d, 23, 59, 59);
  } else {
    // Attempt Thai date conversion to ISO first
    const isoFromThai = thaiDateToIso(dueStr);
    if (isoFromThai && /^\d{4}-\d{2}-\d{2}$/.test(isoFromThai)) {
      const [y, m, d] = isoFromThai.split("-").map(Number);
      targetDate = new Date(y, m - 1, d, 23, 59, 59);
    } else {
      const parsed = Date.parse(dueStr);
      if (!isNaN(parsed)) {
        targetDate = new Date(parsed);
      }
    }
  }

  if (!targetDate || isNaN(targetDate.getTime())) {
    return {
      urgency: "upcoming",
      label: dueStr,
      diffDays: 999,
      badgeBg: "bg-slate-50",
      badgeText: "text-slate-600",
      badgeBorder: "border-slate-200",
      icon: "📅",
      rawDate: null,
    };
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
  const diffDays = Math.round((targetStart - todayStart) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return {
      urgency: "overdue",
      label: `เลยกำหนดส่ง ${absDays} วัน`,
      diffDays,
      badgeBg: "bg-rose-100",
      badgeText: "text-rose-800",
      badgeBorder: "border-rose-300",
      icon: "⛔",
      rawDate: targetDate,
    };
  }

  if (diffDays === 0) {
    return {
      urgency: "due_today",
      label: "ครบกำหนดส่งวันนี้!",
      diffDays: 0,
      badgeBg: "bg-amber-100",
      badgeText: "text-amber-900",
      badgeBorder: "border-amber-300",
      icon: "⏰",
      rawDate: targetDate,
    };
  }

  if (diffDays <= 3) {
    return {
      urgency: "due_soon",
      label: `เหลืออีก ${diffDays} วัน`,
      diffDays,
      badgeBg: "bg-amber-50",
      badgeText: "text-amber-800",
      badgeBorder: "border-amber-200",
      icon: "⚠️",
      rawDate: targetDate,
    };
  }

  return {
    urgency: "upcoming",
    label: `เหลือ ${diffDays} วัน`,
    diffDays,
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
    badgeBorder: "border-emerald-200",
    icon: "📅",
    rawDate: targetDate,
  };
}

/**
 * Formats a clean, professional civil-service task message for LINE app
 */
export function formatLineTaskMessage(task: TaskItem): string {
  const mission = getMissionGroupInfo(task.missionGroup || task.dept);
  const deadline = getDeadlineStatus(task.due);
  const priorityThai =
    task.priority === "high"
      ? "🔴 เร่งด่วนสูง"
      : task.priority === "medium"
      ? "🟡 ปกติ"
      : "🟢 ต่ำ";

  const statusThai =
    task.status === "todo"
      ? "รอดำเนินการ"
      : task.status === "in_progress"
      ? "กำลังดำเนินการ"
      : task.status === "review"
      ? "รอการตรวจ/ประเมินผล"
      : "เสร็จสิ้นสมบูรณ์";

  const totalSubs = task.subtasks?.length || 0;
  const doneSubs = task.subtasks?.filter((s) => s.done).length || 0;

  const lines = [
    `📋 มอบหมายภารกิจราชการ (Smart MSO)`,
    `สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📌 ชื่องาน: ${task.title}`,
    `🏢 กลุ่มภารกิจ: ${mission.icon} ${mission.name}`,
    `👤 ผู้รับผิดชอบ: ${task.assignee}`,
    `⚡ ความสำคัญ: ${priorityThai}`,
    `📊 สถานะงาน: ${statusThai}`,
    `⏰ กำหนดส่ง: ${task.due} (${deadline.icon} ${deadline.label})`,
  ];

  if (task.description && task.description.trim()) {
    lines.push(`📝 รายละเอียด: ${task.description.trim()}`);
  }

  if (totalSubs > 0) {
    lines.push(`☑️ กิจกรรมย่อย: สำเร็จ ${doneSubs}/${totalSubs} ข้อ`);
  }

  lines.push(`━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`🌐 ระบบสำนักงานเสมือนจริง Smart MSO`);

  return lines.join("\n");
}

/**
 * Standard realistic Kamphaeng Phet MSO initial tasks for quick start
 */
export const INITIAL_MSO_TASKS: TaskItem[] = [
  {
    id: "mso_task_001",
    title: "ลงพื้นที่เยี่ยมบ้านและประเมินสภาพความเดือดร้อนครัวเรือนเปราะบาง อ.พรานกระต่าย",
    missionGroup: "vulnerable_household",
    dept: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
    targetDivision: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
    priority: "high",
    status: "in_progress",
    due: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    assignee: "นางอรัญญา เกิดสุข",
    assigneeId: "usr_3",
    visibility: "department",
    description: "ลงพื้นที่ตรวจสอบสภาพความเป็นอยู่ครัวเรือนตกเกณฑ์ TPMAP มิติรายได้และความเป็นอยู่ ร่วมกับ อพม. และผู้นำชุมชน เพื่อพิจารณาเงินสงเคราะห์ครอบครัว",
    tags: ["TPMAP", "กลุ่มเปราะบาง", "ศรส", "พรานกระต่าย"],
    subtasks: [
      { id: "sub_1", text: "ประสาน อพม. ประจำตำบลและผู้นำหมู่บ้านเพื่อนัดหมาย", done: true },
      { id: "sub_2", text: "ลงพื้นที่จัดเก็บข้อมูลแบบสมุดพกครอบครัวรายครัวเรือน", done: true },
      { id: "sub_3", text: "บันทึกผลการประเมินลงระบบ TPMAP Logbook", done: false },
      { id: "sub_4", text: "เสนอขอรับเงินสงเคราะห์ครอบครัวผู้มีรายได้น้อยและผู้ไร้ที่พึ่ง", done: false },
    ],
  },
  {
    id: "mso_task_002",
    title: "ตรวจสอบสถานะสิทธิ์และยืนยันการรับเงินอุดหนุนเด็กแรกเกิด รอบเดือนพฤศจิกายน ๒๕๖๙",
    missionGroup: "child_support",
    dept: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
    targetDivision: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
    priority: "high",
    status: "todo",
    due: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    assignee: "นายธีรเดช สมหวัง",
    assigneeId: "usr_4",
    visibility: "department",
    description: "ตรวจสอบความซ้ำซ้อนของข้อมูลผู้มีสิทธิ์รับเงินอุดหนุนเพื่อการเลี้ยงดูเด็กแรกเกิด และยืนยันการอนุมัติ ดร.02 เพื่อให้กรมกิจการเด็กและเยาวชน (ดย.) โอนเงินตรงตามกำหนด",
    tags: ["เงินอุดหนุนเด็ก", "ดร02", "ดย", "สวัสดิการเด็ก"],
    subtasks: [
      { id: "sub_2_1", text: "ดาวน์โหลดรายการผู้มีสิทธิ์ที่ต้องยืนยันจากระบบ ดร.02", done: true },
      { id: "sub_2_2", text: "ตรวจสอบสถานะการย้ายที่อยู่หรือการเสียชีวิต", done: false },
      { id: "sub_2_3", text: "ลงนามรับรองผลการตรวจสอบข้อมูลรายอำเภอ", done: false },
    ],
  },
  {
    id: "mso_task_003",
    title: "จัดประชุมคณะอนุกรรมการส่งเสริมและพัฒนาคุณภาพชีวิตคนพิการจังหวัดกำแพงเพชร",
    missionGroup: "disabilities_fund",
    dept: "ศูนย์บริการคนพิการจังหวัดกำแพงเพชร",
    targetDivision: "ศูนย์บริการคนพิการจังหวัดกำแพงเพชร",
    priority: "medium",
    status: "todo",
    due: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    assignee: "นายเสกพล ดิษฐโชติ",
    assigneeId: "usr_2",
    visibility: "public",
    description: "พิจารณาอนุมัติเงินกู้ยืมทุนประกอบอาชีพสำหรับคนพิการและผู้ดูแลคนพิการ จำนวน 32 ราย และการจัดสรรงบประมาณสนับสนุนโครงการขององค์กรคนพิการ",
    tags: ["คนพิการ", "กองทุนคนพิการ", "เงินกู้ยืม", "ประชุมคณะอนุกรรมการ"],
    subtasks: [
      { id: "sub_3_1", text: "สรุปคำขอกู้ยืมเงินทุนประกอบอาชีพและตรวจเอกสารผู้ค้ำประกัน", done: true },
      { id: "sub_3_2", text: "จัดทำระเบียบวาระการประชุมและเอกสารประกอบการพิจารณา", done: false },
      { id: "sub_3_3", text: "ออกหนังสือเชิญประชุมคณะอนุกรรมการฯ พร้อมร่างรายงานการประชุม", done: false },
      { id: "sub_3_4", text: "ประสานงานห้องประชุมชากังราวและระบบลงทะเบียน", done: false },
    ],
  },
  {
    id: "mso_task_004",
    title: "สำรวจและประเมินแบบแปลนการปรับสภาพแวดล้อมที่อยู่อาศัยสำหรับผู้สูงอายุ (งบ ๒๕๗๐)",
    missionGroup: "elderly_family",
    dept: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
    targetDivision: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
    priority: "medium",
    status: "review",
    due: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    assignee: "นางอรัญญา เกิดสุข",
    assigneeId: "usr_3",
    visibility: "department",
    description: "ตรวจสอบแบบแปลนการปรับปรุงห้องน้ำและทางลาดสำหรับผู้สูงอายุตามที่ อปท. เสนอขอรับการสนับสนุนงบประมาณ หลังละไม่เกิน 40,000 บาท รวม 18 หลัง",
    tags: ["ผู้สูงอายุ", "ปรับสภาพแวดล้อม", "ห้องน้ำผู้สูงอายุ", "อปท"],
    subtasks: [
      { id: "sub_4_1", text: "ตรวจสอบเอกสารสิทธิ์ที่ดินและหนังสือยินยอมของเจ้าของบ้าน", done: true },
      { id: "sub_4_2", text: "ตรวจสอบรายการประมาณการราคาวัสดุและค่าแรงช่าง (ปร.4/ปร.5)", done: true },
      { id: "sub_4_3", text: "ทำความเห็นชอบเสนอ พมจ. เพื่ออนุมัติจัดสรรงบประมาณ", done: false },
    ],
  },
  {
    id: "mso_task_005",
    title: "จัดทำเล่มรายงานสรุปผลการดำเนินงานตามแผนปฏิบัติราชการ พมจ. ไตรมาสที่ ๑",
    missionGroup: "policy_strategic",
    dept: "กลุ่มนโยบายและวิชาการ",
    targetDivision: "กลุ่มนโยบายและวิชาการ",
    priority: "medium",
    status: "in_progress",
    due: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    assignee: "นางอรัญญา เกิดสุข",
    assigneeId: "usr_3",
    visibility: "public",
    description: "รวบรวมผลสัมฤทธิ์ตามตัวชี้วัดกระทรวง (KPI) ผลการเบิกจ่ายงบประมาณทุกกลุ่มงาน และปัญหาอุปสรรคเพื่อเสนอต่อที่ประชุม กบจ.กำแพงเพชร",
    tags: ["นโยบาย", "แผนปฏิบัติราชการ", "กบจ", "ไตรมาส1"],
    subtasks: [
      { id: "sub_5_1", text: "รวบรวมข้อมูลผลการเบิกจ่ายงบประมาณจากฝ่ายบริหารทั่วไป", done: true },
      { id: "sub_5_2", text: "ติดตามผลตัวชี้วัดเชิงปริมาณและคุณภาพจากกลุ่มงาน", done: false },
      { id: "sub_5_3", text: "จัดทำอินโฟกราฟิกสรุปผลงานสำคัญส่งเสริมภาพลักษณ์องค์กร", done: false },
    ],
  },
  {
    id: "mso_task_006",
    title: "ตรวจรับพัสดุและลงทะเบียนคุมครุภัณฑ์คอมพิวเตอร์ประจำปีงบประมาณ ๒๕๗๐",
    missionGroup: "admin_finance_hr",
    dept: "ฝ่ายบริหารทั่วไป",
    targetDivision: "ฝ่ายบริหารทั่วไป",
    priority: "low",
    status: "done",
    due: new Date().toISOString().split("T")[0],
    assignee: "นายธีรเดช สมหวัง",
    assigneeId: "usr_4",
    visibility: "department",
    description: "ดำเนินการตรวจรับเครื่องคอมพิวเตอร์และอุปกรณ์สำนักงานตามสัญญาจะซื้อจะขาย ลงรหัสทะเบียนคุมครุภัณฑ์ และจัดทำใบเบิกจ่ายพัสดุส่งมอบแก่ผู้ปฏิบัติงาน",
    tags: ["พัสดุ", "ครุภัณฑ์", "บริหารทั่วไป", "ตรวจรับ"],
    subtasks: [
      { id: "sub_6_1", text: "ตรวจนับจำนวนและสเปกเครื่องตามเอกสารสัญญา (PO)", done: true },
      { id: "sub_6_2", text: "ติดสติกเกอร์รหัสครุภัณฑ์ พม. ประจำเครื่อง", done: true },
      { id: "sub_6_3", text: "ให้ผู้รับมอบลงนามในใบเบิกจ่ายและสแกนเข้าระบบคลังพัสดุ", done: true },
    ],
  },
];

