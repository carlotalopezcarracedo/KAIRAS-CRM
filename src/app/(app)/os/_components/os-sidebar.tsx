"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Star, ArrowLeft, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { OS_SECTIONS, type SectionSlug } from "../_sections";

export function OsSidebar({ counts }: { counts?: Record<string, number> }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/os" ? pathname === "/os" : pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="flex h-full flex-col gap-1 p-3">
      <Link href="/os" className="mb-3 flex items-center gap-2.5 px-2 py-1">
        <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-violet to-[#5b34c9] text-white">
          <Brain className="h-4 w-4" />
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-extrabold tracking-tight text-foam">KAIRAS OS</span>
          <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-faint">Conocimiento</span>
        </span>
      </Link>

      <SideLink href="/os" label="Inicio" active={isActive("/os")} icon={<LayoutDashboard className="h-4 w-4" />} />

      <p className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-faint">Áreas</p>
      {OS_SECTIONS.map((s) => (
        <SideLink
          key={s.slug}
          href={`/os/${s.slug}`}
          label={s.label}
          active={isActive(`/os/${s.slug}`)}
          icon={<s.icon className="h-4 w-4" />}
          count={counts?.[s.slug]}
        />
      ))}

      <div className="my-2.5 h-px bg-line" />
      <SideLink href="/os/favoritos" label="Favoritos" active={isActive("/os/favoritos")} icon={<Star className="h-4 w-4" />} />

      <Link
        href="/dashboard"
        className="mt-auto flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-faint transition-colors hover:bg-raise hover:text-mist"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Volver al CRM
      </Link>
    </nav>
  );
}

export function OsMobileNav() {
  const pathname = usePathname();
  const items = [
    { href: "/os", label: "Inicio" },
    ...OS_SECTIONS.map((section) => ({
      href: `/os/${section.slug}`,
      label: section.label,
    })),
  ];

  return (
    <nav
      aria-label="Secciones de KAIRAS OS"
      className="overflow-x-auto border-b border-line bg-ink/70 px-4 py-2 lg:hidden"
    >
      <ul className="flex min-w-max gap-1">
        {items.map((item) => {
          const active =
            item.href === "/os"
              ? pathname === "/os"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "block rounded-full px-3 py-1.5 text-xs font-semibold",
                  active ? "bg-violet-soft text-lavender" : "text-faint hover:text-foam",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SideLink({
  href,
  label,
  active,
  icon,
  count,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-[10px] px-2.5 py-2 text-[13.5px] transition-colors",
        active ? "bg-violet-soft text-lavender" : "text-mist hover:bg-raise hover:text-foam",
      )}
    >
      <span className={active ? "text-lavender" : "text-faint"}>{icon}</span>
      {label}
      {typeof count === "number" ? (
        <span className="ml-auto text-[11px] tabular-nums text-faint">{count}</span>
      ) : null}
    </Link>
  );
}

export type { SectionSlug };
