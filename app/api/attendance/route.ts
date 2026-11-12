import { NextRequest, NextResponse } from "next/server";
import { HipCmi681sClient } from "@/lib/hip-cmi681s";
import {
  loadAttendanceStore,
  saveAttendanceStore,
  mergeDeviceRecordsIntoStore,
  testAndInitSynologyMysql,
  pushStoreToSynologyMysql,
  upsertSingleLogToSynologyMysql,
  syncMappingToSynologyMysql,
  syncEditorsToSynologyMysql,
  getSynologyMysqlSetupSql,
  buildDefaultMappings,
  AttendanceLogItem,
  AuthorizedAttendanceEditor,
  AttendanceStoreData,
} from "@/lib/attendance-db";
import {
  supabaseClient,
  checkSupabaseAttendanceReady,
  batchPushLogsToSupabase,
  pushSingleLogToSupabase,
  fetchAttendanceLogsFromSupabase,
  fetchSummaryStatsFromSupabase,
  fetchAvailableDatesFromSupabase,
  syncMappingsToSupabase,
  fetchMappingsFromSupabase,
  syncEditorsToSupabase,
  fetchAuthorizedEditorsFromSupabase,
} from "@/lib/attendance-supabase";

export const dynamic = "force-dynamic";

async function resolveEffectiveEditors(
  store: AttendanceStoreData
): Promise<AuthorizedAttendanceEditor[]> {
  const cloudEditors = await fetchAuthorizedEditorsFromSupabase();
  if (cloudEditors !== null) {
    if (
      cloudEditors.length > 0 ||
      store.editorsCustomized ||
      process.env.VERCEL === "1"
    ) {
      return cloudEditors;
    }
  }
  return store.authorizedEditors;
}

async function verifyEditorPermission(
  store: AttendanceStoreData,
  actorId?: string,
  actorRole?: string,
  actorName?: string,
  requireAdminOnly = false
): Promise<boolean> {
  if (actorRole === "admin") return true;
  if (requireAdminOnly) return false;
  if (!actorId && !actorName) return false;

  const editors = await resolveEffectiveEditors(store);
  return editors.some(
    (ed) =>
      (actorId && ed.memberId === actorId) ||
      (actorName && ed.memberName.trim() === actorName.trim())
  );
}

