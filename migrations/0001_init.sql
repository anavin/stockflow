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
