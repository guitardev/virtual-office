"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Vehicle,
  CarBookingRequest,
  Member,
  VehicleStatus,
  BookingStatus,
  VehicleReturnReport,
  FuelLevel,
} from "@/lib/types";
import {
  fetchVehicles,
  saveVehicle,
  deleteVehicle,
  subscribeToVehicles,
  fetchCarBookings,
  saveCarBooking,
  deleteCarBooking,
  subscribeToCarBookings,
  recordAuditLog,
} from "@/lib/supabase";
import { RealisticFuelGauge } from "@/components/carbooking/RealisticFuelGauge";
import { VehicleDetailModal } from "@/components/carbooking/VehicleDetailModal";
import { VehicleFormModal } from "@/components/carbooking/VehicleFormModal";
import { CarBookingDocumentModal } from "@/components/carbooking/CarBookingDocumentModal";
import { ReviewBookingModal } from "@/components/carbooking/ReviewBookingModal";
import { ReturnVehicleModal } from "@/components/carbooking/ReturnVehicleModal";
import { AdminBookingFormModal } from "./AdminBookingFormModal";

interface VehiclesTabProps {
  currentUser: Member | null;
  showToast: (msg: string) => void;
  members: Member[];
}

export function VehiclesTab({ currentUser, showToast, members }: VehiclesTabProps) {
  // Sub-section tab
  const [activeSection, setActiveSection] = useState<"fleet" | "bookings">("fleet");

  // Core Data
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<CarBookingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Fleet Filter & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | VehicleStatus>("all");

  // Booking Filter & Search
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>("all");
  const [bookingVehicleFilter, setBookingVehicleFilter] = useState<string>("all");

  // Vehicle Modals
  const [selectedDetailVehicle, setSelectedDetailVehicle] = useState<Vehicle | null>(null);
  const [selectedManageVehicle, setSelectedManageVehicle] = useState<Vehicle | null>(null);
  const [isCreatingVehicle, setIsCreatingVehicle] = useState(false);

  // Booking Modals (Admin CRUD)
  const [selectedDocBooking, setSelectedDocBooking] = useState<CarBookingRequest | null>(null);
  const [selectedReviewBooking, setSelectedReviewBooking] = useState<CarBookingRequest | null>(null);
  const [selectedReturnBooking, setSelectedReturnBooking] = useState<CarBookingRequest | null>(null);
  const [selectedManageBooking, setSelectedManageBooking] = useState<CarBookingRequest | null>(null);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);

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

    const unsubBookings = subscribeToCarBookings((liveBookings) => {
      if (Array.isArray(liveBookings)) {
        setBookings(liveBookings);
      }
    });

    const unsubVehicles = subscribeToVehicles((liveVehicles) => {
      if (Array.isArray(liveVehicles)) {
        setVehicles(liveVehicles);
      }
    });

    return () => {
      unsubBookings();
      unsubVehicles();
    };
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

    const approvedBookings = bookings.filter((b) => b.status === "approved").length;
    const completedBookings = bookings.filter((b) => b.status === "completed").length;

    return {
      total,
      available,
      inUse,
      maintenance,
      pendingBookings,
      approvedBookings,
      completedBookings,
      totalBookings: bookings.length,
    };
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

  // Filtered bookings (CRUD Read)
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (bookingStatusFilter !== "all") {
        if (bookingStatusFilter === "pending") {
          const isPending =
            b.status === "pending_division_head" ||
            b.status === "pending_fleet_assignment" ||
            b.status === "pending_admin_head" ||
            b.status === "pending_provincial" ||
            b.status === "pending_review" ||
            b.status === "endorsed";
          if (!isPending) return false;
        } else if (b.status !== bookingStatusFilter) {
          return false;
        }
      }
      if (bookingVehicleFilter !== "all" && b.vehicleId !== bookingVehicleFilter) {
        return false;
      }
      if (!bookingSearch.trim()) return true;
      const q = bookingSearch.toLowerCase();
      return (
        (b.requestNo && b.requestNo.toLowerCase().includes(q)) ||
        (b.requesterName && b.requesterName.toLowerCase().includes(q)) ||
        (b.destination && b.destination.toLowerCase().includes(q)) ||
        (b.licensePlate && b.licensePlate.toLowerCase().includes(q)) ||
        (b.assignedDriver && b.assignedDriver.toLowerCase().includes(q)) ||
        (b.purpose && b.purpose.toLowerCase().includes(q))
      );
    });
  }, [bookings, bookingStatusFilter, bookingVehicleFilter, bookingSearch]);

  // ─── VEHICLE CRUD HANDLERS ───
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

  const handleDeleteVehicle = async (vehicleId: string) => {
    const target = vehicles.find((v) => v.id === vehicleId);
    if (!target) return;
    if (!confirm(`คุณต้องการลบ/ปลดระวางยานพาหนะ "${target.name} [${target.licensePlate}]" ออกจากระบบหรือไม่?`)) return;

    const updated = vehicles.filter((v) => v.id !== vehicleId);
    setVehicles(updated);
    await deleteVehicle(vehicleId);
    await recordAuditLog(
      currentUser?.name || "ผู้ดูแลระบบ",
      `ลบ/ปลดระวางยานพาหนะ: ${target.licensePlate}`,
      `ชื่อรถ: ${target.name}`,
      "success"
    );
    showToast(`🗑️ ลบข้อมูลรถยนต์ ${target.licensePlate} เรียบร้อยแล้ว`);
  };

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
      showToast(
        `🔄 ปรับสถานะรถ [${target.licensePlate}] เป็น "${
          newStatus === "available" ? "พร้อมใช้งาน" : newStatus === "maintenance" ? "ซ่อมบำรุง" : "ติดภารกิจ"
        }"`
      );
    }
  };

  // ─── BOOKING CRUD HANDLERS (Admin Car Usage Management) ───
  const handleSaveBooking = async (savedBooking: CarBookingRequest) => {
    const exists = bookings.some((b) => b.id === savedBooking.id);
    let updated: CarBookingRequest[];
    if (exists) {
      updated = bookings.map((b) => (b.id === savedBooking.id ? savedBooking : b));
      showToast(`💾 บันทึกการแก้ไขรายการใช้รถ [${savedBooking.requestNo}] เรียบร้อย`);
    } else {
      updated = [savedBooking, ...bookings];
      showToast(`➕ บันทึกรายการใช้รถ [${savedBooking.requestNo}] เข้าสู่ระบบสำเร็จ`);
    }
    setBookings(updated);
    await saveCarBooking(savedBooking);
    await recordAuditLog(
      currentUser?.name || "ผู้ดูแลระบบ",
      exists ? `แก้ไขรายการใช้รถราชการ: ${savedBooking.requestNo}` : `สร้างรายการใช้รถราชการใหม่: ${savedBooking.requestNo}`,
      `ทะเบียน: ${savedBooking.licensePlate} (${savedBooking.destination})`,
      "success"
    );
    setSelectedManageBooking(null);
    setIsCreatingBooking(false);
  };

  const handleDeleteBooking = async (bookingId: string) => {
    const target = bookings.find((b) => b.id === bookingId);
    if (!target) return;
    if (!confirm(`คุณต้องการลบรายการใช้รถ "${target.requestNo} [${target.destination}]" ออกจากระบบหรือไม่?`)) return;

    const updated = bookings.filter((b) => b.id !== bookingId);
    setBookings(updated);
    await deleteCarBooking(bookingId);
    await recordAuditLog(
      currentUser?.name || "ผู้ดูแลระบบ",
      `ลบรายการใช้รถราชการ: ${target.requestNo}`,
      `ทะเบียน: ${target.licensePlate} | ผู้ขอ: ${target.requesterName}`,
      "success"
    );
    showToast(`🗑️ ลบรายการใช้รถ ${target.requestNo} เรียบร้อยแล้ว`);
  };

  // Workflow Handlers for ReviewBookingModal
  const handleDivisionEndorse = async (bookingId: string, notes: string) => {
    const b = bookings.find((x) => x.id === bookingId);
    if (!b) return;
    const updated: CarBookingRequest = {
      ...b,
      status: "pending_fleet_assignment",
      divisionReviewerId: currentUser?.id,
      divisionReviewerName: currentUser?.name,
      divisionReviewerPosition: currentUser?.position,
      divisionReviewerNotes: notes,
      divisionReviewerActionAt: new Date().toISOString(),
    };
    await handleSaveBooking(updated);
    setSelectedReviewBooking(null);
  };

  const handleFleetAssign = async (bookingId: string, vId: string, assignedDriver: string, notes: string) => {
    const b = bookings.find((x) => x.id === bookingId);
    if (!b) return;
    const veh = vehicles.find((v) => v.id === vId);
    const updated: CarBookingRequest = {
      ...b,
      vehicleId: veh?.id || vId,
      vehicleName: veh?.name || b.vehicleName,
      licensePlate: veh?.licensePlate || b.licensePlate,
      assignedDriver: assignedDriver || b.assignedDriver,
      fleetDispatcherId: currentUser?.id,
      fleetDispatcherName: currentUser?.name,
      fleetDispatcherPosition: currentUser?.position,
      fleetDispatcherNotes: notes,
      fleetDispatcherActionAt: new Date().toISOString(),
      status: "pending_admin_head",
    };
    await handleSaveBooking(updated);
    setSelectedReviewBooking(null);
  };

  const handleAdminHeadEndorse = async (bookingId: string, notes: string) => {
    const b = bookings.find((x) => x.id === bookingId);
    if (!b) return;
    const updated: CarBookingRequest = {
      ...b,
      status: "pending_provincial",
      adminHeadId: currentUser?.id,
      adminHeadName: currentUser?.name,
      adminHeadNotes: notes,
      adminHeadActionAt: new Date().toISOString(),
    };
    await handleSaveBooking(updated);
    setSelectedReviewBooking(null);
  };

  const handleProvincialApprove = async (bookingId: string, notes: string) => {
    const b = bookings.find((x) => x.id === bookingId);
    if (!b) return;
    const updated: CarBookingRequest = {
      ...b,
      status: "approved",
      approverId: currentUser?.id,
      approverName: currentUser?.name,
      approverNotes: notes,
      approverActionAt: new Date().toISOString(),
    };
    await handleSaveBooking(updated);
    setSelectedReviewBooking(null);
  };

  const handleRejectBooking = async (bookingId: string, reason: string) => {
    const b = bookings.find((x) => x.id === bookingId);
    if (!b) return;
    const updated: CarBookingRequest = {
      ...b,
      status: "rejected",
      rejectReason: reason,
      rejectedBy: currentUser?.name,
      rejectedAtStage: b.status,
    };
    await handleSaveBooking(updated);
    setSelectedReviewBooking(null);
  };

  // Return vehicle report submission
  const handleSubmitReturn = async (bookingId: string, vId: string, report: VehicleReturnReport) => {
    const b = bookings.find((x) => x.id === bookingId);
    if (!b) return;
    const updatedBooking: CarBookingRequest = {
      ...b,
      status: "completed",
      keyReturned: true,
      returnReport: report,
      hasIssueReported: report.hasIssue,
      needsMaintenance: report.needsMaintenance,
    };
    await handleSaveBooking(updatedBooking);

    // Update vehicle mileage, fuel level and maintenance status
    const veh = vehicles.find((v) => v.id === vId);
    if (veh) {
      const updatedVeh: Vehicle = {
        ...veh,
        mileage: report.endMileage || veh.mileage,
        fuelLevel: (report.endFuelLevel as FuelLevel) || veh.fuelLevel,
        status: report.needsMaintenance ? "maintenance" : "available",
      };
      await handleSaveVehicle(updatedVeh);
    }
    setSelectedReturnBooking(null);
  };

  // Helper status badge
  const renderStatusBadge = (bStatus: BookingStatus) => {
    switch (bStatus) {
      case "approved":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            🟢 อนุมัติแล้ว
          </span>
        );
      case "completed":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            🏁 คืนรถเรียบร้อย
          </span>
        );
      case "rejected":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            🔴 ไม่อนุมัติ
          </span>
        );
      case "pending_fleet_assignment":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 animate-pulse">
            🟣 รอจัดสรรรถ/คนขับ
          </span>
        );
      case "pending_admin_head":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse">
            🔵 รอ หน.บริหารฯ เห็นชอบ
          </span>
        );
      case "pending_provincial":
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            🟡 รอ พมจ. อนุมัติ
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
            🟡 รอพิจารณา
          </span>
        );
    }
  };

  // ─── PERMISSION CHECK ───
  if (!isAdmin) {
    return (
      <div className="p-12 text-center bg-white border border-rose-200 rounded-3xl shadow-xs space-y-3">
        <span className="text-5xl block animate-bounce">🛡️</span>
        <h2 className="text-lg font-bold text-slate-800">จำกัดสิทธิ์เฉพาะผู้ดูแลระบบ (Admin Access Only)</h2>
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
              <span>· ระบบบริหารจัดการยานพาหนะและรายการใช้รถราชการ</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black font-heading tracking-tight text-white">
              ยานพาหนะราชการ &amp; จัดการข้อมูลรถ
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl font-light">
              ศูนย์ควบคุมบัญชียานพาหนะราชการส่วนกลาง ตรวจสอบความพร้อม บันทึกส่งซ่อม และจัดการประวัติรายการใช้รถราชการแบบครบวงจร (CRUD)
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {activeSection === "fleet" ? (
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
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSelectedManageBooking(null);
                  setIsCreatingBooking(true);
                }}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-900/40 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>➕</span>
                <span>เพิ่มบันทึกการใช้รถราชการ</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex border-b border-slate-200 gap-2 bg-slate-50/70 p-1.5 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveSection("fleet")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSection === "fleet"
              ? "bg-white text-teal-800 shadow-xs border border-slate-200/80"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>🚗 บัญชียานพาหนะ &amp; สถานะรถ</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 font-semibold">
            {stats.total} คัน
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("bookings")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSection === "bookings"
              ? "bg-white text-teal-800 shadow-xs border border-slate-200/80"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>📋 รายการ &amp; ประวัติการใช้รถราชการ (CRUD)</span>
          {stats.pendingBookings > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500 text-white font-bold animate-pulse">
              รอพิจารณา {stats.pendingBookings}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 font-semibold">
              {stats.totalBookings} รายการ
            </span>
          )}
        </button>
      </div>

      {/* ============================================================== */}
      {/* SECTION 1: FLEET INVENTORY (บัญชียานพาหนะ)                      */}
      {/* ============================================================== */}
      {activeSection === "fleet" && (
        <div className="space-y-6">
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
                    statusFilter === f.id ? "bg-teal-700 text-white shadow-xs" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
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
                        <span>ดูแฟ้มประวัติ</span>
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
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 2: USAGE RECORDS & CRUD (รายการ & ประวัติการใช้รถ)       */}
      {/* ============================================================== */}
      {activeSection === "bookings" && (
        <div className="space-y-6">
          {/* Metric KPI Cards for Bookings */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center text-lg shrink-0 font-bold">
                📋
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">รายการทั้งหมด</div>
                <div className="text-xl font-bold font-heading text-slate-900 mt-0.5">
                  {stats.totalBookings} <span className="text-xs text-slate-400 font-normal">รายการ</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-lg shrink-0 font-bold">
                🟡
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">รอการพิจารณา</div>
                <div className="text-xl font-bold font-heading text-amber-600 mt-0.5">
                  {stats.pendingBookings} <span className="text-xs text-slate-400 font-normal">รายการ</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-lg shrink-0 font-bold">
                🟢
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">อนุมัติแล้ว / พร้อมใช้</div>
                <div className="text-xl font-bold font-heading text-emerald-700 mt-0.5">
                  {stats.approvedBookings} <span className="text-xs text-slate-400 font-normal">รายการ</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-lg shrink-0 font-bold">
                🏁
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">คืนรถเรียบร้อย</div>
                <div className="text-xl font-bold font-heading text-slate-700 mt-0.5">
                  {stats.completedBookings} <span className="text-xs text-slate-400 font-normal">รายการ</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filter & Search Bar for Bookings */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: "all", label: "ทั้งหมด" },
                  { id: "pending", label: "รอการพิจารณา", count: stats.pendingBookings },
                  { id: "approved", label: "อนุมัติแล้ว", count: stats.approvedBookings },
                  { id: "completed", label: "คืนรถแล้ว", count: stats.completedBookings },
                  { id: "rejected", label: "ไม่อนุมัติ" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setBookingStatusFilter(f.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      bookingStatusFilter === f.id
                        ? "bg-teal-700 text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    <span>{f.label}</span>
                    {f.count !== undefined && f.count > 0 && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                          bookingStatusFilter === f.id ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {f.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={bookingVehicleFilter}
                  onChange={(e) => setBookingVehicleFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:border-teal-500"
                >
                  <option value="all">รถยนต์ทั้งหมด</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.licensePlate} ({v.name})
                    </option>
                  ))}
                </select>

                <div className="relative min-w-[220px]">
                  <input
                    type="text"
                    placeholder="ค้นหาเลขที่, ผู้ขอ, ทะเบียน, ปลายทาง..."
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-teal-500"
                  />
                  <span className="absolute left-2.5 top-2.5 text-xs text-slate-400">🔍</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bookings List / Table */}
          {loading ? (
            <div className="p-16 text-center bg-white rounded-3xl border border-slate-200/80 text-slate-400 text-xs">
              กำลังโหลดรายการใช้รถ...
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="p-16 text-center bg-white rounded-3xl border border-slate-200/80 space-y-3">
              <span className="text-4xl block">📋</span>
              <h3 className="font-bold text-slate-800 text-base">ไม่พบรายการใช้รถตามเงื่อนไข</h3>
              <p className="text-xs text-slate-500">ยังไม่มีบันทึกการขอใช้รถหรือไม่มีรายการที่ตรงกับคำค้นหา</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedManageBooking(null);
                  setIsCreatingBooking(true);
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>➕</span>
                <span>สร้างบันทึกการใช้รถใหม่</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200 uppercase font-semibold text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4">เลขที่ / วันเวลา</th>
                      <th className="py-3.5 px-4">ผู้ขอใช้ &amp; ฝ่าย</th>
                      <th className="py-3.5 px-4">รถยนต์ &amp; คนขับ</th>
                      <th className="py-3.5 px-4">ภารกิจ &amp; ปลายทาง</th>
                      <th className="py-3.5 px-4 text-center">สถานะ</th>
                      <th className="py-3.5 px-4 text-right">การจัดการ (CRUD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-teal-50/30 transition-colors">
                        {/* Request No & Time */}
                        <td className="py-3 px-4 font-mono">
                          <div className="font-bold text-slate-900">{b.requestNo || b.id}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            📅 {b.departureTime?.slice(0, 16) || "-"}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            ถึง {b.returnTime?.slice(0, 16) || "-"}
                          </div>
                        </td>

                        {/* Requester */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">{b.requesterName}</div>
                          <div className="text-[11px] text-slate-500">{b.requesterPosition || "-"}</div>
                          <div className="text-[10px] text-slate-400">{b.requesterDivision || "-"}</div>
                        </td>

                        {/* Vehicle & Driver */}
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[11px]">
                              {b.licensePlate || "-"}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5 truncate max-w-[180px]">
                            {b.vehicleName}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            👤 {b.assignedDriver || (b.requireDriver ? "รอจัดสรรคนขับ" : "ขับเอง")}
                          </div>
                        </td>

                        {/* Purpose & Destination */}
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-medium text-slate-800 line-clamp-1">{b.purpose}</div>
                          <div className="text-[11px] text-teal-700 font-medium mt-0.5 flex items-center gap-1">
                            <span>📍</span>
                            <span className="truncate">{b.destination}</span>
                          </div>
                          {b.fuelBudgetRequested && (
                            <div className="text-[10px] text-amber-600 mt-0.5">
                              ⛽ งบน้ำมัน {(b.fuelBudgetAmount || 0).toLocaleString()} บาท
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {renderStatusBadge(b.status)}
                        </td>

                        {/* Actions (CRUD) */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Document View / Download DOCX */}
                            <button
                              type="button"
                              onClick={() => setSelectedDocBooking(b)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="ดูและดาวน์โหลดเอกสารขอใช้รถ (.docx)"
                            >
                              📥
                            </button>

                            {/* Review / Approval Modal */}
                            <button
                              type="button"
                              onClick={() => setSelectedReviewBooking(b)}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="ดูรายละเอียด / พิจารณาอนุมัติ / จัดสรรรถ"
                            >
                              👁️
                            </button>

                            {/* Return Car Modal (If approved) */}
                            {b.status === "approved" && (
                              <button
                                type="button"
                                onClick={() => setSelectedReturnBooking(b)}
                                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer font-bold text-xs"
                                title="บันทึกการส่งคืนรถยนต์"
                              >
                                🔄 คืนรถ
                              </button>
                            )}

                            {/* Edit Booking */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedManageBooking(b);
                                setIsCreatingBooking(false);
                              }}
                              className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors cursor-pointer"
                              title="แก้ไขข้อมูลรายการใช้รถ (Admin Edit)"
                            >
                              ✏️
                            </button>

                            {/* Delete Booking */}
                            <button
                              type="button"
                              onClick={() => handleDeleteBooking(b.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="ลบรายการใช้รถนี้"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
          members={members}
          onClose={() => {
            setSelectedManageVehicle(null);
            setIsCreatingVehicle(false);
          }}
          onSave={handleSaveVehicle}
        />
      )}

      {/* ─── MODAL: Car Booking Document (.docx / print) ─── */}
      {selectedDocBooking && (
        <CarBookingDocumentModal
          booking={selectedDocBooking}
          onClose={() => setSelectedDocBooking(null)}
        />
      )}

      {/* ─── MODAL: Review & Approve Booking ─── */}
      {selectedReviewBooking && (
        <ReviewBookingModal
          booking={selectedReviewBooking}
          currentUser={currentUser || members[0]}
          vehicles={vehicles}
          allBookings={bookings}
          members={members}
          onDivisionEndorse={handleDivisionEndorse}
          onFleetAssign={handleFleetAssign}
          onAdminHeadEndorse={handleAdminHeadEndorse}
          onProvincialApprove={handleProvincialApprove}
          onReject={handleRejectBooking}
          onClose={() => setSelectedReviewBooking(null)}
        />
      )}

      {/* ─── MODAL: Return Vehicle Report ─── */}
      {selectedReturnBooking && (
        <ReturnVehicleModal
          booking={selectedReturnBooking}
          vehicle={
            vehicles.find((v) => v.id === selectedReturnBooking.vehicleId) ||
            vehicles[0] || {
              id: selectedReturnBooking.vehicleId,
              name: selectedReturnBooking.vehicleName,
              licensePlate: selectedReturnBooking.licensePlate,
              category: "รถยนต์ส่วนกลาง",
              capacity: 5,
              fuelType: "ดีเซล B7",
              status: "available",
              mileage: 100000,
              fuelLevel: "เต็มถัง (100%)",
            }
          }
          currentUser={currentUser || members[0]}
          inspectors={members}
          onClose={() => setSelectedReturnBooking(null)}
          onSubmitReturn={handleSubmitReturn}
        />
      )}

      {/* ─── MODAL: Admin Booking Add / Edit Form (CRUD) ─── */}
      {(selectedManageBooking || isCreatingBooking) && (
        <AdminBookingFormModal
          booking={selectedManageBooking}
          vehicles={vehicles}
          members={members}
          currentUser={currentUser}
          onClose={() => {
            setSelectedManageBooking(null);
            setIsCreatingBooking(false);
          }}
          onSave={handleSaveBooking}
        />
      )}
    </div>
  );
}
