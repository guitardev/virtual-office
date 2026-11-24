"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  exportTrimmedSignaturePng,
  stripNearWhiteBackground,
} from "@/lib/leave-signature-utils";

interface LeaveSignaturePadProps {
  userId?: string;
  label?: string;
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  compact?: boolean;
}

type PenWeight = "thin" | "medium" | "thick";
type SizePreset = "sm" | "md" | "lg";

const PEN_WIDTH_MAP: Record<PenWeight, number> = {
  thin: 1.8,
  medium: 2.6,
  thick: 3.6,
};

const SIZE_PRESET_SCALE: Record<SizePreset, number> = {
  sm: 0.78,
  md: 1.0,
  lg: 1.2,
};

const MAX_HISTORY = 20;

export default function LeaveSignaturePad({
  userId,
  label = "ลงลายมือชื่ออิเล็กทรอนิกส์ (Digital Signature)",
  value,
  onChange,
  compact = false,
}: LeaveSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isDrawingRef = useRef(false);
  const hasInkRef = useRef(Boolean(value));
  const lastEmittedRef = useRef<string | null>(value ?? null);
  const historyRef = useRef<ImageData[]>([]);
  const dprRef = useRef(1);
  const logicalSizeRef = useRef({ w: 480, h: compact ? 120 : 144 });

  const [hasInk, setHasInk] = useState(Boolean(value));
  const [canUndo, setCanUndo] = useState(false);
  const [penColor, setPenColor] = useState<string>("#1E3A8A");
  const [penWeight, setPenWeight] = useState<PenWeight>("medium");
  const [sizePreset, setSizePreset] = useState<SizePreset>("md");
  const [savedPersonalSig, setSavedPersonalSig] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const storageKey = userId ? `smartmso_leave_sig_${userId}` : "";

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      const cached = localStorage.getItem(storageKey);
      if (cached && cached.startsWith("data:image/")) {
        setSavedPersonalSig(cached);
      }
    } catch {
      // ignore storage errors
    }
  }, [storageKey]);

  const applyPenStyle = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = penColor;
      ctx.fillStyle = penColor;
      ctx.lineWidth = PEN_WIDTH_MAP[penWeight];
    },
    [penColor, penWeight]
  );

  const drawDataUrlToCanvas = useCallback(
    (dataUrl: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      const { w, h } = logicalSizeRef.current;
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, w, h);
        const padX = Math.round(w * 0.08);
        const padY = Math.round(h * 0.14);
        const availW = Math.max(40, w - padX * 2);
        const availH = Math.max(24, h - padY * 2);
        const scale = Math.min(availW / img.width, availH / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
        hasInkRef.current = true;
        setHasInk(true);
      };
      img.src = dataUrl;
    },
    []
  );

  // Initialize High-DPI canvas once per compact mode
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(280, Math.round(rect.width || 480));
    const h = Math.max(112, Math.round(rect.height || (compact ? 120 : 144)));
    dprRef.current = dpr;
    logicalSizeRef.current = { w, h };

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    applyPenStyle(ctx);

    if (value && value.startsWith("data:image/")) {
      lastEmittedRef.current = value;
      drawDataUrlToCanvas(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact]);

  // Keep stroke style updated when user changes color or thickness
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    applyPenStyle(ctx);
  }, [applyPenStyle]);

  // Sync external value changes ONLY (skip values we just emitted ourselves so canvas never jumps)
  useEffect(() => {
    if (value === lastEmittedRef.current) return;
    lastEmittedRef.current = value ?? null;

    const canvas = canvasRef.current;
    if (!value) {
      if (canvas) {
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const { w, h } = logicalSizeRef.current;
        ctx?.clearRect(0, 0, w, h);
      }
      historyRef.current = [];
      setCanUndo(false);
      hasInkRef.current = false;
      setHasInk(false);
    } else if (value.startsWith("data:image/")) {
      historyRef.current = [];
      setCanUndo(false);
      drawDataUrlToCanvas(value);
    }
  }, [value, drawDataUrlToCanvas]);

  const emitCanvas = useCallback(
    (overridePreset?: SizePreset) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const preset = overridePreset ?? sizePreset;
      const exported = exportTrimmedSignaturePng(canvas, SIZE_PRESET_SCALE[preset]);
      lastEmittedRef.current = exported;
      hasInkRef.current = Boolean(exported);
      setHasInk(Boolean(exported));
      onChange(exported);
      return exported;
    },
    [onChange, sizePreset]
  );

  const pushHistorySnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    try {
      const snap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      historyRef.current.push(snap);
      if (historyRef.current.length > MAX_HISTORY) {
        historyRef.current.shift();
      }
      setCanUndo(historyRef.current.length > 0);
    } catch {
      // ignore
    }
  };

  const getPointerCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const { w, h } = logicalSizeRef.current;
    const scaleX = rect.width ? w / rect.width : 1;
    const scaleY = rect.height ? h / rect.height : 1;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // ignore unsupported pointer capture
    }

    pushHistorySnapshot();
    applyPenStyle(ctx);

    const { x, y } = getPointerCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    // Draw initial dot so single taps (e.g. periods/accents) register cleanly
    ctx.arc(x, y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y);

    isDrawingRef.current = true;
    if (!hasInkRef.current) {
      hasInkRef.current = true;
      setHasInk(true);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return;

    const { x, y } = getPointerCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        if (canvas.hasPointerCapture(e.pointerId)) {
          canvas.releasePointerCapture(e.pointerId);
        }
      } catch {
        // ignore
      }
      emitCanvas();
    }
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx || historyRef.current.length === 0) return;

    const prev = historyRef.current.pop();
    setCanUndo(historyRef.current.length > 0);
    if (prev) {
      ctx.putImageData(prev, 0, 0);
      emitCanvas();
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const { w, h } = logicalSizeRef.current;
      ctx?.clearRect(0, 0, w, h);
    }
    historyRef.current = [];
    setCanUndo(false);
    hasInkRef.current = false;
    setHasInk(false);
    lastEmittedRef.current = null;
    onChange(null);
  };

  const handleSizePresetChange = (next: SizePreset) => {
    setSizePreset(next);
    if (hasInkRef.current) {
      emitCanvas(next);
    }
  };

  const handleSavePersonalSig = () => {
    if (!storageKey || !hasInkRef.current) return;
    const dataUrl = emitCanvas();
    if (!dataUrl) return;
    try {
      localStorage.setItem(storageKey, dataUrl);
      setSavedPersonalSig(dataUrl);
      setSaveFeedback("บันทึกแล้ว");
      setTimeout(() => setSaveFeedback(null), 2000);
    } catch {
      // ignore storage errors
    }
  };

  const handleApplySavedSig = () => {
    if (!savedPersonalSig) return;
    pushHistorySnapshot();
    lastEmittedRef.current = savedPersonalSig;
    drawDataUrlToCanvas(savedPersonalSig);
    onChange(savedPersonalSig);
  };

  const handleDeleteSavedSig = () => {
    if (!storageKey) return;
    try {
      localStorage.removeItem(storageKey);
      setSavedPersonalSig(null);
    } catch {
      // ignore
    }
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || "");
      if (!src) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d", { willReadFrequently: true });
      if (!canvas || !ctx) return;
      const { w, h } = logicalSizeRef.current;
      const img = new Image();
      img.onload = () => {
        pushHistorySnapshot();

        // Process uploaded image on an offscreen canvas to remove white paper background
        const tmp = document.createElement("canvas");
        const maxSide = 900;
        const ratio = Math.min(1, maxSide / Math.max(img.width, img.height));
        tmp.width = Math.max(1, Math.round(img.width * ratio));
        tmp.height = Math.max(1, Math.round(img.height * ratio));
        const tctx = tmp.getContext("2d", { willReadFrequently: true });
        if (tctx) {
          tctx.drawImage(img, 0, 0, tmp.width, tmp.height);
          const imgData = tctx.getImageData(0, 0, tmp.width, tmp.height);
          stripNearWhiteBackground(imgData.data);
          tctx.putImageData(imgData, 0, 0);
        }

        const source = tctx ? tmp : img;
        const padX = Math.round(w * 0.08);
        const padY = Math.round(h * 0.12);
        const availW = Math.max(40, w - padX * 2);
        const availH = Math.max(24, h - padY * 2);
        const scale = Math.min(availW / source.width, availH / source.height);
        const dw = source.width * scale;
        const dh = source.height * scale;

        ctx.clearRect(0, 0, w, h);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(source, (w - dw) / 2, (h - dh) / 2, dw, dh);
        emitCanvas();
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const previewImgUrl = value || lastEmittedRef.current;

  return (
    <div className="space-y-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-3.5">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
          <span>✍️ {label}</span>
          {hasInk && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
              ✓ ลงลายมือชื่อแล้ว
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Ink Color */}
          <div
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
            title="สีหมึกปากกา"
          >
            <button
              type="button"
              onClick={() => setPenColor("#1E3A8A")}
              title="หมึกสีน้ำเงินราชการ"
              className={`w-4 h-4 rounded-full border-2 cursor-pointer transition-transform ${
                penColor === "#1E3A8A"
                  ? "border-slate-900 dark:border-white scale-110"
                  : "border-transparent"
              }`}
              style={{ backgroundColor: "#1E3A8A" }}
            />
            <button
              type="button"
              onClick={() => setPenColor("#0F172A")}
              title="หมึกสีดำ"
              className={`w-4 h-4 rounded-full border-2 cursor-pointer transition-transform ${
                penColor === "#0F172A"
                  ? "border-indigo-500 scale-110"
                  : "border-transparent"
              }`}
              style={{ backgroundColor: "#0F172A" }}
            />
          </div>

          {/* Pen Thickness */}
          <div
            className="flex items-center rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden"
            title="ขนาดเส้นปากกา"
          >
            {(
              [
                { id: "thin", label: "บาง" },
                { id: "medium", label: "กลาง" },
                { id: "thick", label: "หนา" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPenWeight(opt.id)}
                className={`px-1.5 py-0.5 text-[10px] font-semibold cursor-pointer transition-colors ${
                  penWeight === opt.id
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Saved Personal Signature */}
          {savedPersonalSig && (
            <div className="inline-flex items-center rounded-lg overflow-hidden border border-indigo-200 dark:border-indigo-800">
              <button
                type="button"
                onClick={handleApplySavedSig}
                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 text-[11px] font-semibold cursor-pointer"
              >
                ✨ ใช้ลายเซ็นที่บันทึก
              </button>
              <button
                type="button"
                onClick={handleDeleteSavedSig}
                title="ลบลายเซ็นที่บันทึกไว้"
                className="px-1.5 py-1 bg-indigo-50/70 hover:bg-rose-100 text-slate-400 hover:text-rose-600 dark:bg-indigo-950/40 dark:hover:bg-rose-950/60 text-[10px] cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Upload Image */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="อัปโหลดรูปลายเซ็น (ระบบตัดพื้นหลังสีขาวและปรับขนาดให้อัตโนมัติ)"
            className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold cursor-pointer"
          >
            📁 อัปโหลดรูป
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleUploadImage}
            className="hidden"
          />

          {/* Undo */}
          {canUndo && (
            <button
              type="button"
              onClick={handleUndo}
              title="ย้อนกลับเส้นล่าสุด"
              className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold cursor-pointer"
            >
              ↩ ย้อนกลับ
            </button>
          )}

          {hasInk && (
            <>
              {storageKey && (
                <button
                  type="button"
                  onClick={handleSavePersonalSig}
                  className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[11px] font-semibold cursor-pointer"
                >
                  {saveFeedback ? `✓ ${saveFeedback}` : "💾 บันทึกไว้ใช้"}
                </button>
              )}
              <button
                type="button"
                onClick={handleClear}
                className="px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-semibold cursor-pointer"
              >
                ล้าง ↺
              </button>
            </>
          )}
        </div>
      </div>

      {/* Drawing Canvas with balanced 3.4:1 aspect box & baseline guide */}
      <div className="mx-auto w-full max-w-[520px] relative rounded-xl border-2 border-dashed border-indigo-200 dark:border-indigo-800/70 bg-white overflow-hidden shadow-2xs">
        {/* Subtle baseline guide (CSS only, never exported into PNG) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 bottom-5 border-b border-dotted border-slate-300/80"
        />
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`w-full ${compact ? "h-[120px]" : "h-[144px]"} cursor-crosshair touch-none block relative z-10`}
        />
        {!hasInk && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400 px-3 text-center">
            <span className="text-xs font-medium">
              ใช้นิ้ว เมาส์ หรือปากกาเซ็นชื่อบนเส้นประนี้
            </span>
            <span className="text-[10px] text-slate-400/90 mt-0.5">
              ระบบจัดขอบและปรับขนาดลายเซ็นให้พอดีกับแบบฟอร์ม A4 / Word / PDF อัตโนมัติ
            </span>
          </div>
        )}
      </div>

      {/* Live Document Scale Preview + Fine Size Preset */}
      {hasInk && previewImgUrl && (
        <div className="mx-auto w-full max-w-[520px] flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900/70 px-3 py-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
              ตัวอย่างบนใบลา:
            </span>
            <div className="inline-flex flex-col items-center leading-none">
              <img
                src={previewImgUrl}
                alt="ตัวอย่างลายเซ็นบนเอกสาร"
                className="h-9 max-w-[140px] object-contain -mb-2 relative z-10"
              />
              <div className="text-[11px] text-slate-600 dark:text-slate-300 font-serif whitespace-nowrap">
                (ลงชื่อ) .................................
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 mr-0.5">
              ขนาด:
            </span>
            {(
              [
                { id: "sm", label: "เล็ก" },
                { id: "md", label: "พอดี" },
                { id: "lg", label: "ใหญ่" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSizePresetChange(opt.id)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-semibold cursor-pointer transition-colors ${
                  sizePreset === opt.id
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
