"use client";

import React, { useState } from "react";
import { MeetingItem, Member } from "@/lib/types";
import { saveMeeting, deleteMeeting } from "@/lib/supabase";

interface MeetingsPageProps {
  meetings: MeetingItem[];
  showToast: (msg: string) => void;
  currentUser?: Member | null;
  setMeetings?: React.Dispatch<React.SetStateAction<MeetingItem[]>>;
}

export function MeetingsPage({
  meetings,
  showToast,
  currentUser,
  setMeetings,
}: MeetingsPageProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"online" | "onsite">("online");
  const [location, setLocation] = useState("ห้องประชุม 1 (ศาลากลางจังหวัด)");
  const [meetingLink, setMeetingLink] = useState("https://meet.google.com/kpp-msoc");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:30");
  const [endTime, setEndTime] = useState("11:30");

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newMeeting: MeetingItem = {
      id: `mtg_${Date.now()}`,
      title: title.trim(),
      dateStr: date ? new Date(date).toLocaleDateString("th-TH") : "วันนี้",
      timeStr: `${startTime} - ${endTime} น.`,
      location: type === "online" ? "ห้องประชุมออนไลน์ Google Meet" : location,
      type,
      attendees: [currentUser?.name || "ข้าราชการและเจ้าหน้าที่ พมจ."],
      meetingLink: type === "online" ? meetingLink : undefined,
    };

    if (setMeetings) {
      setMeetings((prev) => [...prev, newMeeting]);
    }
    setShowAddModal(false);
    setTitle("");
    showToast("✅ สร้างนัดหมายการประชุมลง Supabase เรียบร้อยแล้ว");

    saveMeeting(newMeeting).catch((err) => {
      console.error("Failed to save meeting to Supabase:", err);
    });
  };

  const handleDeleteMeeting = async (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("คุณต้องการยกเลิกการประชุมนี้ใช่หรือไม่?")) return;

    if (setMeetings) {
      setMeetings((prev) => prev.filter((m) => m.id !== id));
    }
    showToast("🗑️ ยกเลิกการประชุมเรียบร้อย");

    deleteMeeting(id).catch((err) => {
      console.error("Failed to delete meeting from Supabase:", err);
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold font-heading text-slate-900">การประชุมและนัดหมาย (Meetings)</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              🟢 Supabase Live
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-0.5">จัดการตารางประชุมและห้องออนไลน์ขององค์กร ซิงก์บน Cloud</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-[#4F46E5] text-white rounded-2xl text-sm font-bold shadow-md shadow-indigo-600/25 hover:bg-[#4338CA] transition-all cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto"
        >
          <span>➕</span>
          <span>สร้างการประชุมใหม่</span>
        </button>
      </div>

      {meetings.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200/80 text-center space-y-3">
          <span className="text-5xl block mb-2">📹</span>
          <h3 className="font-bold font-heading text-lg text-slate-800">ยังไม่มีนัดหมายการประชุม</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            คุณสามารถกดปุ่ม &ldquo;สร้างการประชุมใหม่&rdquo; ด้านบน เพื่อกำหนดตารางนัดหมายและสร้างลิงก์ประชุมออนไลน์
          </p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-[#4F46E5] rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            + สร้างการประชุมแรก
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {meetings.map((m) => (
            <div
              key={m.id}
              className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-4 hover:shadow-md transition-all group"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-[#4F46E5] font-bold mb-2">
                  <span className="font-mono">{m.dateStr} · {m.timeStr}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${m.type === "online" ? "bg-teal-50 text-teal-700 border border-teal-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                      {m.type === "online" ? "🌐 Online" : "🏢 Onsite"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteMeeting(m.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 text-xs p-0.5 transition-opacity"
                      title="ยกเลิกนัดหมาย"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <h3 className="text-base font-bold font-heading text-slate-900 mb-2 leading-snug">{m.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                  สถานที่: <span className="font-semibold text-slate-700">{m.location}</span>
                </p>
                <div className="text-xs text-slate-400 truncate">
                  ผู้เข้าร่วม: {m.attendees?.join(", ") || "เจ้าหน้าที่ พมจ."}
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                {m.type === "online" && m.meetingLink ? (
                  <a
                    href={m.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 bg-[#0D9488] hover:bg-[#0b7a6f] text-white rounded-xl text-xs font-bold text-center transition-colors cursor-pointer shadow-xs"
                  >
                    📹 เข้าห้องประชุม Meet
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => showToast(`📍 สถานที่นัดหมาย: ${m.location}`)}
                    className="flex-1 py-2.5 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    🏢 ดูสถานที่ประชุม
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => showToast(`📋 รายละเอียดการประชุม: ${m.title} (${m.timeStr})`)}
                  className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  รายละเอียด
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── MODAL: CREATE MEETING ─── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="px-6 py-4 bg-gradient-to-r from-teal-50 to-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📅</span>
                <h3 className="font-bold font-heading text-slate-900 text-base">สร้างการประชุมใหม่</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMeeting} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  หัวข้อการประชุม <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น ประชุมชี้แจงแนวทางการเบิกจ่ายงบประมาณ"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-teal-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รูปแบบการประชุม
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType("online")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      type === "online"
                        ? "bg-teal-50 text-teal-700 border-teal-300 shadow-2xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>🌐</span>
                    <span>ออนไลน์ (Meet)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("onsite")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      type === "onsite"
                        ? "bg-amber-50 text-amber-700 border-amber-300 shadow-2xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>🏢</span>
                    <span>ออนไซต์ (ใน สนง.)</span>
                  </button>
                </div>
              </div>

              {type === "online" ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ลิงก์ห้องประชุมออนไลน์
                  </label>
                  <input
                    type="url"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-teal-500 transition-colors font-mono"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ห้องประชุม / สถานที่
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-teal-500 transition-colors"
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    วันที่
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-teal-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    เวลาเริ่ม
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-teal-500 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    เวลาสิ้นสุด
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-teal-500 transition-colors font-mono"
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
                  className="px-5 py-2 bg-[#0D9488] hover:bg-[#0b7a6f] text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer"
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
