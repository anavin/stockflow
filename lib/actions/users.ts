"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { q } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { hashBcrypt, validatePassword } from "@/lib/auth/password";

async function requireAdminUser() {
  const user = await getCurrentUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบ" as const };
  if (user.role !== "admin") return { error: "เฉพาะผู้ดูแลระบบ" as const };
  return { user };
}

const ALLOWED_ROLES = ["admin", "creator", "picker", "stock"];
function cleanRoles(v: string): string[] {
  return [...new Set((v || "").split(",").map((r) => r.trim()).filter((r) => ALLOWED_ROLES.includes(r)))];
}

const createSchema = z.object({
  username: z.string().trim().min(3, "ชื่อผู้ใช้อย่างน้อย 3 ตัว").regex(/^[a-zA-Z0-9._-]+$/, "ใช้ได้เฉพาะ a-z 0-9 . _ -"),
  full_name: z.string().trim().default(""),
  role: z.string().default("creator"),   // comma-separated ได้หลายสิทธิ์
  password: z.string(),
});

export async function createUser(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const gate = await requireAdminUser();
  if ("error" in gate) return { ok: false, error: gate.error };

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  const { username, full_name, role, password } = parsed.data;
  const roles = cleanRoles(role);
  if (!roles.length) return { ok: false, error: "เลือกบทบาทอย่างน้อย 1 อย่าง" };

  const pw = validatePassword(password, username);
  if (!pw.ok) return { ok: false, error: pw.message };

  const [dup] = await q(`select 1 from users where lower(username) = lower($1)`, [username]);
  if (dup) return { ok: false, error: "มีชื่อผู้ใช้นี้แล้ว" };

  await q(
    `insert into users (username, password_hash, full_name, role) values ($1,$2,$3,$4)`,
    [username, await hashBcrypt(password), full_name, roles.join(",")],
  );
  revalidatePath("/users");
  return { ok: true };
}

export async function setUserActive(id: number, active: boolean): Promise<{ ok: boolean; error?: string }> {
  const gate = await requireAdminUser();
  if ("error" in gate) return { ok: false, error: gate.error };
  if (gate.user.id === id && !active) return { ok: false, error: "ปิดใช้งานตัวเองไม่ได้" };
  await q(`update users set is_active = $2 where id = $1`, [id, active]);
  revalidatePath("/users");
  return { ok: true };
}

export async function setUserRoles(id: number, roles: string[]): Promise<{ ok: boolean; error?: string }> {
  const gate = await requireAdminUser();
  if ("error" in gate) return { ok: false, error: gate.error };
  const clean = cleanRoles((roles || []).join(","));
  if (!clean.length) return { ok: false, error: "เลือกบทบาทอย่างน้อย 1 อย่าง" };
  if (gate.user.id === id && !clean.includes("admin")) return { ok: false, error: "เอาสิทธิ์แอดมินของตัวเองออกไม่ได้" };
  await q(`update users set role = $2 where id = $1`, [id, clean.join(",")]);
  revalidatePath("/users");
  return { ok: true };
}

export async function resetPassword(id: number, password: string): Promise<{ ok: boolean; error?: string }> {
  const gate = await requireAdminUser();
  if ("error" in gate) return { ok: false, error: gate.error };
  const [u] = await q<{ username: string }>(`select username from users where id = $1`, [id]);
  if (!u) return { ok: false, error: "ไม่พบผู้ใช้" };
  const pw = validatePassword(password, u.username);
  if (!pw.ok) return { ok: false, error: pw.message };
  await q(`update users set password_hash = $2 where id = $1`, [id, await hashBcrypt(password)]);
  return { ok: true };
}
