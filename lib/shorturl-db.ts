import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { ShortLinkItem } from "./types";
import { normalizeSlug } from "./shorturl-utils";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

function getSupabaseServerClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseKey || !supabaseUrl.startsWith("http")) {
    return null;
  }
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapRowToShortLink(row: any): ShortLinkItem {
  return {
    id: String(row.id),
    slug: String(row.slug || ""),
    targetUrl: String(row.target_url || ""),
    title: String(row.title || ""),
    division: String(row.division || ""),
    clickCount: Number(row.click_count || 0),
    lastClickedAt: row.last_clicked_at || null,
    expiresAt: row.expires_at || null,
    isActive: row.is_active !== false,
    createdBy: row.created_by || null,
    createdByName: String(row.created_by_name || ""),
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: row.updated_at || undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isMissingShortLinksTableError(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || "");
  const msg = String(err.message || err.details || "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    (msg.includes("short_links") &&
      (msg.includes("does not exist") || msg.includes("schema cache")))
  );
}

export async function fetchShortLinksFromSupabase(): Promise<{
  ready: boolean;
  links: ShortLinkItem[];
  error?: string;
}> {
  const client = getSupabaseServerClient();
  if (!client) {
    return {
      ready: false,
      links: [],
      error: "ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase",
    };
  }

  const { data, error } = await client
    .from("short_links")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingShortLinksTableError(error)) {
      return { ready: false, links: [] };
    }
    return {
      ready: false,
      links: [],
      error: error.message || "ไม่สามารถดึงข้อมูลลิงก์ย่อได้",
    };
  }

  return {
    ready: true,
    links: (data || []).map(mapRowToShortLink),
  };
}

export async function getShortLinkBySlugFromSupabase(slug: string): Promise<{
  ready: boolean;
  link: ShortLinkItem | null;
  error?: string;
}> {
  const client = getSupabaseServerClient();
  if (!client) {
    return { ready: false, link: null, error: "Supabase not configured" };
  }

  const normalized = normalizeSlug(slug);
  const { data, error } = await client
    .from("short_links")
    .select("*")
    .eq("slug", normalized)
    .maybeSingle();

  if (error) {
    if (isMissingShortLinksTableError(error)) {
      return { ready: false, link: null };
    }
    return { ready: false, link: null, error: error.message };
  }

  return {
    ready: true,
    link: data ? mapRowToShortLink(data) : null,
  };
}

export async function getShortLinkByIdFromSupabase(id: string): Promise<{
  ready: boolean;
  link: ShortLinkItem | null;
  error?: string;
}> {
  const client = getSupabaseServerClient();
  if (!client) {
    return { ready: false, link: null, error: "Supabase not configured" };
  }

  const { data, error } = await client
    .from("short_links")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if (isMissingShortLinksTableError(error)) {
      return { ready: false, link: null };
    }
    return { ready: false, link: null, error: error.message };
  }

  return {
    ready: true,
    link: data ? mapRowToShortLink(data) : null,
  };
}

export async function createShortLinkInSupabase(input: {
  slug: string;
  targetUrl: string;
  title: string;
  division?: string;
  expiresAt?: string | null;
  createdBy?: string | null;
  createdByName?: string;
}): Promise<{
  link?: ShortLinkItem;
  duplicate?: boolean;
  setupRequired?: boolean;
  error?: string;
}> {
  const client = getSupabaseServerClient();
  if (!client) {
    return { setupRequired: true, error: "ยังไม่ได้ตั้งค่า Supabase" };
  }

  const row = {
    slug: normalizeSlug(input.slug),
    target_url: input.targetUrl,
    title: input.title.trim(),
    division: (input.division || "").trim(),
    expires_at: input.expiresAt || null,
    is_active: true,
    created_by: input.createdBy || null,
    created_by_name: (input.createdByName || "").trim(),
  };

  const { data, error } = await client
    .from("short_links")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    if (isMissingShortLinksTableError(error)) {
      return { setupRequired: true, error: "ยังไม่ได้สร้างตาราง short_links บน Supabase" };
    }
    if (String(error.code || "") === "23505") {
      return { duplicate: true, error: `ชื่อย่อ "${row.slug}" ถูกใช้งานแล้ว` };
    }
    return { error: error.message || "ไม่สามารถบันทึกลิงก์ย่อได้" };
  }

  return { link: mapRowToShortLink(data) };
}

export async function updateShortLinkInSupabase(
  id: string,
  updates: {
    targetUrl?: string;
    title?: string;
    isActive?: boolean;
    expiresAt?: string | null;
  }
): Promise<{
  link?: ShortLinkItem;
  setupRequired?: boolean;
  error?: string;
}> {
  const client = getSupabaseServerClient();
  if (!client) {
    return { setupRequired: true, error: "ยังไม่ได้ตั้งค่า Supabase" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof updates.targetUrl === "string") payload.target_url = updates.targetUrl;
  if (typeof updates.title === "string") payload.title = updates.title.trim();
  if (typeof updates.isActive === "boolean") payload.is_active = updates.isActive;
  if (updates.expiresAt !== undefined) payload.expires_at = updates.expiresAt;

  const { data, error } = await client
    .from("short_links")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (isMissingShortLinksTableError(error)) {
      return { setupRequired: true, error: "ยังไม่ได้สร้างตาราง short_links บน Supabase" };
    }
    return { error: error.message || "ไม่สามารถอัปเดตลิงก์ย่อได้" };
  }

  return { link: mapRowToShortLink(data) };
}

export async function deleteShortLinkInSupabase(id: string): Promise<{
  success: boolean;
  setupRequired?: boolean;
  error?: string;
}> {
  const client = getSupabaseServerClient();
  if (!client) {
    return { success: false, setupRequired: true, error: "ยังไม่ได้ตั้งค่า Supabase" };
  }

  const { error } = await client.from("short_links").delete().eq("id", id);

  if (error) {
    if (isMissingShortLinksTableError(error)) {
      return {
        success: false,
        setupRequired: true,
        error: "ยังไม่ได้สร้างตาราง short_links บน Supabase",
      };
    }
    return { success: false, error: error.message || "ไม่สามารถลบลิงก์ย่อได้" };
  }

  return { success: true };
}

export async function incrementShortLinkClickInSupabase(slug: string): Promise<void> {
  const client = getSupabaseServerClient();
  if (!client) return;

  const normalized = normalizeSlug(slug);
  const { error: rpcError } = await client.rpc("increment_short_link_click", {
    link_slug: normalized,
  });

  if (!rpcError) return;

  // Fallback if RPC wasn't created yet
  try {
    const { data } = await client
      .from("short_links")
      .select("id, click_count")
      .eq("slug", normalized)
      .maybeSingle();

    if (data?.id) {
      await client
        .from("short_links")
        .update({
          click_count: Number(data.click_count || 0) + 1,
          last_clicked_at: new Date().toISOString(),
        })
        .eq("id", data.id);
    }
  } catch {
    // Never break redirects on telemetry write errors
  }
}

