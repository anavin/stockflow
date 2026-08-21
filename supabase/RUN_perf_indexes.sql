-- ============================================================================
-- RUN_perf_indexes.sql — ดัชนีเพิ่มประสิทธิภาพ (รันครั้งเดียวบน Supabase SQL Editor)
-- ปลอดภัย: idempotent (if not exists) รันซ้ำได้ · สร้างเสร็จเร็ว (ตาราง ~6k แถว)
-- ลดภาระ DB บนหน้า dashboard / รายการใบเบิก / รายงาน / ตัดสต๊อก / รับคืน
-- ============================================================================
create index if not exists idx_order_items_product    on order_items (product);
create index if not exists idx_orders_stock_issued_at  on orders (stock_issued_at);
create index if not exists idx_orders_month_label      on orders (month_label);
create index if not exists idx_orders_platform_docdate on orders (platform, doc_date desc);
create index if not exists idx_order_returns_active    on order_returns (order_no) where voided_at is null;

-- ตรวจผล
select indexname from pg_indexes where tablename in ('orders','order_items','order_returns') order by indexname;
