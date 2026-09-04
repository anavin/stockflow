// รวม migrations/*.sql (เรียงลำดับ) → supabase/PROD_FULL_SCHEMA.sql
// = schema จริงของ prod แบบไฟล์เดียว (source of truth เดียว) · idempotent รันซ้ำปลอดภัย
//
// ทำไม: prod ไม่รัน migration อัตโนมัติ (รันมือ) เดิม prod ประกอบจาก STAGING + RUN_ON_PROD หลายไฟล์
// → เกิด drift (เช่น branch_code/po_version หลุด) ไฟล์นี้ตัดปัญหา: รันไฟล์เดียวจบ = prod ตรงกับ dev เป๊ะ
//
// ใช้: npm run gen:prod-schema   (รันทุกครั้งหลังเพิ่ม migration ใหม่)
// จากนั้นรัน supabase/PROD_FULL_SCHEMA.sql บน Supabase (ทั้งไฟล์ รันซ้ำได้)
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIG_DIR = join(ROOT, "migrations");
const OUT = join(ROOT, "supabase", "PROD_FULL_SCHEMA.sql");

const files = readdirSync(MIG_DIR).filter((f) => f.endsWith(".sql")).sort();
const now = new Date().toISOString().slice(0, 10);

const parts = [
  "-- ════════════════════════════════════════════════════════════════════════",
  "-- PROD_FULL_SCHEMA.sql — schema เต็มของ platform-withdrawals (สร้างอัตโนมัติ)",
  "-- สร้างจาก: scripts/gen-prod-schema.mjs (รวม migrations/*.sql เรียงลำดับ)",
  `-- อัปเดตล่าสุด: ${now} · ${files.length} migrations`,
  "--",
  "-- ⚠️ อย่าแก้ไฟล์นี้ตรง ๆ — แก้ที่ migrations/ แล้วรัน `npm run gen:prod-schema`",
  "-- วิธีใช้บน prod: Supabase → SQL Editor → วางทั้งไฟล์ → Run (idempotent รันซ้ำปลอดภัย)",
  "-- ════════════════════════════════════════════════════════════════════════",
  "",
];

for (const f of files) {
  const sql = readFileSync(join(MIG_DIR, f), "utf8").trim();
  parts.push(`-- ───────────────────────────────────────────────────────────────────────`);
  parts.push(`-- ▼ ${f}`);
  parts.push(`-- ───────────────────────────────────────────────────────────────────────`);
  parts.push(sql, "");
}

writeFileSync(OUT, parts.join("\n") + "\n");
console.log(`✓ supabase/PROD_FULL_SCHEMA.sql — รวม ${files.length} migrations (${files[0]} … ${files[files.length - 1]})`);
