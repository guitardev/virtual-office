"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AttendanceLogItem, ScannerUserMapping } from "@/lib/attendance-db";
import { getThaiFiscalPeriod } from "@/lib/attendance-rules";
import { toThaiDate } from "@/lib/thai-numerals";
import {
  DailyReportSheetSpec,
  downloadDailyAttendanceXlsx,
} from "@/lib/attendance-xlsx-export";
import { downloadDailyAttendanceDocx } from "@/lib/attendance-docx-export";
import { downloadDailyAttendancePdf } from "@/lib/attendance-pdf-export";

type DailyNoteType =
  | "general"
  | "sick_leave"
  | "personal_leave"
  | "vacation_leave"
  | "official_trip"
  | "wfh"
  | "other";

interface DailyNoteRecord {
  id: string;
  workDate: string;
  scannerUserId: number;
  userId: string | null;
  noteType: DailyNoteType;
  noteText: string;
  refType: string | null;
  refId: string | null;
  updatedByName?: string | null;
}

interface DailyAttendanceReportProps {
  mappings: Record<number, ScannerUserMapping>;
  availableDates: string[];
  defaultDate: string;
  showToast: (msg: string) => void;
  canEdit?: boolean;
  currentUserId?: string;
  currentUserName?: string;
}

const REPORT_UID_MIN = 2;
const REPORT_UID_MAX = 42;
const EXCLUDED_REPORT_UIDS = new Set<number>([3, 16]);
const REPORT_UIDS = Array.from(
  { length: REPORT_UID_MAX - REPORT_UID_MIN + 1 },
  (_, i) => REPORT_UID_MIN + i
).filter((uid) => !EXCLUDED_REPORT_UIDS.has(uid));

const NOTE_TYPE_OPTIONS: Array<{ value: DailyNoteType; label: string; autoText: string }> = [
  { value: "general", label: "📝 ทั่วไป / กำหนดเอง", autoText: "" },
  { value: "sick_leave", label: "🤒 ลาป่วย", autoText: "ลาป่วย" },
  { value: "personal_leave", label: "📋 ลากิจส่วนตัว", autoText: "ลากิจ" },
  { value: "vacation_leave", label: "🌴 ลาพักผ่อน", autoText: "ลาพักผ่อน" },
  { value: "official_trip", label: "🚗 ไปราชการ", autoText: "ไปราชการ" },
  { value: "wfh", label: "💻 ปฏิบัติงานนอกสถานที่ (WFH)", autoText: "ปฏิบัติงานนอกสถานที่" },
  { value: "other", label: "📌 อื่นๆ", autoText: "" },
];

const DAILY_NOTES_MIGRATION_SQL = `CREATE TABLE IF NOT EXISTS public.attendance_daily_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_date date NOT NULL,
  scanner_user_id integer NOT NULL,
  user_id text REFERENCES public.users(id) ON DELETE SET NULL,
  note_type text NOT NULL DEFAULT 'general' CHECK (note_type IN ('general', 'sick_leave', 'personal_leave', 'vacation_leave', 'official_trip', 'wfh', 'other')),
  note_text text NOT NULL DEFAULT '',
  ref_type text,
  ref_id text,
  updated_by text,
  updated_by_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (work_date, scanner_user_id)
);

ALTER TABLE public.attendance_daily_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all read attendance_daily_notes" ON public.attendance_daily_notes FOR SELECT USING (true);
CREATE POLICY "Allow all write attendance_daily_notes" ON public.attendance_daily_notes FOR ALL USING (true) WITH CHECK (true);`;

type StaffGroupKey = "civil_or_emp" | "fund_or_contract";

interface DailyPersonRow {
  uid: number;
  userId: string | null;
  memberName: string;
  personnelType: string;
  groupKey: StaffGroupKey;
  checkInHHMM: string | null;
  checkOutHHMM: string | null;
  checkInIoMode: number | null;
  scanCount: number;
  note: DailyNoteRecord | null;
}

function extractHHMM(scanTimestamp: string): string | null {
  const parts = String(scanTimestamp || "").trim().split(/\s+/);
  const timePart = parts[1] || parts[0] || "";
  const m = timePart.match(/^(\d{2}:\d{2})/);
  return m ? m[1] : null;
}

function classifyGroup(personnelType?: string | null): StaffGroupKey {
  const t = String(personnelType || "").trim();
  if (t === "ข้าราชการ" || t === "พนักงานราชการ") {
    return "civil_or_emp";
  }
  return "fund_or_contract";
}

