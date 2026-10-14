"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Member, ChatGroup, ChatMessage, ChatAttachment, AttachmentType } from "@/lib/types";
import { INITIAL_MEMBERS, ROLE_CONFIG } from "@/lib/rbac";
import {
  loadStoredChatGroups,
  saveStoredChatGroups,
  loadStoredChatMessages,
  saveStoredChatMessages,
  detectAttachmentType,
  formatAttachmentSize,
  ATTACHMENT_TYPE_CONFIG,
  GOVERNMENT_DOCUMENT_TEMPLATES,
} from "@/lib/chat-data";
import {
  fetchChatGroups,
  saveChatGroup,
  fetchChatMessages,
  sendChatMessage,
  updateChatMessagePin,
  subscribeToChatMessages,
  subscribeToChatGroups,
} from "@/lib/supabase";
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

  // โหมดแสดงทุกกลุ่มสำหรับแอดมินเพื่อการตรวจสอบ (ค่าเริ่มต้น: false = เห็นเฉพาะกลุ่มที่ตนเป็นสมาชิก)
  const [adminShowAll, setAdminShowAll] = useState<boolean>(false);

  // Modals & Drawers
  const [showCreateGroupModal, setShowCreateGroupModal] = useState<boolean>(false);
  const [showMembersDrawer, setShowMembersDrawer] = useState<boolean>(false);
  const [showPinnedDropdown, setShowPinnedDropdown] = useState<boolean>(false);

  // Enhanced Multi-file Attachments state & Drag-and-Drop
  const [attachedFiles, setAttachedFiles] = useState<ChatAttachment[]>([]);
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<ChatAttachment | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat state from storage and sync with Supabase and latest members
  useEffect(() => {
    const loadedGroups = loadStoredChatGroups(members);
    const loadedMessages = loadStoredChatMessages();
    setGroups(loadedGroups);
    setMessages(loadedMessages);

    let isMounted = true;

    fetchChatGroups().then((remoteGroups) => {
      if (isMounted && remoteGroups && remoteGroups.length > 0) {
        setGroups(remoteGroups);
        saveStoredChatGroups(remoteGroups);
      }
    });

    fetchChatMessages().then((remoteMsgs) => {
      if (isMounted && remoteMsgs) {
        setMessages((prev) => {
          const remoteIds = new Set(remoteMsgs.map((m) => m.id));
          const unsynced = prev.filter((m) => !remoteIds.has(m.id));
          const merged = [...remoteMsgs, ...unsynced];
          saveStoredChatMessages(merged);
          return merged;
        });
      }
    });

    const unsubMsgs = subscribeToChatMessages(() => {
      fetchChatMessages().then((remoteMsgs) => {
        if (isMounted && remoteMsgs) {
          setMessages((prev) => {
            const remoteIds = new Set(remoteMsgs.map((m) => m.id));
            const unsynced = prev.filter((m) => !remoteIds.has(m.id));
            const merged = [...remoteMsgs, ...unsynced];
            saveStoredChatMessages(merged);
            return merged;
          });
        }
      });
    });

    const unsubGroups = subscribeToChatGroups(() => {
      fetchChatGroups().then((remoteGroups) => {
        if (isMounted && remoteGroups && remoteGroups.length > 0) {
          setGroups(remoteGroups);
          saveStoredChatGroups(remoteGroups);
        }
      });
    });

    return () => {
      isMounted = false;
      unsubMsgs();
      unsubGroups();
    };
  }, [members, currentUser]);

  // ─── PERMISSION & MEMBERSHIP FILTERING ───
  // กรองเฉพาะกลุ่มที่ผู้ใช้เป็นสมาชิกเท่านั้น (หรือแอดมินเปิดโหมดตรวจการ)
  const accessibleGroups = useMemo(() => {
    if (!currentUser) return [];
    if (adminShowAll && currentUser.role === "admin") {
      return groups;
    }
    return groups.filter((g) => {
      const isMember = Array.isArray(g.memberIds) && g.memberIds.includes(currentUser.id);
      const isOfficialDivision = Boolean(
        g.isOfficial &&
        g.division &&
        currentUser.division &&
        (g.division === currentUser.division ||
          currentUser.division.includes(g.division) ||
          g.division.includes(currentUser.division))
      );
      return isMember || isOfficialDivision;
    });
  }, [groups, currentUser, adminShowAll]);

  // สลับไปยังกลุ่มที่ตนเองมีสิทธิ์เข้าถึงโดยอัตโนมัติ
  useEffect(() => {
    if (accessibleGroups.length === 0) return;
    const isCurrentActiveValid = accessibleGroups.some((g) => g.id === activeGroupId);
    if (!isCurrentActiveValid) {
      const myDivGroup = accessibleGroups.find((g) => g.division === currentUser?.division);
      setActiveGroupId(myDivGroup ? myDivGroup.id : accessibleGroups[0].id);
    }
  }, [accessibleGroups, activeGroupId, currentUser]);

  const activeGroup = useMemo(() => {
    return accessibleGroups.find((g) => g.id === activeGroupId) || accessibleGroups[0] || null;
  }, [accessibleGroups, activeGroupId]);

  // ตรวจสอบว่าผู้ใช้ปัจจุบันเป็นสมาชิกของกลุ่มที่เลือกอยู่หรือไม่ (รวมสิทธิ์ฝ่ายทางการ และ Admin)
  const isMemberOfActiveGroup = useMemo(() => {
    if (!currentUser || !activeGroup) return false;
    if (currentUser.role === "admin") return true;
    const isMember = Array.isArray(activeGroup.memberIds) && activeGroup.memberIds.includes(currentUser.id);
    const isOfficialDivision = Boolean(
      activeGroup.isOfficial &&
      activeGroup.division &&
      currentUser.division &&
      (activeGroup.division === currentUser.division ||
        currentUser.division.includes(activeGroup.division) ||
        activeGroup.division.includes(currentUser.division))
    );
    return isMember || isOfficialDivision;
  }, [currentUser, activeGroup]);

  // Group members
  const activeGroupMembers = useMemo(() => {
    if (!activeGroup) return [];
    return members.filter((m) => activeGroup.memberIds.includes(m.id));
  }, [activeGroup, members]);

  // Messages of the active group
  const activeMessages = useMemo(() => {
    if (!activeGroup) return [];
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
  }, [messages, activeGroupId, messageSearch, activeGroup]);

  // Pinned messages of active group
  const pinnedMessages = useMemo(() => {
    if (!activeGroup) return [];
    return messages.filter((m) => m.groupId === activeGroupId && m.isPinned);
  }, [messages, activeGroupId, activeGroup]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages.length, activeGroupId]);

  // Filtered groups by search (เฉพาะกลุ่มที่ผู้ใช้มีสิทธิ์เห็น)
  const filteredGroups = useMemo(() => {
    return accessibleGroups.filter((g) => {
      if (!channelSearch.trim()) return true;
      const q = channelSearch.toLowerCase();
      return g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q);
    });
  }, [accessibleGroups, channelSearch]);

  // ─── FILE ATTACHMENT HANDLERS ───
  const processFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    const readPromises = files.map((file) => {
      return new Promise<ChatAttachment>((resolve) => {
        const type = detectAttachmentType(file.name, file.type);
        const size = formatAttachmentSize(file.size);
        const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            id,
            name: file.name,
            type,
            size,
            mimeType: file.type || "application/octet-stream",
            dataUrl: typeof reader.result === "string" ? reader.result : undefined,
          });
        };
        reader.onerror = () => {
          resolve({
            id,
            name: file.name,
            type,
            size,
            mimeType: file.type || "application/octet-stream",
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readPromises).then((newAttachments) => {
      setAttachedFiles((prev) => [...prev, ...newAttachments]);
      showToast(`📎 แนบไฟล์สำเร็จ ${newAttachments.length} รายการ`);
    });
  };

  const handleSelectRealFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    e.target.value = "";
  };

  const handleAttachTemplate = (template: (typeof GOVERNMENT_DOCUMENT_TEMPLATES)[0]) => {
    const newAtt: ChatAttachment = {
      id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: template.name,
      type: template.type,
      size: template.size,
    };
    setAttachedFiles((prev) => [...prev, newAtt]);
    setShowTemplatesDropdown(false);
    showToast(`📑 แนบแบบฟอร์มราชการ "${template.name}" เรียบร้อย`);
  };

  const handleRemoveAttachedFile = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleClearAllAttachments = () => {
    setAttachedFiles([]);
  };

  const handleDownloadAttachment = (att: ChatAttachment) => {
    if (att.dataUrl) {
      const a = document.createElement("a");
      a.href = att.dataUrl;
      a.download = att.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(`📥 ดาวน์โหลด "${att.name}" สำเร็จ`);
      return;
    }

    if (att.url) {
      window.open(att.url, "_blank");
      showToast(`📥 เปิดเอกสาร "${att.name}"`);
      return;
    }

    // Fallback for simulated template attachments
    const sampleBlob = new Blob(
      [
        `สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร\nเอกสาร: ${att.name}\nประเภท: ${att.type.toUpperCase()}\nขนาด: ${att.size}\nดาวน์โหลดจากระบบแชทกลุ่มราชการ`,
      ],
      { type: "text/plain;charset=utf-8" }
    );
    const blobUrl = URL.createObjectURL(sampleBlob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = att.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    showToast(`📥 ดาวน์โหลด "${att.name}" สำเร็จ`);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!isMemberOfActiveGroup) {
      showToast("🔒 เฉพาะสมาชิกของกลุ่มเท่านั้นที่สามารถแนบไฟล์ได้");
      return;
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Send message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMemberOfActiveGroup) {
      showToast("🔒 คุณไม่ได้เป็นสมาชิกในกลุ่มนี้ ไม่สามารถส่งข้อความได้");
      return;
    }
    if (!newMessageText.trim() && attachedFiles.length === 0) return;

    const sender: Member = currentUser || members[0];
    const primaryAtt = attachedFiles[0];

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
      // Legacy single-file fields for backward compatibility
      attachmentName: primaryAtt?.name,
      attachmentType: primaryAtt?.type,
      attachmentSize: primaryAtt?.size,
      attachmentUrl: primaryAtt?.url || primaryAtt?.dataUrl,
      // Rich multi-attachment array
      attachments: attachedFiles.length > 0 ? attachedFiles : undefined,
      isPinned: false,
    };

    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    saveStoredChatMessages(updatedMessages);
    sendChatMessage(newMsg).catch(() => {});

    setNewMessageText("");
    setSelectedTag(null);
    setAttachedFiles([]);
  };

  // Toggle pin
  const handleTogglePin = (msgId: string) => {
    const updated = messages.map((m) => {
      if (m.id !== msgId) return m;
      const nextPin = !m.isPinned;
      showToast(nextPin ? "📌 ปักหมุดข้อความเรียบร้อย" : "ปลดหมุดข้อความเรียบร้อย");
      updateChatMessagePin(msgId, nextPin).catch(() => {});
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
    saveChatGroup(newGroup).catch(() => {});
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
    const targetGroup = groups.find((g) => g.id === groupId);
    if (targetGroup) {
      saveChatGroup({ ...targetGroup, memberIds: newMemberIds }).catch(() => {});
    }
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
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-slate-400">พมจ.กำแพงเพชร</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                    {accessibleGroups.length} กลุ่มที่คุณสังกัด
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {currentUser?.role === "admin" && (
                <button
                  type="button"
                  onClick={() => setAdminShowAll(!adminShowAll)}
                  className={`px-2 py-1 rounded-xl text-[10px] font-bold border transition-colors cursor-pointer ${
                    adminShowAll
                      ? "bg-amber-100 text-amber-800 border-amber-300"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200"
                  }`}
                  title={
                    adminShowAll
                      ? "คลิกเพื่อสลับกลับมาแสดงเฉพาะกลุ่มที่ตนเป็นสมาชิก"
                      : "โหมด Admin: ดูรายชื่อทุกกลุ่มในสำนักงาน"
                  }
                >
                  {adminShowAll ? "👑 ทุกกลุ่ม" : "👤 กลุ่มฉัน"}
                </button>
              )}
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
          </div>

          {/* Search channel */}
          <div className="relative">
            <input
              type="text"
              placeholder="ค้นหากลุ่มงานหรือโครงการที่คุณสังกัด..."
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 transition-colors"
            />
            <span className="absolute left-2.5 top-2 text-xs text-slate-400">🔍</span>
          </div>
        </div>

        {/* Channels List by Category */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {accessibleGroups.length === 0 ? (
            <div className="p-6 text-center space-y-2">
              <span className="text-3xl">🔒</span>
              <p className="text-xs font-bold text-slate-700">ไม่มีห้องแชทที่คุณเป็นสมาชิก</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                ระบบจำกัดสิทธิ์ให้เห็นเฉพาะห้องที่ตนเองเป็นสมาชิกเท่านั้น กรุณาติดต่อหัวหน้ากลุ่มงานหรือผู้ดูแลระบบเพื่อเพิ่มชื่อเข้ากลุ่ม
              </p>
            </div>
          ) : (
            <>
              {/* Section: Official Division Groups */}
              <div>
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>กลุ่มงานประจำสำนักงาน</span>
                  <span className="text-indigo-600 font-mono font-bold">
                    {filteredGroups.filter((g) => g.type === "division" || g.type === "announcement").length}
                  </span>
                </div>

                <div className="space-y-0.5 mt-1">
                  {filteredGroups.filter((g) => g.type === "division" || g.type === "announcement").length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100/80">
                      <span className="text-xs block mb-0.5">🔒</span>
                      <span>ไม่มีกลุ่มงานที่คุณเป็นสมาชิก</span>
                    </div>
                  ) : (
                    filteredGroups
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
                                    <span
                                      className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
                                      title="คุณเป็นสมาชิกในกลุ่มนี้"
                                    />
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
                      })
                  )}
                </div>
              </div>

              {/* Section: Custom Project Groups */}
              <div>
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>กลุ่มโครงการ & เฉพาะกิจ</span>
                  <span className="text-teal-600 font-mono font-bold">
                    {filteredGroups.filter((g) => g.type === "custom").length}
                  </span>
                </div>

                <div className="space-y-0.5 mt-1">
                  {filteredGroups.filter((g) => g.type === "custom").length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100/80">
                      <span>ไม่มีกลุ่มโครงการที่คุณเป็นสมาชิก</span>
                    </div>
                  ) : (
                    filteredGroups
                      .filter((g) => g.type === "custom")
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
                                ? "bg-gradient-to-r from-teal-50 to-indigo-50/40 border border-teal-200 text-slate-900 shadow-2xs"
                                : "hover:bg-slate-50 text-slate-700 border border-transparent"
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <span className="text-lg shrink-0">{g.icon}</span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`text-xs truncate block ${
                                      isActive ? "font-bold text-teal-950" : "font-medium text-slate-800"
                                    }`}
                                  >
                                    {g.name}
                                  </span>
                                  {isUserInGroup && (
                                    <span
                                      className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
                                      title="คุณเป็นสมาชิกในกลุ่มนี้"
                                    />
                                  )}
                                </div>
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
                      })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── RIGHT: CHAT VIEWPORT ─── */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
        {!activeGroup ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
            <span className="text-5xl mb-3">💬</span>
            <h3 className="font-bold text-slate-700 text-lg">
              ยังไม่มีห้องสนทนาที่คุณสังกัด
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mt-1">
              ระบบจำกัดสิทธิ์ให้เห็นและสนทนาได้เฉพาะห้องที่ตนเองเป็นสมาชิกเท่านั้น กรุณาติดต่อหัวหน้ากลุ่มงานหรือผู้ดูแลระบบ
            </p>
          </div>
        ) : (
          <>
            {/* Top Chat Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center space-x-3 min-w-0">
                <span className="text-2xl p-2 bg-white rounded-2xl shadow-2xs border border-slate-200/60 shrink-0">
                  {activeGroup.icon || "💬"}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold font-heading text-sm text-slate-900 truncate">
                      {activeGroup.name}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 shrink-0">
                      {activeGroup.type === "division"
                        ? "กลุ่มงานทางการ"
                        : activeGroup.type === "announcement"
                        ? "ประกาศกลาง"
                        : "กลุ่มโครงการ"}
                    </span>
                    {!isMemberOfActiveGroup && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                        🔒 เฉพาะสมาชิก
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {activeGroup.description}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {/* Search messages in group (เฉพาะสมาชิกที่มีสิทธิ์ดูข้อความ) */}
                {isMemberOfActiveGroup && (
                  <div className="relative hidden sm:block">
                    <input
                      type="text"
                      placeholder="ค้นหาในห้อง..."
                      value={messageSearch}
                      onChange={(e) => setMessageSearch(e.target.value)}
                      className="w-36 px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:w-48 transition-all"
                    />
                  </div>
                )}

                {/* Pinned Messages Button */}
                {isMemberOfActiveGroup && pinnedMessages.length > 0 && (
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
                  disabled={!isMemberOfActiveGroup}
                  onClick={() => {
                    if (!isMemberOfActiveGroup) {
                      showToast("🔒 เฉพาะสมาชิกของกลุ่มเท่านั้นที่สามารถเริ่มการประชุมได้");
                      return;
                    }
                    showToast(`📹 เริ่มห้องประชุมออนไลน์สำหรับกลุ่ม ${activeGroup.name} แล้ว`);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#4F46E5] hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <span>📹</span>
                  <span className="hidden sm:inline">ประชุมกลุ่ม</span>
                </button>
              </div>
            </div>

            {/* Pinned Message Sticky Banner */}
            {isMemberOfActiveGroup && pinnedMessages.length > 0 && (
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
            <div
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/30 relative"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* Drag and Drop Overlay */}
              {isDragging && (
                <div className="absolute inset-2 z-30 bg-indigo-600/10 backdrop-blur-xs border-2 border-dashed border-indigo-600 rounded-3xl flex flex-col items-center justify-center p-6 text-center pointer-events-none transition-all">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center text-3xl mb-3 text-indigo-600">
                    📂
                  </div>
                  <div className="font-bold text-slate-800 text-base">
                    วางไฟล์ที่นี่เพื่อแนบเอกสารราชการ
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    รองรับ PDF, Word, Excel, PowerPoint, รูปภาพ, บีบอัด ZIP, และไฟล์ทั่วไป
                  </p>
                </div>
              )}

              {!isMemberOfActiveGroup ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 my-auto">
                  <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center text-3xl shadow-xs mb-4">
                    🔒
                  </div>
                  <h3 className="font-bold text-slate-800 text-base">
                    เฉพาะสมาชิกกลุ่มเท่านั้นที่มีสิทธิ์ดูและสนทนา
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mt-1 leading-relaxed">
                    คุณ (<strong>{currentUser?.name || "ผู้ใช้งาน"}</strong>) ไม่ได้เป็นสมาชิกของกลุ่ม &ldquo;{activeGroup.name}&rdquo; จึงไม่สามารถดูข้อความหรือร่วมสนทนาในห้องนี้ได้
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMembersDrawer(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <span>👥</span>
                      <span>ดูรายชื่อสมาชิกในกลุ่ม ({activeGroupMembers.length} คน)</span>
                    </button>
                    {currentUser?.role === "admin" && (
                      <button
                        type="button"
                        onClick={() => {
                          handleUpdateGroupMembers(activeGroup.id, [
                            ...activeGroup.memberIds,
                            currentUser.id,
                          ]);
                          showToast(`✅ เพิ่มตนเองเข้าร่วมกลุ่ม ${activeGroup.name} เรียบร้อย`);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        + เพิ่มตนเองเข้ากลุ่ม (Admin)
                      </button>
                    )}
                  </div>
                </div>
              ) : activeMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <span className="text-4xl mb-2">{activeGroup.icon || "💬"}</span>
                  <h3 className="font-bold text-slate-700 text-base">
                    ยินดีต้อนรับสู่ห้อง {activeGroup.name}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm mt-1">
                    ห้องสนทนาของ {activeGroup.description} สามารถส่งข้อความ หนังสือเวียน หรือประสานงานได้ทันที
                  </p>
                </div>
              ) : (
            activeMessages.map((msg) => {
              const isMe = currentUser ? msg.senderId === currentUser.id : false;
              const senderRoleInfo = ROLE_CONFIG[msg.senderRole];

              // Normalize attachments from either multi-attachment array or legacy single field
              const messageAttachments: ChatAttachment[] =
                msg.attachments && msg.attachments.length > 0
                  ? msg.attachments
                  : msg.attachmentName
                  ? [
                      {
                        id: `${msg.id}_legacy_att`,
                        name: msg.attachmentName,
                        type: (msg.attachmentType as AttachmentType) || "other",
                        size: msg.attachmentSize || "เอกสารราชการ",
                        url: msg.attachmentUrl,
                      },
                    ]
                  : [];

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

                      {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}

                      {/* Multi-Attachment Cards Rendering */}
                      {messageAttachments.length > 0 && (
                        <div className="mt-2.5 space-y-2">
                          {messageAttachments.map((att) => {
                            const config = ATTACHMENT_TYPE_CONFIG[att.type] || ATTACHMENT_TYPE_CONFIG.other;
                            const isImg = att.type === "image" && (att.dataUrl || att.url);

                            if (isImg) {
                              return (
                                <div
                                  key={att.id}
                                  className={`rounded-xl overflow-hidden border ${
                                    isMe
                                      ? "border-indigo-400/40 bg-indigo-950/30"
                                      : "border-slate-200 bg-slate-50"
                                  }`}
                                >
                                  <div
                                    className="relative cursor-pointer group/img overflow-hidden max-h-48 flex items-center justify-center bg-black/5"
                                    onClick={() => setPreviewImage(att)}
                                  >
                                    <img
                                      src={att.dataUrl || att.url}
                                      alt={att.name}
                                      className="w-full h-auto object-cover max-h-48 group-hover/img:scale-105 transition-transform duration-200"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-semibold">
                                      <span>🔍 คลิกเพื่อขยาย</span>
                                    </div>
                                  </div>
                                  <div className="p-2 flex items-center justify-between gap-2 text-xs">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="text-sm">🖼️</span>
                                      <span className="font-semibold truncate text-[11px]">{att.name}</span>
                                      <span className="text-[10px] opacity-70 shrink-0 font-mono">
                                        ({att.size})
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownloadAttachment(att);
                                      }}
                                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 transition-colors cursor-pointer ${
                                        isMe
                                          ? "bg-white/20 hover:bg-white/30 text-white"
                                          : "bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-2xs"
                                      }`}
                                    >
                                      ดาวน์โหลด
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={att.id}
                                className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                                  isMe ? config.bubbleBgMe : config.bubbleBgOther
                                }`}
                              >
                                <div className="flex items-center gap-2.5 truncate">
                                  <div
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 ${
                                      config.badgeBg
                                    } ${config.badgeText} border ${config.border}`}
                                  >
                                    {config.icon}
                                  </div>
                                  <div className="truncate">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold truncate text-[11px]">{att.name}</span>
                                      <span
                                        className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${config.badgeBg} ${config.badgeText} shrink-0`}
                                      >
                                        {config.label}
                                      </span>
                                    </div>
                                    <div className="text-[10px] opacity-70 font-mono mt-0.5">
                                      {att.size || "เอกสารราชการ"}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadAttachment(att)}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-colors cursor-pointer flex items-center gap-1 ${
                                    isMe
                                      ? "bg-white/20 hover:bg-white/30 text-white"
                                      : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs"
                                  }`}
                                >
                                  <span>📥</span>
                                  <span>ดาวน์โหลด</span>
                                </button>
                              </div>
                            );
                          })}
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
        <div className="p-3 sm:p-4 border-t border-slate-200/80 bg-white space-y-2.5 shrink-0">
          {!isMemberOfActiveGroup ? (
            <div className="p-3.5 bg-amber-50/90 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔒</span>
                <span className="font-semibold text-slate-800">
                  คุณไม่ได้เป็นสมาชิกในกลุ่มนี้ ระบบจำกัดสิทธิ์การแชทเฉพาะบุคลากรที่เป็นสมาชิกกลุ่มเท่านั้น
                </span>
              </div>
              {currentUser?.role === "admin" && (
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateGroupMembers(activeGroup.id, [
                      ...activeGroup.memberIds,
                      currentUser.id,
                    ]);
                    showToast(`✅ เพิ่มตนเองเข้าร่วมกลุ่ม ${activeGroup.name} เรียบร้อย`);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors cursor-pointer shrink-0 shadow-xs"
                >
                  + เพิ่มตนเองเข้ากลุ่ม (Admin)
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Hidden file pickers */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleSelectRealFiles}
              />
              <input
                ref={imageInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleSelectRealFiles}
              />

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

                {/* File Attachment Action Buttons */}
                <div className="flex items-center gap-1.5 relative">
                  {/* Real File Picker */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                    title="แนบไฟล์จากเครื่อง (PDF, Word, Excel, PowerPoint, ZIP)"
                  >
                    <span>📎</span>
                    <span>แนบไฟล์</span>
                  </button>

                  {/* Image Picker */}
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
                    title="แนบรูปภาพจากเครื่อง"
                  >
                    <span>🖼️</span>
                    <span>รูปภาพ</span>
                  </button>

                  {/* Government Template Dropdown Toggle */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowTemplatesDropdown(!showTemplatesDropdown)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                        showTemplatesDropdown
                          ? "bg-indigo-100 text-indigo-700 font-bold"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      }`}
                      title="เลือกแบบฟอร์มเอกสารราชการมาตรฐาน"
                    >
                      <span>📑</span>
                      <span>แบบฟอร์มราชการ</span>
                      <span className="text-[9px]">▾</span>
                    </button>

                    {/* Government Templates Dropdown Menu */}
                    {showTemplatesDropdown && (
                      <div className="absolute right-0 bottom-full mb-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-40 animate-fade-in space-y-1">
                        <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100 text-xs font-bold text-slate-800">
                          <span className="flex items-center gap-1.5">
                            <span>📑</span>
                            <span>แบบฟอร์มและเอกสารราชการต้นแบบ</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowTemplatesDropdown(false)}
                            className="text-slate-400 hover:text-slate-600 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="max-h-64 overflow-y-auto space-y-1 p-1">
                          {GOVERNMENT_DOCUMENT_TEMPLATES.map((tpl) => {
                            const cfg = ATTACHMENT_TYPE_CONFIG[tpl.type] || ATTACHMENT_TYPE_CONFIG.other;
                            return (
                              <button
                                key={tpl.name}
                                type="button"
                                onClick={() => handleAttachTemplate(tpl)}
                                className="w-full text-left p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors flex items-start gap-2.5 cursor-pointer group"
                              >
                                <span className="text-xl shrink-0 mt-0.5">{cfg.icon}</span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-bold text-slate-800 truncate group-hover:text-indigo-600">
                                      {tpl.name}
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                                    {tpl.description}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-400 font-mono">
                                    <span className={`px-1.5 py-0.2 rounded-md ${cfg.badgeBg} ${cfg.badgeText} font-bold`}>
                                      {cfg.label}
                                    </span>
                                    <span>{tpl.size}</span>
                                    <span>• {tpl.category}</span>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Attached Files Preview Chips Container */}
              {attachedFiles.length > 0 && (
                <div className="p-2.5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <span>📎</span>
                      <span>ไฟล์ที่พร้อมส่ง ({attachedFiles.length} รายการ)</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleClearAllAttachments}
                      className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                    >
                      ล้างทั้งหมด
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {attachedFiles.map((att) => {
                      const cfg = ATTACHMENT_TYPE_CONFIG[att.type] || ATTACHMENT_TYPE_CONFIG.other;
                      const isImg = att.type === "image" && (att.dataUrl || att.url);

                      return (
                        <div
                          key={att.id}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl flex items-center gap-2 text-xs shadow-2xs group hover:border-indigo-300 transition-colors"
                        >
                          {isImg ? (
                            <img
                              src={att.dataUrl || att.url}
                              alt={att.name}
                              className="w-7 h-7 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <span className="text-base">{cfg.icon}</span>
                          )}
                          <div className="max-w-[160px] truncate">
                            <div className="font-semibold text-slate-800 text-[11px] truncate">
                              {att.name}
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono">
                              <span className={`font-bold mr-1 ${cfg.badgeText}`}>{cfg.label}</span>
                              {att.size}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachedFile(att.id)}
                            className="text-slate-400 hover:text-rose-600 font-bold ml-1 p-0.5 rounded-full hover:bg-rose-50"
                            title={`ลบ ${att.name}`}
                            data-testid={`remove-att-${att.name}`}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Form Text Input */}
              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    rows={2}
                    placeholder={`พิมพ์ข้อความสนทนาในห้อง ${activeGroup.name}... (หรือลากวางไฟล์ที่นี่)`}
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
                  disabled={!newMessageText.trim() && attachedFiles.length === 0}
                  className="px-5 py-3 bg-[#4F46E5] hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-[#4F46E5] text-white rounded-2xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                >
                  <span>ส่ง</span>
                  <span>✈️</span>
                </button>
              </form>
            </>
          )}
        </div>
      </>
    )}
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

      {/* ─── MODAL: IMAGE LIGHTBOX PREVIEW ─── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="max-w-4xl max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between gap-3 text-white">
              <div className="flex items-center gap-2 truncate">
                <span className="text-lg">🖼️</span>
                <span className="font-bold text-xs truncate">{previewImage.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">({previewImage.size})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadAttachment(previewImage)}
                  className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <span>📥</span>
                  <span>ดาวน์โหลด</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="w-8 h-8 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Image display */}
            <div className="p-4 flex items-center justify-center overflow-auto max-h-[calc(90vh-100px)] bg-black/40">
              <img
                src={previewImage.dataUrl || previewImage.url}
                alt={previewImage.name}
                className="max-w-full max-h-[75vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
