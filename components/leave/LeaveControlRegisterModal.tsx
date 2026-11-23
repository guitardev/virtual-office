"use client";

import React, { useMemo, useState } from "react";
import {
  buildLeaveRegisterData,
  downloadLeaveRegisterXlsx,
  LeaveRegisterMemberInfo,
} from "@/lib/leave-register";
import { LeaveBalanceItem, LeaveRequestItem } from "@/lib/leave-utils";

interface LeaveControlRegisterModalProps {
  member: LeaveRegisterMemberInfo;
  fiscalYear: number;
  requests: LeaveRequestItem[];
  balance?: LeaveBalanceItem | null;
  availableMembers?: LeaveRegisterMemberInfo[];
  onSelectMember?: (userId: string) => void;
  onClose: () => void;
}

function fmtCell(val: number | null | undefined): string {
  if (val === null || val === undefined) return "";
  return Number.isInteger(val) ? String(val) : String(Math.round(val * 10) / 10);
}

export default function LeaveControlRegisterModal({
  member,
  fiscalYear,
  requests,
  balance,
  availableMembers,
  onSelectMember,
  onClose,
}: LeaveControlRegisterModalProps) {
  const [exporting, setExporting] = useState(false);

  const registerData = useMemo(
    () =>
      buildLeaveRegisterData({
        member,
        fiscalYear,
        requests,
        balance,
      }),
    [member, fiscalYear, requests, balance]
  );

  const hasCarried =
    registerData.sickDaysCarried > 0 ||
    registerData.personalDaysCarried > 0 ||
    registerData.vacationDaysCarried > 0;
  const openingVacRemaining = Math.max(
    0,
    Math.round(
      (registerData.vacationEntitledDays - registerData.vacationDaysCarried) * 10
    ) / 10
  );

  // Pad minimum 20 empty ruled rows matching the official A4 paper sheet (rows 7..30)
  const blankRowCount = Math.max(0, 20 - registerData.rows.length);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await downloadLeaveRegisterXlsx(registerData);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #leave-register-sheet,
          #leave-register-sheet * {
            visibility: visible !important;
          }
          #leave-register-sheet {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            padding: 10mm 10mm !important;
            border: none !important;
            box-shadow: none !important;
            z-index: 99999 !important;
          }
        }
      `}</style>

      <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex flex-col print:bg-white">
        {/* Top Action Bar */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              📒 ทะเบียนคุมวันลารายบุคคล (ปีงบประมาณ {fiscalYear})
            </span>
            {availableMembers && availableMembers.length > 1 && onSelectMember && (
              <select
                aria-label="เลือกบุคลากรในทะเบียนคุมวันลา"
                value={member.userId}
                onChange={(e) => onSelectMember(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white"
              >
                {availableMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name} {m.division ? `(${m.division})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={exporting}
              onClick={handleExportExcel}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
            >
              {exporting ? "⏳ กำลังสร้าง..." : "📊 ดาวน์โหลด Excel (.xlsx)"}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
            >
              🖨️ พิมพ์ A4
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
            >
              ✕ ปิด
            </button>
          </div>
        </div>

        {/* Quick Summary Strip (hidden on print) */}
        <div className="bg-slate-100/90 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-center gap-3 text-xs print:hidden">
          <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-semibold">
            🤒 ลาป่วย: {registerData.summary.sickCount} ครั้ง ({registerData.summary.sickTotal} วัน)
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
            📋 ลากิจ: {registerData.summary.personalCount} ครั้ง ({registerData.summary.personalTotal} วัน)
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
            🌴 ลาพักผ่อน: ใช้ {registerData.summary.vacationTotal} / {registerData.vacationEntitledDays} วัน · คงเหลือ {registerData.summary.vacationRemaining} วัน
          </span>
          {registerData.summary.maternityTotal > 0 && (
            <span className="px-2.5 py-1 rounded-lg bg-pink-50 text-pink-700 border border-pink-200 font-semibold">
              👶 ลาคลอดบุตร: {registerData.summary.maternityTotal} วัน
            </span>
          )}
        </div>

        {/* Scrollable Official A4 Register Sheet */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 print:p-0 print:overflow-visible">
          <div
            id="leave-register-sheet"
            className="bg-white text-black mx-auto p-6 sm:p-8 border border-slate-300 shadow-lg"
            style={{
              width: "210mm",
              minHeight: "297mm",
              fontFamily: "'TH Sarabun New', 'Sarabun', sans-serif",
            }}
          >
            {/* Official Header matching Excel Template A1:L3 */}
            <div className="text-center space-y-1 mb-4">
              <h2 className="text-[20px] font-bold leading-snug">
                สถิติวันลาของข้าราชการ/พนักงานราชการ/พนักงานกองทุน
              </h2>
              <div className="text-[18px] font-bold leading-snug">
                สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร
              </div>
              <div className="text-[16px] pt-1">
                <span className="font-bold">ชื่อ</span>{" "}
                <span className="inline-block min-w-[230px] border-b border-dotted border-black px-2 text-center font-medium">
                  {registerData.member.name}
                </span>{" "}
                <span className="font-bold ml-2">ตำแหน่ง</span>{" "}
                <span className="inline-block min-w-[260px] border-b border-dotted border-black px-2 text-center font-medium">
                  {registerData.member.position || "-"}
                </span>
              </div>
            </div>

            {/* Official 12-Column Register Table matching A5:L30 */}
            <table className="w-full border-collapse border border-black text-[14px]">
              <thead>
                <tr className="bg-slate-50 print:bg-white">
                  <th
                    rowSpan={2}
                    className="border border-black px-1.5 py-1.5 text-center font-bold w-[17%]"
                  >
                    วัน/เดือน/ปี
                  </th>
                  <th
                    colSpan={3}
                    className="border border-black px-1 py-1 text-center font-bold"
                  >
                    ลาป่วย
                  </th>
                  <th
                    colSpan={3}
                    className="border border-black px-1 py-1 text-center font-bold"
                  >
                    ลากิจ
                  </th>
                  <th
                    colSpan={4}
                    className="border border-black px-1 py-1 text-center font-bold"
                  >
                    ลาพักผ่อน
                  </th>
                  <th
                    rowSpan={2}
                    className="border border-black px-1.5 py-1.5 text-center font-bold w-[21%]"
                  >
                    หมายเหตุ
                  </th>
                </tr>
                <tr className="bg-slate-50 print:bg-white">
                  <th className="border border-black px-1 py-1 text-center font-bold w-[5.8%]">
                    ครั้งที่
                  </th>
                  <th className="border border-black px-1 py-1 text-center font-bold w-[5.8%]">
                    วัน
                  </th>
                  <th className="border border-black px-1 py-1 text-center font-bold w-[5.8%]">
                    รวม
                  </th>
                  <th className="border border-black px-1 py-1 text-center font-bold w-[5.8%]">
                    ครั้งที่
                  </th>
                  <th className="border border-black px-1 py-1 text-center font-bold w-[5.8%]">
                    วัน
                  </th>
                  <th className="border border-black px-1 py-1 text-center font-bold w-[5.8%]">
                    รวม
                  </th>
                  <th className="border border-black px-1 py-1 text-center font-bold w-[5.8%]">
                    ครั้งที่
                  </th>
                  <th className="border border-black px-1 py-1 text-center font-bold w-[5.8%]">
                    วัน
                  </th>
                  <th className="border border-black px-1 py-1 text-center font-bold w-[5.8%]">
                    รวม
                  </th>
                  <th className="border border-black px-1 py-1 text-center font-bold w-[6.8%]">
                    คงเหลือ
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Row 7: Opening balance & vacation entitlement (สะสม ... ประจำปี ...) */}
                <tr className="h-[30px] bg-slate-50/50 print:bg-white">
                  <td className="border border-black px-1.5 py-1 text-center text-[13px] font-medium">
                    {hasCarried ? `ยอดยกมา (${fiscalYear})` : ""}
                  </td>
                  <td className="border border-black px-1 py-1 text-center" />
                  <td className="border border-black px-1 py-1 text-center" />
                  <td className="border border-black px-1 py-1 text-center font-semibold">
                    {registerData.sickDaysCarried > 0
                      ? fmtCell(registerData.sickDaysCarried)
                      : ""}
                  </td>
                  <td className="border border-black px-1 py-1 text-center" />
                  <td className="border border-black px-1 py-1 text-center" />
                  <td className="border border-black px-1 py-1 text-center font-semibold">
                    {registerData.personalDaysCarried > 0
                      ? fmtCell(registerData.personalDaysCarried)
                      : ""}
                  </td>
                  <td className="border border-black px-1 py-1 text-center" />
                  <td className="border border-black px-1 py-1 text-center" />
                  <td className="border border-black px-1 py-1 text-center font-semibold">
                    {registerData.vacationDaysCarried > 0
                      ? fmtCell(registerData.vacationDaysCarried)
                      : ""}
                  </td>
                  <td className="border border-black px-1 py-1 text-center font-bold">
                    {fmtCell(openingVacRemaining)}
                  </td>
                  <td className="border border-black px-1.5 py-1 text-left text-[13px] font-semibold">
                    {registerData.openingNote}
                  </td>
                </tr>

                {/* Chronological approved leave entries */}
                {registerData.rows.map((row) => (
                  <tr key={row.id} className="h-[30px]">
                    <td className="border border-black px-1.5 py-1 text-left text-[13px] whitespace-nowrap">
                      {row.dateLabel}
                    </td>
                    <td className="border border-black px-1 py-1 text-center">
                      {fmtCell(row.sickCount)}
                    </td>
                    <td className="border border-black px-1 py-1 text-center">
                      {fmtCell(row.sickDays)}
                    </td>
                    <td className="border border-black px-1 py-1 text-center font-semibold">
                      {fmtCell(row.sickTotal)}
                    </td>
                    <td className="border border-black px-1 py-1 text-center">
                      {fmtCell(row.personalCount)}
                    </td>
                    <td className="border border-black px-1 py-1 text-center">
                      {fmtCell(row.personalDays)}
                    </td>
                    <td className="border border-black px-1 py-1 text-center font-semibold">
                      {fmtCell(row.personalTotal)}
                    </td>
                    <td className="border border-black px-1 py-1 text-center">
                      {fmtCell(row.vacationCount)}
                    </td>
                    <td className="border border-black px-1 py-1 text-center">
                      {fmtCell(row.vacationDays)}
                    </td>
                    <td className="border border-black px-1 py-1 text-center font-semibold">
                      {fmtCell(row.vacationTotal)}
                    </td>
                    <td className="border border-black px-1 py-1 text-center font-bold">
                      {fmtCell(row.vacationRemaining)}
                    </td>
                    <td className="border border-black px-1.5 py-1 text-left text-[12px]">
                      {row.note}
                    </td>
                  </tr>
                ))}

                {/* Blank ruled rows to match official paper register form */}
                {Array.from({ length: blankRowCount }).map((_, idx) => (
                  <tr key={`blank-${idx}`} className="h-[28px]">
                    {Array.from({ length: 12 }).map((__, colIdx) => (
                      <td key={colIdx} className="border border-black px-1 py-1" />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
