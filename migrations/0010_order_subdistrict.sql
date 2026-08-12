-- ตำบล/แขวง แยกช่อง (เติมจากรหัสไปรษณีย์)
alter table orders add column if not exists subdistrict text;
