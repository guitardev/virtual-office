"use client";

import React, { useState, useId } from "react";
import { Member } from "@/lib/types";
import {
  changeNasPassword,
  getClientSynologyConfig,
  getUserNasAccount,
} from "@/lib/synology";

interface ChangeNasPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Member | null;
  onSuccess?: (msg: string) => void;
}

export function ChangeNasPasswordModal({
  isOpen,
  onClose,
  currentUser,
  onSuccess,
}: ChangeNasPasswordModalProps) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const config = getClientSynologyConfig();
  const suggestedNasAccount =
    getUserNasAccount() ||
    (currentUser?.id?.startsWith("syno_") ? currentUser.id.replace(/^syno_/, "") : null) ||
    currentUser?.firstName?.replace(/^(นาย|นางสาว|นาง|ดร\.|ว่าที่\s*ร\.ต\.)/, "") ||
    (currentUser?.email && !currentUser.email.startsWith("user_") ? currentUser.email.split("@")[0] : null) ||
    currentUser?.name?.replace(/^(นาย|นางสาว|นาง|ดร\.|ว่าที่\s*ร\.ต\.)/, "").split(" ")[0] ||
    "admin";

  const [accountUsername, setAccountUsername] = useState(suggestedNasAccount);

  React.useEffect(() => {
    if (isOpen) {
      setAccountUsername(suggestedNasAccount);
    }
  }, [isOpen, suggestedNasAccount]);

  if (!isOpen) return null;

  // Password strength checks
  const hasMinLength = newPassword.length >= 6;
  const hasUpperLower = /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!accountUsername.trim()) {
      setErrorMessage("กรุณาระบุชื่อบัญชีผู้ใช้ Synology NAS");
      return;
    }

    if (!oldPassword.trim()) {
      setErrorMessage("กรุณาระบุรหัสผ่านปัจจุบัน");
      return;
    }

    if (!newPassword.trim()) {
      setErrorMessage("กรุณาระบุรหัสผ่านใหม่");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย ๖ ตัวอักษร");
      return;
    }

    if (newPassword === oldPassword) {
      setErrorMessage("รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    setIsLoading(true);

    try {
      const res = await changeNasPassword(
        accountUsername.trim(),
        oldPassword,
        newPassword,
        config.nasUrl
      );

      if (res.success) {
        const msg = res.message || "เปลี่ยนรหัสผ่านบน Synology NAS สำเร็จเรียบร้อยแล้ว";
        setSuccessMessage(msg);
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        if (onSuccess) {
          onSuccess(msg);
        }
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        setErrorMessage(
          res.error || "ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาตรวจสอบรหัสผ่านเดิมและความถูกต้อง"
        );
      }
    } catch (err: any) {
      setErrorMessage(`เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err?.message || "ไม่สามารถติดต่อ NAS ได้"}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-xl shadow-xs">
              🔒
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">เปลี่ยนรหัสผ่าน Synology NAS</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  DSM Direct API
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                อัปเดตรหัสผ่านตรงไปยังเครื่องแม่ข่าย Synology ประจำสำนักงาน
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm transition-colors cursor-pointer disabled:opacity-50"
            title="ปิดหน้าต่าง (Close)"
          >
            ✕
          </button>
        </div>

        {/* NAS Target Info Banner */}
        <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600">
            <span>🖥️</span>
            <span>เครื่องแม่ข่าย:</span>
            <span className="font-mono font-bold text-slate-800">
              {config.nasUrl || "https://nas.smso.site"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <span>👤</span>
            <span>บัญชี NAS:</span>
            <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              {accountUsername || suggestedNasAccount}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Success Banner */}
          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center gap-2.5 animate-fade-in shadow-2xs">
              <span className="text-xl">✅</span>
              <div>
                <div className="font-bold">สำเร็จเรียบร้อย</div>
                <div>{successMessage}</div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2.5 animate-fade-in shadow-2xs">
              <span className="text-lg leading-none">⚠️</span>
              <div>
                <div className="font-bold">ไม่สามารถเปลี่ยนรหัสผ่านได้</div>
                <div className="leading-relaxed mt-0.5">{errorMessage}</div>
              </div>
            </div>
          )}

          {/* Field 0: NAS Account Username */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                ชื่อบัญชี Synology NAS (Username) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-slate-400">ตรวจสอบหรือแก้ไขให้ตรงกับ NAS</span>
            </div>
            <div className="relative flex items-center">
              <input
                type="text"
                required
                data-testid="nas-username-input"
                value={accountUsername}
                onChange={(e) => setAccountUsername(e.target.value)}
                placeholder="ระบุชื่อบัญชีผู้ใช้บน Synology NAS (เช่น พนมศักย์ หรือ admin)"
                className="w-full pl-3.5 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 transition-colors"
              />
            </div>
          </div>

          {/* Field 1: Old Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              รหัสผ่านปัจจุบัน (Current Password) <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                type={showOldPass ? "text" : "password"}
                required
                data-testid="nas-old-password-input"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="ระบุรหัสผ่านปัจจุบันของบัญชี Synology NAS"
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-600 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowOldPass(!showOldPass)}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-1 text-sm cursor-pointer"
                title={showOldPass ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                {showOldPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Field 2: New Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              รหัสผ่านใหม่ (New Password) <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                type={showNewPass ? "text" : "password"}
                required
                data-testid="nas-new-password-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="ระบุรหัสผ่านใหม่ (อย่างน้อย ๖ ตัวอักษร)"
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-600 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-1 text-sm cursor-pointer"
                title={showNewPass ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                {showNewPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Field 3: Confirm New Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ยืนยันรหัสผ่านใหม่ (Confirm Password) <span className="text-rose-500">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                type={showConfirmPass ? "text" : "password"}
                required
                data-testid="nas-confirm-password-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="พิมพ์รหัสผ่านใหม่อีกครั้งให้ตรงกัน"
                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-indigo-600 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-1 text-sm cursor-pointer"
                title={showConfirmPass ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                {showConfirmPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {/* Password Requirements Checklist */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-[11px]">
            <div className="font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <span>🛡️</span>
              <span>เกณฑ์ความปลอดภัยรหัสผ่าน Synology DSM:</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div
                className={`flex items-center gap-1.5 ${
                  hasMinLength ? "text-emerald-700 font-bold" : "text-slate-400"
                }`}
              >
                <span>{hasMinLength ? "✓" : "○"}</span>
                <span>ยาวอย่างน้อย ๖ ตัวอักษร</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  hasUpperLower ? "text-emerald-700 font-bold" : "text-slate-400"
                }`}
              >
                <span>{hasUpperLower ? "✓" : "○"}</span>
                <span>มีตัวพิมพ์ใหญ่และเล็ก (A-z)</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  hasNumber ? "text-emerald-700 font-bold" : "text-slate-400"
                }`}
              >
                <span>{hasNumber ? "✓" : "○"}</span>
                <span>มีตัวเลข (0-9)</span>
              </div>
              <div
                className={`flex items-center gap-1.5 ${
                  isMatch ? "text-emerald-700 font-bold" : "text-slate-400"
                }`}
              >
                <span>{isMatch ? "✓" : "○"}</span>
                <span>รหัสผ่านตรงกันทั้งสองช่อง</span>
              </div>
            </div>
          </div>

          {/* Informational Guidance */}
          <div className="text-[11px] text-slate-500 leading-relaxed bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 flex items-start gap-2">
            <span className="text-base leading-none">💡</span>
            <span>
              เมื่อเปลี่ยนรหัสผ่านสำเร็จ ท่านสามารถนำรหัสผ่านใหม่นี้ไปล็อกอินเข้าใช้งานระบบ
              <strong> Synology Drive, File Station, Synology Photos </strong>
              และ <strong>Smart MSO</strong> ได้ทันที
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isLoading}
              data-testid="nas-cancel-btn"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              data-testid="nas-submit-btn"
              disabled={isLoading || !hasMinLength || !isMatch}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  <span>กำลังอัปเดตไปยัง Synology NAS...</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>ยืนยันเปลี่ยนรหัสผ่านบน NAS</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
