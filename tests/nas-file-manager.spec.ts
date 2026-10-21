import { test, expect } from "./fixtures";

test.describe("ระบบคลังเอกสาร Synology NAS (NAS File Station Integration)", () => {
  test("ควรแสดงหน้าคลังเอกสาร NAS และเกตเวย์ความปลอดภัยตามสิทธิ์ Synology DSM ACL", async ({
    page,
  }) => {
    // 1. ไปที่หน้าหลัก
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 2. คลิกไปที่เมนู 'คลังเอกสาร NAS'
    const nasNav = page
      .locator("aside button:has-text('คลังเอกสาร NAS'), nav button:has-text('คลังเอกสาร NAS')")
      .first();
    await expect(nasNav).toBeVisible();
    await nasNav.click();

    // 3. ตรวจสอบหัวข้อหลักของโมดูลและ IP เซิร์ฟเวอร์ NAS
    const heading = page.locator("h2:has-text('คลังเอกสารราชการ (Synology File Station)')").first();
    await expect(heading).toBeVisible();

    const nasSecText = page.locator("text=พมจ.กำแพงเพชร").first();
    await expect(nasSecText).toBeVisible();

    // 4. ตรวจสอบเกตเวย์ความปลอดภัย: ต้องยืนยันตัวตนด้วยบัญชี Synology NAS ตามสิทธิ์ DSM
    const authGateNotice = page.locator("h3:has-text('กรุณายืนยันตัวตนด้วยบัญชี Synology NAS')").first();
    await expect(authGateNotice).toBeVisible();

    // 5. เปิด Modal เชื่อมต่อบัญชี Synology DSM
    const connectBtn = page.locator("button:has-text('เข้าสู่ระบบเพื่อเปิดคลังเอกสาร')").first();
    await expect(connectBtn).toBeVisible();
    await connectBtn.click();

    const modalTitle = page.locator("h3:has-text('เข้าสู่ระบบด้วยบัญชี Synology NAS')").first();
    await expect(modalTitle).toBeVisible();

    // มีช่องกรอก username & password ของ NAS
    const usernameInput = page.locator("input[placeholder*='admin']").first();
    await expect(usernameInput).toBeVisible();

    const submitBtn = page.locator("button:has-text('ยืนยันและดึงสิทธิ์')").first();
    await expect(submitBtn).toBeVisible();

    // ปิด Modal
    const cancelBtn = page.locator("button:has-text('ยกเลิก')").first();
    await cancelBtn.click();
    await expect(modalTitle).toBeHidden();
  });

  test("เมื่อมีเซสชันบัญชี NAS แล้ว ควรแสดงแถบเครื่องมือ Breadcrumb, ค้นหา, และรายการ Shared Folders ที่ได้รับสิทธิ์", async ({
    page,
  }) => {
    // ดัก API call เพื่อจำลอง DSM API ส่ง Shared Folders ตามสิทธิ์ผู้ใช้
    await page.route("**/api/nas/files*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          shares: [
            {
              path: "/public-documents",
              name: "public-documents",
              isdir: true,
              size: 0,
            },
            {
              path: "/strategy-plans",
              name: "strategy-plans",
              isdir: true,
              size: 0,
            },
          ],
        }),
      });
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // กำหนดเซสชัน NAS ใน localStorage/sessionStorage ก่อนเปิดโมดูล
    await page.evaluate(() => {
      localStorage.setItem("smartmso_nas_user_sid", "mock_valid_dsm_sid");
      localStorage.setItem("smartmso_nas_user_account", "itadmin");
      sessionStorage.setItem("smartmso_nas_user_sid", "mock_valid_dsm_sid");
      sessionStorage.setItem("smartmso_nas_user_account", "itadmin");
      localStorage.setItem("omnioffice_nas_user_sid", "mock_valid_dsm_sid");
      localStorage.setItem("omnioffice_nas_user_account", "itadmin");
      sessionStorage.setItem("omnioffice_nas_user_sid", "mock_valid_dsm_sid");
      sessionStorage.setItem("omnioffice_nas_user_account", "itadmin");
    });

    // ไปที่คลังเอกสาร NAS
    const nasNav = page
      .locator("aside button:has-text('คลังเอกสาร NAS'), nav button:has-text('คลังเอกสาร NAS')")
      .first();
    await nasNav.click();

    // ตรวจสอบว่าแสดงบัญชีผู้ใช้ NAS ปัจจุบัน
    const accountBadge = page.locator("div:has-text('itadmin')").first();
    await expect(accountBadge).toBeVisible();

    // ตรวจสอบเครื่องมือ Breadcrumbs และการค้นหา
    const breadcrumbRoot = page.locator("button:has-text('โฟลเดอร์ที่ได้รับสิทธิ์')").first();
    await expect(breadcrumbRoot).toBeVisible();

    const searchInput = page.locator("input[placeholder*='ค้นหาในโฟลเดอร์']").first();
    await expect(searchInput).toBeVisible();

    const switchAccountBtn = page.locator("button:has-text('สลับบัญชี')").first();
    await expect(switchAccountBtn).toBeVisible();

    // ตรวจสอบว่าแสดง Shared Folders ที่ได้รับสิทธิ์จาก Synology File Station
    const shareItem1 = page.locator("text=public-documents").first();
    await expect(shareItem1).toBeVisible();

    const shareItem2 = page.locator("text=strategy-plans").first();
    await expect(shareItem2).toBeVisible();
  });

  test("การพรีวิวไฟล์และดูวิดีโอ (Inline Video / Media Player): สามารถกด 'เปิดดู' วิดีโอ .mp4 และแสดง HTML5 video player", async ({
    page,
  }) => {
    // ดัก API จำลองรายการไฟล์ในโฟลเดอร์ มีไฟล์วิดีโอและเอกสาร
    await page.route("**/api/nas/files*", async (route) => {
      const url = new URL(route.request().url());
      const folderPath = url.searchParams.get("folder_path");
      if (folderPath) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            files: [
              {
                path: "/public-documents/presentation_2569.mp4",
                name: "presentation_2569.mp4",
                isdir: false,
                size: 15 * 1024 * 1024,
              },
              {
                path: "/public-documents/annual_report.pdf",
                name: "annual_report.pdf",
                isdir: false,
                size: 2 * 1024 * 1024,
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
            shares: [
              {
                path: "/public-documents",
                name: "public-documents",
                isdir: true,
                size: 0,
              },
            ],
          }),
        });
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.evaluate(() => {
      localStorage.setItem("omnioffice_nas_user_sid", "mock_valid_dsm_sid");
      localStorage.setItem("omnioffice_nas_user_account", "itadmin");
      sessionStorage.setItem("omnioffice_nas_user_sid", "mock_valid_dsm_sid");
      sessionStorage.setItem("omnioffice_nas_user_account", "itadmin");
    });

    const nasNav = page
      .locator("aside button:has-text('คลังเอกสาร NAS'), nav button:has-text('คลังเอกสาร NAS')")
      .first();
    await nasNav.click();

    // 1. คลิกเปิดโฟลเดอร์แชร์ public-documents
    const shareFolder = page.locator("text=public-documents").first();
    await expect(shareFolder).toBeVisible();
    await shareFolder.click();

    // 2. ตรวจสอบว่ามีแถวไฟล์วิดีโอ presentation_2569.mp4 และไอคอน 🎥
    const videoRow = page.locator("tr:has-text('presentation_2569.mp4')").first();
    await expect(videoRow).toBeVisible();
    await expect(videoRow.locator("text=🎥")).toBeVisible();

    // กดปุ่ม 'เปิดดู' ในแถววิดีโอ
    const previewBtn = videoRow.locator("button:has-text('เปิดดู')").first();
    await previewBtn.click();

    // ตรวจสอบว่าเปิด Modal พรีวิว และมีแท็ก <video>
    const videoModal = page.locator("div.fixed:has-text('presentation_2569.mp4')").first();
    await expect(videoModal).toBeVisible();
    await expect(videoModal.locator("span:has-text('วิดีโอ')")).toBeVisible();

    const videoElement = videoModal.locator("video").first();
    await expect(videoElement).toBeVisible();
    const videoSrc = await videoElement.getAttribute("src");
    expect(videoSrc).toContain("/api/nas/download");
    expect(videoSrc).toContain("mode=open");
    expect(videoSrc).toContain("presentation_2569.mp4");

    // ปิด Modal
    const closeBtn = videoModal.locator("button:has-text('✕')").first();
    await closeBtn.click();
    await expect(videoElement).toBeHidden();
  });
});

