-- index รองรับ query รายวัน (platformDaily/ordersToday/dailyIssueStatus) ที่ filter ตาม created_at
create index if not exists idx_orders_created_at on orders (created_at);
