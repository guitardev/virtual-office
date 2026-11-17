import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getFiscalYear } from "@/lib/leave-utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      fiscalYear,
      sickDaysCarried,
      personalDaysCarried,
      maternityDaysCarried,
      vacationAccumulatedDays,
      vacationAnnualDays,
      vacationDaysCarried,
      actorId,
      actorRole,
      actorName,
    } = body || {};

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "ต้องระบุ userId" },
        { status: 400 }
      );
    }

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Supabase ยังไม่ถูกตั้งค่า" },
        { status: 500 }
      );
    }
    const db = supabase;
    let isAllowed = actorRole === "admin";
    if (!isAllowed && (actorId || actorName)) {
      const { data: editors } = await db
        .from("attendance_authorized_editors")
        .select("member_id, member_name");
      isAllowed = Boolean(
        editors?.some(
          (e) =>
            (actorId && e.member_id === actorId) ||
            (actorName && e.member_name?.trim() === actorName.trim())
        )
      );
    }

    if (!isAllowed) {
      return NextResponse.json(
        { success: false, error: "เฉพาะ Admin หรือผู้ดูแลลงเวลาเท่านั้นที่ตั้งค่ายอดวันลาได้" },
        { status: 403 }
      );
    }

    const fy = Number(fiscalYear || getFiscalYear());
    const nowIso = new Date().toISOString();

    const { data, error } = await db
      .from("leave_balances")
      .upsert(
        {
          user_id: userId,
          fiscal_year: fy,
          sick_days_carried: Number(sickDaysCarried || 0),
          personal_days_carried: Number(personalDaysCarried || 0),
          maternity_days_carried: Number(maternityDaysCarried || 0),
          vacation_accumulated_days: Number(vacationAccumulatedDays || 0),
          vacation_annual_days: Number(vacationAnnualDays ?? 10),
          vacation_days_carried: Number(vacationDaysCarried || 0),
          updated_by: actorName || actorId || null,
          updated_at: nowIso,
        },
        { onConflict: "user_id,fiscal_year" }
      )
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      balance: {
        id: data.id,
        userId: data.user_id,
        fiscalYear: data.fiscal_year,
        sickDaysCarried: Number(data.sick_days_carried || 0),
        personalDaysCarried: Number(data.personal_days_carried || 0),
        maternityDaysCarried: Number(data.maternity_days_carried || 0),
        vacationAccumulatedDays: Number(data.vacation_accumulated_days || 0),
        vacationAnnualDays: Number(data.vacation_annual_days ?? 10),
        vacationDaysCarried: Number(data.vacation_days_carried || 0),
        updatedBy: data.updated_by,
        updatedAt: data.updated_at,
      },
    });
  } catch (err) {
    console.error("POST /api/leave/balances error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "ไม่สามารถบันทึกยอดวันลาได้",
      },
      { status: 500 }
    );
  }
}
