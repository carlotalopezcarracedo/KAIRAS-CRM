"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Link2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { KIND_LABELS } from "./attachment-kinds";
import { addExternalLinkAction } from "./actions";
import { cn } from "@/lib/utils";

export function AttachmentUploader({
  entityType,
  entityId,
  revalidatePath,
  maxFileMb,
}: {
  entityType: string;
  entityId: string;
  revalidatePath: string;
  maxFileMb: number;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"file" | "link">("file");
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [, startTransition] = useTransition();
  const kindRef = useRef<HTMLSelectElement>(null);
  const notesRef = useRef<HTMLInputElement>(null);

  async function uploadFile() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Selecciona un archivo primero.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("entityType", entityType);
      formData.set("entityId", entityId);
      formData.set("kind", kindRef.current?.value ?? "other");
      formData.set("notes", notesRef.current?.value ?? "");

      const response = await fetch("/files/upload", {
        method: "POST",
        body: formData,
      });
      const body = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) {
        toast.error(body.error ?? "No se pudo subir el archivo.");
        return;
      }
      toast.success("Archivo subido");
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (notesRef.current) notesRef.current.value = "";
      setFileName(null);
      startTransition(() => router.refresh());
    } catch {
      toast.error("Error de red subiendo el archivo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-line bg-ink/30 p-3.5">
      <div className="mb-3 flex gap-1.5">
        <button
          type="button"
          onClick={() => setMode("file")}
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
            mode === "file"
              ? "bg-violet-soft text-lavender"
              : "text-faint hover:text-foam",
          )}
        >
          <UploadCloud className="h-3.5 w-3.5" />
          Subir archivo
        </button>
        <button
          type="button"
          onClick={() => setMode("link")}
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors",
            mode === "link"
              ? "bg-violet-soft text-lavender"
              : "text-faint hover:text-foam",
          )}
        >
          <Link2 className="h-3.5 w-3.5" />
          Añadir enlace
        </button>
      </div>

      {mode === "file" ? (
        <div className="space-y-3">
          <label
            className={cn(
              "flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-4 text-sm transition-colors hover:border-violet-line",
              fileName ? "text-foam" : "text-faint",
            )}
          >
            <Paperclip className="h-4 w-4 text-lavender" />
            {fileName ?? `Elegir archivo (máx. ${maxFileMb} MB — PDF, imagen, doc, hoja, zip)`}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.svg,.doc,.docx,.odt,.txt,.md,.csv,.xls,.xlsx,.ods,.zip"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select ref={kindRef} defaultValue="other" aria-label="Categoría" className="sm:w-44">
              {Object.entries(KIND_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Input ref={notesRef} placeholder="Nota (opcional)" className="flex-1" />
            <Button size="md" onClick={uploadFile} disabled={uploading}>
              {uploading ? "Subiendo…" : "Subir"}
            </Button>
          </div>
        </div>
      ) : (
        <ExternalLinkForm
          entityType={entityType}
          entityId={entityId}
          revalidatePath={revalidatePath}
        />
      )}
    </div>
  );
}

function ExternalLinkForm({
  entityType,
  entityId,
  revalidatePath,
}: {
  entityType: string;
  entityId: string;
  revalidatePath: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      ref={formRef}
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const formData = new FormData(e.currentTarget);
        const result = await addExternalLinkAction(
          entityType,
          entityId,
          revalidatePath,
          undefined,
          formData,
        );
        setPending(false);
        if (!result.ok) {
          toast.error(result.fieldErrors?.url?.[0] ?? result.error);
        } else {
          toast.success("Enlace guardado");
          formRef.current?.reset();
          router.refresh();
        }
      }}
    >
      <Input name="name" placeholder="Nombre (ej. Propuesta en Drive)" required className="flex-1" />
      <Input name="url" type="url" placeholder="https://…" required className="flex-1" />
      <Select name="kind" defaultValue="other" aria-label="Categoría" className="sm:w-40">
        {Object.entries(KIND_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      <Button type="submit" size="md" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
