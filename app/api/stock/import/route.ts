import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { parseStockWorkbook } from "@/lib/import/parse-stock";
import { tx, q } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { productKey } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 60;

/** อัปโหลดไฟล์สต๊อก (Lab Stock & Seller Data Monitoring) → ตั้งยอดสต๊อกปัจจุบันตามไฟล์ */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (!can.manageStock(user.role)) return NextResponse.json({ ok: false, error: "เฉพาะผู้ดูแลระบบ / ฝ่ายคลัง" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "ไม่พบไฟล์" }, { status: 400 });

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as any);
    const { lines, sheets } = parseStockWorkbook(wb);
    if (lines.length === 0) return NextResponse.json({ ok: false, error: "ไม่พบชีตสต๊อก (สต๊อก xx ml.) ในไฟล์" }, { status: 400 });

    // map ชื่อกลิ่นให้ตรง catalog ของระบบเบิก (กันชื่อสะกดต่าง เช่น "Legend of Oud" → "Legend of OUD")
    const cat = await q<{ name: string }>(`select name from products`);
    const canon = new Map(cat.map((c) => [productKey(c.name), c.name]));
    for (const l of lines) l.product = canon.get(productKey(l.product)) ?? l.product;

    await tx(async (run) => {
      for (const l of lines) {
        // set ค่าสัมบูรณ์ตามไฟล์ แต่บันทึก movement เป็น "ส่วนต่าง" (ยอดใหม่-ยอดเก่า)
        // เพื่อให้ ledger รวมกันแล้วเท่ากับ balance เสมอ (เหมือน adjustStock)
        const [cur] = await run<{ qty: number }>(`select qty::float8 as qty from stock where product = $1 and size = $2`, [l.product, l.size]);
        const old = cur?.qty ?? 0;
        const diff = l.qty - old;
        await run(
          `insert into stock (product, size, qty, updated_at) values ($1,$2,$3,now())
           on conflict (product, size) do update set qty = $3, updated_at = now()`,
          [l.product, l.size, l.qty],
        );
        await run(
          `insert into stock_moves (product, size, qty_change, balance, reason, note, created_by)
           values ($1,$2,$3,$4,'adjust','นำเข้าจากไฟล์สต๊อก',$5)`,
          [l.product, l.size, diff, l.qty, user.id],
        );
      }
    });

    revalidatePath("/stock");
    revalidatePath("/stock/moves");
    return NextResponse.json({ ok: true, imported: lines.length, sheets });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "นำเข้าไม่สำเร็จ" }, { status: 400 });
  }
}
