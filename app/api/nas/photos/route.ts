import { NextRequest, NextResponse } from "next/server";

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
        JSON.stringify(["thumbnail", "resolution", "orientation", "video_meta", "exif", "description", "tag", "address"])
      );
      let queryUrl = `${cleanUrl}/webapi/entry.cgi?api=${apiName}&version=1&method=list&offset=${offset}&limit=${limit}&additional=${additionalParam}&_sid=${encodeURIComponent(
        sid
      )}`;
      if (sortBy) {
        queryUrl += `&sort_by=${encodeURIComponent(sortBy)}&sort_direction=${encodeURIComponent(sortDirection)}`;
      } else {
        queryUrl += `&sort_direction=${encodeURIComponent(sortDirection)}`;
      }
      if (albumId) {
        queryUrl += `&album_id=${albumId}`;
      }
      if (folderId) {
        queryUrl += `&folder_id=${encodeURIComponent(folderId)}&id_folder=${encodeURIComponent(folderId)}`;
      }

      const res = await fetch(queryUrl, {
        method: "GET",
        signal: AbortSignal.timeout(10000),
      });

      const data = await res.json();
      if (data.success && data.data) {
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
      let friendlyError = data.error?.message;
      if (data.error?.code === 801) {
        if (space === "shared") {
          friendlyError =
            "ยังไม่ได้เปิดใช้งานพื้นที่ส่วนกลาง (Shared Space) หรือบัญชีนี้ยังไม่ได้รับสิทธิ์เข้าถึงใน Synology Photos (แนะนำ: สลับไปที่ 'พื้นที่ส่วนบุคคล' หรือเปิดใช้งาน Shared Space ในการตั้งค่า Synology Photos บน DSM)";
        } else {
          friendlyError =
            "ไม่มีสิทธิ์เข้าถึงคลังภาพส่วนบุคคล หรืออัลบั้มนี้ต้องใช้รหัสผ่าน (Code 801)";
        }
      } else if (data.error?.code === 120) {
        friendlyError =
          "บัญชีผู้ใช้นี้ได้รับสิทธิ์แบบกำหนดโฟลเดอร์เฉพาะ (Custom Access) ในพื้นที่ส่วนกลาง Synology Photos จึงจำเป็นต้องระบุโฟลเดอร์ หรือให้ผู้ดูแลระบบกำหนดสิทธิ์การเข้าถึงเป็น Full Access ใน Synology Photos (Code 120)";
      } else if (data.error?.code === 119) {
        friendlyError =
          "เซสชัน Synology หมดอายุหรือไม่ถูกต้อง กรุณายืนยันตัวตนใหม่อีกครั้ง (Code 119)";
      }

      return NextResponse.json({
        success: false,
        error: friendlyError || `ไม่สามารถเรียกรายการรูปภาพจาก Synology Photos ได้ (Code ${data.error?.code})`,
        code: data.error?.code,
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

      const data = await res.json();
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
        error: data.error?.message || "ไม่สามารถเรียกอัลบั้มจาก Synology Photos ได้",
        code: data.error?.code,
      });
    }

    // ─── ACTION 3: LIST FOLDERS (ALBUMS BY DIRECTORY) ───
    if (action === "list_folders") {
      const apiName = space === "shared" ? "SYNO.FotoTeam.Browse.Folder" : "SYNO.Foto.Browse.Folder";
      const itemsApiName = space === "shared" ? "SYNO.FotoTeam.Browse.Item" : "SYNO.Foto.Browse.Item";
      const folderIdParam = folderId !== null && folderId !== undefined ? `&id=${encodeURIComponent(folderId)}` : `&id=0`;
      const additionalParam = encodeURIComponent(JSON.stringify(["cover", "thumbnail"]));
      const queryUrl = `${cleanUrl}/webapi/entry.cgi?api=${apiName}&version=1&method=list&offset=${offset}&limit=${limit}${folderIdParam}&additional=${additionalParam}&_sid=${encodeURIComponent(
        sid
      )}`;

      const res = await fetch(queryUrl, {
        method: "GET",
        signal: AbortSignal.timeout(10000),
      });

      const data = await res.json();
      if (data.success && data.data) {
        const rawList = data.data.list || [];

        // Helper: Fetch latest photo inside a given folder ID
        const fetchLatestPhotoInFolder = async (fId: number | string) => {
          // 1. Try sorting by importtime (date added/imported - "จากที่เพิ่มมาล่าสุด")
          try {
            const byImportUrl = `${cleanUrl}/webapi/entry.cgi?api=${itemsApiName}&version=1&method=list&offset=0&limit=1&folder_id=${encodeURIComponent(
              String(fId)
            )}&id_folder=${encodeURIComponent(
              String(fId)
            )}&sort_by=importtime&sort_direction=desc&additional=${encodeURIComponent(
              JSON.stringify(["thumbnail"])
            )}&_sid=${encodeURIComponent(sid)}`;
            const r1 = await fetch(byImportUrl, { signal: AbortSignal.timeout(4000) });
            const d1 = await r1.json();
            if (d1.success && d1.data?.list?.length > 0) {
              return d1.data.list[0];
            }
          } catch {}

          // 2. Try sorting by takentime (EXIF captured date)
          try {
            const byTakenUrl = `${cleanUrl}/webapi/entry.cgi?api=${itemsApiName}&version=1&method=list&offset=0&limit=1&folder_id=${encodeURIComponent(
              String(fId)
            )}&id_folder=${encodeURIComponent(
              String(fId)
            )}&sort_by=takentime&sort_direction=desc&additional=${encodeURIComponent(
              JSON.stringify(["thumbnail"])
            )}&_sid=${encodeURIComponent(sid)}`;
            const r2 = await fetch(byTakenUrl, { signal: AbortSignal.timeout(4000) });
            const d2 = await r2.json();
            if (d2.success && d2.data?.list?.length > 0) {
              return d2.data.list[0];
            }
          } catch {}

          // 3. Fallback to default newest item without explicit sort_by
          try {
            const defaultUrl = `${cleanUrl}/webapi/entry.cgi?api=${itemsApiName}&version=1&method=list&offset=0&limit=1&folder_id=${encodeURIComponent(
              String(fId)
            )}&id_folder=${encodeURIComponent(
              String(fId)
            )}&sort_direction=desc&additional=${encodeURIComponent(
              JSON.stringify(["thumbnail"])
            )}&_sid=${encodeURIComponent(sid)}`;
            const r3 = await fetch(defaultUrl, { signal: AbortSignal.timeout(3000) });
            const d3 = await r3.json();
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
                const subData = await subRes.json();
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
