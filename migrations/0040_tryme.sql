-- Try Me (เทสเตอร์) — log การผลิต+เบิกฟรีต่อครั้ง เฉพาะแพลตฟอร์มค้าส่ง (CTW/Eveandboy/KingPower)
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
