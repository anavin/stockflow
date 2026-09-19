-- แพ็ค (bundle) แก้ได้จากหน้า admin — สินค้า 1 listing = หลายขวดตายตัว → แตกเป็นกลิ่นย่อย
create table if not exists packs (
  id serial primary key,
  name text not null,
  match_text text not null,                 -- ค้นในชื่อสินค้า (substring, ไม่สนตัวพิมพ์)
  active boolean not null default true,
  sort int not null default 0,
  updated_at timestamptz default now()
);
create table if not exists pack_items (
  id serial primary key,
  pack_id int not null references packs(id) on delete cascade,
  product text not null,
  size text not null default '4 ml',
  is_free boolean not null default false,
  sort int not null default 0
);
create index if not exists idx_pack_items_pack on pack_items(pack_id);

-- seed Best Seller Pack (idempotent) — 6 best-seller + 1 แถม (4ml)
insert into packs (name, match_text, sort)
select 'Best Seller Pack', 'Best Seller Pack', 0
where not exists (select 1 from packs where name = 'Best Seller Pack');

insert into pack_items (pack_id, product, size, is_free, sort)
select p.id, v.product, '4 ml', v.is_free, v.sort
from packs p
cross join (values
  ('La Belle', false, 1),
  ('Senorita', false, 2),
  ('Secret of Peach', false, 3),
  ('Sicilia', false, 4),
  ('Never Blue', false, 5),
  ('Zeus', false, 6),
  ('Dream Island', true, 7)
) as v(product, is_free, sort)
where p.name = 'Best Seller Pack'
  and not exists (select 1 from pack_items pi where pi.pack_id = p.id);
