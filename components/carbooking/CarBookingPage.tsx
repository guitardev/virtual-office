"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Member,
  CarBookingRequest,
  Vehicle,
  BookingStatus,
  VehicleReturnReport,
  FuelLevel,
  VehicleStatus,
  BookingNotificationLog,
} from "@/lib/types";
import {
  loadStoredBookings,
  saveStoredBookings,
  loadStoredVehicles,
  saveStoredVehicles,
  getConflictingBookings,
  findAvailableVehiclesForPeriod,
} from "@/lib/carbooking-data";
import {
  fetchVehicles,
  saveVehicle,
  deleteVehicle,
  fetchCarBookings,
  saveCarBooking,
  deleteCarBooking,
  subscribeToVehicles,
  subscribeToCarBookings,
  recordAuditLog,
} from "@/lib/supabase";
import { CarBookingDocumentModal } from "./CarBookingDocumentModal";
import { ReviewBookingModal } from "./ReviewBookingModal";
import { ReturnVehicleModal } from "./ReturnVehicleModal";
import { VehicleReturnDocumentModal } from "./VehicleReturnDocumentModal";
import { VehicleFormModal } from "./VehicleFormModal";
import { VehicleDetailModal } from "./VehicleDetailModal";
import { NotificationLogsModal } from "./NotificationLogsModal";
import { RealisticFuelGauge } from "./RealisticFuelGauge";
import { FleetGanttView } from "./FleetGanttView";
import { PaperlessDispatchQRCode } from "./PaperlessDispatchQRCode";

interface CarBookingPageProps {
  currentUser: Member;
  showToast: (msg: string) => void;
  members?: Member[];
}

