"use client";

import React, { useState, useMemo } from "react";
import { Vehicle, CarBookingRequest, BookingStatus } from "@/lib/types";
import {
  THAI_MONTH_NAMES,
  THAI_SHORT_MONTH_NAMES,
  THAI_DAY_NAMES,
  THAI_SHORT_DAY_NAMES,
} from "@/lib/calendar";

export interface CarBookingCalendarViewProps {
  vehicles: Vehicle[];
  bookings: CarBookingRequest[];
  onSelectBooking?: (booking: CarBookingRequest) => void;
  onRequestVehicle?: (vehicleId: string, initialDate?: string) => void;
}

interface CalendarCell {
  date: Date;
  isoDate: string;
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  bookings: CarBookingRequest[];
}

// Category styling config
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; badge: string; icon: string }> = {
  van: {
    bg: "bg-teal-50",
    text: "text-teal-800",
    border: "border-teal-200",
    badge: "bg-teal-600 text-white",
    icon: "🚐",
  },
  pickup: {
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    badge: "bg-emerald-600 text-white",
    icon: "🛻",
  },
  sedan: {
    bg: "bg-indigo-50",
    text: "text-indigo-800",
    border: "border-indigo-200",
    badge: "bg-indigo-600 text-white",
    icon: "🚗",
  },
  default: {
    bg: "bg-sky-50",
    text: "text-sky-800",
    border: "border-sky-200",
    badge: "bg-sky-600 text-white",
    icon: "🚙",
  },
};

function getVehicleCategoryStyle(category?: string) {
  if (!category) return CATEGORY_COLORS.default;
  const c = category.toLowerCase();
  if (c.includes("ตู้")) return CATEGORY_COLORS.van;
  if (c.includes("กระบะ") || c.includes("บรรทุก") || c.includes("ตรวจการณ์")) return CATEGORY_COLORS.pickup;
  if (c.includes("บุคคล") || c.includes("เก๋ง") || c.includes("ประจำตำแหน่ง")) return CATEGORY_COLORS.sedan;
  return CATEGORY_COLORS.default;
}

// Status config
const STATUS_CONFIG: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
  approved: {
    label: "อนุมัติแล้ว",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
    dotClass: "bg-emerald-500",
  },
  completed: {
    label: "เสร็จสิ้น/คืนรถแล้ว",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
    dotClass: "bg-slate-400",
  },
  pending_division_head: {
    label: "รอหัวหน้าฝ่ายเห็นชอบ",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
    dotClass: "bg-amber-500",
  },
  pending_fleet_assignment: {
    label: "รอจัดสรรรถ/คนขับ",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-300",
    dotClass: "bg-orange-500",
  },
  pending_admin_head: {
    label: "รอ หน.บริหารเห็นชอบ",
    badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-300",
    dotClass: "bg-yellow-500",
  },
  pending_provincial: {
    label: "รอ พมจ. อนุมัติ",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-300",
    dotClass: "bg-purple-500",
  },
  pending_review: {
    label: "รอพิจารณา",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
    dotClass: "bg-amber-500",
  },
  endorsed: {
    label: "ผ่านความเห็นชอบ",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
    dotClass: "bg-blue-500",
  },
  rejected: {
    label: "ไม่อนุมัติ",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
    dotClass: "bg-rose-500",
  },
  cancelled: {
    label: "ยกเลิกแล้ว",
    badgeClass: "bg-slate-100 text-slate-500 border-slate-200 line-through",
    dotClass: "bg-slate-300",
  },
};

const DEFAULT_STATUS_ITEM = {
  label: "รอพิจารณา",
  badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
  dotClass: "bg-amber-500",
};

function formatIsoDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateToIsoDateOnly(dateStr?: string): string {
  if (!dateStr) return "";
  if (dateStr.includes("T")) return dateStr.split("T")[0];
  if (dateStr.includes(" ")) return dateStr.split(" ")[0];
  return dateStr;
}

