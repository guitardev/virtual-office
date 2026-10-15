import { Role, ModuleId, RoleInfo, Member, AuditLog, SystemModule, PersonnelType, AccessRequest, TaskItem, TaskVisibility } from "./types";

export const ROLE_CONFIG: Record<Role, RoleInfo> = {
  admin: {
    id: "admin",
    label: "ผู้ดูแลระบบ (Admin)",
    badgeColor: "bg-indigo-100 text-[#4F46E5] border-indigo-200",
    description: "มีสิทธิ์สูงสุด เข้าถึงได้ทุกโมดูล จัดการสมาชิก และกำหนดนโยบายความปลอดภัย",
    icon: "👑",
  },
  manager: {
    id: "manager",
    label: "ผู้จัดการ (Manager)",
    badgeColor: "bg-teal-100 text-[#0D9488] border-teal-200",
    description: "จัดการงานทีม ตรวจสอบรายงาน อนุมัติการใช้ทรัพยากร แต่ไม่สามารถจัดการสิทธิ์ระบบได้",
    icon: "👔",
  },
  member: {
    id: "member",
    label: "พนักงาน (Member)",
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
    description: "เข้าถึงงานส่วนตัว แชทกลุ่ม การประชุม และจองรถยนต์สำนักงานได้ตามสิทธิ์",
    icon: "👤",
  },
  guest: {
    id: "guest",
    label: "ผู้เยี่ยมชม (Guest)",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    description: "เข้าถึงได้เฉพาะการประชุมที่ได้รับเชิญและห้องแชทสาธารณะเท่านั้น",
    icon: "🎟️",
  },
};

export const MODULE_NAMES: Record<ModuleId, { name: string; icon: string; desc: string }> = {
  dashboard: { name: "หน้าแรก (Dashboard)", icon: "📊", desc: "ภาพรวมสำนักงาน สถิติ และงานเร่งด่วน" },
  chat: { name: "แชททีม (Chat)", icon: "💬", desc: "การสื่อสารระหว่างสมาชิกและห้องแชทองค์กร" },
  task: { name: "งานและโปรเจกต์ (Tasks)", icon: "📋", desc: "กระดานติดตามงานแบบ Kanban" },
  meetings: { name: "การประชุม (Meetings)", icon: "📹", desc: "ตารางประชุมและห้องสนทนาออนไลน์" },
  carbooking: { name: "รถยนต์สำนักงาน (Car Booking)", icon: "🚗", desc: "ระบบจองยานพาหนะส่วนกลาง" },
  user: { name: "ข้อมูลส่วนตัว (Profile)", icon: "👤", desc: "ข้อมูลผู้ใช้และการตั้งค่าส่วนบุคคล" },
  admin: { name: "ระบบจัดการ (Admin Panel)", icon: "⚙️", desc: "การจัดการสมาชิกและกำหนดสิทธิ์ RBAC" },
  reports: { name: "รายงานและสถิติ (Reports)", icon: "📈", desc: "รายงานสถิติการใช้งานและดาวน์โหลดสรุป" },
  files: { name: "คลังเอกสาร NAS (File Station)", icon: "📁", desc: "ระบบจัดเก็บและจัดการไฟล์ตามสิทธิ์ Synology NAS" },
  gallery: { name: "คลังภาพและสื่อ (Synology Photos)", icon: "📸", desc: "คลังจัดเก็บและสืบค้นภาพถ่าย/วิดีโอกิจกรรมราชการ" },
};

