"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Member,
  CircularDocument,
  CircularAttachment,
  CircularUrgency,
  CircularSecretLevel,
  CircularTargetCriteria,
  PersonnelType,
} from "@/lib/types";
import { GOVERNMENT_DIVISIONS, GOVERNMENT_PERSONNEL_TYPES } from "@/lib/rbac";
import { resolveTargetRecipients } from "@/lib/circular-data";
import { getUserNasSid, getClientSynologyConfig, uploadNasFileDirect } from "@/lib/synology";
import { DocumentScannerModal } from "./DocumentScannerModal";
import { ThaiCalendarDatePicker } from "./ThaiCalendarDatePicker";
import { getTodayThaiDate, formatIsoToThaiDate, toThaiDigits } from "@/lib/thai-numerals";

export function getFileCategoryInfo(name: string, mime?: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const m = (mime || "").toLowerCase();

  if (ext === "pdf" || m.includes("pdf")) {
    return { icon: "📕", label: "PDF", bg: "bg-rose-50 text-rose-700 border-rose-200", badge: "PDF", type: "pdf" };
  }
  if (["doc", "docx"].includes(ext) || m.includes("word") || m.includes("officedocument.wordprocessingml")) {
    return { icon: "📘", label: "Word", bg: "bg-blue-50 text-blue-700 border-blue-200", badge: "DOCX", type: "word" };
  }
  if (["xls", "xlsx", "csv"].includes(ext) || m.includes("excel") || m.includes("spreadsheet") || m.includes("csv")) {
    return { icon: "📗", label: "Excel", bg: "bg-emerald-50 text-emerald-700 border-emerald-200", badge: "XLSX", type: "excel" };
  }
  if (["ppt", "pptx"].includes(ext) || m.includes("powerpoint") || m.includes("presentation")) {
    return { icon: "📙", label: "PowerPoint", bg: "bg-amber-50 text-amber-700 border-amber-200", badge: "PPTX", type: "ppt" };
  }
  if (["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(ext) || m.startsWith("image/")) {
    return { icon: "🖼️", label: "รูปภาพ", bg: "bg-indigo-50 text-indigo-700 border-indigo-200", badge: "IMAGE", type: "image" };
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext) || m.includes("zip") || m.includes("compressed")) {
    return { icon: "🗜️", label: "ไฟล์บีบอัด", bg: "bg-purple-50 text-purple-700 border-purple-200", badge: "ZIP", type: "zip" };
  }
  return { icon: "📄", label: ext ? ext.toUpperCase() : "เอกสาร", bg: "bg-slate-50 text-slate-700 border-slate-200", badge: ext.toUpperCase() || "FILE", type: "other" };
}

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

  const [isNasLoading, setIsNasLoading] = useState<boolean>(false);
  const [nasFiles, setNasFiles] = useState<{ name: string; path: string; size: number }[]>([]);
  const [showNasPicker, setShowNasPicker] = useState<boolean>(false);
  const [blobPdfUrl, setBlobPdfUrl] = useState<string | null>(null);
  const [activePreviewPageIndex, setActivePreviewPageIndex] = useState<number>(0);
  const [showAttachmentPreview, setShowAttachmentPreview] = useState<boolean>(true);

  // Official Document Attributes
  const [docNumber, setDocNumber] = useState<string>("");
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

  // Multi-attachment state (supports multiple files, multiple types, multiple channels)
  const [attachments, setAttachments] = useState<CircularAttachment[]>(() => {
    if (initialScannedPages && initialScannedPages.length > 0) {
      const isPdf = initialScannedPages[0].startsWith("data:application/pdf");
      return [
        {
          id: `att_${Date.now()}_0`,
          name: initialFileName || (isPdf ? `เอกสารสแกนราชการ_${new Date().toISOString().slice(0, 10)}.pdf` : `เอกสารสแกนราชการ_${new Date().toISOString().slice(0, 10)}.jpg`),
          size: initialScannedPages.length * 450000,
          type: isPdf ? "application/pdf" : "image/jpeg",
          url: initialScannedPages[0],
          scannedPages: initialScannedPages,
          source: "scanner",
        },
      ];
    }
    return [];
  });
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string>("");
  const [showScannerModal, setShowScannerModal] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFileObjs, setSelectedFileObjs] = useState<File[]>([]);

  // Calculate active attachment
  const currentAttachment = useMemo(() => {
    return attachments.find((a) => a.id === selectedAttachmentId) || attachments[0] || null;
  }, [attachments, selectedAttachmentId]);

  const fileName = currentAttachment?.name || "";
  const fileUrl = currentAttachment?.url || "";
  const fileSize = currentAttachment?.size || 0;
  const fileType = currentAttachment?.type || "";
  const scannedPages = currentAttachment?.scannedPages || [];

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

  // Document Number strict validation (must not be empty AND must contain digits)
  const isDocNumberEmpty = docNumber.trim().length === 0;
  const hasDocDigits = /[0-9๐-๙]/.test(docNumber);
  const isDocNumberValid = !isDocNumberEmpty && hasDocDigits;

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

  // Multi-file processor supporting various types (PDF, Word, Excel, PPT, Images, ZIP, etc.)
  const processSelectedFiles = (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setUploadError(null);

    const fileList = Array.from(files);
    const newItems: CircularAttachment[] = [];
    let processed = 0;

    fileList.forEach((file) => {
      if (file.size > 50 * 1024 * 1024) {
        setUploadError(`ขนาดไฟล์ "${file.name}" ใหญ่เกิน 50 MB`);
        processed++;
        return;
      }

      const isImage = file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name);
      const isPdf = file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf");

      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const result = (loadEvt.target?.result as string) || "";
        newItems.push({
          id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: file.name,
          size: file.size,
          type: file.type || (isPdf ? "application/pdf" : isImage ? "image/jpeg" : "application/octet-stream"),
          url: result,
          scannedPages: isImage ? [result] : undefined,
          source: "upload",
        });

        processed++;
        if (processed === fileList.length) {
          if (newItems.length > 0) {
            setAttachments((prev) => [...prev, ...newItems]);
            setSelectedAttachmentId(newItems[newItems.length - 1].id);
            setShowAttachmentPreview(true);
            setActivePreviewPageIndex(0);
          }
        }
      };

      reader.onerror = () => {
        processed++;
        setUploadError(`ไม่สามารถอ่านข้อมูลไฟล์ "${file.name}" ได้ กรุณาลองใหม่อีกครั้ง`);
      };

      reader.readAsDataURL(file);
    });

    setSelectedFileObjs((prev) => [...prev, ...fileList]);
  };

  const handleManualFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFiles(e.target.files);
      e.target.value = "";
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFiles(e.dataTransfer.files);
    }
  };

  // Sync initial scanned pages if provided
  useEffect(() => {
    if (initialScannedPages && initialScannedPages.length > 0 && attachments.length === 0) {
      const firstPage = initialScannedPages[0];
      const isPdf =
        !firstPage.startsWith("data:image/") &&
        (firstPage.startsWith("data:application/pdf") ||
          firstPage.toLowerCase().includes(".pdf"));
      const initName =
        initialFileName ||
        (isPdf
          ? `เอกสารสแกนราชการ_${new Date().toISOString().slice(0, 10)}.pdf`
          : `เอกสารสแกนราชการ_${new Date().toISOString().slice(0, 10)}.jpg`);

      const newAtt: CircularAttachment = {
        id: `att_init_${Date.now()}`,
        name: initName,
        size: initialScannedPages.length * 450000,
        type: isPdf ? "application/pdf" : "image/jpeg",
        url: firstPage,
        scannedPages: initialScannedPages,
        source: "scanner",
      };
      setAttachments([newAtt]);
      setSelectedAttachmentId(newAtt.id);
      setShowAttachmentPreview(true);
      setActivePreviewPageIndex(0);
    }
  }, [initialScannedPages, initialFileName, attachments.length]);

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
  const isPdfDocument = Boolean(
    !fileUrl?.startsWith("data:image/") &&
      (fileUrl?.startsWith("data:application/pdf") ||
        (fileUrl && fileUrl.toLowerCase().includes(".pdf")) ||
        (fileType.includes("pdf") && !fileType.includes("image")) ||
        (fileName.toLowerCase().endsWith(".pdf") && !fileType.startsWith("image/")))
  );
  const isImageDocument = Boolean(
    fileUrl?.startsWith("data:image/") ||
      fileType.startsWith("image/") ||
      /\.(jpe?g|png|webp|gif|bmp)$/i.test(fileName)
  );

  // Scanner channel handler
  const handleScannerFinished = (pages: string[], name: string) => {
    if (!pages || pages.length === 0) return;
    const firstPage = pages[0] || "";
    const isActuallyPdf =
      firstPage.startsWith("data:application/pdf") ||
      (firstPage.toLowerCase().includes(".pdf") && !firstPage.startsWith("data:image/"));

    let cleanName = (name || "").trim();
    if (!cleanName) {
      cleanName = isActuallyPdf
        ? `เอกสารสแกนชุดที่${attachments.length + 1}.pdf`
        : `เอกสารสแกนชุดที่${attachments.length + 1}_${pages.length}หน้า.jpg`;
    } else if (!isActuallyPdf && cleanName.toLowerCase().endsWith(".pdf")) {
      cleanName = cleanName.replace(/\.pdf$/i, pages.length > 1 ? ".pdf" : ".jpg");
    }

    const newAtt: CircularAttachment = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: cleanName,
      size: pages.length * 450000,
      type: isActuallyPdf ? "application/pdf" : "image/jpeg",
      url: firstPage,
      scannedPages: pages,
      source: "scanner",
    };

    setAttachments((prev) => [...prev, newAtt]);
    setSelectedAttachmentId(newAtt.id);
    setShowAttachmentPreview(true);
    setActivePreviewPageIndex(0);
    setShowScannerModal(false);
  };

  // Remove individual attachment
  const handleRemoveAttachmentItem = (attId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAttachments((prev) => {
      const filtered = prev.filter((a) => a.id !== attId);
      if (selectedAttachmentId === attId) {
        setSelectedAttachmentId(filtered[0]?.id || "");
      }
      return filtered;
    });
  };

  // Set attachment as primary (ฉบับหลัก)
  const handleSetPrimaryAttachment = (attId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setAttachments((prev) => {
      const idx = prev.findIndex((a) => a.id === attId);
      if (idx <= 0) return prev;
      const target = prev[idx];
      const rest = prev.filter((_, i) => i !== idx);
      return [target, ...rest];
    });
    setSelectedAttachmentId(attId);
  };

  const handleRemoveAllAttachments = () => {
    setAttachments([]);
    setSelectedAttachmentId("");
    setSelectedFileObjs([]);
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
    if (!isDocNumberValid) {
      alert("กรุณาระบุเลขที่หนังสือให้ครบถ้วน โดยจำเป็นต้องมีตัวเลขกำกับ เช่น พม ๐๐๐๕/ว ๑๒๓๔");
      return;
    }
    if (!title.trim()) {
      alert("กรุณาระบุชื่อเรื่องหนังสือเวียน");
      return;
    }
    if (resolvedRecipients.length === 0) {
      alert("กรุณาระบุกลุ่มเป้าหมายผู้รับหนังสือเวียนอย่างน้อย ๑ ท่าน");
      return;
    }

    const primaryAttachment = attachments[0];
    const newDoc: CircularDocument = {
      id: `circ_${Date.now()}`,
      docType: "memo",
      referenceDoc: referenceDoc.trim() || undefined,
      attachmentList: attachmentList.trim() || (attachments.length > 1 ? attachments.map((a, i) => `${i + 1}. ${a.name}`).join(", ") : undefined),
      docNumber: docNumber.trim(),
      title: title.trim(),
      issuedDate: issuedDate.trim(),
      senderOrg: senderOrg.trim(),
      urgency,
      secretLevel,
      summary: summary.trim(),
      fileUrl: primaryAttachment?.url || fileUrl || "/virtual-office/circular_docs/sample.pdf",
      fileName: primaryAttachment?.name || fileName || "เอกสารแนบหนังสือเวียน.pdf",
      fileSize: primaryAttachment?.size || fileSize || 1250000,
      totalPages: primaryAttachment?.scannedPages?.length || (scannedPages.length > 0 ? scannedPages.length : 1),
      scannedPages: primaryAttachment?.scannedPages || (scannedPages.length > 0 ? scannedPages : undefined),
      attachments: attachments.length > 0 ? attachments : undefined,
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

    // Background sync attached files to Synology NAS /virtual-office/circular_docs
    if (selectedFileObjs.length > 0) {
      try {
        const sid = getUserNasSid();
        const config = getClientSynologyConfig();
        selectedFileObjs.forEach((fileObj) => {
          uploadNasFileDirect(
            fileObj,
            "/virtual-office/circular_docs",
            sid || "",
            config.nasUrl
          ).catch((err) => console.warn("[Circular] NAS direct sync failed for", fileObj.name, err));
        });
      } catch (err) {
        console.warn("[Circular] NAS sync error:", err);
      }
    }
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
    const isPdfExt = file.name.toLowerCase().endsWith(".pdf");
    const isImgExt = /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name);

    const newAtt: CircularAttachment = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: file.name,
      size: file.size,
      type: isPdfExt ? "application/pdf" : isImgExt ? "image/jpeg" : "application/octet-stream",
      url: `/api/nas/download?path=${encodeURIComponent(file.path)}&mode=open`,
      nasPath: file.path,
      source: "nas",
    };

    setAttachments((prev) => [...prev, newAtt]);
    setSelectedAttachmentId(newAtt.id);
    setShowAttachmentPreview(true);
    setActivePreviewPageIndex(0);
    setShowNasPicker(false);
  };

  const formInner = (
    <div className="space-y-6">
          {/* Section 1: Official Header & Urgency */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
            <div className="text-xs font-bold text-slate-900 flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <span>๑. ข้อมูลหนังสือเวียนที่นำมาเวียน</span>
                <span className="text-[10px] text-indigo-600 font-mono">รับ - ส่ง หนังสือเวียน</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                ระบุเลขที่ เรื่อง และวันที่ของหนังสือเวียนต้นฉบับ
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    เลขที่หนังสือ <span className="text-rose-500">*</span>
                  </label>
                  {isDocNumberEmpty ? (
                    <span className="text-[10px] text-rose-500 font-bold">
                      * จำเป็นต้องระบุเลขที่หนังสือ
                    </span>
                  ) : !hasDocDigits ? (
                    <span className="text-[10px] text-amber-600 font-bold">
                      ⚠️ ต้องมีตัวเลขกำกับ (เช่น ๑๒๓๔)
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-600 font-bold">
                      ✓ เลขที่หนังสือถูกต้อง
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={docNumber}
                  onChange={(e) => setDocNumber(toThaiDigits(e.target.value))}
                  placeholder="เช่น พม ๐๐๐๕/ว ๑๒๓๔"
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs text-slate-800 font-mono font-bold focus:outline-none transition-colors ${
                    !isDocNumberValid && docNumber.length > 0
                      ? "border-amber-400 focus:border-amber-500 bg-amber-50/20"
                      : isDocNumberValid
                      ? "border-emerald-300 focus:border-emerald-500"
                      : "border-slate-200 focus:border-indigo-600"
                  }`}
                />
                {!isDocNumberValid && docNumber.length > 0 && (
                  <p className="text-[10px] text-amber-600 mt-1 font-medium">
                    ⚠️ กรุณาระบุตัวเลขหนังสือ เช่น <strong>พม ๐๐๐๕/ว ๑๒๓๔</strong>
                  </p>
                )}
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

          {/* Section 3: File Attachment & Multi-Channel Ingestion */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">๓. ไฟล์หนังสือราชการต้นฉบับและเอกสารแนบท้าย</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    attachments.length > 0
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-500"
                  }`}>
                    {attachments.length} ไฟล์
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  รองรับหลายไฟล์ หลายประเภท (PDF, Word, Excel, PowerPoint, รูปภาพ, ZIP) ผ่าน ๓ ช่องทาง
                </p>
              </div>

              {attachments.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowScannerModal(true)}
                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 cursor-pointer transition-all flex items-center gap-1 shadow-2xs"
                  >
                    <span>📷</span>
                    <span>สแกนสดเพิ่ม</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 cursor-pointer transition-all flex items-center gap-1 shadow-2xs"
                  >
                    <span>📁</span>
                    <span>อัปโหลดเพิ่ม</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleFetchNasFiles}
                    className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl text-xs font-bold border border-sky-200 cursor-pointer transition-all flex items-center gap-1 shadow-2xs"
                  >
                    <span>☁️</span>
                    <span>ดึงจาก NAS</span>
                  </button>
                </div>
              )}
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

            {/* Ingestion Channel Cards (Initial Large View or Drag Area) */}
            {attachments.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Channel 1: Live Camera Scanner */}
                <button
                  type="button"
                  onClick={() => setShowScannerModal(true)}
                  className="p-5 rounded-2xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50 text-indigo-700 text-xs font-bold flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group shadow-2xs"
                >
                  <span className="text-3xl group-hover:scale-110 transition-transform">📷</span>
                  <span className="text-xs font-bold">ช่องทางที่ ๑: สแกนสด</span>
                  <span className="text-[10px] text-indigo-500 font-normal text-center">
                    ถ่ายภาพเอกสาร A4 ผ่านกล้อง/เว็บแคม ปรับคมชัดอัตโนมัติ
                  </span>
                </button>

                {/* Channel 2: Multi-file Local Upload / Drag & Drop */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-5 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group shadow-2xs ${
                    isDragOver
                      ? "border-emerald-500 bg-emerald-100/70"
                      : "border-slate-300 hover:border-emerald-400 bg-slate-50 hover:bg-emerald-50/30"
                  }`}
                >
                  <span className="text-3xl group-hover:scale-110 transition-transform">📁</span>
                  <span className="text-xs font-bold text-slate-800">ช่องทางที่ ๒: อัปโหลดจากเครื่อง</span>
                  <span className="text-[10px] text-slate-500 font-normal text-center">
                    รองรับหลายไฟล์พร้อมกัน (PDF, Word, Excel, รูปภาพ, ZIP) ลากวางได้
                  </span>
                </div>

                {/* Channel 3: Synology NAS Storage */}
                <button
                  type="button"
                  onClick={handleFetchNasFiles}
                  className="p-5 rounded-2xl border-2 border-dashed border-sky-300 hover:border-sky-500 bg-sky-50/40 hover:bg-sky-50 text-sky-800 text-xs font-bold flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group shadow-2xs"
                >
                  <span className="text-3xl group-hover:scale-110 transition-transform">☁️</span>
                  <span className="text-xs font-bold">ช่องทางที่ ๓: คลังเอกสาร NAS</span>
                  <span className="text-[10px] text-sky-600 font-normal text-center">
                    ดึงไฟล์เอกสารราชการจาก Synology File Station
                  </span>
                </button>
              </div>
            ) : (
              /* Drag & Drop banner for adding more files when files already exist */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`py-3 px-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  isDragOver
                    ? "border-emerald-500 bg-emerald-100/70 text-emerald-800"
                    : "border-slate-200 hover:border-slate-300 bg-slate-50/80 text-slate-600"
                }`}
              >
                <span className="text-base">📥</span>
                <span className="text-xs font-medium">
                  ลากไฟล์เอกสารมาวางที่นี่ หรือคลิกเพื่ออัปโหลดไฟล์เพิ่ม (รองรับ PDF, Word, Excel, PPT, รูปภาพ, ZIP)
                </span>
              </div>
            )}

            {/* Attached Files List */}
            {attachments.length > 0 && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-2">
                    <span>📑 รายการไฟล์เอกสารที่แนบในหนังสือเวียนนี้ ({attachments.length} รายการ):</span>
                  </div>
                  {attachments.length > 1 && (
                    <button
                      type="button"
                      onClick={handleRemoveAllAttachments}
                      className="text-[11px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
                    >
                      ลบไฟล์ทั้งหมด
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {attachments.map((att, idx) => {
                    const cat = getFileCategoryInfo(att.name, att.type);
                    const isPrimary = idx === 0;
                    const isSelected = att.id === currentAttachment?.id;

                    return (
                      <div
                        key={att.id}
                        onClick={() => {
                          setSelectedAttachmentId(att.id);
                          setShowAttachmentPreview(true);
                          setActivePreviewPageIndex(0);
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-indigo-50/60 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 border ${cat.bg}`}>
                            {cat.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 truncate max-w-[190px]" title={att.name}>
                                {att.name}
                              </span>
                              {isPrimary ? (
                                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded-md shrink-0">
                                  ★ เอกสารหลัก
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 text-[9px] font-medium rounded-md shrink-0">
                                  แนบท้าย #{idx + 1}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                              <span>{Math.round(att.size / 1024)} KB</span>
                              <span>•</span>
                              <span className="uppercase font-mono">{cat.badge}</span>
                              <span>•</span>
                              <span className="text-slate-500 font-medium">
                                {att.source === "scanner" ? "📷 สแกนสด" : att.source === "nas" ? "☁️ NAS" : "📁 อัปโหลด"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {!isPrimary && (
                            <button
                              type="button"
                              onClick={(e) => handleSetPrimaryAttachment(att.id, e)}
                              className="px-2 py-1 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 cursor-pointer transition-all"
                              title="ตั้งเป็นเอกสารฉบับหลักของหนังสือเวียน"
                            >
                              ตั้งฉบับหลัก
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleRemoveAttachmentItem(att.id, e)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                            title="ลบไฟล์นี้ออก"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Active Attachment Preview Box */}
                {currentAttachment && showAttachmentPreview && (
                  <div
                    data-testid="circular-document-preview-box"
                    className="p-4 bg-slate-900/5 rounded-2xl border border-slate-200 space-y-3 mt-3 animate-fade-in"
                  >
                    <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
                          <span>👁️</span>
                          <span>ตัวอย่างเอกสาร: {fileName}</span>
                        </span>
                        {scannedPages.length > 1 && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-mono text-[11px] font-bold shrink-0">
                            หน้า {activePreviewPageIndex + 1} จาก {scannedPages.length}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
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

                        {fileUrl && (
                          <button
                            type="button"
                            onClick={() => window.open(fileUrl, "_blank")}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer shadow-2xs flex items-center gap-1"
                            title="เปิดไฟล์ในแท็บใหม่"
                          >
                            <span>🔍</span>
                            <span>เปิดเต็มจอ ↗</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setShowAttachmentPreview(false)}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 cursor-pointer shadow-2xs"
                        >
                          ซ่อนตัวอย่าง ✕
                        </button>
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
                      ) : isImageDocument ? (
                        <img
                          src={scannedPages[activePreviewPageIndex] || fileUrl}
                          alt="ตัวอย่างเอกสาร"
                          className="max-h-[460px] w-auto object-contain rounded-lg shadow-sm"
                        />
                      ) : (
                        /* Rich Non-image/Non-PDF preview card (Word, Excel, PPT, ZIP, etc.) */
                        <div className="w-full py-12 flex flex-col items-center justify-center text-center space-y-3">
                          <div className="text-5xl">{getFileCategoryInfo(fileName, fileType).icon}</div>
                          <div className="space-y-1 max-w-md">
                            <span className="text-sm font-bold text-slate-800 block truncate">{fileName}</span>
                            <span className="text-xs text-slate-400 block font-mono">
                              ขนาด {Math.round(fileSize / 1024)} KB • ประเภท {getFileCategoryInfo(fileName, fileType).label}
                            </span>
                            <p className="text-[11px] text-slate-500 pt-1">
                              ไฟล์ประเภทนี้พร้อมให้ผู้รับเปิดและดาวน์โหลดผ่านระบบเวียนหนังสือราชการ
                            </p>
                          </div>
                          {fileUrl && (
                            <a
                              href={fileUrl}
                              download={fileName}
                              target="_blank"
                              rel="noreferrer"
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                            >
                              <span>⬇️</span>
                              <span>ดาวน์โหลด / เปิดไฟล์แนบนี้</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
                          <span className="text-lg">{getFileCategoryInfo(file.name).icon}</span>
                          <span className="font-semibold text-slate-800 truncate group-hover:text-sky-700">
                            {file.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {Math.round(file.size / 1024)} KB
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-sky-100 text-sky-800 text-[10px] font-bold group-hover:bg-sky-600 group-hover:text-white transition-colors">
                            + แนบไฟล์นี้
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Hidden native file input supporting multiple files and multiple types */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.zip,.rar,.7z,.txt"
              onChange={handleManualFileUpload}
              className="hidden"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              aria-label="ส่งหนังสือเวียนทันที ออกหนังสือเวียนทันที"
              disabled={!title.trim() || !isDocNumberValid || resolvedRecipients.length === 0}
              title={!isDocNumberValid ? "กรุณาระบุเลขที่หนังสือพร้อมตัวเลขกำกับ" : undefined}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>📤 ส่งหนังสือเวียนทันที</span>
              <span>({resolvedRecipients.length} ท่าน)</span>
            </button>
          </div>
        </div>
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
              📤
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-heading text-slate-800">
                ส่งหนังสือเวียนราชการ (Dispatch Circular Document)
              </h3>
              <p className="text-xs text-slate-500">
                ส่งต่อหนังสือเวียนที่ได้รับมา กำหนดกลุ่มเป้าหมายผู้รับ และติดตามรายงานผลการลงนามรับทราบ
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
              📤
            </div>
            <div>
              <h3 className="text-base font-bold font-heading text-white">
                ส่งหนังสือเวียนราชการ (Dispatch Circular Document)
              </h3>
              <p className="text-xs text-indigo-200">
                ส่งต่อหนังสือเวียนที่ได้รับมา กำหนดกลุ่มเป้าหมายผู้รับ และติดตามรายงานผลการลงนามรับทราบ
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
