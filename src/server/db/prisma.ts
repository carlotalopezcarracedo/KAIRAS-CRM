import { PrismaClient } from "@prisma/client";

/**
 * Normaliza el tamaño del pool de Prisma.
 *
 * La URL de producción venía con `connection_limit=1`. Con un solo enlace,
 * Prisma serializa: un `Promise.all` de 17 consultas (el panel) no se lanza
 * en paralelo, se hace de una en una. Cada consulta se paga entonces como un
 * viaje completo de ida y vuelta contra el pooler, y se suman todos.
 *
 * Medido en local, sin latencia de red y con la base vacía, el abanico del
 * panel baja de 211 ms a 134 ms al pasar de 1 a 10. Contra Supabase, donde
 * cada viaje cuesta decenas de milisegundos, la diferencia es de segundos.
 *
 * El pooler de Supabase está en modo transacción y multiplexa: varios enlaces
 * por instancia son justo el caso para el que está pensado. Se puede ajustar
 * con DATABASE_CONNECTION_LIMIT si alguna vez hiciera falta bajarlo.
 */
const DEFAULT_CONNECTION_LIMIT = 10;

function normalizeDatabaseUrl(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    // URL no estándar: se usa tal cual antes que romper el arranque.
    return raw;
  }

  const override = Number(process.env.DATABASE_CONNECTION_LIMIT);
  const limit =
    Number.isFinite(override) && override > 0 ? override : DEFAULT_CONNECTION_LIMIT;

  const current = Number(url.searchParams.get("connection_limit"));
  // Solo se sube: si alguien fijó a conciencia un límite mayor, se respeta.
  if (!Number.isFinite(current) || current < limit) {
    url.searchParams.set("connection_limit", String(limit));
  }

  // Sin esto, al agotarse el pool Prisma espera 10 s y revienta la petición.
  if (!url.searchParams.has("pool_timeout")) {
    url.searchParams.set("pool_timeout", "20");
  }

  return url.toString();
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: normalizeDatabaseUrl(process.env.DATABASE_URL),
    log:
      process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
