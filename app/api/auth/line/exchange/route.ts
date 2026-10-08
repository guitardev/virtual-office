import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, redirectUri } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Missing authorization code" },
        { status: 400 }
      );
    }

    const channelId =
      process.env.NEXT_PUBLIC_LINE_CHANNEL_ID || process.env.LINE_CHANNEL_ID || "1656002115";
    const channelSecret = process.env.LINE_CHANNEL_SECRET;

    // If channelSecret is not yet set in environment, report missingSecret so client can handle gracefully
    if (!channelSecret) {
      return NextResponse.json({
        success: false,
        missingSecret: true,
        channelId,
        message:
          "พบ LINE Channel ID แต่ยังไม่ได้ระบุ LINE_CHANNEL_SECRET ใน .env.local (ดูได้ที่ LINE Developers Console > Basic settings > Channel secret)",
      });
    }

    // Exchange authorization code for access_token and id_token with LINE Token API
    const tokenUrl = "https://api.line.me/oauth2/v2.1/token";
    const params = new URLSearchParams();
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", redirectUri || "http://localhost:3000");
    params.append("client_id", channelId);
    params.append("client_secret", channelSecret);

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error) {
      console.error("LINE Token exchange error:", tokenData);
      return NextResponse.json(
        {
          success: false,
          error:
            tokenData.error_description ||
            tokenData.error ||
            "แลกเปลี่ยน Token กับ LINE API ไม่สำเร็จ ตรวจสอบ Callback URL และ Channel Secret",
        },
        { status: 400 }
      );
    }

    // Get user profile from LINE Profile API
    let profileData: any = {};
    if (tokenData.access_token) {
      try {
        const profileRes = await fetch("https://api.line.me/v2/profile", {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        });
        if (profileRes.ok) {
          profileData = await profileRes.json();
        }
      } catch (err) {
        console.warn("Could not fetch LINE profile:", err);
      }
    }

    // Verify user ID token via official LINE Verification API
    let email = "";
    if (tokenData.id_token) {
      try {
        const verifyParams = new URLSearchParams();
        verifyParams.append("id_token", tokenData.id_token);
        verifyParams.append("client_id", channelId);

        const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: verifyParams.toString(),
        });

        if (verifyRes.ok) {
          const verifiedData = await verifyRes.json();
          email = verifiedData.email || "";
          if (verifiedData.name) {
            profileData.displayName = verifiedData.name;
          }
          if (verifiedData.picture) {
            profileData.pictureUrl = verifiedData.picture;
          }
          if (verifiedData.sub) {
            profileData.userId = verifiedData.sub;
          }
        } else {
          console.warn("LINE ID token verification failed, falling back to payload decode");
          const payloadBase64 = tokenData.id_token.split(".")[1];
          if (payloadBase64) {
            const payloadJson = Buffer.from(payloadBase64, "base64").toString("utf-8");
            const payload = JSON.parse(payloadJson);
            email = payload.email || "";
            if (!profileData.displayName && payload.name) {
              profileData.displayName = payload.name;
            }
            if (!profileData.pictureUrl && payload.picture) {
              profileData.pictureUrl = payload.picture;
            }
            if (!profileData.userId && payload.sub) {
              profileData.userId = payload.sub;
            }
          }
        }
      } catch (e) {
        console.warn("Could not verify ID token:", e);
      }
    }

    const userId = profileData.userId || `u_${Date.now()}`;
    const displayName = profileData.displayName || "LINE User";
    const pictureUrl = profileData.pictureUrl || undefined;

    return NextResponse.json({
      success: true,
      profile: {
        userId,
        displayName,
        pictureUrl,
        email: email || `${userId.slice(0, 8)}@line.user`,
      },
    });
  } catch (error: any) {
    console.error("Error in /api/auth/line/exchange:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
