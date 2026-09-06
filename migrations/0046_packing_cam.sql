-- Packing Cam: ปักว่าออเดอร์ถูกแพค+อัดคลิปแล้ว และเก็บลิงก์คลิปไว้เปิดจากหน้าออเดอร์
alter table orders add column if not exists packed_at        timestamptz;
alter table orders add column if not exists packing_clip_url text;

-- คิวรอแพค = ตัดสต๊อกแล้ว ยังไม่ส่ง ยังไม่แพค → index ให้ query เร็ว
create index if not exists idx_orders_packed_at on orders (packed_at);
