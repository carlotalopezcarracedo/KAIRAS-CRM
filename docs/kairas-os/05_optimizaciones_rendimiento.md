# 05 · Optimizaciones de rendimiento

## Resultado

La portada de KAIRAS OS pasa de un agregado de **22 consultas Prisma** a un máximo de **3 round-trips de conocimiento**, con degradación explícita de favoritos y telemetría. La navegación dispone de feedback inmediato, no precarga listas densas y ya no depende de ampliar el timeout de la función.

## Cambios aplicados

### Índice ligero compartido

`getKnowledgeIndex()` selecciona solo los campos necesarios para clasificar, contar y presentar resúmenes. Excluye `body`, versiones, relaciones, embeddings y documentos completos. `React.cache()` deduplica la lectura dentro del mismo render RSC.

El índice alimenta:

- estadísticas de portada;
- decisión, hipótesis y actualizaciones;
- clasificación por sección;
- conteos;
- fallback de búsqueda tolerante a erratas.

### Dashboard en tres lecturas como máximo

`getOsDashboardOverview()` ejecuta:

1. índice ligero;
2. favoritos del usuario;
3. muestra reciente de vistas.

Favoritos y vistas se resuelven en paralelo con `Promise.allSettled`. Si una lectura secundaria falla, la portada sigue disponible y registra `[KAIRAS_OS_PARTIAL]` sin ocultar el incidente.

Se retiró `maxDuration = 30`: era una mitigación del síntoma, no de la causa.

### Listados sin cuerpo completo

Las secciones reciben un `select` explícito con resumen, metadatos, fuente y etiquetas. El cuerpo se solicita solo al abrir una ficha. Esto reduce serialización RSC, memoria de servidor y transferencia.

### Shell sin lecturas duplicadas

El layout autenticado entrega el usuario ya resuelto al topbar. El temporizador se difiere con `Suspense`, de modo que no bloquea la estructura principal.

### Feedback de ruta y recuperación

- `src/app/(app)/loading.tsx`: feedback instantáneo para el CRM.
- `src/app/(app)/os/loading.tsx`: esqueleto específico de Conocimiento.
- `src/app/(app)/os/error.tsx`: mensaje útil, referencia de error y reintento con `unstable_retry`.

La frontera registra el error técnico en servidor/consola, mientras la UI evita el genérico “This page couldn’t load”.

### Prefetch controlado

Dentro de `/os`:

- el menú global no precarga todas las rutas del CRM;
- la navegación interna y las fichas densas usan `prefetch={false}`;
- el topbar no precarga el formulario de nuevo lead.

Fuera de `/os`, el menú global conserva su comportamiento habitual. La portada pasó de más de 30 solicitudes RSC automáticas a **0** después de quedar estable.

### Activos de marca

El matcher de autenticación excluye `/brand/**`. Antes, las peticiones del optimizador de imagen eran interceptadas y terminaban en 400 aunque los PNG fueran válidos. Tras el cambio no se observan errores de imagen ni de consola.

### Búsqueda

- debounce de 220 ms;
- número de secuencia para descartar respuestas antiguas;
- límite de resultados rápidos;
- consulta ligera con campos explícitos;
- ranking local sobre 113 cabeceras, sin cargar cuerpos;
- tolerancia leve a acentos y erratas;
- búsquedas recientes versionadas en `localStorage`.

## Decisiones de caché

No se añadió caché persistente ni `use cache`: la aplicación depende de sesión y conocimiento editable, y el proyecto no tiene Cache Components activado. La deduplicación por petición evita datos obsoletos entre usuarios y no requiere invalidación adicional.

## Efecto sobre el resto del CRM

El cambio compartido se limita al shell: feedback de carga, reutilización del usuario del layout y prefetch condicional mientras la ruta activa es `/os`. No se modificaron consultas, modelos ni reglas de negocio de leads, pipeline, tareas, calendario, tiempo, clientes o finanzas.

