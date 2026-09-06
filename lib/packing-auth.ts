/** ยืนยันตัวตนของ Packing Cam ด้วย Bearer token (แพทเทิร์นเดียวกับที่ push ไป CTW) */
export function checkPackingKey(req: Request): boolean {
  const key = process.env.PACKING_API_KEY;
  if (!key) return false;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token.length !== key.length) return false;
  let diff = 0;
  for (let i = 0; i < key.length; i++) diff |= token.charCodeAt(i) ^ key.charCodeAt(i);
  return diff === 0;
}