export const INITIAL_SYSTEM_MODULES: Record<ModuleId, SystemModule> = {
  dashboard: {
    id: "dashboard",
    name: "หน้าแรก (Dashboard)",
    icon: "📊",
    desc: "ภาพรวมสำนักงาน สถิติ และงานเร่งด่วน",
    enabled: true,
    maintenanceNotice: "ระบบภาพรวมสำนักงานเปิดให้บริการปกติ",
  },
  chat: {
    id: "chat",
    name: "แชททีม (Chat)",
    icon: "💬",
    desc: "การสื่อสารระหว่างสมาชิกและห้องแชทองค์กร",
    enabled: true,
    maintenanceNotice: "ระบบแชททีมเปิดให้บริการปกติ",
  },
  task: {
    id: "task",
    name: "งานและโปรเจกต์ (Tasks)",
    icon: "📋",
    desc: "กระดานติดตามงานแบบ Kanban",
    enabled: true,
    maintenanceNotice: "ระบบติดตามงาน Kanban เปิดให้บริการปกติ",
  },
  meetings: {
    id: "meetings",
    name: "การประชุม (Meetings)",
    icon: "📹",
    desc: "ตารางประชุมและห้องสนทนาออนไลน์",
    enabled: true,
    maintenanceNotice: "ระบบนัดหมายการประชุมเปิดให้บริการปกติ",
  },
  carbooking: {
    id: "carbooking",
    name: "รถยนต์สำนักงาน (Car Booking)",
    icon: "🚗",
    desc: "ระบบจองยานพาหนะส่วนกลาง",
    enabled: true,
    maintenanceNotice: "ระบบจองยานพาหนะส่วนกลางเปิดให้บริการปกติ",
  },
  reports: {
    id: "reports",
    name: "รายงานและสถิติ (Reports)",
    icon: "📈",
    desc: "รายงานสถิติการใช้งานและดาวน์โหลดสรุป",
    enabled: true,
    maintenanceNotice: "ระบบจัดทำรายงานและสรุปสถิติเปิดให้บริการปกติ",
  },
  admin: {
    id: "admin",
    name: "ระบบจัดการ (Admin Panel)",
    icon: "⚙️",
    desc: "การจัดการสมาชิกและกำหนดสิทธิ์ RBAC",
    enabled: true,
    maintenanceNotice: "ศูนย์กลางควบคุมระบบและกำหนดสิทธิ์เปิดให้บริการปกติ",
  },
  user: {
    id: "user",
    name: "ข้อมูลส่วนตัว (Profile)",
    icon: "👤",
    desc: "ข้อมูลผู้ใช้และการตั้งค่าส่วนบุคคล",
    enabled: true,
    maintenanceNotice: "ระบบข้อมูลส่วนตัวเปิดให้บริการปกติ",
  },
  files: {
    id: "files",
    name: "คลังเอกสาร NAS (File Station)",
    icon: "📁",
    desc: "ระบบจัดเก็บและจัดการไฟล์ตามสิทธิ์ Synology NAS",
    enabled: true,
    maintenanceNotice: "ระบบคลังเอกสาร NAS เปิดให้บริการปกติ",
  },
  gallery: {
    id: "gallery",
    name: "คลังภาพและสื่อ (Synology Photos)",
    icon: "📸",
    desc: "คลังจัดเก็บและสืบค้นภาพถ่าย/วิดีโอกิจกรรมราชการ",
    enabled: true,
    maintenanceNotice: "ระบบคลังภาพและสื่อเปิดให้บริการปกติ",
  },
};

// Default Matrix: Which role can access which module
export const INITIAL_ROLE_PERMISSIONS: Record<Role, Record<ModuleId, boolean>> = {
  admin: {
    dashboard: true,
    chat: true,
    task: true,
    meetings: true,
    carbooking: true,
    user: true,
    admin: true,
    reports: true,
    files: true,
    gallery: true,
  },
  manager: {
    dashboard: true,
    chat: true,
    task: true,
    meetings: true,
    carbooking: true,
    user: true,
    admin: false, // Managers cannot access RBAC Admin Panel
    reports: true,
    files: true,
    gallery: true,
  },
  member: {
    dashboard: true,
    chat: true,
    task: true,
    meetings: true,
    carbooking: true,
    user: true,
    admin: false, // Regular members cannot access Admin
    reports: false, // Regular members cannot view company reports
    files: true,
    gallery: true,
  },
  guest: {
    dashboard: false, // Guests cannot view internal dashboard
    chat: true, // Can chat in public channels
    task: false, // Cannot access internal tasks
    meetings: true, // Can join invited meetings
    carbooking: false, // Cannot book company cars
    user: true, // Can view own profile
    admin: false,
    reports: false,
    files: false,
    gallery: false,
  },
};

