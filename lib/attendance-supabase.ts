/**
 * Attendance Hybrid Database Service (Supabase Cloud + Synology NAS MariaDB)
 * --------------------------------------------------------------------------
 * รองรับสถาปัตยกรรม Hybrid:
 * - Master On-Premise: Synology NAS MariaDB (พอร์ต 3308)
 * - Cloud Replica: Supabase PostgreSQL (สำหรับ Vercel และการเข้าถึงจากภายนอก)
 */

import { createClient } from "@supabase/supabase-js";
import type {
  AttendanceLogItem,
  ScannerUserMapping,
  AuthorizedAttendanceEditor,
  ScannerUidStat,
} from "./attendance-db";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://xkeiuyhkokmecefzzynb.supabase.co";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

/**
 * แปลง Date/ISO String จาก Supabase เป็น "YYYY-MM-DD HH:mm:ss" ตามเวลาไทย (UTC+7)
 * ใช้ getUTC* เสมอเพื่อไม่ให้คลาดเคลื่อนเวลา Server ทำงานบน UTC (เช่น Vercel)
 */
function formatIsoToThaiTimestamp(isoStr?: string | null): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return String(isoStr);
  const th = new Date(d.getTime() + 7 * 3600000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${th.getUTCFullYear()}-${pad(th.getUTCMonth() + 1)}-${pad(
    th.getUTCDate()
  )} ${pad(th.getUTCHours())}:${pad(th.getUTCMinutes())}:${pad(
    th.getUTCSeconds()
  )}`;
}

/**
 * แปลงฟอร์แมต Item ให้เข้ากับคอลัมน์ของ Supabase
 */
function mapLogToSupabase(log: AttendanceLogItem) {
  const scanTimeIso = new Date(
    log.scanTimestamp.replace(" ", "T") + "+07:00"
  ).toISOString();
  const originalTimeIso = new Date(
    (log.originalTimestamp || log.scanTimestamp).replace(" ", "T") + "+07:00"
  ).toISOString();
  const editedAtIso = log.editedAt ? new Date(log.editedAt).toISOString() : null;

  return {
    id: log.id,
    record_uid: log.recordUid,
    scanner_user_id: log.scannerUserId,
    member_id: log.memberId,
    member_name: log.memberName,
    division: log.division || "",
    position: log.position || "",
    scan_timestamp: scanTimeIso,
    original_timestamp: originalTimeIso,
    io_mode: log.ioMode,
    io_label: log.ioLabel,
    verify_mode: log.verifyMode,
    verify_label: log.verifyLabel,
    machine_id: log.machineId,
    source: log.source,
    is_edited: log.isEdited,
    edited_by: log.editedBy || null,
    edited_at: editedAtIso,
    edit_note: log.editNote || null,
    is_deleted: log.isDeleted || false,
    updated_at: new Date().toISOString(),
  };
}

function mapSupabaseRowToAttendanceLog(row: Record<string, unknown>): AttendanceLogItem {
  const ts = formatIsoToThaiTimestamp(row.scan_timestamp as string);
  const origTs =
    formatIsoToThaiTimestamp(row.original_timestamp as string) || ts;

  return {
    id: String(row.id),
    recordUid: String(row.record_uid),
    scannerUserId: Number(row.scanner_user_id),
    memberId: String(row.member_id || ""),
    memberName: String(row.member_name || ""),
    division: String(row.division || ""),
    position: String(row.position || ""),
    scanTimestamp: ts,
    originalTimestamp: origTs,
    ioMode: Number(row.io_mode),
    ioLabel: String(row.io_label || ""),
    verifyMode: Number(row.verify_mode),
    verifyLabel: String(row.verify_label || ""),
    machineId: Number(row.machine_id || 1),
    source: (row.source === "manual" ? "manual" : "device") as "device" | "manual",
    isEdited: Boolean(row.is_edited),
    editedBy: row.edited_by ? String(row.edited_by) : undefined,
    editedAt: row.edited_at ? String(row.edited_at) : undefined,
    editNote: row.edit_note ? String(row.edit_note) : undefined,
    isDeleted: Boolean(row.is_deleted),
  };
}

function applyAttendanceSupabaseFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filter?: {
    dateFrom?: string;
    dateTo?: string;
    scannerUserId?: number;
    ioMode?: number;
    search?: string;
  }
) {
  let q = query.eq("is_deleted", false);

  if (filter?.dateFrom) {
    const fromIso = new Date(`${filter.dateFrom}T00:00:00+07:00`).toISOString();
    q = q.gte("scan_timestamp", fromIso);
  }

  if (filter?.dateTo) {
    const toIso = new Date(`${filter.dateTo}T23:59:59+07:00`).toISOString();
    q = q.lte("scan_timestamp", toIso);
  }

  if (filter?.scannerUserId) {
    q = q.eq("scanner_user_id", filter.scannerUserId);
  }

  if (filter?.ioMode) {
    q = q.eq("io_mode", filter.ioMode);
  }

  if (filter?.search && filter.search.trim()) {
    const keyword = filter.search.trim().replace(/,/g, "");
    if (/^\d+$/.test(keyword)) {
      q = q.or(
        `scanner_user_id.eq.${Number(keyword)},member_name.ilike.%${keyword}%,division.ilike.%${keyword}%,edit_note.ilike.%${keyword}%`
      );
    } else {
      q = q.or(
        `member_name.ilike.%${keyword}%,division.ilike.%${keyword}%,edit_note.ilike.%${keyword}%`
      );
    }
  }

  return q;
}

/**
 * ดึงรายการบันทึกเวลาจาก Supabase พร้อมแบ่งหน้า (Pagination) และนับจำนวนทั้งหมด
 */
export async function fetchAttendanceLogsFromSupabase(filter?: {
  dateFrom?: string;
  dateTo?: string;
  scannerUserId?: number;
  ioMode?: number;
  search?: string;
  page?: number;
  pageSize?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  logs: AttendanceLogItem[];
  filteredTotal: number;
  error?: string;
}> {
  try {
    const page = Math.max(1, filter?.page || 1);
    const pageSize = Math.min(1000, Math.max(1, filter?.pageSize || filter?.limit || 200));
    const fromIdx = (page - 1) * pageSize;
    const toIdx = fromIdx + pageSize - 1;

    let query = supabaseClient
      .from("attendance_logs")
      .select("*", { count: "exact" })
      .order("scan_timestamp", { ascending: false });

    query = applyAttendanceSupabaseFilters(query, filter);
    query = query.range(fromIdx, toIdx);

    const { data, count, error } = await query;
    if (error) throw error;

    const logs: AttendanceLogItem[] = (data || []).map((row: Record<string, unknown>) =>
      mapSupabaseRowToAttendanceLog(row)
    );

    return {
      success: true,
      logs,
      filteredTotal: typeof count === "number" ? count : logs.length,
    };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return {
      success: false,
      error: e.message || "Failed to fetch from Supabase",
      logs: [],
      filteredTotal: 0,
    };
  }
}

/**
 * ดึงรายการวันที่ล่าสุดที่มีการสแกนจาก Supabase (สำหรับปุ่มเลือกวันที่ด่วนบน Cloud)
 */
export async function fetchAvailableDatesFromSupabase(): Promise<string[]> {
  try {
    const { data, error } = await supabaseClient
      .from("attendance_logs")
      .select("scan_timestamp")
      .eq("is_deleted", false)
      .order("scan_timestamp", { ascending: false })
      .limit(1000);

    if (error || !data) return [];
    const dates = new Set<string>();
    for (const row of data) {
      const ts = formatIsoToThaiTimestamp((row as { scan_timestamp: string }).scan_timestamp);
      if (ts) dates.add(ts.slice(0, 10));
      if (dates.size >= 60) break;
    }
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  } catch {
    return [];
  }
}

let cachedAvailableMonths: { months: string[]; expiresAt: number } | null = null;
let availableMonthsBypassTelemetry = false;
const AVAILABLE_MONTHS_CACHE_TTL_MS = 60 * 1000;

/**
 * ล้างแคชรายการเดือนที่ดึงไว้ (เช่น หลังเพิ่มรายการลงเวลาด้วยตนเองในเดือนใหม่)
 */
export function invalidateAvailableMonthsCache(): void {
  cachedAvailableMonths = null;
  availableMonthsBypassTelemetry = true;
}

/**
 * ดึงรายการเดือน ("YYYY-MM") ทั้งหมดที่มีข้อมูลใน Supabase
 * ใช้ Telemetry ที่แคชไว้เมื่อมี หรือทำการ Skip-Scan ผ่านดัชนี scan_timestamp (แคช 60 วินาที)
 * โดยไม่ต้องดาวน์โหลดข้อมูลทั้งหมด
 */
export async function fetchAvailableMonthsFromSupabase(
  telemetryMonths?: string[]
): Promise<string[]> {
  if (cachedAvailableMonths && Date.now() < cachedAvailableMonths.expiresAt) {
    return cachedAvailableMonths.months;
  }

  if (
    !availableMonthsBypassTelemetry &&
    Array.isArray(telemetryMonths) &&
    telemetryMonths.length > 0
  ) {
    const normalized = Array.from(
      new Set(
        telemetryMonths.filter(
          (m): m is string => typeof m === "string" && /^\d{4}-\d{2}$/.test(m)
        )
      )
    ).sort((a, b) => b.localeCompare(a));
    if (normalized.length > 0) {
      return normalized;
    }
  }

  try {
    const monthsSet = new Set<string>();
    let monthStartIso: string | null = null;
    const maxIterations = 240;
    let hasQueryError = false;

    for (let i = 0; i < maxIterations; i++) {
      let query = supabaseClient
        .from("attendance_logs")
        .select("scan_timestamp")
        .eq("is_deleted", false)
        .order("scan_timestamp", { ascending: false })
        .limit(1);

      if (monthStartIso) {
        query = query.lt("scan_timestamp", monthStartIso);
      }

      const { data, error } = await query;
      if (error) {
        hasQueryError = true;
        break;
      }
      if (!data || data.length === 0) break;

      const ts = formatIsoToThaiTimestamp(
        (data[0] as { scan_timestamp: string }).scan_timestamp
      );
      const yearMonth = ts ? ts.slice(0, 7) : "";
      if (!/^\d{4}-\d{2}$/.test(yearMonth)) break;

      monthsSet.add(yearMonth);

      const nextMonthStartIso = new Date(
        `${yearMonth}-01T00:00:00+07:00`
      ).toISOString();
      if (monthStartIso && nextMonthStartIso >= monthStartIso) break;
      monthStartIso = nextMonthStartIso;
    }

    const months = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
    if (!hasQueryError && months.length > 0) {
      cachedAvailableMonths = {
        months,
        expiresAt: Date.now() + AVAILABLE_MONTHS_CACHE_TTL_MS,
      };
      availableMonthsBypassTelemetry = false;
    }
    if (hasQueryError && months.length === 0 && cachedAvailableMonths) {
      return cachedAvailableMonths.months;
    }
    return months;
  } catch {
    return cachedAvailableMonths?.months || [];
  }
}

/**
 * บันทึกรายการเดี่ยวขึ้น Supabase (Upsert Single Record)
 */
export async function pushSingleLogToSupabase(log: AttendanceLogItem) {
  try {
    const payload = mapLogToSupabase(log);
    const { error } = await supabaseClient
      .from("attendance_logs")
      .upsert(payload, { onConflict: "record_uid" });

    if (error) throw error;
    return { success: true };
  } catch (err: unknown) {
    const e = err as { message?: string };
    console.error("Supabase Push Single Error:", e.message);
    return { success: false, error: e.message };
  }
}

/**
 * ซิงก์ข้อมูลชุดใหญ่ขึ้น Supabase (Batch Upsert)
 */
export async function batchPushLogsToSupabase(logs: AttendanceLogItem[]) {
  try {
    if (!logs || logs.length === 0) return { success: true, count: 0 };

    const batchSize = 500;
    let totalUpserted = 0;

    for (let i = 0; i < logs.length; i += batchSize) {
      const slice = logs.slice(i, i + batchSize).map(mapLogToSupabase);
      const { error } = await supabaseClient
        .from("attendance_logs")
        .upsert(slice, { onConflict: "record_uid" });

      if (error) throw error;
      totalUpserted += slice.length;
    }

    return { success: true, count: totalUpserted };
  } catch (err: unknown) {
    const e = err as { message?: string };
    console.error("Supabase Batch Push Error:", e.message);
    return { success: false, count: 0, error: e.message };
  }
}

export interface SystemUserProfile {
  id: string;
  name: string;
  nickname?: string | null;
  division: string;
  position: string;
  role: string;
  status: string;
}

/**
 * ดึงรายชื่อบุคลากร/ผู้ใช้ระบบจากตาราง public.users บน Supabase
 */
export async function fetchSystemUsersFromSupabase(): Promise<SystemUserProfile[]> {
  try {
    const { data, error } = await supabaseClient
      .from("users")
      .select("id, name, nickname, division, position, role, status")
      .eq("status", "active")
      .order("name", { ascending: true });

    if (error || !data) return [];
    return data.map((row) => ({
      id: String(row.id),
      name: String(row.name || ""),
      nickname: row.nickname ? String(row.nickname) : null,
      division: String(row.division || ""),
      position: String(row.position || ""),
      role: String(row.role || "member"),
      status: String(row.status || "active"),
    }));
  } catch {
    return [];
  }
}

/**
 * ดึงสถิติจำนวนครั้งที่สแกนและวัน-เวลาล่าสุดของแต่ละรหัสเครื่องสแกน (1..64) ผ่าน RPC
 */
export async function fetchScannerUidStatsFromSupabase(): Promise<
  Record<number, ScannerUidStat> | null
> {
  try {
    const { data, error } = await supabaseClient.rpc("get_attendance_scanner_stats");
    if (error || !Array.isArray(data)) return null;

    const result: Record<number, ScannerUidStat> = {};
    for (const row of data as Array<{
      scanner_user_id: number;
      scan_count: number;
      last_scan_at: string | null;
    }>) {
      const uid = Number(row.scanner_user_id);
      if (!uid) continue;
      result[uid] = {
        scannerUserId: uid,
        scanCount: Number(row.scan_count || 0),
        lastScanAt: row.last_scan_at
          ? formatIsoToThaiTimestamp(row.last_scan_at)
          : null,
      };
    }
    return result;
  } catch {
    return null;
  }
}

/**
 * ซิงก์การจับคู่รหัสเครื่องสแกน (User ID 1..64) ขึ้น Supabase
 */
export async function syncMappingsToSupabase(
  mappings: Record<number, ScannerUserMapping> | ScannerUserMapping[]
) {
  try {
    const entries = Array.isArray(mappings) ? mappings : Object.values(mappings);
    if (entries.length === 0) return { success: true, count: 0 };

    const extendedRows = entries.map((m) => {
      const isMapped =
        typeof m.isMapped === "boolean"
          ? m.isMapped
          : Boolean(m.userId) || !m.memberId.startsWith("scanner_uid_");
      return {
        scanner_user_id: m.scannerUserId,
        user_id: m.userId || null,
        member_id: m.memberId,
        member_name: m.memberName,
        division: m.division || "",
        position: m.position || "",
        is_mapped: isMapped,
        match_method:
          m.matchMethod || (isMapped ? "manual" : "unmapped"),
        updated_by: m.updatedBy || "system",
        updated_at: m.updatedAt || new Date().toISOString(),
      };
    });

    const { error } = await supabaseClient
      .from("attendance_user_mappings")
      .upsert(extendedRows, { onConflict: "scanner_user_id" });

    if (error) {
      if (error.code === "23505") {
        return {
          success: false,
          count: 0,
          code: "DUPLICATE_USER_MAPPING",
          error: "ผู้ใช้ระบบนี้ถูกจับคู่กับรหัสสแกนอื่นอยู่แล้ว (ห้ามจับคู่ซ้ำซ้อน)",
        };
      }

      const isMissingColumnError =
        error.code === "42703" ||
        error.code === "PGRST204" ||
        /column|schema cache/i.test(error.message || "");

      if (!isMissingColumnError) {
        throw error;
      }

      // Fallback gracefully if migration 20261113_link_attendance_to_users.sql has not been applied yet
      const baseRows = entries.map((m) => ({
        scanner_user_id: m.scannerUserId,
        member_id: m.memberId,
        member_name: m.memberName,
        division: m.division || "",
        position: m.position || "",
        updated_by: m.updatedBy || "system",
        updated_at: m.updatedAt || new Date().toISOString(),
      }));
      const retry = await supabaseClient
        .from("attendance_user_mappings")
        .upsert(baseRows, { onConflict: "scanner_user_id" });
      if (retry.error) throw retry.error;
    }

    return { success: true, count: entries.length };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { success: false, count: 0, error: e.message };
  }
}

/**
 * อัปเดตข้อมูลผู้ใช้งานลงใน attendance_logs บน Supabase เมื่อมีการจับคู่หรือยกเลิกจับคู่รหัสสแกน
 */
export async function updateAttendanceLogsMappingOnSupabase(
  scannerUserId: number,
  mapping: ScannerUserMapping
) {
  try {
    const { error } = await supabaseClient
      .from("attendance_logs")
      .update({
        user_id: mapping.userId || null,
        member_id: mapping.memberId,
        member_name: mapping.memberName,
        division: mapping.division || "",
        position: mapping.position || "",
      })
      .eq("scanner_user_id", scannerUserId);

    if (error) {
      const retry = await supabaseClient
        .from("attendance_logs")
        .update({
          member_id: mapping.memberId,
          member_name: mapping.memberName,
          division: mapping.division || "",
          position: mapping.position || "",
        })
        .eq("scanner_user_id", scannerUserId);
      if (retry.error) throw retry.error;
    }
    return { success: true };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { success: false, error: e.message };
  }
}

/**
 * ดึงข้อมูลการจับคู่รหัสเครื่องสแกนจาก Supabase
 */
export async function fetchMappingsFromSupabase(): Promise<
  Record<number, ScannerUserMapping> | null
> {
  try {
    const { data, error } = await supabaseClient
      .from("attendance_user_mappings")
      .select("*");
    if (error || !data || data.length === 0) return null;

    const map: Record<number, ScannerUserMapping> = {};
    for (const row of data) {
      const memberId = String(row.member_id);
      const userId = row.user_id ? String(row.user_id) : null;
      const isMapped =
        typeof row.is_mapped === "boolean"
          ? row.is_mapped
          : Boolean(userId) || !memberId.startsWith("scanner_uid_");
      map[Number(row.scanner_user_id)] = {
        scannerUserId: Number(row.scanner_user_id),
        userId,
        memberId,
        memberName: String(row.member_name),
        division: String(row.division || ""),
        position: String(row.position || ""),
        isMapped,
        matchMethod:
          row.match_method === "manual" ||
          row.match_method === "auto_name" ||
          row.match_method === "unmapped"
            ? row.match_method
            : isMapped
            ? "manual"
            : "unmapped",
        updatedBy: row.updated_by ? String(row.updated_by) : undefined,
        updatedAt: row.updated_at ? String(row.updated_at) : undefined,
      };
    }
    return map;
  } catch {
    return null;
  }
}

/**
 * ซิงก์รายชื่อผู้มีสิทธิ์แก้ไขเวลา (Authorized Editors) ขึ้น Supabase
 */
export async function syncEditorsToSupabase(
  editors: AuthorizedAttendanceEditor[]
) {
  try {
    // ล้างรายการเก่าแล้วบันทึกชุดปัจจุบัน
    await supabaseClient
      .from("attendance_authorized_editors")
      .delete()
      .neq("member_id", "");

    if (editors.length > 0) {
      const rows = editors.map((ed) => ({
        member_id: ed.memberId,
        member_name: ed.memberName,
        division: ed.division || "",
        role: ed.role || "member",
        granted_by: ed.grantedBy || "admin",
        granted_at: ed.grantedAt || new Date().toISOString(),
      }));
      const { error } = await supabaseClient
        .from("attendance_authorized_editors")
        .upsert(rows, { onConflict: "member_id" });
      if (error) throw error;
    }

    return { success: true, count: editors.length };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { success: false, count: 0, error: e.message };
  }
}

export interface AttendanceSummaryStats {
  checkInOnTime: number;
  checkOut: number;
  lateOrLeave: number;
  midDay: number;
  checkInTotal: number;
  edited: number;
  checkIn: number;
  lateCount: number;
  lateCountIsApprox: boolean;
}

/**
 * นับสถิติรวมทั้ง 4 ประเภทตามระเบียบเวลาราชการ (เข้าเช้าปกติ / ออกราชการ / สายหรืออาจลา / ระหว่างวัน / แก้ไขแล้ว)
 * จาก Supabase ตามตัวกรองปัจจุบัน
 */
export async function fetchSummaryStatsFromSupabase(
  filter: {
    dateFrom?: string;
    dateTo?: string;
    scannerUserId?: number;
    ioMode?: number;
    search?: string;
  },
  fallbackPageLogs: AttendanceLogItem[]
): Promise<AttendanceSummaryStats> {
  try {
    const countForMode = (mode: 1 | 2 | 3 | 4) => {
      if (filter.ioMode && filter.ioMode !== mode) {
        return Promise.resolve({ count: 0 });
      }
      return applyAttendanceSupabaseFilters(
        supabaseClient
          .from("attendance_logs")
          .select("*", { count: "exact", head: true }),
        { ...filter, ioMode: mode }
      );
    };

    const editedPromise = applyAttendanceSupabaseFilters(
      supabaseClient
        .from("attendance_logs")
        .select("*", { count: "exact", head: true })
        .eq("is_edited", true),
      filter
    );

    const [m1Res, m2Res, m3Res, m4Res, edRes] = await Promise.all([
      countForMode(1),
      countForMode(2),
      countForMode(3),
      countForMode(4),
      editedPromise,
    ]);

    const checkInOnTime = Number((m1Res as { count?: number | null })?.count || 0);
    const checkOut = Number((m2Res as { count?: number | null })?.count || 0);
    const lateOrLeave = Number((m3Res as { count?: number | null })?.count || 0);
    const midDay = Number((m4Res as { count?: number | null })?.count || 0);
    const edited = Number((edRes as { count?: number | null })?.count || 0);
    const checkInTotal = checkInOnTime + lateOrLeave;

    return {
      checkInOnTime,
      checkOut,
      lateOrLeave,
      midDay,
      checkInTotal,
      edited,
      checkIn: checkInTotal,
      lateCount: lateOrLeave,
      lateCountIsApprox: false,
    };
  } catch {
    let checkInOnTime = 0;
    let checkOut = 0;
    let lateOrLeave = 0;
    let midDay = 0;
    let edited = 0;
    for (const item of fallbackPageLogs) {
      if (item.ioMode === 1) {
        checkInOnTime++;
      } else if (item.ioMode === 2) {
        checkOut++;
      } else if (item.ioMode === 3) {
        lateOrLeave++;
      } else if (item.ioMode === 4) {
        midDay++;
      }
      if (item.isEdited) edited++;
    }
    const checkInTotal = checkInOnTime + lateOrLeave;
    return {
      checkInOnTime,
      checkOut,
      lateOrLeave,
      midDay,
      checkInTotal,
      edited,
      checkIn: checkInTotal,
      lateCount: lateOrLeave,
      lateCountIsApprox: true,
    };
  }
}

/**
 * ดึงรายชื่อผู้มีสิทธิ์แก้ไขเวลาจาก Supabase
 */
export async function fetchAuthorizedEditorsFromSupabase(): Promise<
  AuthorizedAttendanceEditor[] | null
> {
  try {
    const { data, error } = await supabaseClient
      .from("attendance_authorized_editors")
      .select("*");
    if (error || !data) return null;

    return data.map((row: Record<string, unknown>) => ({
      memberId: String(row.member_id),
      memberName: String(row.member_name),
      division: String(row.division || ""),
      role: String(row.role || "member"),
      grantedBy: row.granted_by ? String(row.granted_by) : "ระบบ",
      grantedAt: row.granted_at ? String(row.granted_at) : new Date().toISOString(),
    }));
  } catch {
    return null;
  }
}

export interface AttendanceSyncTelemetry {
  lastSyncedAt: string | null;
  lastMysqlSyncedAt?: string | null;
  deviceTotalRecords: number;
  registeredUsersCount?: number;
  fingerprintsCount?: number;
  passwordsCount?: number;
  idCardsCount?: number;
  maxAttendanceLogs?: number;
  serialNumber?: string;
  productCode?: string;
  deviceTime?: string;
  scannerIp?: string;
  addedCount?: number;
  pulledCount?: number;
  availableMonths?: string[];
  source?: string;
}

const SYNC_TELEMETRY_ACTOR_ID = "hip_cmi681s_sync";

/**
 * ดึงรายการที่ถูกแก้ไข, ลบ (soft-delete) หรือเพิ่มแบบ Manual จาก Supabase
 * เพื่อป้องกันการซิงก์จากเครื่องสแกนทับข้อมูลที่แก้ไขผ่านหน้าเว็บ Cloud
 */
export async function fetchCloudEditedOrManualLogsFromSupabase(): Promise<
  AttendanceLogItem[] | null
> {
  try {
    const allRows: AttendanceLogItem[] = [];
    const pageSize = 1000;
    let offset = 0;

    while (true) {
      const { data, error } = await supabaseClient
        .from("attendance_logs")
        .select("*")
        .or("is_edited.eq.true,is_deleted.eq.true,source.eq.manual")
        .order("scan_timestamp", { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) return null;
      if (!data || data.length === 0) break;

      for (const row of data) {
        allRows.push(mapSupabaseRowToAttendanceLog(row as Record<string, unknown>));
      }
      if (data.length < pageSize) break;
      offset += pageSize;
    }

    return allRows;
  } catch {
    return null;
  }
}

/**
 * บันทึก Telemetry การซิงก์ล่าสุดขึ้น Supabase (audit_logs) เพื่อให้ฝั่ง Cloud/Vercel
 * แสดงยอดล่าสุดในเครื่องสแกนและเวลาซิงก์ล่าสุดตรงกัน
 */
export async function recordAttendanceSyncTelemetryToSupabase(
  telemetry: AttendanceSyncTelemetry,
  actorName?: string,
  forceInsert = false
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  try {
    const prev = await fetchLatestAttendanceSyncTelemetryFromSupabase();
    if (!forceInsert && prev) {
      const prevTs = prev.lastSyncedAt ? new Date(prev.lastSyncedAt).getTime() : 0;
      const elapsedMs = Date.now() - prevTs;
      const sameTotal = prev.deviceTotalRecords === telemetry.deviceTotalRecords;
      const noNewRows = (telemetry.addedCount || 0) === 0;
      const hasMonthsAlready =
        !telemetry.availableMonths?.length ||
        (Array.isArray(prev.availableMonths) &&
          prev.availableMonths.length === telemetry.availableMonths.length);
      if (sameTotal && noNewRows && hasMonthsAlready && elapsedMs < 6 * 3600 * 1000) {
        return { success: true, skipped: true };
      }
    }

    const { error } = await supabaseClient.from("audit_logs").insert({
      actor_id: SYNC_TELEMETRY_ACTOR_ID,
      actor_name: actorName || "ระบบซิงก์เครื่องสแกนอัตโนมัติ (LAN)",
      action: "ซิงก์ข้อมูลเวลาปฏิบัติราชการจากเครื่องสแกน HIP CMi681S",
      target: `เครื่องสแกน ${telemetry.scannerIp || "HIP CMi681S"} — ยอดในเครื่อง ${telemetry.deviceTotalRecords.toLocaleString()} รายการ (เพิ่มใหม่ ${(telemetry.addedCount || 0).toLocaleString()} รายการ)`,
      status: "success",
      metadata: {
        type: "attendance_device_sync",
        ...telemetry,
      },
    });

    if (error) return { success: false, error: error.message };
    if (Array.isArray(telemetry.availableMonths) && telemetry.availableMonths.length > 0) {
      cachedAvailableMonths = {
        months: [...telemetry.availableMonths].sort((a, b) => b.localeCompare(a)),
        expiresAt: Date.now() + AVAILABLE_MONTHS_CACHE_TTL_MS,
      };
      availableMonthsBypassTelemetry = false;
    }
    return { success: true };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { success: false, error: e.message };
  }
}

/**
 * ดึง Telemetry การซิงก์เครื่องสแกนล่าสุดจาก Supabase (สำหรับแสดงบน Cloud/Vercel)
 */
export async function fetchLatestAttendanceSyncTelemetryFromSupabase(): Promise<AttendanceSyncTelemetry | null> {
  try {
    const { data, error } = await supabaseClient
      .from("audit_logs")
      .select("timestamp, metadata")
      .eq("actor_id", SYNC_TELEMETRY_ACTOR_ID)
      .order("timestamp", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;
    const row = data[0] as {
      timestamp?: string;
      metadata?: Record<string, unknown> | null;
    };
    const meta = row.metadata || {};
    return {
      lastSyncedAt:
        (typeof meta.lastSyncedAt === "string" ? meta.lastSyncedAt : null) ||
        row.timestamp ||
        null,
      lastMysqlSyncedAt:
        typeof meta.lastMysqlSyncedAt === "string" ? meta.lastMysqlSyncedAt : null,
      deviceTotalRecords: Number(meta.deviceTotalRecords || 0),
      registeredUsersCount:
        typeof meta.registeredUsersCount === "number"
          ? meta.registeredUsersCount
          : undefined,
      fingerprintsCount:
        typeof meta.fingerprintsCount === "number"
          ? meta.fingerprintsCount
          : undefined,
      passwordsCount:
        typeof meta.passwordsCount === "number" ? meta.passwordsCount : undefined,
      idCardsCount:
        typeof meta.idCardsCount === "number" ? meta.idCardsCount : undefined,
      maxAttendanceLogs:
        typeof meta.maxAttendanceLogs === "number"
          ? meta.maxAttendanceLogs
          : undefined,
      serialNumber:
        typeof meta.serialNumber === "string" ? meta.serialNumber : undefined,
      productCode:
        typeof meta.productCode === "string" ? meta.productCode : undefined,
      deviceTime: typeof meta.deviceTime === "string" ? meta.deviceTime : undefined,
      scannerIp: typeof meta.scannerIp === "string" ? meta.scannerIp : undefined,
      addedCount:
        typeof meta.addedCount === "number" ? meta.addedCount : undefined,
      pulledCount:
        typeof meta.pulledCount === "number" ? meta.pulledCount : undefined,
      availableMonths: Array.isArray(meta.availableMonths)
        ? meta.availableMonths
            .filter(
              (m): m is string =>
                typeof m === "string" && /^\d{4}-\d{2}$/.test(m)
            )
            .sort((a, b) => b.localeCompare(a))
        : undefined,
      source: typeof meta.source === "string" ? meta.source : undefined,
    };
  } catch {
    return null;
  }
}

export interface RemoteAttendanceSyncRequest {
  id: string;
  requestId: string;
  status: "pending" | "running" | "success" | "error";
  state: "pending" | "running" | "completed" | "failed";
  limitLatest: number;
  requestedBy: string;
  requestedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  workerHost?: string | null;
  error?: string | null;
  result?: {
    deviceTotalCount?: number;
    pulledCount?: number;
    addedCount?: number;
    updatedCount?: number;
    nasActiveAfter?: number | null;
    supabaseActiveAfter?: number | null;
    elapsedMs?: number;
  } | null;
}

const REMOTE_SYNC_REQUEST_ACTOR_ID = "hip_cmi681s_sync_request";

function mapAuditRowToRemoteSyncRequest(row: {
  id: string;
  timestamp?: string;
  actor_name?: string;
  status?: string;
  metadata?: Record<string, unknown> | null;
}): RemoteAttendanceSyncRequest {
  const meta = row.metadata || {};
  const rawStatus = String(row.status || "pending");
  const status: RemoteAttendanceSyncRequest["status"] =
    rawStatus === "running" || rawStatus === "success" || rawStatus === "error"
      ? rawStatus
      : "pending";
  const rawState = String(meta.state || "");
  const state: RemoteAttendanceSyncRequest["state"] =
    rawState === "running" || rawState === "completed" || rawState === "failed"
      ? rawState
      : status === "success"
      ? "completed"
      : status === "error"
      ? "failed"
      : status === "running"
      ? "running"
      : "pending";

  return {
    id: String(row.id),
    requestId:
      typeof meta.requestId === "string" ? meta.requestId : String(row.id),
    status,
    state,
    limitLatest:
      typeof meta.limitLatest === "number" ? meta.limitLatest : 1500,
    requestedBy:
      typeof meta.requestedBy === "string"
        ? meta.requestedBy
        : row.actor_name || "ผู้ดูแลระบบ",
    requestedAt:
      (typeof meta.requestedAt === "string" ? meta.requestedAt : null) ||
      row.timestamp ||
      new Date().toISOString(),
    startedAt: typeof meta.startedAt === "string" ? meta.startedAt : null,
    completedAt: typeof meta.completedAt === "string" ? meta.completedAt : null,
    workerHost: typeof meta.workerHost === "string" ? meta.workerHost : null,
    error: typeof meta.error === "string" ? meta.error : null,
    result:
      meta.result && typeof meta.result === "object"
        ? (meta.result as RemoteAttendanceSyncRequest["result"])
        : null,
  };
}

/**
 * ดึงคำสั่งซิงก์ระยะไกล (Remote Sync Request) ล่าสุดจาก Supabase (audit_logs)
 */
export async function fetchLatestRemoteAttendanceSyncRequest(): Promise<RemoteAttendanceSyncRequest | null> {
  try {
    const { data, error } = await supabaseClient
      .from("audit_logs")
      .select("id, timestamp, actor_name, status, metadata")
      .eq("actor_id", REMOTE_SYNC_REQUEST_ACTOR_ID)
      .order("timestamp", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;
    return mapAuditRowToRemoteSyncRequest(
      data[0] as {
        id: string;
        timestamp?: string;
        actor_name?: string;
        status?: string;
        metadata?: Record<string, unknown> | null;
      }
    );
  } catch {
    return null;
  }
}

/**
 * ส่งคำสั่งซิงก์เครื่องสแกนจากระยะไกล (Cloud/Vercel) เข้าคิวใน Supabase
 * เพื่อให้เครื่อง LAN ที่รัน worker มารับไปดึงจากเครื่องสแกนจริง
 */
export async function enqueueRemoteAttendanceSyncRequest(opts: {
  limitLatest: number;
  actorId?: string;
  actorName?: string;
}): Promise<{
  success: boolean;
  request?: RemoteAttendanceSyncRequest;
  deduplicated?: boolean;
  error?: string;
}> {
  try {
    const latest = await fetchLatestRemoteAttendanceSyncRequest();
    if (latest && (latest.state === "pending" || latest.state === "running")) {
      const reqTime = new Date(latest.requestedAt).getTime();
      if (!Number.isNaN(reqTime) && Date.now() - reqTime < 3 * 60 * 1000) {
        return { success: true, request: latest, deduplicated: true };
      }
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const requestedAt = new Date().toISOString();
    const limitLatest = typeof opts.limitLatest === "number" ? opts.limitLatest : 1500;
    const requestedBy = opts.actorName || "ผู้ดูแลระบบ (Cloud)";

    const { data, error } = await supabaseClient
      .from("audit_logs")
      .insert({
        actor_id: REMOTE_SYNC_REQUEST_ACTOR_ID,
        actor_name: requestedBy,
        action: "ส่งคำสั่งซิงก์เครื่องสแกนจากระยะไกล (Cloud Queue)",
        target: `ขอซิงก์ ${
          limitLatest <= 0
            ? "ทั้งหมด"
            : `${limitLatest.toLocaleString()} รายการล่าสุด`
        }`,
        status: "pending",
        metadata: {
          type: "attendance_remote_sync_request",
          requestId,
          limitLatest,
          requestedBy,
          requestedById: opts.actorId || "",
          requestedAt,
          state: "pending",
        },
      })
      .select("id, timestamp, actor_name, status, metadata")
      .single();

    if (error || !data) {
      return {
        success: false,
        error: error?.message || "ไม่สามารถส่งคำสั่งซิงก์ระยะไกลเข้าคิวได้",
      };
    }

    return {
      success: true,
      request: mapAuditRowToRemoteSyncRequest(
        data as {
          id: string;
          timestamp?: string;
          actor_name?: string;
          status?: string;
          metadata?: Record<string, unknown> | null;
        }
      ),
    };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { success: false, error: e.message || "Enqueue failed" };
  }
}

/**
 * ดึงวัน-เวลาที่สแกนล่าสุดในฐานข้อมูล Supabase
 */
export async function fetchLatestAttendanceTimestampFromSupabase(): Promise<
  string | null
> {
  try {
    const { data, error } = await supabaseClient
      .from("attendance_logs")
      .select("scan_timestamp")
      .eq("is_deleted", false)
      .order("scan_timestamp", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;
    return (
      formatIsoToThaiTimestamp(
        (data[0] as { scan_timestamp: string }).scan_timestamp
      ) || null
    );
  } catch {
    return null;
  }
}

/**
 * ตรวจสอบความพร้อมของตารางบน Supabase
 */
export async function checkSupabaseAttendanceReady(): Promise<{
  ready: boolean;
  count: number;
  error?: string;
}> {
  try {
    const { count, error } = await supabaseClient
      .from("attendance_logs")
      .select("*", { count: "exact", head: true })
      .eq("is_deleted", false);

    if (error) {
      return { ready: false, count: 0, error: error.message };
    }

    return { ready: true, count: count || 0 };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { ready: false, count: 0, error: e.message };
  }
}
