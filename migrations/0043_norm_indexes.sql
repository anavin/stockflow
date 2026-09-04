-- Performance: index รองรับการ normalize กลิ่น/ขนาด ที่ query hot ใช้ (regexp_replace + btrim)
-- เดิมไม่มี index ตรงรูปนี้ → listStock/stockSummary/mismatch/velocity ฯลฯ seq scan โตตามจำนวนข้อมูล
-- ฟังก์ชันทั้งหมด (regexp_replace/lower/btrim) เป็น IMMUTABLE → สร้าง expression index ได้
create index if not exists idx_stock_norm on stock (
  (regexp_replace(lower(btrim(product)),'[^a-z0-9ก-๙]','','g')),
  (btrim(lower(size),' .')));
create index if not exists idx_order_items_prodnorm on order_items (
  (regexp_replace(lower(btrim(product)),'[^a-z0-9ก-๙]','','g')));
create index if not exists idx_products_namenorm on products (
  (regexp_replace(lower(btrim(name)),'[^a-z0-9ก-๙]','','g')));
create index if not exists idx_pbc_scentnorm on product_barcodes (
  (regexp_replace(lower(btrim(scent)),'[^a-z0-9ก-๙]','','g')),
  (btrim(lower(size),' .')));
