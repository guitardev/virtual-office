import { NextRequest, NextResponse } from "next/server";
import { HipCmi681sClient } from "@/lib/hip-cmi681s";
import {
  loadAttendanceStore,
  saveAttendanceStore,
  mergeDeviceRecordsIntoStore,
  testAndInitSynologyMysql,
  pushStoreToSynologyMysql,
  upsertSingleLogToSynologyMysql,
  getSynologyMysqlSetupSql,
  AttendanceLogItem,
  AuthorizedAttendanceEditor,
} from "@/lib/attendance-db";
import {
  checkSupabaseAttendanceReady,
  batchPushLogsToSupabase,
  pushSingleLogToSupabase,
  fetchAttendanceLogsFromSupabase,
} from "@/lib/attendance-supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const scannerUserId = searchParams.get("scannerUserId") || "";
    const ioMode = searchParams.get("ioMode") || "";
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const checkHardware = searchParams.get("checkHardware") === "1";

    const store = loadAttendanceStore();

    // ตรวจสอบสถานะ MySQL บน Synology NAS
    const mysqlStatus = await testAndInitSynologyMysql(store.mysqlConfig);

    // ตรวจสอบสถานะ Supabase Cloud
    const supabaseStatus = await checkSupabaseAttendanceReady();

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
        scannerOverview = { error: e.message || "ไม่สามารถเชื่อมต่อเครื่องสแกนได้" };
      }
    }

    // กรองรายการลงเวลา
    let filtered = store.logs.filter((l) => !l.isDeleted);

    if (dateFrom) {
      filtered = filtered.filter((l) => l.scanTimestamp.slice(0, 10) >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter((l) => l.scanTimestamp.slice(0, 10) <= dateTo);
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

    // สรุปสถิติ
    const activeLogs = store.logs.filter((l) => !l.isDeleted);
    const availableDates = Array.from(
      new Set(activeLogs.map((l) => l.scanTimestamp.slice(0, 10)))
    ).sort((a, b) => b.localeCompare(a));

    const safeMysqlConfig = {
      ...store.mysqlConfig,
      password: store.mysqlConfig.password ? "••••••••" : "",
      cloudflareBridgeSecret: store.mysqlConfig.cloudflareBridgeSecret ? "••••••••" : "",
      scannerPassword: 0,
    };

    return NextResponse.json({
      success: true,
      mysqlConfig: safeMysqlConfig,
      mysqlStatus,
      supabaseStatus,
      setupSql: getSynologyMysqlSetupSql(store.mysqlConfig),
      scannerOverview,
      lastSyncedAt: store.lastSyncedAt,
      lastMysqlSyncedAt: store.lastMysqlSyncedAt,
      deviceTotalRecords: store.deviceTotalRecords,
      totalStoredLogs: activeLogs.length,
      availableDates: availableDates.slice(0, 60),
      mappings: store.mappings,
      authorizedEditors: store.authorizedEditors,
      logs: filtered.slice(0, 1000),
      filteredTotal: filtered.length,
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
    const { action } = body;
    const store = loadAttendanceStore();

    // 1. ซิงก์ข้อมูลจากเครื่องสแกนลายนิ้วมือ HIP CMi681S (192.168.162.15:5005)
    if (action === "sync_device") {
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

      // ส่งต่อไปยัง Supabase Cloud Replica อัตโนมัติ (Hybrid Sync)
      const supabaseSync = await batchPushLogsToSupabase(pulled.records.map((r, idx) => {
        const uid = `dev_${r.machineId}_${r.userId}_${r.timestamp}`;
        const mapInfo = store.mappings[r.userId] || {
          memberId: `scanner_uid_${r.userId}`,
          memberName: `บุคลากร พมจ. (รหัสสแกน #${r.userId})`,
          division: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
          position: "เจ้าหน้าที่ปฏิบัติงาน",
        };
        return {
          id: `att_${idx + 1}`,
          recordUid: uid,
          scannerUserId: r.userId,
          memberId: mapInfo.memberId,
          memberName: mapInfo.memberName,
          division: mapInfo.division,
          position: mapInfo.position,
          scanTimestamp: r.timestamp,
          originalTimestamp: r.timestamp,
          ioMode: r.ioMode,
          ioLabel: r.ioLabel,
          verifyMode: r.verifyMode,
          verifyLabel: r.verifyLabel,
          machineId: r.machineId,
          source: "device",
          isEdited: false,
          isDeleted: false,
        };
      }));

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
              : (store.mysqlConfig.password || process.env.NAS_MYSQL_PASSWORD || ""),
          cloudflareBridgeSecret:
            incoming.cloudflareBridgeSecret && incoming.cloudflareBridgeSecret !== "••••••••"
              ? incoming.cloudflareBridgeSecret
              : (store.mysqlConfig.cloudflareBridgeSecret || process.env.NAS_MYSQL_BRIDGE_SECRET || ""),
          scannerPassword: Number(
            incoming.scannerPassword !== undefined && incoming.scannerPassword !== 0
              ? incoming.scannerPassword
              : (store.mysqlConfig.scannerPassword || process.env.HIP_SCANNER_PASSWORD || 1234)
          ),
        };
        saveAttendanceStore(store);
      }

      const mysqlStatus = await testAndInitSynologyMysql(store.mysqlConfig);
      let mysqlSync: unknown = null;
      if (mysqlStatus.connected) {
        mysqlSync = await pushStoreToSynologyMysql(store);
      }

      const safeConfig = {
        ...store.mysqlConfig,
        password: store.mysqlConfig.password ? "••••••••" : "",
        cloudflareBridgeSecret: store.mysqlConfig.cloudflareBridgeSecret ? "••••••••" : "",
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
      const {
        scannerUserId,
        scanDate,
        scanTime,
        ioMode,
        verifyMode,
        actorName,
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
        scanTime && scanTime.length === 5 ? `${scanTime}:00` : scanTime || "08:30:00";
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

      const mysqlSync = await upsertSingleLogToSynologyMysql(
        store.mysqlConfig,
        newLog
      );

      // ส่งต่อไปยัง Supabase Cloud Replica
      const supabaseSync = await pushSingleLogToSupabase(newLog);

      return NextResponse.json({
        success: true,
        item: newLog,
        mysqlSync,
        supabaseSync,
      });
    }

    // 4. แก้ไขรายการลงเวลา (โดย Admin หรือ User ที่ได้รับสิทธิ์)
    if (action === "update_log") {
      const {
        id,
        scannerUserId,
        scanDate,
        scanTime,
        ioMode,
        verifyMode,
        actorName,
        editNote,
      } = body;

      const target = store.logs.find((l) => l.id === id);
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

      store.logs.sort((a, b) => b.scanTimestamp.localeCompare(a.scanTimestamp));
      saveAttendanceStore(store);

      const mysqlSync = await upsertSingleLogToSynologyMysql(
        store.mysqlConfig,
        target
      );

      // ซิงก์การแก้ไขไปยัง Supabase Cloud
      const supabaseSync = await pushSingleLogToSupabase(target);

      return NextResponse.json({
        success: true,
        item: target,
        mysqlSync,
        supabaseSync,
      });
    }

    // 5. ลบรายการลงเวลา (Soft-Delete เพื่อป้องกันการดึงซ้ำเมื่อซิงก์จากเครื่องสแกน)
    if (action === "delete_log") {
      const { id, actorName, editNote } = body;
      const target = store.logs.find((l) => l.id === id);
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

      saveAttendanceStore(store);
      const mysqlSync = await upsertSingleLogToSynologyMysql(
        store.mysqlConfig,
        target
      );

      // ซิงก์การลบไปยัง Supabase Cloud
      const supabaseSync = await pushSingleLogToSupabase(target);

      return NextResponse.json({
        success: true,
        mysqlSync,
        supabaseSync,
      });
    }

    // 6. บันทึกการจับคู่รหัสเครื่องสแกน (User ID 1..64) กับรายชื่อบุคลากร
    if (action === "save_mapping") {
      const { scannerUserId, memberId, memberName, division, position, actorName } = body;
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

      // อัปเดตรายการ Log ทั้งหมดที่เป็นรหัสสแกนนี้ให้แสดงชื่อใหม่ทันที
      for (const log of store.logs) {
        if (log.scannerUserId === uid) {
          log.memberId = store.mappings[uid].memberId;
          log.memberName = store.mappings[uid].memberName;
          log.division = store.mappings[uid].division;
          log.position = store.mappings[uid].position;
        }
      }

      saveAttendanceStore(store);
      const mysqlSync = await pushStoreToSynologyMysql(store);

      return NextResponse.json({
        success: true,
        mapping: store.mappings[uid],
        mysqlSync,
      });
    }

    // 7. กำหนดสิทธิ์ผู้ใช้งาน (Admin / User ที่กำหนด) ให้สามารถแก้ไข/เพิ่ม/ลบเวลาได้
    if (action === "save_editors") {
      const { editors } = body as { editors: AuthorizedAttendanceEditor[] };
      if (Array.isArray(editors)) {
        store.authorizedEditors = editors;
        saveAttendanceStore(store);
        const mysqlSync = await pushStoreToSynologyMysql(store);
        return NextResponse.json({
          success: true,
          authorizedEditors: store.authorizedEditors,
          mysqlSync,
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
