# Modelo de datos — KAIRAS OS

## Decisión

Se conserva el modelo aislado ya desplegado. No se añade una migración porque
las ocho entidades actuales cubren la V1 y una expansión a dieciocho tablas
duplicaría conceptos sin mejorar las tareas de consulta.

No se modifica ninguna tabla del CRM.

## Núcleo persistente

| Modelo Prisma | Tabla | Responsabilidad |
| --- | --- | --- |
| `KnowledgeSource` | `os_knowledge_source` | procedencia, fase, ruta y tipo de fuente |
| `KnowledgeEntry` | `os_knowledge_entry` | unidad canónica de conocimiento |
| `KnowledgeTag` | `os_knowledge_tag` | vocabulario transversal |
| `KnowledgeEntryTag` | `os_knowledge_entry_tag` | relación N:M entrada-etiqueta |
| `KnowledgeRelation` | `os_knowledge_relation` | grafo tipado entre entradas |
| `KnowledgeVersion` | `os_knowledge_version` | historial inmutable |
| `KnowledgeFavorite` | `os_knowledge_favorite` | favoritos por usuaria |
| `KnowledgeView` | `os_knowledge_view` | recientes y frecuencia de uso |
| `KnowledgePermission` | `os_knowledge_permission` | reserva para permisos futuros |

`KnowledgePermission` existe, pero no se activa en la interfaz de esta
iteración. No se crea una falsa capa de permisos que la aplicación aún no
necesita.

## `KnowledgeEntry` como entidad base

Campos estructurales:

- `type`: semántica del contenido;
- `area`: clasificación documental de origen;
- `title`, `summary`, `body`: divulgación progresiva;
- `status`: vigencia;
- `authority`: precedencia;
- `businessLine`, `messageLayer`, `sector`, `funnelStage`,
  `awarenessLevel`, `temperature`, `channel`: facetas operativas;
- `validUntil`: revisión o caducidad explícita;
- `sourceId`, `externalKey`, `contentHash`: trazabilidad e idempotencia;
- `currentVersion`: versión activa;
- `meta`: atributos específicos del tipo;
- `embeddingRef`: reserva no utilizada para búsqueda semántica futura;
- `targetType` + `targetId`: enlace polimórfico no destructivo al contexto
  comercial, sin FK hacia el CRM.

La lectura de índices y listados excluye `body`. El cuerpo completo se obtiene
solo al abrir el detalle.

## Tipos de conocimiento

Los valores de `OsEntryType` permiten representar las necesidades solicitadas
sin tablas separadas:

- identidad y gobierno: `principio`, `regla`, `prohibicion`, `definicion`,
  `posicionamiento`, `icp`, `articulo_constitucion`;
- marca: `regla_marca`, `token_visual`;
- comunicación: `claim`, `mensaje`, `objecion`, `cta`, `guion`;
- oferta: `oferta`, `precio`, `garantia`;
- clientes: `caso`;
- contenidos: `pilar_contenido`, `serie_contenido`, `pieza_contenido`;
- aprendizaje: `hipotesis`, `experimento`, `aprendizaje`, `decision`,
  `riesgo`, `kpi`;
- operación: `playbook`, `recurso`.

## Qué se modela con `meta`

`meta` almacena atributos propios del tipo cuando no justifican una entidad
relacional independiente:

- decisión: motivo, evidencia, quién, sustitución y revisión;
- hipótesis/experimento: métrica, umbral y resultado;
- playbook: prerrequisitos, pasos, checklist, responsable, riesgos y criterio
  de terminado;
- token visual: nombre, HEX, variable CSS y familia;
- comunicación: correcto/incorrecto, respuesta recomendada, canal y contexto;
- contenido: CTA, etapa, canal, reutilización y resultado;
- caso: evidencia, límites de uso y estado publicable.

Regla: un campo asciende desde `meta` a columna o entidad únicamente cuando
necesita integridad referencial, índice propio o consultas frecuentes a escala.

## Equivalencia con entidades estudiadas

| Necesidad solicitada | Implementación |
| --- | --- |
| `KnowledgeEntry` | `KnowledgeEntry` |
| `KnowledgeSection` | configuración de navegación derivada, no persistida |
| `KnowledgeCollection` | área/tipo/facetas; no necesita tabla aún |
| `KnowledgeTag` | `KnowledgeTag` + `KnowledgeEntryTag` |
| `KnowledgeRelation` | `KnowledgeRelation` |
| `KnowledgeSource` | `KnowledgeSource` |
| `KnowledgeVersion` | `KnowledgeVersion` |
| `Decision`, `Hypothesis`, `Experiment`, `Learning`, `Risk` | `KnowledgeEntry.type` + `meta` |
| `Playbook`, `PlaybookStep` | `KnowledgeEntry(type=playbook)` + `meta` |
| `BrandRule`, `VisualAsset` | tipos `regla_marca`, `token_visual`, `recurso` |
| `CommunicationExample` | tipos de comunicación + `meta` |
| `ContentItem` | tipos de contenido |
| `Favorite` | `KnowledgeFavorite` |
| `RecentlyViewed` | consulta derivada de `KnowledgeView` |

## Estados y precedencia

Estados disponibles:

1. `vigente`
2. `provisional`
3. `condicionado`
4. `validado`
5. `borrador`
6. `historico`
7. `obsoleto`
8. `archivado`

Reglas de presentación:

- `obsoleto` y `archivado` no aparecen en vistas operativas por defecto;
- `historico` aparece separado y nunca se presenta como recomendación actual;
- `provisional` y `condicionado` muestran advertencia;
- `validUntil` vencido genera una alerta de revisión;
- la autoridad decide precedencia cuando dos entradas se contradicen.

Orden de autoridad:

```text
constitucion
  > sistema_permanente
  > operativo
  > experimental
  > historico
```

## Relaciones

Tipos disponibles:

- `desarrolla`
- `sustituye`
- `depende_de`
- `valida`
- `refuta`
- `prueba`
- `responde`
- `aplica`
- `deriva_en`
- `relacionado`

Esto permite enlazar, por ejemplo:

```text
Sector estética
  → dolor
  → oferta
  → objeción
  → caso
  → guion
  → propuesta
```

sin duplicar entidades del CRM.

## Búsqueda

La búsqueda textual V1 usa:

- título;
- resumen;
- cuerpo;
- etiquetas;
- sector;
- facetas de canal, embudo, temperatura y línea de negocio;
- campos de contexto de `meta` cuando pueden convertirse de forma segura a
  texto.

`embeddingRef` queda sin uso. No se implementan embeddings ni IA en esta fase.

## Favoritos y recientes

- `KnowledgeFavorite` tiene unicidad por `entryId + userId`.
- `KnowledgeView` registra acceso best-effort.
- la home consulta una muestra limitada de vistas y deriva:
  - vistos recientemente;
  - más usados;
  - recursos contextuales.
- un fallo de telemetría no bloquea la lectura del conocimiento.

## Rendimiento del modelo

- 113 entradas en la base auditada;
- todos los registros tienen `summary`;
- los listados no necesitan leer los 113 cuerpos;
- el índice ligero se deduplica por render;
- detalle, versiones y relaciones se cargan solo por ID;
- no se añade caché compartida entre usuarios para favoritos o vistas.

## Migraciones

No hay migración en este rediseño.

Las migraciones existentes siguen siendo la fuente de verdad:

- `20260714220945_os_knowledge_init`
- `20260715084942_os_entry_add_valid_until`
- `20260715123544_os_knowledge_view`

Rollback de este bloque: revertir el commit documental. No altera datos.
