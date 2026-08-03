"use client";

import { useLinkStatus } from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { IntentLink } from "@/components/navigation/intent-link";
import { NAV_SECTIONS } from "./nav-items";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-surface/60 backdrop-blur lg:flex">
      <div className="px-6 pb-6 pt-7">
        <IntentLink href="/dashboard" className="block">
          <Image
            src="/brand/kairas-logo-horizontal.png"
            alt="KAIRAS"
            width={140}
            height={21}
            priority
            className="h-auto w-32"
          />
          <span className="k-label mt-2 block">os</span>
        </IntentLink>
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
                    <IntentLink
                      href={item.href}
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
                      <NavLinkPending />
                    </IntentLink>
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

function NavLinkPending() {
  const { pending } = useLinkStatus();
  return (
    <span
      className={cn(
        "ml-auto grid h-4 w-4 place-items-center transition-opacity",
        pending ? "animate-spin opacity-100" : "opacity-0",
      )}
      aria-hidden
    >
      <LoaderCircle className="h-3.5 w-3.5" />
    </span>
  );
}
