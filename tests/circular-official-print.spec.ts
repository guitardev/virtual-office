import { test, expect } from "./fixtures";

test.describe("ระบบพิมพ์หนังสือราชการที่สมบูรณ์ (Complete Official Document Printing)", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/rest/v1/circular_documents*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: "circ_print_test_001",
            doc_number: "กพ ๐๐๓๒/ว ๒๕๖๙",
            title: "มาตรการและแนวปฏิบัติการรับ-ส่งหนังสือราชการอิเล็กทรอนิกส์",
            issued_date: "๒๗ ตุลาคม ๒๕๖๙",
            sender_org: "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร",
            urgency: "most_urgent",
            secret_level: "normal",
            summary: "กำหนดแนวทางถือปฏิบัติตามระเบียบสำนักนายกรัฐมนตรีว่าด้วยงานสารบรรณ พ.ศ. ๒๕๖๔",
            created_by: "usr_1",
            created_by_name: "นายพัฒนา สังคมดี",
            created_at: new Date().toISOString(),
            target_criteria: { scope: "all" },
            recipients: [
              {
                memberId: "usr_3",
                memberName: "นางอรัญญา เกิดสุข",
                division: "กลุ่มนโยบายและวิชาการ",
                personnelType: "ข้าราชการ",
                position: "นักวิเคราะห์นโยบายและแผน",
                isAcknowledged: true,
                acknowledgedAt: new Date().toISOString(),
                endorsementNote: "รับทราบและดำเนินการแจ้งเวียนเจ้าหน้าที่ในสังกัด",
              },
            ],
            total_count: 1,
            acknowledged_count: 1,
            status: "active",
          },
        ]),
      });
    });
    await page.goto("http://localhost:3000");
  });

  test("เปิดระบบพิมพ์หนังสือราชการ มีตราครุฑ SVG มาตรฐาน สลับโหมดการพิมพ์ได้ และมี QR Code ตรวจสอบ", async ({
    page,
  }) => {
    // 1. นำทางไปยังหน้าระบบเวียนหนังสือราชการ
    const circularNav = page.locator("aside").getByRole("button", { name: /เวียนหนังสือราชการ/ });
    await expect(circularNav).toBeVisible({ timeout: 10000 });
    await circularNav.click();

    // 2. ตรวจสอบว่าเข้าสู่หน้าเวียนหนังสือราชการ
    await expect(page.locator("text=ระบบเวียนหนังสือราชการอิเล็กทรอนิกส์").first()).toBeVisible({
      timeout: 10000,
    });

    // 3. ตรวจสอบว่ามีปุ่ม 'พิมพ์หนังสือ' ในการ์ดรายการหนังสือเวียน
    const card = page.locator('[data-testid="circular-doc-card-circ_print_test_001"]');
    await expect(card).toBeVisible({ timeout: 10000 });

    const printBtn = card.locator("button:has-text('พิมพ์หนังสือ')");
    await expect(printBtn).toBeVisible();
    await printBtn.click();

    // 4. ต้องแสดงหน้าระบบพิมพ์หนังสือราชการ (Print View)
    const printView = page.locator("[data-testid='circulation-print-view']");
    await expect(printView).toBeVisible();

    // 5. ตรวจสอบว่ามีตราครุฑราชการ (Garuda SVG)
    const garudaEmblem = printView.locator("img[alt='ตราครุฑระเบียบงานสารบรรณ']").first();
    await expect(garudaEmblem).toBeVisible();
    await expect(garudaEmblem).toHaveAttribute("src", "/images/garuda.svg");

    // 6. ตรวจสอบแท็บเลือกโหมดการพิมพ์ 3 รูปแบบ
    const allTab = printView.locator("button:has-text('ชุดรวมสมบูรณ์ (All)')");
    const letterTab = printView.locator("button:has-text('เฉพาะหนังสือเวียน')");
    const slipTab = printView.locator("button:has-text('เฉพาะใบสรุปผล')");

    await expect(allTab).toBeVisible();
    await expect(letterTab).toBeVisible();
    await expect(slipTab).toBeVisible();

    // 7. สลับไปยังโหมด 'เฉพาะหนังสือเวียน'
    await letterTab.click();
    await expect(printView.locator("h1:has-text('บันทึกข้อความ')")).toBeVisible();
    await expect(printView.locator("text=กพ ๐๐๓๒/ว ๒๕๖๙").first()).toBeVisible();
    await expect(printView.locator("text=ด่วนที่สุด").first()).toBeVisible();

    // 8. ตรวจสอบ QR Code รับรองความถูกต้องตามระเบียบสารบรรณอิเล็กทรอนิกส์
    const qrSection = printView.locator("text=สแกนตรวจสอบความถูกต้อง").first();
    await expect(qrSection).toBeVisible();

    // 9. สลับไปยังโหมด 'เฉพาะใบสรุปผล'
    await slipTab.click();
    await expect(
      printView.locator("h1:has-text('บันทึกผลการเวียนหนังสือราชการและหลักฐานการรับทราบ')")
    ).toBeVisible();
    await expect(printView.locator("text=นางอรัญญา เกิดสุข")).toBeVisible();
  });
});
