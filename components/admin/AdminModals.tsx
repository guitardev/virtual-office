"use client";

import React from "react";
import {
  Member,
  Role,
  ModuleId,
  SystemModule,
  AccessRequest,
  PersonnelType,
} from "@/lib/types";
import {
  ROLE_CONFIG,
  GOVERNMENT_DIVISIONS,
  GOVERNMENT_PERSONNEL_TYPES,
  PERSONNEL_TYPE_CONFIG,
} from "@/lib/rbac";

export interface AdminEditFormState {
  prefix: string;
  firstName: string;
  lastName: string;
  nickname: string;
  personnelType: PersonnelType;
  position: string;
  division: string;
  email: string;
  phone: string;
  lineId: string;
  role: Role;
  status: "active" | "inactive";
}

export interface NewMemberFormState {
  prefix: string;
  firstName: string;
  lastName: string;
  nickname: string;
  personnelType: PersonnelType;
  position: string;
  division: string;
  email: string;
  phone: string;
  lineId: string;
  role: Role;
}

export interface EditModuleFormState {
  name: string;
  icon: string;
  desc: string;
  enabled: boolean;
  maintenanceNotice: string;
}

export interface EditRequestFormState {
  prefix: string;
  firstName: string;
  lastName: string;
  nickname: string;
  personnelType: PersonnelType;
  position: string;
  division: string;
  email: string;
  phone: string;
  lineId: string;
  requestedRole: Role;
  reason: string;
  reviewNotes: string;
}

interface AdminModalsProps {
  // View Member Modal
  viewingMember: Member | null;
  setViewingMember: (m: Member | null) => void;
  currentUser: Member | null;
  systemModules: Record<ModuleId, SystemModule>;
  rolePermissions: Record<Role, Record<ModuleId, boolean>>;

  // Admin Edit Member Modal
  adminEditingMember: Member | null;
  setAdminEditingMember: (m: Member | null) => void;
  adminEditForm: AdminEditFormState;
  setAdminEditForm: React.Dispatch<React.SetStateAction<AdminEditFormState>>;
  handleAdminSaveMember: (e: React.FormEvent) => void;
  handleOpenAdminEdit: (m: Member) => void;

  // Delete Member Modal
  memberToDelete: Member | null;
  setMemberToDelete: (m: Member | null) => void;
  handleConfirmDeleteMember: () => void;

  // Add Member Modal
  showAddMemberModal: boolean;
  setShowAddMemberModal: (show: boolean) => void;
  newMemberForm: NewMemberFormState;
  setNewMemberForm: React.Dispatch<React.SetStateAction<NewMemberFormState>>;
  handleAddMember: (e: React.FormEvent) => void;

  // Edit Module Modal
  editingModuleId: ModuleId | null;
  setEditingModuleId: (id: ModuleId | null) => void;
  editModuleForm: EditModuleFormState;
  setEditModuleForm: React.Dispatch<React.SetStateAction<EditModuleFormState>>;
  handleSaveModuleInfo: (e: React.FormEvent) => void;

  // Request Details Modal
  showRequestDetailModal: boolean;
  setShowRequestDetailModal: (show: boolean) => void;
  selectedRequest: AccessRequest | null;
  setSelectedRequest: (req: AccessRequest | null) => void;
  handleOpenEditRequest: (req: AccessRequest) => void;
  handleApproveRequest: (req: AccessRequest) => void;

  // Edit Request Modal
  showEditRequestModal: boolean;
  setShowEditRequestModal: (show: boolean) => void;
  editRequestForm: EditRequestFormState;
  setEditRequestForm: React.Dispatch<React.SetStateAction<EditRequestFormState>>;
  handleSaveEditRequest: (e: React.FormEvent) => void;

  // Reject Request Modal
  showRejectModal: boolean;
  setShowRejectModal: (show: boolean) => void;
  rejectReason: string;
  setRejectReason: (reason: string) => void;
  handleRejectRequest: (req: AccessRequest, reason: string) => void;
}

