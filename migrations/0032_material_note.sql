-- หมายเหตุต่อรายการวัตถุดิบ (ใส่ข้อมูลเพิ่มเติมได้ เช่น สูตร/ล็อต/โน้ต)
alter table material_item add column if not exists note text;
