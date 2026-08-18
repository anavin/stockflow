-- ============================================================
-- RUN_ALL_FIXES.sql — รวมทุกไฟล์แก้ข้อมูล วางทีเดียวใน Supabase SQL Editor
-- ปลอดภัย: idempotent (run ซ้ำได้ไม่พัง) · ห่อ transaction เดียว
-- ============================================================
begin;

-- ═══════════════════════════════════════════════════════════
-- ▼▼▼ FIX_labels_ALL.sql ▼▼▼
-- ═══════════════════════════════════════════════════════════
-- ========================================================================
-- แก้ชิ้นส่วนสติ๊กเกอร์ให้ตรง catalog เกรด — รันครั้งเดียวบน Supabase SQL Editor
-- รวม 2 ส่วน (remap x_ + Volt-You  →  White velour EDP + Dream Island) · idempotent
-- ========================================================================

-- ===== ส่วนที่ 1: remap x_ → catalog + rename Volt-You =====
-- แก้ชิ้นส่วนสติ๊กเกอร์ที่ import มาแบบ key ชั่วคราว (x_) → key จริงใน catalog + rename Volt - You
-- idempotent · รันครั้งเดียวบน Supabase

-- (A) rename "Volt - You" → "Volt - You (EDT)" (bulk + label)
update material_item mi set scent='Volt - You (EDT)',
  ref_key = case when category='bulk' then 'voltyouedt|labparfumo' else 'voltyouedt|'||split_part(ref_key,'|',2) end, updated_at=now()
where category in ('bulk','label')
  and regexp_replace(lower(btrim(scent)),'[^a-z0-9ก-๙]','','g')='voltyou'
  and not exists (select 1 from material_item x where x.category=mi.category
    and x.ref_key = case when mi.category='bulk' then 'voltyouedt|labparfumo' else 'voltyouedt|'||split_part(mi.ref_key,'|',2) end);

-- (B) remap x_ → catalog key (ตามเกรดของ product) · เฉพาะที่มี key ปลายทาง (เกรดตรง)
update material_item mi
set comp_key = m.target,
    ref_key = regexp_replace(lower(btrim(mi.scent)),'[^a-z0-9ก-๙]','','g') || '|' || m.target,
    updated_at = now()
from products p, (values
  ('EDP','x_cardaccordsnotes','card'),
  ('EDP+','x_cardaccordsnotes','card'),
  ('PARFUM','x_cardaccordsnotes','card'),
  ('EDP','x_sticker12ml','s_12'),
  ('EDP+','x_sticker12ml','s_12'),
  ('PARFUM','x_sticker12ml','s_12'),
  ('EDP','x_stickerติดกล่อง10ml','box_edp_10'),
  ('EDP+','x_stickerติดกล่อง10ml','box_10'),
  ('PARFUM','x_stickerติดกล่อง10ml','box_10'),
  ('EDP+','x_stickerติดกล่อง30ml','box_30'),
  ('PARFUM','x_stickerติดกล่อง30ml','box_30'),
  ('EDP+','x_stickerติดกล่อง50ml','box_50'),
  ('PARFUM','x_stickerติดกล่อง50ml','box_50'),
  ('EDP','x_stickerติดกล่องedp','box_edp'),
  ('EDT','x_stickerติดกล่องedt','box_edt'),
  ('EDT','x_stickerติดขวด90ml','bottle_90'),
  ('EDP','x_stickerสคบ4ml','scb_4'),
  ('EDP+','x_stickerสคบ4ml','scb_4'),
  ('PARFUM','x_stickerสคบ4ml','scb_4'),
  ('EDP','x_stickerสคบ10ml','scb_10'),
  ('EDP+','x_stickerสคบ10ml','scb_10'),
  ('PARFUM','x_stickerสคบ10ml','scb_10'),
  ('EDT','x_stickerสคบ10ml','scb_10'),
  ('EDP','x_stickerสคบ30ml','scb_30'),
  ('EDP+','x_stickerสคบ30ml','scb_30'),
  ('PARFUM','x_stickerสคบ30ml','scb_30'),
  ('EDT','x_stickerสคบ30ml','scb_30'),
  ('EDP','x_stickerสคบ50ml','scb_50'),
  ('EDP+','x_stickerสคบ50ml','scb_50'),
  ('PARFUM','x_stickerสคบ50ml','scb_50'),
  ('EDT','x_stickerสคบ90ml','scb_90')
) as m(grade, xkey, target)
where mi.category='label' and mi.comp_key = m.xkey
  and regexp_replace(lower(btrim(p.name)),'[^a-z0-9ก-๙]','','g') = regexp_replace(lower(btrim(mi.scent)),'[^a-z0-9ก-๙]','','g')
  and (case when upper(coalesce(p.ptype,''))='EDP' then 'EDP'
            when upper(coalesce(p.ptype,''))='EDP+' then 'EDP+'
            when upper(coalesce(p.ptype,'')) like '%PARFUM%' then 'PARFUM'
            when upper(coalesce(p.ptype,''))='EDT' then 'EDT' end) = m.grade
  and not exists (select 1 from material_item x where x.category='label'
    and x.ref_key = regexp_replace(lower(btrim(mi.scent)),'[^a-z0-9ก-๙]','','g') || '|' || m.target);

