"use client";

import { useTransition, useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleFavoriteAction } from "../actions";

export function FavoriteButton({ entryId, initial }: { entryId: string; initial: boolean }) {
  const [fav, setFav] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          setFav((v) => !v);
          const r = await toggleFavoriteAction(entryId);
          if (!r.ok) setFav((v) => !v); // revertir si falla
        })
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50",
        fav
          ? "border-violet-line bg-violet-soft text-lavender"
          : "border-line bg-surface text-mist hover:text-foam",
      )}
      aria-pressed={fav}
    >
      <Star className={cn("h-3.5 w-3.5", fav && "fill-current")} />
      {fav ? "Favorito" : "Guardar"}
    </button>
  );
}
