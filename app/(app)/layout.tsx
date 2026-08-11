import { requireUser } from "@/lib/auth/require-user";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-screen">
      <Sidebar user={{ full_name: user.full_name, username: user.username, role: user.role }} />
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
