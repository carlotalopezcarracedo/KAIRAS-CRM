# Base de datos — KAIRAS OS

PostgreSQL gestionado con Prisma 6. El schema (`prisma/schema.prisma`) es la
fuente de verdad: 27 modelos, enums para todos los estados del negocio,
`createdAt/updatedAt` en todo y `deletedAt` (soft delete) en las entidades
de negocio.

## Entorno local (desarrollo)

No necesitas instalar PostgreSQL ni Docker. Se usa el servidor local de
Prisma (`prisma dev`, basado en PGlite):

```bash
# Terminal 1 — base de datos (déjala corriendo)
npm run db:dev

# Terminal 2 — la app
npm run dev
```

`npm run db:dev` expone un Postgres en `localhost:51214`. La URL ya está en
`.env`. **Importante**: la URL local lleva `connection_limit=1&pgbouncer=true`
porque el servidor es monoproceso; no lo quites.

Los datos viven en:
`C:\Users\carlo\AppData\Local\prisma-dev-nodejs\Data\default\.pglite\`

### Si el servidor local se queda colgado

1. Cierra el proceso (`Ctrl+C` o mata `node` en el administrador de tareas).
2. Si al arrancar dice `Lock file is already being held`, borra:
   `C:\Users\carlo\AppData\Local\prisma-dev-nodejs\Data\durable-streams\default\server.lock.lock`
3. Vuelve a lanzar `npm run db:dev`. Los datos no se pierden.

## Migraciones

El servidor local **no soporta** `prisma migrate dev`. El flujo es:

```bash
# 1. Edita prisma/schema.prisma

# 2. Genera el SQL de la migración (diff entre migraciones aplicadas y schema)
npm run db:diff > prisma/migrations/$(date +%Y%m%d%H%M%S)_nombre/migration.sql

# 3. Revisa el SQL generado (¡siempre!)

# 4. Aplica
npm run db:deploy

# 5. Regenera el cliente
npm run db:generate
```

En producción (Postgres real) el mismo `npm run db:deploy` aplica las
migraciones pendientes. Nunca edites una migración ya aplicada.

## Seed

```bash
npm run db:seed
```

Crea/actualiza (idempotente):
- la usuaria inicial (`SEED_USER_EMAIL/NAME/PASSWORD` del `.env`),
- el catálogo base de 12 servicios,
- la tarifa horaria global (45 €/h por defecto),
- settings iniciales (`company.profile`, `app.defaults`, fuentes de leads).

No crea leads, clientes ni datos comerciales falsos.

## Inspección

```bash
npm run db:studio   # Prisma Studio en el navegador
```

## Producción

Apuntar `DATABASE_URL` a un PostgreSQL real (recomendado: Supabase o Neon,
capa gratuita suficiente para empezar):

1. Crear proyecto en el proveedor y copiar la connection string (pooled).
2. Ponerla en `DATABASE_URL` (añadir `pgbouncer=true` si el proveedor usa
   PgBouncer en el puerto pooled — Supabase lo indica en su dashboard).
3. `npm run db:deploy && npm run db:seed`.

## Modelo de datos (resumen)

- **CRM**: `Lead` (16 estados, temperatura, fuente, UTM/Meta ids, consent),
  `Interaction`, `Note`, `Person`, `Company`, `Tag`.
- **Pipeline**: `Opportunity` (11 etapas, valor, probabilidad, forecast).
- **Operación**: `Client`, `Project`, `Task`, `Service`, `RecurringService`.
- **Tiempo**: `TimeEntry` (7 estados, facturable, tarifa, bloqueo),
  `TimerSession` (cronómetro persistente), `HourlyRate` (global/cliente/
  proyecto/servicio), `TimeReport`, `CalendarEvent`.
- **Finanzas**: `Proposal`, `InvoiceDraftRequest` (cola Odoo),
  `InvoiceRecord` (snapshot), `ExpenseRecord`.
- **Marketing**: `Campaign`, `MetaEventLog` (event_id, hashes, reintentos).
- **Sistema**: `User`, `OdooSyncJob`, `Attachment`, `AuditLog`, `Settings`.
