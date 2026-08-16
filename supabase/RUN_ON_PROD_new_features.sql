-- ============================================================================
-- รันบน Supabase (prod = public schema) ได้ปลอดภัย — idempotent ทั้งหมด
-- ครอบคลุมฟีเจอร์ใหม่: spec_options/spec_rules(0016-0017,0019) · เกรด(0018)
--   · ยกเลิกผลิต(0020-0021) · stock_moves.sku(0022) · stock_unit+sku_counters(0023)
-- ⚠️ ห้ามรันไฟล์ 10_platform_withdrawals.sql ทั้งไฟล์บน prod (มีบล็อก schema เดิม + repoint search_path)
-- รันไฟล์นี้ไฟล์เดียวพอ. รันซ้ำได้ ไม่พัง.
-- ============================================================================
set search_path to public;

-- 0016 spec_options: รายการสเป็กสินค้า (dropdown ตอนตัดสต๊อก) — แก้ไขได้
create table if not exists public.spec_options (
  id     serial primary key,
  label  text not null unique,
  sort   int  not null default 0,
  active boolean not null default true
);
insert into public.spec_options (label, sort) values
  ('ฝาสีเงิน', 1), ('สี่เหลี่ยม', 2), ('ซองซิป', 3), ('X-Secret', 4), ('ขวดกลม', 5),
  ('ลูกเต๋า', 6), ('ฝาสีดำ', 7), ('Pack', 8), ('Size S', 9), ('Size M', 10)
on conflict (label) do nothing;

-- 0017 spec: for_bag (สเป็กเฉพาะถุงกระดาษ) + spec_rules (เลือกสเป็กอัตโนมัติตามขนาด+Grade)
alter table public.spec_options add column if not exists for_bag boolean not null default false;
update public.spec_options set for_bag = true where label in ('Size S', 'Size M');
create table if not exists public.spec_rules (
  id serial primary key, sizes text not null, grades text not null,
  spec text not null, sort int not null default 0, active boolean not null default true);
insert into public.spec_rules (sizes, grades, spec, sort)
select * from (values
  ('10 ml','EDP','ฝาสีเงิน',1), ('10 ml','EDP+,PARFUM','ฝาสีดำ',2),
  ('50 ml','EDP','สี่เหลี่ยม',3), ('30 ml,50 ml','EDP+,PARFUM','ลูกเต๋า',4)
) as v(sizes, grades, spec, sort)
where not exists (select 1 from public.spec_rules);

-- 0018 อัพเดทเกรดต่อกลิ่น (จาก catalog ล่าสุด, Le Parfum→PARFUM, Volt→EDT)

-- EDP (67)
update public.products set ptype = 'EDP' where lower(btrim(name)) in (
  '1000 thousand',   'apple cinnamon',   'argentum',   'atlantis',
  'aqua',   'angel',   'beyond',   'blind magnolia',
  'buoyant',   'celeb',   'cherry dance',   'cherry shade',
  'cocoa gourmet',   'code red',   'dionysusx',   'dream island',
  'dynasty',   'eden',   'elite',   'excalibur (edp)',
  'feel light',   'found peony',   'fortuna',   'frisky',
  'gentle elixir',   'hercules',   'ischyros',   'la belle',
  'laven',   'legendary',   'lure',   'make way',
  'mellow',   'men in black',   'moonlight',   'never blue',
  'nouveau',   'oak&berry',   'passion',   'perfect pear',
  'persist',   'rosarine',   'rose oud',   'secret of peach',
  'senorita',   'shadow de bacci light',   'sicilia',   'silver',
  'soul of the fire',   'spring',   'soir',   'teenage dream',
  'tidy',   'vandal',   'velvet oud',   'victory',
  'vintage',   'virginx',   'vivid',   'voyage',
  'wealth',   'what (edp)',   'zeus',   'deep',
  'gemini',   'shine',   'prince'
);

-- EDP+ (8)
update public.products set ptype = 'EDP+' where lower(btrim(name)) in (
  'amber spangle',   'blackest black',   'impression',   'legend of oud',
  'luscious santal',   'patchouli absolute',   'sparkling mandarin',   'tropical leather'
);

-- EDT (13)
update public.products set ptype = 'EDT' where lower(btrim(name)) in (
  'relax',   'thai perfume (น้ำปรุง)',   'volt - aware (edt)',   'volt - benign (edt)',
  'volt - elite (edt)',   'volt - gentle (edt)',   'volt - nifty (edt)',   'volt - perfect pear (edt)',
  'volt - savoury (edt)',   'volt - twilight (edt)',   'volt - vandal (edt)',   'volt - what (edt)',
  'volt - you (edt)'
);

-- PARFUM (6)
update public.products set ptype = 'PARFUM' where lower(btrim(name)) in (
  'cerise sucree',   'excalibur extrait',   'gambling 34+35',   'queen',
  'savoury',   'what'
);

-- Car Perfume (4)
update public.products set ptype = 'Car Perfume' where lower(btrim(name)) in (
  'car parfumo cool mint',   'car parfumo earthy ozone',   'car parfumo fresh lemon',   'car parfumo ozone fresh'
);

