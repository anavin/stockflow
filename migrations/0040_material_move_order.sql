-- ผูก material_move กับใบเบิก — ให้ตัด "ถุงกระดาษ" (คลัง packaging) ตอนตัดสต๊อกใบเบิก
-- แล้วยกเลิก/คืนได้แบบเดียวกับ stock_moves.order_no
alter table material_move add column if not exists order_no text;
create index if not exists idx_material_move_order on material_move (order_no) where order_no is not null;
