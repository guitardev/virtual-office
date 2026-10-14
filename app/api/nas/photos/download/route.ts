import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get("id");
    const filename = searchParams.get("filename") || `photo_${id}.jpg`;
    const space = searchParams.get("space") || "shared";
    const sid = searchParams.get("sid");
    const nasUrl = searchParams.get("nasUrl") || process.env.SYNOLOGY_NAS_URL || "http://192.168.162.21:5000";

    if (!id || !sid) {
      return new NextResponse("Missing id or sid", { status: 400 });
    }

    const cleanUrl = nasUrl.replace(/\/+$/, "");
    const apiName = space === "shared" ? "SYNO.FotoTeam.Download" : "SYNO.Foto.Download";
    const downloadUrl = `${cleanUrl}/webapi/entry.cgi?api=${apiName}&version=1&method=download&unit_id=[${id}]&_sid=${encodeURIComponent(
      sid
    )}`;

    const res = await fetch(downloadUrl, {
      method: "GET",
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      return new NextResponse(`Download error: HTTP ${res.status}`, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await res.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (err: any) {
    return new NextResponse(`Media download failed: ${err?.message}`, { status: 500 });
  }
}
