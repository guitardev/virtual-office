"use client";

import React from "react";
import { Vehicle, CarBookingRequest, Member } from "@/lib/types";
import { RealisticFuelGauge } from "./RealisticFuelGauge";

interface VehicleDetailModalProps {
  vehicle: Vehicle;
  bookings: CarBookingRequest[];
  currentUser: Member;
  onClose: () => void;
  onEditVehicle?: (vehicle: Vehicle) => void;
  onToggleStatus?: (vehicleId: string, newStatus: Vehicle["status"]) => void;
}

export function VehicleDetailModal({
  vehicle,
  bookings,
  currentUser,
  onClose,
  onEditVehicle,
  onToggleStatus,
}: VehicleDetailModalProps) {
  const canManage = currentUser.role === "admin" || currentUser.role === "manager";

  // Filter bookings for this vehicle
  const vehicleBookings = bookings
    .filter((b) => b.vehicleId === vehicle.id)
    .sort((a, b) => (b.departureTime > a.departureTime ? 1 : -1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[calc(100vh-2rem)] md:max-h-[90vh] flex flex-col animate-fade-in">
        {/* Hero Vehicle Photo & Header - Fixed */}
        <div className="relative bg-slate-950 text-white overflow-hidden shrink-0">
          {vehicle.image ? (
            <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={vehicle.image}
                alt={vehicle.name}
                className="w-full h-full object-cover opacity-75 hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-black/30" />
            </div>
          ) : (
            <div className="h-28 bg-gradient-to-r from-slate-900 via-teal-950 to-teal-900" />
          )}

          {/* Floating Header Info */}
          <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-3xl border border-white/20 shadow-xl backdrop-blur-md shrink-0">
                {vehicle.category.includes("ตู้")
                  ? "🚐"
                  : vehicle.category.includes("กระบะ")
                  ? "🛻"
                  : "🚗"}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-400/20 text-teal-200 border border-teal-400/30 backdrop-blur-xs">
                    {vehicle.category}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      vehicle.status === "available"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : vehicle.status === "in_use"
                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    }`}
                  >
                    {vehicle.status === "available"
                      ? "🟢 พร้อมใช้งาน"
                      : vehicle.status === "in_use"
                      ? "🔵 กำลังปฏิบัติภารกิจ"
                      : "🔴 ซ่อมบำรุง"}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-md">
                  {vehicle.name}
                </h2>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-300">
                  <span className="font-mono bg-white/15 px-2.5 py-0.5 rounded-md font-bold text-teal-300 border border-white/10">
                    {vehicle.licensePlate}
                  </span>
                  <span>•</span>
                  <span>{vehicle.assignedDivision || "ฝ่ายบริหารทั่วไป"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canManage && onEditVehicle && (
                <button
                  type="button"
                  onClick={() => onEditVehicle(vehicle)}
                  className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border border-white/20 inline-flex items-center gap-1.5 backdrop-blur-xs"
                >
                  <span>✏️</span>
                  <span>แก้ไขข้อมูล / รูปภาพ</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-rose-600/80 text-white font-bold text-xs border border-white/20 shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5 backdrop-blur-xs"
                title="ปิดหน้าต่าง"
              >
                <span className="text-sm font-black">✕</span>
                <span>ปิดหน้าต่าง</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
          {/* Key Metrics / Realistic Gauge Panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Odometer Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                  <span className="font-medium">เลขไมล์สะสมปัจจุบัน</span>
                  <span className="text-base">🛣️</span>
                </div>
                <div className="text-2xl font-black font-mono text-teal-900 mt-2">
                  {(vehicle.mileage || 0).toLocaleString("th-TH")}
                  <span className="text-xs font-normal text-slate-500 ml-1.5 font-body">
                    กิโลเมตร
                  </span>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-200/60 mt-3 text-[11px] text-slate-500">
                ตรวจสภาพล่าสุด: <strong>{vehicle.lastMaintenanceDate || "ตามรอบระยะ"}</strong>
              </div>
            </div>

            {/* Realistic Automotive Fuel Gauge Card */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl text-white flex flex-col items-center justify-between shadow-inner">
              <div className="w-full flex items-center justify-between text-slate-400 text-xs mb-1">
                <span className="font-bold flex items-center gap-1">
                  <span>⛽</span>
                  <span>เกจระดับน้ำมันหน้าปัดรถยนต์</span>
                </span>
                <span className="text-[10px] text-teal-400 font-mono">{vehicle.fuelType}</span>
              </div>

              {/* Realistic Cluster Dial */}
              <div className="my-1">
                <RealisticFuelGauge
                  level={vehicle.fuelLevel || "100%"}
                  size="md"
                  showLabel={true}
                />
              </div>

              <div className="w-full text-center text-[10px] text-slate-400 pt-2 border-t border-slate-800 font-mono">
                สถานะน้ำมันแท้ซิงก์จากการส่งคืนรถ
              </div>
            </div>

            {/* Capacity & Driver Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                  <span className="font-medium">พนักงานขับรถ & ความจุ</span>
                  <span className="text-base">👤</span>
                </div>
                <div className="text-base font-bold text-slate-800 truncate mt-1">
                  {vehicle.driverName || "พนักงานขับรถเวร"}
                </div>
                <div className="mt-2 text-xs text-slate-600 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-200/70 rounded-md font-medium">
                      👥 {vehicle.capacity} ที่นั่ง
                    </span>
                    <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded-md font-medium">
                      ⛽ {vehicle.fuelType}
                    </span>
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-slate-200/60 mt-3 text-[11px] text-emerald-700 font-medium">
                🛡️ วันหมดอายุประกัน: <strong>{vehicle.insuranceExpiry || "31 ธ.ค. 2569"}</strong>
              </div>
            </div>
          </div>

          {/* Features and Specs */}
          <div className="p-4 bg-teal-50/40 border border-teal-100 rounded-2xl">
            <h3 className="text-xs font-bold text-teal-900 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <span>📋</span>
              <span>คุณสมบัติเฉพาะและอุปกรณ์ประจำรถ</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {vehicle.features && vehicle.features.length > 0 ? (
                vehicle.features.map((feat, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-teal-200/60 rounded-xl text-xs font-medium text-teal-900 shadow-2xs"
                  >
                    <span>✓</span>
                    <span>{feat}</span>
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">ไม่มีข้อมูลเพิ่มเติม</span>
              )}
            </div>
          </div>

          {/* Quick Status Control for Admin/Manager */}
          {canManage && onToggleStatus && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800">จัดการสถานะความพร้อม</h4>
                <p className="text-[11px] text-slate-500">
                  สลับสถานะความพร้อมเพื่อควบคุมการเปิดให้จองในระบบ
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleStatus(vehicle.id, "available")}
                  disabled={vehicle.status === "available"}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    vehicle.status === "available"
                      ? "bg-emerald-600 text-white shadow-xs cursor-default"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >
                  🟢 พร้อมใช้งาน
                </button>
                <button
                  type="button"
                  onClick={() => onToggleStatus(vehicle.id, "in_use")}
                  disabled={vehicle.status === "in_use"}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    vehicle.status === "in_use"
                      ? "bg-blue-600 text-white shadow-xs cursor-default"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  🔵 ปฏิบัติภารกิจ
                </button>
                <button
                  type="button"
                  onClick={() => onToggleStatus(vehicle.id, "maintenance")}
                  disabled={vehicle.status === "maintenance"}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    vehicle.status === "maintenance"
                      ? "bg-rose-600 text-white shadow-xs cursor-default"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-700"
                  }`}
                >
                  🔴 ส่งซ่อมบำรุง
                </button>
              </div>
            </div>
          )}

          {/* Booking / Mission History */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span>🗓️</span>
                <span>ประวัติภารกิจและการขอใช้รถคันนี้ ({vehicleBookings.length} รายการ)</span>
              </h3>
            </div>

            {vehicleBookings.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs">
                ยังไม่มีประวัติการขอใช้รถสำหรับคันนี้
              </div>
            ) : (
              <div className="space-y-3">
                {vehicleBookings.map((b) => {
                  const hasReturn = Boolean(b.returnReport);
                  return (
                    <div
                      key={b.id}
                      className="p-4 bg-white border border-slate-200 rounded-2xl hover:border-teal-200 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 bg-teal-50 text-teal-800 rounded-md border border-teal-100">
                            {b.requestNo}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {b.requesterName}
                          </span>
                          <span className="text-[11px] text-slate-400">({b.requesterDivision})</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            b.status === "completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : b.status === "approved"
                              ? "bg-blue-100 text-blue-800"
                              : b.status === "rejected"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {b.status === "completed"
                            ? "✅ ส่งคืนรถแล้ว"
                            : b.status === "approved"
                            ? "อนุมัติแล้ว"
                            : b.status === "rejected"
                            ? "ไม่อนุมัติ"
                            : "รอการพิจารณา"}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 line-clamp-2 mb-2 font-medium">
                        🎯 {b.purpose}
                      </p>
                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-y-1 gap-x-4">
                        <span>📍 {b.destination}</span>
                        <span>
                          🕒 {b.departureTime.replace("T", " ")} ถึง {b.returnTime.replace("T", " ")}
                        </span>
                      </div>

                      {/* Return Report Details if completed */}
                      {hasReturn && b.returnReport && (
                        <div className="mt-3 pt-3 border-t border-slate-100 bg-slate-50/70 p-3 rounded-xl space-y-1.5 text-xs text-slate-700">
                          <div className="flex items-center justify-between font-bold text-teal-900">
                            <span>📋 ผลการตรวจส่งคืนรถ ({b.returnReport.returnedAt}):</span>
                            <span>วิ่งจริง: {b.returnReport.totalDistance.toLocaleString()} กม.</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600">
                            <div>
                              ไมล์ต้น:{" "}
                              <span className="font-mono">
                                {b.returnReport.startMileage.toLocaleString()}
                              </span>
                            </div>
                            <div>
                              ไมล์คืน:{" "}
                              <span className="font-mono">
                                {b.returnReport.endMileage.toLocaleString()}
                              </span>
                            </div>
                            <div>
                              เกจคืน:{" "}
                              <span className="font-semibold text-teal-700">
                                {b.returnReport.endFuelLevel}
                              </span>
                            </div>
                            <div>
                              ตรวจรับ: <span className="font-semibold">{b.returnReport.inspectorName}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
