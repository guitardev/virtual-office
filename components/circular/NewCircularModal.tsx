"use client";

import React, { useState, useMemo } from "react";
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
import { DocumentScannerModal } from "./DocumentScannerModal";

interface NewCircularModalProps {
  currentUser: Member;
  availableMembers: Member[];
  onSave: (doc: CircularDocument) => void;
  onClose: () => void;
}

export function NewCircularModal({
  currentUser,
  availableMembers,
  onSave,
  onClose,
}: NewCircularModalProps) {
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
  const [scannedPages, setScannedPages] = useState<string[]>([]);
  const [showScannerModal, setShowScannerModal] = useState<boolean>(false);

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

  const handleManualFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      if (loadEvt.target?.result) {
        setFileUrl(loadEvt.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleScannerFinished = (pages: string[], name: string) => {
    setScannedPages(pages);
    setFileName(name);
    setFileUrl(pages[0] || "");
    setShowScannerModal(false);
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
      fileSize: scannedPages.length > 0 ? scannedPages.length * 450000 : 1250000,
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
  };

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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:border-indigo-600"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                >
                  <option value="normal">ปกติ</option>
                  <option value="urgent">⚡ ด่วน</option>
                  <option value="very_urgent">⚡⚡ ด่วนมาก</option>
                  <option value="most_urgent">🚨 ด่วนที่สุด</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  กำหนดรับทราบภายใน (Deadline)
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                สรุปสาระสำคัญโดยย่อ
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
                  className="accent-indigo-600"
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
                  className="accent-indigo-600"
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
              </div>
            )}

            {/* Recipients List Drawer */}
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
              <span className="text-[10px] text-slate-400 font-mono">บันทึกลง Synology NAS</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowScannerModal(true)}
                className="p-4 rounded-xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 text-xs font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <span className="text-2xl">📷</span>
                <span>เปิดกล้องสแกนเอกสารสด (Live Camera)</span>
                <span className="text-[10px] text-indigo-500 font-normal">
                  ถ่ายภาพหนังสือหลายหน้า ปรับความคมชัดอัตโนมัติ
                </span>
              </button>

              <label className="p-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all">
                <span className="text-2xl">📁</span>
                <span>เลือกไฟล์จากเครื่อง (PDF / รูปภาพ)</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  {fileName ? `ไฟล์ที่เลือก: ${fileName}` : "ลากวางไฟล์ หรือคลิกเพื่อค้นหา"}
                </span>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={handleManualFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Scanned Badge */}
            {scannedPages.length > 0 && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
                <div className="flex items-center gap-2">
                  <span>✓</span>
                  <span>
                    สแกนเอกสารเรียบร้อยแล้ว: <strong>{scannedPages.length} หน้า</strong> ({fileName})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowScannerModal(true)}
                  className="text-xs text-emerald-700 font-bold hover:underline"
                >
                  เปิดดู/สแกนเพิ่ม
                </button>
              </div>
            )}
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-all cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              disabled={!title.trim() || resolvedRecipients.length === 0}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <span>ส่งเวียนหนังสือราชการ ({resolvedRecipients.length} คน) ➜</span>
            </button>
          </div>
        </form>
      </div>

      {/* Scanner Sub-modal */}
      {showScannerModal && (
        <DocumentScannerModal
          onPagesCaptured={handleScannerFinished}
          onClose={() => setShowScannerModal(false)}
        />
      )}
    </div>
  );
}
