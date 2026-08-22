-- 0036 — เพิ่ม spec (สเป็กบรรจุ เช่น สี่เหลี่ยม/ฝาเงิน10ml/ซองซิป) ให้ stock_unit
-- ใช้เก็บ spec รายชิ้นจาก log การส่ง + โชว์ในหน้าติดตาม SKU
alter table stock_unit add column if not exists spec text;
