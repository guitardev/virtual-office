"use client";

import React from "react";
import { CircularDocument } from "@/lib/types";

interface CirculationPrintSlipProps {
  document: CircularDocument;
  onClose: () => void;
}

export function CirculationPrintSlip({ document: doc, onClose }: CirculationPrintSlipProps) {
  const handlePrint = () => {
    window.print();
  };

  const acknowledgedList = doc.recipients.filter((r) => r.isAcknowledged);
  const pendingList = doc.recipients.filter((r) => !r.isAcknowledged);
  const percent = Math.round((doc.acknowledgedCount / Math.max(1, doc.totalCount)) * 100);

  const printDate = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in text-slate-800">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span>🖨️ ใบสรุปผลการเวียนหนังสือราชการและบัญชีลงนามรับทราบ</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
              ความคืบหน้า: {percent}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer transition-all flex items-center gap-1.5"
            >
              <span>🖨️ สั่งพิมพ์เอกสาร / บันทึกเป็น PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white text-xs cursor-pointer transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Official Paper Area */}
        <div className="p-8 sm:p-12 overflow-y-auto flex-1 bg-white print:p-0 print:overflow-visible">
          {/* Government Emblem / Garuda Header */}
          <div className="text-center space-y-2 mb-6 border-b-2 border-slate-900 pb-5">
            <div className="text-4xl mx-auto select-none">🦅</div>
            <h1 className="text-xl font-bold font-heading text-slate-900 tracking-wide">
              บันทึกผลการเวียนหนังสือราชการและหลักฐานการรับทราบ
            </h1>
            <p className="text-xs text-slate-600">
              สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร
            </p>
          </div>

          {/* Document Metadata Summary Table */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-300 text-xs space-y-2 mb-6 print:bg-transparent print:border-slate-800">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-bold text-slate-900">เลขที่หนังสือ: </span>
                <span className="font-mono text-indigo-900">{doc.docNumber}</span>
              </div>
              <div>
                <span className="font-bold text-slate-900">ลงวันที่: </span>
                <span>{doc.issuedDate}</span>
              </div>
            </div>

            <div>
              <span className="font-bold text-slate-900">เรื่อง: </span>
              <span className="font-bold text-slate-900 text-sm">{doc.title}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-bold text-slate-900">หน่วยงานเจ้าของเรื่อง: </span>
                <span>{doc.senderOrg}</span>
              </div>
              <div>
                <span className="font-bold text-slate-900">ผู้ส่งเวียน: </span>
                <span>{doc.createdByName}</span>
              </div>
            </div>

            {doc.summary && (
              <div className="pt-1 text-[11px] text-slate-600">
                <span className="font-bold text-slate-800">สรุปสาระสำคัญ: </span>
                {doc.summary}
              </div>
            )}

            {/* Statistics Row */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
              <div>
                <strong>จำนวนผู้รับการเวียนทั้งหมด:</strong> {doc.totalCount} คน
              </div>
              <div className="text-emerald-700 font-bold">
                <strong>รับทราบแล้ว:</strong> {doc.acknowledgedCount} คน ({percent}%)
              </div>
              <div className="text-rose-700 font-bold">
                <strong>ยังไม่รับทราบ:</strong> {doc.totalCount - doc.acknowledgedCount} คน
              </div>
            </div>
          </div>

          {/* Table of Acknowledged Signatures */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span>บัญชีรายชื่อผู้รับทราบและลงนามดิจิทัล (จำนวน {acknowledgedList.length} คน)</span>
            </h2>

            <table className="w-full text-left text-xs border border-slate-300 divide-y divide-slate-200">
              <thead className="bg-slate-100 print:bg-slate-200 text-slate-800 font-bold text-[11px]">
                <tr>
                  <th className="py-2 px-2.5 w-10 text-center border-r border-slate-300">ลำดับ</th>
                  <th className="py-2 px-3 border-r border-slate-300">ชื่อ - สกุล / ตำแหน่ง</th>
                  <th className="py-2 px-3 border-r border-slate-300">กลุ่ม / ฝ่ายงาน</th>
                  <th className="py-2 px-3 border-r border-slate-300 text-center w-36">ลายมือชื่อดิจิทัล</th>
                  <th className="py-2 px-3 border-r border-slate-300 w-32">วันเวลาที่รับทราบ</th>
                  <th className="py-2 px-3">ข้อความเกษียน / บันทึกสั่งการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {acknowledgedList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-slate-400">
                      ยังไม่มีผู้ลงนามรับทราบ
                    </td>
                  </tr>
                ) : (
                  acknowledgedList.map((rec, idx) => (
                    <tr key={rec.memberId} className="hover:bg-slate-50/50">
                      <td className="py-2 px-2.5 text-center text-slate-500 border-r border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200">
                        <div className="font-bold text-slate-900">{rec.memberName}</div>
                        <div className="text-[10px] text-slate-500">{rec.position}</div>
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-[11px]">
                        <div>{rec.division}</div>
                        <div className="text-[10px] text-teal-700 font-semibold">{rec.personnelType}</div>
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-center">
                        {rec.signatureUrl ? (
                          <img
                            src={rec.signatureUrl}
                            alt={`ลายเซ็น ${rec.memberName}`}
                            className="h-9 max-w-full mx-auto object-contain"
                          />
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            ✓ รับทราบผ่านระบบ
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 text-[10px] text-slate-600 font-mono">
                        {rec.acknowledgedAt
                          ? new Date(rec.acknowledgedAt).toLocaleString("th-TH", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td className="py-2 px-3 text-[11px] text-slate-700 italic">
                        {rec.endorsementNote || "รับทราบ"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table of Pending Recipients if any */}
          {pendingList.length > 0 && (
            <div className="space-y-3 mt-6 pt-4 border-t border-slate-200">
              <h2 className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-2">
                <span>บัญชีรายชื่อผู้ที่ยังไม่ได้รับทราบ (จำนวน {pendingList.length} คน)</span>
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                {pendingList.map((rec, idx) => (
                  <div
                    key={rec.memberId}
                    className="p-2 rounded-lg bg-rose-50/50 border border-rose-100 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">{rec.memberName}</div>
                      <div className="text-[10px] text-slate-500">{rec.division}</div>
                    </div>
                    <span className="text-[10px] text-rose-600 font-bold">รอรับทราบ</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Official Footer Verification Stamp */}
          <div className="mt-10 pt-6 border-t border-slate-300 flex items-center justify-between text-xs text-slate-500">
            <div>
              <div>ระบบสารบรรณและเวียนหนังสืออิเล็กทรอนิกส์ Smart MSO</div>
              <div className="text-[10px] text-slate-400 font-mono">
                ข้อมูลพิมพ์ออกเมื่อ: {printDate} · มาตรฐานความปลอดภัย e-Government
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-slate-700">ฝ่ายสารบรรณ / ผู้จัดทำรายงาน</div>
              <div className="mt-6 border-b border-dotted border-slate-400 w-40 ml-auto" />
              <div className="text-[10px] text-slate-500 mt-1">({doc.createdByName})</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
