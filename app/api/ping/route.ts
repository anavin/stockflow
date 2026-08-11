import { NextResponse } from "next/server";
import { q } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Keep-warm endpoint. Hit this every ~5 min from a free external cron
 *  (cron-job.org / UptimeRobot) so the Vercel function + DB pool stay warm and
 *  users don't pay the ~3s cold-start on the next real request. No auth on purpose
 *  (it only runs `select 1`, no data). */
export async function GET() {
  const t = Date.now();
  try {
    await q("select 1");
    return NextResponse.json({ ok: true, ms: Date.now() - t });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
