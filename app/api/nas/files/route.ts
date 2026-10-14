import { NextRequest, NextResponse } from "next/server";
import { listNasFiles, createNasFolder, deleteNasFiles, renameNasFile } from "@/lib/synology";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const folderPath = searchParams.get("folder_path") || "/virtual-office";
    const sid = searchParams.get("sid");
    const nasUrl = searchParams.get("url") || process.env.SYNOLOGY_NAS_URL || "http://192.168.162.21:5000";

    if (!sid) {
      return NextResponse.json(
        { success: false, error: "Missing Synology session ID (sid)" },
        { status: 401 }
      );
    }

    const result = await listNasFiles(sid, folderPath, nasUrl);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Error reading NAS files" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, sid, folderPath, folderName, paths, path, newName, nasUrl } = body;
    const targetUrl = nasUrl || process.env.SYNOLOGY_NAS_URL || "http://192.168.162.21:5000";

    if (!sid) {
      return NextResponse.json(
        { success: false, error: "Missing Synology session ID (sid)" },
        { status: 401 }
      );
    }

    if (action === "create_folder") {
      if (!folderName) {
        return NextResponse.json(
          { success: false, error: "Folder name is required" },
          { status: 400 }
        );
      }
      const res = await createNasFolder(sid, folderPath || "/virtual-office", folderName, targetUrl);
      return NextResponse.json(res);
    }

    if (action === "delete") {
      const targetPaths = Array.isArray(paths) ? paths : path ? [path] : [];
      if (targetPaths.length === 0) {
        return NextResponse.json(
          { success: false, error: "กรุณาระบุไฟล์ที่ต้องการลบ (paths)" },
          { status: 400 }
        );
      }
      const res = await deleteNasFiles(sid, targetPaths, targetUrl);
      return NextResponse.json(res);
    }

    if (action === "rename") {
      if (!path || !newName) {
        return NextResponse.json(
          { success: false, error: "Path และ New Name จำเป็นสำหรับการเปลี่ยนชื่อไฟล์" },
          { status: 400 }
        );
      }
      const res = await renameNasFile(sid, path, newName, targetUrl);
      return NextResponse.json(res);
    }

    return NextResponse.json(
      { success: false, error: "Unsupported action" },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Error modifying NAS files" },
      { status: 500 }
    );
  }
}

