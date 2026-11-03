"use client";

import React, { useState, useEffect } from "react";
import { CarBookingRequest, Vehicle, Member, BookingStatus } from "@/lib/types";
import { GOVERNMENT_DRIVERS } from "@/lib/carbooking-data";

export interface DistrictPreset {
  name: string;
  destination: string;
  roundTripKm: number;
  tag?: string;
}

const DISTRICT_PRESETS: DistrictPreset[] = [
  { name: "อ.เมืองกำแพงเพชร", destination: "อำเภอเมืองกำแพงเพชร จังหวัดกำแพงเพชร", roundTripKm: 35 },
  { name: "อ.คลองลาน", destination: "อำเภอคลองลาน จังหวัดกำแพงเพชร", roundTripKm: 130 },
  { name: "อ.ขาณุวรลักษบุรี", destination: "อำเภอขาณุวรลักษบุรี จังหวัดกำแพงเพชร", roundTripKm: 175 },
  { name: "อ.คลองขลุง", destination: "อำเภอคลองขลุง จังหวัดกำแพงเพชร", roundTripKm: 95 },
  { name: "อ.พรานกระต่าย", destination: "อำเภอพรานกระต่าย จังหวัดกำแพงเพชร", roundTripKm: 70 },
  { name: "อ.ลานกระบือ", destination: "อำเภอลานกระบือ จังหวัดกำแพงเพชร", roundTripKm: 120 },
  { name: "อ.ไทรงาม", destination: "อำเภอไทรงาม จังหวัดกำแพงเพชร", roundTripKm: 85 },
  { name: "อ.ทรายทองวัฒนา", destination: "อำเภอทรายทองวัฒนา จังหวัดกำแพงเพชร", roundTripKm: 110 },
  { name: "อ.บึงสามัคคี", destination: "อำเภอบึงสามัคคี จังหวัดกำแพงเพชร", roundTripKm: 165 },
  { name: "อ.ปางศิลาทอง", destination: "อำเภอปางศิลาทอง จังหวัดกำแพงเพชร", roundTripKm: 150 },
  { name: "อ.โกสัมพีนคร", destination: "อำเภอโกสัมพีนคร จังหวัดกำแพงเพชร", roundTripKm: 85 },
  { name: "กระทรวง พม. (กทม.)", destination: "กระทรวงการพัฒนาสังคมและความมั่นคงของมนุษย์ กรุงเทพมหานคร", roundTripKm: 760 },
  { name: "จ.พิษณุโลก", destination: "จังหวัดพิษณุโลก (หน่วยงานสังกัด พม.)", roundTripKm: 230 },
  { name: "จ.นครสวรรค์", destination: "จังหวัดนครสวรรค์ (หน่วยงานสังกัด พม.)", roundTripKm: 240 },
];

const PURPOSE_PRESETS = [
  "ลงพื้นที่ตรวจเยี่ยมและให้ความช่วยเหลือกลุ่มเปราะบางรายครัวเรือน",
  "ร่วมประชุมและประสานงานราชการระดับจังหวัด",
  "ตรวจสอบข้อเท็จจริงกรณีผู้ประสบปัญหาทางสังคมเร่งด่วน",
  "รับ-ส่งวิทยากรและผู้แทนกระทรวง พม.",
  "จัดกิจกรรมโครงการส่งเสริมสิทธิและพัฒนาศักยภาพคนพิการ",
  "ส่งหนังสือราชการและเอกสารลับสำคัญเร่งด่วน",
];

