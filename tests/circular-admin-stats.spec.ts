import { test, expect } from "./fixtures";

test.describe("Circular Documents - Exclude Admin from Statistics", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/rest/v1/circular_documents*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "circ_test_stats_001",
            doc_number: "พม ๐๐๐๕/ว ๑๐๑",
            title: "หนังสือเวียนทดสอบระบบสถิติ",
            issued_date: "๒๖ ตุลาคม ๒๕๖๙",
            sender_org: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์",
            urgency: "normal",
            secret_level: "normal",
            summary: "เอกสารทดสอบการคำนวณสถิติและข้อยกเว้น Admin",
            created_by: "usr_2",
            created_by_name: "นายเสกพล ดิษฐโชติ",
            created_at: new Date().toISOString(),
            target_criteria: { scope: "all" },
            recipients: [
              {
                memberId: "usr_3",
                memberName: "นางอรัญญา เกิดสุข",
                division: "กลุ่มนโยบายและวิชาการ",
                personnelType: "ข้าราชการ",
                position: "นักวิเคราะห์นโยบายและแผนชำนาญการ",
                isAcknowledged: false,
              },
              {
                memberId: "usr_4",
                memberName: "นายธีรเดช สมหวัง",
                division: "ฝ่ายบริหารทั่วไป",
                personnelType: "พนักงานราชการ",
                position: "เจ้าหน้าที่พัฒนาสังคม",
                isAcknowledged: false,
              },
            ],
            total_count: 2,
            acknowledged_count: 0,
            status: "active",
          },
        ]),
      });
    });
    await page.goto("http://localhost:3000");
  });

  test("Admin user does not have pending signatures counted and is excluded from stats", async ({
    page,
  }) => {
    // 1. Check Dashboard - For Admin user, Stat 2 text should indicate Admin exemption
    const adminStatText = page.locator("text=หนังสือเวียน (ไม่คิดสถิติ Admin)").first();
    await expect(adminStatText).toBeVisible();

    // 2. Navigate to Circular Documents page by clicking the widget or sidebar nav
    await adminStatText.click();

    // 3. Verify Circular Page header
    await expect(page.locator("text=ระบบเวียนหนังสือราชการอิเล็กทรอนิกส์").first()).toBeVisible();

    // 4. Check personal stats in Circular Page for Admin
    // Personal stat 3: รอคุณลงนาม should display "- (ยกเว้นสิทธิ์ Admin)"
    const myPendingStat = page.locator("text=ยกเว้นสิทธิ์ Admin").first();
    await expect(myPendingStat).toBeVisible();

    // Personal stat 4: ลงนามแล้ว should display "- (ไม่นับสถิติ Admin)"
    const myAckedStat = page.locator("text=ไม่นับสถิติ Admin").first();
    await expect(myAckedStat).toBeVisible();

    // 5. Open first circular document viewer in-page
    const firstDocCard = page.locator('[data-testid^="circular-doc-card-"]').first();
    await expect(firstDocCard).toBeVisible();
    await firstDocCard.click();

    // 6. In view, Admin should see exemption banner instead of signing prompt
    const adminBanner = page.locator("text=สิทธิ์ผู้ดูแลระบบ (ไม่คิดสถิติการรับทราบ)").first();
    await expect(adminBanner).toBeVisible();

    // 7. Click Tracking Matrix tab and check progress note
    const trackingTab = page.locator('button:has-text("สถานะการลงนาม / รายชื่อ")').first();
    if (await trackingTab.isVisible()) {
      await trackingTab.click();
      await expect(page.locator("text=ไม่นับสิทธิ์ Admin").first()).toBeVisible();
    }
  });
});
