/**
 * App-wide config. APP_KEY = Postgres schema name on the shared Supabase
 * project (kp-labparfumo). One schema per app — see /new-app skill.
 */
export const APP_KEY = "platform_withdrawals";
export const APP_TITLE = "ระบบเบิกสินค้า — Lab Parfumo";
export const COMPANY_NAME = "บริษัท ทัช ไดเวอร์เจนซ์ จำกัด";
export const COMPANY_NAME_EN = "Touch Divergence Co., Ltd.";
export const COMPANY_ADDRESS = "288/31 หมู่ที่ 12 ต.ราชาเทวะ อ.บางพลี จ.สมุทรปราการ 10540 · 081-234-1438";

export type PlatformCode = "Shopee" | "Lazada" | "Tiktok" | "Line" | "Website" | "Office" | "CTW" | "Eveandboy" | "KingPower";

/**
 * Platforms — `enabled` = โผล่ในเมนู/สร้างใบเบิกได้; `canImport` = มี parser ไฟล์ export เฉพาะ
 * (Shopee/Lazada/TikTok มีแล้ว). แพลตฟอร์มที่ยังไม่มี parser (Line/Website/Office) เปิดให้กรอกเอง
 * แต่ซ่อนปุ่มนำเข้าไว้ก่อน จนกว่าจะได้ไฟล์จริงมาทำ parser (กัน parser ผิดอ่านไฟล์ผิดฟอร์แมต).
 */
// canCreate = สร้าง/แก้ใบเบิกเองในระบบนี้ได้ (CTW = true: คลังกลางสร้างเอง → ตัดสต๊อก → push ไป CTW)
export const PLATFORMS: { code: PlatformCode; name: string; prefix: string; enabled: boolean; canImport: boolean; canCreate: boolean }[] = [
  { code: "Shopee", name: "Shopee", prefix: "SH", enabled: true, canImport: true, canCreate: true },
  { code: "Lazada", name: "Lazada", prefix: "LZ", enabled: true, canImport: true, canCreate: true },
  { code: "Tiktok", name: "TikTok", prefix: "TT", enabled: true, canImport: true, canCreate: true },
  { code: "Line", name: "Line", prefix: "LN", enabled: true, canImport: false, canCreate: true },
  { code: "Website", name: "Website", prefix: "WEB", enabled: true, canImport: false, canCreate: true },
  { code: "Office", name: "Office", prefix: "OFF", enabled: true, canImport: false, canCreate: true },
  { code: "CTW", name: "CTW (Central World)", prefix: "WPO", enabled: true, canImport: false, canCreate: true },   // ใบเบิกโอนสาขา — คลังกลางสร้างเอง → ตัดสต๊อก → ส่งไป CTW
  { code: "Eveandboy", name: "Eveandboy", prefix: "EVB", enabled: true, canImport: false, canCreate: true },      // ค้าส่งหน้าร้าน — ใบเบิกแบบ PO (มี PO Order Version)
  { code: "KingPower", name: "King Power", prefix: "KP", enabled: true, canImport: false, canCreate: true },       // ค้าส่งหน้าร้าน — ใบเบิกแบบ PO
];

export type Platform = (typeof PLATFORMS)[number];
export const enabledPlatforms = () => PLATFORMS.filter((p) => p.enabled);

/** ช่องค้าส่ง/โอนสาขา — ใช้ฟอร์มแบบ "สาขา (Branch)" + ใบเบิกแบบ PO เต็มแผ่น (ไม่ใช่ลูกค้า/ที่อยู่) */
export const WHOLESALE_PLATFORMS: PlatformCode[] = ["CTW", "Eveandboy", "KingPower"];
export const isWholesalePlatform = (code?: string | null) => WHOLESALE_PLATFORMS.includes(code as PlatformCode);

/** สีประจำแพลตฟอร์ม (สีแบรนด์จริง) — ใช้เป็นจุดเน้นนำทาง (แถบหัว/เมนู/ป้าย/แท็บ) ไม่ใช่ธีมทั้งหน้า.
 *  โทนหลักของแอปยังเป็น teal (--brand). สีคงที่ทั้ง light/dark. */
