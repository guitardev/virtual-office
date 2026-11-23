"use client";

import React from "react";
import LeaveFormPrintView from "./LeaveFormPrintView";
import {
  LEAVE_STATUS_META,
  LEAVE_TYPE_META,
  LeaveRequestItem,
  resolveLeaveAttachmentUrl,
} from "@/lib/leave-utils";

interface LeavePreviewModalProps {
  leave: LeaveRequestItem;
  onClose: () => void;
  onDownloadDocx: (leave: LeaveRequestItem) => void;
  onDownloadPdf: (leave: LeaveRequestItem) => void;
  downloadingId?: string | null;
}

export default function LeavePreviewModal({
  leave,
  onClose,
  onDownloadDocx,
  onDownloadPdf,
  downloadingId,
}: LeavePreviewModalProps) {
  const typeMeta = LEAVE_TYPE_META[leave.leaveType];
  const statusMeta = LEAVE_STATUS_META[leave.status];
  const resolvedAttachment = resolveLeaveAttachmentUrl(leave.attachmentUrl);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #leave-print-sheet,
          #leave-print-sheet * {
            visibility: visible !important;
          }
          #leave-print-sheet {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            z-index: 99999 !important;
          }
        }
      `}</style>

      <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex flex-col print:bg-white">
        {/* Top Action Bar */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              👁️ ตัวอย่างแบบฟอร์ม A4: {leave.requestNo}
            </span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${typeMeta.badgeClass}`}
            >
              {typeMeta.icon} {typeMeta.label}
            </span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${statusMeta.badgeClass}`}
            >
              {statusMeta.label}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {resolvedAttachment && (
              <a
                href={resolvedAttachment}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-semibold flex items-center gap-1"
              >
                📎 {leave.attachmentName || "ดูเอกสารแนบ"}
              </a>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
            >
              🖨️ พิมพ์ A4
            </button>
            <button
              type="button"
              disabled={downloadingId === `${leave.id}:docx`}
              onClick={() => onDownloadDocx(leave)}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold disabled:opacity-50 cursor-pointer"
            >
              {downloadingId === `${leave.id}:docx` ? "⏳..." : "📝 Word (.docx)"}
            </button>
            <button
              type="button"
              disabled={downloadingId === `${leave.id}:pdf`}
              onClick={() => onDownloadPdf(leave)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
            >
              {downloadingId === `${leave.id}:pdf` ? "⏳..." : "📄 PDF (.pdf)"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
            >
              ✕ ปิด
            </button>
          </div>
        </div>

        {/* Scrollable A4 Paper Preview */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex justify-center print:p-0 print:overflow-visible">
          <div className="max-w-full overflow-x-auto">
            <LeaveFormPrintView leave={leave} />
          </div>
        </div>
      </div>
    </>
  );
}
