/**
 * Attendance Hybrid Database Service (Supabase Cloud + Synology NAS MariaDB)
 * --------------------------------------------------------------------------
 * รองรับสถาปัตยกรรม Hybrid:
 * - Master On-Premise: Synology NAS MariaDB (พอร์ต 3308)
 * - Cloud Replica: Supabase PostgreSQL (สำหรับ Vercel และการเข้าถึงจากภายนอก)
 */

import { createClient } from "@supabase/supabase-js";
import {
  AttendanceLogItem,
  ScannerUserMapping,
  AuthorizedAttendanceEditor,
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

    const logs: AttendanceLogItem[] = (data || []).map((row: Record<string, unknown>) => {
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
    });

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

/**
 * ซิงก์การจับคู่รหัสเครื่องสแกน (User ID 1..64) ขึ้น Supabase
 */
export async function syncMappingsToSupabase(
  mappings: Record<number, ScannerUserMapping>
) {
  try {
    const rows = Object.values(mappings).map((m) => ({
      scanner_user_id: m.scannerUserId,
      member_id: m.memberId,
      member_name: m.memberName,
      division: m.division || "",
      position: m.position || "",
      updated_by: m.updatedBy || "system",
      updated_at: m.updatedAt || new Date().toISOString(),
    }));
    if (rows.length === 0) return { success: true, count: 0 };

    const { error } = await supabaseClient
      .from("attendance_user_mappings")
      .upsert(rows, { onConflict: "scanner_user_id" });

    if (error) throw error;
    return { success: true, count: rows.length };
  } catch (err: unknown) {
    const e = err as { message?: string };
    return { success: false, count: 0, error: e.message };
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
      map[Number(row.scanner_user_id)] = {
        scannerUserId: Number(row.scanner_user_id),
        memberId: String(row.member_id),
        memberName: String(row.member_name),
        division: String(row.division || ""),
        position: String(row.position || ""),
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

/**
 * นับสถิติรวม (เข้างาน / ออกงาน / แก้ไขแล้ว / มาหลัง 08:30) จาก Supabase ตามตัวกรองปัจจุบัน
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
): Promise<{
  checkIn: number;
  checkOut: number;
  edited: number;
  lateCount: number;
  lateCountIsApprox?: boolean;
}> {
  try {
    const checkInPromise =
      filter.ioMode === 2
        ? Promise.resolve({ count: 0 })
        : applyAttendanceSupabaseFilters(
            supabaseClient
              .from("attendance_logs")
              .select("*", { count: "exact", head: true }),
            { ...filter, ioMode: 1 }
          );

    const checkOutPromise =
      filter.ioMode === 1
        ? Promise.resolve({ count: 0 })
        : applyAttendanceSupabaseFilters(
            supabaseClient
              .from("attendance_logs")
              .select("*", { count: "exact", head: true }),
            { ...filter, ioMode: 2 }
          );

    const editedPromise = applyAttendanceSupabaseFilters(
      supabaseClient
        .from("attendance_logs")
        .select("*", { count: "exact", head: true })
        .eq("is_edited", true),
      filter
    );

    const isSingleDay = Boolean(
      filter.dateFrom && filter.dateTo && filter.dateFrom === filter.dateTo
    );
    const latePromise =
      filter.ioMode === 2
        ? Promise.resolve({ count: 0, exact: true })
        : isSingleDay
        ? applyAttendanceSupabaseFilters(
            supabaseClient
              .from("attendance_logs")
              .select("*", { count: "exact", head: true })
              .gte(
                "scan_timestamp",
                new Date(`${filter.dateFrom}T08:31:00+07:00`).toISOString()
              )
              .lt(
                "scan_timestamp",
                new Date(`${filter.dateFrom}T12:00:00+07:00`).toISOString()
              ),
            { ...filter, ioMode: 1 }
          ).then((r: { count?: number | null }) => ({
            count: Number(r?.count || 0),
            exact: true,
          }))
        : Promise.resolve({ count: -1, exact: false });

    const [inRes, outRes, edRes, lateRes] = await Promise.all([
      checkInPromise,
      checkOutPromise,
      editedPromise,
      latePromise,
    ]);

    let pageLateCount = 0;
    for (const item of fallbackPageLogs) {
      if (item.ioMode === 1) {
        const timePart = item.scanTimestamp.split(" ")[1] || "";
        if (timePart > "08:30:59" && timePart < "12:00:00") {
          pageLateCount++;
        }
      }
    }

    return {
      checkIn: Number((inRes as { count?: number | null })?.count || 0),
      checkOut: Number((outRes as { count?: number | null })?.count || 0),
      edited: Number((edRes as { count?: number | null })?.count || 0),
      lateCount: lateRes.exact ? lateRes.count : pageLateCount,
      lateCountIsApprox: !lateRes.exact,
    };
  } catch {
    let checkIn = 0;
    let checkOut = 0;
    let edited = 0;
    let lateCount = 0;
    for (const item of fallbackPageLogs) {
      if (item.ioMode === 1) {
        checkIn++;
        const timePart = item.scanTimestamp.split(" ")[1] || "";
        if (timePart > "08:30:59" && timePart < "12:00:00") {
          lateCount++;
        }
      } else if (item.ioMode === 2) {
        checkOut++;
      }
      if (item.isEdited) edited++;
    }
    return { checkIn, checkOut, edited, lateCount, lateCountIsApprox: true };
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
