"use client";

import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { IntentLink } from "@/components/navigation/intent-link";
import { MOBILE_NAV } from "./nav-items";

const PRIORITY_MOBILE_ROUTES = new Set(["/dashboard", "/tasks"]);

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 backdrop-blur pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="flex items-stretch justify-around">
        {MOBILE_NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <li key={item.href} className="flex-1">
              <IntentLink
                href={item.href}
                priorityPrefetch={
                  PRIORITY_MOBILE_ROUTES.has(item.href) && !active
                }
                className={cn(
                  "relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                  active ? "text-lavender" : "text-faint hover:text-mist",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
                <MobileLinkPending />
              </IntentLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function MobileLinkPending() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn(
        "absolute right-2 top-2 transition-opacity",
        pending ? "animate-spin opacity-100" : "opacity-0",
      )}
    >
      <LoaderCircle className="h-3 w-3" />
    </span>
  );
}
