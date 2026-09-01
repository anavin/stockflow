import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { ctwAuth } from "@/lib/ctw";

export const runtime = "nodejs";

/** สถานะใบเบิก CTW + รายการ SKU รายชิ้นที่คลังตัด/ส่งจริง (ให้ CTW ดึงไปกดรับ) */
export async function GET(req: Request, ctx: { params: Promise<{ po: string }> }) {
  if (!process.env.CTW_API_KEY) return NextResponse.json({ ok: false, error: "ยังไม่ได้ตั้ง CTW_API_KEY" }, { status: 503 });
  if (!ctwAuth(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const po = decodeURIComponent((await ctx.params).po || "").trim();

  const [o] = await q<{ order_no: string; branch: string | null; doc_date: string | null; stock_issued_at: string | null; shipped_at: string | null; ctw_received_at: string | null; ctw_received_by: string | null }>(
    `select order_no, branch, to_char(doc_date,'YYYY-MM-DD') as doc_date,
            stock_issued_at, shipped_at, ctw_received_at, ctw_received_by
       from orders where order_no = $1 and platform = 'CTW' and deleted_at is null`, [po]);
  if (!o) return NextResponse.json({ ok: false, error: `ไม่พบใบเบิก CTW: ${po}` }, { status: 404 });

  const items = await q<{ product: string; size: string; qty: number }>(
    `select product, size, qty::float8 as qty from order_items where order_no = $1 order by line_no`, [po]);
  const skus = await q<{ sku: string; product: string; size: string }>(
    `select sku, product, size from stock_unit where order_no = $1 order by product, size, sku`, [po]);

  const status = o.ctw_received_at ? "received" : o.shipped_at ? "dispatched" : o.stock_issued_at ? "issued" : "created";
  return NextResponse.json({
    ok: true, order_no: o.order_no, branch: o.branch, doc_date: o.doc_date, status,
    issued_at: o.stock_issued_at, dispatched_at: o.shipped_at, received_at: o.ctw_received_at, received_by: o.ctw_received_by,
    items, skus,
  });
}
