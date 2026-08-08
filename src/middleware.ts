import NextAuth from "next-auth";
import { authConfig } from "@/server/auth/config";

export default NextAuth(authConfig).auth;

export const config = {
  // Protege todo excepto los assets estáticos, las rutas de auth y el feed
  // de calendario.
  //
  // `api/calendar` va fuera a propósito: lo pide el calendario del iPhone o
  // Google, sin cookies. Si pasara por aquí recibiría una redirección al
  // login en vez del .ics. Su protección es el token secreto de la URL, que
  // la propia ruta valida en tiempo constante.
  matcher: [
    "/((?!api/auth|api/calendar|_next/static|_next/image|brand/|favicon.ico|icon|manifest|robots).*)",
  ],
};
