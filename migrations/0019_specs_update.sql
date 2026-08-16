-- อัพเดทรายการสเป็กชุดใหม่ (ปิดของเก่า → เปิด/เพิ่มชุดใหม่)
update spec_options set active = false;
insert into spec_options (label, sort, active, for_bag) values
  ('ฝาสีเงิน10ml', 1, true, false), ('ฝาสีดำ10ml', 2, true, false), ('ขวดกลม10ml', 3, true, false),
  ('สี่เหลี่ยม', 4, true, false), ('ซองซิป', 5, true, false), ('X-Secret', 6, true, false), ('Tryme', 7, true, false),
  ('ลูกเต๋า', 8, true, false), ('Pack', 9, true, false), ('Box Set', 10, true, false), ('ทรงสูง', 11, true, false),
  ('ขวด90', 12, true, false), ('Size S', 13, true, true), ('Size M', 14, true, true), ('Car Parfume', 15, true, false),
  ('1.2ml (45หลอด)', 16, true, false), ('น้ำปรุง', 17, true, false), ('Cloth', 18, true, false)
on conflict (label) do update set sort = excluded.sort, active = true, for_bag = excluded.for_bag;

-- ปรับกฎเลือกอัตโนมัติให้ชี้ชื่อสเป็กใหม่ (ฝาสีเงิน→ฝาสีเงิน10ml, ฝาสีดำ→ฝาสีดำ10ml)
update spec_rules set spec = 'ฝาสีเงิน10ml' where spec = 'ฝาสีเงิน';
update spec_rules set spec = 'ฝาสีดำ10ml'   where spec = 'ฝาสีดำ';
