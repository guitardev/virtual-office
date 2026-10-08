export type Priority = "low" | "medium" | "high";
export type Status = "todo" | "in_progress" | "review" | "done";
export type Role = "admin" | "manager" | "member" | "guest";

export type PersonnelType =
  | "ข้าราชการ"
  | "ลูกจ้างประจำ"
  | "พนักงานราชการ"
  | "พนักงานกองทุน"
  | "พนักงานจ้างเหมาบริการ"
  | "ที่ปรึกษา/ผู้ทรงคุณวุฒิ";

export type ModuleId =
  | "dashboard"
  | "chat"
  | "task"
  | "meetings"
  | "carbooking"
  | "user"
  | "admin"
  | "reports";

export interface RoleInfo {
  id: Role;
  label: string;
  badgeColor: string;
  description: string;
  icon: string;
}

export interface SystemModule {
  id: ModuleId;
  name: string;
  icon: string;
  desc: string;
  enabled: boolean;
  maintenanceNotice?: string;
}

export interface Member {
  id: string;
  prefix: string; // คำนำหน้า เช่น นาย, นาง, นางสาว, ดร., ว่าที่ ร.ต.
  firstName: string; // ชื่อ
  lastName: string; // นามสกุล
  nickname?: string; // ชื่อเล่น เช่น เสก, บอย, เจมส์, ขวัญ
  name: string; // ชื่อเต็มรวมคำนำหน้า (เช่น นายเสกพล ดิษฐโชติ)
  personnelType?: PersonnelType; // ประเภทบุคลากร เช่น ข้าราชการ, ลูกจ้างประจำ, พนักงานราชการ, พนักงานกองทุน, พนักงานจ้างเหมาบริการ
  position: string; // ตำแหน่งงานราชการ เช่น นักวิชาการคอมพิวเตอร์ชำนาญการพิเศษ
  division: string; // กลุ่ม/ฝ่าย (เดิมคือ แผนกงาน)
  department?: string; // fallback alias to division
  email: string; // อีเมลราชการ
  phone: string; // หมายเลขโทรศัพท์
  lineId: string; // LineID
  role: Role;
  status: "active" | "inactive";
  joinedDate: string;
  avatarText: string;
  avatarUrl?: string;
}

export type AccessRequestStatus = "pending" | "approved" | "rejected";

export interface AccessRequest {
  id: string;
  prefix: string; // คำนำหน้า เช่น นาย, นาง, นางสาว
  firstName: string; // ชื่อ
  lastName: string; // นามสกุล
  nickname?: string; // ชื่อเล่น
  name: string; // ชื่อเต็ม
  personnelType: PersonnelType; // ประเภทบุคลากร เช่น ข้าราชการ, พนักงานราชการ
  position: string; // ตำแหน่ง
  division: string; // กลุ่ม/ฝ่าย
  email: string; // อีเมลราชการ
  phone: string; // หมายเลขโทรศัพท์
  lineId: string; // Line ID
  requestedRole: Role; // บทบาทที่ยื่นขอ เช่น member, manager
  approvedRole?: Role; // บทบาทที่อนุมัติจริง
  reason: string; // เหตุผลความจำเป็นในการขอสิทธิ์
  status: AccessRequestStatus; // สถานะคำขอ: pending | approved | rejected
  createdAt: string; // วันที่เวลาที่ยื่นคำขอ
  reviewedAt?: string; // วันที่เวลาที่ดำเนินการ
  reviewedBy?: string; // ผู้ดำเนินการ (เช่น มะลิวัน สิทธิโยธี)
  reviewNotes?: string; // หมายเหตุ/เหตุผลการอนุมัติหรือปฏิเสธ
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  status: "success" | "denied";
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: Role;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  assignee_id: string | null;
  due_date: string | null;
  created_at: string;
}

export interface Meeting {
  id: string;
  organization_id: string;
  title: string;
  start_time: string;
  end_time: string;
  meeting_link: string | null;
  location: string | null;
  created_at: string;
}

export interface ChatChannel {
  id: string;
  organization_id: string;
  name: string;
  type: "channel" | "dm" | "group";
  created_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  attachment_url: string | null;
  created_at: string;
}

export interface File {
  id: string;
  organization_id: string;
  user_id: string | null;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number;
  created_at: string;
}

export interface TaskItem {
  id: number;
  title: string;
  dept: string;
  due: string;
  priority: "high" | "medium" | "low";
  status: "todo" | "in_progress" | "done";
  assignee: string;
}

export interface MeetingItem {
  id: number;
  title: string;
  dateStr: string;
  timeStr: string;
  location: string;
  type: "online" | "onsite";
  attendees: string[];
}