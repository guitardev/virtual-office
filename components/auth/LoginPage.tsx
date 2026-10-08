"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Member, Role, AccessRequest, PersonnelType } from "@/lib/types";
import { ROLE_CONFIG, GOVERNMENT_DIVISIONS } from "@/lib/rbac";
import {
  saveAccessRequest,
  signInWithEmail,
  signUpWithEmail,
  signInWithOAuth,
  sendPasswordResetEmail,
  findOrMapAuthMember,
  isSupabaseConfigured,
  saveMember,
} from "@/lib/supabase";

interface LoginPageProps {
  onLogin: (member: Member, rememberMe: boolean) => void;
  availableMembers: Member[];
  onRequestAccess?: (request: AccessRequest) => void;
}

export function LoginPage({ onLogin, availableMembers, onRequestAccess }: LoginPageProps) {
  // Auth mode: Sign In vs Sign Up
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  // Sign In state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("••••••••");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [matchedDirectoryUser, setMatchedDirectoryUser] = useState<Member | null>(null);

  // Sign Up state
  const [signupForm, setSignupForm] = useState({
    prefix: "นาย",
    firstName: "",
    lastName: "",
    nickname: "",
    personnelType: "ข้าราชการ" as PersonnelType,
    position: "",
    division: GOVERNMENT_DIVISIONS[0] as string,
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // LINE Login Modal state
  const [showLineModal, setShowLineModal] = useState(false);

  const [showRequestAccessModal, setShowRequestAccessModal] = useState(false);
  const [requestForm, setRequestForm] = useState({
    prefix: "นาย",
    firstName: "",
    lastName: "",
    nickname: "",
    personnelType: "ข้าราชการ" as PersonnelType,
    position: "",
    division: GOVERNMENT_DIVISIONS[1] as string,
    email: "",
    phone: "",
    lineId: "",
    requestedRole: "member" as Role,
    reason: "",
  });
  const [requestSuccess, setRequestSuccess] = useState(false);

  const isLive = isSupabaseConfigured();

  // ─── REAL SUPABASE SIGN IN ───
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setMatchedDirectoryUser(null);
    setIsLoading(true);

    try {
      const res = await signInWithEmail(email, password);

      if (res.success && res.user) {
        setIsLoading(false);
        const member = findOrMapAuthMember(res.user, availableMembers);
        onLogin(member, rememberMe);
        return;
      }

      // Check if email exists in official directory
      const directoryMatch = availableMembers.find(
        (m) => m.email.toLowerCase().trim() === email.toLowerCase().trim()
      );

      setIsLoading(false);

      if (directoryMatch) {
        setMatchedDirectoryUser(directoryMatch);
        setErrorMessage(
          res.error ||
            `พบบัญชี "${directoryMatch.name}" ในทำเนียบบุคลากร แต่ยังไม่ได้ลงทะเบียนรหัสผ่านใน Supabase Auth`
        );
      } else {
        setErrorMessage(
          res.error || "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบหรือลงทะเบียนบัญชีใหม่"
        );
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อระบบยืนยันตัวตน");
    }
  };

  // ─── REAL SUPABASE SIGN UP ───
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (signupForm.password.length < 6) {
      setErrorMessage("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      setErrorMessage("รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    setIsLoading(true);

    try {
      const fullName = `${signupForm.prefix}${signupForm.firstName.trim()} ${signupForm.lastName.trim()}`.trim();
      const res = await signUpWithEmail(signupForm.email, signupForm.password, {
        fullName,
        position: signupForm.position.trim(),
        division: signupForm.division,
        role: "member",
      });

      if (!res.success) {
        setIsLoading(false);
        setErrorMessage(res.error || "การลงทะเบียนไม่สำเร็จ");
        return;
      }

      // Create new member profile in public.users
      const newMember: Member = {
        id: res.user?.id || `usr_${Date.now()}`,
        prefix: signupForm.prefix,
        firstName: signupForm.firstName.trim(),
        lastName: signupForm.lastName.trim(),
        nickname: signupForm.nickname.trim() || undefined,
        name: fullName,
        personnelType: signupForm.personnelType,
        position: signupForm.position.trim(),
        division: signupForm.division,
        department: signupForm.division,
        email: signupForm.email.trim(),
        phone: "-",
        lineId: "-",
        role: "member",
        status: "active",
        joinedDate: "วันนี้",
        avatarText: signupForm.firstName.slice(0, 2),
      };

      await saveMember(newMember);

      setIsLoading(false);

      if (res.session) {
        // Logged in directly!
        onLogin(newMember, true);
      } else {
        // Confirmation required
        setSuccessMessage(
          `✓ สร้างบัญชี ${signupForm.email} บน Supabase Auth สำเร็จ! หากระบบเปิด Email Confirmation กรุณาตรวจสอบกล่องจดหมาย หรือลงชื่อเข้าใช้งานด้วยรหัสผ่านได้เลย`
        );
        setEmail(signupForm.email);
        setPassword(signupForm.password);
        setAuthMode("signin");
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || "เกิดข้อผิดพลาดในการลงทะเบียน");
    }
  };

  // ─── REAL SUPABASE & SSO OAUTH (Google / LINE) ───
  const handleOAuthLogin = async (provider: "google" | "line") => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (provider === "line") {
      const lineChannelId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
      if (!lineChannelId) {
        setShowLineModal(true);
        return;
      }
    }

    setIsLoading(true);

    try {
      const res = await signInWithOAuth(provider);
      if (!res.success) {
        setIsLoading(false);
        if (provider === "line") {
          setShowLineModal(true);
        } else {
          setErrorMessage(
            `⚠️ การเชื่อมต่อผ่าน ${provider.toUpperCase()} ยังไม่พร้อมใช้งาน: ${res.error || "Provider ยังไม่ได้เปิดใช้งานใน Supabase Dashboard (ไปที่ Authentication > Providers แล้วเปิดใช้งาน)"}`
          );
        }
      }
      // If success, browser will redirect to OAuth provider
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || `เกิดข้อผิดพลาดในการเชื่อมต่อ ${provider}`);
    }
  };

  const handleDemoLineLogin = () => {
    setShowLineModal(false);
    setIsLoading(true);
    const lineMember: Member = {
      id: "usr_line_user",
      prefix: "นาย",
      firstName: "ไลน์",
      lastName: "ผู้ใช้งาน",
      name: "ผู้ใช้งาน LINE (LINE User)",
      personnelType: "พนักงานราชการ",
      position: "เจ้าหน้าที่สื่อสารและสารสนเทศ",
      division: GOVERNMENT_DIVISIONS[0],
      department: GOVERNMENT_DIVISIONS[0],
      email: "line.user@m-society.go.th",
      phone: "055-705031",
      lineId: "@line_staff",
      role: "member",
      status: "active",
      joinedDate: "วันนี้",
      avatarText: "LN",
    };
    setTimeout(() => {
      setIsLoading(false);
      onLogin(lineMember, rememberMe);
    }, 400);
  };

  // Quick 1-click login for demo / role evaluation
  const handleQuickDemoLogin = (role: Role) => {
    setIsLoading(true);
    setErrorMessage(null);

    const target = availableMembers.find((m) => m.role === role) || availableMembers[0];
    setTimeout(() => {
      setIsLoading(false);
      onLogin(target, rememberMe);
    }, 300);
  };

  const handleFillDemoCredentials = (role: Role) => {
    const target = availableMembers.find((m) => m.role === role) || availableMembers[0];
    setEmail(target.email);
    setPassword("password123");
    setErrorMessage(null);
    setMatchedDirectoryUser(null);
  };

  const handleBypassWithMatchedDirectoryUser = () => {
    if (matchedDirectoryUser) {
      onLogin(matchedDirectoryUser, rememberMe);
    }
  };

  // Forgot password handler
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setIsLoading(true);

    const res = await sendPasswordResetEmail(forgotEmail);
    setIsLoading(false);

    if (res.success) {
      setForgotSuccess(true);
      setTimeout(() => {
        setForgotSuccess(false);
        setShowForgotPasswordModal(false);
        setForgotEmail("");
      }, 3000);
    } else {
      setForgotError(res.error || "ไม่สามารถส่งอีเมลรีเซ็ตรหัสผ่านได้");
    }
  };

  // Request Access handler
  const handleRequestAccessSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const fullName = `${requestForm.prefix}${requestForm.firstName.trim()} ${requestForm.lastName.trim()}`.trim();
    const newReq: AccessRequest = {
      id: `req_${Date.now()}`,
      prefix: requestForm.prefix,
      firstName: requestForm.firstName.trim(),
      lastName: requestForm.lastName.trim(),
      nickname: requestForm.nickname.trim() || undefined,
      name: fullName,
      personnelType: requestForm.personnelType,
      position: requestForm.position.trim(),
      division: requestForm.division,
      email: requestForm.email.trim(),
      phone: requestForm.phone.trim() || "-",
      lineId: requestForm.lineId.trim() || "-",
      requestedRole: requestForm.requestedRole,
      reason: requestForm.reason.trim() || "ขอสิทธิ์เข้าใช้งานระบบสำนักงานเสมือน",
      status: "pending",
      createdAt: new Date().toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    try {
      const existingStr = localStorage.getItem("omnioffice_access_requests");
      const existing: AccessRequest[] = existingStr ? JSON.parse(existingStr) : [];
      localStorage.setItem("omnioffice_access_requests", JSON.stringify([newReq, ...existing]));
    } catch (e) {
      console.warn("Could not save to localStorage:", e);
    }

    saveAccessRequest(newReq).catch(console.warn);

    if (onRequestAccess) {
      onRequestAccess(newReq);
    }

    setRequestSuccess(true);
    setTimeout(() => {
      setRequestSuccess(false);
      setShowRequestAccessModal(false);
      setRequestForm({
        prefix: "นาย",
        firstName: "",
        lastName: "",
        nickname: "",
        personnelType: "ข้าราชการ",
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
            <span>· Supabase Auth Live</span>
          </div>

          <h1 className="text-3xl lg:text-5xl font-black font-heading text-white leading-tight">
            เชื่อมต่อการทำงาน ทุกที่ ทุกเวลา ด้วยความปลอดภัยระดับองค์กร
          </h1>

          <p className="text-slate-300 text-sm lg:text-base leading-relaxed">
            ระบบสื่อสาร วางแผนงานกระดาน Kanban จัดการห้องประชุม และจองรถยนต์ส่วนกลาง
            พร้อมระบบยืนยันตัวตนจริงผ่าน <strong>Supabase Auth</strong> และการควบคุมสิทธิ์ RBAC 4 ระดับบทบาท
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-2 gap-4 pt-3">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="text-2xl mb-1.5">🔐</div>
              <div className="font-bold text-sm text-white">Supabase Auth</div>
              <div className="text-xs text-slate-400 mt-0.5">Email/Password & OAuth SSO</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="text-2xl mb-1.5">🛡️</div>
              <div className="font-bold text-sm text-white">RBAC Matrix</div>
              <div className="text-xs text-slate-400 mt-0.5">ควบคุมสิทธิ์ 4 ระดับบทบาท</div>
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
          </div>
        </div>

        {/* Footer Info */}
        <div className="relative z-10 text-xs text-slate-400 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>© 2026 OmniOffice.</span>
            <Link href="/policy" className="hover:text-white underline underline-offset-2">
              Privacy Policy
            </Link>
            <span>·</span>
            <Link href="/term" className="hover:text-white underline underline-offset-2">
              Terms
            </Link>
          </div>
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Supabase Live Connected
          </span>
        </div>
      </div>

      {/* ─── RIGHT LOGIN & AUTH FORM ─── */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-14 bg-[#F8FAFC] text-slate-800">
        <div className="w-full max-w-md space-y-5">
          {/* Header & Status Indicator */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Supabase Auth {isLive ? "Live" : "Ready"}</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                SSL 256-Bit Encrypted
              </span>
            </div>

            <h2 className="text-2xl lg:text-3xl font-black font-heading text-slate-900">
              {authMode === "signin" ? "เข้าสู่ระบบ (Sign In)" : "ลงทะเบียนใหม่ (Sign Up)"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {authMode === "signin"
                ? "ยืนยันตัวตนด้วยบัญชี Supabase Auth หรือเลือกบัญชีตัวอย่างเพื่อเริ่มต้น"
                : "สร้างบัญชีผู้ใช้งานใหม่บนระบบสำนักงานเสมือน Supabase"}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-200/80 border border-slate-300/60 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setAuthMode("signin");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 rounded-xl transition-all cursor-pointer ${
                authMode === "signin"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🔐 เข้าสู่ระบบ (Sign In)
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("signup");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 rounded-xl transition-all cursor-pointer ${
                authMode === "signup"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ✍️ ลงทะเบียน (Sign Up)
            </button>
          </div>

          {/* Error & Success Messages */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold space-y-2 animate-fade-in">
              <div className="flex items-start gap-2">
                <span className="text-base shrink-0">⚠️</span>
                <span>{errorMessage}</span>
              </div>

              {matchedDirectoryUser && (
                <div className="mt-2 pt-2 border-t border-red-200/60 flex items-center justify-between">
                  <span className="text-[11px] text-red-800">
                    เข้าใช้งานด้วยข้อมูลทำเนียบบุคลากรนี้ทันที:
                  </span>
                  <button
                    type="button"
                    onClick={handleBypassWithMatchedDirectoryUser}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                  >
                    เข้าสู่ระบบด่วน ➜
                  </button>
                </div>
              )}
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <span>✓</span>
              <span>{successMessage}</span>
            </div>
          )}

          {/* OAuth SSO Buttons */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              เข้าสู่ระบบด่วนด้วย OAuth SSO (Google / LINE)
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleOAuthLogin("google")}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 text-xs font-bold text-slate-700 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Google</span>
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleOAuthLogin("line")}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.019 9.572.39.084.922.258 1.057.592.121.303.079.778.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967 1.739-1.907 2.589-3.864 2.589-5.956zm-14.771 2.458h-2.193c-.328 0-.594-.266-.594-.594v-3.729c0-.328.266-.594.594-.594s.594.266.594.594v3.135h1.599c.328 0 .594.266.594.594s-.266.594-.594.594zm2.145-.594c0 .328-.266.594-.594.594s-.594-.266-.594-.594v-3.729c0-.328.266-.594.594-.594s.594.266.594.594v3.729zm4.275 0c0 .248-.153.468-.382.553-.069.026-.142.041-.212.041-.167 0-.33-.07-.442-.198l-1.924-2.589v2.193c0 .328-.266.594-.594.594s-.594-.266-.594-.594v-3.729c0-.248.153-.468.382-.553.069-.026.142-.041-.212-.041.167 0 .33.07.442.198l1.924 2.589v-2.193c0-.328.266-.594.594-.594s.594.266.594.594v3.729zm3.504-2.541h-1.599v.76h1.599c.328 0 .594.266.594.594s-.266.594-.594.594h-2.193c-.328 0-.594-.266-.594-.594v-3.729c0-.328.266-.594.594-.594h2.193c.328 0 .594.266.594.594s-.266.594-.594.594h-1.599v.787h1.599c.328 0 .594.266.594.594s-.266.594-.594.594z" />
                </svg>
                <span>LINE</span>
              </button>
            </div>
          </div>

          <div className="flex items-center my-3">
            <div className="flex-1 border-t border-slate-200" />
            <span className="px-3 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              {authMode === "signin"
                ? "หรือเข้าสู่ระบบด้วยอีเมล"
                : "หรือกรอกข้อมูลลงทะเบียน"}
            </span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          {/* ─── TAB 1: SIGN IN FORM ─── */}
          {authMode === "signin" && (
            <form onSubmit={handleManualSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  อีเมล (Email)
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="เช่น maliwan.s@m-society.go.th"
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
                <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                  <span>⚡</span> Supabase Auth API
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
                    <span>กำลังยืนยันตัวตนกับ Supabase...</span>
                  </>
                ) : (
                  <span>เข้าสู่ระบบผ่าน Supabase Auth ➜</span>
                )}
              </button>
            </form>
          )}

          {/* ─── TAB 2: SIGN UP FORM ─── */}
          {authMode === "signup" && (
            <form onSubmit={handleSignUpSubmit} className="space-y-3 max-h-[62vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    คำนำหน้า
                  </label>
                  <select
                    value={signupForm.prefix}
                    onChange={(e) => setSignupForm({ ...signupForm, prefix: e.target.value })}
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                  >
                    <option value="นาย">นาย</option>
                    <option value="นาง">นาง</option>
                    <option value="นางสาว">นางสาว</option>
                    <option value="ดร.">ดร.</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    ชื่อ
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ศรัญญู"
                    value={signupForm.firstName}
                    onChange={(e) => setSignupForm({ ...signupForm, firstName: e.target.value })}
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    นามสกุล
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น วงศ์ศิริ"
                    value={signupForm.lastName}
                    onChange={(e) => setSignupForm({ ...signupForm, lastName: e.target.value })}
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    กลุ่มงาน/ฝ่าย
                  </label>
                  <select
                    value={signupForm.division}
                    onChange={(e) => setSignupForm({ ...signupForm, division: e.target.value })}
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 truncate"
                  >
                    {GOVERNMENT_DIVISIONS.map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    ตำแหน่ง
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น นักวิชาการคอมพิวเตอร์"
                    value={signupForm.position}
                    onChange={(e) => setSignupForm({ ...signupForm, position: e.target.value })}
                    className="w-full px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  อีเมล (สำหรับเข้าใช้งาน Supabase Auth)
                </label>
                <input
                  type="email"
                  required
                  placeholder="เช่น saranyu.w@m-society.go.th"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    รหัสผ่าน (อย่างน้อย 6 ตัว)
                  </label>
                  <div className="relative">
                    <input
                      type={showSignupPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={signupForm.password}
                      onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    ยืนยันรหัสผ่าน
                  </label>
                  <input
                    type={showSignupPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={signupForm.confirmPassword}
                    onChange={(e) =>
                      setSignupForm({ ...signupForm, confirmPassword: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/25 hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>กำลังลงทะเบียนบน Supabase...</span>
                  </>
                ) : (
                  <span>ลงทะเบียนบัญชี Supabase Auth ➜</span>
                )}
              </button>
            </form>
          )}

          {/* Registration / Request Access link */}
          <div className="pt-1 flex items-center justify-between text-xs text-slate-500">
            <span>ต้องการขออนุมัติสิทธิ์ราชการ?</span>
            <button
              type="button"
              onClick={() => setShowRequestAccessModal(true)}
              className="font-bold text-indigo-600 hover:underline cursor-pointer"
            >
              ขอสิทธิ์เข้าใช้งานใหม่ (Request Access) →
            </button>
          </div>

          {/* Quick Demo Accounts Selection */}
          <div className="pt-2 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600">
              <span>⚡ บัญชีตัวอย่างข้าราชการ พมจ. กำแพงเพชร</span>
              <span className="text-[10px] text-indigo-600 font-semibold">1-Click Test</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(["admin", "manager", "member", "guest"] as Role[]).map((r) => {
                const conf = ROLE_CONFIG[r];
                const demoUser = availableMembers.find((m) => m.role === r) || availableMembers[0];

                return (
                  <div
                    key={r}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-[#4F46E5] hover:shadow-xs transition-all text-left flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm">{conf.icon}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-md text-[9px] font-bold border ${conf.badgeColor}`}
                        >
                          {r.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-800 truncate">
                        {demoUser.name}
                      </div>
                      <div className="text-[9px] text-indigo-600 font-medium truncate">
                        {demoUser.position}
                      </div>
                      <div className="text-[8px] text-slate-400 font-mono truncate">
                        {demoUser.email}
                      </div>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center gap-1">
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleQuickDemoLogin(r)}
                        className="flex-1 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 text-[9px] font-bold transition-all text-center cursor-pointer disabled:opacity-50"
                        title="เข้าสู่ระบบทันทีด้วยบทบาทนี้"
                      >
                        เข้าใช้งาน ➜
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFillDemoCredentials(r)}
                        className="p-0.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 text-[9px] cursor-pointer"
                        title="เติมอีเมลลงในฟอร์ม"
                      >
                        ✍️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legal Links Footer */}
            <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <Link href="/policy" className="hover:text-indigo-600 transition-colors">
                  นโยบายความเป็นส่วนตัว (PDPA)
                </Link>
                <span>·</span>
                <Link href="/term" className="hover:text-indigo-600 transition-colors">
                  ข้อกำหนดการใช้งาน
                </Link>
              </div>
              <span>v2.4 Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── LINE LOGIN MODAL / SETUP & DEMO ─── */}
      {showLineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-slate-800">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#06C755]/15 text-[#06C755] flex items-center justify-center text-xl font-bold">
                    💬
                  </div>
                  <div>
                    <h3 className="text-base font-bold font-heading text-slate-900">
                      เข้าสู่ระบบด้วย LINE (LINE Login)
                    </h3>
                    <p className="text-[11px] text-slate-500">LINE OAuth 2.0 / OpenID Connect SSO</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLineModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs space-y-2 text-emerald-950">
                <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                  <span>💡</span>
                  <span>ขั้นตอนการเชื่อมต่อ LINE Login จริง:</span>
                </div>
                <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-emerald-900 leading-relaxed">
                  <li>
                    เข้าสู่ <a href="https://developers.line.biz" target="_blank" rel="noreferrer" className="text-emerald-700 underline font-semibold">LINE Developers Console</a> แล้วสร้าง Provider & Channel ชนิด <strong>LINE Login</strong>
                  </li>
                  <li>
                    ระบุ Callback URL:
                    <div className="mt-0.5 font-mono bg-white px-2 py-1 rounded border border-emerald-200 text-[10px] select-all break-all text-emerald-800">
                      https://xkeiuyhkokmecefzzynb.supabase.co/auth/v1/callback
                    </div>
                  </li>
                  <li>
                    นำ Channel ID มาระบุใน <code className="bg-emerald-100/80 px-1 py-0.5 rounded text-[10px]">NEXT_PUBLIC_LINE_CHANNEL_ID</code>
                  </li>
                </ol>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleDemoLineLogin}
                  className="w-full py-2.5 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-bold shadow-md shadow-[#06C755]/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span>⚡ ทดสอบเข้าสู่ระบบด้วยบัญชี LINE (Demo Profile) ➜</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowLineModal(false)}
                  className="w-full py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── FORGOT PASSWORD MODAL ─── */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-xl">
                    🔑
                  </div>
                  <h3 className="text-lg font-bold font-heading text-slate-900">
                    รีเซ็ตรหัสผ่าน (Supabase Reset Password)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {forgotError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                  ⚠️ {forgotError}
                </div>
              )}

              {forgotSuccess ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold space-y-1">
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                    <span>✓</span>
                    <span>ส่งลิงก์รีเซ็ตผ่าน Supabase เรียบร้อยแล้ว!</span>
                  </div>
                  <div>กรุณาตรวจสอบกล่องจดหมายอีเมลของคุณเพื่อตั้งรหัสผ่านใหม่</div>
                </div>
              ) : (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    ระบุอีเมลของคุณที่ลงทะเบียนไว้ในระบบ Supabase Auth เราจะส่งลิงก์สำหรับสร้างรหัสผ่านใหม่ไปยังกล่องข้อความของคุณ
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      อีเมล
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="เช่น maliwan.s@m-society.go.th"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotPasswordModal(false)}
                      className="flex-1 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? "กำลังส่ง..." : "ส่งลิงก์รีเซ็ต (Supabase)"}
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
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
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
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
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

                  {/* ประเภทบุคลากร & ตำแหน่ง & กลุ่ม/ฝ่าย */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ประเภทบุคลากร
                      </label>
                      <select
                        value={requestForm.personnelType}
                        onChange={(e) =>
                          setRequestForm({ ...requestForm, personnelType: e.target.value as PersonnelType })
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-indigo-600"
                      >
                        <option value="ข้าราชการ">🏛️ ข้าราชการ</option>
                        <option value="ลูกจ้างประจำ">🛠️ ลูกจ้างประจำ</option>
                        <option value="พนักงานราชการ">💼 พนักงานราชการ</option>
                        <option value="พนักงานกองทุน">💰 พนักงานกองทุน</option>
                        <option value="พนักงานจ้างเหมาบริการ">🤝 พนักงานจ้างเหมาบริการ</option>
                        <option value="ที่ปรึกษา/ผู้ทรงคุณวุฒิ">🎓 ที่ปรึกษา/ผู้ทรงคุณวุฒิ</option>
                      </select>
                    </div>
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
                      className="flex-1 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 cursor-pointer"
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
