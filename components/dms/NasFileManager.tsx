"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  SynologyFileItem,
  listNasShares,
  listNasFiles,
  createNasFolder,
  deleteNasFiles,
  getUserNasSid,
  getUserNasAccount,
  setUserNasSid,
  clearUserNasSid,
  getClientSynologyConfig,
  checkNasHealth,
  loginSynology,
  SynologyHealthStatus,
  safeParseJsonResponse,
} from "@/lib/synology";
import { Member } from "@/lib/types";

interface NasFileManagerProps {
  currentUser: Member;
  showToast: (msg: string) => void;
}

export function NasFileManager({ currentUser, showToast }: NasFileManagerProps) {
  const config = getClientSynologyConfig();
  const [health, setHealth] = useState<SynologyHealthStatus | null>(null);

  // User NAS Auth session
  const [userSid, setUserSid] = useState<string | null>(() => getUserNasSid());
  const [userNasAccount, setUserNasAccount] = useState<string | null>(() => getUserNasAccount());
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState(currentUser.name || "admin");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // File explorer state
  // currentPath: "" or "root" means showing shared folders from listNasShares
  const [currentPath, setCurrentPath] = useState<string>("");
  const [shares, setShares] = useState<SynologyFileItem[]>([]);
  const [files, setFiles] = useState<SynologyFileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Modal states
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Preview state
  const [previewFile, setPreviewFile] = useState<SynologyFileItem | null>(null);

  // Hydrate session on client mount
  useEffect(() => {
    const storedSid = getUserNasSid();
    const storedAccount = getUserNasAccount();
    if (storedSid) {
      setUserSid(storedSid);
    }
    if (storedAccount) {
      setUserNasAccount(storedAccount);
    }
  }, []);

  // Check health on mount
  useEffect(() => {
    checkNasHealth(config.nasUrl).then(setHealth).catch(console.error);
  }, [config.nasUrl]);

  // Load shares or files whenever userSid or currentPath changes
  useEffect(() => {
    if (!userSid) {
      setShares([]);
      setFiles([]);
      return;
    }

    if (!currentPath || currentPath === "root" || currentPath === "/") {
      loadShares(userSid);
    } else {
      loadFolderContents(userSid, currentPath);
    }
  }, [userSid, currentPath]);

  // ─── LOAD SHARES (Root level - strictly based on user's DSM permissions) ───
  const loadShares = async (sid: string) => {
    setIsLoading(true);
    setPermissionError(null);
    try {
      const res = await listNasShares(sid, config.nasUrl);
      if (res.success && res.shares) {
        setShares(res.shares);
        setFiles([]);
      } else {
        setShares([]);
        setPermissionError(res.error || "ไม่สามารถดึงรายการแชร์ที่ได้รับสิทธิ์ได้");
        if (res.code === 119) {
          clearUserNasSid();
          setUserSid(null);
        }
      }
    } catch (err: any) {
      setPermissionError(err?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ NAS");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── LOAD FOLDER CONTENTS (Strictly based on user's DSM permissions) ───
  const loadFolderContents = async (sid: string, folderPath: string) => {
    setIsLoading(true);
    setPermissionError(null);
    try {
      const res = await listNasFiles(sid, folderPath, config.nasUrl);
      if (res.success && res.files) {
        setFiles(res.files);
      } else {
        setFiles([]);
        setPermissionError(res.error || "ไม่สามารถอ่านไฟล์ในโฟลเดอร์นี้ได้");
        if (res.code === 119) {
          clearUserNasSid();
          setUserSid(null);
        }
      }
    } catch (err: any) {
      setPermissionError(err?.message || "เกิดข้อผิดพลาดในการดึงข้อมูลไฟล์");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── MANUAL NAS AUTH CONNECT (If logged in via another method) ───
  const handleConnectNasAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword) return;
    setIsLoggingIn(true);
    try {
      const res = await loginSynology(loginUsername.trim(), loginPassword, config.nasUrl);
      if (res.success && res.sid) {
        setUserNasSid(res.sid, res.account || loginUsername.trim());
        setUserSid(res.sid);
        setUserNasAccount(res.account || loginUsername.trim());
        setShowConnectModal(false);
        setLoginPassword("");
        showToast(`🟢 เชื่อมต่อบัญชี NAS "${loginUsername}" สำเร็จ`);
      } else {
        showToast(`❌ การเชื่อมต่อ NAS ล้มเหลว: ${res.error}`);
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
    setCurrentPath("");
    setShares([]);
    setFiles([]);
    showToast("🔒 ยกเลิกการเชื่อมต่อเซสชัน NAS เรียบร้อยแล้ว");
  };

  // ─── NAVIGATION ───
  const handleOpenFolder = (folderPath: string) => {
    setCurrentPath(folderPath);
  };

  const handleNavigateUp = () => {
    if (!currentPath || currentPath === "root" || currentPath === "/") return;
    const parts = currentPath.split("/").filter(Boolean);
    if (parts.length <= 1) {
      // Go back to shared folders root
      setCurrentPath("");
    } else {
      parts.pop();
      setCurrentPath("/" + parts.join("/"));
    }
  };

  const handleNavigateToRoot = () => {
    setCurrentPath("");
  };

  // ─── FILE OPERATIONS ───
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userSid) return;
    if (!currentPath) {
      showToast("⚠️ กรุณาเลือกโฟลเดอร์แชร์ปลายทางก่อนอัปโหลดไฟล์");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder_path", currentPath);
      formData.append("sid", userSid);
      formData.append("url", config.nasUrl);

      const res = await fetch("/api/nas/upload", {
        method: "POST",
        body: formData,
      });
      const data = await safeParseJsonResponse(res);
      if (data.success) {
        showToast(`📤 อัปโหลด "${file.name}" ไปยัง Synology NAS สำเร็จ`);
        loadFolderContents(userSid, currentPath);
      } else {
        showToast(`❌ อัปโหลดไฟล์ล้มเหลว: ${data.error}`);
      }
    } catch (err: any) {
      showToast(`❌ เกิดข้อผิดพลาดในการอัปโหลด: ${err?.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !userSid || !currentPath) return;
    setIsCreatingFolder(true);
    try {
      const res = await createNasFolder(userSid, currentPath, newFolderName.trim(), config.nasUrl);
      if (res.success) {
        showToast(`📁 สร้างโฟลเดอร์ "${newFolderName}" สำเร็จ`);
        setNewFolderName("");
        setShowNewFolderModal(false);
        loadFolderContents(userSid, currentPath);
      } else {
        showToast(`❌ ไม่สามารถสร้างโฟลเดอร์: ${res.error}`);
      }
    } catch (err: any) {
      showToast(`❌ เกิดข้อผิดพลาด: ${err?.message}`);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteItem = async (itemPath: string, itemName: string) => {
    if (!userSid) return;
    const confirmed = window.confirm(
      `คุณแน่ใจหรือไม่ว่าต้องการลบ "${itemName}" ออกจาก Synology NAS?\n(การดำเนินการนี้จะขึ้นอยู่กับสิทธิ์ Delete ของคุณบน NAS)`
    );
    if (!confirmed) return;

    try {
      const res = await deleteNasFiles(userSid, [itemPath], config.nasUrl);
      if (res.success) {
        showToast(`🗑️ ลบ "${itemName}" จาก NAS สำเร็จ`);
        if (currentPath) {
          loadFolderContents(userSid, currentPath);
        } else {
          loadShares(userSid);
        }
      } else {
        showToast(`❌ ไม่สามารถลบได้: ${res.error}`);
      }
    } catch (err: any) {
      showToast(`❌ เกิดข้อผิดพลาด: ${err?.message}`);
    }
  };

  const handleDownload = (filePath: string) => {
    if (!userSid) return;
    const url = `/api/nas/download?sid=${encodeURIComponent(userSid)}&path=${encodeURIComponent(
      filePath
    )}&mode=download&url=${encodeURIComponent(config.nasUrl)}`;
    window.open(url, "_blank");
  };

  const handlePreview = (file: SynologyFileItem) => {
    setPreviewFile(file);
  };

  // Filter items
  const isRoot = !currentPath || currentPath === "root" || currentPath === "/";
  const displayedShares = shares.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const displayedFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* ─── HEADER BANNER ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-2xl shadow-inner shrink-0">
            📁
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold font-heading">
                คลังเอกสารราชการ (Synology File Station)
              </h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
                  health?.online
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    health?.online ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                  }`}
                />
                {health?.online ? "On-Premise LAN พร้อมใช้งาน" : "ตรวจพบปัญหาเครือข่าย"}
              </span>
            </div>
            <p className="text-xs text-indigo-200/80 mt-0.5">
              ระบบจัดเก็บและเข้าถึงไฟล์ราชการตามสิทธิ์บัญชีผู้ใช้และโฟลเดอร์ของ Synology NAS ประจำสำนักงาน พมจ.กำแพงเพชร
            </p>
          </div>
        </div>

        {/* User NAS Session Indicator */}
        <div className="flex items-center gap-2.5 shrink-0">
          {userSid ? (
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="text-left">
                <div className="text-[10px] text-indigo-200">สิทธิ์ DSM เข้าสู่ระบบ:</div>
                <div className="font-bold text-white">
                  {userNasAccount || currentUser.name || "Synology User"}
                </div>
              </div>
              <button
                type="button"
                onClick={handleDisconnectNas}
                title="สลับบัญชีหรือออกจากเซสชัน NAS"
                className="ml-2 px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-[10px] font-bold cursor-pointer"
              >
                สลับบัญชี
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowConnectModal(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
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
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-3xl mx-auto">
            🔐
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 font-heading">
              กรุณายืนยันตัวตนด้วยบัญชี Synology NAS
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              เพื่อความปลอดภัยของข้อมูลราชการ ระบบจะแสดงเฉพาะโฟลเดอร์และไฟล์ที่บัญชีผู้ใช้ Synology ของท่านได้รับอนุญาตตามสิทธิ์ DSM (ACL Permissions) เท่านั้น
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowConnectModal(true)}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            🔑 เข้าสู่ระบบเพื่อเปิดคลังเอกสาร
          </button>
        </div>
      ) : (
        /* ─── MAIN FILE EXPLORER ─── */
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          {/* Top Bar: Navigation, Breadcrumbs & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 overflow-x-auto py-1">
              <button
                type="button"
                onClick={handleNavigateToRoot}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  isRoot
                    ? "bg-indigo-50 text-indigo-700 font-bold border border-indigo-200"
                    : "hover:bg-slate-100 text-slate-600"
                }`}
              >
                <span>🏠</span>
                <span>โฟลเดอร์ที่ได้รับสิทธิ์</span>
              </button>

              {!isRoot && (
                <>
                  <span className="text-slate-400">/</span>
                  <div className="flex items-center gap-1 font-mono text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-indigo-700 font-bold truncate max-w-[280px]">
                    {currentPath}
                  </div>
                </>
              )}
            </div>

            {/* Actions: Search, Upload, New Folder, Refresh */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <input
                  type="text"
                  placeholder="ค้นหาในโฟลเดอร์..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-7 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-40 sm:w-48"
                />
                <span className="absolute left-2 top-2 text-xs text-slate-400">🔍</span>
              </div>

              {!isRoot && (
                <>
                  <button
                    type="button"
                    onClick={handleNavigateUp}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                    title="ย้อนกลับขึ้น 1 ระดับ"
                  >
                    <span>⬆️</span>
                    <span>ขึ้น 1 ระดับ</span>
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleUploadFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <span>{isUploading ? "⏳" : "📤"}</span>
                    <span>{isUploading ? "กำลังอัปโหลด..." : "อัปโหลดไฟล์"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowNewFolderModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>+</span>
                    <span>สร้างโฟลเดอร์</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() =>
                  isRoot ? loadShares(userSid) : loadFolderContents(userSid, currentPath)
                }
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                title="รีเฟรชข้อมูล"
              >
                🔄
              </button>
            </div>
          </div>

          {/* ─── PERMISSION / CONNECTION ALERT BANNER ─── */}
          {permissionError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5 animate-fadeIn">
              <span className="text-base shrink-0">⛔</span>
              <div>
                <strong className="font-bold">การแจ้งเตือนสิทธิ์ Synology DSM:</strong>
                <p className="mt-0.5 text-rose-700">{permissionError}</p>
                <p className="text-[11px] text-rose-500 mt-1">
                  (การเข้าถึงถูกจำกัดตามสิทธิ์ที่ผู้ดูแลระบบกำหนดไว้ใน Synology DSM Control Panel &gt; Shared Folder)
                </p>
              </div>
            </div>
          )}

          {/* ─── LOADING STATE ─── */}
          {isLoading ? (
            <div className="py-20 text-center space-y-2 text-slate-400 text-xs">
              <div className="text-3xl animate-spin">⏳</div>
              <div>กำลังตรวจสอบสิทธิ์และเรียกข้อมูลจาก Synology NAS...</div>
            </div>
          ) : isRoot ? (
            /* ─── ROOT LEVEL: SHARED FOLDERS ACCESSIBLE BY THIS USER ─── */
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                โฟลเดอร์แชร์ที่บัญชี &quot;{userNasAccount}&quot; ได้รับสิทธิ์บน Synology NAS ({shares.length} รายการ):
              </div>

              {displayedShares.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <div className="text-3xl">📭</div>
                  <div className="text-xs font-bold text-slate-700">ไม่พบ Shared Folder ที่ได้รับสิทธิ์</div>
                  <div className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    บัญชีของคุณอาจยังไม่ได้รับสิทธิ์เข้าถึง Shared Folder ใดๆ กรุณาติดต่อผู้ดูแลระบบเพื่อเปิดสิทธิ์ใน DSM Control Panel
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {displayedShares.map((share, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleOpenFolder(share.path)}
                      className="p-4 rounded-2xl border border-slate-200/80 hover:border-indigo-300 bg-white hover:bg-indigo-50/30 transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center text-2xl transition-colors">
                          📁
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                            {share.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            {share.path}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="text-emerald-600 font-bold">✓ อนุญาตเข้าถึง</span>
                        <span className="group-hover:translate-x-1 transition-transform">เปิด ➔</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ─── SUBFOLDER LEVEL: DIRECTORY CONTENTS ─── */
            <div>
              {displayedFiles.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <div className="text-3xl">📂</div>
                  <div className="text-xs font-bold text-slate-700">โฟลเดอร์นี้ยังไม่มีไฟล์หรือโฟลเดอร์ย่อย</div>
                  <div className="text-[11px] text-slate-400">
                    กดปุ่ม &quot;📤 อัปโหลดไฟล์&quot; หรือ &quot;+ สร้างโฟลเดอร์&quot; เพื่อเริ่มต้นจัดเก็บเอกสาร
                  </div>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                      <tr>
                        <th className="py-2.5 px-3">ชื่อไฟล์ / โฟลเดอร์</th>
                        <th className="py-2.5 px-3 text-right">ขนาด</th>
                        <th className="py-2.5 px-3 text-center">เจ้าของ (Owner)</th>
                        <th className="py-2.5 px-3 text-right">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayedFiles.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-medium flex items-center gap-2 text-slate-800">
                            <span className="text-base">{item.isdir ? "📁" : "📄"}</span>
                            {item.isdir ? (
                              <button
                                type="button"
                                onClick={() => handleOpenFolder(item.path)}
                                className="font-bold text-indigo-600 hover:underline cursor-pointer truncate max-w-[280px] text-left"
                              >
                                {item.name}
                              </button>
                            ) : (
                              <span className="truncate max-w-[280px]">{item.name}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-500 font-mono text-[11px]">
                            {item.isdir ? "-" : `${Math.round((item.size || 0) / 1024)} KB`}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-400 text-[11px]">
                            {item.additional?.owner?.user || "-"}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {!item.isdir && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handlePreview(item)}
                                    className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] cursor-pointer"
                                  >
                                    เปิดดู
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownload(item.path)}
                                    className="px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-[10px] cursor-pointer"
                                  >
                                    ดาวน์โหลด
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item.path, item.name)}
                                className="px-2 py-0.5 rounded-md bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[10px] cursor-pointer"
                              >
                                ลบ
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Bottom Security Note */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-600 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span>🛡️</span>
              <span>
                <strong>การควบคุมสิทธิ์ระดับระบบปฏิบัติการ:</strong> สิทธิ์การเข้าถึง อ่าน เขียน และลบไฟล์ ถูกบังคับใช้โดยตรงผ่านระบบ DSM ACL บน Synology NAS
              </span>
            </div>
            <div className="text-[10px] text-slate-500 shrink-0 flex items-center gap-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>โหมดจัดเก็บความปลอดภัยสูง (Protected)</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: CONNECT NAS ACCOUNT ─── */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔐</span>
                <h3 className="font-bold text-slate-800 text-sm font-heading">
                  เข้าสู่ระบบด้วยบัญชี Synology NAS
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConnectModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              กรอกบัญชีผู้ใช้และรหัสผ่าน Synology DSM ของท่าน เพื่อดึงสิทธิ์และโฟลเดอร์ที่ได้รับอนุญาตโดยตรง
            </p>

            <form onSubmit={handleConnectNasAccount} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อผู้ใช้ (NAS Username)
                </label>
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="เช่น sekpol.d หรือ admin"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รหัสผ่าน (NAS Password)
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="รหัสผ่านเข้าใช้งาน NAS"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isLoggingIn ? "⏳ กำลังตรวจสอบ..." : "ยืนยันและดึงสิทธิ์"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CREATE NEW FOLDER ─── */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm font-heading flex items-center gap-2">
                <span>📁</span>
                <span>สร้างโฟลเดอร์ใหม่บน NAS</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowNewFolderModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อโฟลเดอร์ (Folder Name)
                </label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="เช่น รายงานประจำปี 2569"
                />
                <p className="text-[10px] text-slate-400 mt-1 font-mono">
                  เส้นทางปลายทาง: {currentPath}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isCreatingFolder}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isCreatingFolder ? "⏳ กำลังสร้าง..." : "สร้างโฟลเดอร์"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: FILE PREVIEW (Inline PDF & Image Stream) ─── */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-4xl h-[85vh] rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-slate-900 text-white">
              <div className="flex items-center gap-2 truncate">
                <span>📄</span>
                <span className="font-bold text-xs truncate">{previewFile.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  ({Math.round((previewFile.size || 0) / 1024)} KB)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(previewFile.path)}
                  className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                >
                  📥 ดาวน์โหลด
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFile(null)}
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-100 p-2 overflow-hidden flex items-center justify-center">
              {previewFile.name.endsWith(".pdf") ? (
                <iframe
                  src={`/api/nas/download?sid=${encodeURIComponent(userSid || "")}&path=${encodeURIComponent(
                    previewFile.path
                  )}&mode=open&url=${encodeURIComponent(config.nasUrl)}`}
                  className="w-full h-full rounded border-0"
                  title="PDF Preview"
                />
              ) : previewFile.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                <img
                  src={`/api/nas/download?sid=${encodeURIComponent(userSid || "")}&path=${encodeURIComponent(
                    previewFile.path
                  )}&mode=open&url=${encodeURIComponent(config.nasUrl)}`}
                  alt={previewFile.name}
                  className="max-w-full max-h-full object-contain rounded shadow"
                />
              ) : (
                <div className="text-center space-y-3">
                  <div className="text-4xl">📄</div>
                  <div className="text-xs font-bold text-slate-700">
                    ไฟล์ประเภทนี้ไม่รองรับการแสดงตัวอย่างในหน้าเว็บ
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownload(previewFile.path)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md cursor-pointer"
                  >
                    ดาวน์โหลดเพื่อเปิดด้วยโปรแกรมในเครื่อง
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
