export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export const unauthorized: ActionResult = {
  ok: false,
  error: "No tienes sesión activa. Vuelve a entrar.",
};

export const genericError: ActionResult = {
  ok: false,
  error: "Algo ha fallado. Inténtalo de nuevo.",
};
