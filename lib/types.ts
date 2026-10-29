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
  | "circular"
  | "task"
  | "meetings"
  | "carbooking"
  | "user"
  | "admin"
  | "reports"
  | "files"
  | "gallery";

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

export type MeetingType = "online" | "onsite" | "hybrid";
export type MeetingCategory = "general" | "division" | "management" | "urgent" | "external";
export type MeetingStatus = "confirmed" | "tentative" | "cancelled";

export interface MeetingAttendee {
  id?: string;
  name: string;
  email?: string;
  division?: string;
  role?: "chairperson" | "secretary" | "member" | "observer";
  status?: "accepted" | "declined" | "tentative" | "needs-action";
}

export interface MeetingOrganizer {
  id?: string;
  name: string;
  email?: string;
  division?: string;
  phone?: string;
}

export interface MeetingAttachment {
  name: string;
  url: string;
  size?: number;
  type?: string;
}

export interface MeetingItem {
  id: string | number;
  title: string;
  description?: string;
  dateStr: string;
  timeStr: string;
  startTime?: string;
  endTime?: string;
  location: string;
  type: MeetingType;
  category?: MeetingCategory;
  status?: MeetingStatus;
  attendees: (string | MeetingAttendee)[];
  organizer?: MeetingOrganizer;
  meetingLink?: string;
  attachments?: MeetingAttachment[];
  createdAt?: string;
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
  keyReturned?: boolean; // ยืนยันส่งมอบกุญแจคืน
  hasIssue?: boolean; // พบข้อบกพร่อง/สภาพปัญหา
  needsMaintenance?: boolean; // ส่งซ่อมบำรุงเร่งด่วน
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
  | "pending_division_head"     // ขั้นที่ 1: ยื่นคำขอ -> รอหัวหน้ากลุ่ม/ฝ่าย หรือ ข้าราชการในกลุ่มตนเองเห็นชอบ
  | "pending_fleet_assignment"  // ขั้นที่ 2: เห็นชอบแล้ว -> รอเจ้าหน้าที่ฝ่ายบริหารจัดสรรรถและพนักงานขับรถ
  | "pending_admin_head"        // ขั้นที่ 3: จัดรถ/คนขับแล้ว -> รอหัวหน้าฝ่ายบริหารทั่วไปเห็นชอบ
  | "pending_provincial"        // ขั้นที่ 4: เสนอ พมจ. ขออนุมัติ & พิจารณาอนุมัติ
  | "approved"                  // อนุมัติแล้ว: พร้อมปฏิบัติภารกิจ
  | "rejected"                  // ไม่อนุมัติ / ส่งกลับแก้ไข
  | "completed"                 // สิ้นสุดภารกิจ และบันทึกรายงานส่งคืนรถแล้ว (เคลียร์สถานะพร้อมใช้งาน)
  // Legacy aliases
  | "pending_review"
  | "endorsed";

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
  estimatedDistance?: number;
  requireDriver: boolean;
  assignedDriver?: string;
  
  // งบประมาณค่าน้ำมันเชื้อเพลิง (ถ้ามี)
  fuelBudgetRequested?: boolean;
  fuelBudgetAmount?: number;
  fuelBudgetSource?: string;
  fuelProjectName?: string;
  fuelConsumptionRate?: number;
  totalPassengerCountWithDriver?: number;
  
  // สถานะและกระบวนการอนุมัติ 4 ขั้น (7-Step Workflow)
  status: BookingStatus;
  createdAt: string;
  
  // ขั้นที่ 1: การพิจารณาของหัวหน้ากลุ่ม/ฝ่าย หรือ ข้าราชการในกลุ่ม
  divisionReviewerId?: string;
  divisionReviewerName?: string;
  divisionReviewerPosition?: string;
  divisionReviewerRole?: "head" | "official";
  divisionReviewerNotes?: string;
  divisionReviewerActionAt?: string;

  // ขั้นที่ 2: บุคคลฝ่ายบริหารผู้จัดสรรทรัพยากรรถ/คนขับ
  fleetDispatcherId?: string;
  fleetDispatcherName?: string;
  fleetDispatcherPosition?: string;
  fleetDispatcherNotes?: string;
  fleetDispatcherActionAt?: string;

  // ขั้นที่ 3: หัวหน้าฝ่ายบริหารทั่วไป
  adminHeadId?: string;
  adminHeadName?: string;
  adminHeadNotes?: string;
  adminHeadActionAt?: string;

  // Legacy manager aliases
  managerId?: string;
  managerName?: string;
  managerNotes?: string;
  managerActionAt?: string;
  
  // ขั้นที่ 4: การอนุมัติของ พมจ. (Admin)
  approverId?: string;
  approverName?: string;
  approverNotes?: string;
  approverActionAt?: string;
  
