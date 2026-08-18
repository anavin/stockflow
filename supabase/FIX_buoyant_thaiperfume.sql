-- แก้ข้อมูล 2 จุด · idempotent (รันซ้ำได้)
-- (1) บาร์โค้ด Buoyant 50 ml. → 8857128011775 (เดิม 8857128012021)
-- (2) เปลี่ยนชื่อ "Thai Perfume (น้ำปรุง)" → "Thai Perfume" ทุกตารางที่อ้างชื่อ

-- (1) Buoyant 50 ml.  — guard: ข้ามถ้าบาร์โค้ดปลายทางมีอยู่แล้ว (กันชน unique + run ซ้ำได้)
update product_barcodes
set barcode = '8857128011775'
where regexp_replace(lower(btrim(scent)), '[^a-z0-9ก-๙]', '', 'g') = 'buoyant'
  and regexp_replace(lower(size), '[^0-9a-z]', '', 'g') = '50ml'
  and barcode <> '8857128011775'
  and not exists (select 1 from product_barcodes b2 where b2.barcode = '8857128011775');

-- (2) rename "Thai Perfume (น้ำปรุง)" → "Thai Perfume"  (จับด้วยชื่อเดิมแบบ normalize)
-- ตัวช่วย: NK = normalize ของชื่อเดิม
-- products
update products set name = 'Thai Perfume'
where regexp_replace(lower(btrim(name)), '[^a-z0-9ก-๙]', '', 'g')
    = regexp_replace(lower(btrim('Thai Perfume (น้ำปรุง)')), '[^a-z0-9ก-๙]', '', 'g');
-- order_items
update order_items set product = 'Thai Perfume'
where regexp_replace(lower(btrim(product)), '[^a-z0-9ก-๙]', '', 'g')
    = regexp_replace(lower(btrim('Thai Perfume (น้ำปรุง)')), '[^a-z0-9ก-๙]', '', 'g');
-- stock (ถ้าปลายทางมีอยู่แล้วจะชน — ที่นี่ไม่มี "Thai Perfume" มาก่อน จึงปลอดภัย)
update stock set product = 'Thai Perfume'
where regexp_replace(lower(btrim(product)), '[^a-z0-9ก-๙]', '', 'g')
    = regexp_replace(lower(btrim('Thai Perfume (น้ำปรุง)')), '[^a-z0-9ก-๙]', '', 'g');
-- stock_moves
update stock_moves set product = 'Thai Perfume'
where regexp_replace(lower(btrim(product)), '[^a-z0-9ก-๙]', '', 'g')
    = regexp_replace(lower(btrim('Thai Perfume (น้ำปรุง)')), '[^a-z0-9ก-๙]', '', 'g');
-- stock_unit
update stock_unit set product = 'Thai Perfume'
where regexp_replace(lower(btrim(product)), '[^a-z0-9ก-๙]', '', 'g')
    = regexp_replace(lower(btrim('Thai Perfume (น้ำปรุง)')), '[^a-z0-9ก-๙]', '', 'g');
-- product_barcodes.scent
update product_barcodes set scent = 'Thai Perfume'
where regexp_replace(lower(btrim(scent)), '[^a-z0-9ก-๙]', '', 'g')
    = regexp_replace(lower(btrim('Thai Perfume (น้ำปรุง)')), '[^a-z0-9ก-๙]', '', 'g');
-- discontinued_sku / closed_sku (best-effort — อาจไม่มีตาราง/แถว)
update discontinued_sku set scent = 'Thai Perfume'
where regexp_replace(lower(btrim(scent)), '[^a-z0-9ก-๙]', '', 'g')
    = regexp_replace(lower(btrim('Thai Perfume (น้ำปรุง)')), '[^a-z0-9ก-๙]', '', 'g');
update closed_sku set scent = 'Thai Perfume'
where regexp_replace(lower(btrim(scent)), '[^a-z0-9ก-๙]', '', 'g')
    = regexp_replace(lower(btrim('Thai Perfume (น้ำปรุง)')), '[^a-z0-9ก-๙]', '', 'g');
-- material_item (ถ้ามี) — เปลี่ยน scent + ref_key (norm(newname)|<ส่วนหลัง>)
update material_item set scent = 'Thai Perfume',
    ref_key = 'thaiperfume|' || split_part(ref_key, '|', 2), updated_at = now()
where regexp_replace(lower(btrim(scent)), '[^a-z0-9ก-๙]', '', 'g')
    = regexp_replace(lower(btrim('Thai Perfume (น้ำปรุง)')), '[^a-z0-9ก-๙]', '', 'g')
  and not exists (
    select 1 from material_item x
    where x.category = material_item.category
      and x.ref_key = 'thaiperfume|' || split_part(material_item.ref_key, '|', 2)
  );
