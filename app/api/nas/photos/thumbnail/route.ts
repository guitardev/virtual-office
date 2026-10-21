import { NextRequest, NextResponse } from "next/server";
import { loginSynology } from "@/lib/synology";

export const dynamic = "force-dynamic";

let cachedServiceSid: string | null = null;
let cachedServiceSidTime = 0;

async function getServiceAccountSid(nasUrl: string): Promise<string | null> {
  const serviceAccount = process.env.SYNOLOGY_SERVICE_ACCOUNT;
  const servicePassword = process.env.SYNOLOGY_SERVICE_PASSWORD;
  if (!serviceAccount || !servicePassword) return null;

  const now = Date.now();
  if (cachedServiceSid && now - cachedServiceSidTime < 30 * 60 * 1000) {
    return cachedServiceSid;
  }

  try {
    const auth = await loginSynology(serviceAccount, servicePassword, nasUrl);
    if (auth.success && auth.sid) {
      cachedServiceSid = auth.sid;
      cachedServiceSidTime = now;
      return auth.sid;
    }
  } catch (err: any) {
    console.warn("[Photos Thumbnail] Auto-authenticate service account failed:", err?.message);
  }
  return null;
}

function generateFallbackThumbnailSvg(id: string, size: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#grad)" rx="16"/>
  <circle cx="150" cy="120" r="46" fill="#0284c7" opacity="0.25"/>
  <text x="150" y="136" font-size="44" text-anchor="middle">🖼️</text>
  <text x="150" y="195" fill="#f8fafc" font-size="14" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600" text-anchor="middle">คลังภาพราชการ</text>
  <text x="150" y="220" fill="#94a3b8" font-size="11" font-family="monospace" text-anchor="middle">Item #${id}</text>
</svg>`;
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get("id");
    const size = searchParams.get("size") || "m";
    const rawCacheKey = searchParams.get("cache_key");
    const space = searchParams.get("space") || "shared";
    const rawSid = searchParams.get("sid");
    const nasUrl =
      searchParams.get("nasUrl") ||
      process.env.SYNOLOGY_NAS_URL ||
      process.env.NEXT_PUBLIC_SYNOLOGY_NAS_URL ||
      "https://nas.smso.site";

    if (!id) {
      return new NextResponse(generateFallbackThumbnailSvg("unknown", size), {
        status: 200,
        headers: { "Content-Type": "image/svg+xml; charset=utf-8" },
      });
    }

    const cacheKey =
      rawCacheKey && rawCacheKey !== "undefined" && rawCacheKey !== "null"
        ? rawCacheKey
        : null;

    let effectiveSid =
      rawSid && rawSid !== "null" && rawSid !== "undefined" && rawSid.trim() !== ""
        ? rawSid.trim()
        : null;

    if (!effectiveSid || effectiveSid === "system_chat_session") {
      effectiveSid = process.env.SYNOLOGY_SERVICE_SID || (await getServiceAccountSid(nasUrl));
    }

    // Mock environment fallback
    if (!effectiveSid || effectiveSid.startsWith("mock_")) {
      return new NextResponse(generateFallbackThumbnailSvg(id, size), {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    const cleanUrl = nasUrl.replace(/\/+$/, "");
    const apiName = space === "shared" ? "SYNO.FotoTeam.Thumbnail" : "SYNO.Foto.Thumbnail";

    // Attempt 1: Version 2 with cache_key (if available)
    let queryUrl = `${cleanUrl}/webapi/entry.cgi?api=${apiName}&version=2&method=get&id=${id}&size=${size}&type=unit&_sid=${encodeURIComponent(
      effectiveSid
    )}`;
    if (cacheKey) {
      queryUrl += `&cache_key=${encodeURIComponent(cacheKey)}`;
    }

    let res = await fetch(queryUrl, {
      method: "GET",
      signal: AbortSignal.timeout(10000),
    }).catch(() => null);

    // Attempt 2: Fallback to version 1 with cache_key
    if (!res || !res.ok) {
      const v1Url = `${cleanUrl}/webapi/entry.cgi?api=${apiName}&version=1&method=get&id=${id}&size=${size}&type=unit&_sid=${encodeURIComponent(
        effectiveSid
      )}${cacheKey ? `&cache_key=${encodeURIComponent(cacheKey)}` : ""}`;
      const v1Res = await fetch(v1Url, {
        method: "GET",
        signal: AbortSignal.timeout(10000),
      }).catch(() => null);
      if (v1Res && v1Res.ok) {
        res = v1Res;
      }
    }

    // Attempt 3: If still failing and cacheKey was supplied, try without cacheKey
    if ((!res || !res.ok) && cacheKey) {
      const noKeyUrl = `${cleanUrl}/webapi/entry.cgi?api=${apiName}&version=2&method=get&id=${id}&size=${size}&type=unit&_sid=${encodeURIComponent(
        effectiveSid
      )}`;
      const noKeyRes = await fetch(noKeyUrl, {
        method: "GET",
        signal: AbortSignal.timeout(8000),
      }).catch(() => null);
      if (noKeyRes && noKeyRes.ok) {
        res = noKeyRes;
      }
    }

    // If still failed, serve resilient SVG fallback instead of HTTP 404/500 broken image
    if (!res || !res.ok) {
      return new NextResponse(generateFallbackThumbnailSvg(id, size), {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=43200",
      },
    });
  } catch (err: any) {
    return new NextResponse(generateFallbackThumbnailSvg("err", "m"), {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }
}
