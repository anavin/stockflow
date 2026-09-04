import { describe, it, expect, beforeEach } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// ทดสอบระดับ DB บน schema จริง (supabase/PROD_FULL_SCHEMA.sql) — ล็อก invariant ของโฟลว์สต๊อกที่เสี่ยงสุด
// (4ml assign/consume ตอนตัด, ยกเลิกตัด, และการคืน) ให้แก้โค้ด/schema แล้วจับ regression ได้
const SCHEMA = readFileSync(fileURLToPath(new URL("../supabase/PROD_FULL_SCHEMA.sql", import.meta.url)), "utf8");

let db: PGlite;
beforeEach(async () => {
  db = new PGlite();
  await db.exec(SCHEMA);
});

async function issued(sku: string) {
  return (await db.query<{ status: string; order_no: string | null; assigned_at_issue: boolean }>(
    `select status, order_no, assigned_at_issue from stock_unit where sku = $1`, [sku])).rows[0];
}

describe("ตัดสต๊อก 4ml (assign / consume)", () => {
  it("SKU 4ml ที่ไม่มีในคลัง → assign สร้าง unit issued (mark assigned_at_issue) · ยกเลิก → ลบทิ้ง", async () => {
    // ตัด: assign SKU ใหม่
    await db.query(`insert into stock_unit(sku,product,size,status,order_no,assigned_at_issue,issued_at)
                    values ('N4-1','Nouveau','4 ml','issued','ORD1',true,now())`);
    const u = await issued("N4-1");
    expect(u.status).toBe("issued");
    expect(u.assigned_at_issue).toBe(true);

    // ยกเลิกตัด: ลบเฉพาะ assigned_at_issue, ที่เหลือคืน in_stock (ตรรกะ reverseIssue)
    await db.query(`delete from stock_unit where order_no=$1 and assigned_at_issue=true`, ["ORD1"]);
    await db.query(`update stock_unit set status='in_stock',order_no=null where order_no=$1 and status='issued'`, ["ORD1"]);
    expect(await issued("N4-1")).toBeUndefined();   // ถูกลบ ไม่เหลือ serial ผี
  });

  it("SKU 4ml ที่มีในคลัง → consume (assigned_at_issue=false) · ยกเลิก → คืน in_stock (ไม่ลบของจริง)", async () => {
    await db.query(`insert into stock_unit(sku,product,size,status) values ('BTrial-1','Nouveau','4 ml','in_stock')`);
    // ตัด: consume ของในคลัง
    await db.query(`update stock_unit set status='issued',order_no=$2,issued_at=now() where sku=$1`, ["BTrial-1", "ORD2"]);
    expect((await issued("BTrial-1")).assigned_at_issue).toBe(false);

    // ยกเลิก: assigned_at_issue=false → ไม่ถูกลบ, คืน in_stock
    await db.query(`delete from stock_unit where order_no=$1 and assigned_at_issue=true`, ["ORD2"]);
    await db.query(`update stock_unit set status='in_stock',order_no=null where order_no=$1 and status='issued'`, ["ORD2"]);
    const u = await issued("BTrial-1");
    expect(u.status).toBe("in_stock");
    expect(u.order_no).toBeNull();
  });
});

describe("ยกเลิกการคืน (reverseReturn) — กัน stock ติดลบ", () => {
  it("serial ที่คืนถูกขายใหม่ก่อนยกเลิก → หัก aggregate เท่าที่ย้อนได้จริง (ไม่ติดลบ)", async () => {
    await db.exec(`
      insert into stock(product,size,qty) values ('Rose','30 ml',0);
      insert into stock_unit(sku,product,size,status,order_no) values ('S1','Rose','30 ml','issued','X'),('S2','Rose','30 ml','issued','X');
    `);
    // คืนเข้าคลัง (restock): serial → in_stock, stock += 2
    await db.query(`update stock_unit set status='in_stock' where sku in ('S1','S2')`);
    await db.query(`update stock set qty=qty+2 where product='Rose' and size='30 ml'`);
    // ขายใหม่ให้ Y: serial → issued/Y, stock -= 2 → 0
    await db.query(`update stock_unit set status='issued',order_no='Y' where sku in ('S1','S2')`);
    await db.query(`update stock set qty=qty-2 where product='Rose' and size='30 ml'`);

    // reverseReturn (logic ปัจจุบัน): ย้อน serial in_stock ก่อน แล้วหักเท่าที่ย้อนได้จริง
    const back = (await db.query(
      `update stock_unit set status='issued',order_no='X' where sku in
        (select sku from stock_unit where status='in_stock' and product='Rose' and size='30 ml' limit 2) returning sku`)).rows;
    if (back.length > 0) await db.query(`update stock set qty=qty-$1 where product='Rose' and size='30 ml'`, [back.length]);

    const qty = (await db.query<{ qty: number }>(`select qty::float8 as qty from stock`)).rows[0].qty;
    expect(back.length).toBe(0);   // ไม่เหลือ in_stock ให้ย้อน (ถูกขายใหม่)
    expect(qty).toBe(0);           // สำคัญ: ไม่ติดลบ
  });
});
