"use client";

import React from "react";
import { Role, ModuleId, SystemModule } from "@/lib/types";
import { ROLE_CONFIG } from "@/lib/rbac";

interface MatrixTabProps {
  systemModules: Record<ModuleId, SystemModule>;
  rolePermissions: Record<Role, Record<ModuleId, boolean>>;
  handleToggleModuleStatus: (modId: ModuleId) => void;
  handleOpenEditModule: (modId: ModuleId) => void;
  handleTogglePermission: (role: Role, moduleId: ModuleId) => void;
}

export function MatrixTab({
  systemModules,
  rolePermissions,
  handleToggleModuleStatus,
  handleOpenEditModule,
  handleTogglePermission,
}: MatrixTabProps) {
  return (
    <div className="space-y-6">
      {/* Banner & Overview */}
      <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">🛡️</span>
          <div className="text-xs leading-relaxed text-indigo-900">
            <span className="font-bold block text-sm mb-0.5">
              ศูนย์ควบคุมสิทธิ์ & สถานะโมดูล (Module Lifecycle & RBAC Matrix)
            </span>
            ผู้ดูแลระบบสามารถ <strong>เปิด/ปิด โมดูลระบบ</strong> (เช่น ปิดปรับปรุงชั่วคราว), <strong>แก้ไขรายละเอียดโมดูล</strong>, และ <strong>ติ๊กเปิด/ปิด สิทธิ์รายบทบาท</strong> ได้แบบเรียลไทม์
          </div>
        </div>
        <span className="px-3 py-1 rounded-xl bg-white border border-indigo-200 text-indigo-700 text-xs font-bold shrink-0 hidden sm:inline-block shadow-2xs">
          ⚡ อัปเดตทันที (Live RBAC)
        </span>
      </div>

      {/* SYSTEM-WIDE MODULE STATUS CARDS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold font-heading text-slate-900 flex items-center gap-2">
            <span>🎛️ การเปิด/ปิด และจัดการโมดูลระดับระบบ (System Module Controls)</span>
            <span className="text-[11px] font-normal text-slate-500">
              (เปิดใช้งาน {Object.values(systemModules).filter((m) => m.enabled).length}/8 โมดูล)
            </span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(Object.keys(systemModules) as ModuleId[]).map((modId) => {
            const mod = systemModules[modId];
            const isLocked = modId === "admin";
            return (
              <div
                key={modId}
                className={`p-4 rounded-2xl border transition-all ${
                  mod.enabled
                    ? "bg-white border-slate-200/90 shadow-xs hover:border-indigo-300"
                    : "bg-amber-50/40 border-amber-200/80 shadow-xs"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-2xl">{mod.icon}</span>
                    <div>
                      <div className="font-bold text-xs text-slate-900 leading-tight truncate max-w-[120px]">
                        {mod.name.split(" (")[0]}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{mod.id}</div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                      mod.enabled
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-red-50 text-red-700 border-red-200"
                    }`}
                  >
                    {mod.enabled ? "● เปิดใช้" : "⛔ ปิดปรับปรุง"}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 line-clamp-2 h-8 mb-3 leading-relaxed">
                  {mod.desc}
                </p>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleModuleStatus(modId)}
                    disabled={isLocked}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      mod.enabled
                        ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                    }`}
                    title={isLocked ? "ไม่สามารถปิดโมดูล Admin Panel ได้" : "คลิกเพื่อสลับสถานะเปิด/ปิด"}
                  >
                    <span>{mod.enabled ? "⛔ ปิดโมดูล" : "🟢 เปิดโมดูล"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEditModule(modId)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    title="แก้ไขชื่อและรายละเอียดโมดูล"
                  >
                    <span>✏️</span>
                    <span>แก้ไข</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* GRANULAR RBAC MATRIX TABLE */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-bold font-heading text-slate-900 flex items-center gap-2">
          <span>🔒 ตารางกำหนดสิทธิ์รายบทบาท (Granular Role Permissions)</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 text-xs uppercase bg-slate-50">
                <th className="py-3.5 px-4 font-bold text-slate-700">โมดูลการทำงาน</th>
                <th className="py-3.5 px-4 font-bold text-slate-700 text-center">สถานะระบบ</th>
                {(["admin", "manager", "member", "guest"] as Role[]).map((r) => (
                  <th key={r} className="py-3.5 px-4 text-center font-bold">
                    <div className="flex items-center justify-center gap-1.5">
                      <span>{ROLE_CONFIG[r].icon}</span>
                      <span>{ROLE_CONFIG[r].label.split(" ")[0]}</span>
                    </div>
                  </th>
                ))}
                <th className="py-3.5 px-4 font-bold text-slate-700 text-center">ตั้งค่าโมดูล</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(Object.keys(systemModules) as ModuleId[]).map((modId) => {
                const mod = systemModules[modId];
                return (
                  <tr key={modId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-xl">{mod.icon}</span>
                        <div>
                          <div className="font-bold text-slate-900">{mod.name}</div>
                          <div className="text-[11px] text-slate-500">{mod.desc}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleModuleStatus(modId)}
                        disabled={modId === "admin"}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                          mod.enabled
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                        }`}
                      >
                        {mod.enabled ? "🟢 เปิดใช้งาน" : "⛔ ปิดปรับปรุง"}
                      </button>
                    </td>
                    {(["admin", "manager", "member", "guest"] as Role[]).map((r) => {
                      const allowed = rolePermissions[r]?.[modId];
                      const isLockedAdmin = r === "admin" && (modId === "admin" || modId === "dashboard");
                      return (
                        <td key={r} className="py-3.5 px-4 text-center">
                          <label className="inline-flex items-center justify-center cursor-pointer p-2 rounded-xl hover:bg-slate-100 transition-colors">
                            <input
                              type="checkbox"
                              checked={allowed}
                              disabled={isLockedAdmin}
                              onChange={() => handleTogglePermission(r, modId)}
                              className="w-5 h-5 accent-[#4F46E5] rounded cursor-pointer disabled:opacity-50"
                            />
                          </label>
                        </td>
                      );
                    })}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModule(modId)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                        title="แก้ไขข้อมูลโมดูล"
                      >
                        ✏️ แก้ไข
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