export const GOVERNMENT_PERSONNEL_TYPES = [
  "ข้าราชการ",
  "ลูกจ้างประจำ",
  "พนักงานราชการ",
  "พนักงานกองทุน",
  "พนักงานจ้างเหมาบริการ",
  "เจ้าหน้าที่โครงการ",
  "ที่ปรึกษา/ผู้ทรงคุณวุฒิ",
] as const;

export const PERSONNEL_TYPE_CONFIG: Record<
  PersonnelType,
  { label: string; badgeColor: string; icon: string; desc: string }
> = {
  ข้าราชการ: {
    label: "ข้าราชการ",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    icon: "🏛️",
    desc: "ข้าราชการพลเรือนสามัญ บรรจุตาม พ.ร.บ.ระเบียบข้าราชการพลเรือน",
  },
  ลูกจ้างประจำ: {
    label: "ลูกจ้างประจำ",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: "🛠️",
    desc: "ลูกจ้างประจำส่วนราชการ บรรจุตามระเบียบกระทรวงการคลัง",
  },
  พนักงานราชการ: {
    label: "พนักงานราชการ",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
    icon: "📋",
    desc: "พนักงานราชการตามระเบียบสำนักนายกรัฐมนตรี",
  },
  พนักงานกองทุน: {
    label: "พนักงานกองทุน",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
    icon: "💰",
    desc: "พนักงานกองทุนเฉพาะด้าน (กองทุนคนพิการ/กองทุนคุ้มครองเด็ก/กองทุนผู้สูงอายุ)",
  },
  พนักงานจ้างเหมาบริการ: {
    label: "พนักงานจ้างเหมาบริการ",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
    icon: "🤝",
    desc: "ผู้ปฏิบัติงานตามสัญญาจ้างเหมาบริการรายปี",
  },
  เจ้าหน้าที่โครงการ: {
    label: "เจ้าหน้าที่โครงการ",
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
    icon: "🎯",
    desc: "ผู้ปฏิบัติงานโครงการตามแผนงาน/ยุทธศาสตร์ประจำปี",
  },
  "ที่ปรึกษา/ผู้ทรงคุณวุฒิ": {
    label: "ที่ปรึกษา/ผู้ทรงคุณวุฒิ",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
    icon: "🎓",
    desc: "ผู้ทรงคุณวุฒิ คณะอนุกรรมการ และที่ปรึกษาภาคประชาสังคม",
  },
};

export const GOVERNMENT_DIVISIONS = [
  "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร (ผู้บริหาร)",
  "ฝ่ายบริหารทั่วไป",
  "กลุ่มนโยบายและวิชาการ",
  "กลุ่มการพัฒนาสังคมและสวัสดิการ",
  "ศูนย์บริการคนพิการจังหวัดกำแพงเพชร",
  "คณะทำงานที่ปรึกษาและภาคีเครือข่ายภายนอก",
] as const;

