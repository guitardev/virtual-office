"use client";

import React, { useState, useMemo } from "react";
import { Member, Role } from "@/lib/types";
import { GOVERNMENT_DIVISIONS, ROLE_CONFIG } from "@/lib/rbac";
import { recordAuditLog, saveMember } from "@/lib/supabase";

interface DivisionsTabProps {
  currentUser: Member | null;
  members: Member[];
  setMembers?: (members: Member[]) => void;
  showToast: (msg: string) => void;
  onNavigatePage?: (page: string) => void;
}

export interface DivisionInfo {
  name: string;
  shortName: string;
  icon: string;
  description: string;
  defaultChannelId: string;
}

const DIVISION_METADATA: Record<string, { icon: string; shortName: string; description: string }> = {
  "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร (ผู้บริหาร)": {
    icon: "🏛️",
    shortName: "ผู้บริหาร",
    description: "กำกับทิศทางนโยบาย ยุทธศาสตร์จังหวัด และการบริหารราชการแผ่นดิน พมจ.",
  },
  "ฝ่ายบริหารทั่วไป": {
    icon: "💼",
    shortName: "บริหารทั่วไป",
    description: "งานสารบรรณ การเงินและบัญชี พัสดุยานพาหนะ และงานอำนวยการกลาง",
  },
  "กลุ่มนโยบายและวิชาการ": {
    icon: "📊",
    shortName: "นโยบายและวิชาการ",
    description: "จัดทำแผนปฏิบัติราชการ แผนยุทธศาสตร์ เทคโนโลยีดิจิทัล และงานวิชาการ",
  },
  "กลุ่มการพัฒนาสังคมและสวัสดิการ": {
    icon: "🤝",
    shortName: "พัฒนาสังคมฯ",
    description: "การคุ้มครองสวัสดิภาพสังคม ช่วยเหลือผู้ประสบปัญหา สตรี เด็ก และคนไร้ที่พึ่ง",
  },
  "ศูนย์บริการคนพิการจังหวัดกำแพงเพชร": {
    icon: "♿",
    shortName: "ศูนย์คนพิการ",
    description: "ออกบัตรคนพิการ กองทุนส่งเสริมคุณภาพชีวิตคนพิการ และกายอุปกรณ์",
  },
  "คณะทำงานที่ปรึกษาและภาคีเครือข่ายภายนอก": {
    icon: "🌐",
    shortName: "ภาคีเครือข่าย",
    description: "คณะอนุกรรมการ ผู้ทรงคุณวุฒิ และองค์กรสาธารณประโยชน์ภาคประชาสังคม",
  },
};

