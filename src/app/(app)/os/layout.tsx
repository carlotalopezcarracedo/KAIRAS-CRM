import { OsSidebar } from "./_components/os-sidebar";
import { QuickSearch } from "./_components/quick-search";
import { OS_SECTIONS } from "./_sections";
import { getSectionCounts } from "@/server/services/os/os-views-service";
import { requireUser } from "@/server/auth";
import styles from "./_components/os.module.css";

// Hereda la sesión del layout (app). Shell propio del módulo, como una "app"
// dentro del área de contenido del CRM. No toca el CRM.
export default async function OsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const { areaMap, typeMap } = await getSectionCounts();
  const counts: Record<string, number> = {};
  for (const s of OS_SECTIONS) {
    let n = 0;
    if (s.areas) for (const a of s.areas) n += areaMap.get(a) ?? 0;
    if (s.types) for (const t of s.types) n += typeMap.get(t) ?? 0;
    counts[s.slug] = n;
  }
  const initial = (user.email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-ink shadow-[0_40px_90px_-60px_rgba(0,0,0,0.9)]">
      <div className="grid grid-cols-1 items-start lg:grid-cols-[236px_1fr]">
        <aside className="hidden self-stretch border-r border-line bg-ink/50 lg:block">
          <div className="lg:sticky lg:top-4">
            <OsSidebar counts={counts} />
          </div>
        </aside>
        <div className="min-w-0">
          <header className={`flex items-center gap-3 border-b border-line px-5 py-3 ${styles.glass}`}>
            <QuickSearch variant="bar" />
            <span className="ml-auto grid h-8 w-8 place-items-center rounded-full border border-line-strong bg-raise text-xs font-bold text-lavender">
              {initial}
            </span>
          </header>
          <main className="min-h-[70vh] px-5 py-6 sm:px-7">{children}</main>
        </div>
      </div>
    </div>
  );
}