-- 0019 อัพเดทรายการสเป็กชุดใหม่
-- อัพเดทรายการสเป็กชุดใหม่ (ปิดของเก่า → เปิด/เพิ่มชุดใหม่)
update public.spec_options set active = false;
insert into public.spec_options (label, sort, active, for_bag) values
  ('ฝาสีเงิน10ml', 1, true, false), ('ฝาสีดำ10ml', 2, true, false), ('ขวดกลม10ml', 3, true, false),
  ('สี่เหลี่ยม', 4, true, false), ('ซองซิป', 5, true, false), ('X-Secret', 6, true, false), ('Tryme', 7, true, false),
  ('ลูกเต๋า', 8, true, false), ('Pack', 9, true, false), ('Box Set', 10, true, false), ('ทรงสูง', 11, true, false),
  ('ขวด90', 12, true, false), ('Size S', 13, true, true), ('Size M', 14, true, true), ('Car Parfume', 15, true, false),
  ('1.2ml (45หลอด)', 16, true, false), ('น้ำปรุง', 17, true, false), ('Cloth', 18, true, false)
on conflict (label) do update set sort = excluded.sort, active = true, for_bag = excluded.for_bag;

-- ปรับกฎเลือกอัตโนมัติให้ชี้ชื่อสเป็กใหม่ (ฝาสีเงิน→ฝาสีเงิน10ml, ฝาสีดำ→ฝาสีดำ10ml)
update public.spec_rules set spec = 'ฝาสีเงิน10ml' where spec = 'ฝาสีเงิน';
update public.spec_rules set spec = 'ฝาสีดำ10ml'   where spec = 'ฝาสีดำ';

-- 0020 ยกเลิกการผลิตขนาด 90ml (Volt 4 กลิ่น)
-- ยกเลิกการผลิต "ขนาด 90 ml" ของ Volt 4 กลิ่น — ลบเฉพาะขนาด 90ml ออกจากรายการบาร์โค้ด
-- (กลิ่นยังใช้งานได้ปกติในขนาดอื่น)
delete from public.product_barcodes
 where lower(btrim(scent)) in (
   'volt - elite (edt)', 'volt - nifty (edt)', 'volt - savoury (edt)', 'volt - you (edt)')
   and regexp_replace(lower(size), '[^0-9a-z]', '', 'g') = '90ml';

-- 0021 เลิกผลิตต่อขนาด (discontinued_sku)
-- เลิกผลิตต่อขนาด (กลิ่น+ขนาด) — บล็อกไม่ให้เลือกขนาดนั้นตอนสร้างใบเบิก
create table if not exists public.discontinued_sku (
  id    serial primary key,
  scent text not null,
  size  text not null,
  unique (scent, size)
);

insert into public.discontinued_sku (scent, size) values
  -- 90 ml
  ('Volt - Elite (EDT)', '90 ml'), ('Volt - Nifty (EDT)', '90 ml'),
  ('Volt - Savoury (EDT)', '90 ml'), ('Volt - You (EDT)', '90 ml'),
  -- 50 ml
  ('Cherry Dance', '50 ml'), ('Ischyros', '50 ml'), ('Moon Light', '50 ml'),
  -- 30 ml
  ('Moon Light', '30 ml'), ('Volt - Benign (EDT)', '30 ml'), ('Volt - Elite (EDT)', '30 ml'),
  ('Volt - Nifty (EDT)', '30 ml'), ('Volt - Perfect Pear (EDT)', '30 ml'), ('Volt - Twilight (EDT)', '30 ml'),
  -- 10 ml
  ('1000 Thousand', '10 ml'), ('Cherry Dance', '10 ml'), ('Legendary', '10 ml'),
  ('Volt - Elite (EDT)', '10 ml'), ('Volt - Gentle (EDT)', '10 ml'), ('Volt - Nifty (EDT)', '10 ml'),
  ('Volt - Perfect Pear (EDT)', '10 ml'), ('Volt - Savoury (EDT)', '10 ml'), ('Volt - You (EDT)', '10 ml')
on conflict (scent, size) do nothing;

-- 0022 กำกับ SKU ในประวัติสต๊อก (รับเข้า)
alter table public.stock_moves add column if not exists sku text;

-- 0023 SKU รายชิ้น (serialization) — foundation
-- SKU รายชิ้น (serialization + ติดตาม): 1 แถว = 1 ชิ้น, sku ไม่ซ้ำ, รู้ว่าออกไปออเดอร์ไหน
create table if not exists public.sku_counters (
  prefix text primary key,
  seq    int  not null default 0
);

create table if not exists public.stock_unit (
  id          serial primary key,
  sku         text not null unique,          -- รหัสกลิ่น-ขนาด-เลขรัน เช่น THD-50-000123
  product     text not null,
  size        text not null,
  grade       text,
  barcode     text,                           -- EAN ต่อกลิ่น/ขนาด (คงที่)
  status      text not null default 'in_stock',  -- in_stock | issued | void
  order_no    text,                           -- ออเดอร์ที่ตัดออกไป (null = ยังอยู่คลัง)
  received_at timestamptz not null default now(),
  received_by int,
  issued_at   timestamptz,
  issued_by   int
);
create index if not exists idx_stock_unit_ps     on public.stock_unit (lower(btrim(product)), status);
create index if not exists idx_stock_unit_order  on public.stock_unit (order_no);
create index if not exists idx_stock_unit_status on public.stock_unit (status);
