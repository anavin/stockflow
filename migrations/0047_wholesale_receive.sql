-- ค้าส่ง 2 จังหวะ: ส่งออก (shipped_at) → ปลายทางยืนยันรับ (received)
-- Eve/KingPower = ยืนยันมือ (รับบางส่วนได้) · CTW = push set อัตโนมัติ
alter table order_items add column if not exists received_qty numeric;      -- จำนวนที่ปลายทางยืนยันรับต่อบรรทัด (null = ยังไม่ยืนยัน)
alter table orders      add column if not exists received_at timestamptz;   -- เวลาที่ยืนยัน "รับครบ" (partial = ยังเป็น null)
alter table orders      add column if not exists received_by text;          -- ผู้กดยืนยัน (ชื่อ/username)
