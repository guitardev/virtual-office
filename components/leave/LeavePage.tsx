"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { exportElementToA4Pdf } from "@/lib/a4-pdf-export";
import {
  formatThaiDateFull,
  formatThaiDateShort,
  getFiscalYear,
  getHalfYearRange,
  getTodayIsoDate,
  getWorkingDatesBetween,
  LEAVE_STATUS_META,
  LEAVE_TYPE_META,
  LeaveBalanceItem,
  LeaveFormKind,
  LeaveRequestItem,
  LeaveType,
} from "@/lib/leave-utils";
import LeaveFormPrintView from "./LeaveFormPrintView";
import PreloadSkeleton from "@/components/ui/PreloadSkeleton";

const LEAVE_MIGRATION_SQL = `-- รันคำสั่งนี้ใน Supabase SQL Editor เพื่อสร้างตารางระบบใบลา
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_no text NOT NULL,
  leave_type text NOT NULL CHECK (leave_type IN ('sick_leave', 'personal_leave', 'maternity_leave', 'vacation_leave')),
  written_at text NOT NULL DEFAULT 'สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร',
  written_date date NOT NULL DEFAULT CURRENT_DATE,
  subject text NOT NULL,
  to_recipient text NOT NULL DEFAULT 'พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร',
  applicant_user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  applicant_name text NOT NULL,
  applicant_position text NOT NULL DEFAULT '',
  applicant_division text NOT NULL DEFAULT '',
  reason text NOT NULL DEFAULT '',
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_working_days numeric(5,1) NOT NULL DEFAULT 1,
  last_leave_type text,
  last_leave_start_date date,
  last_leave_end_date date,
  last_leave_days numeric(5,1),
  contact_info text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  vacation_accumulated_days numeric(5,1) NOT NULL DEFAULT 0,
  vacation_annual_days numeric(5,1) NOT NULL DEFAULT 10,
  acting_person_user_id text REFERENCES public.users(id) ON DELETE SET NULL,
  acting_person_name text NOT NULL DEFAULT '',
  acting_person_position text NOT NULL DEFAULT '',
  fiscal_year integer NOT NULL,
  prev_sick_days numeric(5,1) NOT NULL DEFAULT 0,
  prev_personal_days numeric(5,1) NOT NULL DEFAULT 0,
  prev_maternity_days numeric(5,1) NOT NULL DEFAULT 0,
  prev_vacation_days numeric(5,1) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending_verifier' CHECK (status IN ('pending_verifier', 'pending_supervisor', 'pending_approver', 'approved', 'rejected', 'cancelled')),
  verifier_user_id text REFERENCES public.users(id) ON DELETE SET NULL,
  verifier_name text,
  verifier_position text,
  verifier_note text,
  verified_at timestamptz,
  supervisor_user_id text REFERENCES public.users(id) ON DELETE SET NULL,
  supervisor_name text,
  supervisor_position text,
  supervisor_comment text,
  supervisor_reviewed_at timestamptz,
  approver_user_id text REFERENCES public.users(id) ON DELETE SET NULL,
  approver_name text,
  approver_position text,
  order_decision text CHECK (order_decision IN ('approved', 'rejected')),
  order_comment text,
  ordered_at timestamptz,
  attachment_url text,
  attachment_name text,
  synced_to_attendance boolean NOT NULL DEFAULT false,
  synced_at timestamptz,
  sync_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  fiscal_year integer NOT NULL,
  sick_days_carried numeric(5,1) NOT NULL DEFAULT 0,
  personal_days_carried numeric(5,1) NOT NULL DEFAULT 0,
  maternity_days_carried numeric(5,1) NOT NULL DEFAULT 0,
  vacation_accumulated_days numeric(5,1) NOT NULL DEFAULT 0,
  vacation_annual_days numeric(5,1) NOT NULL DEFAULT 10,
  vacation_days_carried numeric(5,1) NOT NULL DEFAULT 0,
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, fiscal_year)
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on leave_requests" ON public.leave_requests;
CREATE POLICY "Allow all on leave_requests" ON public.leave_requests FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all on leave_balances" ON public.leave_balances;
CREATE POLICY "Allow all on leave_balances" ON public.leave_balances FOR ALL USING (true) WITH CHECK (true);`;

const LEAVE_ROLE_MIGRATION_SQL = `-- รันคำสั่งนี้ใน Supabase SQL Editor เพื่อสร้างตารางกำหนดสิทธิ์ระบบใบลา
CREATE TABLE IF NOT EXISTS public.leave_authorized_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  division text NOT NULL DEFAULT '',
  can_verify boolean NOT NULL DEFAULT false,
  can_supervisor boolean NOT NULL DEFAULT false,
  can_approve boolean NOT NULL DEFAULT false,
  granted_by text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.leave_authorized_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on leave_authorized_roles" ON public.leave_authorized_roles;
CREATE POLICY "Allow all on leave_authorized_roles" ON public.leave_authorized_roles FOR ALL USING (true) WITH CHECK (true);`;

