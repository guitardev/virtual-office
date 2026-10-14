"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Member, Role } from "@/lib/types";
import { ROLE_CONFIG, PERSONNEL_TYPE_CONFIG } from "@/lib/rbac";
import {
  ActiveSession,
  getActiveSessions,
  initCurrentSession,
  revokeSession,
  revokeAllOtherSessions,
  addSimulatedSession,
  listenSessionRevocation,
} from "@/lib/session";

interface UserPageProps {
  currentUser: Member;
  currentUserRole: Role;
  loginTime: string;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  handleOpenEditProfile: () => void;
  handleInitiateLogout: () => void;
  showToast: (msg: string) => void;
}

export function UserPage({
  currentUser,
  currentUserRole,
  loginTime,
  isDarkMode,
  setIsDarkMode,
  handleOpenEditProfile,
  handleInitiateLogout,
  showToast,
}: UserPageProps) {
  // Active Sessions state
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [showSimulateMenu, setShowSimulateMenu] = useState(false);

  const refreshSessions = useCallback(() => {
    if (!currentUser?.id) return;
    const list = getActiveSessions(currentUser.id);
    setSessions(list);
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;
    setIsLoadingSessions(true);
    initCurrentSession(currentUser.id, loginTime)
      .then(() => {
        refreshSessions();
        setIsLoadingSessions(false);
      })
      .catch(() => {
        refreshSessions();
        setIsLoadingSessions(false);
      });

    const cleanup = listenSessionRevocation(
      () => {}, // Global handling in app/page.tsx
      () => {
        refreshSessions();
      }
    );

    return () => cleanup();
  }, [currentUser?.id, loginTime, refreshSessions]);

  const handleRevokeSingle = (sessionId: string, deviceName: string) => {
    if (!currentUser?.id) return;
    const ok = window.confirm(
      `ต้องการยกเลิกเซสชันของอุปกรณ์ "${deviceName}" หรือไม่?\nอุปกรณ์ดังกล่าวจะถูกบังคับให้ออกจากระบบทันที`
    );
    if (!ok) return;

    revokeSession(currentUser.id, sessionId);
    refreshSessions();
    showToast(`🔒 ยกเลิกเซสชัน "${deviceName}" เรียบร้อยแล้ว`);
  };

  const handleRevokeAll = () => {
    if (!currentUser?.id) return;
    const otherCount = sessions.filter((s) => !s.isCurrent).length;
    if (otherCount === 0) {
      showToast("ℹ️ ไม่พบเซสชันอุปกรณ์อื่นที่เปิดใช้งานอยู่");
      return;
    }
    const ok = window.confirm(
      `ต้องการบังคับออกจากระบบทุกอุปกรณ์อื่น (${otherCount} อุปกรณ์) หรือไม่?\nเซสชันทั้งหมดจะถูกยกเลิกทันที ยกเว้นอุปกรณ์ปัจจุบัน`
    );
    if (!ok) return;

    revokeAllOtherSessions(currentUser.id);
    refreshSessions();
    showToast(`🔒 บังคับออกจากระบบอุปกรณ์อื่นทั้งหมด (${otherCount} อุปกรณ์) สำเร็จแล้ว`);
  };

  const handleAddSimulated = (
    preset: "iphone" | "ipad" | "macbook" | "android"
  ) => {
    if (!currentUser?.id) return;
    const added = addSimulatedSession(currentUser.id, preset);
    refreshSessions();
    setShowSimulateMenu(false);
    showToast(`📱 เพิ่มเซสชันจำลอง "${added.deviceName}" เพื่อทดสอบแล้ว`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-xs space-y-6">
        {/* Personnel Header Profile */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-5">
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-16 h-16 rounded-2xl object-cover border border-indigo-200 shrink-0 shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-[#4F46E5] text-2xl font-black flex items-center justify-center border border-indigo-200 shrink-0">
                {currentUser.avatarText}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-heading text-slate-900">{currentUser.name}</h2>
                {currentUser.nickname && (
                  <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                    ({currentUser.nickname})
                  </span>
                )}
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    (currentUser.personnelType &&
                      PERSONNEL_TYPE_CONFIG[currentUser.personnelType]?.badgeColor) ||
                    "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  {(currentUser.personnelType &&
                    PERSONNEL_TYPE_CONFIG[currentUser.personnelType]?.icon) ||
                    "👤"}{" "}
                  {currentUser.personnelType || "ยังไม่ระบุประเภทบุคลากร"}
                </span>
              </div>
              <p className="text-xs text-indigo-600 font-semibold mt-0.5">{currentUser.position || "รอกำหนดตำแหน่ง"}</p>
              <p className="text-xs text-slate-500 mt-0.5">{currentUser.division || "รอกำหนดกลุ่มงาน"}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenEditProfile}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span>✏️</span>
            <span>แก้ไขข้อมูลส่วนตัว</span>
          </button>
        </div>

        {/* Government Personnel Info Grid */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-heading text-slate-800">
              🏛️ ข้อมูลส่วนบุคคลข้าราชการและเจ้าหน้าที่รัฐ
            </h3>
            <span className="text-[11px] text-slate-400">OmniOffice Government Profile v1.0</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[11px] text-slate-400">คำนำหน้า</div>
              <div className="text-sm font-bold text-slate-800 mt-0.5">{currentUser.prefix || "-"}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[11px] text-slate-400">ชื่อ</div>
              <div className="text-sm font-bold text-slate-800 mt-0.5">
                {currentUser.firstName || currentUser.name.split(" ")[0]}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[11px] text-slate-400">นามสกุล</div>
              <div className="text-sm font-bold text-slate-800 mt-0.5">
                {currentUser.lastName || currentUser.name.split(" ").slice(1).join(" ") || "-"}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[11px] text-slate-400">ชื่อเล่น (Nickname)</div>
              <div className="text-sm font-bold text-indigo-700 mt-0.5">
                {currentUser.nickname ? `คุณ${currentUser.nickname}` : "-"}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[11px] text-slate-400">ประเภทบุคลากร</div>
              <div className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                <span>
                  {(currentUser.personnelType &&
                    PERSONNEL_TYPE_CONFIG[currentUser.personnelType]?.icon) ||
                    "🏛️"}
                </span>
                <span className="truncate">{currentUser.personnelType || "ข้าราชการ"}</span>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[11px] text-slate-400">บทบาทสิทธิ์ (RBAC)</div>
              <div className="text-sm font-bold text-indigo-600 mt-0.5 flex items-center gap-1">
                <span>{ROLE_CONFIG[currentUserRole].icon}</span>
                <span>{ROLE_CONFIG[currentUserRole].label.split(" ")[0]}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[11px] text-slate-400">ตำแหน่งงานราชการ</div>
              <div className="text-sm font-bold text-slate-800 mt-0.5">{currentUser.position}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[11px] text-slate-400">กลุ่ม/ฝ่าย (Division / Section)</div>
              <div className="text-sm font-bold text-slate-800 mt-0.5">{currentUser.division}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[11px] text-slate-400">อีเมลราชการ</div>
              <div className="text-xs font-bold text-indigo-600 mt-0.5 font-mono truncate">
                {currentUser.email}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[11px] text-slate-400">หมายเลขโทรศัพท์</div>
              <div className="text-sm font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                <span>📞</span>
                <span>{currentUser.phone || "02-612-6000"}</span>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[11px] text-slate-400">Line ID</div>
              <div className="text-sm font-bold text-emerald-700 mt-0.5 flex items-center gap-1 font-mono">
                <span>💬</span>
                <span>{currentUser.lineId || "-"}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold font-heading text-slate-800 mb-2">การตั้งค่าส่วนบุคคล</h3>
          <div className="space-y-2.5">
            <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100/60 transition-colors">
              <span className="text-sm font-medium text-slate-800">🔔 การแจ้งเตือนผ่านเบราว์เซอร์</span>
              <input type="checkbox" defaultChecked className="w-4 h-4 accent-[#4F46E5]" />
            </label>
            <label className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100/60 transition-colors">
              <span className="text-sm font-medium text-slate-800">🌙 โหมดกลางคืน (Dark Theme)</span>
              <input
                type="checkbox"
                checked={isDarkMode}
                onChange={(e) => setIsDarkMode(e.target.checked)}
                className="w-4 h-4 accent-[#4F46E5]"
              />
            </label>
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-sm font-medium text-slate-800">🌐 ภาษาที่แสดงผล</span>
              <span className="text-sm font-bold text-slate-800">🇹🇭 ภาษาไทย (TH)</span>
            </div>
          </div>
        </div>

        {/* Active Sessions & Security */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold font-heading text-slate-800">
                  🛡️ อุปกรณ์และเซสชันที่ใช้งานอยู่ (Active Sessions)
                </h3>
                <span className="text-[11px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  {sessions.length} เซสชัน
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ตรวจสอบอุปกรณ์และเบราว์เซอร์ที่เชื่อมต่อกับบัญชีของคุณแบบ Real-time
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  initCurrentSession(currentUser.id, loginTime).then(refreshSessions);
                  showToast("🔄 รีเฟรชสถานะเซสชันเรียบร้อยแล้ว");
                }}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1 cursor-pointer"
                title="รีเฟรชเซสชัน"
              >
                <span>🔄</span>
                <span>รีเฟรช</span>
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSimulateMenu(!showSimulateMenu)}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1 cursor-pointer"
                  title="จำลองเชื่อมต่อจากอุปกรณ์อื่นเพื่อทดสอบ"
                >
                  <span>➕</span>
                  <span>จำลองอุปกรณ์ทดสอบ</span>
                </button>
                {showSimulateMenu && (
                  <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-20 space-y-1 animate-fade-in">
                    <div className="text-[10px] font-bold text-slate-400 px-2 py-1">
                      เลือกอุปกรณ์เพื่อทดสอบเซสชัน:
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddSimulated("iphone")}
                      className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2 cursor-pointer"
                    >
                      <span>📱</span>
                      <span>iPhone 16 Pro (iOS 18)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddSimulated("ipad")}
                      className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2 cursor-pointer"
                    >
                      <span>📟</span>
                      <span>iPad Air M2 (iPadOS 18)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddSimulated("macbook")}
                      className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2 cursor-pointer"
                    >
                      <span>💻</span>
                      <span>MacBook Pro (macOS)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddSimulated("android")}
                      className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-100 text-slate-700 flex items-center gap-2 cursor-pointer"
                    >
                      <span>📱</span>
                      <span>Galaxy S24 (Android 14)</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {sessions.map((sess) => {
              const isCurrent = sess.isCurrent;
              const icon =
                sess.deviceType === "mobile"
                  ? "📱"
                  : sess.deviceType === "tablet"
                  ? "📟"
                  : "💻";

              return (
                <div
                  key={sess.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isCurrent
                      ? "bg-indigo-50/40 border-indigo-200/90 shadow-xs"
                      : "bg-slate-50 border-slate-200/80 opacity-90"
                  } flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <span className="text-3xl p-2 rounded-xl bg-white border border-slate-200/60 shadow-xs shrink-0">
                      {icon}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex flex-wrap items-center gap-1.5">
                        <span>{sess.deviceName}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shadow-xs">
                            อุปกรณ์ปัจจุบัน (Current Device)
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-mono bg-white px-1.5 py-0.2 rounded border border-slate-200">
                          {sess.screenResolution}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-mono text-slate-700 font-medium">
                          IP: {sess.ip}
                        </span>
                        <span>•</span>
                        <span>เข้าสู่ระบบ: {sess.loginTime}</span>
                        <span>•</span>
                        <span
                          className={
                            isCurrent
                              ? "text-emerald-600 font-semibold"
                              : "text-slate-500"
                          }
                        >
                          {isCurrent
                            ? "ใช้งานล่าสุด: กำลังออนไลน์อยู่ขณะนี้"
                            : `ใช้งานล่าสุด: ${sess.lastActive}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {isCurrent ? (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        ออนไลน์
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          handleRevokeSingle(sess.id, sess.deviceName)
                        }
                        className="px-3 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold border border-red-200 transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span>🔒</span>
                        <span>ยกเลิกเซสชัน</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action bar for other sessions */}
          {sessions.some((s) => !s.isCurrent) && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleRevokeAll}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>🚫</span>
                <span>
                  บังคับออกจากระบบทุกอุปกรณ์อื่น (
                  {sessions.filter((s) => !s.isCurrent).length} อุปกรณ์)
                </span>
              </button>
            </div>
          )}
        </div>

        <div className="pt-4 flex justify-between items-center border-t border-slate-100">
          <button
            type="button"
            onClick={() => showToast("🔑 ส่งลิงก์เปลี่ยนรหัสผ่านไปยังอีเมลของคุณแล้ว")}
            className="px-4 py-2 border border-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
          >
            เปลี่ยนรหัสผ่าน
          </button>
          <button
            type="button"
            onClick={handleInitiateLogout}
            className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>🚪</span>
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </div>
    </div>
  );
}
