-- ════════════════════════════════════════════════════════════════════════
-- PROD_FULL_SCHEMA.sql — schema เต็มของ platform-withdrawals (สร้างอัตโนมัติ)
-- สร้างจาก: scripts/gen-prod-schema.mjs (รวม migrations/*.sql เรียงลำดับ)
-- อัปเดตล่าสุด: 2026-09-04 · 43 migrations
--
-- ⚠️ อย่าแก้ไฟล์นี้ตรง ๆ — แก้ที่ migrations/ แล้วรัน `npm run gen:prod-schema`
-- วิธีใช้บน prod: Supabase → SQL Editor → วางทั้งไฟล์ → Run (idempotent รันซ้ำปลอดภัย)
-- ════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0001_init.sql
-- ───────────────────────────────────────────────────────────────────────
-- Initial schema for the platform-withdrawals app.
-- Runs verbatim on both PGlite (local dev) and Supabase Postgres (see
-- supabase/10_platform_withdrawals.sql for the schema-qualified + RLS version).
-- Always use IF NOT EXISTS so re-running is safe.

-- ---- master / reference ----------------------------------------------------
create table if not exists platforms (
  code   text primary key,
  name   text not null,
  prefix text not null,
  sort   int  not null default 0
);

create table if not exists products (
  id     serial primary key,
  name   text not null unique,
  active boolean not null default true,
  sort   int  not null default 0
);

create table if not exists sizes (
  id    serial primary key,
  label text not null unique,
  ml    numeric,
  sort  int not null default 0
);

create table if not exists postcodes (
  id       serial primary key,
  province text not null,
  district text not null,
  postcode text not null
);
create index if not exists idx_postcodes_province on postcodes (province);
create index if not exists idx_postcodes_postcode on postcodes (postcode);

-- ---- orders (Primary key = Order No.) --------------------------------------
create table if not exists orders (
  order_no       text primary key,                       -- ⭐ business key = Order No.
  platform       text not null default 'Shopee' references platforms(code),
  doc_no         text unique,                            -- เลขที่ใบเบิก SH-YY-MM-DD-####
  doc_date       date,
  month_label    text,                                   -- เดือนปี e.g. "ส.ค.-25"
  channel        text,
  shop_name      text,                                   -- ชื่อลูกค้า / ร้าน
  username       text,                                   -- ชื่อผู้ใช้ (แพลตฟอร์ม)
  receiver       text,                                   -- ชื่อผู้รับ
  phone          text,
  customer_type  text,                                   -- ลูกค้าใหม่ / ลูกค้าเก่า
  purchase_count int,                                    -- ซื้อครั้งที่
  district       text,
  province       text,
  postcode       text,
  address        text,
  campaign       text,
  note           text,
  box_scent      text,                                   -- ฉีดกลิ่นอะไรลงในกล่อง
  order_date     date,                                   -- วันที่ทำการสั่งซื้อ
  created_by     int,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_orders_doc_date on orders (doc_date);
create index if not exists idx_orders_platform on orders (platform);

create table if not exists order_items (
  id            serial primary key,
  order_no      text not null references orders(order_no) on delete cascade,
  line_no       int not null default 1,
  product       text,
  size          text,
  is_free       boolean not null default false,          -- คอลัมน์ Free
  qty           numeric not null default 1,
  unit          text not null default 'ขวด',
  product_label text,                                    -- ชื่อสินค้า (auto)
  sku           text
);
create index if not exists idx_order_items_order on order_items (order_no);

-- ---- doc-number counter (atomic per platform/day) --------------------------
create table if not exists counters (
  platform text not null,
  ymd      text not null,     -- 'YYMMDD'
  seq      int  not null default 0,
  primary key (platform, ymd)
);

-- ---- auth ------------------------------------------------------------------
create table if not exists users (
  id            serial primary key,
  username      text not null unique,
  password_hash text not null,
  full_name     text not null default '',
  role          text not null default 'staff',
  is_active     boolean not null default true,
  last_login_at timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists login_attempts (
  id         serial primary key,
  username   text not null,
  success    boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_login_attempts_username on login_attempts (username, created_at);

create table if not exists user_sessions (
  token            text primary key,
  user_id          int not null references users(id) on delete cascade,
  last_activity_at timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0002_trash.sql
-- ───────────────────────────────────────────────────────────────────────
-- Soft-delete (trash) support for orders.
alter table orders add column if not exists deleted_at timestamptz;
alter table orders add column if not exists deleted_by int;
create index if not exists idx_orders_deleted_at on orders (deleted_at);

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0003_customer_search.sql
-- ───────────────────────────────────────────────────────────────────────
-- Indexes to keep the customer autocomplete (username / phone / receiver) fast.
create index if not exists idx_orders_username on orders (lower(username));
create index if not exists idx_orders_phone    on orders (phone);
create index if not exists idx_orders_receiver on orders (lower(receiver));

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0004_stock.sql
-- ───────────────────────────────────────────────────────────────────────
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

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0005_session_expiry.sql
-- ───────────────────────────────────────────────────────────────────────
-- Session expiry: sessions must have a server-side TTL so a leaked token can't be
-- used forever. Also lets us clean up stale rows. Safe to re-run.
alter table user_sessions add column if not exists expires_at timestamptz;

-- Backfill existing rows to 7 days from their creation (matches cookie maxAge).
update user_sessions set expires_at = created_at + interval '7 days' where expires_at is null;

create index if not exists idx_user_sessions_expires on user_sessions (expires_at);

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0006_item_spec.sql
-- ───────────────────────────────────────────────────────────────────────
-- Verify-before-issue: employees enter/scan the picked SKU + product spec per line
-- during stock deduction. sku already exists; add spec. Safe to re-run.
alter table order_items add column if not exists spec text;

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0007_roles.sql
-- ───────────────────────────────────────────────────────────────────────
-- แยกบทบาทงาน 3 แบบ: admin (เจ้าของ) · creator (สร้างใบเบิก) · picker (จัดของ/ตัดสต๊อก)
-- ผู้ใช้เดิมที่เป็น 'staff' = ฝ่ายสร้างใบเบิก → ย้ายเป็น 'creator'
update users set role = 'creator' where role = 'staff';
alter table users alter column role set default 'creator';

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0008_product_code.sql
-- ───────────────────────────────────────────────────────────────────────
-- รหัสสินค้า/กลิ่น (code) — โชว์ + ค้นหาได้ในช่องเลือกกลิ่น (เหมือนโปรแกรม PO)
alter table products add column if not exists code text;

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0009_thai_postcodes.sql
-- ───────────────────────────────────────────────────────────────────────
-- รหัสไปรษณีย์ระดับตำบลทั้งประเทศ — พิมพ์รหัส → เลือกตำบล/อำเภอ/จังหวัดได้
create table if not exists thai_postcodes (
  id          serial primary key,
  province    text not null,
  district    text not null,
  subdistrict text not null,
  postcode    text not null
);
create index if not exists idx_thai_postcodes_zip on thai_postcodes (postcode);

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0010_order_subdistrict.sql
-- ───────────────────────────────────────────────────────────────────────
-- ตำบล/แขวง แยกช่อง (เติมจากรหัสไปรษณีย์)
alter table orders add column if not exists subdistrict text;

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0011_product_type.sql
-- ───────────────────────────────────────────────────────────────────────
-- ประเภทน้ำหอม (Le Parfum / EDP+ / EDT / EDP) ต่อกลิ่น — โชว์+เรียงในใบพิมพ์
alter table products add column if not exists ptype text;

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0012_ptype_parfum.sql
-- ───────────────────────────────────────────────────────────────────────
-- ปรับค่าประเภทน้ำหอมให้ตรงกับระบบขายหน้าร้าน CTW (lab-parfumo-central: products.grade)
-- CTW ใช้ค่า "PARFUM" ไม่ใช่ "Le Parfum" — แปลงค่าเดิมให้ตรงกัน (idempotent)
update products set ptype = 'PARFUM' where ptype = 'Le Parfum';

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0013_product_barcode.sql
-- ───────────────────────────────────────────────────────────────────────
-- Mapping ชื่อกลิ่น ↔ บาร์โค้ด (Code128) ให้ต่อกับระบบขายหน้าร้าน CTW
-- CTW (lab-parfumo-central) ผูกสินค้าด้วย products.barcode (unique) — เก็บ barcode ที่ตรงกันไว้บนกลิ่น
-- เพื่อใช้เป็นคีย์ join ข้ามระบบ (name ในระบบนี้ ↔ barcode/product_id ใน CTW)
alter table products add column if not exists barcode text;
create index if not exists idx_products_barcode on products (barcode);

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0014_ptype_mapping.sql
-- ───────────────────────────────────────────────────────────────────────
-- Mapping ประเภทน้ำหอมต่อกลิ่น (default จากเจ้าของ) — match case-insensitive + trim
-- ค่าตรงกับ CTW: PARFUM(=Le Parfum) / EDP+ / EDT / EDP

-- White velour ยังไม่มีในระบบ → เพิ่มใหม่ (EDT) ถ้ายังไม่มี
insert into products (name, ptype, active, sort)
select 'White velour', 'EDT', true, coalesce((select max(sort) from products),0)+1
 where not exists (select 1 from products where lower(btrim(name)) = 'white velour');

-- EDT (54 กลิ่น)  [Virgin X ในระบบ = VirginX]
update products set ptype = 'EDT' where lower(btrim(name)) in (
    '1000 thousand',     'angel',     'aqua',     'argentum',
    'atlantis',     'beyond',     'blind magnolia',     'buoyant',
    'cherry shade',     'code red',     'dream island',     'dynasty',
    'eden',     'excalibur (edp)',     'fortuna',     'found peony',
    'gentle elixir',     'hercules',     'ischyros',     'la belle',
    'lure',     'make way',     'moonlight',     'mellow',
    'never blue',     'nouveau',     'passion',     'persist',
    'rosarine',     'rose oud',     'secret of peach',     'senorita',
    'shadow de bacci light',     'sicilia',     'silver',     'soir',
    'teenage dream',     'vandal',     'velvet oud',     'victory',
    'vintage',     'virginx',     'vivid',     'voyage',
    'wealth',     'zeus',     'white velour',     'volt - nifty (edt)',
    'volt - elite (edt)',     'volt - twilight (edt)',     'volt - savoury (edt)',     'volt - aware (edt)',
    'volt - you (edt)',     'volt - benign (edt)'
);

-- EDP+ (7 กลิ่น)
update products set ptype = 'EDP+' where lower(btrim(name)) in (
    'amber spangle',     'legend of oud',     'luscious santal',     'patchouli absolute',
    'sparkling mandarin',     'tropical leather',     'blackest black'
);

-- PARFUM = Le Parfum (4 กลิ่น)  [Gambling34+35 ในระบบ = Gambling 34+35; What = ตัวเปล่า]
update products set ptype = 'PARFUM' where lower(btrim(name)) in (
    'gambling 34+35',     'queen',     'savoury',     'what'
);

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0015_product_barcodes.sql
-- ───────────────────────────────────────────────────────────────────────
-- product_barcodes: EAN-13 ต่อ (กลิ่น+ขนาด) ดึงจากระบบขายหน้าร้าน CTW (lab-parfumo-central)
-- ใช้แมตช์ barcode ที่ตรงกับแต่ละบรรทัดสินค้า (name + size) — barcode unique
create table if not exists product_barcodes (
  id      serial primary key,
  scent   text not null,
  size    text not null,
  barcode text not null unique,
  sku     text,
  grade   text
);
create index if not exists idx_pbc_lookup on product_barcodes (lower(btrim(scent)));

insert into product_barcodes (scent, size, barcode, sku, grade) values
  ('1000 Thousand', '50 ml.', '8857128011188', 'THD-50 ml', 'EDP'),
  ('Aqua', '50 ml.', '8857128012018', 'AQA-50 ml', 'EDP'),
  ('Argentum', '50 ml.', '8857128011232', 'ARM-50 ml', 'EDP'),
  ('Atlantis', '50 ml.', '8857128011416', 'ATS-50 ml', 'EDP'),
  ('Beyond', '50 ml.', '8857128011072', 'BED-50 ml', 'EDP'),
  ('Blind Magnolia', '50 ml.', '8857128011225', 'BMA-50 ml', 'EDP'),
  ('Buoyant', '50 ml.', '8857128012021', 'BUT-50 ml', 'EDP'),
  ('Cherry Dance', '50 ml.', '8857128011782', 'CEB-50 ml', 'EDP'),
  ('Cocoa Gourmet', '50 ml.', '8857128011126', 'COA-50 ml', 'EDP'),
  ('Code Red', '50 ml.', '8857128011423', 'CRD-50 ml', 'EDP'),
  ('Dream Island', '50 ml.', '8857128011300', 'DID-50 ml', 'EDP'),
  ('Dynasty', '50 ml.', '8857128011010', 'DYY-50 ml', 'EDP'),
  ('Eden', '50 ml.', '8857128011317', 'EDN-50 ml', 'EDP'),
  ('Excalibur (EDP)', '50 ml.', '8857128011133', 'EXR-50 ml', 'EDP'),
  ('Gentle Elixir', '50 ml.', '8857128012140', 'GER-50 ml', 'EDP'),
  ('Found Peony', '50 ml.', '8857128011218', 'FPY-50 ml', 'EDP'),
  ('Hercules', '50 ml.', '8857128011034', 'HES-50 ml', 'EDP'),
  ('La Belle', '50 ml.', '8857128011058', 'LBE-50 ml', 'EDP'),
  ('Legendary', '50 ml.', '8857128011454', 'LEY-50 ml', 'EDP'),
  ('Make Way', '50 ml.', '8857128012020', 'MWY-50 ml', 'EDP'),
  ('Mellow', '50 ml.', '8857128011249', 'MEL-50 ml', 'EDP'),
  ('Moon Light', '50 ml.', '8857128011089', 'MLT-50 ml', 'EDP'),
  ('Never Blue', '50 ml.', '8857128011287', 'NBE-50 ml', 'EDP'),
  ('Perfect Pear', '50 ml.', '8857128011201', 'PPR-50 ml', 'EDP'),
  ('Persist', '50 ml.', '8857128011041', 'PET-50 ml', 'EDP'),
  ('Secret of Peach', '50 ml.', '8857128011119', 'SPH-50 ml', 'EDP'),
  ('Senorita', '50 ml.', '8857128011171', 'SEA-50 ml', 'EDP'),
  ('Shadow De Bacci Light', '50 ml.', '8857128011294', 'SBT-50 ml', 'EDP'),
  ('Sicilia', '50 ml.', '8857128011140', 'SIA-50 ml', 'EDP'),
  ('Soir', '50 ml.', '8857128012144', 'SOR-50 ml', 'EDP'),
  ('Teenage Dream', '50 ml.', '8857128011096', 'TDM-50 ml', 'EDP'),
  ('Velvet Oud', '50 ml.', '8857128011522', 'VOD-50 ml', 'EDP'),
  ('Victory', '50 ml.', '8857128011164', 'VIY-50 ml', 'EDP'),
  ('Vintage', '50 ml.', '8857128011270', 'VIE-50 ml', 'EDP'),
  ('Virgin X', '50 ml.', '8857128011256', 'VIX-50 ml', 'EDP'),
  ('Vivid', '50 ml.', '8857128011065', 'VID-50 ml', 'EDP'),
  ('Voyage', '50 ml.', '8857128012019', 'VOE-50 ml', 'EDP'),
  ('Zeus', '50 ml.', '8857128011027', 'ZES-50 ml', 'EDP'),
  ('Amber Spangle', '50 ml.', '8857128011652', 'ASE-50 ml', 'EDP+'),
  ('Blackest Black', '50 ml.', '8857128011669', 'BBK-50 ml', 'EDP+'),
  ('Dionysus X', '50 ml.', '8857128011331', 'DIX-50 ml', 'EDP'),
  ('Impression', '50 ml.', '8857128011676', 'IMN-50 ml', 'EDP+'),
  ('Legend of Oud', '50 ml.', '8857128011683', 'LOD-50 ml', 'EDP+'),
  ('Luscious Santal', '50 ml.', '8857128011690', 'LSL-50 ml', 'EDP+'),
  ('Patchouli Absolute', '50 ml.', '8857128011706', 'PAE-50 ml', 'EDP+'),
  ('Rose Oud', '50 ml.', '8857128011386', 'ROD-50 ml', 'EDP+'),
  ('Sparkling Mandarin', '50 ml.', '8857128011713', 'SMN-50 ml', 'EDP+'),
  ('Tropical Leather', '50 ml.', '8857128011720', 'TLR-50 ml', 'EDP+'),
  ('Vandal', '50 ml.', '8857128011348', 'VAL-50 ml', 'EDP'),
  ('Wealth', '50 ml.', '8857128011379', 'WEH-50 ml', 'EDP'),
  ('Gambling34+35', '50 ml.', '8857128011591', 'GAG-50 ml', 'PARFUM'),
  ('Queen', '50 ml.', '8857128011607', 'QUN-50 ml', 'PARFUM'),
  ('Savoury', '50 ml.', '8857128011614', 'SAP-50 ml', 'PARFUM'),
  ('What', '50 ml.', '8857128011645', 'WHP-50 ml', 'PARFUM'),
  ('1000 Thousand', '4 ml.', '8857128012052', 'THD-4 ml', 'EDP'),
  ('Aqua', '4 ml.', '8857128012044', 'AQA-4 ml', 'EDP'),
  ('Beyond', '4 ml.', '8857128012033', 'BED-4 ml', 'EDP'),
  ('Blind Magnolia', '4 ml.', '8857128012066', 'BMA-4 ml', 'EDP'),
  ('Buoyant', '4 ml.', '8857128012078', 'BUT-4 ml', 'EDP'),
  ('Cherry Dance', '4 ml.', '8857128012121', 'CEB-4 ml', 'EDP'),
  ('Cocoa Gourmet', '4 ml.', '8857128012107', 'COA-4 ml', 'EDP'),
  ('Code Red', '4 ml.', '8857128012083', 'CRD-4 ml', 'EDP'),
  ('Dream Island', '4 ml.', '8857128012015', 'DID-4 ml', 'EDP'),
  ('Dynasty', '4 ml.', '8857128012129', 'DYY-4 ml', 'EDP'),
  ('Eden', '4 ml.', '8857128012059', 'EDN-4 ml', 'EDP'),
  ('Excalibur (EDP)', '4 ml.', '8857128012063', 'EXR-4 ml', 'EDP'),
  ('Gentle Elixir', '4 ml.', '8857128012143', 'GER-4 ml', 'EDP'),
  ('Found Peony', '4 ml.', '8857128012091', 'FPY-4 ml', 'EDP'),
  ('Hercules', '4 ml.', '8857128011546', 'HES-4 ml', 'EDP'),
  ('La Belle', '4 ml.', '8857128012016', 'LBE-4 ml', 'EDP'),
  ('Legendary', '4 ml.', '8857128012074', 'LEY-4 ml', 'EDP'),
  ('Make Way', '4 ml.', '8857128012049', 'MWY-4 ml', 'EDP'),
  ('Mellow', '4 ml.', '8857128012150', 'MEL-4 ml', 'EDP'),
  ('Moon Light', '4 ml.', '8857128012068', 'MLT-4 ml', 'EDP'),
  ('Never Blue', '4 ml.', '8857128012036', 'NBE-4 ml', 'EDP'),
  ('Perfect Pear', '4 ml.', '8857128012085', 'PPR-4 ml', 'EDP'),
  ('Persist', '4 ml.', '8857128012043', 'PET-4 ml', 'EDP'),
  ('Secret of Peach', '4 ml.', '8857128012038', 'SPH-4 ml', 'EDP'),
  ('Senorita', '4 ml.', '8857128012040', 'SEA-4 ml', 'EDP'),
  ('Shadow De Bacci Light', '4 ml.', '8857128012094', 'SBT-4 ml', 'EDP'),
  ('Sicilia', '4 ml.', '8857128012056', 'SIA-4 ml', 'EDP'),
  ('Soir', '4 ml.', '8857128012147', 'SOR-4 ml', 'EDP'),
  ('Teenage Dream', '4 ml.', '8857128012071', 'TDM-4 ml', 'EDP'),
  ('Velvet Oud', '4 ml.', '8857128012046', 'VOD-4 ml', 'EDP'),
  ('Victory', '4 ml.', '8857128011751', 'VIY-4 ml', 'EDP'),
  ('Vintage', '4 ml.', '8857128012080', 'VIE-4 ml', 'EDP'),
  ('Virgin X', '4 ml.', '8857128012054', 'VIX-4 ml', 'EDP'),
  ('Vivid', '4 ml.', '8857128012061', 'VID-4 ml', 'EDP'),
  ('Voyage', '4 ml.', '8857128012045', 'VOE-4 ml', 'EDP'),
  ('Zeus', '4 ml.', '8857128012017', 'ZES-4 ml', 'EDP'),
  ('Blackest Black', '4 ml.', '8857128012102', 'BBK-4 ml', 'EDP+'),
  ('Dionysus X', '4 ml.', '8857128012088', 'DIX-4 ml', 'EDP'),
  ('Impression', '4 ml.', '8857128012127', 'IMN-30 ml', 'EDP+'),
  ('Legend of Oud', '4 ml.', '8857128012111', 'LOD-4 ml', 'EDP+'),
  ('Luscious Santal', '4 ml.', '8857128012123', 'LSL-4 ml', 'EDP+'),
  ('Patchouli Absolute', '4 ml.', '8857128012115', 'PAE-4 ml', 'EDP+'),
  ('Sparkling Mandarin', '4 ml.', '8857128012109', 'SMN-4 ml', 'EDP+'),
  ('Tropical Leather', '4 ml.', '8857128012113', 'TLR-4 ml', 'EDP+'),
  ('Vandal', '4 ml.', '8857128012076', 'VAL-4 ml', 'EDP+'),
  ('Wealth', '4 ml.', '8857128012097', 'WEH-4 ml', 'EDP+'),
  ('Gambling34+35', '4 ml.', '8857128012104', 'GAG-4 ml', 'PARFUM'),
  ('Queen', '4 ml.', '8857128012117', 'QUN-4 ml', 'PARFUM'),
  ('Savoury', '4 ml.', '8857128012119', 'SAP-4 ml', 'PARFUM'),
  ('What', '4 ml.', '8857128012125', 'WHP-4 ml', 'PARFUM'),
  ('1000 Thousand', '30 ml.', '8857128012050', 'THD-30 ml', 'EDP'),
  ('Aqua', '30 ml.', '8857128012022', 'AQA-30 ml', 'EDP'),
  ('Atlantis', '30 ml.', '8857128011928', 'ATS-30 ml', 'EDP'),
  ('Beyond', '30 ml.', '8857128012031', 'BED-30 ml', 'EDP'),
  ('Blind Magnolia', '30 ml.', '8857128012064', 'BMA-30 ml', 'EDP'),
  ('Buoyant', '30 ml.', '8857128012025', 'AUT-30 ml', 'EDP'),
  ('Cherry Dance', '30 ml.', '8857128011959', 'CDY-30 ml', 'EDP'),
  ('Cocoa Gourmet', '30 ml.', '8857128012105', 'COA-30 ml', 'EDP'),
  ('Code Red', '30 ml.', '8857128012081', 'CRD-30 ml', 'EDP'),
  ('Dream Island', '30 ml.', '8857128011874', 'DID-30 ml', 'EDP'),
  ('Dynasty', '30 ml.', '8857128011812', 'AMS-30 ml', 'EDP'),
  ('Eden', '30 ml.', '8857128012057', 'EDN-30 ml', 'EDP'),
  ('Excalibur (EDP)', '30 ml.', '8857128011935', 'EXR-30 ml', 'EDP'),
  ('Gentle Elixir', '30 ml.', '8857128012141', 'GER-30 ml', 'EDP'),
  ('Found Peony', '30 ml.', '8857128012089', 'FPY-30 ml', 'EDP'),
  ('Hercules', '30 ml.', '8857128011737', 'HES-30 ml', 'EDP'),
  ('La Belle', '30 ml.', '8857128011904', 'LBE-30 ml', 'EDP'),
  ('Legendary', '30 ml.', '8857128012072', 'LEY-30 ml', 'EDP'),
  ('Make Way', '30 ml.', '8857128012024', 'MWY-30 ml', 'EDP'),
  ('Mellow', '30 ml.', '8857128012148', 'MEL-30 ml', 'EDP'),
  ('Moon Light', '30 ml.', '8857128012014', 'MOT-30 ml', 'EDP'),
  ('Never Blue', '30 ml.', '8857128011836', 'NBE-30 ml', 'EDP'),
  ('Perfect Pear', '30 ml.', '8857128011973', 'PPR-30 ml', 'EDP'),
  ('Persist', '30 ml.', '8857128011881', 'PET-30 ml', 'EDP'),
  ('Secret of Peach', '30 ml.', '8857128011850', 'SPH-30 ml', 'EDP'),
  ('Senorita', '30 ml.', '8857128011867', 'SEA-30 ml', 'EDP'),
  ('Shadow De Bacci Light', '30 ml.', '8857128012092', 'SBT-30 ml', 'EDP'),
  ('Sicilia', '30 ml.', '8857128011911', 'SIA-30 ml', 'EDP'),
  ('Soir', '30 ml.', '8857128012145', 'SOR-30 ml', 'EDP'),
  ('Teenage Dream', '30 ml.', '8857128012069', 'TDM-30 ml', 'EDP'),
  ('Velvet Oud', '30 ml.', '8857128012048', 'VOD-30 ml', 'EDP'),
  ('Victory', '30 ml.', '8857128011430', 'VIY-30 ml', 'EDP'),
  ('Vintage', '30 ml.', '8857128011966', 'VIE-30 ml', 'EDP'),
  ('Virgin X', '30 ml.', '8857128011997', 'VIX-30 ml', 'EDP'),
  ('Vivid', '30 ml.', '8857128011898', 'VID-30 ml', 'EDP'),
  ('Voyage', '30 ml.', '8857128012023', 'VOE-30 ml', 'EDP'),
  ('Zeus', '30 ml.', '8857128011843', 'ZES-30 ml', 'EDP'),
  ('Amber Spangle', '30 ml.', '8857128012004', 'ASE-30 ml', 'EDP+'),
  ('Blackest Black', '30 ml.', '8857128012005', 'BBK-30 ml', 'EDP+'),
  ('Dionysus X', '30 ml.', '8857128012086', 'DIX-30 ml', 'EDP'),
  ('Impression', '30 ml.', '8857128012006', 'AMN-30 ml', 'EDP+'),
  ('Legend of Oud', '30 ml.', '8857128012007', 'LOD-30 ml', 'EDP+'),
  ('Luscious Santal', '30 ml.', '8857128012008', 'LSL-30 ml', 'EDP+'),
  ('Patchouli Absolute', '30 ml.', '8857128012009', 'PAE-30 ml', 'EDP+'),
  ('Rose Oud', '30 ml.', '8857128011942', 'ROD-30 ml', 'EDP+'),
  ('Sparkling Mandarin', '30 ml.', '8857128012010', 'SMN-30 ml', 'EDP+'),
  ('Tropical Leather', '30 ml.', '8857128012011', 'TLR-30 ml', 'EDP+'),
  ('Vandal', '30 ml.', '8857128011980', 'VAL-30 ml', 'EDP'),
  ('Wealth', '30 ml.', '8857128012095', 'WEH-30 ml', 'EDP'),
  ('Queen', '30 ml.', '8857128012001', 'QUN-30 ml', 'PARFUM'),
  ('Savoury', '30 ml.', '8857128012002', 'SAY-30 ml', 'PARFUM'),
  ('What', '30 ml.', '8857128012013', 'WHA-30 ml', 'PARFUM'),
  ('1000 Thousand', '10 ml.', '8857128012051', 'THD-10 ml', 'EDP'),
  ('Aqua', '10 ml.', '8857128012026', 'AQA-10 ml', 'EDP'),
  ('Beyond', '10 ml.', '8857128012032', 'BED-10 ml', 'EDP'),
  ('Blind Magnolia', '10 ml.', '8857128012065', 'BMA-10 ml', 'EDP'),
  ('Buoyant', '10 ml.', '8857128012077', 'BUT-10 ml', 'EDP'),
  ('Cherry Dance', '10 ml.', '8857128012120', 'CEB-10 ml', 'EDP'),
  ('Cocoa Gourmet', '10 ml.', '8857128012106', 'COA-10 ml', 'EDP'),
  ('Code Red', '10 ml.', '8857128012082', 'CRD-10 ml', 'EDP'),
  ('Dream Island', '10 ml.', '8857128012030', 'DID-10 ml', 'EDP'),
  ('Dynasty', '10 ml.', '8857128012128', 'DYY-10 ml', 'EDP'),
  ('Eden', '10 ml.', '8857128012058', 'EDN-10 ml', 'EDP'),
  ('Excalibur (EDP)', '10 ml.', '8857128012062', 'EXR-10 ml', 'EDP'),
  ('Found Peony', '10 ml.', '8857128012090', 'FPY-10 ml', 'EDP'),
  ('Gentle Elixir', '10 ml.', '8857128012142', 'GER-10 ml', 'EDP'),
  ('Hercules', '10 ml.', '8857128011744', 'HES-10 ml', 'EDP'),
  ('La Belle', '10 ml.', '8857128012034', 'LBE-10 ml', 'EDP'),
  ('Legendary', '10 ml.', '8857128012073', 'LEY-10 ml', 'EDP'),
  ('Make Way', '10 ml.', '8857128012028', 'MWY-10 ml', 'EDP'),
  ('Mellow', '10 ml.', '8857128012149', 'MEL-10 ml', 'EDP'),
  ('Moon Light', '10 ml.', '8857128012067', 'MLT-10 ml', 'EDP'),
  ('Never Blue', '10 ml.', '8857128012035', 'NBE-10 ml', 'EDP'),
  ('Perfect Pear', '10 ml.', '8857128012084', 'PPR-10 ml', 'EDP'),
  ('Persist', '10 ml.', '8857128012042', 'PET-10 ml', 'EDP'),
  ('Secret of Peach', '10 ml.', '8857128012037', 'SPH-10 ml', 'EDP'),
  ('Senorita', '10 ml.', '8857128012039', 'SEA-10 ml', 'EDP'),
  ('Shadow De Bacci Light', '10 ml.', '8857128012093', 'SBT-10 ml', 'EDP'),
  ('Sicilia', '10 ml.', '8857128012055', 'SIA-10 ml', 'EDP'),
  ('Soir', '10 ml.', '8857128012146', 'SOR-10 ml', 'EDP'),
  ('Teenage Dream', '10 ml.', '8857128012070', 'TDM-10 ml', 'EDP'),
  ('Velvet Oud', '10 ml.', '8857128012047', 'VOD-10 ml', 'EDP'),
  ('Victory', '10 ml.', '8857128011263', 'VIY-10 ml', 'EDP'),
  ('Vintage', '10 ml.', '8857128012079', 'VIE-10 ml', 'EDP'),
  ('Virgin X', '10 ml.', '8857128012053', 'VIX-10 ml', 'EDP'),
  ('Vivid', '10 ml.', '8857128012060', 'VID-10 ml', 'EDP'),
  ('Voyage', '10 ml.', '8857128012027', 'VOE-10 ml', 'EDP'),
  ('Zeus', '10 ml.', '8857128012041', 'ZES-10 ml', 'EDP'),
  ('Blackest Black', '10 ml.', '8857128012101', 'BBK-10 ml', 'EDP+'),
  ('Dionysus X', '10 ml.', '8857128012087', 'DIX-10 ml', 'EDP'),
  ('Impression', '10 ml.', '8857128012126', 'IMN-30 ml', 'EDP+'),
  ('Legend of Oud', '10 ml.', '8857128012110', 'LOD-10 ml', 'EDP+'),
  ('Luscious Santal', '10 ml.', '8857128012122', 'LSL-10 ml', 'EDP+'),
  ('Patchouli Absolute', '10 ml.', '8857128012114', 'PAE-10 ml', 'EDP+'),
  ('Sparkling Mandarin', '10 ml.', '8857128012108', 'SMN-10 ml', 'EDP+'),
  ('Tropical Leather', '10 ml.', '8857128012112', 'TLR-10 ml', 'EDP+'),
  ('Vandal', '10 ml.', '8857128012075', 'VAL-10 ml', 'EDP'),
  ('Wealth', '10 ml.', '8857128012096', 'WEH-10 ml', 'EDP'),
  ('Gambling34+35', '10 ml.', '8857128012103', 'GAG-10 ml', 'PARFUM'),
  ('Queen', '10 ml.', '8857128012116', 'QUN-10 ml', 'PARFUM'),
  ('Savoury', '10 ml.', '8857128012118', 'SAP-10 ml', 'PARFUM'),
  ('What', '10 ml.', '8857128012124', 'WHP-10 ml', 'PARFUM'),
  ('1000 Thousand TRY ME!', '50 ml.', 'THM50', 'THM-50 ml', 'EDP'),
  ('Aqua TRY ME!', '50 ml.', 'AQM50', 'AQM-50 ml', 'EDP'),
  ('Argentum TRY ME!', '50 ml.', 'AMM50', 'AMM-50 ml', 'EDP'),
  ('Atlantis TRY ME!', '50 ml.', 'ATM50', 'ATM-50 ml', 'EDP'),
  ('Beyond TRY ME!', '50 ml.', 'BYM50', 'BYM-50 ml', 'EDP'),
  ('Blind Magnolia TRY ME!', '50 ml.', 'BMM50', 'BMM-50 ml', 'EDP'),
  ('Buoyant TRY ME!', '50 ml.', 'BUM50', 'BUM-50 ml', 'EDP'),
  ('Cherry Dance TRY ME!', '50 ml.', 'CDM50', 'CDM-50 ml', 'EDP'),
  ('Cocoa Gourmet TRY ME!', '50 ml.', 'CGM50', 'CGM-50 ml', 'EDP'),
  ('Code Red TRY ME!', '50 ml.', 'CRM50', 'CRM-50 ml', 'EDP'),
  ('Dream Island TRY ME!', '50 ml.', 'DIM50', 'DIM-50 ml', 'EDP'),
  ('Dynasty TRY ME!', '50 ml.', 'DYM50', 'DYM-50 ml', 'EDP'),
  ('Eden TRY ME!', '50 ml.', 'EDM50', 'EDM-50 ml', 'EDP'),
  ('Excalibur (EDP) TRY ME!', '50 ml.', 'EXM50', 'EXM-50 ml', 'EDP'),
  ('Found Peony TRY ME!', '50 ml.', 'FPM50', 'FPM-50 ml', 'EDP'),
  ('Gentle Elixir TRY ME!', '50 ml.', 'GER50', 'GEM-50 ml', 'EDP'),
  ('Hercules TRY ME!', '50 ml.', 'HEM50', 'HEM-50 ml', 'EDP'),
  ('La Belle TRY ME!', '50 ml.', 'LBM50', 'LBM-50 ml', 'EDP'),
  ('Legendary TRY ME!', '50 ml.', 'LEM50', 'LEM-50 ml', 'EDP'),
  ('Make Way TRY ME!', '50 ml.', 'MWM50', 'MWM-50 ml', 'EDP'),
  ('Moon Light TRY ME!', '50 ml.', 'MLM50', 'MLM-50 ml', 'EDP'),
  ('Never Blue TRY ME!', '50 ml.', 'NBM50', 'NBM-50 ml', 'EDP'),
  ('Perfect Pear TRY ME!', '50 ml.', 'PPM50', 'PPM-50 ml', 'EDP'),
  ('Persist TRY ME!', '50 ml.', 'PEM50', 'PEM-50 ml', 'EDP'),
  ('Secret of Peach TRY ME!', '50 ml.', 'SPM50', 'SPM-50 ml', 'EDP'),
  ('Senorita TRY ME!', '50 ml.', 'SEM50', 'SEM-50 ml', 'EDP'),
  ('Shadow De Bacci Light TRY ME!', '50 ml.', 'SLM50', 'SLM-50 ml', 'EDP'),
  ('Sicilia TRY ME!', '50 ml.', 'SIM50', 'SIM-50 ml', 'EDP'),
  ('Soir TRY ME!', '50 ml.', 'SOM50', 'SOM-50 ml', 'EDP'),
  ('Teenage Dream TRY ME!', '50 ml.', 'TEM50', 'TEM-50 ml', 'EDP'),
  ('Velvet Oud TRY ME!', '50 ml.', 'VOM50', 'VOM-50 ml', 'EDP'),
  ('Victory TRY ME!', '50 ml.', 'VYM50', 'VYM-50 ml', 'EDP'),
  ('Vintage TRY ME!', '50 ml.', 'VEM50', 'VEM-50 ml', 'EDP'),
  ('Virgin X TRY ME!', '50 ml.', 'VXM50', 'VXM-50 ml', 'EDP'),
  ('Vivid TRY ME!', '50 ml.', 'VIM50', 'VIM-50 ml', 'EDP'),
  ('Voyage TRY ME!', '50 ml.', 'VGM50', 'VGM-50 ml', 'EDP'),
  ('Zeus TRY ME!', '50 ml.', 'ZEM50', 'ZEM-50 ml', 'EDP'),
  ('Amber Spangle TRY ME!', '50 ml.', 'ASM50', 'ASM-50 ml', 'EDP+'),
  ('Blackest Black TRY ME!', '50 ml.', 'BBM50', 'BBM-50 ml', 'EDP+'),
  ('Dionysus X TRY ME!', '50 ml.', 'DXM50', 'DXM-50 ml', 'EDP+'),
  ('Impression TRY ME!', '50 ml.', 'IMM50', 'IMM-50 ml', 'EDP+'),
  ('Legend of Oud TRY ME!', '50 ml.', 'LOM50', 'LOM-50 ml', 'EDP+'),
  ('Luscious Santal TRY ME!', '50 ml.', 'LSM50', 'LSM-50 ml', 'EDP+'),
  ('Patchouli Absolute TRY ME!', '50 ml.', 'PAM50', 'PAM-50 ml', 'EDP+'),
  ('Rose Oud TRY ME!', '50 ml.', 'ROM50', 'ROM-50 ml', 'EDP+'),
  ('Sparkling Mandarin TRY ME!', '50 ml.', 'SMM50', 'SMM-50 ml', 'EDP+'),
  ('Tropical Leather TRY ME!', '50 ml.', 'TLM50', 'TLM-50 ml', 'EDP+'),
  ('Vandal TRY ME!', '50 ml.', 'VAM50', 'VAM-50 ml', 'EDP+'),
  ('Wealth TRY ME!', '50 ml.', 'WEM50', 'WEM-50 ml', 'EDP+'),
  ('Gambling34+35 TRY ME!', '50 ml.', 'GAM50', 'GAM-50 ml', 'PARFUM'),
  ('Queen TRY ME!', '50 ml.', 'QUM50', 'QUM-50 ml', 'PARFUM'),
  ('Savoury TRY ME!', '50 ml.', 'SAM50', 'SAM-50 ml', 'PARFUM'),
  ('What TRY ME!', '50 ml.', 'WHM50', 'WHM-50 ml', 'PARFUM'),
  ('1000 Thousand TRY ME!', '30 ml.', 'THM30', 'THM-30 ml', 'EDP'),
  ('Aqua TRY ME!', '30 ml.', 'AQM30', 'AQM-30 ml', 'EDP'),
  ('Argentum TRY ME!', '30 ml.', 'AMM30', 'AMM-30 ml', 'EDP'),
  ('Atlantis TRY ME!', '30 ml.', 'ATM30', 'ATM-30 ml', 'EDP'),
  ('Beyond TRY ME!', '30 ml.', 'BYM30', 'BYM-30 ml', 'EDP'),
  ('Blind Magnolia TRY ME!', '30 ml.', 'BMM30', 'BMM-30 ml', 'EDP'),
  ('Buoyant TRY ME!', '30 ml.', 'BUM30', 'BUM-30 ml', 'EDP'),
  ('Cherry Dance TRY ME!', '30 ml.', 'CDM30', 'CDM-30 ml', 'EDP'),
  ('Cocoa Gourmet TRY ME!', '30 ml.', 'CGM30', 'CGM-30 ml', 'EDP'),
  ('Code Red TRY ME!', '30 ml.', 'CRM30', 'CRM-30 ml', 'EDP'),
  ('Dream Island TRY ME!', '30 ml.', 'DIM30', 'DIM-30 ml', 'EDP'),
  ('Dynasty TRY ME!', '30 ml.', 'DYM30', 'DYM-30 ml', 'EDP'),
  ('Eden TRY ME!', '30 ml.', 'EDM30', 'EDM-30 ml', 'EDP'),
  ('Excalibur (EDP) TRY ME!', '30 ml.', 'EXM30', 'EXM-30 ml', 'EDP'),
  ('Found Peony TRY ME!', '30 ml.', 'FPM30', 'FPM-30 ml', 'EDP'),
  ('Gentle Elixir TRY ME!', '30 ml.', 'GER30', 'GEM-30 ml', 'EDP'),
  ('Hercules TRY ME!', '30 ml.', 'HEM30', 'HEM-30 ml', 'EDP'),
  ('La Belle TRY ME!', '30 ml.', 'LBM30', 'LBM-30 ml', 'EDP'),
  ('Legendary TRY ME!', '30 ml.', 'LEM30', 'LEM-30 ml', 'EDP'),
  ('Make Way TRY ME!', '30 ml.', 'MWM30', 'MWM-30 ml', 'EDP'),
  ('Moon Light TRY ME!', '30 ml.', 'MLM30', 'MLM-30 ml', 'EDP'),
  ('Never Blue TRY ME!', '30 ml.', 'NBM30', 'NBM-30 ml', 'EDP'),
  ('Perfect Pear TRY ME!', '30 ml.', 'PPM30', 'PPM-30 ml', 'EDP'),
  ('Persist TRY ME!', '30 ml.', 'PEM30', 'PEM-30 ml', 'EDP'),
  ('Secret of Peach TRY ME!', '30 ml.', 'SPM30', 'SPM-30 ml', 'EDP'),
  ('Senorita TRY ME!', '30 ml.', 'SEM30', 'SEM-30 ml', 'EDP'),
  ('Shadow De Bacci Light TRY ME!', '30 ml.', 'SLM30', 'SLM-30 ml', 'EDP'),
  ('Sicilia TRY ME!', '30 ml.', 'SIM30', 'SIM-30 ml', 'EDP'),
  ('Soir TRY ME!', '30 ml.', 'SOM30', 'SOM-30 ml', 'EDP'),
  ('Teenage Dream TRY ME!', '30 ml.', 'TEM30', 'TEM-30 ml', 'EDP'),
  ('Velvet Oud TRY ME!', '30 ml.', 'VOM30', 'VOM-30 ml', 'EDP'),
  ('Victory TRY ME!', '30 ml.', 'VYM30', 'VYM-30 ml', 'EDP'),
  ('Vintage TRY ME!', '30 ml.', 'VEM30', 'VEM-30 ml', 'EDP'),
  ('Virgin X TRY ME!', '30 ml.', 'VXM30', 'VXM-30 ml', 'EDP'),
  ('Vivid TRY ME!', '30 ml.', 'VIM30', 'VIM-30 ml', 'EDP'),
  ('Voyage TRY ME!', '30 ml.', 'VGM30', 'VGM-30 ml', 'EDP'),
  ('Zeus TRY ME!', '30 ml.', 'ZEM30', 'ZEM-30 ml', 'EDP'),
  ('Amber Spangle TRY ME!', '30 ml.', 'ASM30', 'ASM-30 ml', 'EDP+'),
  ('Blackest Black TRY ME!', '30 ml.', 'BBM30', 'BBM-30 ml', 'EDP+'),
  ('Dionysus X TRY ME!', '30 ml.', 'DXM30', 'DXM-30 ml', 'EDP+'),
  ('Impression TRY ME!', '30 ml.', 'IMM30', 'IMM-30 ml', 'EDP+'),
  ('Legend of Oud TRY ME!', '30 ml.', 'LOM30', 'LOM-30 ml', 'EDP+'),
  ('Luscious Santal TRY ME!', '30 ml.', 'LSM30', 'LSM-30 ml', 'EDP+'),
  ('Patchouli Absolute TRY ME!', '30 ml.', 'PAM30', 'PAM-30 ml', 'EDP+'),
  ('Rose Oud TRY ME!', '30 ml.', 'ROM30', 'ROM-30 ml', 'EDP+'),
  ('Sparkling Mandarin TRY ME!', '30 ml.', 'SMM30', 'SMM-30 ml', 'EDP+'),
  ('Tropical Leather TRY ME!', '30 ml.', 'TLM30', 'TLM-30 ml', 'EDP+'),
  ('Vandal TRY ME!', '30 ml.', 'VAM30', 'VAM-30 ml', 'EDP+'),
  ('Wealth TRY ME!', '30 ml.', 'WEM30', 'WEM-30 ml', 'EDP+'),
  ('Gambling34+35 TRY ME!', '30 ml.', 'GAM30', 'GAM-30 ml', 'PARFUM'),
  ('Queen TRY ME!', '30 ml.', 'QUM30', 'QUM-30 ml', 'PARFUM'),
  ('Savoury TRY ME!', '30 ml.', 'SAM30', 'SAM-30 ml', 'PARFUM'),
  ('What TRY ME!', '30 ml.', 'WHM30', 'WHM-30 ml', 'PARFUM'),
  ('ถุงกระดาษ Size M', 'Size M', '8857128012134', 'BAG-M', 'Bag'),
  ('ถุงกระดาษ Size S', 'Size S', '8857128012133', 'BAG-S', 'Bag'),
  ('Tumbler CYOC (White)', 'White', '8857128012130', 'TUM-W', 'Tumbler'),
  ('Tumbler CYOC (Dark Blue)', 'Dark Blue', '8857128012131', 'TUM-DB', 'Tumbler'),
  ('Cloth BAG CYOC', 'Size M', '8857128012132', 'CLO-M', 'Cloth'),
  ('Cherry Shade', '50 ml.', '8857128011560', 'CRS-50ml', 'EDP'),
  ('Cherry Shade', '30 ml.', '8857128012153', 'CRS-30ml', 'EDP'),
  ('Cherry Shade', '10 ml.', '8857128012154', 'CRS-10ml', 'EDP'),
  ('Cherry Shade', '4 ml.', '8857128012155', 'CRS-4ml', 'EDP'),
  ('Passion', '50 ml.', '8857128011584', 'PSS-50ml', 'EDP'),
  ('Passion', '30 ml.', '8857128012156', 'PSS-30ml', 'EDP'),
  ('Passion', '10 ml.', '8857128012157', 'PSS-10ml', 'EDP'),
  ('Passion', '4 ml.', '8857128012158', 'PSS-4ml', 'EDP'),
  ('Rosarine', '50 ml.', '8857128011621', 'ROS-50ml', 'EDP'),
  ('Rosarine', '30 ml.', '8857128012159', 'ROS-30ml', 'EDP'),
  ('Rosarine', '10 ml.', '8857128012160', 'ROS-10ml', 'EDP'),
  ('Rosarine', '4 ml.', '8857128012161', 'ROS-4ml', 'EDP'),
  ('Silver', '50 ml.', '8857128011638', 'SIL-50ml', 'EDP'),
  ('Silver', '30 ml.', '8857128012162', 'SIL-30ml', 'EDP'),
  ('Silver', '10 ml.', '8857128012163', 'SIL-10ml', 'EDP'),
  ('Silver', '4 ml.', '8857128012164', 'SIL-4ml', 'EDP'),
  ('Cherry Shade TRY ME!', '50 ml.', 'CRS50', 'CRST-50ml', 'EDP'),
  ('Passion TRY ME!', '50 ml.', 'PSS50', 'PSST-50ml', 'EDP'),
  ('Rosarine TRY ME!', '50 ml.', 'ROS50', 'ROST-50ml', 'EDP'),
  ('Silver TRY ME!', '50 ml.', 'SIL50', 'SILT-50ml', 'EDP'),
  ('Thai Perfume (น้ำปรุง)', '50 ml.', '8857128012168', 'TPF-50ml', 'EDT'),
  ('Amber Spangle', '10 ml.', '8857128012151', 'ASM-10 ml', 'EDP+'),
  ('Angel', '50 ml.', '8857128011577', 'AGM-50ml', 'EDP'),
  ('Angel', '30 ml.', '8857128012165', 'AGM-30ml', 'EDP'),
  ('Angel', '10 ml.', '8857128012166', 'AGM-10ml', 'EDP'),
  ('Angel', '4 ml.', '8857128012167', 'AGM-4ml', 'EDP'),
  ('Angel TRY ME!', '50 ml.', 'AGM50', 'AGT-50ml', 'EDP'),
  ('Fortuna', '50 ml.', '8857128011829', 'FOM-50ml', 'EDP'),
  ('Fortuna', '30 ml.', '8857128012172', 'FOM-30ml', 'EDP'),
  ('Fortuna', '10 ml.', '8857128012173', 'FOM-10ml', 'EDP'),
  ('Fortuna', '4 ml.', '8857128012174', 'FOM-4ml', 'EDP'),
  ('Fortuna TRY ME!', '50 ml.', 'FOM50', 'FOR-50ml', 'EDP'),
  ('Nouveau', '50 ml.', '8857128011799', 'NOM-50ml', 'EDP'),
  ('Nouveau', '30 ml.', '8857128012169', 'NOM-30ml', 'EDP'),
  ('Nouveau', '10 ml.', '8857128012170', 'NOM-10ml', 'EDP'),
  ('Nouveau', '4 ml.', '8857128012171', 'NOM-4ml', 'EDP'),
  ('Nouveau TRY ME!', '50 ml.', 'NOM50', 'NOU-50ml', 'EDP'),
  ('Mellow TRY ME!', '50 ml.', 'MEM50', 'MEM-50ml', 'EDP')
on conflict (barcode) do nothing;

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0016_spec_options.sql
-- ───────────────────────────────────────────────────────────────────────
-- รายการสเป็กสินค้า (dropdown ตอนตัดสต๊อก) — แก้ไข/เพิ่ม/ปิดได้ในเมนูจัดการสเป็ก
create table if not exists spec_options (
  id     serial primary key,
  label  text not null unique,
  sort   int  not null default 0,
  active boolean not null default true
);

insert into spec_options (label, sort) values
  ('ฝาสีเงิน', 1), ('สี่เหลี่ยม', 2), ('ซองซิป', 3), ('X-Secret', 4), ('ขวดกลม', 5),
  ('ลูกเต๋า', 6), ('ฝาสีดำ', 7), ('Pack', 8), ('Size S', 9), ('Size M', 10)
on conflict (label) do nothing;

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0017_spec_rules.sql
-- ───────────────────────────────────────────────────────────────────────
-- (A) สเป็กสำหรับถุงกระดาษเท่านั้น (ซ่อนจาก dropdown ของสินค้าปกติ)
alter table spec_options add column if not exists for_bag boolean not null default false;
update spec_options set for_bag = true where label in ('Size S', 'Size M');

-- (B) กฎเลือกสเป็กอัตโนมัติตามขนาด + Grade → สเป็ก (แก้ไขได้ในเมนูจัดการสเป็ก)
--     sizes/grades เก็บเป็นข้อความคั่นด้วย comma (เช่น '30 ml,50 ml' / 'EDP+,PARFUM')
create table if not exists spec_rules (
  id     serial primary key,
  sizes  text not null,
  grades text not null,
  spec   text not null,
  sort   int  not null default 0,
  active boolean not null default true
);

insert into spec_rules (sizes, grades, spec, sort)
select * from (values
  ('10 ml',        'EDP',          'ฝาสีเงิน', 1),
  ('10 ml',        'EDP+,PARFUM',  'ฝาสีดำ',   2),
  ('50 ml',        'EDP',          'สี่เหลี่ยม', 3),
  ('30 ml,50 ml',  'EDP+,PARFUM',  'ลูกเต๋า',  4)
) as v(sizes, grades, spec, sort)
where not exists (select 1 from spec_rules);

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0018_grades.sql
-- ───────────────────────────────────────────────────────────────────────
-- 0018 อัพเดทเกรดต่อกลิ่น (จาก catalog ล่าสุด, Le Parfum→PARFUM, Volt→EDT)

-- EDP (67)
update products set ptype = 'EDP' where lower(btrim(name)) in (
  '1000 thousand',   'apple cinnamon',   'argentum',   'atlantis',
  'aqua',   'angel',   'beyond',   'blind magnolia',
  'buoyant',   'celeb',   'cherry dance',   'cherry shade',
  'cocoa gourmet',   'code red',   'dionysusx',   'dream island',
  'dynasty',   'eden',   'elite',   'excalibur (edp)',
  'feel light',   'found peony',   'fortuna',   'frisky',
  'gentle elixir',   'hercules',   'ischyros',   'la belle',
  'laven',   'legendary',   'lure',   'make way',
  'mellow',   'men in black',   'moonlight',   'never blue',
  'nouveau',   'oak&berry',   'passion',   'perfect pear',
  'persist',   'rosarine',   'rose oud',   'secret of peach',
  'senorita',   'shadow de bacci light',   'sicilia',   'silver',
  'soul of the fire',   'spring',   'soir',   'teenage dream',
  'tidy',   'vandal',   'velvet oud',   'victory',
  'vintage',   'virginx',   'vivid',   'voyage',
  'wealth',   'what (edp)',   'zeus',   'deep',
  'gemini',   'shine',   'prince'
);

-- EDP+ (8)
update products set ptype = 'EDP+' where lower(btrim(name)) in (
  'amber spangle',   'blackest black',   'impression',   'legend of oud',
  'luscious santal',   'patchouli absolute',   'sparkling mandarin',   'tropical leather'
);

-- EDT (13)
update products set ptype = 'EDT' where lower(btrim(name)) in (
  'relax',   'thai perfume (น้ำปรุง)',   'volt - aware (edt)',   'volt - benign (edt)',
  'volt - elite (edt)',   'volt - gentle (edt)',   'volt - nifty (edt)',   'volt - perfect pear (edt)',
  'volt - savoury (edt)',   'volt - twilight (edt)',   'volt - vandal (edt)',   'volt - what (edt)',
  'volt - you (edt)'
);

-- PARFUM (6)
update products set ptype = 'PARFUM' where lower(btrim(name)) in (
  'cerise sucree',   'excalibur extrait',   'gambling 34+35',   'queen',
  'savoury',   'what'
);

-- Car Perfume (4)
update products set ptype = 'Car Perfume' where lower(btrim(name)) in (
  'car parfumo cool mint',   'car parfumo earthy ozone',   'car parfumo fresh lemon',   'car parfumo ozone fresh'
);

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0019_specs_update.sql
-- ───────────────────────────────────────────────────────────────────────
-- อัพเดทรายการสเป็กชุดใหม่ (ปิดของเก่า → เปิด/เพิ่มชุดใหม่)
update spec_options set active = false;
insert into spec_options (label, sort, active, for_bag) values
  ('ฝาสีเงิน10ml', 1, true, false), ('ฝาสีดำ10ml', 2, true, false), ('ขวดกลม10ml', 3, true, false),
  ('สี่เหลี่ยม', 4, true, false), ('ซองซิป', 5, true, false), ('X-Secret', 6, true, false), ('Tryme', 7, true, false),
  ('ลูกเต๋า', 8, true, false), ('Pack', 9, true, false), ('Box Set', 10, true, false), ('ทรงสูง', 11, true, false),
  ('ขวด90', 12, true, false), ('Size S', 13, true, true), ('Size M', 14, true, true), ('Car Parfume', 15, true, false),
  ('1.2ml (45หลอด)', 16, true, false), ('น้ำปรุง', 17, true, false), ('Cloth', 18, true, false)
on conflict (label) do update set sort = excluded.sort, active = true, for_bag = excluded.for_bag;

-- ปรับกฎเลือกอัตโนมัติให้ชี้ชื่อสเป็กใหม่ (ฝาสีเงิน→ฝาสีเงิน10ml, ฝาสีดำ→ฝาสีดำ10ml)
update spec_rules set spec = 'ฝาสีเงิน10ml' where spec = 'ฝาสีเงิน';
update spec_rules set spec = 'ฝาสีดำ10ml'   where spec = 'ฝาสีดำ';

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0020_discontinue.sql
-- ───────────────────────────────────────────────────────────────────────
-- ยกเลิกการผลิต "ขนาด 90 ml" ของ Volt 4 กลิ่น — ลบเฉพาะขนาด 90ml ออกจากรายการบาร์โค้ด
-- (กลิ่นยังใช้งานได้ปกติในขนาดอื่น)
delete from product_barcodes
 where lower(btrim(scent)) in (
   'volt - elite (edt)', 'volt - nifty (edt)', 'volt - savoury (edt)', 'volt - you (edt)')
   and regexp_replace(lower(size), '[^0-9a-z]', '', 'g') = '90ml';

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0021_discontinued_sku.sql
-- ───────────────────────────────────────────────────────────────────────
-- เลิกผลิตต่อขนาด (กลิ่น+ขนาด) — บล็อกไม่ให้เลือกขนาดนั้นตอนสร้างใบเบิก
create table if not exists discontinued_sku (
  id    serial primary key,
  scent text not null,
  size  text not null,
  unique (scent, size)
);

insert into discontinued_sku (scent, size) values
  -- 90 ml
  ('Volt - Elite (EDT)', '90 ml'), ('Volt - Nifty (EDT)', '90 ml'),
  ('Volt - Savoury (EDT)', '90 ml'), ('Volt - You (EDT)', '90 ml'),
  -- 50 ml
  ('Cherry Dance', '50 ml'), ('Ischyros', '50 ml'), ('Moon Light', '50 ml'),
  -- 30 ml
  ('Moon Light', '30 ml'), ('Volt - Benign (EDT)', '30 ml'), ('Volt - Elite (EDT)', '30 ml'),
  ('Volt - Nifty (EDT)', '30 ml'), ('Volt - Perfect Pear (EDT)', '30 ml'), ('Volt - Twilight (EDT)', '30 ml'),
  -- 10 ml
  ('1000 Thousand', '10 ml'), ('Cherry Dance', '10 ml'), ('Legendary', '10 ml'),
  ('Volt - Elite (EDT)', '10 ml'), ('Volt - Gentle (EDT)', '10 ml'), ('Volt - Nifty (EDT)', '10 ml'),
  ('Volt - Perfect Pear (EDT)', '10 ml'), ('Volt - Savoury (EDT)', '10 ml'), ('Volt - You (EDT)', '10 ml')
on conflict (scent, size) do nothing;

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0022_move_sku.sql
-- ───────────────────────────────────────────────────────────────────────
-- กำกับ SKU (บาร์โค้ด) ในประวัติการเคลื่อนไหวสต๊อก (โดยเฉพาะตอนรับเข้า)
alter table stock_moves add column if not exists sku text;

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0023_stock_unit.sql
-- ───────────────────────────────────────────────────────────────────────
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

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0024_fda.sql
-- ───────────────────────────────────────────────────────────────────────
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

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0025_fda_renewals.sql
-- ───────────────────────────────────────────────────────────────────────
-- ประวัติการต่ออายุ อย. (จดแจ้งมีอายุ 3 ปี — เก็บว่าต่อครั้งไหน จากวันไหนถึงวันไหน)
create table if not exists fda_renewals (
  id          serial primary key,
  fda_id      int not null references fda_registrations(id) on delete cascade,
  reg_no      text,
  old_expiry  date,
  new_expiry  date,
  renewed_at  timestamptz not null default now(),
  renewed_by  int
);
create index if not exists idx_fda_renewals_fda on fda_renewals (fda_id);

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0026_closed_sku.sql
-- ───────────────────────────────────────────────────────────────────────
-- ปิดการขายต่อขนาด (กลิ่น+ขนาด) — ซ่อนจากสต๊อก + บล็อกไม่ให้เลือกตอนสร้างใบเบิก
-- ต่างจากเลิกผลิต (discontinued_sku): ยอดสต๊อกยังอยู่ครบ เปิดกลับมาขายได้ทุกเมื่อ
create table if not exists closed_sku (
  id    serial primary key,
  scent text not null,
  size  text not null,
  unique (scent, size)
);

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0027_shipping.sql
-- ───────────────────────────────────────────────────────────────────────
-- จัดส่งสินค้า: สแกน Order No. จากใบปะหน้าก่อนเอาไปส่ง → บันทึกว่าส่งเมื่อไหร่/ใครส่ง
alter table orders add column if not exists shipped_at timestamptz;
alter table orders add column if not exists shipped_by int;
create index if not exists idx_orders_shipped_at on orders (shipped_at);

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0028_barcodes_add.sql
-- ───────────────────────────────────────────────────────────────────────
-- เพิ่มบาร์โค้ดจากไฟล์ ข้อมูลน้ำหอม_Barcode.xlsx (53 รายการที่ระบบยังไม่มี)
insert into product_barcodes (scent, size, barcode, grade) values
  ('Amber Spangle', '4 ml', '8857128012152', 'EDP+'),
  ('Argentum', '30 ml', '8857128012135', 'EDP'),
  ('Argentum', '10 ml', '8857128012136', 'EDP'),
  ('Argentum', '4 ml', '8857128012137', 'EDP'),
  ('Elite', '50 ml', '8857128011324', 'EDP'),
  ('Ischyros', '50 ml', '8857128011362', 'EDP'),
  ('Lure', '50 ml', '8857128011393', 'EDP+'),
  ('Nifty', '50 ml', '8857128011409', 'EDP+'),
  ('Rose Oud', '10 ml', '8857128012138', 'EDP+'),
  ('Rose Oud', '4 ml', '8857128012139', 'EDP+'),
  ('White Velour', '50 ml', '8857128011553', 'EDP+'),
  ('White Velour', '30 ml', '8857128012175', 'EDP+'),
  ('White Velour', '10 ml', '8857128012176', 'EDP+'),
  ('White Velour', '4 ml', '8857128012177', 'EDP+'),
  ('Amber Silky', '50 ml', '8857128011195', 'EDP'),
  ('Frisky', '50 ml', '8857128011447', 'EDP'),
  ('Oak & Berry', '50 ml', '8857128011478', 'EDP'),
  ('Soul of the Fire', '50 ml', '8857128011485', 'EDP'),
  ('Tidy', '50 ml', '8857128011508', 'EDP'),
  ('Apple Cinnamon', '50 ml', '8857128011768', 'EDP'),
  ('Volt - Nifty (EDT)', '90 ml', '8857128020027', 'EDT'),
  ('Volt - Nifty (EDT)', '30 ml', '8857128020016', 'EDT'),
  ('Volt - Nifty (EDT)', '10 ml', '8857128020005', 'EDT'),
  ('Volt - Elite (EDT)', '90 ml', '8857128020025', 'EDT'),
  ('Volt - Elite (EDT)', '30 ml', '8857128020014', 'EDT'),
  ('Volt - Elite (EDT)', '10 ml', '8857128020003', 'EDT'),
  ('Volt - What (EDT)', '90 ml', '8857128020032', 'EDT'),
  ('Volt - What (EDT)', '30 ml', '8857128020021', 'EDT'),
  ('Volt - What (EDT)', '10 ml', '8857128020010', 'EDT'),
  ('Volt - Twilight (EDT)', '90 ml', '8857128020030', 'EDT'),
  ('Volt - Twilight (EDT)', '30 ml', '8857128020019', 'EDT'),
  ('Volt - Twilight (EDT)', '10 ml', '8857128020008', 'EDT'),
  ('Volt - Savoury (EDT)', '90 ml', '8857128020029', 'EDT'),
  ('Volt - Savoury (EDT)', '30 ml', '8857128020018', 'EDT'),
  ('Volt - Savoury (EDT)', '10 ml', '8857128020007', 'EDT'),
  ('Volt - Perfect Pear (EDT)', '90 ml', '8857128020028', 'EDT'),
  ('Volt - Perfect Pear (EDT)', '30 ml', '8857128020017', 'EDT'),
  ('Volt - Perfect Pear (EDT)', '10 ml', '8857128020006', 'EDT'),
  ('Volt - Vandal (EDT)', '90 ml', '8857128020031', 'EDT'),
  ('Volt - Vandal (EDT)', '30 ml', '8857128020020', 'EDT'),
  ('Volt - Vandal (EDT)', '10 ml', '8857128020009', 'EDT'),
  ('Volt - Gentle (EDT)', '90 ml', '8857128020026', 'EDT'),
  ('Volt - Gentle (EDT)', '30 ml', '8857128020015', 'EDT'),
  ('Volt - Gentle (EDT)', '10 ml', '8857128020004', 'EDT'),
  ('Volt - Aware (EDT)', '90 ml', '8857128020023', 'EDT'),
  ('Volt - Aware (EDT)', '30 ml', '8857128020012', 'EDT'),
  ('Volt - Aware (EDT)', '10 ml', '8857128020001', 'EDT'),
  ('Volt - You (EDT)', '90 ml', '8857128020033', 'EDT'),
  ('Volt - You (EDT)', '30 ml', '8857128020022', 'EDT'),
  ('Volt - You (EDT)', '10 ml', '8857128020011', 'EDT'),
  ('Volt - Benign (EDT)', '90 ml', '8857128020024', 'EDT'),
  ('Volt - Benign (EDT)', '30 ml', '8857128020013', 'EDT'),
  ('Volt - Benign (EDT)', '10 ml', '8857128020002', 'EDT')
on conflict (barcode) do nothing;

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0029_supply_stock.sql
-- ───────────────────────────────────────────────────────────────────────
-- คลังวัตถุดิบ & บรรจุภัณฑ์ (3 หมวด: bulk/label/packaging) — คงเหลือ + ประวัติเคลื่อนไหว
-- โมเดลเดียวกับ stock + stock_moves: material_item = คงเหลือ, material_move = รับเข้า/จ่ายออก/ปรับ ตามวันที่

create table if not exists material_item (
  id serial primary key,
  category  text not null,               -- bulk | label | packaging
  ref_key   text not null,               -- คีย์เอกลักษณ์ในหมวด (unique ต่อ category)
  scent     text,                        -- bulk/label
  comp_key  text,                        -- label/packaging
  brand     text,                        -- bulk
  grade     text,
  label     text not null,               -- ชื่อแสดง
  category2 text,                        -- หมวดย่อย (packaging: ขวด/ฝา/กล่อง/ถุง)
  unit      text not null default 'ชิ้น',
  qty       numeric not null default 0,  -- คงเหลือปัจจุบัน
  sort      int not null default 0,
  updated_at timestamptz not null default now(),
  unique (category, ref_key)
);

create table if not exists material_move (
  id serial primary key,
  item_id    int not null references material_item(id) on delete cascade,
  qty_change numeric not null,           -- + รับเข้า / − จ่ายออก
  balance    numeric,                    -- ยอดคงเหลือหลังเคลื่อนไหว
  reason     text not null,              -- receive | issue | adjust
  note       text,
  created_by int,
  created_at timestamptz not null default now()
);
create index if not exists idx_material_move_item    on material_move (item_id, created_at desc);
create index if not exists idx_material_move_created  on material_move (created_at desc);

-- seed หมวดขวด&แพ็คเกจ (รายการคงที่)
insert into material_item (category, ref_key, comp_key, label, category2, unit, sort) values
  ('packaging','p1','p1','หลอดเทสเตอร์ 1.2 ml.','ขวด/หลอด','ชิ้น',1),
  ('packaging','p2','p2','หลอดเทสเตอร์ 4 ml.','ขวด/หลอด','ชิ้น',2),
  ('packaging','p3','p3','ขวดกลม 10 ml.','ขวด/หลอด','ชิ้น',3),
  ('packaging','p4','p4','ขวดเหลี่ยม 10 ml. LTS','ขวด/หลอด','ชิ้น',4),
  ('packaging','p5','p5','ขวดเหลี่ยม 10 ml. LTB','ขวด/หลอด','ชิ้น',5),
  ('packaging','p6','p6','ขวด EDP ขนาด 50 ml.','ขวด/หลอด','ชิ้น',6),
  ('packaging','p7','p7','ขวด EDP ขนาด 30 ml.','ขวด/หลอด','ชิ้น',7),
  ('packaging','p8','p8','ขวดขนาด 30 ml. ลูกเต๋า','ขวด/หลอด','ชิ้น',8),
  ('packaging','p9','p9','ขวดขนาด 50 ml. ลูกเต๋า','ขวด/หลอด','ชิ้น',9),
  ('packaging','p10','p10','ขวดน้ำหอม ทรงสูง 50 ml.','ขวด/หลอด','ชิ้น',10),
  ('packaging','p11','p11','ขวดน้ำปรุงขนาด 50 ml.','ขวด/หลอด','ชิ้น',11),
  ('packaging','p12','p12','ขวด Car Parfume 100 ml.','ขวด/หลอด','ชิ้น',12),
  ('packaging','p13','p13','ฝา Car Perfume ดำด้าน','ฝา/หัวสเปรย์','ชิ้น',13),
  ('packaging','p14','p14','ฝา EDP จุกสีเงิน','ฝา/หัวสเปรย์','ชิ้น',14),
  ('packaging','p15','p15','ฝา ดำเงา Magnate ใหญ่','ฝา/หัวสเปรย์','ชิ้น',15),
  ('packaging','p16','p16','ฝา ดำเงา Magnate เล็ก','ฝา/หัวสเปรย์','ชิ้น',16),
  ('packaging','p17','p17','ฝา JEN30 ml','ฝา/หัวสเปรย์','ชิ้น',17),
  ('packaging','p18','p18','หัวสเปรย์ JEN สีเงิน','ฝา/หัวสเปรย์','ชิ้น',18),
  ('packaging','p34','p34','หัวสเปรย์ JEN สีดำ','ฝา/หัวสเปรย์','ชิ้น',18),
  ('packaging','p19','p19','กล่อง EDP 10 ml.','กล่อง','ชิ้น',19),
  ('packaging','p20','p20','กล่อง EDP 30 สีกรม','กล่อง','ชิ้น',20),
  ('packaging','p21','p21','กล่อง EDP 50 สีกรม','กล่อง','ชิ้น',21),
  ('packaging','p22','p22','กล่อง EDP 30 สีขาว','กล่อง','ชิ้น',22),
  ('packaging','p23','p23','กล่อง Le Parfum สีขาว','กล่อง','ชิ้น',23),
  ('packaging','p24','p24','กล่องปังจั่ว Gambling','กล่อง','ชิ้น',24),
  ('packaging','p25','p25','กล่อง Feel สีขาว','กล่อง','ชิ้น',25),
  ('packaging','p26','p26','กล่อง Savoury สีขาว','กล่อง','ชิ้น',26),
  ('packaging','p27','p27','กล่อง Travel Pack','กล่อง','ชิ้น',27),
  ('packaging','p28','p28','กล่อง EDT 10 ml','กล่อง','ชิ้น',28),
  ('packaging','p29','p29','กล่อง EDT 30 ml','กล่อง','ชิ้น',29),
  ('packaging','p30','p30','กล่อง EDT 90 ml','กล่อง','ชิ้น',30),
  ('packaging','p31','p31','ถุงกระดาษขาว ไซส์ S','ถุง/ซอง','ชิ้น',31),
  ('packaging','p32','p32','ถุงกระดาษขาว ไซส์ M','ถุง/ซอง','ชิ้น',32),
  ('packaging','p33','p33','ซองซิปเทสเตอร์','ถุง/ซอง','ชิ้น',33)
on conflict (category, ref_key) do nothing;

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0030_material_reorder.sql
-- ───────────────────────────────────────────────────────────────────────
-- จุดสั่งซื้อ (reorder point) ต่อรายการวัตถุดิบ — คงเหลือ ≤ จุดนี้ = แจ้งเตือน "ควรสั่งซื้อ"
alter table material_item add column if not exists reorder_point numeric;

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0031_activity_log.sql
-- ───────────────────────────────────────────────────────────────────────
-- บันทึกการใช้งานของผู้ใช้ (audit log) — เข้าใช้ + การกระทำสำคัญ · เห็นเฉพาะ admin
create table if not exists activity_log (
  id         bigserial primary key,
  user_id    int,
  username   text,
  role       text,
  action     text not null,      -- login | logout | order.create | order.delete | stock.issue | ship | material.receive | material.issue | scent.manage | user.manage ...
  detail     text,
  ip         text,
  created_at timestamptz not null default now()
);
create index if not exists idx_activity_created on activity_log (created_at desc);
create index if not exists idx_activity_user    on activity_log (user_id, created_at desc);

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0032_material_note.sql
-- ───────────────────────────────────────────────────────────────────────
-- หมายเหตุต่อรายการวัตถุดิบ (ใส่ข้อมูลเพิ่มเติมได้ เช่น สูตร/ล็อต/โน้ต)
alter table material_item add column if not exists note text;

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0033_returns.sql
-- ───────────────────────────────────────────────────────────────────────
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

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0034_scent_aliases.sql
-- ───────────────────────────────────────────────────────────────────────
-- ชื่อพ้องกลิ่น (alias): ชื่อที่แพลตฟอร์ม (Lazada/Shopee) เขียนไม่ตรงกับกลิ่นในระบบ → map เป็นชื่อจริง
-- ใช้ตอน import จับกลิ่น (matchMasterScent) · จัดการเอง/เดาอัตโนมัติในหน้า import
create table if not exists scent_aliases (
  id          serial primary key,
  alias_key   text not null unique,          -- normalize แล้ว (lowercase, ตัดอักขระพิเศษ) = คีย์จับคู่
  alias_text  text not null,                 -- ข้อความเดิมที่เห็น (ไว้โชว์)
  product     text not null,                 -- ชื่อกลิ่นจริงในระบบ (products.name)
  created_by  integer,
  created_at  timestamptz not null default now()
);
create index if not exists idx_scent_aliases_product on scent_aliases (product);

-- seed alias ที่ตั้งไว้ในโค้ดเดิม
insert into scent_aliases (alias_key, alias_text, product) values
  ('shadowdebacci', 'Shadow de bacci', 'Shadow de Bacci Light')
on conflict (alias_key) do nothing;

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0035_perf_indexes.sql
-- ───────────────────────────────────────────────────────────────────────
-- 0035 — ดัชนีเพิ่มประสิทธิภาพ query ที่ใช้บ่อย (จาก perf audit) — idempotent
-- ลดการ seq-scan ทั้งตารางบนหน้า dashboard/list/report/issue/return
create index if not exists idx_order_items_product   on order_items (product);
create index if not exists idx_orders_stock_issued_at on orders (stock_issued_at);
create index if not exists idx_orders_month_label     on orders (month_label);
create index if not exists idx_orders_platform_docdate on orders (platform, doc_date desc);
-- return-stats กรอง voided_at is null ทุกครั้ง → partial index เล็ก+ตรง
create index if not exists idx_order_returns_active   on order_returns (order_no) where voided_at is null;

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0036_stock_unit_spec.sql
-- ───────────────────────────────────────────────────────────────────────
-- 0036 — เพิ่ม spec (สเป็กบรรจุ เช่น สี่เหลี่ยม/ฝาเงิน10ml/ซองซิป) ให้ stock_unit
-- ใช้เก็บ spec รายชิ้นจาก log การส่ง + โชว์ในหน้าติดตาม SKU
alter table stock_unit add column if not exists spec text;

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0037_created_at_index.sql
-- ───────────────────────────────────────────────────────────────────────
-- index รองรับ query รายวัน (platformDaily/ordersToday/dailyIssueStatus) ที่ filter ตาม created_at
create index if not exists idx_orders_created_at on orders (created_at);

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0038_office_sale_fields.sql
-- ───────────────────────────────────────────────────────────────────────
-- ฟิลด์สำหรับใบเบิก Office (ร้านขาย/จัดส่งเอง): ราคา/ส่วนลด/ช่องทางชำระ/ขนส่ง/เลขพัสดุ
-- คอลัมน์ทั่วไป (nullable) — แพลตฟอร์มอื่นเว้นว่างไว้
alter table orders add column if not exists price            numeric;
alter table orders add column if not exists discount         numeric;
alter table orders add column if not exists payment_method   text;
alter table orders add column if not exists shipping_carrier text;
alter table orders add column if not exists tracking_no      text;

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0039_ctw_transfer.sql
-- ───────────────────────────────────────────────────────────────────────
-- ใบเบิกโอนสาขา CTW: seed แพลตฟอร์ม CTW (orders.platform มี FK → platforms.code)
insert into platforms (code, name, prefix, sort) values ('CTW','CTW (Central World)','WPO',7)
on conflict (code) do nothing;

-- สาขา + สถานะกดรับของ CTW
alter table orders add column if not exists branch          text;         -- รหัส/ชื่อสาขา (เช่น 01_CTW)
alter table orders add column if not exists ctw_received_at timestamptz;  -- CTW กดรับเมื่อไหร่
alter table orders add column if not exists ctw_received_by text;         -- ผู้กดรับฝั่ง CTW (ref/ชื่อ)
create index if not exists idx_orders_branch on orders (branch) where branch is not null;

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0040_material_move_order.sql
-- ───────────────────────────────────────────────────────────────────────
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

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0041_wholesale_platforms.sql
-- ───────────────────────────────────────────────────────────────────────
-- เพิ่มช่องค้าส่ง Eveandboy / King Power (ใบเบิกแบบ PO เหมือน CTW) — กัน orders_platform_fkey ล้ม
insert into platforms (code, name, prefix, sort) values
  ('Eveandboy','Eveandboy','EVB',8),
  ('KingPower','King Power','KP',9)
on conflict (code) do nothing;

-- PO Order Version (เลขเวอร์ชัน PO ฝั่ง Eveandboy — กรอกเอง) + รหัสสาขา (branch code)
alter table orders add column if not exists po_version  text;
alter table orders add column if not exists branch_code text;

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0042_stock_unit_assigned_at_issue.sql
-- ───────────────────────────────────────────────────────────────────────
-- 4ml (assign): แยกว่า unit ถูก "สร้างตอนตัดสต๊อก" (assign) vs "ตัดจากของในคลังจริง"
-- ตอนยกเลิกตัดสต๊อก: อันที่ assign สร้างใหม่ → ลบทิ้ง · อันที่ตัดจากคลัง → คืนสถานะ in_stock
alter table stock_unit add column if not exists assigned_at_issue boolean not null default false;

-- ───────────────────────────────────────────────────────────────────────
-- ▼ 0043_norm_indexes.sql
-- ───────────────────────────────────────────────────────────────────────
-- Performance: index รองรับการ normalize กลิ่น/ขนาด ที่ query hot ใช้ (regexp_replace + btrim)
-- เดิมไม่มี index ตรงรูปนี้ → listStock/stockSummary/mismatch/velocity ฯลฯ seq scan โตตามจำนวนข้อมูล
-- ฟังก์ชันทั้งหมด (regexp_replace/lower/btrim) เป็น IMMUTABLE → สร้าง expression index ได้
create index if not exists idx_stock_norm on stock (
  (regexp_replace(lower(btrim(product)),'[^a-z0-9ก-๙]','','g')),
  (btrim(lower(size),' .')));
create index if not exists idx_order_items_prodnorm on order_items (
  (regexp_replace(lower(btrim(product)),'[^a-z0-9ก-๙]','','g')));
create index if not exists idx_products_namenorm on products (
  (regexp_replace(lower(btrim(name)),'[^a-z0-9ก-๙]','','g')));
create index if not exists idx_pbc_scentnorm on product_barcodes (
  (regexp_replace(lower(btrim(scent)),'[^a-z0-9ก-๙]','','g')),
  (btrim(lower(size),' .')));

