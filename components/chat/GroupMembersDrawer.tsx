"use client";

import React, { useState } from "react";
import { Member, ChatGroup, Role } from "@/lib/types";
import { ROLE_CONFIG } from "@/lib/rbac";

interface GroupMembersDrawerProps {
  group: ChatGroup;
  allMembers: Member[];
  currentUser: Member | null;
  onClose: () => void;
  onUpdateGroupMembers: (groupId: string, newMemberIds: string[]) => void;
  onDeleteGroup?: (groupId: string) => void;
  showToast: (msg: string) => void;
  onlineUserIds?: string[];
}

export function GroupMembersDrawer({
  group,
  allMembers,
  currentUser,
  onClose,
  onUpdateGroupMembers,
  onDeleteGroup,
  showToast,
  onlineUserIds = [],
}: GroupMembersDrawerProps) {
  const [search, setSearch] = useState("");
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState<string>("");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const groupMembers = allMembers.filter((m) => {
    const isExplicit = Array.isArray(group.memberIds) && group.memberIds.includes(m.id);
    const isDivision = Boolean(
      group.isOfficial &&
      group.division &&
      m.division &&
      (m.division === group.division ||
        m.division.includes(group.division) ||
        group.division.includes(m.division))
    );
    const isAllStaff = group.id === "ch_all_staff";
    const isExecutive =
      group.id === "ch_executive" && (m.role === "admin" || m.role === "manager");
    return isExplicit || isDivision || isAllStaff || isExecutive;
  });
  const nonGroupMembers = allMembers.filter((m) => !groupMembers.some((gm) => gm.id === m.id));
  const onlineCount = groupMembers.filter((m) => onlineUserIds.includes(m.id)).length;

  const filteredMembers = groupMembers.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.position.toLowerCase().includes(q) ||
      m.division.toLowerCase().includes(q)
    );
  });

  const canManage =
    currentUser?.role === "admin" ||
    currentUser?.role === "manager" ||
    group.createdBy === currentUser?.id;

  const canDeleteGroup =
    group.type === "custom" &&
    (currentUser?.role === "admin" || group.createdBy === currentUser?.id);

  const handleRemoveMember = (memberId: string) => {
    if (group.isOfficial && group.type === "division") {
      showToast("⚠️ ไม่สามารถลบสมาชิกออกจากกลุ่มงานราชการหลักได้ เนื่องจากสังกัดฝ่ายนี้");
      return;
    }
    const updated = group.memberIds.filter((id) => id !== memberId);
    onUpdateGroupMembers(group.id, updated);
    showToast("✓ นำสมาชิกออกจากกลุ่มเรียบร้อย");
  };

  const handleAddMember = () => {
    if (!selectedToAdd) return;
    const updated = [...group.memberIds, selectedToAdd];
    onUpdateGroupMembers(group.id, updated);
    setSelectedToAdd("");
    setShowAddMember(false);
    showToast("✓ เพิ่มสมาชิกใหม่เข้าร่วมกลุ่มแชทเรียบร้อย");
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-fade-in">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">{group.icon}</span>
          <div>
            <h3 className="font-bold font-heading text-sm text-slate-900 truncate max-w-[200px]">
              {group.name}
            </h3>
            <span className="text-[11px] text-slate-500">
              สมาชิกทั้งหมด {groupMembers.length} คน •{" "}
              <span className="text-emerald-600 font-medium">ออนไลน์ {onlineCount} คน</span>
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-xs transition-colors cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Group Summary Card */}
      <div className="p-4 border-b border-slate-100 bg-indigo-50/30 text-xs space-y-1.5 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">ประเภทกลุ่ม:</span>
          <span className="font-semibold text-slate-800">
            {group.type === "division"
              ? "กลุ่มงานประจำสำนักงาน (ทางการ)"
              : group.type === "announcement"
              ? "ห้องประกาศส่วนกลาง"
              : "กลุ่มโครงการเฉพาะกิจ"}
          </span>
        </div>
        <div className="text-slate-600 leading-relaxed text-[11px]">
          {group.description}
        </div>
      </div>

      {/* Search and Action Bar */}
      <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="ค้นหาชื่อในกลุ่ม..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500"
          />
          <span className="absolute left-2.5 top-2 text-xs text-slate-400">🔍</span>
        </div>

        {canManage && !showAddMember && nonGroupMembers.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAddMember(true)}
            className="px-2.5 py-1.5 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
            title="เพิ่มสมาชิกเข้ากลุ่ม"
          >
            + เพิ่ม
          </button>
        )}
      </div>

      {/* Add Member inline form */}
      {showAddMember && (
        <div className="p-3 bg-indigo-50/60 border-b border-indigo-100 space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900">
              เลือกบุคลากรเพื่อดึงเข้ากลุ่ม
            </span>
            <button
              type="button"
              onClick={() => setShowAddMember(false)}
              className="text-[10px] text-slate-500 hover:text-slate-800"
            >
              ยกเลิก
            </button>
          </div>
          <select
            value={selectedToAdd}
            onChange={(e) => setSelectedToAdd(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white border border-indigo-200 rounded-xl text-xs text-slate-800"
          >
            <option value="">-- เลือกบุคลากร --</option>
            {nonGroupMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.position} - {m.division})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAddMember}
            disabled={!selectedToAdd}
            className="w-full py-1.5 bg-[#4F46E5] text-white rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
          >
            ยืนยันเพิ่มเข้ากลุ่ม
          </button>
        </div>
      )}

      {/* Member List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredMembers.map((member) => {
          const isManagerOrAdmin = member.role === "admin" || member.role === "manager";
          return (
            <div
              key={member.id}
              className="p-2.5 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-[#4F46E5] font-bold text-xs flex items-center justify-center border border-indigo-200">
                      {member.avatarText || "พม"}
                    </div>
                  )}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-white rounded-full transition-colors ${
                      onlineUserIds.includes(member.id) ? "bg-emerald-500 shadow-xs" : "bg-slate-300"
                    }`}
                    title={onlineUserIds.includes(member.id) ? "กำลังออนไลน์ในระบบ" : "ออฟไลน์"}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {member.name}
                    </span>
                    {onlineUserIds.includes(member.id) && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold shrink-0">
                        ออนไลน์
                      </span>
                    )}
                    {isManagerOrAdmin && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 font-bold shrink-0">
                        {ROLE_CONFIG[member.role].icon} {member.role === "admin" ? "พมจ." : "หัวหน้า"}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">
                    {member.position}
                  </div>
                  <div className="text-[9px] text-indigo-600 truncate">
                    {member.division}
                  </div>
                </div>
              </div>

              {canManage && group.type === "custom" && member.id !== currentUser?.id && (
                <button
                  type="button"
                  onClick={() => handleRemoveMember(member.id)}
                  className="p-1 text-slate-300 hover:text-rose-500 transition-colors cursor-pointer"
                  title="นำออกจากกลุ่มนี้"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Danger Zone: Delete / Dissolve Custom Group */}
      {canDeleteGroup && (
        <div className="p-3 border-t border-slate-200 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={() => setShowConfirmDelete(true)}
            className="w-full py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 text-xs font-bold border border-rose-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <span>🗑️</span>
            <span>ยุบกลุ่มโครงการนี้ (ลบกลุ่ม)</span>
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-up text-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-2xl mx-auto shadow-inner">
              ⚠️
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-bold font-heading text-slate-900 text-base">
                ยืนยันการยุบกลุ่มโครงการ?
              </h4>
              <p className="text-xs text-slate-700 font-semibold">
                "{group.name}"
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                การยุบกลุ่มจะลบห้องแชทและประวัติข้อความทั้งหมดอย่างถาวร สมาชิกทุกคนในกลุ่ม ({groupMembers.length} คน) จะไม่สามารถเข้าถึงห้องนี้ได้อีกต่อไป
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  if (onDeleteGroup) {
                    await onDeleteGroup(group.id);
                  }
                  setIsDeleting(false);
                  setShowConfirmDelete(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>กำลังยุบกลุ่ม...</span>
                  </>
                ) : (
                  <>
                    <span>🗑️</span>
                    <span>ยืนยันยุบกลุ่ม</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
