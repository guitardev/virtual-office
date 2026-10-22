"use client";

import React, { useState } from "react";
import { CarBookingRequest } from "@/lib/types";

interface CarBookingDocumentModalProps {
  booking: CarBookingRequest;
  onClose: () => void;
}

export function CarBookingDocumentModal({
  booking,
  onClose,
}: CarBookingDocumentModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);

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
        const hours = d.getHours().toString();
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
    if (!dateStr) return { d: "", m: "", y: "" };
    try {
      const dt = new Date(dateStr);
      if (!isNaN(dt.getTime())) {
        return {
          d: dt.getDate().toString(),
          m: (dt.getMonth() + 1).toString(),
          y: (dt.getFullYear() + 543).toString(),
        };
      }
    } catch {}
    return { d: "", m: "", y: "" };
  };

  const approverDate = parseShortDate(booking.approverActionAt);

  const handleDownloadDocx = async () => {
    try {
      setIsDownloading(true);
      const payload = {
        requestNo: booking.requestNo,
        requesterName: booking.requesterName,
        requesterPosition: booking.requesterPosition,
        licensePlate: booking.licensePlate,
        assignedDriver: booking.assignedDriver,
        destination: booking.destination,
        purpose: booking.purpose,
        passengersList: booking.passengersList,
        passengerCount: booking.passengerCount,
        estimatedDistance: booking.estimatedDistance || 150,
        startDateThai: depDate.fullDate,
        startTime: depDate.time,
        endDateThai: retDate.fullDate,
        endTime: retDate.time,
        fuelBudgetRequested: booking.fuelBudgetRequested,
        fuelBudgetAmount: booking.fuelBudgetAmount,
        day: createdDate.day,
        month: createdDate.month,
        year: createdDate.year,
        managerName: booking.managerName,
        managerNotes: booking.managerNotes || "เพื่อโปรดพิจารณาอนุญาต",
        status: booking.status,
        approverName: booking.approverName,
      };

      const res = await fetch("/api/carbooking/download-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("ดาวน์โหลดไฟล์ Word ไม่สำเร็จ");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Form_ขอใช้รถ_${booking.requestNo.replace(/[^a-zA-Z0-9ก-๙_-]/g, "_")}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("เกิดข้อผิดพลาดในการดาวน์โหลดเอกสาร: " + err?.message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[calc(100vh-2rem)] md:max-h-[96vh] flex flex-col print:max-h-none print:shadow-none print:border-none print:m-0 print:rounded-none">
        
        {/* Top Control Bar (Hidden in print) */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-100/90 border-b border-slate-200 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">📄</span>
            <span className="font-bold text-slate-800 text-sm">
              ใบขออนุญาตใช้รถราชการ (ตรงตามแบบฟอร์ม Form_ขอใช้รถ.docx 100%)
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-200 text-slate-800">
              {booking.requestNo}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadDocx}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="ดาวน์โหลดเป็นไฟล์ Microsoft Word (.docx)"
            >
              <span>📥</span>
              <span>{isDownloading ? "กำลังสร้างไฟล์..." : "ดาวน์โหลด Word (.docx)"}</span>
            </button>
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
          <div
            className="w-[794px] max-w-full min-h-[1123px] bg-white mx-auto p-10 sm:p-14 md:p-16 shadow-lg border border-slate-300 text-black text-[16px] sm:text-[16.5px] leading-[1.85] print:shadow-none print:border-none print:m-0 print:p-[20mm_18mm_15mm_25mm] print:w-full print:max-w-none print:min-h-0 select-text"
            style={{ fontFamily: "'TH SarabunPSK', 'TH Sarabun New', 'Sarabun', sans-serif" }}
          >
            
            {/* Header: ใบขออนุญาตใช้รถราชการ */}
            <div className="text-center mb-5 pt-1">
              <h1 className="text-2xl font-bold tracking-wide text-black">
                ใบขออนุญาตใช้รถราชการ
              </h1>
            </div>

            {/* Date Line (Pushed Right) */}
            <div className="flex justify-end mb-4 text-[16px]">
              <div className="inline-flex items-baseline whitespace-nowrap">
                <span>วันที่..</span>
                <span className="min-w-[36px] text-center border-b border-dotted border-black px-1 font-normal">
                  {createdDate.day || "\u00A0\u00A0\u00A0\u00A0"}
                </span>
                <span>...เดือน...</span>
                <span className="min-w-[100px] text-center border-b border-dotted border-black px-2 font-normal">
                  {createdDate.month || "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
                </span>
                <span>....พ.ศ...</span>
                <span className="min-w-[60px] text-center border-b border-dotted border-black px-1 font-normal">
                  {createdDate.year || "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
                </span>
                <span>....</span>
              </div>
            </div>

            {/* Salutation */}
            <div className="mb-3 text-[16px]">
              <span>เรียน  พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร</span>
            </div>

            {/* Body Lines */}
            <div className="space-y-1 mb-3 text-[16px]">
              {/* Line 1: ข้าพเจ้า */}
              <div className="flex items-baseline">
                <span className="w-16 shrink-0"></span>
                <span className="shrink-0">ข้าพเจ้า.....</span>
                <span className="min-w-[180px] border-b border-dotted border-black px-2 text-center font-normal">
                  {booking.requesterName || "..................................................."}
                </span>
                <span className="shrink-0">.....ตำแหน่ง.....</span>
                <span className="flex-1 border-b border-dotted border-black px-2 text-center font-normal">
                  {booking.requesterPosition || "..................................................."}
                </span>
                <span className="shrink-0">..............</span>
              </div>

              {/* Line 2: ขออนุญาตใช้รถยนต์ */}
              <div className="flex items-baseline">
                <span className="shrink-0">ขออนุญาตใช้รถยนต์หมายเลขทะเบียน</span>
                <span className="w-56 mx-1 border-b border-dotted border-black px-2 text-center font-normal font-mono">
                  {booking.licensePlate || "....................................."}
                </span>
                <span className="shrink-0">โดยมี</span>
                <span className="flex-1 ml-1 border-b border-dotted border-black px-2 text-center font-normal">
                  {booking.assignedDriver || "..................................................................."}
                </span>
              </div>

              {/* Line 3: เป็นพนักงานขับรถยนต์ไปราชการที่ */}
              <div className="flex items-baseline">
                <span className="shrink-0">เป็นพนักงานขับรถยนต์ไปราชการที่...</span>
                <span className="flex-1 border-b border-dotted border-black px-1 font-normal">
                  {booking.destination || "..................................................................................................................................."}
                </span>
                <span className="shrink-0">......................</span>
              </div>

              {/* Line 4: เพื่อ */}
              <div className="flex items-baseline">
                <span className="shrink-0">เพื่อ...</span>
                <span className="flex-1 border-b border-dotted border-black px-1 font-normal">
                  {booking.purpose || "..................................................................................................................................."}
                </span>
                <span className="shrink-0 ml-1">พร้อมด้วย</span>
              </div>

              {/* Line 5: ผู้ร่วมเดินทาง (passengersList) */}
              <div className="flex items-baseline">
                <span className="flex-1 border-b border-dotted border-black px-1 font-normal">
                  {booking.passengersList || "........................................................................................................................................................................................"}
                </span>
                <span className="shrink-0">......</span>
              </div>

              {/* Line 6: มีคนนั่ง, ระยะทางโดยประมาณ */}
              <div className="flex items-baseline">
                <span className="shrink-0">มีคนนั่ง........</span>
                <span className="min-w-[40px] border-b border-dotted border-black text-center font-normal">
                  {booking.passengerCount ?? 1}
                </span>
                <span className="shrink-0">...........คน   ระยะทางโดยประมาณ.........</span>
                <span className="min-w-[50px] border-b border-dotted border-black text-center font-normal">
                  {booking.estimatedDistance || 150}
                </span>
                <span className="shrink-0">.........กิโลเมตร</span>
              </div>

              {/* Line 7: ในวันที่...เวลา...น. */}
              <div className="flex items-baseline">
                <span className="shrink-0">ในวันที่…....</span>
                <span className="min-w-[160px] border-b border-dotted border-black text-center font-normal">
                  {depDate.fullDate || "........................."}
                </span>
                <span className="shrink-0">..........เวลา......</span>
                <span className="min-w-[70px] border-b border-dotted border-black text-center font-normal">
                  {depDate.time || "............"}
                </span>
                <span className="shrink-0">...........น.</span>
              </div>

              {/* Line 8: ถึงวันที่...เวลา...น. */}
              <div className="flex items-baseline">
                <span className="shrink-0">ถึงวันที่…....</span>
                <span className="min-w-[160px] border-b border-dotted border-black text-center font-normal">
                  {retDate.fullDate || "........................."}
                </span>
                <span className="shrink-0">...........เวลา…...</span>
                <span className="min-w-[70px] border-b border-dotted border-black text-center font-normal">
                  {retDate.time || "............"}
                </span>
                <span className="shrink-0">….…..น.</span>
              </div>

              {/* Line 9: ขอเบิกน้ำมันเชื้อเพลิงและหล่อลื่น */}
              <div className="flex items-baseline pt-0.5">
                <span className="shrink-0">ขอเบิกน้ำมันเชื้อเพลิงและหล่อลื่น  จำนวน…</span>
                <span className="min-w-[120px] border-b border-dotted border-black text-center font-normal">
                  {booking.fuelBudgetRequested && booking.fuelBudgetAmount
                    ? booking.fuelBudgetAmount.toLocaleString()
                    : "............"}
                </span>
                <span className="shrink-0">............บาท</span>
              </div>
            </div>

            {/* Blank Line separator */}
            <div className="h-3"></div>

            {/* Signature Block 1: ผู้ขออนุญาต (Right Aligned) */}
            <div className="flex justify-end mb-4">
              <div className="w-[360px] text-center space-y-1">
                <div className="flex items-baseline justify-center">
                  <span className="shrink-0">ลงชื่อ</span>
                  <span className="w-48 border-b border-dotted border-black mx-1"></span>
                  <span className="shrink-0">ผู้ขออนุญาต</span>
                </div>
                <div className="flex items-baseline justify-center">
                  <span>(..................</span>
                  <span className="min-w-[180px] px-1 font-normal text-center">
                    {booking.requesterName || "......................................................."}
                  </span>
                  <span>...................)</span>
                </div>
                <div className="flex items-baseline justify-center">
                  <span className="shrink-0">ตำแหน่ง.......</span>
                  <span className="border-b border-dotted border-black px-1 min-w-[160px] text-center font-normal">
                    {booking.requesterPosition || "....................................................."}
                  </span>
                  <span className="shrink-0">................</span>
                </div>
                <div className="text-center tracking-widest text-black pt-0.5 text-sm">
                  ................/.............................../.................
                </div>
              </div>
            </div>

            {/* Blank Line separator */}
            <div className="h-2"></div>

            {/* Signature Block 2: หัวหน้ากลุ่ม/ฝ่าย (Pushed Right around 45-50% width) */}
            <div className="flex justify-end mb-4">
              <div className="w-[360px] text-center space-y-1">
                <div className="flex items-baseline justify-center">
                  <span className="shrink-0">ลงชื่อ</span>
                  <span className="w-44 border-b border-dotted border-black mx-1"></span>
                  <span className="shrink-0">หัวหน้ากลุ่ม/ฝ่าย</span>
                </div>
                <div className="flex items-baseline justify-center">
                  <span>(.......................................................)</span>
                </div>
                <div className="flex items-baseline justify-center">
                  <span className="shrink-0">ตำแหน่ง.....................................................</span>
                </div>
              </div>
            </div>

            {/* Opinion Line (Full width Left aligned) */}
            <div className="mb-4 pt-1">
              <div className="flex items-baseline">
                <span className="shrink-0">ความเห็น...........</span>
                <span className="flex-1 border-b border-dotted border-black px-2 font-normal">
                  {booking.managerNotes || "เพื่อโปรดพิจารณาอนุญาต"}
                </span>
                <span className="shrink-0">.........................................................................................................</span>
              </div>
            </div>

            {/* Signature Block 3: ผู้เสนอความเห็น (Right Aligned) */}
            <div className="flex justify-end mb-4">
              <div className="w-[360px] text-center space-y-1">
                <div className="flex items-baseline justify-center">
                  <span className="shrink-0">ลงชื่อ</span>
                  <span className="w-52 border-b border-dotted border-black mx-1"></span>
                </div>
                <div className="flex items-baseline justify-center">
                  <span>(.......................................................)</span>
                </div>
                <div className="flex items-baseline justify-center">
                  <span className="shrink-0">ตำแหน่ง.....................................................</span>
                </div>
              </div>
            </div>

            {/* Approval Decision & Signature Block 4: ผู้อนุญาต (Right Aligned) */}
            <div className="flex justify-end mb-2">
              <div className="w-[360px] text-center space-y-2">
                <div className="flex items-center justify-center gap-6 font-normal">
                  <div className="flex items-center gap-1">
                    <span>(</span>
                    <span className="w-8 text-center font-bold text-black">
                      {booking.status === "approved" ? "✓" : "......."}
                    </span>
                    <span>)</span>
                    <span className="ml-1">อนุญาต</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>(</span>
                    <span className="w-8 text-center font-bold text-black">
                      {booking.status === "rejected" ? "✓" : "......."}
                    </span>
                    <span>)</span>
                    <span className="ml-1">ไม่อนุญาต</span>
                  </div>
                </div>

                <div className="flex items-baseline justify-center pt-1">
                  <span className="shrink-0">ลงชื่อ</span>
                  <span className="w-48 border-b border-dotted border-black mx-1"></span>
                  <span className="shrink-0">ผู้อนุญาต</span>
                </div>
                <div className="flex items-baseline justify-center">
                  <span>(.......................................................)</span>
                </div>
                <div className="text-center tracking-widest text-black pt-0.5 text-sm">
                  {booking.approverActionAt && approverDate.d ? (
                    <span>{approverDate.d} / {approverDate.m} / {approverDate.y}</span>
                  ) : (
                    <span>................/.............................../.................</span>
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
