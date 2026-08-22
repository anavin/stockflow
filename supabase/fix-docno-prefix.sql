-- แก้ doc_no ที่ prefix ไม่ตรงแพลตฟอร์ม (ผลข้างเคียงจากไฟล์เก่าที่ใส่เลขข้ามแพลตฟอร์ม)
-- ขอบเขต: เฉพาะ Lazada/Tiktok/Line/Website (ที่เพิ่งเติมวันนี้) — ไม่แตะ Shopee/Office
-- ออกเลขใหม่ตาม prefix ที่ถูก ต่อลำดับถัดไปของวันนั้น · idempotent (รันซ้ำได้ ไม่มี mismatch = no-op)
with m(platform, pfx) as (values ('Lazada','LZ'),('Tiktok','TT'),('Line','LM'),('Website','WE')),
bad as (
  select o.order_no, mm.pfx,
         to_char(coalesce(o.doc_date, o.order_date), 'YY-MM-DD') as ymd
    from orders o join m mm on mm.platform = o.platform
   where coalesce(o.doc_no,'') <> '' and o.deleted_at is null
     and split_part(o.doc_no,'-',1) <> mm.pfx
     and coalesce(o.doc_date, o.order_date) is not null
),
seq as (
  select bad.order_no, bad.pfx, bad.ymd,
         (select coalesce(max((nullif(split_part(o2.doc_no,'-',5),''))::int), 0)
            from orders o2 where o2.doc_no like bad.pfx || '-' || bad.ymd || '-%')
         + row_number() over (partition by bad.pfx, bad.ymd order by bad.order_no) as n
    from bad
)
update orders o
   set doc_no = seq.pfx || '-' || seq.ymd || '-' || lpad(seq.n::text, 4, '0'), updated_at = now()
  from seq
 where o.order_no = seq.order_no
   and not exists (select 1 from orders x
                    where x.doc_no = seq.pfx || '-' || seq.ymd || '-' || lpad(seq.n::text, 4, '0'));

-- ตรวจซ้ำ: ควรเหลือ 0 แถว
with m(platform, pfx) as (values ('Lazada','LZ'),('Tiktok','TT'),('Line','LM'),('Website','WE'))
select o.platform, split_part(o.doc_no,'-',1) as doc_prefix, count(*) as n
  from orders o join m on m.platform = o.platform
 where coalesce(o.doc_no,'') <> '' and o.deleted_at is null and split_part(o.doc_no,'-',1) <> m.pfx
 group by 1,2;
