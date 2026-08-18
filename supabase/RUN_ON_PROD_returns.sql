-- RUN_ON_PROD_returns.sql — ระบบรับคืนสินค้า (รันบน Supabase SQL Editor · idempotent)
-- ต้องรันก่อนใช้เมนู 'รับคืนสินค้า' / 'สต๊อกของชำรุด' บน prod

-- ระบบรับคืนสินค้า: คืนเข้าสต๊อก (restock) / ตีชำรุด (damaged)
-- ต่อยอด stock/stock_moves เดิม — เพิ่ม ledger ของคืน + คลังของเสีย + ธงสถานะบน orders.

-- ประวัติการคืนราย "บรรทัด" (audit ครบ + ใช้กันคืนเกินจำนวนที่ส่ง)
create table if not exists order_returns (
  id          serial primary key,
  order_no    text not null,
  line_no     int,
  product     text,
  size        text,
  qty         numeric not null,
  disposition text not null,          -- 'restock' | 'damaged'
  reason      text,
  note        text,
  voided_at   timestamptz,            -- ยกเลิกการคืน (ไม่ลบ เก็บ audit ไว้)
  created_by  int,
  created_at  timestamptz not null default now()
);
create index if not exists idx_order_returns_order   on order_returns (order_no);
create index if not exists idx_order_returns_created on order_returns (created_at desc);

-- คลังของชำรุด: ยอดคงเหลือต่อ SKU (คู่ขนานกับ stock — ไม่ปนสต๊อกขาย)
create table if not exists damaged (
  product    text not null,
  size       text not null,
  qty        numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (product, size)
);

-- ledger ของคลังของชำรุด (เข้าจากการคืน / ออกตอนทำลาย·เคลม·ซ่อม)
create table if not exists damaged_moves (
  id         serial primary key,
  product    text not null,
  size       text not null,
  qty_change numeric not null,        -- + เข้า (คืนชำรุด) · - ออก (ทำลาย/เคลม/ซ่อม)
  balance    numeric,
  reason     text not null,           -- 'return' | 'writeoff' | 'claim' | 'repair'
  ref        text,                    -- order_no (ตอนคืน) หรือหมายเหตุอ้างอิง
  note       text,
  created_by int,
  created_at timestamptz not null default now()
);
create index if not exists idx_damaged_moves_created on damaged_moves (created_at desc);
create index if not exists idx_damaged_moves_ps      on damaged_moves (product, size);

-- ธงสถานะการคืนบน orders (ไว้กรอง/โชว์ป้ายเร็ว)
alter table orders add column if not exists returned_at   timestamptz;
alter table orders add column if not exists return_status text not null default 'none';   -- none | partial | full
