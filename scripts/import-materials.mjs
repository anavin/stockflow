// นำเข้าข้อมูลวัตถุดิบ 3 หมวดจาก bulk-lables-packaging.xlsx → material_item + material_move (ประวัติเต็ม)
// รันในโฟลเดอร์โปรเจกต์:  node scripts/import-materials.mjs /path/to/bulk-lables-packaging.xlsx
// - เขียนลง PGlite (./.pgdata) สำหรับ dev  + สร้าง supabase/IMPORT_materials_from_excel.sql สำหรับ prod
import { PGlite } from "@electric-sql/pglite";
import ExcelJS from "exceljs";
import { writeFileSync } from "node:fs";
import { LABEL_COMPONENTS, gradeToLabelKey, bulkRef, labelRef, mnorm } from "../lib/materials.ts";

const XLSX = process.argv[2] || "/Users/anavinst/Downloads/bulk-lables-packaging.xlsx";
const BASE_DATE = new Date("2026-01-01T00:00:00.000Z");
const slug = (s) => "x_" + mnorm(s).slice(0, 24);
const sq = (s) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);

// (grade, ประเภทใน Excel) → comp_key ในแคตตาล็อก
const TYPEMAP = {
  "Card Accords notes": { EDP: "card", "EDP+": "card", PARFUM: "card" },
  "Sticker 1.2 ml.": { EDP: "s_12", "EDP+": "s_12", PARFUM: "s_12" },
  "Sticker ติดกล่อง 10 ml.": { EDP: "box_edp_10", "EDP+": "box_10", PARFUM: "box_10" },
  "Sticker ติดกล่อง 30 ml.": { "EDP+": "box_30", PARFUM: "box_30" },
  "Sticker ติดกล่อง 50 ml.": { "EDP+": "box_50", PARFUM: "box_50" },
  "Sticker ติดกล่อง EDP": { EDP: "box_edp" },
  "Sticker ติดกล่อง EDT": { EDT: "box_edt" },
  "Sticker ติดขวด 90 ml.": { EDT: "bottle_90" },
  "Sticker ส.ค.บ. 4 ml.": { EDP: "scb_4", "EDP+": "scb_4", PARFUM: "scb_4" },
  "Sticker ส.ค.บ. 10 ml.": { EDP: "scb_10", "EDP+": "scb_10", PARFUM: "scb_10", EDT: "scb_10" },
  "Sticker ส.ค.บ. 30 ml.": { EDP: "scb_30", "EDP+": "scb_30", PARFUM: "scb_30", EDT: "scb_30" },
  "Sticker ส.ค.บ. 50 ml.": { EDP: "scb_50", "EDP+": "scb_50", PARFUM: "scb_50" },
  "Sticker ส.ค.บ. 90 ml.": { EDT: "scb_90" },
};
// alias ชื่อบรรจุภัณฑ์ Excel → ชื่อในระบบ (seed 33 รายการ)
const PKG_ALIAS = {
  "ซองซิปเทสเตอร์ สีกรม": "ซองซิปเทสเตอร์",
  "กล่องน้ำหอม EDP 10 ml.": "กล่อง EDP 10 ml.",
};

const db = new PGlite("./.pgdata");
const prods = (await db.query(`select name, ptype from products where active`)).rows;
const prodByNorm = new Map(prods.map((p) => [mnorm(p.name), p]));
const pkgSeed = (await db.query(`select ref_key, label, category2, sort from material_item where category='packaging'`)).rows;
const pkgByNorm = new Map(pkgSeed.map((r) => [mnorm(r.label), r]));
let pkgSort = Math.max(0, ...pkgSeed.map((r) => Number(r.sort) || 0));

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(XLSX);
function readRows(ws, ncol) {
  const out = [];
  ws.eachRow({ includeEmpty: false }, (r, rn) => {
    if (rn === 1) return;
    const cells = [];
    for (let i = 1; i <= ncol; i++) cells.push(r.getCell(i));
    out.push(cells);
  });
  return out;
}
const dateOf = (cell) => { const v = cell?.value; if (v instanceof Date) return v; const t = cell?.text; const d = t ? new Date(t) : null; return d && !isNaN(d) ? d : BASE_DATE; };
const num = (cell) => { const n = Number((cell?.text || "").toString().replace(/,/g, "")); return isNaN(n) ? 0 : n; };

