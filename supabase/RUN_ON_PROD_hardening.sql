-- ==========================================================================
-- RUN ON PROD (Supabase -> SQL Editor) : DB hardening (กัน TOCTOU / ข้อมูลซ้ำ)
-- unique index จะ FAIL ถ้ามีข้อมูลซ้ำอยู่ก่อน -> รัน "เช็ก dup" ก่อนทุกอัน
-- ถ้าเจอซ้ำ ให้เคลียร์ก่อนค่อยสร้าง index (ปลอดภัยรันซ้ำ: if not exists)
-- ==========================================================================

-- 1) เลขที่ใบเบิก (doc_no) ห้ามซ้ำ (เฉพาะที่ไม่ว่าง + ไม่ถูกลบ) : กันสแกน doc_no คลุมเครือ
-- เช็ก dup ก่อน:
-- select doc_no, count(*) from orders where coalesce(btrim(doc_no),'')<>'' and deleted_at is null group by doc_no having count(*)>1;
create unique index if not exists ux_orders_doc_no_active
  on public.orders (doc_no) where doc_no is not null and deleted_at is null;

-- 2) บาร์โค้ดสินค้า (product_barcodes.barcode) ห้ามซ้ำ : กัน resolve บาร์โค้ดได้หลายกลิ่น
-- เช็ก dup ก่อน:
-- select barcode, count(*) from product_barcodes where coalesce(btrim(barcode),'')<>'' group by barcode having count(*)>1;
create unique index if not exists ux_product_barcodes_barcode
  on public.product_barcodes (barcode) where coalesce(btrim(barcode),'') <> '';

-- 3) สเป็ก (spec_options.label) ห้ามซ้ำ
-- เช็ก dup ก่อน:
-- select label, count(*) from spec_options group by label having count(*)>1;
create unique index if not exists ux_spec_options_label on public.spec_options (label);
