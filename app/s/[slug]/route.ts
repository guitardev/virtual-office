import { NextRequest, NextResponse, after } from "next/server";
import {
  getShortLinkBySlugFromSupabase,
  incrementShortLinkClickInSupabase,
} from "@/lib/shorturl-db";
import { isShortLinkExpired, normalizeSlug } from "@/lib/shorturl-utils";

export const dynamic = "force-dynamic";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderStatusHtmlPage(opts: {
  status: number;
  badge: string;
  title: string;
  message: string;
  slug?: string;
}): NextResponse {
  const safeBadge = escapeHtml(opts.badge);
  const safeTitle = escapeHtml(opts.title);
  const safeMessage = escapeHtml(opts.message);
  const safeSlug = opts.slug ? escapeHtml(opts.slug) : "";

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>${safeTitle} — Smart MSO Short URL</title>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, 'Sarabun', sans-serif; background: #f8fafc; color: #0f172a; display: flex; min-height: 100vh; align-items: center; justify-content: center; padding: 24px; }
    .card { max-width: 460px; width: 100%; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 24px; padding: 32px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06); text-align: center; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; margin-bottom: 14px; }
    h1 { margin: 0 0 10px; font-size: 20px; font-weight: 800; color: #0f172a; }
    p { margin: 0 0 18px; font-size: 14px; line-height: 1.6; color: #475569; }
    .slug { display: inline-block; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 13px; background: #f1f5f9; color: #334155; padding: 4px 10px; border-radius: 8px; margin-bottom: 18px; }
    .btn { display: inline-block; text-decoration: none; background: #4f46e5; color: #ffffff; padding: 10px 20px; border-radius: 12px; font-size: 13px; font-weight: 700; }
    .footer { margin-top: 20px; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${safeBadge}</div>
    <h1>${safeTitle}</h1>
    ${safeSlug ? `<div class="slug">/s/${safeSlug}</div>` : ""}
    <p>${safeMessage}</p>
    <a class="btn" href="/">กลับสู่หน้าหลัก Smart MSO</a>
    <div class="footer">สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร</div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: opts.status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Robots-Tag": "noindex",
    },
  });
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug: rawParam } = await context.params;

  let decoded = rawParam;
  try {
    decoded = decodeURIComponent(rawParam);
  } catch {
    decoded = rawParam;
  }

  const slug = normalizeSlug(decoded);
  if (!/^[a-z0-9][a-z0-9_-]{1,63}$/.test(slug)) {
    return renderStatusHtmlPage({
      status: 404,
      badge: "HTTP 404 · ไม่พบลิงก์",
      title: "รูปแบบลิงก์ย่อไม่ถูกต้อง",
      message: "กรุณาตรวจสอบลิงก์ย่ออีกครั้ง หรือขอรับลิงก์ใหม่จากเจ้าหน้าที่ผู้จัดส่ง",
      slug,
    });
  }

  const { ready, link } = await getShortLinkBySlugFromSupabase(slug);

  if (!ready || !link) {
    return renderStatusHtmlPage({
      status: 404,
      badge: "HTTP 404 · ไม่พบข้อมูล",
      title: "ไม่พบลิงก์ย่อนี้ในระบบ",
      message: "ลิงก์นี้อาจถูกลบไปแล้ว หรือพิมพ์รหัสลิงก์ไม่ถูกต้อง",
      slug,
    });
  }

  if (!link.isActive) {
    return renderStatusHtmlPage({
      status: 410,
      badge: "HTTP 410 · ปิดการใช้งาน",
      title: "ลิงก์ย่อนี้ถูกระงับการใช้งานชั่วคราว",
      message: "ผู้สร้างหรือผู้ดูแลระบบได้ปิดการใช้งานลิงก์นี้แล้ว กรุณาติดต่อหน่วยงานเจ้าของเรื่อง",
      slug,
    });
  }

  if (isShortLinkExpired(link)) {
    return renderStatusHtmlPage({
      status: 410,
      badge: "HTTP 410 · หมดอายุ",
      title: "ลิงก์ย่อนี้หมดอายุการใช้งานแล้ว",
      message: "พ้นกำหนดระยะเวลาเปิดใช้งานของลิงก์นี้แล้ว หากยังจำเป็นต้องเข้าถึงเอกสาร กรุณาติดต่อเจ้าหน้าที่",
      slug,
    });
  }

  // Final defense-in-depth protocol verification prior to redirect
  let safeTarget: URL;
  try {
    safeTarget = new URL(link.targetUrl);
    if (safeTarget.protocol !== "http:" && safeTarget.protocol !== "https:") {
      throw new Error("Unsupported protocol");
    }
  } catch {
    return renderStatusHtmlPage({
      status: 400,
      badge: "ลิงก์ปลายทางไม่ปลอดภัย",
      title: "ไม่สามารถส่งต่อไปยังปลายทางได้",
      message: "URL ปลายทางของลิงก์นี้ไม่อยู่ในรูปแบบที่อนุญาตให้ส่งต่อ",
      slug,
    });
  }

  after(async () => {
    await incrementShortLinkClickInSupabase(slug);
  });

  const response = NextResponse.redirect(safeTarget.toString(), { status: 307 });
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("X-Robots-Tag", "noindex");
  return response;
}

