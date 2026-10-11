import { createClient } from "@supabase/supabase-js";
import {
  Member,
  ModuleId,
  Role,
  Task,
  AuditLog,
  PersonnelType,
  AccessRequest,
  AccessRequestStatus,
  Vehicle,
  CarBookingRequest,
  ChatMessage,
  ChatGroup,
  TaskItem,
  MeetingItem,
} from "./types";
import { INITIAL_MEMBERS, INITIAL_SYSTEM_MODULES, INITIAL_ACCESS_REQUESTS, INITIAL_AUDIT_LOGS } from "./rbac";
import { INITIAL_VEHICLES, INITIAL_BOOKING_REQUESTS } from "./carbooking-data";
import { DEFAULT_CHAT_GROUPS, INITIAL_CHAT_MESSAGES } from "./chat-data";

// Environment variables from Vercel Marketplace Supabase Integration
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith("http") &&
    !supabaseUrl.includes("your-project")
  );
};

// Client singleton (initialized only if configured to prevent build/runtime errors)
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

/**
 * Map Supabase user row to Member object
 */
export function mapRowToMember(row: any): Member {
  return {
    id: row.id,
    prefix: row.prefix || "นาย",
    firstName: row.first_name || (row.name ? row.name.split(" ")[0] : ""),
    lastName: row.last_name || (row.name ? row.name.split(" ").slice(1).join(" ") : ""),
    nickname: row.nickname || undefined,
    name: row.name || `${row.prefix || ""}${row.first_name || ""} ${row.last_name || ""}`.trim(),
    personnelType: (row.personnel_type as PersonnelType) || "ข้าราชการ",
    position: row.position || "เจ้าหน้าที่",
    division: row.division || "ฝ่ายบริหารทั่วไป",
    department: row.division || "ฝ่ายบริหารทั่วไป",
    email: row.email,
    phone: row.phone || "-",
    lineId: row.line_id || "-",
    role: (row.role as Role) || "member",
    status: row.status === "inactive" ? "inactive" : "active",
    joinedDate: row.created_at
      ? new Date(row.created_at).toLocaleDateString("th-TH", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "1 ม.ค. 2024",
    avatarText: (row.first_name || row.name || "U").slice(0, 2),
    avatarUrl: row.avatar_url || undefined,
  };
}

/**
 * Map Member object to Supabase user row
 */
export function mapMemberToRow(member: Member): any {
  return {
    id: member.id,
    prefix: member.prefix,
    first_name: member.firstName,
    last_name: member.lastName,
    nickname: member.nickname || null,
    name: member.name,
    personnel_type: member.personnelType || "ข้าราชการ",
    position: member.position,
    division: member.division,
    email: member.email,
    phone: member.phone || null,
    line_id: member.lineId || null,
    avatar_url: member.avatarUrl || null,
    role: member.role,
  };
}

const MEMBERS_STORAGE_KEY = "omnioffice_members_cache_v1";

/**
 * Get members from local cache or fallback to INITIAL_MEMBERS
 */
export function getLocalMembers(): Member[] {
  if (typeof window === "undefined") return INITIAL_MEMBERS;
  try {
    const raw = localStorage.getItem(MEMBERS_STORAGE_KEY);
    if (!raw) return INITIAL_MEMBERS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_MEMBERS;
  } catch {
    return INITIAL_MEMBERS;
  }
}

/**
 * Save members to local cache
 */
export function saveLocalMembers(members: Member[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(members));
  } catch (e) {
    console.warn("Could not save members to localStorage:", e);
  }
}

/**
 * Fetch members from Supabase, with automatic local cache synchronization and fallback
 */
export async function fetchMembers(): Promise<Member[]> {
  const localMembers = getLocalMembers();
  if (!supabase) return localMembers;

  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn("Supabase fetch members returned empty or error, using cached/initial members:", error);
      return localMembers;
    }

    const liveMembers = data.map(mapRowToMember);
    const liveIds = new Set(liveMembers.map((m) => m.id));
    // Preserve local-only members (e.g. offline created users or local LINE profiles not yet synced)
    const localOnly = localMembers.filter((m) => !liveIds.has(m.id));
    const mergedMembers = [...liveMembers, ...localOnly];

    // Keep local cache up-to-date with latest records
    saveLocalMembers(mergedMembers);
    return mergedMembers;
  } catch (err) {
    console.error("Error fetching members from Supabase, using local cache:", err);
    return localMembers;
  }
}

