"use client";
import { useState, useEffect, useRef } from "react";

/**
 * useState ที่จำค่าไว้ใน sessionStorage — รีเฟรชหน้าแล้วค่าค้นหา/ฟิลเตอร์ยังอยู่
 * (หายเมื่อปิดแท็บ · ไม่ค้างข้ามวันเหมือน localStorage) · กัน SSR/hydration: render แรกใช้ initial แล้วค่อยอ่านจาก storage หลัง mount
 * ใช้แทน useState ได้ตรงๆ — setter รองรับ functional update เหมือน useState
 */
export function useStickyState<T>(key: string, initial: T) {
  const [val, setVal] = useState<T>(initial);
  const loaded = useRef(false);
  useEffect(() => {
    try { const s = sessionStorage.getItem(key); if (s != null) setVal(JSON.parse(s) as T); } catch { /* storage ปิด/เต็ม = ข้าม */ }
    loaded.current = true;
  }, [key]);
  useEffect(() => {
    if (!loaded.current) return;
    try { sessionStorage.setItem(key, JSON.stringify(val)); } catch { /* ข้าม */ }
  }, [key, val]);
  return [val, setVal] as const;
}
