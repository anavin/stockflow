-- วันที่ชำระเงินของใบเบิก (Office/Website) — คู่กับ payment_method
alter table orders add column if not exists paid_date date;
