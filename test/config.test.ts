import { describe, it, expect } from "vitest";
import {
  assignsSku, needsSerialSku, requiresSku, cutsStock, isStockTracked,
  isBagProduct, isWholesalePlatform, isAllowedFreeSize, findPack, expandPack, type PackDef,
} from "@/lib/config";

describe("แพ็ค (Best Seller Pack) — แตกเป็นกลิ่นย่อยตายตัว", () => {
  const PACKS: PackDef[] = [{
    name: "Best Seller Pack", match: "Best Seller Pack", active: true,
    items: [
      { product: "La Belle", size: "4 ml", is_free: false },
      { product: "Senorita", size: "4 ml", is_free: false },
      { product: "Secret of Peach", size: "4 ml", is_free: false },
      { product: "Sicilia", size: "4 ml", is_free: false },
      { product: "Never Blue", size: "4 ml", is_free: false },
      { product: "Zeus", size: "4 ml", is_free: false },
      { product: "Dream Island", size: "4 ml", is_free: true },
    ],
  }];
  it("จับชื่อแพ็คจากชื่อสินค้า (substring ไม่สนตัวพิมพ์)", () => {
    const p = findPack("Best Seller Pack by LAB Parfumo : น้ำหอมขนาดทดลอง (EDP) แพ็ค 6 ฟรี 1 หลอด 4ml", PACKS);
    expect(p?.name).toBe("Best Seller Pack");
    expect(findPack("La Belle", PACKS)).toBe(null);   // กลิ่นเดี่ยว = ไม่ใช่แพ็ค
    expect(findPack("", PACKS)).toBe(null);
    expect(findPack("Best Seller Pack", [])).toBe(null);   // ไม่มีนิยามแพ็ค = null
  });
  it("แตกเป็น 6 จ่าย + 1 ฟรี · 4ml · qty คูณจำนวนแพ็ค", () => {
    const p = findPack("Best Seller Pack ...", PACKS)!;
    const one = expandPack(p, 1);
    expect(one).toHaveLength(7);
    expect(one.filter((x) => !x.is_free)).toHaveLength(6);
    expect(one.filter((x) => x.is_free)).toHaveLength(1);
    expect(one.every((x) => x.size === "4 ml")).toBe(true);
    expect(expandPack(p, 2).every((x) => x.qty === 2)).toBe(true);   // 2 แพ็ค = กลิ่นละ 2
  });
});

// ล็อกโมเดล 3 ระดับของ SKU (bottles / 4ml-assign / 1.2ml-qty) — จุดที่ regress ง่ายสุด
describe("SKU tier model", () => {
  it("4ml = assign ตอนตัด (ไม่ใช่ serial ที่รับเข้าคลังก่อน)", () => {
    expect(assignsSku("4 ml")).toBe(true);
    expect(needsSerialSku("4 ml")).toBe(false);
    expect(requiresSku("4 ml")).toBe(true);   // assign ก็ยังต้องกรอก SKU ตอนตัด
  });

  it("ขวดจริง (30/50/90/100 ml) = ต้องมี serial เดิมในคลัง", () => {
    for (const s of ["30 ml", "50 ml", "90 ml", "100 ml"]) {
      expect(needsSerialSku(s), s).toBe(true);
      expect(assignsSku(s), s).toBe(false);
      expect(requiresSku(s), s).toBe(true);
    }
  });

  it("Try Me (เทสเตอร์) = assign SKU ตอนตัด เหมือน 4ml + ตัดสต๊อก (ไม่ใช่ serial-pool)", () => {
    for (const s of ["30 ml", "50 ml"]) {
      const p = "1000 Thousand TRY ME!";
      expect(assignsSku(s, p), s).toBe(true);          // สแกน/กรอก SKU ตอนตัด
      expect(needsSerialSku(s, p), s).toBe(false);     // ไม่บังคับ serial ที่รับเข้าคลังก่อน
      expect(requiresSku(s, p), s).toBe(true);         // แต่บังคับต้องมี SKU (โชว์บนใบเบิก)
      expect(cutsStock(p, s), s).toBe(true);           // ตัดสต๊อกเหมือนสินค้าปกติ
      expect(isAllowedFreeSize(s, p), s).toBe(true);   // ยังแถมฟรีได้ 30/50
    }
  });

  it("1.2ml = ตัดตามจำนวน ไม่ต้องมี SKU", () => {
    expect(needsSerialSku("1.2 ml")).toBe(false);
    expect(assignsSku("1.2 ml")).toBe(false);
    expect(requiresSku("1.2 ml")).toBe(false);
  });

  it("ตัดสต๊อก: ml ทุกขนาดตัด, ถุงเป็นสินค้าแยก", () => {
    expect(cutsStock("Rose", "30 ml")).toBe(true);
    expect(cutsStock("Rose", "4 ml")).toBe(true);
    expect(isBagProduct("ถุงกระดาษ Size M")).toBe(true);
    expect(isBagProduct("Rose")).toBe(false);
    expect(requiresSku("Size M")).toBe(false);   // ถุงไม่ต้องมี SKU
  });

  it("isStockTracked: มีหน่วย ml = track, ไม่มี = ไม่ track", () => {
    expect(isStockTracked("50 ml")).toBe(true);
    expect(isStockTracked("1.2 ml")).toBe(true);
    expect(isStockTracked("Size M")).toBe(false);
  });

  it("ของแถม: ได้เฉพาะขนาดเล็ก", () => {
    expect(isAllowedFreeSize("4 ml", "Rose")).toBe(true);
    expect(isAllowedFreeSize("50 ml", "Rose")).toBe(false);   // ขวดใหญ่แถมไม่ได้
  });
});

describe("แพลตฟอร์มค้าส่ง", () => {
  it("CTW/Eveandboy/KingPower = ค้าส่ง, ปลีกไม่ใช่", () => {
    for (const p of ["CTW", "Eveandboy", "KingPower"]) expect(isWholesalePlatform(p), p).toBe(true);
    for (const p of ["Shopee", "Lazada", "TikTok", "Office"]) expect(isWholesalePlatform(p), p).toBe(false);
  });
});
