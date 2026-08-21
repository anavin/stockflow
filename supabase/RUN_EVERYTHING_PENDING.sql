-- ============================================================================
-- RUN_EVERYTHING_PENDING.sql — รวม SQL ที่ค้างทั้งหมด วางทีเดียวใน Supabase SQL Editor
-- ปลอดภัย: idempotent ทุกส่วน (create if not exists / on conflict) รันซ้ำได้ · ห่อ transaction เดียว
-- ลำดับสำคัญ: สร้างตารางคลังวัตถุดิบ+รับคืน ก่อน → แก้ข้อมูล
-- ============================================================================
begin;

-- ═══════════════════════════════════════════════════════════════════════
-- ▼▼▼ RUN_ON_PROD_materials.sql ▼▼▼
-- ═══════════════════════════════════════════════════════════════════════
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

-- จุดสั่งซื้อ (reorder point) ต่อรายการ — แจ้งเตือน "ควรสั่งซื้อ" เมื่อคงเหลือ ≤ จุดนี้ (0030)
alter table material_item add column if not exists reorder_point numeric;

-- หมายเหตุต่อรายการ (0032)
alter table material_item add column if not exists note text;

-- ═══════════════════════════════════════════════════════════════════════
-- ▼▼▼ RUN_ON_PROD_returns.sql ▼▼▼
-- ═══════════════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════════════
-- ▼▼▼ RUN_ALL_FIXES.sql ▼▼▼
-- ═══════════════════════════════════════════════════════════════════════
-- ============================================================
-- RUN_ALL_FIXES.sql — รวมทุกไฟล์แก้ข้อมูล วางทีเดียวใน Supabase SQL Editor
-- ปลอดภัย: idempotent (run ซ้ำได้ไม่พัง) · ห่อ transaction เดียว
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- ▼▼▼ FIX_labels_ALL.sql ▼▼▼
-- ═══════════════════════════════════════════════════════════
-- ========================================================================
-- แก้ชิ้นส่วนสติ๊กเกอร์ให้ตรง catalog เกรด — รันครั้งเดียวบน Supabase SQL Editor
-- รวม 2 ส่วน (remap x_ + Volt-You  →  White velour EDP + Dream Island) · idempotent
-- ========================================================================

-- ===== ส่วนที่ 1: remap x_ → catalog + rename Volt-You =====
-- แก้ชิ้นส่วนสติ๊กเกอร์ที่ import มาแบบ key ชั่วคราว (x_) → key จริงใน catalog + rename Volt - You
-- idempotent · รันครั้งเดียวบน Supabase

-- (A) rename "Volt - You" → "Volt - You (EDT)" (bulk + label)
update material_item mi set scent='Volt - You (EDT)',
  ref_key = case when category='bulk' then 'voltyouedt|labparfumo' else 'voltyouedt|'||split_part(ref_key,'|',2) end, updated_at=now()
where category in ('bulk','label')
  and regexp_replace(lower(btrim(scent)),'[^a-z0-9ก-๙]','','g')='voltyou'
  and not exists (select 1 from material_item x where x.category=mi.category
    and x.ref_key = case when mi.category='bulk' then 'voltyouedt|labparfumo' else 'voltyouedt|'||split_part(mi.ref_key,'|',2) end);

-- (B) remap x_ → catalog key (ตามเกรดของ product) · เฉพาะที่มี key ปลายทาง (เกรดตรง)
update material_item mi
set comp_key = m.target,
    ref_key = regexp_replace(lower(btrim(mi.scent)),'[^a-z0-9ก-๙]','','g') || '|' || m.target,
    updated_at = now()
