"use client";

import React, { useState } from "react";
import { Vehicle, VehicleStatus, FuelLevel } from "@/lib/types";
import { GOVERNMENT_DRIVERS, VEHICLE_IMAGE_PRESETS } from "@/lib/carbooking-data";
import { RealisticFuelGauge } from "./RealisticFuelGauge";

interface VehicleFormModalProps {
  vehicle?: Vehicle | null;
  onClose: () => void;
  onSave: (vehicle: Vehicle) => void;
}

const CATEGORY_OPTIONS: Vehicle["category"][] = [
  "รถตู้ส่วนกลาง",
  "รถกระบะตรวจการณ์",
  "รถยนต์นั่งส่วนบุคคล",
  "รถตู้ VIP ผู้บริหาร",
  "รถกระบะบรรทุก",
];

const FUEL_TYPE_OPTIONS = [
  "ดีเซล B7",
  "ดีเซล พรีเมียม",
  "เบนซิน ไฮบริด (E20)",
  "เบนซิน 95",
  "แก๊สโซฮอล์ 91/95",
  "ไฟฟ้า 100% (EV)",
];

const FUEL_LEVEL_OPTIONS: FuelLevel[] = [
  "เต็มถัง (100%)",
  "3/4 ถัง (75%)",
  "1/2 ถัง (50%)",
  "1/4 ถัง (25%)",
  "ใกล้หมด (ต่ำกว่า 15%)",
];

