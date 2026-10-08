import { createClient } from "@supabase/supabase-js";
import { Member, ModuleId, Role, Task, AuditLog, PersonnelType, AccessRequest, AccessRequestStatus } from "./types";
import { INITIAL_MEMBERS, INITIAL_SYSTEM_MODULES, INITIAL_ACCESS_REQUESTS } from "./rbac";

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

/**
 * Fetch members from Supabase, or fallback to INITIAL_MEMBERS
 */
export async function fetchMembers(): Promise<Member[]> {
  if (!supabase) return INITIAL_MEMBERS;

  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn("Supabase fetch members returned empty or error, using initial members:", error);
      return INITIAL_MEMBERS;
    }

    return data.map(mapRowToMember);
  } catch (err) {
    console.error("Error fetching members from Supabase:", err);
    return INITIAL_MEMBERS;
  }
}

/**
 * Upsert member in Supabase
 */
export async function saveMember(member: Member): Promise<boolean> {
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
    console.error("Error saving member:", err);
    return false;
  }
}

/**
 * Delete member in Supabase
 */
export async function deleteMember(id: string): Promise<boolean> {
  if (!supabase) return true;

  try {
    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) {
      console.error("Error deleting member from Supabase:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error deleting member:", err);
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

/**
 * Fetch access requests from Supabase, or fallback to INITIAL_ACCESS_REQUESTS
 */
export async function fetchAccessRequests(): Promise<AccessRequest[]> {
  if (!supabase) return INITIAL_ACCESS_REQUESTS;

  try {
    const { data, error } = await supabase
      .from("access_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return INITIAL_ACCESS_REQUESTS;
    }

    return data.map(mapRowToAccessRequest);
  } catch (err) {
    console.error("Error fetching access requests from Supabase:", err);
    return INITIAL_ACCESS_REQUESTS;
  }
}

/**
 * Save access request to Supabase
 */
export async function saveAccessRequest(req: AccessRequest): Promise<boolean> {
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

