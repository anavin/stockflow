// ---- Environment tiers: local (PGlite sandbox) · staging · production --------
// ใช้บอกว่าตอนนี้รันอยู่สภาพแวดล้อมไหน → โชว์ป้ายเตือน + กันเผลอต่อ DB จริงตอน dev
export type AppEnv = "local" | "staging" | "production";

/** ระบุ tier จาก env (เรียกฝั่ง server เท่านั้น — DATABASE_URL อ่านได้เฉพาะ server):
 *  - NEXT_PUBLIC_APP_ENV=staging/local → ตามที่ตั้ง (ชัดเจนสุด)
 *  - ไม่มี DATABASE_URL                → local (PGlite .pgdata = ข้อมูลทดลอง แยกจาก prod)
 *  - มี DATABASE_URL (ไม่ได้ระบุ tier) → production */
export function appEnv(): AppEnv {
  const tier = (process.env.NEXT_PUBLIC_APP_ENV || "").trim().toLowerCase();
  if (tier === "staging") return "staging";
  if (tier === "local") return "local";
  if (!process.env.DATABASE_URL) return "local";
  return "production";
}

/** ป้ายเตือนบนหัวจอ (prod = null = ไม่โชว์ป้าย) */
export const ENV_BANNER: Record<AppEnv, { label: string; fg: string; bg: string } | null> = {
  local:      { label: "🧪 SANDBOX — ข้อมูลทดลอง (ไม่กระทบระบบจริง)", fg: "#064e3b", bg: "#6ee7b7" },
  staging:    { label: "🟡 STAGING — ทดสอบก่อนขึ้นจริง (คนละฐานข้อมูลกับระบบจริง)", fg: "#7c2d12", bg: "#fcd34d" },
  production: null,
};
