"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { q, tx } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { logActivity } from "@/lib/activity";
import { buildProductLabel, type OrderWithItems } from "@/lib/types";
import { formatDocNo, monthLabel, ymdKey } from "@/lib/docno";
import { isAllowedFreeSize, FREE_ALLOWED_SIZES, enabledPlatforms, platformBase } from "@/lib/config";

/** revalidate หน้ารายการ+ถังขยะใบเบิกของทุกแพลตฟอร์ม (route เป็น /[platform] — hardcode /shopee ครอบไม่ครบ) */
function revalidateOrderLists() {
  for (const p of enabledPlatforms()) {
    revalidatePath(platformBase(p.code));
    revalidatePath(`${platformBase(p.code)}/trash`);
  }
}

const itemSchema = z.object({
  product: z.string().trim().min(1, "เลือกสินค้า"),
  size: z.string().trim().default(""),
  is_free: z.boolean().default(false),
  qty: z.coerce.number().min(0).default(1),
  unit: z.string().trim().default("ขวด"),
  sku: z.string().trim().nullable().optional(),
});

const orderSchema = z.object({
  order_no: z.string().trim().min(1, "กรอก Order No."),
  platform: z.string().trim().default("Shopee"),
  doc_no: z.string().trim().optional().nullable(),
  doc_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่ต้องเป็น YYYY-MM-DD").optional().nullable()
    .or(z.literal("")),   // YYYY-MM-DD (กัน doc_no เพี้ยน SH-NaN-… ตอนคำนวณ)
  channel: z.string().trim().optional().nullable(),
  shop_name: z.string().trim().optional().nullable(),
  username: z.string().trim().optional().nullable(),
  receiver: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  customer_type: z.string().trim().optional().nullable(),
  purchase_count: z.coerce.number().int().optional().nullable(),
  district: z.string().trim().optional().nullable(),
  subdistrict: z.string().trim().optional().nullable(),
  province: z.string().trim().optional().nullable(),
  postcode: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  campaign: z.string().trim().optional().nullable(),
  note: z.string().trim().optional().nullable(),
  box_scent: z.string().trim().optional().nullable(),
  order_date: z.string().trim().optional().nullable(),
  items: z.array(itemSchema).min(1, "ต้องมีอย่างน้อย 1 รายการ"),
});

export type OrderInput = z.input<typeof orderSchema>;
export type SaveResult = { ok: boolean; error?: string; order_no?: string; doc_no?: string };

const ORDER_COLS = [
  "order_no", "platform", "doc_no", "doc_date", "month_label", "channel", "shop_name",
  "username", "receiver", "phone", "customer_type", "purchase_count", "district",
  "subdistrict", "province", "postcode", "address", "campaign", "note", "box_scent", "order_date",
];

/** Allocate the next doc number for a platform/day atomically. */
async function allocDocNo(run: <R = any>(sql: string, p?: any[]) => Promise<R[]>, platform: string, date: Date): Promise<string> {
  const ymd = ymdKey(date);
  const [{ seq }] = await run<{ seq: number }>(
    `insert into counters (platform, ymd, seq) values ($1, $2, 1)
     on conflict (platform, ymd) do update set seq = counters.seq + 1
     returning seq`,
    [platform, ymd],
  );
  return formatDocNo(platform, date, seq);
}

