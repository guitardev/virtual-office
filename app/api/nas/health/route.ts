import { NextRequest, NextResponse } from "next/server";
import { checkNasHealth } from "@/lib/synology";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const nasUrl = searchParams.get("url") || process.env.SYNOLOGY_NAS_URL || "http://192.168.162.21:5000";

    const status = await checkNasHealth(nasUrl);

    return NextResponse.json({
      success: true,
      data: status,
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