export function CarBookingPage({
  currentUser,
  showToast,
  members = [],
}: CarBookingPageProps) {
  const [activeTab, setActiveTab] = useState<"fleet" | "requests" | "timeline" | "new_request">("requests");
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => loadStoredVehicles());
  const [bookings, setBookings] = useState<CarBookingRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [selectedDocBooking, setSelectedDocBooking] = useState<CarBookingRequest | null>(null);
  const [selectedReviewBooking, setSelectedReviewBooking] = useState<CarBookingRequest | null>(null);
  const [selectedReturnBooking, setSelectedReturnBooking] = useState<CarBookingRequest | null>(null);
  const [selectedReturnDocBooking, setSelectedReturnDocBooking] = useState<CarBookingRequest | null>(null);
  const [selectedManageVehicle, setSelectedManageVehicle] = useState<Vehicle | null>(null);
  const [isCreatingVehicle, setIsCreatingVehicle] = useState<boolean>(false);
  const [selectedDetailVehicle, setSelectedDetailVehicle] = useState<Vehicle | null>(null);
  const [selectedNotifBooking, setSelectedNotifBooking] = useState<CarBookingRequest | null>(null);

  // Form State for new booking
  const [formVehicleId, setFormVehicleId] = useState<string>(vehicles[0]?.id || "veh_1");
  const [formPurpose, setFormPurpose] = useState<string>("");
  const [formOrigin, setFormOrigin] = useState<string>("สำนักงาน พมจ.กำแพงเพชร (ศาลากลางจังหวัด)");
  const [formDestination, setFormDestination] = useState<string>("");
  const [formDepartureTime, setFormDepartureTime] = useState<string>("");
  const [formReturnTime, setFormReturnTime] = useState<string>("");
  const [formPassengerCount, setFormPassengerCount] = useState<number>(1);
  const [formEstimatedDistance, setFormEstimatedDistance] = useState<number>(150);
  const [formPassengersList, setFormPassengersList] = useState<string>("");
  const [formRequireDriver, setFormRequireDriver] = useState<boolean>(true);

  // Selected passengers from members DropDown list
  const [selectedPassengers, setSelectedPassengers] = useState<Member[]>([]);

  const handleAddPassenger = (memberId: string) => {
    if (!memberId) return;
    const found = members.find((m) => m.id === memberId);
    if (!found) return;
    if (selectedPassengers.some((p) => p.id === memberId)) {
      showToast(`⚠️ ${found.name} มีอยู่ในรายชื่อผู้ร่วมเดินทางแล้ว`);
      return;
    }
    const updated = [...selectedPassengers, found];
    setSelectedPassengers(updated);
    const namesStr = updated.map((p) => `${p.name} (${p.division || p.position})`).join(", ");
    setFormPassengersList(namesStr);
    setFormPassengerCount(1 + updated.length);
    showToast(`✓ เพิ่ม ${found.name} เป็นผู้ร่วมเดินทาง`);
  };

  const handleRemovePassenger = (memberId: string) => {
    const updated = selectedPassengers.filter((p) => p.id !== memberId);
    setSelectedPassengers(updated);
    const namesStr = updated.map((p) => `${p.name} (${p.division || p.position})`).join(", ");
    setFormPassengersList(namesStr);
    setFormPassengerCount(Math.max(1, 1 + updated.length));
  };

  // New Fuel Budget State (Item 1 requirement)
  const [formFuelBudgetRequested, setFormFuelBudgetRequested] = useState<boolean>(false);
  const [formFuelBudgetAmount, setFormFuelBudgetAmount] = useState<number>(1000);
  const [formFuelBudgetSource, setFormFuelBudgetSource] = useState<string>("งบดำเนินงานสำนักงาน");

  // Step 1 & 2 Workflow States: Reviewer Selection & Designated Fleet Dispatcher
  const [formReviewerType, setFormReviewerType] = useState<"head" | "official">("head");
  const [formSelectedReviewerId, setFormSelectedReviewerId] = useState<string>("");
  const [formDispatcherId, setFormDispatcherId] = useState<string>("");

  // Step 1: Detect Division Head for Current User
  const detectedDivisionHead = useMemo(() => {
    const userDiv = currentUser?.division || "";
    const head = members.find((m) => m.division === userDiv && (m.role === "manager" || m.position.includes("หัวหน้า")));
    if (head) return head;
    if (userDiv.includes("พัฒนาสังคม")) {
      return members.find(m => m.name.includes("วรวุฒิ")) || {
        id: "usr_head_dev",
        name: "นายวรวุฒิ พึ่งพัก",
        position: "นักพัฒนาสังคมชำนาญการพิเศษ (หัวหน้ากลุ่มการพัฒนาสังคมและสวัสดิการ)",
        division: "กลุ่มการพัฒนาสังคมและสวัสดิการ",
      };
    }
    if (userDiv.includes("นโยบาย")) {
      return members.find(m => m.name.includes("พนมศักย์")) || {
        id: "usr_head_policy",
        name: "นายพนมศักย์ บริภัทรจิรากร",
        position: "นักวิเคราะห์นโยบายและแผนชำนาญการ (หัวหน้ากลุ่มนโยบายและวิชาการ)",
        division: "กลุ่มนโยบายและวิชาการ",
      };
    }
    return members.find(m => m.name.includes("เสกพล")) || {
      id: "usr_2",
      name: "นายเสกพล ดิษฐโชติ",
      position: "นักพัฒนาสังคมชำนาญการ (หัวหน้าฝ่ายบริหารทั่วไป)",
      division: "ฝ่ายบริหารทั่วไป",
    };
  }, [members, currentUser]);

  // Step 1: Filter Government Officials (ข้าราชการ) in the same division
  const divisionOfficials = useMemo(() => {
    const userDiv = currentUser?.division || "กลุ่มการพัฒนาสังคมและสวัสดิการ";
    const inDiv = members.filter((m) => m.division === userDiv && m.id !== currentUser?.id);
    const officials = inDiv.filter((m) => m.personnelType === "ข้าราชการ" || m.role === "manager");
    return officials.length > 0 ? officials : (inDiv.length > 0 ? inDiv : [detectedDivisionHead as any]);
  }, [members, currentUser, detectedDivisionHead]);

  // Step 2: Designated Fleet Dispatchers in ฝ่ายบริหารทั่วไป
  const fleetDispatchers = useMemo(() => {
    const adminMembers = members.filter((m) => m.division?.includes("ฝ่ายบริหารทั่วไป"));
    if (adminMembers.length > 0) return adminMembers;
    return [
      {
        id: "disp_1",
        name: "นายอนุชา พลแสน",
        position: "พนักงานขับรถยนต์ / งานยานพาหนะ ฝ่ายบริหารทั่วไป",
        division: "ฝ่ายบริหารทั่วไป",
      },
      {
        id: "disp_2",
        name: "นายเสกพล ดิษฐโชติ",
        position: "นักพัฒนาสังคมชำนาญการ (หัวหน้าฝ่ายบริหารทั่วไป)",
        division: "ฝ่ายบริหารทั่วไป",
      },
    ];
  }, [members]);

  // Real-time Conflict Guard calculations
  const conflictDetails = useMemo(() => {
    return getConflictingBookings(
      formVehicleId,
      formDepartureTime,
      formReturnTime,
      bookings
    );
  }, [formVehicleId, formDepartureTime, formReturnTime, bookings]);

  const recommendedAlternativeVehicles = useMemo(() => {
    if (!conflictDetails.hasConflict) return [];
    const selectedVeh = vehicles.find((v) => v.id === formVehicleId);
    return findAvailableVehiclesForPeriod(
      vehicles,
      formDepartureTime,
      formReturnTime,
      bookings,
      {
        excludeVehicleId: formVehicleId,
        preferredCategory: selectedVeh?.category,
      }
    );
  }, [conflictDetails.hasConflict, formVehicleId, formDepartureTime, formReturnTime, vehicles, bookings]);

  // Load data from storage & sync with Supabase on mount
  useEffect(() => {
    const loadedBookings = loadStoredBookings();
    setBookings(loadedBookings);

    const loadedVehicles = loadStoredVehicles();
    setVehicles(loadedVehicles);

    let isMounted = true;
    fetchCarBookings().then((remoteBookings) => {
      if (isMounted && remoteBookings) {
        setBookings(remoteBookings);
        saveStoredBookings(remoteBookings);
      }
    });

    fetchVehicles().then((remoteVehicles) => {
      if (isMounted && remoteVehicles && remoteVehicles.length > 0) {
        setVehicles(remoteVehicles);
        saveStoredVehicles(remoteVehicles);
      }
    });

    const unsubVehicles = subscribeToVehicles((updatedVehicles) => {
      if (isMounted && updatedVehicles && updatedVehicles.length > 0) {
        setVehicles(updatedVehicles);
        saveStoredVehicles(updatedVehicles);
      }
    });

    const unsubBookings = subscribeToCarBookings((updatedBookings) => {
      if (isMounted && updatedBookings) {
        setBookings(updatedBookings);
        saveStoredBookings(updatedBookings);
      }
    });

    // Set default departure/return dates (tomorrow 08:30 to 16:30)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const dd = String(tomorrow.getDate()).padStart(2, "0");

    setFormDepartureTime(`${yyyy}-${mm}-${dd}T08:30`);
    setFormReturnTime(`${yyyy}-${mm}-${dd}T16:30`);

    return () => {
      isMounted = false;
      unsubVehicles();
      unsubBookings();
    };
  }, []);

  const updateAndSaveBookings = (newBookings: CarBookingRequest[]) => {
    setBookings(newBookings);
    saveStoredBookings(newBookings);
    newBookings.forEach((b) => {
      saveCarBooking(b).catch(() => {});
    });
  };

  const updateAndSaveVehicles = (newVehicles: Vehicle[]) => {
    setVehicles(newVehicles);
    saveStoredVehicles(newVehicles);
    newVehicles.forEach((v) => {
      saveVehicle(v).catch(() => {});
    });
  };

  // Stats calculation
  const stats = useMemo(() => {
    const totalVehicles = vehicles.length;
    const availableVehicles = vehicles.filter((v) => v.status === "available").length;
    const pendingReviewCount = bookings.filter((b) => b.status === "pending_review").length;
    const endorsedCount = bookings.filter((b) => b.status === "endorsed").length;
    const approvedCount = bookings.filter((b) => b.status === "approved").length;
    const completedCount = bookings.filter((b) => b.status === "completed").length;

    return {
      totalVehicles,
      availableVehicles,
      pendingReviewCount,
      endorsedCount,
      approvedCount,
      completedCount,
    };
  }, [vehicles, bookings]);

  // Active / Approved bookings that are on mission or due for return
  const activeReturnDueBookings = useMemo(() => {
    return bookings.filter((b) => b.status === "approved");
  }, [bookings]);

  // Filtered bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (statusFilter !== "all") {
        if (statusFilter === "pending") {
          const isPending =
            b.status === "pending_division_head" ||
            b.status === "pending_fleet_assignment" ||
            b.status === "pending_admin_head" ||
            b.status === "pending_provincial" ||
            b.status === "pending_review" ||
            b.status === "endorsed";
          if (!isPending) return false;
        } else if (b.status !== statusFilter) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNo = b.requestNo.toLowerCase().includes(q);
        const matchName = b.requesterName.toLowerCase().includes(q);
        const matchDest = b.destination.toLowerCase().includes(q);
        const matchVeh = b.vehicleName.toLowerCase().includes(q);
        const matchPlate = b.licensePlate.toLowerCase().includes(q);
        if (!matchNo && !matchName && !matchDest && !matchVeh && !matchPlate) return false;
      }
      return true;
    });
  }, [bookings, statusFilter, searchQuery]);

  // 1. Handle Create Booking (Item 1: Request with Fuel Budget & Notification)
  const handleCreateBooking = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formPurpose.trim()) {
      showToast("⚠️ กรุณาระบุวัตถุประสงค์การเดินทาง");
      return;
    }
    if (!formDestination.trim()) {
      showToast("⚠️ กรุณาระบุสถานที่ปลายทาง");
      return;
    }
    if (!formDepartureTime || !formReturnTime) {
      showToast("⚠️ กรุณาระบุวันและเวลาเดินทาง");
      return;
    }

    const newReqNo = `คข-69/${String(bookings.length + 9).padStart(3, "0")}`;

    const nowFormatted =
      new Date().toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " น.";

    // Step 1: Determine initial reviewer (head or official)
    const chosenReviewer =
      formReviewerType === "head"
        ? detectedDivisionHead
        : members.find((m) => m.id === formSelectedReviewerId) || divisionOfficials[0] || detectedDivisionHead;

    // Step 2: Determine designated fleet dispatcher in ฝ่ายบริหารทั่วไป
    const chosenDispatcher =
      fleetDispatchers.find((d) => d.id === formDispatcherId) || fleetDispatchers[0];

    // Step 1 Notification: ส่ง Notifications ไปยัง หัวหน้ากลุ่มหรือข้าราชการในกลุ่มที่เลือก
    const initialNotification: BookingNotificationLog = {
      id: `notif_${Date.now()}_sub`,
      timestamp: nowFormatted,
      type: "request_submitted",
      title: "ยื่นคำขอใช้รถราชการใหม่ (รอพิจารณาชั้นต้น)",
      message: `[Line Notify] 📩 มีคำขอใช้รถใหม่ ${newReqNo} จาก ${currentUser.name} (${currentUser.division}) ปลายทาง: ${formDestination.trim()} ${
        formFuelBudgetRequested
          ? `(ของบประมาณค่าน้ำมัน: ${formFuelBudgetAmount.toLocaleString()} บาท)`
          : "(ไม่ของบค่าน้ำมัน)"
      } รอ ${chosenReviewer.name} (${formReviewerType === "head" ? "หัวหน้ากลุ่ม/ฝ่าย" : "ข้าราชการในกลุ่ม"}) ตรวจสอบและให้ความเห็นชอบชั้นต้น`,
      recipientRole: formReviewerType === "head" ? "หัวหน้ากลุ่ม/ฝ่าย" : "ข้าราชการในกลุ่มตนเอง",
      recipientName: chosenReviewer.name,
      channel: "line_notify",
      status: "delivered",
    };

    const newBooking: CarBookingRequest = {
      id: `req_car_${Date.now()}`,
      requestNo: newReqNo,
      vehicleId: "",
      vehicleName: "รอฝ่ายบริหารจัดสรร",
      licensePlate: "-",
      requesterId: currentUser.id,
      requesterName: currentUser.name,
      requesterPosition: currentUser.position,
      requesterDivision: currentUser.division,
      requesterPhone: currentUser.phone,
      purpose: formPurpose.trim(),
      origin: formOrigin.trim(),
      destination: formDestination.trim(),
      departureTime: formDepartureTime,
      returnTime: formReturnTime,
      passengerCount: Number(formPassengerCount) || 1,
      passengersList: formPassengersList.trim() || `${currentUser.name}`,
      estimatedDistance: Number(formEstimatedDistance) || 150,
      requireDriver: formRequireDriver,
      assignedDriver: formRequireDriver ? "รอฝ่ายบริหารจัดสรร" : "ขับขี่เองโดยผู้ขอใช้รถ",
      fuelBudgetRequested: formFuelBudgetRequested,
      fuelBudgetAmount: formFuelBudgetRequested ? Number(formFuelBudgetAmount) : undefined,
      fuelBudgetSource: formFuelBudgetRequested ? formFuelBudgetSource.trim() : undefined,
      status: "pending_division_head",
      createdAt: nowFormatted,
      divisionReviewerId: chosenReviewer.id,
      divisionReviewerName: chosenReviewer.name,
      divisionReviewerPosition: chosenReviewer.position,
      divisionReviewerRole: formReviewerType,
      fleetDispatcherId: chosenDispatcher.id,
      fleetDispatcherName: chosenDispatcher.name,
      fleetDispatcherPosition: (chosenDispatcher as any).position,
      notifications: [initialNotification],
    };

    const updated = [newBooking, ...bookings];
    updateAndSaveBookings(updated);

    recordAuditLog(
      currentUser.name,
      `ยื่นคำขอจองรถยนต์ราชการ: ${newReqNo}`,
      `เสนอ ${chosenReviewer.name} (${formReviewerType === "head" ? "หัวหน้ากลุ่ม" : "ข้าราชการ"}) ตรวจสอบชั้นต้น - ปลายทาง: ${formDestination.trim()}`,
      "success"
    ).catch(console.warn);

    showToast(
      `✅ ยื่นคำขอใช้รถ ${newReqNo} สำเร็จ! ส่ง Line Notify ไปยัง ${chosenReviewer.name} เรียบร้อยแล้ว`
    );
    setActiveTab("requests");

    // Reset fields
    setFormPurpose("");
    setFormDestination("");
    setFormPassengersList("");
    setSelectedPassengers([]);
    setFormPassengerCount(1);
    setFormFuelBudgetRequested(false);
  };

  // ─── STEP 2: Division Head / Peer Official Endorsement ───
  // หัวหน้ากลุ่ม/ฝ่ายหรือข้าราชการในกลุ่ม ที่สังกัด เห็นชอบ -> Notifications ไปยัง บุคคลในฝ่ายบริหารที่กำหนด(มีหน้าที่จัดสรรทรัพยากรรถ)
  const handleDivisionEndorse = (bookingId: string, notes: string) => {
    const nowFormatted =
      new Date().toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " น.";

    const target = bookings.find((b) => b.id === bookingId);
    if (!target) return;

    const dispatcherName = target.fleetDispatcherName || "เจ้าหน้าที่งานยานพาหนะ ฝ่ายบริหารทั่วไป";

    const notif: BookingNotificationLog = {
      id: `notif_${Date.now()}_div_end`,
      timestamp: nowFormatted,
      type: "division_endorsed",
      title: "หัวหน้ากลุ่ม/ผู้แทนกลุ่มเห็นชอบคำขอใช้รถ",
      message: `[Line Notify] 📋 คำขอใช้รถ ${target.requestNo} ผ่านความเห็นชอบจาก ${currentUser.name} (${currentUser.position}) เรียบร้อยแล้ว แจ้งเตือนไปยัง ${dispatcherName} เพื่อดำเนินการจัดสรรรถยนต์และพนักงานขับรถต่อไป`,
      recipientRole: "เจ้าหน้าที่จัดสรรรถ ฝ่ายบริหารทั่วไป",
      recipientName: dispatcherName,
      channel: "line_notify",
      status: "delivered",
    };

    const updated = bookings.map((b) => {
      if (b.id !== bookingId) return b;
      return {
        ...b,
        status: "pending_fleet_assignment" as BookingStatus,
        divisionReviewerId: currentUser.id,
        divisionReviewerName: `${currentUser.name} (${currentUser.position})`,
        divisionReviewerNotes: notes,
        divisionReviewerActionAt: nowFormatted,
        // Legacy fallback
        managerId: currentUser.id,
        managerName: `${currentUser.name} (${currentUser.position})`,
        managerNotes: notes,
        managerActionAt: nowFormatted,
        notifications: [...(b.notifications || []), notif],
      };
    });

    updateAndSaveBookings(updated);

    recordAuditLog(
      currentUser.name,
      `เห็นชอบคำขอใช้รถขั้นต้น: ${target.requestNo}`,
      `ความเห็น: ${notes || "เห็นชอบ"} - ส่งต่อฝ่ายบริหารจัดสรรรถ`,
      "success"
    ).catch(console.warn);

    setSelectedReviewBooking(null);
    showToast(`✓ เห็นชอบคำขอ ${target.requestNo} เรียบร้อยแล้ว! ส่ง Line Notify ไปยัง ${dispatcherName}`);
  };

  // ─── STEP 3: Fleet Dispatcher Resource Assignment ───
  // บุคคลฝ่ายบริหาร จัดรถ / จัดพนักงานขับรถยนต์ -> Notifications -> เสนอหัวหน้าฝ่ายบริหาร เพื่อเห็นชอบ
  const handleFleetAssign = (
    bookingId: string,
    vehicleId: string,
    assignedDriver: string,
    notes: string
  ) => {
    const nowFormatted =
      new Date().toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " น.";

    const target = bookings.find((b) => b.id === bookingId);
    if (!target) return;

    const assignedVeh = vehicles.find((v) => v.id === vehicleId) || {
      id: vehicleId,
      name: target.vehicleName,
      licensePlate: target.licensePlate,
    };

    const adminHeadName = "นายเสกพล ดิษฐโชติ (หัวหน้าฝ่ายบริหารทั่วไป)";

    const notif: BookingNotificationLog = {
      id: `notif_${Date.now()}_flt_asg`,
      timestamp: nowFormatted,
      type: "fleet_assigned",
      title: "จัดสรรรถและพนักงานขับรถเรียบร้อย",
      message: `[Line Notify] 🚗 คำขอ ${target.requestNo} ได้รับการจัดสรรพาหนะ: ${assignedVeh.name} [${assignedVeh.licensePlate}] พนักงานขับรถ: ${assignedDriver} เสนอ ${adminHeadName} เพื่อโปรดพิจารณาเห็นชอบ`,
      recipientRole: "หัวหน้าฝ่ายบริหารทั่วไป",
      recipientName: "นายเสกพล ดิษฐโชติ",
      channel: "line_notify",
      status: "delivered",
    };

    const updated = bookings.map((b) => {
      if (b.id !== bookingId) return b;
      return {
        ...b,
        status: "pending_admin_head" as BookingStatus,
        vehicleId: assignedVeh.id,
        vehicleName: assignedVeh.name,
        licensePlate: assignedVeh.licensePlate,
        assignedDriver,
        fleetDispatcherId: currentUser.id,
        fleetDispatcherName: `${currentUser.name} (${currentUser.position})`,
        fleetDispatcherNotes: notes,
        fleetDispatcherActionAt: nowFormatted,
        notifications: [...(b.notifications || []), notif],
      };
    });

    updateAndSaveBookings(updated);

    recordAuditLog(
      currentUser.name,
      `จัดสรรยานพาหนะและคนขับ: ${target.requestNo}`,
      `รถ: ${assignedVeh.licensePlate} - คนขับ: ${assignedDriver} - เสนอหัวหน้าฝ่ายบริหารทั่วไป`,
      "success"
    ).catch(console.warn);

    setSelectedReviewBooking(null);
    showToast(`✓ จัดสรรรถและคนขับสำหรับคำขอ ${target.requestNo} สำเร็จ! ส่ง Line Notify เสนอหัวหน้าฝ่ายบริหารทั่วไปแล้ว`);
  };

  // ─── STEP 4.1: Admin Head Endorsement ───
  // หัวหน้าฝ่ายบริหาร เพื่อเห็นชอบ -> Notifications ไปยัง พมจ. ขออนุมัติ
  const handleAdminHeadEndorse = (bookingId: string, notes: string) => {
    const nowFormatted =
      new Date().toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " น.";

    const target = bookings.find((b) => b.id === bookingId);
    if (!target) return;

    const notif: BookingNotificationLog = {
      id: `notif_${Date.now()}_adm_head`,
      timestamp: nowFormatted,
      type: "admin_head_endorsed",
      title: "หัวหน้าฝ่ายบริหารทั่วไปเห็นชอบคำขอใช้รถ",
      message: `[Line Notify] 👔 คำขอใช้รถ ${target.requestNo} ผ่านความเห็นชอบจากหัวหน้าฝ่ายบริหารทั่วไป (${currentUser.name}) เสนอ พมจ.กำแพงเพชร (นางสาวมะลิวัน สิทธิโยธี) เพื่อโปรดพิจารณาอนุมัติ`,
      recipientRole: "พมจ.กำแพงเพชร",
      recipientName: "นางสาวมะลิวัน สิทธิโยธี",
      channel: "line_notify",
      status: "delivered",
    };

    const updated = bookings.map((b) => {
      if (b.id !== bookingId) return b;
      return {
        ...b,
        status: "pending_provincial" as BookingStatus,
        adminHeadId: currentUser.id,
        adminHeadName: `${currentUser.name} (${currentUser.position})`,
        adminHeadNotes: notes,
        adminHeadActionAt: nowFormatted,
        notifications: [...(b.notifications || []), notif],
      };
    });

    updateAndSaveBookings(updated);

    recordAuditLog(
      currentUser.name,
      `หัวหน้าฝ่ายบริหารเห็นชอบคำขอใช้รถ: ${target.requestNo}`,
      `ความเห็น: ${notes || "เห็นชอบ"} - เสนอ พมจ. ขออนุมัติ`,
      "success"
    ).catch(console.warn);

    setSelectedReviewBooking(null);
    showToast(`✓ หัวหน้าฝ่ายบริหารเห็นชอบคำขอ ${target.requestNo} แล้ว! ส่ง Line Notify เสนอ พมจ.กำแพงเพชร`);
  };

  // ─── STEP 4.2: Provincial Final Approval ───
  // พมจ. ขออนุมัติ & อนุมัติ -> Notifications ไปที่ผู้ขอใช้รถ
  const handleProvincialApprove = (bookingId: string, notes: string) => {
    const nowFormatted =
      new Date().toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " น.";

    const target = bookings.find((b) => b.id === bookingId);
    if (!target) return;

    // Stakeholders Notifications:
    // 1. Notify Requester
    const notifRequester: BookingNotificationLog = {
      id: `notif_${Date.now()}_req`,
      timestamp: nowFormatted,
      type: "approved",
      title: "พมจ.กำแพงเพชร อนุมัติคำขอใช้รถยนต์ราชการ",
      message: `[Line Notify] 🎉 คำขอ ${target.requestNo} ได้รับการอนุมัติแล้วจาก พมจ.กำแพงเพชร พาหนะ: ${target.vehicleName} [${target.licensePlate}] พนักงานขับรถ: ${target.assignedDriver || "พนักงานขับรถเวร"} พร้อมออกเดินทางได้`,
      recipientRole: "ผู้ขอใช้รถ",
      recipientName: target.requesterName,
      channel: "line_notify",
      status: "delivered",
    };

    // 2. Notify Assigned Driver
    const notifDriver: BookingNotificationLog = {
      id: `notif_${Date.now()}_drv`,
      timestamp: nowFormatted,
      type: "approved",
      title: "มอบหมายภารกิจพนักงานขับรถราชการ",
      message: `[Line Notify] 🚗 คุณได้รับมอบหมายขับรถ ${target.vehicleName} [${
        target.licensePlate
      }] ไปยัง ${target.destination} กำหนดออก: ${target.departureTime.replace(
        "T",
        " "
      )} คณะผู้เดินทาง ${target.passengerCount} คน`,
      recipientRole: "พนักงานขับรถราชการ",
      recipientName: target.assignedDriver || "พนักงานขับรถ",
      channel: "line_notify",
      status: "delivered",
    };

    // 3. Notify Fleet & Inventory Officers
    const notifFleet: BookingNotificationLog = {
      id: `notif_${Date.now()}_flt`,
      timestamp: nowFormatted,
      type: "approved",
      title: "เตรียมความพร้อมรถยนต์ราชการสำหรับภารกิจ",
      message: `[System Alert] 📋 เตรียมความพร้อมรถ ${target.vehicleName} [${
        target.licensePlate
      }] สำหรับคำขอ ${target.requestNo} ${
        target.fuelBudgetRequested
          ? `(งบประมาณค่าน้ำมัน: ${target.fuelBudgetAmount?.toLocaleString()} บาท)`
          : ""
      }`,
      recipientRole: "เจ้าหน้าที่ยานพาหนะ",
      recipientName: "ฝ่ายบริหารทั่วไป (งานยานพาหนะ)",
      channel: "system_alert",
      status: "delivered",
    };

    const newNotifs = [notifRequester, notifDriver, notifFleet];

    const updated = bookings.map((b) => {
      if (b.id !== bookingId) return b;
      return {
        ...b,
        status: "approved" as BookingStatus,
        approverId: currentUser.id,
        approverName: `${currentUser.name} (พมจ.กำแพงเพชร)`,
        approverNotes: notes,
        approverActionAt: nowFormatted,
        notifications: [...(b.notifications || []), ...newNotifs],
      };
    });

    updateAndSaveBookings(updated);

    // Also mark vehicle status as in_use
    const updatedVehicles = vehicles.map((v) => {
      if (v.id !== target.vehicleId) return v;
      return { ...v, status: "in_use" as VehicleStatus };
    });
    updateAndSaveVehicles(updatedVehicles);

    setSelectedReviewBooking(null);
    recordAuditLog(
      currentUser.name,
      `พมจ. อนุมัติคำขอใช้รถราชการ: ${target.requestNo}`,
      `พาหนะ: ${target.vehicleName} [${target.licensePlate}] - ปลายทาง: ${target.destination}`,
      "success"
    ).catch(console.warn);

    showToast(
      `👑 พมจ.กำแพงเพชร อนุมัติเรียบร้อย! และระบบได้ส่ง Line Notify แจ้งเตือนไปยังคุณ ${target.requesterName} และพนักงานขับรถแล้ว`
    );
  };

  // Backwards compatibility wrappers
  const handleEndorse = (bookingId: string, assignedDriver: string, managerNotes: string) => {
    handleDivisionEndorse(bookingId, managerNotes);
  };

  const handleApprove = (bookingId: string, approverNotes: string) => {
    handleProvincialApprove(bookingId, approverNotes);
  };

  // Handle Rejection
  const handleReject = (bookingId: string, reason: string) => {
    const updated = bookings.map((b) => {
      if (b.id !== bookingId) return b;
      return {
        ...b,
        status: "rejected" as BookingStatus,
        rejectReason: reason,
        rejectedBy: currentUser.name,
      };
    });

    updateAndSaveBookings(updated);
    const targetBooking = bookings.find((b) => b.id === bookingId);
    recordAuditLog(
      currentUser.name,
      `ไม่อนุมัติ/ส่งกลับคำขอใช้รถ: ${targetBooking ? targetBooking.requestNo : bookingId}`,
      `เหตุผล: ${reason}`,
      "denied"
    ).catch(console.warn);
    setSelectedReviewBooking(null);
    showToast(`✕ บันทึกการส่งกลับ/ไม่อนุมัติคำขอ ${bookingId} เรียบร้อยแล้ว`);
  };

  // Manual Trigger: Send Return Reminder (แจ้งเตือนการคืนรถ via Line Notify)
  const handleSendReturnReminder = (booking: CarBookingRequest) => {
    const nowFormatted =
      new Date().toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " น.";

    const reminderNotif: BookingNotificationLog = {
      id: `notif_${Date.now()}_rem`,
      timestamp: nowFormatted,
      type: "return_reminder",
      title: "แจ้งเตือนถึงกำหนดส่งคืนรถยนต์ราชการ",
      message: `[Line Notify] ⚠️ แจ้งเตือนถึงกำหนดส่งคืนรถยนต์ราชการ: คำขอ ${booking.requestNo} (${booking.licensePlate}) ถึงเวลาส่งคืนแล้ว กรุณานำรถส่งคืน ณ สำนักงาน พมจ. และรายงานผลการตรวจสภาพ เลขไมล์ และเกจน้ำมันในระบบเพื่อคืนสถานะความพร้อม`,
      recipientRole: "ผู้ขอใช้รถ / คณะเดินทาง",
      recipientName: booking.requesterName,
      channel: "line_notify",
      status: "delivered",
    };

    const updated = bookings.map((b) => {
      if (b.id !== booking.id) return b;
      return {
        ...b,
        notifications: [...(b.notifications || []), reminderNotif],
      };
    });

    updateAndSaveBookings(updated);
    showToast(
      `📲 ส่งข้อความ Line Notify แจ้งเตือนคืนรถยนต์ [${booking.licensePlate}] ไปยังคุณ ${booking.requesterName} เรียบร้อยแล้ว!`
    );
  };

  // Cancel booking by requester
  const handleCancelBooking = (booking: CarBookingRequest) => {
    if (!confirm(`คุณต้องการยกเลิกคำขอ ${booking.requestNo} หรือไม่?`)) return;
    const updated = bookings.filter((b) => b.id !== booking.id);
    updateAndSaveBookings(updated);
    deleteCarBooking(booking.id).catch(() => {});
    showToast(`ยกเลิกคำขอ ${booking.requestNo} สำเร็จ`);
  };

  // ─── STEP 5, 6, 7: Return Vehicle Report & Revert Vehicle Status ───
  // 5. ผู้ขอใช้รถ บันทึกข้อมูล เลขไมล์ ระดับน้ำมัน -> ส่งกุญแจคืน
  // 6. ระบบบันทึกข้อมูลการใช้งาน และคำนวนระยะทั้งหมดที่ใช้งาน เคลียร์สถานะพร้อมใช้งาน
  // 7. ระบบคืนรถ มีช่องกรอก สภาพปัญหาที่พบ (แจ้งซ่อม) -> กรณีพบปัญหา -> Notifications ไปยังหัวหน้าฝ่ายบริหาร
  const handleReturnVehicle = (
    bookingId: string,
    vehicleId: string,
    report: VehicleReturnReport
  ) => {
    const nowFormatted =
      new Date().toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) + " น.";

    const targetBooking = bookings.find((b) => b.id === bookingId);
    const licensePlate = targetBooking ? targetBooking.licensePlate : "รถราชการ";
    const hasDefect = !!(report.hasIssue || report.needsMaintenance);

    const notifs: BookingNotificationLog[] = [];

    // Notification 1: Normal Return Completion Notice
    const returnCompletedNotif: BookingNotificationLog = {
      id: `notif_${Date.now()}_ret`,
      timestamp: nowFormatted,
      type: "return_completed",
      title: "ส่งคืนรถยนต์และกุญแจเรียบร้อย",
      message: `[Line Notify] 🏁 ส่งคืนรถยนต์ ${licensePlate} เรียบร้อยแล้ว (กุญแจรถ: ${report.keyReturned ? "ส่งคืนแล้ว" : "ยังไม่ส่งคืน"}) เลขไมล์: ${report.endMileage.toLocaleString()} กม. (ระยะวิ่งจริง ${report.totalDistance.toLocaleString()} กม.) เกจน้ำมัน: ${
        report.endFuelLevel
      } ผู้ตรวจรับ: ${report.inspectorName}`,
      recipientRole: "เจ้าหน้าที่ยานพาหนะ",
      recipientName: "ฝ่ายบริหารทั่วไป (งานยานพาหนะ)",
      channel: "line_notify",
      status: "delivered",
    };
    notifs.push(returnCompletedNotif);

    // Notification 2 (Step 7): Maintenance / Defect Alert to Head of Admin
    if (hasDefect) {
      const maintenanceAlertNotif: BookingNotificationLog = {
        id: `notif_${Date.now()}_maint`,
        timestamp: nowFormatted,
        type: "maintenance_alert",
        title: "⚠️ แจ้งซ่อมบำรุงเร่งด่วน: ตรวจพบปัญหาจากการใช้งานรถยนต์ราชการ",
        message: `[Line Notify ด่วน] 🚨 รถยนต์ ${licensePlate} ถูกรายงานปัญหาหลังการใช้งาน: "${report.issuesFound}". ระบบได้ปรับสถานะรถยนต์เป็น "ซ่อมบำรุง (Maintenance)" โดยอัตโนมัติ แจ้งเตือนไปยัง นายเสกพล ดิษฐโชติ (หัวหน้าฝ่ายบริหารทั่วไป) เพื่อโปรดพิจารณาอนุมัติส่งซ่อมบำรุง`,
        recipientRole: "หัวหน้าฝ่ายบริหารทั่วไป",
        recipientName: "นายเสกพล ดิษฐโชติ",
        channel: "line_notify",
        status: "delivered",
      };
      notifs.push(maintenanceAlertNotif);
    }

    // 1. Update Booking status to completed and attach report & notifs
    const updatedBookings = bookings.map((b) => {
      if (b.id !== bookingId) return b;
      return {
        ...b,
        status: "completed" as BookingStatus,
        keyReturned: report.keyReturned ?? true,
        hasIssueReported: hasDefect,
        issueReportDetails: hasDefect ? report.issuesFound : undefined,
        needsMaintenance: hasDefect,
        returnReport: report,
        notifications: [...(b.notifications || []), ...notifs],
      };
    });
    updateAndSaveBookings(updatedBookings);

    // 2. Step 6 & 7: Revert Vehicle Status & Update odometer and fuel level
    // If defect found -> "maintenance", else -> "available" (เคลียร์สถานะพร้อมใช้งาน)
    const nextVehicleStatus: VehicleStatus = hasDefect ? "maintenance" : "available";

    const updatedVehicles = vehicles.map((v) => {
      if (v.id !== vehicleId) return v;
      return {
        ...v,
        mileage: report.endMileage,
        fuelLevel: report.endFuelLevel as FuelLevel,
        status: nextVehicleStatus,
      };
    });
    updateAndSaveVehicles(updatedVehicles);

    recordAuditLog(
      currentUser.name,
      `ส่งคืนรถยนต์ราชการ: ${targetBooking ? targetBooking.requestNo : bookingId}`,
      `ทะเบียน: ${licensePlate} - ไมล์: ${report.endMileage.toLocaleString()} กม. (ระยะวิ่ง ${report.totalDistance.toLocaleString()} กม.) - สถานะรถ: ${nextVehicleStatus} ${hasDefect ? `(แจ้งซ่อม: ${report.issuesFound})` : ""}`,
      hasDefect ? "denied" : "success"
    ).catch(console.warn);

    setSelectedReturnBooking(null);

    if (hasDefect) {
      showToast(
        `⚠️ บันทึกการส่งคืนรถ [${licensePlate}] และรายงานแจ้งซ่อมสำเร็จ! ระบบได้ปรับสถานะเป็น "ซ่อมบำรุง" และส่ง Line Notify ด่วนไปยังหัวหน้าฝ่ายบริหารทั่วไปแล้ว`
      );
    } else {
      showToast(
        `✅ ส่งคืนรถยนต์ราชการ [${licensePlate}] พร้อมส่งกุญแจคืนเรียบร้อย! ระบบคำนวณระยะวิ่งจริง ${report.totalDistance.toLocaleString()} กม. และเคลียร์สถานะเป็น "พร้อมใช้งาน"`
      );
    }
  };

  // Vehicle Management (CRUD)
  const handleSaveVehicle = (savedVehicle: Vehicle) => {
    const exists = vehicles.some((v) => v.id === savedVehicle.id);
    let updatedVehicles: Vehicle[];
    if (exists) {
      updatedVehicles = vehicles.map((v) => (v.id === savedVehicle.id ? savedVehicle : v));
      showToast(`💾 บันทึกการแก้ไขข้อมูลรถ ${savedVehicle.licensePlate} เรียบร้อย`);
    } else {
      updatedVehicles = [savedVehicle, ...vehicles];
      showToast(`➕ เพิ่มรถยนต์ราชการ ${savedVehicle.licensePlate} เข้าสู่ระบบสำเร็จ`);
    }
    updateAndSaveVehicles(updatedVehicles);
    setSelectedManageVehicle(null);
    setIsCreatingVehicle(false);
  };

  const handleDeleteVehicle = (vehicleId: string) => {
    const veh = vehicles.find((v) => v.id === vehicleId);
    if (!veh) return;
    if (
      !confirm(
        `คุณต้องการลบรถยนต์ราชการ "${veh.name} (${veh.licensePlate})" ออกจากระบบหรือไม่?`
      )
    ) {
      return;
    }
    const updatedVehicles = vehicles.filter((v) => v.id !== vehicleId);
    updateAndSaveVehicles(updatedVehicles);
    deleteVehicle(vehicleId).catch(() => {});
    showToast(`ลบข้อมูลรถยนต์ ${veh.licensePlate} เรียบร้อยแล้ว`);
    if (selectedDetailVehicle?.id === vehicleId) {
      setSelectedDetailVehicle(null);
    }
  };

  const handleToggleVehicleStatus = (vehicleId: string, newStatus: VehicleStatus) => {
    const updatedVehicles = vehicles.map((v) => {
      if (v.id !== vehicleId) return v;
      return { ...v, status: newStatus };
    });
    updateAndSaveVehicles(updatedVehicles);
    const statusText =
      newStatus === "available"
        ? "พร้อมใช้งาน"
        : newStatus === "in_use"
        ? "ปฏิบัติภารกิจ"
        : "ส่งซ่อมบำรุง";
    showToast(`อัปเดตสถานะรถยนต์เป็น "${statusText}" เรียบร้อย`);
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case "pending_division_head":
      case "pending_review":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <span>⏳</span>
            <span>รอหน.กลุ่ม/ผู้แทนกลุ่มเห็นชอบ (ขั้น 1/4)</span>
          </span>
        );
      case "pending_fleet_assignment":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <span>🚗</span>
            <span>รอจัดสรรรถ/คนขับ (ขั้น 2/4)</span>
          </span>
        );
      case "pending_admin_head":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <span>👔</span>
            <span>รอหน.ฝ่ายบริหารเห็นชอบ (ขั้น 3/4)</span>
          </span>
        );
      case "pending_provincial":
      case "endorsed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <span>👑</span>
            <span>รอ พมจ. อนุมัติ (ขั้น 4/4)</span>
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span>✓</span>
            <span>อนุมัติแล้ว (พร้อมเดินทาง)</span>
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <span>✕</span>
            <span>ไม่อนุมัติ / ส่งกลับ</span>
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-200">
            <span>✅</span>
            <span>ส่งคืนรถแล้ว (สมบูรณ์)</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getFuelPercent = (level?: string) => {
    if (!level) return 100;
    if (level.includes("100%")) return 100;
    if (level.includes("75%")) return 75;
    if (level.includes("50%")) return 50;
    if (level.includes("25%")) return 25;
    return 10;
  };

  const canManageFleet = currentUser.role === "admin" || currentUser.role === "manager";

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950 to-teal-900 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold backdrop-blur-md border border-teal-500/30">
              <span>🏛️</span>
              <span>ระบบบริหารยานพาหนะและการเดินทางราชการ (Government Fleet Dispatch)</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black font-heading tracking-tight text-white">
              ระบบจองรถยนต์ราชการ พมจ.กำแพงเพชร
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl font-light">
              กระบวนการขอใช้รถ 3 ขั้นตอน (ผู้ขอจอง + ระบุค่าน้ำมัน ➔ หน.ฝ่ายเห็นชอบ ➔ พมจ. อนุมัติ ➔ ระบบ Notify
              อัตโนมัติ) และระบบแจ้งเตือนการคืนรถ บันทึกไมล์/เกจน้ำมัน และคืนสถานะรถ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {canManageFleet && (
              <button
                type="button"
                onClick={() => {
                  setSelectedManageVehicle(null);
                  setIsCreatingVehicle(true);
                }}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 backdrop-blur-xs"
              >
                <span>⚙️</span>
                <span>จัดการข้อมูลรถ</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab("new_request")}
              className="px-5 py-2.5 bg-[#0D9488] hover:bg-[#0b7a6f] text-white rounded-xl text-xs font-bold shadow-md shadow-teal-900/40 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>➕</span>
              <span>ยื่นคำขอจองรถยนต์ใหม่</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── URGENT RETURN ALERT BANNER (Item 2: ระบบแจ้งเตือนการคืนรถ) ─── */}
      {activeReturnDueBookings.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-2 border-amber-400/80 rounded-3xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-bold animate-pulse">
                🔔
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  ระบบแจ้งเตือนการคืนรถยนต์ราชการ (Active Return Due Monitor)
                </h3>
                <p className="text-xs text-slate-600">
                  มีรถยนต์ราชการที่ได้รับอนุมัติปฏิบัติภารกิจ ({activeReturnDueBookings.length} คัน)
                  เมื่อเสร็จสิ้นภารกิจกรุณารายงานการคืนรถ บันทึกเลขไมล์ เกจน้ำมัน เพื่อคืนสถานะรถ
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg">
              {activeReturnDueBookings.length} ภารกิจรอส่งคืน
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {activeReturnDueBookings.map((dueBooking) => (
              <div
                key={dueBooking.id}
                className="p-3 bg-white border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-amber-50 text-amber-800 rounded">
                      {dueBooking.requestNo}
                    </span>
                    <strong className="text-xs text-slate-900">{dueBooking.vehicleName}</strong>
                    <span className="text-xs font-mono text-teal-800 font-bold">
                      [{dueBooking.licensePlate}]
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3">
                    <span>ผู้ขอ: <strong>{dueBooking.requesterName}</strong></span>
                    <span>•</span>
                    <span>กำหนดกลับ: {dueBooking.returnTime.replace("T", " ")}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleSendReturnReminder(dueBooking)}
                    className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    title="ส่ง Line Notify แจ้งเตือนผู้ขอใช้รถ"
                  >
                    <span>📲</span>
                    <span>ส่งเตือน Line</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedReturnBooking(dueBooking)}
                    className="px-3 py-1.5 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span>🔄</span>
                    <span>รายงานคืนรถ</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center text-xl shrink-0 font-bold">
            🚗
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">ยานพาหนะราชการ</div>
            <div className="text-xl font-bold font-heading text-slate-900 mt-0.5">
              {stats.totalVehicles}{" "}
              <span className="text-xs text-slate-400 font-normal">
                คัน (พร้อมใช้ {stats.availableVehicles})
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-xl shrink-0 font-bold">
            ⏳
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">รอหัวหน้าฝ่ายตรวจสอบ</div>
            <div className="text-xl font-bold font-heading text-amber-700 mt-0.5">
              {stats.pendingReviewCount}{" "}
              <span className="text-xs text-slate-400 font-normal">คำขอ</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-xl shrink-0 font-bold">
            📋
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">รอ พมจ. อนุมัติ</div>
            <div className="text-xl font-bold font-heading text-blue-700 mt-0.5">
              {stats.endorsedCount}{" "}
              <span className="text-xs text-slate-400 font-normal">คำขอ</span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-xl shrink-0 font-bold">
            ✅
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">อนุมัติ & ส่งคืนแล้ว</div>
            <div className="text-xl font-bold font-heading text-emerald-700 mt-0.5">
              {stats.approvedCount + stats.completedCount}{" "}
              <span className="text-xs text-slate-400 font-normal">
                ภารกิจ (ส่งคืน {stats.completedCount})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("requests")}
          className={`pb-3.5 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === "requests"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>📋</span>
          <span>ทะเบียนคำขอจองรถ & รายงานคืน ({bookings.length})</span>
          {stats.pendingReviewCount + stats.endorsedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
              {stats.pendingReviewCount + stats.endorsedCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("timeline")}
          className={`pb-3.5 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === "timeline"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>📅</span>
          <span>ตารางไทม์ไลน์ภารกิจ (Gantt View)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("fleet")}
          className={`pb-3.5 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === "fleet"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>🚗</span>
          <span>ยานพาหนะราชการ & จัดการข้อมูล ({vehicles.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("new_request")}
          className={`pb-3.5 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === "new_request"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>➕</span>
          <span>ยื่นคำขอใหม่ (พร้อมค่าน้ำมัน)</span>
        </button>
      </div>

      {/* ─── TAB: FLEET GANTT TIMELINE ─── */}
      {activeTab === "timeline" && (
        <FleetGanttView
          vehicles={vehicles}
          bookings={bookings}
          onSelectBooking={(b) => setSelectedDocBooking(b)}
          onRequestVehicle={(vehId, initialDate) => {
            setFormVehicleId(vehId);
            if (initialDate) {
              const dt = initialDate.includes("T") ? initialDate : `${initialDate}T08:30`;
              setFormDepartureTime(dt);
              const depDate = new Date(dt);
              depDate.setHours(depDate.getHours() + 8);
              const retY = depDate.getFullYear();
              const retM = String(depDate.getMonth() + 1).padStart(2, "0");
              const retD = String(depDate.getDate()).padStart(2, "0");
              const retH = String(depDate.getHours()).padStart(2, "0");
              const retMin = String(depDate.getMinutes()).padStart(2, "0");
              setFormReturnTime(`${retY}-${retM}-${retD}T${retH}:${retMin}`);
            }
            setActiveTab("new_request");
          }}
        />
      )}

      {/* ─── TAB 1: FLEET OVERVIEW & MANAGEMENT ─── */}
      {activeTab === "fleet" && (
        <div className="space-y-5">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
            <div>
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span>🚘</span>
                <span>บัญชียานพาหนะและรถยนต์ราชการส่วนกลาง ({vehicles.length} คัน)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ตรวจสอบสถานะความพร้อม เลขไมล์สะสม เกจระดับน้ำมัน และเข้าดูแฟ้มประวัติรถแต่ละคัน
              </p>
            </div>

            {canManageFleet && (
              <button
                type="button"
                onClick={() => {
                  setSelectedManageVehicle(null);
                  setIsCreatingVehicle(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <span>➕</span>
                <span>เพิ่มรถยนต์ราชการใหม่</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {vehicles.map((car) => {
              return (
                <div
                  key={car.id}
                  className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between hover:border-teal-200 hover:shadow-md transition-all group"
                >
                  <div>
                    {/* Vehicle Photo Banner */}
                    <div className="relative h-44 w-full bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 overflow-hidden">
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
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 pointer-events-none" />

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
                        <span className="px-3 py-1 bg-white/95 backdrop-blur-md border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 shadow-sm">
                          {car.licensePlate}
                        </span>
                        <span className="text-[11px] font-medium text-slate-200 bg-black/60 backdrop-blur-sm px-2.5 py-0.5 rounded-lg border border-white/10">
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

                      {/* Specs info */}
                      <div className="text-xs text-slate-600 space-y-1.5 pt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">คนขับประจำ:</span>
                          <span className="font-medium text-teal-700 truncate max-w-[170px]">
                            {car.driverName || "พนักงานขับรถเวร"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">ฝ่ายผู้ดูแล:</span>
                          <span className="font-medium text-slate-700 truncate max-w-[170px]">
                            {car.assignedDivision || "ฝ่ายบริหารทั่วไป"}
                          </span>
                        </div>
                      </div>

                    {/* Features list */}
                    <div className="pt-1 flex flex-wrap gap-1">
                      {car.features.slice(0, 3).map((feat, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-medium"
                        >
                          {feat}
                        </span>
                      ))}
                      {car.features.length > 3 && (
                        <span className="text-[10px] px-1.5 py-0.5 text-slate-400">
                          +{car.features.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                  {/* Card Actions */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedDetailVehicle(car)}
                        className="py-2 px-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        <span>🔍</span>
                        <span>ดูแฟ้มประวัติ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFormVehicleId(car.id);
                          setActiveTab("new_request");
                        }}
                        disabled={car.status === "maintenance"}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 ${
                          car.status === "maintenance"
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                            : "bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 cursor-pointer"
                        }`}
                      >
                        <span>➕</span>
                        <span>จองคันนี้</span>
                      </button>
                    </div>

                    {/* Admin/Manager Edit Actions */}
                    {canManageFleet && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedManageVehicle(car);
                            setIsCreatingVehicle(false);
                          }}
                          className="text-teal-700 hover:text-teal-900 font-bold transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>✏️</span>
                          <span>แก้ไขข้อมูล</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteVehicle(car.id)}
                          className="text-rose-600 hover:text-rose-800 font-medium transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>🗑️</span>
                          <span>ลบ</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 2: BOOKING REGISTRY & RETURN WORKFLOW ─── */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "all", label: "ทั้งหมด" },
                { id: "pending", label: "รอพิจารณา (ขั้นตอน 1-4)" },
                { id: "approved", label: "อนุมัติแล้ว" },
                { id: "completed", label: "ส่งคืนแล้ว" },
                { id: "rejected", label: "ไม่อนุมัติ" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
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

            <div className="relative min-w-[260px]">
              <input
                type="text"
                placeholder="ค้นหาเลขที่คำขอ, ผู้ขอ, ปลายทาง..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-teal-500 transition-colors"
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
            </div>
          </div>

          {/* Bookings List */}
          {filteredBookings.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80">
              <span className="text-4xl">🚗</span>
              <h3 className="font-bold text-slate-800 text-base mt-2">ไม่พบรายการคำขอจองรถ</h3>
              <p className="text-xs text-slate-400 mt-1">
                ยังไม่มีคำขอที่ตรงกับเงื่อนไขการค้นหาในขณะนี้
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((b) => {
                const isMyBooking = b.requesterId === currentUser.id;
                const canReportReturn =
                  b.status === "approved" &&
                  (isMyBooking || currentUser.role === "admin" || currentUser.role === "manager");

                // Step 1: หัวหน้ากลุ่มหรือข้าราชการในกลุ่มเห็นชอบ
                const canReviewStage1 =
                  (b.status === "pending_division_head" || b.status === "pending_review") &&
                  (currentUser.role === "admin" ||
                    currentUser.role === "manager" ||
                    currentUser.id === b.divisionReviewerId ||
                    currentUser.division === b.requesterDivision);

                // Step 2: เจ้าหน้าที่ฝ่ายบริหารจัดสรรรถและคนขับ
                const canReviewStage2 =
                  b.status === "pending_fleet_assignment" &&
                  (currentUser.role === "admin" ||
                    currentUser.role === "manager" ||
                    currentUser.id === b.fleetDispatcherId ||
                    currentUser.division?.includes("ฝ่ายบริหารทั่วไป"));

                // Step 3: หัวหน้าฝ่ายบริหารเห็นชอบ
                const canReviewStage3 =
                  b.status === "pending_admin_head" &&
                  (currentUser.role === "admin" ||
                    currentUser.role === "manager" ||
                    currentUser.division?.includes("ฝ่ายบริหารทั่วไป"));

                // Step 4: พมจ. พิจารณาอนุมัติ
                const canReviewStage4 =
                  (b.status === "pending_provincial" || b.status === "endorsed") &&
                  currentUser.role === "admin";

                return (
                  <div
                    key={b.id}
                    className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all space-y-4"
                  >
                    {/* Top Row: Request Number, Car, Status & Notify Button */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-xl bg-teal-50 text-teal-800 font-mono font-bold text-xs border border-teal-200/70">
                          {b.requestNo}
                        </span>
                        <div>
                          <span className="font-bold text-slate-900 text-sm">{b.vehicleName || "รอฝ่ายบริหารจัดสรร"}</span>
                          {b.licensePlate && b.licensePlate !== "-" ? (
                            <span className="ml-2 text-xs font-mono text-slate-500">
                              [{b.licensePlate}]
                            </span>
                          ) : (
                            <span className="ml-2 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              รอจัดสรรรถ
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Notify History button */}
                        <button
                          type="button"
                          onClick={() => setSelectedNotifBooking(b)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                          title="ดูประวัติการแจ้งเตือน Line Notify"
                        >
                          <span>📲</span>
                          <span>Notify ({b.notifications?.length || 0})</span>
                        </button>

                        {getStatusBadge(b.status)}
                        <span className="text-xs text-slate-400 font-mono">ยื่นเมื่อ {b.createdAt}</span>
                      </div>
                    </div>

                    {/* Middle: Mission & Destination */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="md:col-span-2 space-y-2">
                        <div>
                          <span className="text-slate-400 font-medium">วัตถุประสงค์:</span>
                          <p className="font-semibold text-slate-900 text-sm mt-0.5">{b.purpose}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600">
                          <div>
                            <span className="text-slate-400">ปลายทาง:</span>{" "}
                            <strong className="text-slate-800">{b.destination}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">ผู้โดยสาร:</span>{" "}
                            <strong className="text-slate-800">{b.passengerCount} คน</strong>
                          </div>
                          <div>
                            <span className="text-slate-400">คนขับ:</span>{" "}
                            <strong className="text-teal-700">
                              {b.assignedDriver || (b.requireDriver ? "รอจัดสรร" : "ขับเอง")}
                            </strong>
                          </div>
                        </div>

                        {/* Fuel Budget Highlight if requested */}
                        {b.fuelBudgetRequested && (
                          <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-900 flex flex-wrap items-center justify-between gap-1.5">
                            <span className="flex items-center gap-1.5 font-bold">
                              <span>⛽</span>
                              <span>ของบประมาณค่าน้ำมัน: {b.fuelBudgetAmount?.toLocaleString()} บาท</span>
                            </span>
                            <span className="text-[11px] text-amber-800">
                              แหล่งงบ: {b.fuelBudgetSource || "งบดำเนินงานสำนักงาน"}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-1.5">
                        <div>
                          <span className="text-slate-400">ผู้ขอใช้รถ:</span>
                          <div className="font-bold text-slate-900">{b.requesterName}</div>
                          <div className="text-[11px] text-slate-500">{b.requesterPosition}</div>
                        </div>
                        <div className="pt-1 text-[11px] text-teal-800 font-mono">
                          {b.departureTime.replace("T", " ")} ถึง {b.returnTime.split("T")[1]} น.
                        </div>
                      </div>
                    </div>

                    {/* Return Report Highlight (if completed) */}
                    {b.returnReport && (
                      <div className="p-3.5 bg-teal-50/70 rounded-2xl border border-teal-200/80 text-xs text-slate-700 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-teal-950">
                          <span className="flex items-center gap-1.5">
                            <span>📋</span>
                            <span>
                              บันทึกผลการใช้และส่งคืนรถ ({b.returnReport.returnedAt})
                            </span>
                          </span>
                          <span className="font-mono bg-teal-200/70 text-teal-900 px-2.5 py-0.5 rounded-lg text-xs">
                            ระยะทางวิ่งจริง: {b.returnReport.totalDistance.toLocaleString()} กม.
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1.5 border-t border-teal-200/50">
                          <div>
                            <span className="text-slate-500">เลขไมล์: </span>
                            <span className="font-mono font-bold text-slate-800">
                              {b.returnReport.startMileage.toLocaleString()} ➜{" "}
                              {b.returnReport.endMileage.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">เกจคืน: </span>
                            <span className="font-semibold text-teal-800">
                              {b.returnReport.endFuelLevel}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">สภาพรถ: </span>
                            <span className="text-slate-800">
                              {b.returnReport.vehicleCleanliness} / {b.returnReport.bodyCondition}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">ผู้ตรวจรับ: </span>
                            <span className="font-semibold text-slate-800">
                              {b.returnReport.inspectorName}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 5-Stage Workflow Progress Indicator */}
                    <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-200/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                      {/* Step 1: ยื่นคำขอ */}
                      <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                          ✓
                        </span>
                        <span>1. ยื่นคำขอ ({b.requesterName.split(" ")[0]})</span>
                      </div>

                      <span className="text-slate-300 hidden md:inline">→</span>

                      {/* Step 2: หน.กลุ่ม/ผู้แทนกลุ่มเห็นชอบ */}
                      <div
                        className={`flex items-center gap-1.5 font-semibold ${
                          b.status !== "pending_division_head" && b.status !== "pending_review" && b.status !== "rejected"
                            ? "text-emerald-700"
                            : b.status === "pending_division_head" || b.status === "pending_review"
                            ? "text-amber-700"
                            : "text-slate-400"
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            b.status !== "pending_division_head" && b.status !== "pending_review" && b.status !== "rejected"
                              ? "bg-emerald-100 text-emerald-700"
                              : b.status === "pending_division_head" || b.status === "pending_review"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {b.status !== "pending_division_head" && b.status !== "pending_review" && b.status !== "rejected" ? "✓" : "2"}
                        </span>
                        <span>
                          2. หน.กลุ่มเห็นชอบ {b.divisionReviewerName ? `(${b.divisionReviewerName.split(" ")[0]})` : ""}
                        </span>
                      </div>

                      <span className="text-slate-300 hidden md:inline">→</span>

                      {/* Step 3: จัดสรรรถและคนขับ */}
                      <div
                        className={`flex items-center gap-1.5 font-semibold ${
                          b.status === "pending_admin_head" || b.status === "pending_provincial" || b.status === "endorsed" || b.status === "approved" || b.status === "completed"
                            ? "text-emerald-700"
                            : b.status === "pending_fleet_assignment"
                            ? "text-blue-700"
                            : "text-slate-400"
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            b.status === "pending_admin_head" || b.status === "pending_provincial" || b.status === "endorsed" || b.status === "approved" || b.status === "completed"
                              ? "bg-emerald-100 text-emerald-700"
                              : b.status === "pending_fleet_assignment"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {b.status === "pending_admin_head" || b.status === "pending_provincial" || b.status === "endorsed" || b.status === "approved" || b.status === "completed" ? "✓" : "3"}
                        </span>
                        <span>
                          3. จัดสรรรถ/คนขับ {b.assignedDriver ? `(${b.assignedDriver.split(" ")[0]})` : ""}
                        </span>
                      </div>

                      <span className="text-slate-300 hidden md:inline">→</span>

                      {/* Step 4: หน.ฝ่ายบริหารเห็นชอบ */}
                      <div
                        className={`flex items-center gap-1.5 font-semibold ${
                          b.status === "pending_provincial" || b.status === "endorsed" || b.status === "approved" || b.status === "completed"
                            ? "text-emerald-700"
                            : b.status === "pending_admin_head"
                            ? "text-indigo-700"
                            : "text-slate-400"
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            b.status === "pending_provincial" || b.status === "endorsed" || b.status === "approved" || b.status === "completed"
                              ? "bg-emerald-100 text-emerald-700"
                              : b.status === "pending_admin_head"
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {b.status === "pending_provincial" || b.status === "endorsed" || b.status === "approved" || b.status === "completed" ? "✓" : "4"}
                        </span>
                        <span>4. หน.ฝ่ายบริหารเห็นชอบ</span>
                      </div>

                      <span className="text-slate-300 hidden md:inline">→</span>

                      {/* Step 5: พมจ. อนุมัติ */}
                      <div
                        className={`flex items-center gap-1.5 font-semibold ${
                          b.status === "approved" || b.status === "completed"
                            ? "text-emerald-700"
                            : b.status === "pending_provincial" || b.status === "endorsed"
                            ? "text-purple-700"
                            : "text-slate-400"
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            b.status === "approved" || b.status === "completed"
                              ? "bg-emerald-100 text-emerald-700"
                              : b.status === "pending_provincial" || b.status === "endorsed"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {b.status === "approved" || b.status === "completed" ? "✓" : "5"}
                        </span>
                        <span>5. พมจ. อนุมัติ & Notify</span>
                      </div>

                      <span className="text-slate-300 hidden md:inline">→</span>

                      {/* Step 6: ส่งคืนและตรวจรับ */}
                      <div
                        className={`flex items-center gap-1.5 font-semibold ${
                          b.status === "completed"
                            ? "text-teal-700"
                            : "text-slate-400"
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            b.status === "completed"
                              ? "bg-teal-100 text-teal-800"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {b.status === "completed" ? "✓" : "6"}
                        </span>
                        <span>6. ส่งกุญแจคืน & ตรวจรับ</span>
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* View Official Document */}
                        <button
                          type="button"
                          onClick={() => setSelectedDocBooking(b)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          <span>📄</span>
                          <span>แบบขออนุญาตใช้รถ (พิมพ์/PDF)</span>
                        </button>

                        {/* Paperless Dispatch QR Code (Direct scan button) */}
                        {b.status === "approved" && (
                          <PaperlessDispatchQRCode
                            booking={b}
                            size={32}
                            showDetails={false}
                            className="p-1 rounded-xl border-emerald-300 hover:border-emerald-500 bg-white shadow-2xs"
                          />
                        )}

                        {/* View Return Report Document if completed */}
                        {b.returnReport && (
                          <button
                            type="button"
                            onClick={() => setSelectedReturnDocBooking(b)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            <span>📋</span>
                            <span>ใบรายงานส่งคืน (พิมพ์/PDF)</span>
                          </button>
                        )}

                        {/* Requester cancel option if pending */}
                        {isMyBooking && (b.status === "pending_division_head" || b.status === "pending_review" || b.status === "pending_fleet_assignment") && (
                          <button
                            type="button"
                            onClick={() => handleCancelBooking(b)}
                            className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            ยกเลิกคำขอ
                          </button>
                        )}
                      </div>

                      {/* Role Workflow Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Send Return Reminder button if approved */}
                        {b.status === "approved" && (
                          <button
                            type="button"
                            onClick={() => handleSendReturnReminder(b)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          >
                            <span>🔔</span>
                            <span>ส่งเตือนคืนรถ (Notify)</span>
                          </button>
                        )}

                        {/* Return Vehicle Button */}
                        {canReportReturn && (
                          <button
                            type="button"
                            onClick={() => setSelectedReturnBooking(b)}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            <span>🔄</span>
                            <span>รายงานส่งคืนรถ (บันทึกไมล์/น้ำมัน/กุญแจ)</span>
                          </button>
                        )}

                        {/* Stage 1 Review */}
                        {canReviewStage1 && (
                          <button
                            type="button"
                            onClick={() => setSelectedReviewBooking(b)}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            <span>👔</span>
                            <span>พิจารณาเห็นชอบ (ขั้น 1/4)</span>
                          </button>
                        )}

                        {/* Stage 2 Review: Fleet & Driver Assignment */}
                        {canReviewStage2 && (
                          <button
                            type="button"
                            onClick={() => setSelectedReviewBooking(b)}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            <span>🚗</span>
                            <span>จัดสรรรถและคนขับ (ขั้น 2/4)</span>
                          </button>
                        )}

                        {/* Stage 3 Review: Head of Admin Endorsement */}
                        {canReviewStage3 && (
                          <button
                            type="button"
                            onClick={() => setSelectedReviewBooking(b)}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            <span>👔</span>
                            <span>หน.ฝ่ายบริหารเห็นชอบ (ขั้น 3/4)</span>
                          </button>
                        )}

                        {/* Stage 4 Review: Provincial Approval */}
                        {canReviewStage4 && (
                          <button
                            type="button"
                            onClick={() => setSelectedReviewBooking(b)}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            <span>👑</span>
                            <span>พิจารณาอนุมัติ (พมจ.)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: NEW REQUEST FORM (Item 1: ขอใช้รถ + ระบุค่าน้ำมัน) ─── */}
      {activeTab === "new_request" && (
        <div className="p-6 md:p-8 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold font-heading text-slate-900">
                แบบขออนุญาตใช้รถยนต์ส่วนกลาง (พร้อมระบุงบประมาณค่าน้ำมัน)
              </h2>
              <p className="text-xs text-slate-500">
                กรอกรายละเอียดการเดินทางเพื่อเสนอต่อหัวหน้าฝ่ายบริหารทั่วไปและ พมจ.กำแพงเพชร
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-teal-50 text-teal-800 font-mono font-bold">
              แบบ พมจ.กพ 02
            </span>
          </div>

          <form onSubmit={handleCreateBooking} className="space-y-6">
            {/* Requester Information (Read-only / Autofilled) */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                ข้อมูลผู้ยื่นคำขอ
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400">ชื่อ-นามสกุล:</span>
                  <div className="font-bold text-slate-800 mt-0.5">{currentUser.name}</div>
                </div>
                <div>
                  <span className="text-slate-400">ตำแหน่ง:</span>
                  <div className="font-medium text-slate-800 mt-0.5">{currentUser.position}</div>
                </div>
                <div>
                  <span className="text-slate-400">กลุ่ม/ฝ่าย:</span>
                  <div className="font-medium text-slate-800 mt-0.5">{currentUser.division}</div>
                </div>
                <div>
                  <span className="text-slate-400">เบอร์โทรศัพท์:</span>
                  <div className="font-mono text-slate-800 mt-0.5">{currentUser.phone}</div>
                </div>
              </div>
            </div>

            {/* ─── Workflow Step 1 & 2 Routing Selection ─── */}
            <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-200/80 space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  1
                </span>
                <h3 className="text-xs font-bold text-teal-950 uppercase tracking-wide">
                  ขั้นตอนที่ 1: เสนอผู้พิจารณาให้ความเห็นชอบชั้นต้น (ในกลุ่ม/ฝ่ายตนเอง)
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Radio 1: หัวหน้ากลุ่ม/ฝ่ายที่สังกัด */}
                <label
                  className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    formReviewerType === "head"
                      ? "bg-white border-teal-500 ring-2 ring-teal-500/20 shadow-xs"
                      : "bg-teal-50/40 border-teal-200/60 hover:bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="reviewerType"
                    checked={formReviewerType === "head"}
                    onChange={() => setFormReviewerType("head")}
                    className="mt-0.5 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900">
                      หัวหน้ากลุ่ม/ฝ่ายที่สังกัด
                    </div>
                    <div className="text-teal-800 font-medium">
                      {detectedDivisionHead?.name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {detectedDivisionHead?.position}
                    </div>
                  </div>
                </label>

                {/* Radio 2: เลือกจากข้าราชการในกลุ่มตนเอง */}
                <label
                  className={`p-3.5 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all ${
                    formReviewerType === "official"
                      ? "bg-white border-teal-500 ring-2 ring-teal-500/20 shadow-xs"
                      : "bg-teal-50/40 border-teal-200/60 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="reviewerType"
                      checked={formReviewerType === "official"}
                      onChange={() => setFormReviewerType("official")}
                      className="mt-0.5 text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900">
                        เลือกจากข้าราชการในกลุ่มตนเอง
                      </div>
                      <div className="text-[11px] text-slate-500">
                        (กรณีหัวหน้ากลุ่มติดราชการ หรือมอบหมายข้าราชการพิจารณาแทน)
                      </div>
                    </div>
                  </div>

                  {formReviewerType === "official" && (
                    <div className="mt-1 pl-6">
                      <select
                        value={formSelectedReviewerId}
                        onChange={(e) => setFormSelectedReviewerId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-teal-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">-- เลือกข้าราชการในกลุ่ม --</option>
                        {divisionOfficials.map((off) => (
                          <option key={off.id} value={off.id}>
                            {off.name} ({off.position})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </label>
              </div>

              {/* Step 2 Dispatcher selection */}
              <div className="pt-2 border-t border-teal-200/60 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                    2
                  </span>
                  <label className="text-xs font-bold text-slate-800">
                    เจ้าหน้าที่ฝ่ายบริหารทั่วไป ผู้รับผิดชอบจัดสรรรถ/คนขับ (เมื่อผ่านความเห็นชอบ):
                  </label>
                </div>
                <select
                  value={formDispatcherId}
                  onChange={(e) => setFormDispatcherId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-teal-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                >
                  {fleetDispatchers.map((disp) => (
                    <option key={disp.id} value={disp.id}>
                      {disp.name} - {disp.position}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Vehicle Allocation Policy Banner (ผู้ขอใช้รถไม่สามารถเลือกรถเองได้) */}
            <div className="p-4 bg-gradient-to-r from-teal-50/80 via-blue-50/60 to-indigo-50/40 rounded-2xl border border-teal-200/80 space-y-2.5">
              <div className="flex items-start gap-3">
                <span className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center text-xl shadow-xs shrink-0 mt-0.5">
                  🚙
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs text-slate-900 font-heading">
                      การจัดสรรยานพาหนะส่วนกลาง
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                      ฝ่ายบริหารจัดสรรให้
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed mt-1">
                    ตามระเบียบการใช้รถยนต์ส่วนกลาง ผู้ขอใช้รถไม่ต้องเลือกรถยนต์เอง — <strong>เจ้าหน้าที่ฝ่ายบริหารทั่วไป (งานยานพาหนะ)</strong> จะเป็นผู้ตรวจสอบสถานะความพร้อมและจัดสรรรถยนต์และพนักงานขับรถที่เหมาะสมและว่างให้ในขั้นตอนที่ 2
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-teal-100 text-[11px] text-teal-800">
                <span className="flex items-center gap-1.5 font-medium">
                  <span>ℹ️</span>
                  <span>ยานพาหนะราชการส่วนกลางทั้งหมด: {vehicles.length} คัน (สถานะพร้อมใช้งาน {vehicles.filter(v => v.status === "available").length} คัน)</span>
                </span>
                <span className="text-[10px] bg-white px-2.5 py-0.5 rounded-lg border border-teal-200 font-bold text-teal-700 shadow-2xs">
                  ตรวจสอบสถานะว่างอัตโนมัติ
                </span>
              </div>
            </div>

            {/* Mission Purpose & Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  วัตถุประสงค์ในการขอใช้รถราชการ <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="เช่น ลงพื้นที่ตรวจเยี่ยมและประเมินสภาพครอบครัวเปราะบาง เพื่อพิจารณาเงินสงเคราะห์ฯ"
                  value={formPurpose}
                  onChange={(e) => setFormPurpose(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    สถานที่ต้นทาง
                  </label>
                  <input
                    type="text"
                    value={formOrigin}
                    onChange={(e) => setFormOrigin(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-teal-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    สถานที่ปลายทาง / พื้นที่ปฏิบัติงาน <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ตำบลคลองลานพัฒนา อำเภอคลองลาน จังหวัดกำแพงเพชร"
                    value={formDestination}
                    onChange={(e) => setFormDestination(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-teal-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    วันและเวลาออกเดินทาง <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formDepartureTime}
                    onChange={(e) => setFormDepartureTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-teal-500 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    วันและเวลากลับถึงสำนักงาน <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formReturnTime}
                    onChange={(e) => setFormReturnTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-teal-500 transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    จำนวนผู้โดยสารทั้งหมด (คน)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={formPassengerCount}
                    onChange={(e) => setFormPassengerCount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-teal-500 transition-colors"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    (รวมผู้ขอใช้รถและผู้ร่วมเดินทาง)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ระยะทางโดยประมาณ (กม.)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formEstimatedDistance}
                    onChange={(e) => setFormEstimatedDistance(Number(e.target.value))}
                    placeholder="เช่น 150"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-teal-500 transition-colors"
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      รายชื่อผู้ร่วมเดินทาง (เลือกจากทำเนียบเจ้าหน้าที่ พมจ.)
                    </label>
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                      เลือกแล้ว {selectedPassengers.length} ท่าน
                    </span>
                  </div>

                  {/* DropDown List from All Members */}
                  <select
                    value=""
                    onChange={(e) => handleAddPassenger(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-teal-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500 shadow-2xs font-medium"
                  >
                    <option value="">-- คลิกเพื่อเลือกเจ้าหน้าที่เป็นผู้ร่วมเดินทาง ({members.length} ท่าน) --</option>
                    {members
                      .filter((m) => m.id !== currentUser?.id)
                      .map((m) => {
                        const isAdded = selectedPassengers.some((p) => p.id === m.id);
                        return (
                          <option key={m.id} value={m.id} disabled={isAdded}>
                            {isAdded ? "✓ (เลือกแล้ว) " : "+ "}{m.name} ({m.division || m.position})
                          </option>
                        );
                      })}
                  </select>

                  {/* Selected Passenger Tags / Badges */}
                  {selectedPassengers.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 p-2.5 bg-teal-50/70 rounded-xl border border-teal-200 max-h-32 overflow-y-auto">
                      {selectedPassengers.map((p) => (
                        <span
                          key={p.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-teal-200 text-teal-950 rounded-lg text-xs font-medium shadow-2xs"
                        >
                          <span>👤 {p.name}</span>
                          <span className="text-[10px] text-teal-600 font-normal">
                            ({p.division || p.position})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemovePassenger(p.id)}
                            className="text-slate-400 hover:text-rose-600 font-bold ml-1 cursor-pointer text-xs"
                            title="ลบออก"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      * เลือกรายชื่อเจ้าหน้าที่จาก DropDown List ด้านบน หรือหากเดินทางคนเดียวไม่ต้องเลือก
                    </p>
                  )}

                  {selectedPassengers.length > 0 && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPassengers([]);
                          setFormPassengersList("");
                          setFormPassengerCount(1);
                        }}
                        className="text-rose-600 hover:underline text-[11px] font-semibold cursor-pointer"
                      >
                        ล้างรายชื่อผู้ร่วมเดินทางทั้งหมด
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Driver Requirement toggle */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-slate-800">
                  ต้องการพนักงานขับรถยนต์ราชการ
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  หากไม่ต้องการ เจ้าหน้าที่ผู้ขอใช้รถจะต้องเป็นผู้มีใบขับขี่และรับผิดชอบการขับขี่เอง
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formRequireDriver}
                  onChange={(e) => setFormRequireDriver(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0D9488]"></div>
              </label>
            </div>

            {/* Fuel Budget Request Section (Item 1 requirement) */}
            <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-teal-950 flex items-center gap-1.5">
                    <span>⛽</span>
                    <span>ขอรับการสนับสนุนงบประมาณค่าน้ำมันเชื้อเพลิง (ถ้ามี)</span>
                  </span>
                  <p className="text-[11px] text-teal-800/80 mt-0.5">
                    ระบุจำนวนเงินและโครงการงบประมาณ หากต้องการขออนุมัติเบิกจ่ายค่าน้ำมันสำหรับภารกิจนี้
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formFuelBudgetRequested}
                    onChange={(e) => setFormFuelBudgetRequested(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0D9488]"></div>
                </label>
              </div>

              {formFuelBudgetRequested && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-teal-200/60 text-xs">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      จำนวนเงินงบประมาณค่าน้ำมัน (บาท) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={100}
                      step={50}
                      required={formFuelBudgetRequested}
                      value={formFuelBudgetAmount}
                      onChange={(e) => setFormFuelBudgetAmount(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-white border border-teal-300 rounded-xl text-xs font-mono font-bold text-teal-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                      placeholder="เช่น 1,500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ระบุโครงการ / แหล่งงบประมาณที่ขอเบิก <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required={formFuelBudgetRequested}
                      value={formFuelBudgetSource}
                      onChange={(e) => setFormFuelBudgetSource(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-teal-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                      placeholder="เช่น งบดำเนินงานกลุ่มงาน..., โครงการพัฒนาคุณภาพชีวิต..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("requests")}
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#0D9488] hover:bg-[#0b7a6f] text-white rounded-xl text-sm font-bold shadow-md shadow-teal-700/20 transition-colors cursor-pointer flex items-center gap-2"
              >
                <span>✓</span>
                <span>ยืนยันและส่งคำขอใช้รถ (พร้อมส่ง Line Notify)</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── MODAL: Official Document View / Print ─── */}
      {selectedDocBooking && (
        <CarBookingDocumentModal
          booking={selectedDocBooking}
          onClose={() => setSelectedDocBooking(null)}
        />
      )}

      {/* ─── MODAL: Official Return Report View / Print ─── */}
      {selectedReturnDocBooking && (
        <VehicleReturnDocumentModal
          booking={selectedReturnDocBooking}
          onClose={() => setSelectedReturnDocBooking(null)}
        />
      )}

      {/* ─── MODAL: 4-Stage Workflow Review & Approval Modal ─── */}
      {selectedReviewBooking && (
        <ReviewBookingModal
          booking={selectedReviewBooking}
          currentUser={currentUser}
          vehicles={vehicles}
          allBookings={bookings}
          onDivisionEndorse={handleDivisionEndorse}
          onFleetAssign={handleFleetAssign}
          onAdminHeadEndorse={handleAdminHeadEndorse}
          onProvincialApprove={handleProvincialApprove}
          onEndorse={handleEndorse}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setSelectedReviewBooking(null)}
        />
      )}

      {/* ─── MODAL: Return Vehicle Report & Inspection Form ─── */}
      {selectedReturnBooking && (
        <ReturnVehicleModal
          booking={selectedReturnBooking}
          vehicle={
            vehicles.find((v) => v.id === selectedReturnBooking.vehicleId) || vehicles[0]
          }
          currentUser={currentUser}
          inspectors={members && members.length > 0 ? members : [currentUser]}
          onClose={() => setSelectedReturnBooking(null)}
          onSubmitReturn={handleReturnVehicle}
        />
      )}

      {/* ─── MODAL: Add / Edit Vehicle (Fleet CRUD) ─── */}
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

      {/* ─── MODAL: Vehicle Detail & Profile ─── */}
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

      {/* ─── MODAL: Notification Logs & Line Alerts ─── */}
      {selectedNotifBooking && (
        <NotificationLogsModal
          booking={selectedNotifBooking}
          onClose={() => setSelectedNotifBooking(null)}
        />
      )}
    </div>
  );
}
