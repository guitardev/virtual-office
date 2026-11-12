import { test, expect } from "./fixtures";
import {
  generateReadableSlug,
  getShortLinkStatus,
  validateAndNormalizeTargetUrl,
  validateSlug,
} from "../lib/shorturl-utils";
import type { ShortLinkItem } from "../lib/types";

function createInitialMockLinks(): ShortLinkItem[] {
  return [
    {
      id: "sl-101",
      slug: "kpp-form",
      targetUrl: "https://docs.google.com/forms/d/e/1FAIpQLSfExampleForm/viewform",
      title: "แบบตอบรับการประชุมประจำเดือน พ.ย. 69",
      division: "ฝ่ายบริหารทั่วไป",
      clickCount: 24,
      lastClickedAt: "2026-11-12T03:00:00.000Z",
      expiresAt: null,
      isActive: true,
      createdBy: "usr_2",
      createdByName: "นายวรกร วิเชียรเกษม",
      createdAt: "2026-11-10T08:00:00.000Z",
      updatedAt: "2026-11-10T08:00:00.000Z",
    },
    {
      id: "sl-102",
      slug: "old-notice",
      targetUrl: "https://kamphaengphet.m-society.go.th/news/archived",
      title: "ประกาศรับสมัครอาสาสมัคร (ปิดรับแล้ว)",
      division: "กลุ่มนโยบายและวิชาการ",
      clickCount: 150,
      lastClickedAt: "2026-10-01T09:00:00.000Z",
      expiresAt: null,
      isActive: false,
      createdBy: "usr_1",
      createdByName: "นางสาวนภัสสร พัฒนากิจ",
      createdAt: "2026-09-15T08:00:00.000Z",
      updatedAt: "2026-10-02T08:00:00.000Z",
    },
  ];
}

