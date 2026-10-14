/**
 * Synology Photos (DSM 7+) Integration Library
 * Communicates with SYNO.Foto.* (Personal Space) and SYNO.FotoTeam.* (Shared Space) Web APIs.
 */

import { getClientSynologyConfig } from "./synology";

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

/**
 * Fetch photo & video items from Synology Photos
 */
export async function listSynologyPhotos(params: {
  space?: PhotoSpace;
  albumId?: number;
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
    const nasUrl = params.nasUrl || "http://192.168.162.21:5000";

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

      const res = await fetch(`/api/nas/photos?${queryParams.toString()}`);
      return await res.json();
    }

    // Server-side direct request
    const cleanUrl = nasUrl.replace(/\/+$/, "");
    const apiName = space === "shared" ? "SYNO.FotoTeam.Browse.Item" : "SYNO.Foto.Browse.Item";
    const url = `${cleanUrl}/webapi/entry.cgi?api=${apiName}&version=1&method=list&offset=${
      params.offset || 0
    }&limit=${params.limit || 50}&additional=["thumbnail","resolution","orientation","video_meta"]&_sid=${encodeURIComponent(
      params.sid
    )}${params.albumId ? `&album_id=${params.albumId}` : ""}`;

    const res = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();
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

    return {
      success: false,
      error: data.error?.message || `ไม่สามารถเรียกรายการรูปภาพจาก Synology Photos ได้ (Code ${data.error?.code})`,
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
    const nasUrl = params.nasUrl || "http://192.168.162.21:5000";

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
      return await res.json();
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

    const data = await res.json();
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
      error: data.error?.message || "ไม่สามารถเรียกอัลบั้มจาก Synology Photos ได้",
      code: data.error?.code,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Connection error to Synology Photos Album API",
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
