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

    const nasIpText = page.locator("text=192.168.162.21").first();
    await expect(nasIpText).toBeVisible();

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

      if (action === "list_albums") {
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
});