const STATUS_OPTIONS: { value: BookingStatus; label: string; badgeClass: string }[] = [
  { value: "approved", label: "🟢 อนุมัติแล้ว (พร้อมเดินทาง)", badgeClass: "text-emerald-700 bg-emerald-50" },
  { value: "completed", label: "🏁 สิ้นสุดภารกิจ (คืนรถเรียบร้อย)", badgeClass: "text-slate-700 bg-slate-100" },
  { value: "pending_provincial", label: "🟡 รอ พมจ. อนุมัติ (ขั้นสุดท้าย)", badgeClass: "text-amber-700 bg-amber-50" },
  { value: "pending_admin_head", label: "🟡 รอหัวหน้าฝ่ายบริหารทั่วไปเห็นชอบ", badgeClass: "text-amber-700 bg-amber-50" },
  { value: "pending_fleet_assignment", label: "🟡 รอฝ่ายบริหารจัดสรรรถ/คนขับ", badgeClass: "text-amber-700 bg-amber-50" },
  { value: "pending_division_head", label: "🟡 รอกลุ่มงานต้นสังกัดเห็นชอบ", badgeClass: "text-amber-700 bg-amber-50" },
  { value: "rejected", label: "🔴 ไม่อนุมัติ", badgeClass: "text-rose-700 bg-rose-50" },
];

interface AdminBookingFormModalProps {
  booking: CarBookingRequest | null;
  vehicles: Vehicle[];
  members: Member[];
  currentUser: Member | null;
  onClose: () => void;
  onSave: (savedBooking: CarBookingRequest) => Promise<void> | void;
}

