"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAppContext } from "@/context/AppContext";
import { downloadLeaveDocx } from "@/lib/leave-docx-export";
import { downloadLeavePdf } from "@/lib/leave-pdf-export";
import { uploadSmartFile } from "@/lib/smart-upload";
import {
  calculateLeavePeriodDetails,
  countWorkingDaysInRange,
  DEFAULT_LEAVE_ORDER_OPERATOR,
  detectLeaveOverlap,
  findLatestApprovedGeneralLeave,
  formatThaiDateFull,
  formatThaiDateShort,
  getEffectiveLeaveDays,
  getFiscalYear,
  getHalfYearRange,
  getTodayIsoDate,
  LEAVE_DAY_PERIOD_LABELS,
  LEAVE_DAY_PERIOD_SHORT,
  LEAVE_STATUS_META,
  LEAVE_TYPE_META,
  LeaveBalanceItem,
  LeaveDayPeriod,
  LeaveFormKind,
  LeaveRequestItem,
  LeaveType,
  normalizeAndValidateLastLeave,
  resolveLeaveAttachmentUrl,
  SOLE_LEAVE_APPROVER,
} from "@/lib/leave-utils";
import {
  buildHolidayMap,
  listHolidaysForFiscalYear,
  ThaiHolidayItem,
} from "@/lib/thai-holidays";
import LeaveSignaturePad from "./LeaveSignaturePad";
import LeavePreviewModal from "./LeavePreviewModal";
import LeaveControlRegisterModal from "./LeaveControlRegisterModal";
import PreloadSkeleton from "@/components/ui/PreloadSkeleton";

const LEAVE_MIGRATION_SQL = `-- รันคำสั่งนี้ใน Supabase SQL Editor เพื่อสร้างตารางระบบใบลา (ครั้งแรก)
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_no text NOT NULL,
  leave_type text NOT NULL CHECK (leave_type IN ('sick_leave', 'personal_leave', 'maternity_leave', 'vacation_leave', 'cancel_leave')),
  leave_day_period text NOT NULL DEFAULT 'full' CHECK (leave_day_period IN ('full', 'morning', 'afternoon')),
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
  cancelled_days numeric(5,1) NOT NULL DEFAULT 0,
  cancel_target_leave_id uuid REFERENCES public.leave_requests(id) ON DELETE SET NULL,
  cancel_target_request_no text,
  cancel_target_leave_type text,
  cancel_target_start_date date,
  cancel_target_end_date date,
  cancel_target_days numeric(5,1),
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
  status text NOT NULL DEFAULT 'pending_verifier' CHECK (status IN ('pending_verifier', 'pending_supervisor', 'pending_approver', 'approved', 'rejected', 'returned', 'cancelled')),
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
  applicant_signature text,
  acting_person_signature text,
  verifier_signature text,
  supervisor_signature text,
  approver_signature text,
  attachment_url text,
  attachment_name text,
  attachment_storage text,
  excluded_holidays jsonb NOT NULL DEFAULT '[]'::jsonb,
  returned_by_name text,
  returned_note text,
  returned_at timestamptz,
  synced_to_attendance boolean NOT NULL DEFAULT false,
  synced_at timestamptz,
  sync_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);`;

