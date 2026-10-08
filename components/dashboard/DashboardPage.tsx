"use client";

import React from "react";
import { Member, Role, ModuleId, TaskItem, MeetingItem } from "@/lib/types";
import { ROLE_CONFIG, MODULE_NAMES } from "@/lib/rbac";

interface DashboardPageProps {
  currentUser: Member;
  currentUserRole: Role;
  canAccess: (moduleId: ModuleId) => boolean;
  setCurrentPage: (page: ModuleId) => void;
  tasks: TaskItem[];
  meetings: MeetingItem[];
  members: Member[];
  toggleTaskStatus: (id: number) => void;
  showToast: (msg: string) => void;
  rolePermissions: Record<Role, Record<ModuleId, boolean>>;
}

export function DashboardPage({
  currentUser,
  currentUserRole,
  canAccess,
  setCurrentPage,
  tasks,
  meetings,
  members,
  toggleTaskStatus,
  showToast,
  rolePermissions,
}: DashboardPageProps) {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#4F46E5] via-[#4338CA] to-[#0D9488] p-7 md:p-9 text-white shadow-xl shadow-indigo-600/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-indigo-100 mb-3 border border-white/20">
              <span>✨ ระบบสิทธิ์ RBAC เปิดใช้งาน</span>
              <span>· สิทธิ์ของคุณ: {ROLE_CONFIG[currentUserRole].label}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold font-heading text-white">
              สวัสดีตอนเช้า, คุณ{currentUser.name} 👋
            </h1>
            <p className="text-indigo-100 text-sm mt-1.5 max-w-xl leading-relaxed">
              วันนี้คุณมี <span className="font-bold underline text-white">2 งานเร่งด่วน</span> ที่ต้องส่งมอบ และการประชุมสรุปแผนงานผลิตภัณฑ์ในเวลา 11:00 น.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {canAccess("task") && (
              <button
                type="button"
                onClick={() => setCurrentPage("task")}
                className="px-4 py-2.5 rounded-xl bg-white text-[#4F46E5] text-xs md:text-sm font-bold shadow-md hover:bg-indigo-50 transition-colors"
              >
                + เพิ่มงานใหม่
              </button>
            )}
            {canAccess("admin") && (
              <button
                type="button"
                onClick={() => setCurrentPage("admin")}
                className="px-4 py-2.5 rounded-xl bg-white/20 backdrop-blur-sm text-white text-xs md:text-sm font-bold border border-white/30 hover:bg-white/30 transition-colors"
              >
                ⚙️ จัดการสิทธิ์ RBAC
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4 Overview Stat Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl shrink-0 border border-indigo-100">
            📋
          </div>
          <div>
            <div className="text-2xl font-bold font-heading text-slate-900">{tasks.length} งาน</div>
            <div className="text-xs text-slate-500 font-medium">งานทั้งหมดในระบบ</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center text-2xl shrink-0 border border-teal-100">
            📹
          </div>
          <div>
            <div className="text-2xl font-bold font-heading text-slate-900">{meetings.length} นัดหมาย</div>
            <div className="text-xs text-slate-500 font-medium">การประชุมวันนี้</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl shrink-0 border border-amber-100">
            🚗
          </div>
          <div>
            <div className="text-2xl font-bold font-heading text-slate-900">3 คัน</div>
            <div className="text-xs text-slate-500 font-medium">รถยนต์พร้อมใช้งาน</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center space-x-4 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shrink-0 border border-emerald-100">
            👥
          </div>
          <div>
            <div className="text-2xl font-bold font-heading text-slate-900">{members.length} คน</div>
            <div className="text-xs text-slate-500 font-medium">สมาชิกในองค์กร</div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Urgent Tasks & Meetings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Urgent Tasks */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold font-heading text-slate-900">งานเร่งด่วนที่ต้องทำ (Priority Tasks)</h2>
                <p className="text-xs text-slate-500">คลิกที่ช่องเพื่อสลับสถานะของงานได้ทันที</p>
              </div>
              {canAccess("task") && (
                <button
                  type="button"
                  onClick={() => setCurrentPage("task")}
                  className="text-[#4F46E5] text-sm font-semibold hover:underline"
                >
                  ดูทั้งหมดใน Kanban →
                </button>
              )}
            </div>

            <div className="space-y-3">
              {tasks.slice(0, 4).map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTaskStatus(task.id)}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 hover:bg-slate-100/80 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center space-x-3.5">
                    <span className="text-xl">
                      {task.status === "done" ? "✅" : task.status === "in_progress" ? "🔄" : "📝"}
                    </span>
                    <div>
                      <div className={`font-semibold text-sm ${task.status === "done" ? "line-through text-slate-400" : "text-slate-800"}`}>
                        {task.title}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-medium text-indigo-600">{task.dept}</span>
                        <span>·</span>
                        <span>{task.due}</span>
                        <span>·</span>
                        <span>{task.assignee}</span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      task.priority === "high"
                        ? "bg-red-100 text-red-700"
                        : task.priority === "medium"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {task.priority === "high" ? "🔥 สูง" : task.priority === "medium" ? "🟡 กลาง" : "🟢 ต่ำ"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Meetings */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold font-heading text-slate-900">กำหนดการประชุมวันนี้ (Today's Meetings)</h2>
              {canAccess("meetings") && (
                <button
                  type="button"
                  onClick={() => setCurrentPage("meetings")}
                  className="text-[#4F46E5] text-sm font-semibold hover:underline"
                >
                  เปิดปฏิทิน →
                </button>
              )}
            </div>

            <div className="space-y-3">
              {meetings.slice(0, 2).map((m) => (
                <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200/70 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-600">
                      <span>📅 {m.timeStr}</span>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200">{m.location}</span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900">{m.title}</h3>
                    <div className="text-xs text-slate-500">ผู้เข้าร่วม: {m.attendees.join(", ")}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => showToast(`🎥 กำลังเชื่อมต่อไปยังห้องประชุม: ${m.title}`)}
                    className="px-4 py-2 bg-[#0D9488] text-white rounded-xl text-xs font-bold hover:bg-[#0b7a6f] transition-colors shrink-0 shadow-sm"
                  >
                    📹 เข้าร่วมทันที
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Team Presence & RBAC Summary */}
        <div className="space-y-6">
          {/* Current RBAC Status Card */}
          <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-2xl border border-indigo-100 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                🛡️ บทบาทและสิทธิ์ของคุณ
              </span>
              <span className="text-xl">{ROLE_CONFIG[currentUserRole].icon}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 font-heading">
              {ROLE_CONFIG[currentUserRole].label}
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {ROLE_CONFIG[currentUserRole].description}
            </p>
            <div className="mt-4 pt-3 border-t border-indigo-100/80 flex items-center justify-between text-xs">
              <span className="text-slate-500">โมดูลที่เข้าถึงได้:</span>
              <span className="font-bold text-indigo-700">
                {Object.values(rolePermissions[currentUserRole]).filter(Boolean).length} / {Object.keys(MODULE_NAMES).length} โมดูล
              </span>
            </div>
          </div>

          {/* Team Presence */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
            <h2 className="text-lg font-bold font-heading text-slate-900 mb-3">สถานะเพื่อนร่วมงาน (Team Presence)</h2>
            <div className="space-y-3">
              {members.slice(0, 4).map((m) => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold text-xs flex items-center justify-center">
                      {m.avatarText}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{m.name}</div>
                      <div className="text-[11px] text-slate-400">{m.department || m.division}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${ROLE_CONFIG[m.role].badgeColor}`}>
                    {ROLE_CONFIG[m.role].label.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
