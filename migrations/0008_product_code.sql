-- รหัสสินค้า/กลิ่น (code) — โชว์ + ค้นหาได้ในช่องเลือกกลิ่น (เหมือนโปรแกรม PO)
alter table products add column if not exists code text;
