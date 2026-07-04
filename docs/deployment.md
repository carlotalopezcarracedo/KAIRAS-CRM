# Despliegue a producción — KAIRAS OS

## Por qué no quedarse en la BD local

El servidor `prisma dev` (PGlite) es solo para desarrollo:

- **Se cuelga bajo concurrencia** (lo hemos visto en esta misma máquina:
  deja el puerto abierto pero no responde y hay que matar el proceso).
- No tiene backups automáticos ni alta disponibilidad.
- Solo es accesible desde este ordenador: sin acceso móvil real.

Para uso diario real: **PostgreSQL gestionado (Supabase o Neon) + Vercel**.
Ambos tienen capa gratuita suficiente para una usuaria.

## Paso 1 — Base de datos gestionada

### Opción A: Neon (recomendada por simplicidad)

1. Crea cuenta en neon.tech → New Project (región: Frankfurt/París).
2. Copia la **connection string pooled** (la que lleva `-pooler` en el host).
3. Ponla en `DATABASE_URL`. Neon usa PgBouncer en el endpoint pooled:
   deja `?sslmode=require&pgbouncer=true` al final.
4. Para migraciones usa la connection string **directa** (sin `-pooler`)
   en una variable `DIRECT_URL` si hiciera falta; con nuestro flujo
   (`migrate deploy`) la pooled suele bastar.

### Opción B: Supabase

1. Crea proyecto en supabase.com.
2. Settings → Database → Connection string → usa el **Transaction pooler**
   (puerto 6543) con `?pgbouncer=true` para la app.

### Migrar los datos

```bash
# 1. Volcar la BD local (con `npm run db:dev` corriendo)
pg_dump "postgres://postgres:postgres@localhost:51214/kairas?sslmode=disable" \
  --format=custom --file=kairas-local.dump

# 2. Apuntar DATABASE_URL a la nube y aplicar schema
npm run db:deploy

# 3. Restaurar SOLO datos (el schema ya existe)
pg_restore --data-only --disable-triggers --dbname "$DATABASE_URL" kairas-local.dump

# Alternativa si aún no hay datos que conservar: saltar 1 y 3 y hacer
npm run db:seed
```

> Sin `pg_dump` instalado: instala solo las client tools de PostgreSQL
> (`winget install PostgreSQL.PostgreSQL`) o exporta por tablas desde
> `npm run db:studio`.

## Paso 2 — App en Vercel

1. Sube el repo a GitHub (privado).
2. Importa el proyecto en vercel.com.
3. Variables de entorno (Production):

```env
DATABASE_URL=        # pooled, con pgbouncer=true
AUTH_SECRET=         # NUEVO secreto: npx auth secret
AUTH_URL=https://tu-dominio.vercel.app
APP_URL=https://tu-dominio.vercel.app
APP_ENV=production
DEFAULT_TIMEZONE=Europe/Madrid
DEFAULT_CURRENCY=EUR
SEED_USER_EMAIL=     # solo si vas a ejecutar seed
SEED_USER_NAME=
SEED_USER_PASSWORD=  # fuerte; cámbiala después desde Ajustes → Seguridad
META_API_VERSION=v23.0
ODOO_INTEGRATION_MODE=csv
```

4. Deploy. Tras el primer deploy, ejecuta migraciones y seed una vez desde
   tu máquina apuntando `DATABASE_URL` a producción:

```bash
npm run db:deploy && npm run db:seed
```

## Checklist de despliegue

- [ ] `DATABASE_URL` de producción con `pgbouncer=true`
- [ ] `AUTH_SECRET` nuevo (no el de desarrollo)
- [ ] `AUTH_URL`/`APP_URL` con el dominio real (https)
- [ ] `npm run db:deploy` ejecutado contra producción
- [ ] Seed ejecutado y login verificado
- [ ] Contraseña cambiada desde Ajustes → Seguridad
- [ ] Backups del proveedor activados (Neon/Supabase lo traen de serie)
- [ ] Primer `pg_dump` propio guardado fuera del proveedor
- [ ] `.env` de producción copiado al gestor de contraseñas
- [ ] Probado desde el móvil (login, vista Hoy, crear lead, cronómetro)

## Backups en producción

Ver [backups.md](./backups.md). Resumen: backups automáticos del proveedor
+ `pg_dump` semanal propio + prueba de restauración trimestral.

## Credenciales de integraciones

- **Meta**: `META_PIXEL_ID`, `META_ACCESS_TOKEN` y opcionalmente
  `META_TEST_EVENT_CODE` (empieza SIEMPRE en modo test). Ver
  [meta-capi.md](./meta-capi.md).
- **Odoo API**: `ODOO_BASE_URL`, `ODOO_DB`, `ODOO_USERNAME`, `ODOO_API_KEY`
  y `ODOO_INTEGRATION_MODE=api`. Hasta entonces, modo `csv`. Ver
  [odoo-integration.md](./odoo-integration.md).
