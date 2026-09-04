// สร้าง migrations/0045_wholesale_tables.sql — ตาราง wholesale_catalog + wholesale_branch
// + seed จากข้อมูลปัจจุบัน (lib/eveandboy-data.ts, lib/kingpower-data.ts) เพื่อย้ายเข้า DB โดยไม่หาย
// รัน: node --experimental-strip-types scripts/gen-wholesale-migration.mjs
import { writeFileSync } from "node:fs";
import { EVEANDBOY_BY_KEY, EVEANDBOY_BRANCHES } from "../lib/eveandboy-data.ts";
import { KINGPOWER_BY_KEY } from "../lib/kingpower-data.ts";

const sq = (v) => (v == null || v === "") ? "null" : `'${String(v).replace(/'/g, "''")}'`;
const rows = [];   // {platform, product, size, barcode, code, item_name, grade}

// Eveandboy: key = "nkscent|ml", value = {barcode, item_name} — แยก scent จาก item_name
for (const [key, v] of Object.entries(EVEANDBOY_BY_KEY)) {
  const ml = key.split("|")[1];
  const m = v.item_name.match(/^LAB PARFUMO-(.+?)\s+Eau\s+[Dd]e\s+P[ae]rfum/i);
  const scent = m ? m[1].trim() : key.split("|")[0];
  rows.push({ platform: "Eveandboy", product: scent, size: `${ml} ml`, barcode: v.barcode, code: v.barcode, item_name: v.item_name, grade: null });
}
// King Power: value = {code, barcode, item_name, scent, grade}
for (const [key, v] of Object.entries(KINGPOWER_BY_KEY)) {
  const ml = key.split("|")[1];
  rows.push({ platform: "KingPower", product: v.scent, size: `${ml} ml`, barcode: v.barcode, code: v.code, item_name: v.item_name, grade: v.grade });
}

const catVals = rows.map((r, i) =>
  `  (${sq(r.platform)},${sq(r.product)},${sq(r.size)},${sq(r.barcode)},${sq(r.code)},${sq(r.item_name)},${sq(r.grade)},${i})`).join(",\n");
const brVals = EVEANDBOY_BRANCHES.map((b, i) =>
  `  ('Eveandboy',${sq(b.branch)},${sq(b.code)},${sq(b.address)},${i})`).join(",\n");

const sql = `-- ค้าส่ง: ย้าย catalog (Eveandboy/King Power) + สาขา (Eveandboy) เข้า DB → จัดการในระบบได้ (เพิ่ม/ลด/แก้)
-- seed จากไฟล์ static ปัจจุบัน (${rows.length} catalog · ${EVEANDBOY_BRANCHES.length} สาขา) · idempotent
-- สร้างจาก scripts/gen-wholesale-migration.mjs — อย่าแก้มือ
create table if not exists wholesale_catalog (
  id serial primary key,
  platform  text not null,          -- 'Eveandboy' | 'KingPower'
  product   text not null,          -- กลิ่น (จับกับ products ด้วย normalize)
  size      text not null,          -- เช่น '50 ml'
  barcode   text,                   -- REFERENCE (บาร์โค้ดสินค้า)
  code      text,                   -- ARTICLE / รหัสสินค้าของคู่ค้า (โชว์เป็น Product Code)
  item_name text,                   -- ชื่อสินค้าที่โชว์บนใบเบิก/ใบส่งของ
  grade     text,                   -- เกรดของคู่ค้า (EDP/LE PARFUM/EDP EXTRAIT) — optional
  active    boolean not null default true,
  sort      int default 0,
  updated_at timestamptz default now(),
  unique (platform, product, size)
);
create index if not exists idx_wholesale_catalog_platform on wholesale_catalog (platform, active);

create table if not exists wholesale_branch (
  id serial primary key,
  platform  text not null,          -- 'Eveandboy' (King Power พิมพ์สาขาเอง — ไม่ seed)
  branch    text not null,          -- ชื่อสาขา
  code      text,                   -- รหัสสาขา
  address   text,
  active    boolean not null default true,
  sort      int default 0,
  updated_at timestamptz default now(),
  unique (platform, branch)
);
create index if not exists idx_wholesale_branch_platform on wholesale_branch (platform, active);

-- seed catalog (on conflict = ไม่ทับของที่แก้ในระบบแล้ว)
insert into wholesale_catalog (platform, product, size, barcode, code, item_name, grade, sort) values
${catVals}
on conflict (platform, product, size) do nothing;

-- seed สาขา Eveandboy
insert into wholesale_branch (platform, branch, code, address, sort) values
${brVals}
on conflict (platform, branch) do nothing;
`;
writeFileSync("migrations/0045_wholesale_tables.sql", sql);
console.log(`✓ migrations/0045_wholesale_tables.sql — ${rows.length} catalog · ${EVEANDBOY_BRANCHES.length} สาขา`);
