"use client";

import React from "react";
import { formatBytes } from "@/lib/synology-photos";

export interface UploadBatchItem {
  id: string;
  name: string;
  size: number;
  progress: number; // 0 to 100
  status: "pending" | "uploading" | "success" | "error";
  errorMessage?: string;
}

export interface NasUploadProgressModalProps {
  isOpen: boolean;
  currentIndex: number;
  totalCount: number;
  currentFileName: string;
  currentPercent: number;
  batchItems: UploadBatchItem[];
  isComplete: boolean;
  successCount: number;
  errorCount: number;
  onClose: () => void;
  title?: string;
  destinationPath?: string;
}

export function NasUploadProgressModal({
  isOpen,
  currentIndex,
  totalCount,
  currentFileName,
  currentPercent,
  batchItems,
  isComplete,
  successCount,
  errorCount,
  onClose,
  title = "อัปโหลดไฟล์สู่ Synology NAS",
  destinationPath,
}: NasUploadProgressModalProps) {
  if (!isOpen) return null;

  // Calculate overall batch percent
  const overallPercent =
    totalCount > 0
      ? Math.min(
          100,
          Math.round(
            ((Math.max(0, currentIndex - 1) + currentPercent / 100) / totalCount) *
              100
          )
        )
      : 0;

  const totalBytes = batchItems.reduce((acc, it) => acc + it.size, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-500/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-lg">
              {isComplete ? (errorCount === 0 ? "✅" : "⚠️") : "📤"}
            </div>
            <div>
              <h3 className="font-bold font-heading text-sm text-white">
                {title}
              </h3>
              <p className="text-[11px] text-indigo-200/80 truncate max-w-xs">
                {destinationPath ? `ปลายทาง: ${destinationPath}` : "Synology DSM Storage"}
              </p>
            </div>
          </div>
          {isComplete && (
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Progress Overview Section */}
        <div className="p-6 bg-slate-50 border-b border-slate-200/70 space-y-3.5">
          {/* Main Status Text */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-2">
              {!isComplete ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
                  <span>
                    กำลังประมวลผลไฟล์ที่ {Math.min(currentIndex, totalCount)} จาก {totalCount}
                  </span>
                </>
              ) : errorCount === 0 ? (
                <span className="text-emerald-700 flex items-center gap-1.5">
                  <span>🎉</span>
                  <span>อัปโหลดเสร็จสมบูรณ์ครบทั้ง {successCount} ไฟล์</span>
                </span>
              ) : (
                <span className="text-amber-800 flex items-center gap-1.5">
                  <span>⚠️</span>
                  <span>
                    อัปโหลดสำเร็จ {successCount} ไฟล์ (ผิดพลาด {errorCount} ไฟล์)
                  </span>
                </span>
              )}
            </span>
            <span className="font-mono font-bold text-indigo-700 text-sm">
              {isComplete ? (errorCount === 0 ? "100%" : `${overallPercent}%`) : `${overallPercent}%`}
            </span>
          </div>

          {/* Overall Batch Progress Bar */}
          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-300/50">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isComplete
                  ? errorCount === 0
                    ? "bg-emerald-500"
                    : "bg-amber-500"
                  : "bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500"
              }`}
              style={{ width: `${isComplete ? 100 : overallPercent}%` }}
            ></div>
          </div>

          {/* Current File Sub-Progress (while uploading) */}
          {!isComplete && currentFileName && (
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 text-[11px] space-y-1.5">
              <div className="flex items-center justify-between text-slate-600">
                <span className="truncate max-w-[280px] font-mono font-medium">
                  📄 {currentFileName}
                </span>
                <span className="font-mono text-slate-500 shrink-0">
                  {currentPercent}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 rounded-full transition-all duration-150"
                  style={{ width: `${currentPercent}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Quick Metrics */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
            <span>
              ขนาดรวม: <strong className="text-slate-700">{formatBytes(totalBytes)}</strong>
            </span>
            <div className="flex items-center gap-3">
              <span className="text-emerald-700 font-semibold">
                ✅ สำเร็จ: {successCount}
              </span>
              {errorCount > 0 && (
                <span className="text-rose-700 font-semibold">
                  ❌ ล้มเหลว: {errorCount}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Detailed File List */}
        <div className="p-4 flex-1 overflow-y-auto space-y-2 max-h-[300px]">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
            รายการไฟล์ในชุดอัปโหลด ({batchItems.length} รายการ):
          </div>

          {batchItems.map((item, idx) => (
            <div
              key={item.id || idx}
              className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs ${
                item.status === "success"
                  ? "bg-emerald-50/60 border-emerald-200/80 text-emerald-900"
                  : item.status === "error"
                  ? "bg-rose-50/70 border-rose-200 text-rose-900"
                  : item.status === "uploading"
                  ? "bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200 text-indigo-900"
                  : "bg-slate-50/60 border-slate-200/70 text-slate-600"
              }`}
            >
              <div className="flex items-center gap-2 truncate flex-1">
                <span className="text-sm shrink-0">
                  {item.status === "success"
                    ? "✅"
                    : item.status === "error"
                    ? "❌"
                    : item.status === "uploading"
                    ? "⏳"
                    : "◽"}
                </span>
                <div className="truncate">
                  <div className="truncate font-mono font-medium text-[11px]">
                    {item.name}
                  </div>
                  {item.errorMessage ? (
                    <div className="text-[10px] text-rose-600 truncate mt-0.5">
                      {item.errorMessage}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400">
                      {formatBytes(item.size)}
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0 text-right">
                {item.status === "uploading" && (
                  <span className="font-mono text-[11px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                    {item.progress}%
                  </span>
                )}
                {item.status === "success" && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    สำเร็จ
                  </span>
                )}
                {item.status === "error" && (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                    ผิดพลาด
                  </span>
                )}
                {item.status === "pending" && (
                  <span className="text-[10px] text-slate-400">รอคิว</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {isComplete
              ? "การประมวลผลเสร็จสิ้น"
              : "กรุณาอย่าปิดหน้านี้ขณะระบบกำลังถ่ายโอนไฟล์"}
          </span>
          {isComplete && (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

