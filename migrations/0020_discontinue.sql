-- ยกเลิกการผลิต "ขนาด 90 ml" ของ Volt 4 กลิ่น — ลบเฉพาะขนาด 90ml ออกจากรายการบาร์โค้ด
-- (กลิ่นยังใช้งานได้ปกติในขนาดอื่น)
delete from product_barcodes
 where lower(btrim(scent)) in (
   'volt - elite (edt)', 'volt - nifty (edt)', 'volt - savoury (edt)', 'volt - you (edt)')
   and regexp_replace(lower(size), '[^0-9a-z]', '', 'g') = '90ml';
