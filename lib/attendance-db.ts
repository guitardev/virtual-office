/**
 * Attendance Database Engine (Synology NAS MariaDB/MySQL + Local Persistent Cache)
 * --------------------------------------------------------------------------------
 * รองรับการซิงก์ข้อมูลจากเครื่องสแกนลายนิ้วมือ HIP CMi681S (192.168.162.15:5005)
 * มาจัดเก็บไว้ใน MariaDB / MySQL Server บน Synology NAS (ค่าเริ่มต้น 192.168.162.23:3306)
 * พร้อมระบบ Local Persistent Store (data/attendance-store.json) เพื่อให้ใช้งานได้ต่อเนื่อง
 * และสามารถ Push ข้อมูลทั้งหมดขึ้น MySQL บน Synology NAS ได้ทันทีที่ตั้งค่าสิทธิ์เสร็จ
 */

import fs from "node:fs";
import path from "node:path";
import mysql from "mysql2/promise";
import { HipAttendanceRecord } from "./hip-cmi681s";

export interface NasMysqlConfig {
  connectionMode?: "direct_tcp" | "cloudflare_bridge";
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
  cloudflareBridgeUrl?: string;
  cloudflareBridgeSecret?: string;
  scannerIp: string;
  scannerPort: number;
  scannerPassword?: number;
}

export interface AttendanceLogItem {
  id: string;
  recordUid: string; // unique key: e.g. "dev_1_18_2026-11-06 08:33:00" or "manual_..."
  scannerUserId: number;
  memberId: string;
  memberName: string;
  division: string;
  position: string;
  scanTimestamp: string; // "YYYY-MM-DD HH:mm:ss"
  originalTimestamp: string;
  ioMode: number; // 1 = เข้างาน, 2 = ออกงาน
  ioLabel: string;
  verifyMode: number; // 1 = ลายนิ้วมือ, 2 = รหัสผ่าน, 3 = บัตร, 9 = บันทึกโดยผู้ดูแล
  verifyLabel: string;
  machineId: number;
  source: "device" | "manual";
  isEdited: boolean;
  editedBy?: string;
  editedAt?: string;
  editNote?: string;
  isDeleted?: boolean;
}

