# KAIRAS OS

Sistema operativo interno de KAIRAS: CRM, pipeline comercial, clientes,
proyectos, tareas, control horario, calendario, finanzas operativas y
conexión con Odoo y Meta. **Odoo sigue siendo la fuente de verdad fiscal**;
esta app es el cerebro comercial y operativo.

> Especificación completa del producto: [`KAIRAS_CLAUDE.md`](./KAIRAS_CLAUDE.md)
> Documentación técnica: [`/docs`](./docs)

## Arrancar en local

Requisitos: Node 20+ (probado con Node 24). No hace falta instalar PostgreSQL.

```bash
npm install

# Terminal 1 — base de datos local (déjala abierta)
npm run db:dev

# Primera vez: aplicar migraciones y seed
npm run db:deploy
npm run db:seed

# Terminal 2 — la app
npm run dev
```

Abre http://localhost:3000 y entra con las credenciales definidas en `.env`
(`SEED_USER_EMAIL` / `SEED_USER_PASSWORD`).

Si no tienes `.env`, copia `.env.example` y rellénalo (para local, la URL de
BD te la imprime `npm run db:dev` al arrancar; añade
`&pgbouncer=true&connection_limit=1`).

## Scripts

| Script | Qué hace |
| --- | --- |
| `npm run dev` | app en modo desarrollo |
| `npm run build` / `npm start` | build y servidor de producción |
| `npm run db:dev` | PostgreSQL local (Prisma dev server) |
| `npm run db:deploy` | aplica migraciones pendientes |
| `npm run db:seed` | usuaria + catálogo de servicios + settings |
| `npm run db:studio` | inspector visual de la BD |
| `npm run db:diff` | genera SQL de migración desde cambios del schema |
| `npx tsx scripts/smoke-lead-flow.ts` | smoke test del flujo de leads |
| `npm run lint` / `npm test` | linter / tests unitarios |

## Estado actual (Fase 1 completada)

- ✅ Autenticación (Auth.js v5, sesión JWT, rutas protegidas, bcrypt)
- ✅ Schema Prisma completo: 27 entidades (incluye time tracking, calendario,
  finanzas, Odoo y Meta, ya migradas y listas para las siguientes fases)
- ✅ Design system KAIRAS (dark premium, Plus Jakarta Sans, morado como acento)
- ✅ Dashboard "Hoy" con KPIs reales desde BD
- ✅ Módulo Leads completo: lista con filtros y búsqueda, alta/edición
  validadas con Zod, detalle con interacciones, notas, seguimiento,
  acciones rápidas (llamar / WhatsApp / email), cambio de estado, soft delete
- ✅ Audit log de acciones importantes
- ✅ Responsive real: tablas → cards en móvil, navegación inferior
- ⏳ Siguientes fases: pipeline (kanban), clientes, proyectos, tareas,
  control horario + calendario, propuestas, finanzas, Odoo, Meta CAPI

## Estructura

Ver [`docs/architecture.md`](./docs/architecture.md). Resumen:
`src/app` (rutas) → `src/server/services` (negocio) → Prisma → PostgreSQL,
con validación Zod en cada entrada y `AuditLog` en cada acción relevante.
