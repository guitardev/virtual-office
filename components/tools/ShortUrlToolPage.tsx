"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { Member, ShortLinkItem } from "@/lib/types";
import {
  buildShortUrl,
  DEFAULT_PUBLIC_SHORT_BASE_URL,
  generateReadableSlug,
  getShortLinkStatus,
  normalizeSlug,
  SHORT_LINKS_SETUP_SQL,
  validateAndNormalizeTargetUrl,
  validateSlug,
} from "@/lib/shorturl-utils";
import { recordAuditLog } from "@/lib/supabase";

interface ShortUrlToolPageProps {
  currentUser?: Member;
  showToast: (msg: string) => void;
  onAddAuditLog?: (
    actor: string,
    action: string,
    target: string,
    status: "success" | "denied"
  ) => void;
}

function formatThaiShortDate(iso?: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toThaiDateInputValue(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const th = new Date(d.getTime() + 7 * 3600000);
  return th.toISOString().slice(0, 10);
}

function getTodayThaiDateInput(): string {
  const th = new Date(Date.now() + 7 * 3600000);
  return th.toISOString().slice(0, 10);
}

export function ShortUrlToolPage({
  currentUser,
  showToast,
  onAddAuditLog,
}: ShortUrlToolPageProps) {
  const [origin, setOrigin] = useState<string>(DEFAULT_PUBLIC_SHORT_BASE_URL);
  const [links, setLinks] = useState<ShortLinkItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [setupRequired, setSetupRequired] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showSqlModal, setShowSqlModal] = useState<boolean>(false);

  // Quick shorten form state
  const [targetUrl, setTargetUrl] = useState<string>("");
  const [customSlug, setCustomSlug] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdHighlight, setCreatedHighlight] = useState<ShortLinkItem | null>(null);

  // Registry filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [ownerFilter, setOwnerFilter] = useState<"all" | "mine">("all");

  // Modals: Quick QR preview, Edit, Delete confirm
  const [qrPreviewLink, setQrPreviewLink] = useState<ShortLinkItem | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [editingLink, setEditingLink] = useState<ShortLinkItem | null>(null);
  const [editTargetUrl, setEditTargetUrl] = useState<string>("");
  const [editTitle, setEditTitle] = useState<string>("");
  const [editExpiresAt, setEditExpiresAt] = useState<string>("");
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);
  const [deletingLink, setDeletingLink] = useState<ShortLinkItem | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location?.origin) {
      setOrigin(window.location.origin);
    }
  }, []);

  const logAudit = useCallback(
    (action: string, target: string, status: "success" | "denied" = "success") => {
      const actor = currentUser?.name || "เจ้าหน้าที่";
      if (onAddAuditLog) {
        onAddAuditLog(actor, action, target, status);
      } else {
        recordAuditLog(actor, action, target, status).catch(() => {});
      }
    },
    [currentUser?.name, onAddAuditLog]
  );

  const loadLinks = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/shorturl", { cache: "no-store" });
      const data = await res.json();
      if (data.setupRequired) {
        setSetupRequired(true);
        setLinks([]);
      } else if (!res.ok || !data.success) {
        setSetupRequired(false);
        setFetchError(data.error || "ไม่สามารถโหลดข้อมูลลิงก์ย่อได้");
      } else {
        setSetupRequired(false);
        setLinks(Array.isArray(data.links) ? data.links : []);
      }
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  // Generate QR preview Data URL when modal opens
  useEffect(() => {
    if (!qrPreviewLink) {
      setQrDataUrl("");
      return;
    }
    const shortUrl = buildShortUrl(origin, qrPreviewLink.slug);
    QRCode.toDataURL(shortUrl, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(""));
  }, [qrPreviewLink, origin]);

  const slugValidation = useMemo(() => {
    if (!customSlug.trim()) return null;
    return validateSlug(customSlug);
  }, [customSlug]);

  const previewSlug = useMemo(() => {
    const norm = normalizeSlug(customSlug);
    return norm || "ระบบสุ่มอัตโนมัติ";
  }, [customSlug]);

  const stats = useMemo(() => {
    let activeCount = 0;
    let totalClicks = 0;
    for (const item of links) {
      if (getShortLinkStatus(item) === "active") {
        activeCount++;
      }
      totalClicks += Number(item.clickCount || 0);
    }
    return {
      totalLinks: links.length,
      activeCount,
      totalClicks,
    };
  }, [links]);

  const filteredLinks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return links.filter((item) => {
      const status = getShortLinkStatus(item);
      if (statusFilter === "active" && status !== "active") return false;
      if (statusFilter === "inactive" && status === "active") return false;
      if (ownerFilter === "mine" && currentUser) {
        const isMine =
          (currentUser.id && item.createdBy === currentUser.id) ||
          (currentUser.name && item.createdByName === currentUser.name);
        if (!isMine) return false;
      }
      if (!q) return true;
      return (
        item.slug.toLowerCase().includes(q) ||
        item.targetUrl.toLowerCase().includes(q) ||
        (item.title || "").toLowerCase().includes(q) ||
        (item.createdByName || "").toLowerCase().includes(q) ||
        (item.division || "").toLowerCase().includes(q)
      );
    });
  }, [links, searchQuery, statusFilter, ownerFilter, currentUser]);

  const canManageLink = (link: ShortLinkItem): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === "admin") return true;
    if (currentUser.id && link.createdBy && String(link.createdBy) === String(currentUser.id)) {
      return true;
    }
    if (
      currentUser.name &&
      link.createdByName &&
      currentUser.name.trim() === link.createdByName.trim()
    ) {
      return true;
    }
    return false;
  };

  const handleCopyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`📋 คัดลอก${label}เรียบร้อยแล้ว`);
    } catch {
      showToast("ไม่สามารถคัดลอกไปยังคลิปบอร์ดได้ กรุณาคัดลอกด้วยตนเอง");
    }
  };

  const handleGenerateRandomSlug = () => {
    setCustomSlug(generateReadableSlug(6));
    setFormError(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const urlCheck = validateAndNormalizeTargetUrl(targetUrl, [
      origin,
      DEFAULT_PUBLIC_SHORT_BASE_URL,
    ]);
    if (!urlCheck.valid) {
      setFormError(urlCheck.error || "URL ปลายทางไม่ถูกต้อง");
      return;
    }

    if (customSlug.trim()) {
      const slugCheck = validateSlug(customSlug);
      if (!slugCheck.valid) {
        setFormError(slugCheck.error || "ชื่อย่อไม่ถูกต้อง");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/shorturl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUrl: urlCheck.normalized,
          customSlug: customSlug.trim() || undefined,
          title: title.trim(),
          expiresAt: expiresAt || null,
          actorId: currentUser?.id || null,
          actorName: currentUser?.name || "",
          actorDivision: currentUser?.division || "",
        }),
      });
      const data = await res.json();

      if (data.setupRequired) {
        setSetupRequired(true);
        setFormError("ยังไม่ได้ติดตั้งตาราง short_links ใน Supabase กรุณารันคำสั่ง SQL ด้านล่างก่อน");
        return;
      }

      if (!res.ok || !data.success || !data.link) {
        setFormError(data.error || "ไม่สามารถสร้างลิงก์ย่อได้");
        return;
      }

      const created: ShortLinkItem = data.link;
      setLinks((prev) => [created, ...prev.filter((l) => l.id !== created.id)]);
      setCreatedHighlight(created);
      setTargetUrl("");
      setCustomSlug("");
      setTitle("");
      setExpiresAt("");
      showToast(`✅ สร้างลิงก์ย่อ /s/${created.slug} สำเร็จแล้ว`);
      logAudit("สร้างลิงก์ย่อ (Short URL)", `/s/${created.slug} → ${created.targetUrl}`, "success");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการสร้างลิงก์ย่อ");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (link: ShortLinkItem) => {
    setEditingLink(link);
    setEditTargetUrl(link.targetUrl);
    setEditTitle(link.title || "");
    setEditExpiresAt(toThaiDateInputValue(link.expiresAt));
    setEditIsActive(link.isActive);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLink) return;
    setEditError(null);

    const urlCheck = validateAndNormalizeTargetUrl(editTargetUrl, [
      origin,
      DEFAULT_PUBLIC_SHORT_BASE_URL,
    ]);
    if (!urlCheck.valid) {
      setEditError(urlCheck.error || "URL ปลายทางไม่ถูกต้อง");
      return;
    }

    setSavingEdit(true);
    try {
      const res = await fetch("/api/shorturl", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingLink.id,
          targetUrl: urlCheck.normalized,
          title: editTitle.trim(),
          expiresAt: editExpiresAt || null,
          isActive: editIsActive,
          actorId: currentUser?.id,
          actorName: currentUser?.name,
          actorRole: currentUser?.role,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.link) {
        setEditError(data.error || "ไม่สามารถบันทึกการแก้ไขได้");
        return;
      }
      const updated: ShortLinkItem = data.link;
      setLinks((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      if (createdHighlight?.id === updated.id) {
        setCreatedHighlight(updated);
      }
      setEditingLink(null);
      showToast(`✅ อัปเดตลิงก์ /s/${updated.slug} เรียบร้อยแล้ว`);
      logAudit("แก้ไขลิงก์ย่อ (Short URL)", `/s/${updated.slug}`, "success");
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleActive = async (link: ShortLinkItem) => {
    try {
      const nextActive = !link.isActive;
      const res = await fetch("/api/shorturl", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: link.id,
          isActive: nextActive,
          actorId: currentUser?.id,
          actorName: currentUser?.name,
          actorRole: currentUser?.role,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.link) {
        showToast(`⚠️ ${data.error || "ไม่สามารถเปลี่ยนสถานะได้"}`);
        return;
      }
      const updated: ShortLinkItem = data.link;
      setLinks((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      if (createdHighlight?.id === updated.id) {
        setCreatedHighlight(updated);
      }
      showToast(
        nextActive
          ? `▶️ เปิดใช้งานลิงก์ /s/${updated.slug} แล้ว`
          : `⏸️ ปิดใช้งานลิงก์ /s/${updated.slug} ชั่วคราวแล้ว`
      );
      logAudit(
        nextActive ? "เปิดใช้งานลิงก์ย่อ" : "ปิดใช้งานลิงก์ย่อ",
        `/s/${updated.slug}`,
        "success"
      );
    } catch {
      showToast("⚠️ เกิดข้อผิดพลาดในการเปลี่ยนสถานะลิงก์");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingLink) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/shorturl", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: deletingLink.id,
          actorId: currentUser?.id,
          actorName: currentUser?.name,
          actorRole: currentUser?.role,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(`⚠️ ${data.error || "ไม่สามารถลบลิงก์ได้"}`);
        return;
      }
      setLinks((prev) => prev.filter((item) => item.id !== deletingLink.id));
      if (createdHighlight?.id === deletingLink.id) {
        setCreatedHighlight(null);
      }
      showToast(`🗑️ ลบลิงก์ /s/${deletingLink.slug} เรียบร้อยแล้ว`);
      logAudit("ลบลิงก์ย่อ (Short URL)", `/s/${deletingLink.slug}`, "success");
      setDeletingLink(null);
    } catch {
      showToast("⚠️ เกิดข้อผิดพลาดในการลบลิงก์");
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadQuickQr = () => {
    if (!qrDataUrl || !qrPreviewLink) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `shorturl-${qrPreviewLink.slug}-qr.png`;
    a.click();
    showToast(`⬇️ ดาวน์โหลด QR Code สำหรับ /s/${qrPreviewLink.slug} แล้ว`);
  };

  return (
    <div className="space-y-6">
      {/* ─── HEADER ─── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg border border-indigo-900/40">
        <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 text-xs font-bold">
              <span>🔗</span>
              <span>สนง.พมจ.กำแพงเพชร · โดเมนราชการ smso.site</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-heading">
              ระบบย่อลิงก์ราชการอัจฉริยะ (Short URL)
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              แปลงลิงก์ Google Forms, Google Drive หรือเอกสารออนไลน์ที่ยาวเหยียดให้สั้นกระชับภายใต้โดเมน{" "}
              <code className="px-1.5 py-0.5 rounded bg-white/10 text-cyan-200 font-mono text-xs">
                /s/ชื่อย่อ
              </code>{" "}
              พร้อมแก้ไขปลายทางได้ภายหลังและส่งต่อสร้าง QR Code ป้าย A4 ได้ทันที
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="px-4 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center min-w-[92px]">
              <div className="text-[10px] text-cyan-200 font-bold">ลิงก์ทั้งหมด</div>
              <div className="text-xl font-extrabold text-white">{stats.totalLinks}</div>
            </div>
            <div className="px-4 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center min-w-[92px]">
              <div className="text-[10px] text-emerald-200 font-bold">ใช้งานอยู่</div>
              <div className="text-xl font-extrabold text-emerald-300">{stats.activeCount}</div>
            </div>
            <div className="px-4 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center min-w-[92px]">
              <div className="text-[10px] text-amber-200 font-bold">ยอดคลิกรวม</div>
              <div className="text-xl font-extrabold text-amber-300">{stats.totalClicks}</div>
            </div>
            <button
              type="button"
              onClick={() => setShowSqlModal(true)}
              className="px-3.5 py-3 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/15 text-xs font-bold text-slate-100 transition-colors cursor-pointer"
              title="ดูสถานะตารางฐานข้อมูลและสคริปต์ SQL"
            >
              🗄️ SQL Setup
            </button>
          </div>
        </div>
      </div>

      {/* ─── SETUP REQUIRED BANNER (GRACEFUL FALLBACK) ─── */}
      {setupRequired && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-xs font-extrabold text-amber-800 dark:text-amber-300">
                <span>⚠️ ยังไม่พบตาราง public.short_links ใน Supabase</span>
              </div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                กรุณารันคำสั่ง SQL ครั้งแรกใน Supabase Dashboard → SQL Editor
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                คัดลอกคำสั่ง SQL ด้านล่างไปวางและกด Run ใน Supabase SQL Editor จากนั้นกดปุ่ม “ตรวจสอบตารางอีกครั้ง” เพื่อเริ่มใช้งานทันที
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleCopyText(SHORT_LINKS_SETUP_SQL, "คำสั่ง SQL")}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                📋 คัดลอก SQL
              </button>
              <button
                type="button"
                onClick={loadLinks}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100 rounded-xl text-xs font-bold cursor-pointer"
              >
                🔄 ตรวจสอบตารางอีกครั้ง
              </button>
            </div>
          </div>

          <pre className="bg-slate-950 text-emerald-300 p-4 rounded-2xl font-mono text-[11px] overflow-x-auto max-h-60 border border-slate-800">
            {SHORT_LINKS_SETUP_SQL}
          </pre>
        </div>
      )}

      {/* ─── MAIN WORKSPACE GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Create Short URL Form (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <form
            onSubmit={handleCreateSubmit}
            className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 p-5 sm:p-6 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  1. สร้างลิงก์ย่อใหม่
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  กำหนด URL ต้นทาง และตั้งชื่อย่อที่จำง่ายสำหรับเอกสารราชการ
                </p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800">
                HTTP 307 Dynamic
              </span>
            </div>

            {formError && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 font-semibold">
                ⚠️ {formError}
              </div>
            )}

            {/* Target URL */}
            <div className="space-y-1.5">
              <label
                htmlFor="shorturl-target-input"
                className="text-xs font-bold text-slate-700 dark:text-slate-200 block"
              >
                URL ปลายทางที่ต้องการย่อ *
              </label>
              <input
                id="shorturl-target-input"
                type="text"
                required
                placeholder="https://docs.google.com/forms/d/..."
                value={targetUrl}
                onChange={(e) => {
                  setTargetUrl(e.target.value);
                  setFormError(null);
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-400">
                รองรับลิงก์ https:// หรือ http:// (หากไม่ใส่ https:// ระบบจะเติมให้อัตโนมัติ)
              </p>
            </div>

            {/* Title / Memo */}
            <div className="space-y-1.5">
              <label
                htmlFor="shorturl-title-input"
                className="text-xs font-bold text-slate-700 dark:text-slate-200 block"
              >
                ชื่อเรื่อง / คำอธิบายอ้างอิง (ไม่บังคับ)
              </label>
              <input
                id="shorturl-title-input"
                type="text"
                placeholder="เช่น แบบลงทะเบียนประชุม พมจ.กำแพงเพชร ประจำเดือน พ.ย. 69"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Custom Slug */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="shorturl-slug-input"
                  className="text-xs font-bold text-slate-700 dark:text-slate-200"
                >
                  กำหนดชื่อย่อเอง (Custom Alias)
                </label>
                <button
                  type="button"
                  onClick={handleGenerateRandomSlug}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  🎲 สุ่มรหัส 6 ตัว
                </button>
              </div>
              <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                <span className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
                  /s/
                </span>
                <input
                  id="shorturl-slug-input"
                  type="text"
                  placeholder="เว้นว่าง = สุ่มอัตโนมัติ หรือระบุ เช่น kpp-form"
                  value={customSlug}
                  onChange={(e) => {
                    setCustomSlug(e.target.value);
                    setFormError(null);
                  }}
                  className="w-full px-3 py-2.5 bg-transparent text-xs font-mono text-slate-800 dark:text-slate-100 focus:outline-none"
                />
              </div>

              {slugValidation && !slugValidation.valid ? (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                  ⚠️ {slugValidation.error}
                </p>
              ) : (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                  <span>ตัวอย่างลิงก์:</span>
                  <code className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono">
                    {origin}/s/{previewSlug}
                  </code>
                </div>
              )}
            </div>

            {/* Expiration Date */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="shorturl-expires-input"
                  className="text-xs font-bold text-slate-700 dark:text-slate-200"
                >
                  วันหมดอายุ (ไม่บังคับ)
                </label>
                {expiresAt && (
                  <button
                    type="button"
                    onClick={() => setExpiresAt("")}
                    className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    ล้างวันหมดอายุ
                  </button>
                )}
              </div>
              <input
                id="shorturl-expires-input"
                type="date"
                min={getTodayThaiDateInput()}
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-400">
                เว้นว่างไว้หากต้องการให้ลิงก์ใช้งานได้ถาวรไม่มีวันหมดอายุ
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || setupRequired}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 disabled:opacity-50 text-white rounded-2xl text-xs font-extrabold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>🔗</span>
              <span>{submitting ? "กำลังสร้างลิงก์ย่อ..." : "สร้างลิงก์ย่อทันที"}</span>
            </button>
          </form>

          {/* Latest Created Result Card */}
          {createdHighlight && (
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/70 dark:from-emerald-950/40 dark:to-slate-800 rounded-3xl border border-emerald-200 dark:border-emerald-800 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-300">
                  ✅ สร้างลิงก์ย่อล่าสุดสำเร็จ
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
                  พร้อมแชร์
                </span>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 space-y-1">
                <div className="font-mono text-sm font-extrabold text-indigo-700 dark:text-indigo-300 break-all">
                  {buildShortUrl(origin, createdHighlight.slug)}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  ปลายทาง: {createdHighlight.targetUrl}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleCopyText(buildShortUrl(origin, createdHighlight.slug), "ลิงก์ย่อ")
                  }
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  📋 คัดลอกลิงก์ย่อ
                </button>
                <a
                  href={`/s/${createdHighlight.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs font-bold text-center hover:bg-emerald-50"
                >
                  ↗️ ทดสอบเปิดลิงก์
                </a>
                <button
                  type="button"
                  onClick={() => setQrPreviewLink(createdHighlight)}
                  className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  📱 ดู QR Code ด่วน
                </button>
                <Link
                  href={`/tools/qrcode?url=${encodeURIComponent(
                    buildShortUrl(origin, createdHighlight.slug)
                  )}`}
                  className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold text-center"
                >
                  🎨 สร้าง QR ป้าย A4
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right: Managed Links Registry (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200/80 dark:border-slate-700 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  2. สารบบลิงก์ย่อของสำนักงาน
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  แก้ไข URL ปลายทางได้ตลอดโดยไม่ต้องพิมพ์ QR Code ใหม่ หรือปิดใช้งานลิงก์ที่หมดเขต
                </p>
              </div>
              <button
                type="button"
                onClick={loadLinks}
                disabled={loading}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer shrink-0"
              >
                {loading ? "กำลังโหลด..." : "🔄 รีเฟรช"}
              </button>
            </div>

            {/* Search & Filters */}
            <div className="space-y-3">
              <input
                type="text"
                placeholder="🔍 ค้นหาจากชื่อย่อ (slug), ชื่อเรื่อง, URL ปลายทาง หรือผู้สร้าง..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: "all", label: "ทั้งหมด" },
                    { id: "active", label: "ใช้งานอยู่" },
                    { id: "inactive", label: "ระงับ / หมดอายุ" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStatusFilter(tab.id as "all" | "active" | "inactive")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        statusFilter === tab.id
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setOwnerFilter("all")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                      ownerFilter === "all"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    ทั้งสำนักงาน
                  </button>
                  <button
                    type="button"
                    onClick={() => setOwnerFilter("mine")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                      ownerFilter === "mine"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    เฉพาะของฉัน
                  </button>
                </div>
              </div>
            </div>

            {/* Fetch Error */}
            {fetchError && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                ⚠️ {fetchError}
              </div>
            )}

            {/* List */}
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                กำลังโหลดข้อมูลสารบบลิงก์ย่อ...
              </div>
            ) : filteredLinks.length === 0 ? (
              <div className="py-12 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-700 space-y-2">
                <div className="text-3xl">🔗</div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  ยังไม่มีรายการลิงก์ย่อที่ตรงกับเงื่อนไข
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  เริ่มต้นวาง URL ปลายทางที่ฟอร์มด้านซ้ายเพื่อสร้างลิงก์สั้นภายใต้โดเมนของสำนักงาน
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLinks.map((link) => {
                  const status = getShortLinkStatus(link);
                  const fullShortUrl = buildShortUrl(origin, link.slug);
                  const manageable = canManageLink(link);

                  return (
                    <div
                      key={link.id}
                      className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                status === "active"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                                  : status === "expired"
                                  ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                                  : "bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600"
                              }`}
                            >
                              {status === "active"
                                ? "● ใช้งานอยู่"
                                : status === "expired"
                                ? "⏰ หมดอายุแล้ว"
                                : "⏸️ ปิดใช้งาน"}
                            </span>
                            {link.division && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
                                {link.division}
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 break-words">
                            {link.title || `ลิงก์ย่อ /s/${link.slug}`}
                          </h3>
                        </div>

                        <div className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-extrabold text-indigo-700 dark:text-indigo-300 shrink-0">
                          👆 คลิกแล้ว {link.clickCount.toLocaleString()} ครั้ง
                        </div>
                      </div>

                      {/* Short URL & Target URL */}
                      <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200/70 dark:border-slate-700 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <a
                            href={`/s/${link.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline break-all"
                          >
                            {fullShortUrl}
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopyText(fullShortUrl, "ลิงก์ย่อ")}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold cursor-pointer shrink-0"
                          >
                            📋 คัดลอก
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 break-all flex items-start gap-1.5">
                          <span className="shrink-0 font-bold text-slate-400">➔ ปลายทาง:</span>
                          <a
                            href={link.targetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {link.targetUrl}
                          </a>
                        </div>
                      </div>

                      {/* Meta & Action Buttons */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                          <span>โดย {link.createdByName || "เจ้าหน้าที่"}</span>
                          <span>·</span>
                          <span>สร้าง {formatThaiShortDate(link.createdAt)}</span>
                          {link.expiresAt && (
                            <>
                              <span>·</span>
                              <span className="text-amber-700 dark:text-amber-400 font-semibold">
                                หมดอายุ {formatThaiShortDate(link.expiresAt)}
                              </span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setQrPreviewLink(link)}
                            className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-[11px] font-bold cursor-pointer"
                          >
                            📱 QR ด่วน
                          </button>
                          <Link
                            href={`/tools/qrcode?url=${encodeURIComponent(fullShortUrl)}`}
                            className="px-2.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 text-teal-800 dark:text-teal-300 text-[11px] font-bold"
                          >
                            🎨 แต่ง QR ป้าย A4
                          </Link>
                          {manageable && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditModal(link)}
                                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-[11px] font-bold cursor-pointer"
                              >
                                ✏️ แก้ไข
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleActive(link)}
                                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-[11px] font-bold cursor-pointer"
                              >
                                {link.isActive ? "⏸️ ปิดใช้" : "▶️ เปิดใช้"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingLink(link)}
                                className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-[11px] font-bold cursor-pointer"
                              >
                                🗑️ ลบ
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── QUICK QR PREVIEW MODAL ─── */}
      {qrPreviewLink && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setQrPreviewLink(null)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 shadow-2xl space-y-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                📱 QR Code ลิงก์ย่อ /s/{qrPreviewLink.slug}
              </h3>
              <button
                type="button"
                onClick={() => setQrPreviewLink(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-900 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {qrDataUrl ? (
              <div className="p-4 bg-white rounded-2xl border border-slate-200 inline-block mx-auto">
                <img
                  src={qrDataUrl}
                  alt={`QR Code สำหรับ /s/${qrPreviewLink.slug}`}
                  className="w-56 h-56 mx-auto"
                />
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-xs text-slate-400">
                กำลังสร้าง QR Code...
              </div>
            )}

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
              <div className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 break-all">
                {buildShortUrl(origin, qrPreviewLink.slug)}
              </div>
              {qrPreviewLink.title && (
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  {qrPreviewLink.title}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadQuickQr}
                disabled={!qrDataUrl}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                ⬇️ ดาวน์โหลด PNG
              </button>
              <Link
                href={`/tools/qrcode?url=${encodeURIComponent(
                  buildShortUrl(origin, qrPreviewLink.slug)
                )}`}
                className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold text-center"
              >
                🎨 ใส่ตรา พม. / พิมพ์ป้าย A4
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─── EDIT MODAL ─── */}
      {editingLink && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setEditingLink(null)}
        >
          <form
            onSubmit={handleSaveEdit}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-lg w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  ✏️ แก้ไขลิงก์ย่อ /s/{editingLink.slug}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  ชื่อย่อ (Slug) คงเดิมเสมอ เพื่อให้ QR Code และเอกสารที่พิมพ์แจกแล้วใช้งานต่อได้ทันที
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingLink(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-900 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
                ⚠️ {editError}
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="edit-shorturl-target"
                className="text-xs font-bold text-slate-700 dark:text-slate-200 block"
              >
                URL ปลายทาง *
              </label>
              <input
                id="edit-shorturl-target"
                type="text"
                required
                value={editTargetUrl}
                onChange={(e) => setEditTargetUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="edit-shorturl-title"
                className="text-xs font-bold text-slate-700 dark:text-slate-200 block"
              >
                ชื่อเรื่อง / คำอธิบายอ้างอิง
              </label>
              <input
                id="edit-shorturl-title"
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="edit-shorturl-expires"
                  className="text-xs font-bold text-slate-700 dark:text-slate-200"
                >
                  วันหมดอายุ
                </label>
                {editExpiresAt && (
                  <button
                    type="button"
                    onClick={() => setEditExpiresAt("")}
                    className="text-[11px] text-indigo-600 hover:underline cursor-pointer"
                  >
                    ล้างวันหมดอายุ (ใช้ถาวร)
                  </button>
                )}
              </div>
              <input
                id="edit-shorturl-expires"
                type="date"
                value={editExpiresAt}
                onChange={(e) => setEditExpiresAt(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100"
              />
            </div>

            <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={editIsActive}
                onChange={(e) => setEditIsActive(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>เปิดใช้งานลิงก์นี้ (Active)</span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingLink(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={savingEdit}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
              >
                {savingEdit ? "กำลังบันทึก..." : "💾 บันทึกการเปลี่ยนแปลง"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── DELETE CONFIRM MODAL ─── */}
      {deletingLink && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setDeletingLink(null)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-extrabold text-rose-700 dark:text-rose-400">
              🗑️ ยืนยันการลบลิงก์ย่อ
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              คุณต้องการลบลิงก์{" "}
              <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 font-mono font-bold text-slate-900 dark:text-white">
                /s/{deletingLink.slug}
              </code>{" "}
              หรือไม่? หากลบแล้ว ผู้ที่สแกน QR Code หรือเปิดลิงก์นี้จะได้รับหน้าแจ้งเตือน 404 (ไม่พบข้อมูล) ทันที
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingLink(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
              >
                {deleting ? "กำลังลบ..." : "ยืนยันลบถาวร"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── SQL SETUP MODAL ─── */}
      {showSqlModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowSqlModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 max-w-2xl w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  🗄️ คำสั่ง SQL ติดตั้งตาราง public.short_links (Supabase)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  สถานะปัจจุบัน:{" "}
                  {setupRequired ? (
                    <span className="text-amber-600 font-bold">⚠️ ยังไม่พบตาราง</span>
                  ) : (
                    <span className="text-emerald-600 font-bold">✅ พร้อมใช้งาน</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSqlModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-slate-900 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <pre className="bg-slate-950 text-emerald-300 p-4 rounded-2xl font-mono text-[11px] overflow-x-auto max-h-72 border border-slate-800">
              {SHORT_LINKS_SETUP_SQL}
            </pre>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleCopyText(SHORT_LINKS_SETUP_SQL, "คำสั่ง SQL")}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                📋 คัดลอก SQL
              </button>
              <button
                type="button"
                onClick={() => {
                  loadLinks();
                  setShowSqlModal(false);
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold cursor-pointer"
              >
                🔄 ตรวจสอบตารางอีกครั้ง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

