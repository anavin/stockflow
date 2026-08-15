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
