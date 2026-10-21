import { NextRequest, NextResponse } from "next/server";
import { safeParseJsonResponse, createNasFolder, deleteNasFiles } from "@/lib/synology";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const action = searchParams.get("action") || "list_items";
    const space = searchParams.get("space") || "shared";
    const sid = searchParams.get("sid");
    const nasUrl =
      searchParams.get("nasUrl") ||
      process.env.SYNOLOGY_NAS_URL ||
      process.env.NEXT_PUBLIC_SYNOLOGY_NAS_URL ||
      "https://nas.smso.site";
    const offset = searchParams.get("offset") || "0";
    const limit = searchParams.get("limit") || "50";
    const albumId = searchParams.get("album_id");
    const folderId = searchParams.get("folder_id") || searchParams.get("id_folder");

    if (!sid) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุเซสชัน DSM (sid)", code: 119 },
        { status: 401 }
      );
    }

    const cleanUrl = nasUrl.replace(/\/+$/, "");

    const sortBy = searchParams.get("sort_by");
    const sortDirection = searchParams.get("sort_direction") || "desc";

    // ─── ACTION 1: LIST PHOTO / VIDEO ITEMS ───
    if (action === "list_items") {
      const apiName = space === "shared" ? "SYNO.FotoTeam.Browse.Item" : "SYNO.Foto.Browse.Item";
      const additionalParam = encodeURIComponent(
        JSON.stringify(["thumbnail", "resolution"])
      );

      const fetchItems = async (extraQuery: string) => {
        const queryUrl = `${cleanUrl}/webapi/entry.cgi?api=${apiName}&version=1&method=list&offset=${offset}&limit=${limit}&additional=${additionalParam}&_sid=${encodeURIComponent(
          sid
        )}${extraQuery}`;
        const res = await fetch(queryUrl, {
          method: "GET",
          signal: AbortSignal.timeout(10000),
        });
        return await safeParseJsonResponse(res);
      };

      let extraParams = "";
      if (sortBy) {
        extraParams += `&sort_by=${encodeURIComponent(sortBy)}&sort_direction=${encodeURIComponent(sortDirection || "desc")}`;
      }
      if (albumId) {
        extraParams += `&album_id=${encodeURIComponent(albumId)}`;
      }
      if (folderId && folderId !== "0") {
        extraParams += `&folder_id=${encodeURIComponent(folderId)}`;
      }

      let data = await fetchItems(extraParams);

      // If failed with 120 (Invalid parameter), retry without extra sorting
      if (!data?.success && data?.error?.code === 120 && sortBy) {
        let fallbackExtra = "";
        if (folderId && folderId !== "0") {
          fallbackExtra += `&folder_id=${encodeURIComponent(folderId)}`;
        }
        if (albumId) {
          fallbackExtra += `&album_id=${encodeURIComponent(albumId)}`;
        }
        const retryData = await fetchItems(fallbackExtra);
        if (retryData?.success) {
          data = retryData;
        }
      }

      if (data && data.success && data.data) {
        const rawList = data.data.list || [];
        const items = rawList.map((item: any) => ({
          id: item.id,
          filename: item.filename,
          filesize: item.filesize || 0,
          time: item.time || Math.floor(Date.now() / 1000),
          type: item.type === "video" ? "video" : "photo",
          space,
          thumbnail: item.additional?.thumbnail,
          additional: item.additional,
        }));
        return NextResponse.json({
          success: true,
          items,
          total: data.data.total || items.length,
        });
      }

      // Friendly Thai diagnostic messages for known Synology Photos error codes
      let friendlyError = data?.error?.message;
      if (data?.error?.code === 801) {
        if (space === "shared") {
          friendlyError =
            "ยังไม่ได้เปิดใช้งานพื้นที่ส่วนกลาง (Shared Space) หรือบัญชีนี้ยังไม่ได้รับสิทธิ์เข้าถึงใน Synology Photos (แนะนำ: สลับไปที่ 'พื้นที่ส่วนบุคคล' หรือเปิดใช้งาน Shared Space ในการตั้งค่า Synology Photos บน DSM)";
        } else {
          friendlyError =
            "ไม่มีสิทธิ์เข้าถึงคลังภาพส่วนบุคคล หรืออัลบั้มนี้ต้องใช้รหัสผ่าน (Code 801)";
        }
      } else if (data?.error?.code === 120) {
        friendlyError =
          space === "shared"
            ? "บัญชีผู้ใช้นี้ได้รับสิทธิ์แบบกำหนดโฟลเดอร์เฉพาะ (Custom Access) ในพื้นที่ส่วนกลาง Synology Photos ซึ่งไม่อนุญาตให้เปิดดูภาพรวมที่ Root (แนะนำ: คลิกที่ '📁 โฟลเดอร์กิจกรรม' เพื่อเลือกเปิดดูโฟลเดอร์ที่ได้รับมอบหมาย หรือให้ Admin ปรับสิทธิ์เป็น Full Access)"
            : "ไม่สามารถเรียกรายการรูปภาพจากพื้นที่ส่วนบุคคลได้ (Code 120: พารามิเตอร์ไม่ถูกต้อง หรือยังไม่ได้เปิดบริการ User Home บน DSM)";
      } else if (data?.error?.code === 119) {
        friendlyError =
          "เซสชัน Synology หมดอายุหรือไม่ถูกต้อง กรุณายืนยันตัวตนใหม่อีกครั้ง (Code 119)";
      }

      return NextResponse.json({
        success: false,
        error: friendlyError || `ไม่สามารถเรียกรายการรูปภาพจาก Synology Photos ได้ (Code ${data?.error?.code})`,
        code: data?.error?.code,
      });
    }

    // ─── ACTION 2: LIST ALBUMS ───
    if (action === "list_albums") {
      const queryUrl = `${cleanUrl}/webapi/entry.cgi?api=SYNO.Foto.Browse.Album&version=1&method=list&offset=${offset}&limit=${limit}&_sid=${encodeURIComponent(
        sid
      )}`;

      const res = await fetch(queryUrl, {
        method: "GET",
        signal: AbortSignal.timeout(10000),
      });

      const data = await safeParseJsonResponse(res);
      if (data.success && data.data) {
        const rawList = data.data.list || [];
        const albums = rawList.map((a: any) => ({
          id: a.id,
          name: a.name,
          item_count: a.item_count || 0,
          cover: a.cover,
        }));
        return NextResponse.json({
          success: true,
          albums,
          total: data.data.total || albums.length,
        });
      }

      return NextResponse.json({
        success: false,
        error: data.error || data.error?.message || "ไม่สามารถเรียกอัลบั้มจาก Synology Photos ได้",
        code: data.error?.code || data.code,
      });
    }

    // ─── ACTION 3: LIST FOLDERS (ALBUMS BY DIRECTORY) ───
    if (action === "list_folders") {
      const apiName = space === "shared" ? "SYNO.FotoTeam.Browse.Folder" : "SYNO.Foto.Browse.Folder";
      const itemsApiName = space === "shared" ? "SYNO.FotoTeam.Browse.Item" : "SYNO.Foto.Browse.Item";
      const folderIdParam = folderId !== null && folderId !== undefined ? `&id=${encodeURIComponent(folderId)}` : `&id=0`;
      const additionalParam = encodeURIComponent(JSON.stringify(["thumbnail"]));
      const queryUrl = `${cleanUrl}/webapi/entry.cgi?api=${apiName}&version=1&method=list&offset=${offset}&limit=${limit}${folderIdParam}&additional=${additionalParam}&_sid=${encodeURIComponent(
        sid
      )}`;

      const res = await fetch(queryUrl, {
        method: "GET",
        signal: AbortSignal.timeout(10000),
      });

      const data = await safeParseJsonResponse(res);
      if (data.success && data.data) {
        const rawList = data.data.list || [];

        // Helper: Fetch latest photo inside a given folder ID
        const fetchLatestPhotoInFolder = async (fId: number | string) => {
          // 1. Try sorting by importtime (date added/imported - "จากที่เพิ่มมาล่าสุด")
          try {
            const byImportUrl = `${cleanUrl}/webapi/entry.cgi?api=${itemsApiName}&version=1&method=list&offset=0&limit=1&folder_id=${encodeURIComponent(
              String(fId)
            )}&sort_by=importtime&sort_direction=desc&additional=${encodeURIComponent(
              JSON.stringify(["thumbnail"])
            )}&_sid=${encodeURIComponent(sid)}`;
            const r1 = await fetch(byImportUrl, { signal: AbortSignal.timeout(4000) });
            const d1 = await safeParseJsonResponse(r1);
            if (d1.success && d1.data?.list?.length > 0) {
              return d1.data.list[0];
            }
          } catch {}

          // 2. Try sorting by takentime (EXIF captured date)
          try {
            const byTakenUrl = `${cleanUrl}/webapi/entry.cgi?api=${itemsApiName}&version=1&method=list&offset=0&limit=1&folder_id=${encodeURIComponent(
              String(fId)
            )}&sort_by=takentime&sort_direction=desc&additional=${encodeURIComponent(
              JSON.stringify(["thumbnail"])
            )}&_sid=${encodeURIComponent(sid)}`;
            const r2 = await fetch(byTakenUrl, { signal: AbortSignal.timeout(4000) });
            const d2 = await safeParseJsonResponse(r2);
            if (d2.success && d2.data?.list?.length > 0) {
              return d2.data.list[0];
            }
          } catch {}

          // 3. Fallback to default newest item without explicit sort_by
          try {
            const defaultUrl = `${cleanUrl}/webapi/entry.cgi?api=${itemsApiName}&version=1&method=list&offset=0&limit=1&folder_id=${encodeURIComponent(
              String(fId)
            )}&additional=${encodeURIComponent(
              JSON.stringify(["thumbnail"])
            )}&_sid=${encodeURIComponent(sid)}`;
            const r3 = await fetch(defaultUrl, { signal: AbortSignal.timeout(3000) });
            const d3 = await safeParseJsonResponse(r3);
            if (d3.success && d3.data?.list?.length > 0) {
              return d3.data.list[0];
            }
          } catch {}

          return null;
        };

        // Enrich folders in parallel to provide the latest added photo thumbnail
        const folders = await Promise.all(
          rawList.map(async (f: any) => {
            let cover = f.additional?.thumbnail || f.cover;

            // Fetch the latest photo in this folder to ensure preview is from the latest added image
            let latestPhoto = await fetchLatestPhotoInFolder(f.id);

            // If the folder has no direct photos, check if its first subfolder has photos
            if (!latestPhoto) {
              try {
                const subfolderUrl = `${cleanUrl}/webapi/entry.cgi?api=${apiName}&version=1&method=list&offset=0&limit=1&id=${encodeURIComponent(
                  String(f.id)
                )}&_sid=${encodeURIComponent(sid)}`;
                const subRes = await fetch(subfolderUrl, { signal: AbortSignal.timeout(3000) });
                const subData = await safeParseJsonResponse(subRes);
                const firstSub = subData.data?.list?.[0];
                if (firstSub) {
                  latestPhoto = await fetchLatestPhotoInFolder(firstSub.id);
                }
              } catch {}
            }

            if (latestPhoto) {
              cover = {
                id: latestPhoto.id,
                unit_id: latestPhoto.id,
                cache_key: latestPhoto.additional?.thumbnail?.cache_key || latestPhoto.thumbnail?.cache_key,
                filename: latestPhoto.filename,
                sm: latestPhoto.additional?.thumbnail?.sm || latestPhoto.thumbnail?.sm,
                m: latestPhoto.additional?.thumbnail?.m || latestPhoto.thumbnail?.m,
                xl: latestPhoto.additional?.thumbnail?.xl || latestPhoto.thumbnail?.xl,
              };
            }

            return {
              id: f.id,
              name: f.name,
              parent: f.parent || 0,
              item_count: f.item_count || 0,
              path: f.path || f.real_path || null,
              cover: cover || null,
            };
          })
        );

        return NextResponse.json({
          success: true,
          folders,
          total: data.data.total || folders.length,
        });
      }

      return NextResponse.json({
        success: false,
        error: data.error?.message || "ไม่สามารถเรียกรายการโฟลเดอร์จาก Synology Photos ได้",
        code: data.error?.code,
      });
    }

    return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error in photos API route" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "delete_items";
    const space = body.space || "shared";
    const sid = body.sid;
    const nasUrl =
      body.nasUrl ||
      process.env.SYNOLOGY_NAS_URL ||
      process.env.NEXT_PUBLIC_SYNOLOGY_NAS_URL ||
      "https://nas.smso.site";

    if (!sid) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุเซสชัน DSM (sid)", code: 119 },
        { status: 401 }
      );
    }

    const cleanUrl = nasUrl.replace(/\/+$/, "");

    // ─── ACTION 1: DELETE PHOTO / VIDEO ITEMS ───
    if (action === "delete_items") {
      const itemIds = body.itemIds || body.item_ids || (body.id ? [body.id] : []);
      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return NextResponse.json(
          { success: false, error: "กรุณาระบุรายการภาพหรือวิดีโอที่ต้องการลบ (itemIds)" },
          { status: 400 }
        );
      }

      const apiName = space === "shared" ? "SYNO.FotoTeam.Browse.Item" : "SYNO.Foto.Browse.Item";

      // Attempt 1: Standard DSM 7 Photos JSON-array ID format id=[1,2]
      const url1 = `${cleanUrl}/webapi/entry.cgi?api=${apiName}&version=1&method=delete&id=${encodeURIComponent(
        JSON.stringify(itemIds)
      )}&_sid=${encodeURIComponent(sid)}`;

      let res = await fetch(url1, {
        method: "GET",
        signal: AbortSignal.timeout(10000),
      });
      let data = await safeParseJsonResponse(res);

      // Attempt 2: If code 101/120, try item_id=[1,2]
      if (!data.success && (data.error?.code === 101 || data.error?.code === 120)) {
        const url2 = `${cleanUrl}/webapi/entry.cgi?api=${apiName}&version=1&method=delete&item_id=${encodeURIComponent(
          JSON.stringify(itemIds)
        )}&_sid=${encodeURIComponent(sid)}`;
        res = await fetch(url2, { method: "GET", signal: AbortSignal.timeout(10000) });
        data = await safeParseJsonResponse(res);
      }

      // Attempt 3: If still failing, try comma-separated id=1,2
      if (!data.success && (data.error?.code === 101 || data.error?.code === 120)) {
        const url3 = `${cleanUrl}/webapi/entry.cgi?api=${apiName}&version=1&method=delete&id=${encodeURIComponent(
          itemIds.join(",")
        )}&_sid=${encodeURIComponent(sid)}`;
        res = await fetch(url3, { method: "GET", signal: AbortSignal.timeout(10000) });
        data = await safeParseJsonResponse(res);
      }

      if (data.success) {
        return NextResponse.json({
          success: true,
          deletedCount: itemIds.length,
          message: `ลบ ${itemIds.length} รายการจาก Synology Photos เรียบร้อยแล้ว`,
        });
      }

      const errorCode = data.error?.code || data.code;
      let friendlyError = data.error?.message;
      if (errorCode === 105 || errorCode === 403) {
        friendlyError = "บัญชี Synology NAS ของท่านไม่มีสิทธิ์ลบไฟล์ในพื้นที่นี้ (ต้องการสิทธิ์แก้ไข/จัดการ)";
      } else if (errorCode === 119) {
        friendlyError = "เซสชัน Synology หมดอายุหรือไม่ถูกต้อง กรุณายืนยันตัวตนใหม่อีกครั้ง (Code 119)";
      } else if (errorCode === 801) {
        friendlyError = "ไม่มีสิทธิ์เข้าถึงคลังภาพดังกล่าว (Code 801)";
      }

      return NextResponse.json({
        success: false,
        error: friendlyError || `ไม่สามารถลบรายการภาพได้ (Synology Error Code: ${errorCode || "Unknown"})`,
        code: errorCode,
      });
    }

    // ─── ACTION 2: CREATE ALBUM ───
    if (action === "create_album") {
      const name = (body.name || "").trim();
      if (!name) {
        return NextResponse.json({ success: false, error: "กรุณาระบุชื่ออัลบั้ม" }, { status: 400 });
      }

      const itemIds = body.itemIds || body.item_ids || [];
      const itemJson = Array.isArray(itemIds) && itemIds.length > 0 ? JSON.stringify(itemIds) : "";

      // In DSM 7 Synology Photos, normal manual albums are created via SYNO.Foto.Browse.NormalAlbum
      const queryParams = new URLSearchParams({
        api: "SYNO.Foto.Browse.NormalAlbum",
        version: "1",
        method: "create",
        name,
        _sid: sid,
      });
      if (itemJson) {
        queryParams.set("item", itemJson);
      }

      // Attempt 1: GET with item parameter
      let res = await fetch(`${cleanUrl}/webapi/entry.cgi?${queryParams.toString()}`, {
        method: "GET",
        signal: AbortSignal.timeout(10000),
      });
      let data = await safeParseJsonResponse(res);

      // Attempt 2: If code 101/120, retry with item_id parameter
      if (!data.success && (data.error?.code === 101 || data.error?.code === 120 || data.code === 101) && itemJson) {
        queryParams.delete("item");
        queryParams.set("item_id", itemJson);
        res = await fetch(`${cleanUrl}/webapi/entry.cgi?${queryParams.toString()}`, {
          method: "GET",
          signal: AbortSignal.timeout(10000),
        });
        data = await safeParseJsonResponse(res);
      }

      // Attempt 3: If still failing and itemIds were provided, create empty album first, then attach items
      if (!data.success && itemJson) {
        queryParams.delete("item");
        queryParams.delete("item_id");
        res = await fetch(`${cleanUrl}/webapi/entry.cgi?${queryParams.toString()}`, {
          method: "GET",
          signal: AbortSignal.timeout(10000),
        });
        data = await safeParseJsonResponse(res);
      }

      // Attempt 4: If still failing, try POST form-encoded
      if (!data.success) {
        const postBody = new URLSearchParams({
          api: "SYNO.Foto.Browse.NormalAlbum",
          version: "1",
          method: "create",
          name,
          _sid: sid,
        });
        res = await fetch(`${cleanUrl}/webapi/entry.cgi`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: postBody.toString(),
          signal: AbortSignal.timeout(10000),
        });
        data = await safeParseJsonResponse(res);
      }

      if (data.success) {
        const albumData = data.data?.album || data.data || {};
        const albumId = albumData.id || data.data?.id;

        // If items need to be attached and album was created, call add_item
        if (albumId && Array.isArray(itemIds) && itemIds.length > 0) {
          try {
            const addUrl = `${cleanUrl}/webapi/entry.cgi?api=SYNO.Foto.Browse.NormalAlbum&version=1&method=add_item&id=${encodeURIComponent(
              String(albumId)
            )}&item=${encodeURIComponent(JSON.stringify(itemIds))}&_sid=${encodeURIComponent(sid)}`;
            await fetch(addUrl, { method: "GET", signal: AbortSignal.timeout(8000) });
          } catch (addErr) {
            console.warn("[NAS Photos] Added items to album warning:", addErr);
          }
        }

        return NextResponse.json({
          success: true,
          album: {
            id: albumId,
            name: albumData.name || name,
            item_count: itemIds.length,
          },
          message: `สร้างอัลบั้ม "${name}" เรียบร้อยแล้ว`,
        });
      }

      const errorCode = data.error?.code || data.code;
      let errorMsg = "ไม่สามารถสร้างอัลบั้มบน Synology Photos ได้";
      if (errorCode === 101) {
        errorMsg = "พารามิเตอร์ของ Synology Photos API ไม่ถูกต้อง (Code 101)";
      } else if (errorCode === 102 || errorCode === 103) {
        errorMsg = "ไม่พบ API หรือฟังก์ชันสร้างอัลบั้มบน Synology NAS (Code 102/103)";
      } else if (errorCode === 105 || errorCode === 403) {
        errorMsg = "บัญชี Synology DSM ของท่านไม่มีสิทธิ์สร้างอัลบั้มภาพ (ต้องการสิทธิ์แก้ไข/จัดการ)";
      } else if (errorCode === 119) {
        errorMsg = "เซสชัน Synology NAS หมดอายุ กรุณาออกจากระบบและเข้าสู่ระบบใหม่อีกครั้ง";
      } else if (errorCode === 400 || errorCode === 414) {
        errorMsg = `มีอัลบั้มชื่อ "${name}" อยู่แล้ว หรือรูปแบบชื่อไม่ถูกต้อง`;
      }

      return NextResponse.json({
        success: false,
        error: errorMsg,
        code: errorCode,
      });
    }

    // ─── ACTION 2.1: DELETE ALBUM ───
    if (action === "delete_album") {
      const albumId = body.albumId || body.id || body.album_id;
      if (!albumId) {
        return NextResponse.json({ success: false, error: "กรุณาระบุรหัสอัลบั้มที่ต้องการลบ" }, { status: 400 });
      }

      // SYNO.Foto.Browse.Album method=delete
      const delUrl = `${cleanUrl}/webapi/entry.cgi?api=SYNO.Foto.Browse.Album&version=1&method=delete&id=${encodeURIComponent(
        JSON.stringify([Number(albumId)])
      )}&_sid=${encodeURIComponent(sid)}`;

      let res = await fetch(delUrl, { method: "GET", signal: AbortSignal.timeout(10000) });
      let data = await safeParseJsonResponse(res);

      if (!data.success && (data.error?.code === 101 || data.error?.code === 120)) {
        const delUrl2 = `${cleanUrl}/webapi/entry.cgi?api=SYNO.Foto.Browse.Album&version=1&method=delete&id=${encodeURIComponent(
          String(albumId)
        )}&_sid=${encodeURIComponent(sid)}`;
        res = await fetch(delUrl2, { method: "GET", signal: AbortSignal.timeout(10000) });
        data = await safeParseJsonResponse(res);
      }

      if (data.success) {
        return NextResponse.json({
          success: true,
          message: "ลบอัลบั้มเรียบร้อยแล้ว",
        });
      }

      return NextResponse.json({
        success: false,
        error: "ไม่สามารถลบอัลบั้มได้ (สิทธิ์ไม่เพียงพอ หรืออัลบั้มไม่มีอยู่จริง)",
        code: data.error?.code || data.code,
      });
    }

    // ─── ACTION 3: CREATE FOLDER IN PHOTO STORAGE ───
    if (action === "create_folder") {
      const rawFolderPath = body.folderPath || body.folder_path;
      const rawFolderName = (body.folderName || body.folder_name || "").trim();
      const folderName = rawFolderName.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/+|\/+$/g, "");
      if (!folderName) {
        return NextResponse.json({ success: false, error: "กรุณาระบุชื่อโฟลเดอร์" }, { status: 400 });
      }

      // If no folderPath provided, default to root of selected space
      let targetPath = rawFolderPath || (space === "shared" ? "/photo" : "/home/Photos");
      targetPath = ("/" + targetPath.trim()).replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/+$/, "");
      const result = await createNasFolder(sid, targetPath, folderName, cleanUrl);
      return NextResponse.json(result);
    }

    // ─── ACTION 4: DELETE FOLDER IN PHOTO STORAGE ───
    if (action === "delete_folder") {
      const rawFolderPath = body.folderPath || body.folder_path;
      const folderPath = ("/" + (rawFolderPath || "").trim()).replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/+$/, "");
      if (!folderPath || folderPath === "/photo" || folderPath === "/home/Photos" || folderPath === "/") {
        return NextResponse.json(
          { success: false, error: "ไม่สามารถลบโฟลเดอร์ราก (Root Folder) ของระบบได้" },
          { status: 400 }
        );
      }

      const result = await deleteNasFiles(sid, [folderPath], cleanUrl);
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error in photos API route POST" },
      { status: 500 }
    );
  }
}
