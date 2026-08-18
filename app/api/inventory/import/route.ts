import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdmin } from "@/lib/auth/roles";
import { q, tx } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { productKey } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 60;

type Row = { sheet: string; name: string; from: number; to: number; kind: "fg" | "mat"; product?: string; size?: string; cat?: string; ref?: string; scent?: string; comp?: string; grade?: string; brand?: string };

// อ่านค่าจาก cell แบบ number (รับ "1,000" / ค่าว่าง)
const num = (v: any): number | null => {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
};
const txt = (v: any) => (v == null ? "" : String(v).trim());

/** map หัวตาราง → index (1-based) */
function headers(ws: ExcelJS.Worksheet): Record<string, number> {
  const m: Record<string, number> = {};
  ws.getRow(1).eachCell((c, i) => { m[txt(c.value)] = i; });
  return m;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (!isAdmin(user.role)) return NextResponse.json({ ok: false, error: "เฉพาะผู้ดูแลระบบ" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  const mode = txt(form.get("mode")) || "preview";
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "ไม่พบไฟล์" }, { status: 400 });

  let wb: ExcelJS.Workbook;
  try { wb = new ExcelJS.Workbook(); await wb.xlsx.load(Buffer.from(await file.arrayBuffer()) as any); }
  catch { return NextResponse.json({ ok: false, error: "อ่านไฟล์ไม่สำเร็จ (ต้องเป็น .xlsx)" }, { status: 400 }); }

  // canonical ชื่อกลิ่น (สำหรับ finished goods) — กันชื่อสะกดต่าง
  const cat = await q<{ name: string }>(`select name from products`);
  const canon = new Map(cat.map((c) => [productKey(c.name), c.name]));

  const changes: Row[] = [];
  const invalid: string[] = [];

  // ── สำเร็จรูป ──
  const fg = wb.getWorksheet("สำเร็จรูป");
  if (fg) {
    const h = headers(fg);
    const cP = h["กลิ่น"], cS = h["ขนาด"], cCnt = h["นับได้จริง (กรอก)"], cCur = h["คงเหลือปัจจุบัน"];
    fg.eachRow((row, rn) => {
      if (rn === 1) return;
      const to = num(row.getCell(cCnt).value); if (to == null) return;
      const product = canon.get(productKey(txt(row.getCell(cP).value))) ?? txt(row.getCell(cP).value);
      const size = txt(row.getCell(cS).value);
      if (!product || !size) { invalid.push(`สำเร็จรูป แถว ${rn}: ไม่มีกลิ่น/ขนาด`); return; }
      changes.push({ sheet: "สำเร็จรูป", name: `${product} ${size}`, from: num(row.getCell(cCur).value) ?? 0, to, kind: "fg", product, size });
    });
  }
  // ── วัตถุดิบ 3 ชีต (ใช้ "รหัส (ห้ามแก้)" = cat|ref) ──
  for (const sheetName of ["น้ำหอม", "สติ๊กเกอร์", "ขวดและแพ็คเกจ"]) {
    const ws = wb.getWorksheet(sheetName); if (!ws) continue;
    const h = headers(ws);
    const cKey = h["รหัส (ห้ามแก้)"], cCnt = h["นับได้จริง (กรอก)"];
    const cCur = h["คงเหลือ (ml)"] ?? h["คงเหลือ"];
    const cScent = h["กลิ่น"], cComp = h["ชิ้นส่วน"], cLabel = h["รายการ"], cGrade = h["Grade"], cBrand = h["Brand"], cCat = h["หมวด"];
    ws.eachRow((row, rn) => {
      if (rn === 1) return;
      const to = num(row.getCell(cCnt).value); if (to == null) return;
      const key = txt(row.getCell(cKey).value);
      const [category, ...refParts] = key.split("|"); const ref = refParts.join("|");
      if (!category || !ref) { invalid.push(`${sheetName} แถว ${rn}: ไม่มีรหัส`); return; }
      const name = category === "packaging" ? txt(row.getCell(cLabel).value)
        : category === "label" ? `${txt(row.getCell(cScent).value)} · ${txt(row.getCell(cComp).value)}`
        : txt(row.getCell(cScent).value);
      changes.push({
        sheet: sheetName, name, from: num(row.getCell(cCur).value) ?? 0, to, kind: "mat",
        cat: category, ref, scent: cScent ? txt(row.getCell(cScent).value) : undefined,
        comp: cComp ? txt(row.getCell(cComp).value) : undefined, grade: cGrade ? txt(row.getCell(cGrade).value) : undefined,
        brand: cBrand ? txt(row.getCell(cBrand).value) : undefined,
      });
    });
  }

  const diffOnly = changes.filter((c) => c.to !== c.from);
  const summary = {
    total: changes.length, changed: diffOnly.length,
    bySheet: ["สำเร็จรูป", "น้ำหอม", "สติ๊กเกอร์", "ขวดและแพ็คเกจ"].map((s) => ({ sheet: s, changed: diffOnly.filter((c) => c.sheet === s).length })).filter((x) => x.changed > 0),
    preview: diffOnly.slice(0, 60).map((c) => ({ sheet: c.sheet, name: c.name, from: c.from, to: c.to })),
    invalid: invalid.slice(0, 20),
  };

  if (mode !== "apply") return NextResponse.json({ ok: true, mode: "preview", ...summary });
  if (!changes.length) return NextResponse.json({ ok: false, error: "ไม่มีแถวที่กรอก 'นับได้จริง'" }, { status: 400 });

  try {
    await tx(async (run) => {
      for (const c of diffOnly) {   // เฉพาะแถวที่ยอดเปลี่ยนจริง (ไม่เขียน move ยอด 0)
        if (c.kind === "fg") {
          const [cur] = await run<{ qty: number }>(`select qty::float8 as qty from stock where product=$1 and size=$2`, [c.product, c.size]);
          const old = cur?.qty ?? 0; const diff = c.to - old;
          await run(`insert into stock (product, size, qty, updated_at) values ($1,$2,$3,now())
                     on conflict (product, size) do update set qty=$3, updated_at=now()`, [c.product, c.size, c.to]);
          await run(`insert into stock_moves (product, size, qty_change, balance, reason, note, created_by)
                     values ($1,$2,$3,$4,'adjust','นับสต๊อก (นำเข้าไฟล์)',$5)`, [c.product, c.size, diff, c.to, user.id]);
        } else {
          // upsert material_item (กัน race) → ตั้งยอด + ลง move ส่วนต่าง
          const [it] = await run<{ id: number; qty: number }>(
            `insert into material_item (category, ref_key, scent, comp_key, brand, grade, label, unit)
             values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict (category, ref_key) do update set updated_at=now()
             returning id, qty::float8 as qty`,
            [c.cat, c.ref, c.scent ?? null, c.cat === "label" ? c.ref!.split("|")[1] : (c.cat === "packaging" ? c.ref : null), c.brand ?? null, c.grade || null, c.name, c.cat === "bulk" ? "ml" : "ชิ้น"]);
          const diff = c.to - Number(it.qty);
          await run(`update material_item set qty=$2, updated_at=now() where id=$1`, [it.id, c.to]);
          await run(`insert into material_move (item_id, qty_change, balance, reason, note, created_by)
                     values ($1,$2,$3,'adjust','นับสต๊อก (นำเข้าไฟล์)',$4)`, [it.id, diff, c.to, user.id]);
        }
      }
    });
  } catch (e: any) { return NextResponse.json({ ok: false, error: e?.message || "อัปเดตไม่สำเร็จ" }, { status: 500 }); }

  await logActivity("stock.count-import", `อัปเดตยอด ${diffOnly.length} รายการ (จากที่กรอก ${changes.length})`);
  for (const p of ["/stock", "/stock/moves", "/stock/bulk", "/stock/labels", "/stock/packaging", "/stock/materials/moves"]) revalidatePath(p);
  return NextResponse.json({ ok: true, mode: "apply", applied: diffOnly.length, changed: diffOnly.length });
}
