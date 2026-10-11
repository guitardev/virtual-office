"use client";

import React, { useState } from "react";
import { CarBookingRequest, Member } from "@/lib/types";
import { GOVERNMENT_DRIVERS } from "@/lib/carbooking-data";

interface ReviewBookingModalProps {
  booking: CarBookingRequest;
  currentUser: Member;
  onEndorse: (bookingId: string, assignedDriver: string, managerNotes: string) => void;
  onApprove: (bookingId: string, approverNotes: string) => void;
  onReject: (bookingId: string, reason: string) => void;
  onClose: () => void;
}

export function ReviewBookingModal({
  booking,
  currentUser,
  onEndorse,
  onApprove,
  onReject,
  onClose,
}: ReviewBookingModalProps) {
  const isManagerTier = booking.status === "pending_review";
  const isAdminTier = booking.status === "endorsed";

  const [assignedDriver, setAssignedDriver] = useState<string>(
    booking.assignedDriver || GOVERNMENT_DRIVERS[0].name
  );
  const [customDriver, setCustomDriver] = useState<string>("");
  const [useCustomDriver, setUseCustomDriver] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>(
    isManagerTier
      ? `ตรวจสอบความพร้อมแล้ว รถ ${booking.vehicleName} ทะเบียน ${booking.licensePlate} ว่าง เห็นควรเสนอ พมจ. เพื่อโปรดพิจารณาอนุมัติ`
      : "อนุมัติให้ใช้รถยนต์ราชการตามขอ โดยให้ปฏิบัติตามระเบียบว่าด้วยการใช้รถราชการอย่างเคร่งครัด"
  );
  const [rejectReason, setRejectReason] = useState<string>("");
  const [showRejectForm, setShowRejectForm] = useState<boolean>(false);

  const handleAction = () => {
    if (showRejectForm) {
      if (!rejectReason.trim()) {
        alert("กรุณาระบุเหตุผลในการไม่อนุมัติ / ส่งกลับ");
        return;
      }
      onReject(booking.id, rejectReason.trim());
      return;
    }

    if (isManagerTier) {
      const driverToAssign = useCustomDriver ? customDriver.trim() : assignedDriver;
      if (!driverToAssign && booking.requireDriver) {
        alert("กรุณาเลือกหรือระบุพนักงานขับรถ");
        return;
      }
      onEndorse(
        booking.id,
        booking.requireDriver ? driverToAssign : "ขับขี่เองโดยผู้ขอใช้รถ",
        notes.trim()
      );
    } else if (isAdminTier) {
      onApprove(booking.id, notes.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[calc(100vh-2rem)] md:max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header - Fixed */}
        <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
          isAdminTier
            ? "bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border-emerald-200"
            : "bg-gradient-to-r from-indigo-500/10 via-teal-500/10 to-transparent border-indigo-200"
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{isAdminTier ? "👑" : "👔"}</span>
            <div>
              <h3 className="font-bold font-heading text-lg text-slate-900">
                {isAdminTier
                  ? "พิจารณาอนุมัติขั้นสุดท้าย (Admin: พมจ.กำแพงเพชร)"
                  : "ตรวจสอบความพร้อม & ลงความเห็นชอบ (Manager: หัวหน้าฝ่าย)"}
              </h3>
              <p className="text-xs text-slate-500">
                เลขที่คำขอ: <span className="font-mono font-bold text-slate-700">{booking.requestNo}</span> · ผู้ขอ: {booking.requesterName}
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

        {/* Content - Scrollable */}
        <div className="p-6 space-y-5 text-sm overflow-y-auto flex-1 min-h-0">
          {/* Summary Details */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs text-slate-400">รถยนต์ที่ขอใช้:</span>
                <div className="font-bold text-slate-900 text-base">
                  {booking.vehicleName}
                </div>
                <div className="text-xs font-mono font-semibold text-indigo-600">
                  {booking.licensePlate}
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                booking.status === "pending_review"
                  ? "bg-amber-100 text-amber-800"
                  : booking.status === "endorsed"
                  ? "bg-teal-100 text-teal-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}>
                {booking.status === "pending_review"
                  ? "รอหัวหน้าฝ่ายตรวจ"
                  : booking.status === "endorsed"
                  ? "รอ พมจ. อนุมัติ"
                  : "อนุมัติแล้ว"}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500">ภารกิจ:</span>{" "}
                <span className="font-semibold text-slate-800">{booking.purpose}</span>
              </div>
              <div>
                <span className="text-slate-500">ปลายทาง:</span>{" "}
                <span className="font-semibold text-slate-800">{booking.destination}</span>
              </div>
              <div>
                <span className="text-slate-500">เวลาเดินทาง:</span>{" "}
                <span className="font-mono text-slate-800">{booking.departureTime.replace("T", " ")}</span>
              </div>
              <div>
                <span className="text-slate-500">ผู้ร่วมเดินทาง:</span>{" "}
                <span className="font-semibold text-slate-800">{booking.passengerCount} คน</span>
              </div>
            </div>

            {/* Fuel Budget Request (if requested) */}
            {booking.fuelBudgetRequested ? (
              <div className="mt-2 pt-2 border-t border-slate-200/60 p-2.5 bg-amber-50/80 rounded-xl border border-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <span>⛽</span>
                  <span>ของบประมาณค่าน้ำมันเชื้อเพลิง:</span>
                  <span className="font-mono text-amber-950 font-black">
                    {(booking.fuelBudgetAmount || 0).toLocaleString()} บาท
                  </span>
                </div>
                <div className="text-[11px] text-amber-800">
                  แหล่งงบ: <strong>{booking.fuelBudgetSource || "งบดำเนินงานสำนักงาน"}</strong>
                </div>
              </div>
            ) : (
              <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
                <span>⛽</span>
                <span>ไม่ของบประมาณค่าน้ำมัน (ใช้น้ำมันคงเหลือประจำรถ)</span>
              </div>
            )}
          </div>

          {/* If Tier 3 (Admin), show Tier 2 (Manager) endorsement info and Notify preview */}
          {isAdminTier && (
            <div className="space-y-3">
              {booking.managerName && (
                <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-2xl text-xs space-y-1">
                  <div className="font-bold text-teal-900 flex items-center gap-1.5">
                    <span>✓</span>
                    <span>ความเห็นชอบของหัวหน้าฝ่ายบริหารทั่วไป ({booking.managerName}):</span>
                  </div>
                  <p className="text-teal-800 italic">"{booking.managerNotes || "เห็นชอบตามเสนอ"}"</p>
                  {booking.assignedDriver && (
                    <div className="pt-1 text-[11px] text-teal-950">
                      <strong>พนักงานขับรถที่มอบหมาย:</strong> {booking.assignedDriver}
                    </div>
                  )}
                </div>
              )}

              {/* Notify Dispatch Preview Banner */}
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start gap-2.5">
                <span className="text-base shrink-0">📲</span>
                <div>
                  <div className="font-bold">ระบบแจ้งเตือนอัตโนมัติ (Automated Notification Dispatch):</div>
                  <p className="text-[11px] text-blue-800 mt-0.5">
                    เมื่อ พมจ. กดอนุมัติ ระบบจะส่ง Notify (Line Notify + System Alert) ไปยัง <strong>ผู้ขอใช้รถ ({booking.requesterName})</strong>, <strong>พนักงานขับรถ ({booking.assignedDriver || "พนักงานขับรถ"})</strong> และ <strong>เจ้าหน้าที่ยานพาหนะ</strong> ทันที
                  </p>
                </div>
              </div>
            </div>
          )}


          {/* Form Content based on Role & State */}
          {!showRejectForm ? (
            <div className="space-y-4">
              {/* If Manager Tier, allow driver assignment */}
              {isManagerTier && booking.requireDriver && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    🚗 มอบหมายพนักงานขับรถราชการ (Driver Assignment)
                  </label>
                  {!useCustomDriver ? (
                    <div className="space-y-2">
                      <select
                        value={assignedDriver}
                        onChange={(e) => setAssignedDriver(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-indigo-500 transition-colors font-body"
                      >
                        {GOVERNMENT_DRIVERS.map((d) => (
                          <option key={d.id} value={d.name} className="font-body py-1">
                            {d.name} ({d.phone}) — {d.status}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setUseCustomDriver(true)}
                        className="text-xs text-indigo-600 hover:underline font-semibold"
                      >
                        + ระบุพนักงานขับรถคนอื่น
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="ระบุชื่อ-นามสกุล พนักงานขับรถ หรือผู้ควบคุมรถ"
                        value={customDriver}
                        onChange={(e) => setCustomDriver(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setUseCustomDriver(false)}
                        className="text-xs text-indigo-600 hover:underline font-semibold"
                      >
                        ← เลือกจากรายชื่อพนักงานขับรถส่วนกลาง
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Notes input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isAdminTier ? "คำสั่งการ / ข้อกำหนดการอนุมัติ (พมจ.)" : "ความเห็นชอบและข้อเสนอแนะ (หัวหน้าฝ่าย)"}
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-indigo-500 resize-none"
                />
              </div>
            </div>
          ) : (
            /* Reject Form */
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
              <div className="font-bold text-rose-900 text-xs">
                ⚠️ ระบุเหตุผลการไม่อนุมัติ / ส่งกลับคำขอ
              </div>
              <textarea
                rows={3}
                placeholder="เช่น รถคันดังกล่าวมีภารกิจด่วนของผู้ว่าราชการจังหวัด หรือกรุณาปรับเปลี่ยนช่วงเวลาเดินทาง..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-rose-300 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-rose-500/20 resize-none"
              />
              <button
                type="button"
                onClick={() => setShowRejectForm(false)}
                className="text-xs text-slate-500 hover:underline"
              >
                ← ยกเลิกและกลับไปหน้าเดิม
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions - Fixed */}
        <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {!showRejectForm ? (
            <button
              type="button"
              onClick={() => setShowRejectForm(true)}
              className="px-4 py-2.5 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              ✕ ไม่อนุมัติ / ส่งกลับ
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              onClick={handleAction}
              className={`px-5 py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                showRejectForm
                  ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                  : isAdminTier
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                  : "bg-[#0D9488] hover:bg-teal-700 shadow-teal-600/20"
              }`}
            >
              {showRejectForm ? (
                "ยืนยันการไม่อนุมัติ"
              ) : isAdminTier ? (
                <>
                  <span>👑</span>
                  <span>อนุมัติการใช้รถราชการ</span>
                </>
              ) : (
                <>
                  <span>✓</span>
                  <span>เห็นชอบ & เสนอ พมจ.</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
