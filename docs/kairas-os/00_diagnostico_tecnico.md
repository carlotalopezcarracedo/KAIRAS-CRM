# Diagnóstico técnico previo — KAIRAS OS

Fecha: 2026-07-30  
Proyecto: `C:\Users\carlo\Desktop\KAIRAS CRM`

## 1. Protección del repositorio

| Dato | Valor |
| --- | --- |
| Rama inicial | `main` |
| Rama de trabajo | `fix/kairas-os-performance-knowledge-redesign` |
| Commit base | `87c141663a7c5d1579f744f3aaad8b727a915a3b` |
| Estado inicial | limpio, sin archivos modificados ni archivos sin seguimiento |
| Archivos previos que proteger | ninguno |
| Push / merge / deploy | no realizados |

La rama se creó antes de escribir código. El árbol seguía limpio después de
crear la rama.

## 2. Arquitectura observada

- Next.js 16.2.10, App Router y React 19.
- TypeScript estricto, Tailwind CSS 4 y componentes propios/Radix.
- Auth.js 5 con sesión JWT.
- Prisma 6.19.3 y PostgreSQL.
- `src/app/(app)/layout.tsx` protege y monta el shell completo.
- Lecturas en Server Components y mutaciones mediante Server Actions.
- KAIRAS OS está encapsulado bajo:
  - rutas `src/app/(app)/os/**`;
  - componentes `src/app/(app)/os/_components/**` y `src/components/os/**`;
  - servicios `src/server/services/os/**`;
  - validadores `src/server/validators/os/**`;
  - tablas `os_*`, mapeadas por modelos `Knowledge*` de Prisma.
- El modelo de conocimiento ya ofrece entrada tipada, fuente, etiquetas,
  relaciones, versiones, favoritos y vistas. No hay FK destructiva hacia el
  CRM.

## 3. Reproducción y métricas iniciales

Entorno medido:

- build de producción local;
- PostgreSQL local en `localhost:51214`;
- Chrome headless 1440 × 1000;
- usuaria real del seed;
- 113 entradas de conocimiento;
- árbol Git limpio.

### Verificaciones base

| Comprobación | Resultado |
| --- | --- |
| `prisma validate` | correcto |
| `prisma migrate status` | 7 migraciones, esquema al día |
| tests | 24/24 correctos |
| lint | 0 errores, 1 warning previo en `seed-os-fase-c.ts` |
| build | compila; ~54 s hasta terminar TypeScript y ~60 s total observado |
| consola al cargar login/CRM | 7 respuestas 400 del optimizador de imágenes |

### Tiempos de navegación cliente

Medición desde clic hasta que el encabezado de destino queda visible:

| Ruta | Primera pasada | Segunda pasada |
| --- | ---: | ---: |
| `/dashboard` | 587 ms | 936 ms |
| `/leads` | 296 ms | 590 ms |
| `/pipeline` | 390 ms | 379 ms |
| `/tasks` | 431 ms | 335 ms |
| `/time` | 659 ms | 408 ms |
| `/calendar` | 669 ms | 397 ms |
| `/os` | 1.460 ms | 1.487 ms |
| `/os` → `/os/marca` | 663 ms | — |

Carga directa autenticada de `/os`:

- respuesta HTTP: 200 en local;
- espera hasta `networkidle`: 5.895 ms;
- navegación documentada por el navegador: 1.971 ms;
- sin `pageerror`, pero con errores 400 de imagen en la primera sesión.

Estos datos son locales. No se presentan como tiempos de producción.

### Consultas de `/os`

El render actual de entrada a `/os` realiza **22 consultas Prisma**:

1. cronómetro del topbar: 1;
2. conteos del sidebar de KAIRAS OS: 2;
3. `dashboardStats`: 4;
4. `getDashboard`: 8;
5. actividad: 1;
6. más usado: 2;
7. actividad semanal: 2;
8. clientes: 1;
9. playbooks: 1.

Aunque el código usa `Promise.all`, la conexión documentada
`connection_limit=1` serializa el trabajo. En la base local, las sondas
aisladas midieron:

- conteos de secciones: 70 ms;
- estadísticas: 106 ms;
- dashboard antiguo: 262 ms;
- actividad: 51 ms;
- más usado: 47 ms;
- actividad semanal: 45 ms;
- clientes: 42 ms;
- playbooks: 52 ms.

