"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CircularDocument,
  CircularUrgency,
  Member,
  CircularRecipientStatus,
} from "@/lib/types";
import {
  loadStoredCircularDocs,
} from "@/lib/circular-data";
import {
  fetchCircularDocs,
  saveCircularDoc,
  deleteCircularDoc,
  subscribeToCircularDocs,
  isSupabaseConfigured,
} from "@/lib/supabase";
import { GOVERNMENT_DIVISIONS } from "@/lib/rbac";
import { NewCircularModal } from "./NewCircularModal";
import { CircularViewerModal } from "./CircularViewerModal";
import { CirculationPrintSlip } from "./CirculationPrintSlip";
import { DocumentScannerModal } from "./DocumentScannerModal";

interface CircularPageProps {
  currentUser: Member | null;
  members: Member[];
  showToast: (message: string) => void;
  initialDocId?: string | null;
}

type TabType = "inbox" | "all" | "tracking";

export const CircularPage: React.FC<CircularPageProps> = ({
  currentUser,
  members,
  showToast,
  initialDocId,
}) => {
  const [documents, setDocuments] = useState<CircularDocument[]>([]);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<CircularUrgency | "all">("all");
  const [divisionFilter, setDivisionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed">("all");

  // In-page navigation state
  const [viewMode, setViewMode] = useState<"list" | "create" | "viewer" | "scanner" | "print">("list");
  const [viewingDoc, setViewingDoc] = useState<CircularDocument | null>(null);
  const [printingDoc, setPrintingDoc] = useState<CircularDocument | null>(null);
  const [scannedPagesForNewDoc, setScannedPagesForNewDoc] = useState<string[]>([]);
  const [scannedDocNameForNewDoc, setScannedDocNameForNewDoc] = useState<string>("");

  // Load documents on mount from Supabase Live with Local Storage fallback
  const loadData = async () => {
    try {
      const data = await fetchCircularDocs();
      setDocuments(data);
      setIsLiveConnected(isSupabaseConfigured());
    } catch {
      setDocuments(loadStoredCircularDocs());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToCircularDocs(() => {
      loadData();
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Auto-open viewer modal if initialDocId is specified
  useEffect(() => {
    if (initialDocId && documents.length > 0) {
      const found = documents.find((d) => d.id === initialDocId);
      if (found) {
        setViewingDoc(found);
        setViewMode("viewer");
      }
    }
  }, [initialDocId, documents]);

  // Helper: check if current user is targeted
  const getUserRecipientStatus = (doc: CircularDocument): CircularRecipientStatus | undefined => {
    if (!currentUser) return undefined;
    return doc.recipients.find((r) => r.memberId === currentUser.id);
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = documents.length;
    let pendingMyAck = 0;
    let completedByMe = 0;
    let totalTargetedRecipients = 0;
    let totalAcknowledged = 0;

    documents.forEach((doc) => {
      totalTargetedRecipients += doc.recipients.length;
      totalAcknowledged += doc.recipients.filter((r) => r.isAcknowledged).length;

      if (currentUser) {
        const userStatus = doc.recipients.find((r) => r.memberId === currentUser.id);
        if (userStatus) {
          if (userStatus.isAcknowledged) {
            completedByMe++;
          } else {
            pendingMyAck++;
          }
        }
      }
    });

    const overallRate = totalTargetedRecipients > 0
      ? Math.round((totalAcknowledged / totalTargetedRecipients) * 100)
      : 100;

    return {
      total,
      pendingMyAck,
      completedByMe,
      overallRate,
    };
  }, [documents, currentUser]);

  // Filtering documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = doc.title.toLowerCase().includes(q);
        const matchNumber = doc.docNumber.toLowerCase().includes(q);
        const matchIssuer = (doc.createdByName || "").toLowerCase().includes(q);
        const matchDept = (doc.senderOrg || "").toLowerCase().includes(q);
        if (!matchTitle && !matchNumber && !matchIssuer && !matchDept) return false;
      }

      // Urgency filter
      if (urgencyFilter !== "all" && doc.urgency !== urgencyFilter) {
        return false;
      }

      // Division filter (check if target contains this division or all)
      if (divisionFilter !== "all") {
        if (doc.targetCriteria.scope !== "all") {
          const matchedDiv = doc.targetCriteria.divisions?.includes(divisionFilter);
          if (!matchedDiv) return false;
        }
      }

      const isDocFullyAcked = doc.recipients.length > 0 && doc.recipients.every((r) => r.isAcknowledged);

      // Tab specific filter
      if (activeTab === "inbox") {
        if (!currentUser) return true;
        const myStatus = doc.recipients.find((r) => r.memberId === currentUser.id);
        if (!myStatus) return false; // not targeted

        if (statusFilter === "pending") return !myStatus.isAcknowledged;
        if (statusFilter === "completed") return myStatus.isAcknowledged;
        return true;
      }

      // Status filter on "all" or "tracking"
      if (statusFilter === "pending" && isDocFullyAcked) return false;
      if (statusFilter === "completed" && !isDocFullyAcked) return false;

      return true;
    });
  }, [documents, searchQuery, urgencyFilter, divisionFilter, activeTab, statusFilter, currentUser]);

  // Handle document acknowledge update
  const handleAcknowledgeDoc = async (docId: string, signatureUrl?: string, endorsementNote?: string) => {
    const targetDoc = documents.find((d) => d.id === docId);
    if (!targetDoc) return;

    const updatedRecipients = targetDoc.recipients.map((r) => {
      if (r.memberId !== currentUser?.id) return r;
      return {
        ...r,
        isAcknowledged: true,
        acknowledgedAt: new Date().toISOString(),
        signatureUrl: signatureUrl || r.signatureUrl,
        endorsementNote: endorsementNote || r.endorsementNote || "รับทราบและถือปฏิบัติ",
      };
    });
    const ackCount = updatedRecipients.filter((r) => r.isAcknowledged).length;
    const isComplete = ackCount === updatedRecipients.length;
    const updatedDoc: CircularDocument = {
      ...targetDoc,
      recipients: updatedRecipients,
      acknowledgedCount: ackCount,
      status: (isComplete ? "closed" : targetDoc.status) as "active" | "closed" | "archived",
    };

    const updatedList = documents.map((d) => (d.id === docId ? updatedDoc : d));
    setDocuments(updatedList);
    setViewingDoc(updatedDoc);
    await saveCircularDoc(updatedDoc);
    showToast("บันทึกการลงนามรับทราบลงฐานข้อมูลเรียบร้อยแล้ว");
  };

  // Handle create new document
  const handleCreateDocument = async (newDoc: CircularDocument) => {
    const updated = [newDoc, ...documents];
    setDocuments(updated);
    await saveCircularDoc(newDoc);
    showToast(`ออกหนังสือเวียนเลขที่ ${newDoc.docNumber} สำเร็จ (บันทึกลงฐานข้อมูลแล้ว)`);
  };

  // Handle delete document
  const handleDeleteDocument = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบหนังสือเวียนฉบับนี้? การดำเนินการนี้ไม่สามารถยกเลิกได้")) {
      return;
    }
    const updated = documents.filter((d) => d.id !== docId);
    setDocuments(updated);
    await deleteCircularDoc(docId);
    showToast("ลบหนังสือเวียนจากฐานข้อมูลเรียบร้อยแล้ว");
  };

  // Color badge helpers
  const getUrgencyBadge = (urgency: CircularUrgency) => {
    switch (urgency) {
      case "most_urgent":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-100 text-red-700 border border-red-200 animate-pulse">ด่วนที่สุด</span>;
      case "very_urgent":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-orange-100 text-orange-700 border border-orange-200">ด่วนมาก</span>;
      case "urgent":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-700 border border-amber-200">ด่วน</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-700">ปกติ</span>;
    }
  };

  // Helpers for In-Page navigation
  const handleOpenViewer = (doc: CircularDocument) => {
    setViewingDoc(doc);
    setViewMode("viewer");
  };

  const handleOpenPrint = (doc: CircularDocument, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPrintingDoc(doc);
    setViewMode("print");
  };

  // ─── IN-PAGE SUB-VIEWS (NO POPUP MODALS) ───
  if (viewMode === "create" && currentUser) {
    return (
      <NewCircularModal
        currentUser={currentUser}
        availableMembers={members}
        initialScannedPages={scannedPagesForNewDoc}
        initialFileName={scannedDocNameForNewDoc}
        onClose={() => {
          setScannedPagesForNewDoc([]);
          setScannedDocNameForNewDoc("");
          setViewMode("list");
        }}
        onSave={(newDoc) => {
          setScannedPagesForNewDoc([]);
          setScannedDocNameForNewDoc("");
          handleCreateDocument(newDoc);
          setViewMode("list");
        }}
        inPage={true}
      />
    );
  }

  if (viewMode === "scanner") {
    return (
      <DocumentScannerModal
        inPage={true}
        onClose={() => setViewMode("list")}
        onPagesCaptured={(scannedPages, fileName) => {
          setScannedPagesForNewDoc(scannedPages);
          setScannedDocNameForNewDoc(fileName);
          showToast(`สแกนเอกสารเสร็จสมบูรณ์ (${scannedPages.length} หน้า) นำไปสร้างหนังสือเวียนได้ทันที`);
          setViewMode("create");
        }}
      />
    );
  }

  if (viewMode === "viewer" && viewingDoc && currentUser) {
    return (
      <CircularViewerModal
        document={viewingDoc}
        currentUser={currentUser}
        inPage={true}
        onClose={() => {
          setViewingDoc(null);
          setViewMode("list");
        }}
        onAcknowledge={handleAcknowledgeDoc}
        onPrintSlip={() => {
          setPrintingDoc(viewingDoc);
          setViewMode("print");
        }}
        onDelete={async (docId) => {
          const updated = documents.filter((d) => d.id !== docId);
          setDocuments(updated);
          setViewingDoc(null);
          setViewMode("list");
          await deleteCircularDoc(docId);
          showToast("ลบหนังสือเวียนจากฐานข้อมูลเรียบร้อยแล้ว");
        }}
      />
    );
  }

  if (viewMode === "print" && printingDoc) {
    return (
      <CirculationPrintSlip
        document={printingDoc}
        inPage={true}
        onClose={() => {
          setPrintingDoc(null);
          setViewMode(viewingDoc ? "viewer" : "list");
        }}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ─── HEADER & PRIMARY ACTIONS ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-3xl">📜</span>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-800">ระบบเวียนหนังสือราชการอิเล็กทรอนิกส์</h1>
              {isLiveConnected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Database Cloud Live
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  Local Storage
                </span>
              )}
            </div>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            เวียนหนังสือตามฝ่ายงาน/ประเภทบุคลากร พร้อมระบบสแกนเอกสาร ลงนามดิจิทัล และติดตามผลแบบเรียลไทม์
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setViewMode("scanner")}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm transition-colors border border-slate-200 cursor-pointer"
            title="เปิดกล้องสแกนเอกสารกระดาษเป็นไฟล์ดิจิทัล"
          >
            <span>📷</span>
            <span>สแกนหนังสือเข้าสู่ระบบ</span>
          </button>

          <button
            onClick={() => setViewMode("create")}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-shadow shadow-sm hover:shadow cursor-pointer"
          >
            <span>➕</span>
            <span>ออกหนังสือเวียนใหม่</span>
          </button>
        </div>
      </div>

      {/* ─── METRICS CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400">หนังสือเวียนทั้งหมด</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{stats.total} <span className="text-xs text-slate-500 font-normal">ฉบับ</span></p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
            📑
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-amber-600">รอฉันลงนามรับทราบ</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pendingMyAck} <span className="text-xs text-amber-500 font-normal">ฉบับ</span></p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
            ✍️
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-emerald-600">ฉันรับทราบแล้ว</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.completedByMe} <span className="text-xs text-emerald-500 font-normal">ฉบับ</span></p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
            ✅
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-indigo-600">อัตราการรับทราบเฉลี่ย</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.overallRate}%</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl">
            📊
          </div>
        </div>
      </div>

      {/* ─── TABS & CONTROLS ─── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          {/* Main Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("inbox")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === "inbox"
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>📥</span>
              <span>หนังสือเวียนถึงฉัน</span>
              {stats.pendingMyAck > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-red-500 text-white font-bold">
                  {stats.pendingMyAck}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === "all"
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>📚</span>
              <span>หนังสือเวียนทั้งหมด ({documents.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("tracking")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === "tracking"
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>📊</span>
              <span>รายงานและสถิติการรับทราบ</span>
            </button>
          </div>

          {/* Quick status pill toggles */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">สถานะ:</span>
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                statusFilter === "all" ? "bg-slate-800 text-white font-medium" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                statusFilter === "pending" ? "bg-amber-600 text-white font-medium" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              ยังไม่เสร็จสิ้น
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                statusFilter === "completed" ? "bg-emerald-600 text-white font-medium" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              รับทราบครบแล้ว
            </button>
          </div>
        </div>

        {/* Filter bar: search, urgency, division */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="ค้นหาตามเลขที่หนังสือ, ชื่อเรื่อง, ผู้ส่ง หรือกลุ่มงาน..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value as any)}
              className="w-full py-2 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">ความเร่งด่วน: ทั้งหมด</option>
              <option value="normal">ปกติ</option>
              <option value="urgent">ด่วน</option>
              <option value="very_urgent">ด่วนมาก</option>
              <option value="most_urgent">ด่วนที่สุด</option>
            </select>
          </div>

          <div>
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="w-full py-2 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">กลุ่มงานเป้าหมาย: ทั้งหมด</option>
              {GOVERNMENT_DIVISIONS.map((div) => (
                <option key={div} value={div}>
                  {div}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ─── TAB 1 & 2: INBOX & ALL DOCUMENTS LIST ─── */}
      {activeTab !== "tracking" && (
        <div className="space-y-4">
          {filteredDocuments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
              <span className="text-5xl block mb-3">📭</span>
              <h3 className="text-base font-semibold text-slate-700">ไม่พบหนังสือเวียนตามเงื่อนไขที่เลือก</h3>
              <p className="text-sm text-slate-400 mt-1">
                {activeTab === "inbox"
                  ? "ไม่มีหนังสือเวียนที่ส่งถึงคุณ หรือคุณได้รับทราบครบถ้วนแล้ว"
                  : "ลองปรับเปลี่ยนคำค้นหาหรือตัวกรองความเร่งด่วน"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredDocuments.map((doc) => {
                const userStatus = getUserRecipientStatus(doc);
                const ackCount = doc.recipients.filter((r) => r.isAcknowledged).length;
                const totalCount = doc.recipients.length;
                const percent = totalCount > 0 ? Math.round((ackCount / totalCount) * 100) : 100;
                const isTargeted = !!userStatus;
                const isSigned = userStatus?.isAcknowledged;

                return (
                  <div
                    key={doc.id}
                    onClick={() => handleOpenViewer(doc)}
                    className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-indigo-300"
                  >
                    {/* Left: Doc Info */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {getUrgencyBadge(doc.urgency)}
                        <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded">
                          {doc.docNumber}
                        </span>
                        <span className="text-xs text-slate-400">
                          ลงวันที่ {doc.issuedDate}
                        </span>
                        {doc.deadline && (
                          <span className="text-xs text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded">
                            ⏰ ให้ถือปฏิบัติภายใน {doc.deadline}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                        {doc.title}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-1">
                        {doc.summary || "หนังสือเวียนทางราชการเพื่อทราบและถือปฏิบัติตามระเบียบ"}
                      </p>

                      {/* Metadata Row */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          <span>🏢</span> {doc.senderOrg} ({doc.createdByName})
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <span>🎯</span>
                          {doc.targetCriteria.scope === "all"
                            ? "เวียนถึงบุคลากรทุกคน"
                            : `เวียนตามกลุ่ม: ${doc.targetCriteria.divisions?.length || 0} กลุ่มงาน (${doc.targetCriteria.personnelTypes?.length || 0} ประเภท)`}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Progress stats */}
                    <div className="md:w-56 shrink-0 bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">ผลการรับทราบ</span>
                        <span className="font-bold text-slate-700">{ackCount}/{totalCount} ({percent}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            percent === 100 ? "bg-emerald-500" : percent > 50 ? "bg-indigo-500" : "bg-amber-500"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 text-right">
                        {totalCount - ackCount > 0 ? `รอรับทราบอีก ${totalCount - ackCount} ท่าน` : "รับทราบครบถ้วนแล้ว"}
                      </p>
                    </div>

                    {/* Right: User personal status & Action Buttons */}
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-2 shrink-0">
                      {isTargeted ? (
                        isSigned ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200">
                            <span>✅</span> รับทราบแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-300 animate-pulse">
                            <span>✍️</span> รอคุณลงนาม
                          </span>
                        )
                      ) : (
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">
                          ไม่ได้อยู่ในกลุ่มเป้าหมาย
                        </span>
                      )}

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => handleOpenPrint(doc, e)}
                          className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                          title="พิมพ์ใบปะหน้าเวียน / รายงานผล"
                        >
                          <span>🖨️</span>
                          <span className="hidden sm:inline">พิมพ์ใบเวียน</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenViewer(doc);
                          }}
                          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center gap-1 cursor-pointer ${
                            isTargeted && !isSigned
                              ? "bg-amber-600 hover:bg-amber-700 text-white"
                              : "bg-indigo-600 hover:bg-indigo-700 text-white"
                          }`}
                        >
                          <span>{isTargeted && !isSigned ? "✍️ ลงนาม" : "📖 เปิดอ่าน"}</span>
                        </button>

                        {(currentUser?.role === "admin" || currentUser?.role === "manager" || currentUser?.id === doc.createdBy) && (
                          <button
                            onClick={(e) => handleDeleteDocument(doc.id, e)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs cursor-pointer"
                            title="ลบหนังสือเวียน"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: TRACKING & REALTIME MATRIX DASHBOARD ─── */}
      {activeTab === "tracking" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span>📊</span> ตารางติดตามผลการเวียนหนังสือราชการและสถานะการลงนาม
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs">
                    <th className="py-3 px-4 font-semibold">เลขที่ / วันที่</th>
                    <th className="py-3 px-4 font-semibold">ชื่อเรื่องหนังสือเวียน</th>
                    <th className="py-3 px-4 font-semibold">หน่วยงานต้นเรื่อง</th>
                    <th className="py-3 px-4 font-semibold text-center">กลุ่มเป้าหมาย</th>
                    <th className="py-3 px-4 font-semibold text-center">ความคืบหน้า</th>
                    <th className="py-3 px-4 font-semibold text-center">สถานะ</th>
                    <th className="py-3 px-4 font-semibold text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDocuments.map((doc) => {
                    const ackCount = doc.recipients.filter((r) => r.isAcknowledged).length;
                    const totalCount = doc.recipients.length;
                    const percent = totalCount > 0 ? Math.round((ackCount / totalCount) * 100) : 100;

                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-mono font-bold text-slate-800 text-xs">{doc.docNumber}</p>
                          <p className="text-[11px] text-slate-400">
                            {doc.issuedDate}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-800 max-w-xs truncate">{doc.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {getUrgencyBadge(doc.urgency)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {doc.senderOrg}
                        </td>
                        <td className="py-3 px-4 text-center text-xs">
                          {doc.targetCriteria.scope === "all" ? (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">ทุกคน</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                              {doc.targetCriteria.divisions?.length || 0} กลุ่ม
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="w-28 mx-auto">
                            <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                              <span>{ackCount}/{totalCount}</span>
                              <span className="font-semibold">{percent}%</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  percent === 100 ? "bg-emerald-500" : percent > 50 ? "bg-indigo-500" : "bg-amber-500"
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {percent === 100 ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                              รับทราบครบ
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                              รออีก {totalCount - ackCount} ท่าน
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenPrint(doc)}
                              className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                              title="พิมพ์รายงานสรุป"
                            >
                              🖨️ พิมพ์
                            </button>
                            <button
                              onClick={() => handleOpenViewer(doc)}
                              className="px-2.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer"
                            >
                              รายละเอียด
                            </button>
                            {(currentUser?.role === "admin" || currentUser?.role === "manager" || currentUser?.id === doc.createdBy) && (
                              <button
                                onClick={(e) => handleDeleteDocument(doc.id, e)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs cursor-pointer"
                                title="ลบหนังสือเวียน"
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
