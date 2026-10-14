import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folderPath = (formData.get("folder_path") as string) || "/virtual-office";
    const sid = formData.get("sid") as string | null;
    const nasUrl =
      (formData.get("url") as string) ||
      process.env.SYNOLOGY_NAS_URL ||
      "http://192.168.162.21:5000";

    if (!sid) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุ Synology Session ID (sid)" },
        { status: 401 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: "ไม่พบไฟล์ที่ต้องการอัปโหลด" },
        { status: 400 }
      );
    }

    // Limit upload file size (50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: "ขนาดไฟล์เกินกำหนด (สูงสุด 50MB ต่อไฟล์)" },
        { status: 400 }
      );
    }

    const cleanUrl = nasUrl.replace(/\/+$/, "");
    const uploadApiUrl = `${cleanUrl}/webapi/entry.cgi`;

    // Construct multipart form data for Synology FileStation API
    const synoFormData = new FormData();
    synoFormData.append("api", "SYNO.FileStation.Upload");
    synoFormData.append("version", "2");
    synoFormData.append("method", "upload");
    synoFormData.append("_sid", sid);
    synoFormData.append("dest_folder_path", folderPath);
    synoFormData.append("create_parents", "true");
    synoFormData.append("overwrite", "true");

    // Convert file to blob and attach
    const fileBuffer = await file.arrayBuffer();
    const blob = new Blob([fileBuffer], { type: file.type || "application/octet-stream" });
    synoFormData.append("file", blob, file.name);

    const nasRes = await fetch(uploadApiUrl, {
      method: "POST",
      body: synoFormData,
      signal: AbortSignal.timeout(30000), // 30s timeout for upload
    });

    const data = await nasRes.json();

    if (data.success) {
      return NextResponse.json({
        success: true,
        file: {
          name: file.name,
          path: `${folderPath.replace(/\/+$/, "")}/${file.name}`,
          size: file.size,
          type: file.type,
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: data.error?.message || "Synology NAS ปฏิเสธการอัปโหลดไฟล์",
        code: data.error?.code,
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
