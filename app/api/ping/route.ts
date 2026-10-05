import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Keep-warm endpoint. Hit this from a free external cron (cron-job.org /
 *  UptimeRobot) so the Vercel function stays warm and users don't pay the
 *  ~3s cold-start on the next real request. No auth, no DB on purpose:
 *  returns immediately to keep Fluid Active CPU per hit near-zero — the
 *  invocation itself keeps the instance warm, and the DB pool re-warms on the
 *  first real request (prod has steady traffic, so it rarely goes cold). */
export async function GET() {
  return NextResponse.json({ ok: true });
}
