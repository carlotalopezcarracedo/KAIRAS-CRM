# Decisiones UX — KAIRAS OS

## 1. Home orientada a una pregunta

El encabezado pregunta:

> ¿Qué necesitas saber o hacer hoy?

No presenta KAIRAS OS como repositorio. Presenta cuatro intenciones:

- diseñar;
- escribir;
- vender;
- ejecutar.

Cada intención lleva a una zona operativa.

## 2. Búsqueda antes que exploración

El buscador es la acción principal y mantiene `Cmd/Ctrl + K`. La navegación por
áreas es el segundo camino, no el único.

## 3. Editorial, no dashboard genérico

- encabezados cortos;
- paneles amplios con jerarquía;
- una superficie clara para “salud” como contraste;
- morado reservado a foco y acción;
- listas breves;
- enlaces de detalle con aire;
- sin tablas en la home.

## 4. Un bloque = una decisión

La home limita cada panel a cuatro o cinco elementos. “Ver todo” abre la
sección correspondiente.

Se evita mostrar veinte widgets decorativos.

## 5. Vigencia visible

Estados aparecen junto a decisiones, hipótesis y alertas. La home distingue:

- vigente;
- provisional;
- condicionado;
- pendiente de revisión.

Contenido histórico u obsoleto no aparece como recomendación.

## 6. Continuidad de trabajo

“Visto recientemente” se alimenta de `KnowledgeView`. Si todavía no existen
vistas, usa las últimas actualizaciones como fallback explícito.

Los favoritos tienen un panel propio y no se mezclan con recientes.

## 7. Acción antes que archivo

Los playbooks se presentan como “abrir proceso”, no como documentos. El manual
visual responde “cómo debe verse”, Comunicación “cómo lo decimos” y Oferta
“qué encaja aquí”.

## 8. Progressive disclosure

- home: título y contexto mínimo;
- sección: resumen + facetas + estado;
- detalle: cuerpo, fuente, meta, relaciones y versiones;
- edición: ruta separada.

## 9. Estados vacíos honestos

No se inventan hitos ni KPIs:

- sin fecha de revisión: “Sin próximas revisiones fechadas”;
- sin hipótesis: estado vacío;
- sin favoritos: instrucción para usar la estrella;
- sin métricas ejecutivas almacenadas: solo se muestra salud del conocimiento.

## 10. Responsive

- cuatro accesos pasan de 4 a 2 y 1 columnas;
- paneles pasan de 2 columnas a 1;
- navegación interior usa scroll horizontal en móvil;
- acciones mantienen objetivos táctiles de al menos 32–36 px;
- el contenido no depende de hover.

## 11. Accesibilidad

- regiones `header`, `nav` y `section`;
- etiquetas de navegación;
- estados de carga con `role=status`;
- errores con `role=alert`;
- enlaces nativos;
- foco visible heredado del sistema;
- iconos acompañan texto, no lo sustituyen;
- animaciones respetan la regla global de reduced motion.

## 12. Decisiones descartadas

- no se añade una librería de dashboard;
- no se usa un editor tipo Notion;
- no se carga el cuerpo de las 113 entradas en Inicio;
- no se introduce IA o búsqueda semántica;
- no se personalizan recomendaciones con datos comerciales del CRM;
- no se inventan métricas o hitos ausentes.