### Prefetch no deseado

La traza del navegador muestra que los listados visibles lanzan muchos RSC
prefetch en producción:

- al salir de `/os`, se observaron prefetch de detalles
  `/os/e/[id]` de 838–1.048 ms;
- `/calendar` lanzó prefetch de múltiples fechas;
- `/tasks`, `/time` y `/pipeline` lanzaron prefetch de variantes de filtros.

Con una conexión de base de datos limitada, esas lecturas compiten con la
navegación que la usuaria acaba de solicitar.

### Bundle aproximado

Salida de `next experimental-analyze --output`:

| Ruta | Cliente, comprimido | Servidor, comprimido |
| --- | ---: | ---: |
| `/os` | ~284 KB | ~543 KB |
| `/os/[section]` | ~285 KB | ~547 KB |
| `/os/e/[id]` | ~422 KB | ~681 KB |
| `/dashboard` | ~438 KB | ~688 KB |
| `/time` | ~486 KB | ~737 KB |

Las rutas de KAIRAS OS sí están separadas, pero el detalle/editor carga más
cliente que el dashboard. No se añadirá otra librería visual.

## 4. Causa raíz del error “This page couldn’t load”

### Causa primaria: timeout por exceso de round-trips

El commit base `87c1416` documenta que:

- el 500 persistía en Vercel;
- la función corría en `iad1`;
- la base estaba en Frankfurt;
- las consultas se serializaban por `connection_limit=1`;
- el límite anterior de 10 s se agotaba.

Ese commit añadió `maxDuration = 30` a `src/app/(app)/os/layout.tsx` y describe
explícitamente unas 20 consultas. El código actual confirma 22. Ampliar el
timeout reduce la frecuencia del 500, pero no elimina la causa: sigue habiendo
demasiados viajes a la base para renderizar una sola pantalla.

No se pudo consultar el proyecto de KAIRAS mediante la conexión de Vercel
disponible: la cuenta conectada solo lista cuatro proyectos ajenos a este
repositorio. Por tanto, no se inventa un stack trace de producción. La evidencia
disponible es el historial Git, el conteo estático de consultas y la
reproducción temporal local.

### Causa secundaria: ausencia de límites de error propios

No existe ningún `error.tsx` en la aplicación ni en `/os`. Cualquier excepción
de servidor o timeout cae en el documento 500 de Next.js:

> `This page couldn’t load`

No hay mensaje contextual, reintento propio, referencia técnica ni logging
identificable para KAIRAS OS.

### Causa adicional verificada: activos de marca detrás de auth

`src/middleware.ts` excluye `/_next/image`, pero no excluye `/brand/**`. El
optimizador pide el PNG original sin la sesión del navegador, Auth.js lo
intercepta y Next recibe una respuesta que no es una imagen.

Log reproducido:

```text
The requested resource isn't a valid image for
/brand/kairas-logo-horizontal.png received null
```

Resultado: respuestas 400 repetidas y trabajo innecesario en cada carga.

## 5. Problemas por severidad

### S0 — bloqueante

1. `/os` puede agotar el tiempo de función por 22 consultas y latencia
   transatlántica.
2. No existe `error.tsx` específico; el fallo es opaco y no recuperable desde
   el módulo.

### S1 — alta

1. `src/app/(app)/layout.tsx` espera sesión antes de renderizar el shell.
2. `Topbar` vuelve a resolver sesión y espera el cronómetro.
3. `src/app/(app)/os/layout.tsx` vuelve a resolver sesión y bloquea por dos
   agregados antes de poder mostrar cualquier hijo.
4. La página `/os` vuelve a resolver sesión.
5. No hay `loading.tsx` en el shell ni en KAIRAS OS.
6. Prefetch automático en listados densos compite con la navegación real.
7. Las secciones leen registros completos, incluido `body`, cuando la vista
   resumen dispone de `summary`.

### S2 — media

1. La IA actual mezcla Marca con manual visual y Marketing con comunicación y
   contenidos; decisiones/aprendizaje no tiene área primaria.
2. La home usa muchos bloques parecidos y no prioriza “qué debo hacer hoy”.
3. La búsqueda solo consulta título/resumen/body; no incluye tags, sector,
   metadatos contextuales ni tolerancia básica.
4. La búsqueda rápida no cancela respuestas antiguas y puede presentar un
   resultado fuera de orden.
