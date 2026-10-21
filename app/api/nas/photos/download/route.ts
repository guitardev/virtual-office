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
    console.warn("[Photos Download] Auto-authenticate service account failed:", err?.message);
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get("id");
    const filename = searchParams.get("filename") || `photo_${id}.jpg`;
    const space = searchParams.get("space") || "shared";
    const rawSid = searchParams.get("sid");
    const nasUrl =
      searchParams.get("nasUrl") ||
      process.env.SYNOLOGY_NAS_URL ||
      process.env.NEXT_PUBLIC_SYNOLOGY_NAS_URL ||
      "https://nas.smso.site";

    if (!id) {
      return new NextResponse("Missing item id", { status: 400 });
    }

    let effectiveSid =
      rawSid && rawSid !== "null" && rawSid !== "undefined" && rawSid.trim() !== ""
        ? rawSid.trim()
        : null;

    if (!effectiveSid || effectiveSid === "system_chat_session") {
      effectiveSid = process.env.SYNOLOGY_SERVICE_SID || (await getServiceAccountSid(nasUrl));
    }

    if (!effectiveSid) {
      return new NextResponse("Missing authentication session for Synology Photos", { status: 401 });
    }

    const cleanUrl = nasUrl.replace(/\/+$/, "");
    const cacheKey = searchParams.get("cache_key");
    const rawMode = searchParams.get("mode");
    const isVideo = /\.(mp4|mov|webm|avi|mkv|m4v|3gp|wmv|flv)$/i.test(filename);
    const isImage = /\.(jpe?g|png|gif|webp|svg|bmp)$/i.test(filename);
    const mode = rawMode || (isVideo || isImage ? "open" : "download");

    // If mock session, provide mock media stream
    if (effectiveSid.startsWith("mock_")) {
      const dummyBuffer = Buffer.alloc(1024, 0);
      const mime = isVideo ? "video/mp4" : isImage ? "image/jpeg" : "application/octet-stream";
      return new NextResponse(dummyBuffer, {
        status: 200,
        headers: {
          "Content-Type": mime,
          "Content-Disposition": `${mode === "open" ? "inline" : "attachment"}; filename="${encodeURIComponent(filename)}"`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(dummyBuffer.byteLength),
        },
      });
    }

    const apiName = space === "shared" ? "SYNO.FotoTeam.Download" : "SYNO.Foto.Download";
    const unitIdParam = encodeURIComponent(`[${id}]`);

    let downloadUrl = `${cleanUrl}/webapi/entry.cgi?api=${apiName}&version=1&method=download&unit_id=${unitIdParam}&_sid=${encodeURIComponent(
      effectiveSid
    )}`;
    if (cacheKey) {
      downloadUrl += `&cache_key=${encodeURIComponent(cacheKey)}`;
    }

    let res = await fetch(downloadUrl, {
      method: "GET",
      signal: AbortSignal.timeout(30000),
    });

    // Fallback to version 2 (DSM 7.2+) if version 1 fails
    if (!res.ok) {
      const v2Url = `${cleanUrl}/webapi/entry.cgi?api=${apiName}&version=2&method=download&unit_id=${unitIdParam}&_sid=${encodeURIComponent(
        effectiveSid
      )}${cacheKey ? `&cache_key=${encodeURIComponent(cacheKey)}` : ""}`;
      const v2Res = await fetch(v2Url, {
        method: "GET",
        signal: AbortSignal.timeout(30000),
      });
      if (v2Res.ok) {
        res = v2Res;
      }
    }

    if (!res.ok) {
      return new NextResponse(`Download error: HTTP ${res.status}`, { status: res.status });
    }

    let contentType = res.headers.get("content-type") || "application/octet-stream";
    const ext = filename.split(".").pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      mp4: "video/mp4",
      m4v: "video/mp4",
      webm: "video/webm",
      mov: "video/quicktime",
      mkv: "video/x-matroska",
      avi: "video/x-msvideo",
      "3gp": "video/3gpp",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      pdf: "application/pdf",
      mp3: "audio/mpeg",
      wav: "audio/wav",
      ogg: "audio/ogg",
    };

    if (ext && mimeMap[ext]) {
      contentType = mimeMap[ext];
    }

    const arrayBuffer = await res.arrayBuffer();
    const totalBytes = arrayBuffer.byteLength;
    const disposition =
      mode === "open"
        ? `inline; filename="${encodeURIComponent(filename)}"`
        : `attachment; filename="${encodeURIComponent(filename)}"`;

    // Support HTTP Range requests for video seeking in browsers
    const rangeHeader = req.headers.get("range");
    if (rangeHeader && totalBytes > 0) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalBytes - 1;

      if (!isNaN(start) && start < totalBytes) {
        const safeEnd = Math.min(isNaN(end) ? totalBytes - 1 : end, totalBytes - 1);
        const chunk = arrayBuffer.slice(start, safeEnd + 1);

        return new NextResponse(chunk, {
          status: 206,
          headers: {
            "Content-Type": contentType,
            "Content-Range": `bytes ${start}-${safeEnd}/${totalBytes}`,
            "Accept-Ranges": "bytes",
            "Content-Length": String(chunk.byteLength),
            "Content-Disposition": disposition,
            "Cache-Control": "public, max-age=3600",
          },
        });
      }
    }

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": disposition,
        "Accept-Ranges": "bytes",
        "Content-Length": String(totalBytes),
        "Cache-Control": mode === "open" ? "public, max-age=3600" : "no-cache",
      },
    });
  } catch (err: any) {
    return new NextResponse(`Media download failed: ${err?.message}`, { status: 500 });
  }
}
