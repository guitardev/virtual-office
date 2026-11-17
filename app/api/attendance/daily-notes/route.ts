import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export type DailyNoteType =
  | "general"
  | "sick_leave"
  | "personal_leave"
  | "vacation_leave"
  | "official_trip"
  | "wfh"
  | "other";

export interface AttendanceDailyNoteItem {
  id: string;
  workDate: string;
  scannerUserId: number;
  userId: string | null;
  noteType: DailyNoteType;
  noteText: string;
  refType: string | null;
  refId: string | null;
  updatedBy: string | null;
  updatedByName: string | null;
  updatedAt: string;
}

function isMissingTableError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return (
    err.code === "42P01" ||
    err.code === "PGRST205" ||
    /relation .*attendance_daily_notes.* does not exist|Could not find the table/i.test(
      err.message || ""
    )
  );
}

function mapRow(row: Record<string, unknown>): AttendanceDailyNoteItem {
  return {
    id: String(row.id),
    workDate: String(row.work_date || "").slice(0, 10),
    scannerUserId: Number(row.scanner_user_id || 0),
    userId: row.user_id ? String(row.user_id) : null,
    noteType: (row.note_type as DailyNoteType) || "general",
    noteText: String(row.note_text || ""),
    refType: row.ref_type ? String(row.ref_type) : null,
    refId: row.ref_id ? String(row.ref_id) : null,
    updatedBy: row.updated_by ? String(row.updated_by) : null,
    updatedByName: row.updated_by_name ? String(row.updated_by_name) : null,
    updatedAt: String(row.updated_at || ""),
  };
}

export async function GET(req: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "ยังไม่ได้ตั้งค่า Supabase" },
        { status: 503 }
      );
    }

    const workDate = (req.nextUrl.searchParams.get("date") || "").slice(0, 10);
    if (!workDate) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุวันที่ (date)" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("attendance_daily_notes")
      .select("*")
      .eq("work_date", workDate)
      .order("scanner_user_id", { ascending: true });

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({
          success: true,
          notes: [],
          needsMigration: true,
        });
      }
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notes: (data || []).map((r) => mapRow(r as Record<string, unknown>)),
      needsMigration: false,
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json(
      { success: false, error: e.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "ยังไม่ได้ตั้งค่า Supabase" },
        { status: 503 }
      );
    }

    const body = await req.json();
    const workDate = String(body.workDate || "").slice(0, 10);
    const scannerUserId = Number(body.scannerUserId || 0);
    const noteType = (body.noteType as DailyNoteType) || "general";
    const noteText = String(body.noteText || "").trim();

    if (!workDate || !scannerUserId) {
      return NextResponse.json(
        { success: false, error: "ข้อมูล workDate หรือ scannerUserId ไม่ครบถ้วน" },
        { status: 400 }
      );
    }

    // If cleared back to empty general note, remove row cleanly
    if (!noteText && noteType === "general") {
      const { error: delErr } = await supabase
        .from("attendance_daily_notes")
        .delete()
        .eq("work_date", workDate)
        .eq("scanner_user_id", scannerUserId);

      if (delErr) {
        if (isMissingTableError(delErr)) {
          return NextResponse.json(
            { success: false, needsMigration: true, error: "ยังไม่ได้สร้างตาราง attendance_daily_notes" },
            { status: 400 }
          );
        }
        return NextResponse.json({ success: false, error: delErr.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, deleted: true });
    }

    const payload = {
      work_date: workDate,
      scanner_user_id: scannerUserId,
      user_id: body.userId ? String(body.userId) : null,
      note_type: noteType,
      note_text: noteText,
      ref_type: body.refType ? String(body.refType) : null,
      ref_id: body.refId ? String(body.refId) : null,
      updated_by: body.updatedBy ? String(body.updatedBy) : null,
      updated_by_name: body.updatedByName ? String(body.updatedByName) : null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("attendance_daily_notes")
      .upsert(payload, { onConflict: "work_date,scanner_user_id" })
      .select("*")
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            success: false,
            needsMigration: true,
            error: "ยังไม่ได้สร้างตาราง attendance_daily_notes ใน Supabase",
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      note: mapRow(data as Record<string, unknown>),
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json(
      { success: false, error: e.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
