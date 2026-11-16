import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  DataHubDocItem,
  DataHubDocType,
  extractFileExtension,
} from "@/lib/datahub-docs";

export const dynamic = "force-dynamic";

function isMissingTableError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return (
    err.code === "42P01" ||
    err.code === "PGRST205" ||
    /relation .*datahub_documents.* does not exist|Could not find the table/i.test(
      err.message || ""
    )
  );
}

function mapRow(row: Record<string, unknown>): DataHubDocItem {
  return {
    id: String(row.id),
    docType: (row.doc_type as DataHubDocType) || "form",
    title: String(row.title || ""),
    division: String(row.division || ""),
    description: String(row.description || ""),
    keywords: Array.isArray(row.keywords) ? row.keywords.map(String) : [],
    nasPath: row.nas_path ? String(row.nas_path) : null,
    fileUrl: row.file_url ? String(row.file_url) : null,
    fileName: row.file_name ? String(row.file_name) : null,
    fileSize: Number(row.file_size || 0),
    fileExt: String(row.file_ext || extractFileExtension(row.file_name as string | null, row.file_url as string | null)),
    updatedDate: String(row.updated_date || row.created_at || "").slice(0, 10),
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
    const docType = sp.get("docType") || "all";
    const division = sp.get("division") || "all";
    const q = (sp.get("q") || "").trim().toLowerCase();

    let query = supabase
      .from("datahub_documents")
      .select("*")
      .order("updated_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (docType !== "all") {
      query = query.eq("doc_type", docType);
    }
    if (division !== "all") {
      query = query.eq("division", division);
    }

    const { data, error } = await query;

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({
          success: true,
          items: [],
          needsMigration: true,
        });
      }
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    let items = (data || []).map((r) => mapRow(r as Record<string, unknown>));
    if (q) {
      items = items.filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          it.description.toLowerCase().includes(q) ||
          it.division.toLowerCase().includes(q) ||
          (it.fileName || "").toLowerCase().includes(q) ||
          it.keywords.some((k) => k.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({
      success: true,
      items,
      needsMigration: false,
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json(
      { success: false, error: e.message || "Internal Server Error" },
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
    const title = String(body.title || "").trim();
    if (!title) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุชื่อเอกสาร / แบบฟอร์ม / คู่มือ" },
        { status: 400 }
      );
    }

    const docType = (body.docType as DataHubDocType) || "form";
    const fileName = body.fileName ? String(body.fileName) : null;
    const fileUrl = body.fileUrl ? String(body.fileUrl).trim() : null;
    const nasPath = body.nasPath ? String(body.nasPath).trim() : null;
    const fileSize = Number(body.fileSize || 0);
    const fileExt =
      String(body.fileExt || "").trim() ||
      extractFileExtension(fileName, fileUrl);
    const updatedDate =
      String(body.updatedDate || "").slice(0, 10) ||
      new Date().toISOString().slice(0, 10);

    const payload = {
      doc_type: docType,
      title,
      division: String(body.division || "").trim(),
      description: String(body.description || "").trim(),
      keywords: Array.isArray(body.keywords) ? body.keywords.map(String) : [],
      nas_path: nasPath,
      file_url: fileUrl,
      file_name: fileName,
      file_size: fileSize,
      file_ext: fileExt,
      updated_date: updatedDate,
      created_by: body.createdBy ? String(body.createdBy) : null,
      created_by_name: body.createdByName ? String(body.createdByName) : null,
    };

    const { data, error } = await supabase
      .from("datahub_documents")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          {
            success: false,
            needsMigration: true,
            error: "ยังไม่ได้สร้างตาราง datahub_documents ใน Supabase",
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      item: mapRow(data as Record<string, unknown>),
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json(
      { success: false, error: e.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase" },
        { status: 503 }
      );
    }

    const body = await req.json();
    const id = String(body.id || "").trim();
    if (!id) {
      return NextResponse.json(
        { success: false, error: "ไม่พบรหัสเอกสาร (id)" },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.docType !== undefined) updates.doc_type = body.docType;
    if (body.title !== undefined) updates.title = String(body.title).trim();
    if (body.division !== undefined) updates.division = String(body.division).trim();
    if (body.description !== undefined)
      updates.description = String(body.description).trim();
    if (body.keywords !== undefined) updates.keywords = body.keywords;
    if (body.nasPath !== undefined) updates.nas_path = body.nasPath;
    if (body.fileUrl !== undefined) updates.file_url = body.fileUrl;
    if (body.fileName !== undefined) updates.file_name = body.fileName;
    if (body.fileSize !== undefined) updates.file_size = Number(body.fileSize || 0);
    if (body.fileExt !== undefined) updates.file_ext = String(body.fileExt);
    if (body.updatedDate !== undefined)
      updates.updated_date = String(body.updatedDate).slice(0, 10);

    const { data, error } = await supabase
      .from("datahub_documents")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      item: mapRow(data as Record<string, unknown>),
    });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json(
      { success: false, error: e.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase" },
        { status: 503 }
      );
    }

    const id = req.nextUrl.searchParams.get("id") || "";
    if (!id) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุ id ของเอกสารที่ต้องการลบ" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("datahub_documents")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const e = err as { message?: string };
    return NextResponse.json(
      { success: false, error: e.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
