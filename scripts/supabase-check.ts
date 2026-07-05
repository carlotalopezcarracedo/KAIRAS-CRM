/**
 * Comprobación y preparación de Supabase SIN imprimir secretos.
 * Ejecutar SIEMPRE con las credenciales de producción cargadas:
 *
 *   npx dotenv -e .env.supabase -- npx tsx scripts/supabase-check.ts
 *   npx dotenv -e .env.supabase -- npx tsx scripts/supabase-check.ts --file-test
 *
 * Hace:
 *  1. Valida presencia/formato de variables (muestra solo prefijo y longitud).
 *  2. Conecta a la BD y cuenta filas de las tablas clave.
 *  3. Verifica el bucket kairas-files (lo CREA en privado si no existe;
 *     avisa si existe pero es público).
 *  4. Con --file-test: sube un dummy, genera URL firmada, descarga,
 *     compara y borra.
 */
import { PrismaClient } from "@prisma/client";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";
const ok = (msg: string) => console.log(`${GREEN}✓${RESET} ${msg}`);
const bad = (msg: string) => console.log(`${RED}✗ ${msg}${RESET}`);
const warn = (msg: string) => console.log(`${YELLOW}⚠ ${msg}${RESET}`);

let failures = 0;

function checkVar(
  name: string,
  validate: (value: string) => string | null,
): string | null {
  const value = process.env[name]?.trim();
  if (!value) {
    bad(`${name}: AUSENTE`);
    failures++;
    return null;
  }
  const problem = validate(value);
  if (problem) {
    bad(`${name}: ${problem}`);
    failures++;
    return null;
  }
  // Nunca imprimir fragmentos de secretos: solo esquema/longitud
  const shape = name.includes("URL")
    ? value.replace(/:\/\/[^@]*@/, "://***@").slice(0, 60) + "…"
    : `${value.length} chars, formato válido`;
  ok(`${name}: presente (${shape})`);
  return value;
}