const LEAVE_V2_MIGRATION_SQL = `-- รันคำสั่งในไฟล์ supabase/migrations/20261123000001_enhance_leave_system.sql ใน Supabase SQL Editor
ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS leave_day_period text NOT NULL DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS cancelled_days numeric(5,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancel_target_leave_id uuid REFERENCES public.leave_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancel_target_request_no text,
  ADD COLUMN IF NOT EXISTS cancel_target_leave_type text,
  ADD COLUMN IF NOT EXISTS cancel_target_start_date date,
  ADD COLUMN IF NOT EXISTS cancel_target_end_date date,
  ADD COLUMN IF NOT EXISTS cancel_target_days numeric(5,1),
  ADD COLUMN IF NOT EXISTS applicant_signature text,
  ADD COLUMN IF NOT EXISTS acting_person_signature text,
  ADD COLUMN IF NOT EXISTS verifier_signature text,
  ADD COLUMN IF NOT EXISTS supervisor_signature text,
  ADD COLUMN IF NOT EXISTS approver_signature text,
  ADD COLUMN IF NOT EXISTS attachment_storage text,
  ADD COLUMN IF NOT EXISTS excluded_holidays jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS returned_by_name text,
  ADD COLUMN IF NOT EXISTS returned_note text,
  ADD COLUMN IF NOT EXISTS returned_at timestamptz;

CREATE TABLE IF NOT EXISTS public.thai_public_holidays (
  holiday_date date PRIMARY KEY,
  name text NOT NULL,
  fiscal_year integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);`;

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
);`;

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

function ApprovalStepper({ leave }: { leave: LeaveRequestItem }) {
  const isCancel = leave.leaveType === "cancel_leave";
  const steps = isCancel
    ? [
      {
        label: "2. หัวหน้ากลุ่ม/ฝ่าย",
        done: Boolean(leave.supervisorReviewedAt),
        active: leave.status === "pending_supervisor",
        actor: leave.supervisorName || "รอระบุ",
        note: leave.supervisorComment,
      },
      {
        label: "3. เสนอแฟ้ม พมจ. & อนุญาต",
        done: Boolean(leave.orderedAt),
        active: leave.status === "pending_approver",
        rejected: leave.status === "rejected",
        actor:
          leave.status === "pending_approver"
            ? `${leave.approverName || SOLE_LEAVE_APPROVER.name} (แฟ้มกระดาษ)`
            : leave.approverName || SOLE_LEAVE_APPROVER.name,
        note: leave.orderComment,
      },
    ]
    : [
      {
        label: "1. ผู้ตรวจสอบสถิติ",
        done: Boolean(leave.verifiedAt),
        active: leave.status === "pending_verifier",
        actor: leave.verifierName || "ผู้ตรวจสอบ",
        note: leave.verifierNote,
      },
      {
        label: "2. หัวหน้ากลุ่ม/ฝ่าย",
        done: Boolean(leave.supervisorReviewedAt),
        active: leave.status === "pending_supervisor",
        actor: leave.supervisorName || "รอระบุ",
        note: leave.supervisorComment,
      },
      {
        label: "3. เสนอแฟ้ม พมจ. & อนุญาต",
        done: Boolean(leave.orderedAt),
        active: leave.status === "pending_approver",
        rejected: leave.status === "rejected",
        actor:
          leave.status === "pending_approver"
            ? `${leave.approverName || SOLE_LEAVE_APPROVER.name} (แฟ้มกระดาษ)`
            : leave.approverName || SOLE_LEAVE_APPROVER.name,
        note: leave.orderComment,
      },
    ];

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1.5">
      {steps.map((st, idx) => (
        <React.Fragment key={st.label}>
          <div
            title={st.note || undefined}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${st.rejected
              ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60"
              : st.done
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60"
                : st.active
                  ? "bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-700"
                  : "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700"
              }`}
          >
            <span>{st.rejected ? "✗" : st.done ? "✓" : st.active ? "⏳" : "•"}</span>
            <span className="font-semibold">{st.label}:</span>
            <span className="truncate max-w-[140px]">{st.actor}</span>
          </div>
          {idx < steps.length - 1 && (
            <span className="text-slate-300 dark:text-slate-600 text-xs">➔</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

export default function LeavePage() {
  const searchParams = useSearchParams();
  const { currentUser, currentUserRole, members, showToast } = useAppContext();

  const [activeTab, setActiveTab] = useState<LeaveTab>("form");
  const [fiscalYear, setFiscalYear] = useState<number>(() => getFiscalYear());
  const [loading, setLoading] = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [needsV2Migration, setNeedsV2Migration] = useState(false);
  const [needsRoleMigration, setNeedsRoleMigration] = useState(false);
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [balances, setBalances] = useState<LeaveBalanceItem[]>([]);
  const [mappedUserIds, setMappedUserIds] = useState<string[]>([]);
  const [authorizedEditorIds, setAuthorizedEditorIds] = useState<string[]>([]);
  const [leaveRoles, setLeaveRoles] = useState<LeaveAuthorizedRoleItem[]>([]);
  const [dbHolidays, setDbHolidays] = useState<ThaiHolidayItem[]>([]);

  // Permissions form state (Admin only)
  const [permUserId, setPermUserId] = useState("");
  const [permCanVerify, setPermCanVerify] = useState(true);
  const [permCanSupervisor, setPermCanSupervisor] = useState(false);
  const [permCanApprove, setPermCanApprove] = useState(false);
  const [savingPerm, setSavingPerm] = useState(false);

  // Edit-returned mode
  const [editingReturnedLeave, setEditingReturnedLeave] =
    useState<LeaveRequestItem | null>(null);

  // Form state
  const [formKind, setFormKind] = useState<LeaveFormKind>("general");
  const [leaveType, setLeaveType] = useState<LeaveType>("sick_leave");
  const [leaveDayPeriod, setLeaveDayPeriod] = useState<LeaveDayPeriod>("full");
  const [writtenAt, setWrittenAt] = useState("สนง.พมจ.กำแพงเพชร");
  const [writtenDate, setWrittenDate] = useState(() => getTodayIsoDate());
  const [applicantPosition, setApplicantPosition] = useState("");
  const [subject, setSubject] = useState("ขออนุญาตลาป่วย");
  const [toRecipient, setToRecipient] = useState(
    "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"
  );
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState(() => getTodayIsoDate());
  const [endDate, setEndDate] = useState(() => getTodayIsoDate());
  const [contactInfo, setContactInfo] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [lastLeaveType, setLastLeaveType] = useState("");
  const [lastLeaveStartDate, setLastLeaveStartDate] = useState("");
  const [lastLeaveEndDate, setLastLeaveEndDate] = useState("");
  const [lastLeaveDays, setLastLeaveDays] = useState<string>("");
  const [vacationAccumulatedDays, setVacationAccumulatedDays] =
    useState<number>(0);
  const [vacationAnnualDays, setVacationAnnualDays] = useState<number>(10);
  const [actingPersonUserId, setActingPersonUserId] = useState("");
  const [verifierUserId, setVerifierUserId] = useState<string>(
    DEFAULT_LEAVE_ORDER_OPERATOR.userId
  );
  const [supervisorUserId, setSupervisorUserId] = useState("");

  // Form 3 (ขอยกเลิกวันลา) & Attachment & Signature
  const [cancelTargetLeaveId, setCancelTargetLeaveId] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentStorage, setAttachmentStorage] = useState<string | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const attachInputRef = useRef<HTMLInputElement | null>(null);
  const [applicantSignature, setApplicantSignature] = useState<string | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);

  // Preview & Register Modals
  const [previewLeave, setPreviewLeave] = useState<LeaveRequestItem | null>(null);
  const [registerMemberId, setRegisterMemberId] = useState<string | null>(null);

  // Review / Modal state
  const [reviewFilter, setReviewFilter] = useState<string>("actionable");
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewTypeFilter, setReviewTypeFilter] = useState<string>("all");
  const [actionModal, setActionModal] = useState<{
    leave: LeaveRequestItem;
    action: "verify" | "supervisor_review" | "order" | "return";
  } | null>(null);
  const [actionComment, setActionComment] = useState("");
  const [actionSignature, setActionSignature] = useState<string | null>(null);
  const [orderDecision, setOrderDecision] = useState<"approved" | "rejected">(
    "approved"
  );
  const [processingAction, setProcessingAction] = useState(false);

  // Summary / Balance / Holiday management
  const [summarySearch, setSummarySearch] = useState("");
  const [summaryDivisionFilter, setSummaryDivisionFilter] = useState("all");
  const [showHolidayPanel, setShowHolidayPanel] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");
  const [savingHoliday, setSavingHoliday] = useState(false);

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

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const deepLinkAppliedRef = useRef(false);

  const holidayMap = useMemo(() => buildHolidayMap(dbHolidays), [dbHolidays]);
  const fiscalHolidayList = useMemo(
    () => listHolidaysForFiscalYear(fiscalYear, dbHolidays),
    [fiscalYear, dbHolidays]
  );

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
      currentUser.id === DEFAULT_LEAVE_ORDER_OPERATOR.userId ||
      authorizedEditorIds.includes(currentUser.id) ||
      Boolean(myLeaveRole?.canVerify)
    );
  }, [currentUser, isAdmin, authorizedEditorIds, myLeaveRole]);

  const isSupervisor = isAdmin || isManager || Boolean(myLeaveRole?.canSupervisor);
  const isApprover =
    isAdmin ||
    currentUser?.id === SOLE_LEAVE_APPROVER.userId ||
    currentUser?.id === DEFAULT_LEAVE_ORDER_OPERATOR.userId ||
    Boolean(myLeaveRole?.canApprove);
  const isOrderOperatorOnly =
    isApprover && currentUser?.id !== SOLE_LEAVE_APPROVER.userId;
  const canReviewAny = isVerifier || isSupervisor || isApprover;

  const verifierCandidates = useMemo(() => {
    const customVerIds = new Set(
      leaveRoles.filter((r) => r.canVerify).map((r) => r.userId)
    );
    const editorSet = new Set(authorizedEditorIds);
    return members.filter(
      (m) =>
        m.status === "active" &&
        (m.id === DEFAULT_LEAVE_ORDER_OPERATOR.userId ||
          editorSet.has(m.id) ||
          customVerIds.has(m.id) ||
          m.role === "admin")
    );
  }, [members, leaveRoles, authorizedEditorIds]);

  const supervisorCandidates = useMemo(() => {
    const customSupIds = new Set(
      leaveRoles.filter((r) => r.canSupervisor).map((r) => r.userId)
    );
    const list = members.filter(
      (m) =>
        m.status === "active" &&
        m.id !== SOLE_LEAVE_APPROVER.userId &&
        (m.role === "manager" || customSupIds.has(m.id))
    );
    if (list.length > 0) return list;
    return members.filter(
      (m) =>
        m.status === "active" &&
        (m.role === "manager" || customSupIds.has(m.id))
    );
  }, [members, leaveRoles]);

  const soleApproverMember = useMemo(() => {
    const found = members.find((m) => m.id === SOLE_LEAVE_APPROVER.userId);
    return {
      id: SOLE_LEAVE_APPROVER.userId,
      name: found?.name || SOLE_LEAVE_APPROVER.name,
      position: found?.position || SOLE_LEAVE_APPROVER.position,
    };
  }, [members]);

  useEffect(() => {
    if (!currentUser || supervisorCandidates.length === 0) return;
    if (supervisorUserId) return;
    const myDiv = (currentUser.division || "").trim();
    const divMatch =
      supervisorCandidates.find(
        (m) =>
          m.id !== currentUser.id &&
          m.id !== SOLE_LEAVE_APPROVER.userId &&
          (m.division || "").trim() === myDiv &&
          myDiv !== ""
      ) ||
      supervisorCandidates.find(
        (m) =>
          m.id !== currentUser.id &&
          (m.division || "").trim() === myDiv &&
          myDiv !== ""
      ) ||
      supervisorCandidates.find((m) => m.id !== currentUser.id) ||
      supervisorCandidates[0];
    if (divMatch) {
      setSupervisorUserId(divMatch.id);
    }
  }, [currentUser, supervisorCandidates, supervisorUserId]);

  const loadLeaveData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leave?fiscalYear=${fiscalYear}`);
      const data = await res.json();
      if (data?.success) {
        setNeedsMigration(Boolean(data.needsMigration));
        setNeedsV2Migration(Boolean(data.needsV2Migration));
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
        setDbHolidays(Array.isArray(data.holidays) ? data.holidays : []);
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

  // Handle URL deep link (?tab=review&leaveId=...)
  useEffect(() => {
    if (deepLinkAppliedRef.current || loading) return;
    const tabParam = searchParams.get("tab") as LeaveTab | null;
    const leaveIdParam = searchParams.get("leaveId");
    if (tabParam && ["form", "my", "review", "summary", "permissions"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    if (leaveIdParam && requests.length > 0) {
      const target = requests.find((r) => r.id === leaveIdParam);
      if (target) {
        setPreviewLeave(target);
      }
    }
    if (tabParam || leaveIdParam) {
      deepLinkAppliedRef.current = true;
    }
  }, [searchParams, loading, requests]);

  // Pre-fill contact phone & balance for current user
  useEffect(() => {
    if (!currentUser) return;
    if (!applicantPosition && currentUser.position) {
      setApplicantPosition(currentUser.position);
    }
    if (!contactPhone && currentUser.phone) {
      setContactPhone(currentUser.phone);
    }
    const myBal = balances.find((b) => b.userId === currentUser.id);
    if (myBal) {
      setVacationAccumulatedDays(myBal.vacationAccumulatedDays);
      setVacationAnnualDays(myBal.vacationAnnualDays);
    }
  }, [currentUser, balances, applicantPosition, contactPhone]);

  // Ensure half-day resets when start != end or maternity selected
  useEffect(() => {
    if (startDate !== endDate || leaveType === "maternity_leave") {
      if (leaveDayPeriod !== "full") setLeaveDayPeriod("full");
    }
  }, [startDate, endDate, leaveType, leaveDayPeriod]);

  const myRequests = useMemo(
    () => requests.filter((r) => r.applicantUserId === currentUser?.id),
    [requests, currentUser?.id]
  );

  // List of user's approved regular leaves eligible for Form 3 (ขอยกเลิกวันลา)
  const cancelableApprovedLeaves = useMemo(
    () =>
      myRequests.filter(
        (r) =>
          r.status === "approved" &&
          r.leaveType !== "cancel_leave" &&
          getEffectiveLeaveDays(r) > 0
      ),
    [myRequests]
  );

  const selectedCancelTarget = useMemo(
    () =>
      cancelableApprovedLeaves.find((r) => r.id === cancelTargetLeaveId) || null,
    [cancelableApprovedLeaves, cancelTargetLeaveId]
  );

  // Auto-calculate working days + Thai holidays skipped
  const effectiveCalcType: LeaveType =
    formKind === "cancel" && selectedCancelTarget
      ? selectedCancelTarget.leaveType
      : leaveType;

  const calcDetails = useMemo(
    () =>
      calculateLeavePeriodDetails({
        startDate,
        endDate,
        leaveType: effectiveCalcType,
        leaveDayPeriod,
        holidayMap,
      }),
    [startDate, endDate, effectiveCalcType, leaveDayPeriod, holidayMap]
  );
  const totalWorkingDays = calcDetails.totalWorkingDays;

  // Live Overlap Check for Tab 1 (form 1 & 2)
  const overlapCheck = useMemo(() => {
    if (formKind === "cancel") {
      return { hasOverlap: false, conflicts: [] as LeaveRequestItem[] };
    }
    return detectLeaveOverlap({
      candidateStart: startDate,
      candidateEnd: endDate,
      candidatePeriod: leaveDayPeriod,
      existingRequests: myRequests,
      excludeLeaveId: editingReturnedLeave?.id,
    });
  }, [formKind, startDate, endDate, leaveDayPeriod, myRequests, editingReturnedLeave?.id]);

  // Switch between Form 1, 2, 3
  const handleSelectFormKind = (kind: LeaveFormKind) => {
    setFormKind(kind);
    if (kind === "vacation") {
      setLeaveType("vacation_leave");
      setSubject(LEAVE_TYPE_META.vacation_leave.defaultSubject);
    } else if (kind === "cancel") {
      setLeaveType("cancel_leave");
      setSubject(LEAVE_TYPE_META.cancel_leave.defaultSubject);
      if (cancelableApprovedLeaves.length > 0 && !cancelTargetLeaveId) {
        const first = cancelableApprovedLeaves[0];
        setCancelTargetLeaveId(first.id);
        setStartDate(first.startDate);
        setEndDate(first.endDate);
        setLeaveDayPeriod(first.leaveDayPeriod || "full");
      }
    } else {
      const nextType: LeaveType =
        leaveType === "vacation_leave" || leaveType === "cancel_leave"
          ? "sick_leave"
          : leaveType;
      setLeaveType(nextType);
      setSubject(LEAVE_TYPE_META[nextType].defaultSubject);
    }
  };

  const handleSelectGeneralLeaveType = (type: LeaveType) => {
    setLeaveType(type);
    setSubject(LEAVE_TYPE_META[type].defaultSubject);
  };

  const handleSelectCancelTarget = (targetId: string) => {
    setCancelTargetLeaveId(targetId);
    const target = cancelableApprovedLeaves.find((r) => r.id === targetId);
    if (target) {
      setStartDate(target.startDate);
      setEndDate(target.endDate);
      setLeaveDayPeriod(target.leaveDayPeriod || "full");
    }
  };

  // Auto-fill last approved general leave for Form 1 (by latest calendar endDate/startDate)
  const lastLeaveAutoFilledRef = useRef(false);
  useEffect(() => {
    lastLeaveAutoFilledRef.current = false;
  }, [fiscalYear, currentUser?.id]);

  useEffect(() => {
    if (formKind !== "general" || editingReturnedLeave) return;
    if (lastLeaveAutoFilledRef.current || lastLeaveStartDate) return;
    const latestApproved = findLatestApprovedGeneralLeave(myRequests);
    if (latestApproved) {
      lastLeaveAutoFilledRef.current = true;
      setLastLeaveType(latestApproved.leaveType);
      setLastLeaveStartDate(latestApproved.startDate);
      setLastLeaveEndDate(latestApproved.endDate);
      setLastLeaveDays(String(getEffectiveLeaveDays(latestApproved)));
    }
  }, [formKind, myRequests, lastLeaveStartDate, editingReturnedLeave]);

  const lastLeaveValidation = useMemo(
    () =>
      formKind === "general"
        ? normalizeAndValidateLastLeave({
            lastLeaveType,
            lastLeaveStartDate,
            lastLeaveEndDate,
            lastLeaveDays,
            holidayMap,
          })
        : {
            lastLeaveType: null,
            lastLeaveStartDate: null,
            lastLeaveEndDate: null,
            lastLeaveDays: null,
            calculatedDays: null,
            error: null,
          },
    [
      formKind,
      lastLeaveType,
      lastLeaveStartDate,
      lastLeaveEndDate,
      lastLeaveDays,
      holidayMap,
    ]
  );

  const recalcLastLeaveDays = (
    nextType: string,
    nextStart: string,
    nextEnd: string
  ) => {
    if (!nextStart || !nextEnd || nextEnd < nextStart) {
      setLastLeaveDays("");
      return;
    }
    const calcType: LeaveType =
      nextType === "maternity_leave" ? "maternity_leave" : "sick_leave";
    const calc = calculateLeavePeriodDetails({
      startDate: nextStart,
      endDate: nextEnd,
      leaveType: calcType,
      holidayMap,
    });
    setLastLeaveDays(calc.totalWorkingDays > 0 ? String(calc.totalWorkingDays) : "");
  };

  // Compute current user's stats in fiscalYear + half-year 23-day rule (boundary-safe + effectiveDays)
  const myStats = useMemo(() => {
    const bal = balances.find((b) => b.userId === currentUser?.id);
    let sick = bal?.sickDaysCarried || 0;
    let personal = bal?.personalDaysCarried || 0;
    let maternity = bal?.maternityDaysCarried || 0;
    let vacation = bal?.vacationDaysCarried || 0;

    const halfYear = getHalfYearRange(startDate);
    let halfYearSickPersonal = 0;

    for (const r of myRequests) {
      if (r.status !== "approved" || r.leaveType === "cancel_leave") continue;
      const eff = getEffectiveLeaveDays(r);
      if (eff <= 0) continue;

      if (r.leaveType === "sick_leave") sick += eff;
      else if (r.leaveType === "personal_leave") personal += eff;
      else if (r.leaveType === "maternity_leave") maternity += eff;
      else if (r.leaveType === "vacation_leave") vacation += eff;

      if (r.leaveType === "sick_leave" || r.leaveType === "personal_leave") {
        halfYearSickPersonal += countWorkingDaysInRange(
          r,
          halfYear.startDate,
          halfYear.endDate,
          holidayMap
        );
      }
    }

    const vacationEntitled =
      (bal?.vacationAccumulatedDays ?? vacationAccumulatedDays) +
      (bal?.vacationAnnualDays ?? vacationAnnualDays);
    const vacationRemaining = Math.max(
      0,
      Math.round((vacationEntitled - vacation) * 10) / 10
    );
    const pendingCount = myRequests.filter(
      (r) =>
        r.status === "pending_verifier" ||
        r.status === "pending_supervisor" ||
        r.status === "pending_approver" ||
        r.status === "returned"
    ).length;

    return {
      sick: Math.round(sick * 10) / 10,
      personal: Math.round(personal * 10) / 10,
      maternity: Math.round(maternity * 10) / 10,
      vacation: Math.round(vacation * 10) / 10,
      halfYearLabel: halfYear.label,
      halfYearSickPersonal: Math.round(halfYearSickPersonal * 10) / 10,
      vacationEntitled: Math.round(vacationEntitled * 10) / 10,
      vacationRemaining,
      pendingCount,
    };
  }, [
    balances,
    currentUser?.id,
    myRequests,
    startDate,
    vacationAccumulatedDays,
    vacationAnnualDays,
    holidayMap,
  ]);

  const projectedHalfYear =
    Math.round(
      (myStats.halfYearSickPersonal +
        (leaveType === "sick_leave" || leaveType === "personal_leave"
          ? totalWorkingDays
          : 0)) *
      10
    ) / 10;

  const isVacationOverQuota =
    leaveType === "vacation_leave" && totalWorkingDays > myStats.vacationRemaining;

  const isCancelInvalidRange =
    formKind === "cancel" &&
    selectedCancelTarget &&
    (startDate < selectedCancelTarget.startDate ||
      endDate > selectedCancelTarget.endDate ||
      totalWorkingDays > getEffectiveLeaveDays(selectedCancelTarget));

  const handleAttachmentUpload = async (file: File) => {
    setUploadingAttachment(true);
    try {
      const result = await uploadSmartFile(
        file,
        `/virtual-office/leave_attachments/${fiscalYear}`,
        { allowCloudFallback: true, compressImages: true }
      );
      setAttachmentUrl(result.fileUrl || result.nasPath || null);
      setAttachmentName(result.fileName);
      setAttachmentStorage(result.storage);
      showToast(`✅ อัปโหลดไฟล์แนบ "${result.fileName}" สำเร็จ`);
    } catch (err) {
      showToast(
        `❌ ${err instanceof Error ? err.message : "อัปโหลดไฟล์แนบไม่สำเร็จ"}`
      );
    } finally {
      setUploadingAttachment(false);
    }
  };

  const resetFormAfterSubmit = () => {
    setReason("");
    setAttachmentUrl(null);
    setAttachmentName(null);
    setAttachmentStorage(null);
    setEditingReturnedLeave(null);
    setCancelTargetLeaveId("");
    setLeaveDayPeriod("full");
  };

  const handleStartEditReturned = (leave: LeaveRequestItem) => {
    setEditingReturnedLeave(leave);
    setFormKind(
      leave.leaveType === "cancel_leave"
        ? "cancel"
        : leave.leaveType === "vacation_leave"
          ? "vacation"
          : "general"
    );
    setLeaveType(leave.leaveType);
    setLeaveDayPeriod(leave.leaveDayPeriod || "full");
    setWrittenAt(leave.writtenAt);
    setWrittenDate(leave.writtenDate);
    setApplicantPosition(leave.applicantPosition);
    setSubject(leave.subject);
    setToRecipient(leave.toRecipient);
    setReason(leave.reason);
    setStartDate(leave.startDate);
    setEndDate(leave.endDate);
    setContactInfo(leave.contactInfo);
    setContactPhone(leave.contactPhone);
    setLastLeaveType(leave.lastLeaveType || "");
    setLastLeaveStartDate(leave.lastLeaveStartDate || "");
    setLastLeaveEndDate(leave.lastLeaveEndDate || "");
    setLastLeaveDays(
      leave.lastLeaveDays !== null && leave.lastLeaveDays !== undefined
        ? String(leave.lastLeaveDays)
        : ""
    );
    setAttachmentUrl(leave.attachmentUrl);
    setAttachmentName(leave.attachmentName);
    setAttachmentStorage(leave.attachmentStorage);
    setApplicantSignature(leave.applicantSignature);
    setActingPersonUserId(leave.actingPersonUserId || "");
    if (leave.verifierUserId) setVerifierUserId(leave.verifierUserId);
    if (leave.supervisorUserId) setSupervisorUserId(leave.supervisorUserId);
    if (leave.cancelTargetLeaveId) setCancelTargetLeaveId(leave.cancelTargetLeaveId);
    setActiveTab("form");
    showToast(`✏️ กำลังแก้ไขใบลา ${leave.requestNo} เพื่อส่งพิจารณาใหม่`);
  };

  const handleShortcutToCancelForm = (targetLeave: LeaveRequestItem) => {
    setEditingReturnedLeave(null);
    setFormKind("cancel");
    setLeaveType("cancel_leave");
    setSubject(LEAVE_TYPE_META.cancel_leave.defaultSubject);
    setCancelTargetLeaveId(targetLeave.id);
    setStartDate(targetLeave.startDate);
    setEndDate(targetLeave.endDate);
    setLeaveDayPeriod(targetLeave.leaveDayPeriod || "full");
    setReason("");
    setActiveTab("form");
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (endDate < startDate) {
      showToast("⚠️ วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น");
      return;
    }
    if (totalWorkingDays <= 0) {
      showToast("⚠️ ช่วงวันที่เลือกตรงกับวันหยุดทั้งหมด ไม่มีวันทำการ");
      return;
    }
    if (overlapCheck.hasOverlap) {
      showToast("⚠️ พบวันลาซ้อนทับ กรุณาปรับช่วงวันที่ลาก่อนส่งคำขอ");
      return;
    }
    if (isVacationOverQuota) {
      showToast(
        `⚠️ วันลาพักผ่อนคงเหลือไม่เพียงพอ (เหลือ ${myStats.vacationRemaining} วันทำการ)`
      );
      return;
    }
    if (
      (leaveType === "sick_leave" ||
        leaveType === "personal_leave" ||
        leaveType === "cancel_leave") &&
      !reason.trim()
    ) {
      showToast(
        leaveType === "sick_leave"
          ? "⚠️ กรุณาระบุอาการป่วย / เหตุผลการลาป่วย"
          : leaveType === "cancel_leave"
            ? "⚠️ กรุณาระบุเหตุผลการขอยกเลิกวันลา"
            : "⚠️ กรุณาระบุเหตุผลการลากิจส่วนตัว"
      );
      return;
    }
    if (formKind === "cancel" && (!cancelTargetLeaveId || isCancelInvalidRange)) {
      showToast("⚠️ กรุณาเลือกใบลาเดิมและระบุช่วงวันที่ขอยกเลิกให้ถูกต้อง");
      return;
    }
    if (formKind === "general" && lastLeaveValidation.error) {
      showToast(`⚠️ ${lastLeaveValidation.error}`);
      return;
    }

    const actingMember = members.find((m) => m.id === actingPersonUserId);
    const verifierMember = members.find((m) => m.id === verifierUserId);
    const supervisorMember = members.find((m) => m.id === supervisorUserId);

    setSubmitting(true);
    try {
      if (editingReturnedLeave) {
        const res = await fetch("/api/leave", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingReturnedLeave.id,
            action: "resubmit",
            actorId: currentUser.id,
            actorName: currentUser.name,
            actorRole: currentUserRole,
            startDate,
            endDate,
            leaveDayPeriod,
            reason,
            lastLeaveType: lastLeaveValidation.lastLeaveType,
            lastLeaveStartDate: lastLeaveValidation.lastLeaveStartDate,
            lastLeaveEndDate: lastLeaveValidation.lastLeaveEndDate,
            lastLeaveDays: lastLeaveValidation.lastLeaveDays,
            contactInfo,
            contactPhone,
            attachmentUrl,
            attachmentName,
            attachmentStorage,
            applicantSignature,
            actingPersonUserId: actingMember?.id || null,
            actingPersonName: actingMember?.name || "",
            actingPersonPosition: actingMember?.position || "",
            verifierUserId: verifierMember?.id || DEFAULT_LEAVE_ORDER_OPERATOR.userId,
            verifierName: verifierMember?.name || DEFAULT_LEAVE_ORDER_OPERATOR.name,
            verifierPosition:
              verifierMember?.position || DEFAULT_LEAVE_ORDER_OPERATOR.position,
            supervisorUserId: supervisorMember?.id || null,
            supervisorName: supervisorMember?.name || "",
            supervisorPosition: supervisorMember?.position || "",
            approverUserId: soleApproverMember.id,
            approverName: soleApproverMember.name,
            approverPosition: soleApproverMember.position,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          if (data?.needsV2Migration) setNeedsV2Migration(true);
          showToast(`❌ ${data?.error || "ส่งแก้ไขใบลาไม่สำเร็จ"}`);
          return;
        }
        showToast(
          `✅ ส่งใบลาแก้ไข ${editingReturnedLeave.requestNo} เข้าสายพิจารณาใหม่แล้ว`
        );
        resetFormAfterSubmit();
        await loadLeaveData();
        setActiveTab("my");
        return;
      }

      const res = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveType,
          leaveDayPeriod,
          writtenAt,
          writtenDate,
          subject,
          toRecipient,
          applicantUserId: currentUser.id,
          applicantName: currentUser.name,
          applicantPosition: applicantPosition.trim() || currentUser.position || "",
          applicantDivision: currentUser.division || "",
          reason,
          startDate,
          endDate,
          cancelTargetLeaveId: formKind === "cancel" ? cancelTargetLeaveId : null,
          lastLeaveType: lastLeaveValidation.lastLeaveType,
          lastLeaveStartDate: lastLeaveValidation.lastLeaveStartDate,
          lastLeaveEndDate: lastLeaveValidation.lastLeaveEndDate,
          lastLeaveDays: lastLeaveValidation.lastLeaveDays,
          contactInfo,
          contactPhone,
          vacationAccumulatedDays,
          vacationAnnualDays,
          actingPersonUserId: actingMember?.id || null,
          actingPersonName: actingMember?.name || "",
          actingPersonPosition: actingMember?.position || "",
          verifierUserId: verifierMember?.id || DEFAULT_LEAVE_ORDER_OPERATOR.userId,
          verifierName: verifierMember?.name || DEFAULT_LEAVE_ORDER_OPERATOR.name,
          verifierPosition:
            verifierMember?.position || DEFAULT_LEAVE_ORDER_OPERATOR.position,
          supervisorUserId: supervisorMember?.id || null,
          supervisorName: supervisorMember?.name || "",
          supervisorPosition: supervisorMember?.position || "",
          approverUserId: soleApproverMember.id,
          approverName: soleApproverMember.name,
          approverPosition: soleApproverMember.position,
          applicantSignature,
          attachmentUrl,
          attachmentName,
          attachmentStorage,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data?.needsV2Migration) setNeedsV2Migration(true);
        showToast(`❌ ${data?.error || "ยื่นใบลาไม่สำเร็จ"}`);
        return;
      }
      showToast(`✅ ยื่นคำขอเลขที่ ${data.request.requestNo} เรียบร้อยแล้ว`);
      resetFormAfterSubmit();
      await loadLeaveData();
      setActiveTab("my");
    } catch {
      showToast("❌ เกิดข้อผิดพลาดในการยื่นคำขอ");
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
    if (actionModal.action === "return" && !actionComment.trim()) {
      showToast("⚠️ กรุณาระบุเหตุผลหรือจุดที่ต้องการให้แก้ไขก่อนตีกลับ");
      return;
    }
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
          signature:
            actionModal.action !== "return" &&
            !(actionModal.action === "order" && isOrderOperatorOnly)
              ? actionSignature
              : null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data?.needsV2Migration) setNeedsV2Migration(true);
        showToast(`❌ ${data?.error || "ดำเนินการไม่สำเร็จ"}`);
        return;
      }
      const updated: LeaveRequestItem = data.request;
      if (actionModal.action === "return") {
        showToast(`↩️ ตีกลับใบลา ${updated.requestNo} ให้ผู้ขอลาแก้ไขแล้ว`);
      } else if (actionModal.action === "order" && updated.status === "approved") {
        showToast(
          updated.syncedToAttendance
            ? "✅ อนุญาตและซิงก์เข้าตารางลงเวลาเรียบร้อยแล้ว"
            : `✅ อนุญาตแล้ว (${updated.syncNote || "รอจับคู่เครื่องสแกน"})`
        );
      } else {
        showToast("✅ บันทึกผลการพิจารณาเรียบร้อยแล้ว");
      }
      setActionModal(null);
      setActionComment("");
      setActionSignature(null);
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

  const handleAddHoliday = async () => {
    if (!currentUser || !newHolidayDate || !newHolidayName.trim()) return;
    setSavingHoliday(true);
    try {
      const res = await fetch("/api/leave/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holidayDate: newHolidayDate,
          name: newHolidayName.trim(),
          isActive: true,
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorRole: currentUserRole,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(`❌ ${data?.error || "เพิ่มวันหยุดไม่สำเร็จ"}`);
        return;
      }
      showToast(`✅ บันทึกวันหยุด "${newHolidayName.trim()}" เรียบร้อยแล้ว`);
      setNewHolidayDate("");
      setNewHolidayName("");
      await loadLeaveData();
    } catch {
      showToast("❌ เกิดข้อผิดพลาดในการบันทึกวันหยุด");
    } finally {
      setSavingHoliday(false);
    }
  };

  const handleRemoveHoliday = async (holidayDate: string) => {
    if (!currentUser) return;
    setSavingHoliday(true);
    try {
      const res = await fetch("/api/leave/holidays", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holidayDate,
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorRole: currentUserRole,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(`❌ ${data?.error || "ลบวันหยุดไม่สำเร็จ"}`);
        return;
      }
      showToast("✅ ปิดวันหยุดราชการเรียบร้อยแล้ว");
      await loadLeaveData();
    } catch {
      showToast("❌ เกิดข้อผิดพลาดในการลบวันหยุด");
    } finally {
      setSavingHoliday(false);
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

  const canActSupervisorOnLeave = useCallback(
    (leave: LeaveRequestItem) =>
      isAdmin ||
      (leave.supervisorUserId
        ? leave.supervisorUserId === currentUser?.id
        : isSupervisor && currentUser?.id !== SOLE_LEAVE_APPROVER.userId),
    [isAdmin, currentUser?.id, isSupervisor]
  );

  const actionableCount = useMemo(() => {
    return requests.filter((r) => {
      if (r.status === "pending_verifier" && isVerifier) return true;
      if (r.status === "pending_supervisor" && canActSupervisorOnLeave(r)) return true;
      if (r.status === "pending_approver" && isApprover) return true;
      return false;
    }).length;
  }, [requests, isVerifier, canActSupervisorOnLeave, isApprover]);

  const filteredReviewRequests = useMemo(() => {
    const q = reviewSearch.trim().toLowerCase();
    return requests.filter((r) => {
      if (reviewFilter === "actionable") {
        const canAct =
          (r.status === "pending_verifier" && isVerifier) ||
          (r.status === "pending_supervisor" && canActSupervisorOnLeave(r)) ||
          (r.status === "pending_approver" && isApprover);
        if (!canAct) return false;
      } else if (reviewFilter !== "all" && r.status !== reviewFilter) {
        return false;
      }

      if (reviewTypeFilter !== "all" && r.leaveType !== reviewTypeFilter) {
        return false;
      }

      if (q) {
        const hay = `${r.requestNo} ${r.applicantName} ${r.applicantDivision} ${r.reason}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    requests,
    reviewFilter,
    reviewTypeFilter,
    reviewSearch,
    isVerifier,
    canActSupervisorOnLeave,
    isApprover,
  ]);

  const divisionList = useMemo(() => {
    const divs = new Set(
      members
        .filter((m) => m.status === "active" && m.division)
        .map((m) => m.division)
    );
    return Array.from(divs);
  }, [members]);

  const filteredSummaryMembers = useMemo(() => {
    const q = summarySearch.trim().toLowerCase();
    return members.filter((m) => {
      if (m.status !== "active") return false;
      if (summaryDivisionFilter !== "all" && m.division !== summaryDivisionFilter) {
        return false;
      }
      if (q) {
        const hay = `${m.name} ${m.position || ""} ${m.division || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [members, summaryDivisionFilter, summarySearch]);

  const handleDownloadDocx = async (leave: LeaveRequestItem) => {
    setDownloadingId(`${leave.id}:docx`);
    try {
      await downloadLeaveDocx(leave);
      showToast(`📝 ดาวน์โหลด ${leave.requestNo}.docx เรียบร้อยแล้ว`);
    } catch {
      showToast("❌ ดาวน์โหลดไฟล์ Word ไม่สำเร็จ");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadPdf = async (leave: LeaveRequestItem) => {
    setDownloadingId(`${leave.id}:pdf`);
    try {
      await downloadLeavePdf(leave);
      showToast(`📄 ดาวน์โหลด ${leave.requestNo}.pdf เรียบร้อยแล้ว`);
    } catch {
      showToast("❌ ดาวน์โหลดไฟล์ PDF ไม่สำเร็จ");
    } finally {
      setDownloadingId(null);
    }
  };

  const isCurrentUserMapped = currentUser
    ? mappedUserIds.includes(currentUser.id)
    : false;
  const halfYearPct = Math.min(
    100,
    Math.round((myStats.halfYearSickPersonal / 23) * 100)
  );
  const canEditVacationBalance = isAdmin || isVerifier;

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white font-heading">
              📝 ระบบใบลาอิเล็กทรอนิกส์ (Leave Request)
            </h1>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${isCurrentUserMapped
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                }`}
            >
              {isCurrentUserMapped
                ? "🔗 เชื่อมเครื่องสแกนนิ้วแล้ว"
                : "⚠️ ยังไม่จับคู่รหัสเครื่องสแกน"}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            รองรับ 3 แบบฟอร์มราชการ (ป่วย/กิจ/คลอด · ลาพักผ่อน · ขอยกเลิกวันลา) หักวันหยุดราชการไทย & ตรวจวันซ้อนทับอัตโนมัติ พร้อมลายเซ็นดิจิทัลและซิงก์ลงเวลาราชการ
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <select
            value={fiscalYear}
            onChange={(e) => setFiscalYear(Number(e.target.value))}
            aria-label="ปีงบประมาณ"
            className="text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold"
          >
            {[fiscalYear - 1, fiscalYear, fiscalYear + 1].map((fy) => (
              <option key={fy} value={fy}>
                ปีงบประมาณ {fy}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4 Executive Quota KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              🤒 ลาป่วยปีงบฯ {fiscalYear}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-semibold">
              ใช้แล้วสุทธิ
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {myStats.sick}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">วันทำการ</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            คลอดบุตรใช้แล้ว {myStats.maternity} วัน
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              📋 เกณฑ์ 23 วัน (กิจ+ป่วย)
            </span>
            <span
              className={`text-[11px] font-bold ${myStats.halfYearSickPersonal > 23
                ? "text-rose-600 dark:text-rose-400"
                : myStats.halfYearSickPersonal >= 18
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-indigo-600 dark:text-indigo-400"
                }`}
            >
              {myStats.halfYearSickPersonal} / 23 วัน
            </span>
          </div>
          <div className="mt-2.5 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${myStats.halfYearSickPersonal > 23
                ? "bg-rose-500"
                : myStats.halfYearSickPersonal >= 18
                  ? "bg-amber-500"
                  : "bg-indigo-600"
                }`}
              style={{ width: `${halfYearPct}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5 truncate">
            {myStats.halfYearLabel} • กิจปีนี้ {myStats.personal} วัน
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              🌴 ลาพักผ่อนคงเหลือ
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-semibold">
              สิทธิ {myStats.vacationEntitled} วัน
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {myStats.vacationRemaining}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">วันทำการ</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            ใช้ไปแล้ว {myStats.vacation} จาก {myStats.vacationEntitled} วันทำการ
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              ⏳ สถานะงานใบลา
            </span>
            {canReviewAny && actionableCount > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab("review")}
                className="text-[11px] px-2 py-0.5 rounded-full bg-rose-600 text-white font-bold hover:bg-rose-700 cursor-pointer"
              >
                รอฉัน {actionableCount}
              </button>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {myStats.pendingCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              ใบลาของฉันรอดำเนินการ
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            คำขอทั้งหมด {myRequests.length} ฉบับในปีงบ {fiscalYear}
          </div>
        </div>
      </div>

      {/* Migration Banners */}
      {needsMigration && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-2xl p-4 text-sm text-amber-900 dark:text-amber-200 space-y-2">
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
        </div>
      )}

      {!needsMigration && needsV2Migration && isAdmin && (
        <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-800 rounded-2xl p-4 text-sm text-sky-900 dark:text-sky-200 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="font-bold">
              🚀 ตรวจพบ Schema v2 ยังไม่ถูกติดตั้งบน Supabase (ฟีเจอร์ลายเซ็น / ครึ่งวัน / ตีกลับ / ยกเลิกวันลา / วันหยุดไทย)
            </div>
            <div className="text-xs opacity-80 mt-0.5">
              คัดลอก SQL หรือรันไฟล์ <code>supabase/migrations/20261123000001_enhance_leave_system.sql</code> ใน Supabase SQL Editor จากนั้นรีเฟรชหน้า
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(LEAVE_V2_MIGRATION_SQL);
              showToast("📋 คัดลอก SQL อัปเกรด v2 แล้ว");
            }}
            className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shrink-0 cursor-pointer"
          >
            📋 คัดลอก SQL อัปเกรด v2
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("form")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${activeTab === "form"
            ? "bg-indigo-600 text-white shadow-sm"
            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
        >
          ✍️ {editingReturnedLeave ? `แก้ไขใบลา (${editingReturnedLeave.requestNo})` : "ยื่นใบลาใหม่"}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("my")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${activeTab === "my"
            ? "bg-indigo-600 text-white shadow-sm"
            : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            }`}
        >
          📄 ใบลาของฉัน ({myRequests.length})
        </button>
        {canReviewAny && (
          <button
            type="button"
            onClick={() => setActiveTab("review")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer flex items-center gap-2 ${activeTab === "review"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
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
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${activeTab === "summary"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
          >
            📊 สถิติและวันลาสะสม
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab("permissions")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${activeTab === "permissions"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
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
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6"
        >
          {editingReturnedLeave && (
            <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-300 dark:border-orange-800 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-orange-900 dark:text-orange-200 space-y-0.5">
                <div className="font-bold">
                  ↩️ กำลังแก้ไขใบลาที่ถูกตีกลับ: {editingReturnedLeave.requestNo}
                </div>
                <div>
                  ผู้ส่งกลับ: <strong>{editingReturnedLeave.returnedByName || "-"}</strong> · เหตุผล: &ldquo;{editingReturnedLeave.returnedNote || "-"}&rdquo;
                </div>
              </div>
              <button
                type="button"
                onClick={resetFormAfterSubmit}
                className="px-3 py-1.5 rounded-lg border border-orange-300 text-xs font-semibold text-orange-800 dark:text-orange-200 hover:bg-orange-100 cursor-pointer"
              >
                ยกเลิกโหมดแก้ไข
              </button>
            </div>
          )}

          {/* 1. เลือกแบบฟอร์ม 3 แบบ */}
          <div>
            <label className="block text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">
              1. เลือกแบบฟอร์มการลา
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                disabled={Boolean(editingReturnedLeave)}
                onClick={() => handleSelectFormKind("general")}
                className={`p-4 rounded-xl border-2 text-left transition cursor-pointer disabled:opacity-70 ${formKind === "general"
                  ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-900"
                  }`}
              >
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  🤒 แบบฟอร์ม 1: ป่วย / กิจ / คลอด
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  ใบลาป่วย, ลากิจส่วนตัว หรือลาคลอดบุตร ตามแบบฟอร์มมาตรฐานราชการ
                </div>
              </button>

              <button
                type="button"
                disabled={Boolean(editingReturnedLeave)}
                onClick={() => handleSelectFormKind("vacation")}
                className={`p-4 rounded-xl border-2 text-left transition cursor-pointer disabled:opacity-70 ${formKind === "vacation"
                  ? "border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-900"
                  }`}
              >
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  🌴 แบบฟอร์ม 2: ใบลาพักผ่อน
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  ขอลาพักผ่อนประจำปี ตรวจโควตาคงเหลือและระบุผู้ปฏิบัติหน้าที่แทน
                </div>
              </button>

              <button
                type="button"
                disabled={Boolean(editingReturnedLeave)}
                onClick={() => handleSelectFormKind("cancel")}
                className={`p-4 rounded-xl border-2 text-left transition cursor-pointer disabled:opacity-70 ${formKind === "cancel"
                  ? "border-violet-600 bg-violet-50/70 dark:bg-violet-950/40"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-900"
                  }`}
              >
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  ↩️ แบบฟอร์ม 3: ขอยกเลิกวันลา
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  ขอยกเลิกวันลาที่อนุมัติแล้วทั้งหมดหรือบางส่วน พร้อมคืนยอดวันลาอัตโนมัติ
                </div>
              </button>
            </div>
          </div>

          {/* ประเภทย่อยกรณีแบบฟอร์ม 1 */}
          {formKind === "general" && (
            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">
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
                        disabled={Boolean(editingReturnedLeave)}
                        onClick={() => handleSelectGeneralLeaveType(t)}
                        className={`px-4 py-2 rounded-xl border text-sm font-semibold transition cursor-pointer ${leaveType === t
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
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

          {/* ฟอร์ม 3: เลือกใบลาเดิมที่จะยกเลิก */}
          {formKind === "cancel" && (
            <div className="p-4 rounded-xl bg-violet-50/60 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 space-y-3">
              <label className="block text-xs font-bold text-violet-900 dark:text-violet-200">
                เลือกใบลาที่ได้รับอนุญาตแล้วและต้องการขอยกเลิกวันลา <span className="text-rose-500">*</span>
              </label>
              {cancelableApprovedLeaves.length === 0 ? (
                <div className="text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-3 rounded-lg border border-violet-200 dark:border-slate-700">
                  คุณยังไม่มีใบลาที่ได้รับอนุญาตในปีงบประมาณ {fiscalYear} ที่สามารถขอยกเลิกได้
                </div>
              ) : (
                <select
                  value={cancelTargetLeaveId}
                  onChange={(e) => handleSelectCancelTarget(e.target.value)}
                  className="w-full rounded-xl border border-violet-300 dark:border-violet-700 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  required
                >
                  <option value="">-- เลือกใบลาเดิมที่ต้องการขอยกเลิก --</option>
                  {cancelableApprovedLeaves.map((item) => {
                    const meta = LEAVE_TYPE_META[item.leaveType];
                    return (
                      <option key={item.id} value={item.id}>
                        {item.requestNo} · {meta.label} ({formatThaiDateShort(item.startDate)} –{" "}
                        {formatThaiDateShort(item.endDate)} · เหลือยกเลิกได้ {getEffectiveLeaveDays(item)} วัน)
                      </option>
                    );
                  })}
                </select>
              )}
              {selectedCancelTarget && (
                <div className="text-xs text-violet-800 dark:text-violet-300 flex flex-wrap gap-3">
                  <span>
                    📄 อ้างอิง: <strong>{selectedCancelTarget.requestNo}</strong>
                  </span>
                  <span>
                    📅 ช่วงที่อนุญาต: {formatThaiDateFull(selectedCancelTarget.startDate)} –{" "}
                    {formatThaiDateFull(selectedCancelTarget.endDate)}
                  </span>
                  <span>
                    ⚖️ คงเหลือยกเลิกได้: <strong>{getEffectiveLeaveDays(selectedCancelTarget)} วัน</strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ข้อมูลหัวเอกสารและผู้ขอลา */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 items-center">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">ผู้ขอลา</div>
              <div className="font-semibold text-slate-900 dark:text-white">
                {currentUser?.name || "-"}
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                ตำแหน่งผู้ขอลา
              </label>
              <input
                type="text"
                value={applicantPosition}
                onChange={(e) => setApplicantPosition(e.target.value)}
                placeholder="ระบุตำแหน่ง"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-sm font-medium text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">กลุ่ม/ฝ่าย</div>
              <div className="font-semibold text-slate-900 dark:text-white">
                {currentUser?.division || "-"}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                เขียนที่
              </label>
              <input
                type="text"
                value={writtenAt}
                onChange={(e) => setWrittenAt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                วันที่ยื่นใบลา:{" "}
                <span className="text-indigo-700 dark:text-indigo-400 font-bold">
                  {formatThaiDateFull(writtenDate)}
                </span>
              </label>
              <input
                type="date"
                value={writtenDate}
                onChange={(e) => setWrittenDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                เรื่อง
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                เรียน
              </label>
              <input
                type="text"
                value={toRecipient}
                onChange={(e) => setToRecipient(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>

          {/* ช่วงวันที่ลา + ช่วงเวลาครึ่งวัน + สรุปวันหยุดราชการที่หักออกอัตโนมัติ */}
          <div className="space-y-3 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {formKind === "cancel" ? "ยกเลิกตั้งแต่วันที่" : "ตั้งแต่วันที่"}
                </label>
                <input
                  type="date"
                  value={startDate}
                  min={selectedCancelTarget?.startDate || undefined}
                  max={selectedCancelTarget?.endDate || undefined}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (e.target.value > endDate) {
                      setEndDate(e.target.value);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {formKind === "cancel" ? "ถึงวันที่" : "ถึงวันที่"}
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={selectedCancelTarget?.startDate || startDate || undefined}
                  max={selectedCancelTarget?.endDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  จำนวนวันลาสุทธิ (คำนวณอัตโนมัติ)
                </label>
                <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-bold text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
                  <span>
                    {totalWorkingDays}{" "}
                    {calcDetails.isCalendarCount ? "วันปฏิทิน" : "วันทำการ"}
                  </span>
                  {leaveDayPeriod !== "full" && (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                      {LEAVE_DAY_PERIOD_SHORT[leaveDayPeriod]}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ครึ่งวัน */}
            {startDate === endDate && effectiveCalcType !== "maternity_leave" && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  ช่วงเวลาที่ขอลา (ลา 1 วัน):
                </span>
                {(["full", "morning", "afternoon"] as LeaveDayPeriod[]).map(
                  (period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setLeaveDayPeriod(period)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition ${leaveDayPeriod === period
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      {LEAVE_DAY_PERIOD_LABELS[period]}
                    </button>
                  )
                )}
              </div>
            )}

            {/* Breakdown วันหยุดเสาร์-อาทิตย์ และวันหยุดราชการไทย */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {calcDetails.skippedWeekends > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                  🗓️ หักเสาร์-อาทิตย์ {calcDetails.skippedWeekends} วัน
                </span>
              )}
              {calcDetails.skippedHolidays.length > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 font-medium">
                  🏛️ หักวันหยุดราชการ {calcDetails.skippedHolidays.length} วัน:{" "}
                  {calcDetails.skippedHolidays
                    .map((h) => `${formatThaiDateShort(h.date)} (${h.name})`)
                    .join(", ")}
                </span>
              )}
              {calcDetails.isCalendarCount && (
                <span className="px-2.5 py-1 rounded-lg bg-pink-50 dark:bg-pink-950/40 border border-pink-200 text-pink-700 dark:text-pink-300">
                  👶 ลาคลอดบุตรนับวันต่อเนื่องตามปฏิทินรวมวันหยุด
                </span>
              )}
              {totalWorkingDays <= 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-rose-100 dark:bg-rose-950/60 border border-rose-300 text-rose-700 dark:text-rose-300 font-semibold">
                  ⚠️ ช่วงวันที่เลือกไม่มีวันทำการ (ตรงกับวันหยุดทั้งหมด)
                </span>
              )}
            </div>
          </div>

          {/* แจ้งเตือนวันลาซ้อนทับ (Overlap) */}
          {overlapCheck.hasOverlap && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                🚫 พบวันลาซ้อนทับกับคำขอที่มีอยู่แล้ว (ไม่สามารถยื่นซ้อนได้)
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {overlapCheck.conflicts.map((c) => (
                  <li key={c.id}>
                    <strong>{c.requestNo}</strong> · {LEAVE_TYPE_META[c.leaveType].label} (
                    {formatThaiDateShort(c.startDate)} – {formatThaiDateShort(c.endDate)} ·{" "}
                    {LEAVE_DAY_PERIOD_SHORT[c.leaveDayPeriod || "full"]}) — สถานะ:{" "}
                    {LEAVE_STATUS_META[c.status].label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* เตือนเงื่อนไข 23 วันทำการ */}
          {(leaveType === "sick_leave" || leaveType === "personal_leave") &&
            projectedHalfYear > 23 && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
                ⚠️ <strong>แจ้งเตือนตามระเบียบ:</strong> เมื่อรวมการลาครั้งนี้ (
                {totalWorkingDays} วัน) ยอดลากิจ + ลาป่วยใน{myStats.halfYearLabel}
                จะรวมเป็น <strong>{projectedHalfYear} วันทำการ</strong> ซึ่งเกินเกณฑ์ 23
                วันทำการสำหรับการพิจารณาเลื่อนขั้นเงินเดือน/ค่าจ้าง
              </div>
            )}

          {/* แนะนำแนบใบรับรองแพทย์เมื่อลาป่วย >= 3 วัน */}
          {leaveType === "sick_leave" && totalWorkingDays >= 3 && (
            <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-sky-900 dark:text-sky-200 flex items-center justify-between gap-2 flex-wrap">
              <span>
                🏥 <strong>คำแนะนำตามระเบียบ:</strong> การลาป่วยตั้งแต่ 3 วันทำการขึ้นไป ควรแนบ<strong>ใบรับรองแพทย์</strong>ประกอบการพิจารณาด้านล่าง
              </span>
              {attachmentName && (
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">
                  ✓ แนบไฟล์แล้ว: {attachmentName}
                </span>
              )}
            </div>
          )}

          {/* เหตุผลการลา / ประวัติล่าสุด / โควตาพักผ่อน */}
          {(formKind === "general" || formKind === "cancel") && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {formKind === "cancel"
                    ? "เหตุผลความจำเป็นในการขอยกเลิกวันลา"
                    : "เนื่องจาก / เหตุผลการลา"}{" "}
                  {(leaveType === "sick_leave" ||
                    leaveType === "personal_leave" ||
                    leaveType === "cancel_leave") && (
                      <span className="text-rose-500">*</span>
                    )}
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required={
                    leaveType === "sick_leave" ||
                    leaveType === "personal_leave" ||
                    leaveType === "cancel_leave"
                  }
                  placeholder={
                    formKind === "cancel"
                      ? "เช่น ได้รับมอบหมายภารกิจราชการเร่งด่วน จึงขอกลับมาปฏิบัติงาน"
                      : "ระบุอาการป่วย หรือเหตุผลในการลากิจส่วนตัว"
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>

              {formKind === "general" && (
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      ประวัติการลาครั้งสุดท้าย (ถ้ามี — ระบบดึงจากใบลาล่าสุดและคำนวณวันทำการให้อัตโนมัติ)
                    </div>
                    {(lastLeaveType || lastLeaveStartDate || lastLeaveEndDate || lastLeaveDays) && (
                      <button
                        type="button"
                        onClick={() => {
                          lastLeaveAutoFilledRef.current = true;
                          setLastLeaveType("");
                          setLastLeaveStartDate("");
                          setLastLeaveEndDate("");
                          setLastLeaveDays("");
                        }}
                        className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 cursor-pointer"
                      >
                        ✕ ล้างข้อมูลลาครั้งสุดท้าย
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <select
                      value={lastLeaveType}
                      onChange={(e) => {
                        const nextType = e.target.value;
                        setLastLeaveType(nextType);
                        if (lastLeaveStartDate && lastLeaveEndDate) {
                          recalcLastLeaveDays(
                            nextType,
                            lastLeaveStartDate,
                            lastLeaveEndDate
                          );
                        }
                      }}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    >
                      <option value="">-- ไม่ระบุ --</option>
                      <option value="sick_leave">ป่วย</option>
                      <option value="personal_leave">กิจส่วนตัว</option>
                      <option value="maternity_leave">คลอดบุตร</option>
                    </select>
                    <input
                      type="date"
                      value={lastLeaveStartDate}
                      onChange={(e) => {
                        const nextStart = e.target.value;
                        const nextEnd =
                          !lastLeaveEndDate || nextStart > lastLeaveEndDate
                            ? nextStart
                            : lastLeaveEndDate;
                        setLastLeaveStartDate(nextStart);
                        setLastLeaveEndDate(nextEnd);
                        recalcLastLeaveDays(lastLeaveType, nextStart, nextEnd);
                      }}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                    <input
                      type="date"
                      value={lastLeaveEndDate}
                      min={lastLeaveStartDate || undefined}
                      onChange={(e) => {
                        const nextEnd = e.target.value;
                        setLastLeaveEndDate(nextEnd);
                        recalcLastLeaveDays(
                          lastLeaveType,
                          lastLeaveStartDate,
                          nextEnd
                        );
                      }}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                    />
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max={lastLeaveValidation.calculatedDays ?? undefined}
                      placeholder="จำนวนวัน"
                      value={lastLeaveDays}
                      onChange={(e) => setLastLeaveDays(e.target.value)}
                      className={`rounded-xl border px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white ${
                        lastLeaveValidation.error
                          ? "border-rose-400 dark:border-rose-600"
                          : "border-slate-200 dark:border-slate-700"
                      }`}
                    />
                  </div>
                  {lastLeaveValidation.error ? (
                    <div className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                      🚫 {lastLeaveValidation.error}
                    </div>
                  ) : (
                    lastLeaveStartDate &&
                    lastLeaveEndDate &&
                    lastLeaveValidation.calculatedDays !== null && (
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        ✓ คำนวณอัตโนมัติ: {lastLeaveValidation.calculatedDays}{" "}
                        {lastLeaveType === "maternity_leave"
                          ? "วันปฏิทิน"
                          : "วันทำการ (หักเสาร์-อาทิตย์และวันหยุดราชการแล้ว · ปรับเป็น 0.5 ได้กรณีลาครึ่งวัน)"}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {formKind === "vacation" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-emerald-50/50 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    วันลาพักผ่อนสะสม (วันทำการ)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    readOnly={!canEditVacationBalance}
                    value={vacationAccumulatedDays}
                    onChange={(e) =>
                      setVacationAccumulatedDays(Number(e.target.value))
                    }
                    className={`w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm ${canEditVacationBalance
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-not-allowed"
                      }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    สิทธิลาพักผ่อนประจำปี (วันทำการ)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    readOnly={!canEditVacationBalance}
                    value={vacationAnnualDays}
                    onChange={(e) => setVacationAnnualDays(Number(e.target.value))}
                    className={`w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm ${canEditVacationBalance
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-not-allowed"
                      }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    สิทธิคงเหลือหลังหักการลาครั้งนี้
                  </label>
                  <div
                    className={`rounded-xl border px-3 py-2 text-sm font-bold ${isVacationOverQuota
                      ? "bg-rose-50 border-rose-300 text-rose-700"
                      : "bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                      }`}
                  >
                    มีสิทธิ {myStats.vacationEntitled} วัน · เหลือสุทธิ{" "}
                    {Math.max(
                      0,
                      Math.round((myStats.vacationRemaining - totalWorkingDays) * 10) / 10
                    )}{" "}
                    วัน
                  </div>
                </div>
              </div>

              {isVacationOverQuota && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-xs text-rose-700 font-semibold">
                  🚫 วันลาพักผ่อนคงเหลือ ({myStats.vacationRemaining} วันทำการ) น้อยกว่าจำนวนวันที่ขอลา ({totalWorkingDays} วันทำการ)
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  ในระหว่างลาพักผ่อน มอบหมายให้ผู้ใดปฏิบัติหน้าที่แทน
                </label>
                <select
                  value={actingPersonUserId}
                  onChange={(e) => setActingPersonUserId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
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

          {/* ช่องทางติดต่อระหว่างลา (สำหรับฟอร์ม 1 และ 2) */}
          {formKind !== "cancel" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  ในระหว่างลาจะติดต่อข้าพเจ้าได้ที่ (ที่อยู่/ช่องทาง)
                </label>
                <input
                  type="text"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder="เช่น บ้านพัก / อ.เมือง จ.กำแพงเพชร"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  หมายเลขโทรศัพท์ติดต่อ
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="08x-xxx-xxxx"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* แนบเอกสารประกอบ / ใบรับรองแพทย์ */}
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-4 bg-slate-50/60 dark:bg-slate-800/40 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  📎 เอกสารประกอบ / ใบรับรองแพทย์ (PDF หรือรูปภาพ JPG, PNG)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  จัดเก็บบน Synology NAS ของสำนักงาน (หรือ Cloud Storage สำรองหากขนาดไฟล์ใหญ่)
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={attachInputRef}
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleAttachmentUpload(f);
                    e.target.value = "";
                  }}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploadingAttachment}
                  onClick={() => attachInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-50"
                >
                  {uploadingAttachment ? "⏳ กำลังอัปโหลด..." : "📤 เลือกไฟล์แนบ / ใบรับรองแพทย์"}
                </button>
              </div>
            </div>
            {attachmentUrl && (
              <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-emerald-600 font-bold">✓ แนบแล้ว:</span>
                  <a
                    href={resolveLeaveAttachmentUrl(attachmentUrl) || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-indigo-600 hover:underline truncate"
                  >
                    {attachmentName || "เอกสารแนบ"}
                  </a>
                  {attachmentStorage && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">
                      {attachmentStorage}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAttachmentUrl(null);
                    setAttachmentName(null);
                    setAttachmentStorage(null);
                  }}
                  className="text-rose-600 hover:underline font-semibold cursor-pointer"
                >
                  ลบไฟล์แนบ
                </button>
              </div>
            )}
          </div>

          {/* สายการพิจารณา */}
          <div className="space-y-3 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
            <div className="text-[11px] font-medium text-indigo-900 dark:text-indigo-200 bg-white/80 dark:bg-slate-900/70 px-3 py-2 rounded-lg border border-indigo-100 dark:border-indigo-900/60">
              <strong className="font-bold">ขั้นตอนดำเนินการ:</strong>{" "}
              1. ผู้ขอลายื่นในระบบ ➔ 2. นายยุทธนา ตรวจสอบสถิติ ➔ 3. หัวหน้ากลุ่ม/ฝ่าย ใส่ความเห็นและลงนาม ➔ 4. นายยุทธนา เสนอแฟ้มกระดาษให้ พมจ. ({soleApproverMember.name}) เซ็นแล้วปรับสถานะอนุญาต
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {formKind !== "cancel" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    1. ผู้ตรวจสอบสถิติ
                  </label>
                  <select
                    value={verifierUserId}
                    onChange={(e) => setVerifierUserId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {verifierCandidates.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
                  ℹ️ แบบฟอร์มขอยกเลิกวันลาส่งตรงสู่หัวหน้ากลุ่ม/ฝ่าย (ข้ามขั้นผู้ตรวจสอบ)
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  2. หัวหน้ากลุ่ม/ฝ่าย (ผู้บังคับบัญชา)
                </label>
                <select
                  value={supervisorUserId}
                  onChange={(e) => setSupervisorUserId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="">-- เลือกหัวหน้ากลุ่ม/ฝ่าย --</option>
                  {supervisorCandidates.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.division ? `(${m.division})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  3. ผู้มีอำนาจสั่งอนุญาต (ตามระเบียบ)
                </label>
                <div className="w-full rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/60 dark:bg-indigo-950/30 px-3 py-2 text-sm text-slate-900 dark:text-white">
                  <div className="font-semibold flex items-center gap-1.5">
                    <span>🔒 {soleApproverMember.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                    ผู้มีอำนาจสั่งอนุญาตเพียงผู้เดียว · บันทึกผลในระบบหลังอนุมัติเอกสารโดย{" "}
                    {DEFAULT_LEAVE_ORDER_OPERATOR.name}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ลายเซ็นผู้ขอลา */}
          <LeaveSignaturePad
            userId={currentUser?.id}
            label="ลายมือชื่อผู้ขอลา (แสดงบนเอกสาร A4 / PDF / Word)"
            value={applicantSignature}
            onChange={setApplicantSignature}
          />

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={
                submitting ||
                needsMigration ||
                overlapCheck.hasOverlap ||
                totalWorkingDays <= 0 ||
                isVacationOverQuota ||
                Boolean(isCancelInvalidRange) ||
                Boolean(lastLeaveValidation.error)
              }
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold shadow-sm cursor-pointer"
            >
              {submitting
                ? "กำลังบันทึก..."
                : editingReturnedLeave
                  ? "📨 ยืนยันแก้ไขและส่งพิจารณาใหม่"
                  : formKind === "cancel"
                    ? "↩️ ส่งแบบใบขอยกเลิกวันลา"
                    : "📨 ส่งใบลาเข้าสู่สายการพิจารณา"}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: ใบลาของฉัน */}
      {activeTab === "my" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                รายการคำขอลาของฉัน (ปีงบประมาณ {fiscalYear})
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                สามารถเปิดดู พิมพ์ A4 หรือดาวน์โหลดทะเบียนคุมวันลารายบุคคลแบบตารางราชการ (Excel) ได้ตลอดเวลา
              </div>
            </div>
            {currentUser && (
              <button
                type="button"
                onClick={() => setRegisterMemberId(currentUser.id)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                📒 ทะเบียนคุมวันลาของฉัน (ปีงบฯ {fiscalYear})
              </button>
            )}
          </div>
          {loading ? (
            <PreloadSkeleton
              variant="cards"
              rows={3}
              label="กำลังโหลดรายการใบลาของคุณ..."
            />
          ) : myRequests.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 text-sm">
              ยังไม่มีรายการใบลาในปีงบประมาณ {fiscalYear}
            </div>
          ) : (
            myRequests.map((item) => {
              const typeMeta = LEAVE_TYPE_META[item.leaveType];
              const statusMeta = LEAVE_STATUS_META[item.status];
              const attachHref = resolveLeaveAttachmentUrl(item.attachmentUrl);
              const effDays = getEffectiveLeaveDays(item);
              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
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
                      {item.leaveDayPeriod !== "full" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300">
                          {LEAVE_DAY_PERIOD_SHORT[item.leaveDayPeriod]}
                        </span>
                      )}
                      {item.cancelledDays > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                          ยกเลิกบางส่วน -{item.cancelledDays} วัน (สุทธิ {effDays} วัน)
                        </span>
                      )}
                      {item.status === "approved" && (
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full border ${item.syncedToAttendance
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300"
                            : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300"
                            }`}
                        >
                          {item.syncedToAttendance
                            ? "🔗 ซิงก์ลงรายงานลงเวลาแล้ว"
                            : "⏳ รอซิงก์ลงรายงานลงเวลา"}
                        </span>
                      )}
                    </div>

                    <div className="font-semibold text-slate-900 dark:text-white">
                      {formatThaiDateFull(item.startDate)} –{" "}
                      {formatThaiDateFull(item.endDate)} ({item.totalWorkingDays}{" "}
                      {item.leaveType === "maternity_leave" ? "วันปฏิทิน" : "วันทำการ"}
                      )
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      ตำแหน่ง: {item.applicantPosition || "-"} • ยื่นเมื่อ{" "}
                      {formatThaiDateShort(item.writtenDate)}
                      {item.cancelTargetRequestNo && (
                        <span> · อ้างอิงใบลาเดิม: {item.cancelTargetRequestNo}</span>
                      )}
                    </div>

                    {item.reason && (
                      <div className="text-xs text-slate-600 dark:text-slate-300">
                        เหตุผล: {item.reason}
                      </div>
                    )}

                    {item.status === "returned" && item.returnedNote && (
                      <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-xs text-orange-800 dark:text-orange-200">
                        ↩️ <strong>ตีกลับโดย {item.returnedByName || "ผู้พิจารณา"}:</strong>{" "}
                        {item.returnedNote}
                      </div>
                    )}

                    <ApprovalStepper leave={item} />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewLeave(item)}
                      className="px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-semibold cursor-pointer"
                    >
                      👁️ ดูตัวอย่าง A4
                    </button>
                    {attachHref && (
                      <a
                        href={attachHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-semibold"
                      >
                        📎 เอกสารแนบ
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={downloadingId === `${item.id}:docx`}
                      onClick={() => handleDownloadDocx(item)}
                      className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold disabled:opacity-50 cursor-pointer"
                    >
                      {downloadingId === `${item.id}:docx` ? "⏳..." : "📝 Word"}
                    </button>
                    <button
                      type="button"
                      disabled={downloadingId === `${item.id}:pdf`}
                      onClick={() => handleDownloadPdf(item)}
                      className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                    >
                      {downloadingId === `${item.id}:pdf` ? "⏳..." : "📄 PDF"}
                    </button>
                    {item.status === "returned" && (
                      <button
                        type="button"
                        onClick={() => handleStartEditReturned(item)}
                        className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        ✏️ แก้ไขและส่งใหม่
                      </button>
                    )}
                    {item.status === "approved" &&
                      item.leaveType !== "cancel_leave" &&
                      effDays > 0 && (
                        <button
                          type="button"
                          onClick={() => handleShortcutToCancelForm(item)}
                          className="px-3 py-2 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 text-xs font-semibold cursor-pointer"
                        >
                          ↩️ ขอยกเลิกวันลา
                        </button>
                      )}
                    {item.status !== "approved" && item.status !== "cancelled" && (
                      <button
                        type="button"
                        onClick={() => handleCancelLeave(item)}
                        className="px-3 py-2 rounded-xl border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
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
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {[
                { id: "actionable", label: `รอฉันดำเนินการ (${actionableCount})` },
                { id: "pending_verifier", label: "รอผู้ตรวจสอบ" },
                { id: "pending_supervisor", label: "รอหัวหน้ากลุ่ม/ฝ่าย" },
                { id: "pending_approver", label: "รอเสนอแฟ้ม พมจ." },
                { id: "returned", label: "ตีกลับแก้ไข" },
                { id: "approved", label: "อนุญาตแล้ว" },
                { id: "all", label: "ทั้งหมด" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setReviewFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer ${reviewFilter === f.id
                    ? "bg-slate-900 text-white border-slate-900 dark:bg-indigo-600 dark:border-indigo-600"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                    }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={reviewSearch}
                onChange={(e) => setReviewSearch(e.target.value)}
                placeholder="🔍 ค้นหาชื่อผู้ขอลา, เลขที่ใบลา (LV-...), หรือกลุ่มงาน"
                className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <select
                value={reviewTypeFilter}
                onChange={(e) => setReviewTypeFilter(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="all">ทุกประเภทการลา</option>
                <option value="sick_leave">🤒 ลาป่วย</option>
                <option value="personal_leave">📋 ลากิจส่วนตัว</option>
                <option value="maternity_leave">👶 ลาคลอดบุตร</option>
                <option value="vacation_leave">🌴 ลาพักผ่อน</option>
                <option value="cancel_leave">↩️ ขอยกเลิกวันลา</option>
              </select>
            </div>
          </div>

          {loading ? (
            <PreloadSkeleton
              variant="cards"
              rows={4}
              label="กำลังโหลดคิวพิจารณาใบลา..."
            />
          ) : filteredReviewRequests.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-500 text-sm">
              ไม่พบรายการใบลาในตัวกรองนี้
            </div>
          ) : (
            filteredReviewRequests.map((item) => {
              const typeMeta = LEAVE_TYPE_META[item.leaveType];
              const statusMeta = LEAVE_STATUS_META[item.status];
              const attachHref = resolveLeaveAttachmentUrl(item.attachmentUrl);
              const canReturnItem =
                (item.status === "pending_verifier" && isVerifier) ||
                (item.status === "pending_supervisor" &&
                  canActSupervisorOnLeave(item)) ||
                (item.status === "pending_approver" && isApprover);

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
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
                      {item.leaveDayPeriod !== "full" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {LEAVE_DAY_PERIOD_SHORT[item.leaveDayPeriod]}
                        </span>
                      )}
                      {item.status === "pending_approver" && isOrderOperatorOnly ? (
                        <span className="text-xs px-2.5 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold">
                          📁 เสนอแฟ้ม พมจ. → ปรับสถานะ
                        </span>
                      ) : (
                        ((item.status === "pending_verifier" &&
                          item.verifierUserId === currentUser?.id) ||
                          (item.status === "pending_supervisor" &&
                            item.supervisorUserId === currentUser?.id) ||
                          (item.status === "pending_approver" &&
                            item.approverUserId === currentUser?.id)) && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold">
                            📌 มอบหมายถึงคุณ
                          </span>
                        )
                      )}
                    </div>

                    <div className="font-bold text-slate-900 dark:text-white">
                      {item.applicantName}{" "}
                      <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                        ({item.applicantPosition || "-"} •{" "}
                        {item.applicantDivision || "-"})
                      </span>
                    </div>

                    <div className="text-sm text-slate-700 dark:text-slate-300">
                      {formatThaiDateShort(item.startDate)} –{" "}
                      {formatThaiDateShort(item.endDate)} ({item.totalWorkingDays}{" "}
                      {item.leaveType === "maternity_leave" ? "วันปฏิทิน" : "วันทำการ"}
                      )
                      {item.reason ? ` • ${item.reason}` : ""}
                    </div>

                    {item.syncNote && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        ⏱️ Attendance: {item.syncNote}
                      </div>
                    )}

                    <ApprovalStepper leave={item} />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <button
                      type="button"
                      onClick={() => setPreviewLeave(item)}
                      className="px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-semibold cursor-pointer"
                    >
                      👁️ ดูตัวอย่าง A4
                    </button>
                    {attachHref && (
                      <a
                        href={attachHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-semibold"
                      >
                        📎 เอกสารแนบ
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={downloadingId === `${item.id}:docx`}
                      onClick={() => handleDownloadDocx(item)}
                      className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold disabled:opacity-50 cursor-pointer"
                    >
                      {downloadingId === `${item.id}:docx` ? "⏳..." : "📝 Word"}
                    </button>
                    <button
                      type="button"
                      disabled={downloadingId === `${item.id}:pdf`}
                      onClick={() => handleDownloadPdf(item)}
                      className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                    >
                      {downloadingId === `${item.id}:pdf` ? "⏳..." : "📄 PDF"}
                    </button>

                    {canReturnItem && (
                      <button
                        type="button"
                        onClick={() => {
                          setActionComment("");
                          setActionSignature(null);
                          setActionModal({ leave: item, action: "return" });
                        }}
                        className="px-3 py-2 rounded-xl border border-orange-300 text-orange-700 hover:bg-orange-50 text-xs font-semibold cursor-pointer"
                      >
                        ↩️ ตีกลับ
                      </button>
                    )}

                    {item.status === "pending_verifier" && isVerifier && (
                      <button
                        type="button"
                        onClick={() => {
                          setActionComment("ตรวจสอบสถิติการลาถูกต้อง");
                          setActionSignature(null);
                          setActionModal({ leave: item, action: "verify" });
                        }}
                        className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        1. ลงนามผู้ตรวจสอบ
                      </button>
                    )}

                    {item.status === "pending_supervisor" &&
                      canActSupervisorOnLeave(item) && (
                        <button
                          type="button"
                          onClick={() => {
                            setActionComment("เห็นควรอนุญาต");
                            setActionSignature(null);
                            setActionModal({
                              leave: item,
                              action: "supervisor_review",
                            });
                          }}
                          className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold cursor-pointer"
                        >
                          2. ใส่ความเห็นและลงนาม
                        </button>
                      )}

                    {item.status === "pending_approver" && isApprover && (
                      <button
                        type="button"
                        onClick={() => {
                          setOrderDecision("approved");
                          setActionComment("");
                          setActionSignature(null);
                          setActionModal({ leave: item, action: "order" });
                        }}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        {isOrderOperatorOnly
                          ? "3. ปรับสถานะอนุญาต (หลัง พมจ. เซ็น)"
                          : "3. ออกคำสั่งอนุญาต"}
                      </button>
                    )}

                    {item.status === "approved" &&
                      item.leaveType !== "cancel_leave" &&
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

      {/* TAB 4: สถิติและวันลาสะสม + ปฏิทินวันหยุดราชการ */}
      {activeTab === "summary" && (isAdmin || isVerifier) && (
        <div className="space-y-4">
          {loading ? (
            <PreloadSkeleton
              variant="table"
              rows={6}
              label="กำลังโหลดสถิติวันลาประจำปีงบประมาณ..."
            />
          ) : (
            <>
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      สรุปวันลาประจำปีงบประมาณ {fiscalYear}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      คำนวณยอดสุทธิ (หักวันที่ขอยกเลิกวันลาแล้ว) · คลิก &ldquo;ตั้งค่ายอดยกมา&rdquo; เพื่อกำหนดวันลาสะสมตั้งต้น
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={summarySearch}
                      onChange={(e) => setSummarySearch(e.target.value)}
                      placeholder="🔍 ค้นหาชื่อบุคลากร..."
                      className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <select
                      value={summaryDivisionFilter}
                      onChange={(e) => setSummaryDivisionFilter(e.target.value)}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    >
                      <option value="all">ทุกกลุ่ม/ฝ่าย</option>
                      {divisionList.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 uppercase">
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
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredSummaryMembers.map((m) => {
                        const bal = balances.find((b) => b.userId === m.id);
                        const userApproved = requests.filter(
                          (r) =>
                            r.applicantUserId === m.id &&
                            r.status === "approved" &&
                            r.leaveType !== "cancel_leave"
                        );
                        const sick =
                          (bal?.sickDaysCarried || 0) +
                          userApproved
                            .filter((r) => r.leaveType === "sick_leave")
                            .reduce((s, r) => s + getEffectiveLeaveDays(r), 0);
                        const personal =
                          (bal?.personalDaysCarried || 0) +
                          userApproved
                            .filter((r) => r.leaveType === "personal_leave")
                            .reduce((s, r) => s + getEffectiveLeaveDays(r), 0);
                        const maternity =
                          (bal?.maternityDaysCarried || 0) +
                          userApproved
                            .filter((r) => r.leaveType === "maternity_leave")
                            .reduce((s, r) => s + getEffectiveLeaveDays(r), 0);
                        const vacationUsed =
                          (bal?.vacationDaysCarried || 0) +
                          userApproved
                            .filter((r) => r.leaveType === "vacation_leave")
                            .reduce((s, r) => s + getEffectiveLeaveDays(r), 0);
                        const vacationTotal =
                          (bal?.vacationAccumulatedDays || 0) +
                          (bal?.vacationAnnualDays ?? 10);
                        const isMapped = mappedUserIds.includes(m.id);

                        return (
                          <tr
                            key={m.id}
                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                          >
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {m.name}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {m.position || "-"} · {m.division || "-"}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-200">
                              {sick}
                            </td>
                            <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-200">
                              {personal}
                            </td>
                            <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-200">
                              {maternity}
                            </td>
                            <td className="px-4 py-3 text-center text-slate-700 dark:text-slate-200 font-semibold">
                              {vacationUsed} / {vacationTotal}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {isMapped ? (
                                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                                  ✓ จับคู่แล้ว
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  ยังไม่จับคู่
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex items-center justify-end gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => setRegisterMemberId(m.id)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 cursor-pointer"
                                >
                                  📒 ทะเบียนคุมวันลา
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBalanceModalUser({
                                      userId: m.id,
                                      name: m.name,
                                    });
                                    setBalanceForm({
                                      sickDaysCarried: bal?.sickDaysCarried || 0,
                                      personalDaysCarried:
                                        bal?.personalDaysCarried || 0,
                                      maternityDaysCarried:
                                        bal?.maternityDaysCarried || 0,
                                      vacationAccumulatedDays:
                                        bal?.vacationAccumulatedDays || 0,
                                      vacationAnnualDays:
                                        bal?.vacationAnnualDays ?? 10,
                                      vacationDaysCarried:
                                        bal?.vacationDaysCarried || 0,
                                    });
                                  }}
                                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                  ตั้งค่ายอดยกมา
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ปฏิทินวันหยุดราชการไทย */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setShowHolidayPanel((p) => !p)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">
                      📅 ปฏิทินวันหยุดราชการไทย (ปีงบประมาณ {fiscalYear} · {fiscalHolidayList.length} วัน)
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      วันหยุดเหล่านี้ถูกหักออกจากจำนวนวันทำการอัตโนมัติทุกครั้งที่ยื่นใบลา (เพิ่มวันหยุดพิเศษตามมติ ครม. ได้)
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    {showHolidayPanel ? "ซ่อน ▲" : "จัดการวันหยุด ▼"}
                  </span>
                </button>

                {showHolidayPanel && (
                  <div className="p-4 pt-0 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-4">
                      <input
                        type="date"
                        value={newHolidayDate}
                        onChange={(e) => setNewHolidayDate(e.target.value)}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        value={newHolidayName}
                        onChange={(e) => setNewHolidayName(e.target.value)}
                        placeholder="ชื่อวันหยุดราชการ / วันหยุดพิเศษตามมติ ครม."
                        className="md:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        disabled={savingHoliday || !newHolidayDate || !newHolidayName.trim()}
                        onClick={handleAddHoliday}
                        className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                      >
                        + เพิ่ม/อัปเดตวันหยุด
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {fiscalHolidayList.map((h) => (
                        <div
                          key={h.holidayDate}
                          className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 dark:text-slate-100">
                              {formatThaiDateShort(h.holidayDate)}
                            </div>
                            <div className="text-slate-500 dark:text-slate-400 truncate">
                              {h.name}
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={savingHoliday}
                            onClick={() => handleRemoveHoliday(h.holidayDate)}
                            className="text-rose-600 hover:underline font-semibold shrink-0 cursor-pointer"
                          >
                            ปิดใช้งาน
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 5: จัดการสิทธิ์ใบลา (เฉพาะ Admin) */}
      {activeTab === "permissions" && isAdmin && (
        <div className="space-y-4">
          {needsRoleMigration && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-2xl p-4 text-sm text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2">
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

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">
                ⚙️ มอบสิทธิ์ผู้พิจารณาใบลารายบุคคล
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                สิทธิ์พื้นฐาน: <code>admin</code> ทำได้ทุกขั้น, <code>manager</code> ลงความเห็นผู้บังคับบัญชาได้, และผู้ดูแลลงเวลา (<code>attendance_authorized_editors</code>) ตรวจสอบสถิติได้ — สำหรับขั้นคำสั่งอนุญาต ผู้มีอำนาจสั่งอนุญาตตามเอกสารมีเพียง{" "}
                <strong className="text-slate-700 dark:text-slate-200">
                  {SOLE_LEAVE_APPROVER.name}
                </strong>{" "}
                เพียงผู้เดียว ส่วนช่อง &ldquo;3. บันทึกผลอนุญาต (แทน พมจ.)&rdquo; ใช้กำหนดผู้มีสิทธิ์บันทึกผลคำสั่งลงในระบบหลังอนุมัติในเอกสารแล้ว (ค่าเริ่มต้นคือ{" "}
                <strong className="text-slate-700 dark:text-slate-200">
                  {DEFAULT_LEAVE_ORDER_OPERATOR.name}
                </strong>
                )
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="lg:col-span-4">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
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
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
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
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permCanVerify}
                    onChange={(e) => setPermCanVerify(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>1. ผู้ตรวจสอบสถิติ</span>
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permCanSupervisor}
                    onChange={(e) => setPermCanSupervisor(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>2. ผู้บังคับบัญชา</span>
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={permCanApprove}
                    onChange={(e) => setPermCanApprove(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>3. บันทึกผลอนุญาต (แทน พมจ.)</span>
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
                <thead className="bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 uppercase">
                  <tr>
                    <th className="px-4 py-3">ชื่อ-สกุล</th>
                    <th className="px-4 py-3 text-center">1. ผู้ตรวจสอบ</th>
                    <th className="px-4 py-3 text-center">2. ผู้บังคับบัญชา</th>
                    <th className="px-4 py-3 text-center">3. บันทึกผลอนุญาต (แทน พมจ.)</th>
                    <th className="px-4 py-3">มอบสิทธิ์โดย</th>
                    <th className="px-4 py-3 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
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
                      <tr
                        key={lr.userId}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                      >
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {lr.userName}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
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
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
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

      {/* Modal: ดำเนินการพิจารณา / ตีกลับใบลา + ลายเซ็นดิจิทัล */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl my-auto">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {actionModal.action === "verify"
                  ? "1. ลงนามผู้ตรวจสอบสถิติการลา"
                  : actionModal.action === "supervisor_review"
                    ? "2. ความเห็นผู้บังคับบัญชา"
                    : actionModal.action === "return"
                      ? "↩️ ตีกลับใบลาให้ผู้ขอลาแก้ไข"
                      : isOrderOperatorOnly
                        ? "3. ปรับสถานะคำสั่งอนุญาต (หลัง พมจ. เซ็นเอกสาร)"
                        : "3. คำสั่งผู้มีอำนาจอนุญาต"}
              </h3>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setPreviewLeave(actionModal.leave)}
                  className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 text-xs font-semibold cursor-pointer"
                >
                  👁️ ดูแบบฟอร์ม A4
                </button>
                {actionModal.action === "order" && (
                  <>
                    <button
                      type="button"
                      disabled={
                        downloadingId === `${actionModal.leave.id}:docx`
                      }
                      onClick={() => handleDownloadDocx(actionModal.leave)}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold disabled:opacity-50 cursor-pointer"
                    >
                      {downloadingId === `${actionModal.leave.id}:docx`
                        ? "⏳..."
                        : "📝 Word เสนอแฟ้ม"}
                    </button>
                    <button
                      type="button"
                      disabled={
                        downloadingId === `${actionModal.leave.id}:pdf`
                      }
                      onClick={() => handleDownloadPdf(actionModal.leave)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
                    >
                      {downloadingId === `${actionModal.leave.id}:pdf`
                        ? "⏳..."
                        : "📄 PDF เสนอแฟ้ม"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {actionModal.action === "order" && isOrderOperatorOnly && (
              <div className="rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/30 p-3 text-xs text-indigo-900 dark:text-indigo-200 space-y-1 leading-relaxed">
                <div className="font-bold">
                  📁 ขั้นตอนเสนอแฟ้มกระดาษ & ปรับสถานะในระบบ:
                </div>
                <div>
                  1) พิมพ์เอกสาร (Word / PDF / A4) เสนอแฟ้มกระดาษให้{" "}
                  <strong>{SOLE_LEAVE_APPROVER.name}</strong> ลงนามสั่งอนุญาต
                </div>
                <div>
                  2) เมื่อ พมจ. เซ็นเอกสารแล้ว กดเลือกอนุญาต/ไม่อนุญาตด้านล่างเพื่อปรับสถานะและซิงก์ตารางลงเวลา —{" "}
                  <strong>
                    ผู้มีอำนาจสั่งอนุญาตตามเอกสารยังคงเป็น{" "}
                    {SOLE_LEAVE_APPROVER.name}
                  </strong>{" "}
                  ({SOLE_LEAVE_APPROVER.position}) โดยไม่สวมลายเซ็น
                </div>
              </div>
            )}

            <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl space-y-1">
              <div>
                <strong>ผู้ขอลา:</strong> {actionModal.leave.applicantName} ({actionModal.leave.requestNo})
              </div>
              <div>
                <strong>ประเภท:</strong>{" "}
                {LEAVE_TYPE_META[actionModal.leave.leaveType].label} (
                {actionModal.leave.totalWorkingDays} วัน
                {actionModal.leave.leaveDayPeriod !== "full"
                  ? ` · ${LEAVE_DAY_PERIOD_SHORT[actionModal.leave.leaveDayPeriod]}`
                  : ""}
                )
              </div>
              <div>
                <strong>วันที่:</strong>{" "}
                {formatThaiDateFull(actionModal.leave.startDate)} –{" "}
                {formatThaiDateFull(actionModal.leave.endDate)}
              </div>
              {resolveLeaveAttachmentUrl(actionModal.leave.attachmentUrl) && (
                <div>
                  <strong>เอกสารแนบ:</strong>{" "}
                  <a
                    href={resolveLeaveAttachmentUrl(actionModal.leave.attachmentUrl) || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline font-semibold"
                  >
                    📎 {actionModal.leave.attachmentName || "เปิดดูเอกสารแนบ"}
                  </a>
                </div>
              )}
            </div>

            {actionModal.action === "order" && (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setOrderDecision("approved")}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-bold cursor-pointer ${orderDecision === "approved"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                    }`}
                >
                  ✓ อนุญาต (ซิงก์ลงเวลา)
                </button>
                <button
                  type="button"
                  onClick={() => setOrderDecision("rejected")}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-bold cursor-pointer ${orderDecision === "rejected"
                    ? "bg-rose-600 text-white border-rose-600"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                    }`}
                >
                  ✗ ไม่อนุญาต
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                {actionModal.action === "return"
                  ? "เหตุผล / จุดที่ต้องการให้แก้ไข *"
                  : "ความเห็น / หมายเหตุ"}
              </label>
              <textarea
                rows={3}
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder={
                  actionModal.action === "return"
                    ? "เช่น กรุณาแนบใบรับรองแพทย์ หรือระบุช่วงวันที่ให้ถูกต้อง"
                    : "ระบุความเห็นประกอบ (ถ้ามี)"
                }
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white"
              />
            </div>

            {actionModal.action !== "return" &&
              !(actionModal.action === "order" && isOrderOperatorOnly) && (
                <LeaveSignaturePad
                  compact
                  userId={currentUser?.id}
                  label="ลายมือชื่อผู้พิจารณา"
                  value={actionSignature}
                  onChange={setActionSignature}
                />
              )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                ปิด
              </button>
              <button
                type="button"
                disabled={processingAction}
                onClick={handleSubmitWorkflowAction}
                className={`px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 cursor-pointer ${actionModal.action === "return"
                  ? "bg-orange-600 hover:bg-orange-700"
                  : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
              >
                {processingAction
                  ? "กำลังบันทึก..."
                  : actionModal.action === "return"
                    ? "↩️ ยืนยันตีกลับให้แก้ไข"
                    : actionModal.action === "order" && isOrderOperatorOnly
                      ? "✓ ยืนยันบันทึกผลตามเอกสาร"
                      : "✓ ยืนยันและลงนาม"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: ตั้งค่ายอดยกมา */}
      {balanceModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              ตั้งค่ายอดวันลา ({balanceModalUser.name})
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-300">
                  ลาป่วยยกมา (วัน)
                </label>
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
                  className="w-full mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-300">
                  ลากิจยกมา (วัน)
                </label>
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
                  className="w-full mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-300">
                  ลาคลอดบุตรยกมา (วัน)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={balanceForm.maternityDaysCarried}
                  onChange={(e) =>
                    setBalanceForm((p) => ({
                      ...p,
                      maternityDaysCarried: Number(e.target.value),
                    }))
                  }
                  className="w-full mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-300">
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
                  className="w-full mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-300">
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
                  className="w-full mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600 dark:text-slate-300">
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
                  className="w-full mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-slate-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBalanceModalUser(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 cursor-pointer"
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

      {/* Modal: ดูตัวอย่างแบบฟอร์ม A4 */}
      {previewLeave && (
        <LeavePreviewModal
          leave={previewLeave}
          onClose={() => setPreviewLeave(null)}
          onDownloadDocx={handleDownloadDocx}
          onDownloadPdf={handleDownloadPdf}
          downloadingId={downloadingId}
        />
      )}

      {/* Modal: ทะเบียนคุมวันลารายบุคคล (ตามแบบฟอร์มตารางสถิติวันลา 12 คอลัมน์ + Excel) */}
      {registerMemberId && (() => {
        const found =
          members.find((m) => m.id === registerMemberId) ||
          (currentUser && currentUser.id === registerMemberId
            ? currentUser
            : null);
        const regMember = found
          ? {
              userId: found.id,
              name: found.name,
              position: found.position || "-",
              division: found.division || "",
            }
          : {
              userId: registerMemberId,
              name: registerMemberId,
              position: "-",
              division: "",
            };
        const regBalance =
          balances.find((b) => b.userId === registerMemberId) || null;
        const switchableMembers =
          isAdmin || isVerifier
            ? members
                .filter((m) => m.status === "active")
                .map((m) => ({
                  userId: m.id,
                  name: m.name,
                  position: m.position || "-",
                  division: m.division || "",
                }))
            : undefined;
        return (
          <LeaveControlRegisterModal
            member={regMember}
            fiscalYear={fiscalYear}
            requests={requests}
            balance={regBalance}
            availableMembers={switchableMembers}
            onSelectMember={
              isAdmin || isVerifier ? setRegisterMemberId : undefined
            }
            onClose={() => setRegisterMemberId(null)}
          />
        );
      })()}
    </div>
  );
}
