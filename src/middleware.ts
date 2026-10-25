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
  //
  // `api/cron` también va fuera: lo llama el GitHub Action sin sesión y su
  // protección es el Bearer CRON_SECRET. Pasando por el guard recibía un 307
  // al login (que curl sin -L da por bueno), así que los recordatorios nunca
  // se disparaban.
  //
  // `sw.js` va fuera porque el navegador exige que el service worker se sirva
  // sin redirecciones; con el guard, el registro fallaba y no había push.
  matcher: [
    "/((?!api/auth|api/calendar|api/webhooks|api/cron|_next/static|_next/image|brand/|favicon|apple-icon|icon|manifest|sw\\.js|robots).*)",
  ],
};
