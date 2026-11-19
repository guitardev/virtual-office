"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import PreloadSkeleton from "@/components/ui/PreloadSkeleton";
import {
  getTpmapCsvUrl,
  getTpmapDatadictUrl,
  KPP_AMPHUR_NAMES,
  PLAN13_INDICATOR_LABELS,
  TPMAP_GROUP_META,
  TPMAP_YEARS,
  TpmapAreaLevel,
  TpmapDatasetGroup,
  TpmapRecord,
  TpmapYearSummary,
} from "@/lib/tpmap-utils";

const TPMAP_MIGRATION_SQL = `-- รันคำสั่งนี้ใน Supabase SQL Editor เพื่อสร้างตารางจัดเก็บข้อมูล TPMAP
CREATE TABLE IF NOT EXISTS public.tpmap_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year integer NOT NULL,
  province_id text NOT NULL DEFAULT '62',
  dataset_group text NOT NULL CHECK (dataset_group IN ('card', 'all', 'nocard')),
  area_level text NOT NULL CHECK (area_level IN ('amphur', 'tambol')),
  area_id text NOT NULL,
  area_name text NOT NULL,
  amphur_id text NOT NULL,
  amphur_name text NOT NULL DEFAULT '',
  poor_household_cnt integer NOT NULL DEFAULT 0,
  poor_jpt_cnt integer NOT NULL DEFAULT 0,
  poor_mofreg_cnt integer NOT NULL DEFAULT 0,
  poor_mofval_cnt integer NOT NULL DEFAULT 0,
  dim_health integer NOT NULL DEFAULT 0,
  dim_living integer NOT NULL DEFAULT 0,
  dim_education integer NOT NULL DEFAULT 0,
  dim_income integer NOT NULL DEFAULT 0,
  dim_accessibility integer NOT NULL DEFAULT 0,
  pov_rate numeric(8,4) NOT NULL DEFAULT 0,
  indicators jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_url text NOT NULL DEFAULT '',
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fiscal_year, dataset_group, area_level, area_id)
);

CREATE INDEX IF NOT EXISTS idx_tpmap_records_lookup
  ON public.tpmap_records (fiscal_year, dataset_group, area_level, poor_mofval_cnt DESC);
CREATE INDEX IF NOT EXISTS idx_tpmap_records_amphur
  ON public.tpmap_records (amphur_id);

ALTER TABLE public.tpmap_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on tpmap_records" ON public.tpmap_records;
CREATE POLICY "Allow all on tpmap_records" ON public.tpmap_records FOR ALL USING (true) WITH CHECK (true);`;

interface TpmapAnalyticsPanelProps {
  showToast: (msg: string) => void;
}

type SortKey =
  | "poorMofvalCnt"
  | "povRate"
  | "poorHouseholdCnt"
  | "dimHealth"
  | "dimLiving"
  | "dimEducation"
  | "dimIncome"
  | "dimAccessibility";