async function fetchSingleLogByIdFromSupabase(
  id: string
): Promise<AttendanceLogItem | null> {
  try {
    const { data, error } = await supabaseClient
      .from("attendance_logs")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;

    const toThaiTs = (iso?: string | null) => {
      if (!iso) return "";
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return String(iso);
      const th = new Date(d.getTime() + 7 * 3600000);
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${th.getUTCFullYear()}-${pad(th.getUTCMonth() + 1)}-${pad(
        th.getUTCDate()
      )} ${pad(th.getUTCHours())}:${pad(th.getUTCMinutes())}:${pad(
        th.getUTCSeconds()
      )}`;
    };

    const ts = toThaiTs(data.scan_timestamp);
    return {
      id: String(data.id),
      recordUid: String(data.record_uid),
      scannerUserId: Number(data.scanner_user_id),
      memberId: String(data.member_id || ""),
      memberName: String(data.member_name || ""),
      division: String(data.division || ""),
      position: String(data.position || ""),
      scanTimestamp: ts,
      originalTimestamp: toThaiTs(data.original_timestamp) || ts,
      ioMode: Number(data.io_mode),
      ioLabel: String(data.io_label || ""),
      verifyMode: Number(data.verify_mode),
      verifyLabel: String(data.verify_label || ""),
      machineId: Number(data.machine_id || 1),
      source: data.source === "manual" ? "manual" : "device",
      isEdited: Boolean(data.is_edited),
      editedBy: data.edited_by ? String(data.edited_by) : undefined,
      editedAt: data.edited_at ? String(data.edited_at) : undefined,
      editNote: data.edit_note ? String(data.edit_note) : undefined,
      isDeleted: Boolean(data.is_deleted),
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const onlyEditors = searchParams.get("onlyEditors") === "1";

    const store = loadAttendanceStore();

    // Endpoint เบาพิเศษสำหรับให้ AppContext ดึงสิทธิ์ผู้แก้ไขเวลาเมื่อเริ่มต้นระบบ
    if (onlyEditors) {
      const editors = await resolveEffectiveEditors(store);
      return NextResponse.json({
        success: true,
        authorizedEditors: editors,
      });
    }

    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const scannerUserId = searchParams.get("scannerUserId") || "";
    const ioMode = searchParams.get("ioMode") || "";
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const checkHardware = searchParams.get("checkHardware") === "1";
    const forceSource = searchParams.get("source") || "";
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(
      1000,
      Math.max(20, Number(searchParams.get("pageSize") || 200))
    );

    // ตรวจสอบสถานะ MySQL บน Synology NAS และ Supabase Cloud พร้อมกัน
    const [mysqlStatus, supabaseStatus] = await Promise.all([
      testAndInitSynologyMysql(store.mysqlConfig),
      checkSupabaseAttendanceReady(),
    ]);

    // ตรวจสอบสถานะเครื่องสแกน HIP CMi681S (192.168.162.15:5005) หากระบุ checkHardware=1
    let scannerOverview: unknown = null;
    if (checkHardware) {
      const client = new HipCmi681sClient({
        ip: store.mysqlConfig.scannerIp,
        port: store.mysqlConfig.scannerPort,
        password: store.mysqlConfig.scannerPassword,
        timeoutMs: 5000,
      });
      try {
        await client.connect();
        scannerOverview = await client.getDeviceOverview();
        client.disconnect();
      } catch (err: unknown) {
        client.disconnect();
        const e = err as { message?: string };
        scannerOverview = {
          error: e.message || "ไม่สามารถเชื่อมต่อเครื่องสแกนได้",
        };
      }
    }

    let logsResult: AttendanceLogItem[] = [];
    let filteredTotal = 0;
    let totalStoredLogs = 0;
    let availableDates: string[] = [];
    let mappings = store.mappings;
    let authorizedEditors = await resolveEffectiveEditors(store);
    let dataSource: "local" | "supabase" = "local";
    let summaryStats: {
      checkIn: number;
      checkOut: number;
      edited: number;
      lateCount: number;
      lateCountIsApprox?: boolean;
    } = { checkIn: 0, checkOut: 0, edited: 0, lateCount: 0 };

    const activeLocalLogs = store.logs.filter((l) => !l.isDeleted);
    const localIncomplete =
      supabaseStatus.ready && supabaseStatus.count > activeLocalLogs.length;

    // ใช้ Local Store เมื่อมีข้อมูลครบถ้วนและไม่ได้บังคับอ่านจาก Supabase; มิฉะนั้น Fallback ไป Supabase Cloud (เช่น บน Vercel หรือ Local แคชไม่ครบ)
    if (
      activeLocalLogs.length > 0 &&
      forceSource !== "supabase" &&
      !localIncomplete
    ) {
      dataSource = "local";
      let filtered = activeLocalLogs;

      if (dateFrom) {
        filtered = filtered.filter(
          (l) => l.scanTimestamp.slice(0, 10) >= dateFrom
        );
      }
      if (dateTo) {
        filtered = filtered.filter(
          (l) => l.scanTimestamp.slice(0, 10) <= dateTo
        );
      }
      if (scannerUserId && scannerUserId !== "all") {
        const uidNum = Number(scannerUserId);
        filtered = filtered.filter((l) => l.scannerUserId === uidNum);
      }
      if (ioMode && ioMode !== "all") {
        const modeNum = Number(ioMode);
        filtered = filtered.filter((l) => l.ioMode === modeNum);
      }
      if (search) {
        filtered = filtered.filter(
          (l) =>
            l.memberName.toLowerCase().includes(search) ||
            l.division.toLowerCase().includes(search) ||
            String(l.scannerUserId).includes(search) ||
            l.scanTimestamp.includes(search) ||
            (l.editNote && l.editNote.toLowerCase().includes(search))
        );
      }

      // คำนวณสถิติรวมจากข้อมูลที่กรองทั้งหมด (ไม่ใช่แค่หน้าที่แสดง)
      for (const item of filtered) {
        if (item.ioMode === 1) {
          summaryStats.checkIn++;
          const timePart = item.scanTimestamp.split(" ")[1] || "";
          if (timePart > "08:30:59" && timePart < "12:00:00") {
            summaryStats.lateCount++;
          }
        } else if (item.ioMode === 2) {
          summaryStats.checkOut++;
        }
        if (item.isEdited) summaryStats.edited++;
      }

      filteredTotal = filtered.length;
      const startIdx = (page - 1) * pageSize;
      logsResult = filtered.slice(startIdx, startIdx + pageSize);
      totalStoredLogs = activeLocalLogs.length;

      availableDates = Array.from(
        new Set(activeLocalLogs.map((l) => l.scanTimestamp.slice(0, 10)))
      )
        .sort((a, b) => b.localeCompare(a))
        .slice(0, 60);
    } else if (supabaseStatus.ready) {
      // โหมด Cloud Fallback (ทำงานบน Vercel หรือเครื่องใหม่ที่ยังไม่มี Local JSON Cache ครบ)
      dataSource = "supabase";
      const supaFilter = {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        scannerUserId:
          scannerUserId && scannerUserId !== "all"
            ? Number(scannerUserId)
            : undefined,
        ioMode: ioMode && ioMode !== "all" ? Number(ioMode) : undefined,
        search: search || undefined,
      };
      const [supaRes, supaDates, supaMappings] = await Promise.all([
        fetchAttendanceLogsFromSupabase({
          ...supaFilter,
          page,
          pageSize,
        }),
        fetchAvailableDatesFromSupabase(),
        fetchMappingsFromSupabase(),
      ]);

      logsResult = supaRes.logs;
      filteredTotal = supaRes.filteredTotal;
      totalStoredLogs = supabaseStatus.count;
      availableDates = supaDates;
      if (supaMappings) {
        mappings = { ...buildDefaultMappings(), ...supaMappings };
      }

      summaryStats = await fetchSummaryStatsFromSupabase(
        supaFilter,
        logsResult
      );
    }

    const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize));

    const safeMysqlConfig = {
      ...store.mysqlConfig,
      password: store.mysqlConfig.password ? "••••••••" : "",
      cloudflareBridgeSecret: store.mysqlConfig.cloudflareBridgeSecret
        ? "••••••••"
        : "",
      scannerPassword: 0,
    };

    return NextResponse.json({
      success: true,
      dataSource,
      page,
      pageSize,
      totalPages,
      mysqlConfig: safeMysqlConfig,
      mysqlStatus,
      supabaseStatus,
      setupSql: getSynologyMysqlSetupSql(store.mysqlConfig),
      scannerOverview,
      lastSyncedAt: store.lastSyncedAt,
      lastMysqlSyncedAt: store.lastMysqlSyncedAt,
      deviceTotalRecords:
        store.deviceTotalRecords || supabaseStatus.count || 30061,
      totalStoredLogs,
      availableDates,
      mappings,
      authorizedEditors,
      summaryStats,
      logs: logsResult,
      filteredTotal,
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json(
      { success: false, error: e.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, actorId, actorRole, actorName } = body;
    const store = loadAttendanceStore();

    // 1. ซิงก์ข้อมูลจากเครื่องสแกนลายนิ้วมือ HIP CMi681S (192.168.162.15:5005)
    if (action === "sync_device") {
      // ป้องกันการเรียกซิงก์โดยผู้ไม่มีสิทธิ์
      const allowed = await verifyEditorPermission(
        store,
        actorId,
        actorRole,
        actorName
      );
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: "คุณไม่มีสิทธิ์ซิงก์ข้อมูลจากเครื่องสแกน" },
          { status: 403 }
        );
      }

      const limitLatest =
        typeof body.limitLatest === "number" ? body.limitLatest : 1500;

      const client = new HipCmi681sClient({
        ip: store.mysqlConfig.scannerIp,
        port: store.mysqlConfig.scannerPort,
        password: store.mysqlConfig.scannerPassword,
        timeoutMs: 35000,
      });

      await client.connect();
      const overview = await client.getDeviceOverview();
      client.disconnect();

      const logClient = new HipCmi681sClient({
        ip: store.mysqlConfig.scannerIp,
        port: store.mysqlConfig.scannerPort,
        password: store.mysqlConfig.scannerPassword,
        timeoutMs: 35000,
      });
      await logClient.connect();
      const pulled = await logClient.getAttendanceLogs(
        limitLatest > 0 ? limitLatest : undefined
      );
      logClient.disconnect();

      const mergeResult = mergeDeviceRecordsIntoStore(
        store,
        pulled.records,
        pulled.totalCount
      );

      // พยายามซิงก์ขึ้น MySQL บน Synology NAS ทันที
      const mysqlSync = await pushStoreToSynologyMysql(store);

      // ดึง Object ที่มี ID จริงจาก Store (ป้องกัน Primary Key ชนบน Supabase) แล้วส่งขึ้น Cloud Replica
      const byUid = new Map<string, AttendanceLogItem>();
      for (const item of store.logs) {
        byUid.set(item.recordUid, item);
      }
      const logsForSupabase: AttendanceLogItem[] = [];
      for (const r of pulled.records) {
        const uid = `dev_${r.machineId}_${r.userId}_${r.timestamp}`;
        const matched = byUid.get(uid);
        if (matched && !matched.isEdited && !matched.isDeleted) {
          logsForSupabase.push(matched);
        }
      }

      const [supabaseSync] = await Promise.all([
        batchPushLogsToSupabase(logsForSupabase),
        syncMappingsToSupabase(store.mappings),
        syncEditorsToSupabase(store.authorizedEditors),
      ]);

      return NextResponse.json({
        success: true,
        overview,
        pulledCount: pulled.records.length,
        deviceTotalCount: pulled.totalCount,
        mergeResult,
        mysqlSync,
        supabaseSync,
        lastSyncedAt: store.lastSyncedAt,
      });
    }

    // 2. บันทึกการตั้งค่า MySQL / เครื่องสแกน และทดสอบซิงก์ขึ้น Synology NAS
    if (action === "save_mysql_config" || action === "test_mysql") {
      if (action === "save_mysql_config" || body.mysqlConfig) {
        const allowed = await verifyEditorPermission(
          store,
          actorId,
          actorRole,
          actorName,
          true
        );
        if (!allowed) {
          return NextResponse.json(
            {
              success: false,
              error: "เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่แก้ไขการตั้งค่าฐานข้อมูลได้",
            },
            { status: 403 }
          );
        }
      }

      if (body.mysqlConfig) {
        const incoming = body.mysqlConfig;
        store.mysqlConfig = {
          ...store.mysqlConfig,
          ...incoming,
          port: Number(incoming.port || 3308),
          scannerPort: Number(incoming.scannerPort || 5005),
          password:
            incoming.password && incoming.password !== "••••••••"
              ? incoming.password
              : store.mysqlConfig.password ||
                process.env.NAS_MYSQL_PASSWORD ||
                "",
          cloudflareBridgeSecret:
            incoming.cloudflareBridgeSecret &&
            incoming.cloudflareBridgeSecret !== "••••••••"
              ? incoming.cloudflareBridgeSecret
              : store.mysqlConfig.cloudflareBridgeSecret ||
                process.env.NAS_MYSQL_BRIDGE_SECRET ||
                "",
          scannerPassword: Number(
            incoming.scannerPassword !== undefined &&
              incoming.scannerPassword !== 0
              ? incoming.scannerPassword
              : store.mysqlConfig.scannerPassword ||
                  process.env.HIP_SCANNER_PASSWORD ||
                  1234
          ),
        };
        saveAttendanceStore(store);
      }

      const mysqlStatus = await testAndInitSynologyMysql(store.mysqlConfig);
      let mysqlSync: unknown = null;
      if (mysqlStatus.connected && store.logs.length > 0) {
        mysqlSync = await pushStoreToSynologyMysql(store);
      }

      const safeConfig = {
        ...store.mysqlConfig,
        password: store.mysqlConfig.password ? "••••••••" : "",
        cloudflareBridgeSecret: store.mysqlConfig.cloudflareBridgeSecret
          ? "••••••••"
          : "",
        scannerPassword: 0,
      };

      return NextResponse.json({
        success: true,
        mysqlConfig: safeConfig,
        mysqlStatus,
        mysqlSync,
        setupSql: getSynologyMysqlSetupSql(store.mysqlConfig),
      });
    }

    // 3. เพิ่มรายการลงเวลาใหม่ (โดย Admin หรือ User ที่ได้รับสิทธิ์)
    if (action === "add_log") {
      const allowed = await verifyEditorPermission(
        store,
        actorId,
        actorRole,
        actorName
      );
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: "คุณไม่มีสิทธิ์เพิ่มข้อมูลเวลาปฏิบัติราชการ" },
          { status: 403 }
        );
      }

      const {
        scannerUserId,
        scanDate,
        scanTime,
        ioMode,
        verifyMode,
        editNote,
      } = body;

      const uid = Number(scannerUserId || 1);
      const mapInfo = store.mappings[uid] || {
        scannerUserId: uid,
        memberId: `scanner_uid_${uid}`,
        memberName: `บุคลากร พมจ. (รหัสสแกน #${uid})`,
        division: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
        position: "เจ้าหน้าที่ปฏิบัติงาน",
      };

      const normalizedTime =
        scanTime && scanTime.length === 5
          ? `${scanTime}:00`
          : scanTime || "08:30:00";
      const scanTimestamp = `${scanDate} ${normalizedTime}`;
      const modeNum = Number(ioMode || 1);
      const vModeNum = Number(verifyMode || 9);

      const ioLabel =
        modeNum === 1 ? "เข้างาน (Check-In)" : "ออกงาน (Check-Out)";
      const verifyLabel =
        vModeNum === 1
          ? "ลายนิ้วมือ (FP)"
          : vModeNum === 2
          ? "รหัสผ่าน (PWD)"
          : vModeNum === 3
          ? "บัตร (Card)"
          : "บันทึกโดยผู้ดูแล (Manual)";

      const newLog: AttendanceLogItem = {
        id: `att_manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        recordUid: `manual_${uid}_${scanTimestamp}_${Date.now()}`,
        scannerUserId: uid,
        memberId: mapInfo.memberId,
        memberName: mapInfo.memberName,
        division: mapInfo.division,
        position: mapInfo.position,
        scanTimestamp,
        originalTimestamp: scanTimestamp,
        ioMode: modeNum,
        ioLabel,
        verifyMode: vModeNum,
        verifyLabel,
        machineId: 1,
        source: "manual",
        isEdited: true,
        editedBy: actorName || "ผู้ดูแลระบบ",
        editedAt: new Date().toISOString(),
        editNote: editNote || "เพิ่มข้อมูลลงเวลาย้อนหลัง",
        isDeleted: false,
      };

      store.logs.unshift(newLog);
      store.logs.sort((a, b) => b.scanTimestamp.localeCompare(a.scanTimestamp));
      saveAttendanceStore(store);

      const [mysqlSync, supabaseSync] = await Promise.all([
        upsertSingleLogToSynologyMysql(store.mysqlConfig, newLog),
        pushSingleLogToSupabase(newLog),
      ]);

      return NextResponse.json({
        success: true,
        item: newLog,
        mysqlSync,
        supabaseSync,
      });
    }

    // 4. แก้ไขรายการลงเวลา (โดย Admin หรือ User ที่ได้รับสิทธิ์) — รองรับทั้ง Local Store และ Supabase Cloud Fallback
    if (action === "update_log") {
      const allowed = await verifyEditorPermission(
        store,
        actorId,
        actorRole,
        actorName
      );
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: "คุณไม่มีสิทธิ์แก้ไขข้อมูลเวลาปฏิบัติราชการ" },
          { status: 403 }
        );
      }

      const {
        id,
        scannerUserId,
        scanDate,
        scanTime,
        ioMode,
        verifyMode,
        editNote,
      } = body;

      let target = store.logs.find((l) => l.id === id);
      let fromSupabaseOnly = false;
      if (!target) {
        const supaTarget = await fetchSingleLogByIdFromSupabase(String(id));
        if (supaTarget) {
          target = supaTarget;
          fromSupabaseOnly = true;
        }
      }

      if (!target) {
        return NextResponse.json(
          { success: false, error: "ไม่พบรายการลงเวลาที่ต้องการแก้ไข" },
          { status: 404 }
        );
      }

      if (scannerUserId !== undefined) {
        const uid = Number(scannerUserId);
        const mapInfo = store.mappings[uid];
        target.scannerUserId = uid;
        if (mapInfo) {
          target.memberId = mapInfo.memberId;
          target.memberName = mapInfo.memberName;
          target.division = mapInfo.division;
          target.position = mapInfo.position;
        }
      }

      if (scanDate && scanTime) {
        const normalizedTime =
          scanTime.length === 5 ? `${scanTime}:00` : scanTime;
        target.scanTimestamp = `${scanDate} ${normalizedTime}`;
      }

      if (ioMode !== undefined) {
        const modeNum = Number(ioMode);
        target.ioMode = modeNum;
        target.ioLabel =
          modeNum === 1 ? "เข้างาน (Check-In)" : "ออกงาน (Check-Out)";
      }

      if (verifyMode !== undefined) {
        const vModeNum = Number(verifyMode);
        target.verifyMode = vModeNum;
        target.verifyLabel =
          vModeNum === 1
            ? "ลายนิ้วมือ (FP)"
            : vModeNum === 2
            ? "รหัสผ่าน (PWD)"
            : vModeNum === 3
            ? "บัตร (Card)"
            : "บันทึกโดยผู้ดูแล (Manual)";
      }

      target.isEdited = true;
      target.editedBy = actorName || "ผู้ดูแลระบบ";
      target.editedAt = new Date().toISOString();
      target.editNote = editNote || "แก้ไขข้อมูลเวลาปฏิบัติราชการ";

      if (!fromSupabaseOnly) {
        store.logs.sort((a, b) =>
          b.scanTimestamp.localeCompare(a.scanTimestamp)
        );
        saveAttendanceStore(store);
      }

      const [mysqlSync, supabaseSync] = await Promise.all([
        upsertSingleLogToSynologyMysql(store.mysqlConfig, target),
        pushSingleLogToSupabase(target),
      ]);

      return NextResponse.json({
        success: true,
        item: target,
        mysqlSync,
        supabaseSync,
      });
    }

    // 5. ลบรายการลงเวลา (Soft-Delete) — รองรับทั้ง Local Store และ Supabase Cloud Fallback
    if (action === "delete_log") {
      const allowed = await verifyEditorPermission(
        store,
        actorId,
        actorRole,
        actorName
      );
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: "คุณไม่มีสิทธิ์ลบข้อมูลเวลาปฏิบัติราชการ" },
          { status: 403 }
        );
      }

      const { id, editNote } = body;
      let target = store.logs.find((l) => l.id === id);
      let fromSupabaseOnly = false;
      if (!target) {
        const supaTarget = await fetchSingleLogByIdFromSupabase(String(id));
        if (supaTarget) {
          target = supaTarget;
          fromSupabaseOnly = true;
        }
      }

      if (!target) {
        return NextResponse.json(
          { success: false, error: "ไม่พบรายการที่ต้องการลบ" },
          { status: 404 }
        );
      }

      target.isDeleted = true;
      target.isEdited = true;
      target.editedBy = actorName || "ผู้ดูแลระบบ";
      target.editedAt = new Date().toISOString();
      target.editNote = editNote || "ลบรายการลงเวลา";

      if (!fromSupabaseOnly) {
        saveAttendanceStore(store);
      }

      const [mysqlSync, supabaseSync] = await Promise.all([
        upsertSingleLogToSynologyMysql(store.mysqlConfig, target),
        pushSingleLogToSupabase(target),
      ]);

      return NextResponse.json({
        success: true,
        mysqlSync,
        supabaseSync,
      });
    }

    // 6. บันทึกการจับคู่รหัสเครื่องสแกน (User ID 1..64) กับรายชื่อบุคลากร
    if (action === "save_mapping") {
      const allowed = await verifyEditorPermission(
        store,
        actorId,
        actorRole,
        actorName
      );
      if (!allowed) {
        return NextResponse.json(
          { success: false, error: "คุณไม่มีสิทธิ์แก้ไขการจับคู่รหัสสแกน" },
          { status: 403 }
        );
      }

      const { scannerUserId, memberId, memberName, division, position } = body;
      const uid = Number(scannerUserId);
      store.mappings[uid] = {
        scannerUserId: uid,
        memberId: memberId || `scanner_uid_${uid}`,
        memberName: memberName || `บุคลากร พมจ. (รหัสสแกน #${uid})`,
        division: division || "",
        position: position || "",
        updatedBy: actorName || "ผู้ดูแลระบบ",
        updatedAt: new Date().toISOString(),
      };

      for (const log of store.logs) {
        if (log.scannerUserId === uid) {
          log.memberId = store.mappings[uid].memberId;
          log.memberName = store.mappings[uid].memberName;
          log.division = store.mappings[uid].division;
          log.position = store.mappings[uid].position;
        }
      }

      if (store.logs.length > 0) {
        saveAttendanceStore(store);
      }

      // อัปเดตชื่อใน Supabase Logs ที่ตรงกับ scanner_user_id และบน Synology NAS โดยตรง
      const supaLogsUpdatePromise = supabaseClient
        .from("attendance_logs")
        .update({
          member_id: store.mappings[uid].memberId,
          member_name: store.mappings[uid].memberName,
          division: store.mappings[uid].division,
          position: store.mappings[uid].position,
        })
        .eq("scanner_user_id", uid);

      const [mysqlSync, supabaseMapSync] = await Promise.all([
        syncMappingToSynologyMysql(store.mysqlConfig, store.mappings[uid]),
        syncMappingsToSupabase(store.mappings),
        supaLogsUpdatePromise,
      ]);

      return NextResponse.json({
        success: true,
        mapping: store.mappings[uid],
        mysqlSync,
        supabaseMapSync,
      });
    }

    // 7. กำหนดสิทธิ์ผู้ใช้งาน (Admin / User ที่กำหนด) ให้สามารถแก้ไข/เพิ่ม/ลบเวลาได้
    if (action === "save_editors") {
      const allowed = await verifyEditorPermission(
        store,
        actorId,
        actorRole,
        actorName,
        true
      );
      if (!allowed) {
        return NextResponse.json(
          {
            success: false,
            error: "เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่กำหนดสิทธิ์ผู้จัดการเวลาได้",
          },
          { status: 403 }
        );
      }

      const { editors } = body as { editors: AuthorizedAttendanceEditor[] };
      if (Array.isArray(editors)) {
        store.authorizedEditors = editors;
        store.editorsCustomized = true;
        saveAttendanceStore(store);

        const [mysqlSync, supabaseEditorsSync] = await Promise.all([
          syncEditorsToSynologyMysql(store.mysqlConfig, store.authorizedEditors),
          syncEditorsToSupabase(store.authorizedEditors),
        ]);

        return NextResponse.json({
          success: true,
          authorizedEditors: store.authorizedEditors,
          mysqlSync,
          supabaseEditorsSync,
        });
      }
    }

    return NextResponse.json(
      { success: false, error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json(
      { success: false, error: e.message || "เกิดข้อผิดพลาดในการประมวลผล" },
      { status: 500 }
    );
  }
}
