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
  Role,
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
import { NotificationLogsModal } from "./NotificationLogsModal";
import { RealisticFuelGauge } from "./RealisticFuelGauge";
import { FleetGanttView } from "./FleetGanttView";
import { PaperlessDispatchQRCode } from "./PaperlessDispatchQRCode";
import { sendBrowserNotification } from "@/lib/notifications";

export interface DistrictPreset {
  name: string;
  destination: string;
  roundTripKm: number;
  tag?: string;
}

export const KAMPHAENG_PHET_DISTRICTS: DistrictPreset[] = [
  { name: "อ.เมืองกำแพงเพชร", destination: "อำเภอเมืองกำแพงเพชร จังหวัดกำแพงเพชร", roundTripKm: 35, tag: "ใกล้" },
  { name: "อ.คลองลาน", destination: "อำเภอคลองลาน จังหวัดกำแพงเพชร", roundTripKm: 130, tag: "โซนใต้" },
  { name: "อ.ขาณุวรลักษบุรี", destination: "อำเภอขาณุวรลักษบุรี จังหวัดกำแพงเพชร", roundTripKm: 175, tag: "โซนใต้" },
  { name: "อ.คลองขลุง", destination: "อำเภอคลองขลุง จังหวัดกำแพงเพชร", roundTripKm: 95, tag: "โซนกลาง" },
  { name: "อ.พรานกระต่าย", destination: "อำเภอพรานกระต่าย จังหวัดกำแพงเพชร", roundTripKm: 70, tag: "โซนเหนือ" },
  { name: "อ.ลานกระบือ", destination: "อำเภอลานกระบือ จังหวัดกำแพงเพชร", roundTripKm: 120, tag: "โซนเหนือ" },
  { name: "อ.ไทรงาม", destination: "อำเภอไทรงาม จังหวัดกำแพงเพชร", roundTripKm: 85, tag: "โซนตะวันออก" },
  { name: "อ.ทรายทองวัฒนา", destination: "อำเภอทรายทองวัฒนา จังหวัดกำแพงเพชร", roundTripKm: 110, tag: "โซนตะวันออก" },
  { name: "อ.บึงสามัคคี", destination: "อำเภอบึงสามัคคี จังหวัดกำแพงเพชร", roundTripKm: 165, tag: "โซนตะวันออก" },
  { name: "อ.ปางศิลาทอง", destination: "อำเภอปางศิลาทอง จังหวัดกำแพงเพชร", roundTripKm: 150, tag: "โซนตะวันตก" },
  { name: "อ.โกสัมพีนคร", destination: "อำเภอโกสัมพีนคร จังหวัดกำแพงเพชร", roundTripKm: 85, tag: "โซนตะวันตก" },
  { name: "กระทรวง พม. (กทม.)", destination: "กระทรวงการพัฒนาสังคมและความมั่นคงของมนุษย์ กรุงเทพมหานคร", roundTripKm: 760, tag: "ส่วนกลาง" },
  { name: "จ.พิษณุโลก", destination: "จังหวัดพิษณุโลก (หน่วยงานสังกัด พม.)", roundTripKm: 230, tag: "เขตตรวจราชการ" },
  { name: "จ.นครสวรรค์", destination: "จังหวัดนครสวรรค์ (หน่วยงานสังกัด พม.)", roundTripKm: 240, tag: "เขตตรวจราชการ" },
];

