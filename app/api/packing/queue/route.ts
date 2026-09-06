import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { checkPackingKey } from "@/lib/packing-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  order_no: string;
  doc_no: string | null;
  platform: string | null;
  receiver: string | null;
  address: string | null;
  district: string | null;
  province: string | null;
  postcode: string | null;
  stock_issued: boolean;
  item_count: number;
};

type Line = { order_no: string; product: string | null; size: string | null; qty: number; is_free: boolean };

/** คิวออเดอร์ที่รอแพค — ให้ Packing Cam ดึงไปแสดงที่โต๊ะแพค (read-only)
 *  เกณฑ์: ยังไม่ส่ง + ยังไม่แพค + (ตัดสต๊อกแล้ว หรือ เพิ่งสร้างภายใน 3 วัน)
 *  ที่ยังไม่ตัดสต๊อกก็ส่งไปด้วย เพราะเจ้าของอนุญาตให้แพค/ส่งก่อนตัดสต๊อกได้ — ฝั่งนั้นจะขึ้นเตือน ไม่บล็อก */
export async function GET(req: Request) {
  if (!checkPackingKey(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const orders = await q<Row>(
      `select o.order_no, o.doc_no, o.platform,
              coalesce(nullif(btrim(o.receiver),''), nullif(btrim(o.username),''),
                       nullif(btrim(o.shop_name),'')) as receiver,
              o.address, o.district, o.province, o.postcode,
              (o.stock_issued_at is not null) as stock_issued,
              (select count(*)::int from order_items i where i.order_no = o.order_no) as item_count
         from orders o
        where o.deleted_at is null
          and o.shipped_at is null
          and o.packed_at is null
          and (o.stock_issued_at is not null or o.doc_date >= current_date - 3)
        order by (o.stock_issued_at is null), o.doc_date desc nulls last, o.order_no
        limit 200`,
    );
    if (orders.length === 0) return NextResponse.json({ orders: [] });

    const codes = orders.map((o) => o.order_no);
    const lines = await q<Line>(
      `select order_no, product, size, qty::float8 as qty, is_free
         from order_items where order_no = any($1) order by order_no, line_no`,
      [codes],
    );

    const byOrder = new Map<string, Line[]>();
    for (const line of lines) {
      const list = byOrder.get(line.order_no) ?? [];
      list.push(line);
      byOrder.set(line.order_no, list);
    }

    return NextResponse.json({
      orders: orders.map((o) => ({
        orderNo: o.order_no,
        docNo: o.doc_no,
        platform: o.platform,
        receiver: o.receiver,
        address: o.address,
        district: o.district,
        province: o.province,
        postcode: o.postcode,
        itemCount: o.item_count,
        stockIssued: o.stock_issued,
        items: (byOrder.get(o.order_no) ?? []).map((l) => ({
          product: l.product ?? "",
          size: l.size ?? "",
          qty: l.qty,
          isFree: l.is_free,
        })),
      })),
    });
  } catch (e: any) {
    console.error("[packing/queue]", e?.message);
    return NextResponse.json({ error: "query failed" }, { status: 500 });
  }
}
