"use client";

import React, { useMemo } from "react";

const HOURS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const BASE_MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

interface Time24SelectProps {
  value: string;
  onChange: (nextValue: string) => void;
  ariaLabelPrefix: string;
  compact?: boolean;
}

function parseTime24(value: string): { hour: string; minute: string } {
  const match = /^(\d{1,2}):(\d{2})$/.exec((value || "").trim());
  if (!match) {
    return { hour: "09", minute: "00" };
  }
  const h = Math.min(23, Math.max(0, parseInt(match[1], 10)));
  const m = Math.min(59, Math.max(0, parseInt(match[2], 10)));
  return {
    hour: String(h).padStart(2, "0"),
    minute: String(m).padStart(2, "0"),
  };
}

export function Time24Select({
  value,
  onChange,
  ariaLabelPrefix,
  compact = false,
}: Time24SelectProps) {
  const { hour, minute } = parseTime24(value);

  const minuteOptions = useMemo(() => {
    if (BASE_MINUTES.includes(minute)) {
      return BASE_MINUTES;
    }
    return [...BASE_MINUTES, minute].sort((a, b) => Number(a) - Number(b));
  }, [minute]);

  const wrapperClass = compact
    ? "flex items-center gap-1 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus-within:bg-white focus-within:border-indigo-500 transition-colors"
    : "flex items-center gap-1 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus-within:bg-white focus-within:border-indigo-500 transition-colors";

  const selectClass =
    "bg-transparent text-xs font-mono font-bold text-slate-800 focus:outline-none cursor-pointer";

  return (
    <div className={wrapperClass} data-testid={`time24-${ariaLabelPrefix}`}>
      <select
        aria-label={`${ariaLabelPrefix} (ชั่วโมง)`}
        value={hour}
        onChange={(e) => onChange(`${e.target.value}:${minute}`)}
        className={`${selectClass} flex-1 min-w-0`}
      >
        {HOURS_24.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-xs font-mono font-bold text-slate-400 select-none">:</span>
      <select
        aria-label={`${ariaLabelPrefix} (นาที)`}
        value={minute}
        onChange={(e) => onChange(`${hour}:${e.target.value}`)}
        className={`${selectClass} flex-1 min-w-0`}
      >
        {minuteOptions.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <span className="text-[10px] font-bold text-slate-400 select-none shrink-0">น.</span>
    </div>
  );
}
