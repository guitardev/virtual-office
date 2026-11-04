"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
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

/**
 * Fast 2-pass separable 1D box blur for alpha feathering (runs in ~5ms for 1.4M pixels)
 */
function fastBoxBlurAlpha(alpha: Float32Array, w: number, h: number, r: number): Float32Array {
  if (r <= 0) return alpha;
  const total = w * h;
  const temp = new Float32Array(total);
  const out = new Float32Array(total);

  // 1. Horizontal pass
  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      const xMin = Math.max(0, x - r);
      const xMax = Math.min(w - 1, x + r);
      for (let nx = xMin; nx <= xMax; nx++) {
        sum += alpha[rowOffset + nx];
        count++;
      }
      temp[rowOffset + x] = sum / count;
    }
  }

  // 2. Vertical pass
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let sum = 0;
      let count = 0;
      const yMin = Math.max(0, y - r);
      const yMax = Math.min(h - 1, y + r);
      for (let ny = yMin; ny <= yMax; ny++) {
        sum += temp[ny * w + x];
        count++;
      }
      out[y * w + x] = sum / count;
    }
  }

  return out;
}

export function BgRemoveToolPage({ currentUser, showToast }: BgRemoveToolPageProps) {
  // Image & Canvas state
  const [originalImageUrl, setOriginalImageUrl] = useState<string>("");
  const [processedImageUrl, setProcessedImageUrl] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeDims, setActiveDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // Styling & Options
  const [bgOption, setBgOption] = useState<BgOption>("transparent");
  const [customBgColor, setCustomBgColor] = useState<string>("#1E4D8C");
  const [tolerance, setTolerance] = useState<number>(30); // 5 - 80
  const [feather, setFeather] = useState<number>(2); // 0 - 5px soft edge
  const [enableShadow, setEnableShadow] = useState<boolean>(false);
  const [cropRatio, setCropRatio] = useState<CropRatio>("free");

  // Touch-up Brush state
  const [brushMode, setBrushMode] = useState<BrushMode>("none");
  const [brushSize, setBrushSize] = useState<number>(28); // 6 - 80px
  const [hasManualEdits, setHasManualEdits] = useState<boolean>(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number; screenRadius: number } | null>(null);
  const [isPeekingOriginal, setIsPeekingOriginal] = useState<boolean>(false);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("split_slider");
  const [splitPos, setSplitPos] = useState<number>(50); // percentage for split slider
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);

  // Refs for zero-latency in-memory state & high FPS painting
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const interactiveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rawImageRef = useRef<HTMLImageElement | null>(null);
  const autoMaskRef = useRef<Uint8Array | null>(null);
  const manualOverridesRef = useRef<Uint8Array | null>(null);
  const activeDimsRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const isPaintingRef = useRef<boolean>(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

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

  // ─── Step 2: Render Final Composite ───
  const renderComposite = useCallback(() => {
    const img = rawImageRef.current;
    const autoMask = autoMaskRef.current;
    const { w, h } = activeDimsRef.current;
    const overrides = manualOverridesRef.current;
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

      // Determine effective mask (combining autoMask + in-memory manualOverrides)
      const effectiveMask = new Uint8Array(totalPixels);
      for (let i = 0; i < totalPixels; i++) {
        if (overrides && overrides[i] !== 0) {
          effectiveMask[i] = overrides[i]; // 1 = bg, 2 = fg
        } else {
          effectiveMask[i] = autoMask[i];
        }
      }

      // Compute Alpha Mask with fast Separable Box Blur Feathering (0-5px)
      let alphaMask: Float32Array = new Float32Array(totalPixels);
      for (let i = 0; i < totalPixels; i++) {
        alphaMask[i] = effectiveMask[i] === 1 ? 0 : 1;
      }

      if (feather > 0) {
        alphaMask = fastBoxBlurAlpha(alphaMask, w, h, feather);
      }

      // Determine background fill colors
      let fillR = 0,
        fillG = 0,
        fillB = 0;
      if (bgOption === "white") {
        fillR = 255;
        fillG = 255;
        fillB = 255;
      } else if (bgOption === "official_blue") {
        fillR = 30;
        fillG = 77;
        fillB = 140; // Official civil service photo blue
      } else if (bgOption === "custom") {
        const hex = customBgColor.replace("#", "");
        fillR = parseInt(hex.substring(0, 2), 16) || 0;
        fillG = parseInt(hex.substring(2, 4), 16) || 0;
        fillB = parseInt(hex.substring(4, 6), 16) || 0;
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
          sCtx.fillStyle =
            bgOption === "white"
              ? "#FFFFFF"
              : bgOption === "official_blue"
              ? "#1E4D8C"
              : customBgColor;
          sCtx.fillRect(0, 0, w, h);

          sCtx.save();
          sCtx.shadowColor = "rgba(0, 0, 0, 0.28)";
          sCtx.shadowBlur = 18;
          sCtx.shadowOffsetY = 6;
          sCtx.drawImage(canvas, 0, 0);
          sCtx.restore();
          finalCanvas = shadowCanvas;
        }
      }

      // Draw onto interactive canvas if mounted
      if (interactiveCanvasRef.current) {
        const iCanvas = interactiveCanvasRef.current;
        if (iCanvas.width !== w) iCanvas.width = w;
        if (iCanvas.height !== h) iCanvas.height = h;
        const iCtx = iCanvas.getContext("2d");
        if (iCtx) {
          iCtx.clearRect(0, 0, w, h);
          iCtx.drawImage(finalCanvas, 0, 0);

          // Draw crop guide overlay if crop ratio is selected
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

            iCtx.save();
            // Dim outside region
            iCtx.fillStyle = "rgba(15, 23, 42, 0.4)";
            iCtx.fillRect(0, 0, w, cropY);
            iCtx.fillRect(0, cropY + cropH, w, h - (cropY + cropH));
            iCtx.fillRect(0, cropY, cropX, cropH);
            iCtx.fillRect(cropX + cropW, cropY, w - (cropX + cropW), cropH);

            // Dashed border around crop frame
            iCtx.strokeStyle = "rgba(255, 255, 255, 0.9)";
            iCtx.lineWidth = Math.max(2, Math.round(w / 400));
            iCtx.setLineDash([8, 6]);
            iCtx.strokeRect(cropX, cropY, cropW, cropH);

            // Crop Frame Label
            iCtx.fillStyle = "rgba(15, 23, 42, 0.8)";
            iCtx.fillRect(cropX + 8, cropY + 8, 140, 24);
            iCtx.fillStyle = "#ffffff";
            iCtx.font = "bold 11px sans-serif";
            iCtx.fillText(CROP_CONFIGS[cropRatio].label, cropX + 16, cropY + 24);
            iCtx.restore();
          }
        }
      }

      // Generate processedImageUrl (cropped if crop ratio is set)
      let exportCanvas = finalCanvas;
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
          exportCanvas = cropCanvas;
        }
      }

      const resultUrl = exportCanvas.toDataURL("image/png");
      setProcessedImageUrl(resultUrl);
    } catch (err) {
      console.error("Render composite error:", err);
    }
  }, [bgOption, customBgColor, feather, enableShadow, cropRatio]);

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
          manualOverridesRef.current = new Uint8Array(w * h);
          setActiveDims({ w, h });
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

  // Re-render composite on styling changes
  useEffect(() => {
    if (originalImageUrl && autoMaskRef.current) {
      renderComposite();
    }
  }, [renderComposite, originalImageUrl, bgOption, customBgColor, feather, enableShadow, cropRatio]);

  // Peek original photo handler
  useEffect(() => {
    if (!interactiveCanvasRef.current || !rawImageRef.current) return;
    const { w, h } = activeDimsRef.current;
    if (w === 0 || h === 0) return;
    const iCanvas = interactiveCanvasRef.current;
    const ctx = iCanvas.getContext("2d");
    if (!ctx) return;

    if (isPeekingOriginal) {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(rawImageRef.current, 0, 0, w, h);
    } else {
      renderComposite();
    }
  }, [isPeekingOriginal, renderComposite]);

  // ─── Step 4: Fluid Interactive Touch-up Brush Engine ───
  const paintAtPoint = useCallback(
    (cx: number, cy: number) => {
      const { w, h } = activeDimsRef.current;
      const overrides = manualOverridesRef.current;
      const img = rawImageRef.current;
      const canvas = interactiveCanvasRef.current;
      if (w === 0 || h === 0 || !overrides || !img || !canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const r = Math.max(1, Math.round(brushSize / 2));
      const overrideVal = brushMode === "restore" ? 2 : 1; // 2 = fg, 1 = bg

      // 1. Update in-memory mask overrides
      const rSquared = r * r;
      const xMin = Math.max(0, cx - r);
      const xMax = Math.min(w - 1, cx + r);
      const yMin = Math.max(0, cy - r);
      const yMax = Math.min(h - 1, cy + r);

      for (let py = yMin; py <= yMax; py++) {
        const dy = py - cy;
        const dy2 = dy * dy;
        const rowOffset = py * w;
        for (let px = xMin; px <= xMax; px++) {
          const dx = px - cx;
          if (dx * dx + dy2 <= rSquared) {
            overrides[rowOffset + px] = overrideVal;
          }
        }
      }

      // 2. Direct fast Canvas 2D paint
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      if (brushMode === "restore") {
        ctx.drawImage(img, 0, 0, w, h);
      } else {
        // Erase
        if (bgOption === "transparent") {
          ctx.clearRect(cx - r, cy - r, r * 2, r * 2);
        } else if (bgOption === "official_blue") {
          ctx.fillStyle = "#1E4D8C";
          ctx.fill();
        } else if (bgOption === "white") {
          ctx.fillStyle = "#FFFFFF";
          ctx.fill();
        } else {
          ctx.fillStyle = customBgColor;
          ctx.fill();
        }
      }
      ctx.restore();
    },
    [brushMode, brushSize, bgOption, customBgColor]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (brushMode === "none") return;
    const canvas = interactiveCanvasRef.current;
    if (!canvas) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    isPaintingRef.current = true;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = Math.max(0, Math.min(canvas.width - 1, Math.round((e.clientX - rect.left) * scaleX)));
    const cy = Math.max(0, Math.min(canvas.height - 1, Math.round((e.clientY - rect.top) * scaleY)));

    lastPointRef.current = { x: cx, y: cy };
    paintAtPoint(cx, cy);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = interactiveCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Visual brush indicator coordinates
    const screenRadius = Math.max(3, Math.round(brushSize / 2 / scaleX));
    setCursorPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      screenRadius,
    });

    if (!isPaintingRef.current || brushMode === "none" || !lastPointRef.current) return;

    const cx = Math.max(0, Math.min(canvas.width - 1, Math.round((e.clientX - rect.left) * scaleX)));
    const cy = Math.max(0, Math.min(canvas.height - 1, Math.round((e.clientY - rect.top) * scaleY)));

    // Continuous line interpolation between points
    const last = lastPointRef.current;
    const dist = Math.hypot(cx - last.x, cy - last.y);
    const step = Math.max(2, brushSize / 4);
    const steps = Math.ceil(dist / step);

    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const px = Math.round(last.x + (cx - last.x) * t);
      const py = Math.round(last.y + (cy - last.y) * t);
      paintAtPoint(px, py);
    }

    lastPointRef.current = { x: cx, y: cy };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPaintingRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      isPaintingRef.current = false;
      lastPointRef.current = null;
      setHasManualEdits(true);
      // Perform full composite pass with soft edge feathering & sync result URL
      renderComposite();
    }
  };

  const handlePointerLeave = () => {
    setCursorPos(null);
  };

  const handleSelectBrushMode = (mode: BrushMode) => {
    setBrushMode(mode);
    if (mode !== "none") {
      requestAnimationFrame(() => {
        renderComposite();
      });
    }
  };

  const handleResetManualEdits = () => {
    const { w, h } = activeDimsRef.current;
    if (w > 0 && h > 0) {
      manualOverridesRef.current = new Uint8Array(w * h);
      setHasManualEdits(false);
      renderComposite();
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
      showToast("✓ คัดลอกภาพไปยังคลิปบอร์ดแล้ว (นำไปวางใน Word หรือ PowerPoint ได้ทันที)");
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
                  className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer flex items-center gap-0.5"
                >
                  <span>↩️</span>
                  <span>รีเซ็ตแปรง</span>
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-500">
              เลือกระบายบนภาพเพื่อกู้คืนจุดที่ตัดเกิน หรือลบเศษพื้นหลังที่ตกค้าง:
            </p>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSelectBrushMode("none")}
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
                onClick={() => handleSelectBrushMode("restore")}
                className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  brushMode === "restore"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-300"
                    : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                <span>🖌️</span>
                <span>แปรงกู้คืน</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectBrushMode("erase")}
                className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  brushMode === "erase"
                    ? "bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-300"
                    : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
                }`}
              >
                <span>🧼</span>
                <span>แปรงลบ</span>
              </button>
            </div>

            {brushMode !== "none" && (
              <div className="pt-2 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">ขนาดหัวแปรง:</span>
                  <span className="font-mono font-bold text-indigo-700">{brushSize} px</span>
                </div>
                <input
                  type="range"
                  min={6}
                  max={80}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>ละเอียด (6px)</span>
                  <span>พื้นที่กว้าง (80px)</span>
                </div>
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
                  {brushMode !== "none" ? "🎨 พื้นที่ปรับแต่งด้วยแปรง (Interactive Canvas)" : "หน้าต่างแสดงผลลัพธ์ (Preview Workspace)"}
                </h3>
                <p className="text-xs text-slate-400">
                  {brushMode !== "none"
                    ? `คลิกหรือลากเมาส์บนภาพเพื่อ${brushMode === "restore" ? "กู้คืนรายละเอียด" : "ลบพื้นหลัง"}`
                    : originalImageUrl
                    ? "ภาพพร้อมสำหรับการปรับละเอียดและดาวน์โหลด"
                    : "กรุณาอัปโหลดรูปภาพเพื่อเริ่มตัดขอบ"}
                </p>
              </div>

              {originalImageUrl && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* View Mode Switcher (Visible when not in brush mode) */}
                  {brushMode === "none" && (
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
                  )}

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
                {/* ─── CASE A: BRUSH EDITING MODE (Active Interactive Canvas) ─── */}
                {brushMode !== "none" ? (
                  <div className="space-y-2">
                    {/* Brush Active Control Bar */}
                    <div className="flex items-center justify-between px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{brushMode === "restore" ? "🖌️" : "🧼"}</span>
                        <div>
                          <span className="font-extrabold text-indigo-900 block">
                            โหมด{brushMode === "restore" ? "แปรงกู้คืน (Restore)" : "แปรงลบ (Erase)"}
                          </span>
                          <span className="text-[11px] text-indigo-700">
                            ระบายบนภาพเพื่อ{brushMode === "restore" ? "ดึงรายละเอียดส่วนที่ถูกตัดเกินกลับมา" : "ลบเศษขอบหรือพื้นหลังที่ตกค้าง"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onMouseDown={() => setIsPeekingOriginal(true)}
                          onMouseUp={() => setIsPeekingOriginal(false)}
                          onTouchStart={() => setIsPeekingOriginal(true)}
                          onTouchEnd={() => setIsPeekingOriginal(false)}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-indigo-300 rounded-xl text-[11px] font-bold text-indigo-700 cursor-pointer select-none transition-colors shadow-xs"
                          title="กดค้างเพื่อดูภาพต้นฉบับ"
                        >
                          👁️ กดค้างดูต้นฉบับ
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectBrushMode("none")}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
                        >
                          ✓ เสร็จสิ้น
                        </button>
                      </div>
                    </div>

                    {/* Paintable Canvas Viewport */}
                    <div
                      className="relative mx-auto rounded-2xl overflow-hidden border border-slate-300 select-none bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:16px_16px] bg-slate-100 flex items-center justify-center cursor-crosshair touch-none shadow-inner"
                      style={{
                        aspectRatio: activeDims.w && activeDims.h ? `${activeDims.w} / ${activeDims.h}` : undefined,
                        maxWidth: "100%",
                        maxHeight: "520px",
                        width: "fit-content",
                      }}
                    >
                      <canvas
                        ref={interactiveCanvasRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerLeave}
                        className="w-full h-full block"
                      />

                      {/* Visual Brush Ring Indicator following cursor */}
                      {cursorPos && (
                        <div
                          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed z-40 transition-none"
                          style={{
                            left: `${cursorPos.x}px`,
                            top: `${cursorPos.y}px`,
                            width: `${cursorPos.screenRadius * 2}px`,
                            height: `${cursorPos.screenRadius * 2}px`,
                            borderColor: brushMode === "restore" ? "#10B981" : "#EF4444",
                            backgroundColor:
                              brushMode === "restore" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                          }}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${
                              brushMode === "restore" ? "bg-emerald-600" : "bg-rose-600"
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ─── CASE B: NORMAL VIEW MODES (Split / Result / Side-by-side) ─── */
                  <>
                    {/* 1. Split Slider View Mode */}
                    {viewMode === "split_slider" && (
                      <div
                        className="relative mx-auto rounded-2xl overflow-hidden border border-slate-200 select-none bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:16px_16px] bg-slate-100 flex items-center justify-center"
                        style={{
                          aspectRatio: activeDims.w && activeDims.h ? `${activeDims.w} / ${activeDims.h}` : undefined,
                          maxWidth: "100%",
                          maxHeight: "520px",
                          width: "fit-content",
                        }}
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
                          className="w-full h-full block pointer-events-none"
                        />

                        {/* Processed Result Image (Top Layer clipped by Split Pos) */}
                        <div
                          className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden"
                          style={{ clipPath: `inset(0 0 0 ${splitPos}%)` }}
                        >
                          <img
                            src={processedImageUrl || originalImageUrl}
                            alt="Result"
                            className="w-full h-full block pointer-events-none"
                          />
                        </div>

                        {/* Split Divider Bar */}
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
                      <div
                        className="relative mx-auto rounded-2xl overflow-hidden border border-slate-200 bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%),linear-gradient(-45deg,#e2e8f0_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#e2e8f0_75%),linear-gradient(-45deg,transparent_75%,#e2e8f0_75%)] bg-[length:16px_16px] bg-slate-100 flex items-center justify-center"
                        style={{
                          aspectRatio: activeDims.w && activeDims.h ? `${activeDims.w} / ${activeDims.h}` : undefined,
                          maxWidth: "100%",
                          maxHeight: "520px",
                          width: "fit-content",
                        }}
                      >
                        <img
                          src={processedImageUrl || originalImageUrl}
                          alt="Processed"
                          className="w-full h-full block pointer-events-none"
                        />
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
                  </>
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
