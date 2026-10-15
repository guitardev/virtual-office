import { NextRequest, NextResponse } from "next/server";
import { checkNasHealth } from "@/lib/synology";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const nasUrl =
      searchParams.get("url") ||
      process.env.SYNOLOGY_NAS_URL ||
      process.env.NEXT_PUBLIC_SYNOLOGY_NAS_URL ||
      "https://nas.smso.site";

    const status = await checkNasHealth(nasUrl);
    const isCloudflare = nasUrl.includes("nas.smso.site");

    const sanitizedStatus = {
      ...status,
      host: status.online
        ? (isCloudflare ? "Cloudflare Zero Trust (Secured)" : "Office LAN (Secured)")
        : "Unavailable",
      port: undefined,
      error: status.error
        ? status.error
            .replace(/https?:\/\/[^\s]+/g, "เซิร์ฟเวอร์ NAS")
            .replace(/192\.168\.\d+\.\d+(:?\d+)?/g, "เครือข่ายภายใน")
        : undefined,
    };

    return NextResponse.json({
      success: true,
      data: sanitizedStatus,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Internal server error during NAS health check",
      },
      { status: 500 }
    );
  }
}
