"use client";

import React, { useMemo } from "react";
import { TaskItem, MeetingItem, Member, CarBookingRequest } from "@/lib/types";

interface ReportsPageProps {
  showToast: (msg: string) => void;
  tasks?: TaskItem[];
  meetings?: MeetingItem[];
  members?: Member[];
  bookings?: CarBookingRequest[];
}

export function ReportsPage({
  showToast,
  tasks = [],
  meetings = [],
  members = [],
  bookings = [],
}: ReportsPageProps) {
  // Calculated live statistics from Supabase data
  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((t) => t.status === "done").length;
    const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
    const reviewTasks = tasks.filter((t) => t.status === "review").length;
    const todoTasks = tasks.filter((t) => t.status === "todo").length;
    const taskRate = totalTasks > 0 ? ((doneTasks / totalTasks) * 100).toFixed(1) : "0.0";

    const totalMeetings = meetings.length;
    const onlineMeetings = meetings.filter((m) => m.type === "online").length;

    const totalBookings = bookings.length;
    const completedBookings = bookings.filter((b) => b.status === "completed").length;
    const approvedBookings = bookings.filter((b) => b.status === "approved").length;
    const totalFuelBudget = bookings.reduce((sum, b) => sum + (b.fuelBudgetAmount || 0), 0);

    return {
      totalTasks,
      doneTasks,
      inProgressTasks,
      todoTasks,
      taskRate,
      totalMeetings,
      onlineMeetings,
      totalBookings,
      completedBookings,
      approvedBookings,
      totalFuelBudget,
    };
  }, [tasks, meetings, bookings]);

  const handleExportCSV = () => {
    const headers = ["ID", "ประเภท", "หัวข้อ", "สถานะ", "ผู้รับผิดชอบ/ผู้ขอ"];
    const taskRows = tasks.map((t) => [`TASK-${t.id}`, "ภารกิจ", `"${t.title}"`, t.status, `"${t.assignee}"`]);
    const bookingRows = bookings.map((b) => [b.requestNo, "ขอใช้รถราชการ", `"${b.purpose}"`, b.status, `"${b.requesterName}"`]);
    const meetingRows = meetings.map((m) => [`MTG-${m.id}`, "การประชุม", `"${m.title}"`, m.type, `"เจ้าหน้าที่ พมจ."`]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...taskRows.map((r) => r.join(",")), ...bookingRows.map((r) => r.join(",")), ...meetingRows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Smart_MSO_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("📊 ส่งออกรายงาน CSV สดจาก Supabase เรียบร้อยแล้ว");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-heading text-slate-900">
              รายงานและสถิติ (Reports & Analytics)
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              🟢 Live Computed
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            ข้อมูลสรุปผลการดำเนินงานและสถิติทรัพยากร คำนวณสดจาก Supabase PostgreSQL
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>📊</span>
            <span>ส่งออก CSV (สตง.)</span>
          </button>
          <button
            type="button"
            onClick={() => showToast("📥 กำลังจัดทำรายงาน PDF สรุปประจำเดือน...")}
            className="px-4 py-2.5 bg-[#4F46E5] text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-600/25 hover:bg-[#4338CA] transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>📑</span>
            <span>ส่งออก PDF</span>
          </button>
        </div>
      </div>

      {/* 4 Live Summary Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">อัตราความสำเร็จของงาน</div>
          <div className="text-3xl font-bold font-heading text-emerald-600 mt-1 font-mono">
            {stats.taskRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            เสร็จแล้ว {stats.doneTasks} จากทั้งหมด {stats.totalTasks} งาน
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">การประชุม & นัดหมาย</div>
          <div className="text-3xl font-bold font-heading text-[#4F46E5] mt-1 font-mono">
            {stats.totalMeetings} รายการ
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            ออนไลน์ {stats.onlineMeetings} · ออนไซต์ {stats.totalMeetings - stats.onlineMeetings}
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">การขอใช้รถราชการ</div>
          <div className="text-3xl font-bold font-heading text-amber-600 mt-1 font-mono">
            {stats.totalBookings} คำขอ
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            เสร็จสิ้นภารกิจ {stats.completedBookings} · ได้รับอนุมัติ {stats.approvedBookings}
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="text-xs text-slate-500 font-medium">งบค่าน้ำมันขอใช้สะสม</div>
          <div className="text-3xl font-bold font-heading text-teal-600 mt-1 font-mono">
            {stats.totalFuelBudget.toLocaleString()} บ.
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            บุคลากร {members.length} ท่านในระบบ
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kanban Task Breakdown */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold font-heading text-slate-900">
              สัดส่วนภารกิจตามสถานะ (Kanban Breakdown)
            </h2>
            <span className="text-xs text-slate-400 font-mono">รวม {stats.totalTasks} งาน</span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-emerald-700">เสร็จสิ้นแล้ว (Done)</span>
                <span className="font-mono">
                  {stats.doneTasks} งาน ({stats.totalTasks > 0 ? ((stats.doneTasks / stats.totalTasks) * 100).toFixed(0) : 0}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{
                    width: `${stats.totalTasks > 0 ? (stats.doneTasks / stats.totalTasks) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-indigo-700">กำลังดำเนินการ (In Progress)</span>
                <span className="font-mono">
                  {stats.inProgressTasks} งาน ({stats.totalTasks > 0 ? ((stats.inProgressTasks / stats.totalTasks) * 100).toFixed(0) : 0}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all"
                  style={{
                    width: `${stats.totalTasks > 0 ? (stats.inProgressTasks / stats.totalTasks) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-amber-700">รอเริ่มงาน (Todo)</span>
                <span className="font-mono">
                  {stats.todoTasks} งาน ({stats.totalTasks > 0 ? ((stats.todoTasks / stats.totalTasks) * 100).toFixed(0) : 0}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all"
                  style={{
                    width: `${stats.totalTasks > 0 ? (stats.todoTasks / stats.totalTasks) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Audit & Compliance Data Reports */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold font-heading text-slate-900">
              ชุดข้อมูลพร้อมส่งออกตามระเบียบราชการ
            </h2>
            <span className="text-xs text-indigo-600 font-bold">สตง. / ผู้บริหาร</span>
          </div>

          <div className="space-y-3">
            {[
              {
                title: "รายงานการใช้รถยนต์และงบประมาณเชื้อเพลิง",
                desc: `คำขอทั้งหมด ${bookings.length} รายการ · งบประมาณ ${stats.totalFuelBudget.toLocaleString()} บาท`,
                action: handleExportCSV,
                icon: "🚗",
              },
              {
                title: "สรุปผลการปฏิบัติงานตามแผนยุทธศาสตร์ (Kanban)",
                desc: `ภารกิจทั้งหมด ${tasks.length} รายการ · อัตราสำเร็จ ${stats.taskRate}%`,
                action: handleExportCSV,
                icon: "📋",
              },
              {
                title: "บันทึกการประชุมและการมีส่วนร่วม",
                desc: `การประชุม ${meetings.length} ครั้ง · จัดขึ้นโดย สนง.พมจ.`,
                action: handleExportCSV,
                icon: "📹",
              },
            ].map((rep) => (
              <div
                key={rep.title}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-indigo-50/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl p-2 bg-white rounded-xl shadow-2xs border border-slate-200/60">
                    {rep.icon}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-800">{rep.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{rep.desc}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={rep.action}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-indigo-700 border border-slate-200 text-xs font-bold shadow-2xs transition-all cursor-pointer shrink-0"
                >
                  ส่งออก CSV
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
