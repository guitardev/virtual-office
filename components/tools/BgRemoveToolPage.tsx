"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Member } from "@/lib/types";

interface BgRemoveToolPageProps {
  currentUser?: Member;
  showToast: (msg: string) => void;
}

type BgOption = "transparent" | "white" | "official_blue" | "custom";

const SAMPLE_PORTRAITS = [
  {
    name: "ภาพตัวอย่าง: ข้าราชการ",
    url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80",
  },
  {
    name: "ภาพตัวอย่าง: เจ้าหน้าที่",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
  },
];

export function BgRemoveToolPage({ currentUser, showToast }: BgRemoveToolPageProps) {
  const [originalImageUrl, setOriginalImageUrl] = useState<string>("");
  const [processedImageUrl, setProcessedImageUrl] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [bgOption, setBgOption] = useState<BgOption>("transparent");
  const [customBgColor, setCustomBgColor] = useState<string>("#3B82F6");
  const [tolerance, setTolerance] = useState<number>(32); // 1 - 100
  const [feather, setFeather] = useState<number>(2); // edge blur
  const [viewMode, setViewMode] = useState<"side_by_side" | "result_only">("side_by_side");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Core Canvas segmentation algorithm (Edge & corner background color flood detection)
  const processImage = useCallback(
    (imgUrl: string, bg: BgOption, customColor: string, tol: number) => {
      if (!imgUrl) return;
      setIsProcessing(true);

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          setIsProcessing(false);
          return;
        }

        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        canvas.width = width;
        canvas.height = height;

        // Draw original
        ctx.drawImage(img, 0, 0, width, height);

        // Get image data
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Sample background colors from 4 corners and borders
        const samplePoints = [
          [2, 2],
          [width - 3, 2],
          [2, height - 3],
          [width - 3, height - 3],
          [Math.floor(width / 2), 2],
          [2, Math.floor(height / 2)],
          [width - 3, Math.floor(height / 2)],
        ];

        const bgColors = samplePoints.map(([x, y]) => {
          const idx = (y * width + x) * 4;
          return { r: data[idx], g: data[idx + 1], b: data[idx + 2], a: data[idx + 3] };
        });

        // Color distance helper
        const colorDist = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) => {
          return Math.sqrt(
            (r1 - r2) * (r1 - r2) * 0.3 +
              (g1 - g2) * (g1 - g2) * 0.59 +
              (b1 - b2) * (b1 - b2) * 0.11
          );
        };

        const tolScaled = tol * 2.2;

        // Determine destination background RGB
        let fillR = 0;
        let fillG = 0;
        let fillB = 0;
        let fillA = 0;

        if (bg === "white") {
          fillR = 255;
          fillG = 255;
          fillB = 255;
          fillA = 255;
        } else if (bg === "official_blue") {
          fillR = 30;
          fillG = 77;
          fillB = 140; // Official government portrait blue
          fillA = 255;
        } else if (bg === "custom") {
          const hex = customColor.replace("#", "");
          fillR = parseInt(hex.substring(0, 2), 16) || 0;
          fillG = parseInt(hex.substring(2, 4), 16) || 0;
          fillB = parseInt(hex.substring(4, 6), 16) || 0;
          fillA = 255;
        }

        // Iterate through pixels and replace background
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Check minimum distance to any sampled background corner
          let minBgDist = 999999;
          for (const bgC of bgColors) {
            const dist = colorDist(r, g, b, bgC.r, bgC.g, bgC.b);
            if (dist < minBgDist) minBgDist = dist;
          }

          if (minBgDist < tolScaled) {
            // Background pixel
            if (bg === "transparent") {
              // Fade edges smoothly if near tolerance threshold
              const ratio = minBgDist / tolScaled;
              if (ratio > 0.8) {
                data[i + 3] = Math.floor(255 * (ratio - 0.8) * 5);
              } else {
                data[i + 3] = 0;
              }
            } else {
              data[i] = fillR;
              data[i + 1] = fillG;
              data[i + 2] = fillB;
              data[i + 3] = fillA;
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);
        const resultUrl = canvas.toDataURL("image/png");
        setProcessedImageUrl(resultUrl);
        setIsProcessing(false);
      };

      img.onerror = () => {
        setIsProcessing(false);
        showToast("⚠️ ไม่สามารถโหลดภาพได้ กรุณาอัปโหลดไฟล์ใหม่อีกครั้ง");
      };
    },
    [showToast]
  );

  // Trigger re-processing when adjustments change
  useEffect(() => {
    if (originalImageUrl) {
      processImage(originalImageUrl, bgOption, customBgColor, tolerance);
    }
  }, [originalImageUrl, bgOption, customBgColor, tolerance, processImage]);

  // File Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("⚠️ กรุณาเลือกไฟล์รูปภาพ (PNG, JPG, WebP)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setOriginalImageUrl(result);
      showToast("✓ โหลดรูปภาพสำเร็จ กำลังประมวลผลลบพื้นหลัง...");
    };
    reader.readAsDataURL(file);
  };

  // Download Output Handler
  const handleDownload = () => {
    if (!processedImageUrl) return;
    const a = document.createElement("a");
    a.href = processedImageUrl;
    a.download = `bg-removed-${bgOption}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("✓ ดาวน์โหลดภาพลบพื้นหลังสำเร็จแล้ว");
  };

  return (
    <div className="space-y-6">
      {/* ─── HEADER ─── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg border border-indigo-900/40">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
              <span>✂️</span>
              <span>เครื่องมือสำนักงานอัจฉริยะ</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-heading">
              BG Remove (ลบภาพแบ็คกราว จากภาพ)
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              เครื่องมือลบพื้นหลังภาพอัจฉริยะสำหรับรูปถ่ายติดบัตรข้าราชการ (ชุดปกติขาว/กากี) ตรายาง ลายเซ็น
              หรือภาพกิจกรรมราชการ ประมวลผลบนเบราว์เซอร์อย่างปลอดภัย ข้อมูลไม่รั่วไหล
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center">
              <div className="text-[10px] text-indigo-200 font-bold">ความปลอดภัย</div>
              <div className="text-lg font-extrabold text-white">🔒 100% Client-side</div>
            </div>
            <div className="px-4 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center">
              <div className="text-[10px] text-indigo-200 font-bold">ความละเอียด</div>
              <div className="text-lg font-extrabold text-white">HD Original</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── WORKSPACE ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload & Settings (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Upload Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              1. อัปโหลดรูปภาพ
            </h3>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-6 text-center bg-slate-50/60 hover:bg-indigo-50/30 transition-all cursor-pointer space-y-2 group"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-2xl mx-auto group-hover:scale-110 transition-transform">
                📤
              </div>
              <div className="text-xs font-bold text-slate-700">
                คลิกเพื่อเลือกภาพ หรือลากไฟล์มาวางที่นี่
              </div>
              <div className="text-[10px] text-slate-400">
                รองรับ PNG, JPG, WebP ขนาดไฟล์ไม่จำกัด
              </div>
            </div>

            {/* Sample Portrait Buttons */}
            <div>
              <div className="text-[11px] font-bold text-slate-500 mb-1.5">หรือลองใช้ภาพตัวอย่าง:</div>
              <div className="grid grid-cols-2 gap-2">
                {SAMPLE_PORTRAITS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setOriginalImageUrl(sample.url)}
                    className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 truncate text-left transition-colors cursor-pointer"
                  >
                    👤 {sample.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Background Replacement Options */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              2. เลือกสีพื้นหลังใหม่
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBgOption("transparent")}
                className={`p-3 rounded-2xl text-xs font-bold border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  bgOption === "transparent"
                    ? "bg-indigo-700 text-white border-indigo-700 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div className="w-6 h-6 rounded border border-slate-300 bg-[linear-gradient(45deg,#ccc_25%,transparent_25%),linear-gradient(-45deg,#ccc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#ccc_75%),linear-gradient(-45deg,transparent_75%,#ccc_75%)] bg-[length:6px_6px]" />
                <span>โปร่งใส (PNG)</span>
              </button>

              <button
                type="button"
                onClick={() => setBgOption("white")}
                className={`p-3 rounded-2xl text-xs font-bold border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  bgOption === "white"
                    ? "bg-indigo-700 text-white border-indigo-700 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div className="w-6 h-6 rounded border border-slate-300 bg-white" />
                <span>สีขาวบริสุทธิ์</span>
              </button>

              <button
                type="button"
                onClick={() => setBgOption("official_blue")}
                className={`p-3 rounded-2xl text-xs font-bold border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  bgOption === "official_blue"
                    ? "bg-indigo-700 text-white border-indigo-700 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div className="w-6 h-6 rounded border border-slate-300 bg-[#1E4D8C]" />
                <span>สีฟ้าทางการ (ติดบัตร)</span>
              </button>

              <button
                type="button"
                onClick={() => setBgOption("custom")}
                className={`p-3 rounded-2xl text-xs font-bold border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  bgOption === "custom"
                    ? "bg-indigo-700 text-white border-indigo-700 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div className="w-6 h-6 rounded border border-slate-300 shadow-xs" style={{ backgroundColor: customBgColor }} />
                <span>สีตามใจชอบ</span>
              </button>
            </div>

            {bgOption === "custom" && (
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="color"
                  value={customBgColor}
                  onChange={(e) => setCustomBgColor(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200"
                />
                <div className="text-xs font-bold text-slate-700 font-mono">
                  {customBgColor.toUpperCase()}
                </div>
              </div>
            )}
          </div>

          {/* Tolerance & Edge Sensitivity */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                ความไวในการตัดขอบ:
              </label>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                {tolerance}
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={80}
              value={tolerance}
              onChange={(e) => setTolerance(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>ตัดเฉพาะขอบที่ชัด (5)</span>
              <span>ตัดละเอียดลึก (80)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Preview & Result Canvas (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">
                  หน้าต่างแสดงผลลัพธ์ (Image Preview)
                </h3>
                <p className="text-xs text-slate-400">
                  {originalImageUrl ? "ภาพพร้อมสำหรับการดาวน์โหลด" : "กรุณาอัปโหลดรูปภาพเพื่อเริ่มตัดขอบ"}
                </p>
              </div>

              {originalImageUrl && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewMode(viewMode === "side_by_side" ? "result_only" : "side_by_side")}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    {viewMode === "side_by_side" ? "ดูเฉพาะผลลัพธ์" : "ดูเปรียบเทียบ"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={!processedImageUrl || isProcessing}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-700 hover:to-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-700/20 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>📥</span>
                    <span>ดาวน์โหลด PNG</span>
                  </button>
                </div>
              )}
            </div>

            {/* Preview Box */}
            {!originalImageUrl ? (
              <div className="py-24 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 space-y-3">
                <span className="text-5xl block">🖼️</span>
                <div className="text-sm font-bold text-slate-700">
                  ยังไม่มีรูปภาพที่ถูกเลือก
                </div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  เลือกอัปโหลดรูปภาพของคุณ หรือคลิกปุ่มภาพตัวอย่างด้านซ้ายเพื่อทดลองใช้งานระบบลบพื้นหลัง
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  เลือกรูปภาพทันที
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original */}
                {viewMode === "side_by_side" && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-extrabold text-slate-600 flex items-center justify-between">
                      <span>ภาพต้นฉบับ (Original)</span>
                    </div>
                    <div className="aspect-square bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center p-2">
                      <img
                        src={originalImageUrl}
                        alt="Original"
                        className="w-full h-full object-contain rounded-xl"
                      />
                    </div>
                  </div>
                )}

                {/* Processed Result */}
                <div className={`space-y-1.5 ${viewMode === "result_only" ? "md:col-span-2" : ""}`}>
                  <div className="text-xs font-extrabold text-teal-700 flex items-center justify-between">
                    <span>ภาพผลลัพธ์ (Result)</span>
                    {isProcessing && <span className="text-[10px] text-indigo-600 animate-pulse">กำลังประมวลผล...</span>}
                  </div>
                  <div
                    className={`aspect-square rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center p-2 relative ${
                      bgOption === "transparent"
                        ? "bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:16px_16px] bg-slate-100"
                        : bgOption === "white"
                        ? "bg-white"
                        : bgOption === "official_blue"
                        ? "bg-[#1E4D8C]"
                        : ""
                    }`}
                    style={bgOption === "custom" ? { backgroundColor: customBgColor } : {}}
                  >
                    {isProcessing ? (
                      <div className="text-xs font-bold text-slate-600 animate-pulse flex items-center gap-2">
                        <span>⏳</span>
                        <span>กำลังตัดขอบและเปลี่ยนสีพื้นหลัง...</span>
                      </div>
                    ) : (
                      <img
                        src={processedImageUrl || originalImageUrl}
                        alt="Processed"
                        className="w-full h-full object-contain rounded-xl"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Security Notice */}
            <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-3.5 text-xs text-indigo-900 space-y-1">
              <div className="font-extrabold flex items-center gap-1.5">
                <span>🛡️</span>
                <span>มาตรฐานความปลอดภัยและการรักษาความลับข้อมูลราชการ</span>
              </div>
              <p className="text-[11px] text-indigo-800/80 leading-relaxed">
                การประมวลผลภาพทั้งหมดถูกดำเนินการผ่านหน่วยประมวลผลกราฟิก (GPU / Web Canvas)
                บนเครื่องคอมพิวเตอร์ของท่านโดยตรง ภาพถ่ายบุคคลและเอกสารราชการจะไม่ถูกส่งผ่านเซิร์ฟเวอร์ภายนอกใด ๆ ทั้งสิ้น
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
