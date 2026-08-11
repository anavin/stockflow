/**
 * App-wide config. APP_KEY = Postgres schema name on the shared Supabase
 * project (kp-labparfumo). One schema per app — see /new-app skill.
 */
export const APP_KEY = "platform_withdrawals";
export const APP_TITLE = "ระบบเบิกสินค้า — Lab Parfumo";
export const COMPANY_NAME = "บริษัท ทัช ไดเวอร์เจนซ์ จำกัด";
export const COMPANY_NAME_EN = "Touch Divergence Co., Ltd.";

export type PlatformCode = "Shopee" | "Lazada" | "Tiktok" | "Line" | "Website" | "Office";

/** Platforms — Shopee is implemented; the rest are scaffolded for later. */
export const PLATFORMS: { code: PlatformCode; name: string; prefix: string; enabled: boolean }[] = [
  { code: "Shopee", name: "Shopee", prefix: "SH", enabled: true },
  { code: "Lazada", name: "Lazada", prefix: "LZ", enabled: false },
  { code: "Tiktok", name: "TikTok", prefix: "TT", enabled: false },
  { code: "Line", name: "Line", prefix: "LN", enabled: false },
  { code: "Website", name: "Website", prefix: "WEB", enabled: false },
  { code: "Office", name: "Office", prefix: "OFF", enabled: false },
];

export const DEFAULT_UNIT = "ขวด";
export const CUSTOMER_TYPES = ["ลูกค้าใหม่", "ลูกค้าเก่า"] as const;

/** normalize ชื่อกลิ่นสำหรับจับคู่ (ตัดช่องว่าง/อักขระ/ตัวพิมพ์) — "DionysusX" == "Dionysus X" */
export function productKey(s?: string | null): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");
}

/** ขนาดที่ track สต๊อก — ตัดสต๊อกทุกขนาดที่เป็น "x ml" (รวมตัวอย่าง 1.2/4 ml และ variant
 *  เช่น "4 ml.", "1.2 ml (45 หลอด)"). ขนาดที่ไม่มีหน่วย ml = ไม่ตัด */
export const STOCK_TRACKED_SIZES = ["1.2 ml", "4 ml", "10 ml", "30 ml", "50 ml", "90 ml", "100 ml"];
export function isStockTracked(size?: string | null): boolean {
  return /\d\s*ml/i.test((size || "").trim());
}

/** ของแถม (Free) ให้ได้เฉพาะขนาดเล็กเท่านั้น — ไซต์ใหญ่ห้ามเป็นของแถม */
export const FREE_ALLOWED_SIZES = ["1.2 ml", "4 ml", "10 ml"];
export function isAllowedFreeSize(size?: string | null): boolean {
  const t = (size || "").trim();
  if (!t) return true; // ยังไม่เลือกขนาด = ยังไม่ผิด
  return FREE_ALLOWED_SIZES.includes(t);
}
