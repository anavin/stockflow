-- Verify-before-issue: employees enter/scan the picked SKU + product spec per line
-- during stock deduction. sku already exists; add spec. Safe to re-run.
alter table order_items add column if not exists spec text;
