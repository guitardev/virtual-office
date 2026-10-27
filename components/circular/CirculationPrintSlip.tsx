"use client";

import React, { useMemo, useState } from "react";
import { CircularDocument, Member } from "@/lib/types";
import { GarudaEmblem } from "./GarudaEmblem";
import { DocumentVerificationQR } from "./DocumentVerificationQR";
import { toThaiDigits, toThaiDate, toThaiDateTime } from "@/lib/thai-numerals";

export type CircularPrintMode = "all" | "letter" | "slip";

interface CirculationPrintSlipProps {
  document: CircularDocument;
  availableMembers?: Member[];
  onClose: () => void;
  inPage?: boolean;
  initialMode?: CircularPrintMode;
}

/**
 * ระบบพิมพ์หนังสือราชการและใบสรุปผลการเวียน (Complete Official Document Printing)
 * รองรับ 3 โหมดการพิมพ์:
 * 1. "letter": พิมพ์เฉพาะตัวหนังสือเวียนตราครุฑ (Official Circular Memo)
 * 2. "slip": พิมพ์เฉพาะใบสรุปผลการเวียนและบัญชีรายชื่อผู้รับทราบ (Routing & Acknowledgment Slip)
 * 3. "all": พิมพ์ชุดเอกสารสมบูรณ์รวมเล่ม (Complete Dossier: หนังสือเวียน + เอกสารแนบ + ใบลงนาม)
 */
