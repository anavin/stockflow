// สร้างอัตโนมัติจาก EVEANDBOY PRODUCT NAME and BRANCH.xlsx (scripts/gen-eveandboy.mjs) — อย่าแก้มือ
// ชื่อสินค้าแบบ Eveandboy (key = barcode/ITEMID)
export const EVEANDBOY_NAMES: Record<string, string> = {
  "8857128011300": "LAB PARFUMO-Dream Island Eau De Parfum//50ML",
  "8857128011287": "LAB PARFUMO-Never Blue Eau De Parfum//50ML",
  "8857128011119": "LAB PARFUMO-Secret of Peach Eau De Parfum//50ML",
  "8857128011171": "LAB PARFUMO-Senorita Eau De Parfum//50ML",
  "8857128011065": "LAB PARFUMO-Vivid Eau De Parfum//50ML",
  "8857128011027": "LAB PARFUMO-Zeus Eau De Parfum//50ML",
  "8857128011874": "LAB PARFUMO-Dream Island Eau de Parfum//30ML",
  "8857128011904": "LAB PARFUMO-La Belle Eau de Parfum//30ML",
  "8857128011836": "LAB PARFUMO-Never Blue Eau de Parfum//30ML",
  "8857128011881": "LAB PARFUMO-Persist Eau de Parfum//30ML",
  "8857128011850": "LAB PARFUMO-Secret of Peach Eau de Parfum//30ML",
  "8857128011867": "LAB PARFUMO-Senorita Eau de Parfum//30ML",
  "8857128011911": "LAB PARFUMO-Sicilia Eau de Parfum//30ML",
  "8857128011997": "LAB PARFUMO-VirginX Eau de Perfum//30ML",
  "8857128011898": "LAB PARFUMO-Vivid Eau de Parfum//30ML",
  "8857128011843": "LAB PARFUMO-Zeus Eau de Parfum//30ML"
};
// map (กลิ่น+ขนาด ml) → {barcode, ชื่อ Eveandboy} — key = normalize(scent)+"|"+ml เช่น "dreamisland|50"
export type EvbItem = { barcode: string; item_name: string };
export const EVEANDBOY_BY_KEY: Record<string, EvbItem> = {
  "dreamisland|50": {
    "barcode": "8857128011300",
    "item_name": "LAB PARFUMO-Dream Island Eau De Parfum//50ML"
  },
  "neverblue|50": {
    "barcode": "8857128011287",
    "item_name": "LAB PARFUMO-Never Blue Eau De Parfum//50ML"
  },
  "secretofpeach|50": {
    "barcode": "8857128011119",
    "item_name": "LAB PARFUMO-Secret of Peach Eau De Parfum//50ML"
  },
  "senorita|50": {
    "barcode": "8857128011171",
    "item_name": "LAB PARFUMO-Senorita Eau De Parfum//50ML"
  },
  "vivid|50": {
    "barcode": "8857128011065",
    "item_name": "LAB PARFUMO-Vivid Eau De Parfum//50ML"
  },
  "zeus|50": {
    "barcode": "8857128011027",
    "item_name": "LAB PARFUMO-Zeus Eau De Parfum//50ML"
  },
  "dreamisland|30": {
    "barcode": "8857128011874",
    "item_name": "LAB PARFUMO-Dream Island Eau de Parfum//30ML"
  },
  "labelle|30": {
    "barcode": "8857128011904",
    "item_name": "LAB PARFUMO-La Belle Eau de Parfum//30ML"
  },
  "neverblue|30": {
    "barcode": "8857128011836",
    "item_name": "LAB PARFUMO-Never Blue Eau de Parfum//30ML"
  },
  "persist|30": {
    "barcode": "8857128011881",
    "item_name": "LAB PARFUMO-Persist Eau de Parfum//30ML"
  },
  "secretofpeach|30": {
    "barcode": "8857128011850",
    "item_name": "LAB PARFUMO-Secret of Peach Eau de Parfum//30ML"
  },
  "senorita|30": {
    "barcode": "8857128011867",
    "item_name": "LAB PARFUMO-Senorita Eau de Parfum//30ML"
  },
  "sicilia|30": {
    "barcode": "8857128011911",
    "item_name": "LAB PARFUMO-Sicilia Eau de Parfum//30ML"
  },
  "virginx|30": {
    "barcode": "8857128011997",
    "item_name": "LAB PARFUMO-VirginX Eau de Perfum//30ML"
  },
  "vivid|30": {
    "barcode": "8857128011898",
    "item_name": "LAB PARFUMO-Vivid Eau de Parfum//30ML"
  },
  "zeus|30": {
    "barcode": "8857128011843",
    "item_name": "LAB PARFUMO-Zeus Eau de Parfum//30ML"
  }
};
// ขนาดที่ Eveandboy มีต่อกลิ่น (key = normalize(scent)) — ใช้จำกัดตัวเลือกในฟอร์ม (เลือกได้เฉพาะที่มี)
export const EVEANDBOY_SIZES_BY_SCENT: Record<string, string[]> = {
  "dreamisland": [
    "50 ml",
    "30 ml"
  ],
  "neverblue": [
    "50 ml",
    "30 ml"
  ],
  "secretofpeach": [
    "50 ml",
    "30 ml"
  ],
  "senorita": [
    "50 ml",
    "30 ml"
  ],
  "vivid": [
    "50 ml",
    "30 ml"
  ],
  "zeus": [
    "50 ml",
    "30 ml"
  ],
  "labelle": [
    "30 ml"
  ],
  "persist": [
    "30 ml"
  ],
  "sicilia": [
    "30 ml"
  ],
  "virginx": [
    "30 ml"
  ]
};
// สาขา Eveandboy (dropdown + ที่อยู่บนใบเบิก)
export type EvbBranch = { branch: string; code: string; name: string; address: string };
export const EVEANDBOY_BRANCHES: EvbBranch[] = [
  {
    "branch": "06_MGB - MEGA BANGNA",
    "code": "06_MGB",
    "name": "MEGA BANGNA",
    "address": "เลขที่ 39 อาคาร ศูนย์การค้าเมกาบางนา ห้องเลขที่ 1472,1474 ชั้นที่ 1 หมู่ที่ 6 ถนนบางนา-ตราด ตำบลบางแก้ว อำเภอบางพลี จังหวัดสมุทรปราการ 10540"
  },
  {
    "branch": "07_KRT - TERMINAL 21 KORAT",
    "code": "07_KRT",
    "name": "TERMINAL 21 KORAT",
    "address": "เลขที่ 99 อาคาร ศูนย์การค้าเทอมินอล21โคราช ห้องสต๊อค จี 01 ชั้น จี ถนน มิตรภาพ-หนองคาย ตำบลในมือง อำเภอเมืองนครราชสีมา จังหวัดนครราชสีมา 30000"
  },
  {
    "branch": "08_SQ1 - SIAM SQUARE ONE",
    "code": "08_SQ1",
    "name": "SIAM SQUARE ONE",
    "address": "เลขที่ 388 อาคาร สยามสแควร์ วัน ห้องเลขที่ เอฟเอสแอลจี 008/1 ชั้นที่ แอลจี ถนนพระราม 1 แขวงปทุมวัน เขตปทุมวัน กรุงเทพมหานคร 10330"
  },
  {
    "branch": "10_M07 - THE MALL BANGKAE M07",
    "code": "10_M07",
    "name": "THE MALL BANGKAE M07",
    "address": "เลขที่ 518 อาคารศูนย์การค้าเดอะมอลล์บางแค ห้องเลขที่ GT-GT01 ชั้นที่ G  ถนนเพชรเกษม แขวงบางแคเหนือ เขตบางแค กรุงเทพมหานคร 10160"
  },
  {
    "branch": "11_FSH - FASHION ISLAND",
    "code": "11_FSH",
    "name": "FASHION ISLAND",
    "address": "เลขที่ 587, 589, 589/7-9 อาคาร ศูนย์การค้าแฟชั่น ไอส์แลนด์ ห้องสต๊อก บี 0 ถนนรามอินทรา แขวงคันนายาว เขตคันนายาว กรุงเทพมหานคร 10230"
  },
  {
    "branch": "12_ASK - TERMINAL 21 ASOK",
    "code": "12_ASK",
    "name": "TERMINAL 21 ASOK",
    "address": "เลขที่ 88 อาคาร ศูนย์การค้าเทอมินอล 21 ห้องเลขที่ เอสเอช-3-008 ชั้นที่ 3 ซอยสุขุมวิท 19(วัฒนา) ถนนสุขุมวิท แขวงคลองเตยเหนือ เขตวัฒนา กรุงเทพมหานคร 10110"
  },
  {
    "branch": "13_PTY - TERMINAL 21 PATTAYA",
    "code": "13_PTY",
    "name": "TERMINAL 21 PATTAYA",
    "address": "เลขที่ 777 อาคารศูนย์การค้าเทอมินอล 21 พัทยา ห้องเลขที่ เอสที 09 ชั้นเอ็ม หมู่ที่ 6 ตำบลนาเกลือ อำเภอบางละมุง จังหวัดชลบุรี 20150"
  },
  {
    "branch": "15_SPO - SIAM PREMIUM OUTLET",
    "code": "15_SPO",
    "name": "SIAM PREMIUM OUTLET",
    "address": "เลขที่ 989 โครงการศูนย์การค้าสยามพรีเมียมเอ้าท์เล็ท ห้องเลขที่ จี18 ชั้นจี หมู่ที่ 14 ตำบลบางเสาธง อำเภอบางเสาธง จังหวัดสมุทรปราการ 10570"
  },
  {
    "branch": "17_M06 - THE MALL NGAMWONGWAN M06",
    "code": "17_M06",
    "name": "THE MALL NGAMWONGWAN M06",
    "address": "เลขที่ 408, 410, 412, 414, 416, 418, 420, 422, 424, 426, 428, 430, 430/1 ห้องเลขที่ เอสที 501,506 ชั้น 5 ศูนย์การค้าเดอะมอลล์ สาขางามวงศ์วาน ถนนงามวงศ์วาน ตำบลบางเขน อำเภอเมืองนนทบุรี จังหวัดนนทบุรี 11001"
  },
  {
    "branch": "18_M05 - THE MALL THAPRA M05",
    "code": "18_M05",
    "name": "THE MALL THAPRA M05",
    "address": "เลขที่ 129 ห้องเลขที่ ST101 ชั้น 1 ศูนย์การค้าเดอะมอลล์ สาขาท่าพระ ถนนรัชดาภิเษก แขวงบุคคโล เขตธนบุรี กรุงเทพมหานคร 10600"
  },
  {
    "branch": "19_MBK - MBK CENTER",
    "code": "19_MBK",
    "name": "MBK CENTER",
    "address": "เลขที่ 444 ชั้น 4 ศูนย์การค้าเอ็มบีเค เซ็นเตอร์ ห้องเลขที่ PLA.F04.D009003 , PLAF04.D009004 , PLAF04.D009005 ถนนพญาไท แขวงวังใหม่ เขตปทุมวัน กรุงเทพมหานคร 10330"
  },
  {
    "branch": "22_PTN - PLATINUM FASHION MALL",
    "code": "22_PTN",
    "name": "PLATINUM FASHION MALL",
    "address": "เลขที่ 220 อาคารโนโวเทล กรุงเทพ แพลทินัม ห้องเลขที่ พี312242 ชั้นที่ 1 ถนนเพชรบุรี แขวงถนนเพชรบุรี เขตราชเทวี กรุงเทพมหานคร 10400"
  },
  {
    "branch": "30_ACP - AYUTTHAYA CITY PARK",
    "code": "30_ACP",
    "name": "AYUTTHAYA CITY PARK",
    "address": "เลขที่ 126 ศูนย์การค้าอยุธยาซิตี้พาร์ค ห้องเลขที่เอสเอ-16 ชั้น บีเอฟ หมู่ที่ 3 ถนนสายเอเชีย ตำบลคลองสวนพลู อำเภอพระนครศรีอยุธยา จังหวัดพระนครศรีอยุธยา 13000"
  },
  {
    "branch": "31_STC - SERMTHAI COMPLEX",
    "code": "31_STC",
    "name": "SERMTHAI COMPLEX",
    "address": "เลขที่ 76/1-7 ศูนย์การค้าเสริมไทย คอมเพล็กซ์ ห้องเลขที่ TU-07 ชั้น B ถนนนครสวรรค์ ตำบลตลาด อำเภอเมืองมหาสารคาม จังหวัดมหาสารคาม 44000"
  },
  {
    "branch": "32_CHA - CHARN AT THE AVENUE",
    "code": "32_CHA",
    "name": "CHARN AT THE AVENUE",
    "address": "เลขที่ 104/42 อาคาร A โครงการ ชาน แอ็ท ดิ อเวนิว ห้องเลขที่ A110.1 ชั้น 1 หมู่ที่ 1 ถนนแจ้งวัฒนะ แขวงทุ่งสองห้อง เขตหลักสี่ กรุงเทพมหานคร 10210"
  },
  {
    "branch": "33_HYV - HADYAI VILLAGE",
    "code": "33_HYV",
    "name": "HADYAI VILLAGE",
    "address": "เลขที่ 538/4 โครงการหาดใหญ่ วิลเลจ อาคาร U ห้องเลขที่ U101/1 ชั้น 1 ถนนกาญจนวณิชย์ ตำบลหาดใหญ่ อำเภอหาดใหญ่ จังหวัดสงขลา 90110"
  },
  {
    "branch": "35_TSR - THE STREET RATCHADA",
    "code": "35_TSR",
    "name": "THE STREET RATCHADA",
    "address": "เลขที่ 139 ศูนย์การค้า THE STREET RATCHADA ห้องเลขที่ S21 ชั้น B ถนนรัชดาภิเษก แขวงดินแดง เขตดินแดง กรุงเทพมหานคร 10400"
  },
  {
    "branch": "36_UNM - UNION MALL",
    "code": "36_UNM",
    "name": "UNION MALL",
    "address": "เลขที่ 54 ศูนย์กำรค้ายูเนี่ยนมอลล์ ห้องเลขที่ 2โอ-01 ชั้น เอฟ-2 ซอยลาดพร้าว 1 แขวงจอมพล เขตจตุจักร กรุงเทพมหานคร 10900"
  },
  {
    "branch": "40_SHS - SAHATHAI GARDEN PLAZA",
    "code": "40_SHS",
    "name": "SAHATHAI GARDEN PLAZA",
    "address": "เลขที่ 528/1 ศูนย์การค้า สหไทย การ์เด้น พลาซ่า ห้องเลขที่ 226 ชั้น 2 ถนนตลาดใหม่ ตำบลตลาด อำเภอเมืองสุราษฎร์ธานี จังหวัดสุราษฎร์ธานี 84000"
  },
  {
    "branch": "41_M10 - THE MALL KORAT M10",
    "code": "41_M10",
    "name": "THE MALL KORAT M10",
    "address": "เลขที่ 1242/2 ศูนย์การค้าเดอะมอลล์ โคราช ห้องเลขที่ บีบี-07/1 ชั้น บี ถนนมิตรภาพ ตำบลในเมือง อำเภอเมืองนครราชสีมา จังหวัดนครราชสีมา 30000"
  },
  {
    "branch": "42_VSN - NAKONSAWAN V SQUARE",
    "code": "42_VSN",
    "name": "NAKONSAWAN V SQUARE",
    "address": "เลขที่ 320/11 อาคาร วี-สแควร์ พลาซ่า ห้องเลขที่ 208-210 ชั้น 2 ถนนสวรรค์วิถี ตำบลปากน้ำโพ อำเภอเมืองนครสวรรค์ จังหวัดนครสวรรค์ 60000"
  },
  {
    "branch": "43_SHN - SAHATHAI PLAZA NAKHON SI THAMMARAT",
    "code": "43_SHN",
    "name": "SAHATHAI PLAZA NAKHON SI THAMMARAT",
    "address": "เลขที่ 1392 โครงการ สหไทยพลาซ่า นครศรีธรรมราช ห้องเลขที่ FB-01-04 ชั้น B ถนนศรีปราชญ์ ตำบลท่าวัง อำเภอเมือง จังหวัดนครศรีธรรมราช 80000"
  },
  {
    "branch": "48_BPH - BLUPORT HUAHIN_BPH",
    "code": "48_BPH",
    "name": "BLUPORT HUAHIN_BPH",
    "address": "เลขที่ 8/89 ศูนย์การค้า BLUPORT HUAHIN ห้องเลขที่ 1M-011, 1M-012, 1M-013 ชั้น 1M ซอยหมู่บ้านหนองแก ตำบลหนองแก อำเภอหัวหิน จังหวัดประจวบคีรีขันธ์ 77110"
  },
  {
    "branch": "51_TSP - THE SPHERES",
    "code": "51_TSP",
    "name": "THE SPHERES",
    "address": "เลขที่ 45/9 โครงการ THE SPHERES PHETKASEM อาคาร A ห้องเลขที่ B7/2 ชั้น 1 หมู่ที่ 6 ตำบลอ้อมน้อย อำเภอกระทุ่มแบน จังหวัดสมุทรสาคร 74130"
  },
  {
    "branch": "52_SNT - SUNEE TOWER UBON",
    "code": "52_SNT",
    "name": "SUNEE TOWER UBON",
    "address": "เลขที่ 512/8 สุนีย์ทาวเวอร์ ห้องเลขที่ G01 ชั้น G ถนนชยางกูร ตำบลในเมือง อำเภอเมืองอุบลราชธานี จังหวัดอุบลราชธานี 34000"
  },
  {
    "branch": "57_CBL - COSMO BAZAAR LIFESTYLE MALL",
    "code": "57_CBL",
    "name": "COSMO BAZAAR LIFESTYLE MALL",
    "address": "เลขที่ 101-101/1 ห้องเลขที่ SF19 ชั้น 4 ถนนป๊อปปูล่า ตำบลบ้านใหม่ อำเภอปากเกร็ด นนทบุรี 11120"
  },
  {
    "branch": "58_JSP - JUNGCELON SHOPPING CENTER (PHUKET)",
    "code": "58_JSP",
    "name": "JUNGCELON SHOPPING CENTER (PHUKET)",
    "address": "เลขที181 อาคารจังซีลอน ห้องเลขที่1223/7-11,1225 ชั้น 2 ถนนราษฎร์อุทิศ 200 ปี ตำบลป่าตอง อำ เภอ กะทู้ จังหวัดภูเก็ต 83150"
  },
  {
    "branch": "61_TMP - THONBURI MARKET PLACE",
    "code": "61_TMP",
    "name": "THONBURI MARKET PLACE",
    "address": "เลขที่ 54 อาคารธนบุรี มาเก็ต เพลส ห้องเลขที่C01 ถนนบรมราชชนนี แขวงศาลาธรรมสพน์ เขตทวีวัฒนา กรุงเทพฯ 10170"
  },
  {
    "branch": "62_BCA - BIG C AMNAT CHAREON",
    "code": "62_BCA",
    "name": "BIG C AMNAT CHAREON",
    "address": "เลขที่477 อาคาร Big C super center ชั้น ที่G-IN ห้องเลขที่ GCR1101, GCR1136/1 ตำบลบุ่ง อำเภอเมืองอำนาจ จังหวัด อำนาจเจริญ 37000"
  },
  {
    "branch": "63_JPS - J-PARK SRI RACHA NIHON MURA",
    "code": "63_JPS",
    "name": "J-PARK SRI RACHA NIHON MURA",
    "address": "เลขที่ 8 โครงการเจพาร์ค ศรีราชา นิฮอน มูระ ห้องเลขที่ J1-B2-04 หมู่ที่ 6 ตำบลสุรศักด์ อำเภอศรีราชา จังหวัดชลบุรี 20110"
  },
  {
    "branch": "66_JKB - THE JAS KHUBON",
    "code": "66_JKB",
    "name": "THE JAS KHUBON",
    "address": "เลขที่ 54/12-13 อาคารแจส กรีนวิลเลจคู้บอน ชั้นที่1 ห้องเลขที่ X101,W102 ถนนคู้บอน แขวงบางชัน เขตคลองสามวา กรุงเทพมหานคร 10510"
  }
];