from products p, (values
  ('EDP','x_cardaccordsnotes','card'),
  ('EDP+','x_cardaccordsnotes','card'),
  ('PARFUM','x_cardaccordsnotes','card'),
  ('EDP','x_sticker12ml','s_12'),
  ('EDP+','x_sticker12ml','s_12'),
  ('PARFUM','x_sticker12ml','s_12'),
  ('EDP','x_stickerติดกล่อง10ml','box_edp_10'),
  ('EDP+','x_stickerติดกล่อง10ml','box_10'),
  ('PARFUM','x_stickerติดกล่อง10ml','box_10'),
  ('EDP+','x_stickerติดกล่อง30ml','box_30'),
  ('PARFUM','x_stickerติดกล่อง30ml','box_30'),
  ('EDP+','x_stickerติดกล่อง50ml','box_50'),
  ('PARFUM','x_stickerติดกล่อง50ml','box_50'),
  ('EDP','x_stickerติดกล่องedp','box_edp'),
  ('EDT','x_stickerติดกล่องedt','box_edt'),
  ('EDT','x_stickerติดขวด90ml','bottle_90'),
  ('EDP','x_stickerสคบ4ml','scb_4'),
  ('EDP+','x_stickerสคบ4ml','scb_4'),
  ('PARFUM','x_stickerสคบ4ml','scb_4'),
  ('EDP','x_stickerสคบ10ml','scb_10'),
  ('EDP+','x_stickerสคบ10ml','scb_10'),
  ('PARFUM','x_stickerสคบ10ml','scb_10'),
  ('EDT','x_stickerสคบ10ml','scb_10'),
  ('EDP','x_stickerสคบ30ml','scb_30'),
  ('EDP+','x_stickerสคบ30ml','scb_30'),
  ('PARFUM','x_stickerสคบ30ml','scb_30'),
  ('EDT','x_stickerสคบ30ml','scb_30'),
  ('EDP','x_stickerสคบ50ml','scb_50'),
  ('EDP+','x_stickerสคบ50ml','scb_50'),
  ('PARFUM','x_stickerสคบ50ml','scb_50'),
  ('EDT','x_stickerสคบ90ml','scb_90')
) as m(grade, xkey, target)
where mi.category='label' and mi.comp_key = m.xkey
  and regexp_replace(lower(btrim(p.name)),'[^a-z0-9ก-๙]','','g') = regexp_replace(lower(btrim(mi.scent)),'[^a-z0-9ก-๙]','','g')
  and (case when upper(coalesce(p.ptype,''))='EDP' then 'EDP'
            when upper(coalesce(p.ptype,''))='EDP+' then 'EDP+'
            when upper(coalesce(p.ptype,'')) like '%PARFUM%' then 'PARFUM'
            when upper(coalesce(p.ptype,''))='EDT' then 'EDT' end) = m.grade
  and not exists (select 1 from material_item x where x.category='label'
    and x.ref_key = regexp_replace(lower(btrim(mi.scent)),'[^a-z0-9ก-๙]','','g') || '|' || m.target);

-- ===== ส่วนที่ 2: White velour → EDP + Dream Island ตัด 30ml =====
-- White velour: เกรด EDT → EDP + Dream Island: ตัดกล่อง 30ml (ไม่มีใน EDP) · idempotent
-- (1) แก้เกรด White velour → EDP (product + material_item)
update products set ptype='EDP' where regexp_replace(lower(btrim(name)),'[^a-z0-9ก-๙]','','g')='whitevelour';
update material_item set grade='EDP' where regexp_replace(lower(btrim(scent)),'[^a-z0-9ก-๙]','','g')='whitevelour' and category in ('bulk','label');

