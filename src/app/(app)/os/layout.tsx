import { OsMobileNav, OsSidebar } from "./_components/os-sidebar";
import { QuickSearch } from "./_components/quick-search";
import styles from "./_components/os.module.css";

// El layout es deliberadamente puro: no consulta sesión ni base de datos.
// Así el shell de Conocimiento puede aparecer antes que cualquier lectura.
export default function OsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-ink shadow-[0_40px_90px_-60px_rgba(0,0,0,0.9)]">
      <div className="grid grid-cols-1 items-start lg:grid-cols-[236px_1fr]">
        <aside className="hidden self-stretch border-r border-line bg-ink/50 lg:block">
          <div className="lg:sticky lg:top-4">
            <OsSidebar />
          </div>
        </aside>
        <div className="min-w-0">
          <header className={`flex items-center gap-3 border-b border-line px-5 py-3 ${styles.glass}`}>
            <QuickSearch variant="bar" />
            <span className="ml-auto hidden text-[10px] font-bold uppercase tracking-[0.14em] text-faint sm:block">
              Conocimiento operativo
            </span>
          </header>
          <OsMobileNav />
          <main className="min-h-[70vh] px-5 py-6 sm:px-7">{children}</main>
        </div>
      </div>
    </div>
  );
}
