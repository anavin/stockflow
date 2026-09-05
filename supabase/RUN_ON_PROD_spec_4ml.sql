-- ─────────────────────────────────────────────────────────────────────────
-- RUN ON PROD (Supabase → SQL Editor) — ครั้งเดียว
-- สเป็ก 4 ml → "ซองซิป"
--   1) เพิ่มกติกา auto-spec สำหรับ 4 ml (ทุกเกรด) → ตัด 4ml ครั้งต่อไปเติมสเป็กเอง
--   2) backfill แถว order_items เดิมที่เป็น 4 ml และ spec ว่าง → เติม "ซองซิป"
--      (ทำให้ ติดตาม SKU / PDF / Export โชว์ครบทันที ไม่ต้องแก้ทีละแถว)
-- ปลอดภัยรันซ้ำได้ (idempotent)
-- ─────────────────────────────────────────────────────────────────────────

-- 1) กติกา 4 ml → ซองซิป (เพิ่มเฉพาะถ้ายังไม่มี)
insert into public.spec_rules (sizes, grades, spec, sort)
select '4 ml', 'EDP,EDP+,PARFUM,EDT', 'ซองซิป',
       coalesce((select max(sort) from public.spec_rules), 4) + 1
where not exists (select 1 from public.spec_rules where btrim(sizes) = '4 ml');

-- 2) backfill 4 ml เดิมที่ spec ว่าง → ซองซิป (จับ "4 ml" แบบ normalize → ไม่โดน 40ml/14ml)
--    ต้องทำ 2 ตาราง: order_items (บันทึกตอนตัด) + stock_unit (แถวที่หน้า ติดตาม SKU อ่าน)
update public.order_items
set spec = 'ซองซิป'
where coalesce(btrim(spec), '') = ''
  and regexp_replace(lower(btrim(size)), '\s+', '', 'g') like '4ml%';

update public.stock_unit
set spec = 'ซองซิป'
where coalesce(btrim(spec), '') = ''
  and regexp_replace(lower(btrim(size)), '\s+', '', 'g') like '4ml%';

-- ตรวจผล (ควรเหลือ 0):
-- select count(*) from public.order_items
--  where coalesce(btrim(spec),'')='' and regexp_replace(lower(btrim(size)),'\s+','','g') like '4ml%';
