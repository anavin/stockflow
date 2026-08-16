"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createUser, setUserActive, resetPassword, setUserRoles } from "@/lib/actions/users";
import { ROLE_LABELS, ROLE_DESC, roleList } from "@/lib/auth/roles";
import type { UserRow } from "@/lib/queries";
import { UserPlus, KeyRound, CheckCircle2, Search, Shield, FileText, ScanLine, Boxes, Users, Check } from "lucide-react";

// ลำดับบทบาทในหน้านี้ (ขาย → จัดของ → คลัง → แอดมิน)
const ROLE_OPTS = ["creator", "picker", "stock", "admin"] as const;
const ROLE_META: Record<string, { icon: any; chip: string; ring: string }> = {
  creator: { icon: FileText, chip: "bg-blue-50 text-blue-700", ring: "border-blue-200" },
  picker: { icon: ScanLine, chip: "bg-emerald-50 text-emerald-700", ring: "border-emerald-200" },
  stock: { icon: Boxes, chip: "bg-amber-50 text-amber-700", ring: "border-amber-200" },
  admin: { icon: Shield, chip: "bg-violet-50 text-violet-700", ring: "border-violet-200" },
};
const roleChip = (role: string) => ROLE_META[role]?.chip ?? "bg-soft text-muted";
const fmtDate = (d: string | null) => (d ? String(d).slice(0, 10) : "—");

type SFilter = "all" | "active" | "inactive";

