"use client";

import React, { useState } from "react";
import { Member, TaskItem } from "@/lib/types";
import { saveTask, deleteTask } from "@/lib/supabase";

interface TasksPageProps {
  tasks: TaskItem[];
  currentUser: Member | null;
  setTasks: React.Dispatch<React.SetStateAction<TaskItem[]>>;
  toggleTaskStatus: (id: string | number) => void;
  showToast: (msg: string) => void;
}

export function TasksPage({
  tasks,
  currentUser,
  setTasks,
  toggleTaskStatus,
  showToast,
}: TasksPageProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDept, setTaskDept] = useState(currentUser?.division || "ฝ่ายบริหารทั่วไป");
  const [taskPriority, setTaskPriority] = useState<"high" | "medium" | "low">("medium");
  const [taskDue, setTaskDue] = useState("");

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const newTask: TaskItem = {
      id: `task_${Date.now()}`,
      title: taskTitle.trim(),
      dept: taskDept,
      due: taskDue || new Date().toLocaleDateString("th-TH"),
      priority: taskPriority,
      status: "todo",
      assignee: currentUser?.name || "เจ้าหน้าที่ พมจ.",
    };

    setTasks((prev) => [newTask, ...prev]);
    setShowAddModal(false);
    setTaskTitle("");
    showToast("✅ เพิ่มงานใหม่ลง Supabase เรียบร้อยแล้ว");

    // Persist to live Supabase
    saveTask(newTask).catch((err) => {
      console.error("Failed to save task to Supabase:", err);
    });
  };

  const handleDeleteTask = async (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    if (!confirm("คุณต้องการลบงานนี้ใช่หรือไม่?")) return;

    setTasks((prev) => prev.filter((t) => t.id !== id));
    showToast("🗑️ ลบงานเรียบร้อย");

    deleteTask(id).catch((err) => {
      console.error("Failed to delete task from Supabase:", err);
    });
  };

  const getPriorityBadge = (p: "high" | "medium" | "low") => {
    switch (p) {
      case "high":
        return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-700 border border-rose-200">🔥 สูง</span>;
      case "low":
        return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">🟢 ต่ำ</span>;
      default:
        return <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">🟡 กลาง</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-heading text-slate-900">กระดานติดตามงาน (Kanban Board)</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              🟢 Supabase Live
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">จัดการสถานะและภารกิจของทีมแบบเรียลไทม์ ซิงก์บน Cloud</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-[#4F46E5] text-white rounded-2xl text-sm font-bold shadow-md shadow-indigo-600/25 hover:bg-[#4338CA] transition-all cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto"
        >
          <span>➕</span>
          <span>เพิ่มงานใหม่</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Todo */}
        <div className="bg-slate-100/80 p-4 rounded-3xl border border-slate-200 flex flex-col">
          <div className="flex items-center justify-between font-bold font-heading text-sm text-slate-800 mb-3 px-1">
            <span className="flex items-center gap-2">📝 ยังไม่ได้ทำ (Todo)</span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-200 font-mono text-xs text-slate-700 font-bold">
              {tasks.filter((t) => t.status === "todo").length}
            </span>
          </div>
          <div className="space-y-3 flex-1">
            {tasks.filter((t) => t.status === "todo").length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-white/60 rounded-2xl border border-dashed border-slate-200">
                ไม่มีงานในหมวดนี้
              </div>
            ) : (
              tasks.filter((t) => t.status === "todo").map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTaskStatus(task.id)}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-semibold text-sm text-slate-800 leading-snug">{task.title}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {getPriorityBadge(task.priority)}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteTask(e, task.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 text-xs p-0.5 transition-opacity"
                        title="ลบงาน"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">{task.dept}</div>
                  <div className="text-xs text-slate-400 flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                    <span className="truncate">👤 {task.assignee}</span>
                    <span className="shrink-0 font-mono text-[11px]">📅 {task.due}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-indigo-50/50 p-4 rounded-3xl border border-indigo-100 flex flex-col">
          <div className="flex items-center justify-between font-bold font-heading text-sm text-indigo-900 mb-3 px-1">
            <span className="flex items-center gap-2">🔄 กำลังดำเนินการ (In Progress)</span>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 font-mono text-xs text-indigo-700 font-bold">
              {tasks.filter((t) => t.status === "in_progress").length}
            </span>
          </div>
          <div className="space-y-3 flex-1">
            {tasks.filter((t) => t.status === "in_progress").length === 0 ? (
              <div className="p-8 text-center text-xs text-indigo-300 bg-white/60 rounded-2xl border border-dashed border-indigo-200">
                ไม่มีงานกำลังดำเนินการ
              </div>
            ) : (
              tasks.filter((t) => t.status === "in_progress").map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTaskStatus(task.id)}
                  className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-semibold text-sm text-slate-800 leading-snug">{task.title}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {getPriorityBadge(task.priority)}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteTask(e, task.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 text-xs p-0.5 transition-opacity"
                        title="ลบงาน"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] text-indigo-600 font-medium">{task.dept}</div>
                  <div className="text-xs text-slate-400 flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                    <span className="truncate">👤 {task.assignee}</span>
                    <span className="shrink-0 font-mono text-[11px]">📅 {task.due}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Done */}
        <div className="bg-emerald-50/50 p-4 rounded-3xl border border-emerald-100 flex flex-col">
          <div className="flex items-center justify-between font-bold font-heading text-sm text-emerald-900 mb-3 px-1">
            <span className="flex items-center gap-2">✅ เสร็จสิ้นแล้ว (Done)</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 font-mono text-xs text-emerald-700 font-bold">
              {tasks.filter((t) => t.status === "done").length}
            </span>
          </div>
          <div className="space-y-3 flex-1">
            {tasks.filter((t) => t.status === "done").length === 0 ? (
              <div className="p-8 text-center text-xs text-emerald-300 bg-white/60 rounded-2xl border border-dashed border-emerald-200">
                ยังไม่มีงานที่เสร็จสิ้น
              </div>
            ) : (
              tasks.filter((t) => t.status === "done").map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTaskStatus(task.id)}
                  className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs hover:shadow-md transition-all cursor-pointer group opacity-90"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="font-semibold text-sm line-through text-slate-400 leading-snug">{task.title}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {getPriorityBadge(task.priority)}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteTask(e, task.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 text-xs p-0.5 transition-opacity"
                        title="ลบงาน"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] text-emerald-700 font-medium">{task.dept}</div>
                  <div className="text-xs text-slate-400 flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                    <span className="truncate">👤 {task.assignee}</span>
                    <span className="shrink-0 text-emerald-600 font-bold text-[11px]">✅ เสร็จสิ้น</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ─── MODAL: ADD NEW TASK ─── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📋</span>
                <h3 className="font-bold font-heading text-slate-900 text-base">เพิ่มงานใหม่</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่องาน / ภารกิจ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น จัดทำหนังสือขอความอนุเคราะห์, ตรวจสอบงบประมาณ"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  กลุ่มงาน / ฝ่าย
                </label>
                <input
                  type="text"
                  value={taskDept}
                  onChange={(e) => setTaskDept(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ระดับความเร่งด่วน
                  </label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-indigo-500 transition-colors"
                  >
                    <option value="high">🔥 สูง (ด่วน)</option>
                    <option value="medium">🟡 กลาง (ปกติ)</option>
                    <option value="low">🟢 ต่ำ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    กำหนดส่ง (วัน/เดือน/ปี)
                  </label>
                  <input
                    type="date"
                    value={taskDue}
                    onChange={(e) => setTaskDue(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  บันทึกลง Supabase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
