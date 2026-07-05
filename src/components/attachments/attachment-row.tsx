"use client";

import { useState, useTransition } from "react";
import {
  FileText,
  Image as ImageIcon,
  Table2,
  Archive,
  Link2,
  File,
  Trash2,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { formatBytes, formatDate, cn } from "@/lib/utils";
import { KIND_LABELS } from "./attachment-kinds";
import { deleteAttachmentAction } from "./actions";

export type AttachmentData = {
  id: string;
  name: string;
  kind: string;
  mimeType: string | null;
  sizeBytes: number | null;
  notes: string | null;
  createdAt: string;
  uploadedByName: string | null;
  isExternal: boolean;
};

function fileIcon(attachment: AttachmentData) {
  const className = "h-4 w-4 shrink-0 text-lavender";
  if (attachment.isExternal) return <Link2 className={className} />;
  const mime = attachment.mimeType ?? "";
  if (mime.startsWith("image/")) return <ImageIcon className={className} />;
  if (mime === "application/pdf") return <FileText className={className} />;
  if (mime.includes("spreadsheet") || mime.includes("csv") || mime.includes("excel"))
    return <Table2 className={className} />;
  if (mime.includes("zip")) return <Archive className={className} />;
  if (mime.includes("word") || mime.includes("document") || mime.startsWith("text/"))
    return <FileText className={className} />;
  return <File className={className} />;
}

export function AttachmentRow({ attachment }: { attachment: AttachmentData }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [deleted, setDeleted] = useState(false);

  if (deleted) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-ink/40 px-3.5 py-2.5">
      {fileIcon(attachment)}
      <div className="min-w-0 flex-1">
        <a
          href={`/files/${attachment.id}/download`}
          target={attachment.isExternal ? "_blank" : undefined}
          rel={attachment.isExternal ? "noopener noreferrer" : undefined}
          className="block truncate text-sm font-medium text-foam hover:text-lavender"
          title={attachment.notes ?? attachment.name}
        >
          {attachment.name}
        </a>
        <p className="truncate text-xs text-faint">
          {formatDate(attachment.createdAt)}
          {attachment.sizeBytes ? ` · ${formatBytes(attachment.sizeBytes)}` : ""}
          {attachment.uploadedByName ? ` · ${attachment.uploadedByName}` : ""}
          {attachment.notes ? ` · ${attachment.notes}` : ""}
        </p>
      </div>
      <Badge tone={attachment.kind === "other" ? "neutral" : "violet"}>
        {KIND_LABELS[attachment.kind] ?? attachment.kind}
      </Badge>
      <a
        href={`/files/${attachment.id}/download`}
        title="Descargar"
        className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-faint transition-colors hover:bg-raise hover:text-foam sm:flex"
      >
        <Download className="h-4 w-4" />
      </a>
      <button
        type="button"
        disabled={pending}
        title={confirming ? "Confirmar borrado" : "Eliminar"}
        onClick={() => {
          if (!confirming) {
            setConfirming(true);
            setTimeout(() => setConfirming(false), 3500);
            return;
          }
          startTransition(async () => {
            const result = await deleteAttachmentAction(
              attachment.id,
              window.location.pathname,
            );
            if (!result.ok) toast.error(result.error);
            else {
              setDeleted(true);
              toast.success("Archivo eliminado");
            }
          });
        }}
        className={cn(
          "flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors",
          confirming
            ? "w-auto bg-danger-soft px-3 text-xs font-bold text-danger"
            : "w-8 text-faint hover:bg-raise hover:text-danger",
        )}
      >
        {confirming ? (pending ? "…" : "¿Seguro?") : <Trash2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
