// สร้างไฟล์ SQL สำหรับตั้ง Supabase staging ให้เหมือน dev (schema + seed)
// รัน: node scripts/gen-staging-sql.mjs → ได้ไฟล์ใน supabase/STAGING_*.sql
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const MIG = path.join(ROOT, "migrations");
const SEED = path.join(ROOT, "seed");
const OUT = path.join(ROOT, "supabase");

const q = (v) => (v == null ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const n = (v) => (v == null || v === "" ? "null" : Number(v));
const loadSeed = async (name) => JSON.parse(await readFile(path.join(SEED, `${name}.json`), "utf8"));

function insertSql(table, cols, rows, valOf) {
  if (!rows.length) return `-- (ไม่มีข้อมูล ${table})\n`;
  const CH = 500;
  let out = "";
  for (let i = 0; i < rows.length; i += CH) {
    const tuples = rows.slice(i, i + CH).map((r) => `(${valOf(r).join(",")})`).join(",\n  ");
    out += `insert into ${table} (${cols.join(",")}) values\n  ${tuples}\non conflict do nothing;\n`;
  }
  return out;
}

// 1) schema = migrations ทั้งหมดตามลำดับ (idempotent)
const migFiles = (await readdir(MIG)).filter((f) => f.endsWith(".sql")).sort();
let schema = `-- ==== STAGING/PROD schema — รวม migrations ทั้งหมด (idempotent รันซ้ำได้) ====\n-- อัปเดตอัตโนมัติจาก migrations/ โดย scripts/gen-staging-sql.mjs\n\n`;
for (const f of migFiles) schema += `-- ---- ${f} ----\n${await readFile(path.join(MIG, f), "utf8")}\n\n`;
await writeFile(path.join(OUT, "STAGING_1_schema.sql"), schema);

// 2) seed หลัก (platforms/products/sizes/postcodes) — พอดี limit SQL editor
const platforms = await loadSeed("platforms");
const products = await loadSeed("products");
const sizes = await loadSeed("sizes");
const postcodes = await loadSeed("postcodes");
let seed = `-- ==== STAGING seed — ข้อมูลตั้งต้น (แพลตฟอร์ม/กลิ่น/ขนาด/รหัสไปรษณีย์) ====\n\n`;
seed += insertSql("platforms", ["code", "name", "prefix", "sort"], platforms, (p) => [q(p.code), q(p.name), q(p.prefix), n(p.sort)]);
seed += "\n" + insertSql("products", ["name", "sort"], products, (p) => [q(p.name), n(p.sort ?? 0)]);
seed += "\n" + insertSql("sizes", ["label", "ml", "sort"], sizes, (s) => [q(s.label), n(s.ml), n(s.sort)]);
seed += "\n" + insertSql("postcodes", ["province", "district", "postcode"], postcodes, (p) => [q(p.province), q(p.district), q(p.postcode)]);
await writeFile(path.join(OUT, "STAGING_2_seed.sql"), seed);

// 3) thai_postcodes (ตำบลทั้งประเทศ ~1MB) — แยกไฟล์ รันผ่าน psql (ใหญ่เกิน SQL editor)
const thai = await loadSeed("thai_postcodes");
const thaiSql = `-- ==== STAGING seed — ตำบลทั้งประเทศ (address auto-fill) · ใหญ่เกิน SQL editor → รันผ่าน psql ====\n\n`
  + insertSql("thai_postcodes", ["province", "district", "subdistrict", "postcode"], thai, (r) => [q(r.province), q(r.district), q(r.subdistrict), q(r.postcode)]);
await writeFile(path.join(OUT, "STAGING_3_thai_postcodes.sql"), thaiSql);

console.log(`✓ supabase/STAGING_1_schema.sql        (${migFiles.length} migrations)`);
console.log(`✓ supabase/STAGING_2_seed.sql          (platforms ${platforms.length} · products ${products.length} · sizes ${sizes.length} · postcodes ${postcodes.length})`);
console.log(`✓ supabase/STAGING_3_thai_postcodes.sql (${thai.length} ตำบล — รันผ่าน psql)`);
