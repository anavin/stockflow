-- ตัดสต๊อก "ถุงกระดาษ" ย้อนหลังให้ใบเบิกที่ตัดไปแล้ว (ตอนนั้นระบบยังข้ามถุง)
-- idempotent: รันซ้ำจะไม่ตัดเบิ้ล (เช็คจาก stock_moves reason='issue' ของถุงในออเดอร์นั้น)
-- ปรับ order/doc ที่บรรทัด v_key ให้ตรงกับใบที่ต้องการ
do $$
declare
  v_input text := '2609020NCJ48DG';         -- Order No.
  v_doc   text := 'SH-26-09-02-0008';        -- เลขที่ใบเบิก (เผื่อกรอก doc_no)
  v_key   text;
  v_by    int;
  r       record;
  m_product text; m_size text; v_bal float8;
begin
  select order_no, stock_issued_by into v_key, v_by
  from orders where order_no = v_input or doc_no = v_input or doc_no = v_doc
  order by (order_no = v_input) desc limit 1;
  if v_key is null then raise notice 'ไม่พบใบเบิก %', v_input; return; end if;

  for r in
    select oi.product, coalesce(oi.size,'') as size, oi.qty::float8 as qty
    from order_items oi
    where oi.order_no = v_key and oi.product ~ 'ถุง'
      and not exists (
        select 1 from stock_moves m
        where m.order_no = v_key and m.reason = 'issue'
          and regexp_replace(lower(m.product),'[^a-z0-9ก-๙]','','g') = regexp_replace(lower(oi.product),'[^a-z0-9ก-๙]','','g')
          and btrim(lower(m.size),' .') = btrim(lower(coalesce(oi.size,'')),' .')
      )
  loop
    -- จับแถว stock จริง (normalize ชื่อ/ขนาด) ถ้าไม่เจอใช้ค่าจากใบเบิก
    select product, size into m_product, m_size from stock
    where regexp_replace(lower(product),'[^a-z0-9ก-๙]','','g') = regexp_replace(lower(r.product),'[^a-z0-9ก-๙]','','g')
      and btrim(lower(size),' .') = btrim(lower(r.size),' .')
    order by (product = r.product) desc, (size = r.size) desc limit 1;
    if m_product is null then m_product := r.product; m_size := r.size; end if;

    insert into stock (product, size, qty, updated_at)
    values (m_product, m_size, -r.qty, now())
    on conflict (product, size) do update set qty = stock.qty - r.qty, updated_at = now()
    returning qty into v_bal;

    insert into stock_moves (product, size, qty_change, balance, reason, order_no, note, created_by)
    values (m_product, m_size, -r.qty, v_bal, 'issue', v_key, 'ตัดถุงย้อนหลัง', v_by);

    raise notice 'ตัดถุง % % จำนวน % → คงเหลือ %', m_product, m_size, r.qty, v_bal;
  end loop;
end $$;
