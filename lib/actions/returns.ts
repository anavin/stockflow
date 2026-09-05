"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { q, tx } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { logActivity } from "@/lib/activity";
import { isStockTracked, assignsSku, needsSerialSku, isBagProduct, enabledPlatforms, platformBase } from "@/lib/config";

// ถุงกระดาษ = คลังบรรจุภัณฑ์ (material_item) — ตัวอักษรไซส์ (S/M) จาก spec/size
const bagLetter = (s?: string | null) => ((s || "").replace(/[^A-Za-z]/g, "").slice(-1) || "").toUpperCase();
async function creditBag(run: <R = any>(sql: string, p?: any[]) => Promise<R[]>, sizeOrSpec: string, qtyChange: number, orderNo: string, userId: number, reason: string, note: string): Promise<boolean> {
  const letter = bagLetter(sizeOrSpec);
  if (!letter) return false;
  const [it] = await run<{ id: number }>(
    `select id from material_item where category='packaging' and label ~ 'ถุง'
       and right(upper(regexp_replace(label,'[^A-Za-z]','','g')),1) = $1 order by id limit 1`, [letter]);
  if (!it) return false;
  const [row] = await run<{ qty: number }>(
    `update material_item set qty = qty + $2, updated_at = now() where id = $1 returning qty::float8 as qty`, [it.id, qtyChange]);
  await run(`insert into material_move (item_id, qty_change, balance, reason, note, order_no, created_by)
             values ($1,$2,$3,$4,$5,$6,$7)`, [it.id, qtyChange, row.qty, reason, note, orderNo, userId]);
  return true;
}

/** revalidate หน้ารายการใบเบิกทุกแพลตฟอร์ม (ป้ายสถานะคืนโชว์บนรายการ) */
const revalidateAllOrderLists = () => { for (const p of enabledPlatforms()) revalidatePath(platformBase(p.code));  revalidateTag("dashboard"); };

// ── จับคู่ SKU สต๊อกจริงแบบ normalize (ลอกจาก stock.ts — ให้คืน/ตัด ตรงแถวเดียวกัน) ──
type Run = <R = any>(sql: string, p?: any[]) => Promise<R[]>;
const SKU_MATCH = `regexp_replace(lower(product),'[^a-z0-9ก-๙]','','g') = regexp_replace(lower($1),'[^a-z0-9ก-๙]','','g')
   and btrim(lower(size), ' .') = btrim(lower($2), ' .')`;
async function matchStockSku(run: Run, product: string, size: string): Promise<{ product: string; size: string }> {
  const [m] = await run<{ product: string; size: string }>(
    `select product, size from stock where ${SKU_MATCH} order by (product = $1) desc, (size = $2) desc limit 1`,
    [product, size || ""]);
  return m ?? { product, size: size || "" };
}

// ── ดึงรายการเพื่อรับคืน (ต้องส่งแล้วเท่านั้น) ──────────────────────────────
export type ReturnItemPreview = {
  line_no: number; product: string; size: string; qty: number; unit: string;
  is_free: boolean; tracked: boolean; returned: number; remaining: number;
  skus: string[];                   // SKU รายชิ้น (serial) ที่ตัดออกไปกับออเดอร์ (บรรทัดนี้)
};
export type ReturnLookup = {
  ok: boolean; error?: string;
  order_no?: string; doc_no?: string | null; platform?: string | null; receiver?: string | null; shipped_at?: string | null;
  issued?: boolean;                 // ตัดสต๊อกแล้วหรือยัง (ถ้ายัง → คืน "เข้าสต๊อก" ไม่ได้)
  items?: ReturnItemPreview[];
};

