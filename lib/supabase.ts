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
  TaskVisibility,
  TaskSubtask,
  MeetingItem,
  MeetingRoomMaster,
  CircularDocument,
  CircularAttachment,
  CircularUrgency,
  CircularSecretLevel,
  OfficialDocumentType,
} from "./types";
import {
  INITIAL_MEMBERS,
  INITIAL_SYSTEM_MODULES,
  INITIAL_ACCESS_REQUESTS,
  INITIAL_AUDIT_LOGS,
  isOperationalMember,
  getOperationalMembers,
  isEligibleDriver,
  getEligibleDrivers,
} from "./rbac";
import {
  INITIAL_VEHICLES,
  INITIAL_BOOKING_REQUESTS,
} from "./carbooking-data";
import { DEFAULT_CHAT_GROUPS, INITIAL_CHAT_MESSAGES } from "./chat-data";
import { DEFAULT_ROOMS } from "./meeting-data";
import { formatIsoDateOnly, THAI_SHORT_MONTH_NAMES } from "./calendar";

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
 * Debounce helper to prevent rapid bursts of realtime events from flooding queries
 */
function createDebouncedFetcher<T>(
  fetcher: () => Promise<T>,
  callback: (data: T) => void,
  delayMs = 300
) {
  let timer: any = null;
  return () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        const data = await fetcher();
        callback(data);
      } catch (err) {
        console.warn("Debounced fetcher error:", err);
      }
    }, delayMs);
  };
}

/**
 * Subscription Multiplexer (Observer Pattern) for table-based realtime subscriptions.
 * Ensures exactly ONE Supabase channel is opened per table, regardless of how many
 * components or pages subscribe to it. This prevents "cannot add postgres_changes callbacks
 * after subscribe()" collisions and excessive connection/egress usage.
 */
