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
| `npm run smoke` | 3 smoke tests: leads, flujo operativo completo y archivos |
| `npm run data:export` | backup completo a JSON (`backups/`) — sin pg_dump |
| `npm run data:import -- <archivo>` | restaurar/migrar el export a la BD activa |
| `npm run lint` / `npm test` | linter / tests unitarios |

## Estado actual

Módulos **funcionales** (datos reales, validación Zod, audit log, responsive):

- ✅ Auth (Auth.js v5, JWT, cambio de contraseña), design system KAIRAS
- ✅ Dashboard "Hoy" con KPIs reales
- ✅ Leads: filtros, detalle, interacciones, notas, estados, convertir a cliente
- ✅ Pipeline: kanban drag & drop, tabla, ganada/perdida, métricas y forecast
- ✅ Clientes: ficha 360 (MRR, horas, facturación, contactos, proyectos)
- ✅ Proyectos: alcance, modos de facturación, rentabilidad estimada
- ✅ Tareas: Hoy/Vencidas/Próximas, checklist, iniciar cronómetro desde tarea
- ✅ Tiempo: cronómetro global persistente, entradas manuales, resúmenes
  día/semana/mes por cliente/proyecto/tipo, export CSV, bloqueo de facturadas
- ✅ Tarifas: global/cliente/proyecto/servicio con vigencias
- ✅ Calendario: mes/semana/día con 6 capas filtrables y eventos propios
- ✅ Informes: funnel, horas semanales, rentabilidad, ranking clientes
- ✅ Recurrentes: MRR/ARR, ciclos, generar solicitud de factura
- ✅ Finanzas: cola de facturación → Odoo (manual/horas/recurrentes),
  snapshots de facturas con estados de cobro, export CSV Odoo
- ✅ Servicios: catálogo editable
- ✅ Integraciones: Odoo (CSV operativo, API preparada) y Meta CAPI
  (eventos automáticos en cola, envío solo con credenciales y consentimiento)
- ✅ Ajustes: datos KAIRAS, preferencias, seguridad, tarifas

- ✅ Archivos adjuntos: subida segura (bucket privado + URLs firmadas en
  producción con Supabase Storage), categorías, enlaces externos, en lead/
  cliente/oportunidad/proyecto/tarea
- ✅ Analítica de tiempo: gráficas por día y tipo de trabajo con filtros
  (rango, cliente, proyecto, facturable); dashboard con alertas y semana

Pendiente (stubs declarados): Propuestas (módulo dedicado) y Campañas.
**Producción elegida: Supabase (BD + Storage) + Vercel** — guía completa en
[docs/deployment.md](./docs/deployment.md).

## Estructura

Ver [`docs/architecture.md`](./docs/architecture.md). Resumen:
`src/app` (rutas) → `src/server/services` (negocio) → Prisma → PostgreSQL,
con validación Zod en cada entrada y `AuditLog` en cada acción relevante.
