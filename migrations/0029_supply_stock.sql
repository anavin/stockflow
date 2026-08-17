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
  ('packaging','p18','p18','หัวสเปรย์ JEN','ฝา/หัวสเปรย์','ชิ้น',18),
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
