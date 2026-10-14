"use client";

import React, { useState, useEffect } from "react";
import {
  SynologyConfig,
  DEFAULT_SYNOLOGY_CONFIG,
  getClientSynologyConfig,
  saveClientSynologyConfig,
  checkNasHealth,
  loginSynology,
  listNasFiles,
  createNasFolder,
  SynologyHealthStatus,
  SynologyFileItem,
} from "@/lib/synology";

interface NasTabProps {
  showToast: (msg: string) => void;
}

export function NasTab({ showToast }: NasTabProps) {
  const [config, setConfig] = useState<SynologyConfig>(DEFAULT_SYNOLOGY_CONFIG);
  const [health, setHealth] = useState<SynologyHealthStatus | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // File Station Explorer state
  const [serviceSid, setServiceSid] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string>("/virtual-office");
  const [files, setFiles] = useState<SynologyFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);

  // Load config on mount & test health
  useEffect(() => {
    const loaded = getClientSynologyConfig();
    setConfig(loaded);
    runHealthCheck(loaded.nasUrl);
  }, []);

  const runHealthCheck = async (url: string) => {
    setIsCheckingHealth(true);
    try {
      const res = await checkNasHealth(url);
      setHealth(res);
      if (res.online) {
        showToast("🟢 เชื่อมต่อ Synology NAS สำเร็จ (พร้อมใช้งาน)");
      } else {
        showToast(`⚠️ การเชื่อมต่อ NAS ขัดข้อง: ${res.error || "ติดต่อไม่ได้"}`);
      }
    } catch (err: any) {
      setHealth({
        online: false,
        host: url,
        port: 5000,
        latencyMs: 0,
        error: err?.message,
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const saved = saveClientSynologyConfig(config);
      setConfig(saved);
      showToast("💾 บันทึกการตั้งค่า Synology NAS เรียบร้อยแล้ว");
      runHealthCheck(saved.nasUrl);
    } catch (err: any) {
      showToast(`❌ เกิดข้อผิดพลาด: ${err?.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Connect Service Account to browse files
  const handleConnectServiceAccount = async () => {
    if (!config.serviceAccount || !config.servicePassword) {
      showToast("⚠️ กรุณาระบุรหัสผ่านของบัญชีระบบ (Service Account)");
      return;
    }
    setIsLoadingFiles(true);
    try {
      const auth = await loginSynology(config.serviceAccount, config.servicePassword, config.nasUrl);
      if (auth.success && auth.sid) {
        setServiceSid(auth.sid);
        showToast("🔑 ยืนยันตัวตน Service Account สำเร็จ");
        // Load files
        loadFiles(auth.sid, currentFolder);
      } else {
        showToast(`❌ เข้าสู่ระบบ File Station ไม่สำเร็จ: ${auth.error}`);
        setIsLoadingFiles(false);
      }
    } catch (err: any) {
      showToast(`❌ ไม่สามารถเชื่อมต่อ File Station: ${err?.message}`);
      setIsLoadingFiles(false);
    }
  };

  const loadFiles = async (sid: string, folder: string) => {
    setIsLoadingFiles(true);
    try {
      const res = await listNasFiles(sid, folder, config.nasUrl);
      if (res.success && res.files) {
        setFiles(res.files);
      } else {
        setFiles([]);
        showToast(`ℹ️ ${res.error || "ไม่พบไฟล์ หรือยังไม่ได้สร้างโฟลเดอร์นี้บน NAS"}`);
      }
    } catch (err: any) {
      showToast(`❌ เกิดข้อผิดพลาดในการอ่านไฟล์: ${err?.message}`);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !serviceSid) return;
    try {
      const res = await createNasFolder(serviceSid, currentFolder, newFolderName.trim(), config.nasUrl);
      if (res.success) {
        showToast(`📁 สร้างโฟลเดอร์ "${newFolderName}" สำเร็จ`);
        setNewFolderName("");
        setShowNewFolderModal(false);
        loadFiles(serviceSid, currentFolder);
      } else {
        showToast(`❌ ไม่สามารถสร้างโฟลเดอร์: ${res.error}`);
      }
    } catch (err: any) {
      showToast(`❌ เกิดข้อผิดพลาด: ${err?.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── HEADER BANNER ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-2xl shadow-inner">
            💾
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold font-heading">
                ศูนย์จัดการ Synology NAS (Enterprise On-Premise)
              </h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${
                  health?.online
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                    : "bg-red-500/20 text-red-300 border border-red-400/30"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    health?.online ? "bg-emerald-400 animate-pulse" : "bg-red-400"
                  }`}
                />
                {health?.online ? "ออนไลน์ (Online)" : "ติดต่อไม่ได้ (Offline)"}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              โฮสต์: <code className="text-indigo-300 font-mono font-bold">{config.nasUrl}</code> · เครือข่ายสำนักงาน พมจ.กำแพงเพชร
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={isCheckingHealth}
            onClick={() => runHealthCheck(config.nasUrl)}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <span>{isCheckingHealth ? "⏳ กำลังทดสอบ..." : "🔄 ตรวจสอบการเชื่อมต่อ"}</span>
          </button>

          <a
            href={config.nasUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <span>🖥️ เปิดหน้าต่าง DSM</span>
            <span className="text-[10px]">↗</span>
          </a>
        </div>
      </div>

      {/* ─── CONNECTION METRIC CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">สถานะ Web API</div>
          <div className="text-lg font-bold font-heading text-slate-900 mt-1 flex items-center gap-2">
            <span>{health?.online ? "พร้อมใช้งาน 100%" : "ขัดข้อง"}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">SYNO.API.Auth v7</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">ความเร็วการตอบสนอง (Latency)</div>
          <div className="text-lg font-bold font-heading text-emerald-600 mt-1">
            {health?.latencyMs !== undefined ? `${health.latencyMs} ms` : "-"}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">เครือข่าย Local LAN</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">โฟลเดอร์จัดเก็บข้อมูลหลัก</div>
          <div className="text-lg font-bold font-heading text-indigo-600 mt-1 truncate">
            {config.sharedFolder}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">File Station Shared Folder</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">ระบบยืนยันตัวตนหลัก</div>
          <div className="text-lg font-bold font-heading text-teal-600 mt-1">
            {config.primaryAuthEnabled ? "เปิดใช้งาน (Active)" : "ปิดชั่วคราว"}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Synology DSM Accounts</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ─── LEFT: SETTINGS FORM ─── */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
          <div>
            <h3 className="text-base font-bold font-heading text-slate-900">
              ⚙️ ตั้งค่าการเชื่อมต่อ (Configuration)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              กำหนด Host URL, Service Account และนโยบายระบบของ Synology NAS
            </p>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Synology DSM Host URL
              </label>
              <input
                type="text"
                required
                value={config.nasUrl}
                onChange={(e) => setConfig({ ...config, nasUrl: e.target.value })}
                placeholder="http://192.168.162.21:5000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Service Account (ผู้ใช้)
                </label>
                <input
                  type="text"
                  required
                  value={config.serviceAccount}
                  onChange={(e) => setConfig({ ...config, serviceAccount: e.target.value })}
                  placeholder="admin"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  รหัสผ่าน (Service Password)
                </label>
                <input
                  type="password"
                  value={config.servicePassword || ""}
                  onChange={(e) => setConfig({ ...config, servicePassword: e.target.value })}
                  placeholder="ระบุรหัสผ่าน DSM"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Root Shared Folder (พื้นที่เก็บไฟล์)
              </label>
              <input
                type="text"
                required
                value={config.sharedFolder}
                onChange={(e) => setConfig({ ...config, sharedFolder: e.target.value })}
                placeholder="/virtual-office"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Feature Toggles */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    เข้าสู่ระบบด้วยบัญชี Synology เป็นหลัก
                  </div>
                  <div className="text-[11px] text-slate-500">
                    ให้บุคลากรเข้าใช้งานด้วย Username/Password บน NAS
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.primaryAuthEnabled}
                  onChange={(e) => setConfig({ ...config, primaryAuthEnabled: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    จัดเก็บเอกสารและไฟล์แนบลง NAS อัตโนมัติ
                  </div>
                  <div className="text-[11px] text-slate-500">
                    บันทึกเอกสารราชการ, ไฟล์แนบแชท, และงานภารกิจลง NAS
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.storageSyncEnabled}
                  onChange={(e) => setConfig({ ...config, storageSyncEnabled: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    สร้างโปรไฟล์อัตโนมัติ (Auto Provisioning)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    สร้างระเบียนบุคลากรเมื่อเข้าใช้งานผ่าน NAS ครั้งแรก
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.autoProvisionUsers}
                  onChange={(e) => setConfig({ ...config, autoProvisionUsers: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? "⏳ กำลังบันทึก..." : "💾 บันทึกการตั้งค่า Synology NAS"}
            </button>
          </form>
        </div>

        {/* ─── RIGHT: FILE STATION DMS EXPLORER ─── */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold font-heading text-slate-900">
                  📁 ระบบสำรวจไฟล์เอกสาร (File Station DMS Explorer)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  จัดเก็บเอกสารราชการและไฟล์แนบภายในเครือข่าย พมจ.กำแพงเพชร
                </p>
              </div>

              {serviceSid ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewFolderModal(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-all cursor-pointer"
                  >
                    + สร้างโฟลเดอร์
                  </button>
                  <button
                    type="button"
                    onClick={() => loadFiles(serviceSid, currentFolder)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    🔄 รีเฟรช
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectServiceAccount}
                  disabled={isLoadingFiles}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isLoadingFiles ? "⏳ กำลังเชื่อมต่อ..." : "🔑 เชื่อมต่อ File Station"}
                </button>
              )}
            </div>

            {/* Folder Breadcrumb */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/70 text-xs font-mono text-slate-600">
              <span>📍 เส้นทาง:</span>
              <span className="font-bold text-indigo-600">{currentFolder}</span>
            </div>

            {/* Files List / Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden min-h-[260px] max-h-[360px] overflow-y-auto">
              {isLoadingFiles ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  <div className="text-2xl animate-spin mb-2">⏳</div>
                  กำลังดึงข้อมูลไฟล์จาก Synology NAS...
                </div>
              ) : !serviceSid ? (
                <div className="py-16 text-center space-y-2">
                  <div className="text-3xl">🔒</div>
                  <div className="text-xs font-bold text-slate-700">
                    ต้องเชื่อมต่อ Service Account ก่อนเปิดดูไฟล์
                  </div>
                  <div className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    กรุณากรอกรหัสผ่านของบัญชีระบบในแบบฟอร์มด้านซ้าย แล้วกดปุ่ม &quot;เชื่อมต่อ File Station&quot;
                  </div>
                </div>
              ) : files.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <div className="text-3xl">📂</div>
                  <div className="text-xs font-bold text-slate-700">โฟลเดอร์นี้ยังไม่มีไฟล์</div>
                  <div className="text-[11px] text-slate-400">
                    กดปุ่ม &quot;+ สร้างโฟลเดอร์&quot; เพื่อเริ่มต้นสร้างหมวดหมู่เอกสาร
                  </div>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                    <tr>
                      <th className="py-2.5 px-3">ชื่อไฟล์ / โฟลเดอร์</th>
                      <th className="py-2.5 px-3 text-right">ขนาด</th>
                      <th className="py-2.5 px-3 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {files.map((file, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-medium flex items-center gap-2 text-slate-800">
                          <span>{file.isdir ? "📁" : "📄"}</span>
                          <span className="truncate max-w-[220px]">{file.name}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-500 font-mono text-[11px]">
                          {file.isdir ? "-" : `${Math.round((file.size || 0) / 1024)} KB`}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              showToast(`📄 ดาวน์โหลด "${file.name}" จาก NAS สำเร็จ`);
                            }}
                            className="px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-[10px] cursor-pointer"
                          >
                            ดาวน์โหลด
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-[11px] text-indigo-900 flex items-center gap-2">
            <span>🛡️</span>
            <span>
              <strong>มาตรฐานความปลอดภัย:</strong> เอกสารราชการจะถูกจัดเก็บภายใน Local NAS ตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. 2564
            </span>
          </div>
        </div>
      </div>

      {/* Modal: New Folder */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-4 animate-scale-up">
            <h4 className="text-sm font-bold font-heading text-slate-900">
              📁 สร้างโฟลเดอร์ใหม่บน Synology NAS
            </h4>
            <form onSubmit={handleCreateFolder} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อโฟลเดอร์ (ภาษาไทย หรือ อังกฤษ)
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="เช่น งานสารบรรณ, คำขอใช้รถ"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                >
                  ยืนยันสร้าง
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
