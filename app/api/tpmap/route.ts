import { NextRequest, NextResponse } from "next/server";
import { supabase as rawSupabase } from "@/lib/supabase";
import {
  getTpmapCsvUrl,
  KPP_AMPHUR_NAMES,
  parseCsvRecords,
  TPMAP_YEARS,
  TpmapAreaLevel,
  TpmapDatasetGroup,
  TpmapRecord,
  TpmapYearSummary,
} from "@/lib/tpmap-utils";

export const dynamic = "force-dynamic";

function isMissingTableError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return (
    err.code === "42P01" ||
    err.code === "PGRST205" ||
    /relation .*tpmap_records.* does not exist|Could not find the table/i.test(
      err.message || ""
    )
  );
}

let cachedAreaMap: Record<string, string> | null = null;

async function fetchAreaNameMap(): Promise<Record<string, string>> {
  if (cachedAreaMap) return cachedAreaMap;
  try {
    const res = await fetch("https://www.tpmap.in.th/public/data/th_map.csv", {
      cache: "no-store",
    });
    if (!res.ok) return {};
    const text = await res.text();
    const rows = parseCsvRecords(text);
    const map: Record<string, string> = {};
    for (const r of rows) {
      if (r.id && r.id.startsWith("62")) {
        map[r.id] = r.name || "";
      }
    }
    cachedAreaMap = map;
    return map;
  } catch {
    return {};
  }
}

function mapDbRowToRecord(row: Record<string, unknown>): TpmapRecord {
  return {
    id: row.id ? String(row.id) : undefined,
    fiscalYear: Number(row.fiscal_year),
    provinceId: String(row.province_id || "62"),
    datasetGroup: (row.dataset_group as TpmapDatasetGroup) || "card",
    areaLevel: (row.area_level as TpmapAreaLevel) || "amphur",
    areaId: String(row.area_id || ""),
    areaName: String(row.area_name || ""),
    amphurId: String(row.amphur_id || ""),
    amphurName: String(row.amphur_name || ""),
    poorHouseholdCnt: Number(row.poor_household_cnt || 0),
    poorJptCnt: Number(row.poor_jpt_cnt || 0),
    poorMofregCnt: Number(row.poor_mofreg_cnt || 0),
    poorMofvalCnt: Number(row.poor_mofval_cnt || 0),
    dimHealth: Number(row.dim_health || 0),
    dimLiving: Number(row.dim_living || 0),
    dimEducation: Number(row.dim_education || 0),
    dimIncome: Number(row.dim_income || 0),
    dimAccessibility: Number(row.dim_accessibility || 0),
    povRate: Number(row.pov_rate || 0),
    indicators:
      (row.indicators as Record<string, number>) &&
      typeof row.indicators === "object"
        ? (row.indicators as Record<string, number>)
        : {},
    sourceUrl: String(row.source_url || ""),
    syncedAt: row.synced_at ? String(row.synced_at) : undefined,
  };
}

function summarizeByYear(rows: TpmapRecord[]): TpmapYearSummary[] {
  const byYear = new Map<number, TpmapRecord[]>();
  for (const r of rows) {
    if (r.areaLevel !== "amphur") continue;
    const list = byYear.get(r.fiscalYear) || [];
    list.push(r);
    byYear.set(r.fiscalYear, list);
  }
  const result: TpmapYearSummary[] = [];
  for (const yr of TPMAP_YEARS) {
    const list = byYear.get(yr);
    if (!list || list.length === 0) continue;
    result.push({
      fiscalYear: yr,
      totalHouseholds: list.reduce((s, r) => s + r.poorHouseholdCnt, 0),
      totalJptPoor: list.reduce((s, r) => s + r.poorJptCnt, 0),
      totalTargetPoor: list.reduce((s, r) => s + r.poorMofvalCnt, 0),
      dimHealth: list.reduce((s, r) => s + r.dimHealth, 0),
      dimLiving: list.reduce((s, r) => s + r.dimLiving, 0),
      dimEducation: list.reduce((s, r) => s + r.dimEducation, 0),
      dimIncome: list.reduce((s, r) => s + r.dimIncome, 0),
      dimAccessibility: list.reduce((s, r) => s + r.dimAccessibility, 0),
      avgPovRate:
        list.reduce((s, r) => s + r.povRate, 0) / Math.max(1, list.length),
    });
  }
  return result;
}

