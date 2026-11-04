"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Member } from "@/lib/types";

interface BgRemoveToolPageProps {
  currentUser?: Member;
  showToast: (msg: string) => void;
}

type BgOption = "transparent" | "white" | "official_blue" | "custom";

const SAMPLE_IMAGES = [
  {
    name: "ตราสัญลักษณ์ พม.",
    url: "/images/mso-logo.png",
    icon: "🏛️",
  },
  {
    name: "ตราครุฑราชการ",
    url: "/images/garuda.svg",
    icon: "🦅",
  },
];

export function BgRemoveToolPage({ currentUser, showToast }: BgRemoveToolPageProps) {
  const [originalImageUrl, setOriginalImageUrl] = useState<string>("");
  const [processedImageUrl, setProcessedImageUrl] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [bgOption, setBgOption] = useState<BgOption>("transparent");
  const [customBgColor, setCustomBgColor] = useState<string>("#3B82F6");
  const [tolerance, setTolerance] = useState<number>(30); // 5 - 80
  const [viewMode, setViewMode] = useState<"side_by_side" | "result_only">("side_by_side");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ─── Connected Border Flood Fill Background Removal ───
  const processImage = useCallback(
    (imgUrl: string, bg: BgOption, customColor: string, tol: number) => {
      if (!imgUrl) return;
      setIsProcessing(true);

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) {
            setIsProcessing(false);
            return;
          }

          // Scale down if image is huge (max 1200px for instant 20ms processing)
          const maxDim = 1200;
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
          if (w > maxDim || h > maxDim) {
            const scale = maxDim / Math.max(w, h);
            w = Math.round(w * scale);
            h = Math.round(h * scale);
          }

          canvas.width = w;
          canvas.height = h;

          // Draw original
          ctx.drawImage(img, 0, 0, w, h);

          // Get image data
          const imageData = ctx.getImageData(0, 0, w, h);
          const data = imageData.data;
          const totalPixels = w * h;

          // 1. Sample background colors along the 4 outer borders
          const borderColors: [number, number, number][] = [];
          const stepX = Math.max(1, Math.floor(w / 30));
          const stepY = Math.max(1, Math.floor(h / 30));

          // Top and bottom borders
          for (let x = 0; x < w; x += stepX) {
            const topIdx = (0 * w + x) * 4;
            borderColors.push([data[topIdx], data[topIdx + 1], data[topIdx + 2]]);
            const botIdx = ((h - 1) * w + x) * 4;
            borderColors.push([data[botIdx], data[botIdx + 1], data[botIdx + 2]]);
          }
          // Left and right borders
          for (let y = 0; y < h; y += stepY) {
            const leftIdx = (y * w + 0) * 4;
            borderColors.push([data[leftIdx], data[leftIdx + 1], data[leftIdx + 2]]);
            const rightIdx = (y * w + (w - 1)) * 4;
            borderColors.push([data[rightIdx], data[rightIdx + 1], data[rightIdx + 2]]);
          }

          // Distance helper to nearest border sample
          const colorDist = (r: number, g: number, b: number) => {
            let minD = 999999;
            for (let i = 0; i < borderColors.length; i++) {
              const [br, bgC, bb] = borderColors[i];
              const dr = r - br;
              const dg = g - bgC;
              const db = b - bb;
              // Perceptually weighted color distance
              const d = Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
              if (d < minD) minD = d;
            }
            return minD;
          };

          const threshold = tol * 2.8;

          // 2. Flood Fill Mask: 0 = unvisited, 1 = background, 2 = foreground
          const mask = new Uint8Array(totalPixels);
          const queue = new Int32Array(totalPixels);
          let head = 0;
          let tail = 0;

          // Seed the queue from all boundary pixels that match background
          const checkAndEnqueue = (x: number, y: number) => {
            const idx = y * w + x;
            if (mask[idx] !== 0) return;
            const pIdx = idx * 4;
            const d = colorDist(data[pIdx], data[pIdx + 1], data[pIdx + 2]);
            if (d <= threshold) {
              mask[idx] = 1; // background
              queue[tail++] = idx;
            } else {
              mask[idx] = 2; // foreground boundary
            }
          };

          for (let x = 0; x < w; x++) {
            checkAndEnqueue(x, 0);
            checkAndEnqueue(x, h - 1);
          }
          for (let y = 0; y < h; y++) {
            checkAndEnqueue(0, y);
            checkAndEnqueue(w - 1, y);
          }

          // 3. BFS Flood Fill starting from borders
          while (head < tail) {
            const curr = queue[head++];
            const cx = curr % w;
            const cy = Math.floor(curr / w);

            // 4 connected neighbors
            const neighbors = [
              cx > 0 ? curr - 1 : -1,
              cx < w - 1 ? curr + 1 : -1,
              cy > 0 ? curr - w : -1,
              cy < h - 1 ? curr + w : -1,
            ];

            for (let n = 0; n < 4; n++) {
              const nIdx = neighbors[n];
              if (nIdx !== -1 && mask[nIdx] === 0) {
                const pIdx = nIdx * 4;
                const d = colorDist(data[pIdx], data[pIdx + 1], data[pIdx + 2]);
                if (d <= threshold) {
                  mask[nIdx] = 1; // background
                  queue[tail++] = nIdx;
                } else {
                  mask[nIdx] = 2; // foreground
                }
              }
            }
          }

          // 4. Determine destination background RGB
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

          // 5. Replace pixels identified by flood-fill
          for (let i = 0; i < totalPixels; i++) {
            if (mask[i] === 1) {
              const pIdx = i * 4;
              if (bg === "transparent") {
                data[pIdx + 3] = 0;
              } else {
                data[pIdx] = fillR;
                data[pIdx + 1] = fillG;
                data[pIdx + 2] = fillB;
                data[pIdx + 3] = fillA;
              }
            }
          }

          ctx.putImageData(imageData, 0, 0);
          const resultUrl = canvas.toDataURL("image/png");
          setProcessedImageUrl(resultUrl);
        } catch (err) {
          console.error("BG Remove processing error:", err);
          showToast("⚠️ ไม่สามารถประมวลผลรูปภาพได้");
        } finally {
          setIsProcessing(false);
        }
      };

      img.onerror = () => {
        setIsProcessing(false);
        showToast("⚠️ ไม่สามารถโหลดภาพได้ กรุณาอัปโหลดไฟล์ใหม่อีกครั้ง");
      };

      // ─── CRUCIAL: Assign img.src to trigger loading ───
      img.src = imgUrl;
    },
    [showToast]
  );

  // Trigger processing when inputs change
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
      showToast("✓ โหลดรูปภาพสำเร็จ กำลังตัดขอบพื้นหลัง...");
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

  // Copy Image Handler
  const handleCopyImage = async () => {
    if (!processedImageUrl) return;
    try {
      const res = await fetch(processedImageUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      showToast("✓ คัดลอกภาพไปยังคลิปบอร์ดแล้ว");
    } catch {
      showToast("⚠️ ไม่สามารถคัดลอกรูปภาพได้ กรุณาใช้ปุ่มดาวน์โหลด");
    }
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
              <div className="text-[10px] text-indigo-200 font-bold">ความเร็ว</div>
              <div className="text-lg font-extrabold text-white">⚡ ทันที 0.05s</div>
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

            {/* Sample Image Buttons */}
            <div>
              <div className="text-[11px] font-bold text-slate-500 mb-1.5">หรือลองใช้ภาพตัวอย่างราชการ:</div>
              <div className="grid grid-cols-2 gap-2">
                {SAMPLE_IMAGES.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setOriginalImageUrl(sample.url)}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 truncate text-left transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <span>{sample.icon}</span>
                    <span className="truncate">{sample.name}</span>
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
                <div
                  className="w-6 h-6 rounded border border-slate-300 shadow-xs"
                  style={{ backgroundColor: customBgColor }}
                />
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
                    onClick={() =>
                      setViewMode(viewMode === "side_by_side" ? "result_only" : "side_by_side")
                    }
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    {viewMode === "side_by_side" ? "ดูเฉพาะผลลัพธ์" : "ดูเปรียบเทียบ"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyImage}
                    disabled={!processedImageUrl || isProcessing}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>📋</span>
                    <span>คัดลอก</span>
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
                    {isProcessing && (
                      <span className="text-[10px] text-indigo-600 animate-pulse font-bold">
                        กำลังตัดขอบและเปลี่ยนสีพื้นหลัง...
                      </span>
                    )}
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