/**
 * Upsert member in Supabase and local cache
 */
export async function saveMember(member: Member): Promise<boolean> {
  // Always persist to local cache first so offline/SSO state is never lost
  try {
    const current = getLocalMembers();
    const exists = current.some((m) => m.id === member.id);
    const updated = exists
      ? current.map((m) => (m.id === member.id ? member : m))
      : [member, ...current];
    saveLocalMembers(updated);
  } catch (err) {
    console.warn("Could not save member to local cache:", err);
  }

  if (!supabase) return true;

  try {
    const row = mapMemberToRow(member);
    const { error } = await supabase.from("users").upsert(row);
    if (error) {
      console.error("Error upserting member to Supabase:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error saving member to Supabase:", err);
    return false;
  }
}

/**
 * Delete member in Supabase and local cache
 */
export async function deleteMember(id: string): Promise<boolean> {
  // Always update local cache
  try {
    const current = getLocalMembers();
    saveLocalMembers(current.filter((m) => m.id !== id));
  } catch (err) {
    console.warn("Could not delete member from local cache:", err);
  }

  if (!supabase) return true;

  try {
    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) {
      console.error("Error deleting member from Supabase:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error deleting member from Supabase:", err);
    return false;
  }
}

/**
 * Setup Realtime Subscription for live updates
 */
export function subscribeToMembers(callback: (members: Member[]) => void) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel("public:users")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "users" },
      async () => {
        const updated = await fetchMembers();
        callback(updated);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Map Supabase row to AccessRequest object
 */
export function mapRowToAccessRequest(row: any): AccessRequest {
  return {
    id: row.id,
    prefix: row.prefix || "นาย",
    firstName: row.first_name || "",
    lastName: row.last_name || "",
    nickname: row.nickname || undefined,
    name: row.name || `${row.prefix || ""}${row.first_name || ""} ${row.last_name || ""}`.trim(),
    personnelType: (row.personnel_type as PersonnelType) || "ข้าราชการ",
    position: row.position || "เจ้าหน้าที่",
    division: row.division || "ฝ่ายบริหารทั่วไป",
    email: row.email,
    phone: row.phone || "-",
    lineId: row.line_id || "-",
    requestedRole: (row.requested_role as Role) || "member",
    approvedRole: (row.approved_role as Role) || undefined,
    reason: row.reason || "",
    status: (row.status as AccessRequestStatus) || "pending",
    createdAt: row.created_at
      ? new Date(row.created_at).toLocaleDateString("th-TH", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "วันนี้",
    reviewedAt: row.reviewed_at
      ? new Date(row.reviewed_at).toLocaleDateString("th-TH", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : undefined,
    reviewedBy: row.reviewed_by || undefined,
    reviewNotes: row.review_notes || undefined,
  };
}

export const ACCESS_REQUESTS_STORAGE_KEY = "omnioffice_access_requests_cache_v1";
export const LEGACY_ACCESS_REQUESTS_STORAGE_KEY = "omnioffice_access_requests";

export function getLocalAccessRequests(): AccessRequest[] {
  if (typeof window === "undefined") return INITIAL_ACCESS_REQUESTS;
  try {
    const raw =
      localStorage.getItem(ACCESS_REQUESTS_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_ACCESS_REQUESTS_STORAGE_KEY);
    if (!raw) return INITIAL_ACCESS_REQUESTS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_ACCESS_REQUESTS;
  } catch {
    return INITIAL_ACCESS_REQUESTS;
  }
}

export function saveLocalAccessRequests(requests: AccessRequest[]) {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(requests);
    // Persist to both standard key and legacy key for backward compatibility
    localStorage.setItem(ACCESS_REQUESTS_STORAGE_KEY, serialized);
    localStorage.setItem(LEGACY_ACCESS_REQUESTS_STORAGE_KEY, serialized);
  } catch (e) {
    console.warn("Could not save access requests to localStorage:", e);
  }
}

/**
 * Fetch access requests from Supabase, or fallback to LocalStorage/INITIAL_ACCESS_REQUESTS
 */
export async function fetchAccessRequests(): Promise<AccessRequest[]> {
  const localList = getLocalAccessRequests();
  if (!supabase) return localList;

  try {
    const { data, error } = await supabase
      .from("access_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return localList;
    }

    const liveList = data.map(mapRowToAccessRequest);
    const liveIds = new Set(liveList.map((r) => r.id));
    // Preserve any local-only requests that were created offline
    const localOnly = localList.filter((r) => !liveIds.has(r.id));
    const mergedList = [...liveList, ...localOnly];

    saveLocalAccessRequests(mergedList);
    return mergedList;
  } catch {
    return localList;
  }
}

/**
 * Save access request to Supabase (with automatic LocalStorage persistence fallback)
 */
export async function saveAccessRequest(req: AccessRequest): Promise<boolean> {
  // Always update local cache so the request is NEVER lost even if Supabase table is not yet created
  const currentLocal = getLocalAccessRequests();
  const existingIdx = currentLocal.findIndex((r) => r.id === req.id);
  const updatedLocal =
    existingIdx >= 0
      ? currentLocal.map((r) => (r.id === req.id ? req : r))
      : [req, ...currentLocal];
  saveLocalAccessRequests(updatedLocal);

  if (!supabase) return true;

  try {
    const { error } = await supabase.from("access_requests").upsert({
      id: req.id,
      prefix: req.prefix,
      first_name: req.firstName,
      last_name: req.lastName,
      nickname: req.nickname || null,
      name: req.name,
      personnel_type: req.personnelType,
      position: req.position,
      division: req.division,
      email: req.email,
      phone: req.phone || null,
      line_id: req.lineId || null,
      requested_role: req.requestedRole,
      approved_role: req.approvedRole || null,
      reason: req.reason,
      status: req.status,
      reviewed_by: req.reviewedBy || null,
      review_notes: req.reviewNotes || null,
    });

    if (error) {
      console.warn("Could not save access request to Supabase, local state used:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Error saving access request:", err);
    return false;
  }
}

/**
 * Setup Realtime Subscription for access requests
 */
export function subscribeToAccessRequests(callback: (requests: AccessRequest[]) => void) {
  if (!supabase) return () => {};

  const channel = supabase
    .channel("public:access_requests")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "access_requests" },
      async () => {
        const updated = await fetchAccessRequests();
        callback(updated);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ==========================================
// VEHICLES & CAR BOOKINGS (Government Fleet & Dispatch)
// ==========================================

export function mapRowToVehicle(row: any): Vehicle {
  return {
    id: row.id,
    name: row.name,
    licensePlate: row.license_plate,
    category: row.category,
    capacity: Number(row.capacity) || 4,
    driverName: row.driver_name || undefined,
    fuelType: row.fuel_type || "ดีเซล B7",
    status: row.status || "available",
    image: row.image || undefined,
    features: Array.isArray(row.features) ? row.features : [],
    mileage: Number(row.mileage) || 0,
    fuelLevel: row.fuel_level || "เต็มถัง (100%)",
    lastMaintenanceDate: row.last_maintenance_date || undefined,
    insuranceExpiry: row.insurance_expiry || undefined,
    assignedDivision: row.assigned_division || undefined,
  };
}

export function mapVehicleToRow(v: Vehicle): any {
  return {
    id: v.id,
    name: v.name,
    license_plate: v.licensePlate,
    category: v.category,
    capacity: v.capacity,
    driver_name: v.driverName || null,
    fuel_type: v.fuelType,
    status: v.status,
    image: v.image || null,
    features: v.features || [],
    mileage: v.mileage,
    fuel_level: v.fuelLevel,
    last_maintenance_date: v.lastMaintenanceDate || null,
    insurance_expiry: v.insuranceExpiry || null,
    assigned_division: v.assignedDivision || null,
  };
}

export function mapRowToCarBooking(row: any): CarBookingRequest {
  return {
    id: row.id,
    requestNo: row.request_no,
    vehicleId: row.vehicle_id,
    vehicleName: row.vehicle_name,
    licensePlate: row.license_plate,
    requesterId: row.requester_id,
    requesterName: row.requester_name,
    requesterPosition: row.requester_position || "",
    requesterDivision: row.requester_division || "",
    requesterPhone: row.requester_phone || "",
    purpose: row.purpose,
    destination: row.destination,
    origin: row.origin || "สำนักงาน พมจ.กำแพงเพชร",
    departureTime: row.departure_time,
    returnTime: row.return_time,
    passengerCount: Number(row.passenger_count) || 1,
    passengersList: row.passengers_list || "",
    requireDriver: Boolean(row.require_driver),
    assignedDriver: row.assigned_driver || undefined,
    fuelBudgetRequested: Boolean(row.fuel_budget_requested),
    fuelBudgetAmount: row.fuel_budget_amount ? Number(row.fuel_budget_amount) : undefined,
    fuelBudgetSource: row.fuel_budget_source || undefined,
    status: row.status,
    createdAt: row.created_at,
    managerId: row.manager_id || undefined,
    managerName: row.manager_name || undefined,
    managerNotes: row.manager_notes || undefined,
    managerActionAt: row.manager_action_at || undefined,
    approverId: row.approver_id || undefined,
    approverName: row.approver_name || undefined,
    approverNotes: row.approver_notes || undefined,
    approverActionAt: row.approver_action_at || undefined,
    rejectReason: row.reject_reason || undefined,
    rejectedBy: row.rejected_by || undefined,
    returnReport: row.return_report || undefined,
    notifications: Array.isArray(row.notifications) ? row.notifications : undefined,
  };
}

export function mapCarBookingToRow(b: CarBookingRequest): any {
  return {
    id: b.id,
    request_no: b.requestNo,
    vehicle_id: b.vehicleId,
    vehicle_name: b.vehicleName,
    license_plate: b.licensePlate,
    requester_id: b.requesterId,
    requester_name: b.requesterName,
    requester_position: b.requesterPosition || null,
    requester_division: b.requesterDivision || null,
    requester_phone: b.requesterPhone || null,
    purpose: b.purpose,
    destination: b.destination,
    origin: b.origin,
    departure_time: b.departureTime,
    return_time: b.returnTime,
    passenger_count: b.passengerCount,
    passengers_list: b.passengersList || null,
    require_driver: b.requireDriver,
    assigned_driver: b.assignedDriver || null,
    fuel_budget_requested: b.fuelBudgetRequested || false,
    fuel_budget_amount: b.fuelBudgetAmount || null,
    fuel_budget_source: b.fuelBudgetSource || null,
    status: b.status,
    created_at: b.createdAt,
    manager_id: b.managerId || null,
    manager_name: b.managerName || null,
    manager_notes: b.managerNotes || null,
    manager_action_at: b.managerActionAt || null,
    approver_id: b.approverId || null,
    approver_name: b.approverName || null,
    approver_notes: b.approverNotes || null,
    approver_action_at: b.approverActionAt || null,
    reject_reason: b.rejectReason || null,
    rejected_by: b.rejectedBy || null,
    return_report: b.returnReport || null,
    notifications: b.notifications || [],
  };
}

export async function fetchVehicles(): Promise<Vehicle[]> {
  if (!supabase) return INITIAL_VEHICLES;
  try {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .order("id", { ascending: true });
    if (error || !data || data.length === 0) return INITIAL_VEHICLES;
    return data.map(mapRowToVehicle);
  } catch {
    return INITIAL_VEHICLES;
  }
}

export async function saveVehicle(vehicle: Vehicle): Promise<boolean> {
  if (!supabase) return true;
  try {
    const row = mapVehicleToRow(vehicle);
    const { error } = await supabase.from("vehicles").upsert(row);
    return !error;
  } catch {
    return false;
  }
}

export async function fetchCarBookings(): Promise<CarBookingRequest[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("car_bookings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map(mapRowToCarBooking);
  } catch {
    return [];
  }
}

export async function saveCarBooking(booking: CarBookingRequest): Promise<boolean> {
  if (!supabase) return true;
  try {
    const row = mapCarBookingToRow(booking);
    const { error } = await supabase.from("car_bookings").upsert(row);
    return !error;
  } catch {
    return false;
  }
}

export function subscribeToVehicles(callback: (vehicles: Vehicle[]) => void) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel("public:vehicles")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "vehicles" },
      async () => {
        const updated = await fetchVehicles();
        callback(updated);
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToCarBookings(callback: (bookings: CarBookingRequest[]) => void) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel("public:car_bookings")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "car_bookings" },
      async () => {
        const updated = await fetchCarBookings();
        callback(updated);
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function deleteVehicle(id: string): Promise<boolean> {
  if (!supabase) return true;
  try {
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteCarBooking(id: string): Promise<boolean> {
  if (!supabase) return true;
  try {
    const { error } = await supabase.from("car_bookings").delete().eq("id", id);
    return !error;
  } catch {
    return false;
  }
}

// ==========================================
// CHAT CHANNELS & MESSAGES (Government Chat Hub)
// ==========================================

export function mapRowToChatGroup(row: any): ChatGroup {
  return {
    id: row.id,
    name: row.name,
    division: row.division || undefined,
    description: row.description || "",
    icon: row.icon || "💬",
    type: row.type || "division",
    isOfficial: Boolean(row.is_official),
    memberIds: Array.isArray(row.member_ids) ? row.member_ids : [],
    pinnedMessageIds: Array.isArray(row.pinned_message_ids) ? row.pinned_message_ids : [],
    createdAt: row.created_at ? new Date(row.created_at).toLocaleDateString("th-TH") : "วันนี้",
    createdBy: row.created_by || undefined,
  };
}

export function mapChatGroupToRow(g: ChatGroup): any {
  return {
    id: g.id,
    name: g.name,
    division: g.division || null,
    description: g.description,
    icon: g.icon,
    type: g.type,
    is_official: g.isOfficial,
    member_ids: g.memberIds,
    pinned_message_ids: g.pinnedMessageIds || [],
    created_by: g.createdBy || null,
  };
}

export function mapRowToChatMessage(row: any): ChatMessage {
  const ts = row.created_at
    ? new Date(row.created_at).toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      }) + " น."
    : "เมื่อสักครู่";

  const meta = row.attachment_metadata || {};

  return {
    id: row.id,
    groupId: row.channel_id,
    senderId: row.user_id || row.sender_id || "",
    senderName: row.sender_name || "ผู้ใช้งาน",
    senderAvatar: row.sender_avatar || undefined,
    senderRole: (row.sender_role as Role) || "member",
    senderPosition: row.sender_position || "เจ้าหน้าที่",
    senderDivision: meta.sender_division || row.sender_division || "สำนักงาน พมจ.",
    text: row.content || "",
    timestamp: ts,
    tag: row.tag || undefined,
    attachmentName: meta.attachment_name || row.attachment_name || undefined,
    attachmentType: meta.attachment_type || row.attachment_type || undefined,
    attachmentSize: meta.attachment_size || row.attachment_size || undefined,
    isPinned: Boolean(meta.is_pinned ?? row.is_pinned),
  };
}

export function mapChatMessageToRow(m: ChatMessage): any {
  return {
    id: m.id,
    channel_id: m.groupId,
    user_id: m.senderId || null,
    sender_name: m.senderName,
    sender_avatar: m.senderAvatar || null,
    sender_role: m.senderRole || "member",
    sender_position: m.senderPosition || null,
    content: m.text,
    tag: m.tag || null,
    attachment_url: null,
    attachment_metadata: {
      attachment_name: m.attachmentName || null,
      attachment_type: m.attachmentType || null,
      attachment_size: m.attachmentSize || null,
      sender_division: m.senderDivision || null,
      is_pinned: Boolean(m.isPinned),
    },
  };
}

export async function fetchChatGroups(): Promise<ChatGroup[]> {
  if (!supabase) return DEFAULT_CHAT_GROUPS;
  try {
    const { data, error } = await supabase
      .from("chat_channels")
      .select("*")
      .order("created_at", { ascending: true });
    if (error || !data || data.length === 0) return DEFAULT_CHAT_GROUPS;
    return data.map(mapRowToChatGroup);
  } catch {
    return DEFAULT_CHAT_GROUPS;
  }
}

export async function saveChatGroup(group: ChatGroup): Promise<boolean> {
  if (!supabase) return true;
  try {
    const row = mapChatGroupToRow(group);
    const { error } = await supabase.from("chat_channels").upsert(row);
    return !error;
  } catch {
    return false;
  }
}

export async function fetchChatMessages(): Promise<ChatMessage[]> {
  if (!supabase) return INITIAL_CHAT_MESSAGES;
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true });
    if (error || !data || data.length === 0) return INITIAL_CHAT_MESSAGES;
    return data.map(mapRowToChatMessage);
  } catch {
    return INITIAL_CHAT_MESSAGES;
  }
}

export async function sendChatMessage(msg: ChatMessage): Promise<boolean> {
  if (!supabase) return true;
  try {
    const row = mapChatMessageToRow(msg);
    const { error } = await supabase.from("messages").upsert(row);
    return !error;
  } catch {
    return false;
  }
}

export async function updateChatMessagePin(msgId: string, isPinned: boolean): Promise<boolean> {
  if (!supabase) return true;
  try {
    const { data: existing } = await supabase
      .from("messages")
      .select("attachment_metadata")
      .eq("id", msgId)
      .single();
    const updatedMeta = { ...(existing?.attachment_metadata || {}), is_pinned: isPinned };
    const { error } = await supabase
      .from("messages")
      .update({ attachment_metadata: updatedMeta })
      .eq("id", msgId);
    return !error;
  } catch {
    return false;
  }
}

export function subscribeToChatMessages(callback: () => void) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel("public:messages")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "messages" },
      () => {
        callback();
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToChatGroups(callback: () => void) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel("public:chat_channels")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "chat_channels" },
      () => {
        callback();
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ==========================================
// AUDIT LOGS (Activity & Governance Logs)
// ==========================================

export function mapRowToAuditLog(row: any): AuditLog {
  const ts = row.timestamp
    ? new Date(row.timestamp).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " น."
    : "เมื่อสักครู่";

  return {
    id: String(row.id),
    timestamp: ts,
    actor: row.actor_name || row.actor || "ผู้ใช้งาน",
    action: row.action,
    target: row.target,
    status: row.status === "denied" ? "denied" : "success",
  };
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  if (!supabase) return INITIAL_AUDIT_LOGS;
  try {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(100);
    if (error || !data || data.length === 0) return INITIAL_AUDIT_LOGS;
    return data.map(mapRowToAuditLog);
  } catch {
    return INITIAL_AUDIT_LOGS;
  }
}

export async function saveAuditLog(log: AuditLog): Promise<boolean> {
  if (!supabase) return true;
  try {
    const row = {
      actor_name: log.actor,
      action: log.action,
      target: log.target,
      status: log.status,
    };
    const { error } = await supabase.from("audit_logs").insert(row);
    return !error;
  } catch {
    return false;
  }
}

export function subscribeToAuditLogs(callback: () => void) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel("public:audit_logs")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "audit_logs" },
      () => {
        callback();
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ==========================================
// TASKS & MEETINGS (Live Supabase Integration)
// ==========================================

export function mapRowToTask(row: any): TaskItem {
  return {
    id: row.id,
    title: row.title,
    dept: row.description || "ฝ่ายบริหารทั่วไป",
    due: row.due_date ? new Date(row.due_date).toLocaleDateString("th-TH") : "วันนี้",
    priority: (row.priority as "high" | "medium" | "low") || "medium",
    status: row.status === "done" ? "done" : row.status === "in_progress" ? "in_progress" : "todo",
    assignee: row.assignee_id || "ผู้รับผิดชอบ",
  };
}

export function mapTaskToRow(task: TaskItem): any {
  const isUuid =
    typeof task.id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(task.id);
  const row: any = {
    title: task.title,
    description: task.dept,
    status: task.status,
    priority: task.priority,
    assignee_id: task.assignee || null,
  };
  if (isUuid) {
    row.id = task.id;
  }
  return row;
}

export async function fetchTasks(): Promise<TaskItem[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    if (error || !data) return [];
    return data.map(mapRowToTask);
  } catch {
    return [];
  }
}

