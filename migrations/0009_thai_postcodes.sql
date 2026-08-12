-- รหัสไปรษณีย์ระดับตำบลทั้งประเทศ — พิมพ์รหัส → เลือกตำบล/อำเภอ/จังหวัดได้
create table if not exists thai_postcodes (
  id          serial primary key,
  province    text not null,
  district    text not null,
  subdistrict text not null,
  postcode    text not null
);
create index if not exists idx_thai_postcodes_zip on thai_postcodes (postcode);
