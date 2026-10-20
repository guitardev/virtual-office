"use client";

import React, { useState, useMemo } from "react";
import { MeetingItem, Member, MeetingCategory, MeetingType } from "@/lib/types";
import { saveMeeting, deleteMeeting } from "@/lib/supabase";
import {
  createGoogleCalendarUrl,
  createOutlookCalendarUrl,
  downloadMeetingIcs,
  downloadAllMeetingsIcs,
  getMeetingDateRange,
  getAttendeeName,
  getAttendeeEmail,
} from "@/lib/calendar";
import {
  MEETING_CATEGORY_CONFIG,
  MEETING_TYPE_CONFIG,
  ROOM_PRESETS,
  MEETING_TEMPLATES,
  MeetingPresetTemplate,
} from "@/lib/meeting-data";

interface MeetingsPageProps {
  meetings: MeetingItem[];
  showToast: (msg: string) => void;
  currentUser?: Member | null;
  setMeetings?: React.Dispatch<React.SetStateAction<MeetingItem[]>>;
  members?: Member[];
}

export function MeetingsPage({
  meetings,
  showToast,
  currentUser,
  setMeetings,
  members = [],
}: MeetingsPageProps) {
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | MeetingCategory>("all");
  const [selectedType, setSelectedType] = useState<"all" | MeetingType>("all");
  const [timeframe, setTimeframe] = useState<"upcoming" | "all" | "past">("all");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingItem | null>(null);
  const [calendarDropdownId, setCalendarDropdownId] = useState<string | number | null>(null);

  // Form State for Create/Edit Meeting
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<MeetingCategory>("general");
  const [formType, setFormType] = useState<MeetingType>("hybrid");
  const [formLocation, setFormLocation] = useState("ห้องประชุม 1 (ศาลากลางจังหวัด ชั้น 2)");
  const [formMeetingLink, setFormMeetingLink] = useState("https://meet.google.com/kpp-msoc");
  const [formDate, setFormDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [formStartTime, setFormStartTime] = useState("09:30");
  const [formEndTime, setFormEndTime] = useState("11:30");
  const [formDescription, setFormDescription] = useState("");
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<string[]>([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // Helper to open Add Modal with fresh defaults
  const handleOpenAddModal = () => {
    setFormTitle("");
    setFormCategory("general");
    setFormType("hybrid");
    setFormLocation("ห้องประชุม 1 (ศาลากลางจังหวัด ชั้น 2)");
    setFormMeetingLink("https://meet.google.com/kpp-msoc");
    const today = new Date();
    setFormDate(today.toISOString().slice(0, 10));
    setFormStartTime("09:30");
    setFormEndTime("11:30");
    setFormDescription("");
    // Default attendees: current user + all managers or active members
    if (currentUser?.id) {
      setSelectedAttendeeIds([currentUser.id]);
    } else {
      setSelectedAttendeeIds([]);
    }
    setShowAddModal(true);
  };

  // Apply template
  const handleApplyTemplate = (tpl: MeetingPresetTemplate) => {
    setFormTitle(tpl.title);
    setFormCategory(tpl.category);
    setFormType(tpl.type);
    setFormLocation(tpl.location);
    if (tpl.meetingLink) setFormMeetingLink(tpl.meetingLink);
    setFormDescription(tpl.description);
    setShowTemplatePicker(false);
    showToast(`📋 นำเข้าแม่แบบ "${tpl.name}" เรียบร้อย`);
  };

  // Submit new meeting
  const handleSaveMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast("⚠️ กรุณาระบุหัวข้อการประชุม");
      return;
    }

    const startDateTime = new Date(`${formDate}T${formStartTime}:00`);
    const endDateTime = new Date(`${formDate}T${formEndTime}:00`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      showToast("⚠️ รูปแบบวันที่หรือเวลาไม่ถูกต้อง");
      return;
    }

    const dateStr = startDateTime.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const timeStr = `${formStartTime} - ${formEndTime} น.`;

    // Map selected attendee IDs to attendee objects
    const resolvedAttendees = selectedAttendeeIds.map((id) => {
      const m = members.find((mem) => mem.id === id);
      return {
        id,
        name: m?.name || id,
        email: m?.email || undefined,
        division: m?.division || undefined,
        role: "member" as const,
        status: "accepted" as const,
      };
    });

    const newMeeting: MeetingItem = {
      id: `mtg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: formTitle.trim(),
      description: formDescription.trim() || undefined,
      category: formCategory,
      type: formType,
      location:
        formType === "online"
          ? "ห้องประชุมออนไลน์ Google Meet"
          : formLocation.trim() || "สำนักงาน พมจ.กำแพงเพชร",
      meetingLink: formType === "onsite" ? undefined : formMeetingLink.trim() || undefined,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      dateStr,
      timeStr,
      status: "confirmed",
      attendees: resolvedAttendees.length > 0 ? resolvedAttendees : ["ข้าราชการและเจ้าหน้าที่ พมจ."],
      organizer: currentUser
        ? {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            division: currentUser.division,
            phone: currentUser.phone,
          }
        : undefined,
      createdAt: new Date().toISOString(),
    };

    if (setMeetings) {
      setMeetings((prev) => [newMeeting, ...prev]);
    }
    setShowAddModal(false);
    showToast("✅ บันทึกนัดหมายการประชุมเรียบร้อยแล้ว (ซิงก์ขึ้น Cloud)");

    saveMeeting(newMeeting).catch((err) => {
      console.error("Failed to save meeting to Supabase:", err);
    });
  };

  // Delete meeting
  const handleDeleteMeeting = async (id: string | number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("คุณต้องการยกเลิกและลบนัดหมายการประชุมนี้ใช่หรือไม่?")) return;

    if (setMeetings) {
      setMeetings((prev) => prev.filter((m) => m.id !== id));
    }
    if (selectedMeeting?.id === id) {
      setSelectedMeeting(null);
    }
    showToast("🗑️ ยกเลิกนัดหมายการประชุมเรียบร้อย");

    deleteMeeting(id).catch((err) => {
      console.error("Failed to delete meeting from Supabase:", err);
    });
  };

  // Copy formal Thai meeting invitation text
  const handleCopyInvitation = (meeting: MeetingItem) => {
    const lines: string[] = [
      `📢 ขอเชิญประชุม: ${meeting.title}`,
      `📅 วันที่: ${meeting.dateStr} เวลา: ${meeting.timeStr}`,
      `📍 สถานที่: ${meeting.location}`,
    ];
    if (meeting.meetingLink) {
      lines.push(`📹 ลิงก์ห้องประชุมออนไลน์: ${meeting.meetingLink}`);
    }
    if (meeting.description) {
      lines.push(`\nระเบียบวาระการประชุม:\n${meeting.description}`);
    }
    if (meeting.attendees && meeting.attendees.length > 0) {
      const names = meeting.attendees.map(getAttendeeName).join(", ");
      lines.push(`\n👥 ผู้เข้าร่วม: ${names}`);
    }
    if (meeting.organizer) {
      lines.push(`👤 ผู้ประสานงาน: ${meeting.organizer.name} (${meeting.organizer.division || "พมจ.กำแพงเพชร"})`);
    }

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(lines.join("\n")).catch(() => {});
    }
    showToast("📋 คัดลอกข้อความเชิญประชุมมาตรฐานราชการเรียบร้อย");
  };

  // Filtered meetings
  const filteredMeetings = useMemo(() => {
    const now = new Date();
    return meetings.filter((m) => {
      // Category filter
      if (selectedCategory !== "all" && m.category !== selectedCategory) {
        return false;
      }
      // Type filter
      if (selectedType !== "all" && m.type !== selectedType) {
        return false;
      }
      // Timeframe filter
      if (timeframe !== "all") {
        const { endDate } = getMeetingDateRange(m);
        if (timeframe === "upcoming" && endDate.getTime() < now.getTime()) {
          return false;
        }
        if (timeframe === "past" && endDate.getTime() >= now.getTime()) {
          return false;
        }
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = m.title.toLowerCase().includes(q);
        const locMatch = m.location?.toLowerCase().includes(q);
        const descMatch = m.description?.toLowerCase().includes(q);
        const attendeeMatch = (m.attendees || []).some((att) =>
          getAttendeeName(att).toLowerCase().includes(q)
        );
        if (!titleMatch && !locMatch && !descMatch && !attendeeMatch) {
          return false;
        }
      }
      return true;
    });
  }, [meetings, selectedCategory, selectedType, timeframe, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ─── HEADER BAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📅</span>
            <h1 className="text-2xl font-bold font-heading text-slate-900">
              การประชุมและนัดหมาย (Meetings)
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Supabase Live</span>
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            จัดการตารางการประชุม วาระการประชุม และเชื่อมโยง Google Calendar / iCal / Outlook อัตโนมัติ
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {meetings.length > 0 && (
            <button
              type="button"
              onClick={() => {
                downloadAllMeetingsIcs(meetings);
                showToast("📥 ดาวน์โหลดปฏิทินการประชุมทั้งหมด (.ics) เรียบร้อย");
              }}
              className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title="ดาวน์โหลดไฟล์ .ics รวมทุกการประชุมเพื่อนำเข้าใน Calendar มือถือหรือคอมพิวเตอร์"
            >
              <span>📥</span>
              <span>ส่งออกปฏิทิน (.ics)</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>➕</span>
            <span>สร้างการประชุมใหม่</span>
          </button>
        </div>
      </div>

      {/* ─── FILTERS & SEARCH BAR ─── */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            <input
              type="text"
              placeholder="ค้นหาตามหัวข้อ, สถานที่, วาระ, หรือผู้เข้าร่วมประชุม..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Timeframe Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl text-xs self-start md:self-auto">
            <button
              type="button"
              onClick={() => setTimeframe("all")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                timeframe === "all"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ทั้งหมด ({meetings.length})
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("upcoming")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                timeframe === "upcoming"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              กำลังจะถึง
            </button>
            <button
              type="button"
              onClick={() => setTimeframe("past")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                timeframe === "past"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ที่ผ่านมาแล้ว
            </button>
          </div>
        </div>

        {/* Categories & Type Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          {/* Categories */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 mr-1">หมวดหมู่:</span>
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-slate-800 text-white shadow-2xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              ทั้งหมด
            </button>
            {(Object.keys(MEETING_CATEGORY_CONFIG) as MeetingCategory[]).map((cat) => {
              const cfg = MEETING_CATEGORY_CONFIG[cat];
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(isSelected ? "all" : cat)}
                  className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                      : `${cfg.bg} ${cfg.text} ${cfg.border} hover:opacity-80`
                  }`}
                >
                  <span>{cfg.icon}</span>
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>

          {/* Types */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-400 mr-1">รูปแบบ:</span>
            <button
              type="button"
              onClick={() => setSelectedType("all")}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                selectedType === "all"
                  ? "bg-slate-800 text-white shadow-2xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              ทั้งหมด
            </button>
            <button
              type="button"
              onClick={() => setSelectedType("online")}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                selectedType === "online"
                  ? "bg-teal-600 text-white border-teal-600"
                  : "bg-teal-50 text-teal-700 border-teal-200"
              }`}
            >
              <span>🌐</span>
              <span>ออนไลน์</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedType("onsite")}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                selectedType === "onsite"
                  ? "bg-amber-600 text-white border-amber-600"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              <span>🏢</span>
              <span>ออนไซต์</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedType("hybrid")}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                selectedType === "hybrid"
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-purple-50 text-purple-700 border-purple-200"
              }`}
            >
              <span>🔄</span>
              <span>ไฮบริด</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── MEETINGS LIST / GRID ─── */}
      {filteredMeetings.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-3 shadow-2xs">
          <span className="text-5xl block mb-2">📹</span>
          <h3 className="font-bold font-heading text-lg text-slate-800">
            {searchQuery || selectedCategory !== "all" || selectedType !== "all"
              ? "ไม่พบนัดหมายการประชุมตามเงื่อนไขที่เลือก"
              : "ยังไม่มีนัดหมายการประชุมในระบบ"}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            ท่านสามารถสร้างการประชุมใหม่ กำหนดสถานที่ ระเบียบวาระ และเชิญบุคลากร พร้อมบันทึกลง Google Calendar ได้ทันที
          </p>
          <div className="pt-2 flex items-center justify-center gap-2">
            {(searchQuery || selectedCategory !== "all" || selectedType !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setSelectedType("all");
                  setTimeframe("all");
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                ล้างตัวกรอง
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              + สร้างการประชุมใหม่
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMeetings.map((m) => {
            const catCfg =
              MEETING_CATEGORY_CONFIG[m.category || "general"] || MEETING_CATEGORY_CONFIG.general;
            const typeCfg =
              MEETING_TYPE_CONFIG[m.type || "onsite"] || MEETING_TYPE_CONFIG.onsite;

            const isDropdownOpen = calendarDropdownId === m.id;

            return (
              <div
                key={m.id}
                className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-4 hover:shadow-md transition-all group relative"
              >
                <div>
                  {/* Category & Badges Row */}
                  <div className="flex items-center justify-between text-xs font-bold mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${catCfg.bg} ${catCfg.text} ${catCfg.border}`}
                      >
                        <span>{catCfg.icon}</span>
                        <span>{catCfg.label}</span>
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${typeCfg.bg} ${typeCfg.text} ${typeCfg.border}`}
                      >
                        <span>{typeCfg.icon}</span>
                        <span>{m.type === "online" ? "Online" : m.type === "hybrid" ? "Hybrid" : "Onsite"}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => handleDeleteMeeting(m.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 text-xs p-1 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                        title="ยกเลิกนัดหมายนี้"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3
                    onClick={() => setSelectedMeeting(m)}
                    className="text-base font-bold font-heading text-slate-900 mb-2 leading-snug cursor-pointer hover:text-indigo-600 transition-colors"
                  >
                    {m.title}
                  </h3>

                  {/* Date & Time with icon */}
                  <div className="flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50/70 px-3 py-1.5 rounded-xl font-bold mb-3 border border-indigo-100">
                    <span>🕒</span>
                    <span>{m.dateStr}</span>
                    <span>·</span>
                    <span className="font-mono">{m.timeStr}</span>
                  </div>

                  {/* Location */}
                  <div className="flex items-start gap-1.5 text-xs text-slate-600 mb-2">
                    <span className="shrink-0 text-slate-400">📍</span>
                    <span className="font-medium text-slate-700 line-clamp-1">{m.location}</span>
                  </div>

                  {/* Agenda snippet */}
                  {m.description && (
                    <div className="text-xs text-slate-500 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3">
                      {m.description}
                    </div>
                  )}

                  {/* Attendees Preview */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1 font-semibold text-slate-600">
                      <span>👥</span>
                      <span>ผู้เข้าร่วม ({m.attendees?.length || 1} คน)</span>
                    </span>
                    <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                      {m.attendees?.slice(0, 2).map(getAttendeeName).join(", ")}
                      {(m.attendees?.length || 0) > 2 ? "..." : ""}
                    </span>
                  </div>
                </div>

                {/* ─── ACTION BUTTONS ─── */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center gap-2">
                    {/* Join Online Button (if available) */}
                    {m.meetingLink && (m.type === "online" || m.type === "hybrid") ? (
                      <a
                        href={m.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold text-center transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <span>📹</span>
                        <span>เข้าห้อง Meet</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedMeeting(m)}
                        className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold text-center transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <span>🏢</span>
                        <span>ดูสถานที่นัด</span>
                      </button>
                    )}

                    {/* View Details Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedMeeting(m)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      รายละเอียด
                    </button>
                  </div>

                  {/* Standard Calendar Actions */}
                  <div className="relative">
                    <div className="flex items-center gap-1.5">
                      {/* Direct Google Calendar 1-Click Link */}
                      <a
                        href={createGoogleCalendarUrl(m)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-[11px] font-bold text-center transition-colors flex items-center justify-center gap-1"
                        title="เปิด Google Calendar เพื่อบันทึกนัดหมายลงบัญชี Google อัตโนมัติ"
                      >
                        <span>🔵</span>
                        <span>เพิ่มลง Google Calendar</span>
                      </a>

                      {/* Dropdown for iCal (.ics) / Outlook */}
                      <button
                        type="button"
                        onClick={() =>
                          setCalendarDropdownId(isDropdownOpen ? null : m.id)
                        }
                        className="p-1.5 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-[11px] font-bold transition-colors cursor-pointer"
                        title="ตัวเลือกปฏิทินอื่นๆ (iCal, Outlook, คัดลอกข้อความ)"
                      >
                        📅 ▾
                      </button>
                    </div>

                    {/* Calendar Dropdown Menu */}
                    {isDropdownOpen && (
                      <div className="absolute right-0 bottom-full mb-1.5 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-30 animate-fade-in text-xs space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            downloadMeetingIcs(m);
                            setCalendarDropdownId(null);
                            showToast("📥 ดาวน์โหลดไฟล์ .ics เรียบร้อย (ดับเบิลคลิกเพื่อเปิดใน Calendar/Outlook)");
                          }}
                          className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-2 cursor-pointer"
                        >
                          <span>📥</span>
                          <div>
                            <div>ดาวน์โหลดไฟล์ iCal (.ics)</div>
                            <div className="text-[10px] text-slate-400 font-normal">สำหรับ Outlook, Apple, มือถือ</div>
                          </div>
                        </button>

                        <a
                          href={createOutlookCalendarUrl(m)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => setCalendarDropdownId(null)}
                          className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-2 cursor-pointer"
                        >
                          <span>✉️</span>
                          <div>
                            <div>เพิ่มลง Outlook Web</div>
                            <div className="text-[10px] text-slate-400 font-normal">Microsoft 365 Calendar</div>
                          </div>
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            handleCopyInvitation(m);
                            setCalendarDropdownId(null);
                          }}
                          className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 font-bold text-indigo-700 flex items-center gap-2 cursor-pointer"
                        >
                          <span>📋</span>
                          <div>
                            <div>คัดลอกข้อความเชิญประชุม</div>
                            <div className="text-[10px] text-slate-400 font-normal">สำหรับส่งใน LINE หรืออีเมล</div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── MODAL: MEETING DETAIL VIEW ─── */}
      {selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 via-teal-50 to-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📅</span>
                <div>
                  <h3 className="font-bold font-heading text-slate-900 text-base">
                    รายละเอียดการประชุมและนัดหมาย
                  </h3>
                  <div className="text-[11px] text-slate-500 font-mono">
                    ID: {selectedMeeting.id}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMeeting(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                {(() => {
                  const catCfg =
                    MEETING_CATEGORY_CONFIG[selectedMeeting.category || "general"] ||
                    MEETING_CATEGORY_CONFIG.general;
                  const typeCfg =
                    MEETING_TYPE_CONFIG[selectedMeeting.type || "onsite"] ||
                    MEETING_TYPE_CONFIG.onsite;
                  return (
                    <>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${catCfg.bg} ${catCfg.text} ${catCfg.border} flex items-center gap-1`}>
                        <span>{catCfg.icon}</span>
                        <span>{catCfg.label}</span>
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${typeCfg.bg} ${typeCfg.text} ${typeCfg.border} flex items-center gap-1`}>
                        <span>{typeCfg.icon}</span>
                        <span>{typeCfg.label}</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        สถานะ: ยืนยันการประชุม (Confirmed)
                      </span>
                    </>
                  );
                })()}
              </div>

              {/* Title */}
              <div>
                <h2 className="text-xl font-bold font-heading text-slate-900 leading-snug">
                  {selectedMeeting.title}
                </h2>
              </div>

              {/* Date, Time, Location Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold block mb-1">📅 วันและเวลา:</span>
                  <div className="text-slate-800 font-bold text-sm">
                    {selectedMeeting.dateStr}
                  </div>
                  <div className="text-indigo-700 font-mono font-bold mt-0.5">
                    {selectedMeeting.timeStr}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Timezone: Asia/Bangkok (UTC+07:00)
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 font-semibold block mb-1">📍 สถานที่ / ห้องประชุม:</span>
                  <div className="text-slate-800 font-bold">
                    {selectedMeeting.location}
                  </div>
                  {selectedMeeting.meetingLink && (
                    <div className="mt-1.5">
                      <a
                        href={selectedMeeting.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-teal-700 hover:text-teal-800 font-mono text-[11px] font-bold underline flex items-center gap-1"
                      >
                        <span>📹 {selectedMeeting.meetingLink}</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Agenda / Description */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <span>📝</span>
                  <span>ระเบียบวาระและรายละเอียดการประชุม:</span>
                </h4>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedMeeting.description || "ไม่มีรายละเอียดเพิ่มเติม"}
                </div>
              </div>

              {/* Attendees List */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>👥</span>
                    <span>ผู้เข้าร่วมประชุม ({selectedMeeting.attendees?.length || 0} คน):</span>
                  </span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                  {(selectedMeeting.attendees || []).map((att, idx) => {
                    const name = getAttendeeName(att);
                    const email = getAttendeeEmail(att);
                    const division = typeof att === "object" ? att.division : undefined;

                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100 text-xs"
                      >
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                          {name.slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-800 truncate">{name}</div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {division || email || "เจ้าหน้าที่"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Organizer Card */}
              {selectedMeeting.organizer && (
                <div className="p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">👤</span>
                    <div>
                      <div className="text-[10px] text-indigo-600 font-bold">ผู้ประสานงาน / ผู้จัดการประชุม:</div>
                      <div className="font-bold text-slate-800">
                        {selectedMeeting.organizer.name}
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 text-right">
                    {selectedMeeting.organizer.division}
                  </div>
                </div>
              )}

              {/* Calendar Export Standard Buttons */}
              <div className="p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-2xl border border-blue-100 space-y-2.5">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>📅</span>
                  <span>บันทึกลงปฏิทินตามมาตรฐานสากล (Calendar Sync):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <a
                    href={createGoogleCalendarUrl(selectedMeeting)}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold text-center transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span>🔵</span>
                    <span>Google Calendar</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => downloadMeetingIcs(selectedMeeting)}
                    className="py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span>📥</span>
                    <span>ดาวน์โหลด .ics</span>
                  </button>

                  <a
                    href={createOutlookCalendarUrl(selectedMeeting)}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 bg-[#0078D4] hover:bg-[#006cbd] text-white rounded-xl text-xs font-bold text-center transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span>✉️</span>
                    <span>Outlook Web</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleCopyInvitation(selectedMeeting)}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-indigo-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>📋</span>
                <span>คัดลอกข้อความเชิญ</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDeleteMeeting(selectedMeeting.id)}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  ยกเลิกการประชุม
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMeeting(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE / NEW MEETING FORM ─── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-teal-50 via-indigo-50 to-white border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">📅</span>
                <div>
                  <h3 className="font-bold font-heading text-slate-900 text-base">
                    สร้างการประชุมและนัดหมายใหม่
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    กำหนดข้อมูลมาตรฐานเพื่อซิงก์ Cloud และ Calendar ภายนอก
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveMeetingSubmit} className="p-6 overflow-y-auto space-y-4">
              {/* Quick Template Picker */}
              <div className="p-3 bg-indigo-50/80 border border-indigo-100 rounded-2xl">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                    <span>📑</span>
                    <span>แม่แบบการประชุมราชการมาตรฐาน:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                    className="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                  >
                    {showTemplatePicker ? "ซ่อนแม่แบบ ▲" : "เลือกแม่แบบ ▼"}
                  </button>
                </div>

                {showTemplatePicker && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-indigo-100/80 animate-fade-in">
                    {MEETING_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => handleApplyTemplate(tpl)}
                        className="p-2.5 bg-white hover:bg-indigo-100/50 border border-indigo-200 rounded-xl text-left text-xs transition-colors cursor-pointer group"
                      >
                        <div className="font-bold text-slate-800 group-hover:text-indigo-700 truncate">
                          {tpl.name}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                          {tpl.location} · {tpl.defaultDurationHours} ชม.
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หัวข้อการประชุม <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ประชุมชี้แจงแนวทางการเบิกจ่ายงบประมาณ ประจำปี ๒๕๖๙"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 transition-colors font-semibold"
                />
              </div>

              {/* Category & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    หมวดหมู่การประชุม
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as MeetingCategory)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-indigo-500 transition-colors"
                  >
                    <option value="general">📋 ประชุมทั่วไป</option>
                    <option value="division">🏢 ประชุมกลุ่มงาน/ฝ่าย</option>
                    <option value="management">👔 ประชุมผู้บริหาร</option>
                    <option value="urgent">🚨 ประชุมด่วน/เฉพาะกิจ</option>
                    <option value="external">🌐 ประชุมภายนอก/เครือข่าย</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    รูปแบบการประชุม
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFormType("online")}
                      className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer text-center ${
                        formType === "online"
                          ? "bg-teal-50 text-teal-700 border-teal-300 shadow-2xs"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      🌐 Online
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormType("onsite")}
                      className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer text-center ${
                        formType === "onsite"
                          ? "bg-amber-50 text-amber-700 border-amber-300 shadow-2xs"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      🏢 Onsite
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormType("hybrid")}
                      className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer text-center ${
                        formType === "hybrid"
                          ? "bg-purple-50 text-purple-700 border-purple-300 shadow-2xs"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      🔄 Hybrid
                    </button>
                  </div>
                </div>
              </div>

              {/* Date, Start Time, End Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    วันที่จัดประชุม <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    เวลาเริ่มต้น <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-indigo-500 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    เวลาสิ้นสุด <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-indigo-500 transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Location & Room Preset */}
              {formType !== "online" && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      สถานที่ / ห้องประชุม <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-400">เลือกจากห้องมาตรฐานหรือพิมพ์เอง</span>
                  </div>
                  <div className="space-y-1.5">
                    <select
                      onChange={(e) => {
                        if (e.target.value) setFormLocation(e.target.value);
                      }}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                    >
                      <option value="">-- เลือกจากห้องประชุมของสำนักงาน --</option>
                      {ROOM_PRESETS.map((room) => (
                        <option key={room} value={room}>
                          {room}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      required
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      placeholder="ระบุสถานที่ หรืออาคาร/ห้องประชุม..."
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Online Meeting Link */}
              {formType !== "onsite" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ลิงก์ห้องประชุมออนไลน์ (Google Meet / Teams / Zoom)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="url"
                      value={formMeetingLink}
                      onChange={(e) => setFormMeetingLink(e.target.value)}
                      placeholder="https://meet.google.com/xxx-xxxx-xxx"
                      className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-indigo-500 transition-colors font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setFormMeetingLink("https://meet.google.com/kpp-msoc")}
                      className="px-2.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-xl text-[11px] font-bold whitespace-nowrap cursor-pointer"
                    >
                      Meet กลาง
                    </button>
                  </div>
                </div>
              )}

              {/* Description & Agenda */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รายละเอียดและระเบียบวาระการประชุม (Agenda)
                </label>
                <textarea
                  rows={4}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={`ระบุวาระการประชุม เช่น:\nวาระที่ ๑: เรื่องที่ประธานแจ้งให้ที่ประชุมทราบ\nวาระที่ ๒: รับรองรายงานการประชุมครั้งที่แล้ว\nวาระที่ ๓: เรื่องเพื่อพิจารณา...`}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 transition-colors font-sans leading-relaxed resize-none"
                />
              </div>

              {/* Attendees Picker */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    ผู้เข้าร่วมประชุม ({selectedAttendeeIds.length} คน)
                  </label>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setSelectedAttendeeIds(members.map((m) => m.id))}
                      className="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                    >
                      เลือกทุกคน
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedAttendeeIds(
                          members
                            .filter((m) => m.role === "manager" || m.role === "admin")
                            .map((m) => m.id)
                        )
                      }
                      className="text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                    >
                      เฉพาะหัวหน้าฝ่าย
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => setSelectedAttendeeIds([])}
                      className="text-slate-400 hover:text-slate-600 underline cursor-pointer"
                    >
                      ล้าง
                    </button>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl max-h-40 overflow-y-auto space-y-1">
                  {members.map((m) => {
                    const isChecked = selectedAttendeeIds.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={`flex items-center gap-2 p-1.5 rounded-xl text-xs cursor-pointer transition-colors ${
                          isChecked ? "bg-indigo-50/70 text-indigo-900" : "hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAttendeeIds((prev) => [...prev, m.id]);
                            } else {
                              setSelectedAttendeeIds((prev) => prev.filter((id) => id !== m.id));
                            }
                          }}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-bold truncate">{m.name}</span>
                        <span className="text-[10px] text-slate-400 truncate">
                          ({m.division || m.position})
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>💾</span>
                  <span>บันทึกนัดหมายลง Supabase</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
