"use client";

import React, { useState } from "react";
import { CarBookingRequest, Member, Vehicle } from "@/lib/types";
import { GOVERNMENT_DRIVERS, cleanPersonName } from "@/lib/carbooking-data";

interface ReviewBookingModalProps {
  booking: CarBookingRequest;
  currentUser: Member;
  vehicles?: Vehicle[];
  allBookings?: CarBookingRequest[];
  members?: Member[];
  onDivisionEndorse?: (bookingId: string, notes: string) => void;
  onFleetAssign?: (bookingId: string, vehicleId: string, assignedDriver: string, notes: string) => void;
  onAdminHeadEndorse?: (bookingId: string, notes: string) => void;
  onProvincialApprove?: (bookingId: string, notes: string) => void;
  onEndorse?: (bookingId: string, assignedDriver: string, managerNotes: string) => void;
  onApprove?: (bookingId: string, approverNotes: string) => void;
  onReject: (bookingId: string, reason: string) => void;
  onClose: () => void;
}

export function ReviewBookingModal({
  booking,
  currentUser,
  vehicles = [],
  allBookings = [],
  members = [],
  onDivisionEndorse,
  onFleetAssign,
  onAdminHeadEndorse,
  onProvincialApprove,
  onEndorse,
  onApprove,
  onReject,
  onClose,
}: ReviewBookingModalProps) {
  const isStage1 = booking.status === "pending_division_head" || booking.status === "pending_review";
  const isStage2 = booking.status === "pending_fleet_assignment";
  const isStage3 = booking.status === "pending_admin_head";
  const isStage4 = booking.status === "pending_provincial" || booking.status === "endorsed";
  const isMyBooking =
    booking.requesterId === currentUser.id ||
    (Boolean(currentUser.name) && booking.requesterName === currentUser.name);

  // ผู้มีสิทธิ์จัดสรรรถ/คนขับ (Stage 2): มีเฉพาะ 2 คน คือ หัวหน้าฝ่ายบริหาร และ syno_ปภาวิน
  const isFleetDispatcherAuthorized =
    currentUser.id === "syno_ปภาวิน" ||
    currentUser.name.includes("ปภาวิน") ||
    currentUser.id === "syno_เสกพล" ||
    currentUser.name.includes("เสกพล") ||
    (currentUser.division?.includes("ฝ่ายบริหารทั่วไป") &&
      (currentUser.position?.includes("หัวหน้า") || currentUser.role === "manager")) ||
    currentUser.id === booking.fleetDispatcherId;

  // ผู้มีสิทธิ์เห็นชอบ (Stage 3): เฉพาะหัวหน้าฝ่ายบริหารทั่วไปเท่านั้น
  const isAdminHeadAuthorized =
    currentUser.id === "syno_เสกพล" ||
    currentUser.name.includes("เสกพล") ||
    (currentUser.division?.includes("ฝ่ายบริหารทั่วไป") &&
      (currentUser.position?.includes("หัวหน้า") || currentUser.role === "manager"));

  // Check vehicle status and time overlap with other active bookings
  const getVehicleAvailability = (veh: Vehicle) => {
    if (veh.status === "maintenance") {
      return { available: false, reason: "อยู่ระหว่างซ่อมบำรุง" };
    }
    const startReq = new Date(booking.departureTime).getTime();
    const endReq = new Date(booking.returnTime).getTime();

    const conflictingBooking = (allBookings || []).find((b) => {
      if (b.id === booking.id) return false;
      if (b.status === "rejected" || b.status === "completed") return false;
      if (b.vehicleId !== veh.id) return false;
      const bStart = new Date(b.departureTime).getTime();
      const bEnd = new Date(b.returnTime).getTime();
      return !isNaN(startReq) && !isNaN(endReq) && !isNaN(bStart) && !isNaN(bEnd) && startReq < bEnd && endReq > bStart;
    });

    if (conflictingBooking) {
      return {
        available: false,
        reason: `ติดภารกิจ (${conflictingBooking.requestNo}: ${conflictingBooking.destination})`,
      };
    }
    return { available: true, reason: "ว่าง / พร้อมใช้งาน" };
  };

  // Check driver availability against overlapping bookings
  const getDriverAvailability = (driverName: string) => {
    if (!driverName) return { available: true, reason: "ว่าง" };
    const startReq = new Date(booking.departureTime).getTime();
    const endReq = new Date(booking.returnTime).getTime();

    const conflictingBooking = (allBookings || []).find((b) => {
      if (b.id === booking.id) return false;
      if (b.status === "rejected" || b.status === "completed") return false;
      if (b.assignedDriver !== driverName) return false;
      const bStart = new Date(b.departureTime).getTime();
      const bEnd = new Date(b.returnTime).getTime();
      return !isNaN(startReq) && !isNaN(endReq) && !isNaN(bStart) && !isNaN(bEnd) && startReq < bEnd && endReq > bStart;
    });

    if (conflictingBooking) {
      return {
        available: false,
        reason: `ติดภารกิจ (${conflictingBooking.requestNo}: ${conflictingBooking.destination})`,
      };
    }
    return { available: true, reason: "ว่าง / พร้อมปฏิบัติหน้าที่" };
  };

  // Auto pick first truly available vehicle and driver
  const availableVehicles = vehicles.filter((v) => getVehicleAvailability(v).available);
  const defaultVehId =
    booking.vehicleId && vehicles.some((v) => v.id === booking.vehicleId && getVehicleAvailability(v).available)
      ? booking.vehicleId
      : availableVehicles[0]?.id || vehicles[0]?.id || "";

  const availableDrivers = GOVERNMENT_DRIVERS.filter((d) => getDriverAvailability(d.name).available);
  const defaultDriver =
    cleanPersonName(booking.assignedDriver) && booking.assignedDriver !== "รอฝ่ายบริหารจัดสรร" && booking.assignedDriver !== "ขับขี่เองโดยผู้ขอใช้รถ"
      ? cleanPersonName(booking.assignedDriver)
      : (booking.requireDriver === false
          ? cleanPersonName(booking.requesterName)
          : (availableDrivers[0]?.name || GOVERNMENT_DRIVERS[0]?.name || "นายสมชาย มั่นคง"));

  // Form State for Stage 2 (Fleet & Driver Assignment)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(defaultVehId);
  const [assignedDriver, setAssignedDriver] = useState<string>(defaultDriver);
  const [customDriver, setCustomDriver] = useState<string>("");
  const [useCustomDriver, setUseCustomDriver] = useState<boolean>(false);
  const [requireDriver, setRequireDriver] = useState<boolean>(booking.requireDriver ?? true);

  // Notes state initialized based on active stage
  const getDefaultNotes = () => {
    if (isStage1) return "เห็นชอบตามขอ เพื่อประโยชน์แก่ทางราชการ";
    if (isStage2) return "ตรวจสอบความพร้อมแล้ว รถและคนขับมีสถานะว่าง พร้อมจัดสรร เสนอหัวหน้าฝ่ายบริหารทั่วไปเพื่อโปรดพิจารณา";
    if (isStage3) return "ตรวจสอบความถูกต้องเรียบร้อยแล้ว เห็นควรอนุมัติเพื่อโปรดพิจารณา";
    if (isStage4) return "อนุมัติให้ใช้รถยนต์ราชการตามขอ โดยให้ปฏิบัติตามระเบียบว่าด้วยการใช้รถราชการอย่างเคร่งครัด";
    return "";
  };

  const [notes, setNotes] = useState<string>(getDefaultNotes);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [showRejectForm, setShowRejectForm] = useState<boolean>(false);

  const selectedVehicleObj = vehicles.find((v) => v.id === selectedVehicleId) || {
    id: booking.vehicleId,
    name: booking.vehicleName,
    licensePlate: booking.licensePlate,
  };

  const handleAction = () => {
    if (showRejectForm) {
      if (!rejectReason.trim()) {
        alert("กรุณาระบุเหตุผลในการไม่อนุมัติ / ส่งกลับแก้ไข");
        return;
      }
      onReject(booking.id, rejectReason.trim());
      return;
    }

    if (isStage1) {
      if (isMyBooking) {
        alert("ผู้ขอใช้รถไม่สามารถพิจารณาเห็นชอบคำขอของตนเองได้ ต้องให้หัวหน้ากลุ่มงานหรือผู้ได้รับมอบหมายเป็นผู้พิจารณา");
        return;
      }
      // Step 2: Division Head / Official Endorsement
      if (onDivisionEndorse) {
        onDivisionEndorse(booking.id, notes.trim());
      } else if (onEndorse) {
        onEndorse(booking.id, booking.assignedDriver || "รอจัดสรร", notes.trim());
      }
    } else if (isStage2) {
      if (currentUser.role !== "admin" && !isFleetDispatcherAuthorized) {
        alert("เฉพาะเจ้าหน้าที่ฝ่ายบริหารทั่วไป (หัวหน้าฝ่ายบริหารทั่วไป หรือ คุณปภาวิน) เท่านั้นที่มีสิทธิ์จัดสรรรถยนต์และคนขับ");
        return;
      }
      // Step 3: Fleet Dispatcher Resource Assignment
      if (!selectedVehicleId) {
        alert("กรุณาเลือกยานพาหนะส่วนกลาง");
        return;
      }
      const selectedVeh = vehicles.find((v) => v.id === selectedVehicleId);
      if (selectedVeh) {
        const vehAvail = getVehicleAvailability(selectedVeh);
        if (!vehAvail.available) {
          if (!confirm(`⚠️ คำเตือน: ยานพาหนะคันนี้ ${vehAvail.reason}\n\nคุณต้องการยืนยันการจัดสรรคันนี้หรือไม่?`)) {
            return;
          }
        }
      }

      const driverToAssign = !requireDriver
        ? (cleanPersonName(assignedDriver) || cleanPersonName(booking.assignedDriver) || cleanPersonName(booking.requesterName))
        : useCustomDriver
        ? customDriver.trim()
        : cleanPersonName(assignedDriver);

      if (requireDriver && !driverToAssign) {
        alert("กรุณาเลือกหรือระบุชื่อพนักงานขับรถ");
        return;
      }

      if (requireDriver && !useCustomDriver && driverToAssign) {
        const drvAvail = getDriverAvailability(driverToAssign);
        if (!drvAvail.available) {
          if (!confirm(`⚠️ คำเตือน: พนักงานขับรถท่านนี้ ${drvAvail.reason}\n\nคุณต้องการยืนยันการมอบหมายคนขับท่านนี้หรือไม่?`)) {
            return;
          }
        }
      }

      if (onFleetAssign) {
        onFleetAssign(booking.id, selectedVehicleId, driverToAssign, notes.trim());
      } else if (onEndorse) {
        onEndorse(booking.id, driverToAssign, notes.trim());
      }
    } else if (isStage3) {
      if (currentUser.role !== "admin" && !isAdminHeadAuthorized) {
        alert("เฉพาะหัวหน้าฝ่ายบริหารทั่วไปเท่านั้นที่มีสิทธิ์ให้ความเห็นชอบในขั้นตอนนี้");
        return;
      }
      // Step 4.1: Admin Head Endorsement
      if (onAdminHeadEndorse) {
        onAdminHeadEndorse(booking.id, notes.trim());
      } else if (onEndorse) {
        onEndorse(booking.id, booking.assignedDriver || "", notes.trim());
      }
    } else if (isStage4) {
      // Step 4.2: Provincial Governor (พมจ.) Approval
      if (onProvincialApprove) {
        onProvincialApprove(booking.id, notes.trim());
      } else if (onApprove) {
        onApprove(booking.id, notes.trim());
      }
    }
  };

  const getStageHeader = () => {
    if (isStage1) {
      return {
        icon: "👔",
        title: "ขั้นที่ 1: ตรวจสอบและให้ความเห็นชอบ (หัวหน้ากลุ่ม/ข้าราชการในกลุ่ม)",
        subtitle: `พิจารณาคำขอของเจ้าหน้าที่ในกลุ่ม/ฝ่าย: ${booking.requesterDivision}`,
        bg: "bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent border-amber-200",
      };
    }
    if (isStage2) {
      return {
        icon: "🚙",
        title: "ขั้นที่ 2: จัดสรรยานพาหนะและพนักงานขับรถ (เจ้าหน้าที่ฝ่ายบริหาร)",
        subtitle: "เลือกรถยนต์ราชการที่เหมาะสมและมอบหมายพนักงานขับรถยนต์",
        bg: "bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border-blue-200",
      };
    }
    if (isStage3) {
      return {
        icon: "💼",
        title: "ขั้นที่ 3: ตรวจสอบความพร้อมและให้ความเห็นชอบ (หัวหน้าฝ่ายบริหารทั่วไป)",
        subtitle: "ตรวจสอบการจัดสรรทรัพยากรและงบประมาณค่าน้ำมัน ก่อนเสนอ พมจ.",
        bg: "bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-transparent border-teal-200",
      };
    }
    return {
      icon: "👑",
      title: "ขั้นที่ 4: พิจารณาอนุมัติขั้นสุดท้าย (พมจ.กำแพงเพชร)",
      subtitle: "อนุมัติการใช้รถยนต์ราชการและแจ้งเตือน Line Notify ไปยังผู้ขอใช้รถ",
      bg: "bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border-emerald-200",
    };
  };

  const headerInfo = getStageHeader();

  const currentVeh = vehicles.find((v) => v.id === selectedVehicleId);
  const selectedVehAvail = currentVeh ? getVehicleAvailability(currentVeh) : null;
  const selectedDriverAvail = requireDriver && !useCustomDriver ? getDriverAvailability(assignedDriver) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[calc(100vh-2rem)] md:max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${headerInfo.bg}`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl p-2 bg-white rounded-2xl shadow-xs border border-slate-100">
              {headerInfo.icon}
            </span>
            <div>
              <h3 className="font-bold font-heading text-base sm:text-lg text-slate-900">
                {headerInfo.title}
              </h3>
              <p className="text-xs text-slate-500">
                {headerInfo.subtitle} · คำขอ: <span className="font-mono font-bold text-slate-700">{booking.requestNo}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold text-xs border border-slate-200 hover:border-rose-200 shadow-xs transition-all cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <span className="text-sm font-black">✕</span>
            <span>ปิด</span>
          </button>
        </div>

        {/* Workflow Progress Breadcrumb */}
        <div className="px-6 py-2.5 bg-slate-50/80 border-b border-slate-200/60 flex items-center justify-between text-xs overflow-x-auto gap-2">
          <div className={`flex items-center gap-1.5 font-bold ${isStage1 ? "text-amber-800" : booking.divisionReviewerActionAt ? "text-emerald-700" : "text-slate-400"}`}>
            <span>1. หัวหน้ากลุ่ม</span>
            {booking.divisionReviewerActionAt ? "✓" : isStage1 ? "⏳" : ""}
          </div>
          <span className="text-slate-300">→</span>
          <div className={`flex items-center gap-1.5 font-bold ${isStage2 ? "text-blue-800" : booking.fleetDispatcherActionAt ? "text-emerald-700" : "text-slate-400"}`}>
            <span>2. จัดสรรรถ/คนขับ</span>
            {booking.fleetDispatcherActionAt ? "✓" : isStage2 ? "⏳" : ""}
          </div>
          <span className="text-slate-300">→</span>
          <div className={`flex items-center gap-1.5 font-bold ${isStage3 ? "text-teal-800" : booking.adminHeadActionAt ? "text-emerald-700" : "text-slate-400"}`}>
            <span>3. หน.ฝ่ายบริหาร</span>
            {booking.adminHeadActionAt ? "✓" : isStage3 ? "⏳" : ""}
          </div>
          <span className="text-slate-300">→</span>
          <div className={`flex items-center gap-1.5 font-bold ${isStage4 ? "text-emerald-800" : booking.approverActionAt ? "text-emerald-700" : "text-slate-400"}`}>
            <span>4. พมจ. อนุมัติ</span>
            {booking.approverActionAt ? "✓" : isStage4 ? "⏳" : ""}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-sm overflow-y-auto flex-1 min-h-0">
          {/* Mission Details Card */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400">ผู้ยื่นคำขอ:</span>{" "}
                <strong className="text-slate-900">{booking.requesterName}</strong> ({booking.requesterPosition})
              </div>
              <div>
                <span className="text-slate-400">กลุ่ม/ฝ่าย:</span>{" "}
                <strong className="text-slate-900">{booking.requesterDivision}</strong>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400">ภารกิจ/วัตถุประสงค์:</span>{" "}
                <strong className="text-slate-900">{booking.purpose}</strong>
              </div>
              <div>
                <span className="text-slate-400">สถานที่ไปราชการ:</span>{" "}
                <strong className="text-slate-800">{booking.destination}</strong>
              </div>
              <div>
                <span className="text-slate-400">ระยะทางโดยประมาณ:</span>{" "}
                <strong className="text-slate-800 font-mono">{booking.estimatedDistance || 150} กิโลเมตร</strong>
              </div>
              <div>
                <span className="text-slate-400">วันเวลาเดินทาง:</span>{" "}
                <strong className="text-slate-800 font-mono">{booking.departureTime.replace("T", " ")} ถึง {booking.returnTime.replace("T", " ")}</strong>
              </div>
              <div>
                <span className="text-slate-400">จำนวนผู้โดยสาร:</span>{" "}
                <strong className="text-slate-800">{booking.passengerCount} คน</strong> ({booking.passengersList || "ไม่มีรายชื่อเพิ่มเติม"})
              </div>
            </div>

            {/* Fuel Budget info if requested */}
            {booking.fuelBudgetRequested && (
              <div className="mt-2 pt-2 border-t border-slate-200/80 p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <span>⛽</span>
                  <span>ของบประมาณค่าน้ำมันเชื้อเพลิง: {booking.fuelBudgetAmount?.toLocaleString()} บาท</span>
                </span>
                <span className="text-[11px] text-amber-800">
                  แหล่งงบ: {booking.fuelBudgetSource || "งบดำเนินงานสำนักงาน"}
                </span>
              </div>
            )}
          </div>

          {/* Previous Endorsement History (if any) */}
          {(booking.divisionReviewerNotes || booking.fleetDispatcherNotes || booking.adminHeadNotes) && (
            <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-200/80 space-y-2 text-xs">
              <h4 className="font-bold text-teal-950 flex items-center gap-1.5">
                <span>📜</span>
                <span>ประวัติความเห็นชอบในสายงานราชการ:</span>
              </h4>
              {booking.divisionReviewerNotes && (
                <div className="pl-3 border-l-2 border-teal-400">
                  <span className="text-slate-500 font-semibold">1. หัวหน้ากลุ่ม/ข้าราชการ ({booking.divisionReviewerName || "ผู้เห็นชอบ"}):</span>
                  <p className="text-slate-800 mt-0.5">"{booking.divisionReviewerNotes}"</p>
                </div>
              )}
              {booking.fleetDispatcherNotes && (
                <div className="pl-3 border-l-2 border-blue-400">
                  <span className="text-slate-500 font-semibold">2. งานยานพาหนะ ฝ่ายบริหาร ({booking.fleetDispatcherName || "เจ้าหน้าที่ยานพาหนะ"}):</span>
                  <p className="text-slate-800 mt-0.5">"{booking.fleetDispatcherNotes}"</p>
                </div>
              )}
              {booking.adminHeadNotes && (
                <div className="pl-3 border-l-2 border-indigo-400">
                  <span className="text-slate-500 font-semibold">3. หัวหน้าฝ่ายบริหารทั่วไป ({booking.adminHeadName || "หน.ฝ่ายบริหาร"}):</span>
                  <p className="text-slate-800 mt-0.5">"{booking.adminHeadNotes}"</p>
                </div>
              )}
            </div>
          )}

          {/* STAGE 2 SPECIFIC: Fleet & Driver Assignment Form */}
          {isStage2 && (
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-200 space-y-4 text-xs">
              <h4 className="font-bold font-heading text-sm text-blue-950 flex items-center gap-1.5">
                <span>🚗</span>
                <span>จัดสรรยานพาหนะและพนักงานขับรถ</span>
              </h4>

              {/* Select Vehicle */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-slate-700 font-semibold">
                    เลือกยานพาหนะส่วนกลาง (ระบบตรวจสอบสถานะความพร้อมอัตโนมัติ) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-blue-700 font-bold bg-blue-100/70 px-2 py-0.5 rounded-md">
                    ว่าง {availableVehicles.length}/{vehicles.length} คัน
                  </span>
                </div>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className={`w-full px-3 py-2.5 bg-white border rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 ${
                    selectedVehAvail && !selectedVehAvail.available ? "border-rose-300 ring-2 ring-rose-200" : "border-blue-300"
                  }`}
                >
                  <option value="">-- เลือกยานพาหนะส่วนกลาง --</option>
                  {vehicles.map((v) => {
                    const avail = getVehicleAvailability(v);
                    return (
                      <option key={v.id} value={v.id}>
                        {avail.available ? "🟢 [ว่าง] " : "🔴 [ไม่ว่าง] "}
                        {v.name} [{v.licensePlate}] ({v.category} • {v.capacity} ที่นั่ง • {avail.reason})
                      </option>
                    );
                  })}
                </select>

                {selectedVehAvail && !selectedVehAvail.available && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] flex items-center gap-2 animate-fade-in">
                    <span className="text-sm">⚠️</span>
                    <span><strong>แจ้งเตือน:</strong> ยานพาหนะคันนี้{selectedVehAvail.reason} แนะนำให้เลือกคันที่มีสัญลักษณ์ 🟢 [ว่าง]</span>
                  </div>
                )}
              </div>

              {/* Driver Requirement toggle & selection */}
              <div className="space-y-3 pt-2 border-t border-blue-200/60">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">ต้องการพนักงานขับรถยนต์ราชการ:</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requireDriver}
                      onChange={(e) => setRequireDriver(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {requireDriver && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-slate-700 font-semibold">
                        มอบหมายพนักงานขับรถยนต์ (ระบบตรวจสอบสถานะความพร้อมอัตโนมัติ) <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setUseCustomDriver(!useCustomDriver)}
                        className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
                      >
                        {useCustomDriver ? "← เลือกจากทำเนียบคนขับ" : "+ ระบุชื่อพนักงานอื่น"}
                      </button>
                    </div>

                    {!useCustomDriver ? (
                      <>
                        <select
                          value={assignedDriver}
                          onChange={(e) => setAssignedDriver(e.target.value)}
                          className={`w-full px-3 py-2.5 bg-white border rounded-xl text-xs font-semibold text-slate-900 ${
                            selectedDriverAvail && !selectedDriverAvail.available ? "border-rose-300 ring-2 ring-rose-200" : "border-blue-300"
                          }`}
                        >
                          {GOVERNMENT_DRIVERS.map((d) => {
                            const dAvail = getDriverAvailability(d.name);
                            return (
                              <option key={d.id} value={d.name}>
                                {dAvail.available ? "🟢 [ว่าง] " : "🔴 [ไม่ว่าง] "}
                                {d.name} ({d.phone} • {dAvail.reason})
                              </option>
                            );
                          })}
                        </select>

                        {selectedDriverAvail && !selectedDriverAvail.available && (
                          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-[11px] flex items-center gap-2 animate-fade-in">
                            <span className="text-sm">⚠️</span>
                            <span><strong>แจ้งเตือน:</strong> {assignedDriver} {selectedDriverAvail.reason} แนะนำให้เลือกพนักงานขับรถที่มีสัญลักษณ์ 🟢 [ว่าง]</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <input
                        type="text"
                        placeholder="ระบุชื่อ-สกุล พนักงานขับรถยนต์ราชการ"
                        value={customDriver}
                        onChange={(e) => setCustomDriver(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-xs text-slate-900"
                      />
                    )}
                  </div>
                )}

                {!requireDriver && (
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-blue-950 flex items-center gap-1.5">
                        <span>👤</span>
                        <span>เจ้าหน้าที่ผู้ทำหน้าที่ขับขี่ (ขับขี่เอง):</span>
                      </label>
                      <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-blue-200 font-bold text-blue-800">
                        ไม่ขอพนักงานขับรถส่วนกลาง
                      </span>
                    </div>

                    <select
                      value={cleanPersonName(assignedDriver) || cleanPersonName(booking.assignedDriver) || ""}
                      onChange={(e) => setAssignedDriver(cleanPersonName(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-xs font-semibold text-slate-900"
                    >
                      {booking.assignedDriver && booking.assignedDriver !== "ขับขี่เองโดยผู้ขอใช้รถ" && (
                        <option value={cleanPersonName(booking.assignedDriver)}>
                          {cleanPersonName(booking.assignedDriver)} (ระบุโดยผู้ขอใช้รถ)
                        </option>
                      )}
                      <option value={cleanPersonName(booking.requesterName)}>
                        {cleanPersonName(booking.requesterName)} (ผู้ขอใช้รถ)
                      </option>
                      {members.map((m) => (
                        <option key={m.id} value={cleanPersonName(m.name)}>
                          {m.name} ({m.position})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rejection Form toggle */}
          {showRejectForm ? (
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 space-y-3">
              <label className="block text-xs font-bold text-rose-900">
                เหตุผลในการไม่อนุมัติ / ส่งกลับแก้ไข <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="ระบุเหตุผล เช่น ข้อมูลภารกิจไม่ชัดเจน หรือ พาหนะไม่พร้อมใช้งานในช่วงเวลาดังกล่าว..."
                className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleAction}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
                >
                  ยืนยันไม่อนุมัติ / ส่งกลับ
                </button>
              </div>
            </div>
          ) : (
            /* Notes / Endorsement textarea */
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                {isStage1
                  ? "ความเห็นหัวหน้ากลุ่ม/ฝ่าย หรือ ข้าราชการในกลุ่ม"
                  : isStage2
                  ? "บันทึกการจัดสรรยานพาหนะและพนักงานขับรถ"
                  : isStage3
                  ? "ความเห็นหัวหน้าฝ่ายบริหารทั่วไป (เสนอ พมจ.)"
                  : "คำสั่งการและข้อสั่งการของ พมจ.กำแพงเพชร"}
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ระบุความเห็นหรือข้อสั่งการ..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-teal-500 transition-colors"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!showRejectForm && (
          <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3 shrink-0">
            {isStage1 && isMyBooking ? (
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-amber-800 bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-200 font-medium">
                  ⚠️ ท่านเป็นผู้ขอใช้รถในรายการนี้ คำขออยู่ในขั้นตอนรอความเห็นชอบจากหัวหน้ากลุ่มงาน/ผู้ได้รับมอบหมาย
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            ) : isStage2 && currentUser.role !== "admin" && !isFleetDispatcherAuthorized ? (
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-blue-800 bg-blue-50 px-3.5 py-2 rounded-xl border border-blue-200 font-medium">
                  ℹ️ คำขออยู่ในขั้นตอนการจัดสรรรถยนต์และคนขับโดยเจ้าหน้าที่ฝ่ายบริหารทั่วไป (หัวหน้าฝ่ายบริหารทั่วไป หรือ คุณปภาวิน)
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            ) : isStage3 && currentUser.role !== "admin" && !isAdminHeadAuthorized ? (
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-teal-800 bg-teal-50 px-3.5 py-2 rounded-xl border border-teal-200 font-medium">
                  ℹ️ คำขออยู่ในขั้นตอนรอหัวหน้าฝ่ายบริหารทั่วไปให้ความเห็นชอบ
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowRejectForm(true)}
                  className="px-4 py-2 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  ✕ ไม่อนุมัติ / ส่งกลับ
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>

                  <button
                    type="button"
                    onClick={handleAction}
                    className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5 ${
                      isStage1
                        ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                        : isStage2
                        ? "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20"
                        : isStage3
                        ? "bg-teal-600 hover:bg-teal-700 shadow-teal-600/20"
                        : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                    }`}
                  >
                    <span>✓</span>
                    <span>
                      {isStage1
                        ? "ให้ความเห็นชอบ (ส่งต่อฝ่ายบริหารจัดรถ)"
                        : isStage2
                        ? "บันทึกการจัดสรร & เสนอหัวหน้าฝ่ายบริหาร"
                        : isStage3
                        ? "เห็นชอบและเสนอ พมจ. ขออนุมัติ"
                        : "👑 อนุมัติการใช้รถราชการ (พร้อมส่ง Line Notify)"}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
