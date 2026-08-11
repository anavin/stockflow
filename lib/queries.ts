import "server-only";
import { q } from "./db";
import type { Order, OrderItem, OrderRow, OrderWithItems } from "./types";

/** PGlite returns `date`/`timestamptz` columns as JS Date objects while pg (with
 * our type parsers) returns strings. Normalize date-only fields to "YYYY-MM-DD"
 * strings so the UI + PDF are driver-agnostic. */
function dstr(v: any): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) {
    const y = v.getFullYear(), m = String(v.getMonth() + 1).padStart(2, "0"), d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(v).slice(0, 10);
}
function normOrder<T extends Partial<Order>>(o: T): T {
  return { ...o, doc_date: dstr(o.doc_date), order_date: dstr(o.order_date) };
}

// ---- reference data (for dropdowns) ---------------------------------------
export async function getProducts(): Promise<string[]> {
  const rows = await q<{ name: string }>(`select name from products where active order by sort, name`);
  return rows.map((r) => r.name);
}

export async function getSizes(): Promise<string[]> {
  const rows = await q<{ label: string }>(`select label from sizes order by sort, label`);
  return rows.map((r) => r.label);
}

export type PostcodeRow = { province: string; district: string; postcode: string };
export async function getPostcodes(): Promise<PostcodeRow[]> {
  return q<PostcodeRow>(`select province, district, postcode from postcodes order by province, district`);
}

export async function getProvinces(): Promise<string[]> {
  const rows = await q<{ province: string }>(`select distinct province from postcodes order by province`);
  return rows.map((r) => r.province);
}

// ---- orders ----------------------------------------------------------------
export async function listOrders(opts: { platform?: string; search?: string; month?: string; limit?: number; offset?: number } = {}): Promise<OrderRow[]> {
  const where: string[] = ["o.deleted_at is null"];
  const params: any[] = [];
  if (opts.platform) { params.push(opts.platform); where.push(`o.platform = $${params.length}`); }
  if (opts.month) { params.push(opts.month); where.push(`o.month_label = $${params.length}`); }
  if (opts.search) {
    params.push(`%${opts.search}%`);
    const p = `$${params.length}`;
    where.push(`(o.order_no ilike ${p} or o.doc_no ilike ${p} or o.receiver ilike ${p} or o.username ilike ${p} or o.shop_name ilike ${p} or o.province ilike ${p})`);
  }
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const sql = `
    select o.*,
           coalesce(count(i.id), 0)::int as item_count,
           coalesce(sum(i.qty), 0)::float8 as total_qty
    from orders o
    left join order_items i on i.order_no = o.order_no
    ${where.length ? "where " + where.join(" and ") : ""}
    group by o.order_no
    order by o.doc_date desc nulls last, o.created_at desc
    limit ${limit} offset ${offset}`;
  const rows = await q<OrderRow>(sql, params);
  return rows.map(normOrder);
}

export async function countOrders(opts: { platform?: string; search?: string; month?: string } = {}): Promise<number> {
  const where: string[] = ["deleted_at is null"];
  const params: any[] = [];
  if (opts.platform) { params.push(opts.platform); where.push(`platform = $${params.length}`); }
  if (opts.month) { params.push(opts.month); where.push(`month_label = $${params.length}`); }
  if (opts.search) {
    params.push(`%${opts.search}%`);
    const p = `$${params.length}`;
    // ต้องตรงกับ listOrders เป๊ะ (รวม province) ไม่งั้น total/หน้าเพจเพี้ยน
    where.push(`(order_no ilike ${p} or doc_no ilike ${p} or receiver ilike ${p} or username ilike ${p} or shop_name ilike ${p} or province ilike ${p})`);
  }
  const [r] = await q<{ n: number }>(`select count(*)::int n from orders ${where.length ? "where " + where.join(" and ") : ""}`, params);
  return r?.n ?? 0;
}