-- (2) remap x_ → catalog (White velour เป็น EDP แล้ว ชิ้นส่วน EDP จะเข้าที่)
update material_item mi
set comp_key=m.target, ref_key=regexp_replace(lower(btrim(mi.scent)),'[^a-z0-9ก-๙]','','g')||'|'||m.target, updated_at=now()
from products p, (values
  ('EDP','x_cardaccordsnotes','card'),
  ('EDP+','x_cardaccordsnotes','card'),
  ('PARFUM','x_cardaccordsnotes','card'),
  ('EDP','x_sticker12ml','s_12'),
  ('EDP+','x_sticker12ml','s_12'),
  ('PARFUM','x_sticker12ml','s_12'),
  ('EDP','x_stickerติดกล่อง10ml','box_edp_10'),
  ('EDP+','x_stickerติดกล่อง10ml','box_10'),
  ('PARFUM','x_stickerติดกล่อง10ml','box_10'),
  ('EDP+','x_stickerติดกล่อง30ml','box_30'),
  ('PARFUM','x_stickerติดกล่อง30ml','box_30'),
  ('EDP+','x_stickerติดกล่อง50ml','box_50'),
  ('PARFUM','x_stickerติดกล่อง50ml','box_50'),
  ('EDP','x_stickerติดกล่องedp','box_edp'),
  ('EDT','x_stickerติดกล่องedt','box_edt'),
  ('EDT','x_stickerติดขวด90ml','bottle_90'),
  ('EDP','x_stickerสคบ4ml','scb_4'),
  ('EDP+','x_stickerสคบ4ml','scb_4'),
  ('PARFUM','x_stickerสคบ4ml','scb_4'),
  ('EDP','x_stickerสคบ10ml','scb_10'),
  ('EDP+','x_stickerสคบ10ml','scb_10'),
  ('PARFUM','x_stickerสคบ10ml','scb_10'),
  ('EDT','x_stickerสคบ10ml','scb_10'),
  ('EDP','x_stickerสคบ30ml','scb_30'),
  ('EDP+','x_stickerสคบ30ml','scb_30'),
  ('PARFUM','x_stickerสคบ30ml','scb_30'),
  ('EDT','x_stickerสคบ30ml','scb_30'),
  ('EDP','x_stickerสคบ50ml','scb_50'),
  ('EDP+','x_stickerสคบ50ml','scb_50'),
  ('PARFUM','x_stickerสคบ50ml','scb_50'),
  ('EDT','x_stickerสคบ90ml','scb_90')
) as m(grade,xkey,target)
where mi.category='label' and mi.comp_key=m.xkey
  and regexp_replace(lower(btrim(p.name)),'[^a-z0-9ก-๙]','','g')=regexp_replace(lower(btrim(mi.scent)),'[^a-z0-9ก-๙]','','g')
  and (case when upper(coalesce(p.ptype,''))='EDP' then 'EDP' when upper(coalesce(p.ptype,''))='EDP+' then 'EDP+' when upper(coalesce(p.ptype,'')) like '%PARFUM%' then 'PARFUM' when upper(coalesce(p.ptype,''))='EDT' then 'EDT' end)=m.grade
  and not exists (select 1 from material_item x where x.category='label' and x.ref_key=regexp_replace(lower(btrim(mi.scent)),'[^a-z0-9ก-๙]','','g')||'|'||m.target);

-- (3) Dream Island: ลบชิ้นส่วนกล่อง 30ml (EDP ไม่มีขนาดนี้)
delete from material_item where category='label' and comp_key='x_stickerติดกล่อง30ml'
  and regexp_replace(lower(btrim(scent)),'[^a-z0-9ก-๙]','','g')='dreamisland';

-- ═══════════════════════════════════════════════════════════
-- ▼▼▼ FIX_whitevelour_dreamisland.sql ▼▼▼
-- ═══════════════════════════════════════════════════════════
-- White velour: เกรด EDT → EDP + Dream Island: ตัดกล่อง 30ml (ไม่มีใน EDP) · idempotent
-- (1) แก้เกรด White velour → EDP (product + material_item)
update products set ptype='EDP' where regexp_replace(lower(btrim(name)),'[^a-z0-9ก-๙]','','g')='whitevelour';
update material_item set grade='EDP' where regexp_replace(lower(btrim(scent)),'[^a-z0-9ก-๙]','','g')='whitevelour' and category in ('bulk','label');

