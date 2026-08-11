// Copy local PGlite data (orders + order_items + stock) into the production
// Supabase DB. Reference data (products/sizes/postcodes) is already seeded on prod,
// so we only move the transactional data.
//
// Run with the dev server STOPPED (PGlite is single-writer), from platform-withdrawals/:
//   DATABASE_URL="postgres://postgres.<ref>:<pw>@...pooler.supabase.com:6543/postgres" node scripts/export-to-prod.mjs
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ ตั้ง DATABASE_URL ก่อน เช่น:\n   DATABASE_URL=\"postgres://...6543/postgres\" node scripts/export-to-prod.mjs");
  process.exit(1);
}

const local = new PGlite(".pgdata");
await local.waitReady;
const prod = new pg.Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
await prod.connect();
console.log("✓ connected: local .pgdata + prod Supabase\n");

async function copy(table, cols, conflict, transformRow) {
  const rows = (await local.query(`select ${cols.join(",")} from ${table}`)).rows;
  if (!rows.length) { console.log(`${table}: 0 rows — skip`); return; }
  const CHUNK = 400;
  let done = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK).map(transformRow || ((r) => r));
    const values = [];
    const tuples = slice.map((row) => {
      const ph = cols.map((_, j) => `$${values.length + j + 1}`);
      cols.forEach((c) => values.push(row[c]));
      return `(${ph.join(",")})`;
    });
    await prod.query(`insert into ${table} (${cols.join(",")}) values ${tuples.join(",")} ${conflict}`, values);
    done += slice.length;
    process.stdout.write(`\r${table}: ${done}/${rows.length}`);
  }
  console.log("");
}

const ORDER_COLS = [
  "order_no", "platform", "doc_no", "doc_date", "month_label", "channel", "shop_name",
  "username", "receiver", "phone", "customer_type", "purchase_count", "district",
  "province", "postcode", "address", "campaign", "note", "box_scent", "order_date",
  "created_at", "updated_at",
];
// orders ต้องมาก่อน order_items (FK). reset stock_issued_* ให้ prod เริ่มสแกนตัดสต๊อกใหม่สะอาดๆ
await copy("orders", ORDER_COLS, "on conflict (order_no) do nothing");
await copy("order_items",
  ["order_no", "line_no", "product", "size", "is_free", "qty", "unit", "product_label", "sku"],
  "on conflict do nothing");
await copy("stock",
  ["product", "size", "qty", "updated_at"],
  "on conflict (product, size) do update set qty = excluded.qty, updated_at = excluded.updated_at");

const [o] = (await prod.query("select count(*)::int n from orders")).rows;
const [it] = (await prod.query("select count(*)::int n from order_items")).rows;
const [st] = (await prod.query("select count(*)::int n from stock")).rows;
console.log(`\n✅ prod ตอนนี้: orders ${o.n} · items ${it.n} · stock ${st.n}`);
await prod.end();
await local.close();
