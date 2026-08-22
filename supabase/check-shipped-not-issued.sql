-- แยกแยะออเดอร์ "ส่งแล้วแต่ยังไม่ตัดสต๊อก" (73 ใบบน prod) — read-only
-- ดูว่าเป็นของเก่า(ก่อนรอบ 1 ก.ย.) หรือของใหม่ · แยกแพลตฟอร์ม · ช่วงวันที่ส่ง
select
  platform,
  count(*) as n,
  count(*) filter (where coalesce(doc_date,order_date) <  date '2026-09-01') as ของเก่า_ก่อนรอบ,
  count(*) filter (where coalesce(doc_date,order_date) >= date '2026-09-01') as ของใหม่_ในรอบ,
  to_char(min(shipped_at),'YYYY-MM-DD') as ส่งเร็วสุด,
  to_char(max(shipped_at),'YYYY-MM-DD') as ส่งล่าสุด
from orders
where shipped_at is not null and stock_issued_at is null and deleted_at is null
group by 1 order by 2 desc;
