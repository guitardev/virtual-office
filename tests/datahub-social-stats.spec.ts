import { test, expect } from "./fixtures";

test.describe("ศูนย์ข้อมูลและสถิติสังคม พม. (Smart Social Data Hub - /data-hub)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/data-hub");
    await page.waitForLoadState("networkidle");
  });

  test("1. แดชบอร์ดสถานการณ์กลุ่มเปราะบาง: แสดงสถิติภาพรวม ๑๑ อำเภอ และ ๕ มิติความยากจน TPMAP ครบถ้วน", async ({
    page,
  }) => {
    // 1. ตรวจสอบหัวข้อหลัก
    await expect(
      page.locator("h1:has-text('ศูนย์ข้อมูลและสถิติสังคม (Data Hub)')").first()
    ).toBeVisible({ timeout: 10000 });

    // 2. ตรวจสอบ Quick Metrics: 11 อำเภอ
    await expect(page.locator("text=11 อำเภอ").first()).toBeVisible();

    // 3. ตรวจสอบการ์ด KPI สำคัญ: ครัวเรือนเปราะบาง, คนพิการ, เงินอุดหนุนเด็กแรกเกิด, ศรส. 1300
    await expect(page.locator("text=ครัวเรือนเปราะบาง").first()).toBeVisible();
    await expect(page.locator("text=คนพิการมีบัตร").first()).toBeVisible();
    await expect(page.locator("text=เงินอุดหนุนเด็กแรกเกิด").first()).toBeVisible();
    await expect(page.locator("text=เคส ศรส. 1300").first()).toBeVisible();

    // 4. ตรวจสอบการวิเคราะห์ ๕ มิติความยากจน TPMAP
    await expect(page.locator("text=มิติสุขภาพ").first()).toBeVisible();
    await expect(page.locator("text=มิติความเป็นอยู่").first()).toBeVisible();
    await expect(page.locator("text=มิติการศึกษา").first()).toBeVisible();
    await expect(page.locator("text=มิติรายได้").first()).toBeVisible();
    await expect(page.locator("text=มิติเข้าถึงบริการรัฐ").first()).toBeVisible();

    // 5. ตรวจสอบตารางรายอำเภอ มีอำเภอเมืองกำแพงเพชร, คลองขลุง, ขาณุวรลักษบุรี
    await expect(page.locator("td:has-text('อำเภอเมืองกำแพงเพชร')").first()).toBeVisible();
    await expect(page.locator("td:has-text('อำเภอคลองขลุง')").first()).toBeVisible();
    await expect(page.locator("td:has-text('อำเภอขาณุวรลักษบุรี')").first()).toBeVisible();
  });

  test("2. การคัดกรองอำเภอและปีงบประมาณ พ.ศ.: ปรับเปลี่ยนข้อมูลตามเงื่อนไขอย่างถูกต้อง", async ({
    page,
  }) => {
    // 1. ทดสอบเลือกเฉพาะ 'อำเภอพรานกระต่าย'
    const districtSelect = page.locator("select").first();
    await districtSelect.selectOption("phran_kratai");

    // ในตารางต้องแสดงอำเภอพรานกระต่าย และไม่แสดงอำเภอขาณุวรลักษบุรี
    await expect(page.locator("td:has-text('อำเภอพรานกระต่าย')").first()).toBeVisible();
    await expect(page.locator("td:has-text('อำเภอขาณุวรลักษบุรี')")).toBeHidden();

    // 2. สลับปีงบประมาณเป็น 'ปี 2570'
    const yr2570Btn = page.locator("button:has-text('ปี 2570')").first();
    await yr2570Btn.click();
    await expect(page.locator("text=ปีงบประมาณ พ.ศ. 2570").first()).toBeVisible();

    // 3. รีเซ็ตกลับเป็นทุกอำเภอ
    await page.locator("button:has-text('✕ แสดงทุกอำเภอ')").first().click();
    await expect(page.locator("td:has-text('อำเภอขาณุวรลักษบุรี')").first()).toBeVisible();
  });

  test("3. รายงานทางการ กบจ.: สามารถเปิดดูเอกสารราชการพร้อมตราครุฑและบล็อกลงนาม", async ({
    page,
  }) => {
    // กดปุ่ม 'พิมพ์รายงาน กบจ.'
    const printReportBtn = page.locator("button:has-text('พิมพ์รายงาน กบจ.')").first();
    await expect(printReportBtn).toBeVisible();
    await printReportBtn.click();

    // ตรวจสอบ Modal รายงานทางการ
    const reportTitle = page.locator(
      "h1:has-text('รายงานสถานการณ์ทางสังคมและข้อมูลการพัฒนาคุณภาพชีวิตครัวเรือนเปราะบาง')"
    ).first();
    await expect(reportTitle).toBeVisible();

    // ตรวจสอบว่ามีบล็อกรับรองรายงานของผู้บริหาร พมจ.
    await expect(page.locator("text=พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร").first()).toBeVisible();

    // ตรวจสอบปุ่มพิมพ์และส่งออก Excel
    await expect(page.locator("button:has-text('พิมพ์ / บันทึก PDF')").first()).toBeVisible();
    await expect(page.locator("button:has-text('ส่งออก Excel')").first()).toBeVisible();

    // ปิด Modal
    await page.locator("button[title='ปิดหน้าต่าง']").first().click();
    await expect(reportTitle).toBeHidden();
  });

  test("4. การสลับแท็บ ๔ กลุ่มภารกิจงาน และคลังแบบฟอร์มเอกสารราชการ", async ({
    page,
  }) => {
    // 1. สลับไปแท็บ ๔ กลุ่มภารกิจ
    await page.locator("button:has-text('ระบบงาน ๔ กลุ่มภารกิจ พมจ.')").first().click();
    await expect(page.locator("h3:has-text('ฝ่ายบริหารทั่วไป')").first()).toBeVisible();
    await expect(page.locator("h3:has-text('กลุ่มนโยบายและวิชาการ')").first()).toBeVisible();
    await expect(page.locator("h3:has-text('กลุ่มการพัฒนาสังคมและสวัสดิการ')").first()).toBeVisible();
    await expect(page.locator("h3:has-text('ศูนย์บริการคนพิการจังหวัดกำแพงเพชร')").first()).toBeVisible();

    // 2. สลับไปแท็บคลังแบบฟอร์ม
    await page.locator("button:has-text('คลังแบบฟอร์มและระเบียบราชการ')").first().click();
    await expect(page.locator("text=สารบบเอกสาร แบบฟอร์มคำขอ และระเบียบราชการ").first()).toBeVisible();

    // ค้นหาเอกสาร 'แบบฟอร์มขอใช้รถยนต์'
    const docSearch = page.locator("input[placeholder*='ค้นหาเอกสาร']").first();
    await docSearch.fill("รถยนต์");
    await expect(page.locator("text=แบบฟอร์มขอใช้รถยนต์ราชการ (กพพ. 01)").first()).toBeVisible();
  });
});
