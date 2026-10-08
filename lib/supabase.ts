import { createClient } from "@supabase/supabase-js";
import { Member, ModuleId, Role, Task, AuditLog, PersonnelType } from "./types";
import { INITIAL_MEMBERS, INITIAL_SYSTEM_MODULES } from "./rbac";

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
