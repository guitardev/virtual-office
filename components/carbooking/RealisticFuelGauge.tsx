"use client";

import React from "react";
import { FuelLevel } from "@/lib/types";

interface RealisticFuelGaugeProps {
  level: FuelLevel | string | number; // Can accept FuelLevel string, percentage number (0-100), or level label
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  interactive?: boolean;
  onChangeLevel?: (level: FuelLevel) => void;
  className?: string;
}

export function RealisticFuelGauge({
  level,
  size = "md",
  showLabel = true,
  interactive = false,
  onChangeLevel,
  className = "",
}: RealisticFuelGaugeProps) {
  // Convert level to percentage (0 - 100)
  const getPercentage = (): number => {
    if (typeof level === "number") return Math.min(100, Math.max(0, level));
    const str = String(level);
    if (str.includes("100%")) return 100;
    if (str.includes("75%")) return 75;
    if (str.includes("50%")) return 50;
    if (str.includes("25%")) return 25;
    if (str.includes("15%") || str.includes("10%") || str.includes("ใกล้หมด")) return 12;
    // fallback check numbers in string
    const match = str.match(/\d+/);
    if (match) return Number(match[0]);
    return 75;
  };

  const percent = getPercentage();

  // Needle angle: -65deg (E) to +65deg (F), 0deg is 1/2
  const minAngle = -65;
  const maxAngle = 65;
  const needleAngle = minAngle + (percent / 100) * (maxAngle - minAngle);

  // Low fuel warning lamp active if percent <= 20%
  const isLowFuel = percent <= 20;

  // Dimensions based on size
  const dimensions = {
    sm: { width: 130, height: 95, radius: 46, fontSize: "text-[9px]", needleLen: 38 },
    md: { width: 180, height: 125, radius: 64, fontSize: "text-xs", needleLen: 54 },
    lg: { width: 250, height: 165, radius: 90, fontSize: "text-sm", needleLen: 75 },
  }[size];

  // Helper text display
  const getLevelText = (): string => {
    if (percent >= 90) return "เต็มถัง (100%)";
    if (percent >= 70) return "3/4 ถัง (75%)";
    if (percent >= 45) return "1/2 ถัง (50%)";
    if (percent >= 20) return "1/4 ถัง (25%)";
    return "ใกล้หมด (ต่ำกว่า 15%)";
  };

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* Gauge Dial Container (Automotive Instrument Cluster) */}
      <div
        style={{ width: dimensions.width, height: dimensions.height }}
        className="relative overflow-hidden rounded-t-full bg-gradient-to-b from-slate-900 via-slate-950 to-black p-2 border-2 border-slate-700 shadow-xl shadow-black/40"
      >
        {/* Chrome Metallic Outer Ring Bezel */}
        <div className="absolute inset-1 rounded-t-full border border-slate-600/50 pointer-events-none" />
        <div className="absolute inset-2 rounded-t-full border-t border-teal-500/20 pointer-events-none" />

        {/* Ambient Backlight Glow */}
        <div
          className={`absolute inset-x-4 top-2 h-16 rounded-full blur-xl pointer-events-none transition-all duration-700 ${
            isLowFuel
              ? "bg-rose-500/20 animate-pulse"
              : percent > 60
              ? "bg-teal-500/15"
              : "bg-amber-500/15"
          }`}
        />

        {/* SVG Arc and Tick Marks */}
        <svg
          viewBox="0 0 200 130"
          className="w-full h-full"
          style={{ overflow: "visible" }}
        >
          <defs>
            {/* Red Warning Arc Gradient */}
            <linearGradient id="warningGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>

            {/* Normal Fuel Arc Gradient */}
            <linearGradient id="normalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>

            {/* Needle Glow Filter */}
            <filter id="needleGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#f43f5e" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Background Outer Arc Track */}
          <path
            d="M 28 105 A 76 76 0 0 1 172 105"
            fill="none"
            stroke="#334155"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Warning Red Zone (0% - 20%) */}
          <path
            d="M 28 105 A 76 76 0 0 1 52 75"
            fill="none"
            stroke="#ef4444"
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Active Fuel Filled Arc */}
          <path
            d="M 28 105 A 76 76 0 0 1 172 105"
            fill="none"
            stroke="url(#normalGrad)"
            strokeWidth="5"
            strokeDasharray="230"
            strokeDashoffset={230 - (percent / 100) * 230}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />

          {/* Major Tick Marks */}
          {/* E (0%) */}
          <line x1="33" y1="102" x2="44" y2="99" stroke="#ef4444" strokeWidth="2.5" />
          {/* 1/4 (25%) */}
          <line x1="56" y1="67" x2="65" y2="72" stroke="#94a3b8" strokeWidth="1.5" />
          {/* 1/2 (50%) */}
          <line x1="100" y1="31" x2="100" y2="42" stroke="#f8fafc" strokeWidth="2.5" />
          {/* 3/4 (75%) */}
          <line x1="144" y1="67" x2="135" y2="72" stroke="#94a3b8" strokeWidth="1.5" />
          {/* F (100%) */}
          <line x1="167" y1="102" x2="156" y2="99" stroke="#38bdf8" strokeWidth="2.5" />

          {/* Minor Tick Marks */}
          <line x1="43" y1="84" x2="49" y2="87" stroke="#64748b" strokeWidth="1" />
          <line x1="77" y1="46" x2="82" y2="52" stroke="#64748b" strokeWidth="1" />
          <line x1="123" y1="46" x2="118" y2="52" stroke="#64748b" strokeWidth="1" />
          <line x1="157" y1="84" x2="151" y2="87" stroke="#64748b" strokeWidth="1" />

          {/* Gauge Face Labels */}
          {/* 'E' Label */}
          <text
            x="24"
            y="120"
            fill="#ef4444"
            fontSize="13"
            fontWeight="900"
            fontFamily="monospace"
            textAnchor="middle"
          >
            E
          </text>

          {/* '1/2' Label */}
          <text
            x="100"
            y="23"
            fill="#e2e8f0"
            fontSize="10"
            fontWeight="bold"
            fontFamily="sans-serif"
            textAnchor="middle"
          >
            1/2
          </text>

          {/* 'F' Label */}
          <text
            x="176"
            y="120"
            fill="#38bdf8"
            fontSize="13"
            fontWeight="900"
            fontFamily="monospace"
            textAnchor="middle"
          >
            F
          </text>

          {/* Fuel Dispenser Icon & Tank Arrow */}
          <text
            x="100"
            y="88"
            fill="#94a3b8"
            fontSize="13"
            textAnchor="middle"
          >
            ◀ ⛽
          </text>
        </svg>

        {/* Low Fuel Warning Light Bulb (Amber / Red LED) */}
        <div
          className={`absolute bottom-3 left-6 w-3 h-3 rounded-full flex items-center justify-center transition-all duration-300 ${
            isLowFuel
              ? "bg-amber-500 shadow-md shadow-amber-500/80 ring-2 ring-amber-400 animate-pulse"
              : "bg-slate-800/80 border border-slate-700 opacity-30"
          }`}
          title={isLowFuel ? "ระดับน้ำมันใกล้หมด (Low Fuel)" : "ไฟเตือนระดับน้ำมัน"}
        >
          <span className="text-[7px]">⚠️</span>
        </div>

        {/* Needle Assembly (Anchor at bottom center) */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none"
          style={{
            transformOrigin: "bottom center",
            transform: `translateX(-50%) rotate(${needleAngle}deg)`,
            transition: "transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          {/* Tapered Glowing Needle */}
          <div
            style={{ height: dimensions.needleLen }}
            className="w-1 bg-gradient-to-t from-rose-600 via-rose-500 to-amber-300 rounded-t-full shadow-lg shadow-rose-500/70"
          />

          {/* Center Chrome Cap Rivet */}
          <div className="w-5 h-5 -mt-2.5 rounded-full bg-gradient-to-b from-slate-300 via-slate-600 to-slate-900 border border-slate-400 shadow-md flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-slate-950 border border-slate-600" />
          </div>
        </div>
      </div>

      {/* Digital Readout / Interactive Selector Bar */}
      {showLabel && (
        <div className="mt-2 flex flex-col items-center">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-white font-mono shadow-inner">
            <span
              className={`w-2 h-2 rounded-full ${
                isLowFuel
                  ? "bg-rose-500 animate-ping"
                  : percent > 60
                  ? "bg-emerald-400"
                  : "bg-amber-400"
              }`}
            />
            <span className="text-xs font-black tracking-tight">{percent}%</span>
            <span className="text-[10px] text-slate-400 font-body font-medium">
              ({getLevelText()})
            </span>
          </div>

          {/* Interactive buttons to pick level if requested */}
          {interactive && onChangeLevel && (
            <div className="flex items-center gap-1 mt-2">
              {(
                [
                  "ใกล้หมด (ต่ำกว่า 15%)",
                  "1/4 ถัง (25%)",
                  "1/2 ถัง (50%)",
                  "3/4 ถัง (75%)",
                  "เต็มถัง (100%)",
                ] as FuelLevel[]
              ).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => onChangeLevel(lvl)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    getLevelText() === lvl
                      ? "bg-teal-600 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                  }`}
                >
                  {lvl.split(" ")[0]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
