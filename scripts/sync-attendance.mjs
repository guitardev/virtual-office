#!/usr/bin/env node
/**
 * Smart MSO - Attendance Auto-Sync Script (HIP CMi681S -> Local JSON + Synology NAS MariaDB + Supabase Cloud)
 * ----------------------------------------------------------------------------------------------------------
 * รันจากเครื่องในวง LAN เพื่อซิงก์เวลาเข้า-ออกงานอัตโนมัติ (รองรับ Windows Task Scheduler วันละ 2 รอบ: 08:32 น. และ 16:32 น.):
 *   node scripts/sync-attendance.mjs             # ซิงก์แบบอัจฉริยะ (ดึงเฉพาะส่วนเพิ่ม + ซ่อมช่องว่างอัตโนมัติ)
 *   node scripts/sync-attendance.mjs --all       # ซิงก์และ Reconcile เต็มชุดทุกรายการ
 *   node scripts/sync-attendance.mjs --check-only # ตรวจสอบยอดทั้ง 4 แหล่งโดยไม่เขียนทับข้อมูล
 *   node scripts/sync-attendance.mjs --quiet     # แสดงผลเฉพาะ JSON สรุป (เหมาะสำหรับ Task Scheduler)
 *   node scripts/sync-attendance.mjs --log       # บันทึก log ย่อลงไฟล์ data/attendance-sync.log
 *   node scripts/sync-attendance.mjs --schedule  # โหมดเฝ้าเวลาใน Terminal (ดึงอัตโนมัติทุกวัน 08:32 และ 16:32 น.)
 *   node scripts/sync-attendance.mjs --schedule --times=08:32,16:32 --log --run-now
 *   node scripts/sync-attendance.mjs --reclassify # จำแนกประเภทเวลา (1..4) ย้อนหลังตามระเบียบเวลาราชการทั้ง Local, NAS และ Supabase
 */

import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mysql from "mysql2/promise";
import { createClient } from "@supabase/supabase-js";
import {
  classifyAttendanceByOfficialHours,
  collectAvailableMonths,
} from "../lib/attendance-rules-core.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
process.chdir(PROJECT_ROOT);

const DEFAULT_SCHEDULE_TIMES = ["08:32", "16:32"];
const args = new Set(process.argv.slice(2));
const FORCE_ALL = args.has("--all");
const CHECK_ONLY = args.has("--check-only");
const QUIET = args.has("--quiet");
const WRITE_LOG = args.has("--log");
const DAEMON_SCHEDULE = args.has("--schedule");
const RUN_NOW = args.has("--run-now");
const RECLASSIFY = args.has("--reclassify");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const REQUESTED_LIMIT = limitArg ? Number(limitArg.split("=")[1]) : 1500;
const timesArg = process.argv.find((a) => a.startsWith("--times="));
const REQUESTED_TIMES_RAW = timesArg
  ? timesArg.slice("--times=".length).split(",").map((s) => s.trim()).filter(Boolean)
  : DEFAULT_SCHEDULE_TIMES;

