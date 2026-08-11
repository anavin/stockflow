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
  // ไม่เก็บกวาดตรงนี้ทุกครั้ง (ช้า — เพิ่ม round-trip ต่อการ login). session หมดอายุ
  // ถูกเช็คตอนอ่าน (getUserFromToken) อยู่แล้ว; แถวเก่าค่อยเก็บกวาดเป็น cron/มือทีหลัง.
  return token;
}

// In-memory session cache: getUserFromToken runs on EVERY request (auth gate in the
// layout). With a warm serverless instance this avoids a DB round-trip per page nav
// — a big win when the DB is far away (~210ms/query). Short TTL bounds staleness
// (a revoked/deactivated session keeps working for at most SESS_TTL_MS).
type SessCache = { _sess?: Map<string, { user: User; exp: number }> };
const gc = globalThis as unknown as SessCache;
gc._sess ||= new Map();
const SESS_TTL_MS = 30_000;

export async function getUserFromToken(token: string | undefined): Promise<User | null> {
  if (!token) return null;
  const cached = gc._sess!.get(token);
  if (cached && cached.exp > Date.now()) return cached.user;

  const rows = await q<User>(
    `select u.id, u.username, u.full_name, u.role, u.is_active, u.last_login_at, u.created_at
     from user_sessions s join users u on u.id = s.user_id
     where s.token = $1 and u.is_active = true
       and (s.expires_at is null or s.expires_at > now())`,   // หมดอายุแล้ว = ใช้ไม่ได้
    [token],
  );
  const user = rows[0];
  if (!user) { gc._sess!.delete(token); return null; }
  gc._sess!.set(token, { user, exp: Date.now() + SESS_TTL_MS });
  return user;
}

export async function deleteSession(token: string): Promise<void> {
  gc._sess!.delete(token);
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
