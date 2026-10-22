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
  const parseThaiDate = (dateStr?: string) => {
    if (!dateStr) return { day: "...", month: "....................", year: "........", time: ".............", fullDate: "........................................" };
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const day = d.getDate().toString();
        const month = d.toLocaleDateString("th-TH", { month: "long" });
        const year = (d.getFullYear() + 543).toString();
        const time = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
        return {
          day,
          month,
          year,
          time,
          fullDate: `${day} ${month} ${year}`,
        };
      }
    } catch {}

    // Fallback: If formatted as Thai date string
    return {
      day: "...",
      month: "....................",
      year: "........",
      time: ".............",
      fullDate: dateStr,
    };
  };

  const createdDate = parseThaiDate(booking.createdAt);
  const depDate = parseThaiDate(booking.departureTime);
  const retDate = parseThaiDate(booking.returnTime);

  // Parse approval / action dates if present
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
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[calc(100vh-2rem)] md:max-h-[95vh] flex flex-col print:max-h-none print:shadow-none print:border-none print:m-0 print:rounded-none">
        
        {/* Top Actions Bar (Hidden when printing) */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-b border-slate-200 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">📄</span>
            <span className="font-bold text-slate-800 text-sm">
              ใบขออนุญาตใช้รถราชการ (ตามระเบียบ พมจ.กำแพงเพชร)
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-100 text-indigo-700">
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
              <span>พิมพ์เอกสารราชการ (A4)</span>
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

        {/* Official Document Paper - A4 Style */}
        <div className="p-8 sm:p-14 text-slate-900 font-body print:p-0 print:text-black leading-[2.2] overflow-y-auto flex-1 min-h-0 print:overflow-visible print:h-auto select-text text-[15px] sm:text-[16px]">
          
          {/* Header Title */}
          <div className="text-center mb-8">
            <h1 className="text-xl sm:text-2xl font-bold tracking-wide text-slate-900 print:text-black">
              ใบขออนุญาตใช้รถราชการ
            </h1>
          </div>

          {/* Date Line (Right Aligned) */}
          <div className="flex justify-end mb-6 text-sm sm:text-base">
            <div className="inline-flex items-baseline gap-1">
              <span>วันที่</span>
              <span className="min-w-[40px] text-center border-b border-dotted border-slate-900 font-semibold px-1">
                {createdDate.day !== "..." ? createdDate.day : "\u00A0\u00A0\u00A0\u00A0"}
              </span>
              <span>เดือน</span>
              <span className="min-w-[120px] text-center border-b border-dotted border-slate-900 font-semibold px-2">
                {createdDate.month !== "...................." ? createdDate.month : "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
              </span>
              <span>พ.ศ.</span>
              <span className="min-w-[60px] text-center border-b border-dotted border-slate-900 font-semibold px-1">
                {createdDate.year !== "........" ? createdDate.year : "\u00A0\u00A0\u00A0\u00A0"}
              </span>
            </div>
          </div>

          {/* Salutation */}
          <div className="mb-4">
            <span className="font-semibold">เรียน</span>{" "}
            <span>พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร</span>
          </div>

          {/* Body Paragraphs */}
          <div className="space-y-2 text-justify">
            
            {/* Paragraph 1: ข้าพเจ้า */}
            <div className="leading-[2.4]">
              <span className="inline-block w-14"></span>
              <span>ข้าพเจ้า</span>
              <span className="inline-block mx-1.5 px-2 border-b border-dotted border-slate-900 font-semibold text-slate-950 min-w-[200px] text-center">
                {booking.requesterName}
              </span>
              <span>ตำแหน่ง</span>
              <span className="inline-block mx-1.5 px-2 border-b border-dotted border-slate-900 font-semibold text-slate-950 min-w-[180px] text-center">
                {booking.requesterPosition}
              </span>
              <br className="hidden sm:inline" />
              <span>ขออนุญาตใช้รถยนต์หมายเลขทะเบียน</span>
              <span className="inline-block mx-1.5 px-2 border-b border-dotted border-slate-900 font-semibold font-mono text-slate-950 min-w-[120px] text-center">
                {booking.licensePlate}
              </span>
              <span>โดยมี</span>
              <span className="inline-block mx-1.5 px-2 border-b border-dotted border-slate-900 font-semibold text-slate-950 min-w-[180px] text-center">
                {booking.assignedDriver || "พนักงานขับรถส่วนกลาง"}
              </span>
              <br className="hidden sm:inline" />
              <span>เป็นพนักงานขับรถยนต์ไปราชการที่</span>
              <span className="inline-block mx-1.5 px-2 border-b border-dotted border-slate-900 font-semibold text-slate-950 min-w-[280px]">
                {booking.destination}
              </span>
            </div>

            {/* Paragraph 2: เพื่อ */}
            <div className="leading-[2.4] pt-1">
              <span>เพื่อ</span>
              <span className="inline-block mx-1.5 px-2 border-b border-dotted border-slate-900 font-semibold text-slate-950 w-[calc(100%-45px)]">
                {booking.purpose}
              </span>
            </div>

            {/* Paragraph 3: มีคนนั่ง, ในวันที่, ถึงวันที่ */}
            <div className="leading-[2.4] pt-1">
              <span>มีคนนั่ง</span>
              <span className="inline-block mx-1.5 px-3 border-b border-dotted border-slate-900 font-semibold text-slate-950 min-w-[80px] text-center">
                {booking.passengerCount}
              </span>
              <span>คน</span>
              <br />
              <span>ในวันที่</span>
              <span className="inline-block mx-1.5 px-2 border-b border-dotted border-slate-900 font-semibold text-slate-950 min-w-[200px] text-center">
                {depDate.fullDate}
              </span>
              <span>เวลา</span>
              <span className="inline-block mx-1.5 px-2 border-b border-dotted border-slate-900 font-semibold text-slate-950 min-w-[120px] text-center">
                {depDate.time !== "............." ? `${depDate.time} น.` : "........................."}
              </span>
              <br />
              <span>ถึงวันที่</span>
              <span className="inline-block mx-1.5 px-2 border-b border-dotted border-slate-900 font-semibold text-slate-950 min-w-[200px] text-center">
                {retDate.fullDate}
              </span>
              <span>เวลา</span>
              <span className="inline-block mx-1.5 px-2 border-b border-dotted border-slate-900 font-semibold text-slate-950 min-w-[120px] text-center">
                {retDate.time !== "............." ? `${retDate.time} น.` : "........................."}
              </span>
            </div>

            {/* Paragraph 4: ขอเบิกน้ำมัน */}
            <div className="leading-[2.4] pt-1">
              <span>ขอเบิกน้ำมันเชื้อเพลิงและหล่อลื่น จำนวน</span>
              <span className="inline-block mx-1.5 px-2 border-b border-dotted border-slate-900 font-semibold text-slate-950 min-w-[160px] text-center">
                {booking.fuelBudgetRequested && booking.fuelBudgetAmount
                  ? booking.fuelBudgetAmount.toLocaleString()
                  : "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0-\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
              </span>
              <span>บาท</span>
            </div>
          </div>

          {/* Signature 1: ผู้ขออนุญาต (Right Aligned) */}
          <div className="flex justify-end mt-8 mb-6">
            <div className="w-72 sm:w-80 text-center space-y-1 text-sm sm:text-base leading-relaxed">
              <div>
                <span>ลงชื่อ</span>
                <span className="inline-block w-40 border-b border-dotted border-slate-900 mx-1">
                  &nbsp;
                </span>
                <span>ผู้ขออนุญาต</span>
              </div>
              <div className="font-semibold text-slate-950">
                ( {booking.requesterName} )
              </div>
              <div>
                <span>ตำแหน่ง</span>
                <span className="inline-block border-b border-dotted border-slate-900 px-2 font-semibold text-slate-950 min-w-[150px]">
                  {booking.requesterPosition}
                </span>
              </div>
              <div className="text-xs sm:text-sm text-slate-600">
                <span>......../......../........</span>
              </div>
            </div>
          </div>

          {/* Signature 2: ความเห็นหัวหน้าฝ่าย (Left + Right Aligned) */}
          <div className="mb-6 pt-2">
            <div className="mb-2">
              <span>ความเห็น</span>
              <span className="inline-block ml-2 border-b border-dotted border-slate-900 w-[calc(100%-70px)] font-medium text-slate-800 px-2">
                {booking.managerNotes || (booking.status === "endorsed" || booking.status === "approved" ? "เห็นควรอนุญาตให้ใช้รถยนต์ส่วนกลางไปราชการตามที่ขอ" : "\u00A0")}
              </span>
            </div>
            <div className="w-full border-b border-dotted border-slate-900 mb-4 h-4"></div>

            <div className="flex justify-end">
              <div className="w-72 sm:w-80 text-center space-y-1 text-sm sm:text-base leading-relaxed">
                <div>
                  <span>ลงชื่อ</span>
                  <span className="inline-block w-48 border-b border-dotted border-slate-900 mx-1">
                    &nbsp;
                  </span>
                </div>
                <div className="font-semibold text-slate-950">
                  ( {booking.managerName || "นายเสกพล ดิษฐโชติ"} )
                </div>
                <div>
                  <span>ตำแหน่ง</span>
                  <span className="inline-block border-b border-dotted border-slate-900 px-2 font-semibold text-slate-950 min-w-[150px]">
                    หัวหน้าฝ่ายบริหารทั่วไป
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-slate-600">
                  {booking.managerActionAt ? (
                    <span>{managerDate.d} / {managerDate.m} / {managerDate.y}</span>
                  ) : (
                    <span>......../......../........</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Signature 3: คำสั่งการ / ผู้อนุญาต (พมจ.) */}
          <div className="mb-4 pt-2">
            <div className="flex items-center gap-10 mb-4 font-semibold text-sm sm:text-base">
              <div className="flex items-center gap-2">
                <span>(</span>
                <span className="inline-block w-6 text-center font-bold text-indigo-900">
                  {booking.status === "approved" ? "✓" : "\u00A0"}
                </span>
                <span>)</span>
                <span>อนุญาต</span>
              </div>
              <div className="flex items-center gap-2">
                <span>(</span>
                <span className="inline-block w-6 text-center font-bold text-rose-700">
                  {booking.status === "rejected" ? "✓" : "\u00A0"}
                </span>
                <span>)</span>
                <span>ไม่อนุญาต</span>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="w-72 sm:w-80 text-center space-y-1 text-sm sm:text-base leading-relaxed">
                <div>
                  <span>ลงชื่อ</span>
                  <span className="inline-block w-40 border-b border-dotted border-slate-900 mx-1">
                    &nbsp;
                  </span>
                  <span>ผู้อนุญาต</span>
                </div>
                <div className="font-semibold text-slate-950">
                  ( {booking.approverName || "นางสาวมะลิวัน สิทธิโยธี"} )
                </div>
                <div>
                  <span className="text-xs sm:text-sm text-slate-700">
                    พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-slate-600">
                  {booking.approverActionAt ? (
                    <span>{approverDate.d} / {approverDate.m} / {approverDate.y}</span>
                  ) : (
                    <span>......../......../........</span>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