function log(...parts) {
  if (!QUIET) console.log(...parts);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadEnvFile(path.join(PROJECT_ROOT, ".env"));
loadEnvFile(path.join(PROJECT_ROOT, ".env.local"));

const DATA_DIR = path.join(PROJECT_ROOT, "data");
const STORE_PATH = path.join(DATA_DIR, "attendance-store.json");
const LOG_PATH = path.join(DATA_DIR, "attendance-sync.log");
const MAX_LOG_LINES = 500;

function formatNowForLog() {
  const th = new Date(Date.now() + 7 * 3600000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${th.getUTCFullYear()}-${pad(th.getUTCMonth() + 1)}-${pad(
    th.getUTCDate()
  )} ${pad(th.getUTCHours())}:${pad(th.getUTCMinutes())}:${pad(
    th.getUTCSeconds()
  )}`;
}

function appendSyncLog(message) {
  if (!WRITE_LOG) return;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const line = `[${formatNowForLog()}] ${message}`;
    let lines = [];
    if (fs.existsSync(LOG_PATH)) {
      lines = fs.readFileSync(LOG_PATH, "utf8").split(/\r?\n/).filter(Boolean);
    }
    lines.push(line);
    if (lines.length > MAX_LOG_LINES) {
      lines = lines.slice(-MAX_LOG_LINES);
    }
    fs.writeFileSync(LOG_PATH, lines.join("\n") + "\n", "utf8");
  } catch (err) {
    console.error("⚠️ Cannot write sync log:", err?.message || err);
  }
}

function parseScheduleTimes(rawList) {
  const seen = new Set();
  const parsed = [];
  for (const raw of rawList) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
    if (!m) {
      throw new Error(`รูปแบบเวลาไม่ถูกต้อง: "${raw}" (ต้องเป็น HH:MM เช่น 08:32,16:32)`);
    }
    const hour = Number(m[1]);
    const minute = Number(m[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      throw new Error(`เวลาไม่อยู่ในช่วงที่ถูกต้อง: "${raw}"`);
    }
    const label = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    if (!seen.has(label)) {
      seen.add(label);
      parsed.push({ hour, minute, label });
    }
  }
  parsed.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
  if (parsed.length === 0) {
    throw new Error("กรุณาระบุเวลาอย่างน้อย 1 ช่วงเวลาสำหรับโหมด --schedule");
  }
  return parsed;
}

function getNextScheduledRun(scheduleTimes, now = new Date()) {
  const candidates = [];
  for (const offsetDays of [0, 1]) {
    for (const slot of scheduleTimes) {
      const target = new Date(now.getTime());
      target.setDate(target.getDate() + offsetDays);
      target.setHours(slot.hour, slot.minute, 0, 0);
      if (target.getTime() > now.getTime()) {
        candidates.push({ target, label: slot.label });
      }
    }
  }
  candidates.sort((a, b) => a.target.getTime() - b.target.getTime());
  return candidates[0];
}

const REC_SIZE_CIF12 = 20;
const CHUNK_SIZE = 1024;

function buildFrame(code, p1, p2, len, seq, machineId = 1, payload) {
  const header = Buffer.alloc(16);
  header[0] = 0x55;
  header[1] = 0xaa;
  header[2] = machineId & 0xff;
  header[3] = code & 0xff;
  header.writeUInt32LE(p1 >>> 0, 4);
  header.writeUInt32LE(p2 >>> 0, 8);
  header.writeUInt16LE(len & 0xffff, 12);
  header.writeUInt16LE(seq & 0xffff, 14);
  return payload ? Buffer.concat([header, payload]) : header;
}

function readAsciiZ(buf, offset, maxLen) {
  const sub = buf.subarray(offset, offset + maxLen);
  const zeroIdx = sub.indexOf(0);
  return sub
    .subarray(0, zeroIdx >= 0 ? zeroIdx : maxLen)
    .toString("utf8")
    .trim();
}

function decodeCif12AttendanceRecords(rawBuffer, expectedCount) {
  const records = [];
  const limit =
    typeof expectedCount === "number"
      ? Math.min(rawBuffer.length, expectedCount * REC_SIZE_CIF12)
      : rawBuffer.length;
  const pad = (n) => String(n).padStart(2, "0");

  for (let i = 0; i + REC_SIZE_CIF12 <= limit; i += REC_SIZE_CIF12) {
    const r = rawBuffer.subarray(i, i + REC_SIZE_CIF12);
    const userId = r.readUInt32LE(0);
    const machineId = r[4];
    const second = r[7];
    const w = r.readUInt32LE(8);
    const year = ((w >>> 2) & 0x3ff) + 1900;
    const month = (w >>> 12) & 0x0f;
    const day = (w >>> 16) & 0x1f;
    const hour = (w >>> 21) & 0x1f;
    const minute = (w >>> 26) & 0x3f;
    const rawIoMode = r[15];
    const verifyMode = (r[19] >>> 4) & 0x0f;

    if (userId === 0 || userId === 0xffffffff) continue;
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;

    const timestamp = `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
    const classified = classifyAttendanceByOfficialHours(timestamp);

    records.push({
      userId,
      machineId,
      timestamp,
      ioMode: classified.ioMode,
      ioLabel: classified.ioLabel,
      verifyMode,
      verifyLabel:
        verifyMode === 1
          ? "ลายนิ้วมือ (FP)"
          : verifyMode === 2
          ? "รหัสผ่าน (PWD)"
          : verifyMode === 3
          ? "บัตร (Card)"
          : `รูปแบบ ${verifyMode}`,
      rawIoMode,
    });
  }
  return records;
}

class HipScannerClient {
  constructor({ ip, port = 5005, password = 0, machineId = 1, timeoutMs = 35000 }) {
    this.ip = ip;
    this.port = port;
    this.password = password;
    this.machineId = machineId;
    this.timeoutMs = timeoutMs;
    this.sock = null;
    this.seq = 0;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const sock = net.createConnection({ host: this.ip, port: this.port }, () => {
        sock.setNoDelay(true);
        this.sock = sock;
        resolve();
      });
      sock.setTimeout(this.timeoutMs);
      sock.once("error", reject);
      sock.once("timeout", () => {
        sock.destroy();
        reject(new Error(`Connection timeout to ${this.ip}:${this.port}`));
      });
    });
  }

  disconnect() {
    if (this.sock) {
      this.sock.destroy();
      this.sock = null;
    }
  }

  sendCommand(code, p1, p2, expectedPayloadLen, writePayload) {
    return new Promise((resolve, reject) => {
      if (!this.sock) return reject(new Error("Socket is not connected"));
      const sock = this.sock;
      this.seq = (this.seq + 1) & 0xffff;
      const packet = buildFrame(
        code,
        p1,
        p2,
        expectedPayloadLen,
        this.seq,
        this.machineId,
        writePayload
      );
      let buf = Buffer.alloc(0);
      const cleanup = () => {
        sock.removeListener("data", onData);
        sock.removeListener("error", onError);
      };
      const onError = (err) => {
        cleanup();
        reject(err);
      };
      const onData = (chunk) => {
        buf = Buffer.concat([buf, chunk]);
        if (buf.length < 10) return;
        const ok = buf[3] === 0x01;
        const status = buf.readUInt32LE(4);
        const rSeq = buf.readUInt16LE(8);
        const totalExpected =
          ok && expectedPayloadLen > 0 && !writePayload
            ? 10 + 2 + expectedPayloadLen + 4
            : 10;
        if (buf.length >= totalExpected) {
          cleanup();
          const data =
            totalExpected > 10
              ? Buffer.from(buf.subarray(12, 12 + expectedPayloadLen))
              : Buffer.alloc(0);
          resolve({ ok, status, seq: rSeq, data });
        }
      };
      sock.on("data", onData);
      sock.once("error", onError);
      sock.write(packet);
    });
  }

  async handshake() {
    let hs = await this.sendCommand(0x80, this.password, 0xffff1234, 0);
    if (!hs.ok && this.password !== 0) {
      hs = await this.sendCommand(0x80, 0, 0xffff1234, 0);
    }
    if (!hs.ok) {
      throw new Error(`Handshake rejected by ${this.ip}:${this.port}`);
    }
    await this.sendCommand(0x13, 0, 0, 0x30);
    await this.sendCommand(0x13, 1, 0, 0x400);
    await this.sendCommand(0x13, 0, 0, 0x30);
  }

  async getDeviceOverview() {
    await this.handshake();
    const hw = await this.sendCommand(0xc3, 0x100, 0, 256);
    const productCode = readAsciiZ(hw.data, 0x00, 32);
    const vendorName = readAsciiZ(hw.data, 0x20, 32);
    const serialNumber = readAsciiZ(hw.data, 0x60, 32);

    const clk = await this.sendCommand(0xb2, 0, 0, 8);
    const pad = (n) => String(n).padStart(2, "0");
    const year = clk.data.length >= 8 ? clk.data.readUInt16LE(0) : 2026;
    const month = clk.data.length >= 8 ? clk.data[2] : 1;
    const day = clk.data.length >= 8 ? clk.data[3] : 1;
    const hour = clk.data.length >= 8 ? clk.data[5] : 0;
    const minute = clk.data.length >= 8 ? clk.data[6] : 0;
    const second = clk.data.length >= 8 ? clk.data[7] : 0;
    const deviceTime = `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`;

    const queryStat = async (code) =>
      (await this.sendCommand(0xb4, code, 0xffff0000, 0)).status;

    return {
      info: { productCode, vendorName, serialNumber, deviceTime },
      status: {
        registeredUsersCount: await queryStat(11),
        fingerprintsCount: await queryStat(3),
        passwordsCount: await queryStat(4),
        idCardsCount: await queryStat(9),
        attendanceLogsCount: await queryStat(8),
        capacities: { maxAttendanceLogs: await queryStat(207) },
      },
    };
  }

  async getAttendanceLogs(limitLatest) {
    await this.handshake();
    const stat8 = await this.sendCommand(0xb4, 8, 0xffff0000, 0);
    const totalCount = stat8.status;
    if (totalCount === 0) return { totalCount: 0, records: [] };

    const totalBytes = totalCount * REC_SIZE_CIF12;
    let offset = 0;
    let pageIdx = 0;
    const chunks = [];

    while (offset < totalBytes) {
      const chunkLen = Math.min(CHUNK_SIZE, totalBytes - offset);
      const p2 = pageIdx === 0 ? totalCount : (pageIdx << 16) >>> 0;
      const page = await this.sendCommand(0xa4, 0, p2, chunkLen);
      if (!page.ok) {
        throw new Error(`Failed reading attendance log page #${pageIdx}`);
      }
      chunks.push(page.data);
      offset += chunkLen;
      pageIdx++;
    }

    const allBuffer = Buffer.concat(chunks);
    const allRecords = decodeCif12AttendanceRecords(allBuffer, totalCount);
    const records =
      typeof limitLatest === "number" && limitLatest > 0
        ? allRecords.slice(-limitLatest)
        : allRecords;

    return { totalCount, records };
  }
}

