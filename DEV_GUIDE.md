# คู่มือทดลอง/พัฒนา โดยไม่กระทบระบบจริง

ระบบขึ้น production แล้ว — ห้ามทดลองบนข้อมูลจริง ใช้ 3 ชั้นนี้แทน

| ชั้น | ใช้ตอนไหน | ฐานข้อมูล | อยู่ที่ไหน | ป้ายบนจอ |
|---|---|---|---|---|
| **1. Local Sandbox** | ลองฟีเจอร์/แก้บั๊กประจำวัน | PGlite (`./.pgdata`) ในเครื่อง | `npm run dev` → localhost:3050 | 🧪 SANDBOX (เขียว) |
| **2. Staging** | ทดสอบเหมือนจริงก่อนปล่อย | Supabase **คนละ project** กับ prod | Vercel deployment "staging" | 🟡 STAGING (เหลือง) |
| **3. Production** | ระบบจริง (ห้ามทดลอง) | Supabase `labparfumo-core` | Vercel prod (labparfumo-stock) | ไม่มีป้าย |

> ป้ายสีบนหัวจอบอกเสมอว่าอยู่ชั้นไหน — ถ้าเห็นหน้าจอ **ไม่มีป้าย = ระบบจริง อย่าทดลอง**

---

## ชั้น 1 — Local Sandbox (ใช้บ่อยสุด · ปลอดภัย 100%)

```bash
npm run dev            # PGlite ในเครื่อง แยกขาดจาก prod (ป้าย 🧪 SANDBOX)
```
- login: `admin` / `admin1234` (ตั้งใน `.env.local`)
- ข้อมูลอยู่ใน `./.pgdata` เท่านั้น — เขียน/ลบ/พังยังไงก็ **ไม่แตะ prod**
- เริ่มใหม่หมด: `npm run reset` (ลบ `.pgdata` แล้ว `npm run dev` ใหม่ → seed อัตโนมัติ)

**🛡️ guardrail:** ถ้า `.env.local` เผลอมี `DATABASE_URL` ของ prod → `npm run dev` จะ **หยุดทันที**
พร้อมบอกวิธีแก้ (กันเขียนทับข้อมูลจริงโดยไม่ตั้งใจ) — จะฝืนต่อ prod จริง ๆ ต้องตั้ง `ALLOW_PROD_DB=1`

### อยากทดลองด้วย "ข้อมูลเหมือนจริง" ในเครื่อง?
ดึง prod มาลงเครื่อง (อ่านอย่างเดียวจาก prod — เขียนแค่ในเครื่อง):
```bash
# 1) export เฉพาะข้อมูล (data-only) จาก Supabase prod → ไฟล์
pg_dump "$PROD_DATABASE_URL" --data-only --no-owner \
  -t orders -t order_items -t stock -t stock_unit -t material_item -t products \
  > /tmp/prod-data.sql
# 2) โหลดเข้า staging/เครื่องทดสอบ (อย่าโหลดกลับ prod!) — ระวัง PII ลูกค้า (ชื่อ/ที่อยู่/เบอร์)
```
> มี PII → เก็บไฟล์ในเครื่องตัวเองเท่านั้น อย่าอัปขึ้นที่สาธารณะ

---

## ชั้น 2 — Staging (ทดสอบเหมือนจริง)

ตั้งครั้งเดียว:
1. Supabase → สร้าง **project ใหม่** ชื่อ `labparfumo-stock-staging` (แยกจาก prod สนิท)
2. รัน migration ทั้งหมดใน `migrations/` + `supabase/RUN_*.sql` บน project staging
3. Vercel → สร้าง deployment/branch ชื่อ `staging` ตั้ง env:
   - `NEXT_PUBLIC_APP_ENV=staging`
   - `DATABASE_URL=<staging pooler url>` + `NEXT_PUBLIC_SUPABASE_*` ของ staging
4. เปิด URL staging → เห็นป้าย 🟡 STAGING → ทดสอบได้เต็มที่ ไม่แตะ prod

> **อย่า** เอา `DATABASE_URL` ของ staging/prod มาใส่ `.env.local` ของเครื่อง — staging ให้รันบน Vercel เท่านั้น (กันสับสน + กัน guardrail)

---

## ขั้นตอนปล่อยของ (release)
```
แก้โค้ด → ลองใน Local Sandbox → push → เช็คบน Staging → merge เข้า main → prod อัตโนมัติ
```
- migration/SQL: รันบน **staging ก่อน** ให้ผ่าน แล้วค่อยรันบน prod (ดู memory: prod รัน SQL มือทุกครั้ง)

---

## เช็กด่วนก่อนแตะอะไร
- [ ] หน้าจอมีป้าย 🧪 หรือ 🟡 ไหม? (ไม่มี = prod → หยุด)
- [ ] `npm run dev` = PGlite เสมอ (ถ้าหยุดพร้อม error prod = ดีแล้ว guardrail ทำงาน)
- [ ] จะรัน SQL: ดู Supabase project ให้ชัด (`labparfumo-core` = prod / `...-staging` = ทดสอบ)