async function fetchAndParseLiveCsv(
  fiscalYear: number,
  group: TpmapDatasetGroup,
  level: TpmapAreaLevel,
  areaMap: Record<string, string>
): Promise<TpmapRecord[]> {
  const url = getTpmapCsvUrl(fiscalYear, group, level);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`ดึงข้อมูลจาก tpmap.in.th ไม่สำเร็จ (${res.status})`);
  }
  const csvText = await res.text();
  const parsed = parseCsvRecords(csvText);
  const nowIso = new Date().toISOString();

  return parsed.map((raw) => {
    const areaId =
      level === "tambol"
        ? String(raw.tumbol_ID || raw.tambol_ID || "")
        : String(raw.amphur_ID || "");
    const amphurId = areaId.slice(0, 4);
    const amphurName = KPP_AMPHUR_NAMES[amphurId] || areaMap[amphurId] || amphurId;
    const areaName =
      level === "tambol"
        ? areaMap[areaId] || `ตำบล ${areaId}`
        : amphurName;

    const indicators: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) {
      const m = /^poor\.JPT\.MOFval\.(ind\d+)\.CNT$/.exec(k);
      if (m) {
        const n = Math.round(Number(v || 0));
        if (n > 0) indicators[m[1]] = n;
      }
    }

    return {
      fiscalYear,
      provinceId: "62",
      datasetGroup: group,
      areaLevel: level,
      areaId,
      areaName,
      amphurId,
      amphurName,
      poorHouseholdCnt: Math.round(Number(raw["poor.household.CNT"] || 0)),
      poorJptCnt: Math.round(Number(raw["poor.JPT.CNT"] || 0)),
      poorMofregCnt: Math.round(Number(raw["poor.JPT.MOFreg.CNT"] || 0)),
      poorMofvalCnt: Math.round(Number(raw["poor.JPT.MOFval.CNT"] || 0)),
      dimHealth: Math.round(Number(raw["poor.JPT.MOFval.health"] || 0)),
      dimLiving: Math.round(Number(raw["poor.JPT.MOFval.living"] || 0)),
      dimEducation: Math.round(Number(raw["poor.JPT.MOFval.education"] || 0)),
      dimIncome: Math.round(Number(raw["poor.JPT.MOFval.income"] || 0)),
      dimAccessibility: Math.round(
        Number(raw["poor.JPT.MOFval.accessibility"] || 0)
      ),
      povRate: Number(raw["JPT.MOFval.pov.rate"] || 0),
      indicators,
      sourceUrl: url,
      syncedAt: nowIso,
    };
  });
}

