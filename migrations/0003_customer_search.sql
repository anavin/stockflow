-- Indexes to keep the customer autocomplete (username / phone / receiver) fast.
create index if not exists idx_orders_username on orders (lower(username));
create index if not exists idx_orders_phone    on orders (phone);
create index if not exists idx_orders_receiver on orders (lower(receiver));
