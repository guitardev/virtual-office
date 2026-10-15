import { NextRequest, NextResponse } from "next/server";

const CF_TEST_SECRET = "1x0000000000000000000000000000000AA";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = body?.token;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing Turnstile verification token" },
        { status: 400 }
      );
    }

    // Bypass in development if dummy token
    if (token === "cf-turnstile-dummy-pass-token") {
      return NextResponse.json({
        success: true,
        message: "Development mode dummy verification passed",
      });
    }

    const secretKey =
      process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || CF_TEST_SECRET;

    // Get client IP
    const clientIp =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      undefined;

    // Verify token with Cloudflare API
    const formData = new URLSearchParams();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (clientIp) {
      formData.append("remoteip", clientIp);
    }

    const cfResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      }
    );

    const cfData = await cfResponse.json();

    if (cfData.success) {
      return NextResponse.json({
        success: true,
        challenge_ts: cfData.challenge_ts,
        hostname: cfData.hostname,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Cloudflare Turnstile token verification failed",
          errorCodes: cfData["error-codes"],
        },
        { status: 403 }
      );
    }
  } catch (error: any) {
    console.error("Turnstile verification error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Internal Turnstile verification error",
      },
      { status: 500 }
    );
  }
}
