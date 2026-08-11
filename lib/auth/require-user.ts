import { redirect } from "next/navigation";
import { getCurrentUser } from "./session";
import { can, homeFor } from "./roles";
import type { User } from "./constants";

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!can.manageUsers(user.role)) redirect(homeFor(user.role));
  return user;
}

/** หน้าฝั่ง "สร้างใบเบิก" — admin + creator เท่านั้น */
export async function requireCreator(): Promise<User> {
  const user = await requireUser();
  if (!can.createOrders(user.role)) redirect(homeFor(user.role));
  return user;
}

/** หน้าฝั่ง "สต๊อก/ตัดสต๊อก" — admin + picker เท่านั้น */
export async function requireStock(): Promise<User> {
  const user = await requireUser();
  if (!can.viewStock(user.role)) redirect(homeFor(user.role));
  return user;
}

/** แดชบอร์ดภาพรวม — เจ้าของเท่านั้น (คนอื่นเด้งไปหน้างานตัวเอง) */
export async function requireDashboard(): Promise<User> {
  const user = await requireUser();
  if (!can.viewDashboard(user.role)) redirect(homeFor(user.role));
  return user;
}
