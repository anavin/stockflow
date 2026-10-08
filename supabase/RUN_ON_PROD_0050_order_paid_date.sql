-- รันบน prod (Supabase labparfumo-core → SQL editor, schema public)
-- วันที่ชำระเงินของใบเบิก (Office/Website)
alter table orders add column if not exists paid_date date;
