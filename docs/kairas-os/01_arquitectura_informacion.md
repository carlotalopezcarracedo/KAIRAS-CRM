# Arquitectura de información — KAIRAS OS

## Principio

La navegación responde a preguntas de trabajo, no a nombres de archivos ni a
las fases que generaron la documentación.

```text
¿Qué necesito saber o hacer hoy?
  ├─ ¿Cuál es la estrategia completa?          → Estrategia
  ├─ ¿Qué representa KAIRAS?                  → Identidad
  ├─ ¿Cómo debe verse?                        → Manual visual
  ├─ ¿Cómo lo digo?                           → Comunicación
  ├─ ¿Qué vendo y a quién?                    → Oferta y clientes
  ├─ ¿Cómo lo ejecuto?                        → Playbooks
  ├─ ¿Qué sigue vigente y qué aprendimos?     → Decisiones y aprendizaje
  ├─ ¿Qué pieza creo y para qué?              → Contenidos
  ├─ ¿Qué plantilla o activo necesito?        → Recursos
  └─ ¿Qué regla tiene máxima autoridad?       → Constitución
```

## Áreas principales

### 1. Inicio

Pregunta: **¿qué necesito saber o hacer hoy?**

Prioriza:

- búsqueda;
- decisiones vigentes;
- hipótesis activas;
- favoritos;
- vistos recientemente;
- playbooks frecuentes;
- contenido que requiere revisión;
- próximos vencimientos;
- accesos por contexto.

No intenta mostrar todo el repositorio, pero ofrece una entrada prioritaria a
la estrategia ejecutiva.

### 2. Estrategia

Pregunta: **¿cuál es el proyecto completo y qué estamos intentando demostrar?**

Reúne en una sola lectura propósito, foco actual, ICP, problema, límites,
diferenciación, escalera de oferta, precios, embudo, papel de cada canal,
hipótesis, evidencia, riesgo y no negociables. Las fichas quedan como fuentes
opcionales, no como pasos obligatorios para reconstruir el proyecto.

### 3. Identidad

Pregunta: **¿qué representa KAIRAS y qué no?**

Incluye propósito, misión, visión, principios, posicionamiento, diferenciación,
ICP, no-ICP, problemas que resuelve y límites.

### 4. Manual visual

Pregunta: **¿cómo debe verse esta pieza?**

Incluye color, tipografía, logo, dirección de arte, composición, correctos,
incorrectos y pendientes técnicos del manual.

### 5. Comunicación

Pregunta: **¿cómo escribo o respondo esto?**

Incluye voz, tono, claims, CTAs, mensajes por nivel de conciencia, objeciones,
canal y contexto.

### 6. Oferta y clientes

Pregunta: **¿qué oferta encaja y cómo la llevo a propuesta?**

Incluye oferta, precios, garantías, límites, casos, embudo, diagnóstico,
objeciones y seguimiento. No duplica registros comerciales del CRM.

### 7. Playbooks

Pregunta: **¿cómo ejecuto esta tarea sin reinventarla?**

Incluye objetivo, momento de uso, prerrequisitos, pasos, checklist, riesgos,
responsables, criterio de terminado y recursos relacionados.

### 8. Decisiones y aprendizaje

Pregunta: **¿qué está vigente y qué evidencia lo sostiene?**

Incluye decisiones, hipótesis, experimentos, aprendizajes, riesgos y estados
históricos.

### 9. Contenidos

Pregunta: **¿qué pieza debo crear y por qué?**

Incluye pilares, series, sprint, piezas, CTA, canal, etapa, hipótesis,
resultados y reutilización cuando están disponibles.

### 10. Recursos

Pregunta: **¿qué plantilla, guion o activo necesito?**

Incluye plantillas, checklists, cuestionarios, estructuras, enlaces y activos.

### 11. Constitución

Pregunta: **¿qué regla prevalece?**

Incluye principios, prohibiciones, artículos y decisiones constitucionales.
Es accesible pero no domina la home.

## Facetas transversales

Las áreas no son silos. Cada entrada puede cruzarse por:

- estado;
- autoridad;
- tipo;
- sector;
- línea de negocio;
- capa de mensaje;
- canal;
- etapa del embudo;
- temperatura;
- nivel de conciencia;
- fuente;
- etiqueta;
- relación.

## Progressive disclosure

1. La navegación muestra una pregunta y una descripción.
2. Estrategia reúne el contexto transversal sin exigir abrir fichas.
3. Cada sección muestra resúmenes, estado y contexto.
4. El detalle queda disponible como fuente y carga cuerpo, versiones y relaciones.
5. El historial queda detrás de una acción explícita.

Los cuerpos completos no se cargan para construir el índice ni la home.

## Contenido histórico

- No se mezcla con recomendaciones vigentes.
- Identidad, Manual visual y Constitución pueden mostrar antecedentes en un bloque
  secundario.
- El resto de áreas los oculta por defecto.
- `obsoleto` y `archivado` requieren acción explícita para aparecer.

## Arquitectura técnica

La clasificación visible vive en `_sections.ts` y deriva de `area` + `type`.
No se reescriben los datos importados ni se crean colecciones duplicadas.

Esto permite cambiar navegación sin migrar el conocimiento.