export async function lookupOrderForReturn(orderNo: string): Promise<ReturnLookup> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };
  if (!can.handleReturns(user.role)) return { ok: false, error: "ไม่มีสิทธิ์รับคืนสินค้า" };
  const on = (orderNo || "").trim();
  if (!on) return { ok: false, error: "กรอก/สแกน Order No." };

  // จับคู่ด้วย order_no (PK) หรือ doc_no ที่พิมพ์บนใบเบิก (เช่น WPO-26-09-02-0001)
  const ORDER_Q = `select order_no, doc_no, platform, receiver, username, deleted_at, shipped_at, stock_issued_at from orders where order_no = $1 or doc_no = $1 order by (order_no = $1) desc limit 1`;
  type ORow = { order_no: string; doc_no: string | null; platform: string | null; receiver: string | null; username: string | null; deleted_at: string | null; shipped_at: string | null; stock_issued_at: string | null };
  let [o] = await q<ORow>(ORDER_Q, [on]);
  // ไม่เจอเป็น Order No. → ลองตีความว่าเป็น SKU/บาร์โค้ดของขวด (serial ที่ตัดออกไปกับออเดอร์) → หาออเดอร์ให้
  if (!o) {
    const [u] = await q<{ order_no: string | null }>(
      `select order_no from stock_unit where (upper(btrim(sku)) = upper($1) or upper(btrim(coalesce(barcode,''))) = upper($1)) and order_no is not null
         order by (status = 'issued') desc, issued_at desc nulls last limit 1`, [on]).catch(() => []);
    if (u?.order_no) [o] = await q<ORow>(ORDER_Q, [u.order_no]);
  }
  if (!o) return { ok: false, error: `ไม่พบออเดอร์/SKU: ${on}` };
  if (o.deleted_at) return { ok: false, error: "ออเดอร์นี้อยู่ในถังขยะ" };
  if (!o.shipped_at) return { ok: false, error: "รับคืนได้เฉพาะออเดอร์ที่ส่งแล้ว — ยังไม่ส่ง ให้ยกเลิกออเดอร์/ยกเลิกการตัดแทน" };
  const key = o.order_no;   // ใช้ order_no จริงกับ query ถัดไป (เผื่อค้นด้วย doc_no)

  const items = await q<{ line_no: number; product: string; size: string; qty: number; unit: string; is_free: boolean }>(
    `select line_no, product, size, qty::float8 as qty, unit, is_free
     from order_items where order_no = $1 and coalesce(product,'') <> '' order by line_no`, [key]);
  if (items.length === 0) return { ok: false, error: "ออเดอร์นี้ไม่มีรายการสินค้า" };

  // คืนไปแล้วต่อบรรทัด (ไม่นับที่ voided)
  const ret = await q<{ line_no: number; qty: number }>(
    `select line_no, sum(qty)::float8 as qty from order_returns where order_no = $1 and voided_at is null group by line_no`, [key]);
  const retMap = new Map(ret.map((r) => [r.line_no, Number(r.qty)]));

  // SKU รายชิ้น (serial) ที่ยังตัดออกให้ออเดอร์นี้ (status='issued') → จับเข้าบรรทัดตามกลิ่น+ขนาด
  const serialRows = await q<{ sku: string; product: string; size: string }>(
    `select sku, product, size from stock_unit where order_no = $1 and status = 'issued' order by issued_at`, [key]).catch(() => []);
  const nk = (s: string | null) => (s || "").toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");
  const nsz = (s: string | null) => (s || "").toLowerCase().replace(/\s+/g, "").replace(/^\.+|\.+$/g, "");   // ให้ตรงกับ stock.ts/StockIssue ("50 ml"="50ml", เก็บจุด 1.2≠12)
  const serialsByKey = new Map<string, string[]>();
  for (const r of serialRows) {
    const k = nk(r.product) + "|" + nsz(r.size);
    (serialsByKey.get(k) ?? serialsByKey.set(k, []).get(k)!).push(r.sku);
  }

  const out: ReturnItemPreview[] = items.map((it) => {
    const returned = retMap.get(it.line_no) || 0;
    return {
      line_no: it.line_no, product: it.product, size: it.size || "", qty: Number(it.qty), unit: it.unit,
      is_free: it.is_free, tracked: isStockTracked(it.size), returned,
      remaining: Math.max(0, Number(it.qty) - returned),
      skus: serialsByKey.get(nk(it.product) + "|" + nsz(it.size)) || [],
    };
  });
  return { ok: true, order_no: o.order_no, doc_no: o.doc_no, platform: o.platform, receiver: o.receiver || o.username, shipped_at: o.shipped_at, issued: !!o.stock_issued_at, items: out };
}

