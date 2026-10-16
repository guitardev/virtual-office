"use client";

import React, { useRef, useState, useEffect } from "react";

interface DocumentScannerModalProps {
  onPagesCaptured: (scannedPages: string[], fileName: string) => void;
  onClose: () => void;
}

export function DocumentScannerModal({ onPagesCaptured, onClose }: DocumentScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedPages, setScannedPages] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<"doc" | "grayscale" | "color">("doc");
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [docTitle, setDocTitle] = useState<string>(`หนังสือราชการสแกน_${new Date().toISOString().slice(0, 10)}.pdf`);

  // Start Camera Stream
  useEffect(() => {
    let currentStream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        setCameraError(null);
        // Request back/environment camera if available on mobile/tablet
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        currentStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
          setCameraActive(true);
        }
      } catch (err: any) {
        console.warn("Camera access failed or unavailable:", err);
        setCameraError("ไม่พบอุปกรณ์กล้องหรือเบราว์เซอร์ไม่ได้รับอนุญาตให้เข้าถึงกล้อง (สามารถอัปโหลดไฟล์ทดแทนได้)");
        setCameraActive(false);
      }
    };

    if (typeof navigator !== "undefined" && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function") {
      startCamera();
    } else {
      setCameraError("เบราว์เซอร์นี้ไม่รองรับการเข้าถึงกล้องสด (สามารถอัปโหลดไฟล์ทดแทนได้)");
    }

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Capture current frame from camera
  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || !cameraActive) return;

    setIsCapturing(true);
    setTimeout(() => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw original frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Apply Enhancement Filter
      if (activeFilter === "doc" || activeFilter === "grayscale") {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Grayscale luminosity
          let gray = 0.299 * r + 0.587 * g + 0.114 * b;

          if (activeFilter === "doc") {
            // High contrast document filter: sharpen text, clean background
            gray = gray > 140 ? Math.min(255, gray * 1.25) : gray * 0.75;
          }

          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        }
        ctx.putImageData(imgData, 0, 0);
      }

      const pageDataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setScannedPages((prev) => [...prev, pageDataUrl]);
      setIsCapturing(false);
    }, 150);
  };

  // Upload file fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        if (loadEvent.target?.result) {
          setScannedPages((prev) => [...prev, loadEvent.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePage = (index: number) => {
    setScannedPages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFinish = () => {
    if (scannedPages.length === 0) return;
    onPagesCaptured(scannedPages, docTitle);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in text-slate-800">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-xl">
              📷
            </div>
            <div>
              <h3 className="text-base font-bold font-heading text-white">
                ระบบสแกนหนังสือราชการเข้าระบบ (Live Document Scanner)
              </h3>
              <p className="text-xs text-indigo-200">
                สแกนเอกสารจริงผ่านกล้อง หรืออัปโหลดไฟล์ภาพ เพื่อรวมเล่มเป็นหนังสือเวียนอิเล็กทรอนิกส์
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white text-sm cursor-pointer transition-all"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 min-h-0 bg-[#F8FAFC] grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Live Camera / Ingestion Viewfinder */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative rounded-2xl bg-black overflow-hidden aspect-[4/3] flex items-center justify-center border border-slate-800 shadow-lg">
              {cameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* A4 Document Overlay Guide */}
                  <div className="absolute inset-8 border-2 border-dashed border-emerald-400/80 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                    <span className="text-[10px] text-emerald-300 font-mono bg-black/60 px-2 py-0.5 rounded self-start">
                      กรอบเอกสาร A4
                    </span>
                    <span className="text-[10px] text-emerald-300 font-mono bg-black/60 px-2 py-0.5 rounded self-end">
                      จัดวางเอกสารให้อยู่ในกรอบ
                    </span>
                  </div>
                </>
              ) : (
                <div className="p-6 text-center text-slate-400 space-y-3">
                  <div className="text-4xl">📷</div>
                  <div className="text-xs text-slate-300 max-w-xs mx-auto">
                    {cameraError || "กำลังเตรียมความพร้อมของกล้องสแกน..."}
                  </div>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm">
                    <span>📁 เลือกรูปภาพจากเครื่อง</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Shutter flash animation */}
              {isCapturing && (
                <div className="absolute inset-0 bg-white animate-fade-in pointer-events-none opacity-80" />
              )}
            </div>

            {/* Filter Selector & Camera Action Bar */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[11px] font-bold text-slate-500 mr-1">โหมดภาพ:</span>
                <button
                  type="button"
                  onClick={() => setActiveFilter("doc")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeFilter === "doc"
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  📄 เอกสารคมชัด
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("grayscale")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeFilter === "grayscale"
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  ขาว-ดำ
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("color")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeFilter === "color"
                      ? "bg-indigo-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  สีจริง
                </button>
              </div>

              {cameraActive && (
                <button
                  type="button"
                  onClick={captureFrame}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <span>📸 ถ่ายภาพหน้านี้</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Multi-page Scanned Queue */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span>📑 หน้าเอกสารที่สแกนแล้ว</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px]">
                  {scannedPages.length} หน้า
                </span>
              </div>
              <label className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer">
                + เพิ่มไฟล์จากเครื่อง
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Scanned Pages Thumbnails Container */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-3 overflow-y-auto min-h-[260px] max-h-[380px] space-y-3">
              {scannedPages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-10 space-y-2">
                  <span className="text-3xl">📭</span>
                  <span className="text-xs">ยังไม่มีหน้าที่สแกน</span>
                  <span className="text-[11px] text-slate-400">
                    กดปุ่ม &ldquo;ถ่ายภาพหน้านี้&rdquo; หรือเลือกไฟล์จากเครื่อง
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {scannedPages.map((pageUrl, idx) => (
                    <div
                      key={idx}
                      className="group relative rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shadow-2xs"
                    >
                      <img
                        src={pageUrl}
                        alt={`Scanned page ${idx + 1}`}
                        className="w-full h-36 object-contain bg-slate-900/5 p-1"
                      />
                      <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-slate-900/80 text-white text-[10px] font-bold">
                        หน้า {idx + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() => removePage(idx)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-rose-600/90 hover:bg-rose-700 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="ลบหน้านี้"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Document Name input */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                ตั้งชื่อไฟล์หนังสือที่สแกน
              </label>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-all cursor-pointer"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            disabled={scannedPages.length === 0}
            onClick={handleFinish}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            <span>นำเข้าหนังสือเวียน ({scannedPages.length} หน้า) ➜</span>
          </button>
        </div>
      </div>
    </div>
  );
}
