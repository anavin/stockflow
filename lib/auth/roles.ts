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
  admin: "ทำได้ทุกอย่าง + ยกเลิกการตัดสต๊อก + จัดการผู้ใช้ + ดูบันทึกการใช้งาน",
  creator: "สร้าง / นำเข้า / แก้ไข / พิมพ์ใบเบิก (ไม่ตัดสต๊อก)",
  picker: "สแกนใบเบิก ใส่ SKU/Spec แล้วตัดสต๊อก (ไม่สร้างใบเบิก)",
  stock: "คลังวัตถุดิบ: รับเข้า / เบิก / ปรับยอด / นับสต๊อก + จัดการกลิ่น + ดูแดชบอร์ด",
};

// รองรับข้อมูลเก่า: role "staff" เดิม = ทำงานฝั่งสร้างใบเบิก
function norm(role?: string | null): string {
  const r = (role || "").trim();
  return r === "staff" ? "creator" : r;
}
/** 1 user มีได้หลายสิทธิ์ — เก็บเป็น comma เช่น "creator,stock" */
export function roleList(role?: string | null): string[] {
  return (role || "").split(",").map((r) => norm(r.trim())).filter(Boolean);
}
const hasAny = (role: string | null | undefined, set: string[]) => roleList(role).some((r) => set.includes(r));
/** เป็นแอดมินไหม — รองรับหลายบทบาท ("admin,stock") อย่าใช้ role === "admin" ตรงๆ */
export const isAdmin = (role?: string | null) => roleList(role).includes("admin");

/** ความสามารถแยกตามงาน — เช็คที่นี่ที่เดียว (ผ่านทุกสิทธิ์ที่ user มี) */
export const can = {
  /** สร้าง/แก้ไข/นำเข้า/ลบ ใบเบิก */
  createOrders: (role?: string | null) => hasAny(role, ["admin", "creator"]),
  /** สแกน + ตัดสต๊อก (ใส่ SKU/Spec) */
  issueStock: (role?: string | null) => hasAny(role, ["admin", "picker"]),
  /** ดูสต๊อกคงเหลือ / ประวัติ = เจ้าของ + จัดของ + คลัง */
  viewStock: (role?: string | null) => hasAny(role, ["admin", "picker", "stock"]),
  /** รับเข้า / ปรับยอด / นับสต๊อก / ยกเลิกการตัด = เจ้าของ + ฝ่ายคลัง */
  manageStock: (role?: string | null) => hasAny(role, ["admin", "stock"]),
  /** จัดการ master กลิ่น (เพิ่ม/แก้/ลบ) = เจ้าของ + ฝ่ายคลัง (กลิ่น = วัตถุดิบ) */
  manageScents: (role?: string | null) => hasAny(role, ["admin", "stock"]),
  /** ดูแดชบอร์ดภาพรวม + กลิ่นขายดี = เจ้าของ + จัดของ + คลัง + ฝ่ายขาย (อ้างอิงตอนสร้างออเดอร์) */
  viewDashboard: (role?: string | null) => hasAny(role, ["admin", "picker", "stock", "creator"]),
  /** ดูข้อมูล อย. (อ่านอย่างเดียว) = ทุกฝ่ายที่มีบทบาท (แก้ = manageStock) */
  viewFda: (role?: string | null) => hasAny(role, ["admin", "picker", "stock", "creator"]),
  /** จัดการผู้ใช้ */
  manageUsers: (role?: string | null) => hasAny(role, ["admin"]),
  /** ดูบันทึกการใช้งาน (audit log) = เจ้าของเท่านั้น */
  viewLogs: (role?: string | null) => hasAny(role, ["admin"]),
  /** รับคืนสินค้า (สแกน → คืนสต๊อก/ชำรุด) = เจ้าของ + จัดของ + คลัง (คนรับของจริง) */
  handleReturns: (role?: string | null) => hasAny(role, ["admin", "picker", "stock"]),
  /** จัดการคลังของชำรุด (ทำลาย/เคลม/ซ่อมคืนสต๊อก) + ยกเลิกการคืน = เจ้าของ + ฝ่ายคลัง */
  manageDamaged: (role?: string | null) => hasAny(role, ["admin", "stock"]),
};

/** หน้าแรกที่ควรพาไปหลัง login / เวลาถูกกันสิทธิ์ (ไม่ให้ตาย/วนลูป)
 *  บทบาทที่ไม่รู้จัก/ว่าง → /no-access (หน้าที่ต้องแค่ login) กันวนลูป redirect */
export function homeFor(role?: string | null): string {
  const rs = roleList(role);
  if (rs.includes("admin")) return "/";
  if (rs.includes("creator")) return "/shopee";
  if (rs.includes("picker")) return "/stock/issue";
  if (rs.includes("stock")) return "/stock";
  return "/no-access";
}

export type { Role };
