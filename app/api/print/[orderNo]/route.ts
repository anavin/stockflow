import { getCurrentUser } from "@/lib/auth/session";
import { getOrder } from "@/lib/queries";

// One-click PDF: เปิดหน้า HTML /print/withdrawal/[orderNo] ด้วย headless Chrome แล้วเก็บเป็น PDF
// → Chromium render ภาษาไทย native (ไม่มีบั๊ก fontkit) ได้ PDF ตรงเป๊ะกับพรีวิว ไม่มี print dialog
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function launchBrowser() {
  const puppeteer = await import("puppeteer-core");
  if (process.env.VERCEL) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  // local dev → Chrome ที่ติดตั้งในเครื่อง
  const executablePath = process.env.CHROME_PATH
    || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  return puppeteer.launch({ executablePath, headless: true, args: ["--no-sandbox"] });
}

export async function GET(req: Request, ctx: { params: Promise<{ orderNo: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("unauthorized", { status: 401 });
  const { orderNo } = await ctx.params;
  const decoded = decodeURIComponent(orderNo);
  const order = await getOrder(decoded);
  if (!order) return new Response("ไม่พบใบเบิก", { status: 404 });

  // origin จริง (หลัง proxy ของ Vercel host อาจเป็น internal)
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  const origin = host ? `${proto}://${host}` : new URL(req.url).origin;
  const url = `${origin}/print/withdrawal/${encodeURIComponent(decoded)}?pdf=1`;
  const cookie = req.headers.get("cookie") ?? "";   // ส่ง session ต่อให้หน้าพิมพ์ผ่าน auth

  let browser: Awaited<ReturnType<typeof launchBrowser>> | null = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    if (cookie) await page.setExtraHTTPHeaders({ cookie });
    await page.emulateMediaType("print");
    await page.goto(url, { waitUntil: "networkidle0", timeout: 45000 });
    await page.evaluate(() => (document as any).fonts?.ready).catch(() => {});
    await new Promise((r) => setTimeout(r, 300));   // ให้บาร์โค้ด SVG วาดเสร็จ
    const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true });
    const filename = `ใบเบิก-${order.doc_no || order.order_no}.pdf`;
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("[print pdf]", e?.message);
    return new Response("สร้าง PDF ไม่สำเร็จ: " + (e?.message || ""), { status: 500 });
  } finally {
    await browser?.close().catch(() => {});
  }
}
