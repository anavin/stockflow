"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUser, setUserActive, resetPassword, setUserRole } from "@/lib/actions/users";
import { ROLE_LABELS, ROLE_DESC } from "@/lib/auth/roles";
import type { UserRow } from "@/lib/queries";
import { UserPlus, KeyRound, CheckCircle2 } from "lucide-react";

const ROLE_OPTS = ["creator", "picker", "admin"] as const;

export default function UsersManager({ users, meId }: { users: UserRow[]; meId: number }) {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", full_name: "", role: "creator", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const set = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setMsg(""); setBusy(true);
    const res = await createUser(form);
    setBusy(false);
    if (!res.ok) { setError(res.error || "เพิ่มไม่สำเร็จ"); return; }
    setMsg(`เพิ่มผู้ใช้ "${form.username}" แล้ว`);
    setForm({ username: "", full_name: "", role: "creator", password: "" });
    router.refresh();
  }

  async function changeRole(u: UserRow, role: string) {
    if (role === u.role) return;
    const res = await setUserRole(u.id, role);
    if (!res.ok) alert(res.error);
    router.refresh();
  }

  async function toggle(u: UserRow) {
    const res = await setUserActive(u.id, !u.is_active);
    if (!res.ok) { alert(res.error); return; }
    router.refresh();
  }

  async function reset(u: UserRow) {
    const pw = prompt(`ตั้งรหัสผ่านใหม่ให้ "${u.username}" (อย่างน้อย 8 ตัว มีตัวอักษร+ตัวเลข)`);
    if (!pw) return;
    const res = await resetPassword(u.id, pw);
    if (!res.ok) { alert(res.error); return; }
    alert("เปลี่ยนรหัสผ่านแล้ว");
  }

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink"><UserPlus size={16} /> เพิ่มผู้ใช้</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="label">ชื่อผู้ใช้ (username)</label>
            <input className="input" value={form.username} onChange={(e) => set({ username: e.target.value })} placeholder="เช่น staff01" />
          </div>
          <div>
            <label className="label">ชื่อ-สกุล</label>
            <input className="input" value={form.full_name} onChange={(e) => set({ full_name: e.target.value })} />
          </div>
          <div>
            <label className="label">บทบาท / สิทธิ์</label>
            <select className="input" value={form.role} onChange={(e) => set({ role: e.target.value })}>
              {ROLE_OPTS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <p className="mt-1 text-xs text-faint">{ROLE_DESC[form.role]}</p>
          </div>
          <div>
            <label className="label">รหัสผ่าน</label>
            <input className="input" type="text" value={form.password} onChange={(e) => set({ password: e.target.value })}
              placeholder="อย่างน้อย 8 ตัว มีตัวอักษร+ตัวเลข" />
          </div>
        </div>
        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        {msg && <p className="mt-3 flex items-center gap-1 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700"><CheckCircle2 size={14} /> {msg}</p>}
        <button className="btn-primary mt-4" disabled={busy}>{busy ? "กำลังเพิ่ม…" : "เพิ่มผู้ใช้"}</button>
      </form>

      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-soft text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3">ชื่อผู้ใช้</th>
              <th className="px-4 py-3">ชื่อ-สกุล</th>
              <th className="px-4 py-3">สิทธิ์</th>
              <th className="px-4 py-3">สถานะ</th>
              <th className="px-4 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="px-4 py-3 font-medium text-ink">@{u.username}{u.id === meId && <span className="ml-1 text-xs text-faint">(คุณ)</span>}</td>
                <td className="px-4 py-3">{u.full_name || "—"}</td>
                <td className="px-4 py-3">
                  <select value={u.role} onChange={(e) => changeRole(u, e.target.value)} disabled={u.id === meId}
                    className="input h-8 py-0 text-xs disabled:opacity-60" title="เปลี่ยนบทบาท">
                    {!ROLE_OPTS.includes(u.role as any) && <option value={u.role}>{u.role} (เดิม)</option>}
                    {ROLE_OPTS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={`chip ${u.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{u.is_active ? "ใช้งาน" : "ปิด"}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => reset(u)} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:bg-soft" title="ตั้งรหัสผ่านใหม่">
                      <KeyRound size={14} /> รหัสผ่าน
                    </button>
                    <button onClick={() => toggle(u)} disabled={u.id === meId}
                      className="rounded-md px-2 py-1 text-xs text-muted hover:bg-soft disabled:opacity-40">
                      {u.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
