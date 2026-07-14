import Link from "next/link";
import { Search } from "lucide-react";
import { OsSubnav } from "./_components/os-subnav";

// Hereda la sesión del layout (app): aquí no se re-verifica auth.
export default function OsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:grid lg:grid-cols-[15rem_1fr] lg:gap-8">
      <aside className="mb-6 lg:mb-0">
        {/* Buscador rápido del módulo */}
        <form action="/os/buscar" className="mb-4 hidden lg:block">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              name="q"
              placeholder="Buscar en KAIRAS OS…"
              className="h-9 w-full rounded-xl border border-line bg-ink pl-9 pr-3 text-sm text-foam placeholder:text-faint focus:border-violet-line transition-colors"
            />
          </div>
        </form>
        <div className="rounded-card border border-line bg-surface/50 p-2 lg:sticky lg:top-6">
          <OsSubnav />
        </div>
        <p className="mt-3 px-3 text-[11px] leading-relaxed text-faint">
          El cerebro de KAIRAS.{" "}
          <Link href="/dashboard" className="underline hover:text-mist">
            Volver al CRM
          </Link>
        </p>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
