import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="text-3xl font-extrabold tracking-[0.35em] text-foam">
            KAIRAS
          </p>
          <p className="k-label mt-3">Sistema operativo interno</p>
        </div>
        <div className="rounded-card border border-line bg-surface p-7">
          <LoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-faint">
          Acceso privado. Solo para KAIRAS.
        </p>
      </div>
    </main>
  );
}
