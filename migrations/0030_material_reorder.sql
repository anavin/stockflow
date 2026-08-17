-- จุดสั่งซื้อ (reorder point) ต่อรายการวัตถุดิบ — คงเหลือ ≤ จุดนี้ = แจ้งเตือน "ควรสั่งซื้อ"
alter table material_item add column if not exists reorder_point numeric;
