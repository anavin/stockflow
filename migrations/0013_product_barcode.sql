-- Mapping ชื่อกลิ่น ↔ บาร์โค้ด (Code128) ให้ต่อกับระบบขายหน้าร้าน CTW
-- CTW (lab-parfumo-central) ผูกสินค้าด้วย products.barcode (unique) — เก็บ barcode ที่ตรงกันไว้บนกลิ่น
-- เพื่อใช้เป็นคีย์ join ข้ามระบบ (name ในระบบนี้ ↔ barcode/product_id ใน CTW)
alter table products add column if not exists barcode text;
create index if not exists idx_products_barcode on products (barcode);
