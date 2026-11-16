"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AttendanceLogItem, ScannerUserMapping } from "@/lib/attendance-db";
import { getThaiFiscalPeriod } from "@/lib/attendance-rules";
import { toThaiDate } from "@/lib/thai-numerals";

interface DailyAttendanceReportProps {
  mappings: Record<number, ScannerUserMapping>;
  availableDates: string[];
  defaultDate: string;
  showToast: (msg: string) => void;
}

const REPORT_UID_MIN = 2;
const REPORT_UID_MAX = 42;
const EXCLUDED_REPORT_UIDS = new Set<number>([3]);
const REPORT_UIDS = Array.from(
  { length: REPORT_UID_MAX - REPORT_UID_MIN + 1 },
  (_, i) => REPORT_UID_MIN + i
).filter((uid) => !EXCLUDED_REPORT_UIDS.has(uid));

type DailyStatusKey =
  | "complete"
  | "checked_in"
  | "late_complete"
  | "late_only"
  | "midday_only"
  | "absent";

interface DailyPersonRow {
  uid: number;
  memberName: string;
  division: string;
  position: string;
  isMapped: boolean;
  checkInTime: string | null;
  checkInIoMode: number | null;
  checkOutTime: string | null;
  scanCount: number;
  middayCount: number;
  statusKey: DailyStatusKey;
  statusLabel: string;
}

function extractTimePart(scanTimestamp: string): string {
  const parts = String(scanTimestamp || "").trim().split(/\s+/);
  return parts[1] || parts[0] || "-";
}

