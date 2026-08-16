// สิทธิ์ตามบทบาท — จุดเดียวที่กำหนดว่าใครทำอะไรได้ (ใช้ทั้งฝั่ง UI + server action)
// 4 บทบาท: admin (เจ้าของ) · creator (สร้างใบเบิก) · picker (จัดของ/ตัดสต๊อก) · stock (คลัง)
import type { Role } from "./constants";

export const ROLES = ["admin", "creator", "picker", "stock"] as const;

export const ROLE_LABELS: Record<string, string> = {
  admin: "แอดมิน / เจ้าของ",
  creator: "ฝ่ายขาย / สร้างใบเบิก",
  picker: "ฝ่ายจัดของ / ตัดสต๊อก",
  stock: "ฝ่ายคลัง / สต๊อก",
};

export const ROLE_DESC: Record<string, string> = {
  admin: "ทำได้ทุกอย่าง + ยกเลิกการตัดสต๊อก + จัดการผู้ใช้",
  creator: "สร้าง / นำเข้า / แก้ไข / พิมพ์ใบเบิก + จัดการกลิ่น (ไม่ตัดสต๊อก)",
  picker: "สแกนใบเบิก ใส่ SKU/Spec แล้วตัดสต๊อก (ไม่สร้างใบเบิก)",
  stock: "รับเข้า / ปรับยอด / นับสต๊อก + ดูแดชบอร์ด (ไม่สร้างใบเบิก ไม่ตัดสต๊อก)",
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
  /** ดูสต๊อกคงเหลือ / ประวัติ = เจ้าของ + จัดของ + คลัง */
  viewStock: (role?: string | null) => { const r = norm(role); return r === "admin" || r === "picker" || r === "stock"; },
  /** รับเข้า / ปรับยอด / นับสต๊อก / ยกเลิกการตัด = เจ้าของ + ฝ่ายคลัง */
  manageStock: (role?: string | null) => { const r = norm(role); return r === "admin" || r === "stock"; },
  /** ดูแดชบอร์ดภาพรวม + กลิ่นขายดี = เจ้าของ + จัดของ + คลัง */
  viewDashboard: (role?: string | null) => { const r = norm(role); return r === "admin" || r === "picker" || r === "stock"; },
  /** จัดการผู้ใช้ */
  manageUsers: (role?: string | null) => norm(role) === "admin",
};

/** หน้าแรกที่ควรพาไปหลัง login / เวลาถูกกันสิทธิ์ (ไม่ให้ตาย/วนลูป)
 *  บทบาทที่ไม่รู้จัก/ว่าง → /no-access (หน้าที่ต้องแค่ login) กันวนลูป redirect */
export function homeFor(role?: string | null): string {
  const r = norm(role);
  if (r === "admin") return "/";
  if (r === "picker") return "/stock/issue";
  if (r === "stock") return "/stock";
  if (r === "creator") return "/shopee";
  return "/no-access";
}

export type { Role };
