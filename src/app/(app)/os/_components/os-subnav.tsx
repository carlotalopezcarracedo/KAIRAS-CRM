"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Search, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { OS_AREAS } from "../_config";

export function OsSubnav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/os" ? pathname === "/os" : pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="space-y-1">
      <p className="k-label px-3 pb-1">KAIRAS OS</p>
      <SubnavLink href="/os" label="Dashboard" active={isActive("/os")}>
        <LayoutDashboard className="h-4 w-4" />
      </SubnavLink>
      <SubnavLink href="/os/buscar" label="Buscar" active={isActive("/os/buscar")}>
        <Search className="h-4 w-4" />
      </SubnavLink>
      <SubnavLink href="/os/favoritos" label="Favoritos" active={isActive("/os/favoritos")}>
        <Star className="h-4 w-4" />
      </SubnavLink>

      <p className="k-label px-3 pb-1 pt-4">Áreas</p>
      {OS_AREAS.map((a) => (
        <SubnavLink key={a.slug} href={`/os/${a.slug}`} label={a.label} active={isActive(`/os/${a.slug}`)}>
          <a.icon className="h-4 w-4" />
        </SubnavLink>
      ))}
    </nav>
  );
}

function SubnavLink({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
        active ? "bg-violet-soft text-lavender" : "text-mist hover:bg-raise hover:text-foam",
      )}
    >
      <span className={active ? "text-lavender" : "text-faint"}>{children}</span>
      {label}
    </Link>
  );
}
