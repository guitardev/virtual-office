"use client";

import React, { useState, useEffect } from "react";
import {
  Member,
  Role,
  ModuleId,
  TaskItem,
  MeetingItem,
  CircularDocument,
  CarBookingRequest,
  Vehicle,
} from "@/lib/types";
import { ROLE_CONFIG, MODULE_NAMES } from "@/lib/rbac";
import { loadStoredVehicles } from "@/lib/carbooking-data";

function getTimeGreeting(): { text: string; icon: string } {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return { text: "สวัสดีตอนเช้า", icon: "🌅" };
  } else if (hour >= 12 && hour < 13) {
    return { text: "สวัสดีตอนเที่ยง", icon: "☀️" };
  } else if (hour >= 13 && hour < 17) {
    return { text: "สวัสดีตอนบ่าย", icon: "🌤️" };
  } else if (hour >= 17 && hour < 21) {
    return { text: "สวัสดีตอนเย็น", icon: "🌇" };
  } else {
    return { text: "สวัสดีตอนค่ำ", icon: "🌙" };
  }
}

interface DashboardPageProps {
  currentUser: Member;
  currentUserRole: Role;
  canAccess: (moduleId: ModuleId) => boolean;
  setCurrentPage: (page: ModuleId) => void;
  tasks: TaskItem[];
  meetings: MeetingItem[];
  members: Member[];
  toggleTaskStatus: (id: string | number) => void;
  showToast: (msg: string) => void;
  rolePermissions: Record<Role, Record<ModuleId, boolean>>;
  circularDocs?: CircularDocument[];
  carBookings?: CarBookingRequest[];
  onOpenCircularDoc?: (docId: string) => void;
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
  circularDocs = [],
  carBookings = [],
  onOpenCircularDoc,
}: DashboardPageProps) {
  const [greeting, setGreeting] = useState<{ text: string; icon: string }>(() => getTimeGreeting());
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => loadStoredVehicles());
  const [taskFilter, setTaskFilter] = useState<"urgent" | "my" | "all">("urgent");

  useEffect(() => {
    setGreeting(getTimeGreeting());
    setVehicles(loadStoredVehicles());
    const interval = setInterval(() => {
      setGreeting(getTimeGreeting());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // ─── Real Dynamic Calculations ───
  // 1. User's assigned tasks
  const myTasks = tasks.filter((t) => {
    const namePart = currentUser.firstName || currentUser.name?.split(" ")[1] || currentUser.name;
    return (
      t.assigneeId === currentUser.id ||
      (currentUser.name && t.assignee?.includes(currentUser.name)) ||
      (namePart && t.assignee?.includes(namePart))
    );
  });
  const myPendingTasks = myTasks.filter((t) => t.status !== "done");
  const myUrgentTasks = myPendingTasks.filter((t) => t.priority === "high");

  // 2. Urgent / pending tasks in system
  const systemUrgentTasks = tasks.filter((t) => t.priority === "high" && t.status !== "done");
  const pendingTasksCount = tasks.filter((t) => t.status !== "done").length;

  // 3. Circular Documents pending current user's signature
  const pendingSignDocs = circularDocs.filter((doc) =>
    doc.recipients?.some((r) => r.memberId === currentUser.id && !r.isAcknowledged)
  );

  // 4. Upcoming meetings today
  const sortedMeetings = [...meetings].sort((a, b) => (a.timeStr || "").localeCompare(b.timeStr || ""));
  const nextMeeting = sortedMeetings[0];

  // 5. Vehicles status
  const availableVehicles = vehicles.filter((v) => v.status === "available");
  const activeBookings = carBookings.filter(
    (b) => b.status === "approved" || b.status === "endorsed" || b.status === "pending_review"
  );

  // 6. Filtered tasks to display
  const displayedTasks =
    taskFilter === "urgent"
      ? tasks.filter((t) => t.priority === "high" && t.status !== "done")
      : taskFilter === "my"
      ? myTasks.filter((t) => t.status !== "done")
      : tasks.slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ─── Welcome Hero Banner (Dynamic Data Briefing) ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#4F46E5] via-[#4338CA] to-[#0D9488] p-7 md:p-9 text-white shadow-xl shadow-indigo-600/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-indigo-100 mb-3 border border-white/20">
              <span>✨ ระบบสำนักงานอัจฉริยะ (Smart MSO)</span>
              <span>· สิทธิ์ของคุณ: {ROLE_CONFIG[currentUserRole].label}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold font-heading text-white flex items-center gap-2 flex-wrap">
              <span>{greeting.text}, {currentUser.name}</span>
              <span>{greeting.icon}</span>
            </h1>

            {/* Dynamic Real Data Briefing */}
            <div className="text-indigo-100 text-sm mt-2 max-w-2xl leading-relaxed flex flex-wrap items-center gap-x-2 gap-y-1">
              {pendingSignDocs.length > 0 || myUrgentTasks.length > 0 || nextMeeting ? (
                <>
                  <span>วันนี้คุณมี</span>
                  {myUrgentTasks.length > 0 ? (
                    <span className="font-bold underline text-amber-200">
                      {myUrgentTasks.length} งานเร่งด่วน
                    </span>
                  ) : myPendingTasks.length > 0 ? (
                    <span className="font-semibold text-indigo-100">
                      งานค้าง {myPendingTasks.length} งาน
                    </span>
                  ) : null}

                  {pendingSignDocs.length > 0 && (
                    <>
                      {(myUrgentTasks.length > 0 || myPendingTasks.length > 0) && <span>และ</span>}
                      <button
                        type="button"
                        onClick={() => {
                          if (pendingSignDocs[0] && onOpenCircularDoc) {
                            onOpenCircularDoc(pendingSignDocs[0].id);
                          } else {
                            setCurrentPage("circular");
                          }
                        }}
                        className="font-bold underline text-rose-200 hover:text-white transition-colors cursor-pointer text-left"
                      >
                        หนังสือเวียนรอลงนาม {pendingSignDocs.length} ฉบับ
                      </button>
                    </>
                  )}

                  {nextMeeting && (
                    <>
                      <span className="text-indigo-300">·</span>
                      <span>
                        นัดหมายถัดไป: <strong className="text-white">{nextMeeting.title}</strong>{" "}
                        ({nextMeeting.timeStr})
                      </span>
                    </>
                  )}
                </>
              ) : (
                <span className="text-emerald-100 flex items-center gap-1.5">
                  <span>✨</span>
                  <span>ภารกิจของท่านเรียบร้อยดี ไม่มีงานค้างเร่งด่วนในขณะนี้ พร้อมสำหรับการปฏิบัติราชการ</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {canAccess("circular") && pendingSignDocs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (pendingSignDocs[0] && onOpenCircularDoc) {
                    onOpenCircularDoc(pendingSignDocs[0].id);
                  } else {
                    setCurrentPage("circular");
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs md:text-sm font-bold shadow-md transition-colors animate-pulse flex items-center gap-2"
              >
                <span>✍️</span>
                <span>ลงนามหนังสือเวียน ({pendingSignDocs.length})</span>
              </button>
            )}
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
                ⚙️ จัดการระบบ
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── 5 Overview Stat Widgets (All Real Live Data) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Stat 1: Tasks */}
        <div
          onClick={() => canAccess("task") && setCurrentPage("task")}
          className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center space-x-4 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl shrink-0 border border-indigo-100 dark:border-indigo-800 group-hover:scale-105 transition-transform">
            📋
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold font-heading text-slate-900 dark:text-slate-100 truncate">
              {tasks.length} งาน
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              ค้างส่ง {pendingTasksCount} รายการ
            </div>
          </div>
        </div>

        {/* Stat 2: Circular Documents */}
        <div
          onClick={() => canAccess("circular") && setCurrentPage("circular")}
          className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center space-x-4 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center text-2xl shrink-0 border border-rose-100 dark:border-rose-800 group-hover:scale-105 transition-transform">
            📜
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold font-heading text-slate-900 dark:text-slate-100 truncate flex items-center gap-2">
              <span>{circularDocs.length} ฉบับ</span>
              {pendingSignDocs.length > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping inline-block" />
              )}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
              {pendingSignDocs.length > 0 ? (
                <span className="text-rose-600 dark:text-rose-400 font-bold">รอคุณลงนาม {pendingSignDocs.length} ฉบับ</span>
              ) : (
                "หนังสือเวียนราชการ"
              )}
            </div>
          </div>
        </div>

        {/* Stat 3: Meetings */}
        <div
          onClick={() => canAccess("meetings") && setCurrentPage("meetings")}
          className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center space-x-4 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center text-2xl shrink-0 border border-teal-100 dark:border-teal-800 group-hover:scale-105 transition-transform">
            📹
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold font-heading text-slate-900 dark:text-slate-100 truncate">
              {meetings.length} นัดหมาย
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">การประชุมวันนี้</div>
          </div>
        </div>

        {/* Stat 4: Vehicles */}
        <div
          onClick={() => canAccess("carbooking") && setCurrentPage("carbooking")}
          className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center space-x-4 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center text-2xl shrink-0 border border-amber-100 dark:border-amber-800 group-hover:scale-105 transition-transform">
            🚗
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold font-heading text-slate-900 dark:text-slate-100 truncate">
              {availableVehicles.length} / {vehicles.length} คัน
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">รถยนต์พร้อมใช้งาน</div>
          </div>
        </div>

        {/* Stat 5: Members */}
        <div
          onClick={() => canAccess("user") && setCurrentPage("user")}
          className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs flex items-center space-x-4 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl shrink-0 border border-emerald-100 dark:border-emerald-800 group-hover:scale-105 transition-transform">
            👥
          </div>
          <div className="min-w-0">
            <div className="text-xl font-bold font-heading text-slate-900 dark:text-slate-100 truncate">
              {members.length} คน
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">สมาชิกในองค์กร</div>
          </div>
        </div>
      </div>

      {/* ─── Main 2-Column Content Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left 2 Cols: Circulars, Urgent Tasks & Meetings ─── */}
        <div className="lg:col-span-2 space-y-6">

          {/* 1. Live Circular Documents Section (หนังสือเวียนราชการล่าสุด) */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold font-heading text-slate-900 dark:text-slate-100">
                    หนังสือเวียนราชการล่าสุด & สถานะการรับทราบ
                  </h2>
                  {pendingSignDocs.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                      รอคุณลงนาม {pendingSignDocs.length} ฉบับ
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  ระบบสารบรรณอิเล็กทรอนิกส์และลงนามรับทราบออนไลน์ (Smart MSO)
                </p>
              </div>
              {canAccess("circular") && (
                <button
                  type="button"
                  onClick={() => setCurrentPage("circular")}
                  className="text-[#4F46E5] dark:text-indigo-400 text-sm font-semibold hover:underline self-start sm:self-auto"
                >
                  เปิดดูทั้งหมด ({circularDocs.length}) →
                </button>
              )}
            </div>

            {circularDocs.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-700">
                <div className="text-3xl mb-2">📜</div>
                <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  ยังไม่มีหนังสือเวียนราชการในระบบ
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  เมื่อมีการออกหนังสือเวียนใหม่จากกระทรวง พม. หรือกลุ่มงาน จะแสดงรายการให้ลงนามที่นี่ทันที
                </p>
                {canAccess("circular") && (
                  <button
                    type="button"
                    onClick={() => setCurrentPage("circular")}
                    className="mt-3 px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
                  >
                    เข้าสู่ระบบหนังสือเวียน
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {circularDocs.slice(0, 3).map((doc) => {
                  const isPendingMySignature = doc.recipients?.some(
                    (r) => r.memberId === currentUser.id && !r.isAcknowledged
                  );
                  const isAcknowledgedByMe = doc.recipients?.some(
                    (r) => r.memberId === currentUser.id && r.isAcknowledged
                  );

                  return (
                    <div
                      key={doc.id}
                      onClick={() => {
                        if (onOpenCircularDoc) {
                          onOpenCircularDoc(doc.id);
                        } else {
                          setCurrentPage("circular");
                        }
                      }}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all cursor-pointer gap-3 ${
                        isPendingMySignature
                          ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 hover:bg-rose-100/70"
                          : "bg-slate-50 dark:bg-slate-750/50 border-slate-200/70 dark:border-slate-700 hover:bg-slate-100/80 dark:hover:bg-slate-700"
                      }`}
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Urgency Pill */}
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                              doc.urgency === "most_urgent"
                                ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                : doc.urgency === "very_urgent"
                                ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                                : doc.urgency === "urgent"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {doc.urgency === "most_urgent"
                              ? "🚨 ด่วนที่สุด"
                              : doc.urgency === "very_urgent"
                              ? "⚡ ด่วนมาก"
                              : doc.urgency === "urgent"
                              ? "⚡ ด่วน"
                              : "📄 ปกติ"}
                          </span>
                          <span className="font-mono text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                            {doc.docNumber}
                          </span>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">
                            {doc.senderOrg || "สป.พม."}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 line-clamp-1">
                          {doc.title}
                        </h3>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                          <span>ลงวันที่: {doc.issuedDate || doc.createdAt}</span>
                          <span>·</span>
                          <span>
                            ลงนามแล้ว {doc.acknowledgedCount || 0} / {doc.totalCount || doc.recipients?.length || 0} คน
                          </span>
                        </div>
                      </div>

                      {/* Action Pill */}
                      <div className="shrink-0 flex items-center gap-2">
                        {isPendingMySignature ? (
                          <span className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold shadow-xs hover:bg-rose-700 transition-colors flex items-center gap-1.5">
                            <span>✍️</span>
                            <span>เปิดอ่านและลงนาม</span>
                          </span>
                        ) : isAcknowledgedByMe ? (
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
                            ✅ รับทราบแล้ว
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-semibold border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100">
                            เปิดดูเอกสาร →
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Priority Tasks Section (งานเร่งด่วนที่ต้องทำ) */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold font-heading text-slate-900 dark:text-slate-100">
                  ภารกิจและงานมอบหมาย (Tasks)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  คลิกที่เครื่องหมายเพื่อสลับสถานะของงานได้ทันที
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setTaskFilter("urgent")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    taskFilter === "urgent"
                      ? "bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                >
                  🔥 เร่งด่วน ({systemUrgentTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter("my")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    taskFilter === "my"
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                >
                  👤 งานของฉัน ({myPendingTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter("all")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    taskFilter === "all"
                      ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                  }`}
                >
                  ทั้งหมด ({tasks.length})
                </button>
              </div>
            </div>

            {displayedTasks.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-700">
                <div className="text-3xl mb-2">🎉</div>
                <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  {taskFilter === "urgent"
                    ? "ไม่มีงานเร่งด่วนค้างส่งในขณะนี้"
                    : taskFilter === "my"
                    ? "ท่านไม่มีงานค้างส่งในระบบ"
                    : "ยังไม่มีงานในระบบ"}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  ทุกภารกิจดำเนินการเสร็จสิ้นเรียบร้อยแล้ว หรือไม่มีงานที่ต้องส่งมอบด่วน
                </p>
                {canAccess("task") && (
                  <button
                    type="button"
                    onClick={() => setCurrentPage("task")}
                    className="mt-3 px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
                  >
                    + มอบหมายงานใหม่
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {displayedTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => toggleTaskStatus(task.id)}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-750/50 border border-slate-200/70 dark:border-slate-700 hover:bg-slate-100/80 dark:hover:bg-slate-700 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                      <span className="text-xl shrink-0">
                        {task.status === "done" ? "✅" : task.status === "review" ? "🔍" : task.status === "in_progress" ? "🔄" : "📝"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div
                          className={`font-semibold text-sm truncate ${
                            task.status === "done"
                              ? "line-through text-slate-400 dark:text-slate-500"
                              : "text-slate-800 dark:text-slate-200"
                          }`}
                        >
                          {task.title}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="font-medium text-indigo-600 dark:text-indigo-400">{task.dept}</span>
                          <span>·</span>
                          <span>{task.due}</span>
                          <span>·</span>
                          <span>ผู้รับผิดชอบ: {task.assignee}</span>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ml-3 ${
                        task.priority === "high"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                          : task.priority === "medium"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                      }`}
                    >
                      {task.priority === "high" ? "🔥 สูง" : task.priority === "medium" ? "🟡 กลาง" : "🟢 ต่ำ"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Today's Meetings (กำหนดการประชุมวันนี้) */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold font-heading text-slate-900 dark:text-slate-100">
                  กำหนดการประชุมวันนี้ (Today's Meetings)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  การประชุมออนไลน์และห้องประชุมสำนักงาน พมจ.
                </p>
              </div>
              {canAccess("meetings") && (
                <button
                  type="button"
                  onClick={() => setCurrentPage("meetings")}
                  className="text-[#4F46E5] dark:text-indigo-400 text-sm font-semibold hover:underline"
                >
                  เปิดปฏิทิน ({meetings.length}) →
                </button>
              )}
            </div>

            {meetings.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-700">
                <div className="text-3xl mb-2">📅</div>
                <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  ไม่มีกำหนดการประชุมในวันนี้
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  ท่านไม่มีนัดหมายการประชุมออนไลน์หรือในห้องประชุมวันนี้
                </p>
                {canAccess("meetings") && (
                  <button
                    type="button"
                    onClick={() => setCurrentPage("meetings")}
                    className="mt-3 px-3.5 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors shadow-xs"
                  >
                    + นัดหมายการประชุม
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {meetings.slice(0, 3).map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-750/50 border border-slate-200/70 dark:border-slate-700 gap-3 hover:bg-slate-100/80 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        <span>📅 {m.timeStr}</span>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800">
                          {m.location}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{m.title}</h3>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        ผู้เข้าร่วม:{" "}
                        {m.attendees?.map((a) => (typeof a === "string" ? a : a.name)).join(", ") ||
                          "ข้าราชการและเจ้าหน้าที่ พมจ."}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => showToast(`🎥 กำลังเชื่อมต่อไปยังห้องประชุม: ${m.title}`)}
                      className="px-4 py-2 bg-[#0D9488] hover:bg-[#0b7a6f] text-white rounded-xl text-xs font-bold transition-colors shrink-0 shadow-sm"
                    >
                      📹 เข้าร่วมทันที
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Right 1 Col: Fleet Status, RBAC Card & Team Presence ─── */}
        <div className="space-y-6">

          {/* 1. Fleet & Vehicle Status (ยานพาหนะและคำขอใช้รถ) */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold font-heading text-slate-900 dark:text-slate-100">
                  ยานพาหนะส่วนกลาง
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  พร้อมใช้งาน {availableVehicles.length} จาก {vehicles.length} คัน
                </p>
              </div>
              {canAccess("carbooking") && (
                <button
                  type="button"
                  onClick={() => setCurrentPage("carbooking")}
                  className="text-[#4F46E5] dark:text-indigo-400 text-xs font-semibold hover:underline"
                >
                  จองรถ →
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {vehicles.slice(0, 3).map((v) => (
                <div
                  key={v.id}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-750/50 border border-slate-200/70 dark:border-slate-700 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                      {v.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span>{v.driverName}</span>
                      <span>·</span>
                      <span>{v.fuelLevel}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      v.status === "available"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : v.status === "in_use"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {v.status === "available" ? "พร้อมใช้" : v.status === "in_use" ? "ติดภารกิจ" : "ซ่อมบำรุง"}
                  </span>
                </div>
              ))}
            </div>

            {activeBookings.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
                  คำขอจองล่าสุด ({activeBookings.length} รายการ):
                </div>
                <div className="text-xs text-slate-700 dark:text-slate-300 font-semibold truncate">
                  🚗 {activeBookings[0].destination} โดย {activeBookings[0].requesterName}
                </div>
              </div>
            )}
          </div>

          {/* 2. Current RBAC Status Card */}
          <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-750 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                🛡️ บทบาทและสิทธิ์ของคุณ
              </span>
              <span className="text-xl">{ROLE_CONFIG[currentUserRole].icon}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-heading">
              {ROLE_CONFIG[currentUserRole].label}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              {ROLE_CONFIG[currentUserRole].description}
            </p>
            <div className="mt-4 pt-3 border-t border-indigo-100/80 dark:border-slate-700 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">โมดูลที่เข้าถึงได้:</span>
              <span className="font-bold text-indigo-700 dark:text-indigo-400">
                {Object.values(rolePermissions[currentUserRole]).filter(Boolean).length} / {Object.keys(MODULE_NAMES).length} โมดูล
              </span>
            </div>
          </div>

          {/* 3. Team Presence */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold font-heading text-slate-900 dark:text-slate-100">
                เพื่อนร่วมงาน ({members.length})
              </h2>
              {canAccess("user") && (
                <button
                  type="button"
                  onClick={() => setCurrentPage("user")}
                  className="text-[#4F46E5] dark:text-indigo-400 text-xs font-semibold hover:underline"
                >
                  สมุดโทรศัพท์ →
                </button>
              )}
            </div>

            <div className="space-y-3">
              {members.slice(0, 5).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {m.avatarText || m.name?.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {m.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {m.position || m.department || m.division}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${ROLE_CONFIG[m.role].badgeColor}`}
                  >
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

