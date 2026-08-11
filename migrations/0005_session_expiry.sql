-- Session expiry: sessions must have a server-side TTL so a leaked token can't be
-- used forever. Also lets us clean up stale rows. Safe to re-run.
alter table user_sessions add column if not exists expires_at timestamptz;

-- Backfill existing rows to 7 days from their creation (matches cookie maxAge).
update user_sessions set expires_at = created_at + interval '7 days' where expires_at is null;

create index if not exists idx_user_sessions_expires on user_sessions (expires_at);
