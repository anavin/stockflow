"use server";
import { revalidatePath } from "next/cache";
import { q, tx } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { logActivity } from "@/lib/activity";
import { isStockTracked } from "@/lib/config";

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
};
export type ReturnLookup = {
  ok: boolean; error?: string;
  order_no?: string; doc_no?: string | null; receiver?: string | null; shipped_at?: string | null;
  issued?: boolean;                 // ตัดสต๊อกแล้วหรือยัง (ถ้ายัง → คืน "เข้าสต๊อก" ไม่ได้)
  items?: ReturnItemPreview[];
};

export async function lookupOrderForReturn(orderNo: string): Promise<ReturnLookup> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "กรุณาเข้าสู่ระบบ" };
  if (!can.handleReturns(user.role)) return { ok: false, error: "ไม่มีสิทธิ์รับคืนสินค้า" };
  const on = (orderNo || "").trim();
  if (!on) return { ok: false, error: "กรอก/สแกน Order No." };

  const [o] = await q<{ order_no: string; doc_no: string | null; receiver: string | null; username: string | null; deleted_at: string | null; shipped_at: string | null; stock_issued_at: string | null }>(
    `select order_no, doc_no, receiver, username, deleted_at, shipped_at, stock_issued_at from orders where order_no = $1`, [on]);
  if (!o) return { ok: false, error: `ไม่พบออเดอร์ ${on}` };
  if (o.deleted_at) return { ok: false, error: "ออเดอร์นี้อยู่ในถังขยะ" };
  if (!o.shipped_at) return { ok: false, error: "รับคืนได้เฉพาะออเดอร์ที่ส่งแล้ว — ยังไม่ส่ง ให้ยกเลิกออเดอร์/ยกเลิกการตัดแทน" };

  const items = await q<{ line_no: number; product: string; size: string; qty: number; unit: string; is_free: boolean }>(
    `select line_no, product, size, qty::float8 as qty, unit, is_free
     from order_items where order_no = $1 and coalesce(product,'') <> '' order by line_no`, [on]);
  if (items.length === 0) return { ok: false, error: "ออเดอร์นี้ไม่มีรายการสินค้า" };

  // คืนไปแล้วต่อบรรทัด (ไม่นับที่ voided)
  const ret = await q<{ line_no: number; qty: number }>(
    `select line_no, sum(qty)::float8 as qty from order_returns where order_no = $1 and voided_at is null group by line_no`, [on]);
  const retMap = new Map(ret.map((r) => [r.line_no, Number(r.qty)]));

  const out: ReturnItemPreview[] = items.map((it) => {
    const returned = retMap.get(it.line_no) || 0;
    return {
      line_no: it.line_no, product: it.product, size: it.size || "", qty: Number(it.qty), unit: it.unit,
      is_free: it.is_free, tracked: isStockTracked(it.size), returned,
      remaining: Math.max(0, Number(it.qty) - returned),
    };
  });
  return { ok: true, order_no: o.order_no, doc_no: o.doc_no, receiver: o.receiver || o.username, shipped_at: o.shipped_at, issued: !!o.stock_issued_at, items: out };
}

