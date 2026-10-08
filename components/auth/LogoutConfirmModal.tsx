"use client";

import React from "react";
import { Member, Role } from "@/lib/types";
import { ROLE_CONFIG } from "@/lib/rbac";

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  user: Member | null;
  role: Role;
}

export function LogoutConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  user,
  role,
}: LogoutConfirmModalProps) {
  if (!isOpen || !user) return null;

  const roleInfo = ROLE_CONFIG[role];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden transform transition-all animate-scale-up">
        {/* Top Accent Strip */}
        <div className="h-2 w-full bg-gradient-to-r from-red-500 via-rose-500 to-amber-500" />

        <div className="p-6 md:p-8 space-y-6">
          {/* Header with Icon */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center text-2xl shrink-0 shadow-xs">
              🚪
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold font-heading text-slate-900">
                ยืนยันการออกจากระบบ
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Confirm Sign Out from OmniOffice
              </p>
            </div>
          </div>

          {/* Current User Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
              {user.avatarText}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-slate-800 truncate font-heading">
                {user.name}
              </div>
              <div className="text-xs text-slate-500 truncate">{user.email}</div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${roleInfo.badgeColor}`}
            >
              {roleInfo.icon} {roleInfo.label.split(" ")[0]}
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed bg-amber-50/80 p-3.5 rounded-xl border border-amber-200/60 flex items-start gap-2">
            <span className="text-amber-600 text-sm">⚠️</span>
            <span>
              เซสชันการทำงานของคุณจะถูกยกเลิก และระบบจะกลับไปยังหน้าเข้าสู่ระบบ คุณจะต้องระบุอีเมลหรือเลือกบทบาทเพื่อเข้าใช้งานอีกครั้ง
            </span>
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-sm font-bold shadow-md shadow-red-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>🚪</span>
              <span>ยืนยันออกจากระบบ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
