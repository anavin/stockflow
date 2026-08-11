// One-off: bulk-load the original Shopee data (parsed from รายการเบิกสินค้า TOUCH-2.xlsx)
// into the local PGlite DB. Run with the dev server STOPPED (single-writer).
//   node scripts/import-original.mjs /tmp/shopee-orders.json
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

const jsonPath = process.argv[2] || "/tmp/shopee-orders.json";
const orders = JSON.parse(await readFile(jsonPath, "utf8"));
console.log(`loaded ${orders.length} orders from ${jsonPath}`);

// Historical data has a few reused เลขที่ใบเบิก (doc_no). doc_no is UNIQUE in the
// schema, so disambiguate duplicates by appending a short suffix (keeps them
// visible/traceable instead of dropping the number).
{
  const seen = new Map();
  let fixed = 0;
  for (const o of orders) {
    if (!o.doc_no) continue;
    const n = (seen.get(o.doc_no) || 0) + 1;
    seen.set(o.doc_no, n);
    if (n > 1) { o.doc_no = `${o.doc_no}-${n}`; fixed++; }
  }
  if (fixed) console.log(`disambiguated ${fixed} duplicate doc_no`);
}

const db = new PGlite(".pgdata");
await db.waitReady;

async function batchInsert(table, cols, rows, onConflict = "") {
  if (!rows.length) return;
  const CHUNK = 400;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    const values = [];
    const tuples = slice.map((row) => {
      const ph = row.map((_, j) => `$${values.length + j + 1}`);
      values.push(...row);
      return `(${ph.join(",")})`;
    });
    await db.query(`insert into ${table} (${cols.join(",")}) values ${tuples.join(",")} ${onConflict}`, values);
  }
}

console.log("truncating existing orders…");
await db.query("truncate table order_items, orders restart identity cascade");

const OCOLS = ["order_no","platform","doc_no","doc_date","month_label","channel","shop_name","username","receiver","phone","customer_type","purchase_count","district","province","postcode","address","campaign","note","box_scent","order_date"];
const orderRows = orders.map((o) => [o.order_no,o.platform,o.doc_no,o.doc_date,o.month_label,o.channel,o.shop_name,o.username,o.receiver,o.phone,o.customer_type,o.purchase_count,o.district,o.province,o.postcode,o.address,o.campaign,o.note,o.box_scent,o.order_date]);
console.log("inserting orders…");
await batchInsert("orders", OCOLS, orderRows, "on conflict (order_no) do nothing");

const ICOLS = ["order_no","line_no","product","size","is_free","qty","unit","product_label","sku"];
const itemRows = [];
for (const o of orders) o.items.forEach((it, idx) => itemRows.push([o.order_no, idx + 1, it.product, it.size, it.is_free, it.qty, it.unit, it.product_label, it.sku]));
console.log(`inserting ${itemRows.length} items…`);
await batchInsert("order_items", ICOLS, itemRows);

// sync counters so new doc numbers won't collide with imported ones
console.log("syncing counters…");
await db.query(`
  insert into counters (platform, ymd, seq)
  select platform,
         replace(substr(doc_no, 4, 8), '-', '') as ymd,
         max(nullif(regexp_replace(doc_no, '^.*-', ''), '')::int) as seq
  from orders
  where doc_no ~ '^[A-Z]+-[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]+$'
  group by platform, replace(substr(doc_no, 4, 8), '-', '')
  on conflict (platform, ymd) do update set seq = greatest(counters.seq, excluded.seq)
`);

const [{ o }] = (await db.query("select count(*)::int o from orders")).rows;
const [{ n }] = (await db.query("select count(*)::int n from order_items")).rows;
console.log(`✓ done — orders: ${o}, items: ${n}`);
await db.close();
