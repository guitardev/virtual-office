/**
 * Attendance Hybrid Database Service (Supabase Cloud + Synology NAS MariaDB)
 * --------------------------------------------------------------------------
 * รองรับสถาปัตยกรรม Hybrid:
 * - Master On-Premise: Synology NAS MariaDB (พอร์ต 3308)
 * - Cloud Replica: Supabase PostgreSQL (สำหรับ Vercel และการเข้าถึงจากภายนอก)
 */

import { createClient } from "@supabase/supabase-js";
import { AttendanceLogItem, ScannerUserMapping, AuthorizedAttendanceEditor, NasMysqlConfig } from "./attendance-db";

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
 * แปลงฟอร์แมต Item ให้เข้ากับคอลัมน์ของ Supabase
 */
function mapLogToSupabase(log: AttendanceLogItem) {
  // แปลง YYYY-MM-DD HH:mm:ss เป็น ISO String
  const scanTimeIso = new Date(log.scanTimestamp.replace(" ", "T") + "+07:00").toISOString();
  const originalTimeIso = new Date(log.originalTimestamp.replace(" ", "T") + "+07:00").toISOString();
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

/**
 * ดึงรายการบันทึกเวลาจาก Supabase (ใช้สำหรับกรณี Vercel หรือเรียกดูข้อมูลบน Cloud)
 */
export async function fetchAttendanceLogsFromSupabase(filter?: {
  dateFrom?: string;
  dateTo?: string;
  scannerUserId?: number;
  ioMode?: number;
  search?: string;
  limit?: number;
}) {
  try {
    let query = supabaseClient
      .from("attendance_logs")
      .select("*")
      .eq("is_deleted", false)
      .order("scan_timestamp", { ascending: false });

    if (filter?.dateFrom) {
      const fromIso = new Date(`${filter.dateFrom}T00:00:00+07:00`).toISOString();
      query = query.gte("scan_timestamp", fromIso);
    }

    if (filter?.dateTo) {
      const toIso = new Date(`${filter.dateTo}T23:59:59+07:00`).toISOString();
      query = query.lte("scan_timestamp", toIso);
    }

    if (filter?.scannerUserId) {
      query = query.eq("scanner_user_id", filter.scannerUserId);
    }

    if (filter?.ioMode) {
      query = query.eq("io_mode", filter.ioMode);
    }

    if (filter?.search) {
      query = query.ilike("member_name", `%${filter.search}%`);
    }

    query = query.limit(filter?.limit || 1000);

    const { data, error } = await query;
    if (error) throw error;

    // แปลงกลับเป็นฟอร์แมต AttendanceLogItem
    const logs: AttendanceLogItem[] = (data || []).map((row: any) => {
      // แปลง ISO Date กลับเป็น Local "YYYY-MM-DD HH:mm:ss"
      const d = new Date(row.scan_timestamp);
      const pad = (n: number) => String(n).padStart(2, "0");
      // เวลาประเทศไทย UTC+7
      const utc = d.getTime() + d.getTimezoneOffset() * 60000;
      const thDate = new Date(utc + 3600000 * 7);
      const ts = `${thDate.getFullYear()}-${pad(thDate.getMonth() + 1)}-${pad(thDate.getDate())} ${pad(
        thDate.getHours()
      )}:${pad(thDate.getMinutes())}:${pad(thDate.getSeconds())}`;

      return {
        id: row.id,
        recordUid: row.record_uid,
        scannerUserId: row.scanner_user_id,
        memberId: row.member_id,
        memberName: row.member_name,
        division: row.division,
        position: row.position,
        scanTimestamp: ts,
        originalTimestamp: ts,
        ioMode: row.io_mode,
        ioLabel: row.io_label,
        verifyMode: row.verify_mode,
        verifyLabel: row.verify_label,
        machineId: row.machine_id,
        source: row.source,
        isEdited: row.is_edited,
        editedBy: row.edited_by,
        editedAt: row.edited_at,
        editNote: row.edit_note,
        isDeleted: row.is_deleted,
      };
    });

    return { success: true, logs };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch from Supabase", logs: [] };
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
  } catch (err: any) {
    console.error("Supabase Push Single Error:", err.message);
    return { success: false, error: err.message };
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
  } catch (err: any) {
    console.error("Supabase Batch Push Error:", err.message);
    return { success: false, count: 0, error: err.message };
  }
}

/**
 * ตรวจสอบความพร้อมของตารางบน Supabase
 */
export async function checkSupabaseAttendanceReady(): Promise<{ ready: boolean; count: number; error?: string }> {
  try {
    const { count, error } = await supabaseClient
      .from("attendance_logs")
      .select("*", { count: "exact", head: true });

    if (error) {
      return { ready: false, count: 0, error: error.message };
    }

    return { ready: true, count: count || 0 };
  } catch (err: any) {
    return { ready: false, count: 0, error: err.message };
  }
}

