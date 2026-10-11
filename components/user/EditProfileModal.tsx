"use client";

import React, { useState, useRef, useEffect } from "react";
import { PersonnelType } from "@/lib/types";
import { GOVERNMENT_DIVISIONS, GOVERNMENT_PERSONNEL_TYPES, PERSONNEL_TYPE_CONFIG } from "@/lib/rbac";

export interface EditProfileFormData {
  prefix: string;
  firstName: string;
  lastName: string;
  nickname: string;
  personnelType: PersonnelType;
  position: string;
  division: string;
  email: string;
  phone: string;
  lineId: string;
  avatarUrl?: string;
}

export const OFFICIAL_AVATAR_PRESETS = [
  {
    id: "maliwan",
    name: "นางสาวมะลิวัน สิทธิโยธี",
    position: "พัฒนาสังคมฯ จังหวัด",
    url: "https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/10/S__2457668.jpg",
  },
  {
    id: "sekpol",
    name: "นายเสกพล ดิษฐโชติ",
    position: "หน.ฝ่ายบริหารทั่วไป",
    url: "https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/12/2b6d8e58-bfd5-44a7-a18d-4fb8e685452f-e1734057934925.png",
  },
  {
    id: "worawut",
    name: "นายวรวุฒิ พึ่งพัก",
    position: "หน.กลุ่มพัฒนาสังคม",
    url: "https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/11/e735d8a3-9afc-4271-803e-0438ae7cb5371-1-1-e1731912123637.png",
  },
  {
    id: "phanomsak",
    name: "นายพนมศักย์ บริภัทรจิรากร",
    position: "รก.หน.กลุ่มนโยบาย",
    url: "https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/11/%E0%B8%9E%E0%B8%B5%E0%B9%88%E0%B8%94%E0%B8%B2%E0%B8%A7-1-1-e1734061864108.png",
  },
  {
    id: "kwannapa",
    name: "นางสาวขวัญนภา ศิริสมบัติ",
    position: "จนท.ระบบคอมพิวเตอร์",
    url: "https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/11/a864cd1c-9230-490f-b838-5f62aa24bfca-e1732079225217.png",
  },
  {
    id: "sumalee",
    name: "นางสาวสุมาลี แสงแก้ว",
    position: "นักสังคมสงเคราะห์",
    url: "https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/11/e69828cb-560e-4c87-a197-91e98179257a-e1732768762731.png",
  },
  {
    id: "pitchapa",
    name: "นางสาวพิชชาภา ห้าวหาญ",
    position: "นักสังคมสงเคราะห์",
    url: "https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/12/88a864d8-a374-4867-87c8-4daa2671153e-e1734057993409.png",
  },
  {
    id: "areewan",
    name: "นางสาวอารีวรรณ ประเสริฐอุดมศักดิ์",
    position: "จนท.การเงินและบัญชี",
    url: "https://kamphaengphet.m-society.go.th/wp-content/uploads/2024/11/%E0%B8%9E%E0%B8%99%E0%B8%A1%E0%B8%A8%E0%B8%B1%E0%B8%81%E0%B8%A2%E0%B9%8C-%E0%B8%9A%E0%B8%A3%E0%B8%B4%E0%B8%A0%E0%B8%B1%E0%B8%97%E0%B8%A3%E0%B8%88%E0%B8%B4%E0%B8%A3%E0%B8%B2%E0%B8%81%E0%B8%A3-1-e1734061426233.png",
  },
];

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: EditProfileFormData;
  setForm: React.Dispatch<React.SetStateAction<EditProfileFormData>>;
  onSubmit: (e: React.FormEvent) => void;
}