// ── ยืนยันรับคืน ──────────────────────────────────────────────────────────
export type ReturnEntry = { line_no: number; qty: number; disposition: "restock" | "damaged" };
export type ReturnResult = { ok: boolean; error?: string; order_no?: string; restocked?: number; damaged?: number };

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
      const [o] = await run<{ shipped_at: string | null; stock_issued_at: string | null }>(
        `select shipped_at, stock_issued_at from orders where order_no = $1 for update`, [on]);
      if (!o) throw new Error(`ไม่พบออเดอร์ ${on}`);
      if (!o.shipped_at) throw new Error("รับคืนได้เฉพาะออเดอร์ที่ส่งแล้ว");

      const items = await run<{ line_no: number; product: string; size: string; qty: number }>(
        `select line_no, product, size, qty::float8 as qty from order_items where order_no = $1 and coalesce(product,'') <> ''`, [on]);
      const itemMap = new Map(items.map((it) => [it.line_no, it]));
      const ret = await run<{ line_no: number; qty: number }>(
        `select line_no, coalesce(sum(qty),0)::float8 as qty from order_returns where order_no = $1 and voided_at is null group by line_no`, [on]);
      const retMap = new Map(ret.map((r) => [r.line_no, Number(r.qty)]));

      let restocked = 0, damaged = 0;
      const n = (note || "").trim() || null, rsn = (reason || "").trim() || null;
      for (const e of picked) {
        const it = itemMap.get(e.line_no);
        if (!it) throw new Error(`ไม่พบรายการบรรทัด ${e.line_no}`);
        const qty = Math.abs(Number(e.qty));
        const already = retMap.get(e.line_no) || 0;
        if (already + qty > Number(it.qty)) throw new Error(`${it.product}: คืนเกินจำนวนที่ส่ง (ส่ง ${it.qty}, คืนแล้ว ${already})`);
        retMap.set(e.line_no, already + qty);   // สะสมในลูป กันหลาย entry ของ line เดียวกันรวมแล้วเกิน
        const tracked = isStockTracked(it.size);

        if (e.disposition === "restock") {
          if (!tracked) throw new Error(`${it.product} (${it.size}): ขนาดตัวอย่างคืนเข้าสต๊อกไม่ได้ — ให้เลือก "ชำรุด"`);
          if (!o.stock_issued_at) throw new Error("ออเดอร์นี้ยังไม่ได้ตัดสต๊อก คืนเข้าสต๊อกไม่ได้ (เลือกชำรุด หรือยกเลิกออเดอร์แทน)");
          const sku = await matchStockSku(run, it.product, it.size || "");
          const [row] = await run<{ qty: number }>(
            `insert into stock (product, size, qty, updated_at) values ($1,$2,$3,now())
             on conflict (product, size) do update set qty = stock.qty + $3, updated_at = now() returning qty::float8 as qty`,
            [sku.product, sku.size, qty]);
          await run(`insert into stock_moves (product, size, qty_change, balance, reason, order_no, note, created_by)
                     values ($1,$2,$3,$4,'return',$5,$6,$7)`, [sku.product, sku.size, qty, row.qty, on, n, user.id]);
          restocked += qty;
        } else {
          const sku = await matchStockSku(run, it.product, it.size || "");
          const [row] = await run<{ qty: number }>(
            `insert into damaged (product, size, qty, updated_at) values ($1,$2,$3,now())
             on conflict (product, size) do update set qty = damaged.qty + $3, updated_at = now() returning qty::float8 as qty`,
            [sku.product, sku.size, qty]);
          await run(`insert into damaged_moves (product, size, qty_change, balance, reason, ref, note, created_by)
                     values ($1,$2,$3,$4,'return',$5,$6,$7)`, [sku.product, sku.size, qty, row.qty, on, n, user.id]);
          damaged += qty;
        }
        await run(`insert into order_returns (order_no, line_no, product, size, qty, disposition, reason, note, created_by)
                   values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [on, e.line_no, it.product, it.size || "", qty, e.disposition, rsn, n, user.id]);
      }

      // อัปเดตสถานะการคืนของออเดอร์
      const [tot] = await run<{ sent: number; returned: number }>(
        `select coalesce((select sum(qty) from order_items where order_no=$1 and coalesce(product,'')<>''),0)::float8 as sent,
                coalesce((select sum(qty) from order_returns where order_no=$1 and voided_at is null),0)::float8 as returned`, [on]);
      const status = Number(tot.returned) <= 0 ? "none" : Number(tot.returned) >= Number(tot.sent) ? "full" : "partial";
      await run(`update orders set returned_at = coalesce(returned_at, now()), return_status = $2 where order_no = $1`, [on, status]);
      return { ok: true, order_no: on, restocked, damaged };
    });
    await logActivity("return", `${on} · คืนสต๊อก ${out.restocked} · ชำรุด ${out.damaged}`);
    revalidatePath("/returns"); revalidatePath("/stock"); revalidatePath("/stock/damaged"); revalidatePath("/shopee"); revalidatePath("/ship/daily");
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
      const sku = await matchStockSku(run, r.product, r.size || "");
      if (r.disposition === "restock") {
        const [row] = await run<{ qty: number }>(
          `update stock set qty = qty - $3, updated_at = now() where product=$1 and size=$2 returning qty::float8 as qty`,
          [sku.product, sku.size, qty]);
        await run(`insert into stock_moves (product, size, qty_change, balance, reason, order_no, note, created_by)
                   values ($1,$2,$3,$4,'adjust',$5,'ยกเลิกการคืน',$6)`, [sku.product, sku.size, -qty, row?.qty ?? 0, r.order_no, user.id]);
      } else {
        const [row] = await run<{ qty: number }>(
          `update damaged set qty = qty - $3, updated_at = now() where product=$1 and size=$2 returning qty::float8 as qty`,
          [sku.product, sku.size, qty]);
        await run(`insert into damaged_moves (product, size, qty_change, balance, reason, ref, note, created_by)
                   values ($1,$2,$3,$4,'writeoff',$5,'ยกเลิกการคืน',$6)`, [sku.product, sku.size, -qty, row?.qty ?? 0, r.order_no, user.id]);
      }
      await run(`update order_returns set voided_at = now() where id = $1`, [returnId]);
      // อัปเดตสถานะออเดอร์
      const [tot] = await run<{ sent: number; returned: number }>(
        `select coalesce((select sum(qty) from order_items where order_no=$1 and coalesce(product,'')<>''),0)::float8 as sent,
                coalesce((select sum(qty) from order_returns where order_no=$1 and voided_at is null),0)::float8 as returned`, [r.order_no]);
      const status = Number(tot.returned) <= 0 ? "none" : Number(tot.returned) >= Number(tot.sent) ? "full" : "partial";
      await run(`update orders set return_status = $2, returned_at = case when $2='none' then null else returned_at end where order_no = $1`, [r.order_no, status]);
    });
    await logActivity("return.reverse", orderNo);
    revalidatePath("/returns"); revalidatePath("/stock"); revalidatePath("/stock/damaged"); revalidatePath("/shopee");
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
