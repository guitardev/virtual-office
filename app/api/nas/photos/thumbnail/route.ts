import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get("id");
    const size = searchParams.get("size") || "m";
    const cacheKey = searchParams.get("cache_key");
    const space = searchParams.get("space") || "shared";
    const sid = searchParams.get("sid");
    const nasUrl =
      searchParams.get("nasUrl") ||
      process.env.SYNOLOGY_NAS_URL ||
      process.env.NEXT_PUBLIC_SYNOLOGY_NAS_URL ||
      "https://nas.smso.site";

    if (!id || !sid) {
      return new NextResponse("Missing item id or sid", { status: 400 });
    }

    const cleanUrl = nasUrl.replace(/\/+$/, "");
    const apiName = space === "shared" ? "SYNO.FotoTeam.Thumbnail" : "SYNO.Foto.Thumbnail";

    let queryUrl = `${cleanUrl}/webapi/entry.cgi?api=${apiName}&version=2&method=get&id=${id}&size=${size}&type=unit&_sid=${encodeURIComponent(
      sid
    )}`;
    if (cacheKey) {
      queryUrl += `&cache_key=${encodeURIComponent(cacheKey)}`;
    }

    let res = await fetch(queryUrl, {
      method: "GET",
      signal: AbortSignal.timeout(12000),
    });

    // Fallback to version 1 if version 2 fails
    if (!res.ok) {
      const v1Url = `${cleanUrl}/webapi/entry.cgi?api=${apiName}&version=1&method=get&id=${id}&size=${size}&type=unit&_sid=${encodeURIComponent(
        sid
      )}${cacheKey ? `&cache_key=${encodeURIComponent(cacheKey)}` : ""}`;
      const v1Res = await fetch(v1Url, {
        method: "GET",
        signal: AbortSignal.timeout(10000),
      });
      if (v1Res.ok) {
        res = v1Res;
      }
    }

    if (!res.ok) {
      return new NextResponse(`Thumbnail fetch error: HTTP ${res.status}`, { status: res.status });
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
    return new NextResponse(`Thumbnail proxy failed: ${err?.message}`, { status: 500 });
  }
}
