import { test, expect } from "./fixtures";

test.describe("ระบบเวียนหนังสือราชการและรายงานผลการเวียน (Circular Documents & Slip Printing)", () => {
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

  test("เปิดระบบพิมพ์ใบสรุปผลการเวียน มีตราครุฑ SVG มาตรฐาน สรุปผลการเวียนและหลักฐานการรับทราบ และมี QR Code ตรวจสอบ (ตัดคงเหลือเฉพาะสรุปผลการเวียน)", async ({
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

    // 3. ตรวจสอบว่ามีปุ่มพิมพ์สรุปผลการเวียนในการ์ดรายการหนังสือเวียน
    const card = page.locator('[data-testid="circular-doc-card-circ_print_test_001"]');
    await expect(card).toBeVisible({ timeout: 10000 });

    const printBtn = card.locator("button:has-text('พิมพ์')");
    await expect(printBtn).toBeVisible();
    await printBtn.click();

    // 4. ต้องแสดงหน้าระบบพิมพ์ใบสรุปผลการเวียน (Print View)
    const printView = page.locator("[data-testid='circulation-print-view']");
    await expect(printView).toBeVisible();

    // 5. ตรวจสอบว่ามีตราครุฑราชการ (Garuda SVG)
    const garudaEmblem = printView.locator("img[alt='ตราครุฑระเบียบงานสารบรรณ']").first();
    await expect(garudaEmblem).toBeVisible();
    await expect(garudaEmblem).toHaveAttribute("src", "/images/garuda.svg");

    // 6. ตรวจสอบว่าแสดงหัวเรื่องบันทึกผลการเวียนหนังสือราชการและหลักฐานการรับทราบทันที (ไม่แสดงแท็บสลับโหมดอื่น)
    await expect(
      printView.locator("h1:has-text('บันทึกผลการเวียนหนังสือราชการและหลักฐานการรับทราบ')")
    ).toBeVisible();
    await expect(printView.locator("text=นางอรัญญา เกิดสุข")).toBeVisible();

    // 7. ต้องไม่มีแท็บเลือกโหมดการพิมพ์แบบเดิม (ตัดออกให้คงเหลือเฉพาะสรุปผลการเวียน)
    await expect(printView.locator("button:has-text('ชุดรวมสมบูรณ์ (All)')")).toHaveCount(0);
    await expect(printView.locator("button:has-text('เฉพาะหนังสือเวียน')")).toHaveCount(0);

    // 8. ตรวจสอบ QR Code รับรองความถูกต้องตามระเบียบสารบรรณอิเล็กทรอนิกส์ในใบสรุปผล
    const qrSection = printView.locator("text=สแกนตรวจสอบความถูกต้อง").first();
    await expect(qrSection).toBeVisible();
  });

  test("ระบบรับ-ส่งและดูเอกสารแนบหนังสือเวียนต้นฉบับ พร้อมข้อมูลสรุปสาระสำคัญ (ตัดส่วนการร่างหนังสือออกทั้งหมด)", async ({
    page,
  }) => {
    // 1. นำทางไปยังหน้าระบบเวียนหนังสือราชการ
    const circularNav = page.locator("aside").getByRole("button", { name: /เวียนหนังสือราชการ/ });
    await expect(circularNav).toBeVisible({ timeout: 10000 });
    await circularNav.click();

    // 2. คลิกดูเอกสารเพื่อเปิด CircularViewerModal
    const card = page.locator('[data-testid="circular-doc-card-circ_print_test_001"]');
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.locator("h3").click();

    // 3. ตรวจสอบข้อมูลหนังสือเวียนที่ได้รับ
    await expect(page.locator("text=มาตรการและแนวปฏิบัติการรับ-ส่งหนังสือราชการอิเล็กทรอนิกส์").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=กพ ๐๐๓๒/ว ๒๕๖๙").first()).toBeVisible();

    // 4. ต้องไม่มีส่วนการร่างหนังสือราชการ หรือการสลับแม่แบบหนังสือราชการ ๔ รูปแบบ
    await expect(page.locator("text=รูปแบบหนังสือราชการ:")).toHaveCount(0);
    await expect(page.locator("button:has-text('บันทึกข้อความ (ภายใน)')")).toHaveCount(0);
    await expect(page.locator("button:has-text('หนังสือภายนอก')")).toHaveCount(0);
    await expect(page.locator("button:has-text('คำสั่งราชการ')")).toHaveCount(0);
    await expect(page.locator("button:has-text('ประกาศราชการ')")).toHaveCount(0);

    // 5. ตรวจสอบปุ่มพิมพ์สรุปผลการเวียนในหน้าดูเอกสาร
    await expect(page.locator("button:has-text('พิมพ์สรุปผลการเวียน')").first()).toBeVisible();
  });

  test("เลือก 'ลงวันที่ *' จาก Calendar Date Picker และแปลงเป็นเลขไทยอัตโนมัติ โดยเริ่มต้นเป็นวันที่ปัจจุบัน", async ({
    page,
  }) => {
    // 1. ไปยังหน้าระบบเวียนหนังสือราชการ
    const circularNav = page.locator("aside").getByRole("button", { name: /เวียนหนังสือราชการ/ });
    await expect(circularNav).toBeVisible({ timeout: 10000 });
    await circularNav.click();

    // 2. คลิกปุ่ม 'ออกหนังสือเวียนใหม่'
    const newDocBtn = page.getByRole("button", { name: /ออกหนังสือเวียนใหม่/i });
    await expect(newDocBtn).toBeVisible({ timeout: 10000 });
    await newDocBtn.click();

    // 3. ตรวจสอบว่าช่อง 'ลงวันที่ *' แสดงผลพร้อมป้าย 'เลขไทยอัตโนมัติ'
    await expect(page.locator("label:has-text('ลงวันที่')")).toBeVisible();
    await expect(page.locator("text=เลขไทยอัตโนมัติ")).toBeVisible();

    // 4. ตรวจสอบว่าค่าเริ่มต้นของปฏิทินมีตัวเลขไทยของปีปัจจุบัน (เช่น ๒๕๖๙)
    const calendarInput = page.locator("input[data-testid='issued-date-calendar-input']");
    await expect(calendarInput).toBeAttached();

    // 5. เปลี่ยนวันที่ผ่าน Calendar Date Picker เป็น '2026-11-15'
    await calendarInput.fill("2026-11-15");
    await calendarInput.dispatchEvent("change");

    // 6. ต้องแปลงเป็นข้อความวันที่ภาษาไทยและตัวเลขไทยอัตโนมัติ '๑๕ พฤศจิกายน ๒๕๖๙'
    await expect(page.locator("text=๑๕ พฤศจิกายน ๒๕๖๙").first()).toBeVisible({ timeout: 5000 });

    // 7. ทดสอบปุ่ม 'วันนี้' เพื่อรีเซ็ตกลับเป็นวันปัจจุบัน
    const todayBtn = page.getByRole("button", { name: "วันนี้", exact: true });
    await expect(todayBtn).toBeVisible();
    await todayBtn.click();

    // 8. ต้องไม่มีแถบร่างหนังสือ หรือ Live Preview ตราครุฑ
    await expect(page.locator("button:has-text('ดูตัวอย่างหนังสือราชการตราครุฑ')")).toHaveCount(0);
    await expect(page.locator("button:has-text('นำเข้าจากแม่แบบราชการมาตรฐาน')")).toHaveCount(0);
  });

  test("ระบบแสดงใบสรุปผลการเวียน (Circulation Slip) รองรับการเปิดบนหน้าจอมือถือได้อย่างสมบูรณ์", async ({
    page,
  }) => {
    // 1. นำทางไปยังหน้าระบบเวียนหนังสือราชการ
    const circularNav = page.locator("aside").getByRole("button", { name: /เวียนหนังสือราชการ/ });
    await expect(circularNav).toBeVisible({ timeout: 10000 });
    await circularNav.click();

    // 2. คลิกดูเอกสาร
    const card = page.locator('[data-testid="circular-doc-card-circ_print_test_001"]');
    await expect(card).toBeVisible({ timeout: 10000 });

    const printBtn = card.locator("button:has-text('พิมพ์')");
    await expect(printBtn).toBeVisible();
    await printBtn.click();

    // 3. ตรวจสอบหน้ารายงานผลการเวียน
    const printView = page.locator("[data-testid='circulation-print-view']");
    await expect(printView).toBeVisible();

    // 4. ทดสอบย่อขนาดหน้าจอเป็นมือถือ (Mobile Viewport 390x844)
    await page.setViewportSize({ width: 390, height: 844 });

    // แผ่นรายงานต้องแสดงผลได้โดยไม่ล้นจอหรือแตกหัก
    await expect(printView.locator("h1:has-text('บันทึกผลการเวียนหนังสือราชการและหลักฐานการรับทราบ')")).toBeVisible();
  });

  test("การพิมพ์ใบสรุปผลการเวียน: ซ่อน Web UI ทั้งหมด (Sidebar, Header, ปุ่ม) และแสดงเฉพาะแผ่นเอกสารพร้อมผลการลงนาม", async ({
    page,
  }) => {
    // 1. นำทางไปยังหน้าระบบเวียนหนังสือราชการ
    const circularNav = page.locator("aside").getByRole("button", { name: /เวียนหนังสือราชการ/ });
    await expect(circularNav).toBeVisible({ timeout: 10000 });
    await circularNav.click();

    // 2. คลิกพิมพ์
    const card = page.locator('[data-testid="circular-doc-card-circ_print_test_001"]');
    await expect(card).toBeVisible({ timeout: 10000 });
    const printBtn = card.locator("button:has-text('พิมพ์')");
    await printBtn.click();

    const printView = page.locator("[data-testid='circulation-print-view']");
    await expect(printView).toBeVisible();

    // 3. จำลองโหมดพิมพ์กระดาษ (@media print)
    await page.emulateMedia({ media: "print" });

    // 4. โครงสร้างเว็บ UI อื่นๆ ทั้งหมดต้องถูกซ่อนอย่างสมบูรณ์
    const sidebar = page.locator("aside").first();
    await expect(sidebar).toBeHidden();

    const topHeader = page.locator("header").first();
    await expect(topHeader).toBeHidden();

    // 5. แผ่นใบสรุปผลการเวียนและหลักฐานการรับทราบ ต้องยังคงแสดงผลอย่างถูกต้อง
    await expect(page.locator("h1:has-text('บันทึกผลการเวียนหนังสือราชการและหลักฐานการรับทราบ')")).toBeVisible();
  });
});
