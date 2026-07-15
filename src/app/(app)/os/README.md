# KAIRAS OS — módulo de conocimiento

El "cerebro" interno de la empresa dentro del CRM: identidad, estrategia, marca,
comunicación, oferta, clientes/casos, contenidos, validación y playbooks.
Ruta pública: **`/os`**. Sección de sidebar: **Conocimiento**.

## Principio de diseño: aislamiento total

El módulo es **aditivo, aislado y reversible**. No modifica ninguna entidad,
tabla, ruta ni comportamiento previo del CRM.

- **Datos:** solo tablas con prefijo `os_` (mapeadas desde modelos `Knowledge*`).
  Bloque delimitado al final de `schema.prisma` (`// KAIRAS OS — INICIO/FIN`).
- **Sin FK al CRM.** Las referencias a entidades del CRM (lead, cliente, etc.)
  son **polimórficas no destructivas**: `targetType` + `targetId` (string), sin
  relación Prisma. `ownerId` es un `userId` string sin FK.
- **Un único archivo existente modificado:** `src/components/shell/nav-items.ts`
  (añade la sección "Conocimiento" con una entrada). Todo lo demás son archivos
  nuevos bajo `os/`, `components/os/`, `services/os/`, `validators/os/`.

## Modelo de datos (core + meta)

8 tablas en lugar de 18. Una entrada base tipada (`KnowledgeEntry.type`) con un
campo `meta Json?` para los atributos propios de cada tipo (hipótesis, oferta,
caso, playbook…). Ver `13_IMPLEMENTACION_KAIRAS_OS/00_revision_modelo_datos.md`.

| Tabla | Rol |
|-------|-----|
| `os_source` | Origen/fuente (fase, documento) para trazabilidad |
| `os_entry` | Unidad de conocimiento (title/body/meta/estado/autoridad) |
| `os_tag`, `os_entry_tag` | Etiquetas N:M |
| `os_relation` | Relaciones tipadas entre entradas (valida, sustituye, …) |
| `os_version` | Historial inmutable de versiones |
| `os_favorite` | Favoritos por usuario |
| `os_permission` | Permisos por entrada (reservado; V1 no lo explota) |

Cada entrada conserva **fuente, fecha, versión, estado, autoridad y relaciones**.
Estados: borrador · vigente · provisional · condicionado · validado · histórico ·
obsoleto · archivado. Autoridad: constitución > sistema permanente > operativo >
experimental > histórico.

## Importación de conocimiento

```bash
npx tsx prisma/seed-os.ts          # Fase A: núcleo (64 entradas)
npx tsx prisma/seed-os-fase-b.ts   # Fase B: comercial + recursos (26 entradas)
```
Ambos idempotentes (upsert por `externalKey`).

Transforma los sistemas aprobados (Constitución, marca, oferta, casos reales,
contenidos, validación) en unidades navegables. **No copia documentos enteros ni
toca los archivos originales.** Las contradicciones no se fusionan: prevalece la
autoridad superior y la versión previa queda como histórica.

## Alcance V1

Incluye: shell/navegación/breadcrumbs, búsqueda textual, filtros, tags,
favoritos, relaciones, fuente/estado/vigencia/autoridad, detalle, historial de
versiones y **edición nativa**. **No** incluye IA, embeddings, búsqueda
semántica, permisos granulares, workflows ni sincronización externa (la
arquitectura los prepara, pero no forman parte de V1).

### Edición nativa (formulario, sin editor visual avanzado)

- Crear (`/os/nuevo`) y editar (`/os/[area]/[id]/editar`) con validación Zod,
  errores por campo, confirmación (toast) y aviso al salir con cambios.
- Cambiar estado, autoridad y **vigencia** (`validUntil`, «vigente hasta»),
  editar etiquetas (se crean solas), añadir/quitar relaciones y favoritos.
- Cada guardado crea una **versión** con autor, fecha y motivo opcional.
- **Archivar** (estado `archivado`) en lugar de borrar: en V1 **no hay borrado
  destructivo desde la interfaz**. El borrado suave existe solo a nivel de
  servicio (reversible, para pruebas/administración), no expuesto en la UI.

### Contenido (90 entradas)

11 áreas navegables. Comercial (embudo y playbooks de venta) y Recursos
(plantillas, guiones, checklists, cuestionarios) se importan con
`prisma/seed-os-fase-b.ts`. Las áreas sin contenido muestran un estado vacío
útil con acceso directo a crear la primera entrada.

## Rollback

El módulo se retira sin residuos:

1. `git revert` (o descartar) los commits `*(os):` de la rama
   `feat/kairas-os-knowledge-module` — incluye revertir la única línea de
   `nav-items.ts`.
2. Eliminar el bloque `// KAIRAS OS — INICIO … FIN` de `schema.prisma`.
3. En la BD: `DROP TABLE` de las 8 tablas `os_*` y `DROP TYPE` de los 6 enums
   `Os*` (ver `13_IMPLEMENTACION_KAIRAS_OS/08_rollback.md`). Ninguna tabla del
   CRM se ve afectada.

Ver detalle completo en `13_IMPLEMENTACION_KAIRAS_OS/` (deliverables 00–09).
