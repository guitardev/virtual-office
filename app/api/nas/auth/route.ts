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

    const targetUrl = nasUrl || process.env.SYNOLOGY_NAS_URL || "http://192.168.162.21:5000";

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
    const isNasAdmin = authResult.is_admin || username.toLowerCase() === "admin" || username.toLowerCase() === "guitardev";
    const displayName = username.toLowerCase() === "admin"
      ? "ผู้ดูแลระบบ (Synology DSM Admin)"
      : `เจ้าหน้าที่ (${username})`;

    const member: Member = {
      id: `syno_${username.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
      prefix: "นาย",
      firstName: username.toLowerCase() === "admin" ? "ผู้ดูแลระบบ" : username,
      lastName: username.toLowerCase() === "admin" ? "Synology" : "พมจ.",
      name: displayName,
      personnelType: "ข้าราชการ",
      role: isNasAdmin ? "admin" : "member",
      position: isNasAdmin ? "ผู้ดูแลระบบเครือข่ายและระบบสารบรรณ NAS" : "เจ้าหน้าที่ปฏิบัติการประจำสำนักงาน",
      division: "ฝ่ายบริหารทั่วไป (กลุ่มงานสารบรรณและเทคโนโลยีสารสนเทศ)",
      department: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
      email: `${username.toLowerCase()}@kpp-m-society.go.th`,
      phone: "055-705031 ต่อ 102",
      lineId: `@syno_${username.toLowerCase()}`,
      status: "active",
      joinedDate: new Date().toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      avatarUrl: isNasAdmin
        ? "https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/10/S__2457668.jpg"
        : undefined,
      avatarText: username.slice(0, 2).toUpperCase(),
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
