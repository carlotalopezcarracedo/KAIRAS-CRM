"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, Input } from "@/components/ui/field";
import { OS_RELATION_LABEL } from "../_config";
import { OS_RELATION_TYPES } from "@/server/validators/os/knowledge";
import { addRelationAction, removeRelationAction } from "../actions";

export type RelationRow = {
  id: string;
  type: string;
  otherId: string;
  otherArea: string;
  otherTitle: string;
};

export type EntryOption = { id: string; title: string; area: string };

export function RelationEditor({
  entryId,
  relations,
  options,
}: {
  entryId: string;
  relations: RelationRow[];
  options: EntryOption[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [toId, setToId] = useState("");
  const [type, setType] = useState<string>("relacionado");
  const [note, setNote] = useState("");

  const add = () => {
    if (!toId) {
      toast.error("Elige una entrada de destino.");
      return;
    }
    start(async () => {
      const fd = new FormData();
      fd.set("fromId", entryId);
      fd.set("toId", toId);
      fd.set("type", type);
      if (note.trim()) fd.set("note", note.trim());
      const r = await addRelationAction(fd);
      if (r.ok) {
        toast.success("Relación añadida");
        setOpen(false);
        setToId("");
        setNote("");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  };

  const remove = (id: string) => {
    if (!confirm("¿Quitar esta relación? La entrada no se borra.")) return;
    start(async () => {
      const r = await removeRelationAction(id);
      if (r.ok) {
        toast.success("Relación eliminada");
        router.refresh();
      } else {
        toast.error(r.error);
      }
    });
  };

  return (
    <div>
      {relations.length > 0 ? (
        <ul className="space-y-2">
          {relations.map((r) => (
            <li key={r.id} className="flex items-center gap-2 text-sm">
              <span className="text-faint">{OS_RELATION_LABEL[r.type] ?? r.type}</span>
              <Link href={`/os/${r.otherArea}/${r.otherId}`} className="text-lavender hover:underline">
                {r.otherTitle}
              </Link>
              <button
                type="button"
                onClick={() => remove(r.id)}
                disabled={pending}
                aria-label="Quitar relación"
                className="ml-auto rounded p-1 text-faint hover:bg-raise hover:text-danger disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-faint">Sin relaciones todavía.</p>
      )}

      {open ? (
        <div className="mt-4 space-y-3 rounded-xl border border-line bg-ink/40 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="Tipo de relación">
              {OS_RELATION_TYPES.map((t) => (
                <option key={t} value={t}>{OS_RELATION_LABEL[t] ?? t}</option>
              ))}
            </Select>
            <Select value={toId} onChange={(e) => setToId(e.target.value)} aria-label="Entrada de destino">
              <option value="">Elige una entrada…</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>{o.title}</option>
              ))}
            </Select>
          </div>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota (opcional)" />
          <div className="flex gap-2">
            <Button size="sm" onClick={add} disabled={pending}>
              {pending ? "Añadiendo…" : "Añadir relación"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="secondary" className="mt-3" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Añadir relación
        </Button>
      )}
    </div>
  );
}
