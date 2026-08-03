import { IntentLink as Link } from "@/components/navigation/intent-link";
import { ChevronRight } from "lucide-react";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-faint">
      {items.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          {c.href ? (
            <Link href={c.href} className="hover:text-mist transition-colors">
              {c.label}
            </Link>
          ) : (
            <span className="text-mist">{c.label}</span>
          )}
          {i < items.length - 1 ? <ChevronRight className="h-3 w-3 text-faint/60" /> : null}
        </span>
      ))}
    </nav>
  );
}