export interface ScannerUserMapping {
  scannerUserId: number;
  memberId: string;
  memberName: string;
  division: string;
  position: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface AuthorizedAttendanceEditor {
  memberId: string;
  memberName: string;
  division: string;
  role: string;
  grantedBy: string;
  grantedAt: string;
}

export interface AttendanceStoreData {
  mysqlConfig: NasMysqlConfig;
  lastSyncedAt: string | null;
  lastMysqlSyncedAt: string | null;
  deviceTotalRecords: number;
  mappings: Record<number, ScannerUserMapping>;
  authorizedEditors: AuthorizedAttendanceEditor[];
  editorsCustomized?: boolean;
  logs: AttendanceLogItem[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "attendance-store.json");

export function getEnvMysqlDefaults(): NasMysqlConfig {
  return {
    connectionMode:
      (process.env.NAS_MYSQL_MODE as "direct_tcp" | "cloudflare_bridge") ||
      "direct_tcp",
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

export const DEFAULT_NAS_MYSQL_CONFIG: NasMysqlConfig = getEnvMysqlDefaults();

export function buildDefaultMappings(): Record<number, ScannerUserMapping> {
  const map: Record<number, ScannerUserMapping> = {};
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

export function buildDefaultEditors(): AuthorizedAttendanceEditor[] {
  // ค่าเริ่มต้น: ให้หัวหน้าฝ่ายบริหารทั่วไป (syno_เสกพล) และเจ้าหน้าที่กลุ่มนโยบายและวิชาการ (syno_ขวัญนภา) มีสิทธิ์แก้ไขเวลาได้นอกเหนือจาก Admin
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

export function loadAttendanceStore(): AttendanceStoreData {
  const envDefaults = getEnvMysqlDefaults();
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf8");
      const parsed = JSON.parse(raw) as Partial<AttendanceStoreData>;
      const parsedCfg = parsed.mysqlConfig || ({} as Partial<NasMysqlConfig>);

      const resolvedConfig: NasMysqlConfig = {
        connectionMode: process.env.NAS_MYSQL_MODE
          ? (process.env.NAS_MYSQL_MODE as "direct_tcp" | "cloudflare_bridge")
          : parsedCfg.connectionMode || envDefaults.connectionMode,
        host: process.env.NAS_MYSQL_HOST || parsedCfg.host || envDefaults.host,
        port: process.env.NAS_MYSQL_PORT
          ? Number(process.env.NAS_MYSQL_PORT)
          : Number(parsedCfg.port || envDefaults.port),
        user: process.env.NAS_MYSQL_USER || parsedCfg.user || envDefaults.user,
        password:
          envDefaults.password ||
          (parsedCfg.password && parsedCfg.password !== "••••••••"
            ? parsedCfg.password
            : ""),
        database:
          process.env.NAS_MYSQL_DATABASE ||
          parsedCfg.database ||
          envDefaults.database,
        cloudflareBridgeUrl:
          process.env.NAS_MYSQL_BRIDGE_URL ||
          parsedCfg.cloudflareBridgeUrl ||
          envDefaults.cloudflareBridgeUrl,
        cloudflareBridgeSecret:
          envDefaults.cloudflareBridgeSecret ||
          (parsedCfg.cloudflareBridgeSecret &&
          parsedCfg.cloudflareBridgeSecret !== "••••••••"
            ? parsedCfg.cloudflareBridgeSecret
            : ""),
        scannerIp:
          process.env.HIP_SCANNER_IP ||
          parsedCfg.scannerIp ||
          envDefaults.scannerIp,
        scannerPort: process.env.HIP_SCANNER_PORT
          ? Number(process.env.HIP_SCANNER_PORT)
          : Number(parsedCfg.scannerPort || envDefaults.scannerPort),
        scannerPassword: process.env.HIP_SCANNER_PASSWORD
          ? Number(process.env.HIP_SCANNER_PASSWORD)
          : Number(parsedCfg.scannerPassword || envDefaults.scannerPassword || 1234),
      };

      const hasCustomEditors = Boolean(parsed.editorsCustomized);
      const parsedEditors = Array.isArray(parsed.authorizedEditors)
        ? parsed.authorizedEditors
        : [];
      const authorizedEditors =
        parsedEditors.length > 0 || hasCustomEditors
          ? parsedEditors
          : buildDefaultEditors();

      return {
        mysqlConfig: resolvedConfig,
        lastSyncedAt: parsed.lastSyncedAt || null,
        lastMysqlSyncedAt: parsed.lastMysqlSyncedAt || null,
        deviceTotalRecords: parsed.deviceTotalRecords || 0,
        mappings: { ...buildDefaultMappings(), ...(parsed.mappings || {}) },
        authorizedEditors,
        editorsCustomized: hasCustomEditors,
        logs: Array.isArray(parsed.logs) ? parsed.logs : [],
      };
    }
  } catch (err) {
    console.error("Failed to read attendance-store.json:", err);
  }

  return {
    mysqlConfig: { ...envDefaults },
    lastSyncedAt: null,
    lastMysqlSyncedAt: null,
    deviceTotalRecords: 0,
    mappings: buildDefaultMappings(),
    authorizedEditors: buildDefaultEditors(),
    editorsCustomized: false,
    logs: [],
  };
}

export function saveAttendanceStore(store: AttendanceStoreData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const sanitizedStore: AttendanceStoreData = {
      ...store,
      mysqlConfig: {
        ...store.mysqlConfig,
        // ไม่บันทึกรหัสผ่าน Plaintext ลง JSON เมื่อกำหนดผ่าน Environment Variables แล้ว
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
      sanitizedStore.logs.length > 500
        ? JSON.stringify(sanitizedStore)
        : JSON.stringify(sanitizedStore, null, 2);
    fs.writeFileSync(STORE_PATH, serialized, "utf8");
  } catch (err) {
    // กรณีทำงานบน Read-Only Serverless (เช่น Vercel) ให้ข้ามการเขียนไฟล์ Local โดยไม่ให้ API Crash
    console.warn("Skip saving local attendance-store.json:", (err as Error)?.message || err);
  }
}

/**
 * สร้างคำสั่ง SQL สำหรับตั้งค่าบน Synology NAS MariaDB 10 (ผ่าน phpMyAdmin หรือ SSH)
 * ไม่ฝังรหัสผ่านจริงใน Payload ที่ส่งผ่าน API เพื่อความปลอดภัย
 */
export function getSynologyMysqlSetupSql(config: NasMysqlConfig, clientIp = "192.168.162.%"): string {
  const db = config.database || "smart_mso_attendance";
  const user = config.user || "smartmso";
  const pass = "YOUR_STRONG_PASSWORD";

  return `-- 1. สร้างฐานข้อมูลสำหรับเก็บข้อมูลเวลาปฏิบัติราชการ Smart MSO
CREATE DATABASE IF NOT EXISTS \`${db}\`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 2. สร้างบัญชีผู้ใช้ MySQL และอนุญาตให้เชื่อมต่อจากวงแลน (${clientIp}) หรือทุกเครื่อง (%)
CREATE USER IF NOT EXISTS '${user}'@'%' IDENTIFIED BY '${pass}';
CREATE USER IF NOT EXISTS '${user}'@'${clientIp}' IDENTIFIED BY '${pass}';

GRANT ALL PRIVILEGES ON \`${db}\`.* TO '${user}'@'%';
GRANT ALL PRIVILEGES ON \`${db}\`.* TO '${user}'@'${clientIp}';
FLUSH PRIVILEGES;

USE \`${db}\`;

-- 3. ตารางประวัติการลงเวลาปฏิบัติราชการ (รองรับทั้งข้อมูลซิงก์จากเครื่องสแกน และการแก้ไข/เพิ่มโดยแอดมิน)
CREATE TABLE IF NOT EXISTS attendance_logs (
  id VARCHAR(64) PRIMARY KEY,
  record_uid VARCHAR(128) NOT NULL UNIQUE,
  scanner_user_id INT NOT NULL,
  member_id VARCHAR(64) NOT NULL,
  member_name VARCHAR(255) NOT NULL,
  division VARCHAR(255) DEFAULT '',
  position VARCHAR(255) DEFAULT '',
  scan_timestamp DATETIME NOT NULL,
  original_timestamp DATETIME NOT NULL,
  io_mode TINYINT NOT NULL DEFAULT 1,
  io_label VARCHAR(64) NOT NULL,
  verify_mode TINYINT NOT NULL DEFAULT 1,
  verify_label VARCHAR(64) NOT NULL,
  machine_id INT NOT NULL DEFAULT 1,
  source ENUM('device', 'manual') NOT NULL DEFAULT 'device',
  is_edited TINYINT(1) NOT NULL DEFAULT 0,
  edited_by VARCHAR(255) DEFAULT NULL,
  edited_at DATETIME DEFAULT NULL,
  edit_note TEXT DEFAULT NULL,
  is_deleted TINYINT(1) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_scan_timestamp (scan_timestamp),
  INDEX idx_scanner_user (scanner_user_id),
  INDEX idx_member_id (member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. ตารางจับคู่รหัสเครื่องสแกนลายนิ้วมือ (User ID) กับบุคลากรในระบบ Smart MSO
CREATE TABLE IF NOT EXISTS attendance_user_mappings (
  scanner_user_id INT PRIMARY KEY,
  member_id VARCHAR(64) NOT NULL,
  member_name VARCHAR(255) NOT NULL,
  division VARCHAR(255) DEFAULT '',
  position VARCHAR(255) DEFAULT '',
  updated_by VARCHAR(255) DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. ตารางกำหนดสิทธิ์ผู้ใช้งานที่สามารถ เพิ่ม/แก้ไข/ลบ เวลาปฏิบัติราชการได้
CREATE TABLE IF NOT EXISTS attendance_authorized_editors (
  member_id VARCHAR(64) PRIMARY KEY,
  member_name VARCHAR(255) NOT NULL,
  division VARCHAR(255) DEFAULT '',
  role VARCHAR(64) DEFAULT 'member',
  granted_by VARCHAR(255) DEFAULT NULL,
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;
}

function isCloudPrivateLanBlocked(cfg: NasMysqlConfig): boolean {
  if (cfg.connectionMode === "cloudflare_bridge") return false;
  const isPrivateIp = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.|127\.)/.test(
    cfg.host || ""
  );
  return process.env.VERCEL === "1" && isPrivateIp;
}

/**
 * ทดสอบการเชื่อมต่อและสร้างตารางอัตโนมัติบน Synology NAS MariaDB
 */
export async function testAndInitSynologyMysql(
  customConfig?: Partial<NasMysqlConfig>
): Promise<{
  connected: boolean;
  host: string;
  port: number;
  database: string;
  user: string;
  mysqlVersion?: string;
  rowCount?: number;
  errorCode?: string;
  errorMessage?: string;
  setupAdvice?: string;
}> {
  const store = loadAttendanceStore();
  const safeCustom = customConfig
    ? {
        ...customConfig,
        password:
          customConfig.password && customConfig.password !== "••••••••"
            ? customConfig.password
            : store.mysqlConfig.password,
        cloudflareBridgeSecret:
          customConfig.cloudflareBridgeSecret &&
          customConfig.cloudflareBridgeSecret !== "••••••••"
            ? customConfig.cloudflareBridgeSecret
            : store.mysqlConfig.cloudflareBridgeSecret,
      }
    : {};
  const cfg: NasMysqlConfig = { ...store.mysqlConfig, ...safeCustom };

  // กรณีเลือกโหมดเชื่อมต่อผ่านอินเทอร์เน็ตด้วย Cloudflare HTTPS Bridge (ผ่านพอร์ต 443 -> NAS Web Station -> 127.0.0.1:3308)
  if (cfg.connectionMode === "cloudflare_bridge" && cfg.cloudflareBridgeUrl) {
    try {
      const res = await fetch(cfg.cloudflareBridgeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Bridge-Secret": cfg.cloudflareBridgeSecret || process.env.NAS_MYSQL_BRIDGE_SECRET || "",
        },
        body: JSON.stringify({
          action: "init_and_status",
          dbConfig: {
            host: "127.0.0.1",
            port: cfg.port || 3308,
            user: cfg.user,
            password: cfg.password,
            database: cfg.database,
          },
        }),
      });
      if (!res.ok) {
        return {
          connected: false,
          host: cfg.cloudflareBridgeUrl,
          port: cfg.port || 3308,
          database: cfg.database,
          user: cfg.user,
          errorCode: `HTTP_${res.status}`,
          errorMessage: `Cloudflare Bridge ตอบกลับสถานะ HTTP ${res.status}`,
          setupAdvice:
            "กรุณานำไฟล์ attendance-bridge.php ไปวางในโฟลเดอร์ /web ของ Synology NAS (Web Station) แล้วชี้ Cloudflare Tunnel ไปที่ Web Station",
        };
      }
      const data = await res.json();
      if (data.connected) {
        return {
          connected: true,
          host: cfg.cloudflareBridgeUrl,
          port: cfg.port || 3308,
          database: cfg.database,
          user: cfg.user,
          mysqlVersion: `${data.mysqlVersion || "MariaDB 10"} (via Cloudflare HTTPS)`,
          rowCount: Number(data.rowCount || 0),
        };
      }
      return {
        connected: false,
        host: cfg.cloudflareBridgeUrl,
        port: cfg.port || 3308,
        database: cfg.database,
        user: cfg.user,
        errorCode: "BRIDGE_DB_ERR",
        errorMessage: data.error || "ไม่สามารถเชื่อมต่อ MariaDB 127.0.0.1:3308 ผ่าน Bridge ได้",
        setupAdvice:
          "ตรวจสอบรหัสผ่าน MariaDB และตรวจสอบว่าเปิดส่วนขยาย mysqli / pdo_mysql ใน Synology Web Station แล้ว",
      };
    } catch (err: unknown) {
      const e = err as { message?: string };
      return {
        connected: false,
        host: cfg.cloudflareBridgeUrl,
        port: cfg.port || 3308,
        database: cfg.database,
        user: cfg.user,
        errorCode: "BRIDGE_UNREACHABLE",
        errorMessage: e.message || "ไม่สามารถติดต่อ URL ของ Cloudflare Bridge ได้",
        setupAdvice:
          "กรุณาตรวจสอบ URL ของ Cloudflare Tunnel และวางไฟล์ attendance-bridge.php ในโฟลเดอร์ /web บน Synology NAS",
      };
    }
  }

  // กรณีรันบน Vercel Cloud แล้วตั้งค่าโหมด Direct TCP เป็น Private LAN IP จะไม่สามารถเชื่อมตรงได้ (ไม่ต้องรอ Timeout)
  if (isCloudPrivateLanBlocked(cfg)) {
    return {
      connected: false,
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      user: cfg.user,
      errorCode: "CLOUD_LAN_UNREACHABLE",
      errorMessage: `ขณะนี้ใช้งานผ่าน Cloud Server (Vercel) จึงไม่สามารถเข้าถึง IP วงแลนภายใน (${cfg.host}:${cfg.port}) โดยตรงได้`,
      setupAdvice:
        "กำลังแสดงผลข้อมูลจาก Cloud Replica (Supabase) — หากต้องการซิงก์เข้า MariaDB บน NAS จากภายนอก กรุณาเปลี่ยนเป็นโหมด Cloudflare Tunnel Bridge",
    };
  }

  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      connectTimeout: 2500,
      multipleStatements: true,
    });

    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${cfg.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await conn.changeUser({ database: cfg.database });

    await conn.query(`
      CREATE TABLE IF NOT EXISTS attendance_logs (
        id VARCHAR(64) PRIMARY KEY,
        record_uid VARCHAR(128) NOT NULL UNIQUE,
        scanner_user_id INT NOT NULL,
        member_id VARCHAR(64) NOT NULL,
        member_name VARCHAR(255) NOT NULL,
        division VARCHAR(255) DEFAULT '',
        position VARCHAR(255) DEFAULT '',
        scan_timestamp DATETIME NOT NULL,
        original_timestamp DATETIME NOT NULL,
        io_mode TINYINT NOT NULL DEFAULT 1,
        io_label VARCHAR(64) NOT NULL,
        verify_mode TINYINT NOT NULL DEFAULT 1,
        verify_label VARCHAR(64) NOT NULL,
        machine_id INT NOT NULL DEFAULT 1,
        source ENUM('device', 'manual') NOT NULL DEFAULT 'device',
        is_edited TINYINT(1) NOT NULL DEFAULT 0,
        edited_by VARCHAR(255) DEFAULT NULL,
        edited_at DATETIME DEFAULT NULL,
        edit_note TEXT DEFAULT NULL,
        is_deleted TINYINT(1) NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_scan_timestamp (scan_timestamp),
        INDEX idx_scanner_user (scanner_user_id),
        INDEX idx_member_id (member_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS attendance_user_mappings (
        scanner_user_id INT PRIMARY KEY,
        member_id VARCHAR(64) NOT NULL,
        member_name VARCHAR(255) NOT NULL,
        division VARCHAR(255) DEFAULT '',
        position VARCHAR(255) DEFAULT '',
        updated_by VARCHAR(255) DEFAULT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      CREATE TABLE IF NOT EXISTS attendance_authorized_editors (
        member_id VARCHAR(64) PRIMARY KEY,
        member_name VARCHAR(255) NOT NULL,
        division VARCHAR(255) DEFAULT '',
        role VARCHAR(64) DEFAULT 'member',
        granted_by VARCHAR(255) DEFAULT NULL,
        granted_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const [verRows] = await conn.query<mysql.RowDataPacket[]>("SELECT VERSION() AS version");
    const [cntRows] = await conn.query<mysql.RowDataPacket[]>(
      "SELECT COUNT(*) AS cnt FROM attendance_logs WHERE is_deleted = 0"
    );

    const mysqlVersion = verRows?.[0]?.version || "MariaDB 10 (Synology)";
    const rowCount = Number(cntRows?.[0]?.cnt || 0);

    await conn.end();
    return {
      connected: true,
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      user: cfg.user,
      mysqlVersion,
      rowCount,
    };
  } catch (err: unknown) {
    if (conn) {
      try {
        await conn.end();
      } catch {
        // ignore
      }
    }
    const e = err as { code?: string; errno?: number; message?: string };
    const code = e.code || (e.errno === 1130 ? "ER_HOST_NOT_PRIVILEGED" : "MYSQL_ERR");
    const msg = e.message || "ไม่สามารถเชื่อมต่อ MySQL บน Synology NAS ได้";

    let setupAdvice =
      `กรุณาตรวจสอบว่าเปิดใช้งานแพ็กเกจ MariaDB 10 บน Synology DSM และติ๊กถูก 'Enable TCP/IP connection' ที่พอร์ต ${cfg.port} แล้ว`;
    if (msg.includes("is not allowed to connect") || e.errno === 1130) {
      setupAdvice =
        `ตรวจพบ MariaDB 10 บน Synology NAS ที่พอร์ต ${cfg.port} เปิดอยู่แล้ว! แต่ยังไม่ได้อนุญาตให้ IP ภายนอกเชื่อมต่อเข้ามา กรุณารันคำสั่ง SQL ด้านล่างใน phpMyAdmin หรือ SSH บน Synology NAS เพื่อเปิดสิทธิ์`;
    } else if (e.code === "ER_ACCESS_DENIED_ERROR") {
      setupAdvice =
        "เชื่อมต่อ MariaDB สำเร็จ แต่ชื่อผู้ใช้ (User) หรือรหัสผ่าน (Password) ยังไม่ตรงกับที่ตั้งไว้ใน MariaDB บน Synology NAS";
    }

    return {
      connected: false,
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      user: cfg.user,
      errorCode: code,
      errorMessage: msg,
      setupAdvice,
    };
  }
}

/**
 * ซิงก์ข้อมูลจาก Store ปัจจุบันขึ้นตาราง MySQL บน Synology NAS (Batch Upsert)
 */
export async function pushStoreToSynologyMysql(store: AttendanceStoreData): Promise<{
  synced: boolean;
  upsertedLogs: number;
  error?: string;
}> {
  const cfg = store.mysqlConfig;

  // กรณีเลือกโหมดเชื่อมต่อผ่านอินเทอร์เน็ตด้วย Cloudflare HTTPS Bridge
  if (cfg.connectionMode === "cloudflare_bridge" && cfg.cloudflareBridgeUrl) {
    try {
      const res = await fetch(cfg.cloudflareBridgeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Bridge-Secret": cfg.cloudflareBridgeSecret || process.env.NAS_MYSQL_BRIDGE_SECRET || "",
        },
        body: JSON.stringify({
          action: "sync_store",
          dbConfig: {
            host: "127.0.0.1",
            port: cfg.port || 3308,
            user: cfg.user,
            password: cfg.password,
            database: cfg.database,
          },
          mappings: Object.values(store.mappings),
          authorizedEditors: store.authorizedEditors,
          logs: store.logs.slice(0, 1500),
        }),
      });
      const data = await res.json();
      if (data.synced) {
        store.lastMysqlSyncedAt = new Date().toISOString();
        saveAttendanceStore(store);
        return { synced: true, upsertedLogs: Number(data.upsertedLogs || 0) };
      }
      return { synced: false, upsertedLogs: 0, error: data.error || "Cloudflare Bridge Sync Failed" };
    } catch (err: unknown) {
      const e = err as { message?: string };
      return { synced: false, upsertedLogs: 0, error: e.message || "Cloudflare Bridge Unreachable" };
    }
  }

  let conn: mysql.Connection | null = null;
  try {
    const check = await testAndInitSynologyMysql(cfg);
    if (!check.connected) {
      return { synced: false, upsertedLogs: 0, error: check.errorMessage };
    }

    conn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      connectTimeout: 5000,
    });

    // 1. Upsert User Mappings
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
      await conn.query(
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

    // 2. Sync Authorized Editors inside transaction
    await conn.beginTransaction();
    try {
      await conn.query("DELETE FROM attendance_authorized_editors");
      if (store.authorizedEditors.length > 0) {
        const editorValues = store.authorizedEditors.map((ed) => [
          ed.memberId,
          ed.memberName,
          ed.division || "",
          ed.role || "member",
          ed.grantedBy || "admin",
          ed.grantedAt ? ed.grantedAt.slice(0, 19).replace("T", " ") : new Date(),
        ]);
        await conn.query(
          `INSERT INTO attendance_authorized_editors
            (member_id, member_name, division, role, granted_by, granted_at)
           VALUES ?`,
          [editorValues]
        );
      }
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    }

    // 3. Batch Upsert Attendance Logs in chunks of 500
    const batchSize = 500;
    let totalUpserted = 0;
    for (let i = 0; i < store.logs.length; i += batchSize) {
      const slice = store.logs.slice(i, i + batchSize);
      const values = slice.map((l) => [
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
      ]);

      await conn.query(
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
      totalUpserted += slice.length;
    }

    await conn.end();
    store.lastMysqlSyncedAt = new Date().toISOString();
    saveAttendanceStore(store);

    return { synced: true, upsertedLogs: totalUpserted };
  } catch (err: unknown) {
    if (conn) {
      try {
        await conn.end();
      } catch {
        // ignore
      }
    }
    const e = err as { message?: string };
    return { synced: false, upsertedLogs: 0, error: e.message || "MySQL Sync Error" };
  }
}

/**
 * บันทึกหรืออัปเดตรายการเดียวลงในตาราง attendance_logs บน Synology NAS MariaDB (3308) ทันที (< 15ms)
 */
export async function upsertSingleLogToSynologyMysql(
  cfg: NasMysqlConfig,
  item: AttendanceLogItem
): Promise<{ synced: boolean; error?: string }> {
  // กรณีเลือกโหมด Cloudflare HTTPS Bridge
  if (cfg.connectionMode === "cloudflare_bridge" && cfg.cloudflareBridgeUrl) {
    try {
      const res = await fetch(cfg.cloudflareBridgeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Bridge-Secret": cfg.cloudflareBridgeSecret || process.env.NAS_MYSQL_BRIDGE_SECRET || "",
        },
        body: JSON.stringify({
          action: "sync_store",
          dbConfig: {
            host: "127.0.0.1",
            port: cfg.port || 3308,
            user: cfg.user,
            password: cfg.password,
            database: cfg.database,
          },
          mappings: [],
          logs: [item],
        }),
      });
      const data = await res.json();
      if (data.synced) {
        return { synced: true };
      }
      return { synced: false, error: data.error || "Cloudflare Bridge Single Upsert Failed" };
    } catch (err: unknown) {
      const e = err as { message?: string };
      return { synced: false, error: e.message || "Cloudflare Bridge Unreachable" };
    }
  }

  if (isCloudPrivateLanBlocked(cfg)) {
    return { synced: false, error: "CLOUD_LAN_UNREACHABLE" };
  }

  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port || 3308,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      connectTimeout: 2500,
    });

    const editedAt = item.editedAt
      ? item.editedAt.slice(0, 19).replace("T", " ")
      : null;

    await conn.query(
      `INSERT INTO attendance_logs (
        id, record_uid, scanner_user_id, member_id, member_name, division, position,
        scan_timestamp, original_timestamp, io_mode, io_label, verify_mode, verify_label,
        machine_id, source, is_edited, edited_by, edited_at, edit_note, is_deleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      [
        item.id,
        item.recordUid,
        item.scannerUserId,
        item.memberId,
        item.memberName,
        item.division || "",
        item.position || "",
        item.scanTimestamp,
        item.originalTimestamp,
        item.ioMode,
        item.ioLabel,
        item.verifyMode,
        item.verifyLabel,
        item.machineId,
        item.source,
        item.isEdited ? 1 : 0,
        item.editedBy || null,
        editedAt,
        item.editNote || null,
        item.isDeleted ? 1 : 0,
      ]
    );

    await conn.end();
    return { synced: true };
  } catch (err: unknown) {
    if (conn) {
      try {
        await conn.end();
      } catch {
        // ignore
      }
    }
    const e = err as { message?: string };
    return { synced: false, error: e.message };
  }
}

/**
 * อัปเดตการจับคู่ User ID + ชื่อบุคลากรในประวัติลงเวลาบน Synology NAS MariaDB ทันที (< 25ms)
 */
export async function syncMappingToSynologyMysql(
  cfg: NasMysqlConfig,
  mapping: ScannerUserMapping
): Promise<{ synced: boolean; error?: string }> {
  if (cfg.connectionMode === "cloudflare_bridge" && cfg.cloudflareBridgeUrl) {
    try {
      const res = await fetch(cfg.cloudflareBridgeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Bridge-Secret": cfg.cloudflareBridgeSecret || process.env.NAS_MYSQL_BRIDGE_SECRET || "",
        },
        body: JSON.stringify({
          action: "sync_store",
          dbConfig: {
            host: "127.0.0.1",
            port: cfg.port || 3308,
            user: cfg.user,
            password: cfg.password,
            database: cfg.database,
          },
          mappings: [mapping],
          logs: [],
        }),
      });
      const data = await res.json();
      return data.synced ? { synced: true } : { synced: false, error: data.error };
    } catch (err: unknown) {
      const e = err as { message?: string };
      return { synced: false, error: e.message };
    }
  }

  if (isCloudPrivateLanBlocked(cfg)) {
    return { synced: false, error: "CLOUD_LAN_UNREACHABLE" };
  }

  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port || 3308,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      connectTimeout: 2500,
    });

    await conn.query(
      `INSERT INTO attendance_user_mappings
        (scanner_user_id, member_id, member_name, division, position, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        member_id = VALUES(member_id),
        member_name = VALUES(member_name),
        division = VALUES(division),
        position = VALUES(position),
        updated_by = VALUES(updated_by)`,
      [
        mapping.scannerUserId,
        mapping.memberId,
        mapping.memberName,
        mapping.division || "",
        mapping.position || "",
        mapping.updatedBy || "system",
      ]
    );

    await conn.query(
      `UPDATE attendance_logs
       SET member_id = ?, member_name = ?, division = ?, position = ?
       WHERE scanner_user_id = ?`,
      [
        mapping.memberId,
        mapping.memberName,
        mapping.division || "",
        mapping.position || "",
        mapping.scannerUserId,
      ]
    );

    await conn.end();
    return { synced: true };
  } catch (err: unknown) {
    if (conn) {
      try {
        await conn.end();
      } catch {}
    }
    const e = err as { message?: string };
    return { synced: false, error: e.message };
  }
}

/**
 * อัปเดตรายชื่อผู้ได้รับสิทธิ์จัดการเวลาบน Synology NAS MariaDB ทันที (< 25ms)
 */
export async function syncEditorsToSynologyMysql(
  cfg: NasMysqlConfig,
  editors: AuthorizedAttendanceEditor[]
): Promise<{ synced: boolean; error?: string }> {
  if (cfg.connectionMode === "cloudflare_bridge" && cfg.cloudflareBridgeUrl) {
    try {
      const res = await fetch(cfg.cloudflareBridgeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Bridge-Secret": cfg.cloudflareBridgeSecret || process.env.NAS_MYSQL_BRIDGE_SECRET || "",
        },
        body: JSON.stringify({
          action: "sync_store",
          dbConfig: {
            host: "127.0.0.1",
            port: cfg.port || 3308,
            user: cfg.user,
            password: cfg.password,
            database: cfg.database,
          },
          mappings: [],
          authorizedEditors: editors,
          logs: [],
        }),
      });
      const data = await res.json();
      return data.synced ? { synced: true } : { synced: false, error: data.error };
    } catch (err: unknown) {
      const e = err as { message?: string };
      return { synced: false, error: e.message };
    }
  }

  if (isCloudPrivateLanBlocked(cfg)) {
    return { synced: false, error: "CLOUD_LAN_UNREACHABLE" };
  }

  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port || 3308,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
      connectTimeout: 2500,
    });

    await conn.beginTransaction();
    try {
      await conn.query("DELETE FROM attendance_authorized_editors");
      if (editors.length > 0) {
        const editorValues = editors.map((ed) => [
          ed.memberId,
          ed.memberName,
          ed.division || "",
          ed.role || "member",
          ed.grantedBy || "admin",
          ed.grantedAt ? ed.grantedAt.slice(0, 19).replace("T", " ") : new Date(),
        ]);
        await conn.query(
          `INSERT INTO attendance_authorized_editors
            (member_id, member_name, division, role, granted_by, granted_at)
           VALUES ?`,
          [editorValues]
        );
      }
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    }

    await conn.end();
    return { synced: true };
  } catch (err: unknown) {
    if (conn) {
      try {
        await conn.end();
      } catch {}
    }
    const e = err as { message?: string };
    return { synced: false, error: e.message };
  }
}

/**
 * แปลงรายการสแกนจาก HIP CMi681S และผสานเข้ากับ Store (โดยไม่เขียนทับรายการที่ถูกแก้ไขหรือลบแล้ว)
 */
export function mergeDeviceRecordsIntoStore(
  store: AttendanceStoreData,
  deviceRecords: HipAttendanceRecord[],
  deviceTotalCount: number
): { addedCount: number; updatedCount: number; totalStored: number } {
  const existingByUid = new Map<string, AttendanceLogItem>();
  for (const item of store.logs) {
    existingByUid.set(item.recordUid, item);
  }

  let addedCount = 0;
  let updatedCount = 0;

  for (const rec of deviceRecords) {
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
      const newItem: AttendanceLogItem = {
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
      addedCount++;
    } else if (!existing.isEdited && !existing.isDeleted) {
      // อัปเดตเฉพาะชื่อ/สังกัดตาม Mapping ปัจจุบัน โดยไม่ทับรายการที่แอดมินเคยแก้ไขเวลาแล้ว
      if (
        existing.memberName !== mapInfo.memberName ||
        existing.division !== mapInfo.division ||
        existing.memberId !== mapInfo.memberId
      ) {
        existing.memberId = mapInfo.memberId;
        existing.memberName = mapInfo.memberName;
        existing.division = mapInfo.division;
        existing.position = mapInfo.position;
        updatedCount++;
      }
    }
  }

  // เรียงลำดับจากใหม่สุดไปเก่าสุด
  store.logs.sort((a, b) => b.scanTimestamp.localeCompare(a.scanTimestamp));
  store.lastSyncedAt = new Date().toISOString();
  store.deviceTotalRecords = deviceTotalCount;
  saveAttendanceStore(store);

  return {
    addedCount,
    updatedCount,
    totalStored: store.logs.filter((l) => !l.isDeleted).length,
  };
}