// items: ref -> {category, ref_key, scent, comp_key, brand, grade, label, category2, unit, sort, moves:[{date,change,reason}]}
const items = new Map();
const report = { bulkNew: [], pkgNew: [], labelExtra: new Map() };
function ensure(k, meta) { if (!items.has(k)) items.set(k, { ...meta, moves: [] }); return items.get(k); }
function addMove(it, date, inQ, outQ) {
  if (inQ > 0) it.moves.push({ date, change: inQ, reason: "receive" });
  if (outQ > 0) it.moves.push({ date, change: -outQ, reason: "issue" });
}

// ---- BULK ----
for (const c of readRows(wb.getWorksheet("bulk"), 4)) {
  const name = (c[1].text || "").trim(); if (!name) continue;
  const p = prodByNorm.get(mnorm(name));
  const scent = p ? p.name : name;
  const rk = bulkRef(scent, "Lab Parfumo");
  const key = "bulk|" + rk;
  if (!items.has(key) && !p) report.bulkNew.push(name);
  const it = ensure(key, { category: "bulk", ref_key: rk, scent, comp_key: null, brand: "Lab Parfumo", grade: p ? p.ptype : null, label: scent, category2: null, unit: "ml", sort: 0 });
  addMove(it, dateOf(c[0]), num(c[2]), num(c[3]));
}
// ---- LABELS ----
for (const c of readRows(wb.getWorksheet("labels"), 6)) {
  const name = (c[1].text || "").trim(); const type = (c[2].text || "").trim(); if (!name || !type) continue;
  const p = prodByNorm.get(mnorm(name));
  const gk = p ? gradeToLabelKey(p.ptype) : null;
  const catKey = gk ? TYPEMAP[type]?.[gk] : null;
  const scent = p ? p.name : name;
  let comp_key, label;
  if (catKey) { comp_key = catKey; label = (LABEL_COMPONENTS[gk].find((x) => x.key === catKey)?.label) || type; }
  else { comp_key = slug(type); label = type; report.labelExtra.set(`${scent} · ${type}`, (report.labelExtra.get(`${scent} · ${type}`) || 0) + 1); }
  const rk = labelRef(scent, comp_key);
  const it = ensure("label|" + rk, { category: "label", ref_key: rk, scent, comp_key, brand: null, grade: gk || (p ? null : "อื่นๆ"), label: `${scent} · ${label}`, category2: null, unit: "ชิ้น", sort: 0 });
  addMove(it, dateOf(c[0]), num(c[3]), num(c[4]) + num(c[5]));  // จ่ายออก + ชำรุด
}
// ---- PACKAGING ----
for (const c of readRows(wb.getWorksheet("packaging"), 5)) {
  const name = (c[1].text || "").trim(); if (!name) continue;
  const aliased = PKG_ALIAS[name] || name;
  const seed = pkgByNorm.get(mnorm(aliased));
  let rk, label, category2, sort;
  if (seed) { rk = seed.ref_key; label = seed.label; category2 = seed.category2; sort = Number(seed.sort) || 0; }
  else { rk = slug(name); label = name; category2 = /กล่อง/.test(name) ? "กล่อง" : /ถุง|ซอง/.test(name) ? "ถุง/ซอง" : /ฝา|สเปรย์/.test(name) ? "ฝา/หัวสเปรย์" : "ขวด/หลอด"; sort = ++pkgSort + 100; report.pkgNew.push(name); }
  const it = ensure("packaging|" + rk, { category: "packaging", ref_key: rk, scent: null, comp_key: rk, brand: null, grade: null, label, category2, unit: "ชิ้น", sort });
  addMove(it, dateOf(c[0]), num(c[2]), num(c[3]) + num(c[4]));
}

// ---- คำนวณ running balance ต่อรายการ (เรียงตามวันที่ + ลำดับแถว) ----
for (const it of items.values()) {
  it.moves.sort((a, b) => a.date - b.date);
  let bal = 0;
  for (const m of it.moves) { bal += m.change; m.balance = bal; }
  it.qty = bal;
}

