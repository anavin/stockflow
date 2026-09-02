-- ผูก material_move กับใบเบิก — ให้ตัด "ถุงกระดาษ" (คลัง packaging) ตอนตัดสต๊อกใบเบิก
-- แล้วยกเลิก/คืนได้แบบเดียวกับ stock_moves.order_no
-- NOTE: prod บางเครื่องมี material_item แต่ยังไม่มี material_move (0029 รันไม่ครบ) → สร้างให้ก่อน
create table if not exists material_move (
  id serial primary key,
  item_id    int not null references material_item(id) on delete cascade,
  qty_change numeric not null,
  balance    numeric,
  reason     text not null,
  note       text,
  created_by int,
  created_at timestamptz not null default now()
);
create index if not exists idx_material_move_item    on material_move (item_id, created_at desc);
create index if not exists idx_material_move_created  on material_move (created_at desc);

alter table material_move add column if not exists order_no text;
create index if not exists idx_material_move_order on material_move (order_no) where order_no is not null;
