import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfIp = request.headers.get("cf-connecting-ip");

  let clientIp =
    (forwarded ? forwarded.split(",")[0].trim() : null) ||
    realIp ||
    cfIp ||
    "127.0.0.1";

  if (clientIp === "::1" || clientIp === "127.0.0.1") {
    clientIp = "127.0.0.1 (Localhost)";
  }

  const userAgent = request.headers.get("user-agent") || "";

  return NextResponse.json({
    success: true,
    ip: clientIp,
    userAgent,
    timestamp: new Date().toISOString(),
  });
}
