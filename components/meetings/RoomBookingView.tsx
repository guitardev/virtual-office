"use client";

import React, { useState, useMemo } from "react";
import { MeetingItem, MeetingRoomMaster, Member } from "@/lib/types";
import { formatThaiDateHeader, getMeetingIsoDate, getMeetingDateRange } from "@/lib/calendar";

interface RoomBookingViewProps {
  rooms: MeetingRoomMaster[];
  meetings: MeetingItem[];
  currentUser?: Member | null;
  onBookRoom: (roomName: string, dateIso: string) => void;
  onSelectMeeting: (m: MeetingItem) => void;
  onNavigateToAdminRooms?: () => void;
}

export function RoomBookingView({
  rooms,
  meetings,
  currentUser,
  onBookRoom,
  onSelectMeeting,
  onNavigateToAdminRooms,
}: RoomBookingViewProps) {
  // Selected date for viewing room schedules (defaults to today)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });

  // Filter / Search for rooms
  const [roomSearch, setRoomSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "busy" | "maintenance">("all");

  // Date navigation helpers
  const handleDateShift = (deltaDays: number) => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + deltaDays);
    const nextY = dt.getFullYear();
    const nextM = String(dt.getMonth() + 1).padStart(2, "0");
    const nextD = String(dt.getDate()).padStart(2, "0");
    setSelectedDate(`${nextY}-${nextM}-${nextD}`);
  };

  const handleSetToday = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    setSelectedDate(`${y}-${m}-${d}`);
  };

  // Get active meetings on selectedDate
  const meetingsOnSelectedDate = useMemo(() => {
    return meetings.filter((m) => {
      if (m.status === "cancelled") return false;
      if (m.type === "online") return false;
      const iso = getMeetingIsoDate(m);
      return iso === selectedDate;
    });
  }, [meetings, selectedDate]);

  // Map meetings by room name or id for this date
  const roomScheduleMap = useMemo(() => {
    const map = new Map<string, MeetingItem[]>();
    rooms.forEach((r) => map.set(r.name, []));

    meetingsOnSelectedDate.forEach((m) => {
      const loc = (m.location || "").toLowerCase().trim();
      const matchedRoom = rooms.find(
        (r) =>
          r.name.toLowerCase().trim() === loc ||
          loc.includes(r.name.toLowerCase().trim()) ||
          r.name.toLowerCase().trim().includes(loc)
      );
      if (matchedRoom) {
        const list = map.get(matchedRoom.name) || [];
        list.push(m);
        // Sort by start time
        list.sort((a, b) => {
          const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
          const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
          return aTime - bTime;
        });
        map.set(matchedRoom.name, list);
      }
    });

    return map;
  }, [rooms, meetingsOnSelectedDate]);

  // Metrics summary
  const summaryMetrics = useMemo(() => {
    const total = rooms.length;
    let availableCount = 0;
    let busyCount = 0;
    let maintenanceCount = 0;

    rooms.forEach((r) => {
      if (r.status === "maintenance") {
        maintenanceCount++;
      } else {
        const sched = roomScheduleMap.get(r.name) || [];
        if (sched.length === 0) {
          availableCount++;
        } else {
          busyCount++;
        }
      }
    });

    return { total, availableCount, busyCount, maintenanceCount };
  }, [rooms, roomScheduleMap]);

  // Filtered rooms list
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      // Status filter
      if (statusFilter === "maintenance" && r.status !== "maintenance") return false;
      if (statusFilter === "available") {
        if (r.status === "maintenance") return false;
        const sched = roomScheduleMap.get(r.name) || [];
        if (sched.length > 0) return false;
      }
      if (statusFilter === "busy") {
        if (r.status === "maintenance") return false;
        const sched = roomScheduleMap.get(r.name) || [];
        if (sched.length === 0) return false;
      }

      // Search query
      if (roomSearch.trim()) {
        const q = roomSearch.toLowerCase();
        const nameMatch = r.name.toLowerCase().includes(q);
        const bldMatch = r.building.toLowerCase().includes(q);
        const eqMatch = r.equipment.some((e) => e.toLowerCase().includes(q));
        if (!nameMatch && !bldMatch && !eqMatch) return false;
      }

      return true;
    });
  }, [rooms, statusFilter, roomSearch, roomScheduleMap]);

  const selectedDateObject = useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDate]);

  return (
    <div className="space-y-6">
      {/* Top Controller Bar: Date Selector & Quick Filters */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏛️</span>
              <h2 className="text-xl font-bold font-heading text-slate-900">
                ระบบจองห้องประชุมและตรวจสอบความพร้อม
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              เลือกวันที่ต้องการใช้งานห้องประชุม เพื่อดูผังเวลาที่ว่างและกดจองห้องประชุมได้ทันที
            </p>
          </div>

          {/* Date Picker & Nav Controls */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => handleDateShift(-1)}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="วันก่อนหน้า"
            >
              ◀ วันก่อน
            </button>

            <button
              type="button"
              onClick={handleSetToday}
              className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              วันนี้
            </button>

            <button
              type="button"
              onClick={() => handleDateShift(1)}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="วันถัดไป"
            >
              วันถัดไป ▶
            </button>

            {/* Date input */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value);
              }}
              className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white focus:border-indigo-500 cursor-pointer shadow-2xs font-mono"
            />
          </div>
        </div>

        {/* Selected Date Header Display */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <span>📅 ผังการใช้ห้องประจำ:</span>
            <span className="text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100 font-extrabold">
              {formatThaiDateHeader(selectedDateObject)}
            </span>
          </div>

          {/* Metrics Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                statusFilter === "all"
                  ? "bg-slate-800 text-white shadow-2xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              ทั้งหมด ({summaryMetrics.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("available")}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === "available"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              <span>🟢 ว่างทั้งวัน ({summaryMetrics.availableCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("busy")}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === "busy"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
              }`}
            >
              <span>🟡 มีการจอง ({summaryMetrics.busyCount})</span>
            </button>
            {summaryMetrics.maintenanceCount > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter("maintenance")}
                className={`px-2.5 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  statusFilter === "maintenance"
                    ? "bg-rose-600 text-white shadow-2xs"
                  : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                }`}
              >
                <span>🔴 ปิดปรับปรุง ({summaryMetrics.maintenanceCount})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Room Booking Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredRooms.map((room) => {
          const schedule = roomScheduleMap.get(room.name) || [];
          const isMaintenance = room.status === "maintenance";
          const isAvailable = !isMaintenance && schedule.length === 0;

          return (
            <div
              key={room.id}
              className={`bg-white rounded-3xl border p-5 shadow-2xs flex flex-col justify-between space-y-4 transition-all hover:shadow-md ${
                isMaintenance
                  ? "border-rose-200 bg-rose-50/20"
                  : isAvailable
                  ? "border-emerald-200/80 hover:border-emerald-300"
                  : "border-slate-200/80 hover:border-indigo-300"
              }`}
            >
              {/* Room Header Info */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{isMaintenance ? "🔴" : "🏛️"}</span>
                    <div>
                      <h3 className="text-sm font-bold font-heading text-slate-900 leading-snug">
                        {room.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        📍 {room.building}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Capacity & Status Badges */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    👥 รองรับ {room.capacity} ที่นั่ง
                  </span>

                  {isMaintenance ? (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      ปิดปรับปรุง (Maintenance)
                    </span>
                  ) : isAvailable ? (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      🟢 ว่างตลอดทั้งวัน
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      🟡 มีการจอง {schedule.length} นัดหมาย
                    </span>
                  )}
                </div>

                {/* Equipment Tags */}
                {room.equipment && room.equipment.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap pt-1">
                    <span className="text-[10px] font-bold text-slate-400 mr-0.5">อุปกรณ์:</span>
                    {room.equipment.map((eq, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 bg-slate-50 border border-slate-200/70 text-slate-600 rounded-md"
                      >
                        {eq}
                      </span>
                    ))}
                  </div>
                )}

                {/* Notes */}
                {room.notes && (
                  <p className="text-[11px] text-slate-400 italic pt-0.5">
                    💡 {room.notes}
                  </p>
                )}
              </div>

              {/* Day Timetable / Bookings for This Room */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                  <span>ตารางการใช้ห้องในวันนี้ ({schedule.length} รายการ):</span>
                </div>

                {isMaintenance ? (
                  <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200 text-rose-700 text-xs text-center font-medium">
                    ⚠️ อยู่ระหว่างการบำรุงรักษาอุปกรณ์ งดให้บริการชั่วคราว
                  </div>
                ) : schedule.length === 0 ? (
                  <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200/60 text-emerald-800 text-xs flex items-center gap-2">
                    <span className="text-lg">✨</span>
                    <div className="text-[11px] leading-tight">
                      <span className="font-bold block text-emerald-900">ห้องว่างตลอดวัน</span>
                      ไม่มีนัดหมายในวันที่เลือก พร้อมให้จองได้ทันที
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {schedule.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => onSelectMeeting(m)}
                        className="p-2 bg-slate-50 hover:bg-indigo-50/50 rounded-xl border border-slate-200 text-xs transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono font-bold text-indigo-700">
                          <span>⏰ {m.timeStr}</span>
                          <span className="text-slate-400 group-hover:text-indigo-600 font-sans font-medium text-[9px]">
                            ดูรายละเอียด ›
                          </span>
                        </div>
                        <div className="font-semibold text-slate-800 text-[11px] truncate mt-0.5">
                          {m.title}
                        </div>
                        {m.organizer && (
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            👤 {m.organizer.name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Button: Book this Room */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isMaintenance}
                  onClick={() => onBookRoom(room.name, selectedDate)}
                  className={`w-full py-2.5 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer ${
                    isMaintenance
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                      : "bg-[#4F46E5] hover:bg-indigo-700 text-white shadow-indigo-600/20"
                  }`}
                >
                  <span>{isMaintenance ? "⛔" : "➕"}</span>
                  <span>{isMaintenance ? "งดรับจอง (ปิดปรับปรุง)" : "จองห้องประชุมนี้"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Admin shortcut footer if user is authorized */}
      {onNavigateToAdminRooms &&
        (currentUser?.role === "admin" || currentUser?.role === "manager") && (
          <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-teal-900">
              <span className="text-xl">⚙️</span>
              <div>
                <span className="font-bold block">ผู้ดูแลระบบ: ปรับปรุงข้อมูลห้องประชุมและอุปกรณ์</span>
                ท่านสามารถเพิ่มห้องใหม่ ปรับความจุ หรือตั้งค่าปิดปรับปรุงห้องได้ที่ศูนย์บริหารจัดการห้องประชุม
              </div>
            </div>
            <button
              type="button"
              onClick={onNavigateToAdminRooms}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-colors shrink-0 shadow-xs cursor-pointer"
            >
              ไปที่สารบบห้องประชุม (Admin)
            </button>
          </div>
        )}
    </div>
  );
}

