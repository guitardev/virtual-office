import { test, expect } from "./fixtures";

test.describe("ระบบแชทกลุ่มทางการของกลุ่มงาน/ฝ่าย (Official Division Chat)", () => {
  test("ควรแสดงกลุ่มงานทางการของสำนักงาน และเปิด/ปิด Modal สร้างกลุ่มใหม่ได้", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 1. ไปที่เมนู แชททีม
    const chatNav = page
      .locator("aside button:has-text('แชททีม'), nav button:has-text('แชททีม')")
      .first();
    await chatNav.click();

    // 2. ตรวจสอบกลุ่มงานทางการของสำนักงาน
    const divisionGroup = page.locator("text=กลุ่มงานประจำสำนักงาน").first();
    await expect(divisionGroup).toBeVisible();

    // 3. ตรวจสอบปุ่มสร้างกลุ่มแชท
    const createGroupBtn = page.locator("button:has-text('+ สร้างกลุ่ม'), button:has-text('สร้างกลุ่ม')").first();
    await expect(createGroupBtn).toBeVisible();
    await createGroupBtn.click();

    // 4. ตรวจสอบ Modal สร้างกลุ่มใหม่
    const modalTitle = page.locator("h3:has-text('สร้างกลุ่มแชทโครงการใหม่')");
    await expect(modalTitle).toBeVisible();

    // ตรวจสอบปุ่มปิดสีแดงเด่นชัด
    const closeBtn = page.locator("button:has-text('ปิดหน้าต่าง')").first();
    await expect(closeBtn).toBeVisible();

    // 5. ปิดหน้าต่าง
    await closeBtn.click();
    await expect(modalTitle).not.toBeVisible();
  });

  test("ควรสามารถแนบเอกสารราชการหลายประเภท (PDF, Word, Excel) พร้อมกัน ตรวจสอบรายการ และส่งข้อความได้", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 1. ไปที่เมนู แชททีม
    const chatNav = page
      .locator("aside button:has-text('แชททีม'), nav button:has-text('แชททีม')")
      .first();
    await chatNav.click();

    // 2. คลิกปุ่มแบบฟอร์มราชการ เพื่อเปิด Dropdown
    const templateBtn = page.locator("button:has-text('แบบฟอร์มราชการ')").first();
    await expect(templateBtn).toBeVisible();
    await templateBtn.click();

    // 3. ตรวจสอบรายการแบบฟอร์มราชการ และเลือกแนบ PDF
    const pdfTemplate = page.locator("button:has-text('บันทึกข้อความ')").first();
    await expect(pdfTemplate).toBeVisible();
    await pdfTemplate.click();

    // 4. แนบแบบฟอร์ม Word เพิ่มเติม
    await templateBtn.click();
    const docTemplate = page.locator("button:has-text('ร่างคำสั่งจังหวัด')").first();
    await expect(docTemplate).toBeVisible();
    await docTemplate.click();

    // 5. ตรวจสอบว่ามีกล่องแสดงไฟล์ที่พร้อมส่ง (Draft chips) ปรากฏ 2 รายการ
    const draftContainer = page.locator("text=ไฟล์ที่พร้อมส่ง (2 รายการ)");
    await expect(draftContainer).toBeVisible();

    // 6. พิมพ์ข้อความและกดส่ง
    const messageInput = page.locator("textarea[placeholder*='พิมพ์ข้อความสนทนา']").first();
    await messageInput.fill("เรียนทุกท่าน ขอส่งบันทึกข้อความและร่างคำสั่งจังหวัดเพื่อโปรดพิจารณา");

    const sendBtn = page.locator("button[type='submit']:has-text('ส่ง')").first();
    await sendBtn.click();

    // 7. ตรวจสอบว่าข้อความถูกส่งเข้าไปในกล่องแชทเรียบร้อย
    const sentMessage = page.locator("text=เรียนทุกท่าน ขอส่งบันทึกข้อความและร่างคำสั่งจังหวัดเพื่อโปรดพิจารณา").first();
    await expect(sentMessage).toBeVisible();

    // 8. ตรวจสอบว่าการ์ดไฟล์แนบแสดงครบทั้ง 2 ชิ้น พร้อมป้ายประเภทและปุ่มดาวน์โหลด
    const pdfCard = page.locator("div:has-text('บันทึกข้อความ_ขออนุมัติจัดโครงการสัมมนา2569.pdf')").first();
    await expect(pdfCard).toBeVisible();

    const docCard = page.locator("div:has-text('ร่างคำสั่งจังหวัดกำแพงเพชร_แต่งตั้งคณะทำงาน.docx')").first();
    await expect(docCard).toBeVisible();

    // 9. ทดสอบคลิกปุ่มดาวน์โหลดเอกสาร
    const downloadBtn = pdfCard.locator("button:has-text('ดาวน์โหลด')").first();
    await expect(downloadBtn).toBeVisible();
    await downloadBtn.click();
  });

  test("ควรรองรับการแนบไฟล์จริงผ่าน File Input และแสดงภาพพรีวิวขนาดเล็ก (Thumbnail)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 1. ไปที่เมนู แชททีม
    const chatNav = page
      .locator("aside button:has-text('แชททีม'), nav button:has-text('แชททีม')")
      .first();
    await chatNav.click();

    // 2. จำลองการเลือกไฟล์จริงผ่าน input type=file
    const fileInput = page.locator("input[type='file']").first();
    await fileInput.setInputFiles([
      {
        name: "รายงานผลการดำเนินงาน_ประจำปี.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: Buffer.from("dummy excel content"),
      },
      {
        name: "หลักฐานประกอบ_ใบเสร็จ.zip",
        mimeType: "application/zip",
        buffer: Buffer.from("dummy zip content"),
      },
    ]);

    // 3. ตรวจสอบว่าแสดงรายการไฟล์พร้อมส่ง
    const readyFiles = page.locator("text=ไฟล์ที่พร้อมส่ง (2 รายการ)");
    await expect(readyFiles).toBeVisible();

    // ตรวจสอบชิปไฟล์ Excel และ ZIP
    await expect(page.locator("text=รายงานผลการดำเนินงาน_ประจำปี.xlsx").first()).toBeVisible();
    await expect(page.locator("text=หลักฐานประกอบ_ใบเสร็จ.zip").first()).toBeVisible();

    // 4. ทดสอบลบไฟล์ออกจากชิป 1 ไฟล์
    const deleteZipBtn = page.locator("button[data-testid='remove-att-หลักฐานประกอบ_ใบเสร็จ.zip']").first();
    await deleteZipBtn.click();

    // 5. เหลือ 1 รายการ
    await expect(page.locator("text=ไฟล์ที่พร้อมส่ง (1 รายการ)")).toBeVisible();

    // 6. ส่งข้อความพร้อมไฟล์ Excel ที่เหลือ
    const messageInput = page.locator("textarea[placeholder*='พิมพ์ข้อความสนทนา']").first();
    await messageInput.fill("แนบไฟล์สรุปงบประมาณประจำปีครับ");
    const sendBtn = page.locator("button[type='submit']:has-text('ส่ง')").first();
    await sendBtn.click();

    // 7. ตรวจสอบข้อความและการ์ดไฟล์ Excel ในห้องแชท
    const sentBubble = page.locator("div.rounded-2xl:has-text('แนบไฟล์สรุปงบประมาณประจำปีครับ')").first();
    await expect(sentBubble).toBeVisible();
    await expect(sentBubble.locator("text=รายงานผลการดำเนินงาน_ประจำปี.xlsx").first()).toBeVisible();
  });
});
