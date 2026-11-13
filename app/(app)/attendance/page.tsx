"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAppContext } from "@/context/AppContext";
import {
  AttendanceLogItem,
  ScannerUserMapping,
  AuthorizedAttendanceEditor,
  NasMysqlConfig,
  DeviceOverviewMetadata,
  ScannerUidStat,
} from "@/lib/attendance-db";
import {
  classifyAttendanceByOfficialHours,
  getAttendanceIoLabel,
  getThaiFiscalPeriod,
  getMonthDateRange,
  getFiscalYearDateRange,
  groupMonthsByFiscalYear,
} from "@/lib/attendance-rules";

interface ScannerOverviewResponse {
  info?: {
    productCode?: string;
    serialNumber?: string;
    deviceTime?: string;
  };
  status?: {
    registeredUsersCount?: number;
    fingerprintsCount?: number;
    attendanceLogsCount?: number;
  };
  error?: string;
}

interface MysqlStatusInfo {
  connected: boolean;
  host: string;
  port: number;
  database: string;
  user: string;
  mysqlVersion?: string;
  rowCount?: number;
  errorCode?: string;
  errorMessage?: string;
  setupAdvice?: string;
}

interface SupabaseStatusInfo {
  ready: boolean;
  count: number;
  error?: string;
}

interface SystemUserOption {
  id: string;
  name: string;
  nickname?: string | null;
  division: string;
  position: string;
  role: string;
  status: string;
}

interface RemoteSyncRequestInfo {
  id: string;
  requestId: string;
  status: "pending" | "running" | "success" | "error";
  state: "pending" | "running" | "completed" | "failed";
  limitLatest: number;
  requestedBy: string;
  requestedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  workerHost?: string | null;
  error?: string | null;
  result?: {
    deviceTotalCount?: number;
    pulledCount?: number;
    addedCount?: number;
    updatedCount?: number;
    nasActiveAfter?: number | null;
    supabaseActiveAfter?: number | null;
    elapsedMs?: number;
  } | null;
}

function getTodayThaiDate(): string {
  const th = new Date(Date.now() + 7 * 3600000);
  return th.toISOString().slice(0, 10);
}

