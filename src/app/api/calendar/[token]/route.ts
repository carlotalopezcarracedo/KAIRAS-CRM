import { NextResponse } from "next/server";
import {
  getCalendarFeedToken,
  tokenMatches,
  buildCalendarFeed,
} from "@/server/services/calendar-feed-service";

/**
 * Feed iCalendar suscribible.
 *
 * Se sirve SIN sesión a propósito: quien lo pide es el calendario del iPhone
 * o Google, no un navegador con cookies. La protección es el token de la URL,
 * que se compara en tiempo constante y se puede regenerar desde Ajustes.
 *
 * Está excluido del middleware de autenticación en `src/middleware.ts`.
 */

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  // Un .ics al final hace que iOS y Google reconozcan el tipo por la URL.
  const provided = token.replace(/\.ics$/i, "");
  const expected = await getCalendarFeedToken();

  if (!tokenMatches(provided, expected)) {
    // Mismo mensaje tanto si el feed está apagado como si el token es falso:
    // no conviene confirmar que existe.
    return new NextResponse("No encontrado", { status: 404 });
  }

  const appUrl = process.env.APP_URL ?? "https://kairas";
  const body = await buildCalendarFeed(appUrl);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="kairas.ics"',
      // Sin caché intermedia: la agenda cambia y el token es un secreto.
      "Cache-Control": "no-store, private",
    },
  });
}
