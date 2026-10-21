/**
 * Synology NAS Integration Engine for Smart MSO / Virtual Office
 * Connects directly to Synology DSM Web API at http://192.168.162.26:5000
 * Handles Authentication (SYNO.API.Auth) and File Station DMS (SYNO.FileStation.*)
 */

export const DEFAULT_NAS_LAN_URL =
  process.env.NEXT_PUBLIC_SYNOLOGY_LAN_URL ||
  process.env.SYNOLOGY_LAN_URL ||
  "http://192.168.162.26:5000";

export interface SynologyConfig {
  nasUrl: string; // e.g. "http://192.168.162.26:5000"
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
  nasUrl:
    process.env.NEXT_PUBLIC_SYNOLOGY_NAS_URL ||
    process.env.SYNOLOGY_NAS_URL ||
    "https://nas.smso.site",
  serviceAccount: "admin",
  sharedFolder: "/virtual-office",
  primaryAuthEnabled: true,
  storageSyncEnabled: true,
  autoProvisionUsers: true,
  updatedAt: new Date().toISOString(),
};

const STORAGE_KEY = "smartmso_synology_config";
const LEGACY_STORAGE_KEY = "omnioffice_synology_config";

/**
 * Retrieve current Synology configuration (client-side)
 */
export function getClientSynologyConfig(): SynologyConfig {
  if (typeof window === "undefined") {
    return DEFAULT_SYNOLOGY_CONFIG;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Fallback to default URL only if empty or missing
      const latestUrl =
        process.env.NEXT_PUBLIC_SYNOLOGY_NAS_URL ||
        process.env.SYNOLOGY_NAS_URL ||
        "https://nas.smso.site";
      if (!parsed.nasUrl || typeof parsed.nasUrl !== "string" || parsed.nasUrl.trim() === "") {
        parsed.nasUrl = latestUrl;
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULT_SYNOLOGY_CONFIG, ...parsed }));
      }
      return { ...DEFAULT_SYNOLOGY_CONFIG, ...parsed };
    }
  } catch (err) {
    console.warn("Failed to parse Synology config from localStorage:", err);
  }
  return DEFAULT_SYNOLOGY_CONFIG;
}

/**
 * Safely parse JSON response from Synology WebAPI or API route proxies.
 * Handles HTML error pages, Cloudflare Error 530 / 1033, and 502/504 Bad Gateway cleanly.
 */
export async function safeParseJsonResponse(res: Response): Promise<any> {
  let text = "";
  try {
    text = await res.text();
  } catch (err: any) {
    return {
      success: false,
      error: `ไม่สามารถอ่านข้อมูลตอบกลับจากเซิร์ฟเวอร์: ${err?.message || "Stream read error"}`,
      code: res.status,
    };
  }

  if (!text || text.trim() === "") {
    return {
      success: false,
      error: `เซิร์ฟเวอร์ตอบกลับว่างเปล่า (HTTP ${res.status})`,
      code: res.status,
    };
  }

  try {
    return JSON.parse(text);
  } catch {
    // Check known reverse proxy and Cloudflare errors
    if (res.status === 413 || text.includes("FUNCTION_PAYLOAD_TOO_LARGE") || text.includes("Request Entity Too Large")) {
      return {
        success: false,
        error:
          "ขนาดไฟล์เกินขีดจำกัดของระบบคลาวด์ (HTTP 413: ขนาดไฟล์เกิน 4.2 MB ต่อคำขอผ่าน Cloud Serverless กรุณาลดขนาดไฟล์ หรือใช้ภาพถ่ายความละเอียดปกติ)",
        code: 413,
      };
    }
    if (res.status === 530 || text.includes("error code: 1033")) {
      return {
        success: false,
        error:
          "ไม่สามารถเชื่อมต่อ Synology NAS ผ่าน Cloudflare Tunnel ได้ (Error 1033 / HTTP 530: สัญญาณ Tunnel ออฟไลน์ กรุณาตรวจสอบโปรแกรม cloudflared บน NAS หรือสลับใช้ IP วงแลน)",
        code: 1033,
      };
    }
    if (res.status === 502 || text.includes("502 Bad Gateway")) {
      return {
        success: false,
        error: "เซิร์ฟเวอร์ Synology NAS ปลายทางไม่ตอบสนอง (HTTP 502 Bad Gateway)",
        code: 502,
      };
    }
    if (res.status === 504 || text.includes("504 Gateway Time-out") || text.includes("Gateway Timeout")) {
      return {
        success: false,
        error: "การเชื่อมต่อไปยัง Synology NAS หมดเวลา (HTTP 504 Gateway Timeout)",
        code: 504,
      };
    }
    if (text.startsWith("<!DOCTYPE") || text.startsWith("<!doctype") || text.startsWith("<html")) {
      return {
        success: false,
        error: `Synology NAS หรือเซิร์ฟเวอร์ส่งกลับหน้าเว็บ HTML แทน JSON (HTTP ${res.status}): อาจเกิดจากการบล็อกของ WAF, เซสชันหมดอายุ, หรือ Cloudflare Tunnel ขัดข้อง`,
        code: res.status,
      };
    }
    return {
      success: false,
      error: `ข้อมูลที่ได้รับจาก NAS ไม่ใช่รูปแบบ JSON (HTTP ${res.status}): ${text.replace(/sin1::[a-zA-Z0-9_-]+/g, "").slice(0, 100).trim()}`,
      code: res.status,
    };
  }
}

