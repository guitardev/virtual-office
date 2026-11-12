"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import QRCode from "qrcode";
import { Member } from "@/lib/types";
import {
  generatePromptPayPayload,
  generateVCardPayload,
  generateLinePayload,
  generateMailtoPayload,
  VCardContactInfo,
} from "@/lib/qrcode-utils";

interface QRCodeToolPageProps {
  currentUser?: Member;
  showToast: (msg: string) => void;
}

type QRType =
  | "url"
  | "vcard"
  | "line"
  | "promptpay"
  | "wifi"
  | "phone"
  | "mailto"
  | "text";

type LogoType = "mso" | "garuda" | "text" | "custom" | "none";

type FrameStyle = "none" | "bottom_banner";

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
  { name: "ชมพูบานเย็น พม.", dark: "#BE185D", light: "#FFFFFF" },
  { name: "เขียวมรกต", dark: "#065F46", light: "#FFFFFF" },
  { name: "แดงเลือดหมู", dark: "#881337", light: "#FFFFFF" },
];

const FRAME_PRESETS = [
  "สแกนเพื่ออ่านเอกสาร",
  "สแกนเพื่อลงทะเบียน",
  "สแกนแบบประเมิน",
  "สแกนดาวน์โหลดไฟล์",
  "SCAN ME",
];

const MISSION_DIVISIONS = [
  "ฝ่ายบริหารทั่วไป",
  "กลุ่มนโยบายและวิชาการ",
  "กลุ่มการพัฒนาสังคมและสวัสดิการ",
  "ศูนย์บริการคนพิการจังหวัดกำแพงเพชร",
  "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
];

