"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import QRCode from "qrcode";
import { Member } from "@/lib/types";

interface QRCodeToolPageProps {
  currentUser?: Member;
  showToast: (msg: string) => void;
}

type QRType = "url" | "text" | "wifi" | "phone" | "promptpay";

interface QRHistoryItem {
  id: string;
  type: QRType;
  title: string;
  payload: string;
  dataUrl: string;
  createdAt: string;
}

const COLOR_PRESETS = [
  { name: "ดำคลาสสิก", dark: "#000000", light: "#FFFFFF" },
  { name: "กรมท่าทางการ", dark: "#0F172A", light: "#FFFFFF" },
  { name: "น้ำเงิน พม.", dark: "#1E40AF", light: "#FFFFFF" },
  { name: "เขียวมรกต", dark: "#065F46", light: "#FFFFFF" },
  { name: "แดงเลือดหมู", dark: "#881337", light: "#FFFFFF" },
];

export function QRCodeToolPage({ currentUser, showToast }: QRCodeToolPageProps) {
  const [qrType, setQrType] = useState<QRType>("url");

  // Form Fields
  const [urlInput, setUrlInput] = useState<string>("https://kamphaengphet.m-society.go.th");
  const [textInput, setTextInput] = useState<string>("");
  const [wifiSsid, setWifiSsid] = useState<string>("MSO-Staff-WiFi");
  const [wifiPassword, setWifiPassword] = useState<string>("");
  const [wifiEncryption, setWifiEncryption] = useState<"WPA" | "WEP" | "nopass">("WPA");
  const [phoneInput, setPhoneInput] = useState<string>("055-705-030");
  const [promptPayId, setPromptPayId] = useState<string>("0994000164287");

  // Customization
  const [darkColor, setDarkColor] = useState<string>("#0F172A");
  const [lightColor, setLightColor] = useState<string>("#FFFFFF");
  const [qrSize, setQrSize] = useState<number>(512); // Export size in px
  const [errorCorrection, setErrorCorrection] = useState<"L" | "M" | "Q" | "H">("H");
  const [includeLogo, setIncludeLogo] = useState<boolean>(true);

  // Preview State
  const [generatedDataUrl, setGeneratedDataUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [history, setHistory] = useState<QRHistoryItem[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Construct raw payload based on type
  const rawPayload = useMemo(() => {
    switch (qrType) {
      case "url":
        return urlInput.trim();
      case "text":
        return textInput.trim();
      case "wifi":
        return `WIFI:S:${wifiSsid};T:${wifiEncryption};P:${wifiPassword};;`;
      case "phone":
        return `tel:${phoneInput.replace(/[^0-9+]/g, "")}`;
      case "promptpay":
        return promptPayId.trim();
      default:
        return urlInput.trim();
    }
  }, [qrType, urlInput, textInput, wifiSsid, wifiPassword, wifiEncryption, phoneInput, promptPayId]);

  // Generate QR Code with optional Logo overlay
  useEffect(() => {
    let isCancelled = false;

    async function generate() {
      if (!rawPayload) {
        setGeneratedDataUrl("");
        return;
      }

      setIsGenerating(true);
      try {
        // Create an offscreen canvas
        const canvas = document.createElement("canvas");
        await QRCode.toCanvas(canvas, rawPayload, {
          width: qrSize,
          margin: 2,
          errorCorrectionLevel: errorCorrection,
          color: {
            dark: darkColor,
            light: lightColor,
          },
        });

        if (isCancelled) return;

        // Overlay Logo if checked
        if (includeLogo) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const logoSize = Math.floor(qrSize * 0.22);
            const center = Math.floor((qrSize - logoSize) / 2);

            // Draw white circle background behind logo
            ctx.save();
            ctx.fillStyle = lightColor;
            ctx.beginPath();
            ctx.arc(qrSize / 2, qrSize / 2, logoSize / 2 + 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.lineWidth = 3;
            ctx.strokeStyle = darkColor;
            ctx.stroke();
            ctx.restore();

            // Draw text badge or icon if image not available
            ctx.save();
            ctx.fillStyle = darkColor;
            ctx.font = `bold ${Math.floor(logoSize * 0.36)}px sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("พม.", qrSize / 2, qrSize / 2);
            ctx.restore();
          }
        }

        const dataUrl = canvas.toDataURL("image/png");
        setGeneratedDataUrl(dataUrl);
      } catch (err) {
        console.error("QR Code generation error:", err);
      } finally {
        if (!isCancelled) setIsGenerating(false);
      }
    }

    generate();

    return () => {
      isCancelled = true;
    };
  }, [rawPayload, darkColor, lightColor, qrSize, errorCorrection, includeLogo]);

  // Download Handler
  const handleDownload = () => {
    if (!generatedDataUrl) return;
    const a = document.createElement("a");
    a.href = generatedDataUrl;
    const timestamp = new Date().toISOString().slice(0, 10);
    a.download = `qrcode-smartmso-${qrType}-${timestamp}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Save to session history
    const newItem: QRHistoryItem = {
      id: `qr_${Date.now()}`,
      type: qrType,
      title: rawPayload.slice(0, 36) + (rawPayload.length > 36 ? "..." : ""),
      payload: rawPayload,
      dataUrl: generatedDataUrl,
      createdAt: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
    };
    setHistory((prev) => [newItem, ...prev.slice(0, 7)]);
    showToast("✓ ดาวน์โหลด QR Code ความละเอียดสูงเรียบร้อยแล้ว");
  };

  // Copy Image to Clipboard
  const handleCopyImage = async () => {
    if (!generatedDataUrl) return;
    try {
      const res = await fetch(generatedDataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      showToast("✓ คัดลอกภาพ QR Code ไปยังคลิปบอร์ดแล้ว");
    } catch {
      showToast("⚠️ ไม่สามารถคัดลอกรูปภาพได้ กรุณาใช้ปุ่มดาวน์โหลด");
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── HEADER ─── */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg border border-teal-900/40">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-bold">
              <span>📱</span>
              <span>เครื่องมือสำนักงานอัจฉริยะ</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-heading">
              QR Code (สร้าง QR Code ถาวร)
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              สร้าง QR Code แบบ <strong>Static Barcode ถาวร 100%</strong> ไม่มีวันหมดอายุ ไม่ล็อกรหัส
              เหมาะสำหรับเอกสารราชการ ป้ายประชาสัมพันธ์ งานประชุม และสื่อเผยแพร่ของหน่วยงาน
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center">
              <div className="text-[10px] text-teal-200 font-bold">อายุการใช้งาน</div>
              <div className="text-lg font-extrabold text-white">♾️ ตลอดชีพ</div>
            </div>
            <div className="px-4 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center">
              <div className="text-[10px] text-teal-200 font-bold">ความคมชัดสูงสุด</div>
              <div className="text-lg font-extrabold text-white">4K Print</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MAIN WORKSPACE GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Data Type Tabs */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              1. เลือกประเภทข้อมูล
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setQrType("url")}
                className={`p-2.5 rounded-2xl text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer border ${
                  qrType === "url"
                    ? "bg-teal-700 text-white border-teal-700 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span className="text-lg">🌐</span>
                <span>เว็บไซต์/URL</span>
              </button>
              <button
                type="button"
                onClick={() => setQrType("text")}
                className={`p-2.5 rounded-2xl text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer border ${
                  qrType === "text"
                    ? "bg-teal-700 text-white border-teal-700 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span className="text-lg">📝</span>
                <span>ข้อความ</span>
              </button>
              <button
                type="button"
                onClick={() => setQrType("wifi")}
                className={`p-2.5 rounded-2xl text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer border ${
                  qrType === "wifi"
                    ? "bg-teal-700 text-white border-teal-700 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span className="text-lg">📶</span>
                <span>Wi-Fi</span>
              </button>
              <button
                type="button"
                onClick={() => setQrType("phone")}
                className={`p-2.5 rounded-2xl text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer border ${
                  qrType === "phone"
                    ? "bg-teal-700 text-white border-teal-700 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span className="text-lg">📞</span>
                <span>เบอร์โทร</span>
              </button>
              <button
                type="button"
                onClick={() => setQrType("promptpay")}
                className={`p-2.5 rounded-2xl text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer border ${
                  qrType === "promptpay"
                    ? "bg-teal-700 text-white border-teal-700 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span className="text-lg">💳</span>
                <span>พร้อมเพย์</span>
              </button>
            </div>

            {/* Input Form Fields */}
            <div className="pt-2">
              {qrType === "url" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    ที่อยู่เว็บไซต์ หรือ ลิงก์เอกสาร (URL)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all font-mono"
                  />
                  <p className="text-[11px] text-slate-400">
                    สามารถใส่ลิงก์ Google Form, Google Drive, ไฟล์ใน NAS หรือเว็บหน่วยงาน
                  </p>
                </div>
              )}

              {qrType === "text" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    ข้อความ หรือ ประกาศ
                  </label>
                  <textarea
                    rows={4}
                    placeholder="พิมพ์ข้อความที่ต้องการเข้ารหัส..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
                  />
                </div>
              )}

              {qrType === "wifi" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700">ชื่อเครือข่าย Wi-Fi (SSID)</label>
                    <input
                      type="text"
                      value={wifiSsid}
                      onChange={(e) => setWifiSsid(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">รหัสผ่าน Wi-Fi</label>
                    <input
                      type="text"
                      placeholder="ใส่รหัสผ่าน..."
                      value={wifiPassword}
                      onChange={(e) => setWifiPassword(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">ระบบความปลอดภัย</label>
                    <select
                      value={wifiEncryption}
                      onChange={(e) => setWifiEncryption(e.target.value as "WPA" | "WEP" | "nopass")}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="WPA">WPA / WPA2 (มาตรฐาน)</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">ไม่มีรหัสผ่าน</option>
                    </select>
                  </div>
                </div>
              )}

              {qrType === "phone" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">หมายเลขโทรศัพท์ติดต่อ</label>
                  <input
                    type="tel"
                    placeholder="055-705-030"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="text-[11px] text-slate-400">
                    เมื่อสแกนด้วยสมาร์ตโฟน จะเปิดหน้าโทรศัพท์พร้อมโทรออกได้ทันที
                  </p>
                </div>
              )}

              {qrType === "promptpay" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    เลขประจำตัวผู้เสียภาษี / เบอร์โทรพร้อมเพย์
                  </label>
                  <input
                    type="text"
                    value={promptPayId}
                    onChange={(e) => setPromptPayId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Customization Options */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              2. ปรับแต่งดีไซน์ & สีสัน
            </h3>

            {/* Presets */}
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-2">ชุดสีทางการ:</label>
              <div className="flex flex-wrap items-center gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setDarkColor(preset.dark);
                      setLightColor(preset.light);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-2 transition-all cursor-pointer ${
                      darkColor === preset.dark
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-xs" style={{ backgroundColor: preset.dark }} />
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Size & Logo Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">ขนาดความละเอียดภาพ (Export)</label>
                <select
                  value={qrSize}
                  onChange={(e) => setQrSize(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                >
                  <option value={256}>256 x 256 px (ทั่วไป / เว็บ)</option>
                  <option value={512}>512 x 512 px (เอกสารราชการ A4)</option>
                  <option value={1024}>1024 x 1024 px (โปสเตอร์ / ความคมชัดสูง)</option>
                  <option value={2048}>2048 x 2048 px (ป้ายไวนิลขนาดใหญ่)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">ตราสัญลักษณ์ตรงกลาง</label>
                <label className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeLogo}
                    onChange={(e) => setIncludeLogo(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <span className="text-xs font-bold text-slate-700">ฝังตราสัญลักษณ์ พม. ตรงกลาง</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Realtime Preview & Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col items-center text-center space-y-4 sticky top-6">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              ตัวอย่าง QR Code (Live Preview)
            </h3>

            {/* QR Card Container */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-center min-w-[240px] min-h-[240px] relative shadow-inner">
              {isGenerating ? (
                <div className="text-xs font-bold text-teal-700 animate-pulse flex items-center gap-2">
                  <span>⏳</span>
                  <span>กำลังสร้าง QR Code...</span>
                </div>
              ) : generatedDataUrl ? (
                <img
                  src={generatedDataUrl}
                  alt="Generated QR Code"
                  className="w-56 h-56 object-contain rounded-xl shadow-sm"
                />
              ) : (
                <span className="text-xs text-slate-400">กรุณากรอกข้อมูลเพื่อสร้าง QR</span>
              )}
            </div>

            {/* Download Buttons */}
            <div className="w-full space-y-2 pt-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={!generatedDataUrl}
                className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-teal-700/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>📥</span>
                <span>ดาวน์โหลดภาพ PNG ({qrSize}x{qrSize})</span>
              </button>

              <button
                type="button"
                onClick={handleCopyImage}
                disabled={!generatedDataUrl}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-2xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>📋</span>
                <span>คัดลอกรูปภาพ</span>
              </button>
            </div>

            {/* Information Notice */}
            <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-3 text-left w-full space-y-1">
              <div className="text-[11px] font-extrabold text-teal-800 flex items-center gap-1.5">
                <span>🛡️</span>
                <span>Static QR Code แบบถาวร 100%</span>
              </div>
              <p className="text-[10px] text-teal-700 leading-relaxed">
                ข้อมูลถูกฝังลงใน 2D Data Matrix โดยตรง ไม่ผ่าน Redirect Server ภายนอก จึงไม่มีวันหมดอายุตลอดกาล
              </p>
            </div>
          </div>

          {/* Session History */}
          {history.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <h4 className="text-xs font-extrabold text-slate-700">ประวัติที่สร้างล่าสุดในเซสชัน</h4>
              <div className="space-y-2">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={item.dataUrl} alt="" className="w-8 h-8 rounded shrink-0 bg-white" />
                      <div className="truncate">
                        <div className="font-bold text-slate-800 truncate">{item.title}</div>
                        <div className="text-[10px] text-slate-400">{item.createdAt}</div>
                      </div>
                    </div>
                    <a
                      href={item.dataUrl}
                      download={`qrcode-${item.type}.png`}
                      className="px-2 py-1 bg-white border border-slate-200 hover:bg-teal-50 text-teal-800 rounded-lg text-[10px] font-bold transition-colors shrink-0"
                    >
                      ดาวน์โหลด
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
