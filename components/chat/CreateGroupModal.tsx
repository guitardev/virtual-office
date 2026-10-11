"use client";

import React, { useState } from "react";
import { Member, ChatGroup } from "@/lib/types";

interface CreateGroupModalProps {
  currentUser: Member | null;
  availableMembers: Member[];
  onClose: () => void;
  onCreateGroup: (newGroup: ChatGroup) => void;
}

export function CreateGroupModal({
  currentUser,
  availableMembers,
  onClose,
  onCreateGroup,
}: CreateGroupModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🌟");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    currentUser ? [currentUser.id] : []
  );
  const [memberSearch, setMemberSearch] = useState("");

  const availableIcons = ["🌟", "📋", "📁", "🤝", "🚀", "💡", "🎯", "🛡️", "📢", "💬"];

  const filteredMembers = availableMembers.filter((m) => {
    if (!memberSearch.trim()) return true;
    const q = memberSearch.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.position.toLowerCase().includes(q) ||
      m.division.toLowerCase().includes(q)
    );
  });

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSelectAll = () => {
    setSelectedMemberIds(availableMembers.map((m) => m.id));
  };

  const handleClearAll = () => {
    setSelectedMemberIds(currentUser ? [currentUser.id] : []);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newGroup: ChatGroup = {
      id: `ch_custom_${Date.now()}`,
      name: name.trim(),
      description: description.trim() || "กลุ่มโครงการเฉพาะกิจเพื่อประสานงานราชการ",
      icon: icon || "🌟",
      type: "custom",
      isOfficial: false,
      memberIds: Array.from(new Set([...selectedMemberIds, currentUser?.id || ""])).filter(Boolean),
      createdAt: new Date().toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      createdBy: currentUser?.id || "usr_1",
    };

    onCreateGroup(newGroup);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[calc(100vh-2rem)] md:max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header - Fixed */}
        <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 via-teal-50 to-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl p-2 bg-white rounded-2xl shadow-xs border border-slate-100">
              💬
            </span>
            <div>
              <h3 className="font-bold font-heading text-lg text-slate-900">
                สร้างกลุ่มแชทโครงการใหม่
              </h3>
              <p className="text-xs text-slate-500">
                ตั้งกลุ่มสนทนาเฉพาะกิจและเลือกดึงบุคลากรจากกลุ่มงานต่างๆ เข้าร่วม
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold text-xs border border-slate-200 hover:border-rose-200 shadow-xs transition-all cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <span className="text-sm font-black">✕</span>
            <span>ปิดหน้าต่าง</span>
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="overflow-y-auto flex-1 p-6 space-y-4">
            {/* Icon and Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              ไอคอนและชื่อกลุ่มสนทนา <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="w-14 h-11 text-xl px-2 bg-slate-50 border border-slate-200 rounded-xl text-center cursor-pointer focus:bg-white focus:border-indigo-500"
                >
                  {availableIcons.map((ic) => (
                    <option key={ic} value={ic}>
                      {ic}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                required
                placeholder="เช่น คณะทำงานจัดงานวันคนพิการสากล 2569"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              คำอธิบายวัตถุประสงค์ของกลุ่ม
            </label>
            <textarea
              rows={2}
              placeholder="ระบุภารกิจหรือวัตถุประสงค์ในการสื่อสารของกลุ่มนี้..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          {/* Member Selection */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                เลือกสมาชิกเข้าร่วมกลุ่ม ({selectedMemberIds.length} คน)
              </label>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-indigo-600 hover:underline font-semibold"
                >
                  เลือกทั้งหมด
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-slate-500 hover:underline"
                >
                  ล้างการเลือก
                </button>
              </div>
            </div>

            {/* Member Search input */}
            <div className="relative">
              <input
                type="text"
                placeholder="ค้นหาชื่อ, ตำแหน่ง หรือกลุ่มงาน..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500"
              />
              <span className="absolute left-2.5 top-2 text-xs text-slate-400">🔍</span>
            </div>

            {/* Members Checkbox List */}
            <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100 p-1 bg-slate-50/50">
              {filteredMembers.map((member) => {
                const isSelected = selectedMemberIds.includes(member.id);
                return (
                  <div
                    key={member.id}
                    onClick={() => toggleMember(member.id)}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-indigo-50/80 border border-indigo-200"
                        : "hover:bg-slate-100/80"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                        {member.avatarText || "พม"}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate">
                          {member.name}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {member.position} · {member.division}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 text-indigo-600 rounded-md focus:ring-indigo-500 pointer-events-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </div>

          {/* Footer Actions - Fixed */}
          <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#4F46E5] hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>✓</span>
              <span>สร้างกลุ่มแชท</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
