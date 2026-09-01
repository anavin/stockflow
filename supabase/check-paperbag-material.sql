-- เช็คก่อนลบ: ถุงกระดาษที่อยู่ผิดหมวด (bulk/label) มีประวัติเคลื่อนไหว/สต๊อกผูกไหม
-- ถ้า qty=0 และ moves=0 ทุกแถว → ลบปลอดภัย (ไม่มีอะไรหาย)
select i.id, i.category, i.scent, i.label, i.ref_key,
       i.qty::float8 as คงเหลือ,
       (select count(*) from material_move m where m.item_id = i.id) as ประวัติเคลื่อนไหว
  from material_item i
 where i.category in ('bulk','label')
   and btrim(i.scent) = 'ถุงกระดาษ'
 order by i.category, i.label;
