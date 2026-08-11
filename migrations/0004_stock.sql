-- Central stock: current levels + movement log + issue-tracking on orders.
create table if not exists stock (
  product    text not null,
  size       text not null,
  qty        numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (product, size)
);

create table if not exists stock_moves (
  id         serial primary key,
  product    text not null,
  size       text not null,
  qty_change numeric not null,       -- negative = ตัดออก (issue), positive = รับเข้า/ปรับขึ้น
  balance    numeric,                -- ยอดคงเหลือหลังเคลื่อนไหว
  reason     text not null,          -- 'issue' | 'receive' | 'adjust'
  order_no   text,                   -- อ้างอิงใบเบิก (เมื่อ reason='issue')
  note       text,
  created_by int,
  created_at timestamptz not null default now()
);
create index if not exists idx_stock_moves_order   on stock_moves (order_no);
create index if not exists idx_stock_moves_created  on stock_moves (created_at desc);
create index if not exists idx_stock_moves_ps       on stock_moves (product, size);

-- mark orders whose stock has been deducted (idempotency — กันตัดซ้ำ)
alter table orders add column if not exists stock_issued_at timestamptz;
alter table orders add column if not exists stock_issued_by int;
