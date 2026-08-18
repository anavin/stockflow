-- รวมยอด 8 กลิ่นที่ import เข้ามาชื่อพิมพ์ต่าง → เปลี่ยนให้ตรงกับกลิ่นในระบบ (ทั้งปริมาตร + สติ๊กเกอร์)
-- เปลี่ยน scent + ref_key → ยอดเดิมวิ่งไปรวมกับกลิ่นจริงในกลุ่มเกรดถูก (ไม่หาย ไม่ซ้ำ)
-- ปลอดภัย: ทำเฉพาะเมื่อปลายทางยังไม่มีแถว (กัน unique violation) · รันซ้ำได้

-- (1) ปริมาตร (bulk) — ref_key = norm(scent)|labparfumo
update material_item mi
set scent = m.newname,
    ref_key = regexp_replace(lower(btrim(m.newname)), '[^a-z0-9ก-๙]', '', 'g') || '|labparfumo',
    updated_at = now()
from (values
  ('Volt - Aware',    'Volt - Aware (EDT)'),
  ('Volt - Benign',   'Volt - Benign (EDT)'),
  ('Volt - Elite',    'Volt - Elite (EDT)'),
  ('Volt - Nifty',    'Volt - Nifty (EDT)'),
  ('Volt - Savoury',  'Volt - Savoury (EDT)'),
  ('Volt - Twilight', 'Volt - Twilight (EDT)'),
  ('Gentel Elixir',   'Gentle Elixir'),
  ('Shadow Light',    'Shadow de Bacci Light')
) as m(oldscent, newname)
where mi.category = 'bulk'
  and regexp_replace(lower(btrim(mi.scent)), '[^a-z0-9ก-๙]', '', 'g')
      = regexp_replace(lower(btrim(m.oldscent)), '[^a-z0-9ก-๙]', '', 'g')
  and not exists (
    select 1 from material_item x
    where x.category = 'bulk'
      and x.ref_key = regexp_replace(lower(btrim(m.newname)), '[^a-z0-9ก-๙]', '', 'g') || '|labparfumo'
  );

-- (2) สติ๊กเกอร์ (label) — ref_key = norm(scent)|comp_key
update material_item mi
set scent = m.newname,
    ref_key = regexp_replace(lower(btrim(m.newname)), '[^a-z0-9ก-๙]', '', 'g') || '|' || mi.comp_key,
    updated_at = now()
from (values
  ('Volt - Aware',    'Volt - Aware (EDT)'),
  ('Volt - Benign',   'Volt - Benign (EDT)'),
  ('Volt - Elite',    'Volt - Elite (EDT)'),
  ('Volt - Nifty',    'Volt - Nifty (EDT)'),
  ('Volt - Savoury',  'Volt - Savoury (EDT)'),
  ('Volt - Twilight', 'Volt - Twilight (EDT)'),
  ('Gentel Elixir',   'Gentle Elixir'),
  ('Shadow Light',    'Shadow de Bacci Light')
) as m(oldscent, newname)
where mi.category = 'label'
  and mi.comp_key is not null
  and regexp_replace(lower(btrim(mi.scent)), '[^a-z0-9ก-๙]', '', 'g')
      = regexp_replace(lower(btrim(m.oldscent)), '[^a-z0-9ก-๙]', '', 'g')
  and not exists (
    select 1 from material_item x
    where x.category = 'label'
      and x.ref_key = regexp_replace(lower(btrim(m.newname)), '[^a-z0-9ก-๙]', '', 'g') || '|' || mi.comp_key
  );
