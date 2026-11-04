"use client";

import React, { useState, useMemo } from "react";
import { MeetingItem, MeetingCategory, MeetingType, MeetingRoomMaster } from "@/lib/types";
import {
  THAI_MONTH_NAMES,
  THAI_SHORT_DAY_NAMES,
  getMeetingDateRange,
  getMeetingIsoDate,
  formatThaiDateHeader,
  getAttendeeName,
} from "@/lib/calendar";
import { MEETING_CATEGORY_CONFIG, MEETING_TYPE_CONFIG } from "@/lib/meeting-data";

interface MeetingCalendarViewProps {
  meetings: MeetingItem[];
  rooms: MeetingRoomMaster[];
  onSelectMeeting: (m: MeetingItem) => void;
  onAddMeetingForDate: (isoDate: string) => void;
}

interface CalendarCell {
  date: Date;
  isoDate: string;
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  meetings: MeetingItem[];
}

export function MeetingCalendarView({
  meetings,
  rooms,
  onSelectMeeting,
  onAddMeetingForDate,
}: MeetingCalendarViewProps) {
  // Calendar state: current visible month & year
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  // Selected day for agenda preview
  const [selectedIsoDate, setSelectedIsoDate] = useState<string>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    setSelectedIsoDate(`${y}-${m}-${d}`);
  };

  // Map meetings by ISO date for O(1) lookup
  const meetingsByDate = useMemo(() => {
    const map = new Map<string, MeetingItem[]>();
    meetings.forEach((m) => {
      if (m.status === "cancelled") return;
      const iso = getMeetingIsoDate(m);
      const list = map.get(iso) || [];
      list.push(m);
      map.set(iso, list);
    });
    return map;
  }, [meetings]);

  // Calendar cells calculation
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ...
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const todayStr = (() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    })();

    const cells: CalendarCell[] = [];

    // 1. Previous month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const d = new Date(year, month - 1, dayNum);
      const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      cells.push({
        date: d,
        isoDate,
        dayNum,
        isCurrentMonth: false,
        isToday: isoDate === todayStr,
        meetings: meetingsByDate.get(isoDate) || [],
      });
    }

    // 2. Current month days
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const d = new Date(year, month, dayNum);
      const isoDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      cells.push({
        date: d,
        isoDate,
        dayNum,
        isCurrentMonth: true,
        isToday: isoDate === todayStr,
        meetings: meetingsByDate.get(isoDate) || [],
      });
    }

    // 3. Next month leading days to complete grid (multiples of 7: 35 or 42)
    const totalCells = cells.length > 35 ? 42 : 35;
    const remaining = totalCells - cells.length;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const d = new Date(year, month + 1, dayNum);
      const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      cells.push({
        date: d,
        isoDate,
        dayNum,
        isCurrentMonth: false,
        isToday: isoDate === todayStr,
        meetings: meetingsByDate.get(isoDate) || [],
      });
    }

    return cells;
  }, [year, month, meetingsByDate]);

  // Meetings on selected date
  const selectedDateMeetings = useMemo(() => {
    return meetingsByDate.get(selectedIsoDate) || [];
  }, [meetingsByDate, selectedIsoDate]);

  // Month Statistics
  const monthStats = useMemo(() => {
    const curMonthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    let total = 0;
    let onsite = 0;
    let online = 0;
    let hybrid = 0;

    meetings.forEach((m) => {
      if (m.status === "cancelled") return;
      const iso = getMeetingIsoDate(m);
      if (iso.startsWith(curMonthPrefix)) {
        total++;
        if (m.type === "onsite") onsite++;
        else if (m.type === "online") online++;
        else if (m.type === "hybrid") hybrid++;
      }
    });

    return { total, onsite, online, hybrid };
  }, [meetings, year, month]);

  return (
    <div className="space-y-4">
      {/* Calendar Top Navigation Header */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-lg shadow-2xs">
            📅
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold font-heading text-slate-900">
                {THAI_MONTH_NAMES[month]} {year + 543}
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold border border-slate-200">
                {monthStats.total} นัดหมาย
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              คลิกที่ช่องวันที่เพื่อดูวาระ หรือกดปุ่ม + เพื่อจองห้องประชุมทันที
            </p>
          </div>
        </div>

        {/* Month Switching Controls & Actions */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
            title="เดือนก่อนหน้า"
          >
            <span>◀</span>
            <span className="hidden sm:inline">เดือนก่อน</span>
          </button>

          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            วันนี้
          </button>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
            title="เดือนถัดไป"
          >
            <span className="hidden sm:inline">เดือนถัดไป</span>
            <span>▶</span>
          </button>

          <button
            type="button"
            onClick={() => onAddMeetingForDate(selectedIsoDate)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>➕</span>
            <span>จองนัดหมาย ({selectedIsoDate.slice(8, 10)} {THAI_MONTH_NAMES[parseInt(selectedIsoDate.slice(5, 7), 10) - 1].slice(0, 4)}.)</span>
          </button>
        </div>
      </div>

      {/* Main Calendar Grid and Side Agenda Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Monthly Grid (Left 3 Columns on Large Screens) */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-slate-200/80 bg-slate-50/70 text-center text-xs font-bold text-slate-600">
            {THAI_SHORT_DAY_NAMES.map((name, i) => (
              <div
                key={name}
                className={`py-2.5 sm:py-3 border-r border-slate-100 last:border-r-0 ${
                  i === 0 ? "text-rose-600" : i === 6 ? "text-sky-600" : "text-slate-700"
                }`}
              >
                {name}
              </div>
            ))}
          </div>

          {/* Days Cells Grid */}
          <div className="grid grid-cols-7 auto-rows-fr bg-slate-100/60 gap-px">
            {calendarCells.map((cell, idx) => {
              const isSelected = cell.isoDate === selectedIsoDate;
              return (
                <div
                  key={`${cell.isoDate}_${idx}`}
                  onClick={() => setSelectedIsoDate(cell.isoDate)}
                  className={`min-h-[96px] sm:min-h-[118px] p-1.5 sm:p-2 bg-white transition-all flex flex-col justify-between cursor-pointer group relative ${
                    !cell.isCurrentMonth ? "bg-slate-50/60 text-slate-300" : "text-slate-800"
                  } ${
                    isSelected
                      ? "ring-2 ring-indigo-500 ring-inset bg-indigo-50/20"
                      : "hover:bg-slate-50/90"
                  }`}
                >
                  {/* Cell Header: Date Number & Add Shortcut */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center justify-center text-xs font-bold rounded-lg w-6 h-6 transition-colors ${
                        cell.isToday
                          ? "bg-indigo-600 text-white shadow-2xs font-extrabold"
                          : isSelected
                          ? "bg-indigo-100 text-indigo-700"
                          : cell.isCurrentMonth
                          ? "text-slate-700"
                          : "text-slate-400"
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    {/* Quick Add Button on Hover */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddMeetingForDate(cell.isoDate);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-[10px] px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md font-bold transition-all border border-indigo-200"
                      title="จองห้อง / สร้างการประชุมในวันนี้"
                    >
                      + จอง
                    </button>
                  </div>

                  {/* Meetings List inside Date Cell */}
                  <div className="space-y-1 my-1 flex-1 overflow-hidden">
                    {cell.meetings.slice(0, 2).map((m) => {
                      const isOnline = m.type === "online";
                      const isHybrid = m.type === "hybrid";
                      return (
                        <div
                          key={m.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectMeeting(m);
                          }}
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium truncate flex items-center gap-1 border shadow-2xs transition-transform hover:scale-[1.02] cursor-pointer ${
                            isOnline
                              ? "bg-teal-50 text-teal-800 border-teal-200/80 hover:bg-teal-100"
                              : isHybrid
                              ? "bg-purple-50 text-purple-800 border-purple-200/80 hover:bg-purple-100"
                              : "bg-indigo-50 text-indigo-800 border-indigo-200/80 hover:bg-indigo-100"
                          }`}
                          title={`${m.title} (${m.timeStr})`}
                        >
                          <span className="shrink-0 text-[8px]">
                            {isOnline ? "🌐" : isHybrid ? "🔄" : "🏛️"}
                          </span>
                          <span className="font-mono text-[9px] font-bold shrink-0">
                            {m.timeStr?.split("-")[0]?.trim() || ""}
                          </span>
                          <span className="truncate">{m.title}</span>
                        </div>
                      );
                    })}

                    {cell.meetings.length > 2 && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIsoDate(cell.isoDate);
                        }}
                        className="text-[9px] font-bold text-slate-500 hover:text-indigo-600 bg-slate-100/80 hover:bg-indigo-50 px-1 py-0.5 rounded text-center transition-colors cursor-pointer"
                      >
                        + อีก {cell.meetings.length - 2} รายการ
                      </div>
                    )}
                  </div>

                  {/* Dot indicator if meetings exist */}
                  {cell.meetings.length > 0 && (
                    <div className="flex items-center gap-1 justify-center pt-0.5">
                      {cell.meetings.slice(0, 3).map((_, i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-500/80"></span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Month Footer Legend & Summary */}
          <div className="p-3 sm:p-4 bg-slate-50/70 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 text-slate-600 font-medium">
              <span className="text-[11px] font-bold text-slate-400">สัญลักษณ์:</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                <span>ออนไซต์ (ห้องประชุม)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                <span>ออนไลน์</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                <span>ไฮบริด</span>
              </span>
            </div>

            <div className="flex items-center gap-2 text-slate-500 text-[11px]">
              <span>ยอดรวมเดือนนี้: <b>{monthStats.total}</b> ครั้ง</span>
              <span>•</span>
              <span>ใน สนง.: <b>{monthStats.onsite}</b></span>
              <span>•</span>
              <span>ออนไลน์/ไฮบริด: <b>{monthStats.online + monthStats.hybrid}</b></span>
            </div>
          </div>
        </div>

        {/* Selected Day Agenda Drawer (Right Column on Large Screens) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            {/* Header of selected date */}
            <div className="border-b border-slate-100 pb-3 mb-3">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                วาระและนัดหมายประจำวัน
              </div>
              <h3 className="text-base font-bold font-heading text-slate-900 mt-0.5">
                {(() => {
                  const [y, m, d] = selectedIsoDate.split("-").map(Number);
                  const dt = new Date(y, m - 1, d);
                  return formatThaiDateHeader(dt);
                })()}
              </h3>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-500">
                  {selectedDateMeetings.length === 0
                    ? "ไม่มีนัดหมายในวันนี้"
                    : `มี ${selectedDateMeetings.length} นัดหมาย`}
                </span>
                <button
                  type="button"
                  onClick={() => onAddMeetingForDate(selectedIsoDate)}
                  className="text-xs px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl border border-indigo-200 transition-colors cursor-pointer"
                >
                  + จองวันนี้
                </button>
              </div>
            </div>

            {/* List of meetings on selected date */}
            {selectedDateMeetings.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <span className="text-3xl block">🌿</span>
                <p className="text-xs text-slate-500 font-medium">
                  ยังไม่มีการจัดประชุมในวันนี้
                </p>
                <p className="text-[11px] text-slate-400">
                  ห้องประชุมทุกห้องพร้อมให้บริการ สามารถจองห้องได้ทันที
                </p>
                <button
                  type="button"
                  onClick={() => onAddMeetingForDate(selectedIsoDate)}
                  className="mt-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  + จองห้องประชุมวันนี้นี้
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {selectedDateMeetings.map((m) => {
                  const catCfg = MEETING_CATEGORY_CONFIG[m.category || "general"];
                  const typeCfg = MEETING_TYPE_CONFIG[m.type || "hybrid"];
                  return (
                    <div
                      key={m.id}
                      onClick={() => onSelectMeeting(m)}
                      className="p-3 rounded-2xl border border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all cursor-pointer space-y-2 group shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold">
                        <span className={`px-2 py-0.5 rounded-full border ${catCfg.bg} ${catCfg.text} ${catCfg.border}`}>
                          {catCfg.label}
                        </span>
                        <span className="text-indigo-700 font-mono bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          ⏰ {m.timeStr}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-800 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                        {m.title}
                      </h4>

                      <div className="text-[11px] text-slate-500 space-y-1">
                        <div className="flex items-center gap-1.5 line-clamp-1">
                          <span>📍</span>
                          <span>{m.location}</span>
                        </div>
                        {m.organizer && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <span>👤</span>
                            <span>{m.organizer.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Room quick status helper */}
          <div className="p-3 bg-teal-50/80 rounded-2xl border border-teal-200/80 text-xs text-teal-900 space-y-1.5">
            <div className="font-bold flex items-center gap-1 text-teal-800">
              <span>🏛️</span>
              <span>สถานะห้องประชุม สนง.</span>
            </div>
            <div className="text-[11px] text-teal-700 leading-relaxed">
              มีห้องประชุมราชการในสารบบทั้งหมด <b>{rooms.length}</b> ห้อง (พร้อมใช้งาน{" "}
              {rooms.filter((r) => r.status === "available").length} ห้อง)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
