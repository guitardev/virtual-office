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
import { setUserNasSid, getClientSynologyConfig, saveClientSynologyConfig, safeParseJsonResponse } from "@/lib/synology";
import { TurnstileWidget } from "./TurnstileWidget";

interface LoginPageProps {
  onLogin: (member: Member, rememberMe: boolean) => void;
  availableMembers: Member[];
  onRequestAccess?: (request: AccessRequest) => void;
}

export function LoginPage({ onLogin, availableMembers, onRequestAccess }: LoginPageProps) {
  // Auth mode: Synology NAS (Default / Primary) vs Supabase Sign In vs Sign Up
  const [authMode, setAuthMode] = useState<"nas" | "signin" | "signup">("nas");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // Database Auth Sign In state
  const [nasUsername, setNasUsername] = useState("");
  const [nasPassword, setNasPassword] = useState("");
  const [showNasPassword, setShowNasPassword] = useState(false);
  const [nasOnline, setNasOnline] = useState(true);

  // Sign In state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  // Test Synology NAS connection on mount
  React.useEffect(() => {
    const config = getClientSynologyConfig();
    const targetUrl =
      config.nasUrl ||
      process.env.NEXT_PUBLIC_SYNOLOGY_NAS_URL ||
      "https://nas.smso.site";

    fetch(`/api/nas/health?url=${encodeURIComponent(targetUrl)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data?.online) {
          setNasOnline(true);
        } else {
          setNasOnline(false);
        }
      })
      .catch(() => setNasOnline(false));
  }, []);

  // ─── SYNOLOGY NAS DSM AUTHENTICATION ───
  const handleNasSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setMatchedDirectoryUser(null);
    setIsLoading(true);

    // Verify Cloudflare Turnstile token if available
    if (turnstileToken) {
      try {
        const verifyRes = await fetch("/api/auth/turnstile/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: turnstileToken }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyData.success) {
          setIsLoading(false);
          setErrorMessage(
            "การตรวจสอบความปลอดภัยด้วย Cloudflare Turnstile ไม่ผ่าน กรุณาลองใหม่อีกครั้ง"
          );
          return;
        }
      } catch (err) {
        // Fallback gracefully on network error
      }
    }

    try {
      const config = getClientSynologyConfig();
      const targetUrl =
        config.nasUrl ||
        process.env.NEXT_PUBLIC_SYNOLOGY_NAS_URL ||
        "https://nas.smso.site";

      const attemptAuth = async (url: string) => {
        const res = await fetch("/api/nas/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: nasUsername.trim(),
            password: nasPassword,
            nasUrl: url,
          }),
        });
        return await safeParseJsonResponse(res);
      };

      let data = await attemptAuth(targetUrl);

      // Auto fallback to LAN IP if Cloudflare Tunnel domain is offline (Error 1033 / 530)
      if (!data.success && (data.code === 1033 || targetUrl.includes("nas.smso.site"))) {
        const lanUrl = "http://192.168.162.21:5000";
        if (targetUrl !== lanUrl) {
          try {
            const lanData = await attemptAuth(lanUrl);
            if (lanData && (lanData.success || (lanData.code && lanData.code !== 1033))) {
              data = lanData;
              saveClientSynologyConfig({ nasUrl: lanUrl });
            }
          } catch {}
        }
      }

      setIsLoading(false);

      if (data.success && data.user) {
        // Find exact match in official directory or use mapped member
        const cleanUserLower = nasUsername.toLowerCase().trim();
        const match = availableMembers.find((m) => {
          if (m.id === data.user.id) return true;
          const emailUser = m.email.toLowerCase().split("@")[0];
          if (emailUser === cleanUserLower) return true;
          if (m.name.toLowerCase() === cleanUserLower) return true;
          if (m.firstName.toLowerCase() === cleanUserLower) return true;
          return false;
        });
        const memberToLogin = match || data.user;
        if (data.sid) {
          setUserNasSid(data.sid, data.account || nasUsername.trim());
        }
        onLogin(memberToLogin, rememberMe);
        return;
      }

      const rawErr = data.error || "ไม่สามารถยืนยันตัวตนได้ กรุณาตรวจสอบชื่อผู้ใช้หรือรหัสผ่าน";
      setErrorMessage(
        rawErr
          .replace(/https?:\/\/[^\s]+/g, "เซิร์ฟเวอร์")
          .replace(/Synology(\s*NAS)?/gi, "ระบบฐานข้อมูล")
      );
    } catch (err: any) {
      setIsLoading(false);
      const msg = err?.message || "การเชื่อมต่อขัดข้อง";
      setErrorMessage(
        `เกิดข้อผิดพลาดในการเชื่อมต่อระบบฐานข้อมูล: ${msg
          .replace(/https?:\/\/[^\s]+/g, "เซิร์ฟเวอร์")
          .replace(/Synology(\s*NAS)?/gi, "ระบบฐานข้อมูล")}`
      );
    }
  };

  // ─── REAL SUPABASE SIGN IN ───
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setMatchedDirectoryUser(null);
    setIsLoading(true);

    // Verify Cloudflare Turnstile token if available
    if (turnstileToken) {
      try {
        const verifyRes = await fetch("/api/auth/turnstile/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: turnstileToken }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyData.success) {
          setIsLoading(false);
          setErrorMessage(
            "การตรวจสอบความปลอดภัยด้วย Cloudflare Turnstile ไม่ผ่าน กรุณาลองใหม่อีกครั้ง"
          );
          return;
        }
      } catch (err) {
        // Fallback gracefully on network error
      }
    }

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

    // Save to local cache & Supabase via centralized service
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
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#4F46E5] to-[#818CF8] flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/30">
            MSO
          </div>
          <div>
            <span className="text-2xl font-black text-white font-heading tracking-tight block leading-tight">
              Smart MSO
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
            <span>· Database Auth Live</span>
          </div>

          <h1 className="text-3xl lg:text-5xl font-black font-heading text-white leading-tight">
            เชื่อมต่อการทำงาน ทุกที่ ทุกเวลา ด้วยความปลอดภัยระดับองค์กร
          </h1>

          <p className="text-slate-300 text-sm lg:text-base leading-relaxed">
            ระบบสื่อสาร วางแผนงานกระดาน Kanban จัดการห้องประชุม และจองรถยนต์ส่วนกลาง
            พร้อมระบบยืนยันตัวตน On-Premise ผ่าน <strong>Database Auth</strong> และการควบคุมสิทธิ์ RBAC 4 ระดับบทบาท
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-2 gap-4 pt-3">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <div className="text-2xl mb-1.5">🔐</div>
              <div className="font-bold text-sm text-white">Database Auth</div>
              <div className="text-xs text-slate-400 mt-0.5">ระบบยืนยันตัวตน On-Premise</div>
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
            <span>© 2026 Smart MSO.</span>
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
            Database Auth Live
          </span>
        </div>
      </div>

      {/* ─── RIGHT LOGIN & AUTH FORM ─── */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-14 bg-[#F8FAFC] text-slate-800">
        <div className="w-full max-w-md space-y-5">
          {/* Header & Status Indicator */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <span className={`w-2 h-2 rounded-full ${nasOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                <span>Database Auth {nasOnline ? "(Online)" : "(Standby)"}</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                SSL 256-Bit Encrypted
              </span>
            </div>

            <h2 className="text-2xl lg:text-3xl font-black font-heading text-slate-900">
              เข้าสู่ระบบสำนักงานเสมือน
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              ยืนยันตัวตนด้วยบัญชีและรหัสผ่านประจำสำนักงาน พมจ.กำแพงเพชร
            </p>
          </div>

          {/* Active Authentication System Indicator */}
          <div className="p-3 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5 text-indigo-950 font-semibold">
              <span className="text-base">🔐</span>
              <div>
                <div className="font-bold text-slate-800">ระบบยืนยันตัวตนหลัก: Database Auth</div>
                <div className="text-[11px] text-indigo-600 font-normal">ระบบอื่นปิดไว้ชั่วคราว เพื่อรอการพัฒนาให้สมบูรณ์</div>
              </div>
            </div>
            <span className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-md shadow-2xs shrink-0">
              ใช้งานอยู่
            </span>
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

          {/* ─── EXCLUSIVE DATABASE AUTH FORM ─── */}
          <form onSubmit={handleNasSubmit} className="space-y-4">
            {/* Connection Status Badge */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/90 border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    nasOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                  }`}
                />
                <span className="font-bold text-slate-800">
                  {nasOnline ? "Database Auth พร้อมใช้งาน" : "Database Auth ไม่ตอบสนอง"}
                </span>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-md border font-semibold text-[11px] flex items-center gap-1.5 ${
                  nasOnline
                    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                    : "text-rose-700 bg-rose-50 border-rose-200"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    nasOnline ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
                <span>{nasOnline ? "ออนไลน์ (Online)" : "ออฟไลน์ (Offline)"}</span>
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ชื่อบัญชีผู้ใช้งาน (Username)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="ระบุชื่อบัญชีผู้ใช้งาน"
                  value={nasUsername}
                  onChange={(e) => setNasUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 transition-all font-mono"
                />
                <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">👤</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  รหัสผ่าน (Password)
                </label>
                <span className="text-[11px] text-slate-400 font-mono">Database Auth</span>
              </div>
              <div className="relative">
                <input
                  type={showNasPassword ? "text" : "password"}
                  required
                  placeholder="ระบุรหัสผ่านบัญชีผู้ใช้งาน"
                  value={nasPassword}
                  onChange={(e) => setNasPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 transition-all"
                />
                <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">🔒</span>
                <button
                  type="button"
                  onClick={() => setShowNasPassword(!showNasPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-medium cursor-pointer"
                  title={showNasPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {showNasPassword ? "🙈" : "👁️"}
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
              <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                <span>🛡️</span> On-Premise Auth
              </span>
            </div>

            {/* Cloudflare Turnstile Bot Protection */}
            <TurnstileWidget
              onVerify={(tok) => setTurnstileToken(tok)}
              onExpire={() => setTurnstileToken(null)}
            />

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-slate-900 via-indigo-900 to-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/25 hover:opacity-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>กำลังตรวจสอบข้อมูลและยืนยันตัวตน...</span>
                </>
              ) : (
                <span>เข้าสู่ระบบ ➜</span>
              )}
            </button>
          </form>

          {/* Development Status Notice */}
          <div className="pt-2 text-center text-xs text-slate-400 space-y-1">
            <p className="text-[11px] text-slate-500 font-medium">
              * ระบบล็อกอินอื่น (Email, Google SSO, LINE SSO) ปิดชั่วคราวเพื่อรอการพัฒนาให้สมบูรณ์
            </p>
            <p className="text-[10px] text-slate-400">
              ติดต่อผู้ดูแลระบบเครือข่าย พมจ.กำแพงเพชร หากต้องการจัดการสิทธิ์บัญชีผู้ใช้งาน
            </p>
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
            <span>v2.4 Live (Database Auth)</span>
          </div>
        </div>
      </div>

      {/* ─── LINE LOGIN MODAL / SETUP & DEMO ─── */}
      {showLineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in text-slate-800 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[calc(100vh-2rem)] md:max-h-[90vh] flex flex-col">
            <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
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

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs space-y-2.5 text-emerald-950">
                <div className="font-bold flex items-center justify-between text-emerald-800">
                  <div className="flex items-center gap-1.5">
                    <span>💡</span>
                    <span>สถานะการเชื่อมต่อ LINE Login:</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                    Channel ID: 1656002115
                  </span>
                </div>
                
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  ระบบตรวจพบ <strong>NEXT_PUBLIC_LINE_CHANNEL_ID</strong> ในระบบแล้ว! เพื่อให้ LINE อนุญาตการเชื่อมต่อ กรุณาตรวจสอบ <strong>Callback URL</strong> ใน <a href="https://developers.line.biz" target="_blank" rel="noreferrer" className="text-emerald-700 underline font-semibold">LINE Developers Console</a> ให้ตรงกับ:
                </p>

                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-600">สำหรับทดสอบบนเครื่อง (Localhost):</div>
                  <div className="font-mono bg-white px-2 py-1 rounded border border-emerald-200 text-[10px] select-all break-all text-emerald-800">
                    http://localhost:3000
                  </div>
                  <div className="text-[10px] font-bold text-slate-600">สำหรับใช้งานบน Production (Vercel):</div>
                  <div className="font-mono bg-white px-2 py-1 rounded border border-emerald-200 text-[10px] select-all break-all text-emerald-800">
                    https://virtual-office-ten-chi.vercel.app
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 pt-1 border-t border-emerald-200/50">
                  <span className="font-bold text-slate-700">คำแนะนำ:</span> ใน LINE Developers Console &gt; Basic settings &gt; Channel secret หากนำมาระบุใน <code className="bg-emerald-100/80 px-1 py-0.5 rounded text-[10px]">LINE_CHANNEL_SECRET</code> ระบบจะดึงรูปโปรไฟล์และชื่อจริงอัตโนมัติ
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowLineModal(false);
                    handleOAuthLogin("line");
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-bold shadow-md shadow-[#06C755]/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span>💬 ดำเนินการเข้าสู่ระบบผ่าน LINE OAuth ➜</span>
                </button>


                <button
                  type="button"
                  onClick={() => setShowLineModal(false)}
                  className="w-full py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-medium cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 my-auto max-h-[calc(100vh-2rem)] md:max-h-[90vh] flex flex-col">
            <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800 my-auto max-h-[calc(100vh-2rem)] md:max-h-[90vh] flex flex-col">
            {/* Header - Fixed */}
            <div className="p-5 md:px-6 md:pt-6 md:pb-4 border-b border-slate-100 flex items-center justify-between shrink-0">
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
              <div className="p-6 overflow-y-auto flex-1">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold space-y-1">
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                    <span>✓</span>
                    <span>ส่งคำขอสำเร็จเรียบร้อย!</span>
                  </div>
                  <div>ผู้ดูแลระบบ (Admin) จะตรวจสอบและอนุมัติสิทธิ์ พร้อมแจ้งผลทางอีเมล</div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRequestAccessSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                {/* Scrollable Form Fields */}
                <div className="overflow-y-auto flex-1 p-5 md:p-6 space-y-3">
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
                </div>

                {/* Footer - Fixed */}
                <div className="flex items-center gap-3 p-4 md:px-6 border-t border-slate-100 bg-slate-50/80 shrink-0">
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
      )}
    </div>
  );
}
