"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/server/auth";

export async function authenticate(
  _prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Credenciales incorrectas. Revisa el email y la contraseña.";
    }
    throw error; // NEXT_REDIRECT en caso de éxito
  }
}
