-- หัวสเปรย์ JEN: เปลี่ยนชื่อเดิม → "สีเงิน" + เพิ่ม "สีดำ"  · idempotent (run ซ้ำได้)
begin;

-- (1) rename p18: "หัวสเปรย์ JEN" → "หัวสเปรย์ JEN สีเงิน" (คงยอด/ประวัติเดิมไว้)
update material_item set label = 'หัวสเปรย์ JEN สีเงิน', updated_at = now()
where category = 'packaging' and ref_key = 'p18';

-- (2) เพิ่ม "หัวสเปรย์ JEN สีดำ" (p34) — sort=18 ให้อยู่ติดกับสีเงิน · เริ่มยอด 0
insert into material_item (category, ref_key, comp_key, label, category2, unit, sort)
values ('packaging','p34','p34','หัวสเปรย์ JEN สีดำ','ฝา/หัวสเปรย์','ชิ้น',18)
on conflict (category, ref_key) do nothing;

commit;