export function DivisionsTab({ currentUser, members, setMembers, showToast }: DivisionsTabProps) {
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [targetDivision, setTargetDivision] = useState("");
  const [newManagerId, setNewManagerId] = useState("");

  const divisionStats = useMemo(() => {
    return GOVERNMENT_DIVISIONS.map((divName) => {
      const divMembers = members.filter(
        (m) => m.division === divName || (m.department && m.department === divName)
      );
      const manager = divMembers.find((m) => m.role === "manager") || divMembers.find((m) => m.role === "admin");
      const activeCount = divMembers.filter((m) => m.status === "active").length;
      const meta = DIVISION_METADATA[divName] || {
        icon: "🏢",
        shortName: divName,
        description: "กลุ่มงานในสังกัด พมจ.กำแพงเพชร",
      };

      return {
        name: divName,
        ...meta,
        members: divMembers,
        manager,
        activeCount,
        totalCount: divMembers.length,
      };
    });
  }, [members]);

  const handleOpenAssignManager = (divName: string, currentManagerId?: string) => {
    setTargetDivision(divName);
    setNewManagerId(currentManagerId || "");
    setShowAssignModal(true);
  };

  const handleSaveManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDivision || !newManagerId) return;

    const targetUser = members.find((m) => m.id === newManagerId);
    if (!targetUser) return;

    // Promote targetUser to manager, and if there was an existing manager in that division (other than admin), revert to member
    const updatedMembers = members.map((m) => {
      if (m.id === targetUser.id) {
        return { ...m, role: "manager" as Role, division: targetDivision };
      }
      if (m.division === targetDivision && m.role === "manager" && m.id !== targetUser.id) {
        return { ...m, role: "member" as Role };
      }
      return m;
    });

    if (setMembers) {
      setMembers(updatedMembers);
    }

    const updatedUser = { ...targetUser, role: "manager" as Role, division: targetDivision };
    await saveMember(updatedUser);

    await recordAuditLog(
      currentUser?.name || "Admin",
      `แต่งตั้ง ${targetUser.name} เป็นหัวหน้ากลุ่มงาน (Manager): ${targetDivision}`,
      "Division Management",
      "success"
    );

    showToast(`👔 แต่งตั้ง ${targetUser.name} เป็นหัวหน้าฝ่ายเรียบร้อยแล้ว`);
    setShowAssignModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">🏢</span>
          <div className="text-xs leading-relaxed text-indigo-900">
            <span className="font-bold block text-sm mb-0.5">
              โครงสร้างกลุ่มงาน &amp; ช่องทางสื่อสารราชการ (Divisions &amp; Channels Management)
            </span>
            ภาพรวม 6 กลุ่มงาน พมจ. กำแพงเพชร การแต่งตั้งหัวหน้าฝ่าย (Manager) อัตรากำลังพล และห้องสื่อสารประจำฝ่าย
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] text-slate-500 font-medium uppercase">กลุ่มงาน / ฝ่าย</div>
          <div className="text-2xl font-bold font-heading text-slate-900 mt-0.5">{GOVERNMENT_DIVISIONS.length}</div>
          <div className="text-[10px] text-slate-400">หน่วยงานตามโครงสร้าง</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] text-slate-500 font-medium uppercase">หัวหน้าฝ่าย (Managers)</div>
          <div className="text-2xl font-bold font-heading text-teal-600 mt-0.5">
            {divisionStats.filter((d) => d.manager).length} / {GOVERNMENT_DIVISIONS.length}
          </div>
          <div className="text-[10px] text-teal-500">👔 มีหัวหน้ากำกับดูแล</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] text-slate-500 font-medium uppercase">บุคลากรรวม</div>
          <div className="text-2xl font-bold font-heading text-indigo-600 mt-0.5">{members.length}</div>
          <div className="text-[10px] text-indigo-500">👥 เจ้าหน้าที่และข้าราชการ</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] text-slate-500 font-medium uppercase">ช่องทางแชทกลุ่มงาน</div>
          <div className="text-2xl font-bold font-heading text-purple-600 mt-0.5">{GOVERNMENT_DIVISIONS.length}</div>
          <div className="text-[10px] text-purple-500">💬 Realtime Synchronized</div>
        </div>
      </div>

      {/* Divisions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {divisionStats.map((div) => (
          <div
            key={div.name}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start gap-3">
                <span className="text-3xl p-2.5 rounded-2xl bg-slate-50 border border-slate-100 shrink-0">
                  {div.icon}
                </span>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                    {div.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {div.description}
                  </p>
                </div>
              </div>

              {/* Manager Section */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                  หัวหน้ากลุ่มงาน (Manager):
                </span>
                {div.manager ? (
                  <div className="flex items-center justify-between mt-1.5 bg-teal-50/60 border border-teal-100 p-2.5 rounded-xl">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {div.manager.avatarText || div.manager.name.slice(0, 2)}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-teal-950 truncate">
                          {div.manager.name}
                        </div>
                        <div className="text-[10px] text-teal-700 truncate">
                          {div.manager.position}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenAssignManager(div.name, div.manager?.id)}
                      className="text-[11px] text-teal-700 hover:text-teal-900 font-semibold underline shrink-0 cursor-pointer ml-2"
                    >
                      เปลี่ยน
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mt-1.5 bg-amber-50/60 border border-amber-200 p-2.5 rounded-xl text-xs">
                    <span className="text-amber-800 font-medium">ยังไม่ได้กำหนดหัวหน้าฝ่าย</span>
                    <button
                      type="button"
                      onClick={() => handleOpenAssignManager(div.name)}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                    >
                      + แต่งตั้ง
                    </button>
                  </div>
                )}
              </div>

              {/* Members Stats */}
              <div className="mt-3 flex items-center justify-between text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-xl">
                <span>บุคลากรในสังกัด:</span>
                <span className="font-bold text-slate-900">
                  {div.activeCount} คน <span className="font-normal text-slate-400">({div.totalCount} รวมทั้งหมด)</span>
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                💬 แชท: #{div.shortName}
              </span>
              <button
                type="button"
                onClick={() => setSelectedDivision(selectedDivision === div.name ? null : div.name)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
              >
                {selectedDivision === div.name ? "ปิดรายชื่อ" : "ดูบุคลากรในฝ่าย (▼)"}
              </button>
            </div>

            {/* Member Accordion List */}
            {selectedDivision === div.name && (
              <div className="pt-2 border-t border-slate-100 space-y-1.5 max-h-48 overflow-y-auto">
                {div.members.length === 0 ? (
                  <div className="text-[11px] text-slate-400 py-2 text-center">ไม่มีบุคลากรในสังกัดนี้</div>
                ) : (
                  div.members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-800 block truncate">{m.name}</span>
                        <span className="text-[10px] text-slate-400 block truncate">{m.position}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600 shrink-0">
                        {ROLE_CONFIG[m.role]?.label || m.role}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal แต่งตั้งหัวหน้าฝ่าย */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                👔 แต่งตั้งหัวหน้ากลุ่มงาน (Manager)
              </h3>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveManager} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-500 font-medium mb-1">กลุ่มงาน / ฝ่ายเป้าหมาย</label>
                <div className="font-bold text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {targetDivision}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">เลือกบุคลากรเพื่อแต่งตั้งเป็นหัวหน้าฝ่าย *</label>
                <select
                  required
                  value={newManagerId}
                  onChange={(e) => setNewManagerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                >
                  <option value="">-- เลือกบุคลากร --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} — {m.position} ({m.division})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  เมื่อแต่งตั้ง บุคลากรท่านนี้จะได้รับสิทธิ์ Manager ในการอนุมัติคำขอจองรถ ดูแลงานในกลุ่มงาน และกำกับดูแลห้องแชท
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-md shadow-indigo-600/25"
                >
                  ยืนยันการแต่งตั้ง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