function createTableSubscriptionMultiplexer<T>(
  tableName: string,
  fetcher: () => Promise<T>,
  debounceMs = 300
) {
  const subscribers = new Set<(data: T) => void>();
  let channel: any = null;
  let timer: any = null;

  return (callback: (data: T) => void) => {
    subscribers.add(callback);

    if (!channel && supabase) {
      channel = supabase
        .channel(`public:${tableName}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: tableName },
          () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(async () => {
              try {
                const data = await fetcher();
                subscribers.forEach((cb) => {
                  try {
                    cb(data);
                  } catch (e) {
                    console.error(`Error in subscriber callback for ${tableName}:`, e);
                  }
                });
              } catch (err) {
                console.warn(`Multiplexer fetcher error for ${tableName}:`, err);
              }
            }, debounceMs);
          }
        )
        .subscribe();
    }

    return () => {
      subscribers.delete(callback);
      if (subscribers.size === 0 && channel) {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        supabase?.removeChannel(channel);
        channel = null;
      }
    };
  };
}

/**
 * Known Thai honorific prefixes and abbreviations
 */
export const KNOWN_THAI_PREFIXES = [
  "นางสาว",
  "นาง",
  "นาย",
  "น.ส.",
  "ดร.",
  "ว่าที่ ร.ต. หญิง",
  "ว่าที่ ร.ต.",
  "ว่าที่ร้อยตรี",
  "ร.ต.อ.",
  "พ.ต.ต.",
  "พ.ต.ท.",
  "พ.ต.อ.",
  "พล.ต.",
  "พล.ต.ท.",
  "พล.ต.อ.",
  "Mr.",
  "Mrs.",
  "Ms.",
  "Dr.",
];

/**
 * Formats and ensures a member's full name starts with an appropriate title/prefix.
 * Prevents double prefixes (e.g. "นายนาย...", "นางสาวนางสาว...")
 * and respects Thai vs English formatting.
 */
export function formatFullMemberName(
  prefix?: string | null,
  name?: string | null,
  firstName?: string | null,
  lastName?: string | null
): string {
  const p = (prefix || "").trim();
  const f = (firstName || "").trim();
  const l = (lastName || "").trim();
  let baseName = (name || "").trim();

  // If baseName is empty, try to construct it from firstName and lastName
  if (!baseName) {
    baseName = [f, l].filter(Boolean).join(" ").trim();
  }

  // If still empty
  if (!baseName) {
    return p || "ผู้ใช้งาน";
  }

  // If no prefix is requested, return baseName as is
  if (!p) {
    return baseName;
  }

  // Check if baseName already starts with the requested prefix (exact match or with trailing space)
  if (baseName.startsWith(p)) {
    return baseName;
  }

  // Check if baseName already starts with any other recognized prefix
  const alreadyHasPrefix = KNOWN_THAI_PREFIXES.some(
    (known) => baseName.startsWith(known)
  );
  if (alreadyHasPrefix) {
    return baseName;
  }

  // Determine whether to add a space between prefix and name
  // Standard Thai names do not have space between นาย/นาง/นางสาว and first name (e.g. นายสมชาย, นางสาวสมหญิง)
  // Prefix with dot or space (e.g. "ว่าที่ ร.ต.") or English names use space
  const isThai = /^[\u0E00-\u0E7F]/.test(baseName);
  const needsSpace = !isThai || p.includes(".") || p.includes(" ");

  return needsSpace ? `${p} ${baseName}` : `${p}${baseName}`;
}

/**
 * Map Supabase user row to Member object
 */
export function mapRowToMember(row: any): Member {
  const prefix = row.prefix ?? "";
  const firstName = row.first_name || (row.name ? row.name.split(" ")[0] : "");
  const lastName = row.last_name ?? "";
  const fullName = formatFullMemberName(prefix, row.name, firstName, lastName);

  return {
    id: row.id,
    prefix,
    firstName,
    lastName,
    nickname: row.nickname || undefined,
    name: fullName,
    personnelType: row.personnel_type ? (row.personnel_type as PersonnelType) : undefined,
    position: row.position || "รอกำหนดตำแหน่ง",
    division: row.division || "รอกำหนดกลุ่มงาน",
    department: row.division || "รอกำหนดกลุ่มงาน",
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
    avatarText: (firstName || fullName || "U").slice(0, 2),
    avatarUrl: row.avatar_url || undefined,
  };
}

/**
 * Map Member object to Supabase user row
 */
export function mapMemberToRow(member: Member): any {
  const fullName = formatFullMemberName(
    member.prefix,
    member.name,
    member.firstName,
    member.lastName
  );

  return {
    id: member.id,
    prefix: member.prefix || "",
    first_name: member.firstName || member.name,
    last_name: member.lastName || "",
    nickname: member.nickname || null,
    name: fullName,
    personnel_type: member.personnelType || null,
    position: member.position || "รอกำหนดตำแหน่ง",
    division: member.division || "รอกำหนดกลุ่มงาน",
    email: member.email,
    phone: member.phone && member.phone !== "-" ? member.phone : null,
    line_id: member.lineId && member.lineId !== "-" ? member.lineId : null,
    avatar_url: member.avatarUrl || null,
    role: member.role || "member",
  };
}

const MEMBERS_STORAGE_KEY = "smartmso_members_cache_v3";
const LEGACY_MEMBERS_STORAGE_KEYS = [
  "smartmso_members_cache_v2",
  "omnioffice_members_cache_v2",
];

/**
 * Filter out legacy mock user IDs (usr_mock only)
 */
export function isRealMember(m: Member): boolean {
  if (!m || !m.id) return false;
  // Filter out only legacy mock user 'usr_mock', keeping real seeded personnel (usr_1 through usr_99), syno_*, line_*, etc.
  if (m.id === "usr_mock") return false;
  return true;
}

export { isOperationalMember, getOperationalMembers, isEligibleDriver, getEligibleDrivers };

/**
 * Get members from local cache or fallback to INITIAL_MEMBERS
 */
export function getLocalMembers(): Member[] {
  if (typeof window === "undefined") return INITIAL_MEMBERS;
  try {
    // Purge legacy storage keys that may contain mock data
    LEGACY_MEMBERS_STORAGE_KEYS.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {}
    });

    const raw = localStorage.getItem(MEMBERS_STORAGE_KEY);
    if (!raw) return INITIAL_MEMBERS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter(isRealMember).map((m: Member) => ({
        ...m,
        name: formatFullMemberName(m.prefix, m.name, m.firstName, m.lastName),
      }));
    }
    return INITIAL_MEMBERS;
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
    const cleanMembers = members.filter(isRealMember).map((m) => ({
      ...m,
      name: formatFullMemberName(m.prefix, m.name, m.firstName, m.lastName),
    }));
    localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(cleanMembers));
  } catch (e) {
    console.warn("Could not save members to localStorage:", e);
  }
}

/**
 * Fetch members from Supabase, with automatic local cache synchronization and fallback
 */
export async function fetchMembers(): Promise<Member[]> {
  const localMembers = getLocalMembers().filter(isRealMember);
  if (!supabase) return localMembers;

  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.warn("Supabase fetch members returned error, using cached members:", error);
      return localMembers;
    }

    if (!data || data.length === 0) {
      return localMembers;
    }

    const liveMembers = data.map(mapRowToMember).filter(isRealMember);
    const liveIds = new Set(liveMembers.map((m) => m.id));
    const localMap = new Map(localMembers.map((m) => [m.id, m]));
    const mergedLive = liveMembers.map((live) => {
      const local = localMap.get(live.id);
      if (!local) return live;
      const prefix = live.prefix || local.prefix || "";
      const firstName = live.firstName || local.firstName || "";
      const lastName = live.lastName || local.lastName || "";
      // If live.name from DB is more complete or has prefix, prefer live.name
      const chosenName =
        live.name && live.name.length >= (local.name?.length || 0)
          ? live.name
          : local.name || live.name;
      const formattedName = formatFullMemberName(prefix, chosenName, firstName, lastName);

      // Live database from Supabase is Single Source of Truth; fallback to local only when live is missing
      return {
        ...local,
        ...live,
        prefix: prefix,
        firstName: firstName,
        lastName: lastName,
        name: formattedName,
        nickname: live.nickname || local.nickname,
        position: live.position && live.position !== "รอกำหนดตำแหน่ง" ? live.position : local.position || live.position,
        division: live.division && live.division !== "รอกำหนดกลุ่มงาน" ? live.division : local.division || live.division,
        department: live.department || local.department,
        personnelType: live.personnelType || local.personnelType,
        phone: live.phone && live.phone !== "-" ? live.phone : local.phone || live.phone,
        lineId: live.lineId && live.lineId !== "-" ? live.lineId : local.lineId || live.lineId,
        avatarUrl: live.avatarUrl || local.avatarUrl,
        avatarText: live.avatarText || local.avatarText,
        role: live.role || local.role,
      };
    });
    // Preserve local-only real members (e.g. offline created users or local LINE profiles not yet synced)
    const localOnly = localMembers
      .filter((m) => !liveIds.has(m.id) && isRealMember(m))
      .map((m) => ({
        ...m,
        name: formatFullMemberName(m.prefix, m.name, m.firstName, m.lastName),
      }));
    const mergedMembers = [...mergedLive, ...localOnly];

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
const membersMultiplexer = createTableSubscriptionMultiplexer("users", fetchMembers, 300);

export function subscribeToMembers(callback: (members: Member[]) => void) {
  return membersMultiplexer(callback);
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

export const ACCESS_REQUESTS_STORAGE_KEY = "smartmso_access_requests_cache_v1";
export const LEGACY_ACCESS_REQUESTS_STORAGE_KEY = "smartmso_access_requests";
export const PREV_LEGACY_ACCESS_REQUESTS_STORAGE_KEY = "omnioffice_access_requests";

export function isMockAccessRequest(r: any): boolean {
  if (!r) return true;
  const name = r.name || "";
  const id = r.id || "";
  const email = r.email || "";
  return (
    id === "req_1" ||
    id === "req_2" ||
    name.includes("พงษ์ศักดิ์") ||
    name.includes("กานดา") ||
    email.includes("pongsak.r") ||
    email.includes("kanda.t")
  );
}

export function getLocalAccessRequests(): AccessRequest[] {
  if (typeof window === "undefined") return INITIAL_ACCESS_REQUESTS;
  try {
    // Purge old legacy keys that held previous mock/demo requests
    localStorage.removeItem(LEGACY_ACCESS_REQUESTS_STORAGE_KEY);
    localStorage.removeItem(PREV_LEGACY_ACCESS_REQUESTS_STORAGE_KEY);

    const raw = localStorage.getItem(ACCESS_REQUESTS_STORAGE_KEY);
    if (!raw) return INITIAL_ACCESS_REQUESTS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const cleaned = parsed.filter((r) => r && r.id && !isMockAccessRequest(r));
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(ACCESS_REQUESTS_STORAGE_KEY, JSON.stringify(cleaned));
      }
      return cleaned;
    }
    return INITIAL_ACCESS_REQUESTS;
  } catch {
    return INITIAL_ACCESS_REQUESTS;
  }
}

export function saveLocalAccessRequests(requests: AccessRequest[]) {
  if (typeof window === "undefined") return;
  try {
    const cleaned = requests.filter((r) => !isMockAccessRequest(r));
    const serialized = JSON.stringify(cleaned);
    localStorage.setItem(ACCESS_REQUESTS_STORAGE_KEY, serialized);
    // Ensure legacy keys are removed permanently
    localStorage.removeItem(LEGACY_ACCESS_REQUESTS_STORAGE_KEY);
    localStorage.removeItem(PREV_LEGACY_ACCESS_REQUESTS_STORAGE_KEY);
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

    if (error || !data) {
      return localList;
    }

    const liveList = data.map(mapRowToAccessRequest).filter((r) => !isMockAccessRequest(r));
    // Live database is single source of truth; synchronize cache
    saveLocalAccessRequests(liveList);
    return liveList;
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
const accessRequestsMultiplexer = createTableSubscriptionMultiplexer("access_requests", fetchAccessRequests, 300);

export function subscribeToAccessRequests(callback: (requests: AccessRequest[]) => void) {
  return accessRequestsMultiplexer(callback);
}

// ==========================================
// AUDIT LOGS (Security & Activity Tracking)
// ==========================================

/**
 * Map Supabase audit_logs row to AuditLog object
 */
export function mapRowToAuditLog(row: any): AuditLog {
  return {
    id: row.id,
    timestamp: row.timestamp
      ? new Date(row.timestamp).toLocaleString("th-TH", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : new Date().toLocaleString("th-TH"),
    actor: row.actor_name || "ระบบ",
    action: row.action,
    target: row.target,
    status: (row.status as "success" | "denied") || "success",
    // Keep raw ISO for sorting
    _rawTimestamp: row.timestamp || new Date().toISOString(),
  } as AuditLog & { _rawTimestamp: string };
}

/**
 * Insert a new audit log entry into Supabase
 */
export async function insertAuditLog(params: {
  actorId?: string;
  actorName: string;
  action: string;
  target: string;
  status?: "success" | "denied";
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase.from("audit_logs").insert({
      actor_id: params.actorId || null,
      actor_name: params.actorName,
      action: params.action,
      target: params.target,
      status: params.status || "success",
      metadata: params.metadata || null,
    });

    if (error) {
      console.warn("Could not insert audit log:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Error inserting audit log:", err);
    return false;
  }
}

/**
 * Fetch audit logs from Supabase with optional filters
 */
export async function fetchAuditLogs(options?: {
  limit?: number;
  actorName?: string;
  status?: "success" | "denied";
  search?: string;
}): Promise<AuditLog[]> {
  if (!supabase) return INITIAL_AUDIT_LOGS;

  try {
    let query = supabase
      .from("audit_logs")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(options?.limit ?? 50);

    if (options?.status) {
      query = query.eq("status", options.status);
    }
    if (options?.actorName) {
      query = query.ilike("actor_name", `%${options.actorName}%`);
    }
    if (options?.search) {
      query = query.or(
        `action.ilike.%${options.search}%,target.ilike.%${options.search}%,actor_name.ilike.%${options.search}%`
      );
    }

    const { data, error } = await query;

    if (error || !data) {
      console.warn("Could not fetch audit logs:", error?.message);
      return INITIAL_AUDIT_LOGS;
    }

    return data.map(mapRowToAuditLog);
  } catch (err) {
    console.warn("Error fetching audit logs:", err);
    return INITIAL_AUDIT_LOGS;
  }
}

/**
 * Setup Realtime subscription for audit_logs
 * Passes single new log incrementally when an INSERT happens, avoiding SELECT * from table.
 * Multiplexed so AppContext and AuditTab share a single connection.
 */
const auditLogSubscribers = new Set<(logOrLogs: AuditLog | AuditLog[]) => void>();
let auditLogsChannel: any = null;

export function subscribeToAuditLogs(callback: (logOrLogs: AuditLog | AuditLog[]) => void) {
  if (!supabase) return () => {};
  auditLogSubscribers.add(callback);

  if (!auditLogsChannel) {
    auditLogsChannel = supabase
      .channel("public:audit_logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_logs" },
        async (payload) => {
          if (payload?.new) {
            const newLog = mapRowToAuditLog(payload.new);
            auditLogSubscribers.forEach((cb) => {
              try {
                cb(newLog);
              } catch (e) {
                console.error("audit log sub error:", e);
              }
            });
          } else {
            const updated = await fetchAuditLogs({ limit: 50 });
            auditLogSubscribers.forEach((cb) => {
              try {
                cb(updated);
              } catch (e) {
                console.error("audit log sub error:", e);
              }
            });
          }
        }
      )
      .subscribe();
  }

  return () => {
    auditLogSubscribers.delete(callback);
    if (auditLogSubscribers.size === 0 && auditLogsChannel) {
      supabase?.removeChannel(auditLogsChannel);
      auditLogsChannel = null;
    }
  };
}

/**
 * Backward-compatible wrapper — save a full AuditLog object to Supabase
 */
export async function saveAuditLog(log: AuditLog): Promise<boolean> {
  return insertAuditLog({
    actorName: log.actor,
    action: log.action,
    target: log.target,
    status: log.status,
  });
}

/**
 * Universal helper to record audit logs — used throughout page.tsx
 */
export async function recordAuditLog(
  actor: string,
  action: string,
  target: string,
  status: "success" | "denied" = "success"
): Promise<boolean> {
  return insertAuditLog({ actorName: actor, action, target, status });
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
    vehicleId: row.vehicle_id || "",
    vehicleName: row.vehicle_name || "รอฝ่ายบริหารจัดสรร",
    licensePlate: row.license_plate || "-",
    requesterId: row.requester_id || "",
    requesterName: row.requester_name || "",
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
    estimatedDistance: row.estimated_distance ? Number(row.estimated_distance) : undefined,
    requireDriver: Boolean(row.require_driver),
    assignedDriver: row.assigned_driver || undefined,
    fuelBudgetRequested: Boolean(row.fuel_budget_requested),
    fuelBudgetAmount: row.fuel_budget_amount ? Number(row.fuel_budget_amount) : undefined,
    fuelBudgetSource: row.fuel_budget_source || undefined,
    status: row.status,
    createdAt: row.created_at,
    divisionReviewerId: row.division_reviewer_id || undefined,
    divisionReviewerName: row.division_reviewer_name || undefined,
    divisionReviewerPosition: row.division_reviewer_position || undefined,
    divisionReviewerRole: row.division_reviewer_role || undefined,
    divisionReviewerNotes: row.division_reviewer_notes || undefined,
    divisionReviewerActionAt: row.division_reviewer_action_at || undefined,
    fleetDispatcherId: row.fleet_dispatcher_id || undefined,
    fleetDispatcherName: row.fleet_dispatcher_name || undefined,
    fleetDispatcherPosition: row.fleet_dispatcher_position || undefined,
    fleetDispatcherNotes: row.fleet_dispatcher_notes || undefined,
    fleetDispatcherActionAt: row.fleet_dispatcher_action_at || undefined,
    adminHeadId: row.admin_head_id || undefined,
    adminHeadName: row.admin_head_name || undefined,
    adminHeadNotes: row.admin_head_notes || undefined,
    adminHeadActionAt: row.admin_head_action_at || undefined,
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
    keyReturned: row.key_returned !== undefined ? Boolean(row.key_returned) : undefined,
    hasIssueReported: Boolean(row.has_issue_reported),
    issueReportDetails: row.issue_report_details || undefined,
    needsMaintenance: Boolean(row.needs_maintenance),
    returnReport: row.return_report || undefined,
    notifications: Array.isArray(row.notifications) ? row.notifications : undefined,
  };
}

function sanitizeCarBookingFk(val: string | null | undefined): string | null {
  if (!val || typeof val !== "string") return null;
  const trimmed = val.trim();
  if (trimmed === "" || trimmed === "-" || trimmed === "null" || trimmed === "undefined") return null;
  return trimmed;
}

export function mapCarBookingToRow(b: CarBookingRequest): any {
  return {
    id: b.id,
    request_no: b.requestNo,
    vehicle_id: sanitizeCarBookingFk(b.vehicleId),
    vehicle_name: b.vehicleName || "รอฝ่ายบริหารจัดสรร",
    license_plate: b.licensePlate || "-",
    requester_id: sanitizeCarBookingFk(b.requesterId),
    requester_name: b.requesterName,
    requester_position: b.requesterPosition || null,
    requester_division: b.requesterDivision || null,
    requester_phone: b.requesterPhone || null,
    purpose: b.purpose,
    destination: b.destination,
    origin: b.origin || "สำนักงาน พมจ.กำแพงเพชร",
    departure_time: b.departureTime,
    return_time: b.returnTime,
    passenger_count: b.passengerCount || 1,
    passengers_list: b.passengersList || null,
    estimated_distance: b.estimatedDistance || null,
    require_driver: b.requireDriver ?? true,
    assigned_driver: b.assignedDriver || null,
    fuel_budget_requested: b.fuelBudgetRequested || false,
    fuel_budget_amount: b.fuelBudgetAmount || null,
    fuel_budget_source: b.fuelBudgetSource || null,
    status: b.status || "pending_division_head",
    created_at: b.createdAt || new Date().toISOString(),
    division_reviewer_id: b.divisionReviewerId || null,
    division_reviewer_name: b.divisionReviewerName || null,
    division_reviewer_position: b.divisionReviewerPosition || null,
    division_reviewer_role: b.divisionReviewerRole || null,
    division_reviewer_notes: b.divisionReviewerNotes || null,
    division_reviewer_action_at: b.divisionReviewerActionAt || null,
    fleet_dispatcher_id: b.fleetDispatcherId || null,
    fleet_dispatcher_name: b.fleetDispatcherName || null,
    fleet_dispatcher_position: b.fleetDispatcherPosition || null,
    fleet_dispatcher_notes: b.fleetDispatcherNotes || null,
    fleet_dispatcher_action_at: b.fleetDispatcherActionAt || null,
    admin_head_id: b.adminHeadId || null,
    admin_head_name: b.adminHeadName || null,
    admin_head_notes: b.adminHeadNotes || null,
    admin_head_action_at: b.adminHeadActionAt || null,
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
    key_returned: b.keyReturned ?? false,
    has_issue_reported: b.hasIssueReported ?? false,
    issue_report_details: b.issueReportDetails || null,
    needs_maintenance: b.needsMaintenance ?? false,
    return_report: b.returnReport || null,
    notifications: b.notifications || [],
  };
}

// In-memory cache for fleet and bookings (Single Source of Truth is Supabase; avoid localStorage desync)
let inMemoryVehicles: Vehicle[] | null = null;
let inMemoryCarBookings: CarBookingRequest[] | null = null;

export async function fetchVehicles(): Promise<Vehicle[]> {
  if (!supabase) return inMemoryVehicles || INITIAL_VEHICLES;
  try {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .order("id", { ascending: true });
    if (error || !data || data.length === 0) return inMemoryVehicles || INITIAL_VEHICLES;
    const liveVehicles = data.map(mapRowToVehicle);
    inMemoryVehicles = liveVehicles;
    return liveVehicles;
  } catch {
    return inMemoryVehicles || INITIAL_VEHICLES;
  }
}

export async function saveVehicle(vehicle: Vehicle): Promise<boolean> {
  // Optimistically update in-memory cache
  if (inMemoryVehicles) {
    const exists = inMemoryVehicles.some((v) => v.id === vehicle.id);
    inMemoryVehicles = exists
      ? inMemoryVehicles.map((v) => (v.id === vehicle.id ? vehicle : v))
      : [vehicle, ...inMemoryVehicles];
  }

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
  if (!supabase) return inMemoryCarBookings || [];
  try {
    const { data, error } = await supabase
      .from("car_bookings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Could not fetch car bookings from Supabase:", error.message);
      return inMemoryCarBookings || [];
    }
    if (!data || data.length === 0) {
      return inMemoryCarBookings || [];
    }

    const liveBookings = data.map(mapRowToCarBooking);
    inMemoryCarBookings = liveBookings;
    return liveBookings;
  } catch (err) {
    console.warn("Exception fetching car bookings from Supabase:", err);
    return inMemoryCarBookings || [];
  }
}

export async function saveCarBooking(booking: CarBookingRequest): Promise<boolean> {
  // Optimistically update in-memory cache
  if (inMemoryCarBookings) {
    const exists = inMemoryCarBookings.some((b) => b.id === booking.id);
    inMemoryCarBookings = exists
      ? inMemoryCarBookings.map((b) => (b.id === booking.id ? booking : b))
      : [booking, ...inMemoryCarBookings];
  }

  if (!supabase) return true;
  try {
    const row = mapCarBookingToRow(booking);
    const { error } = await supabase.from("car_bookings").upsert(row);
    if (error) {
      console.warn("saveCarBooking initial upsert error:", error.code, error.message);
      // Fallback: If foreign key error code 23503 occurs
      if (error.code === "23503") {
        console.warn("FK constraint violation (23503) on car_bookings, retrying with sanitized foreign keys...");
        const retryRow = { ...row };
        if (error.message.includes("vehicle_id")) {
          retryRow.vehicle_id = null;
        }
        if (error.message.includes("requester_id")) {
          retryRow.requester_id = null;
        }
        if (!error.message.includes("vehicle_id") && !error.message.includes("requester_id")) {
          retryRow.vehicle_id = null;
          retryRow.requester_id = null;
        }
        const retryRes = await supabase.from("car_bookings").upsert(retryRow);
        if (retryRes.error) {
          console.error("saveCarBooking retry failed:", retryRes.error.message);
          return false;
        }
        return true;
      }
      return false;
    }
    return true;
  } catch (err) {
    console.error("Exception in saveCarBooking:", err);
    return false;
  }
}

const vehiclesMultiplexer = createTableSubscriptionMultiplexer("vehicles", fetchVehicles, 300);

export function subscribeToVehicles(callback: (vehicles: Vehicle[]) => void) {
  return vehiclesMultiplexer(callback);
}

const carBookingsMultiplexer = createTableSubscriptionMultiplexer("car_bookings", fetchCarBookings, 300);

export function subscribeToCarBookings(callback: (bookings: CarBookingRequest[]) => void) {
  return carBookingsMultiplexer(callback);
}

export async function deleteVehicle(id: string): Promise<boolean> {
  if (inMemoryVehicles) {
    inMemoryVehicles = inMemoryVehicles.filter((v) => v.id !== id);
  }

  if (!supabase) return true;
  try {
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteCarBooking(id: string): Promise<boolean> {
  if (inMemoryCarBookings) {
    inMemoryCarBookings = inMemoryCarBookings.filter((b) => b.id !== id);
  }

  if (!supabase) return true;
  try {
    const { error } = await supabase.from("car_bookings").delete().eq("id", id);
    if (error) {
      console.error("Error deleting car booking from Supabase:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Exception deleting car booking from Supabase:", err);
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
    memberIds: Array.isArray(row.member_ids)
      ? row.member_ids.filter((id: string) => id !== "usr_1" && id !== "usr_mock")
      : [],
    pinnedMessageIds: Array.isArray(row.pinned_message_ids) ? row.pinned_message_ids : [],
    createdAt: row.created_at ? new Date(row.created_at).toLocaleDateString("th-TH") : "วันนี้",
    createdBy: row.created_by && row.created_by !== "usr_1" && row.created_by !== "usr_mock" ? row.created_by : undefined,
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
    attachmentUrl: row.attachment_url || meta.attachment_url || undefined,
    attachments: Array.isArray(meta.attachments) && meta.attachments.length > 0
      ? meta.attachments
      : meta.attachment_name || row.attachment_name
      ? [
          {
            id: `att_${row.id || "1"}`,
            name: meta.attachment_name || row.attachment_name,
            type: meta.attachment_type || row.attachment_type || "doc",
            size: meta.attachment_size || row.attachment_size || "-",
            url: row.attachment_url || meta.attachment_url || undefined,
          },
        ]
      : undefined,
    isPinned: Boolean(meta.is_pinned ?? row.is_pinned),
  };
}

export function mapChatMessageToRow(m: ChatMessage): any {
  const primaryAtt = m.attachments?.[0];

  // Helper to determine safe URL (never store raw Base64 data URLs > 2000 chars in database)
  const sanitizeUrl = (url?: string, name?: string, nasPath?: string): string | null => {
    if (url && !url.startsWith("data:") && url.length < 2000) return url;
    if (nasPath) return `/api/nas/download?path=${encodeURIComponent(nasPath)}`;
    if (name) return `/api/nas/download?path=${encodeURIComponent(`/chat_attachments/${name}`)}`;
    return null;
  };

  const primaryCleanUrl = sanitizeUrl(
    primaryAtt?.url || m.attachmentUrl,
    primaryAtt?.name || m.attachmentName,
    primaryAtt?.nasPath
  );

  // Sanitize attachments array so NO dataUrl or gigantic base64 is saved into Supabase
  const rawAttachments = m.attachments || (primaryAtt ? [primaryAtt] : []);
  const sanitizedAttachments = rawAttachments.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    size: a.size,
    mimeType: a.mimeType,
    url: sanitizeUrl(a.url, a.name, a.nasPath) || undefined,
    nasPath: a.nasPath || (a.name ? `/chat_attachments/${a.name}` : undefined),
    storageType: a.storageType || "nas",
    uploadedToNas: a.uploadedToNas ?? true,
    // dataUrl is deliberately stripped to protect database & network payloads
  }));

  // Sanitize sender avatar (avoid repeating 32KB+ base64 per row if not a clean URL)
  const safeAvatar =
    m.senderAvatar && (m.senderAvatar.startsWith("http") || m.senderAvatar.length < 5000)
      ? m.senderAvatar
      : null;

  return {
    id: m.id,
    channel_id: m.groupId,
    // Guard against FK violation: only pass user_id if syno_ ID
    user_id: m.senderId && m.senderId.startsWith("syno_") ? m.senderId : null,
    sender_name: m.senderName,
    sender_avatar: safeAvatar,
    sender_role: m.senderRole || "member",
    sender_position: m.senderPosition || null,
    content: m.text,
    tag: m.tag || null,
    attachment_url: primaryCleanUrl,
    attachment_metadata: {
      attachment_name: primaryAtt?.name || m.attachmentName || null,
      attachment_type: primaryAtt?.type || m.attachmentType || null,
      attachment_size: primaryAtt?.size || m.attachmentSize || null,
      attachment_url: primaryCleanUrl,
      attachments: sanitizedAttachments,
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

export async function deleteChatGroup(groupId: string): Promise<boolean> {
  if (!supabase) return true;
  try {
    await supabase.from("messages").delete().eq("channel_id", groupId);
    const { error } = await supabase.from("chat_channels").delete().eq("id", groupId);
    return !error;
  } catch (err) {
    console.warn("deleteChatGroup error:", err);
    return false;
  }
}

export async function fetchChatMessages(): Promise<ChatMessage[]> {
  if (!supabase) return INITIAL_CHAT_MESSAGES;
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error || !data || data.length === 0) return INITIAL_CHAT_MESSAGES;
    return [...data].reverse().map(mapRowToChatMessage);
  } catch {
    return INITIAL_CHAT_MESSAGES;
  }
}

export async function sendChatMessage(msg: ChatMessage): Promise<boolean> {
  if (!supabase) return true;
  try {
    const row = mapChatMessageToRow(msg);
    const { error } = await supabase.from("messages").upsert(row);
    if (error) {
      console.warn("Supabase sendChatMessage error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("sendChatMessage network error:", err);
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

export interface ChatRealtimeHandlers {
  onInsert?: (msg: ChatMessage) => void;
  onUpdate?: (msg: ChatMessage) => void;
  onDelete?: (msgId: string) => void;
  onChange?: () => void;
}

export interface ChatGroupRealtimeHandlers {
  onInsert?: (group: ChatGroup) => void;
  onUpdate?: (group: ChatGroup) => void;
  onDelete?: (groupId: string) => void;
  onChange?: () => void;
}

const chatMessageSubscribers = new Set<(() => void) | ChatRealtimeHandlers>();
let chatMessagesChannel: any = null;

export function subscribeToChatMessages(handler: (() => void) | ChatRealtimeHandlers) {
  if (!supabase) return () => {};
  chatMessageSubscribers.add(handler);

  if (!chatMessagesChannel) {
    chatMessagesChannel = supabase
      .channel("public:messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          const isInsert = payload.eventType === "INSERT" && payload.new;
          const isUpdate = payload.eventType === "UPDATE" && payload.new;
          const isDelete = payload.eventType === "DELETE" && payload.old;

          const msg = isInsert || isUpdate ? mapRowToChatMessage(payload.new) : null;
          const delId = isDelete ? String(payload.old.id) : null;

          chatMessageSubscribers.forEach((h) => {
            try {
              if (typeof h === "function") {
                h();
                return;
              }
              h.onChange?.();
              if (isInsert && msg) h.onInsert?.(msg);
              else if (isUpdate && msg) h.onUpdate?.(msg);
              else if (isDelete && delId) h.onDelete?.(delId);
            } catch (e) {
              console.error("Chat message sub error:", e);
            }
          });
        }
      )
      .subscribe();
  }

  return () => {
    chatMessageSubscribers.delete(handler);
    if (chatMessageSubscribers.size === 0 && chatMessagesChannel) {
      supabase?.removeChannel(chatMessagesChannel);
      chatMessagesChannel = null;
    }
  };
}

const chatGroupSubscribers = new Set<(() => void) | ChatGroupRealtimeHandlers>();
let chatGroupsChannel: any = null;

export function subscribeToChatGroups(handler: (() => void) | ChatGroupRealtimeHandlers) {
  if (!supabase) return () => {};
  chatGroupSubscribers.add(handler);

  if (!chatGroupsChannel) {
    chatGroupsChannel = supabase
      .channel("public:chat_channels")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_channels" },
        (payload) => {
          const isInsert = payload.eventType === "INSERT" && payload.new;
          const isUpdate = payload.eventType === "UPDATE" && payload.new;
          const isDelete = payload.eventType === "DELETE" && payload.old;

          const grp = isInsert || isUpdate ? mapRowToChatGroup(payload.new) : null;
          const delId = isDelete ? String(payload.old.id) : null;

          chatGroupSubscribers.forEach((h) => {
            try {
              if (typeof h === "function") {
                h();
                return;
              }
              h.onChange?.();
              if (isInsert && grp) h.onInsert?.(grp);
              else if (isUpdate && grp) h.onUpdate?.(grp);
              else if (isDelete && delId) h.onDelete?.(delId);
            } catch (e) {
              console.error("Chat group sub error:", e);
            }
          });
        }
      )
      .subscribe();
  }

  return () => {
    chatGroupSubscribers.delete(handler);
    if (chatGroupSubscribers.size === 0 && chatGroupsChannel) {
      supabase?.removeChannel(chatGroupsChannel);
      chatGroupsChannel = null;
    }
  };
}

interface TypingMultiplexerState {
  channel: any;
  subscribers: Set<(payload: { userId: string; userName: string }) => void>;
}
const activeTypingChannels = new Map<string, TypingMultiplexerState>();

export function subscribeToTyping(
  channelId: string,
  onTyping: (payload: { userId: string; userName: string }) => void
) {
  if (!supabase) return () => {};

  let state = activeTypingChannels.get(channelId);
  if (!state) {
    state = {
      channel: null,
      subscribers: new Set(),
    };
    activeTypingChannels.set(channelId, state);
  }

  state.subscribers.add(onTyping);

  if (!state.channel) {
    const channel = supabase
      .channel(`typing:${channelId}`)
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload) {
          state?.subscribers.forEach((cb) => {
            try { cb(payload); } catch (e) { console.error("typing cb error:", e); }
          });
        }
      })
      .subscribe();
    state.channel = channel;
  }

  return () => {
    const current = activeTypingChannels.get(channelId);
    if (current) {
      current.subscribers.delete(onTyping);
      if (current.subscribers.size === 0 && current.channel) {
        supabase?.removeChannel(current.channel);
        activeTypingChannels.delete(channelId);
      }
    }
  };
}

export function broadcastTyping(channelId: string, user: { id: string; name: string }) {
  if (!supabase) return;
  const state = activeTypingChannels.get(channelId);
  if (state?.channel) {
    state.channel.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: user.id, userName: user.name, timestamp: Date.now() },
    });
    return;
  }
  const tempChannel = supabase.channel(`typing:${channelId}`);
  tempChannel.subscribe((status: string) => {
    if (status === "SUBSCRIBED") {
      tempChannel.send({
        type: "broadcast",
        event: "typing",
        payload: { userId: user.id, userName: user.name, timestamp: Date.now() },
      });
    }
  });
}

export function subscribeToOnlinePresence(
  currentUser: { id: string; name: string; avatar?: string },
  onPresenceChange: (onlineUserIds: string[]) => void
) {
  if (!supabase) return () => {};
  const channel = supabase.channel("online_officers_presence", {
    config: { presence: { key: currentUser.id } },
  });

  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const onlineIds = Object.keys(state);
      onPresenceChange(onlineIds);
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          userId: currentUser.id,
          userName: currentUser.name,
          onlineAt: new Date().toISOString(),
        });
      }
    });

  return () => {
    channel.untrack().catch(() => {});
    supabase.removeChannel(channel);
  };
}

// ==========================================
// TASKS & MEETINGS (Live Supabase Integration)
// ==========================================

export function mapRowToTask(row: any): TaskItem {
  let richMeta: any = null;
  const rawDesc = row.description || "";
  if (typeof rawDesc === "string" && rawDesc.trim().startsWith("{") && rawDesc.trim().endsWith("}")) {
    try {
      richMeta = JSON.parse(rawDesc.trim());
    } catch {
      richMeta = null;
    }
  }

  const dept = richMeta?.dept || (richMeta ? "ฝ่ายบริหารทั่วไป" : (rawDesc || "ฝ่ายบริหารทั่วไป"));
  const description = richMeta ? (richMeta.details || "") : (rawDesc || "");
  const visibility = (richMeta?.visibility as TaskVisibility) || "department";
  const targetDivision = richMeta?.targetDivision || dept;
  const createdBy = richMeta?.createdBy || undefined;
  const createdByName = richMeta?.createdByName || undefined;
  const assigneeName = richMeta?.assigneeName || row.assignee_id || "ผู้รับผิดชอบ";
  const assigneeId = richMeta?.assigneeId || (typeof row.assignee_id === "string" && row.assignee_id.trim() ? row.assignee_id.trim() : undefined);
  const subtasks: TaskSubtask[] = Array.isArray(richMeta?.subtasks) ? richMeta.subtasks : [];
  const tags: string[] = Array.isArray(richMeta?.tags) ? richMeta.tags : [];
  const reviewNotes = richMeta?.reviewNotes || undefined;
  const missionGroup = richMeta?.missionGroup || undefined;

  let dueStr = "วันนี้";
  if (row.due_date) {
    try {
      dueStr = new Date(row.due_date).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch {
      dueStr = row.due_date;
    }
  }

  return {
    id: row.id,
    title: row.title,
    dept,
    due: dueStr,
    priority: (row.priority as "high" | "medium" | "low") || "medium",
    status: (row.status as any) || "todo",
    assignee: assigneeName,
    assigneeId,
    description,
    visibility,
    targetDivision,
    createdBy,
    createdByName,
    subtasks,
    tags,
    reviewNotes,
    missionGroup,
    createdAt: row.created_at,
  };
}

export function mapTaskToRow(task: TaskItem): any {
  const isUuid =
    typeof task.id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(task.id);

  const richPayload = {
    dept: task.dept || "ฝ่ายบริหารทั่วไป",
    details: task.description || "",
    visibility: task.visibility || "department",
    targetDivision: task.targetDivision || task.dept || "ฝ่ายบริหารทั่วไป",
    createdBy: task.createdBy || null,
    createdByName: task.createdByName || null,
    assigneeName: task.assignee || null,
    assigneeId: task.assigneeId || null,
    subtasks: task.subtasks || [],
    tags: task.tags || [],
    reviewNotes: task.reviewNotes || null,
    missionGroup: task.missionGroup || null,
  };

  // Note: tasks.assignee_id in Supabase references users(id).
  // Because users can authenticate via Supabase Auth, Synology, or offline/cached profiles,
  // we preserve the full assignee details in richPayload (assigneeName, assigneeId).
  // To avoid breaking foreign key constraints on newly created or non-synced accounts,
  // we do not force assignee_id at the DB relational column level unless validated.
  const row: any = {
    title: task.title,
    description: JSON.stringify(richPayload),
    status: task.status,
    priority: task.priority,
    assignee_id: null,
  };

  if (task.due) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(task.due)) {
      row.due_date = task.due;
    } else {
      const parsed = Date.parse(task.due);
      if (!isNaN(parsed)) {
        row.due_date = new Date(parsed).toISOString().split("T")[0];
      }
    }
  }

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

export async function saveTask(task: TaskItem): Promise<TaskItem | null> {
  if (!supabase) return task;
  try {
    const isUuid =
      typeof task.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(task.id);
    const row = mapTaskToRow(task);

    if (isUuid) {
      row.id = task.id;
      let { data, error } = await supabase.from("tasks").upsert(row).select().single();
      // If foreign key constraint violates (e.g. assignee_id not present in users table), retry with assignee_id: null
      if (error && error.code === "23503") {
        console.warn("Retrying task upsert without assignee_id foreign key constraint:", error.message);
        row.assignee_id = null;
        const retryRes = await supabase.from("tasks").upsert(row).select().single();
        data = retryRes.data;
        error = retryRes.error;
      }
      if (error) {
        console.error("Error upserting task in Supabase:", error);
        return null;
      }
      return data ? mapRowToTask(data) : task;
    } else {
      delete row.id;
      let { data, error } = await supabase.from("tasks").insert(row).select().single();
      // If foreign key constraint violates, retry with assignee_id: null
      if (error && error.code === "23503") {
        console.warn("Retrying task insert without assignee_id foreign key constraint:", error.message);
        row.assignee_id = null;
        const retryRes = await supabase.from("tasks").insert(row).select().single();
        data = retryRes.data;
        error = retryRes.error;
      }
      if (error) {
        console.error("Error inserting task into Supabase:", error);
        return null;
      }
      return data ? mapRowToTask(data) : task;
    }
  } catch (err) {
    console.error("Exception saving task to Supabase:", err);
    return null;
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

const tasksMultiplexer = createTableSubscriptionMultiplexer("tasks", fetchTasks, 300);

export function subscribeToTasks(callback: (tasks: TaskItem[]) => void) {
  return tasksMultiplexer(callback);
}

export function mapRowToMeeting(row: any): MeetingItem {
  const start = row.start_time ? new Date(row.start_time) : new Date();
  const end = row.end_time ? new Date(row.end_time) : new Date(start.getTime() + 7200000);

  const startIsoDate = formatIsoDateOnly(start);
  const endIsoDate = formatIsoDateOnly(end);
  const isMultiDay = startIsoDate !== endIsoDate;

  let dateStr = "";
  let timeStr = "";

  if (isMultiDay) {
    const diffTime = new Date(endIsoDate).getTime() - new Date(startIsoDate).getTime();
    const totalDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);

    const startD = start.getDate();
    const endD = end.getDate();
    const startM = THAI_SHORT_MONTH_NAMES[start.getMonth()];
    const endM = THAI_SHORT_MONTH_NAMES[end.getMonth()];
    const endY = end.getFullYear() + 543;

    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      dateStr = `${startD} - ${endD} ${endM} ${endY} (${totalDays} วัน)`;
    } else {
      dateStr = `${startD} ${startM} - ${endD} ${endM} ${endY} (${totalDays} วัน)`;
    }

    const startH = String(start.getHours()).padStart(2, "0");
    const startMin = String(start.getMinutes()).padStart(2, "0");
    const endH = String(end.getHours()).padStart(2, "0");
    const endMin = String(end.getMinutes()).padStart(2, "0");
    timeStr = `${startH}:${startMin} น. (${startD} ${startM}) - ${endH}:${endMin} น. (${endD} ${endM})`;
  } else {
    dateStr = start.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    timeStr = `${start.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    })} - ${end.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.`;
  }

  let attendees: any[] = [];
  if (Array.isArray(row.attendees) && row.attendees.length > 0) {
    attendees = row.attendees;
  } else if (typeof row.attendees === "string") {
    try {
      attendees = JSON.parse(row.attendees);
    } catch {
      attendees = [row.attendees];
    }
  } else {
    attendees = ["ข้าราชการและเจ้าหน้าที่ พมจ."];
  }

  const meetingType =
    row.type ||
    (row.meeting_link && row.location && !row.location.includes("ออนไลน์")
      ? "hybrid"
      : row.meeting_link
      ? "online"
      : "onsite");

  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    dateStr,
    timeStr,
    isMultiDay: isMultiDay ? true : undefined,
    endDateStr: isMultiDay ? endIsoDate : undefined,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    location: row.location || (row.meeting_link ? "ห้องประชุมออนไลน์ Google Meet" : "ห้องประชุมสำนักงาน พมจ."),
    type: meetingType as any,
    category: (row.category as any) || "general",
    status: (row.status as any) || "confirmed",
    attendees,
    organizer: row.organizer || undefined,
    meetingLink: row.meeting_link || undefined,
    createdAt: row.created_at || undefined,
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

    let startTimeIso = meeting.startTime;
    let endTimeIso = meeting.endTime;
    if (!startTimeIso) {
      const now = new Date();
      startTimeIso = now.toISOString();
      endTimeIso = new Date(now.getTime() + 7200000).toISOString();
    }
    if (!endTimeIso) {
      endTimeIso = new Date(new Date(startTimeIso).getTime() + 7200000).toISOString();
    }

    const row: any = {
      title: meeting.title,
      description: meeting.description || null,
      start_time: startTimeIso,
      end_time: endTimeIso,
      location:
        meeting.location ||
        (meeting.type === "online" ? "ห้องประชุมออนไลน์ Google Meet" : "ห้องประชุมสำนักงาน พมจ."),
      meeting_link:
        meeting.meetingLink ||
        (meeting.type === "online" ? "https://meet.google.com/kpp-msoc" : null),
      type: meeting.type || "hybrid",
      category: meeting.category || "general",
      status: meeting.status || "confirmed",
      attendees: Array.isArray(meeting.attendees) ? meeting.attendees : [],
      organizer: meeting.organizer || null,
    };
    if (isUuid) {
      row.id = meeting.id;
    }
    const { error } = await supabase.from("meetings").upsert(row);
    if (error) {
      console.error("Supabase upsert meeting error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("saveMeeting error:", err);
    return false;
  }
}

export async function deleteMeeting(id: string | number): Promise<boolean> {
  if (!supabase) return true;
  try {
    const isUuid =
      typeof id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid) {
      console.warn("deleteMeeting skipped: ID is not a valid UUID:", id);
      return true;
    }
    const { error } = await supabase.from("meetings").delete().eq("id", id);
    return !error;
  } catch {
    return false;
  }
}

const meetingsMultiplexer = createTableSubscriptionMultiplexer("meetings", fetchMeetings, 300);

export function subscribeToMeetings(callback: (meetings: MeetingItem[]) => void) {
  return meetingsMultiplexer(callback);
}

// ==========================================
// MEETING ROOMS MASTER (ศูนย์สารบบห้องประชุม & สถานที่ราชการ)
// ==========================================

export function mapRowToMeetingRoom(row: any): MeetingRoomMaster {
  let equipment: string[] = [];
  if (Array.isArray(row.equipment)) {
    equipment = row.equipment;
  } else if (typeof row.equipment === "string") {
    try {
      equipment = JSON.parse(row.equipment);
    } catch {
      equipment = [row.equipment];
    }
  }

  return {
    id: String(row.id),
    name: row.name || "ห้องประชุมสำนักงาน",
    building: row.building || "สำนักงาน พมจ.กำแพงเพชร",
    capacity: Number(row.capacity) || 10,
    equipment: equipment.length > 0 ? equipment : ["แอร์", "จอแสดงผล"],
    status: (row.status === "maintenance" ? "maintenance" : "available") as "available" | "maintenance",
    notes: row.notes || undefined,
  };
}

export function mapMeetingRoomToRow(room: MeetingRoomMaster): any {
  return {
    id: room.id,
    name: room.name,
    building: room.building,
    capacity: room.capacity,
    equipment: room.equipment,
    status: room.status,
    notes: room.notes || null,
  };
}

// In-memory cache for meeting rooms (Single Source of Truth is Supabase; avoid localStorage desync)
let inMemoryMeetingRooms: MeetingRoomMaster[] | null = null;

export async function fetchMeetingRooms(): Promise<MeetingRoomMaster[]> {
  if (!supabase) return inMemoryMeetingRooms || DEFAULT_ROOMS;
  try {
    const { data, error } = await supabase
      .from("meeting_rooms")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.warn("fetchMeetingRooms error:", error.message);
      return inMemoryMeetingRooms || DEFAULT_ROOMS;
    }

    if (!data || data.length === 0) {
      return inMemoryMeetingRooms || DEFAULT_ROOMS;
    }

    const liveRooms = data.map(mapRowToMeetingRoom);
    inMemoryMeetingRooms = liveRooms;
    return liveRooms;
  } catch (err) {
    console.warn("Exception in fetchMeetingRooms:", err);
    return inMemoryMeetingRooms || DEFAULT_ROOMS;
  }
}

export async function saveMeetingRoom(room: MeetingRoomMaster): Promise<boolean> {
  // Optimistically update in-memory cache
  if (inMemoryMeetingRooms) {
    const exists = inMemoryMeetingRooms.some((r) => r.id === room.id);
    inMemoryMeetingRooms = exists
      ? inMemoryMeetingRooms.map((r) => (r.id === room.id ? room : r))
      : [...inMemoryMeetingRooms, room];
  }

  if (!supabase) return true;
  try {
    const row = mapMeetingRoomToRow(room);
    const { error } = await supabase.from("meeting_rooms").upsert(row);
    if (error) {
      console.warn("Supabase upsert meeting_rooms error:", error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function deleteMeetingRoom(id: string): Promise<boolean> {
  // Update in-memory cache
  if (inMemoryMeetingRooms) {
    inMemoryMeetingRooms = inMemoryMeetingRooms.filter((r) => r.id !== id);
  }

  if (!supabase) return true;
  try {
    const { error } = await supabase.from("meeting_rooms").delete().eq("id", id);
    return !error;
  } catch {
    return false;
  }
}

const meetingRoomsMultiplexer = createTableSubscriptionMultiplexer("meeting_rooms", fetchMeetingRooms, 300);

export function subscribeToMeetingRooms(callback: (rooms: MeetingRoomMaster[]) => void) {
  return meetingRoomsMultiplexer(callback);
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
    personnelType: undefined,
    position: metadata.position || "รอกำหนดตำแหน่ง",
    division: metadata.division || "รอกำหนดกลุ่มงาน",
    department: metadata.division || "รอกำหนดกลุ่มงาน",
    email: authUser.email || "user@nas.local",
    phone: "-",
    lineId: "-",
    role: (metadata.role as Role) || "member",
    status: "active",
    avatarUrl: metadata.avatar_url || undefined,
    avatarText: firstName.slice(0, 2),
    joinedDate: "วันนี้",
  };
}

/**
 * Update authenticated user metadata in Supabase GoTrue Auth
 */
export async function updateSupabaseUserMetadata(metadata: Record<string, any>): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.auth.updateUser({
      data: metadata,
    });
    if (error) {
      console.warn("Could not update Supabase Auth user metadata:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Exception updating Supabase Auth user metadata:", err);
    return false;
  }
}

// ─── CIRCULAR DOCUMENTS (GOVERNMENT CIRCULAR & E-ACKNOWLEDGMENT) ───

/**
 * Map Supabase circular_documents row to CircularDocument object
 */
export function mapRowToCircularDoc(row: any): CircularDocument {
  let scannedPages: string[] | undefined = undefined;
  let attachments: CircularAttachment[] | undefined = undefined;

  // 1. Resolve attachments from row.attachments if column exists or present in payload
  if (Array.isArray(row.attachments) && row.attachments.length > 0) {
    attachments = row.attachments;
  }

  // 2. Parse scanned_pages (may be object with { pages, attachments } or array of strings)
  if (row.scanned_pages) {
    if (Array.isArray(row.scanned_pages)) {
      scannedPages = row.scanned_pages;
    } else if (typeof row.scanned_pages === "object") {
      if (Array.isArray(row.scanned_pages.pages)) {
        scannedPages = row.scanned_pages.pages;
      }
      if (!attachments && Array.isArray(row.scanned_pages.attachments) && row.scanned_pages.attachments.length > 0) {
        attachments = row.scanned_pages.attachments;
      }
    }
  }

  // 3. Fallback synthesis if attachments array is still missing
  if (!attachments || attachments.length === 0) {
    const list: CircularAttachment[] = [];
    if (row.file_url) {
      const isPdf =
        row.file_name?.toLowerCase().endsWith(".pdf") ||
        (typeof row.file_url === "string" && row.file_url.includes("application/pdf"));
      list.push({
        id: `att_${row.id}_main`,
        name: row.file_name || "เอกสารฉบับหลัก",
        size: Number(row.file_size) || 0,
        type: isPdf ? "application/pdf" : "image/jpeg",
        url: row.file_url,
        scannedPages: scannedPages,
        source: "upload",
      });
    }

    // If attachment_list lists multiple items (e.g. "1. DocA.pdf, 2. DocB.pdf")
    if (row.attachment_list && typeof row.attachment_list === "string") {
      // Split on comma followed by numbering pattern like "2. "
      const parts = row.attachment_list
        .split(/,\s*(?=[0-9]+[.)]\s*)/)
        .map((s) => s.replace(/^[0-9]+[.)]\s*/, "").trim())
        .filter(Boolean);

      parts.forEach((pName, idx) => {
        if (pName && !list.some((existing) => existing.name.toLowerCase() === pName.toLowerCase())) {
          const isPdf = pName.toLowerCase().endsWith(".pdf");
          list.push({
            id: `att_${row.id}_part_${idx + 1}`,
            name: pName,
            size: 0,
            type: isPdf ? "application/pdf" : "application/octet-stream",
            url: "", // Legacy row without secondary file URL stored
            source: "upload",
          });
        }
      });
    }

    if (list.length > 0) {
      attachments = list;
    }
  }

  return {
    id: row.id,
    docNumber: row.doc_number,
    title: row.title,
    issuedDate: row.issued_date,
    senderOrg: row.sender_org,
    urgency: (row.urgency as CircularUrgency) || "normal",
    secretLevel: (row.secret_level as CircularSecretLevel) || "normal",
    summary: row.summary || undefined,
    fileUrl: row.file_url,
    fileName: row.file_name,
    fileSize: Number(row.file_size) || 0,
    totalPages: row.total_pages ? Number(row.total_pages) : undefined,
    scannedPages: scannedPages,
    attachments: attachments,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    deadline: row.deadline || undefined,
    targetCriteria: row.target_criteria || { scope: "all" },
    recipients: Array.isArray(row.recipients) ? row.recipients : [],
    totalCount: Number(row.total_count) || 0,
    acknowledgedCount: Number(row.acknowledged_count) || 0,
    status: (row.status as "active" | "closed" | "archived") || "active",
    docType: (row.doc_type as OfficialDocumentType) || "memo",
    referenceDoc: row.reference_doc || undefined,
    attachmentList: row.attachment_list || undefined,
  };
}

/**
 * Map CircularDocument object to Supabase circular_documents row
 */
export function mapCircularDocToRow(doc: CircularDocument): any {
  // Package scanned pages and full attachments metadata inside scanned_pages jsonb
  const scannedPagesPayload = {
    pages: doc.scannedPages || [],
    attachments: doc.attachments && doc.attachments.length > 0 ? doc.attachments : (doc.fileUrl ? [{
      id: `att_${doc.id || Date.now()}`,
      name: doc.fileName || "เอกสารแนบ",
      size: doc.fileSize || 0,
      type: doc.fileName?.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg",
      url: doc.fileUrl,
      scannedPages: doc.scannedPages,
      source: "upload",
    }] : []),
  };

  return {
    id: doc.id,
    doc_number: doc.docNumber,
    title: doc.title,
    issued_date: doc.issuedDate,
    sender_org: doc.senderOrg,
    doc_type: doc.docType || "memo",
    reference_doc: doc.referenceDoc || null,
    attachment_list: doc.attachmentList || null,
    urgency: doc.urgency,
    secret_level: doc.secretLevel,
    summary: doc.summary || null,
    file_url: doc.fileUrl,
    file_name: doc.fileName,
    file_size: doc.fileSize,
    total_pages: doc.totalPages || null,
    scanned_pages: scannedPagesPayload,
    created_by: doc.createdBy,
    created_by_name: doc.createdByName,
    created_at: doc.createdAt,
    deadline: doc.deadline || null,
    target_criteria: doc.targetCriteria,
    recipients: doc.recipients,
    total_count: doc.totalCount,
    acknowledged_count: doc.acknowledgedCount,
    status: doc.status,
  };
}

// In-memory cache for circular documents (Single Source of Truth is Supabase; avoid localStorage quota/desync)
let memoryCircularDocs: CircularDocument[] | null = null;

/**
 * Fetch circular documents from Supabase with fallback to in-memory cache
 */
export async function fetchCircularDocs(): Promise<CircularDocument[]> {
  if (!supabase) return memoryCircularDocs || [];

  try {
    const { data, error } = await supabase
      .from("circular_documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Could not fetch circular documents from Supabase:", error);
      return memoryCircularDocs || [];
    }

    if (!data || data.length === 0) {
      return memoryCircularDocs || [];
    }

    const hasMockDocs = data.some((r: any) => r.id === "circ_2569_001" || r.id === "circ_2569_002");
    if (hasMockDocs) {
      // Asynchronously purge obsolete mock rows from Supabase permanently
      supabase
        .from("circular_documents")
        .delete()
        .in("id", ["circ_2569_001", "circ_2569_002"])
        .then(() => {});
    }

    const liveDocs = data
      .map(mapRowToCircularDoc)
      .filter((d) => d.id !== "circ_2569_001" && d.id !== "circ_2569_002");

    memoryCircularDocs = liveDocs;
    return liveDocs;
  } catch (err) {
    console.warn("Exception fetching circular documents from Supabase:", err);
    return memoryCircularDocs || [];
  }
}

/**
 * Fetch scanned pages and attachments for a single circular document on-demand
 */
export async function fetchCircularDocDetails(id: string): Promise<{
  scannedPages?: string[];
  attachments?: CircularAttachment[];
} | null> {
  if (!supabase || !id) return null;
  try {
    const { data, error } = await supabase
      .from("circular_documents")
      .select("scanned_pages, file_url, file_name, file_size, attachment_list")
      .eq("id", id)
      .single();

    if (error || !data) return null;

    let scannedPages: string[] | undefined = undefined;
    let attachments: CircularAttachment[] | undefined = undefined;

    if (data.scanned_pages) {
      if (Array.isArray(data.scanned_pages)) {
        scannedPages = data.scanned_pages;
      } else if (typeof data.scanned_pages === "object") {
        if (Array.isArray(data.scanned_pages.pages)) {
          scannedPages = data.scanned_pages.pages;
        }
        if (Array.isArray(data.scanned_pages.attachments)) {
          attachments = data.scanned_pages.attachments;
        }
      }
    }

    return { scannedPages, attachments };
  } catch (err) {
    console.warn("Could not fetch circular doc details:", err);
    return null;
  }
}

/**
 * Fetch heavy scanned pages for a single circular document on-demand
 */
export async function fetchCircularDocScannedPages(id: string): Promise<string[]> {
  const details = await fetchCircularDocDetails(id);
  return details?.scannedPages || [];
}

/**
 * Save or update circular document in Supabase
 */
export async function saveCircularDoc(doc: CircularDocument): Promise<boolean> {
  // Guard: Reject obsolete mock documents to prevent any accidental reseeding
  if (doc.id === "circ_2569_001" || doc.id === "circ_2569_002") {
    return false;
  }

  // Update in-memory cache
  if (memoryCircularDocs) {
    const idx = memoryCircularDocs.findIndex((d) => d.id === doc.id);
    if (idx >= 0) {
      memoryCircularDocs[idx] = doc;
    } else {
      memoryCircularDocs = [doc, ...memoryCircularDocs];
    }
  }

  if (!supabase) return true;

  try {
    const row = mapCircularDocToRow(doc);
    const { error } = await supabase.from("circular_documents").upsert(row);
    if (error) {
      console.error("Error upserting circular document to Supabase:", error);
      return false;
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("smartmso:circular_updated", { detail: doc }));
    }
    return true;
  } catch (err) {
    console.error("Exception upserting circular document to Supabase:", err);
    return false;
  }
}

/**
 * Delete a circular document from Supabase
 */
export async function deleteCircularDoc(id: string): Promise<boolean> {
  if (memoryCircularDocs) {
    memoryCircularDocs = memoryCircularDocs.filter((d) => d.id !== id);
  }

  if (!supabase) return true;

  try {
    const { error } = await supabase.from("circular_documents").delete().eq("id", id);
    if (error) {
      console.error("Error deleting circular document from Supabase:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Exception deleting circular document from Supabase:", err);
    return false;
  }
}

/**
 * Handlers for circular documents realtime events
 */
export interface CircularRealtimeHandlers {
  onInsert?: (doc: CircularDocument) => void;
  onUpdate?: (doc: CircularDocument) => void;
  onDelete?: (docId: string) => void;
  onChange?: () => void;
}

/**
 * Subscribe to realtime changes on circular_documents.
 * Multiplexed so AppContext and CircularPage share a single connection.
 */
const circularDocSubscribers = new Set<(() => void) | CircularRealtimeHandlers>();
let circularDocsChannel: any = null;

export function subscribeToCircularDocs(
  handler: (() => void) | CircularRealtimeHandlers
): () => void {
  if (!supabase) return () => {};
  circularDocSubscribers.add(handler);

  if (!circularDocsChannel) {
    circularDocsChannel = supabase
      .channel("public:circular_docs")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "circular_documents",
        },
        (payload) => {
          const isInsert = payload.eventType === "INSERT" && payload.new;
          const isUpdate = payload.eventType === "UPDATE" && payload.new;
          const isDelete = payload.eventType === "DELETE" && payload.old;

          const doc = isInsert || isUpdate ? mapRowToCircularDoc(payload.new) : null;
          const delId = isDelete ? String(payload.old.id) : null;

          circularDocSubscribers.forEach((h) => {
            try {
              if (typeof h === "function") {
                h();
                return;
              }
              h.onChange?.();
              if (isInsert && doc) h.onInsert?.(doc);
              else if (isUpdate && doc) h.onUpdate?.(doc);
              else if (isDelete && delId) h.onDelete?.(delId);
            } catch (e) {
              console.error("Circular doc sub error:", e);
            }
          });
        }
      )
      .subscribe();
  }

  return () => {
    circularDocSubscribers.delete(handler);
    if (circularDocSubscribers.size === 0 && circularDocsChannel) {
      supabase?.removeChannel(circularDocsChannel);
      circularDocsChannel = null;
    }
  };
}


