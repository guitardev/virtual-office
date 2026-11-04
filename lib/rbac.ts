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
  circular: { name: "หนังสือเวียน (Circular)", icon: "📜", desc: "ระบบเวียนหนังสือราชการ รับทราบ และลงนามดิจิทัล" },
  task: { name: "ภารกิจงาน (Tasks)", icon: "📋", desc: "กระดานติดตามงานแบบ Kanban" },
  meetings: { name: "การประชุม (Meetings)", icon: "📹", desc: "ตารางประชุมและห้องสนทนาออนไลน์" },
  carbooking: { name: "รถราชการ (Car Booking)", icon: "🚗", desc: "ระบบจองยานพาหนะส่วนกลาง" },
  user: { name: "ข้อมูลส่วนตัว (Profile)", icon: "👤", desc: "ข้อมูลผู้ใช้และการตั้งค่าส่วนบุคคล" },
  admin: { name: "จัดการระบบ (Admin Panel)", icon: "⚙️", desc: "การจัดการสมาชิกและกำหนดสิทธิ์ RBAC" },
  reports: { name: "รายงาน (Reports)", icon: "📈", desc: "รายงานสถิติการใช้งานและดาวน์โหลดสรุป" },
  files: { name: "เอกสาร NAS (File Station)", icon: "📁", desc: "ระบบจัดเก็บและจัดการไฟล์ตามสิทธิ์ Synology NAS" },
  gallery: { name: "ภาพ & สื่อ (Synology Photos)", icon: "📸", desc: "คลังจัดเก็บและสืบค้นภาพถ่าย/วิดีโอกิจกรรมราชการ" },
  datahub: { name: "ระบบรวมข้อมูล", icon: "🗃️", desc: "ศูนย์รวมข้อมูลและสถิติตามกลุ่มภารกิจงาน" },
  qrcode: { name: "QR Code", icon: "📱", desc: "เครื่องมือสร้าง QR Code ถาวร" },
  bgremove: { name: "BG Remove", icon: "✂️", desc: "เครื่องมือลบพื้นหลังภาพ" },
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
  circular: {
    id: "circular",
    name: "หนังสือเวียน (Circular)",
    icon: "📜",
    desc: "ระบบเวียนหนังสือราชการ รับทราบ และลงนามดิจิทัล",
    enabled: true,
    maintenanceNotice: "ระบบเวียนหนังสือราชการเปิดให้บริการปกติ",
  },
  task: {
    id: "task",
    name: "ภารกิจงาน (Tasks)",
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
    name: "รถราชการ (Car Booking)",
    icon: "🚗",
    desc: "ระบบจองยานพาหนะส่วนกลาง",
    enabled: true,
    maintenanceNotice: "ระบบจองยานพาหนะส่วนกลางเปิดให้บริการปกติ",
  },
  reports: {
    id: "reports",
    name: "รายงาน (Reports)",
    icon: "📈",
    desc: "รายงานสถิติการใช้งานและดาวน์โหลดสรุป",
    enabled: true,
    maintenanceNotice: "ระบบจัดทำรายงานและสรุปสถิติเปิดให้บริการปกติ",
  },
  admin: {
    id: "admin",
    name: "จัดการระบบ (Admin Panel)",
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
    name: "เอกสาร NAS (File Station)",
    icon: "📁",
    desc: "ระบบจัดเก็บและจัดการไฟล์ตามสิทธิ์ Synology NAS",
    enabled: true,
    maintenanceNotice: "ระบบคลังเอกสาร NAS เปิดให้บริการปกติ",
  },
  gallery: {
    id: "gallery",
    name: "ภาพ & สื่อ (Synology Photos)",
    icon: "📸",
    desc: "คลังจัดเก็บและสืบค้นภาพถ่าย/วิดีโอกิจกรรมราชการ",
    enabled: true,
    maintenanceNotice: "ระบบคลังภาพและสื่อเปิดให้บริการปกติ",
  },
  datahub: {
    id: "datahub",
    name: "ระบบรวมข้อมูล",
    icon: "🗃️",
    desc: "ศูนย์รวมข้อมูลและสถิติตามกลุ่มภารกิจงาน",
    enabled: true,
    maintenanceNotice: "ระบบรวมข้อมูลภารกิจงานเปิดให้บริการปกติ",
  },
  qrcode: {
    id: "qrcode",
    name: "QR Code",
    icon: "📱",
    desc: "เครื่องมือสร้าง QR Code ถาวร",
    enabled: true,
    maintenanceNotice: "เครื่องมือ QR Code เปิดให้บริการปกติ",
  },
  bgremove: {
    id: "bgremove",
    name: "BG Remove",
    icon: "✂️",
    desc: "เครื่องมือลบพื้นหลังภาพ",
    enabled: true,
    maintenanceNotice: "เครื่องมือ BG Remove เปิดให้บริการปกติ",
  },
};