-- ===== ส่วนที่ 2: White velour → EDP + Dream Island ตัด 30ml =====
-- White velour: เกรด EDT → EDP + Dream Island: ตัดกล่อง 30ml (ไม่มีใน EDP) · idempotent
-- (1) แก้เกรด White velour → EDP (product + material_item)
update products set ptype='EDP' where regexp_replace(lower(btrim(name)),'[^a-z0-9ก-๙]','','g')='whitevelour';
update material_item set grade='EDP' where regexp_replace(lower(btrim(scent)),'[^a-z0-9ก-๙]','','g')='whitevelour' and category in ('bulk','label');

-- (2) remap x_ → catalog (White velour เป็น EDP แล้ว ชิ้นส่วน EDP จะเข้าที่)
update material_item mi
set comp_key=m.target, ref_key=regexp_replace(lower(btrim(mi.scent)),'[^a-z0-9ก-๙]','','g')||'|'||m.target, updated_at=now()
from products p, (values
  ('EDP','x_cardaccordsnotes','card'),
  ('EDP+','x_cardaccordsnotes','card'),
  ('PARFUM','x_cardaccordsnotes','card'),
  ('EDP','x_sticker12ml','s_12'),
  ('EDP+','x_sticker12ml','s_12'),
  ('PARFUM','x_sticker12ml','s_12'),
  ('EDP','x_stickerติดกล่อง10ml','box_edp_10'),
  ('EDP+','x_stickerติดกล่อง10ml','box_10'),
  ('PARFUM','x_stickerติดกล่อง10ml','box_10'),
  ('EDP+','x_stickerติดกล่อง30ml','box_30'),
  ('PARFUM','x_stickerติดกล่อง30ml','box_30'),
  ('EDP+','x_stickerติดกล่อง50ml','box_50'),
  ('PARFUM','x_stickerติดกล่อง50ml','box_50'),
  ('EDP','x_stickerติดกล่องedp','box_edp'),
  ('EDT','x_stickerติดกล่องedt','box_edt'),
  ('EDT','x_stickerติดขวด90ml','bottle_90'),
  ('EDP','x_stickerสคบ4ml','scb_4'),
  ('EDP+','x_stickerสคบ4ml','scb_4'),
  ('PARFUM','x_stickerสคบ4ml','scb_4'),
  ('EDP','x_stickerสคบ10ml','scb_10'),
  ('EDP+','x_stickerสคบ10ml','scb_10'),
  ('PARFUM','x_stickerสคบ10ml','scb_10'),
  ('EDT','x_stickerสคบ10ml','scb_10'),
  ('EDP','x_stickerสคบ30ml','scb_30'),
  ('EDP+','x_stickerสคบ30ml','scb_30'),
  ('PARFUM','x_stickerสคบ30ml','scb_30'),
  ('EDT','x_stickerสคบ30ml','scb_30'),
  ('EDP','x_stickerสคบ50ml','scb_50'),
  ('EDP+','x_stickerสคบ50ml','scb_50'),
  ('PARFUM','x_stickerสคบ50ml','scb_50'),
  ('EDT','x_stickerสคบ90ml','scb_90')
) as m(grade,xkey,target)
where mi.category='label' and mi.comp_key=m.xkey
  and regexp_replace(lower(btrim(p.name)),'[^a-z0-9ก-๙]','','g')=regexp_replace(lower(btrim(mi.scent)),'[^a-z0-9ก-๙]','','g')
  and (case when upper(coalesce(p.ptype,''))='EDP' then 'EDP' when upper(coalesce(p.ptype,''))='EDP+' then 'EDP+' when upper(coalesce(p.ptype,'')) like '%PARFUM%' then 'PARFUM' when upper(coalesce(p.ptype,''))='EDT' then 'EDT' end)=m.grade
  and not exists (select 1 from material_item x where x.category='label' and x.ref_key=regexp_replace(lower(btrim(mi.scent)),'[^a-z0-9ก-๙]','','g')||'|'||m.target);

-- (3) Dream Island: ลบชิ้นส่วนกล่อง 30ml (EDP ไม่มีขนาดนี้)
delete from material_item where category='label' and comp_key='x_stickerติดกล่อง30ml'
  and regexp_replace(lower(btrim(scent)),'[^a-z0-9ก-๙]','','g')='dreamisland';

