-- ==========================================================================
-- RUN ON PROD (Supabase -> SQL Editor) : ครั้งเดียว
-- Try Me (เทสเตอร์) เฟส 1 : ตาราง log การเบิกฟรีต่อครั้ง (CTW/Eveandboy/KingPower)
-- ปลอดภัยรันซ้ำได้ (idempotent)
-- ==========================================================================
create table if not exists tryme_issue (
  id          serial primary key,
  platform    text not null,
  scent       text not null,
  size        text not null,
  qty         int  not null default 1,
  note        text,
  created_by  int,
  created_at  timestamptz not null default now()
);
create index if not exists idx_tryme_created  on tryme_issue (created_at desc);
create index if not exists idx_tryme_platform on tryme_issue (platform);
