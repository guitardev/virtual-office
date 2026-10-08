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

