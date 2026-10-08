"use client";

import React from "react";
import { Member, Role } from "@/lib/types";
import { ROLE_CONFIG, PERSONNEL_TYPE_CONFIG } from "@/lib/rbac";

interface MembersTabProps {
  members: Member[];
  currentUser: Member | null;
  memberSearch: string;
  setMemberSearch: (val: string) => void;
  setShowAddMemberModal: (val: boolean) => void;
  setViewingMember: (m: Member | null) => void;
  handleOpenAdminEdit: (m: Member) => void;
  setMemberToDelete: (m: Member | null) => void;
  handleChangeMemberRole: (memberId: string, newRole: Role) => void;
}

export function MembersTab({
  members,
  currentUser,
  memberSearch,
  setMemberSearch,
  setShowAddMemberModal,
  setViewingMember,
  handleOpenAdminEdit,
  setMemberToDelete,
  handleChangeMemberRole,
}: MembersTabProps) {
  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      (m.nickname && m.nickname.toLowerCase().includes(memberSearch.toLowerCase())) ||
      (m.position && m.position.toLowerCase().includes(memberSearch.toLowerCase())) ||
      (m.division && m.division.toLowerCase().includes(memberSearch.toLowerCase())) ||
      m.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="ค้นหาตามชื่อ ตำแหน่ง หรือกลุ่ม/ฝ่าย..."
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#4F46E5]"
          />
          <span className="absolute left-3 top-3 text-slate-400 text-xs">🔍</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAddMemberModal(true)}
            className="px-3.5 py-2 bg-[#4F46E5] text-white rounded-xl text-xs font-bold hover:bg-[#4338CA] shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <span>+</span>
            <span>เพิ่มบุคลากรใหม่</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider bg-slate-50/60">
              <th className="py-3 px-4">บุคลากร / เจ้าหน้าที่</th>
              <th className="py-3 px-4">ตำแหน่ง & กลุ่ม/ฝ่าย</th>
              <th className="py-3 px-4">ช่องทางติดต่อ</th>
              <th className="py-3 px-4">สิทธิ์ (Role)</th>
              <th className="py-3 px-4">สถานะ</th>
              <th className="py-3 px-4 text-center">การดำเนินการ (Actions)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredMembers.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="flex items-center space-x-3">
                    {m.avatarUrl ? (
                      <img
                        src={m.avatarUrl}
                        alt={m.name}
                        className="w-9 h-9 rounded-xl object-cover shrink-0 border border-slate-200 shadow-xs cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => setViewingMember(m)}
                      />
                    ) : (
                      <div
                        onClick={() => setViewingMember(m)}
                        className="w-9 h-9 rounded-xl bg-indigo-100 text-[#4F46E5] font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-200 cursor-pointer hover:scale-105 transition-transform"
                      >
                        {m.avatarText}
                      </div>
                    )}
                    <div>
                      <div
                        onClick={() => setViewingMember(m)}
                        className="font-bold text-slate-900 text-xs flex items-center gap-1.5 cursor-pointer hover:text-indigo-600 transition-colors"
                      >
                        <span>{m.name}</span>
                        {m.nickname && (
                          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded-md">
                            ({m.nickname})
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{m.email}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-slate-800">{m.position}</span>
                    {m.personnelType && (
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                          PERSONNEL_TYPE_CONFIG[m.personnelType]?.badgeColor ||
                          "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {PERSONNEL_TYPE_CONFIG[m.personnelType]?.icon} {m.personnelType}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-indigo-600 font-medium">{m.division}</div>
                </td>
                <td className="py-3.5 px-4 text-xs">
                  <div className="text-slate-700 flex items-center gap-1">
                    <span>📞</span>
                    <span>{m.phone || "-"}</span>
                  </div>
                  <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                    <span className="text-emerald-600 font-bold">Line:</span>
                    <span className="font-mono text-[11px]">{m.lineId || "-"}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  <select
                    value={m.role}
                    onChange={(e) => handleChangeMemberRole(m.id, e.target.value as Role)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${ROLE_CONFIG[m.role].badgeColor}`}
                  >
                    <option value="admin">👑 Admin</option>
                    <option value="manager">👔 Manager</option>
                    <option value="member">👤 Member</option>
                    <option value="guest">🎟️ Guest</option>
                  </select>
                </td>
                <td className="py-3.5 px-4">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      m.status === "active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        m.status === "active" ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                    />
                    {m.status === "active" ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setViewingMember(m)}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="ดูรายละเอียดบุคลากรและสิทธิ์การเข้าถึง"
                    >
                      <span>👁️</span>
                      <span className="hidden sm:inline">ดู</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAdminEdit(m)}
                      className="px-2.5 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 hover:bg-teal-100 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                      title="แก้ไขข้อมูลส่วนบุคคลและสิทธิ์"
                    >
                      <span>✏️</span>
                      <span className="hidden sm:inline">แก้ไข</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMemberToDelete(m)}
                      disabled={m.id === "usr_1" || (currentUser ? m.id === currentUser.id : false)}
                      className="px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs"
                      title={
                        m.id === "usr_1"
                          ? "บัญชีผู้บริหารหลักไม่สามารถลบได้"
                          : currentUser && m.id === currentUser.id
                          ? "ไม่สามารถลบบัญชีที่กำลังล็อกอินอยู่ได้"
                          : "ลบบุคลากรออกจากระบบ"
                      }
                    >
                      <span>🗑️</span>
                      <span className="hidden sm:inline">ลบ</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