function authHeaders(key: string): Record<string, string> {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

async function main() {
  const fileTest = process.argv.includes("--file-test");

  console.log("\n— 1. Variables de entorno —");
  const dbUrl = checkVar("DATABASE_URL", (v) => {
    if (v.includes("<<")) return "sigue con el placeholder <<DB_PASSWORD>> sin sustituir";
    if (!v.includes(":6543/")) return "debe usar el Transaction pooler (puerto 6543)";
    if (!v.includes("pgbouncer=true")) return "falta pgbouncer=true";
    if (v.includes("db.") && v.includes(".supabase.co:")) return "no usar la Direct connection";
    return null;
  });
  const directUrl = checkVar("DIRECT_DATABASE_URL", (v) => {
    if (v.includes("<<")) return "sigue con el placeholder <<DB_PASSWORD>> sin sustituir";
    if (!v.includes(":5432/")) return "debe usar el Session pooler (puerto 5432)";
    return null;
  });
  const supabaseUrl = checkVar("SUPABASE_URL", (v) =>
    v.startsWith("https://") && v.includes(".supabase.co") ? null : "formato inesperado",
  );
  const serviceKey = checkVar("SUPABASE_SERVICE_ROLE_KEY", (v) => {
    if (v.includes("<<")) return "sigue con el placeholder <<SB_SECRET_KEY>> sin sustituir";
    if (v.startsWith("sb_publishable_"))
      return "es la clave PÚBLICA (sb_publishable_); necesitas la SECRETA (sb_secret_)";
    if (!v.startsWith("sb_secret_") && !v.startsWith("eyJ"))
      return "formato inesperado (esperado sb_secret_... o eyJ...)";
    return null;
  });
  const bucketName = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "kairas-files";

  if (!dbUrl || !directUrl || !supabaseUrl || !serviceKey) {
    bad("Variables incompletas: corrige .env.supabase y vuelve a ejecutar.");
    process.exit(1);
  }

  console.log("\n— 2. Base de datos —");
  const prisma = new PrismaClient();
  try {
    const [users, clients, leads, tasks, timeEntries, settings, auditLogs, services] =
      await Promise.all([
        prisma.user.count(),
        prisma.client.count(),
        prisma.lead.count(),
        prisma.task.count(),
        prisma.timeEntry.count(),
        prisma.settings.count(),
        prisma.auditLog.count(),
        prisma.service.count(),
      ]);
    ok(
      `Conexión OK · users:${users} clients:${clients} leads:${leads} tasks:${tasks} timeEntries:${timeEntries} services:${services} settings:${settings} auditLogs:${auditLogs}`,
    );
  } catch (err) {
    failures++;
    const msg = err instanceof Error ? err.message.split("\n").slice(-2).join(" ") : String(err);
    if (msg.includes("P1000") || msg.toLowerCase().includes("password")) {
      bad("BD: autenticación fallida — revisa la contraseña en .env.supabase (¿caracteres especiales sin URL-encodear?)");
    } else if (msg.includes("P1001")) {
      bad("BD: no se alcanza el servidor — revisa host/puerto/red");
    } else if (msg.includes("does not exist") || msg.includes("P2021")) {
      warn("BD: conecta pero faltan tablas — ejecuta primero: npx dotenv -e .env.supabase -- npx prisma migrate deploy");
    } else {
      bad(`BD: ${msg.slice(0, 180)}`);
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n— 3. Storage (bucket) —");
  try {
    const base = supabaseUrl.replace(/\/$/, "");
    const listResponse = await fetch(`${base}/storage/v1/bucket`, {
      headers: authHeaders(serviceKey),
    });
    if (!listResponse.ok) {
      failures++;
      bad(
        `Storage: HTTP ${listResponse.status} listando buckets — ${listResponse.status === 401 || listResponse.status === 403 ? "la clave no es válida o no es la secreta" : "error del servicio"}`,
      );
    } else {
      const buckets = (await listResponse.json()) as { name: string; public: boolean }[];
      const bucket = buckets.find((b) => b.name === bucketName);
      if (!bucket) {
        warn(`Bucket "${bucketName}" no existe — creándolo en PRIVADO…`);
        const createResponse = await fetch(`${base}/storage/v1/bucket`, {
          method: "POST",
          headers: { ...authHeaders(serviceKey), "Content-Type": "application/json" },
          body: JSON.stringify({ id: bucketName, name: bucketName, public: false }),
        });
        if (createResponse.ok) ok(`Bucket "${bucketName}" creado (privado)`);
        else {
          failures++;
          bad(`No se pudo crear el bucket: HTTP ${createResponse.status}`);
        }
      } else if (bucket.public) {
        failures++;
        bad(
          `Bucket "${bucketName}" existe pero es PÚBLICO — cámbialo a privado: Dashboard → Storage → ${bucketName} → Edit → Public OFF`,
        );
      } else {
        ok(`Bucket "${bucketName}" existe y es privado`);
      }
    }

    if (fileTest && failures === 0) {
      console.log("\n— 4. Prueba de archivo (subir → firmar → descargar → borrar) —");
      const key = `smoke/verify-${Date.now()}.txt`;
      const content = `kairas-verify ${new Date().toISOString()}`;
      const up = await fetch(`${base}/storage/v1/object/${bucketName}/${key}`, {
        method: "POST",
        headers: { ...authHeaders(serviceKey), "Content-Type": "text/plain" },
        body: content,
      });
      if (!up.ok) throw new Error(`subida HTTP ${up.status}`);
      const sign = await fetch(`${base}/storage/v1/object/sign/${bucketName}/${key}`, {
        method: "POST",
        headers: { ...authHeaders(serviceKey), "Content-Type": "application/json" },
        body: JSON.stringify({ expiresIn: 120 }),
      });
      if (!sign.ok) throw new Error(`firma HTTP ${sign.status}`);
      const { signedURL } = (await sign.json()) as { signedURL: string };
      const download = await fetch(`${base}/storage/v1${signedURL}`);
      const downloaded = await download.text();
      if (downloaded !== content) throw new Error("el contenido descargado no coincide");
      await fetch(`${base}/storage/v1/object/${bucketName}/${key}`, {
        method: "DELETE",
        headers: authHeaders(serviceKey),
      });
      ok("Ciclo completo de archivo OK (URL firmada incluida) y dummy borrado");
    }
  } catch (err) {
    failures++;
    bad(`Storage: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log("");
  if (failures > 0) {
    bad(`${failures} problema(s). Corrige y vuelve a ejecutar.`);
    process.exit(1);
  }
  ok("Supabase verificado. Siguiente paso: migrate deploy / import.");
}

main();
