import NextAuth from "next-auth";
import { authConfig } from "@/server/auth/config";

export default NextAuth(authConfig).auth;

export const config = {
  // Protege todo excepto los assets estáticos y las rutas de auth.
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|icon|manifest|robots).*)",
  ],
};
