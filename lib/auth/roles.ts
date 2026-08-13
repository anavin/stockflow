// สิทธิ์ตามบทบาท — จุดเดียวที่กำหนดว่าใครทำอะไรได้ (ใช้ทั้งฝั่ง UI + server action)
// 3 บทบาท: admin (เจ้าของ ทำได้ทุกอย่าง) · creator (สร้างใบเบิก) · picker (จัดของ/ตัดสต๊อก)
import type { Role } from "./constants";

export const ROLES = ["admin", "creator", "picker"] as const;

export const ROLE_LABELS: Record<string, string> = {
  admin: "แอดมิน / เจ้าของ",
  creator: "สร้างใบเบิก",
  picker: "จัดของ / ตัดสต๊อก",
};

export const ROLE_DESC: Record<string, string> = {
  admin: "ทำได้ทุกอย่าง + ยกเลิกการตัดสต๊อก + จัดการผู้ใช้",
  creator: "สร้าง / นำเข้า / แก้ไข / พิมพ์ใบเบิก (ไม่ตัดสต๊อก)",
  picker: "สแกนใบเบิก ใส่ SKU/Spec แล้วตัดสต๊อก (ไม่สร้างใบเบิก)",
};

// รองรับข้อมูลเก่า: role "staff" เดิม = ทำงานฝั่งสร้างใบเบิก
function norm(role?: string | null): string {
  const r = (role || "").trim();
  return r === "staff" ? "creator" : r;
}

/** ความสามารถแยกตามงาน — เช็คที่นี่ที่เดียว */
export const can = {
  /** สร้าง/แก้ไข/นำเข้า/ลบ ใบเบิก */
  createOrders: (role?: string | null) => { const r = norm(role); return r === "admin" || r === "creator"; },
  /** สแกน + ตัดสต๊อก (ใส่ SKU/Spec) */
  issueStock: (role?: string | null) => { const r = norm(role); return r === "admin" || r === "picker"; },
  /** ดูสต๊อกคงเหลือ / ประวัติ */
  viewStock: (role?: string | null) => { const r = norm(role); return r === "admin" || r === "picker"; },
  /** ยกเลิกการตัด / รับเข้า / ปรับยอดสต๊อก = เจ้าของเท่านั้น */
  manageStock: (role?: string | null) => norm(role) === "admin",
  /** ดูแดชบอร์ดภาพรวม + กลิ่นขายดี = เจ้าของ + ฝ่ายจัดของ/ตัดสต๊อก */
  viewDashboard: (role?: string | null) => { const r = norm(role); return r === "admin" || r === "picker"; },
  /** จัดการผู้ใช้ */
  manageUsers: (role?: string | null) => norm(role) === "admin",
};

/** หน้าแรกที่ควรพาไปหลัง login / เวลาถูกกันสิทธิ์ (ไม่ให้ตาย/วนลูป)
 *  บทบาทที่ไม่รู้จัก/ว่าง → /no-access (หน้าที่ต้องแค่ login) กันวนลูป redirect */
export function homeFor(role?: string | null): string {
  const r = norm(role);
  if (r === "admin") return "/";
  if (r === "picker") return "/stock/issue";
  if (r === "creator") return "/shopee";
  return "/no-access";
}

export type { Role };
