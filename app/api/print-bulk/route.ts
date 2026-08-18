import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getOrder } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { WithdrawalDocumentMulti } from "@/lib/pdf/withdrawal-sp-document";
import type { OrderWithItems } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// พิมพ์ใบเบิกหลายใบที่เลือกไว้เป็น PDF เดียว: /api/print-bulk?orders=A,B,C (Order No. คั่นด้วย comma)
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !(can.createOrders(user.role) || can.issueStock(user.role))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const raw = new URL(req.url).searchParams.get("orders") || "";
  const nos = raw.split(",").map((s) => decodeURIComponent(s.trim())).filter(Boolean).slice(0, 200);
  if (nos.length === 0) return NextResponse.json({ error: "ไม่ได้เลือกใบเบิก" }, { status: 400 });

  const fetched = await Promise.all(nos.map((n) => getOrder(n)));
  const orders = fetched.filter((o): o is OrderWithItems => !!o);
  if (orders.length === 0) return NextResponse.json({ error: "ไม่พบใบเบิกที่เลือก" }, { status: 404 });

  try {
    const buffer = await renderToBuffer(WithdrawalDocumentMulti({ orders }) as any);
    const filename = `ใบเบิก-${orders.length}ใบ.pdf`;
    return new NextResponse(buffer as any, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "cache-control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("[print-bulk] render failed:", e?.message);
    return NextResponse.json({ error: "สร้าง PDF ไม่สำเร็จ", detail: e?.message }, { status: 500 });
  }
}