export function VehicleFormModal({
  vehicle,
  onClose,
  onSave,
}: VehicleFormModalProps) {
  const isEditing = Boolean(vehicle);

  const [name, setName] = useState(vehicle?.name || "");
  const [licensePlate, setLicensePlate] = useState(vehicle?.licensePlate || "");
  const [category, setCategory] = useState<Vehicle["category"]>(
    vehicle?.category || "รถยนต์นั่งส่วนบุคคล"
  );
  const [capacity, setCapacity] = useState<number>(vehicle?.capacity || 5);
  const [driverName, setDriverName] = useState(vehicle?.driverName || "พนักงานขับรถเวรส่วนกลาง");
  const [fuelType, setFuelType] = useState(vehicle?.fuelType || "ดีเซล B7");
  const [status, setStatus] = useState<VehicleStatus>(vehicle?.status || "available");
  const [mileage, setMileage] = useState<number>(vehicle?.mileage || 50000);
  const [fuelLevel, setFuelLevel] = useState<FuelLevel>(vehicle?.fuelLevel || "เต็มถัง (100%)");
  const [image, setImage] = useState<string>(
    vehicle?.image || VEHICLE_IMAGE_PRESETS[0].url
  );
  const [lastMaintenanceDate, setLastMaintenanceDate] = useState(
    vehicle?.lastMaintenanceDate || "1 ต.ค. 2569"
  );
  const [insuranceExpiry, setInsuranceExpiry] = useState(
    vehicle?.insuranceExpiry || "31 ธ.ค. 2569"
  );
  const [assignedDivision, setAssignedDivision] = useState(
    vehicle?.assignedDivision || "ฝ่ายบริหารทั่วไป (ส่วนกลาง)"
  );
  const [featuresStr, setFeaturesStr] = useState(
    vehicle?.features ? vehicle.features.join(", ") : "GPS ติดตามรถ, แอร์เย็นปกติ, ประกันภัยชั้น 1"
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !licensePlate.trim()) {
      alert("กรุณากรอกยี่ห้อ/รุ่นรถ และหมายเลขทะเบียนให้ครบถ้วน");
      return;
    }

    const features = featuresStr
      .split(/[,;\n]/)
      .map((f) => f.trim())
      .filter(Boolean);

    const updatedVehicle: Vehicle = {
      id: vehicle?.id || `veh_${Date.now()}`,
      name: name.trim(),
      licensePlate: licensePlate.trim(),
      category,
      capacity: Number(capacity) || 4,
      driverName: driverName.trim(),
      fuelType: fuelType.trim(),
      status,
      image: image.trim() || undefined,
      mileage: Number(mileage) || 0,
      fuelLevel,
      lastMaintenanceDate: lastMaintenanceDate.trim(),
      insuranceExpiry: insuranceExpiry.trim(),
      assignedDivision: assignedDivision.trim(),
      features: features.length > 0 ? features : ["อุปกรณ์ประจำรถครบถ้วน"],
    };

    onSave(updatedVehicle);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[calc(100vh-2rem)] md:max-h-[90vh] flex flex-col animate-fade-in">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-teal-700 to-teal-800 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xl backdrop-blur-xs">
              {isEditing ? "⚙️" : "🚗"}
            </div>
            <div>
              <h2 className="text-base font-bold">
                {isEditing ? "แก้ไขข้อมูลรถยนต์ราชการ" : "เพิ่มรถยนต์ราชการคันใหม่"}
              </h2>
              <p className="text-xs text-teal-100">
                ระบบจัดการยานพาหนะและภาพถ่ายรถยนต์ สำนักงาน พมจ.กำแพงเพชร
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-rose-600/80 text-white font-bold text-xs border border-white/20 shadow-xs transition-all cursor-pointer backdrop-blur-xs"
            title="ปิดหน้าต่าง"
          >
            <span className="text-sm font-black">✕</span>
            <span>ปิดหน้าต่าง</span>
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Form Body */}
          <div className="overflow-y-auto flex-1 p-6 space-y-5">
            {/* Vehicle Photo Upload & Presets Section */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>📸</span>
                <span>รูปภาพรถยนต์ราชการ (Vehicle Photo)</span>
              </label>
              <label className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs flex items-center gap-1">
                <span>📁</span>
                <span>อัปโหลดรูปจากเครื่อง</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Photo Preview & URL */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-full sm:w-44 h-28 rounded-xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0 shadow-inner group">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image}
                    alt="Vehicle preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                    <span>🚗</span>
                    <span>ไม่มีรูปภาพ</span>
                  </div>
                )}
                {image && (
                  <button
                    type="button"
                    onClick={() => setImage("")}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 hover:bg-rose-600 text-white text-xs flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                    title="ลบรูปภาพ"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="w-full space-y-2">
                <input
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="หรือระบุ URL รูปภาพ เช่น https://..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
                />

                {/* Preset Options */}
                <div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    หรือเลือกรูปภาพมาตรฐานประจำหมวด:
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {VEHICLE_IMAGE_PRESETS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setImage(preset.url)}
                        className={`text-[10px] px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                          image === preset.url
                            ? "bg-teal-600 text-white border-teal-600 shadow-2xs font-bold"
                            : "bg-white text-slate-600 border-slate-200 hover:border-teal-300"
                        }`}
                      >
                        {preset.title.split(" ")[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ยี่ห้อและรุ่นรถ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น Toyota Commuter 3.0 D4D"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                หมายเลขทะเบียนรถ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                placeholder="เช่น นข 4589 กำแพงเพชร"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-bold text-teal-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ประเภทรถยนต์
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Vehicle["category"])}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white font-body"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat} className="font-body">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                จำนวนที่นั่ง (ที่นั่ง)
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-body"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                สถานะความพร้อม
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as VehicleStatus)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white font-medium font-body"
              >
                <option value="available" className="font-body">🟢 พร้อมใช้งาน (Available)</option>
                <option value="in_use" className="font-body">🔵 ติดภารกิจ (In Use)</option>
                <option value="maintenance" className="font-body">🔴 ส่งซ่อมบำรุง (Maintenance)</option>
              </select>
            </div>
          </div>

          {/* Odometer & Realistic Fuel Gauge Section */}
          <div className="p-4 bg-teal-50/50 border border-teal-100 rounded-2xl space-y-4">
            <h3 className="text-xs font-bold text-teal-900 uppercase tracking-wide flex items-center gap-1.5 font-heading">
              <span>⛽</span>
              <span>เลขไมล์สะสม & เกจระดับน้ำมันเสมือนจริง (Instrument Cluster)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-center">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เลขไมล์ปัจจุบัน (กิโลเมตร) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      value={mileage}
                      onChange={(e) => setMileage(Number(e.target.value))}
                      className="w-full px-3 py-2 pr-12 border border-slate-200 rounded-xl text-sm font-mono font-bold text-teal-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">กม.</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เกจระดับน้ำมันคงเหลือปัจจุบัน
                  </label>
                  <select
                    value={fuelLevel}
                    onChange={(e) => setFuelLevel(e.target.value as FuelLevel)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white font-bold text-teal-800 font-body"
                  >
                    {FUEL_LEVEL_OPTIONS.map((lvl) => (
                      <option key={lvl} value={lvl} className="font-body">
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Realistic Animated Fuel Gauge Display */}
              <div className="flex flex-col items-center justify-center p-3 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-md">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1">
                  เกจวัดระดับน้ำมันหน้าปัดรถยนต์
                </span>
                <RealisticFuelGauge
                  level={fuelLevel}
                  size="md"
                  interactive={true}
                  onChangeLevel={setFuelLevel}
                />
              </div>
            </div>
          </div>

          {/* Fuel type & Driver */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ประเภทเชื้อเพลิง
              </label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white font-body"
              >
                {FUEL_TYPE_OPTIONS.map((ft) => (
                  <option key={ft} value={ft} className="font-body">
                    {ft}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                พนักงานขับรถประจำคัน / มอบหมาย
              </label>
              <select
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-white font-body"
              >
                <option value="พนักงานขับรถเวรส่วนกลาง" className="font-body">พนักงานขับรถเวรส่วนกลาง</option>
                <option value="ขับขี่เอง / พนักงานขับรถเวร" className="font-body">ขับขี่เอง / พนักงานขับรถเวร</option>
                {GOVERNMENT_DRIVERS.map((d) => (
                  <option key={d.id} value={d.name} className="font-body">
                    {d.name} ({d.license})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Maintenance & Division */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                วันที่ตรวจสภาพล่าสุด
              </label>
              <input
                type="text"
                value={lastMaintenanceDate}
                onChange={(e) => setLastMaintenanceDate(e.target.value)}
                placeholder="เช่น 15 ก.ย. 2569"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                วันหมดอายุ พ.ร.บ./ประกันภัย
              </label>
              <input
                type="text"
                value={insuranceExpiry}
                onChange={(e) => setInsuranceExpiry(e.target.value)}
                placeholder="เช่น 31 ธ.ค. 2569"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ฝ่าย/กลุ่มงานผู้รับผิดชอบ
              </label>
              <input
                type="text"
                value={assignedDivision}
                onChange={(e) => setAssignedDivision(e.target.value)}
                placeholder="เช่น ฝ่ายบริหารทั่วไป (ส่วนกลาง)"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Features */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              คุณสมบัติเด่นและอุปกรณ์ส่วนควบ (คั่นด้วยเครื่องหมายจุลภาค ,)
            </label>
            <input
              type="text"
              value={featuresStr}
              onChange={(e) => setFeaturesStr(e.target.value)}
              placeholder="เช่น GPS ติดตามรถ, เข็มขัดนิรภัยทุกที่นั่ง, แอร์แยกหน้า-หลัง"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500"
            />
          </div>
          </div>

          {/* Action Buttons - Fixed Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl text-sm font-bold shadow-md shadow-teal-700/20 transition-all cursor-pointer"
            >
              {isEditing ? "💾 บันทึกการแก้ไข" : "➕ เพิ่มรถยนต์ราชการ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
