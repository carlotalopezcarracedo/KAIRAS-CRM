# Despliegue a producción — KAIRAS OS

> **Proveedor elegido: Supabase (PostgreSQL + Storage) + Vercel.**
> Todos los comandos de esta guía son PowerShell (Windows) y están pensados
> para ejecutarse tal cual. Tiempo estimado: 60–75 min.

## Por qué Supabase (decisión revisada)

La recomendación anterior era Neon. Al añadir **archivos adjuntos** al
producto, la balanza cambia: Supabase resuelve **BD + archivos en un solo
proveedor** sin tocar la arquitectura (Prisma y Auth.js se mantienen; NO se
usa Supabase Auth).

| Criterio | Supabase | Neon + R2/UploadThing |
| --- | --- | --- |
| Herramientas a gestionar | **1** | 2 (BD + storage aparte) |
| Prisma | ✅ pooler PgBouncer + conexión de migraciones | ✅ |
| Auth.js | ✅ (no se toca) | ✅ |
| Archivos | ✅ Storage integrado, bucket privado, URLs firmadas | requiere segundo proveedor |
| Coste inicial | 0 € (free: 500 MB BD + 1 GB storage) | 0 € |
| Backups automáticos BD | ⚠ **solo en plan Pro (~25 $/mes)**; free no tiene | free: restore ~24 h (branching) |
| Lock-in | bajo: Postgres estándar + storage S3-compatible | bajo |

**Riesgo aceptado**: en el free tier de Supabase no hay backups automáticos
de BD. Se mitiga con nuestros **backups propios semanales**
(`npm run data:export`, sin depender de pg_dump) — ver [backups.md](./backups.md).
Si más adelante quieres backups automáticos + PITR, el plan Pro los incluye.

Neon sigue siendo buena opción si algún día se quiere separar; el código no
tiene nada específico de Supabase salvo el driver de storage (adaptador
intercambiable).

## Paso 1 — Crear el proyecto en Supabase

1. supabase.com → New project.
   - Región: **eu-central-1 (Frankfurt)** (o eu-west-3 París).
   - Guarda la contraseña de la BD en tu gestor de contraseñas.
2. Apunta del dashboard (Settings → API):
   - `Project URL` → será `SUPABASE_URL`.
   - `service_role` key (¡secreta, solo servidor!) → `SUPABASE_SERVICE_ROLE_KEY`.

### Connection strings (Settings → Database → Connect)

Supabase da tres formas de conexión. Usamos **dos** (la conexión directa
`db.xxx.supabase.co` es solo IPv6 en free y suele fallar desde redes
domésticas — no la uses):

- **Transaction pooler** (puerto **6543**) → `DATABASE_URL` (runtime).
  Añade `?sslmode=require&pgbouncer=true` (PgBouncer en modo transacción no
  soporta prepared statements; el flag lo desactiva en Prisma).

  > **No pongas `connection_limit=1`.** Con un solo enlace Prisma serializa:
  > el `Promise.all` de 17 consultas del panel deja de ser paralelo y se
  > ejecuta de una en una, sumando 17 viajes de ida y vuelta. El código
  > normaliza el valor a 10 en `src/server/db/prisma.ts`, así que una URL
  > antigua con `connection_limit=1` ya no penaliza; puedes ajustarlo con
  > `DATABASE_CONNECTION_LIMIT`. El pooler está en modo transacción y
  > multiplexa: varios enlaces por instancia son justo su caso de uso.
- **Session pooler** (puerto **5432**, host `...pooler.supabase.com`) →
  `DIRECT_DATABASE_URL` (migraciones), con `?sslmode=require`. Funciona por
  IPv4.

> Si la contraseña de la BD tiene caracteres especiales (`@ : / # ? &`),
> hay que URL-encodearlos dentro de la connection string (`@` → `%40`, etc.).

El schema ya está preparado: `url` usa la pooled y `directUrl` la de
sesión — `prisma migrate deploy` usará automáticamente la correcta.

## Paso 2 — Storage (archivos adjuntos)

1. Dashboard → Storage → **New bucket** → nombre: `kairas-files`.
2. **Public bucket: OFF** (privado). No hace falta crear políticas RLS:
   la app accede solo desde el servidor con la service role key (que se las
   salta) y entrega URLs firmadas de 5 minutos.
3. Límites free: 1 GB total, 50 MB/archivo (la app limita a 4 MB por el
   body de Vercel — `MAX_FILE_MB`).

## Paso 3 — Variables de entorno

### Producción (Vercel → Settings → Environment Variables)

```env
DATABASE_URL=postgresql://postgres.[ref]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
DIRECT_DATABASE_URL=postgresql://postgres.[ref]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require
AUTH_SECRET=            # NUEVO: npx auth secret (no reutilizar el de dev)
AUTH_URL=https://TU-DOMINIO.vercel.app
APP_URL=https://TU-DOMINIO.vercel.app
APP_ENV=production
TZ=Europe/Madrid        # CRÍTICO: Vercel corre en UTC
DEFAULT_TIMEZONE=Europe/Madrid
DEFAULT_CURRENCY=EUR
SUPABASE_URL=https://[ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # NUNCA en el frontend
SUPABASE_STORAGE_BUCKET=kairas-files
MAX_FILE_MB=4
META_API_VERSION=v23.0
ODOO_INTEGRATION_MODE=api
# Vacías hasta tener credenciales:
META_PIXEL_ID=
META_ACCESS_TOKEN=
META_TEST_EVENT_CODE=
ODOO_BASE_URL=https://tu-instancia.odoo.com
ODOO_DB=                 # opcional; nombre de BD, nunca una URL
ODOO_USERNAME=           # usuario bot dedicado (referencia)
ODOO_API_KEY=            # key del bot con permisos solo Read
```

