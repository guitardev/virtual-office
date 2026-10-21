import { test, expect } from "./fixtures";

test.describe("Government Circular Document & E-Acknowledgment Workflow", () => {
  test.beforeEach(async ({ page }) => {
    // Intercept Supabase circular_documents queries to provide test fixture
    await page.route("**/rest/v1/circular_documents*", async (route) => {
      const method = route.request().method();
      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "circ_test_001",
              doc_number: "กพ ๐๐๓๒/ว ๔๕๒",
              title: "แนวทางการจัดสรรงบประมาณโครงการพัฒนาคุณภาพชีวิตผู้สูงอายุและคนพิการ ประจำปีงบประมาณ พ.ศ. ๒๕๖๙",
              issued_date: "๑๐ ตุลาคม ๒๕๖๙",
              sender_org: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
              urgency: "urgent",
              secret_level: "normal",
              summary: "แจ้งแนวทางปฏิบัติการเบิกจ่ายงบประมาณ",
              file_url: "/virtual-office/circular_docs/sample.pdf",
              file_name: "คำสั่งและแนวทางจัดสรรงบประมาณ_2569.pdf",
              file_size: 1845000,
              total_pages: 3,
              created_by: "usr_2",
              created_by_name: "นายเสกพล ดิษฐโชติ",
              created_at: "2026-10-10T08:30:00Z",
              deadline: "2026-10-25T16:30:00Z",
              target_criteria: { scope: "all" },
              recipients: [
                {
                  memberId: "usr_2",
                  memberName: "นายเสกพล ดิษฐโชติ",
                  division: "ฝ่ายบริหารทั่วไป",
                  personnelType: "ข้าราชการ",
                  position: "นักพัฒนาสังคมชำนาญการ",
                  isAcknowledged: false,
                },
              ],
              total_count: 1,
              acknowledged_count: 0,
              status: "active",
            },
          ]),
        });
      } else {
        await route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      }
    });

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

  test("should allow importing from official government presets and previewing in Live Preview", async ({ page }) => {
    const circularNav = page.locator("button", { hasText: "เวียนหนังสือราชการ" }).first();
    await circularNav.click();

    // Click "ออกหนังสือเวียนใหม่"
    const newDocBtn = page.locator("button", { hasText: "ออกหนังสือเวียนใหม่" });
    await newDocBtn.click();

    const newFormView = page.locator("[data-testid='new-circular-view']");
    await expect(newFormView).toBeVisible();

    // Open Presets Drawer
    const presetBtn = newFormView.locator("button:has-text('นำเข้าจากแม่แบบราชการมาตรฐาน')");
    await expect(presetBtn).toBeVisible();
    await presetBtn.click();

    // Verify preset options appear
    await expect(newFormView.locator("text=เลือกแม่แบบหนังสือเวียนเพื่อกรอกข้อมูล")).toBeVisible();
    const budgetPreset = newFormView.locator("button:has-text('แนวทางจัดสรรงบประมาณ')").first();
    await expect(budgetPreset).toBeVisible();
    await budgetPreset.click();

    // Check that title input has been populated
    const titleInput = newFormView.locator("input[placeholder*='ระบุชื่อเรื่องหนังสือเวียน']");
    await expect(titleInput).toHaveValue(/งบประมาณ/);

    // Switch to "ดูตัวอย่างหนังสือราชการตราครุฑ (Live Preview)" tab
    const livePreviewTab = newFormView.locator("button:has-text('ดูตัวอย่างหนังสือราชการตราครุฑ')");
    await expect(livePreviewTab).toBeVisible();
    await livePreviewTab.click();

    // Verify Garuda letter sheet is rendered
    await expect(newFormView.locator("text=บันทึกข้อความ")).toBeVisible();
    await expect(newFormView.locator("text=ส่วนราชการ")).toBeVisible();
    await expect(newFormView.locator("text=เรื่อง").first()).toBeVisible();

    // Cancel and return
    await newFormView.locator("button:has-text('ยกเลิก')").first().click();
    await expect(newFormView).not.toBeVisible();
  });

  test("should display dual-mode view in circular viewer (Garuda letter and attachment)", async ({ page }) => {
    const circularNav = page.locator("button", { hasText: "เวียนหนังสือราชการ" }).first();
    await circularNav.click();

    const allTab = page.locator("button", { hasText: "หนังสือเวียนทั้งหมด" });
    await allTab.click();

    // Open first document
    const openDocBtn = page.locator("div.grid button", { hasText: /เปิดอ่าน|ลงนาม/ }).first();
    await expect(openDocBtn).toBeVisible();
    await openDocBtn.click();

    const inPageView = page.locator("[data-testid='circular-viewer-view']");
    await expect(inPageView).toBeVisible();

    // 1. Verify Default Tab "หนังสือราชการตราครุฑ" is visible
    await expect(inPageView.locator("button:has-text('หนังสือราชการตราครุฑ')")).toBeVisible();
    await expect(inPageView.locator("text=บันทึกข้อความ")).toBeVisible();
    await expect(inPageView.locator("text=ส่วนราชการ")).toBeVisible();

    // 2. Switch to "ไฟล์แนบต้นฉบับ" Tab
    const attachmentTab = inPageView.locator("button:has-text('ไฟล์แนบต้นฉบับ')");
    await expect(attachmentTab).toBeVisible();
    await attachmentTab.click();

    // 3. Verify attachment controls or frame are visible
    await expect(inPageView.locator("button:has-text('เปิดเต็มจอ')").or(inPageView.locator("a:has-text('ดาวน์โหลด PDF')"))).toBeVisible();

    // Close viewer
    const backBtn = inPageView.locator("button", { hasText: /ย้อนกลับ|ปิดหน้าเอกสาร/ }).first();
    await backBtn.click();
    await expect(inPageView).not.toBeVisible();
  });

  test("should handle scanner camera diagnostics, allow simulated scan, and import scanned pages", async ({ page }) => {
    const circularNav = page.locator("button", { hasText: "เวียนหนังสือราชการ" }).first();
    await circularNav.click();

    // Click "สแกนหนังสือเข้าสู่ระบบ" button
    const scannerBtn = page.locator("button", { hasText: "สแกนหนังสือเข้าสู่ระบบ" });
    await expect(scannerBtn).toBeVisible();
    await scannerBtn.click();

    // Verify document scanner is open in-page
    const scannerView = page.locator("[data-testid='document-scanner-view']");
    await expect(scannerView).toBeVisible();

    // Verify presence of camera diagnostic actions and alternatives
    const simulateScanBtn = scannerView.locator("button:has-text('จำลองการสแกนเอกสารจริง')").first();
    await expect(simulateScanBtn).toBeVisible();
    await expect(scannerView.locator("button:has-text('ลองเชื่อมต่อกล้องใหม่')")).toBeVisible();
    await expect(scannerView.locator("text=เลือกรูปภาพ/PDF")).toBeVisible();

    // Trigger simulated scan
    await simulateScanBtn.click();

    // Verify scanned page thumbnail appears
    await expect(scannerView.locator("text=หน้า 1")).toBeVisible();
    await expect(scannerView.locator("text=1 รายการ").first()).toBeVisible();

    // Complete scan and import to new circular form
    const importBtn = scannerView.locator("button:has-text('นำเข้าหนังสือเวียน')");
    await expect(importBtn).toBeVisible();
    await importBtn.click();

    // Verify transition to create document form with scanned pages
    const newFormView = page.locator("[data-testid='new-circular-view']");
    await expect(newFormView).toBeVisible();

    // Cancel and return
    await newFormView.locator("button:has-text('ยกเลิก')").first().click();
    await expect(newFormView).not.toBeVisible();
  });

  test("should display attached PDF document in scanner with dedicated PDF card and preview mode", async ({ page }) => {
    const circularNav = page.locator("button", { hasText: "เวียนหนังสือราชการ" }).first();
    await circularNav.click();

    // Click "สแกนหนังสือเข้าสู่ระบบ"
    const scannerBtn = page.locator("button", { hasText: "สแกนหนังสือเข้าสู่ระบบ" });
    await scannerBtn.click();

    const scannerView = page.locator("[data-testid='document-scanner-view']");
    await expect(scannerView).toBeVisible();

    // Attach sample PDF file
    const fileInput = scannerView.locator("input[type='file']").first();
    await fileInput.setInputFiles({
      name: "ระเบียบการเงินการคลัง_๒๕๖๙.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4 sample pdf document content for test"),
    });

    // Verify PDF card renders in right queue (not a broken img tag)
    await expect(scannerView.locator("text=PDF").first()).toBeVisible();
    await expect(scannerView.locator("text=ระเบียบการเงินการคลัง_๒๕๖๙.pdf").first()).toBeVisible();
    await expect(scannerView.locator("text=เอกสารดิจิทัล PDF")).toBeVisible();

    // Verify preview mode tab is active
    await expect(scannerView.locator("button:has-text('ดูตัวอย่างเอกสาร/PDF')")).toBeVisible();

    // Click Cancel to exit
    await scannerView.locator("button:has-text('ยกเลิก')").first().click();
    await expect(scannerView).not.toBeVisible();
  });

  test("should display scanned/imported document in new circular form and in Live Preview attachment tab", async ({ page }) => {
    const circularNav = page.locator("button", { hasText: "เวียนหนังสือราชการ" }).first();
    await circularNav.click();

    // 1. Open scanner and simulate a scan
    const scannerBtn = page.locator("button", { hasText: "สแกนหนังสือเข้าสู่ระบบ" });
    await scannerBtn.click();

    const scannerView = page.locator("[data-testid='document-scanner-view']");
    await expect(scannerView).toBeVisible();

    const simScanBtn = scannerView.locator("button:has-text('จำลองการสแกนเอกสารจริง')").first();
    await simScanBtn.click();
    await expect(scannerView.locator("text=หน้า 1").first()).toBeVisible();

    // 2. Click "นำเข้าหนังสือเวียน"
    const confirmBtn = scannerView.locator("button:has-text('นำเข้าหนังสือเวียน')");
    await confirmBtn.click();

    // 3. Verify New Circular Form opens and displays the embedded document preview box!
    const newFormView = page.locator("[data-testid='new-circular-view']");
    await expect(newFormView).toBeVisible();
    await expect(newFormView.locator("[data-testid='circular-document-preview-box']")).toBeVisible();
    await expect(newFormView.locator("text=ตัวอย่างเอกสารที่นำเข้า / หน้าสแกน")).toBeVisible();

    // 4. Switch to Live Preview tab
    const previewTabBtn = newFormView.locator("button:has-text('ดูตัวอย่างหนังสือราชการตราครุฑ')");
    await previewTabBtn.click();

    // 5. Verify dual-mode preview in Live Preview tab
    const attachmentTabBtn = newFormView.getByRole("button", { name: /เอกสารแนบต้นฉบับ/ });
    await expect(attachmentTabBtn).toBeVisible();

    // Toggle to attachment view in Live Preview
    await attachmentTabBtn.click();
    await expect(newFormView.locator("text=หน้า 1 จาก 1")).toBeVisible();

    // Exit
    await newFormView.locator("button:has-text('ยกเลิก')").first().click();
    await expect(newFormView).not.toBeVisible();
  });

  test("should display elegant loading skeleton state when fetching circular documents from database", async ({ page }) => {
    // Intercept with delay to capture loading state
    await page.route("**/rest/v1/circular_documents*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "circ_delayed_001",
            doc_number: "กพ ๐๐๓๒/ว ๙๙๙",
            title: "หนังสือเวียนทดสอบการโหลดข้อมูล",
            issued_date: "๒๑ ตุลาคม ๒๕๖๙",
            sender_org: "สำนักงานปลัดกระทรวง",
            urgency: "normal",
            secret_level: "normal",
            summary: "สรุปเนื้อหา",
            created_by: "usr_2",
            created_by_name: "นายเสกพล ดิษฐโชติ",
            created_at: "2026-10-21T08:30:00Z",
            target_criteria: { scope: "all" },
            recipients: [
              {
                memberId: "usr_2",
                memberName: "นายเสกพล ดิษฐโชติ",
                division: "ฝ่ายบริหารทั่วไป",
                personnelType: "ข้าราชการ",
                position: "นักพัฒนาสังคมชำนาญการ",
                isAcknowledged: false,
              },
            ],
            total_count: 1,
            acknowledged_count: 0,
            status: "active",
          },
        ]),
      });
    });

    const circularNav = page.locator("button", { hasText: "เวียนหนังสือราชการ" }).first();
    await circularNav.click();

    // Verify loading indicator and skeleton banner are visible
    const loadingBanner = page.locator("text=กำลังเชื่อมต่อและโหลดข้อมูลหนังสือเวียนราชการ");
    await expect(loadingBanner).toBeVisible();
    await expect(page.locator("text=กำลังเชื่อมต่อ Database...")).toBeVisible();

    // After loading completes, verify transition to rendered document
    await expect(loadingBanner).not.toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=หนังสือเวียนทดสอบการโหลดข้อมูล")).toBeVisible();
  });
});



