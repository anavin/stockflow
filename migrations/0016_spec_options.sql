-- รายการสเป็กสินค้า (dropdown ตอนตัดสต๊อก) — แก้ไข/เพิ่ม/ปิดได้ในเมนูจัดการสเป็ก
create table if not exists spec_options (
  id     serial primary key,
  label  text not null unique,
  sort   int  not null default 0,
  active boolean not null default true
);

insert into spec_options (label, sort) values
  ('ฝาสีเงิน', 1), ('สี่เหลี่ยม', 2), ('ซองซิป', 3), ('X-Secret', 4), ('ขวดกลม', 5),
  ('ลูกเต๋า', 6), ('ฝาสีดำ', 7), ('Pack', 8), ('Size S', 9), ('Size M', 10)
on conflict (label) do nothing;
