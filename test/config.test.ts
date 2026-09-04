import { describe, it, expect } from "vitest";
import {
  assignsSku, needsSerialSku, requiresSku, cutsStock, isStockTracked,
  isBagProduct, isWholesalePlatform, isAllowedFreeSize,
} from "@/lib/config";

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
