"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Member } from "@/lib/types";
import {
  buildOrderNasFolder,
  formatThaiOrderDate,
  ORDER_CATEGORY_LABELS,
  ORDER_STATUS_LABELS,
  OfficialOrderCategory,
  OfficialOrderItem,
  OfficialOrderStatus,
  OfficialOrderYearCount,
  parseOrderNumberParts,
} from "@/lib/official-orders";
import { getUserNasSid, safeParseJsonResponse } from "@/lib/synology";

interface OfficialOrdersPanelProps {
  currentUser: Member;
  showToast: (msg: string) => void;
}

const MAX_SERVERLESS_UPLOAD_BYTES = 4 * 1024 * 1024; // 4.0 MB Vercel limit

const DIVISION_OPTIONS = [
  "ฝ่ายบริหารทั่วไป",
  "กลุ่มนโยบายและวิชาการ",
  "กลุ่มการพัฒนาสังคมและสวัสดิการ",
  "ศูนย์บริการคนพิการจังหวัดกำแพงเพชร",
];

export function OfficialOrdersPanel({
  currentUser,
  showToast,
}: OfficialOrdersPanelProps) {
  const [items, setItems] = useState<OfficialOrderItem[]>([]);
  const [yearCounts, setYearCounts] = useState<OfficialOrderYearCount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [needsMigration, setNeedsMigration] = useState<boolean>(false);

  // Filters
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Modals
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [editingOrder, setEditingOrder] = useState<OfficialOrderItem | null>(
    null
  );
  const [previewOrder, setPreviewOrder] = useState<OfficialOrderItem | null>(
    null
  );
  const [saving, setSaving] = useState<boolean>(false);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);

  // Form state
  const [formCategory, setFormCategory] =
    useState<OfficialOrderCategory>("order");
  const [formDocNumber, setFormDocNumber] = useState<string>("");
  const [formIssuedDate, setFormIssuedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [formTitle, setFormTitle] = useState<string>("");
  const [formIssuerOrg, setFormIssuerOrg] = useState<string>(
    "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"
  );
  const [formDivision, setFormDivision] = useState<string>(
    currentUser.division || "ฝ่ายบริหารทั่วไป"
  );
  const [formSummary, setFormSummary] = useState<string>("");
  const [formStatus, setFormStatus] = useState<OfficialOrderStatus>("active");
  const [formKeywords, setFormKeywords] = useState<string>("");
  const [formNasPath, setFormNasPath] = useState<string>("");
  const [formFileUrl, setFormFileUrl] = useState<string>("");
  const [formFileName, setFormFileName] = useState<string>("");
  const [formFileSize, setFormFileSize] = useState<number>(0);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const sp = new URLSearchParams();
      if (debouncedQuery) sp.set("q", debouncedQuery);
      if (selectedYear !== "all") sp.set("year", selectedYear);
      if (selectedCategory !== "all") sp.set("category", selectedCategory);
      if (selectedStatus !== "all") sp.set("status", selectedStatus);

      const res = await fetch(`/api/orders?${sp.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setNeedsMigration(Boolean(data.needsMigration));
        setItems(data.items || []);
        setYearCounts(data.yearCounts || []);
      } else {
        showToast(data.error || "ไม่สามารถโหลดข้อมูลคำสั่ง/ประกาศได้");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูลคำสั่ง/ประกาศ");
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, selectedYear, selectedCategory, selectedStatus, showToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const parsedPreview = useMemo(() => {
    if (!formDocNumber.trim()) return null;
    return parseOrderNumberParts(formDocNumber, formIssuedDate);
  }, [formDocNumber, formIssuedDate]);

  const totalAllYears = useMemo(
    () => yearCounts.reduce((acc, y) => acc + y.totalCount, 0),
    [yearCounts]
  );

  const openCreateModal = () => {
    setEditingOrder(null);
    setFormCategory("order");
    setFormDocNumber("");
    setFormIssuedDate(new Date().toISOString().slice(0, 10));
    setFormTitle("");
    setFormIssuerOrg("สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร");
    setFormDivision(currentUser.division || "ฝ่ายบริหารทั่วไป");
    setFormSummary("");
    setFormStatus("active");
    setFormKeywords("");
    setFormNasPath("");
    setFormFileUrl("");
    setFormFileName("");
    setFormFileSize(0);
    setShowFormModal(true);
  };

  const openEditModal = (item: OfficialOrderItem) => {
    setEditingOrder(item);
    setFormCategory(item.docCategory);
    setFormDocNumber(item.docNumberRaw);
    setFormIssuedDate(item.issuedDate);
    setFormTitle(item.title);
    setFormIssuerOrg(item.issuerOrg);
    setFormDivision(item.division);
    setFormSummary(item.summary);
    setFormStatus(item.status);
    setFormKeywords(item.keywords.join(", "));
    setFormNasPath(item.nasPath || "");
    setFormFileUrl(item.fileUrl || "");
    setFormFileName(item.fileName || "");
    setFormFileSize(item.fileSize || 0);
    setShowFormModal(true);
  };

  const handleUploadPdfToNas = async (file: File) => {
    if (file.size > MAX_SERVERLESS_UPLOAD_BYTES) {
      showToast(
        "ไฟล์มีขนาดเกิน 4.0 MB (ข้อจำกัดของ Cloud Server) กรุณาย่อไฟล์ PDF ก่อนอัปโหลด"
      );
      return;
    }

    const parsed = parseOrderNumberParts(formDocNumber, formIssuedDate);
    const targetFolder = buildOrderNasFolder(parsed.orderYearBe, formCategory);

    try {
      setUploadingFile(true);
      const fd = new FormData();
      fd.append("folder_path", targetFolder);
      const sid = getUserNasSid();
      if (sid) fd.append("sid", sid);
      // File MUST be appended last for Synology FileStation Upload
      fd.append("file", file, file.name);

      const res = await fetch("/api/nas/upload", {
        method: "POST",
        body: fd,
      });
      const data = await safeParseJsonResponse(res);
      if (!res.ok || !data?.success) {
        showToast(
          data?.error || "อัปโหลดไฟล์ไปยัง Synology NAS ไม่สำเร็จ"
        );
        return;
      }

      const uploadedPath = `${targetFolder}/${file.name}`;
      const viewUrl = `/api/nas/download?path=${encodeURIComponent(
        uploadedPath
      )}&name=${encodeURIComponent(file.name)}&mode=open`;

      setFormNasPath(uploadedPath);
      setFormFileUrl(viewUrl);
      setFormFileName(file.name);
      setFormFileSize(file.size);
      showToast(`อัปโหลดไฟล์ "${file.name}" ไปยัง NAS สำเร็จ`);
    } catch {
      showToast("เกิดข้อผิดพลาดระหว่างอัปโหลดไฟล์ไปยัง NAS");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    try {
      setSaving(true);
      const keywords = formKeywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);

      const payload = {
        action: editingOrder ? "update" : "create",
        id: editingOrder?.id,
        docCategory: formCategory,
        docNumberRaw: formDocNumber.trim(),
        issuedDate: formIssuedDate,
        title: formTitle.trim(),
        issuerOrg: formIssuerOrg.trim(),
        division: formDivision.trim(),
        summary: formSummary.trim(),
        status: formStatus,
        keywords,
        nasPath: formNasPath || null,
        fileUrl: formFileUrl || null,
        fileName: formFileName || null,
        fileSize: formFileSize,
        actorId: currentUser.id,
        actorName: currentUser.name,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        showToast(data.error || "บันทึกข้อมูลไม่สำเร็จ");
        return;
      }

      showToast(
        editingOrder
          ? `แก้ไข ${ORDER_CATEGORY_LABELS[formCategory]} ที่ ${formDocNumber} เรียบร้อย`
          : `บันทึก ${ORDER_CATEGORY_LABELS[formCategory]} ที่ ${formDocNumber} เรียบร้อย`
      );
      setShowFormModal(false);
      await fetchOrders();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrder = async (item: OfficialOrderItem) => {
    if (
      !window.confirm(
        `ต้องการลบ ${ORDER_CATEGORY_LABELS[item.docCategory]} ที่ ${item.docNumberRaw} (${item.title}) ใช่หรือไม่?`
      )
    ) {
      return;
    }

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete",
        id: item.id,
        actorId: currentUser.id,
      }),
    });
    const data = await res.json();
    if (data.success) {
      showToast(`ลบรายการ ${item.docNumberRaw} แล้ว`);
      await fetchOrders();
    } else {
      showToast(data.error || "ลบไม่สำเร็จ");
    }
  };

  const handleCopyCitation = (item: OfficialOrderItem) => {
    const text = `${ORDER_CATEGORY_LABELS[item.docCategory]}${item.issuerOrg} ที่ ${item.docNumberRaw} ลงวันที่ ${formatThaiOrderDate(item.issuedDate)} เรื่อง ${item.title}`;
    navigator.clipboard?.writeText(text);
    showToast("คัดลอกข้อความอ้างอิงคำสั่ง/ประกาศแล้ว");
  };

  const canManage =
    currentUser.role === "admin" ||
    currentUser.role === "manager" ||
    currentUser.role === "member";

  return (
    <div className="space-y-4">
      {/* Migration Warning Banner (if SQL hasn't been run yet) */}
      {needsMigration && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
          <div className="font-bold text-sm">
            ⚠️ ยังไม่ได้สร้างตาราง <code>official_orders</code> บน Supabase
          </div>
          <p>
            กรุณานำไฟล์{" "}
            <code>supabase/migrations/20261113_create_official_orders.sql</code>{" "}
            ไปรันใน <strong>Supabase Dashboard → SQL Editor</strong>{" "}
            เพื่อเปิดใช้งานคลังหนังสือคำสั่ง/ประกาศและการค้นหาแบบ <code>pg_trgm</code>
          </p>
        </div>
      )}

      {/* Search & Filter Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>📜</span>
              <span>คลังหนังสือคำสั่ง / ประกาศ / ระเบียบราชการ</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              สืบค้นรวดเร็วด้วย <strong>ชื่อเรื่อง</strong>,{" "}
              <strong>เลขที่คำสั่ง</strong> (รองรับทั้งเลขอารบิกและเลขไทย เช่น 125 หรือ ๑๒๕), และ{" "}
              <strong>ปี พ.ศ.</strong> พร้อมจัดเก็บไฟล์ PDF บน Synology NAS
            </p>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={openCreateModal}
              className="shrink-0 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm cursor-pointer transition"
            >
              ➕ บันทึกคำสั่ง / ประกาศใหม่
            </button>
          )}
        </div>

        {/* Omnibox Search + Status Dropdown */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          <div className="md:col-span-7 relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="🔍 พิมพ์ชื่อเรื่อง, เลขที่คำสั่ง (เช่น 125/2569 หรือ ๑๒๕), ปี พ.ศ. หรือกลุ่มงาน..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="md:col-span-3">
            <select
              aria-label="กรองตามสถานะผลบังคับใช้"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium"
            >
              <option value="all">สถานะ: ทั้งหมด</option>
              <option value="active">🟢 ยังมีผลบังคับใช้</option>
              <option value="amended">🟡 แก้ไขเพิ่มเติม</option>
              <option value="revoked">🔴 ยกเลิกแล้ว</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setSelectedYear("all");
                setSelectedCategory("all");
                setSelectedStatus("all");
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              ล้างตัวกรอง
            </button>
          </div>
        </div>

        {/* Category Pills + Year Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Category Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">
              ประเภท:
            </span>
            {[
              { id: "all", label: "ทั้งหมด" },
              { id: "order", label: "📜 คำสั่ง" },
              { id: "announcement", label: "📢 ประกาศ" },
              { id: "regulation", label: "📘 ระเบียบ/ข้อบังคับ" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                  selectedCategory === cat.id
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Year Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">
              ปี พ.ศ.:
            </span>
            <button
              type="button"
              onClick={() => setSelectedYear("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
                selectedYear === "all"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              ทุกปี ({totalAllYears})
            </button>
            {yearCounts.map((yc) => (
              <button
                key={yc.orderYearBe}
                type="button"
                onClick={() => setSelectedYear(String(yc.orderYearBe))}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
                  selectedYear === String(yc.orderYearBe)
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {yc.orderYearBe} ({yc.totalCount})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Table / List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            ⏳ กำลังสืบค้นข้อมูลคำสั่งและประกาศ...
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <div className="text-3xl">📭</div>
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              ไม่พบหนังสือคำสั่งหรือประกาศที่ตรงกับเงื่อนไข
            </div>
            <p className="text-xs text-slate-400">
              ลองค้นหาด้วยคำสั้นลง หรือกด &ldquo;บันทึกคำสั่ง / ประกาศใหม่&rdquo; เพื่อเพิ่มรายการแรกเข้าสู่ระบบ
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 text-[11px] uppercase border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-28">ประเภท</th>
                  <th className="py-3 px-3 w-32">เลขที่ / ปี พ.ศ.</th>
                  <th className="py-3 px-3 w-28">ลงวันที่</th>
                  <th className="py-3 px-3">ชื่อเรื่อง / หน่วยงานเจ้าของเรื่อง</th>
                  <th className="py-3 px-3 w-32">สถานะ</th>
                  <th className="py-3 px-4 w-56 text-right">จัดการ / ไฟล์แนบ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="py-3 px-4 align-top">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          item.docCategory === "order"
                            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                            : item.docCategory === "announcement"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                            : "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300"
                        }`}
                      >
                        {ORDER_CATEGORY_LABELS[item.docCategory]}
                      </span>
                    </td>
                    <td className="py-3 px-3 align-top">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        {item.docNumberRaw}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ปี พ.ศ. {item.orderYearBe}
                        {item.orderSeq !== null ? ` · ลำดับ ${item.orderSeq}` : ""}
                      </div>
                    </td>
                    <td className="py-3 px-3 align-top text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {formatThaiOrderDate(item.issuedDate)}
                    </td>
                    <td className="py-3 px-3 align-top space-y-1">
                      <div className="font-semibold text-slate-900 dark:text-white leading-snug">
                        {item.title}
                      </div>
                      {item.summary && (
                        <div className="text-[11px] text-slate-500 line-clamp-2">
                          {item.summary}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                        <span>🏢 {item.issuerOrg}</span>
                        {item.division && <span>· 📁 {item.division}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-3 align-top">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          item.status === "active"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : item.status === "amended"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                        }`}
                      >
                        {ORDER_STATUS_LABELS[item.status]}
                      </span>
                    </td>
                    <td className="py-3 px-4 align-top text-right whitespace-nowrap space-x-1">
                      {item.fileUrl ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setPreviewOrder(item)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold cursor-pointer"
                            title="เปิดดูไฟล์ PDF"
                          >
                            👁️ ดูไฟล์
                          </button>
                          <a
                            href={item.fileUrl.replace("mode=open", "mode=download")}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px]"
                            title="ดาวน์โหลดไฟล์"
                          >
                            ⬇️
                          </a>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-400 mr-1">
                          ไม่มีไฟล์แนบ
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopyCitation(item)}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] cursor-pointer"
                        title="คัดลอกข้อความอ้างอิง"
                      >
                        📋
                      </button>
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] cursor-pointer"
                            title="แก้ไข"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(item)}
                            className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[11px] cursor-pointer"
                            title="ลบรายการ"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingOrder
                  ? `✏️ แก้ไขข้อมูล (${editingOrder.docNumberRaw})`
                  : "➕ บันทึกหนังสือคำสั่ง / ประกาศใหม่"}
              </h3>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ประเภทเอกสาร *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) =>
                      setFormCategory(e.target.value as OfficialOrderCategory)
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="order">📜 คำสั่ง</option>
                    <option value="announcement">📢 ประกาศ</option>
                    <option value="regulation">📘 ระเบียบ/ข้อบังคับ</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    เลขที่คำสั่ง/ประกาศ *
                  </label>
                  <input
                    type="text"
                    required
                    value={formDocNumber}
                    onChange={(e) => setFormDocNumber(e.target.value)}
                    placeholder="เช่น 125/2569"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                  {parsedPreview && (
                    <div className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1">
                      ลำดับที่: {parsedPreview.orderSeq ?? "-"} · ปี พ.ศ.{" "}
                      {parsedPreview.orderYearBe}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    วันที่ลงนาม *
                  </label>
                  <input
                    type="date"
                    required
                    value={formIssuedDate}
                    onChange={(e) => setFormIssuedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อเรื่องคำสั่ง / ประกาศ *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="เช่น แต่งตั้งคณะทำงานขับเคลื่อนศูนย์ข้อมูลและสถิติสังคมจังหวัดกำแพงเพชร"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    หน่วยงานผู้ออก
                  </label>
                  <input
                    type="text"
                    value={formIssuerOrg}
                    onChange={(e) => setFormIssuerOrg(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    กลุ่มงานเจ้าของเรื่อง
                  </label>
                  <select
                    value={formDivision}
                    onChange={(e) => setFormDivision(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="">-- ไม่ระบุ --</option>
                    {DIVISION_OPTIONS.map((div) => (
                      <option key={div} value={div}>
                        {div}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    สถานะผลบังคับใช้
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) =>
                      setFormStatus(e.target.value as OfficialOrderStatus)
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="active">🟢 ยังมีผลบังคับใช้</option>
                    <option value="amended">🟡 แก้ไขเพิ่มเติม</option>
                    <option value="revoked">🔴 ยกเลิกแล้ว</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  สรุปสาระสำคัญ / คำค้นหาเพิ่มเติม (คั่นด้วยจุลภาค)
                </label>
                <textarea
                  rows={2}
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  placeholder="ระบุสาระสำคัญสั้นๆ เพื่อให้ค้นหาเจอง่ายขึ้น..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  แท็กคำค้น (Keywords)
                </label>
                <input
                  type="text"
                  value={formKeywords}
                  onChange={(e) => setFormKeywords(e.target.value)}
                  placeholder="เช่น คณะทำงาน, งบประมาณ, กบจ., พก."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              {/* PDF Upload to Synology NAS */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    📎 ไฟล์หนังสือคำสั่ง/ประกาศ (PDF บน Synology NAS, ไม่เกิน 4 MB)
                  </span>
                  {formFileName && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      ✅ {formFileName}
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  disabled={uploadingFile}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadPdfToNas(file);
                  }}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
                {uploadingFile && (
                  <div className="text-[11px] text-indigo-600">
                    ⏳ กำลังอัปโหลดไฟล์ไปยัง Synology NAS...
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingFile}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold cursor-pointer"
                >
                  {saving ? "⏳ กำลังบันทึก..." : "💾 บันทึกคำสั่ง/ประกาศ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {previewOrder && previewOrder.fileUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-800">
              <div className="truncate pr-4">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {ORDER_CATEGORY_LABELS[previewOrder.docCategory]} ที่{" "}
                  {previewOrder.docNumberRaw}
                </span>
                <span className="text-xs text-slate-500 ml-2">
                  {previewOrder.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOrder(null)}
                className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer"
              >
                ✕ ปิด
              </button>
            </div>
            <iframe
              src={previewOrder.fileUrl}
              className="flex-1 w-full border-0"
              title={previewOrder.title}
            />
          </div>
        </div>
      )}
    </div>
  );
}

