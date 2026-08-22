-- รายการออเดอร์ "ส่งแล้วแต่ยังไม่ตัดสต๊อก" ทั้งหมด (73 ใบ) — เอาไปเช็คหน้างาน
-- คอลัมน์: เลขที่ใบเบิก · Order No. · แพลตฟอร์ม · ผู้รับ · จังหวัด · วันที่ใบเบิก · วันที่ส่ง · ใครส่ง · จำนวนรายการ
select
  o.doc_no                                   as "เลขที่ใบเบิก",
  o.order_no                                 as "Order No.",
  o.platform                                 as "แพลตฟอร์ม",
  o.receiver                                 as "ผู้รับ",
  o.province                                 as "จังหวัด",
  to_char(coalesce(o.doc_date,o.order_date),'YYYY-MM-DD') as "วันที่ใบเบิก",
  to_char(o.shipped_at,'YYYY-MM-DD HH24:MI') as "วันที่ส่ง",
  coalesce(u.full_name, u.username, o.shipped_by::text) as "ใครส่ง",
  (select count(*) from order_items i where i.order_no = o.order_no) as "จำนวนรายการ"
from orders o
left join users u on u.id = o.shipped_by
where o.shipped_at is not null and o.stock_issued_at is null and o.deleted_at is null
order by o.shipped_at, o.platform, o.order_no;
