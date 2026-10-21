/**
 * Synology Photos (DSM 7+) Integration Library
 * Communicates with SYNO.Foto.* (Personal Space) and SYNO.FotoTeam.* (Shared Space) Web APIs.
 */

import { getClientSynologyConfig, safeParseJsonResponse } from "./synology";

export type PhotoSpace = "shared" | "personal";

export interface SynologyPhotoItem {
  id: number;
  filename: string;
  filesize: number;
  time: number; // Unix timestamp (seconds)
  type: "photo" | "video";
  space: PhotoSpace;
  thumbnail?: {
    unit_id?: number;
    cache_key?: string;
    sm?: string;
    m?: string;
    xl?: string;
  };
  additional?: {
    resolution?: { width: number; height: number };
    orientation?: number;
    video_meta?: { duration: number };
    description?: string;
    tag?: string[];
    address?: {
      city?: string;
      district?: string;
      country?: string;
      route?: string;
    };
    exif?: {
      camera?: string;
      camera_maker?: string;
      lens?: string;
      f_number?: number;
      exposure_time?: string;
      iso?: number;
      focal_length?: number;
      date_time?: string;
    };
  };
}

export interface SynologyPhotoAlbum {
  id: number;
  name: string;
  item_count: number;
  cover?: {
    id: number;
    cache_key?: string;
  };
}

export interface SynologyPhotoFolder {
  id: number;
  name: string;
  parent: number;
  item_count: number;
  path?: string;
  cover?: {
    unit_id?: number;
    cache_key?: string;
    id?: number;
    filename?: string;
    sm?: string;
    m?: string;
    xl?: string;
  };
}

/**
 * Fetch photo & video items from Synology Photos
 */
export async function listSynologyPhotos(params: {
  space?: PhotoSpace;
  albumId?: number;
  folderId?: number | string;
  offset?: number;
  limit?: number;
  sid: string;
  nasUrl?: string;
}): Promise<{
  success: boolean;
  items?: SynologyPhotoItem[];
  total?: number;
  error?: string;
  code?: number;
}> {
  try {
    const space = params.space || "shared";
    const nasUrl = params.nasUrl || getClientSynologyConfig().nasUrl || "https://nas.smso.site";

    if (typeof window !== "undefined") {
      const queryParams = new URLSearchParams({
        action: "list_items",
        space,
        offset: String(params.offset || 0),
        limit: String(params.limit || 50),
        sid: params.sid,
        nasUrl,
      });
      if (params.albumId) {
        queryParams.set("album_id", String(params.albumId));
      }
      if (params.folderId) {
        queryParams.set("folder_id", String(params.folderId));
      }

      const res = await fetch(`/api/nas/photos?${queryParams.toString()}`);
      return await safeParseJsonResponse(res);
    }

    // Server-side direct request
    const cleanUrl = nasUrl.replace(/\/+$/, "");
    const apiName = space === "shared" ? "SYNO.FotoTeam.Browse.Item" : "SYNO.Foto.Browse.Item";
    const additionalParam = encodeURIComponent(
      JSON.stringify(["thumbnail", "resolution", "orientation", "video_meta", "exif", "description", "tag", "address"])
    );
    let url = `${cleanUrl}/webapi/entry.cgi?api=${apiName}&version=1&method=list&offset=${
      params.offset || 0
    }&limit=${params.limit || 50}&additional=${additionalParam}&_sid=${encodeURIComponent(
      params.sid
    )}`;
    if (params.albumId) {
      url += `&album_id=${params.albumId}`;
    }
    if (params.folderId) {
      const fId = encodeURIComponent(String(params.folderId));
      url += `&folder_id=${fId}`;
    }

    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(10000),
    });

    const data = await safeParseJsonResponse(res);
    if (data.success && data.data) {
      const rawList = data.data.list || [];
      const items: SynologyPhotoItem[] = rawList.map((item: any) => ({
        id: item.id,
        filename: item.filename,
        filesize: item.filesize || 0,
        time: item.time || Math.floor(Date.now() / 1000),
        type: item.type === "video" ? "video" : "photo",
        space,
        thumbnail: item.additional?.thumbnail,
        additional: item.additional,
      }));
      return {
        success: true,
        items,
        total: data.data.total || items.length,
      };
    }

    let friendlyError = data.error?.message;
    if (data.error?.code === 801) {
      if (space === "shared") {
        friendlyError =
          "ยังไม่ได้เปิดใช้งานพื้นที่ส่วนกลาง (Shared Space) หรือบัญชีนี้ยังไม่ได้รับสิทธิ์เข้าถึงใน Synology Photos (แนะนำ: สลับไปที่ 'พื้นที่ส่วนบุคคล' หรือเปิดใช้งาน Shared Space ในการตั้งค่า Synology Photos บน DSM)";
      } else {
        friendlyError = "ไม่มีสิทธิ์เข้าถึงคลังภาพส่วนบุคคล หรืออัลบั้มนี้ต้องใช้รหัสผ่าน (Code 801)";
      }
    } else if (data.error?.code === 119) {
      friendlyError = "เซสชัน Synology หมดอายุหรือไม่ถูกต้อง กรุณายืนยันตัวตนใหม่อีกครั้ง (Code 119)";
    }

    return {
      success: false,
      error: friendlyError || `ไม่สามารถเรียกรายการรูปภาพจาก Synology Photos ได้ (Code ${data.error?.code})`,
      code: data.error?.code,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อคลังภาพ Synology Photos",
    };
  }
}