function csvCell(val: unknown): string {
  const s = String(val ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

export function DailyAttendanceReport({
  mappings,
  availableDates,
  defaultDate,
  showToast,
}: DailyAttendanceReportProps) {
  const [reportDate, setReportDate] = useState<string>(defaultDate);
  const [dayLogs, setDayLogs] = useState<AttendanceLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "present" | "late" | "absent" | "mapped"
  >("all");

  const fetchDailyLogs = useCallback(
    async (targetDate: string) => {
      if (!targetDate) return;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          dateFrom: targetDate,
          dateTo: targetDate,
          page: "1",
          pageSize: "1000",
        });
        const res = await fetch(`/api/attendance?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (data?.success && Array.isArray(data.logs)) {
          setDayLogs(data.logs);
        } else {
          setDayLogs([]);
        }
      } catch {
        showToast("โหลดรายงานประจำวันไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    fetchDailyLogs(reportDate);
  }, [reportDate, fetchDailyLogs]);

  const rows: DailyPersonRow[] = useMemo(() => {
    const byUid = new Map<number, AttendanceLogItem[]>();
    for (const item of dayLogs) {
      if (item.isDeleted) continue;
      const uid = Number(item.scannerUserId);
      if (uid < REPORT_UID_MIN || uid > REPORT_UID_MAX || EXCLUDED_REPORT_UIDS.has(uid)) continue;
      const list = byUid.get(uid) || [];
      list.push(item);
      byUid.set(uid, list);
    }

    return REPORT_UIDS.map((uid) => {
      const mapping = mappings[uid];
      const memberName =
        mapping?.memberName || `บุคลากร พมจ. (รหัสสแกน #${uid})`;
      const division =
        mapping?.division ||
        "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร";
      const position = mapping?.position || "-";
      const isMapped = Boolean(mapping?.isMapped);

      const scans = (byUid.get(uid) || [])
        .slice()
        .sort((a, b) => a.scanTimestamp.localeCompare(b.scanTimestamp));

      const checkInScan =
        scans.find((s) => s.ioMode === 1 || s.ioMode === 3) ||
        scans.find((s) => extractTimePart(s.scanTimestamp) < "12:00:00") ||
        null;

      const checkOutCandidates = scans.filter((s) => s.ioMode === 2);
      const checkOutScan =
        checkOutCandidates.length > 0
          ? checkOutCandidates[checkOutCandidates.length - 1]
          : scans.find(
              (s) =>
                s.id !== checkInScan?.id &&
                extractTimePart(s.scanTimestamp) >= "12:00:00"
            ) || null;

      const middayCount = scans.filter((s) => s.ioMode === 4).length;

      const checkInTime = checkInScan
        ? extractTimePart(checkInScan.scanTimestamp)
        : null;
      const checkOutTime = checkOutScan
        ? extractTimePart(checkOutScan.scanTimestamp)
        : null;
      const checkInIoMode = checkInScan ? checkInScan.ioMode : null;

      let statusKey: DailyStatusKey = "absent";
      let statusLabel = "ยังไม่พบข้อมูลสแกน";

      if (scans.length === 0) {
        statusKey = "absent";
        statusLabel = "ยังไม่พบข้อมูลสแกน";
      } else if (checkInScan && checkOutScan) {
        if (checkInIoMode === 3) {
          statusKey = "late_complete";
          statusLabel = "สาย / เข้า-ออกครบ";
        } else {
          statusKey = "complete";
          statusLabel = "เข้า-ออกครบ";
        }
      } else if (checkInScan) {
        if (checkInIoMode === 3) {
          statusKey = "late_only";
          statusLabel = "สาย / อาจลาช่วงเช้า";
        } else {
          statusKey = "checked_in";
          statusLabel = "เข้างานแล้ว (รอออก)";
        }
      } else if (checkOutScan) {
        statusKey = "checked_in";
        statusLabel = "สแกนออกงาน (ไม่พบสแกนเข้า)";
      } else {
        statusKey = "midday_only";
        statusLabel = "สแกนระหว่างวันเท่านั้น";
      }

      return {
        uid,
        memberName,
        division,
        position,
        isMapped,
        checkInTime,
        checkInIoMode,
        checkOutTime,
        scanCount: scans.length,
        middayCount,
        statusKey,
        statusLabel,
      };
    });
  }, [dayLogs, mappings]);

  const stats = useMemo(() => {
    const total = rows.length;
    const onTime = rows.filter(
      (r) => r.statusKey === "complete" || r.statusKey === "checked_in"
    ).length;
    const late = rows.filter(
      (r) => r.statusKey === "late_complete" || r.statusKey === "late_only"
    ).length;
    const checkedOut = rows.filter((r) => r.checkOutTime !== null).length;
    const absent = rows.filter((r) => r.statusKey === "absent").length;
    return { total, onTime, late, checkedOut, absent };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter === "present" && r.statusKey === "absent") return false;
      if (
        statusFilter === "late" &&
        r.statusKey !== "late_complete" &&
        r.statusKey !== "late_only"
      ) {
        return false;
      }
      if (statusFilter === "absent" && r.statusKey !== "absent") return false;
      if (statusFilter === "mapped" && !r.isMapped) return false;

      if (!q) return true;
      return (
        String(r.uid).includes(q) ||
        r.memberName.toLowerCase().includes(q) ||
        r.division.toLowerCase().includes(q) ||
        r.position.toLowerCase().includes(q)
      );
    });
  }, [rows, searchText, statusFilter]);

  const handleExportDailyCsv = () => {
    const headers = [
      "ID",
      "ชื่อ-นามสกุล",
      "ตำแหน่ง",
      "กลุ่มงาน",
      "วันที่",
      "เวลาเข้างาน",
      "เวลาออกงาน",
      "จำนวนสแกน",
      "สถานะประจำวัน",
    ];
    const body = filteredRows.map((r) =>
      [
        String(r.uid),
        csvCell(r.memberName),
        csvCell(r.position),
        csvCell(r.division),
        csvCell(reportDate),
        csvCell(r.checkInTime || "-"),
        csvCell(r.checkOutTime || "-"),
        String(r.scanCount),
        csvCell(r.statusLabel),
      ].join(",")
    );
    const csv = "\uFEFF" + [headers.join(","), ...body].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `รายงานลงเวลาประจำวัน_ID2-42_${reportDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`ส่งออกรายงานประจำวัน ${reportDate} (ID 2-42) เรียบร้อยแล้ว`);
  };

  const thaiDateLabel = toThaiDate(reportDate);

  return (
    <div className="space-y-4 mt-4">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 print:border-none print:shadow-none print:p-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>📊</span>
              <span>รายงานการลงเวลาปฏิบัติราชการประจำวัน (ID #2 – #42 ยกเว้น #3)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ประจำวันที่ {thaiDateLabel} • รายชื่อบุคลากรครบทั้ง {REPORT_UIDS.length} รหัส
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <input
              type="date"
              aria-label="เลือกวันที่รายงานประจำวัน"
              value={reportDate}
              onChange={(e) => {
                if (e.target.value) setReportDate(e.target.value);
              }}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
            />
            <button
              type="button"
              onClick={() => fetchDailyLogs(reportDate)}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-50"
            >
              {loading ? "⏳ กำลังโหลด..." : "🔄 รีเฟรช"}
            </button>
            <button
              type="button"
              onClick={handleExportDailyCsv}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold cursor-pointer"
            >
              📥 CSV ประจำวัน
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
            >
              🖨️ พิมพ์รายงาน
            </button>
          </div>
        </div>

        {/* Quick Date Pills */}
        <div className="flex flex-wrap items-center gap-1.5 print:hidden">
          <button
            type="button"
            onClick={() => setReportDate(defaultDate)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
              reportDate === defaultDate
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            วันนี้ ({getThaiFiscalPeriod(defaultDate).dateShortBE})
          </button>
          {availableDates
            .filter((d) => d !== defaultDate)
            .slice(0, 6)
            .map((d) => {
              const p = getThaiFiscalPeriod(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setReportDate(d)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] cursor-pointer ${
                    reportDate === d
                      ? "bg-indigo-600 text-white font-semibold"
                      : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {p.dateShortBE}
                </button>
              );
            })}
        </div>

        {/* 5 Daily KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 px-3 py-2">
            <div className="text-[10px] font-semibold text-slate-500">รายชื่อทั้งหมด (ID 2–42 ยกเว้น #3)</div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
              {stats.total} คน
            </div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/30 px-3 py-2">
            <div className="text-[10px] font-semibold text-emerald-700">เข้าตรงเวลา</div>
            <div className="text-lg font-extrabold text-emerald-800 dark:text-emerald-300 tabular-nums">
              {stats.onTime} คน
            </div>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 dark:bg-rose-950/30 px-3 py-2">
            <div className="text-[10px] font-semibold text-rose-700">สาย / ลาช่วงเช้า</div>
            <div className="text-lg font-extrabold text-rose-800 dark:text-rose-300 tabular-nums">
              {stats.late} คน
            </div>
          </div>
          <div className="rounded-xl border border-sky-200 bg-sky-50/70 dark:bg-sky-950/30 px-3 py-2">
            <div className="text-[10px] font-semibold text-sky-700">สแกนออกงานแล้ว</div>
            <div className="text-lg font-extrabold text-sky-800 dark:text-sky-300 tabular-nums">
              {stats.checkedOut} คน
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-100/80 dark:bg-slate-800 px-3 py-2">
            <div className="text-[10px] font-semibold text-slate-600">ยังไม่พบข้อมูลสแกน</div>
            <div className="text-lg font-extrabold text-slate-700 dark:text-slate-300 tabular-nums">
              {stats.absent} คน
            </div>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="flex flex-wrap items-center gap-2 pt-1 print:hidden">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="ค้นหา ID, ชื่อ-นามสกุล, กลุ่มงาน..."
            className="flex-1 min-w-[200px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
          />
          <select
            aria-label="กรองตามสถานะประจำวัน"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value as "all" | "present" | "late" | "absent" | "mapped"
              )
            }
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
          >
            <option value="all">แสดงครบทุก ID (2–42 ยกเว้น #3)</option>
            <option value="present">เฉพาะผู้มีสแกนวันนี้</option>
            <option value="late">เฉพาะมาสาย / อาจลาช่วงเช้า</option>
            <option value="absent">เฉพาะยังไม่พบข้อมูลสแกน</option>
            <option value="mapped">เฉพาะที่จับคู่ชื่อแล้ว</option>
          </select>
        </div>
      </div>

      {/* 41-Row Daily Report Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden print:border-slate-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/70 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <th className="py-2.5 px-3 w-16 text-center">ID</th>
                <th className="py-2.5 px-3">ชื่อ-นามสกุล / ตำแหน่ง / กลุ่มงาน</th>
                <th className="py-2.5 px-3 text-center">เวลาเข้างาน</th>
                <th className="py-2.5 px-3 text-center">เวลาออกงาน</th>
                <th className="py-2.5 px-3 text-center">สแกน (ครั้ง)</th>
                <th className="py-2.5 px-3 text-center">สถานะประจำวัน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredRows.map((row) => {
                const badgeClass =
                  row.statusKey === "complete"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : row.statusKey === "checked_in"
                    ? "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
                    : row.statusKey === "late_complete" || row.statusKey === "late_only"
                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                    : row.statusKey === "midday_only"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";

                const statusIcon =
                  row.statusKey === "complete"
                    ? "✅"
                    : row.statusKey === "checked_in"
                    ? "🟢"
                    : row.statusKey === "late_complete" || row.statusKey === "late_only"
                    ? "⚠️"
                    : row.statusKey === "midday_only"
                    ? "🕒"
                    : "⬜";

                return (
                  <tr
                    key={row.uid}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                      row.statusKey === "absent" ? "opacity-80" : ""
                    }`}
                  >
                    <td className="py-2 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-200">
                      #{row.uid}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {row.memberName}
                        </span>
                        {!row.isMapped && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-semibold">
                            ยังไม่จับคู่ชื่อ
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-md">
                        {row.position !== "-" ? `${row.position} • ` : ""}
                        {row.division}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-semibold">
                      {row.checkInTime ? (
                        <span
                          className={
                            row.checkInIoMode === 3
                              ? "text-rose-700 dark:text-rose-400"
                              : "text-emerald-700 dark:text-emerald-400"
                          }
                        >
                          {row.checkInTime}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center font-mono font-semibold">
                      {row.checkOutTime ? (
                        <span className="text-sky-700 dark:text-sky-400">
                          {row.checkOutTime}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-slate-600 dark:text-slate-300">
                      {row.scanCount > 0 ? row.scanCount : "-"}
                      {row.middayCount > 0 && (
                        <span className="ml-1 text-[10px] text-amber-600">
                          (ระหว่างวัน {row.middayCount})
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badgeClass}`}
                      >
                        <span>{statusIcon}</span>
                        <span>{row.statusLabel}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
