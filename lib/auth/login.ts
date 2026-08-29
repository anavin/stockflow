import { q } from "@/lib/db";
import { verifyBcrypt } from "./password";
import type { User } from "./constants";

const LOCKOUT_MIN = 15;
const MAX_ATTEMPTS = 5;
// hash ปลอม (PBKDF2, well-formed) ใช้เผาเวลาให้เท่ากันเมื่อไม่พบ user
// → กันเดา username จากเวลาตอบ (ปกติกรณีไม่มี user จะเร็วกว่าเพราะข้ามการ verify)
const DUMMY_HASH = "pbkdf2$100000$Gjxxqrj+gJk8YoZsUgbIKw==$W6ODSB5uMS7Aad+Tw/Qze0WrIUCQLl5uYx3YLQdAUUQ=";

export type LoginResult = { ok: boolean; user?: User; error?: string; attemptsRemaining?: number };

async function logAttempt(username: string, success: boolean) {
  await q(`insert into login_attempts (username, success) values ($1, $2)`, [username, success]);
}

async function failedAttempts(username: string): Promise<number> {
  const [r] = await q<{ n: number }>(
    `select count(*)::int n from login_attempts
     where lower(username) = lower($1) and success = false
       and created_at > now() - ($2 || ' minutes')::interval`,
    [username, String(LOCKOUT_MIN)],
  );
  return r?.n ?? 0;
}

export async function loginWithPassword(username: string, password: string): Promise<LoginResult> {
  username = (username || "").trim();
  if (!username || !password) return { ok: false, error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" };

  if ((await failedAttempts(username)) >= MAX_ATTEMPTS) {
    return { ok: false, error: `🔒 บัญชีถูกล็อคชั่วคราว — รอ ${LOCKOUT_MIN} นาที` };
  }

  const [user] = await q<User & { password_hash: string }>(
    `select * from users where lower(username) = lower($1) and is_active = true`,
    [username],
  );

  const bad = async () => {
    await logAttempt(username, false);
    const remaining = Math.max(0, MAX_ATTEMPTS - (await failedAttempts(username)));
    return { ok: false as const, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง", attemptsRemaining: remaining };
  };

  if (!user) {
    await verifyBcrypt(password, DUMMY_HASH).catch(() => false);   // constant-time: อย่าตอบเร็วกว่าเคสมี user
    return bad();
  }
  if (!(await verifyBcrypt(password, user.password_hash))) return bad();

  await logAttempt(username, true);
  // ล็อกอินสำเร็จ → ล้างตัวนับ fail (กัน 4 fail + สำเร็จ + fail อีก 1 = โดนล็อก)
  await q(`delete from login_attempts where lower(username) = lower($1) and success = false`, [username]);
  await q(`update users set last_login_at = now() where id = $1`, [user.id]);

  const { password_hash, ...safe } = user;
  return { ok: true, user: safe as User };
}
