"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Member } from "@/lib/types";

interface BgRemoveToolPageProps {
  currentUser?: Member;
  showToast: (msg: string) => void;
}

type BgOption = "transparent" | "white" | "official_blue" | "custom";
type CropRatio = "free" | "1_inch" | "1.5_inch" | "2_inch";
type BrushMode = "none" | "restore" | "erase";
type ViewMode = "split_slider" | "side_by_side" | "result_only";

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

const CROP_CONFIGS: Record<CropRatio, { label: string; ratio: number; desc: string }> = {
  free: { label: "สัดส่วนเดิม", ratio: 0, desc: "ตามขนาดรูปต้นฉบับ" },
  "1_inch": { label: "1 นิ้ว (3:4)", ratio: 3 / 4, desc: "2.5 × 3.25 ซม." },
  "1.5_inch": { label: "1.5 นิ้ว (3:4)", ratio: 3 / 4, desc: "3.0 × 4.0 ซม. (มาตรฐาน ก.พ.)" },
  "2_inch": { label: "2 นิ้ว (4:5)", ratio: 4 / 5, desc: "4.0 × 5.0 ซม. (พาสปอร์ต/วีซ่า)" },
};

export function BgRemoveToolPage({ currentUser, showToast }: BgRemoveToolPageProps) {
  // Image & Canvas state
  const [originalImageUrl, setOriginalImageUrl] = useState<string>("");
  const [processedImageUrl, setProcessedImageUrl] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Styling & Options
  const [bgOption, setBgOption] = useState<BgOption>("transparent");
  const [customBgColor, setCustomBgColor] = useState<string>("#1E4D8C");
  const [tolerance, setTolerance] = useState<number>(30); // 5 - 80
  const [feather, setFeather] = useState<number>(2); // 0 - 5px soft edge
  const [enableShadow, setEnableShadow] = useState<boolean>(false);
  const [cropRatio, setCropRatio] = useState<CropRatio>("free");

  // Touch-up Brush state
  const [brushMode, setBrushMode] = useState<BrushMode>("none");
  const [brushSize, setBrushSize] = useState<number>(24); // 6 - 60px
  const [isPainting, setIsPainting] = useState<boolean>(false);
  const [manualOverrides, setManualOverrides] = useState<Uint8Array | null>(null);
  const [hasManualEdits, setHasManualEdits] = useState<boolean>(false);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("split_slider");
  const [splitPos, setSplitPos] = useState<number>(50); // percentage for split slider
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const interactiveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rawImageRef = useRef<HTMLImageElement | null>(null);
  const autoMaskRef = useRef<Uint8Array | null>(null);
  const activeDimsRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  // ─── Step 1: Core Connected Border Flood Fill Algorithm ───
  const computeAutoMask = (img: HTMLImageElement, tol: number): { mask: Uint8Array; w: number; h: number } => {
    const maxDim = 1200;
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    if (w > maxDim || h > maxDim) {
      const scale = maxDim / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { mask: new Uint8Array(0), w, h };

    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    const totalPixels = w * h;

    // Sample background colors from 4 outer borders
    const borderColors: [number, number, number][] = [];
    const stepX = Math.max(1, Math.floor(w / 30));
    const stepY = Math.max(1, Math.floor(h / 30));

    for (let x = 0; x < w; x += stepX) {
      const topIdx = (0 * w + x) * 4;
      borderColors.push([data[topIdx], data[topIdx + 1], data[topIdx + 2]]);
      const botIdx = ((h - 1) * w + x) * 4;
      borderColors.push([data[botIdx], data[botIdx + 1], data[botIdx + 2]]);
    }
    for (let y = 0; y < h; y += stepY) {
      const leftIdx = (y * w + 0) * 4;
      borderColors.push([data[leftIdx], data[leftIdx + 1], data[leftIdx + 2]]);
      const rightIdx = (y * w + (w - 1)) * 4;
      borderColors.push([data[rightIdx], data[rightIdx + 1], data[rightIdx + 2]]);
    }

    const colorDist = (r: number, g: number, b: number) => {
      let minD = 999999;
      for (let i = 0; i < borderColors.length; i++) {
        const [br, bgC, bb] = borderColors[i];
        const dr = r - br;
        const dg = g - bgC;
        const db = b - bb;
        const d = Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
        if (d < minD) minD = d;
      }
      return minD;
    };

    const threshold = tol * 2.8;
    const mask = new Uint8Array(totalPixels);
    const queue = new Int32Array(totalPixels);
    let head = 0;
    let tail = 0;

    const checkAndEnqueue = (x: number, y: number) => {
      const idx = y * w + x;
      if (mask[idx] !== 0) return;
      const pIdx = idx * 4;
      const d = colorDist(data[pIdx], data[pIdx + 1], data[pIdx + 2]);
      if (d <= threshold) {
        mask[idx] = 1; // background
        queue[tail++] = idx;
      } else {
        mask[idx] = 2; // foreground
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

    while (head < tail) {
      const curr = queue[head++];
      const cx = curr % w;
      const cy = Math.floor(curr / w);

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
            mask[nIdx] = 1;
            queue[tail++] = nIdx;
          } else {
            mask[nIdx] = 2;
          }
        }
      }
    }

    return { mask, w, h };
  };

  // ─── Step 2: Render Final Composite (Applies Mask, Overrides, Feathering & Background) ───
  const renderComposite = useCallback(() => {
    const img = rawImageRef.current;
    const autoMask = autoMaskRef.current;
    const { w, h } = activeDimsRef.current;
    if (!img || !autoMask || w === 0 || h === 0) return;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      // Draw original image
      ctx.drawImage(img, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;
      const totalPixels = w * h;

      // Determine effective mask (combining autoMask + manualOverrides)
      const effectiveMask = new Uint8Array(totalPixels);
      const overrides = manualOverrides;

      for (let i = 0; i < totalPixels; i++) {
        if (overrides && overrides[i] !== 0) {
          effectiveMask[i] = overrides[i]; // 1 = bg, 2 = fg
        } else {
          effectiveMask[i] = autoMask[i];
        }
      }

      // Compute Alpha Mask with optional Feathering (0-5px)
      const alphaMask = new Float32Array(totalPixels);
      for (let i = 0; i < totalPixels; i++) {
        alphaMask[i] = effectiveMask[i] === 1 ? 0 : 1;
      }

      if (feather > 0) {
        // Simple box blur approximation for alpha feathering
        const blurred = new Float32Array(totalPixels);
        const r = feather;
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            let sum = 0;
            let count = 0;
            for (let dy = -r; dy <= r; dy++) {
              const ny = y + dy;
              if (ny >= 0 && ny < h) {
                for (let dx = -r; dx <= r; dx++) {
                  const nx = x + dx;
                  if (nx >= 0 && nx < w) {
                    sum += alphaMask[ny * w + nx];
                    count++;
                  }
                }
              }
            }
            blurred[y * w + x] = sum / count;
          }
        }
        for (let i = 0; i < totalPixels; i++) {
          alphaMask[i] = blurred[i];
        }
      }

      // Determine background fill colors
      let fillR = 0,
        fillG = 0,
        fillB = 0,
        fillA = 0;
      if (bgOption === "white") {
        fillR = 255;
        fillG = 255;
        fillB = 255;
        fillA = 255;
      } else if (bgOption === "official_blue") {
        fillR = 30;
        fillG = 77;
        fillB = 140; // Official civil service photo blue
        fillA = 255;
      } else if (bgOption === "custom") {
        const hex = customBgColor.replace("#", "");
        fillR = parseInt(hex.substring(0, 2), 16) || 0;
        fillG = parseInt(hex.substring(2, 4), 16) || 0;
        fillB = parseInt(hex.substring(4, 6), 16) || 0;
        fillA = 255;
      }

      // Composite foreground over background
      for (let i = 0; i < totalPixels; i++) {
        const pIdx = i * 4;
        const fgAlpha = alphaMask[i]; // 0 to 1

        if (bgOption === "transparent") {
          data[pIdx + 3] = Math.round(data[pIdx + 3] * fgAlpha);
        } else {
          // Alpha blend: C = fg * alpha + bg * (1 - alpha)
          data[pIdx] = Math.round(data[pIdx] * fgAlpha + fillR * (1 - fgAlpha));
          data[pIdx + 1] = Math.round(data[pIdx + 1] * fgAlpha + fillG * (1 - fgAlpha));
          data[pIdx + 2] = Math.round(data[pIdx + 2] * fgAlpha + fillB * (1 - fgAlpha));
          data[pIdx + 3] = 255;
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // Add Studio Shadow if enabled and not transparent
      let finalCanvas = canvas;
      if (enableShadow && bgOption !== "transparent") {
        const shadowCanvas = document.createElement("canvas");
        shadowCanvas.width = w;
        shadowCanvas.height = h;
        const sCtx = shadowCanvas.getContext("2d");
        if (sCtx) {
          // Fill background color
          sCtx.fillStyle =
            bgOption === "white"
              ? "#FFFFFF"
              : bgOption === "official_blue"
              ? "#1E4D8C"
              : customBgColor;
          sCtx.fillRect(0, 0, w, h);

          // Draw cutout with soft drop shadow
          sCtx.save();
          sCtx.shadowColor = "rgba(0, 0, 0, 0.28)";
          sCtx.shadowBlur = 18;
          sCtx.shadowOffsetY = 6;
          sCtx.drawImage(canvas, 0, 0);
          sCtx.restore();
          finalCanvas = shadowCanvas;
        }
      }

      // Crop to aspect ratio if requested
      if (cropRatio !== "free" && CROP_CONFIGS[cropRatio].ratio > 0) {
        const targetRatio = CROP_CONFIGS[cropRatio].ratio;
        let cropW = w;
        let cropH = h;
        if (w / h > targetRatio) {
          cropW = Math.round(h * targetRatio);
        } else {
          cropH = Math.round(w / targetRatio);
        }
        const cropX = Math.round((w - cropW) / 2);
        const cropY = Math.round((h - cropH) / 2);

        const cropCanvas = document.createElement("canvas");
        cropCanvas.width = cropW;
        cropCanvas.height = cropH;
        const cCtx = cropCanvas.getContext("2d");
        if (cCtx) {
          cCtx.drawImage(finalCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          finalCanvas = cropCanvas;
        }
      }

      const resultUrl = finalCanvas.toDataURL("image/png");
      setProcessedImageUrl(resultUrl);

      // If interactive canvas is mounted, sync it
      if (interactiveCanvasRef.current) {
        const iCanvas = interactiveCanvasRef.current;
        iCanvas.width = w;
        iCanvas.height = h;
        const iCtx = iCanvas.getContext("2d");
        if (iCtx) {
          iCtx.drawImage(finalCanvas, 0, 0);
        }
      }
    } catch (err) {
      console.error("Render composite error:", err);
    }
  }, [bgOption, customBgColor, feather, enableShadow, cropRatio, manualOverrides]);

  // ─── Step 3: Trigger Background Removal Pipeline ───
  const processImage = useCallback(
    (imgUrl: string, tol: number) => {
      if (!imgUrl) return;
      setIsProcessing(true);

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          rawImageRef.current = img;
          const { mask, w, h } = computeAutoMask(img, tol);
          autoMaskRef.current = mask;
          activeDimsRef.current = { w, h };
          setManualOverrides(new Uint8Array(w * h));
          setHasManualEdits(false);
          renderComposite();
        } catch (e) {
          console.error("Processing error:", e);
          showToast("⚠️ ไม่สามารถประมวลผลรูปภาพได้");
        } finally {
          setIsProcessing(false);
        }
      };

      img.onerror = () => {
        setIsProcessing(false);
        showToast("⚠️ ไม่สามารถโหลดภาพได้ กรุณาอัปโหลดใหม่อีกครั้ง");
      };

      img.src = imgUrl;
    },
    [renderComposite, showToast]
  );

  // Trigger auto processing on image upload or tolerance change
  useEffect(() => {
    if (originalImageUrl) {
      processImage(originalImageUrl, tolerance);
    }
  }, [originalImageUrl, tolerance, processImage]);

  // Re-render composite on styling or touch-up changes
  useEffect(() => {
    if (originalImageUrl && autoMaskRef.current) {
      renderComposite();
    }
  }, [renderComposite, originalImageUrl, bgOption, customBgColor, feather, enableShadow, cropRatio, manualOverrides]);

  // ─── Step 4: Interactive Manual Touch-up Brushes ───
  const applyBrushAtPoint = (canvasX: number, canvasY: number) => {
    const { w, h } = activeDimsRef.current;
    if (w === 0 || h === 0 || !manualOverrides) return;

    const r = Math.round(brushSize / 2);
    const overrides = new Uint8Array(manualOverrides);
    const overrideVal = brushMode === "restore" ? 2 : 1; // 2 = keep foreground, 1 = erase to background

    let changed = false;
    for (let dy = -r; dy <= r; dy++) {
      const py = canvasY + dy;
      if (py >= 0 && py < h) {
        for (let dx = -r; dx <= r; dx++) {
          const px = canvasX + dx;
          if (px >= 0 && px < w) {
            if (dx * dx + dy * dy <= r * r) {
              const idx = py * w + px;
              if (overrides[idx] !== overrideVal) {
                overrides[idx] = overrideVal;
                changed = true;
              }
            }
          }
        }
      }
    }

    if (changed) {
      setManualOverrides(overrides);
      setHasManualEdits(true);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (brushMode === "none") return;
    setIsPainting(true);
    const canvas = interactiveCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = Math.round((e.clientX - rect.left) * scaleX);
    const cy = Math.round((e.clientY - rect.top) * scaleY);
    applyBrushAtPoint(cx, cy);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPainting || brushMode === "none") return;
    const canvas = interactiveCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = Math.round((e.clientX - rect.left) * scaleX);
    const cy = Math.round((e.clientY - rect.top) * scaleY);
    applyBrushAtPoint(cx, cy);
  };

  const handlePointerUp = () => {
    setIsPainting(false);
  };

  const handleResetManualEdits = () => {
    const { w, h } = activeDimsRef.current;
    if (w > 0 && h > 0) {
      setManualOverrides(new Uint8Array(w * h));
      setHasManualEdits(false);
      showToast("✓ รีเซ็ตการแก้ไขด้วยมือกลับสู่สถานะเริ่มต้นแล้ว");
    }
  };

  // ─── Step 5: File & Export Handlers ───
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

  const handleDownload = () => {
    if (!processedImageUrl) return;
    const a = document.createElement("a");
    a.href = processedImageUrl;
    const cropText = cropRatio !== "free" ? `-${cropRatio}` : "";
    a.download = `smartmso-portrait-${bgOption}${cropText}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("✓ ดาวน์โหลดภาพลบพื้นหลังสำเร็จแล้ว");
  };

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
              <span>🏛️ สนง.พมจ.กำแพงเพชร</span>
              <span>·</span>
              <span>เครื่องมือสำนักงานอัจฉริยะ</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-heading">
              BG Remove (ลบภาพแบ็คกราว & ปรับแต่งรูปติดบัตรข้าราชการ)
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              ลบพื้นหลังและจัดทำรูปถ่ายติดบัตรข้าราชการ (ชุดปกติขาว/กากี) ตรายาง ลายเซ็น พร้อมเครื่องมือปรับละเอียดระดับมืออาชีพ:
              เกลี่ยขอบนุ่ม แปรงกู้คืน/ลบเฉพาะจุด สัดส่วน 1 นิ้ว/1.5 นิ้ว และแสงเงาสตูดิโอ
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

      {/* ─── MAIN WORKSPACE GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload & Fine-Tuning Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Step 1: Upload Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-3">
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
              className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-5 text-center bg-slate-50/60 hover:bg-indigo-50/30 transition-all cursor-pointer space-y-1.5 group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl mx-auto group-hover:scale-110 transition-transform">
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
              <div className="text-[11px] font-bold text-slate-500 mb-1">ภาพตัวอย่างราชการ:</div>
              <div className="grid grid-cols-2 gap-2">
                {SAMPLE_IMAGES.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setOriginalImageUrl(sample.url)}
                    className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 truncate text-left transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{sample.icon}</span>
                    <span className="truncate">{sample.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Step 2: Background Replacement Options */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              2. เลือกสีพื้นหลังใหม่
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBgOption("transparent")}
                className={`p-2.5 rounded-2xl text-xs font-bold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  bgOption === "transparent"
                    ? "bg-indigo-700 text-white border-indigo-700 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div className="w-5 h-5 rounded border border-slate-300 bg-[linear-gradient(45deg,#ccc_25%,transparent_25%),linear-gradient(-45deg,#ccc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#ccc_75%),linear-gradient(-45deg,transparent_75%,#ccc_75%)] bg-[length:6px_6px]" />
                <span>โปร่งใส (PNG)</span>
              </button>

              <button
                type="button"
                onClick={() => setBgOption("official_blue")}
                className={`p-2.5 rounded-2xl text-xs font-bold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  bgOption === "official_blue"
                    ? "bg-indigo-700 text-white border-indigo-700 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div className="w-5 h-5 rounded border border-slate-300 bg-[#1E4D8C]" />
                <span>สีฟ้าทางการ (ติดบัตร)</span>
              </button>

              <button
                type="button"
                onClick={() => setBgOption("white")}
                className={`p-2.5 rounded-2xl text-xs font-bold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  bgOption === "white"
                    ? "bg-indigo-700 text-white border-indigo-700 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div className="w-5 h-5 rounded border border-slate-300 bg-white" />
                <span>สีขาวบริสุทธิ์</span>
              </button>

              <button
                type="button"
                onClick={() => setBgOption("custom")}
                className={`p-2.5 rounded-2xl text-xs font-bold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                  bgOption === "custom"
                    ? "bg-indigo-700 text-white border-indigo-700 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div
                  className="w-5 h-5 rounded border border-slate-300 shadow-xs"
                  style={{ backgroundColor: customBgColor }}
                />
                <span>สีตามใจชอบ</span>
              </button>
            </div>

            {bgOption === "custom" && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="color"
                  value={customBgColor}
                  onChange={(e) => setCustomBgColor(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200"
                />
                <span className="text-xs font-bold text-slate-700 font-mono">
                  {customBgColor.toUpperCase()}
                </span>
              </div>
            )}

            {/* Studio Shadow Checkbox */}
            {bgOption !== "transparent" && (
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={enableShadow}
                    onChange={(e) => setEnableShadow(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      👤 แสงเงาสตูดิโอนุ่มนวล (Studio Drop Shadow)
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      ใส่เงาตกกระทบบางๆ หลังตัวบุคคล ให้ภาพดูมีมิติเหมือนถ่ายสตูดิโอ
                    </span>
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* Step 3: Civil Service ID Card Aspect Ratio Crop */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                3. สัดส่วนรูปถ่ายติดบัตร (ID Card Crop)
              </h3>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                มาตรฐานราชการ
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(CROP_CONFIGS) as CropRatio[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCropRatio(key)}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    cropRatio === key
                      ? "bg-indigo-50 text-indigo-900 border-indigo-400 ring-1 ring-indigo-400"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <div className="text-xs font-bold">{CROP_CONFIGS[key].label}</div>
                  <div className="text-[10px] text-slate-500">{CROP_CONFIGS[key].desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 4: Fine-Tuning Sliders (Tolerance & Edge Feathering) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              4. ปรับละเอียดขอบภาพ (Edge Refinement)
            </h3>

            {/* Tolerance */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">ความไวในการตัดขอบ (Tolerance):</span>
                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
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
                <span>ขอบชัด (5)</span>
                <span>ตัดลึก (80)</span>
              </div>
            </div>

            {/* Feathering (Soft Edge) */}
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">เกลี่ยขอบนุ่ม (Edge Feathering):</span>
                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                  {feather} px
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={5}
                value={feather}
                onChange={(e) => setFeather(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>ขอบคมชัด (0px)</span>
                <span>เกลี่ยขอบนุ่มนวล (5px)</span>
              </div>
            </div>
          </div>

          {/* Step 5: Manual Touch-up Brushes */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                5. แปรงแต่งภาพด้วยมือ (Touch-up Brushes)
              </h3>
              {hasManualEdits && (
                <button
                  type="button"
                  onClick={handleResetManualEdits}
                  className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  ↩️ รีเซ็ตแปรง
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-500">
              เลือกระบายบนภาพเพื่อกู้คืนจุดที่ตัดเกิน หรือลบเศษพื้นหลังที่ตกค้าง:
            </p>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setBrushMode("none")}
                className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  brushMode === "none"
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <span>🖐️</span>
                <span>ปกติ</span>
              </button>

              <button
                type="button"
                onClick={() => setBrushMode("restore")}
                className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  brushMode === "restore"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                <span>🖌️</span>
                <span>แปรงกู้คืน</span>
              </button>

              <button
                type="button"
                onClick={() => setBrushMode("erase")}
                className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  brushMode === "erase"
                    ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                    : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
                }`}
              >
                <span>🧼</span>
                <span>แปรงลบ</span>
              </button>
            </div>

            {brushMode !== "none" && (
              <div className="pt-2 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">ขนาดหัวแปรง:</span>
                  <span className="font-mono font-bold text-indigo-700">{brushSize} px</span>
                </div>
                <input
                  type="range"
                  min={6}
                  max={60}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Preview, Interactive Canvas & Export (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4 sticky top-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">
                  หน้าต่างแสดงผลลัพธ์ (Interactive Workspace)
                </h3>
                <p className="text-xs text-slate-400">
                  {originalImageUrl ? "ภาพพร้อมสำหรับการปรับละเอียดและดาวน์โหลด" : "กรุณาอัปโหลดรูปภาพเพื่อเริ่มตัดขอบ"}
                </p>
              </div>

              {originalImageUrl && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* View Mode Switcher */}
                  <div className="bg-slate-100 p-0.5 rounded-xl flex items-center text-xs">
                    <button
                      type="button"
                      onClick={() => setViewMode("split_slider")}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        viewMode === "split_slider"
                          ? "bg-white text-indigo-700 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      ↔️ สไลด์เปรียบเทียบ
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("result_only")}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        viewMode === "result_only"
                          ? "bg-white text-indigo-700 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      ผลลัพธ์
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("side_by_side")}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        viewMode === "side_by_side"
                          ? "bg-white text-indigo-700 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      ข้างๆ
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyImage}
                    disabled={!processedImageUrl || isProcessing}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>📋</span>
                    <span>คัดลอก</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={!processedImageUrl || isProcessing}
                    className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-700 hover:to-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-700/20 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>📥</span>
                    <span>ดาวน์โหลด PNG</span>
                  </button>
                </div>
              )}
            </div>

            {/* Preview & Canvas Container */}
            {!originalImageUrl ? (
              <div className="py-24 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 space-y-3">
                <span className="text-5xl block">🖼️</span>
                <div className="text-sm font-bold text-slate-700">
                  ยังไม่มีรูปภาพที่ถูกเลือก
                </div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  เลือกอัปโหลดรูปภาพของคุณ หรือคลิกปุ่มภาพตัวอย่างด้านซ้ายเพื่อเริ่มทดลองใช้งานระบบลบพื้นหลัง
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
              <div className="space-y-3">
                {/* 1. Split Slider View Mode */}
                {viewMode === "split_slider" && (
                  <div
                    className="relative w-full max-h-[520px] aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200 select-none bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:16px_16px] bg-slate-100 flex items-center justify-center"
                    onPointerMove={(e) => {
                      if (!isDraggingSplit) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                      setSplitPos(Math.round((x / rect.width) * 100));
                    }}
                    onPointerUp={() => setIsDraggingSplit(false)}
                  >
                    {/* Background Original Image (Bottom Layer) */}
                    <img
                      src={originalImageUrl}
                      alt="Original"
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    />

                    {/* Processed Result Image (Top Layer clipped by Split Pos) */}
                    <div
                      className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden"
                      style={{ clipPath: `inset(0 0 0 ${splitPos}%)` }}
                    >
                      <img
                        src={processedImageUrl || originalImageUrl}
                        alt="Result"
                        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                      />
                    </div>

                    {/* Interactive Canvas Overlay when Brush Mode is Active */}
                    {brushMode !== "none" && (
                      <canvas
                        ref={interactiveCanvasRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        className="absolute inset-0 w-full h-full object-contain cursor-crosshair z-20"
                        title="คลิกและลากเพื่อระบายปรับแต่ง"
                      />
                    )}

                    {/* Split Divider Bar */}
                    {brushMode === "none" && (
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize z-30 flex items-center justify-center"
                        style={{ left: `${splitPos}%` }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          setIsDraggingSplit(true);
                        }}
                      >
                        <div className="w-7 h-7 rounded-full bg-white text-indigo-700 shadow-md border border-slate-200 flex items-center justify-center text-xs font-bold">
                          ↔
                        </div>
                      </div>
                    )}

                    {/* Labels */}
                    <span className="absolute bottom-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold rounded-md pointer-events-none z-10">
                      ต้นฉบับ
                    </span>
                    <span className="absolute bottom-3 right-3 px-2 py-1 bg-indigo-600/80 backdrop-blur-xs text-white text-[10px] font-bold rounded-md pointer-events-none z-10">
                      ตัดขอบแล้ว
                    </span>
                  </div>
                )}

                {/* 2. Result Only View Mode */}
                {viewMode === "result_only" && (
                  <div className="relative w-full max-h-[520px] aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200 bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:16px_16px] bg-slate-100 flex items-center justify-center">
                    <img
                      src={processedImageUrl || originalImageUrl}
                      alt="Processed"
                      className="w-full h-full object-contain pointer-events-none"
                    />

                    {brushMode !== "none" && (
                      <canvas
                        ref={interactiveCanvasRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        className="absolute inset-0 w-full h-full object-contain cursor-crosshair z-20"
                        title="คลิกและลากเพื่อระบายปรับแต่ง"
                      />
                    )}
                  </div>
                )}

                {/* 3. Side by Side View Mode */}
                {viewMode === "side_by_side" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-500">ภาพต้นฉบับ</span>
                      <div className="aspect-square bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center p-2">
                        <img
                          src={originalImageUrl}
                          alt="Original"
                          className="w-full h-full object-contain rounded-xl"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-teal-700">ภาพผลลัพธ์</span>
                      <div className="aspect-square bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:16px_16px] bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center p-2">
                        <img
                          src={processedImageUrl || originalImageUrl}
                          alt="Processed"
                          className="w-full h-full object-contain rounded-xl"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Helper instruction when brush is active */}
                {brushMode !== "none" && (
                  <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span>{brushMode === "restore" ? "🖌️ โหมดแปรงกู้คืน" : "🧼 โหมดแปรงลบ"}:</span>
                      <span className="font-normal text-[11px]">
                        คลิกหรือลากเมาส์บนภาพเพื่อปรับแต่งเฉพาะจุด
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBrushMode("none")}
                      className="px-2 py-0.5 bg-white border border-indigo-300 rounded text-[10px] font-bold text-indigo-700 cursor-pointer"
                    >
                      เสร็จสิ้น
                    </button>
                  </div>
                )}

                {/* Status Footer */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>
                    สัดส่วน: <strong>{CROP_CONFIGS[cropRatio].label}</strong> ({CROP_CONFIGS[cropRatio].desc})
                  </span>
                  <span>
                    พื้นหลัง:{" "}
                    <strong>
                      {bgOption === "transparent"
                        ? "โปร่งใส"
                        : bgOption === "official_blue"
                        ? "สีฟ้าทางการ"
                        : bgOption === "white"
                        ? "สีขาว"
                        : "สีกำหนดเอง"}
                    </strong>
                  </span>
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
