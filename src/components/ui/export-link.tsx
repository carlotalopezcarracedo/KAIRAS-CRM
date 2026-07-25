import { Download } from "lucide-react";

/** Enlace de descarga CSV con estética de botón secundario KAIRAS. */
export function ExportLink({
  href,
  label = "Exportar CSV",
}: {
  href: string;
  label?: string;
}) {
  return (
    <a
      href={href}
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-xs font-semibold text-mist transition-colors hover:border-line-strong hover:text-foam"
      title="Descargar en CSV (respeta los filtros activos)"
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}
