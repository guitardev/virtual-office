"use client";

import React from "react";
import { GarudaEmblem } from "@/components/circular/GarudaEmblem";
import {
  DistrictSocialStat,
  calculateProvinceTotals,
  exportSocialStatsToCsv,
} from "@/lib/social-statistics";
import { toThaiDate, toThaiDigits } from "@/lib/thai-numerals";
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

export function SocialStatisticsReportModal({
  isOpen,
  onClose,
  stats,
  fiscalYear,
  currentUser,
  selectedDistrictName,
  director,
}: SocialStatisticsReportModalProps) {
  if (!isOpen) return null;

  const totals = calculateProvinceTotals(stats);
  const overallRate =
    totals.vulnerableHouseholds > 0
      ? ((totals.helpedHouseholds / totals.vulnerableHouseholds) * 100).toFixed(1)
      : "0.0";

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    exportSocialStatsToCsv(stats, fiscalYear);
  };

  const todayThai = toThaiDate(new Date().toISOString().split("T")[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:z-auto animate-fadeIn">
      {/* Container */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Screen Header Bar (Hidden during print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📊</span>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base font-heading">
                รายงานสถิติสถานการณ์ทางสังคมและกลุ่มเปราะบาง (แบบทางการ กบจ.)
              </h3>
              <p className="text-[11px] text-slate-400">
                พมจ.กำแพงเพชร · ประจำปีงบประมาณ พ.ศ. {fiscalYear}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="ส่งออกไฟล์ข้อมูลเป็น CSV สำหรับเปิดใน Microsoft Excel"
            >
              <span>📊</span>
              <span>ส่งออก Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              title="สั่งพิมพ์ผ่านเบราว์เซอร์ หรือบันทึกเป็น PDF"
            >
              <span>🖨️</span>
              <span>พิมพ์ / บันทึก PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Document Sheet (A4 Proportion) */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white print:overflow-visible print:p-0">
          <div className="max-w-[210mm] mx-auto text-slate-800 space-y-6">
            {/* Government Emblem & Header */}
            <div className="text-center space-y-2">
              <div className="flex justify-center mb-1">
                <GarudaEmblem size="2cm" />
              </div>
              <h1 className="text-base sm:text-lg font-bold font-heading text-slate-950">
                รายงานสถานการณ์ทางสังคมและข้อมูลการพัฒนาคุณภาพชีวิตครัวเรือนเปราะบาง
              </h1>
              <h2 className="text-xs sm:text-sm font-semibold text-slate-700">
                สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร
              </h2>
              <div className="text-[11px] text-slate-500 font-medium">
                ประจำปีงบประมาณ พ.ศ. {fiscalYear} {selectedDistrictName ? `· เฉพาะพื้นที่ ${selectedDistrictName}` : "· ข้อมูลรวม ๑๑ อำเภอ"} (ข้อมูล ณ วันที่ {todayThai})
              </div>
            </div>

            {/* Official Context Narrative */}
            <div className="text-xs leading-relaxed text-slate-700 text-justify indent-8 border-y border-slate-200 py-3">
              ตามที่สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร ได้ดำเนินการขับเคลื่อนการขจัดความยากจนและพัฒนาคนทุกช่วงวัยอย่างยั่งยืนตามหลักปรัชญาของเศรษฐกิจพอเพียง (ศจพ.) และศูนย์เร่งรัดจัดการสวัสดิภาพประชาชน (ศรส.) ร่วมกับภาคีเครือข่ายระดับพื้นที่ ๑๑ อำเภอ มีผลการดำเนินงานและสถิติข้อมูลผู้รับบริการทางสังคมสรุปภาพรวมได้ดังต่อไปนี้
            </div>

            {/* 4 Summary Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <div className="text-[10px] text-slate-500 font-bold">ครัวเรือนเปราะบางเป้าหมาย</div>
                <div className="text-lg font-extrabold text-slate-900 mt-0.5">
                  {totals.vulnerableHouseholds.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400">ครัวเรือน</div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <div className="text-[10px] text-emerald-800 font-bold">ช่วยเหลือและพัฒนาแล้ว</div>
                <div className="text-lg font-extrabold text-emerald-700 mt-0.5">
                  {totals.helpedHouseholds.toLocaleString()}
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold">สำเร็จ {overallRate}%</div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
                <div className="text-[10px] text-blue-800 font-bold">คนพิการมีบัตรประจำตัว</div>
                <div className="text-lg font-extrabold text-blue-700 mt-0.5">
                  {totals.disabilityRegistered.toLocaleString()}
                </div>
                <div className="text-[10px] text-blue-600">ราย</div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                <div className="text-[10px] text-amber-800 font-bold">เงินอุดหนุนเด็กแรกเกิด</div>
                <div className="text-lg font-extrabold text-amber-700 mt-0.5">
                  {totals.childSupportBeneficiaries.toLocaleString()}
                </div>
                <div className="text-[10px] text-amber-700">ราย (๖๐๐ บ./ด.)</div>
              </div>
            </div>

            {/* Official Table */}
            <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <tr>
                    <th className="py-2 px-2.5 text-center w-10 border-r border-slate-200">ที่</th>
                    <th className="py-2 px-2.5 border-r border-slate-200">อำเภอ</th>
                    <th className="py-2 px-2 text-center border-r border-slate-200">ตำบล</th>
                    <th className="py-2 px-2 text-right border-r border-slate-200">ประชากร</th>
                    <th className="py-2 px-2 text-right border-r border-slate-200">เป้าหมาย (TPMAP)</th>
                    <th className="py-2 px-2 text-right border-r border-slate-200">ช่วยเหลือแล้ว</th>
                    <th className="py-2 px-2 text-center border-r border-slate-200">สำเร็จ (%)</th>
                    <th className="py-2 px-2 text-right border-r border-slate-200">คนพิการ</th>
                    <th className="py-2 px-2 text-right border-r border-slate-200">เด็กแรกเกิด</th>
                    <th className="py-2 px-2 text-right">งบสงเคราะห์ (บาท)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {stats.map((d, idx) => {
                    const pct =
                      d.vulnerableHouseholds > 0
                        ? ((d.helpedHouseholds / d.vulnerableHouseholds) * 100).toFixed(1)
                        : "0.0";
                    return (
                      <tr key={d.districtId} className="hover:bg-slate-50/80">
                        <td className="py-1.5 px-2 text-center border-r border-slate-200 text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-2.5 font-bold border-r border-slate-200 text-slate-800">
                          {d.districtName}
                        </td>
                        <td className="py-1.5 px-2 text-center border-r border-slate-200 text-slate-600">
                          {d.subdistrictCount}
                        </td>
                        <td className="py-1.5 px-2 text-right border-r border-slate-200 text-slate-600 font-mono">
                          {d.population.toLocaleString()}
                        </td>
                        <td className="py-1.5 px-2 text-right border-r border-slate-200 font-bold text-slate-900 font-mono">
                          {d.vulnerableHouseholds.toLocaleString()}
                        </td>
                        <td className="py-1.5 px-2 text-right border-r border-slate-200 text-emerald-700 font-bold font-mono">
                          {d.helpedHouseholds.toLocaleString()}
                        </td>
                        <td className="py-1.5 px-2 text-center border-r border-slate-200 font-bold text-slate-700 font-mono">
                          {pct}%
                        </td>
                        <td className="py-1.5 px-2 text-right border-r border-slate-200 text-blue-700 font-mono">
                          {d.disabilityRegistered.toLocaleString()}
                        </td>
                        <td className="py-1.5 px-2 text-right border-r border-slate-200 text-amber-700 font-mono">
                          {d.childSupportBeneficiaries.toLocaleString()}
                        </td>
                        <td className="py-1.5 px-2 text-right font-medium text-slate-800 font-mono">
                          {d.budgetDisbursedThb.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100/90 font-bold text-slate-900 border-t-2 border-slate-300">
                  <tr>
                    <td colSpan={2} className="py-2 px-2.5 text-center border-r border-slate-200">
                      รวมทั้งสิ้น ({stats.length} อำเภอ)
                    </td>
                    <td className="py-2 px-2 text-center border-r border-slate-200">
                      {stats.reduce((acc, c) => acc + c.subdistrictCount, 0)}
                    </td>
                    <td className="py-2 px-2 text-right border-r border-slate-200 font-mono">
                      {totals.population.toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right border-r border-slate-200 font-mono">
                      {totals.vulnerableHouseholds.toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right border-r border-slate-200 text-emerald-800 font-mono">
                      {totals.helpedHouseholds.toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-center border-r border-slate-200 text-emerald-800 font-mono">
                      {overallRate}%
                    </td>
                    <td className="py-2 px-2 text-right border-r border-slate-200 text-blue-800 font-mono">
                      {totals.disabilityRegistered.toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right border-r border-slate-200 text-amber-800 font-mono">
                      {totals.childSupportBeneficiaries.toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right font-mono">
                      {totals.budgetDisbursedThb.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Signature & Verification Block */}
            <div className="pt-6 grid grid-cols-2 gap-8 text-xs text-center">
              <div>
                <div className="text-slate-500 mb-12">ผู้จัดทำและตรวจสอบข้อมูล</div>
                <div className="font-bold text-slate-800">({currentUser.name})</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{currentUser.position || "เจ้าหน้าที่ พมจ.กำแพงเพชร"}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">ระบบสำนักงานเสมือนจริง Smart MSO</div>
              </div>

              <div>
                <div className="text-slate-500 mb-12">ผู้อนุมัติและรับรองรายงาน</div>
                <div className="font-bold text-slate-800">
                  ({director?.name || "ผู้บริหาร พมจ.กำแพงเพชร"})
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {director?.position || "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

