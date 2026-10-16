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

  test("should open document viewer in-page and trigger digital signature", async ({ page }) => {
    const circularNav = page.locator("button", { hasText: "เวียนหนังสือราชการ" }).first();
    await circularNav.click();

    // Switch to "หนังสือเวียนทั้งหมด" tab
    const allTab = page.locator("button", { hasText: "หนังสือเวียนทั้งหมด" });
    await allTab.click();

    // Click on the first document "เปิดอ่าน" or "ลงนาม" button
    const openDocBtn = page.locator("div.grid button", { hasText: /เปิดอ่าน|ลงนาม/ }).first();
    await expect(openDocBtn).toBeVisible();
    await openDocBtn.click();

    // Verify document viewer is open IN-PAGE (not a fixed popup modal)
    const inPageView = page.locator("[data-testid='circular-viewer-view']");
    await expect(inPageView).toBeVisible();
    await expect(page.locator("div.fixed.z-50.backdrop-blur-md")).not.toBeVisible();

    // If "ลงนามดิจิทัลรับทราบ" is visible, test opening signature pad
    const signBtn = inPageView.locator("button", { hasText: "ลงนามดิจิทัลรับทราบ" });
    if (await signBtn.isVisible()) {
      await signBtn.click();
      // Verify digital signature pad
      await expect(page.locator("text=ลงนามรับทราบหนังสือเวียนราชการ")).toBeVisible();
      // Close signature pad
      await page.locator("button", { hasText: "✕" }).last().click();
    }

    // Close document viewer with back button
    const backBtn = inPageView.locator("button", { hasText: /ย้อนกลับ|ปิดหน้าเอกสาร/ }).first();
    await backBtn.click();
    await expect(inPageView).not.toBeVisible();
  });

  test("should open and display official printable circulation slip in-page", async ({ page }) => {
    const circularNav = page.locator("button", { hasText: "เวียนหนังสือราชการ" }).first();
    await circularNav.click();

    const allTab = page.locator("button", { hasText: "หนังสือเวียนทั้งหมด" });
    await allTab.click();

    // Click "พิมพ์ใบเวียน" button
    const printBtn = page.locator("button[title*='พิมพ์ใบปะหน้าเวียน']").first();
    await expect(printBtn).toBeVisible();
    await printBtn.click();

    // Verify print slip is open IN-PAGE
    const printView = page.locator("[data-testid='circulation-print-view']");
    await expect(printView).toBeVisible();
    await expect(page.locator("div.fixed.z-50.backdrop-blur-md")).not.toBeVisible();

    // Verify print slip contains Garuda crest and official title
    await expect(printView.locator("text=ใบสรุปผลการเวียนหนังสือราชการและบัญชีลงนามรับทราบ")).toBeVisible();
    await expect(printView.locator("text=บันทึกผลการเวียนหนังสือราชการและหลักฐานการรับทราบ")).toBeVisible();

    // Return back to list
    const backBtn = printView.locator("button", { hasText: /ย้อนกลับ|✕ ปิด/ }).first();
    await backBtn.click();
    await expect(printView).not.toBeVisible();
  });

  test("should open new circular form in-page and toggle target audience settings", async ({ page }) => {
    const circularNav = page.locator("button", { hasText: "เวียนหนังสือราชการ" }).first();
    await circularNav.click();

    // Click "ออกหนังสือเวียนใหม่"
    const newDocBtn = page.locator("button", { hasText: "ออกหนังสือเวียนใหม่" });
    await expect(newDocBtn).toBeVisible();
    await newDocBtn.click();

    // Verify form renders IN-PAGE
    const newFormView = page.locator("[data-testid='new-circular-view']");
    await expect(newFormView).toBeVisible();
    await expect(page.locator("div.fixed.z-50.backdrop-blur-md")).not.toBeVisible();

    // Title verification
    await expect(newFormView.locator("h3", { hasText: "สร้างหนังสือเวียนราชการใหม่" })).toBeVisible();

    // Select custom targeting option label
    const customOption = newFormView.locator("label:has-text('กำหนดกลุ่มเป้าหมายเฉพาะ')");
    await expect(customOption).toBeVisible();
    await customOption.click();

    // Check that division selection is visible
    await expect(newFormView.locator("text=เลือกกลุ่ม / ฝ่ายงานเป้าหมาย")).toBeVisible();
    await expect(newFormView.locator("text=ฝ่ายบริหารทั่วไป")).toBeVisible();

    // Cancel and return to list
    await newFormView.locator("button:has-text('ยกเลิก')").first().click();
    await expect(newFormView).not.toBeVisible();
  });

  test("should attach a file and show active attachment card with file details in-page", async ({ page }) => {
    const circularNav = page.locator("button", { hasText: "เวียนหนังสือราชการ" }).first();
    await circularNav.click();

    // Click "ออกหนังสือเวียนใหม่"
    const newDocBtn = page.locator("button", { hasText: "ออกหนังสือเวียนใหม่" });
    await newDocBtn.click();

    const newFormView = page.locator("[data-testid='new-circular-view']");
    await expect(newFormView).toBeVisible();

    // Attach sample PDF file
    const fileInput = newFormView.locator("input[type='file']").last();
    await fileInput.setInputFiles({
      name: "ระเบียบสำนักนายกรัฐมนตรี_๒๕๖๙.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 test government circular file content"),
    });

    // Verify attachment card displays in-page
    await expect(newFormView.locator("text=แนบไฟล์เรียบร้อย")).toBeVisible();
    await expect(newFormView.locator("text=ระเบียบสำนักนายกรัฐมนตรี_๒๕๖๙.pdf")).toBeVisible();
    await expect(newFormView.locator("button:has-text('เปลี่ยนไฟล์')")).toBeVisible();

    // Cancel and return to list
    await newFormView.locator("button:has-text('ยกเลิก')").first().click();
    await expect(newFormView).not.toBeVisible();
  });
});

