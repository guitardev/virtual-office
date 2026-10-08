"use client";

import React from "react";
import { AccessRequest } from "@/lib/types";
import { ROLE_CONFIG, PERSONNEL_TYPE_CONFIG } from "@/lib/rbac";

interface RequestsTabProps {
  accessRequests: AccessRequest[];
  requestSearch: string;
  setRequestSearch: (val: string) => void;
  requestStatusFilter: "all" | "pending" | "approved" | "rejected";
  setRequestStatusFilter: (val: "all" | "pending" | "approved" | "rejected") => void;
  setSelectedRequest: (req: AccessRequest | null) => void;
  setShowRequestDetailModal: (val: boolean) => void;
  handleOpenEditRequest: (req: AccessRequest) => void;
  handleApproveRequest: (req: AccessRequest) => void;
  setRejectReason: (val: string) => void;
  setShowRejectModal: (val: boolean) => void;
}

export function RequestsTab({
  accessRequests,
  requestSearch,
  setRequestSearch,
  requestStatusFilter,
  setRequestStatusFilter,
  setSelectedRequest,
  setShowRequestDetailModal,
  handleOpenEditRequest,
  handleApproveRequest,
  setRejectReason,
  setShowRejectModal,
}: RequestsTabProps) {
  const filteredRequests = accessRequests.filter((req) => {
    if (requestStatusFilter !== "all" && req.status !== requestStatusFilter) {
      return false;
    }
    if (!requestSearch.trim()) return true;
    const q = requestSearch.toLowerCase();
    return (
      req.name.toLowerCase().includes(q) ||
      req.position.toLowerCase().includes(q) ||
      req.division.toLowerCase().includes(q) ||
      req.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">📬</span>
          <div className="text-xs leading-relaxed text-amber-900">
            <span className="font-bold block text-sm mb-0.5">
              ศูนย์จัดการคำขอสิทธิ์เข้าใช้งานใหม่ (Access Requests Management)
            </span>
            ตรวจสอบคำขอที่ยื่นผ่านหน้าเข้าสู่ระบบ อนุมัติเพื่อสร้างบุคลากรใหม่ในระบบอัตโนมัติ หรือแก้ไขสิทธิ์/ปฏิเสธคำขอ
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1 rounded-xl bg-white border border-amber-200 text-amber-800 text-xs font-bold shadow-2xs">
            🟡 รออนุมัติ: {accessRequests.filter((r) => r.status === "pending").length}
          </span>
          <span className="px-3 py-1 rounded-xl bg-white border border-emerald-200 text-emerald-800 text-xs font-bold shadow-2xs">
            🟢 อนุมัติแล้ว: {accessRequests.filter((r) => r.status === "approved").length}
          </span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="ค้นหาคำขอตามชื่อ ตำแหน่ง อีเมล หรือฝ่าย..."
            value={requestSearch}
            onChange={(e) => setRequestSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#4F46E5] text-slate-800"
          />
          <span className="absolute left-3 top-3 text-slate-400 text-xs">🔍</span>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          {[
            { id: "all", label: "ทั้งหมด", count: accessRequests.length },
            { id: "pending", label: "รอตรวจสอบ", count: accessRequests.filter((r) => r.status === "pending").length },
            { id: "approved", label: "อนุมัติแล้ว", count: accessRequests.filter((r) => r.status === "approved").length },
            { id: "rejected", label: "ปฏิเสธ", count: accessRequests.filter((r) => r.status === "rejected").length },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setRequestStatusFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                requestStatusFilter === f.id
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>

      {/* Table of Requests */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider bg-slate-50/60">
              <th className="py-3 px-4">ผู้ยื่นคำขอ</th>
              <th className="py-3 px-4">ตำแหน่ง & กลุ่ม/ฝ่าย</th>
              <th className="py-3 px-4">ช่องทางติดต่อ</th>
              <th className="py-3 px-4">สิทธิ์ที่ขอ</th>
              <th className="py-3 px-4">เหตุผลความจำเป็น</th>
              <th className="py-3 px-4">สถานะ</th>
              <th className="py-3 px-4 text-center">การดำเนินการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRequests.map((req) => (
              <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                {/* ผู้ยื่นคำขอ */}
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-[#4F46E5] font-bold text-xs flex items-center justify-center shrink-0">
                      {req.firstName.slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <span>{req.name}</span>
                        {req.nickname && (
                          <span className="text-[11px] text-slate-500 font-normal">
                            ({req.nickname})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 font-medium text-[10px]">
                          {PERSONNEL_TYPE_CONFIG[req.personnelType]?.icon || "🏛️"} {req.personnelType}
                        </span>
                        <span className="text-[10px] text-slate-400">· {req.createdAt}</span>
                      </div>
                    </div>
                  </div>
                </td>

                {/* ตำแหน่ง & กลุ่ม/ฝ่าย */}
                <td className="py-3 px-4 text-xs">
                  <div className="font-semibold text-slate-800">{req.position}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{req.division}</div>
                </td>

                {/* ช่องทางติดต่อ */}
                <td className="py-3 px-4 text-xs">
                  <div className="text-slate-700 font-mono text-[11px]">{req.email}</div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    📞 {req.phone} {req.lineId && req.lineId !== "-" ? `· Line: ${req.lineId}` : ""}
                  </div>
                </td>

                {/* สิทธิ์ที่ขอ */}
                <td className="py-3 px-4 text-xs">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border ${ROLE_CONFIG[req.requestedRole]?.badgeColor || "bg-slate-100 text-slate-700"}`}>
                    <span>{ROLE_CONFIG[req.requestedRole]?.icon}</span>
                    <span>{ROLE_CONFIG[req.requestedRole]?.label.split(" ")[0]}</span>
                  </span>
                  {req.approvedRole && req.approvedRole !== req.requestedRole && (
                    <div className="text-[10px] text-emerald-600 font-semibold mt-1">
                      อนุมัติเป็น: {ROLE_CONFIG[req.approvedRole]?.label.split(" ")[0]}
                    </div>
                  )}
                </td>

                {/* เหตุผลความจำเป็น */}
                <td className="py-3 px-4 text-xs max-w-xs">
                  <div className="line-clamp-2 text-slate-600 italic bg-slate-50 p-1.5 rounded-lg border border-slate-100 text-[11px]">
                    "{req.reason}"
                  </div>
                </td>

                {/* สถานะ */}
                <td className="py-3 px-4 text-xs">
                  {req.status === "pending" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      รอการตรวจสอบ
                    </span>
                  )}
                  {req.status === "approved" && (
                    <div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <span>✓</span>
                        อนุมัติแล้ว
                      </span>
                      {req.reviewedBy && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          โดย {req.reviewedBy}
                        </div>
                      )}
                    </div>
                  )}
                  {req.status === "rejected" && (
                    <div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                        <span>✕</span>
                        ปฏิเสธ
                      </span>
                      {req.reviewNotes && (
                        <div className="text-[10px] text-red-600 truncate max-w-[120px] mt-0.5" title={req.reviewNotes}>
                          {req.reviewNotes}
                        </div>
                      )}
                    </div>
                  )}
                </td>

                {/* การดำเนินการ */}
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {/* ดูรายละเอียด */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRequest(req);
                        setShowRequestDetailModal(true);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-[#4F46E5] hover:bg-indigo-100 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="ดูรายละเอียดคำขอฉบับเต็ม"
                    >
                      <span>👁️</span>
                      <span className="hidden sm:inline">ดู</span>
                    </button>

                    {/* แก้ไข */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditRequest(req)}
                      className="px-2.5 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 hover:bg-teal-100 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="แก้ไขข้อมูลคำขอและสิทธิ์ที่จะอนุมัติ"
                    >
                      <span>✏️</span>
                      <span className="hidden sm:inline">แก้ไข</span>
                    </button>

                    {/* อนุมัติ (เฉพาะ pending) */}
                    {req.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => handleApproveRequest(req)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="อนุมัติคำขอและเพิ่มเป็นบุคลากรในระบบทันที"
                      >
                        <span>✓</span>
                        <span className="hidden sm:inline">อนุมัติ</span>
                      </button>
                    )}

                    {/* ปฏิเสธ (เฉพาะ pending) */}
                    {req.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRequest(req);
                          setRejectReason("");
                          setShowRejectModal(true);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                        title="ปฏิเสธคำขอเข้าใช้งาน"
                      >
                        <span>✕</span>
                        <span className="hidden sm:inline">ปฏิเสธ</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {filteredRequests.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                  ไม่มีรายการคำขอเข้าใช้งานในขณะนี้
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
