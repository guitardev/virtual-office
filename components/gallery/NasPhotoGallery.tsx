"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Member } from "@/lib/types";
import {
  getUserNasSid,
  getUserNasAccount,
  setUserNasSid,
  clearUserNasSid,
  getClientSynologyConfig,
  checkNasHealth,
  loginSynology,
  SynologyHealthStatus,
} from "@/lib/synology";
import {
  PhotoSpace,
  SynologyPhotoItem,
  SynologyPhotoAlbum,
  SynologyPhotoFolder,
  listSynologyPhotos,
  listSynologyAlbums,
  listSynologyFolders,
  getPhotoThumbnailUrl,
  formatBytes,
  formatPhotoTime,
} from "@/lib/synology-photos";

interface NasPhotoGalleryProps {
  currentUser: Member;
  showToast: (msg: string) => void;
}

export function NasPhotoGallery({ currentUser, showToast }: NasPhotoGalleryProps) {
  const config = getClientSynologyConfig();
  const [health, setHealth] = useState<SynologyHealthStatus | null>(null);

  // User NAS Auth session
  const [userSid, setUserSid] = useState<string | null>(() => getUserNasSid());
  const [userNasAccount, setUserNasAccount] = useState<string | null>(() => getUserNasAccount());
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState(currentUser.name || "admin");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Gallery state
  const [currentSpace, setCurrentSpace] = useState<PhotoSpace>("shared");
  const [activeTab, setActiveTab] = useState<"folders" | "all" | "photos" | "videos" | "albums">("folders");
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null);

  // Folder & Album-by-Folder state
  const [folders, setFolders] = useState<SynologyPhotoFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<{ id: number; name: string; parent?: number } | null>(null);
  const [folderBreadcrumbs, setFolderBreadcrumbs] = useState<{ id: number; name: string }[]>([
    { id: 0, name: "โฟลเดอร์หลัก" },
  ]);

  const [items, setItems] = useState<SynologyPhotoItem[]>([]);
  const [albums, setAlbums] = useState<SynologyPhotoAlbum[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [showSharedSpaceGuide, setShowSharedSpaceGuide] = useState(false);

  // Lightbox Preview Modal
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Hydrate session on client mount
  useEffect(() => {
    const storedSid = getUserNasSid();
    const storedAccount = getUserNasAccount();
    if (storedSid) setUserSid(storedSid);
    if (storedAccount) setUserNasAccount(storedAccount);
  }, []);

  // Health check on mount
  useEffect(() => {
    checkNasHealth(config.nasUrl).then(setHealth).catch(console.error);
  }, [config.nasUrl]);

  // Load photos, folders, or albums when userSid, space, or activeTab changes
  useEffect(() => {
    if (!userSid) {
      setItems([]);
      setAlbums([]);
      setFolders([]);
      return;
    }

    if (activeTab === "albums") {
      loadAlbums(userSid, currentSpace);
    } else if (activeTab === "folders") {
      loadFolders(userSid, currentSpace, selectedFolder?.id || 0);
      if (selectedFolder) {
        loadPhotos(userSid, currentSpace, undefined, selectedFolder.id);
      }
    } else {
      loadPhotos(userSid, currentSpace, selectedAlbumId || undefined, selectedFolder?.id);
    }
  }, [userSid, currentSpace, activeTab, selectedAlbumId, selectedFolder]);

  // ─── LOAD DATA ───
  const loadPhotos = async (
    sid: string,
    space: PhotoSpace,
    albumId?: number,
    folderId?: number,
    isAutoFallback: boolean = false
  ) => {
    setIsLoading(true);
    setPermissionError(null);
    setErrorCode(null);
    try {
      const res = await listSynologyPhotos({
        space,
        albumId,
        folderId,
        offset: 0,
        limit: 100,
        sid,
        nasUrl: config.nasUrl,
      });

      if (res.success && res.items) {
        setItems(res.items);
      } else {
        // If Shared Space returns Code 801 on initial load, auto-fallback to Personal Space
        if (space === "shared" && res.code === 801 && !isAutoFallback) {
          const fallbackRes = await listSynologyPhotos({
            space: "personal",
            albumId,
            folderId,
            offset: 0,
            limit: 100,
            sid,
            nasUrl: config.nasUrl,
          });

          if (fallbackRes.success && fallbackRes.items) {
            setCurrentSpace("personal");
            setItems(fallbackRes.items);
            showToast("ℹ️ สลับมาแสดง 'พื้นที่ส่วนบุคคล' อัตโนมัติ (เนื่องจากยังไม่ได้เปิด Shared Space บน DSM)");
            return;
          }
        }

        setItems([]);
        setErrorCode(res.code || null);
        setPermissionError(res.error || "ไม่สามารถดึงรูปภาพจาก Synology Photos ได้");
        if (res.code === 119) {
          clearUserNasSid();
          setUserSid(null);
        }
      }
    } catch (err: any) {
      setPermissionError(err?.message || "เกิดข้อผิดพลาดในการโหลดรูปภาพ");
    } finally {
      setIsLoading(false);
    }
  };

  const loadFolders = async (sid: string, space: PhotoSpace, parentFolderId: number = 0) => {
    setIsLoading(true);
    setPermissionError(null);
    setErrorCode(null);
    try {
      const res = await listSynologyFolders({
        space,
        folderId: parentFolderId,
        offset: 0,
        limit: 100,
        sid,
        nasUrl: config.nasUrl,
      });

      if (res.success && res.folders) {
        setFolders(res.folders);
      } else {
        setFolders([]);
        if (res.code) setErrorCode(res.code);
        if (res.error) setPermissionError(res.error);
        if (res.code === 119) {
          clearUserNasSid();
          setUserSid(null);
        }
      }
    } catch (err: any) {
      setPermissionError(err?.message || "เกิดข้อผิดพลาดในการโหลดโฟลเดอร์");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFolder = (folder: SynologyPhotoFolder) => {
    setSelectedFolder({ id: folder.id, name: folder.name, parent: folder.parent });
    setFolderBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    if (userSid) {
      loadPhotos(userSid, currentSpace, undefined, folder.id);
      loadFolders(userSid, currentSpace, folder.id);
    }
  };

  const handleNavigateBreadcrumb = (index: number) => {
    if (index === 0) {
      setSelectedFolder(null);
      setFolderBreadcrumbs([{ id: 0, name: "โฟลเดอร์หลัก" }]);
      if (userSid) {
        loadFolders(userSid, currentSpace, 0);
        setItems([]);
      }
    } else {
      const target = folderBreadcrumbs[index];
      setSelectedFolder({ id: target.id, name: target.name });
      setFolderBreadcrumbs((prev) => prev.slice(0, index + 1));
      if (userSid) {
        loadPhotos(userSid, currentSpace, undefined, target.id);
        loadFolders(userSid, currentSpace, target.id);
      }
    }
  };

  const handleGoBackFolder = () => {
    if (folderBreadcrumbs.length <= 1) {
      setSelectedFolder(null);
      return;
    }
    handleNavigateBreadcrumb(folderBreadcrumbs.length - 2);
  };

  const loadAlbums = async (sid: string, space: PhotoSpace) => {
    setIsLoading(true);
    setPermissionError(null);
    setErrorCode(null);
    try {
      const res = await listSynologyAlbums({
        space,
        offset: 0,
        limit: 50,
        sid,
        nasUrl: config.nasUrl,
      });

      if (res.success && res.albums) {
        setAlbums(res.albums);
      } else {
        setAlbums([]);
        setErrorCode(res.code || null);
        setPermissionError(res.error || "ไม่สามารถดึงรายการอัลบั้มได้");
        if (res.code === 119) {
          clearUserNasSid();
          setUserSid(null);
        }
      }
    } catch (err: any) {
      setPermissionError(err?.message || "เกิดข้อผิดพลาดในการโหลดอัลบั้ม");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── AUTH ACTIONS ───
  const handleConnectNas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPassword) {
      showToast("⚠️ กรุณากรอกรหัสผ่าน Synology NAS");
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await loginSynology(loginUsername.trim(), loginPassword, config.nasUrl);
      if (res.success && res.sid) {
        setUserNasSid(res.sid, res.account || loginUsername.trim());
        setUserSid(res.sid);
        setUserNasAccount(res.account || loginUsername.trim());
        setShowConnectModal(false);
        setLoginPassword("");
        showToast(`✅ เชื่อมต่อ Synology Photos บัญชี "${res.account || loginUsername}" สำเร็จ`);
      } else {
        showToast(`❌ เข้าสู่ระบบล้มเหลว: ${res.error}`);
      }
    } catch (err: any) {
      showToast(`❌ เกิดข้อผิดพลาด: ${err?.message}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleDisconnectNas = () => {
    clearUserNasSid();
    setUserSid(null);
    setUserNasAccount(null);
    setItems([]);
    setAlbums([]);
    showToast("🔒 ยกเลิกการเชื่อมต่อเซสชัน Synology Photos เรียบร้อยแล้ว");
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Type filter
      if (activeTab === "photos" && item.type !== "photo") return false;
      if (activeTab === "videos" && item.type !== "video") return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return item.filename.toLowerCase().includes(q);
      }
      return true;
    });
  }, [items, activeTab, searchQuery]);

  // Current Lightbox Item
  const activeLightboxItem = lightboxIndex !== null && filteredItems[lightboxIndex] ? filteredItems[lightboxIndex] : null;

  const handleNextLightbox = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex((prev) => (prev! + 1 < filteredItems.length ? prev! + 1 : 0));
  };

  const handlePrevLightbox = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex((prev) => (prev! - 1 >= 0 ? prev! - 1 : filteredItems.length - 1));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* ─── HEADER HERO BANNER ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0E7490] via-[#0284C7] to-[#4F46E5] p-6 md:p-8 text-white shadow-xl shadow-cyan-600/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl shrink-0 shadow-inner">
            📸
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl md:text-2xl font-bold font-heading text-white">
                คลังภาพและสื่อราชการ (Synology Photos)
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  health?.online
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${health?.online ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                {health?.online ? "On-Premise LAN พร้อมใช้งาน" : "ตรวจพบปัญหาเครือข่าย"}
              </span>
            </div>
            <p className="text-xs text-cyan-100/90 mt-1 max-w-2xl leading-relaxed">
              จัดเก็บ ค้นหา และเผยแพร่ภาพถ่ายกิจกรรมราชการและสื่อประชาสัมพันธ์ พมจ.กำแพงเพชร ผ่าน Synology Photos (192.168.162.21)
            </p>
          </div>
        </div>

        {/* User NAS Session Indicator */}
        <div className="flex items-center gap-2.5 shrink-0">
          {userSid ? (
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="text-left">
                <div className="text-[10px] text-cyan-200">สิทธิ์ Photos เข้าสู่ระบบ:</div>
                <div className="font-bold text-white">
                  {userNasAccount || currentUser.name || "Synology User"}
                </div>
              </div>
              <button
                type="button"
                onClick={handleDisconnectNas}
                title="สลับบัญชีหรือออกจากเซสชัน Photos"
                className="ml-2 px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-[10px] font-bold cursor-pointer"
              >
                สลับบัญชี
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowConnectModal(true)}
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <span>🔑</span>
              <span>เชื่อมต่อบัญชี Synology NAS</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── NOT CONNECTED NOTICE ─── */}
      {!userSid ? (
        <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm text-center max-w-xl mx-auto space-y-4 my-8">
          <div className="w-16 h-16 rounded-3xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-3xl mx-auto text-cyan-600">
            🔐
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 font-heading">
              กรุณายืนยันตัวตนเพื่อเปิดคลังภาพ Synology Photos
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              ระบบเชื่อมต่อกับ Synology Photos โดยตรงตามสิทธิ์บัญชีผู้ใช้ เพื่อแสดงอัลบั้มภาพกิจกรรมส่วนกลาง (Shared Space) และภาพส่วนตัว (Personal Space) ตามสิทธิ์ DSM ที่ได้รับอนุญาต
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowConnectModal(true)}
            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            🔑 เข้าสู่ระบบเพื่อเปิดคลังภาพ
          </button>
        </div>
      ) : (
        /* ─── MAIN GALLERY INTERFACE ─── */
        <div className="space-y-5">
          {/* Controls Bar: Space Selector & Filter Tabs */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Space Switcher */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setCurrentSpace("shared");
                  setSelectedAlbumId(null);
                  setSelectedFolder(null);
                  setFolderBreadcrumbs([{ id: 0, name: "โฟลเดอร์หลัก" }]);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentSpace === "shared"
                    ? "bg-white text-cyan-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>🏛️</span>
                <span>พื้นที่ส่วนกลาง พมจ. (Shared Space)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentSpace("personal");
                  setSelectedAlbumId(null);
                  setSelectedFolder(null);
                  setFolderBreadcrumbs([{ id: 0, name: "โฟลเดอร์หลัก" }]);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  currentSpace === "personal"
                    ? "bg-white text-cyan-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>👤</span>
                <span>พื้นที่ส่วนตัว (Personal Space)</span>
              </button>
            </div>

            {/* Media Type & Folder Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("folders");
                  setSelectedAlbumId(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "folders"
                    ? "bg-cyan-50 text-cyan-700 border border-cyan-200"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                📁 โฟลเดอร์กิจกรรม ({folders.length})
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("all");
                  setSelectedAlbumId(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "all" && !selectedAlbumId
                    ? "bg-cyan-50 text-cyan-700 border border-cyan-200"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                🖼️ ทั้งหมด ({items.length})
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("photos");
                  setSelectedAlbumId(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "photos"
                    ? "bg-cyan-50 text-cyan-700 border border-cyan-200"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                📸 รูปภาพ
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("videos");
                  setSelectedAlbumId(null);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "videos"
                    ? "bg-cyan-50 text-cyan-700 border border-cyan-200"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                🎥 วิดีโอ
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("albums")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "albums"
                    ? "bg-cyan-50 text-cyan-700 border border-cyan-200"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                🏷️ อัลบั้ม ({albums.length})
              </button>

              <button
                type="button"
                onClick={() => {
                  if (activeTab === "albums") {
                    loadAlbums(userSid, currentSpace);
                  } else if (activeTab === "folders") {
                    loadFolders(userSid, currentSpace, selectedFolder?.id || 0);
                    if (selectedFolder) loadPhotos(userSid, currentSpace, undefined, selectedFolder.id);
                  } else {
                    loadPhotos(userSid, currentSpace, selectedAlbumId || undefined, selectedFolder?.id);
                  }
                }}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                title="รีเฟรชคลังภาพ"
              >
                🔄
              </button>
            </div>
          </div>

          {/* Search & Breadcrumb Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 flex-wrap">
              <span className="font-semibold text-slate-800">
                {currentSpace === "shared" ? "🏛️ พื้นที่ส่วนกลาง พมจ." : "👤 พื้นที่ส่วนบุคคล"}
              </span>

              {/* Folder Breadcrumbs */}
              {selectedFolder && (
                <>
                  <span className="text-slate-400">/</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {folderBreadcrumbs.map((bc, idx) => (
                      <React.Fragment key={bc.id}>
                        {idx > 0 && <span className="text-slate-300">/</span>}
                        <button
                          type="button"
                          onClick={() => handleNavigateBreadcrumb(idx)}
                          className={`text-xs px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                            idx === folderBreadcrumbs.length - 1
                              ? "bg-cyan-100 text-cyan-900 font-bold"
                              : "hover:bg-slate-100 text-slate-600"
                          }`}
                        >
                          {bc.name}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFolder(null);
                      setFolderBreadcrumbs([{ id: 0, name: "โฟลเดอร์หลัก" }]);
                      if (userSid) loadFolders(userSid, currentSpace, 0);
                    }}
                    className="text-[11px] text-rose-600 hover:underline cursor-pointer ml-1"
                  >
                    ✕ ดูโฟลเดอร์ทั้งหมด
                  </button>
                </>
              )}

              {selectedAlbumId && (
                <>
                  <span className="text-slate-400">/</span>
                  <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 font-bold">
                    อัลบั้ม #{selectedAlbumId}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedAlbumId(null)}
                    className="text-[11px] text-rose-600 hover:underline cursor-pointer ml-1"
                  >
                    ✕ ยกเลิกฟิลเตอร์
                  </button>
                </>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="ค้นหาชื่อไฟล์ภาพหรือวิดีโอ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 w-44 sm:w-60"
              />
              <span className="absolute left-2.5 top-2 text-xs text-slate-400">🔍</span>
            </div>
          </div>

          {/* ─── ERROR BANNER ─── */}
          {permissionError && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 space-y-3 shadow-xs">
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0">⚠️</span>
                <div className="flex-1">
                  <div className="font-bold text-amber-950 text-sm flex items-center gap-2">
                    <span>การแจ้งเตือนสิทธิ์ Synology Photos</span>
                    {errorCode && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 text-[11px] font-mono font-bold">
                        Code {errorCode}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-amber-800 leading-relaxed font-medium">
                    {permissionError}
                  </p>
                </div>
              </div>

              {/* Action Buttons & Guide Toggle */}
              <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center gap-2">
                {currentSpace === "shared" && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentSpace("personal");
                      setSelectedAlbumId(null);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>👤</span>
                    <span>สลับไปยังพื้นที่ส่วนบุคคล (Personal Space)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowSharedSpaceGuide(!showSharedSpaceGuide)}
                  className="px-3 py-1.5 rounded-xl bg-white/90 hover:bg-white text-slate-700 font-bold text-xs transition-all border border-slate-300 shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{showSharedSpaceGuide ? "▲" : "📖"}</span>
                  <span>{showSharedSpaceGuide ? "ซ่อนขั้นตอนการตั้งค่า DSM" : "วิธีเปิดใช้งาน Shared Space บน Synology DSM"}</span>
                </button>
              </div>

              {/* Expandable DSM Setup Guide */}
              {showSharedSpaceGuide && (
                <div className="mt-3 p-3.5 rounded-xl bg-white/95 border border-amber-200 text-slate-700 text-xs space-y-2">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>💡</span>
                    <span>ขั้นตอนการเปิดใช้งาน Shared Space สำหรับผู้ดูแลระบบ Synology (DSM):</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1 leading-relaxed">
                    <li>
                      เปิดเว็บเบราว์เซอร์เข้าสู่ระบบ <strong>Synology DSM</strong> (เช่น <code className="bg-slate-100 px-1 py-0.5 rounded text-cyan-800">http://192.168.162.21:5000</code>) ด้วยบัญชีผู้ดูแลระบบ (Admin)
                    </li>
                    <li>
                      เปิดแอปพลิเคชัน <strong>Synology Photos</strong>
                    </li>
                    <li>
                      คลิกไอคอนโปรไฟล์บัญชีผู้ใช้ที่มุมขวาบน แล้วเลือก <strong>การตั้งค่า (Settings)</strong>
                    </li>
                    <li>
                      คลิกที่แถบ <strong>พื้นที่ที่แชร์ (Shared Space)</strong>
                    </li>
                    <li>
                      ทำเครื่องหมายถูกที่ช่อง <strong>"เปิดใช้งานพื้นที่ที่แชร์" (Enable Shared Space)</strong>
                    </li>
                    <li>
                      คลิกปุ่ม <strong>"กำหนดสิทธิ์การเข้าถึง" (Set Access Permissions)</strong> เพื่อมอบสิทธิ์การดูหรือจัดการภาพให้แก่ผู้ใช้งานหรือกลุ่มงาน
                    </li>
                    <li>
                      กด <strong>บันทึก (Save)</strong> จากนั้นกลับมากดปุ่มรีเฟรช 🔄 ในหน้านี้
                    </li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* ─── LOADING STATE ─── */}
          {isLoading ? (
            <div className="py-24 text-center space-y-3 text-slate-400 text-xs">
              <div className="text-4xl animate-spin">⏳</div>
              <div className="font-medium">กำลังโหลดคลังภาพถ่ายและสื่อจาก Synology Photos...</div>
            </div>
          ) : activeTab === "folders" ? (
            /* ─── FOLDERS (ALBUMS BY FOLDER) VIEW ─── */
            <div className="space-y-6">
              {/* Folder Header Banner if inside a folder */}
              {selectedFolder && (
                <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center text-xl shadow-xs">
                      📁
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-cyan-950 font-heading">
                        {selectedFolder.name}
                      </h4>
                      <p className="text-xs text-cyan-700">
                        {filteredItems.length} ไฟล์ภาพและสื่อในโฟลเดอร์นี้
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoBackFolder}
                    className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-cyan-900 font-bold text-xs border border-cyan-200 shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <span>⬅️</span>
                    <span>ย้อนกลับ</span>
                  </button>
                </div>
              )}

              {/* Subfolders Grid if any */}
              {folders.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <span>📁</span>
                    <span>โฟลเดอร์กิจกรรม ({folders.length})</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {folders.map((folder) => (
                      <div
                        key={folder.id}
                        onClick={() => handleSelectFolder(folder)}
                        className="group bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-cyan-400 transition-all overflow-hidden cursor-pointer flex flex-col"
                      >
                        <div className="h-36 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center relative overflow-hidden">
                          {folder.cover ? (
                            <img
                              src={getPhotoThumbnailUrl(
                                folder.cover.unit_id || folder.cover.id || 0,
                                "m",
                                folder.cover.cache_key,
                                currentSpace,
                                userSid
                              )}
                              alt={folder.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                          ) : (
                            <div className="text-5xl text-cyan-600/60 group-hover:scale-110 transition-transform">
                              📁
                            </div>
                          )}
                          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-slate-900/70 text-white text-[10px] font-bold backdrop-blur-xs">
                            {folder.item_count} รายการ
                          </span>
                        </div>
                        <div className="p-3.5 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-slate-800 truncate group-hover:text-cyan-700 transition-colors">
                              {folder.name}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              คลิกเพื่อเปิดโฟลเดอร์นี้ →
                            </div>
                          </div>
                          <span className="text-slate-300 group-hover:text-cyan-600 text-sm transition-colors">
                            ➔
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Photos inside the selected folder */}
              {selectedFolder ? (
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🖼️</span>
                    <span>ไฟล์สื่อในโฟลเดอร์ "{selectedFolder.name}" ({filteredItems.length})</span>
                  </div>

                  {filteredItems.length === 0 ? (
                    <div className="py-16 text-center space-y-2 p-8 rounded-3xl bg-white border border-slate-200">
                      <div className="text-3xl text-slate-300">🖼️</div>
                      <div className="text-sm font-bold text-slate-700">ยังไม่มีรูปภาพหรือวิดีโอในโฟลเดอร์นี้</div>
                      <div className="text-xs text-slate-400">
                        {searchQuery
                          ? "ไม่พบไฟล์ที่ตรงกับคำค้นหา"
                          : "สามารถอัปโหลดไฟล์ภาพเข้ามาไว้ในโฟลเดอร์นี้ผ่าน Synology Photos หรือ File Station"}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                      {filteredItems.map((item, idx) => (
                        <div
                          key={item.id}
                          onClick={() => setLightboxIndex(idx)}
                          className="group relative bg-slate-900 rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all cursor-pointer aspect-square"
                        >
                          <img
                            src={getPhotoThumbnailUrl(
                              item.id,
                              "m",
                              item.thumbnail?.cache_key,
                              item.space,
                              userSid
                            )}
                            alt={item.filename}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                            loading="lazy"
                          />

                          {item.type === "video" && (
                            <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs">
                              <span>🎥</span>
                              <span>วิดีโอ</span>
                            </div>
                          )}

                          <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="text-xs font-medium text-white truncate drop-shadow-xs">
                              {item.filename}
                            </div>
                            <div className="text-[10px] text-slate-300 flex items-center justify-between mt-0.5">
                              <span>{formatBytes(item.filesize)}</span>
                              <span>{formatPhotoTime(item.time)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : folders.length === 0 ? (
                /* Empty state when at root and no folders found */
                <div className="py-20 text-center space-y-3 p-8 rounded-3xl bg-white border border-slate-200">
                  <div className="w-16 h-16 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-3xl mx-auto">
                    📁
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 font-heading">
                      ไม่พบโฟลเดอร์กิจกรรมใน {currentSpace === "shared" ? "พื้นที่ส่วนกลาง (/photo)" : "พื้นที่ส่วนบุคคล (/home/Photos)"}
                    </h4>
                    <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                      ท่านสามารถสร้างโฟลเดอร์และจัดหมวดหมู่ภาพถ่ายตามโครงการ กิจกรรม หรือปีงบประมาณ เช่น <code className="bg-slate-100 px-1 py-0.5 rounded text-cyan-800">/photo/2569/โครงการฝึกอบรม</code> ผ่าน Synology Photos หรือ File Station เพื่อให้อัลบั้มแยกตามโฟลเดอร์แสดงผลที่นี่
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("all")}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <span>🖼️</span>
                    <span>ดูภาพทั้งหมดแทน (All Photos)</span>
                  </button>
                </div>
              ) : null}
            </div>
          ) : activeTab === "albums" ? (
            /* ─── ALBUMS VIEW ─── */
            <div>
              {albums.length === 0 ? (
                <div className="py-20 text-center space-y-2 p-8 rounded-3xl bg-white border border-slate-200">
                  <div className="text-4xl">📁</div>
                  <div className="text-sm font-bold text-slate-700">ไม่พบอัลบั้มภาพในระบบ</div>
                  <div className="text-xs text-slate-400 max-w-sm mx-auto">
                    ท่านสามารถสร้างอัลบั้มและจัดกลุ่มรูปภาพกิจกรรมได้โดยตรงผ่านแอปพลิเคชัน Synology Photos บน DSM
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {albums.map((album) => (
                    <div
                      key={album.id}
                      onClick={() => {
                        setSelectedAlbumId(album.id);
                        setActiveTab("all");
                      }}
                      className="group bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all overflow-hidden cursor-pointer flex flex-col"
                    >
                      <div className="h-40 bg-slate-100 flex items-center justify-center relative overflow-hidden">
                        {album.cover ? (
                          <img
                            src={getPhotoThumbnailUrl(album.cover.id, "m", album.cover.cache_key, currentSpace, userSid)}
                            alt={album.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-5xl text-slate-300">📁</span>
                        )}
                        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold backdrop-blur-xs">
                          {album.item_count} รายการ
                        </span>
                      </div>
                      <div className="p-3.5">
                        <div className="font-bold text-sm text-slate-800 truncate group-hover:text-cyan-700 transition-colors">
                          {album.name}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          คลิกเพื่อดูรูปภาพในอัลบั้มนี้ →
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ─── PHOTOS & VIDEOS MASONRY / GRID VIEW ─── */
            <div>
              {filteredItems.length === 0 ? (
                <div className="py-20 text-center space-y-2 p-8 rounded-3xl bg-white border border-slate-200">
                  <div className="text-4xl">📸</div>
                  <div className="text-sm font-bold text-slate-700">ไม่พบรูปภาพหรือวิดีโอในหมวดหมู่นี้</div>
                  <div className="text-xs text-slate-400 max-w-sm mx-auto">
                    {searchQuery
                      ? "ไม่พบไฟล์ที่ตรงกับคำค้นหา กรุณาลองค้นหาด้วยคำอื่น"
                      : "ยังไม่มีไฟล์ภาพในโฟลเดอร์นี้ หรือบัญชียังไม่ได้รับสิทธิ์เข้าถึงใน Synology Photos"}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                  {filteredItems.map((item, idx) => (
                    <div
                      key={item.id}
                      onClick={() => setLightboxIndex(idx)}
                      className="group relative bg-slate-900 rounded-2xl overflow-hidden shadow-xs hover:shadow-xl transition-all cursor-pointer aspect-square"
                    >
                      <img
                        src={getPhotoThumbnailUrl(
                          item.id,
                          "m",
                          item.thumbnail?.cache_key,
                          currentSpace,
                          userSid
                        )}
                        alt={item.filename}
                        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                        loading="lazy"
                      />

                      {/* Video Indicator */}
                      {item.type === "video" && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 text-white text-[10px] font-bold backdrop-blur-xs flex items-center gap-1">
                          <span>▶</span>
                          <span>วิดีโอ</span>
                        </div>
                      )}

                      {/* Hover Info Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end text-white">
                        <div className="text-xs font-bold truncate leading-tight">{item.filename}</div>
                        <div className="text-[10px] text-slate-300 mt-0.5 flex items-center justify-between">
                          <span>{formatPhotoTime(item.time).split(" ")[0]}</span>
                          <span>{formatBytes(item.filesize)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── LIGHTBOX PREVIEW MODAL ─── */}
      {activeLightboxItem && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between animate-fadeIn">
          {/* Top Bar */}
          <div className="p-4 px-6 flex items-center justify-between text-white border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3 truncate">
              <span className="text-xl">{activeLightboxItem.type === "video" ? "🎥" : "🖼️"}</span>
              <div className="truncate">
                <div className="font-bold text-sm truncate">{activeLightboxItem.filename}</div>
                <div className="text-[11px] text-slate-400">
                  {formatPhotoTime(activeLightboxItem.time)} · {formatBytes(activeLightboxItem.filesize)}
                  {activeLightboxItem.additional?.resolution && (
                    <span> · {activeLightboxItem.additional.resolution.width}x{activeLightboxItem.additional.resolution.height}px</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <a
                href={`/api/nas/photos/download?id=${activeLightboxItem.id}&filename=${encodeURIComponent(
                  activeLightboxItem.filename
                )}&space=${currentSpace}&sid=${userSid}`}
                download
                className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all flex items-center gap-1.5"
                title="ดาวน์โหลดไฟล์ต้นฉบับ"
              >
                <span>⬇️</span>
                <span>ดาวน์โหลดต้นฉบับ</span>
              </a>

              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-bold transition-all cursor-pointer"
                title="ปิดหน้าต่าง (Esc)"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Center Preview Content with Next/Prev Controls */}
          <div className="relative flex-1 flex items-center justify-center p-4 overflow-hidden select-none">
            {/* Prev Button */}
            <button
              type="button"
              onClick={handlePrevLightbox}
              className="absolute left-4 z-10 w-11 h-11 rounded-full bg-white/20 hover:bg-white/30 text-white text-xl flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
              title="ก่อนหน้า (ลูกศรซ้าย)"
            >
              ‹
            </button>

            {/* Media Content */}
            <div className="max-w-5xl max-h-[75vh] flex items-center justify-center">
              <img
                src={getPhotoThumbnailUrl(
                  activeLightboxItem.id,
                  "xl",
                  activeLightboxItem.thumbnail?.cache_key,
                  currentSpace,
                  userSid
                )}
                alt={activeLightboxItem.filename}
                className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl animate-scaleUp"
              />
            </div>

            {/* Next Button */}
            <button
              type="button"
              onClick={handleNextLightbox}
              className="absolute right-4 z-10 w-11 h-11 rounded-full bg-white/20 hover:bg-white/30 text-white text-xl flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
              title="ถัดไป (ลูกศรขวา)"
            >
              ›
            </button>
          </div>

          {/* Bottom Thumbnails Strip */}
          <div className="p-3 bg-black/60 border-t border-white/10 overflow-x-auto flex items-center justify-center gap-2 shrink-0">
            {filteredItems.slice(Math.max(0, (lightboxIndex || 0) - 4), (lightboxIndex || 0) + 5).map((item, idx) => {
              const actualIdx = filteredItems.findIndex((it) => it.id === item.id);
              const isSelected = actualIdx === lightboxIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => setLightboxIndex(actualIdx)}
                  className={`w-12 h-12 rounded-lg overflow-hidden shrink-0 cursor-pointer border-2 transition-all ${
                    isSelected ? "border-cyan-400 scale-105" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img
                    src={getPhotoThumbnailUrl(item.id, "sm", item.thumbnail?.cache_key, currentSpace, userSid)}
                    alt={item.filename}
                    className="w-full h-full object-cover"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── CONNECT NAS DSM MODAL ─── */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scaleUp">
            <div className="p-6 bg-gradient-to-r from-cyan-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📸</span>
                <div>
                  <h3 className="font-bold text-base">เข้าสู่ระบบ Synology Photos</h3>
                  <p className="text-[11px] text-cyan-100">
                    ยืนยันตัวตนด้วยบัญชี DSM ประจำตัวของท่าน ({config.nasUrl})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConnectModal(false)}
                className="text-white/80 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConnectNas} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ชื่อผู้ใช้ (NAS DSM Username)
                </label>
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="เช่น admin หรือ somchai"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  รหัสผ่าน (NAS DSM Password)
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="รหัสผ่านเข้าใช้งาน NAS"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isLoggingIn ? "กำลังเชื่อมต่อ..." : "ยืนยันและเปิดคลังภาพ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
