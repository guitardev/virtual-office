"use client";

import React, { useState, useEffect } from "react";
import { Member, CircularDocument, CircularAttachment } from "@/lib/types";
import { DigitalSignaturePad } from "./DigitalSignaturePad";
import { CirculationPrintSlip } from "./CirculationPrintSlip";
import { toThaiShortDate, toThaiDate } from "@/lib/thai-numerals";
import { getFileCategoryInfo } from "./NewCircularModal";

export function getCircularFileDisplayUrl(fileUrl?: string): string {
  if (!fileUrl) return "/virtual-office/circular_docs/sample.pdf";
  if (
    fileUrl.startsWith("data:") ||
    fileUrl.startsWith("blob:") ||
    fileUrl.startsWith("http://") ||
    fileUrl.startsWith("https://") ||
    fileUrl.includes("/api/nas/download")
  ) {
    return fileUrl;
  }
  if (
    fileUrl === "/virtual-office/circular_docs/budget_guideline_2569.pdf" ||
    fileUrl === "/virtual-office/circular_docs/pdpa_policy_2569.pdf" ||
    fileUrl === "/virtual-office/circular_docs/sample.pdf"
  ) {
    return fileUrl;
  }
  return `/api/nas/download?path=${encodeURIComponent(fileUrl)}&mode=open`;
}

interface CircularViewerModalProps {
  document: CircularDocument;
  currentUser: Member;
  availableMembers?: Member[];
  onAcknowledge: (docId: string, signatureUrl?: string, endorsementNote?: string) => void;
  onClose: () => void;
  onPrintSlip?: () => void;
  onDelete?: (docId: string) => void;
  inPage?: boolean;
}

