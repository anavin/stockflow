-- รันบน prod (Supabase labparfumo-core → SQL editor, schema public)
-- เพิ่มคอลัมน์เก็บ path สลิป/ไฟล์แนบของใบเบิก (ไฟล์จริงอยู่ Supabase Storage bucket private 'slips')
alter table orders add column if not exists slip_path text;
