import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center text-center">
          <Image
            src="/brand/kairas-logo-vertical.png"
            alt="KAIRAS"
            width={200}
            height={98}
            priority
            className="h-auto w-44"
          />
          <p className="k-label mt-5">Sistema operativo interno</p>
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
