-- ============================================================================
-- ล้างข้อมูล: ทำให้ชื่อกลิ่นทุกตารางสะกดเหมือน products.name (canonicalize)
-- แก้ปัญหา "Found peony" vs "Found Peony" (ต่างกันแค่ตัวพิมพ์/ช่องว่าง) ที่ทำให้
-- สต๊อกแตกเป็น 2 แถว และตอนรับเข้า/ตัดสต๊อกไปคนละก้อน
--
-- ⚠️ ก่อนรัน: สำรองข้อมูลก่อน (Supabase → Database → Backups) เผื่อพลาด
-- รันทั้งไฟล์ใน Supabase SQL Editor ครั้งเดียว (เป็น transaction — พลาด = ยกเลิกทั้งหมด)
-- แก้เฉพาะ "ชื่อกลิ่น" ให้ตรง products เท่านั้น (ไม่แตะ "ขนาด")
-- ============================================================================

-- ─── ส่วนที่ 1: PREVIEW (ดูก่อนว่าอะไรจะเปลี่ยน — รันเฉพาะ SELECT นี้ก่อนได้) ───
with canon as (
  select regexp_replace(lower(btrim(name)),'[^a-z0-9ก-๙]','','g') as k, min(name) as name
  from public.products where coalesce(btrim(name),'') <> '' group by 1
)
select 'order_items' as ตาราง, t.product as สะกดเดิม, c.name as จะเปลี่ยนเป็น, count(*) as กี่แถว
from public.order_items t join canon c
  on regexp_replace(lower(btrim(t.product)),'[^a-z0-9ก-๙]','','g') = c.k
where t.product <> c.name group by 1,2,3
union all
select 'stock', t.product, c.name, count(*)
from public.stock t join canon c on regexp_replace(lower(btrim(t.product)),'[^a-z0-9ก-๙]','','g') = c.k
where t.product <> c.name group by 1,2,3
union all
select 'stock_moves', t.product, c.name, count(*)
from public.stock_moves t join canon c on regexp_replace(lower(btrim(t.product)),'[^a-z0-9ก-๙]','','g') = c.k
where t.product <> c.name group by 1,2,3
union all
select 'stock_unit', t.product, c.name, count(*)
from public.stock_unit t join canon c on regexp_replace(lower(btrim(t.product)),'[^a-z0-9ก-๙]','','g') = c.k
where t.product <> c.name group by 1,2,3
union all
select 'product_barcodes', t.scent, c.name, count(*)
from public.product_barcodes t join canon c on regexp_replace(lower(btrim(t.scent)),'[^a-z0-9ก-๙]','','g') = c.k
where t.scent <> c.name group by 1,2,3
order by 1, 4 desc;


-- ─── ส่วนที่ 2: CLEANUP (รันจริง — ทั้งบล็อกเป็น transaction เดียว) ───
begin;

-- ตารางแมป: normalized key → ชื่อหลักจาก products
create temporary table _canon as
select regexp_replace(lower(btrim(name)),'[^a-z0-9ก-๙]','','g') as k, min(name) as name
from public.products where coalesce(btrim(name),'') <> '' group by 1;
create index on _canon (k);

-- 1) รายการในใบเบิก
update public.order_items t set product = c.name
from _canon c
where regexp_replace(lower(btrim(t.product)),'[^a-z0-9ก-๙]','','g') = c.k and t.product <> c.name;

-- 2) ประวัติการเคลื่อนไหวสต๊อก
update public.stock_moves t set product = c.name
from _canon c
where regexp_replace(lower(btrim(t.product)),'[^a-z0-9ก-๙]','','g') = c.k and t.product <> c.name;

-- 3) SKU รายชิ้น
update public.stock_unit t set product = c.name
from _canon c
where regexp_replace(lower(btrim(t.product)),'[^a-z0-9ก-๙]','','g') = c.k and t.product <> c.name;

-- 4) บาร์โค้ดต่อกลิ่น/ขนาด
update public.product_barcodes t set scent = c.name
from _canon c
where regexp_replace(lower(btrim(t.scent)),'[^a-z0-9ก-๙]','','g') = c.k and t.scent <> c.name;

-- 5) ยอดคงเหลือ (stock: PK = product+size → ต้อง "รวม qty" ไม่ใช่แค่ rename)
--    ก) ย้าย qty ของสะกดผิด ไปบวกเข้าแถวชื่อหลัก (สร้างแถวใหม่ถ้ายังไม่มี)
insert into public.stock (product, size, qty)
select c.name, s.size, sum(s.qty)
from public.stock s join _canon c
  on regexp_replace(lower(btrim(s.product)),'[^a-z0-9ก-๙]','','g') = c.k
where s.product <> c.name
group by c.name, s.size
on conflict (product, size) do update
  set qty = public.stock.qty + excluded.qty, updated_at = now();
--    ข) ลบแถวสะกดผิดออก
delete from public.stock s using _canon c
where regexp_replace(lower(btrim(s.product)),'[^a-z0-9ก-๙]','','g') = c.k and s.product <> c.name;

drop table _canon;
commit;

-- ─── ส่วนที่ 3: ตรวจซ้ำหลังล้าง (ควรได้ 0 แถว) ───
with canon as (
  select regexp_replace(lower(btrim(name)),'[^a-z0-9ก-๙]','','g') as k, min(name) as name
  from public.products where coalesce(btrim(name),'') <> '' group by 1
)
select t.product, c.name
from public.stock t join canon c on regexp_replace(lower(btrim(t.product)),'[^a-z0-9ก-๙]','','g') = c.k
where t.product <> c.name;
