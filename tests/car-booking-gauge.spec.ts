import { test, expect } from "./fixtures";

test.describe("ระบบยานพาหนะราชการ & เกจวัดระดับน้ำมันเสมือนจริง (Car Booking & Gauges)", () => {
  test("ควรแสดงรายการรถยนต์ เกจวัดน้ำมันแอนะล็อก เลขไมล์ และเปิดแฟ้มประวัติรถยนต์ได้", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 1. ไปที่เมนู รถยนต์สำนักงาน
    const carNav = page
      .locator("aside button:has-text('รถยนต์สำนักงาน'), nav button:has-text('รถยนต์สำนักงาน')")
      .first();
    await carNav.click();

    // 2. สลับไปยังแท็บ 'ยานพาหนะราชการ & จัดการข้อมูล'
    const fleetTabBtn = page.locator("button:has-text('ยานพาหนะราชการ')").first();
    await expect(fleetTabBtn).toBeVisible();
    await fleetTabBtn.click();

    // 3. ตรวจสอบการ์ดรถยนต์แต่ละคัน
    const carCards = page.locator(".rounded-2xl.border.border-slate-200");
    await expect(carCards.first()).toBeVisible();

    // ตรวจสอบการแสดงเลขไมล์ Odometer
    const odometerLabel = page.locator("text=ODOMETER").first();
    await expect(odometerLabel).toBeVisible();

    // ตรวจสอบเกจวัดระดับน้ำมันเสมือนจริง
    const gaugeScale = page.locator("text=1/2").first();
    await expect(gaugeScale).toBeVisible();

    // 4. ทดสอบเปิดแฟ้มประวัติรถยนต์ (VehicleDetailModal)
    const detailBtn = page.locator("button:has-text('ดูแฟ้มประวัติ')").first();
    await expect(detailBtn).toBeVisible();
    await detailBtn.click();

    // ตรวจสอบคลัสเตอร์ Dashboard เกจวัดน้ำมันใน Modal
    const clusterLabel = page.locator("text=เกจระดับน้ำมันหน้าปัดรถยนต์");
    await expect(clusterLabel).toBeVisible();

    // ตรวจสอบปุ่มปิดสีแดงเด่นชัด
    const closeDetailBtn = page.locator("button:has-text('ปิดหน้าต่าง')").first();
    await expect(closeDetailBtn).toBeVisible();

    // 5. ปิดหน้าต่าง
    await closeDetailBtn.click();
    await expect(clusterLabel).not.toBeVisible();
  });
});