/**
 * Maximum file payload size supported by serverless cloud hosting (e.g. Vercel 4.5MB limit).
 * 4.0 MB safe threshold to leave room for multipart form boundary and headers.
 */
export const MAX_SERVERLESS_UPLOAD_SIZE = 4.0 * 1024 * 1024;

/**
 * Automatically compress high-resolution images in the browser before upload.
 * Reduces 10-25MB camera photos down to 1-3MB without perceptible quality loss,
 * ensuring uploads never exceed serverless payload limits (4.2 MB).
 */
export async function compressImageForUpload(
  file: File,
  maxSizeBytes: number = MAX_SERVERLESS_UPLOAD_SIZE
): Promise<File> {
  // Only compress standard raster images (skip SVG, GIF, non-images, or files already smaller than limit)
  if (
    !file.type.startsWith("image/") ||
    file.type.includes("svg") ||
    file.type.includes("gif")
  ) {
    return file;
  }

  // If already under safe threshold (4.0MB), return original file
  if (file.size <= maxSizeBytes) {
    return file;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        try {
          const canvas = document.createElement("canvas");
          let { width, height } = img;

          // Max dimension: 2560px (2K QHD high-definition)
          const MAX_DIMENSION = 2560;
          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            if (width > height) {
              height = Math.round((height * MAX_DIMENSION) / width);
              width = MAX_DIMENSION;
            } else {
              width = Math.round((width * MAX_DIMENSION) / height);
              height = MAX_DIMENSION;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file);
            return;
          }

          // Use high quality image rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);

          // Try 0.88 quality first
          canvas.toBlob(
            (blob) => {
              if (blob && blob.size < file.size) {
                // If still above maxSizeBytes, try one more aggressive pass at 0.78 quality
                if (blob.size > maxSizeBytes) {
                  canvas.toBlob(
                    (secondBlob) => {
                      if (secondBlob && secondBlob.size < file.size) {
                        const newName = file.name.replace(/\.[^.]+$/, ".jpg");
                        const compressedFile = new File([secondBlob], newName, {
                          type: "image/jpeg",
                          lastModified: file.lastModified,
                        });
                        console.log(
                          `[Upload] Compressed ${file.name} from ${(file.size / 1024 / 1024).toFixed(1)}MB to ${(compressedFile.size / 1024 / 1024).toFixed(1)}MB`
                        );
                        resolve(compressedFile);
                      } else {
                        resolve(file);
                      }
                    },
                    "image/jpeg",
                    0.78
                  );
                } else {
                  const newName = file.name.replace(/\.[^.]+$/, ".jpg");
                  const compressedFile = new File([blob], newName, {
                    type: "image/jpeg",
                    lastModified: file.lastModified,
                  });
                  console.log(
                    `[Upload] Compressed ${file.name} from ${(file.size / 1024 / 1024).toFixed(1)}MB to ${(compressedFile.size / 1024 / 1024).toFixed(1)}MB`
                  );
                  resolve(compressedFile);
                }
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            0.88
          );
        } catch (canvasErr) {
          console.warn("[Image Compress] Canvas error, using original file:", canvasErr);
          resolve(file);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };

      img.src = objectUrl;
    } catch (err) {
      console.warn("[Image Compress] Error, using original file:", err);
      resolve(file);
    }
  });
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
export async function checkNasHealth(
  nasUrl: string = process.env.NEXT_PUBLIC_SYNOLOGY_NAS_URL ||
    process.env.SYNOLOGY_NAS_URL ||
    "https://nas.smso.site"
): Promise<SynologyHealthStatus> {
  const startTime = Date.now();
  try {
    // If running in browser, proxy through server API route to bypass CORS
    if (typeof window !== "undefined") {
      const res = await fetch(`/api/nas/health?url=${encodeURIComponent(nasUrl)}`);
      const data = await safeParseJsonResponse(res);
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

    if (!res.ok && res.status !== 530) {
      return {
        online: false,
        host: nasUrl,
        port: 5000,
        latencyMs,
        error: `HTTP ${res.status}: ${res.statusText}`,
      };
    }

    const data = await safeParseJsonResponse(res);
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
      error: data.error || "Unexpected response format from Synology API",
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
  nasUrl: string = DEFAULT_SYNOLOGY_CONFIG.nasUrl
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
      const data = await safeParseJsonResponse(res);
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

    const attemptLogin = async (url: string) => {
      const cleanUrl = url.replace(/\/+$/, "");
      const loginUrl = `${cleanUrl}/webapi/entry.cgi?api=SYNO.API.Auth&version=7&method=login&account=${encodeURIComponent(
        account
      )}&passwd=${encodeURIComponent(passwd)}&session=FileStation&format=sid`;

      const res = await fetch(loginUrl, {
        method: "GET",
        signal: AbortSignal.timeout(6000),
      });

      return await safeParseJsonResponse(res);
    };

    let data = await attemptLogin(nasUrl);

    // Fallback to local LAN IP if Cloudflare Tunnel domain is offline (Error 1033 / 530 / 502)
    if (!data.success && (data.code === 1033 || data.code === 502 || data.code === 530 || nasUrl.includes("nas.smso.site"))) {
      const lanUrl = DEFAULT_NAS_LAN_URL;
      if (nasUrl !== lanUrl) {
        try {
          const lanData = await attemptLogin(lanUrl);
          if (lanData && (lanData.success || (lanData.code && lanData.code !== 1033 && lanData.code !== 502))) {
            data = lanData;
          }
        } catch {}
      }
    }

    if (data.success && data.data?.sid) {
      return {
        success: true,
        sid: data.data.sid,
        account: data.data.account || account,
        is_admin: account.toLowerCase() === "admin" || account.toLowerCase() === "guitardev",
      };
    }

    const errorCode = (typeof data.error === "object" ? data.error?.code : data.code) || 0;
    let errorMessage =
      typeof data.error === "string"
        ? data.error
        : data.error?.message || "ชื่อผู้ใช้หรือรหัสผ่านบน Synology NAS ไม่ถูกต้อง";
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
 * Map Synology FileStation error code to clear Thai message
 */
export function mapFileStationError(code?: number, defaultMsg?: string): string {
  switch (code) {
    case 408:
      return "ไม่มีสิทธิ์เข้าถึง (Permission Denied ตามสิทธิ์บัญชี Synology DSM)";
    case 418:
      return "สิทธิ์ไม่เพียงพอในการดำเนินการนี้ (Permission Denied)";
    case 119:
      return "เซสชัน Synology NAS หมดอายุหรือเซสชันไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่";
    case 403:
      return "มีไฟล์หรือโฟลเดอร์ชื่อนี้อยู่แล้ว หรือการดำเนินการถูกยกเลิก";
    case 414:
      return "ขนาดไฟล์ใหญ่เกินกว่าที่ระบบ NAS กำหนด";
    case 407:
      return "ประเภทไฟล์นี้ถูกจำกัดตามนโยบายความปลอดภัยของ NAS";
    default:
      return defaultMsg || "การดำเนินการกับ Synology File Station ล้มเหลว";
  }
}

const USER_NAS_SID_KEY = "smartmso_nas_user_sid";
const LEGACY_USER_NAS_SID_KEY = "omnioffice_nas_user_sid";
const USER_NAS_ACCOUNT_KEY = "smartmso_nas_user_account";
const LEGACY_USER_NAS_ACCOUNT_KEY = "omnioffice_nas_user_account";

/**
 * Retrieve current logged-in user's personal Synology NAS session ID
 */
export function getUserNasSid(): string | null {
  if (typeof window === "undefined") return null;
  return (
    sessionStorage.getItem(USER_NAS_SID_KEY) ||
    localStorage.getItem(USER_NAS_SID_KEY) ||
    sessionStorage.getItem(LEGACY_USER_NAS_SID_KEY) ||
    localStorage.getItem(LEGACY_USER_NAS_SID_KEY)
  );
}

/**
 * Store user's personal Synology NAS session ID upon successful login
 */
export function setUserNasSid(sid: string, account?: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(USER_NAS_SID_KEY, sid);
  localStorage.setItem(USER_NAS_SID_KEY, sid);
  sessionStorage.setItem(LEGACY_USER_NAS_SID_KEY, sid);
  localStorage.setItem(LEGACY_USER_NAS_SID_KEY, sid);
  if (account) {
    sessionStorage.setItem(USER_NAS_ACCOUNT_KEY, account);
    localStorage.setItem(USER_NAS_ACCOUNT_KEY, account);
    sessionStorage.setItem(LEGACY_USER_NAS_ACCOUNT_KEY, account);
    localStorage.setItem(LEGACY_USER_NAS_ACCOUNT_KEY, account);
  }
}

/**
 * Clear user's personal Synology NAS session ID upon logout
 */
export function clearUserNasSid(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(USER_NAS_SID_KEY);
  localStorage.removeItem(USER_NAS_SID_KEY);
  sessionStorage.removeItem(LEGACY_USER_NAS_SID_KEY);
  localStorage.removeItem(LEGACY_USER_NAS_SID_KEY);
  sessionStorage.removeItem(USER_NAS_ACCOUNT_KEY);
  localStorage.removeItem(USER_NAS_ACCOUNT_KEY);
  sessionStorage.removeItem(LEGACY_USER_NAS_ACCOUNT_KEY);
  localStorage.removeItem(LEGACY_USER_NAS_ACCOUNT_KEY);
}

/**
 * Retrieve user's personal Synology NAS account name
 */
export function getUserNasAccount(): string | null {
  if (typeof window === "undefined") return null;
  return (
    sessionStorage.getItem(USER_NAS_ACCOUNT_KEY) ||
    localStorage.getItem(USER_NAS_ACCOUNT_KEY) ||
    sessionStorage.getItem(LEGACY_USER_NAS_ACCOUNT_KEY) ||
    localStorage.getItem(LEGACY_USER_NAS_ACCOUNT_KEY)
  );
}

/**
 * List shared folders that the user has permission to view on Synology NAS (Native DSM Permissions)
 */
export async function listNasShares(
  sid: string,
  nasUrl: string = process.env.NEXT_PUBLIC_SYNOLOGY_NAS_URL || "https://nas.smso.site"
): Promise<{ success: boolean; shares?: SynologyFileItem[]; error?: string; code?: number }> {
  try {
    if (typeof window !== "undefined") {
      const res = await fetch(
        `/api/nas/files?sid=${encodeURIComponent(sid)}&action=list_share&url=${encodeURIComponent(nasUrl)}`
      );
      return await safeParseJsonResponse(res);
    }

    const cleanUrl = nasUrl.replace(/\/+$/, "");
    const listUrl = `${cleanUrl}/webapi/entry.cgi?api=SYNO.FileStation.List&version=2&method=list_share&_sid=${encodeURIComponent(
      sid
    )}&additional=size,owner,time,real_path`;

    const res = await fetch(listUrl, {
      method: "GET",
      signal: AbortSignal.timeout(8000),
    });

    const data = await safeParseJsonResponse(res);
    if (data.success && data.data?.shares) {
      const shares: SynologyFileItem[] = data.data.shares.map((s: any) => ({
        path: s.path,
        name: s.name,
        isdir: true,
        size: 0,
        additional: s.additional,
      }));
      return {
        success: true,
        shares,
      };
    }

    return {
      success: false,
      error: mapFileStationError(data.error?.code, data.error?.message),
      code: data.error?.code,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "ไม่สามารถเชื่อมต่อดึงรายการแชร์จาก NAS ได้",
    };
  }
}

/**
 * List files and directories inside a Synology File Station shared folder
 */
export async function listNasFiles(
  sid: string,
  folderPath: string = "/virtual-office",
  nasUrl: string = DEFAULT_SYNOLOGY_CONFIG.nasUrl
): Promise<{ success: boolean; files?: SynologyFileItem[]; error?: string; code?: number }> {
  try {
    // If in browser, proxy through /api/nas/files
    if (typeof window !== "undefined") {
      const res = await fetch(
        `/api/nas/files?sid=${encodeURIComponent(sid)}&folder_path=${encodeURIComponent(
          folderPath
        )}&url=${encodeURIComponent(nasUrl)}`
      );
      const data = await safeParseJsonResponse(res);
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

    const data = await safeParseJsonResponse(res);

    if (data.success && data.data?.files) {
      return {
        success: true,
        files: data.data.files,
      };
    }

    return {
      success: false,
      error: mapFileStationError(data.error?.code, data.error?.message || `ไม่สามารถเรียกรายการไฟล์จากโฟลเดอร์ "${folderPath}"`),
      code: data.error?.code,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Connection error to File Station List API",
    };
  }
}

/**
 * Map error code from SYNO.FileStation.CreateFolder to Thai description
 */
export function mapCreateFolderError(code?: number, folderPath?: string, name?: string): string | null {
  switch (code) {
    case 101:
      return "พารามิเตอร์ของระบบ Synology ไม่ถูกต้อง (Code 101: Invalid parameter)";
    case 119:
      return "เซสชัน Synology หมดอายุหรือไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่ (Code 119)";
    case 400:
      return "ไม่พบโฟลเดอร์แม่ หรือพารามิเตอร์ไม่ถูกต้อง (Code 400)";
    case 408:
      return `ไม่มีสิทธิ์สร้างโฟลเดอร์ใน "${folderPath}" (Permission Denied ตามสิทธิ์บัญชี DSM ของคุณ)`;
    case 414:
      return `มีโฟลเดอร์หรือไฟล์ชื่อ "${name}" อยู่แล้วในตำแหน่งนี้ (Code 414)`;
    case 418:
      return "ไม่มีสิทธิ์สร้างโฟลเดอร์ (Permission Denied: สิทธิ์บัญชีไม่เพียงพอใน DSM Control Panel)";
    case 1000:
      return `การสร้างโฟลเดอร์ล้มเหลว (Code 1000: กรุณาตรวจสอบว่ามีสิทธิ์เขียนในโฟลเดอร์ "${folderPath}")`;
    case 1001:
      return `ชื่อโฟลเดอร์ "${name}" ซ้ำกับโฟลเดอร์ที่มีอยู่แล้ว`;
    case 1002:
      return "ไม่สามารถสร้างโฟลเดอร์ในตำแหน่งนี้ได้ (ตำแหน่งนี้ไม่อนุญาตให้แก้ไข)";
    case 1003:
      return "ชื่อโฟลเดอร์ยาวเกินกว่าที่ระบบรองรับ";
    case 1004:
      return "ชื่อโฟลเดอร์มีอักขระพิเศษที่ไม่ได้รับอนุญาต (ห้ามมีเครื่องหมาย : หรือ /)";
    default:
      return null;
  }
}

/**
 * Create a new directory inside Synology File Station
 */
export async function createNasFolder(
  sid: string,
  folderPath: string,
  name: string,
  nasUrl: string = DEFAULT_SYNOLOGY_CONFIG.nasUrl
): Promise<{ success: boolean; folder?: any; error?: string; code?: number }> {
  try {
    if (!folderPath || folderPath === "/" || folderPath === "root") {
      return {
        success: false,
        error: "ไม่สามารถสร้างโฟลเดอร์ที่ตำแหน่ง Root ได้ กรุณาเข้าไปใน Shared Folder (เช่น /virtual-office, /photo, หรือ /home) ก่อนสร้างโฟลเดอร์",
        code: 408,
      };
    }

    const cleanName = name.trim().replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/+|\/+$/g, "");
    const cleanFolderPath = ("/" + folderPath.trim()).replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/+$/, "");

    // If in browser, proxy through POST /api/nas/files
    if (typeof window !== "undefined") {
      const res = await fetch("/api/nas/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_folder",
          sid,
          folderPath: cleanFolderPath,
          folderName: cleanName,
          nasUrl,
        }),
      });
      const data = await safeParseJsonResponse(res);
      return data;
    }

    const cleanUrl = nasUrl.replace(/\/+$/, "");

    // Helper to send CreateFolder request
    const sendCreateRequest = async (asJsonArray: boolean) => {
      const folderParam = asJsonArray ? JSON.stringify([cleanFolderPath]) : cleanFolderPath;
      const nameParam = asJsonArray ? JSON.stringify([cleanName]) : cleanName;
      const url = `${cleanUrl}/webapi/entry.cgi?api=SYNO.FileStation.CreateFolder&version=2&method=create&folder_path=${encodeURIComponent(
        folderParam
      )}&name=${encodeURIComponent(nameParam)}&force_parent=true&_sid=${encodeURIComponent(sid)}`;

      const res = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(8000),
      });

      return await safeParseJsonResponse(res);
    };

    // Attempt 1: Standard DSM 7 JSON-array format (folder_path=["/path"]&name=["folder"])
    let data = await sendCreateRequest(true);

    // Fallback: If Code 101 (Invalid parameter), retry with plain string format
    if (!data.success && (data.error?.code === 101 || data.code === 101)) {
      data = await sendCreateRequest(false);
    }

    if (data.success) {
      const createdFolder = data.data?.folders?.[0] || data.data;
      return { success: true, folder: createdFolder };
    }

    const errorCode = (typeof data.error === "object" ? data.error?.code : data.code) || 0;
    const errorMsg =
      mapCreateFolderError(errorCode, cleanFolderPath, cleanName) ||
      (typeof data.error === "string" ? data.error : data.error?.message) ||
      "ไม่สามารถสร้างโฟลเดอร์บน Synology NAS ได้";

    return {
      success: false,
      error: errorMsg,
      code: errorCode,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อสร้างโฟลเดอร์",
    };
  }
}