export function CirculationPrintSlip({
  document: doc,
  availableMembers,
  onClose,
  inPage = true,
  initialMode = "all",
}: CirculationPrintSlipProps) {
  const [printMode, setPrintMode] = useState<CircularPrintMode>(initialMode);

  const handlePrint = () => {
    window.print();
  };

  const adminIdSet = useMemo(() => {
    return new Set(availableMembers?.filter((m) => m.role === "admin").map((m) => m.id) || []);
  }, [availableMembers]);

  const nonAdminRecipients = useMemo(() => {
    return doc.recipients.filter((r) => !adminIdSet.has(r.memberId));
  }, [doc.recipients, adminIdSet]);

  const acknowledgedList = nonAdminRecipients.filter((r) => r.isAcknowledged);
  const pendingList = nonAdminRecipients.filter((r) => !r.isAcknowledged);
  const effectiveTotal = nonAdminRecipients.length;
  const percent = effectiveTotal > 0 ? Math.round((acknowledgedList.length / effectiveTotal) * 100) : 0;

  const printDate = toThaiDateTime(new Date().toISOString());

  // ส่วนของใบสรุปผลการเวียนและบัญชีลงนาม (Routing & Acknowledgment Slip)
  const slipContent = (
    <div className="gov-a4-sheet official-slip-sheet space-y-6 bg-white border border-slate-200 rounded-xl shadow-xs print:shadow-none print:border-none">
      {/* Government Emblem / Garuda Header */}
      <div className="text-center space-y-2 mb-6 border-b-2 border-slate-900 pb-5 print:border-black">
        <div className="flex justify-center mb-1">
          <GarudaEmblem size="2cm" />
        </div>
        <h1 className="text-xl font-bold font-heading text-slate-900 print:text-black tracking-wide">
          บันทึกผลการเวียนหนังสือราชการและหลักฐานการรับทราบ
        </h1>
        <p className="text-xs text-slate-600 print:text-slate-800">
          สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร
        </p>
      </div>

      {/* Document Metadata Summary Table */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-300 text-xs space-y-2 mb-6 print:bg-transparent print:border-slate-800 print:p-2">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-bold text-slate-900 print:text-black">เลขที่หนังสือ: </span>
            <span className="font-mono text-indigo-900 print:text-black font-bold">{toThaiDigits(doc.docNumber)}</span>
          </div>
          <div>
            <span className="font-bold text-slate-900 print:text-black">ลงวันที่: </span>
            <span className="print:text-black">{toThaiDate(doc.issuedDate)}</span>
          </div>
        </div>

        <div>
          <span className="font-bold text-slate-900 print:text-black">เรื่อง: </span>
          <span className="font-bold text-slate-900 print:text-black text-sm">{toThaiDigits(doc.title)}</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="font-bold text-slate-900 print:text-black">หน่วยงานเจ้าของเรื่อง: </span>
            <span className="print:text-black">{toThaiDigits(doc.senderOrg || "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร")}</span>
          </div>
          <div>
            <span className="font-bold text-slate-900 print:text-black">ผู้ส่งเวียน: </span>
            <span className="print:text-black">{doc.createdByName}</span>
          </div>
        </div>

        {doc.summary && (
          <div className="pt-1 text-[11px] text-slate-600 print:text-black">
            <span className="font-bold text-slate-800 print:text-black">สรุปสาระสำคัญ: </span>
            {toThaiDigits(doc.summary)}
          </div>
        )}

        {/* Statistics Row */}
        <div className="pt-2 border-t border-slate-200 print:border-slate-400 flex items-center justify-between text-xs">
          <div>
            <strong>จำนวนผู้รับการเวียนทั้งหมด:</strong> {toThaiDigits(effectiveTotal)} คน{" "}
            <span className="text-[10px] text-slate-500 print:text-black font-normal">(ไม่นับสิทธิ์ Admin)</span>
          </div>
          <div className="text-emerald-700 print:text-black font-bold">
            <strong>รับทราบแล้ว:</strong> {toThaiDigits(acknowledgedList.length)} คน ({toThaiDigits(percent)}%)
          </div>
          <div className="text-rose-700 print:text-black font-bold">
            <strong>ยังไม่รับทราบ:</strong> {toThaiDigits(pendingList.length)} คน
          </div>
        </div>
      </div>

      {/* Table of Acknowledged Signatures */}
      <div className="space-y-3 print-keep-together">
        <h2 className="text-xs font-bold text-slate-900 print:text-black uppercase tracking-wider flex items-center gap-2">
          <span>บัญชีรายชื่อผู้รับทราบและลงนามดิจิทัล (จำนวน {toThaiDigits(acknowledgedList.length)} คน)</span>
        </h2>

        <table className="w-full text-left text-xs border border-slate-300 print:border-black divide-y divide-slate-200 print:divide-slate-400">
          <thead className="bg-slate-100 print:bg-slate-100 text-slate-800 print:text-black font-bold text-[11px]">
            <tr>
              <th className="py-2 px-2.5 w-10 text-center border-r border-slate-300 print:border-black">ลำดับ</th>
              <th className="py-2 px-3 border-r border-slate-300 print:border-black">ชื่อ - สกุล / ตำแหน่ง</th>
              <th className="py-2 px-3 border-r border-slate-300 print:border-black">กลุ่ม / ฝ่ายงาน</th>
              <th className="py-2 px-3 border-r border-slate-300 print:border-black text-center w-36">ลายมือชื่อดิจิทัล</th>
              <th className="py-2 px-3 border-r border-slate-300 print:border-black w-32">วันเวลาที่รับทราบ</th>
              <th className="py-2 px-3">ข้อความเกษียน / บันทึกสั่งการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 print:divide-slate-400">
            {acknowledgedList.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-center text-slate-400 print:text-slate-600">
                  ยังไม่มีผู้ลงนามรับทราบ
                </td>
              </tr>
            ) : (
              acknowledgedList.map((rec, idx) => (
                <tr key={rec.memberId} className="hover:bg-slate-50/50 print-keep-together">
                  <td className="py-2 px-2.5 text-center text-slate-500 print:text-black border-r border-slate-200 print:border-black">
                    {toThaiDigits(idx + 1)}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 print:border-black">
                    <div className="font-bold text-slate-900 print:text-black">{rec.memberName}</div>
                    <div className="text-[10px] text-slate-500 print:text-black">{rec.position}</div>
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 print:border-black text-[11px]">
                    <div className="print:text-black">{rec.division}</div>
                    <div className="text-[10px] text-teal-700 print:text-black font-semibold">{rec.personnelType}</div>
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 print:border-black text-center">
                    {rec.signatureUrl ? (
                      <img
                        src={rec.signatureUrl}
                        alt={`ลายเซ็น ${rec.memberName}`}
                        className="h-8 max-w-full mx-auto object-contain print:brightness-0"
                      />
                    ) : (
                      <span className="text-[10px] text-emerald-700 print:text-black font-bold bg-emerald-50 print:bg-transparent px-2 py-0.5 rounded border border-emerald-200 print:border-black">
                        ✓ รับทราบผ่านระบบ
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 print:border-black text-[10px] text-slate-600 print:text-black">
                    {rec.acknowledgedAt ? toThaiDateTime(rec.acknowledgedAt) : "-"}
                  </td>
                  <td className="py-2 px-3 text-[11px] text-slate-700 print:text-black italic">
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
        <div className="space-y-3 mt-6 pt-4 border-t border-slate-200 print:border-slate-400 print-keep-together">
          <h2 className="text-xs font-bold text-rose-700 print:text-black uppercase tracking-wider flex items-center gap-2">
            <span>บัญชีรายชื่อผู้ที่ยังไม่ได้รับทราบ (จำนวน {pendingList.length} คน)</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
            {pendingList.map((rec) => (
              <div
                key={rec.memberId}
                className="p-2 rounded-lg bg-rose-50/50 print:bg-transparent border border-rose-100 print:border-slate-300 flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-slate-800 print:text-black">{rec.memberName}</div>
                  <div className="text-[10px] text-slate-500 print:text-black">{rec.division}</div>
                </div>
                <span className="text-[10px] text-rose-600 print:text-black font-bold">รอรับทราบ</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Official Footer Verification Stamp & QR Code */}
      <div className="mt-10 pt-6 border-t border-slate-300 print:border-black flex items-center justify-between text-xs text-slate-500 print:text-black print-keep-together">
        <DocumentVerificationQR
          docId={doc.id}
          docNumber={doc.docNumber}
          issuedDate={doc.issuedDate}
          size={55}
        />

        <div className="text-right">
          <div className="font-bold text-slate-700 print:text-black">ฝ่ายสารบรรณ / ผู้จัดทำรายงาน</div>
          <div className="mt-5 border-b border-dotted border-slate-400 print:border-black w-40 ml-auto" />
          <div className="text-[10px] text-slate-500 print:text-black mt-1">({doc.createdByName})</div>
          <div className="text-[9px] text-slate-400 print:text-black font-mono mt-0.5">
            พิมพ์รายงานเมื่อ: {printDate}
          </div>
        </div>
      </div>
    </div>
  );

  // ส่วนของการแสดงผลตามโหมดการพิมพ์
  const printableArea = (
    <div className="space-y-8">
      {/* 1. โหมด slip หรือ all: พิมพ์ใบสรุปผลการเวียนและบัญชีรายชื่อผู้รับทราบ */}
      {(printMode === "slip" || printMode === "all") && (
        <div className={printMode === "all" ? "print-page-break" : ""}>
          {slipContent}
        </div>
      )}

      {/* 2. โหมด all หรือ letter: พิมพ์เอกสารแนบประกอบหนังสือเวียน (Scanned Pages หรือหน้าเอกสารแนบ) */}
      {(printMode === "all" || printMode === "letter") && doc.scannedPages && doc.scannedPages.length > 0 && (
        <div className="space-y-6">
          {doc.scannedPages.map((pageImg, idx) => (
            <div key={idx} className="print-page-break bg-white p-4 sm:p-8 rounded-2xl border border-slate-200 print:border-none print:p-0 flex flex-col items-center">
              <div className="w-full text-center text-xs font-bold text-slate-500 print:text-black mb-3">
                เอกสารแนบประกอบหนังสือเวียน เลขที่ {doc.docNumber} (แผ่นที่ {idx + 1} จาก {doc.scannedPages?.length})
              </div>
              <img
                src={pageImg}
                alt={`เอกสารแนบหน้า ${idx + 1}`}
                className="max-w-full max-h-[85vh] object-contain border border-slate-200 print:border-none shadow-xs print:shadow-none"
              />
            </div>
          ))}
        </div>
      )}

      {/* กรณีเลือกพิมพ์เฉพาะหนังสือเวียนแต่ไม่มี scannedPages ให้แสดงข้อมูลสรุปหนังสือเวียน */}
      {printMode === "letter" && (!doc.scannedPages || doc.scannedPages.length === 0) && (
        <div className="gov-a4-sheet bg-white border border-slate-200 rounded-xl p-8 space-y-4 print:border-none print:shadow-none">
          <div className="text-center space-y-2 border-b-2 border-slate-900 pb-5">
            <div className="flex justify-center mb-1">
              <GarudaEmblem size="2cm" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 print:text-black">
              หนังสือเวียนทางราชการ
            </h2>
            <p className="text-xs text-slate-600 print:text-black">
              {toThaiDigits(doc.title)}
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 print:bg-transparent">
            <div><strong>เลขที่หนังสือ:</strong> {toThaiDigits(doc.docNumber)}</div>
            <div><strong>ลงวันที่:</strong> {toThaiDate(doc.issuedDate)}</div>
            <div><strong>หน่วยงานต้นทาง:</strong> {toThaiDigits(doc.senderOrg || "-")}</div>
            <div><strong>ไฟล์เอกสารแนบ:</strong> {doc.fileName || "เอกสารแนบประกอบหนังสือเวียน"}</div>
            {doc.summary && (
              <div className="pt-2 border-t border-slate-200">
                <strong>สรุปสาระสำคัญ:</strong> {toThaiDigits(doc.summary)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // Control Header Toolbar (ซ่อนขณะพิมพ์)
  const controlToolbar = (
    <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4 print:hidden">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium text-xs sm:text-sm transition-colors cursor-pointer border border-slate-700"
        >
          <span>←</span>
          <span>ย้อนกลับ</span>
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">🖨️ ระบบพิมพ์หนังสือราชการและผลการเวียน</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
              ความคืบหน้า: {percent}%
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            เลขที่ {doc.docNumber} · รายงานพิมพ์เมื่อ {printDate}
          </p>
        </div>
      </div>

      {/* Print Mode Selector Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl text-xs">
        <button
          type="button"
          onClick={() => setPrintMode("all")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            printMode === "all"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-300 hover:text-white"
          }`}
          title="พิมพ์หนังสือเวียน + เอกสารแนบ + ใบลงนามรับทราบ"
        >
          <span>📑</span>
          <span>ชุดรวมสมบูรณ์ (All)</span>
        </button>

        <button
          type="button"
          onClick={() => setPrintMode("letter")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            printMode === "letter"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-300 hover:text-white"
          }`}
          title="พิมพ์เฉพาะตัวบันทึกข้อความตราครุฑ"
        >
          <span>📜</span>
          <span>เฉพาะหนังสือเวียน</span>
        </button>

        <button
          type="button"
          onClick={() => setPrintMode("slip")}
          className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            printMode === "slip"
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-slate-300 hover:text-white"
          }`}
          title="พิมพ์เฉพาะใบสรุปผลและบัญชีลงนาม"
        >
          <span>📋</span>
          <span>เฉพาะใบสรุปผล</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handlePrint}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow cursor-pointer transition-all flex items-center gap-2"
        >
          <span>🖨️ สั่งพิมพ์เอกสาร (Print / PDF)</span>
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 transition-all cursor-pointer"
        >
          ✕ ปิด
        </button>
      </div>
    </div>
  );

  if (inPage) {
    return (
      <div data-testid="circulation-print-view" className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in text-slate-800 pb-12">
        {controlToolbar}

        {/* Printable Paper Area */}
        <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-slate-200 print:shadow-none print:border-none print:p-0">
          {printableArea}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in text-slate-800">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold">
            <span>🖨️ พิมพ์หนังสือราชการ</span>
            <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg text-[11px] ml-2">
              <button
                type="button"
                onClick={() => setPrintMode("all")}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  printMode === "all" ? "bg-indigo-600 text-white font-bold" : "text-slate-300"
                }`}
              >
                ชุดสมบูรณ์
              </button>
              <button
                type="button"
                onClick={() => setPrintMode("letter")}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  printMode === "letter" ? "bg-indigo-600 text-white font-bold" : "text-slate-300"
                }`}
              >
                หนังสือเวียน
              </button>
              <button
                type="button"
                onClick={() => setPrintMode("slip")}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  printMode === "slip" ? "bg-indigo-600 text-white font-bold" : "text-slate-300"
                }`}
              >
                ใบสรุปผล
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer transition-all flex items-center gap-1.5"
            >
              <span>🖨️ สั่งพิมพ์</span>
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
          {printableArea}
        </div>
      </div>
    </div>
  );
}
