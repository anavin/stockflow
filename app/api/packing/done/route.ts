import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { checkPackingKey } from "@/lib/packing-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Packing Cam แจ้งกลับว่าออเดอร์นี้แพคและอัดคลิปเรียบร้อย
 *  packed_at ใช้ค่าครั้งแรกเสมอ (coalesce) แต่ลิงก์คลิปอัปเดตเป็นคลิปล่าสุด (กรณีถ่ายซ้ำ) */
export async function POST(req: Request) {
  if (!checkPackingKey(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { orderNo?: string; clipUrl?: string; packedAt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const orderNo = (body.orderNo ?? "").trim();
  const clipUrl = (body.clipUrl ?? "").trim();
  if (!orderNo || !clipUrl) return NextResponse.json({ error: "ต้องมี orderNo และ clipUrl" }, { status: 400 });
  if (!/^https:\/\//.test(clipUrl)) return NextResponse.json({ error: "clipUrl ต้องเป็น https" }, { status: 400 });

  const packedAt = body.packedAt && !Number.isNaN(Date.parse(body.packedAt)) ? body.packedAt : new Date().toISOString();

  try {
    const rows = await q<{ order_no: string }>(
      `update orders
          set packed_at = coalesce(packed_at, $2::timestamptz),
              packing_clip_url = $3,
              updated_at = now()
        where upper(btrim(order_no)) = upper(btrim($1)) and deleted_at is null
      returning order_no`,
      [orderNo, packedAt, clipUrl],
    );
    if (rows.length === 0) return NextResponse.json({ error: `ไม่พบออเดอร์ ${orderNo}` }, { status: 404 });
    return NextResponse.json({ ok: true, orderNo: rows[0].order_no });
  } catch (e: any) {
    console.error("[packing/done]", e?.message);
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }
}
