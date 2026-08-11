// One-off: load current stock levels (from Lab Stock&Seller Data Monitoring xlsx,
// parsed to JSON) into the local PGlite stock table. Run with dev server STOPPED.
//   node scripts/import-stock.mjs /tmp/stock-current.json
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";

const jsonPath = process.argv[2] || "/tmp/stock-current.json";
const rows = JSON.parse(await readFile(jsonPath, "utf8"));
console.log(`loaded ${rows.length} stock rows`);

const db = new PGlite(".pgdata");
await db.waitReady;

let n = 0;
for (const r of rows) {
  const product = String(r.product).trim();
  const size = String(r.size).trim();
  const qty = Number(r.qty) || 0;
  await db.query(
    `insert into stock (product, size, qty, updated_at) values ($1,$2,$3,now())
     on conflict (product, size) do update set qty = $3, updated_at = now()`,
    [product, size, qty],
  );
  await db.query(
    `insert into stock_moves (product, size, qty_change, balance, reason, note)
     values ($1,$2,$3,$3,'receive','ยอดยกมาจากไฟล์สต๊อก')`,
    [product, size, qty],
  );
  n++;
}
const [{ s }] = (await db.query("select count(*)::int s from stock")).rows;
console.log(`✓ done — stock rows: ${s}`);
await db.close();
