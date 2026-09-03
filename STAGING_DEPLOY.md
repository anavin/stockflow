# ตั้ง Staging ออนไลน์ให้ User ทดลอง (Vercel + Supabase แยกจาก prod)

ได้ URL ถาวร เช่น `stockflow-staging.vercel.app` — ป้าย 🟡 STAGING เหลือง, ข้อมูลคนละฐานกับ prod สนิท
ผมเตรียม SQL + env ให้ครบแล้ว คุณทำตามนี้ (ส่วนที่ต้องกดบน dashboard = บัญชีคุณเอง)

> ไฟล์ SQL สร้างจาก `node scripts/gen-staging-sql.mjs` (หรือ `npm run gen:staging`) — รันใหม่เมื่อมี migration/seed เพิ่ม

---

## ขั้นที่ 1 — สร้าง Supabase project ใหม่ (แยกจาก prod)
1. supabase.com → New project → ชื่อ `labparfumo-stock-staging` · region **ap-southeast-1 (Singapore)** (เท่า prod)
2. ตั้ง Database Password เก็บไว้ (จะใช้ใน DATABASE_URL)

## ขั้นที่ 2 — สร้างตาราง + ข้อมูลตั้งต้น (SQL Editor)
รัน **ตามลำดับ** (ทุกไฟล์ < 1MB พาสต์ได้เลย):
1. `supabase/STAGING_1_schema.sql`  → ตารางทั้งหมด (40 migrations, idempotent)
2. `supabase/STAGING_2_seed.sql`    → แพลตฟอร์ม/กลิ่น 125/ขนาด/รหัสไปรษณีย์/ถุง p31-p32
3. `supabase/STAGING_3_thai_postcodes.sql` → ตำบลทั้งประเทศ (ไม่บังคับ · ถ้า editor ช้าให้ใช้ psql)

> ตรวจ: SQL Editor รัน `select count(*) from products;` ควรได้ ~125

## ขั้นที่ 3 — เอาค่าเชื่อมต่อจาก Supabase staging
- **Settings → Database → Connection string → "Transaction pooler" (port 6543)** = `DATABASE_URL`
- **Settings → API** → `Project URL` = `NEXT_PUBLIC_SUPABASE_URL` · `anon public` = `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `service_role` = `SUPABASE_SERVICE_ROLE_KEY`
- **Settings → API → Exposed schemas** = ต้องมี `public` (ค่าเริ่มต้นมีอยู่แล้ว)

## ขั้นที่ 4 — สร้าง Vercel project สำหรับ staging
1. Vercel → Add New Project → import repo เดิม (`anavin/stockflow`)
2. **Root Directory = `platform-withdrawals`** (สำคัญ — โค้ดอยู่โฟลเดอร์ย่อย)
3. ตั้ง Environment Variables (ทั้ง Production/Preview ของ project นี้):

```
NEXT_PUBLIC_APP_ENV=staging
DATABASE_URL=<staging transaction pooler url (port 6543)>
NEXT_PUBLIC_SUPABASE_URL=https://<staging-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging anon key>
SUPABASE_SERVICE_ROLE_KEY=<staging service role key>
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<ตั้งรหัสแอดมิน staging>
```
> แอดมินถูกสร้างอัตโนมัติจาก ADMIN_USERNAME/ADMIN_PASSWORD ตอนต่อ DB ครั้งแรก (ensureAdmin) — ไม่ต้องรัน SQL เพิ่ม

4. Deploy → เปิด URL → เห็นแถบ 🟡 STAGING = ถูกต้อง (ถ้าไม่เห็นแถบ = ยังชี้ prod ให้เช็ก env)

## ขั้นที่ 5 — เปิดให้ User ทดลอง
- login แอดมินที่ตั้งไว้ → เมนูจัดการผู้ใช้ → สร้าง user ให้ทีมทดลอง (แยก role ได้)
- ส่ง URL staging + user/pass ให้ทีม → ทุกคนทดลองพร้อมกันได้ ข้อมูลอยู่บน staging ไม่แตะ prod

---

## กติกาความปลอดภัย
- **อย่า** เอา DATABASE_URL ของ staging/prod มาใส่ `.env.local` เครื่อง dev (guardrail จะหยุด `npm run dev` อยู่แล้ว)
- migration/SQL ใหม่: รันบน **staging ก่อน** ทดสอบผ่าน → ค่อยรันบน prod
- อยากล้าง staging เริ่มใหม่: ใน Supabase staging รัน `drop schema public cascade; create schema public;` แล้วรัน STAGING_1..3 ใหม่ (⚠️ ทำเฉพาะ project staging — ห้ามพลาดไป prod)
