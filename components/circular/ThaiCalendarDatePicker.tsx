"use client";

import React, { useRef, useId, useState, useEffect } from "react";
import {
  getTodayIsoDate,
  getTodayThaiDate,
  formatIsoToThaiDate,
  thaiDateToIso,
} from "@/lib/thai-numerals";

interface ThaiCalendarDatePickerProps {
  label?: string;
  required?: boolean;
  value: string; // ข้อความวันที่เลขไทย เช่น "๒๗ ตุลาคม ๒๕๖๙"
  onChange: (thaiDate: string, isoDate: string) => void;
  className?: string;
  id?: string;
  placeholder?: string;
}

/**
 * คอมโพเนนต์เลือกวันที่จากปฏิทิน (Calendar Date Picker)
 * พร้อมแปลงเป็นข้อความวันที่ภาษาไทยและตัวเลขไทย (๐-๙) ตามระเบียบงานสารบรรณภาครัฐอัตโนมัติ
 * ค่าเริ่มต้นคือวันที่ปัจจุบัน
 */
export function ThaiCalendarDatePicker({
  label = "ลงวันที่",
  required = true,
  value,
  onChange,
  className = "",
  id,
  placeholder = "เลือกวันที่จากปฏิทิน",
}: ThaiCalendarDatePickerProps) {
  const autoId = useId();
  const inputId = id || autoId;
  const datePickerRef = useRef<HTMLInputElement | null>(null);

  // คำนวณ ISO date (YYYY-MM-DD) จากค่า value
  const [internalIso, setInternalIso] = useState<string>(() => {
    return value ? thaiDateToIso(value) : getTodayIsoDate();
  });

  // ซิงค์เมื่อ prop `value` มีการเปลี่ยนแปลงจากภายนอก (เช่น เมื่อเลือก Preset)
  useEffect(() => {
    if (value) {
      const parsedIso = thaiDateToIso(value);
      setInternalIso(parsedIso);
    }
  }, [value]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIso = e.target.value;
    if (!newIso) return;
    setInternalIso(newIso);
    const thaiFormatted = formatIsoToThaiDate(newIso);
    onChange(thaiFormatted, newIso);
  };

  const handleSetToday = () => {
    const todayIso = getTodayIsoDate();
    setInternalIso(todayIso);
    const todayThai = getTodayThaiDate();
    onChange(todayThai, todayIso);
  };

  const handleOpenPicker = () => {
    if (datePickerRef.current) {
      if (typeof datePickerRef.current.showPicker === "function") {
        datePickerRef.current.showPicker();
      } else {
        datePickerRef.current.focus();
      }
    }
  };

  // ข้อความวันที่ภาษาไทยที่จะแสดงผล
  const displayThaiDate = value || formatIsoToThaiDate(internalIso) || getTodayThaiDate();

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={inputId} className="block text-[11px] font-bold text-slate-700">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          <span className="text-[10px] text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.2 rounded flex items-center gap-1">
            <span>✨</span>
            <span>เลขไทยอัตโนมัติ</span>
          </span>
        </div>
      )}

      <div className="relative flex items-center">
        {/* กล่องแสดงผลวันที่ภาษาไทยเลขไทย พร้อมปุ่มเปิด Calendar */}
        <div
          onClick={handleOpenPicker}
          className="w-full pl-3 pr-28 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-indigo-400 rounded-xl text-xs text-slate-800 transition-all cursor-pointer flex items-center gap-2 group shadow-2xs"
          title="คลิกเพื่อเลือกวันที่จากปฏิทิน"
        >
          <span className="text-base text-indigo-600 group-hover:scale-110 transition-transform">
            📅
          </span>
          <span className="font-bold text-slate-900 truncate">
            {displayThaiDate || placeholder}
          </span>
        </div>

        {/* แถบเครื่องมือทางขวา: ปุ่ม 'วันนี้' และไอคอนปฏิทินสำหรับคลิกเปิด */}
        <div className="absolute right-1.5 flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSetToday();
            }}
            className="px-2 py-1 text-[10px] font-bold text-indigo-700 hover:text-white bg-indigo-50 hover:bg-indigo-600 rounded-lg transition-colors cursor-pointer"
            title="ตั้งค่าเป็นวันที่ปัจจุบัน"
          >
            วันนี้
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenPicker();
            }}
            className="p-1 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="เปิดปฏิทิน"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </button>
        </div>

        {/* Hidden / Underlying HTML5 Date Input เพื่อให้เรียก Native Calendar Popup ได้ทุกอุปกรณ์ */}
        <input
          ref={datePickerRef}
          id={inputId}
          type="date"
          required={required}
          value={internalIso}
          onChange={handleDateChange}
          data-testid="issued-date-calendar-input"
          aria-label={label}
          className="sr-only"
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 px-0.5">
        <span>เลือกจากปฏิทิน จะแปลงเป็นวัน เดือน พ.ศ. และเลขไทยทันที</span>
      </div>
    </div>
  );
}
