"use client";

import React from "react";
import { PersonnelType } from "@/lib/types";
import { GOVERNMENT_DIVISIONS, GOVERNMENT_PERSONNEL_TYPES, PERSONNEL_TYPE_CONFIG } from "@/lib/rbac";

export interface EditProfileFormData {
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
}

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: EditProfileFormData;
  setForm: React.Dispatch<React.SetStateAction<EditProfileFormData>>;
  onSubmit: (e: React.FormEvent) => void;
}

export function EditProfileModal({
  isOpen,
  onClose,
  form,
  setForm,
  onSubmit,
}: EditProfileModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-200 animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold font-heading text-slate-900">✏️ แก้ไขข้อมูลส่วนบุคคล</h3>
            <p className="text-xs text-slate-500 mt-0.5">ปรับปรุงข้อมูลการติดต่อและข้อมูลหน่วยงานราชการ</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3.5 mt-4">
          {/* คำนำหน้า, ชื่อ, นามสกุล, ชื่อเล่น */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">คำนำหน้า</label>
              <select
                value={form.prefix}
                onChange={(e) => setForm({ ...form, prefix: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              >
                <option value="">(ไม่ระบุคำนำหน้า)</option>
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
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">นามสกุล</label>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อเล่น (Nickname)</label>
              <input
                type="text"
                placeholder="เช่น เสก, บอย"
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
              />
            </div>
          </div>

          {/* ประเภทบุคลากร, ตำแหน่ง & กลุ่ม/ฝ่าย */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">ประเภทบุคลากร</label>
              <select
                value={form.personnelType}
                onChange={(e) =>
                  setForm({ ...form, personnelType: e.target.value as PersonnelType })
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
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">กลุ่ม/ฝ่าย (Division / Section)</label>
              <select
                value={form.division}
                onChange={(e) => setForm({ ...form, division: e.target.value })}
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

          {/* อีเมลราชการ, หมายเลขโทรศัพท์, Line ID */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">อีเมลราชการ</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">หมายเลขโทรศัพท์</label>
              <input
                type="tel"
                placeholder="02-612-6000 ต่อ 1234"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Line ID</label>
              <input
                type="text"
                placeholder="line_id"
                value={form.lineId}
                onChange={(e) => setForm({ ...form, lineId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-[#4F46E5] text-white rounded-xl text-xs font-bold hover:bg-[#4338CA] shadow-md shadow-indigo-600/25 cursor-pointer"
            >
              ✓ บันทึกข้อมูลส่วนตัว
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
