"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  Member,
  CircularDocument,
  CircularUrgency,
  CircularSecretLevel,
  CircularTargetCriteria,
  PersonnelType,
} from "@/lib/types";
import { GOVERNMENT_DIVISIONS, GOVERNMENT_PERSONNEL_TYPES } from "@/lib/rbac";
import { resolveTargetRecipients } from "@/lib/circular-data";
import { getUserNasSid, getClientSynologyConfig } from "@/lib/synology";
import { DocumentScannerModal } from "./DocumentScannerModal";

interface NewCircularModalProps {
  currentUser: Member;
  availableMembers: Member[];
  onSave: (doc: CircularDocument) => void;
  onClose: () => void;
  initialScannedPages?: string[];
  inPage?: boolean;
}

export function NewCircularModal({
  currentUser,
  availableMembers,
  onSave,
  onClose,
  initialScannedPages = [],
  inPage = true,
}: NewCircularModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [docNumber, setDocNumber] = useState<string>("กพ ๐๐๓๒/ว ");
  const [title, setTitle] = useState<string>("");
  const [issuedDate, setIssuedDate] = useState<string>(
    new Date().toLocaleDateString("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  );
  const [senderOrg, setSenderOrg] = useState<string>("สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร");
  const [urgency, setUrgency] = useState<CircularUrgency>("normal");
  const [secretLevel, setSecretLevel] = useState<CircularSecretLevel>("normal");
  const [summary, setSummary] = useState<string>("");
  const [deadline, setDeadline] = useState<string>("");

  // Target Criteria
  const [scope, setScope] = useState<"all" | "custom">("all");
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [selectedPersonnelTypes, setSelectedPersonnelTypes] = useState<PersonnelType[]>([]);
  const [selectedSpecificIds, setSelectedSpecificIds] = useState<string[]>([]);
  const [showRecipientsList, setShowRecipientsList] = useState<boolean>(false);

  // File and Scan state
  const [fileName, setFileName] = useState<string>("");
  const [fileUrl, setFileUrl] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);
  const [fileType, setFileType] = useState<string>("");
  const [scannedPages, setScannedPages] = useState<string[]>(initialScannedPages);
  const [showScannerModal, setShowScannerModal] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFileObj, setSelectedFileObj] = useState<File | null>(null);

  // Calculate recipients dynamically
  const targetCriteria: CircularTargetCriteria = useMemo(() => {
    return {
      scope,
      divisions: selectedDivisions.length > 0 ? selectedDivisions : undefined,
      personnelTypes: selectedPersonnelTypes.length > 0 ? selectedPersonnelTypes : undefined,
      specificMemberIds: selectedSpecificIds.length > 0 ? selectedSpecificIds : undefined,
    };
  }, [scope, selectedDivisions, selectedPersonnelTypes, selectedSpecificIds]);

  const resolvedRecipients = useMemo(() => {
    return resolveTargetRecipients(targetCriteria, availableMembers);
  }, [targetCriteria, availableMembers]);

  const toggleDivision = (div: string) => {
    setSelectedDivisions((prev) =>
      prev.includes(div) ? prev.filter((d) => d !== div) : [...prev, div]
    );
  };

  const togglePersonnelType = (pt: PersonnelType) => {
    setSelectedPersonnelTypes((prev) =>
      prev.includes(pt) ? prev.filter((p) => p !== pt) : [...prev, pt]
    );
  };

  const toggleSpecificMember = (memberId: string) => {
    setSelectedSpecificIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  // Robust file processor for file input or drag-and-drop
  const processSelectedFile = (file: File) => {
    if (!file) return;
    setUploadError(null);

    // Limit check (e.g. 25MB)
    if (file.size > 25 * 1024 * 1024) {
      setUploadError("ขนาดไฟล์ใหญ่เกินกว่า 25 MB กรุณาเลือกไฟล์ที่มีขนาดเล็กลง");
      return;
    }

    setFileName(file.name);
    setFileSize(file.size);
    setFileType(file.type);
    setSelectedFileObj(file);

    const isImage = file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name);

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const result = loadEvt.target?.result as string;
      if (result) {
        setFileUrl(result);
        if (isImage) {
          setScannedPages([result]);
        }
      }
    };
    reader.onerror = () => {
      setUploadError("ไม่สามารถอ่านข้อมูลไฟล์ได้ กรุณาลองใหม่อีกครั้ง");
    };
    reader.readAsDataURL(file);
  };

  const handleManualFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleScannerFinished = (pages: string[], name: string) => {
    setScannedPages(pages);
    setFileName(name);
    setFileUrl(pages[0] || "");
    setFileSize(pages.length * 450000);
    setFileType("image/jpeg");
    setShowScannerModal(false);
  };

  const handleRemoveAttachment = () => {
    setFileName("");
    setFileUrl("");
    setFileSize(0);
    setFileType("");
    setScannedPages([]);
    setSelectedFileObj(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || resolvedRecipients.length === 0) return;

    const newDoc: CircularDocument = {
      id: `circ_${Date.now()}`,
      docNumber: docNumber.trim() || "ว-ภายใน",
      title: title.trim(),
      issuedDate: issuedDate.trim(),
      senderOrg: senderOrg.trim(),
      urgency,
      secretLevel,
      summary: summary.trim(),
      fileUrl: fileUrl || "/virtual-office/circular_docs/sample.pdf",
      fileName: fileName || "เอกสารแนบหนังสือเวียน.pdf",
      fileSize: fileSize || (scannedPages.length > 0 ? scannedPages.length * 450000 : 1250000),
      totalPages: scannedPages.length > 0 ? scannedPages.length : 1,
      scannedPages: scannedPages.length > 0 ? scannedPages : undefined,
      createdBy: currentUser.id,
      createdByName: currentUser.name,
      createdAt: new Date().toISOString(),
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
      targetCriteria,
      recipients: resolvedRecipients,
      totalCount: resolvedRecipients.length,
      acknowledgedCount: 0,
      status: "active",
    };

    onSave(newDoc);

    // Background sync attached file to Synology NAS /virtual-office/circular_docs
    if (selectedFileObj) {
      try {
        const sid = getUserNasSid();
        const config = getClientSynologyConfig();
        const formData = new FormData();
        formData.append("file", selectedFileObj);
        formData.append("folder_path", "/virtual-office/circular_docs");
        if (sid) formData.append("sid", sid);
        formData.append("url", config.nasUrl);

        fetch("/api/nas/upload", {
          method: "POST",
          body: formData,
        })
          .then((r) => r.json())
          .then((res) => {
            if (res.success && res.file) {
              console.log("[Circular] Synced file to NAS:", res.file.path);
            }
          })
          .catch((err) => console.warn("[Circular] NAS background sync failed:", err));
      } catch (err) {
        console.warn("[Circular] NAS sync error:", err);
      }
    }
  };

  const formInner = (
    <>
      {/* Section 1: Official Header & Urgency */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span>๑. ข้อมูลหนังสือราชการ</span>
              <span className="text-[10px] text-indigo-600 font-mono">ระเบียบงานสารบรรณ</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  เลขที่หนังสือ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="เช่น กพ ๐๐๓๒/ว ๑๒๓๔"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono font-bold focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ลงวันที่ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={issuedDate}
                  onChange={(e) => setIssuedDate(e.target.value)}
                  placeholder="เช่น ๑๖ ตุลาคม ๒๕๖๙"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-indigo-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                เรื่อง (ชื่อเรื่องหนังสือเวียน) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ระบุชื่อเรื่องหนังสือเวียน เช่น แนวทางการจัดทำรายงานผลการดำเนินงาน..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:border-indigo-600"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  หน่วยงานเจ้าของเรื่อง
                </label>
                <input
                  type="text"
                  value={senderOrg}
                  onChange={(e) => setSenderOrg(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 truncate focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ชั้นความเร็ว
                </label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as CircularUrgency)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 cursor-pointer"
                >
                  <option value="normal">ปกติ</option>
                  <option value="urgent">⚡ ด่วน</option>
                  <option value="very_urgent">⚡⚡ ด่วนมาก</option>
                  <option value="most_urgent">🚨 ด่วนที่สุด</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ชั้นความลับ
                </label>
                <select
                  value={secretLevel}
                  onChange={(e) => setSecretLevel(e.target.value as CircularSecretLevel)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 cursor-pointer"
                >
                  <option value="normal">ปกติ</option>
                  <option value="confidential">🔒 ลับ</option>
                  <option value="top_secret">🔐 ลับที่สุด</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  กำหนดส่งการรับทราบ/ถือปฏิบัติภายใน (ถ้ามี)
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  ผู้ส่งเวียน (ออกคำสั่ง)
                </label>
                <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium">
                  {currentUser.name} ({currentUser.position})
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                สรุปสาระสำคัญของหนังสือ
              </label>
              <textarea
                rows={2}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="ระบุข้อความสรุปสาระสำคัญ เพื่อให้ผู้รับทราบเข้าใจประเด็นหลักได้รวดเร็ว..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Section 2: Target Audience Selection */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span>๒. กำหนดกลุ่มเป้าหมายผู้รับหนังสือเวียน</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                  ผู้รับสุทธิ: {resolvedRecipients.length} คน
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowRecipientsList(!showRecipientsList)}
                className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                {showRecipientsList ? "ซ่อนรายชื่อ ▲" : "ตรวจสอบรายชื่อ ▼"}
              </button>
            </div>

            {/* Scope Radios */}
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                  scope === "all"
                    ? "bg-indigo-50/80 border-indigo-400 text-indigo-900 shadow-2xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <input
                  type="radio"
                  name="scope"
                  checked={scope === "all"}
                  onChange={() => setScope("all")}
                  className="accent-indigo-600 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold">👥 เวียนทุกคนในสำนักงาน</div>
                  <div className="text-[10px] text-slate-500">บุคลากรทุกคนที่ปฏิบัติงานใน พมจ.กพ.</div>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                  scope === "custom"
                    ? "bg-indigo-50/80 border-indigo-400 text-indigo-900 shadow-2xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <input
                  type="radio"
                  name="scope"
                  checked={scope === "custom"}
                  onChange={() => setScope("custom")}
                  className="accent-indigo-600 cursor-pointer"
                />
                <div>
                  <div className="text-xs font-bold">🎯 กำหนดกลุ่มเป้าหมายเฉพาะ</div>
                  <div className="text-[10px] text-slate-500">เลือกตามกลุ่มงาน หรือประเภทบุคลากร</div>
                </div>
              </label>
            </div>

            {/* Custom Filters (when scope === "custom") */}
            {scope === "custom" && (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-4 animate-fade-in">
                {/* 1. Divisions Selection */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    เลือกกลุ่ม / ฝ่ายงานเป้าหมาย:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {GOVERNMENT_DIVISIONS.map((div) => {
                      const isSelected = selectedDivisions.includes(div);
                      return (
                        <button
                          key={div}
                          type="button"
                          onClick={() => toggleDivision(div)}
                          className={`text-left px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer truncate ${
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {isSelected ? "✓ " : "+ "}
                          {div}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Personnel Types Selection */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    เลือกประเภทบุคลากรเป้าหมาย:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {GOVERNMENT_PERSONNEL_TYPES.map((pt) => {
                      const isSelected = selectedPersonnelTypes.includes(pt);
                      return (
                        <button
                          key={pt}
                          type="button"
                          onClick={() => togglePersonnelType(pt)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-teal-600 text-white border-teal-600 shadow-2xs"
                              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          {isSelected ? "✓ " : "+ "}
                          {pt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Specific Personnel Selection */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    เลือกบุคลากรรายบุคคลเพิ่มเติม (ถ้ามี):
                  </label>
                  <div className="max-h-36 overflow-y-auto space-y-1 p-2 bg-white rounded-xl border border-slate-200">
                    {availableMembers.map((member) => {
                      const isSelected = selectedSpecificIds.includes(member.id);
                      return (
                        <div
                          key={member.id}
                          onClick={() => toggleSpecificMember(member.id)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            isSelected ? "bg-indigo-50 text-indigo-900 font-bold" : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div>
                            <span>{member.name}</span>
                            <span className="text-[10px] text-slate-400 ml-1.5">
                              ({member.position} - {member.division})
                            </span>
                          </div>
                          <span>{isSelected ? "✓" : "+"}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Recipients Preview Drawer */}
            {showRecipientsList && (
              <div className="max-h-48 overflow-y-auto border border-indigo-100 rounded-xl bg-white p-2 divide-y divide-slate-100 text-xs animate-fade-in">
                {resolvedRecipients.length === 0 ? (
                  <div className="text-center py-4 text-slate-400">
                    ไม่พบบุคลากรที่ตรงตามเงื่อนไขที่เลือก กรุณาปรับเปลี่ยนตัวกรอง
                  </div>
                ) : (
                  resolvedRecipients.map((rec, idx) => (
                    <div key={rec.memberId} className="py-1.5 px-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 w-5">{idx + 1}.</span>
                        <span className="font-semibold text-slate-900">{rec.memberName}</span>
                        <span className="text-[11px] text-slate-500">({rec.position})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                          {rec.division}
                        </span>
                        <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded">
                          {rec.personnelType}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Section 3: File Attachment & Scan Ingestion */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="text-xs font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-2">
              <span>๓. ไฟล์หนังสือราชการต้นฉบับ</span>
              <span className="text-[10px] text-indigo-600 font-mono">แนบไฟล์ PDF, รูปภาพ หรือสแกนสด</span>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
                <span>⚠️ {uploadError}</span>
                <button
                  type="button"
                  onClick={() => setUploadError(null)}
                  className="text-rose-500 hover:text-rose-700 font-bold ml-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* If a file is already selected or scanned, display active card */}
            {fileName ? (
              <div className="p-4 rounded-2xl bg-indigo-50/70 border-2 border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-2xl shrink-0 shadow-sm">
                    {fileType.startsWith("image/") || scannedPages.length > 0 ? "🖼️" : "📄"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">{fileName}</span>
                      <span className="px-2 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                        แนบไฟล์เรียบร้อย
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {fileSize > 0 ? `${(fileSize / (1024 * 1024)).toFixed(2)} MB` : "ไฟล์พร้อมเวียน"}
                      {scannedPages.length > 0 && ` • สแกน ${scannedPages.length} หน้า`}
                      {fileType && ` • ${fileType.includes("pdf") ? "เอกสาร PDF" : "รูปภาพเอกสาร"}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl cursor-pointer transition-all shadow-2xs"
                  >
                    เปลี่ยนไฟล์
                  </button>
                  {scannedPages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowScannerModal(true)}
                      className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer transition-all shadow-2xs"
                    >
                      สแกนเพิ่ม
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleRemoveAttachment}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer transition-colors"
                    title="ยกเลิกไฟล์แนบ"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Live Camera Scanner Button */}
                <button
                  type="button"
                  onClick={() => setShowScannerModal(true)}
                  className="p-5 rounded-2xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50 text-indigo-700 text-xs font-bold flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group"
                >
                  <span className="text-3xl group-hover:scale-110 transition-transform">📷</span>
                  <span className="text-sm">เปิดกล้องสแกนเอกสารสด (Live Camera)</span>
                  <span className="text-[11px] text-indigo-500 font-normal text-center">
                    ถ่ายภาพหนังสือราชการ A4 หลายหน้า ปรับภาพขาวดำคมชัดอัตโนมัติ
                  </span>
                </button>

                {/* File Upload Dropzone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-5 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group ${
                    isDragOver
                      ? "border-indigo-500 bg-indigo-100/70"
                      : "border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-3xl group-hover:scale-110 transition-transform">📁</span>
                  <span className="text-sm font-bold text-slate-700">เลือกไฟล์จากเครื่อง (PDF / รูปภาพ)</span>
                  <span className="text-[11px] text-slate-500 font-normal text-center">
                    คลิกเพื่อค้นหา หรือลากไฟล์ PDF / รูปภาพ มาวางที่นี่
                  </span>
                </div>
              </div>
            )}

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/*"
              onChange={handleManualFileUpload}
              className="hidden"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              disabled={!title.trim() || resolvedRecipients.length === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>🚀 ออกหนังสือเวียนทันที</span>
              <span>({resolvedRecipients.length} ท่าน)</span>
            </button>
          </div>
    </>
  );

  if (inPage) {
    return (
      <div data-testid="new-circular-view" className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in text-slate-800 pb-12">
        {/* In-page Header Bar */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs sm:text-sm transition-colors cursor-pointer"
            >
              <span>←</span>
              <span>ย้อนกลับไปรายการหนังสือเวียน</span>
            </button>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-xl">
              📜
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-heading text-slate-800">
                สร้างหนังสือเวียนราชการใหม่ (New Circular Document)
              </h3>
              <p className="text-xs text-slate-500">
                ออกหนังสือเวียน กำหนดกลุ่มเป้าหมาย และระบบลงนามรับทราบตามระเบียบสารบรรณ
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-all cursor-pointer"
            >
              ยกเลิก
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
          {formInner}
        </form>

        {/* Submodal for Document Scanner */}
        {showScannerModal && (
          <DocumentScannerModal
            inPage={false}
            onClose={() => setShowScannerModal(false)}
            onPagesCaptured={handleScannerFinished}
          />
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in text-slate-800">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-xl">
              📜
            </div>
            <div>
              <h3 className="text-base font-bold font-heading text-white">
                สร้างหนังสือเวียนราชการใหม่ (New Circular Document)
              </h3>
              <p className="text-xs text-indigo-200">
                ออกหนังสือเวียน กำหนดกลุ่มเป้าหมาย และระบบลงนามรับทราบตามระเบียบสารบรรณ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white text-sm cursor-pointer transition-all"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F8FAFC]">
          {formInner}
        </form>
      </div>

      {showScannerModal && (
        <DocumentScannerModal
          inPage={false}
          onClose={() => setShowScannerModal(false)}
          onPagesCaptured={handleScannerFinished}
        />
      )}
    </div>
  );
}
