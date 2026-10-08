"use client";

import React, { useState } from "react";
import { Member } from "@/lib/types";

interface ChatPageProps {
  currentUser: Member | null;
  showToast: (msg: string) => void;
}

export function ChatPage({ currentUser, showToast }: ChatPageProps) {
  const [activeChannel, setActiveChannel] = useState("ทีมออกแบบ UI/UX");
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: "คุณ พนม", text: "สวัสดีครับ วันนี้มีอะไรใหม่บ้างในโครงการ OmniOffice?", time: "10:24", isMe: false },
    { id: 2, sender: "ทีมออกแบบ", text: "สวัสดีครับ เราอัปเดตระบบ Authentication (Login/Logout) และ RBAC เรียบร้อยแล้วครับ", time: "10:25", isMe: true },
    { id: 3, sender: "คุณ พนม", text: "ยอดเยี่ยมมากครับ สมาชิกแต่ละระดับสิทธิ์สามารถเข้าถึงหน้าใดได้บ้าง?", time: "10:26", isMe: false },
    { id: 4, sender: "ทีมออกแบบ", text: "Admin จัดการสิทธิ์ได้ทั้งหมด, Manager ดูรายงานได้, Member ใช้งานทั่วไป, และ Guest เข้าถึงได้เฉพาะที่ได้รับเชิญครับ", time: "10:27", isMe: true },
  ]);
  const [newMessage, setNewMessage] = useState("");

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: currentUser ? `คุณ (${currentUser.name})` : "คุณ (ผู้ใช้งาน)",
        text: newMessage.trim(),
        time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
        isMe: true,
      },
    ]);
    setNewMessage("");
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6">
      {/* Channel list */}
      <div className="w-full md:w-72 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden shrink-0">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-bold font-heading text-base text-slate-900">ห้องแชททั้งหมด</h2>
          <div className="mt-2 relative">
            <input
              type="text"
              placeholder="ค้นหาห้องหรือเพื่อน..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            />
            <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">🔍</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {[
            { name: "ทีมออกแบบ UI/UX", lastTime: "10:31", unread: 3, icon: "👥" },
            { name: "ทีมพัฒนาซอฟต์แวร์", lastTime: "09:10", unread: 0, icon: "💻" },
            { name: "ฝ่ายการตลาด & ประชาสัมพันธ์", lastTime: "เมื่อวาน", unread: 0, icon: "📢" },
            { name: "ห้องประกาศกลาง (Announcements)", lastTime: "2 วันก่อน", unread: 0, icon: "🏢" },
          ].map((ch) => (
            <button
              key={ch.name}
              type="button"
              onClick={() => setActiveChannel(ch.name)}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors ${
                activeChannel === ch.name
                  ? "bg-indigo-50 border border-indigo-100 text-indigo-900 font-semibold"
                  : "hover:bg-slate-50 text-slate-700"
              }`}
            >
              <div className="flex items-center space-x-3 truncate">
                <span className="text-lg">{ch.icon}</span>
                <div className="truncate">
                  <div className="text-sm truncate">{ch.name}</div>
                  <div className="text-[11px] text-slate-400">ใช้งานล่าสุด {ch.lastTime}</div>
                </div>
              </div>
              {ch.unread > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#4F46E5] text-white">
                  {ch.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Viewport */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <span className="text-xl">👥</span>
            <div>
              <h2 className="font-bold font-heading text-sm text-slate-900">{activeChannel}</h2>
              <div className="text-xs text-emerald-600 font-semibold">● 6 คนกำลังออนไลน์</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => showToast("📹 กำลังเริ่มการสนทนาทางวิดีโอแบบกลุ่ม...")}
              className="px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold hover:bg-teal-100 transition-colors"
            >
              📹 โทรกลุ่ม
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.isMe ? "items-end" : "items-start"}`}
            >
              <span className="text-[11px] text-slate-400 mb-1 px-1">
                {msg.sender} · {msg.time}
              </span>
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-xs ${
                  msg.isMe
                    ? "bg-[#4F46E5] text-white rounded-br-xs"
                    : "bg-slate-100 text-slate-800 rounded-bl-xs"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 flex gap-2 shrink-0 bg-white">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="พิมพ์ข้อความตอบกลับในห้องแชท..."
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-[#4F46E5] focus:ring-2 focus:ring-[#4F46E5]/20 transition-all text-slate-800"
          />
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#4F46E5] text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/25 hover:bg-[#4338CA] transition-colors"
          >
            ส่งข้อความ
          </button>
        </form>
      </div>
    </div>
  );
}