-- ═══════════════════════════════════════════════════════════
-- ▼▼▼ FIX_whitevelour_dreamisland.sql ▼▼▼
-- ═══════════════════════════════════════════════════════════
-- White velour: เกรด EDT → EDP + Dream Island: ตัดกล่อง 30ml (ไม่มีใน EDP) · idempotent
-- (1) แก้เกรด White velour → EDP (product + material_item)
update products set ptype='EDP' where regexp_replace(lower(btrim(name)),'[^a-z0-9ก-๙]','','g')='whitevelour';
update material_item set grade='EDP' where regexp_replace(lower(btrim(scent)),'[^a-z0-9ก-๙]','','g')='whitevelour' and category in ('bulk','label');

-- (2) remap x_ → catalog (White velour เป็น EDP แล้ว ชิ้นส่วน EDP จะเข้าที่)
update material_item mi
set comp_key=m.target, ref_key=regexp_replace(lower(btrim(mi.scent)),'[^a-z0-9ก-๙]','','g')||'|'||m.target, updated_at=now()
from products p, (values
  ('EDP','x_cardaccordsnotes','card'),
  ('EDP+','x_cardaccordsnotes','card'),
  ('PARFUM','x_cardaccordsnotes','card'),
  ('EDP','x_sticker12ml','s_12'),
  ('EDP+','x_sticker12ml','s_12'),
  ('PARFUM','x_sticker12ml','s_12'),
  ('EDP','x_stickerติดกล่อง10ml','box_edp_10'),
  ('EDP+','x_stickerติดกล่อง10ml','box_10'),
  ('PARFUM','x_stickerติดกล่อง10ml','box_10'),
  ('EDP+','x_stickerติดกล่อง30ml','box_30'),
  ('PARFUM','x_stickerติดกล่อง30ml','box_30'),
  ('EDP+','x_stickerติดกล่อง50ml','box_50'),
  ('PARFUM','x_stickerติดกล่อง50ml','box_50'),
  ('EDP','x_stickerติดกล่องedp','box_edp'),
  ('EDT','x_stickerติดกล่องedt','box_edt'),
  ('EDT','x_stickerติดขวด90ml','bottle_90'),
  ('EDP','x_stickerสคบ4ml','scb_4'),
  ('EDP+','x_stickerสคบ4ml','scb_4'),
  ('PARFUM','x_stickerสคบ4ml','scb_4'),
  ('EDP','x_stickerสคบ10ml','scb_10'),
  ('EDP+','x_stickerสคบ10ml','scb_10'),
  ('PARFUM','x_stickerสคบ10ml','scb_10'),
  ('EDT','x_stickerสคบ10ml','scb_10'),
  ('EDP','x_stickerสคบ30ml','scb_30'),
  ('EDP+','x_stickerสคบ30ml','scb_30'),
  ('PARFUM','x_stickerสคบ30ml','scb_30'),
  ('EDT','x_stickerสคบ30ml','scb_30'),
  ('EDP','x_stickerสคบ50ml','scb_50'),
  ('EDP+','x_stickerสคบ50ml','scb_50'),
  ('PARFUM','x_stickerสคบ50ml','scb_50'),
  ('EDT','x_stickerสคบ90ml','scb_90')
) as m(grade,xkey,target)
where mi.category='label' and mi.comp_key=m.xkey
  and regexp_replace(lower(btrim(p.name)),'[^a-z0-9ก-๙]','','g')=regexp_replace(lower(btrim(mi.scent)),'[^a-z0-9ก-๙]','','g')
  and (case when upper(coalesce(p.ptype,''))='EDP' then 'EDP' when upper(coalesce(p.ptype,''))='EDP+' then 'EDP+' when upper(coalesce(p.ptype,'')) like '%PARFUM%' then 'PARFUM' when upper(coalesce(p.ptype,''))='EDT' then 'EDT' end)=m.grade
  and not exists (select 1 from material_item x where x.category='label' and x.ref_key=regexp_replace(lower(btrim(mi.scent)),'[^a-z0-9ก-๙]','','g')||'|'||m.target);

-- (3) Dream Island: ลบชิ้นส่วนกล่อง 30ml (EDP ไม่มีขนาดนี้)
delete from material_item where category='label' and comp_key='x_stickerติดกล่อง30ml'
  and regexp_replace(lower(btrim(scent)),'[^a-z0-9ก-๙]','','g')='dreamisland';

-- ═══════════════════════════════════════════════════════════
-- ▼▼▼ FIX_buoyant_thaiperfume.sql ▼▼▼
-- ═══════════════════════════════════════════════════════════
-- แก้ข้อมูล 2 จุด · idempotent (รันซ้ำได้)
-- (1) บาร์โค้ด Buoyant 50 ml. → 8857128011775 (เดิม 8857128012021)
-- (2) เปลี่ยนชื่อ "Thai Perfume (น้ำปรุง)" → "Thai Perfume" ทุกตารางที่อ้างชื่อ