export async function listDeletedOrders(platform = "Shopee", limit = 200): Promise<OrderRow[]> {
  const rows = await q<OrderRow>(
    `select o.*, coalesce(count(i.id),0)::int as item_count, coalesce(sum(i.qty),0)::float8 as total_qty
     from orders o left join order_items i on i.order_no = o.order_no
     where o.platform = $1 and o.deleted_at is not null
     group by o.order_no
     order by o.deleted_at desc
     limit ${Math.min(limit, 500)}`,
    [platform],
  );
  return rows.map(normOrder);
}

export async function countDeleted(platform = "Shopee"): Promise<number> {
  const [r] = await q<{ n: number }>(`select count(*)::int n from orders where platform = $1 and deleted_at is not null`, [platform]);
  return r?.n ?? 0;
}

export async function getOrder(orderNo: string, opts: { includeDeleted?: boolean } = {}): Promise<OrderWithItems | null> {
  const [order] = await q<Order>(
    `select * from orders where order_no = $1 ${opts.includeDeleted ? "" : "and deleted_at is null"}`,
    [orderNo],
  );
  if (!order) return null;
  const items = await q<OrderItem>(
    `select id, line_no, product, size, is_free, qty::float8 as qty, unit, product_label, sku
     from order_items where order_no = $1 order by line_no, id`,
    [orderNo],
  );
  return { ...normOrder(order), items };
}

// ---- stock -----------------------------------------------------------------
export type StockRow = { product: string; size: string; qty: number; updated_at: string | null };
export async function listStock(opts: { search?: string; lowOnly?: boolean; threshold?: number; limit?: number } = {}): Promise<StockRow[]> {
  const params: any[] = [];
  const where: string[] = [];
  if (opts.search) { params.push(`%${opts.search}%`); where.push(`ps.product ilike $${params.length}`); }
  const th = opts.threshold ?? 10;
  const having = opts.lowOnly ? `where coalesce(s.qty,0) <= ${th}` : "";
  const limit = Math.min(opts.limit ?? 1000, 5000);
  // ทุก SKU ที่เคยมี (จาก stock ∪ รายการในใบเบิก) + ยอดปัจจุบัน
  const sql = `
    select ps.product, ps.size, coalesce(s.qty,0)::float8 as qty, s.updated_at
    from (
      select distinct oi.product, oi.size from order_items oi
        join orders o on o.order_no = oi.order_no
        where o.deleted_at is null and coalesce(oi.product,'') <> '' and coalesce(oi.size,'') <> ''
      union
      select product, size from stock
    ) ps
    left join stock s on s.product = ps.product and s.size = ps.size
    ${where.length ? "where " + where.join(" and ") : ""}
    ${opts.lowOnly ? (where.length ? `and s.qty is not null and s.qty <= ${th}` : `where s.qty is not null and s.qty <= ${th}`) : ""}
    order by coalesce(s.qty,0) asc, ps.product, ps.size
    limit ${limit}`;
  return q<StockRow>(sql, params);
}

export type StockMoveRow = { id: number; product: string; size: string; qty_change: number; balance: number | null; reason: string; order_no: string | null; note: string | null; created_at: string; by_name: string | null };
export async function getStockMoves(opts: { orderNo?: string; product?: string; size?: string; limit?: number } = {}): Promise<StockMoveRow[]> {
  const params: any[] = [];
  const where: string[] = [];
  if (opts.orderNo) { params.push(opts.orderNo); where.push(`m.order_no = $${params.length}`); }
  if (opts.product) { params.push(opts.product); where.push(`m.product = $${params.length}`); }
  if (opts.size) { params.push(opts.size); where.push(`m.size = $${params.length}`); }
  const limit = Math.min(opts.limit ?? 200, 1000);
  return q<StockMoveRow>(
    `select m.id, m.product, m.size, m.qty_change::float8 as qty_change, m.balance::float8 as balance,
            m.reason, m.order_no, m.note, m.created_at,
            coalesce(nullif(u.full_name,''), u.username) as by_name
     from stock_moves m left join users u on u.id = m.created_by
     ${where.length ? "where " + where.join(" and ") : ""}
     order by m.created_at desc, m.id desc limit ${limit}`,
    params,
  );
}