export function QRCodeToolPage({ currentUser, showToast }: QRCodeToolPageProps) {
  const [qrType, setQrType] = useState<QRType>("url");

  // ─── 1. Form Inputs by Type ───
  // URL
  const [urlInput, setUrlInput] = useState<string>("https://kamphaengphet.m-society.go.th");

  // Support pre-filling URL when navigated from Short URL tool (/tools/qrcode?url=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      const prefillUrl = params.get("url");
      if (prefillUrl && /^https?:\/\//i.test(prefillUrl.trim())) {
        setQrType("url");
        setUrlInput(prefillUrl.trim());
      }
    } catch {}
  }, []);

  // vCard
  const [vCardData, setVCardData] = useState<VCardContactInfo>({
    fullName: currentUser?.name || "ข้าราชการ สนง.พมจ.กำแพงเพชร",
    position: currentUser?.position || "นักพัฒนาสังคมชำนาญการ",
    division: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
    org: "สนง.พมจ.กำแพงเพชร",
    phone: "055-705-030",
    mobile: currentUser?.phone || "",
    email: currentUser?.email || "kamphaengphet@m-society.go.th",
    url: "https://kamphaengphet.m-society.go.th",
    address: "ศาลากลางจังหวัดกำแพงเพชร ชั้น 1 ต.หนองปลิง อ.เมือง จ.กำแพงเพชร 62000",
  });

  // LINE
  const [lineInput, setLineInput] = useState<string>("@kpp-msoc");

  // PromptPay
  const [promptPayId, setPromptPayId] = useState<string>("0994000164287");
  const [promptPayAmount, setPromptPayAmount] = useState<string>("");

  // Wi-Fi
  const [wifiSsid, setWifiSsid] = useState<string>("MSO-Staff-WiFi");
  const [wifiPassword, setWifiPassword] = useState<string>("");
  const [wifiEncryption, setWifiEncryption] = useState<"WPA" | "WEP" | "nopass">("WPA");

  // Phone
  const [phoneInput, setPhoneInput] = useState<string>("055-705-030");

  // Mailto
  const [mailToEmail, setMailToEmail] = useState<string>("kamphaengphet@m-society.go.th");
  const [mailToSubject, setMailToSubject] = useState<string>("ติดต่อสอบถามข้อมูลราชการ พมจ.กำแพงเพชร");
  const [mailToBody, setMailToBody] = useState<string>("");

  // Text
  const [textInput, setTextInput] = useState<string>("");

  // ─── 2. Design & Customization ───
  const [darkColor, setDarkColor] = useState<string>("#0F172A");
  const [lightColor, setLightColor] = useState<string>("#FFFFFF");
  const [qrSize, setQrSize] = useState<number>(512); // Export size in px
  const [errorCorrection, setErrorCorrection] = useState<"L" | "M" | "Q" | "H">("H");

  // Logo Options
  const [logoType, setLogoType] = useState<LogoType>("mso");
  const [customLogoUrl, setCustomLogoUrl] = useState<string>("");

  // Frame Options
  const [frameStyle, setFrameStyle] = useState<FrameStyle>("none");
  const [frameText, setFrameText] = useState<string>("สแกนเพื่ออ่านเอกสาร");

  // ─── 3. A4 Signage Template State ───
  const [showA4Modal, setShowA4Modal] = useState<boolean>(false);
  const [signageTitle, setSignageTitle] = useState<string>("เอกสารประกอบการประชุมและการสัมมนา");
  const [signageSubtitle, setSignageSubtitle] = useState<string>(
    "โปรดสแกน QR Code ด้วยกล้องสมาร์ตโฟนหรือแอป LINE เพื่อเข้าสู่ระบบเอกสาร"
  );
  const [signageDivision, setSignageDivision] = useState<string>(
    "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"
  );
  const [signageContact, setSignageContact] = useState<string>("โทรศัพท์: 055-705-030 | โทรสาร: 055-705-031");

  // ─── 4. Generated State ───
  const [generatedDataUrl, setGeneratedDataUrl] = useState<string>("");
  const [pureQrDataUrl, setPureQrDataUrl] = useState<string>(""); // un-framed for A4 signage
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [history, setHistory] = useState<QRHistoryItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Construct raw payload based on type
  const rawPayload = useMemo(() => {
    switch (qrType) {
      case "url":
        return urlInput.trim();
      case "vcard":
        return generateVCardPayload(vCardData);
      case "line":
        return generateLinePayload(lineInput);
      case "promptpay":
        return generatePromptPayPayload(
          promptPayId,
          promptPayAmount ? parseFloat(promptPayAmount) : undefined
        );
      case "wifi":
        return `WIFI:S:${wifiSsid};T:${wifiEncryption};P:${wifiPassword};;`;
      case "phone":
        return `tel:${phoneInput.replace(/[^0-9+]/g, "")}`;
      case "mailto":
        return generateMailtoPayload(mailToEmail, mailToSubject, mailToBody);
      case "text":
        return textInput.trim();
      default:
        return urlInput.trim();
    }
  }, [
    qrType,
    urlInput,
    vCardData,
    lineInput,
    promptPayId,
    promptPayAmount,
    wifiSsid,
    wifiPassword,
    wifiEncryption,
    phoneInput,
    mailToEmail,
    mailToSubject,
    mailToBody,
    textInput,
  ]);

  // Handle custom logo file upload
  const handleCustomLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("⚠️ กรุณาเลือกไฟล์ภาพขนาดไม่เกิน 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setCustomLogoUrl(result);
      setLogoType("custom");
      showToast("✓ อัปโหลดโลโก้เรียบร้อยแล้ว");
    };
    reader.readAsDataURL(file);
  };

  // Helper to load image asynchronously
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = src;
    });
  };

  // Generate QR Code with optional Logo overlay and optional Frame
  useEffect(() => {
    let isCancelled = false;

    async function generate() {
      if (!rawPayload) {
        setGeneratedDataUrl("");
        setPureQrDataUrl("");
        return;
      }

      setIsGenerating(true);
      try {
        // 1. Generate base QR canvas
        const qrCanvas = document.createElement("canvas");
        await QRCode.toCanvas(qrCanvas, rawPayload, {
          width: qrSize,
          margin: 2,
          errorCorrectionLevel: errorCorrection,
          color: {
            dark: darkColor,
            light: lightColor,
          },
        });

        if (isCancelled) return;

        // 2. Overlay center emblem / logo
        const qrCtx = qrCanvas.getContext("2d");
        if (qrCtx && logoType !== "none") {
          const logoSize = Math.floor(qrSize * 0.22);
          const center = Math.floor((qrSize - logoSize) / 2);

          // Draw white circular badge background behind logo
          qrCtx.save();
          qrCtx.fillStyle = lightColor;
          qrCtx.beginPath();
          qrCtx.arc(qrSize / 2, qrSize / 2, logoSize / 2 + 6, 0, Math.PI * 2);
          qrCtx.fill();
          qrCtx.lineWidth = 3;
          qrCtx.strokeStyle = darkColor;
          qrCtx.stroke();
          qrCtx.restore();

          if (logoType === "mso") {
            try {
              const msoImg = await loadImage("/images/mso-logo.png");
              if (!isCancelled) {
                qrCtx.save();
                qrCtx.beginPath();
                qrCtx.arc(qrSize / 2, qrSize / 2, logoSize / 2, 0, Math.PI * 2);
                qrCtx.clip();
                qrCtx.drawImage(msoImg, center, center, logoSize, logoSize);
                qrCtx.restore();
              }
            } catch (e) {
              console.warn("Failed to load MSO emblem, fallback to text", e);
              drawTextLogo(qrCtx, qrSize, logoSize, darkColor);
            }
          } else if (logoType === "garuda") {
            try {
              const garudaImg = await loadImage("/images/garuda.svg");
              if (!isCancelled) {
                qrCtx.save();
                qrCtx.beginPath();
                qrCtx.arc(qrSize / 2, qrSize / 2, logoSize / 2, 0, Math.PI * 2);
                qrCtx.clip();
                qrCtx.drawImage(garudaImg, center, center, logoSize, logoSize);
                qrCtx.restore();
              }
            } catch (e) {
              console.warn("Failed to load Garuda emblem, fallback to text", e);
              drawTextLogo(qrCtx, qrSize, logoSize, darkColor);
            }
          } else if (logoType === "custom" && customLogoUrl) {
            try {
              const customImg = await loadImage(customLogoUrl);
              if (!isCancelled) {
                qrCtx.save();
                qrCtx.beginPath();
                qrCtx.arc(qrSize / 2, qrSize / 2, logoSize / 2, 0, Math.PI * 2);
                qrCtx.clip();
                qrCtx.drawImage(customImg, center, center, logoSize, logoSize);
                qrCtx.restore();
              }
            } catch (e) {
              console.warn("Failed to load custom logo", e);
              drawTextLogo(qrCtx, qrSize, logoSize, darkColor);
            }
          } else if (logoType === "text") {
            drawTextLogo(qrCtx, qrSize, logoSize, darkColor);
          }
        }

        const pureUrl = qrCanvas.toDataURL("image/png");
        setPureQrDataUrl(pureUrl);

        // 3. Render Frame if selected
        if (frameStyle === "bottom_banner") {
          const padding = Math.floor(qrSize * 0.08);
          const bannerHeight = Math.floor(qrSize * 0.16);
          const totalWidth = qrSize + padding * 2;
          const totalHeight = qrSize + padding * 2 + bannerHeight;

          const framedCanvas = document.createElement("canvas");
          framedCanvas.width = totalWidth;
          framedCanvas.height = totalHeight;
          const fCtx = framedCanvas.getContext("2d");

          if (fCtx) {
            // Fill card background
            fCtx.fillStyle = lightColor;
            fCtx.fillRect(0, 0, totalWidth, totalHeight);

            // Draw border around card
            fCtx.strokeStyle = darkColor;
            fCtx.lineWidth = 3;
            fCtx.strokeRect(4, 4, totalWidth - 8, totalHeight - 8);

            // Draw QR code in upper section
            fCtx.drawImage(qrCanvas, padding, padding);

            // Draw Bottom Banner Box
            const bannerY = qrSize + padding + 6;
            const bannerW = qrSize;
            const bannerH = bannerHeight - 12;

            fCtx.fillStyle = darkColor;
            fCtx.beginPath();
            const radius = 12;
            fCtx.roundRect(padding, bannerY, bannerW, bannerH, radius);
            fCtx.fill();

            // Draw Banner Text
            fCtx.fillStyle = lightColor;
            fCtx.font = `bold ${Math.floor(bannerH * 0.44)}px "Sarabun", sans-serif`;
            fCtx.textAlign = "center";
            fCtx.textBaseline = "middle";
            fCtx.fillText(`📷 ${frameText}`, totalWidth / 2, bannerY + bannerH / 2);
          }

          setGeneratedDataUrl(framedCanvas.toDataURL("image/png"));
        } else {
          setGeneratedDataUrl(pureUrl);
        }
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
  }, [
    rawPayload,
    darkColor,
    lightColor,
    qrSize,
    errorCorrection,
    logoType,
    customLogoUrl,
    frameStyle,
    frameText,
  ]);

  function drawTextLogo(ctx: CanvasRenderingContext2D, size: number, logoSize: number, color: string) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.floor(logoSize * 0.36)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("พม.", size / 2, size / 2);
    ctx.restore();
  }

  // ─── Export Handlers ───
  // 1. Download PNG
  const handleDownloadPng = () => {
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
    showToast("✓ ดาวน์โหลด QR Code (PNG) เรียบร้อยแล้ว");
  };

  // 2. Download SVG (Vector)
  const handleDownloadSvg = async () => {
    if (!rawPayload) return;
    try {
      const svgString = await QRCode.toString(rawPayload, {
        type: "svg",
        width: qrSize,
        margin: 2,
        errorCorrectionLevel: errorCorrection,
        color: {
          dark: darkColor,
          light: lightColor,
        },
      });

      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const timestamp = new Date().toISOString().slice(0, 10);
      a.download = `qrcode-smartmso-${qrType}-${timestamp}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("✓ ดาวน์โหลดไฟล์เวกเตอร์ SVG สำหรับป้ายไวนิลสำเร็จแล้ว");
    } catch (err) {
      console.error("SVG generation error:", err);
      showToast("⚠️ ไม่สามารถสร้างไฟล์ SVG ได้");
    }
  };

  // 3. Copy Image to Clipboard
  const handleCopyImage = async () => {
    if (!generatedDataUrl) return;
    try {
      const res = await fetch(generatedDataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      showToast("✓ คัดลอกภาพ QR Code ไปยังคลิปบอร์ดแล้ว");
    } catch {
      showToast("⚠️ ไม่สามารถคัดลอกรูปภาพได้ กรุณาใช้ปุ่มดาวน์โหลด");
    }
  };

  // 4. Print A4 Signage
  const handlePrintSignage = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* ─── HEADER ─── */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg border border-teal-900/40">
        <div className="absolute right-0 top-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-bold">
              <span>🏛️ สนง.พมจ.กำแพงเพชร</span>
              <span>·</span>
              <span>เครื่องมือสำนักงานอัจฉริยะ</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-heading">
              โปรแกรมสร้าง QR Code & ป้ายประชาสัมพันธ์ A4 ทางการ
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              สร้าง QR Code แบบ <strong>Static Barcode ถาวร 100%</strong> ไม่มีวันหมดอายุ พร้อมตราสัญลักษณ์ พม. ทางการ
              รองรับป้ายประชาสัมพันธ์ขนาด A4 สั่งพิมพ์ได้ทันที และส่งออกไฟล์เวกเตอร์ SVG สำหรับงานพิมพ์ป้ายไวนิลขนาดใหญ่
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowA4Modal(true)}
              className="px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-2xl border border-amber-400/40 text-xs flex items-center gap-2 shadow-lg shadow-amber-900/20 transition-all cursor-pointer hover:scale-102"
            >
              <span className="text-lg">🖨️</span>
              <div className="text-left">
                <div className="text-[10px] text-amber-100">โหมดพิเศษ</div>
                <div className="font-extrabold">ป้ายประชาสัมพันธ์ A4</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ─── MAIN WORKSPACE GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Data Type Tabs */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                1. เลือกประเภทข้อมูลที่ต้องการสร้าง
              </h3>
              <span className="text-[11px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">
                8 รูปแบบ
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                <span>เว็บไซต์ / URL</span>
              </button>

              <button
                type="button"
                onClick={() => setQrType("vcard")}
                className={`p-2.5 rounded-2xl text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer border ${
                  qrType === "vcard"
                    ? "bg-teal-700 text-white border-teal-700 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span className="text-lg">🪪</span>
                <span>นามบัตรข้าราชการ</span>
              </button>

              <button
                type="button"
                onClick={() => setQrType("line")}
                className={`p-2.5 rounded-2xl text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer border ${
                  qrType === "line"
                    ? "bg-teal-700 text-white border-teal-700 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span className="text-lg">💬</span>
                <span>LINE Official / ID</span>
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
                <span>พร้อมเพย์ EMVCo</span>
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
                <span>Wi-Fi สำนักงาน</span>
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
                <span>เบอร์โทรศัพท์</span>
              </button>

              <button
                type="button"
                onClick={() => setQrType("mailto")}
                className={`p-2.5 rounded-2xl text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer border ${
                  qrType === "mailto"
                    ? "bg-teal-700 text-white border-teal-700 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span className="text-lg">📧</span>
                <span>อีเมลราชการ</span>
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
                <span>ข้อความทั่วไป</span>
              </button>
            </div>

            {/* Input Form Fields */}
            <div className="pt-2">
              {/* 1. URL */}
              {qrType === "url" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    ที่อยู่เว็บไซต์ หรือ ลิงก์เอกสารราชการ (URL)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all font-mono"
                  />
                  <p className="text-[11px] text-slate-400">
                    รองรับ Google Drive, Google Forms แบบสอบถาม, ไฟล์ใน Synology NAS หรือเว็บไซต์ พมจ.
                  </p>
                </div>
              )}

              {/* 2. vCard */}
              {qrType === "vcard" && (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
                    💡 <strong>นามบัตรข้าราชการดิจิทัล:</strong> เมื่อสแกนด้วยสมาร์ตโฟน จะเปิดหน้าสมุดโทรศัพท์พร้อมปุ่ม &ldquo;บันทึกผู้ติดต่อ&rdquo; ได้ทันที
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">ชื่อ-นามสกุล *</label>
                      <input
                        type="text"
                        value={vCardData.fullName}
                        onChange={(e) => setVCardData({ ...vCardData, fullName: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">ตำแหน่ง</label>
                      <input
                        type="text"
                        value={vCardData.position}
                        onChange={(e) => setVCardData({ ...vCardData, position: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">ฝ่าย / กลุ่มงาน</label>
                      <select
                        value={vCardData.division}
                        onChange={(e) => setVCardData({ ...vCardData, division: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      >
                        {MISSION_DIVISIONS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">เบอร์โทรศัพท์ สนง.</label>
                      <input
                        type="text"
                        value={vCardData.phone}
                        onChange={(e) => setVCardData({ ...vCardData, phone: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">เบอร์โทรศัพท์มือถือ</label>
                      <input
                        type="text"
                        placeholder="08x-xxx-xxxx"
                        value={vCardData.mobile}
                        onChange={(e) => setVCardData({ ...vCardData, mobile: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">อีเมล</label>
                      <input
                        type="email"
                        value={vCardData.email}
                        onChange={(e) => setVCardData({ ...vCardData, email: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3. LINE */}
              {qrType === "line" && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">
                    LINE ID, LINE Official Account หรือ ลิงก์กลุ่ม LINE
                  </label>
                  <input
                    type="text"
                    placeholder="@kpp-msoc หรือ https://line.me/ti/p/..."
                    value={lineInput}
                    onChange={(e) => setLineInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400">
                    ใส่ได้ทั้ง LINE ID (เช่น <code>@kpp-msoc</code>), LINE ส่วนตัว, หรือลิงก์ LINE OpenChat ของกลุ่มภารกิจ
                  </p>
                </div>
              )}

              {/* 4. PromptPay EMVCo */}
              {qrType === "promptpay" && (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900">
                    💳 <strong>มาตรฐาน EMVCo สากล (ธปท.):</strong> สามารถสแกนชำระผ่านแอปพลิเคชันของทุกธนาคารในประเทศไทยได้จริง 100%
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        เลขประจำตัวผู้เสียภาษี / เบอร์พร้อมเพย์ *
                      </label>
                      <input
                        type="text"
                        value={promptPayId}
                        onChange={(e) => setPromptPayId(e.target.value)}
                        placeholder="0-9940-00164-28-7 หรือ 08xxxxxxxx"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        ระบุจำนวนเงิน (บาท) (ไม่บังคับ)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="เช่น 100.00 หรือเว้นว่างไว้"
                        value={promptPayAmount}
                        onChange={(e) => setPromptPayAmount(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Wi-Fi */}
              {qrType === "wifi" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700">ชื่อเครือข่าย Wi-Fi (SSID)</label>
                    <input
                      type="text"
                      value={wifiSsid}
                      onChange={(e) => setWifiSsid(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">รหัสผ่าน Wi-Fi</label>
                    <input
                      type="text"
                      placeholder="ใส่รหัสผ่าน..."
                      value={wifiPassword}
                      onChange={(e) => setWifiPassword(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">ระบบความปลอดภัย</label>
                    <select
                      value={wifiEncryption}
                      onChange={(e) => setWifiEncryption(e.target.value as "WPA" | "WEP" | "nopass")}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      <option value="WPA">WPA / WPA2 / WPA3 (มาตรฐาน)</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">ไม่มีรหัสผ่าน (Open)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 6. Phone */}
              {qrType === "phone" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">หมายเลขโทรศัพท์ติดต่อราชการ</label>
                  <input
                    type="tel"
                    placeholder="055-705-030"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                  <p className="text-[11px] text-slate-400">
                    เมื่อสแกนด้วยสมาร์ตโฟน จะเปิดหน้าโทรศัพท์พร้อมกดโทรออกได้ทันที
                  </p>
                </div>
              )}

              {/* 7. Mailto */}
              {qrType === "mailto" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">อีเมลปลายทาง</label>
                    <input
                      type="email"
                      value={mailToEmail}
                      onChange={(e) => setMailToEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">หัวข้อเรื่อง (Subject)</label>
                    <input
                      type="text"
                      value={mailToSubject}
                      onChange={(e) => setMailToSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">เนื้อหาข้อความเริ่มต้น (Body)</label>
                    <textarea
                      rows={2}
                      placeholder="ข้อความเริ่มต้นที่ต้องการให้ผู้ส่งพิมพ์..."
                      value={mailToBody}
                      onChange={(e) => setMailToBody(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>
              )}

              {/* 8. Text */}
              {qrType === "text" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">ข้อความ หรือ ประกาศ</label>
                  <textarea
                    rows={4}
                    placeholder="พิมพ์ข้อความที่ต้องการเข้ารหัส..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Customization Options */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              2. ปรับแต่งตราสัญลักษณ์ & รูปลักษณ์
            </h3>

            {/* Logo Selection */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-2">
                🏛️ ตราสัญลักษณ์ตรงกลาง QR Code:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => setLogoType("mso")}
                  className={`p-2.5 rounded-2xl text-xs font-bold border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    logoType === "mso"
                      ? "bg-rose-50 text-rose-800 border-rose-300 shadow-xs ring-2 ring-rose-400"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <img src="/images/mso-logo.png" alt="พม." className="w-7 h-7 object-contain" />
                  <span className="text-[11px] truncate">ตรากระทรวง พม.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLogoType("garuda")}
                  className={`p-2.5 rounded-2xl text-xs font-bold border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    logoType === "garuda"
                      ? "bg-indigo-50 text-indigo-800 border-indigo-300 shadow-xs ring-2 ring-indigo-400"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <img src="/images/garuda.svg" alt="ครุฑ" className="w-7 h-7 object-contain" />
                  <span className="text-[11px] truncate">ตราครุฑราชการ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLogoType("text")}
                  className={`p-2.5 rounded-2xl text-xs font-bold border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    logoType === "text"
                      ? "bg-slate-800 text-white border-slate-800 shadow-xs ring-2 ring-slate-400"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <span className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">
                    พม.
                  </span>
                  <span className="text-[11px] truncate">ตัวอักษร พม.</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-2.5 rounded-2xl text-xs font-bold border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    logoType === "custom"
                      ? "bg-teal-50 text-teal-800 border-teal-300 shadow-xs ring-2 ring-teal-400"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <span className="w-7 h-7 flex items-center justify-center text-lg">📤</span>
                  <span className="text-[11px] truncate">
                    {customLogoUrl ? "เปลี่ยนรูป..." : "อัปโหลดเอง"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setLogoType("none")}
                  className={`p-2.5 rounded-2xl text-xs font-bold border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    logoType === "none"
                      ? "bg-slate-800 text-white border-slate-800 shadow-xs ring-2 ring-slate-400"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <span className="w-7 h-7 flex items-center justify-center text-lg">🚫</span>
                  <span className="text-[11px] truncate">ไม่ใส่โลโก้</span>
                </button>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCustomLogoUpload}
                className="hidden"
              />
            </div>

            {/* Frame Call-to-Action */}
            <div className="pt-3 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 block mb-2">
                🏷️ กรอบข้อความ Call-to-Action:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-500 font-medium">รูปแบบกรอบ:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFrameStyle("none")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        frameStyle === "none"
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      ไม่มีกรอบ
                    </button>
                    <button
                      type="button"
                      onClick={() => setFrameStyle("bottom_banner")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        frameStyle === "bottom_banner"
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}
                    >
                      ป้ายแถบด้านล่าง
                    </button>
                  </div>
                </div>

                {frameStyle === "bottom_banner" && (
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-500 font-medium">ข้อความในป้าย:</span>
                    <input
                      type="text"
                      value={frameText}
                      onChange={(e) => setFrameText(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    />
                    <div className="flex flex-wrap gap-1 mt-1">
                      {FRAME_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setFrameText(preset)}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 cursor-pointer"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Colors */}
            <div className="pt-3 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 block mb-2">ชุดสีทางการ:</label>
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
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-xs"
                      style={{ backgroundColor: preset.dark }}
                    />
                    <span>{preset.name}</span>
                  </button>
                ))}

                {/* Custom Color Pickers */}
                <div className="flex items-center gap-2 ml-auto">
                  <label className="text-[11px] text-slate-500 font-bold flex items-center gap-1 cursor-pointer">
                    <span>สี QR:</span>
                    <input
                      type="color"
                      value={darkColor}
                      onChange={(e) => setDarkColor(e.target.value)}
                      className="w-6 h-6 rounded border border-slate-200 cursor-pointer"
                    />
                  </label>
                  <label className="text-[11px] text-slate-500 font-bold flex items-center gap-1 cursor-pointer">
                    <span>พื้นหลัง:</span>
                    <input
                      type="color"
                      value={lightColor}
                      onChange={(e) => setLightColor(e.target.value)}
                      className="w-6 h-6 rounded border border-slate-200 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Size & Quality */}
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
                  <option value={2048}>2048 x 2048 px (ป้ายไวนิลขนาดใหญ่ / 4K)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">ระดับการกู้คืนข้อผิดพลาด (Error Correction)</label>
                <select
                  value={errorCorrection}
                  onChange={(e) => setErrorCorrection(e.target.value as "L" | "M" | "Q" | "H")}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500"
                >
                  <option value="H">ระดับสูง (Level H - 30% แนะนำเมื่อใส่โลโก้)</option>
                  <option value="Q">ระดับปานกลาง-สูง (Level Q - 25%)</option>
                  <option value="M">ระดับปานกลาง (Level M - 15%)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Realtime Preview & Actions (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col items-center text-center space-y-4 sticky top-6">
            <div className="flex items-center justify-between w-full">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                ตัวอย่าง QR Code (Live Preview)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                {qrSize}x{qrSize} px
              </span>
            </div>

            {/* QR Card Container */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-center min-w-[260px] min-h-[260px] relative shadow-inner">
              {isGenerating ? (
                <div className="text-xs font-bold text-teal-700 animate-pulse flex items-center gap-2">
                  <span>⏳</span>
                  <span>กำลังประมวลผล QR Code...</span>
                </div>
              ) : generatedDataUrl ? (
                <img
                  src={generatedDataUrl}
                  alt="Generated QR Code"
                  className="max-w-[260px] max-h-[320px] object-contain rounded-xl shadow-sm"
                />
              ) : (
                <span className="text-xs text-slate-400">กรุณากรอกข้อมูลเพื่อสร้าง QR</span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="w-full space-y-2 pt-1">
              {/* 1. Download PNG */}
              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={!generatedDataUrl}
                className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 disabled:opacity-50 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-teal-700/20 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>📥</span>
                <span>ดาวน์โหลดภาพ PNG ({qrSize}x{qrSize})</span>
              </button>

              {/* 2. Download SVG Vector (Vinyl Banner) */}
              <button
                type="button"
                onClick={handleDownloadSvg}
                disabled={!generatedDataUrl}
                className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 disabled:opacity-50 rounded-2xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🎨</span>
                <span>ส่งออกไฟล์ SVG (Vector สำหรับป้ายไวนิล)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                {/* 3. A4 Signage Button */}
                <button
                  type="button"
                  onClick={() => setShowA4Modal(true)}
                  disabled={!generatedDataUrl}
                  className="py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 disabled:opacity-50 rounded-2xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>🖨️</span>
                  <span>ป้ายประชาสัมพันธ์ A4</span>
                </button>

                {/* 4. Copy Image */}
                <button
                  type="button"
                  onClick={handleCopyImage}
                  disabled={!generatedDataUrl}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-2xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>📋</span>
                  <span>คัดลอกรูปภาพ</span>
                </button>
              </div>
            </div>

            {/* Information Notice */}
            <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-3 text-left w-full space-y-1">
              <div className="text-[11px] font-extrabold text-teal-800 flex items-center gap-1.5">
                <span>🛡️</span>
                <span>Static QR Code แบบถาวร 100%</span>
              </div>
              <p className="text-[10px] text-teal-700 leading-relaxed">
                ข้อมูลถูกฝังลงในรหัส 2 มิติโดยตรง ไม่ผ่าน Redirect Server ภายนอก จึงไม่มีวันหมดอายุตลอดชีพ ไม่ต้องกังวลเรื่องลิงก์เสีย
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

      {/* ─── PRINT-READY A4 SIGNAGE MODAL ─── */}
      {showA4Modal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="text-xl">🖨️</span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 font-heading">
                    ป้ายประชาสัมพันธ์ขนาด A4 ทางการ (Print-Ready A4 Signage)
                  </h3>
                  <p className="text-xs text-slate-500">
                    พิมพ์ป้ายตั้งโต๊ะ ป้ายแปะหน้าห้องประชุม หรือเอกสารประชาสัมพันธ์ สนง.พมจ.กำแพงเพชร
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintSignage}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>🖨️</span>
                  <span>สั่งพิมพ์ออกกระดาษ A4</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowA4Modal(false)}
                  className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body: Controls & Realtime A4 Sheet Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto p-4 sm:p-6 gap-6 bg-slate-100">
              {/* Editor Controls (4 cols) */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-700 uppercase">
                    แก้ไขข้อความบนป้าย A4
                  </h4>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">หัวข้อเอกสาร / ป้ายประกาศ *</label>
                    <textarea
                      rows={2}
                      value={signageTitle}
                      onChange={(e) => setSignageTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">คำชี้แจง / วิธีสแกน</label>
                    <textarea
                      rows={2}
                      value={signageSubtitle}
                      onChange={(e) => setSignageSubtitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">หน่วยงานผู้จัด</label>
                    <select
                      value={signageDivision}
                      onChange={(e) => setSignageDivision(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    >
                      {MISSION_DIVISIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">เบอร์โทรศัพท์ / ข้อมูลติดต่อ</label>
                    <input
                      type="text"
                      value={signageContact}
                      onChange={(e) => setSignageContact(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs text-indigo-900 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <span>💡</span>
                    <span>คำแนะนำการพิมพ์:</span>
                  </div>
                  <p className="text-[11px] text-indigo-700 leading-relaxed">
                    ระบบได้ตั้งค่าขอบกระดาษ (Margins) และสัดส่วน A4 มาตรฐานให้โดยอัตโนมัติ เมื่อกด &ldquo;สั่งพิมพ์&rdquo; จะพิมพ์เฉพาะตัวแผ่นป้ายออกมาอย่างสวยงาม
                  </p>
                </div>
              </div>

              {/* A4 Sheet Printable Container (8 cols) */}
              <div className="lg:col-span-8 flex justify-center items-start">
                <div
                  id="printable-a4-signage"
                  className="bg-white w-full max-w-[560px] aspect-[1/1.4142] p-8 sm:p-10 shadow-xl rounded-2xl border border-slate-300 flex flex-col justify-between items-center text-center space-y-4 print:shadow-none print:border-none print:m-0 print:p-8 print:w-full print:max-w-none"
                >
                  {/* Top Emblem & Official Header */}
                  <div className="space-y-2 flex flex-col items-center">
                    <img
                      src="/images/mso-logo.png"
                      alt="ตรากระทรวง พม."
                      className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
                    />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-700 font-heading">
                        กระทรวงการพัฒนาสังคมและความมั่นคงของมนุษย์
                      </h4>
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 font-heading">
                        {signageDivision}
                      </h3>
                    </div>
                    <div className="w-48 h-0.5 bg-gradient-to-r from-transparent via-slate-300 to-transparent my-1" />
                  </div>

                  {/* Title & Instructions */}
                  <div className="space-y-2 my-auto">
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 font-heading leading-snug px-4">
                      {signageTitle}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                      {signageSubtitle}
                    </p>

                    {/* Centered Large QR Code */}
                    <div className="pt-3 pb-2 flex justify-center">
                      <div className="p-4 bg-white rounded-3xl border-2 border-slate-900 shadow-md inline-block">
                        <img
                          src={pureQrDataUrl || generatedDataUrl}
                          alt="QR Code"
                          className="w-44 h-44 sm:w-56 sm:h-56 object-contain"
                        />
                      </div>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-[11px] font-bold text-slate-700">
                      <span>📱 สแกนได้ด้วยกล้องสมาร์ตโฟนทุกรุ่น หรือแอป LINE</span>
                    </div>
                  </div>

                  {/* Footer Office Info */}
                  <div className="border-t border-slate-200 pt-3 w-full space-y-0.5 text-slate-500 text-[10px] sm:text-xs">
                    <div className="font-semibold text-slate-700">{signageContact}</div>
                    <div>เว็บไซต์: kamphaengphet.m-society.go.th | ระบบสำนักงานอัจฉริยะ Smart MSO</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for Clean A4 Printing */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-a4-signage,
          #printable-a4-signage * {
            visibility: visible;
          }
          #printable-a4-signage {
            position: fixed;
            left: 0;
            top: 0;
            width: 100vw;
            height: 100vh;
            margin: 0;
            padding: 2.5cm;
            background: white !important;
            z-index: 99999;
          }
        }
      `}</style>
    </div>
  );
}
