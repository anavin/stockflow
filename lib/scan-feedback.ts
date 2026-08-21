/** เสียง + สั่น ยืนยันการสแกน — ใช้ร่วมทุกหน้าสแกน (ตัดสต๊อก/ส่ง/รับคืน) ให้ feedback สม่ำเสมอ
 *  ok=โทนสูงสั้น · warn/already=โทนกลาง · error=โทนต่ำคู่ (client-only, เงียบได้ถ้าเบราว์เซอร์ไม่รองรับ) */
export function scanBeep(kind: "ok" | "warn" | "error") {
  try {
    const AC = (window.AudioContext || (window as any).webkitAudioContext);
    if (AC) {
      const ac = new AC(); const o = ac.createOscillator(); const g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.frequency.value = kind === "ok" ? 880 : kind === "warn" ? 560 : 300;
      g.gain.value = 0.05; o.start();
      o.stop(ac.currentTime + (kind === "error" ? 0.28 : 0.12));
    }
  } catch { /* เงียบได้ */ }
  try { navigator.vibrate?.(kind === "error" ? [80, 60, 80] : kind === "warn" ? [40, 40, 40] : 40); } catch { /* ไม่มี vibrate */ }
}
