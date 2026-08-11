# ระบบเบิกสินค้าแต่ละแพลตฟอร์ม (Platform Withdrawals)

เว็บแอปออกใบเบิกสินค้า/ใบส่งของแยกตามแพลตฟอร์ม — เริ่มจาก **Shopee** (พร้อมโครงรองรับ
Lazada / TikTok / Line / Website / Office). **Primary key = Order No.**

ทำระบบแทนการกรอกใน Excel: กรอกเอง (มี dropdown), นำเข้า Excel/CSV, และสั่งพิมพ์
"ใบเบิก SP" (Goods Issue Form) เป็น PDF ได้ทันที.

## ฟีเจอร์
- **กรอกใบเบิกเอง** — dropdown ค้นหาได้: กลิ่นน้ำหอม (~125), ขนาด, จังหวัด → อำเภอ → รหัสไปรษณีย์ (auto), ลูกค้าเก่า/ใหม่
- **หลายบรรทัดต่อออร์เดอร์** — สินค้า + ของแถม (Free) ในใบเบิกเดียว
- **เลขที่ใบเบิกอัตโนมัติ** — `SH-YY-MM-DD-####` ออกเลขแบบ atomic ต่อแพลตฟอร์ม/วัน
- **นำเข้า Excel/CSV** — จับกลุ่มหลายบรรทัดเป็นออร์เดอร์ตาม Order No. + preview ก่อนบันทึก (upsert)
- **พิมพ์ใบเบิก PDF** — Goods Issue Form 2 ชุด (ต้นฉบับ/สำเนา) + บาร์โค้ด Order No. (Code 39) ครบทุกช่อง

## สแตก
Next.js 15 (App Router) · TypeScript · Tailwind · react-pdf · exceljs · PGlite (dev) / Postgres–Supabase (prod)

## รันเครื่อง (dev — ไม่ต้องมี Supabase)
```bash
npm install
cp .env.example .env.local     # ตั้ง ADMIN_PASSWORD ตามต้องการ
npm run dev                     # http://localhost:3050
```
ครั้งแรกจะสร้าง Postgres ฝังในเครื่อง (PGlite → `./.pgdata`) + seed ข้อมูลอ้างอิงอัตโนมัติ,
และสร้างผู้ดูแลระบบจาก `ADMIN_USERNAME` / `ADMIN_PASSWORD` (ค่าเริ่มต้น `admin` / `admin1234`).

## โครงสร้าง
```
app/(app)/shopee/         หน้า list · new · [orderNo] (แก้ไข) · import
app/api/{login,logout,import,print}   route handlers (print = PDF)
lib/db.ts                 ชั้น DB คู่ PGlite/Postgres (q(), tx())
lib/actions/orders.ts     server actions: saveOrder / deleteOrder / bulkSaveOrders
lib/queries.ts            อ่านข้อมูล + reference data สำหรับ dropdown
lib/import/parse-shopee.ts  แม็ปหัวคอลัมน์ + จับกลุ่มเป็นออร์เดอร์
lib/pdf/                  react-pdf document + Code 39 barcode
migrations/0001_init.sql  schema (รันอัตโนมัติบน PGlite)
supabase/10_platform_withdrawals.sql   setup Supabase (schema + seed + RLS)
seed/*.json               products / sizes / platforms / postcodes
```

การ deploy (Supabase + Cloudflare) ดูที่ [DEPLOY.md](./DEPLOY.md).
