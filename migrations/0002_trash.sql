-- Soft-delete (trash) support for orders.
alter table orders add column if not exists deleted_at timestamptz;
alter table orders add column if not exists deleted_by int;
create index if not exists idx_orders_deleted_at on orders (deleted_at);
