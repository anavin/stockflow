-- (A) สเป็กสำหรับถุงกระดาษเท่านั้น (ซ่อนจาก dropdown ของสินค้าปกติ)
alter table spec_options add column if not exists for_bag boolean not null default false;
update spec_options set for_bag = true where label in ('Size S', 'Size M');

-- (B) กฎเลือกสเป็กอัตโนมัติตามขนาด + Grade → สเป็ก (แก้ไขได้ในเมนูจัดการสเป็ก)
--     sizes/grades เก็บเป็นข้อความคั่นด้วย comma (เช่น '30 ml,50 ml' / 'EDP+,PARFUM')
create table if not exists spec_rules (
  id     serial primary key,
  sizes  text not null,
  grades text not null,
  spec   text not null,
  sort   int  not null default 0,
  active boolean not null default true
);

insert into spec_rules (sizes, grades, spec, sort)
select * from (values
  ('10 ml',        'EDP',          'ฝาสีเงิน', 1),
  ('10 ml',        'EDP+,PARFUM',  'ฝาสีดำ',   2),
  ('50 ml',        'EDP',          'สี่เหลี่ยม', 3),
  ('30 ml,50 ml',  'EDP+,PARFUM',  'ลูกเต๋า',  4)
) as v(sizes, grades, spec, sort)
where not exists (select 1 from spec_rules);
