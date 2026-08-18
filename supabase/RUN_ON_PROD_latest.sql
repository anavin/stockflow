-- ========================================================================
-- Lab Parfumo · stockflow — SQL ล่าสุด (รันบน Supabase SQL Editor)
-- รวมทุกอย่างที่เพิ่มช่วงหลัง · idempotent ทั้งหมด (รันซ้ำได้ ปลอดภัย)
-- ========================================================================

-- 1) คลังวัตถุดิบ & บรรจุภัณฑ์ — ตารางหลัก (ถ้ายังไม่มี)
create table if not exists material_item (
  id serial primary key,
  category  text not null,
  ref_key   text not null,
  scent     text,
  comp_key  text,
  brand     text,
  grade     text,
  label     text not null,
  category2 text,
  unit      text not null default 'ชิ้น',
  qty       numeric not null default 0,
  sort      int not null default 0,
  updated_at timestamptz not null default now(),
  unique (category, ref_key)
);
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
create index if not exists idx_material_move_item   on material_move (item_id, created_at desc);
create index if not exists idx_material_move_created on material_move (created_at desc);

-- 2) จุดสั่งซื้อ (reorder point) + หมายเหตุ ต่อรายการ
alter table material_item add column if not exists reorder_point numeric;
alter table material_item add column if not exists note text;

-- 3) บันทึกการใช้งาน (activity log — เห็นเฉพาะ admin)
create table if not exists activity_log (
  id         bigserial primary key,
  user_id    int,
  username   text,
  role       text,
  action     text not null,
  detail     text,
  ip         text,
  created_at timestamptz not null default now()
);
create index if not exists idx_activity_created on activity_log (created_at desc);
create index if not exists idx_activity_user    on activity_log (user_id, created_at desc);

-- เสร็จ — ถ้ายังไม่เคยนำเข้าข้อมูลวัตถุดิบจาก Excel ให้รันไฟล์ IMPORT_materials_from_excel.sql ต่อ
