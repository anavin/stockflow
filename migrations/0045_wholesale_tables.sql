-- ค้าส่ง: ย้าย catalog (Eveandboy/King Power) + สาขา (Eveandboy) เข้า DB → จัดการในระบบได้ (เพิ่ม/ลด/แก้)
-- seed จากไฟล์ static ปัจจุบัน (57 catalog · 31 สาขา) · idempotent
-- สร้างจาก scripts/gen-wholesale-migration.mjs — อย่าแก้มือ
create table if not exists wholesale_catalog (
  id serial primary key,
  platform  text not null,          -- 'Eveandboy' | 'KingPower'
  product   text not null,          -- กลิ่น (จับกับ products ด้วย normalize)
  size      text not null,          -- เช่น '50 ml'
  barcode   text,                   -- REFERENCE (บาร์โค้ดสินค้า)
  code      text,                   -- ARTICLE / รหัสสินค้าของคู่ค้า (โชว์เป็น Product Code)
  item_name text,                   -- ชื่อสินค้าที่โชว์บนใบเบิก/ใบส่งของ
  grade     text,                   -- เกรดของคู่ค้า (EDP/LE PARFUM/EDP EXTRAIT) — optional
  active    boolean not null default true,
  sort      int default 0,
  updated_at timestamptz default now(),
  unique (platform, product, size)
);
create index if not exists idx_wholesale_catalog_platform on wholesale_catalog (platform, active);

create table if not exists wholesale_branch (
  id serial primary key,
  platform  text not null,          -- 'Eveandboy' (King Power พิมพ์สาขาเอง — ไม่ seed)
  branch    text not null,          -- ชื่อสาขา
  code      text,                   -- รหัสสาขา
  address   text,
  active    boolean not null default true,
  sort      int default 0,
  updated_at timestamptz default now(),
  unique (platform, branch)
);
create index if not exists idx_wholesale_branch_platform on wholesale_branch (platform, active);

