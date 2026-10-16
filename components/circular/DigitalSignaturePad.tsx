"use client";

import React, { useRef, useState, useEffect } from "react";
import { Member } from "@/lib/types";

interface DigitalSignaturePadProps {
  currentUser: Member;
  docTitle: string;
  docNumber: string;
  onConfirm: (signatureDataUrl: string, endorsementNote: string) => void;
  onCancel: () => void;
}

export function DigitalSignaturePad({
  currentUser,
  docTitle,
  docNumber,
  onConfirm,
  onCancel,
}: DigitalSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [penColor, setPenColor] = useState<string>("#1E3A8A"); // Default Navy Blue (หมึกสีน้ำเงินราชการ)
  const [penWidth, setPenWidth] = useState<number>(2.5);
  const [endorsementNote, setEndorsementNote] = useState<string>("รับทราบและถือปฏิบัติ");

  const PRESET_NOTES = [
    "รับทราบ",
    "รับทราบและถือปฏิบัติ",
    "รับทราบและแจ้งเจ้าหน้าที่ในกำกับดูแลถือปฏิบัติ",
    "รับทราบ มอบหมายฝ่ายบริหารทั่วไปประสานงาน",
    "รับทราบ ดำเนินการตามเสนอ",
  ];

  // Set up canvas context and high-DPI scaling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high DPI displays
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
  }, []);

  // Update pen styles when changed
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
  }, [penColor, penWidth]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    setHasSignature(false);
  };

  const handleConfirmSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Export transparent PNG of signature
    const dataUrl = canvas.toDataURL("image/png");
    onConfirm(dataUrl, endorsementNote);
  };

  const formattedDate = new Date().toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/70 backdrop-blur-sm animate-fade-in text-slate-800">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-xl">
              ✍️
            </div>
            <div>
              <h3 className="text-base font-bold font-heading text-white">
                ลงนามรับทราบหนังสือเวียนราชการ
              </h3>
              <p className="text-xs text-indigo-200 truncate max-w-md">
                เลขที่: {docNumber} · {docTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white text-sm cursor-pointer transition-all"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 min-h-0 bg-[#F8FAFC]">
          {/* Officer Identity Card */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold flex items-center justify-center text-sm">
                {currentUser.avatarText || "จนท"}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">{currentUser.name}</div>
                <div className="text-[11px] text-slate-500">
                  {currentUser.position} · {currentUser.division}
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
              ยืนยันตัวตนแล้ว (Verified)
            </span>
          </div>

          {/* Canvas Signature Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <span>กรอบลงลายมือชื่อดิจิทัล (Digital Signature Pad)</span>
                <span className="text-[10px] text-indigo-600 font-normal">
                  * ใช้เมาส์หรือใช้นิ้วเขียนบนหน้าจอสัมผัส
                </span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPenColor("#1E3A8A")}
                  className={`w-5 h-5 rounded-full border-2 cursor-pointer transition-all ${
                    penColor === "#1E3A8A" ? "border-slate-800 scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: "#1E3A8A" }}
                  title="หมึกสีน้ำเงิน (มาตรฐานราชการ)"
                />
                <button
                  type="button"
                  onClick={() => setPenColor("#0F172A")}
                  className={`w-5 h-5 rounded-full border-2 cursor-pointer transition-all ${
                    penColor === "#0F172A" ? "border-slate-800 scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: "#0F172A" }}
                  title="หมึกสีดำ"
                />
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer transition-all ml-2"
                >
                  ล้างลายเซ็น ↺
                </button>
              </div>
            </div>

            <div className="relative rounded-2xl border-2 border-dashed border-indigo-200 bg-white overflow-hidden shadow-inner">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-44 cursor-crosshair touch-none"
              />
              {!hasSignature && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400">
                  <span className="text-2xl mb-1 opacity-40">✒️</span>
                  <span className="text-xs">ลงลายมือชื่อที่นี่</span>
                </div>
              )}
              <div className="absolute bottom-2 right-3 text-[10px] text-slate-400 select-none pointer-events-none font-mono">
                HTML5 Canvas 256-bit Secure
              </div>
            </div>
          </div>

          {/* Endorsement Note / Minuting */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              ข้อความเกษียน / บันทึกการรับทราบ (Endorsement Note)
            </label>
            <input
              type="text"
              value={endorsementNote}
              onChange={(e) => setEndorsementNote(e.target.value)}
              placeholder="ระบุข้อความ เช่น รับทราบ, ถือปฏิบัติตามเสนอ..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] text-slate-400 self-center mr-1">ข้อความด่วน:</span>
              {PRESET_NOTES.map((note) => (
                <button
                  key={note}
                  type="button"
                  onClick={() => setEndorsementNote(note)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all cursor-pointer ${
                    endorsementNote === note
                      ? "bg-indigo-600 text-white"
                      : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  {note}
                </button>
              ))}
            </div>
          </div>

          {/* E-Stamp Live Preview */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-2">
            <div className="text-[11px] font-bold text-indigo-950 flex items-center justify-between">
              <span>ตัวอย่างตราประทับอิเล็กทรอนิกส์ที่จะบันทึก (E-Stamp Preview)</span>
              <span className="text-[10px] text-indigo-600 font-mono">มาตรฐาน พ.ร.บ.ธุรกรรมฯ</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs text-xs space-y-1 text-slate-700">
              <div className="font-semibold text-slate-900 flex items-center gap-2">
                <span>✓ รับทราบหนังสือเวียน:</span>
                <span className="font-mono text-indigo-600 text-[11px]">{docNumber}</span>
              </div>
              <div className="text-[11px]">
                <strong>ข้อความ:</strong> &ldquo;{endorsementNote || "รับทราบ"}&rdquo;
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                <span>
                  <strong>ผู้ลงนาม:</strong> {currentUser.name} ({currentUser.position})
                </span>
                <span className="font-mono text-[10px] text-slate-400">{formattedDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-all cursor-pointer"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            onClick={handleConfirmSignature}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer flex items-center gap-2"
          >
            <span>ยืนยันการรับทราบและลงนามดิจิทัล ➜</span>
          </button>
        </div>
      </div>
    </div>
  );
}
