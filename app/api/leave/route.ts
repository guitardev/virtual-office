import { NextRequest, NextResponse } from "next/server";
import { supabase as rawSupabase } from "@/lib/supabase";
import {
  getFiscalYear,
  getWorkingDatesBetween,
  LEAVE_TYPE_META,
  LeaveBalanceItem,
  LeaveRequestItem,
  LeaveType,
} from "@/lib/leave-utils";

export const dynamic = "force-dynamic";

function requireSupabase() {
  if (!rawSupabase) {
    throw new Error("requireSupabase() ยังไม่ถูกตั้งค่า");
  }
  return rawSupabase;
}

function isMissingTableError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return (
    err.code === "42P01" ||
    err.code === "PGRST205" ||
    /relation .*leave_(requests|balances).* does not exist|Could not find the table/i.test(
      err.message || ""
    )
  );
}

function mapRowToLeaveRequest(row: Record<string, unknown>): LeaveRequestItem {
  return {
    id: String(row.id),
    requestNo: String(row.request_no || ""),
    leaveType: (row.leave_type as LeaveType) || "sick_leave",
    writtenAt: String(row.written_at || ""),
    writtenDate: String(row.written_date || ""),
    subject: String(row.subject || ""),
    toRecipient: String(row.to_recipient || ""),
    applicantUserId: String(row.applicant_user_id || ""),
    applicantName: String(row.applicant_name || ""),
    applicantPosition: String(row.applicant_position || ""),
    applicantDivision: String(row.applicant_division || ""),
    reason: String(row.reason || ""),
    startDate: String(row.start_date || ""),
    endDate: String(row.end_date || ""),
    totalWorkingDays: Number(row.total_working_days || 0),
    lastLeaveType: row.last_leave_type ? String(row.last_leave_type) : null,
    lastLeaveStartDate: row.last_leave_start_date
      ? String(row.last_leave_start_date)
      : null,
    lastLeaveEndDate: row.last_leave_end_date
      ? String(row.last_leave_end_date)
      : null,
    lastLeaveDays:
      row.last_leave_days !== null && row.last_leave_days !== undefined
        ? Number(row.last_leave_days)
        : null,
    contactInfo: String(row.contact_info || ""),
    contactPhone: String(row.contact_phone || ""),
    vacationAccumulatedDays: Number(row.vacation_accumulated_days || 0),
    vacationAnnualDays: Number(row.vacation_annual_days ?? 10),
    actingPersonUserId: row.acting_person_user_id
      ? String(row.acting_person_user_id)
      : null,
    actingPersonName: String(row.acting_person_name || ""),
    actingPersonPosition: String(row.acting_person_position || ""),
    fiscalYear: Number(row.fiscal_year || getFiscalYear()),
    prevSickDays: Number(row.prev_sick_days || 0),
    prevPersonalDays: Number(row.prev_personal_days || 0),
    prevMaternityDays: Number(row.prev_maternity_days || 0),
    prevVacationDays: Number(row.prev_vacation_days || 0),
    status: (row.status as LeaveRequestItem["status"]) || "pending_verifier",
    verifierUserId: row.verifier_user_id ? String(row.verifier_user_id) : null,
    verifierName: row.verifier_name ? String(row.verifier_name) : null,
    verifierPosition: row.verifier_position ? String(row.verifier_position) : null,
    verifierNote: row.verifier_note ? String(row.verifier_note) : null,
    verifiedAt: row.verified_at ? String(row.verified_at) : null,
    supervisorUserId: row.supervisor_user_id
      ? String(row.supervisor_user_id)
      : null,
    supervisorName: row.supervisor_name ? String(row.supervisor_name) : null,
    supervisorPosition: row.supervisor_position
      ? String(row.supervisor_position)
      : null,
    supervisorComment: row.supervisor_comment
      ? String(row.supervisor_comment)
      : null,
    supervisorReviewedAt: row.supervisor_reviewed_at
      ? String(row.supervisor_reviewed_at)
      : null,
    approverUserId: row.approver_user_id ? String(row.approver_user_id) : null,
    approverName: row.approver_name ? String(row.approver_name) : null,
    approverPosition: row.approver_position ? String(row.approver_position) : null,
    orderDecision:
      row.order_decision === "approved" || row.order_decision === "rejected"
        ? row.order_decision
        : null,
    orderComment: row.order_comment ? String(row.order_comment) : null,
    orderedAt: row.ordered_at ? String(row.ordered_at) : null,
    attachmentUrl: row.attachment_url ? String(row.attachment_url) : null,
    attachmentName: row.attachment_name ? String(row.attachment_name) : null,
    syncedToAttendance: Boolean(row.synced_to_attendance),
    syncedAt: row.synced_at ? String(row.synced_at) : null,
    syncNote: row.sync_note ? String(row.sync_note) : null,
    createdAt: String(row.created_at || ""),
    updatedAt: String(row.updated_at || ""),
  };
}

