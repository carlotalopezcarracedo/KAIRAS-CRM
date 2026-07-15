"use client";

import { useEffect } from "react";
import { recordViewAction } from "../actions";

/** Registra un acceso a la entrada (best-effort) al montar el detalle. */
export function ViewRecorder({ entryId }: { entryId: string }) {
  useEffect(() => {
    recordViewAction(entryId);
  }, [entryId]);
  return null;
}