-- (1) Buoyant 50 ml.  — guard: ข้ามถ้าบาร์โค้ดปลายทางมีอยู่แล้ว (กันชน unique + run ซ้ำได้)
update product_barcodes
set barcode = '8857128011775'
where regexp_replace(lower(btrim(scent)), '[^a-z0-9ก-๙]', '', 'g') = 'buoyant'
  and regexp_replace(lower(size), '[^0-9a-z]', '', 'g') = '50ml'
  and barcode <> '8857128011775'
  and not exists (select 1 from product_barcodes b2 where b2.barcode = '8857128011775');

-- (2) rename "Thai Perfume (น้ำปรุง)" → "Thai Perfume"  (จับด้วยชื่อเดิมแบบ normalize)
-- ตัวช่วย: NK = normalize ของชื่อเดิม
-- products
update products set name = 'Thai Perfume'
where regexp_replace(lower(btrim(name)), '[^a-z0-9ก-๙]', '', 'g')
    = regexp_replace(lower(btrim('Thai Perfume (น้ำปรุง)')), '[^a-z0-9ก-๙]', '', 'g');
-- order_items
update order_items set product = 'Thai Perfume'
where regexp_replace(lower(btrim(product)), '[^a-z0-9ก-๙]', '', 'g')
    = regexp_replace(lower(btrim('Thai Perfume (น้ำปรุง)')), '[^a-z0-9ก-๙]', '', 'g');
-- stock (ถ้าปลายทางมีอยู่แล้วจะชน — ที่นี่ไม่มี "Thai Perfume" มาก่อน จึงปลอดภัย)
update stock set product = 'Thai Perfume'
where regexp_replace(lower(btrim(product)), '[^a-z0-9ก-๙]', '', 'g')
    = regexp_replace(lower(btrim('Thai Perfume (น้ำปรุง)')), '[^a-z0-9ก-๙]', '', 'g');
-- stock_moves
update stock_moves set product = 'Thai Perfume'
where regexp_replace(lower(btrim(product)), '[^a-z0-9ก-๙]', '', 'g')
    = regexp_replace(lower(btrim('Thai Perfume (น้ำปรุง)')), '[^a-z0-9ก-๙]', '', 'g');
-- stock_unit
update stock_unit set product = 'Thai Perfume'
where regexp_replace(lower(btrim(product)), '[^a-z0-9ก-๙]', '', 'g')
    = regexp_replace(lower(btrim('Thai Perfume (น้ำปรุง)')), '[^a-z0-9ก-๙]', '', 'g');
-- product_barcodes.scent
update product_barcodes set scent = 'Thai Perfume'
where regexp_replace(lower(btrim(scent)), '[^a-z0-9ก-๙]', '', 'g')
    = regexp_replace(lower(btrim('Thai Perfume (น้ำปรุง)')), '[^a-z0-9ก-๙]', '', 'g');
-- discontinued_sku / closed_sku (best-effort — อาจไม่มีตาราง/แถว)
update discontinued_sku set scent = 'Thai Perfume'
where regexp_replace(lower(btrim(scent)), '[^a-z0-9ก-๙]', '', 'g')
    = regexp_replace(lower(btrim('Thai Perfume (น้ำปรุง)')), '[^a-z0-9ก-๙]', '', 'g');
update closed_sku set scent = 'Thai Perfume'
where regexp_replace(lower(btrim(scent)), '[^a-z0-9ก-๙]', '', 'g')
    = regexp_replace(lower(btrim('Thai Perfume (น้ำปรุง)')), '[^a-z0-9ก-๙]', '', 'g');
-- material_item (ถ้ามี) — เปลี่ยน scent + ref_key (norm(newname)|<ส่วนหลัง>)
update material_item set scent = 'Thai Perfume',
    ref_key = 'thaiperfume|' || split_part(ref_key, '|', 2), updated_at = now()
where regexp_replace(lower(btrim(scent)), '[^a-z0-9ก-๙]', '', 'g')
    = regexp_replace(lower(btrim('Thai Perfume (น้ำปรุง)')), '[^a-z0-9ก-๙]', '', 'g')
  and not exists (
    select 1 from material_item x
    where x.category = material_item.category
      and x.ref_key = 'thaiperfume|' || split_part(material_item.ref_key, '|', 2)
  );

-- ═══════════════════════════════════════════════════════════
-- ▼▼▼ FIX_remap_orphan_materials.sql ▼▼▼
-- ═══════════════════════════════════════════════════════════
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

commit;