-- (2) remap x_ → catalog (White velour เป็น EDP แล้ว ชิ้นส่วน EDP จะเข้าที่)
update material_item mi
set comp_key=m.target, ref_key=regexp_replace(lower(btrim(mi.scent)),'[^a-z0-9ก-๙]','','g')||'|'||m.target, updated_at=now()
from products p, (values
  ('EDP','x_cardaccordsnotes','card'),
  ('EDP+','x_cardaccordsnotes','card'),
  ('PARFUM','x_cardaccordsnotes','card'),
  ('EDP','x_sticker12ml','s_12'),
  ('EDP+','x_sticker12ml','s_12'),
  ('PARFUM','x_sticker12ml','s_12'),
  ('EDP','x_stickerติดกล่อง10ml','box_edp_10'),
  ('EDP+','x_stickerติดกล่อง10ml','box_10'),
  ('PARFUM','x_stickerติดกล่อง10ml','box_10'),
  ('EDP+','x_stickerติดกล่อง30ml','box_30'),
  ('PARFUM','x_stickerติดกล่อง30ml','box_30'),
  ('EDP+','x_stickerติดกล่อง50ml','box_50'),
  ('PARFUM','x_stickerติดกล่อง50ml','box_50'),
  ('EDP','x_stickerติดกล่องedp','box_edp'),
  ('EDT','x_stickerติดกล่องedt','box_edt'),
  ('EDT','x_stickerติดขวด90ml','bottle_90'),
  ('EDP','x_stickerสคบ4ml','scb_4'),
  ('EDP+','x_stickerสคบ4ml','scb_4'),
  ('PARFUM','x_stickerสคบ4ml','scb_4'),
  ('EDP','x_stickerสคบ10ml','scb_10'),
  ('EDP+','x_stickerสคบ10ml','scb_10'),
  ('PARFUM','x_stickerสคบ10ml','scb_10'),
  ('EDT','x_stickerสคบ10ml','scb_10'),
  ('EDP','x_stickerสคบ30ml','scb_30'),
  ('EDP+','x_stickerสคบ30ml','scb_30'),
  ('PARFUM','x_stickerสคบ30ml','scb_30'),
  ('EDT','x_stickerสคบ30ml','scb_30'),
  ('EDP','x_stickerสคบ50ml','scb_50'),
  ('EDP+','x_stickerสคบ50ml','scb_50'),
  ('PARFUM','x_stickerสคบ50ml','scb_50'),
  ('EDT','x_stickerสคบ90ml','scb_90')
) as m(grade,xkey,target)
where mi.category='label' and mi.comp_key=m.xkey
  and regexp_replace(lower(btrim(p.name)),'[^a-z0-9ก-๙]','','g')=regexp_replace(lower(btrim(mi.scent)),'[^a-z0-9ก-๙]','','g')
  and (case when upper(coalesce(p.ptype,''))='EDP' then 'EDP' when upper(coalesce(p.ptype,''))='EDP+' then 'EDP+' when upper(coalesce(p.ptype,'')) like '%PARFUM%' then 'PARFUM' when upper(coalesce(p.ptype,''))='EDT' then 'EDT' end)=m.grade
  and not exists (select 1 from material_item x where x.category='label' and x.ref_key=regexp_replace(lower(btrim(mi.scent)),'[^a-z0-9ก-๙]','','g')||'|'||m.target);

-- (3) Dream Island: ลบชิ้นส่วนกล่อง 30ml (EDP ไม่มีขนาดนี้)
delete from material_item where category='label' and comp_key='x_stickerติดกล่อง30ml'
  and regexp_replace(lower(btrim(scent)),'[^a-z0-9ก-๙]','','g')='dreamisland';

-- ═══════════════════════════════════════════════════════════
-- ▼▼▼ FIX_buoyant_thaiperfume.sql ▼▼▼
-- ═══════════════════════════════════════════════════════════
-- แก้ข้อมูล 2 จุด · idempotent (รันซ้ำได้)
-- (1) บาร์โค้ด Buoyant 50 ml. → 8857128011775 (เดิม 8857128012021)
-- (2) เปลี่ยนชื่อ "Thai Perfume (น้ำปรุง)" → "Thai Perfume" ทุกตารางที่อ้างชื่อ

-- (1) Buoyant 50 ml.  — guard: ข้ามถ้าบาร์โค้ดปลายทางมีอยู่แล้ว (กันชน unique + run ซ้ำได้)
update product_barcodes
set barcode = '8857128011775'
where regexp_replace(lower(btrim(scent)), '[^a-z0-9ก-๙]', '', 'g') = 'buoyant'
  and regexp_replace(lower(size), '[^0-9a-z]', '', 'g') = '50ml'
  and barcode <> '8857128011775'
  and not exists (select 1 from product_barcodes b2 where b2.barcode = '8857128011775');

