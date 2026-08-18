-- บันทึกการใช้งานของผู้ใช้ (audit log) — เข้าใช้ + การกระทำสำคัญ · เห็นเฉพาะ admin
create table if not exists activity_log (
  id         bigserial primary key,
  user_id    int,
  username   text,
  role       text,
  action     text not null,      -- login | logout | order.create | order.delete | stock.issue | ship | material.receive | material.issue | scent.manage | user.manage ...
  detail     text,
  ip         text,
  created_at timestamptz not null default now()
);
create index if not exists idx_activity_created on activity_log (created_at desc);
create index if not exists idx_activity_user    on activity_log (user_id, created_at desc);
