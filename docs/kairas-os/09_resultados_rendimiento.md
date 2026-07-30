# 09 · Resultados de rendimiento

Mediciones locales de producción en la misma máquina, base y navegador. Son comparativas de diagnóstico, no un SLA de Vercel.

## Resumen

| Métrica | Antes | Después | Cambio |
| --- | ---: | ---: | ---: |
| Consultas de portada OS | 22 | máximo 3 | −86 % |
| Carga fría `/os`, mediana `networkidle` | 5,90 s | 2,74 s | −54 % |
| Recarga caliente `/os`, mediana | — | 0,75 s | referencia |
| Navegación cliente a `/os` | 1,46–1,49 s | 0,52–0,66 s | −55–65 % |
| Prefetch RSC automático estable en `/os` | >30 | 0 | eliminado |
| Errores de imagen de marca | 7 peticiones 400 observadas | 0 | resuelto |
| Tests | 24 | 29 | +5 búsqueda/QA |

La carga fría final se midió en tres contextos sin caché de navegador: **1,77 s, 2,74 s y 3,58 s**.

## Navegación principal

Con prefetch desactivado durante la permanencia en `/os` y esperando el `h1` de destino:

| Ruta | Pasada 1 | Pasada 2 |
| --- | ---: | ---: |
| Dashboard | 861 ms | 733 ms |
| Leads | 682 ms | 564 ms |
| Pipeline | 467 ms | 370 ms |
| Tareas | 484 ms | 408 ms |
| Tiempo | 565 ms | 518 ms |
| Calendario | 501 ms | 480 ms |
| KAIRAS OS | 515 ms | 660 ms |

Todas quedan por debajo de 0,9 s en la prueba sin depender de una precarga previa. Fuera de `/os`, el menú global conserva su estrategia normal de prefetch.

## Tamaño de ruta

Salida de `next experimental-analyze --output`, gzip:

| Ruta | Cliente antes | Cliente después | Servidor antes | Servidor después |
| --- | ---: | ---: | ---: | ---: |
| `/os` | 284 KB | 281 KB | 543 KB | 537 KB |
| `/os/[section]` | 285 KB | 282 KB | 547 KB | 544 KB |
| `/os/e/[id]` | 422 KB | 416 KB | 681 KB | 670 KB |
| `/dashboard` | 438 KB | 428 KB | 688 KB | 672 KB |
| `/time` | 486 KB | 476 KB | 737 KB | 721 KB |

La mejora principal no procede del bundle, sino de consultas, serialización, prefetch y feedback de navegación.

## Build

Build final:

- compilación: 42 s en la revalidación final (26,2 s en la medición anterior);
- TypeScript: 54 s en la revalidación final (53,0 s en la medición anterior);
- generación: 14/14 páginas estáticas;
- todas las rutas dinámicas generadas correctamente.

Sobre ese artefacto, una carga autenticada final de `/os` registró 1,50 s a
`DOMContentLoaded` y 2,23 s a `networkidle`; una segunda sesión usada para
validar el ranking quedó en 4,08 s a `networkidle`. Se conserva la mediana de
2,74 s como comparación porque las pasadas dependen de caché y arranque del
servidor local.

Avisos no bloqueantes:

- convención `middleware` deprecada en Next 16;
- configuración `package.json#prisma` deprecada para Prisma 7;
- variable `ABRIL` sin uso en un seed preexistente.

## Causa raíz confirmada

La función en Vercel ejecutaba demasiadas consultas secuenciales/paralelas sobre una conexión PostgreSQL limitada (`connection_limit=1`) y una base en otra región. La ampliación a 30 segundos ocultaba el problema. La solución reduce viajes, datos y competencia de prefetch; no aumenta el timeout.