test.describe("เครื่องมือย่อลิงก์ราชการ Short URL (/tools/shorturl & /s/[slug])", () => {
  test("1. ตรวจสอบฟังก์ชันตรวจสอบ Slug, URL ป้องกัน SSRF/Loop และสุ่มรหัสที่อ่านง่าย", async () => {
    // Valid slug normalization
    const okSlug = validateSlug("  KPP_Meeting-69 ");
    expect(okSlug.valid).toBe(true);
    expect(okSlug.normalized).toBe("kpp_meeting-69");

    // Reserved slug must be rejected
    const reserved = validateSlug("api");
    expect(reserved.valid).toBe(false);
    expect(reserved.error).toContain("คำสงวน");

    // Too short slug rejected
    expect(validateSlug("a").valid).toBe(false);

    // Readable alphabet excludes ambiguous chars (0, o, 1, l, i)
    for (let i = 0; i < 20; i++) {
      const code = generateReadableSlug(6);
      expect(code).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]{6}$/);
    }

    // URL validation & scheme normalization
    const bareUrl = validateAndNormalizeTargetUrl("docs.google.com/forms/d/123");
    expect(bareUrl.valid).toBe(true);
    expect(bareUrl.normalized).toBe("https://docs.google.com/forms/d/123");

    // Dangerous schemes must be rejected
    expect(validateAndNormalizeTargetUrl("javascript:alert(1)").valid).toBe(false);
    expect(validateAndNormalizeTargetUrl("data:text/html,hi").valid).toBe(false);

    // Self-redirect loop prevention
    const loopCheck = validateAndNormalizeTargetUrl("https://www.smso.site/s/abc", [
      "https://www.smso.site",
    ]);
    expect(loopCheck.valid).toBe(false);
    expect(loopCheck.error).toContain("ซ้ำซ้อน");

    // Status classification
    expect(getShortLinkStatus({ isActive: true, expiresAt: null })).toBe("active");
    expect(getShortLinkStatus({ isActive: false, expiresAt: null })).toBe("disabled");
    expect(
      getShortLinkStatus({ isActive: true, expiresAt: "2020-01-01T00:00:00.000Z" })
    ).toBe("expired");
  });

  test("2. สามารถเข้าหน้า Tools และเปิด Short URL จาก Sidebar ได้ พร้อมแสดงสารบบและสถิติ", async ({
    page,
  }) => {
    const mockLinks = createInitialMockLinks();

    await page.route("**/rest/v1/audit_logs*", (route) =>
      route.fulfill({ status: 201, contentType: "application/json", body: "[]" })
    );
    await page.route("**/api/shorturl*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, ready: true, links: mockLinks }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/tools", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("3 เครื่องมือ")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Short URL" })).toBeVisible();

    // Click through to Short URL from Tools overview
    await page.getByRole("link", { name: /เปิดใช้งาน Short URL/ }).click();
    await expect(page).toHaveURL(/\/tools\/shorturl/);
    await expect(
      page.getByRole("heading", { name: /ระบบย่อลิงก์ราชการอัจฉริยะ \(Short URL\)/ })
    ).toBeVisible();

    // Check Sidebar entry exists and works
    const sidebarShortUrlBtn = page.locator("aside button:has-text('Short URL')").first();
    await expect(sidebarShortUrlBtn).toBeVisible();

    // Verify stats & existing items rendered
    await expect(page.getByText("174")).toBeVisible(); // 24 + 150 total clicks
    await expect(page.getByText("แบบตอบรับการประชุมประจำเดือน พ.ย. 69")).toBeVisible();
    await expect(page.getByText("/s/kpp-form").first()).toBeVisible();
  });

  test("3. สามารถสร้างลิงก์ย่อแบบกำหนดชื่อเอง ดู Quick QR และส่งต่อไปยังหน้า QR Code Tool ได้", async ({
    page,
  }) => {
    const mockLinks = createInitialMockLinks();

    await page.route("**/rest/v1/audit_logs*", (route) =>
      route.fulfill({ status: 201, contentType: "application/json", body: "[]" })
    );
    await page.route("**/api/shorturl*", async (route) => {
      const method = route.request().method();
      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, ready: true, links: mockLinks }),
        });
        return;
      }
      if (method === "POST") {
        const body = route.request().postDataJSON();
        const slug = String(body.customSlug || "r9k3m2").toLowerCase();
        if (mockLinks.some((item) => item.slug === slug)) {
          await route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({
              success: false,
              error: `ชื่อย่อ "${slug}" ถูกใช้งานไปแล้ว`,
            }),
          });
          return;
        }
        const created: ShortLinkItem = {
          id: "sl-new-1",
          slug,
          targetUrl: body.targetUrl,
          title: body.title || "",
          division: body.actorDivision || "ฝ่ายบริหารทั่วไป",
          clickCount: 0,
          lastClickedAt: null,
          expiresAt: body.expiresAt || null,
          isActive: true,
          createdBy: body.actorId || "usr_2",
          createdByName: body.actorName || "ผู้ทดสอบ",
          createdAt: "2026-11-12T04:00:00.000Z",
          updatedAt: "2026-11-12T04:00:00.000Z",
        };
        mockLinks.unshift(created);
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ success: true, link: created }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/tools/shorturl", { waitUntil: "domcontentloaded" });

    // Reject reserved slug via client-side live check
    await page.fill("#shorturl-target-input", "https://drive.google.com/drive/folders/abc123");
    await page.fill("#shorturl-slug-input", "admin");
    await expect(page.getByText(/เป็นคำสงวนของระบบ/)).toBeVisible();

    // Fill valid custom slug & title and submit
    await page.fill("#shorturl-slug-input", "grant-69");
    await page.fill("#shorturl-title-input", "คู่มือเบิกจ่ายเงินอุดหนุน 2569");
    await page.click("button[type='submit']:has-text('สร้างลิงก์ย่อทันที')");

    // Highlight card appears with copy, quick QR, and handoff to /tools/qrcode?url=...
    await expect(page.getByText("สร้างลิงก์ย่อล่าสุดสำเร็จ")).toBeVisible();
    await expect(page.getByText("คู่มือเบิกจ่ายเงินอุดหนุน 2569")).toBeVisible();

    const qrToolLink = page.locator("a[href*='/tools/qrcode?url=']").first();
    await expect(qrToolLink).toBeVisible();
    const href = await qrToolLink.getAttribute("href");
    expect(href).toContain(encodeURIComponent("/s/grant-69"));

    // Open Quick QR Preview Modal
    await page.getByRole("button", { name: /ดู QR Code ด่วน/ }).click();
    await expect(page.getByText("QR Code ลิงก์ย่อ /s/grant-69")).toBeVisible();
    const qrImg = page.locator("img[alt='QR Code สำหรับ /s/grant-69']");
    await expect(qrImg).toBeVisible();
    await expect(qrImg).toHaveAttribute("src", /^data:image\/png;base64,/);

    // Click handoff link inside modal -> verify /tools/qrcode pre-fills URL
    await page.getByRole("link", { name: /ใส่ตรา พม\. \/ พิมพ์ป้าย A4/ }).click();
    await expect(page).toHaveURL(/\/tools\/qrcode\?url=/);
    const qrUrlInput = page.locator("input[placeholder='https://...']");
    await expect(qrUrlInput).toHaveValue(/\/s\/grant-69$/);
  });

  test("4. สามารถค้นหา กรองสถานะ แก้ไขปลายทาง เปิด/ปิด และลบลิงก์ย่อได้", async ({
    page,
  }) => {
    let mockLinks = createInitialMockLinks();

    await page.route("**/rest/v1/audit_logs*", (route) =>
      route.fulfill({ status: 201, contentType: "application/json", body: "[]" })
    );
    await page.route("**/api/shorturl*", async (route) => {
      const method = route.request().method();
      if (method === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, ready: true, links: mockLinks }),
        });
        return;
      }
      if (method === "PATCH") {
        const body = route.request().postDataJSON();
        mockLinks = mockLinks.map((item) =>
          item.id === body.id
            ? {
                ...item,
                targetUrl: body.targetUrl ?? item.targetUrl,
                title: body.title ?? item.title,
                isActive: body.isActive ?? item.isActive,
                expiresAt: body.expiresAt === undefined ? item.expiresAt : body.expiresAt,
              }
            : item
        );
        const updated = mockLinks.find((item) => item.id === body.id);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, link: updated }),
        });
        return;
      }
      if (method === "DELETE") {
        const body = route.request().postDataJSON();
        mockLinks = mockLinks.filter((item) => item.id !== body.id);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/tools/shorturl", { waitUntil: "domcontentloaded" });

    // Edit first link's destination URL without changing slug
    await page.getByRole("button", { name: "✏️ แก้ไข" }).first().click();
    await expect(page.getByText("แก้ไขลิงก์ย่อ /s/kpp-form")).toBeVisible();
    await page.fill("#edit-shorturl-target", "https://docs.google.com/forms/d/updated-form-2026");
    await page.click("button:has-text('บันทึกการเปลี่ยนแปลง')");
    await expect(page.getByText("https://docs.google.com/forms/d/updated-form-2026")).toBeVisible();

    // Disable active link via quick toggle
    await page.getByRole("button", { name: "⏸️ ปิดใช้" }).first().click();
    await expect(page.getByText("ปิดใช้งานลิงก์ /s/kpp-form ชั่วคราวแล้ว")).toBeVisible();

    // Filter search
    await page.fill("input[placeholder*='ค้นหาจากชื่อย่อ']", "old-notice");
    await expect(page.getByText("/s/old-notice").first()).toBeVisible();
    await expect(page.getByText("แบบตอบรับการประชุมประจำเดือน พ.ย. 69")).not.toBeVisible();

    // Clear search and delete first item
    await page.fill("input[placeholder*='ค้นหาจากชื่อย่อ']", "");
    await page.getByRole("button", { name: "🗑️ ลบ" }).first().click();
    await expect(page.getByText("ยืนยันการลบลิงก์ย่อ")).toBeVisible();
    await page.click("button:has-text('ยืนยันลบถาวร')");
    await expect(page.getByText("แบบตอบรับการประชุมประจำเดือน พ.ย. 69")).not.toBeVisible();
  });

  test("5. เมื่อตาราง short_links ยังไม่ถูกสร้างใน Supabase ควรแสดงคู่มือ SQL Setup อย่างสุภาพ", async ({
    page,
  }) => {
    await page.route("**/api/shorturl*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          ready: false,
          setupRequired: true,
          links: [],
        }),
      });
    });

    await page.goto("/tools/shorturl", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByText("ยังไม่พบตาราง public.short_links ใน Supabase")
    ).toBeVisible();
    await expect(
      page.getByText(/CREATE TABLE IF NOT EXISTS public\.short_links/)
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /คัดลอก SQL/ })).toBeVisible();
  });

  test("6. เส้นทางสาธารณะ /s/[slug] ทำงานนอกหน้า Login และส่ง HTTP 404 HTML เมื่อไม่พบลิงก์", async ({
    request,
  }) => {
    const resInvalid = await request.get("/s/bad$slug");
    expect(resInvalid.status()).toBe(404);
    expect(resInvalid.headers()["cache-control"]).toContain("no-store");
    const invalidHtml = await resInvalid.text();
    expect(invalidHtml).toContain("รูปแบบลิงก์ย่อไม่ถูกต้อง");

    const resMissing = await request.get("/s/nonexistent-smso-test-999");
    expect(resMissing.status()).toBe(404);
    expect(resMissing.headers()["cache-control"]).toContain("no-store");
    const missingHtml = await resMissing.text();
    expect(missingHtml).toContain("ไม่พบลิงก์ย่อนี้ในระบบ");
  });
});