-- (2) rename "Thai Perfume (น้ำปรุง)" → "Thai Perfume"  (จับด้วยชื่อเดิมแบบ normalize)
-- ตัวช่วย: NK = normalize ของชื่อเดิม
-- products
update products set name = 'Thai Perfume'
where regexp_replace(lower(btrim(name)), '[^a-z0-9ก-๙]', '', 'g')
    = regexp_replace(lower(btrim('Thai Perfume (น้ำปรุง)')), '[^a-z0-9ก-๙]', '', 'g');
-- order_items
update order_items set product = 'Thai Perfume'
where regexp_replace(lower(btrim(product)), '[^a-z0-9ก-๙]', '', 'g')
    = regexp_replace(lower(btrim('Thai Perfume (น้ำปรุง)')), '[^a-z0-9ก-๙]', '', 'g');
-- stock (ถ้าปลายทางมีอยู่แล้วจะชน — ที่นี่ไม่มี "Thai Perfume" มาก่อน จึงปลอดภัย)
update stock set product = 'Thai Perfume'
where regexp_replace(lower(btrim(product)), '[^a-z0-9ก-๙]', '', 'g')
    = regexp_replace(lower(btrim('Thai Perfume (น้ำปรุง)')), '[^a-z0-9ก-๙]', '', 'g');
-- stock_moves
update stock_moves set product = 'Thai Perfume'
where regexp_replace(lower(btrim(product)), '[^a-z0-9ก-๙]', '', 'g')
    = regexp_replace(lower(btrim('Thai Perfume (น้ำปรุง)')), '[^a-z0-9ก-๙]', '', 'g');
-- stock_unit
update stock_unit set product = 'Thai Perfume'
where regexp_replace(lower(btrim(product)), '[^a-z0-9ก-๙]', '', 'g')
    = regexp_replace(lower(btrim('Thai Perfume (น้ำปรุง)')), '[^a-z0-9ก-๙]', '', 'g');
-- product_barcodes.scent
update product_barcodes set scent = 'Thai Perfume'
where regexp_replace(lower(btrim(scent)), '[^a-z0-9ก-๙]', '', 'g')
    = regexp_replace(lower(btrim('Thai Perfume (น้ำปรุง)')), '[^a-z0-9ก-๙]', '', 'g');
-- discontinued_sku / closed_sku (best-effort — อาจไม่มีตาราง/แถว)
update discontinued_sku set scent = 'Thai Perfume'
where regexp_replace(lower(btrim(scent)), '[^a-z0-9ก-๙]', '', 'g')
    = regexp_replace(lower(btrim('Thai Perfume (น้ำปรุง)')), '[^a-z0-9ก-๙]', '', 'g');
update closed_sku set scent = 'Thai Perfume'
where regexp_replace(lower(btrim(scent)), '[^a-z0-9ก-๙]', '', 'g')
    = regexp_replace(lower(btrim('Thai Perfume (น้ำปรุง)')), '[^a-z0-9ก-๙]', '', 'g');
-- material_item (ถ้ามี) — เปลี่ยน scent + ref_key (norm(newname)|<ส่วนหลัง>)
update material_item set scent = 'Thai Perfume',
    ref_key = 'thaiperfume|' || split_part(ref_key, '|', 2), updated_at = now()
where regexp_replace(lower(btrim(scent)), '[^a-z0-9ก-๙]', '', 'g')
    = regexp_replace(lower(btrim('Thai Perfume (น้ำปรุง)')), '[^a-z0-9ก-๙]', '', 'g')
  and not exists (
    select 1 from material_item x
    where x.category = material_item.category
      and x.ref_key = 'thaiperfume|' || split_part(material_item.ref_key, '|', 2)
  );

-- ═══════════════════════════════════════════════════════════
-- ▼▼▼ FIX_remap_orphan_materials.sql ▼▼▼
-- ═══════════════════════════════════════════════════════════
-- รวมยอด 8 กลิ่นที่ import เข้ามาชื่อพิมพ์ต่าง → เปลี่ยนให้ตรงกับกลิ่นในระบบ (ทั้งปริมาตร + สติ๊กเกอร์)
-- เปลี่ยน scent + ref_key → ยอดเดิมวิ่งไปรวมกับกลิ่นจริงในกลุ่มเกรดถูก (ไม่หาย ไม่ซ้ำ)
-- ปลอดภัย: ทำเฉพาะเมื่อปลายทางยังไม่มีแถว (กัน unique violation) · รันซ้ำได้

