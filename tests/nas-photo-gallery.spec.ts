import { test, expect } from "./fixtures";

test.describe("ระบบคลังภาพและสื่อราชการ Synology Photos (Media Gallery Integration)", () => {
  test("ควรแสดงหน้าคลังภาพและสื่อ พร้อมเกตเวย์ความปลอดภัยตามสิทธิ์ Synology Photos", async ({
    page,
  }) => {
    // 1. ไปที่หน้าหลัก
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 2. คลิกไปที่เมนู 'คลังภาพและสื่อ'
    const galleryNav = page
      .locator("aside button:has-text('คลังภาพและสื่อ'), nav button:has-text('คลังภาพและสื่อ')")
      .first();
    await expect(galleryNav).toBeVisible();
    await galleryNav.click();

    // 3. ตรวจสอบหัวข้อหลักของโมดูลและ IP เซิร์ฟเวอร์ NAS
    const heading = page.locator("h2:has-text('คลังภาพและสื่อราชการ (Synology Photos)')").first();
    await expect(heading).toBeVisible();

    const nasSecText = page.locator("text=พมจ.กำแพงเพชร").first();
    await expect(nasSecText).toBeVisible();

    // 4. ตรวจสอบเกตเวย์ความปลอดภัย: ต้องยืนยันตัวตนด้วยบัญชี Synology NAS
    const authGateNotice = page.locator("h3:has-text('กรุณายืนยันตัวตนเพื่อเปิดคลังภาพ Synology Photos')").first();
    await expect(authGateNotice).toBeVisible();

    // 5. เปิด Modal เชื่อมต่อบัญชี Synology DSM
    const connectBtn = page.locator("button:has-text('เข้าสู่ระบบเพื่อเปิดคลังภาพ')").first();
    await expect(connectBtn).toBeVisible();
    await connectBtn.click();

    const modalTitle = page.locator("h3:has-text('เข้าสู่ระบบ Synology Photos')").first();
    await expect(modalTitle).toBeVisible();

    // ปิด Modal
    const cancelBtn = page.locator("button:has-text('ยกเลิก')").first();
    await cancelBtn.click();
    await expect(modalTitle).toBeHidden();
  });

  test("เมื่อมีเซสชันบัญชี NAS แล้ว ควรแสดงแถบเครื่องมือ สลับ Space, แท็บฟิลเตอร์, และแกลเลอรีภาพพร้อม Lightbox", async ({
    page,
  }) => {
    // ดัก API call เพื่อจำลองรูปภาพจาก Synology Photos
    await page.route("**/api/nas/photos?*", async (route) => {
      const url = new URL(route.request().url());
      const action = url.searchParams.get("action");

      if (action === "list_folders") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            folders: [
              {
                id: 1,
                name: "โครงการ พมจ. 2569",
                item_count: 8,
                parent: 0,
              },
            ],
          }),
        });
      } else if (action === "list_albums") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            albums: [
              {
                id: 1,
                name: "กิจกรรม พมจ. กำแพงเพชร 2569",
                item_count: 12,
              },
            ],
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            items: [
              {
                id: 101,
                filename: "mso_activity_01.jpg",
                filesize: 2548120,
                time: Math.floor(Date.now() / 1000) - 3600,
                type: "photo",
                space: "shared",
                thumbnail: { cache_key: "ck_01" },
                additional: { resolution: { width: 1920, height: 1080 } },
              },
              {
                id: 102,
                filename: "mso_meeting_clip.mp4",
                filesize: 15481200,
                time: Math.floor(Date.now() / 1000) - 7200,
                type: "video",
                space: "shared",
                thumbnail: { cache_key: "ck_02" },
                additional: { resolution: { width: 1280, height: 720 } },
              },
            ],
            total: 2,
          }),
        });
      }
    });

    // ดัก Thumbnail route คืน SVG จําลองภาพ
    await page.route("**/api/nas/photos/thumbnail?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "image/svg+xml",
        body: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#0284c7"/></svg>`,
      });
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // กำหนดเซสชัน NAS ใน localStorage/sessionStorage ก่อนเปิดโมดูล
    await page.evaluate(() => {
      localStorage.setItem("omnioffice_nas_user_sid", "mock_valid_photos_sid");
      localStorage.setItem("omnioffice_nas_user_account", "itadmin");
      sessionStorage.setItem("omnioffice_nas_user_sid", "mock_valid_photos_sid");
      sessionStorage.setItem("omnioffice_nas_user_account", "itadmin");
    });

    // ไปที่คลังภาพและสื่อ
    const galleryNav = page
      .locator("aside button:has-text('คลังภาพและสื่อ'), nav button:has-text('คลังภาพและสื่อ')")
      .first();
    await galleryNav.click();

    // ตรวจสอบว่าแสดงบัญชีผู้ใช้
    const accountBadge = page.locator("div:has-text('itadmin')").first();
    await expect(accountBadge).toBeVisible();

    // ตรวจสอบ Space Switcher
    const sharedSpaceBtn = page.locator("button:has-text('พื้นที่ส่วนกลาง พมจ.')").first();
    await expect(sharedSpaceBtn).toBeVisible();

    const personalSpaceBtn = page.locator("button:has-text('พื้นที่ส่วนตัว')").first();
    await expect(personalSpaceBtn).toBeVisible();

    // ตรวจสอบแท็บประเภทสื่อ
    const foldersTab = page.locator("button:has-text('โฟลเดอร์กิจกรรม')").first();
    await expect(foldersTab).toBeVisible();

    const allTab = page.locator("button:has-text('ทั้งหมด')").first();
    await expect(allTab).toBeVisible();
    await allTab.click();

    const photosTab = page.locator("button:has-text('รูปภาพ')").first();
    await expect(photosTab).toBeVisible();

    const albumsTab = page.locator("button:has-text('อัลบั้ม')").first();
    await expect(albumsTab).toBeVisible();

    // ตรวจสอบว่าแสดงรายการรูปภาพ
    const photoCard = page.locator("text=mso_activity_01.jpg").first();
    await expect(photoCard).toBeVisible();

    // ตรวจสอบว่าแสดงป้ายกำกับวิดีโอ
    const videoBadge = page.locator("text=วิดีโอ").first();
    await expect(videoBadge).toBeVisible();

    // คลิกเพื่อเปิด Lightbox
    await photoCard.click();

    // ตรวจสอบหัวข้อ Lightbox และปุ่มดาวน์โหลดต้นฉบับ
    const lightboxTitle = page.locator("div:has-text('mso_activity_01.jpg')").first();
    await expect(lightboxTitle).toBeVisible();

    const downloadBtn = page.locator("a:has-text('ดาวน์โหลดต้นฉบับ')").first();
    await expect(downloadBtn).toBeVisible();

    // ปิด Lightbox
    const closeLightboxBtn = page.locator("button[title*='ปิดหน้าต่าง']").first();
    await closeLightboxBtn.click();
    await expect(downloadBtn).toBeHidden();
  });

  test("เมื่อพบข้อผิดพลาด Code 801 (Shared Space ยังไม่เปิด) ควรแสดงคำแนะนำ สลับพื้นที่ และเปิดดูคู่มือตั้งค่า DSM ได้", async ({
    page,
  }) => {
    // ดัก API ให้คืน Code 801 เมื่อเรียก Shared Space และ Personal Space
    await page.route("**/api/nas/photos?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          code: 801,
          error:
            "ยังไม่ได้เปิดใช้งานพื้นที่ส่วนกลาง (Shared Space) หรือบัญชีนี้ยังไม่ได้รับสิทธิ์เข้าถึงใน Synology Photos (แนะนำ: สลับไปที่ 'พื้นที่ส่วนบุคคล' หรือเปิดใช้งาน Shared Space ในการตั้งค่า Synology Photos บน DSM)",
        }),
      });
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // จำลองเซสชัน
    await page.evaluate(() => {
      localStorage.setItem("omnioffice_nas_user_sid", "mock_photos_sid");
      localStorage.setItem("omnioffice_nas_user_account", "itadmin");
      sessionStorage.setItem("omnioffice_nas_user_sid", "mock_photos_sid");
      sessionStorage.setItem("omnioffice_nas_user_account", "itadmin");
    });

    const galleryNav = page
      .locator("aside button:has-text('คลังภาพและสื่อ'), nav button:has-text('คลังภาพและสื่อ')")
      .first();
    await galleryNav.click();

    // ตรวจสอบว่ามีกล่องแจ้งเตือนพร้อม Code 801
    const errorBanner = page.locator("text=Code 801").first();
    await expect(errorBanner).toBeVisible();

    // ตรวจสอบปุ่มสลับไปยังพื้นที่ส่วนบุคคล
    const switchToPersonalBtn = page.locator("button:has-text('สลับไปยังพื้นที่ส่วนบุคคล')").first();
    await expect(switchToPersonalBtn).toBeVisible();

    // ตรวจสอบปุ่มเปิดคู่มือ DSM
    const guideBtn = page.locator("button:has-text('วิธีเปิดใช้งาน Shared Space บน Synology DSM')").first();
    await expect(guideBtn).toBeVisible();

    // คลิกเปิดคู่มือ
    await guideBtn.click();
    const dsmGuideContent = page.locator("text=ขั้นตอนการเปิดใช้งาน Shared Space สำหรับผู้ดูแลระบบ Synology (DSM)").first();
    await expect(dsmGuideContent).toBeVisible();
  });

  test("ระบบแยกอัลบั้มตามโฟลเดอร์กิจกรรม (Folder Albums): ควรแสดงการ์ดโฟลเดอร์ คลิกเปิดโฟลเดอร์ และนำทางด้วย Breadcrumbs ได้", async ({
    page,
  }) => {
    await page.route("**/api/nas/photos?*", async (route) => {
      const url = new URL(route.request().url());
      const action = url.searchParams.get("action");

      if (action === "list_folders") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            folders: [
              {
                id: 101,
                name: "โครงการพัฒนาสตรี 2569",
                item_count: 14,
                parent: 0,
              },
            ],
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            items: [
              {
                id: 501,
                filename: "women_dev_01.jpg",
                filesize: 1024000,
                time: Math.floor(Date.now() / 1000),
                type: "photo",
                space: "shared",
              },
            ],
            total: 1,
          }),
        });
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.evaluate(() => {
      localStorage.setItem("omnioffice_nas_user_sid", "mock_photos_sid");
      localStorage.setItem("omnioffice_nas_user_account", "itadmin");
      sessionStorage.setItem("omnioffice_nas_user_sid", "mock_photos_sid");
      sessionStorage.setItem("omnioffice_nas_user_account", "itadmin");
    });

    const galleryNav = page
      .locator("aside button:has-text('คลังภาพและสื่อ'), nav button:has-text('คลังภาพและสื่อ')")
      .first();
    await galleryNav.click();

    // ตรวจสอบว่าแสดงโฟลเดอร์กิจกรรม
    const folderCard = page.locator("text=โครงการพัฒนาสตรี 2569").first();
    await expect(folderCard).toBeVisible();

    const itemCountBadge = page.locator("text=14 รายการ").first();
    await expect(itemCountBadge).toBeVisible();

    // คลิกเปิดโฟลเดอร์
    await folderCard.click();

    // ตรวจสอบ Breadcrumb ของโฟลเดอร์
    const breadcrumbName = page.locator("button:has-text('โครงการพัฒนาสตรี 2569')").first();
    await expect(breadcrumbName).toBeVisible();

    // ตรวจสอบปุ่มย้อนกลับ
    const backBtn = page.locator("button:has-text('ย้อนกลับ')").first();
    await expect(backBtn).toBeVisible();

    // ตรวจสอบรูปภาพในโฟลเดอร์
    const innerPhoto = page.locator("text=women_dev_01.jpg").first();
    await expect(innerPhoto).toBeVisible();

    // กดย้อนกลับ
    await backBtn.click();
    await expect(folderCard).toBeVisible();
  });

  test("ฟีเจอร์ระดับ Synology Photos: ไทม์ไลน์ (Timeline View), แถบ Batch Action, ปรับขนาดกริด S/M/L, และ Lightbox EXIF Inspector", async ({
    page,
  }) => {
    // ดัก API จำลองภาพพร้อมข้อมูล EXIF ละเอียด
    await page.route("**/api/nas/photos?*", async (route) => {
      const url = new URL(route.request().url());
      const action = url.searchParams.get("action");

      if (action === "list_folders") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, folders: [] }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            items: [
              {
                id: 201,
                filename: "ceremony_kamphaengphet_01.jpg",
                filesize: 3450000,
                time: 1776240000, // April 2026
                type: "photo",
                space: "shared",
                thumbnail: { cache_key: "ck_ceremony" },
                additional: {
                  resolution: { width: 3840, height: 2160 },
                  exif: {
                    camera: "EOS R5",
                    camera_maker: "Canon",
                    lens: "RF 24-70mm F2.8 L IS USM",
                    f_number: 2.8,
                    exposure_time: "1/250",
                    iso: 400,
                    focal_length: 50,
                  },
                  address: {
                    route: "ถนนราชดำเนิน",
                    district: "เมืองกำแพงเพชร",
                    city: "กำแพงเพชร",
                    country: "ไทย",
                  },
                  tag: ["งานพิธี", "พมจ"],
                  description: "ภาพพิธีมอบทุนการศึกษา",
                },
              },
              {
                id: 202,
                filename: "ceremony_kamphaengphet_02.jpg",
                filesize: 2800000,
                time: 1776243600,
                type: "photo",
                space: "shared",
                thumbnail: { cache_key: "ck_ceremony_2" },
                additional: {
                  resolution: { width: 1920, height: 1080 },
                },
              },
            ],
            total: 2,
          }),
        });
      }
    });

    await page.route("**/api/nas/photos/thumbnail?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "image/svg+xml",
        body: `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#0891b2"/></svg>`,
      });
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.evaluate(() => {
      localStorage.setItem("omnioffice_nas_user_sid", "mock_photos_sid");
      localStorage.setItem("omnioffice_nas_user_account", "itadmin");
      sessionStorage.setItem("omnioffice_nas_user_sid", "mock_photos_sid");
      sessionStorage.setItem("omnioffice_nas_user_account", "itadmin");
    });

    const galleryNav = page
      .locator("aside button:has-text('คลังภาพและสื่อ'), nav button:has-text('คลังภาพและสื่อ')")
      .first();
    await galleryNav.click();

    // 1. ตรวจสอบปุ่มเครื่องมือระดับ Synology Photos (Upload, Sort, Grid Size S/M/L)
    const uploadBtn = page.locator("button:has-text('อัปโหลดภาพ')").first();
    await expect(uploadBtn).toBeVisible();

    const sortSelect = page.locator("select").first();
    await expect(sortSelect).toBeVisible();

    const gridSizeSm = page.locator("button[title*='กริดขนาดเล็ก']").first();
    await expect(gridSizeSm).toBeVisible();
    await gridSizeSm.click();

    const gridSizeLg = page.locator("button[title*='กริดขนาดใหญ่']").first();
    await expect(gridSizeLg).toBeVisible();
    await gridSizeLg.click();

    // 2. สลับไปที่แท็บ 'ไทม์ไลน์' (Timeline View)
    const timelineTab = page.locator("button:has-text('ไทม์ไลน์')").first();
    await expect(timelineTab).toBeVisible();
    await timelineTab.click();

    // ตรวจสอบ Sticky Month Header
    const monthHeader = page.locator("text=2569").first();
    await expect(monthHeader).toBeVisible();

    // 3. ทดสอบ Multi-Selection Mode & Floating Batch Action Bar
    const selectModeBtn = page.locator("button:has-text('เลือกหลายรูป')").first();
    await expect(selectModeBtn).toBeVisible();
    await selectModeBtn.click();

    // คลิกเลือกภาพแรก
    const firstCheckbox = page.locator("div[title='เลือกรูปนี้']").first();
    await expect(firstCheckbox).toBeVisible();
    await firstCheckbox.click();

    // ตรวจสอบการปรากฏของ Floating Batch Action Bar
    const batchBar = page.locator("text=เลือกแล้ว 1 รายการ").first();
    await expect(batchBar).toBeVisible();

    const batchDownloadBtn = page.locator("button:has-text('ดาวน์โหลดที่เลือก')").first();
    await expect(batchDownloadBtn).toBeVisible();

    // ล้างการเลือก
    const clearSelectionBtn = page.locator("button:has-text('ล้างการเลือก')").first();
    await clearSelectionBtn.click();
    await expect(batchBar).toBeHidden();

    // ปิดโหมดเลือกหลายรูป
    const exitSelectBtn = page.locator("button:has-text('เลือกอยู่')").first();
    await exitSelectBtn.click();

    // 4. ทดสอบ Lightbox Pro และ EXIF Info Inspector
    const photoCard = page.locator("text=ceremony_kamphaengphet_01.jpg").first();
    await photoCard.click();

    // ตรวจสอบปุ่ม Pro Toolbar ใน Lightbox
    const rotateBtn = page.locator("button[title*='หมุนภาพ']").first();
    await expect(rotateBtn).toBeVisible();
    await rotateBtn.click(); // หมุน 90 องศา

    const zoomReset = page.locator("span[title*='รีเซ็ต 100%']").first();
    await expect(zoomReset).toBeVisible();

    const slideshowBtn = page.locator("button[title*='สไลด์โชว์']").first();
    await expect(slideshowBtn).toBeVisible();

    // เปิด Info Inspector Panel (EXIF)
    const exifToggleBtn = page.locator("button[title*='Info Inspector']").first();
    await expect(exifToggleBtn).toBeVisible();
    await exifToggleBtn.click();

    // ตรวจสอบข้อมูลใน Info Inspector Panel
    const inspectorTitle = page.locator("h4:has-text('ข้อมูลภาพถ่าย (Inspector)')").first();
    await expect(inspectorTitle).toBeVisible();

    const cameraModel = page.locator("text=Canon EOS R5").first();
    await expect(cameraModel).toBeVisible();

    const lensModel = page.locator("text=RF 24-70mm F2.8 L IS USM").first();
    await expect(lensModel).toBeVisible();

    const fNumber = page.locator("text=f/2.8").first();
    await expect(fNumber).toBeVisible();

    const isoValue = page.locator("text=400").first();
    await expect(isoValue).toBeVisible();

    const addressLocation = page.locator("text=ถนนราชดำเนิน, เมืองกำแพงเพชร, กำแพงเพชร, ไทย").first();
    await expect(addressLocation).toBeVisible();

    // ปิด Lightbox
    const closeBtn = page.locator("button[title*='ปิดหน้าต่าง']").first();
    await closeBtn.click();
    await expect(inspectorTitle).toBeHidden();
  });
});