/** Order + items with current stock level per item (สำหรับหน้า preview ก่อนตัดสต๊อก). */
export async function getOrderWithStock(orderNo: string): Promise<(OrderWithItems & { stock_issued_at: string | null; itemsStock: (OrderItem & { stock: number })[] }) | null> {
  const order = await getOrder(orderNo);
  if (!order) return null;
  const [meta] = await q<{ stock_issued_at: string | null }>(`select stock_issued_at from orders where order_no = $1`, [orderNo]);
  const itemsStock = await Promise.all(order.items.map(async (it) => {
    // จับคู่แบบ normalize (keep อักษรไทย) ให้ตรงกับตอนตัดสต๊อกจริง (matchStockProduct)
    // ไม่งั้น preview โชว์ 0 ทั้งที่ตัดจริงไปเจอ SKU ที่สะกดต่างเล็กน้อย
    const [s] = await q<{ qty: number }>(
      `select qty::float8 as qty from stock
       where size = $2 and regexp_replace(lower(product),'[^a-z0-9ก-๙]','','g') = regexp_replace(lower($1),'[^a-z0-9ก-๙]','','g')
       order by (product = $1) desc limit 1`,
      [it.product, it.size],
    );
    return { ...it, stock: s?.qty ?? 0 };
  }));
  return { ...order, stock_issued_at: meta?.stock_issued_at ?? null, itemsStock };
}

export type IssuedOrderRow = { order_no: string; doc_no: string | null; receiver: string | null; province: string | null; item_count: number; total_qty: number; stock_issued_at: string; issued_by: string | null };
export async function listIssuedOrders(opts: { search?: string; limit?: number } = {}): Promise<IssuedOrderRow[]> {
  const params: any[] = [];
  const where: string[] = ["o.stock_issued_at is not null"];
  if (opts.search) {
    params.push(`%${opts.search}%`);
    const p = `$${params.length}`;
    where.push(`(o.order_no ilike ${p} or o.doc_no ilike ${p} or o.receiver ilike ${p})`);
  }
  const limit = Math.min(opts.limit ?? 100, 500);
  return q<IssuedOrderRow>(
    `select o.order_no, o.doc_no, o.receiver, o.province, o.stock_issued_at,
            coalesce(count(i.id),0)::int as item_count, coalesce(sum(i.qty),0)::float8 as total_qty,
            coalesce(nullif(u.full_name,''), u.username) as issued_by
     from orders o
     left join order_items i on i.order_no = o.order_no
     left join users u on u.id = o.stock_issued_by
     where ${where.join(" and ")}
     group by o.order_no, u.full_name, u.username
     order by o.stock_issued_at desc
     limit ${limit}`,
    params,
  );
}

export type DashStats = {
  ordersTotal: number; ordersToday: number; ordersMonth: number;
  issuedTotal: number; issuedToday: number; pendingIssue: number;
  skus: number; low: number; negative: number;
};
export async function dashboardStats(): Promise<DashStats> {
  // ทำเป็น query เดียว (scalar subqueries) แทน 8 query ขนาน — ลดจำนวน connection
  // ที่เปิดพร้อมกันบน Workers/Hyperdrive (เปิดหลาย connection พร้อมกันเคยทำให้ค้าง).
  // สุขภาพสต๊อก อิงเฉพาะ SKU ที่ track จริง (ตาราง stock): ปกติ(>10)+ต้องเติม(0..10)+ติดลบ(<0)=skus
  const [r] = await q<DashStats & { pendingIssue?: number }>(
    `select
       (select count(*)::int from orders where deleted_at is null) as "ordersTotal",
       (select count(*)::int from orders where deleted_at is null and doc_date = current_date) as "ordersToday",
       (select count(*)::int from orders where deleted_at is null and to_char(doc_date,'YYYY-MM') = to_char(current_date,'YYYY-MM')) as "ordersMonth",
       (select count(*)::int from orders where deleted_at is null and stock_issued_at is not null) as "issuedTotal",
       (select count(*)::int from orders where deleted_at is null and stock_issued_at::date = current_date) as "issuedToday",
       (select count(*)::int from stock) as skus,
       (select count(*)::int from stock where qty >= 0 and qty <= 10) as low,
       (select count(*)::int from stock where qty < 0) as negative`,
  );
  const s = r ?? ({} as DashStats);
  const ordersTotal = s.ordersTotal ?? 0, issuedTotal = s.issuedTotal ?? 0;
  return {
    ordersTotal, ordersToday: s.ordersToday ?? 0, ordersMonth: s.ordersMonth ?? 0,
    issuedTotal, issuedToday: s.issuedToday ?? 0, pendingIssue: ordersTotal - issuedTotal,
    skus: s.skus ?? 0, low: s.low ?? 0, negative: s.negative ?? 0,
  };
}

