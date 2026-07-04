# Despliegue a producción — KAIRAS OS

> Objetivo: pasar de PGlite local (frágil, sin backups, atado a un PC) a
> **Neon + Vercel**. Tiempo estimado: 45–60 min siguiendo esta guía.

## Recomendación: Neon (sobre Supabase)

**Elegida: Neon.** Para este caso concreto — una usuaria, Next.js en Vercel,
solo necesitamos PostgreSQL (la auth es Auth.js, no del proveedor):

**Por qué Neon**

- Es *solo* Postgres, que es exactamente lo que usamos. Supabase añade
  Auth/Storage/Realtime que no necesitamos y que añaden superficie y consola.
- **Scale-to-zero**: con una usuaria, la BD duerme cuando no se usa y el
  plan gratuito sobra durante mucho tiempo.
- **Branching**: puedes crear una rama de la BD para probar una migración
  arriesgada y tirarla después — encaja con nuestro flujo `db:diff`/`db:deploy`.
- Pooler PgBouncer integrado en la URL `-pooler` (nuestra app ya usa
  `pgbouncer=true`).

**Riesgos de Neon (reales)**

- *Cold start* tras suspensión: la primera consulta puede tardar ~0,5–1 s.
  Aceptable para uso interno; en plan de pago se puede desactivar.
- Restore point-in-time en free limitado (~24 h de historial): por eso
  mantenemos `pg_dump` semanal propio (ver backups.md).

**Coste inicial**: 0 €. Free tier: ~0,5 GB de datos (KAIRAS OS tardará años
en llenarlo con uso normal). Siguiente escalón (~19 $/mes) solo si algún día
hace falta más historial o sin cold starts.

**Cuándo preferir Supabase**: si en Fase 2 quieres adjuntar archivos
(contratos, propuestas PDF) usando Supabase Storage en el mismo proveedor.
Con Neon, los archivos irían a Cloudflare R2/UploadThing. No bloquea nada hoy.

## Paso 1 — Crear la BD en Neon

1. neon.tech → New Project → región **AWS eu-central-1 (Frankfurt)**.
2. Copia **dos** connection strings del dashboard:
   - **Pooled** (host con `-pooler`): para la app.
   - **Direct** (sin `-pooler`): para migraciones.

## Paso 2 — Variables de entorno

### Producción (Vercel → Settings → Environment Variables)

```env
DATABASE_URL=postgres://...-pooler.../neondb?sslmode=require&pgbouncer=true&connection_limit=10
AUTH_SECRET=            # NUEVO, no el de dev → npx auth secret
AUTH_URL=https://TU-DOMINIO.vercel.app
APP_URL=https://TU-DOMINIO.vercel.app
APP_ENV=production      # oculta el badge LOCAL
TZ=Europe/Madrid        # CRÍTICO: Vercel corre en UTC; sin esto, las horas
                        # de los formularios se desplazan 1-2 h
DEFAULT_TIMEZONE=Europe/Madrid
DEFAULT_CURRENCY=EUR
META_API_VERSION=v23.0
ODOO_INTEGRATION_MODE=csv
# Vacías hasta tener credenciales (los módulos quedan en modo registro):
META_PIXEL_ID=
META_ACCESS_TOKEN=
META_TEST_EVENT_CODE=
ODOO_BASE_URL=
ODOO_DB=
ODOO_USERNAME=
ODOO_API_KEY=
```

> `SEED_USER_*` **no** hace falta en Vercel: el seed se ejecuta desde tu
> máquina (paso 3).

### En tu máquina (solo para migrar/seed, temporalmente)

```powershell
$env:DATABASE_URL = "postgres://...DIRECT (sin -pooler).../neondb?sslmode=require"
```

## Paso 3 — Migrar schema y datos

```bash
# 1. Aplicar el schema a Neon (usa la URL DIRECTA)
npx prisma migrate deploy

# 2a. Si AÚN NO tienes datos reales en local que conservar:
npx tsx prisma/seed.ts        # (con SEED_USER_* definidos en el entorno)

# 2b. Si SÍ tienes datos locales que conservar:
#    (npm run db:dev corriendo en otra terminal)
pg_dump "postgres://postgres:postgres@localhost:51214/kairas?sslmode=disable" \
  --format=custom --file=kairas-local.dump
pg_restore --data-only --disable-triggers \
  --dbname "$env:DATABASE_URL" kairas-local.dump

# 3. Verificar
npx prisma db execute --stdin <<< 'SELECT count(*) FROM "User";'
```

> Sin `pg_dump` en Windows: `winget install PostgreSQL.PostgreSQL` (solo
> client tools) o exporta tabla a tabla desde `npm run db:studio`.

## Paso 4 — Desplegar en Vercel

1. Sube el repo a GitHub (**privado**).
2. vercel.com → Add New Project → importa el repo. Framework: Next.js
   (autodetectado). No hace falta `vercel.json`.
3. Pega las variables del Paso 2 y despliega.

El proyecto ya está preparado para los errores típicos Prisma/Vercel:

| Problema típico | Ya resuelto con |
| --- | --- |
| `PrismaClient not generated` (caché de node_modules) | `postinstall: prisma generate` + `build: prisma generate && next build` |
| Binario del engine incorrecto en runtime | `binaryTargets = ["native", "rhel-openssl-3.0.x"]` en el schema |
| `UntrustedHost` de Auth.js | `trustHost: true` + `AUTH_URL` |
| Build intenta conectar a la BD | `force-dynamic` en todo el grupo `(app)` |
| Prepared statements con PgBouncer | `pgbouncer=true` en la URL |
| Horas desplazadas (servidor UTC) | `TZ=Europe/Madrid` + agrupación por día en Europe/Madrid en el código |

## Paso 5 — Checklist post-deploy

- [ ] Login funciona en el dominio de producción
- [ ] Badge **LOCAL no aparece** (APP_ENV=production)
- [ ] Crear un lead de prueba → verlo en dashboard → borrarlo (soft delete)
- [ ] Arrancar/parar cronómetro y recargar (persiste)
- [ ] Cambiar la contraseña desde Ajustes → Seguridad y re-entrar
- [ ] Export CSV de tiempo descarga bien
- [ ] Probar desde el móvil: vista Hoy, crear lead, timer
- [ ] Hacer el primer `pg_dump` de producción y guardarlo fuera de Neon
- [ ] Copiar el `.env` de producción al gestor de contraseñas

## Rollback básico

**Si el deploy sale mal (app):**
- Vercel → Deployments → deployment anterior → *Promote to Production*.
  (Instantáneo; la BD no se toca.)

**Si una migración sale mal (BD):**
1. No ejecutes más migraciones.
2. Neon → Branches → *Restore* / crea una rama desde un punto anterior al
   fallo (free: ~24 h de historial) y apunta `DATABASE_URL` a esa rama.
3. Alternativa con backup propio:
   `pg_restore --clean --if-exists --dbname "$DATABASE_URL" kairas-YYYYMMDD.dump`
4. Arregla la migración en local (rama de Neon de prueba) antes de reintentar.

**Mientras tanto**: el entorno local sigue funcionando como respaldo
operativo (`npm run db:dev` + `npm run dev`).

## Después del despliegue

- Backups: estrategia completa en [backups.md](./backups.md).
- Activar Meta CAPI (modo test primero): [meta-capi.md](./meta-capi.md).
- Odoo: seguir en CSV o activar API: [odoo-integration.md](./odoo-integration.md).