5. No hay historial de búsquedas.
6. La navegación actual duplica Playbooks y Procesos sobre la misma consulta.
7. Los estados históricos/obsoletos no siempre quedan separados de la lectura
   operativa.

### S3 — baja

1. Convención `middleware.ts` deprecada en Next.js 16; no es la causa del
   error y no se migrará por comodidad.
2. Warning previo no relacionado en `prisma/seed-os-fase-c.ts`.

## 6. Solución propuesta

1. Sustituir el dashboard de 19 consultas propias por un índice ligero:
   - una consulta de entradas sin `body`;
   - una consulta de favoritos;
   - una consulta de vistas recientes/más usadas.
2. Reutilizar el índice por render con `cache()` de React para que layout y
   página no dupliquen la misma lectura.
3. Derivar en memoria métricas, decisiones, hipótesis, alertas de vigencia,
   clientes, playbooks y actualizaciones (113 filas pequeñas).
4. Mantener la lectura completa únicamente en el detalle de una entrada.
5. Añadir `loading.tsx` y `error.tsx` propios de `/os`.
6. Separar el cronómetro del topbar con Suspense para que no bloquee el shell.
7. Desactivar prefetch en listados de alta cardinalidad y conservarlo en
   accesos principales de baja cardinalidad.
8. Excluir `/brand/**` del proxy de autenticación.
9. Reorganizar la experiencia en Inicio, Marca, Manual visual, Comunicación,
   Oferta y clientes, Playbooks, Decisiones y aprendizaje, Contenidos,
   Recursos y Constitución, sin cambiar los datos originales.
10. Mantener rutas antiguas del módulo como aliases para no romper enlaces.
11. Mejorar búsqueda con filtros, tags/sector/contexto, agrupación, teclado,
    debounce, control de carreras e historial local no sensible.
12. Añadir tests unitarios de clasificación, agregados, búsqueda y estados.

## 7. Cambios mínimos sobre archivos existentes

Archivos existentes previstos:

- `src/app/(app)/layout.tsx`
- `src/components/shell/topbar.tsx`
- `src/middleware.ts`
- `src/app/(app)/os/layout.tsx`
- `src/app/(app)/os/page.tsx`
- `src/app/(app)/os/[section]/page.tsx`
- `src/app/(app)/os/buscar/page.tsx`
- `src/app/(app)/os/_sections.ts`
- `src/app/(app)/os/_components/os-sidebar.tsx`
- `src/app/(app)/os/_components/quick-search.tsx`
- `src/app/(app)/os/_components/section-views.tsx`
- `src/app/(app)/os/_components/os.module.css`
- `src/server/services/os/os-views-service.ts`
- `src/server/services/os/knowledge-service.ts`
- `src/app/(app)/os/actions.ts`
- enlaces de alta cardinalidad concretos en calendario, tareas, tiempo,
  pipeline y KAIRAS OS, solo si la traza confirma prefetch masivo.

No se prevé modificar auth, datos comerciales, rutas comerciales ni estilos
globales.

## 8. Archivos nuevos previstos

- `src/app/(app)/os/loading.tsx`
- `src/app/(app)/os/error.tsx`
- componentes locales de KAIRAS OS si ayudan a dividir responsabilidades;
- tests propios para overview/búsqueda/clasificación;
- `docs/kairas-os/01_arquitectura_informacion.md` a
  `docs/kairas-os/11_checklist_predeploy.md`;
- capturas de QA bajo `docs/kairas-os/capturas/`.

## 9. Riesgos

1. Los aliases de secciones deben evitar duplicar conteos por `area` + `type`.
2. Desactivar demasiado prefetch puede aumentar el tiempo real al hacer clic;
   se limitará a listas densas y se acompañará de loading inmediato.
3. La página debe conservar acceso a todo el conocimiento sin volver a cargar
   todos los cuerpos.
4. Favoritos y vistas son datos por usuaria; no se cachearán entre usuarios.
5. El timeout de producción no se declarará resuelto hasta verificar una
   reducción material de consultas y tiempos locales. No se desplegará para
   comprobarlo.

## 10. Decisión de continuación

El diagnóstico es claro y la solución es aditiva/reversible. No requiere
migración destructiva, cambio de autenticación, despliegue ni modificación de
datos del CRM. Se continúa con implementación sin esperar confirmación, según
el encargo.
