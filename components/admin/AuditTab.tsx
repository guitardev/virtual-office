"use client";

import React from "react";
import { AuditLog } from "@/lib/types";

interface AuditTabProps {
  auditLogs: AuditLog[];
  setAuditLogs: (logs: AuditLog[]) => void;
  showToast: (msg: string) => void;
  initialAuditLogs: AuditLog[];
}

export function AuditTab({
  auditLogs,
  setAuditLogs,
  showToast,
  initialAuditLogs,
}: AuditTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold font-heading text-sm text-slate-900">
          บันทึกกิจกรรมความปลอดภัยและสิทธิ์ล่าสุด
        </h3>
        <button
          type="button"
          onClick={() => {
            setAuditLogs(initialAuditLogs);
            showToast("🔄 รีเซ็ต Audit Log เรียบร้อย");
          }}
          className="text-xs text-[#4F46E5] font-semibold hover:underline cursor-pointer"
        >
          รีเฟรชบันทึก
        </button>
      </div>

      <div className="space-y-2.5">
        {auditLogs.map((log) => (
          <div
            key={log.id}
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
              log.status === "denied"
                ? "bg-red-50/60 border-red-200/80"
                : "bg-slate-50 border-slate-200/70"
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    log.status === "denied"
                      ? "bg-red-100 text-red-700"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {log.status === "denied" ? "✕ DENIED (403)" : "✓ SUCCESS"}
                </span>
                <span className="font-bold text-slate-800">{log.actor}</span>
                <span className="text-slate-400">· {log.timestamp}</span>
              </div>
              <div className="text-slate-700 font-medium">{log.action}</div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 font-mono text-[11px] shrink-0 self-start sm:self-auto">
              {log.target}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