function formatIsoToThaiTimestamp(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return String(isoStr);
  const th = new Date(d.getTime() + 7 * 3600000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${th.getUTCFullYear()}-${pad(th.getUTCMonth() + 1)}-${pad(
    th.getUTCDate()
  )} ${pad(th.getUTCHours())}:${pad(th.getUTCMinutes())}:${pad(
    th.getUTCSeconds()
  )}`;
}

function buildDefaultMappings() {
  const map = {};
  for (let uid = 1; uid <= 64; uid++) {
    map[uid] = {
      scannerUserId: uid,
      memberId: `scanner_uid_${uid}`,
      memberName: `บุคลากร พมจ. (รหัสสแกน #${uid})`,
      division: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
      position: "เจ้าหน้าที่ปฏิบัติงาน",
    };
  }
  return map;
}

function buildDefaultEditors() {
  return [
    {
      memberId: "syno_เสกพล",
      memberName: "นายเสกพล ดิษฐโชติ",
      division: "ฝ่ายบริหารทั่วไป",
      role: "manager",
      grantedBy: "ระบบเริ่มต้น (Default)",
      grantedAt: new Date().toISOString(),
    },
    {
      memberId: "syno_ขวัญนภา",
      memberName: "นางสาวขวัญนภา ศิริสมบัติ",
      division: "กลุ่มนโยบายและวิชาการ",
      role: "member",
      grantedBy: "ระบบเริ่มต้น (Default)",
      grantedAt: new Date().toISOString(),
    },
  ];
}

function getEnvDefaults() {
  return {
    connectionMode: process.env.NAS_MYSQL_MODE || "direct_tcp",
    host: process.env.NAS_MYSQL_HOST || "192.168.162.23",
    port: Number(process.env.NAS_MYSQL_PORT || 3308),
    user: process.env.NAS_MYSQL_USER || "smartmso",
    password: process.env.NAS_MYSQL_PASSWORD || "",
    database: process.env.NAS_MYSQL_DATABASE || "smart_mso_attendance",
    cloudflareBridgeUrl:
      process.env.NAS_MYSQL_BRIDGE_URL ||
      "https://db.smso.site/attendance-bridge.php",
    cloudflareBridgeSecret: process.env.NAS_MYSQL_BRIDGE_SECRET || "",
    scannerIp: process.env.HIP_SCANNER_IP || "192.168.162.15",
    scannerPort: Number(process.env.HIP_SCANNER_PORT || 5005),
    scannerPassword: Number(process.env.HIP_SCANNER_PASSWORD || 1234),
  };
}

function loadStore() {
  const envDefaults = getEnvDefaults();
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(STORE_PATH)) {
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
    const parsedCfg = parsed.mysqlConfig || {};
    const resolvedConfig = {
      connectionMode: process.env.NAS_MYSQL_MODE || parsedCfg.connectionMode || envDefaults.connectionMode,
      host: process.env.NAS_MYSQL_HOST || parsedCfg.host || envDefaults.host,
      port: Number(process.env.NAS_MYSQL_PORT || parsedCfg.port || envDefaults.port),
      user: process.env.NAS_MYSQL_USER || parsedCfg.user || envDefaults.user,
      password:
        envDefaults.password ||
        (parsedCfg.password && parsedCfg.password !== "••••••••" ? parsedCfg.password : ""),
      database: process.env.NAS_MYSQL_DATABASE || parsedCfg.database || envDefaults.database,
      cloudflareBridgeUrl:
        process.env.NAS_MYSQL_BRIDGE_URL || parsedCfg.cloudflareBridgeUrl || envDefaults.cloudflareBridgeUrl,
      cloudflareBridgeSecret:
        envDefaults.cloudflareBridgeSecret ||
        (parsedCfg.cloudflareBridgeSecret && parsedCfg.cloudflareBridgeSecret !== "••••••••"
          ? parsedCfg.cloudflareBridgeSecret
          : ""),
      scannerIp: process.env.HIP_SCANNER_IP || parsedCfg.scannerIp || envDefaults.scannerIp,
      scannerPort: Number(process.env.HIP_SCANNER_PORT || parsedCfg.scannerPort || envDefaults.scannerPort),
      scannerPassword: Number(
        process.env.HIP_SCANNER_PASSWORD || parsedCfg.scannerPassword || envDefaults.scannerPassword || 1234
      ),
    };
    const hasCustomEditors = Boolean(parsed.editorsCustomized);
    const parsedEditors = Array.isArray(parsed.authorizedEditors) ? parsed.authorizedEditors : [];
    return {
      mysqlConfig: resolvedConfig,
      lastSyncedAt: parsed.lastSyncedAt || null,
      lastMysqlSyncedAt: parsed.lastMysqlSyncedAt || null,
      deviceTotalRecords: parsed.deviceTotalRecords || 0,
      deviceOverview: parsed.deviceOverview || undefined,
      mappings: { ...buildDefaultMappings(), ...(parsed.mappings || {}) },
      authorizedEditors:
        parsedEditors.length > 0 || hasCustomEditors ? parsedEditors : buildDefaultEditors(),
      editorsCustomized: hasCustomEditors,
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
    };
  }
  return {
    mysqlConfig: envDefaults,
    lastSyncedAt: null,
    lastMysqlSyncedAt: null,
    deviceTotalRecords: 0,
    mappings: buildDefaultMappings(),
    authorizedEditors: buildDefaultEditors(),
    editorsCustomized: false,
    logs: [],
  };
}

