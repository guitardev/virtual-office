"use client";

import React, { useState, useMemo } from "react";
import { Member, TaskItem, TaskVisibility } from "@/lib/types";
import { saveTask, deleteTask } from "@/lib/supabase";
import {
  canUserViewTask,
  canUserEditTask,
  canUserDeleteTask,
  GOVERNMENT_DIVISIONS,
} from "@/lib/rbac";

interface TasksPageProps {
  tasks: TaskItem[];
  currentUser: Member | null;
  members?: Member[];
  setTasks: React.Dispatch<React.SetStateAction<TaskItem[]>>;
  toggleTaskStatus: (id: string | number) => void;
  showToast: (msg: string) => void;
}

type ViewMode = "kanban" | "list";
type ScopeFilter = "all" | "my_tasks" | "my_dept" | "public";

export function TasksPage({
  tasks,
  currentUser,
  members = [],
  setTasks,
  showToast,
}: TasksPageProps) {
  // View & Filter States
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("all");
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState("all");

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [isEditingTask, setIsEditingTask] = useState(false);

  // Form States for New Task
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskDept, setTaskDept] = useState(currentUser?.division || "ฝ่ายบริหารทั่วไป");
  const [taskPriority, setTaskPriority] = useState<"high" | "medium" | "low">("medium");
  const [taskDue, setTaskDue] = useState("");
  const [taskVisibility, setTaskVisibility] = useState<TaskVisibility>("department");
  const [taskAssigneeId, setTaskAssigneeId] = useState(currentUser?.id || "usr_1");
  const [taskTagsInput, setTaskTagsInput] = useState("");
  const [newSubtasks, setNewSubtasks] = useState<{ id: string; text: string; done: boolean }[]>([]);
  const [currentSubtaskText, setCurrentSubtaskText] = useState("");

  // Edit Form States
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editPriority, setEditPriority] = useState<"high" | "medium" | "low">("medium");
  const [editDue, setEditDue] = useState("");
  const [editVisibility, setEditVisibility] = useState<TaskVisibility>("department");
  const [editAssigneeId, setEditAssigneeId] = useState("");
  const [editReviewNotes, setEditReviewNotes] = useState("");

  // Filter tasks that current user is authorized to view (RBAC Security Guard)
  const permittedTasks = useMemo(() => {
    return tasks.filter((t) => canUserViewTask(t, currentUser));
  }, [tasks, currentUser]);

  // Apply Secondary Filters (Scope, Search, Dept, Priority)
  const filteredTasks = useMemo(() => {
    return permittedTasks.filter((t) => {
      // 1. Scope Filter
      if (scopeFilter === "my_tasks") {
        const isMyAssignee =
          (t.assigneeId && t.assigneeId === currentUser?.id) ||
          (t.assignee && (t.assignee === currentUser?.name || (currentUser?.firstName && t.assignee.includes(currentUser.firstName))));
        const isMyCreated = t.createdBy === currentUser?.id;
        if (!isMyAssignee && !isMyCreated) return false;
      } else if (scopeFilter === "my_dept") {
        const userDiv = currentUser?.division || "";
        const taskDeptMatch = t.targetDivision === userDiv || t.dept === userDiv;
        if (!taskDeptMatch) return false;
      } else if (scopeFilter === "public") {
        if (t.visibility !== "public") return false;
      }

      // 2. Department Dropdown Filter
      if (selectedDeptFilter !== "all") {
        if (t.dept !== selectedDeptFilter && t.targetDivision !== selectedDeptFilter) return false;
      }

      // 3. Priority Dropdown Filter
      if (selectedPriorityFilter !== "all") {
        if (t.priority !== selectedPriorityFilter) return false;
      }

      // 4. Keyword Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = t.title.toLowerCase().includes(q);
        const descMatch = (t.description || "").toLowerCase().includes(q);
        const assigneeMatch = t.assignee.toLowerCase().includes(q);
        const deptMatch = t.dept.toLowerCase().includes(q);
        const tagsMatch = (t.tags || []).some((tag) => tag.toLowerCase().includes(q));
        if (!titleMatch && !descMatch && !assigneeMatch && !deptMatch && !tagsMatch) return false;
      }

      return true;
    });
  }, [permittedTasks, scopeFilter, selectedDeptFilter, selectedPriorityFilter, searchQuery, currentUser]);

  // Metrics for Top Summary Bar
  const stats = useMemo(() => {
    const total = permittedTasks.length;
    const todo = permittedTasks.filter((t) => t.status === "todo").length;
    const inProg = permittedTasks.filter((t) => t.status === "in_progress").length;
    const review = permittedTasks.filter((t) => t.status === "review").length;
    const done = permittedTasks.filter((t) => t.status === "done").length;
    const percentDone = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, todo, inProg, review, done, percentDone };
  }, [permittedTasks]);

  // ─── ADD SUBTASK IN CREATE MODAL ───
  const handleAddSubtask = () => {
    if (!currentSubtaskText.trim()) return;
    setNewSubtasks((prev) => [
      ...prev,
      { id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, text: currentSubtaskText.trim(), done: false },
    ]);
    setCurrentSubtaskText("");
  };

  const handleRemoveSubtask = (id: string) => {
    setNewSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  // ─── CREATE NEW TASK ───
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const assignedMember = members.find((m) => m.id === taskAssigneeId);
    const tagsArray = taskTagsInput
      .split(/[,，\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const newTask: TaskItem = {
      id: `task_${Date.now()}`,
      title: taskTitle.trim(),
      dept: taskDept,
      targetDivision: taskDept,
      due: taskDue || new Date().toLocaleDateString("th-TH"),
      priority: taskPriority,
      status: "todo",
      assignee: assignedMember?.name || currentUser?.name || "เจ้าหน้าที่ พมจ.",
      assigneeId: assignedMember?.id || currentUser?.id,
      description: taskDesc.trim(),
      visibility: taskVisibility,
      createdBy: currentUser?.id,
      createdByName: currentUser?.name,
      subtasks: newSubtasks,
      tags: tagsArray,
      createdAt: new Date().toISOString(),
    };

    // Optimistic state update
    setTasks((prev) => [newTask, ...prev]);
    setShowAddModal(false);
    resetAddForm();
    showToast("✅ เพิ่มงานใหม่ลง Supabase เรียบร้อยแล้ว");

    // Persist to Supabase and update with real UUID
    try {
      const saved = await saveTask(newTask);
      if (saved && saved.id !== newTask.id) {
        setTasks((prev) => prev.map((t) => (t.id === newTask.id ? saved : t)));
      }
    } catch (err) {
      console.error("Failed to save task to Supabase:", err);
    }
  };

  const resetAddForm = () => {
    setTaskTitle("");
    setTaskDesc("");
    setTaskDept(currentUser?.division || "ฝ่ายบริหารทั่วไป");
    setTaskPriority("medium");
    setTaskDue("");
    setTaskVisibility("department");
    setTaskAssigneeId(currentUser?.id || "usr_1");
    setTaskTagsInput("");
    setNewSubtasks([]);
    setCurrentSubtaskText("");
  };

  // ─── OPEN TASK DETAILS MODAL ───
  const handleOpenTaskDetails = (task: TaskItem) => {
    setSelectedTask(task);
    setIsEditingTask(false);
    setEditTitle(task.title);
    setEditDesc(task.description || "");
    setEditDept(task.dept || task.targetDivision || "ฝ่ายบริหารทั่วไป");
    setEditPriority(task.priority);
    setEditDue(task.due || "");
    setEditVisibility(task.visibility || "department");
    setEditAssigneeId(task.assigneeId || "");
    setEditReviewNotes(task.reviewNotes || "");
  };

  // ─── QUICK MOVE STATUS (ARROW BUTTONS) ───
  const handleMoveStatus = async (
    e: React.MouseEvent,
    task: TaskItem,
    direction: "next" | "prev"
  ) => {
    e.stopPropagation();
    const statusOrder: ("todo" | "in_progress" | "review" | "done")[] = [
      "todo",
      "in_progress",
      "review",
      "done",
    ];
    const currentIndex = statusOrder.indexOf(task.status);
    let nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= statusOrder.length) return;

    const nextStatus = statusOrder[nextIndex];
    const updated: TaskItem = { ...task, status: nextStatus };

    setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    if (selectedTask?.id === task.id) {
      setSelectedTask(updated);
    }

    const statusLabels: Record<string, string> = {
      todo: "📝 รอดำเนินการ",
      in_progress: "🔄 กำลังดำเนินการ",
      review: "🔍 รอตรวจทาน",
      done: "✅ เสร็จสิ้นแล้ว",
    };
    showToast(`🔄 ย้ายไปสถานะ ${statusLabels[nextStatus]}`);

    saveTask(updated).catch(console.error);
  };

  // ─── TOGGLE SUBTASK IN MODAL ───
  const handleToggleSubtaskInDetail = async (subtaskId: string) => {
    if (!selectedTask) return;
    const updatedSubtasks = (selectedTask.subtasks || []).map((st) =>
      st.id === subtaskId ? { ...st, done: !st.done } : st
    );
    const updatedTask: TaskItem = { ...selectedTask, subtasks: updatedSubtasks };

    setSelectedTask(updatedTask);
    setTasks((prev) => prev.map((t) => (t.id === selectedTask.id ? updatedTask : t)));
    saveTask(updatedTask).catch(console.error);
  };

  // ─── SAVE EDITED TASK ───
  const handleSaveEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    const assignedMember = members.find((m) => m.id === editAssigneeId);

    const updatedTask: TaskItem = {
      ...selectedTask,
      title: editTitle.trim(),
      description: editDesc.trim(),
      dept: editDept,
      targetDivision: editDept,
      priority: editPriority,
      due: editDue || selectedTask.due,
      visibility: editVisibility,
      assignee: assignedMember ? assignedMember.name : selectedTask.assignee,
      assigneeId: assignedMember ? assignedMember.id : selectedTask.assigneeId,
      reviewNotes: editReviewNotes.trim(),
    };

    setTasks((prev) => prev.map((t) => (t.id === selectedTask.id ? updatedTask : t)));
    setSelectedTask(updatedTask);
    setIsEditingTask(false);
    showToast("💾 บันทึกการแก้ไขข้อมูลงานเรียบร้อย");

    saveTask(updatedTask).catch(console.error);
  };

  // ─── DELETE TASK ───
  const handleDeleteTask = async (e: React.MouseEvent, id: string | number) => {
    e.stopPropagation();
    if (!confirm("คุณต้องการลบงานนี้ออกจากระบบใช่หรือไม่?")) return;

    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (selectedTask?.id === id) {
      setSelectedTask(null);
    }
    showToast("🗑️ ลบงานเรียบร้อย");

    deleteTask(id).catch(console.error);
  };

  // ─── BADGE HELPERS ───
  const getPriorityBadge = (p: "high" | "medium" | "low") => {
    switch (p) {
      case "high":
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
            <span>🔥</span>
            <span>ด่วนมาก</span>
          </span>
        );
      case "low":
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <span>🟢</span>
            <span>ทั่วไป</span>
          </span>
        );
      default:
        return (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
            <span>🟡</span>
            <span>ปกติ</span>
          </span>
        );
    }
  };

  const getVisibilityBadge = (vis?: TaskVisibility) => {
    switch (vis) {
      case "individual":
        return (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1"
            title="เห็นได้เฉพาะบุคคล (ผู้สร้าง / ผู้รับผิดชอบ / หน.ฝ่าย)"
          >
            <span>🔒</span>
            <span>เฉพาะบุคคล</span>
          </span>
        );
      case "public":
        return (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-sky-50 text-sky-700 border border-sky-200 flex items-center gap-1"
            title="เห็นได้ทุกคนในสำนักงาน พมจ."
          >
            <span>🏢</span>
            <span>ทั้ง สนง.</span>
          </span>
        );
      case "department":
      default:
        return (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1"
            title="เห็นได้เฉพาะกลุ่มงาน / Manager Group"
          >
            <span>👥</span>
            <span>กลุ่มงาน</span>
          </span>
        );
    }
  };

  // Helper for overdue check
  const isOverdue = (dueStr: string, status: string) => {
    if (status === "done") return false;
    const parsed = Date.parse(dueStr);
    if (!isNaN(parsed)) {
      const dueDate = new Date(parsed);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dueDate < today;
    }
    return false;
  };

  // ─── RENDER TASK CARD (KANBAN) ───
  const renderTaskCard = (task: TaskItem, colStatus: "todo" | "in_progress" | "review" | "done") => {
    const completedSubtasks = (task.subtasks || []).filter((s) => s.done).length;
    const totalSubtasks = (task.subtasks || []).length;
    const hasSubtasks = totalSubtasks > 0;
    const subtaskPercent = hasSubtasks ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
    const overdue = isOverdue(task.due, task.status);

    return (
      <div
        key={task.id}
        onClick={() => handleOpenTaskDetails(task)}
        className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer group shadow-2xs hover:shadow-md relative ${
          overdue
            ? "border-rose-300 ring-1 ring-rose-200"
            : task.status === "done"
            ? "border-emerald-100 opacity-90"
            : task.status === "review"
            ? "border-amber-200"
            : task.status === "in_progress"
            ? "border-indigo-100"
            : "border-slate-200"
        }`}
      >
        {/* Header: Visibility & Priority */}
        <div className="flex items-center justify-between gap-1.5 mb-2">
          <div className="flex items-center gap-1">
            {getVisibilityBadge(task.visibility)}
          </div>
          <div className="flex items-center gap-1.5">
            {getPriorityBadge(task.priority)}
            {canUserDeleteTask(task, currentUser) && (
              <button
                type="button"
                onClick={(e) => handleDeleteTask(e, task.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 text-xs p-0.5 transition-opacity"
                title="ลบงาน"
              >
                🗑️
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <h4
          className={`font-semibold text-sm leading-snug tracking-tight mb-1 group-hover:text-indigo-600 transition-colors ${
            task.status === "done" ? "line-through text-slate-400" : "text-slate-800"
          }`}
        >
          {task.title}
        </h4>

        {/* Description Snippet */}
        {task.description && (
          <p className="text-[11px] text-slate-500 line-clamp-2 mb-2 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2.5">
            {task.tags.map((tag, i) => (
              <span
                key={i}
                className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Subtasks Progress Bar */}
        {hasSubtasks && (
          <div className="mb-2.5 bg-slate-50 p-2 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1 font-semibold">
              <span>☑️ เช็คลิสต์รายการย่อย</span>
              <span>
                {completedSubtasks}/{totalSubtasks} ({subtaskPercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  subtaskPercent === 100 ? "bg-emerald-500" : "bg-indigo-600"
                }`}
                style={{ width: `${subtaskPercent}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Department */}
        <div className="text-[11px] text-indigo-700 font-medium flex items-center gap-1 mb-2">
          <span>📁</span>
          <span className="truncate">{task.dept}</span>
        </div>

        {/* Card Footer: Assignee & Due Date */}
        <div className="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
          <span className="truncate font-medium flex items-center gap-1" title={task.assignee}>
            <span>👤</span>
            <span className="truncate">{task.assignee}</span>
          </span>

          <span
            className={`shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded-md ${
              overdue
                ? "bg-rose-100 text-rose-700 font-bold"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {overdue ? "🚨 " : "📅 "}
            {task.due}
          </span>
        </div>

        {/* Quick Step Buttons (Left / Right Column Shifter) */}
        <div
          className="mt-3 pt-2 border-t border-dashed border-slate-100 flex items-center justify-between"
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            {colStatus !== "todo" && (
              <button
                type="button"
                onClick={(e) => handleMoveStatus(e, task, "prev")}
                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                title="ย้อนกลับไปสถานะก่อนหน้า"
              >
                <span>⬅️</span>
                <span>ย้อน</span>
              </button>
            )}
          </div>

          <div>
            {colStatus !== "done" && (
              <button
                type="button"
                onClick={(e) => handleMoveStatus(e, task, "next")}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                title="เลื่อนไปสถานะถัดไป"
              >
                <span>ถัดไป</span>
                <span>➡️</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans">
      {/* ─── HEADER & REALTIME BADGE ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">
              กระดานติดตามงาน (Kanban Board)
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Supabase Live Realtime
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 flex items-center gap-1">
              <span>🛡️</span>
              <span>RBAC Granular Scope</span>
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            ระบบบริหารจัดการภารกิจภาครัฐ 4 ขั้นตอน พร้อมระบบจำกัดสิทธิ์ระดับบุคคล
            และกลุ่มงาน (Manager Group)
          </p>
        </div>

        {/* View Mode & Add Task Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "kanban"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>📊</span>
              <span>กระดาน Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "list"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>📋</span>
              <span>ตารางรายการ</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer flex items-center gap-2"
          >
            <span className="text-sm">➕</span>
            <span>เพิ่มงานใหม่</span>
          </button>
        </div>
      </div>

      {/* ─── SUMMARY KPI METRICS BAR ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <span className="text-xs text-slate-500 font-medium">งานทั้งหมดที่เห็นได้</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-heading text-slate-800">{stats.total}</span>
            <span className="text-[11px] font-mono text-slate-400">รายการ</span>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <span className="text-xs text-slate-600 font-bold flex items-center gap-1.5">
            <span>📝</span> รอดำเนินการ
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-heading text-slate-700">{stats.todo}</span>
            <span className="text-[11px] font-mono text-slate-400">งาน</span>
          </div>
        </div>

        <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 shadow-2xs flex flex-col justify-between">
          <span className="text-xs text-indigo-700 font-bold flex items-center gap-1.5">
            <span>🔄</span> กำลังดำเนินการ
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-heading text-indigo-700">{stats.inProg}</span>
            <span className="text-[11px] font-mono text-indigo-500">งาน</span>
          </div>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 shadow-2xs flex flex-col justify-between">
          <span className="text-xs text-amber-800 font-bold flex items-center gap-1.5">
            <span>🔍</span> รอตรวจทาน
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-heading text-amber-800">{stats.review}</span>
            <span className="text-[11px] font-mono text-amber-600">งาน</span>
          </div>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-800 font-bold flex items-center gap-1.5">
              <span>✅</span> เสร็จสิ้นแล้ว
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
              {stats.percentDone}%
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold font-heading text-emerald-700">{stats.done}</span>
            <span className="text-[11px] font-mono text-emerald-600">งาน</span>
          </div>
        </div>
      </div>

      {/* ─── GRANULAR PERMISSION SCOPE & FILTER CONTROL ─── */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        {/* Scope Selector Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
              ขอบเขตสิทธิ์:
            </span>

            <button
              type="button"
              onClick={() => setScopeFilter("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                scopeFilter === "all"
                  ? "bg-[#4F46E5] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>🌐</span>
              <span>ทั้งหมดที่ฉันมีสิทธิ์เข้าถึง ({permittedTasks.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setScopeFilter("my_tasks")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                scopeFilter === "my_tasks"
                  ? "bg-slate-800 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>👤</span>
              <span>งานของฉัน (เฉพาะบุคคล)</span>
            </button>

            <button
              type="button"
              onClick={() => setScopeFilter("my_dept")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                scopeFilter === "my_dept"
                  ? "bg-teal-700 text-white shadow-xs"
                  : "bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200"
              }`}
            >
              <span>👥</span>
              <span>กลุ่มงานของฉัน ({currentUser?.division || "ฝ่าย"})</span>
            </button>

            <button
              type="button"
              onClick={() => setScopeFilter("public")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                scopeFilter === "public"
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>🏢</span>
              <span>งานส่วนกลางทั้ง สนง.</span>
            </button>
          </div>

          {/* User Context & Role Banner */}
          <div className="flex items-center gap-2 text-xs text-slate-500 self-start md:self-auto shrink-0">
            <span>เข้าใช้งานโดย:</span>
            <span className="font-bold text-slate-800">{currentUser?.name || "ผู้ใช้งาน"}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {currentUser?.role === "admin"
                ? "👑 Admin (สิทธิ์สูงสุด)"
                : currentUser?.role === "manager"
                ? "👔 Manager (หัวหน้ากลุ่มงาน)"
                : "👤 Member"}
            </span>
          </div>
        </div>

        {/* Search & Granular Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-6 relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="ค้นหาชื่องาน, คำอธิบาย, ผู้รับผิดชอบ, หรือแท็ก..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:border-indigo-500 transition-colors cursor-pointer"
            >
              <option value="all">🏢 ทุกกลุ่มงาน / ฝ่าย</option>
              {GOVERNMENT_DIVISIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedPriorityFilter}
              onChange={(e) => setSelectedPriorityFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:bg-white focus:border-indigo-500 transition-colors cursor-pointer"
            >
              <option value="all">⚡ ทุกระดับความเร่งด่วน</option>
              <option value="high">🔥 สูงมาก (ด่วน)</option>
              <option value="medium">🟡 ปานกลาง (ปกติ)</option>
              <option value="low">🟢 ทั่วไป</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── KANBAN BOARD VIEW ─── */}
      {viewMode === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {/* 1. TODO COLUMN */}
          <div className="bg-slate-100/90 p-3.5 rounded-3xl border border-slate-200 flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between font-bold font-heading text-xs text-slate-800 mb-3 px-1">
              <span className="flex items-center gap-1.5">
                <span className="text-sm">📝</span> รอดำเนินการ (Todo)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-200 font-mono text-[11px] text-slate-700 font-bold">
                {filteredTasks.filter((t) => t.status === "todo").length}
              </span>
            </div>

            <div className="space-y-3 flex-1">
              {filteredTasks.filter((t) => t.status === "todo").length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-white/60 rounded-2xl border border-dashed border-slate-200">
                  ไม่มีงานรอดำเนินการ
                </div>
              ) : (
                filteredTasks
                  .filter((t) => t.status === "todo")
                  .map((task) => renderTaskCard(task, "todo"))
              )}
            </div>
          </div>

          {/* 2. IN PROGRESS COLUMN */}
          <div className="bg-indigo-50/50 p-3.5 rounded-3xl border border-indigo-100 flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between font-bold font-heading text-xs text-indigo-900 mb-3 px-1">
              <span className="flex items-center gap-1.5">
                <span className="text-sm">🔄</span> กำลังดำเนินการ (In Progress)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 font-mono text-[11px] text-indigo-700 font-bold">
                {filteredTasks.filter((t) => t.status === "in_progress").length}
              </span>
            </div>

            <div className="space-y-3 flex-1">
              {filteredTasks.filter((t) => t.status === "in_progress").length === 0 ? (
                <div className="p-8 text-center text-xs text-indigo-300 bg-white/60 rounded-2xl border border-dashed border-indigo-200">
                  ไม่มีงานกำลังดำเนินการ
                </div>
              ) : (
                filteredTasks
                  .filter((t) => t.status === "in_progress")
                  .map((task) => renderTaskCard(task, "in_progress"))
              )}
            </div>
          </div>

          {/* 3. UNDER REVIEW COLUMN */}
          <div className="bg-amber-50/60 p-3.5 rounded-3xl border border-amber-200/80 flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between font-bold font-heading text-xs text-amber-900 mb-3 px-1">
              <span className="flex items-center gap-1.5">
                <span className="text-sm">🔍</span> รอตรวจทาน (Review)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 font-mono text-[11px] text-amber-800 font-bold">
                {filteredTasks.filter((t) => t.status === "review").length}
              </span>
            </div>

            <div className="space-y-3 flex-1">
              {filteredTasks.filter((t) => t.status === "review").length === 0 ? (
                <div className="p-8 text-center text-xs text-amber-400 bg-white/60 rounded-2xl border border-dashed border-amber-200">
                  ไม่มีงานรอตรวจทาน
                </div>
              ) : (
                filteredTasks
                  .filter((t) => t.status === "review")
                  .map((task) => renderTaskCard(task, "review"))
              )}
            </div>
          </div>

          {/* 4. DONE COLUMN */}
          <div className="bg-emerald-50/50 p-3.5 rounded-3xl border border-emerald-100 flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between font-bold font-heading text-xs text-emerald-900 mb-3 px-1">
              <span className="flex items-center gap-1.5">
                <span className="text-sm">✅</span> เสร็จสิ้นแล้ว (Done)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 font-mono text-[11px] text-emerald-700 font-bold">
                {filteredTasks.filter((t) => t.status === "done").length}
              </span>
            </div>

            <div className="space-y-3 flex-1">
              {filteredTasks.filter((t) => t.status === "done").length === 0 ? (
                <div className="p-8 text-center text-xs text-emerald-300 bg-white/60 rounded-2xl border border-dashed border-emerald-200">
                  ยังไม่มีงานที่เสร็จสิ้น
                </div>
              ) : (
                filteredTasks
                  .filter((t) => t.status === "done")
                  .map((task) => renderTaskCard(task, "done"))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ─── LIST / TABLE VIEW ─── */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="py-3 px-4">สถานะ</th>
                  <th className="py-3 px-4">ชื่องานและรายละเอียด</th>
                  <th className="py-3 px-4">สิทธิ์ / ขอบเขต</th>
                  <th className="py-3 px-4">กลุ่มงาน / ฝ่าย</th>
                  <th className="py-3 px-4">ผู้รับผิดชอบ</th>
                  <th className="py-3 px-4">กำหนดส่ง</th>
                  <th className="py-3 px-4 text-center">ความเร่งด่วน</th>
                  <th className="py-3 px-4 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      ไม่พบภารกิจที่ตรงกับเงื่อนไขการค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => (
                    <tr
                      key={task.id}
                      onClick={() => handleOpenTaskDetails(task)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            task.status === "done"
                              ? "bg-emerald-100 text-emerald-800"
                              : task.status === "review"
                              ? "bg-amber-100 text-amber-800"
                              : task.status === "in_progress"
                              ? "bg-indigo-100 text-indigo-800"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {task.status === "done"
                            ? "✅ เสร็จสิ้น"
                            : task.status === "review"
                            ? "🔍 รอตรวจทาน"
                            : task.status === "in_progress"
                            ? "🔄 กำลังทำ"
                            : "📝 รอดำเนินการ"}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {task.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">{getVisibilityBadge(task.visibility)}</td>
                      <td className="py-3 px-4 font-medium text-slate-600">{task.dept}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">👤 {task.assignee}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{task.due}</td>
                      <td className="py-3 px-4 text-center">{getPriorityBadge(task.priority)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleOpenTaskDetails(task)}
                            className="px-2 py-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs"
                          >
                            ✏️ ดู / แก้ไข
                          </button>
                          {canUserDeleteTask(task, currentUser) && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteTask(e, task.id)}
                              className="px-2 py-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-xs"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: ADD NEW TASK ─── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in my-8">
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📋</span>
                <h3 className="font-bold font-heading text-slate-900 text-base">
                  เพิ่มภารกิจใหม่ (New Government Task)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่องาน / ภารกิจราชการ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น จัดทำรายงานการเงินประจำเดือน, เตรียมเอกสารตรวจราชการ พม."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รายละเอียดภารกิจ / สาระสำคัญ
                </label>
                <textarea
                  rows={3}
                  placeholder="ระบุข้อกำหนด วัตถุประสงค์ หรือแนวทางการดำเนินงาน..."
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 transition-colors"
                ></textarea>
              </div>

              {/* Scope & Permission Options */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>🛡️</span>
                  <span>ระบบกำหนดสิทธิ์การมองเห็น (Visibility Scope)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <label
                    className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      taskVisibility === "department"
                        ? "bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      checked={taskVisibility === "department"}
                      onChange={() => setTaskVisibility("department")}
                      className="mt-0.5 text-indigo-600"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">👥 กลุ่มงาน</div>
                      <div className="text-[10px] text-slate-500">Manager & คนในฝ่ายเห็นได้</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      taskVisibility === "individual"
                        ? "bg-slate-100 border-slate-400 ring-1 ring-slate-300"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      checked={taskVisibility === "individual"}
                      onChange={() => setTaskVisibility("individual")}
                      className="mt-0.5 text-slate-800"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">🔒 เฉพาะบุคคล</div>
                      <div className="text-[10px] text-slate-500">ฉันและผู้รับผิดชอบเท่านั้น</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      taskVisibility === "public"
                        ? "bg-sky-50 border-sky-300 ring-1 ring-sky-200"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      checked={taskVisibility === "public"}
                      onChange={() => setTaskVisibility("public")}
                      className="mt-0.5 text-sky-600"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">🏢 ทั้งสำนักงาน</div>
                      <div className="text-[10px] text-slate-500">ทุกคนใน พมจ. เห็นได้</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Department & Assignee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    กลุ่มงาน / ฝ่ายที่รับผิดชอบ
                  </label>
                  <select
                    value={taskDept}
                    onChange={(e) => setTaskDept(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-indigo-500 transition-colors"
                  >
                    {GOVERNMENT_DIVISIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    มอบหมายผู้รับผิดชอบหลัก
                  </label>
                  <select
                    value={taskAssigneeId}
                    onChange={(e) => setTaskAssigneeId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-indigo-500 transition-colors"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.position})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Priority & Due Date */}
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
                    <option value="high">🔥 สูงมาก (ด่วนที่สุด)</option>
                    <option value="medium">🟡 ปานกลาง (ปกติ)</option>
                    <option value="low">🟢 ทั่วไป</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    กำหนดส่งงาน (Due Date)
                  </label>
                  <input
                    type="date"
                    value={taskDue}
                    onChange={(e) => setTaskDue(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ป้ายกำกับ / หมวดหมู่งาน (คั่นด้วยจุลภาค)
                </label>
                <input
                  type="text"
                  placeholder="เช่น หนังสือเวียน, เบิกจ่าย, โครงการพิเศษ"
                  value={taskTagsInput}
                  onChange={(e) => setTaskTagsInput(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Subtasks (Checklists) Builder */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  ☑️ รายการงานย่อย / เช็คลิสต์ (Subtasks)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="พิมพ์ขั้นตอนย่อย เช่น ร่างหนังสือ, รวบรวมเอกสาร..."
                    value={currentSubtaskText}
                    onChange={(e) => setCurrentSubtaskText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSubtask();
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    className="px-3 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 cursor-pointer"
                  >
                    เพิ่ม
                  </button>
                </div>

                {newSubtasks.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {newSubtasks.map((st) => (
                      <div
                        key={st.id}
                        className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-100 text-xs text-slate-700"
                      >
                        <span className="flex items-center gap-2">
                          <span>◽</span>
                          <span>{st.text}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubtask(st.id)}
                          className="text-slate-400 hover:text-rose-500 text-xs px-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Buttons */}
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
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

      {/* ─── MODAL 2: TASK DETAIL & EDIT MODAL ─── */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {selectedTask.status === "done"
                    ? "✅"
                    : selectedTask.status === "review"
                    ? "🔍"
                    : selectedTask.status === "in_progress"
                    ? "🔄"
                    : "📝"}
                </span>
                <div>
                  <h3 className="font-bold font-heading text-slate-900 text-base">
                    รายละเอียดภารกิจ
                  </h3>
                  <div className="text-[11px] text-slate-400">
                    รหัสงาน: <span className="font-mono text-slate-600">{selectedTask.id}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canUserEditTask(selectedTask, currentUser) && (
                  <button
                    type="button"
                    onClick={() => setIsEditingTask(!isEditingTask)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                  >
                    {isEditingTask ? "👁️ ดูตัวอย่าง" : "✏️ แก้ไขข้อมูล"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {!isEditingTask ? (
                <>
                  {/* Status Toggle Bar */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <div className="text-xs font-bold text-slate-600 mb-2">
                      สถานะปัจจุบัน (คลิกเพื่อเปลี่ยนสถานะทันที):
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...selectedTask, status: "todo" as const };
                          setSelectedTask(updated);
                          setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
                          saveTask(updated).catch(console.error);
                          showToast("📝 ย้ายไปสถานะ รอดำเนินการ");
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedTask.status === "todo"
                            ? "bg-slate-800 text-white shadow-xs"
                            : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        📝 รอดำเนินการ
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...selectedTask, status: "in_progress" as const };
                          setSelectedTask(updated);
                          setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
                          saveTask(updated).catch(console.error);
                          showToast("🔄 ย้ายไปสถานะ กำลังดำเนินการ");
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedTask.status === "in_progress"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50"
                        }`}
                      >
                        🔄 กำลังดำเนินการ
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...selectedTask, status: "review" as const };
                          setSelectedTask(updated);
                          setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
                          saveTask(updated).catch(console.error);
                          showToast("🔍 ย้ายไปสถานะ รอตรวจทาน (ส่งหัวหน้าฝ่าย)");
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedTask.status === "review"
                            ? "bg-amber-600 text-white shadow-xs"
                            : "bg-white text-amber-800 border border-amber-200 hover:bg-amber-50"
                        }`}
                      >
                        🔍 รอตรวจทาน
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...selectedTask, status: "done" as const };
                          setSelectedTask(updated);
                          setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
                          saveTask(updated).catch(console.error);
                          showToast("✅ ย้ายไปสถานะ เสร็จสิ้นแล้ว");
                        }}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedTask.status === "done"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50"
                        }`}
                      >
                        ✅ เสร็จสิ้นแล้ว
                      </button>
                    </div>
                  </div>

                  {/* Task Header & Meta Badges */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {getVisibilityBadge(selectedTask.visibility)}
                      {getPriorityBadge(selectedTask.priority)}
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                        📁 {selectedTask.dept}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold font-heading text-slate-900">
                      {selectedTask.title}
                    </h2>
                  </div>

                  {/* Description */}
                  {selectedTask.description && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="text-xs font-bold text-slate-500 mb-1">รายละเอียดงาน:</div>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {selectedTask.description}
                      </p>
                    </div>
                  )}

                  {/* Interactive Subtasks (Checklists) */}
                  {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                      <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                        <span>☑️ รายการตรวจรับย่อย (Interactive Checklist)</span>
                        <span className="font-mono text-indigo-600">
                          {selectedTask.subtasks.filter((s) => s.done).length}/
                          {selectedTask.subtasks.length} สำเร็จ
                        </span>
                      </div>
                      <div className="space-y-1.5 pt-1">
                        {selectedTask.subtasks.map((st) => (
                          <div
                            key={st.id}
                            onClick={() => handleToggleSubtaskInDetail(st.id)}
                            className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-slate-100 hover:bg-indigo-50/50 transition-colors cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={st.done}
                              onChange={() => {}}
                              className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                            />
                            <span
                              className={`text-xs ${
                                st.done
                                  ? "line-through text-slate-400 font-normal"
                                  : "text-slate-800 font-medium"
                              }`}
                            >
                              {st.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Review Notes from Manager / Admin */}
                  {selectedTask.reviewNotes && (
                    <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 text-xs">
                      <div className="font-bold text-amber-900 mb-1 flex items-center gap-1">
                        <span>💬</span> ข้อคิดเห็น / บันทึกการตรวจทาน:
                      </div>
                      <div className="text-amber-800 whitespace-pre-wrap">
                        {selectedTask.reviewNotes}
                      </div>
                    </div>
                  )}

                  {/* Metadata Info Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">ผู้รับผิดชอบหลัก:</span>
                      <span className="font-bold text-slate-800">👤 {selectedTask.assignee}</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">กำหนดส่ง (Due Date):</span>
                      <span className="font-bold text-slate-800">📅 {selectedTask.due}</span>
                    </div>

                    {selectedTask.createdByName && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block text-[11px]">ผู้สร้างงาน:</span>
                        <span className="font-medium text-slate-700">
                          ✍️ {selectedTask.createdByName}
                        </span>
                      </div>
                    )}

                    {selectedTask.createdAt && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-slate-400 block text-[11px]">บันทึกลงระบบเมื่อ:</span>
                        <span className="font-mono text-slate-600">
                          {new Date(selectedTask.createdAt).toLocaleDateString("th-TH")}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* EDIT FORM */
                <form onSubmit={handleSaveEditTask} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ชื่องาน</label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      รายละเอียดงาน
                    </label>
                    <textarea
                      rows={3}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-indigo-500"
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ขอบเขตสิทธิ์
                      </label>
                      <select
                        value={editVisibility}
                        onChange={(e) => setEditVisibility(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-indigo-500"
                      >
                        <option value="department">👥 เฉพาะกลุ่มงาน (Manager Group)</option>
                        <option value="individual">🔒 เฉพาะบุคคล (ผู้รับผิดชอบ & หน.ฝ่าย)</option>
                        <option value="public">🏢 ทั้งสำนักงาน พมจ.</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        กลุ่มงาน / ฝ่าย
                      </label>
                      <select
                        value={editDept}
                        onChange={(e) => setEditDept(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-indigo-500"
                      >
                        {GOVERNMENT_DIVISIONS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ผู้รับผิดชอบ
                      </label>
                      <select
                        value={editAssigneeId}
                        onChange={(e) => setEditAssigneeId(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-indigo-500"
                      >
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ความเร่งด่วน
                      </label>
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-indigo-500"
                      >
                        <option value="high">🔥 สูงมาก</option>
                        <option value="medium">🟡 ปานกลาง</option>
                        <option value="low">🟢 ทั่วไป</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        กำหนดส่ง
                      </label>
                      <input
                        type="text"
                        value={editDue}
                        onChange={(e) => setEditDue(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ข้อคิดเห็น / บันทึกการตรวจทาน (Review Feedback)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="ความเห็นจากหัวหน้าฝ่าย หรือข้อเสนอแนะในการปรับปรุง..."
                      value={editReviewNotes}
                      onChange={(e) => setEditReviewNotes(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs bg-amber-50/50 border border-amber-200 rounded-xl text-slate-800 focus:bg-white"
                    ></textarea>
                  </div>

                  <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsEditingTask(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#4F46E5] text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700"
                    >
                      บันทึกการแก้ไข
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
