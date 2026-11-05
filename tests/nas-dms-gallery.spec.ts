import { test, expect } from "./fixtures";

test.describe("ระบบคลังเอกสาร DMS และแกลเลอรีภาพถ่ายราชการบน Synology NAS (DMS & Gallery Enhancements)", () => {
  test.beforeEach(async ({ page }) => {
    // กำหนดเซสชัน NAS ใน localStorage/sessionStorage ก่อนเข้าหน้า
    await page.addInitScript(() => {
      window.localStorage.setItem("smartmso_nas_user_sid", "mock_valid_dsm_sid");
      window.localStorage.setItem("smartmso_nas_user_account", "itadmin");
      window.sessionStorage.setItem("smartmso_nas_user_sid", "mock_valid_dsm_sid");
      window.sessionStorage.setItem("smartmso_nas_user_account", "itadmin");
      window.localStorage.setItem("omnioffice_nas_user_sid", "mock_valid_dsm_sid");
      window.localStorage.setItem("omnioffice_nas_user_account", "itadmin");
      window.sessionStorage.setItem("omnioffice_nas_user_sid", "mock_valid_dsm_sid");
      window.sessionStorage.setItem("omnioffice_nas_user_account", "itadmin");
    });
  });

  test("1. คลังเอกสาร NAS DMS: ควรแสดงตัวกรองประเภทไฟล์ และตัวกรองปีงบประมาณ พ.ศ. ครบถ้วน", async ({
    page,
  }) => {
    await page.route("**/api/nas/files*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          shares: [
            { path: "/documents_2569", name: "documents_2569", isdir: true, size: 0 },
            { path: "/reports_2568", name: "reports_2568", isdir: true, size: 0 },
            { path: "/general_files", name: "general_files", isdir: true, size: 0 },
          ],
        }),
      });
    });

    await page.goto("/files");
    await page.waitForLoadState("networkidle");

    // 1. ตรวจสอบปุ่มตัวกรองประเภทไฟล์
    await expect(page.locator("button:has-text('PDF / เอกสาร')").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("button:has-text('Excel / สเปรดชีต')").first()).toBeVisible();
    await expect(page.locator("button:has-text('รูปภาพ / วิดีโอ')").first()).toBeVisible();
    await expect(page.locator("button:has-text('ZIP / บีบอัด')").first()).toBeVisible();

    // 2. ตรวจสอบปุ่มตัวกรองปีงบประมาณ พ.ศ.
    await expect(page.locator("button:has-text('ปี ๒๕๗๐')").first()).toBeVisible();
    await expect(page.locator("button:has-text('ปี ๒๕๖๙')").first()).toBeVisible();
    await expect(page.locator("button:has-text('ปี ๒๕๖๘')").first()).toBeVisible();

    // 3. ทดสอบการกรองปี ๒๕๖๙: ควรแสดง documents_2569 และซ่อน reports_2568
    await page.locator("button:has-text('ปี ๒๕๖๙')").first().click();
    await expect(page.locator("text=documents_2569").first()).toBeVisible();
    await expect(page.locator("text=reports_2568")).toBeHidden();

    // 4. สลับกลับเป็น 'ทุกปีงบ': ต้องแสดงทั้งสองโฟลเดอร์
    await page.locator("button:has-text('ทุกปีงบ')").first().click();
    await expect(page.locator("text=documents_2569").first()).toBeVisible();
    await expect(page.locator("text=reports_2568").first()).toBeVisible();
  });

  test("2. คลังเอกสาร NAS DMS: การสร้างโฟลเดอร์ใหม่มีทางลัดปีงบประมาณ พ.ศ. และ 8 กลุ่มภารกิจ พมจ.กำแพงเพชร", async ({
    page,
  }) => {
    // จำลองเมื่ออยู่ใน subfolder
    await page.route("**/api/nas/files*", async (route) => {
      const url = new URL(route.request().url());
      const folderPath = url.searchParams.get("folder_path");
      if (folderPath) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            files: [],
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            shares: [{ path: "/work_mission", name: "work_mission", isdir: true, size: 0 }],
          }),
        });
      }
    });

    await page.goto("/files");
    await page.waitForLoadState("networkidle");

    // คลิกเปิดแชร์เพื่อเข้าไปยังโฟลเดอร์
    const shareFolder = page.locator("text=work_mission").first();
    await expect(shareFolder).toBeVisible({ timeout: 10000 });
    await shareFolder.click();

    // กดปุ่ม 'สร้างโฟลเดอร์'
    const newFolderBtn = page.locator("button:has-text('สร้างโฟลเดอร์')").first();
    await expect(newFolderBtn).toBeVisible({ timeout: 10000 });
    await newFolderBtn.click();

    // ตรวจสอบ Modal สร้างโฟลเดอร์
    const modalTitle = page.locator("h3:has-text('สร้างโฟลเดอร์ใหม่บน NAS')").first();
    await expect(modalTitle).toBeVisible();

    // ตรวจสอบปุ่มทางลัดปีงบประมาณ
    const yearPresetBtn = page.locator("button:has-text('+ ปี 2569')").first();
    await expect(yearPresetBtn).toBeVisible();

    // ตรวจสอบปุ่มทางลัดกลุ่มภารกิจ พมจ.กำแพงเพชร
    const missionPresetBtn = page.locator("button:has-text('กลุ่มเปราะบาง/ศรส.')").first();
    await expect(missionPresetBtn).toBeVisible();

    // คลิกเลือกทางลัดกลุ่มภารกิจ และปีงบประมาณ
    await missionPresetBtn.click();
    await yearPresetBtn.click();

    // ตรวจสอบค่าใน input
    const input = page.locator("input[placeholder*='รายงานประจำปี 2569']").first();
    const val = await input.inputValue();
    expect(val).toContain("กลุ่มเปราะบาง/ศรส.");
    expect(val).toContain("2569");

    // ปิด Modal
    await page.locator("button:has-text('ยกเลิก')").first().click();
    await expect(modalTitle).toBeHidden();
  });

  test("3. แกลเลอรีภาพถ่าย Synology Photos: ควรแสดงตัวกรองปีงบประมาณ พ.ศ. และทางลัดกลุ่มภารกิจในโมดูลสร้างโฟลเดอร์/อัลบั้ม", async ({
    page,
  }) => {
    // ดัก API Photos ให้ส่ง folders สำหรับ list_folders
    await page.route("**/api/nas/photos*", async (route) => {
      const url = new URL(route.request().url());
      const action = url.searchParams.get("action");
      if (action === "list_folders") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            folders: [
              { id: 101, name: "2569-กิจกรรมวันเด็ก", item_count: 5 },
              { id: 102, name: "2568-มอบบ้านพอเพียง", item_count: 12 },
            ],
            total: 2,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            items: [],
            total: 0,
          }),
        });
      }
    });

    await page.goto("/gallery");
    await page.waitForLoadState("networkidle");

    // 1. ตรวจสอบชิปกรองปีงบประมาณ พ.ศ. ในหน้าแกลเลอรี
    await expect(page.locator("button:has-text('ปี ๒๕๗๐')").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("button:has-text('ปี ๒๕๖๙')").first()).toBeVisible();
    await expect(page.locator("button:has-text('ปี ๒๕๖๘')").first()).toBeVisible();

    // 2. ทดสอบกรองปี ๒๕๖๙: ต้องแสดงโฟลเดอร์ 2569 และซ่อน 2568
    await page.locator("button:has-text('ปี ๒๕๖๙')").first().click();
    await expect(page.locator("text=2569-กิจกรรมวันเด็ก").first()).toBeVisible();
    await expect(page.locator("text=2568-มอบบ้านพอเพียง")).toBeHidden();

    // 3. กดปุ่ม 'สร้างโฟลเดอร์ใหม่'
    const createFolderBtn = page.locator("button:has-text('+ สร้างโฟลเดอร์ใหม่')").first();
    await expect(createFolderBtn).toBeVisible();
    await createFolderBtn.click();

    // ตรวจสอบ Modal และปุ่มทางลัด
    const folderModal = page.locator("h3:has-text('สร้างโฟลเดอร์กิจกรรมใหม่')").first();
    await expect(folderModal).toBeVisible();

    const yrBtn = page.locator("form button:has-text('+ ปี 2569')").first();
    await expect(yrBtn).toBeVisible();
    await yrBtn.click();

    const msoChildBtn = page.locator("form button:has-text('เงินอุดหนุนเด็ก')").first();
    await expect(msoChildBtn).toBeVisible();
    await msoChildBtn.click();

    const folderInput = page.locator("input[placeholder*='2569-กิจกรรมมอบถุงยังชีพ']").first();
    const folderVal = await folderInput.inputValue();
    expect(folderVal).toContain("2569");
    expect(folderVal).toContain("เงินอุดหนุนเด็ก");

    // ปิด Modal
    await page.locator("form button:has-text('ยกเลิก')").first().click();
    await expect(folderModal).toBeHidden();
  });
});
