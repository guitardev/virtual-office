"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Member,
  CircularDocument,
  CircularUrgency,
  CircularSecretLevel,
  CircularTargetCriteria,
  PersonnelType,
  OfficialDocumentType,
} from "@/lib/types";
import { GOVERNMENT_DIVISIONS, GOVERNMENT_PERSONNEL_TYPES } from "@/lib/rbac";
import {
  resolveTargetRecipients,
  CIRCULAR_OFFICIAL_PRESETS,
  CircularPreset,
} from "@/lib/circular-data";
import { getUserNasSid, getClientSynologyConfig, uploadNasFileDirect } from "@/lib/synology";
import { DocumentScannerModal } from "./DocumentScannerModal";
import { OfficialCircularSheet } from "./OfficialCircularSheet";
import { ThaiCalendarDatePicker } from "./ThaiCalendarDatePicker";
import { getTodayThaiDate, formatIsoToThaiDate } from "@/lib/thai-numerals";

interface NewCircularModalProps {
  currentUser: Member;
  availableMembers: Member[];
  onSave: (doc: CircularDocument) => void;
  onClose: () => void;
  initialScannedPages?: string[];
  initialFileName?: string;
  inPage?: boolean;
}

export function NewCircularModal({
  currentUser,
  availableMembers,
  onSave,
  onClose,
  initialScannedPages = [],
  initialFileName,
  inPage = true,
}: NewCircularModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sub-tabs for form: "edit" or "preview"
  const [formSubTab, setFormSubTab] = useState<"edit" | "preview">("edit");
  const [previewDocViewMode, setPreviewDocViewMode] = useState<"letter" | "attachment">("letter");
  const [showPresetPicker, setShowPresetPicker] = useState<boolean>(false);
  const [isNasLoading, setIsNasLoading] = useState<boolean>(false);
  const [nasFiles, setNasFiles] = useState<{ name: string; path: string; size: number }[]>([]);
  const [showNasPicker, setShowNasPicker] = useState<boolean>(false);
  const [blobPdfUrl, setBlobPdfUrl] = useState<string | null>(null);
  const [activePreviewPageIndex, setActivePreviewPageIndex] = useState<number>(0);
  const [showAttachmentPreview, setShowAttachmentPreview] = useState<boolean>(true);

  // Official Document Attributes
  const [docType, setDocType] = useState<OfficialDocumentType>("memo");
  const [docNumber, setDocNumber] = useState<string>("พม ๐๐๐๕/ว ");
  const [title, setTitle] = useState<string>("");
  const [issuedDate, setIssuedDate] = useState<string>(() => getTodayThaiDate());
  const [senderOrg, setSenderOrg] = useState<string>("สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร");
  const [urgency, setUrgency] = useState<CircularUrgency>("normal");
  const [secretLevel, setSecretLevel] = useState<CircularSecretLevel>("normal");
  const [referenceDoc, setReferenceDoc] = useState<string>("");
  const [attachmentList, setAttachmentList] = useState<string>("");
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

  useEffect(() => {
    if (initialScannedPages && initialScannedPages.length > 0) {
      setScannedPages(initialScannedPages);
      const firstPage = initialScannedPages[0];
      const isPdf =
        firstPage.startsWith("data:application/pdf") ||
        firstPage.toLowerCase().includes(".pdf");
      setFileUrl(firstPage);
      setFileName(
        initialFileName ||
          (isPdf
            ? `เอกสารสแกนราชการ_${new Date().toISOString().slice(0, 10)}.pdf`
            : `เอกสารสแกนราชการ_${new Date().toISOString().slice(0, 10)}.jpg`)
      );
      setFileType(isPdf ? "application/pdf" : "image/jpeg");
      setFileSize(initialScannedPages.length * 450000);
      setShowAttachmentPreview(true);
      setActivePreviewPageIndex(0);
    }
  }, [initialScannedPages, initialFileName]);

  // Safely convert Base64 PDF data URL into Blob URL for Chrome/Edge PDF rendering
  useEffect(() => {
    if (fileUrl && fileUrl.startsWith("data:application/pdf")) {
      try {
        const base64Data = fileUrl.includes(",") ? fileUrl.split(",")[1] : fileUrl;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        setBlobPdfUrl(url);
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch (err) {
        console.warn("Could not generate Blob URL for PDF in NewCircularModal:", err);
      }
    } else {
      setBlobPdfUrl(null);
    }
  }, [fileUrl]);

  const activePdfUrl = blobPdfUrl || fileUrl;
  const isPdfDocument =
    fileType.includes("pdf") ||
    fileName.toLowerCase().endsWith(".pdf") ||
    Boolean(
      fileUrl &&
        (fileUrl.startsWith("data:application/pdf") ||
          fileUrl.toLowerCase().includes(".pdf"))
    );

  const handleScannerFinished = (pages: string[], name: string) => {
    setScannedPages(pages);
    setFileName(name);
    setFileUrl(pages[0] || "");
    setFileSize(pages.length * 450000);
    const isPdf =
      name.toLowerCase().endsWith(".pdf") ||
      Boolean(
        pages[0] &&
          (pages[0].startsWith("data:application/pdf") ||
            pages[0].toLowerCase().includes(".pdf"))
      );
    setFileType(isPdf ? "application/pdf" : "image/jpeg");
    setShowAttachmentPreview(true);
    setActivePreviewPageIndex(0);
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
    setShowAttachmentPreview(false);
    setActivePreviewPageIndex(0);
    setBlobPdfUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || resolvedRecipients.length === 0) return;

    const newDoc: CircularDocument = {
      id: `circ_${Date.now()}`,
      docType,
      referenceDoc: referenceDoc.trim() || undefined,
      attachmentList: attachmentList.trim() || undefined,
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
        uploadNasFileDirect(
          selectedFileObj,
          "/virtual-office/circular_docs",
          sid || "",
          config.nasUrl
        )
          .then((res) => {
            if (res.success && res.file) {
              console.log("[Circular] Synced file directly to NAS:", res.file.path);
            }
          })
          .catch((err) => console.warn("[Circular] NAS direct sync failed:", err));
      } catch (err) {
        console.warn("[Circular] NAS sync error:", err);
      }
    }
  };

  const handleSelectPreset = (preset: CircularPreset) => {
    if (preset.docType) setDocType(preset.docType);
    setReferenceDoc(preset.referenceDoc || "");
    setAttachmentList(preset.attachmentList || "");
    setDocNumber(preset.docNumber);
    setTitle(preset.title);
    setIssuedDate(preset.issuedDate);
    setSenderOrg(preset.senderOrg);
    setUrgency(preset.urgency);
    setSecretLevel(preset.secretLevel);
    setSummary(preset.summary);
    setFileName(preset.fileName);
    setFileUrl(preset.fileUrl);
    setFileSize(preset.fileSize);
    setFileType("application/pdf");
    setScannedPages([]);
    setShowAttachmentPreview(true);
    setActivePreviewPageIndex(0);
    setShowPresetPicker(false);
  };

  const handleFetchNasFiles = async () => {
    setShowNasPicker(true);
    setIsNasLoading(true);
    try {
      const res = await fetch("/api/nas/files?folder_path=/virtual-office/circular_docs");
      const data = await res.json();
      if (data.success && Array.isArray(data.files)) {
        setNasFiles(data.files.filter((f: any) => !f.is_dir));
      } else {
        setNasFiles([]);
      }
    } catch {
      setNasFiles([]);
    } finally {
      setIsNasLoading(false);
    }
  };

  const handleSelectNasFile = (file: { name: string; path: string; size: number }) => {
    setFileName(file.name);
    setFileSize(file.size);
    setFileType(file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream");
    setFileUrl(`/api/nas/download?path=${encodeURIComponent(file.path)}&mode=open`);
    setScannedPages([]);
    setShowAttachmentPreview(true);
    setActivePreviewPageIndex(0);
    setShowNasPicker(false);
  };

  const previewDoc: CircularDocument = useMemo(
    () => ({
      id: `circ_preview_${Date.now()}`,
      docType,
      referenceDoc: referenceDoc.trim() || undefined,
      attachmentList: attachmentList.trim() || undefined,
      docNumber: docNumber.trim() || "ว-ภายใน",
      title: title.trim() || "ชื่อเรื่องหนังสือเวียนราชการ",
      issuedDate: issuedDate.trim(),
      senderOrg: senderOrg.trim(),
      urgency,
      secretLevel,
      summary: summary.trim(),
      fileUrl: fileUrl || "/virtual-office/circular_docs/sample.pdf",
      fileName: fileName || "เอกสารแนบหนังสือเวียน.pdf",
      fileSize: fileSize || 1500000,
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
    }),
    [
      docType,
      referenceDoc,
      attachmentList,
      docNumber,
      title,
      issuedDate,
      senderOrg,
      urgency,
      secretLevel,
      summary,
      fileUrl,
      fileName,
      fileSize,
      scannedPages,
      currentUser,
      deadline,
      targetCriteria,
      resolvedRecipients,
    ]
  );

  const formInner = (
    <>
      {/* Top Controls: Mode Switcher & Quick Import Presets */}
      <div className="space-y-3 pb-2 border-b border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setFormSubTab("edit")}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                formSubTab === "edit"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>📝</span>
              <span>กรอกข้อมูลหนังสือเวียน</span>
            </button>

            <button
              type="button"
              onClick={() => setFormSubTab("preview")}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                formSubTab === "preview"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>👁️</span>
              <span>ดูตัวอย่างหนังสือราชการตราครุฑ (Live Preview)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowPresetPicker(!showPresetPicker)}
            className="px-3.5 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>✨</span>
            <span>นำเข้าจากแม่แบบราชการมาตรฐาน</span>
            <span>{showPresetPicker ? "▲" : "▼"}</span>
          </button>
        </div>

        {/* Preset Drawer */}
        {showPresetPicker && (
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-2.5 animate-fade-in text-xs">
            <div className="font-bold text-slate-800 flex items-center justify-between">
              <span>เลือกแม่แบบหนังสือเวียนเพื่อกรอกข้อมูลและแนบไฟล์ตัวอย่างอัตโนมัติ:</span>
              <button
                type="button"
                onClick={() => setShowPresetPicker(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕ ปิด
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CIRCULAR_OFFICIAL_PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => handleSelectPreset(p)}
                  className="p-3 rounded-xl bg-white border border-indigo-100 hover:border-indigo-400 hover:shadow-xs transition-all cursor-pointer group text-left w-full"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.2 rounded">
                      {p.docNumber}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-slate-100 text-slate-700">
                      {p.docType === "external"
                        ? "🏛️ ภายนอก"
                        : p.docType === "command"
                        ? "⚖️ คำสั่ง"
                        : p.docType === "announcement"
                        ? "📢 ประกาศ"
                        : "📜 ภายใน"}
                    </span>
                    <span className="text-[10px] text-slate-400">{p.issuedDate}</span>
                  </div>
                  <div className="font-bold text-slate-800 group-hover:text-indigo-600 line-clamp-1">
                    {p.name}
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                    {p.summary}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {formSubTab === "preview" ? (
        <div className="py-4 space-y-4 animate-fade-in">
          {/* Dual-Mode Selector in Live Preview */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setPreviewDocViewMode("letter")}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  previewDocViewMode === "letter"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>📜</span>
                <span>หนังสือราชการตราครุฑ</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewDocViewMode("attachment")}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  previewDocViewMode === "attachment"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>📎</span>
                <span>เอกสารแนบต้นฉบับ / หน้าสแกน</span>
                {(fileName || scannedPages.length > 0) && (
                  <span className="max-w-[140px] truncate text-[10px] text-slate-500 font-normal">
                    ({fileName || `${scannedPages.length} หน้า`})
                  </span>
                )}
              </button>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              บุคลากรเป้าหมาย {resolvedRecipients.length} คน
            </div>
          </div>

          {previewDocViewMode === "letter" ? (
            <OfficialCircularSheet document={previewDoc} showVerificationSeal={false} />
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col items-center animate-fade-in space-y-3">
              {scannedPages.length > 0 ? (
                <div className="w-full space-y-3">
                  <div className="flex items-center justify-between text-xs px-2">
                    <span className="font-bold text-slate-700">
                      หน้า {activePreviewPageIndex + 1} จาก {scannedPages.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={activePreviewPageIndex === 0}
                        onClick={() => setActivePreviewPageIndex((p) => Math.max(0, p - 1))}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer font-bold"
                      >
                        ◀ หน้าก่อน
                      </button>
                      <button
                        type="button"
                        disabled={activePreviewPageIndex === scannedPages.length - 1}
                        onClick={() =>
                          setActivePreviewPageIndex((p) =>
                            Math.min(scannedPages.length - 1, p + 1)
                          )
                        }
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer font-bold"
                      >
                        หน้าถัดไป ▶
                      </button>
                    </div>
                  </div>

                  <div className="w-full max-h-[550px] overflow-auto bg-slate-900/5 rounded-xl border border-slate-200 flex items-center justify-center p-2">
                    {scannedPages[activePreviewPageIndex]?.startsWith("data:application/pdf") ||
                    scannedPages[activePreviewPageIndex]?.toLowerCase().includes(".pdf") ? (
                      <object
                        data={activePdfUrl}
                        type="application/pdf"
                        className="w-full h-[500px] rounded-lg"
                      >
                        <iframe
                          src={activePdfUrl}
                          title={`Document page ${activePreviewPageIndex + 1}`}
                          className="w-full h-[500px] rounded-lg border-none bg-white"
                        />
                      </object>
                    ) : (
                      <img
                        src={scannedPages[activePreviewPageIndex]}
                        alt={`Document page ${activePreviewPageIndex + 1}`}
                        className="max-h-[480px] w-auto object-contain shadow-md rounded"
                      />
                    )}
                  </div>
                </div>
              ) : activePdfUrl ? (
                <div className="w-full space-y-3">
                  <div className="w-full h-[540px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                    <object
                      data={activePdfUrl}
                      type="application/pdf"
                      className="w-full h-full"
                    >
                      <iframe
                        src={activePdfUrl}
                        title="ตัวอย่างเอกสารแนบ"
                        className="w-full h-full border-none"
                      />
                    </object>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  ยังไม่ได้แนบเอกสาร หรือสแกนเอกสารเข้าระบบ
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Official Header & Urgency */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="text-xs font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span>๑. ข้อมูลหนังสือราชการ</span>
                <span className="text-[10px] text-indigo-600 font-mono">ระเบียบงานสารบรรณ</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                รองรับมาตรฐาน ๔ รูปแบบราชการ
              </span>
            </div>

            {/* แม่แบบหนังสือราชการ ๔ รูปแบบ */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                เลือกรูปแบบแม่แบบหนังสือราชการ <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDocType("memo");
                    if (docNumber === "" || docNumber.startsWith("พม ๐๐๐๕/๑") || docNumber.includes("๑๒/๒๕๖๙")) {
                      setDocNumber("พม ๐๐๐๕/ว ");
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    docType === "memo"
                      ? "border-indigo-600 bg-indigo-50/70 shadow-2xs"
                      : "border-slate-200 bg-slate-50 hover:bg-white text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                    <span>📜</span>
                    <span>บันทึกข้อความ</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 leading-tight">
                    หนังสือภายใน ครุฑ ๑.๕ ซม. มุมซ้ายบน
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDocType("external");
                    if (docNumber === "" || docNumber.endsWith("/ว ") || docNumber.includes("๑๒/๒๕๖๙")) {
                      setDocNumber("พม ๐๐๐๕/");
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    docType === "external"
                      ? "border-indigo-600 bg-indigo-50/70 shadow-2xs"
                      : "border-slate-200 bg-slate-50 hover:bg-white text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                    <span>🏛️</span>
                    <span>หนังสือภายนอก</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 leading-tight">
                    ติดต่อภายนอก ครุฑ ๓.๐ ซม. กึ่งกลางบน
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDocType("command");
                    if (docNumber === "" || docNumber.includes("พม ๐๐๐๕")) {
                      setDocNumber("๑๒/๒๕๖๙");
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    docType === "command"
                      ? "border-indigo-600 bg-indigo-50/70 shadow-2xs"
                      : "border-slate-200 bg-slate-50 hover:bg-white text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                    <span>⚖️</span>
                    <span>คำสั่งราชการ</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 leading-tight">
                    หนังสือสั่งการ ครุฑ ๓.๐ ซม. กึ่งกลางบน
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDocType("announcement");
                    if (docNumber === "" || docNumber.includes("พม ๐๐๐๕")) {
                      setDocNumber("๕/๒๕๖๙");
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    docType === "announcement"
                      ? "border-indigo-600 bg-indigo-50/70 shadow-2xs"
                      : "border-slate-200 bg-slate-50 hover:bg-white text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                    <span>📢</span>
                    <span>ประกาศราชการ</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1 leading-tight">
                    หนังสือประชาสัมพันธ์ ครุฑ ๓.๐ ซม.
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  เลขที่หนังสือ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="เช่น พม ๐๐๐๕/ว ๑๒๓๔"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono font-bold focus:border-indigo-600"
                />
              </div>

              <ThaiCalendarDatePicker
                label="ลงวันที่"
                required
                value={issuedDate}
                onChange={(thaiDate) => setIssuedDate(thaiDate)}
                id="circular-doc-issued-date"
              />
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    กำหนดส่งการรับทราบ/ถือปฏิบัติภายใน (ถ้ามี)
                  </label>
                  {deadline && (
                    <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-1.5 py-0.2 rounded">
                      {formatIsoToThaiDate(deadline)}
                    </span>
                  )}
                </div>
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

            {/* ข้อมูลอ้างถึง & สิ่งที่ส่งมาด้วย (สำหรับหนังสือภายนอก หรือ บันทึกข้อความที่มีเอกสารอ้างอิง) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-0.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  อ้างถึง (หนังสืออ้างถึง ถ้ามี)
                </label>
                <input
                  type="text"
                  value={referenceDoc}
                  onChange={(e) => setReferenceDoc(e.target.value)}
                  placeholder="เช่น หนังสือจังหวัดกำแพงเพชร ที่ กพ ๐๐๓๒/ว ๑๔๒ ลงวันที่..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  สิ่งที่ส่งมาด้วย (ถ้ามี)
                </label>
                <input
                  type="text"
                  value={attachmentList}
                  onChange={(e) => setAttachmentList(e.target.value)}
                  placeholder="เช่น ๑. สำเนาประกาศ ๑ ฉบับ ๒. แบบฟอร์ม ๑ ชุด"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-indigo-600"
                />
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

            {/* If a file is already selected or scanned, display active card & preview */}
            {fileName ? (
              <div className="space-y-3 animate-fade-in">
                <div className="p-4 rounded-2xl bg-indigo-50/70 border-2 border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
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
                      onClick={() => setShowAttachmentPreview(!showAttachmentPreview)}
                      className="px-3 py-1.5 text-xs font-semibold bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 rounded-xl cursor-pointer transition-all shadow-2xs flex items-center gap-1.5"
                    >
                      <span>{showAttachmentPreview ? "🙈 ซ่อนตัวอย่าง" : "👁️ ดูตัวอย่างเอกสาร"}</span>
                    </button>
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

                {/* Embedded Document Preview Box */}
                {showAttachmentPreview && (fileUrl || scannedPages.length > 0) && (
                  <div
                    data-testid="circular-document-preview-box"
                    className="p-4 bg-slate-900/5 rounded-2xl border border-slate-200 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span>👁️</span>
                          <span>ตัวอย่างเอกสารที่นำเข้า / หน้าสแกน</span>
                        </span>
                        {scannedPages.length > 1 && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-mono text-[11px] font-bold">
                            หน้า {activePreviewPageIndex + 1} จาก {scannedPages.length}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {scannedPages.length > 1 && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={activePreviewPageIndex === 0}
                              onClick={() => setActivePreviewPageIndex((p) => Math.max(0, p - 1))}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 cursor-pointer shadow-2xs"
                            >
                              ◀ ก่อนหน้า
                            </button>
                            <button
                              type="button"
                              disabled={activePreviewPageIndex === scannedPages.length - 1}
                              onClick={() =>
                                setActivePreviewPageIndex((p) =>
                                  Math.min(scannedPages.length - 1, p + 1)
                                )
                              }
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-30 cursor-pointer shadow-2xs"
                            >
                              ถัดไป ▶
                            </button>
                          </div>
                        )}

                        {activePdfUrl && (
                          <button
                            type="button"
                            onClick={() => window.open(activePdfUrl, "_blank")}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer shadow-2xs flex items-center gap-1"
                            title="เปิดเอกสารในแท็บใหม่แบบเต็มจอ"
                          >
                            <span>🔍</span>
                            <span>ขยายเต็มจอ</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Preview Viewport */}
                    <div className="w-full max-h-[500px] overflow-auto bg-white rounded-xl border border-slate-200 flex items-center justify-center p-2 relative shadow-inner">
                      {isPdfDocument ? (
                        <object
                          data={activePdfUrl}
                          type="application/pdf"
                          className="w-full h-[460px] rounded-lg"
                        >
                          <iframe
                            src={activePdfUrl}
                            title="ตัวอย่างเอกสาร PDF"
                            className="w-full h-[460px] rounded-lg border-none"
                          />
                        </object>
                      ) : (
                        <img
                          src={scannedPages[activePreviewPageIndex] || fileUrl}
                          alt="ตัวอย่างเอกสารสแกน"
                          className="max-h-[460px] w-auto object-contain rounded-lg shadow-sm"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Live Camera Scanner Button */}
                <button
                  type="button"
                  onClick={() => setShowScannerModal(true)}
                  className="p-4 rounded-2xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50 text-indigo-700 text-xs font-bold flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">📷</span>
                  <span className="text-xs font-bold">สแกนเอกสารสด</span>
                  <span className="text-[10px] text-indigo-500 font-normal text-center">
                    ถ่ายภาพเอกสาร A4 ปรับขาวดำคมชัด
                  </span>
                </button>

                {/* File Upload Dropzone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group ${
                    isDragOver
                      ? "border-indigo-500 bg-indigo-100/70"
                      : "border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">📁</span>
                  <span className="text-xs font-bold text-slate-700">อัปโหลดไฟล์จากเครื่อง</span>
                  <span className="text-[10px] text-slate-500 font-normal text-center">
                    ไฟล์ PDF หรือรูปภาพ (ลากวางได้)
                  </span>
                </div>

                {/* Synology NAS Cloud Library Picker */}
                <button
                  type="button"
                  onClick={handleFetchNasFiles}
                  className="p-4 rounded-2xl border-2 border-dashed border-sky-300 hover:border-sky-500 bg-sky-50/40 hover:bg-sky-50 text-sky-800 text-xs font-bold flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">☁️</span>
                  <span className="text-xs font-bold">คลังเอกสาร NAS</span>
                  <span className="text-[10px] text-sky-600 font-normal text-center">
                    ดึงไฟล์จาก Synology File Station
                  </span>
                </button>
              </div>
            )}

            {/* NAS File Picker Drawer */}
            {showNasPicker && (
              <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-2 animate-fade-in text-xs">
                <div className="flex items-center justify-between font-bold text-sky-950">
                  <span className="flex items-center gap-1.5">
                    <span>☁️</span>
                    <span>ไฟล์เอกสารบน Synology NAS (/virtual-office/circular_docs):</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowNasPicker(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    ✕ ปิด
                  </button>
                </div>

                {isNasLoading ? (
                  <div className="py-4 text-center text-sky-600 flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span> กำลังโหลดไฟล์จากคลัง Synology NAS...
                  </div>
                ) : nasFiles.length === 0 ? (
                  <div className="py-4 text-center text-slate-500 bg-white rounded-xl border border-sky-100">
                    ไม่พบไฟล์ในโฟลเดอร์ /virtual-office/circular_docs บน NAS ท่านสามารถอัปโหลดไฟล์จากเครื่องได้โดยตรง
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto divide-y divide-sky-100 bg-white rounded-xl border border-sky-200">
                    {nasFiles.map((file) => (
                      <div
                        key={file.path}
                        onClick={() => handleSelectNasFile(file)}
                        className="p-2.5 flex items-center justify-between hover:bg-sky-50 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-lg">📄</span>
                          <span className="font-semibold text-slate-800 truncate group-hover:text-sky-700">
                            {file.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                          {Math.round(file.size / 1024)} KB
                        </span>
                      </div>
                    ))}
                  </div>
                )}
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
        </div>
      )}

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
