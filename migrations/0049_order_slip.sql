-- ไฟล์แนบ/สลิปของใบเบิก (Office/Website) — เก็บ path ใน Supabase Storage bucket private 'slips'
-- ดูผ่าน signed URL (/api/slip/[orderNo]) · ไม่เก็บไฟล์/base64 ใน DB (กัน egress)
alter table orders add column if not exists slip_path text;