export async function saveTask(task: TaskItem): Promise<boolean> {
  if (!supabase) return true;
  try {
    const row = mapTaskToRow(task);
    const { error } = await supabase.from("tasks").upsert(row);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteTask(id: string | number): Promise<boolean> {
  if (!supabase) return true;
  try {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    return !error;
  } catch {
    return false;
  }
}

export function subscribeToTasks(callback: (tasks: TaskItem[]) => void) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel("public:tasks")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tasks" },
      async () => {
        const updated = await fetchTasks();
        callback(updated);
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export function mapRowToMeeting(row: any): MeetingItem {
  const start = row.start_time ? new Date(row.start_time) : new Date();
  const end = row.end_time ? new Date(row.end_time) : new Date(Date.now() + 3600000);

  const dateStr = start.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeStr = `${start.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${end.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.`;

  return {
    id: row.id,
    title: row.title,
    dateStr,
    timeStr,
    location: row.location || "ห้องประชุมออนไลน์",
    type: row.meeting_link ? "online" : "onsite",
    attendees: ["ข้าราชการและเจ้าหน้าที่ พมจ."],
    meetingLink: row.meeting_link || undefined,
  };
}

export async function fetchMeetings(): Promise<MeetingItem[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("meetings")
      .select("*")
      .order("start_time", { ascending: true });
    if (error || !data) return [];
    return data.map(mapRowToMeeting);
  } catch {
    return [];
  }
}

export async function saveMeeting(meeting: MeetingItem): Promise<boolean> {
  if (!supabase) return true;
  try {
    const isUuid =
      typeof meeting.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(meeting.id);
    const now = new Date();
    const oneHourLater = new Date(Date.now() + 3600000);
    const row: any = {
      title: meeting.title,
      start_time: now.toISOString(),
      end_time: oneHourLater.toISOString(),
      location: meeting.location || "ห้องประชุมสำนักงาน พมจ.",
      meeting_link:
        meeting.meetingLink ||
        (meeting.type === "online" ? "https://meet.google.com/kpp-msoc" : null),
    };
    if (isUuid) row.id = meeting.id;
    const { error } = await supabase.from("meetings").upsert(row);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteMeeting(id: string | number): Promise<boolean> {
  if (!supabase) return true;
  try {
    const { error } = await supabase.from("meetings").delete().eq("id", id);
    return !error;
  } catch {
    return false;
  }
}

export function subscribeToMeetings(callback: (meetings: MeetingItem[]) => void) {
  if (!supabase) return () => {};
  const channel = supabase
    .channel("public:meetings")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "meetings" },
      async () => {
        const updated = await fetchMeetings();
        callback(updated);
      }
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}


// ==========================================
// SUPABASE AUTHENTICATION (Real Supabase Auth)
// ==========================================

export interface SupabaseAuthResult {
  success: boolean;
  user?: any;
  session?: any;
  error?: string;
  isConfirmationNeeded?: boolean;
}

/**
 * Sign in with email and password using Supabase Auth
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<SupabaseAuthResult> {
  if (!supabase) {
    return { success: false, error: "ไม่ได้กำหนดค่าเชื่อมต่อ Supabase" };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      if (error.message.includes("Email not confirmed")) {
        return {
          success: false,
          error: "อีเมลนี้ยังไม่ได้ยืนยันตัวตน (Email not confirmed) กรุณาตรวจสอบลิงก์ในอีเมล หรือตั้งค่า Auto Confirm ใน Supabase Dashboard",
          isConfirmationNeeded: true,
        };
      }
      if (error.message.includes("Invalid login credentials")) {
        return {
          success: false,
          error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง (Invalid login credentials)",
        };
      }
      return { success: false, error: error.message };
    }

    return {
      success: true,
      user: data.user,
      session: data.session,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ Supabase Auth",
    };
  }
}

/**
 * Sign up with email and password using Supabase Auth
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  metadata?: {
    fullName?: string;
    position?: string;
    division?: string;
    role?: Role;
  }
): Promise<SupabaseAuthResult> {
  if (!supabase) {
    return { success: false, error: "ไม่ได้กำหนดค่าเชื่อมต่อ Supabase" };
  }

  try {
    const redirectUrl = typeof window !== "undefined" ? window.location.origin : undefined;
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: metadata?.fullName || "",
          position: metadata?.position || "",
          division: metadata?.division || "",
          role: metadata?.role || "member",
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const needsConfirmation = !data.session;

    return {
      success: true,
      user: data.user,
      session: data.session,
      isConfirmationNeeded: needsConfirmation,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "เกิดข้อผิดพลาดในการลงทะเบียน Supabase Auth",
    };
  }
}

/**
 * Sign in with OAuth provider (Google or LINE)
 */
export async function signInWithOAuth(
  provider: "google" | "line" | "github"
): Promise<{ success: boolean; error?: string }> {
  if (provider === "line") {
    return signInWithLine();
  }

  if (!supabase) {
    return { success: false, error: "ไม่ได้กำหนดค่าเชื่อมต่อ Supabase" };
  }

  try {
    const redirectUrl = typeof window !== "undefined" ? window.location.origin : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || `เกิดข้อผิดพลาดในการล็อกอินด้วย ${provider}`,
    };
  }
}

/**
 * Sign in with LINE Login (OAuth 2.0 / OpenID Connect)
 */
export async function signInWithLine(customRedirectUri?: string): Promise<{ success: boolean; error?: string }> {
  const lineChannelId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID || "1656002115";
  const redirectUrl =
    customRedirectUri ||
    (process.env.NEXT_PUBLIC_LINE_REDIRECT_URI
      ? process.env.NEXT_PUBLIC_LINE_REDIRECT_URI
      : typeof window !== "undefined"
      ? `${window.location.origin}`
      : "http://localhost:3000");

  if (!lineChannelId) {
    return {
      success: false,
      error: "ยังไม่ได้ระบุ NEXT_PUBLIC_LINE_CHANNEL_ID ใน .env.local หรือ Supabase",
    };
  }

  try {
    const state = Math.random().toString(36).substring(2, 15);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("line_oauth_state", state);
      sessionStorage.setItem("line_redirect_uri", redirectUrl);
      const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${lineChannelId}&redirect_uri=${encodeURIComponent(
        redirectUrl
      )}&state=${state}&scope=profile%20openid%20email`;
      window.location.href = lineAuthUrl;
    }
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ LINE Login",
    };
  }
}

/**
 * Sign out current user from Supabase Auth
 */
export async function signOutUser(): Promise<boolean> {
  if (!supabase) return true;
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn("Supabase signOut error:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error signing out:", err);
    return false;
  }
}

/**
 * Get current active Supabase Auth session
 */
export async function getSupabaseSession(): Promise<any> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session;
  } catch (err) {
    return null;
  }
}

/**
 * Get current active Supabase Auth user
 */
export async function getSupabaseUser(): Promise<any> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch (err) {
    return null;
  }
}

/**
 * Subscribe to Supabase Auth state changes
 */
export function subscribeToAuthChanges(
  callback: (event: string, session: any) => void
) {
  if (!supabase) return { unsubscribe: () => {} };
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return subscription;
}

/**
 * Send password reset email via Supabase Auth
 */
export async function sendPasswordResetEmail(
  email: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "ไม่ได้กำหนดค่าเชื่อมต่อ Supabase" };
  }
  try {
    const redirectUrl = typeof window !== "undefined" ? window.location.origin : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectUrl,
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "เกิดข้อผิดพลาดในการส่งอีเมลรีเซ็ตรหัสผ่าน" };
  }
}

/**
 * Find or create a Member object linked to a Supabase Auth User
 */
export function findOrMapAuthMember(authUser: any, availableMembers: Member[]): Member {
  const emailLower = (authUser?.email || "").toLowerCase().trim();
  const matched = availableMembers.find(
    (m) => m.email.toLowerCase().trim() === emailLower || m.id === authUser.id
  );

  if (matched) {
    return matched;
  }

  // Create member from metadata if not in existing directory
  const metadata = authUser?.user_metadata || {};
  const fullName = metadata.full_name || metadata.name || authUser?.email?.split("@")[0] || "ผู้ใช้งานใหม่";
  const nameParts = fullName.split(" ");
  const firstName = nameParts[0] || "ผู้ใช้งาน";
  const lastName = nameParts.slice(1).join(" ") || "";

  return {
    id: authUser.id || `usr_${Date.now()}`,
    prefix: "",
    firstName,
    lastName,
    name: fullName,
    personnelType: "ข้าราชการ",
    position: metadata.position || "เจ้าหน้าที่ปฏิบัติการ",
    division: metadata.division || "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์",
    department: metadata.division || "ฝ่ายบริหารทั่วไป",
    email: authUser.email || "user@m-society.go.th",
    phone: "-",
    lineId: "-",
    role: (metadata.role as Role) || "member",
    status: "active",
    avatarUrl: metadata.avatar_url || undefined,
    avatarText: firstName.slice(0, 2),
    joinedDate: "วันนี้",
  };
}