export const FUEL_PROJECT_PRESETS = [
  "งบดำเนินงานสำนักงาน พมจ.กำแพงเพชร",
  "โครงการขับเคลื่อนศูนย์ช่วยเหลือสังคมตำบล",
  "โครงการเงินสงเคราะห์ผู้มีรายได้น้อยและครอบครัวเปราะบาง",
  "โครงการพัฒนาคุณภาพชีวิตกลุ่มเปราะบางรายครัวเรือน",
  "โครงการเสริมสร้างความเข้มแข็งสภาเด็กและเยาวชน",
  "โครงการส่งเสริมสิทธิและพัฒนาศักยภาพคนพิการ",
  "โครงการขับเคลื่อนสมัชชาครอบครัวและสตรี",
];

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
  const [activeTab, setActiveTab] = useState<"requests" | "timeline" | "new_request">("requests");
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => loadStoredVehicles());
  const [bookings, setBookings] = useState<CarBookingRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [selectedDocBooking, setSelectedDocBooking] = useState<CarBookingRequest | null>(null);
  const [selectedReviewBooking, setSelectedReviewBooking] = useState<CarBookingRequest | null>(null);
  const [selectedReturnBooking, setSelectedReturnBooking] = useState<CarBookingRequest | null>(null);
  const [selectedReturnDocBooking, setSelectedReturnDocBooking] = useState<CarBookingRequest | null>(null);
  const [selectedNotifBooking, setSelectedNotifBooking] = useState<CarBookingRequest | null>(null);
  const [isNotificationHubOpen, setIsNotificationHubOpen] = useState<boolean>(false);
  const [expandedNotifBookingId, setExpandedNotifBookingId] = useState<string | null>(null);

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
  const [formSelectedStaffDriverId, setFormSelectedStaffDriverId] = useState<string>(currentUser?.id || "");

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

  // New Fuel Budget State (Item 1 & Template requirement)
  const [formFuelBudgetRequested, setFormFuelBudgetRequested] = useState<boolean>(false);
  const [formFuelBudgetAmount, setFormFuelBudgetAmount] = useState<number>(600);
  const [formFuelBudgetSource, setFormFuelBudgetSource] = useState<string>("งบดำเนินงานสำนักงาน พมจ.กำแพงเพชร");
  const [formFuelProjectName, setFormFuelProjectName] = useState<string>("งบดำเนินงานสำนักงาน พมจ.กำแพงเพชร");
  const [formFuelConsumptionRate, setFormFuelConsumptionRate] = useState<number>(4.0);

  // Live auto-calculation for distance & fuel budget
  const calculatedFuelEstimate = useMemo(() => {
    const dist = Number(formEstimatedDistance) || 0;
    const rate = Number(formFuelConsumptionRate) || 4.0;
    const exact = dist * rate;
    const rounded = Math.round(exact / 50) * 50;
    return {
      exact,
      rounded: Math.max(100, rounded),
    };
  }, [formEstimatedDistance, formFuelConsumptionRate]);

  // Resolve staff driver object when self-driving
  const selectedStaffDriver = useMemo(() => {
    if (!formSelectedStaffDriverId || formSelectedStaffDriverId === currentUser?.id) {
      return currentUser;
    }
    return members.find((m) => m.id === formSelectedStaffDriverId) || currentUser;
  }, [formSelectedStaffDriverId, currentUser, members]);

  // Total passengers with driver calculation for template {จำนวนผู้โดยสารรวมคนขับรถ}
  const totalPassengerCountWithDriver = useMemo(() => {
    const base = Number(formPassengerCount) || 1;
    if (formRequireDriver) {
      // 1 (requester) + N (passengers) + 1 (central fleet driver)
      return base + 1;
    }
    // If self-driving: check if chosen staff driver is already requester or among selected passengers
    const driverId = formSelectedStaffDriverId || currentUser?.id;
    const isAlreadyIncluded = driverId === currentUser?.id || selectedPassengers.some((p) => p.id === driverId);
    return isAlreadyIncluded ? base : base + 1;
  }, [formPassengerCount, formRequireDriver, formSelectedStaffDriverId, currentUser, selectedPassengers]);

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

  // Step 2: Designated Fleet Dispatchers in ฝ่ายบริหารทั่วไป (มี 2 คน: หัวหน้าฝ่ายบริหาร และ syno_ปภาวิน)
  const fleetDispatchers = useMemo(() => {
    // 1. หัวหน้าฝ่ายบริหารทั่วไป (นายเสกพล ดิษฐโชติ)
    const adminHeadMember = members.find(
      (m) =>
        m.id === "syno_เสกพล" ||
        m.name.includes("เสกพล") ||
        (m.division?.includes("ฝ่ายบริหารทั่วไป") && (m.position?.includes("หัวหน้า") || m.role === "manager"))
    );
    const adminHead = {
      id: adminHeadMember?.id || "syno_เสกพล",
      name: adminHeadMember?.name || "นายเสกพล ดิษฐโชติ",
      position: adminHeadMember?.position?.includes("หัวหน้า")
        ? adminHeadMember.position
        : "นักพัฒนาสังคมชำนาญการ (หัวหน้าฝ่ายบริหารทั่วไป)",
      division: "ฝ่ายบริหารทั่วไป",
      role: (adminHeadMember?.role || "manager") as Role,
    };

    // 2. เจ้าหน้าที่ฝ่ายบริหารทั่วไป (syno_ปภาวิน)
    const paphawinMember = members.find(
      (m) => m.id === "syno_ปภาวิน" || m.name.includes("ปภาวิน")
    );
    const paphawin = {
      id: paphawinMember?.id || "syno_ปภาวิน",
      name: paphawinMember?.name || "ปภาวิน",
      position:
        paphawinMember?.position && paphawinMember.position !== "รอกำหนดตำแหน่ง"
          ? paphawinMember.position
          : "เจ้าหน้าที่ฝ่ายบริหารทั่วไป (ผู้รับผิดชอบจัดสรรรถ/คนขับ)",
      division: "ฝ่ายบริหารทั่วไป",
      role: (paphawinMember?.role || "member") as Role,
    };

    return [adminHead, paphawin];
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
      if (!isMounted) return;
      if (remoteBookings && remoteBookings.length > 0) {
        setBookings(remoteBookings);
        saveStoredBookings(remoteBookings);
      } else if (loadedBookings && loadedBookings.length > 0) {
        // Sync local bookings to Supabase if Supabase was empty
        loadedBookings.forEach((b) => {
          saveCarBooking(b).catch(console.warn);
        });
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
      if (isMounted && updatedBookings && updatedBookings.length > 0) {
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

  const updateAndSaveBookings = (newBookings: CarBookingRequest[], targetBooking?: CarBookingRequest) => {
    setBookings(newBookings);
    saveStoredBookings(newBookings);
    if (targetBooking) {
      saveCarBooking(targetBooking).catch(console.error);
    } else {
      newBookings.forEach((b) => {
        saveCarBooking(b).catch(console.error);
      });
    }
  };

  const updateAndSaveVehicles = (newVehicles: Vehicle[]) => {
    setVehicles(newVehicles);
    saveStoredVehicles(newVehicles);
    newVehicles.forEach((v) => {
      saveVehicle(v).catch(() => { });
    });
  };

  // Stats calculation
  const stats = useMemo(() => {
    const totalVehicles = vehicles.length;
    const availableVehicles = vehicles.filter((v) => v.status === "available").length;

    // Stage 1: หน.กลุ่ม/ผู้แทนกลุ่มเห็นชอบ
    const stage1Count = bookings.filter(
      (b) => b.status === "pending_division_head" || b.status === "pending_review"
    ).length;

    // Stage 2: เจ้าหน้าที่ฝ่ายบริหารจัดสรรรถและคนขับ
    const stage2Count = bookings.filter(
      (b) => b.status === "pending_fleet_assignment"
    ).length;

    // Stage 3: หัวหน้าฝ่ายบริหารทั่วไปเสนอความเห็น
    const stage3Count = bookings.filter(
      (b) => b.status === "pending_admin_head"
    ).length;

    // Stage 4: พมจ. พิจารณาอนุมัติ
    const stage4Count = bookings.filter(
      (b) => b.status === "pending_provincial" || b.status === "endorsed"
    ).length;

    // Total Pending across all 4 stages
    const totalPendingCount = stage1Count + stage2Count + stage3Count + stage4Count;

    const approvedCount = bookings.filter((b) => b.status === "approved").length;
    const completedCount = bookings.filter((b) => b.status === "completed").length;
    const rejectedCount = bookings.filter((b) => b.status === "rejected").length;

    return {
      totalVehicles,
      availableVehicles,
      stage1Count,
      stage2Count,
      stage3Count,
      stage4Count,
      totalPendingCount,
      approvedCount,
      completedCount,
      rejectedCount,
      // legacy aliases
      pendingReviewCount: stage1Count,
      endorsedCount: stage4Count,
    };
  }, [vehicles, bookings]);

  // Active / Approved bookings that are on mission or due for return
  const activeReturnDueBookings = useMemo(() => {
    return bookings.filter((b) => b.status === "approved");
  }, [bookings]);

  // ─── PENDING ACTION ITEMS & NOTIFICATIONS FOR CURRENT USER ───
  const myPendingActionItems = useMemo(() => {
    const items: Array<{
      id: string;
      requestNo: string;
      stageLabel: string;
      badgeColor: string;
      title: string;
      requesterName: string;
      destination: string;
      notificationNotice: string;
      actionText: string;
      actionIcon: string;
      onAction: () => void;
    }> = [];

    const myName = currentUser.name || "";
    const myDivision = currentUser.division || "";
    const myPosition = currentUser.position || "";
    const myRole = currentUser.role || "";

    const isFleetStaff =
      currentUser.id === "syno_ปภาวิน" ||
      currentUser.id === "syno_เสกพล" ||
      myName.includes("ปภาวิน") ||
      myName.includes("เสกพล") ||
      myRole === "admin";

    const isAdminHead =
      currentUser.id === "syno_เสกพล" ||
      myName.includes("เสกพล") ||
      myRole === "admin";

    const isProvincialHead =
      myPosition.includes("พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัด") ||
      myName.includes("มะลิวัน") ||
      myRole === "admin";

    for (const b of bookings) {
      const isMyBooking =
        b.requesterId === currentUser.id || (Boolean(myName) && b.requesterName === myName);

      // Stage 1: Pending Division Head Review
      if (
        (b.status === "pending_division_head" || b.status === "pending_review") &&
        !isMyBooking
      ) {
        const isDesignatedReviewer =
          (Boolean(b.divisionReviewerId) && currentUser.id === b.divisionReviewerId) ||
          (Boolean(b.divisionReviewerName && myName) &&
            ((b.divisionReviewerName || "").includes(myName) || myName.includes(b.divisionReviewerName || "")));

        const isDivisionHead =
          Boolean(b.requesterDivision) &&
          myDivision === b.requesterDivision &&
          (myPosition.includes("หัวหน้า") || myRole === "manager");

        if (isDesignatedReviewer || isDivisionHead || myRole === "admin") {
          items.push({
            id: `stg1_${b.id}`,
            requestNo: b.requestNo,
            stageLabel: "ขั้นที่ 1: รอ หน.กลุ่มเห็นชอบ",
            badgeColor: "bg-amber-100 text-amber-900 border border-amber-300",
            title: `คำขอใช้รถไปราชการ: ${b.destination}`,
            requesterName: b.requesterName,
            destination: b.destination,
            notificationNotice: `แจ้งเตือนถึงท่านในฐานะ${isDesignatedReviewer ? "ผู้ได้รับมอบหมาย" : "หัวหน้ากลุ่ม"}`,
            actionText: "พิจารณาเห็นชอบ",
            actionIcon: "✍️",
            onAction: () => setSelectedReviewBooking(b),
          });
        }
      }

      // Stage 2: Pending Fleet Assignment
      if (b.status === "pending_fleet_assignment" && isFleetStaff) {
        items.push({
          id: `stg2_${b.id}`,
          requestNo: b.requestNo,
          stageLabel: "ขั้นที่ 2: รอจัดสรรรถและคนขับ",
          badgeColor: "bg-blue-100 text-blue-900 border border-blue-300",
          title: `จัดสรรรถและคนขับสำหรับคำขอ ${b.requestNo} (${b.destination})`,
          requesterName: b.requesterName,
          destination: b.destination,
          notificationNotice: "แจ้งเตือนถึงเจ้าหน้าที่ฝ่ายบริหารทั่วไป (ผู้รับผิดชอบจัดสรร)",
          actionText: "จัดสรรรถและคนขับ",
          actionIcon: "🚗",
          onAction: () => setSelectedReviewBooking(b),
        });
      }

      // Stage 3: Pending Admin Head Endorsement
      if (b.status === "pending_admin_head" && isAdminHead) {
        items.push({
          id: `stg3_${b.id}`,
          requestNo: b.requestNo,
          stageLabel: "ขั้นที่ 3: รอ หน.ฝ่ายบริหาร เสนอความเห็น",
          badgeColor: "bg-indigo-100 text-indigo-900 border border-indigo-300",
          title: `เสนอความเห็น: รถ ${b.vehicleName || "ส่วนกลาง"} [${b.licensePlate || "-"}] คนขับ: ${b.assignedDriver || "-"}`,
          requesterName: b.requesterName,
          destination: b.destination,
          notificationNotice: "แจ้งเตือนถึงนายเสกพล ดิษฐโชติ (หน.ฝ่ายบริหารทั่วไป)",
          actionText: "พิจารณาเสนอความเห็น",
          actionIcon: "📋",
          onAction: () => setSelectedReviewBooking(b),
        });
      }

      // Stage 4: Pending Provincial Head Approval
      if (
        (b.status === "pending_provincial" || b.status === "endorsed") &&
        isProvincialHead
      ) {
        items.push({
          id: `stg4_${b.id}`,
          requestNo: b.requestNo,
          stageLabel: "ขั้นที่ 4: รอ พมจ. พิจารณาอนุมัติ",
          badgeColor: "bg-purple-100 text-purple-900 border border-purple-300",
          title: `พิจารณาอนุมัติคำขอใช้รถราชการ ${b.requestNo} (${b.destination})`,
          requesterName: b.requesterName,
          destination: b.destination,
          notificationNotice: "แจ้งเตือนถึงนางสาวมะลิวัน สิทธิโยธี (พมจ.กำแพงเพชร)",
          actionText: "พิจารณาอนุมัติ",
          actionIcon: "⚖️",
          onAction: () => setSelectedReviewBooking(b),
        });
      }

      // Driver Assignment Notice
      if (
        b.assignedDriver &&
        myName &&
        b.assignedDriver.includes(myName) &&
        b.status === "approved"
      ) {
        items.push({
          id: `drv_${b.id}`,
          requestNo: b.requestNo,
          stageLabel: "ภารกิจพนักงานขับรถ",
          badgeColor: "bg-teal-100 text-teal-900 border border-teal-300",
          title: `ท่านได้รับมอบหมายขับรถ ${b.vehicleName || ""} [${b.licensePlate || "-"}] ไป ${b.destination}`,
          requesterName: b.requesterName,
          destination: b.destination,
          notificationNotice: `เวลาเดินทาง: ${b.departureTime.replace("T", " ")} น.`,
          actionText: "ดูข้อมูลภารกิจ",
          actionIcon: "🚗",
          onAction: () => setSelectedDocBooking(b),
        });
      }

      // Requester Notice when Approved
      if (isMyBooking && b.status === "approved") {
        items.push({
          id: `req_app_${b.id}`,
          requestNo: b.requestNo,
          stageLabel: "อนุมัติเรียบร้อยแล้ว",
          badgeColor: "bg-emerald-100 text-emerald-900 border border-emerald-300",
          title: `คำขอ ${b.requestNo} ได้รับการอนุมัติแล้ว! รถ [${b.licensePlate || "-"}] คนขับ: ${b.assignedDriver || "-"}`,
          requesterName: b.requesterName,
          destination: b.destination,
          notificationNotice: "ได้รับอนุญาตจาก พมจ.กำแพงเพชร เรียบร้อยแล้ว",
          actionText: "พิมพ์เอกสาร",
          actionIcon: "📄",
          onAction: () => setSelectedDocBooking(b),
        });
      }
    }

    return items;
  }, [bookings, currentUser]);

  const totalOfficeNotifsCount = useMemo(() => {
    return bookings.reduce((acc, b) => acc + (b.notifications?.length || 0), 0);
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
        } else if (statusFilter === "stage1") {
          if (b.status !== "pending_division_head" && b.status !== "pending_review") return false;
        } else if (statusFilter === "stage2") {
          if (b.status !== "pending_fleet_assignment") return false;
        } else if (statusFilter === "stage3") {
          if (b.status !== "pending_admin_head") return false;
        } else if (statusFilter === "stage4") {
          if (b.status !== "pending_provincial" && b.status !== "endorsed") return false;
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

    // Step 1 Notification: ส่ง Notifications ไปยัง ศูนย์การแจ้งเตือน WebApp (หัวหน้ากลุ่มหรือข้าราชการที่เลือก)
    const initialNotification: BookingNotificationLog = {
      id: `notif_${Date.now()}_sub`,
      timestamp: nowFormatted,
      type: "request_submitted",
      title: "ยื่นคำขอใช้รถราชการใหม่ (รอพิจารณาชั้นต้น)",
      message: `📩 มีคำขอใช้รถใหม่ ${newReqNo} จาก ${currentUser.name} (${currentUser.division}) ปลายทาง: ${formDestination.trim()} ${formFuelBudgetRequested
          ? `(ของบประมาณค่าน้ำมัน: ${formFuelBudgetAmount.toLocaleString()} บาท)`
          : "(ไม่ของบค่าน้ำมัน)"
        } รอ ${chosenReviewer.name} (${formReviewerType === "head" ? "หัวหน้ากลุ่ม/ฝ่าย" : "ข้าราชการในกลุ่ม"}) ตรวจสอบและให้ความเห็นชอบชั้นต้น`,
      recipientRole: formReviewerType === "head" ? "หัวหน้ากลุ่ม/ฝ่าย" : "ข้าราชการในกลุ่มตนเอง",
      recipientName: chosenReviewer.name,
      channel: "webapp_notification",
      status: "delivered",
    };
    sendBrowserNotification("คำขอใช้รถราชการใหม่", {
      body: `มีคำขอ ${newReqNo} จาก ${currentUser.name} ปลายทาง: ${formDestination.trim()} รอพิจารณาชั้นต้น`,
    });

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
      assignedDriver: formRequireDriver
        ? "รอฝ่ายบริหารจัดสรร"
        : selectedStaffDriver?.name
        ? `${selectedStaffDriver.name}${selectedStaffDriver.id === currentUser.id ? " (ผู้ขอขับขี่เอง)" : " (เจ้าหน้าที่ขับขี่เอง)"}`
        : "ขับขี่เองโดยผู้ขอใช้รถ",
      fuelBudgetRequested: formFuelBudgetRequested,
      fuelBudgetAmount: formFuelBudgetRequested ? Number(formFuelBudgetAmount) : undefined,
      fuelBudgetSource: formFuelBudgetRequested ? formFuelBudgetSource.trim() : undefined,
      fuelProjectName: formFuelBudgetRequested ? (formFuelProjectName || formFuelBudgetSource).trim() : undefined,
      fuelConsumptionRate: formFuelBudgetRequested ? Number(formFuelConsumptionRate) : undefined,
      totalPassengerCountWithDriver: totalPassengerCountWithDriver,
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
    updateAndSaveBookings(updated, newBooking);

    recordAuditLog(
      currentUser.name,
      `ยื่นคำขอจองรถยนต์ราชการ: ${newReqNo}`,
      `เสนอ ${chosenReviewer.name} (${formReviewerType === "head" ? "หัวหน้ากลุ่ม" : "ข้าราชการ"}) ตรวจสอบชั้นต้น - ปลายทาง: ${formDestination.trim()}`,
      "success"
    ).catch(console.warn);

    showToast(
      `✅ ยื่นคำขอใช้รถ ${newReqNo} สำเร็จ! แจ้งเตือนไปยัง ${chosenReviewer.name} ผ่านศูนย์การแจ้งเตือนในระบบเรียบร้อยแล้ว`
    );
    setActiveTab("requests");

    // Reset fields
    setFormPurpose("");
    setFormDestination("");
    setFormPassengersList("");
    setSelectedPassengers([]);
    setFormPassengerCount(1);
    setFormFuelBudgetRequested(false);
    setFormFuelProjectName("งบดำเนินงานสำนักงาน พมจ.กำแพงเพชร");
    setFormFuelConsumptionRate(4.0);
    setFormRequireDriver(true);
    setFormSelectedStaffDriverId(currentUser?.id || "");
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
      message: `📋 คำขอใช้รถ ${target.requestNo} ผ่านความเห็นชอบจาก ${currentUser.name} (${currentUser.position}) เรียบร้อยแล้ว แจ้งเตือนไปยัง ${dispatcherName} เพื่อดำเนินการจัดสรรรถยนต์และพนักงานขับรถต่อไป`,
      recipientRole: "เจ้าหน้าที่จัดสรรรถ ฝ่ายบริหารทั่วไป",
      recipientName: dispatcherName,
      channel: "webapp_notification",
      status: "delivered",
    };
    sendBrowserNotification("คำขอใช้รถผ่านความเห็นชอบชั้นต้น", {
      body: `คำขอ ${target.requestNo} ผ่านความเห็นชอบแล้ว รอจัดสรรรถและคนขับ`,
    });

    const updated = bookings.map((b) => {
      if (b.id !== bookingId) return b;
      return {
        ...b,
        status: "pending_fleet_assignment" as BookingStatus,
        divisionReviewerId: currentUser.id,
        divisionReviewerName: currentUser.name,
        divisionReviewerNotes: notes,
        divisionReviewerActionAt: nowFormatted,
        // Legacy fallback
        managerId: currentUser.id,
        managerName: currentUser.name,
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
    showToast(`✓ เห็นชอบคำขอ ${target.requestNo} เรียบร้อยแล้ว! แจ้งเตือนไปยัง ${dispatcherName} ผ่านศูนย์การแจ้งเตือน`);
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
      message: `🚗 คำขอ ${target.requestNo} ได้รับการจัดสรรพาหนะ: ${assignedVeh.name} [${assignedVeh.licensePlate}] พนักงานขับรถ: ${assignedDriver} เสนอ ${adminHeadName} เพื่อโปรดพิจารณาเห็นชอบ`,
      recipientRole: "หัวหน้าฝ่ายบริหารทั่วไป",
      recipientName: "นายเสกพล ดิษฐโชติ",
      channel: "webapp_notification",
      status: "delivered",
    };
    sendBrowserNotification("จัดสรรรถและคนขับเรียบร้อย", {
      body: `คำขอ ${target.requestNo} รถ ${assignedVeh.licensePlate} คนขับ: ${assignedDriver} เสนอ หน.ฝ่ายบริหาร`,
    });

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
        fleetDispatcherName: currentUser.name,
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
    showToast(`✓ จัดสรรรถและคนขับสำหรับคำขอ ${target.requestNo} สำเร็จ! แจ้งเตือนเสนอหัวหน้าฝ่ายบริหารทั่วไปผ่านศูนย์การแจ้งเตือนแล้ว`);
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
      message: `👔 คำขอใช้รถ ${target.requestNo} ผ่านความเห็นชอบจากหัวหน้าฝ่ายบริหารทั่วไป (${currentUser.name}) เสนอ พมจ.กำแพงเพชร (นางสาวมะลิวัน สิทธิโยธี) เพื่อโปรดพิจารณาอนุมัติ`,
      recipientRole: "พมจ.กำแพงเพชร",
      recipientName: "นางสาวมะลิวัน สิทธิโยธี",
      channel: "webapp_notification",
      status: "delivered",
    };
    sendBrowserNotification("หน.ฝ่ายบริหารเสนอความเห็นคำขอใช้รถ", {
      body: `คำขอ ${target.requestNo} ผ่านความเห็นชอบแล้ว เสนอ พมจ.กำแพงเพชร พิจารณาอนุมัติ`,
    });

    const updated = bookings.map((b) => {
      if (b.id !== bookingId) return b;
      return {
        ...b,
        status: "pending_provincial" as BookingStatus,
        adminHeadId: currentUser.id,
        adminHeadName: currentUser.name,
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
    showToast(`✓ หัวหน้าฝ่ายบริหารเห็นชอบคำขอ ${target.requestNo} แล้ว! แจ้งเตือนเสนอ พมจ.กำแพงเพชร ผ่านศูนย์การแจ้งเตือน`);
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
      message: `🎉 คำขอ ${target.requestNo} ได้รับการอนุมัติแล้วจาก พมจ.กำแพงเพชร พาหนะ: ${target.vehicleName} [${target.licensePlate}] พนักงานขับรถ: ${target.assignedDriver || "พนักงานขับรถเวร"} พร้อมออกเดินทางได้`,
      recipientRole: "ผู้ขอใช้รถ",
      recipientName: target.requesterName,
      channel: "webapp_notification",
      status: "delivered",
    };

    // 2. Notify Assigned Driver
    const notifDriver: BookingNotificationLog = {
      id: `notif_${Date.now()}_drv`,
      timestamp: nowFormatted,
      type: "approved",
      title: "มอบหมายภารกิจพนักงานขับรถราชการ",
      message: `🚗 คุณได้รับมอบหมายขับรถ ${target.vehicleName} [${target.licensePlate
        }] ไปยัง ${target.destination} กำหนดออก: ${target.departureTime.replace(
          "T",
          " "
        )} คณะผู้เดินทาง ${target.passengerCount} คน`,
      recipientRole: "พนักงานขับรถราชการ",
      recipientName: target.assignedDriver || "พนักงานขับรถ",
      channel: "webapp_notification",
      status: "delivered",
    };

    // 3. Notify Fleet & Inventory Officers
    const notifFleet: BookingNotificationLog = {
      id: `notif_${Date.now()}_flt`,
      timestamp: nowFormatted,
      type: "approved",
      title: "เตรียมความพร้อมรถยนต์ราชการสำหรับภารกิจ",
      message: `📋 เตรียมความพร้อมรถ ${target.vehicleName} [${target.licensePlate
        }] สำหรับคำขอ ${target.requestNo} ${target.fuelBudgetRequested
          ? `(งบประมาณค่าน้ำมัน: ${target.fuelBudgetAmount?.toLocaleString()} บาท)`
          : ""
        }`,
      recipientRole: "เจ้าหน้าที่ยานพาหนะ",
      recipientName: "ฝ่ายบริหารทั่วไป (งานยานพาหนะ)",
      channel: "webapp_notification",
      status: "delivered",
    };

    sendBrowserNotification("พมจ. อนุมัติคำขอใช้รถยนต์ราชการ", {
      body: `คำขอ ${target.requestNo} ได้รับการอนุมัติแล้ว รถ: ${target.vehicleName} [${target.licensePlate}]`,
    });

    const newNotifs = [notifRequester, notifDriver, notifFleet];

    const updated = bookings.map((b) => {
      if (b.id !== bookingId) return b;
      return {
        ...b,
        status: "approved" as BookingStatus,
        approverId: currentUser.id,
        approverName: currentUser.name,
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
      `👑 พมจ.กำแพงเพชร อนุมัติเรียบร้อย! และระบบได้แจ้งเตือนไปยังคุณ ${target.requesterName} และพนักงานขับรถผ่านศูนย์การแจ้งเตือนแล้ว`
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

  // Manual Trigger: Send Return Reminder (แจ้งเตือนการคืนรถผ่านศูนย์การแจ้งเตือน WebApp)
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
      message: `⚠️ แจ้งเตือนถึงกำหนดส่งคืนรถยนต์ราชการ: คำขอ ${booking.requestNo} (${booking.licensePlate}) ถึงเวลาส่งคืนแล้ว กรุณานำรถส่งคืน ณ สำนักงาน พมจ. และรายงานผลการตรวจสภาพ เลขไมล์ และเกจน้ำมันในระบบเพื่อคืนสถานะความพร้อม`,
      recipientRole: "ผู้ขอใช้รถ / คณะเดินทาง",
      recipientName: booking.requesterName,
      channel: "webapp_notification",
      status: "delivered",
    };

    sendBrowserNotification("แจ้งเตือนถึงกำหนดส่งคืนรถราชการ", {
      body: `คำขอ ${booking.requestNo} (${booking.licensePlate}) ถึงเวลาส่งคืนรถแล้ว`,
    });

    const updated = bookings.map((b) => {
      if (b.id !== booking.id) return b;
      return {
        ...b,
        notifications: [...(b.notifications || []), reminderNotif],
      };
    });

    updateAndSaveBookings(updated);
    showToast(
      `🔔 แจ้งเตือนคืนรถยนต์ [${booking.licensePlate}] ไปยังคุณ ${booking.requesterName} ผ่านศูนย์การแจ้งเตือนในระบบเรียบร้อยแล้ว!`
    );
  };

  // Cancel booking by requester
  const handleCancelBooking = (booking: CarBookingRequest) => {
    if (!confirm(`คุณต้องการยกเลิกคำขอ ${booking.requestNo} หรือไม่?`)) return;
    const updated = bookings.filter((b) => b.id !== booking.id);
    updateAndSaveBookings(updated);
    deleteCarBooking(booking.id).catch(() => { });
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
      message: `🏁 ส่งคืนรถยนต์ ${licensePlate} เรียบร้อยแล้ว (กุญแจรถ: ${report.keyReturned ? "ส่งคืนแล้ว" : "ยังไม่ส่งคืน"}) เลขไมล์: ${report.endMileage.toLocaleString()} กม. (ระยะวิ่งจริง ${report.totalDistance.toLocaleString()} กม.) เกจน้ำมัน: ${report.endFuelLevel
        } ผู้ตรวจรับ: ${report.inspectorName}`,
      recipientRole: "เจ้าหน้าที่ยานพาหนะ",
      recipientName: "ฝ่ายบริหารทั่วไป (งานยานพาหนะ)",
      channel: "webapp_notification",
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
        message: `🚨 รถยนต์ ${licensePlate} ถูกรายงานปัญหาหลังการใช้งาน: "${report.issuesFound}". ระบบได้ปรับสถานะรถยนต์เป็น "ซ่อมบำรุง (Maintenance)" โดยอัตโนมัติ แจ้งเตือนไปยัง นายเสกพล ดิษฐโชติ (หัวหน้าฝ่ายบริหารทั่วไป) เพื่อโปรดพิจารณาอนุมัติส่งซ่อมบำรุง`,
        recipientRole: "หัวหน้าฝ่ายบริหารทั่วไป",
        recipientName: "นายเสกพล ดิษฐโชติ",
        channel: "webapp_notification",
        status: "delivered",
      };
      notifs.push(maintenanceAlertNotif);
      sendBrowserNotification("แจ้งซ่อมบำรุงเร่งด่วน", {
        body: `รถยนต์ ${licensePlate} ถูกรายงานปัญหา: "${report.issuesFound}"`,
      });
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
        `⚠️ บันทึกการส่งคืนรถ [${licensePlate}] และรายงานแจ้งซ่อมสำเร็จ! ระบบได้ปรับสถานะเป็น "ซ่อมบำรุง" และแจ้งเตือนด่วนไปยังหัวหน้าฝ่ายบริหารทั่วไปผ่านศูนย์การแจ้งเตือนแล้ว`
      );
    } else {
      showToast(
        `✅ ส่งคืนรถยนต์ราชการ [${licensePlate}] พร้อมส่งกุญแจคืนเรียบร้อย! ระบบคำนวณระยะวิ่งจริง ${report.totalDistance.toLocaleString()} กม. และเคลียร์สถานะเป็น "พร้อมใช้งาน"`
      );
    }
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
            {/* Notification Hub Button */}
            <button
              type="button"
              onClick={() => setIsNotificationHubOpen(true)}
              className="relative px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 backdrop-blur-xs"
              title="เปิดศูนย์รวมการแจ้งเตือนในระบบ WebApp และสถานะงานทั้งหมด"
            >
              <span className="text-sm">🔔</span>
              <span>ศูนย์การแจ้งเตือน</span>
              {myPendingActionItems.length > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                  {myPendingActionItems.length} งานรอคุณ
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/40 text-teal-200">
                  {totalOfficeNotifsCount}
                </span>
              )}
            </button>

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

      {/* ─── ACTION-REQUIRED NOTIFICATION BANNER (ศูนย์แจ้งเตือนภารกิจที่รอคุณดำเนินการ) ─── */}
      {myPendingActionItems.length > 0 && (
        <div className="p-4 bg-linear-to-r from-amber-500/15 via-orange-500/10 to-teal-500/10 border-2 border-amber-400 rounded-3xl shadow-md space-y-3 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-lg font-bold shadow-xs animate-bounce">
                🔔
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>แจ้งเตือนภารกิจที่รอคุณดำเนินการ ({myPendingActionItems.length} รายการ)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                    เรียน {currentUser.name} ({currentUser.position})
                  </span>
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  ระบบได้ส่งการแจ้งเตือนมายังท่าน เพื่อโปรดดำเนินการในขั้นตอนที่เกี่ยวข้อง
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsNotificationHubOpen(true)}
              className="text-xs font-bold text-amber-900 hover:text-amber-950 underline cursor-pointer"
            >
              ดูประวัติการแจ้งเตือนทั้งหมด ➔
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {myPendingActionItems.map((item) => (
              <div
                key={item.id}
                className="p-3.5 bg-white border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-amber-400 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-amber-100 text-amber-900">
                      {item.requestNo}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor}`}>
                      {item.stageLabel}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-900">
                    {item.title}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span>ผู้ขอ: <strong>{item.requesterName}</strong></span>
                    <span>•</span>
                    <span>ปลายทาง: {item.destination}</span>
                  </div>
                  <div className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block">
                    📲 {item.notificationNotice}
                  </div>
                </div>

                <div className="shrink-0">
                  <button
                    type="button"
                    onClick={item.onAction}
                    className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>{item.actionIcon}</span>
                    <span>{item.actionText}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                    title="แจ้งเตือนผู้ขอใช้รถผ่านศูนย์การแจ้งเตือน WebApp"
                  >
                    <span>🔔</span>
                    <span>แจ้งเตือนคืนรถ</span>
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

      {/* KPI Metric Cards: จำนวนคำขอของแต่ละขั้นตอน 1-4 และสถานะภารกิจ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Step 1 */}
        <div
          onClick={() => {
            setStatusFilter(statusFilter === "stage1" ? "all" : "stage1");
            setActiveTab("requests");
          }}
          className={`p-3.5 bg-white rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${statusFilter === "stage1" ? "border-amber-500 ring-2 ring-amber-400/30" : "border-slate-200/80 hover:border-amber-300"
            }`}
        >
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs text-slate-500 font-medium">1. รอ หน.กลุ่ม</span>
            <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center text-xs font-bold">
              ⏳
            </span>
          </div>
          <div className="text-xl font-bold font-heading text-amber-700">
            {stats.stage1Count} <span className="text-xs text-slate-400 font-normal">คำขอ</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">เห็นชอบชั้นต้น</div>
        </div>

        {/* Step 2 */}
        <div
          onClick={() => {
            setStatusFilter(statusFilter === "stage2" ? "all" : "stage2");
            setActiveTab("requests");
          }}
          className={`p-3.5 bg-white rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${statusFilter === "stage2" ? "border-blue-500 ring-2 ring-blue-400/30" : "border-slate-200/80 hover:border-blue-300"
            }`}
        >
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs text-slate-500 font-medium">2. รอจัดสรรรถ</span>
            <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-bold">
              🚗
            </span>
          </div>
          <div className="text-xl font-bold font-heading text-blue-700">
            {stats.stage2Count} <span className="text-xs text-slate-400 font-normal">คำขอ</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">ฝ่ายบริหารจัดสรร</div>
        </div>

        {/* Step 3 */}
        <div
          onClick={() => {
            setStatusFilter(statusFilter === "stage3" ? "all" : "stage3");
            setActiveTab("requests");
          }}
          className={`p-3.5 bg-white rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${statusFilter === "stage3" ? "border-indigo-500 ring-2 ring-indigo-400/30" : "border-slate-200/80 hover:border-indigo-300"
            }`}
        >
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs text-slate-500 font-medium">3. รอ หน.ฝ่ายบริหาร</span>
            <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs font-bold">
              📋
            </span>
          </div>
          <div className="text-xl font-bold font-heading text-indigo-700">
            {stats.stage3Count} <span className="text-xs text-slate-400 font-normal">คำขอ</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">เสนอความเห็น</div>
        </div>

        {/* Step 4 */}
        <div
          onClick={() => {
            setStatusFilter(statusFilter === "stage4" ? "all" : "stage4");
            setActiveTab("requests");
          }}
          className={`p-3.5 bg-white rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${statusFilter === "stage4" ? "border-purple-500 ring-2 ring-purple-400/30" : "border-slate-200/80 hover:border-purple-300"
            }`}
        >
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs text-slate-500 font-medium">4. รอ พมจ. อนุมัติ</span>
            <span className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center text-xs font-bold">
              ⚖️
            </span>
          </div>
          <div className="text-xl font-bold font-heading text-purple-700">
            {stats.stage4Count} <span className="text-xs text-slate-400 font-normal">คำขอ</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">พิจารณาอนุญาต</div>
        </div>

        {/* Approved */}
        <div
          onClick={() => {
            setStatusFilter(statusFilter === "approved" ? "all" : "approved");
            setActiveTab("requests");
          }}
          className={`p-3.5 bg-white rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${statusFilter === "approved" ? "border-emerald-500 ring-2 ring-emerald-400/30" : "border-slate-200/80 hover:border-emerald-300"
            }`}
        >
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs text-slate-500 font-medium">อนุมัติแล้ว</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs font-bold">
              ✅
            </span>
          </div>
          <div className="text-xl font-bold font-heading text-emerald-700">
            {stats.approvedCount} <span className="text-xs text-slate-400 font-normal">ภารกิจ</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">พร้อมเดินทาง</div>
        </div>

        {/* Completed */}
        <div
          onClick={() => {
            setStatusFilter(statusFilter === "completed" ? "all" : "completed");
            setActiveTab("requests");
          }}
          className={`p-3.5 bg-white rounded-2xl border transition-all cursor-pointer shadow-xs hover:shadow-md ${statusFilter === "completed" ? "border-teal-500 ring-2 ring-teal-400/30" : "border-slate-200/80 hover:border-teal-300"
            }`}
        >
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs text-slate-500 font-medium">ส่งคืนแล้ว</span>
            <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center text-xs font-bold">
              🏁
            </span>
          </div>
          <div className="text-xl font-bold font-heading text-teal-700">
            {stats.completedCount} <span className="text-xs text-slate-400 font-normal">ภารกิจ</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">เสร็จสิ้นภารกิจ</div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("requests")}
          className={`pb-3.5 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${activeTab === "requests"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
        >
          <span>📋</span>
          <span>ทะเบียนคำขอจองรถ & รายงานคืน ({bookings.length})</span>
          {stats.totalPendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
              รอพิจารณา {stats.totalPendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("timeline")}
          className={`pb-3.5 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${activeTab === "timeline"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
        >
          <span>📅</span>
          <span>ตารางไทม์ไลน์ภารกิจ (Gantt View)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("new_request")}
          className={`pb-3.5 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${activeTab === "new_request"
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

      {/* ─── TAB 2: BOOKING REGISTRY & RETURN WORKFLOW ─── */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "all", label: "ทั้งหมด", count: bookings.length },
                { id: "pending", label: "รอพิจารณารวม", count: stats.totalPendingCount },
                { id: "stage1", label: "1. รอ หน.กลุ่ม", count: stats.stage1Count, badgeColor: "bg-amber-100 text-amber-800" },
                { id: "stage2", label: "2. รอจัดสรรรถ", count: stats.stage2Count, badgeColor: "bg-blue-100 text-blue-800" },
                { id: "stage3", label: "3. รอ หน.ฝ่ายบริหาร", count: stats.stage3Count, badgeColor: "bg-indigo-100 text-indigo-800" },
                { id: "stage4", label: "4. รอ พมจ.", count: stats.stage4Count, badgeColor: "bg-purple-100 text-purple-800" },
                { id: "approved", label: "อนุมัติแล้ว", count: stats.approvedCount, badgeColor: "bg-emerald-100 text-emerald-800" },
                { id: "completed", label: "ส่งคืนแล้ว", count: stats.completedCount, badgeColor: "bg-teal-100 text-teal-800" },
                { id: "rejected", label: "ไม่อนุมัติ", count: stats.rejectedCount, badgeColor: "bg-rose-100 text-rose-800" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${statusFilter === f.id
                      ? "bg-teal-700 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                >
                  <span>{f.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold leading-none ${statusFilter === f.id
                        ? "bg-white/20 text-white"
                        : f.count > 0
                          ? (f.badgeColor || "bg-slate-200 text-slate-800")
                          : "bg-slate-200/60 text-slate-400"
                      }`}
                  >
                    {f.count}
                  </span>
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
                const isMyBooking =
                  b.requesterId === currentUser.id ||
                  (Boolean(currentUser.name) && b.requesterName === currentUser.name);

                const canReportReturn =
                  b.status === "approved" &&
                  (isMyBooking || currentUser.role === "admin" || currentUser.role === "manager");

                // Step 1: หัวหน้ากลุ่มหรือข้าราชการในกลุ่มเห็นชอบ
                // กฎระเบียบราชการ: ผู้ขอใช้รถไม่สามารถพิจารณาเห็นชอบคำขอของตนเองได้ (!isMyBooking)
                // ผู้มีสิทธิ์พิจารณาเห็นชอบ ต้องเป็น:
                // 1) ผู้ได้รับมอบหมายที่ถูกเลือกโดยตรง (currentUser.id === b.divisionReviewerId หรือชื่อตรงกัน)
                // 2) หรือ หัวหน้ากลุ่มงานที่ผู้ขอสังกัด (currentUser.division === b.requesterDivision และมีตำแหน่งหัวหน้าหรือบทบาท manager)
                // 3) หรือ ผู้ดูแลระบบจังหวัด (admin) ที่ไม่ใช่ผู้ยื่นคำขอเอง
                const isDesignatedReviewer =
                  Boolean(b.divisionReviewerId && currentUser.id === b.divisionReviewerId) ||
                  Boolean(b.divisionReviewerName && currentUser.name === b.divisionReviewerName);

                const isDivisionHeadOfRequester =
                  currentUser.division === b.requesterDivision &&
                  (currentUser.role === "manager" ||
                    currentUser.position?.includes("หัวหน้า") ||
                    currentUser.id === "syno_พนมศักย์" ||
                    currentUser.id === "syno_วรวุฒิ" ||
                    currentUser.id === "syno_เสกพล");

                const canReviewStage1 =
                  (b.status === "pending_division_head" || b.status === "pending_review") &&
                  !isMyBooking &&
                  (isDesignatedReviewer || isDivisionHeadOfRequester || currentUser.role === "admin");

                // Step 2: เจ้าหน้าที่ฝ่ายบริหารจัดสรรรถและคนขับ (มีเฉพาะ 2 คน: หัวหน้าฝ่ายบริหารทั่วไป และ syno_ปภาวิน เท่านั้น)
                // หน.กลุ่มฝ่ายอื่นๆ ที่ไม่ใช่ฝ่ายบริหารทั่วไป จะไม่มีสิทธิ์ในขั้นตอนนี้
                const isFleetDispatcherAuthorized =
                  currentUser.id === "syno_ปภาวิน" ||
                  currentUser.name.includes("ปภาวิน") ||
                  currentUser.id === "syno_เสกพล" ||
                  currentUser.name.includes("เสกพล") ||
                  (currentUser.division?.includes("ฝ่ายบริหารทั่วไป") &&
                    (currentUser.position?.includes("หัวหน้า") || currentUser.role === "manager")) ||
                  currentUser.id === b.fleetDispatcherId;

                const canReviewStage2 =
                  b.status === "pending_fleet_assignment" &&
                  (currentUser.role === "admin" || isFleetDispatcherAuthorized);

                // Step 3: หัวหน้าฝ่ายบริหารเห็นชอบ (เฉพาะหัวหน้าฝ่ายบริหารทั่วไปเท่านั้น)
                // หน.กลุ่มฝ่ายอื่นๆ ที่ไม่ใช่ฝ่ายบริหารทั่วไป จะไม่มีสิทธิ์ในขั้นตอนนี้
                const isAdminHeadAuthorized =
                  currentUser.id === "syno_เสกพล" ||
                  currentUser.name.includes("เสกพล") ||
                  (currentUser.division?.includes("ฝ่ายบริหารทั่วไป") &&
                    (currentUser.position?.includes("หัวหน้า") || currentUser.role === "manager"));

                const canReviewStage3 =
                  b.status === "pending_admin_head" &&
                  (currentUser.role === "admin" || isAdminHeadAuthorized);

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
                          className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                          title="ดูประวัติการแจ้งเตือนในระบบ WebApp"
                        >
                          <span>🔔</span>
                          <span>Notifications ({b.notifications?.length || 0})</span>
                        </button>

                        {getStatusBadge(b.status)}
                        <span className="text-xs text-slate-400 font-mono">ยื่นเมื่อ {b.createdAt}</span>
                      </div>
                    </div>

                    {/* Active Stakeholder Notification Notice Banner */}
                    <div className="p-3 bg-linear-to-r from-teal-50/80 via-slate-50 to-amber-50/50 rounded-2xl border border-teal-200/70 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-bold shrink-0">
                          🔔
                        </span>
                        <div>
                          <span className="text-slate-500 font-medium">การแจ้งเตือนงาน: </span>
                          <strong className="text-slate-900">
                            {b.status === "pending_division_head" || b.status === "pending_review" ? (
                              <span>แจ้งเตือนศูนย์การแจ้งเตือนไปยัง <span className="text-amber-800 font-bold">{b.divisionReviewerName || "หัวหน้ากลุ่ม/ฝ่าย"}</span> เพื่อพิจารณาเห็นชอบชั้นต้นแล้ว</span>
                            ) : b.status === "pending_fleet_assignment" ? (
                              <span>ผ่านความเห็นชอบแล้ว ➔ แจ้งเตือนศูนย์การแจ้งเตือนไปยัง <span className="text-blue-800 font-bold">ฝ่ายบริหารทั่วไป (คุณเสกพล / คุณปภาวิน)</span> เพื่อจัดสรรรถและคนขับ</span>
                            ) : b.status === "pending_admin_head" ? (
                              <span>จัดสรรรถแล้ว ➔ แจ้งเตือนศูนย์การแจ้งเตือนเสนอ <span className="text-indigo-800 font-bold">นายเสกพล ดิษฐโชติ (หน.ฝ่ายบริหารทั่วไป)</span> เพื่อพิจารณาเสนอความเห็น</span>
                            ) : b.status === "pending_provincial" || b.status === "endorsed" ? (
                              <span>เสนอความเห็นแล้ว ➔ แจ้งเตือนศูนย์การแจ้งเตือนนำกราบเรียน <span className="text-purple-800 font-bold">นางสาวมะลิวัน สิทธิโยธี (พมจ.กำแพงเพชร)</span> เพื่อโปรดพิจารณาอนุมัติ</span>
                            ) : b.status === "approved" ? (
                              <span>อนุมัติคำขอแล้ว ➔ แจ้งเตือนศูนย์การแจ้งเตือน <span className="text-emerald-800 font-bold">ผู้ขอใช้รถ ({b.requesterName})</span> และ <span className="text-teal-800 font-bold">คนขับ ({b.assignedDriver})</span> เรียบร้อยแล้ว</span>
                            ) : b.status === "completed" ? (
                              <span className="text-teal-900 font-semibold">ส่งคืนรถและกุญแจเรียบร้อย (ภารกิจเสร็จสิ้น)</span>
                            ) : (
                              <span className="text-rose-700 font-semibold">คำขอถูกปฏิเสธ</span>
                            )}
                          </strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setExpandedNotifBookingId(expandedNotifBookingId === b.id ? null : b.id)}
                          className="px-2.5 py-1 bg-white hover:bg-teal-50 text-teal-800 border border-teal-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <span>{expandedNotifBookingId === b.id ? "▲ ซ่อนบันทึกแจ้งเตือน" : `▼ ดูข้อความที่ส่ง (${b.notifications?.length || 0})`}</span>
                        </button>
                      </div>
                    </div>

                    {/* Inline Expanded Notification History */}
                    {expandedNotifBookingId === b.id && (
                      <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-teal-200/80 space-y-2 text-xs animate-fade-in">
                        <div className="flex items-center justify-between font-bold text-slate-700 pb-1.5 border-b border-slate-200">
                          <span className="flex items-center gap-1.5 text-teal-900">
                            <span>🔔</span>
                            <span>ประวัติการแจ้งเตือนในระบบ WebApp ทั้งหมด ({b.notifications?.length || 0} รายการ):</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedNotifBooking(b)}
                            className="text-teal-700 hover:text-teal-900 text-[11px] font-bold underline cursor-pointer"
                          >
                            เปิดดูแบบเต็มหน้าต่าง ➔
                          </button>
                        </div>

                        <div className="space-y-2 pt-1">
                          {(!b.notifications || b.notifications.length === 0) ? (
                            <div className="text-slate-400 italic text-[11px] p-2 text-center">ยังไม่มีประวัติการส่งข้อความแจ้งเตือนสำหรับคำขอนี้</div>
                          ) : (
                            b.notifications.map((notif, idx) => (
                              <div key={notif.id || idx} className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                                <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
                                      🔔 ศูนย์การแจ้งเตือน
                                    </span>
                                    <strong className="text-slate-800">{notif.title}</strong>
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-mono">{notif.timestamp}</span>
                                </div>
                                <div className="p-2.5 bg-teal-50/70 text-slate-900 rounded-lg text-[11px] border border-teal-200/80 leading-relaxed">
                                  {notif.message.replace(/^\[Line Notify\]\s*/, "")}
                                </div>
                                <div className="text-[10px] text-slate-500 flex flex-wrap items-center justify-between gap-2 pt-0.5">
                                  <span>ส่งถึง: <strong>{notif.recipientRole}</strong> ({notif.recipientName})</span>
                                  <span className="text-emerald-700 font-medium">✓ จัดส่งสำเร็จ (Delivered)</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

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
                            <span className="text-slate-400">คนนั่งทั้งสิ้น:</span>{" "}
                            <strong className="text-slate-800">
                              {b.totalPassengerCountWithDriver || ((b.passengerCount || 1) + (b.requireDriver !== false ? 1 : 0))} คน
                            </strong>
                            <span className="text-[10px] text-slate-400 ml-1">
                              (ผู้โดยสาร {b.passengerCount} + {b.requireDriver ? "คนขับ" : "ขับเอง"})
                            </span>
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
                              {b.fuelConsumptionRate && (
                                <span className="text-[10px] font-normal text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded">
                                  ({b.fuelConsumptionRate} บ./กม.)
                                </span>
                              )}
                            </span>
                            <span className="text-[11px] text-amber-800">
                              โครงการ/แหล่งงบ: {b.fuelProjectName || b.fuelBudgetSource || "งบดำเนินงานสำนักงาน"}
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

                    {/* Assigned Vehicle & Driver Highlight (When allocated by General Administration) */}
                    {b.licensePlate && b.licensePlate !== "-" && (
                      <div className="p-3.5 bg-linear-to-r from-emerald-50/90 via-teal-50/80 to-blue-50/70 rounded-2xl border border-emerald-200 text-xs text-slate-800 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-emerald-950">
                          <div className="flex items-center gap-2">
                            <span className="text-base">🚗</span>
                            <span className="text-sm">
                              ข้อมูลการจัดสรรยานพาหนะและพนักงานขับรถ
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-200 text-emerald-800 border border-emerald-300">
                              ฝ่ายบริหารทั่วไปจัดสรรแล้ว
                            </span>
                          </div>
                          {b.fleetDispatcherActionAt && (
                            <span className="text-[11px] text-slate-500 font-normal">
                              จัดสรรเมื่อ {b.fleetDispatcherActionAt}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1.5 border-t border-emerald-200/60">
                          <div>
                            <span className="text-slate-500">ยานพาหนะ:</span>{" "}
                            <strong className="text-slate-900 font-semibold">{b.vehicleName || "รถยนต์ส่วนกลาง"}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500">หมายเลขทะเบียน:</span>{" "}
                            <strong className="text-emerald-900 font-mono font-bold">[{b.licensePlate}]</strong>
                          </div>
                          <div>
                            <span className="text-slate-500">พนักงานขับรถ:</span>{" "}
                            <strong className="text-teal-900 font-bold">{b.assignedDriver || "-"}</strong>
                          </div>
                        </div>

                        {(b.fleetDispatcherName || b.adminHeadName || b.adminHeadNotes) && (
                          <div className="pt-2 border-t border-emerald-200/40 text-[11px] text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                            {b.fleetDispatcherName && (
                              <div>
                                <span className="text-slate-500">ผู้รับผิดชอบจัดสรร:</span>{" "}
                                <span className="font-medium text-slate-800">{b.fleetDispatcherName}</span>
                              </div>
                            )}
                            {b.adminHeadName && (
                              <div>
                                <span className="text-slate-500">หน.ฝ่ายบริหาร:</span>{" "}
                                <span className="font-medium text-slate-800">{b.adminHeadName}</span>
                              </div>
                            )}
                            {(b.adminHeadNotes || b.fleetDispatcherNotes) && (
                              <div className="w-full text-slate-700">
                                <span className="text-slate-500">ความเห็น:</span>{" "}
                                <span className="italic">"{b.adminHeadNotes || b.fleetDispatcherNotes}"</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

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
                        className={`flex items-center gap-1.5 font-semibold ${b.status !== "pending_division_head" && b.status !== "pending_review" && b.status !== "rejected"
                            ? "text-emerald-700"
                            : b.status === "pending_division_head" || b.status === "pending_review"
                              ? "text-amber-700"
                              : "text-slate-400"
                          }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${b.status !== "pending_division_head" && b.status !== "pending_review" && b.status !== "rejected"
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
                        className={`flex items-center gap-1.5 font-semibold ${b.status === "pending_admin_head" || b.status === "pending_provincial" || b.status === "endorsed" || b.status === "approved" || b.status === "completed"
                            ? "text-emerald-700"
                            : b.status === "pending_fleet_assignment"
                              ? "text-blue-700"
                              : "text-slate-400"
                          }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${b.status === "pending_admin_head" || b.status === "pending_provincial" || b.status === "endorsed" || b.status === "approved" || b.status === "completed"
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
                        className={`flex items-center gap-1.5 font-semibold ${b.status === "pending_provincial" || b.status === "endorsed" || b.status === "approved" || b.status === "completed"
                            ? "text-emerald-700"
                            : b.status === "pending_admin_head"
                              ? "text-indigo-700"
                              : "text-slate-400"
                          }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${b.status === "pending_provincial" || b.status === "endorsed" || b.status === "approved" || b.status === "completed"
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
                        className={`flex items-center gap-1.5 font-semibold ${b.status === "approved" || b.status === "completed"
                            ? "text-emerald-700"
                            : b.status === "pending_provincial" || b.status === "endorsed"
                              ? "text-purple-700"
                              : "text-slate-400"
                          }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${b.status === "approved" || b.status === "completed"
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
                        className={`flex items-center gap-1.5 font-semibold ${b.status === "completed"
                            ? "text-teal-700"
                            : "text-slate-400"
                          }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${b.status === "completed"
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
                            <span>แจ้งเตือนคืนรถในระบบ</span>
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
                  className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${formReviewerType === "head"
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
                  className={`p-3.5 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all ${formReviewerType === "official"
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
                  value={formDispatcherId || fleetDispatchers[0]?.id || ""}
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
                    ตามระเบียบการใช้รถยนต์ส่วนกลาง ผู้ขอใช้รถไม่ต้องเลือกรถยนต์เอง — <strong>เจ้าหน้าที่ฝ่ายบริหารทั่วไป (หัวหน้าฝ่ายบริหารทั่วไป หรือ คุณปภาวิน)</strong> จะเป็นผู้ตรวจสอบสถานะความพร้อมและจัดสรรรถยนต์และพนักงานขับรถที่เหมาะสมและว่างให้ในขั้นตอนที่ 2
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      สถานที่ปลายทาง / พื้นที่ปฏิบัติงาน <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      🎯 ปลายทางด่วน จ.กำแพงเพชร
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ตำบลคลองลานพัฒนา อำเภอคลองลาน จังหวัดกำแพงเพชร"
                    value={formDestination}
                    onChange={(e) => setFormDestination(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-teal-500 transition-colors"
                  />

                  {/* District Presets Chips */}
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>⚡ คลิกเลือกเพื่อใส่ปลายทางและระยะทางไป-กลับอัตโนมัติ:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-100/70 rounded-xl border border-slate-200">
                      {KAMPHAENG_PHET_DISTRICTS.map((dst) => {
                        const isSelected = formDestination.includes(dst.name.replace("อ.", ""));
                        return (
                          <button
                            key={dst.name}
                            type="button"
                            onClick={() => {
                              setFormDestination(dst.destination);
                              setFormEstimatedDistance(dst.roundTripKm);
                              if (formFuelBudgetRequested) {
                                setFormFuelBudgetAmount(
                                  Math.round((dst.roundTripKm * formFuelConsumptionRate) / 50) * 50
                                );
                              }
                            }}
                            className={`px-2 py-1 rounded-lg text-[11px] transition-all cursor-pointer flex items-center gap-1 ${isSelected
                                ? "bg-teal-600 text-white font-bold shadow-xs ring-1 ring-teal-400"
                                : "bg-white text-slate-700 border border-slate-200 hover:border-teal-400 hover:bg-teal-50/60 font-medium"
                              }`}
                          >
                            <span>{dst.name}</span>
                            <span className={isSelected ? "text-teal-100 text-[10px]" : "text-teal-600 text-[10px]"}>
                              ({dst.roundTripKm} กม.)
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
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
                    จำนวนผู้โดยสาร (คน)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={formPassengerCount}
                    onChange={(e) => setFormPassengerCount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-teal-500 transition-colors"
                  />
                  <div className="text-[10px] text-teal-800 bg-teal-50/90 border border-teal-200/70 p-1.5 rounded-lg mt-1.5 font-medium leading-tight">
                    <span>👥 มีคนนั่งทั้งสิ้น: </span>
                    <strong className="text-teal-950 font-bold">{totalPassengerCountWithDriver} คน</strong>
                    <span className="text-[9px] text-teal-700 block mt-0.5">
                      (ผู้ขอ 1 + ร่วม {selectedPassengers.length} + {formRequireDriver ? "คนขับส่วนกลาง 1" : `คนขับ: ${selectedStaffDriver?.name ? selectedStaffDriver.name.split(" ")[0] : "ขับเอง"}`})
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ระยะทางโดยประมาณ (กม.)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formEstimatedDistance}
                    onChange={(e) => {
                      const dist = Number(e.target.value);
                      setFormEstimatedDistance(dist);
                      if (formFuelBudgetRequested) {
                        setFormFuelBudgetAmount(Math.round((dist * formFuelConsumptionRate) / 50) * 50);
                      }
                    }}
                    placeholder="เช่น 150"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:border-teal-500 transition-colors font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    (ไป-กลับ ตามแผนการเดินทาง)
                  </span>
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

            {/* Driver Requirement toggle & Staff Driver Selection */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-slate-800">
                    ต้องการพนักงานขับรถยนต์ราชการ
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {formRequireDriver
                      ? "ฝ่ายบริหารทั่วไปจะเป็นผู้จัดสรรพนักงานขับรถราชการส่วนกลางให้ในขั้นตอนที่ 2"
                      : "ไม่ใช้พนักงานขับรถส่วนกลาง — ต้องเลือกเจ้าหน้าที่ผู้รับผิดชอบขับขี่รถยนต์จากรายชื่อ"}
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRequireDriver}
                    onChange={(e) => {
                      const req = e.target.checked;
                      setFormRequireDriver(req);
                      if (!req && !formSelectedStaffDriverId) {
                        setFormSelectedStaffDriverId(currentUser?.id || "");
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0D9488]"></div>
                </label>
              </div>

              {/* Selection sub-panel when formRequireDriver is false */}
              {!formRequireDriver && (
                <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200 space-y-2.5 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-blue-950 flex items-center gap-1.5">
                      <span>🚗</span>
                      <span>เลือกเจ้าหน้าที่ผู้ทำหน้าที่ขับขี่รถยนต์ราชการ <span className="text-rose-500">*</span></span>
                    </label>
                    <span className="text-[10px] text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200 font-bold shadow-2xs">
                      ระบุเจ้าหน้าที่ผู้ขับขี่
                    </span>
                  </div>

                  <p className="text-[11px] text-blue-800/80 leading-relaxed">
                    ตามระเบียบการใช้รถราชการกรณีไม่ขอพนักงานขับรถส่วนกลาง ผู้ขอใช้รถจะต้องระบุเจ้าหน้าที่ผู้มีใบอนุญาตขับขี่และรับผิดชอบการขับขี่ในภารกิจนี้:
                  </p>

                  <select
                    required={!formRequireDriver}
                    value={formSelectedStaffDriverId || currentUser.id}
                    onChange={(e) => setFormSelectedStaffDriverId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-blue-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  >
                    <option value={currentUser.id}>
                      👤 {currentUser.name} ({currentUser.position}) - [ผู้ขอใช้รถขับขี่เอง]
                    </option>

                    {selectedPassengers.length > 0 && (
                      <optgroup label="── ผู้ร่วมเดินทางในภารกิจนี้ ──">
                        {selectedPassengers.map((p) => (
                          <option key={`co_${p.id}`} value={p.id}>
                            🚗 {p.name} ({p.division || p.position})
                          </option>
                        ))}
                      </optgroup>
                    )}

                    <optgroup label="── ข้าราชการ/เจ้าหน้าที่สังกัด สนง.พมจ.กำแพงเพชร ──">
                      {members
                        .filter((m) => m.id !== currentUser.id && !selectedPassengers.some((p) => p.id === m.id))
                        .map((m) => (
                          <option key={`m_${m.id}`} value={m.id}>
                            {m.name} ({m.division || m.position})
                          </option>
                        ))}
                    </optgroup>
                  </select>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-blue-200/60 text-[11px] text-blue-900">
                    <span className="flex items-center gap-1.5">
                      <span>✓ เจ้าหน้าที่ผู้ขับขี่ที่ระบุในคำขอ:</span>
                      <strong className="text-blue-950 font-bold underline">
                        {selectedStaffDriver?.name}
                      </strong>
                      <span className="text-blue-700 font-normal">
                        ({selectedStaffDriver?.position})
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-500">
                      * จะระบุในเอกสารขอใช้รถ &quot;โดยมี &#123;คนขับ&#125; เป็นพนักงานขับรถยนต์&quot;
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Fuel Budget Request Section (Template & Auto Distance-Rate Calculation) */}
            <div className="p-4.5 bg-gradient-to-br from-amber-50/60 via-teal-50/50 to-white rounded-2xl border border-amber-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <span className="text-base">⛽</span>
                    <span>ขอรับการสนับสนุนงบประมาณค่าน้ำมันเชื้อเพลิงและหล่อลื่น (ถ้ามี)</span>
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ระบบคำนวณระยะทางและค่าน้ำมันอัตโนมัติตามอัตราสิ้นเปลือง พร้อมระบุโครงการที่ขอเบิกตามแบบฟอร์ม
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formFuelBudgetRequested}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      setFormFuelBudgetRequested(enabled);
                      if (enabled) {
                        setFormFuelBudgetAmount(calculatedFuelEstimate.rounded);
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0D9488]"></div>
                </label>
              </div>

              {formFuelBudgetRequested && (
                <div className="space-y-4 pt-3 border-t border-amber-200/70 text-xs">
                  {/* Rate Selection & Live Calculation Formula */}
                  <div className="p-3.5 bg-white rounded-xl border border-amber-200/90 shadow-2xs space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <span>⚡</span>
                        <span>อัตราคำนวณค่าน้ำมันต่อระยะทาง (บาท / กิโลเมตร):</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        {[
                          { label: "3.50 บ./กม. (เก๋ง/อีโคคาร์)", rate: 3.5 },
                          { label: "4.00 บ./กม. (มาตรฐาน ดีเซล)", rate: 4.0 },
                          { label: "4.50 บ./กม. (รถตู้ / 4WD)", rate: 4.5 },
                        ].map((opt) => (
                          <button
                            key={opt.rate}
                            type="button"
                            onClick={() => {
                              setFormFuelConsumptionRate(opt.rate);
                              const newAmt = Math.round((formEstimatedDistance * opt.rate) / 50) * 50;
                              setFormFuelBudgetAmount(newAmt);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${formFuelConsumptionRate === opt.rate
                                ? "bg-amber-500 text-white shadow-xs"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Formula Bar */}
                    <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="space-y-0.5">
                        <div className="text-slate-600 font-medium">
                          สูตรคำนวณ:{" "}
                          <span className="font-mono font-bold text-slate-900">
                            {formEstimatedDistance} กม. × {formFuelConsumptionRate.toFixed(2)} บ./กม.
                          </span>{" "}
                          = <span className="font-mono font-bold text-amber-900">{calculatedFuelEstimate.exact.toLocaleString()} บาท</span>
                        </div>
                        <div className="text-[11px] text-amber-800">
                          ปัดเศษเบิกจ่ายราชการ (รอบละ 50 บาท):{" "}
                          <strong className="text-amber-950 font-bold text-xs font-mono">
                            {calculatedFuelEstimate.rounded.toLocaleString()} บาท
                          </strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setFormFuelBudgetAmount(calculatedFuelEstimate.rounded)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <span>⚡</span>
                        <span>ใช้อัตราคำนวณนี้ ({calculatedFuelEstimate.rounded.toLocaleString()} บาท)</span>
                      </button>
                    </div>
                  </div>

                  {/* Amount & Project Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        จำนวนเงินงบประมาณค่าน้ำมันที่ขอเบิก (บาท) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={100}
                        step={50}
                        required={formFuelBudgetRequested}
                        value={formFuelBudgetAmount}
                        onChange={(e) => setFormFuelBudgetAmount(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 bg-white border border-teal-300 rounded-xl text-xs font-mono font-bold text-teal-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                        placeholder="เช่น 1,200"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        (ระบุจำนวนเงินที่จะปรากฏในช่อง &quot;จำนวน &#123;ขอเบิกบิลเติมน้ำมัน&#125; บาท&quot;)
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        โครงการ / แหล่งงบประมาณที่ขอเบิก <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required={formFuelBudgetRequested}
                        value={formFuelProjectName}
                        onChange={(e) => {
                          setFormFuelProjectName(e.target.value);
                          setFormFuelBudgetSource(e.target.value);
                        }}
                        className="w-full px-3.5 py-2.5 bg-white border border-teal-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                        placeholder="เช่น งบดำเนินงานสำนักงาน พมจ.กำแพงเพชร"
                      />
                    </div>
                  </div>

                  {/* Preset Project Chips */}
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-[11px] font-bold text-slate-600">
                      💡 แหล่งงบประมาณ / โครงการที่ขอเบิกบ่อย (คลิกเลือกด่วน):
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {FUEL_PROJECT_PRESETS.map((proj) => {
                        const isSelected = formFuelProjectName === proj;
                        return (
                          <button
                            key={proj}
                            type="button"
                            onClick={() => {
                              setFormFuelProjectName(proj);
                              setFormFuelBudgetSource(proj);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] transition-all cursor-pointer ${isSelected
                                ? "bg-teal-700 text-white font-bold shadow-2xs"
                                : "bg-white text-slate-700 border border-slate-200 hover:border-teal-300 hover:bg-teal-50"
                              }`}
                          >
                            {isSelected ? "✓ " : ""}{proj}
                          </button>
                        );
                      })}
                    </div>
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
                <span>ยืนยันและส่งคำขอใช้รถ (แจ้งเตือนศูนย์การแจ้งเตือนในระบบ)</span>
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
          members={members}
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

      {/* ─── MODAL: Notification Logs & Line Alerts ─── */}
      {(selectedNotifBooking || isNotificationHubOpen) && (
        <NotificationLogsModal
          booking={selectedNotifBooking}
          allBookings={bookings}
          currentUser={currentUser}
          onClose={() => {
            setSelectedNotifBooking(null);
            setIsNotificationHubOpen(false);
          }}
          onSelectBooking={(b) => {
            setSelectedDocBooking(b);
          }}
        />
      )}
    </div>
  );
}
