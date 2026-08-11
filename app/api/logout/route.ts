import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { deleteSession, clearSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token).catch(() => {});
  await clearSessionCookie();
  return NextResponse.redirect(new URL("/login", req.url));
}