/**
 * Fetch photo albums from Synology Photos
 */
export async function listSynologyAlbums(params: {
  space?: PhotoSpace;
  offset?: number;
  limit?: number;
  sid: string;
  nasUrl?: string;
}): Promise<{
  success: boolean;
  albums?: SynologyPhotoAlbum[];
  total?: number;
  error?: string;
  code?: number;
}> {
  try {
    const space = params.space || "shared";
    const nasUrl = params.nasUrl || getClientSynologyConfig().nasUrl || "https://nas.smso.site";

    if (typeof window !== "undefined") {
      const queryParams = new URLSearchParams({
        action: "list_albums",
        space,
        offset: String(params.offset || 0),
        limit: String(params.limit || 50),
        sid: params.sid,
        nasUrl,
      });

      const res = await fetch(`/api/nas/photos?${queryParams.toString()}`);
      return await safeParseJsonResponse(res);
    }

    // Direct server-side call
    const cleanUrl = nasUrl.replace(/\/+$/, "");
    const url = `${cleanUrl}/webapi/entry.cgi?api=SYNO.Foto.Browse.Album&version=1&method=list&offset=${
      params.offset || 0
    }&limit=${params.limit || 50}&_sid=${encodeURIComponent(params.sid)}`;

    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(10000),
    });

    const data = await safeParseJsonResponse(res);
    if (data.success && data.data) {
      const rawList = data.data.list || [];
      const albums: SynologyPhotoAlbum[] = rawList.map((a: any) => ({
        id: a.id,
        name: a.name,
        item_count: a.item_count || 0,
        cover: a.cover,
      }));
      return {
        success: true,
        albums,
        total: data.data.total || albums.length,
      };
    }

    return {
      success: false,
      error: data.error || data.error?.message || "ไม่สามารถเรียกอัลบั้มจาก Synology Photos ได้",
      code: data.error?.code || data.code,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Connection error to Synology Photos Album API",
    };
  }
}

/**
 * Fetch folders (albums by folder/directory) from Synology Photos
 */
