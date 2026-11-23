import { NextRequest, NextResponse } from "next/server";
import { supabase as rawSupabase } from "@/lib/supabase";
import {
  getHolidayFiscalYear,
  listHolidaysForFiscalYear,
  ThaiHolidayItem,
} from "@/lib/thai-holidays";

export const dynamic = "force-dynamic";

function requireSupabase() {
  if (!rawSupabase) {
    throw new Error("Supabase ยังไม่ถูกตั้งค่า");
  }
  return rawSupabase;
}

function isMissingHolidayTableError(
  err: { code?: string; message?: string } | null
): boolean {
  if (!err) return false;
  return (
    err.code === "42P01" ||
    err.code === "PGRST205" ||
    /relation .*thai_public_holidays.* does not exist|Could not find the table/i.test(
      err.message || ""
    )
  );
}

async function canManageHolidays(
  actorRole?: string,
  actorId?: string,
  actorName?: string
): Promise<boolean> {
  if (actorRole === "admin") return true;
  if (!actorId && !actorName) return false;
  const db = requireSupabase();
  const [{ data: editors }, { data: customRole }] = await Promise.all([
    db.from("attendance_authorized_editors").select("member_id, member_name"),
    actorId
      ? db
          .from("leave_authorized_roles")
          .select("can_verify")
          .eq("user_id", actorId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return Boolean(
    customRole?.can_verify ||
      actorId === "syno_ยุทธนา" ||
      editors?.some(
        (e) =>
          (actorId && e.member_id === actorId) ||
          (actorName && e.member_name?.trim() === actorName.trim())
      )
  );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fiscalYear = searchParams.get("fiscalYear")
      ? Number(searchParams.get("fiscalYear"))
      : null;

    const db = requireSupabase();
    const { data, error } = await db
      .from("thai_public_holidays")
      .select("*")
      .order("holiday_date", { ascending: true });

    if (error && !isMissingHolidayTableError(error)) {
      throw error;
    }

    const dbHolidays: ThaiHolidayItem[] = (data || []).map((row) => ({
      holidayDate: String(row.holiday_date).slice(0, 10),
      name: String(row.name || ""),
      fiscalYear: Number(row.fiscal_year),
      isActive: Boolean(row.is_active ?? true),
      createdBy: row.created_by ? String(row.created_by) : null,
    }));

    const holidays = fiscalYear
      ? listHolidaysForFiscalYear(fiscalYear, dbHolidays)
      : dbHolidays;

    return NextResponse.json({
      success: true,
      needsMigration: Boolean(error && isMissingHolidayTableError(error)),
      holidays,
      rawHolidays: dbHolidays,
    });
  } catch (err) {
    console.error("GET /api/leave/holidays error:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error ? err.message : "ไม่สามารถโหลดปฏิทินวันหยุดได้",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { holidayDate, name, isActive = true, actorId, actorName, actorRole } =
      body || {};

    if (!holidayDate || !String(name || "").trim()) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุวันที่และชื่อวันหยุดราชการ" },
        { status: 400 }
      );
    }

    const allowed = await canManageHolidays(actorRole, actorId, actorName);
    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "เฉพาะ Admin หรือผู้ตรวจสอบสถิติ/ลงเวลาเท่านั้นที่แก้ไขวันหยุดได้",
        },
        { status: 403 }
      );
    }

    const cleanDate = String(holidayDate).slice(0, 10);
    const fy = getHolidayFiscalYear(cleanDate);

    const { data, error } = await requireSupabase()
      .from("thai_public_holidays")
      .upsert(
        {
          holiday_date: cleanDate,
          name: String(name).trim(),
          fiscal_year: fy,
          is_active: Boolean(isActive),
          created_by: actorName || actorId || "Admin",
        },
        { onConflict: "holiday_date" }
      )
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      holiday: {
        holidayDate: String(data.holiday_date).slice(0, 10),
        name: String(data.name),
        fiscalYear: Number(data.fiscal_year),
        isActive: Boolean(data.is_active),
        createdBy: data.created_by ? String(data.created_by) : null,
      },
    });
  } catch (err) {
    console.error("POST /api/leave/holidays error:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error ? err.message : "ไม่สามารถบันทึกวันหยุดได้",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { holidayDate, actorId, actorName, actorRole } = body || {};

    if (!holidayDate) {
      return NextResponse.json(
        { success: false, error: "ต้องระบุวันที่ที่ต้องการลบ" },
        { status: 400 }
      );
    }

    const allowed = await canManageHolidays(actorRole, actorId, actorName);
    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "เฉพาะ Admin หรือผู้ตรวจสอบสถิติ/ลงเวลาเท่านั้นที่ลบวันหยุดได้",
        },
        { status: 403 }
      );
    }

    const cleanDate = String(holidayDate).slice(0, 10);
    // ตั้งค่า is_active = false แทนการลบแถว เพื่อให้ปิดวันหยุดจาก default seed ได้ด้วย
    const { error } = await requireSupabase()
      .from("thai_public_holidays")
      .upsert(
        {
          holiday_date: cleanDate,
          name: "ยกเลิกวันหยุด",
          fiscal_year: getHolidayFiscalYear(cleanDate),
          is_active: false,
          created_by: actorName || actorId || "Admin",
        },
        { onConflict: "holiday_date" }
      );

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/leave/holidays error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "ไม่สามารถลบวันหยุดได้",
      },
      { status: 500 }
    );
  }
}
