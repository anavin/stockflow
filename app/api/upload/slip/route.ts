import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const BUCKET = "slips";
const MAX = 6 * 1024 * 1024;   // 6MB
const OK = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"];

/** อัปโหลดสลิป/ไฟล์แนบของใบเบิก → Supabase Storage (private) ผ่าน REST ฝั่ง server (service_role ไม่หลุด client)
 *  คืน path (ไม่ใช่ URL) → ฟอร์มเก็บไว้ที่ orders.slip_path · ดูไฟล์ผ่าน signed URL ที่ /api/slip/[orderNo] */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (!can.createOrders(user.role)) return NextResponse.json({ ok: false, error: "ไม่มีสิทธิ์แนบไฟล์" }, { status: 403 });

  const base = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) return NextResponse.json({ ok: false, error: "ยังไม่ได้ตั้ง SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (env)" }, { status: 500 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "ไม่พบไฟล์" }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ ok: false, error: "ไฟล์ใหญ่เกิน 6MB" }, { status: 413 });
  if (file.type && !OK.includes(file.type)) return NextResponse.json({ ok: false, error: "รองรับเฉพาะรูป (JPG/PNG/WebP/HEIC) หรือ PDF" }, { status: 415 });

  const ext = (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || (file.type === "application/pdf" ? "pdf" : "jpg");
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;

  let res: Response;
  try {
    res = await fetch(`${base}/storage/v1/object/${BUCKET}/${encodeURI(path)}`, {
      method: "POST",
      // ส่งทั้ง apikey + Authorization → รองรับทั้ง service_role (legacy JWT) และ secret key แบบใหม่ (sb_secret_...)
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": file.type || "application/octet-stream", "x-upsert": "true" },
      body: Buffer.from(await file.arrayBuffer()),
    });
  } catch (e: any) { return NextResponse.json({ ok: false, error: `ต่อ Storage ไม่ได้: ${e?.message || "network"}` }, { status: 502 }); }

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    const hint = res.status === 404 ? ` — ยังไม่ได้สร้าง bucket "${BUCKET}" บน Supabase?` : "";
    return NextResponse.json({ ok: false, error: `อัปโหลดไม่สำเร็จ (${res.status})${hint} ${t.slice(0, 160)}` }, { status: 502 });
  }

  // สร้าง signed URL สั้นๆ ให้พรีวิวทันทีหลังอัปโหลด (ก่อนบันทึกใบเบิก) — best-effort, ล้มก็ไม่เป็นไร
  let previewUrl: string | null = null;
  try {
    const s = await fetch(`${base}/storage/v1/object/sign/${BUCKET}/${encodeURI(path)}`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 600 }),
    });
    if (s.ok) { const j = (await s.json()) as { signedURL?: string }; if (j.signedURL) previewUrl = `${base}/storage/v1${j.signedURL}`; }
  } catch { /* ข้าม */ }

  return NextResponse.json({ ok: true, path, previewUrl });
}
