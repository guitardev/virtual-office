import { NextRequest, NextResponse } from "next/server";
import { supabase as rawSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function requireSupabase() {
  if (!rawSupabase) {
    throw new Error("Supabase ยังไม่ถูกตั้งค่า");
  }
  return rawSupabase;
}

function isMissingTableError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return (
    err.code === "42P01" ||
    err.code === "PGRST205" ||
    /relation .*leave_authorized_roles.* does not exist|Could not find the table/i.test(
      err.message || ""
    )
  );
}

export interface LeaveAuthorizedRoleItem {
  id: string;
  userId: string;
  userName: string;
  division: string;
  canVerify: boolean;
  canSupervisor: boolean;
  canApprove: boolean;
  grantedBy: string | null;
  updatedAt: string;
}

function mapRow(row: Record<string, unknown>): LeaveAuthorizedRoleItem {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    userName: String(row.user_name || ""),
    division: String(row.division || ""),
    canVerify: Boolean(row.can_verify),
    canSupervisor: Boolean(row.can_supervisor),
    canApprove: Boolean(row.can_approve),
    grantedBy: row.granted_by ? String(row.granted_by) : null,
    updatedAt: String(row.updated_at || ""),
  };
}

export async function GET() {
  try {
    const { data, error } = await requireSupabase()
      .from("leave_authorized_roles")
      .select("*")
      .order("user_name", { ascending: true });

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({
          success: true,
          needsMigration: true,
          roles: [],
        });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      needsMigration: false,
      roles: (data || []).map(mapRow),
    });
  } catch (err) {
    console.error("GET /api/leave/permissions error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "ไม่สามารถโหลดสิทธิ์ใบลาได้",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      userName,
      division,
      canVerify,
      canSupervisor,
      canApprove,
      actorRole,
      actorName,
    } = body || {};

    if (actorRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "เฉพาะ Admin เท่านั้นที่มอบสิทธิ์ระบบใบลาได้" },
        { status: 403 }
      );
    }

    if (!userId || !userName) {
      return NextResponse.json(
        { success: false, error: "ต้องระบุ userId และ userName" },
        { status: 400 }
      );
    }

    const db = requireSupabase();

    if (!canVerify && !canSupervisor && !canApprove) {
      const { error: delErr } = await db
        .from("leave_authorized_roles")
        .delete()
        .eq("user_id", userId);
      if (delErr) {
        if (isMissingTableError(delErr)) {
          return NextResponse.json(
            {
              success: false,
              needsMigration: true,
              error: "ยังไม่ได้สร้างตาราง leave_authorized_roles ใน Supabase",
            },
            { status: 400 }
          );
        }
        throw delErr;
      }
      return NextResponse.json({ success: true, removed: true });
    }

    const { data, error } = await db
      .from("leave_authorized_roles")
      .upsert(
        {
          user_id: userId,
          user_name: userName,
          division: division || "",
          can_verify: Boolean(canVerify),
          can_supervisor: Boolean(canSupervisor),
          can_approve: Boolean(canApprove),
          granted_by: actorName || "Admin",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select("*")
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            success: false,
            needsMigration: true,
            error: "ยังไม่ได้สร้างตาราง leave_authorized_roles ใน Supabase",
          },
          { status: 400 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      role: mapRow(data),
    });
  } catch (err) {
    console.error("POST /api/leave/permissions error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "ไม่สามารถบันทึกสิทธิ์ใบลาได้",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, actorRole } = body || {};

    if (actorRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "เฉพาะ Admin เท่านั้นที่ถอนสิทธิ์ระบบใบลาได้" },
        { status: 403 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "ต้องระบุ userId" },
        { status: 400 }
      );
    }

    const { error } = await requireSupabase()
      .from("leave_authorized_roles")
      .delete()
      .eq("user_id", userId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/leave/permissions error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "ไม่สามารถถอนสิทธิ์ใบลาได้",
      },
      { status: 500 }
    );
  }
}
