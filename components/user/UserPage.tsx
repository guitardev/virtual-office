"use client";

import React from "react";
import { Member, Role } from "@/lib/types";
import { ROLE_CONFIG, PERSONNEL_TYPE_CONFIG } from "@/lib/rbac";

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
                    "bg-indigo-50 text-indigo-700 border-indigo-200"
                  }`}
                >
                  {(currentUser.personnelType &&
                    PERSONNEL_TYPE_CONFIG[currentUser.personnelType]?.icon) ||
                    "🏛️"}{" "}
                  {currentUser.personnelType || "ข้าราชการ"}
                </span>
              </div>
              <p className="text-xs text-indigo-600 font-semibold mt-0.5">{currentUser.position}</p>
              <p className="text-xs text-slate-500 mt-0.5">{currentUser.division}</p>
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
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-heading text-slate-800">
              🛡️ อุปกรณ์และเซสชันที่ใช้งานอยู่ (Active Sessions)
            </h3>
            <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              ● เชื่อมต่อปลอดภัย SSL
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💻</span>
                <div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Windows 11 · Google Chrome</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                      อุปกรณ์ปัจจุบัน
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    IP: 192.168.1.104 · เข้าสู่ระบบเมื่อ: {loginTime}
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                ออนไลน์
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between opacity-80">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📱</span>
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    iOS 18 · Safari Mobile (iPhone 15 Pro)
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    IP: 171.100.82.15 · ใช้งานล่าสุด: เมื่อวานนี้ 18:45 น.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => showToast("🔒 บังคับออกจากระบบอุปกรณ์อื่นสำเร็จแล้ว")}
                className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
              >
                ยกเลิกเซสชัน
              </button>
            </div>
          </div>
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
