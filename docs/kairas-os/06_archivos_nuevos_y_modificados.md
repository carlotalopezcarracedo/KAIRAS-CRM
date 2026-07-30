# 06 · Archivos nuevos y modificados

Comparación contra el commit base `87c141663a7c5d1579f744f3aaad8b727a915a3b`.

## Nuevos

### Documentación

- `docs/kairas-os/00_diagnostico_tecnico.md`
- `docs/kairas-os/01_arquitectura_informacion.md`
- `docs/kairas-os/02_modelo_datos.md`
- `docs/kairas-os/03_mapa_navegacion.md`
- `docs/kairas-os/04_decisiones_ux.md`
- `docs/kairas-os/05_optimizaciones_rendimiento.md`
- `docs/kairas-os/06_archivos_nuevos_y_modificados.md`
- `docs/kairas-os/07_importacion_conocimiento.md`
- `docs/kairas-os/08_qa_funcional.md`
- `docs/kairas-os/09_resultados_rendimiento.md`
- `docs/kairas-os/10_riesgos_y_pendientes.md`
- `docs/kairas-os/11_checklist_predeploy.md`
- `docs/kairas-os/capturas/01_dashboard_escritorio.png`
- `docs/kairas-os/capturas/02_manual_visual_escritorio.png`
- `docs/kairas-os/capturas/03_oferta_tablet.png`
- `docs/kairas-os/capturas/04_aprendizaje_movil.png`

### Aplicación y pruebas

- `src/app/(app)/loading.tsx`
- `src/app/(app)/os/error.tsx`
- `src/app/(app)/os/loading.tsx`
- `src/lib/os-search.ts`
- `src/lib/os-search.test.ts`
- `scripts/import-kairas-os.ts`
- `scripts/verify-kairas-os-import.ts`

## Modificados

### Experiencia KAIRAS OS

- `src/app/(app)/os/page.tsx`
- `src/app/(app)/os/layout.tsx`
- `src/app/(app)/os/[section]/page.tsx`
- `src/app/(app)/os/buscar/page.tsx`
- `src/app/(app)/os/favoritos/page.tsx`
- `src/app/(app)/os/_sections.ts`
- `src/app/(app)/os/_components/os-sidebar.tsx`
- `src/app/(app)/os/_components/os-ui.tsx`
- `src/app/(app)/os/_components/quick-search.tsx`
- `src/app/(app)/os/_components/relationship-graph.tsx`
- `src/app/(app)/os/_components/section-views.tsx`

### Servicios y shell

- `src/server/services/os/os-views-service.ts`
- `src/app/(app)/layout.tsx`
- `src/components/shell/topbar.tsx`
- `src/components/shell/sidebar.tsx`
- `src/components/shell/mobile-nav.tsx`
- `src/middleware.ts`
- `package.json`

## Deliberadamente no modificados

- `prisma/schema.prisma`
- `prisma/migrations/**`
- autenticación y roles;
- modelos y servicios de CRM;
- contenido de los tres seeds existentes;
- variables de entorno;
- configuración de despliegue.

No era necesaria una migración: el modelo aislado `os_*` ya cubría estados, versiones, fuentes, relaciones, etiquetas y preferencias.

