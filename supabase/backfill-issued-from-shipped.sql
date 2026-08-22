-- ทำให้ออเดอร์เก่าที่ "ส่งแล้ว" มีสถานะ "ตัดสต๊อกแล้ว" ให้ตรงกับความจริง
-- (ประวัติที่ import มา = ส่ง+ตัดสต๊อกจริงไปหมดแล้ว แต่ธงตัดหายตอน import)
--
-- ปลอดภัย:
--   • เฉพาะ "ของเก่า" (ก่อนรอบ 1 ก.ย. 2026) — ไม่แตะออเดอร์ในรอบใหม่ที่อาจตั้งใจส่งก่อนตัด
--   • set stock_issued_at = shipped_at เท่านั้น = แก้ "ธง/เวลา" — ไม่ลดจำนวนสต๊อกซ้ำ (ยอดสต๊อกคงเดิม)
--   • idempotent (รันซ้ำได้ ใบที่ตัดแล้วจะไม่ถูกแตะ)
update orders
   set stock_issued_at = shipped_at,
       updated_at = now()   -- stock_issued_by เป็น int (id ผู้ใช้) — ปล่อยว่างไว้สำหรับ backfill ประวัติ
 where shipped_at is not null
   and stock_issued_at is null
   and deleted_at is null
   and coalesce(doc_date, order_date) < date '2026-09-01';

-- ตรวจซ้ำ: เหลือ "ส่งแต่ยังไม่ตัด" ที่เป็นของเก่ากี่ใบ (ควร 0) + ของใหม่แยกให้ดู
select
  count(*) filter (where coalesce(doc_date,order_date) <  date '2026-09-01') as ของเก่าเหลือ,
  count(*) filter (where coalesce(doc_date,order_date) >= date '2026-09-01') as ของใหม่_ปล่อยไว้
from orders
where shipped_at is not null and stock_issued_at is null and deleted_at is null;
