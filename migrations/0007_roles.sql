-- แยกบทบาทงาน 3 แบบ: admin (เจ้าของ) · creator (สร้างใบเบิก) · picker (จัดของ/ตัดสต๊อก)
-- ผู้ใช้เดิมที่เป็น 'staff' = ฝ่ายสร้างใบเบิก → ย้ายเป็น 'creator'
update users set role = 'creator' where role = 'staff';
alter table users alter column role set default 'creator';
