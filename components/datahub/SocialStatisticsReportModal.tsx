"use client";

import React, { useMemo, useRef, useState } from "react";
import { GarudaEmblem } from "@/components/circular/GarudaEmblem";
import {
  DistrictSocialStat,
  calculateProvinceTotals,
  exportSocialStatsToCsv,
} from "@/lib/social-statistics";
import {
  KPP_MSO_LOGBOOK,
  MSO_HOUSING_TYPE_LABELS,
  MSO_VULNERABILITY_LEVELS,
  getKppDimensionSummaries,
} from "@/lib/mso-logbook-kpp";
import { downloadElementAsDocx } from "@/lib/word-export";
import { toThaiDate } from "@/lib/thai-numerals";
import { Member } from "@/lib/types";

interface SocialStatisticsReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: DistrictSocialStat[];
  fiscalYear: string;
  currentUser: Member;
  selectedDistrictName?: string;
  director?: Member | null;
}

type ReportScope = "full" | "mso" | "districts";

const fmtInt = (n: number) => Number(n || 0).toLocaleString("th-TH");
const fmtOrNA = (n: number | null | undefined) =>
  n == null ? "NA" : Number(n).toLocaleString("th-TH");
const fmtPct = (num: number, den: number) =>
  den > 0 ? ((num / den) * 100).toFixed(1) : "0.0";

