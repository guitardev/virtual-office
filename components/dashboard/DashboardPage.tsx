"use client";

import React, { useState, useEffect, useMemo } from "react";
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
import { INITIAL_VEHICLES } from "@/lib/carbooking-data";
import { fetchVehicles, subscribeToVehicles } from "@/lib/supabase";
import {
  formatIsoDateOnly,
  formatThaiDateHeader,
  isMeetingActiveOnDate,
  getMeetingSpanInfo,
} from "@/lib/calendar";
import { MISSION_GROUPS } from "@/components/datahub/DataHubPage";
import { MODULE_TO_ROUTE } from "@/lib/navigation";

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
  onNavigate?: (route: string) => void;
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
  onNavigate,
}: DashboardPageProps) {
  const [greeting, setGreeting] = useState<{ text: string; icon: string }>(() => getTimeGreeting());
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => INITIAL_VEHICLES);
  const [taskFilter, setTaskFilter] = useState<"urgent" | "my" | "all">("urgent");

  // Navigation dispatcher that prefers onNavigate or falls back to setCurrentPage
  const navigateTo = (routeOrModule: string, fallbackModule?: ModuleId) => {
    if (onNavigate && routeOrModule.startsWith("/")) {
      onNavigate(routeOrModule);
    } else if (fallbackModule && canAccess(fallbackModule)) {
      setCurrentPage(fallbackModule);
    } else if (onNavigate) {
      onNavigate(routeOrModule);
    }
  };

  useEffect(() => {
    setGreeting(getTimeGreeting());
    fetchVehicles().then((liveVehicles) => {
      if (liveVehicles && liveVehicles.length > 0) setVehicles(liveVehicles);
    });
    const unsubVehicles = subscribeToVehicles((liveVehicles) => {
      if (liveVehicles && liveVehicles.length > 0) setVehicles(liveVehicles);
    });
    const interval = setInterval(() => {
      setGreeting(getTimeGreeting());
    }, 60000);
    return () => {
      clearInterval(interval);
      unsubVehicles();
    };
  }, []);

  // Today reference dates
  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => formatIsoDateOnly(today), [today]);
  const thaiDateHeader = useMemo(() => formatThaiDateHeader(today), [today]);

  // ─── Real Dynamic Calculations ───
  // 1. User's assigned tasks
  const myTasks = useMemo(() => {
    return tasks.filter((t) => {
      const namePart = currentUser.firstName || currentUser.name?.split(" ")[1] || currentUser.name;
      return (
        t.assigneeId === currentUser.id ||
        (currentUser.name && t.assignee?.includes(currentUser.name)) ||
        (namePart && t.assignee?.includes(namePart))
      );
    });
  }, [tasks, currentUser]);

  const myPendingTasks = useMemo(() => myTasks.filter((t) => t.status !== "done"), [myTasks]);
  const myUrgentTasks = useMemo(() => myPendingTasks.filter((t) => t.priority === "high"), [myPendingTasks]);

  // 2. Urgent / pending tasks in system
  const systemUrgentTasks = useMemo(() => tasks.filter((t) => t.priority === "high" && t.status !== "done"), [tasks]);
  const pendingTasksCount = useMemo(() => tasks.filter((t) => t.status !== "done").length, [tasks]);

  // Admin IDs set for statistics exclusion
  const adminMemberIds = useMemo(
    () => new Set(members.filter((m) => m.role === "admin").map((m) => m.id)),
    [members]
  );

  // 3. Circular Documents pending current user's signature (Exclude Admin users)
  const pendingSignDocs = useMemo(() => {
    return currentUserRole === "admin"
      ? []
      : circularDocs.filter((doc) =>
          doc.recipients?.some((r) => r.memberId === currentUser.id && !r.isAcknowledged)
        );
  }, [currentUserRole, circularDocs, currentUser.id]);

  // 4. Meetings Active Today (Handles single-day and multi-day continuous meetings)
  const todaysMeetings = useMemo(() => {
    return meetings
      .filter((m) => {
        if (m.status === "cancelled") return false;
        return isMeetingActiveOnDate(m, todayIso);
      })
      .sort((a, b) => (a.timeStr || "").localeCompare(b.timeStr || ""));
  }, [meetings, todayIso]);

  const nextMeeting = todaysMeetings[0] || meetings.find((m) => m.status !== "cancelled");

  // 5. Vehicles & Car Bookings Active Today
  const availableVehicles = useMemo(() => vehicles.filter((v) => v.status === "available"), [vehicles]);

  const todaysBookings = useMemo(() => {
    const parseIso = (dateVal?: string): string => {
      if (!dateVal) return "";
      try {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) return formatIsoDateOnly(d);
      } catch {}
      return "";
    };

    return carBookings.filter((b) => {
      if (b.status === "rejected") return false;
      const startIso = parseIso(b.departureTime);
      const endIso = parseIso(b.returnTime) || startIso;
      return startIso <= todayIso && endIso >= todayIso;
    });
  }, [carBookings, todayIso]);

  // 6. Filtered tasks to display
  const displayedTasks = useMemo(() => {
    if (taskFilter === "urgent") {
      return tasks.filter((t) => t.priority === "high" && t.status !== "done");
    } else if (taskFilter === "my") {
      return myTasks.filter((t) => t.status !== "done");
    }
    return tasks.slice(0, 5);
  }, [taskFilter, tasks, myTasks]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* ─── 1. Welcome Hero Banner (Executive Briefing & Daily Status) ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#4F46E5] via-[#4338CA] to-[#0D9488] p-7 md:p-9 text-white shadow-xl shadow-indigo-600/10">
        {/* Subtle decorative background circles */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 rounded-full bg-teal-400/10 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-indigo-100 border border-white/20">
                <span>🏛️ สนง.พมจ.กำแพงเพชร</span>
                <span>·</span>
                <span>สิทธิ์: {ROLE_CONFIG[currentUserRole].label}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/15 backdrop-blur-md text-xs font-medium text-emerald-200 border border-white/10">
                <span>📅 {thaiDateHeader}</span>
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold font-heading text-white flex items-center gap-2 flex-wrap">
              <span>{greeting.text}, {currentUser.name}</span>
              <span className="text-2xl">{greeting.icon}</span>
            </h1>

            {/* Dynamic Real Data Briefing */}
            <div className="text-indigo-100 text-xs md:text-sm mt-2 max-w-3xl leading-relaxed flex flex-wrap items-center gap-x-2 gap-y-1.5">
              {pendingSignDocs.length > 0 || myUrgentTasks.length > 0 || nextMeeting ? (
                <>
                  <span className="font-medium text-white/90">สรุปวาระประจำวัน:</span>
                  {pendingSignDocs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (pendingSignDocs[0] && onOpenCircularDoc) {
                          onOpenCircularDoc(pendingSignDocs[0].id);
                        } else {
                          navigateTo("/circular", "circular");
                        }
                      }}
                      className="inline-flex items-center gap-1 font-bold text-rose-200 hover:text-white bg-rose-500/30 px-2 py-0.5 rounded-lg border border-rose-300/40 transition-colors cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping inline-block" />
                      <span>ลงนามหนังสือเวียน {pendingSignDocs.length} ฉบับ</span>
                    </button>
                  )}

                  {myUrgentTasks.length > 0 && (
                    <span className="inline-flex items-center gap-1 font-bold text-amber-200 bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-300/30">
                      <span>🔥 งานเร่งด่วน {myUrgentTasks.length} งาน</span>
                    </span>
                  )}

                  {nextMeeting && (
                    <span className="inline-flex items-center gap-1 text-teal-100 bg-teal-500/20 px-2 py-0.5 rounded-lg border border-teal-300/30">
                      <span>📹 นัดหมาย: <b>{nextMeeting.title}</b> ({nextMeeting.timeStr})</span>
                    </span>
                  )}
                </>
              ) : (
                <span className="text-emerald-100 flex items-center gap-1.5 font-medium">
                  <span>✨</span>
                  <span>ภารกิจของท่านเรียบร้อยดี ไม่มีงานค้างเร่งด่วน พร้อมสำหรับการปฏิบัติราชการวันนี้</span>
                </span>
              )}
            </div>
          </div>

          {/* Quick Action Button Group */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 lg:pt-0">
            {canAccess("circular") && pendingSignDocs.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (pendingSignDocs[0] && onOpenCircularDoc) {
                    onOpenCircularDoc(pendingSignDocs[0].id);
                  } else {
                    navigateTo("/circular", "circular");
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs md:text-sm font-bold shadow-lg shadow-rose-900/30 transition-all hover:scale-102 flex items-center gap-2 cursor-pointer"
              >
                <span>✍️</span>
                <span>ลงนามหนังสือเวียน ({pendingSignDocs.length})</span>
              </button>
            )}

            {canAccess("carbooking") && (
              <button
                type="button"
                onClick={() => navigateTo("/carbooking", "carbooking")}
                className="px-3.5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs md:text-sm font-bold border border-white/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>🚗</span>
                <span>ขอใช้รถราชการ</span>
              </button>
            )}

            {canAccess("meetings") && (
              <button
                type="button"
                onClick={() => navigateTo("/meetings", "meetings")}
                className="px-3.5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs md:text-sm font-bold border border-white/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>📹</span>
                <span>จองห้องประชุม</span>
              </button>
            )}

            {canAccess("task") && (
              <button
                type="button"
                onClick={() => navigateTo("/tasks", "task")}
                className="px-4 py-2.5 rounded-xl bg-white text-[#4F46E5] text-xs md:text-sm font-bold shadow-md hover:bg-indigo-50 transition-all hover:scale-102 cursor-pointer"
              >
                + เพิ่มงานใหม่
              </button>
            )}

            {canAccess("admin") && (
              <button
                type="button"
                onClick={() => navigateTo("/admin", "admin")}
                className="px-3 py-2.5 rounded-xl bg-black/20 hover:bg-black/30 backdrop-blur-sm text-white text-xs md:text-sm font-bold border border-white/20 transition-all cursor-pointer"
                title="เข้าสู่หน้าจัดการระบบ"
              >
                ⚙️
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── 2. Digital Services Portal (ศูนย์รวมบริการด่วน 6 ระบบหลัก One-Click Launcher) ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚀</span>
            <div>
              <h2 className="text-base font-bold font-heading text-slate-900 dark:text-slate-100 leading-tight">
                ศูนย์บริการสำนักงานดิจิทัล (Smart MSO Quick Services)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                เข้าถึงระบบงานอิเล็กทรอนิกส์หลักของสำนักงาน พมจ. ได้ทันทีใน 1 คลิก
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Service 1: Data Hub (ระบบรวมข้อมูล) */}
          <div
            onClick={() => navigateTo("/data-hub", "datahub")}
            className="group p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs hover:shadow-md hover:border-amber-400 transition-all cursor-pointer flex flex-col justify-between space-y-3"
          >
            <div className="flex items-start justify-between">
              <span className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform border border-amber-200/60 dark:border-amber-800">
                🗃️
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/70">
                4 กลุ่มงาน
              </span>
            </div>
            <div>
              <div className="font-bold text-xs md:text-sm text-slate-900 dark:text-slate-100 group-hover:text-amber-600 transition-colors">
                ระบบรวมข้อมูล
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                ตัวชี้วัด & คลังแบบฟอร์ม
              </p>
            </div>
          </div>

          {/* Service 2: Car Booking (รถยนต์ราชการ) */}
          <div
            onClick={() => navigateTo("/carbooking", "carbooking")}
            className="group p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs hover:shadow-md hover:border-indigo-400 transition-all cursor-pointer flex flex-col justify-between space-y-3"
          >
            <div className="flex items-start justify-between">
              <span className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform border border-indigo-200/60 dark:border-indigo-800">
                🚗
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70">
                {availableVehicles.length} พร้อมใช้
              </span>
            </div>
            <div>
              <div className="font-bold text-xs md:text-sm text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                รถยนต์ราชการ
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                จองรถ & ปฏิทินภารกิจ
              </p>
            </div>
          </div>

          {/* Service 3: Meetings & Rooms (การประชุมและห้องประชุม) */}
          <div
            onClick={() => navigateTo("/meetings", "meetings")}
            className="group p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs hover:shadow-md hover:border-teal-400 transition-all cursor-pointer flex flex-col justify-between space-y-3"
          >
            <div className="flex items-start justify-between">
              <span className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform border border-teal-200/60 dark:border-teal-800">
                📹
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/70">
                {todaysMeetings.length} นัดหมาย
              </span>
            </div>
            <div>
              <div className="font-bold text-xs md:text-sm text-slate-900 dark:text-slate-100 group-hover:text-teal-600 transition-colors">
                การประชุม & นัดหมาย
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                ผังห้อง & หลายวันต่อเนื่อง
              </p>
            </div>
          </div>

          {/* Service 4: Circular Documents (หนังสือเวียนราชการ) */}
          <div
            onClick={() => navigateTo("/circular", "circular")}
            className="group p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs hover:shadow-md hover:border-rose-400 transition-all cursor-pointer flex flex-col justify-between space-y-3"
          >
            <div className="flex items-start justify-between">
              <span className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform border border-rose-200/60 dark:border-rose-800">
                📜
              </span>
              {pendingSignDocs.length > 0 ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500 text-white animate-pulse">
                  ลงนาม ({pendingSignDocs.length})
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {circularDocs.length} ฉบับ
                </span>
              )}
            </div>
            <div>
              <div className="font-bold text-xs md:text-sm text-slate-900 dark:text-slate-100 group-hover:text-rose-600 transition-colors">
                หนังสือเวียน
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                สารบรรณ & ลงนาม e-Sign
              </p>
            </div>
          </div>

          {/* Service 5: Smart Tools (เครื่องมือดิจิทัล QR / BG Remove) */}
          <div
            onClick={() => navigateTo("/tools/qrcode", "qrcode")}
            className="group p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs hover:shadow-md hover:border-purple-400 transition-all cursor-pointer flex flex-col justify-between space-y-3"
          >
            <div className="flex items-start justify-between">
              <span className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform border border-purple-200/60 dark:border-purple-800">
                🛠️
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/70">
                QR & BG
              </span>
            </div>
            <div>
              <div className="font-bold text-xs md:text-sm text-slate-900 dark:text-slate-100 group-hover:text-purple-600 transition-colors">
                เครื่องมือ & Tools
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                QR Code ถาวร & ตัดพื้นหลัง
              </p>
            </div>
          </div>

          {/* Service 6: NAS Documents & Photos (คลังเอกสาร & ภาพถ่าย) */}
          <div
            onClick={() => navigateTo("/files", "files")}
            className="group p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-2xs hover:shadow-md hover:border-cyan-400 transition-all cursor-pointer flex flex-col justify-between space-y-3"
          >
            <div className="flex items-start justify-between">
              <span className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform border border-cyan-200/60 dark:border-cyan-800">
                📁
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200/70">
                Synology
              </span>
            </div>
            <div>
              <div className="font-bold text-xs md:text-sm text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 transition-colors">
                คลังเอกสาร & ภาพ
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                จัดเก็บไฟล์ & คลังภาพถ่าย
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. Live Executive KPI & Stat Cards ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Stat 1: Tasks */}
        <div
          onClick={() => navigateTo("/tasks", "task")}
          className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">📋</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
              ค้างส่ง {pendingTasksCount}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl font-extrabold font-heading text-slate-900 dark:text-slate-100">
              {tasks.length} งาน
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
              ด่วน {systemUrgentTasks.length} รายการ
            </div>
          </div>
        </div>

        {/* Stat 2: Circulars */}
        <div
          onClick={() => navigateTo("/circular", "circular")}
          className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">📜</span>
            {pendingSignDocs.length > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            )}
          </div>
          <div className="mt-3">
            <div className="text-xl font-extrabold font-heading text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>{circularDocs.length} ฉบับ</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
              {currentUserRole === "admin" ? (
                <span>
                  หนังสือเวียน (ไม่คิดสถิติ Admin)
                  <span className="sr-only"> หนังสือเวียนราชการ</span>
                </span>
              ) : pendingSignDocs.length > 0 ? (
                <span className="text-rose-600 dark:text-rose-400 font-bold">รอคุณลงนาม {pendingSignDocs.length} ฉบับ</span>
              ) : (
                "หนังสือเวียนราชการ"
              )}
            </div>
          </div>
        </div>

        {/* Stat 3: Meetings */}
        <div
          onClick={() => navigateTo("/meetings", "meetings")}
          className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">📹</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
              วันนี้ {todaysMeetings.length}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl font-extrabold font-heading text-slate-900 dark:text-slate-100">
              {meetings.length} นัดหมาย
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
              การประชุมวันนี้ ({todaysMeetings.length})
            </div>
          </div>
        </div>

        {/* Stat 4: Vehicles */}
        <div
          onClick={() => navigateTo("/carbooking", "carbooking")}
          className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">🚗</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              ว่าง {availableVehicles.length}
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl font-extrabold font-heading text-slate-900 dark:text-slate-100">
              {availableVehicles.length} / {vehicles.length} คัน
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
              รถยนต์พร้อมใช้งาน (เดินทาง {todaysBookings.length})
            </div>
          </div>
        </div>

        {/* Stat 5: Mission Groups (Data Hub) */}
        <div
          onClick={() => navigateTo("/data-hub", "datahub")}
          className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">🏛️</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
              KPI 94.2%
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl font-extrabold font-heading text-slate-900 dark:text-slate-100">
              4 กลุ่มภารกิจ
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
              คลังข้อมูล & ตัวชี้วัด
            </div>
          </div>
        </div>

        {/* Stat 6: Members */}
        <div
          onClick={() => navigateTo("/user", "user")}
          className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">👥</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
              พมจ.กพ
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl font-extrabold font-heading text-slate-900 dark:text-slate-100">
              {members.length} บุคลากร
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
              สมาชิกในองค์กร
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4. Main 2-Column Content Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left 2 Cols: Schedule, Fleet Dispatches, Tasks & Circulars ─── */}
        <div className="lg:col-span-2 space-y-6">

          {/* 1. Today's Meetings & Rooms (กำหนดการประชุมและห้องประชุมวันนี้) */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📹</span>
                  <h2 className="text-base font-bold font-heading text-slate-900 dark:text-slate-100">
                    กำหนดการประชุมและห้องประชุมวันนี้
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
                    {todaysMeetings.length} นัดหมาย
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ตารางประชุมออนไซต์ ห้องประชุมสำนักงาน พมจ. และการประชุมออนไลน์ Google Meet
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                {canAccess("meetings") && (
                  <button
                    type="button"
                    onClick={() => navigateTo("/meetings", "meetings")}
                    className="text-[#4F46E5] dark:text-indigo-400 text-xs font-bold hover:underline"
                  >
                    เปิดปฏิทิน ({meetings.length}) →
                  </button>
                )}
              </div>
            </div>

            {todaysMeetings.length === 0 ? (
              <div className="py-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                <span className="text-3xl block">🌿</span>
                <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  ไม่มีกำหนดการประชุมในวันนี้
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  ห้องประชุมทุกห้องพร้อมให้บริการ สามารถจองห้องประชุมหรือสร้างการประชุมออนไลน์ได้ทันที
                </p>
                {canAccess("meetings") && (
                  <button
                    type="button"
                    onClick={() => navigateTo("/meetings", "meetings")}
                    className="mt-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    + จองห้องประชุม / สร้างนัดหมาย
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {todaysMeetings.map((m) => {
                  const span = getMeetingSpanInfo(m, todayIso);
                  const isOnline = m.type === "online";
                  const isHybrid = m.type === "hybrid";

                  return (
                    <div
                      key={m.id}
                      onClick={() => navigateTo("/meetings", "meetings")}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-750/50 border border-slate-200/70 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-slate-100/70 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          {/* Time badge */}
                          <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-lg border border-indigo-200/80 dark:border-indigo-800">
                            ⏰ {m.timeStr}
                          </span>

                          {/* Multi-day Badge */}
                          {span.isMultiDay && (
                            <span className="font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/80 text-[11px] flex items-center gap-1">
                              <span>🗓️</span>
                              <span>
                                วันที่ {span.dayIndex}/{span.totalDays} ({span.position === "first_day" ? "วันแรก" : span.position === "last_day" ? "วันสุดท้าย" : "ต่อเนื่อง"})
                              </span>
                            </span>
                          )}

                          {/* Type badge */}
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {isOnline ? "🌐 ออนไลน์" : isHybrid ? "🔄 ไฮบริด" : "🏛️ ใน สนง."}
                          </span>
                        </div>

                        <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                          {m.title}
                        </h3>

                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                          <span>📍 {m.location}</span>
                          {m.organizer && (
                            <>
                              <span>·</span>
                              <span>ผู้จัด: {m.organizer.name}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="shrink-0 flex items-center gap-2">
                        {m.meetingLink ? (
                          <a
                            href={m.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                          >
                            <span>📹</span>
                            <span>เข้าประชุม Meet</span>
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => navigateTo("/meetings", "meetings")}
                            className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800 transition-colors"
                          >
                            ดูรายละเอียด ›
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Today's Fleet Dispatch (ภารกิจการใช้รถยนต์ราชการวันนี้) */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🚗</span>
                  <h2 className="text-base font-bold font-heading text-slate-900 dark:text-slate-100">
                    ภารกิจการใช้ยานพาหนะส่วนกลางวันนี้
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                    เดินทาง {todaysBookings.length} คัน
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ผังจัดสรรรถยนต์ส่วนกลาง พนักงานขับรถ และสถานะภารกิจเดินทางไปราชการ
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                {canAccess("carbooking") && (
                  <button
                    type="button"
                    onClick={() => navigateTo("/carbooking", "carbooking")}
                    className="text-[#4F46E5] dark:text-indigo-400 text-xs font-bold hover:underline"
                  >
                    ปฏิทินใช้รถ ({carBookings.length}) →
                  </button>
                )}
              </div>
            </div>

            {todaysBookings.length === 0 ? (
              <div className="py-6 px-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✨</span>
                  <div>
                    <span className="font-bold text-emerald-900 dark:text-emerald-200 block text-sm">
                      ยานพาหนะทุกคันพร้อมใช้งาน ณ สำนักงาน
                    </span>
                    <span className="text-emerald-700 dark:text-emerald-300">
                      ไม่มีภารกิจเดินทางไปราชการในวันนี้ รถยนต์ราชการว่าง {availableVehicles.length} จาก {vehicles.length} คัน
                    </span>
                  </div>
                </div>
                {canAccess("carbooking") && (
                  <button
                    type="button"
                    onClick={() => navigateTo("/carbooking", "carbooking")}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
                  >
                    + ยื่นขอใช้รถยนต์
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {todaysBookings.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => navigateTo("/carbooking", "carbooking")}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-750/50 border border-slate-200/70 dark:border-slate-700 hover:border-indigo-300 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap text-xs font-bold">
                        <span className="text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-100">
                          {b.licensePlate || b.vehicleName}
                        </span>
                        <span className="text-slate-500">·</span>
                        <span className="text-slate-700 dark:text-slate-300">
                          📍 ปลายทาง: {b.destination}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                        ภารกิจ: {b.purpose}
                      </h4>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                        <span>👤 ผู้ขอ: {b.requesterName}</span>
                        <span>·</span>
                        <span>คนขับ: {b.assignedDriver || "พนักงานขับรถ สนง."}</span>
                        <span>·</span>
                        <span className="font-mono">เวลาออก: {b.departureTime?.slice(11, 16) || "ช่วงเช้า"} น.</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200">
                        🟡 ติดภารกิจเดินทาง
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Live Circular Documents Section (หนังสือเวียนราชการล่าสุด) */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📜</span>
                  <h2 className="text-base font-bold font-heading text-slate-900 dark:text-slate-100">
                    หนังสือเวียนราชการล่าสุด & สถานะการรับทราบ
                  </h2>
                  {pendingSignDocs.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                      รอคุณลงนาม {pendingSignDocs.length} ฉบับ
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ระบบสารบรรณอิเล็กทรอนิกส์และลงนามรับทราบออนไลน์ (Smart MSO e-Signature)
                </p>
              </div>
              {canAccess("circular") && (
                <button
                  type="button"
                  onClick={() => navigateTo("/circular", "circular")}
                  className="text-[#4F46E5] dark:text-indigo-400 text-xs font-bold hover:underline self-start sm:self-auto"
                >
                  เปิดดูทั้งหมด ({circularDocs.length}) →
                </button>
              )}
            </div>

            {circularDocs.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-700">
                <div className="text-3xl mb-2">📜</div>
                <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  ยังไม่มีหนังสือเวียนราชการในระบบ
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  เมื่อมีการออกหนังสือเวียนใหม่จากกระทรวง พม. หรือกลุ่มงาน จะแสดงรายการให้ลงนามที่นี่ทันที
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {circularDocs.slice(0, 3).map((doc) => {
                  const isPendingMySignature =
                    currentUserRole !== "admin" &&
                    doc.recipients?.some(
                      (r) => r.memberId === currentUser.id && !r.isAcknowledged
                    );
                  const isAcknowledgedByMe =
                    currentUserRole !== "admin" &&
                    doc.recipients?.some(
                      (r) => r.memberId === currentUser.id && r.isAcknowledged
                    );

                  const nonAdminRecipients = (doc.recipients || []).filter((r) => !adminMemberIds.has(r.memberId));
                  const nonAdminAckCount = nonAdminRecipients.filter((r) => r.isAcknowledged).length;

                  return (
                    <div
                      key={doc.id}
                      onClick={() => {
                        if (onOpenCircularDoc) {
                          onOpenCircularDoc(doc.id);
                        } else {
                          navigateTo("/circular", "circular");
                        }
                      }}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer gap-3 ${
                        isPendingMySignature
                          ? "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 hover:bg-rose-100/70"
                          : "bg-slate-50 dark:bg-slate-750/50 border-slate-200/70 dark:border-slate-700 hover:bg-slate-100/80 dark:hover:bg-slate-700"
                      }`}
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
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
                            ลงนามแล้ว {nonAdminAckCount} / {nonAdminRecipients.length} คน
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
                            {currentUserRole === "admin" ? "เปิดดูเอกสาร (Admin) →" : "เปิดดูเอกสาร →"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. Priority Tasks Section (ภารกิจและงานมอบหมาย) */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📋</span>
                  <h2 className="text-base font-bold font-heading text-slate-900 dark:text-slate-100">
                    ภารกิจและงานมอบหมาย (Tasks)
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  คลิกที่เครื่องหมายสถานะเพื่ออัปเดตงานได้ทันที
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setTaskFilter("urgent")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
              <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-200 dark:border-slate-700">
                <div className="text-3xl mb-2">🎉</div>
                <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                  {taskFilter === "urgent"
                    ? "ไม่มีงานเร่งด่วนค้างส่งในขณะนี้"
                    : taskFilter === "my"
                    ? "ท่านไม่มีงานค้างส่งในระบบ"
                    : "ยังไม่มีงานในระบบ"}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  ทุกภารกิจดำเนินการเสร็จสิ้นเรียบร้อยแล้ว
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => toggleTaskStatus(task.id)}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-750/50 border border-slate-200/70 dark:border-slate-700 hover:bg-slate-100/80 dark:hover:bg-slate-700 transition-colors cursor-pointer group"
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
                          <span>กำหนดส่ง: {task.due}</span>
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
        </div>

        {/* ─── Right 1 Col: 4 Mission Groups, Tools Spotlight, RBAC & Colleagues ─── */}
        <div className="space-y-6">

          {/* 1. Four Mission Groups of KPP-MSOC (ศูนย์ข้อมูล 4 กลุ่มภารกิจหลัก) */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-sm font-bold font-heading text-slate-900 dark:text-slate-100">
                  🏛️ 4 กลุ่มภารกิจ พมจ.
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  โครงสร้างภารกิจงาน สนง.พมจ.กำแพงเพชร
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigateTo("/data-hub", "datahub")}
                className="text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline"
              >
                คลังข้อมูล →
              </button>
            </div>

            <div className="space-y-2.5">
              {MISSION_GROUPS.map((group) => (
                <div
                  key={group.id}
                  onClick={() => navigateTo("/data-hub", "datahub")}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer hover:shadow-2xs ${group.bgColor} dark:bg-slate-750/60 ${group.borderColor} dark:border-slate-700`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{group.icon}</span>
                      <span className={`text-xs font-bold ${group.color} dark:text-slate-200`}>
                        {group.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                      {group.metrics[0]?.value || "ข้อมูล"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1 mt-1">
                    {group.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Smart Tools Spotlight (เครื่องมือดิจิทัลด่วน) */}
          <div className="bg-gradient-to-br from-purple-50/60 to-indigo-50/40 dark:from-slate-800 dark:to-slate-750 p-5 rounded-3xl border border-purple-200/70 dark:border-purple-900/50 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                <span>🛠️</span>
                <span>เครื่องมือดิจิทัลราชการ</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                พร้อมใช้
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => navigateTo("/tools/qrcode", "qrcode")}
                className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-purple-200/60 dark:border-slate-700 text-left hover:border-purple-400 transition-all shadow-2xs cursor-pointer group"
              >
                <span className="text-xl block group-hover:scale-110 transition-transform">📱</span>
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block mt-1">
                  QR Code
                </span>
                <span className="text-[10px] text-slate-400 block">ถาวร 100% ไม่มีหมดอายุ</span>
              </button>

              <button
                type="button"
                onClick={() => navigateTo("/tools/bgremove", "bgremove")}
                className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-purple-200/60 dark:border-slate-700 text-left hover:border-purple-400 transition-all shadow-2xs cursor-pointer group"
              >
                <span className="text-xl block group-hover:scale-110 transition-transform">✂️</span>
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block mt-1">
                  BG Remove
                </span>
                <span className="text-[10px] text-slate-400 block">รูปติดบัตรข้าราชการ</span>
              </button>
            </div>
          </div>

          {/* 3. Current RBAC Status Card */}
          <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-750 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/50 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                🛡️ บทบาทและสิทธิ์ของคุณ
              </span>
              <span className="text-xl">{ROLE_CONFIG[currentUserRole].icon}</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 font-heading">
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

          {/* 4. Team Presence / Colleagues Directory */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-sm font-bold font-heading text-slate-900 dark:text-slate-100">
                  👥 เพื่อนร่วมงาน ({members.length})
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  ทำเนียบบุคลากร สนง.พมจ.กำแพงเพชร
                </p>
              </div>
              {canAccess("user") && (
                <button
                  type="button"
                  onClick={() => navigateTo("/user", "user")}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  สมุดโทรศัพท์ →
                </button>
              )}
            </div>

            <div className="space-y-2.5">
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
