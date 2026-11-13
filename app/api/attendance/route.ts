import { NextRequest, NextResponse } from "next/server";
import { HipCmi681sClient } from "@/lib/hip-cmi681s";
import {
  loadAttendanceStore,
  saveAttendanceStore,
  mergeDeviceRecordsIntoStore,
  reconcileCloudChangesIntoStore,
  testAndInitSynologyMysql,
  pushStoreToSynologyMysql,
  upsertSingleLogToSynologyMysql,
  syncMappingToSynologyMysql,
  syncEditorsToSynologyMysql,
  getSynologyMysqlSetupSql,
  buildDefaultMappings,
  computeLocalScannerUidStats,
  AttendanceLogItem,
  AuthorizedAttendanceEditor,
  AttendanceStoreData,
  DeviceOverviewMetadata,
  ScannerUidStat,
} from "@/lib/attendance-db";
import {
  supabaseClient,
  checkSupabaseAttendanceReady,
  batchPushLogsToSupabase,
  pushSingleLogToSupabase,
  fetchAttendanceLogsFromSupabase,
  fetchSummaryStatsFromSupabase,
  fetchAvailableDatesFromSupabase,
  fetchAvailableMonthsFromSupabase,
  invalidateAvailableMonthsCache,
  fetchCloudEditedOrManualLogsFromSupabase,
  fetchLatestAttendanceSyncTelemetryFromSupabase,
  fetchLatestAttendanceTimestampFromSupabase,
  recordAttendanceSyncTelemetryToSupabase,
  enqueueRemoteAttendanceSyncRequest,
  fetchLatestRemoteAttendanceSyncRequest,
  fetchSystemUsersFromSupabase,
  fetchScannerUidStatsFromSupabase,
  updateAttendanceLogsMappingOnSupabase,
  syncMappingsToSupabase,
  fetchMappingsFromSupabase,
  syncEditorsToSupabase,
  fetchAuthorizedEditorsFromSupabase,
  AttendanceSummaryStats,
} from "@/lib/attendance-supabase";
import {
  getAttendanceIoLabel,
  classifyAttendanceByOfficialHours,
  collectAvailableMonths,
} from "@/lib/attendance-rules";

export const dynamic = "force-dynamic";

const VALID_ATTENDANCE_IO_MODES = new Set([1, 2, 3, 4]);

