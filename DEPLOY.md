# Deploy — Supabase + Cloudflare

แอปนี้ dev ใช้ PGlite (ในเครื่อง) และ prod ใช้ **Postgres บน Supabase** โดยสลับด้วย env
`DATABASE_URL` อย่างเดียว — SQL เหมือนกันทั้งสองทาง.

## 1) Supabase (ฐานข้อมูล)
ใช้ project กลาง `kp-labparfumo` ร่วมกับแอปอื่น (1 schema ต่อแอป — ดู skill `/new-app`).

1. Dashboard → **SQL editor** → รันไฟล์ [`supabase/10_platform_withdrawals.sql`](./supabase/10_platform_withdrawals.sql)
   (สร้าง schema `platform_withdrawals` + ตาราง + seed products/sizes/platforms/postcodes + เปิด RLS)
   > ถ้ายังไม่เคยรัน `00_shared.sql` (auth/app_members กลาง) บน project นี้ — รันก่อน
2. Dashboard → **API → Exposed schemas** → เพิ่ม `platform_withdrawals` ⚠️ (ลืมบ่อย)
3. สร้างผู้ดูแลระบบ (ครั้งแรก): ตั้ง `ADMIN_USERNAME`/`ADMIN_PASSWORD` ใน env ให้เรียบร้อย
   → **เมื่อแอปเชื่อมต่อ DB ครั้งแรก จะ bootstrap admin ให้อัตโนมัติ** (ทั้ง dev PGlite และ prod pg)
   ถ้า `ADMIN_PASSWORD` ไม่ได้ตั้ง ระบบจะสุ่มรหัสให้แล้ว log ออกมา — **หรือ** insert แถวใน
   `platform_withdrawals.users` ด้วย bcrypt hash เอง

### connection string
ใช้ **pooled connection** (พอร์ต 6543, transaction mode) จาก Dashboard → Database → Connection string → "Transaction":
```
DATABASE_URL=postgres://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
```
> แอปตั้ง `search_path` เป็น startup parameter ต่อ connection แล้ว (ไม่ใช่ `SET` ครั้งเดียว) จึงใช้กับ
> pooler transaction mode ได้ถูกต้อง.

### TLS
ดีฟอลต์ตรวจ certificate เต็มรูปแบบ (`rejectUnauthorized: true`). ถ้าเจอปัญหา cert:
- แนะนำ: ตั้ง `DATABASE_CA_CERT` = เนื้อไฟล์ CA ของ Supabase (PEM) → ตรวจ cert ได้ปกติและปลอดภัย
- ทางลัด (ไม่แนะนำ prod): ตั้ง `PGSSL_NO_VERIFY=1` เพื่อข้ามการตรวจ cert

## 2) Cloudflare Workers (โฮสต์แอป)
Deploy Next.js บน Cloudflare Workers ด้วย **OpenNext** — config เตรียมไว้ให้ครบแล้ว
(`wrangler.jsonc`, `open-next.config.ts`, สคริปต์ใน `package.json`).

**ขั้นตอน:**
```bash
# 1. ติดตั้ง deps (ครั้งแรก — ประกาศไว้ใน package.json แล้ว)
npm install

# 2. ล็อกอิน Cloudflare (ครั้งแรก)
npx wrangler login

# 3. ตั้ง secret (ทีละตัว — ปลอดภัยกว่าใส่ในไฟล์)
npx wrangler secret put DATABASE_URL       # postgres://…pooler.supabase.com:6543/postgres
npx wrangler secret put ADMIN_USERNAME     # admin
npx wrangler secret put ADMIN_PASSWORD     # <รหัสจริง>
# ถ้าเจอ cert error ตอนต่อ DB: npx wrangler secret put DATABASE_CA_CERT   # เนื้อไฟล์ CA (PEM)

# 4. ทดสอบ local (จำลอง Workers) แล้ว deploy
npm run cf:preview      # build + เปิด preview ที่เครื่อง
npm run cf:deploy       # build + deploy ขึ้น Cloudflare
```
> `compatibility_flags = ["nodejs_compat"]` จำเป็น — `pg` + `react-pdf` ใช้ Node APIs.
> secrets ตั้งผ่าน `wrangler secret put` (ไม่ต้องมีใน `wrangler.jsonc`).

### ✅ PDF บน Workers — แก้แล้ว
ฟอนต์ไทยฝัง base64 ใน `lib/pdf/fonts.ts` (ไม่อ่านไฟล์/`process.cwd()`) → route
`/api/print/[orderNo]` เรนเดอร์ได้บน Workers เหมือน Node เป๊ะ (ทดสอบ render ผ่านแล้ว).
ถ้าเปลี่ยนฟอนต์ ให้รัน `npm run gen:fonts` เพื่อ regenerate.

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