export default function AttendancePage() {
  const { currentUser, currentUserRole, members, showToast, addAuditLog } =
    useAppContext();

  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncLimit, setSyncLimit] = useState<number>(1500);

  const [logs, setLogs] = useState<AttendanceLogItem[]>([]);
  const [filteredTotal, setFilteredTotal] = useState<number>(0);
  const [totalStoredLogs, setTotalStoredLogs] = useState<number>(0);
  const [deviceTotalRecords, setDeviceTotalRecords] = useState<number>(0);
  const [deviceOverview, setDeviceOverview] = useState<DeviceOverviewMetadata | null>(null);
  const [scannerOverview, setScannerOverview] = useState<ScannerOverviewResponse | null>(null);
  const [latestScanTimestamp, setLatestScanTimestamp] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastMysqlSyncedAt, setLastMysqlSyncedAt] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [dataSource, setDataSource] = useState<"local" | "supabase">("local");
  const [isCloudServer, setIsCloudServer] = useState<boolean>(false);
  const [canSyncFromScanner, setCanSyncFromScanner] = useState<boolean>(true);
  const [remoteSyncRequest, setRemoteSyncRequest] =
    useState<RemoteSyncRequestInfo | null>(null);
  const [remoteSyncTimedOut, setRemoteSyncTimedOut] = useState<boolean>(false);

  // Pagination & Stats
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(200);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [serverSummaryStats, setServerSummaryStats] = useState<{
    checkInOnTime: number;
    checkOut: number;
    lateOrLeave: number;
    midDay: number;
    checkInTotal: number;
    edited: number;
    checkIn: number;
    lateCount: number;
    lateCountIsApprox?: boolean;
  } | null>(null);

  const [mysqlConfig, setMysqlConfig] = useState<NasMysqlConfig>({
    connectionMode: "direct_tcp",
    host: "192.168.162.23",
    port: 3308,
    user: "smartmso",
    password: "",
    database: "smart_mso_attendance",
    cloudflareBridgeUrl: "https://db.smso.site/attendance-bridge.php",
    cloudflareBridgeSecret: "",
    scannerIp: "192.168.162.15",
    scannerPort: 5005,
    scannerPassword: 0,
  });
  const [mysqlStatus, setMysqlStatus] = useState<MysqlStatusInfo | null>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatusInfo | null>(null);
  const [setupSql, setSetupSql] = useState<string>("");
  const [mappings, setMappings] = useState<Record<number, ScannerUserMapping>>({});
  const [systemUsers, setSystemUsers] = useState<SystemUserOption[]>([]);
  const [scannerUidStats, setScannerUidStats] = useState<
    Record<number, ScannerUidStat>
  >({});
  const [authorizedEditors, setAuthorizedEditors] = useState<
    AuthorizedAttendanceEditor[]
  >([]);

  // ตัวกรองตาราง
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>("");
  const [selectedFiscalMonth, setSelectedFiscalMonth] = useState<string>("");
  const [selectedScannerUid, setSelectedScannerUid] = useState<string>("all");
  const [selectedIoMode, setSelectedIoMode] = useState<string>("all");
  const [searchText, setSearchText] = useState<string>("");
  const [debouncedSearchText, setDebouncedSearchText] = useState<string>("");

  // Modals
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [editingLog, setEditingLog] = useState<AttendanceLogItem | null>(null);
  const [logForm, setLogForm] = useState({
    scannerUserId: 1,
    scanDate: getTodayThaiDate(),
    scanTime: "08:30:00",
    ioMode: 1,
    verifyMode: 1,
    editNote: "",
  });

  const [deletingLog, setDeletingLog] = useState<AttendanceLogItem | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>("ลบรายการสแกนซ้ำ/คลาดเคลื่อน");

  const [showMappingModal, setShowMappingModal] = useState<boolean>(false);
  const [editingMappingUid, setEditingMappingUid] = useState<number>(1);
  const [mappingForm, setMappingForm] = useState({
    userId: "",
    memberId: "",
    memberName: "",
    division: "",
    position: "",
  });
  const [mappingFilterMode, setMappingFilterMode] = useState<
    "all" | "active_unmapped" | "mapped"
  >("all");
  const [mappingSearch, setMappingSearch] = useState<string>("");
  const [draftUserMappings, setDraftUserMappings] = useState<
    Record<number, { userId: string; matchMethod: "manual" | "auto_name" }>
  >({});
  const [savingMapping, setSavingMapping] = useState<boolean>(false);

  const [showEditorsModal, setShowEditorsModal] = useState<boolean>(false);
  const [savingEditors, setSavingEditors] = useState<boolean>(false);
  const [showMysqlModal, setShowMysqlModal] = useState<boolean>(false);
  const [showMysqlPassword, setShowMysqlPassword] = useState<boolean>(false);
  const [testingMysql, setTestingMysql] = useState<boolean>(false);
  const didInitialFetchRef = useRef<boolean>(false);
  const fetchSeqRef = useRef<number>(0);

  // Debounce ช่องค้นหา 300ms เพื่อลดการยิง API ถี่เกินไปขณะพิมพ์
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // ตรวจสอบว่าผู้ใช้ปัจจุบันมีสิทธิ์ แก้ไข/เพิ่ม/ลบ เวลาเข้า-ออกงานหรือไม่
  const canEditAttendance = useMemo(() => {
    if (currentUserRole === "admin") return true;
    if (!currentUser) return false;
    return authorizedEditors.some(
      (ed) =>
        ed.memberId === currentUser.id ||
        ed.memberName.trim() === currentUser.name.trim()
    );
  }, [currentUser, currentUserRole, authorizedEditors]);

  const fetchAttendanceData = useCallback(
    async (opts?: {
      customDateFrom?: string;
      customDateTo?: string;
      customPage?: number;
      autoSyncIfEmpty?: boolean;
      checkHardware?: boolean;
    }) => {
      const seq = ++fetchSeqRef.current;
      try {
        setLoading(true);
        const params = new URLSearchParams();
        const df = opts?.customDateFrom !== undefined ? opts.customDateFrom : dateFrom;
        const dt = opts?.customDateTo !== undefined ? opts.customDateTo : dateTo;
        const p = opts?.customPage !== undefined ? opts.customPage : page;
        if (df) params.set("dateFrom", df);
        if (dt) params.set("dateTo", dt);
        if (selectedScannerUid !== "all") params.set("scannerUserId", selectedScannerUid);
        if (selectedIoMode !== "all") params.set("ioMode", selectedIoMode);
        if (debouncedSearchText.trim()) params.set("search", debouncedSearchText.trim());
        if (opts?.checkHardware) params.set("checkHardware", "1");
        params.set("page", String(p));
        params.set("pageSize", String(pageSize));

        const res = await fetch(`/api/attendance?${params.toString()}`);
        const data = await res.json();
        if (seq !== fetchSeqRef.current) return; // Ignore stale out-of-order response
        if (data.success) {
          setLogs(data.logs || []);
          setFilteredTotal(data.filteredTotal || 0);
          setTotalStoredLogs(data.totalStoredLogs || 0);
          setDeviceTotalRecords(
            typeof data.deviceTotalRecords === "number"
              ? data.deviceTotalRecords
              : data.totalStoredLogs || 0
          );
          if (data.deviceOverview) setDeviceOverview(data.deviceOverview);
          if (data.scannerOverview !== undefined) setScannerOverview(data.scannerOverview);
          setLatestScanTimestamp(data.latestScanTimestamp || null);
          setLastSyncedAt(data.lastSyncedAt || null);
          setLastMysqlSyncedAt(data.lastMysqlSyncedAt || null);
          setAvailableDates(data.availableDates || []);
          setAvailableMonths(data.availableMonths || []);
          if (data.remoteSyncRequest !== undefined) {
            setRemoteSyncRequest(data.remoteSyncRequest || null);
          }
          if (data.dataSource) setDataSource(data.dataSource);
          if (typeof data.isCloudServer === "boolean") setIsCloudServer(data.isCloudServer);
          if (typeof data.canSyncFromScanner === "boolean") {
            setCanSyncFromScanner(data.canSyncFromScanner);
          }
          if (typeof data.totalPages === "number") setTotalPages(data.totalPages);
          if (data.summaryStats) setServerSummaryStats(data.summaryStats);
          if (data.mysqlConfig) setMysqlConfig(data.mysqlConfig);
          if (data.mysqlStatus) setMysqlStatus(data.mysqlStatus);
          if (data.supabaseStatus) setSupabaseStatus(data.supabaseStatus);
          if (data.setupSql) setSetupSql(data.setupSql);
          if (data.mappings) setMappings(data.mappings);
          if (Array.isArray(data.systemUsers)) setSystemUsers(data.systemUsers);
          if (data.scannerUidStats) setScannerUidStats(data.scannerUidStats);
          if (data.authorizedEditors) {
            setAuthorizedEditors(data.authorizedEditors);
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem(
                  "smartmso_attendance_editors",
                  JSON.stringify(data.authorizedEditors)
                );
                window.dispatchEvent(
                  new CustomEvent("smartmso:attendance_editors_updated", {
                    detail: data.authorizedEditors,
                  })
                );
              } catch {}
            }
          }

          // ซิงก์จากเครื่องสแกนอัตโนมัติครั้งแรกเฉพาะเมื่อยังไม่มีข้อมูลทั้ง Local และ Cloud Supabase และผู้ใช้มีสิทธิ์
          const hasCloudData = Boolean(
            data.supabaseStatus?.ready && (data.supabaseStatus?.count || 0) > 0
          );
          const userCanSync =
            currentUserRole === "admin" ||
            (Array.isArray(data.authorizedEditors) &&
              currentUser &&
              data.authorizedEditors.some(
                (ed: AuthorizedAttendanceEditor) =>
                  ed.memberId === currentUser.id ||
                  ed.memberName.trim() === currentUser.name.trim()
              ));
          if (
            opts?.autoSyncIfEmpty &&
            userCanSync &&
            data.dataSource === "local" &&
            (data.totalStoredLogs || 0) === 0 &&
            !hasCloudData
          ) {
            await handleSyncFromDevice(1500, true);
          }
        }
      } catch (err) {
        if (seq === fetchSeqRef.current) {
          console.error("Failed to fetch attendance:", err);
        }
      } finally {
        if (seq === fetchSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [dateFrom, dateTo, selectedScannerUid, selectedIoMode, debouncedSearchText, page, pageSize]
  );

  useEffect(() => {
    if (!didInitialFetchRef.current) {
      didInitialFetchRef.current = true;
      fetchAttendanceData({ autoSyncIfEmpty: true, checkHardware: true });
      return;
    }
    fetchAttendanceData();
  }, [fetchAttendanceData]);

  const isRemoteSyncActive = Boolean(
    remoteSyncRequest &&
      (remoteSyncRequest.state === "pending" ||
        remoteSyncRequest.state === "running")
  );

  // Polling สถานะ Remote Sync Queue เมื่อสั่งซิงก์จากหน้าเว็บ Cloud/Vercel
  useEffect(() => {
    if (!isRemoteSyncActive || !remoteSyncRequest) return;
    let cancelled = false;
    const startedPollAt = Date.now();

    const interval = setInterval(async () => {
      if (cancelled) return;
      if (Date.now() - startedPollAt > 60000) {
        setRemoteSyncTimedOut(true);
        clearInterval(interval);
        return;
      }
      try {
        const res = await fetch("/api/attendance?checkRemoteSync=1");
        const data = await res.json();
        if (cancelled || !data.success || !data.remoteSyncRequest) return;
        const latest: RemoteSyncRequestInfo = data.remoteSyncRequest;
        setRemoteSyncRequest(latest);
        if (latest.state === "completed") {
          clearInterval(interval);
          setRemoteSyncTimedOut(false);
          const added = latest.result?.addedCount ?? 0;
          const pulled = latest.result?.pulledCount ?? 0;
          showToast(
            `ซิงก์จากเครื่องสำนักงานสำเร็จ! ดึง ${pulled.toLocaleString()} รายการ (เพิ่มใหม่ ${added.toLocaleString()} รายการ)`
          );
          await fetchAttendanceData({ customPage: 1 });
        } else if (latest.state === "failed") {
          clearInterval(interval);
          setRemoteSyncTimedOut(false);
          showToast(`ซิงก์ระยะไกลไม่สำเร็จ: ${latest.error || "ไม่ทราบสาเหตุ"}`);
        }
      } catch {}
    }, 2500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isRemoteSyncActive, remoteSyncRequest?.requestId, fetchAttendanceData, showToast]);

  // ซิงก์ข้อมูลจากเครื่องสแกนลายนิ้วมือ HIP CMi681S
  const handleSyncFromDevice = async (limit = syncLimit, silent = false) => {
    try {
      setSyncing(true);
      setRemoteSyncTimedOut(false);
      if (!silent) {
        showToast(
          isCloudServer || !canSyncFromScanner
            ? "กำลังส่งคำสั่งซิงก์ไปยังเครื่องสำนักงาน (Remote Queue)..."
            : `กำลังเชื่อมต่อเครื่องสแกน HIP CMi681S (${mysqlConfig.scannerIp}:${mysqlConfig.scannerPort})...`
        );
      }
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync_device",
          limitLatest: limit,
          actorId: currentUser?.id,
          actorRole: currentUserRole,
          actorName: currentUser?.name || "ผู้ดูแลระบบ",
        }),
      });
      const data = await res.json();
      if (data.success && data.queued) {
        if (data.remoteSyncRequest) {
          setRemoteSyncRequest(data.remoteSyncRequest);
        }
        showToast(
          data.deduplicated
            ? "มีคำสั่งซิงก์รออยู่ในคิวแล้ว กำลังรอเครื่องสำนักงานดำเนินการ..."
            : "ส่งคำสั่งซิงก์เข้าคิวแล้ว กำลังรอเครื่องสำนักงานดึงข้อมูลจากเครื่องสแกน..."
        );
      } else if (data.success) {
        addAuditLog(
          currentUser?.name || "ผู้ดูแลระบบ",
          "ซิงก์ข้อมูลเวลาปฏิบัติราชการจากเครื่องสแกน HIP CMi681S",
          `ดึงข้อมูล ${data.pulledCount.toLocaleString()} รายการ (เพิ่มใหม่ ${data.mergeResult.addedCount.toLocaleString()} รายการ)`,
          "success"
        );
        const mysqlMsg = data.mysqlSync?.synced
          ? `และบันทึกลง Synology MySQL (${data.mysqlSync.upsertedLogs.toLocaleString()} รายการ) สำเร็จ`
          : `(บันทึกในระบบแคช/Cloud เรียบร้อย)`;
        showToast(
          `ซิงก์สำเร็จ! ดึงข้อมูล ${data.pulledCount.toLocaleString()} รายการ (เพิ่มใหม่ ${data.mergeResult.addedCount.toLocaleString()} รายการ) ${mysqlMsg}`
        );
        await fetchAttendanceData({ customPage: 1, checkHardware: true });
      } else {
        showToast(`ซิงก์ข้อมูลไม่สำเร็จ: ${data.error || "ไม่ทราบสาเหตุ"}`);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      showToast(`เกิดข้อผิดพลาดในการซิงก์: ${e.message || ""}`);
    } finally {
      setSyncing(false);
    }
  };

  // เปิด Modal เพิ่มรายการใหม่
  const handleOpenAddModal = () => {
    const defaultDate = availableDates[0] || getTodayThaiDate();
    setEditingLog(null);
    setLogForm({
      scannerUserId: 1,
      scanDate: defaultDate,
      scanTime: "08:30:00",
      ioMode: 1,
      verifyMode: 9,
      editNote: "เพิ่มข้อมูลเวลาเข้า-ออกงาน (ลืมสแกนนิ้ว/ปฏิบัติราชการนอกสถานที่)",
    });
    setShowLogModal(true);
  };

  // เปิด Modal แก้ไขรายการ
  const handleOpenEditModal = (item: AttendanceLogItem) => {
    setEditingLog(item);
    const [d, t] = item.scanTimestamp.split(" ");
    setLogForm({
      scannerUserId: item.scannerUserId,
      scanDate: d || getTodayThaiDate(),
      scanTime: t || "08:30:00",
      ioMode: item.ioMode,
      verifyMode: item.verifyMode,
      editNote: item.editNote || "ปรับปรุงเวลาปฏิบัติราชการ",
    });
    setShowLogModal(true);
  };

  // บันทึกการเพิ่มหรือแก้ไขรายการลงเวลา
  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditAttendance) {
      showToast("คุณไม่มีสิทธิ์ในการแก้ไขข้อมูลเวลาปฏิบัติราชการ");
      return;
    }

    const actorName = currentUser?.name || "ผู้ดูแลระบบ (Admin)";
    const payload = editingLog
      ? {
          action: "update_log",
          id: editingLog.id,
          ...logForm,
          actorId: currentUser?.id,
          actorRole: currentUserRole,
          actorName,
        }
      : {
          action: "add_log",
          ...logForm,
          actorId: currentUser?.id,
          actorRole: currentUserRole,
          actorName,
        };

    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      addAuditLog(
        actorName,
        editingLog ? "แก้ไขเวลาปฏิบัติราชการ" : "เพิ่มรายการเวลาปฏิบัติราชการ",
        `${data.item?.memberName} (${data.item?.scanTimestamp}) - ${logForm.editNote}`,
        "success"
      );
      showToast(
        editingLog
          ? "บันทึกการแก้ไขเวลาเข้า-ออกงานเรียบร้อยแล้ว"
          : "เพิ่มรายการเวลาเข้า-ออกงานใหม่เรียบร้อยแล้ว"
      );
      setShowLogModal(false);
      await fetchAttendanceData();
    } else {
      showToast(`เกิดข้อผิดพลาด: ${data.error}`);
    }
  };

  // ยืนยันการลบรายการลงเวลา
  const handleConfirmDelete = async () => {
    if (!deletingLog || !canEditAttendance) return;
    const actorName = currentUser?.name || "ผู้ดูแลระบบ (Admin)";
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete_log",
        id: deletingLog.id,
        actorId: currentUser?.id,
        actorRole: currentUserRole,
        actorName,
        editNote: deleteReason,
      }),
    });
    const data = await res.json();
    if (data.success) {
      addAuditLog(
        actorName,
        "ลบรายการลงเวลาปฏิบัติราชการ",
        `${deletingLog.memberName} (${deletingLog.scanTimestamp}) - เหตุผล: ${deleteReason}`,
        "success"
      );
      showToast("ลบรายการลงเวลาเรียบร้อยแล้ว");
      setDeletingLog(null);
      await fetchAttendanceData();
    } else {
      showToast(`ลบไม่สำเร็จ: ${data.error}`);
    }
  };

  const effectiveUsersList = useMemo<SystemUserOption[]>(() => {
    if (systemUsers.length > 0) return systemUsers;
    return members.map((m) => ({
      id: m.id,
      name: m.name,
      nickname: null,
      division: m.division,
      position: m.position,
      role: m.role,
      status: "active",
    }));
  }, [systemUsers, members]);

  const myMappedScannerUid = useMemo(() => {
    if (!currentUser) return null;
    const match = Object.values(mappings).find(
      (m) =>
        m.userId === currentUser.id ||
        m.memberId === currentUser.id ||
        (m.memberName && m.memberName.trim() === currentUser.name.trim())
    );
    return match ? match.scannerUserId : null;
  }, [mappings, currentUser]);

  // บันทึกการจับคู่รหัสสแกนนิ้ว (User ID) กับชื่อบุคลากร
  const handleSelectMappingUid = (uid: number) => {
    setEditingMappingUid(uid);
    const current = mappings[uid];
    if (current) {
      setMappingForm({
        userId: current.userId || "",
        memberId: current.memberId,
        memberName: current.memberName,
        division: current.division,
        position: current.position,
      });
    } else {
      setMappingForm({
        userId: "",
        memberId: `scanner_uid_${uid}`,
        memberName: `บุคลากร พมจ. (รหัสสแกน #${uid})`,
        division: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
        position: "เจ้าหน้าที่ปฏิบัติงาน",
      });
    }
  };

  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingMapping) return;
    try {
      setSavingMapping(true);
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_mapping",
          scannerUserId: editingMappingUid,
          userId: mappingForm.userId || null,
          memberId: mappingForm.memberId,
          memberName: mappingForm.memberName,
          division: mappingForm.division,
          position: mappingForm.position,
          matchMethod: "manual",
          actorId: currentUser?.id,
          actorRole: currentUserRole,
          actorName: currentUser?.name || "ผู้ดูแลระบบ",
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(
          `อัปเดตชื่อรหัสสแกน #${editingMappingUid} เป็น "${mappingForm.memberName}" เรียบร้อยแล้ว`
        );
        await fetchAttendanceData();
      } else {
        showToast(`บันทึกไม่สำเร็จ: ${data.error}`);
      }
    } finally {
      setSavingMapping(false);
    }
  };

  const handleAutoMatchMappings = () => {
    const stripHonorific = (raw: string) =>
      raw
        .replace(/^(นางสาว|นาย|นาง|ดร\.|ผศ\.)\s*/g, "")
        .trim()
        .toLowerCase();

    const nextDrafts: Record<
      number,
      { userId: string; matchMethod: "manual" | "auto_name" }
    > = { ...draftUserMappings };
    let matchedCount = 0;

    for (let uid = 1; uid <= 64; uid++) {
      const m = mappings[uid];
      if (!m || m.userId) continue;
      const rawName = (m.memberName || "").trim();
      if (!rawName || rawName.startsWith("บุคลากร พมจ.")) continue;
      const cleanName = stripHonorific(rawName);
      if (!cleanName) continue;

      const found = effectiveUsersList.find((u) => {
        const uClean = stripHonorific(u.name);
        const uFirst = uClean.split(/\s+/)[0] || "";
        const uNick = (u.nickname || "").trim().toLowerCase();
        return (
          uClean === cleanName ||
          uFirst === cleanName ||
          (uNick && uNick === cleanName) ||
          uClean.includes(cleanName)
        );
      });

      if (found) {
        nextDrafts[uid] = { userId: found.id, matchMethod: "auto_name" };
        matchedCount++;
      }
    }

    setDraftUserMappings(nextDrafts);
    if (matchedCount > 0) {
      showToast(
        `พบคู่ที่ตรงกับผู้ใช้ระบบ ${matchedCount} รายการ — กด "บันทึกทั้งหมดที่เลือก" เพื่อยืนยัน`
      );
    } else {
      showToast("ไม่พบชื่อที่ตรงกับผู้ใช้ระบบเพิ่มเติม กรุณาเลือกจากรายการด้านล่าง");
    }
  };

  const handleSaveMappingsBatch = async () => {
    const entries = Object.entries(draftUserMappings);
    if (entries.length === 0 || savingMapping) return;
    try {
      setSavingMapping(true);
      const payload = entries
        .map(([uidStr, draft]) => {
          const uid = Number(uidStr);
          const u = effectiveUsersList.find((item) => item.id === draft.userId);
          if (!u) return null;
          return {
            scannerUserId: uid,
            userId: u.id,
            memberId: u.id,
            memberName: u.name,
            division: u.division,
            position: u.position,
            matchMethod: draft.matchMethod,
          };
        })
        .filter(Boolean);

      if (payload.length === 0) return;
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_mappings_batch",
          mappings: payload,
          actorId: currentUser?.id,
          actorRole: currentUserRole,
          actorName: currentUser?.name || "ผู้ดูแลระบบ",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDraftUserMappings({});
        showToast(`บันทึกการจับคู่สำเร็จ ${data.updatedCount} รหัสสแกน และอัปเดตประวัติการสแกนแล้ว`);
        await fetchAttendanceData();
      } else {
        showToast(`บันทึกไม่สำเร็จ: ${data.error}`);
      }
    } finally {
      setSavingMapping(false);
    }
  };

  const handleUnmapUid = async (uid: number) => {
    if (savingMapping) return;
    try {
      setSavingMapping(true);
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "unmap_scanner_uid",
          scannerUserId: uid,
          actorId: currentUser?.id,
          actorRole: currentUserRole,
          actorName: currentUser?.name || "ผู้ดูแลระบบ",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setDraftUserMappings((prev) => {
          const copy = { ...prev };
          delete copy[uid];
          return copy;
        });
        showToast(`ยกเลิกการจับคู่รหัสสแกน #${uid} แล้ว`);
        await fetchAttendanceData();
      } else {
        showToast(`ยกเลิกไม่สำเร็จ: ${data.error}`);
      }
    } finally {
      setSavingMapping(false);
    }
  };

  // สลับสิทธิ์การเป็นผู้แก้ไขเวลา (Authorized Editors)
  const handleToggleEditorMember = async (member: {
    id: string;
    name: string;
    division: string;
    role: string;
  }) => {
    if (savingEditors) return;
    const exists = authorizedEditors.some((ed) => ed.memberId === member.id);
    const nextEditors = exists
      ? authorizedEditors.filter((ed) => ed.memberId !== member.id)
      : [
          ...authorizedEditors,
          {
            memberId: member.id,
            memberName: member.name,
            division: member.division,
            role: member.role,
            grantedBy: currentUser?.name || "ผู้ดูแลระบบ",
            grantedAt: new Date().toISOString(),
          },
        ];

    try {
      setSavingEditors(true);
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_editors",
          editors: nextEditors,
          actorId: currentUser?.id,
          actorRole: currentUserRole,
          actorName: currentUser?.name || "ผู้ดูแลระบบ",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAuthorizedEditors(nextEditors);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("smartmso_attendance_editors", JSON.stringify(nextEditors));
            window.dispatchEvent(
              new CustomEvent("smartmso:attendance_editors_updated", {
                detail: nextEditors,
              })
            );
          } catch {}
        }
        addAuditLog(
          currentUser?.name || "ผู้ดูแลระบบ",
          "ปรับปรุงสิทธิ์ผู้จัดการข้อมูลลงเวลาราชการ",
          `${exists ? "ยกเลิกสิทธิ์" : "มอบสิทธิ์แก้ไขเวลาให้"} ${member.name}`,
          "success"
        );
        showToast(
          exists
            ? `ยกเลิกสิทธิ์การแก้ไขเวลาของ ${member.name} แล้ว`
            : `มอบสิทธิ์การแก้ไขเวลาเข้า-ออกงานให้ ${member.name} เรียบร้อยแล้ว`
        );
      } else {
        showToast(`เกิดข้อผิดพลาด: ${data.error}`);
      }
    } finally {
      setSavingEditors(false);
    }
  };

  // ทดสอบและบันทึกการตั้งค่า MySQL บน Synology NAS
  const handleSaveAndTestMysql = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setTestingMysql(true);
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_mysql_config",
          mysqlConfig,
          actorId: currentUser?.id,
          actorRole: currentUserRole,
          actorName: currentUser?.name || "ผู้ดูแลระบบ",
        }),
      });
      const data = await res.json();
      if (data.mysqlStatus) {
        setMysqlStatus(data.mysqlStatus);
      }
      if (data.mysqlConfig) {
        setMysqlConfig(data.mysqlConfig);
      }
      if (data.setupSql) {
        setSetupSql(data.setupSql);
      }
      if (data.mysqlStatus?.connected) {
        showToast(
          `เชื่อมต่อ Synology MariaDB (${mysqlConfig.host}:${mysqlConfig.port}) และซิงก์ตารางสำเร็จ!`
        );
        await fetchAttendanceData();
      } else {
        showToast(
          `ยังไม่สามารถเข้าถึง MySQL: ${data.mysqlStatus?.errorMessage || data.error || "กรุณาตรวจสอบสิทธิ์ Host ใน phpMyAdmin"}`
        );
      }
    } finally {
      setTestingMysql(false);
    }
  };

  // ส่งออกไฟล์ CSV
  const handleExportCsv = () => {
    const headers = [
      "ลำดับ",
      "รหัสสแกน (User ID)",
      "ชื่อ-นามสกุล",
      "กลุ่มงาน/ฝ่าย",
      "วัน-เวลาที่สแกน",
      "เดือน/ปี (พ.ศ.)",
      "ปีงบประมาณ",
      "เวลาเดิมก่อนแก้ไข",
      "ประเภท (เข้า/ออก)",
      "วิธีบันทึก",
      "สถานะการแก้ไข",
      "ผู้แก้ไข",
      "หมายเหตุ",
    ];
    const csvCell = (val: string | number | null | undefined): string => {
      const str = val === null || val === undefined ? "" : String(val);
      const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    const rows = logs.map((l, idx) => {
      const period = getThaiFiscalPeriod(l.scanTimestamp);
      return [
        idx + 1,
        l.scannerUserId,
        csvCell(l.memberName),
        csvCell(l.division || ""),
        csvCell(l.scanTimestamp),
        csvCell(period.monthYearLabel),
        csvCell(period.fiscalLabel),
        csvCell(l.originalTimestamp),
        csvCell(l.ioLabel || getAttendanceIoLabel(l.ioMode)),
        csvCell(l.verifyLabel),
        csvCell(l.isEdited ? "แก้ไขแล้ว" : "ต้นฉบับจากเครื่องสแกน"),
        csvCell(l.editedBy || "-"),
        csvCell(l.editNote || "-"),
      ];
    });

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const fileSuffix = selectedFiscalMonth
      ? `fy${getThaiFiscalPeriod(`${selectedFiscalMonth}-01`).fiscalYear}-${selectedFiscalMonth}`
      : selectedFiscalYear
      ? `fy${selectedFiscalYear}`
      : dateFrom || "all";
    a.download = `attendance-smart-mso-${fileSuffix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("ดาวน์โหลดไฟล์ CSV สรุปเวลาปฏิบัติราชการเรียบร้อยแล้ว");
  };

  // สรุปตัวเลขสถิติจากรายการที่กรอง (ทั้ง 4 ช่วงเวลาตามระเบียบราชการ)
  const summaryStats = useMemo(() => {
    let checkInOnTime = 0;
    let checkOut = 0;
    let lateOrLeave = 0;
    let midDay = 0;
    let edited = 0;
    for (const item of logs) {
      if (item.ioMode === 1) {
        checkInOnTime++;
      } else if (item.ioMode === 2) {
        checkOut++;
      } else if (item.ioMode === 3) {
        lateOrLeave++;
      } else if (item.ioMode === 4) {
        midDay++;
      }
      if (item.isEdited) edited++;
    }
    const checkInTotal = checkInOnTime + lateOrLeave;
    return {
      checkInOnTime,
      checkOut,
      lateOrLeave,
      midDay,
      checkInTotal,
      edited,
      checkIn: checkInTotal,
      lateCount: lateOrLeave,
      lateCountIsApprox: false,
    };
  }, [logs]);

  const effectiveSummaryStats = useMemo(() => {
    const s = serverSummaryStats || summaryStats;
    const lateOrLeave = s.lateOrLeave ?? s.lateCount ?? 0;
    const checkInOnTime =
      s.checkInOnTime ?? Math.max(0, (s.checkIn || 0) - lateOrLeave);
    const midDay = s.midDay ?? 0;
    const checkOut = s.checkOut ?? 0;
    const edited = s.edited ?? 0;
    return {
      checkInOnTime,
      lateOrLeave,
      midDay,
      checkOut,
      edited,
      checkInTotal: s.checkInTotal ?? checkInOnTime + lateOrLeave,
    };
  }, [serverSummaryStats, summaryStats]);

  const fiscalYearGroups = useMemo(
    () => groupMonthsByFiscalYear(availableMonths),
    [availableMonths]
  );

  const visibleFiscalMonthOptions = useMemo(() => {
    const groups = selectedFiscalYear
      ? fiscalYearGroups.filter((g) => String(g.fiscalYear) === selectedFiscalYear)
      : fiscalYearGroups;
    return groups.flatMap((group) =>
      group.months.map((ym) => {
        const period = getThaiFiscalPeriod(`${ym}-01`);
        return {
          yearMonth: ym,
          fiscalYear: group.fiscalYear,
          label: `${period.monthShort} ${period.calendarYearBE} (เดือน ${period.fiscalMonthOrder}/12 • ปีงบ ${group.fiscalYear})`,
        };
      })
    );
  }, [fiscalYearGroups, selectedFiscalYear]);

  const activeFiscalSummaryText = useMemo(() => {
    if (selectedFiscalMonth) {
      const p = getThaiFiscalPeriod(`${selectedFiscalMonth}-01`);
      return `${p.monthFull} ${p.calendarYearBE} (ปีงบประมาณ ${p.fiscalYear} • ไตรมาส ${p.quarter})`;
    }
    if (selectedFiscalYear) {
      const fy = Number(selectedFiscalYear);
      const startShort = (fy - 1) % 100;
      const endShort = fy % 100;
      return `ปีงบประมาณ ${fy} (ต.ค. ${String(startShort).padStart(2, "0")} – ก.ย. ${String(endShort).padStart(2, "0")})`;
    }
    if (dateFrom && dateTo && dateFrom === dateTo) {
      const p = getThaiFiscalPeriod(dateFrom);
      return `${p.dateShortBE} (ปีงบประมาณ ${p.fiscalYear} • ไตรมาส ${p.quarter})`;
    }
    if (dateFrom && dateTo) {
      return `${getThaiFiscalPeriod(dateFrom).dateShortBE} – ${getThaiFiscalPeriod(dateTo).dateShortBE}`;
    }
    if (dateFrom) {
      return `ตั้งแต่ ${getThaiFiscalPeriod(dateFrom).dateShortBE}`;
    }
    if (dateTo) {
      return `ถึง ${getThaiFiscalPeriod(dateTo).dateShortBE}`;
    }
    return null;
  }, [selectedFiscalMonth, selectedFiscalYear, dateFrom, dateTo]);

  return (
    <div className="space-y-6 pb-12">
      <div>
        {/* ส่วนหัวเพจ (Hero Header) */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-500/20">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">⏱️</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 border border-indigo-400/40 text-indigo-200">
                  HIP CMi681S ↔ Synology NAS ↔ Supabase Cloud
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    dataSource === "supabase"
                      ? "bg-sky-500/20 border-sky-400/40 text-sky-200"
                      : "bg-slate-800/70 border-slate-600 text-slate-200"
                  }`}
                >
                  {dataSource === "supabase"
                    ? "☁️ โหมด Cloud Replica (Supabase)"
                    : "🏢 โหมด Local / NAS On-Premise"}
                </span>
                {canEditAttendance ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                    ✓ สิทธิ์จัดการเวลา (เพิ่ม/แก้ไข/ลบได้)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 border border-amber-400/40 text-amber-200">
                    โหมดเรียกดู (เฉพาะผู้ได้รับสิทธิ์จึงแก้ไขได้)
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold mt-2">
                ระบบจัดการข้อมูลลงเวลาปฏิบัติราชการ (Attendance Management)
              </h1>
              <p className="text-sm text-slate-300 mt-1">
                ซิงก์ข้อมูลสแกนลายนิ้วมือโดยตรงจากเครื่อง{" "}
                <span className="font-mono text-indigo-300">
                  HIP CMi681S ({mysqlConfig.scannerIp}:{mysqlConfig.scannerPort})
                </span>{" "}
                จัดเก็บลงฐานข้อมูล{" "}
                <span className="font-mono text-emerald-300">
                  MariaDB บน Synology NAS ({mysqlConfig.host}:{mysqlConfig.port})
                </span>{" "}
                และสำรองข้อมูลขึ้น{" "}
                <span className="font-mono text-sky-300">Supabase Cloud</span> แบบ Realtime Hybrid
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-xl overflow-hidden">
                <select
                  value={syncLimit}
                  onChange={(e) => setSyncLimit(Number(e.target.value))}
                  className="bg-transparent text-xs text-slate-200 px-3 py-2.5 border-r border-slate-700 focus:outline-none"
                  title="เลือกระยะจำนวนรายการที่จะดึงจากเครื่องสแกน"
                >
                  <option value={500} className="bg-slate-900">
                    ดึง 500 รายการล่าสุด (~1 วินาที)
                  </option>
                  <option value={1500} className="bg-slate-900">
                    ดึง 1,500 รายการล่าสุด (~2 วินาที)
                  </option>
                  <option value={5000} className="bg-slate-900">
                    ดึง 5,000 รายการล่าสุด (~4 วินาที)
                  </option>
                  <option value={0} className="bg-slate-900">
                    ดึงทั้งหมด{" "}
                    {deviceTotalRecords > 0
                      ? `${deviceTotalRecords.toLocaleString()} `
                      : ""}
                    รายการ (~18 วินาที)
                  </option>
                </select>
                <button
                  onClick={() => handleSyncFromDevice(syncLimit)}
                  disabled={syncing || isRemoteSyncActive || !canEditAttendance}
                  title={
                    !canEditAttendance
                      ? "เฉพาะผู้ดูแลระบบหรือผู้ได้รับสิทธิ์แก้ไขเวลาจึงสามารถซิงก์จากเครื่องสแกนได้"
                      : isCloudServer || !canSyncFromScanner
                      ? "ส่งคำสั่งซิงก์ระยะไกลผ่าน Supabase Queue ให้เครื่องสำนักงานดึงข้อมูลจากเครื่องสแกน"
                      : `ซิงก์ข้อมูลจาก ${mysqlConfig.scannerIp}`
                  }
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
                >
                  <span>{syncing || isRemoteSyncActive ? "⏳" : isCloudServer || !canSyncFromScanner ? "☁️" : "🔄"}</span>
                  <span>
                    {syncing
                      ? "กำลังส่งคำสั่งซิงก์..."
                      : isRemoteSyncActive
                      ? remoteSyncRequest?.state === "running"
                        ? "เครื่องสำนักงานกำลังซิงก์..."
                        : "รอเครื่องสำนักงานรับคำสั่ง..."
                      : isCloudServer || !canSyncFromScanner
                      ? "สั่งซิงก์จากเครื่องสแกน (Remote)"
                      : `ซิงก์ข้อมูลจาก ${mysqlConfig.scannerIp}`}
                  </span>
                </button>
              </div>

              {canEditAttendance && (
                <button
                  onClick={handleOpenAddModal}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg transition cursor-pointer"
                >
                  <span>➕</span>
                  <span>เพิ่มเวลาเข้า-ออกงาน</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* แบนเนอร์สถานะ Remote Sync Queue (เมื่อสั่งซิงก์จาก Cloud/Vercel) */}
        {(isRemoteSyncActive || remoteSyncTimedOut) && (
          <div
            className={`mt-4 rounded-2xl p-3.5 border text-xs flex flex-wrap items-center justify-between gap-3 ${
              remoteSyncTimedOut
                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200"
                : "bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{remoteSyncTimedOut ? "⚠️" : "⏳"}</span>
              <span>
                {remoteSyncTimedOut
                  ? "คำสั่งซิงก์ยังรออยู่ในคิว (เกิน 60 วินาที) — กรุณาตรวจสอบว่าเครื่องในสำนักงานรันคำสั่ง npm run sync:attendance:worker อยู่"
                  : remoteSyncRequest?.state === "running"
                  ? `เครื่องสำนักงาน (${remoteSyncRequest.workerHost || "LAN Worker"}) กำลังดึงข้อมูลจากเครื่องสแกนและอัปเดตทั้ง 3 ฐานข้อมูล...`
                  : "ส่งคำสั่งซิงก์เข้าคิว Supabase แล้ว กำลังรอเครื่องสำนักงานมารับงาน (ตรวจสอบทุก 5 วินาที)..."}
              </span>
            </div>
            {remoteSyncTimedOut && (
              <button
                type="button"
                onClick={() => fetchAttendanceData({ customPage: 1 })}
                className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold cursor-pointer"
              >
                🔄 รีเฟรชตรวจสอบอีกครั้ง
              </button>
            )}
          </div>
        )}

        {/* การ์ดสถานะ 4 บล็อก */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-4">
          {/* 1. สถานะเครื่องสแกน HIP CMi681S */}
          {(() => {
            const serial =
              scannerOverview?.info?.serialNumber ||
              deviceOverview?.serialNumber ||
              "-";
            const usersCnt =
              scannerOverview?.status?.registeredUsersCount ??
              deviceOverview?.registeredUsersCount;
            const fpCnt =
              scannerOverview?.status?.fingerprintsCount ??
              deviceOverview?.fingerprintsCount;
            const unsyncedDiff =
              !isCloudServer &&
              canSyncFromScanner &&
              deviceTotalRecords > totalStoredLogs
                ? deviceTotalRecords - totalStoredLogs
                : 0;

            return (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase">
                    เครื่องสแกนลายนิ้วมือ
                  </span>
                  <div className="flex items-center gap-1.5">
                    {!isCloudServer && (
                      <button
                        type="button"
                        onClick={() =>
                          fetchAttendanceData({ checkHardware: true })
                        }
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-500 underline cursor-pointer"
                        title="ตรวจสอบยอดล่าสุดจากเครื่องสแกนจริง"
                      >
                        เช็คยอด
                      </button>
                    )}
                    <span
                      className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${
                        scannerOverview?.info
                          ? "bg-emerald-100 text-emerald-700"
                          : isCloudServer
                          ? "bg-sky-100 text-sky-700"
                          : scannerOverview?.error
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {scannerOverview?.info
                        ? `● Online (TCP ${mysqlConfig.scannerPort})`
                        : isCloudServer
                        ? "☁️ ดูผ่าน Cloud (ซิงก์บน LAN)"
                        : scannerOverview?.error
                        ? "⚠️ ไม่พบเครื่องใน LAN"
                        : `● Ready (TCP ${mysqlConfig.scannerPort})`}
                    </span>
                  </div>
                </div>
                <div className="mt-2 font-bold text-slate-900 dark:text-white text-base">
                  HIP CMi681S ({mysqlConfig.scannerIp})
                </div>
                <div className="mt-1 text-xs text-slate-500 space-y-0.5">
                  <div>
                    Serial: <span className="font-mono font-medium">{serial}</span>{" "}
                    | บัญชี:{" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {typeof usersCnt === "number"
                        ? `${usersCnt.toLocaleString()} คน (${(
                            fpCnt ?? 0
                          ).toLocaleString()} ลายนิ้วมือ)`
                        : "รอดึงข้อมูล"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span>
                      {isCloudServer
                        ? "ยอดในเครื่อง (ณ เวลาซิงก์ล่าสุด):"
                        : "บันทึกในเครื่องทั้งหมด:"}{" "}
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {deviceTotalRecords > 0
                          ? `${deviceTotalRecords.toLocaleString()} รายการ`
                          : "-"}
                      </span>
                    </span>
                    {unsyncedDiff > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-bold">
                        +{unsyncedDiff.toLocaleString()} ยังไม่ซิงก์
                      </span>
                    )}
                  </div>
                  {latestScanTimestamp && (
                    <div className="text-[11px] text-slate-400">
                      สแกนล่าสุดในฐานข้อมูล:{" "}
                      <span className="font-mono text-slate-600 dark:text-slate-300">
                        {latestScanTimestamp} น.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 2. สถานะฐานข้อมูล Synology NAS MySQL & Supabase Cloud */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                ฐานข้อมูล Hybrid (NAS + Cloud)
              </span>
              {mysqlStatus?.connected ? (
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-100 text-emerald-700">
                  ● NAS MySQL สำเร็จ
                </span>
              ) : mysqlStatus?.errorCode === "CLOUD_LAN_UNREACHABLE" ? (
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-sky-100 text-sky-700">
                  ☁️ Cloud Replica
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-100 text-amber-800">
                  ⚠️ รอเปิดสิทธิ์ NAS
                </span>
              )}
            </div>
            <div className="mt-2 font-bold text-slate-900 dark:text-white text-base flex items-center justify-between">
              <span className="truncate">
                {mysqlConfig.host}:{mysqlConfig.port}
              </span>
              {currentUserRole === "admin" && (
                <button
                  onClick={() => setShowMysqlModal(true)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 underline cursor-pointer shrink-0 ml-2"
                >
                  ตั้งค่า MySQL
                </button>
              )}
            </div>
            <div className="mt-1 text-xs text-slate-500 flex items-center justify-between gap-2">
              <span className="truncate">
                NAS:{" "}
                <strong className="text-slate-700 dark:text-slate-300">
                  {mysqlStatus?.connected && typeof mysqlStatus.rowCount === "number"
                    ? `${mysqlStatus.rowCount.toLocaleString()} รายการ`
                    : mysqlStatus?.errorCode === "CLOUD_LAN_UNREACHABLE"
                    ? "โหมด Cloud"
                    : "ยังไม่ซิงก์"}
                </strong>
              </span>
              {supabaseStatus?.ready ? (
                <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                  ☁️ Supabase: {supabaseStatus.count.toLocaleString()} รายการ
                </span>
              ) : (
                <span className="text-[11px] text-rose-500">☁️ Cloud ไม่พร้อม</span>
              )}
            </div>
          </div>

          {/* 3. สถิติรายการตามตัวกรอง */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                สถิติรายการตามตัวกรอง
              </span>
              <div className="flex items-center gap-2">
                {effectiveSummaryStats.midDay > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-semibold"
                    title="สแกนช่วงระหว่างวัน 12:01-16:29 น. หรือ 00:00-04:59 น."
                  >
                    ระหว่างวัน {effectiveSummaryStats.midDay.toLocaleString()}
                  </span>
                )}
                <span className="text-xs font-bold text-indigo-600">
                  {filteredTotal.toLocaleString()} รายการ
                </span>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5 mt-2.5 text-center">
              <div
                className="bg-emerald-50 dark:bg-emerald-950/40 rounded-xl p-1.5"
                title="สแกนเข้างานตรงเวลา 05:00 - 08:30:59 น."
              >
                <div className="text-[10px] text-emerald-700 dark:text-emerald-300">
                  เข้าเช้าปกติ
                </div>
                <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  {effectiveSummaryStats.checkInOnTime.toLocaleString()}
                </div>
              </div>
              <div
                className="bg-rose-50 dark:bg-rose-950/40 rounded-xl p-1.5"
                title="สแกนระหว่าง 08:31 - 12:00:59 น. (มาสาย หรือ ลาครึ่งเช้า)"
              >
                <div className="text-[10px] text-rose-700 dark:text-rose-300">
                  สาย / อาจลา
                </div>
                <div className="text-sm font-bold text-rose-700 dark:text-rose-300">
                  {effectiveSummaryStats.lateOrLeave.toLocaleString()}
                </div>
              </div>
              <div
                className="bg-blue-50 dark:bg-blue-950/40 rounded-xl p-1.5"
                title="สแกนออกราชการตั้งแต่ 16:30 น. เป็นต้นไป"
              >
                <div className="text-[10px] text-blue-700 dark:text-blue-300">
                  ออกราชการ
                </div>
                <div className="text-sm font-bold text-blue-700 dark:text-blue-300">
                  {effectiveSummaryStats.checkOut.toLocaleString()}
                </div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/40 rounded-xl p-1.5">
                <div className="text-[10px] text-amber-700 dark:text-amber-300">
                  แก้ไขแล้ว
                </div>
                <div className="text-sm font-bold text-amber-700 dark:text-amber-300">
                  {effectiveSummaryStats.edited.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* 4. การจัดการสิทธิ์และการจับคู่รหัสสแกน */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                การตั้งค่าบุคลากร & สิทธิ์แก้ไข
              </span>
              <span
                className="text-[11px] text-slate-400"
                title={
                  lastMysqlSyncedAt
                    ? `ซิงก์ NAS MySQL ล่าสุด: ${new Date(
                        lastMysqlSyncedAt
                      ).toLocaleString("th-TH")}`
                    : undefined
                }
              >
                ซิงก์ล่าสุด:{" "}
                {lastSyncedAt
                  ? new Date(lastSyncedAt).toLocaleString("th-TH", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "-"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                onClick={() => {
                  handleSelectMappingUid(1);
                  setShowMappingModal(true);
                }}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition cursor-pointer"
              >
                👥 จับคู่รหัสสแกน (User ID)
              </button>
              {currentUserRole === "admin" && (
                <button
                  onClick={() => setShowEditorsModal(true)}
                  className="flex-1 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition cursor-pointer"
                >
                  🔐 กำหนดสิทธิ์ผู้แก้ไข ({authorizedEditors.length})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* แจ้งเตือนคำแนะนำการตั้งค่า MySQL บน Synology NAS เฉพาะ Admin เมื่อเชื่อมต่อ LAN ไม่สำเร็จ */}
        {currentUserRole === "admin" &&
          mysqlStatus &&
          !mysqlStatus.connected &&
          mysqlStatus.errorCode !== "CLOUD_LAN_UNREACHABLE" && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
                  <span>🗄️</span>
                  <span>
                    สถานะ MariaDB 10 บน Synology NAS ({mysqlConfig.host}:
                    {mysqlConfig.port})
                  </span>
                </div>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  {mysqlStatus.setupAdvice} — ข้อมูลทั้งหมดที่ซิงก์และแก้ไขถูกสำรองไว้บนระบบเรียบร้อยแล้ว
                  สามารถกด{" "}
                  <strong>&ldquo;คู่มือตั้งค่า & คำสั่ง SQL เปิดสิทธิ์ MySQL บน Synology NAS&rdquo;</strong>{" "}
                  เพื่อทดสอบและตรวจสอบการเชื่อมต่อได้ทันที
                </p>
              </div>
              <button
                onClick={() => setShowMysqlModal(true)}
                className="shrink-0 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow transition cursor-pointer"
              >
                📖 เปิดคู่มือตั้งค่า MySQL บน Synology NAS
              </button>
            </div>
          )}

        {/* แถบตัวกรองและค้นหา (Filter Bar) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 mt-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          {/* แถวตัวกรองปฏิทินปีงบประมาณไทย (ต.ค.–ก.ย.) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                ปีงบประมาณ (ต.ค. – ก.ย.)
              </label>
              <select
                aria-label="ปีงบประมาณ"
                value={selectedFiscalYear}
                onChange={(e) => {
                  const fy = e.target.value;
                  setSelectedFiscalYear(fy);
                  setSelectedFiscalMonth("");
                  if (fy) {
                    const range = getFiscalYearDateRange(Number(fy));
                    setDateFrom(range.dateFrom);
                    setDateTo(range.dateTo);
                  } else {
                    setDateFrom("");
                    setDateTo("");
                  }
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
              >
                <option value="">ทุกปีงบประมาณ</option>
                {fiscalYearGroups.map((g) => {
                  const startShort = String((g.fiscalYear - 1) % 100).padStart(2, "0");
                  const endShort = String(g.fiscalYear % 100).padStart(2, "0");
                  return (
                    <option key={g.fiscalYear} value={String(g.fiscalYear)}>
                      ปีงบ {g.fiscalYear} (ต.ค. {startShort} – ก.ย. {endShort}) • {g.months.length} เดือน
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                เดือน (ปฏิทินปีงบประมาณ)
              </label>
              <select
                aria-label="เดือน (ปฏิทินปีงบประมาณ)"
                value={selectedFiscalMonth}
                onChange={(e) => {
                  const ym = e.target.value;
                  setSelectedFiscalMonth(ym);
                  if (ym) {
                    const period = getThaiFiscalPeriod(`${ym}-01`);
                    const range = getMonthDateRange(ym);
                    setSelectedFiscalYear(String(period.fiscalYear));
                    setDateFrom(range.dateFrom);
                    setDateTo(range.dateTo);
                  } else if (selectedFiscalYear) {
                    const range = getFiscalYearDateRange(Number(selectedFiscalYear));
                    setDateFrom(range.dateFrom);
                    setDateTo(range.dateTo);
                  } else {
                    setDateFrom("");
                    setDateTo("");
                  }
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
              >
                <option value="">ทุกเดือนในระบบ</option>
                {visibleFiscalMonthOptions.map((opt) => (
                  <option key={opt.yearMonth} value={opt.yearMonth}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              {activeFiscalSummaryText ? (
                <div className="w-full px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center justify-between gap-2">
                  <span>📅 {activeFiscalSummaryText}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFiscalYear("");
                      setSelectedFiscalMonth("");
                      setDateFrom("");
                      setDateTo("");
                      setPage(1);
                    }}
                    className="text-[11px] underline text-indigo-600 dark:text-indigo-300 cursor-pointer shrink-0"
                  >
                    แสดงทั้งหมด
                  </button>
                </div>
              ) : (
                <div className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500">
                  📆 แสดงข้อมูลทุกปีงบประมาณ ({availableMonths.length} เดือนที่มีสแกน)
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                ตั้งแต่วันที่ (Date From)
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setSelectedFiscalYear("");
                  setSelectedFiscalMonth("");
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                ถึงวันที่ (Date To)
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setSelectedFiscalYear("");
                  setSelectedFiscalMonth("");
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                บุคลากร / รหัสเครื่องสแกน (ทั้งหมด 1-64)
              </label>
              <select
                value={selectedScannerUid}
                onChange={(e) => {
                  setSelectedScannerUid(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              >
                <option value="all">ทั้งหมด (ทุก User ID)</option>
                {Object.values(mappings)
                  .sort((a, b) => a.scannerUserId - b.scannerUserId)
                  .map((m) => (
                    <option key={m.scannerUserId} value={String(m.scannerUserId)}>
                      #{m.scannerUserId} - {m.memberName}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                ประเภทการลงเวลา
              </label>
              <select
                aria-label="ประเภทการลงเวลา"
                value={selectedIoMode}
                onChange={(e) => {
                  setSelectedIoMode(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              >
                <option value="all">ทั้งหมด (ทุกช่วงเวลา 1-4)</option>
                <option value="1">🟢 เข้าราชการเช้า (05:00-08:30)</option>
                <option value="3">🔴 สาย / อาจลา (08:31-12:00)</option>
                <option value="4">🟠 ระหว่างวัน / ก่อน 16:30</option>
                <option value="2">🔵 ออกราชการ (16:30+)</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                ค้นหา (ชื่อบุคลากร / รหัสสแกน / กลุ่มงาน / หมายเหตุ)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value);
                    setPage(1);
                  }}
                  placeholder={`พิมพ์ชื่อ, รหัสสแกน เช่น 18, หรือ ${getTodayThaiDate()}...`}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
                <button
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                    setSelectedFiscalYear("");
                    setSelectedFiscalMonth("");
                    setSelectedScannerUid("all");
                    setSelectedIoMode("all");
                    setSearchText("");
                    setDebouncedSearchText("");
                    setPage(1);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  ล้างค่า
                </button>
                <button
                  onClick={handleExportCsv}
                  className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold cursor-pointer"
                >
                  📥 CSV
                </button>
              </div>
            </div>
          </div>

          {/* ปุ่มตัวกรองของฉัน & เลือกวันที่ด่วน */}
          {(myMappedScannerUid !== null || availableDates.length > 0) && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {myMappedScannerUid !== null && (
                <button
                  type="button"
                  onClick={() => {
                    const targetUid = String(myMappedScannerUid);
                    setSelectedScannerUid((prev) =>
                      prev === targetUid ? "all" : targetUid
                    );
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition ${
                    selectedScannerUid === String(myMappedScannerUid)
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                  }`}
                >
                  👤 เวลาเข้า-ออกของฉัน (#{myMappedScannerUid})
                </button>
              )}
              {availableDates.length > 0 && (
                <>
                  <span className="text-[11px] text-slate-400 mr-1">
                    เลือกวันที่ที่มีการสแกนด่วน:
                  </span>
              <button
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setSelectedFiscalYear("");
                  setSelectedFiscalMonth("");
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer ${
                  !dateFrom && !dateTo
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                ทุกวัน ({totalStoredLogs.toLocaleString()})
              </button>
              {availableDates.slice(0, 8).map((d) => {
                const p = getThaiFiscalPeriod(d);
                return (
                  <button
                    key={d}
                    onClick={() => {
                      setDateFrom(d);
                      setDateTo(d);
                      setSelectedFiscalYear("");
                      setSelectedFiscalMonth("");
                      setPage(1);
                    }}
                    title={`${d} (${p.fiscalLabel})`}
                    className={`px-2.5 py-1 rounded-lg text-[11px] cursor-pointer ${
                      dateFrom === d && dateTo === d
                        ? "bg-indigo-600 text-white font-semibold"
                        : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {p.dateShortBE}
                  </button>
                );
              })}
                </>
              )}
            </div>
          )}
        </div>

        {/* ตารางแสดงข้อมูลการลงเวลา */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl mt-4 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-bold text-slate-800 dark:text-white">
              รายการบันทึกเวลาเข้า-ออกงาน ({filteredTotal.toLocaleString()} รายการ)
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>แสดงต่อหน้า:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              >
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
                <option value={1000}>1,000</option>
              </select>
              <span>
                (หน้า {page} / {totalPages})
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-4">รหัสสแกน</th>
                  <th className="py-3 px-4">ชื่อ-นามสกุล / กลุ่มงาน</th>
                  <th className="py-3 px-4">วัน-เวลาที่บันทึก</th>
                  <th className="py-3 px-4">ประเภท (เข้า/ออก)</th>
                  <th className="py-3 px-4">วิธีสแกน</th>
                  <th className="py-3 px-4">สถานะข้อมูล / ประวัติการแก้ไข</th>
                  <th className="py-3 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      ⏳ กำลังโหลดข้อมูลเวลาปฏิบัติราชการ...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      ไม่พบข้อมูลการลงเวลาตามตัวกรองที่เลือก — กดปุ่ม{" "}
                      <strong>&ldquo;ซิงก์ข้อมูลจาก {mysqlConfig.scannerIp}&rdquo;</strong>{" "}
                      ด้านบนเพื่อดึงข้อมูลจากเครื่องสแกน
                    </td>
                  </tr>
                ) : (
                  logs.map((item) => {
                    const [datePart, timePart] = item.scanTimestamp.split(" ");
                    const period = getThaiFiscalPeriod(item.scanTimestamp);
                    const isLateMode = item.ioMode === 3;
                    const isMidDayMode = item.ioMode === 4;

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                          item.isEdited
                            ? "bg-amber-50/30 dark:bg-amber-950/10"
                            : ""
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          #{item.scannerUserId}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {item.memberName}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {item.division}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white flex flex-wrap items-center gap-1.5">
                            <span title={datePart}>{period.dateShortBE}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-indigo-600 dark:text-indigo-300">
                              {timePart}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold">
                              ปีงบ {period.fiscalYear}
                            </span>
                            {isLateMode && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-semibold">
                                หลัง 08:30
                              </span>
                            )}
                            {isMidDayMode && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                                ก่อน 16:30
                              </span>
                            )}
                          </div>
                          {item.isEdited &&
                            item.originalTimestamp !== item.scanTimestamp && (
                              <div className="text-[10px] text-slate-400 line-through font-mono">
                                เวลาเดิม: {item.originalTimestamp}
                              </div>
                            )}
                        </td>
                        <td className="py-3 px-4">
                          {item.ioMode === 1 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              🟢 {getAttendanceIoLabel(1)}
                            </span>
                          ) : item.ioMode === 3 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                              🔴 {getAttendanceIoLabel(3)}
                            </span>
                          ) : item.ioMode === 4 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                              🟠 {getAttendanceIoLabel(4)}
                            </span>
                          ) : item.ioMode === 2 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                              🔵 {getAttendanceIoLabel(2)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {item.ioLabel || getAttendanceIoLabel(item.ioMode)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                          {item.verifyMode === 1 && "👆 ลายนิ้วมือ (FP)"}
                          {item.verifyMode === 2 && "🔢 รหัสผ่าน (PWD)"}
                          {item.verifyMode === 3 && "💳 บัตร RFID (Card)"}
                          {item.verifyMode !== 1 &&
                            item.verifyMode !== 2 &&
                            item.verifyMode !== 3 &&
                            "✍️ บันทึกโดยผู้ดูแล"}
                        </td>
                        <td className="py-3 px-4">
                          {item.isEdited ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                                ✏️{" "}
                                {item.source === "manual"
                                  ? "เพิ่มรายการย้อนหลัง"
                                  : "แก้ไขเวลาแล้ว"}
                              </span>
                              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                                {item.editNote} (โดย {item.editedBy})
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              ✓ ข้อมูลต้นฉบับจากเครื่องสแกน
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {canEditAttendance ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold transition cursor-pointer"
                                title="แก้ไขเวลา / ประเภทเข้า-ออก"
                              >
                                ✏️ แก้ไข
                              </button>
                              <button
                                onClick={() => {
                                  setDeletingLog(item);
                                  setDeleteReason("ลบรายการสแกนซ้ำ/คลาดเคลื่อน");
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-semibold transition cursor-pointer"
                                title="ลบรายการนี้"
                              >
                                🗑️ ลบ
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              ไม่มีสิทธิ์แก้ไข
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* แถบแบ่งหน้า (Pagination Bar) */}
          {filteredTotal > 0 && (
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-slate-600 dark:text-slate-400">
                แสดงลำดับที่{" "}
                <strong>{((page - 1) * pageSize + 1).toLocaleString()}</strong> –{" "}
                <strong>
                  {Math.min(page * pageSize, filteredTotal).toLocaleString()}
                </strong>{" "}
                จากทั้งหมด <strong>{filteredTotal.toLocaleString()}</strong> รายการ
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage(1)}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
                >
                  « หน้าแรก
                </button>
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
                >
                  ‹ ก่อนหน้า
                </button>
                <span className="px-3 py-1.5 font-semibold text-indigo-600 dark:text-indigo-400">
                  หน้า {page.toLocaleString()} / {totalPages.toLocaleString()}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
                >
                  ถัดไป ›
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage(totalPages)}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 cursor-pointer"
                >
                  สุดท้าย »
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          MODAL 1: เพิ่ม / แก้ไขเวลาเข้า-ออกงาน
      ===================================================================== */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingLog
                  ? `✏️ แก้ไขข้อมูลเวลาปฏิบัติราชการ (#${editingLog.scannerUserId})`
                  : "➕ เพิ่มข้อมูลเวลาเข้า-ออกงานใหม่"}
              </h3>
              <button
                onClick={() => setShowLogModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLog} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  บุคลากร / รหัสเครื่องสแกน (User ID)
                </label>
                <select
                  value={logForm.scannerUserId}
                  onChange={(e) =>
                    setLogForm({
                      ...logForm,
                      scannerUserId: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  {Object.values(mappings)
                    .sort((a, b) => a.scannerUserId - b.scannerUserId)
                    .map((m) => (
                      <option key={m.scannerUserId} value={m.scannerUserId}>
                        รหัสสแกน #{m.scannerUserId} — {m.memberName} ({m.division})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    วันที่ (YYYY-MM-DD)
                  </label>
                  <input
                    type="date"
                    required
                    value={logForm.scanDate}
                    onChange={(e) =>
                      setLogForm({ ...logForm, scanDate: e.target.value })
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    เวลา (HH:mm:ss)
                  </label>
                  <input
                    type="time"
                    step="1"
                    required
                    value={logForm.scanTime}
                    onChange={(e) => {
                      const nextTime = e.target.value;
                      if (!editingLog && nextTime) {
                        const normalized = nextTime.length === 5 ? `${nextTime}:00` : nextTime;
                        const suggested = classifyAttendanceByOfficialHours(
                          `${logForm.scanDate || getTodayThaiDate()} ${normalized}`
                        );
                        setLogForm({
                          ...logForm,
                          scanTime: nextTime,
                          ioMode: suggested.ioMode,
                        });
                      } else {
                        setLogForm({ ...logForm, scanTime: nextTime });
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ประเภทการลงเวลา (IO Mode)
                  </label>
                  <select
                    value={logForm.ioMode}
                    onChange={(e) =>
                      setLogForm({ ...logForm, ioMode: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value={1}>🟢 {getAttendanceIoLabel(1)}</option>
                    <option value={3}>🔴 {getAttendanceIoLabel(3)}</option>
                    <option value={4}>🟠 {getAttendanceIoLabel(4)}</option>
                    <option value={2}>🔵 {getAttendanceIoLabel(2)}</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    วิธีการยืนยันตัวตน
                  </label>
                  <select
                    value={logForm.verifyMode}
                    onChange={(e) =>
                      setLogForm({
                        ...logForm,
                        verifyMode: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value={1}>👆 ลายนิ้วมือ (FP)</option>
                    <option value={2}>🔢 รหัสผ่าน (PWD)</option>
                    <option value={3}>💳 บัตร RFID (Card)</option>
                    <option value={9}>✍️ บันทึกโดยผู้ดูแล (Manual)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  เหตุผล / หมายเหตุการแก้ไขเวลา
                </label>
                <input
                  type="text"
                  required
                  value={logForm.editNote}
                  onChange={(e) =>
                    setLogForm({ ...logForm, editNote: e.target.value })
                  }
                  placeholder="ระบุสาเหตุ เช่น ลืมสแกนนิ้ว, ไปราชการนอกสถานที่, กดปุ่มเข้า/ออกผิด..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow cursor-pointer"
                >
                  💾 บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: ยืนยันการลบรายการลงเวลา
      ===================================================================== */}
      {deletingLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <h3 className="text-base font-bold text-rose-600">
              🗑️ ยืนยันการลบรายการลงเวลา
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              คุณต้องการลบรายการของ{" "}
              <strong>
                {deletingLog.memberName} (#{deletingLog.scannerUserId})
              </strong>{" "}
              เมื่อวันที่{" "}
              <span className="font-mono font-bold">
                {deletingLog.scanTimestamp}
              </span>{" "}
              ใช่หรือไม่?
            </p>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ระบุเหตุผลการลบ
              </label>
              <input
                type="text"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: จับคู่รหัสเครื่องสแกน (User ID 1..64) กับระบบผู้ใช้ Smart MSO
      ===================================================================== */}
      {showMappingModal && (() => {
        const allUids = Array.from({ length: 64 }, (_, i) => i + 1);
        const mappedCount = allUids.filter(
          (uid) => mappings[uid]?.isMapped || Boolean(mappings[uid]?.userId)
        ).length;
        const activeScannedCount = allUids.filter(
          (uid) => (scannerUidStats[uid]?.scanCount ?? 0) > 0
        ).length;
        const draftCount = Object.keys(draftUserMappings).length;

        const filteredUids = allUids.filter((uid) => {
          const m = mappings[uid];
          const stat = scannerUidStats[uid];
          const isUidMapped = Boolean(m?.isMapped || m?.userId);
          const hasScans = (stat?.scanCount ?? 0) > 0;

          if (mappingFilterMode === "active_unmapped" && !(hasScans && !isUidMapped)) {
            return false;
          }
          if (mappingFilterMode === "mapped" && !isUidMapped) {
            return false;
          }

          const q = mappingSearch.trim().toLowerCase();
          if (!q) return true;
          const draft = draftUserMappings[uid];
          const draftUser = draft
            ? effectiveUsersList.find((u) => u.id === draft.userId)
            : undefined;
          const haystack = [
            String(uid),
            `#${uid}`,
            m?.memberName ?? "",
            m?.memberId ?? "",
            m?.division ?? "",
            m?.position ?? "",
            draftUser?.name ?? "",
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(q);
        });

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3 gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    👥 จับคู่รหัสเครื่องสแกนลายนิ้วมือ (User ID 1 - 64) กับผู้ใช้ระบบ
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ผูกหมายเลข User ID ในเครื่อง HIP CMi681S เข้ากับบัญชีบุคลากรในระบบ (<code>public.users</code>) เพื่อแสดงชื่อจริง ตำแหน่ง ฝ่าย และตัวกรอง &ldquo;เวลาเข้า-ออกของฉัน&rdquo;
                  </p>
                </div>
                <button
                  onClick={() => setShowMappingModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer px-1"
                  aria-label="ปิดหน้าต่าง"
                >
                  ✕
                </button>
              </div>

              {/* Summary Stats & Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-semibold">
                    จับคู่แล้ว {mappedCount} / 64
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold">
                    มีประวัติสแกน {activeScannedCount} รหัส
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold">
                    ผู้ใช้ระบบ {effectiveUsersList.length} คน
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoMatchMappings}
                    disabled={savingMapping}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-semibold cursor-pointer transition"
                  >
                    ✨ จับคู่อัตโนมัติจากชื่อ
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveMappingsBatch}
                    disabled={savingMapping || draftCount === 0}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold cursor-pointer transition"
                  >
                    {savingMapping
                      ? "⏳ กำลังบันทึก..."
                      : `💾 บันทึกที่เลือกทั้งหมด (${draftCount})`}
                  </button>
                </div>
              </div>

              {/* Filter Tabs + Search */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMappingFilterMode("all")}
                    className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition ${
                      mappingFilterMode === "all"
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    ทั้งหมด (64)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMappingFilterMode("active_unmapped")}
                    className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition ${
                      mappingFilterMode === "active_unmapped"
                        ? "bg-rose-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    มีสแกนแต่ยังไม่จับคู่
                  </button>
                  <button
                    type="button"
                    onClick={() => setMappingFilterMode("mapped")}
                    className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition ${
                      mappingFilterMode === "mapped"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    จับคู่แล้ว ({mappedCount})
                  </button>
                </div>

                <input
                  type="text"
                  value={mappingSearch}
                  onChange={(e) => setMappingSearch(e.target.value)}
                  placeholder="🔍 ค้นหา #ID หรือชื่อบุคลากร..."
                  className="w-full sm:w-64 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              {/* Scrollable 1-64 Mapping Table */}
              <div className="flex-1 min-h-[220px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] uppercase">
                    <tr>
                      <th className="py-2 px-3 w-16">#ID</th>
                      <th className="py-2 px-3 w-36">ประวัติสแกน</th>
                      <th className="py-2 px-3">ชื่อแสดงผลปัจจุบัน / สถานะ</th>
                      <th className="py-2 px-3 w-64">เลือกผู้ใช้ระบบ (public.users)</th>
                      <th className="py-2 px-3 w-36 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredUids.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-slate-400"
                        >
                          ไม่พบรหัสเครื่องสแกนที่ตรงกับเงื่อนไข
                        </td>
                      </tr>
                    ) : (
                      filteredUids.map((uid) => {
                        const m = mappings[uid];
                        const stat = scannerUidStats[uid];
                        const isUidMapped = Boolean(m?.isMapped || m?.userId);
                        const draft = draftUserMappings[uid];
                        const selectedUserId = draft?.userId ?? m?.userId ?? "";

                        return (
                          <tr
                            key={uid}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                              draft
                                ? "bg-indigo-50/60 dark:bg-indigo-950/20"
                                : ""
                            }`}
                          >
                            <td className="py-2 px-3 font-mono font-bold text-slate-800 dark:text-slate-100">
                              #{uid}
                            </td>
                            <td className="py-2 px-3">
                              {stat && stat.scanCount > 0 ? (
                                <div className="leading-tight">
                                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                                    {stat.scanCount.toLocaleString()} ครั้ง
                                  </span>
                                  {stat.lastScanAt && (
                                    <div className="text-[10px] text-slate-400">
                                      ล่าสุด {stat.lastScanAt.slice(0, 10)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px]">
                                  ยังไม่พบการสแกน
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-semibold text-slate-800 dark:text-slate-100">
                                  {m?.memberName || `รหัส #${uid}`}
                                </span>
                                {isUidMapped ? (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                                    จับคู่แล้ว
                                    {m?.matchMethod === "auto_name"
                                      ? " (อัตโนมัติ)"
                                      : ""}
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px]">
                                    ยังไม่จับคู่
                                  </span>
                                )}
                                {draft && (
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold">
                                    รอการบันทึก
                                  </span>
                                )}
                              </div>
                              {(m?.position || m?.division) && (
                                <div className="text-[10px] text-slate-400 truncate max-w-xs">
                                  {[m.position, m.division].filter(Boolean).join(" · ")}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={selectedUserId}
                                onChange={(e) => {
                                  const nextUserId = e.target.value;
                                  setDraftUserMappings((prev) => {
                                    const next = { ...prev };
                                    if (!nextUserId || nextUserId === (m?.userId ?? "")) {
                                      delete next[uid];
                                    } else {
                                      next[uid] = {
                                        userId: nextUserId,
                                        matchMethod: "manual",
                                      };
                                    }
                                    return next;
                                  });
                                }}
                                className="w-full px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                              >
                                <option value="">-- ยังไม่ระบุผู้ใช้ระบบ --</option>
                                {effectiveUsersList.map((u) => (
                                  <option key={u.id} value={u.id}>
                                    {u.name}
                                    {u.division ? ` (${u.division})` : ""}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 px-3 text-right whitespace-nowrap space-x-1">
                              <button
                                type="button"
                                onClick={() => handleSelectMappingUid(uid)}
                                className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-medium cursor-pointer"
                              >
                                แก้ไขชื่อเอง
                              </button>
                              {isUidMapped && (
                                <button
                                  type="button"
                                  disabled={savingMapping}
                                  onClick={() => handleUnmapUid(uid)}
                                  className="px-2 py-1 rounded-md bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-[11px] font-medium cursor-pointer disabled:opacity-40"
                                >
                                  ยกเลิก
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Single-row Custom Override Form */}
              <form
                onSubmit={handleSaveMapping}
                className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-2.5 bg-slate-50/70 dark:bg-slate-800/30 p-3 rounded-xl"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 dark:text-slate-200">
                    ✏️ แก้ไขรายละเอียดรายรหัส (User ID #{editingMappingUid})
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ใช้กรณีต้องการกำหนดชื่อแสดงผล ตำแหน่ง หรือกลุ่มงานเอง
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      รหัสเครื่องสแกน
                    </label>
                    <select
                      value={editingMappingUid}
                      onChange={(e) => handleSelectMappingUid(Number(e.target.value))}
                      className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                    >
                      {allUids.map((uid) => (
                        <option key={uid} value={uid}>
                          #{uid} — {mappings[uid]?.memberName || `รหัส #${uid}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      ผูกกับผู้ใช้ระบบ
                    </label>
                    <select
                      value={mappingForm.userId}
                      onChange={(e) => {
                        const found = effectiveUsersList.find(
                          (u) => u.id === e.target.value
                        );
                        if (found) {
                          setMappingForm({
                            userId: found.id,
                            memberId: found.id,
                            memberName: found.name,
                            division: found.division,
                            position: found.position,
                          });
                        } else {
                          setMappingForm({
                            ...mappingForm,
                            userId: "",
                          });
                        }
                      }}
                      className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="">-- ไม่ผูกบัญชี (พิมพ์ชื่อเอง) --</option>
                      {effectiveUsersList.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      ชื่อ-นามสกุลแสดงผล
                    </label>
                    <input
                      type="text"
                      required
                      value={mappingForm.memberName}
                      onChange={(e) =>
                        setMappingForm({ ...mappingForm, memberName: e.target.value })
                      }
                      className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      ตำแหน่ง
                    </label>
                    <input
                      type="text"
                      value={mappingForm.position}
                      onChange={(e) =>
                        setMappingForm({ ...mappingForm, position: e.target.value })
                      }
                      className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      กลุ่มงาน / ฝ่าย
                    </label>
                    <input
                      type="text"
                      value={mappingForm.division}
                      onChange={(e) =>
                        setMappingForm({ ...mappingForm, division: e.target.value })
                      }
                      className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowMappingModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
                  >
                    ปิดหน้าต่าง
                  </button>
                  <button
                    type="submit"
                    disabled={savingMapping}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold cursor-pointer"
                  >
                    {savingMapping
                      ? "⏳ กำลังบันทึก..."
                      : `💾 บันทึกรหัส #${editingMappingUid}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* =====================================================================
          MODAL 4: กำหนดสิทธิ์ Admin / User ที่สามารถแก้ไขเวลาเข้า-ออกงานได้
      ===================================================================== */}
      {showEditorsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  🔐 กำหนดสิทธิ์ผู้ใช้งานที่สามารถ เพิ่ม/แก้ไข/ลบ เวลาปฏิบัติราชการได้
                </h3>
                <p className="text-[11px] text-slate-500">
                  ผู้ดูแลระบบ (Admin) มีสิทธิ์แก้ไขได้โดยอัตโนมัติ และสามารถติ๊กเลือกมอบหมายให้เจ้าหน้าที่คนอื่นช่วยจัดการข้อมูลลงเวลาได้
                </p>
              </div>
              <button
                onClick={() => setShowEditorsModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {members.map((m) => {
                const isAdmin = m.role === "admin";
                const isAuthorized =
                  isAdmin ||
                  authorizedEditors.some((ed) => ed.memberId === m.id);
                return (
                  <div
                    key={m.id}
                    className="py-2.5 px-2 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {m.name}{" "}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600">
                          {m.role.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {m.position} — {m.division}
                      </div>
                    </div>

                    {isAdmin ? (
                      <span className="px-3 py-1 rounded-lg bg-indigo-100 text-indigo-700 font-semibold text-[11px]">
                        👑 Admin (มีสิทธิ์ถาวร)
                      </span>
                    ) : (
                      <button
                        disabled={savingEditors}
                        onClick={() => handleToggleEditorMember(m)}
                        className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer disabled:opacity-50 ${
                          isAuthorized
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {isAuthorized
                          ? "✓ มีสิทธิ์แก้ไขเวลา"
                          : "+ มอบสิทธิ์แก้ไขเวลา"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowEditorsModal(false)}
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-semibold cursor-pointer"
              >
                เสร็จสิ้น
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 5: ตั้งค่าและคู่มือ Synology NAS MariaDB/MySQL
      ===================================================================== */}
      {showMysqlModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs my-8">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  🗄️ ตั้งค่าการเชื่อมต่อ MySQL (MariaDB 10) บน Synology NAS
                </h3>
                <p className="text-[11px] text-slate-500">
                  กำหนดค่าการเชื่อมต่อฐานข้อมูลบน Synology NAS และคำสั่ง SQL สำหรับเปิดสิทธิ์ Remote Host
                </p>
              </div>
              <button
                onClick={() => setShowMysqlModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAndTestMysql} className="space-y-3">
              {/* เลือกโหมดการเชื่อมต่อ: LAN/TCP 3308 หรือ Cloudflare HTTPS Bridge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl">
                <button
                  type="button"
                  onClick={() =>
                    setMysqlConfig({
                      ...mysqlConfig,
                      connectionMode: "direct_tcp",
                      port: mysqlConfig.port || 3308,
                    })
                  }
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                    (mysqlConfig.connectionMode || "direct_tcp") === "direct_tcp"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-xs"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  🔌 โหมด 1: เชื่อมต่อตรงด้วย TCP Port 3308 (LAN / DDNS / TCP Tunnel)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMysqlConfig({
                      ...mysqlConfig,
                      connectionMode: "cloudflare_bridge",
                      port: mysqlConfig.port || 3308,
                    })
                  }
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                    mysqlConfig.connectionMode === "cloudflare_bridge"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 shadow-xs"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  ☁️ โหมด 2: เชื่อมต่อผ่านอินเทอร์เน็ตด้วย Cloudflare Tunnel (HTTPS → Port 3308)
                </button>
              </div>

              {mysqlConfig.connectionMode === "cloudflare_bridge" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-indigo-50/60 dark:bg-indigo-950/30 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-indigo-900 dark:text-indigo-200 mb-1">
                      URL ของ Cloudflare Tunnel Bridge (ชี้ไปที่ Web Station บน Synology NAS)
                    </label>
                    <input
                      type="url"
                      value={
                        mysqlConfig.cloudflareBridgeUrl ||
                        "https://db.smso.site/attendance-bridge.php"
                      }
                      onChange={(e) =>
                        setMysqlConfig({
                          ...mysqlConfig,
                          cloudflareBridgeUrl: e.target.value,
                        })
                      }
                      placeholder="https://db.smso.site/attendance-bridge.php"
                      className="w-full px-3 py-2 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <a
                      href="/synology-bridge/attendance-bridge.php"
                      download="attendance-bridge.php"
                      className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-center font-semibold shadow transition"
                    >
                      ⬇️ ดาวน์โหลด attendance-bridge.php
                    </a>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Synology NAS MySQL IP / Host
                  </label>
                  <input
                    type="text"
                    value={mysqlConfig.host}
                    onChange={(e) =>
                      setMysqlConfig({ ...mysqlConfig, host: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    MySQL Port (ตั้งค่าปัจจุบัน = 3308)
                  </label>
                  <input
                    type="number"
                    value={mysqlConfig.port}
                    onChange={(e) =>
                      setMysqlConfig({
                        ...mysqlConfig,
                        port: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ชื่อฐานข้อมูล (Database Name)
                  </label>
                  <input
                    type="text"
                    value={mysqlConfig.database}
                    onChange={(e) =>
                      setMysqlConfig({
                        ...mysqlConfig,
                        database: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    MySQL Username
                  </label>
                  <input
                    type="text"
                    value={mysqlConfig.user}
                    onChange={(e) =>
                      setMysqlConfig({ ...mysqlConfig, user: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    MySQL Password (โหลดจาก Server / .env อัตโนมัติ)
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showMysqlPassword ? "text" : "password"}
                      value={mysqlConfig.password || ""}
                      onFocus={() => {
                        if (mysqlConfig.password === "••••••••") {
                          setMysqlConfig({ ...mysqlConfig, password: "" });
                        }
                      }}
                      onChange={(e) =>
                        setMysqlConfig({
                          ...mysqlConfig,
                          password: e.target.value,
                        })
                      }
                      placeholder="เว้นว่างเพื่อใช้ค่าเดิมจาก .env.local (หรือพิมพ์รหัสผ่านใหม่)"
                      className="w-full px-3 py-2 pr-12 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMysqlPassword((v) => !v)}
                      className="absolute right-2 px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      {showMysqlPassword ? "ซ่อน" : "แสดง"}
                    </button>
                  </div>
                </div>
              </div>

              {/* คู่มือการตั้งค่าบน Synology NAS ทีละขั้นตอน */}
              <div className="bg-slate-50 dark:bg-slate-800/70 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="font-bold text-slate-900 dark:text-white text-sm">
                  📌 ขั้นตอนการตั้งค่า MariaDB 10 บน Synology NAS ({mysqlConfig.host})
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-300">
                  <li>
                    เปิดหน้าจัดการ <strong>Synology DSM</strong> (`http://192.168.162.23:5000`) → ไปที่{" "}
                    <strong>Package Center</strong> → เปิดแอป <strong>MariaDB 10</strong> และตั้งค่า{" "}
                    <code>Enable TCP/IP connection</code> เป็น Port: <code>3308</code> (ตรวจพบว่าพอร์ต 3308 เปิดใช้งานแล้ว!)
                  </li>
                  <li>
                    เปิด <strong>phpMyAdmin</strong> บน Synology NAS (หรือเชื่อมต่อผ่าน SSH ด้วยคำสั่ง{" "}
                    <code>/usr/local/mariadb10/bin/mysql -u root -p -P 3308</code>)
                  </li>
                  <li>
                    ไปที่แท็บ <strong>SQL</strong> ใน phpMyAdmin แล้วคัดลอกคำสั่ง SQL ด้านล่างไปวางและกด{" "}
                    <strong>Go (รันคำสั่ง)</strong> เพื่อสร้างฐานข้อมูลและอนุญาตให้เชื่อมต่อได้:
                  </li>
                </ol>

                <div className="relative mt-2">
                  <pre className="bg-slate-950 text-emerald-300 p-3 rounded-xl font-mono text-[11px] overflow-x-auto max-h-48">
                    {setupSql}
                  </pre>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(setupSql);
                      showToast("คัดลอกคำสั่ง SQL สำหรับ Synology MariaDB เรียบร้อยแล้ว");
                    }}
                    className="absolute top-2 right-2 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold cursor-pointer"
                  >
                    📋 คัดลอก SQL
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs">
                  สถานะปัจจุบัน:{" "}
                  {mysqlStatus?.connected ? (
                    <span className="font-bold text-emerald-600">
                      ✅ เชื่อมต่อสำเร็จ ({mysqlStatus.mysqlVersion} / ข้อมูลใน MySQL:{" "}
                      {mysqlStatus.rowCount?.toLocaleString()} รายการ)
                    </span>
                  ) : (
                    <span className="font-semibold text-amber-600">
                      ⚠️ {mysqlStatus?.errorMessage || "ยังไม่ได้เชื่อมต่อ"}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMysqlModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 font-semibold cursor-pointer"
                  >
                    ปิด
                  </button>
                  <button
                    type="submit"
                    disabled={testingMysql}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold shadow cursor-pointer"
                  >
                    {testingMysql
                      ? "⏳ กำลังทดสอบและสร้างตาราง..."
                      : "🔌 บันทึก & ทดสอบเชื่อมต่อ Synology MySQL"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
