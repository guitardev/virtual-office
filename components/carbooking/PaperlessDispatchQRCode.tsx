"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { CarBookingRequest } from "@/lib/types";

interface PaperlessDispatchQRCodeProps {
  booking: CarBookingRequest;
  size?: number;
  showDetails?: boolean;
  className?: string;
}

export function PaperlessDispatchQRCode({
  booking,
  size = 140,
  showDetails = true,
  className = "",
}: PaperlessDispatchQRCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState<boolean>(false);

  // Construct secure official dispatch payload
  const verificationPayload = JSON.stringify({
    system: "SmartMSO-VirtualOffice",
    service: "GovFleetDispatch",
    version: "2.0",
    reqNo: booking.requestNo,
    plate: booking.licensePlate,
    veh: booking.vehicleName,
    requester: booking.requesterName,
    division: booking.requesterDivision,
    driver: booking.assignedDriver || "พนักงานขับรถเวร",
    departure: booking.departureTime,
    return: booking.returnTime,
    status: booking.status,
    authBy: booking.approverName || "พมจ.กำแพงเพชร",
    authAt: booking.approverActionAt || booking.createdAt,
    checksum: `SM-${booking.id.slice(-6)}-${(booking.requestNo || "").replace(/[^0-9]/g, "")}`,
  });

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(verificationPayload, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: size * 2, // 2x for retina crispness
      color: {
        dark: "#0F172A", // Slate 900
        light: "#FFFFFF",
      },
    })
      .then((url) => {
        if (isMounted) {
          setQrDataUrl(url);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("QR Code generation error:", err);
          setError("สร้าง QR Code ไม่สำเร็จ");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [verificationPayload, size]);

  const isApproved = booking.status === "approved" || booking.status === "completed";

  return (
    <>
      <div
        className={`inline-flex flex-col items-center p-3 rounded-2xl bg-white border border-slate-200 shadow-xs text-center transition-all hover:border-teal-400 group cursor-pointer ${className}`}
        onClick={() => setShowVerifyModal(true)}
        title="คลิกเพื่อตรวจรับกุญแจรถและตรวจสอบความถูกต้องของคำขอ (Dispatch Verification)"
      >
        <div className="relative">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR Code ${booking.requestNo}`}
              style={{ width: `${size}px`, height: `${size}px` }}
              className="rounded-lg object-contain bg-white"
            />
          ) : error ? (
            <div
              style={{ width: `${size}px`, height: `${size}px` }}
              className="flex items-center justify-center bg-slate-100 text-rose-500 text-xs text-center p-2 rounded-lg"
            >
              {error}
            </div>
          ) : (
            <div
              style={{ width: `${size}px`, height: `${size}px` }}
              className="flex items-center justify-center bg-slate-50 text-slate-400 text-xs animate-pulse rounded-lg"
            >
              กำลังสร้าง QR...
            </div>
          )}

          {/* Center Badge Icon */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-7 h-7 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-xs">
              {isApproved ? "🛡️" : "⏳"}
            </div>
          </div>
        </div>

        {showDetails && (
          <div className="mt-2 space-y-0.5">
            <div className="flex items-center justify-center gap-1">
              <span className="font-mono text-[10px] font-bold text-slate-800">
                {booking.requestNo}
              </span>
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                  isApproved
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {isApproved ? "อนุมัติแล้ว" : "รออนุมัติ"}
              </span>
            </div>
            <div className="text-[10px] text-teal-700 font-medium">
              สแกนตรวจรับกุญแจรถ
            </div>
          </div>
        )}
      </div>

      {/* Verification Inspection Modal */}
      {showVerifyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs print:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowVerifyModal(false);
          }}
        >
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🛡️</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    ตรวจรับกุญแจรถและยืนยันการเดินทาง
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Paperless Dispatch Verification • พมจ.กำแพงเพชร
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* QR Centerpiece */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt={`QR Code ${booking.requestNo}`}
                  className="w-44 h-44 rounded-xl bg-white p-2 shadow-sm border border-slate-200"
                />
              )}
              <div className="text-center">
                <span className="font-mono text-xs font-bold px-2 py-0.5 bg-teal-100 text-teal-800 rounded-md">
                  {booking.requestNo}
                </span>
                <div className="text-[11px] text-slate-500 mt-1">
                  Checksum: <span className="font-mono text-slate-700">SM-{booking.id.slice(-6)}</span>
                </div>
              </div>
            </div>

            {/* Dispatch Information Summary */}
            <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-100 text-xs space-y-2 text-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">ยานพาหนะ:</span>
                <span className="font-bold text-slate-900">
                  {booking.vehicleName}{" "}
                  <span className="font-mono text-teal-800">[{booking.licensePlate}]</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">ผู้ขอใช้รถ:</span>
                <span className="font-semibold text-slate-800">
                  {booking.requesterName} ({booking.requesterDivision})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">พนักงานขับรถ:</span>
                <span className="font-semibold text-teal-900">
                  {booking.assignedDriver || "พนักงานขับรถเวร"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">จุดหมายปลายทาง:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[200px]" title={booking.destination}>
                  {booking.destination}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">ช่วงเวลา:</span>
                <span className="font-mono text-[11px] text-slate-800">
                  {booking.departureTime.replace("T", " ")} ➜ {booking.returnTime.replace("T", " ")}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-teal-200/50">
                <span className="text-slate-500">สถานะคำสั่ง:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    isApproved
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {isApproved ? "👑 อนุมัติแล้ว (พร้อมปล่อยรถ)" : "⏳ รอการอนุมัติ"}
                </span>
              </div>
            </div>

            {/* Verification Footer Note */}
            <div className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5 pt-1">
              <span>✅</span>
              <span>
                เจ้าหน้าที่พัสดุและรปภ. สามารถใช้กล้องสมาร์ตโฟนสแกนเพื่อตรวจสอบความถูกต้องได้ทันที
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowVerifyModal(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </>
  );
}
