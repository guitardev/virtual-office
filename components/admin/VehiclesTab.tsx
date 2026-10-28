"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Vehicle, CarBookingRequest, Member, VehicleStatus, FuelLevel } from "@/lib/types";
import { fetchVehicles, saveVehicle, deleteVehicle, fetchCarBookings, recordAuditLog } from "@/lib/supabase";
import { RealisticFuelGauge } from "@/components/carbooking/RealisticFuelGauge";
import { VehicleDetailModal } from "@/components/carbooking/VehicleDetailModal";
import { VehicleFormModal } from "@/components/carbooking/VehicleFormModal";

interface VehiclesTabProps {
  currentUser: Member | null;
  showToast: (msg: string) => void;
  members: Member[];
}

export function VehiclesTab({ currentUser, showToast }: VehiclesTabProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<CarBookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | VehicleStatus>("all");

  // Modals
  const [selectedDetailVehicle, setSelectedDetailVehicle] = useState<Vehicle | null>(null);
  const [selectedManageVehicle, setSelectedManageVehicle] = useState<Vehicle | null>(null);
  const [isCreatingVehicle, setIsCreatingVehicle] = useState(false);

  // ─── ADMIN PERMISSION GUARD ───
  const isAdmin = currentUser?.role === "admin";

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [vList, bList] = await Promise.all([fetchVehicles(), fetchCarBookings()]);
      setVehicles(vList);
      setBookings(bList);
    } catch (err) {
      console.warn("Failed to load vehicle data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Statistics
  const stats = useMemo(() => {
    const total = vehicles.length;
    const available = vehicles.filter((v) => v.status === "available").length;
    const inUse = vehicles.filter((v) => v.status === "in_use").length;
    const maintenance = vehicles.filter((v) => v.status === "maintenance").length;
    const pendingBookings = bookings.filter(
      (b) =>
        b.status === "pending_division_head" ||
        b.status === "pending_fleet_assignment" ||
        b.status === "pending_admin_head" ||
        b.status === "pending_provincial" ||
        b.status === "pending_review" ||
        b.status === "endorsed"
    ).length;
    return { total, available, inUse, maintenance, pendingBookings };
  }, [vehicles, bookings]);

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (statusFilter !== "all" && v.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        v.name.toLowerCase().includes(q) ||
        v.licensePlate.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q) ||
        (v.driverName && v.driverName.toLowerCase().includes(q)) ||
        (v.assignedDivision && v.assignedDivision.toLowerCase().includes(q))
      );
    });
  }, [vehicles, statusFilter, search]);

  // Save vehicle (Add / Edit)
  const handleSaveVehicle = async (savedVehicle: Vehicle) => {
    const exists = vehicles.some((v) => v.id === savedVehicle.id);
    let updated: Vehicle[];
    if (exists) {
      updated = vehicles.map((v) => (v.id === savedVehicle.id ? savedVehicle : v));
      showToast(`💾 บันทึกการแก้ไขข้อมูลรถ ${savedVehicle.licensePlate} เรียบร้อย`);
    } else {
      updated = [savedVehicle, ...vehicles];
      showToast(`➕ เพิ่มรถยนต์ราชการ ${savedVehicle.licensePlate} เข้าสู่ระบบสำเร็จ`);
    }
    setVehicles(updated);
    await saveVehicle(savedVehicle);
    await recordAuditLog(
      currentUser?.name || "ผู้ดูแลระบบ",
      exists ? `แก้ไขข้อมูลยานพาหนะ: ${savedVehicle.licensePlate}` : `เพิ่มยานพาหนะใหม่: ${savedVehicle.licensePlate}`,
      `รุ่น: ${savedVehicle.name} (${savedVehicle.category})`,
      "success"
    );
    setSelectedManageVehicle(null);
    setIsCreatingVehicle(false);
  };

  // Delete vehicle
  const handleDeleteVehicle = async (vehicleId: string) => {
    const target = vehicles.find((v) => v.id === vehicleId);
    if (!target) return;
    if (!confirm(`คุณต้องการลบ/ปลดระวางยานพาหนะ "${target.name} [${target.licensePlate}]" ออกจากระบบหรือไม่?`)) return;

    setVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
    await deleteVehicle(vehicleId);
    await recordAuditLog(
      currentUser?.name || "ผู้ดูแลระบบ",
      `ลบ/ปลดระวางยานพาหนะ: ${target.licensePlate}`,
      `ชื่อรถ: ${target.name}`,
      "success"
    );
    showToast(`🗑️ ลบข้อมูลรถยนต์ ${target.licensePlate} เรียบร้อยแล้ว`);
  };

  // Toggle vehicle status
  const handleToggleVehicleStatus = async (vehicleId: string, newStatus: VehicleStatus) => {
    const updated = vehicles.map((v) => {
      if (v.id !== vehicleId) return v;
      return { ...v, status: newStatus };
    });
    setVehicles(updated);

    const target = updated.find((v) => v.id === vehicleId);
    if (target) {
      await saveVehicle(target);
      await recordAuditLog(
        currentUser?.name || "ผู้ดูแลระบบ",
        `ปรับสถานะยานพาหนะ: ${target.licensePlate} -> ${newStatus}`,
        "Fleet Management",
        "success"
      );
      showToast(`🔄 ปรับสถานะรถ [${target.licensePlate}] เป็น "${newStatus === "available" ? "พร้อมใช้งาน" : newStatus === "maintenance" ? "ซ่อมบำรุง" : "ติดภารกิจ"}"`);
    }
  };

  // ─── PERMISSION CHECK ───
  if (!isAdmin) {
    return (
      <div className="p-12 text-center bg-white border border-rose-200 rounded-3xl shadow-xs space-y-3">
        <span className="text-5xl block animate-bounce">🛡️</span>
        <h2 className="text-lg font-bold text-slate-800">
          จำกัดสิทธิ์เฉพาะผู้ดูแลระบบ (Admin Access Only)
        </h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          หน้า <strong>"ยานพาหนะราชการ &amp; จัดการข้อมูลรถ"</strong> ย้ายมาอยู่ในระบบจัดการ (Admin Control Center)
          สงวนสิทธิ์การเข้าถึง เพิ่ม แก้ไข ปลดระวาง และปรับสถานะยานพาหนะเฉพาะผู้ดูแลระบบจังหวัด (Admin) เท่านั้น
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-slate-900 via-teal-950 to-slate-900 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold backdrop-blur-md border border-teal-500/30">
              <span>🛡️ Admin Fleet Control</span>
              <span>· ระบบบริหารจัดการข้อมูลยานพาหนะราชการ</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black font-heading tracking-tight text-white">
              ยานพาหนะราชการ &amp; จัดการข้อมูลรถ
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl font-light">
              ศูนย์ควบคุมบัญชียานพาหนะราชการส่วนกลาง ตรวจสอบความพร้อม เลขไมล์สะสม เกจน้ำมัน แฟ้มประวัติ บันทึกการส่งซ่อมบำรุง และจัดการข้อมูลรถสำหรับผู้ดูแลระบบ
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setSelectedManageVehicle(null);
                setIsCreatingVehicle(true);
              }}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-900/40 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>➕</span>
              <span>เพิ่มรถยนต์ราชการใหม่</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center text-lg shrink-0 font-bold">
            🚗
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">รถทั้งหมด</div>
            <div className="text-xl font-bold font-heading text-slate-900 mt-0.5">
              {stats.total} <span className="text-xs text-slate-400 font-normal">คัน</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-lg shrink-0 font-bold">
            🟢
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">พร้อมใช้งาน</div>
            <div className="text-xl font-bold font-heading text-emerald-700 mt-0.5">
              {stats.available} <span className="text-xs text-slate-400 font-normal">คัน</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-lg shrink-0 font-bold">
            🔵
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">ติดภารกิจ</div>
            <div className="text-xl font-bold font-heading text-blue-700 mt-0.5">
              {stats.inUse} <span className="text-xs text-slate-400 font-normal">คัน</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center text-lg shrink-0 font-bold">
            🔴
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">ซ่อมบำรุง</div>
            <div className="text-xl font-bold font-heading text-rose-700 mt-0.5">
              {stats.maintenance} <span className="text-xs text-slate-400 font-normal">คัน</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "all", label: "ทั้งหมด" },
            { id: "available", label: "พร้อมใช้งาน" },
            { id: "in_use", label: "ติดภารกิจ" },
            { id: "maintenance", label: "ซ่อมบำรุง" },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === f.id
                  ? "bg-teal-700 text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[280px]">
          <input
            type="text"
            placeholder="ค้นหาชื่อรถ, ทะเบียน, ประเภท, คนขับ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-teal-500 transition-colors"
          />
          <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
        </div>
      </div>

      {/* Vehicles Grid */}
      {loading ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200/80 text-slate-400 text-xs">
          กำลังโหลดข้อมูลยานพาหนะ...
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-3xl border border-slate-200/80 space-y-2">
          <span className="text-4xl block">🚗</span>
          <h3 className="font-bold text-slate-800 text-base">ไม่พบข้อมูลยานพาหนะตามเงื่อนไข</h3>
          <p className="text-xs text-slate-500">กรุณาลองปรับคำค้นหาหรือตัวกรองสถานะ</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVehicles.map((car) => (
            <div
              key={car.id}
              className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between hover:border-teal-300 hover:shadow-md transition-all group"
            >
              <div>
                {/* Vehicle Photo Banner */}
                <div className="relative h-44 w-full bg-linear-to-br from-slate-900 via-slate-800 to-teal-950 overflow-hidden">
                  {car.image ? (
                    <img
                      src={car.image}
                      alt={car.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <span className="text-5xl mb-2">
                        {car.category.includes("ตู้")
                          ? "🚐"
                          : car.category.includes("กระบะ")
                          ? "🛻"
                          : car.category.includes("จักรยานยนต์")
                          ? "🏍️"
                          : "🚗"}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">ไม่มีรูปภาพประกอบ</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-slate-950/80 via-transparent to-black/30 pointer-events-none" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white border border-white/20">
                      {car.category}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold shadow-xs backdrop-blur-md ${
                        car.status === "available"
                          ? "bg-emerald-500/90 text-white"
                          : car.status === "in_use"
                          ? "bg-blue-500/90 text-white"
                          : "bg-rose-500/90 text-white"
                      }`}
                    >
                      {car.status === "available"
                        ? "🟢 พร้อมใช้งาน"
                        : car.status === "in_use"
                        ? "🔵 ติดภารกิจ"
                        : "🔴 ซ่อมบำรุง"}
                    </span>
                  </div>

                  {/* License Plate on image bottom */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <span className="px-3 py-1 bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 shadow-xs">
                      {car.licensePlate}
                    </span>
                    <span className="text-[11px] font-medium text-slate-200 bg-black/60 backdrop-blur-xs px-2.5 py-0.5 rounded-lg border border-white/10">
                      👥 {car.capacity} ที่นั่ง
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="font-bold font-heading text-lg text-slate-900 group-hover:text-teal-700 transition-colors">
                      {car.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      เชื้อเพลิง: {car.fuelType} • ฝ่ายดูแล: {car.assignedDivision || "ฝ่ายบริหารทั่วไป"}
                    </p>
                  </div>

                  {/* Realistic Fuel Gauge & Odometer Cluster */}
                  <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner flex items-center justify-between gap-3">
                    <div className="flex-1 pl-1">
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5 flex items-center gap-1">
                        <span>🛣️ ODOMETER</span>
                      </div>
                      <div className="font-mono font-black text-amber-400 text-lg tracking-wider">
                        {(car.mileage || 0).toLocaleString("th-TH")}{" "}
                        <span className="text-[10px] text-slate-400 font-normal">KM</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 truncate">
                        👤 {car.driverName || "พนักงานขับรถเวร"}
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-center">
                      <RealisticFuelGauge level={car.fuelLevel} size="sm" showLabel={true} />
                    </div>
                  </div>

                  {/* Specs & Features */}
                  <div className="text-xs text-slate-600 space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">พนักงานขับรถประจำ:</span>
                      <strong className="text-slate-800 font-semibold">{car.driverName || "-"}</strong>
                    </div>
                    {car.insuranceExpiry && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">พ.ร.บ. / ประกันภัย:</span>
                        <span className="font-mono text-slate-700">{car.insuranceExpiry}</span>
                      </div>
                    )}

                    {car.features && car.features.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1.5">
                        {car.features.map((f, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200/60 font-medium"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="p-5 pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDetailVehicle(car)}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>🔍</span>
                    <span>ดูรายละเอียด</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedManageVehicle(car);
                      setIsCreatingVehicle(false);
                    }}
                    className="py-2 px-3 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>✏️</span>
                    <span>แก้ไขข้อมูล</span>
                  </button>
                </div>

                {/* Status Toggle & Delete */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 text-[11px]">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 text-[10px]">สถานะ:</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleVehicleStatus(
                          car.id,
                          car.status === "available" ? "maintenance" : "available"
                        )
                      }
                      className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${
                        car.status === "available"
                          ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                      }`}
                    >
                      {car.status === "available" ? "ส่งซ่อมบำรุง" : "ปรับเป็นพร้อมใช้"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteVehicle(car.id)}
                    className="text-rose-600 hover:text-rose-800 font-medium transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>🗑️</span>
                    <span>ปลดระวาง</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── MODAL: Vehicle Detail View ─── */}
      {selectedDetailVehicle && (
        <VehicleDetailModal
          vehicle={selectedDetailVehicle}
          bookings={bookings}
          currentUser={currentUser}
          onClose={() => setSelectedDetailVehicle(null)}
          onEditVehicle={(veh) => {
            setSelectedDetailVehicle(null);
            setSelectedManageVehicle(veh);
          }}
          onToggleStatus={handleToggleVehicleStatus}
        />
      )}

      {/* ─── MODAL: Vehicle Add / Edit Form ─── */}
      {(selectedManageVehicle || isCreatingVehicle) && (
        <VehicleFormModal
          vehicle={selectedManageVehicle}
          onClose={() => {
            setSelectedManageVehicle(null);
            setIsCreatingVehicle(false);
          }}
          onSave={handleSaveVehicle}
        />
      )}
    </div>
  );
}
