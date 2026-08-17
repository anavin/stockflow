import { getCurrentUser } from "@/lib/auth/session";

// พิมพ์ใบเบิกหลายใบเป็น PDF เดียว (Puppeteer เปิดหน้า HTML bulk แล้วเก็บ PDF) — /api/print-bulk?orders=A,B,C
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function launchBrowser() {
  const puppeteer = await import("puppeteer-core");
  if (process.env.VERCEL) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
  }
  const executablePath = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  return puppeteer.launch({ executablePath, headless: true, args: ["--no-sandbox"] });
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("unauthorized", { status: 401 });
  const raw = new URL(req.url).searchParams.get("orders") || "";
  if (!raw.trim()) return new Response("ไม่ได้เลือกใบเบิก", { status: 400 });

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  const origin = host ? `${proto}://${host}` : new URL(req.url).origin;
  const url = `${origin}/print/withdrawal-bulk?orders=${encodeURIComponent(raw)}&pdf=1`;
  const cookie = req.headers.get("cookie") ?? "";

  let browser: Awaited<ReturnType<typeof launchBrowser>> | null = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    if (cookie) await page.setExtraHTTPHeaders({ cookie });
    await page.emulateMediaType("print");
    await page.goto(url, { waitUntil: "networkidle0", timeout: 55000 });
    await page.evaluate(() => (document as any).fonts?.ready).catch(() => {});
    await new Promise((r) => setTimeout(r, 400));
    const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true });
    const count = raw.split(",").filter(Boolean).length;
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(`ใบเบิก-${count}ใบ.pdf`)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("[print-bulk pdf]", e?.message);
    return new Response("สร้าง PDF ไม่สำเร็จ: " + (e?.message || ""), { status: 500 });
  } finally {
    await browser?.close().catch(() => {});
  }
}