-- (1) ปริมาตร (bulk) — ref_key = norm(scent)|labparfumo
update material_item mi
set scent = m.newname,
    ref_key = regexp_replace(lower(btrim(m.newname)), '[^a-z0-9ก-๙]', '', 'g') || '|labparfumo',
    updated_at = now()
from (values
  ('Volt - Aware',    'Volt - Aware (EDT)'),
  ('Volt - Benign',   'Volt - Benign (EDT)'),
  ('Volt - Elite',    'Volt - Elite (EDT)'),
  ('Volt - Nifty',    'Volt - Nifty (EDT)'),
  ('Volt - Savoury',  'Volt - Savoury (EDT)'),
  ('Volt - Twilight', 'Volt - Twilight (EDT)'),
  ('Gentel Elixir',   'Gentle Elixir'),
  ('Shadow Light',    'Shadow de Bacci Light')
) as m(oldscent, newname)
where mi.category = 'bulk'
  and regexp_replace(lower(btrim(mi.scent)), '[^a-z0-9ก-๙]', '', 'g')
      = regexp_replace(lower(btrim(m.oldscent)), '[^a-z0-9ก-๙]', '', 'g')
  and not exists (
    select 1 from material_item x
    where x.category = 'bulk'
      and x.ref_key = regexp_replace(lower(btrim(m.newname)), '[^a-z0-9ก-๙]', '', 'g') || '|labparfumo'
  );

-- (2) สติ๊กเกอร์ (label) — ref_key = norm(scent)|comp_key
update material_item mi
set scent = m.newname,
    ref_key = regexp_replace(lower(btrim(m.newname)), '[^a-z0-9ก-๙]', '', 'g') || '|' || mi.comp_key,
    updated_at = now()
from (values
  ('Volt - Aware',    'Volt - Aware (EDT)'),
  ('Volt - Benign',   'Volt - Benign (EDT)'),
  ('Volt - Elite',    'Volt - Elite (EDT)'),
  ('Volt - Nifty',    'Volt - Nifty (EDT)'),
  ('Volt - Savoury',  'Volt - Savoury (EDT)'),
  ('Volt - Twilight', 'Volt - Twilight (EDT)'),
  ('Gentel Elixir',   'Gentle Elixir'),
  ('Shadow Light',    'Shadow de Bacci Light')
) as m(oldscent, newname)
where mi.category = 'label'
  and mi.comp_key is not null
  and regexp_replace(lower(btrim(mi.scent)), '[^a-z0-9ก-๙]', '', 'g')
      = regexp_replace(lower(btrim(m.oldscent)), '[^a-z0-9ก-๙]', '', 'g')
  and not exists (
    select 1 from material_item x
    where x.category = 'label'
      and x.ref_key = regexp_replace(lower(btrim(m.newname)), '[^a-z0-9ก-๙]', '', 'g') || '|' || mi.comp_key
  );


-- ═══════════════════════════════════════════════════════════════════════
-- ▼▼▼ ADD_jen_spray_black.sql ▼▼▼
-- ═══════════════════════════════════════════════════════════════════════
-- หัวสเปรย์ JEN: เปลี่ยนชื่อเดิม → "สีเงิน" + เพิ่ม "สีดำ"  · idempotent (run ซ้ำได้)

-- (1) rename p18: "หัวสเปรย์ JEN" → "หัวสเปรย์ JEN สีเงิน" (คงยอด/ประวัติเดิมไว้)
update material_item set label = 'หัวสเปรย์ JEN สีเงิน', updated_at = now()
where category = 'packaging' and ref_key = 'p18';

-- (2) เพิ่ม "หัวสเปรย์ JEN สีดำ" (p34) — sort=18 ให้อยู่ติดกับสีเงิน · เริ่มยอด 0
insert into material_item (category, ref_key, comp_key, label, category2, unit, sort)
values ('packaging','p34','p34','หัวสเปรย์ JEN สีดำ','ฝา/หัวสเปรย์','ชิ้น',18)
on conflict (category, ref_key) do nothing;


