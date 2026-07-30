# 11 · Checklist predeploy

Estado al 30 de julio de 2026. Este documento **no autoriza ni implica despliegue**.

## Código y datos

- [x] Rama aislada `fix/kairas-os-performance-knowledge-redesign`.
- [x] Sin cambios de esquema ni migraciones.
- [x] Prisma schema válido.
- [x] Siete migraciones aplicadas.
- [x] 113 entradas, 113 snapshots y 104 relaciones verificadas.
- [x] Importación idempotente documentada.
- [x] No hay unidades sin fuente, identidad, resumen o cuerpo.
- [ ] Confirmar backup y base de destino antes de ejecutar `db:seed:os`.

## Calidad

- [x] ESLint sin errores.
- [x] TypeScript correcto.
- [x] 28/28 tests.
- [x] Smoke de leads, operaciones y archivos; datos temporales eliminados.
- [x] Build de producción correcto.
- [x] Navegación de rutas principales comprobada.
- [x] CRUD, versionado, archivo, favoritos, etiquetas y relaciones cubiertos por integración.
- [x] Búsqueda de las nueve tareas de aceptación.
- [x] Chrome sin errores de consola, page errors u overlay.
- [x] Capturas de escritorio, tableta y móvil.
- [x] Sin overflow horizontal móvil.

## Configuración productiva

- [ ] Abrir el proyecto Vercel correcto y guardar stack trace/logs previos.
- [ ] Confirmar `DATABASE_URL` y pooling.
- [ ] Confirmar región de función y base.
- [ ] Confirmar `AUTH_URL`, `AUTH_SECRET` y dominio.
- [ ] Confirmar que `/brand/**` queda público y las imágenes responden 200.
- [ ] Confirmar que el runtime no conserva el parche `maxDuration=30` para `/os`.
- [ ] Configurar/confirmar agregación de errores.

## Smoke posterior al despliegue

- [ ] Login y logout.
- [ ] Abrir `/os` dos veces y revisar latencia/logs.
- [ ] Navegar por las nueve secciones.
- [ ] Buscar `colores`, `precios`, `Estersa` y `no prometer`.
- [ ] Abrir una ficha, fuente, relaciones e historial.
- [ ] Crear una entrada temporal, editarla y archivarla.
- [ ] Confirmar que leads, pipeline, tareas, tiempo y calendario siguen operativos.
- [ ] Revisar 5xx, timeouts, consultas y pool durante al menos una sesión real.
- [ ] Validar escritorio, tableta y móvil en navegador no headless.

## Operaciones explícitamente pendientes

- [ ] Push.
- [ ] Pull request.
- [ ] Merge.
- [ ] Deploy.
