import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { q } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "slips";

/** ดูสลิปของใบเบิก → สร้าง signed URL (อายุสั้น) แล้ว redirect ไป (bucket เป็น private)
 *  สิทธิ์: ผู้สร้างใบเบิก (createOrders) หรือฝ่ายสต๊อก (viewStock) */
export async function GET(_req: Request, { params }: { params: Promise<{ orderNo: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(can.createOrders(user.role) || can.viewStock(user.role))) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const on = decodeURIComponent((await params).orderNo || "").trim();
  const [o] = await q<{ slip_path: string | null }>(`select slip_path from orders where order_no = $1 limit 1`, [on]).catch(() => [] as { slip_path: string | null }[]);
  if (!o?.slip_path) return NextResponse.json({ error: "ไม่มีสลิป" }, { status: 404 });

  const base = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return NextResponse.json({ error: "storage not configured" }, { status: 500 });

  let res: Response;
  try {
    res = await fetch(`${base}/storage/v1/object/sign/${BUCKET}/${encodeURI(o.slip_path)}`, {
      method: "POST",
      // apikey + Authorization → รองรับทั้ง service_role (legacy) และ secret key ใหม่ (sb_secret_...)
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 120 }),   // ลิงก์ใช้ได้ 2 นาที
    });
  } catch (e: any) { return NextResponse.json({ error: `sign failed: ${e?.message || "network"}` }, { status: 502 }); }
  if (!res.ok) return NextResponse.json({ error: `sign failed (${res.status})` }, { status: 502 });

  const j = (await res.json()) as { signedURL?: string };
  if (!j.signedURL) return NextResponse.json({ error: "no signed url" }, { status: 502 });
  // signedURL = "/object/sign/slips/....?token=..." → เติม prefix /storage/v1
  return NextResponse.redirect(`${base}/storage/v1${j.signedURL}`);
}
