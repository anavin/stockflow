-- 4ml (assign): แยกว่า unit ถูก "สร้างตอนตัดสต๊อก" (assign) vs "ตัดจากของในคลังจริง"
-- ตอนยกเลิกตัดสต๊อก: อันที่ assign สร้างใหม่ → ลบทิ้ง · อันที่ตัดจากคลัง → คืนสถานะ in_stock
alter table stock_unit add column if not exists assigned_at_issue boolean not null default false;
