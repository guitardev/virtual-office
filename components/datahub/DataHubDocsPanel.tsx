"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Member } from "@/lib/types";
import {
  DATAHUB_DOCUMENTS_MIGRATION_SQL,
  DATAHUB_DOC_TYPE_LABELS,
  DataHubDocItem,
  DataHubDocType,
  buildDataHubDocNasFolder,
  extractFileExtension,
  formatFileSize,
} from "@/lib/datahub-docs";
import { formatThaiOrderDate } from "@/lib/official-orders";
import { getUserNasSid } from "@/lib/synology";
import { uploadSmartFile } from "@/lib/smart-upload";

interface DataHubDocsPanelProps {
  currentUser: Member;
  showToast: (msg: string) => void;
  onGoToOrders?: () => void;
}

const DIVISION_OPTIONS = [
  "ฝ่ายบริหารทั่วไป",
  "กลุ่มนโยบายและวิชาการ",
  "กลุ่มการพัฒนาสังคมและสวัสดิการ",
  "ศูนย์บริการคนพิการจังหวัดกำแพงเพชร",
];

export function DataHubDocsPanel({
  currentUser,
  showToast,
  onGoToOrders,
}: DataHubDocsPanelProps) {
  const [items, setItems] = useState<DataHubDocItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [needsMigration, setNeedsMigration] = useState<boolean>(false);

  // Filters
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");

  // Add / Edit Modal
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<DataHubDocItem | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);

  const [formDocType, setFormDocType] = useState<DataHubDocType>("form");
  const [formTitle, setFormTitle] = useState<string>("");
  const [formDivision, setFormDivision] = useState<string>(
    currentUser.division || DIVISION_OPTIONS[0]
  );
  const [formDescription, setFormDescription] = useState<string>("");
  const [formKeywords, setFormKeywords] = useState<string>("");
  const [formFileUrl, setFormFileUrl] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchInput), 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedType !== "all") params.set("docType", selectedType);
      if (selectedDivision !== "all") params.set("division", selectedDivision);
      if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());

      const res = await fetch(`/api/datahub-docs?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data?.success) {
        setItems(data.items || []);
        setNeedsMigration(Boolean(data.needsMigration));
      } else {
        showToast(data?.error || "โหลดคลังแบบฟอร์มและคู่มือไม่สำเร็จ");
      }
    } catch {
      showToast("เชื่อมต่อคลังเอกสารไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [selectedType, selectedDivision, debouncedQuery, showToast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const countsByType = useMemo(() => {
    const counts: Record<string, number> = {
      all: items.length,
      form: 0,
      manual: 0,
      guideline: 0,
      plan: 0,
      other: 0,
    };
    for (const it of items) {
      counts[it.docType] = (counts[it.docType] || 0) + 1;
    }
    return counts;
  }, [items]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormDocType("form");
    setFormTitle("");
    setFormDivision(currentUser.division || DIVISION_OPTIONS[0]);
    setFormDescription("");
    setFormKeywords("");
    setFormFileUrl("");
    setSelectedFile(null);
    setShowModal(true);
  };

  const openEditModal = (item: DataHubDocItem) => {
    setEditingItem(item);
    setFormDocType(item.docType);
    setFormTitle(item.title);
    setFormDivision(item.division || DIVISION_OPTIONS[0]);
    setFormDescription(item.description || "");
    setFormKeywords((item.keywords || []).join(", "));
    setFormFileUrl(item.fileUrl || "");
    setSelectedFile(null);
    setShowModal(true);
  };

  const uploadToNasIfSelected = async (): Promise<{
    nasPath: string | null;
    fileUrl: string | null;
    fileName: string | null;
    fileSize: number;
    fileExt: string;
  } | null> => {
    if (!selectedFile) return null;
    setUploadingFile(true);
    try {
      const targetFolder = buildDataHubDocNasFolder(formDocType);
      const uploaded = await uploadSmartFile(selectedFile, targetFolder);
      return {
        nasPath: uploaded.nasPath,
        fileUrl: uploaded.fileUrl,
        fileName: uploaded.fileName,
        fileSize: uploaded.fileSize,
        fileExt: extractFileExtension(uploaded.fileName, uploaded.fileUrl),
      };
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast("กรุณาระบุชื่อเอกสาร / แบบฟอร์ม / คู่มือ");
      return;
    }

    setSubmitting(true);
    try {
      const uploaded = await uploadToNasIfSelected();
      const keywords = formKeywords
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload: Record<string, unknown> = {
        docType: formDocType,
        title: formTitle.trim(),
        division: formDivision.trim(),
        description: formDescription.trim(),
        keywords,
        fileUrl: formFileUrl.trim() || null,
        updatedDate: new Date().toISOString().slice(0, 10),
      };

      if (uploaded) {
        payload.nasPath = uploaded.nasPath;
        payload.fileUrl = uploaded.fileUrl || payload.fileUrl;
        payload.fileName = uploaded.fileName;
        payload.fileSize = uploaded.fileSize;
        payload.fileExt = uploaded.fileExt;
      } else if (editingItem) {
        payload.nasPath = editingItem.nasPath;
        payload.fileName = editingItem.fileName;
        payload.fileSize = editingItem.fileSize;
        payload.fileExt = formFileUrl.trim() && !editingItem.fileName
          ? "LINK"
          : editingItem.fileExt;
      }

      const res = await fetch("/api/datahub-docs", {
        method: editingItem ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingItem
            ? { id: editingItem.id, ...payload }
            : {
                ...payload,
                createdBy: currentUser.id,
                createdByName: currentUser.name,
              }
        ),
      });

      const data = await res.json();
      if (!res.ok || !data?.success) {
        if (data?.needsMigration) setNeedsMigration(true);
        throw new Error(data?.error || "บันทึกข้อมูลไม่สำเร็จ");
      }

      showToast(
        editingItem
          ? "✅ แก้ไขข้อมูลเอกสารเรียบร้อยแล้ว"
          : "✅ เพิ่มเอกสาร / แบบฟอร์ม / คู่มือเรียบร้อยแล้ว"
      );
      setShowModal(false);
      await fetchItems();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "บันทึกไม่สำเร็จ";
      showToast(`❌ ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: DataHubDocItem) => {
    if (!window.confirm(`ต้องการลบ "${item.title}" ออกจากคลังใช่หรือไม่?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/datahub-docs?id=${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "ลบเอกสารไม่สำเร็จ");
      }
      showToast("🗑️ ลบเอกสารเรียบร้อยแล้ว");
      await fetchItems();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || "ลบเอกสารไม่สำเร็จ";
      showToast(`❌ ${msg}`);
    }
  };

  const handleDownload = (item: DataHubDocItem) => {
    if (item.nasPath) {
      const sid = getUserNasSid();
      const qs = new URLSearchParams({ path: item.nasPath });
      if (sid) qs.set("sid", sid);
      window.open(`/api/nas/download?${qs.toString()}`, "_blank", "noopener");
      return;
    }
    if (item.fileUrl) {
      window.open(item.fileUrl, "_blank", "noopener,noreferrer");
      return;
    }
    showToast("เอกสารนี้ยังไม่ได้แนบไฟล์หรือลิงก์ดาวน์โหลด");
  };

  const handleCopyMigrationSql = async () => {
    try {
      await navigator.clipboard.writeText(DATAHUB_DOCUMENTS_MIGRATION_SQL);
      showToast("📋 คัดลอกคำสั่ง SQL สำหรับสร้างตาราง datahub_documents แล้ว");
    } catch {
      showToast("ไม่สามารถคัดลอก SQL อัตโนมัติได้");
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
            <span>📄</span>
            <span>คลังแบบฟอร์มคำขอ และคู่มือปฏิบัติงาน</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            จัดเก็บแบบฟอร์มมาตรฐาน คู่มือปฏิบัติงาน แนวทางปฏิบัติ และแผนงาน (ซิงก์บน Synology NAS + Supabase)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onGoToOrders && (
            <button
              type="button"
              onClick={onGoToOrders}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold cursor-pointer transition-colors"
            >
              📜 ค้นหาคำสั่ง / ประกาศ / ระเบียบ →
            </button>
          )}
          <button
            type="button"
            onClick={openAddModal}
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
          >
            <span>➕</span>
            <span>เพิ่มเอกสาร / แบบฟอร์ม / คู่มือ</span>
          </button>
        </div>
      </div>

      {/* Migration Banner */}
      {needsMigration && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-amber-900 space-y-1">
            <div className="font-bold">
              ⚠️ ยังไม่ได้สร้างตาราง <code className="font-mono">datahub_documents</code> ใน Supabase
            </div>
            <div className="text-amber-800">
              กรุณาคัดลอกคำสั่ง SQL แล้วนำไปรันใน Supabase SQL Editor เพื่อเปิดใช้งานคลังแบบฟอร์มและคู่มือจริง
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyMigrationSql}
            className="shrink-0 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
          >
            📋 คัดลอก SQL สร้างตาราง
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(
            [
              ["all", "ทั้งหมด"],
              ["form", "📝 แบบฟอร์มคำขอ"],
              ["manual", "📘 คู่มือปฏิบัติงาน"],
              ["guideline", "📌 แนวทางปฏิบัติ"],
              ["plan", "📊 แผนงาน/รายงาน"],
              ["other", "📎 อื่นๆ"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedType(key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                selectedType === key
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              {label}
              {selectedType === "all" && key !== "all" ? ` (${countsByType[key] || 0})` : ""}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            aria-label="กรองตามกลุ่มงาน"
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700"
          >
            <option value="all">ทุกกลุ่มงาน</option>
            {DIVISION_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="ค้นหาแบบฟอร์ม / คู่มือ..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
            <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">🔍</span>
          </div>
        </div>
      </div>

      {/* Document List */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">
          ⏳ กำลังโหลดคลังแบบฟอร์มและคู่มือปฏิบัติงาน...
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-2">
          <div className="text-2xl">📂</div>
          <div className="text-xs font-bold text-slate-600">
            ยังไม่มีเอกสาร / แบบฟอร์ม / คู่มือในหมวดนี้
          </div>
          <div className="text-[11px] text-slate-400">
            กดปุ่ม &ldquo;➕ เพิ่มเอกสาร / แบบฟอร์ม / คู่มือ&rdquo; เพื่ออัปโหลดไฟล์จริงขึ้นระบบได้เลยครับ
          </div>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((doc) => {
            const ext = (doc.fileExt || "FILE").toUpperCase();
            const badgeClass =
              ext === "PDF"
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : ext === "DOCX" || ext === "DOC"
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : ext === "XLSX" || ext === "XLS" || ext === "CSV"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-700 border-slate-200";

            const canManage =
              currentUser.role === "admin" || doc.createdBy === currentUser.id;

            return (
              <div
                key={doc.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-2.5 rounded-xl transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border ${badgeClass} shrink-0`}
                  >
                    {ext}
                  </span>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">
                        {doc.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-semibold">
                        {DATAHUB_DOC_TYPE_LABELS[doc.docType] || doc.docType}
                      </span>
                    </div>
                    {doc.description && (
                      <div className="text-[11px] text-slate-600 line-clamp-1">
                        {doc.description}
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 flex-wrap">
                      {doc.division && (
                        <span className="text-indigo-600 font-bold">{doc.division}</span>
                      )}
                      <span>•</span>
                      <span>ขนาด {formatFileSize(doc.fileSize)}</span>
                      <span>•</span>
                      <span>อัปเดต {formatThaiOrderDate(doc.updatedDate)}</span>
                      {doc.createdByName && (
                        <>
                          <span>•</span>
                          <span>โดย {doc.createdByName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownload(doc)}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>{doc.nasPath ? "📥" : "🔗"}</span>
                    <span>{doc.nasPath ? "ดาวน์โหลด" : "เปิดลิงก์"}</span>
                  </button>
                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={() => openEditModal(doc)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                        title="แก้ไขเอกสาร"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(doc)}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold cursor-pointer"
                        title="ลบเอกสาร"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                {editingItem
                  ? "✏️ แก้ไขเอกสาร / แบบฟอร์ม / คู่มือ"
                  : "➕ เพิ่มเอกสาร / แบบฟอร์ม / คู่มือใหม่"}
              </h4>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ประเภทเอกสาร *
                  </label>
                  <select
                    aria-label="ประเภทเอกสาร"
                    value={formDocType}
                    onChange={(e) => setFormDocType(e.target.value as DataHubDocType)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    {Object.entries(DATAHUB_DOC_TYPE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    กลุ่มงานเจ้าของเรื่อง
                  </label>
                  <select
                    aria-label="กลุ่มงานเจ้าของเรื่อง"
                    value={formDivision}
                    onChange={(e) => setFormDivision(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    {DIVISION_OPTIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ชื่อเอกสาร / แบบฟอร์ม / คู่มือ *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="เช่น แบบฟอร์มคำขอเงินสงเคราะห์ผู้มีรายได้น้อย (อปม.)"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  คำอธิบาย / หมายเหตุการใช้งาน
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="สรุปรายละเอียดหรือคำแนะนำประกอบการใช้แบบฟอร์ม/คู่มือ"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  คำสำคัญสำหรับค้นหา (คั่นด้วยจุลภาค ,)
                </label>
                <input
                  type="text"
                  value={formKeywords}
                  onChange={(e) => setFormKeywords(e.target.value)}
                  placeholder="เช่น แบบฟอร์ม, เงินสงเคราะห์, คนพิการ"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                <label className="block font-bold text-slate-700">
                  📎 แนบไฟล์ (Synology NAS / Cloud Storage สูงสุด 50 MB)
                </label>
                <input
                  type="file"
                  aria-label="เลือกไฟล์อัปโหลด"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-teal-600 file:text-white file:font-semibold hover:file:bg-teal-700 cursor-pointer"
                />
                {editingItem?.fileName && !selectedFile && (
                  <div className="text-[11px] text-slate-500">
                    ไฟล์เดิม: <span className="font-semibold">{editingItem.fileName}</span>
                  </div>
                )}

                <div className="pt-1">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    หรือระบุลิงก์ไฟล์ภายนอก (Google Drive / URL) กรณีไม่แนบไฟล์
                  </label>
                  <input
                    type="url"
                    value={formFileUrl}
                    onChange={(e) => setFormFileUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingFile}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {uploadingFile
                    ? "⏳ กำลังอัปโหลดขึ้น NAS..."
                    : submitting
                    ? "⏳ กำลังบันทึก..."
                    : editingItem
                    ? "💾 บันทึกการแก้ไข"
                    : "💾 บันทึกเอกสาร"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