-- seed catalog (on conflict = ไม่ทับของที่แก้ในระบบแล้ว)
insert into wholesale_catalog (platform, product, size, barcode, code, item_name, grade, sort) values
  ('Eveandboy','Dream Island','50 ml','8857128011300','8857128011300','LAB PARFUMO-Dream Island Eau De Parfum//50ML',null,0),
  ('Eveandboy','Never Blue','50 ml','8857128011287','8857128011287','LAB PARFUMO-Never Blue Eau De Parfum//50ML',null,1),
  ('Eveandboy','Secret of Peach','50 ml','8857128011119','8857128011119','LAB PARFUMO-Secret of Peach Eau De Parfum//50ML',null,2),
  ('Eveandboy','Senorita','50 ml','8857128011171','8857128011171','LAB PARFUMO-Senorita Eau De Parfum//50ML',null,3),
  ('Eveandboy','Vivid','50 ml','8857128011065','8857128011065','LAB PARFUMO-Vivid Eau De Parfum//50ML',null,4),
  ('Eveandboy','Zeus','50 ml','8857128011027','8857128011027','LAB PARFUMO-Zeus Eau De Parfum//50ML',null,5),
  ('Eveandboy','Dream Island','30 ml','8857128011874','8857128011874','LAB PARFUMO-Dream Island Eau de Parfum//30ML',null,6),
  ('Eveandboy','La Belle','30 ml','8857128011904','8857128011904','LAB PARFUMO-La Belle Eau de Parfum//30ML',null,7),
  ('Eveandboy','Never Blue','30 ml','8857128011836','8857128011836','LAB PARFUMO-Never Blue Eau de Parfum//30ML',null,8),
  ('Eveandboy','Persist','30 ml','8857128011881','8857128011881','LAB PARFUMO-Persist Eau de Parfum//30ML',null,9),
  ('Eveandboy','Secret of Peach','30 ml','8857128011850','8857128011850','LAB PARFUMO-Secret of Peach Eau de Parfum//30ML',null,10),
  ('Eveandboy','Senorita','30 ml','8857128011867','8857128011867','LAB PARFUMO-Senorita Eau de Parfum//30ML',null,11),
  ('Eveandboy','Sicilia','30 ml','8857128011911','8857128011911','LAB PARFUMO-Sicilia Eau de Parfum//30ML',null,12),
  ('Eveandboy','VirginX','30 ml','8857128011997','8857128011997','LAB PARFUMO-VirginX Eau de Perfum//30ML',null,13),
  ('Eveandboy','Vivid','30 ml','8857128011898','8857128011898','LAB PARFUMO-Vivid Eau de Parfum//30ML',null,14),
  ('Eveandboy','Zeus','30 ml','8857128011843','8857128011843','LAB PARFUMO-Zeus Eau de Parfum//30ML',null,15),
  ('KingPower','NEVER BLUE','30 ml','8857128011836','4809674','LPF 30ML NEVER BLUE EAU DE PARFUM','EAU DE PARFUM',16),
  ('KingPower','ZEUS','30 ml','8857128011843','4809675','LPF 30ML ZEUS EAU DE PARFUM','EAU DE PARFUM',17),
  ('KingPower','SECRET OF PEACH','30 ml','8857128011850','4809676','LPF 30ML SECRET OF PEACH EAU DE PARFUM','EAU DE PARFUM',18),
  ('KingPower','SENORITA','30 ml','8857128011867','4809677','LPF 30ML SENORITA EAU DE PARFUM','EAU DE PARFUM',19),
  ('KingPower','DREAM ISLAND','30 ml','8857128011874','4809678','LPF 30ML DREAM ISLAND EAU DE PARFUM','EAU DE PARFUM',20),
  ('KingPower','PERSIST','30 ml','8857128011881','4809679','LPF 30ML PERSIST EAU DE PARFUM','EAU DE PARFUM',21),
  ('KingPower','LA BELLE','30 ml','8857128011904','4809680','LPF 30ML LA BELLE EAU DE PARFUM','EAU DE PARFUM',22),
  ('KingPower','VIRGINX','30 ml','8857128011997','4809681','LPF 30ML VIRGINX EAU DE PARFUM','EAU DE PARFUM',23),
  ('KingPower','VIVID','30 ml','8857128011898','4809682','LPF 30ML VIVID EAU DE PARFUM','EAU DE PARFUM',24),
  ('KingPower','NEVER BLUE','50 ml','8857128011287','4832519','LPF 50ML NEVER BLUE EAU DE PARFUM','EAU DE PARFUM',25),
  ('KingPower','ZEUS','50 ml','8857128011027','4832520','LPF 50ML ZEUS EAU DE PARFUM','EAU DE PARFUM',26),
  ('KingPower','SECRET OF PEACH','50 ml','8857128011119','4832521','LPF 50ML SECRET OF PEACH EAU DE PARFUM','EAU DE PARFUM',27),
  ('KingPower','SENORITA','50 ml','8857128011171','4832522','LPF 50ML SENORITA EAU DE PARFUM','EAU DE PARFUM',28),
  ('KingPower','DREAM ISLAND','50 ml','8857128011300','4832523','LPF 50ML DREAM ISLAND EAU DE PARFUM','EAU DE PARFUM',29),
  ('KingPower','PERSIST','50 ml','8857128011041','4832524','LPF 50MLPERSIST EAU DE PARFUM','EAU DE PARFUM',30),
  ('KingPower','LA BELLE','50 ml','8857128011058','4832525','LPF 50ML LA BELLE EAU DE PARFUM','EAU DE PARFUM',31),
  ('KingPower','VIRGINX','50 ml','8857128011256','4832526','LPF 50ML VIRGINX EAU DE PARFUM','EAU DE PARFUM',32),
  ('KingPower','VIVID','50 ml','8857128011065','4832527','LPF 50ML VIVID EAU DE PARFUM','EAU DE PARFUM',33),
  ('KingPower','CERISE SUCREE','50 ml','8857128011539','4868237','LPF 50ML CERISE SUCREE LE PARFUM','LE PARFUM',34),
  ('KingPower','GAMBLING 34+35','50 ml','8857128011591','4868241','LPF 50ML GAMBLING 34+35 LE PARFUM','LE PARFUM',35),
  ('KingPower','QUEEN','50 ml','8857128011607','4868238','LPF 50ML QUEEN LE PARFUM','LE PARFUM',36),
  ('KingPower','SAVOURY','50 ml','8857128011614','4868239','LPF 50ML SAVOURY LE PARFUM','LE PARFUM',37),
  ('KingPower','WHAT','50 ml','8857128011645','4868240','LPF 50ML WHAT LE PARFUM','LE PARFUM',38),
  ('KingPower','BLACKEST BLACK','50 ml','8857128011669','4868242','LPF 50ML BLACKEST BLACK EDP EXTRAIT','EDP EXTRAIT',39),
  ('KingPower','LEGEND OF OUD','50 ml','8857128011683','4868243','LPF 50ML LEGEND OF OUD EDP EXTRAIT','EDP EXTRAIT',40),
  ('KingPower','LUSCIOUS SANTAL','50 ml','8857128011690','4868244','LPF 50ML LUSCIOUS SANTAL EDP EXTRAIT','EDP EXTRAIT',41),
  ('KingPower','PATCHOULI ABSOLUTE','50 ml','8857128011706','4868245','LPF 50ML PATCHOULI ABSOLUTE EDP EXTRAIT','EDP EXTRAIT',42),
  ('KingPower','SPARKLING MANDARIN','50 ml','8857128011713','4868246','LPF 50ML SPARKLING MANDARIN EDP EXTRAIT','EDP EXTRAIT',43),
  ('KingPower','TROPICAL LEATHER','50 ml','8857128011720','4868247','LPF 50ML TROPICAL LEATHER EDP EXTRAIT','EDP EXTRAIT',44),
  ('KingPower','MOONLIGHT','50 ml','8857128011089','4868248','LPF 50ML MOONLIGHT EAU DE PARFUM','EAU DE PARFUM',45),
  ('KingPower','QUEEN','30 ml','8857128012001','4868250','LPF 30ML QUEEN LE PARFUM','LE PARFUM',46),
  ('KingPower','SAVOURY','30 ml','8857128012002','4868251','LPF 30ML SAVOURY LE PARFUM','LE PARFUM',47),
  ('KingPower','CERISE SUCREE','30 ml','8857128012003','4868249','LPF 30ML CERISE SUCREE LE PARFUM','LE PARFUM',48),
  ('KingPower','BLACKEST BLACK','30 ml','8857128012005','4868253','LPF 30ML BLACKEST BLACK EDP EXTRAIT','EDP EXTRAIT',49),
  ('KingPower','LEGEND OF OUD','30 ml','8857128012007','4868254','LPF 30ML LEGEND OF OUD EDP EXTRAIT','EDP EXTRAIT',50),
  ('KingPower','LUSCIOUS SANTAL','30 ml','8857128012008','4868255','LPF 30ML LUSCIOUS SANTAL EDP EXTRAIT','EDP EXTRAIT',51),
  ('KingPower','PATCHOULI ABSOLUTE','30 ml','8857128012009','4868256','LPF 30ML PATCHOULI ABSOLUTE EDP EXTRAIT','EDP EXTRAIT',52),
  ('KingPower','SPARKLING MANDARIN','30 ml','8857128012010','4868257','LPF 30ML SPARKLING MANDARIN EDP EXTRAIT','EDP EXTRAIT',53),
  ('KingPower','TROPICAL LEATHER','30 ml','8857128012011','4868258','LPF 30ML TROPICAL LEATHER EDP EXTRAIT','EDP EXTRAIT',54),
  ('KingPower','WHAT','30 ml','8857128012013','4868252','LPF 30ML WHAT LE PARFUM','LE PARFUM',55),
  ('KingPower','MOONLIGHT','30 ml','8857128012014','4868259','LPF 30ML MOONLIGHT EAU DE PARFUM','EAU DE PARFUM',56)
