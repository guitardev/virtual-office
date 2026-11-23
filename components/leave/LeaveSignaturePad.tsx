"use client";

import React, { useEffect, useRef, useState } from "react";

interface LeaveSignaturePadProps {
  userId?: string;
  label?: string;
  value?: string | null;
  onChange: (dataUrl: string | null) => void;
  compact?: boolean;
}

const MAX_EXPORT_W = 360;
const MAX_EXPORT_H = 120;

function exportNormalizedPng(sourceCanvas: HTMLCanvasElement): string {
  const out = document.createElement("canvas");
  out.width = MAX_EXPORT_W;
  out.height = MAX_EXPORT_H;
  const octx = out.getContext("2d");
  if (!octx) return sourceCanvas.toDataURL("image/png");
  octx.clearRect(0, 0, MAX_EXPORT_W, MAX_EXPORT_H);
  octx.drawImage(sourceCanvas, 0, 0, MAX_EXPORT_W, MAX_EXPORT_H);
  return out.toDataURL("image/png");
}

export default function LeaveSignaturePad({
  userId,
  label = "ลงลายมือชื่ออิเล็กทรอนิกส์ (Digital Signature)",
  value,
  onChange,
  compact = false,
}: LeaveSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasInk, setHasInk] = useState(Boolean(value));
  const [penColor, setPenColor] = useState<string>("#1E3A8A");
  const [savedPersonalSig, setSavedPersonalSig] = useState<string | null>(null);

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

  // Setup High-DPI canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(280, Math.round(rect.width || 360));
    const h = Math.max(96, Math.round(rect.height || (compact ? 104 : 128)));
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.4;

    if (value && value.startsWith("data:image/")) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, w, h);
        const scale = Math.min(w / img.width, h / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
        setHasInk(true);
      };
      img.src = value;
    }
  }, [compact]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 2.4;
  }, [penColor]);

  // Sync external clear
  useEffect(() => {
    if (!value) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const dpr = window.devicePixelRatio || 1;
        ctx?.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      }
      setHasInk(false);
    } else if (value.startsWith("data:image/")) {
      drawDataUrlToCanvas(value);
    }
  }, [value]);

  const drawDataUrlToCanvas = (dataUrl: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, w, h);
      const scale = Math.min(w / img.width, h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      setHasInk(true);
    };
    img.src = dataUrl;
  };

  const getCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const t = e.touches[0];
      if (!t) return { x: 0, y: 0 };
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleStart = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const handleMove = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasInk) setHasInk(true);
  };

  const handleEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas && hasInk) {
      onChange(exportNormalizedPng(canvas));
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      const dpr = window.devicePixelRatio || 1;
      ctx?.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    }
    setHasInk(false);
    onChange(null);
  };

  const handleSavePersonalSig = () => {
    if (!storageKey || !canvasRef.current || !hasInk) return;
    const dataUrl = exportNormalizedPng(canvasRef.current);
    try {
      localStorage.setItem(storageKey, dataUrl);
      setSavedPersonalSig(dataUrl);
      onChange(dataUrl);
    } catch {
      // ignore storage errors
    }
  };

  const handleApplySavedSig = () => {
    if (!savedPersonalSig) return;
    drawDataUrlToCanvas(savedPersonalSig);
    onChange(savedPersonalSig);
  };

  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || "");
      if (!src) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, w, h);
        const scale = Math.min(w / img.width, h / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
        setHasInk(true);
        onChange(exportNormalizedPng(canvas));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
          <span>✍️ {label}</span>
          {hasInk && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
              ✓ ลงลายชื่อแล้ว
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setPenColor("#1E3A8A")}
            title="หมึกสีน้ำเงินราชการ"
            className={`w-4 h-4 rounded-full border-2 cursor-pointer ${
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
            className={`w-4 h-4 rounded-full border-2 cursor-pointer ${
              penColor === "#0F172A"
                ? "border-indigo-500 scale-110"
                : "border-transparent"
            }`}
            style={{ backgroundColor: "#0F172A" }}
          />
          {savedPersonalSig && (
            <button
              type="button"
              onClick={handleApplySavedSig}
              className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 text-[11px] font-semibold cursor-pointer"
            >
              ✨ ใช้ลายเซ็นที่บันทึก
            </button>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
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
          {hasInk && (
            <>
              {storageKey && (
                <button
                  type="button"
                  onClick={handleSavePersonalSig}
                  className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-[11px] font-semibold cursor-pointer"
                >
                  💾 บันทึกไว้ใช้
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

      <div className="relative rounded-xl border-2 border-dashed border-indigo-200 dark:border-indigo-800/70 bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          className={`w-full ${compact ? "h-24" : "h-28"} cursor-crosshair touch-none block`}
        />
        {!hasInk && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400">
            <span className="text-xs">ใช้นิ้วหรือเมาส์เซ็นชื่อที่นี่ (หรือใช้ลายเซ็นที่บันทึกไว้)</span>
          </div>
        )}
      </div>
    </div>
  );
}