  // บันทึกการปฏิเสธ
  rejectReason?: string;
  rejectedBy?: string;
  rejectedAtStage?: string;

  // ขั้นที่ 5 & 7: รายละเอียดการส่งคืนกุญแจ และการแจ้งปัญหาซ่อมบำรุง
  keyReturned?: boolean;
  hasIssueReported?: boolean;
  issueReportDetails?: string;
  needsMaintenance?: boolean;

  // รายงานการส่งคืนและตรวจสภาพรถ
  returnReport?: VehicleReturnReport;

  // ประวัติการแจ้งเตือนและการส่งข้อมูล (Notify Logs)
  notifications?: BookingNotificationLog[];
}

export interface BookingNotificationLog {
  id: string;
  timestamp: string;
  type: 
    | "request_submitted"
    | "division_endorsed"
    | "fleet_assigned"
    | "admin_head_endorsed"
    | "approved"
    | "rejected"
    | "return_completed"
    | "maintenance_alert"
    | "return_reminder";
  title: string;
  message: string;
  recipientRole: string; // เช่น "ผู้ขอใช้รถ", "หัวหน้ากลุ่ม", "เจ้าหน้าที่ฝ่ายบริหาร (จัดสรรรถ)", "หัวหน้าฝ่ายบริหารทั่วไป", "พมจ.กำแพงเพชร"
  recipientName: string;
  channel: "webapp_notification" | "system_alert" | "line_notify";
  status: "sent" | "delivered";
}



export type AttachmentType =
  | "pdf"
  | "image"
  | "doc"
  | "excel"
  | "powerpoint"
  | "zip"
  | "video"
  | "audio"
  | "other";

export interface ChatAttachment {
  id: string;
  name: string;
  type: AttachmentType;
  size: string;
  url?: string;
  dataUrl?: string;
  mimeType?: string;
  nasPath?: string; // e.g. "/chat_attachments/document.pdf"
  storageType?: "nas" | "local" | "template";
  uploadedToNas?: boolean;
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
  attachmentType?: AttachmentType;
  attachmentSize?: string;
  attachmentUrl?: string;
  attachments?: ChatAttachment[];
  tag?: string;
}

// ─── GOVERNMENT CIRCULAR & E-ACKNOWLEDGMENT TYPES ───
export type CircularUrgency = "normal" | "urgent" | "very_urgent" | "most_urgent";
export type CircularSecretLevel = "normal" | "confidential" | "top_secret";

export interface CircularTargetCriteria {
  scope: "all" | "custom";
  divisions?: string[];
  personnelTypes?: PersonnelType[];
  specificMemberIds?: string[];
}

export interface CircularRecipientStatus {
  memberId: string;
  memberName: string;
  division: string;
  personnelType: PersonnelType;
  position: string;
  isAcknowledged: boolean;
  acknowledgedAt?: string;
  signatureUrl?: string; // PNG Base64 Data URL
  endorsementNote?: string;
  ipAddress?: string;
}

export type OfficialDocumentType = "memo" | "external" | "command" | "announcement";

export interface CircularAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  scannedPages?: string[];
  nasPath?: string;
  source?: "upload" | "scanner" | "nas";
}

export interface CircularDocument {
  id: string;
  docNumber: string;
  title: string;
  issuedDate: string;
  senderOrg: string;
  docType?: OfficialDocumentType;
  referenceDoc?: string;
  attachmentList?: string;
  urgency: CircularUrgency;
  secretLevel: CircularSecretLevel;
  summary?: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  totalPages?: number;
  scannedPages?: string[];
  attachments?: CircularAttachment[];
  createdBy: string;
  createdByName: string;
  createdAt: string;
  deadline?: string;
  targetCriteria: CircularTargetCriteria;
  recipients: CircularRecipientStatus[];
  totalCount: number;
  acknowledgedCount: number;
  status: "active" | "closed" | "archived";
}

// ─── UNIFIED SYSTEM NOTIFICATIONS TYPES ───
export type NotificationType = "chat" | "circular" | "access_request" | "carbooking" | "task";
export type NotificationPriority = "normal" | "urgent" | "emergency";

export interface SystemNotification {
  id: string;
  type: NotificationType;
  title: string;              // e.g. "กลุ่มนโยบายและวิชาการ", "หนังสือเวียนด่วนที่สุด"
  message: string;            // Text content snippet or document title
  timestamp: string;          // Formatted time, e.g. "14:05 น."
  createdAt: string;          // ISO string for sorting
  isRead: boolean;
  priority: NotificationPriority;
  senderName?: string;
  senderAvatar?: string;
  link: {
    page: ModuleId;           // "chat" | "circular" | "admin" | "carbooking" | "task"
    targetId?: string;        // groupId for chat, docId for circular, requestId for admin
    subTab?: string;
  };
}