"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

export default function ShopeeFilters({ q, month, months }: { q?: string; month?: string; months: string[] }) {
  const router = useRouter();
  const [search, setSearch] = useState(q ?? "");

  function go(nextQ: string, nextMonth: string) {
    const sp = new URLSearchParams();
    if (nextQ) sp.set("q", nextQ);
    if (nextMonth) sp.set("month", nextMonth);
    const s = sp.toString();
    router.push(`/shopee${s ? "?" + s : ""}`);
  }

  return (
    <form
      className="mb-4 flex flex-wrap gap-2"
      onSubmit={(e) => { e.preventDefault(); go(search, month ?? ""); }}
    >
      <div className="relative flex-1 min-w-[220px]">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input
          className="input pl-9"
          placeholder="ค้นหา Order No. / เลขที่ / ผู้รับ / ผู้ใช้ / จังหวัด"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <select
        className="input w-auto"
        value={month ?? ""}
        onChange={(e) => go(search, e.target.value)}   // เลือกเดือน → กรองทันที
      >
        <option value="">ทุกเดือน</option>
        {months.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      <button className="btn-ghost">ค้นหา</button>
    </form>
  );
}