// ---- เขียนลง PGlite (dev): ล้าง import เดิม + ยอด แล้วใส่ใหม่ ----
await db.query(`delete from material_move where note = 'นำเข้าจาก Excel'`);
let nItems = 0, nMoves = 0;
for (const it of items.values()) {
  const ins = await db.query(
    `insert into material_item (category, ref_key, scent, comp_key, brand, grade, label, category2, unit, sort)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     on conflict (category, ref_key) do update set updated_at = now()
     returning id`,
    [it.category, it.ref_key, it.scent, it.comp_key, it.brand, it.grade, it.label, it.category2, it.unit, it.sort]);
  const id = ins.rows[0].id;
  nItems++;
  for (const m of it.moves) {
    await db.query(`insert into material_move (item_id, qty_change, balance, reason, note, created_at) values ($1,$2,$3,$4,'นำเข้าจาก Excel',$5)`,
      [id, m.change, m.balance, m.reason, m.date.toISOString()]);
    nMoves++;
  }
  await db.query(`update material_item set qty=$2, updated_at=now() where id=$1`, [id, it.qty]);
}

// ---- สร้าง prod SQL (idempotent) ----
const L = [];
L.push("-- นำเข้าข้อมูลวัตถุดิบ 3 หมวดจาก Excel (ประวัติเต็ม) — รันหลัง RUN_ON_PROD_materials.sql");
L.push("-- idempotent: ลบ import เดิม แล้วใส่ใหม่ + คำนวณคงเหลือจากยอดล่าสุด");
L.push("begin;");
L.push("delete from material_move where note = 'นำเข้าจาก Excel';");
L.push("");
for (const it of items.values()) {
  L.push(`insert into material_item (category, ref_key, scent, comp_key, brand, grade, label, category2, unit, sort) values (${sq(it.category)},${sq(it.ref_key)},${sq(it.scent)},${sq(it.comp_key)},${sq(it.brand)},${sq(it.grade)},${sq(it.label)},${sq(it.category2)},${sq(it.unit)},${it.sort}) on conflict (category, ref_key) do nothing;`);
  for (const m of it.moves) {
    L.push(`insert into material_move (item_id, qty_change, balance, reason, note, created_at) select id, ${m.change}, ${m.balance}, ${sq(m.reason)}, 'นำเข้าจาก Excel', ${sq(m.date.toISOString())}::timestamptz from material_item where category=${sq(it.category)} and ref_key=${sq(it.ref_key)};`);
  }
}
L.push("");
L.push("-- ตั้งคงเหลือ = balance ของ move ล่าสุดต่อรายการ (เฉพาะที่มี import)");
L.push(`update material_item mi set qty = sub.bal, updated_at = now()
from (select distinct on (item_id) item_id, balance as bal from material_move where note='นำเข้าจาก Excel' order by item_id, created_at desc, id desc) sub
where sub.item_id = mi.id;`);
L.push("commit;");
writeFileSync("supabase/IMPORT_materials_from_excel.sql", L.join("\n") + "\n");

// ---- รายงาน ----
const sum = (cat) => [...items.values()].filter((i) => i.category === cat).reduce((a, i) => a + i.qty, 0);
console.log(`เขียน PGlite: ${nItems} รายการ, ${nMoves} moves`);
console.log(`คงเหลือรวม — bulk: ${sum("bulk").toLocaleString()} ml · label: ${sum("label").toLocaleString()} ชิ้น · packaging: ${sum("packaging").toLocaleString()} ชิ้น`);
console.log(`bulk รายการใหม่ (ไม่มีในสินค้า): ${report.bulkNew.length} → ${report.bulkNew.join(", ")}`);
console.log(`packaging รายการใหม่: ${report.pkgNew.length} → ${report.pkgNew.join(", ")}`);
console.log(`label ชิ้นส่วนนอกแคตตาล็อก (แสดงเป็น extra): ${report.labelExtra.size} รายการ`);
for (const [k, v] of report.labelExtra) console.log("   ", v, "×", k);
console.log("สร้าง supabase/IMPORT_materials_from_excel.sql แล้ว");
await db.close();
