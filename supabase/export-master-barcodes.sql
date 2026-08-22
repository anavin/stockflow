-- ดึง master barcode ทั้งหมดจาก prod — รันบน Supabase SQL Editor แล้วกด "Download CSV"
-- คอลัมน์ "SKU_ว่าง" = ✅ แปลว่ายังไม่ได้ใส่ SKU (ควรเติม)
select
  scent                                  as "กลิ่น",
  size                                   as "ขนาด",
  grade                                  as "เกรด",
  sku                                    as "SKU",
  case when coalesce(sku,'')='' then '✅' else '' end as "SKU_ว่าง",
  barcode                                as "Barcode"
from product_barcodes
order by scent, size;

-- สรุปจำนวน
select count(*) as แถวทั้งหมด,
       count(*) filter (where coalesce(sku,'')<>'')     as มี_SKU,
       count(*) filter (where coalesce(sku,'')='')      as SKU_ว่าง,
       count(*) filter (where coalesce(barcode,'')<>'') as มี_barcode
from product_barcodes;
