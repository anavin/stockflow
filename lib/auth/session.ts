import { cache } from "react";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { q } from "@/lib/db";
import { SESSION_COOKIE, SESSION_COOKIE_MAX_AGE_DAYS, type User } from "./constants";

export { SESSION_COOKIE, type User };

export async function createSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await q(
    `insert into user_sessions (token, user_id, expires_at)
     values ($1, $2, now() + ($3 || ' days')::interval)`,
    [token, userId, String(SESSION_COOKIE_MAX_AGE_DAYS)],
  );
  // เก็บกวาด session หมดอายุ + login_attempts เก่า (fire-and-forget, กันตารางบวม)
  q(`delete from user_sessions where expires_at is not null and expires_at < now()`).catch(() => {});
  q(`delete from login_attempts where created_at < now() - interval '30 days'`).catch(() => {});
  return token;
}

export async function getUserFromToken(token: string | undefined): Promise<User | null> {
  if (!token) return null;
  const rows = await q<User>(
    `select u.id, u.username, u.full_name, u.role, u.is_active, u.last_login_at, u.created_at
     from user_sessions s join users u on u.id = s.user_id
     where s.token = $1 and u.is_active = true
       and (s.expires_at is null or s.expires_at > now())`,   // หมดอายุแล้ว = ใช้ไม่ได้
    [token],
  );
  const user = rows[0];
  if (!user) return null;
  // touch (fire-and-forget)
  q(`update user_sessions set last_activity_at = now() where token = $1`, [token]).catch(() => {});
  return user;
}

export async function deleteSession(token: string): Promise<void> {
  await q(`delete from user_sessions where token = $1`, [token]);
}

/** React.cache dedupes this within a single request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return getUserFromToken(token);
});

export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * SESSION_COOKIE_MAX_AGE_DAYS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