/**
 * Delete one or more files/folders in Synology File Station
 */
export async function deleteNasFiles(
  sid: string,
  paths: string[],
  nasUrl: string = DEFAULT_SYNOLOGY_CONFIG.nasUrl
): Promise<{ success: boolean; error?: string }> {
  try {
    if (typeof window !== "undefined") {
      const res = await fetch("/api/nas/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete",
          sid,
          paths,
          nasUrl,
        }),
      });
      return await safeParseJsonResponse(res);
    }

    const cleanPaths = paths.map((p) =>
      ("/" + p.trim())
        .replace(/\\/g, "/")
        .replace(/\/+/g, "/")
        .replace(/\/+$/, "")
    );
    const cleanUrl = nasUrl.replace(/\/+$/, "");
    const pathParam = JSON.stringify(cleanPaths);
    const url = `${cleanUrl}/webapi/entry.cgi?api=SYNO.FileStation.Delete&version=2&method=start&path=${encodeURIComponent(
      pathParam
    )}&accurate_progress=true&_sid=${encodeURIComponent(sid)}`;

    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(10000),
    });

    const data = await safeParseJsonResponse(res);
    if (data.success) {
      return { success: true };
    }
    return { success: false, error: data.error?.message || "ไม่สามารถลบไฟล์จาก NAS ได้" };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Rename a file or folder in Synology File Station
 */
export async function renameNasFile(
  sid: string,
  path: string,
  newName: string,
  nasUrl: string = DEFAULT_SYNOLOGY_CONFIG.nasUrl
): Promise<{ success: boolean; error?: string }> {
  try {
    if (typeof window !== "undefined") {
      const res = await fetch("/api/nas/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rename",
          sid,
          path,
          newName,
          nasUrl,
        }),
      });
      return await safeParseJsonResponse(res);
    }

    const cleanUrl = nasUrl.replace(/\/+$/, "");
    const url = `${cleanUrl}/webapi/entry.cgi?api=SYNO.FileStation.Rename&version=2&method=rename&path=${encodeURIComponent(
      path
    )}&name=${encodeURIComponent(newName)}&_sid=${encodeURIComponent(sid)}`;

    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(8000),
    });

    const data = await safeParseJsonResponse(res);
    if (data.success) {
      return { success: true };
    }
    return { success: false, error: data.error?.message || "ไม่สามารถเปลี่ยนชื่อไฟล์ได้" };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