export function SocialStatisticsReportModal({
  isOpen,
  onClose,
  stats,
  fiscalYear,
  currentUser,
  selectedDistrictName,
  director,
}: SocialStatisticsReportModalProps) {
  const [scope, setScope] = useState<ReportScope>("full");
  const [copied, setCopied] = useState(false);
  const reportRef = useRef<HTMLDivElement | null>(null);

  const totals = useMemo(() => calculateProvinceTotals(stats), [stats]);
  const dimSummaries = useMemo(() => getKppDimensionSummaries(), []);

  if (!isOpen) return null;

  const { main, housing, welfare } = KPP_MSO_LOGBOOK;
  const todayThai = toThaiDate(new Date().toISOString().split("T")[0]);

  const dimTotals = dimSummaries.reduce(
    (acc, row) => {
      acc.total += row.total;
      acc.noplan += row.noplan;
      acc.tracked += row.tracked;
      acc.ongoing += row.ongoing;
      acc.closed += row.closed;
      return acc;
    },
    { total: 0, noplan: 0, tracked: 0, ongoing: 0, closed: 0 }
  );

  const housingEntries = Object.entries(housing);
  const housingTotals = housingEntries.reduce(
    (acc, [, row]) => {
      acc.people += row.people;
      acc.households += row.households;
      row.types.forEach((v, idx) => {
        acc.types[idx] += v;
      });
      return acc;
    },
    { people: 0, households: 0, types: [0, 0, 0, 0] as [number, number, number, number] }
  );

  const level2Plus3 = main.lvls[2] + main.lvls[3];
  const top3Dims = dimSummaries.slice(0, 3);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    exportSocialStatsToCsv(stats, fiscalYear);
  };

  const handleExportWord = () => {
    if (!reportRef.current) return;
    downloadElementAsDocx(
      reportRef.current,
      `รายงานสถานการณ์กลุ่มเปราะบาง จังหวัดกำแพงเพชร ประจำปีงบประมาณ พ.ศ. ${fiscalYear}`,
      `รายงานสถานการณ์กลุ่มเปราะบาง_กำแพงเพชร_${fiscalYear}.docx`
    );
  };

  const handleCopyReport = async () => {
    if (!reportRef.current) return;
    const text = reportRef.current.innerText.replace(/\n{3,}/g, "\n\n").trim();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for restricted clipboard environments
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto print:static print:bg-white print:p-0 print:block">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden print:shadow-none print:max-h-none print:rounded-none print:w-full">
        {/* Top Action Bar (Hidden in Print) */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3.5 bg-slate-50 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-600/10 flex items-center justify-center text-teal-700 shrink-0 text-base">
              🏛️
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                รายงานสถานการณ์กลุ่มเปราะบาง (MSO-Logbook & 11 อำเภอ)
              </h3>
              <p className="text-xs text-slate-500">
                จังหวัดกำแพงเพชร ({main.region}) • ปีงบประมาณ พ.ศ. {fiscalYear}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Scope Switcher */}
            <div className="inline-flex items-center rounded-xl bg-slate-200/70 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setScope("full")}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors ${
                  scope === "full"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ครบชุด
              </button>
              <button
                type="button"
                onClick={() => setScope("mso")}
                className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                  scope === "mso"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                MSO-Logbook
              </button>
              <button
                type="button"
                onClick={() => setScope("districts")}
                className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                  scope === "districts"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                11 อำเภอ
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyReport}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors"
            >
              {copied ? "✓ คัดลอกแล้ว" : "📋 คัดลอกข้อความ"}
            </button>

            <button
              type="button"
              onClick={handleExportWord}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
            >
              📝 Word (.docx)
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
            >
              📊 Excel (.csv)
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-sm"
            >
              🖨️ พิมพ์ / PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="ปิดหน้าต่าง"
              className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 rounded-xl transition-colors font-bold text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable A4 Report Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/70 print:bg-white print:p-0 print:overflow-visible">
          <div
            ref={reportRef}
            className="bg-white max-w-[210mm] mx-auto p-6 sm:p-10 shadow-sm border border-slate-200 rounded-xl print:shadow-none print:border-none print:rounded-none print:p-0 print:max-w-none space-y-6 text-slate-900"
          >
            {/* Official Header */}
            <div className="flex flex-col items-center text-center border-b-2 border-slate-800 pb-5">
              <div data-docx-ignore="true">
                <GarudaEmblem size="1.5cm" className="mb-2" />
              </div>
              <div
                data-eyebrow="true"
                className="text-[11px] font-bold tracking-wider text-sky-800 uppercase mb-1"
              >
                กระทรวงการพัฒนาสังคมและความมั่นคงของมนุษย์ • ศูนย์ข้อมูลและสถิติสังคม (Data Hub)
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                รายงานสถานการณ์กลุ่มเปราะบางและความเหลื่อมล้ำทางสังคม
              </h1>
              <h2 className="text-sm sm:text-base font-bold text-slate-700 mt-1">
                สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร ({main.region}) ประจำปีงบประมาณ พ.ศ. {fiscalYear}
              </h2>
              <div data-date="true" className="text-xs text-slate-500 mt-1.5">
                ข้อมูล ณ วันที่ {todayThai}
                {selectedDistrictName ? ` • จุดเน้นพื้นที่: ${selectedDistrictName}` : ""}
              </div>
            </div>

            {/* MSO-Logbook Sections */}
            {scope !== "districts" && (
              <>
                {/* Section 1: Overview KPIs & Vulnerability Levels */}
                <section className="space-y-4">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 bg-sky-50 border-l-4 border-sky-700 px-3 py-1.5 rounded-r">
                    ส่วนที่ 1 ภาพรวมสถานการณ์กลุ่มเปราะบางจังหวัดกำแพงเพชร (ฐานข้อมูล MSO-Logbook)
                  </h3>

                  <div
                    data-summary-grid="true"
                    className="grid grid-cols-2 sm:grid-cols-4 gap-3"
                  >
                    <div
                      data-summary-card="true"
                      className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                    >
                      <div data-summary-k="true" className="text-[11px] font-semibold text-slate-500">
                        ครัวเรือนเปราะบาง
                      </div>
                      <div data-summary-v="true" className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5 tabular-nums">
                        {fmtInt(main.hh)}
                      </div>
                      <div data-summary-sub="true" className="text-[11px] text-slate-500 mt-0.5">
                        {fmtPct(main.hh, main.households)}% จาก {fmtInt(main.households)} ครัวเรือน
                      </div>
                    </div>

                    <div
                      data-summary-card="true"
                      className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                    >
                      <div data-summary-k="true" className="text-[11px] font-semibold text-slate-500">
                        บุคคลเปราะบาง
                      </div>
                      <div data-summary-v="true" className="text-lg sm:text-xl font-bold text-sky-800 mt-0.5 tabular-nums">
                        {fmtInt(main.people)}
                      </div>
                      <div data-summary-sub="true" className="text-[11px] text-slate-500 mt-0.5">
                        {fmtPct(main.people, main.population)}% จากประชากร {fmtInt(main.population)} คน
                      </div>
                    </div>

                    <div
                      data-summary-card="true"
                      className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                    >
                      <div data-summary-k="true" className="text-[11px] font-semibold text-slate-500">
                        ผู้ประสบปัญหาจริง
                      </div>
                      <div data-summary-v="true" className="text-lg sm:text-xl font-bold text-amber-700 mt-0.5 tabular-nums">
                        {fmtInt(main.peopleWithProblems)}
                      </div>
                      <div data-summary-sub="true" className="text-[11px] text-slate-500 mt-0.5">
                        {fmtPct(main.peopleWithProblems, main.people)}% ของบุคคลเปราะบาง
                      </div>
                    </div>

                    <div
                      data-summary-card="true"
                      className="rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                    >
                      <div data-summary-k="true" className="text-[11px] font-semibold text-slate-500">
                        รวมปัญหา 9 มิติ
                      </div>
                      <div data-summary-v="true" className="text-lg sm:text-xl font-bold text-rose-700 mt-0.5 tabular-nums">
                        {fmtInt(main.problems)}
                      </div>
                      <div data-summary-sub="true" className="text-[11px] text-slate-500 mt-0.5">
                        ยังไม่มีแผน {fmtInt(dimTotals.noplan)} ครั้ง ({fmtPct(dimTotals.noplan, dimTotals.total)}%)
                      </div>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm leading-relaxed text-slate-700 text-justify indent-6">
                    จังหวัดกำแพงเพชร ({main.region}) มีประชากรรวมทั้งสิ้น {fmtInt(main.population)} คน ({fmtInt(main.households)} ครัวเรือน)
                    จากการบันทึกข้อมูลในระบบ MSO-Logbook พบครัวเรือนเปราะบางจำนวน {fmtInt(main.hh)} ครัวเรือน ({fmtPct(main.hh, main.households)}%)
                    และบุคคลเปราะบาง {fmtInt(main.people)} คน โดยมีผู้ประสบปัญหาความเดือดร้อนจริง {fmtInt(main.peopleWithProblems)} คน
                    รวมจำนวนปัญหาที่พบทั้งสิ้น {fmtInt(main.problems)} ครั้ง ทั้งนี้ มีครัวเรือนเปราะบางระดับ 2 (ยากลำบาก) และระดับ 3 (วิกฤต)
                    รวมกัน {fmtInt(level2Plus3)} ครัวเรือน ({fmtPct(level2Plus3, main.hh)}%)
                    โดยมิติปัญหาที่พบมากที่สุด 3 อันดับแรก ได้แก่ {top3Dims.map((d) => `${d.dimension} (${fmtInt(d.total)} ครั้ง)`).join(" ")}
                  </p>

                  <div>
                    <p data-caption="true" className="text-xs font-bold text-slate-800 mb-1.5">
                      ตารางที่ 1.1 จำแนกครัวเรือนเปราะบางตามระดับความเปราะบาง (ระดับ 0–3)
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse border border-slate-300">
                        <thead>
                          <tr className="bg-slate-100 text-slate-800">
                            <th className="border border-slate-300 px-3 py-2 text-left">ระดับความเปราะบาง</th>
                            <th className="border border-slate-300 px-3 py-2 text-right num">จำนวนครัวเรือน</th>
                            <th className="border border-slate-300 px-3 py-2 text-right num">สัดส่วน (%)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {MSO_VULNERABILITY_LEVELS.map((lvl, idx) => {
                            const count = main.lvls[idx] || 0;
                            return (
                              <tr key={lvl.level} className="even:bg-slate-50/60">
                                <td className="border border-slate-300 px-3 py-1.5 font-medium text-slate-800">
                                  {lvl.label}
                                </td>
                                <td className="border border-slate-300 px-3 py-1.5 text-right num font-semibold tabular-nums">
                                  {fmtInt(count)}
                                </td>
                                <td className="border border-slate-300 px-3 py-1.5 text-right num pct tabular-nums text-sky-800">
                                  {fmtPct(count, main.hh)}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr data-total-row="true" className="total-row bg-sky-50 font-bold text-slate-900">
                            <td className="border border-slate-300 px-3 py-1.5">รวมครัวเรือนเปราะบางทั้งหมด</td>
                            <td className="border border-slate-300 px-3 py-1.5 text-right num tabular-nums">
                              {fmtInt(main.hh)}
                            </td>
                            <td className="border border-slate-300 px-3 py-1.5 text-right num tabular-nums">
                              100.0%
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </section>

                {/* Section 2: 9 Dimensions & Help Plan Status */}
                <section className="space-y-4">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 bg-sky-50 border-l-4 border-sky-700 px-3 py-1.5 rounded-r">
                    ส่วนที่ 2 ปัญหาความเดือดร้อน 9 มิติ และสถานะการวางแผนช่วยเหลือ
                  </h3>

                  <div className="overflow-x-auto">
                    <p data-caption="true" className="text-xs font-bold text-slate-800 mb-1.5">
                      ตารางที่ 2.1 สรุปจำนวนปัญหาความเดือดร้อนจำแนกตาม 9 มิติ และสถานะการดำเนินการ
                    </p>
                    <table className="w-full text-[11px] sm:text-xs border-collapse border border-slate-300">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800">
                          <th className="border border-slate-300 px-2 py-2 text-center w-9">ลำดับ</th>
                          <th className="border border-slate-300 px-2.5 py-2 text-left">มิติความเดือดร้อน</th>
                          <th className="border border-slate-300 px-2 py-2 text-right num">รวมปัญหา</th>
                          <th className="border border-slate-300 px-2 py-2 text-right num">สัดส่วน</th>
                          <th className="border border-slate-300 px-2 py-2 text-right num text-rose-800">
                            ยังไม่มีแผน
                          </th>
                          <th className="border border-slate-300 px-2 py-2 text-right num">ติดตามอยู่</th>
                          <th className="border border-slate-300 px-2 py-2 text-right num">กำลังดำเนินการ</th>
                          <th className="border border-slate-300 px-2 py-2 text-right num">ปิดเคส</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dimSummaries.map((row, idx) => (
                          <tr key={row.dimension} className="even:bg-slate-50/60">
                            <td className="border border-slate-300 px-2 py-1.5 text-center tabular-nums">
                              {idx + 1}
                            </td>
                            <td className="border border-slate-300 px-2.5 py-1.5 font-medium text-slate-800">
                              {row.dimension}
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-right num font-bold tabular-nums">
                              {fmtInt(row.total)}
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-right num pct tabular-nums text-sky-800">
                              {row.sharePct.toFixed(1)}%
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-right num no-plan font-semibold text-rose-700 tabular-nums">
                              {fmtInt(row.noplan)} ({row.noplanPct.toFixed(0)}%)
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums">
                              {fmtInt(row.tracked)}
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums">
                              {fmtInt(row.ongoing)}
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums text-emerald-700">
                              {fmtInt(row.closed)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr data-total-row="true" className="total-row bg-sky-50 font-bold text-slate-900">
                          <td className="border border-slate-300 px-2.5 py-1.5" colSpan={2}>
                            รวมปัญหาทั้งหมด 9 มิติ
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums">
                            {fmtInt(dimTotals.total)}
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums">
                            100.0%
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right num no-plan text-rose-800 tabular-nums">
                            {fmtInt(dimTotals.noplan)} ({fmtPct(dimTotals.noplan, dimTotals.total)}%)
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums">
                            {fmtInt(dimTotals.tracked)}
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums">
                            {fmtInt(dimTotals.ongoing)}
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums text-emerald-800">
                            {fmtInt(dimTotals.closed)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Top sub-issues across major dimensions */}
                  <div className="overflow-x-auto">
                    <p data-caption="true" className="text-xs font-bold text-slate-800 mb-1.5">
                      ตารางที่ 2.2 ประเด็นปัญหาย่อยสำคัญที่พบมากที่สุดใน 5 มิติหลัก
                    </p>
                    <table className="w-full text-[11px] sm:text-xs border-collapse border border-slate-300">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800">
                          <th className="border border-slate-300 px-2.5 py-1.5 text-left">มิติ</th>
                          <th className="border border-slate-300 px-2.5 py-1.5 text-left">ประเด็นปัญหาย่อย</th>
                          <th className="border border-slate-300 px-2 py-1.5 text-right num">จำนวน (ครั้ง)</th>
                          <th className="border border-slate-300 px-2 py-1.5 text-right num text-rose-800">
                            ยังไม่มีแผน
                          </th>
                          <th className="border border-slate-300 px-2 py-1.5 text-right num">ติดตามอยู่</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dimSummaries.slice(0, 5).flatMap((dim) =>
                          dim.topIssues.slice(0, 2).map((issue) => (
                            <tr key={`${dim.dimension}-${issue.name}`} className="even:bg-slate-50/60">
                              <td className="border border-slate-300 px-2.5 py-1.5 text-slate-600">
                                {dim.dimension}
                              </td>
                              <td className="border border-slate-300 px-2.5 py-1.5 font-medium text-slate-800">
                                {issue.name}
                              </td>
                              <td className="border border-slate-300 px-2 py-1.5 text-right num font-semibold tabular-nums">
                                {fmtInt(issue.total)}
                              </td>
                              <td className="border border-slate-300 px-2 py-1.5 text-right num no-plan text-rose-700 tabular-nums">
                                {fmtInt(issue.noplan)}
                              </td>
                              <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums">
                                {fmtInt(issue.tracked)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Section 3: Housing & Child Subsidy / Mothers */}
                <section className="space-y-4">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 bg-sky-50 border-l-4 border-sky-700 px-3 py-1.5 rounded-r">
                    ส่วนที่ 3 ลักษณะที่อยู่อาศัยกลุ่มเปราะบาง และสวัสดิการเงินอุดหนุนเด็กแรกเกิด
                  </h3>

                  <div className="overflow-x-auto">
                    <p data-caption="true" className="text-xs font-bold text-slate-800 mb-1.5">
                      ตารางที่ 3.1 ลักษณะความมั่นคงด้านที่อยู่อาศัย จำแนกตามกลุ่มเป้าหมาย 4 กลุ่ม
                    </p>
                    <table className="w-full text-[11px] sm:text-xs border-collapse border border-slate-300">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800">
                          <th className="border border-slate-300 px-2.5 py-2 text-left">กลุ่มเป้าหมาย</th>
                          <th className="border border-slate-300 px-2 py-2 text-right num">จำนวนคน</th>
                          <th className="border border-slate-300 px-2 py-2 text-right num">ครัวเรือน</th>
                          {MSO_HOUSING_TYPE_LABELS.map((label) => (
                            <th key={label} className="border border-slate-300 px-2 py-2 text-right num">
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {housingEntries.map(([groupName, row]) => (
                          <tr key={groupName} className="even:bg-slate-50/60">
                            <td className="border border-slate-300 px-2.5 py-1.5 font-medium text-slate-800">
                              {groupName}
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-right num font-semibold tabular-nums">
                              {fmtInt(row.people)}
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums">
                              {fmtInt(row.households)}
                            </td>
                            {row.types.map((val, idx) => (
                              <td
                                key={idx}
                                className={`border border-slate-300 px-2 py-1.5 text-right num tabular-nums ${
                                  idx >= 2 && val > 0 ? "text-rose-700 font-semibold" : ""
                                }`}
                              >
                                {fmtInt(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr data-total-row="true" className="total-row bg-sky-50 font-bold text-slate-900">
                          <td className="border border-slate-300 px-2.5 py-1.5">รวม 4 กลุ่มเป้าหมาย</td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums">
                            {fmtInt(housingTotals.people)}
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums">
                            {fmtInt(housingTotals.households)}
                          </td>
                          {housingTotals.types.map((val, idx) => (
                            <td key={idx} className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums">
                              {fmtInt(val)}
                            </td>
                          ))}
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="overflow-x-auto">
                    <p data-caption="true" className="text-xs font-bold text-slate-800 mb-1.5">
                      ตารางที่ 3.2 สถานการณ์เงินอุดหนุนเพื่อการเลี้ยงดูเด็กแรกเกิด และกลุ่มมารดา 3 กลุ่ม
                    </p>
                    <table className="w-full text-[11px] sm:text-xs border-collapse border border-slate-300">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800">
                          <th className="border border-slate-300 px-2.5 py-2 text-left">กลุ่มเป้าหมาย / สิทธิสวัสดิการ</th>
                          <th className="border border-slate-300 px-2 py-2 text-right num">ลงทะเบียน (คน)</th>
                          <th className="border border-slate-300 px-2 py-2 text-right num">มีสิทธิรับเงิน</th>
                          <th className="border border-slate-300 px-2 py-2 text-right num">ได้รับเงินแล้ว</th>
                          <th className="border border-slate-300 px-2 py-2 text-right num">ความครอบคลุม</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="even:bg-slate-50/60">
                          <td className="border border-slate-300 px-2.5 py-1.5 font-medium text-slate-800">
                            เด็กแรกเกิด (ประชากรเด็ก {fmtInt(welfare.subsidy.childpop)} คน • ยังไม่ได้รับ {fmtInt(welfare.subsidy.notReceived)} คน)
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums">
                            {fmtInt(welfare.subsidy.registered)}
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums">
                            {fmtInt(welfare.subsidy.eligible)}
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right num font-semibold text-emerald-700 tabular-nums">
                            {fmtInt(welfare.subsidy.received)}
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right num pct tabular-nums text-sky-800">
                            {fmtPct(welfare.subsidy.received, welfare.subsidy.eligible)}%
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 px-2.5 py-1.5 font-medium text-slate-800">
                            แม่เลี้ยงเดี่ยว (Single Mother)
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums">
                            {fmtInt(welfare.single.registered)}
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums">
                            {fmtInt(welfare.single.eligible)}
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right num font-semibold text-emerald-700 tabular-nums">
                            {fmtInt(welfare.single.received)}
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right num pct tabular-nums text-sky-800">
                            {fmtPct(welfare.single.received, welfare.single.eligible)}%
                          </td>
                        </tr>
                        <tr className="even:bg-slate-50/60">
                          <td className="border border-slate-300 px-2.5 py-1.5 font-medium text-slate-800">
                            แม่วัยรุ่น (Teen Mother)
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums">
                            {fmtInt(welfare.teen.registered)}
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums">
                            {fmtInt(welfare.teen.eligible)}
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right num font-semibold text-emerald-700 tabular-nums">
                            {fmtInt(welfare.teen.received)}
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right num pct tabular-nums text-sky-800">
                            {fmtPct(welfare.teen.received, welfare.teen.eligible)}%
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-slate-300 px-2.5 py-1.5 font-medium text-slate-800">
                            แม่เลี้ยงเดี่ยววัยรุ่น (Single Teen Mother)
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums">
                            {fmtInt(welfare.singleTeen.registered)}
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums">
                            {fmtInt(welfare.singleTeen.eligible)}
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right num font-semibold text-emerald-700 tabular-nums">
                            {fmtInt(welfare.singleTeen.received)}
                          </td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right num pct tabular-nums text-sky-800">
                            {fmtPct(welfare.singleTeen.received, welfare.singleTeen.eligible)}%
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}

            {/* Section 4: 11 Districts Breakdown (from Data Hub live stats) */}
            {scope !== "mso" && (
              <section className="space-y-3">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 bg-sky-50 border-l-4 border-sky-700 px-3 py-1.5 rounded-r">
                  ส่วนที่ {scope === "districts" ? "1" : "4"} สรุปข้อมูลกลุ่มเปราะบางรายอำเภอ 11 อำเภอ จังหวัดกำแพงเพชร
                </h3>

                <div className="overflow-x-auto">
                  <p data-caption="true" className="text-xs font-bold text-slate-800 mb-1.5">
                    ตารางที่ {scope === "districts" ? "1.1" : "4.1"} จำนวนกลุ่มเปราะบางและความคืบหน้าการสำรวจ/ช่วยเหลือ รายอำเภอ (ปีงบประมาณ {fiscalYear})
                  </p>
                  <table className="w-full text-[11px] sm:text-xs border-collapse border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800">
                        <th className="border border-slate-300 px-2.5 py-2 text-left">อำเภอ</th>
                        <th className="border border-slate-300 px-2 py-2 text-right num">ประชากร</th>
                        <th className="border border-slate-300 px-2 py-2 text-right num">ครัวเรือนเปราะบาง</th>
                        <th className="border border-slate-300 px-2 py-2 text-right num">ช่วยเหลือแล้ว</th>
                        <th className="border border-slate-300 px-2 py-2 text-right num">อยู่ระหว่างดำเนินการ</th>
                        <th className="border border-slate-300 px-2 py-2 text-right num">คนพิการ</th>
                        <th className="border border-slate-300 px-2 py-2 text-right num">ผู้สูงอายุพึ่งพิง</th>
                        <th className="border border-slate-300 px-2 py-2 text-right num">เด็กแรกเกิด</th>
                        <th className="border border-slate-300 px-2 py-2 text-right num">ฉุกเฉิน 1300</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.map((row) => {
                        const helpPct =
                          row.vulnerableHouseholds != null &&
                          row.vulnerableHouseholds > 0 &&
                          row.helpedHouseholds != null
                            ? `${((row.helpedHouseholds / row.vulnerableHouseholds) * 100).toFixed(1)}%`
                            : null;
                        const isHighlighted = selectedDistrictName === row.districtName;
                        return (
                          <tr
                            key={row.districtId}
                            className={isHighlighted ? "bg-teal-50 font-semibold" : "even:bg-slate-50/60"}
                          >
                            <td className="border border-slate-300 px-2.5 py-1.5 text-slate-900">
                              {row.districtName}
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums text-slate-500">
                              {fmtOrNA(row.population)}
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-right num font-bold tabular-nums text-slate-700">
                              {fmtOrNA(row.vulnerableHouseholds)}
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums text-emerald-700 font-semibold">
                              {row.helpedHouseholds != null
                                ? `${fmtOrNA(row.helpedHouseholds)}${helpPct ? ` (${helpPct})` : ""}`
                                : "NA"}
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums text-amber-700">
                              {fmtOrNA(row.inProgressHouseholds)}
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums">
                              {fmtOrNA(row.disabilityRegistered)}
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums">
                              {fmtOrNA(row.elderlyDependent)}
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums">
                              {fmtOrNA(row.childSupportBeneficiaries)}
                            </td>
                            <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums text-rose-700">
                              {fmtOrNA(row.emergencyCases1300)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr data-total-row="true" className="total-row bg-sky-50 font-bold text-slate-900">
                        <td className="border border-slate-300 px-2.5 py-1.5">รวมทั้งจังหวัด (11 อำเภอ)</td>
                        <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums">
                          {fmtOrNA(totals.population)}
                        </td>
                        <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums">
                          {fmtOrNA(totals.vulnerableHouseholds)}
                        </td>
                        <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums text-emerald-800">
                          {totals.helpedHouseholds != null && totals.vulnerableHouseholds != null
                            ? `${fmtOrNA(totals.helpedHouseholds)} (${fmtPct(totals.helpedHouseholds, totals.vulnerableHouseholds)}%)`
                            : "NA"}
                        </td>
                        <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums text-amber-800">
                          {fmtOrNA(totals.inProgressHouseholds)}
                        </td>
                        <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums">
                          {fmtOrNA(totals.disabilityRegistered)}
                        </td>
                        <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums">
                          {fmtOrNA(totals.elderlyDependent)}
                        </td>
                        <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums">
                          {fmtOrNA(totals.childSupportBeneficiaries)}
                        </td>
                        <td className="border border-slate-300 px-2 py-1.5 text-right num tabular-nums text-rose-800">
                          {fmtOrNA(totals.emergencyCases1300)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            )}

            {/* Signature Block */}
            <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs text-slate-700 break-inside-avoid">
              <div className="text-center space-y-1">
                <p className="text-center">ผู้จัดทำรายงาน</p>
                <div className="h-10" />
                <p className="text-center">({currentUser.name})</p>
                <p className="text-center text-slate-500">{currentUser.position || currentUser.role}</p>
                <p className="text-center text-slate-500">วันที่ {todayThai}</p>
              </div>
              <div className="text-center space-y-1">
                <p className="text-center">ผู้รับรองรายงาน</p>
                <div className="h-10" />
                <p className="text-center">
                  ({director?.name || "........................................................"})
                </p>
                <p className="text-center text-slate-500">
                  {director?.position || "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"}
                </p>
                <p className="text-center text-slate-500">
                  วันที่ ........../....................../..............
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
