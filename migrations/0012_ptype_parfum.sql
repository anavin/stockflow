-- ปรับค่าประเภทน้ำหอมให้ตรงกับระบบขายหน้าร้าน CTW (lab-parfumo-central: products.grade)
-- CTW ใช้ค่า "PARFUM" ไม่ใช่ "Le Parfum" — แปลงค่าเดิมให้ตรงกัน (idempotent)
update products set ptype = 'PARFUM' where ptype = 'Le Parfum';