export async function listSynologyFolders(params: {
  space?: PhotoSpace;
  folderId?: number | string;
  offset?: number;
  limit?: number;
  sid: string;
  nasUrl?: string;
}): Promise<{
  success: boolean;
  folders?: SynologyPhotoFolder[];
  total?: number;
  error?: string;
  code?: number;
}> {
  try {
    const space = params.space || "shared";
    const nasUrl = params.nasUrl || getClientSynologyConfig().nasUrl || "https://nas.smso.site";

    if (typeof window !== "undefined") {
      const queryParams = new URLSearchParams({
        action: "list_folders",
        space,
        offset: String(params.offset || 0),
        limit: String(params.limit || 50),
        sid: params.sid,
        nasUrl,
      });
      if (params.folderId !== undefined && params.folderId !== null) {
        queryParams.set("folder_id", String(params.folderId));
      }

      const res = await fetch(`/api/nas/photos?${queryParams.toString()}`);
      return await safeParseJsonResponse(res);
    }

    // Direct server-side call
    const cleanUrl = nasUrl.replace(/\/+$/, "");
    const apiName = space === "shared" ? "SYNO.FotoTeam.Browse.Folder" : "SYNO.Foto.Browse.Folder";
    const folderIdParam =
      params.folderId !== undefined && params.folderId !== null
        ? `&id=${encodeURIComponent(String(params.folderId))}`
        : `&id=0`;
    const additionalParam = encodeURIComponent(JSON.stringify(["thumbnail"]));
    const url = `${cleanUrl}/webapi/entry.cgi?api=${apiName}&version=1&method=list&offset=${
      params.offset || 0
    }&limit=${params.limit || 50}${folderIdParam}&additional=${additionalParam}&_sid=${encodeURIComponent(
      params.sid
    )}`;

    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(10000),
    });

    const data = await safeParseJsonResponse(res);
    if (data.success && data.data) {
      const rawList = data.data.list || [];
      const folders: SynologyPhotoFolder[] = rawList.map((f: any) => ({
        id: f.id,
        name: f.name,
        parent: f.parent || 0,
        item_count: f.item_count || 0,
        cover: f.additional?.thumbnail || f.cover,
      }));
      return {
        success: true,
        folders,
        total: data.data.total || folders.length,
      };
    }

    return {
      success: false,
      error: data.error?.message || "ไม่สามารถเรียกโฟลเดอร์จาก Synology Photos ได้",
      code: data.error?.code,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Connection error to Synology Photos Folder API",
    };
  }
}

/**
 * Build thumbnail URL for photo item
 */
export function getPhotoThumbnailUrl(
  itemId: number,
  size: "sm" | "m" | "xl" = "m",
  cacheKey?: string,
  space: PhotoSpace = "shared",
  sid?: string | null
): string {
  const params = new URLSearchParams({
    id: String(itemId),
    size,
    space,
  });
  if (cacheKey) params.set("cache_key", cacheKey);
  if (sid) params.set("sid", sid);

  return `/api/nas/photos/thumbnail?${params.toString()}`;
}

/**
 * Build download or inline stream URL for photo/video item
 */
export function getPhotoMediaUrl(
  itemId: number,
  filename: string,
  space: PhotoSpace = "shared",
  sid?: string | null,
  mode: "open" | "download" = "open"
): string {
  const params = new URLSearchParams({
    id: String(itemId),
    filename,
    space,
    mode,
  });
  if (sid) params.set("sid", sid);
  return `/api/nas/photos/download?${params.toString()}`;
}

/**
 * Format file size helper
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Format timestamp helper
 */
