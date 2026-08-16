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
