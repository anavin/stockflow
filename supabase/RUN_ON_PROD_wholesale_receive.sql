-- ═══════════════════════════════════════════════════════════════════════════
-- ค้าส่ง 2 จังหวะ: ส่งออก → ปลายทางยืนยันรับ (Eve/KingPower รับบางส่วนได้)
-- รัน "มือ" บน Supabase (prod) — idempotent (add column if not exists)
-- ตรงกับ migrations/0047_wholesale_receive.sql (ที่ dev auto-run)
-- ═══════════════════════════════════════════════════════════════════════════
alter table order_items add column if not exists received_qty numeric;
alter table orders      add column if not exists received_at timestamptz;
alter table orders      add column if not exists received_by text;

-- (ทางเลือก) backfill CTW เก่าที่ push ไปแล้ว ให้เป็น "รับครบ" ในโมเดลใหม่
update order_items i set received_qty = i.qty
  from orders o
 where i.order_no = o.order_no and o.platform = 'CTW'
   and o.ctw_received_at is not null and i.received_qty is null;
update orders set received_at = coalesce(received_at, ctw_received_at), received_by = coalesce(received_by, ctw_received_by)
 where platform = 'CTW' and ctw_received_at is not null and received_at is null;
