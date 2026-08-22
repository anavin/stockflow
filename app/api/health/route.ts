import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ตรวจสุขภาพ schema — กันเคส "prod ยังไม่รัน SQL → หน้าพัง 500 เงียบ ๆ" (build/tsc ไม่แตะ DB)
 * เทียบคอลัมน์/ตารางที่โค้ดชุดนี้ต้องใช้ กับ DB จริง แล้วคืนรายการที่ขาด
 * เปิดดูได้: GET /api/health  (ไม่ลับ — คืนแค่ชื่อคอลัมน์ที่ขาด ไม่มีข้อมูลลูกค้า)
 */
const REQUIRED: Record<string, string[]> = {
  orders: ["order_no", "platform", "doc_no", "stock_issued_at", "stock_issued_by", "shipped_at", "shipped_by", "returned_at", "return_status", "deleted_at", "subdistrict", "month_label", "order_date"],
  order_items: ["order_no", "line_no", "product", "size", "is_free", "qty", "sku", "spec"],
  stock: ["product", "size", "qty"],
  stock_unit: ["sku", "product", "size", "grade", "spec", "status", "order_no", "issued_at"],
  order_returns: ["order_no", "line_no", "qty", "disposition", "voided_at"],
  damaged: ["product", "size", "qty"],
  material_item: ["ref_key", "category", "qty"],
  material_move: ["item_id", "qty_change"],
  scent_aliases: ["alias_key", "product"],
  fda_registrations: ["product", "fda_status", "expiry_date"],
  activity_log: ["action", "detail", "created_at"],
  platforms: ["code", "name", "prefix"],
};

export async function GET() {
  try {
    const rows = await q<{ table_name: string; column_name: string }>(
      `select table_name, column_name from information_schema.columns
       where table_schema = 'public' and table_name = any($1::text[])`,
      [Object.keys(REQUIRED)],
    );
    const have: Record<string, Set<string>> = {};
    for (const r of rows) (have[r.table_name] ??= new Set()).add(r.column_name);

    const missingTables: string[] = [];
    const missingColumns: string[] = [];
    for (const [table, cols] of Object.entries(REQUIRED)) {
      if (!have[table]) { missingTables.push(table); continue; }
      for (const c of cols) if (!have[table].has(c)) missingColumns.push(`${table}.${c}`);
    }
    const ok = missingTables.length === 0 && missingColumns.length === 0;
    return NextResponse.json(
      { ok, missingTables, missingColumns, ...(ok ? {} : { hint: "รัน SQL ที่ค้างบน Supabase (migrations / RUN_*.sql) ให้ครบ" }) },
      { status: ok ? 200 : 500 },
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "ตรวจไม่สำเร็จ (เชื่อมต่อ DB ไม่ได้?)" }, { status: 500 });
  }
}
