export type Priority = "low" | "medium" | "high";
export type Status = "todo" | "in_progress" | "review" | "done";
export type Role = "admin" | "manager" | "member" | "guest";

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