export function EditProfileModal({
  isOpen,
  onClose,
  form,
  setForm,
  onSubmit,
}: EditProfileModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPresetGallery, setShowPresetGallery] = useState(true);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(true);

  // Keyboard Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.onload = () => {
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL("image/jpeg", 0.85);
          setForm((prev) => ({ ...prev, avatarUrl: compressed }));
        } else {
          setForm((prev) => ({ ...prev, avatarUrl: dataUrl }));
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveAvatar = () => {
    setForm((prev) => ({ ...prev, avatarUrl: "" }));
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md overflow-y-auto animate-fade-in ${
        isFullscreen ? "p-0 md:p-3" : "p-3 sm:p-4 md:p-6"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? "w-full h-full md:rounded-2xl max-w-7xl"
            : "rounded-3xl max-w-3xl w-full my-auto max-h-[calc(100vh-2rem)] md:max-h-[90vh]"
        }`}
      >
        {/* ─── Header: Clear Title + Fullscreen Toggle + Prominent Close Button ─── */}
        <div className="flex items-center justify-between px-5 py-4 md:px-7 md:py-4.5 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#4F46E5] to-[#818CF8] text-white flex items-center justify-center text-lg font-bold shadow-sm shadow-indigo-500/20">
              ✏️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base md:text-lg font-bold font-heading text-slate-900">
                  แก้ไขข้อมูลส่วนบุคคล
                </h3>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                  Profile Settings
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ปรับปรุงรูปโปรไฟล์ ข้อมูลการติดต่อ และสังกัดหน่วยงานราชการ พมจ.กำแพงเพชร
              </p>
            </div>
          </div>

          {/* Action buttons on top right */}
          <div className="flex items-center gap-2">
            {/* Fullscreen Toggle Button */}
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition-all cursor-pointer"
              title={isFullscreen ? "ย่อหน้าต่างเป็นขนาดปกติ" : "ขยายเต็มหน้าจอ"}
            >
              <span>{isFullscreen ? "🗗" : "⛶"}</span>
              <span className="hidden md:inline">
                {isFullscreen ? "ย่อหน้าต่าง" : "เต็มหน้าจอ"}
              </span>
            </button>

            {/* Prominent Close Modal Button */}
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 font-bold text-xs border border-rose-200/90 shadow-xs transition-all cursor-pointer"
              title="ปิดหน้าต่าง (กด Esc)"
            >
              <span className="text-sm font-black">✕</span>
              <span>ปิดหน้าต่าง</span>
            </button>
          </div>
        </div>

        {/* ─── Form Body ─── */}
        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="overflow-y-auto flex-1 p-5 md:p-7 space-y-6">
            {/* Grid layout on wide screen */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* ─── Left Column: Profile Avatar Management ─── */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50 border border-slate-200/90 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📸</span>
                      <label className="text-xs font-bold text-slate-800">
                        รูปถ่ายโปรไฟล์ประจำตัว (Profile Photo)
                      </label>
                    </div>
                    {form.avatarUrl ? (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <span>✓</span>
                        <span>มีรูปโปรไฟล์แล้ว</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600">
                        ใช้ชื่อย่ออัตโนมัติ
                      </span>
                    )}
                  </div>

                  {/* Live Avatar Preview and Main Actions */}
                  <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-4">
                    <div className="relative group shrink-0">
                      {form.avatarUrl ? (
                        <img
                          src={form.avatarUrl}
                          alt={form.firstName || "โปรไฟล์"}
                          className="w-24 h-24 rounded-2xl object-cover border-2 border-indigo-500 shadow-md ring-4 ring-white"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-[#4F46E5] to-[#818CF8] text-white text-3xl font-black flex items-center justify-center border-2 border-white shadow-md">
                          {(form.firstName || "LN").slice(0, 2)}
                        </div>
                      )}
                      {form.avatarUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          title="ลบรูปภาพ / กลับไปใช้ชื่อย่อ"
                          className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center text-xs shadow-md transition-transform hover:scale-110 cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="flex-1 space-y-2 w-full text-center sm:text-left lg:text-center xl:text-left">
                      <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start lg:justify-center xl:justify-start">
                        {/* Hidden File Input */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>📁</span>
                          <span>อัปโหลดจากเครื่อง</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowPresetGallery(!showPresetGallery);
                            setShowUrlInput(false);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                            showPresetGallery
                              ? "bg-indigo-100 border-indigo-300 text-indigo-900"
                              : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                          }`}
                        >
                          <span>👤</span>
                          <span>ทำเนียบ ({OFFICIAL_AVATAR_PRESETS.length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowUrlInput(!showUrlInput);
                            setShowPresetGallery(false);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                            showUrlInput
                              ? "bg-indigo-100 border-indigo-300 text-indigo-900"
                              : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                          }`}
                        >
                          <span>🔗</span>
                          <span>ใส่ URL</span>
                        </button>

                        {form.avatarUrl && (
                          <button
                            type="button"
                            onClick={handleRemoveAvatar}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <span>🗑️</span>
                            <span>ลบรูป</span>
                          </button>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500">
                        รองรับไฟล์ภาพ JPG, PNG, WEBP (ระบบจะย่อขนาดให้อัตโนมัติเพื่อความเร็ว)
                      </p>
                    </div>
                  </div>

                  {/* Direct URL input bar */}
                  {showUrlInput && (
                    <div className="pt-2 flex items-center gap-2 animate-fade-in border-t border-slate-200/60">
                      <input
                        type="url"
                        placeholder="วางลิงก์รูปภาพ https://... เช่น ลิงก์จาก LINE หรือเว็บราชการ"
                        value={customUrlInput}
                        onChange={(e) => setCustomUrlInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customUrlInput.trim()) {
                            setForm({ ...form, avatarUrl: customUrlInput.trim() });
                            setShowUrlInput(false);
                            setCustomUrlInput("");
                          }
                        }}
                        className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 cursor-pointer"
                      >
                        นำไปใช้
                      </button>
                    </div>
                  )}

                  {/* Official Preset Gallery Grid */}
                  {showPresetGallery && (
                    <div className="pt-2 border-t border-slate-200/80 animate-fade-in space-y-2">
                      <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                        <span>ทำเนียบภาพถ่ายข้าราชการ พมจ.กำแพงเพชร:</span>
                        <span className="text-[10px] text-slate-400">คลิกที่ภาพเพื่อเลือก</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
                        {OFFICIAL_AVATAR_PRESETS.map((p) => {
                          const isSelected = form.avatarUrl === p.url;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setForm({ ...form, avatarUrl: p.url });
                              }}
                              className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                                isSelected
                                  ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-600/30 shadow-xs"
                                  : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50"
                              }`}
                            >
                              <img
                                src={p.url}
                                alt={p.name}
                                className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-200"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-[11px] font-bold text-slate-800 truncate">
                                  {p.name.split(" ")[0]}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">
                                  {p.position}
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

              {/* ─── Right Column: Civil Service Information & Contact Details ─── */}
              <div className="lg:col-span-7 space-y-5">
                
                {/* Block 1: Civil Service Identity */}
                <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="text-base">🏛️</span>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      ข้อมูลข้าราชการและเจ้าหน้าที่
                    </h4>
                  </div>

                  {/* คำนำหน้า, ชื่อ, นามสกุล, ชื่อเล่น */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">คำนำหน้า</label>
                      <select
                        value={form.prefix}
                        onChange={(e) => setForm({ ...form, prefix: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                      >
                        <option value="">(ไม่ระบุคำนำหน้า)</option>
                        <option value="นาย">นาย</option>
                        <option value="นาง">นาง</option>
                        <option value="นางสาว">นางสาว</option>
                        <option value="ดร.">ดร.</option>
                        <option value="ว่าที่ ร.ต.">ว่าที่ ร.ต.</option>
                        <option value="อาจารย์">อาจารย์</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        ชื่อ <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.firstName}
                        onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        นามสกุล <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.lastName}
                        onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อเล่น (Nickname)</label>
                      <input
                        type="text"
                        placeholder="เช่น เสก, บอย"
                        value={form.nickname}
                        onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                      />
                    </div>
                  </div>

                  {/* ประเภทบุคลากร, ตำแหน่ง & กลุ่ม/ฝ่าย */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">ประเภทบุคลากร</label>
                      <select
                        value={form.personnelType}
                        onChange={(e) =>
                          setForm({ ...form, personnelType: e.target.value as PersonnelType })
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:bg-white focus:border-[#4F46E5]"
                      >
                        {GOVERNMENT_PERSONNEL_TYPES.map((pt) => (
                          <option key={pt} value={pt}>
                            {PERSONNEL_TYPE_CONFIG[pt]?.icon} {pt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        ตำแหน่ง (Position) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.position}
                        onChange={(e) => setForm({ ...form, position: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">กลุ่ม/ฝ่าย (Division / Section)</label>
                      <select
                        value={form.division}
                        onChange={(e) => setForm({ ...form, division: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                      >
                        {GOVERNMENT_DIVISIONS.map((div) => (
                          <option key={div} value={div}>
                            {div}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Block 2: Contact Channels */}
                <div className="p-4 md:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="text-base">📞</span>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      ช่องทางการติดต่อสื่อสาร
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        อีเมลราชการ <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">หมายเลขโทรศัพท์</label>
                      <input
                        type="tel"
                        placeholder="02-612-6000 หรือ 081-xxx-xxxx"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Line ID</label>
                      <input
                        type="text"
                        placeholder="ไอดีไลน์สำหรับติดต่อ"
                        value={form.lineId}
                        onChange={(e) => setForm({ ...form, lineId: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-[#4F46E5]"
                      />
                    </div>
                  </div>
                </div>

                {/* Info Note */}
                <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-800 text-xs flex items-start gap-2.5">
                  <span className="text-base leading-none">💡</span>
                  <div className="leading-relaxed text-[11px]">
                    ข้อมูลที่ท่านปรับปรุงจะถูกซิงค์ไปยังระบบฐานข้อมูลและแสดงผลในสมุดโทรศัพท์/ทำเนียบบุคลากรสำนักงานทันที
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* ─── Fixed Footer Buttons ─── */}
          <div className="p-4 md:px-7 bg-slate-50/90 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-500 hidden sm:flex items-center gap-1.5">
              <span>⌨️</span>
              <span>
                กด <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono font-bold text-slate-700">Esc</kbd> หรือคลิกปุ่มปิดหน้าต่างด้านบนเพื่อยกเลิกได้ทันที
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>✕</span>
                <span>ยกเลิก / ปิดหน้าต่าง</span>
              </button>
              <button
                type="submit"
                className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-[#4F46E5] to-[#4338CA] hover:from-[#4338CA] hover:to-[#3730A3] text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>✓</span>
                <span>บันทึกข้อมูลส่วนบุคคล</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
