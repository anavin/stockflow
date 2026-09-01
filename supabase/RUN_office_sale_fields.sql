-- ฟิลด์สำหรับใบเบิก Office (ร้านขาย/จัดส่งเอง): ราคา/ส่วนลด/ช่องทางชำระ/ขนส่ง/เลขพัสดุ
-- คอลัมน์ทั่วไป (nullable) — แพลตฟอร์มอื่นเว้นว่างไว้
alter table orders add column if not exists price            numeric;
alter table orders add column if not exists discount         numeric;
alter table orders add column if not exists payment_method   text;
alter table orders add column if not exists shipping_carrier text;
alter table orders add column if not exists tracking_no      text;
