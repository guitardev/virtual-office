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

  const formatThaiDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " น.";
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[calc(100vh-2rem)] md:max-h-[92vh] flex flex-col print:max-h-none print:shadow-none print:border-none print:m-0 print:rounded-none">
        {/* Modal Top Actions (Hidden in print) - Fixed */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50/90 border-b border-slate-200 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">📄</span>
            <span className="font-bold text-slate-800 text-sm">
              แบบขออนุญาตใช้รถยนต์ส่วนกลางราชการ (เอกสารอิเล็กทรอนิกส์)
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
              <span>พิมพ์ / ส่งออก PDF</span>
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

        {/* Official Document Sheet - Scrollable */}
        <div className="p-6 sm:p-10 text-slate-900 font-body print:p-6 print:text-black leading-relaxed overflow-y-auto flex-1 min-h-0 print:overflow-visible print:h-auto">
          {/* Garuda / Header */}
          <div className="text-center space-y-1 mb-8">
            <div className="text-4xl select-none mb-1">🦅</div>
            <h1 className="text-xl font-bold font-heading text-slate-900 print:text-black">
              แบบขออนุญาตใช้รถยนต์ส่วนกลาง
            </h1>
            <p className="text-sm font-semibold text-slate-700 print:text-black">
              สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร
            </p>
            <div className="flex justify-between items-center text-xs text-slate-500 pt-3 border-b border-slate-200 pb-3">
              <span>เลขที่คำขอ: <strong className="text-slate-800 font-mono">{booking.requestNo}</strong></span>
              <span>วันที่ยื่นคำขอ: <strong>{booking.createdAt}</strong></span>
            </div>
          </div>

          {/* Section 1: Requester Details */}
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-slate-500">เรียน:</span>{" "}
                <span className="font-semibold">หัวหน้าฝ่ายบริหารทั่วไป / พมจ.กำแพงเพชร</span>
              </div>
              <div>
                <span className="text-slate-500">สังกัดกลุ่ม/ฝ่าย:</span>{" "}
                <span className="font-semibold">{booking.requesterDivision}</span>
              </div>
            </div>

            <p>
              ข้าพเจ้า <strong className="text-slate-900">{booking.requesterName}</strong>{" "}
              ตำแหน่ง <strong>{booking.requesterPosition}</strong>{" "}
              เบอร์โทรศัพท์ <strong>{booking.requesterPhone}</strong>
            </p>

            <p>
              มีความจำเป็นขออนุญาตใช้รถยนต์ส่วนกลาง หมายเลขทะเบียน{" "}
              <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded font-bold font-mono text-slate-900">
                {booking.licensePlate}
              </span>{" "}
              ({booking.vehicleName})
            </p>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div>
                <span className="text-slate-500 font-medium">วัตถุประสงค์เพื่อ:</span>{" "}
                <span className="font-bold text-slate-800">{booking.purpose}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">สถานที่ต้นทาง:</span>{" "}
                  <span className="font-medium text-slate-800">{booking.origin}</span>
                </div>
                <div>
                  <span className="text-slate-500">สถานที่ปลายทาง:</span>{" "}
                  <span className="font-medium text-slate-800">{booking.destination}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
              <div>
                <span className="text-indigo-900 font-semibold">วันและเวลาออกเดินทาง:</span>{" "}
                <span className="font-bold text-indigo-950">{formatThaiDate(booking.departureTime)}</span>
              </div>
              <div>
                <span className="text-indigo-900 font-semibold">วันและเวลากลับ:</span>{" "}
                <span className="font-bold text-indigo-950">{formatThaiDate(booking.returnTime)}</span>
              </div>
            </div>

            <div className="text-xs space-y-1">
              <div>
                <span className="text-slate-500">จำนวนผู้โดยสาร:</span>{" "}
                <span className="font-bold text-slate-800">{booking.passengerCount} คน</span>
              </div>
              <div>
                <span className="text-slate-500">รายชื่อคณะผู้เดินทาง:</span>{" "}
                <span className="text-slate-700">{booking.passengersList || "-"}</span>
              </div>
              <div>
                <span className="text-slate-500">ความต้องการพนักงานขับรถ:</span>{" "}
                <span className="font-bold text-slate-800">
                  {booking.requireDriver ? "ต้องการพนักงานขับรถราชการ" : "ไม่ต้องการ (ขับขี่เองโดยผู้ขอใช้รถ)"}
                </span>
                {booking.assignedDriver && (
                  <span className="ml-2 text-teal-700 font-bold">
                    (มอบหมาย: {booking.assignedDriver})
                  </span>
                )}
              </div>
            </div>

            {/* Fuel Budget Clause */}
            <div className="text-xs p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="font-semibold text-slate-800">
                การขอรับการสนับสนุนค่าน้ำมันเชื้อเพลิง:
              </div>
              {booking.fuelBudgetRequested ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-700">
                  <span>[✓] <strong>ขออนุมัติเบิกจ่ายค่าน้ำมันเชื้อเพลิง</strong></span>
                  <span>จำนวนเงิน: <strong className="text-indigo-950 font-mono font-bold">{(booking.fuelBudgetAmount || 0).toLocaleString()} บาท</strong></span>
                  <span>เบิกจ่ายจาก: <strong>{booking.fuelBudgetSource || "งบดำเนินงานสำนักงาน"}</strong></span>
                </div>
              ) : (
                <div className="text-slate-600">
                  <span>[✓] <strong>ไม่ขอเบิกจ่ายค่าน้ำมันเชื้อเพลิง</strong> (ใช้น้ำมันคงเหลือประจำรถ / ไม่ของบประมาณเพิ่ม)</span>
                </div>
              )}
            </div>
          </div>



          {/* 3-Tier Sign-off Boxes (Official Stamp Grid) */}
          <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-300 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            {/* Box 1: Requester */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between h-48">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  1. ผู้ขออนุญาต
                </div>
                <div className="h-12 flex items-center justify-center italic text-indigo-700 font-body text-sm">
                  (ลงชื่ออิเล็กทรอนิกส์)
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">
                  ({booking.requesterName})
                </div>
                <div className="text-[10px] text-slate-500">{booking.requesterPosition}</div>
                <div className="text-[9px] text-emerald-600 font-mono mt-1">✓ ยื่นคำขอเรียบร้อย</div>
              </div>
            </div>

            {/* Box 2: Manager (Tier 2) */}
            <div className={`p-4 rounded-2xl border flex flex-col justify-between h-48 ${
              booking.status === "endorsed" || booking.status === "approved"
                ? "border-teal-300 bg-teal-50/50"
                : "border-slate-200 bg-slate-50/60"
            }`}>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  2. ความเห็นชอบหัวหน้าฝ่าย
                </div>
                {booking.managerName ? (
                  <div className="h-12 flex flex-col items-center justify-center">
                    <span className="text-xs font-bold text-teal-800">✓ เห็นชอบและมอบหมายคนขับ</span>
                    <span className="text-[10px] text-teal-700 font-mono">{booking.managerActionAt}</span>
                  </div>
                ) : (
                  <div className="h-12 flex items-center justify-center text-xs text-amber-600 font-semibold">
                    ⏳ รอการตรวจสอบ
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">
                  ({booking.managerName || "นายเสกพล ดิษฐโชติ"})
                </div>
                <div className="text-[10px] text-slate-500">หัวหน้าฝ่ายบริหารทั่วไป</div>
                {booking.managerNotes && (
                  <div className="text-[9px] text-slate-600 truncate mt-1 italic" title={booking.managerNotes}>
                    "{booking.managerNotes}"
                  </div>
                )}
              </div>
            </div>

            {/* Box 3: Approver (Tier 3 Admin) */}
            <div className={`p-4 rounded-2xl border flex flex-col justify-between h-48 relative overflow-hidden ${
              booking.status === "approved"
                ? "border-emerald-300 bg-emerald-50/50 ring-2 ring-emerald-500/20"
                : booking.status === "rejected"
                ? "border-rose-300 bg-rose-50/50"
                : "border-slate-200 bg-slate-50/60"
            }`}>
              {booking.status === "approved" && (
                <div className="absolute -right-6 -bottom-6 w-24 h-24 border-4 border-emerald-600/40 rounded-full flex items-center justify-center rotate-12 pointer-events-none">
                  <span className="text-[10px] font-black tracking-widest text-emerald-700 uppercase">อนุมัติแล้ว</span>
                </div>
              )}
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  3. คำสั่งการ / การอนุมัติ
                </div>
                {booking.status === "approved" ? (
                  <div className="h-12 flex flex-col items-center justify-center">
                    <span className="text-xs font-bold text-emerald-800">👑 อนุมัติการใช้รถราชการ</span>
                    <span className="text-[10px] text-emerald-700 font-mono">{booking.approverActionAt}</span>
                  </div>
                ) : booking.status === "rejected" ? (
                  <div className="h-12 flex items-center justify-center text-xs text-rose-600 font-bold">
                    ✕ ไม่อนุมัติ
                  </div>
                ) : (
                  <div className="h-12 flex items-center justify-center text-xs text-slate-400 font-semibold">
                    ⏳ รอเสนอ พมจ.
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">
                  ({booking.approverName || "นางสาวมะลิวัน สิทธิโยธี"})
                </div>
                <div className="text-[10px] text-slate-500">พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร</div>
                {booking.approverNotes && (
                  <div className="text-[9px] text-slate-600 truncate mt-1 italic" title={booking.approverNotes}>
                    "{booking.approverNotes}"
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-8 text-[11px] text-slate-400 text-center border-t border-slate-100 pt-3">
            * เอกสารนี้สร้างจากระบบ OmniOffice Virtual Office พมจ.กำแพงเพชร ตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยการใช้รถราชการ พ.ศ. 2523 และที่แก้ไขเพิ่มเติม
          </div>
        </div>
      </div>
    </div>
  );
}
