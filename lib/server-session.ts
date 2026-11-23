import crypto from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "smso_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface ServerSessionPayload {
  userId: string;
  name: string;
  role: string;
  position?: string;
  division?: string;
  iat: number;
  exp: number;
}

export interface ResolvedActor {
  id: string;
  name: string;
  role: string;
  position: string;
  division: string;
}

function getSessionSecret(overrideSecret?: string): string {
  if (overrideSecret) return overrideSecret;

  const explicit = (process.env.SESSION_SECRET || "").trim();
  if (explicit) return explicit;

  // Derive from existing server-only secrets if SESSION_SECRET is not yet configured on Vercel
  const serverEntropy = [
    process.env.SYNOLOGY_SERVICE_PASSWORD,
    process.env.R2_SECRET_ACCESS_KEY,
    process.env.LINE_CHANNEL_SECRET,
    process.env.NAS_MYSQL_BRIDGE_SECRET,
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY,
  ]
    .map((v) => (v || "").trim())
    .filter(Boolean)
    .join("|");

  if (serverEntropy) {
    return crypto
      .createHash("sha256")
      .update(`smso-session-v1:${serverEntropy}`)
      .digest("hex");
  }

  if (process.env.NODE_ENV !== "production") {
    return "dev-only-smso-session-secret-do-not-use-in-prod";
  }

  return "";
}

function signSegment(encodedPayload: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(encodedPayload, "utf8")
    .digest("base64url");
}

export function createSessionToken(
  user: {
    userId: string;
    name: string;
    role: string;
    position?: string;
    division?: string;
  },
  opts: { secret?: string; nowSec?: number; ttlSec?: number } = {}
): string | null {
  const secret = getSessionSecret(opts.secret);
  if (!secret) return null;

  const now = opts.nowSec ?? Math.floor(Date.now() / 1000);
  const ttl = opts.ttlSec ?? SESSION_TTL_SECONDS;
  const payload: ServerSessionPayload = {
    userId: String(user.userId),
    name: String(user.name || ""),
    role: String(user.role || "member"),
    position: user.position || "",
    division: user.division || "",
    iat: now,
    exp: now + ttl,
  };

  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = signSegment(encoded, secret);
  return `${encoded}.${sig}`;
}

export function verifySessionToken(
  token: string | null | undefined,
  opts: { secret?: string; nowSec?: number } = {}
): ServerSessionPayload | null {
  if (!token || typeof token !== "string") return null;
  const secret = getSessionSecret(opts.secret);
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [encoded, providedSig] = parts;
  if (!encoded || !providedSig) return null;

  const expectedSig = signSegment(encoded, secret);
  const a = Buffer.from(providedSig, "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as ServerSessionPayload;

    if (!parsed || typeof parsed.userId !== "string" || !parsed.userId) {
      return null;
    }
    const now = opts.nowSec ?? Math.floor(Date.now() / 1000);
    if (typeof parsed.exp !== "number" || parsed.exp <= now) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function attachSessionCookie(
  res: NextResponse,
  user: {
    userId: string;
    name: string;
    role: string;
    position?: string;
    division?: string;
  }
): boolean {
  const token = createSessionToken(user);
  if (!token) return false;

  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return true;
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function getSessionFromRequest(req: NextRequest): ServerSessionPayload | null {
  const raw = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(raw);
}

/**
 * Resolve authenticated actor for mutating API routes.
 * - Always prefers the server-verified HttpOnly signed session cookie (ignoring spoofed body actorRole/actorId).
 * - In production, missing/invalid session cookie is rejected with 401 Unauthorized.
 * - In local development/test (NODE_ENV !== "production"), allows explicit body fallback when cookie is absent.
 */
export function resolveRequestActor(
  req: NextRequest,
  bodyFallback?: {
    actorId?: string | null;
    actorName?: string | null;
    actorRole?: string | null;
    actorPosition?: string | null;
    actorDivision?: string | null;
  }
):
  | { ok: true; actor: ResolvedActor; verifiedByCookie: boolean }
  | { ok: false; status: 401; error: string } {
  const session = getSessionFromRequest(req);
  if (session) {
    return {
      ok: true,
      verifiedByCookie: true,
      actor: {
        id: session.userId,
        name: session.name || bodyFallback?.actorName || "",
        role: session.role || "member",
        position: session.position || bodyFallback?.actorPosition || "",
        division: session.division || bodyFallback?.actorDivision || "",
      },
    };
  }

  if (process.env.NODE_ENV !== "production" && bodyFallback?.actorId) {
    return {
      ok: true,
      verifiedByCookie: false,
      actor: {
        id: String(bodyFallback.actorId),
        name: String(bodyFallback.actorName || ""),
        role: String(bodyFallback.actorRole || "member"),
        position: String(bodyFallback.actorPosition || ""),
        division: String(bodyFallback.actorDivision || ""),
      },
    };
  }

  return {
    ok: false,
    status: 401,
    error: "กรุณาเข้าสู่ระบบใหม่เพื่อยืนยันตัวตน (Session หมดอายุหรือไม่ถูกต้อง)",
  };
}
