import "server-only";

/** ตรวจ API key ของ CTW (Authorization: Bearer <CTW_API_KEY> หรือ header x-api-key) */
export function ctwAuth(req: Request): boolean {
  const secret = process.env.CTW_API_KEY;
  if (!secret) return false;
  const h = req.headers.get("authorization") || "";
  const key = h.replace(/^Bearer\s+/i, "") || req.headers.get("x-api-key") || "";
  return !!key && key === secret;
}

/** วันปัจจุบันเวลาไทย (YYYY-MM-DD) */
export const bangkokToday = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
