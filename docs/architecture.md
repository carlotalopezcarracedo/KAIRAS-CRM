# Arquitectura — KAIRAS OS

## Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Components, Server Actions) |
| Lenguaje | TypeScript estricto |
| UI | React 19 + Tailwind CSS v4 + componentes propios (Radix para diálogos) |
| Base de datos | PostgreSQL |
| ORM | Prisma 6 |
| Auth | Auth.js v5 (next-auth beta), credenciales + JWT |
| Validación | Zod v4 (toda entrada pasa por un schema) |
| Toasts | sonner |
| Tests | Vitest (unit) + script de smoke (`scripts/smoke-lead-flow.ts`) |

## Principio rector

- **KAIRAS OS** = fuente de verdad comercial, operativa y de seguimiento.
- **Odoo** = fuente de verdad fiscal y contable. La app prepara colas de
  facturación (`InvoiceDraftRequest`) y guarda snapshots (`InvoiceRecord`),
  pero nunca emite facturas legales.

## Estructura de carpetas

```txt
prisma/
  schema.prisma        # 27 modelos + enums (fuente de verdad del dato)
  migrations/          # SQL versionado (aplicar con prisma migrate deploy)
  seed.ts              # usuaria + catálogo de servicios + settings
scripts/
  smoke-lead-flow.ts   # prueba end-to-end del flujo de leads
src/
  app/
    login/             # página pública de acceso
    api/auth/          # handlers de Auth.js
    (app)/             # rutas protegidas (layout con sidebar/topbar/nav móvil)
      dashboard/       # vista Hoy con KPIs reales
      leads/           # CRM de leads (lista, crear, detalle, editar)
      pipeline/ …      # módulos de fases siguientes (stubs navegables)
  components/
    ui/                # kit propio: Button, Card, Badge, Field, Dialog, Table…
    shell/             # Sidebar, Topbar, MobileNav, nav-items
  lib/                 # utils (formatos €/fechas), labels ES de enums
  server/
    db/prisma.ts       # cliente Prisma singleton
    auth/              # config edge-safe + providers + requireUser()
    validators/        # schemas Zod por entidad
    services/          # lógica de negocio (lead-service, dashboard-service…)
    audit/             # helper de audit log
  middleware.ts        # protección global de rutas
```

## Patrones

### Flujo de una mutación

```txt
UI (form) → Server Action → requireUser() → Zod.safeParse
          → service (Prisma) → audit() → revalidatePath → redirect/result
```

- Los Server Actions devuelven `ActionResult` (`{ok:true}` o
  `{ok:false, error, fieldErrors}`); la UI muestra errores por campo.
- Ningún componente React toca Prisma directamente: siempre a través de
  `src/server/services/*`.
- Toda integración externa (Odoo, Meta) irá en `src/integrations/*` mediante
  adaptadores (Fase 6); nunca dentro de componentes.

### Autenticación

- Split config: `auth/config.ts` es edge-safe (lo usa el middleware);
  `auth/index.ts` añade el provider de credenciales (bcrypt + Prisma).
- Sesión JWT de 14 días. `requireUser()` se llama en **cada** action/servicio.
- El middleware protege todo excepto `/login`, `/api/auth` y assets.

### Soft delete y auditoría

- Entidades de negocio tienen `deletedAt`; los listados filtran
  `deletedAt: null`. Borrar = archivar.
- Acciones importantes escriben en `AuditLog` (actor, acción, before/after).

## Estado por fases

| Fase | Contenido | Estado |
| --- | --- | --- |
| 1 — Base | setup, schema completo, auth, layout, dashboard, leads | ✅ hecha |
| 3 — CRM | oportunidades, kanban pipeline, ganada/perdida, métricas | ✅ hecha |
| 4 — Operación | clientes, proyectos, tareas, time tracking + tarifas, calendario, servicios, recurrentes | ✅ hecha |
| 5 — Finanzas | cola facturación (manual/horas/recurrentes), snapshots, informes | ✅ hecha (propuestas como módulo dedicado: pendiente) |
| 6 — Integraciones | Odoo CSV operativo + API preparada, Meta CAPI con hooks reales, settings | ✅ hecha (campañas: pendiente) |
| 7 — Pulido | PWA, tests e2e, deploy a producción | pendiente (deploy documentado en deployment.md) |

Verificación: `scripts/smoke-lead-flow.ts` y `scripts/smoke-operations.ts`
(flujo completo lead → oportunidad → cliente → proyecto → cronómetro →
factura → cobro → eventos Meta).

## Decisiones técnicas registradas

1. **Prisma 6 (no 7)**: el generador clásico y la compatibilidad con el
   servidor local `prisma dev` reducen fricción. Migrar a 7 cuando el
   ecosistema se asiente.
2. **Migraciones con `migrate diff` + `migrate deploy`**: el servidor local
   PGlite no soporta `migrate dev` (cuelga la conexión). Ver
   `docs/database.md`.
3. **BD local con `connection_limit=1&pgbouncer=true`**: el servidor PGlite es
   monoproceso; con más conexiones concurrentes pierde prepared statements y
   se cuelga. En producción (Supabase/Neon) usar los valores del proveedor.
4. **Selects nativos estilizados** en lugar de Radix Select: más fiables en
   móvil y suficientes para el MVP.
5. **Consent en Lead** (campos `consentStatus`/`consentNote`) en lugar de
   entidad aparte: una usuaria, un flujo; simplifica sin perder trazabilidad.
