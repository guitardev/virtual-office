"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { CircularDocument, Member, CircularUrgency } from "@/lib/types";
import { fetchCircularDocs, recordAuditLog } from "@/lib/supabase";

interface DocumentsTabProps {
  currentUser: Member | null;
  circularDocs?: CircularDocument[];
  showToast: (msg: string) => void;
  onOpenCircularDoc?: (docId: string) => void;
}

const URGENCY_CONFIG: Record<
  CircularUrgency,
  { label: string; badge: string; icon: string }
> = {
  normal: { label: "ปกติ", badge: "bg-slate-100 text-slate-700 border-slate-200", icon: "📄" },
  urgent: { label: "ด่วน", badge: "bg-amber-50 text-amber-800 border-amber-200", icon: "⚡" },
  very_urgent: { label: "ด่วนมาก", badge: "bg-orange-50 text-orange-800 border-orange-200", icon: "⚡⚡" },
  most_urgent: { label: "ด่วนที่สุด", badge: "bg-rose-50 text-rose-800 border-rose-200 animate-pulse", icon: "🚨" },
};

export function DocumentsTab({
  currentUser,
  circularDocs: initialDocs,
  showToast,
  onOpenCircularDoc,
}: DocumentsTabProps) {
  const [docs, setDocs] = useState<CircularDocument[]>(initialDocs || []);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<"all" | CircularUrgency>("all");

  const refreshDocs = useCallback(async () => {
    setLoading(true);
    try {
      const fresh = await fetchCircularDocs();
      if (fresh && fresh.length > 0) {
        setDocs(fresh);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDocs();
  }, [refreshDocs]);

  const stats = useMemo(() => {
    const total = docs.length;
    const mostUrgent = docs.filter((d) => d.urgency === "most_urgent").length;
    const active = docs.filter((d) => d.status === "active").length;
    const totalAcks = docs.reduce((acc, d) => acc + (d.acknowledgedCount || 0), 0);
    return { total, mostUrgent, active, totalAcks };
  }, [docs]);

  const filteredDocs = useMemo(() => {
    return docs.filter((d) => {
      if (urgencyFilter !== "all" && d.urgency !== urgencyFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        d.docNumber.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.senderOrg.toLowerCase().includes(q)
      );
    });
  }, [docs, urgencyFilter, search]);

  const handleExportRegistryCSV = () => {
    if (docs.length === 0) {
      showToast("ไม่มีข้อมูลหนังสือเวียนสำหรับส่งออก");
      return;
    }

    const headers = [
      "ลำดับ",
      "เลขที่หนังสือ",
      "ลงวันที่",
      "ชั้นความเร็ว",
      "เรื่อง",
      "หน่วยงานผู้ส่ง",
      "ผู้สร้าง",
      "ยอดรับทราบ/ทั้งหมด",
      "สถานะ",
    ];

    const rows = docs.map((d, idx) => [
      idx + 1,
      `"${d.docNumber.replace(/"/g, '""')}"`,
      `"${d.issuedDate || ""}"`,
      `"${URGENCY_CONFIG[d.urgency]?.label || d.urgency}"`,
      `"${d.title.replace(/"/g, '""')}"`,
      `"${d.senderOrg.replace(/"/g, '""')}"`,
      `"${d.createdByName || d.createdBy || ""}"`,
      `"${d.acknowledgedCount || 0}/${d.totalCount || 0}"`,
      `"${d.status}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `circular_registry_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    recordAuditLog(
      currentUser?.name || "Admin",
      "ส่งออกทะเบียนคุมหนังสือเวียนราชการ (CSV)",
      "Circular Documents Register",
      "success"
    );
    showToast("📥 ส่งออกทะเบียนคุมหนังสือเวียน (CSV) สำเร็จ");
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">📜</span>
          <div className="text-xs leading-relaxed text-orange-950">
            <span className="font-bold block text-sm mb-0.5">
              ศูนย์ควบคุมทะเบียนหนังสือเวียน &amp; เอกสารราชการกลาง (Circular Documents Registry)
            </span>
            ทะเบียนคุมหนังสือสั่งการ บันทึกข้อความเวียน สถิติการรับทราบและการลงนามดิจิทัลของบุคลากรทุกกลุ่มงาน
          </div>
        </div>
        <button
          type="button"
          onClick={handleExportRegistryCSV}
          className="px-3.5 py-2 bg-white hover:bg-orange-100/60 text-orange-900 border border-orange-300 rounded-xl text-xs font-bold transition-colors shrink-0 shadow-xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>📥</span>
          <span>ส่งออกทะเบียนคุม (CSV)</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] text-slate-500 font-medium uppercase">หนังสือทั้งหมด</div>
          <div className="text-2xl font-bold font-heading text-slate-900 mt-0.5">{stats.total}</div>
          <div className="text-[10px] text-slate-400">ฉบับในสารบบ</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] text-slate-500 font-medium uppercase">ด่วนที่สุด (Most Urgent)</div>
          <div className="text-2xl font-bold font-heading text-rose-600 mt-0.5">{stats.mostUrgent}</div>
          <div className="text-[10px] text-rose-500">🚨 ต้องกำกับติดตาม</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] text-slate-500 font-medium uppercase">ฉบับเปิดรับทราบ</div>
          <div className="text-2xl font-bold font-heading text-emerald-600 mt-0.5">{stats.active}</div>
          <div className="text-[10px] text-emerald-500">🟢 รอการลงนามรับทราบ</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] text-slate-500 font-medium uppercase">ยอดรับทราบรวม</div>
          <div className="text-2xl font-bold font-heading text-indigo-600 mt-0.5">{stats.totalAcks}</div>
          <div className="text-[10px] text-indigo-500">✍️ ครั้งที่มีการลงนาม</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาเลขที่หนังสือ, ชื่อเรื่อง, หน่วยงานผู้ส่ง..."
            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2">
          {(["all", "most_urgent", "very_urgent", "urgent", "normal"] as const).map((urg) => (
            <button
              key={urg}
              type="button"
              onClick={() => setUrgencyFilter(urg)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                urgencyFilter === urg
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {urg === "all"
                ? "ทั้งหมด"
                : urg === "most_urgent"
                ? "🚨 ด่วนที่สุด"
                : urg === "very_urgent"
                ? "⚡ ด่วนมาก"
                : urg === "urgent"
                ? "ด่วน"
                : "ปกติ"}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Registry Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
              <tr>
                <th className="px-4 py-3">เลขที่หนังสือ</th>
                <th className="px-4 py-3">เรื่อง / สาระสำคัญ</th>
                <th className="px-4 py-3">ความเร็ว</th>
                <th className="px-4 py-3">หน่วยงานผู้ส่ง</th>
                <th className="px-4 py-3">การรับทราบ</th>
                <th className="px-4 py-3 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    ไม่พบรายการหนังสือเวียนตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const ackPercent = doc.totalCount > 0 ? Math.round((doc.acknowledgedCount / doc.totalCount) * 100) : 0;
                  const urg = URGENCY_CONFIG[doc.urgency] || URGENCY_CONFIG.normal;

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {doc.docNumber}
                        <span className="block text-[10px] text-slate-400 font-sans font-normal mt-0.5">
                          {doc.issuedDate}
                        </span>
                      </td>

                      <td className="px-4 py-3 max-w-xs md:max-w-md">
                        <div className="font-semibold text-slate-900 line-clamp-2">{doc.title}</div>
                        {doc.summary && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{doc.summary}</div>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${urg.badge}`}>
                          {urg.icon} {urg.label}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {doc.senderOrg}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${ackPercent}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-800">
                            {doc.acknowledgedCount}/{doc.totalCount} ({ackPercent}%)
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {doc.fileUrl && (
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-semibold transition-colors"
                              title="เปิดเอกสารแนบ"
                            >
                              📄 เอกสาร
                            </a>
                          )}
                          {onOpenCircularDoc && (
                            <button
                              type="button"
                              onClick={() => onOpenCircularDoc(doc.id)}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              เปิดดู
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
