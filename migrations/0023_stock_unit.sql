-- SKU รายชิ้น (serialization + ติดตาม): 1 แถว = 1 ชิ้น, sku ไม่ซ้ำ, รู้ว่าออกไปออเดอร์ไหน
create table if not exists sku_counters (
  prefix text primary key,
  seq    int  not null default 0
);

create table if not exists stock_unit (
  id          serial primary key,
  sku         text not null unique,          -- รหัสกลิ่น-ขนาด-เลขรัน เช่น THD-50-000123
  product     text not null,
  size        text not null,
  grade       text,
  barcode     text,                           -- EAN ต่อกลิ่น/ขนาด (คงที่)
  status      text not null default 'in_stock',  -- in_stock | issued | void
  order_no    text,                           -- ออเดอร์ที่ตัดออกไป (null = ยังอยู่คลัง)
  received_at timestamptz not null default now(),
  received_by int,
  issued_at   timestamptz,
  issued_by   int
);
create index if not exists idx_stock_unit_ps    on stock_unit (lower(btrim(product)), status);
create index if not exists idx_stock_unit_order on stock_unit (order_no);
create index if not exists idx_stock_unit_status on stock_unit (status);
