-- ════════════════════════════════════════════════════════════════════════
-- RUN ON PROD (Supabase) — ค้าส่ง Eveandboy/King Power + 4ml assign + ตัดถุงผูกออเดอร์
-- รันทั้งไฟล์ได้เลย · idempotent (รันซ้ำปลอดภัย) · ครอบคลุม migration 0040/0041/0042
-- ปัญหาถ้าไม่รัน: สร้าง/บันทึกออเดอร์บน prod จะ error (คอลัมน์ po_version/branch_code หาย)
-- ════════════════════════════════════════════════════════════════════════

-- 0041: คอลัมน์ orders (ค้าส่ง) — ⚠️ สำคัญสุด กันสร้างออเดอร์ 500 ทุกแพลตฟอร์ม
alter table orders add column if not exists branch_code text;
alter table orders add column if not exists po_version text;

-- 0041: seed แพลตฟอร์มค้าส่ง (กัน orders_platform_fkey ล้ม)
insert into platforms (code, name, prefix, sort) values
  ('Eveandboy','Eveandboy','EVB',8),
  ('KingPower','King Power','KP',9)
on conflict (code) do nothing;

-- 0040: material_move ผูกออเดอร์ (ตัดสต๊อกถุงกระดาษต่อใบเบิก)
alter table material_move add column if not exists order_no text;
create index if not exists idx_material_move_order on material_move (order_no) where order_no is not null;

-- 0042: 4ml assign — แยก unit ที่ assign ตอนตัด (ยกเลิก=ลบ) vs ตัดจากคลังจริง (ยกเลิก=คืน)
alter table stock_unit add column if not exists assigned_at_issue boolean not null default false;

-- ── ตรวจผล (ควรได้ครบทุกแถว) ──
-- select column_name from information_schema.columns where table_name='orders' and column_name in ('branch_code','po_version');
-- select code from platforms where code in ('Eveandboy','KingPower');
-- select column_name from information_schema.columns where table_name='material_move' and column_name='order_no';
-- select column_name from information_schema.columns where table_name='stock_unit' and column_name='assigned_at_issue';
