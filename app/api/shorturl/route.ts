import { NextRequest, NextResponse } from "next/server";
import {
  fetchShortLinksFromSupabase,
  getShortLinkByIdFromSupabase,
  createShortLinkInSupabase,
  updateShortLinkInSupabase,
  deleteShortLinkInSupabase,
} from "@/lib/shorturl-db";
import {
  DEFAULT_PUBLIC_SHORT_BASE_URL,
  generateReadableSlug,
  validateAndNormalizeTargetUrl,
  validateSlug,
} from "@/lib/shorturl-utils";

export const dynamic = "force-dynamic";

function canManageShortLink(
  existing: { createdBy?: string | null; createdByName?: string },
  actor: { id?: string; name?: string; role?: string }
): boolean {
  if (actor.role === "admin") return true;
  if (actor.id && existing.createdBy && String(actor.id) === String(existing.createdBy)) {
    return true;
  }
  if (
    actor.name &&
    existing.createdByName &&
    actor.name.trim() === existing.createdByName.trim()
  ) {
    return true;
  }
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const result = await fetchShortLinksFromSupabase();

    if (!result.ready && !result.error) {
      return NextResponse.json({
        success: true,
        ready: false,
        setupRequired: true,
        links: [],
      });
    }

    if (result.error) {
      return NextResponse.json(
        {
          success: false,
          ready: false,
          links: [],
          error: result.error,
        },
        { status: 500 }
      );
    }

    const search = request.nextUrl.searchParams.get("search")?.trim().toLowerCase() || "";
    const links = search
      ? result.links.filter(
          (item) =>
            item.slug.toLowerCase().includes(search) ||
            item.targetUrl.toLowerCase().includes(search) ||
            item.title.toLowerCase().includes(search) ||
            (item.createdByName || "").toLowerCase().includes(search)
        )
      : result.links;

    return NextResponse.json({
      success: true,
      ready: true,
      setupRequired: false,
      links,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        ready: false,
        links: [],
        error: err instanceof Error ? err.message : "Server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawTargetUrl = String(body?.targetUrl || "");
    const rawCustomSlug = typeof body?.customSlug === "string" ? body.customSlug.trim() : "";
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const expiresAtRaw =
      typeof body?.expiresAt === "string" && body.expiresAt.trim()
        ? body.expiresAt.trim()
        : null;
    const actorId = typeof body?.actorId === "string" ? body.actorId.trim() : null;
    const actorName = typeof body?.actorName === "string" ? body.actorName.trim() : "";
    const actorDivision = typeof body?.actorDivision === "string" ? body.actorDivision.trim() : "";

    const urlCheck = validateAndNormalizeTargetUrl(rawTargetUrl, [
      request.nextUrl.origin,
      DEFAULT_PUBLIC_SHORT_BASE_URL,
    ]);
    if (!urlCheck.valid) {
      return NextResponse.json(
        { success: false, error: urlCheck.error },
        { status: 400 }
      );
    }

    let expiresAtIso: string | null = null;
    if (expiresAtRaw) {
      const parsedExp = new Date(
        /^\d{4}-\d{2}-\d{2}$/.test(expiresAtRaw)
          ? `${expiresAtRaw}T23:59:59+07:00`
          : expiresAtRaw
      );
      if (Number.isNaN(parsedExp.getTime())) {
        return NextResponse.json(
          { success: false, error: "รูปแบบวันหมดอายุไม่ถูกต้อง" },
          { status: 400 }
        );
      }
      if (parsedExp.getTime() <= Date.now()) {
        return NextResponse.json(
          { success: false, error: "วันหมดอายุต้องอยู่หลังเวลาปัจจุบัน" },
          { status: 400 }
        );
      }
      expiresAtIso = parsedExp.toISOString();
    }

    if (rawCustomSlug) {
      const slugCheck = validateSlug(rawCustomSlug);
      if (!slugCheck.valid) {
        return NextResponse.json(
          { success: false, error: slugCheck.error },
          { status: 400 }
        );
      }

      const created = await createShortLinkInSupabase({
        slug: slugCheck.normalized,
        targetUrl: urlCheck.normalized,
        title,
        division: actorDivision,
        expiresAt: expiresAtIso,
        createdBy: actorId,
        createdByName: actorName,
      });

      if (created.setupRequired) {
        return NextResponse.json(
          { success: false, setupRequired: true, error: created.error },
          { status: 503 }
        );
      }
      if (created.duplicate) {
        return NextResponse.json(
          { success: false, error: created.error },
          { status: 409 }
        );
      }
      if (created.error || !created.link) {
        return NextResponse.json(
          { success: false, error: created.error || "ไม่สามารถสร้างลิงก์ย่อได้" },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { success: true, link: created.link },
        { status: 201 }
      );
    }

    // Auto-generate readable slug with collision retries
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidateSlug = generateReadableSlug(6);
      const created = await createShortLinkInSupabase({
        slug: candidateSlug,
        targetUrl: urlCheck.normalized,
        title,
        division: actorDivision,
        expiresAt: expiresAtIso,
        createdBy: actorId,
        createdByName: actorName,
      });

      if (created.setupRequired) {
        return NextResponse.json(
          { success: false, setupRequired: true, error: created.error },
          { status: 503 }
        );
      }
      if (created.duplicate) {
        continue;
      }
      if (created.error || !created.link) {
        return NextResponse.json(
          { success: false, error: created.error || "ไม่สามารถสร้างลิงก์ย่อได้" },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { success: true, link: created.link },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { success: false, error: "ไม่สามารถสุ่มชื่อย่อที่ไม่ซ้ำได้ กรุณาลองใหม่อีกครั้ง" },
      { status: 409 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Invalid request payload",
      },
      { status: 400 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const id = String(body?.id || "").trim();
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ไม่พบรหัสอ้างอิงลิงก์ย่อ (id)" },
        { status: 400 }
      );
    }

    const existingRes = await getShortLinkByIdFromSupabase(id);
    if (!existingRes.ready && !existingRes.error) {
      return NextResponse.json(
        { success: false, setupRequired: true, error: "ยังไม่ได้สร้างตาราง short_links" },
        { status: 503 }
      );
    }
    if (!existingRes.link) {
      return NextResponse.json(
        { success: false, error: "ไม่พบลิงก์ย่อที่ต้องการแก้ไข" },
        { status: 404 }
      );
    }

    const allowed = canManageShortLink(existingRes.link, {
      id: typeof body?.actorId === "string" ? body.actorId : undefined,
      name: typeof body?.actorName === "string" ? body.actorName : undefined,
      role: typeof body?.actorRole === "string" ? body.actorRole : undefined,
    });
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "เฉพาะผู้สร้างลิงก์หรือผู้ดูแลระบบ (Admin) เท่านั้นที่แก้ไขได้" },
        { status: 403 }
      );
    }

    const updates: {
      targetUrl?: string;
      title?: string;
      isActive?: boolean;
      expiresAt?: string | null;
    } = {};

    if (typeof body?.targetUrl === "string") {
      const urlCheck = validateAndNormalizeTargetUrl(body.targetUrl, [
        request.nextUrl.origin,
        DEFAULT_PUBLIC_SHORT_BASE_URL,
      ]);
      if (!urlCheck.valid) {
        return NextResponse.json(
          { success: false, error: urlCheck.error },
          { status: 400 }
        );
      }
      updates.targetUrl = urlCheck.normalized;
    }

    if (typeof body?.title === "string") {
      updates.title = body.title;
    }

    if (typeof body?.isActive === "boolean") {
      updates.isActive = body.isActive;
    }

    if (body?.expiresAt !== undefined) {
      if (body.expiresAt === null || body.expiresAt === "") {
        updates.expiresAt = null;
      } else {
        const expRaw = String(body.expiresAt).trim();
        const parsedExp = new Date(
          /^\d{4}-\d{2}-\d{2}$/.test(expRaw) ? `${expRaw}T23:59:59+07:00` : expRaw
        );
        if (Number.isNaN(parsedExp.getTime())) {
          return NextResponse.json(
            { success: false, error: "รูปแบบวันหมดอายุไม่ถูกต้อง" },
            { status: 400 }
          );
        }
        updates.expiresAt = parsedExp.toISOString();
      }
    }

    const updated = await updateShortLinkInSupabase(id, updates);
    if (updated.setupRequired) {
      return NextResponse.json(
        { success: false, setupRequired: true, error: updated.error },
        { status: 503 }
      );
    }
    if (updated.error || !updated.link) {
      return NextResponse.json(
        { success: false, error: updated.error || "ไม่สามารถบันทึกการแก้ไขได้" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, link: updated.link });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Invalid request payload",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const id = String(
      body?.id || request.nextUrl.searchParams.get("id") || ""
    ).trim();

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ไม่พบรหัสอ้างอิงลิงก์ย่อ (id)" },
        { status: 400 }
      );
    }

    const existingRes = await getShortLinkByIdFromSupabase(id);
    if (!existingRes.ready && !existingRes.error) {
      return NextResponse.json(
        { success: false, setupRequired: true, error: "ยังไม่ได้สร้างตาราง short_links" },
        { status: 503 }
      );
    }
    if (!existingRes.link) {
      return NextResponse.json(
        { success: false, error: "ไม่พบลิงก์ย่อที่ต้องการลบ" },
        { status: 404 }
      );
    }

    const allowed = canManageShortLink(existingRes.link, {
      id: typeof body?.actorId === "string" ? body.actorId : undefined,
      name: typeof body?.actorName === "string" ? body.actorName : undefined,
      role: typeof body?.actorRole === "string" ? body.actorRole : undefined,
    });
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "เฉพาะผู้สร้างลิงก์หรือผู้ดูแลระบบ (Admin) เท่านั้นที่ลบได้" },
        { status: 403 }
      );
    }

    const deleted = await deleteShortLinkInSupabase(id);
    if (!deleted.success) {
      return NextResponse.json(
        { success: false, error: deleted.error || "ไม่สามารถลบลิงก์ย่อได้" },
        { status: deleted.setupRequired ? 503 : 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Invalid request",
      },
      { status: 400 }
    );
  }
}