export function AdminBookingFormModal({
  booking,
  vehicles,
  members,
  currentUser,
  onClose,
  onSave,
}: AdminBookingFormModalProps) {
  const isEdit = Boolean(booking);

  // Form State
  const [requestNo, setRequestNo] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [requesterPosition, setRequesterPosition] = useState("");
  const [requesterDivision, setRequesterDivision] = useState("");
  const [requesterPhone, setRequesterPhone] = useState("");

  const [vehicleId, setVehicleId] = useState("");
  const [vehicleName, setVehicleName] = useState("");
  const [licensePlate, setLicensePlate] = useState("");

  const [purpose, setPurpose] = useState("");
  const [destination, setDestination] = useState("");
  const [origin, setOrigin] = useState("สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร");
  const [departureDate, setDepartureDate] = useState("");
  const [departureTimeOnly, setDepartureTimeOnly] = useState("08:30");
  const [returnDate, setReturnDate] = useState("");
  const [returnTimeOnly, setReturnTimeOnly] = useState("16:30");

  const [passengerCount, setPassengerCount] = useState<number>(1);
  const [passengersList, setPassengersList] = useState("");
  const [requireDriver, setRequireDriver] = useState<boolean>(true);
  const [assignedDriver, setAssignedDriver] = useState("");

  const [fuelBudgetRequested, setFuelBudgetRequested] = useState<boolean>(false);
  const [fuelBudgetAmount, setFuelBudgetAmount] = useState<number>(0);
  const [fuelProjectName, setFuelProjectName] = useState("");

  const [status, setStatus] = useState<BookingStatus>("approved");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (booking) {
      setRequestNo(booking.requestNo || "");
      setSelectedMemberId(booking.requesterId || "");
      setRequesterName(booking.requesterName || "");
      setRequesterPosition(booking.requesterPosition || "");
      setRequesterDivision(booking.requesterDivision || "");
      setRequesterPhone(booking.requesterPhone || "");

      setVehicleId(booking.vehicleId || "");
      setVehicleName(booking.vehicleName || "");
      setLicensePlate(booking.licensePlate || "");

      setPurpose(booking.purpose || "");
      setDestination(booking.destination || "");
      setOrigin(booking.origin || "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร");

      // Parse departure / return
      if (booking.departureTime) {
        const parts = booking.departureTime.split(" ");
        if (parts[0] && parts[0].includes("-")) {
          setDepartureDate(parts[0]);
          setDepartureTimeOnly(parts[1]?.slice(0, 5) || "08:30");
        } else {
          setDepartureDate(new Date().toISOString().slice(0, 10));
        }
      } else {
        setDepartureDate(new Date().toISOString().slice(0, 10));
      }

      if (booking.returnTime) {
        const parts = booking.returnTime.split(" ");
        if (parts[0] && parts[0].includes("-")) {
          setReturnDate(parts[0]);
          setReturnTimeOnly(parts[1]?.slice(0, 5) || "16:30");
        } else {
          setReturnDate(new Date().toISOString().slice(0, 10));
        }
      } else {
        setReturnDate(new Date().toISOString().slice(0, 10));
      }

      setPassengerCount(booking.passengerCount || 1);
      setPassengersList(booking.passengersList || "");
      setRequireDriver(booking.requireDriver ?? true);
      setAssignedDriver(booking.assignedDriver || "");

      setFuelBudgetRequested(Boolean(booking.fuelBudgetRequested));
      setFuelBudgetAmount(booking.fuelBudgetAmount || 0);
      setFuelProjectName(booking.fuelProjectName || "");

      setStatus(booking.status || "approved");
    } else {
      // New booking initialization
      const randomNum = Math.floor(Math.random() * 900) + 100;
      setRequestNo(`ขอใช้รถ-2569/${randomNum}`);

      const defaultMem = currentUser || members[0];
      if (defaultMem) {
        setSelectedMemberId(defaultMem.id);
        setRequesterName(defaultMem.name);
        setRequesterPosition(defaultMem.position || "เจ้าหน้าที่");
        setRequesterDivision(defaultMem.division || "ฝ่ายบริหารทั่วไป");
        setRequesterPhone(defaultMem.phone || "055-705033");
      }

      const defaultVeh = vehicles.find((v) => v.status === "available") || vehicles[0];
      if (defaultVeh) {
        setVehicleId(defaultVeh.id);
        setVehicleName(defaultVeh.name);
        setLicensePlate(defaultVeh.licensePlate);
        setAssignedDriver(defaultVeh.driverName || GOVERNMENT_DRIVERS[0]?.name || "พนักงานขับรถส่วนกลาง");
      }

      const todayStr = new Date().toISOString().slice(0, 10);
      setDepartureDate(todayStr);
      setReturnDate(todayStr);
      setStatus("approved");
    }
  }, [booking, currentUser, members, vehicles]);

  // When changing member selection
  const handleSelectMember = (memId: string) => {
    setSelectedMemberId(memId);
    const m = members.find((x) => x.id === memId);
    if (m) {
      setRequesterName(m.name);
      setRequesterPosition(m.position || "");
      setRequesterDivision(m.division || "");
      setRequesterPhone(m.phone || "");
    }
  };

  // When changing vehicle selection
  const handleSelectVehicle = (vId: string) => {
    setVehicleId(vId);
    const v = vehicles.find((x) => x.id === vId);
    if (v) {
      setVehicleName(v.name);
      setLicensePlate(v.licensePlate);
      if (v.driverName) {
        setAssignedDriver(v.driverName);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requesterName.trim() || !purpose.trim() || !destination.trim()) {
      alert("กรุณาระบุชื่อผู้ขอใชัรถ, วัตถุประสงค์ และสถานที่ปลายทางให้ครบถ้วน");
      return;
    }

    setSaving(true);
    try {
      const departureFull = departureDate && departureTimeOnly ? `${departureDate} ${departureTimeOnly}:00` : new Date().toISOString();
      const returnFull = returnDate && returnTimeOnly ? `${returnDate} ${returnTimeOnly}:00` : new Date().toISOString();

      const matchedVeh = vehicles.find((v) => v.id === vehicleId);

      const targetBooking: CarBookingRequest = {
        id: booking?.id || `book_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        requestNo: requestNo.trim() || `ขอใช้รถ-2569/${Math.floor(Math.random() * 900) + 100}`,
        vehicleId: vehicleId || "",
        vehicleName: matchedVeh ? matchedVeh.name : vehicleName || "รถยนต์ส่วนกลาง",
        licensePlate: matchedVeh ? matchedVeh.licensePlate : licensePlate || "-",
        requesterId: selectedMemberId || currentUser?.id || "usr_admin",
        requesterName: requesterName.trim(),
        requesterPosition: requesterPosition.trim(),
        requesterDivision: requesterDivision.trim(),
        requesterPhone: requesterPhone.trim(),
        purpose: purpose.trim(),
        destination: destination.trim(),
        origin: origin.trim() || "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
        departureTime: departureFull,
        returnTime: returnFull,
        passengerCount: Number(passengerCount) || 1,
        passengersList: passengersList.trim(),
        requireDriver,
        assignedDriver: assignedDriver.trim(),
        fuelBudgetRequested,
        fuelBudgetAmount: fuelBudgetRequested ? Number(fuelBudgetAmount) || 0 : 0,
        fuelProjectName: fuelBudgetRequested ? fuelProjectName.trim() : undefined,
        status,
        createdAt: booking?.createdAt || new Date().toISOString(),
        approverId: currentUser?.id,
        approverName: currentUser?.name || "ผู้ดูแลระบบ (Admin)",
        approverActionAt: new Date().toISOString(),
      };

      await onSave(targetBooking);
      onClose();
    } catch (err) {
      console.error("Failed to save booking:", err);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center text-xl shrink-0 border border-teal-200">
              {isEdit ? "✏️" : "➕"}
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-heading">
                {isEdit ? "แก้ไขบันทึกรายการใช้รถราชการ" : "เพิ่มบันทึกรายการใช้รถราชการ (Admin CRUD)"}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEdit
                  ? `เลขที่คำขอ: ${requestNo || booking?.id}`
                  : "สร้างหรือบันทึกประวัติการขอใช้รถยนต์ส่วนกลางย้อนหลังโดยผู้ดูแลระบบ"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-sm transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
          {/* Section 1: เลขที่คำขอ & สถานะ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-teal-50/50 rounded-2xl border border-teal-200/60">
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                เลขที่เอกสาร / คำขอ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={requestNo}
                onChange={(e) => setRequestNo(e.target.value)}
                placeholder="เช่น ขอใช้รถ-2569/042"
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:border-teal-600 font-mono text-xs"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">
                สถานะการใช้รถ (Workflow Status) <span className="text-rose-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as BookingStatus)}
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:border-teal-600 font-semibold text-xs"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 2: ข้อมูลผู้ขอใช้รถ */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-1.5 text-sm">
              <span>👤</span> ข้อมูลผู้ขอใช้ยานพาหนะ
            </h3>

            {members.length > 0 && (
              <div>
                <label className="block text-slate-500 mb-1">เลือกบุคลากรในสำนักงานเพื่อกรอกอัตโนมัติ:</label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => handleSelectMember(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-teal-500 text-xs"
                >
                  <option value="">-- กำหนดเอง หรือเลือกสมาชิก --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.position || "เจ้าหน้าที่"}) - {m.division || "-"}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">ชื่อ-สกุล ผู้ขอใช้รถ *</label>
                <input
                  type="text"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="เช่น นายสมศักดิ์ ข้าราชการดีเด่น"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">ตำแหน่ง</label>
                <input
                  type="text"
                  value={requesterPosition}
                  onChange={(e) => setRequesterPosition(e.target.value)}
                  placeholder="เช่น นักสังคมสงเคราะห์ชำนาญการ"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">กลุ่มงาน / สังกัด</label>
                <input
                  type="text"
                  value={requesterDivision}
                  onChange={(e) => setRequesterDivision(e.target.value)}
                  placeholder="เช่น ฝ่ายบริหารทั่วไป"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                <input
                  type="text"
                  value={requesterPhone}
                  onChange={(e) => setRequesterPhone(e.target.value)}
                  placeholder="เช่น 081-234-5678"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 3: ยานพาหนะ & พนักงานขับรถ */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-1.5 text-sm">
              <span>🚗</span> ยานพาหนะราชการ &amp; พนักงานขับรถ
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">เลือกรถยนต์ราชการ *</label>
                <select
                  value={vehicleId}
                  onChange={(e) => handleSelectVehicle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:border-teal-500 text-xs font-semibold"
                  required
                >
                  <option value="">-- เลือกรถยนต์ราชการ --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      [{v.licensePlate}] {v.name} ({v.category} - {v.capacity} ที่นั่ง)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">พนักงานขับรถประจำภารกิจ</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={assignedDriver}
                    onChange={(e) => setAssignedDriver(e.target.value)}
                    placeholder="ระบุชื่อคนขับรถ"
                    className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 text-xs"
                  />
                  <select
                    onChange={(e) => {
                      if (e.target.value) setAssignedDriver(e.target.value);
                    }}
                    className="px-2 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      เลือกจากเวร
                    </option>
                    {GOVERNMENT_DRIVERS.map((d, i) => (
                      <option key={i} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="requireDriver"
                checked={requireDriver}
                onChange={(e) => setRequireDriver(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded-sm"
              />
              <label htmlFor="requireDriver" className="text-xs text-slate-700 cursor-pointer font-medium">
                ต้องการพนักงานขับรถของสำนักงาน (หากไม่เลือก แสดงว่าเจ้าหน้าที่ผู้ขอขับรถยนต์ด้วยตนเอง)
              </label>
            </div>
          </div>

          {/* Section 4: ภารกิจและกำหนดการเดินทาง */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-1.5 text-sm">
              <span>📍</span> รายละเอียดภารกิจและเส้นทาง
            </h3>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-medium text-slate-700">วัตถุประสงค์ในการขอใช้รถ *</label>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {PURPOSE_PRESETS.slice(0, 4).map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPurpose(p)}
                    className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 rounded-lg border border-slate-200 transition-colors"
                  >
                    {p.slice(0, 32)}...
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="เช่น ลงพื้นที่ตรวจเยี่ยมกลุ่มเปราะบางและส่งต่อความช่วยเหลือ"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-medium text-slate-700">สถานที่ปลายทาง *</label>
                </div>
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {DISTRICT_PRESETS.slice(0, 4).map((dp, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setDestination(dp.destination)}
                      className="text-[10px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md"
                    >
                      {dp.name}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="เช่น อำเภอคลองลาน จังหวัดกำแพงเพชร"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">สถานที่ต้นทาง</label>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-teal-500 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div>
                <label className="block font-medium text-slate-700 mb-1">วัน-เวลาเดินทางไป *</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                    required
                  />
                  <input
                    type="time"
                    value={departureTimeOnly}
                    onChange={(e) => setDepartureTimeOnly(e.target.value)}
                    className="w-24 px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">วัน-เวลาเดินทางกลับ *</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                    required
                  />
                  <input
                    type="time"
                    value={returnTimeOnly}
                    onChange={(e) => setReturnTimeOnly(e.target.value)}
                    className="w-24 px-2 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">จำนวนผู้โดยสาร (คน)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={passengerCount}
                  onChange={(e) => setPassengerCount(parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-medium text-slate-700 mb-1">รายชื่อผู้โดยสารร่วมคณะ</label>
                <input
                  type="text"
                  value={passengersList}
                  onChange={(e) => setPassengersList(e.target.value)}
                  placeholder="เช่น นาย ก, นางสาว ข, นาย ค"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 5: งบประมาณค่าน้ำมัน */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="fuelRequested"
                  checked={fuelBudgetRequested}
                  onChange={(e) => setFuelBudgetRequested(e.target.checked)}
                  className="w-4 h-4 text-teal-600 rounded-sm"
                />
                <label htmlFor="fuelRequested" className="font-bold text-slate-800 cursor-pointer">
                  ⛽ มีการขอรับงบประมาณค่าน้ำมันเชื้อเพลิง
                </label>
              </div>
            </div>

            {fuelBudgetRequested && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">จำนวนเงินงบประมาณ (บาท)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={fuelBudgetAmount}
                    onChange={(e) => setFuelBudgetAmount(parseFloat(e.target.value) || 0)}
                    placeholder="เช่น 1500"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">ชื่อโครงการ / แหล่งงบประมาณ</label>
                  <input
                    type="text"
                    value={fuelProjectName}
                    onChange={(e) => setFuelProjectName(e.target.value)}
                    placeholder="เช่น งบดำเนินงานสำนักงาน พมจ."
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-end gap-2.5 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 font-bold transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-md shadow-teal-900/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>{saving ? "⏳" : "💾"}</span>
              <span>{saving ? "กำลังบันทึก..." : isEdit ? "บันทึกการแก้ไข" : "บันทึกรายการใช้รถ"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

