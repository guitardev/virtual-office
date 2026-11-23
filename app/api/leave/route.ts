import { NextRequest, NextResponse } from "next/server";
import { supabase as rawSupabase } from "@/lib/supabase";
import {
  calculateLeavePeriodDetails,
  detectLeaveOverlap,
  formatThaiDateShort,
  getEffectiveLeaveDays,
  getFiscalYear,
  getWorkingDatesBetween,
  LEAVE_DAY_PERIOD_SHORT,
  LEAVE_TYPE_META,
  LeaveBalanceItem,
  LeaveDayPeriod,
  LeaveRequestItem,
  LeaveType,
} from "@/lib/leave-utils";
import {
  buildHolidayMap,
  DEFAULT_THAI_HOLIDAYS,
  ThaiHolidayItem,
} from "@/lib/thai-holidays";

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
    /relation .*(leave_requests|leave_balances|leave_authorized_roles|thai_public_holidays).* does not exist|Could not find the table/i.test(
      err.message || ""
    )
  );
}

function isMissingV2SchemaError(
  err: { code?: string; message?: string } | null
): boolean {
  if (!err) return false;
  return (
    err.code === "42703" ||
    err.code === "PGRST204" ||
    err.code === "23514" ||
    /column .*(leave_day_period|cancelled_days|cancel_target_leave_id|applicant_signature|returned_note).* does not exist|Could not find the '?(leave_day_period|cancelled_days|applicant_signature)'? column|violates check constraint/i.test(
      err.message || ""
    )
  );
}

