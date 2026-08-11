import { NextResponse } from "next/server";
import { loginWithPassword } from "@/lib/auth/login";
import { createSession, setSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}));
  const res = await loginWithPassword(username, password);
  if (!res.ok || !res.user) {
    return NextResponse.json({ ok: false, error: res.error, attemptsRemaining: res.attemptsRemaining }, { status: 401 });
  }
  const token = await createSession(res.user.id);
  await setSessionCookie(token);
  return NextResponse.json({ ok: true });
}
