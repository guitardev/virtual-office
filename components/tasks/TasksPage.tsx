"use client";

import React from "react";
import { Member, TaskItem } from "@/lib/types";

interface TasksPageProps {
  tasks: TaskItem[];
  currentUser: Member;
  setTasks: React.Dispatch<React.SetStateAction<TaskItem[]>>;
  toggleTaskStatus: (id: number) => void;
  showToast: (msg: string) => void;
}

export function TasksPage({
  tasks,
  currentUser,
  setTasks,
  toggleTaskStatus,
  showToast,
}: TasksPageProps) {
  const handleAddNewTask = () => {
    const title = prompt("กรอกชื่องานใหม่:");
    if (title && title.trim()) {
      setTasks((prev) => [
        ...prev,
        {
          id: Date.now(),
          title: title.trim(),
          dept: "General",
          due: "วันนี้",
          priority: "medium",
          status: "todo",
          assignee: currentUser.name,
        },
      ]);
      showToast("✅ เพิ่มงานใหม่เรียบร้อยแล้ว");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-900">กระดานติดตามงาน (Kanban Board)</h1>
          <p className="text-slate-500 text-sm mt-0.5">จัดการสถานะและภารกิจของทีมแบบเรียลไทม์</p>
        </div>
        <button
          type="button"
          onClick={handleAddNewTask}
          className="px-4 py-2 bg-[#4F46E5] text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/25 hover:bg-[#4338CA] transition-colors cursor-pointer"
        >
          + เพิ่มงานใหม่
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Todo */}
        <div className="bg-slate-100/80 p-4 rounded-2xl border border-slate-200 flex flex-col">
          <div className="flex items-center justify-between font-bold font-heading text-sm text-slate-800 mb-3 px-1">
            <span className="flex items-center gap-2">📝 ยังไม่ได้ทำ (Todo)</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-xs text-slate-700">
              {tasks.filter((t) => t.status === "todo").length}
            </span>
          </div>
          <div className="space-y-3 flex-1">
            {tasks.filter((t) => t.status === "todo").map((task) => (
              <div
                key={task.id}
                onClick={() => toggleTaskStatus(task.id)}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-slate-800">{task.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${task.priority === "high" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                    {task.priority === "high" ? "🔥 สูง" : "🟡 กลาง"}
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex justify-between mt-3">
                  <span>👤 {task.assignee}</span>
                  <span>📅 {task.due}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex flex-col">
          <div className="flex items-center justify-between font-bold font-heading text-sm text-indigo-900 mb-3 px-1">
            <span className="flex items-center gap-2">🔄 กำลังดำเนินการ (In Progress)</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-xs text-indigo-700 font-bold">
              {tasks.filter((t) => t.status === "in_progress").length}
            </span>
          </div>
          <div className="space-y-3 flex-1">
            {tasks.filter((t) => t.status === "in_progress").map((task) => (
              <div
                key={task.id}
                onClick={() => toggleTaskStatus(task.id)}
                className="bg-white p-4 rounded-xl border border-indigo-100 shadow-xs hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-slate-800">{task.title}</span>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">🔥 สูง</span>
                </div>
                <div className="text-xs text-slate-500 flex justify-between mt-3">
                  <span>👤 {task.assignee}</span>
                  <span>📅 {task.due}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Done */}
        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex flex-col">
          <div className="flex items-center justify-between font-bold font-heading text-sm text-emerald-900 mb-3 px-1">
            <span className="flex items-center gap-2">✅ เสร็จสิ้นแล้ว (Done)</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-xs text-emerald-700 font-bold">
              {tasks.filter((t) => t.status === "done").length}
            </span>
          </div>
          <div className="space-y-3 flex-1">
            {tasks.filter((t) => t.status === "done").map((task) => (
              <div
                key={task.id}
                onClick={() => toggleTaskStatus(task.id)}
                className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm line-through text-slate-400">{task.title}</span>
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">🟢 ต่ำ</span>
                </div>
                <div className="text-xs text-slate-500 flex justify-between mt-3">
                  <span>👤 {task.assignee}</span>
                  <span>✅ เรียบร้อย</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