function mapRowToLeaveRequest(row: Record<string, unknown>): LeaveRequestItem {
  return {
    id: String(row.id),
    requestNo: String(row.request_no || ""),
    leaveType: (row.leave_type as LeaveType) || "sick_leave",
    leaveDayPeriod: (row.leave_day_period as LeaveDayPeriod) || "full",
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
    cancelledDays: Number(row.cancelled_days || 0),
    cancelTargetLeaveId: row.cancel_target_leave_id
      ? String(row.cancel_target_leave_id)
      : null,
    cancelTargetRequestNo: row.cancel_target_request_no
      ? String(row.cancel_target_request_no)
      : null,
    cancelTargetLeaveType: row.cancel_target_leave_type
      ? String(row.cancel_target_leave_type)
      : null,
    cancelTargetStartDate: row.cancel_target_start_date
      ? String(row.cancel_target_start_date)
      : null,
    cancelTargetEndDate: row.cancel_target_end_date
      ? String(row.cancel_target_end_date)
      : null,
    cancelTargetDays:
      row.cancel_target_days !== null && row.cancel_target_days !== undefined
        ? Number(row.cancel_target_days)
        : null,
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
    applicantSignature: row.applicant_signature
      ? String(row.applicant_signature)
      : null,
    actingPersonSignature: row.acting_person_signature
      ? String(row.acting_person_signature)
      : null,
    verifierSignature: row.verifier_signature
      ? String(row.verifier_signature)
      : null,
    supervisorSignature: row.supervisor_signature
      ? String(row.supervisor_signature)
      : null,
    approverSignature: row.approver_signature
      ? String(row.approver_signature)
      : null,
    attachmentUrl: row.attachment_url ? String(row.attachment_url) : null,
    attachmentName: row.attachment_name ? String(row.attachment_name) : null,
    attachmentStorage: row.attachment_storage
      ? String(row.attachment_storage)
      : null,
    excludedHolidays: Array.isArray(row.excluded_holidays)
      ? (row.excluded_holidays as LeaveRequestItem["excludedHolidays"])
      : [],
    returnedByName: row.returned_by_name ? String(row.returned_by_name) : null,
    returnedNote: row.returned_note ? String(row.returned_note) : null,
    returnedAt: row.returned_at ? String(row.returned_at) : null,
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

async function loadHolidayData(): Promise<{
  holidayMap: Record<string, string>;
  rawHolidays: ThaiHolidayItem[];
  needsHolidayMigration: boolean;
}> {
  const { data, error } = await requireSupabase()
    .from("thai_public_holidays")
    .select("*")
    .order("holiday_date", { ascending: true });

  if (error || !data) {
    return {
      holidayMap: { ...DEFAULT_THAI_HOLIDAYS },
      rawHolidays: [],
      needsHolidayMigration: Boolean(error && isMissingTableError(error)),
    };
  }

  const rawHolidays: ThaiHolidayItem[] = data.map((row) => ({
    holidayDate: String(row.holiday_date).slice(0, 10),
    name: String(row.name || ""),
    fiscalYear: Number(row.fiscal_year),
    isActive: Boolean(row.is_active ?? true),
    createdBy: row.created_by ? String(row.created_by) : null,
  }));

  return {
    holidayMap: buildHolidayMap(rawHolidays),
    rawHolidays,
    needsHolidayMigration: false,
  };
}

async function computeLivePreviousStats(
  applicantUserId: string,
  fiscalYear: number,
  excludeLeaveId?: string
) {
  const [{ data: balRow }, { data: approvedRows }] = await Promise.all([
    requireSupabase()
      .from("leave_balances")
      .select("*")
      .eq("user_id", applicantUserId)
      .eq("fiscal_year", fiscalYear)
      .maybeSingle(),
    requireSupabase()
      .from("leave_requests")
      .select("*")
      .eq("applicant_user_id", applicantUserId)
      .eq("fiscal_year", fiscalYear)
      .eq("status", "approved")
      .neq("leave_type", "cancel_leave")
      .order("end_date", { ascending: false }),
  ]);

  let prevSickDays = Number(balRow?.sick_days_carried || 0);
  let prevPersonalDays = Number(balRow?.personal_days_carried || 0);
  let prevMaternityDays = Number(balRow?.maternity_days_carried || 0);
  let prevVacationDays = Number(balRow?.vacation_days_carried || 0);

  for (const r of approvedRows || []) {
    if (excludeLeaveId && r.id === excludeLeaveId) continue;
    const days = getEffectiveLeaveDays({
      leaveType: r.leave_type as LeaveType,
      totalWorkingDays: Number(r.total_working_days || 0),
      cancelledDays: Number(r.cancelled_days || 0),
    });
    if (days <= 0) continue;
    if (r.leave_type === "sick_leave") prevSickDays += days;
    else if (r.leave_type === "personal_leave") prevPersonalDays += days;
    else if (r.leave_type === "maternity_leave") prevMaternityDays += days;
    else if (r.leave_type === "vacation_leave") prevVacationDays += days;
  }

  return {
    balRow,
    prevSickDays: Math.round(prevSickDays * 10) / 10,
    prevPersonalDays: Math.round(prevPersonalDays * 10) / 10,
    prevMaternityDays: Math.round(prevMaternityDays * 10) / 10,
    prevVacationDays: Math.round(prevVacationDays * 10) / 10,
  };
}

async function nextLeaveSequence(
  prefix: "LV" | "CLV",
  fiscalYear: number
): Promise<number> {
  const { data } = await requireSupabase()
    .from("leave_requests")
    .select("request_no")
    .like("request_no", `${prefix}-${fiscalYear}-%`);

  let maxNum = 0;
  for (const row of data || []) {
    const parts = String(row.request_no || "").split("-");
    const num = Number(parts[2] || 0);
    if (Number.isFinite(num) && num > maxNum) {
      maxNum = num;
    }
  }
  return maxNum + 1;
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
  actorName?: string,
  holidayMap?: Record<string, string>
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

  const workingDates = getWorkingDatesBetween(
    leave.startDate,
    leave.endDate,
    holidayMap
  );
  if (workingDates.length === 0) {
    return {
      synced: false,
      note: "ไม่พบวันทำการ (หลังหักวันหยุดราชการ/เสาร์-อาทิตย์) ในช่วงวันที่ลาที่ระบุ",
    };
  }

  const meta = LEAVE_TYPE_META[leave.leaveType];
  const periodLabel =
    leave.leaveDayPeriod && leave.leaveDayPeriod !== "full"
      ? ` ${LEAVE_DAY_PERIOD_SHORT[leave.leaveDayPeriod]}`
      : "";
  const noteText = `${meta.label}${periodLabel} (อนุญาตแล้ว)${
    leave.reason ? ` — ${leave.reason}` : ""
  }`;
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
      { rawHolidays, needsHolidayMigration },
      { error: v2ProbeErr },
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
      loadHolidayData(),
      requireSupabase()
        .from("leave_requests")
        .select("leave_day_period")
        .limit(1),
    ]);

    if (reqErr) {
      if (isMissingTableError(reqErr)) {
        return NextResponse.json({
          success: true,
          needsMigration: true,
          needsV2Migration: true,
          fiscalYear,
          requests: [],
          balances: [],
          mappedUserIds: [],
          authorizedEditorIds: [],
          holidays: [],
        });
      }
      throw reqErr;
    }

    if (balErr && !isMissingTableError(balErr)) {
      throw balErr;
    }

    const needsV2Migration =
      needsHolidayMigration || Boolean(v2ProbeErr && isMissingV2SchemaError(v2ProbeErr));

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
      needsV2Migration,
      needsRoleMigration: Boolean(leaveRoleErr && isMissingTableError(leaveRoleErr)),
      fiscalYear,
      requests: (reqRows || []).map(mapRowToLeaveRequest),
      balances: (balRows || []).map(mapRowToBalance),
      mappedUserIds,
      authorizedEditorIds,
      holidays: rawHolidays,
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
      leaveDayPeriod,
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
      verifierUserId,
      verifierName,
      verifierPosition,
      supervisorUserId,
      supervisorName,
      supervisorPosition,
      approverUserId,
      approverName,
      approverPosition,
      applicantSignature,
      actingPersonSignature,
      attachmentUrl,
      attachmentName,
      attachmentStorage,
      cancelTargetLeaveId,
    } = body || {};

    if (!applicantUserId || !applicantName || !leaveType || !startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          error: "ข้อมูลสำคัญไม่ครบถ้วน (ผู้ขอลา, ประเภทการลา, วันที่ลา)",
        },
        { status: 400 }
      );
    }

    if (String(endDate).slice(0, 10) < String(startDate).slice(0, 10)) {
      return NextResponse.json(
        { success: false, error: "วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น" },
        { status: 400 }
      );
    }

    const meta = LEAVE_TYPE_META[leaveType as LeaveType];
    if (!meta) {
      return NextResponse.json(
        { success: false, error: "ประเภทการลาไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    if (
      (leaveType === "sick_leave" ||
        leaveType === "personal_leave" ||
        leaveType === "cancel_leave") &&
      !String(reason || "").trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            leaveType === "sick_leave"
              ? "กรุณาระบุอาการป่วย / เหตุผลการลาป่วย"
              : leaveType === "cancel_leave"
              ? "กรุณาระบุเหตุผลการขอยกเลิกวันลา"
              : "กรุณาระบุเหตุผลการลากิจส่วนตัว",
        },
        { status: 400 }
      );
    }

    const fiscalYear = getFiscalYear(startDate);
    const { holidayMap } = await loadHolidayData();

    const cleanStart = String(startDate).slice(0, 10);
    const cleanEnd = String(endDate).slice(0, 10);
    const normalizedPeriod: LeaveDayPeriod =
      cleanStart === cleanEnd &&
      leaveType !== "maternity_leave" &&
      (leaveDayPeriod === "morning" || leaveDayPeriod === "afternoon")
        ? leaveDayPeriod
        : "full";

    // คำนวณวันลาจริง + ตรวจแบบฟอร์ม 3 (ขอยกเลิกวันลา) vs ฟอร์ม 1/2
    let computedDays = 0;
    let excludedHolidays: { date: string; name: string }[] = [];
    let cancelTarget: LeaveRequestItem | null = null;

    if (leaveType === "cancel_leave") {
      if (!cancelTargetLeaveId) {
        return NextResponse.json(
          { success: false, error: "กรุณาเลือกใบลาเดิมที่ต้องการขอยกเลิกวันลา" },
          { status: 400 }
        );
      }

      const { data: targetRow, error: targetErr } = await requireSupabase()
        .from("leave_requests")
        .select("*")
        .eq("id", cancelTargetLeaveId)
        .maybeSingle();

      if (targetErr || !targetRow) {
        return NextResponse.json(
          { success: false, error: "ไม่พบข้อมูลใบลาเดิมที่เลือก" },
          { status: 404 }
        );
      }

      cancelTarget = mapRowToLeaveRequest(targetRow);
      if (cancelTarget.applicantUserId !== applicantUserId) {
        return NextResponse.json(
          { success: false, error: "สามารถขอยกเลิกได้เฉพาะใบลาของตนเองเท่านั้น" },
          { status: 403 }
        );
      }
      if (cancelTarget.status !== "approved" || cancelTarget.leaveType === "cancel_leave") {
        return NextResponse.json(
          { success: false, error: "ขอยกเลิกวันลาได้เฉพาะใบลาที่ได้รับอนุญาตแล้วเท่านั้น" },
          { status: 400 }
        );
      }
      if (cleanStart < cancelTarget.startDate || cleanEnd > cancelTarget.endDate) {
        return NextResponse.json(
          {
            success: false,
            error: `ช่วงวันที่ขอยกเลิกต้องอยู่ภายในช่วงวันลาเดิม (${formatThaiDateShort(
              cancelTarget.startDate
            )} – ${formatThaiDateShort(cancelTarget.endDate)})`,
          },
          { status: 400 }
        );
      }

      const calc = calculateLeavePeriodDetails({
        startDate: cleanStart,
        endDate: cleanEnd,
        leaveType: cancelTarget.leaveType,
        leaveDayPeriod: normalizedPeriod,
        holidayMap,
      });
      computedDays = calc.totalWorkingDays;
      excludedHolidays = calc.skippedHolidays;

      const remainingCancelable = getEffectiveLeaveDays(cancelTarget);
      if (computedDays <= 0) {
        return NextResponse.json(
          { success: false, error: "ช่วงวันที่เลือกไม่มีวันทำการให้ยกเลิก" },
          { status: 400 }
        );
      }
      if (computedDays > remainingCancelable) {
        return NextResponse.json(
          {
            success: false,
            error: `จำนวนวันที่ขอยกเลิก (${computedDays} วัน) เกินวันลาคงเหลือของใบลาเดิม (${remainingCancelable} วัน)`,
          },
          { status: 400 }
        );
      }
    } else {
      // ฟอร์ม 1 และ 2: ตรวจวันลาซ้อนทับ (Overlap) ก่อนบันทึก
      const { data: userActiveRows } = await requireSupabase()
        .from("leave_requests")
        .select("*")
        .eq("applicant_user_id", applicantUserId)
        .in("status", [
          "pending_verifier",
          "pending_supervisor",
          "pending_approver",
          "returned",
          "approved",
        ]);

      const activeItems = (userActiveRows || []).map(mapRowToLeaveRequest);
      const overlap = detectLeaveOverlap({
        candidateStart: cleanStart,
        candidateEnd: cleanEnd,
        candidatePeriod: normalizedPeriod,
        existingRequests: activeItems,
      });

      if (overlap.hasOverlap) {
        const conflictNos = overlap.conflicts
          .map(
            (c) =>
              `${c.requestNo} (${formatThaiDateShort(c.startDate)}–${formatThaiDateShort(
                c.endDate
              )})`
          )
          .join(", ");
        return NextResponse.json(
          {
            success: false,
            error: `พบวันลาซ้อนทับกับคำขอที่มีอยู่แล้ว: ${conflictNos}`,
            conflicts: overlap.conflicts,
          },
          { status: 409 }
        );
      }

      const calc = calculateLeavePeriodDetails({
        startDate: cleanStart,
        endDate: cleanEnd,
        leaveType: leaveType as LeaveType,
        leaveDayPeriod: normalizedPeriod,
        holidayMap,
      });
      computedDays = calc.totalWorkingDays;
      excludedHolidays = calc.skippedHolidays;

      if (computedDays <= 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              "ช่วงวันที่เลือกตรงกับวันหยุดเสาร์-อาทิตย์หรือวันหยุดราชการทั้งหมด (0 วันทำการ)",
          },
          { status: 400 }
        );
      }
    }

    const {
      balRow,
      prevSickDays,
      prevPersonalDays,
      prevMaternityDays,
      prevVacationDays,
    } = await computeLivePreviousStats(applicantUserId, fiscalYear);

    const resolvedAcc = Number(
      balRow?.vacation_accumulated_days ?? vacationAccumulatedDays ?? 0
    );
    const resolvedAnnual = Number(
      balRow?.vacation_annual_days ?? vacationAnnualDays ?? 10
    );

    if (leaveType === "vacation_leave") {
      const entitled = resolvedAcc + resolvedAnnual;
      const remainingVac = Math.max(0, Math.round((entitled - prevVacationDays) * 10) / 10);
      if (computedDays > remainingVac) {
        return NextResponse.json(
          {
            success: false,
            error: `วันลาพักผ่อนคงเหลือไม่เพียงพอ (สิทธิ ${entitled} ใช้แล้ว ${prevVacationDays} เหลือ ${remainingVac} วันทำการ แต่ขอลา ${computedDays} วันทำการ)`,
          },
          { status: 400 }
        );
      }
    }

    // หากไม่ระบุผู้ตรวจสอบ ให้ใช้ syno_ยุทธนา เป็นค่าเริ่มต้น
    let resolvedVerifierId = verifierUserId || "syno_ยุทธนา";
    let resolvedVerifierName = verifierName || "";
    let resolvedVerifierPosition = verifierPosition || "";

    if (!resolvedVerifierName || !resolvedVerifierPosition) {
      const { data: defVerifier } = await requireSupabase()
        .from("users")
        .select("id, name, position")
        .eq("id", resolvedVerifierId)
        .maybeSingle();
      if (defVerifier) {
        resolvedVerifierId = defVerifier.id;
        resolvedVerifierName = resolvedVerifierName || defVerifier.name || "";
        resolvedVerifierPosition =
          resolvedVerifierPosition || defVerifier.position || "";
      } else {
        resolvedVerifierName = resolvedVerifierName || "นายยุทธนา เจนจบ";
        resolvedVerifierPosition =
          resolvedVerifierPosition || "เจ้าพนักงานธุรการปฏิบัติงาน";
      }
    }

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

    const prefix: "LV" | "CLV" = leaveType === "cancel_leave" ? "CLV" : "LV";
    let seqNum = await nextLeaveSequence(prefix, fiscalYear);
    let inserted: Record<string, unknown> | null = null;
    let lastInsertErr: { code?: string; message?: string } | null = null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const requestNo = `${prefix}-${fiscalYear}-${String(seqNum + attempt).padStart(
        4,
        "0"
      )}`;

      const payload = {
        request_no: requestNo,
        leave_type: leaveType,
        leave_day_period: normalizedPeriod,
        written_at: writtenAt?.trim() || "สนง.พมจ.กำแพงเพชร",
        written_date: writtenDate || new Date().toISOString().slice(0, 10),
        subject: subject?.trim() || meta.defaultSubject,
        to_recipient:
          toRecipient?.trim() || "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
        applicant_user_id: applicantUserId,
        applicant_name: applicantName,
        applicant_position: applicantPosition || "",
        applicant_division: applicantDivision || "",
        reason: reason || "",
        start_date: cleanStart,
        end_date: cleanEnd,
        total_working_days: computedDays,
        cancelled_days: 0,
        cancel_target_leave_id: cancelTarget ? cancelTarget.id : null,
        cancel_target_request_no: cancelTarget ? cancelTarget.requestNo : null,
        cancel_target_leave_type: cancelTarget ? cancelTarget.leaveType : null,
        cancel_target_start_date: cancelTarget ? cancelTarget.startDate : null,
        cancel_target_end_date: cancelTarget ? cancelTarget.endDate : null,
        cancel_target_days: cancelTarget ? cancelTarget.totalWorkingDays : null,
        last_leave_type: lastLeaveType || null,
        last_leave_start_date: lastLeaveStartDate || null,
        last_leave_end_date: lastLeaveEndDate || null,
        last_leave_days:
          lastLeaveDays !== undefined && lastLeaveDays !== null && lastLeaveDays !== ""
            ? Number(lastLeaveDays)
            : null,
        contact_info: contactInfo || "",
        contact_phone: contactPhone || "",
        vacation_accumulated_days: resolvedAcc,
        vacation_annual_days: resolvedAnnual,
        acting_person_user_id: actingPersonUserId || null,
        acting_person_name: actingPersonName || "",
        acting_person_position: actingPersonPosition || "",
        fiscal_year: fiscalYear,
        prev_sick_days: prevSickDays,
        prev_personal_days: prevPersonalDays,
        prev_maternity_days: prevMaternityDays,
        prev_vacation_days: prevVacationDays,
        verifier_user_id:
          leaveType === "cancel_leave" ? null : resolvedVerifierId || null,
        verifier_name:
          leaveType === "cancel_leave" ? null : resolvedVerifierName || null,
        verifier_position:
          leaveType === "cancel_leave" ? null : resolvedVerifierPosition || null,
        supervisor_user_id: supervisorUserId || null,
        supervisor_name: supervisorName || null,
        supervisor_position: supervisorPosition || null,
        approver_user_id: resolvedApproverId || null,
        approver_name: resolvedApproverName || null,
        approver_position: resolvedApproverPosition || null,
        status:
          leaveType === "cancel_leave" ? "pending_supervisor" : "pending_verifier",
        applicant_signature: applicantSignature || null,
        acting_person_signature: actingPersonSignature || null,
        attachment_url: attachmentUrl || null,
        attachment_name: attachmentName || null,
        attachment_storage: attachmentStorage || null,
        excluded_holidays: excludedHolidays,
      };

      const { data, error } = await requireSupabase()
        .from("leave_requests")
        .insert(payload)
        .select("*")
        .single();

      if (!error) {
        inserted = data;
        lastInsertErr = null;
        break;
      }

      lastInsertErr = error;
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            success: false,
            needsMigration: true,
            error: "ยังไม่ได้สร้างตาราง leave_requests ใน Supabase",
          },
          { status: 400 }
        );
      }
      if (isMissingV2SchemaError(error)) {
        return NextResponse.json(
          {
            success: false,
            needsV2Migration: true,
            error:
              "กรุณารัน SQL อัปเกรดระบบใบลา v2 ใน Supabase SQL Editor ก่อนใช้งานฟีเจอร์ใหม่ (ลายเซ็น/ครึ่งวัน/ตีกลับ/ขอยกเลิกวันลา)",
          },
          { status: 400 }
        );
      }
      if (error.code !== "23505") {
        throw error;
      }
    }

    if (!inserted) {
      throw lastInsertErr || new Error("ไม่สามารถสร้างเลขที่ใบลาได้");
    }

    return NextResponse.json({
      success: true,
      request: mapRowToLeaveRequest(inserted),
    });
  } catch (err: unknown) {
    console.error("POST /api/leave error:", err);
    const pgErr = err as { code?: string; message?: string };
    if (isMissingV2SchemaError(pgErr)) {
      return NextResponse.json(
        {
          success: false,
          needsV2Migration: true,
          error:
            "กรุณารัน SQL อัปเกรดระบบใบลา v2 ใน Supabase SQL Editor ก่อนใช้งานฟีเจอร์ใหม่ (ลายเซ็น/ครึ่งวัน/ตีกลับ/ขอยกเลิกวันลา)",
        },
        { status: 400 }
      );
    }
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
      signature,
      // สำหรับ action === "resubmit"
      startDate,
      endDate,
      leaveDayPeriod,
      reason,
      contactInfo,
      contactPhone,
      attachmentUrl,
      attachmentName,
      attachmentStorage,
      applicantSignature,
      actingPersonUserId,
      actingPersonName,
      actingPersonPosition,
      verifierUserId,
      verifierName,
      verifierPosition,
      supervisorUserId,
      supervisorName,
      supervisorPosition,
      approverUserId,
      approverName,
      approverPosition,
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
    const [isEditor, customLeaveRole, { holidayMap }] = await Promise.all([
      isAttendanceEditor(actorId, actorName),
      getUserLeaveAuthorizedRole(actorId),
      loadHolidayData(),
    ]);
    const canVerify =
      isAdmin ||
      isEditor ||
      actorId === "syno_ยุทธนา" ||
      customLeaveRole.canVerify ||
      (Boolean(existing.verifierUserId) && existing.verifierUserId === actorId);
    const canSupervisor = isAdmin || isManager || customLeaveRole.canSupervisor;
    const canApprove =
      isAdmin ||
      actorId === "syno_มะลิวัน" ||
      customLeaveRole.canApprove ||
      (Boolean(existing.approverUserId) && existing.approverUserId === actorId);

    if (action === "verify") {
      if (!canVerify) {
        return NextResponse.json(
          {
            success: false,
            error: "เฉพาะผู้ตรวจสอบ (HR / ผู้ได้รับมอบสิทธิ์) หรือ Admin เท่านั้น",
          },
          { status: 403 }
        );
      }
      if (existing.status !== "pending_verifier") {
        return NextResponse.json(
          { success: false, error: "ใบลานี้ไม่อยู่ในขั้นตอนรอผู้ตรวจสอบ" },
          { status: 400 }
        );
      }

      // คำนวณยอดลามาแล้วล่าสุด ณ เวลาที่ผู้ตรวจสอบลงนาม (ป้องกันตัวเลขค้างจากตอนยื่นหลายใบพร้อมกัน)
      const liveStats = await computeLivePreviousStats(
        existing.applicantUserId,
        existing.fiscalYear,
        existing.id
      );

      const { data: updated, error } = await requireSupabase()
        .from("leave_requests")
        .update({
          status: "pending_supervisor",
          prev_sick_days: liveStats.prevSickDays,
          prev_personal_days: liveStats.prevPersonalDays,
          prev_maternity_days: liveStats.prevMaternityDays,
          prev_vacation_days: liveStats.prevVacationDays,
          verifier_user_id: actorId,
          verifier_name: actorName || "",
          verifier_position: actorPosition || "",
          verifier_note: comment || "ตรวจสอบสถิติการลาถูกต้อง",
          verifier_signature: signature || existing.verifierSignature || null,
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
          {
            success: false,
            error: "เฉพาะผู้บังคับบัญชา (Manager / ผู้ได้รับมอบสิทธิ์) หรือ Admin เท่านั้น",
          },
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
          supervisor_signature: signature || existing.supervisorSignature || null,
          supervisor_reviewed_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, request: mapRowToLeaveRequest(updated) });
    }

    if (action === "return") {
      const canReturnStage =
        (existing.status === "pending_verifier" && canVerify) ||
        (existing.status === "pending_supervisor" && canSupervisor) ||
        (existing.status === "pending_approver" && canApprove);

      if (!canReturnStage) {
        return NextResponse.json(
          { success: false, error: "ไม่มีสิทธิ์ตีกลับใบลาในขั้นตอนนี้" },
          { status: 403 }
        );
      }

      const reasonNote = String(comment || "").trim();
      if (!reasonNote) {
        return NextResponse.json(
          { success: false, error: "กรุณาระบุเหตุผลหรือสิ่งที่ต้องการให้ผู้ขอลาแก้ไข" },
          { status: 400 }
        );
      }

      const { data: updated, error } = await requireSupabase()
        .from("leave_requests")
        .update({
          status: "returned",
          returned_by_name: actorName || "ผู้พิจารณา",
          returned_note: reasonNote,
          returned_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, request: mapRowToLeaveRequest(updated) });
    }

    if (action === "resubmit") {
      const isOwner = existing.applicantUserId === actorId;
      if (!isOwner && !isAdmin) {
        return NextResponse.json(
          { success: false, error: "เฉพาะผู้ขอลาหรือ Admin เท่านั้นที่ส่งแก้ไขใหม่ได้" },
          { status: 403 }
        );
      }
      if (existing.status !== "returned") {
        return NextResponse.json(
          { success: false, error: "ส่งใหม่ได้เฉพาะใบลาที่ถูกตีกลับให้แก้ไขเท่านั้น" },
          { status: 400 }
        );
      }

      const nextStart = String(startDate || existing.startDate).slice(0, 10);
      const nextEnd = String(endDate || existing.endDate).slice(0, 10);
      if (nextEnd < nextStart) {
        return NextResponse.json(
          { success: false, error: "วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น" },
          { status: 400 }
        );
      }

      const nextPeriod: LeaveDayPeriod =
        nextStart === nextEnd &&
        existing.leaveType !== "maternity_leave" &&
        (leaveDayPeriod === "morning" || leaveDayPeriod === "afternoon")
          ? leaveDayPeriod
          : "full";

      const nextReason = reason !== undefined ? String(reason) : existing.reason;
      if (
        (existing.leaveType === "sick_leave" ||
          existing.leaveType === "personal_leave" ||
          existing.leaveType === "cancel_leave") &&
        !nextReason.trim()
      ) {
        return NextResponse.json(
          { success: false, error: "กรุณาระบุเหตุผลการลา" },
          { status: 400 }
        );
      }

      if (existing.leaveType !== "cancel_leave") {
        const { data: userActiveRows } = await requireSupabase()
          .from("leave_requests")
          .select("*")
          .eq("applicant_user_id", existing.applicantUserId)
          .in("status", [
            "pending_verifier",
            "pending_supervisor",
            "pending_approver",
            "returned",
            "approved",
          ]);
        const overlap = detectLeaveOverlap({
          candidateStart: nextStart,
          candidateEnd: nextEnd,
          candidatePeriod: nextPeriod,
          existingRequests: (userActiveRows || []).map(mapRowToLeaveRequest),
          excludeLeaveId: existing.id,
        });
        if (overlap.hasOverlap) {
          return NextResponse.json(
            {
              success: false,
              error: `พบวันลาซ้อนทับกับคำขอ ${overlap.conflicts
                .map((c) => c.requestNo)
                .join(", ")}`,
            },
            { status: 409 }
          );
        }
      }

      const calc = calculateLeavePeriodDetails({
        startDate: nextStart,
        endDate: nextEnd,
        leaveType: existing.leaveType,
        leaveDayPeriod: nextPeriod,
        holidayMap,
      });

      if (calc.totalWorkingDays <= 0) {
        return NextResponse.json(
          { success: false, error: "ช่วงวันที่เลือกไม่มีวันทำการ" },
          { status: 400 }
        );
      }

      const nextFy = getFiscalYear(nextStart);
      const liveStats = await computeLivePreviousStats(
        existing.applicantUserId,
        nextFy,
        existing.id
      );

      if (existing.leaveType === "vacation_leave") {
        const acc = Number(
          liveStats.balRow?.vacation_accumulated_days ??
            existing.vacationAccumulatedDays
        );
        const ann = Number(
          liveStats.balRow?.vacation_annual_days ?? existing.vacationAnnualDays
        );
        const rem = Math.max(0, Math.round((acc + ann - liveStats.prevVacationDays) * 10) / 10);
        if (calc.totalWorkingDays > rem) {
          return NextResponse.json(
            {
              success: false,
              error: `วันลาพักผ่อนคงเหลือไม่เพียงพอ (คงเหลือ ${rem} วันทำการ)`,
            },
            { status: 400 }
          );
        }
      }

      const { data: updated, error } = await requireSupabase()
        .from("leave_requests")
        .update({
          start_date: nextStart,
          end_date: nextEnd,
          leave_day_period: nextPeriod,
          total_working_days: calc.totalWorkingDays,
          excluded_holidays: calc.skippedHolidays,
          fiscal_year: nextFy,
          reason: nextReason,
          contact_info: contactInfo !== undefined ? contactInfo : existing.contactInfo,
          contact_phone:
            contactPhone !== undefined ? contactPhone : existing.contactPhone,
          attachment_url:
            attachmentUrl !== undefined ? attachmentUrl : existing.attachmentUrl,
          attachment_name:
            attachmentName !== undefined ? attachmentName : existing.attachmentName,
          attachment_storage:
            attachmentStorage !== undefined
              ? attachmentStorage
              : existing.attachmentStorage,
          applicant_signature:
            applicantSignature !== undefined
              ? applicantSignature
              : existing.applicantSignature,
          acting_person_user_id:
            actingPersonUserId !== undefined
              ? actingPersonUserId || null
              : existing.actingPersonUserId,
          acting_person_name:
            actingPersonName !== undefined
              ? actingPersonName
              : existing.actingPersonName,
          acting_person_position:
            actingPersonPosition !== undefined
              ? actingPersonPosition
              : existing.actingPersonPosition,
          verifier_user_id:
            verifierUserId !== undefined ? verifierUserId : existing.verifierUserId,
          verifier_name:
            verifierName !== undefined ? verifierName : existing.verifierName,
          verifier_position:
            verifierPosition !== undefined
              ? verifierPosition
              : existing.verifierPosition,
          supervisor_user_id:
            supervisorUserId !== undefined
              ? supervisorUserId
              : existing.supervisorUserId,
          supervisor_name:
            supervisorName !== undefined ? supervisorName : existing.supervisorName,
          supervisor_position:
            supervisorPosition !== undefined
              ? supervisorPosition
              : existing.supervisorPosition,
          approver_user_id:
            approverUserId !== undefined ? approverUserId : existing.approverUserId,
          approver_name:
            approverName !== undefined ? approverName : existing.approverName,
          approver_position:
            approverPosition !== undefined
              ? approverPosition
              : existing.approverPosition,
          prev_sick_days: liveStats.prevSickDays,
          prev_personal_days: liveStats.prevPersonalDays,
          prev_maternity_days: liveStats.prevMaternityDays,
          prev_vacation_days: liveStats.prevVacationDays,
          status:
            existing.leaveType === "cancel_leave"
              ? "pending_supervisor"
              : "pending_verifier",
          verified_at: null,
          verifier_note: null,
          verifier_signature: null,
          supervisor_reviewed_at: null,
          supervisor_comment: null,
          supervisor_signature: null,
          returned_by_name: null,
          returned_note: null,
          returned_at: null,
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
          {
            success: false,
            error: "เฉพาะผู้มีอำนาจสั่งอนุญาต (Admin / ผู้ได้รับมอบสิทธิ์) เท่านั้น",
          },
          { status: 403 }
        );
      }
      if (existing.status !== "pending_approver" && !isAdmin) {
        return NextResponse.json(
          { success: false, error: "ใบลานี้ยังไม่อยู่ในขั้นตอนรอคำสั่งอนุญาต" },
          { status: 400 }
        );
      }

      const orderDecision = decision === "rejected" ? "rejected" : "approved";
      const nextStatus = orderDecision === "approved" ? "approved" : "rejected";

      let syncedToAttendance = false;
      let syncedAt: string | null = null;
      let syncNote: string | null = null;

      if (orderDecision === "approved") {
        if (existing.leaveType === "cancel_leave" && existing.cancelTargetLeaveId) {
          const { data: targetRow } = await requireSupabase()
            .from("leave_requests")
            .select("*")
            .eq("id", existing.cancelTargetLeaveId)
            .maybeSingle();

          const cancelWorkingDates = getWorkingDatesBetween(
            existing.startDate,
            existing.endDate,
            holidayMap
          );

          if (cancelWorkingDates.length > 0) {
            await requireSupabase()
              .from("attendance_daily_notes")
              .delete()
              .eq("ref_type", "leave_request")
              .eq("ref_id", existing.cancelTargetLeaveId)
              .in("work_date", cancelWorkingDates);
          }

          if (targetRow) {
            const targetItem = mapRowToLeaveRequest(targetRow);
            const newCancelled = Math.min(
              targetItem.totalWorkingDays,
              Math.round(
                (targetItem.cancelledDays + existing.totalWorkingDays) * 10
              ) / 10
            );
            const fullyCancelled = newCancelled >= targetItem.totalWorkingDays;

            await requireSupabase()
              .from("leave_requests")
              .update({
                cancelled_days: newCancelled,
                status: fullyCancelled ? "cancelled" : targetItem.status,
                synced_to_attendance: fullyCancelled
                  ? false
                  : targetItem.syncedToAttendance,
                sync_note: fullyCancelled
                  ? `ยกเลิกเต็มจำนวนตามใบขอยกเลิกวันลา ${existing.requestNo}`
                  : `ยกเลิกบางส่วน ${newCancelled} จาก ${targetItem.totalWorkingDays} วัน ตาม ${existing.requestNo}`,
                updated_at: nowIso,
              })
              .eq("id", targetItem.id);
          }

          syncedToAttendance = true;
          syncedAt = nowIso;
          syncNote = `ปรับลดวันลาเดิม ${existing.totalWorkingDays} วัน และลบหมายเหตุลงเวลา ${cancelWorkingDates.length} วันทำการแล้ว`;
        } else {
          const syncResult = await syncApprovedLeaveToAttendance(
            existing,
            actorId,
            actorName,
            holidayMap
          );
          syncedToAttendance = syncResult.synced;
          syncedAt = syncResult.synced ? nowIso : null;
          syncNote = syncResult.note;
        }
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
          approver_signature: signature || existing.approverSignature || null,
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
      if (existing.status !== "approved" || existing.leaveType === "cancel_leave") {
        return NextResponse.json(
          {
            success: false,
            error: "ซิงก์ได้เฉพาะใบลาปกติที่ได้รับคำสั่งอนุญาตแล้วเท่านั้น",
          },
          { status: 400 }
        );
      }

      const syncResult = await syncApprovedLeaveToAttendance(
        existing,
        actorId,
        actorName,
        holidayMap
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
            error:
              "ไม่สามารถยกเลิกใบลาที่อนุมัติแล้วได้ (กรุณาใช้แบบฟอร์ม 3 ขอยกเลิกวันลา หรือติดต่อ Admin)",
          },
          { status: 403 }
        );
      }

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
          sync_note:
            existing.status === "approved"
              ? "ยกเลิกใบลาและลบออกจากรายงานลงเวลาแล้ว"
              : null,
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
  } catch (err: unknown) {
    console.error("PATCH /api/leave error:", err);
    const pgErr = err as { code?: string; message?: string };
    if (isMissingV2SchemaError(pgErr)) {
      return NextResponse.json(
        {
          success: false,
          needsV2Migration: true,
          error:
            "กรุณารัน SQL อัปเกรดระบบใบลา v2 ใน Supabase SQL Editor ก่อนใช้งานฟีเจอร์ใหม่ (ลายเซ็น/ครึ่งวัน/ตีกลับ/ขอยกเลิกวันลา)",
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "ไม่สามารถอัปเดตใบลาได้",
      },
      { status: 500 }
    );
  }
}