export function AdminModals({
  viewingMember,
  setViewingMember,
  currentUser,
  systemModules,
  rolePermissions,
  adminEditingMember,
  setAdminEditingMember,
  adminEditForm,
  setAdminEditForm,
  handleAdminSaveMember,
  handleOpenAdminEdit,
  memberToDelete,
  setMemberToDelete,
  handleConfirmDeleteMember,
  showAddMemberModal,
  setShowAddMemberModal,
  newMemberForm,
  setNewMemberForm,
  handleAddMember,
  editingModuleId,
  setEditingModuleId,
  editModuleForm,
  setEditModuleForm,
  handleSaveModuleInfo,
  showRequestDetailModal,
  setShowRequestDetailModal,
  selectedRequest,
  setSelectedRequest,
  handleOpenEditRequest,
  handleApproveRequest,
  showEditRequestModal,
  setShowEditRequestModal,
  editRequestForm,
  setEditRequestForm,
  handleSaveEditRequest,
  showRejectModal,
  setShowRejectModal,
  rejectReason,
  setRejectReason,
  handleRejectRequest,
}: AdminModalsProps) {
  return (
    <>
      {/* ─── MODAL 1: VIEW MEMBER DOSSIER ─── */}
      {viewingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">📋</span>
                <div>
                  <h3 className="text-lg font-bold font-heading text-slate-900">แฟ้มข้อมูลบุคลากรภาครัฐ</h3>
                  <p className="text-xs text-slate-500">ข้อมูลส่วนบุคคลและสิทธิ์การเข้าใช้งานระบบ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingMember(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row items-center gap-4 py-5 border-b border-slate-100 text-center sm:text-left">
              {viewingMember.avatarUrl ? (
                <img
                  src={viewingMember.avatarUrl}
                  alt={viewingMember.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-indigo-200 shadow-sm shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-indigo-100 text-[#4F46E5] font-bold text-2xl flex items-center justify-center border-2 border-indigo-200 shrink-0">
                  {viewingMember.avatarText}
                </div>
              )}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h4 className="text-lg font-bold font-heading text-slate-900">{viewingMember.name}</h4>
                  {viewingMember.nickname && (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold">
                      ({viewingMember.nickname})
                    </span>
                  )}
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      (viewingMember.personnelType &&
                        PERSONNEL_TYPE_CONFIG[viewingMember.personnelType]?.badgeColor) ||
                      "bg-indigo-50 text-indigo-700 border-indigo-200"
                    }`}
                  >
                    {(viewingMember.personnelType &&
                      PERSONNEL_TYPE_CONFIG[viewingMember.personnelType]?.icon) ||
                      "🏛️"}{" "}
                    {viewingMember.personnelType || "ข้าราชการ"}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${ROLE_CONFIG[viewingMember.role].badgeColor}`}
                  >
                    {ROLE_CONFIG[viewingMember.role].label}
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-700">{viewingMember.position}</div>
                <div className="text-xs text-indigo-600 font-medium">{viewingMember.division}</div>
              </div>
            </div>

            {/* Personnel Dossier Grid */}
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">คำนำหน้า</span>
                  <span className="font-bold text-slate-800">{viewingMember.prefix || "-"}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">ชื่อ - นามสกุล</span>
                  <span className="font-bold text-slate-800">
                    {viewingMember.firstName} {viewingMember.lastName}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">ชื่อเล่น (Nickname)</span>
                  <span className="font-bold text-indigo-700">{viewingMember.nickname || "-"}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">ประเภทบุคลากร</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                    <span>
                      {(viewingMember.personnelType &&
                        PERSONNEL_TYPE_CONFIG[viewingMember.personnelType]?.icon) ||
                        "🏛️"}
                    </span>
                    <span className="truncate">{viewingMember.personnelType || "ข้าราชการ"}</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">อีเมลทางการ</span>
                  <span className="font-mono text-slate-800 font-bold truncate block">
                    {viewingMember.email}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">เบอร์โทรศัพท์</span>
                  <span className="font-bold text-slate-800">{viewingMember.phone || "-"}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">Line ID</span>
                  <span className="font-mono text-emerald-700 font-bold">{viewingMember.lineId || "-"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">สถานะการทำงาน</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {viewingMember.status === "active" ? "ปฏิบัติงานปกติ (Active)" : "พักการใช้งาน (Inactive)"}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[11px]">วันที่เริ่มงาน / บรรจุ</span>
                  <span className="font-bold text-slate-800">{viewingMember.joinedDate || "1 ม.ค. 2024"}</span>
                </div>
              </div>

              {/* Accessible Modules by Role */}
              <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs">
                <span className="text-slate-600 font-bold block mb-2">
                  โมดูลที่เข้าถึงได้ตามสิทธิ์ ({ROLE_CONFIG[viewingMember.role].label}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(systemModules) as ModuleId[]).map((modId) => {
                    const hasAccess = rolePermissions[viewingMember.role]?.[modId];
                    const mod = systemModules[modId];
                    return (
                      <span
                        key={modId}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 ${
                          hasAccess
                            ? "bg-white text-indigo-900 border border-indigo-200 shadow-2xs"
                            : "bg-slate-100 text-slate-400 line-through opacity-60"
                        }`}
                      >
                        <span>{mod.icon}</span>
                        <span>{mod.name.split(" (")[0]}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const m = viewingMember;
                    setViewingMember(null);
                    handleOpenAdminEdit(m);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[#4F46E5] text-white text-xs font-bold hover:bg-[#4338CA] transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <span>✏️</span>
                  <span>แก้ไขข้อมูล</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const m = viewingMember;
                    setViewingMember(null);
                    setMemberToDelete(m);
                  }}
                  disabled={viewingMember.id === "usr_1" || (currentUser ? viewingMember.id === currentUser.id : false)}
                  className="px-3.5 py-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <span>🗑️</span>
                  <span>ลบ</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setViewingMember(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: ADMIN EDIT MEMBER ─── */}
      {adminEditingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold font-heading text-slate-900">
                  ✏️ แก้ไขข้อมูลบุคลากร & กำหนดสิทธิ์
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ปรับปรุงข้อมูลส่วนบุคคล ตำแหน่ง กลุ่ม/ฝ่าย และบทบาทในระบบ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdminEditingMember(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdminSaveMember} className="space-y-3.5 mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">คำนำหน้า</label>
                  <select
                    value={adminEditForm.prefix}
                    onChange={(e) => setAdminEditForm({ ...adminEditForm, prefix: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  >
                    <option value="นาย">นาย</option>
                    <option value="นาง">นาง</option>
                    <option value="นางสาว">นางสาว</option>
                    <option value="ดร.">ดร.</option>
                    <option value="ว่าที่ ร.ต.">ว่าที่ ร.ต.</option>
                    <option value="อาจารย์">อาจารย์</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อ</label>
                  <input
                    type="text"
                    required
                    value={adminEditForm.firstName}
                    onChange={(e) => setAdminEditForm({ ...adminEditForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">นามสกุล</label>
                  <input
                    type="text"
                    required
                    value={adminEditForm.lastName}
                    onChange={(e) => setAdminEditForm({ ...adminEditForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อเล่น (Nickname)</label>
                  <input
                    type="text"
                    placeholder="เช่น เสก, บอย"
                    value={adminEditForm.nickname}
                    onChange={(e) => setAdminEditForm({ ...adminEditForm, nickname: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ประเภทบุคลากร</label>
                  <select
                    value={adminEditForm.personnelType}
                    onChange={(e) =>
                      setAdminEditForm({ ...adminEditForm, personnelType: e.target.value as PersonnelType })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold"
                  >
                    {GOVERNMENT_PERSONNEL_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {PERSONNEL_TYPE_CONFIG[type].icon} {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ตำแหน่ง (Position)</label>
                  <input
                    type="text"
                    required
                    value={adminEditForm.position}
                    onChange={(e) => setAdminEditForm({ ...adminEditForm, position: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">กลุ่ม/ฝ่าย (Division / Section)</label>
                  <select
                    value={adminEditForm.division}
                    onChange={(e) => setAdminEditForm({ ...adminEditForm, division: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  >
                    {GOVERNMENT_DIVISIONS.map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">อีเมลราชการ</label>
                  <input
                    type="email"
                    required
                    value={adminEditForm.email}
                    onChange={(e) => setAdminEditForm({ ...adminEditForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="tel"
                    value={adminEditForm.phone}
                    onChange={(e) => setAdminEditForm({ ...adminEditForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Line ID</label>
                  <input
                    type="text"
                    value={adminEditForm.lineId}
                    onChange={(e) => setAdminEditForm({ ...adminEditForm, lineId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">บทบาทสิทธิ์ (Role)</label>
                  <select
                    value={adminEditForm.role}
                    onChange={(e) => setAdminEditForm({ ...adminEditForm, role: e.target.value as Role })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold"
                  >
                    <option value="admin">👑 ผู้ดูแลระบบ (Admin)</option>
                    <option value="manager">👔 ผู้จัดการ / ผอ.กลุ่ม (Manager)</option>
                    <option value="member">👤 พนักงาน / เจ้าหน้าที่ (Member)</option>
                    <option value="guest">🎟️ ผู้เยี่ยมชม / ภาคีภายนอก (Guest)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">สถานะผู้ใช้งาน (Status)</label>
                  <select
                    value={adminEditForm.status}
                    onChange={(e) =>
                      setAdminEditForm({ ...adminEditForm, status: e.target.value as "active" | "inactive" })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold"
                  >
                    <option value="active">🟢 กำลังปฏิบัติงาน (Active)</option>
                    <option value="inactive">⚪ พักการใช้งานชั่วคราว (Inactive)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setAdminEditingMember(null)}
                  className="flex-1 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#4F46E5] text-white rounded-xl text-xs font-bold hover:bg-[#4338CA] shadow-md shadow-indigo-600/25 cursor-pointer"
                >
                  ✓ บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 3: DELETE MEMBER CONFIRMATION ─── */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-red-100">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-2xl mb-4">
              🗑️
            </div>
            <h3 className="text-lg font-bold font-heading text-slate-900 text-center">
              ยืนยันการลบบุคลากรออกจากระบบ
            </h3>
            <p className="text-xs text-slate-500 text-center mt-1">
              การดำเนินการนี้จะเพิกถอนสิทธิ์การเข้าถึงทั้งหมดและลบข้อมูลบุคลากร
            </p>

            <div className="my-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">บุคลากร:</span>
                <span className="font-bold text-slate-900">{memberToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ตำแหน่ง:</span>
                <span className="text-slate-700">{memberToDelete.position}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">กลุ่ม/ฝ่าย:</span>
                <span className="text-slate-700">{memberToDelete.division}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">บทบาทสิทธิ์:</span>
                <span className="font-bold text-indigo-700">{ROLE_CONFIG[memberToDelete.role].label}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="flex-1 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteMember}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 shadow-md shadow-red-600/25 cursor-pointer"
              >
                ลบบุคลากร
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 4: ADD MEMBER (GOVERNMENT PERSONNEL) ─── */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-200 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold font-heading text-slate-900">+ เพิ่มบุคลากร/เจ้าหน้าที่ใหม่</h3>
                <p className="text-xs text-slate-500 mt-0.5">ระบุข้อมูลส่วนตัวบุคลากรภาครัฐและกำหนดสิทธิ์ RBAC</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMemberModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3.5 mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">คำนำหน้า</label>
                  <select
                    value={newMemberForm.prefix}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, prefix: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  >
                    <option value="นาย">นาย</option>
                    <option value="นาง">นาง</option>
                    <option value="นางสาว">นางสาว</option>
                    <option value="ดร.">ดร.</option>
                    <option value="ว่าที่ ร.ต.">ว่าที่ ร.ต.</option>
                    <option value="อาจารย์">อาจารย์</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อ</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น เสกพล"
                    value={newMemberForm.firstName}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">นามสกุล</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ดิษฐโชติ"
                    value={newMemberForm.lastName}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อเล่น (Nickname)</label>
                  <input
                    type="text"
                    placeholder="เช่น เสก"
                    value={newMemberForm.nickname}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, nickname: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ประเภทบุคลากร</label>
                  <select
                    value={newMemberForm.personnelType}
                    onChange={(e) =>
                      setNewMemberForm({ ...newMemberForm, personnelType: e.target.value as PersonnelType })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold"
                  >
                    {GOVERNMENT_PERSONNEL_TYPES.map((pt) => (
                      <option key={pt} value={pt}>
                        {PERSONNEL_TYPE_CONFIG[pt]?.icon} {pt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ตำแหน่ง (Position)</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น นักวิชาการคอมพิวเตอร์ปฏิบัติการ"
                    value={newMemberForm.position}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, position: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">กลุ่ม/ฝ่าย (Division / Section)</label>
                  <select
                    value={newMemberForm.division}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, division: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  >
                    {GOVERNMENT_DIVISIONS.map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">อีเมลราชการ</label>
                  <input
                    type="email"
                    required
                    placeholder="user@agency.go.th"
                    value={newMemberForm.email}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">หมายเลขโทรศัพท์</label>
                  <input
                    type="tel"
                    placeholder="02-612-6000 ต่อ 1234"
                    value={newMemberForm.phone}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Line ID</label>
                  <input
                    type="text"
                    placeholder="line_id"
                    value={newMemberForm.lineId}
                    onChange={(e) => setNewMemberForm({ ...newMemberForm, lineId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">บทบาทสิทธิ์ในระบบ (Role)</label>
                <select
                  value={newMemberForm.role}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, role: e.target.value as Role })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold"
                >
                  <option value="member">👤 พนักงาน/เจ้าหน้าที่ (Member) - เข้าถึงงาน แชท ประชุม จองรถ</option>
                  <option value="manager">👔 ผู้อำนวยการกลุ่ม/ผู้จัดการ (Manager) - สิทธิ์พนักงาน + ดูรายงาน</option>
                  <option value="admin">👑 ผู้ดูแลระบบ (Admin) - สิทธิ์สูงสุด จัดการสมาชิกและกำหนดสิทธิ์</option>
                  <option value="guest">🎟️ ผู้เยี่ยมชม/ที่ปรึกษา (Guest) - เฉพาะแชทและประชุมที่เชิญ</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="flex-1 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#4F46E5] text-white rounded-xl text-xs font-bold hover:bg-[#4338CA] shadow-md shadow-indigo-600/25 cursor-pointer"
                >
                  บันทึกข้อมูลบุคลากร
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 5: EDIT MODULE SETTINGS ─── */}
      {editingModuleId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{editModuleForm.icon}</span>
                <div>
                  <h3 className="text-lg font-bold font-heading text-slate-900">
                    แก้ไขข้อมูล & การตั้งค่าโมดูล
                  </h3>
                  <p className="text-xs text-slate-500">
                    รหัสโมดูล: <code className="font-mono text-indigo-600">{editingModuleId}</code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingModuleId(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModuleInfo} className="space-y-4 mt-4">
              <div className="grid grid-cols-4 gap-2.5">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ไอคอน (Emoji)</label>
                  <input
                    type="text"
                    required
                    value={editModuleForm.icon}
                    onChange={(e) => setEditModuleForm({ ...editModuleForm, icon: e.target.value })}
                    className="w-full px-3 py-2 text-center text-lg bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อโมดูล (Module Name)</label>
                  <input
                    type="text"
                    required
                    value={editModuleForm.name}
                    onChange={(e) => setEditModuleForm({ ...editModuleForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">คำอธิบายโมดูล (Description)</label>
                <textarea
                  rows={2}
                  required
                  value={editModuleForm.desc}
                  onChange={(e) => setEditModuleForm({ ...editModuleForm, desc: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">สถานะระดับระบบ (System Status)</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditModuleForm({ ...editModuleForm, enabled: true })}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      editModuleForm.enabled
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <span>🟢</span>
                    <span>เปิดใช้งานระบบ (Active)</span>
                  </button>

                  <button
                    type="button"
                    disabled={editingModuleId === "admin"}
                    onClick={() => setEditModuleForm({ ...editModuleForm, enabled: false })}
                    className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      !editModuleForm.enabled
                        ? "bg-red-50 border-red-300 text-red-800 shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <span>⛔</span>
                    <span>ปิดปรับปรุงชั่วคราว</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  ข้อความประกาศปิดปรับปรุง (Maintenance Notice)
                </label>
                <textarea
                  rows={2}
                  value={editModuleForm.maintenanceNotice}
                  onChange={(e) => setEditModuleForm({ ...editModuleForm, maintenanceNotice: e.target.value })}
                  placeholder="ข้อความที่จะแสดงให้ผู้ใช้งานเห็นเมื่อโมดูลปิดปรับปรุง..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5] resize-none"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingModuleId(null)}
                  className="flex-1 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#4F46E5] text-white rounded-xl text-xs font-bold hover:bg-[#4338CA] shadow-md shadow-indigo-600/25 cursor-pointer"
                >
                  ✓ บันทึกข้อมูลโมดูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 6: ACCESS REQUEST DETAILS ─── */}
      {showRequestDetailModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-200 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-lg font-bold">
                  📬
                </div>
                <div>
                  <h3 className="text-lg font-bold font-heading text-slate-900">รายละเอียดคำขอสิทธิ์เข้าใช้งาน</h3>
                  <p className="text-xs text-slate-500">ยื่นคำขอเมื่อ {selectedRequest.createdAt}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestDetailModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#4F46E5] text-white font-bold text-base flex items-center justify-center shrink-0">
                  {selectedRequest.firstName.slice(0, 2)}
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <span>{selectedRequest.name}</span>
                    {selectedRequest.nickname && (
                      <span className="text-xs font-normal text-slate-500">({selectedRequest.nickname})</span>
                    )}
                  </div>
                  <div className="text-slate-600 mt-0.5">{selectedRequest.position}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-semibold text-[10px]">
                      {PERSONNEL_TYPE_CONFIG[selectedRequest.personnelType]?.icon || "🏛️"} {selectedRequest.personnelType}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500 text-[11px]">{selectedRequest.division}</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span>📱 ข้อมูลการติดต่อ</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px]">อีเมลราชการ:</span>
                    <span className="font-mono text-xs">{selectedRequest.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">หมายเลขโทรศัพท์:</span>
                    <span>{selectedRequest.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Line ID:</span>
                    <span>{selectedRequest.lineId || "-"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">สถานะคำขอ:</span>
                    <span className="font-bold text-amber-600 capitalize">{selectedRequest.status}</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-900">สิทธิ์ที่ยื่นขอ (Requested Role):</span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border ${ROLE_CONFIG[selectedRequest.requestedRole]?.badgeColor || "bg-white text-slate-700"}`}>
                    <span>{ROLE_CONFIG[selectedRequest.requestedRole]?.icon}</span>
                    <span>{ROLE_CONFIG[selectedRequest.requestedRole]?.label}</span>
                  </span>
                </div>
                {selectedRequest.approvedRole && selectedRequest.approvedRole !== selectedRequest.requestedRole && (
                  <div className="text-[11px] text-emerald-700 font-semibold">
                    ✓ อนุมัติจริงในระดับ: {ROLE_CONFIG[selectedRequest.approvedRole]?.label}
                  </div>
                )}
                <div>
                  <span className="text-slate-500 block text-[10px] mb-1">เหตุผลความจำเป็นในการขอสิทธิ์:</span>
                  <div className="p-2.5 rounded-lg bg-white border border-indigo-100 text-slate-700 italic">
                    "{selectedRequest.reason}"
                  </div>
                </div>
              </div>

              {selectedRequest.reviewedAt && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                  <div><strong>ตรวจสอบเมื่อ:</strong> {selectedRequest.reviewedAt} โดย {selectedRequest.reviewedBy || "Admin"}</div>
                  {selectedRequest.reviewNotes && (
                    <div className="mt-1"><strong>หมายเหตุ:</strong> {selectedRequest.reviewNotes}</div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-5 border-t border-slate-100 mt-5">
              <button
                type="button"
                onClick={() => setShowRequestDetailModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                ปิด
              </button>

              {selectedRequest.status === "pending" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRequestDetailModal(false);
                      setRejectReason("");
                      setShowRejectModal(true);
                    }}
                    className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-100 cursor-pointer"
                  >
                    ✕ ปฏิเสธคำขอ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRequestDetailModal(false);
                      handleOpenEditRequest(selectedRequest);
                    }}
                    className="px-4 py-2 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl text-xs font-bold hover:bg-teal-100 cursor-pointer"
                  >
                    ✏️ แก้ไขก่อนอนุมัติ
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApproveRequest(selectedRequest)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-md shadow-emerald-600/25 cursor-pointer"
                  >
                    ✓ อนุมัติสิทธิ์ทันที
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 7: EDIT ACCESS REQUEST ─── */}
      {showEditRequestModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-200 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold font-heading text-slate-900">✏️ แก้ไขข้อมูลคำขอสิทธิ์</h3>
                <p className="text-xs text-slate-500 mt-0.5">ปรับระดับสิทธิ์ หรือแก้ไขข้อมูลบุคลากรก่อนทำการอนุมัติ</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditRequestModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditRequest} className="space-y-3.5 mt-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">คำนำหน้า</label>
                  <select
                    value={editRequestForm.prefix}
                    onChange={(e) => setEditRequestForm({ ...editRequestForm, prefix: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  >
                    <option value="นาย">นาย</option>
                    <option value="นาง">นาง</option>
                    <option value="นางสาว">นางสาว</option>
                    <option value="ดร.">ดร.</option>
                    <option value="ว่าที่ ร.ต.">ว่าที่ ร.ต.</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อ</label>
                  <input
                    type="text"
                    required
                    value={editRequestForm.firstName}
                    onChange={(e) => setEditRequestForm({ ...editRequestForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">นามสกุล</label>
                  <input
                    type="text"
                    required
                    value={editRequestForm.lastName}
                    onChange={(e) => setEditRequestForm({ ...editRequestForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อเล่น</label>
                  <input
                    type="text"
                    value={editRequestForm.nickname}
                    onChange={(e) => setEditRequestForm({ ...editRequestForm, nickname: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ประเภทบุคลากร</label>
                  <select
                    value={editRequestForm.personnelType}
                    onChange={(e) => setEditRequestForm({ ...editRequestForm, personnelType: e.target.value as PersonnelType })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  >
                    {GOVERNMENT_PERSONNEL_TYPES.map((pt) => (
                      <option key={pt} value={pt}>
                        {PERSONNEL_TYPE_CONFIG[pt]?.icon} {pt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ตำแหน่ง (Position)</label>
                  <input
                    type="text"
                    required
                    value={editRequestForm.position}
                    onChange={(e) => setEditRequestForm({ ...editRequestForm, position: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">กลุ่ม/ฝ่าย</label>
                  <select
                    value={editRequestForm.division}
                    onChange={(e) => setEditRequestForm({ ...editRequestForm, division: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                  >
                    {GOVERNMENT_DIVISIONS.map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">อีเมลราชการ</label>
                  <input
                    type="email"
                    required
                    value={editRequestForm.email}
                    onChange={(e) => setEditRequestForm({ ...editRequestForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">หมายเลขโทรศัพท์</label>
                  <input
                    type="tel"
                    value={editRequestForm.phone}
                    onChange={(e) => setEditRequestForm({ ...editRequestForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Line ID</label>
                  <input
                    type="text"
                    value={editRequestForm.lineId}
                    onChange={(e) => setEditRequestForm({ ...editRequestForm, lineId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  กำหนดระดับสิทธิ์ที่จะอนุมัติ (Role Assignment)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(["member", "manager", "admin", "guest"] as Role[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setEditRequestForm({ ...editRequestForm, requestedRole: r })}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        editRequestForm.requestedRole === r
                          ? "border-[#4F46E5] bg-indigo-50/70 text-[#4F46E5] font-bold"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-base mb-0.5">{ROLE_CONFIG[r].icon}</div>
                      <div className="text-xs">{ROLE_CONFIG[r].label.split(" ")[0]}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">หมายเหตุการพิจารณา (Admin Review Notes)</label>
                <textarea
                  rows={2}
                  placeholder="ระบุข้อความบันทึกของแอดมิน..."
                  value={editRequestForm.reviewNotes}
                  onChange={(e) => setEditRequestForm({ ...editRequestForm, reviewNotes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditRequestModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 8: REJECT ACCESS REQUEST ─── */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-fade-in">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-lg font-bold">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-bold font-heading text-slate-900">ยืนยันปฏิเสธคำขอสิทธิ์</h3>
                <p className="text-xs text-slate-500">คำขอของ {selectedRequest.name}</p>
              </div>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-xs text-slate-600">
                กรุณาระบุเหตุผลในการปฏิเสธคำขอสิทธิ์เข้าใช้งาน เพื่อบันทึกใน Audit Log และระบบ:
              </p>
              <textarea
                rows={3}
                required
                placeholder="เช่น ข้อมูลตำแหน่งไม่ถูกต้อง, ไม่พบบุคลากรในสารบบ..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleRejectRequest(selectedRequest, rejectReason)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-600/25 cursor-pointer"
              >
                ยืนยันปฏิเสธคำขอ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
