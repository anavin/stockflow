"use server";
import { q } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { revalidatePath, revalidateTag } from "next/cache";
import { logActivity } from "@/lib/activity";

export type CtwPushResult = { ok: boolean; error?: string; skus?: number };

/** ส่งใบเบิก CTW ที่ตัดสต๊อกแล้ว → ระบบ CTW (push ทางเดียว)
 *  POST payload {po_no, branch, doc_date, items, skus} ไป CTW_WEBHOOK_URL (Bearer CTW_API_KEY)
 *  สำเร็จ (2xx) → ปักธง ctw_received_at = "ส่ง/CTW รับข้อมูลแล้ว" */
export async function pushToCtw(orderNo: string): Promise<CtwPushResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };
  if (!can.viewStock(user.role)) return { ok: false, error: "ไม่มีสิทธิ์" };
  const on = (orderNo || "").trim();
  const url = process.env.CTW_WEBHOOK_URL;
  const key = process.env.CTW_API_KEY;
  if (!url || !key) return { ok: false, error: "ยังไม่ได้ตั้ง CTW_WEBHOOK_URL / CTW_API_KEY (env)" };

  const [o] = await q<{ branch: string | null; doc_date: string | null; stock_issued_at: string | null }>(
    `select branch, to_char(doc_date,'YYYY-MM-DD') as doc_date, stock_issued_at
       from orders where order_no = $1 and platform = 'CTW' and deleted_at is null`, [on]);
  if (!o) return { ok: false, error: `ไม่พบใบเบิก CTW: ${on}` };
  if (!o.stock_issued_at) return { ok: false, error: "ต้องตัดสต๊อกก่อนส่งไป CTW" };

  const items = await q(`select product, size, qty::float8 as qty, sku from order_items where order_no = $1 order by line_no`, [on]);
  const skus = await q(`select sku, product, size, barcode from stock_unit where order_no = $1 order by product, size, sku`, [on]);
  const payload = { po_no: on, branch: o.branch, doc_date: o.doc_date, items, skus };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(payload),
    });
  } catch (e: any) { return { ok: false, error: `ต่อระบบ CTW ไม่ได้: ${e?.message || "network error"}` }; }
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return { ok: false, error: `CTW ตอบกลับ ${res.status}${t ? `: ${t.slice(0, 200)}` : ""}` };
  }

  await q(`update orders set ctw_received_at = now(), ctw_received_by = 'push', updated_at = now() where order_no = $1`, [on]);
  await logActivity("ctw.push", `${on} → CTW (${(skus as any[]).length} SKU)`);
  revalidatePath(`/ctw/${encodeURIComponent(on)}`); revalidatePath("/ctw"); revalidateTag("dashboard");
  return { ok: true, skus: (skus as any[]).length };
}