export const PLATFORM_COLORS: Record<string, string> = {
  Shopee: "#ee4d2d",   // ส้ม
  Lazada: "#0f146e",   // น้ำเงินเข้ม
  Tiktok: "#141416",   // ดำ
  Line: "#06c755",     // เขียว
  Website: "#2563eb",  // ฟ้า
  Office: "#475569",   // เทา
  CTW: "#9333ea",      // ม่วง (สาขา Central World)
  Eveandboy: "#ec4899", // ชมพู (Eveandboy)
  KingPower: "#b8860b", // ทอง (King Power)
};
/** สีเดี่ยวของแพลตฟอร์ม (fallback เทากลางถ้าไม่รู้จัก) — ใช้กับแถบ/จุด/พื้นแท็บ */
export const platformColor = (code?: string) => PLATFORM_COLORS[code || ""] || "#94a0b1";
/** สีจาง (tint) สำหรับพื้นป้าย/พื้น active — สี + alpha (hex 8 หลัก) */
export const platformTint = (code?: string, alpha = "1a") => platformColor(code) + alpha;
/** ชื่อแสดงผลของแพลตฟอร์มจาก code (เช่น "Tiktok" → "TikTok") */
export const platformName = (code?: string) => PLATFORMS.find((p) => p.code === code)?.name || code || "";
/** แพลตฟอร์มรองรับนำเข้าไฟล์ export หรือไม่ (มี parser เฉพาะ) */
export const canImportPlatform = (code?: string) => !!PLATFORMS.find((p) => p.code === code)?.canImport;
export const canCreatePlatform = (code?: string) => PLATFORMS.find((p) => p.code === code)?.canCreate !== false;
/** map พารามิเตอร์ URL (เช่น "shopee"/"lazada") → แพลตฟอร์มที่เปิดใช้ (case-insensitive) หรือ null */
export function resolvePlatform(param?: string): Platform | null {
  const p = (param || "").toLowerCase();
  return PLATFORMS.find((x) => x.enabled && x.code.toLowerCase() === p) ?? null;
}
/** path ฐานของแพลตฟอร์ม เช่น "Shopee" → "/shopee" */
export const platformBase = (code: string) => `/${code.toLowerCase()}`;

export const DEFAULT_UNIT = "ขวด";
export const CUSTOMER_TYPES = ["ลูกค้าใหม่", "ลูกค้าเก่า"] as const;

/** วันเริ่ม "รอบปัจจุบัน" ของแดชบอร์ด — ตัวเลขตัดสต๊อก/รอตัด/ออร์เดอร์บนหน้าหลัก
 *  จะนับเฉพาะออเดอร์ตั้งแต่วันนี้เป็นต้นไป (ซ่อนข้อมูลเก่า/นำเข้าออกจากตัวนับ).
 *  - มีผล "เฉพาะเมื่อถึงวันนี้แล้ว" — ก่อนถึงวันนี้ตัวเลขยังเป็นแบบสะสมเดิม (ไม่รีเซ็ตก่อนเวลา)
 *  - เปลี่ยนรอบใหม่ทีหลัง: แก้ค่านี้ หรือ set env PERIOD_START_DATE (YYYY-MM-DD) แล้ว redeploy
 *  - ตั้งเป็น "" เพื่อปิดฟีเจอร์ (กลับไปนับสะสมทั้งหมด) */
const _rawPeriodStart = process.env.PERIOD_START_DATE || "2026-09-01";
export const PERIOD_START = /^\d{4}-\d{2}-\d{2}$/.test(_rawPeriodStart) ? _rawPeriodStart : "";

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

/** ขนาดตัวอย่าง/แถม — ตัดสต๊อกตามจำนวน แต่ไม่ได้ทำ SKU รายชิ้น (มาเป็นแพ็ค) → ไม่ต้องสแกน SKU */
export const NON_SERIAL_SIZES = ["1.2 ml", "4 ml"];
const mlToken = (s?: string | null) => (s || "").toLowerCase().match(/[0-9]+(\.[0-9]+)?/)?.[0] ?? "";
/** ตัดสต๊อกไหม — ขนาด ml ทุกอัน + ถุงกระดาษ (Size S/M มีสต๊อกของตัวเอง ต้องตัดด้วย) */
export function cutsStock(product?: string | null, size?: string | null): boolean {
  return isStockTracked(size) || isBagProduct(product);
}
/** ต้องสแกน SKU รายชิ้น (serial) ไหม — เฉพาะขวดจริงที่ track สต๊อก และไม่ใช่ขนาดตัวอย่าง
 *  ถุงกระดาษ/ของแถมไม่มี ml = ไม่ต้องมี SKU · 1.2/4 ml = ตัดสต๊อกแต่ไม่ serial */
export function needsSerialSku(size?: string | null): boolean {
  if (!isStockTracked(size)) return false;
  return !NON_SERIAL_SIZES.some((s) => mlToken(s) === mlToken(size));
}

/** ของแถม (Free) ให้ได้เฉพาะขนาดเล็กเท่านั้น — ไซต์ใหญ่ห้ามเป็นของแถม */
export const FREE_ALLOWED_SIZES = ["1.2 ml", "4 ml", "10 ml"];
/** ถุงกระดาษ (ของแถมพิเศษ) = แถมได้เฉพาะ Size S / Size M */
export const BAG_SIZES = ["Size S", "Size M"];
export function isBagProduct(product?: string | null): boolean { return /ถุง/.test(product || ""); }
export function isAllowedFreeSize(size?: string | null, product?: string | null): boolean {
  const t = (size || "").trim();
  if (!t) return true; // ยังไม่เลือกขนาด = ยังไม่ผิด
  if (isBagProduct(product) && BAG_SIZES.includes(t)) return true; // ถุงกระดาษ แถมได้ Size S/M
  return FREE_ALLOWED_SIZES.includes(t);
}