### Local (`.env`) — sin cambios

Sigue apuntando a la BD local (`npm run db:dev`); sin `SUPABASE_*` los
archivos usan el driver local `.uploads/` y el badge LOCAL sigue visible.

## Paso 4 — Migrar schema y datos (PowerShell)

```powershell
# 0. Backup local previo (siempre)
npm run data:export

# 1. Apuntar temporalmente esta terminal a Supabase
$env:DATABASE_URL = "postgresql://...pooler...:6543/postgres?pgbouncer=true&connection_limit=1"
$env:DIRECT_DATABASE_URL = "postgresql://...pooler...:5432/postgres"

# 2. Aplicar el schema
npx prisma migrate deploy

# 3a. Si NO hay datos locales que conservar → seed limpio
$env:SEED_USER_EMAIL = "tu@email.com"
$env:SEED_USER_NAME = "Carlota"
$env:SEED_USER_PASSWORD = "una-contraseña-fuerte"
npx tsx prisma/seed.ts

# 3b. Si SÍ hay datos locales que conservar → import del export del paso 0
#     (el script aborta si la BD destino no está vacía, salvo FORCE_IMPORT=1)
npx tsx scripts/import-data.ts backups/kairas-export-AAAA-MM-DD.json

# 4. Verificar
npx prisma studio   # abre la BD de Supabase: revisa User, Service, Lead…

# 5. Cerrar la terminal (o borrar las variables) para volver a local
```

> **Nota sobre pg_dump**: no hace falta. Los scripts `data:export` /
> `import-data` cubren la migración y los backups sin instalar PostgreSQL
> en Windows. `pg_dump` sigue siendo válido como alternativa si algún día
> instalas las client tools.
>
> **Archivos**: los binarios de `.uploads/` locales no se migran solos.
> Si ya subiste archivos en local, vuelve a subirlos desde la ficha
> correspondiente una vez en producción (la metadata importada los marca
> como pendientes si el storageKey no existe en Supabase).

## Paso 5 — Desplegar en Vercel

1. Repo a GitHub (**privado**) y Add New Project en vercel.com.
2. Pega las variables del Paso 3 y despliega.

> **Región.** `vercel.json` fija `"regions": ["fra1"]` (Frankfurt) porque la
> base está en `aws-0-eu-central-1`. Sin eso Vercel despliega por defecto en
> `iad1` (Washington) y **cada consulta cruza el Atlántico**: unos 90 ms de
> ida y vuelta multiplicados por todas las consultas de la página. Si algún
> día mueves la base de región, mueve también esta.

Errores típicos Prisma/Vercel ya resueltos en el código:

| Problema | Resuelto con |
| --- | --- |
| Client no generado en build | `postinstall` + `build: prisma generate && next build` |
| Binario del engine | `binaryTargets = ["native", "rhel-openssl-3.0.x"]` |
| `UntrustedHost` (Auth.js) | `trustHost: true` + `AUTH_URL` |
| Build toca la BD | `force-dynamic` en el grupo `(app)` |
| Prepared statements + PgBouncer | `pgbouncer=true` en la URL pooled |
| Migraciones vs pooler | `directUrl` en el datasource de Prisma |
| Horas desplazadas (UTC) | `TZ=Europe/Madrid` + agrupación Madrid en código |
| Funciones lejos de la BD | `regions: ["fra1"]` en `vercel.json` |
| `Promise.all` serializado | pool normalizado a 10 en `src/server/db/prisma.ts` |
| Una consulta por relación en `include` | `previewFeatures = ["relationJoins"]` |

## Paso 6 — Checklist post-deploy

- [ ] Login OK en el dominio real; badge **LOCAL no aparece**
- [ ] Crear lead de prueba → dashboard → borrarlo
- [ ] Cronómetro: arrancar, recargar (persiste), parar
- [ ] **Subir un archivo a un cliente y descargarlo** (Storage OK)
- [ ] Cambiar contraseña (Ajustes → Seguridad) y re-entrar
- [ ] Export CSV de tiempo
- [ ] Probar desde el móvil
- [ ] `npm run data:export` contra producción y guardar el JSON fuera
- [ ] `.env` de producción en el gestor de contraseñas

## Rollback

**App**: Vercel → Deployments → anterior → *Promote to Production* (instantáneo).

**BD (migración fallida)**:
```powershell
# Restaurar desde tu último export JSON en una BD limpia:
# 1. Supabase dashboard → SQL Editor:  drop schema public cascade; create schema public;
# 2. $env:DATABASE_URL / DIRECT_DATABASE_URL → Supabase
npx prisma migrate deploy
npx tsx scripts/import-data.ts backups/kairas-export-AAAA-MM-DD.json
```
En plan Pro también hay restore desde backup diario en el dashboard.

**Mientras tanto**: el entorno local sigue operativo como respaldo
(`npm run db:dev` + `npm run dev`).
