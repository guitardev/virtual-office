import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  buildOrderSearchNormalized,
  normalizeThaiNumerals,
  OfficialOrderCategory,
  OfficialOrderItem,
  OfficialOrderStatus,
  OfficialOrderYearCount,
  parseOrderNumberParts,
} from "@/lib/official-orders";

export const dynamic = "force-dynamic";

function isMissingTableError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return (
    err.code === "42P01" ||
    err.code === "PGRST205" ||
    /relation .*official_orders.* does not exist|Could not find the table/i.test(
      err.message || ""
    )
  );
}

function mapRowToOrderItem(row: Record<string, unknown>): OfficialOrderItem {
  return {
    id: String(row.id),
    docCategory: (row.doc_category as OfficialOrderCategory) || "order",
    docNumberRaw: String(row.doc_number_raw || ""),
    orderSeq:
      typeof row.order_seq === "number"
        ? row.order_seq
        : row.order_seq !== null && row.order_seq !== undefined
        ? Number(row.order_seq)
        : null,
    orderYearBe: Number(row.order_year_be || new Date().getFullYear() + 543),
    issuedDate: String(row.issued_date || "").slice(0, 10),
    title: String(row.title || ""),
    issuerOrg: String(
      row.issuer_org || "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"
    ),
    division: String(row.division || ""),
    summary: String(row.summary || ""),
    keywords: Array.isArray(row.keywords) ? row.keywords.map(String) : [],
    status: (row.status as OfficialOrderStatus) || "active",
    supersedesOrderId: row.supersedes_order_id ? String(row.supersedes_order_id) : null,
    nasPath: row.nas_path ? String(row.nas_path) : null,
    fileUrl: row.file_url ? String(row.file_url) : null,
    fileName: row.file_name ? String(row.file_name) : null,
    fileSize: Number(row.file_size || 0),
    createdBy: row.created_by ? String(row.created_by) : null,
    createdByName: row.created_by_name ? String(row.created_by_name) : null,
    createdAt: String(row.created_at || ""),
    updatedAt: String(row.updated_at || ""),
  };
}

