import { NextRequest, NextResponse } from "next/server";
import { createNasFolder, loginSynology, safeParseJsonResponse } from "@/lib/synology";

export const dynamic = "force-dynamic";

async function ensureDirectoryExists(folderPath: string, sid: string, nasUrl: string): Promise<boolean> {
  try {
    const cleanPath = ("/" + folderPath.trim())
      .replace(/\\/g, "/")
      .replace(/\/+/g, "/")
      .replace(/\/+$/, "");
    const lastSlashIndex = cleanPath.lastIndexOf("/");
    if (lastSlashIndex <= 0) {
      return true;
    }
    const parent = cleanPath.substring(0, lastSlashIndex);
    const folderName = cleanPath.substring(lastSlashIndex + 1);
    if (!parent || !folderName) return true;

    const res = await createNasFolder(sid, parent, folderName, nasUrl);
    return res.success || res.code === 414 || res.code === 1806;
  } catch (err) {
    console.warn(`[NAS Upload] Auto-create folder ${folderPath} failed:`, err);
    return false;
  }
}

function getSynologyUploadErrorMessage(code?: number, folderPath?: string): string {
  switch (code) {
    case 101:
      return "พารามิเตอร์ของ Synology WebAPI ไม่ถูกต้อง (Invalid parameter)";
    case 102:
      return "ไม่พบ API หรือเวอร์ชันที่เรียกใช้งานบน Synology NAS";
    case 103:
      return "ไม่มีสิทธิ์เรียกใช้งาน Method นี้";
    case 105:
      return "เซสชัน Synology NAS ไม่ได้รับสิทธิ์เข้าถึงฟังก์ชันนี้";
    case 119:
      return "เซสชัน Synology NAS หมดอายุ กรุณาออกจากระบบและเข้าสู่ระบบใหม่อีกครั้ง";
    case 400:
      return `พารามิเตอร์ปลายทางไม่ถูกต้อง หรือรูปแบบไฟล์ไม่รองรับ (โฟลเดอร์: ${folderPath})`;
    case 401:
      return `ไม่สามารถเข้าถึงตำแหน่งปลายทางบน NAS ได้ (พารามิเตอร์ปลายทางไม่ถูกต้อง หรือสิทธิ์ไม่เพียงพอในโฟลเดอร์ "${folderPath}")`;
    case 403:
    case 404:
    case 405:
    case 406:
      return `ไม่มีสิทธิ์เขียนไฟล์ลงในโฟลเดอร์ "${folderPath}" บน Synology NAS (กรุณาตรวจสอบสิทธิ์ Read/Write ของผู้ใช้ใน DSM Control Panel -> Shared Folder)`;
    case 407:
      if (folderPath === "/photo") {
        return "ไม่สามารถอัปโหลดไฟล์ไปที่โฟลเดอร์ราก /photo ได้โดยตรง (Synology Photos กำหนดให้บันทึกในโฟลเดอร์ย่อย เช่น /photo/General หรือสร้างอัลบั้มก่อน)";
      }
      return `เกิดข้อผิดพลาดของระบบไฟล์ภายใน Synology NAS (รหัส 407: ไม่สามารถเขียนลงในโฟลเดอร์ "${folderPath || "ไม่ระบุ"}" กรุณาตรวจสอบว่ามีโฟลเดอร์นี้และผู้ใช้ได้รับสิทธิ์ Management หรือ Upload ใน Synology Photos -> Settings -> Shared Space -> Set Access Permissions บน DSM)`;
    case 408:
      if (folderPath?.includes("/home")) {
        return `ไม่พบโฟลเดอร์ "${folderPath}" บน NAS (สำหรับพื้นที่ส่วนบุคคล กรุณาตรวจสอบว่าได้เปิด "User Home service" ใน DSM Control Panel > User & Group > Advanced แล้วหรือไม่)`;
      }
      return `ไม่พบโฟลเดอร์แชร์ปลายทาง "${folderPath}" บน Synology NAS (กรุณาสร้าง Shared Folder นี้ใน DSM Control Panel ก่อน)`;
    case 414:
      return "มีไฟล์ชื่อนี้อยู่แล้วในระบบ และไม่อนุญาตให้เขียนทับ";
    case 1800:
      return "ไม่พบข้อมูลไฟล์ที่ส่งไปยังเซิร์ฟเวอร์ NAS หรือ Boundary ข้อมูลไม่ถูกต้อง";
    case 1801:
      return "เกิดข้อผิดพลาดในการรับและบันทึกไฟล์บน Synology NAS";
    case 1802:
      return "ขนาดไฟล์ใหญ่เกินกว่าที่เซิร์ฟเวอร์ Synology NAS กำหนด";
    case 1803:
      return "ไฟล์ที่ส่งไปมีขนาดเป็น 0 ไบต์";
    case 1804:
      return `ไม่มีสิทธิ์เขียนไฟล์ หรือไม่พบโฟลเดอร์ปลายทาง "${folderPath}" บน Synology NAS`;
    case 1805:
      if (folderPath?.includes("/home")) {
        return `ไม่พบโฟลเดอร์ "${folderPath}" บน NAS (สำหรับพื้นที่ส่วนบุคคล กรุณาตรวจสอบว่าได้เปิด "User Home service" ใน DSM Control Panel > User & Group > Advanced แล้วหรือไม่)`;
      }
      return `ไม่พบโฟลเดอร์แชร์ปลายทาง "${folderPath}" บน NAS (กรุณาตรวจสอบว่ามี Shared Folder นี้ใน DSM Control Panel)`;
    default:
      return `Synology NAS ปฏิเสธการอัปโหลดไฟล์ (รหัสข้อผิดพลาด: ${code || "Unknown"}, โฟลเดอร์ปลายทาง: "${folderPath || "ไม่ระบุ"}")`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const rawFolderPath = (formData.get("folder_path") as string) || "/chat_attachments";
    const rawSid = formData.get("sid") as string | null;
    const sid =
      rawSid && rawSid !== "null" && rawSid !== "undefined" && rawSid.trim() !== ""
        ? rawSid.trim()
        : null;

    const nasUrl =
      (formData.get("url") as string) ||
      process.env.SYNOLOGY_NAS_URL ||
      process.env.NEXT_PUBLIC_SYNOLOGY_NAS_URL ||
      "https://nas.smso.site";

    const serviceAccount =
      (formData.get("service_account") as string) ||
      process.env.SYNOLOGY_SERVICE_ACCOUNT;
    const servicePassword =
      (formData.get("service_password") as string) ||
      process.env.SYNOLOGY_SERVICE_PASSWORD;

    let effectiveSid = sid || process.env.SYNOLOGY_SERVICE_SID || null;

    // If no valid session ID provided, try auto-authenticating with Service Account
    if ((!effectiveSid || effectiveSid === "system_chat_session") && serviceAccount && servicePassword) {
      try {
        const auth = await loginSynology(serviceAccount, servicePassword, nasUrl);
        if (auth.success && auth.sid) {
          effectiveSid = auth.sid;
          console.log(`[NAS Upload] Auto-authenticated service account: ${serviceAccount}`);
        }
      } catch (authErr: any) {
        console.warn("[NAS Upload] Service account auto-login failed:", authErr?.message);
      }
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: "ไม่พบไฟล์ที่ต้องการอัปโหลด" },
        { status: 400 }
      );
    }

    // Normalize folder path: ensure single leading slash, convert backslashes, collapse multiple slashes, and strip trailing slashes
    let cleanFolderPath = ("/" + rawFolderPath.trim())
      .replace(/\\/g, "/")
      .replace(/\/+/g, "/")
      .replace(/\/+$/, "");
    if (cleanFolderPath === "/" || cleanFolderPath === "") {
      return NextResponse.json(
        {
          success: false,
          error: "กรุณาระบุหรือเลือกโฟลเดอร์ปลายทางก่อนอัปโหลดไฟล์ (ไม่สามารถเขียนไฟล์ลงใน Root ได้โดยตรง)",
          code: 400,
        },
        { status: 400 }
      );
    }

    // In mock or simulated test fallback environments
    if (effectiveSid && (effectiveSid.startsWith("mock_") || effectiveSid === "system_chat_session" || effectiveSid.includes("mock"))) {
      return NextResponse.json({
        success: true,
        file: {
          name: file.name,
          path: `${cleanFolderPath}/${file.name}`,
          size: file.size,
          type: file.type || "application/octet-stream",
        },
      });
    }

    // Require an authenticated session
    if (!effectiveSid) {
      return NextResponse.json(
        {
          success: false,
          error: "ไม่พบเซสชัน Synology NAS กรุณาเข้าสู่ระบบผ่าน Synology NAS ก่อนทำการอัปโหลดไฟล์",
          code: 119,
          requireAuth: true,
        },
        { status: 401 }
      );
    }

    // Limit upload file size: 4.2MB to prevent Vercel Serverless Function 4.5MB payload crashes, or 100MB on local/custom server
    const isVercel = !!process.env.VERCEL;
    const MAX_SIZE = isVercel ? 4.2 * 1024 * 1024 : 100 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `ขนาดไฟล์ (${(file.size / (1024 * 1024)).toFixed(1)}MB) เกินขีดจำกัดสูงสุด (${isVercel ? "4.2MB ต่อไฟล์ผ่านคลาวด์ Vercel" : "100MB"}) กรุณาลดขนาดไฟล์ หรือใช้ Direct Client-to-NAS Upload`,
          code: 413,
        },
        { status: 413 }
      );
    }

    const cleanUrl = nasUrl.replace(/\/+$/, "");
    const fileBuffer = await file.arrayBuffer();

    // Helper to attempt upload to a specific target path
    const attemptUpload = async (targetPath: string) => {
      // Pass api, version, method, and _sid in URL query string so DSM entry.cgi routes upload immediately
      const uploadApiUrl = `${cleanUrl}/webapi/entry.cgi?api=SYNO.FileStation.Upload&version=2&method=upload&_sid=${encodeURIComponent(
        effectiveSid || ""
      )}`;

      const synoFormData = new FormData();
      // DSM 7 standard parameters: 'path', 'create_parents', 'overwrite'
      synoFormData.append("path", targetPath);
      synoFormData.append("create_parents", "true");
      synoFormData.append("overwrite", "true");

      // Binary payload must be placed last
      const blob = new Blob([fileBuffer], { type: file.type || "application/octet-stream" });
      synoFormData.append("file", blob, file.name);

      const nasRes = await fetch(uploadApiUrl, {
        method: "POST",
        body: synoFormData,
        signal: AbortSignal.timeout(30000),
      });

      const data = await safeParseJsonResponse(nasRes);
      return { ok: nasRes.ok, status: nasRes.status, data };
    };

    // DSM 7 Synology Photos: writing files directly to root /photo is forbidden by DSM ACL (Code 407).
    // Automatically route loose uploads in Shared Space root to /photo/General.
    if (cleanFolderPath === "/photo") {
      cleanFolderPath = "/photo/General";
      await ensureDirectoryExists("/photo/General", effectiveSid, cleanUrl);
    } else if (cleanFolderPath.startsWith("/photo/") || cleanFolderPath.startsWith("/home/Photos/")) {
      // Proactively ensure target folder exists on DSM filesystem before uploading to avoid error 407/408
      await ensureDirectoryExists(cleanFolderPath, effectiveSid, cleanUrl);
    }

    let result = await attemptUpload(cleanFolderPath);

    // Fallback 1: If cleanFolderPath was '/chat_attachments' and returned 407 / 408 / 1804 / 1805,
    // try fallback shared folder paths '/virtual-office/chat_attachments'
    if (
      !result.data?.success &&
      [407, 408, 1804, 1805].includes(result.data?.error?.code) &&
      cleanFolderPath === "/chat_attachments"
    ) {
      console.log("[NAS Upload] /chat_attachments not found as root share, trying /virtual-office/chat_attachments...");
      await ensureDirectoryExists("/virtual-office/chat_attachments", effectiveSid, cleanUrl);
      const fallbackResult = await attemptUpload("/virtual-office/chat_attachments");
      if (fallbackResult.data?.success) {
        result = fallbackResult;
        cleanFolderPath = "/virtual-office/chat_attachments";
      }
    }

    // Fallback 2: If uploading to root of shared photos '/photo' and rejected due to root permissions or file op fail (401, 403, 404, 405, 406, 407, 408, 1804, 1805),
    // try automatically uploading into '/photo/General'
    if (
      !result.data?.success &&
      [401, 403, 404, 405, 406, 407, 408, 1804, 1805].includes(result.data?.error?.code) &&
      cleanFolderPath === "/photo"
    ) {
      console.log("[NAS Upload] Root /photo write restricted, ensuring /photo/General exists and retrying...");
      await ensureDirectoryExists("/photo/General", effectiveSid, cleanUrl);
      const photoGeneralResult = await attemptUpload("/photo/General");
      if (photoGeneralResult.data?.success) {
        result = photoGeneralResult;
        cleanFolderPath = "/photo/General";
      }
    }

    // Fallback 3: If target folder does not exist or file operation failed (407, 408, 1804, 1805),
    // attempt directory creation with DSM 7 compliant createNasFolder and re-upload
    if (
      !result.data?.success &&
      [407, 408, 1804, 1805].includes(result.data?.error?.code)
    ) {
      console.log(`[NAS Upload] Folder ${cleanFolderPath} error (${result.data?.error?.code}), attempting directory creation and retry...`);
      const created = await ensureDirectoryExists(cleanFolderPath, effectiveSid, cleanUrl);
      if (created) {
        const retryResult = await attemptUpload(cleanFolderPath);
        if (retryResult.data?.success) {
          result = retryResult;
        }
      }
    }

    if (result.data && result.data.success) {
      return NextResponse.json({
        success: true,
        file: {
          name: file.name,
          path: `${cleanFolderPath}/${file.name}`,
          size: file.size,
          type: file.type || "application/octet-stream",
        },
      });
    }

    const errorCode = result.data?.error?.code || result.data?.code;
    let diagnosticMessage = result.data?.error;
    if (typeof diagnosticMessage !== "string" || !diagnosticMessage) {
      diagnosticMessage = getSynologyUploadErrorMessage(errorCode, cleanFolderPath);
    }

    return NextResponse.json(
      {
        success: false,
        error: diagnosticMessage,
        code: errorCode || result.status,
        requireAuth: errorCode === 119 || errorCode === 105,
      },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("NAS File Upload Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: `เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ${err?.message || "ไม่สามารถเชื่อมต่อ NAS ได้"}`,
      },
      { status: 500 }
    );
  }
}
