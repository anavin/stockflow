-- ออกเลขใบเบิกใหม่ให้ 13 ใบที่เหลือ (Lazada 12 + Tiktok 1)
-- • ไม่แตะเลข SH- ของ Shopee (ไฟล์ Data-2 ใส่เลข Shopee ผิดให้ 9 ใบ Lazada เดือน พ.ค.)
-- • สร้างเลขใหม่รูปแบบ LZ-/TT- YY-MM-DD-#### ต่อลำดับถัดไปของวันนั้นจริง ๆ ตอนรัน
-- • idempotent: ใบที่มี doc_no แล้วจะถูกข้าม (รันซ้ำได้)
with tgt(order_no) as (values
  ('1004255263510557'),('1004370407749032'),('1004519250940738'),('1004951493184466'),
  ('1011267934036110'),('1011489103119418'),('1011709338204788'),('1011744768284281'),
  ('1011880704109826'),('1104524413896158'),('LZ-25-07-21-0016'),('LZ-25-11-06-0004'),
  ('584393455726528419')
),
d as (
  select o.order_no,
         case o.platform when 'Lazada' then 'LZ' when 'Tiktok' then 'TT' end as pfx,
         to_char(coalesce(o.order_date, o.doc_date), 'YY-MM-DD') as ymd
    from orders o join tgt on tgt.order_no = o.order_no
   where coalesce(o.doc_no,'') = ''
     and coalesce(o.order_date, o.doc_date) is not null
),
seq as (
  select d.order_no, d.pfx, d.ymd,
         (select coalesce(max((nullif(split_part(o2.doc_no,'-',5),''))::int), 0)
            from orders o2 where o2.doc_no like d.pfx || '-' || d.ymd || '-%')
         + row_number() over (partition by d.pfx, d.ymd order by d.order_no) as n
    from d where d.pfx is not null
)
update orders o
   set doc_no = seq.pfx || '-' || seq.ymd || '-' || lpad(seq.n::text, 4, '0'),
       updated_at = now()
  from seq
 where o.order_no = seq.order_no
   and not exists (select 1 from orders x
                    where x.doc_no = seq.pfx || '-' || seq.ymd || '-' || lpad(seq.n::text, 4, '0'));

-- ดูผลลัพธ์ 13 ใบ
select platform, order_no, doc_no from orders
 where order_no in (
  '1004255263510557','1004370407749032','1004519250940738','1004951493184466',
  '1011267934036110','1011489103119418','1011709338204788','1011744768284281',
  '1011880704109826','1104524413896158','LZ-25-07-21-0016','LZ-25-11-06-0004',
  '584393455726528419')
 order by platform, doc_no;