/** กลิ่นที่เบิกมากสุด (ผลรวมจำนวนจากใบเบิกที่ยังไม่ลบ) — สำหรับกราฟบนหน้าภาพรวม */
export type TopProduct = { product: string; qty: number };
export async function topProducts(limit = 6): Promise<TopProduct[]> {
  const lim = Math.min(Math.max(1, limit), 500);
  return q<TopProduct>(
    `select oi.product, sum(oi.qty)::float8 as qty
     from order_items oi join orders o on o.order_no = oi.order_no
     where o.deleted_at is null and coalesce(oi.product,'') <> ''
     group by oi.product order by qty desc limit ${lim}`,
  );
}

/** จำนวนใบเบิกต่อเดือน (ล่าสุด N เดือน) — สำหรับ mini bar chart หน้าภาพรวม */
export type MonthPoint = { ym: string; label: string; n: number };
export async function ordersTrend(months = 6): Promise<MonthPoint[]> {
  const m = Math.min(Math.max(1, months), 24);
  const rows = await q<{ ym: string; n: number }>(
    `select to_char(date_trunc('month', doc_date),'YYYY-MM') as ym, count(*)::int as n
     from orders where deleted_at is null and doc_date is not null
     group by 1 order by 1 desc limit ${m}`,
  );
  const TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return rows
    .map((r) => {
      const mm = Number((r.ym || "").slice(5, 7));
      const yy = (r.ym || "").slice(2, 4);
      return { ym: r.ym, label: `${TH[mm - 1] ?? r.ym}${yy}`, n: r.n };
    })
    .reverse(); // เก่า→ใหม่ สำหรับวาดกราฟ
}

export async function stockSummary(): Promise<{ skus: number; low: number; issuedOrders: number }> {
  const [a] = await q<{ n: number }>(`select count(*)::int n from (select distinct oi.product, oi.size from order_items oi join orders o on o.order_no=oi.order_no where o.deleted_at is null and coalesce(oi.product,'')<>'' union select product,size from stock) t`);
  const [b] = await q<{ n: number }>(`select count(*)::int n from stock where qty <= 10`);
  const [c] = await q<{ n: number }>(`select count(*)::int n from orders where deleted_at is null and stock_issued_at is not null`);
  return { skus: a?.n ?? 0, low: b?.n ?? 0, issuedOrders: c?.n ?? 0 };
}

export type UserRow = { id: number; username: string; full_name: string; role: string; is_active: boolean; last_login_at: string | null; created_at: string };
export async function listUsers(): Promise<UserRow[]> {
  return q<UserRow>(`select id, username, full_name, role, is_active, last_login_at, created_at from users order by id`);
}

/** Distinct month labels present, newest first (for the filter dropdown). */
export async function getMonths(platform?: string): Promise<string[]> {
  const rows = await q<{ month_label: string; d: string }>(
    `select month_label, max(doc_date) d from orders
     where month_label is not null ${platform ? "and platform = $1" : ""}
     group by month_label order by d desc nulls last`,
    platform ? [platform] : [],
  );
  return rows.map((r) => r.month_label);
}
