-- ลบถุงกระดาษที่อยู่ "ผิดหมวด" (bulk=น้ำหอม / label=สติ๊กเกอร์) ออกจาก material_item
-- ⚠️ รัน check-paperbag-material.sql ก่อน — ถ้า "ประวัติเคลื่อนไหว" > 0 จะถูกลบตาม (cascade)
-- ✅ ไม่แตะ: ถุงกระดาษขาว ไซส์ S/M (category='packaging') · ถุงกระดาษ Size S/M ในสำเร็จรูป (คนละที่)
delete from material_item
 where category in ('bulk','label')
   and btrim(scent) = 'ถุงกระดาษ';

-- ตรวจซ้ำ (ควรได้ 0)
select count(*) as เหลือถุงกระดาษผิดหมวด
  from material_item where category in ('bulk','label') and btrim(scent) = 'ถุงกระดาษ';

-- ยืนยันแพ็คเกจยังอยู่ครบ
select label, category2 from material_item where category='packaging' and label ilike '%ถุง%' order by label;
