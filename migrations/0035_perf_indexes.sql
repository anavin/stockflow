-- 0035 — ดัชนีเพิ่มประสิทธิภาพ query ที่ใช้บ่อย (จาก perf audit) — idempotent
-- ลดการ seq-scan ทั้งตารางบนหน้า dashboard/list/report/issue/return
create index if not exists idx_order_items_product   on order_items (product);
create index if not exists idx_orders_stock_issued_at on orders (stock_issued_at);
create index if not exists idx_orders_month_label     on orders (month_label);
create index if not exists idx_orders_platform_docdate on orders (platform, doc_date desc);
-- return-stats กรอง voided_at is null ทุกครั้ง → partial index เล็ก+ตรง
create index if not exists idx_order_returns_active   on order_returns (order_no) where voided_at is null;
