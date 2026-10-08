"use client";

import React, { useState } from "react";
import { Member, Role } from "@/lib/types";
import { ROLE_CONFIG, GOVERNMENT_DIVISIONS } from "@/lib/rbac";

interface LoginPageProps {
  onLogin: (member: Member, rememberMe: boolean) => void;
  availableMembers: Member[];
}

export function LoginPage({ onLogin, availableMembers }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("••••••••");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const [showRequestAccessModal, setShowRequestAccessModal] = useState(false);
  const [requestForm, setRequestForm] = useState({
    prefix: "นาย",
    firstName: "",
    lastName: "",
    nickname: "",
    position: "",
    division: GOVERNMENT_DIVISIONS[1] as string,
    email: "",
    phone: "",
    lineId: "",
    requestedRole: "member" as Role,
    reason: "",
  });
  const [requestSuccess, setRequestSuccess] = useState(false);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    setTimeout(() => {
      // Find matching member by email or default to first member if matches
      const matched = availableMembers.find(
        (m) => m.email.toLowerCase() === email.trim().toLowerCase()
      );

      if (matched) {
        setIsLoading(false);
        onLogin(matched, rememberMe);
      } else {
        setIsLoading(false);
        setErrorMessage(
          "ไม่พบบัญชีผู้ใช้นี้ในระบบ กรุณาลองใช้อีเมลตัวอย่างหรือคลิกเลือกบัญชีด่วนด้านล่าง"
        );
      }
    }, 500);
  };

  const handleQuickDemoLogin = (role: Role) => {
    setIsLoading(true);
    setErrorMessage(null);

    const target = availableMembers.find((m) => m.role === role) || availableMembers[0];
    setTimeout(() => {
      setIsLoading(false);
      onLogin(target, rememberMe);
    }, 350);
  };

  const handleFillDemoCredentials = (role: Role) => {
    const target = availableMembers.find((m) => m.role === role) || availableMembers[0];
    setEmail(target.email);
    setPassword("password123");
    setErrorMessage(null);
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotSuccess(true);
    setTimeout(() => {
      setForgotSuccess(false);
      setShowForgotPasswordModal(false);
      setForgotEmail("");
    }, 2500);
  };

  const handleRequestAccessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRequestSuccess(true);
    setTimeout(() => {
      setRequestSuccess(false);
      setShowRequestAccessModal(false);
      setRequestForm({
        prefix: "นาย",
        firstName: "",
        lastName: "",
        nickname: "",
        position: "",
        division: GOVERNMENT_DIVISIONS[1] as string,
        email: "",
        phone: "",
        lineId: "",
        requestedRole: "member",
        reason: "",
      });
    }, 2500);
  };

  return (
    <div className="min-h-screen w-screen flex flex-col lg:flex-row bg-[#0F172A] text-slate-100 overflow-y-auto">
      {/* ─── LEFT HERO BANNER ─── */}
      <div className="lg:w-1/2 relative p-8 lg:p-16 flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#1E1B4B] via-[#0F172A] to-[#042F2E]">
        {/* Glow ambient effects */}
        <div className="absolute top-0 -left-20 w-96 h-96 bg-[#4F46E5]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-[#0D9488]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#4F46E5] to-[#818CF8] flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-500/30">
            Σ
          </div>
          <div>
            <span className="text-2xl font-black text-white font-heading tracking-tight block leading-tight">
              OmniOffice
            </span>
            <span className="text-xs text-indigo-400 font-semibold tracking-wider">
              ENTERPRISE VIRTUAL OFFICE PLATFORM
            </span>
          </div>
        </div>

        {/* Center Presentation */}
        <div className="relative z-10 my-10 lg:my-0 space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
            <span>✨ ระบบจัดการสำนักงานเสมือนยุคใหม่</span>
            <span>· v1.0 พร้อมใช้งาน</span>
          </div>

          <h1 className="text-3xl lg:text-5xl font-black font-heading text-white leading-tight">
            เชื่อมต่อการทำงาน ทุกที่ ทุกเวลา ด้วยความปลอดภัยระดับองค์กร
          </h1>

          <p className="text-slate-300 text-sm lg:text-base leading-relaxed">
            ระบบสื่อสาร วางแผนงานกระดาน Kanban จัดการห้องประชุม และจองรถยนต์ส่วนกลาง
            พร้อมระบบควบคุมสิทธิ์ RBAC 4 ระดับบทบาทอย่างแม่นยำ
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-2 gap-4 pt-3">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="text-2xl mb-1.5">💬</div>
              <div className="font-bold text-sm text-white">แชททีม & การประชุม</div>
              <div className="text-xs text-slate-400 mt-0.5">สื่อสารแบบเรียลไทม์</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="text-2xl mb-1.5">📋</div>
              <div className="font-bold text-sm text-white">Kanban & งานทีม</div>
              <div className="text-xs text-slate-400 mt-0.5">ติดตามงานไม่พลาดกำหนด</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="text-2xl mb-1.5">🚗</div>
              <div className="font-bold text-sm text-white">จองยานพาหนะ</div>
              <div className="text-xs text-slate-400 mt-0.5">ระบบจองรถยนต์ส่วนกลาง</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="text-2xl mb-1.5">🛡️</div>
              <div className="font-bold text-sm text-white">ความปลอดภัย RBAC</div>
              <div className="text-xs text-slate-400 mt-0.5">ควบคุมสิทธิ์ 4 ระดับบทบาท</div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="relative z-10 text-xs text-slate-400 pt-6 border-t border-white/10">
          © 2026 OmniOffice Enterprise. ขับเคลื่อนด้วย Next.js 16 & Tailwind CSS v4.
        </div>
      </div>

      {/* ─── RIGHT LOGIN FORM ─── */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-14 bg-[#F8FAFC] text-slate-800">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h2 className="text-2xl lg:text-3xl font-black font-heading text-slate-900">
              เข้าสู่ระบบ (Sign In)
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              กรอกอีเมลองค์กรหรือเลือกบัญชีทดสอบเพื่อเริ่มต้นใช้งาน
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Demo Accounts Selection */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600">
              <span>⚡ ทดลองเข้าสู่ระบบด่วน (Quick Demo Accounts)</span>
              <span className="text-[10px] text-indigo-600 font-semibold">1-Click Login</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {(["admin", "manager", "member", "guest"] as Role[]).map((r) => {
                const conf = ROLE_CONFIG[r];
                const demoUser = availableMembers.find((m) => m.role === r) || availableMembers[0];

                return (
                  <div
                    key={r}
                    className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-[#4F46E5] hover:shadow-md transition-all text-left group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {demoUser.avatarUrl ? (
                            <img
                              src={demoUser.avatarUrl}
                              alt={demoUser.name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 shadow-xs"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                              {demoUser.avatarText || conf.icon}
                            </div>
                          )}
                          <span className="text-base">{conf.icon}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${conf.badgeColor}`}
                        >
                          {r.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                        <span>{demoUser.name}</span>
                        {demoUser.nickname && (
                          <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded-md">
                            ({demoUser.nickname})
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-indigo-600 font-semibold truncate mt-0.5">
                        {demoUser.position}
                      </div>
                      <div className="text-[9px] text-slate-500 truncate">
                        {demoUser.division}
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono truncate mt-0.5">
                        {demoUser.email}
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleQuickDemoLogin(r)}
                        className="flex-1 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 text-[10px] font-bold transition-all text-center cursor-pointer disabled:opacity-50"
                        title="เข้าสู่ระบบทันทีด้วยบทบาทนี้"
                      >
                        เข้าใช้งาน ➜
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFillDemoCredentials(r)}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 text-[10px] transition-colors cursor-pointer"
                        title="เติมอีเมลลงในฟอร์ม"
                      >
                        ✍️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center my-3">
            <div className="flex-1 border-t border-slate-200" />
            <span className="px-3 text-xs text-slate-400 font-medium">หรือเข้าสู่ระบบด้วยอีเมล</span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          {/* Standard Login Form */}
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                อีเมลองค์กร (Corporate Email)
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="เช่น worakorn@company.co.th"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 transition-all placeholder-slate-400"
                />
                <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">✉️</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  รหัสผ่าน (Password)
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(true)}
                  className="text-xs text-indigo-600 font-semibold hover:underline cursor-pointer"
                >
                  ลืมรหัสผ่าน?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 transition-all"
                />
                <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">🔒</span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-medium cursor-pointer"
                  title={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center space-x-2 cursor-pointer text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-[#4F46E5] rounded"
                />
                <span>จดจำการเข้าสู่ระบบไว้</span>
              </label>
              <span className="text-slate-400 flex items-center gap-1">
                <span>🛡️</span> SSL 256-bit Encrypted
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-[#4F46E5] to-[#6366F1] text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/25 hover:from-[#4338CA] hover:to-[#4F46E5] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>กำลังตรวจสอบสิทธิ์...</span>
                </>
              ) : (
                <span>เข้าสู่ระบบ (Sign In) →</span>
              )}
            </button>
          </form>

          {/* Registration / Request Access link */}
          <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
            <span>ยังไม่มีบัญชีใช้งาน?</span>
            <button
              type="button"
              onClick={() => setShowRequestAccessModal(true)}
              className="font-bold text-indigo-600 hover:underline cursor-pointer"
            >
              ขอสิทธิ์เข้าใช้งานใหม่ (Request Access) →
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 leading-relaxed">
            💡 <strong>คำแนะนำ:</strong> สามารถกดปุ่ม <strong>เข้าใช้งาน ➜</strong> ในแต่ละการ์ดด้านบน เพื่อทดสอบบทบาท Admin, Manager, Member, หรือ Guest ได้ทันที
          </div>
        </div>
      </div>

      {/* ─── FORGOT PASSWORD MODAL ─── */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-xl">
                    🔑
                  </div>
                  <h3 className="text-lg font-bold font-heading text-slate-900">
                    รีเซ็ตรหัสผ่าน (Reset Password)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {forgotSuccess ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold space-y-1">
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                    <span>✓</span>
                    <span>ส่งลิงก์รีเซ็ตเรียบร้อยแล้ว!</span>
                  </div>
                  <div>กรุณาตรวจสอบกล่องจดหมายอีเมลของคุณเพื่อตั้งรหัสผ่านใหม่</div>
                </div>
              ) : (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    ระบุอีเมลองค์กรของคุณที่ลงทะเบียนไว้ในระบบ OmniOffice เราจะส่งลิงก์สำหรับสร้างรหัสผ่านใหม่ไปยังกล่องข้อความของคุณ
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      อีเมลองค์กร
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="เช่น worakorn@company.co.th"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotPasswordModal(false)}
                      className="flex-1 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20"
                    >
                      ส่งลิงก์รีเซ็ต
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── REQUEST ACCESS MODAL ─── */}
      {showRequestAccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center text-xl">
                    📝
                  </div>
                  <h3 className="text-lg font-bold font-heading text-slate-900">
                    ขอสิทธิ์เข้าใช้งานใหม่
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRequestAccessModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {requestSuccess ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold space-y-1">
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                    <span>✓</span>
                    <span>ส่งคำขอสำเร็จเรียบร้อย!</span>
                  </div>
                  <div>ผู้ดูแลระบบ (Admin) จะตรวจสอบและอนุมัติสิทธิ์ พร้อมแจ้งผลทางอีเมล</div>
                </div>
              ) : (
                <form onSubmit={handleRequestAccessSubmit} className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
                  {/* คำนำหน้า, ชื่อ, นามสกุล, ชื่อเล่น */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        คำนำหน้า
                      </label>
                      <select
                        value={requestForm.prefix}
                        onChange={(e) => setRequestForm({ ...requestForm, prefix: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-600"
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
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ชื่อ
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น เสกพล"
                        value={requestForm.firstName}
                        onChange={(e) => setRequestForm({ ...requestForm, firstName: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        นามสกุล
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น ดิษฐโชติ"
                        value={requestForm.lastName}
                        onChange={(e) => setRequestForm({ ...requestForm, lastName: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ชื่อเล่น
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น เสก"
                        value={requestForm.nickname}
                        onChange={(e) => setRequestForm({ ...requestForm, nickname: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  {/* ตำแหน่ง & กลุ่ม/ฝ่าย */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ตำแหน่ง (Position)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น นักวิชาการคอมพิวเตอร์ชำนาญการ"
                        value={requestForm.position}
                        onChange={(e) => setRequestForm({ ...requestForm, position: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        กลุ่ม/ฝ่าย (Division / Section)
                      </label>
                      <select
                        value={requestForm.division}
                        onChange={(e) =>
                          setRequestForm({ ...requestForm, division: e.target.value })
                        }
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

                  {/* อีเมล, เบอร์โทรศัพท์, Line ID */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-1">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        อีเมลราชการ
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="name@agency.go.th"
                        value={requestForm.email}
                        onChange={(e) => setRequestForm({ ...requestForm, email: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        หมายเลขโทรศัพท์
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="02-612-6000 หรือ 081-xxx-xxxx"
                        value={requestForm.phone}
                        onChange={(e) => setRequestForm({ ...requestForm, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Line ID
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น somsak_line"
                        value={requestForm.lineId}
                        onChange={(e) => setRequestForm({ ...requestForm, lineId: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  {/* สิทธิ์ที่ต้องการขอ */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      สิทธิ์ที่ต้องการขอ (Requested Role)
                    </label>
                    <select
                      value={requestForm.requestedRole}
                      onChange={(e) =>
                        setRequestForm({ ...requestForm, requestedRole: e.target.value as Role })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold"
                    >
                      <option value="member">👤 พนักงาน/เจ้าหน้าที่ (Member)</option>
                      <option value="manager">👔 ผู้อำนวยการกลุ่ม/ผู้จัดการ (Manager)</option>
                      <option value="guest">🎟️ ผู้เยี่ยมชม / ผู้เชี่ยวชาญภายนอก (Guest)</option>
                    </select>
                  </div>

                  {/* เหตุผล */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      เหตุผลความจำเป็นในการขอสิทธิ์ใช้งาน
                    </label>
                    <textarea
                      rows={2}
                      placeholder="ระบุภารกิจหรือเหตุผลความจำเป็น..."
                      value={requestForm.reason}
                      onChange={(e) =>
                        setRequestForm({ ...requestForm, reason: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-600"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowRequestAccessModal(false)}
                      className="flex-1 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20"
                    >
                      ส่งคำขอใช้งาน
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
