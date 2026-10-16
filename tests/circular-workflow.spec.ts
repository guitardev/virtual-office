import { test, expect } from "./fixtures";

test.describe("Government Circular Document & E-Acknowledgment Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should navigate to Circular module and display dashboard metrics", async ({ page }) => {
    // Click on Circular module in sidebar
    const circularNav = page.locator("button", { hasText: "เวียนหนังสือราชการ" }).first();
    await expect(circularNav).toBeVisible();
    await circularNav.click();

    // Verify header title
    const headerTitle = page.locator("h1", { hasText: "ระบบเวียนหนังสือราชการอิเล็กทรอนิกส์" });
    await expect(headerTitle).toBeVisible();

    // Verify stats cards
    await expect(page.locator("p", { hasText: "หนังสือเวียนทั้งหมด" }).first()).toBeVisible();
    await expect(page.locator("p", { hasText: "รอฉันลงนามรับทราบ" }).first()).toBeVisible();
    await expect(page.locator("p", { hasText: "ฉันรับทราบแล้ว" }).first()).toBeVisible();
    await expect(page.locator("p", { hasText: "อัตราการรับทราบเฉลี่ย" }).first()).toBeVisible();
  });

  test("should open document viewer and trigger digital signature", async ({ page }) => {
    const circularNav = page.locator("button", { hasText: "เวียนหนังสือราชการ" }).first();
    await circularNav.click();

    // Switch to "หนังสือเวียนทั้งหมด" tab
    const allTab = page.locator("button", { hasText: "หนังสือเวียนทั้งหมด" });
    await allTab.click();

    // Click on the first document "เปิดอ่าน" or "ลงนาม" button
    const openDocBtn = page.locator("div.grid button", { hasText: /เปิดอ่าน|ลงนาม/ }).first();
    await expect(openDocBtn).toBeVisible();
    await openDocBtn.click();

    // Verify document viewer modal is open
    const modalBackdrop = page.locator("div.fixed.z-50");
    await expect(modalBackdrop).toBeVisible();

    // If "ลงนามดิจิทัลรับทราบ" is visible, test opening signature pad
    const signBtn = modalBackdrop.locator("button", { hasText: "ลงนามดิจิทัลรับทราบ" });
    if (await signBtn.isVisible()) {
      await signBtn.click();
      // Verify digital signature pad
      await expect(page.locator("text=ลงลายมือชื่อดิจิทัลและบันทึกข้อสั่งการ")).toBeVisible();
      // Close signature pad
      await page.locator("button", { hasText: "ยกเลิก" }).click();
    }

    // Close document viewer with close X button
    const closeViewerBtn = modalBackdrop.locator("button:has-text('✕')").first();
    await closeViewerBtn.click();
    await expect(modalBackdrop).not.toBeVisible();
  });

  test("should open and display official printable circulation slip", async ({ page }) => {
    const circularNav = page.locator("button", { hasText: "เวียนหนังสือราชการ" }).first();
    await circularNav.click();

    const allTab = page.locator("button", { hasText: "หนังสือเวียนทั้งหมด" });
    await allTab.click();

    // Click "พิมพ์ใบเวียน" button
    const printBtn = page.locator("button[title*='พิมพ์ใบปะหน้าเวียน']").first();
    await expect(printBtn).toBeVisible();
    await printBtn.click();

    const modalBackdrop = page.locator("div.fixed.z-50");
    await expect(modalBackdrop).toBeVisible();

    // Verify print slip modal contains Garuda crest and official title
    await expect(modalBackdrop.locator("text=ใบสรุปผลการเวียนหนังสือราชการและบัญชีลงนามรับทราบ")).toBeVisible();
    await expect(modalBackdrop.locator("text=บันทึกผลการเวียนหนังสือราชการและหลักฐานการรับทราบ")).toBeVisible();

    // Close print slip
    const closeBtn = modalBackdrop.locator("button:has-text('✕')").first();
    await closeBtn.click();
    await expect(modalBackdrop).not.toBeVisible();
  });

  test("should open new circular modal and toggle target audience settings", async ({ page }) => {
    const circularNav = page.locator("button", { hasText: "เวียนหนังสือราชการ" }).first();
    await circularNav.click();

    // Click "ออกหนังสือเวียนใหม่"
    const newDocBtn = page.locator("button", { hasText: "ออกหนังสือเวียนใหม่" });
    await expect(newDocBtn).toBeVisible();
    await newDocBtn.click();

    const modalBackdrop = page.locator("div.fixed.z-50");
    await expect(modalBackdrop).toBeVisible();

    // Modal title verification
    await expect(modalBackdrop.locator("h3", { hasText: "สร้างหนังสือเวียนราชการใหม่" })).toBeVisible();

    // Select custom targeting option label
    const customOption = modalBackdrop.locator("label:has-text('กำหนดกลุ่มเป้าหมายเฉพาะ')");
    await expect(customOption).toBeVisible();
    await customOption.click();

    // Check that division selection is visible
    await expect(modalBackdrop.locator("text=เลือกกลุ่ม / ฝ่ายงานเป้าหมาย")).toBeVisible();
    await expect(modalBackdrop.locator("text=ฝ่ายบริหารทั่วไป")).toBeVisible();

    // Close modal
    await modalBackdrop.locator("button:has-text('ยกเลิก')").click();
    await expect(modalBackdrop).not.toBeVisible();
  });
});