function sortByCheckIn(a: DailyPersonRow, b: DailyPersonRow): number {
  if (a.checkInHHMM && b.checkInHHMM) {
    const cmp = a.checkInHHMM.localeCompare(b.checkInHHMM);
    return cmp !== 0 ? cmp : a.uid - b.uid;
  }
  if (a.checkInHHMM && !b.checkInHHMM) return -1;
  if (!a.checkInHHMM && b.checkInHHMM) return 1;
  return a.uid - b.uid;
}

export function DailyAttendanceReport({
  mappings,
  availableDates,
  defaultDate,
  showToast,
  canEdit = false,
  currentUserId,
  currentUserName,
}: DailyAttendanceReportProps) {
  const [reportDate, setReportDate] = useState<string>(defaultDate);
  const [dayLogs, setDayLogs] = useState<AttendanceLogItem[]>([]);
  const [notesByUid, setNotesByUid] = useState<Record<number, DailyNoteRecord>>({});
  const [needsMigration, setNeedsMigration] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [groupFilter, setGroupFilter] = useState<"both" | StaffGroupKey>("both");
  const [searchText, setSearchText] = useState<string>("");

  // Note Modal State
  const [editingRow, setEditingRow] = useState<DailyPersonRow | null>(null);
  const [noteType, setNoteType] = useState<DailyNoteType>("general");
  const [noteText, setNoteText] = useState<string>("");
  const [refType, setRefType] = useState<string>("");
  const [refId, setRefId] = useState<string>("");
  const [savingNote, setSavingNote] = useState<boolean>(false);

  const reportRef = useRef<HTMLDivElement | null>(null);

  const fetchDailyData = useCallback(
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
        const [attRes, notesRes] = await Promise.all([
          fetch(`/api/attendance?${params.toString()}`, { cache: "no-store" }),
          fetch(`/api/attendance/daily-notes?date=${encodeURIComponent(targetDate)}`, {
            cache: "no-store",
          }),
        ]);

        const attData = await attRes.json();
        if (attData?.success && Array.isArray(attData.logs)) {
          setDayLogs(attData.logs);
        } else {
          setDayLogs([]);
        }

        const notesData = await notesRes.json();
        if (notesData?.success) {
          setNeedsMigration(Boolean(notesData.needsMigration));
          const map: Record<number, DailyNoteRecord> = {};
          for (const n of notesData.notes || []) {
            map[Number(n.scannerUserId)] = n;
          }
          setNotesByUid(map);
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
    fetchDailyData(reportDate);
  }, [reportDate, fetchDailyData]);

  const allRows: DailyPersonRow[] = useMemo(() => {
    const byUid = new Map<number, AttendanceLogItem[]>();
    for (const item of dayLogs) {
      if (item.isDeleted) continue;
      const uid = Number(item.scannerUserId);
      if (
        uid < REPORT_UID_MIN ||
        uid > REPORT_UID_MAX ||
        EXCLUDED_REPORT_UIDS.has(uid)
      ) {
        continue;
      }
      const list = byUid.get(uid) || [];
      list.push(item);
      byUid.set(uid, list);
    }

    return REPORT_UIDS.map((uid) => {
      const mapping = mappings[uid];
      const memberName =
        mapping?.memberName || `บุคลากร พมจ. (รหัสสแกน #${uid})`;
      const personnelType = mapping?.personnelType || "";
      const groupKey = classifyGroup(personnelType);

      const scans = (byUid.get(uid) || [])
        .slice()
        .sort((a, b) => a.scanTimestamp.localeCompare(b.scanTimestamp));

      const checkInScan =
        scans.find((s) => s.ioMode === 1 || s.ioMode === 3) ||
        scans.find((s) => (extractHHMM(s.scanTimestamp) || "") < "12:00") ||
        null;

      const checkOutCandidates = scans.filter((s) => s.ioMode === 2);
      const afternoonScans = scans.filter(
        (s) =>
          s.id !== checkInScan?.id &&
          (extractHHMM(s.scanTimestamp) || "") >= "12:00"
      );
      const checkOutScan =
        checkOutCandidates.length > 0
          ? checkOutCandidates[checkOutCandidates.length - 1]
          : afternoonScans.length > 0
          ? afternoonScans[afternoonScans.length - 1]
          : null;

      return {
        uid,
        userId: mapping?.userId || null,
        memberName,
        personnelType,
        groupKey,
        checkInHHMM: checkInScan ? extractHHMM(checkInScan.scanTimestamp) : null,
        checkOutHHMM: checkOutScan ? extractHHMM(checkOutScan.scanTimestamp) : null,
        checkInIoMode: checkInScan ? checkInScan.ioMode : null,
        scanCount: scans.length,
        note: notesByUid[uid] || null,
      };
    });
  }, [dayLogs, mappings, notesByUid]);

  const { group1Rows, group2Rows } = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const matchSearch = (r: DailyPersonRow) =>
      !q ||
      String(r.uid).includes(q) ||
      r.memberName.toLowerCase().includes(q) ||
      (r.note?.noteText || "").toLowerCase().includes(q);

    const g1 = allRows
      .filter((r) => r.groupKey === "civil_or_emp" && matchSearch(r))
      .sort(sortByCheckIn);
    const g2 = allRows
      .filter((r) => r.groupKey === "fund_or_contract" && matchSearch(r))
      .sort(sortByCheckIn);
    return { group1Rows: g1, group2Rows: g2 };
  }, [allRows, searchText]);

  const thaiDateLabel = toThaiDate(reportDate);

  const openNoteModal = (row: DailyPersonRow) => {
    setEditingRow(row);
    setNoteType(row.note?.noteType || "general");
    setNoteText(row.note?.noteText || "");
    setRefType(row.note?.refType || "");
    setRefId(row.note?.refId || "");
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;
    setSavingNote(true);
    try {
      const res = await fetch("/api/attendance/daily-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workDate: reportDate,
          scannerUserId: editingRow.uid,
          userId: editingRow.userId,
          noteType,
          noteText: noteText.trim(),
          refType: refType.trim() || null,
          refId: refId.trim() || null,
          updatedBy: currentUserId || null,
          updatedByName: currentUserName || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        if (data?.needsMigration) setNeedsMigration(true);
        throw new Error(data?.error || "บันทึกหมายเหตุไม่สำเร็จ");
      }
      showToast("✅ บันทึกหมายเหตุประจำวันเรียบร้อยแล้ว");
      setEditingRow(null);
      await fetchDailyData(reportDate);
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message || "บันทึกหมายเหตุไม่สำเร็จ";
      showToast(`❌ ${msg}`);
    } finally {
      setSavingNote(false);
    }
  };

  const buildDailyReportSheets = (): DailyReportSheetSpec[] => [
    {
      sheetName: "ขรก.-พรก.",
      subtitle:
        "ตารางบันทึกเวลา เข้า - ออก ปฏิบัติราชการ ข้าราชการ/พนักงานราชการ",
      dateLabel: thaiDateLabel,
      rows: group1Rows.map((r, idx) => ({
        orderNo: idx + 1,
        name: r.memberName,
        checkInDisplay: r.checkInHHMM || "-----",
        checkOutDisplay: r.checkOutHHMM || "-----",
        noteDisplay: r.note?.noteText || "",
      })),
    },
    {
      sheetName: "พนง.กองทุน+จ้างเหมา",
      subtitle:
        "ตารางบันทึกเวลา เข้า - ออก ปฏิบัติราชการ พนง.กองทุน/พนง.จ้างเหมา",
      dateLabel: thaiDateLabel,
      rows: group2Rows.map((r, idx) => ({
        orderNo: idx + 1,
        name: r.memberName,
        checkInDisplay: r.checkInHHMM || "-----",
        checkOutDisplay: r.checkOutHHMM || "-----",
        noteDisplay: r.note?.noteText || "",
      })),
    },
  ];

  const handleExportXlsx = async () => {
    await downloadDailyAttendanceXlsx(
      buildDailyReportSheets(),
      `บันทึกเวลา_${thaiDateLabel}.xlsx`
    );
    showToast("📊 ส่งออกไฟล์ Excel 2 ชีท (.xlsx) เรียบร้อยแล้ว");
  };

  const handleExportDocx = async () => {
    await downloadDailyAttendanceDocx(
      buildDailyReportSheets(),
      `บันทึกเวลา_${thaiDateLabel}`,
      `บันทึกเวลา_${reportDate}.docx`
    );
    showToast("📝 ส่งออกไฟล์ Word (.docx) เรียบร้อยแล้ว");
  };

  const handleExportPdf = async () => {
    await downloadDailyAttendancePdf(
      buildDailyReportSheets(),
      `บันทึกเวลา_${thaiDateLabel}.pdf`
    );
    showToast("📄 ดาวน์โหลดไฟล์ PDF (.pdf) เรียบร้อยแล้ว");
  };

  const renderGroupSheet = (
    title: string,
    rows: DailyPersonRow[],
    pageBreakBefore = false
  ) => (
    <div
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-8 shadow-sm space-y-4 ${
        pageBreakBefore ? "break-before-page" : ""
      }`}
    >
      {/* Official Header matching Excel Template */}
      <div className="text-center space-y-0.5 text-slate-900 dark:text-white">
        <h3 className="text-sm sm:text-base font-bold">
          สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร
        </h3>
        <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
          {title}
        </h4>
        <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
          วันที่ {thaiDateLabel}
        </div>
      </div>

      {/* 5-Column Official Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse border border-slate-300 dark:border-slate-700">
          <thead>
            <tr className="bg-sky-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
              <th className="border border-slate-300 dark:border-slate-700 px-2 py-2 text-center w-16">
                ลำดับที่
              </th>
              <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-left">
                ชื่อ - สกุล
              </th>
              <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-center w-24">
                เข้า
              </th>
              <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-center w-24">
                ออก
              </th>
              <th className="border border-slate-300 dark:border-slate-700 px-3 py-2 text-left w-56">
                หมายเหตุ
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.uid}
                className="even:bg-slate-50/60 dark:even:bg-slate-800/30 hover:bg-indigo-50/40"
              >
                <td className="border border-slate-300 dark:border-slate-700 px-2 py-1.5 text-center tabular-nums">
                  {idx + 1}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 px-3 py-1.5 font-medium text-slate-900 dark:text-slate-100">
                  <span>{row.memberName}</span>
                  <span
                    data-docx-ignore="true"
                    data-pdf-ignore="true"
                    className="ml-1.5 text-[10px] font-mono text-slate-400 print:hidden"
                  >
                    (#{row.uid})
                  </span>
                </td>
                <td
                  className={`border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-center font-mono font-semibold ${
                    row.checkInHHMM
                      ? row.checkInIoMode === 3
                        ? "text-rose-700 dark:text-rose-400"
                        : "text-slate-900 dark:text-slate-100"
                      : "text-slate-400"
                  }`}
                >
                  {row.checkInHHMM || "-----"}
                </td>
                <td
                  className={`border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-center font-mono font-semibold ${
                    row.checkOutHHMM
                      ? "text-slate-900 dark:text-slate-100"
                      : "text-slate-400"
                  }`}
                >
                  {row.checkOutHHMM || "-----"}
                </td>
                <td className="border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-left">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-700 dark:text-slate-200 flex items-center gap-1.5 flex-wrap">
                      <span>{row.note?.noteText || ""}</span>
                      {row.note?.refType === "leave_request" && (
                        <span
                          data-docx-ignore="true"
                          data-pdf-ignore="true"
                          className="print:hidden inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold"
                        >
                          🔗 จากระบบใบลา
                        </span>
                      )}
                    </span>
                    {canEdit && (
                      <button
                        type="button"
                        data-docx-ignore="true"
                        data-pdf-ignore="true"
                        onClick={() => openNoteModal(row)}
                        className="print:hidden shrink-0 px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 text-[10px] font-semibold cursor-pointer"
                        title="ระบุ/แก้ไขหมายเหตุ (ลา/ไปราชการ)"
                      >
                        {row.note?.noteText ? "✏️ แก้ไข" : "+ หมายเหตุ"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Official Inspector Signature Block */}
      <div className="pt-6 text-center text-xs text-slate-800 dark:text-slate-200 space-y-1">
        <p className="text-center">
          ผู้ตรวจ..................................................................................
        </p>
        <p className="text-center font-semibold">(นางสาวมะลิวัน  สิทธิโยธี)</p>
        <p className="text-center">
          พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 mt-4">
      {/* Control Toolbar (Hidden on PDF/Docx Export) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>📊</span>
              <span>รายงานบันทึกเวลาเข้า - ออก ประจำวัน (แยก 2 ชุด • ครบ 39 คน)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              วันที่ {thaiDateLabel} • ข้าราชการ/พนักงานราชการ {group1Rows.length} คน • พนง.กองทุน/จ้างเหมา {group2Rows.length} คน
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
              onClick={() => fetchDailyData(reportDate)}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-50"
            >
              {loading ? "⏳ โหลด..." : "🔄 รีเฟรช"}
            </button>
            <button
              type="button"
              onClick={handleExportXlsx}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-xs"
            >
              📊 Excel 2 ชีท (.xlsx)
            </button>
            <button
              type="button"
              onClick={handleExportDocx}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold cursor-pointer"
            >
              📝 Word (.docx)
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
            >
              📄 PDF (A4)
            </button>
          </div>
        </div>

        {/* Migration Notice if attendance_daily_notes doesn't exist yet */}
        {needsMigration && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
            <div>
              <strong>⚠️ ยังไม่ได้สร้างตาราง <code>attendance_daily_notes</code> ใน Supabase</strong> — กรุณารัน SQL เพื่อเปิดใช้การบันทึกหมายเหตุ (ลา/ไปราชการ)
            </div>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(DAILY_NOTES_MIGRATION_SQL);
                showToast("📋 คัดลอก SQL สร้างตาราง attendance_daily_notes แล้ว");
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
            >
              📋 คัดลอก SQL
            </button>
          </div>
        )}

        {/* Quick Dates + Group Switcher + Search */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setGroupFilter("both")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                groupFilter === "both"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              แสดงทั้ง 2 ชุด (39 คน)
            </button>
            <button
              type="button"
              onClick={() => setGroupFilter("civil_or_emp")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                groupFilter === "civil_or_emp"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              1. ขรก./พรก. ({group1Rows.length})
            </button>
            <button
              type="button"
              onClick={() => setGroupFilter("fund_or_contract")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                groupFilter === "fund_or_contract"
                  ? "bg-teal-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              2. พนง.กองทุน/จ้างเหมา ({group2Rows.length})
            </button>
          </div>

          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="ค้นหาชื่อ, รหัสสแกน, หมายเหตุ..."
            className="w-full sm:w-64 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
          />
        </div>

        {/* Quick Date Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setReportDate(defaultDate)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
              reportDate === defaultDate
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600"
            }`}
          >
            วันนี้ ({getThaiFiscalPeriod(defaultDate).dateShortBE})
          </button>
          {availableDates
            .filter((d) => d !== defaultDate)
            .slice(0, 6)
            .map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setReportDate(d)}
                className={`px-2.5 py-1 rounded-lg text-[11px] cursor-pointer ${
                  reportDate === d
                    ? "bg-indigo-600 text-white font-semibold"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600"
                }`}
              >
                {getThaiFiscalPeriod(d).dateShortBE}
              </button>
            ))}
        </div>
      </div>

      {/* Printable / Exportable Sheets */}
      <div ref={reportRef} className="space-y-6">
        {(groupFilter === "both" || groupFilter === "civil_or_emp") &&
          renderGroupSheet(
            "ตารางบันทึกเวลา เข้า - ออก ปฏิบัติราชการ ข้าราชการ/พนักงานราชการ",
            group1Rows,
            false
          )}

        {(groupFilter === "both" || groupFilter === "fund_or_contract") &&
          renderGroupSheet(
            "ตารางบันทึกเวลา เข้า - ออก ปฏิบัติราชการ พนง.กองทุน/พนง.จ้างเหมา",
            group2Rows,
            groupFilter === "both"
          )}
      </div>

      {/* Daily Note Modal (Ready for future Leave / Official Trip linkage) */}
      {editingRow && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                  ✏️ หมายเหตุประจำวัน — {editingRow.memberName}
                </h4>
                <p className="text-[11px] text-slate-500">
                  วันที่ {thaiDateLabel} • รหัส #{editingRow.uid}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  ประเภทหมายเหตุ (รองรับเชื่อมใบลา/ไปราชการ)
                </label>
                <select
                  aria-label="ประเภทหมายเหตุ"
                  value={noteType}
                  onChange={(e) => {
                    const nextType = e.target.value as DailyNoteType;
                    setNoteType(nextType);
                    const found = NOTE_TYPE_OPTIONS.find(
                      (o) => o.value === nextType
                    );
                    if (found?.autoText && !noteText.trim()) {
                      setNoteText(found.autoText);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  {NOTE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-200 mb-1">
                  ข้อความในช่อง &ldquo;หมายเหตุ&rdquo; ของรายงาน
                </label>
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="เช่น ลาป่วย, ลากิจ, ไปราชการ อ.คลองลาน (เว้นว่างเพื่อลบ)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    อ้างอิงระบบ (ถ้ามี)
                  </label>
                  <select
                    aria-label="ระบบอ้างอิง"
                    value={refType}
                    onChange={(e) => setRefType(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px]"
                  >
                    <option value="">ไม่ระบุ</option>
                    <option value="leave_request">ระบบใบลา</option>
                    <option value="official_trip">คำสั่งไปราชการ</option>
                    <option value="car_booking">ใบขอใช้รถราชการ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    เลขที่อ้างอิง (Ref ID)
                  </label>
                  <input
                    type="text"
                    value={refId}
                    onChange={(e) => setRefId(e.target.value)}
                    placeholder="เช่น LV-2569-01"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRow(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingNote}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {savingNote ? "⏳ กำลังบันทึก..." : "💾 บันทึกหมายเหตุ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
