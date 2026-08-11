# Deploy — Supabase + Cloudflare

แอปนี้ dev ใช้ PGlite (ในเครื่อง) และ prod ใช้ **Postgres บน Supabase** โดยสลับด้วย env
`DATABASE_URL` อย่างเดียว — SQL เหมือนกันทั้งสองทาง.

## 1) Supabase (ฐานข้อมูล)
ใช้ project กลาง `kp-labparfumo` ร่วมกับแอปอื่น (1 schema ต่อแอป — ดู skill `/new-app`).

1. Dashboard → **SQL editor** → รันไฟล์ [`supabase/10_platform_withdrawals.sql`](./supabase/10_platform_withdrawals.sql)
   (สร้าง schema `platform_withdrawals` + ตาราง + seed products/sizes/platforms/postcodes + เปิด RLS)
   > ถ้ายังไม่เคยรัน `00_shared.sql` (auth/app_members กลาง) บน project นี้ — รันก่อน
2. Dashboard → **API → Exposed schemas** → เพิ่ม `platform_withdrawals` ⚠️ (ลืมบ่อย)
3. สร้างผู้ดูแลระบบ (ครั้งแรก): ตั้ง `ADMIN_USERNAME`/`ADMIN_PASSWORD` ให้ตรงกับที่ตั้งใน env
   แล้วเรียกหน้าเว็บครั้งแรก ระบบจะ bootstrap ให้ — **หรือ** insert แถวใน `platform_withdrawals.users`
   ด้วย bcrypt hash เอง

### connection string
ใช้ **pooled connection** (พอร์ต 6543, pgBouncer) จาก Dashboard → Database → Connection string → "Transaction":
```
DATABASE_URL=postgres://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

## 2) Cloudflare (โฮสต์แอป)
Deploy Next.js บน Cloudflare Workers ด้วย **OpenNext** (แนวเดียวกับ lab-parfumo-next branch `cloudflare`).

```bash
npm i -D @opennextjs/cloudflare wrangler
```
`wrangler.toml`:
```toml
name = "platform-withdrawals"
compatibility_date = "2024-11-01"
compatibility_flags = ["nodejs_compat"]     # จำเป็น — pg + react-pdf ใช้ Node APIs
main = ".open-next/worker.js"
[assets]
directory = ".open-next/assets"
```
build & deploy:
```bash
npx @opennextjs/cloudflare build
npx wrangler deploy
```

### env vars (Cloudflare → Settings → Variables & Secrets)
ตั้งเป็น **Secret** ทั้งหมด:
```
DATABASE_URL                 = postgres://…pooler.supabase.com:6543/postgres
ADMIN_USERNAME               = admin
ADMIN_PASSWORD               = <รหัสจริง>
NEXT_PUBLIC_SUPABASE_URL     = https://<ref>.supabase.co   # (เผื่อใช้ storage/realtime ภายหลัง)
NEXT_PUBLIC_SUPABASE_ANON_KEY= <anon key>
SUPABASE_SERVICE_ROLE_KEY    = <service role>              # server-only ห้ามหลุด client
```
> ตั้ง secret ใน `.env.production`/wrangler ให้ครบก่อน deploy — กัน wrangler ลบ vars ที่ไม่ได้ประกาศ

### หมายเหตุการพิมพ์ PDF บน Workers
route `/api/print/[orderNo]` เรนเดอร์ PDF ฝั่ง server (react-pdf) และอ่านฟอนต์ไทยจาก
`public/fonts/*.ttf` — OpenNext bundle ให้และทำงานได้ภายใต้ `nodejs_compat`. ถ้าเจอปัญหา
ขนาด/หน่วยความจำบน Workers ให้ย้ายการเรนเดอร์ PDF ไปฝั่ง client (แนวเดียวกับ lab-parfumo-next)
หรือ deploy เวอร์ชัน Node (Vercel) คู่กัน.

## ทางเลือก: Vercel/Node
ต้องการง่ายสุดให้ deploy บน Vercel (Node runtime) — ตั้งแค่ env ชุดเดียวกัน ไม่ต้อง OpenNext.

## ตรวจก่อนถือว่าเสร็จ
- [ ] รัน `10_platform_withdrawals.sql` แล้ว + expose schema
- [ ] ตั้ง `DATABASE_URL` (pooled) + admin env
- [ ] `npm run build` ผ่าน
- [ ] login ได้ + สร้าง/นำเข้า/พิมพ์ ใบเบิกได้บน prod
- [ ] ไม่มี secret / `.pgdata` / `node_modules` ใน git

## โหลดข้อมูลเข้า prod (หลัง deploy)
ข้อมูลใน dev (PGlite `.pgdata`) ไม่ย้ายอัตโนมัติ — บน prod ใช้ฟีเจอร์ import ของแอปเองได้เลย:
1. **ออร์เดอร์:** เข้า `นำเข้า Excel/CSV` → อัปโหลดไฟล์ `รายการเบิกสินค้า TOUCH-2.xlsx` (sheet Shopee) → ยืนยัน
2. **สต๊อก:** เข้า `สต๊อกสินค้า` → `ดาวน์โหลดเทมเพลต` กรอกยอด (หรือใช้ยอดจากไฟล์ Lab Stock) → `นำเข้าไฟล์`
3. ผู้ใช้พนักงาน: เพิ่มที่ `จัดการผู้ใช้` (admin)

> ตาราง stock/stock_moves + คอลัมน์ deleted_at/stock_issued_at อยู่ในไฟล์ `supabase/10_platform_withdrawals.sql` แล้ว (รันไฟล์เดียวจบ)
