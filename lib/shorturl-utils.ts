import { ShortLinkItem } from "./types";

/**
 * Ambiguity-free alphabet (excludes 0, o, 1, l, i) for easy verbal & printed sharing
 */
const READABLE_SLUG_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/**
 * Reserved prefixes/slugs that should never be shadowed or misused
 */
export const RESERVED_SHORT_SLUGS = new Set([
  "api",
  "admin",
  "attendance",
  "auth",
  "bgremove",
  "carbooking",
  "chat",
  "circular",
  "dashboard",
  "data-hub",
  "files",
  "gallery",
  "login",
  "logout",
  "meetings",
  "policy",
  "qrcode",
  "reports",
  "robots",
  "s",
  "shorturl",
  "sitemap",
  "task",
  "tasks",
  "term",
  "tools",
  "user",
  "_next",
  "favicon",
]);

export const DEFAULT_PUBLIC_SHORT_BASE_URL = "https://www.smso.site";

export function normalizeSlug(raw: string): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export function validateSlug(
  raw: string
): { valid: boolean; normalized: string; error?: string } {
  const normalized = normalizeSlug(raw);
  if (!normalized) {
    return { valid: false, normalized, error: "กรุณาระบุชื่อย่อ (Slug)" };
  }
  if (normalized.length < 2 || normalized.length > 48) {
    return {
      valid: false,
      normalized,
      error: "ชื่อย่อต้องมีความยาว 2 - 48 ตัวอักษร",
    };
  }
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: "ใช้ได้เฉพาะภาษาอังกฤษพิมพ์เล็ก (a-z), ตัวเลข (0-9), ขีดกลาง (-) และขีดล่าง (_) โดยขึ้นต้นด้วยตัวอักษรหรือตัวเลข",
    };
  }
  if (RESERVED_SHORT_SLUGS.has(normalized)) {
    return {
      valid: false,
      normalized,
      error: `ชื่อย่อ "${normalized}" เป็นคำสงวนของระบบ กรุณาเลือกชื่ออื่น`,
    };
  }
  return { valid: true, normalized };
}

export function generateReadableSlug(length = 6): string {
  const safeLen = Math.max(4, Math.min(12, length));
  let result = "";
  const cryptoApi = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;

  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    const buf = new Uint32Array(safeLen);
    cryptoApi.getRandomValues(buf);
    for (let i = 0; i < safeLen; i++) {
      result += READABLE_SLUG_ALPHABET[buf[i] % READABLE_SLUG_ALPHABET.length];
    }
    return result;
  }

  for (let i = 0; i < safeLen; i++) {
    result +=
      READABLE_SLUG_ALPHABET[
        Math.floor(Math.random() * READABLE_SLUG_ALPHABET.length)
      ];
  }
  return result;
}

export function validateAndNormalizeTargetUrl(
  rawInput: string,
  ownOrigins: string[] = [DEFAULT_PUBLIC_SHORT_BASE_URL]
): { valid: boolean; normalized: string; error?: string } {
  const trimmed = String(rawInput || "").trim();
  if (!trimmed) {
    return { valid: false, normalized: "", error: "กรุณาระบุ URL ต้นทางที่ต้องการย่อ" };
  }

  // Explicitly block dangerous schemes
  if (/^(javascript|data|vbscript|file|blob):/i.test(trimmed)) {
    return {
      valid: false,
      normalized: "",
      error: "ไม่อนุญาตให้ใช้โปรโตคอลนี้ กรุณาระบุ URL ที่ขึ้นต้นด้วย https:// หรือ http://",
    };
  }

  // Prepend https:// automatically when user omits scheme on a domain-like input
  const candidate =
    !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) && trimmed.includes(".")
      ? `https://${trimmed}`
      : trimmed;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return {
      valid: false,
      normalized: "",
      error: "รูปแบบ URL ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง (เช่น https://docs.google.com/...)",
    };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      valid: false,
      normalized: "",
      error: "รองรับเฉพาะลิงก์เว็บไซต์ http:// หรือ https:// เท่านั้น",
    };
  }

  if (!parsed.hostname || (!parsed.hostname.includes(".") && parsed.hostname !== "localhost")) {
    return {
      valid: false,
      normalized: "",
      error: "ไม่พบชื่อโดเมนที่ถูกต้องใน URL",
    };
  }

  // Prevent redirect loop back into /s/... on our own origin(s)
  const targetHost = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const isOwnHost = ownOrigins.some((orig) => {
    try {
      const o = new URL(orig);
      return o.hostname.toLowerCase().replace(/^www\./, "") === targetHost;
    } catch {
      return orig.toLowerCase().includes(targetHost);
    }
  });

  if (isOwnHost && parsed.pathname.toLowerCase().startsWith("/s/")) {
    return {
      valid: false,
      normalized: "",
      error: "ไม่สามารถย่อลิงก์ที่ชี้กลับมาที่ลิงก์ย่อ (/s/...) ของระบบซ้ำซ้อนได้",
    };
  }

  return { valid: true, normalized: parsed.toString() };
}

export function buildShortUrl(origin: string, slug: string): string {
  const base = (origin || DEFAULT_PUBLIC_SHORT_BASE_URL).replace(/\/+$/, "");
  return `${base}/s/${normalizeSlug(slug)}`;
}

export type ShortLinkStatus = "active" | "disabled" | "expired";

export function isShortLinkExpired(link: Pick<ShortLinkItem, "expiresAt">): boolean {
  if (!link.expiresAt) return false;
  const ts = new Date(link.expiresAt).getTime();
  return !Number.isNaN(ts) && ts <= Date.now();
}

export function getShortLinkStatus(
  link: Pick<ShortLinkItem, "isActive" | "expiresAt">
): ShortLinkStatus {
  if (!link.isActive) return "disabled";
  if (isShortLinkExpired(link)) return "expired";
  return "active";
}

export const SHORT_LINKS_SETUP_SQL = `-- Smart MSO Short URL Schema (Run in Supabase Dashboard -> SQL Editor)
CREATE TABLE IF NOT EXISTS public.short_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  target_url text NOT NULL,
  title text NOT NULL DEFAULT '',
  division text NOT NULL DEFAULT '',
  click_count bigint NOT NULL DEFAULT 0,
  last_clicked_at timestamptz,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by text,
  created_by_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT short_links_slug_format_chk CHECK (slug ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  CONSTRAINT short_links_target_protocol_chk CHECK (target_url ~* '^https?://')
);

CREATE INDEX IF NOT EXISTS idx_short_links_created_at ON public.short_links (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_short_links_created_by ON public.short_links (created_by);

ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all read short_links" ON public.short_links;
DROP POLICY IF EXISTS "Allow all write short_links" ON public.short_links;

CREATE POLICY "Allow all read short_links" ON public.short_links FOR SELECT USING (true);
CREATE POLICY "Allow all write short_links" ON public.short_links FOR ALL USING (true) WITH CHECK (true);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.short_links TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_short_link_click(link_slug text)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE public.short_links
  SET click_count = click_count + 1,
      last_clicked_at = now()
  WHERE slug = lower(trim(link_slug))
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());
$$;

GRANT EXECUTE ON FUNCTION public.increment_short_link_click(text) TO anon, authenticated;`;
