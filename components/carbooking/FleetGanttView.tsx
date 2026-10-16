"use client";

import React, { useState, useMemo } from "react";
import { Vehicle, CarBookingRequest, BookingStatus } from "@/lib/types";
import { parseBookingTime, isTimeRangeOverlap } from "@/lib/carbooking-data";

interface FleetGanttViewProps {
  vehicles: Vehicle[];
  bookings: CarBookingRequest[];
  onSelectBooking?: (booking: CarBookingRequest) => void;
  onRequestVehicle?: (vehicleId: string, initialDate?: string) => void;
}

export function FleetGanttView({
  vehicles,
  bookings,
  onSelectBooking,
  onRequestVehicle,
}: FleetGanttViewProps) {
  // Navigation State
  const [viewMode, setViewMode] = useState<"day" | "week">("day");
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  });
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Hovered / Popover Booking
  const [popoverBooking, setPopoverBooking] = useState<{
    booking: CarBookingRequest;
    x: number;
    y: number;
  } | null>(null);

  // Time Slots for Day View (06:00 to 20:00 = 14 hours)
  const START_HOUR = 6;
  const END_HOUR = 20;
  const TOTAL_HOURS = END_HOUR - START_HOUR;

  const hoursArray = useMemo(() => {
    const hours: number[] = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      hours.push(h);
    }
    return hours;
  }, [START_HOUR, END_HOUR]);

  // Week Days Array
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(selectedDate);
    const day = startOfWeek.getDay();
    // Thai work week starts on Monday (1)
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  }, [selectedDate]);

  // Date Navigation Handlers
  const handlePrev = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === "day") {
      newDate.setDate(selectedDate.getDate() - 1);
    } else {
      newDate.setDate(selectedDate.getDate() - 7);
    }
    setSelectedDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === "day") {
      newDate.setDate(selectedDate.getDate() + 1);
    } else {
      newDate.setDate(selectedDate.getDate() + 7);
    }
    setSelectedDate(newDate);
  };

  const handleToday = () => {
    const today = new Date();
    setSelectedDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  };

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      if (categoryFilter !== "all" && v.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = v.name.toLowerCase().includes(q);
        const matchPlate = v.licensePlate.toLowerCase().includes(q);
        const matchCat = v.category.toLowerCase().includes(q);
        if (!matchName && !matchPlate && !matchCat) return false;
      }
      return true;
    });
  }, [vehicles, categoryFilter, searchQuery]);

  // Unique Categories
  const categories = useMemo(() => {
    const cats = new Set(vehicles.map((v) => v.category));
    return Array.from(cats);
  }, [vehicles]);

  // Helpers
  const formatThaiDate = (date: Date) => {
    return date.toLocaleDateString("th-TH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isToday = (d: Date) => {
    const now = new Date();
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  };

  // Day View: Calculate left and width percentages for a booking
  const calculateDayBookingPosition = (
    booking: CarBookingRequest,
    targetDate: Date
  ): { leftPercent: number; widthPercent: number; isVisible: boolean } => {
    const depTime = parseBookingTime(booking.departureTime);
    const retTime = parseBookingTime(booking.returnTime);

    if (isNaN(depTime) || isNaN(retTime)) {
      return { leftPercent: 0, widthPercent: 0, isVisible: false };
    }

    const dayStart = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      START_HOUR,
      0,
      0
    ).getTime();

    const dayEnd = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      END_HOUR,
      0,
      0
    ).getTime();

    // Check overlap with the day view window
    if (retTime <= dayStart || depTime >= dayEnd) {
      return { leftPercent: 0, widthPercent: 0, isVisible: false };
    }

    const effectiveStart = Math.max(depTime, dayStart);
    const effectiveEnd = Math.min(retTime, dayEnd);

    const totalWindowMs = dayEnd - dayStart;
    const leftPercent = ((effectiveStart - dayStart) / totalWindowMs) * 100;
    const widthPercent = Math.max(
      ((effectiveEnd - effectiveStart) / totalWindowMs) * 100,
      2.5 // Minimum visible width
    );

    return { leftPercent, widthPercent, isVisible: true };
  };

  // Week View: check if booking overlaps with a specific day
  const getBookingsForVehicleAndDay = (
    vehicleId: string,
    targetDay: Date
  ): CarBookingRequest[] => {
    const dayStartStr = new Date(
      targetDay.getFullYear(),
      targetDay.getMonth(),
      targetDay.getDate(),
      0,
      0,
      0
    ).toISOString();

    const dayEndStr = new Date(
      targetDay.getFullYear(),
      targetDay.getMonth(),
      targetDay.getDate(),
      23,
      59,
      59
    ).toISOString();

    return bookings.filter((b) => {
      if (b.vehicleId !== vehicleId) return false;
      if (b.status === "rejected") return false;
      return isTimeRangeOverlap(dayStartStr, dayEndStr, b.departureTime, b.returnTime);
    });
  };

  // Styling helper for booking status
  const getBookingColorClasses = (status: BookingStatus) => {
    switch (status) {
      case "approved":
        return "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-xs";
      case "endorsed":
        return "bg-teal-600 hover:bg-teal-700 text-white border-teal-700 shadow-xs";
      case "pending_review":
        return "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs";
      case "completed":
        return "bg-slate-500 hover:bg-slate-600 text-white border-slate-600 shadow-xs";
      default:
        return "bg-slate-400 text-white border-slate-500";
    }
  };

  // Today marker calculation (Day View)
  const currentNowPercent = useMemo(() => {
    if (!isToday(selectedDate)) return null;
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    if (currentHour < START_HOUR || currentHour > END_HOUR) return null;
    return ((currentHour - START_HOUR) / TOTAL_HOURS) * 100;
  }, [selectedDate, START_HOUR, END_HOUR, TOTAL_HOURS]);

  // Utilization Stats for the Selected Date
  const dayStats = useMemo(() => {
    const targetDayStart = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      0,
      0,
      0
    ).toISOString();

    const targetDayEnd = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      23,
      59,
      59
    ).toISOString();

    const activeBookingsToday = bookings.filter((b) => {
      if (b.status === "rejected") return false;
      return isTimeRangeOverlap(
        targetDayStart,
        targetDayEnd,
        b.departureTime,
        b.returnTime
      );
    });

    const activeVehiclesSet = new Set(activeBookingsToday.map((b) => b.vehicleId));
    const totalVehicles = vehicles.length;
    const inUseVehicles = activeVehiclesSet.size;
    const availableVehicles = Math.max(0, totalVehicles - inUseVehicles);
    const utilizationRate =
      totalVehicles > 0 ? Math.round((inUseVehicles / totalVehicles) * 100) : 0;

    return {
      activeMissionsCount: activeBookingsToday.length,
      inUseVehicles,
      availableVehicles,
      utilizationRate,
    };
  }, [selectedDate, bookings, vehicles]);

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="p-4 md:p-5 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Date & Navigator */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={handlePrev}
                className="w-8 h-8 rounded-xl bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm shadow-2xs transition-colors cursor-pointer"
                title="ย้อนหลัง"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="px-3 h-8 text-xs font-bold text-slate-700 hover:bg-white rounded-xl transition-colors cursor-pointer"
              >
                วันนี้
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="w-8 h-8 rounded-xl bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-sm shadow-2xs transition-colors cursor-pointer"
                title="ถัดไป"
              >
                ▶
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xl">📅</span>
              <div>
                <div className="text-sm font-bold text-slate-900">
                  {formatThaiDate(selectedDate)}
                </div>
                {viewMode === "week" && (
                  <div className="text-[11px] text-teal-700 font-medium">
                    สัปดาห์: {weekDays[0].toLocaleDateString("th-TH", { day: "numeric", month: "short" })} -{" "}
                    {weekDays[6].toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* View Mode Toggle & Filters */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* View Mode */}
            <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode("day")}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  viewMode === "day"
                    ? "bg-white text-teal-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                รายวัน (24 ชม.)
              </button>
              <button
                type="button"
                onClick={() => setViewMode("week")}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  viewMode === "week"
                    ? "bg-white text-teal-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                รายสัปดาห์ (7 วัน)
              </button>
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-semibold focus:outline-teal-500 cursor-pointer"
            >
              <option value="all">ทุกประเภทรถ ({vehicles.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Search */}
            <input
              type="text"
              placeholder="ค้นหาทะเบียน/ชื่อรถ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-teal-500 w-36 sm:w-44"
            />
          </div>
        </div>

        {/* Fleet Utilization Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between">
            <span className="text-slate-500">ภารกิจในวัน:</span>
            <span className="font-bold text-slate-800 font-mono text-sm">
              {dayStats.activeMissionsCount} ภารกิจ
            </span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between">
            <span className="text-slate-500">รถพร้อมใช้งาน:</span>
            <span className="font-bold text-emerald-700 font-mono text-sm">
              {dayStats.availableVehicles} คัน
            </span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between">
            <span className="text-slate-500">รถติดภารกิจ:</span>
            <span className="font-bold text-amber-700 font-mono text-sm">
              {dayStats.inUseVehicles} คัน
            </span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between">
            <span className="text-slate-500">อัตราการใช้งาน:</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-600 rounded-full"
                  style={{ width: `${dayStats.utilizationRate}%` }}
                />
              </div>
              <span className="font-bold text-teal-800 font-mono">
                {dayStats.utilizationRate}%
              </span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-600 pt-1">
          <span className="font-bold text-slate-700">สัญลักษณ์แถบภารกิจ:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-600" />
            <span>อนุมัติแล้ว (Approved)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-teal-600" />
            <span>หัวหน้าฝ่ายเห็นชอบ (Endorsed)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span>รอตรวจสอบ (Pending)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-500" />
            <span>ส่งคืนแล้ว (Completed)</span>
          </div>
          {currentNowPercent !== null && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-rose-500" />
              <span className="text-rose-600 font-semibold">เวลาปัจจุบัน</span>
            </div>
          )}
        </div>
      </div>

      {/* Gantt Matrix Canvas */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[850px]">
            {/* Header Columns */}
            <div className="flex border-b border-slate-200 bg-slate-50/80 sticky top-0 z-20">
              {/* Left Column: Vehicle Header */}
              <div className="w-64 p-3.5 border-r border-slate-200 font-bold text-xs text-slate-700 shrink-0 flex items-center justify-between">
                <span>ยานพาหนะราชการ ({filteredVehicles.length})</span>
                <span className="text-[10px] text-slate-400 font-normal">สถานะ/คนขับ</span>
              </div>

              {/* Right Columns: Time Headers */}
              {viewMode === "day" ? (
                <div className="flex-1 flex">
                  {hoursArray.map((hour, idx) => (
                    <div
                      key={hour}
                      className={`flex-1 p-2 text-center text-[11px] font-mono font-semibold text-slate-600 border-r border-slate-200/60 ${
                        idx === hoursArray.length - 1 ? "border-r-0" : ""
                      }`}
                    >
                      {String(hour).padStart(2, "0")}:00
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex">
                  {weekDays.map((wDay) => {
                    const todayFlag = isToday(wDay);
                    return (
                      <div
                        key={wDay.toISOString()}
                        className={`flex-1 p-2.5 text-center border-r border-slate-200/60 ${
                          todayFlag ? "bg-teal-50/80 font-bold" : ""
                        }`}
                      >
                        <div className={`text-xs ${todayFlag ? "text-teal-900" : "text-slate-700"}`}>
                          {wDay.toLocaleDateString("th-TH", { weekday: "short" })}
                        </div>
                        <div
                          className={`text-sm font-mono font-bold mt-0.5 ${
                            todayFlag ? "text-teal-700" : "text-slate-800"
                          }`}
                        >
                          {wDay.getDate()}{" "}
                          <span className="text-[10px] text-slate-400 font-normal">
                            {wDay.toLocaleDateString("th-TH", { month: "short" })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Matrix Rows (One per vehicle) */}
            <div className="divide-y divide-slate-100">
              {filteredVehicles.map((car) => {
                const isCarAvailable = car.status === "available";

                return (
                  <div
                    key={car.id}
                    className="flex hover:bg-slate-50/60 transition-colors group relative"
                  >
                    {/* Left Column: Vehicle Card */}
                    <div className="w-64 p-3 border-r border-slate-200 shrink-0 flex items-center justify-between gap-2.5 bg-white group-hover:bg-slate-50/60">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Vehicle Avatar / Thumbnail */}
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-200 relative">
                          {car.image ? (
                            <img
                              src={car.image}
                              alt={car.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg bg-slate-100">
                              🚗
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 truncate" title={car.name}>
                            {car.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[10px] font-bold text-teal-800 bg-teal-50 px-1 py-0.2 rounded border border-teal-200">
                              {car.licensePlate}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate">
                              {car.category}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 truncate mt-0.5" title={car.driverName}>
                            👤 {car.driverName || "พนักงานขับรถเวร"}
                          </div>
                        </div>
                      </div>

                      {/* Quick Request Button on vehicle hover */}
                      {onRequestVehicle && (
                        <button
                          type="button"
                          onClick={() => onRequestVehicle(car.id, selectedDate.toISOString())}
                          className="opacity-0 group-hover:opacity-100 p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0"
                          title="ยื่นคำขอจองคันนี้"
                        >
                          ➕
                        </button>
                      )}
                    </div>

                    {/* Right Timeline Canvas */}
                    {viewMode === "day" ? (
                      <div className="flex-1 relative flex h-20 items-center">
                        {/* Hour Grid Lines */}
                        <div className="absolute inset-0 flex pointer-events-none">
                          {hoursArray.map((hour, idx) => (
                            <div
                              key={hour}
                              className={`flex-1 border-r border-slate-100 ${
                                idx === hoursArray.length - 1 ? "border-r-0" : ""
                              }`}
                            />
                          ))}
                        </div>

                        {/* Current Time Indicator Red Line */}
                        {currentNowPercent !== null && (
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10 pointer-events-none"
                            style={{ left: `${currentNowPercent}%` }}
                          >
                            <div className="w-2 h-2 rounded-full bg-rose-500 -translate-x-[3px] -translate-y-1 shadow-sm" />
                          </div>
                        )}

                        {/* Booking Bars for this vehicle on this day */}
                        {bookings
                          .filter((b) => b.vehicleId === car.id && b.status !== "rejected")
                          .map((b) => {
                            const { leftPercent, widthPercent, isVisible } =
                              calculateDayBookingPosition(b, selectedDate);

                            if (!isVisible) return null;

                            const colorClasses = getBookingColorClasses(b.status);

                            return (
                              <div
                                key={b.id}
                                onClick={() => onSelectBooking?.(b)}
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setPopoverBooking({
                                    booking: b,
                                    x: rect.left + rect.width / 2,
                                    y: rect.top,
                                  });
                                }}
                                onMouseLeave={() => setPopoverBooking(null)}
                                className={`absolute h-14 rounded-xl border px-2.5 py-1.5 flex flex-col justify-between overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] hover:z-20 ${colorClasses}`}
                                style={{
                                  left: `${leftPercent}%`,
                                  width: `${widthPercent}%`,
                                }}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-mono text-[10px] font-bold tracking-tight truncate">
                                    {b.requestNo}
                                  </span>
                                  <span className="text-[9px] opacity-90 truncate">
                                    {b.requesterName.split(" ")[0]}
                                  </span>
                                </div>
                                <div className="text-[11px] font-semibold truncate leading-tight">
                                  📍 {b.destination}
                                </div>
                                <div className="text-[9px] opacity-80 font-mono truncate">
                                  {b.departureTime.slice(11, 16)} - {b.returnTime.slice(11, 16)}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      // Week View Row
                      <div className="flex-1 flex h-20">
                        {weekDays.map((wDay) => {
                          const dayBookings = getBookingsForVehicleAndDay(car.id, wDay);
                          const todayFlag = isToday(wDay);

                          return (
                            <div
                              key={wDay.toISOString()}
                              className={`flex-1 border-r border-slate-100 p-1 flex flex-col gap-1 overflow-y-auto ${
                                todayFlag ? "bg-teal-50/20" : ""
                              }`}
                            >
                              {dayBookings.length === 0 ? (
                                <div
                                  onClick={() =>
                                    onRequestVehicle?.(
                                      car.id,
                                      `${wDay.toISOString().slice(0, 10)}T08:30`
                                    )
                                  }
                                  className="h-full flex items-center justify-center text-[10px] text-slate-300 hover:text-teal-600 hover:bg-teal-50/50 rounded-lg cursor-pointer transition-colors"
                                  title="คลิกเพื่อขอใช้รถในวันนี้"
                                >
                                  ว่าง
                                </div>
                              ) : (
                                dayBookings.map((b) => {
                                  const colorClasses = getBookingColorClasses(b.status);
                                  return (
                                    <div
                                      key={b.id}
                                      onClick={() => onSelectBooking?.(b)}
                                      className={`p-1 rounded-lg text-[10px] border cursor-pointer truncate transition-transform hover:scale-[1.02] ${colorClasses}`}
                                      title={`${b.requestNo}: ${b.destination} (${b.requesterName})`}
                                    >
                                      <div className="font-bold truncate">{b.destination}</div>
                                      <div className="text-[9px] opacity-90 truncate font-mono">
                                        {b.requestNo}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Hover Popover */}
      {popoverBooking && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700 text-xs space-y-1.5 w-64 animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: `${popoverBooking.x}px`,
            top: `${popoverBooking.y - 8}px`,
          }}
        >
          <div className="flex items-center justify-between gap-1 pb-1 border-b border-slate-700">
            <span className="font-mono font-bold text-teal-300">
              {popoverBooking.booking.requestNo}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-bold">
              {popoverBooking.booking.status}
            </span>
          </div>
          <div>
            <span className="text-slate-400">ปลายทาง:</span>{" "}
            <span className="font-bold text-white">{popoverBooking.booking.destination}</span>
          </div>
          <div>
            <span className="text-slate-400">ผู้ขอใช้รถ:</span>{" "}
            <span className="text-white">
              {popoverBooking.booking.requesterName} ({popoverBooking.booking.requesterDivision})
            </span>
          </div>
          <div>
            <span className="text-slate-400">คนขับ:</span>{" "}
            <span className="text-teal-300">
              {popoverBooking.booking.assignedDriver || "พนักงานขับรถเวร"}
            </span>
          </div>
          <div>
            <span className="text-slate-400">ช่วงเวลา:</span>{" "}
            <span className="font-mono text-slate-200">
              {popoverBooking.booking.departureTime.replace("T", " ")} ➜{" "}
              {popoverBooking.booking.returnTime.replace("T", " ")}
            </span>
          </div>
          <div className="text-[10px] text-teal-400 text-center pt-1 border-t border-slate-800">
            คลิกที่แถบภารกิจเพื่อเปิดดูแบบคำขอฉบับเต็ม
          </div>
        </div>
      )}
    </div>
  );
}
