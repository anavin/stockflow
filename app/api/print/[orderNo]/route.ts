import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getOrder } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth/session";
import { WithdrawalDocument } from "@/lib/pdf/withdrawal-sp-document";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ orderNo: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { orderNo } = await ctx.params;
  const order = await getOrder(decodeURIComponent(orderNo));
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });

  const buffer = await renderToBuffer(WithdrawalDocument({ order }) as any);
  const filename = `ใบเบิก-${order.doc_no || order.order_no}.pdf`;

  return new NextResponse(buffer as any, {
    headers: {
      "content-type": "application/pdf",
      // inline → opens in the browser's PDF viewer (Ctrl/Cmd-P to print)
      "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "cache-control": "no-store",
    },
  });
}