function saveStore(store) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const sanitized = {
    ...store,
    mysqlConfig: {
      ...store.mysqlConfig,
      password: process.env.NAS_MYSQL_PASSWORD ? "" : store.mysqlConfig.password,
      cloudflareBridgeSecret: process.env.NAS_MYSQL_BRIDGE_SECRET
        ? ""
        : store.mysqlConfig.cloudflareBridgeSecret,
      scannerPassword: process.env.HIP_SCANNER_PASSWORD
        ? undefined
        : store.mysqlConfig.scannerPassword,
    },
  };
  const serialized =
    sanitized.logs.length > 500
      ? JSON.stringify(sanitized)
      : JSON.stringify(sanitized, null, 2);
  fs.writeFileSync(STORE_PATH, serialized, "utf8");
}

function mapSupabaseRowToLog(row) {
  const ts = formatIsoToThaiTimestamp(row.scan_timestamp);
  return {
    id: String(row.id),
    recordUid: String(row.record_uid),
    scannerUserId: Number(row.scanner_user_id),
    memberId: String(row.member_id || ""),
    memberName: String(row.member_name || ""),
    division: String(row.division || ""),
    position: String(row.position || ""),
    scanTimestamp: ts,
    originalTimestamp: formatIsoToThaiTimestamp(row.original_timestamp) || ts,
    ioMode: Number(row.io_mode),
    ioLabel: String(row.io_label || ""),
    verifyMode: Number(row.verify_mode),
    verifyLabel: String(row.verify_label || ""),
    machineId: Number(row.machine_id || 1),
    source: row.source === "manual" ? "manual" : "device",
    isEdited: Boolean(row.is_edited),
    editedBy: row.edited_by ? String(row.edited_by) : undefined,
    editedAt: row.edited_at ? String(row.edited_at) : undefined,
    editNote: row.edit_note ? String(row.edit_note) : undefined,
    isDeleted: Boolean(row.is_deleted),
  };
}

function mapLogToSupabase(l) {
  return {
    id: l.id,
    record_uid: l.recordUid,
    scanner_user_id: l.scannerUserId,
    member_id: l.memberId,
    member_name: l.memberName,
    division: l.division || "",
    position: l.position || "",
    scan_timestamp: new Date(l.scanTimestamp.replace(" ", "T") + "+07:00").toISOString(),
    original_timestamp: new Date(
      (l.originalTimestamp || l.scanTimestamp).replace(" ", "T") + "+07:00"
    ).toISOString(),
    io_mode: l.ioMode,
    io_label: l.ioLabel,
    verify_mode: l.verifyMode,
    verify_label: l.verifyLabel,
    machine_id: l.machineId,
    source: l.source,
    is_edited: l.isEdited,
    edited_by: l.editedBy || null,
    edited_at: l.editedAt ? new Date(l.editedAt).toISOString() : null,
    edit_note: l.editNote || null,
    is_deleted: l.isDeleted || false,
    updated_at: new Date().toISOString(),
  };
}

function createSupabaseClientFromEnv() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "https://xkeiuyhkokmecefzzynb.supabase.co";
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";
  return supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
}

function mapLogToMysqlTuple(l) {
  return [
    l.id,
    l.recordUid,
    l.scannerUserId,
    l.memberId,
    l.memberName,
    l.division || "",
    l.position || "",
    l.scanTimestamp,
    l.originalTimestamp,
    l.ioMode,
    l.ioLabel,
    l.verifyMode,
    l.verifyLabel,
    l.machineId,
    l.source,
    l.isEdited ? 1 : 0,
    l.editedBy || null,
    l.editedAt ? l.editedAt.slice(0, 19).replace("T", " ") : null,
    l.editNote || null,
    l.isDeleted ? 1 : 0,
  ];
}

async function reconcileSupabaseOverrides(supabase, store) {
  if (!supabase) return 0;
  const overrides = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from("attendance_logs")
      .select("*")
      .or("is_edited.eq.true,is_deleted.eq.true,source.eq.manual")
      .range(offset, offset + 999);
    if (error || !data || data.length === 0) break;
    overrides.push(...data.map(mapSupabaseRowToLog));
    if (data.length < 1000) break;
    offset += 1000;
  }

  let adopted = 0;
  const byUid = new Map(store.logs.map((l) => [l.recordUid, l]));
  const byId = new Map(store.logs.map((l) => [l.id, l]));
  for (const ci of overrides) {
    const li = byUid.get(ci.recordUid) || byId.get(ci.id);
    if (!li) {
      store.logs.push(ci);
      byUid.set(ci.recordUid, ci);
      byId.set(ci.id, ci);
      adopted++;
    } else {
      const cMs = ci.editedAt ? new Date(ci.editedAt).getTime() : 0;
      const lMs = li.editedAt ? new Date(li.editedAt).getTime() : 0;
      if ((!li.isEdited && !li.isDeleted) || cMs > lMs) {
        Object.assign(li, ci);
        adopted++;
      }
    }
  }
  return adopted;
}

function summarizeModeCounts(logs) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, total: 0 };
  for (const l of logs) {
    if (l.isDeleted) continue;
    counts.total++;
    if (l.ioMode === 1 || l.ioMode === 2 || l.ioMode === 3 || l.ioMode === 4) {
      counts[l.ioMode]++;
    }
  }
  return counts;
}

function modeCountsMatch(a, b) {
  return Boolean(
    a &&
      b &&
      a[1] === b[1] &&
      a[2] === b[2] &&
      a[3] === b[3] &&
      a[4] === b[4] &&
      a.total === b.total
  );
}