export default function UsersManager({ users, meId }: { users: UserRow[]; meId: number }) {
  const router = useRouter();
  const [form, setForm] = useState<{ username: string; full_name: string; roles: string[]; password: string }>({ username: "", full_name: "", roles: ["creator"], password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");
  const [roleF, setRoleF] = useState("");
  const [statusF, setStatusF] = useState<SFilter>("all");

  const set = (p: Partial<typeof form>) => setForm((f) => ({ ...f, ...p }));
  const countActive = (role: string) => users.filter((u) => u.is_active && roleList(u.role).includes(role)).length;
  const toggleFormRole = (r: string) => setForm((f) => ({ ...f, roles: f.roles.includes(r) ? f.roles.filter((x) => x !== r) : [...f.roles, r] }));

  const filtered = useMemo(() => {
    const t = search.trim().toLowerCase();
    return users.filter((u) => {
      if (t && !(u.username.toLowerCase().includes(t) || (u.full_name || "").toLowerCase().includes(t))) return false;
      if (roleF && !roleList(u.role).includes(roleF)) return false;
      if (statusF === "active" && !u.is_active) return false;
      if (statusF === "inactive" && u.is_active) return false;
      return true;
    });
  }, [users, search, roleF, statusF]);

  async function add(e: React.FormEvent) {
    e.preventDefault(); setError(""); setMsg(""); setBusy(true);
    const res = await createUser({ ...form, role: form.roles.join(",") }); setBusy(false);
    if (!res.ok) { setError(res.error || "เพิ่มไม่สำเร็จ"); return; }
    setMsg(`เพิ่มผู้ใช้ "${form.username}" แล้ว`);
    setForm({ username: "", full_name: "", roles: ["creator"], password: "" }); router.refresh();
  }
  async function toggleRole(u: UserRow, role: string) {
    const cur = roleList(u.role);
    const next = cur.includes(role) ? cur.filter((r) => r !== role) : [...cur, role];
    const res = await setUserRoles(u.id, next); if (!res.ok) { alert(res.error); return; } router.refresh();
  }
  async function toggle(u: UserRow) {
    const res = await setUserActive(u.id, !u.is_active); if (!res.ok) { alert(res.error); return; } router.refresh();
  }
  async function reset(u: UserRow) {
    const pw = prompt(`ตั้งรหัสผ่านใหม่ให้ "${u.username}" (อย่างน้อย 8 ตัว มีตัวอักษร+ตัวเลข)`);
    if (!pw) return;
    const res = await resetPassword(u.id, pw); if (!res.ok) { alert(res.error); return; }
    alert("เปลี่ยนรหัสผ่านแล้ว");
  }

  return (
    <div className="space-y-5">
      {/* legend: 4 บทบาท */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ROLE_OPTS.map((r) => {
          const Icon = ROLE_META[r].icon;
          return (
            <div key={r} className={`card border p-4 ${ROLE_META[r].ring}`}>
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold ${ROLE_META[r].chip}`}><Icon size={14} /> {ROLE_LABELS[r]}</span>
                <span className="text-lg font-bold text-ink">{countActive(r)}</span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">{ROLE_DESC[r]}</p>
            </div>
          );
        })}
      </div>

      {/* เพิ่มผู้ใช้ */}
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
            <label className="label">บทบาท / สิทธิ์ (เลือกได้หลายอย่าง)</label>
            <div className="flex flex-wrap gap-1.5">
              {ROLE_OPTS.map((r) => {
                const on = form.roles.includes(r);
                return (
                  <button key={r} type="button" onClick={() => toggleFormRole(r)}
                    className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${on ? `${ROLE_META[r].chip} ${ROLE_META[r].ring}` : "border-line bg-white text-muted hover:bg-soft"}`}>
                    {on && <Check size={12} />} {ROLE_LABELS[r]}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-faint">{form.roles.map((r) => ROLE_DESC[r]).join(" · ") || "เลือกอย่างน้อย 1 อย่าง"}</p>
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

      {/* filter */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" placeholder="ค้นหาชื่อผู้ใช้ / ชื่อ-สกุล" />
        </div>
        <select value={roleF} onChange={(e) => setRoleF(e.target.value)} className="input w-40">
          <option value="">บทบาท: ทั้งหมด</option>
          {ROLE_OPTS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <select value={statusF} onChange={(e) => setStatusF(e.target.value as SFilter)} className="input w-32">
          <option value="all">สถานะ: ทั้งหมด</option>
          <option value="active">ใช้งาน</option>
          <option value="inactive">ปิด</option>
        </select>
      </div>

      {/* table */}
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-soft text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3">ชื่อผู้ใช้</th>
                <th className="px-4 py-3">ชื่อ-สกุล</th>
                <th className="px-4 py-3">บทบาท</th>
                <th className="px-4 py-3">สถานะ</th>
                <th className="px-4 py-3">เข้าใช้ล่าสุด</th>
                <th className="px-4 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted">ไม่พบผู้ใช้</td></tr>}
              {filtered.map((u) => (
                <tr key={u.id} className={`border-t border-line ${!u.is_active ? "bg-soft/40" : ""}`}>
                  <td className="px-4 py-3 font-medium text-ink">@{u.username}{u.id === meId && <span className="ml-1 text-xs text-faint">(คุณ)</span>}</td>
                  <td className="px-4 py-3">{u.full_name || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1" title="คลิกเพื่อเปิด/ปิดสิทธิ์ (มีได้หลายอย่าง)">
                      {ROLE_OPTS.map((r) => {
                        const on = roleList(u.role).includes(r);
                        return (
                          <button key={r} type="button" disabled={u.id === meId} onClick={() => toggleRole(u, r)}
                            className={`rounded-md px-2 py-0.5 text-[11px] font-medium disabled:opacity-50 ${on ? ROLE_META[r].chip : "bg-soft text-faint hover:bg-brand-50 hover:text-brand-600"}`}>
                            {ROLE_LABELS[r]}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`chip ${u.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{u.is_active ? "ใช้งาน" : "ปิด"}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{fmtDate(u.last_login_at)}</td>
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
      <p className="flex items-center gap-1 text-xs text-faint"><Users size={12} /> ทั้งหมด {users.length} บัญชี · ใช้งาน {users.filter((u) => u.is_active).length}</p>
    </div>
  );
}
