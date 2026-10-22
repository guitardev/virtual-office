"use client";

import React, { useState } from "react";
import { CarBookingRequest, Vehicle, Member, VehicleReturnReport, FuelLevel } from "@/lib/types";
import { RealisticFuelGauge } from "./RealisticFuelGauge";

interface ReturnVehicleModalProps {
  booking: CarBookingRequest;
  vehicle: Vehicle;
  currentUser: Member;
  inspectors: Member[];
  onClose: () => void;
  onSubmitReturn: (bookingId: string, vehicleId: string, report: VehicleReturnReport) => void;
}

export function ReturnVehicleModal({
  booking,
  vehicle,
  currentUser,
  inspectors,
  onClose,
  onSubmitReturn,
}: ReturnVehicleModalProps) {
  const initialStartMileage = vehicle.mileage || 100000;
  const [startMileage, setStartMileage] = useState<number>(initialStartMileage);
  const [endMileage, setEndMileage] = useState<number>(initialStartMileage + 85);
  const [startFuelLevel, setStartFuelLevel] = useState<string>(vehicle.fuelLevel || "เต็มถัง (100%)");
  const [endFuelLevel, setEndFuelLevel] = useState<FuelLevel>("3/4 ถัง (75%)");

  const [fuelRefilledLiters, setFuelRefilledLiters] = useState<string>("");
  const [fuelRefilledCost, setFuelRefilledCost] = useState<string>("");
  const [fuelReceiptNo, setFuelReceiptNo] = useState<string>("");

  const [cleanliness, setCleanliness] = useState<"สะอาดเรียบร้อย" | "ต้องล้างทำความสะอาด" | "สกปรกมาก">("สะอาดเรียบร้อย");
  const [bodyCondition, setBodyCondition] = useState<"ปกติสมบูรณ์ดี" | "มีรอยขูดขีดใหม่" | "มีความเสียหาย">("ปกติสมบูรณ์ดี");
  const [engineCondition, setEngineCondition] = useState<"ปกติสมบูรณ์" | "พบอาการผิดปกติ">("ปกติสมบูรณ์");
  const [airConditioner, setAirConditioner] = useState<"แอร์เย็นปกติ" | "แอร์ไม่ค่อยเย็น/มีกลิ่น">("แอร์เย็นปกติ");
  const [issuesFound, setIssuesFound] = useState<string>("ไม่มีข้อบกพร่อง รถยนต์และอุปกรณ์ส่วนควบอยู่ในสภาพเรียบร้อย");
  const [notes, setNotes] = useState<string>("ส่งคืนกุญแจรถ บัตรเติมน้ำมัน และเอกสารประจำรถเรียบร้อย");
  
  // New Step 5 & 7 states: Key return & Repair reporting
  const [keyReturned, setKeyReturned] = useState<boolean>(true);
  const [hasIssue, setHasIssue] = useState<boolean>(false);
  const [needsMaintenance, setNeedsMaintenance] = useState<boolean>(false);

  const defaultInspector = inspectors[0] || currentUser;
  const [inspectorId, setInspectorId] = useState<string>(defaultInspector?.id || "");

  const totalDistance = Math.max(0, endMileage - startMileage);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (endMileage < startMileage) {
      alert("เลขไมล์เมื่อส่งคืนต้องไม่น้อยกว่าเลขไมล์ก่อนเดินทาง");
      return;
    }

    if (!keyReturned) {
      if (!confirm("คุณยังไม่ได้ทำเครื่องหมายส่งมอบกุญแจรถคืน ต้องการดำเนินการต่อหรือไม่?")) {
        return;
      }
    }

    const selectedInspector = inspectors.find((i) => i.id === inspectorId) || currentUser;
    const isProblemFound = hasIssue || bodyCondition === "มีความเสียหาย" || engineCondition === "พบอาการผิดปกติ";

    const report: VehicleReturnReport = {
      returnedAt: new Date().toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " น.",
      returneeId: currentUser.id,
      returneeName: currentUser.name,
      inspectorId: selectedInspector.id,
      inspectorName: `${selectedInspector.name} (${selectedInspector.position})`,
      startMileage,
      endMileage,
      totalDistance,
      startFuelLevel,
      endFuelLevel,
      fuelRefilledLiters: fuelRefilledLiters ? Number(fuelRefilledLiters) : undefined,
      fuelRefilledCost: fuelRefilledCost ? Number(fuelRefilledCost) : undefined,
      fuelReceiptNo: fuelReceiptNo.trim() || undefined,
      vehicleCleanliness: cleanliness,
      bodyCondition,
      engineCondition,
      airConditioner,
      issuesFound: issuesFound.trim() || (isProblemFound ? "พบข้อบกพร่องตามที่ระบุ" : "ไม่มีข้อบกพร่อง"),
      notes: notes.trim() || undefined,
      keyReturned,
      hasIssue: isProblemFound,
      needsMaintenance: isProblemFound || needsMaintenance,
    };

    onSubmitReturn(booking.id, vehicle.id, report);
    onClose();
  };

  const FUEL_OPTIONS: FuelLevel[] = [
    "เต็มถัง (100%)",
    "3/4 ถัง (75%)",
    "1/2 ถัง (50%)",
    "1/4 ถัง (25%)",
    "ใกล้หมด (ต่ำกว่า 15%)",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[calc(100vh-2rem)] md:max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header - Fixed */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-50 via-indigo-50 to-white border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl p-2 bg-white rounded-2xl shadow-xs border border-slate-100">
              🔄
            </span>
            <div>
              <h3 className="font-bold font-heading text-lg text-slate-900">
                รายงานการส่งคืนรถยนต์ราชการและตรวจรับสภาพ
              </h3>
              <p className="text-xs text-slate-500">
                คำขอ: <span className="font-mono font-bold text-indigo-700">{booking.requestNo}</span> · รถ: {booking.vehicleName} ({booking.licensePlate})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold text-xs border border-slate-200 hover:border-rose-200 shadow-xs transition-all cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <span className="text-sm font-black">✕</span>
            <span>ปิดหน้าต่าง</span>
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="overflow-y-auto flex-1 p-6 space-y-5 text-xs sm:text-sm">
            {/* Mission Summary Card */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-slate-400">ผู้ขอใช้รถ:</span>
              <div className="font-bold text-slate-800">{booking.requesterName}</div>
            </div>
            <div>
              <span className="text-slate-400">พนักงานขับรถ:</span>
              <div className="font-bold text-teal-700">{booking.assignedDriver || "ขับเอง"}</div>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-400">ปลายทางภารกิจ:</span>
              <div className="font-semibold text-slate-800 truncate">{booking.destination}</div>
            </div>
          </div>

          {/* Section 1: Odometer & Mileage */}
          <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-100 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold font-heading text-xs text-indigo-950 flex items-center gap-1.5">
                <span>🔢</span>
                <span>บันทึกเลขไมล์กิโลเมตร (Odometer Reading)</span>
              </h4>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px] font-mono font-bold">
                วิ่งจริง: {totalDistance.toLocaleString()} กม.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">
                  เลขไมล์ก่อนออกเดินทาง (กม.) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={startMileage}
                  onChange={(e) => setStartMileage(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl font-mono font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">
                  เลขไมล์เมื่อกลับถึงสำนักงาน (กม.) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  value={endMileage}
                  onChange={(e) => setEndMileage(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl font-mono font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Fuel Gauge & Refill */}
          <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-100 space-y-3">
            <h4 className="font-bold font-heading text-xs text-amber-950 flex items-center gap-1.5">
              <span>⛽</span>
              <span>เกจระดับน้ำมันและค่าใช้จ่ายเชื้อเพลิง (Realistic Fuel Gauge)</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">ระดับน้ำมันตอนออกเดินทาง</label>
                  <input
                    type="text"
                    readOnly
                    value={startFuelLevel}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">
                    เกจระดับน้ำมันเมื่อส่งคืน <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={endFuelLevel}
                    onChange={(e) => setEndFuelLevel(e.target.value as FuelLevel)}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl font-bold text-teal-900 focus:ring-2 focus:ring-amber-500/20 font-body"
                  >
                    {FUEL_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="font-body">
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Realistic Animated Fuel Gauge Cluster */}
              <div className="flex flex-col items-center justify-center p-3 bg-slate-950 rounded-2xl border border-slate-800 shadow-md">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1">
                  หน้าปัดวัดระดับน้ำมันเมื่อส่งคืน
                </span>
                <RealisticFuelGauge
                  level={endFuelLevel}
                  size="md"
                  interactive={true}
                  onChangeLevel={setEndFuelLevel}
                />
              </div>
            </div>


            {/* Fuel Refill info (Optional) */}
            <div className="pt-2 border-t border-amber-200/50 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <label className="block text-slate-500 mb-1">เติมน้ำมันเพิ่ม (ลิตร)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="เช่น 25.5"
                  value={fuelRefilledLiters}
                  onChange={(e) => setFuelRefilledLiters(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">จำนวนเงิน (บาท)</label>
                <input
                  type="number"
                  placeholder="เช่น 950"
                  value={fuelRefilledCost}
                  onChange={(e) => setFuelRefilledCost(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">เลขที่ใบเสร็จน้ำมัน</label>
                <input
                  type="text"
                  placeholder="เช่น PTT-69-1234"
                  value={fuelReceiptNo}
                  onChange={(e) => setFuelReceiptNo(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Section 3: 4-Point Vehicle Condition Inspection */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <h4 className="font-bold font-heading text-xs text-slate-900 flex items-center gap-1.5">
              <span>🛠️</span>
              <span>การตรวจสภาพตัวรถและอุปกรณ์ส่วนควบ 4 ด้าน</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">1. ความสะอาดตัวรถ</label>
                <select
                  value={cleanliness}
                  onChange={(e) => setCleanliness(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-body"
                >
                  <option value="สะอาดเรียบร้อย" className="font-body">✨ สะอาดเรียบร้อย</option>
                  <option value="ต้องล้างทำความสะอาด" className="font-body">🧼 ต้องล้างทำความสะอาด</option>
                  <option value="สกปรกมาก" className="font-body">⚠️ สกปรกมาก (ลุยโคลน/ฝุ่นหนา)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">2. สภาพตัวถังภายนอก</label>
                <select
                  value={bodyCondition}
                  onChange={(e) => setBodyCondition(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-body"
                >
                  <option value="ปกติสมบูรณ์ดี" className="font-body">✓ ปกติสมบูรณ์ดี ไม่มีรอยใหม่</option>
                  <option value="มีรอยขูดขีดใหม่" className="font-body">⚠️ มีรอยขูดขีดใหม่เล็กน้อย</option>
                  <option value="มีความเสียหาย" className="font-body">🛑 มีความเสียหาย/เฉี่ยวชน</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">3. เครื่องยนต์และระบบขับเคลื่อน</label>
                <select
                  value={engineCondition}
                  onChange={(e) => setEngineCondition(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-body"
                >
                  <option value="ปกติสมบูรณ์" className="font-body">✓ เครื่องยนต์และการขับขี่ปกติ</option>
                  <option value="พบอาการผิดปกติ" className="font-body">⚠️ พบเสียงดัง/ช่วงล่างผิดปกติ</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-semibold">4. ระบบปรับอากาศและภายใน</label>
                <select
                  value={airConditioner}
                  onChange={(e) => setAirConditioner(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-body"
                >
                  <option value="แอร์เย็นปกติ" className="font-body">❄️ แอร์เย็นปกติ กลิ่นปกติ</option>
                  <option value="แอร์ไม่ค่อยเย็น/มีกลิ่น" className="font-body">⚠️ แอร์ไม่ค่อยเย็น/มีกลิ่นอับ</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Key Return Confirmation (Step 5) */}
          <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🔑</span>
              <div>
                <span className="font-bold text-xs text-emerald-950">
                  ส่งมอบกุญแจรถยนต์ บัตรเติมน้ำมัน และเอกสารประจำรถ (ขั้นตอนที่ 5)
                </span>
                <p className="text-[11px] text-emerald-800">
                  ยืนยันการนำกุญแจรถส่งคืนเรียบร้อย ณ งานยานพาหนะ ฝ่ายบริหารทั่วไป
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={keyReturned}
                onChange={(e) => setKeyReturned(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Section 5: Issues Found & Maintenance Reporting (Step 7) */}
          <div className={`p-4 rounded-2xl border transition-all ${
            hasIssue || bodyCondition === "มีความเสียหาย" || engineCondition === "พบอาการผิดปกติ"
              ? "bg-rose-50 border-rose-300"
              : "bg-slate-50 border-slate-200"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold font-heading text-xs text-slate-900 flex items-center gap-1.5">
                  <span>🛠️</span>
                  <span>รายงานสภาพปัญหาที่พบ / แจ้งซ่อมบำรุง (ขั้นตอนที่ 7)</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  กรณีพบปัญหาชำรุด ระบบจะปรับสถานะรถเป็น "ส่งซ่อมบำรุง" และส่ง Line Notify ด่วนไปยังหัวหน้าฝ่ายบริหารทั่วไป
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasIssue}
                  onChange={(e) => {
                    setHasIssue(e.target.checked);
                    if (e.target.checked) setNeedsMaintenance(true);
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
              </label>
            </div>

            {(hasIssue || bodyCondition === "มีความเสียหาย" || engineCondition === "พบอาการผิดปกติ") && (
              <div className="space-y-2 pt-3 mt-3 border-t border-rose-200 text-xs">
                <label className="block text-rose-900 font-bold">
                  ระบุสภาพปัญหาที่พบ หรือ อาการที่ต้องดำเนินการซ่อมแซม <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={issuesFound}
                  onChange={(e) => setIssuesFound(e.target.value)}
                  placeholder="เช่น ยางลมหน้าซ้ายรั่วซึม, ระบบเบรกมีเสียงดัง, แอร์ไม่เย็น หรือช่วงล่างมีเสียงผิดปกติ..."
                  className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs text-slate-800 resize-none focus:ring-2 focus:ring-rose-500/30"
                />
                <div className="flex items-center gap-2 p-2 bg-rose-100/70 rounded-xl text-rose-900 text-[11px] font-bold">
                  <span>🚨</span>
                  <span>เมื่อยืนยัน ระบบจะส่ง Line Notify แจ้งเตือนด่วนไปยัง <strong>นายเสกพล ดิษฐโชติ (หัวหน้าฝ่ายบริหารทั่วไป)</strong> เพื่อออกใบสั่งซ่อมบำรุงทันที</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Returnee & Inspector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 mb-1 font-semibold">ผู้ส่งคืนรถยนต์</label>
              <input
                type="text"
                readOnly
                value={`${currentUser.name} (${currentUser.position})`}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-medium font-body"
              />
            </div>

            <div>
              <label className="block text-slate-600 mb-1 font-semibold">
                เจ้าหน้าที่ผู้ตรวจรับรถยนต์ราชการ <span className="text-rose-500">*</span>
              </label>
              <select
                value={inspectorId}
                onChange={(e) => setInspectorId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 font-semibold font-body"
              >
                {inspectors.map((ins) => (
                  <option key={ins.id} value={ins.id} className="font-body">
                    {ins.name} ({ins.position})
                  </option>
                ))}
              </select>
            </div>
          </div>
          </div>

          {/* Footer Actions - Fixed */}
          <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#0D9488] hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md shadow-teal-700/20 transition-colors cursor-pointer flex items-center gap-2"
            >
              <span>✓</span>
              <span>บันทึกการส่งคืนและปิดภารกิจ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