async function runSyncOnce() {
  const t0 = Date.now();
  const store = loadStore();
  const cfg = store.mysqlConfig;
  const supabase = createSupabaseClientFromEnv();

  log("=================================================");
  log(`Smart MSO Attendance Sync (${new Date().toLocaleString("th-TH")})`);
  log(`Scanner: ${cfg.scannerIp}:${cfg.scannerPort} | NAS: ${cfg.host}:${cfg.port}`);

  // 1. Read hardware overview
  const scanner = new HipScannerClient({
    ip: cfg.scannerIp,
    port: cfg.scannerPort,
    password: cfg.scannerPassword,
    timeoutMs: 35000,
  });
  await scanner.connect();
  const overview = await scanner.getDeviceOverview();
  scanner.disconnect();

  const deviceTotal = overview.status.attendanceLogsCount;
  const activeLocalBefore = store.logs.filter((l) => !l.isDeleted).length;

  // 2. Check NAS MariaDB & Supabase status in parallel
  let mysqlConn = null;
  let nasCountBefore = null;
  try {
    mysqlConn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      connectTimeout: 3000,
    });
    const [cntRows] = await mysqlConn.query(
      "SELECT COUNT(*) AS cnt FROM attendance_logs WHERE is_deleted = 0"
    );
    nasCountBefore = Number(cntRows?.[0]?.cnt || 0);
  } catch (err) {
    log(`⚠️ NAS MariaDB unreachable: ${err.message}`);
  }

  let pulled = null;
  let addedCount = 0;
  let updatedCount = 0;
  let activeAfter = activeLocalBefore;
  let nasUpserted = 0;
  let nasAfter = nasCountBefore;

  try {
    let supaCountBefore = null;
    let supaLatestTs = null;
    if (supabase) {
      const [cntRes, latRes] = await Promise.all([
        supabase
          .from("attendance_logs")
          .select("*", { count: "exact", head: true })
          .eq("is_deleted", false),
        supabase
          .from("attendance_logs")
          .select("scan_timestamp")
          .eq("is_deleted", false)
          .order("scan_timestamp", { ascending: false })
          .limit(1),
      ]);
      if (!cntRes.error) supaCountBefore = Number(cntRes.count || 0);
      if (!latRes.error && latRes.data?.[0]) {
        supaLatestTs = formatIsoToThaiTimestamp(latRes.data[0].scan_timestamp);
      }
    }

    log(
      `📊 Counts before sync -> Device: ${deviceTotal} | Local JSON: ${activeLocalBefore} | NAS MariaDB: ${nasCountBefore ?? "N/A"} | Supabase: ${supaCountBefore ?? "N/A"}`
    );

    if (CHECK_ONLY) {
      const checkSummary = {
        mode: "check-only",
        device: overview,
        localActive: activeLocalBefore,
        localLastSyncedAt: store.lastSyncedAt,
        nasMariaDbActive: nasCountBefore,
        supabaseActive: supaCountBefore,
        supabaseLatestScan: supaLatestTs,
        pendingDelta: deviceTotal - activeLocalBefore,
      };
      appendSyncLog(
        `[CHECK] device=${deviceTotal} local=${activeLocalBefore} nas=${nasCountBefore ?? "N/A"} supa=${supaCountBefore ?? "N/A"} delta=${deviceTotal - activeLocalBefore}`
      );
      console.log(JSON.stringify(checkSummary, null, 2));
      return checkSummary;
    }

    // 3. Reconcile Cloud edits/deletes/manual records & mappings
    if (supabase) {
      await reconcileSupabaseOverrides(supabase, store);

      const { data: mapRows } = await supabase.from("attendance_user_mappings").select("*");
      if (mapRows && mapRows.length > 0) {
        for (const r of mapRows) {
          const uid = Number(r.scanner_user_id);
          const cm = {
            scannerUserId: uid,
            memberId: String(r.member_id),
            memberName: String(r.member_name),
            division: String(r.division || ""),
            position: String(r.position || ""),
            updatedBy: r.updated_by ? String(r.updated_by) : undefined,
            updatedAt: r.updated_at ? String(r.updated_at) : undefined,
          };
          const lm = store.mappings[uid];
          const cTs = cm.updatedAt ? new Date(cm.updatedAt).getTime() : 0;
          const lTs = lm?.updatedAt ? new Date(lm.updatedAt).getTime() : 0;
          if (!lm || (!lm.updatedAt && cm.updatedAt) || cTs > lTs) {
            store.mappings[uid] = cm;
          }
        }
      }

      const { data: edRows } = await supabase.from("attendance_authorized_editors").select("*");
      if (edRows && (edRows.length > 0 || store.editorsCustomized)) {
        store.authorizedEditors = edRows.map((row) => ({
          memberId: String(row.member_id),
          memberName: String(row.member_name),
          division: String(row.division || ""),
          role: String(row.role || "member"),
          grantedBy: row.granted_by ? String(row.granted_by) : "ระบบ",
          grantedAt: row.granted_at ? String(row.granted_at) : new Date().toISOString(),
        }));
      }
    }

    // 4. Pull device records (auto-widen if gap exceeds requested limit)
    const localGap = deviceTotal - store.logs.filter((l) => !l.isDeleted).length;
    const effectiveLimit =
      FORCE_ALL ||
      REQUESTED_LIMIT <= 0 ||
      localGap > Math.max(0, REQUESTED_LIMIT - 100)
        ? undefined
        : REQUESTED_LIMIT;

    const logClient = new HipScannerClient({
      ip: cfg.scannerIp,
      port: cfg.scannerPort,
      password: cfg.scannerPassword,
      timeoutMs: 35000,
    });
    await logClient.connect();
    pulled = await logClient.getAttendanceLogs(effectiveLimit);
    logClient.disconnect();

    const existingByUid = new Map(store.logs.map((l) => [l.recordUid, l]));
    const changedLogs = [];

    for (const rec of pulled.records) {
      const recordUid = `dev_${rec.machineId}_${rec.userId}_${rec.timestamp}`;
      const mapInfo = store.mappings[rec.userId] || {
        scannerUserId: rec.userId,
        memberId: `scanner_uid_${rec.userId}`,
        memberName: `บุคลากร พมจ. (รหัสสแกน #${rec.userId})`,
        division: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
        position: "เจ้าหน้าที่ปฏิบัติงาน",
      };

      const existing = existingByUid.get(recordUid);
      if (!existing) {
        const newItem = {
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          recordUid,
          scannerUserId: rec.userId,
          memberId: mapInfo.memberId,
          memberName: mapInfo.memberName,
          division: mapInfo.division,
          position: mapInfo.position,
          scanTimestamp: rec.timestamp,
          originalTimestamp: rec.timestamp,
          ioMode: rec.ioMode,
          ioLabel: rec.ioLabel,
          verifyMode: rec.verifyMode,
          verifyLabel: rec.verifyLabel,
          machineId: rec.machineId,
          source: "device",
          isEdited: false,
          isDeleted: false,
        };
        store.logs.push(newItem);
        existingByUid.set(recordUid, newItem);
        changedLogs.push(newItem);
        addedCount++;
      } else if (!existing.isEdited && !existing.isDeleted) {
        const mappingChanged =
          existing.memberName !== mapInfo.memberName ||
          existing.division !== mapInfo.division ||
          existing.memberId !== mapInfo.memberId ||
          existing.position !== mapInfo.position;
        const classified =
          existing.source === "device"
            ? classifyAttendanceByOfficialHours(existing.scanTimestamp || rec.timestamp)
            : null;
        const ioChanged =
          classified !== null &&
          (existing.ioMode !== classified.ioMode ||
            existing.ioLabel !== classified.ioLabel);

        if (mappingChanged || ioChanged) {
          if (mappingChanged) {
            existing.memberId = mapInfo.memberId;
            existing.memberName = mapInfo.memberName;
            existing.division = mapInfo.division;
            existing.position = mapInfo.position;
          }
          if (ioChanged && classified) {
            existing.ioMode = classified.ioMode;
            existing.ioLabel = classified.ioLabel;
          }
          changedLogs.push(existing);
          updatedCount++;
        }
      }
    }

    store.logs.sort((a, b) => b.scanTimestamp.localeCompare(a.scanTimestamp));
    store.lastSyncedAt = new Date().toISOString();
    store.deviceTotalRecords = pulled.totalCount;
    store.deviceOverview = {
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
      checkedAt: store.lastSyncedAt,
    };
    saveStore(store);

    activeAfter = store.logs.filter((l) => !l.isDeleted).length;

    // 5. Push to Synology NAS MariaDB
    if (mysqlConn) {
      const nasGap = activeAfter - (nasCountBefore || 0);
      const nasLogs =
        FORCE_ALL || nasGap > changedLogs.length ? store.logs : changedLogs;
      const mappings = Object.values(store.mappings);
      if (mappings.length > 0) {
        const mapValues = mappings.map((m) => [
          m.scannerUserId,
          m.memberId,
          m.memberName,
          m.division || "",
          m.position || "",
          m.updatedBy || "system",
        ]);
        await mysqlConn.query(
          `INSERT INTO attendance_user_mappings
            (scanner_user_id, member_id, member_name, division, position, updated_by)
           VALUES ?
           ON DUPLICATE KEY UPDATE
            member_id = VALUES(member_id),
            member_name = VALUES(member_name),
            division = VALUES(division),
            position = VALUES(position),
            updated_by = VALUES(updated_by)`,
          [mapValues]
        );
      }

      for (let i = 0; i < nasLogs.length; i += 500) {
        const slice = nasLogs.slice(i, i + 500);
        const values = slice.map(mapLogToMysqlTuple);
        await mysqlConn.query(
          `INSERT INTO attendance_logs (
            id, record_uid, scanner_user_id, member_id, member_name, division, position,
            scan_timestamp, original_timestamp, io_mode, io_label, verify_mode, verify_label,
            machine_id, source, is_edited, edited_by, edited_at, edit_note, is_deleted
          ) VALUES ?
          ON DUPLICATE KEY UPDATE
            scanner_user_id = VALUES(scanner_user_id),
            member_id = VALUES(member_id),
            member_name = VALUES(member_name),
            division = VALUES(division),
            position = VALUES(position),
            scan_timestamp = VALUES(scan_timestamp),
            io_mode = VALUES(io_mode),
            io_label = VALUES(io_label),
            verify_mode = VALUES(verify_mode),
            verify_label = VALUES(verify_label),
            is_edited = VALUES(is_edited),
            edited_by = VALUES(edited_by),
            edited_at = VALUES(edited_at),
            edit_note = VALUES(edit_note),
            is_deleted = VALUES(is_deleted)`,
          [values]
        );
        nasUpserted += slice.length;
      }

      const [cntAfterRows] = await mysqlConn.query(
        "SELECT COUNT(*) AS cnt FROM attendance_logs WHERE is_deleted = 0"
      );
      nasAfter = Number(cntAfterRows?.[0]?.cnt || 0);
      store.lastMysqlSyncedAt = new Date().toISOString();
      saveStore(store);
    }

    // 6. Push to Supabase Cloud + record sync telemetry
    let supaUpserted = 0;
    let supaAfter = supaCountBefore;
    if (supabase) {
      const supaGap = activeAfter - (supaCountBefore || 0);
      const supaLogs =
        FORCE_ALL || (supaCountBefore !== null && supaGap > changedLogs.length)
          ? store.logs.filter((l) => !l.isEdited && !l.isDeleted)
          : changedLogs.filter((l) => !l.isEdited && !l.isDeleted);

      for (let i = 0; i < supaLogs.length; i += 500) {
        const slice = supaLogs.slice(i, i + 500).map(mapLogToSupabase);
        const { error } = await supabase
          .from("attendance_logs")
          .upsert(slice, { onConflict: "record_uid" });
        if (error) throw new Error(`Supabase upsert error: ${error.message}`);
        supaUpserted += slice.length;
      }

      const mapRows = Object.values(store.mappings).map((m) => ({
        scanner_user_id: m.scannerUserId,
        member_id: m.memberId,
        member_name: m.memberName,
        division: m.division || "",
        position: m.position || "",
        updated_by: m.updatedBy || "system",
        updated_at: m.updatedAt || new Date().toISOString(),
      }));
      if (mapRows.length > 0) {
        await supabase
          .from("attendance_user_mappings")
          .upsert(mapRows, { onConflict: "scanner_user_id" });
      }

      const { count: cAfter } = await supabase
        .from("attendance_logs")
        .select("*", { count: "exact", head: true })
        .eq("is_deleted", false);
      if (typeof cAfter === "number") supaAfter = cAfter;

      const availableMonths = collectAvailableMonths(
        store.logs.filter((l) => !l.isDeleted)
      );

      // Telemetry in audit_logs (insert on new records, changed total, --all, or >=5h heartbeat for 08:32 / 16:32 schedule)
      const { data: prevTelemetry } = await supabase
        .from("audit_logs")
        .select("timestamp, metadata")
        .eq("actor_id", "hip_cmi681s_sync")
        .order("timestamp", { ascending: false })
        .limit(1);

      const prevRow = prevTelemetry?.[0];
      const prevTotal = Number(prevRow?.metadata?.deviceTotalRecords || 0);
      const prevTs = prevRow?.timestamp ? new Date(prevRow.timestamp).getTime() : 0;
      const prevMonths = Array.isArray(prevRow?.metadata?.availableMonths)
        ? prevRow.metadata.availableMonths
        : [];
      const shouldInsertTelemetry =
        FORCE_ALL ||
        addedCount > 0 ||
        updatedCount > 0 ||
        prevTotal !== pulled.totalCount ||
        prevMonths.length !== availableMonths.length ||
        !prevRow ||
        Date.now() - prevTs >= 5 * 3600 * 1000;

      if (shouldInsertTelemetry) {
        const { error: telErr } = await supabase.from("audit_logs").insert({
          actor_id: "hip_cmi681s_sync",
          actor_name: "ระบบซิงก์เครื่องสแกนอัตโนมัติ (LAN CLI)",
          action: "ซิงก์ข้อมูลเวลาปฏิบัติราชการจากเครื่องสแกน HIP CMi681S",
          target: `เครื่องสแกน ${cfg.scannerIp} — ยอดในเครื่อง ${pulled.totalCount.toLocaleString()} รายการ (เพิ่มใหม่ ${addedCount.toLocaleString()} รายการ)`,
          status: "success",
          metadata: {
            type: "attendance_device_sync",
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
            scannerIp: cfg.scannerIp,
            addedCount,
            pulledCount: pulled.records.length,
            availableMonths,
            source: FORCE_ALL ? "cli_sync_all" : "cli_sync",
          },
        });
        if (telErr) {
          log(`⚠️ Supabase telemetry insert warning: ${telErr.message}`);
        }
      }
    }

    const elapsed = Date.now() - t0;
    const result = {
      success: true,
      elapsedMs: elapsed,
      deviceTotalCount: pulled.totalCount,
      pulledCount: pulled.records.length,
      addedCount,
      updatedCount,
      localActiveAfter: activeAfter,
      nasUpserted,
      nasActiveAfter: nasAfter,
      supabaseUpserted: supaUpserted,
      supabaseActiveAfter: supaAfter,
      latestScanTimestamp: store.logs[0]?.scanTimestamp || null,
      lastSyncedAt: store.lastSyncedAt,
    };
    appendSyncLog(
      `[OK] device=${result.deviceTotalCount} added=${addedCount} updated=${updatedCount} local=${activeAfter} nas=${nasAfter ?? "N/A"} supa=${supaAfter ?? "N/A"} latest="${result.latestScanTimestamp || "-"}" elapsed=${elapsed}ms`
    );
    console.log(JSON.stringify(result, null, 2));
    return result;
  } finally {
    if (mysqlConn) {
      await mysqlConn.end().catch(() => {});
    }
  }
}