function mapRowToBalance(row: Record<string, unknown>): LeaveBalanceItem {
  return {
    id: row.id ? String(row.id) : undefined,
    userId: String(row.user_id),
    fiscalYear: Number(row.fiscal_year),
    sickDaysCarried: Number(row.sick_days_carried || 0),
    personalDaysCarried: Number(row.personal_days_carried || 0),
    maternityDaysCarried: Number(row.maternity_days_carried || 0),
    vacationAccumulatedDays: Number(row.vacation_accumulated_days || 0),
    vacationAnnualDays: Number(row.vacation_annual_days ?? 10),
    vacationDaysCarried: Number(row.vacation_days_carried || 0),
    updatedBy: row.updated_by ? String(row.updated_by) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

async function isAttendanceEditor(userId?: string, userName?: string): Promise<boolean> {
  if (!userId && !userName) return false;
  const { data } = await requireSupabase()
    .from("attendance_authorized_editors")
    .select("member_id, member_name");
  if (!data) return false;
  return data.some(
    (row) =>
      (userId && row.member_id === userId) ||
      (userName && row.member_name?.trim() === userName.trim())
  );
}

async function getUserLeaveAuthorizedRole(userId?: string): Promise<{
  canVerify: boolean;
  canSupervisor: boolean;
  canApprove: boolean;
}> {
  if (!userId) {
    return { canVerify: false, canSupervisor: false, canApprove: false };
  }
  const { data, error } = await requireSupabase()
    .from("leave_authorized_roles")
    .select("can_verify, can_supervisor, can_approve")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) {
    return { canVerify: false, canSupervisor: false, canApprove: false };
  }
  return {
    canVerify: Boolean(data.can_verify),
    canSupervisor: Boolean(data.can_supervisor),
    canApprove: Boolean(data.can_approve),
  };
}

async function syncApprovedLeaveToAttendance(
  leave: LeaveRequestItem,
  actorId?: string,
  actorName?: string
): Promise<{ synced: boolean; note: string }> {
  const { data: mappings, error: mapErr } = await requireSupabase()
    .from("attendance_user_mappings")
    .select("scanner_user_id, user_id, member_id")
    .or(`user_id.eq.${leave.applicantUserId},member_id.eq.${leave.applicantUserId}`)
    .limit(1);

  if (mapErr) {
    return {
      synced: false,
      note: `ไม่สามารถอ่านข้อมูลจับคู่เครื่องสแกนได้: ${mapErr.message}`,
    };
  }

  const mapping = mappings?.[0];
  if (!mapping || !mapping.scanner_user_id) {
    return {
      synced: false,
      note: "ยังไม่พบการจับคู่รหัสเครื่องสแกน (attendance_user_mappings) ของผู้ลา กรุณาจับคู่ในหน้าลงเวลาราชการแล้วกดซิงก์ซ้ำ",
    };
  }

  const workingDates = getWorkingDatesBetween(leave.startDate, leave.endDate);
  if (workingDates.length === 0) {
    return {
      synced: false,
      note: "ไม่พบวันทำการในช่วงวันที่ลาที่ระบุ",
    };
  }

  const meta = LEAVE_TYPE_META[leave.leaveType];
  const noteText = `${meta.label} (อนุญาตแล้ว)${leave.reason ? ` — ${leave.reason}` : ""}`;
  const nowIso = new Date().toISOString();

  const rows = workingDates.map((workDate) => ({
    work_date: workDate,
    scanner_user_id: Number(mapping.scanner_user_id),
    user_id: leave.applicantUserId,
    note_type: meta.dailyNoteType,
    note_text: noteText,
    ref_type: "leave_request",
    ref_id: leave.id,
    updated_by: actorId || null,
    updated_by_name: actorName || "ระบบใบลา",
    updated_at: nowIso,
  }));

  const { error: upsertErr } = await requireSupabase()
    .from("attendance_daily_notes")
    .upsert(rows, { onConflict: "work_date,scanner_user_id" });

  if (upsertErr) {
    return {
      synced: false,
      note: `ซิงก์ลง attendance_daily_notes ไม่สำเร็จ: ${upsertErr.message}`,
    };
  }

  return {
    synced: true,
    note: `ซิงก์ลงรายงานลงเวลาแล้ว ${workingDates.length} วันทำการ (รหัสเครื่องสแกน #${mapping.scanner_user_id})`,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fiscalYear = Number(searchParams.get("fiscalYear") || getFiscalYear());
    const userId = searchParams.get("userId") || "";

    let reqQuery = requireSupabase()
      .from("leave_requests")
      .select("*")
      .eq("fiscal_year", fiscalYear)
      .order("created_at", { ascending: false });

    if (userId) {
      reqQuery = reqQuery.eq("applicant_user_id", userId);
    }

    const [
      { data: reqRows, error: reqErr },
      { data: balRows, error: balErr },
      { data: mappingRows },
      { data: editorRows },
      { data: leaveRoleRows, error: leaveRoleErr },
    ] = await Promise.all([
      reqQuery,
      requireSupabase()
        .from("leave_balances")
        .select("*")
        .eq("fiscal_year", fiscalYear),
      requireSupabase()
        .from("attendance_user_mappings")
        .select("scanner_user_id, user_id, member_id"),
      requireSupabase()
        .from("attendance_authorized_editors")
        .select("member_id, member_name"),
      requireSupabase()
        .from("leave_authorized_roles")
        .select("*")
        .order("user_name", { ascending: true }),
    ]);

    if (reqErr) {
      if (isMissingTableError(reqErr)) {
        return NextResponse.json({
          success: true,
          needsMigration: true,
          fiscalYear,
          requests: [],
          balances: [],
          mappedUserIds: [],
          authorizedEditorIds: [],
        });
      }
      throw reqErr;
    }

    if (balErr && !isMissingTableError(balErr)) {
      throw balErr;
    }

    const mappedUserIds = Array.from(
      new Set(
        (mappingRows || [])
          .flatMap((m) => [m.user_id, m.member_id])
          .filter((v): v is string => Boolean(v))
      )
    );

    const authorizedEditorIds = Array.from(
      new Set(
        (editorRows || [])
          .map((e) => e.member_id)
          .filter((v): v is string => Boolean(v))
      )
    );

    return NextResponse.json({
      success: true,
      needsMigration: false,
      needsRoleMigration: Boolean(leaveRoleErr && isMissingTableError(leaveRoleErr)),
      fiscalYear,
      requests: (reqRows || []).map(mapRowToLeaveRequest),
      balances: (balRows || []).map(mapRowToBalance),
      mappedUserIds,
      authorizedEditorIds,
      leaveRoles: (leaveRoleRows || []).map((r) => ({
        id: String(r.id),
        userId: String(r.user_id),
        userName: String(r.user_name || ""),
        division: String(r.division || ""),
        canVerify: Boolean(r.can_verify),
        canSupervisor: Boolean(r.can_supervisor),
        canApprove: Boolean(r.can_approve),
        grantedBy: r.granted_by ? String(r.granted_by) : null,
        updatedAt: String(r.updated_at || ""),
      })),
    });
  } catch (err) {
    console.error("GET /api/leave error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "ไม่สามารถโหลดข้อมูลใบลาได้",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      leaveType,
      writtenAt,
      writtenDate,
      subject,
      toRecipient,
      applicantUserId,
      applicantName,
      applicantPosition,
      applicantDivision,
      reason,
      startDate,
      endDate,
      totalWorkingDays,
      lastLeaveType,
      lastLeaveStartDate,
      lastLeaveEndDate,
      lastLeaveDays,
      contactInfo,
      contactPhone,
      vacationAccumulatedDays,
      vacationAnnualDays,
      actingPersonUserId,
      actingPersonName,
      actingPersonPosition,
      supervisorUserId,
      supervisorName,
      supervisorPosition,
      approverUserId,
      approverName,
      approverPosition,
      attachmentUrl,
      attachmentName,
    } = body || {};

    if (!applicantUserId || !applicantName || !leaveType || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "ข้อมูลสำคัญไม่ครบถ้วน (ผู้ขอลา, ประเภทการลา, วันที่ลา)" },
        { status: 400 }
      );
    }

    const fiscalYear = getFiscalYear(startDate);
    const meta = LEAVE_TYPE_META[leaveType as LeaveType];
    if (!meta) {
      return NextResponse.json(
        { success: false, error: "ประเภทการลาไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    // คำนวณยอดลามาแล้วในปีงบประมาณนี้ (จาก leave_balances + leave_requests ที่ approved)
    const [{ data: balRow }, { data: approvedRows }] = await Promise.all([
      requireSupabase()
        .from("leave_balances")
        .select("*")
        .eq("user_id", applicantUserId)
        .eq("fiscal_year", fiscalYear)
        .maybeSingle(),
      requireSupabase()
        .from("leave_requests")
        .select("leave_type, total_working_days, start_date, end_date")
        .eq("applicant_user_id", applicantUserId)
        .eq("fiscal_year", fiscalYear)
        .eq("status", "approved")
        .order("end_date", { ascending: false }),
    ]);

    let prevSickDays = Number(balRow?.sick_days_carried || 0);
    let prevPersonalDays = Number(balRow?.personal_days_carried || 0);
    let prevMaternityDays = Number(balRow?.maternity_days_carried || 0);
    let prevVacationDays = Number(balRow?.vacation_days_carried || 0);

    for (const r of approvedRows || []) {
      const days = Number(r.total_working_days || 0);
      if (r.leave_type === "sick_leave") prevSickDays += days;
      else if (r.leave_type === "personal_leave") prevPersonalDays += days;
      else if (r.leave_type === "maternity_leave") prevMaternityDays += days;
      else if (r.leave_type === "vacation_leave") prevVacationDays += days;
    }

    const { count } = await requireSupabase()
      .from("leave_requests")
      .select("id", { count: "exact", head: true })
      .eq("fiscal_year", fiscalYear);

    const seq = String((count || 0) + 1).padStart(4, "0");
    const requestNo = `LV-${fiscalYear}-${seq}`;

    const computedDays =
      typeof totalWorkingDays === "number" && totalWorkingDays > 0
        ? totalWorkingDays
        : Math.max(1, getWorkingDatesBetween(startDate, endDate).length);

    // หากไม่ระบุผู้มีอำนาจอนุญาต ให้ใช้ syno_มะลิวัน เป็นค่าเริ่มต้น
    let resolvedApproverId = approverUserId || "syno_มะลิวัน";
    let resolvedApproverName = approverName || "";
    let resolvedApproverPosition = approverPosition || "";

    if (!resolvedApproverName || !resolvedApproverPosition) {
      const { data: defApprover } = await requireSupabase()
        .from("users")
        .select("id, name, position")
        .eq("id", resolvedApproverId)
        .maybeSingle();
      if (defApprover) {
        resolvedApproverId = defApprover.id;
        resolvedApproverName = resolvedApproverName || defApprover.name || "";
        resolvedApproverPosition =
          resolvedApproverPosition || defApprover.position || "";
      } else {
        resolvedApproverName = resolvedApproverName || "นางสาวมะลิวัน สิทธิโยธี";
        resolvedApproverPosition =
          resolvedApproverPosition ||
          "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร";
      }
    }

    const payload = {
      request_no: requestNo,
      leave_type: leaveType,
      written_at:
        writtenAt?.trim() ||
        "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
      written_date: writtenDate || new Date().toISOString().slice(0, 10),
      subject: subject?.trim() || meta.defaultSubject,
      to_recipient:
        toRecipient?.trim() || "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
      applicant_user_id: applicantUserId,
      applicant_name: applicantName,
      applicant_position: applicantPosition || "",
      applicant_division: applicantDivision || "",
      reason: reason || "",
      start_date: startDate,
      end_date: endDate,
      total_working_days: computedDays,
      last_leave_type: lastLeaveType || null,
      last_leave_start_date: lastLeaveStartDate || null,
      last_leave_end_date: lastLeaveEndDate || null,
      last_leave_days:
        lastLeaveDays !== undefined && lastLeaveDays !== null && lastLeaveDays !== ""
          ? Number(lastLeaveDays)
          : null,
      contact_info: contactInfo || "",
      contact_phone: contactPhone || "",
      vacation_accumulated_days: Number(
        vacationAccumulatedDays ?? balRow?.vacation_accumulated_days ?? 0
      ),
      vacation_annual_days: Number(
        vacationAnnualDays ?? balRow?.vacation_annual_days ?? 10
      ),
      acting_person_user_id: actingPersonUserId || null,
      acting_person_name: actingPersonName || "",
      acting_person_position: actingPersonPosition || "",
      fiscal_year: fiscalYear,
      prev_sick_days: prevSickDays,
      prev_personal_days: prevPersonalDays,
      prev_maternity_days: prevMaternityDays,
      prev_vacation_days: prevVacationDays,
      supervisor_user_id: supervisorUserId || null,
      supervisor_name: supervisorName || null,
      supervisor_position: supervisorPosition || null,
      approver_user_id: resolvedApproverId || null,
      approver_name: resolvedApproverName || null,
      approver_position: resolvedApproverPosition || null,
      status: "pending_verifier",
      attachment_url: attachmentUrl || null,
      attachment_name: attachmentName || null,
    };

    const { data: inserted, error } = await requireSupabase()
      .from("leave_requests")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            success: false,
            needsMigration: true,
            error: "ยังไม่ได้สร้างตาราง leave_requests ใน requireSupabase()",
          },
          { status: 400 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      request: mapRowToLeaveRequest(inserted),
    });
  } catch (err) {
    console.error("POST /api/leave error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "ไม่สามารถยื่นใบลาได้",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      action,
      actorId,
      actorName,
      actorPosition,
      actorRole,
      comment,
      decision,
    } = body || {};

    if (!id || !action || !actorId) {
      return NextResponse.json(
        { success: false, error: "ข้อมูลไม่ครบถ้วน" },
        { status: 400 }
      );
    }

    const { data: existingRow, error: fetchErr } = await requireSupabase()
      .from("leave_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !existingRow) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลใบลา" },
        { status: 404 }
      );
    }

    const existing = mapRowToLeaveRequest(existingRow);
    const nowIso = new Date().toISOString();
    const isAdmin = actorRole === "admin";
    const isManager = actorRole === "manager";
    const [isEditor, customLeaveRole] = await Promise.all([
      isAttendanceEditor(actorId, actorName),
      getUserLeaveAuthorizedRole(actorId),
    ]);
    const canVerify = isAdmin || isEditor || customLeaveRole.canVerify;
    const canSupervisor = isAdmin || isManager || customLeaveRole.canSupervisor;
    const canApprove =
      isAdmin ||
      actorId === "syno_มะลิวัน" ||
      customLeaveRole.canApprove ||
      (Boolean(existing.approverUserId) && existing.approverUserId === actorId);

    if (action === "verify") {
      if (!canVerify) {
        return NextResponse.json(
          { success: false, error: "เฉพาะผู้ตรวจสอบ (HR / ผู้ได้รับมอบสิทธิ์) หรือ Admin เท่านั้น" },
          { status: 403 }
        );
      }
      if (existing.status !== "pending_verifier") {
        return NextResponse.json(
          { success: false, error: "ใบลานี้ไม่อยู่ในขั้นตอนรอผู้ตรวจสอบ" },
          { status: 400 }
        );
      }

      const { data: updated, error } = await requireSupabase()
        .from("leave_requests")
        .update({
          status: "pending_supervisor",
          verifier_user_id: actorId,
          verifier_name: actorName || "",
          verifier_position: actorPosition || "",
          verifier_note: comment || "ตรวจสอบสถิติการลาถูกต้อง",
          verified_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, request: mapRowToLeaveRequest(updated) });
    }

    if (action === "supervisor_review") {
      if (!canSupervisor) {
        return NextResponse.json(
          { success: false, error: "เฉพาะผู้บังคับบัญชา (Manager / ผู้ได้รับมอบสิทธิ์) หรือ Admin เท่านั้น" },
          { status: 403 }
        );
      }
      if (existing.status !== "pending_supervisor") {
        return NextResponse.json(
          { success: false, error: "ใบลานี้ไม่อยู่ในขั้นตอนรอความเห็นผู้บังคับบัญชา" },
          { status: 400 }
        );
      }

      const { data: updated, error } = await requireSupabase()
        .from("leave_requests")
        .update({
          status: "pending_approver",
          supervisor_user_id: actorId,
          supervisor_name: actorName || "",
          supervisor_position: actorPosition || "",
          supervisor_comment: comment || "เห็นควรอนุญาต",
          supervisor_reviewed_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, request: mapRowToLeaveRequest(updated) });
    }

    if (action === "order") {
      if (!canApprove) {
        return NextResponse.json(
          { success: false, error: "เฉพาะผู้มีอำนาจสั่งอนุญาต (Admin / ผู้ได้รับมอบสิทธิ์) เท่านั้น" },
          { status: 403 }
        );
      }
      const orderDecision = decision === "rejected" ? "rejected" : "approved";
      const nextStatus = orderDecision === "approved" ? "approved" : "rejected";

      let syncedToAttendance = false;
      let syncedAt: string | null = null;
      let syncNote: string | null = null;

      if (orderDecision === "approved") {
        const syncResult = await syncApprovedLeaveToAttendance(
          existing,
          actorId,
          actorName
        );
        syncedToAttendance = syncResult.synced;
        syncedAt = syncResult.synced ? nowIso : null;
        syncNote = syncResult.note;
      }

      const { data: updated, error } = await requireSupabase()
        .from("leave_requests")
        .update({
          status: nextStatus,
          approver_user_id: actorId,
          approver_name: actorName || "",
          approver_position: actorPosition || "",
          order_decision: orderDecision,
          order_comment: comment || "",
          ordered_at: nowIso,
          synced_to_attendance: syncedToAttendance,
          synced_at: syncedAt,
          sync_note: syncNote,
          updated_at: nowIso,
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, request: mapRowToLeaveRequest(updated) });
    }

    if (action === "sync_attendance") {
      if (!canVerify && !canApprove) {
        return NextResponse.json(
          { success: false, error: "ไม่มีสิทธิ์ซิงก์ข้อมูลลงเวลา" },
          { status: 403 }
        );
      }
      if (existing.status !== "approved") {
        return NextResponse.json(
          { success: false, error: "ซิงก์ได้เฉพาะใบลาที่ได้รับคำสั่งอนุญาตแล้วเท่านั้น" },
          { status: 400 }
        );
      }

      const syncResult = await syncApprovedLeaveToAttendance(
        existing,
        actorId,
        actorName
      );
      const { data: updated, error } = await requireSupabase()
        .from("leave_requests")
        .update({
          synced_to_attendance: syncResult.synced,
          synced_at: syncResult.synced ? nowIso : existing.syncedAt,
          sync_note: syncResult.note,
          updated_at: nowIso,
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, request: mapRowToLeaveRequest(updated) });
    }

    if (action === "cancel") {
      const isOwner = existing.applicantUserId === actorId;
      if (!isAdmin && (!isOwner || existing.status === "approved")) {
        return NextResponse.json(
          {
            success: false,
            error: "ไม่สามารถยกเลิกใบลาที่อนุมัติแล้วได้ (ติดต่อ Admin หากต้องการยกเลิก)",
          },
          { status: 403 }
        );
      }

      // ลบหมายเหตุใน attendance_daily_notes ที่ซิงก์จากใบลานี้ออกด้วย
      if (existing.syncedToAttendance || existing.status === "approved") {
        await requireSupabase()
          .from("attendance_daily_notes")
          .delete()
          .eq("ref_type", "leave_request")
          .eq("ref_id", id);
      }

      const { data: updated, error } = await requireSupabase()
        .from("leave_requests")
        .update({
          status: "cancelled",
          synced_to_attendance: false,
          sync_note: existing.status === "approved" ? "ยกเลิกใบลาและลบออกจากรายงานลงเวลาแล้ว" : null,
          updated_at: nowIso,
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, request: mapRowToLeaveRequest(updated) });
    }

    return NextResponse.json(
      { success: false, error: `ไม่รู้จัก action: ${action}` },
      { status: 400 }
    );
  } catch (err) {
    console.error("PATCH /api/leave error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "ไม่สามารถอัปเดตใบลาได้",
      },
      { status: 500 }
    );
  }
}
