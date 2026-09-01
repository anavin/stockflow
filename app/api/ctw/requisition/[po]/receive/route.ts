import { NextResponse } from "next/server";
import { q } from "@/lib/db";
import { revalidatePath, revalidateTag } from "next/cache";
import { ctwAuth } from "@/lib/ctw";

export const runtime = "nodejs";

/** CTW กดรับ → ปิดสถานะใบเบิกเป็น "รับแล้ว" (ต้องคลังส่งก่อน = shipped_at)
 *  body: { received_by? } · idempotent (รับซ้ำ = already) */
export async function POST(req: Request, ctx: { params: Promise<{ po: string }> }) {
  if (!process.env.CTW_API_KEY) return NextResponse.json({ ok: false, error: "ยังไม่ได้ตั้ง CTW_API_KEY" }, { status: 503 });
  if (!ctwAuth(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const po = decodeURIComponent((await ctx.params).po || "").trim();
  let body: any = {}; try { body = await req.json(); } catch { /* body ว่างได้ */ }
  const receivedBy = String(body?.received_by || "").trim() || null;

  const [o] = await q<{ shipped_at: string | null; ctw_received_at: string | null }>(
    `select shipped_at, ctw_received_at from orders where order_no = $1 and platform = 'CTW' and deleted_at is null`, [po]);
  if (!o) return NextResponse.json({ ok: false, error: `ไม่พบใบเบิก CTW: ${po}` }, { status: 404 });
  if (!o.shipped_at) return NextResponse.json({ ok: false, error: "คลังยังไม่ได้จัดส่ง (ตัดสต๊อก+จัดส่ง) — กดรับไม่ได้" }, { status: 409 });
  if (o.ctw_received_at) return NextResponse.json({ ok: true, already: true, received_at: o.ctw_received_at });

  const [r] = await q<{ at: string }>(
    `update orders set ctw_received_at = now(), ctw_received_by = $2, updated_at = now()
      where order_no = $1 returning to_char(ctw_received_at, 'YYYY-MM-DD"T"HH24:MI:SS') as at`, [po, receivedBy]);
  revalidatePath("/ctw"); revalidateTag("dashboard");
  return NextResponse.json({ ok: true, order_no: po, received_at: r?.at, received_by: receivedBy });
}
