import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { cache } from "react";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { authConfig } from "./config";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase().trim() },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});

/**
 * Una sola resolución de sesión por render RSC. Layout y página suelen pedir
 * la misma sesión; `cache` evita repetir la validación durante la navegación.
 */
export const getSession = cache(async () => auth());

/**
 * Devuelve la usuaria autenticada o lanza. Usar en TODOS los server
 * actions y servicios que toquen datos.
 */
export async function requireUser() {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  return { id: session.user.id, email: session.user.email ?? "" };
}
