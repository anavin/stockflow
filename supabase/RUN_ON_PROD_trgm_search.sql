-- ═══════════════════════════════════════════════════════════════════════════
-- เร่งการค้นหาแบบ ilike '%คำ%' (leading wildcard) ด้วย trigram GIN index
--   - listOrders/countOrders: ค้น order_no/doc_no/receiver/username/shop_name/province
--   - searchCustomers (type-ahead): มี EXISTS บน order_items.product ต่อทุกคีย์ที่พิมพ์
-- ต้องรัน "มือ" บน Supabase (prod) เท่านั้น — PGlite (dev) ไม่รองรับ pg_trgm ผ่าน CREATE EXTENSION
-- จึงไม่วางไฟล์นี้ใน migrations/ (ที่ auto-run บน dev)
-- รันซ้ำได้ (idempotent). ถ้าตารางใหญ่มากและไม่อยาก lock ให้เปลี่ยนเป็น
-- CREATE INDEX CONCURRENTLY (ห้ามอยู่ใน transaction block)
-- ═══════════════════════════════════════════════════════════════════════════
create extension if not exists pg_trgm;

-- ค้นหาในหน้า order list (ทุกแพลตฟอร์ม)
create index if not exists idx_orders_order_no_trgm on orders using gin (order_no gin_trgm_ops);
create index if not exists idx_orders_receiver_trgm on orders using gin (receiver gin_trgm_ops);
create index if not exists idx_orders_username_trgm on orders using gin (username gin_trgm_ops);
create index if not exists idx_orders_shop_name_trgm on orders using gin (shop_name gin_trgm_ops);

-- customer type-ahead: EXISTS บน order_items.product (ตัวหนักสุด)
create index if not exists idx_order_items_product_trgm on order_items using gin (product gin_trgm_ops);
