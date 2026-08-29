import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/roles";
import { tx } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const maxDuration = 60;

const norm = (v: any) => {
  if (v == null) return "";
  if (typeof v === "object" && (v as any).text) return String((v as any).text).trim();
  if (typeof v === "object" && (v as any).result != null) return String((v as any).result).trim();
  return String(v).trim();
};
const key = (s: any) => norm(s).toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");
function toDate(v: any): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = norm(v);
  const m = s.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) { let y = +m[1]; if (y > 2400) y -= 543; return `${y}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`; }
  return null;
}

/** map หัวคอลัมน์ → field (ยืดหยุ่นชื่อ) */
function colMap(headers: string[]): Record<string, number> {
  const m: Record<string, number> = {};
  headers.forEach((h, i) => {
    const k = key(h);
    if (!k) return;
    if (k === "ลำดับ" || k === "no") m.seq ??= i;
    else if (k.includes("รายการ") || k === "product" || k === "ชื่อ" || k === "กลิ่น") m.product ??= i;
    else if (k === "type" || k.includes("grade")) m.grade ??= i;
    else if (k.includes("เลขที่จดแจ้ง")) m.reg_no ??= i;
    else if (k.includes("ออกให้")) m.issue ??= i;
    else if (k.includes("วันที่สิ้นสุด") || k.includes("สิ้นสุด") || k.includes("หมดอายุ")) m.expiry ??= i;
    else if (k.includes("สถานะอย")) m.fda_status ??= i;
    else if (k.includes("สถานะผลิต") || k.includes("สถานะการผลิต")) m.prod_status ??= i;
    else if (k.includes("ภาษาอังกฤษ") || k === "nameen") m.name_en ??= i;
    else if (k.includes("ภาษาไทย") || k === "nameth") m.name_th ??= i;
    else if (k === "brand" || k.includes("แบรนด์")) m.brand ??= i;
  });
  return m;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ ok: false, error: "เฉพาะผู้ดูแลระบบ" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "ไม่พบไฟล์" }, { status: 400 });
  if (file.size > 12 * 1024 * 1024) return NextResponse.json({ ok: false, error: "ไฟล์ใหญ่เกิน 12MB" }, { status: 413 });

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as any);
    // เลือกชีตที่มีหัว "รายการ" + "วันที่สิ้นสุด" (ปกติชื่อ "ข้อมูล อย")
    let ws: ExcelJS.Worksheet | null = null, headerRow = 1, m: Record<string, number> = {};
    wb.eachSheet((sheet) => {
      if (ws) return;
      for (let r = 1; r <= Math.min(5, sheet.rowCount); r++) {
        const headers = ((sheet.getRow(r).values as any[]) || []).map(norm);
        const mm = colMap(headers);
        if (mm.product != null && mm.expiry != null) { ws = sheet; headerRow = r; m = mm; return; }
      }
    });
    if (!ws) return NextResponse.json({ ok: false, error: "ไม่พบชีตข้อมูล อย (ต้องมีคอลัมน์ 'รายการ' + 'วันที่สิ้นสุด')" }, { status: 400 });

    const rows: any[] = [];
    (ws as ExcelJS.Worksheet).eachRow((row, rn) => {
      if (rn <= headerRow) return;
      const v = row.values as any[];
      const product = m.product != null ? norm(v[m.product]) : "";
      if (!product) return;
      rows.push({
        seq: m.seq != null ? parseInt(norm(v[m.seq]), 10) || null : null,
        product,
        grade: m.grade != null ? norm(v[m.grade]) || null : null,
        reg_no: m.reg_no != null ? norm(v[m.reg_no]) || null : null,
        issue_date: m.issue != null ? toDate(v[m.issue]) : null,
        expiry_date: m.expiry != null ? toDate(v[m.expiry]) : null,
        fda_status: m.fda_status != null ? norm(v[m.fda_status]) || null : null,
        prod_status: m.prod_status != null ? norm(v[m.prod_status]) || null : null,
        name_en: m.name_en != null ? norm(v[m.name_en]) || null : null,
        name_th: m.name_th != null ? norm(v[m.name_th]) || null : null,
        brand: m.brand != null ? norm(v[m.brand]) || null : null,
      });
    });
    if (!rows.length) return NextResponse.json({ ok: false, error: "ไม่พบแถวข้อมูลในชีต" }, { status: 400 });

    let saved = 0;
    await tx(async (run) => {
      for (const r of rows) {
        await run(
          `insert into fda_registrations (seq, product, grade, reg_no, issue_date, expiry_date, fda_status, prod_status, name_en, name_th, brand, updated_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
           on conflict (regexp_replace(lower(btrim(product)),'[^a-z0-9ก-๙]','','g'))
           do update set seq=excluded.seq, grade=excluded.grade, reg_no=excluded.reg_no,
             issue_date=excluded.issue_date, expiry_date=excluded.expiry_date, fda_status=excluded.fda_status,
             prod_status=excluded.prod_status, name_en=excluded.name_en, name_th=excluded.name_th,
             brand=excluded.brand, updated_at=now()`,
          [r.seq, r.product, r.grade, r.reg_no, r.issue_date, r.expiry_date, r.fda_status, r.prod_status, r.name_en, r.name_th, r.brand]);
        saved++;
      }
    });
    await logActivity("fda.manage", `นำเข้า อย. ${saved} รายการ (ชีต ${(ws as ExcelJS.Worksheet).name})`);
    revalidatePath("/fda");
    return NextResponse.json({ ok: true, saved, sheet: (ws as ExcelJS.Worksheet).name });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "นำเข้าไม่สำเร็จ" }, { status: 400 });
  }
}
