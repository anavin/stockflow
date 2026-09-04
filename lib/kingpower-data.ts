// สร้างอัตโนมัติจาก "King Power Product Name.xlsx" (scripts/gen-kingpower.mjs) — อย่าแก้มือ
// map (กลิ่น+ขนาด ml) → {code=ARTICLE King Power, barcode=REFERENCE, item_name=DESCRIPTION}
// key = normalize(scent)+"|"+ml เช่น "neverblue|30"
export type KpItem = { code: string; barcode: string; item_name: string; scent: string; grade: string };
export const KINGPOWER_BY_KEY: Record<string, KpItem> = {
  "neverblue|30": {
    "code": "4809674",
    "barcode": "8857128011836",
    "item_name": "LPF 30ML NEVER BLUE EAU DE PARFUM",
    "scent": "NEVER BLUE",
    "grade": "EAU DE PARFUM"
  },
  "zeus|30": {
    "code": "4809675",
    "barcode": "8857128011843",
    "item_name": "LPF 30ML ZEUS EAU DE PARFUM",
    "scent": "ZEUS",
    "grade": "EAU DE PARFUM"
  },
  "secretofpeach|30": {
    "code": "4809676",
    "barcode": "8857128011850",
    "item_name": "LPF 30ML SECRET OF PEACH EAU DE PARFUM",
    "scent": "SECRET OF PEACH",
    "grade": "EAU DE PARFUM"
  },
  "senorita|30": {
    "code": "4809677",
    "barcode": "8857128011867",
    "item_name": "LPF 30ML SENORITA EAU DE PARFUM",
    "scent": "SENORITA",
    "grade": "EAU DE PARFUM"
  },
  "dreamisland|30": {
    "code": "4809678",
    "barcode": "8857128011874",
    "item_name": "LPF 30ML DREAM ISLAND EAU DE PARFUM",
    "scent": "DREAM ISLAND",
    "grade": "EAU DE PARFUM"
  },
  "persist|30": {
    "code": "4809679",
    "barcode": "8857128011881",
    "item_name": "LPF 30ML PERSIST EAU DE PARFUM",
    "scent": "PERSIST",
    "grade": "EAU DE PARFUM"
  },
  "labelle|30": {
    "code": "4809680",
    "barcode": "8857128011904",
    "item_name": "LPF 30ML LA BELLE EAU DE PARFUM",
    "scent": "LA BELLE",
    "grade": "EAU DE PARFUM"
  },
  "virginx|30": {
    "code": "4809681",
    "barcode": "8857128011997",
    "item_name": "LPF 30ML VIRGINX EAU DE PARFUM",
    "scent": "VIRGINX",
    "grade": "EAU DE PARFUM"
  },
  "vivid|30": {
    "code": "4809682",
    "barcode": "8857128011898",
    "item_name": "LPF 30ML VIVID EAU DE PARFUM",
    "scent": "VIVID",
    "grade": "EAU DE PARFUM"
  },
  "neverblue|50": {
    "code": "4832519",
    "barcode": "8857128011287",
    "item_name": "LPF 50ML NEVER BLUE EAU DE PARFUM",
    "scent": "NEVER BLUE",
    "grade": "EAU DE PARFUM"
  },
  "zeus|50": {
    "code": "4832520",
    "barcode": "8857128011027",
    "item_name": "LPF 50ML ZEUS EAU DE PARFUM",
    "scent": "ZEUS",
    "grade": "EAU DE PARFUM"
  },
  "secretofpeach|50": {
    "code": "4832521",
    "barcode": "8857128011119",
    "item_name": "LPF 50ML SECRET OF PEACH EAU DE PARFUM",
    "scent": "SECRET OF PEACH",
    "grade": "EAU DE PARFUM"
  },
  "senorita|50": {
    "code": "4832522",
    "barcode": "8857128011171",
    "item_name": "LPF 50ML SENORITA EAU DE PARFUM",
    "scent": "SENORITA",
    "grade": "EAU DE PARFUM"
  },
  "dreamisland|50": {
    "code": "4832523",
    "barcode": "8857128011300",
    "item_name": "LPF 50ML DREAM ISLAND EAU DE PARFUM",
    "scent": "DREAM ISLAND",
    "grade": "EAU DE PARFUM"
  },
  "persist|50": {
    "code": "4832524",
    "barcode": "8857128011041",
    "item_name": "LPF 50MLPERSIST EAU DE PARFUM",
    "scent": "PERSIST",
    "grade": "EAU DE PARFUM"
  },
  "labelle|50": {
    "code": "4832525",
    "barcode": "8857128011058",
    "item_name": "LPF 50ML LA BELLE EAU DE PARFUM",
    "scent": "LA BELLE",
    "grade": "EAU DE PARFUM"
  },
  "virginx|50": {
    "code": "4832526",
    "barcode": "8857128011256",
    "item_name": "LPF 50ML VIRGINX EAU DE PARFUM",
    "scent": "VIRGINX",
    "grade": "EAU DE PARFUM"
  },
  "vivid|50": {
    "code": "4832527",
    "barcode": "8857128011065",
    "item_name": "LPF 50ML VIVID EAU DE PARFUM",
    "scent": "VIVID",
    "grade": "EAU DE PARFUM"
  },
  "cerisesucree|50": {
    "code": "4868237",
    "barcode": "8857128011539",
    "item_name": "LPF 50ML CERISE SUCREE LE PARFUM",
    "scent": "CERISE SUCREE",
    "grade": "LE PARFUM"
  },
  "gambling3435|50": {
    "code": "4868241",
    "barcode": "8857128011591",
    "item_name": "LPF 50ML GAMBLING 34+35 LE PARFUM",
    "scent": "GAMBLING 34+35",
    "grade": "LE PARFUM"
  },
  "queen|50": {
    "code": "4868238",
    "barcode": "8857128011607",
    "item_name": "LPF 50ML QUEEN LE PARFUM",
    "scent": "QUEEN",
    "grade": "LE PARFUM"
  },
  "savoury|50": {
    "code": "4868239",
    "barcode": "8857128011614",
    "item_name": "LPF 50ML SAVOURY LE PARFUM",
    "scent": "SAVOURY",
    "grade": "LE PARFUM"
  },
  "what|50": {
    "code": "4868240",
    "barcode": "8857128011645",
    "item_name": "LPF 50ML WHAT LE PARFUM",
    "scent": "WHAT",
    "grade": "LE PARFUM"
  },
  "blackestblack|50": {
    "code": "4868242",
    "barcode": "8857128011669",
    "item_name": "LPF 50ML BLACKEST BLACK EDP EXTRAIT",
    "scent": "BLACKEST BLACK",
    "grade": "EDP EXTRAIT"
  },
  "legendofoud|50": {
    "code": "4868243",
    "barcode": "8857128011683",
    "item_name": "LPF 50ML LEGEND OF OUD EDP EXTRAIT",
    "scent": "LEGEND OF OUD",
    "grade": "EDP EXTRAIT"
  },
  "luscioussantal|50": {
    "code": "4868244",
    "barcode": "8857128011690",
    "item_name": "LPF 50ML LUSCIOUS SANTAL EDP EXTRAIT",
    "scent": "LUSCIOUS SANTAL",
    "grade": "EDP EXTRAIT"
  },
  "patchouliabsolute|50": {
    "code": "4868245",
    "barcode": "8857128011706",
    "item_name": "LPF 50ML PATCHOULI ABSOLUTE EDP EXTRAIT",
    "scent": "PATCHOULI ABSOLUTE",
    "grade": "EDP EXTRAIT"
  },
  "sparklingmandarin|50": {
    "code": "4868246",
    "barcode": "8857128011713",
    "item_name": "LPF 50ML SPARKLING MANDARIN EDP EXTRAIT",
    "scent": "SPARKLING MANDARIN",
    "grade": "EDP EXTRAIT"
  },
  "tropicalleather|50": {
    "code": "4868247",
    "barcode": "8857128011720",
    "item_name": "LPF 50ML TROPICAL LEATHER EDP EXTRAIT",
    "scent": "TROPICAL LEATHER",
    "grade": "EDP EXTRAIT"
  },
  "moonlight|50": {
    "code": "4868248",
    "barcode": "8857128011089",
    "item_name": "LPF 50ML MOONLIGHT EAU DE PARFUM",
    "scent": "MOONLIGHT",
    "grade": "EAU DE PARFUM"
  },
  "queen|30": {
    "code": "4868250",
    "barcode": "8857128012001",
    "item_name": "LPF 30ML QUEEN LE PARFUM",
    "scent": "QUEEN",
    "grade": "LE PARFUM"
  },
  "savoury|30": {
    "code": "4868251",
    "barcode": "8857128012002",
    "item_name": "LPF 30ML SAVOURY LE PARFUM",
    "scent": "SAVOURY",
    "grade": "LE PARFUM"
  },
  "cerisesucree|30": {
    "code": "4868249",
    "barcode": "8857128012003",
    "item_name": "LPF 30ML CERISE SUCREE LE PARFUM",
    "scent": "CERISE SUCREE",
    "grade": "LE PARFUM"
  },
  "blackestblack|30": {
    "code": "4868253",
    "barcode": "8857128012005",
    "item_name": "LPF 30ML BLACKEST BLACK EDP EXTRAIT",
    "scent": "BLACKEST BLACK",
    "grade": "EDP EXTRAIT"
  },
  "legendofoud|30": {
    "code": "4868254",
    "barcode": "8857128012007",
    "item_name": "LPF 30ML LEGEND OF OUD EDP EXTRAIT",
    "scent": "LEGEND OF OUD",
    "grade": "EDP EXTRAIT"
  },
  "luscioussantal|30": {
    "code": "4868255",
    "barcode": "8857128012008",
    "item_name": "LPF 30ML LUSCIOUS SANTAL EDP EXTRAIT",
    "scent": "LUSCIOUS SANTAL",
    "grade": "EDP EXTRAIT"
  },
  "patchouliabsolute|30": {
    "code": "4868256",
    "barcode": "8857128012009",
    "item_name": "LPF 30ML PATCHOULI ABSOLUTE EDP EXTRAIT",
    "scent": "PATCHOULI ABSOLUTE",
    "grade": "EDP EXTRAIT"
  },
  "sparklingmandarin|30": {
    "code": "4868257",
    "barcode": "8857128012010",
    "item_name": "LPF 30ML SPARKLING MANDARIN EDP EXTRAIT",
    "scent": "SPARKLING MANDARIN",
    "grade": "EDP EXTRAIT"
  },
  "tropicalleather|30": {
    "code": "4868258",
    "barcode": "8857128012011",
    "item_name": "LPF 30ML TROPICAL LEATHER EDP EXTRAIT",
    "scent": "TROPICAL LEATHER",
    "grade": "EDP EXTRAIT"
  },
  "what|30": {
    "code": "4868252",
    "barcode": "8857128012013",
    "item_name": "LPF 30ML WHAT LE PARFUM",
    "scent": "WHAT",
    "grade": "LE PARFUM"
  },
  "moonlight|30": {
    "code": "4868259",
    "barcode": "8857128012014",
    "item_name": "LPF 30ML MOONLIGHT EAU DE PARFUM",
    "scent": "MOONLIGHT",
    "grade": "EAU DE PARFUM"
  }
};
// ขนาดที่ King Power มีต่อกลิ่น (key = normalize(scent)) — ใช้จำกัดตัวเลือกในฟอร์ม
export const KINGPOWER_SIZES_BY_SCENT: Record<string, string[]> = {
  "neverblue": [
    "50 ml",
    "30 ml"
  ],
  "zeus": [
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
  "dreamisland": [
    "50 ml",
    "30 ml"
  ],
  "persist": [
    "50 ml",
    "30 ml"
  ],
  "labelle": [
    "50 ml",
    "30 ml"
  ],
  "virginx": [
    "50 ml",
    "30 ml"
  ],
  "vivid": [
    "50 ml",
    "30 ml"
  ],
  "cerisesucree": [
    "50 ml",
    "30 ml"
  ],
  "gambling3435": [
    "50 ml"
  ],
  "queen": [
    "50 ml",
    "30 ml"
  ],
  "savoury": [
    "50 ml",
    "30 ml"
  ],
  "what": [
    "50 ml",
    "30 ml"
  ],
  "blackestblack": [
    "50 ml",
    "30 ml"
  ],
  "legendofoud": [
    "50 ml",
    "30 ml"
  ],
  "luscioussantal": [
    "50 ml",
    "30 ml"
  ],
  "patchouliabsolute": [
    "50 ml",
    "30 ml"
  ],
  "sparklingmandarin": [
    "50 ml",
    "30 ml"
  ],
  "tropicalleather": [
    "50 ml",
    "30 ml"
  ],
  "moonlight": [
    "50 ml",
    "30 ml"
  ]
};
// ชื่อสินค้า King Power (key = barcode)
export const KINGPOWER_NAMES: Record<string, string> = {
  "8857128011836": "LPF 30ML NEVER BLUE EAU DE PARFUM",
  "8857128011843": "LPF 30ML ZEUS EAU DE PARFUM",
  "8857128011850": "LPF 30ML SECRET OF PEACH EAU DE PARFUM",
  "8857128011867": "LPF 30ML SENORITA EAU DE PARFUM",
  "8857128011874": "LPF 30ML DREAM ISLAND EAU DE PARFUM",
  "8857128011881": "LPF 30ML PERSIST EAU DE PARFUM",
  "8857128011904": "LPF 30ML LA BELLE EAU DE PARFUM",
  "8857128011997": "LPF 30ML VIRGINX EAU DE PARFUM",
  "8857128011898": "LPF 30ML VIVID EAU DE PARFUM",
  "8857128011287": "LPF 50ML NEVER BLUE EAU DE PARFUM",
  "8857128011027": "LPF 50ML ZEUS EAU DE PARFUM",
  "8857128011119": "LPF 50ML SECRET OF PEACH EAU DE PARFUM",
  "8857128011171": "LPF 50ML SENORITA EAU DE PARFUM",
  "8857128011300": "LPF 50ML DREAM ISLAND EAU DE PARFUM",
  "8857128011041": "LPF 50MLPERSIST EAU DE PARFUM",
  "8857128011058": "LPF 50ML LA BELLE EAU DE PARFUM",
  "8857128011256": "LPF 50ML VIRGINX EAU DE PARFUM",
  "8857128011065": "LPF 50ML VIVID EAU DE PARFUM",
  "8857128011539": "LPF 50ML CERISE SUCREE LE PARFUM",
  "8857128011591": "LPF 50ML GAMBLING 34+35 LE PARFUM",
  "8857128011607": "LPF 50ML QUEEN LE PARFUM",
  "8857128011614": "LPF 50ML SAVOURY LE PARFUM",
  "8857128011645": "LPF 50ML WHAT LE PARFUM",
  "8857128011669": "LPF 50ML BLACKEST BLACK EDP EXTRAIT",
  "8857128011683": "LPF 50ML LEGEND OF OUD EDP EXTRAIT",
  "8857128011690": "LPF 50ML LUSCIOUS SANTAL EDP EXTRAIT",
  "8857128011706": "LPF 50ML PATCHOULI ABSOLUTE EDP EXTRAIT",
  "8857128011713": "LPF 50ML SPARKLING MANDARIN EDP EXTRAIT",
  "8857128011720": "LPF 50ML TROPICAL LEATHER EDP EXTRAIT",
  "8857128011089": "LPF 50ML MOONLIGHT EAU DE PARFUM",
  "8857128012001": "LPF 30ML QUEEN LE PARFUM",
  "8857128012002": "LPF 30ML SAVOURY LE PARFUM",
  "8857128012003": "LPF 30ML CERISE SUCREE LE PARFUM",
  "8857128012005": "LPF 30ML BLACKEST BLACK EDP EXTRAIT",
  "8857128012007": "LPF 30ML LEGEND OF OUD EDP EXTRAIT",
  "8857128012008": "LPF 30ML LUSCIOUS SANTAL EDP EXTRAIT",
  "8857128012009": "LPF 30ML PATCHOULI ABSOLUTE EDP EXTRAIT",
  "8857128012010": "LPF 30ML SPARKLING MANDARIN EDP EXTRAIT",
  "8857128012011": "LPF 30ML TROPICAL LEATHER EDP EXTRAIT",
  "8857128012013": "LPF 30ML WHAT LE PARFUM",
  "8857128012014": "LPF 30ML MOONLIGHT EAU DE PARFUM"
};
