"use client";

import { useActionState } from "react";
import { authenticate } from "./actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function LoginForm() {
  const [error, formAction, pending] = useActionState(authenticate, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <Field label="Email" required>
        <Input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          required
        />
      </Field>
      <Field label="Contraseña" required>
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </Field>
      {error ? (
        <p className="rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
