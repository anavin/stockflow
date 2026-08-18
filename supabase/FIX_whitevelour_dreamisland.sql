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
