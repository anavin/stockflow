-- ต้นตอจริง: ถุงกระดาษถูกลงทะเบียนเป็น "กลิ่น" (products) → ตัวสร้างเทมเพลตเลยสร้างแถวน้ำหอม/สติ๊กเกอร์ให้
-- ดู product ที่ไม่ใช่น้ำหอม (ถุง/ผ้า/แพ็ค) + grade(ptype) + ว่ามีในใบเบิกไหม (กันลบมั่ว)
select p.id, p.name, p.ptype as grade, p.active,
       (select count(*) from order_items oi
         where regexp_replace(lower(btrim(oi.product)),'[^a-z0-9ก-๙]','','g')
             = regexp_replace(lower(btrim(p.name)),'[^a-z0-9ก-๙]','','g')) as ใช้ในใบเบิก
  from products p
 where p.name ilike '%ถุง%' or p.name ilike '%bag%' or p.name ilike '%cloth%' or p.name ilike '%ผ้า%'
 order by p.name;
