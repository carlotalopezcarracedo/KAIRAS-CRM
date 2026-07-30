"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();
  const prefetch = pathname.startsWith("/os") ? false : null;

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-surface/60 backdrop-blur lg:flex">
      <div className="px-6 pb-6 pt-7">
        <Link href="/dashboard" prefetch={prefetch} className="block">
          <Image
            src="/brand/kairas-logo-horizontal.png"
            alt="KAIRAS"
            width={140}
            height={21}
            priority
            className="h-auto w-32"
          />
          <span className="k-label mt-2 block">os</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="k-label px-3 pb-2">{section.label}</p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      prefetch={prefetch}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-violet-soft text-lavender"
                          : "text-mist hover:bg-raise hover:text-foam",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-4 w-4",
                          active ? "text-lavender" : "text-faint",
                        )}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
