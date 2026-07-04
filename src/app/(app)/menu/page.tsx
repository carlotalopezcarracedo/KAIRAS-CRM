import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { NAV_SECTIONS } from "@/components/shell/nav-items";

export const metadata: Metadata = { title: "Menú" };

export default function MenuPage() {
  return (
    <div>
      <PageHeader title="Menú" subtitle="Todos los módulos de KAIRAS OS" />
      <div className="space-y-8">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="k-label mb-3">{section.label}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-card border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-raise"
                >
                  <item.icon className="h-5 w-5 text-lavender" />
                  <span className="text-sm font-semibold text-foam">
                    {item.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
