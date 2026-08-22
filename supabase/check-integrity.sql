-- ตรวจสุขภาพข้อมูล (read-only) — รันบน Supabase หลังเติม doc_no วันนี้
-- แต่ละ query โชว์ผลแยกกัน (เลือกทีละอันหรือรันทั้งหมดแล้วดูผลล่าสุด)

-- 1) doc_no ซ้ำ — ต้องได้ 0 แถว
select doc_no, count(*) n from orders
 where coalesce(doc_no,'')<>'' and deleted_at is null
 group by 1 having count(*)>1 order by 2 desc;

-- 2) ความครอบคลุม doc_no แยกแพลตฟอร์ม (missing = ยังไม่มีเลข)
select platform,
       count(*) filter (where coalesce(doc_no,'')<>'') as มีเลข,
       count(*) filter (where coalesce(doc_no,'')='')  as missing,
       count(*) as ทั้งหมด
  from orders where deleted_at is null group by 1 order by 3 desc;

-- 3) prefix ไม่ตรงแพลตฟอร์ม (เฉพาะ 4 แพลตฟอร์มที่เติมวันนี้) — ต้องได้ 0 แถว
with m(platform,pfx) as (values('Lazada','LZ'),('Tiktok','TT'),('Line','LM'),('Website','WE'))
select o.platform, split_part(o.doc_no,'-',1) as doc_prefix, count(*) n
  from orders o join m on m.platform=o.platform
 where coalesce(o.doc_no,'')<>'' and o.deleted_at is null and split_part(o.doc_no,'-',1)<>m.pfx
 group by 1,2 order by 3 desc;

-- 4) ออเดอร์ไม่มีวันที่เลย (จะไม่ถูกนับในรอบ 1 ก.ย.) — ควรได้ 0
select platform, count(*) n from orders
 where doc_date is null and order_date is null and deleted_at is null
 group by 1 order by 2 desc;

-- 5) สถานะเพี้ยน: ตัดสต๊อกโดยไม่มีเวลา / ส่งแล้วแต่ยังไม่ตัด — ควรได้ 0 ทั้งคู่
select
  count(*) filter (where stock_issued_by is not null and stock_issued_at is null) as ตัดแต่ไม่มีเวลา,
  count(*) filter (where shipped_at is not null and stock_issued_at is null)      as ส่งแต่ยังไม่ตัด
  from orders where deleted_at is null;
