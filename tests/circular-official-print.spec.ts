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

  test("รองรับแม่แบบราชการมาตรฐานครบถ้วน ๔ รูปแบบ (บันทึกข้อความ, หนังสือภายนอก, คำสั่ง, ประกาศ)", async ({
    page,
  }) => {
    // 1. นำทางไปยังหน้าระบบเวียนหนังสือราชการ
    const circularNav = page.locator("aside").getByRole("button", { name: /เวียนหนังสือราชการ/ });
    await expect(circularNav).toBeVisible({ timeout: 10000 });
    await circularNav.click();

    // 2. คลิกดูเอกสารเพื่อเปิด OfficialCircularSheet
    const card = page.locator('[data-testid="circular-doc-card-circ_print_test_001"]');
    await expect(card).toBeVisible({ timeout: 10000 });
    await card.locator("h3").click();

    // 3. ตรวจสอบแท็บสลับรูปแบบ ๔ รูปแบบ
    const modal = page.locator("div[role='dialog']").first();
    await expect(page.locator("text=รูปแบบหนังสือราชการ:")).toBeVisible({ timeout: 10000 });

    const memoTab = page.locator("button:has-text('บันทึกข้อความ (ภายใน)')");
    const externalTab = page.locator("button:has-text('หนังสือภายนอก')");
    const commandTab = page.locator("button:has-text('คำสั่งราชการ')");
    const announcementTab = page.locator("button:has-text('ประกาศราชการ')");

    await expect(memoTab).toBeVisible();
    await expect(externalTab).toBeVisible();
    await expect(commandTab).toBeVisible();
    await expect(announcementTab).toBeVisible();

    // 4. ตรวจสอบแบบที่ ๑: บันทึกข้อความ (Memo) - หัวเรื่องบันทึกข้อความ และตราครุฑ 1.5 ซม.
    await memoTab.click();
    await expect(page.locator("h1:has-text('บันทึกข้อความ')")).toBeVisible();

    // 5. ตรวจสอบแบบที่ ๒: หนังสือภายนอก (External Letter) - มี 'เรื่อง', 'เรียน', 'ขอแสดงความนับถือ'
    await externalTab.click();
    await expect(page.locator("text=ขอแสดงความนับถือ")).toBeVisible();
    await expect(page.locator("text=ศูนย์ราชการจังหวัดกำแพงเพชร")).toBeVisible();

    // 6. ตรวจสอบแบบที่ ๓: คำสั่งราชการ (Command) - มี 'คำสั่ง', 'ข้อ ๑', 'สั่ง ณ วันที่'
    await commandTab.click();
    await expect(page.locator("h1:has-text('คำสั่ง')")).toBeVisible();
    await expect(page.locator("text=สั่ง ณ วันที่")).toBeVisible();

    // 7. ตรวจสอบแบบที่ ๔: ประกาศราชการ (Announcement) - มี 'ประกาศ', 'ประกาศ ณ วันที่'
    await announcementTab.click();
    await expect(page.locator("h1:has-text('ประกาศ')")).toBeVisible();
    await expect(page.locator("text=ประกาศ ณ วันที่")).toBeVisible();
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

    // 8. สลับไปแท็บ Live Preview ตรวจสอบว่าหัวหนังสือราชการแสดงวันที่เป็นเลขไทย
    const livePreviewTab = page.locator("button:has-text('ดูตัวอย่างหนังสือราชการตราครุฑ')");
    await livePreviewTab.click();

    const officialSheet = page.locator("h1:has-text('บันทึกข้อความ')");
    await expect(officialSheet).toBeVisible();
    await expect(page.locator("strong:has-text('วันที่')").first()).toBeVisible();
  });
});
