-- จัดส่งสินค้า: สแกน Order No. จากใบปะหน้าก่อนเอาไปส่ง → บันทึกว่าส่งเมื่อไหร่/ใครส่ง
alter table orders add column if not exists shipped_at timestamptz;
alter table orders add column if not exists shipped_by int;
create index if not exists idx_orders_shipped_at on orders (shipped_at);
