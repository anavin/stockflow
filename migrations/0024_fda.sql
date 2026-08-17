-- ข้อมูลจดแจ้ง อย. (FDA registration) + แจ้งเตือนใกล้หมดอายุ
create table if not exists fda_registrations (
  id          serial primary key,
  seq         int,                         -- ลำดับ
  product     text not null,               -- รายการ (ชื่อกลิ่น) — คีย์เชื่อมกับ products
  grade       text,                        -- TYPE (EDP/EDP+/PARFUM/EDT)
  reg_no      text,                        -- เลขที่จดแจ้ง อย.
  issue_date  date,                        -- ออกให้ ณ วันที่
  expiry_date date,                        -- วันที่สิ้นสุด
  fda_status  text,                        -- สถานะ อย (คงอยู่/สิ้นอายุ)
  prod_status text,                        -- สถานะผลิต (จำหน่าย/เลิกผลิต)
  name_en     text,
  name_th     text,
  brand       text,
  updated_at  timestamptz not null default now()
);
-- 1 กลิ่น = 1 การจดแจ้งที่ใช้งาน (upsert ตอน import ด้วยชื่อ normalize)
create unique index if not exists uq_fda_product on fda_registrations (regexp_replace(lower(btrim(product)),'[^a-z0-9ก-๙]','','g'));
create index if not exists idx_fda_expiry on fda_registrations (expiry_date);