async function runReclassifyOnce() {
  const t0 = Date.now();
  const store = loadStore();
  const cfg = store.mysqlConfig;
  const supabase = createSupabaseClientFromEnv();

  log("=================================================");
  log(`Smart MSO Attendance Reclassify (${new Date().toLocaleString("th-TH")})`);
  log(`Local store logs: ${store.logs.length} | NAS: ${cfg.host}:${cfg.port}`);

  if (supabase) {
    const adoptedOverrides = await reconcileSupabaseOverrides(supabase, store);
    if (adoptedOverrides > 0) {
      log(`☁️ Adopted ${adoptedOverrides} Cloud edited/manual/deleted overrides before reclassify`);
    }
  }

  const changedLogs = [];
  for (const item of store.logs) {
    if (item.isEdited || item.isDeleted || item.source !== "device") {
      continue;
    }
    const classified = classifyAttendanceByOfficialHours(item.scanTimestamp);
    if (item.ioMode !== classified.ioMode || item.ioLabel !== classified.ioLabel) {
      item.ioMode = classified.ioMode;
      item.ioLabel = classified.ioLabel;
      changedLogs.push(item);
    }
  }

  if (changedLogs.length > 0) {
    saveStore(store);
  }

  const localCounts = summarizeModeCounts(store.logs);
  const activeLogs = store.logs.filter((l) => !l.isDeleted);
  const availableMonths = collectAvailableMonths(activeLogs);
  const allUneditedDeviceLogs = activeLogs.filter(
    (l) => !l.isEdited && l.source === "device"
  );

  let mysqlConn = null;
  let nasUpserted = 0;
  let nasCounts = null;
  let supaUpserted = 0;
  let supaCounts = null;
  let telemetryInserted = false;

  const queryNasCounts = async (conn) => {
    const [modeRows] = await conn.query(
      "SELECT io_mode, COUNT(*) AS cnt FROM attendance_logs WHERE is_deleted = 0 GROUP BY io_mode"
    );
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, total: 0 };
    for (const row of modeRows || []) {
      const mode = Number(row.io_mode);
      const cnt = Number(row.cnt || 0);
      counts.total += cnt;
      if (mode >= 1 && mode <= 4) {
        counts[mode] = cnt;
      }
    }
    return counts;
  };

  const upsertLogsToNas = async (conn, rowsToSend) => {
    for (let i = 0; i < rowsToSend.length; i += 500) {
      const slice = rowsToSend.slice(i, i + 500);
      const values = slice.map(mapLogToMysqlTuple);
      await conn.query(
        `INSERT INTO attendance_logs (
          id, record_uid, scanner_user_id, member_id, member_name, division, position,
          scan_timestamp, original_timestamp, io_mode, io_label, verify_mode, verify_label,
          machine_id, source, is_edited, edited_by, edited_at, edit_note, is_deleted
        ) VALUES ?
        ON DUPLICATE KEY UPDATE
          io_mode = VALUES(io_mode),
          io_label = VALUES(io_label)`,
        [values]
      );
      nasUpserted += slice.length;
    }
  };

  try {
    // 1. Update Synology NAS MariaDB in 500-row batches
    try {
      mysqlConn = await mysql.createConnection({
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        password: cfg.password,
        database: cfg.database,
        connectTimeout: 5000,
      });

      const nasBefore = await queryNasCounts(mysqlConn);
      let nasTargetLogs = FORCE_ALL ? allUneditedDeviceLogs : changedLogs;
      if (!FORCE_ALL && changedLogs.length === 0 && !modeCountsMatch(nasBefore, localCounts)) {
        nasTargetLogs = allUneditedDeviceLogs;
      }
      await upsertLogsToNas(mysqlConn, nasTargetLogs);
      nasCounts = await queryNasCounts(mysqlConn);

      if (!FORCE_ALL && nasTargetLogs === changedLogs && !modeCountsMatch(nasCounts, localCounts)) {
        log("🔄 NAS MariaDB counts still differ from local store; performing full unedited backfill...");
        await upsertLogsToNas(mysqlConn, allUneditedDeviceLogs);
        nasCounts = await queryNasCounts(mysqlConn);
      }

      if (nasUpserted > 0) {
        store.lastMysqlSyncedAt = new Date().toISOString();
        saveStore(store);
      }
    } catch (err) {
      log(`⚠️ NAS MariaDB unreachable during reclassify: ${err.message}`);
    }

    // 2. Update Supabase Cloud in 500-row batches + insert telemetry
    if (supabase) {
      const countSupaMode = async (mode) => {
        let q = supabase
          .from("attendance_logs")
          .select("*", { count: "exact", head: true })
          .eq("is_deleted", false);
        if (mode !== null) q = q.eq("io_mode", mode);
        const { count, error } = await q;
        if (error) throw new Error(`Supabase count error: ${error.message}`);
        return Number(count || 0);
      };
      const querySupaCounts = async () => {
        const [m1, m2, m3, m4, mTotal] = await Promise.all([
          countSupaMode(1),
          countSupaMode(2),
          countSupaMode(3),
          countSupaMode(4),
          countSupaMode(null),
        ]);
        return { 1: m1, 2: m2, 3: m3, 4: m4, total: mTotal };
      };
      const upsertLogsToSupa = async (rowsToSend) => {
        for (let i = 0; i < rowsToSend.length; i += 500) {
          const slice = rowsToSend.slice(i, i + 500).map(mapLogToSupabase);
          const { error } = await supabase
            .from("attendance_logs")
            .upsert(slice, { onConflict: "record_uid" });
          if (error) throw new Error(`Supabase upsert error: ${error.message}`);
          supaUpserted += slice.length;
        }
      };

      const supaBefore = await querySupaCounts();
      let supaTargetLogs = FORCE_ALL ? allUneditedDeviceLogs : changedLogs;
      if (!FORCE_ALL && changedLogs.length === 0 && !modeCountsMatch(supaBefore, localCounts)) {
        supaTargetLogs = allUneditedDeviceLogs;
      }
      await upsertLogsToSupa(supaTargetLogs);
      supaCounts = await querySupaCounts();

      if (!FORCE_ALL && supaTargetLogs === changedLogs && !modeCountsMatch(supaCounts, localCounts)) {
        log("🔄 Supabase counts still differ from local store; performing full unedited backfill...");
        await upsertLogsToSupa(allUneditedDeviceLogs);
        supaCounts = await querySupaCounts();
      }

      const deviceOverview = store.deviceOverview || {};
      const { error: telErr } = await supabase.from("audit_logs").insert({
        actor_id: "hip_cmi681s_sync",
        actor_name: "ระบบจำแนกเวลาปฏิบัติราชการอัตโนมัติ (LAN CLI)",
        action: "จำแนกประเภทย้อนหลังตามระเบียบเวลาราชการ (08:30-16:30 น.)",
        target: `อัปเดต ${changedLogs.length.toLocaleString()} รายการ (รวม ${localCounts.total.toLocaleString()} รายการ • ${availableMonths.length} เดือน)`,
        status: "success",
        metadata: {
          type: "attendance_device_sync",
          lastSyncedAt: store.lastSyncedAt || new Date().toISOString(),
          lastMysqlSyncedAt: store.lastMysqlSyncedAt,
          deviceTotalRecords: store.deviceTotalRecords || localCounts.total,
          registeredUsersCount: deviceOverview.registeredUsersCount,
          fingerprintsCount: deviceOverview.fingerprintsCount,
          passwordsCount: deviceOverview.passwordsCount,
          idCardsCount: deviceOverview.idCardsCount,
          maxAttendanceLogs: deviceOverview.maxAttendanceLogs,
          serialNumber: deviceOverview.serialNumber,
          productCode: deviceOverview.productCode,
          deviceTime: deviceOverview.deviceTime,
          scannerIp: cfg.scannerIp,
          addedCount: 0,
          reclassifiedCount: changedLogs.length,
          availableMonths,
          source: "cli_reclassify",
        },
      });
      if (telErr) {
        throw new Error(`Supabase telemetry insert error: ${telErr.message}`);
      }
      telemetryInserted = true;
    }

    const elapsed = Date.now() - t0;
    const result = {
      mode: "reclassify",
      success: true,
      elapsedMs: elapsed,
      reclassifiedCount: changedLogs.length,
      localCounts,
      nasUpserted,
      nasCounts,
      supabaseUpserted: supaUpserted,
      supabaseCounts: supaCounts,
      availableMonths,
      telemetryInserted,
    };
    appendSyncLog(
      `[RECLASSIFY] changed=${changedLogs.length} local=${localCounts[1]}/${localCounts[2]}/${localCounts[3]}/${localCounts[4]} (${localCounts.total}) nas=${nasCounts ? `${nasCounts[1]}/${nasCounts[2]}/${nasCounts[3]}/${nasCounts[4]} (${nasCounts.total})` : "N/A"} supa=${supaCounts ? `${supaCounts[1]}/${supaCounts[2]}/${supaCounts[3]}/${supaCounts[4]} (${supaCounts.total})` : "N/A"} months=${availableMonths.length} elapsed=${elapsed}ms`
    );
    console.log(JSON.stringify(result, null, 2));
    return result;
  } finally {
    if (mysqlConn) {
      await mysqlConn.end().catch(() => {});
    }
  }
}

