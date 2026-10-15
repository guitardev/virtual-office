import { NextRequest, NextResponse } from "next/server";
import { loginSynology } from "@/lib/synology";
import { Member } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, nasUrl } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุบัญชีผู้ใช้และรหัสผ่าน Synology NAS" },
        { status: 400 }
      );
    }

    const targetUrl =
      nasUrl ||
      process.env.SYNOLOGY_NAS_URL ||
      process.env.NEXT_PUBLIC_SYNOLOGY_NAS_URL ||
      "https://nas.smso.site";

    // 1. Authenticate against Synology DSM Web API
    const authResult = await loginSynology(username, password, targetUrl);

    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: authResult.error || "การยืนยันตัวตนกับ Synology NAS ล้มเหลว",
          code: authResult.code,
        },
        { status: 401 }
      );
    }

    // 2. Synthesize or Map Officer Profile for Virtual Office
    const trimmedUser = username.trim();
    const isNasAdmin =
      authResult.is_admin ||
      trimmedUser.toLowerCase() === "admin" ||
      trimmedUser.toLowerCase() === "guitardev";

    // Clean unique ID that properly supports Thai (\u0E00-\u0E7F) and English without turning into "syno_______"
    const cleanSlug = trimmedUser
      .replace(/[^a-zA-Z0-9\u0E00-\u0E7F_-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    let hash = 5381;
    for (let i = 0; i < trimmedUser.length; i++) {
      hash = (hash * 33) ^ trimmedUser.charCodeAt(i);
    }
    const hashStr = (hash >>> 0).toString(36).slice(0, 6);

    const userId =
      trimmedUser.toLowerCase() === "admin"
        ? "syno_admin"
        : cleanSlug
        ? `syno_${cleanSlug}`
        : `syno_user_${hashStr}`;

    const isThai = /[\u0E00-\u0E7F]/.test(trimmedUser);
    const nameParts = trimmedUser.split(/\s+/);
    const firstName =
      trimmedUser.toLowerCase() === "admin"
        ? "ผู้ดูแลระบบ"
        : nameParts[0] || trimmedUser;
    const lastName =
      trimmedUser.toLowerCase() === "admin"
        ? "Synology"
        : nameParts.length > 1
        ? nameParts.slice(1).join(" ")
        : "";

    const displayName =
      trimmedUser.toLowerCase() === "admin"
        ? "ผู้ดูแลระบบ (Synology DSM Admin)"
        : trimmedUser;

    // Use clean local placeholder for email without assuming fake official mail
    const emailPrefix =
      !isThai && cleanSlug ? cleanSlug.toLowerCase() : `user_${hashStr}`;
    const email = `${emailPrefix}@nas.local`;
    const avatarText = trimmedUser.slice(0, 2);

    const member: Member = {
      id: userId,
      prefix: "",
      firstName,
      lastName,
      name: displayName,
      personnelType: undefined,
      role: isNasAdmin ? "admin" : "member",
      position: isNasAdmin ? "ผู้ดูแลระบบ Synology DSM" : "รอกำหนดตำแหน่ง",
      division: "รอกำหนดกลุ่มงาน",
      department: "รอกำหนดกลุ่มงาน",
      email,
      phone: "-",
      lineId: "-",
      status: "active",
      joinedDate: new Date().toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      avatarUrl: undefined,
      avatarText,
    };

    return NextResponse.json({
      success: true,
      sid: authResult.sid,
      account: authResult.account,
      user: member,
      message: `เข้าสู่ระบบสำเร็จผ่าน Synology NAS (${targetUrl})`,
    });
  } catch (err: any) {
    console.error("Synology auth error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ในการเชื่อมต่อ Synology NAS",
      },
      { status: 500 }
    );
  }
}
