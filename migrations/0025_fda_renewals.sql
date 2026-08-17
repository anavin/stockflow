-- ประวัติการต่ออายุ อย. (จดแจ้งมีอายุ 3 ปี — เก็บว่าต่อครั้งไหน จากวันไหนถึงวันไหน)
create table if not exists fda_renewals (
  id          serial primary key,
  fda_id      int not null references fda_registrations(id) on delete cascade,
  reg_no      text,
  old_expiry  date,
  new_expiry  date,
  renewed_at  timestamptz not null default now(),
  renewed_by  int
);
create index if not exists idx_fda_renewals_fda on fda_renewals (fda_id);