export default function TpmapAnalyticsPanel({
  showToast,
}: TpmapAnalyticsPanelProps) {
  const [year, setYear] = useState<number>(2569);
  const [group, setGroup] = useState<TpmapDatasetGroup>("card");
  const [level, setLevel] = useState<TpmapAreaLevel>("amphur");
  const [amphurFilter, setAmphurFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortKey>("poorMofvalCnt");
  const [sortDesc, setSortDesc] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(true);
  const [syncingAll, setSyncingAll] = useState<boolean>(false);
  const [needsMigration, setNeedsMigration] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<"supabase" | "live">("supabase");
  const [records, setRecords] = useState<TpmapRecord[]>([]);
  const [fiveYearSummary, setFiveYearSummary] = useState<TpmapYearSummary[]>(
    []
  );

  const loadTpmapData = useCallback(
    async (forceSync = false) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/tpmap?year=${year}&level=${level}&group=${group}&sync=${
            forceSync ? "1" : "0"
          }`
        );
        const data = await res.json();
        if (!res.ok || !data?.success) {
          showToast(`❌ ${data?.error || "โหลดข้อมูล TPMAP ไม่สำเร็จ"}`);
          return;
        }
        setNeedsMigration(Boolean(data.needsMigration));
        setDataSource(data.source === "live" ? "live" : "supabase");
        setRecords(Array.isArray(data.records) ? data.records : []);
        setFiveYearSummary(
          Array.isArray(data.fiveYearSummary) ? data.fiveYearSummary : []
        );
        if (forceSync) {
          showToast(`✅ ซิงก์ข้อมูล TPMAP ปี ${year} จาก tpmap.in.th แล้ว`);
        }
      } catch {
        showToast("❌ เกิดข้อผิดพลาดในการโหลดข้อมูล TPMAP");
      } finally {
        setLoading(false);
      }
    },
    [year, level, group, showToast]
  );

  useEffect(() => {
    loadTpmapData(false);
  }, [loadTpmapData]);

  const handleBulkSyncAllYears = async () => {
    setSyncingAll(true);
    try {
      const res = await fetch("/api/tpmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        if (data?.needsMigration) setNeedsMigration(true);
        showToast(`❌ ${data?.error || "ซิงก์ข้อมูลทั้งหมดไม่สำเร็จ"}`);
        return;
      }
      showToast(
        `✅ ซิงก์ข้อมูล TPMAP ปี 2565–2569 (${data.syncedCount} รายการ) ลง Supabase แล้ว`
      );
      await loadTpmapData(false);
    } catch {
      showToast("❌ เกิดข้อผิดพลาดในการซิงก์ข้อมูลลงฐานข้อมูล");
    } finally {
      setSyncingAll(false);
    }
  };

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = records.filter((r) => {
      if (level === "tambol" && amphurFilter !== "all" && r.amphurId !== amphurFilter) {
        return false;
      }
      if (q) {
        return (
          r.areaName.toLowerCase().includes(q) ||
          r.amphurName.toLowerCase().includes(q) ||
          r.areaId.includes(q)
        );
      }
      return true;
    });

    list.sort((a, b) => {
      const diff = Number(a[sortBy]) - Number(b[sortBy]);
      return sortDesc ? -diff : diff;
    });
    return list;
  }, [records, level, amphurFilter, search, sortBy, sortDesc]);

  const currentTotals = useMemo(() => {
    const totalTarget = filteredRecords.reduce(
      (s, r) => s + r.poorMofvalCnt,
      0
    );
    const totalHH = filteredRecords.reduce(
      (s, r) => s + r.poorHouseholdCnt,
      0
    );
    const totalJpt = filteredRecords.reduce((s, r) => s + r.poorJptCnt, 0);
    const dimHealth = filteredRecords.reduce((s, r) => s + r.dimHealth, 0);
    const dimLiving = filteredRecords.reduce((s, r) => s + r.dimLiving, 0);
    const dimEducation = filteredRecords.reduce((s, r) => s + r.dimEducation, 0);
    const dimIncome = filteredRecords.reduce((s, r) => s + r.dimIncome, 0);
    const dimAccessibility = filteredRecords.reduce(
      (s, r) => s + r.dimAccessibility,
      0
    );
    const topArea = [...filteredRecords].sort(
      (a, b) => b.poorMofvalCnt - a.poorMofvalCnt
    )[0];
    return {
      totalTarget,
      totalHH,
      totalJpt,
      dimHealth,
      dimLiving,
      dimEducation,
      dimIncome,
      dimAccessibility,
      topArea,
    };
  }, [filteredRecords]);

  const topIndicators = useMemo(() => {
    const agg = new Map<string, number>();
    for (const r of filteredRecords) {
      for (const [k, v] of Object.entries(r.indicators || {})) {
        agg.set(k, (agg.get(k) || 0) + Number(v || 0));
      }
    }
    return Array.from(agg.entries())
      .map(([key, count]) => ({
        key,
        count,
        dimension:
          PLAN13_INDICATOR_LABELS[key]?.dimension || "ตัวชี้วัด จปฐ.",
        label:
          year >= 2567
            ? PLAN13_INDICATOR_LABELS[key]?.label || key
            : `ตัวชี้วัด จปฐ. (${key})`,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filteredRecords, year]);

  const maxFiveYearVal = useMemo(
    () =>
      Math.max(
        1,
        ...fiveYearSummary.map((s) => s.totalTargetPoor)
      ),
    [fiveYearSummary]
  );

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDesc((prev) => !prev);
    } else {
      setSortBy(key);
      setSortDesc(true);
    }
  };

  const isPlan13 = year >= 2567;
  const dimLabels = isPlan13
    ? {
        health: "สุขภาพ",
        living: "มาตรฐานความเป็นอยู่",
        education: "การศึกษา",
        income: "เศรษฐกิจ",
        accessibility: "คุ้มครองทางสังคมฯ",
      }
    : {
        health: "สุขภาพ",
        living: "ความเป็นอยู่",
        education: "การศึกษา",
        income: "รายได้",
        accessibility: "เข้าถึงบริการรัฐ",
      };

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900">
                🎯 วิเคราะห์ข้อมูลความยากจนแบบชี้เป้า TPMAP จังหวัดกำแพงเพชร (62)
              </h2>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full border font-semibold ${
                  dataSource === "supabase" && !needsMigration
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-sky-50 text-sky-700 border-sky-200"
                }`}
              >
                {dataSource === "supabase" && !needsMigration
                  ? "💾 แคชใน Supabase"
                  : "🌐 ดึงสดจาก tpmap.in.th"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {TPMAP_GROUP_META[group].desc} • เกณฑ์ จปฐ.{" "}
              {isPlan13 ? "แผนพัฒนาฯ ฉบับที่ 13" : "แผนพัฒนาฯ ฉบับที่ 12"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => loadTpmapData(true)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer disabled:opacity-50"
            >
              🔄 ซิงก์ปี {year} ล่าสุด
            </button>
            <button
              type="button"
              disabled={syncingAll || needsMigration}
              onClick={handleBulkSyncAllYears}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
            >
              {syncingAll
                ? "⏳ กำลังซิงก์ 5 ปี..."
                : "⬇️ ซิงก์ 2565–2569 ลง Supabase"}
            </button>
            <a
              href={getTpmapCsvUrl(year, group, level)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold"
            >
              📥 ดาวน์โหลดชุดข้อมูล (CSV)
            </a>
            <a
              href={getTpmapDatadictUrl(year)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold"
            >
              📘 คำอธิบายชุดข้อมูล
            </a>
            <a
              href={`https://www.tpmap.in.th/${year}/62`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              🔗 เปิดเว็บ TPMAP
            </a>
          </div>
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              ปี พ.ศ.
            </label>
            <div className="flex gap-1">
              {TPMAP_YEARS.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setYear(yr)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                    year === yr
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              กลุ่มข้อมูลเป้าหมาย
            </label>
            <select
              value={group}
              onChange={(e) => setGroup(e.target.value as TpmapDatasetGroup)}
              className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold bg-white text-slate-700"
            >
              {(["card", "all", "nocard"] as TpmapDatasetGroup[]).map((g) => (
                <option key={g} value={g}>
                  {TPMAP_GROUP_META[g].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              ระดับพื้นที่
            </label>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setLevel("amphur");
                  setAmphurFilter("all");
                }}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                  level === "amphur"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200"
                }`}
              >
                ระดับอำเภอ (11)
              </button>
              <button
                type="button"
                onClick={() => setLevel("tambol")}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${
                  level === "tambol"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200"
                }`}
              >
                ระดับตำบล (78)
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            {level === "tambol" && (
              <div className="flex-1">
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  กรองอำเภอ
                </label>
                <select
                  value={amphurFilter}
                  onChange={(e) => setAmphurFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs bg-white"
                >
                  <option value="all">ทุกอำเภอ</option>
                  {Object.entries(KPP_AMPHUR_NAMES).map(([id, name]) => (
                    <option key={id} value={id}>
                      อ.{name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                ค้นหาพื้นที่
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ชื่ออำเภอ / ตำบล..."
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Migration Banner */}
      {needsMigration && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
          <span>
            ⚠️ ยังไม่ได้สร้างตาราง <code>public.tpmap_records</code> ใน Supabase (ขณะนี้แสดงข้อมูลที่ดึงสดจาก{" "}
            <code>tpmap.in.th</code> โดยอัตโนมัติ)
          </span>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(TPMAP_MIGRATION_SQL);
              showToast("📋 คัดลอก SQL สร้างตาราง tpmap_records แล้ว");
            }}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer"
          >
            📋 คัดลอก SQL Migration
          </button>
        </div>
      )}

      {loading ? (
        <PreloadSkeleton
          variant="page"
          rows={8}
          label={`กำลังดึงและวิเคราะห์ข้อมูล TPMAP ปี ${year}...`}
        />
      ) : (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs text-slate-500">
                {TPMAP_GROUP_META[group].shortLabel} (ปี {year})
              </div>
              <div className="text-2xl font-extrabold text-indigo-700 mt-1">
                {currentTotals.totalTarget.toLocaleString()} คน
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                จาก {filteredRecords.length}{" "}
                {level === "amphur" ? "อำเภอ" : "ตำบล"}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs text-slate-500">ครัวเรือนตกเกณฑ์ จปฐ.</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">
                {currentTotals.totalHH.toLocaleString()} ครัวเรือน
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                คนใน จปฐ. ที่จน {currentTotals.totalJpt.toLocaleString()} คน
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs text-slate-500">มิติปัญหาอันดับ 1</div>
              <div className="text-xl font-extrabold text-rose-600 mt-1">
                {(() => {
                  const dims = [
                    { name: dimLabels.health, v: currentTotals.dimHealth },
                    { name: dimLabels.living, v: currentTotals.dimLiving },
                    { name: dimLabels.education, v: currentTotals.dimEducation },
                    { name: dimLabels.income, v: currentTotals.dimIncome },
                    {
                      name: dimLabels.accessibility,
                      v: currentTotals.dimAccessibility,
                    },
                  ].sort((a, b) => b.v - a.v);
                  return `${dims[0].name} (${dims[0].v.toLocaleString()} คน)`;
                })()}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                รวมปัญหาทั้ง 5 มิติตามเกณฑ์ MPI
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
              <div className="text-xs text-slate-500">พื้นที่เป้าหมายสูงสุด</div>
              <div className="text-lg font-extrabold text-emerald-700 mt-1 truncate">
                {currentTotals.topArea
                  ? `${level === "tambol" ? "ต." : "อ."}${
                      currentTotals.topArea.areaName
                    }`
                  : "-"}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {currentTotals.topArea
                  ? `${currentTotals.topArea.poorMofvalCnt.toLocaleString()} คน (${currentTotals.topArea.povRate.toFixed(
                      2
                    )}%)`
                  : "-"}
              </div>
            </div>
          </div>

          {/* 5-Year Trend + Top Indicators */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">
                  📈 แนวโน้ม 5 ปี (พ.ศ. 2565–2569) — {TPMAP_GROUP_META[group].shortLabel}
                </h3>
                <span className="text-[11px] text-slate-400">จ.กำแพงเพชร</span>
              </div>
              <div className="space-y-3">
                {fiveYearSummary.map((s) => {
                  const pct = Math.max(
                    4,
                    Math.round((s.totalTargetPoor / maxFiveYearVal) * 100)
                  );
                  const isSelected = s.fiscalYear === year;
                  return (
                    <button
                      key={s.fiscalYear}
                      type="button"
                      onClick={() => setYear(s.fiscalYear)}
                      className={`w-full text-left p-2.5 rounded-xl border transition cursor-pointer ${
                        isSelected
                          ? "border-indigo-300 bg-indigo-50/50"
                          : "border-slate-100 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-bold text-slate-800">
                          ปี {s.fiscalYear}{" "}
                          {s.fiscalYear === 2566 && (
                            <span className="text-[10px] font-normal text-amber-600">
                              (รอยต่อรอบสำรวจ)
                            </span>
                          )}
                        </span>
                        <span className="font-bold text-indigo-700">
                          {s.totalTargetPoor.toLocaleString()} คน
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isSelected ? "bg-indigo-600" : "bg-indigo-400"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-slate-500 mt-1">
                        <span>สุขภาพ: {s.dimHealth.toLocaleString()}</span>
                        <span>ความเป็นอยู่: {s.dimLiving.toLocaleString()}</span>
                        <span>ศึกษา: {s.dimEducation.toLocaleString()}</span>
                        <span>เศรษฐกิจ: {s.dimIncome.toLocaleString()}</span>
                        <span>คุ้มครองฯ: {s.dimAccessibility.toLocaleString()}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">
                  🔍 ตัวชี้วัด จปฐ. ที่ตกเกณฑ์สูงสุด (ปี {year})
                </h3>
                <span className="text-[11px] text-slate-400">
                  {isPlan13 ? "แผนฯ 13" : "แผนฯ 12"}
                </span>
              </div>
              {topIndicators.length === 0 ? (
                <div className="text-xs text-slate-500 py-8 text-center">
                  ไม่มีตัวชี้วัดรายข้อที่ตกเกณฑ์
                </div>
              ) : (
                <div className="space-y-2.5">
                  {topIndicators.map((ind, idx) => (
                    <div
                      key={ind.key}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 truncate">
                          {idx + 1}. [{ind.key}] {ind.label}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          มิติ: {ind.dimension}
                        </div>
                      </div>
                      <div className="font-bold text-rose-600 shrink-0">
                        {ind.count.toLocaleString()} คน
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <div className="font-bold text-slate-900 text-sm">
                📋 ตารางจำแนกราย{level === "amphur" ? "อำเภอ" : "ตำบล"} ปี{" "}
                {year} ({filteredRecords.length} รายการ)
              </div>
              <div className="text-[11px] text-slate-500">
                คลิกหัวตารางเพื่อเรียงลำดับ
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3 text-center">#</th>
                    <th className="px-3 py-3">
                      {level === "amphur" ? "อำเภอ" : "ตำบล / อำเภอ"}
                    </th>
                    <th
                      onClick={() => toggleSort("poorMofvalCnt")}
                      className="px-3 py-3 text-right cursor-pointer hover:text-indigo-600"
                    >
                      คนเป้าหมาย {sortBy === "poorMofvalCnt" ? (sortDesc ? "▼" : "▲") : ""}
                    </th>
                    <th
                      onClick={() => toggleSort("povRate")}
                      className="px-3 py-3 text-right cursor-pointer hover:text-indigo-600"
                    >
                      สัดส่วน % {sortBy === "povRate" ? (sortDesc ? "▼" : "▲") : ""}
                    </th>
                    <th
                      onClick={() => toggleSort("poorHouseholdCnt")}
                      className="px-3 py-3 text-right cursor-pointer hover:text-indigo-600"
                    >
                      ครัวเรือน {sortBy === "poorHouseholdCnt" ? (sortDesc ? "▼" : "▲") : ""}
                    </th>
                    <th
                      onClick={() => toggleSort("dimHealth")}
                      className="px-3 py-3 text-right cursor-pointer hover:text-indigo-600"
                    >
                      {dimLabels.health}
                    </th>
                    <th
                      onClick={() => toggleSort("dimLiving")}
                      className="px-3 py-3 text-right cursor-pointer hover:text-indigo-600"
                    >
                      {dimLabels.living}
                    </th>
                    <th
                      onClick={() => toggleSort("dimEducation")}
                      className="px-3 py-3 text-right cursor-pointer hover:text-indigo-600"
                    >
                      {dimLabels.education}
                    </th>
                    <th
                      onClick={() => toggleSort("dimIncome")}
                      className="px-3 py-3 text-right cursor-pointer hover:text-indigo-600"
                    >
                      {dimLabels.income}
                    </th>
                    <th
                      onClick={() => toggleSort("dimAccessibility")}
                      className="px-3 py-3 text-right cursor-pointer hover:text-indigo-600"
                    >
                      {dimLabels.accessibility}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((r, idx) => (
                    <tr key={r.areaId} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2.5 text-center text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-900">
                          {level === "tambol" ? `ต.${r.areaName}` : `อ.${r.areaName}`}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {level === "tambol"
                            ? `อ.${r.amphurName} • รหัส ${r.areaId}`
                            : `รหัส ${r.areaId}`}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-indigo-700">
                        {r.poorMofvalCnt.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full font-semibold ${
                            r.povRate >= 15
                              ? "bg-rose-50 text-rose-700"
                              : r.povRate >= 8
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {r.povRate.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-700">
                        {r.poorHouseholdCnt.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-700">
                        {r.dimHealth.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-700">
                        {r.dimLiving.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-700">
                        {r.dimEducation.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-700">
                        {r.dimIncome.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-700">
                        {r.dimAccessibility.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
