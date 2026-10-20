"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";

interface DocumentScannerModalProps {
  onPagesCaptured: (scannedPages: string[], fileName: string) => void;
  onClose: () => void;
  inPage?: boolean;
}

type CameraErrorType = "insecure" | "denied" | "notfound" | "busy" | "unsupported" | "unknown" | null;

interface NasFileItem {
  name: string;
  path: string;
  size: number;
  is_dir: boolean;
}

export function DocumentScannerModal({
  onPagesCaptured,
  onClose,
  inPage = true,
}: DocumentScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraErrorType, setCameraErrorType] = useState<CameraErrorType>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  const [scannedPages, setScannedPages] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<"doc" | "grayscale" | "color">("doc");
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [docTitle, setDocTitle] = useState<string>(`หนังสือราชการสแกน_${new Date().toISOString().slice(0, 10)}.pdf`);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showHelpGuide, setShowHelpGuide] = useState<boolean>(false);

  // Viewfinder mode: camera feed vs attached document/PDF preview
  const [viewfinderMode, setViewfinderMode] = useState<"camera" | "preview">("camera");
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [activePdfBlobUrl, setActivePdfBlobUrl] = useState<string | null>(null);

  // NAS Picker state
  const [showNasPicker, setShowNasPicker] = useState<boolean>(false);
  const [isNasLoading, setIsNasLoading] = useState<boolean>(false);
  const [nasFiles, setNasFiles] = useState<NasFileItem[]>([]);

  // Helper to detect if a file URL or data URL is a PDF
  const isPdfUrl = (url?: string, title?: string) => {
    if (!url) return false;
    return (
      url.startsWith("data:application/pdf") ||
      url.toLowerCase().includes(".pdf") ||
      (title && title.toLowerCase().endsWith(".pdf"))
    );
  };

  // Convert Base64 PDF to native Blob URL for reliable browser preview
  useEffect(() => {
    const currentPage = scannedPages[selectedPageIndex] || scannedPages[0];
    if (!currentPage) {
      setActivePdfBlobUrl(null);
      return;
    }

    if (currentPage.startsWith("data:application/pdf")) {
      try {
        const parts = currentPage.split(",");
        const base64Data = parts[1] || "";
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const blobUrl = URL.createObjectURL(blob);
        setActivePdfBlobUrl(blobUrl);
        return () => {
          URL.revokeObjectURL(blobUrl);
        };
      } catch {
        setActivePdfBlobUrl(currentPage);
      }
    } else if (isPdfUrl(currentPage, docTitle)) {
      setActivePdfBlobUrl(currentPage);
    } else {
      setActivePdfBlobUrl(null);
    }
  }, [scannedPages, selectedPageIndex, docTitle]);

  // Function to stop current stream
  const stopCurrentStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Ensure video element plays whenever stream is attached or changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => {
        console.warn("Video play error:", err);
      });
    }
  }, [stream]);

  // Enumerate video devices
  const updateAvailableDevices = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        setAvailableDevices(videoInputs);
      } catch {
        // ignore device listing errors
      }
    }
  }, []);

  // Start Camera Stream with intelligent fallback
  const startCamera = useCallback(
    async (preferredDeviceId?: string) => {
      setIsInitializing(true);
      setCameraError(null);
      setCameraErrorType(null);
      stopCurrentStream();

      // 1. Check for secure context
      if (
        typeof window !== "undefined" &&
        !window.isSecureContext &&
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1"
      ) {
        setCameraErrorType("insecure");
        setCameraError(
          "เบราว์เซอร์จำเป็นต้องใช้งานผ่านการเชื่อมต่อปลอดภัย HTTPS หรือ localhost เพื่อเปิดใช้งานกล้อง (ตามมาตรฐานความปลอดภัยเว็บ)"
        );
        setIsInitializing(false);
        setCameraActive(false);
        return;
      }

      // 2. Check for getUserMedia API support
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== "function"
      ) {
        setCameraErrorType("unsupported");
        setCameraError("เบราว์เซอร์นี้ไม่รองรับการเข้าถึงกล้องถ่ายภาพ (สามารถอัปโหลดไฟล์ทดแทนได้)");
        setIsInitializing(false);
        setCameraActive(false);
        return;
      }

      try {
        let mediaStream: MediaStream | null = null;

        // Try primary constraints (preferred device or back camera)
        try {
          const videoConstraints: MediaTrackConstraints = preferredDeviceId
            ? { deviceId: { exact: preferredDeviceId } }
            : {
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              };

          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: false,
          });
        } catch {
          // Fallback to minimal video constraint if high-res or facingMode fails
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        streamRef.current = mediaStream;
        setStream(mediaStream);
        setCameraActive(true);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }

        await updateAvailableDevices();
      } catch (err: any) {
        const errName = err?.name || "";
        console.warn("Camera access failed:", errName, err);

        if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
          setCameraErrorType("denied");
          setCameraError(
            "สิทธิ์เข้าถึงกล้องถูกปฏิเสธ: กรุณากดไอคอนแม่กุญแจ 🔒 ที่แถบที่อยู่เว็บ แล้วเลือก 'อนุญาตให้ใช้กล้อง' จากนั้นกดปุ่มลองใหม่อีกครั้ง"
          );
        } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
          setCameraErrorType("notfound");
          setCameraError(
            "ไม่พบอุปกรณ์กล้องหรือเว็บแคมที่เชื่อมต่อกับคอมพิวเตอร์เครื่องนี้ (สามารถเลือกไฟล์ภาพ/PDF หรือใช้ปุ่มจำลองการสแกนได้)"
          );
        } else if (errName === "NotReadableError" || errName === "TrackStartError") {
          setCameraErrorType("busy");
          setCameraError(
            "กล้องกำลังถูกใช้งานโดยแอปพลิเคชันอื่น (เช่น Teams, Zoom, Skype) กรุณาปิดโปรแกรมอื่นแล้วลองเชื่อมต่อใหม่"
          );
        } else {
          setCameraErrorType("unknown");
          setCameraError(
            "ไม่สามารถเริ่มการทำงานของกล้องได้ (" + (err.message || "Unknown hardware error") + ") สามารถอัปโหลดไฟล์ทดแทนได้"
          );
        }
        setCameraActive(false);
      } finally {
        setIsInitializing(false);
      }
    },
    [stopCurrentStream, updateAvailableDevices]
  );

  // Initialize camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCurrentStream();
    };
  }, [startCamera, stopCurrentStream]);

  // Handle device change
  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    startCamera(deviceId);
  };

  // Generate authentic simulated government scanned document
  const handleSimulateScan = () => {
    const pageNum = scannedPages.length + 1;
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1700;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. Realistic paper background with subtle scan tint
    ctx.fillStyle = "#FAF8F5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle paper scan border shadow
    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

    // 2. Thai Garuda Crest (ตราครุฑ)
    const cx = canvas.width / 2;
    ctx.fillStyle = "#1E293B";
    ctx.textAlign = "center";

    // Draw stylized Garuda silhouette
    ctx.beginPath();
    ctx.arc(cx, 110, 28, 0, Math.PI * 2);
    ctx.fillStyle = "#1E293B";
    ctx.fill();
    ctx.font = "bold 22px 'TH Sarabun New', Sarabun, sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText("ตราครุฑ", cx, 118);

    // 3. Official Government Header
    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 44px 'TH Sarabun New', Sarabun, sans-serif";
    ctx.fillText("บันทึกข้อความ", cx, 185);

    // Header Details
    ctx.textAlign = "left";
    ctx.font = "bold 28px 'TH Sarabun New', Sarabun, sans-serif";
    ctx.fillText("ส่วนราชการ", 90, 255);
    ctx.font = "26px 'TH Sarabun New', Sarabun, sans-serif";
    ctx.fillText("สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร โทร. ๐ ๕๕๗๐ ๕๐๒๒", 230, 255);

    ctx.font = "bold 28px 'TH Sarabun New', Sarabun, sans-serif";
    ctx.fillText("ที่", 90, 305);
    ctx.font = "26px 'TH Sarabun New', Sarabun, sans-serif";
    ctx.fillText(`กพ ๐๐๓๒/ว ๔๙${pageNum}  (หน้า ${pageNum})`, 130, 305);

    ctx.font = "bold 28px 'TH Sarabun New', Sarabun, sans-serif";
    ctx.fillText("วันที่", 720, 305);
    ctx.font = "26px 'TH Sarabun New', Sarabun, sans-serif";
    ctx.fillText("๑๕ ตุลาคม ๒๕๖๙", 780, 305);

    ctx.font = "bold 28px 'TH Sarabun New', Sarabun, sans-serif";
    ctx.fillText("เรื่อง", 90, 355);
    ctx.font = "26px 'TH Sarabun New', Sarabun, sans-serif";
    ctx.fillText("แนวทางการปฏิบัติงานราชการอิเล็กทรอนิกส์และระบบเวียนเอกสารเสมือนจริง", 160, 355);

    // Divider line
    ctx.strokeStyle = "#64748B";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(90, 385);
    ctx.lineTo(1110, 385);
    ctx.stroke();

    // "เรียน"
    ctx.font = "bold 28px 'TH Sarabun New', Sarabun, sans-serif";
    ctx.fillText("เรียน  หัวหน้ากลุ่ม/ฝ่าย และบุคลากรสำนักงาน พมจ.กำแพงเพชรทุกท่าน", 90, 435);

    // Body text
    ctx.font = "25px 'TH Sarabun New', Sarabun, sans-serif";
    const bodyText = [
      "      ด้วย สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร ได้พัฒนาระบบสำนักงานเสมือน (Virtual Office)",
      "และระบบเวียนหนังสือราชการอิเล็กทรอนิกส์ เพื่อยกระดับการให้บริการตามพระราชบัญญัติการปฏิบัติราชการทางอิเล็กทรอนิกส์ พ.ศ. ๒๕๖๕",
      "โดยให้บุคลากรทุกท่านสามารถรับทราบ ลงนามกำกับ และติดตามผลการปฏิบัติงานได้อย่างถูกต้อง รวดเร็ว และโปร่งใส",
      "",
      "      ในการนี้ เพื่อให้การขับเคลื่อนระบบเวียนเอกสารราชการเป็นไปด้วยความเรียบร้อย จึงขอให้ทุกกลุ่มงานปฏิบัติตามแนวทางดังนี้:",
      "      ๑. ตรวจสอบและลงนามรับทราบหนังสือเวียนตามกำหนดเวลาอย่างสม่ำเสมอผ่านระบบออนไลน์",
      "      ๒. นำข้อสั่งการและระเบียบที่เกี่ยวข้องไปถ่ายทอดและถือปฏิบัติในหน่วยงานโดยเคร่งครัด",
      "      ๓. บันทึกหลักฐานการรับทราบผ่านลายมือชื่ออิเล็กทรอนิกส์ที่ระบบออกให้เพื่อเป็นหลักฐานอ้างอิง",
      "",
      "      จึงเรียนมาเพื่อโปรดทราบและถือปฏิบัติต่อไป",
    ];

    let currentY = 485;
    for (const line of bodyText) {
      if (line) {
        ctx.fillText(line, 90, currentY);
      }
      currentY += 40;
    }

    // Signatory
    ctx.textAlign = "center";
    ctx.font = "26px 'TH Sarabun New', Sarabun, sans-serif";
    ctx.fillText("(นายสมชาย มั่นคงพัฒนา)", 820, 1060);
    ctx.font = "24px 'TH Sarabun New', Sarabun, sans-serif";
    ctx.fillText("พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร", 820, 1100);

    // Red Official Receipt Stamp (ตราประทับสารบรรณสีแดง)
    ctx.save();
    ctx.translate(960, 190);
    ctx.rotate(-0.05); // slight natural tilt
    ctx.strokeStyle = "rgba(220, 38, 38, 0.85)";
    ctx.lineWidth = 3;
    ctx.strokeRect(-120, -60, 240, 120);

    ctx.fillStyle = "rgba(220, 38, 38, 0.85)";
    ctx.font = "bold 19px 'TH Sarabun New', Sarabun, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("สำนักงาน พมจ.กำแพงเพชร", 0, -30);
    ctx.fillText("เลขรับที่: " + (1420 + pageNum), 0, -5);
    ctx.fillText("วันที่: ๑๕ ต.ค. ๒๕๖๙", 0, 18);
    ctx.fillText("เวลา: ๐๙:๓๐ น. (สแกนผ่านระบบ)", 0, 42);
    ctx.restore();

    // Footer Watermark / Audit verification line
    ctx.font = "16px monospace";
    ctx.fillStyle = "#64748B";
    ctx.textAlign = "left";
    ctx.fillText(
      `SMART MSO ELECTRONIC SCAN • SHA256 VALIDATED • SCAN-REF: KPT-DOC-2569-PAGE-${pageNum}`,
      90,
      1630
    );

    const simulatedDataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setScannedPages((prev) => {
      const next = [...prev, simulatedDataUrl];
      setSelectedPageIndex(next.length - 1);
      return next;
    });
    setViewfinderMode("preview");
  };

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
      setScannedPages((prev) => {
        const next = [...prev, pageDataUrl];
        setSelectedPageIndex(next.length - 1);
        return next;
      });
      setViewfinderMode("preview");
      setIsCapturing(false);
    }, 150);
  };

  // Upload file fallback
  const handleFilesList = (files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      if (file.name) {
        setDocTitle(file.name);
      }
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        if (loadEvent.target?.result) {
          const resultUrl = loadEvent.target.result as string;
          setScannedPages((prev) => {
            const next = [...prev, resultUrl];
            setSelectedPageIndex(next.length - 1);
            return next;
          });
          setViewfinderMode("preview");
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFilesList(e.target.files);
    }
  };

  // Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesList(e.dataTransfer.files);
    }
  };

  // NAS files handling
  const handleOpenNasPicker = async () => {
    setShowNasPicker(true);
    setIsNasLoading(true);
    try {
      const res = await fetch("/api/nas/files?folder_path=/virtual-office/circular_docs");
      const data = await res.json();
      if (data.success && Array.isArray(data.files)) {
        setNasFiles(data.files.filter((f: any) => !f.is_dir));
      } else {
        setNasFiles([]);
      }
    } catch {
      setNasFiles([]);
    } finally {
      setIsNasLoading(false);
    }
  };

  const handleSelectNasFile = (file: NasFileItem) => {
    const fileUrl = `/api/nas/download?file_path=${encodeURIComponent(file.path)}`;
    setScannedPages((prev) => {
      const next = [...prev, fileUrl];
      setSelectedPageIndex(next.length - 1);
      return next;
    });
    setDocTitle(file.name);
    setViewfinderMode("preview");
    setShowNasPicker(false);
  };

  const removePage = (index: number) => {
    setScannedPages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (selectedPageIndex >= next.length) {
        setSelectedPageIndex(Math.max(0, next.length - 1));
      }
      return next;
    });
  };

  const handleFinish = () => {
    if (scannedPages.length === 0) return;
    onPagesCaptured(scannedPages, docTitle);
  };

  const activePage = scannedPages[selectedPageIndex] || scannedPages[0];
  const isCurrentPagePdf = isPdfUrl(activePage, docTitle);

  const scannerBodyAndFooter = (
    <>
      {/* Body */}
      <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 bg-[#F8FAFC] grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Camera / Ingestion Viewfinder */}
        <div className="lg:col-span-7 space-y-3">
          {/* Viewfinder Mode Switcher */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl">
              <button
                type="button"
                onClick={() => setViewfinderMode("camera")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewfinderMode === "camera"
                    ? "bg-white text-indigo-700 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>📷</span>
                <span>กล้องสแกนสด</span>
                {cameraActive && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
              </button>

              {scannedPages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setViewfinderMode("preview")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewfinderMode === "preview"
                      ? "bg-white text-indigo-700 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <span>📄</span>
                  <span>ดูตัวอย่างเอกสาร/PDF</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 text-[10px]">
                    {scannedPages.length}
                  </span>
                </button>
              )}
            </div>

            {viewfinderMode === "preview" && scannedPages.length > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[11px] text-slate-500 font-mono">
                  หน้า {selectedPageIndex + 1} จาก {scannedPages.length}
                </span>
                {activePdfBlobUrl && (
                  <button
                    type="button"
                    onClick={() => window.open(activePdfBlobUrl, "_blank")}
                    className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700 text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <span>🔍 ขยายเต็มจอ</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative rounded-2xl bg-slate-950 overflow-hidden aspect-[4/3] flex items-center justify-center border transition-all ${
              isDragging ? "border-indigo-400 bg-indigo-950/40 ring-4 ring-indigo-500/30" : "border-slate-800 shadow-lg"
            }`}
          >
            {/* Always mounted video element ensures videoRef is never null on initial render */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  videoRef.current.play().catch(() => {});
                }
              }}
              className={`w-full h-full object-cover ${
                viewfinderMode === "camera" && cameraActive ? "block" : "hidden"
              }`}
            />

            {/* PREVIEW MODE: Display active scanned document or PDF */}
            {viewfinderMode === "preview" && activePage ? (
              <div className="w-full h-full relative flex items-center justify-center bg-slate-900">
                {isCurrentPagePdf ? (
                  activePdfBlobUrl ? (
                    <object
                      data={activePdfBlobUrl}
                      type="application/pdf"
                      className="w-full h-full min-h-[380px] rounded-2xl"
                    >
                      <iframe
                        src={activePdfBlobUrl}
                        title="PDF Document Preview"
                        className="w-full h-full min-h-[380px] border-0 rounded-2xl bg-white"
                      />
                    </object>
                  ) : (
                    <div className="p-6 text-center text-white space-y-3">
                      <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-400/30 text-rose-400 flex items-center justify-center text-3xl mx-auto shadow-sm">
                        📄
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{docTitle}</p>
                        <p className="text-xs text-rose-300 mt-0.5">เอกสารแนบ PDF พร้อมนำเข้าสู่ระบบหนังสือเวียน</p>
                      </div>
                    </div>
                  )
                ) : (
                  <img
                    src={activePage}
                    alt={`Scanned preview page ${selectedPageIndex + 1}`}
                    className="max-w-full max-h-full object-contain p-2"
                  />
                )}

                {/* Page Navigation Overlay */}
                {scannedPages.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700 text-white text-xs shadow-lg">
                    <button
                      type="button"
                      disabled={selectedPageIndex === 0}
                      onClick={() => setSelectedPageIndex((p) => Math.max(0, p - 1))}
                      className="hover:text-indigo-300 disabled:opacity-40 cursor-pointer px-1"
                    >
                      ◀ ก่อนหน้า
                    </button>
                    <span className="font-mono text-[11px] text-slate-300">
                      {selectedPageIndex + 1} / {scannedPages.length}
                    </span>
                    <button
                      type="button"
                      disabled={selectedPageIndex === scannedPages.length - 1}
                      onClick={() => setSelectedPageIndex((p) => Math.min(scannedPages.length - 1, p + 1))}
                      className="hover:text-indigo-300 disabled:opacity-40 cursor-pointer px-1"
                    >
                      ถัดไป ▶
                    </button>
                  </div>
                )}
              </div>
            ) : cameraActive ? (
              /* CAMERA ACTIVE MODE: Overlay Guide */
              <div className="absolute inset-8 border-2 border-dashed border-emerald-400/80 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-emerald-300 font-mono bg-black/60 px-2 py-0.5 rounded">
                    🟢 สตรีมกล้องพร้อมทำงาน • กรอบ A4
                  </span>
                  <span className="text-[10px] text-emerald-300 font-mono bg-black/60 px-2 py-0.5 rounded">
                    จัดวางเอกสารให้อยู่ในกรอบ
                  </span>
                </div>
                <span className="text-[10px] text-slate-300 font-mono bg-black/60 px-2 py-0.5 rounded self-center">
                  กดปุ่ม &ldquo;📸 ถ่ายภาพหน้านี้&rdquo; ด้านล่างเพื่อบันทึก
                </span>
              </div>
            ) : (
              /* CAMERA INACTIVE / DIAGNOSTIC MODE */
              <div className="p-6 text-center text-slate-300 space-y-4 max-w-md mx-auto">
                {isInitializing ? (
                  <div className="space-y-3">
                    <div className="w-10 h-10 border-3 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-slate-300">กำลังตรวจหาอุปกรณ์กล้องและเริ่มระบบ...</p>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-3xl mx-auto shadow-inner">
                      {cameraErrorType === "denied" ? "🔒" : cameraErrorType === "notfound" ? "🔌" : "📷"}
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                        {cameraErrorType === "denied" && <span>สิทธิ์เข้าถึงกล้องถูกปิดกั้น</span>}
                        {cameraErrorType === "notfound" && <span>ไม่พบอุปกรณ์กล้องหรือเว็บแคม</span>}
                        {cameraErrorType === "insecure" && <span>ต้องใช้งานผ่าน HTTPS เพื่อเปิดกล้อง</span>}
                        {cameraErrorType === "busy" && <span>กล้องถูกใช้งานโดยโปรแกรมอื่น</span>}
                        {!cameraErrorType && <span>ไม่สามารถเปิดกล้องได้</span>}
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {cameraError || "อุปกรณ์ไม่พร้อมใช้งาน สามารถเลือกรูปภาพ/PDF จากเครื่อง หรือใช้เอกสารจำลองเพื่อทดสอบระบบได้"}
                      </p>
                    </div>

                    {/* Action buttons inside Viewfinder */}
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setViewfinderMode("camera");
                          startCamera(selectedDeviceId);
                        }}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <span>🔄</span>
                        <span>ลองเชื่อมต่อกล้องใหม่</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSimulateScan}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                        title="สร้างตัวอย่างหน้าเอกสารราชการสแกนความละเอียดสูงพร้อมตราครุฑและตรายางรับเรื่อง"
                      >
                        <span>✨</span>
                        <span>จำลองการสแกนเอกสารจริง</span>
                      </button>

                      <label className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm flex items-center gap-1.5">
                        <span>📁</span>
                        <span>เลือกรูปภาพ/PDF</span>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,application/pdf"
                          multiple
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={handleOpenNasPicker}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-800/60 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <span>☁️</span>
                        <span>คลังสแกน NAS</span>
                      </button>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setShowHelpGuide(!showHelpGuide)}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-medium cursor-pointer"
                      >
                        {showHelpGuide ? "ซ่อนคำแนะนำสิทธิ์กล้อง ▲" : "💡 วิธีเปิดสิทธิ์กล้องในเบราว์เซอร์และ Windows ▼"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Shutter flash animation */}
            {isCapturing && (
              <div className="absolute inset-0 bg-white animate-fade-in pointer-events-none opacity-80" />
            )}
          </div>

          {/* Help Guide Box (Collapsible) */}
          {showHelpGuide && (
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-xs text-slate-700 space-y-2 animate-fade-in">
              <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                <span>💡</span>
                <span>คำแนะนำการเปิดใช้งานกล้องสแกนเอกสาร:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-600">
                <li>
                  <strong>บน Google Chrome / Microsoft Edge:</strong> คลิกไอคอน 🔒 หรือ ⚙️ ที่ด้านซ้ายสุดของช่องกรอก URL &gt; ไปที่เมนู <em>&ldquo;สิทธิ์การเข้าถึงเว็บไซต์ (Site permissions)&rdquo;</em> &gt; เปลี่ยนการตั้งค่า <em>&ldquo;กล้อง (Camera)&rdquo;</em> เป็น <strong>&ldquo;อนุญาต (Allow)&rdquo;</strong> แล้วรีเฟรชหน้าจอ
                </li>
                <li>
                  <strong>บนคอมพิวเตอร์ตั้งโต๊ะ (PC):</strong> หากไม่ได้เสียบเว็บแคม USB สามารถคลิกปุ่ม <strong>&ldquo;✨ จำลองการสแกนเอกสารจริง&rdquo;</strong> หรือเลือกไฟล์จากเครื่อง/NAS ได้ทันที
                </li>
                <li>
                  <strong>บนมือถือ/แท็บเล็ต:</strong> ระบบจะเลือกกล้องหลัง (Environment Camera) ที่มีความละเอียดสูงเพื่อสแกนเอกสารโดยอัตโนมัติ
                </li>
              </ul>
            </div>
          )}

          {/* Camera Controls & Device Selector Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-white border border-slate-200 text-xs">
            {/* Filter Mode */}
            <div className="flex items-center gap-1.5">
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

            {/* Camera Switcher if multiple devices found */}
            {availableDevices.length > 1 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400">สลับกล้อง:</span>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => handleDeviceChange(e.target.value)}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700 max-w-[160px] truncate"
                >
                  <option value="">(กล้องมาตรฐาน)</option>
                  {availableDevices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `กล้องตัวที่ ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Shutter Button when camera is active */}
            {cameraActive && (
              <button
                type="button"
                onClick={captureFrame}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition-all ml-auto"
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
                {scannedPages.length} รายการ
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={handleSimulateScan}
                className="font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
              >
                + สแกนจำลอง
              </button>
              <span className="text-slate-300">|</span>
              <label className="font-bold text-emerald-600 hover:text-emerald-800 cursor-pointer">
                + เพิ่มไฟล์/PDF
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Scanned Pages Thumbnails Container */}
          <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-3 overflow-y-auto min-h-[260px] max-h-[380px] space-y-3">
            {scannedPages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-10 space-y-3">
                <span className="text-4xl">📭</span>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-600 block">ยังไม่มีหน้าที่สแกน</span>
                  <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                    ถ่ายภาพผ่านกล้อง, กด &ldquo;จำลองการสแกน&rdquo; หรือลากไฟล์ภาพ/PDF มาวางในกรอบกล้อง
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSimulateScan}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold cursor-pointer transition-all"
                  >
                    ✨ สแกนตัวอย่าง ๑ หน้า
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {scannedPages.map((pageUrl, idx) => {
                  const isPdf = isPdfUrl(pageUrl, docTitle);
                  const isSelected = viewfinderMode === "preview" && selectedPageIndex === idx;

                  return (
                    <div
                      key={idx}
                      className={`group relative rounded-xl border overflow-hidden transition-all shadow-2xs ${
                        isSelected
                          ? "ring-2 ring-indigo-500 border-indigo-400 bg-indigo-50/20"
                          : "border-slate-200 bg-slate-50 hover:border-indigo-300"
                      }`}
                    >
                      {isPdf ? (
                        /* PDF Specific Card with official badge (avoids broken img tag) */
                        <div
                          onClick={() => {
                            setSelectedPageIndex(idx);
                            setViewfinderMode("preview");
                          }}
                          className="w-full h-36 flex flex-col items-center justify-center p-2.5 text-center cursor-pointer bg-gradient-to-b from-rose-50/70 to-slate-50"
                        >
                          <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center text-xs font-black shadow-xs mb-1.5">
                            PDF
                          </div>
                          <p className="text-[11px] font-bold text-slate-800 truncate max-w-full px-1">
                            {docTitle.endsWith(".pdf") ? docTitle : `${docTitle}.pdf`}
                          </p>
                          <span className="text-[10px] text-rose-600 font-semibold mt-0.5">
                            เอกสารดิจิทัล PDF
                          </span>
                          <span className="mt-1.5 text-[9px] text-indigo-600 font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                            👁️ ดูตัวอย่าง
                          </span>
                        </div>
                      ) : (
                        /* Standard Scanned Image Thumbnail */
                        <img
                          src={pageUrl}
                          alt={`Scanned page ${idx + 1}`}
                          onClick={() => {
                            setSelectedPageIndex(idx);
                            setViewfinderMode("preview");
                          }}
                          className="w-full h-36 object-contain bg-slate-900/5 p-1 cursor-pointer"
                        />
                      )}

                      <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-slate-900/80 text-white text-[10px] font-bold pointer-events-none">
                        {isPdf ? "PDF" : `หน้า ${idx + 1}`}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePage(idx);
                        }}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-rose-600/90 hover:bg-rose-700 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                        title="ลบเอกสารนี้"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
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
      <div className="px-4 sm:px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-all cursor-pointer"
        >
          ยกเลิก
        </button>

        <div className="flex items-center gap-2">
          {scannedPages.length === 0 && (
            <button
              type="button"
              onClick={handleSimulateScan}
              className="px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all cursor-pointer"
            >
              ✨ สแกนจำลองอัตโนมัติ
            </button>
          )}

          <button
            type="button"
            disabled={scannedPages.length === 0}
            onClick={handleFinish}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            <span>นำเข้าหนังสือเวียน ({scannedPages.length} รายการ) ➜</span>
          </button>
        </div>
      </div>

      {/* NAS Picker Drawer/Modal */}
      {showNasPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="text-xl">☁️</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">คลังเอกสารสแกน Synology NAS</h4>
                  <p className="text-[10px] text-slate-500 font-mono">/virtual-office/circular_docs</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNasPicker(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-500 flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-2 text-xs">
              {isNasLoading ? (
                <div className="py-8 text-center text-slate-400 space-y-2">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs">กำลังติดต่อ Synology File Station...</p>
                </div>
              ) : nasFiles.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <p className="text-2xl mb-1">📂</p>
                  <p>ไม่พบไฟล์เอกสารในโฟลเดอร์นี้</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {nasFiles.map((file) => (
                    <div
                      key={file.path}
                      onClick={() => handleSelectNasFile(file)}
                      className="p-2.5 rounded-xl border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg">📄</span>
                        <div className="truncate">
                          <p className="font-bold text-slate-700 group-hover:text-indigo-600 truncate">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {(file.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-indigo-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        เลือก ➜
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowNasPicker(false)}
                className="px-4 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (inPage) {
    return (
      <div data-testid="document-scanner-view" className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in text-slate-800 pb-12">
        {/* In-page Header */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-xs sm:text-sm transition-colors cursor-pointer"
            >
              <span>←</span>
              <span>ย้อนกลับไปรายการหนังสือเวียน</span>
            </button>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-xl">
              📷
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-heading text-slate-800">
                ระบบสแกนหนังสือราชการเข้าระบบ (Live Document Scanner)
              </h3>
              <p className="text-xs text-slate-500">
                สแกนเอกสารจริงผ่านกล้อง, อัปโหลดไฟล์ภาพ, ดูตัวอย่าง PDF หรือดึงจากคลังสแกน NAS
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-all cursor-pointer"
            >
              ยกเลิก
            </button>
          </div>
        </div>

        {/* In-page Content Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {scannerBodyAndFooter}
        </div>
      </div>
    );
  }

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
                สแกนเอกสารจริงผ่านกล้อง, อัปโหลดไฟล์ภาพ/PDF, เพื่อรวมเล่มเป็นหนังสือเวียนอิเล็กทรอนิกส์
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

        {scannerBodyAndFooter}
      </div>
    </div>
  );
}
