import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get("id");
    const size = searchParams.get("size") || "m";
    const cacheKey = searchParams.get("cache_key");
    const space = searchParams.get("space") || "shared";
    const sid = searchParams.get("sid");
    const nasUrl = searchParams.get("nasUrl") || process.env.SYNOLOGY_NAS_URL || "http://192.168.162.21:5000";

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

    const res = await fetch(queryUrl, {
      method: "GET",
      signal: AbortSignal.timeout(12000),
    });

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
