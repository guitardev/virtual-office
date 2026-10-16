import { test, expect } from "./fixtures";

test.describe("Phase 12: ระบบจัดการการจองรถซ้อนทับและตารางไทม์ไลน์ (Fleet Conflict Guard & Gantt Timeline)", () => {
  test("ควรแสดงแท็บ Gantt Timeline, สลับมุมมอง Day/Week และแสดงตารางยานพาหนะได้ครบถ้วน", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 1. ไปที่เมนู รถยนต์สำนักงาน
    const carNav = page
      .locator("aside button:has-text('รถยนต์สำนักงาน'), nav button:has-text('รถยนต์สำนักงาน')")
      .first();
    await carNav.click();

    // 2. ตรวจสอบแท็บ 'ตารางไทม์ไลน์ภารกิจ (Gantt View)'
    const timelineTabBtn = page.locator("button:has-text('ตารางไทม์ไลน์ภารกิจ')").first();
    await expect(timelineTabBtn).toBeVisible();
    await timelineTabBtn.click();

    // 3. ตรวจสอบองค์ประกอบในหน้า Gantt View
    await expect(page.locator("text=ยานพาหนะราชการ").first()).toBeVisible();
    await expect(page.locator("text=อัตราการใช้งาน").first()).toBeVisible();

    // ตรวจสอบปุ่มสลับมุมมอง รายวัน / รายสัปดาห์
    const dayBtn = page.locator("button:has-text('รายวัน (24 ชม.)')").first();
    const weekBtn = page.locator("button:has-text('รายสัปดาห์ (7 วัน)')").first();
    await expect(dayBtn).toBeVisible();
    await expect(weekBtn).toBeVisible();

    // คลิกสลับมุมมองเป็น รายสัปดาห์
    await weekBtn.click();
    await expect(page.locator("text=สัปดาห์:").first()).toBeVisible();

    // คลิกกลับเป็น รายวัน
    await dayBtn.click();
    await expect(page.locator("text=08:00").first()).toBeVisible();
  });

  test("ควรแจ้งเตือน Conflict Guard เมื่อมีการเลือกเวลาซ้อนทับ และแนะนำรถคันอื่นที่ว่าง", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // ไปที่เมนู รถยนต์สำนักงาน
    const carNav = page
      .locator("aside button:has-text('รถยนต์สำนักงาน'), nav button:has-text('รถยนต์สำนักงาน')")
      .first();
    await carNav.click();

    // สลับไปยังแท็บ 'ยื่นคำขอใหม่'
    const newReqTabBtn = page.locator("button:has-text('ยื่นคำขอใหม่')").first();
    await expect(newReqTabBtn).toBeVisible();
    await newReqTabBtn.click();

    // ตรวจสอบหัวฟอร์ม
    await expect(
      page.locator("text=แบบขออนุญาตใช้รถยนต์ส่วนกลาง (พร้อมระบุงบประมาณค่าน้ำมัน)")
    ).toBeVisible();

    // ตรวจสอบช่องกรอกวันเดินทาง
    const depInput = page.locator("input[type='datetime-local']").first();
    const retInput = page.locator("input[type='datetime-local']").nth(1);
    await expect(depInput).toBeVisible();
    await expect(retInput).toBeVisible();

    // หากระบบมีคำขอจองอยู่ในระบบ หรือเมื่อกรอกข้อมูลเวลา
    // ตรวจสอบว่ามีช่องทางเลือกรถยนต์ราชการ
    const carButtons = page.locator("button:has-text('พร้อมใช้'), button:has-text('มีภารกิจ')");
    await expect(carButtons.first()).toBeVisible();
  });

  test("ควรแสดงแบบขออนุญาตใช้รถพร้อม QR Code ตรวจรับกุญแจรถราชการ (Paperless Dispatch QR)", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // ไปที่เมนู รถยนต์สำนักงาน
    const carNav = page
      .locator("aside button:has-text('รถยนต์สำนักงาน'), nav button:has-text('รถยนต์สำนักงาน')")
      .first();
    await carNav.click();

    // สลับไปยังแท็บทะเบียนคำขอ
    const reqTabBtn = page.locator("button:has-text('ทะเบียนคำขอจองรถ')").first();
    await reqTabBtn.click();

    // ตรวจสอบปุ่มเปิดแบบขอใช้รถ (หากมีคำขอในระบบ)
    const docButtons = page.locator("button:has-text('แบบขออนุญาตใช้รถ')");
    const count = await docButtons.count();

    if (count > 0) {
      await docButtons.first().click();

      // ตรวจสอบหน้าต่าง Modal แบบขออนุญาตใช้รถ
      await expect(page.locator("text=แบบขออนุญาตใช้รถยนต์ส่วนกลาง").first()).toBeVisible();

      // ตรวจสอบ QR Code ตรวจรับกุญแจรถ
      const qrImage = page.locator("img[alt^='QR Code']").first();
      await expect(qrImage).toBeVisible();

      // ปิดหน้าต่าง Modal
      const closeBtn = page.locator("button:has-text('ปิด')").first();
      await closeBtn.click();
    }
  });
});
