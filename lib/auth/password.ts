import bcrypt from "bcryptjs";

/**
 * Password hashing that works on Cloudflare Workers AND Node.
 *
 * bcryptjs in async mode HANGS on Workers (its round loop relies on setImmediate),
 * and in sync mode it blows the CPU budget — so new hashes use PBKDF2 via the
 * Web Crypto API (crypto.subtle), which is native and fast on both runtimes.
 * Legacy bcrypt hashes ("$2…", e.g. from an older local .pgdata) are still verified
 * with compareSync so existing dev accounts keep working.
 */
const PBKDF2_ITER = 100_000;
const PBKDF2_HASH = "SHA-256";

function b64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}
function unb64(s: string): Uint8Array {
  return new Uint8Array(Buffer.from(s, "base64"));
}

async function derive(password: string, salt: Uint8Array, iter: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: salt as any, iterations: iter, hash: PBKDF2_HASH }, key, 256);
  return b64(new Uint8Array(bits));
}

/** Hash a password → "pbkdf2$<iter>$<salt_b64>$<hash_b64>". */
export async function hashBcrypt(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, PBKDF2_ITER);
  return `pbkdf2$${PBKDF2_ITER}$${b64(salt)}$${hash}`;
}

export async function verifyBcrypt(password: string, stored: string): Promise<boolean> {
  if (!password || !stored) return false;
  try {
    if (stored.startsWith("$2")) return bcrypt.compareSync(password, stored); // legacy bcrypt (dev only)
    const [scheme, iterStr, saltB64, hashB64] = stored.split("$");
    if (scheme !== "pbkdf2" || !saltB64 || !hashB64) return false;
    const calc = await derive(password, unb64(saltB64), Number(iterStr) || PBKDF2_ITER);
    // constant-time-ish compare
    if (calc.length !== hashB64.length) return false;
    let diff = 0;
    for (let i = 0; i < calc.length; i++) diff |= calc.charCodeAt(i) ^ hashB64.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
  }
}

export function validatePassword(pwd: string, username = ""): { ok: boolean; message: string } {
  const MIN = 8;
  if (!pwd || pwd.length < MIN) return { ok: false, message: `รหัสผ่านต้องยาวอย่างน้อย ${MIN} ตัวอักษร` };
  if (username && pwd.toLowerCase() === username.toLowerCase()) return { ok: false, message: "รหัสผ่านห้ามเหมือน username" };
  if (!/[A-Za-z]/.test(pwd)) return { ok: false, message: "ต้องมีตัวอักษรอย่างน้อย 1 ตัว" };
  if (!/[0-9]/.test(pwd)) return { ok: false, message: "ต้องมีตัวเลขอย่างน้อย 1 ตัว" };
  const weak = ["password", "12345678", "qwerty", "admin123", "staff123", "password1", "password123", "letmein"];
  if (weak.includes(pwd.toLowerCase())) return { ok: false, message: "รหัสผ่านนี้อ่อนแอเกินไป" };
  return { ok: true, message: "OK" };
}