export function formatPhotoTime(timestampSeconds: number): string {
  try {
    const d = new Date(timestampSeconds * 1000);
    return d.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

export interface PhotoMonthGroup {
  monthKey: string;
  monthTitle: string;
  items: SynologyPhotoItem[];
}

/**
 * Group photo items by Year & Month for Synology Photos Timeline view
 */
export function groupPhotosByMonth(items: SynologyPhotoItem[]): PhotoMonthGroup[] {
  const map = new Map<string, { monthTitle: string; items: SynologyPhotoItem[] }>();

  for (const item of items) {
    const d = new Date(item.time * 1000);
    const yearMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const monthTitle = d.toLocaleDateString("th-TH", {
      month: "long",
      year: "numeric",
    });

    if (!map.has(yearMonthKey)) {
      map.set(yearMonthKey, { monthTitle, items: [] });
    }
    map.get(yearMonthKey)!.items.push(item);
  }

  // Sort groups descending by date key
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([monthKey, val]) => ({
      monthKey,
      monthTitle: val.monthTitle,
      items: val.items,
    }));
}

/**
 * Delete one or more photo/video items from Synology Photos
 */
export async function deleteSynologyPhotoItems(params: {
  space: PhotoSpace;
  itemIds: number[];
  sid: string;
  nasUrl?: string;
}): Promise<{
  success: boolean;
  deletedCount?: number;
  message?: string;
  error?: string;
  code?: number;
}> {
  try {
    const res = await fetch("/api/nas/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete_items",
        space: params.space,
        itemIds: params.itemIds,
        sid: params.sid,
        nasUrl: params.nasUrl || getClientSynologyConfig().nasUrl,
      }),
    });
    return await safeParseJsonResponse(res);
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "ไม่สามารถเชื่อมต่อเพื่อลบรูปภาพจาก Synology Photos ได้",
    };
  }
}

/**
 * Create a new album in Synology Photos
 */
export async function createSynologyAlbum(params: {
  name: string;
  itemIds?: number[];
  sid: string;
  nasUrl?: string;
}): Promise<{
  success: boolean;
  album?: SynologyPhotoAlbum;
  message?: string;
  error?: string;
  code?: number;
}> {
  try {
    const res = await fetch("/api/nas/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_album",
        name: params.name,
        itemIds: params.itemIds || [],
        sid: params.sid,
        nasUrl: params.nasUrl || getClientSynologyConfig().nasUrl,
      }),
    });
    return await safeParseJsonResponse(res);
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "ไม่สามารถเชื่อมต่อเพื่อสร้างอัลบั้มบน Synology Photos ได้",
    };
  }
}

/**
 * Delete an album from Synology Photos
 */
export async function deleteSynologyAlbum(params: {
  albumId: number | string;
  sid: string;
  nasUrl?: string;
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
  code?: number;
}> {
  try {
    const res = await fetch("/api/nas/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete_album",
        albumId: params.albumId,
        sid: params.sid,
        nasUrl: params.nasUrl || getClientSynologyConfig().nasUrl,
      }),
    });
    return await safeParseJsonResponse(res);
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "ไม่สามารถเชื่อมต่อเพื่อลบอัลบั้มบน Synology Photos ได้",
    };
  }
}

/**
 * Create a new photo directory / activity folder under /photo or /home/Photos
 */
export async function createSynologyPhotoFolder(params: {
  space: PhotoSpace;
  folderPath?: string;
  folderName: string;
  sid: string;
  nasUrl?: string;
}): Promise<{
  success: boolean;
  folder?: any;
  error?: string;
  code?: number;
}> {
  try {
    const res = await fetch("/api/nas/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_folder",
        space: params.space,
        folderPath: params.folderPath,
        folderName: params.folderName,
        sid: params.sid,
        nasUrl: params.nasUrl || getClientSynologyConfig().nasUrl,
      }),
    });
    return await safeParseJsonResponse(res);
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "ไม่สามารถเชื่อมต่อเพื่อสร้างโฟลเดอร์ภาพบน Synology NAS ได้",
    };
  }
}

/**
 * Delete a photo directory / activity folder from NAS storage
 */
export async function deleteSynologyPhotoFolder(params: {
  folderPath: string;
  sid: string;
  nasUrl?: string;
}): Promise<{
  success: boolean;
  error?: string;
  code?: number;
}> {
  try {
    const res = await fetch("/api/nas/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete_folder",
        folderPath: params.folderPath,
        sid: params.sid,
        nasUrl: params.nasUrl || getClientSynologyConfig().nasUrl,
      }),
    });
    return await safeParseJsonResponse(res);
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "ไม่สามารถเชื่อมต่อเพื่อลบโฟลเดอร์จาก Synology NAS ได้",
    };
  }
}


