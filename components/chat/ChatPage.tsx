"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Member, ChatGroup, ChatMessage } from "@/lib/types";
import { INITIAL_MEMBERS, ROLE_CONFIG } from "@/lib/rbac";
import {
  loadStoredChatGroups,
  saveStoredChatGroups,
  loadStoredChatMessages,
  saveStoredChatMessages,
} from "@/lib/chat-data";
import { CreateGroupModal } from "./CreateGroupModal";
import { GroupMembersDrawer } from "./GroupMembersDrawer";

interface ChatPageProps {
  currentUser: Member | null;
  showToast: (msg: string) => void;
  members?: Member[];
}

export function ChatPage({
  currentUser,
  showToast,
  members = INITIAL_MEMBERS,
}: ChatPageProps) {
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string>("ch_all_staff");
  const [channelSearch, setChannelSearch] = useState<string>("");
  const [messageSearch, setMessageSearch] = useState<string>("");
  const [newMessageText, setNewMessageText] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Modals
  const [showCreateGroupModal, setShowCreateGroupModal] = useState<boolean>(false);
  const [showMembersDrawer, setShowMembersDrawer] = useState<boolean>(false);
  const [showPinnedDropdown, setShowPinnedDropdown] = useState<boolean>(false);

  // Simulated file attachment
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    type: "pdf" | "image" | "doc";
    size: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat state from storage and sync with latest members
  useEffect(() => {
    const loadedGroups = loadStoredChatGroups(members);
    const loadedMessages = loadStoredChatMessages();
    setGroups(loadedGroups);
    setMessages(loadedMessages);

    // Auto-select user's own division group if available, or default to all staff
    if (currentUser?.division) {
      const myDivGroup = loadedGroups.find((g) => g.division === currentUser.division);
      if (myDivGroup) {
        setActiveGroupId(myDivGroup.id);
      }
    }
  }, [members, currentUser]);

  const activeGroup = useMemo(() => {
    return groups.find((g) => g.id === activeGroupId) || groups[0];
  }, [groups, activeGroupId]);

  // Group members
  const activeGroupMembers = useMemo(() => {
    if (!activeGroup) return [];
    return members.filter((m) => activeGroup.memberIds.includes(m.id));
  }, [activeGroup, members]);

  // Messages of the active group
  const activeMessages = useMemo(() => {
    return messages
      .filter((m) => m.groupId === activeGroupId)
      .filter((m) => {
        if (!messageSearch.trim()) return true;
        const q = messageSearch.toLowerCase();
        return (
          m.text.toLowerCase().includes(q) ||
          m.senderName.toLowerCase().includes(q) ||
          m.tag?.toLowerCase().includes(q) ||
          m.attachmentName?.toLowerCase().includes(q)
        );
      });
  }, [messages, activeGroupId, messageSearch]);

  // Pinned messages of active group
  const pinnedMessages = useMemo(() => {
    return messages.filter((m) => m.groupId === activeGroupId && m.isPinned);
  }, [messages, activeGroupId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages.length, activeGroupId]);

  // Filtered groups by search
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      if (!channelSearch.trim()) return true;
      const q = channelSearch.toLowerCase();
      return g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q);
    });
  }, [groups, channelSearch]);

  // Send message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() && !attachedFile) return;

    const sender: Member = currentUser || members[0];

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      groupId: activeGroupId,
      senderId: sender.id,
      senderName: sender.name,
      senderAvatar: sender.avatarUrl,
      senderRole: sender.role,
      senderPosition: sender.position,
      senderDivision: sender.division,
      text: newMessageText.trim(),
      timestamp: new Date().toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      }) + " น.",
      tag: selectedTag || undefined,
      attachmentName: attachedFile?.name,
      attachmentType: attachedFile?.type,
      attachmentSize: attachedFile?.size,
      isPinned: false,
    };

    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    saveStoredChatMessages(updatedMessages);

    setNewMessageText("");
    setSelectedTag(null);
    setAttachedFile(null);
  };

  // Toggle pin
  const handleTogglePin = (msgId: string) => {
    const updated = messages.map((m) => {
      if (m.id !== msgId) return m;
      const nextPin = !m.isPinned;
      showToast(nextPin ? "📌 ปักหมุดข้อความเรียบร้อย" : "ปลดหมุดข้อความเรียบร้อย");
      return { ...m, isPinned: nextPin };
    });
    setMessages(updated);
    saveStoredChatMessages(updated);
  };

  // Create new group
  const handleCreateGroup = (newGroup: ChatGroup) => {
    const updatedGroups = [...groups, newGroup];
    setGroups(updatedGroups);
    saveStoredChatGroups(updatedGroups);
    setActiveGroupId(newGroup.id);
    showToast(`🎉 สร้างกลุ่มแชท "${newGroup.name}" สำเร็จ!`);
  };

  // Update group members
  const handleUpdateGroupMembers = (groupId: string, newMemberIds: string[]) => {
    const updatedGroups = groups.map((g) => {
      if (g.id !== groupId) return g;
      return { ...g, memberIds: newMemberIds };
    });
    setGroups(updatedGroups);
    saveStoredChatGroups(updatedGroups);
  };

  const QUICK_TAGS = ["ด่วนที่สุด", "หนังสือเวียน", "รายงานการประชุม", "ขอความอนุเคราะห์"];

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col md:flex-row gap-4 relative">
      {/* ─── LEFT: GROUPS & CHANNELS LIST ─── */}
      <div className="w-full md:w-80 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden shrink-0">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">💬</span>
              <div>
                <h2 className="font-bold font-heading text-sm text-slate-900 leading-tight">
                  ระบบแชทกลุ่มราชการ
                </h2>
                <span className="text-[10px] text-slate-400">พมจ.กำแพงเพชร</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateGroupModal(true)}
              className="p-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-[#4F46E5] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              title="สร้างกลุ่มแชทโครงการใหม่"
            >
              <span>➕</span>
              <span className="text-[11px] hidden sm:inline">สร้างกลุ่ม</span>
            </button>
          </div>

          {/* Search channel */}
          <div className="relative">
            <input
              type="text"
              placeholder="ค้นหากลุ่มงานหรือโครงการ..."
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 transition-colors"
            />
            <span className="absolute left-2.5 top-2 text-xs text-slate-400">🔍</span>
          </div>
        </div>

        {/* Channels List by Category */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {/* Section: Official Division Groups */}
          <div>
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>กลุ่มงานประจำสำนักงาน</span>
              <span className="text-indigo-600 font-mono">
                {groups.filter((g) => g.type === "division" || g.type === "announcement").length}
              </span>
            </div>

            <div className="space-y-0.5 mt-1">
              {filteredGroups
                .filter((g) => g.type === "division" || g.type === "announcement")
                .map((g) => {
                  const isActive = activeGroupId === g.id;
                  const memberCount = g.memberIds.length;
                  const isUserInGroup = currentUser ? g.memberIds.includes(currentUser.id) : false;

                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setActiveGroupId(g.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all cursor-pointer ${
                        isActive
                          ? "bg-gradient-to-r from-indigo-50 to-teal-50/40 border border-indigo-200 text-slate-900 shadow-2xs"
                          : "hover:bg-slate-50 text-slate-700 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span className="text-lg shrink-0">{g.icon}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs truncate ${
                                isActive ? "font-bold text-indigo-950" : "font-medium text-slate-800"
                              }`}
                            >
                              {g.name}
                            </span>
                            {isUserInGroup && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="คุณเป็นสมาชิกในกลุ่มนี้" />
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            {g.description}
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-100 text-slate-600 shrink-0 font-semibold">
                        {memberCount} คน
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Section: Custom Project Groups */}
          <div>
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>กลุ่มโครงการ & เฉพาะกิจ</span>
              <span className="text-teal-600 font-mono">
                {groups.filter((g) => g.type === "custom").length}
              </span>
            </div>

            <div className="space-y-0.5 mt-1">
              {filteredGroups
                .filter((g) => g.type === "custom")
                .map((g) => {
                  const isActive = activeGroupId === g.id;
                  const memberCount = g.memberIds.length;

                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setActiveGroupId(g.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all cursor-pointer ${
                        isActive
                          ? "bg-gradient-to-r from-teal-50 to-indigo-50/40 border border-teal-200 text-slate-900 shadow-2xs"
                          : "hover:bg-slate-50 text-slate-700 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <span className="text-lg shrink-0">{g.icon}</span>
                        <div className="min-w-0">
                          <span
                            className={`text-xs truncate block ${
                              isActive ? "font-bold text-teal-950" : "font-medium text-slate-800"
                            }`}
                          >
                            {g.name}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                            {g.description}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-slate-100 text-slate-600 shrink-0 font-semibold">
                        {memberCount} คน
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── RIGHT: CHAT VIEWPORT ─── */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
        {/* Top Chat Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <span className="text-2xl p-2 bg-white rounded-2xl shadow-2xs border border-slate-200/60 shrink-0">
              {activeGroup?.icon || "💬"}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold font-heading text-sm text-slate-900 truncate">
                  {activeGroup?.name}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 shrink-0">
                  {activeGroup?.type === "division"
                    ? "กลุ่มงานทางการ"
                    : activeGroup?.type === "announcement"
                    ? "ประกาศกลาง"
                    : "กลุ่มโครงการ"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                {activeGroup?.description}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Search messages in group */}
            <div className="relative hidden sm:block">
              <input
                type="text"
                placeholder="ค้นหาในห้อง..."
                value={messageSearch}
                onChange={(e) => setMessageSearch(e.target.value)}
                className="w-36 px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:w-48 transition-all"
              />
            </div>

            {/* Pinned Messages Button */}
            {pinnedMessages.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPinnedDropdown(!showPinnedDropdown)}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                  title="ดูข้อความที่ปักหมุด"
                >
                  <span>📌</span>
                  <span>{pinnedMessages.length} ปักหมุด</span>
                </button>

                {showPinnedDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-30 space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 text-xs font-bold text-slate-800">
                      <span>📌 ข้อความปักหมุด ({pinnedMessages.length})</span>
                      <button
                        type="button"
                        onClick={() => setShowPinnedDropdown(false)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {pinnedMessages.map((pin) => (
                        <div
                          key={pin.id}
                          className="p-2 bg-amber-50/60 rounded-xl border border-amber-200/60 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between text-[10px] text-amber-900 font-semibold">
                            <span>{pin.senderName}</span>
                            <span>{pin.timestamp}</span>
                          </div>
                          <p className="text-slate-800 line-clamp-2">{pin.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* View Members Drawer Button */}
            <button
              type="button"
              onClick={() => setShowMembersDrawer(true)}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <span>👥</span>
              <span>สมาชิก ({activeGroupMembers.length})</span>
            </button>

            {/* Quick Video Call */}
            <button
              type="button"
              onClick={() => showToast(`📹 เริ่มห้องประชุมออนไลน์สำหรับกลุ่ม ${activeGroup.name} แล้ว`)}
              className="px-3 py-1.5 rounded-xl bg-[#4F46E5] hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <span>📹</span>
              <span className="hidden sm:inline">ประชุมกลุ่ม</span>
            </button>
          </div>
        </div>

        {/* Pinned Message Sticky Banner */}
        {pinnedMessages.length > 0 && (
          <div className="px-4 py-2 bg-amber-50/80 border-b border-amber-200/80 flex items-center justify-between text-xs text-amber-900 shrink-0">
            <div className="flex items-center gap-2 truncate">
              <span className="text-sm">📌</span>
              <span className="font-bold truncate">
                {pinnedMessages[pinnedMessages.length - 1].senderName}:
              </span>
              <span className="truncate text-slate-700">
                {pinnedMessages[pinnedMessages.length - 1].text}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowPinnedDropdown(true)}
              className="text-[11px] text-indigo-600 hover:underline font-bold shrink-0 ml-2"
            >
              ดูทั้งหมด ({pinnedMessages.length})
            </button>
          </div>
        )}

        {/* Chat Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/30">
          {activeMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <span className="text-4xl mb-2">{activeGroup?.icon || "💬"}</span>
              <h3 className="font-bold text-slate-700 text-base">
                ยินดีต้อนรับสู่ห้อง {activeGroup?.name}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                ห้องสนทนาของ {activeGroup?.description} สามารถส่งข้อความ หนังสือเวียน หรือประสานงานได้ทันที
              </p>
            </div>
          ) : (
            activeMessages.map((msg) => {
              const isMe = currentUser ? msg.senderId === currentUser.id : false;
              const senderRoleInfo = ROLE_CONFIG[msg.senderRole];

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 group ${
                    isMe ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Sender Avatar */}
                  <div className="relative shrink-0 mt-0.5">
                    {msg.senderAvatar ? (
                      <img
                        src={msg.senderAvatar}
                        alt={msg.senderName}
                        className="w-9 h-9 rounded-2xl object-cover border border-slate-200 shadow-2xs"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-[#4F46E5] font-bold text-xs flex items-center justify-center border border-indigo-200">
                        {msg.senderName.slice(0, 2)}
                      </div>
                    )}
                  </div>

                  {/* Message Bubble & Details */}
                  <div className={`max-w-[80%] sm:max-w-md space-y-1 ${isMe ? "items-end text-right" : "items-start"}`}>
                    {/* Sender Meta */}
                    <div className={`flex items-center gap-1.5 text-[11px] ${isMe ? "justify-end" : "justify-start"}`}>
                      <span className="font-bold text-slate-800">{msg.senderName}</span>
                      <span className="text-[10px] text-slate-400">
                        {senderRoleInfo?.icon} {msg.senderPosition ? `· ${msg.senderPosition.split(" (")[0]}` : ""}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {msg.timestamp}
                      </span>
                    </div>

                    {/* Tag badge (if any) */}
                    {msg.tag && (
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                          🔖 {msg.tag}
                        </span>
                      </div>
                    )}

                    {/* Main Bubble */}
                    <div
                      className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-2xs relative ${
                        isMe
                          ? "bg-gradient-to-r from-[#4F46E5] to-[#4338CA] text-white rounded-tr-xs"
                          : "bg-white border border-slate-200/80 text-slate-800 rounded-tl-xs"
                      } ${msg.isPinned ? "ring-2 ring-amber-400" : ""}`}
                    >
                      {msg.isPinned && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-500 font-bold mb-1">
                          <span>📌 ปักหมุดโดยผู้บริหาร</span>
                        </div>
                      )}

                      <p className="whitespace-pre-wrap">{msg.text}</p>

                      {/* Attachment file card */}
                      {msg.attachmentName && (
                        <div
                          className={`mt-2.5 p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                            isMe
                              ? "bg-indigo-900/40 border-indigo-400/30 text-white"
                              : "bg-slate-50 border-slate-200 text-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-xl">
                              {msg.attachmentType === "pdf"
                                ? "📕"
                                : msg.attachmentType === "image"
                                ? "🖼️"
                                : "📘"}
                            </span>
                            <div className="truncate">
                              <div className="font-bold truncate text-[11px]">{msg.attachmentName}</div>
                              <div className="text-[10px] opacity-70 font-mono">{msg.attachmentSize || "เอกสารราชการ"}</div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => showToast(`📥 กำลังดาวน์โหลด ${msg.attachmentName}`)}
                            className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[10px] font-bold shrink-0 transition-colors cursor-pointer"
                          >
                            ดาวน์โหลด
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Pin Action on hover */}
                    <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-[10px] ${isMe ? "justify-end" : "justify-start"}`}>
                      <button
                        type="button"
                        onClick={() => handleTogglePin(msg.id)}
                        className="text-slate-400 hover:text-amber-600 transition-colors"
                      >
                        {msg.isPinned ? "✕ ปลดหมุด" : "📌 ปักหมุดข้อความ"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ─── BOTTOM: INPUT & ATTACHMENT BAR ─── */}
        <div className="p-3 sm:p-4 border-t border-slate-200/80 bg-white space-y-2 shrink-0">
          {/* Quick Tags and Attachments Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 mr-1">แท็กด่วน:</span>
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    selectedTag === tag
                      ? "bg-[#4F46E5] text-white shadow-2xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Simulated file attachments */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setAttachedFile({
                    name: `เอกสารราชการ_บันทึกข้อความ_${Date.now().toString().slice(-4)}.pdf`,
                    type: "pdf",
                    size: "1.8 MB",
                  });
                  showToast("📎 แนบไฟล์เอกสารราชการเรียบร้อย");
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                title="แนบเอกสาร PDF"
              >
                <span>📎</span>
                <span>แนบไฟล์ PDF</span>
              </button>
            </div>
          </div>

          {/* Attached file preview chip */}
          {attachedFile && (
            <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span>📕</span>
                <span className="font-bold text-indigo-950">{attachedFile.name}</span>
                <span className="text-slate-400 font-mono">({attachedFile.size})</span>
              </div>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="text-slate-400 hover:text-rose-500 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Form Text Input */}
          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                rows={2}
                placeholder={`พิมพ์ข้อความสนทนาในห้อง ${activeGroup?.name}...`}
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 transition-colors resize-none leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={!newMessageText.trim() && !attachedFile}
              className="px-5 py-3 bg-[#4F46E5] hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-[#4F46E5] text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              <span>ส่ง</span>
              <span>✈️</span>
            </button>
          </form>
        </div>
      </div>

      {/* ─── MODAL: CREATE CUSTOM GROUP ─── */}
      {showCreateGroupModal && (
        <CreateGroupModal
          currentUser={currentUser}
          availableMembers={members}
          onClose={() => setShowCreateGroupModal(false)}
          onCreateGroup={handleCreateGroup}
        />
      )}

      {/* ─── DRAWER: GROUP MEMBERS MANAGEMENT ─── */}
      {showMembersDrawer && activeGroup && (
        <GroupMembersDrawer
          group={activeGroup}
          allMembers={members}
          currentUser={currentUser}
          onClose={() => setShowMembersDrawer(false)}
          onUpdateGroupMembers={handleUpdateGroupMembers}
          showToast={showToast}
        />
      )}
    </div>
  );
}
