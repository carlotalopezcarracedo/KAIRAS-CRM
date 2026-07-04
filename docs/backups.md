# Backups y recuperación — KAIRAS OS

Regla: **si un dato solo existe en un sitio, no existe.** Esta guía cubre
desarrollo local y producción.

## Desarrollo local (`prisma dev`)

Los datos viven en un directorio PGlite:

```txt
C:\Users\carlo\AppData\Local\prisma-dev-nodejs\Data\default\.pglite\
```

### Backup manual local

Con la BD local corriendo (`npm run db:dev`):

```bash
# Volcado SQL completo (necesita pg_dump; viene con PostgreSQL client tools)
pg_dump "postgres://postgres:postgres@localhost:51214/kairas?sslmode=disable" > backup-$(date +%Y%m%d).sql
```

Si no tienes `pg_dump` instalado, alternativa sin instalar nada:
copiar el directorio `.pglite` completo **con el servidor parado**. Es un
backup binario válido (restaurar = volver a colocar el directorio).

> El entorno local es de trabajo real hasta que haya despliegue. Haz una
> copia semanal del directorio `.pglite` o un `pg_dump` a una carpeta
> sincronizada (Drive/OneDrive).

## Producción (recomendado: Supabase o Neon)

Cuando la app se despliegue con BD gestionada:

| Proveedor | Backups automáticos | Retención (free) | Restore |
| --- | --- | --- | --- |
| Supabase | diarios | 7 días (plan Pro) / point-in-time en planes de pago | dashboard → Database → Backups |
| Neon | point-in-time (branching) | 24 h free / más en pago | crear branch desde un punto en el tiempo |

Además de lo que haga el proveedor, mantener **backups propios**:

```bash
# Backup lógico completo (ejecutar en cron semanal o antes de cambios grandes)
pg_dump "$DATABASE_URL" --format=custom --file=kairas-$(date +%Y%m%d).dump

# Restaurar
pg_restore --clean --if-exists --dbname "$DATABASE_URL" kairas-YYYYMMDD.dump
```

Política recomendada:
- backup automático diario (proveedor),
- `pg_dump` semanal propio guardado fuera del proveedor (Drive, R2, disco),
- conservar 4 semanales + 3 mensuales,
- **probar una restauración** en una BD vacía al menos una vez por trimestre
  y apuntar la fecha aquí:

```txt
Última prueba de restauración: (pendiente — hacer tras el primer despliegue)
```

## Export desde la app

Previsto en Fase 5/6 (`/settings` → export CSV/JSON de leads, clientes,
proyectos, facturas snapshot y entradas de tiempo). Hasta entonces:

```bash
npm run db:studio   # exportación manual por tabla desde Prisma Studio
```

## Qué NO cubre esto

- Archivos adjuntos: de momento son enlaces externos (metadatos en BD);
  cuando haya storage real (Fase 2+) se añadirá su backup aquí.
- Secretos: `.env` no se commitea. Guarda una copia del `.env` de producción
  en tu gestor de contraseñas.