interface LeaveAuthorizedRoleItem {
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

type LeaveTab = "form" | "my" | "review" | "summary" | "permissions";

export default function LeavePage() {
  const { currentUser, currentUserRole, members, showToast } =
    useAppContext();

  const [activeTab, setActiveTab] = useState<LeaveTab>("form");
  const [fiscalYear, setFiscalYear] = useState<number>(() => getFiscalYear());
  const [loading, setLoading] = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [needsRoleMigration, setNeedsRoleMigration] = useState(false);
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [balances, setBalances] = useState<LeaveBalanceItem[]>([]);
  const [mappedUserIds, setMappedUserIds] = useState<string[]>([]);
  const [authorizedEditorIds, setAuthorizedEditorIds] = useState<string[]>([]);
  const [leaveRoles, setLeaveRoles] = useState<LeaveAuthorizedRoleItem[]>([]);

  // Permissions form state (Admin only)
  const [permUserId, setPermUserId] = useState("");
  const [permCanVerify, setPermCanVerify] = useState(true);
  const [permCanSupervisor, setPermCanSupervisor] = useState(false);
  const [permCanApprove, setPermCanApprove] = useState(false);
  const [savingPerm, setSavingPerm] = useState(false);

  // Form state
  const [formKind, setFormKind] = useState<LeaveFormKind>("general");
  const [leaveType, setLeaveType] = useState<LeaveType>("sick_leave");
  const [writtenAt, setWrittenAt] = useState(
    "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"
  );
  const [writtenDate, setWrittenDate] = useState(() => getTodayIsoDate());
  const [subject, setSubject] = useState("ขออนุญาตลาป่วย");
  const [toRecipient, setToRecipient] = useState(
    "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"
  );
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState(() => getTodayIsoDate());
  const [endDate, setEndDate] = useState(() => getTodayIsoDate());
  const [totalWorkingDays, setTotalWorkingDays] = useState<number>(1);
  const [contactInfo, setContactInfo] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [lastLeaveType, setLastLeaveType] = useState("");
  const [lastLeaveStartDate, setLastLeaveStartDate] = useState("");
  const [lastLeaveEndDate, setLastLeaveEndDate] = useState("");
  const [lastLeaveDays, setLastLeaveDays] = useState<string>("");
  const [vacationAccumulatedDays, setVacationAccumulatedDays] = useState<number>(0);
  const [vacationAnnualDays, setVacationAnnualDays] = useState<number>(10);
  const [actingPersonUserId, setActingPersonUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Review / Modal state
  const [reviewFilter, setReviewFilter] = useState<string>("actionable");
  const [actionModal, setActionModal] = useState<{
    leave: LeaveRequestItem;
    action: "verify" | "supervisor_review" | "order";
  } | null>(null);
  const [actionComment, setActionComment] = useState("");
  const [orderDecision, setOrderDecision] = useState<"approved" | "rejected">(
    "approved"
  );
  const [processingAction, setProcessingAction] = useState(false);

  // Balance edit modal
  const [balanceModalUser, setBalanceModalUser] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [balanceForm, setBalanceForm] = useState({
    sickDaysCarried: 0,
    personalDaysCarried: 0,
    maternityDaysCarried: 0,
    vacationAccumulatedDays: 0,
    vacationAnnualDays: 10,
    vacationDaysCarried: 0,
  });

  // Print preview modal
  const [previewLeave, setPreviewLeave] = useState<LeaveRequestItem | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);

  const isAdmin = currentUserRole === "admin";
  const isManager = currentUserRole === "manager";
  const myLeaveRole = useMemo(
    () => leaveRoles.find((r) => r.userId === currentUser?.id) || null,
    [leaveRoles, currentUser?.id]
  );
  const isVerifier = useMemo(() => {
    if (!currentUser) return false;
    return (
      isAdmin ||
      authorizedEditorIds.includes(currentUser.id) ||
      Boolean(myLeaveRole?.canVerify)
    );
  }, [currentUser, isAdmin, authorizedEditorIds, myLeaveRole]);

  const isSupervisor = isAdmin || isManager || Boolean(myLeaveRole?.canSupervisor);
  const isApprover = isAdmin || Boolean(myLeaveRole?.canApprove);
  const canReviewAny = isVerifier || isSupervisor || isApprover;

  const loadLeaveData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leave?fiscalYear=${fiscalYear}`);
      const data = await res.json();
      if (data?.success) {
        setNeedsMigration(Boolean(data.needsMigration));
        setNeedsRoleMigration(Boolean(data.needsRoleMigration));
        setRequests(Array.isArray(data.requests) ? data.requests : []);
        setBalances(Array.isArray(data.balances) ? data.balances : []);
        setMappedUserIds(
          Array.isArray(data.mappedUserIds) ? data.mappedUserIds : []
        );
        setAuthorizedEditorIds(
          Array.isArray(data.authorizedEditorIds) ? data.authorizedEditorIds : []
        );
        setLeaveRoles(Array.isArray(data.leaveRoles) ? data.leaveRoles : []);
      }
    } catch {
      showToast("❌ โหลดข้อมูลระบบใบลาไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [fiscalYear, showToast]);

  useEffect(() => {
    loadLeaveData();
  }, [loadLeaveData]);

  // Pre-fill contact phone & balance for current user
  useEffect(() => {
    if (!currentUser) return;
    if (!contactPhone && currentUser.phone) {
      setContactPhone(currentUser.phone);
    }
    const myBal = balances.find((b) => b.userId === currentUser.id);
    if (myBal) {
      setVacationAccumulatedDays(myBal.vacationAccumulatedDays);
      setVacationAnnualDays(myBal.vacationAnnualDays);
    }
  }, [currentUser, balances, contactPhone]);

  // Auto-calculate working days when date range changes
  useEffect(() => {
    const working = getWorkingDatesBetween(startDate, endDate);
    if (working.length > 0) {
      setTotalWorkingDays(working.length);
    }
  }, [startDate, endDate]);

  // Switch between Form 1 (ป่วย/กิจ/คลอด) and Form 2 (พักผ่อน)
  const handleSelectFormKind = (kind: LeaveFormKind) => {
    setFormKind(kind);
    if (kind === "vacation") {
      setLeaveType("vacation_leave");
      setSubject(LEAVE_TYPE_META.vacation_leave.defaultSubject);
    } else {
      const nextType: LeaveType =
        leaveType === "vacation_leave" ? "sick_leave" : leaveType;
      setLeaveType(nextType);
      setSubject(LEAVE_TYPE_META[nextType].defaultSubject);
    }
  };

  const handleSelectGeneralLeaveType = (type: LeaveType) => {
    setLeaveType(type);
    setSubject(LEAVE_TYPE_META[type].defaultSubject);
  };

  // Auto-fill last approved general leave for Form 1
  const myRequests = useMemo(
    () =>
      requests.filter((r) => r.applicantUserId === currentUser?.id),
    [requests, currentUser?.id]
  );

  useEffect(() => {
    if (formKind !== "general") return;
    const latestApproved = myRequests.find(
      (r) =>
        r.status === "approved" &&
        (r.leaveType === "sick_leave" ||
          r.leaveType === "personal_leave" ||
          r.leaveType === "maternity_leave")
    );
    if (latestApproved && !lastLeaveStartDate) {
      setLastLeaveType(latestApproved.leaveType);
      setLastLeaveStartDate(latestApproved.startDate);
      setLastLeaveEndDate(latestApproved.endDate);
      setLastLeaveDays(String(latestApproved.totalWorkingDays));
    }
  }, [formKind, myRequests, lastLeaveStartDate]);

  // Compute current user's stats in fiscalYear + half-year 23-day rule
  const myStats = useMemo(() => {
    const bal = balances.find((b) => b.userId === currentUser?.id);
    let sick = bal?.sickDaysCarried || 0;
    let personal = bal?.personalDaysCarried || 0;
    let maternity = bal?.maternityDaysCarried || 0;
    let vacation = bal?.vacationDaysCarried || 0;

    const halfYear = getHalfYearRange(startDate);
    let halfYearSickPersonal = 0;

    for (const r of myRequests) {
      if (r.status !== "approved") continue;
      if (r.leaveType === "sick_leave") sick += r.totalWorkingDays;
      else if (r.leaveType === "personal_leave") personal += r.totalWorkingDays;
      else if (r.leaveType === "maternity_leave")
        maternity += r.totalWorkingDays;
      else if (r.leaveType === "vacation_leave") vacation += r.totalWorkingDays;

      if (
        (r.leaveType === "sick_leave" || r.leaveType === "personal_leave") &&
        r.startDate >= halfYear.startDate &&
        r.startDate <= halfYear.endDate
      ) {
        halfYearSickPersonal += r.totalWorkingDays;
      }
    }

    return {
      sick,
      personal,
      maternity,
      vacation,
      halfYearLabel: halfYear.label,
      halfYearSickPersonal,
      vacationEntitled:
        (bal?.vacationAccumulatedDays ?? vacationAccumulatedDays) +
        (bal?.vacationAnnualDays ?? vacationAnnualDays),
    };
  }, [
    balances,
    currentUser?.id,
    myRequests,
    startDate,
    vacationAccumulatedDays,
    vacationAnnualDays,
  ]);

  const projectedHalfYear =
    myStats.halfYearSickPersonal +
    (leaveType === "sick_leave" || leaveType === "personal_leave"
      ? totalWorkingDays
      : 0);

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (endDate < startDate) {
      showToast("⚠️ วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น");
      return;
    }
    if (leaveType === "personal_leave" && !reason.trim()) {
      showToast("⚠️ กรุณาระบุเหตุผลการลากิจส่วนตัว");
      return;
    }

    const actingMember = members.find((m) => m.id === actingPersonUserId);
    setSubmitting(true);
    try {
      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveType,
          writtenAt,
          writtenDate,
          subject,
          toRecipient,
          applicantUserId: currentUser.id,
          applicantName: currentUser.name,
          applicantPosition: currentUser.position || "",
          applicantDivision: currentUser.division || "",
          reason,
          startDate,
          endDate,
          totalWorkingDays,
          lastLeaveType: lastLeaveType || null,
          lastLeaveStartDate: lastLeaveStartDate || null,
          lastLeaveEndDate: lastLeaveEndDate || null,
          lastLeaveDays: lastLeaveDays ? Number(lastLeaveDays) : null,
          contactInfo,
          contactPhone,
          vacationAccumulatedDays,
          vacationAnnualDays,
          actingPersonUserId: actingMember?.id || null,
          actingPersonName: actingMember?.name || "",
          actingPersonPosition: actingMember?.position || "",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(`❌ ${data?.error || "ยื่นใบลาไม่สำเร็จ"}`);
        return;
      }
      showToast(`✅ ยื่นใบลาเลขที่ ${data.request.requestNo} เรียบร้อยแล้ว`);
      setReason("");
      await loadLeaveData();
      setActiveTab("my");
    } catch {
      showToast("❌ เกิดข้อผิดพลาดในการยื่นใบลา");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelLeave = async (leave: LeaveRequestItem) => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/leave", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: leave.id,
          action: "cancel",
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorRole: currentUserRole,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(`❌ ${data?.error || "ยกเลิกใบลาไม่สำเร็จ"}`);
        return;
      }
      showToast("✅ ยกเลิกใบลาเรียบร้อยแล้ว");
      await loadLeaveData();
    } catch {
      showToast("❌ เกิดข้อผิดพลาดในการยกเลิกใบลา");
    }
  };

  const handleSubmitWorkflowAction = async () => {
    if (!currentUser || !actionModal) return;
    setProcessingAction(true);
    try {
      const res = await fetch("/api/leave", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: actionModal.leave.id,
          action: actionModal.action,
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorPosition: currentUser.position || "",
          actorRole: currentUserRole,
          comment: actionComment,
          decision: orderDecision,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(`❌ ${data?.error || "ดำเนินการไม่สำเร็จ"}`);
        return;
      }
      const updated: LeaveRequestItem = data.request;
      if (actionModal.action === "order" && updated.status === "approved") {
        showToast(
          updated.syncedToAttendance
            ? `✅ อนุญาตใบลาและซิงก์เข้าตารางลงเวลาแล้ว`
            : `✅ อนุญาตใบลาแล้ว (${updated.syncNote || "รอจับคู่เครื่องสแกน"})`
        );
      } else {
        showToast("✅ บันทึกผลการพิจารณาเรียบร้อยแล้ว");
      }
      setActionModal(null);
      setActionComment("");
      await loadLeaveData();
    } catch {
      showToast("❌ เกิดข้อผิดพลาดในการบันทึกผล");
    } finally {
      setProcessingAction(false);
    }
  };

  const handleResyncAttendance = async (leave: LeaveRequestItem) => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/leave", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: leave.id,
          action: "sync_attendance",
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorRole: currentUserRole,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(`❌ ${data?.error || "ซิงก์ไม่สำเร็จ"}`);
        return;
      }
      showToast(
        data.request?.syncedToAttendance
          ? `✅ ${data.request.syncNote}`
          : `⚠️ ${data.request?.syncNote || "ยังไม่พบการจับคู่เครื่องสแกน"}`
      );
      await loadLeaveData();
    } catch {
      showToast("❌ ซิงก์ข้อมูลลงเวลาไม่สำเร็จ");
    }
  };

  const handleSaveBalance = async () => {
    if (!currentUser || !balanceModalUser) return;
    try {
      const res = await fetch("/api/leave/balances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: balanceModalUser.userId,
          fiscalYear,
          ...balanceForm,
          actorId: currentUser.id,
          actorRole: currentUserRole,
          actorName: currentUser.name,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(`❌ ${data?.error || "บันทึกยอดวันลาไม่สำเร็จ"}`);
        return;
      }
      showToast("✅ บันทึกยอดวันลาสะสมเรียบร้อยแล้ว");
      setBalanceModalUser(null);
      await loadLeaveData();
    } catch {
      showToast("❌ เกิดข้อผิดพลาดในการบันทึกยอดวันลา");
    }
  };

  const handleSaveLeavePermission = async (
    targetUserId: string,
    canVerify: boolean,
    canSupervisor: boolean,
    canApprove: boolean
  ) => {
    if (!currentUser || !targetUserId) return;
    const member = members.find((m) => m.id === targetUserId);
    if (!member) return;
    setSavingPerm(true);
    try {
      const res = await fetch("/api/leave/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: member.id,
          userName: member.name,
          division: member.division || "",
          canVerify,
          canSupervisor,
          canApprove,
          actorRole: currentUserRole,
          actorName: currentUser.name,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(`❌ ${data?.error || "บันทึกสิทธิ์ไม่สำเร็จ"}`);
        return;
      }
      showToast(
        data.removed
          ? `✅ ถอนสิทธิ์ใบลาของ ${member.name} แล้ว`
          : `✅ บันทึกสิทธิ์ใบลาของ ${member.name} เรียบร้อยแล้ว`
      );
      setPermUserId("");
      await loadLeaveData();
    } catch {
      showToast("❌ เกิดข้อผิดพลาดในการบันทึกสิทธิ์");
    } finally {
      setSavingPerm(false);
    }
  };

  const actionableCount = useMemo(() => {
    return requests.filter((r) => {
      if (r.status === "pending_verifier" && isVerifier) return true;
      if (r.status === "pending_supervisor" && isSupervisor) return true;
      if (r.status === "pending_approver" && isApprover) return true;
      return false;
    }).length;
  }, [requests, isVerifier, isSupervisor, isApprover]);

  const filteredReviewRequests = useMemo(() => {
    return requests.filter((r) => {
      if (reviewFilter === "actionable") {
        if (r.status === "pending_verifier" && isVerifier) return true;
        if (r.status === "pending_supervisor" && isSupervisor) return true;
        if (r.status === "pending_approver" && isApprover) return true;
        return false;
      }
      if (reviewFilter === "all") return true;
      return r.status === reviewFilter;
    });
  }, [requests, reviewFilter, isVerifier, isSupervisor, isApprover]);

  const handleExportPdf = async () => {
    if (!printRef.current || !previewLeave) return;
    await exportElementToA4Pdf(
      printRef.current,
      `${previewLeave.requestNo}_${previewLeave.applicantName}`,
      { orientation: "portrait", marginMm: 10 }
    );
  };

  const isCurrentUserMapped = currentUser
    ? mappedUserIds.includes(currentUser.id)
    : false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900">
              📝 ระบบใบลาอิเล็กทรอนิกส์ (Leave Request)
            </h1>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${
                isCurrentUserMapped
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {isCurrentUserMapped
                ? "🔗 เชื่อมเครื่องสแกนนิ้วแล้ว"
                : "⚠️ ยังไม่จับคู่รหัสเครื่องสแกน"}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            รองรับแบบฟอร์ม 1. ใบลาป่วย/ลากิจ/ลาคลอด และ 2. ใบลาพักผ่อน
            พร้อมซิงก์ลงรายงานลงเวลาราชการอัตโนมัติเมื่อได้รับคำสั่งอนุญาต
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <span className="text-slate-500">ลากิจ+ป่วย ({myStats.halfYearLabel}): </span>
            <span
              className={`font-bold ${
                myStats.halfYearSickPersonal > 23
                  ? "text-rose-600"
                  : "text-indigo-700"
              }`}
            >
              {myStats.halfYearSickPersonal} / 23 วันทำการ
            </span>
          </div>

          <select
            value={fiscalYear}
            onChange={(e) => setFiscalYear(Number(e.target.value))}
            className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 font-medium"
          >
            {[fiscalYear - 1, fiscalYear, fiscalYear + 1].map((fy) => (
              <option key={fy} value={fy}>
                ปีงบประมาณ {fy}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Migration Banner */}
      {needsMigration && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-sm text-amber-900 space-y-2">
          <div className="font-semibold flex items-center justify-between gap-2 flex-wrap">
            <span>
              ⚠️ ยังไม่ได้สร้างตาราง <code>leave_requests</code> และ{" "}
              <code>leave_balances</code> ใน Supabase
            </span>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(LEAVE_MIGRATION_SQL);
                showToast("📋 คัดลอก SQL Migration แล้ว นำไปรันใน Supabase SQL Editor ได้เลย");
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 cursor-pointer"
            >
              📋 คัดลอก SQL Migration
            </button>
          </div>
          <p className="text-xs text-amber-800">
            คัดลอก SQL แล้วนำไปรันใน Supabase Dashboard → SQL Editor จากนั้นกดรีเฟรชหน้านี้
          </p>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("form")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
            activeTab === "form"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          ✍️ ยื่นใบลาใหม่
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("my")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
            activeTab === "my"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          📄 ใบลาของฉัน ({myRequests.length})
        </button>
        {canReviewAny && (
          <button
            type="button"
            onClick={() => setActiveTab("review")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-2 ${
              activeTab === "review"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span>✅ พิจารณาใบลา</span>
            {actionableCount > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-rose-500 text-white">
                {actionableCount}
              </span>
            )}
          </button>
        )}
        {(isAdmin || isVerifier) && (
          <button
            type="button"
            onClick={() => setActiveTab("summary")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === "summary"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            📊 สถิติและวันลาสะสม
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab("permissions")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
              activeTab === "permissions"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            ⚙️ จัดการสิทธิ์ใบลา
          </button>
        )}
      </div>

      {/* TAB 1: ยื่นใบลา */}
      {activeTab === "form" && (
        <form
          onSubmit={handleSubmitLeave}
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6"
        >
          {/* เลือกรูปแบบใบลา */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">
              1. เลือกแบบฟอร์มการลา
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSelectFormKind("general")}
                className={`p-4 rounded-xl border-2 text-left transition cursor-pointer ${
                  formKind === "general"
                    ? "border-indigo-600 bg-indigo-50/60"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="font-bold text-slate-900">
                  🤒 แบบฟอร์ม 1: ใบลาป่วย / ลากิจส่วนตัว / ลาคลอดบุตร
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  ใช้สำหรับขอลาป่วย, ลากิจส่วนตัว หรือลาคลอดบุตร ตามแบบฟอร์มมาตรฐาน
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectFormKind("vacation")}
                className={`p-4 rounded-xl border-2 text-left transition cursor-pointer ${
                  formKind === "vacation"
                    ? "border-emerald-600 bg-emerald-50/60"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="font-bold text-slate-900">
                  🌴 แบบฟอร์ม 2: ใบลาพักผ่อน
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  ใช้สำหรับขอลาพักผ่อนประจำปี พร้อมระบุวันลาสะสมและผู้ปฏิบัติหน้าที่แทน
                </div>
              </button>
            </div>
          </div>

          {/* ประเภทย่อยกรณีแบบฟอร์ม 1 */}
          {formKind === "general" && (
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-2">
                ประเภทการขอลา
              </label>
              <div className="flex flex-wrap gap-2">
                {(["sick_leave", "personal_leave", "maternity_leave"] as LeaveType[]).map(
                  (t) => {
                    const meta = LEAVE_TYPE_META[t];
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleSelectGeneralLeaveType(t)}
                        className={`px-4 py-2 rounded-xl border text-sm font-semibold transition cursor-pointer ${
                          leaveType === t
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {meta.icon} {meta.label}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* ข้อมูลหัวเอกสารและผู้ขอลา */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <div className="text-xs text-slate-500">ผู้ขอลา</div>
              <div className="font-semibold text-slate-900">
                {currentUser?.name || "-"}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">ตำแหน่ง</div>
              <div className="font-semibold text-slate-900">
                {currentUser?.position || "-"}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">กลุ่ม/ฝ่าย</div>
              <div className="font-semibold text-slate-900">
                {currentUser?.division || "-"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                เขียนที่
              </label>
              <input
                type="text"
                value={writtenAt}
                onChange={(e) => setWrittenAt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                วันที่เขียนใบลา
              </label>
              <input
                type="date"
                value={writtenDate}
                onChange={(e) => setWrittenDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                เรื่อง
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                เรียน
              </label>
              <input
                type="text"
                value={toRecipient}
                onChange={(e) => setToRecipient(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                required
              />
            </div>
          </div>

          {/* ช่วงวันที่ลา */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                ตั้งแต่วันที่
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                ถึงวันที่
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                มีกำหนด (วันทำการ)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={totalWorkingDays}
                onChange={(e) => setTotalWorkingDays(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
                required
              />
            </div>
          </div>

          {/* เตือนเงื่อนไข 23 วันทำการ */}
          {(leaveType === "sick_leave" || leaveType === "personal_leave") &&
            projectedHalfYear > 23 && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                ⚠️ <strong>แจ้งเตือนตามระเบียบ:</strong> เมื่อรวมการลาครั้งนี้ (
                {totalWorkingDays} วัน) ยอดลากิจ + ลาป่วยใน{myStats.halfYearLabel}
                จะรวมเป็น <strong>{projectedHalfYear} วันทำการ</strong> ซึ่งเกินเกณฑ์ 23
                วันทำการสำหรับการพิจารณาเลื่อนขั้นเงินเดือน/ค่าจ้าง
              </div>
            )}

          {/* รายละเอียดเฉพาะฟอร์ม 1 vs ฟอร์ม 2 */}
          {formKind === "general" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  เนื่องจาก / เหตุผลการลา{" "}
                  {leaveType === "personal_leave" && (
                    <span className="text-rose-500">*</span>
                  )}
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="ระบุอาการป่วย หรือเหตุผลในการลากิจส่วนตัว"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-700">
                  ประวัติการลาครั้งสุดท้าย (ถ้ามี — ระบบดึงจากใบลาล่าสุดให้อัตโนมัติ)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <select
                    value={lastLeaveType}
                    onChange={(e) => setLastLeaveType(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                  >
                    <option value="">-- ไม่ระบุ --</option>
                    <option value="sick_leave">ป่วย</option>
                    <option value="personal_leave">กิจส่วนตัว</option>
                    <option value="maternity_leave">คลอดบุตร</option>
                  </select>
                  <input
                    type="date"
                    value={lastLeaveStartDate}
                    onChange={(e) => setLastLeaveStartDate(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                  />
                  <input
                    type="date"
                    value={lastLeaveEndDate}
                    onChange={(e) => setLastLeaveEndDate(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                  />
                  <input
                    type="number"
                    step="0.5"
                    placeholder="จำนวนวัน"
                    value={lastLeaveDays}
                    onChange={(e) => setLastLeaveDays(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    วันลาพักผ่อนสะสม (วันทำการ)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={vacationAccumulatedDays}
                    onChange={(e) =>
                      setVacationAccumulatedDays(Number(e.target.value))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    สิทธิลาพักผ่อนประจำปี (วันทำการ)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={vacationAnnualDays}
                    onChange={(e) => setVacationAnnualDays(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    รวมสิทธิทั้งหมด / คงเหลือหลังลา
                  </label>
                  <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-bold text-emerald-700">
                    {vacationAccumulatedDays + vacationAnnualDays} วัน (คงเหลือ{" "}
                    {Math.max(
                      0,
                      vacationAccumulatedDays +
                        vacationAnnualDays -
                        myStats.vacation -
                        totalWorkingDays
                    )}{" "}
                    วัน)
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  ในระหว่างลาพักผ่อน มอบหมายให้ผู้ใดปฏิบัติหน้าที่แทน
                </label>
                <select
                  value={actingPersonUserId}
                  onChange={(e) => setActingPersonUserId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                >
                  <option value="">-- เลือกผู้ปฏิบัติหน้าที่แทน --</option>
                  {members
                    .filter((m) => m.id !== currentUser?.id && m.status === "active")
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.position ? `(${m.position})` : ""}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}

          {/* ช่องทางติดต่อระหว่างลา */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่ (ที่อยู่/ช่องทาง)
              </label>
              <input
                type="text"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="เช่น บ้านพัก / อ.เมือง จ.กำแพงเพชร"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                หมายเลขโทรศัพท์ติดต่อ
              </label>
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="08x-xxx-xxxx"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={submitting || needsMigration}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold shadow-sm cursor-pointer"
            >
              {submitting ? "กำลังบันทึก..." : "📨 ส่งใบลาเข้าสู่สายการพิจารณา"}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: ใบลาของฉัน */}
      {activeTab === "my" && (
        <div className="space-y-4">
          {loading ? (
            <PreloadSkeleton
              variant="cards"
              rows={3}
              label="กำลังโหลดรายการใบลาของคุณ..."
            />
          ) : myRequests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
              ยังไม่มีรายการใบลาในปีงบประมาณ {fiscalYear}
            </div>
          ) : (
            myRequests.map((item) => {
              const typeMeta = LEAVE_TYPE_META[item.leaveType];
              const statusMeta = LEAVE_STATUS_META[item.status];
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-slate-500">
                        {item.requestNo}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${typeMeta.badgeClass}`}
                      >
                        {typeMeta.icon} {typeMeta.label}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${statusMeta.badgeClass}`}
                      >
                        {statusMeta.label}
                      </span>
                      {item.status === "approved" && (
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full border ${
                            item.syncedToAttendance
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {item.syncedToAttendance
                            ? "🔗 ซิงก์ลงรายงานลงเวลาแล้ว"
                            : "⏳ รอซิงก์ลงรายงานลงเวลา"}
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-slate-900">
                      {formatThaiDateFull(item.startDate)} –{" "}
                      {formatThaiDateFull(item.endDate)} ({item.totalWorkingDays}{" "}
                      วันทำการ)
                    </div>
                    {item.reason && (
                      <div className="text-xs text-slate-600">
                        เหตุผล: {item.reason}
                      </div>
                    )}
                    <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                      <span>
                        1. ผู้ตรวจสอบ:{" "}
                        {item.verifierName
                          ? `✓ ${item.verifierName}`
                          : "รอดำเนินการ"}
                      </span>
                      <span>
                        2. ผู้บังคับบัญชา:{" "}
                        {item.supervisorName
                          ? `✓ ${item.supervisorName}`
                          : "รอดำเนินการ"}
                      </span>
                      <span>
                        3. คำสั่ง:{" "}
                        {item.approverName
                          ? `${item.orderDecision === "approved" ? "✓ อนุญาต" : "✗ ไม่อนุญาต"} (${item.approverName})`
                          : "รอดำเนินการ"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewLeave(item)}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      🖨️ ดูแบบฟอร์ม / PDF
                    </button>
                    {item.status !== "approved" && item.status !== "cancelled" && (
                      <button
                        type="button"
                        onClick={() => handleCancelLeave(item)}
                        className="px-3.5 py-2 rounded-xl border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        ยกเลิก
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: พิจารณาใบลา */}
      {activeTab === "review" && canReviewAny && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "actionable", label: `รอฉันดำเนินการ (${actionableCount})` },
              { id: "pending_verifier", label: "รอผู้ตรวจสอบ" },
              { id: "pending_supervisor", label: "รอผู้บังคับบัญชา" },
              { id: "pending_approver", label: "รอคำสั่งอนุญาต" },
              { id: "approved", label: "อนุญาตแล้ว" },
              { id: "all", label: "ทั้งหมด" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setReviewFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                  reviewFilter === f.id
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <PreloadSkeleton
              variant="cards"
              rows={4}
              label="กำลังโหลดคิวพิจารณาใบลา..."
            />
          ) : filteredReviewRequests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
              ไม่พบรายการใบลาในตัวกรองนี้
            </div>
          ) : (
            filteredReviewRequests.map((item) => {
              const typeMeta = LEAVE_TYPE_META[item.leaveType];
              const statusMeta = LEAVE_STATUS_META[item.status];
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-slate-500">
                        {item.requestNo}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${typeMeta.badgeClass}`}
                      >
                        {typeMeta.icon} {typeMeta.label}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${statusMeta.badgeClass}`}
                      >
                        {statusMeta.label}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900">
                      {item.applicantName}{" "}
                      <span className="text-xs font-normal text-slate-500">
                        ({item.applicantPosition || "-"} • {item.applicantDivision || "-"})
                      </span>
                    </div>
                    <div className="text-sm text-slate-700">
                      {formatThaiDateShort(item.startDate)} –{" "}
                      {formatThaiDateShort(item.endDate)} ({item.totalWorkingDays}{" "}
                      วันทำการ)
                      {item.reason ? ` • ${item.reason}` : ""}
                    </div>
                    {item.syncNote && (
                      <div className="text-xs text-slate-500">
                        ⏱️ Attendance: {item.syncNote}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewLeave(item)}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      🖨️ แบบฟอร์ม
                    </button>

                    {item.status === "pending_verifier" && isVerifier && (
                        <button
                          type="button"
                          onClick={() => {
                            setActionComment("ตรวจสอบสถิติการลาถูกต้อง");
                            setActionModal({ leave: item, action: "verify" });
                          }}
                          className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
                        >
                          1. ลงนามผู้ตรวจสอบ
                        </button>
                      )}

                    {item.status === "pending_supervisor" && isSupervisor && (
                        <button
                          type="button"
                          onClick={() => {
                            setActionComment("เห็นควรอนุญาต");
                            setActionModal({
                              leave: item,
                              action: "supervisor_review",
                            });
                          }}
                          className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold cursor-pointer"
                        >
                          2. ความเห็นผู้บังคับบัญชา
                        </button>
                      )}

                    {item.status === "pending_approver" && isApprover && (
                      <button
                        type="button"
                        onClick={() => {
                          setOrderDecision("approved");
                          setActionComment("");
                          setActionModal({ leave: item, action: "order" });
                        }}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        3. ออกคำสั่งอนุญาต
                      </button>
                    )}

                    {item.status === "approved" &&
                      !item.syncedToAttendance &&
                      (isVerifier || isApprover) && (
                        <button
                          type="button"
                          onClick={() => handleResyncAttendance(item)}
                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                        >
                          🔄 ซิงก์ลงเวลา
                        </button>
                      )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 4: สถิติและวันลาสะสม */}
      {activeTab === "summary" && (isAdmin || isVerifier) && (
        loading ? (
          <PreloadSkeleton
            variant="table"
            rows={6}
            label="กำลังโหลดสถิติวันลาประจำปีงบประมาณ..."
          />
        ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="font-bold text-slate-900">
              สรุปวันลาประจำปีงบประมาณ {fiscalYear}
            </div>
            <div className="text-xs text-slate-500">
              คลิก &ldquo;ตั้งค่ายอดยกมา&rdquo; เพื่อกำหนดวันลาสะสมหรือวันลาพักผ่อนตั้งต้น
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs text-slate-600 uppercase">
                <tr>
                  <th className="px-4 py-3">ชื่อ-สกุล</th>
                  <th className="px-4 py-3 text-center">ป่วย</th>
                  <th className="px-4 py-3 text-center">กิจส่วนตัว</th>
                  <th className="px-4 py-3 text-center">คลอดบุตร</th>
                  <th className="px-4 py-3 text-center">พักผ่อน (ใช้/สิทธิ)</th>
                  <th className="px-4 py-3 text-center">เครื่องสแกน</th>
                  <th className="px-4 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members
                  .filter((m) => m.status === "active")
                  .map((m) => {
                    const bal = balances.find((b) => b.userId === m.id);
                    const userApproved = requests.filter(
                      (r) => r.applicantUserId === m.id && r.status === "approved"
                    );
                    const sick =
                      (bal?.sickDaysCarried || 0) +
                      userApproved
                        .filter((r) => r.leaveType === "sick_leave")
                        .reduce((s, r) => s + r.totalWorkingDays, 0);
                    const personal =
                      (bal?.personalDaysCarried || 0) +
                      userApproved
                        .filter((r) => r.leaveType === "personal_leave")
                        .reduce((s, r) => s + r.totalWorkingDays, 0);
                    const maternity =
                      (bal?.maternityDaysCarried || 0) +
                      userApproved
                        .filter((r) => r.leaveType === "maternity_leave")
                        .reduce((s, r) => s + r.totalWorkingDays, 0);
                    const vacationUsed =
                      (bal?.vacationDaysCarried || 0) +
                      userApproved
                        .filter((r) => r.leaveType === "vacation_leave")
                        .reduce((s, r) => s + r.totalWorkingDays, 0);
                    const vacationTotal =
                      (bal?.vacationAccumulatedDays || 0) +
                      (bal?.vacationAnnualDays ?? 10);
                    const isMapped = mappedUserIds.includes(m.id);

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">
                            {m.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {m.position || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">{sick}</td>
                        <td className="px-4 py-3 text-center">{personal}</td>
                        <td className="px-4 py-3 text-center">{maternity}</td>
                        <td className="px-4 py-3 text-center">
                          {vacationUsed} / {vacationTotal}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isMapped ? (
                            <span className="text-xs text-emerald-700 font-medium">
                              ✓ จับคู่แล้ว
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">
                              ยังไม่จับคู่
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setBalanceModalUser({ userId: m.id, name: m.name });
                              setBalanceForm({
                                sickDaysCarried: bal?.sickDaysCarried || 0,
                                personalDaysCarried: bal?.personalDaysCarried || 0,
                                maternityDaysCarried:
                                  bal?.maternityDaysCarried || 0,
                                vacationAccumulatedDays:
                                  bal?.vacationAccumulatedDays || 0,
                                vacationAnnualDays: bal?.vacationAnnualDays ?? 10,
                                vacationDaysCarried: bal?.vacationDaysCarried || 0,
                              });
                            }}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            ตั้งค่ายอดยกมา
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
        )
      )}

      {/* TAB 5: จัดการสิทธิ์ใบลา (เฉพาะ Admin) */}
      {activeTab === "permissions" && isAdmin && (
        <div className="space-y-4">
          {needsRoleMigration && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-sm text-amber-900 flex flex-wrap items-center justify-between gap-2">
              <span>
                ⚠️ ยังไม่ได้สร้างตาราง <code>leave_authorized_roles</code> ใน Supabase
              </span>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(LEAVE_ROLE_MIGRATION_SQL);
                  showToast("📋 คัดลอก SQL สร้างตาราง leave_authorized_roles แล้ว");
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 cursor-pointer"
              >
                📋 คัดลอก SQL
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-900">
                ⚙️ มอบสิทธิ์ผู้พิจารณาใบลารายบุคคล
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                สิทธิ์พื้นฐาน: <code>admin</code> ทำได้ทุกขั้น, <code>manager</code> ลงความเห็นผู้บังคับบัญชาได้, และผู้ดูแลลงเวลา (<code>attendance_authorized_editors</code>) ตรวจสอบสถิติได้ — ส่วนนี้ใช้สำหรับมอบสิทธิ์เพิ่มเติมเป็นรายบุคคล
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="lg:col-span-4">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  เลือกบุคลากร
                </label>
                <select
                  value={permUserId}
                  onChange={(e) => {
                    const uid = e.target.value;
                    setPermUserId(uid);
                    const existing = leaveRoles.find((r) => r.userId === uid);
                    if (existing) {
                      setPermCanVerify(existing.canVerify);
                      setPermCanSupervisor(existing.canSupervisor);
                      setPermCanApprove(existing.canApprove);
                    } else {
                      setPermCanVerify(true);
                      setPermCanSupervisor(false);
                      setPermCanApprove(false);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
                >
                  <option value="">-- เลือกสมาชิก --</option>
                  {members
                    .filter((m) => m.status === "active")
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                </select>
              </div>

              <div className="lg:col-span-6 flex flex-wrap gap-4 py-2">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permCanVerify}
                    onChange={(e) => setPermCanVerify(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>1. ผู้ตรวจสอบสถิติ</span>
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permCanSupervisor}
                    onChange={(e) => setPermCanSupervisor(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>2. ผู้บังคับบัญชา</span>
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permCanApprove}
                    onChange={(e) => setPermCanApprove(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>3. ผู้มีอำนาจสั่งอนุญาต</span>
                </label>
              </div>

              <div className="lg:col-span-2 flex justify-end">
                <button
                  type="button"
                  disabled={!permUserId || savingPerm || needsRoleMigration}
                  onClick={() =>
                    handleSaveLeavePermission(
                      permUserId,
                      permCanVerify,
                      permCanSupervisor,
                      permCanApprove
                    )
                  }
                  className="w-full px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                >
                  {savingPerm ? "กำลังบันทึก..." : "💾 บันทึกสิทธิ์"}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs text-slate-600 uppercase">
                  <tr>
                    <th className="px-4 py-3">ชื่อ-สกุล</th>
                    <th className="px-4 py-3 text-center">1. ผู้ตรวจสอบ</th>
                    <th className="px-4 py-3 text-center">2. ผู้บังคับบัญชา</th>
                    <th className="px-4 py-3 text-center">3. ผู้อนุญาต</th>
                    <th className="px-4 py-3">มอบสิทธิ์โดย</th>
                    <th className="px-4 py-3 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaveRoles.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-6 text-center text-xs text-slate-500"
                      >
                        ยังไม่มีรายชื่อที่กำหนดสิทธิ์เพิ่มเติม (ยังใช้สิทธิ์ตาม Role และผู้ดูแลลงเวลาตามปกติ)
                      </td>
                    </tr>
                  ) : (
                    leaveRoles.map((lr) => (
                      <tr key={lr.userId} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">
                            {lr.userName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {lr.division || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={lr.canVerify}
                            disabled={savingPerm}
                            onChange={(e) =>
                              handleSaveLeavePermission(
                                lr.userId,
                                e.target.checked,
                                lr.canSupervisor,
                                lr.canApprove
                              )
                            }
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={lr.canSupervisor}
                            disabled={savingPerm}
                            onChange={(e) =>
                              handleSaveLeavePermission(
                                lr.userId,
                                lr.canVerify,
                                e.target.checked,
                                lr.canApprove
                              )
                            }
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={lr.canApprove}
                            disabled={savingPerm}
                            onChange={(e) =>
                              handleSaveLeavePermission(
                                lr.userId,
                                lr.canVerify,
                                lr.canSupervisor,
                                e.target.checked
                              )
                            }
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {lr.grantedBy || "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            disabled={savingPerm}
                            onClick={() =>
                              handleSaveLeavePermission(
                                lr.userId,
                                false,
                                false,
                                false
                              )
                            }
                            className="px-3 py-1 rounded-lg border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                          >
                            ถอนสิทธิ์
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: ดำเนินการพิจารณาใบลา */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              {actionModal.action === "verify"
                ? "1. ลงนามผู้ตรวจสอบสถิติการลา"
                : actionModal.action === "supervisor_review"
                ? "2. ความเห็นผู้บังคับบัญชา"
                : "3. คำสั่งผู้มีอำนาจอนุญาต"}
            </h3>
            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl">
              <div>
                <strong>ผู้ขอลา:</strong> {actionModal.leave.applicantName}
              </div>
              <div>
                <strong>ประเภท:</strong>{" "}
                {LEAVE_TYPE_META[actionModal.leave.leaveType].label} (
                {actionModal.leave.totalWorkingDays} วันทำการ)
              </div>
              <div>
                <strong>วันที่:</strong>{" "}
                {formatThaiDateFull(actionModal.leave.startDate)} –{" "}
                {formatThaiDateFull(actionModal.leave.endDate)}
              </div>
            </div>

            {actionModal.action === "order" && (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setOrderDecision("approved")}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-bold cursor-pointer ${
                    orderDecision === "approved"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  ✓ อนุญาต (ซิงก์ลงเวลา)
                </button>
                <button
                  type="button"
                  onClick={() => setOrderDecision("rejected")}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-bold cursor-pointer ${
                    orderDecision === "rejected"
                      ? "bg-rose-600 text-white border-rose-600"
                      : "bg-white text-slate-700 border-slate-200"
                  }`}
                >
                  ✗ ไม่อนุญาต
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                ความเห็น / หมายเหตุ
              </label>
              <textarea
                rows={3}
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 cursor-pointer"
              >
                ปิด
              </button>
              <button
                type="button"
                disabled={processingAction}
                onClick={handleSubmitWorkflowAction}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
              >
                {processingAction ? "กำลังบันทึก..." : "ยืนยันและลงนาม"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: ตั้งค่ายอดยกมา */}
      {balanceModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              ตั้งค่ายอดวันลา ({balanceModalUser.name})
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <label className="text-xs text-slate-600">ลาป่วยยกมา (วัน)</label>
                <input
                  type="number"
                  step="0.5"
                  value={balanceForm.sickDaysCarried}
                  onChange={(e) =>
                    setBalanceForm((p) => ({
                      ...p,
                      sickDaysCarried: Number(e.target.value),
                    }))
                  }
                  className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-1.5"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">ลากิจยกมา (วัน)</label>
                <input
                  type="number"
                  step="0.5"
                  value={balanceForm.personalDaysCarried}
                  onChange={(e) =>
                    setBalanceForm((p) => ({
                      ...p,
                      personalDaysCarried: Number(e.target.value),
                    }))
                  }
                  className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-1.5"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">
                  พักผ่อนสะสม (วัน)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={balanceForm.vacationAccumulatedDays}
                  onChange={(e) =>
                    setBalanceForm((p) => ({
                      ...p,
                      vacationAccumulatedDays: Number(e.target.value),
                    }))
                  }
                  className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-1.5"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">
                  สิทธิพักผ่อนประจำปี (วัน)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={balanceForm.vacationAnnualDays}
                  onChange={(e) =>
                    setBalanceForm((p) => ({
                      ...p,
                      vacationAnnualDays: Number(e.target.value),
                    }))
                  }
                  className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-1.5"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">
                  พักผ่อนใช้แล้วยกมา (วัน)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={balanceForm.vacationDaysCarried}
                  onChange={(e) =>
                    setBalanceForm((p) => ({
                      ...p,
                      vacationDaysCarried: Number(e.target.value),
                    }))
                  }
                  className="w-full mt-1 rounded-xl border border-slate-200 px-3 py-1.5"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBalanceModalUser(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveBalance}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 cursor-pointer"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: ดูแบบฟอร์ม A4 และ Export PDF */}
      {previewLeave && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-slate-100 rounded-2xl max-w-[900px] w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="bg-white px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="font-bold text-slate-900 text-sm">
                แบบฟอร์ม {previewLeave.requestNo} —{" "}
                {LEAVE_TYPE_META[previewLeave.leaveType].label}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                >
                  🖨️ พิมพ์ / บันทึกเป็น PDF (A4)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewLeave(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  ปิด
                </button>
              </div>
            </div>
            <div className="overflow-auto p-6">
              <LeaveFormPrintView leave={previewLeave} printRef={printRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
