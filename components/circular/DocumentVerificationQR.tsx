"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";

interface DocumentVerificationQRProps {
  docId: string;
  docNumber: string;
  issuedDate?: string;
  size?: number;
  className?: string;
}

/**
 * QR Code ตรวจสอบความถูกต้องของเอกสารราชการอิเล็กทรอนิกส์ (e-Document Verification QR Code)
 * ตาม พ.ร.บ.ธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ. ๒๕๔๔ และระเบียบสำนักนายกรัฐมนตรีฯ พ.ศ. ๒๕๖๔
 */
export function DocumentVerificationQR({
  docId,
  docNumber,
  issuedDate,
  size = 72,
  className = "",
}: DocumentVerificationQRProps) {
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    // กำหนด URL ตรวจสอบความถูกต้องของเอกสาร (Verification Portal)
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://smartmso.m-society.go.th";
    const verificationUrl = `${baseUrl}/?page=circular&verify=${encodeURIComponent(
      docId
    )}&docNo=${encodeURIComponent(docNumber)}`;

    QRCode.toDataURL(
      verificationUrl,
      {
        width: size * 2, // 2x for sharp printing
        margin: 1,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      },
      (err, url) => {
        if (!err && url) {
          setQrUrl(url);
        }
      }
    );
  }, [docId, docNumber, size]);

  if (!qrUrl) return null;

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src={qrUrl}
        alt={`QR ตรวจสอบเอกสาร ${docNumber}`}
        style={{ width: `${size}px`, height: `${size}px` }}
        className="rounded border border-slate-300 print:border-black shrink-0"
      />
      <div className="text-[10px] leading-tight text-slate-500 print:text-black">
        <div className="font-bold text-slate-800 print:text-black">
          สแกนตรวจสอบความถูกต้อง
        </div>
        <div className="font-mono text-[9px] text-slate-600 print:text-black">
          Ref: {docId.slice(0, 16)}
        </div>
        <div className="text-[8px] text-slate-400 print:text-black mt-0.5">
          พมจ.กำแพงเพชร e-Saraban
        </div>
      </div>
    </div>
  );
}
