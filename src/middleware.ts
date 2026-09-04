import NextAuth from "next-auth";
import { authConfig } from "@/server/auth/config";

export default NextAuth(authConfig).auth;

export const config = {
  // Protege todo excepto los assets estáticos, las rutas de auth, el feed
  // de calendario y los webhooks entrantes.
  //
  // `api/calendar` va fuera a propósito: lo pide el calendario del iPhone o
  // Google, sin cookies. Si pasara por aquí recibiría una redirección al
  // login en vez del .ics. Su protección es el token secreto de la URL, que
  // la propia ruta valida en tiempo constante.
  //
  // `api/webhooks` va fuera por el mismo motivo: Toggl (u otro proveedor)
  // llama sin sesión. Sin esta exclusión, el guard de NextAuth redirige la
  // entrega a /login antes de que la ruta pueda verificar la firma HMAC, y
  // el webhook no funciona nunca. La autenticación de esa ruta es la firma,
  // no la cookie de sesión.
  matcher: [
    "/((?!api/auth|api/calendar|api/webhooks|_next/static|_next/image|brand/|favicon.ico|icon|manifest|robots).*)",
  ],
};
