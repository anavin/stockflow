-- ปิดการขายต่อขนาด (กลิ่น+ขนาด) — ซ่อนจากสต๊อก + บล็อกไม่ให้เลือกตอนสร้างใบเบิก
-- ต่างจากเลิกผลิต (discontinued_sku): ยอดสต๊อกยังอยู่ครบ เปิดกลับมาขายได้ทุกเมื่อ
create table if not exists closed_sku (
  id    serial primary key,
  scent text not null,
  size  text not null,
  unique (scent, size)
);
