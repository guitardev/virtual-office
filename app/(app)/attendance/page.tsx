"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import {
  AttendanceLogItem,
  ScannerUserMapping,
  AuthorizedAttendanceEditor,
  NasMysqlConfig,
} from "@/lib/attendance-db";

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

export default function AttendancePage() {
  const { currentUser, currentUserRole, members, showToast, addAuditLog } =
    useAppContext();

  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncLimit, setSyncLimit] = useState<number>(1500);

  const [logs, setLogs] = useState<AttendanceLogItem[]>([]);
  const [filteredTotal, setFilteredTotal] = useState<number>(0);
  const [totalStoredLogs, setTotalStoredLogs] = useState<number>(0);
  const [deviceTotalRecords, setDeviceTotalRecords] = useState<number>(30061);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastMysqlSyncedAt, setLastMysqlSyncedAt] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);

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
  const [setupSql, setSetupSql] = useState<string>("");
  const [mappings, setMappings] = useState<Record<number, ScannerUserMapping>>({});
  const [authorizedEditors, setAuthorizedEditors] = useState<
    AuthorizedAttendanceEditor[]
  >([]);

  // ตัวกรองตาราง
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedScannerUid, setSelectedScannerUid] = useState<string>("all");
  const [selectedIoMode, setSelectedIoMode] = useState<string>("all");
  const [searchText, setSearchText] = useState<string>("");

  // Modals
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [editingLog, setEditingLog] = useState<AttendanceLogItem | null>(null);
  const [logForm, setLogForm] = useState({
    scannerUserId: 1,
    scanDate: "2026-11-06",
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
    memberId: "",
    memberName: "",
    division: "",
    position: "",
  });

  const [showEditorsModal, setShowEditorsModal] = useState<boolean>(false);
  const [showMysqlModal, setShowMysqlModal] = useState<boolean>(false);
  const [testingMysql, setTestingMysql] = useState<boolean>(false);

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
      autoSyncIfEmpty?: boolean;
    }) => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        const df = opts?.customDateFrom !== undefined ? opts.customDateFrom : dateFrom;
        const dt = opts?.customDateTo !== undefined ? opts.customDateTo : dateTo;
        if (df) params.set("dateFrom", df);
        if (dt) params.set("dateTo", dt);
        if (selectedScannerUid !== "all") params.set("scannerUserId", selectedScannerUid);
        if (selectedIoMode !== "all") params.set("ioMode", selectedIoMode);
        if (searchText.trim()) params.set("search", searchText.trim());

        const res = await fetch(`/api/attendance?${params.toString()}`);
        const data = await res.json();
        if (data.success) {
          setLogs(data.logs || []);
          setFilteredTotal(data.filteredTotal || 0);
          setTotalStoredLogs(data.totalStoredLogs || 0);
          setDeviceTotalRecords(data.deviceTotalRecords || 30061);
          setLastSyncedAt(data.lastSyncedAt || null);
          setLastMysqlSyncedAt(data.lastMysqlSyncedAt || null);
          setAvailableDates(data.availableDates || []);
          if (data.mysqlConfig) setMysqlConfig(data.mysqlConfig);
          if (data.mysqlStatus) setMysqlStatus(data.mysqlStatus);
          if (data.setupSql) setSetupSql(data.setupSql);
          if (data.mappings) setMappings(data.mappings);
          if (data.authorizedEditors) {
            setAuthorizedEditors(data.authorizedEditors);
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem("smartmso_attendance_editors", JSON.stringify(data.authorizedEditors));
              } catch {}
            }
          }

          // หากยังไม่มีข้อมูลใน Store เลย ให้ซิงก์ 1,500 รายการล่าสุดจากเครื่อง 192.168.162.15 อัตโนมัติในครั้งแรก
          if (opts?.autoSyncIfEmpty && (data.totalStoredLogs || 0) === 0) {
            await handleSyncFromDevice(1500, true);
          }
        }
      } catch (err) {
        console.error("Failed to fetch attendance:", err);
      } finally {
        setLoading(false);
      }
    },
    [dateFrom, dateTo, selectedScannerUid, selectedIoMode, searchText]
  );

  useEffect(() => {
    fetchAttendanceData({ autoSyncIfEmpty: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAttendanceData();
  }, [dateFrom, dateTo, selectedScannerUid, selectedIoMode, searchText, fetchAttendanceData]);

  // ซิงก์ข้อมูลจากเครื่องสแกนลายนิ้วมือ HIP CMi681S (192.168.162.15:5005)
  const handleSyncFromDevice = async (limit = syncLimit, silent = false) => {
    try {
      setSyncing(true);
      if (!silent) {
        showToast(
          `กำลังเชื่อมต่อเครื่องสแกน HIP CMi681S (${mysqlConfig.scannerIp}:${mysqlConfig.scannerPort})...`
        );
      }
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync_device",
          limitLatest: limit,
        }),
      });
      const data = await res.json();
      if (data.success) {
        addAuditLog(
          currentUser?.name || "ผู้ดูแลระบบ",
          "ซิงก์ข้อมูลเวลาปฏิบัติราชการจากเครื่องสแกน HIP CMi681S",
          `ดึงข้อมูล ${data.pulledCount.toLocaleString()} รายการ (เพิ่มใหม่ ${data.mergeResult.addedCount.toLocaleString()} รายการ)`,
          "success"
        );
        const mysqlMsg = data.mysqlSync?.synced
          ? `และบันทึกลง Synology MySQL (${data.mysqlSync.upsertedLogs.toLocaleString()} รายการ) สำเร็จ`
          : `(บันทึกในระบบแคชเรียบร้อย — รอเปิดสิทธิ์ Host บน Synology MySQL)`;
        showToast(
          `ซิงก์สำเร็จ! ดึงข้อมูล ${data.pulledCount.toLocaleString()} รายการจาก HIP CMi681S ${mysqlMsg}`
        );
        await fetchAttendanceData();
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
    const defaultDate = availableDates[0] || "2026-11-06";
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
      scanDate: d || "2026-11-06",
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
          actorName,
        }
      : {
          action: "add_log",
          ...logForm,
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

  // บันทึกการจับคู่รหัสสแกนนิ้ว (User ID) กับชื่อบุคลากร
  const handleSelectMappingUid = (uid: number) => {
    setEditingMappingUid(uid);
    const current = mappings[uid];
    if (current) {
      setMappingForm({
        memberId: current.memberId,
        memberName: current.memberName,
        division: current.division,
        position: current.position,
      });
    } else {
      setMappingForm({
        memberId: `scanner_uid_${uid}`,
        memberName: `บุคลากร พมจ. (รหัสสแกน #${uid})`,
        division: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
        position: "เจ้าหน้าที่ปฏิบัติงาน",
      });
    }
  };

  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_mapping",
        scannerUserId: editingMappingUid,
        ...mappingForm,
        actorName: currentUser?.name || "ผู้ดูแลระบบ",
      }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(
        `อัปเดตชื่อรหัสสแกน #${editingMappingUid} เป็น "${mappingForm.memberName}" เรียบร้อยแล้ว`
      );
      await fetchAttendanceData();
    }
  };

  // สลับสิทธิ์การเป็นผู้แก้ไขเวลา (Authorized Editors)
  const handleToggleEditorMember = async (member: {
    id: string;
    name: string;
    division: string;
    role: string;
  }) => {
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

    setAuthorizedEditors(nextEditors);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("smartmso_attendance_editors", JSON.stringify(nextEditors));
      } catch {}
    }
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "save_editors",
        editors: nextEditors,
      }),
    });
    const data = await res.json();
    if (data.success) {
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
        }),
      });
      const data = await res.json();
      if (data.mysqlStatus) {
        setMysqlStatus(data.mysqlStatus);
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
          `ยังไม่สามารถเข้าถึง MySQL: ${data.mysqlStatus?.errorMessage || "กรุณาตรวจสอบสิทธิ์ Host ใน phpMyAdmin"}`
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
      "เวลาเดิมก่อนแก้ไข",
      "ประเภท (เข้า/ออก)",
      "วิธีบันทึก",
      "สถานะการแก้ไข",
      "ผู้แก้ไข",
      "หมายเหตุ",
    ];
    const rows = logs.map((l, idx) => [
      idx + 1,
      l.scannerUserId,
      `"${l.memberName.replace(/"/g, '""')}"`,
      `"${(l.division || "").replace(/"/g, '""')}"`,
      l.scanTimestamp,
      l.originalTimestamp,
      l.ioLabel,
      l.verifyLabel,
      l.isEdited ? "แก้ไขแล้ว" : "ต้นฉบับจากเครื่องสแกน",
      `"${(l.editedBy || "-").replace(/"/g, '""')}"`,
      `"${(l.editNote || "-").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-smart-mso-${dateFrom || "all"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("ดาวน์โหลดไฟล์ CSV สรุปเวลาปฏิบัติราชการเรียบร้อยแล้ว");
  };

  // สรุปตัวเลขสถิติจากรายการที่กรอง
  const summaryStats = useMemo(() => {
    let checkIn = 0;
    let checkOut = 0;
    let edited = 0;
    let lateCount = 0;
    for (const item of logs) {
      if (item.ioMode === 1) {
        checkIn++;
        const timePart = item.scanTimestamp.split(" ")[1] || "";
        if (timePart > "08:30:59" && timePart < "12:00:00") {
          lateCount++;
        }
      } else if (item.ioMode === 2) {
        checkOut++;
      }
      if (item.isEdited) edited++;
    }
    return { checkIn, checkOut, edited, lateCount };
  }, [logs]);

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
                  HIP CMi681S TCP 5005 ↔ Synology NAS MySQL
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
                  MariaDB/MySQL บน Synology NAS ({mysqlConfig.host}:{mysqlConfig.port})
                </span>{" "}
                พร้อมระบบปรับปรุงเวลาสำหรับผู้ดูแลระบบและเจ้าหน้าที่ที่ได้รับมอบหมาย
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
                    ดึงทั้งหมด 30,061+ รายการ (~18 วินาที)
                  </option>
                </select>
                <button
                  onClick={() => handleSyncFromDevice(syncLimit)}
                  disabled={syncing}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
                >
                  <span>{syncing ? "⏳" : "🔄"}</span>
                  <span>
                    {syncing
                      ? "กำลังซิงก์จากเครื่องสแกน..."
                      : "ซิงก์ข้อมูลจาก 192.168.162.15"}
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

        {/* การ์ดสถานะ 4 บล็อก */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* 1. สถานะเครื่องสแกน HIP CMi681S */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                เครื่องสแกนลายนิ้วมือ
              </span>
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-100 text-emerald-700">
                ● Online (TCP 5005)
              </span>
            </div>
            <div className="mt-2 font-bold text-slate-900 dark:text-white text-base">
              HIP CMi681S ({mysqlConfig.scannerIp})
            </div>
            <div className="mt-1 text-xs text-slate-500 space-y-0.5">
              <div>
                Serial: <span className="font-mono font-medium">6812112298</span> | บัญชี:{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  64 คน (40 ลายนิ้วมือ)
                </span>
              </div>
              <div>
                บันทึกในเครื่องทั้งหมด:{" "}
                <span className="font-semibold text-indigo-600">
                  {deviceTotalRecords.toLocaleString()} รายการ
                </span>
              </div>
            </div>
          </div>

          {/* 2. สถานะฐานข้อมูล Synology NAS MySQL */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                Synology NAS MySQL Server
              </span>
              {mysqlStatus?.connected ? (
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-100 text-emerald-700">
                  ● เชื่อมต่อ MySQL สำเร็จ
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-100 text-amber-800">
                  ⚠️ รอปลดล็อกสิทธิ์ Host บน NAS
                </span>
              )}
            </div>
            <div className="mt-2 font-bold text-slate-900 dark:text-white text-base flex items-center justify-between">
              <span>
                {mysqlConfig.host}:{mysqlConfig.port}
              </span>
              <button
                onClick={() => setShowMysqlModal(true)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 underline cursor-pointer"
              >
                ตั้งค่า / ดูวิธีเปิดสิทธิ์
              </button>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              DB: <span className="font-mono">{mysqlConfig.database}</span> | เก็บแล้ว:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {totalStoredLogs.toLocaleString()} รายการ
              </span>
            </div>
          </div>

          {/* 3. สถิติรายการที่แสดง */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase">
                สถิติรายการตามตัวกรอง
              </span>
              <span className="text-xs font-bold text-indigo-600">
                {filteredTotal.toLocaleString()} รายการ
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2.5 text-center">
              <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-xl p-1.5">
                <div className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  เข้างาน
                </div>
                <div className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  {summaryStats.checkIn.toLocaleString()}
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/40 rounded-xl p-1.5">
                <div className="text-[11px] text-blue-700 dark:text-blue-300">
                  ออกงาน
                </div>
                <div className="text-sm font-bold text-blue-700 dark:text-blue-300">
                  {summaryStats.checkOut.toLocaleString()}
                </div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/40 rounded-xl p-1.5">
                <div className="text-[11px] text-amber-700 dark:text-amber-300">
                  แก้ไขแล้ว
                </div>
                <div className="text-sm font-bold text-amber-700 dark:text-amber-300">
                  {summaryStats.edited.toLocaleString()}
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
              <span className="text-[11px] text-slate-400">
                ซิงก์ล่าสุด:{" "}
                {lastSyncedAt
                  ? new Date(lastSyncedAt).toLocaleTimeString("th-TH")
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

        {/* แจ้งเตือนคำแนะนำการตั้งค่า MySQL บน Synology NAS หากยังติดเรื่อง Host Permission */}
        {mysqlStatus && !mysqlStatus.connected && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold text-sm">
                <span>🗄️</span>
                <span>
                  ตรวจพบเซิร์ฟเวอร์ MariaDB 10 บน Synology NAS ({mysqlConfig.host}:
                  {mysqlConfig.port}) เปิดอยู่แล้ว!
                </span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                {mysqlStatus.setupAdvice} — ข้อมูลทั้งหมดที่ซิงก์และแก้ไขในตอนนี้ถูกบันทึกไว้ในระบบแล้ว
                และสามารถกด{" "}
                <strong>&ldquo;คู่มือตั้งค่า & คำสั่ง SQL เปิดสิทธิ์ MySQL บน Synology NAS&rdquo;</strong>{" "}
                เพื่อเชื่อมต่อเข้า MariaDB ได้ทันที
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
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                ตั้งแต่วันที่ (Date From)
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
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
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                บุคลากร / รหัสเครื่องสแกน
              </label>
              <select
                value={selectedScannerUid}
                onChange={(e) => setSelectedScannerUid(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              >
                <option value="all">ทั้งหมด (ทุก User ID)</option>
                {Object.values(mappings)
                  .slice(0, 45)
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
                value={selectedIoMode}
                onChange={(e) => setSelectedIoMode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              >
                <option value="all">ทั้งหมด (เข้างาน + ออกงาน)</option>
                <option value="1">เข้างาน (Check-In)</option>
                <option value="2">ออกงาน (Check-Out)</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                ค้นหา (ชื่อบุคลากร / รหัสสแกน / วันที่ / หมายเหตุ)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="พิมพ์ชื่อ, รหัสสแกน เช่น 18, หรือ 2026-11-06..."
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                />
                <button
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                    setSelectedScannerUid("all");
                    setSelectedIoMode("all");
                    setSearchText("");
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

          {/* ปุ่มเลือกวันที่ด่วน */}
          {availableDates.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] text-slate-400 mr-1">
                เลือกวันที่ที่มีการสแกนด่วน:
              </span>
              <button
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium cursor-pointer ${
                  !dateFrom && !dateTo
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                ทุกวัน ({totalStoredLogs.toLocaleString()})
              </button>
              {availableDates.slice(0, 8).map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setDateFrom(d);
                    setDateTo(d);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono cursor-pointer ${
                    dateFrom === d && dateTo === d
                      ? "bg-indigo-600 text-white font-semibold"
                      : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ตารางแสดงข้อมูลการลงเวลา */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-bold text-slate-800 dark:text-white">
              รายการบันทึกเวลาเข้า-ออกงาน ({filteredTotal.toLocaleString()} รายการ)
            </div>
            <div className="text-xs text-slate-500">
              แสดงสูงสุด 1,000 รายการล่าสุดตามเงื่อนไขตัวกรอง
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
                      <strong>&ldquo;ซิงก์ข้อมูลจาก 192.168.162.15&rdquo;</strong>{" "}
                      ด้านบนเพื่อดึงข้อมูลจากเครื่องสแกน
                    </td>
                  </tr>
                ) : (
                  logs.map((item) => {
                    const [datePart, timePart] = item.scanTimestamp.split(" ");
                    const isLate =
                      item.ioMode === 1 &&
                      timePart > "08:30:59" &&
                      timePart < "12:00:00";

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
                        <td className="py-3 px-4 font-mono">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{datePart}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-300">
                              {timePart}
                            </span>
                            {isLate && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-sans font-semibold">
                                หลัง 08:30
                              </span>
                            )}
                          </div>
                          {item.isEdited &&
                            item.originalTimestamp !== item.scanTimestamp && (
                              <div className="text-[10px] text-slate-400 line-through">
                                เวลาเดิม: {item.originalTimestamp}
                              </div>
                            )}
                        </td>
                        <td className="py-3 px-4">
                          {item.ioMode === 1 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              🟢 เข้างาน (Check-In)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                              🔵 ออกงาน (Check-Out)
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
                  {Object.values(mappings).map((m) => (
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
                    onChange={(e) =>
                      setLogForm({ ...logForm, scanTime: e.target.value })
                    }
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
                    <option value={1}>🟢 เข้างาน (Check-In)</option>
                    <option value={2}>🔵 ออกงาน (Check-Out)</option>
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
          MODAL 3: จับคู่รหัสเครื่องสแกน (User ID 1..64) กับรายชื่อบุคลากร
      ===================================================================== */}
      {showMappingModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  👥 จับคู่รหัสเครื่องสแกนลายนิ้วมือ (User ID 1 - 64) กับชื่อบุคลากร
                </h3>
                <p className="text-[11px] text-slate-500">
                  เนื่องจากในตัวเครื่อง HIP CMi681S เก็บเฉพาะหมายเลข User ID (1-64)
                  คุณสามารถผูกแต่ละหมายเลขเข้ากับชื่อ-นามสกุลจริงของบุคลากรได้ที่นี่
                </p>
              </div>
              <button
                onClick={() => setShowMappingModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMapping} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    เลือกหมายเลข User ID ในเครื่องสแกน
                  </label>
                  <select
                    value={editingMappingUid}
                    onChange={(e) => handleSelectMappingUid(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    {Array.from({ length: 64 }, (_, i) => i + 1).map((uid) => (
                      <option key={uid} value={uid}>
                        User ID #{uid} — {mappings[uid]?.memberName || `รหัส #${uid}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ดึงข้อมูลด่วนจากทำเนียบบุคลากร Smart MSO (ถ้ามี)
                  </label>
                  <select
                    value=""
                    onChange={(e) => {
                      const found = members.find((m) => m.id === e.target.value);
                      if (found) {
                        setMappingForm({
                          memberId: found.id,
                          memberName: found.name,
                          division: found.division,
                          position: found.position,
                        });
                      }
                    }}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="">-- เลือกจากรายชื่อในระบบ หรือพิมพ์เองด้านล่าง --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.division})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ชื่อ-นามสกุลจริงที่ต้องการแสดงผล
                  </label>
                  <input
                    type="text"
                    required
                    value={mappingForm.memberName}
                    onChange={(e) =>
                      setMappingForm({ ...mappingForm, memberName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    กลุ่มงาน / ฝ่าย
                  </label>
                  <input
                    type="text"
                    value={mappingForm.division}
                    onChange={(e) =>
                      setMappingForm({ ...mappingForm, division: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMappingModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 font-semibold cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
                >
                  💾 บันทึกการจับคู่ User ID #{editingMappingUid}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                        onClick={() => handleToggleEditorMember(m)}
                        className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${
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
                    MySQL Password
                  </label>
                  <input
                    type="text"
                    value={mysqlConfig.password || ""}
                    onChange={(e) =>
                      setMysqlConfig({
                        ...mysqlConfig,
                        password: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
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