function parseValidIoMode(raw: unknown): 1 | 2 | 3 | 4 | null {
  if (typeof raw === "boolean") return null;
  if (typeof raw === "string" && raw.trim() === "") return null;
  const num = Number(raw);
  if (!Number.isInteger(num) || !VALID_ATTENDANCE_IO_MODES.has(num)) {
    return null;
  }
  return num as 1 | 2 | 3 | 4;
}

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

    // Endpoint เบาพิเศษสำหรับ polling สถานะ Remote Sync Queue จาก Cloud/Vercel
    if (searchParams.get("checkRemoteSync") === "1") {
      const remoteSyncRequest = await fetchLatestRemoteAttendanceSyncRequest();
      return NextResponse.json({
        success: true,
        remoteSyncRequest,
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

    const scannerIp = store.mysqlConfig.scannerIp || "192.168.162.15";
    const isScannerPrivateLan = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.|127\.)/.test(
      scannerIp
    );
    const isCloudServer = process.env.VERCEL === "1" && isScannerPrivateLan;
    const canSyncFromScanner = !isCloudServer;

    // ตรวจสอบสถานะ MySQL บน Synology NAS, Supabase Cloud, Telemetry และรายชื่อผู้ใช้ระบบพร้อมกัน
    const [
      mysqlStatus,
      supabaseStatus,
      cloudTelemetry,
      latestCloudScanTs,
      remoteSyncRequest,
      systemUsers,
    ] = await Promise.all([
      testAndInitSynologyMysql(store.mysqlConfig),
      checkSupabaseAttendanceReady(),
      fetchLatestAttendanceSyncTelemetryFromSupabase(),
      fetchLatestAttendanceTimestampFromSupabase(),
      fetchLatestRemoteAttendanceSyncRequest(),
      fetchSystemUsersFromSupabase(),
    ]);

    // ตรวจสอบสถานะเครื่องสแกน HIP CMi681S (192.168.162.15:5005) หากไม่ได้อยู่บน Cloud Serverless และระบุ checkHardware=1
    let scannerOverview: unknown = null;
    let liveDeviceOverviewMeta: DeviceOverviewMetadata | null = null;
    if (checkHardware && !isCloudServer) {
      const client = new HipCmi681sClient({
        ip: store.mysqlConfig.scannerIp,
        port: store.mysqlConfig.scannerPort,
        password: store.mysqlConfig.scannerPassword,
        timeoutMs: 1800,
      });
      try {
        await client.connect();
        const overview = await client.getDeviceOverview();
        client.disconnect();
        scannerOverview = overview;
        liveDeviceOverviewMeta = {
          productCode: overview.info.productCode,
          vendorName: overview.info.vendorName,
          serialNumber: overview.info.serialNumber,
          deviceTime: overview.info.deviceTime,
          registeredUsersCount: overview.status.registeredUsersCount,
          fingerprintsCount: overview.status.fingerprintsCount,
          passwordsCount: overview.status.passwordsCount,
          idCardsCount: overview.status.idCardsCount,
          attendanceLogsCount: overview.status.attendanceLogsCount,
          maxAttendanceLogs: overview.status.capacities.maxAttendanceLogs,
          checkedAt: new Date().toISOString(),
        };

        // อัปเดตยอดจริงจากฮาร์ดแวร์ลงแคชท้องถิ่นทันทีเมื่อจำนวนบนเครื่องสแกนเปลี่ยน
        if (
          overview.status.attendanceLogsCount !== store.deviceTotalRecords ||
          !store.deviceOverview ||
          store.deviceOverview.registeredUsersCount !==
            overview.status.registeredUsersCount
        ) {
          store.deviceTotalRecords = overview.status.attendanceLogsCount;
          store.deviceOverview = liveDeviceOverviewMeta;
          saveAttendanceStore(store);
        }
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
    let availableMonths: string[] = [];
    let mappings = store.mappings;
    let scannerUidStats: Record<number, ScannerUidStat> = {};
    let authorizedEditors = await resolveEffectiveEditors(store);
    let dataSource: "local" | "supabase" = "local";
    let summaryStats: AttendanceSummaryStats = {
      checkInOnTime: 0,
      checkOut: 0,
      lateOrLeave: 0,
      midDay: 0,
      checkInTotal: 0,
      edited: 0,
      checkIn: 0,
      lateCount: 0,
      lateCountIsApprox: false,
    };

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

      // คำนวณสถิติรวมทั้ง 4 ประเภทจากข้อมูลที่กรองทั้งหมด (ไม่ใช่แค่หน้าที่แสดง)
      for (const item of filtered) {
        if (item.ioMode === 1) {
          summaryStats.checkInOnTime++;
        } else if (item.ioMode === 2) {
          summaryStats.checkOut++;
        } else if (item.ioMode === 3) {
          summaryStats.lateOrLeave++;
        } else if (item.ioMode === 4) {
          summaryStats.midDay++;
        }
        if (item.isEdited) summaryStats.edited++;
      }
      summaryStats.checkInTotal =
        summaryStats.checkInOnTime + summaryStats.lateOrLeave;
      summaryStats.checkIn = summaryStats.checkInTotal;
      summaryStats.lateCount = summaryStats.lateOrLeave;
      summaryStats.lateCountIsApprox = false;

      filteredTotal = filtered.length;
      const startIdx = (page - 1) * pageSize;
      logsResult = filtered.slice(startIdx, startIdx + pageSize);
      totalStoredLogs = activeLocalLogs.length;

      availableDates = Array.from(
        new Set(activeLocalLogs.map((l) => l.scanTimestamp.slice(0, 10)))
      )
        .sort((a, b) => b.localeCompare(a))
        .slice(0, 60);
      availableMonths = collectAvailableMonths(activeLocalLogs);
      scannerUidStats = computeLocalScannerUidStats(activeLocalLogs);
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
      const [supaRes, supaDates, supaMonths, supaMappings, supaUidStats] = await Promise.all([
        fetchAttendanceLogsFromSupabase({
          ...supaFilter,
          page,
          pageSize,
        }),
        fetchAvailableDatesFromSupabase(),
        fetchAvailableMonthsFromSupabase(cloudTelemetry?.availableMonths),
        fetchMappingsFromSupabase(),
        fetchScannerUidStatsFromSupabase(),
      ]);

      logsResult = supaRes.logs;
      filteredTotal = supaRes.filteredTotal;
      totalStoredLogs = supabaseStatus.count;
      availableDates = supaDates;
      availableMonths = supaMonths;
      if (supaUidStats) {
        scannerUidStats = supaUidStats;
      }
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

    const pickNewerIso = (a?: string | null, b?: string | null) => {
      if (!a) return b || null;
      if (!b) return a || null;
      return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
    };

    const effectiveLastSyncedAt = pickNewerIso(
      store.lastSyncedAt,
      cloudTelemetry?.lastSyncedAt
    );
    const effectiveLastMysqlSyncedAt = pickNewerIso(
      store.lastMysqlSyncedAt,
      cloudTelemetry?.lastMysqlSyncedAt
    );

    const effectiveDeviceTotalRecords =
      liveDeviceOverviewMeta?.attendanceLogsCount ??
      (dataSource === "supabase"
        ? Math.max(
            cloudTelemetry?.deviceTotalRecords || 0,
            supabaseStatus.count || 0,
            store.deviceTotalRecords || 0
          )
        : Math.max(
            store.deviceTotalRecords || 0,
            cloudTelemetry?.deviceTotalRecords || 0,
            totalStoredLogs || 0
          ));

    const latestLocalScanTs =
      activeLocalLogs.length > 0 ? activeLocalLogs[0].scanTimestamp : null;
    const latestScanTimestamp =
      latestCloudScanTs &&
      (!latestLocalScanTs || latestCloudScanTs > latestLocalScanTs)
        ? latestCloudScanTs
        : latestLocalScanTs;

    const effectiveDeviceOverview =
      liveDeviceOverviewMeta ||
      store.deviceOverview ||
      (cloudTelemetry
        ? {
            productCode: cloudTelemetry.productCode,
            serialNumber: cloudTelemetry.serialNumber,
            deviceTime: cloudTelemetry.deviceTime,
            registeredUsersCount: cloudTelemetry.registeredUsersCount,
            fingerprintsCount: cloudTelemetry.fingerprintsCount,
            passwordsCount: cloudTelemetry.passwordsCount,
            idCardsCount: cloudTelemetry.idCardsCount,
            attendanceLogsCount: cloudTelemetry.deviceTotalRecords,
            maxAttendanceLogs: cloudTelemetry.maxAttendanceLogs,
            checkedAt: cloudTelemetry.lastSyncedAt || undefined,
          }
        : null);

    return NextResponse.json({
      success: true,
      dataSource,
      isCloudServer,
      canSyncFromScanner,
      page,
      pageSize,
      totalPages,
      mysqlConfig: safeMysqlConfig,
      mysqlStatus,
      supabaseStatus,
      setupSql: getSynologyMysqlSetupSql(store.mysqlConfig),
      scannerOverview,
      deviceOverview: effectiveDeviceOverview,
      lastSyncedAt: effectiveLastSyncedAt,
      lastMysqlSyncedAt: effectiveLastMysqlSyncedAt,
      latestScanTimestamp,
      deviceTotalRecords: effectiveDeviceTotalRecords,
      totalStoredLogs,
      availableDates,
      availableMonths,
      remoteSyncRequest,
      mappings,
      systemUsers,
      scannerUidStats,
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

      const requestedLimit =
        typeof body.limitLatest === "number" ? body.limitLatest : 1500;

      const scannerIp = store.mysqlConfig.scannerIp || "192.168.162.15";
      const isScannerPrivateLan = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.|127\.)/.test(
        scannerIp
      );
      if ((process.env.VERCEL === "1" && isScannerPrivateLan) || body.remoteQueue === true) {
        const queued = await enqueueRemoteAttendanceSyncRequest({
          limitLatest: requestedLimit,
          actorId,
          actorName,
        });
        if (!queued.success || !queued.request) {
          return NextResponse.json(
            {
              success: false,
              error:
                queued.error ||
                "ไม่สามารถส่งคำสั่งซิงก์ระยะไกลไปยังเครื่องสำนักงานได้",
            },
            { status: 500 }
          );
        }
        return NextResponse.json({
          success: true,
          queued: true,
          deduplicated: Boolean(queued.deduplicated),
          remoteSyncRequest: queued.request,
        });
      }

      // ผสานข้อมูลที่ถูกแก้ไข/ลบ/เพิ่ม Manual และ Mapping บน Supabase Cloud เข้ามาก่อนเสมอเพื่อไม่ให้ถูกเขียนทับ
      const [cloudOverrides, cloudMappings, cloudEditors, preSupaStatus, latestCloudTs] =
        await Promise.all([
          fetchCloudEditedOrManualLogsFromSupabase(),
          fetchMappingsFromSupabase(),
          fetchAuthorizedEditorsFromSupabase(),
          checkSupabaseAttendanceReady(),
          fetchLatestAttendanceTimestampFromSupabase(),
        ]);
      reconcileCloudChangesIntoStore(store, cloudOverrides, cloudMappings);
      if (cloudEditors && (cloudEditors.length > 0 || store.editorsCustomized)) {
        store.authorizedEditors = cloudEditors;
      }

      const client = new HipCmi681sClient({
        ip: store.mysqlConfig.scannerIp,
        port: store.mysqlConfig.scannerPort,
        password: store.mysqlConfig.scannerPassword,
        timeoutMs: 35000,
      });

      await client.connect();
      const overview = await client.getDeviceOverview();
      client.disconnect();

      const activeBeforeSync = store.logs.filter((l) => !l.isDeleted).length;
      const estimatedGap = overview.status.attendanceLogsCount - activeBeforeSync;
      const effectiveLimit =
        requestedLimit <= 0 || estimatedGap > Math.max(0, requestedLimit - 100)
          ? undefined
          : requestedLimit;

      const logClient = new HipCmi681sClient({
        ip: store.mysqlConfig.scannerIp,
        port: store.mysqlConfig.scannerPort,
        password: store.mysqlConfig.scannerPassword,
        timeoutMs: 35000,
      });
      await logClient.connect();
      const pulled = await logClient.getAttendanceLogs(effectiveLimit);
      logClient.disconnect();

      const deviceOverviewMeta: DeviceOverviewMetadata = {
        productCode: overview.info.productCode,
        vendorName: overview.info.vendorName,
        serialNumber: overview.info.serialNumber,
        deviceTime: overview.info.deviceTime,
        registeredUsersCount: overview.status.registeredUsersCount,
        fingerprintsCount: overview.status.fingerprintsCount,
        passwordsCount: overview.status.passwordsCount,
        idCardsCount: overview.status.idCardsCount,
        attendanceLogsCount: overview.status.attendanceLogsCount,
        maxAttendanceLogs: overview.status.capacities.maxAttendanceLogs,
        checkedAt: new Date().toISOString(),
      };

      const mergeResult = mergeDeviceRecordsIntoStore(
        store,
        pulled.records,
        pulled.totalCount,
        deviceOverviewMeta
      );

      // ซิงก์ขึ้น MySQL บน Synology NAS (ส่งเฉพาะรายการเปลี่ยนแปลงหาก NAS มีฐานเดิมครบแล้ว)
      const mysqlSync = await pushStoreToSynologyMysql(
        store,
        mergeResult.changedLogs
      );

      // เตรียมรายการสำหรับส่งขึ้น Supabase Cloud (ถ้า Cloud มีจำนวนน้อยกว่า Store ให้ซ่อมยอดครบทั้ง Store; ถ้าเพิ่งสร้าง Local Cache ใหม่และ Cloud มีเกือบครบแล้วให้ส่งเฉพาะส่วนที่ใหม่กว่า)
      const supaGapBefore = mergeResult.totalStored - preSupaStatus.count;
      let logsForSupabase: AttendanceLogItem[];
      if (preSupaStatus.ready && supaGapBefore > mergeResult.changedLogs.length) {
        logsForSupabase = store.logs.filter((l) => !l.isEdited && !l.isDeleted);
      } else if (
        preSupaStatus.ready &&
        activeBeforeSync === 0 &&
        supaGapBefore <= 0 &&
        latestCloudTs
      ) {
        logsForSupabase = mergeResult.changedLogs.filter(
          (l) => !l.isEdited && !l.isDeleted && l.scanTimestamp >= latestCloudTs
        );
      } else {
        logsForSupabase = mergeResult.changedLogs.filter(
          (l) => !l.isEdited && !l.isDeleted
        );
      }

      const [supabaseSync] = await Promise.all([
        batchPushLogsToSupabase(logsForSupabase),
        syncMappingsToSupabase(store.mappings),
        syncEditorsToSupabase(store.authorizedEditors),
      ]);

      const availableMonths = collectAvailableMonths(
        store.logs.filter((l) => !l.isDeleted)
      );

      // บันทึก Telemetry การซิงก์เพื่อให้ฝั่ง Cloud/Vercel เห็นยอดและเวลาซิงก์ล่าสุดตรงกับเครื่องสแกน
      await recordAttendanceSyncTelemetryToSupabase(
        {
          lastSyncedAt: store.lastSyncedAt,
          lastMysqlSyncedAt: store.lastMysqlSyncedAt,
          deviceTotalRecords: pulled.totalCount,
          registeredUsersCount: overview.status.registeredUsersCount,
          fingerprintsCount: overview.status.fingerprintsCount,
          passwordsCount: overview.status.passwordsCount,
          idCardsCount: overview.status.idCardsCount,
          maxAttendanceLogs: overview.status.capacities.maxAttendanceLogs,
          serialNumber: overview.info.serialNumber,
          productCode: overview.info.productCode,
          deviceTime: overview.info.deviceTime,
          scannerIp: store.mysqlConfig.scannerIp,
          addedCount: mergeResult.addedCount,
          pulledCount: pulled.records.length,
          availableMonths,
          source: "ui_sync",
        },
        actorName || "ผู้ดูแลระบบ",
        true
      );

      return NextResponse.json({
        success: true,
        overview,
        deviceOverview: deviceOverviewMeta,
        pulledCount: pulled.records.length,
        deviceTotalCount: pulled.totalCount,
        mergeResult: {
          addedCount: mergeResult.addedCount,
          updatedCount: mergeResult.updatedCount,
          totalStored: mergeResult.totalStored,
        },
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

      let modeNum: number;
      if (ioMode !== undefined && ioMode !== null && ioMode !== "") {
        const parsedMode = parseValidIoMode(ioMode);
        if (parsedMode === null) {
          return NextResponse.json(
            { success: false, error: "ioMode ต้องเป็นค่า 1, 2, 3 หรือ 4 เท่านั้น" },
            { status: 400 }
          );
        }
        modeNum = parsedMode;
      } else {
        modeNum = classifyAttendanceByOfficialHours(scanTimestamp).ioMode;
      }
      const vModeNum = Number(verifyMode || 9);

      const ioLabel = getAttendanceIoLabel(modeNum);
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

      invalidateAvailableMonthsCache();

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

      let validatedIoMode: 1 | 2 | 3 | 4 | undefined;
      if (ioMode !== undefined) {
        const parsedMode = parseValidIoMode(ioMode);
        if (parsedMode === null) {
          return NextResponse.json(
            { success: false, error: "ioMode ต้องเป็นค่า 1, 2, 3 หรือ 4 เท่านั้น" },
            { status: 400 }
          );
        }
        validatedIoMode = parsedMode;
      }

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

      if (validatedIoMode !== undefined) {
        target.ioMode = validatedIoMode;
        target.ioLabel = getAttendanceIoLabel(validatedIoMode);
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

    // 6. บันทึกการจับคู่รหัสเครื่องสแกน (User ID 1..64) กับรายชื่อบุคลากร/ผู้ใช้ระบบ
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

      const {
        scannerUserId,
        userId,
        memberId,
        memberName,
        division,
        position,
        matchMethod,
      } = body;
      const uid = Number(scannerUserId);
      if (!Number.isInteger(uid) || uid < 1 || uid > 64) {
        return NextResponse.json(
          { success: false, error: "รหัสเครื่องสแกน (scannerUserId) ต้องเป็นตัวเลข 1 ถึง 64 เท่านั้น" },
          { status: 400 }
        );
      }

      // Hydrate mappings from Supabase so conflict checks & local store reflect live cloud state
      const cloudMappings = await fetchMappingsFromSupabase();
      if (cloudMappings) {
        store.mappings = { ...store.mappings, ...cloudMappings };
      }

      const normalizedUserId = userId ? String(userId).trim() : null;
      if (normalizedUserId) {
        const conflict = Object.values(store.mappings).find(
          (m) => m.scannerUserId !== uid && m.userId === normalizedUserId
        );
        if (conflict) {
          return NextResponse.json(
            {
              success: false,
              error: `ผู้ใช้ระบบนี้ถูกจับคู่กับรหัสสแกน #${conflict.scannerUserId} (${conflict.memberName}) อยู่แล้ว กรุณายกเลิกรหัสเดิมก่อนเพื่อป้องกันข้อมูลซ้ำซ้อน`,
            },
            { status: 409 }
          );
        }
      }

      const resolvedMemberId =
        memberId || normalizedUserId || `scanner_uid_${uid}`;
      const isMapped =
        Boolean(normalizedUserId) ||
        !String(resolvedMemberId).startsWith("scanner_uid_");

      store.mappings[uid] = {
        scannerUserId: uid,
        userId: normalizedUserId,
        memberId: String(resolvedMemberId),
        memberName:
          String(memberName || "").trim() ||
          `บุคลากร พมจ. (รหัสสแกน #${uid})`,
        division: division || "",
        position: position || "",
        isMapped,
        matchMethod:
          matchMethod === "auto_name"
            ? "auto_name"
            : isMapped
            ? "manual"
            : "unmapped",
        updatedBy: actorName || "ผู้ดูแลระบบ",
        updatedAt: new Date().toISOString(),
      };

      for (const log of store.logs) {
        if (log.scannerUserId === uid) {
          log.userId = store.mappings[uid].userId;
          log.memberId = store.mappings[uid].memberId;
          log.memberName = store.mappings[uid].memberName;
          log.division = store.mappings[uid].division;
          log.position = store.mappings[uid].position;
        }
      }

      if (store.logs.length > 0) {
        saveAttendanceStore(store);
      }

      const [mysqlSync, supabaseMapSync] = await Promise.all([
        syncMappingToSynologyMysql(store.mysqlConfig, store.mappings[uid]),
        syncMappingsToSupabase([store.mappings[uid]]),
        updateAttendanceLogsMappingOnSupabase(uid, store.mappings[uid]),
      ]);

      if (!supabaseMapSync.success && supabaseMapSync.code === "DUPLICATE_USER_MAPPING") {
        return NextResponse.json(
          { success: false, error: supabaseMapSync.error },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        mapping: store.mappings[uid],
        mysqlSync,
        supabaseMapSync,
      });
    }

    // 6b. บันทึกการจับคู่รหัสเครื่องสแกนหลายรายการพร้อมกัน (Bulk Mapping)
    if (action === "save_mappings_batch") {
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

      const items = Array.isArray(body.mappings) ? body.mappings : [];
      if (items.length === 0) {
        return NextResponse.json(
          { success: false, error: "ไม่มีรายการจับคู่สำหรับบันทึก" },
          { status: 400 }
        );
      }

      const cloudMappings = await fetchMappingsFromSupabase();
      if (cloudMappings) {
        store.mappings = { ...store.mappings, ...cloudMappings };
      }

      // Deduplicate by scannerUserId (last wins) & validate 1..64
      const dedupedByUid = new Map<number, Record<string, unknown>>();
      for (const raw of items) {
        const uid = Number(raw?.scannerUserId);
        if (!Number.isInteger(uid) || uid < 1 || uid > 64) continue;
        dedupedByUid.set(uid, raw as Record<string, unknown>);
      }

      if (dedupedByUid.size === 0) {
        return NextResponse.json(
          { success: false, error: "ไม่พบรหัสเครื่องสแกนที่ถูกต้อง (1-64)" },
          { status: 400 }
        );
      }

      // Enforce 1-to-1 uniqueness of userId within batch and against other existing mappings
      const seenUserIdsInBatch = new Map<string, number>();
      for (const [uid, raw] of dedupedByUid.entries()) {
        const normalizedUserId = raw.userId ? String(raw.userId).trim() : null;
        if (!normalizedUserId) continue;

        const batchDupUid = seenUserIdsInBatch.get(normalizedUserId);
        if (batchDupUid !== undefined) {
          return NextResponse.json(
            {
              success: false,
              error: `พบการเลือกผู้ใช้ระบบซ้ำกันระหว่างรหัสสแกน #${batchDupUid} และ #${uid}`,
            },
            { status: 409 }
          );
        }
        seenUserIdsInBatch.set(normalizedUserId, uid);

        const existingConflict = Object.values(store.mappings).find(
          (m) =>
            !dedupedByUid.has(m.scannerUserId) &&
            m.userId === normalizedUserId
        );
        if (existingConflict) {
          return NextResponse.json(
            {
              success: false,
              error: `ผู้ใช้ระบบที่เลือกสำหรับ #${uid} ถูกจับคู่กับรหัสสแกน #${existingConflict.scannerUserId} (${existingConflict.memberName}) อยู่แล้ว`,
            },
            { status: 409 }
          );
        }
      }

      const updatedUids: number[] = [];
      const nowIso = new Date().toISOString();
      for (const [uid, raw] of dedupedByUid.entries()) {
        const resolvedUserId = raw.userId ? String(raw.userId).trim() : null;
        const resolvedMemberId =
          raw.memberId || resolvedUserId || `scanner_uid_${uid}`;
        const isMapped =
          Boolean(resolvedUserId) ||
          !String(resolvedMemberId).startsWith("scanner_uid_");

        store.mappings[uid] = {
          scannerUserId: uid,
          userId: resolvedUserId,
          memberId: String(resolvedMemberId),
          memberName:
            String(raw.memberName || "").trim() ||
            `บุคลากร พมจ. (รหัสสแกน #${uid})`,
          division: String(raw.division || ""),
          position: String(raw.position || ""),
          isMapped,
          matchMethod:
            raw.matchMethod === "auto_name"
              ? "auto_name"
              : isMapped
              ? "manual"
              : "unmapped",
          updatedBy: actorName || "ผู้ดูแลระบบ",
          updatedAt: nowIso,
        };
        updatedUids.push(uid);
      }

      const updatedUidSet = new Set(updatedUids);
      for (const log of store.logs) {
        if (updatedUidSet.has(log.scannerUserId)) {
          const m = store.mappings[log.scannerUserId];
          if (m) {
            log.userId = m.userId;
            log.memberId = m.memberId;
            log.memberName = m.memberName;
            log.division = m.division;
            log.position = m.position;
          }
        }
      }

      if (store.logs.length > 0) {
        saveAttendanceStore(store);
      }

      const updatedEntries = updatedUids.map((uid) => store.mappings[uid]);
      const [supabaseMapSync] = await Promise.all([
        syncMappingsToSupabase(updatedEntries),
        ...updatedUids.map((uid) =>
          syncMappingToSynologyMysql(store.mysqlConfig, store.mappings[uid])
        ),
        ...updatedUids.map((uid) =>
          updateAttendanceLogsMappingOnSupabase(uid, store.mappings[uid])
        ),
      ]);

      if (!supabaseMapSync.success && supabaseMapSync.code === "DUPLICATE_USER_MAPPING") {
        return NextResponse.json(
          { success: false, error: supabaseMapSync.error },
          { status: 409 }
        );
      }

      return NextResponse.json({
        success: true,
        updatedCount: updatedUids.length,
        supabaseMapSync,
        mappings: store.mappings,
      });
    }

    // 6c. ยกเลิกการจับคู่รหัสเครื่องสแกน (รีเซ็ตกลับเป็นค่าเริ่มต้น)
    if (action === "unmap_scanner_uid") {
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

      const uid = Number(body.scannerUserId);
      if (!Number.isInteger(uid) || uid < 1 || uid > 64) {
        return NextResponse.json(
          { success: false, error: "scannerUserId ไม่ถูกต้อง" },
          { status: 400 }
        );
      }

      const cloudMappings = await fetchMappingsFromSupabase();
      if (cloudMappings) {
        store.mappings = { ...store.mappings, ...cloudMappings };
      }

      store.mappings[uid] = {
        scannerUserId: uid,
        userId: null,
        memberId: `scanner_uid_${uid}`,
        memberName: `บุคลากร พมจ. (รหัสสแกน #${uid})`,
        division: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
        position: "เจ้าหน้าที่ปฏิบัติงาน",
        isMapped: false,
        matchMethod: "unmapped",
        updatedBy: actorName || "ผู้ดูแลระบบ",
        updatedAt: new Date().toISOString(),
      };

      for (const log of store.logs) {
        if (log.scannerUserId === uid) {
          log.userId = null;
          log.memberId = store.mappings[uid].memberId;
          log.memberName = store.mappings[uid].memberName;
          log.division = store.mappings[uid].division;
          log.position = store.mappings[uid].position;
        }
      }

      if (store.logs.length > 0) {
        saveAttendanceStore(store);
      }

      const [mysqlSync, supabaseMapSync] = await Promise.all([
        syncMappingToSynologyMysql(store.mysqlConfig, store.mappings[uid]),
        syncMappingsToSupabase([store.mappings[uid]]),
        updateAttendanceLogsMappingOnSupabase(uid, store.mappings[uid]),
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
