import { NextResponse } from "next/server";
import { q, tx } from "@/lib/db";
import { revalidatePath, revalidateTag } from "next/cache";
import { monthLabel } from "@/lib/docno";
import { ctwAuth, bangkokToday } from "@/lib/ctw";

export const runtime = "nodejs";

/**
 * รับใบเบิกจากระบบ CTW → สร้างเป็นใบเบิก platform "CTW" ในคลังกลาง
 * body: { po_no, branch?, items: [{ barcode, qty }] }
 * ตอบ: { ok, order_no, saved, unmatched:[barcode ที่ไม่รู้จัก] }
 * idempotent: ยิงซ้ำ po_no เดิม = อัปเดตรายการใหม่
 */
export async function POST(req: Request) {
  if (!process.env.CTW_API_KEY) return NextResponse.json({ ok: false, error: "ยังไม่ได้ตั้ง CTW_API_KEY" }, { status: 503 });
  if (!ctwAuth(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "body ต้องเป็น JSON" }, { status: 400 }); }
  const po = String(body?.po_no || "").trim();
  const branch = String(body?.branch || "").trim() || null;
  const items = Array.isArray(body?.items) ? body.items : [];
  if (!po) return NextResponse.json({ ok: false, error: "ต้องมี po_no" }, { status: 400 });
  if (!items.length) return NextResponse.json({ ok: false, error: "ต้องมี items อย่างน้อย 1 รายการ" }, { status: 400 });

  // barcode → กลิ่น(map ชื่อ products)+ขนาด
  const barcodes = [...new Set(items.map((i: any) => String(i.barcode || "").trim()).filter(Boolean))];
  const rows = await q<{ barcode: string; product: string; size: string; sku: string | null }>(
    `select btrim(pb.barcode) as barcode, coalesce(p.name, pb.scent) as product, pb.size as size, pb.sku as sku
       from product_barcodes pb
       left join products p on regexp_replace(lower(btrim(p.name)),'[^a-z0-9ก-๙]','','g')
                             = regexp_replace(lower(btrim(pb.scent)),'[^a-z0-9ก-๙]','','g')
      where btrim(pb.barcode) = any($1)`, [barcodes]);
  const map = new Map(rows.map((r) => [r.barcode, r]));

  const resolved: { product: string; size: string; qty: number; sku: string | null }[] = [];
  const unmatched: string[] = [];
  for (const it of items) {
    const bc = String(it.barcode || "").trim();
    const qty = Math.max(0, Number(it.qty) || 0);
    const b = map.get(bc);
    if (!b) { unmatched.push(bc); continue; }
    resolved.push({ product: b.product, size: b.size, qty, sku: b.sku || null });   // เติม SKU (รหัสสินค้า) อัตโนมัติจาก barcode
  }
  if (!resolved.length) return NextResponse.json({ ok: false, error: "ไม่มี barcode ที่ตรงกับระบบเลย", unmatched }, { status: 422 });

  const today = bangkokToday();
  const ml = monthLabel(new Date(today + "T00:00:00"));
  try {
    await tx(async (run) => {
      // กันแก้รายการหลังตัดสต๊อกแล้ว (ยิงซ้ำหลังตัด = ไม่ทับ items)
      const [ex] = await run<{ stock_issued_at: string | null }>(`select stock_issued_at from orders where order_no = $1`, [po]);
      if (ex?.stock_issued_at) throw new Error("ใบเบิกนี้ตัดสต๊อกไปแล้ว แก้รายการไม่ได้");
      await run(
        `insert into orders (order_no, platform, doc_no, doc_date, month_label, channel, branch, created_at)
         values ($1,'CTW',$1,$2,$3,'CTW',$4, now())
         on conflict (order_no) do update set branch = excluded.branch, doc_date = excluded.doc_date,
           month_label = excluded.month_label, updated_at = now(), deleted_at = null, deleted_by = null`,
        [po, today, ml, branch]);
      await run(`delete from order_items where order_no = $1`, [po]);
      let line = 0;
      for (const r of resolved) {
        line += 1;
        await run(
          `insert into order_items (order_no, line_no, product, size, is_free, qty, unit, product_label, sku)
           values ($1,$2,$3,$4,false,$5,'ขวด',$6,$7)`,
          [po, line, r.product, r.size, r.qty, `${r.product} ${r.size}`, r.sku]);
      }
    });
  } catch (e: any) { return NextResponse.json({ ok: false, error: e?.message || "บันทึกไม่สำเร็จ" }, { status: 500 }); }

  revalidatePath("/ctw"); revalidateTag("dashboard");
  return NextResponse.json({ ok: true, order_no: po, saved: resolved.length, unmatched });
}
