-- แก้สต๊อกถุงกระดาษ: (A) ลบแถวถุงที่หลุดไปอยู่ในตาราง stock (ผิดตาราง)
--                    (B) ตัดถุงย้อนหลังจากคลังบรรจุภัณฑ์ (material_item p31/p32) ให้ใบที่ตัดไปแล้ว
-- ต้องรัน migrations/0040_material_move_order.sql (เพิ่ม material_move.order_no) ก่อน
-- idempotent: รันซ้ำไม่ตัดเบิ้ล (เช็คจาก material_move ที่ผูก order_no)

-- (A) ถุงไม่เคยควรอยู่ในตาราง stock — ลบแถว+ประวัติที่หลุดเข้าไป
delete from stock_moves where product ~ 'ถุง';
delete from stock       where product ~ 'ถุง';

-- (B) ตัดถุงจาก material_item ให้ทุกใบเบิกที่ "ตัดสต๊อกแล้ว" และยังไม่เคยตัดถุงจากคลังบรรจุภัณฑ์
do $$
declare
  r record; m_id int; v_bal float8; letter text;
begin
  for r in
    select oi.order_no,
           coalesce(nullif(btrim(oi.spec),''), oi.size, '') as bagsize,
           oi.qty::float8 as qty, o.stock_issued_by
    from order_items oi
    join orders o on o.order_no = oi.order_no
    where oi.product ~ 'ถุง'
      and o.stock_issued_at is not null
      and o.deleted_at is null
      and not exists (select 1 from material_move mm where mm.order_no = oi.order_no and mm.reason = 'issue')
  loop
    letter := upper(right(regexp_replace(r.bagsize,'[^A-Za-z]','','g'), 1));   -- "Size S" → 'S'
    if letter = '' then
      raise notice 'ข้าม % — ไม่รู้ไซส์ถุง (spec/size ว่าง)', r.order_no; continue;
    end if;
    select id into m_id from material_item
      where category = 'packaging' and label like 'ถุงกระดาษ%'
        and right(upper(regexp_replace(label,'[^A-Za-z]','','g')), 1) = letter
      order by id limit 1;
    if m_id is null then
      raise notice 'ข้าม % — ไม่พบถุงไซส์ % ในคลัง', r.order_no, letter; continue;
    end if;
    update material_item set qty = qty - r.qty, updated_at = now() where id = m_id returning qty::float8 into v_bal;
    insert into material_move (item_id, qty_change, balance, reason, note, order_no, created_by)
      values (m_id, -r.qty, v_bal, 'issue', 'ตัดถุงย้อนหลัง', r.order_no, r.stock_issued_by);
    raise notice 'ตัดถุงไซส์ % ให้ % จำนวน % → คงเหลือ %', letter, r.order_no, r.qty, v_bal;
  end loop;
end $$;
