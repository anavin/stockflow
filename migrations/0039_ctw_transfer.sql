-- ใบเบิกโอนสาขา CTW: seed แพลตฟอร์ม CTW (orders.platform มี FK → platforms.code)
insert into platforms (code, name, prefix, sort) values ('CTW','CTW (Central World)','WPO',7)
on conflict (code) do nothing;

-- สาขา + สถานะกดรับของ CTW
alter table orders add column if not exists branch          text;         -- รหัส/ชื่อสาขา (เช่น 01_CTW)
alter table orders add column if not exists ctw_received_at timestamptz;  -- CTW กดรับเมื่อไหร่
alter table orders add column if not exists ctw_received_by text;         -- ผู้กดรับฝั่ง CTW (ref/ชื่อ)
create index if not exists idx_orders_branch on orders (branch) where branch is not null;
