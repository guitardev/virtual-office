"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Vehicle, CarBookingRequest, Member, VehicleStatus, FuelLevel } from "@/lib/types";
import { fetchVehicles, saveVehicle, deleteVehicle, fetchCarBookings, saveCarBooking, recordAuditLog } from "@/lib/supabase";

interface VehiclesTabProps {
  currentUser: Member | null;
  showToast: (msg: string) => void;
  members: Member[];
}

const VEHICLE_CATEGORIES = [
  "รถตู้ส่วนกลาง",
  "รถกระบะตรวจการณ์",
  "รถยนต์นั่งส่วนบุคคล",
  "รถกระบะบรรทุก",
  "รถตู้ VIP ผู้บริหาร",
  "รถจักรยานยนต์",
] as const;

const FUEL_LEVELS: FuelLevel[] = [
  "เต็มถัง (100%)",
  "3/4 ถัง (75%)",
  "1/2 ถัง (50%)",
  "1/4 ถัง (25%)",
  "ใกล้หมด (ต่ำกว่า 15%)",
];

export function VehiclesTab({ currentUser, showToast, members }: VehiclesTabProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<CarBookingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | VehicleStatus>("all");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    licensePlate: "",
    category: "รถตู้ส่วนกลาง" as Vehicle["category"],
    capacity: 12,
    driverName: "",
    fuelType: "ดีเซล B7",
    status: "available" as VehicleStatus,
    mileage: 0,
    fuelLevel: "เต็มถัง (100%)" as FuelLevel,
    insuranceExpiry: "",
    assignedDivision: "ฝ่ายบริหารทั่วไป",
  });

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const [vList, bList] = await Promise.all([fetchVehicles(), fetchCarBookings()]);
      setVehicles(vList);
      setBookings(bList);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Drivers from members
  const driverOptions = useMemo(() => {
    return members
      .filter((m) => m.position.includes("ขับรถ") || m.name.includes("สมหมาย") || m.role === "member")
      .map((m) => m.name);
  }, [members]);

  const stats = useMemo(() => {
    const total = vehicles.length;
    const available = vehicles.filter((v) => v.status === "available").length;
    const inUse = vehicles.filter((v) => v.status === "in_use").length;
    const maintenance = vehicles.filter((v) => v.status === "maintenance").length;
    const pendingBookings = bookings.filter((b) => b.status === "pending_review" || b.status === "endorsed").length;
    return { total, available, inUse, maintenance, pendingBookings };
  }, [vehicles, bookings]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (statusFilter !== "all" && v.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        v.name.toLowerCase().includes(q) ||
        v.licensePlate.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q) ||
        (v.driverName && v.driverName.toLowerCase().includes(q))
      );
    });
  }, [vehicles, statusFilter, search]);

  const handleOpenAdd = () => {
    setEditingVehicle(null);
    setFormData({
      name: "",
      licensePlate: "",
      category: "รถตู้ส่วนกลาง",
      capacity: 12,
      driverName: driverOptions[0] || "",
      fuelType: "ดีเซล B7",
      status: "available",
      mileage: 50000,
      fuelLevel: "เต็มถัง (100%)",
      insuranceExpiry: "2570-03-31",
      assignedDivision: "ฝ่ายบริหารทั่วไป",
    });
    setShowModal(true);
  };

  const handleOpenEdit = (v: Vehicle) => {
    setEditingVehicle(v);
    setFormData({
      name: v.name,
      licensePlate: v.licensePlate,
      category: v.category,
      capacity: v.capacity,
      driverName: v.driverName || "",
      fuelType: v.fuelType,
      status: v.status,
      mileage: v.mileage,
      fuelLevel: v.fuelLevel,
      insuranceExpiry: v.insuranceExpiry || "",
      assignedDivision: v.assignedDivision || "ฝ่ายบริหารทั่วไป",
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.licensePlate.trim()) return;

    const vehicleObj: Vehicle = {
      id: editingVehicle ? editingVehicle.id : `veh_${Date.now()}`,
      name: formData.name.trim(),
      licensePlate: formData.licensePlate.trim(),
      category: formData.category,
      capacity: Number(formData.capacity) || 4,
      driverName: formData.driverName.trim() || undefined,
      fuelType: formData.fuelType.trim(),
      status: formData.status,
      features: editingVehicle?.features || ["ระบบ GPS ติดตาม", "แอร์", "กล้องหน้ารถ"],
      mileage: Number(formData.mileage) || 0,
      fuelLevel: formData.fuelLevel,
      insuranceExpiry: formData.insuranceExpiry || undefined,
      assignedDivision: formData.assignedDivision,
    };

    setVehicles((prev) => {
      const exists = prev.some((v) => v.id === vehicleObj.id);
      return exists ? prev.map((v) => (v.id === vehicleObj.id ? vehicleObj : v)) : [...prev, vehicleObj];
    });

    await saveVehicle(vehicleObj);
    await recordAuditLog(
      currentUser?.name || "Admin",
      editingVehicle ? `แก้ไขข้อมูลยานพาหนะ: ${vehicleObj.name} (${vehicleObj.licensePlate})` : `เพิ่มยานพาหนะใหม่เข้าฟลีท: ${vehicleObj.name}`,
      "Fleet Management",
      "success"
    );

    showToast(editingVehicle ? "✏️ บันทึกการแก้ไขข้อมูลรถยนต์เรียบร้อย" : "🎉 เพิ่มรถยนต์ราชการใหม่เข้าฟลีทสำเร็จ");
    setShowModal(false);
  };

  const handleDelete = async (v: Vehicle) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ/ปลดระวาง "${v.name} (${v.licensePlate})" ออกจากระบบ?`)) return;

    setVehicles((prev) => prev.filter((item) => item.id !== v.id));
    await deleteVehicle(v.id);
    await recordAuditLog(
      currentUser?.name || "Admin",
      `ลบ/ปลดระวางยานพาหนะ: ${v.name} (${v.licensePlate})`,
      "Fleet Management",
      "success"
    );
    showToast(`🗑️ ลบรถยนต์ ${v.licensePlate} เรียบร้อยแล้ว`);
  };

  const handleApproveBooking = async (b: CarBookingRequest) => {
    const updated: CarBookingRequest = {
      ...b,
      status: "approved",
      approverId: currentUser?.id || "admin",
      approverName: currentUser?.name || "ผู้ว่าราชการจังหวัด/พมจ.",
      approverActionAt: new Date().toLocaleDateString("th-TH"),
      approverNotes: "อนุมัติการขอใช้รถยนต์ราชการตามระเบียบ",
    };
    setBookings((prev) => prev.map((item) => (item.id === b.id ? updated : item)));
    await saveCarBooking(updated);
    await recordAuditLog(
      currentUser?.name || "Admin",
      `อนุมัติคำขอใช้รถยนต์ราชการ ${b.requestNo} (${b.destination}) โดย ${b.requesterName}`,
      "Car Booking Approval",
      "success"
    );
    showToast(`✅ อนุมัติคำขอใช้รถ ${b.requestNo} เรียบร้อยแล้ว`);
  };

  const handleRejectBooking = async (b: CarBookingRequest) => {
    const reason = window.prompt("กรุณาระบุเหตุผลที่ไม่อนุมัติคำขอใช้รถ:", "รถยนต์ติดภารกิจเร่งด่วนอื่น");
    if (reason === null) return;

    const updated: CarBookingRequest = {
      ...b,
      status: "rejected",
      rejectReason: reason || "ไม่อนุมัติเนื่องจากภารกิจซ้อนทับ",
      rejectedBy: currentUser?.name || "Admin",
    };
    setBookings((prev) => prev.map((item) => (item.id === b.id ? updated : item)));
    await saveCarBooking(updated);
    await recordAuditLog(
      currentUser?.name || "Admin",
      `ปฏิเสธคำขอใช้รถยนต์ราชการ ${b.requestNo} (เหตุผล: ${reason || "ไม่ระบุ"})`,
      "Car Booking Rejection",
      "denied"
    );
    showToast(`⛔ บันทึกการปฏิเสธคำขอใช้รถ ${b.requestNo} เรียบร้อย`);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">🚗</span>
          <div className="text-xs leading-relaxed text-amber-900">
            <span className="font-bold block text-sm mb-0.5">
              ศูนย์บริหารจัดการยานพาหนะราชการส่วนกลาง (Fleet &amp; Dispatch Management)
            </span>
            ควบคุมบัญชียานพาหนะราชการ กำหนดคนขับประจำรถ ตรวจสอบความพร้อม และอนุมัติคำขอใช้รถส่วนกลางแบบรวมศูนย์
          </div>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shrink-0 shadow-xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>+ เพิ่มยานพาหนะใหม่</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] text-slate-500 font-medium uppercase">รถทั้งหมด</div>
          <div className="text-2xl font-bold font-heading text-slate-900 mt-0.5">{stats.total}</div>
          <div className="text-[10px] text-slate-400">คันในระบบ</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] text-slate-500 font-medium uppercase">พร้อมใช้งาน</div>
          <div className="text-2xl font-bold font-heading text-emerald-600 mt-0.5">{stats.available}</div>
          <div className="text-[10px] text-emerald-500">🟢 Standby</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] text-slate-500 font-medium uppercase">กำลังปฏิบัติงาน</div>
          <div className="text-2xl font-bold font-heading text-amber-600 mt-0.5">{stats.inUse}</div>
          <div className="text-[10px] text-amber-500">🟡 อยู่ระหว่างภารกิจ</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] text-slate-500 font-medium uppercase">ซ่อมบำรุง</div>
          <div className="text-2xl font-bold font-heading text-rose-600 mt-0.5">{stats.maintenance}</div>
          <div className="text-[10px] text-rose-500">🔴 เข้าศูนย์/ตรวจสภาพ</div>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[10px] text-slate-500 font-medium uppercase">คำขอรออนุมัติ</div>
          <div className="text-2xl font-bold font-heading text-indigo-600 mt-0.5">{stats.pendingBookings}</div>
          <div className="text-[10px] text-indigo-500">📬 รอ พมจ./Admin</div>
        </div>
      </div>

      {/* Pending Bookings Section */}
      {stats.pendingBookings > 0 && (
        <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
              <h3 className="text-sm font-bold text-indigo-900">
                รายการคำขอใช้รถยนต์ราชการที่รอการอนุมัติ ({stats.pendingBookings} รายการ)
              </h3>
            </div>
            <span className="text-[11px] text-indigo-700 font-medium">อำนาจอนุมัติ: พมจ. / ผู้ดูแลระบบ</span>
          </div>

          <div className="space-y-2">
            {bookings
              .filter((b) => b.status === "pending_review" || b.status === "endorsed")
              .map((b) => (
                <div
                  key={b.id}
                  className="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{b.requestNo}</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800">
                        {b.status === "endorsed" ? "ผ่านความเห็นชอบฝ่ายแล้ว" : "รอตรวจสอบ"}
                      </span>
                      <span className="text-xs text-slate-500">· {b.vehicleName} ({b.licensePlate})</span>
                    </div>
                    <div className="text-xs text-slate-700">
                      <span className="font-semibold text-slate-900">{b.requesterName}</span> ({b.requesterDivision}) ขอไป: <span className="text-indigo-700 font-medium">{b.destination}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      วัตถุประสงค์: {b.purpose} · ออกเดินทาง: {b.departureTime} · คนขับ: {b.assignedDriver || "ไม่ได้ระบุ"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleApproveBooking(b)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      ✓ อนุมัติ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectBooking(b)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      ไม่อนุมัติ
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Fleet Controls: Search & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อรถ, ป้ายทะเบียน, ประเภท..."
            className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2">
          {(["all", "available", "in_use", "maintenance"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                statusFilter === st
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {st === "all" ? "ทั้งหมด" : st === "available" ? "🟢 ว่าง" : st === "in_use" ? "🟡 กำลังใช้" : "🔴 ซ่อม"}
            </button>
          ))}
        </div>
      </div>

      {/* Fleet Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVehicles.map((v) => (
          <div
            key={v.id}
            className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                    {v.category}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">{v.name}</h4>
                  <div className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block mt-1">
                    {v.licensePlate}
                  </div>
                </div>

                <span
                  className={`px-2 py-1 rounded-full text-[10px] font-bold border ${
                    v.status === "available"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : v.status === "in_use"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  {v.status === "available" ? "🟢 ว่างพร้อมใช้" : v.status === "in_use" ? "🟡 อยู่ระหว่างภารกิจ" : "🔴 ซ่อมบำรุง"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">พนักงานขับรถ</span>
                  <span className="font-medium text-slate-700">{v.driverName || "ไม่ระบุ"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">ความจุผู้โดยสาร</span>
                  <span className="font-medium text-slate-700">{v.capacity} ที่นั่ง</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">เลขไมล์สะสม</span>
                  <span className="font-mono text-slate-700">{v.mileage.toLocaleString()} กม.</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">ระดับน้ำมัน</span>
                  <span className="font-medium text-slate-700">{v.fuelLevel}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                หมดอายุ พ.ร.บ.: {v.insuranceExpiry || "-"}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(v)}
                  className="px-2.5 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg font-semibold transition-colors cursor-pointer"
                >
                  แก้ไข
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(v)}
                  className="px-2 py-1 text-xs text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  ลบ
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal เพิ่ม/แก้ไขรถยนต์ */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingVehicle ? "✏️ แก้ไขข้อมูลยานพาหนะ" : "🚗 เพิ่มยานพาหนะใหม่เข้าฟลีท"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ชื่อเรียกยานพาหนะ *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="เช่น Toyota Commuter VIP 01"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ป้ายทะเบียน *</label>
                  <input
                    type="text"
                    required
                    value={formData.licensePlate}
                    onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                    placeholder="เช่น นข-4589 กำแพงเพชร"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ประเภทรถ</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {VEHICLE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ความจุที่นั่ง</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">พนักงานขับรถประจำ</label>
                  <input
                    type="text"
                    value={formData.driverName}
                    onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                    placeholder="เช่น นายสมหมาย มั่นคง"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">สถานะปัจจุบัน</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="available">🟢 พร้อมใช้งาน</option>
                    <option value="in_use">🟡 กำลังปฏิบัติงาน</option>
                    <option value="maintenance">🔴 ซ่อมบำรุง / เข้าศูนย์</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">เลขไมล์สะสม (กม.)</label>
                  <input
                    type="number"
                    value={formData.mileage}
                    onChange={(e) => setFormData({ ...formData, mileage: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ระดับน้ำมันปัจจุบัน</label>
                  <select
                    value={formData.fuelLevel}
                    onChange={(e) => setFormData({ ...formData, fuelLevel: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {FUEL_LEVELS.map((fl) => (
                      <option key={fl} value={fl}>
                        {fl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">ชนิดเชื้อเพลิง</label>
                  <input
                    type="text"
                    value={formData.fuelType}
                    onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">วันหมดอายุ พ.ร.บ.</label>
                  <input
                    type="text"
                    value={formData.insuranceExpiry}
                    onChange={(e) => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                    placeholder="เช่น 2570-03-31"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-xl font-bold cursor-pointer transition-colors shadow-md shadow-indigo-600/25"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
