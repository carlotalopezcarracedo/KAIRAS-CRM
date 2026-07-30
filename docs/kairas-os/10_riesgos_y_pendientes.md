# 10 · Riesgos y pendientes

## Antes de producción

1. **Región de función y base.** La evidencia local y del historial del repositorio apunta a función en `iad1`, PostgreSQL en Frankfurt y `connection_limit=1`. Alinear regiones o usar pooling sigue siendo la mejora de infraestructura con mayor impacto.
2. **Logs de producción.** El conector Vercel disponible no contiene un proyecto KAIRAS accesible. No se obtuvo stack trace remoto y no debe afirmarse que el error productivo exacto fue observado. Verificar logs del proyecto correcto antes y después del despliegue.
3. **Autenticación local.** Si la vista previa usa un puerto distinto de 3000, iniciar el proceso con `AUTH_URL`/`NEXTAUTH_URL` del puerto real para que el callback no apunte a otro servicio local.
4. **Observabilidad.** La frontera y los fallos parciales registran referencias, pero no existe integración confirmada con un agregador de errores.

## Contenido pendiente

- Los precios siguen marcados **provisional**; no presentarlos como tarifa fiscal definitiva.
- Estersa continúa condicionado a permiso y sin cifras públicas.
- El logo tiene cobertura operativa provisional; quedan versiones/fuentes técnicas por consolidar.
- No hay piezas de contenido individuales registradas; el sistema muestra un vacío honesto.
- Cinco entradas obsoletas y cinco históricas se conservan para trazabilidad, separadas de lo vigente.

## Mantenimiento

- Reejecutar seeds puede sobrescribir una edición manual de la misma `externalKey`; el corpus importado debe gobernarse desde el seed.
- La tolerancia a erratas es deliberadamente ligera. Con miles de unidades convendría PostgreSQL FTS/trigramas y ranking indexado.
- Las búsquedas recientes viven solo en el navegador y usan una clave versionada; no son datos de negocio.
- `middleware.ts` debe migrar a la convención `proxy` en una tarea independiente.
- La configuración Prisma debe moverse a `prisma.config.ts` antes de Prisma 7.
- El aviso `ABRIL` sin uso es preexistente y no afecta ejecución.

## Alcance protegido

No se modificaron esquema, migraciones, autenticación, roles, CRM, pipeline, clientes, finanzas ni seeds de contenido. Tampoco se desplegó, hizo push o merge.