-- ═══════════════════════════════════════════════════════════════════════
-- ▼▼▼ เอา "ถุงกระดาษ" ออกจากหมวด Parfum ▼▼▼
-- ═══════════════════════════════════════════════════════════════════════
-- ถุงกระดาษ = บรรจุภัณฑ์/ของแถม ไม่ใช่กลิ่นน้ำหอม → ล้างเกรดออก (ไม่ลบสินค้า
-- เพราะยังใช้ในใบเบิก/PDF/บาร์โค้ด Size S,M) · idempotent
update products set ptype = null where name = 'ถุงกระดาษ';


-- ═══════════════════════════════════════════════════════════════════════
-- ▼▼▼ Backfill ตำบล/แขวง จาก address (ออเดอร์เก่าที่ import ก่อนแยกคอลัมน์) ▼▼▼
-- ═══════════════════════════════════════════════════════════════════════
-- ข้อมูล Shopee เก่าเก็บตำบลรวมใน address (เช่น "…แขวงออเงิน เขตสายไหม…")
-- ดึง "แขวงX / ตำบลX" ลงคอลัมน์ subdistrict เฉพาะแถวที่ยังว่าง · idempotent
update orders
   set subdistrict = (regexp_match(address, '((?:แขวง|ตำบล)\s*[^ ,]+)'))[1]
 where coalesce(subdistrict, '') = ''
   and address ~ '(แขวง|ตำบล)';


-- ═══════════════════════════════════════════════════════════════════════
-- ▼▼▼ Backfill ลูกค้าใหม่/เก่า + ซื้อครั้งที่ ให้ออเดอร์ที่ค่ายังว่าง ▼▼▼
-- ═══════════════════════════════════════════════════════════════════════
-- นับลำดับการซื้อจาก username (เรียงตามวันที่) → เติม purchase_count + customer_type
-- เฉพาะแถวที่ยังว่าง (ครั้งที่ 1 = ลูกค้าใหม่) · idempotent
with seq as (
  select order_no,
         row_number() over (partition by lower(btrim(username))
                            order by doc_date nulls last, created_at, order_no) as n
  from orders
  where deleted_at is null and coalesce(btrim(username), '') <> ''
)
update orders o
   set purchase_count = coalesce(o.purchase_count, seq.n),
       customer_type  = coalesce(nullif(btrim(o.customer_type), ''),
                                 case when seq.n > 1 then 'ลูกค้าเก่า' else 'ลูกค้าใหม่' end)
  from seq
 where seq.order_no = o.order_no
   and (o.purchase_count is null or coalesce(btrim(o.customer_type), '') = '');


-- ═══════════════════════════════════════════════════════════════════════
-- ▼▼▼ ชื่อพ้องกลิ่น (alias) — Lazada/Shopee เขียนชื่อไม่ตรง ▼▼▼ (migration 0034)
-- ═══════════════════════════════════════════════════════════════════════
create table if not exists scent_aliases (
  id serial primary key,
  alias_key text not null unique,
  alias_text text not null,
  product text not null,
  created_by integer,
  created_at timestamptz not null default now()
);
create index if not exists idx_scent_aliases_product on scent_aliases (product);
insert into scent_aliases (alias_key, alias_text, product) values
  ('shadowdebacci', 'Shadow de bacci', 'Shadow de Bacci Light')
on conflict (alias_key) do nothing;


-- ═══════════════════════════════════════════════════════════════════════
-- ▼▼▼ เปิดแพลตฟอร์มที่เหลือ (ให้ตาราง platforms มีครบ — กัน FK พังตอนสร้าง/นำเข้าใบเบิก) ▼▼▼
-- ═══════════════════════════════════════════════════════════════════════
insert into platforms (code, name, prefix, sort) values
  ('Lazada', 'Lazada', 'LZ', 2),
  ('Tiktok', 'TikTok', 'TT', 3),
  ('Line', 'Line', 'LN', 4),
  ('Website', 'Website', 'WEB', 5),
  ('Office', 'Office', 'OFF', 6)
on conflict (code) do nothing;


commit;
