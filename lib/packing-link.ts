import QRCode from "qrcode";

/**
 * ลิงก์คลิปตอนแพคของ Packing Cam — คำนวณจากเลขออเดอร์ล้วน ๆ
 * จึงพิมพ์ QR ลงใบเบิกได้ตั้งแต่ก่อนแพค ไม่ต้องรอคลิป
 * ต้องใช้สูตรเดียวกับฝั่ง Packing Cam เป๊ะ ๆ (HMAC-SHA256 → base64url → 12 ตัวแรก)
 */
const TOKEN_LENGTH = 12;

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function isPackingCamConfigured(): boolean {
  return Boolean(process.env.PACKING_CAM_URL && process.env.PACKING_CAM_LINK_SECRET);
}

/** พิมพ์ QR ลิงก์คลิปลงใบเบิกหรือไม่ — ปิดไว้ก่อน เปิดได้ด้วย PACKING_CAM_QR_ON_SLIP=1
 *  (ลิงก์/QR ยังใช้จากหน้า Packing Cam ได้ตามปกติ แค่ไม่พิมพ์ลงใบเบิก) */
export function qrOnSlipEnabled(): boolean {
  return process.env.PACKING_CAM_QR_ON_SLIP === "1";
}

export async function packingClipUrl(orderNo: string): Promise<string | null> {
  if (!isPackingCamConfigured()) return null;
  const code = (orderNo || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{6,32}$/.test(code)) return null;   // ใบเบิกค้าส่งบางใบเลขไม่เข้าเกณฑ์ → ไม่พิมพ์ QR
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(process.env.PACKING_CAM_LINK_SECRET!),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(code));
  const token = toBase64Url(signature).slice(0, TOKEN_LENGTH);
  return `${process.env.PACKING_CAM_URL!.replace(/\/$/, "")}/v/${code}/${token}`;
}

export type QrMatrix = { size: number; bits: string; url: string };

/** สร้างตาราง QR ฝั่ง server แล้วส่งเป็น prop — กุญแจลับไม่ต้องหลุดไปฝั่งเบราว์เซอร์
 *  และไม่ต้องรวมไลบรารี QR เข้า bundle ของ client */
export async function packingQrMatrix(orderNo: string): Promise<QrMatrix | null> {
  const url = await packingClipUrl(orderNo);
  if (!url) return null;
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const data = qr.modules.data;
  let bits = "";
  for (let i = 0; i < size * size; i++) bits += data[i] ? "1" : "0";
  return { size, bits, url };
}
