# 05 · Optimizaciones de rendimiento

## Resultado

La portada de KAIRAS OS pasa de un agregado de **22 consultas Prisma** a un
máximo de **3 round-trips de conocimiento** cuando la caché está fría. El
índice y las secciones se reutilizan entre peticiones, la sesión se resuelve
una sola vez por render y la portada útil se transmite antes que los paneles
personalizados.

## Cambios aplicados

### Índice ligero compartido

`getKnowledgeIndex()` selecciona solo los campos necesarios para clasificar,
contar y presentar resúmenes. Excluye `body`, versiones, relaciones,
embeddings y documentos completos. `unstable_cache()` reutiliza el resultado
entre peticiones y `React.cache()` deduplica la lectura dentro del mismo
render RSC.

Las acciones de alta, edición, archivado y borrado suave llaman
`updateTag("os-knowledge")`, por lo que la siguiente lectura ve el cambio. La
frontera de caché rehidrata `updatedAt` y `validUntil` como `Date` antes de
calcular vigencia.

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

### Shell sin lecturas duplicadas y portada progresiva

Layout y páginas comparten `getSession()` mediante `React.cache()`. El índice
se inicia antes de esperar la sesión. En `/os`, encabezado, búsqueda, acceso a
Estrategia y accesos por tarea se renderizan fuera del `Suspense`; decisiones,
actividad y favoritos llegan después.

### Feedback de ruta y recuperación

- `src/app/(app)/loading.tsx`: feedback instantáneo para el CRM.
- `src/app/(app)/os/loading.tsx`: esqueleto específico de Conocimiento.
- `src/app/(app)/os/error.tsx`: mensaje útil, referencia de error y reintento con `unstable_retry`.

La frontera registra el error técnico en servidor/consola, mientras la UI evita el genérico “This page couldn’t load”.

### Prefetch controlado

Dentro de `/os`:

- el menú global no precarga todas las rutas del CRM;
- se precargan de forma completa solo `/os` y `/os/estrategia`;
- la navegación interna y las fichas densas usan `prefetch={false}`;
- el topbar no precarga el formulario de nuevo lead.

Fuera de `/os`, el menú global conserva su comportamiento habitual. En la
traza final de entrada se observaron **4 solicitudes OS**: shell/portada y la
vista Estrategia priorizada. No vuelve la tormenta de más de 30 solicitudes.

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

No se activa Cache Components en todo el proyecto. Se usa la API compatible
con la configuración actual únicamente para datos globales de conocimiento;
favoritos y vistas siguen siendo lecturas personalizadas sin caché
compartida. La invalidación por etiqueta mantiene lectura tras escritura.

## Efecto sobre el resto del CRM

El cambio compartido se limita al shell: feedback de carga, reutilización del usuario del layout y prefetch condicional mientras la ruta activa es `/os`. No se modificaron consultas, modelos ni reglas de negocio de leads, pipeline, tareas, calendario, tiempo, clientes o finanzas.
