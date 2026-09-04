-- เพิ่มช่องค้าส่ง Eveandboy / King Power (ใบเบิกแบบ PO เหมือน CTW) — กัน orders_platform_fkey ล้ม
insert into platforms (code, name, prefix, sort) values
  ('Eveandboy','Eveandboy','EVB',8),
  ('KingPower','King Power','KP',9)
on conflict (code) do nothing;

-- PO Order Version (เลขเวอร์ชัน PO ฝั่ง Eveandboy — กรอกเอง) + รหัสสาขา (branch code)
alter table orders add column if not exists po_version  text;
alter table orders add column if not exists branch_code text;