export const INITIAL_MEMBERS: Member[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

export const INITIAL_ACCESS_REQUESTS: AccessRequest[] = [];

/**
 * ตรวจสอบสิทธิ์การเข้าถึงและการมองเห็นของงาน (Task Access & Visibility Control)
 * - individual (เฉพาะบุคคล): ผู้สร้าง, ผู้รับผิดชอบตรง, และ Admin/Manager ฝ่ายนั้น
 * - department (เฉพาะกลุ่มงาน): บุคลากรในกลุ่มงานนั้น, Manager ฝ่าย, ผู้สร้าง/ผู้รับผิดชอบ, และ Admin
 * - public (ทั้งสำนักงาน): ข้าราชการ/เจ้าหน้าที่ทุกคน
 */
export function canUserViewTask(task: TaskItem, user: Member | null): boolean {
  if (!user) return false;
  // ผู้ดูแลระบบระดับจังหวัด (Admin/พมจ.) เข้าถึงและกำกับดูแลได้ทุกงาน
  if (user.role === "admin") return true;

  const visibility: TaskVisibility = task.visibility || "department";
  const userDivision = (user.division || user.department || "").trim();
  const taskDept = (task.targetDivision || task.dept || "").trim();

  // ผู้สร้างงาน หรือ ผู้รับผิดชอบงาน ย่อมมีสิทธิ์เห็นงานของตนเสมอ
  const isCreator = Boolean(task.createdBy && task.createdBy === user.id);
  const isAssignee = Boolean(
    (task.assigneeId && task.assigneeId === user.id) ||
    (task.assignee && (task.assignee === user.name || (user.firstName && task.assignee.includes(user.firstName))))
  );

  if (isCreator || isAssignee) return true;

  // 1. งานสาธารณะทั้งสำนักงาน
  if (visibility === "public") return true;

  // 2. งานเฉพาะกลุ่มงาน (Department / Manager Group)
  if (visibility === "department") {
    // ถ้าสังกัดกลุ่มงานเดียวกัน
    if (userDivision && taskDept && (userDivision === taskDept || userDivision.includes(taskDept) || taskDept.includes(userDivision))) {
      return true;
    }
    // หากเป็นหัวหน้าฝ่าย (Manager) ของกลุ่มงานเป้าหมาย
    if (user.role === "manager" && (userDivision === taskDept || userDivision.includes(taskDept))) {
      return true;
    }
  }

  // 3. งานเฉพาะบุคคล (Individual / Private)
  if (visibility === "individual") {
    // หัวหน้ากลุ่มงาน (Manager) สามารถเห็นงานส่วนบุคคลของลูกทีมในฝ่ายตนได้เพื่อการกำกับติดตาม
    if (user.role === "manager" && userDivision && taskDept && (userDivision === taskDept || userDivision.includes(taskDept))) {
      return true;
    }
    return false;
  }

  return false;
}

/**
 * ตรวจสอบสิทธิ์การแก้ไขงาน (Task Edit Control)
 */
export function canUserEditTask(task: TaskItem, user: Member | null): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;

  const isCreator = Boolean(task.createdBy && task.createdBy === user.id);
  const isAssignee = Boolean(
    (task.assigneeId && task.assigneeId === user.id) ||
    (task.assignee && (task.assignee === user.name || (user.firstName && task.assignee.includes(user.firstName))))
  );

  if (isCreator || isAssignee) return true;

  const userDivision = (user.division || user.department || "").trim();
  const taskDept = (task.targetDivision || task.dept || "").trim();

  // หัวหน้าฝ่าย (Manager) ในกลุ่มงานสามารถแก้ไข/มอบหมายงานในฝ่ายตนได้
  if (user.role === "manager" && userDivision && taskDept && (userDivision === taskDept || userDivision.includes(taskDept))) {
    return true;
  }

  return false;
}

/**
 * ตรวจสอบสิทธิ์การลบงาน (Task Delete Control)
 */
export function canUserDeleteTask(task: TaskItem, user: Member | null): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;

  const isCreator = Boolean(task.createdBy && task.createdBy === user.id);
  if (isCreator) return true;

  const userDivision = (user.division || user.department || "").trim();
  const taskDept = (task.targetDivision || task.dept || "").trim();

  // หัวหน้าฝ่ายลบงานในฝ่ายตนได้
  if (user.role === "manager" && userDivision && taskDept && (userDivision === taskDept || userDivision.includes(taskDept))) {
    return true;
  }

  return false;
}

