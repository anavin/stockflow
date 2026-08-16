-- กำกับ SKU (บาร์โค้ด) ในประวัติการเคลื่อนไหวสต๊อก (โดยเฉพาะตอนรับเข้า)
alter table stock_moves add column if not exists sku text;
