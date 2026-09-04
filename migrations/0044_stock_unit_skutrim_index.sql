-- Performance: UNITS_UNION ใช้ `not exists (... where btrim(s.sku) = btrim(oi.sku))`
-- ซึ่ง btrim(sku) ทำให้ unique index บน stock_unit.sku ใช้ไม่ได้ → seq scan ต่อแถว oi
-- เพิ่ม functional index บน btrim(sku) (immutable) → subquery ใช้ index ได้
create index if not exists idx_stock_unit_skutrim on stock_unit (btrim(sku));
