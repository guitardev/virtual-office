/**
 * Synology NAS Integration Engine for OmniOffice / Virtual Office
 * Connects directly to Synology DSM Web API at http://192.168.162.21:5000
 * Handles Authentication (SYNO.API.Auth) and File Station DMS (SYNO.FileStation.*)
 */

export interface SynologyConfig {
  nasUrl: string; // e.g. "http://192.168.162.21:5000"
  serviceAccount: string;
  servicePassword?: string;
  sharedFolder: string; // e.g. "/virtual-office"
  primaryAuthEnabled: boolean;
  storageSyncEnabled: boolean;
  autoProvisionUsers: boolean;
  updatedAt?: string;
}

export interface SynologyAuthResult {
  success: boolean;
  sid?: string;
  account?: string;
  is_admin?: boolean;
  error?: string;
  code?: number;
}

export interface SynologyFileItem {
  path: string;
  name: string;
  isdir: boolean;
  size: number;
  time?: {
    mtime: number;
    crtime: number;
  };
  additional?: {
    size?: number;
    owner?: { user: string; group: string };
    time?: { mtime: number; crtime: number };
    real_path?: string;
  };
}

export interface SynologyHealthStatus {
  online: boolean;
  host: string;
  port: number;
  latencyMs: number;
  dsmVersion?: string;
  supportedApis?: string[];
  error?: string;
}

export const DEFAULT_SYNOLOGY_CONFIG: SynologyConfig = {
  nasUrl: "http://192.168.162.21:5000",
  serviceAccount: "admin",
  sharedFolder: "/virtual-office",
  primaryAuthEnabled: true,
  storageSyncEnabled: true,
  autoProvisionUsers: true,
  updatedAt: new Date().toISOString(),
};

const STORAGE_KEY = "omnioffice_synology_config";

/**
 * Retrieve current Synology configuration (client-side)
 */
export function getClientSynologyConfig(): SynologyConfig {
  if (typeof window === "undefined") {
    return DEFAULT_SYNOLOGY_CONFIG;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_SYNOLOGY_CONFIG, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn("Failed to parse Synology config from localStorage:", err);
  }
  return DEFAULT_SYNOLOGY_CONFIG;
}

/**
 * Save Synology configuration (client-side)
 */