on conflict (platform, product, size) do nothing;

-- seed สาขา Eveandboy
insert into wholesale_branch (platform, branch, code, address, sort) values
  ('Eveandboy','06_MGB - MEGA BANGNA','06_MGB','เลขที่ 39 อาคาร ศูนย์การค้าเมกาบางนา ห้องเลขที่ 1472,1474 ชั้นที่ 1 หมู่ที่ 6 ถนนบางนา-ตราด ตำบลบางแก้ว อำเภอบางพลี จังหวัดสมุทรปราการ 10540',0),
  ('Eveandboy','07_KRT - TERMINAL 21 KORAT','07_KRT','เลขที่ 99 อาคาร ศูนย์การค้าเทอมินอล21โคราช ห้องสต๊อค จี 01 ชั้น จี ถนน มิตรภาพ-หนองคาย ตำบลในมือง อำเภอเมืองนครราชสีมา จังหวัดนครราชสีมา 30000',1),
  ('Eveandboy','08_SQ1 - SIAM SQUARE ONE','08_SQ1','เลขที่ 388 อาคาร สยามสแควร์ วัน ห้องเลขที่ เอฟเอสแอลจี 008/1 ชั้นที่ แอลจี ถนนพระราม 1 แขวงปทุมวัน เขตปทุมวัน กรุงเทพมหานคร 10330',2),
  ('Eveandboy','10_M07 - THE MALL BANGKAE M07','10_M07','เลขที่ 518 อาคารศูนย์การค้าเดอะมอลล์บางแค ห้องเลขที่ GT-GT01 ชั้นที่ G  ถนนเพชรเกษม แขวงบางแคเหนือ เขตบางแค กรุงเทพมหานคร 10160',3),
  ('Eveandboy','11_FSH - FASHION ISLAND','11_FSH','เลขที่ 587, 589, 589/7-9 อาคาร ศูนย์การค้าแฟชั่น ไอส์แลนด์ ห้องสต๊อก บี 0 ถนนรามอินทรา แขวงคันนายาว เขตคันนายาว กรุงเทพมหานคร 10230',4),
  ('Eveandboy','12_ASK - TERMINAL 21 ASOK','12_ASK','เลขที่ 88 อาคาร ศูนย์การค้าเทอมินอล 21 ห้องเลขที่ เอสเอช-3-008 ชั้นที่ 3 ซอยสุขุมวิท 19(วัฒนา) ถนนสุขุมวิท แขวงคลองเตยเหนือ เขตวัฒนา กรุงเทพมหานคร 10110',5),
  ('Eveandboy','13_PTY - TERMINAL 21 PATTAYA','13_PTY','เลขที่ 777 อาคารศูนย์การค้าเทอมินอล 21 พัทยา ห้องเลขที่ เอสที 09 ชั้นเอ็ม หมู่ที่ 6 ตำบลนาเกลือ อำเภอบางละมุง จังหวัดชลบุรี 20150',6),
  ('Eveandboy','15_SPO - SIAM PREMIUM OUTLET','15_SPO','เลขที่ 989 โครงการศูนย์การค้าสยามพรีเมียมเอ้าท์เล็ท ห้องเลขที่ จี18 ชั้นจี หมู่ที่ 14 ตำบลบางเสาธง อำเภอบางเสาธง จังหวัดสมุทรปราการ 10570',7),
  ('Eveandboy','17_M06 - THE MALL NGAMWONGWAN M06','17_M06','เลขที่ 408, 410, 412, 414, 416, 418, 420, 422, 424, 426, 428, 430, 430/1 ห้องเลขที่ เอสที 501,506 ชั้น 5 ศูนย์การค้าเดอะมอลล์ สาขางามวงศ์วาน ถนนงามวงศ์วาน ตำบลบางเขน อำเภอเมืองนนทบุรี จังหวัดนนทบุรี 11001',8),
  ('Eveandboy','18_M05 - THE MALL THAPRA M05','18_M05','เลขที่ 129 ห้องเลขที่ ST101 ชั้น 1 ศูนย์การค้าเดอะมอลล์ สาขาท่าพระ ถนนรัชดาภิเษก แขวงบุคคโล เขตธนบุรี กรุงเทพมหานคร 10600',9),
  ('Eveandboy','19_MBK - MBK CENTER','19_MBK','เลขที่ 444 ชั้น 4 ศูนย์การค้าเอ็มบีเค เซ็นเตอร์ ห้องเลขที่ PLA.F04.D009003 , PLAF04.D009004 , PLAF04.D009005 ถนนพญาไท แขวงวังใหม่ เขตปทุมวัน กรุงเทพมหานคร 10330',10),
  ('Eveandboy','22_PTN - PLATINUM FASHION MALL','22_PTN','เลขที่ 220 อาคารโนโวเทล กรุงเทพ แพลทินัม ห้องเลขที่ พี312242 ชั้นที่ 1 ถนนเพชรบุรี แขวงถนนเพชรบุรี เขตราชเทวี กรุงเทพมหานคร 10400',11),
  ('Eveandboy','30_ACP - AYUTTHAYA CITY PARK','30_ACP','เลขที่ 126 ศูนย์การค้าอยุธยาซิตี้พาร์ค ห้องเลขที่เอสเอ-16 ชั้น บีเอฟ หมู่ที่ 3 ถนนสายเอเชีย ตำบลคลองสวนพลู อำเภอพระนครศรีอยุธยา จังหวัดพระนครศรีอยุธยา 13000',12),
  ('Eveandboy','31_STC - SERMTHAI COMPLEX','31_STC','เลขที่ 76/1-7 ศูนย์การค้าเสริมไทย คอมเพล็กซ์ ห้องเลขที่ TU-07 ชั้น B ถนนนครสวรรค์ ตำบลตลาด อำเภอเมืองมหาสารคาม จังหวัดมหาสารคาม 44000',13),
  ('Eveandboy','32_CHA - CHARN AT THE AVENUE','32_CHA','เลขที่ 104/42 อาคาร A โครงการ ชาน แอ็ท ดิ อเวนิว ห้องเลขที่ A110.1 ชั้น 1 หมู่ที่ 1 ถนนแจ้งวัฒนะ แขวงทุ่งสองห้อง เขตหลักสี่ กรุงเทพมหานคร 10210',14),
  ('Eveandboy','33_HYV - HADYAI VILLAGE','33_HYV','เลขที่ 538/4 โครงการหาดใหญ่ วิลเลจ อาคาร U ห้องเลขที่ U101/1 ชั้น 1 ถนนกาญจนวณิชย์ ตำบลหาดใหญ่ อำเภอหาดใหญ่ จังหวัดสงขลา 90110',15),
  ('Eveandboy','35_TSR - THE STREET RATCHADA','35_TSR','เลขที่ 139 ศูนย์การค้า THE STREET RATCHADA ห้องเลขที่ S21 ชั้น B ถนนรัชดาภิเษก แขวงดินแดง เขตดินแดง กรุงเทพมหานคร 10400',16),
  ('Eveandboy','36_UNM - UNION MALL','36_UNM','เลขที่ 54 ศูนย์กำรค้ายูเนี่ยนมอลล์ ห้องเลขที่ 2โอ-01 ชั้น เอฟ-2 ซอยลาดพร้าว 1 แขวงจอมพล เขตจตุจักร กรุงเทพมหานคร 10900',17),
  ('Eveandboy','40_SHS - SAHATHAI GARDEN PLAZA','40_SHS','เลขที่ 528/1 ศูนย์การค้า สหไทย การ์เด้น พลาซ่า ห้องเลขที่ 226 ชั้น 2 ถนนตลาดใหม่ ตำบลตลาด อำเภอเมืองสุราษฎร์ธานี จังหวัดสุราษฎร์ธานี 84000',18),
  ('Eveandboy','41_M10 - THE MALL KORAT M10','41_M10','เลขที่ 1242/2 ศูนย์การค้าเดอะมอลล์ โคราช ห้องเลขที่ บีบี-07/1 ชั้น บี ถนนมิตรภาพ ตำบลในเมือง อำเภอเมืองนครราชสีมา จังหวัดนครราชสีมา 30000',19),
  ('Eveandboy','42_VSN - NAKONSAWAN V SQUARE','42_VSN','เลขที่ 320/11 อาคาร วี-สแควร์ พลาซ่า ห้องเลขที่ 208-210 ชั้น 2 ถนนสวรรค์วิถี ตำบลปากน้ำโพ อำเภอเมืองนครสวรรค์ จังหวัดนครสวรรค์ 60000',20),
  ('Eveandboy','43_SHN - SAHATHAI PLAZA NAKHON SI THAMMARAT','43_SHN','เลขที่ 1392 โครงการ สหไทยพลาซ่า นครศรีธรรมราช ห้องเลขที่ FB-01-04 ชั้น B ถนนศรีปราชญ์ ตำบลท่าวัง อำเภอเมือง จังหวัดนครศรีธรรมราช 80000',21),
  ('Eveandboy','48_BPH - BLUPORT HUAHIN_BPH','48_BPH','เลขที่ 8/89 ศูนย์การค้า BLUPORT HUAHIN ห้องเลขที่ 1M-011, 1M-012, 1M-013 ชั้น 1M ซอยหมู่บ้านหนองแก ตำบลหนองแก อำเภอหัวหิน จังหวัดประจวบคีรีขันธ์ 77110',22),
  ('Eveandboy','51_TSP - THE SPHERES','51_TSP','เลขที่ 45/9 โครงการ THE SPHERES PHETKASEM อาคาร A ห้องเลขที่ B7/2 ชั้น 1 หมู่ที่ 6 ตำบลอ้อมน้อย อำเภอกระทุ่มแบน จังหวัดสมุทรสาคร 74130',23),
  ('Eveandboy','52_SNT - SUNEE TOWER UBON','52_SNT','เลขที่ 512/8 สุนีย์ทาวเวอร์ ห้องเลขที่ G01 ชั้น G ถนนชยางกูร ตำบลในเมือง อำเภอเมืองอุบลราชธานี จังหวัดอุบลราชธานี 34000',24),
  ('Eveandboy','57_CBL - COSMO BAZAAR LIFESTYLE MALL','57_CBL','เลขที่ 101-101/1 ห้องเลขที่ SF19 ชั้น 4 ถนนป๊อปปูล่า ตำบลบ้านใหม่ อำเภอปากเกร็ด นนทบุรี 11120',25),
  ('Eveandboy','58_JSP - JUNGCELON SHOPPING CENTER (PHUKET)','58_JSP','เลขที181 อาคารจังซีลอน ห้องเลขที่1223/7-11,1225 ชั้น 2 ถนนราษฎร์อุทิศ 200 ปี ตำบลป่าตอง อำ เภอ กะทู้ จังหวัดภูเก็ต 83150',26),
  ('Eveandboy','61_TMP - THONBURI MARKET PLACE','61_TMP','เลขที่ 54 อาคารธนบุรี มาเก็ต เพลส ห้องเลขที่C01 ถนนบรมราชชนนี แขวงศาลาธรรมสพน์ เขตทวีวัฒนา กรุงเทพฯ 10170',27),
  ('Eveandboy','62_BCA - BIG C AMNAT CHAREON','62_BCA','เลขที่477 อาคาร Big C super center ชั้น ที่G-IN ห้องเลขที่ GCR1101, GCR1136/1 ตำบลบุ่ง อำเภอเมืองอำนาจ จังหวัด อำนาจเจริญ 37000',28),
  ('Eveandboy','63_JPS - J-PARK SRI RACHA NIHON MURA','63_JPS','เลขที่ 8 โครงการเจพาร์ค ศรีราชา นิฮอน มูระ ห้องเลขที่ J1-B2-04 หมู่ที่ 6 ตำบลสุรศักด์ อำเภอศรีราชา จังหวัดชลบุรี 20110',29),
  ('Eveandboy','66_JKB - THE JAS KHUBON','66_JKB','เลขที่ 54/12-13 อาคารแจส กรีนวิลเลจคู้บอน ชั้นที่1 ห้องเลขที่ X101,W102 ถนนคู้บอน แขวงบางชัน เขตคลองสามวา กรุงเทพมหานคร 10510',30)
on conflict (platform, branch) do nothing;
