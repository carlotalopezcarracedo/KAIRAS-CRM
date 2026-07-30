# 08 · QA funcional

Fecha: **30 de julio de 2026**  
Entorno: build de producción local, Next.js 16.2.10, PostgreSQL local, Chrome headless.

## Verificaciones automáticas

| Comprobación | Resultado |
| --- | --- |
| ESLint | 0 errores; 1 aviso preexistente en `seed-os-fase-c.ts` (`ABRIL` sin uso) |
| TypeScript | correcto |
| Vitest | 3 archivos, 29/29 tests |
| Smoke CRM | lead, operaciones y archivos: correctos; datos temporales eliminados |
| Prisma validate | esquema válido |
| Prisma migrate status | 7 migraciones; base al día |
| Verificador OS | 113 entradas, 113 snapshots, 104 relaciones, 0 avisos |
| Build producción | correcto |

Los tests de integración cubren creación, actualización/versionado, archivo reversible, borrado suave recuperable, búsqueda, filtros, favoritos, etiquetas y relaciones sin tocar entidades del CRM.

La auditoría final reprodujo un timeout del `afterAll` original: la limpieza
hacía varios borrados por cada entrada sobre `connection_limit=1` y podía
dejar una fila `zz-test_*`. Se sustituyó por un borrado en bloque con cascada,
se añadió recuperación de residuos reservados y se repitió la suite: 29/29
tests, 113 entradas reales y cero avisos del verificador.

El smoke compartido verificó además el flujo completo lead → oportunidad → cliente → proyecto → tarea → tiempo → factura, eventos Meta sin envío y almacenamiento de archivos. Cada script confirmó la eliminación de sus datos temporales.

## Navegación y contenido

| Ruta | Evidencia verificada |
| --- | --- |
| `/os` | dashboard editorial, radar, salud, recientes, playbooks, hipótesis y favoritos |
| `/os/marca` | propósito, misión, visión, posicionamiento, ICP, límites y principios |
| `/os/visual` | logotipos, paleta HEX copiable, tipografía, usos y pendientes |
| `/os/comunicacion` | voz, claims, conciencia, objeciones y CTAs |
| `/os/oferta` | ruta contextual, precio, embudo, escalera, casos, límites y objeciones |
| `/os/playbooks` | objetivo, cuándo usar, pasos, checklist y definición de terminado |
| `/os/aprendizaje` | decisión, hipótesis con umbral, experimento y riesgo |
| `/os/contenidos` | sprint, pilares, series y vacío honesto de piezas |
| `/os/recursos` | uso, cuándo no usar y acceso a ficha |
| `/os/constitucion` | índice, autoridad, resumen y ficha completa |

Todas respondieron 200, sin overlay de framework, errores de consola ni errores de página.

## Tareas de aceptación

Prueba sobre `/os/buscar`, incluyendo render y red:

| Necesidad | Consulta | Resultado principal | Tiempo |
| --- | --- | --- | ---: |
| colores | `colores` | tokens Lavanda, Morado y Blanco | 1,21 s |
| mensaje para clínica en frío | `mensaje frío para una clínica` | CTA en frío + plantilla de outreach + guion de apertura | resultado directo |
| precios | `precios` | Precios vigentes | 1,13 s |
| decisiones actuales | `decisiones` | decisión de vertical | 1,15 s |
| playbook de propuesta | `propuesta comercial` | estructura + playbook | 1,25 s |
| cosas que no prometer | `no prometer` | honestidad de prueba | 1,27 s |
| objeciones | `objeciones` | banco + objeciones concretas | 1,28 s |
| contenidos | `contenidos` | sprint + series | 1,09 s |
| cliente Estersa | `Estersa` | ficha de cliente en primer lugar | 1,05 s |

El Spotlight responde a `Ctrl/Cmd+K`, flechas, Enter y Escape. El QA detectó y corrigió una doble instancia en portada; el resultado final tiene una única paleta visible y abre la ficha seleccionada.

La consulta natural anterior se revalidó en la preview final: devuelve
resultados agrupados de Comunicación, Recursos y Oferta y clientes sin errores
de consola, respuestas HTTP fallidas ni overlay. El ranking ignora conectores
españoles y amplía vocabulario de tipo/sector; no modifica el contenido.

## Responsive y visual

- escritorio: 1440×1000;
- tableta: 768×1024 y 1024×900;
- móvil: 390×844;
- scroll horizontal del documento en móvil: **0 px**;
- el sidebar interno aparece desde `xl`; tableta usa navegación horizontal;
- navegación móvil inferior preservada.

Capturas:

- [Dashboard escritorio](capturas/01_dashboard_escritorio.png)
- [Manual visual escritorio](capturas/02_manual_visual_escritorio.png)
- [Oferta tableta](capturas/03_oferta_tablet.png)
- [Aprendizaje móvil](capturas/04_aprendizaje_movil.png)

## Error y degradación

- Existe una frontera específica de error para `/os`.
- El usuario ve referencia y acciones de reintento/volver.
- Favoritos y vistas son secundarios: un fallo parcial no derriba la portada.
- Los errores parciales y de frontera quedan registrados con prefijo identificable.

No se provocó una caída deliberada de PostgreSQL porque afectaría a todo el CRM compartido; la revisión se hizo mediante flujo, código tipado, build y frontera renderizada.

Preview final: `http://localhost:3100`, iniciada con `AUTH_URL` y
`NEXTAUTH_URL` efímeros para ese puerto. El artefacto posterior al último build
abrió `/os`, mostró las 113 unidades y no registró 4xx/5xx, `pageerror`, error
de consola ni overlay.
