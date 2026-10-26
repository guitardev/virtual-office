"use client";

import React, { useState, useMemo } from "react";
import { ChatGroup, Member, Role } from "@/lib/types";
import { ROLE_CONFIG, GOVERNMENT_DIVISIONS } from "@/lib/rbac";
import { saveChatGroup, deleteChatGroup, recordAuditLog } from "@/lib/supabase";

interface ChannelsTabProps {
  currentUser: Member | null;
  members: Member[];
  chatGroups: ChatGroup[];
  setChatGroups?: (groups: ChatGroup[]) => void;
  showToast: (msg: string) => void;
  onNavigatePage?: (page: string) => void;
  onSelectGroup?: (groupId: string) => void;
}

const CHANNEL_ICONS = ["🏢", "💬", "📁", "📊", "🤝", "♿", "👑", "🌟", "📢", "📌", "🎓", "💼"];

export function ChannelsTab({
  currentUser,
  members,
  chatGroups,
  setChatGroups,
  showToast,
  onNavigatePage,
  onSelectGroup,
}: ChannelsTabProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "official" | "custom" | "announcement">("all");

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ChatGroup | null>(null);
  const [managingMembersGroup, setManagingMembersGroup] = useState<ChatGroup | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formIcon, setFormIcon] = useState("💬");
  const [formDesc, setFormDesc] = useState("");
  const [formDivision, setFormDivision] = useState("");
  const [formType, setFormType] = useState<"custom" | "division" | "announcement">("custom");
  const [formMemberIds, setFormMemberIds] = useState<string[]>([]);

  // Member management state
  const [memberSearch, setMemberSearch] = useState("");

  // Filtered Groups
  const filteredGroups = useMemo(() => {
    return chatGroups.filter((g) => {
      const matchSearch =
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        (g.description && g.description.toLowerCase().includes(search.toLowerCase())) ||
        (g.division && g.division.toLowerCase().includes(search.toLowerCase()));

      let matchType = true;
      if (typeFilter === "official") matchType = Boolean(g.isOfficial && g.type !== "announcement");
      else if (typeFilter === "announcement") matchType = g.type === "announcement";
      else if (typeFilter === "custom") matchType = g.type === "custom";

      return matchSearch && matchType;
    });
  }, [chatGroups, search, typeFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = chatGroups.length;
    const official = chatGroups.filter((g) => g.isOfficial && g.type !== "announcement").length;
    const announcements = chatGroups.filter((g) => g.type === "announcement").length;
    const custom = chatGroups.filter((g) => g.type === "custom").length;
    return { total, official, announcements, custom };
  }, [chatGroups]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setFormName("");
    setFormIcon("💬");
    setFormDesc("");
    setFormDivision("");
    setFormType("custom");
    setFormMemberIds(currentUser ? [currentUser.id] : []);
    setShowCreateModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (group: ChatGroup) => {
    setEditingGroup(group);
    setFormName(group.name);
    setFormIcon(group.icon || "💬");
    setFormDesc(group.description || "");
    setFormDivision(group.division || "");
    setFormType(group.type as any);
    setFormMemberIds(group.memberIds || []);
  };

  // Submit Create / Edit
  const handleSubmitGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast("⚠️ กรุณาระบุชื่อห้องสื่อสาร");
      return;
    }

    if (editingGroup) {
      // Edit existing
      const updated: ChatGroup = {
        ...editingGroup,
        name: formName.trim(),
        icon: formIcon,
        description: formDesc.trim(),
        division: formDivision || undefined,
        memberIds: formMemberIds,
      };

      const newGroups = chatGroups.map((g) => (g.id === updated.id ? updated : g));
      setChatGroups?.(newGroups);
      await saveChatGroup(updated);

      recordAuditLog(
        currentUser?.name || "Admin",
        `แก้ไขข้อมูลห้องสื่อสาร: ${updated.name}`,
        "Chat Channel Control",
        "success"
      ).catch(console.warn);

      showToast(`✅ บันทึกการแก้ไขห้อง "${updated.name}" เรียบร้อยแล้ว`);
      setEditingGroup(null);
    } else {
      // Create new
      const newGroup: ChatGroup = {
        id: `ch_${Date.now()}`,
        name: formName.trim(),
        icon: formIcon,
        description: formDesc.trim(),
        type: formType,
        division: formDivision || undefined,
        isOfficial: formType !== "custom",
        memberIds: formMemberIds.length > 0 ? formMemberIds : members.map((m) => m.id),
        createdAt: new Date().toLocaleDateString("th-TH", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        createdBy: currentUser?.id || "admin",
      };

      const newGroups = [...chatGroups, newGroup];
      setChatGroups?.(newGroups);
      await saveChatGroup(newGroup);

      recordAuditLog(
        currentUser?.name || "Admin",
        `สร้างห้องสื่อสารใหม่: ${newGroup.name} (${newGroup.type})`,
        "Chat Channel Control",
        "success"
      ).catch(console.warn);

      showToast(`🎉 สร้างห้องสื่อสารใหม่ "${newGroup.name}" สำเร็จและบันทึกลงฐานข้อมูลแล้ว`);
      setShowCreateModal(false);
    }
  };

  // Delete / Dissolve Custom Group
  const handleDeleteChannel = async (group: ChatGroup) => {
    if (group.isOfficial && group.type !== "custom") {
      showToast("⚠️ ไม่สามารถยุบห้องราชการหลักหรือห้องประกาศกลางของ สนง. ได้");
      return;
    }

    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการยุบห้องสื่อสาร "${group.name}"? ข้อความในห้องจะถูกลบออกจากระบบอย่างถาวร`)) {
      return;
    }

    const newGroups = chatGroups.filter((g) => g.id !== group.id);
    setChatGroups?.(newGroups);
    await deleteChatGroup(group.id);

    recordAuditLog(
      currentUser?.name || "Admin",
      `ยุบห้องสื่อสาร: ${group.name}`,
      "Chat Channel Control",
      "denied"
    ).catch(console.warn);

    showToast(`🗑️ ยุบห้อง "${group.name}" ออกจากระบบเรียบร้อยแล้ว`);
  };

  // Toggle member membership in a group
  const handleToggleMember = async (memberId: string) => {
    if (!managingMembersGroup) return;

    const currentIds = managingMembersGroup.memberIds || [];
    const isMember = currentIds.includes(memberId);
    const updatedIds = isMember
      ? currentIds.filter((id) => id !== memberId)
      : [...currentIds, memberId];

    const updatedGroup: ChatGroup = {
      ...managingMembersGroup,
      memberIds: updatedIds,
    };

    setManagingMembersGroup(updatedGroup);

    const newGroups = chatGroups.map((g) => (g.id === updatedGroup.id ? updatedGroup : g));
    setChatGroups?.(newGroups);
    await saveChatGroup(updatedGroup);

    const targetMember = members.find((m) => m.id === memberId);
    showToast(
      isMember
        ? `นำ ${targetMember?.name || memberId} ออกจากห้องแล้ว`
        : `เพิ่ม ${targetMember?.name || memberId} เข้าห้องเรียบร้อย`
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800">
              💬 ระบบบริหารจัดการห้องสื่อสารองค์กร (Chat Channels Master)
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
              {metrics.total} ห้อง
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            ควบคุมห้องแชททางการประจำกลุ่มงาน ห้องประกาศกลาง และห้องประสานงานเฉพาะกิจ กำหนดสมาชิก และกำกับดูแลการสื่อสารภาครัฐ
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
        >
          <span>+</span>
          <span>สร้างห้องสื่อสารใหม่</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
          <div className="text-[11px] font-medium text-slate-500">ห้องสื่อสารทั้งหมด</div>
          <div className="text-2xl font-bold font-heading text-slate-800 mt-0.5">{metrics.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">รวมทุกประเภทห้อง</div>
        </div>
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
          <div className="text-[11px] font-medium text-slate-500">ห้องทางการประจำฝ่าย</div>
          <div className="text-2xl font-bold font-heading text-teal-600 mt-0.5">{metrics.official}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">กลุ่มงานหลัก พมจ.</div>
        </div>
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
          <div className="text-[11px] font-medium text-slate-500">ห้องประกาศกลาง</div>
          <div className="text-2xl font-bold font-heading text-blue-600 mt-0.5">{metrics.announcements}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">แจ้งนโยบายและสารบรรณ</div>
        </div>
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
          <div className="text-[11px] font-medium text-slate-500">ห้องโครงการเฉพาะกิจ</div>
          <div className="text-2xl font-bold font-heading text-amber-600 mt-0.5">{metrics.custom}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">คณะทำงานและกิจกรรม</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: `ทั้งหมด (${metrics.total})` },
            { id: "official", label: `ห้องกลุ่มงาน (${metrics.official})` },
            { id: "announcement", label: `ห้องประกาศ (${metrics.announcements})` },
            { id: "custom", label: `ห้องโครงการ (${metrics.custom})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTypeFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                typeFilter === tab.id
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อห้อง, กลุ่มงาน, หรือคำอธิบาย..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Channel Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredGroups.map((group) => {
          const groupMemberCount = (group.memberIds || []).length;
          const isOfficial = group.isOfficial || group.type !== "custom";

          return (
            <div
              key={group.id}
              className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-indigo-300 transition-all flex flex-col justify-between gap-4 group"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                      {group.icon || "💬"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                          {group.name}
                        </h3>
                        {group.type === "announcement" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            📢 ประกาศกลาง
                          </span>
                        ) : group.isOfficial ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                            🏛️ ห้องทางการ
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            🌟 โครงการเฉพาะกิจ
                          </span>
                        )}
                      </div>
                      {group.division && (
                        <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                          สังกัด: {group.division}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 shrink-0">
                    👥 {groupMemberCount} คน
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                  {group.description || "ไม่มีคำอธิบายสำหรับห้องสื่อสารนี้"}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setManagingMembersGroup(group)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition-colors cursor-pointer flex items-center gap-1"
                    title="จัดการรายชื่อสมาชิกในห้องแชท"
                  >
                    <span>👥</span>
                    <span>สมาชิก ({groupMemberCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(group)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer flex items-center gap-1"
                    title="แก้ไขข้อมูลห้องสื่อสาร"
                  >
                    <span>✏️</span>
                    <span>แก้ไข</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectGroup?.(group.id);
                      onNavigatePage?.("chat");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold transition-colors cursor-pointer flex items-center gap-1"
                    title="เปิดหน้าแชทของห้องนี้"
                  >
                    <span>💬</span>
                    <span>เปิดแชท</span>
                  </button>

                  {!isOfficial && (
                    <button
                      type="button"
                      onClick={() => handleDeleteChannel(group)}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold transition-colors cursor-pointer"
                      title="ยุบห้องโครงการเฉพาะกิจนี้"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredGroups.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
          <div className="text-3xl mb-2">💬</div>
          <div className="font-bold text-slate-700 text-sm">ไม่พบห้องสื่อสารตามเงื่อนไข</div>
          <p className="text-slate-400 text-xs mt-1">ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่น</p>
        </div>
      )}

      {/* ─── MODAL: CREATE / EDIT CHANNEL ─── */}
      {(showCreateModal || editingGroup) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {editingGroup ? "✏️ แก้ไขข้อมูลห้องสื่อสาร" : "✨ สร้างห้องสื่อสารองค์กรใหม่"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingGroup(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitGroup} className="space-y-4 text-xs">
              {/* Icon selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">ไอคอนประจำห้อง:</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {CHANNEL_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setFormIcon(ic)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all cursor-pointer ${
                        formIcon === ic
                          ? "bg-indigo-600 text-white scale-110 shadow-xs"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ชื่อห้องสื่อสาร <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="เช่น คณะทำงานจัดงานวันคนพิการสากล ๒๕๖๙"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 text-slate-800 font-medium"
                />
              </div>

              {/* Type */}
              {!editingGroup && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ประเภทห้องสื่อสาร:</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 text-slate-800 font-medium"
                  >
                    <option value="custom">🌟 ห้องโครงการเฉพาะกิจ (Custom Committee)</option>
                    <option value="division">🏛️ ห้องประจำกลุ่มงาน (Division Channel)</option>
                    <option value="announcement">📢 ห้องประกาศกลาง (Announcement Channel)</option>
                  </select>
                </div>
              )}

              {/* Division */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">กลุ่มงานที่กำกับดูแล (ถ้ามี):</label>
                <select
                  value={formDivision}
                  onChange={(e) => setFormDivision(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 text-slate-800 font-medium"
                >
                  <option value="">-- ไม่ระบุ (ส่วนกลาง / ภารกิจข้ามฝ่าย) --</option>
                  {GOVERNMENT_DIVISIONS.map((div) => (
                    <option key={div} value={div}>
                      {div}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">วัตถุประสงค์และคำอธิบายห้อง:</label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="อธิบายภารกิจและวัตถุประสงค์ในการสื่อสารของกลุ่ม..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 text-slate-800 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingGroup(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/25 cursor-pointer"
                >
                  {editingGroup ? "บันทึกการแก้ไข" : "สร้างห้องทันที"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: MANAGE CHANNEL MEMBERS ─── */}
      {managingMembersGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <span>{managingMembersGroup.icon || "💬"}</span>
                  <span>จัดการสมาชิก: {managingMembersGroup.name}</span>
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  สมาชิกปัจจุบัน: {(managingMembersGroup.memberIds || []).length} คน จากทั้งหมด {members.length} คน
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManagingMembersGroup(null)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Filter Search */}
            <div className="shrink-0">
              <input
                type="text"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="ค้นหาชื่อ, ตำแหน่ง, หรือกลุ่มงาน..."
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Members Selection List */}
            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {members
                .filter((m) =>
                  m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
                  (m.position && m.position.toLowerCase().includes(memberSearch.toLowerCase())) ||
                  (m.division && m.division.toLowerCase().includes(memberSearch.toLowerCase()))
                )
                .map((member) => {
                  const isMember = (managingMembersGroup.memberIds || []).includes(member.id);

                  return (
                    <div
                      key={member.id}
                      onClick={() => handleToggleMember(member.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isMember
                          ? "bg-indigo-50/70 border-indigo-200 text-indigo-950"
                          : "bg-white border-slate-100 hover:border-slate-200 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isMember ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {member.avatarText || member.name.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-xs flex items-center gap-1.5">
                            <span>{member.name}</span>
                            <span className="text-[10px] text-slate-400">({ROLE_CONFIG[member.role]?.label || member.role})</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {member.position} · {member.division}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <span
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                            isMember
                              ? "bg-indigo-600 text-white shadow-2xs"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          {isMember ? "✓ เป็นสมาชิก" : "+ เพิ่มเข้าห้อง"}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs shrink-0">
              <span className="text-slate-400">คลิกที่รายชื่อเพื่อเพิ่มหรือนำออกจากห้อง</span>
              <button
                type="button"
                onClick={() => setManagingMembersGroup(null)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer shadow-md shadow-indigo-600/20"
              >
                เสร็จสิ้น
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