export async function GET(req: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase" },
        { status: 503 }
      );
    }
    const sp = req.nextUrl.searchParams;
    const rawQ = (sp.get("q") || "").trim();
    const yearParam = sp.get("year") || "all";
    const categoryParam = sp.get("category") || "all";
    const statusParam = sp.get("status") || "all";
    const divisionParam = (sp.get("division") || "all").trim();
    const limitParam = Math.min(Math.max(Number(sp.get("limit") || 100), 1), 300);

    let query = supabase
      .from("official_orders")
      .select("*")
      .eq("is_deleted", false)
      .order("order_year_be", { ascending: false })
      .order("order_seq", { ascending: false, nullsFirst: false })
      .order("issued_date", { ascending: false })
      .limit(limitParam);

    if (yearParam !== "all" && /^\d{4}$/.test(yearParam)) {
      query = query.eq("order_year_be", Number(yearParam));
    }

    if (
      categoryParam === "order" ||
      categoryParam === "announcement" ||
      categoryParam === "regulation"
    ) {
      query = query.eq("doc_category", categoryParam);
    }

    if (
      statusParam === "active" ||
      statusParam === "amended" ||
      statusParam === "revoked"
    ) {
      query = query.eq("status", statusParam);
    }

    if (divisionParam !== "all" && divisionParam !== "") {
      query = query.eq("division", divisionParam);
    }

    if (rawQ) {
      const normalizedTokens = normalizeThaiNumerals(rawQ)
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 5);
      for (const token of normalizedTokens) {
        query = query.ilike("search_normalized", `%${token}%`);
      }
    }

    const [{ data, error }, rpcRes] = await Promise.all([
      query,
      supabase.rpc("get_official_orders_year_counts"),
    ]);

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({
          success: true,
          needsMigration: true,
          items: [],
          yearCounts: [],
          total: 0,
        });
      }
      throw error;
    }

    const items = (data || []).map((row) =>
      mapRowToOrderItem(row as Record<string, unknown>)
    );

    let yearCounts: OfficialOrderYearCount[] = [];
    if (!rpcRes.error && Array.isArray(rpcRes.data)) {
      yearCounts = rpcRes.data.map((r: Record<string, unknown>) => ({
        orderYearBe: Number(r.order_year_be),
        totalCount: Number(r.total_count || 0),
        orderCount: Number(r.order_count || 0),
        announcementCount: Number(r.announcement_count || 0),
        regulationCount: Number(r.regulation_count || 0),
      }));
    }

    return NextResponse.json({
      success: true,
      needsMigration: false,
      items,
      yearCounts,
      total: items.length,
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json(
      { success: false, error: e.message || "ไม่สามารถโหลดข้อมูลคำสั่ง/ประกาศได้" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase" },
        { status: 503 }
      );
    }
    const body = await req.json();
    const action = String(body.action || "");

    if (action === "create") {
      const title = String(body.title || "").trim();
      const docNumberInput = String(body.docNumberRaw || "").trim();
      const issuedDate = String(body.issuedDate || "").slice(0, 10);
      const docCategory: OfficialOrderCategory =
        body.docCategory === "announcement" || body.docCategory === "regulation"
          ? body.docCategory
          : "order";
      const status: OfficialOrderStatus =
        body.status === "amended" || body.status === "revoked"
          ? body.status
          : "active";

      if (!title || !docNumberInput || !/^\d{4}-\d{2}-\d{2}$/.test(issuedDate)) {
        return NextResponse.json(
          {
            success: false,
            error: "กรุณาระบุชื่อเรื่อง เลขที่คำสั่ง/ประกาศ และวันที่ลงนามให้ครบถ้วน",
          },
          { status: 400 }
        );
      }

      const parsed = parseOrderNumberParts(docNumberInput, issuedDate);
      const orderYearBe =
        typeof body.orderYearBe === "number" &&
        body.orderYearBe >= 2500 &&
        body.orderYearBe <= 2700
          ? body.orderYearBe
          : parsed.orderYearBe;
      const orderSeq =
        typeof body.orderSeq === "number" ? body.orderSeq : parsed.orderSeq;
      const issuerOrg =
        String(body.issuerOrg || "").trim() ||
        "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร";
      const division = String(body.division || "").trim();
      const summary = String(body.summary || "").trim();
      const keywords: string[] = Array.isArray(body.keywords)
        ? body.keywords.map((k: unknown) => String(k).trim()).filter(Boolean)
        : [];

      const searchNormalized = buildOrderSearchNormalized({
        docNumberRaw: parsed.docNumberRaw,
        orderSeq,
        orderYearBe,
        title,
        issuerOrg,
        division,
        summary,
        keywords,
      });

      const { data, error } = await supabase
        .from("official_orders")
        .insert({
          doc_category: docCategory,
          doc_number_raw: parsed.docNumberRaw,
          order_seq: orderSeq,
          order_year_be: orderYearBe,
          issued_date: issuedDate,
          title,
          issuer_org: issuerOrg,
          division,
          summary,
          keywords,
          status,
          supersedes_order_id: body.supersedesOrderId || null,
          nas_path: body.nasPath || null,
          file_url: body.fileUrl || null,
          file_name: body.fileName || null,
          file_size: Number(body.fileSize || 0),
          search_normalized: searchNormalized,
          created_by: body.actorId || null,
          created_by_name: body.actorName || null,
        })
        .select("*")
        .single();

      if (error) {
        if (error.code === "23505") {
          return NextResponse.json(
            {
              success: false,
              error: `เลขที่ ${parsed.docNumberRaw} ปี พ.ศ. ${orderYearBe} มีอยู่ในระบบแล้ว (ห้ามบันทึกเลขซ้ำ)`,
            },
            { status: 409 }
          );
        }
        if (isMissingTableError(error)) {
          return NextResponse.json(
            {
              success: false,
              error:
                "ยังไม่ได้สร้างตาราง official_orders บน Supabase (กรุณารันไฟล์ migration 20261113_create_official_orders.sql)",
            },
            { status: 503 }
          );
        }
        throw error;
      }

      return NextResponse.json({
        success: true,
        item: mapRowToOrderItem(data as Record<string, unknown>),
      });
    }

    if (action === "update") {
      const id = String(body.id || "").trim();
      if (!id) {
        return NextResponse.json(
          { success: false, error: "ไม่พบรหัสเอกสารที่ต้องการแก้ไข" },
          { status: 400 }
        );
      }

      const title = String(body.title || "").trim();
      const docNumberInput = String(body.docNumberRaw || "").trim();
      const issuedDate = String(body.issuedDate || "").slice(0, 10);
      if (!title || !docNumberInput || !/^\d{4}-\d{2}-\d{2}$/.test(issuedDate)) {
        return NextResponse.json(
          {
            success: false,
            error: "กรุณาระบุชื่อเรื่อง เลขที่ และวันที่ลงนามให้ครบถ้วน",
          },
          { status: 400 }
        );
      }

      const docCategory: OfficialOrderCategory =
        body.docCategory === "announcement" || body.docCategory === "regulation"
          ? body.docCategory
          : "order";
      const status: OfficialOrderStatus =
        body.status === "amended" || body.status === "revoked"
          ? body.status
          : "active";

      const parsed = parseOrderNumberParts(docNumberInput, issuedDate);
      const orderYearBe =
        typeof body.orderYearBe === "number" &&
        body.orderYearBe >= 2500 &&
        body.orderYearBe <= 2700
          ? body.orderYearBe
          : parsed.orderYearBe;
      const orderSeq =
        typeof body.orderSeq === "number" ? body.orderSeq : parsed.orderSeq;
      const issuerOrg =
        String(body.issuerOrg || "").trim() ||
        "สำนักงานพัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร";
      const division = String(body.division || "").trim();
      const summary = String(body.summary || "").trim();
      const keywords: string[] = Array.isArray(body.keywords)
        ? body.keywords.map((k: unknown) => String(k).trim()).filter(Boolean)
        : [];

      const searchNormalized = buildOrderSearchNormalized({
        docNumberRaw: parsed.docNumberRaw,
        orderSeq,
        orderYearBe,
        title,
        issuerOrg,
        division,
        summary,
        keywords,
      });

      const updatePayload: Record<string, unknown> = {
        doc_category: docCategory,
        doc_number_raw: parsed.docNumberRaw,
        order_seq: orderSeq,
        order_year_be: orderYearBe,
        issued_date: issuedDate,
        title,
        issuer_org: issuerOrg,
        division,
        summary,
        keywords,
        status,
        search_normalized: searchNormalized,
        updated_at: new Date().toISOString(),
      };

      if (body.nasPath !== undefined) updatePayload.nas_path = body.nasPath || null;
      if (body.fileUrl !== undefined) updatePayload.file_url = body.fileUrl || null;
      if (body.fileName !== undefined) updatePayload.file_name = body.fileName || null;
      if (body.fileSize !== undefined) updatePayload.file_size = Number(body.fileSize || 0);

      const { data, error } = await supabase
        .from("official_orders")
        .update(updatePayload)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        if (error.code === "23505") {
          return NextResponse.json(
            {
              success: false,
              error: `เลขที่ ${parsed.docNumberRaw} ปี พ.ศ. ${orderYearBe} มีอยู่ในระบบแล้ว`,
            },
            { status: 409 }
          );
        }
        throw error;
      }

      return NextResponse.json({
        success: true,
        item: mapRowToOrderItem(data as Record<string, unknown>),
      });
    }

    if (action === "delete") {
      const id = String(body.id || "").trim();
      if (!id) {
        return NextResponse.json(
          { success: false, error: "ไม่พบรหัสเอกสารที่ต้องการลบ" },
          { status: 400 }
        );
      }

      const { error } = await supabase
        .from("official_orders")
        .update({
          is_deleted: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: "ไม่รู้จัก action ที่ระบุ" },
      { status: 400 }
    );
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json(
      { success: false, error: e.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล" },
      { status: 500 }
    );
  }
}
