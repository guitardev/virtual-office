import { NextRequest, NextResponse } from "next/server";
import {
  loginSynology,
  safeParseJsonResponse,
  DEFAULT_SYNOLOGY_CONFIG,
  DEFAULT_NAS_LAN_URL,
} from "@/lib/synology";

/**
 * API Route: /api/nas/change-password
 * ให้บริการเปลี่ยนรหัสผ่านบัญชี Synology DSM โดยตรงผ่าน WebAPI
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, oldPassword, newPassword, nasUrl } = body;

    // 1. ตรวจสอบข้อมูลนำเข้าเบื้องต้น
    if (!username || !oldPassword || !newPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "กรุณาระบุชื่อผู้ใช้ รหัสผ่านเดิม และรหัสผ่านใหม่ให้ครบถ้วน",
        },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: "รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย ๖ ตัวอักษรตามนโยบายความปลอดภัย",
        },
        { status: 400 }
      );
    }

    if (oldPassword === newPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม",
        },
        { status: 400 }
      );
    }

    const targetUrl =
      nasUrl ||
      process.env.SYNOLOGY_NAS_URL ||
      process.env.NEXT_PUBLIC_SYNOLOGY_NAS_URL ||
      DEFAULT_SYNOLOGY_CONFIG.nasUrl ||
      "https://nas.smso.site";

    // 2. ขั้นแรก: ตรวจสอบความถูกต้องของรหัสผ่านเดิมด้วยการล็อกอินจริงบน Synology NAS
    const authResult = await loginSynology(username.trim(), oldPassword, targetUrl);

    if (!authResult.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            authResult.code === 401
              ? "รหัสผ่านเดิมไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง"
              : authResult.error || "การยืนยันรหัสผ่านเดิมล้มเหลว",
          code: authResult.code || 401,
        },
        { status: 401 }
      );
    }

    const currentSid = authResult.sid;
    if (!currentSid) {
      return NextResponse.json(
        {
          success: false,
          error: "ไม่สามารถขอรับเซสชันจาก Synology NAS ได้",
        },
        { status: 500 }
      );
    }

    // 3. ฟังก์ชันเรียกเปลี่ยนรหัสผ่านบน NAS WebAPI
    const executeDsmPasswordChange = async (url: string) => {
      const cleanUrl = url.replace(/\/+$/, "");

      // แบบที่ 1: มาตรฐาน SYNO.Core.NormalUser (DSM 6 และ DSM 7 ส่วนใหญ่)
      const formBody1 = new URLSearchParams({
        api: "SYNO.Core.NormalUser",
        version: "1",
        method: "set",
        old_password: oldPassword,
        password: newPassword,
        _sid: currentSid,
      });

      try {
        const res1 = await fetch(`${cleanUrl}/webapi/entry.cgi`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formBody1.toString(),
          signal: AbortSignal.timeout(8000),
        });

        const data1 = await safeParseJsonResponse(res1);

        if (data1.success) {
          return { success: true, data: data1 };
        }

        // หาก API แรกไม่รองรับ (Code 101/102) ให้ลองแบบที่ 2 สำหรับ DSM 7+ (SYNO.Core.User.Password)
        const errCode = data1?.error?.code || data1?.code;
        if (errCode === 101 || errCode === 102) {
          const formBody2 = new URLSearchParams({
            api: "SYNO.Core.User.Password",
            version: "1",
            method: "set",
            old_password: oldPassword,
            new_password: newPassword,
            _sid: currentSid,
          });

          const res2 = await fetch(`${cleanUrl}/webapi/entry.cgi`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formBody2.toString(),
            signal: AbortSignal.timeout(8000),
          });

          const data2 = await safeParseJsonResponse(res2);
          if (data2.success) {
            return { success: true, data: data2 };
          }
          return { success: false, data: data2 };
        }

        return { success: false, data: data1 };
      } catch (err: any) {
        return {
          success: false,
          data: { error: { message: err?.message || "Connection timeout" }, code: 504 },
        };
      }
    };

    let result = await executeDsmPasswordChange(targetUrl);

    // Fallback to local LAN if Cloudflare Tunnel domain is offline (Error 1033 / 502 / 530)
    if (
      !result.success &&
      (result.data?.code === 1033 ||
        result.data?.code === 502 ||
        result.data?.code === 530 ||
        targetUrl.includes("nas.smso.site"))
    ) {
      const lanUrl = DEFAULT_NAS_LAN_URL;
      if (targetUrl !== lanUrl) {
        try {
          const lanResult = await executeDsmPasswordChange(lanUrl);
          if (lanResult.success || (lanResult.data?.code && lanResult.data?.code !== 1033 && lanResult.data?.code !== 502)) {
            result = lanResult;
          }
        } catch {
          // ignore fallback error
        }
      }
    }

    // 4. ตรวจสอบผลลัพธ์จาก DSM
    if (result.success) {
      // ทำการยืนยันตัวตนด้วยรหัสผ่านใหม่ทันที เพื่อให้ได้ Session ID ใหม่กลับไปใช้งานต่อเนื่อง
      const verifyNewAuth = await loginSynology(username.trim(), newPassword, targetUrl);

      return NextResponse.json({
        success: true,
        message: "เปลี่ยนรหัสผ่านบน Synology NAS สำเร็จเรียบร้อยแล้ว",
        newSid: verifyNewAuth.success ? verifyNewAuth.sid : currentSid,
        account: username.trim(),
      });
    }

    // แปลงรหัส Error ของ Synology DSM เป็นข้อความภาษาไทย
    const rawError = result.data?.error;
    const errorCode = (typeof rawError === "object" ? rawError?.code : result.data?.code) || 400;

    let errorMessage = "ไม่สามารถเปลี่ยนรหัสผ่านบน Synology NAS ได้";
    if (errorCode === 400) {
      errorMessage =
        "รหัสผ่านใหม่ไม่ผ่านเกณฑ์ความปลอดภัยของ Synology NAS (แนะนำให้มีความยาวอย่างน้อย ๘ ตัวอักษร มีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก และตัวเลข)";
    } else if (errorCode === 401) {
      errorMessage = "รหัสผ่านเดิมไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";
    } else if (errorCode === 402) {
      errorMessage = "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม";
    } else if (errorCode === 403) {
      errorMessage = "รหัสผ่านใหม่ต้องไม่มีชื่อผู้ใช้หรือชื่อจริงเป็นส่วนประกอบ";
    } else if (errorCode === 404) {
      errorMessage = "บัญชีผู้ใช้นี้ถูกจำกัดสิทธิ์ ไม่อนุญาตให้เปลี่ยนรหัสผ่านด้วยตนเอง";
    } else if (typeof rawError === "string") {
      errorMessage = rawError;
    } else if (rawError?.message) {
      errorMessage = rawError.message;
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        code: errorCode,
      },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: `เกิดข้อผิดพลาดในการประมวลผล: ${err?.message || "เซิร์ฟเวอร์ขัดข้อง"}`,
      },
      { status: 500 }
    );
  }
}
