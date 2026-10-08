"use client";

import React from "react";
import { MeetingItem } from "@/lib/types";

interface MeetingsPageProps {
  meetings: MeetingItem[];
  showToast: (msg: string) => void;
}

export function MeetingsPage({ meetings, showToast }: MeetingsPageProps) {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-900">การประชุมและนัดหมาย (Meetings)</h1>
          <p className="text-slate-500 text-sm mt-0.5">จัดการตารางประชุมและห้องออนไลน์ขององค์กร</p>
        </div>
        <button
          type="button"
          onClick={() => showToast("📅 เปิดหน้าต่างสร้างการประชุมเรียบร้อย")}
          className="px-4 py-2 bg-[#4F46E5] text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/25 hover:bg-[#4338CA] transition-colors cursor-pointer"
        >
          + สร้างการประชุมใหม่
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {meetings.map((m) => (
          <div key={m.id} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
            <div>
              <div className="flex items-center justify-between text-xs text-[#4F46E5] font-bold mb-2">
                <span>{m.dateStr} · {m.timeStr}</span>
                <span>{m.type === "online" ? "🌐 Online" : "🏢 Onsite"}</span>
              </div>
              <h3 className="text-base font-bold font-heading text-slate-900 mb-2">{m.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-3">
                สถานที่: <span className="font-semibold text-slate-700">{m.location}</span>
              </p>
              <div className="text-xs text-slate-400">
                ผู้เข้าร่วม: {m.attendees.join(", ")}
              </div>
            </div>
            <div className="flex gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => showToast(`🎥 กำลังเข้าห้องประชุม: ${m.title}`)}
                className="flex-1 py-2 bg-[#0D9488] text-white rounded-xl text-xs font-bold hover:bg-[#0b7a6f] transition-colors cursor-pointer"
              >
                📹 เข้าห้องประชุม
              </button>
              <button
                type="button"
                onClick={() => showToast(`📋 ดูรายละเอียดการประชุม ${m.title}`)}
                className="px-3.5 py-2 bg-indigo-50 text-[#4F46E5] border border-indigo-200 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                รายละเอียด
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
