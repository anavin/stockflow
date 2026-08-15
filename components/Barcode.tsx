"use client";
import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

/**
 * Code128 barcode as inline SVG (สแกนเนอร์อ่าน Code128 ได้ทุกตัว).
 * พื้นขาว/แท่งดำเสมอ เพื่อให้พิมพ์/สแกนติดชัวร์ — แนวเดียวกับ CTW components/Barcode.tsx
 */
export default function Barcode({
  value,
  width = 1.6,
  height = 42,
  fontSize = 12,
  displayValue = false,
  className,
}: {
  value: string;
  width?: number;
  height?: number;
  fontSize?: number;
  displayValue?: boolean;
  className?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, {
        format: "CODE128",
        width,
        height,
        fontSize,
        displayValue,
        margin: 0,
        lineColor: "#000000",
        background: "#ffffff",
      });
    } catch {
      /* ค่าที่ encode ไม่ได้ — ปล่อยว่างไว้ */
    }
  }, [value, width, height, fontSize, displayValue]);
  return <svg ref={ref} className={className} />;
}
