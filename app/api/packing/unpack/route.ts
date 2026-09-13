import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { checkPackingKey } from "@/lib/packing-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Packing Cam แจ้งว่าคลิปของออเดอร์นี้ถูกลบลงถังขยะหมดแล้ว (ไม่มีคลิปเหลือ)
 *  ล้าง packed_at + ลิงก์คลิป → ออเดอร์กลับเข้าคิวรอแพคให้บันทึกใหม่ได้
 *  ถ้าภายหลังกู้คลิปคืน Packing Cam จะเรียก /api/packing/done ซ้ำเอง */
export async function POST(req: Request) {
  if (!checkPackingKey(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { orderNo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const orderNo = (body.orderNo ?? "").trim();
  if (!orderNo) return NextResponse.json({ error: "ต้องมี orderNo" }, { status: 400 });

  try {
    const rows = await q<{ order_no: string }>(
      `update orders
          set packed_at = null,
              packing_clip_url = null,
              updated_at = now()
        where upper(btrim(order_no)) = upper(btrim($1)) and deleted_at is null
      returning order_no`,
      [orderNo],
    );
    if (rows.length === 0) return NextResponse.json({ error: `ไม่พบออเดอร์ ${orderNo}` }, { status: 404 });
    return NextResponse.json({ ok: true, orderNo: rows[0].order_no });
  } catch (e: any) {
    console.error("[packing/unpack]", e?.message);
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }
}