// ── ยืนยันรับคืน ──────────────────────────────────────────────────────────
export type ReturnEntry = { line_no: number; qty: number; disposition: "restock" | "damaged" | "none" };
export type ReturnResult = { ok: boolean; error?: string; order_no?: string; restocked?: number; damaged?: number; skipped?: number };

export async function confirmReturn(orderNo: string, entries: ReturnEntry[], reason?: string, note?: string): Promise<ReturnResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };
  if (!can.handleReturns(user.role)) return { ok: false, error: "ไม่มีสิทธิ์รับคืนสินค้า" };
  const on = (orderNo || "").trim();
  const picked = (entries || []).filter((e) => Math.abs(Number(e.qty) || 0) > 0);
  if (!on) return { ok: false, error: "กรอก/สแกน Order No." };
  if (!picked.length) return { ok: false, error: "ยังไม่ได้เลือกรายการที่จะคืน" };

  try {
    const out = await tx<ReturnResult>(async (run) => {
      // ล็อกแถว order ตลอด tx (กันรับคืน + ยกเลิกชนกัน)
      const [o] = await run<{ shipped_at: string | null; stock_issued_at: string | null; deleted_at: string | null }>(
        `select shipped_at, stock_issued_at, deleted_at from orders where order_no = $1 for update`, [on]);
      if (!o) throw new Error(`ไม่พบออเดอร์ ${on}`);
      if (o.deleted_at) throw new Error("ออเดอร์นี้ถูกลบแล้ว รับคืนไม่ได้");
      if (!o.shipped_at) throw new Error("รับคืนได้เฉพาะออเดอร์ที่ส่งแล้ว");

      const items = await run<{ line_no: number; product: string; size: string; spec: string | null; qty: number }>(
        `select line_no, product, size, spec, qty::float8 as qty from order_items where order_no = $1 and coalesce(product,'') <> ''`, [on]);
      const itemMap = new Map(items.map((it) => [it.line_no, it]));
      const ret = await run<{ line_no: number; qty: number }>(
        `select line_no, coalesce(sum(qty),0)::float8 as qty from order_returns where order_no = $1 and voided_at is null group by line_no`, [on]);
      const retMap = new Map(ret.map((r) => [r.line_no, Number(r.qty)]));

      let restocked = 0, damaged = 0, skipped = 0;
      const n = (note || "").trim() || null, rsn = (reason || "").trim() || null;
      for (const e of picked) {
        const it = itemMap.get(e.line_no);
        if (!it) throw new Error(`ไม่พบรายการบรรทัด ${e.line_no}`);
        const qty = Math.abs(Number(e.qty));
        const already = retMap.get(e.line_no) || 0;
        if (already + qty > Number(it.qty)) throw new Error(`${it.product}: คืนเกินจำนวนที่ส่ง (ส่ง ${it.qty}, คืนแล้ว ${already})`);
        retMap.set(e.line_no, already + qty);   // สะสมในลูป กันหลาย entry ของ line เดียวกันรวมแล้วเกิน
        const tracked = isStockTracked(it.size);

        if (isBagProduct(it.product)) {
          // ถุงกระดาษ = คลังบรรจุภัณฑ์ (material_item) ไม่ใช่ stock/serial
          if (e.disposition === "restock") { await creditBag(run, it.spec || it.size || "", qty, on, user.id, "return", n || "รับคืนถุง"); restocked += qty; }
          else if (e.disposition === "damaged") { damaged += qty; }   // ถุงชำรุด: ไม่เครดิตกลับ (ของเสีย) · บันทึกประวัติผ่าน order_returns
          else { skipped += qty; }
        } else if (e.disposition === "restock") {
          // ตัวอย่างที่ไม่มี serial จริง (ไม่ track) หรือ 4ml (assign ตอนตัด = serial สร้างสดๆ) คืนเข้าสต๊อกไม่ได้ (กัน serial ผี)
          if (!tracked || assignsSku(it.size)) throw new Error(`${it.product} (${it.size}): ขนาดตัวอย่างคืนเข้าสต๊อกไม่ได้ — ให้เลือก "ชำรุด" หรือ "ไม่นับ"`);
          if (!o.stock_issued_at) throw new Error("ออเดอร์นี้ยังไม่ได้ตัดสต๊อก คืนเข้าสต๊อกไม่ได้ (เลือกชำรุด หรือยกเลิกออเดอร์แทน)");
          const sku = await matchStockSku(run, it.product, it.size || "");
          const [row] = await run<{ qty: number }>(
            `insert into stock (product, size, qty, updated_at) values ($1,$2,$3,now())
             on conflict (product, size) do update set qty = stock.qty + $3, updated_at = now() returning qty::float8 as qty`,
            [sku.product, sku.size, qty]);
          await run(`insert into stock_moves (product, size, qty_change, balance, reason, order_no, note, created_by)
                     values ($1,$2,$3,$4,'return',$5,$6,$7)`, [sku.product, sku.size, qty, row.qty, on, n, user.id]);
          // คืน serial รายชิ้นของขวดที่คืน กลับเป็น in_stock (สูงสุด = จำนวนที่คืน) → serial สมดุลกับยอด
          // เก็บ order_no ไว้ (ไม่ null) → ยกเลิกการคืนจับ serial เดิมของออเดอร์นี้กลับได้ถูกตัว
          await run(
            `update stock_unit set status='in_stock', issued_at=null, issued_by=null
              where sku in (select sku from stock_unit
                where order_no=$1 and status='issued'
                  and regexp_replace(lower(btrim(product)),'[^a-z0-9ก-๙]','','g')=regexp_replace(lower(btrim($2)),'[^a-z0-9ก-๙]','','g')
                  and btrim(lower(size),' .')=btrim(lower($3),' .')
                order by issued_at desc limit $4)`, [on, it.product, it.size || "", Math.round(qty)]);
          restocked += qty;
        } else if (e.disposition === "damaged") {
          const sku = await matchStockSku(run, it.product, it.size || "");
          const [row] = await run<{ qty: number }>(
            `insert into damaged (product, size, qty, updated_at) values ($1,$2,$3,now())
             on conflict (product, size) do update set qty = damaged.qty + $3, updated_at = now() returning qty::float8 as qty`,
            [sku.product, sku.size, qty]);
          await run(`insert into damaged_moves (product, size, qty_change, balance, reason, ref, note, created_by)
                     values ($1,$2,$3,$4,'return',$5,$6,$7)`, [sku.product, sku.size, qty, row.qty, on, n, user.id]);
          // ชำรุด → serial เป็น void (ไม่กลับเข้าคลังขาย · ไม่ถูกนับใน in_stock)
          await run(
            `update stock_unit set status='void'
              where sku in (select sku from stock_unit
                where order_no=$1 and status='issued'
                  and regexp_replace(lower(btrim(product)),'[^a-z0-9ก-๙]','','g')=regexp_replace(lower(btrim($2)),'[^a-z0-9ก-๙]','','g')
                  and btrim(lower(size),' .')=btrim(lower($3),' .')
                order by issued_at desc limit $4)`, [on, it.product, it.size || "", Math.round(qty)]);
          damaged += qty;
        } else {
          // "none" (ไม่นับ) — ของแถม/รายการที่ไม่นับสต๊อก: บันทึกประวัติการคืนเฉยๆ ไม่แตะสต๊อก/ของชำรุด
          skipped += qty;
        }
        await run(`insert into order_returns (order_no, line_no, product, size, qty, disposition, reason, note, created_by)
                   values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [on, e.line_no, it.product, it.size || "", qty, e.disposition, rsn, n, user.id]);
      }

      // อัปเดตสถานะการคืนของออเดอร์ — ไม่นับการคืนแบบ 'none' (ไม่กระทบสต๊อก) เข้าสถานะ (กันบล็อก reverse/unship)
      const [tot] = await run<{ sent: number; returned: number }>(
        `select coalesce((select sum(qty) from order_items where order_no=$1 and coalesce(product,'')<>''),0)::float8 as sent,
                coalesce((select sum(qty) from order_returns where order_no=$1 and voided_at is null and disposition <> 'none'),0)::float8 as returned`, [on]);
      const status = Number(tot.returned) <= 0 ? "none" : Number(tot.returned) >= Number(tot.sent) ? "full" : "partial";
      await run(`update orders set returned_at = coalesce(returned_at, now()), return_status = $2 where order_no = $1`, [on, status]);
      return { ok: true, order_no: on, restocked, damaged, skipped };
    });
    await logActivity("return", `${on} · คืนสต๊อก ${out.restocked} · ชำรุด ${out.damaged}${out.skipped ? ` · ไม่นับ ${out.skipped}` : ""}`);
    revalidatePath("/returns"); revalidatePath("/stock"); revalidatePath("/stock/damaged"); revalidateAllOrderLists(); revalidatePath("/ship/daily");
    return out;
  } catch (e: any) {
    return { ok: false, error: e?.message || "รับคืนไม่สำเร็จ" };
  }
}

// ── ยกเลิก/แก้การคืน (admin/คลัง) — void แถว + ย้อนสต๊อก/ของชำรุด ──────────────
export async function reverseReturn(returnId: number): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };
  if (!can.manageDamaged(user.role)) return { ok: false, error: "เฉพาะผู้ดูแล / ฝ่ายคลัง" };
  try {
    let orderNo = "";
    await tx(async (run) => {
      const [r] = await run<{ id: number; order_no: string; product: string; size: string; qty: number; disposition: string; voided_at: string | null }>(
        `select id, order_no, product, size, qty::float8 as qty, disposition, voided_at from order_returns where id = $1 for update`, [returnId]);
      if (!r) throw new Error("ไม่พบรายการคืน");
      if (r.voided_at) throw new Error("รายการคืนนี้ถูกยกเลิกไปแล้ว");
      orderNo = r.order_no;
      await run(`select 1 from orders where order_no = $1 for update`, [r.order_no]);   // ล็อก order → return_status ไม่เพี้ยนตอนแข่งกับ confirmReturn
      const qty = Number(r.qty);
      if (isBagProduct(r.product)) {
        // ถุงกระดาษ: ยกเลิก "คืนสต๊อก" → หักออกจาก material_item (inverse ของตอนคืน) · ชำรุด/ไม่นับ = ไม่แตะคลัง
        if (r.disposition === "restock") await creditBag(run, r.size || "", -qty, r.order_no, user.id, "adjust", "ยกเลิกการคืนถุง");
      } else if (r.disposition === "restock") {
        const sku = await matchStockSku(run, r.product, r.size || "");
        // ย้อน serial ก่อน: หยิบ in_stock ของกลิ่น/ขนาดนี้ กลับเป็น issued ให้ออเดอร์ (serial เดิมของออเดอร์นี้ก่อน)
        // เท่าที่ยังเหลือ in_stock — บางตัวอาจถูก "ตัด/ขายใหม่" ไปแล้ว (ปล่อย best-effort ตามจริง)
        await run<{ sku: string }>(
          `update stock_unit set status='issued', order_no=$1, issued_at=now(), issued_by=$5
            where sku in (select sku from stock_unit where status='in_stock'
              and regexp_replace(lower(btrim(product)),'[^a-z0-9ก-๙]','','g')=regexp_replace(lower(btrim($2)),'[^a-z0-9ก-๙]','','g')
              and btrim(lower(size),' .')=btrim(lower($3),' .')
            order by (coalesce(order_no,'') = $1) desc, received_at desc limit $4)
            returning sku`, [r.order_no, r.product, r.size || "", Math.round(qty), user.id]);
        // หัก aggregate เต็มจำนวนที่คืน (สมมาตรกับตอน confirmReturn ที่บวก +qty เต็ม) — ยอมให้ติดลบได้ตามนโยบายสต๊อก
        const [row] = await run<{ qty: number }>(
          `update stock set qty = qty - $3, updated_at = now() where product=$1 and size=$2 returning qty::float8 as qty`,
          [sku.product, sku.size, qty]);
        // ลง ledger เฉพาะเมื่อแถวมีอยู่จริง (กัน balance เพี้ยนถ้าแถวถูกลบไปแล้ว)
        if (row) await run(`insert into stock_moves (product, size, qty_change, balance, reason, order_no, note, created_by)
                   values ($1,$2,$3,$4,'adjust',$5,'ยกเลิกการคืน',$6)`, [sku.product, sku.size, -qty, row.qty, r.order_no, user.id]);
      } else if (r.disposition === "damaged") {
        const sku = await matchStockSku(run, r.product, r.size || "");
        const [dmg] = await run<{ qty: number }>(`select qty::float8 as qty from damaged where product=$1 and size=$2 for update`, [sku.product, sku.size]);
        const take = Math.min(qty, Number(dmg?.qty ?? 0));   // กัน damaged ติดลบ (ของชำรุดอาจถูกทำลาย/เคลมไปก่อนแล้ว)
        if (take > 0) {
          const [row] = await run<{ qty: number }>(
            `update damaged set qty = qty - $3, updated_at = now() where product=$1 and size=$2 returning qty::float8 as qty`,
            [sku.product, sku.size, take]);
          if (row) await run(`insert into damaged_moves (product, size, qty_change, balance, reason, ref, note, created_by)
                     values ($1,$2,$3,$4,'writeoff',$5,'ยกเลิกการคืน',$6)`, [sku.product, sku.size, -take, row.qty, r.order_no, user.id]);
        }
        // ย้อน serial: void → issued กลับให้ออเดอร์ (ของที่เคยตีชำรุดตอนคืน กลับมาเป็นตัดออก)
        await run(
          `update stock_unit set status='issued'
            where sku in (select sku from stock_unit where order_no=$1 and status='void'
              and regexp_replace(lower(btrim(product)),'[^a-z0-9ก-๙]','','g')=regexp_replace(lower(btrim($2)),'[^a-z0-9ก-๙]','','g')
              and btrim(lower(size),' .')=btrim(lower($3),' .')
            order by issued_at desc limit $4)`, [r.order_no, r.product, r.size || "", Math.round(qty)]);
      }
      // "none" (ไม่นับ) — ไม่มีผลกับสต๊อก/ของชำรุด แค่ void แถวด้านล่าง
      await run(`update order_returns set voided_at = now() where id = $1`, [returnId]);
      // อัปเดตสถานะออเดอร์ — ไม่นับการคืนแบบ 'none' (สอดคล้องกับ confirmReturn)
      const [tot] = await run<{ sent: number; returned: number }>(
        `select coalesce((select sum(qty) from order_items where order_no=$1 and coalesce(product,'')<>''),0)::float8 as sent,
                coalesce((select sum(qty) from order_returns where order_no=$1 and voided_at is null and disposition <> 'none'),0)::float8 as returned`, [r.order_no]);
      const status = Number(tot.returned) <= 0 ? "none" : Number(tot.returned) >= Number(tot.sent) ? "full" : "partial";
      await run(`update orders set return_status = $2, returned_at = case when $2='none' then null else returned_at end where order_no = $1`, [r.order_no, status]);
    });
    await logActivity("return.reverse", orderNo);
    revalidatePath("/returns"); revalidatePath("/stock"); revalidatePath("/stock/damaged"); revalidateAllOrderLists();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "ยกเลิกการคืนไม่สำเร็จ" };
  }
}

// ── จัดการของชำรุด: ทำลาย / เคลมขนส่ง / ซ่อมคืนสต๊อก ──────────────────────────
export async function disposeDamaged(product: string, size: string, qty: number, action: "writeoff" | "claim" | "repair", note?: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };
  if (!can.manageDamaged(user.role)) return { ok: false, error: "เฉพาะผู้ดูแล / ฝ่ายคลัง" };
  const n = Math.abs(Number(qty) || 0);
  if (!n) return { ok: false, error: "ใส่จำนวน" };
  const nt = (note || "").trim() || null;
  try {
    await tx(async (run) => {
      const [d] = await run<{ qty: number }>(`select qty::float8 as qty from damaged where product=$1 and size=$2 for update`, [product, size || ""]);
      if (!d) throw new Error("ไม่พบของชำรุดรายการนี้");
      if (n > Number(d.qty)) throw new Error(`จำนวนเกินของชำรุดที่มี (เหลือ ${d.qty})`);
      const [row] = await run<{ qty: number }>(
        `update damaged set qty = qty - $3, updated_at = now() where product=$1 and size=$2 returning qty::float8 as qty`, [product, size || "", n]);
      await run(`insert into damaged_moves (product, size, qty_change, balance, reason, note, created_by)
                 values ($1,$2,$3,$4,$5,$6,$7)`, [product, size || "", -n, row.qty, action, nt, user.id]);
      // ซ่อมได้ → คืนกลับสต๊อกขาย
      if (action === "repair") {
        if (needsSerialSku(size)) {
          // ขวดที่มี serial: ต้องปลุก serial ที่เคยตีชำรุด (void) กลับเป็น in_stock — ให้จำนวน serial ตรงกับสต๊อกรวม
          const woke = await run<{ sku: string }>(
            `update stock_unit set status='in_stock', order_no=null, issued_at=null, issued_by=null
              where sku in (select sku from stock_unit where status='void'
                and regexp_replace(lower(btrim(product)),'[^a-z0-9ก-๙]','','g')=regexp_replace(lower(btrim($1)),'[^a-z0-9ก-๙]','','g')
                and btrim(lower(size),' .')=btrim(lower($2),' .')
              order by received_at desc nulls last limit $3)
              returning sku`, [product, size || "", Math.round(n)]);
          if (woke.length < n) throw new Error(`ซ่อมได้ไม่เกินจำนวน serial ที่ตีชำรุดไว้ (มี ${woke.length} ชิ้น) — ตรวจ serial ในคลัง`);
        }
        const [s] = await run<{ qty: number }>(
          `insert into stock (product, size, qty, updated_at) values ($1,$2,$3,now())
           on conflict (product, size) do update set qty = stock.qty + $3, updated_at = now() returning qty::float8 as qty`, [product, size || "", n]);
        await run(`insert into stock_moves (product, size, qty_change, balance, reason, note, created_by)
                   values ($1,$2,$3,$4,'receive','ซ่อมจากของชำรุด',$5)`, [product, size || "", n, s.qty, user.id]);
      }
    });
    await logActivity("damaged.dispose", `${product} ${size} · ${action} ${n}`);
    revalidatePath("/stock/damaged"); revalidatePath("/stock");
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "จัดการของชำรุดไม่สำเร็จ" };
  }
}
