"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { q, tx } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { logActivity } from "@/lib/activity";
import { buildProductLabel, type OrderWithItems } from "@/lib/types";
import { formatDocNo, monthLabel, ymdKey } from "@/lib/docno";
import { isAllowedFreeSize, FREE_ALLOWED_SIZES, enabledPlatforms, platformBase, isBagProduct, PLATFORMS, canImportPlatform, isWholesalePlatform, platformName } from "@/lib/config";
import { EVEANDBOY_BY_KEY } from "@/lib/eveandboy-data";
import { KINGPOWER_BY_KEY } from "@/lib/kingpower-data";

/** revalidate หน้ารายการ+ถังขยะใบเบิกของทุกแพลตฟอร์ม (route เป็น /[platform] — hardcode /shopee ครอบไม่ครบ) */
function revalidateOrderLists() {
  for (const p of enabledPlatforms()) {
    revalidatePath(platformBase(p.code));
    revalidatePath(`${platformBase(p.code)}/trash`);
  }
  revalidateTag("dashboard");   // ตัวเลขบนแดชบอร์ด (cache 30 วิ) สดทันทีหลังเขียนออเดอร์
}

const itemSchema = z.object({
  product: z.string().trim().min(1, "เลือกสินค้า"),
  size: z.string().trim().default(""),
  is_free: z.boolean().default(false),
  qty: z.coerce.number().int().min(1).default(1),   // จำนวนต้องเป็นจำนวนเต็ม ≥ 1 (กัน import/action call ส่ง 0 หรือทศนิยม)
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
  // ฟิลด์ Office (ร้านขาย/จัดส่งเอง) — แพลตฟอร์มอื่นเว้นว่าง
  price: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().nullable()).optional(),
  discount: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().nullable()).optional(),
  payment_method: z.string().trim().optional().nullable(),
  shipping_carrier: z.string().trim().optional().nullable(),
  tracking_no: z.string().trim().optional().nullable(),
  branch: z.string().trim().optional().nullable(),        // ใบเบิกค้าส่ง: สาขาปลายทาง
  branch_code: z.string().trim().optional().nullable(),   // รหัสสาขา
  po_version: z.string().trim().optional().nullable(),    // PO Order Version (Eveandboy — กรอกเอง)
  items: z.array(itemSchema).min(1, "ต้องมีอย่างน้อย 1 รายการ"),
});

export type OrderInput = z.input<typeof orderSchema>;
export type SaveResult = { ok: boolean; error?: string; order_no?: string; doc_no?: string };

