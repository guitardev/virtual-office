"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AuditLog } from "@/lib/types";
import { fetchAuditLogs, subscribeToAuditLogs } from "@/lib/supabase";

interface AuditTabProps {
  auditLogs: AuditLog[];
  setAuditLogs: (logs: AuditLog[]) => void;
  showToast: (msg: string) => void;
  initialAuditLogs: AuditLog[];
}

type StatusFilter = "all" | "success" | "denied";

const ACTION_CATEGORIES: { label: string; keywords: string[] }[] = [
  { label: "ทั้งหมด", keywords: [] },
  { label: "จัดการสมาชิก", keywords: ["บุคลากร", "สมาชิก", "เพิ่ม", "ลบ", "แก้ไข"] },
  { label: "อนุมัติสิทธิ์", keywords: ["อนุมัติ", "ปฏิเสธ", "คำขอ"] },
  { label: "จัดการ RBAC", keywords: ["Role", "สิทธิ์", "โมดูล", "RBAC"] },
  { label: "เข้าสู่ระบบ", keywords: ["เข้าสู่ระบบ", "ออกจากระบบ", "Login", "Logout"] },
];

export function AuditTab({
  auditLogs,
  setAuditLogs,
  showToast,
  initialAuditLogs,
}: AuditTabProps) {
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryIdx, setCategoryIdx] = useState(0);
  const [actorFilter, setActorFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Fetch fresh data from Supabase
  const refreshLogs = useCallback(async () => {
    setLoading(true);
    try {
      const fresh = await fetchAuditLogs({ limit: 500 });
      if (fresh && fresh.length > 0) {
        setAuditLogs(fresh);
        setIsLive(true);
      }
    } catch {
      // fallback silently
    } finally {
      setLoading(false);
    }
  }, [setAuditLogs]);

  // Load on mount + Realtime subscription
  useEffect(() => {
    refreshLogs();
    const unsub = subscribeToAuditLogs((updated) => {
      setAuditLogs(updated);
    });
    return unsub;
  }, [refreshLogs, setAuditLogs]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [search, statusFilter, categoryIdx, actorFilter, dateFrom, dateTo]);

  // Unique actor list for quick filter
  const uniqueActors = useMemo(() => {
    const set = new Set(auditLogs.map((l) => l.actor).filter(Boolean));
    return Array.from(set).sort();
  }, [auditLogs]);

  // Apply all filters
  const filtered = useMemo(() => {
    const cat = ACTION_CATEGORIES[categoryIdx];
    return auditLogs.filter((log) => {
      if (statusFilter !== "all" && log.status !== statusFilter) return false;
      if (actorFilter && log.actor !== actorFilter) return false;
      if (cat.keywords.length > 0) {
        const matchesCat = cat.keywords.some(
          (kw) =>
            log.action.includes(kw) ||
            log.target.includes(kw) ||
            log.actor.includes(kw)
        );
        if (!matchesCat) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !log.action.toLowerCase().includes(q) &&
          !log.target.toLowerCase().includes(q) &&
          !log.actor.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [auditLogs, statusFilter, categoryIdx, actorFilter, search, dateFrom, dateTo]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Export CSV
  const handleExportCSV = () => {
    const header = ["เวลา", "ผู้ดำเนินการ", "กิจกรรม", "เป้าหมาย", "สถานะ"];
    const rows = filtered.map((l) => [
      `"${l.timestamp}"`,
      `"${l.actor}"`,
      `"${l.action}"`,
      `"${l.target}"`,
      l.status === "denied" ? "ถูกปฏิเสธ (403)" : "สำเร็จ",
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("📥 ส่งออก Audit Log CSV เรียบร้อยแล้ว");
  };

  const deniedCount = filtered.filter((l) => l.status === "denied").length;
  const successCount = filtered.filter((l) => l.status === "success").length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold font-heading text-sm text-slate-900 flex items-center gap-2">
            📜 บันทึกกิจกรรมความปลอดภัยและสิทธิ์
            {isLive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Supabase
              </span>
            )}
            {!isLive && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold">
                In-Memory
              </span>
            )}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            แสดง {filtered.length} รายการ จากทั้งหมด {auditLogs.length} รายการ
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={refreshLogs}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading ? (
              <span className="inline-block w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>🔄</span>
            )}
            รีเฟรช
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-[#4F46E5] hover:bg-indigo-100 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* Summary Mini-Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="text-[10px] text-slate-500 font-medium">กิจกรรมทั้งหมด</div>
          <div className="text-xl font-bold text-slate-900 mt-0.5">{filtered.length}</div>
        </div>
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
          <div className="text-[10px] text-emerald-700 font-medium">✓ สำเร็จ</div>
          <div className="text-xl font-bold text-emerald-700 mt-0.5">{successCount}</div>
        </div>
        <div className="p-3 rounded-xl bg-red-50 border border-red-200">
          <div className="text-[10px] text-red-700 font-medium">✕ ถูกปฏิเสธ</div>
          <div className="text-xl font-bold text-red-700 mt-0.5">{deniedCount}</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-4 space-y-3">
        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="ค้นหากิจกรรม, ผู้ดำเนินการ, หรือเป้าหมาย..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-[#4F46E5] focus:outline-none text-slate-800"
            />
            <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
          </div>
          {/* Actor filter */}
          <select
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-[#4F46E5] text-slate-700 cursor-pointer min-w-[160px]"
          >
            <option value="">👤 ผู้ดำเนินการ: ทั้งหมด</option>
            {uniqueActors.map((actor) => (
              <option key={actor} value={actor}>
                {actor}
              </option>
            ))}
          </select>
        </div>

        {/* Status + Category Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Status Filter */}
          <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-slate-200">
            {(["all", "success", "denied"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === s
                    ? s === "denied"
                      ? "bg-red-500 text-white shadow-sm"
                      : s === "success"
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "bg-[#4F46E5] text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {s === "all" ? "ทั้งหมด" : s === "success" ? "✓ สำเร็จ" : "✕ ถูกปฏิเสธ"}
              </button>
            ))}
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1 flex-wrap">
            {ACTION_CATEGORIES.map((cat, idx) => (
              <button
                key={cat.label}
                type="button"
                onClick={() => setCategoryIdx(idx)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                  categoryIdx === idx
                    ? "bg-indigo-50 border-indigo-300 text-[#4F46E5] font-bold"
                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Clear filters */}
          {(search || statusFilter !== "all" || categoryIdx !== 0 || actorFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setCategoryIdx(0);
                setActorFilter("");
                setDateFrom("");
                setDateTo("");
              }}
              className="px-2.5 py-1 rounded-lg text-xs text-red-600 font-semibold hover:bg-red-50 border border-red-200 transition-colors cursor-pointer"
            >
              ✕ ล้าง Filter
            </button>
          )}
        </div>
      </div>

      {/* Log List */}
      <div className="space-y-2">
        {loading && paginated.length === 0 && (
          <div className="flex items-center justify-center py-12 gap-3 text-slate-400 text-xs">
            <span className="inline-block w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            กำลังโหลด Audit Logs จาก Supabase...
          </div>
        )}

        {!loading && paginated.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-xs">
            <div className="text-3xl mb-2">📭</div>
            ไม่มีรายการที่ตรงกับเงื่อนไขการค้นหา
          </div>
        )}

        {paginated.map((log) => (
          <div
            key={log.id}
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
              log.status === "denied"
                ? "bg-red-50/70 border-red-200/80 hover:border-red-300"
                : "bg-white border-slate-200/70 hover:border-slate-300"
            }`}
          >
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] shrink-0 ${
                    log.status === "denied"
                      ? "bg-red-100 text-red-700 border border-red-200"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  }`}
                >
                  {log.status === "denied" ? "✕ DENIED (403)" : "✓ SUCCESS"}
                </span>
                <span className="font-bold text-slate-800 truncate">{log.actor}</span>
                <span className="text-slate-400 text-[11px] shrink-0">· {log.timestamp}</span>
              </div>
              <div className="text-slate-700 font-medium">{log.action}</div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 font-mono text-[11px] shrink-0 self-start sm:self-auto truncate max-w-xs">
              {log.target}
            </span>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-500">
            หน้า {page} จาก {totalPages} ({filtered.length} รายการ)
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← ก่อนหน้า
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const startPage = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p = startPage + i;
              if (p > totalPages) return null;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    page === p
                      ? "bg-[#4F46E5] text-white"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ถัดไป →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
