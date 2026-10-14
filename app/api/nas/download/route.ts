import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const filePath = searchParams.get("path");
    const sid = searchParams.get("sid");
    const mode = searchParams.get("mode") || "download"; // "open" for preview, "download" for attachment
    const nasUrl =
      searchParams.get("url") ||
      process.env.SYNOLOGY_NAS_URL ||
      "http://192.168.162.21:5000";

    const effectiveSid = sid || process.env.SYNOLOGY_SERVICE_SID || "system_chat_session";

    if (!effectiveSid) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุ Synology Session ID (sid)" },
        { status: 401 }
      );
    }

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุเส้นทางไฟล์ที่ต้องการดาวน์โหลด (path)" },
        { status: 400 }
      );
    }

    // In mock or simulated test environments
    if (effectiveSid.startsWith("mock_") || effectiveSid === "system_chat_session") {
      const fileName = filePath.split("/").filter(Boolean).pop() || "downloaded-file";
      const sampleContent = `สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร\nเอกสารจาก Synology NAS (192.168.162.21): ${filePath}\nดาวน์โหลดสำเร็จ`;
      return new NextResponse(sampleContent, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        },
      });
    }

    const cleanUrl = nasUrl.replace(/\/+$/, "");
    const downloadApiUrl = `${cleanUrl}/webapi/entry.cgi?api=SYNO.FileStation.Download&version=2&method=download&path=${encodeURIComponent(
      filePath
    )}&mode=${encodeURIComponent(mode)}&_sid=${encodeURIComponent(effectiveSid)}`;

    const nasRes = await fetch(downloadApiUrl, {
      method: "GET",
      signal: AbortSignal.timeout(60000), // 60s timeout for large file stream
    });

    if (!nasRes.ok) {
      return NextResponse.json(
        { success: false, error: `ไม่สามารถดึงไฟล์จาก Synology NAS ได้ (HTTP ${nasRes.status})` },
        { status: nasRes.status }
      );
    }

    // Extract filename from path
    const fileName = filePath.split("/").filter(Boolean).pop() || "downloaded-file";

    // Determine content type
    let contentType = nasRes.headers.get("content-type") || "application/octet-stream";
    if (fileName.endsWith(".pdf")) contentType = "application/pdf";
    else if (fileName.endsWith(".png")) contentType = "image/png";
    else if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) contentType = "image/jpeg";
    else if (fileName.endsWith(".xlsx")) contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    else if (fileName.endsWith(".docx")) contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    else if (fileName.endsWith(".txt")) contentType = "text/plain; charset=utf-8";

    // Build disposition header
    const disposition =
      mode === "open"
        ? `inline; filename="${encodeURIComponent(fileName)}"`
        : `attachment; filename="${encodeURIComponent(fileName)}"`;

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", disposition);

    const contentLength = nasRes.headers.get("content-length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    return new Response(nasRes.body, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    console.error("NAS File Download Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: `เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์: ${err?.message || "ไม่สามารถเชื่อมต่อ NAS ได้"}`,
      },
      { status: 500 }
    );
  }
}