export async function saveOrder(input: OrderInput): Promise<SaveResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };
  if (!can.createOrders(user.role)) return { ok: false, error: "ไม่มีสิทธิ์จัดการใบเบิก (เฉพาะฝ่ายสร้างใบเบิก)" };

  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  const o = parsed.data;

  // ของแถม (Free) ได้เฉพาะขนาดเล็ก — ไซต์ใหญ่ห้ามเป็นของแถม
  const badFree = o.items.find((it) => it.is_free && !isAllowedFreeSize(it.size, it.product));
  if (badFree) {
    return { ok: false, error: `ของแถม "${badFree.product}" ขนาด ${badFree.size} ไม่ได้ — ของแถมได้เฉพาะ ${FREE_ALLOWED_SIZES.join(" / ")} (ถุงกระดาษ: Size S / Size M)` };
  }
  // ของแถมจำนวนต้องไม่เกิน 30 (บังคับฝั่ง server ด้วย ไม่ใช่แค่ disable ปุ่มบนฟอร์ม/นำเข้า)
  const bigFree = o.items.find((it) => it.is_free && Number(it.qty) > 30);
  if (bigFree) {
    return { ok: false, error: `ของแถม "${bigFree.product}" จำนวน ${bigFree.qty} เกิน 30 ไม่ได้` };
  }

  const date = o.doc_date ? new Date(o.doc_date + "T00:00:00") : new Date();
  const ml = monthLabel(date);

  try {
    const outDoc = await tx(async (run) => {
      const [existing] = await run<{ doc_no: string | null }>(`select doc_no from orders where order_no = $1`, [o.order_no]);
      let docNo = (o.doc_no || existing?.doc_no || "").trim();
      if (!docNo) docNo = await allocDocNo(run, o.platform, date);

      // เติม customer_type/purchase_count อัตโนมัติถ้าฟอร์มไม่ได้ส่งมา (ลูกค้าใหม่พิมพ์เองไม่ได้เลือกจาก dropdown)
      // นับจากจำนวนออเดอร์เดิมของ username เดียวกัน — กัน PDF ไม่ขึ้น "ลูกค้าใหม่ / ซื้อครั้งที่ 1"
      let custType = (o.customer_type || "").trim();
      let purchaseCount: number | null = o.purchase_count ?? null;
      if ((!custType || purchaseCount == null) && (o.username || "").trim()) {
        const [c] = await run<{ c: number }>(
          `select count(*)::int as c from orders
            where deleted_at is null and order_no <> $1 and lower(btrim(username)) = lower(btrim($2))`,
          [o.order_no, o.username]);
        const n = (c?.c ?? 0) + 1;
        if (purchaseCount == null) purchaseCount = n;
        if (!custType) custType = n > 1 ? "ลูกค้าเก่า" : "ลูกค้าใหม่";
      }

      const vals = [
        o.order_no, o.platform, docNo, o.doc_date || date.toISOString().slice(0, 10), ml,
        o.channel ?? o.platform, o.shop_name, o.username, o.receiver, o.phone, custType || null,
        purchaseCount, o.district, o.subdistrict, o.province, o.postcode, o.address, o.campaign,
        o.note, o.box_scent, o.order_date,
      ];
      const ph = ORDER_COLS.map((_, i) => `$${i + 1}`).join(",");
      const updates = ORDER_COLS.slice(1).map((c) => `${c} = excluded.${c}`).join(", ");
      await run(
        `insert into orders (${ORDER_COLS.join(",")}) values (${ph})
         on conflict (order_no) do update set ${updates}, updated_at = now(),
           deleted_at = null, deleted_by = null`,   // บันทึกทับ = กู้ออกจากถังขยะด้วย (กันใบหาย)
        vals,
      );
      // Set created_by only on first insert.
      await run(`update orders set created_by = coalesce(created_by, $2) where order_no = $1`, [o.order_no, user.id]);

      // Replace items.
      await run(`delete from order_items where order_no = $1`, [o.order_no]);
      let line = 0;
      for (const it of o.items) {
        line += 1;
        const label = buildProductLabel(it.product, it.size, it.is_free);
        await run(
          `insert into order_items (order_no, line_no, product, size, is_free, qty, unit, product_label, sku)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [o.order_no, line, it.product, it.size, it.is_free, it.qty, it.unit || "ขวด", label, it.sku || null],
        );
      }
      return docNo;
    });

    revalidateOrderLists();
    revalidatePath(`${platformBase(o.platform)}/${encodeURIComponent(o.order_no)}`);
    await logActivity("order.create", `${o.order_no} · ${o.platform}${outDoc ? " · " + outDoc : ""}`);
    return { ok: true, order_no: o.order_no, doc_no: outDoc };
  } catch (e: any) {
    return { ok: false, error: e?.message || "บันทึกไม่สำเร็จ" };
  }
}

/** Soft delete → move to trash (recoverable). */
/** Check whether an Order No already exists (for the "duplicate" warning). */
export async function orderExists(orderNo: string): Promise<{ exists: boolean; doc_no?: string | null; deleted?: boolean }> {
  const user = await getCurrentUser();
  if (!user || !can.createOrders(user.role)) return { exists: false };
  const [row] = await q<{ doc_no: string | null; deleted: boolean }>(
    `select doc_no, (deleted_at is not null) as deleted from orders where order_no = $1`,
    [(orderNo || "").trim()],
  );
  return row ? { exists: true, doc_no: row.doc_no, deleted: row.deleted } : { exists: false };
}

export async function deleteOrder(orderNo: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };
  if (!can.createOrders(user.role)) return { ok: false, error: "ไม่มีสิทธิ์จัดการใบเบิก (เฉพาะฝ่ายสร้างใบเบิก)" };
  try {
    await q(`update orders set deleted_at = now(), deleted_by = $2 where order_no = $1`, [orderNo, user.id]);
    await logActivity("order.delete", orderNo);
    revalidateOrderLists();
    revalidateOrderLists();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "ลบไม่สำเร็จ" };
  }
}

/** ลบหลายใบพร้อมกัน (ย้ายเข้าถังขยะ) — เลือกติ๊กในหน้ารายการ */
export async function bulkDeleteOrders(orderNos: string[]): Promise<{ ok: boolean; deleted: number; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, deleted: 0, error: "กรุณาเข้าสู่ระบบ" };
  if (!can.createOrders(user.role)) return { ok: false, deleted: 0, error: "ไม่มีสิทธิ์จัดการใบเบิก (เฉพาะฝ่ายสร้างใบเบิก)" };
  const list = Array.from(new Set((orderNos || []).map((s) => String(s).trim()).filter(Boolean)));
  if (list.length === 0) return { ok: true, deleted: 0 };
  try {
    const rows = await q<{ order_no: string }>(
      `update orders set deleted_at = now(), deleted_by = $2 where order_no = any($1) and deleted_at is null returning order_no`,
      [list, user.id],
    );
    await logActivity("order.delete", `${rows.length} ใบ (เลือกหลายรายการ)`);
    revalidateOrderLists();
    revalidateOrderLists();
    return { ok: true, deleted: rows.length };
  } catch (e: any) {
    return { ok: false, deleted: 0, error: e?.message || "ลบไม่สำเร็จ" };
  }
}

/** Restore from trash. */
export async function restoreOrder(orderNo: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };
  if (!can.createOrders(user.role)) return { ok: false, error: "ไม่มีสิทธิ์จัดการใบเบิก (เฉพาะฝ่ายสร้างใบเบิก)" };
  try {
    await q(`update orders set deleted_at = null, deleted_by = null where order_no = $1`, [orderNo]);
    await logActivity("order.restore", orderNo);
    revalidateOrderLists();
    revalidateOrderLists();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "กู้คืนไม่สำเร็จ" };
  }
}

/** Permanently delete (from trash only). */
export async function purgeOrder(orderNo: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };
  if (!can.createOrders(user.role)) return { ok: false, error: "ไม่มีสิทธิ์จัดการใบเบิก (เฉพาะฝ่ายสร้างใบเบิก)" };
  try {
    await q(`delete from orders where order_no = $1 and deleted_at is not null`, [orderNo]);
    await logActivity("order.purge", `${orderNo} (ลบถาวร)`);
    revalidateOrderLists();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "ลบถาวรไม่สำเร็จ" };
  }
}

/** กู้คืนหลายใบพร้อมกัน (จากถังขยะ) */
export async function bulkRestoreOrders(orderNos: string[]): Promise<{ ok: boolean; done: number; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, done: 0, error: "กรุณาเข้าสู่ระบบ" };
  if (!can.createOrders(user.role)) return { ok: false, done: 0, error: "ไม่มีสิทธิ์จัดการใบเบิก (เฉพาะฝ่ายสร้างใบเบิก)" };
  const list = Array.from(new Set((orderNos || []).map((s) => String(s).trim()).filter(Boolean)));
  if (list.length === 0) return { ok: true, done: 0 };
  try {
    const rows = await q<{ order_no: string }>(
      `update orders set deleted_at = null, deleted_by = null where order_no = any($1) and deleted_at is not null returning order_no`, [list]);
    await logActivity("order.restore", `${rows.length} ใบ`);
    revalidateOrderLists(); revalidateOrderLists();
    return { ok: true, done: rows.length };
  } catch (e: any) { return { ok: false, done: 0, error: e?.message || "กู้คืนไม่สำเร็จ" }; }
}

/** ลบถาวรหลายใบพร้อมกัน (จากถังขยะเท่านั้น) */
export async function bulkPurgeOrders(orderNos: string[]): Promise<{ ok: boolean; done: number; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, done: 0, error: "กรุณาเข้าสู่ระบบ" };
  if (!can.createOrders(user.role)) return { ok: false, done: 0, error: "ไม่มีสิทธิ์จัดการใบเบิก (เฉพาะฝ่ายสร้างใบเบิก)" };
  const list = Array.from(new Set((orderNos || []).map((s) => String(s).trim()).filter(Boolean)));
  if (list.length === 0) return { ok: true, done: 0 };
  try {
    const rows = await q<{ order_no: string }>(
      `delete from orders where order_no = any($1) and deleted_at is not null returning order_no`, [list]);
    await logActivity("order.purge", `${rows.length} ใบ (ลบถาวร)`);
    revalidateOrderLists();
    return { ok: true, done: rows.length };
  } catch (e: any) { return { ok: false, done: 0, error: e?.message || "ลบถาวรไม่สำเร็จ" }; }
}

export type PastItem = { product: string; size: string | null; is_free: boolean; qty: number };
export type CustomerSuggestion = {
  username: string | null; receiver: string | null; phone: string | null;
  province: string | null; district: string | null; subdistrict: string | null; postcode: string | null; address: string | null;
  total_orders: number;
  return_count?: number;           // จำนวนออเดอร์ที่ลูกค้ารายนี้เคยส่งคืน (เตือน "คืนบ่อย")
  past_items: PastItem[] | null;   // รายการที่เคยซื้อ (ล่าสุดก่อน) — ใช้ autofill
};

/** Suggest existing customers matching a typed term (username / phone / receiver).
 * Returns distinct customer profiles with how many times they've ordered. */
export async function searchCustomers(term: string): Promise<CustomerSuggestion[]> {
  const user = await getCurrentUser();
  if (!user || !can.createOrders(user.role)) return [];   // ข้อมูลลูกค้า (PII) = เฉพาะฝ่ายที่สร้างใบเบิก
  const t = (term || "").trim();
  if (t.length < 2) return [];
  const like = `%${t}%`;
  const sameCustomer = `(
    (nullif(o.phone,'') is not null and x.phone = o.phone)
    or (nullif(o.phone,'') is null and nullif(o.username,'') is not null and x.username = o.username)
  )`;
  const rows = await q<CustomerSuggestion>(
    `select o.username, o.receiver, o.phone, o.province, o.district, o.subdistrict, o.postcode, o.address,
            (select count(distinct x.order_no) from orders x where x.deleted_at is null and ${sameCustomer})::int as total_orders,
            (select json_agg(row_to_json(t)) from (
               select i.product, i.size, i.is_free, max(i.qty)::float8 as qty, max(x.doc_date) d
               from orders x join order_items i on i.order_no = x.order_no
               where x.deleted_at is null and coalesce(i.product,'') <> '' and ${sameCustomer}
               group by i.product, i.size, i.is_free
               order by d desc limit 15
             ) t) as past_items
     from orders o
     where o.deleted_at is null
       and (o.username ilike $1 or o.phone ilike $1 or o.receiver ilike $1
            or exists (select 1 from order_items oi where oi.order_no = o.order_no and oi.product ilike $1))
     group by o.username, o.receiver, o.phone, o.province, o.district, o.subdistrict, o.postcode, o.address
     order by max(o.doc_date) desc nulls last
     limit 8`,
    [like],
  );
  // จำนวนการคืนต่อลูกค้า — คิดเฉพาะ key ของลูกค้าที่แสดง (≤8) ไม่สแกนทั้งตาราง · ทนทาน: ถ้าตาราง order_returns ยังไม่มีคืน 0
  const keyOf = (r: CustomerSuggestion) => r.phone?.trim() || r.username || "";
  const keys = [...new Set(rows.map(keyOf).filter(Boolean))];
  if (keys.length) {
    try {
      const rc = await q<{ k: string; c: number }>(
        `select coalesce(nullif(btrim(x.phone),''), x.username, '') as k, count(distinct r.order_no)::int as c
         from order_returns r join orders x on x.order_no = r.order_no
         where r.voided_at is null and x.deleted_at is null
           and coalesce(nullif(btrim(x.phone),''), x.username, '') = any($1)
         group by coalesce(nullif(btrim(x.phone),''), x.username, '')`, [keys]);
      const map = new Map(rc.map((r) => [r.k, r.c]));
      for (const row of rows) row.return_count = map.get(keyOf(row)) || 0;
    } catch { for (const row of rows) row.return_count = 0; }
  }
  return rows;
}

export type PostcodeHit = { province: string; district: string; subdistrict: string; postcode: string };
/** ค้นหาจากรหัสไปรษณีย์ (ทั้งประเทศ) → ตำบล/อำเภอ/จังหวัด ให้เลือก */
export async function lookupPostcode(code: string): Promise<PostcodeHit[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const c = (code || "").replace(/\D/g, "");
  if (c.length < 3) return [];
  return q<PostcodeHit>(
    `select distinct province, district, subdistrict, postcode
     from thai_postcodes where postcode like $1
     order by province, district, subdistrict limit 80`,
    [c + "%"],
  );
}

// --- ประวัติการซื้อรายออร์เดอร์ (ให้ดูเทียบ ก่อนตัดสินใจเติม) ---
export type PastOrderItem = { product: string; size: string; is_free: boolean; qty: number };
export type PastOrder = {
  order_no: string; doc_no: string | null; doc_date: string | null; platform: string | null;
  province: string | null; district: string | null; subdistrict: string | null; postcode: string | null; address: string | null;
  items: PastOrderItem[];
};
export type CustomerHistory = {
  total_orders: number;
  profile: { receiver: string | null; phone: string | null; province: string | null; district: string | null; subdistrict: string | null; postcode: string | null; address: string | null } | null;
  orders: PastOrder[];   // ล่าสุดก่อน
};

// ค่าที่ถูกปกปิด (มี * เช่น Shopee mask) ใช้จับคู่ลูกค้าไม่ได้ → ถือว่าไม่มี
const cleanId = (s?: string | null) => { const t = (s || "").trim(); return t && !t.includes("*") ? t : ""; };
// จับคู่ลูกค้าเดิม: เบอร์ก่อน → username → ชื่อผู้รับ (อันแรกที่ไม่ว่างและไม่ถูกปกปิด)
function customerKey(id: { phone?: string | null; username?: string | null; receiver?: string | null }) {
  const phone = cleanId(id.phone), username = cleanId(id.username), receiver = cleanId(id.receiver);
  if (phone) return { col: "phone", val: phone };
  if (username) return { col: "username", val: username };
  if (receiver) return { col: "receiver", val: receiver };
  return null;
}

/** ประวัติการซื้อของลูกค้าคนนี้ (รายออร์เดอร์ ล่าสุดก่อน) — ใช้โชว์การ์ดเทียบข้อมูล */
export async function customerHistory(
  id: { phone?: string | null; username?: string | null; receiver?: string | null },
  opts: { excludeOrderNo?: string; limit?: number } = {},
): Promise<CustomerHistory> {
  const user = await getCurrentUser();
  const empty: CustomerHistory = { total_orders: 0, profile: null, orders: [] };
  if (!user || !can.createOrders(user.role)) return empty;
  const key = customerKey(id);
  if (!key) return empty;
  const exclude = (opts.excludeOrderNo || "").trim();
  const limit = Math.min(opts.limit ?? 8, 20);
  const params: any[] = [key.val];
  let excl = "";
  if (exclude) { params.push(exclude); excl = "and o.order_no <> $2"; }

  const rows = await q<{ order_no: string; doc_no: string | null; doc_date: string | null; platform: string | null; province: string | null; district: string | null; subdistrict: string | null; postcode: string | null; address: string | null; receiver: string | null; phone: string | null }>(
    `select o.order_no, o.doc_no, to_char(o.doc_date,'YYYY-MM-DD') as doc_date, o.platform,
            o.province, o.district, o.subdistrict, o.postcode, o.address, o.receiver, o.phone
     from orders o
     where o.deleted_at is null and nullif(o.${key.col},'') = $1 ${excl}
     order by o.doc_date desc nulls last, o.created_at desc`,
    params,
  );
  if (rows.length === 0) return empty;
  const top = rows.slice(0, limit);
  const items = await q<{ order_no: string; product: string; size: string; is_free: boolean; qty: number }>(
    `select order_no, product, size, is_free, qty::float8 as qty from order_items
     where order_no = any($1) and coalesce(product,'') <> '' order by line_no`,
    [top.map((r) => r.order_no)],
  );
  const byOrder = new Map<string, PastOrderItem[]>();
  for (const it of items) {
    const arr = byOrder.get(it.order_no) ?? [];
    arr.push({ product: it.product, size: it.size, is_free: it.is_free, qty: Number(it.qty) });
    byOrder.set(it.order_no, arr);
  }
  const orders: PastOrder[] = top.map((r) => ({
    order_no: r.order_no, doc_no: r.doc_no, doc_date: r.doc_date, platform: r.platform,
    province: r.province, district: r.district, subdistrict: r.subdistrict, postcode: r.postcode, address: r.address,
    items: byOrder.get(r.order_no) ?? [],
  }));
  const p = rows[0];
  return {
    total_orders: rows.length,
    profile: { receiver: p.receiver, phone: p.phone, province: p.province, district: p.district, subdistrict: p.subdistrict, postcode: p.postcode, address: p.address },
    orders,
  };
}

/** สรุปแบบเป็นชุด (สำหรับหน้า import) — คืน {จำนวนครั้ง, ที่อยู่ล่าสุด} เรียงตรงกับ ids ที่ส่งมา */
export async function customersSummary(
  ids: { phone?: string | null; username?: string | null; receiver?: string | null }[],
): Promise<{ total_orders: number; last_address: string | null; last_date: string | null }[]> {
  const blank = () => ({ total_orders: 0, last_address: null, last_date: null });
  const user = await getCurrentUser();
  if (!user || !can.createOrders(user.role)) return ids.map(blank);
  const keys = ids.map((id) => customerKey(id));
  const phones = new Set<string>(), usernames = new Set<string>(), receivers = new Set<string>();
  for (const k of keys) {
    if (k?.col === "phone") phones.add(k.val);
    else if (k?.col === "username") usernames.add(k.val);
    else if (k?.col === "receiver") receivers.add(k.val);
  }
  if (!phones.size && !usernames.size && !receivers.size) return ids.map(blank);
  const rows = await q<{ phone: string | null; username: string | null; receiver: string | null; address: string | null; doc_date: string | null }>(
    `select phone, username, receiver, address, to_char(doc_date,'YYYY-MM-DD') as doc_date
     from orders where deleted_at is null and (
       nullif(phone,'') = any($1) or nullif(username,'') = any($2) or nullif(receiver,'') = any($3)
     )`,
    [[...phones], [...usernames], [...receivers]],
  );
  const idx = { phone: new Map<string, any[]>(), username: new Map<string, any[]>(), receiver: new Map<string, any[]>() };
  const add = (m: Map<string, any[]>, k: string | null, v: any) => { if (!k) return; const a = m.get(k) ?? []; a.push(v); m.set(k, a); };
  for (const r of rows) { add(idx.phone, r.phone, r); add(idx.username, r.username, r); add(idx.receiver, r.receiver, r); }
  return keys.map((k) => {
    if (!k) return blank();
    const m = (idx as any)[k.col].get(k.val) as any[] | undefined;
    if (!m || m.length === 0) return blank();
    const latest = [...m].sort((a, b) => String(b.doc_date || "").localeCompare(String(a.doc_date || "")))[0];
    return { total_orders: m.length, last_address: latest.address ?? null, last_date: latest.doc_date ?? null };
  });
}

export type MatchRow = { order_no: string; doc_no: string | null; receiver: string | null; province: string | null; item_count: number };
export type MatchResult = { found: MatchRow[]; missing: string[] };

/** Match a list of order numbers (e.g. a Shopee "to-ship" export) against
 * existing orders so the user can print the ones already in the system. */
export async function matchOrders(orderNos: string[]): Promise<{ ok: boolean; error?: string } & Partial<MatchResult>> {
  const user = await getCurrentUser();
  if (!user || !can.createOrders(user.role)) return { ok: false, error: "ไม่มีสิทธิ์" };
  const list = Array.from(new Set((orderNos || []).map((s) => String(s).trim()).filter(Boolean)));
  if (list.length === 0) return { ok: true, found: [], missing: [] };

  const found = await q<MatchRow>(
    `select o.order_no, o.doc_no, o.receiver, o.province, coalesce(count(i.id),0)::int as item_count
     from orders o left join order_items i on i.order_no = o.order_no
     where o.deleted_at is null and o.order_no = any($1)
     group by o.order_no`,
    [list],
  );
  const foundSet = new Set(found.map((f) => f.order_no));
  const missing = list.filter((o) => !foundSet.has(o));
  return { ok: true, found, missing };
}

/** Bulk upsert from the import wizard. Returns count of orders saved. */
export async function bulkSaveOrders(orders: OrderWithItems[]): Promise<{ ok: boolean; saved: number; failed?: number; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, saved: 0, error: "กรุณาเข้าสู่ระบบ" };
  if (!can.createOrders(user.role)) return { ok: false, saved: 0, error: "ไม่มีสิทธิ์นำเข้าใบเบิก (เฉพาะฝ่ายสร้างใบเบิก)" };
  let saved = 0;
  const errors: string[] = [];

  // คำนวณ "ซื้อครั้งที่" ใหม่เสมอ — จับคู่ลูกค้าด้วย username:
  //   ซื้อครั้งที่ = จำนวนที่เคยซื้อใน DB (ประวัติเดิม) + ลำดับในไฟล์นี้ (เรียงวันที่→Order No.)
  //   → ลูกค้าซื้อหลายออเดอร์วันเดียวกัน จะนับต่อเนื่อง (เช่น เก่า 4 ครั้ง → ใบนี้ 5, ใบถัดไป 6)
  const nk = (s?: string | null) => (s || "").trim().toLowerCase();
  const groups = new Map<string, OrderWithItems[]>();
  for (const o of orders) {
    const k = nk(o.username);
    if (!k) continue;                         // ไม่มี username → ใช้ค่าเดิมจากไฟล์
    const arr = groups.get(k); if (arr) arr.push(o); else groups.set(k, [o]);
  }
  const groupArr = [...groups];
  for (let gi = 0; gi < groupArr.length; gi += 10) {   // ทีละ 10 ไม่ให้ล้น pool (max 10)
    await Promise.all(groupArr.slice(gi, gi + 10).map(async ([k, list]) => {
      const ons = list.map((o) => o.order_no);
      let existing = 0;
      try {
        const [r] = await q<{ c: number }>(
          `select count(*)::int as c from orders
            where lower(btrim(username)) = $1 and deleted_at is null and order_no <> all($2::text[])`,
          [k, ons]);
        existing = r?.c ?? 0;
      } catch { existing = 0; }
      list.sort((a, b) =>
        String(a.order_date || a.doc_date || "").localeCompare(String(b.order_date || b.doc_date || ""))
        || String(a.order_no).localeCompare(String(b.order_no)));
      list.forEach((o, i) => {
        const n = existing + i + 1;
        o.purchase_count = n as any;
        o.customer_type = (n > 1 ? "ลูกค้าเก่า" : "ลูกค้าใหม่") as any;
      });
    }));
  }

  // พยายามบันทึกทุกออร์เดอร์ (แต่ละอันเป็น tx ของตัวเอง) — ไม่หยุดกลางคันเมื่อเจอแถวเสีย
  // บันทึกทีละชุด (chunk) ขนานกัน → เร็วกว่า loop ทีละใบมาก (round-trip ข้ามทวีป) ·
  //   ปลอดภัย: doc_no ใช้ counter atomic, แต่ละใบ order_no ต่างกันจึงไม่ชนกัน · จำกัดไม่ให้ล้น pool (max 10)
  const CHUNK = 6;
  for (let i = 0; i < orders.length; i += CHUNK) {
    const results = await Promise.all(orders.slice(i, i + CHUNK).map(async (ord) => {
      try {
        const res = await saveOrder({
          ...ord,
          items: ord.items.map((it) => ({
            product: it.product, size: it.size, is_free: it.is_free, qty: it.qty, unit: it.unit, sku: it.sku ?? null,
          })),
        } as OrderInput);
        return res.ok ? { ok: true as const } : { ok: false as const, err: `${ord.order_no}: ${res.error}` };
      } catch (e: any) {
        return { ok: false as const, err: `${ord.order_no}: ${e?.message || "บันทึกไม่สำเร็จ"}` };
      }
    }));
    for (const r of results) { if (r.ok) saved += 1; else errors.push(r.err); }
  }
  await logActivity("order.import", `นำเข้า ${saved} ใบ${errors.length ? ` · ล้มเหลว ${errors.length}` : ""}`);
  revalidateOrderLists();
  if (errors.length) {
    const preview = errors.slice(0, 5).join("; ");
    return { ok: false, saved, failed: errors.length, error: `บันทึกสำเร็จ ${saved}, ล้มเหลว ${errors.length} — ${preview}${errors.length > 5 ? " …" : ""}` };
  }
  return { ok: true, saved, failed: 0 };
}

// ─── จัดส่งสินค้า: สแกน Order No. จากใบปะหน้าเพื่อบันทึกว่าส่งแล้ว ───
export type ShipResult = {
  ok: boolean; error?: string;
  already?: boolean;                 // สแกนซ้ำ (ส่งไปแล้ว)
  at?: string | null;                // เวลาที่ส่ง
  issued?: boolean;                  // ตัดสต๊อกแล้วหรือยัง
  order?: { order_no: string; platform: string | null; receiver: string | null; province: string | null; item_count: number };
};

/** บันทึกว่าออเดอร์ถูกส่งแล้ว (สแกน Order No.) — กันสแกนซ้ำ, ไม่ทับเวลาเดิม
 *  dateStr (YYYY-MM-DD) = ย้อนหลัง: บันทึกเป็นเที่ยงวันไทยของวันนั้น · ไม่ใส่ = วันนี้ (now) */
export async function markShipped(orderNo: string, dateStr?: string): Promise<ShipResult> {
  const user = await getCurrentUser();
  if (!user || !can.viewStock(user.role)) return { ok: false, error: "ไม่มีสิทธิ์บันทึกการส่ง" };
  const code = (orderNo || "").trim();
  if (!code) return { ok: false, error: "ไม่มี Order No." };
  const backdate = /^\d{4}-\d{2}-\d{2}$/.test(dateStr || "");
  const [o] = await q<{ order_no: string; platform: string | null; receiver: string | null; username: string | null; province: string | null; shipped_at: string | null; stock_issued_at: string | null; item_count: number }>(
    `select o.order_no, o.platform, o.receiver, o.username, o.province, o.shipped_at, o.stock_issued_at,
            (select count(*)::int from order_items i where i.order_no = o.order_no) as item_count
     from orders o
     where o.deleted_at is null and upper(btrim(o.order_no)) = upper(btrim($1))
     limit 1`, [code]);
  if (!o) return { ok: false, error: `ไม่พบออเดอร์ ${code}` };
  const info = { order_no: o.order_no, platform: o.platform, receiver: o.receiver || o.username, province: o.province, item_count: o.item_count };
  if (o.shipped_at) return { ok: true, already: true, at: o.shipped_at, issued: !!o.stock_issued_at, order: info };
  // เคลมแบบ atomic — set เฉพาะตอน shipped_at ยัง null → สแกนซ้ำ/แข่งกันรัวๆ อีก request จะได้ 0 แถว
  // (order_no เป็น PK มีแถวเดียว จึงไม่มีทางบันทึกส่งซ้ำ/นับซ้ำ)
  const [u] = backdate
    ? await q<{ shipped_at: string }>(
        `update orders set shipped_at = (($2 || ' 12:00:00')::timestamp at time zone 'Asia/Bangkok'), shipped_by = $3
         where order_no = $1 and shipped_at is null returning shipped_at`,
        [o.order_no, dateStr, user.id])
    : await q<{ shipped_at: string }>(
        `update orders set shipped_at = now(), shipped_by = $2
         where order_no = $1 and shipped_at is null returning shipped_at`,
        [o.order_no, user.id]);
  if (!u) {
    // อีก request เคลมไปก่อนแล้ว (แข่งกันสแกน) → รายงานเป็น "ซ้ำ" ไม่บันทึก/นับส่งเพิ่ม
    const [again] = await q<{ shipped_at: string | null }>(`select shipped_at from orders where order_no = $1`, [o.order_no]);
    return { ok: true, already: true, at: again?.shipped_at ?? null, issued: !!o.stock_issued_at, order: info };
  }
  await logActivity("ship", `${o.order_no} · ${o.platform || "Shopee"}${backdate ? " · ย้อนหลัง " + dateStr : ""}`);
  revalidateOrderLists();
  return { ok: true, already: false, at: u.shipped_at, issued: !!o.stock_issued_at, order: info };
}

/** ยกเลิกการส่ง (สแกนผิด) — เฉพาะแอดมิน/ฝ่ายคลัง */
export async function unshipOrder(orderNo: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user || !can.manageStock(user.role)) return { ok: false, error: "เฉพาะผู้ดูแล / ฝ่ายคลัง" };
  await q(`update orders set shipped_at = null, shipped_by = null where order_no = $1`, [(orderNo || "").trim()]);
  await logActivity("unship", (orderNo || "").trim());
  revalidatePath("/ship/daily"); revalidateOrderLists();
  return { ok: true };
}