export function saveClientSynologyConfig(config: Partial<SynologyConfig>): SynologyConfig {
  const current = getClientSynologyConfig();
  const updated: SynologyConfig = {
    ...current,
    ...config,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}

/**
 * Health check for Synology NAS Web API
 */
export async function checkNasHealth(nasUrl: string = "http://192.168.162.21:5000"): Promise<SynologyHealthStatus> {
  const startTime = Date.now();
  try {
    // If running in browser, proxy through server API route to bypass CORS
    if (typeof window !== "undefined") {
      const res = await fetch(`/api/nas/health?url=${encodeURIComponent(nasUrl)}`);
      const data = await res.json();
      if (data.success && data.data) {
        return data.data;
      }
      return {
        online: false,
        host: nasUrl,
        port: 5000,
        latencyMs: Date.now() - startTime,
        error: data.error || "Cannot reach Synology NAS",
      };
    }

    // Direct server-side call
    const queryUrl = `${nasUrl.replace(/\/+$/, "")}/webapi/query.cgi?api=SYNO.API.Info&version=1&method=query&query=SYNO.API.Auth,SYNO.FileStation.Info,SYNO.FileStation.List,SYNO.FileStation.Upload`;
    const res = await fetch(queryUrl, {
      method: "GET",
      signal: AbortSignal.timeout(6000),
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      return {
        online: false,
        host: nasUrl,
        port: 5000,
        latencyMs,
        error: `HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const data = await res.json();
    if (data.success && data.data) {
      return {
        online: true,
        host: nasUrl,
        port: 5000,
        latencyMs,
        supportedApis: Object.keys(data.data),
      };
    }

    return {
      online: false,
      host: nasUrl,
      port: 5000,
      latencyMs,
      error: "Unexpected response format from Synology API",
    };
  } catch (err: any) {
    return {
      online: false,
      host: nasUrl,
      port: 5000,
      latencyMs: Date.now() - startTime,
      error: err?.message || "Connection timed out or host unreachable",
    };
  }
}

/**
 * Authenticate user with Synology DSM Web API (SYNO.API.Auth)
 */
export async function loginSynology(
  account: string,
  passwd: string,
  nasUrl: string = "http://192.168.162.21:5000"
): Promise<SynologyAuthResult> {
  try {
    // If running in browser, proxy through server API route
    if (typeof window !== "undefined") {
      const res = await fetch("/api/nas/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: account,
          password: passwd,
          nasUrl,
        }),
      });
      const data = await res.json();
      if (data.success) {
        return {
          success: true,
          sid: data.sid,
          account: data.account || account,
          is_admin: account.toLowerCase() === "admin",
        };
      }
      return {
        success: false,
        code: data.code,
        error: data.error || "การยืนยันตัวตนล้มเหลว",
      };
    }

    const cleanUrl = nasUrl.replace(/\/+$/, "");
    const loginUrl = `${cleanUrl}/webapi/entry.cgi?api=SYNO.API.Auth&version=7&method=login&account=${encodeURIComponent(
      account
    )}&passwd=${encodeURIComponent(passwd)}&session=FileStation&format=sid`;

    const res = await fetch(loginUrl, {
      method: "GET",
      signal: AbortSignal.timeout(8000),
    });

    const data = await res.json();

    if (data.success && data.data?.sid) {
      return {
        success: true,
        sid: data.data.sid,
        account: data.data.account || account,
        is_admin: data.data.is_portal_port || account.toLowerCase() === "admin",
      };
    }

    const errorCode = data.error?.code || 0;
    let errorMessage = "ชื่อผู้ใช้หรือรหัสผ่านบน Synology NAS ไม่ถูกต้อง";
    if (errorCode === 400) errorMessage = "ไม่มีบัญชีผู้ใช้งานนี้ในระบบ Synology NAS";
    if (errorCode === 401) errorMessage = "รหัสผ่านไม่ถูกต้อง หรือบัญชีถูกปิดการใช้งาน";
    if (errorCode === 402) errorMessage = "บัญชีนี้ถูกล็อค กรุณาติดต่อผู้ดูแลระบบ";
    if (errorCode === 403) errorMessage = "จำเป็นต้องยืนยันตัวตนแบบ 2 ขั้นตอน (2FA / OTP)";

    return {
      success: false,
      code: errorCode,
      error: errorMessage,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `ไม่สามารถเชื่อมต่อ Synology NAS: ${err?.message || "การเชื่อมต่อขัดข้อง"}`,
    };
  }
}

/**
 * List files and directories inside a Synology File Station shared folder
 */
export async function listNasFiles(
  sid: string,
  folderPath: string = "/virtual-office",
  nasUrl: string = "http://192.168.162.21:5000"
): Promise<{ success: boolean; files?: SynologyFileItem[]; error?: string }> {
  try {
    // If in browser, proxy through /api/nas/files
    if (typeof window !== "undefined") {
      const res = await fetch(
        `/api/nas/files?sid=${encodeURIComponent(sid)}&folder_path=${encodeURIComponent(
          folderPath
        )}&url=${encodeURIComponent(nasUrl)}`
      );
      const data = await res.json();
      return data;
    }

    const cleanUrl = nasUrl.replace(/\/+$/, "");
    const listUrl = `${cleanUrl}/webapi/entry.cgi?api=SYNO.FileStation.List&version=2&method=list&folder_path=${encodeURIComponent(
      folderPath
    )}&_sid=${encodeURIComponent(sid)}&additional=size,owner,time,real_path`;

    const res = await fetch(listUrl, {
      method: "GET",
      signal: AbortSignal.timeout(8000),
    });

    const data = await res.json();

    if (data.success && data.data?.files) {
      return {
        success: true,
        files: data.data.files,
      };
    }

    return {
      success: false,
      error: data.error?.message || `ไม่สามารถเรียกรายการไฟล์จากโฟลเดอร์ "${folderPath}"`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Connection error to File Station List API",
    };
  }
}

/**
 * Create a new directory inside Synology File Station
 */
export async function createNasFolder(
  sid: string,
  folderPath: string,
  name: string,
  nasUrl: string = "http://192.168.162.21:5000"
): Promise<{ success: boolean; folder?: any; error?: string }> {
  try {
    // If in browser, proxy through POST /api/nas/files
    if (typeof window !== "undefined") {
      const res = await fetch("/api/nas/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_folder",
          sid,
          folderPath,
          folderName: name,
          nasUrl,
        }),
      });
      const data = await res.json();
      return data;
    }

    const cleanUrl = nasUrl.replace(/\/+$/, "");
    const url = `${cleanUrl}/webapi/entry.cgi?api=SYNO.FileStation.CreateFolder&version=2&method=create&folder_path=${encodeURIComponent(
      folderPath
    )}&name=${encodeURIComponent(name)}&_sid=${encodeURIComponent(sid)}`;

    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(8000),
    });

    const data = await res.json();
    if (data.success) {
      return { success: true, folder: data.data };
    }
    return { success: false, error: data.error?.message || "ไม่สามารถสร้างโฟลเดอร์บน NAS ได้" };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}
