import { requireUser } from "@/lib/auth/require-user";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    // มือถือ = stack แนวตั้ง (แถบบน + เนื้อหา); เดสก์ท็อป = sidebar ซ้าย + เนื้อหาขวา
    <div className="min-h-screen md:flex">
      <Sidebar user={{ full_name: user.full_name, username: user.username, role: user.role }} />
      <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
