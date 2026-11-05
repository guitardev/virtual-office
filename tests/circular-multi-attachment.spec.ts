import { test, expect } from "./fixtures";

test.describe("Circular Documents - Multi-Attachment Upload and Independent Preview", () => {
  const dummy1pxPng =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  test.beforeEach(async ({ page }) => {
    // Intercept Supabase circular_documents API
    await page.route("**/rest/v1/circular_documents*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "circ_multi_att_001",
            doc_number: "พม ๐๐๐๕/ว ๗๗๗",
            title: "หนังสือเวียนทดสอบหลายไฟล์แนบและการแสดงตัวอย่าง",
            issued_date: "๕ พฤศจิกายน ๒๕๖๙",
            sender_org: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์",
            urgency: "normal",
            secret_level: "normal",
            summary: "ทดสอบการแสดงผลและสลับพรีวิวไฟล์แนบหลายรายการพร้อมกัน",
            file_url: dummy1pxPng,
            file_name: "เอกสารหลักสแกน.png",
            file_size: 15400,
            attachment_list: "1. เอกสารหลักสแกน.png, 2. สิ่งที่ส่งมาด้วย_รายงานสรุป.pdf",
            scanned_pages: {
              pages: [dummy1pxPng],
              attachments: [
                {
                  id: "att_scan_1",
                  name: "เอกสารหลักสแกน.png",
                  size: 15400,
                  type: "image/png",
                  url: dummy1pxPng,
                  scannedPages: [dummy1pxPng],
                  source: "scanner",
                },
                {
                  id: "att_pdf_2",
                  name: "สิ่งที่ส่งมาด้วย_รายงานสรุป.pdf",
                  size: 45000,
                  type: "application/pdf",
                  url: "/virtual-office/circular_docs/sample.pdf",
                  source: "upload",
                },
              ],
            },
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
            ],
            total_count: 1,
            acknowledged_count: 0,
            status: "active",
          },
        ]),
      });
    });

    await page.goto("http://localhost:3000/circular");
  });

  test("CircularViewerModal correctly lists all attachments and previews each file independently", async ({
    page,
  }) => {
    // 1. Verify Circular Documents page is loaded
    await expect(page.locator("text=ระบบเวียนหนังสือราชการอิเล็กทรอนิกส์").first()).toBeVisible({
      timeout: 10000,
    });

    // 2. Open the circular document with 2 attachments
    const docCard = page.locator('[data-testid="circular-doc-card-circ_multi_att_001"]');
    await expect(docCard).toBeVisible({ timeout: 10000 });
    await docCard.click();

    // 3. Verify attachment switcher shows 2 items
    const switcherTitle = page.locator("text=ไฟล์เอกสารและสิ่งที่ส่งมาด้วยทั้งหมด (2 รายการ)").first();
    await expect(switcherTitle).toBeVisible();

    const att1Btn = page.getByRole("button", { name: /เอกสารหลักสแกน\.png/ }).first();
    const att2Btn = page.getByRole("button", { name: /สิ่งที่ส่งมาด้วย_รายงานสรุป\.pdf/ }).first();
    await expect(att1Btn).toBeVisible();
    await expect(att2Btn).toBeVisible();

    // 4. Initially, Attachment 1 (Scanned image) is active
    await expect(page.locator("text=เอกสารหลักสแกน.png").first()).toBeVisible();
    // Scanned view shows multi-page indicator or scanned img
    const scannedImg = page.locator('img[key*="scanned_img"], img[alt*="Document page"]').first();
    await expect(scannedImg).toBeVisible();

    // 5. Click Attachment 2 (PDF file)
    await att2Btn.click();

    // 6. Verify viewer switches to Attachment 2
    // Active file name in header should now be the PDF
    await expect(page.locator("text=สิ่งที่ส่งมาด้วย_รายงานสรุป.pdf").first()).toBeVisible();
    // PDF viewer should now be visible (object or iframe), and scanned image should be unmounted
    const pdfObject = page.locator('object[type="application/pdf"]').first();
    await expect(pdfObject).toBeVisible();
    await expect(page.locator('a:has-text("ดาวน์โหลดไฟล์ PDF")').first()).toBeVisible();

    // 7. Click back to Attachment 1
    await att1Btn.click();
    await expect(page.locator("text=เอกสารหลักสแกน.png").first()).toBeVisible();
    await expect(page.locator('img[alt*="Document page"]').first()).toBeVisible();
  });

  test("NewCircularModal supports multi-file upload, switching previews, and shows quick-add actions", async ({
    page,
  }) => {
    // 1. Verify Circular Documents page is loaded
    await expect(page.locator("text=ระบบเวียนหนังสือราชการอิเล็กทรอนิกส์").first()).toBeVisible({
      timeout: 10000,
    });

    // 2. Click create new circular document
    const createBtn = page.getByRole("button", { name: /ส่งหนังสือเวียน/ }).first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();

    // 3. Verify New Circular Modal is open
    await expect(page.locator("text=ส่งหนังสือเวียนราชการ").first()).toBeVisible();

    // 4. Upload 2 files simultaneously via hidden file input
    const fileInput = page.locator('input[type="file"][multiple]').first();
    await fileInput.setInputFiles([
      {
        name: "ประกาศแนวปฏิบัติ_ฉบับที่1.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4 sample content for test"),
      },
      {
        name: "ตารางแนบท้าย_รายชื่อ.png",
        mimeType: "image/png",
        buffer: Buffer.from("fake-png-data"),
      },
    ]);

    // 5. Verify that both files are listed in the modal
    await expect(
      page.locator("text=รายการไฟล์เอกสารที่แนบในหนังสือเวียนนี้ (2 รายการ)").first()
    ).toBeVisible({ timeout: 10000 });

    const item1 = page.locator("text=ประกาศแนวปฏิบัติ_ฉบับที่1.pdf").first();
    const item2 = page.locator("text=ตารางแนบท้าย_รายชื่อ.png").first();
    await expect(item1).toBeVisible();
    await expect(item2).toBeVisible();

    // 6. Verify quick-add action buttons appear for adding more files/scans
    await expect(page.getByRole("button", { name: /\+ เพิ่มไฟล์จากเครื่อง/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /\+ สแกน\/ถ่ายภาพเพิ่ม/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /\+ ดึงไฟล์จาก NAS/ })).toBeVisible();

    // 7. Preview box should be visible
    const previewBox = page.locator('[data-testid="circular-document-preview-box"]').first();
    await expect(previewBox).toBeVisible();

    // 8. Click item 1 card to preview PDF
    await item1.click();
    await expect(page.locator("text=ตัวอย่างเอกสาร: ประกาศแนวปฏิบัติ_ฉบับที่1.pdf").first()).toBeVisible();

    // 9. Click item 2 card to preview image
    await item2.click();
    await expect(page.locator("text=ตัวอย่างเอกสาร: ตารางแนบท้าย_รายชื่อ.png").first()).toBeVisible();
  });
});
