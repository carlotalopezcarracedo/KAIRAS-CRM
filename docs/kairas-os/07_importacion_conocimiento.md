# 07 · Importación del conocimiento

## Resultado

KAIRAS OS dispone de un corpus normalizado y reproducible de **113 unidades activas**. La importación se divide en tres fases ordenadas y se puede auditar sin escribir datos mediante un comando independiente.

No se importan archivos como bloques opacos. Cada unidad tiene identidad estable (`externalKey`), tipo, área, estado, autoridad, resumen, cuerpo, fuente y snapshot versionado. Las relaciones entre unidades también son explícitas.

## Flujo aplicado

1. **Lectura y extracción.** Las fuentes documentales se revisaron por bloques semánticos: marca, oferta, comunicación, clientes, validación, contenidos, recursos y constitución.
2. **Normalización.** Cada bloque se transformó en una unidad consultable con título operativo, resumen, cuerpo y metadatos específicos.
3. **Clasificación.** Se asignaron `type`, `area`, `status`, `authority`, línea de negocio y capa de mensaje. El estado distingue hechos vigentes, propuestas, condiciones e históricos.
4. **Deduplicación.** `externalKey` es único y las tres fases usan `upsert`; reejecutarlas actualiza la unidad canónica en vez de crear copias.
5. **Trazabilidad.** `sourceId` enlaza cada unidad con etiqueta, fase, ruta y clase de fuente. Cada entrada conserva un snapshot de su versión actual.
6. **Relación.** Las dependencias, pruebas, sustituciones, respuestas y aplicaciones se guardan como relaciones tipadas.
7. **Verificación.** Un control de solo lectura valida identidad, fuente, área, snapshot actual, relaciones reflexivas y posibles títulos duplicados.

## Fases reproducibles

| Orden | Archivo | Cobertura principal |
| --- | --- | --- |
| 1 | `prisma/seed-os.ts` | Constitución, identidad, marca, oferta y núcleo documental |
| 2 | `prisma/seed-os-fase-b.ts` | Sistema comercial, clientes, contenidos, validación, playbooks y recursos |
| 3 | `prisma/seed-os-fase-c.ts` | Antecedentes de abril, logo provisional, CTAs, conciencia, one-pager y bios |

Las fases solo escriben en tablas con prefijo `os_`. No crean claves foráneas hacia CRM, usuarios o autenticación.

## Comandos

Importación completa —escribe en `os_*` y debe ejecutarse solo contra la base prevista:

```bash
npm run db:seed:os
```

Auditoría de solo lectura:

```bash
npm run db:verify:os
```

La importación completa ejecuta automáticamente la auditoría al final y se detiene ante el primer fallo.

## Fuentes y procedencia

El registro de fuentes contiene, entre otras, la Constitución de KAIRAS, documento maestro y guía de marca, arquitectura de oferta, sistema de mensaje, selección de mercado, casos, sistema comercial, contenidos, validación, entregables y el documento estratégico de abril marcado como histórico.

La ruta guardada es procedencia documental, no una dependencia de ejecución. El importador reproduce el corpus ya extraído y revisado que vive en los seeds; no presupone que el árbol documental original esté presente en el servidor.

## Política de actualización

- Una corrección del corpus se realiza sobre la unidad con el mismo `externalKey`.
- Un criterio reemplazado no se borra: cambia a `historico` u `obsoleto` y se relaciona mediante `sustituye`.
- Una edición humana posterior puede ser sobrescrita al reejecutar el seed de su unidad; por ello el seed es la fuente canónica del corpus importado.
- Los avisos por resumen o cuerpo ausente son no bloqueantes cuando la ausencia es deliberada; identidad, fuente, clasificación y snapshot sí bloquean.

