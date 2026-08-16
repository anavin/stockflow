-- เลิกผลิตต่อขนาด (กลิ่น+ขนาด) — บล็อกไม่ให้เลือกขนาดนั้นตอนสร้างใบเบิก
create table if not exists discontinued_sku (
  id    serial primary key,
  scent text not null,
  size  text not null,
  unique (scent, size)
);

insert into discontinued_sku (scent, size) values
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
