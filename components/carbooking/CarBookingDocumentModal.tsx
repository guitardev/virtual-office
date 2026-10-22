"use client";

import React from "react";
import { CarBookingRequest } from "@/lib/types";

interface CarBookingDocumentModalProps {
  booking: CarBookingRequest;
  onClose: () => void;
}

export function CarBookingDocumentModal({
  booking,
  onClose,
}: CarBookingDocumentModalProps) {
  const handlePrint = () => {
    window.print();
  };

  // Helper to extract Thai Day, Month, Year, Time
  const parseThaiDateParts = (dateStr?: string) => {
    if (!dateStr) return { day: "", month: "", year: "", time: "", fullDate: "" };
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const day = d.getDate().toString();
        const month = d.toLocaleDateString("th-TH", { month: "long" });
        const year = (d.getFullYear() + 543).toString();
        const hours = d.getHours().toString().padStart(2, "0");
        const mins = d.getMinutes().toString().padStart(2, "0");
        return {
          day,
          month,
          year,
          time: `${hours}.${mins}`,
          fullDate: `${day} ${month} ${year}`,
        };
      }
    } catch {}

    return { day: "", month: "", year: "", time: "", fullDate: dateStr || "" };
  };

  const createdDate = parseThaiDateParts(booking.createdAt);
  const depDate = parseThaiDateParts(booking.departureTime);
  const retDate = parseThaiDateParts(booking.returnTime);

  const parseShortDate = (dateStr?: string) => {
    if (!dateStr) return { d: "...", m: "...", y: "....." };
    try {
      const dt = new Date(dateStr);
      if (!isNaN(dt.getTime())) {
        return {
          d: dt.getDate().toString(),
          m: (dt.getMonth() + 1).toString(),
          y: (dt.getFullYear() + 543).toString().slice(-2),
        };
      }
    } catch {}
    return { d: "...", m: "...", y: "....." };
  };

  const managerDate = parseShortDate(booking.managerActionAt);
  const approverDate = parseShortDate(booking.approverActionAt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[calc(100vh-2rem)] md:max-h-[96vh] flex flex-col print:max-h-none print:shadow-none print:border-none print:m-0 print:rounded-none">
        
        {/* Top Control Bar (Hidden in print) */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-100/90 border-b border-slate-200 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">📄</span>
            <span className="font-bold text-slate-800 text-sm">
              ใบขออนุญาตใช้รถราชการ (ตรงตามแบบฟอร์มเอกสาร 100%)
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-200 text-slate-800">
              {booking.requestNo}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4F46E5] hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <span>🖨️</span>
              <span>พิมพ์เอกสาร (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              ✕ ปิด
            </button>
          </div>
        </div>

        {/* Scrollable Document Preview / A4 Sheet */}
        <div className="overflow-y-auto flex-1 min-h-0 bg-slate-200/50 p-4 sm:p-8 print:p-0 print:bg-white print:overflow-visible">
          
          {/* A4 Paper Canvas */}
          <div className="w-[794px] max-w-full min-h-[1050px] bg-white mx-auto p-10 sm:p-14 md:p-16 shadow-lg border border-slate-300 text-black font-body text-[15.5px] sm:text-[16px] leading-[2.1] print:shadow-none print:border-none print:m-0 print:p-[20mm_18mm_20mm_22mm] print:w-full print:max-w-none print:min-h-0 select-text">
            
            {/* Header: ใบขออนุญาตใช้รถราชการ */}
            <div className="text-center mb-6 pt-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-wide text-black">
                ใบขออนุญาตใช้รถราชการ
              </h1>
            </div>

            {/* Date Line (Right Aligned) */}
            <div className="flex justify-end mb-6 text-[15px] sm:text-[16px]">
              <div className="inline-flex items-baseline">
                <span>วันที่</span>
                <span className="min-w-[48px] text-center border-b border-dotted border-black px-1 font-normal">
                  {createdDate.day ? createdDate.day : "\u00A0"}
                </span>
                <span>เดือน</span>
                <span className="min-w-[130px] text-center border-b border-dotted border-black px-2 font-normal">
                  {createdDate.month ? createdDate.month : "\u00A0"}
                </span>
                <span>พ.ศ.</span>
                <span className="min-w-[70px] text-center border-b border-dotted border-black px-1 font-normal">
                  {createdDate.year ? createdDate.year : "\u00A0"}
                </span>
              </div>
            </div>

            {/* Salutation */}
            <div className="mb-4 text-[15.5px] sm:text-[16px]">
              <span>เรียน  พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร</span>
            </div>

            {/* Paragraph 1: ข้าพเจ้า... */}
            <div className="space-y-1 mb-2">
              <div className="flex items-baseline">
                <span className="w-16 shrink-0"></span>
                <span className="shrink-0">ข้าพเจ้า</span>
                <span className="flex-1 mx-1.5 border-b border-dotted border-black px-2 text-center font-normal">
                  {booking.requesterName || "\u00A0"}
                </span>
                <span className="shrink-0">ตำแหน่ง</span>
                <span className="w-64 shrink-0 mx-1.5 border-b border-dotted border-black px-2 text-center font-normal">
                  {booking.requesterPosition || "\u00A0"}
                </span>
              </div>

              <div className="flex items-baseline">
                <span className="shrink-0">ขออนุญาตใช้รถยนต์หมายเลขทะเบียน</span>
                <span className="w-48 shrink-0 mx-1.5 border-b border-dotted border-black px-2 text-center font-normal font-mono">
                  {booking.licensePlate || "\u00A0"}
                </span>
                <span className="shrink-0">โดยมี</span>
                <span className="flex-1 mx-1.5 border-b border-dotted border-black px-2 text-center font-normal">
                  {booking.assignedDriver || "\u00A0"}
                </span>
              </div>

              <div className="flex items-baseline">
                <span className="shrink-0">เป็นพนักงานขับรถยนต์ไปราชการที่</span>
                <span className="flex-1 mx-1.5 border-b border-dotted border-black px-2 font-normal">
                  {booking.destination || "\u00A0"}
                </span>
              </div>

              {/* Full line of dots */}
              <div className="w-full border-b border-dotted border-black h-5"></div>
            </div>

            {/* Paragraph 2: เพื่อ... */}
            <div className="space-y-1 mb-2 pt-1">
              <div className="flex items-baseline">
                <span className="shrink-0">เพื่อ</span>
                <span className="flex-1 ml-1.5 border-b border-dotted border-black px-2 font-normal">
                  {booking.purpose || "\u00A0"}
                </span>
              </div>
              {/* Full line of dots */}
              <div className="w-full border-b border-dotted border-black h-5"></div>
            </div>

            {/* Paragraph 3: มีคนนั่ง, ในวันที่, ถึงวันที่ */}
            <div className="space-y-1 mb-2 pt-1">
              <div className="flex items-baseline">
                <span className="shrink-0">มีคนนั่ง</span>
                <span className="w-44 mx-2 border-b border-dotted border-black text-center font-normal">
                  {booking.passengerCount || "\u00A0"}
                </span>
                <span className="shrink-0">คน</span>
              </div>

              <div className="flex items-baseline">
                <span className="shrink-0">ในวันที่</span>
                <span className="w-72 mx-2 border-b border-dotted border-black text-center font-normal">
                  {depDate.fullDate || "\u00A0"}
                </span>
                <span className="shrink-0">เวลา</span>
                <span className="flex-1 mx-2 border-b border-dotted border-black text-center font-normal">
                  {depDate.time ? `${depDate.time}` : "\u00A0"}
                </span>
                <span className="shrink-0">น.</span>
              </div>

              <div className="flex items-baseline">
                <span className="shrink-0">ถึงวันที่</span>
                <span className="w-72 mx-2 border-b border-dotted border-black text-center font-normal">
                  {retDate.fullDate || "\u00A0"}
                </span>
                <span className="shrink-0">เวลา</span>
                <span className="flex-1 mx-2 border-b border-dotted border-black text-center font-normal">
                  {retDate.time ? `${retDate.time}` : "\u00A0"}
                </span>
                <span className="shrink-0">น.</span>
              </div>
            </div>

            {/* Paragraph 4: ขอเบิกน้ำมันเชื้อเพลิง */}
            <div className="pt-1 mb-6 flex items-baseline">
              <span className="shrink-0">ขอเบิกน้ำมันเชื้อเพลิงและหล่อลื่น จำนวน</span>
              <span className="flex-1 mx-2 border-b border-dotted border-black text-center font-normal">
                {booking.fuelBudgetRequested && booking.fuelBudgetAmount
                  ? booking.fuelBudgetAmount.toLocaleString()
                  : "\u00A0"}
              </span>
              <span className="shrink-0">บาท</span>
            </div>

            {/* Signature 1: ผู้ขออนุญาต */}
            <div className="flex justify-end mt-10 mb-6">
              <div className="w-[340px] text-center space-y-1.5">
                <div className="flex items-baseline justify-center">
                  <span className="shrink-0">ลงชื่อ</span>
                  <span className="w-48 border-b border-dotted border-black mx-1"></span>
                  <span className="shrink-0">ผู้ขออนุญาต</span>
                </div>
                <div className="flex items-baseline justify-center">
                  <span>(</span>
                  <span className="min-w-[210px] px-2 font-normal text-center">
                    {booking.requesterName || "................................................................"}
                  </span>
                  <span>)</span>
                </div>
                <div className="flex items-baseline justify-center">
                  <span className="shrink-0">ตำแหน่ง</span>
                  <span className="border-b border-dotted border-black px-2 flex-1 text-center font-normal">
                    {booking.requesterPosition || "\u00A0"}
                  </span>
                </div>
                <div className="text-center tracking-widest text-black pt-0.5">
                  ............../............../..............
                </div>
              </div>
            </div>

            {/* Signature 2: ความเห็นหัวหน้าฝ่าย */}
            <div className="mb-6 pt-2">
              <div className="flex items-baseline">
                <span className="shrink-0">ความเห็น</span>
                <span className="flex-1 ml-2 border-b border-dotted border-black px-2 font-normal">
                  {booking.managerNotes || "\u00A0"}
                </span>
              </div>
              <div className="w-full border-b border-dotted border-black h-5 mb-5"></div>

              <div className="flex justify-end">
                <div className="w-[340px] text-center space-y-1.5">
                  <div className="flex items-baseline justify-center">
                    <span className="shrink-0">ลงชื่อ</span>
                    <span className="w-56 border-b border-dotted border-black mx-1"></span>
                  </div>
                  <div className="flex items-baseline justify-center">
                    <span>(</span>
                    <span className="min-w-[210px] px-2 font-normal text-center">
                      {booking.managerName || "................................................................"}
                    </span>
                    <span>)</span>
                  </div>
                  <div className="flex items-baseline justify-center">
                    <span className="shrink-0">ตำแหน่ง</span>
                    <span className="border-b border-dotted border-black px-2 flex-1 text-center font-normal">
                      {booking.managerName ? "หัวหน้าฝ่ายบริหารทั่วไป" : "\u00A0"}
                    </span>
                  </div>
                  <div className="text-center tracking-widest text-black pt-0.5">
                    {booking.managerActionAt && managerDate.d !== "..." ? (
                      <span>{managerDate.d} / {managerDate.m} / {managerDate.y}</span>
                    ) : (
                      <span>............../............../..............</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Signature 3: คำสั่งการ / ผู้อนุญาต (พมจ.) */}
            <div className="mb-2 pt-2">
              <div className="flex items-center gap-12 font-normal text-[15.5px] sm:text-[16px] mb-4">
                <div className="flex items-center gap-1.5">
                  <span>(</span>
                  <span className="w-8 text-center font-bold text-black">
                    {booking.status === "approved" ? "✓" : "........"}
                  </span>
                  <span>)</span>
                  <span className="ml-1">อนุญาต</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>(</span>
                  <span className="w-8 text-center font-bold text-black">
                    {booking.status === "rejected" ? "✓" : "........"}
                  </span>
                  <span>)</span>
                  <span className="ml-1">ไม่อนุญาต</span>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="w-[340px] text-center space-y-1.5">
                  <div className="flex items-baseline justify-center">
                    <span className="shrink-0">ลงชื่อ</span>
                    <span className="w-48 border-b border-dotted border-black mx-1"></span>
                    <span className="shrink-0">ผู้อนุญาต</span>
                  </div>
                  <div className="flex items-baseline justify-center">
                    <span>(</span>
                    <span className="min-w-[210px] px-2 font-normal text-center">
                      {booking.status === "approved" && booking.approverName
                        ? booking.approverName
                        : "................................................................"}
                    </span>
                    <span>)</span>
                  </div>
                  <div className="text-center tracking-widest text-black pt-0.5">
                    {booking.approverActionAt && approverDate.d !== "..." ? (
                      <span>{approverDate.d} / {approverDate.m} / {approverDate.y}</span>
                    ) : (
                      <span>............../............../..............</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