// Default Matrix: Which role can access which module
export const INITIAL_ROLE_PERMISSIONS: Record<Role, Record<ModuleId, boolean>> = {
  admin: {
    dashboard: true,
    chat: true,
    circular: true,
    task: true,
    meetings: true,
    carbooking: true,
    user: true,
    admin: true,
    reports: true,
    files: true,
    gallery: true,
    datahub: true,
    qrcode: true,
    bgremove: true,
  },
  manager: {
    dashboard: true,
    chat: true,
    circular: true,
    task: true,
    meetings: true,
    carbooking: true,
    user: true,
    admin: false, // Managers cannot access RBAC Admin Panel
    reports: true,
    files: true,
    gallery: true,
    datahub: true,
    qrcode: true,
    bgremove: true,
  },
  member: {
    dashboard: true,
    chat: true,
    circular: true,
    task: true,
    meetings: true,
    carbooking: true,
    user: true,
    admin: false, // Regular members cannot access Admin
    reports: false, // Regular members cannot view company reports
    files: true,
    gallery: true,
    datahub: true,
    qrcode: true,
    bgremove: true,
  },
  guest: {
    dashboard: false, // Guests cannot view internal dashboard
    chat: true, // Can chat in public channels
    circular: false,
    task: false, // Cannot access internal tasks
    meetings: true, // Can join invited meetings
    carbooking: false, // Cannot book company cars
    user: true, // Can view own profile
    admin: false,
    reports: false,
    files: false,
    gallery: false,
    datahub: false,
    qrcode: true,
    bgremove: true,
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
 * ตรวจสอบว่าสมาชิกเป็นบุคลากรปฏิบัติงานทั่วไป (Operational Member) หรือไม่
 * เพื่อคัดกรองบัญชีผู้ดูแลระบบ (Admin/System Admin) ออกจากตัวเลือกในทุกระบบ
 * (เช่น ผู้ร่วมเดินทาง, ผู้ขับขี่, ผู้รับผิดชอบงาน, ผู้เข้าร่วมประชุม, ผู้รับหนังสือเวียน)
 */
export function isOperationalMember(m: Member | null | undefined): boolean {
  if (!m || !m.id) return false;
  // กรองบัญชีระบบ หรือสิทธิ์ Admin ออกจากตัวเลือกปฏิบัติงาน
  if (m.role === "admin") return false;
  if (
    m.id === "syno_admin" ||
    m.id === "syno_guitardev" ||
    m.id === "usr_1" ||
    m.id === "usr_mock"
  ) {
    return false;
  }
  return true;
}

/**
 * ดึงเฉพาะรายชื่อบุคลากรปฏิบัติงาน (ไม่รวมผู้ดูแลระบบ Admin) สำหรับแสดงเป็นตัวเลือกในระบบต่างๆ
 */
export function getOperationalMembers(members: Member[]): Member[] {
  return members.filter(isOperationalMember);
}

/**
 * ตรวจสอบว่าสมาชิกเป็นเจ้าหน้าที่ที่มีสิทธิ์ได้รับมอบหมายเป็นพนักงานขับรถยนต์ราชการหรือไม่
 * ตามระเบียบการใช้รถยนต์ราชการ: เลือกจากเจ้าหน้าที่ในสำนักงานได้ทุกคน ยกเว้น Admin และบุคลากรจ้างเหมาบริการ
 */
export function isEligibleDriver(m: Member | null | undefined): boolean {
  if (!m || !m.id) return false;
  // กรองบัญชีระบบ หรือสิทธิ์ Admin ออก
  if (!isOperationalMember(m)) return false;

  // กรองบุคลากรจ้างเหมาบริการออก (ตามระเบียบพัสดุและระเบียบยานพาหนะราชการ)
  const pType = (m.personnelType || "").trim();
  if (pType === "พนักงานจ้างเหมาบริการ" || pType.includes("จ้างเหมา") || pType.includes("เหมาบริการ")) {
    return false;
  }
  const pos = (m.position || "").trim();
  if (pos.includes("จ้างเหมา") || pos.includes("เหมาบริการ")) {
    return false;
  }

  return true;
}

/**
 * ดึงรายชื่อเจ้าหน้าที่ในสำนักงานที่มีสิทธิ์ได้รับมอบหมายเป็นพนักงานขับรถยนต์ราชการ
 * (ไม่รวม Admin และบุคลากรจ้างเหมาบริการ)
 */
export function getEligibleDrivers(members: Member[]): Member[] {
  return (members || []).filter(isEligibleDriver);
}

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

