-- ชื่อพ้องกลิ่น (alias): ชื่อที่แพลตฟอร์ม (Lazada/Shopee) เขียนไม่ตรงกับกลิ่นในระบบ → map เป็นชื่อจริง
-- ใช้ตอน import จับกลิ่น (matchMasterScent) · จัดการเอง/เดาอัตโนมัติในหน้า import
create table if not exists scent_aliases (
  id          serial primary key,
  alias_key   text not null unique,          -- normalize แล้ว (lowercase, ตัดอักขระพิเศษ) = คีย์จับคู่
  alias_text  text not null,                 -- ข้อความเดิมที่เห็น (ไว้โชว์)
  product     text not null,                 -- ชื่อกลิ่นจริงในระบบ (products.name)
  created_by  integer,
  created_at  timestamptz not null default now()
);
create index if not exists idx_scent_aliases_product on scent_aliases (product);

-- seed alias ที่ตั้งไว้ในโค้ดเดิม
insert into scent_aliases (alias_key, alias_text, product) values
  ('shadowdebacci', 'Shadow de bacci', 'Shadow de Bacci Light')
on conflict (alias_key) do nothing;
