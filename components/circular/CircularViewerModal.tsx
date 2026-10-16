"use client";

import React, { useState } from "react";
import { Member, CircularDocument } from "@/lib/types";
import { DigitalSignaturePad } from "./DigitalSignaturePad";
import { CirculationPrintSlip } from "./CirculationPrintSlip";

interface CircularViewerModalProps {
  document: CircularDocument;
  currentUser: Member;
  onAcknowledge: (docId: string, signatureUrl?: string, endorsementNote?: string) => void;
  onClose: () => void;
}

export function CircularViewerModal({
  document: doc,
  currentUser,
  onAcknowledge,
  onClose,
}: CircularViewerModalProps) {
  const [activeTab, setActiveTab] = useState<"doc" | "tracking">("doc");
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [showSignaturePad, setShowSignaturePad] = useState<boolean>(false);
  const [showPrintSlip, setShowPrintSlip] = useState<boolean>(false);

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

  const percent = Math.round((doc.acknowledgedCount / Math.max(1, doc.totalCount)) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in text-slate-800">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-xl">
              📜
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-indigo-300">{doc.docNumber}</span>
                {doc.urgency === "urgent" && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                    ⚡ ด่วน
                  </span>
                )}
                {doc.urgency === "very_urgent" && (
                  <span className="px-2 py-0.5 rounded-full bg-orange-600 text-white text-[10px] font-bold">
                    ⚡⚡ ด่วนมาก
                  </span>
                )}
                {doc.urgency === "most_urgent" && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold animate-pulse">
                    🚨 ด่วนที่สุด
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold font-heading text-white truncate max-w-xl">
                {doc.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPrintSlip(true)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              title="พิมพ์ใบสรุปผลการเวียนหนังสือราชการ"
            >
              <span>🖨️</span>
              <span className="hidden sm:inline">พิมพ์รายงาน</span>
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

        {/* Tab Switcher & Status Bar */}
        <div className="px-6 py-2 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
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
                {doc.acknowledgedCount}/{doc.totalCount}
              </span>
            </button>
          </div>

          {/* User Acknowledgment Quick Badge */}
          {isRecipient && (
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
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#F8FAFC]">
          {activeTab === "doc" ? (
            <div className="space-y-6">
              {/* Document Metadata Banner */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <strong>หน่วยงานเจ้าของเรื่อง:</strong> {doc.senderOrg}
                  </div>
                  <div>
                    <strong>ลงวันที่:</strong> {doc.issuedDate}
                  </div>
                </div>

                {doc.summary && (
                  <div className="pt-2 border-t border-slate-100 text-slate-700">
                    <strong className="text-slate-900">สาระสำคัญ:</strong> {doc.summary}
                  </div>
                )}
              </div>

              {/* Document Viewing Area */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col items-center">
                {doc.scannedPages && doc.scannedPages.length > 0 ? (
                  <div className="w-full space-y-3">
                    {/* Multi-page controls */}
                    <div className="flex items-center justify-between text-xs px-2">
                      <span className="font-bold text-slate-700">
                        หน้า {currentPageIndex + 1} จาก {doc.scannedPages.length}
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
                          disabled={currentPageIndex === doc.scannedPages.length - 1}
                          onClick={() =>
                            setCurrentPageIndex((prev) =>
                              Math.min(doc.scannedPages!.length - 1, prev + 1)
                            )
                          }
                          className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer font-bold"
                        >
                          หน้าถัดไป ▶
                        </button>
                      </div>
                    </div>

                    <div className="w-full max-h-[550px] overflow-auto bg-slate-900/5 rounded-xl border border-slate-200 flex items-center justify-center p-2">
                      {doc.scannedPages[currentPageIndex].startsWith("data:application/pdf") ||
                      doc.scannedPages[currentPageIndex].toLowerCase().endsWith(".pdf") ? (
                        <iframe
                          src={doc.scannedPages[currentPageIndex]}
                          title={`Document page ${currentPageIndex + 1}`}
                          className="w-full h-[500px] rounded-lg border-none bg-white"
                        />
                      ) : (
                        <img
                          src={doc.scannedPages[currentPageIndex]}
                          alt={`Document page ${currentPageIndex + 1}`}
                          className="max-h-[480px] w-auto object-contain shadow-md rounded"
                        />
                      )}
                    </div>
                  </div>
                ) : doc.fileUrl &&
                  (doc.fileUrl.startsWith("data:application/pdf") ||
                    doc.fileName.toLowerCase().endsWith(".pdf")) ? (
                  <div className="w-full space-y-3">
                    <div className="w-full h-[520px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                      <iframe
                        src={doc.fileUrl}
                        title={doc.title}
                        className="w-full h-full border-none bg-white"
                      />
                    </div>
                    <div className="flex flex-wrap justify-between items-center text-xs text-slate-500 px-2 gap-2">
                      <span>📄 {doc.fileName} ({Math.round(doc.fileSize / 1024)} KB)</span>
                      <a
                        href={doc.fileUrl}
                        download={doc.fileName}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <span>⬇️</span>
                        <span>ดาวน์โหลดไฟล์ PDF</span>
                      </a>
                    </div>
                  </div>
                ) : doc.fileUrl &&
                  (doc.fileUrl.startsWith("data:image/") ||
                    /\.(png|jpe?g|webp|gif)$/i.test(doc.fileName)) ? (
                  <div className="w-full space-y-3 flex flex-col items-center">
                    <div className="w-full max-h-[520px] overflow-auto bg-slate-900/5 rounded-xl border border-slate-200 flex items-center justify-center p-2">
                      <img
                        src={doc.fileUrl}
                        alt={doc.fileName}
                        className="max-h-[480px] w-auto object-contain shadow-md rounded"
                      />
                    </div>
                    <div className="w-full flex justify-between items-center text-xs text-slate-500 px-2">
                      <span>🖼️ {doc.fileName} ({Math.round(doc.fileSize / 1024)} KB)</span>
                      <a
                        href={doc.fileUrl}
                        download={doc.fileName}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <span>⬇️</span>
                        <span>ดาวน์โหลดรูปภาพ</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="w-full py-12 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="text-4xl">📄</div>
                    <div className="text-sm font-bold text-slate-800">{doc.fileName}</div>
                    <p className="text-xs text-slate-500 max-w-sm">
                      เอกสารจัดเก็บบนระบบคลังเอกสารความปลอดภัยสูง Synology NAS
                    </p>
                    <a
                      href={doc.fileUrl}
                      download={doc.fileName}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs border border-indigo-200 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <span>⬇️</span>
                      <span>เปิดหรือดาวน์โหลดเอกสาร</span>
                    </a>
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
                  <span>ความคืบหน้าการรับทราบโดยรวม</span>
                  <span className="text-indigo-600">{percent}% ({doc.acknowledgedCount}/{doc.totalCount} คน)</span>
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
                          {rec.isAcknowledged ? (
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
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
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
        <CirculationPrintSlip document={doc} onClose={() => setShowPrintSlip(false)} />
      )}
    </div>
  );
}