async function waitUntilOrAbort(targetTimeMs, isAborted) {
  while (!isAborted()) {
    const remaining = targetTimeMs - Date.now();
    if (remaining <= 0) return true;
    const sleepMs = Math.min(remaining, 30000);
    await new Promise((resolve) => setTimeout(resolve, sleepMs));
  }
  return false;
}

async function main() {
  if (RECLASSIFY) {
    await runReclassifyOnce();
    return;
  }
  if (!DAEMON_SCHEDULE) {
    await runSyncOnce();
    return;
  }

  const scheduleTimes = parseScheduleTimes(REQUESTED_TIMES_RAW);
  let aborted = false;
  const onSignal = () => {
    aborted = true;
    log("\n🛑 กำลังปิดโหมด Auto-Sync (--schedule)...");
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  const slotsText = scheduleTimes.map((s) => `${s.label} น.`).join(" และ ");
  console.log(`⏰ Smart MSO Attendance Auto-Sync Scheduler พร้อมทำงานทุกวันเวลา ${slotsText}`);
  appendSyncLog(`[SCHEDULER_START] times=${scheduleTimes.map((s) => s.label).join(",")}`);

  if (RUN_NOW) {
    try {
      await runSyncOnce();
    } catch (err) {
      const msg = err?.message || String(err);
      appendSyncLog(`[ERR] immediate run failed: ${msg}`);
      console.error("❌ Initial sync failed:", err);
    }
  }

  while (!aborted) {
    const nextRun = getNextScheduledRun(scheduleTimes);
    const nextThai = formatIsoToThaiTimestamp(nextRun.target.toISOString());
    console.log(`⏳ รอรอบดึงข้อมูลถัดไป: ${nextThai} น. (รอบ ${nextRun.label} น.)`);
    const ready = await waitUntilOrAbort(nextRun.target.getTime(), () => aborted);
    if (!ready || aborted) break;

    try {
      await runSyncOnce();
    } catch (err) {
      const msg = err?.message || String(err);
      appendSyncLog(`[ERR] scheduled(${nextRun.label}) failed: ${msg}`);
      console.error(`❌ Scheduled sync (${nextRun.label}) failed:`, err);
    }
  }
}

main().catch((err) => {
  appendSyncLog(`[ERR] fatal: ${err?.message || String(err)}`);
  console.error("❌ Attendance sync failed:", err);
  process.exit(1);
});

