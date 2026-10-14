export type Priority = "low" | "medium" | "high";
export type Status = "todo" | "in_progress" | "review" | "done";
export type Role = "admin" | "manager" | "member" | "guest";

export type PersonnelType =
  | "ข้าราชการ"
  | "ลูกจ้างประจำ"
  | "พนักงานราชการ"
  | "พนักงานกองทุน"
  | "พนักงานจ้างเหมาบริการ"
  | "เจ้าหน้าที่โครงการ"
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

export type TaskVisibility = "individual" | "department" | "public";

export interface TaskSubtask {
  id: string;
  text: string;
  done: boolean;
}

export interface TaskItem {
  id: string | number;
  title: string;
  dept: string;
  due: string;
  priority: "high" | "medium" | "low";
  status: "todo" | "in_progress" | "review" | "done";
  assignee: string;
  assigneeId?: string;
  description?: string;
  visibility?: TaskVisibility;
  targetDivision?: string;
  createdBy?: string;
  createdByName?: string;
  subtasks?: TaskSubtask[];
  tags?: string[];
  reviewNotes?: string;
  createdAt?: string;
}

export interface MeetingItem {
  id: string | number;
  title: string;
  dateStr: string;
  timeStr: string;
  location: string;
  type: "online" | "onsite";
  attendees: string[];
  meetingLink?: string;
}

export type VehicleStatus = "available" | "in_use" | "maintenance";

export type FuelLevel =
  | "เต็มถัง (100%)"
  | "3/4 ถัง (75%)"
  | "1/2 ถัง (50%)"
  | "1/4 ถัง (25%)"
  | "ใกล้หมด (ต่ำกว่า 15%)";

export interface VehicleReturnReport {
  returnedAt: string;
  returneeId: string;
  returneeName: string;
  inspectorId: string;
  inspectorName: string;
  startMileage: number;
  endMileage: number;
  totalDistance: number;
  startFuelLevel: string;
  endFuelLevel: string;
  fuelRefilledLiters?: number;
  fuelRefilledCost?: number;
  fuelReceiptNo?: string;
  vehicleCleanliness: "สะอาดเรียบร้อย" | "ต้องล้างทำความสะอาด" | "สกปรกมาก";
  bodyCondition: "ปกติสมบูรณ์ดี" | "มีรอยขูดขีดใหม่" | "มีความเสียหาย";
  engineCondition: "ปกติสมบูรณ์" | "พบอาการผิดปกติ";
  airConditioner: "แอร์เย็นปกติ" | "แอร์ไม่ค่อยเย็น/มีกลิ่น";
  issuesFound?: string;
  notes?: string;
}

export interface Vehicle {
  id: string;
  name: string;
  licensePlate: string;
  category: "รถตู้ส่วนกลาง" | "รถกระบะตรวจการณ์" | "รถยนต์นั่งส่วนบุคคล" | "รถกระบะบรรทุก" | "รถตู้ VIP ผู้บริหาร" | "รถจักรยานยนต์";
  capacity: number;
  driverName?: string;
  fuelType: string;
  status: VehicleStatus;
  image?: string;
  features: string[];
  mileage: number; // เลขไมล์สะสมปัจจุบัน (กม.)
  fuelLevel: FuelLevel; // ระดับน้ำมันคงเหลือปัจจุบัน
  lastMaintenanceDate?: string; // วันที่เข้าตรวจสภาพล่าสุด
  insuranceExpiry?: string; // วันหมดอายุ พ.ร.บ./ประกันภัย
  assignedDivision?: string; // ฝ่ายผู้ดูแล
}

export type BookingStatus =
  | "pending_review"   // ขั้นที่ 1: รอหัวหน้าฝ่ายบริหารทั่วไป (Manager) ตรวจสอบและมอบหมายคนขับ
  | "endorsed"         // ขั้นที่ 2: หัวหน้าฝ่ายเห็นชอบแล้ว: รอ พมจ. (Admin) อนุมัติ
  | "approved"         // ขั้นที่ 3: พมจ. (Admin) อนุมัติเรียบร้อย ออกใบขอใช้รถได้
  | "rejected"         // ไม่อนุมัติ / ส่งกลับ
  | "completed";       // สิ้นสุดภารกิจ และบันทึกรายงานส่งคืนรถแล้ว

export interface CarBookingRequest {
  id: string;
  requestNo: string;
  vehicleId: string;
  vehicleName: string;
  licensePlate: string;
  
  // ผู้ขอใช้รถ (Tier 1: Requestor)
  requesterId: string;
  requesterName: string;
  requesterPosition: string;
  requesterDivision: string;
  requesterPhone: string;
  
  // รายละเอียดภารกิจ
  purpose: string;
  destination: string;
  origin: string;
  departureTime: string;
  returnTime: string;
  passengerCount: number;
  passengersList: string;
  requireDriver: boolean;
  assignedDriver?: string;
  
  // งบประมาณค่าน้ำมันเชื้อเพลิง (ถ้ามี)
  fuelBudgetRequested?: boolean;
  fuelBudgetAmount?: number;
  fuelBudgetSource?: string;
  
  // สถานะและกระบวนการอนุมัติ 3 ขั้น
  status: BookingStatus;
  createdAt: string;
  
  // ขั้นที่ 2: ความเห็นชอบของหัวหน้าฝ่าย (Manager)
  managerId?: string;
  managerName?: string;
  managerNotes?: string;
  managerActionAt?: string;
  
  // ขั้นที่ 3: การอนุมัติของ พมจ. (Admin)
  approverId?: string;
  approverName?: string;
  approverNotes?: string;
  approverActionAt?: string;
  
  // บันทึกการปฏิเสธ
  rejectReason?: string;
  rejectedBy?: string;

  // รายงานการส่งคืนและตรวจสภาพรถ
  returnReport?: VehicleReturnReport;

  // ประวัติการแจ้งเตือนและการส่งข้อมูล (Notify Logs)
  notifications?: BookingNotificationLog[];
}

export interface BookingNotificationLog {
  id: string;
  timestamp: string;
  type: "request_submitted" | "endorsed" | "approved" | "rejected" | "return_reminder" | "return_completed";
  title: string;
  message: string;
  recipientRole: string; // เช่น "ผู้ขอใช้รถ", "หัวหน้าฝ่ายบริหารทั่วไป", "พมจ.กำแพงเพชร", "พนักงานขับรถ", "เจ้าหน้าที่ยานพาหนะ"
  recipientName: string;
  channel: "line_notify" | "system_alert";
  status: "sent" | "delivered";
}



export interface ChatGroup {
  id: string;
  name: string;
  division?: string;
  description: string;
  icon: string;
  type: "announcement" | "division" | "custom";
  isOfficial: boolean;
  memberIds: string[];
  pinnedMessageIds?: string[];
  createdAt: string;
  createdBy?: string;
}

export interface ChatMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderRole: Role;
  senderPosition: string;
  senderDivision: string;
  text: string;
  timestamp: string;
  isPinned?: boolean;
  attachmentName?: string;
  attachmentType?: "pdf" | "image" | "doc";
  attachmentSize?: string;
  tag?: string;
}