const ORDER_COLS = [
  "order_no", "platform", "doc_no", "doc_date", "month_label", "channel", "shop_name",
  "username", "receiver", "phone", "customer_type", "purchase_count", "district",
  "subdistrict", "province", "postcode", "address", "campaign", "note", "box_scent", "order_date",
  "price", "discount", "payment_method", "shipping_carrier", "tracking_no", "branch",
  "branch_code", "po_version",
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

export async function saveOrder(input: OrderInput, opts?: { silent?: boolean }): Promise<SaveResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };
  if (!can.createOrders(user.role)) return { ok: false, error: "ไม่มีสิทธิ์จัดการใบเบิก (เฉพาะฝ่ายสร้างใบเบิก)" };

  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  const o = parsed.data;

  // platform ต้องมีจริงในระบบ (กัน action call ตรงๆ ใส่ platform มั่ว → doc_no prefix เพี้ยน)
  if (!PLATFORMS.some((p) => p.code === o.platform)) return { ok: false, error: `แพลตฟอร์มไม่ถูกต้อง: ${o.platform}` };
  // ค้าส่ง (CTW/Eveandboy/King Power) ต้องมีสาขา (defense — ฟอร์มบังคับอยู่แล้ว)
  if (isWholesalePlatform(o.platform) && !(o.branch || "").trim()) return { ok: false, error: `เลือกสาขาปลายทาง (${o.platform})` };
  // (Eveandboy: ตรวจแคตตาล็อกย้ายเข้า tx ด้านล่าง — ตรวจเฉพาะออเดอร์ใหม่/รายการที่เปลี่ยน กันแก้ที่อยู่/โน้ตไม่ได้)

  // ของแถม (Free) ได้เฉพาะขนาดเล็ก — ไซต์ใหญ่ห้ามเป็นของแถม
  const badFree = o.items.find((it) => it.is_free && !isAllowedFreeSize(it.size, it.product));
  if (badFree) {
    return { ok: false, error: `ของแถม "${badFree.product}" ขนาด ${badFree.size} ไม่ได้ — ของแถมได้เฉพาะ ${FREE_ALLOWED_SIZES.join(" / ")} (ถุงกระดาษ: Size S / Size M)` };
  }
  // ของแถมที่ไม่ใช่ถุง ต้องระบุขนาด (กัน action call ใส่ free ขนาดว่าง เลี่ยงกฎ 1.2/4/10 ml)
  const freeNoSize = o.items.find((it) => it.is_free && !isBagProduct(it.product) && !(it.size || "").trim());
  if (freeNoSize) {
    return { ok: false, error: `ของแถม "${freeNoSize.product}" ต้องระบุขนาด (ได้เฉพาะ ${FREE_ALLOWED_SIZES.join(" / ")})` };
  }
  // ของแถมจำนวนต้องไม่เกิน 30 (บังคับฝั่ง server ด้วย) — ยกเว้นถุงกระดาษบนใบเบิก CTW เบิกได้ถึง 80
  const freeMax = (it: { product?: string | null }) => (isBagProduct(it.product) && o.platform === "CTW" ? 80 : 30);
  const bigFree = o.items.find((it) => it.is_free && Number(it.qty) > freeMax(it));
  if (bigFree) {
    return { ok: false, error: `ของแถม "${bigFree.product}" จำนวน ${bigFree.qty} เกิน ${freeMax(bigFree)} ไม่ได้` };
  }

  // ล็อก "วันที่ใบเบิก" = วันที่สร้างจริงในระบบ (เวลาไทย) — ไม่ให้ backdate จากฟอร์ม (ค่าที่ฟอร์มส่งมาไม่ถูกใช้)
  const bangkokToday = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);

  try {
    const outDoc = await tx(async (run) => {
      // ใช้ PK เดิมถ้ามีใบเลขนี้อยู่แล้ว (ต่างแค่ตัวพิมพ์/ช่องว่าง) — กันสร้างซ้ำคนละ case (import เก็บพิมพ์เล็ก, สร้างเองพิมพ์ใหญ่)
      const [canon] = await run<{ order_no: string }>(
        `select order_no from orders where upper(btrim(order_no)) = upper(btrim($1)) order by (order_no = $1) desc limit 1`, [o.order_no]);
      if (canon) o.order_no = canon.order_no;
      const [existing] = await run<{ doc_no: string | null; doc_date: string | null; stock_issued_at: string | null; shipped_at: string | null }>(
        `select doc_no, to_char(doc_date,'YYYY-MM-DD') as doc_date, stock_issued_at, shipped_at from orders where order_no = $1`, [o.order_no]);
      const sig = (its: { product?: string | null; size?: string | null; is_free?: boolean; qty: number | string }[]) =>
        its.map((it) => `${(it.product || "").trim()}|${(it.size || "").trim()}|${it.is_free ? 1 : 0}|${Number(it.qty) || 0}`).sort().join(";");
      // รายการสินค้าเปลี่ยนจากที่เก็บไว้ไหม (ใช้ทั้งกันแก้หลังตัดสต๊อก + ตรวจแคตตาล็อก Eveandboy)
      const prevItems = existing
        ? await run<{ product: string; size: string; is_free: boolean; qty: number }>(`select product, size, is_free, qty from order_items where order_no = $1`, [o.order_no])
        : [];
      const itemsChanged = !existing || sig(prevItems) !== sig(o.items);
      // กันแก้ "รายการสินค้า" หลังตัดสต๊อก/ส่งแล้ว — ทำให้ยอดรับคืน/คืนสต๊อกเพี้ยน (แก้ที่อยู่/โน้ตยังได้)
      if (existing && (existing.stock_issued_at || existing.shipped_at) && itemsChanged) {
        throw new Error("ใบเบิกนี้ตัดสต๊อก/ส่งแล้ว — แก้รายการสินค้าไม่ได้ (ต้องยกเลิกการตัดสต๊อกก่อน)");
      }
      // Eveandboy / King Power: สินค้า/ขนาดต้องอยู่ในแคตตาล็อก (จับด้วยกลิ่น+ml) — ตรวจเฉพาะออเดอร์ใหม่/รายการที่เปลี่ยน
      // (ออเดอร์เก่าที่มีสินค้าหลุดแคตตาล็อกภายหลัง ยังแก้ที่อยู่/โน้ตได้ ตราบใดไม่แตะรายการ)
      const catalog = o.platform === "Eveandboy" ? EVEANDBOY_BY_KEY : o.platform === "KingPower" ? KINGPOWER_BY_KEY : null;
      if (catalog && itemsChanged) {
        const nkp = (s?: string | null) => (s || "").toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");
        const mlp = (s?: string | null) => (s || "").match(/[0-9]+(\.[0-9]+)?/)?.[0] ?? "";
        const bad = o.items.find((it) => !isBagProduct(it.product) && !catalog[`${nkp(it.product)}|${mlp(it.size)}`]);
        if (bad) throw new Error(`"${bad.product} ${bad.size}" ไม่มีในแคตตาล็อก ${platformName(o.platform)} — เลือกจากรายการที่กำหนด`);
      }
      // ออเดอร์ใหม่ = วันนี้ (เวลาไทย) · ออเดอร์เดิม = คงวันที่ใบเบิกเดิม (แก้ไขไม่เปลี่ยนวัน)
      const storedDocDate = existing?.doc_date || bangkokToday();
      const date = new Date(storedDocDate + "T00:00:00");
      const ml = monthLabel(date);
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
        o.order_no, o.platform, docNo, storedDocDate, ml,
        o.channel ?? o.platform, o.shop_name, o.username, o.receiver, o.phone, custType || null,
        purchaseCount, o.district, o.subdistrict, o.province, o.postcode, o.address, o.campaign,
        o.note, o.box_scent, o.order_date,
        o.price ?? null, o.discount ?? null, o.payment_method || null, o.shipping_carrier || null, o.tracking_no || null,
        o.branch || null, o.branch_code || null, o.po_version || null,
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

    if (!opts?.silent) {   // bulk import ข้าม revalidate/log ต่อใบ → ทำครั้งเดียวตอนจบ (เร็ว + activity ไม่รก)
      revalidateOrderLists();
      revalidatePath(`${platformBase(o.platform)}/${encodeURIComponent(o.order_no)}`);
      await logActivity("order.create", `${o.order_no} · ${o.platform}${outDoc ? " · " + outDoc : ""}`);
    }
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
    revalidateOrderLists();
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
export async function bulkSaveOrders(orders: OrderWithItems[]): Promise<{ ok: boolean; saved: number; failed?: number; failedOrders?: string[]; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, saved: 0, error: "กรุณาเข้าสู่ระบบ" };
  if (!can.createOrders(user.role)) return { ok: false, saved: 0, error: "ไม่มีสิทธิ์นำเข้าใบเบิก (เฉพาะฝ่ายสร้างใบเบิก)" };
  // แพลตฟอร์มที่ห้าม import (เช่น CTW = สร้างในระบบเท่านั้น) — กันนำเข้าผิดช่องทาง
  const badPf = orders.find((o) => o.platform && !canImportPlatform(o.platform));
  if (badPf) return { ok: false, saved: 0, error: `แพลตฟอร์ม ${badPf.platform} นำเข้าจากไฟล์ไม่ได้ (สร้างในระบบเท่านั้น)` };
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
  // ความขนานต้องไม่เกินขนาด pool (default 3) ไม่งั้น tx ที่รอ connection จะ timeout → "failed" ปลอม
  const CONC = Math.max(1, Number(process.env.PG_POOL_MAX || 3));
  for (let gi = 0; gi < groupArr.length; gi += CONC) {
    await Promise.all(groupArr.slice(gi, gi + CONC).map(async ([k, list]) => {
      const ons = list.map((o) => o.order_no);
      // ดึงประวัติเดิม (พร้อมวันที่) ของ username นี้ → จัดอันดับ "ซื้อครั้งที่" ตามวันที่รวมกับไฟล์
      // (เดิมใช้ existing + index ในไฟล์ → retry เฉพาะใบที่ fail แล้วนับเพี้ยนถ้าใบนั้นไม่ใช่ใบล่าสุด)
      let prior: { d: string; on: string }[] = [];
      try {
        prior = await q<{ d: string; on: string }>(
          `select coalesce(to_char(order_date,'YYYY-MM-DD'), to_char(doc_date,'YYYY-MM-DD'), '') as d, order_no as on
             from orders where lower(btrim(username)) = $1 and deleted_at is null and order_no <> all($2::text[])`,
          [k, ons]);
      } catch { prior = []; }
      const merged = [
        ...prior.map((p) => ({ d: p.d, on: p.on, ref: null as OrderWithItems | null })),
        ...list.map((o) => ({ d: String(o.order_date || o.doc_date || ""), on: String(o.order_no), ref: o })),
      ].sort((a, b) => a.d.localeCompare(b.d) || a.on.localeCompare(b.on));
      merged.forEach((m, i) => {
        if (!m.ref) return;   // ประวัติเดิม — ไม่แตะ
        const n = i + 1;
        m.ref.purchase_count = n as any;
        m.ref.customer_type = (n > 1 ? "ลูกค้าเก่า" : "ลูกค้าใหม่") as any;
      });
    }));
  }

  // พยายามบันทึกทุกออร์เดอร์ (แต่ละอันเป็น tx ของตัวเอง) — ไม่หยุดกลางคันเมื่อเจอแถวเสีย
  // บันทึกทีละชุด (chunk) ขนานกัน → เร็วกว่า loop ทีละใบมาก (round-trip ข้ามทวีป) ·
  //   ปลอดภัย: doc_no ใช้ counter atomic, แต่ละใบ order_no ต่างกันจึงไม่ชนกัน · จำกัดไม่ให้ล้น pool (max 10)
  const failedOrders: string[] = [];
  const CHUNK = Math.max(1, Number(process.env.PG_POOL_MAX || 3));   // ≤ pool size กัน connection timeout
  for (let i = 0; i < orders.length; i += CHUNK) {
    const results = await Promise.all(orders.slice(i, i + CHUNK).map(async (ord) => {
      try {
        const res = await saveOrder({
          ...ord,
          items: ord.items.map((it) => ({
            product: it.product, size: it.size, is_free: it.is_free, qty: it.qty, unit: it.unit, sku: it.sku ?? null,
          })),
        } as OrderInput, { silent: true });   // ข้าม revalidate/log ต่อใบ → ทำครั้งเดียวตอนจบ
        return res.ok ? { ok: true as const } : { ok: false as const, order_no: ord.order_no, err: `${ord.order_no}: ${res.error}` };
      } catch (e: any) {
        return { ok: false as const, order_no: ord.order_no, err: `${ord.order_no}: ${e?.message || "บันทึกไม่สำเร็จ"}` };
      }
    }));
    for (const r of results) { if (r.ok) saved += 1; else { errors.push(r.err); failedOrders.push(r.order_no); } }
  }
  await logActivity("order.import", `นำเข้า ${saved} ใบ${errors.length ? ` · ล้มเหลว ${errors.length}` : ""}`);
  revalidateOrderLists();
  if (errors.length) {
    const preview = errors.slice(0, 5).join("; ");
    return { ok: false, saved, failed: errors.length, failedOrders, error: `บันทึกสำเร็จ ${saved}, ล้มเหลว ${errors.length} — ${preview}${errors.length > 5 ? " …" : ""}` };
  }
  return { ok: true, saved, failed: 0, failedOrders: [] };
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
  try {
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
  } catch (e: any) {
    return { ok: false, error: e?.message || "บันทึกการส่งไม่สำเร็จ (ระบบขัดข้อง ลองใหม่)" };
  }
}

/** ยกเลิกการส่ง (สแกนผิด) — admin/คลัง ยกเลิกได้ทุกใบ · picker ยกเลิกเฉพาะที่ตัวเองสแกนภายใน 24 ชม. */
export async function unshipOrder(orderNo: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user || !can.viewStock(user.role)) return { ok: false, error: "ไม่มีสิทธิ์ยกเลิกการส่ง" };
  const on = (orderNo || "").trim();
  if (!on) return { ok: false, error: "ไม่มี Order No." };
  try {
    const [o] = await q<{ shipped_at: string | null; shipped_by: number | null; return_status: string | null; recent: boolean }>(
      `select shipped_at, shipped_by, return_status, (shipped_at > now() - interval '24 hours') as recent
       from orders where order_no = $1`, [on]);
    if (!o) return { ok: false, error: `ไม่พบออเดอร์ ${on}` };
    if (!o.shipped_at) return { ok: false, error: "ออเดอร์นี้ยังไม่ได้บันทึกส่ง" };
    // มีการรับคืนแล้ว → ยกเลิกส่งจะทำให้สถานะคืนค้าง (ต้องยกเลิกการคืนก่อน) — มิเรอร์ความปลอดภัยของ reverseIssue
    if (o.return_status && o.return_status !== "none") return { ok: false, error: "ออเดอร์นี้มีการรับคืนแล้ว — ต้องยกเลิกการคืนก่อนจึงจะยกเลิกการส่งได้" };
    // picker (ไม่ใช่ admin/คลัง): เฉพาะที่ตัวเองสแกน + ภายใน 24 ชม.
    if (!can.manageStock(user.role) && !(o.shipped_by === user.id && o.recent)) {
      return { ok: false, error: "ยกเลิกได้เฉพาะรายการที่คุณสแกนเองภายใน 24 ชม. — นอกเหนือจากนี้แจ้งผู้ดูแล/ฝ่ายคลัง" };
    }
    // เคลม atomic — กันยกเลิกซ้ำ/แข่งกัน
    const [u] = await q<{ order_no: string }>(`update orders set shipped_at = null, shipped_by = null where order_no = $1 and shipped_at is not null returning order_no`, [on]);
    if (!u) return { ok: false, error: "ยกเลิกไม่สำเร็จ (อาจถูกยกเลิกไปแล้ว)" };
    await logActivity("unship", `${on}${can.manageStock(user.role) ? "" : " · self"}`);
    revalidatePath("/ship/daily"); revalidateOrderLists();
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e?.message || "ยกเลิกไม่สำเร็จ" }; }
}
