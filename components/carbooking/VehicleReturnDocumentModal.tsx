"use client";

import React from "react";
import { CarBookingRequest } from "@/lib/types";
import { GarudaEmblem } from "@/components/circular/GarudaEmblem";

interface VehicleReturnDocumentModalProps {
  booking: CarBookingRequest;
  onClose: () => void;
}

export function VehicleReturnDocumentModal({
  booking,
  onClose,
}: VehicleReturnDocumentModalProps) {
  const report = booking.returnReport;

  const handlePrint = () => {
    window.print();
  };

  if (!report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[calc(100vh-2rem)] md:max-h-[92vh] flex flex-col print:max-h-none print:shadow-none print:border-none print:m-0 print:rounded-none">
        {/* Top Actions (Hidden in print) - Fixed */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50/90 border-b border-slate-200 print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <span className="font-bold text-slate-800 text-sm">
              ใบรายงานผลการใช้และส่งคืนรถยนต์ราชการ
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-100 text-teal-800">
              {booking.requestNo}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0D9488] hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
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
          <div className="text-center space-y-1 mb-6">
            <div className="flex justify-center mb-1">
              <GarudaEmblem size="2cm" />
            </div>
            <h1 className="text-xl font-bold font-heading text-slate-900 print:text-black">
              ใบรายงานผลการใช้และการตรวจรับส่งคืนรถยนต์ราชการ
            </h1>
            <p className="text-sm font-semibold text-slate-700 print:text-black">
              สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร
            </p>
            <div className="flex justify-between items-center text-xs text-slate-500 pt-3 border-b border-slate-200 pb-3">
              <span>เลขที่คำขอ: <strong className="text-slate-800 font-mono">{booking.requestNo}</strong></span>
              <span>วันที่ตรวจรับคืน: <strong>{report.returnedAt}</strong></span>
            </div>
          </div>

          {/* Section 1: Vehicle & Mission Information */}
          <div className="space-y-4 text-sm">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500">รถยนต์ราชการ:</span>{" "}
                <strong className="text-slate-900">{booking.vehicleName}</strong>
              </div>
              <div>
                <span className="text-slate-500">หมายเลขทะเบียน:</span>{" "}
                <strong className="text-slate-900 font-mono">{booking.licensePlate}</strong>
              </div>
              <div>
                <span className="text-slate-500">ผู้ขอใช้รถ:</span>{" "}
                <span className="font-semibold text-slate-800">{booking.requesterName} ({booking.requesterPosition})</span>
              </div>
              <div>
                <span className="text-slate-500">พนักงานขับรถ:</span>{" "}
                <span className="font-semibold text-slate-800">{booking.assignedDriver || "ขับขี่เอง"}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500">ภารกิจที่ปฏิบัติ:</span>{" "}
                <span className="font-semibold text-slate-800">{booking.purpose} ณ {booking.destination}</span>
              </div>
            </div>

            {/* Section 2: Mileage & Distance Summary Table */}
            <div>
              <h3 className="font-bold font-heading text-xs text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>🔢</span>
                <span>สรุปการใช้ระยะทางและเลขไมล์กิโลเมตร</span>
              </h3>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                      <th className="p-2.5">เลขไมล์ก่อนเดินทาง</th>
                      <th className="p-2.5">เลขไมล์เมื่อส่งคืน</th>
                      <th className="p-2.5">ระยะทางที่ใช้จริง</th>
                      <th className="p-2.5">ระดับน้ำมันเมื่อส่งคืน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr className="bg-white">
                      <td className="p-2.5 font-mono">{report.startMileage.toLocaleString()} กม.</td>
                      <td className="p-2.5 font-mono">{report.endMileage.toLocaleString()} กม.</td>
                      <td className="p-2.5 font-mono font-bold text-teal-700">{report.totalDistance.toLocaleString()} กม.</td>
                      <td className="p-2.5 font-semibold text-slate-800">{report.endFuelLevel}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Fuel refill details if any */}
              {report.fuelRefilledCost && (
                <div className="mt-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <strong>การเติมน้ำมันระหว่างทาง:</strong> {report.fuelRefilledLiters ? `${report.fuelRefilledLiters} ลิตร · ` : ""}จำนวนเงิน <strong>{report.fuelRefilledCost.toLocaleString()} บาท</strong>
                  </span>
                  {report.fuelReceiptNo && (
                    <span className="text-slate-600 font-mono">
                      เลขที่ใบเสร็จ: {report.fuelReceiptNo}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Section 3: 4-Point Condition Checklist */}
            <div>
              <h3 className="font-bold font-heading text-xs text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span>🛠️</span>
                <span>ผลการตรวจสอบสภาพรถยนต์และอุปกรณ์ส่วนควบ</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">1. ความสะอาด</span>
                  <span className="font-bold text-slate-800">{report.vehicleCleanliness}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">2. สภาพตัวถัง</span>
                  <span className="font-bold text-slate-800">{report.bodyCondition}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">3. เครื่องยนต์/ขับขี่</span>
                  <span className="font-bold text-slate-800">{report.engineCondition}</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">4. แอร์/ภายใน</span>
                  <span className="font-bold text-slate-800">{report.airConditioner}</span>
                </div>
              </div>

              <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-500">รายงานข้อบกพร่อง/ปัญหาที่พบ:</span>{" "}
                <span className="font-semibold text-slate-800">{report.issuesFound || "ไม่มีข้อบกพร่อง"}</span>
              </div>
            </div>
          </div>

          {/* Dual Sign-off Boxes */}
          <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-6 text-center">
            {/* Box 1: Returnee */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between h-44">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  ผู้ส่งคืนรถยนต์ราชการ
                </div>
                <div className="h-10 flex items-center justify-center italic text-teal-800 font-body text-sm">
                  (ลงชื่ออิเล็กทรอนิกส์)
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">
                  ({report.returneeName})
                </div>
                <div className="text-[10px] text-slate-500">{booking.requesterPosition}</div>
                <div className="text-[9px] text-teal-600 font-mono mt-1">ส่งคืนเมื่อ: {report.returnedAt}</div>
              </div>
            </div>

            {/* Box 2: Inspector */}
            <div className="p-5 rounded-2xl border border-teal-200 bg-teal-50/40 flex flex-col justify-between h-44">
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  เจ้าหน้าที่ผู้ตรวจรับรถยนต์
                </div>
                <div className="h-10 flex items-center justify-center italic text-teal-800 font-body text-sm">
                  (ลงชื่ออิเล็กทรอนิกส์)
                </div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">
                  ({report.inspectorName.split(" (")[0]})
                </div>
                <div className="text-[10px] text-slate-500">{report.inspectorName.split(" (")[1]?.replace(")", "") || "เจ้าหน้าที่ยานพาหนะ"}</div>
                <div className="text-[9px] text-emerald-600 font-mono mt-1">✓ ตรวจรับสภาพเรียบร้อย</div>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-8 text-[11px] text-slate-400 text-center border-t border-slate-100 pt-3">
            * เอกสารนี้จัดทำผ่านระบบ Smart MSO พมจ.กำแพงเพชร เพื่อใช้เป็นหลักฐานการส่งคืนและการบำรุงรักษายานพาหนะราชการ
          </div>
        </div>
      </div>
    </div>
  );
}
