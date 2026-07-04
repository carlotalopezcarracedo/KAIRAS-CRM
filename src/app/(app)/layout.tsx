import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { MobileNav } from "@/components/shell/mobile-nav";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="min-h-dvh">
      <Sidebar />
      <div className="lg:pl-60">
        <Topbar />
        <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:pb-10">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