async function upsertRecordsToSupabase(
  records: TpmapRecord[]
): Promise<{ needsMigration: boolean; error?: string }> {
  if (!rawSupabase || records.length === 0) {
    return { needsMigration: false };
  }
  const payload = records.map((r) => ({
    fiscal_year: r.fiscalYear,
    province_id: r.provinceId,
    dataset_group: r.datasetGroup,
    area_level: r.areaLevel,
    area_id: r.areaId,
    area_name: r.areaName,
    amphur_id: r.amphurId,
    amphur_name: r.amphurName,
    poor_household_cnt: r.poorHouseholdCnt,
    poor_jpt_cnt: r.poorJptCnt,
    poor_mofreg_cnt: r.poorMofregCnt,
    poor_mofval_cnt: r.poorMofvalCnt,
    dim_health: r.dimHealth,
    dim_living: r.dimLiving,
    dim_education: r.dimEducation,
    dim_income: r.dimIncome,
    dim_accessibility: r.dimAccessibility,
    pov_rate: r.povRate,
    indicators: r.indicators,
    source_url: r.sourceUrl,
    synced_at: r.syncedAt || new Date().toISOString(),
  }));

  const { error } = await rawSupabase
    .from("tpmap_records")
    .upsert(payload, {
      onConflict: "fiscal_year,dataset_group,area_level,area_id",
    });

  if (error) {
    if (isMissingTableError(error)) {
      return { needsMigration: true };
    }
    return { needsMigration: false, error: error.message };
  }
  return { needsMigration: false };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const yearParam = Number(searchParams.get("year") || 2569);
    const fiscalYear = TPMAP_YEARS.includes(yearParam as (typeof TPMAP_YEARS)[number])
      ? yearParam
      : 2569;
    const levelParam = searchParams.get("level") === "tambol" ? "tambol" : "amphur";
    const groupRaw = searchParams.get("group");
    const group: TpmapDatasetGroup =
      groupRaw === "all" || groupRaw === "nocard" ? groupRaw : "card";
    const forceSync = searchParams.get("sync") === "1";

    let needsMigration = false;
    let records: TpmapRecord[] = [];
    let summaryRows: TpmapRecord[] = [];
    let source: "supabase" | "live" = "supabase";

    if (rawSupabase && !forceSync) {
      const [{ data: dbRows, error: dbErr }, { data: sumDbRows }] =
        await Promise.all([
          rawSupabase
            .from("tpmap_records")
            .select("*")
            .eq("fiscal_year", fiscalYear)
            .eq("dataset_group", group)
            .eq("area_level", levelParam)
            .order("poor_mofval_cnt", { ascending: false }),
          rawSupabase
            .from("tpmap_records")
            .select("*")
            .eq("dataset_group", group)
            .eq("area_level", "amphur"),
        ]);

      if (dbErr && isMissingTableError(dbErr)) {
        needsMigration = true;
      } else if (dbRows && dbRows.length > 0) {
        records = dbRows.map(mapDbRowToRecord);
      }

      if (sumDbRows && sumDbRows.length > 0) {
        summaryRows = sumDbRows.map(mapDbRowToRecord);
      }
    }

    // ถ้ายังไม่มีใน Supabase หรือกด forceSync ให้ดึงจาก tpmap.in.th แล้วบันทึกลง Supabase
    if (records.length === 0 || forceSync) {
      const areaMap = await fetchAreaNameMap();
      records = await fetchAndParseLiveCsv(fiscalYear, group, levelParam, areaMap);
      records.sort((a, b) => b.poorMofvalCnt - a.poorMofvalCnt);
      source = "live";

      if (!needsMigration) {
        const upRes = await upsertRecordsToSupabase(records);
        if (upRes.needsMigration) needsMigration = true;
      }
    }

    // ตรวจสอบว่ามีข้อมูลครบ 5 ปีสำหรับกราฟแนวโน้มหรือยัง (ถ้ายัง ดึงสดสำหรับปีที่ขาด)
    const existingYears = new Set(summaryRows.map((r) => r.fiscalYear));
    const missingYears = TPMAP_YEARS.filter((y) => !existingYears.has(y));
    if (missingYears.length > 0 || forceSync) {
      const areaMap = await fetchAreaNameMap();
      const targetYears = forceSync ? [...TPMAP_YEARS] : missingYears;
      const fetchedLists = await Promise.all(
        targetYears.map((yr) =>
          fetchAndParseLiveCsv(yr, group, "amphur", areaMap).catch(() => [])
        )
      );
      const newlyFetched = fetchedLists.flat();
      if (!needsMigration && newlyFetched.length > 0) {
        const upRes = await upsertRecordsToSupabase(newlyFetched);
        if (upRes.needsMigration) needsMigration = true;
      }
      const byKey = new Map<string, TpmapRecord>();
      for (const r of [...summaryRows, ...newlyFetched]) {
        byKey.set(`${r.fiscalYear}:${r.areaId}`, r);
      }
      summaryRows = Array.from(byKey.values());
    }

    const fiveYearSummary = summarizeByYear(summaryRows);

    return NextResponse.json({
      success: true,
      needsMigration,
      source,
      fiscalYear,
      datasetGroup: group,
      areaLevel: levelParam,
      records,
      fiveYearSummary,
    });
  } catch (err) {
    console.error("GET /api/tpmap error:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "ไม่สามารถดึงข้อมูล TPMAP ได้",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const groupRaw = body?.group;
    const groups: TpmapDatasetGroup[] =
      groupRaw === "card" || groupRaw === "all" || groupRaw === "nocard"
        ? [groupRaw]
        : ["card", "all", "nocard"];

    const areaMap = await fetchAreaNameMap();
    const allRecords: TpmapRecord[] = [];

    for (const g of groups) {
      const jobs: Promise<TpmapRecord[]>[] = [];
      for (const yr of TPMAP_YEARS) {
        jobs.push(fetchAndParseLiveCsv(yr, g, "amphur", areaMap).catch(() => []));
        jobs.push(fetchAndParseLiveCsv(yr, g, "tambol", areaMap).catch(() => []));
      }
      const resLists = await Promise.all(jobs);
      for (const list of resLists) {
        allRecords.push(...list);
      }
    }

    const upRes = await upsertRecordsToSupabase(allRecords);
    if (upRes.needsMigration) {
      return NextResponse.json(
        {
          success: false,
          needsMigration: true,
          error: "ยังไม่ได้สร้างตาราง tpmap_records ใน Supabase",
        },
        { status: 400 }
      );
    }
    if (upRes.error) {
      throw new Error(upRes.error);
    }

    return NextResponse.json({
      success: true,
      syncedCount: allRecords.length,
    });
  } catch (err) {
    console.error("POST /api/tpmap error:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "ไม่สามารถซิงก์ข้อมูล TPMAP ทั้งหมดได้",
      },
      { status: 500 }
    );
  }
}