export function CarBookingCalendarView({
  vehicles,
  bookings,
  onSelectBooking,
  onRequestVehicle,
}: CarBookingCalendarViewProps) {
  // View mode: day | week | month
  const [viewMode, setViewMode] = useState<"day" | "week" | "month">("month");

  // Navigation date
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  // Selected date for Daily Agenda in Month View
  const [selectedIsoDate, setSelectedIsoDate] = useState<string>(() => {
    return formatIsoDateOnly(new Date());
  });

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Active bookings filter (exclude cancelled and rejected from main calendar)
  const activeBookings = useMemo(() => {
    return bookings.filter(
      (b) => b.status !== "rejected" && (b.status as string) !== "cancelled"
    );
  }, [bookings]);

  // Vehicle map for quick vehicle lookup
  const vehicleMap = useMemo(() => {
    const map = new Map<string, Vehicle>();
    vehicles.forEach((v) => map.set(v.id, v));
    return map;
  }, [vehicles]);

  // Unique vehicle categories
  const vehicleCategories = useMemo(() => {
    const set = new Set<string>();
    vehicles.forEach((v) => {
      if (v.category) set.add(v.category);
    });
    return Array.from(set);
  }, [vehicles]);

  // Filtered vehicles based on category and search query
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (categoryFilter !== "all" && v.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = v.name?.toLowerCase().includes(q);
        const matchPlate = v.licensePlate?.toLowerCase().includes(q);
        const matchDriver = v.driverName?.toLowerCase().includes(q);
        if (!matchName && !matchPlate && !matchDriver) return false;
      }
      return true;
    });
  }, [vehicles, categoryFilter, searchQuery]);

  // Filtered bookings based on selected vehicle category / search query
  const filteredBookings = useMemo(() => {
    return activeBookings.filter((b) => {
      const v = vehicleMap.get(b.vehicleId);
      if (categoryFilter !== "all" && v?.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchPlate = b.licensePlate?.toLowerCase().includes(q);
        const matchPurpose = b.purpose?.toLowerCase().includes(q);
        const matchDest = b.destination?.toLowerCase().includes(q);
        const matchRequester = b.requesterName?.toLowerCase().includes(q);
        const matchDriver = (b.assignedDriver || "")?.toLowerCase().includes(q);
        if (!matchPlate && !matchPurpose && !matchDest && !matchRequester && !matchDriver) {
          return false;
        }
      }
      return true;
    });
  }, [activeBookings, vehicleMap, categoryFilter, searchQuery]);

  // Check if booking is active on a specific target date (supports multi-day span)
  const isBookingOnDate = (b: CarBookingRequest, targetIsoDate: string): boolean => {
    const startIso = parseDateToIsoDateOnly(b.departureTime);
    const endIso = parseDateToIsoDateOnly(b.returnTime) || startIso;
    return targetIsoDate >= startIso && targetIsoDate <= endIso;
  };

  // Map bookings by date for O(1) lookup
  const getBookingsForIsoDate = (isoDate: string): CarBookingRequest[] => {
    return filteredBookings.filter((b) => isBookingOnDate(b, isoDate));
  };

  // ─── NAVIGATION HANDLERS ───
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === "month") {
      next.setMonth(next.getMonth() - 1);
    } else if (viewMode === "week") {
      next.setDate(next.getDate() - 7);
    } else {
      next.setDate(next.getDate() - 1);
    }
    setCurrentDate(next);
    if (viewMode === "day") {
      setSelectedIsoDate(formatIsoDateOnly(next));
    }
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === "month") {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === "week") {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 1);
    }
    setCurrentDate(next);
    if (viewMode === "day") {
      setSelectedIsoDate(formatIsoDateOnly(next));
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedIsoDate(formatIsoDateOnly(now));
  };

  // ─── THAI HEADER TITLE COMPUTATION ───
  const navigationTitle = useMemo(() => {
    const thaiYear = currentDate.getFullYear() + 543;
    if (viewMode === "month") {
      return `${THAI_MONTH_NAMES[currentDate.getMonth()]} ${thaiYear}`;
    }
    if (viewMode === "day") {
      const dayName = THAI_DAY_NAMES[currentDate.getDay()];
      const dayNum = currentDate.getDate();
      const monthName = THAI_MONTH_NAMES[currentDate.getMonth()];
      return `วัน${dayName}ที่ ${dayNum} ${monthName} ${thaiYear}`;
    }
    // Week mode
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday
    startOfWeek.setDate(diff);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);

    const startD = startOfWeek.getDate();
    const startM = THAI_SHORT_MONTH_NAMES[startOfWeek.getMonth()];
    const endD = endOfWeek.getDate();
    const endM = THAI_SHORT_MONTH_NAMES[endOfWeek.getMonth()];
    const endY = endOfWeek.getFullYear() + 543;

    if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
      return `${startD} - ${endD} ${startM} ${endY}`;
    }
    return `${startD} ${startM} - ${endD} ${endM} ${endY}`;
  }, [currentDate, viewMode]);

  // ─── MONTH VIEW DATA PREPARATION ───
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const todayStr = formatIsoDateOnly(new Date());

    const cells: CalendarCell[] = [];

    // Prev month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(year, month - 1, dayNum);
      const iso = formatIsoDateOnly(d);
      cells.push({
        date: d,
        isoDate: iso,
        dayNum,
        isCurrentMonth: false,
        isToday: iso === todayStr,
        bookings: getBookingsForIsoDate(iso),
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const iso = formatIsoDateOnly(d);
      cells.push({
        date: d,
        isoDate: iso,
        dayNum: i,
        isCurrentMonth: true,
        isToday: iso === todayStr,
        bookings: getBookingsForIsoDate(iso),
      });
    }

    // Next month leading days (fill up to 35 or 42 grid cells)
    const totalFilled = cells.length;
    const targetLength = totalFilled > 35 ? 42 : 35;
    for (let i = 1; i <= targetLength - totalFilled; i++) {
      const d = new Date(year, month + 1, i);
      const iso = formatIsoDateOnly(d);
      cells.push({
        date: d,
        isoDate: iso,
        dayNum: i,
        isCurrentMonth: false,
        isToday: iso === todayStr,
        bookings: getBookingsForIsoDate(iso),
      });
    }

    return cells;
  }, [year, month, filteredBookings]);

  // Selected Day's bookings for Daily Agenda
  const selectedDayBookings = useMemo(() => {
    return getBookingsForIsoDate(selectedIsoDate);
  }, [selectedIsoDate, filteredBookings]);

  // Selected Day Thai Header
  const selectedDayThaiHeader = useMemo(() => {
    try {
      const [y, m, d] = selectedIsoDate.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayName = THAI_DAY_NAMES[dateObj.getDay()];
      const thaiYear = y + 543;
      return `วัน${dayName}ที่ ${d} ${THAI_MONTH_NAMES[m - 1]} ${thaiYear}`;
    } catch {
      return selectedIsoDate;
    }
  }, [selectedIsoDate]);

  // ─── WEEK VIEW DATA PREPARATION ───
  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    start.setDate(diff);

    const days: { date: Date; isoDate: string; dayName: string; dayNum: number; isToday: boolean; bookings: CarBookingRequest[] }[] = [];
    const todayStr = formatIsoDateOnly(new Date());

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = formatIsoDateOnly(d);
      days.push({
        date: d,
        isoDate: iso,
        dayName: THAI_SHORT_DAY_NAMES[d.getDay()],
        dayNum: d.getDate(),
        isToday: iso === todayStr,
        bookings: getBookingsForIsoDate(iso),
      });
    }
    return days;
  }, [currentDate, filteredBookings]);

  // Hours array for Week and Day view: 06:00 to 19:00 (14 hours)
  const HOURS = useMemo(() => [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19], []);

  // ─── DAY VIEW METRICS ───
  const dayViewMetrics = useMemo(() => {
    const dayBookings = getBookingsForIsoDate(selectedIsoDate);
    const busyVehicleIds = new Set(dayBookings.map((b) => b.vehicleId));
    let availableCount = 0;
    let busyCount = 0;
    let maintenanceCount = 0;

    filteredVehicles.forEach((v) => {
      if (v.status === "maintenance") {
        maintenanceCount++;
      } else if (busyVehicleIds.has(v.id)) {
        busyCount++;
      } else {
        availableCount++;
      }
    });

    return {
      total: filteredVehicles.length,
      availableCount,
      busyCount,
      maintenanceCount,
      bookingsCount: dayBookings.length,
    };
  }, [filteredVehicles, selectedIsoDate, filteredBookings]);

  // Helper to format time string from ISO or date string
  const formatTimeOnly = (dtStr?: string): string => {
    if (!dtStr) return "";
    if (dtStr.includes("T")) {
      const t = dtStr.split("T")[1];
      return t.slice(0, 5) + " น.";
    }
    if (dtStr.includes(" ")) {
      const t = dtStr.split(" ")[1];
      return t.slice(0, 5) + " น.";
    }
    return dtStr;
  };

  return (
    <div className="space-y-4">
      {/* ─── 1. TOP CONTROL BAR ─── */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* View Mode Segmented Controls */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 w-fit">
            <button
              type="button"
              onClick={() => {
                setViewMode("day");
                setSelectedIsoDate(formatIsoDateOnly(currentDate));
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "day"
                  ? "bg-white text-teal-800 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>☀️</span>
              <span>รายวัน (Day)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "week"
                  ? "bg-white text-teal-800 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>📅</span>
              <span>รายสัปดาห์ (Week)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "month"
                  ? "bg-white text-teal-800 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>🗓️</span>
              <span>รายเดือน (Month)</span>
            </button>
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              className="p-2 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer text-xs font-bold flex items-center justify-center w-8 h-8"
              title="ก่อนหน้า"
            >
              ◀
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              วันนี้
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-2 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer text-xs font-bold flex items-center justify-center w-8 h-8"
              title="ถัดไป"
            >
              ▶
            </button>
            <div className="font-extrabold text-slate-800 text-sm md:text-base px-2">
              {navigationTitle}
            </div>
          </div>

          {/* Quick Action Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onRequestVehicle?.(vehicles[0]?.id || "veh_1", selectedIsoDate)}
              className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-teal-700/20 transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
            >
              <span>➕</span>
              <span>ยื่นคำขอใช้รถใหม่</span>
            </button>
          </div>
        </div>

        {/* Vehicle Filter Pills & Search */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 mr-1">กรองประเภท:</span>
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === "all"
                  ? "bg-slate-800 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              ทั้งหมด ({vehicles.length})
            </button>
            {vehicleCategories.map((cat) => {
              const count = vehicles.filter((v) => v.category === cat).length;
              const isSelected = categoryFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-teal-700 text-white shadow-xs"
                      : "bg-teal-50/70 text-teal-800 hover:bg-teal-100 border border-teal-200/50"
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="ค้นหาทะเบียน, ภารกิจ, คนขับ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            />
            <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── 2. VIEW MODE: MONTH ─── */}
      {viewMode === "month" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Month Calendar Grid (8 cols on desktop) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center">
              {THAI_DAY_NAMES.map((name, idx) => {
                const isWeekend = idx === 0 || idx === 6;
                return (
                  <div
                    key={name}
                    className={`py-2 text-[11px] font-bold ${
                      isWeekend ? "text-rose-600" : "text-slate-700"
                    }`}
                  >
                    {name}
                  </div>
                );
              })}
            </div>

            {/* Calendar Cells Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 bg-slate-100/50">
              {calendarCells.map((cell) => {
                const isSelected = cell.isoDate === selectedIsoDate;
                const hasBookings = cell.bookings.length > 0;

                return (
                  <div
                    key={cell.isoDate}
                    onClick={() => setSelectedIsoDate(cell.isoDate)}
                    className={`min-h-[105px] p-1.5 bg-white transition-all cursor-pointer relative flex flex-col justify-between group hover:bg-teal-50/40 ${
                      !cell.isCurrentMonth ? "opacity-40 bg-slate-50/50" : ""
                    } ${isSelected ? "ring-2 ring-teal-500 ring-inset bg-teal-50/30" : ""}`}
                  >
                    {/* Top Row: Date Number & Badges */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all ${
                          cell.isToday
                            ? "bg-teal-600 text-white font-extrabold shadow-xs"
                            : isSelected
                            ? "bg-teal-100 text-teal-900 font-extrabold"
                            : "text-slate-700 group-hover:text-teal-700"
                        }`}
                      >
                        {cell.dayNum}
                      </span>

                      {hasBookings && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                          {cell.bookings.length} คัน
                        </span>
                      )}
                    </div>

                    {/* Booking Chips */}
                    <div className="space-y-1 my-1 flex-1 overflow-hidden">
                      {cell.bookings.slice(0, 2).map((b) => {
                        const v = vehicleMap.get(b.vehicleId);
                        const catStyle = getVehicleCategoryStyle(v?.category);
                        const status = STATUS_CONFIG[b.status] || DEFAULT_STATUS_ITEM;
                        const timeStr = formatTimeOnly(b.departureTime);

                        return (
                          <div
                            key={b.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectBooking?.(b);
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] border truncate flex items-center gap-1 hover:brightness-95 transition-all shadow-2xs ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                            title={`${b.licensePlate} (${timeStr}): ${b.destination} โดย ${b.requesterName}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dotClass}`} />
                            <span className="font-bold truncate">{b.licensePlate}</span>
                            <span className="text-[9px] opacity-75 truncate">{b.destination}</span>
                          </div>
                        );
                      })}

                      {cell.bookings.length > 2 && (
                        <div className="text-[9px] text-teal-700 font-bold px-1 text-right">
                          + อีก {cell.bookings.length - 2} รายการ
                        </div>
                      )}
                    </div>

                    {/* Bottom Quick-Add Hover Indicator */}
                    <div className="opacity-0 group-hover:opacity-100 text-[9px] text-teal-600 font-bold transition-opacity text-right">
                      คลิกดูรายละเอียด
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Daily Agenda Drawer (4 cols on desktop) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div>
                  <div className="text-[11px] font-bold text-teal-600 flex items-center gap-1">
                    <span>🗓️ วาระการใช้รถยนต์</span>
                  </div>
                  <div className="text-sm font-extrabold text-slate-800">
                    {selectedDayThaiHeader}
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-teal-50 text-teal-800 rounded-full text-xs font-bold border border-teal-200">
                  {selectedDayBookings.length} ภารกิจ
                </span>
              </div>

              {/* Bookings List */}
              <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
                {selectedDayBookings.length === 0 ? (
                  <div className="py-12 px-4 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                    <span className="text-3xl block mb-2">✨</span>
                    <div className="text-xs font-bold text-slate-700 mb-1">
                      ไม่มีภารกิจการใช้รถในวันนี้
                    </div>
                    <p className="text-[11px] text-slate-400">
                      รถยนต์ราชการทุกคันพร้อมสำหรับการจัดสรรและออกปฏิบัติหน้าที่
                    </p>
                    <button
                      type="button"
                      onClick={() => onRequestVehicle?.(vehicles[0]?.id || "veh_1", selectedIsoDate)}
                      className="mt-4 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      + ขอใช้รถในวันนี้
                    </button>
                  </div>
                ) : (
                  selectedDayBookings.map((b) => {
                    const v = vehicleMap.get(b.vehicleId);
                    const catStyle = getVehicleCategoryStyle(v?.category);
                    const status = STATUS_CONFIG[b.status] || DEFAULT_STATUS_ITEM;
                    const depTime = formatTimeOnly(b.departureTime);
                    const retTime = formatTimeOnly(b.returnTime);
                    const driverDisplay = b.assignedDriver || v?.driverName || "พนักงานขับรถส่วนกลาง";

                    return (
                      <div
                        key={b.id}
                        className="p-3 rounded-xl border border-slate-200 bg-white hover:border-teal-300 hover:shadow-sm transition-all space-y-2 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">{catStyle.icon}</span>
                            <div>
                              <div className="text-xs font-extrabold text-slate-800">
                                {b.licensePlate}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {v?.name || b.vehicleName || "รถยนต์ราชการ"}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.badgeClass}`}
                          >
                            {status.label}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-2 rounded-lg text-xs space-y-1">
                          <div className="font-bold text-slate-800 flex items-center gap-1 text-[11px]">
                            <span>⏰</span>
                            <span>{depTime} - {retTime}</span>
                          </div>
                          <div className="text-slate-600 flex items-start gap-1 text-[11px]">
                            <span className="shrink-0">📍</span>
                            <span>{b.destination}</span>
                          </div>
                          <div className="text-slate-500 text-[10px] line-clamp-2">
                            🎯 ภารกิจ: {b.purpose}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                          <div>
                            <div>👤 ผู้ขอ: <strong className="text-slate-700">{b.requesterName}</strong></div>
                            <div className="text-[10px] text-slate-400">🚘 คนขับ: {driverDisplay}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onSelectBooking?.(b)}
                            className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <span>📄</span>
                            <span>ดูใบขอใช้รถ</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Bottom Button */}
            <div className="pt-3 border-t border-slate-100 mt-3">
              <button
                type="button"
                onClick={() => onRequestVehicle?.(vehicles[0]?.id || "veh_1", selectedIsoDate)}
                className="w-full py-2 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-800 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>➕</span>
                <span>ขอใช้รถในวันที่ {selectedIsoDate}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 3. VIEW MODE: WEEK ─── */}
      {viewMode === "week" && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Header Row with Days */}
          <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50 text-center">
            <div className="py-2.5 text-[11px] font-bold text-slate-400 border-r border-slate-200">
              เวลา
            </div>
            {weekDays.map((d) => (
              <div
                key={d.isoDate}
                className={`py-2 text-center border-r border-slate-200 last:border-r-0 ${
                  d.isToday ? "bg-teal-50/80" : ""
                }`}
              >
                <div className="text-[11px] font-bold text-slate-600">{d.dayName}</div>
                <div
                  className={`text-xs font-extrabold mx-auto w-6 h-6 flex items-center justify-center rounded-full mt-0.5 ${
                    d.isToday ? "bg-teal-600 text-white" : "text-slate-800"
                  }`}
                >
                  {d.dayNum}
                </div>
                <div className="text-[9px] text-teal-700 font-bold mt-0.5">
                  {d.bookings.length > 0 ? `${d.bookings.length} ภารกิจ` : "ว่าง"}
                </div>
              </div>
            ))}
          </div>

          {/* Time Rows */}
          <div className="divide-y divide-slate-100">
            {HOURS.map((hour) => {
              const hourStr = `${String(hour).padStart(2, "0")}:00`;
              return (
                <div key={hour} className="grid grid-cols-8 min-h-[52px]">
                  {/* Time label */}
                  <div className="p-2 text-[10px] font-bold text-slate-400 text-right pr-3 border-r border-slate-200 bg-slate-50/40">
                    {hourStr}
                  </div>

                  {/* Day Columns */}
                  {weekDays.map((day) => {
                    // Check bookings active during this hour
                    const hourBookings = day.bookings.filter((b) => {
                      const depTime = b.departureTime || "";
                      const retTime = b.returnTime || "";
                      let depH = 8;
                      let retH = 17;
                      if (depTime.includes("T")) depH = parseInt(depTime.split("T")[1].slice(0, 2), 10);
                      if (retTime.includes("T")) retH = parseInt(retTime.split("T")[1].slice(0, 2), 10);
                      return hour >= depH && hour <= retH;
                    });

                    return (
                      <div
                        key={day.isoDate + hour}
                        onClick={() => onRequestVehicle?.(vehicles[0]?.id || "veh_1", `${day.isoDate}T${hourStr}`)}
                        className={`p-1 border-r border-slate-100 last:border-r-0 hover:bg-teal-50/30 transition-colors cursor-pointer relative group ${
                          day.isToday ? "bg-teal-50/20" : ""
                        }`}
                      >
                        {hourBookings.map((b) => {
                          const v = vehicleMap.get(b.vehicleId);
                          const catStyle = getVehicleCategoryStyle(v?.category);
                          const status = STATUS_CONFIG[b.status] || DEFAULT_STATUS_ITEM;

                          // Only render chip on start hour or first visible hour to avoid clutter
                          const depTime = b.departureTime || "";
                          let depH = 8;
                          if (depTime.includes("T")) depH = parseInt(depTime.split("T")[1].slice(0, 2), 10);
                          const isStartHour = hour === depH || hour === 6;

                          if (!isStartHour && hourBookings.length > 1) {
                            return null;
                          }

                          return (
                            <div
                              key={b.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectBooking?.(b);
                              }}
                              className={`p-1 rounded text-[9px] border truncate flex flex-col gap-0.5 mb-1 shadow-2xs ${catStyle.bg} ${catStyle.text} ${catStyle.border} hover:brightness-95`}
                              title={`${b.licensePlate}: ${b.purpose} -> ${b.destination} (${b.requesterName})`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold truncate">{b.licensePlate}</span>
                                <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`} />
                              </div>
                              <div className="truncate opacity-80">{b.destination}</div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 4. VIEW MODE: DAY (FLEET TIMETABLE PER VEHICLE) ─── */}
      {viewMode === "day" && (
        <div className="space-y-4">
          {/* Day View Metric Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between shadow-2xs">
              <div>
                <div className="text-[10px] text-slate-500 font-bold">รถทั้งหมดในสังกัด</div>
                <div className="text-xl font-extrabold text-slate-800">{dayViewMetrics.total} คัน</div>
              </div>
              <span className="text-2xl">🚗</span>
            </div>
            <div className="bg-white rounded-xl border border-emerald-200 p-3 flex items-center justify-between shadow-2xs bg-emerald-50/20">
              <div>
                <div className="text-[10px] text-emerald-700 font-bold">ว่างพร้อมใช้งานวันนี้</div>
                <div className="text-xl font-extrabold text-emerald-800">{dayViewMetrics.availableCount} คัน</div>
              </div>
              <span className="text-2xl">🟢</span>
            </div>
            <div className="bg-white rounded-xl border border-amber-200 p-3 flex items-center justify-between shadow-2xs bg-amber-50/20">
              <div>
                <div className="text-[10px] text-amber-700 font-bold">มีภารกิจเดินทาง</div>
                <div className="text-xl font-extrabold text-amber-800">{dayViewMetrics.busyCount} คัน</div>
              </div>
              <span className="text-2xl">🟡</span>
            </div>
            <div className="bg-white rounded-xl border border-rose-200 p-3 flex items-center justify-between shadow-2xs bg-rose-50/20">
              <div>
                <div className="text-[10px] text-rose-700 font-bold">ซ่อมบำรุง / ตรวจสภาพ</div>
                <div className="text-xl font-extrabold text-rose-800">{dayViewMetrics.maintenanceCount} คัน</div>
              </div>
              <span className="text-2xl">🔴</span>
            </div>
          </div>

          {/* Fleet Timetable Grid */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Timetable Header */}
            <div className="grid grid-cols-12 border-b border-slate-200 bg-slate-50 py-2.5 px-4">
              <div className="col-span-12 md:col-span-4 text-xs font-bold text-slate-700">
                ข้อมูลรถยนต์ราชการ
              </div>
              <div className="col-span-12 md:col-span-8 hidden md:grid grid-cols-14 text-center text-[10px] font-bold text-slate-500">
                {HOURS.map((h) => (
                  <span key={h}>{String(h).padStart(2, "0")}</span>
                ))}
              </div>
            </div>

            {/* Vehicle Rows */}
            <div className="divide-y divide-slate-100">
              {filteredVehicles.map((vehicle) => {
                const catStyle = getVehicleCategoryStyle(vehicle.category);
                const vehicleBookings = selectedDayBookings.filter((b) => b.vehicleId === vehicle.id);
                const isMaintenance = vehicle.status === "maintenance";
                const isAvailable = !isMaintenance && vehicleBookings.length === 0;

                return (
                  <div
                    key={vehicle.id}
                    className="p-3 md:p-4 grid grid-cols-12 gap-3 items-center hover:bg-slate-50/60 transition-colors"
                  >
                    {/* Left Column: Vehicle Card */}
                    <div className="col-span-12 md:col-span-4 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                        {vehicle.image ? (
                          <img
                            src={vehicle.image}
                            alt={vehicle.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xl">{catStyle.icon}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-extrabold text-slate-900 truncate">
                            {vehicle.licensePlate}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                          >
                            {vehicle.category}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 truncate">{vehicle.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {vehicle.capacity} ที่นั่ง • คนขับ: {vehicle.driverName || "เวรส่วนกลาง"}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Timetable & Status */}
                    <div className="col-span-12 md:col-span-8">
                      {isMaintenance ? (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-xl text-xs flex items-center justify-between font-bold">
                          <span>🛠️ รถยนต์อยู่ระหว่างส่งซ่อมบำรุง / ตรวจสภาพตามระยะ</span>
                          <span className="text-[10px] text-rose-500 font-normal">งดการจัดสรร</span>
                        </div>
                      ) : isAvailable ? (
                        <div className="bg-emerald-50/60 border border-emerald-200/80 px-3 py-2 rounded-xl text-xs flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                            <span>✨</span>
                            <span>ว่างตลอดทั้งวัน พร้อมออกปฏิบัติภารกิจ</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRequestVehicle?.(vehicle.id, selectedIsoDate)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                          >
                            จองคันนี้
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {vehicleBookings.map((b) => {
                            const status = STATUS_CONFIG[b.status] || DEFAULT_STATUS_ITEM;
                            const depTime = formatTimeOnly(b.departureTime);
                            const retTime = formatTimeOnly(b.returnTime);

                            return (
                              <div
                                key={b.id}
                                onClick={() => onSelectBooking?.(b)}
                                className={`p-2 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer transition-all hover:brightness-95 ${catStyle.bg} ${catStyle.border}`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${status.dotClass}`} />
                                  <span className="text-xs font-bold text-slate-800 shrink-0">
                                    ⏰ {depTime} - {retTime}
                                  </span>
                                  <span className="text-xs text-slate-600 truncate">
                                    📍 {b.destination} ({b.purpose})
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[10px] text-slate-500">
                                    ผู้ขอ: {b.requesterName}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.badgeClass}`}
                                  >
                                    {status.label}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