export function CircularViewerModal({
  document: doc,
  currentUser,
  availableMembers = [],
  onAcknowledge,
  onClose,
  onPrintSlip,
  onDelete,
  inPage = true,
}: CircularViewerModalProps) {
  const [activeTab, setActiveTab] = useState<"doc" | "tracking">("doc");
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [showSignaturePad, setShowSignaturePad] = useState<boolean>(false);
  const [showPrintSlip, setShowPrintSlip] = useState<boolean>(false);
  const [blobPdfUrl, setBlobPdfUrl] = useState<string | null>(null);
  const [selectedAttId, setSelectedAttId] = useState<string>(() => {
    return doc.attachments?.[0]?.id || "";
  });

  useEffect(() => {
    if (doc.attachments && doc.attachments.length > 0) {
      if (!doc.attachments.some((a) => a.id === selectedAttId)) {
        setSelectedAttId(doc.attachments[0].id);
      }
    }
  }, [doc.id, doc.attachments, selectedAttId]);

  const activeAttachment: CircularAttachment | null =
    (doc.attachments && doc.attachments.find((a) => a.id === selectedAttId)) ||
    doc.attachments?.[0] ||
    null;

  const activeFileName = activeAttachment?.name || doc.fileName;
  const activeFileSize = activeAttachment?.size ?? doc.fileSize;
  const activeFileUrl = activeAttachment?.url || doc.fileUrl;
  const activeScannedPages = activeAttachment?.scannedPages || doc.scannedPages;
  const activeCategory = getFileCategoryInfo(activeFileName, activeAttachment?.type);

  // Admin IDs set for statistics exclusion
  const adminIdSet = React.useMemo(
    () => new Set(availableMembers.filter((m) => m.role === "admin").map((m) => m.id)),
    [availableMembers]
  );
  const nonAdminRecipients = doc.recipients.filter((r) => !adminIdSet.has(r.memberId));
  const nonAdminAckCount = nonAdminRecipients.filter((r) => r.isAcknowledged).length;
  const percent = Math.round((nonAdminAckCount / Math.max(1, nonAdminRecipients.length)) * 100);

  // Safely convert Base64 PDF data URL into Blob URL for Chrome/Edge PDF rendering
  useEffect(() => {
    if (activeFileUrl && activeFileUrl.startsWith("data:application/pdf")) {
      try {
        const base64Data = activeFileUrl.includes(",") ? activeFileUrl.split(",")[1] : activeFileUrl;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        setBlobPdfUrl(url);
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (err) {
        console.warn("Could not generate Blob URL for PDF:", err);
      }
    } else {
      setBlobPdfUrl(null);
    }
  }, [activeFileUrl]);

  const activePdfUrl = blobPdfUrl || getCircularFileDisplayUrl(activeFileUrl);

  // Check if current user is a recipient and their status
  const recipientRecord = doc.recipients.find((r) => r.memberId === currentUser.id);
  const isRecipient = !!recipientRecord;
  const hasAcknowledged = recipientRecord?.isAcknowledged || false;

  const handleSignatureConfirmed = (signatureUrl: string, endorsementNote: string) => {
    setShowSignaturePad(false);
    onAcknowledge(doc.id, signatureUrl, endorsementNote);
  };

  const handleFastAcknowledge = () => {
    onAcknowledge(doc.id, undefined, "รับทราบ");
  };

  const viewerBodyAndFooter = (
    <>
      {/* Tab Switcher & Status Bar */}
      <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
        <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("doc")}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === "doc"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📄 เนื้อหาเอกสาร
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("tracking")}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === "tracking"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>📊 การรับทราบ</span>
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 text-[10px]">
                {nonAdminAckCount}/{nonAdminRecipients.length}
              </span>
            </button>
          </div>

          {/* User Acknowledgment Quick Badge */}
          {currentUser.role === "admin" ? (
            <div>
              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold flex items-center gap-1.5">
                <span>🛡️</span>
                <span>สิทธิ์ผู้ดูแลระบบ (ไม่คิดสถิติการรับทราบ)</span>
              </span>
            </div>
          ) : isRecipient ? (
            <div>
              {hasAcknowledged ? (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold flex items-center gap-1.5">
                  <span>✓</span>
                  <span>ท่านรับทราบและลงนามแล้ว</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-300 text-[11px] font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                  <span>รอท่านลงนามรับทราบ</span>
                </span>
              )}
            </div>
          ) : null}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC] print:p-0 print:bg-transparent print:overflow-visible">
          {activeTab === "doc" ? (
            <div className="space-y-4">
              {/* Multi-Attachment Switcher Bar if more than 1 attachment */}
              {doc.attachments && doc.attachments.length > 1 && (
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs print:hidden space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <span>📎</span>
                      <span>ไฟล์เอกสารและสิ่งที่ส่งมาด้วยทั้งหมด ({doc.attachments.length} รายการ)</span>
                    </div>
                    <span className="text-[11px] text-slate-400">คลิกเพื่อสลับดูแต่ละไฟล์</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {doc.attachments.map((att, idx) => {
                      const isSelected = activeAttachment ? activeAttachment.id === att.id : idx === 0;
                      const cat = getFileCategoryInfo(att.name, att.type);
                      return (
                        <button
                          key={att.id || idx}
                          type="button"
                          onClick={() => {
                            setSelectedAttId(att.id);
                            setCurrentPageIndex(0);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-200"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                          }`}
                        >
                          <span>{cat.icon}</span>
                          <span className="max-w-[180px] truncate" title={att.name}>
                            {att.name}
                          </span>
                          {idx === 0 && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                isSelected ? "bg-indigo-700 text-white" : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              เอกสารหลัก
                            </span>
                          )}
                          <span className={`text-[10px] ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                            {att.size ? `${(att.size / 1024).toFixed(0)} KB` : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Document Header & Quick Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs print:hidden">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xl shrink-0 ${activeCategory.bg}`}>
                    {activeCategory.icon}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <span>{activeFileName || "เอกสารหนังสือเวียนต้นฉบับ"}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${activeCategory.bg}`}>
                        {activeCategory.badge}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {activeScannedPages && activeScannedPages.length > 0
                        ? `เอกสารสแกน ${activeScannedPages.length} หน้า`
                        : activeFileSize
                        ? `${(activeFileSize / (1024 * 1024)).toFixed(2)} MB`
                        : "เอกสารทางราชการ"}
                    </div>
                  </div>
                </div>

                {/* Quick actions for attachment */}
                <div className="flex items-center gap-2 text-xs">
                  {activePdfUrl && (
                    <button
                      type="button"
                      onClick={() => window.open(activePdfUrl, "_blank")}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-1 cursor-pointer transition-all"
                      title="เปิดเอกสารในหน้าต่างใหม่แบบเต็มจอ"
                    >
                      <span>🔍</span>
                      <span>เปิดเต็มจอ</span>
                    </button>
                  )}
                  {onPrintSlip && (
                    <button
                      type="button"
                      onClick={onPrintSlip}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold flex items-center gap-1.5 cursor-pointer transition-all border border-indigo-200"
                      title="พิมพ์ใบสรุปผลการเวียนหนังสือราชการและหลักฐานการรับทราบ"
                    >
                      <span>🖨️</span>
                      <span>พิมพ์สรุปผลการเวียน</span>
                    </button>
                  )}
                </div>
              </div>

              {/* View Content: The Attached Document */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col items-center animate-fade-in">
                  {activeScannedPages && activeScannedPages.length > 0 ? (
                    <div className="w-full space-y-3">
                      {/* Multi-page controls */}
                      <div className="flex items-center justify-between text-xs px-2">
                        <span className="font-bold text-slate-700">
                          หน้า {currentPageIndex + 1} จาก {activeScannedPages.length}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={currentPageIndex === 0}
                            onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer font-bold"
                          >
                            ◀ หน้าก่อน
                          </button>
                          <button
                            type="button"
                            disabled={currentPageIndex === activeScannedPages.length - 1}
                            onClick={() =>
                              setCurrentPageIndex((prev) =>
                                Math.min(activeScannedPages!.length - 1, prev + 1)
                              )
                            }
                            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer font-bold"
                          >
                            หน้าถัดไป ▶
                          </button>
                        </div>
                      </div>

                      <div className="w-full max-h-[550px] overflow-auto bg-slate-900/5 rounded-xl border border-slate-200 flex items-center justify-center p-2">
                        {activeScannedPages[currentPageIndex].startsWith("data:application/pdf") ||
                        activeScannedPages[currentPageIndex].toLowerCase().endsWith(".pdf") ? (
                          <iframe
                            src={activeScannedPages[currentPageIndex]}
                            title={`Document page ${currentPageIndex + 1}`}
                            className="w-full h-[500px] rounded-lg border-none bg-white"
                          />
                        ) : (
                          <img
                            src={activeScannedPages[currentPageIndex]}
                            alt={`Document page ${currentPageIndex + 1}`}
                            className="max-h-[480px] w-auto object-contain shadow-md rounded"
                          />
                        )}
                      </div>
                    </div>
                  ) : activePdfUrl &&
                    (activeCategory.type === "pdf" ||
                      activeFileName.toLowerCase().endsWith(".pdf") ||
                      activePdfUrl.startsWith("data:application/pdf") ||
                      activePdfUrl.startsWith("blob:")) ? (
                    <div className="w-full space-y-3">
                      <div className="w-full h-[540px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100 relative">
                        <object
                          data={activePdfUrl}
                          type="application/pdf"
                          className="w-full h-full"
                        >
                          <iframe
                            src={activePdfUrl}
                            title={doc.title}
                            className="w-full h-full border-none bg-white"
                          />
                        </object>
                      </div>
                      <div className="flex flex-wrap justify-between items-center text-xs text-slate-500 px-2 gap-2">
                        <span>📄 {activeFileName} ({Math.round(activeFileSize / 1024)} KB)</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => window.open(activePdfUrl, "_blank")}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold transition-all cursor-pointer"
                          >
                            เปิดในแท็บใหม่ ↗
                          </button>
                          <a
                            href={activePdfUrl}
                            download={activeFileName}
                            className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <span>⬇️</span>
                            <span>ดาวน์โหลดไฟล์ PDF</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  ) : activePdfUrl &&
                    (activeCategory.type === "image" ||
                      activePdfUrl.startsWith("data:image/") ||
                      /\.(png|jpe?g|webp|gif|bmp)$/i.test(activeFileName)) ? (
                    <div className="w-full space-y-3 flex flex-col items-center">
                      <div className="w-full max-h-[520px] overflow-auto bg-slate-900/5 rounded-xl border border-slate-200 flex items-center justify-center p-2">
                        <img
                          src={activePdfUrl}
                          alt={activeFileName}
                          className="max-h-[480px] w-auto object-contain shadow-md rounded"
                        />
                      </div>
                      <div className="w-full flex justify-between items-center text-xs text-slate-500 px-2">
                        <span>🖼️ {activeFileName} ({Math.round(activeFileSize / 1024)} KB)</span>
                        <a
                          href={activePdfUrl}
                          download={activeFileName}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <span>⬇️</span>
                          <span>ดาวน์โหลดรูปภาพ</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full py-12 flex flex-col items-center justify-center text-center space-y-3">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl border shadow-2xs ${activeCategory.bg}`}>
                        {activeCategory.icon}
                      </div>
                      <div className="text-sm font-bold text-slate-800">{activeFileName}</div>
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${activeCategory.bg}`}>
                        <span>{activeCategory.icon}</span>
                        <span>{activeCategory.label}</span>
                        {activeFileSize ? <span>• {(activeFileSize / 1024).toFixed(0)} KB</span> : null}
                      </div>
                      <p className="text-xs text-slate-500 max-w-sm">
                        ไฟล์เอกสารประเภท {activeCategory.label} รองรับการดาวน์โหลดไปเปิดหรือแก้ไขด้วยโปรแกรมบนอุปกรณ์ของท่าน
                      </p>
                      {activePdfUrl && (
                        <a
                          href={activePdfUrl}
                          download={activeFileName}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer flex items-center gap-2"
                        >
                          <span>⬇️</span>
                          <span>ดาวน์โหลดไฟล์ {activeFileName}</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>

              {/* User Acknowledged Verified Stamp Card (If already signed) */}
              {isRecipient && hasAcknowledged && recipientRecord && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-emerald-950 flex items-center gap-2">
                      <span className="text-base">🛡️</span>
                      <span>หลักฐานการลงนามรับทราบของท่าน (Electronic Signature Verified)</span>
                    </div>
                    <span className="font-mono text-[10px] text-emerald-700">
                      {recipientRecord.acknowledgedAt
                        ? new Date(recipientRecord.acknowledgedAt).toLocaleString("th-TH")
                        : "-"}
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-2xs flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900">{recipientRecord.memberName}</div>
                      <div className="text-[11px] text-slate-500">{recipientRecord.position}</div>
                      <div className="text-[11px] text-slate-700 italic pt-1">
                        &ldquo;{recipientRecord.endorsementNote || "รับทราบ"}&rdquo;
                      </div>
                    </div>

                    {recipientRecord.signatureUrl && (
                      <div className="p-1 bg-slate-50 rounded-lg border border-slate-200">
                        <img
                          src={recipientRecord.signatureUrl}
                          alt="ลายมือชื่อของท่าน"
                          className="h-10 max-w-32 object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Tab: Tracking Matrix */
            <div className="space-y-4">
              {/* Progress Summary Bar */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>ความคืบหน้าการรับทราบโดยรวม (ไม่นับสิทธิ์ Admin)</span>
                  <span className="text-indigo-600">{percent}% ({nonAdminAckCount}/{nonAdminRecipients.length} คน)</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>

              {/* Recipients List Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs divide-y divide-slate-100">
                  <thead className="bg-slate-50 text-slate-700 font-bold text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">เจ้าหน้าที่</th>
                      <th className="py-2.5 px-3">กลุ่ม / ฝ่ายงาน</th>
                      <th className="py-2.5 px-3 text-center">สถานะ</th>
                      <th className="py-2.5 px-3">วันเวลาที่รับทราบ</th>
                      <th className="py-2.5 px-3">ข้อความ / ลายเซ็น</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {doc.recipients.map((rec) => (
                      <tr key={rec.memberId} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{rec.memberName}</div>
                          <div className="text-[10px] text-slate-400">{rec.position}</div>
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-600">
                          <div>{rec.division}</div>
                          <span className="text-[10px] text-teal-700 font-medium">
                            {rec.personnelType}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {adminIdSet.has(rec.memberId) ? (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                              🛡️ ผู้ดูแลระบบ (ไม่คิดสถิติ)
                            </span>
                          ) : rec.isAcknowledged ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              ✓ รับทราบแล้ว
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                              รอรับทราบ
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-500 font-mono">
                          {rec.acknowledgedAt
                            ? new Date(rec.acknowledgedAt).toLocaleString("th-TH", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-"}
                        </td>
                        <td className="py-2.5 px-3">
                          {rec.signatureUrl ? (
                            <img
                              src={rec.signatureUrl}
                              alt="ลายเซ็น"
                              className="h-7 max-w-24 object-contain"
                            />
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">
                              {rec.endorsementNote || "-"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-all cursor-pointer"
          >
            ปิด
          </button>

          {/* Action to Acknowledge / Sign if user is a pending recipient */}
          {isRecipient && !hasAcknowledged && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFastAcknowledge}
                className="px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all cursor-pointer"
              >
                ⚡ รับทราบด่วน
              </button>

              <button
                type="button"
                onClick={() => setShowSignaturePad(true)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>✍️ ลงนามดิจิทัลรับทราบ ➜</span>
              </button>
            </div>
          )}
        </div>
    </>
  );

  const urgencyBadge = (
    <>
      {doc.urgency === "urgent" && (
        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">⚡ ด่วน</span>
      )}
      {doc.urgency === "very_urgent" && (
        <span className="px-2 py-0.5 rounded-full bg-orange-600 text-white text-[10px] font-bold">⚡⚡ ด่วนมาก</span>
      )}
      {doc.urgency === "most_urgent" && (
        <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold animate-pulse">🚨 ด่วนที่สุด</span>
      )}
    </>
  );

  if (inPage) {
    return (
      <div data-testid="circular-viewer-view" className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in text-slate-800 pb-12">
        {/* In-page Header Navigation */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs sm:text-sm transition-colors cursor-pointer"
            >
              <span>←</span>
              <span>ย้อนกลับไปรายการหนังสือเวียน</span>
            </button>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-xl">
              📜
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {doc.docNumber}
                </span>
                {urgencyBadge}
                {doc.deadline && (
                  <span
                    className="text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded"
                    title={`ครบกำหนดถือปฏิบัติ: ${toThaiDate(doc.deadline)}`}
                  >
                    ⏰ ภายใน {toThaiShortDate(doc.deadline, false)}
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-bold font-heading text-slate-800 mt-1 line-clamp-1">
                {doc.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(currentUser.role === "admin" || currentUser.role === "manager" || currentUser.id === doc.createdBy) && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบหนังสือเวียนเลขที่ ${doc.docNumber}? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
                    onDelete(doc.id);
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold flex items-center gap-1.5 border border-red-200 cursor-pointer transition-all"
                title="ลบหนังสือเวียนฉบับนี้"
              >
                <span>🗑️</span>
                <span>ลบเอกสาร</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (onPrintSlip) onPrintSlip();
                else setShowPrintSlip(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 border border-indigo-200 cursor-pointer transition-all"
              title="พิมพ์ใบสรุปผลการเวียนหนังสือราชการและหลักฐานการรับทราบ"
            >
              <span>🖨️</span>
              <span>พิมพ์สรุปผลการเวียน</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-all cursor-pointer"
            >
              ✕ ปิดหน้าเอกสาร
            </button>
          </div>
        </div>

        {/* Viewer Content Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none print:bg-transparent print:overflow-visible">
          {viewerBodyAndFooter}
        </div>

        {/* Signature Pad Submodal */}
        {showSignaturePad && (
          <DigitalSignaturePad
            currentUser={currentUser}
            docNumber={doc.docNumber}
            docTitle={doc.title}
            onConfirm={handleSignatureConfirmed}
            onCancel={() => setShowSignaturePad(false)}
          />
        )}

        {/* Print Slip Submodal */}
        {showPrintSlip && (
          <CirculationPrintSlip
            document={doc}
            availableMembers={availableMembers}
            onClose={() => setShowPrintSlip(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in text-slate-800 print:static print:p-0 print:bg-transparent print:backdrop-blur-none">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] print:max-w-none print:max-h-none print:border-none print:shadow-none print:bg-transparent print:overflow-visible">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-xl">
              📜
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-indigo-300">{doc.docNumber}</span>
                {urgencyBadge}
                {doc.deadline && (
                  <span
                    className="text-[10px] font-medium text-rose-200 bg-rose-900/60 border border-rose-500/40 px-2 py-0.5 rounded"
                    title={`ครบกำหนดถือปฏิบัติ: ${toThaiDate(doc.deadline)}`}
                  >
                    ⏰ ภายใน {toThaiShortDate(doc.deadline, false)}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold font-heading text-white truncate max-w-xl">
                {doc.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(currentUser.role === "admin" || currentUser.role === "manager" || currentUser.id === doc.createdBy) && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบหนังสือเวียนเลขที่ ${doc.docNumber}? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
                    onDelete(doc.id);
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                title="ลบหนังสือเวียนฉบับนี้"
              >
                <span>🗑️</span>
                <span>ลบ</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowPrintSlip(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              title="พิมพ์ใบสรุปผลการเวียนหนังสือราชการและหลักฐานการรับทราบ"
            >
              <span>🖨️</span>
              <span className="hidden sm:inline">พิมพ์สรุปผลการเวียน</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white text-sm cursor-pointer transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {viewerBodyAndFooter}
      </div>

      {/* Signature Pad Submodal */}
      {showSignaturePad && (
        <DigitalSignaturePad
          currentUser={currentUser}
          docNumber={doc.docNumber}
          docTitle={doc.title}
          onConfirm={handleSignatureConfirmed}
          onCancel={() => setShowSignaturePad(false)}
        />
      )}

      {/* Print Slip Submodal */}
      {showPrintSlip && (
        <CirculationPrintSlip
          document={doc}
          availableMembers={availableMembers}
          onClose={() => setShowPrintSlip(false)}
        />
      )}
    </div>
  );
}
