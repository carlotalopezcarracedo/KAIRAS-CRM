/**
 * KAIRAS OS — importación Fase B: área COMERCIAL y biblioteca de RECURSOS.
 *
 * Idempotente (externalKey). Solo escribe en tablas os_*.
 * NO inventa contenido: transforma materiales aprobados (Fases 4-5 de oferta y
 * mensaje, sistema de contenidos Fase 7, playbooks, Constitución) en unidades
 * navegables nativas, cada una con fuente, autoridad, fecha y estado. No copia
 * documentos enteros. No duplica: cuando la pieza canónica ya existe en otra
 * área (oferta, comunicación, clientes, playbooks), se ENLAZA por relación en
 * vez de recrearla.
 *
 * Requiere haber ejecutado antes prisma/seed-os.ts (referencia entradas suyas).
 * Ejecutar:  npx tsx prisma/seed-os-fase-b.ts
 */
import { PrismaClient, type OsEntryType, type OsStatus, type OsAuthority, type OsBusinessLine, type OsMessageLayer, type OsRelationType } from "@prisma/client";

const prisma = new PrismaClient();

const sources: Record<string, string> = {};
async function source(key: string, label: string, phase?: string, path?: string, kind?: string) {
  const s = await prisma.knowledgeSource.upsert({
    where: { id: `src_${key}` },
    update: { label, phase, path, kind },
    create: { id: `src_${key}`, label, phase, path, kind },
  });
  sources[key] = s.id;
  return s.id;
}

type EntryInput = {
  key: string; type: OsEntryType; area: string; title: string;
  body?: string; summary?: string; status?: OsStatus; authority?: OsAuthority;
  businessLine?: OsBusinessLine; messageLayer?: OsMessageLayer; sector?: string;
  source?: string; meta?: Record<string, unknown>;
};

async function entry(e: EntryInput) {
  const data = {
    type: e.type, area: e.area, title: e.title,
    body: e.body ?? null, summary: e.summary ?? null,
    status: e.status ?? ("vigente" as OsStatus),
    authority: e.authority ?? ("sistema_permanente" as OsAuthority),
    businessLine: e.businessLine ?? ("L1_automatizacion" as OsBusinessLine),
    messageLayer: e.messageLayer ?? ("na" as OsMessageLayer),
    sector: e.sector ?? null,
    sourceId: e.source ? sources[e.source] ?? null : null,
    meta: (e.meta ?? undefined) as never,
  };
  const row = await prisma.knowledgeEntry.upsert({
    where: { externalKey: e.key }, update: data, create: { externalKey: e.key, ...data },
  });
  await prisma.knowledgeVersion.upsert({
    where: { entryId_version: { entryId: row.id, version: row.currentVersion } },
    update: {},
    create: {
      entryId: row.id, version: row.currentVersion, titleSnapshot: row.title,
      bodySnapshot: row.body, statusSnapshot: row.status, changeReason: "Importación Fase B",
    },
  });
  return row.id;
}

async function relate(fromKey: string, toKey: string, type: OsRelationType, note?: string) {
  const [from, to] = await Promise.all([
    prisma.knowledgeEntry.findUnique({ where: { externalKey: fromKey } }),
    prisma.knowledgeEntry.findUnique({ where: { externalKey: toKey } }),
  ]);
  if (!from || !to || from.id === to.id) return;
  await prisma.knowledgeRelation.upsert({
    where: { fromId_toId_type: { fromId: from.id, toId: to.id, type } },
    update: { note: note ?? null },
    create: { fromId: from.id, toId: to.id, type, note: note ?? null },
  });
}

async function main() {
  await source("com", "Sistema comercial (Fases 4-5 + playbooks)", "Fases 4-5", "09_estrategia_validacion/", "comercial");
  await source("f4", "Arquitectura de oferta v0.2", "Fase 4", "09_estrategia_validacion/arquitectura_oferta_v0_1.md", "oferta");
  await source("f5", "Sistema de mensaje v0.1", "Fase 5", "09_estrategia_validacion/arquitectura_mensaje_v0_1.md", "comunicacion");
  await source("f7", "Sistema de contenidos", "Fase 7", "10_entregables/sistema_contenidos/", "contenido");
  await source("const", "Constitución de KAIRAS", "Fase 9", "00_CONSTITUCION_KAIRAS.md", "constitucion");
  await source("marca", "Documento maestro de marca", "Marzo 2026", "01_marca_y_estrategia/", "marca");

  const SP: OsAuthority = "sistema_permanente";
  const C: OsAuthority = "constitucion";

  // ============================= COMERCIAL =================================
  await entry({ key: "com2-embudo", type: "definicion", area: "comercial", authority: SP, source: "com", sector: "estetica",
    title: "El embudo comercial de KAIRAS", summary: "Cualificación → descubrimiento → chequeo → diagnóstico (Mapa) → propuesta → cierre → seguimiento → reactivación.",
    body: "El recorrido comercial completo, de menor a mayor compromiso. Cada etapa tiene su artefacto (guion, cuestionario, playbook) enlazado. La captación (marketing) NO forma parte de esta línea: aquí solo se trabaja lo que ya entra (inbound + base cualificada).\n\n1) Cualificación (¿es ICP?) · 2) Descubrimiento (investigar el dolor) · 3) Chequeo de Fugas (gratuito) · 4) Diagnóstico = Mapa de Fugas (de pago) · 5) Propuesta · 6) Cierre · 7) Seguimiento comercial · 8) Reactivación de fríos.",
    meta: { etapas: ["cualificacion", "descubrimiento", "chequeo", "diagnostico", "propuesta", "cierre", "seguimiento", "reactivacion"], regla: "jerarquía de valor: clientes > ingresos > propuestas > llamadas > leads" } });

  await entry({ key: "com2-cualificacion", type: "playbook", area: "comercial", authority: C, source: "const", sector: "estetica",
    title: "Cualificación comercial (¿es ICP?)", summary: "Gate de entrada: centro de estética Vigo-Pontevedra que cumple ≥5 de 8 (valoraciones obligatoria).",
    body: "Antes de invertir tiempo, confirmar encaje con el ICP. Puerta: hace valoraciones/presupuestos (obligatoria) y cumple ≥5 de 8 condiciones. Si no cumple, ver criterios de rechazo.",
    meta: {
      goal: "Decidir si el prospecto es ICP antes de avanzar",
      criterios: ["hace valoraciones/presupuestos (obligatoria)", "ticket ≥150 €", "≥10 consultas/día", "seguimiento manual o inexistente", "no sabe cuántas pierde", "decisora accesible", "ya paga software/publicidad/recepción", "el problema toca ingresos/tiempo/atención"],
      umbral: "≥5 de 8", definitionOfDone: "Prospecto marcado ICP / no-ICP con motivo",
    } });

  await entry({ key: "com2-rechazo", type: "regla", area: "comercial", authority: SP, source: "const", sector: "estetica",
    title: "Criterios de rechazo / descualificación", summary: "Walk-in de bajo ticket sin consulta, franquicias corporativas, <5 valoraciones/mes, o problema que no toca ingresos/tiempo.",
    body: "Descualificar (con honestidad y sin quemar la relación) cuando: servicio walk-in de bajo ticket sin consulta previa; decisión corporativa de franquicia (cuenta especial aparte); <5 valoraciones/mes; el encargo es captación, web/branding activo, datos clínicos, sustitución de personal o «ponerme IA» sin problema comprable. Decir el límite en voz alta es parte de la marca.",
    meta: { accion: "derivar o aparcar con criterio", relacionado: "No-ICP y problemas que NO resuelve" } });

  await entry({ key: "com2-descubrimiento", type: "guion", area: "comercial", authority: SP, source: "f5", messageLayer: "conv", sector: "estetica",
    title: "Guion de descubrimiento comercial", summary: "Investigar, no vender. Escena en pasado, sin inducir. Verbatim-o-nada.",
    body: "Apertura honesta («hoy no vengo a venderte»), contexto del negocio, la escena real en pasado (la del sábado a las 23:30), canales y volumen, valoraciones y presupuestos, decisión y dinero sin soltar tarifa, y cierre: proponer el chequeo solo si hay señal. El playbook detallado de la entrevista está enlazado.",
    meta: { objetivo: "rellenar el tablero de dolor con conversaciones reales", checklist: ["≥2 verbatims", "un número propio", "una objeción", "próximo paso con fecha"] } });

  await entry({ key: "com2-diagnostico", type: "playbook", area: "comercial", authority: SP, source: "f4", status: "provisional", sector: "estetica",
    title: "Diagnóstico: ejecutar el Mapa de Fugas", summary: "Una semana, con los números del centro, presupuesto cerrado. 100% descontable del proyecto.",
    body: "Cómo se ejecuta el diagnóstico de pago: cuestionario, recogida de datos reales del centro, cuantificación de la fuga principal y entrega del Mapa con presupuesto cerrado. Es el producto «Mapa de Fugas» (enlazado) visto como etapa del embudo. Estado provisional: el precio y el encaje se están validando (H4/H10).",
    meta: { plazo: "1 semana", entregable: "fuga cuantificada + presupuesto", estadoValidacion: "provisional (H4/H10)" } });

  await entry({ key: "com2-cierre", type: "playbook", area: "comercial", authority: SP, source: "f4", status: "provisional", sector: "estetica",
    title: "Cierre comercial", summary: "Propuesta de 4 páginas, máx. 2 opciones, caducidad 14 días, pago 50/50 con hito, fecha de decisión.",
    body: "Presentar la propuesta con los números del cliente delante, máximo dos opciones, garantías admisibles (nunca ROI/ingresos), caducidad de 14 días y una fecha de decisión pactada. Pago 50% al empezar, 50% con hito. El detalle de garantías está enlazado.",
    meta: { reglas: ["máx. 2 opciones", "caducidad 14 días", "50/50 con hito", "fecha de decisión"], prohibido: "garantizar ingresos, citas o ROI" } });

  await entry({ key: "com2-seguimiento", type: "playbook", area: "comercial", authority: SP, source: "f5", sector: "estetica",
    title: "Seguimiento comercial post-propuesta", summary: "El silencio no es un no. Perseguir la decisión por método, no por memoria.",
    body: "Secuencia de seguimiento tras enviar la propuesta: recordatorio de valor (no de precio), resolución de la última objeción, y confirmación de la fecha de decisión. Aplica al propio negocio la tesis que vendemos: sin seguimiento, la valoración se enfría.",
    meta: { cadencia: "día 2, día 5, día 10 (antes de caducar)", tono: "cercano, sin presión, con la escena del cliente" } });

  await entry({ key: "com2-reactivacion", type: "playbook", area: "comercial", authority: SP, source: "f5", status: "provisional", sector: "estetica",
    title: "Reactivación de leads fríos", summary: "Volver a abrir conversaciones paradas con un ángulo nuevo, no con «¿lo has pensado?».",
    body: "Reabrir prospectos parados con un gancho de valor nuevo (un dato del sector, una mejora del producto, un caso de método) en vez de perseguir. Máximo dos intentos; si no hay señal, aparcar sin quemar. Provisional: el guion de reactivación se está afinando.",
    meta: { limite: "2 intentos", angulo: "valor nuevo, nunca insistencia" } });

  await entry({ key: "com2-objeciones-uso", type: "guion", area: "comercial", authority: SP, source: "f5", messageLayer: "conv", sector: "estetica",
    title: "Cómo usar el banco de objeciones", summary: "Validar → explicar diseño → ofrecer prueba → dar un paso pequeño. Nunca discutir.",
    body: "En la conversación, ante una objeción: (1) validar la preocupación, (2) explicar cómo el diseño la resuelve, (3) ofrecer una prueba concreta (ejemplo, ronda de ajuste), (4) proponer un paso pequeño. Las cinco objeciones canónicas (Flowww, robótico, tiempo, precio, datos) están en Comunicación, enlazadas.",
    meta: { estructura: "validar → diseño → prueba → paso pequeño" } });

  await entry({ key: "com2-mensajes-canal", type: "mensaje", area: "comercial", authority: SP, source: "f5", messageLayer: "conv", sector: "estetica",
    title: "Mensajes por canal (WhatsApp · IG · email · teléfono)", summary: "Mismo fondo, forma por canal. WhatsApp/IG dominan la fuga; el teléfono cierra.",
    body: "Adaptación del mensaje por canal: WhatsApp e Instagram para primeras respuestas y seguimiento breve (lenguaje doméstico, de escena); email para la propuesta formal y el resumen del chequeo; teléfono/presencial para descubrimiento y cierre. Prohibido abrir con tecnología o nombres de software en cualquier canal.",
    meta: { whatsapp: "respuesta y seguimiento breve", instagram: "primer contacto inbound", email: "propuesta y resúmenes", telefono: "descubrimiento y cierre" } });

  await entry({ key: "com2-guion-apertura", type: "guion", area: "comercial", authority: SP, source: "f5", messageLayer: "sect", sector: "estetica",
    title: "Guion de apertura (elevator sectorial)", summary: "Para dueña de centro: las consultas y valoraciones que se pierden por el camino.",
    body: "«Trabajo con centros de estética de la zona en las consultas y valoraciones que se pierden por el camino: la del sábado a las 23:30, la que pidió precio y nadie retomó. Monto un circuito para que nada se quede sin respuesta ni seguimiento, con tus textos y una persona siempre a mano, y cada mes te digo cuántas entraron, se cerraron y recuperamos.» Enlaza con el pitch sectorial canónico.",
    meta: { canal: "presencial / teléfono / DM", duracion: "20-30 s" } });

  await entry({ key: "com2-precios-resumen", type: "definicion", area: "comercial", authority: SP, source: "f4", status: "provisional", sector: "estetica",
    title: "Precios vigentes (resumen comercial)", summary: "Chequeo gratis · Mapa 240 € · Seguimiento 890 € · Completo 1.290-1.590 € · Continuo 89-159 €/mes. PROVISIONAL.",
    body: "Cuadro de precios para uso comercial rápido (todos + IVA, todos PROVISIONALES hasta validar H4/H10/H12):\n· Chequeo de Fugas: gratis.\n· Mapa de Fugas: 240 € (100% descontable del proyecto).\n· Sistema Sin Fugas — Seguimiento: 890 €.\n· Completo Esencial: 1.290 €. Completo API/Integrado: desde 1.590 €.\n· Seguimiento Continuo: Base 89 €/mes · Plus desde 159 €/mes, sin permanencia.\nCada línea enlaza con su oferta canónica. No presentar como cerrados.",
    meta: { estadoValidacion: "provisional", nota: "precios sujetos a validación de mercado; no comunicar como definitivos" } });

  // Relaciones comerciales (enlazar, no duplicar)
  await relate("com2-embudo", "com2-cualificacion", "desarrolla");
  await relate("com2-embudo", "of-chequeo", "aplica", "etapa 3 del embudo");
  await relate("com2-embudo", "of-mapa", "aplica", "etapa 4 del embudo");
  await relate("com2-embudo", "of-proyecto", "aplica");
  await relate("com2-embudo", "caso-estersa", "prueba", "prueba de método y sector");
  await relate("com2-embudo", "caso-vaia", "relacionado", "demanda inbound real (anonimizada)");
  await relate("com2-cualificacion", "id-icp", "depende_de");
  await relate("com2-rechazo", "id-no-icp", "depende_de");
  await relate("com2-rechazo", "id-no-resuelve", "relacionado");
  await relate("com2-descubrimiento", "pb-descubrimiento", "desarrolla");
  await relate("com2-diagnostico", "of-mapa", "aplica");
  await relate("com2-diagnostico", "pb-chequeo", "desarrolla");
  await relate("com2-cierre", "pb-propuesta", "desarrolla");
  await relate("com2-cierre", "of-garantias", "aplica");
  await relate("com2-seguimiento", "val-h2", "relacionado");
  await relate("com2-objeciones-uso", "com-obj-flowww", "aplica");
  await relate("com2-objeciones-uso", "com-obj-robotico", "aplica");
  await relate("com2-objeciones-uso", "com-obj-precio", "aplica");
  await relate("com2-objeciones-uso", "com-obj-tiempo", "aplica");
  await relate("com2-objeciones-uso", "com-obj-datos", "aplica");
  await relate("com2-mensajes-canal", "com-voz", "aplica");
  await relate("com2-guion-apertura", "com-pitch-sect", "desarrolla");
  await relate("com2-precios-resumen", "of-chequeo", "relacionado");
  await relate("com2-precios-resumen", "of-mapa", "relacionado");
  await relate("com2-precios-resumen", "of-proyecto", "relacionado");
  await relate("com2-precios-resumen", "of-continuo", "relacionado");

  // ============================== RECURSOS ================================
  const R = (o: Omit<EntryInput, "area">) => entry({ ...o, area: "recursos", type: o.type ?? "recurso" });

  await R({ key: "rec-plantilla-reel", type: "recurso", source: "f7", sector: "estetica",
    title: "Plantilla · Reel «La que se escapó»", summary: "Estructura de 5 bloques para el reel de escena semanal.",
    body: "GANCHO (0-2 s): una frase de escena en pasado.\nESCENA (2-8 s): qué pasó (la valoración del sábado a las 23:30).\nGIRO (8-14 s): el coste invisible (lo que se escapó).\nSOLUCIÓN (14-22 s): el sistema, en una frase, con tus palabras.\nCIERRE/CTA (22-30 s): pregunta abierta o «te digo cuántas fueron».",
    meta: { uso: "Serie semanal en Reels/TikTok", cuandoNoUsar: "Si no hay una escena real y concreta detrás", formato: "vertical 9:16, 20-30 s" } });

  await R({ key: "rec-carrusel-3senales", type: "recurso", source: "f7", sector: "estetica",
    title: "Estructura de carrusel «3 señales»", summary: "5 slides. Formato con CTR validado del 3,5% en frío.",
    body: "Slide 1: titular con promesa concreta («3 señales de que se te escapan valoraciones»).\nSlide 2-4: una señal por slide, con micro-escena.\nSlide 5: qué hacer + CTA (chequeo).\nRegla: una idea por slide, mucho aire, morado solo como acento.",
    meta: { uso: "Carrusel educativo de captación de atención", cuandoNoUsar: "Para temas que exigen matices largos", evidencia: "CTR 3,5% en frío (formato validado)" } });

  await R({ key: "rec-cuestionario-chequeo", type: "recurso", source: "f4", sector: "estetica",
    title: "Cuestionario previo del Chequeo (6 preguntas)", summary: "Se envía antes de la llamada de 20-25 min.",
    body: "1) ¿Cuántas valoraciones/presupuestos haces a la semana?\n2) ¿Qué pasa después de una valoración? ¿Quién y cómo hace seguimiento?\n3) ¿Por qué canal entran la mayoría de consultas?\n4) ¿Cuántas consultas dirías que quedan sin responder a tiempo?\n5) ¿Qué usas hoy (software, recepción, agenda)?\n6) ¿Qué te gustaría que dejara de pasar?",
    meta: { uso: "Preparar el Chequeo de Fugas gratuito", cuandoNoUsar: "Con prospectos aún sin cualificar como ICP" } });

  await R({ key: "rec-estructura-propuesta", type: "recurso", source: "f4", sector: "estetica",
    title: "Estructura de propuesta comercial", summary: "4 páginas + 2 anexos. Su espejo → el sistema → inversión → cómo sabremos que funciona → decisión.",
    body: "P1 Su espejo: sus números y su escena.\nP2 El sistema: módulos elegidos, sin catálogo técnico.\nP3 Inversión y garantías: máx. 2 opciones, 50/50, caducidad 14 días.\nP4 Cómo sabremos que funciona: el número mensual.\nAnexos: alcance detallado y protección de datos.",
    meta: { uso: "Redactar y cerrar propuestas", cuandoNoUsar: "Antes de tener los números del cliente", regla: "máx. 2 opciones, fecha de decisión" } });

  await R({ key: "rec-checklist-descubrimiento", type: "recurso", source: "f5", sector: "estetica",
    title: "Checklist de entrevista de descubrimiento", summary: "Qué debes traerte de cada conversación.",
    body: "☐ Al menos 2 verbatims exactos (entre comillas).\n☐ Un número propio del negocio.\n☐ La objeción principal, registrada tal cual.\n☐ Canal dominante de la fuga.\n☐ Próximo paso pactado con fecha.\n☐ ¿Es ICP? sí/no y por qué.",
    meta: { uso: "Durante y después de cada descubrimiento", cuandoNoUsar: "En una llamada de cierre (ya no es descubrimiento)" } });

  await R({ key: "rec-checklist-publicacion", type: "recurso", source: "f7",
    title: "Checklist de publicación de contenido", summary: "Antes de dar por buena una semana del sprint.",
    body: "☐ La pieza nace de una escena o dato real.\n☐ No abre con tecnología ni nombres de software.\n☐ Cifras externas citadas como sector con fuente.\n☐ CTA claro y único.\n☐ Umbrales de la semana: ≥6 conversaciones, ≥3 chequeos, ≥25 respuestas espejo.\n☐ No se reporta alcance/seguidores como éxito.",
    meta: { uso: "Cierre semanal del sprint de contenidos", cuandoNoUsar: "—", regla: "seguidores y alcance no son criterio de éxito" } });

  await R({ key: "rec-guion-reactivacion", type: "guion", source: "f5", messageLayer: "conv", sector: "estetica",
    title: "Guion de reactivación por WhatsApp", summary: "Reabrir con valor nuevo, no con insistencia.",
    body: "«Hola [nombre], me acordé de [centro] porque acabo de ver un dato del sector: [dato con fuente]. Sin compromiso: si te viene bien, te paso en 2 minutos cómo lo estamos resolviendo con otros centros de la zona. ¿Te mando el ejemplo?»\nMáximo dos intentos. Si no hay señal, aparcar.",
    meta: { uso: "Prospecto parado con señal previa", cuandoNoUsar: "Si nunca hubo señal o pidió no insistir", limite: "2 intentos" } });

  await R({ key: "rec-mensaje-outreach", type: "recurso", source: "com", status: "provisional", sector: "estetica",
    title: "Plantilla de mensaje de outreach L1", summary: "Primer contacto a la base cualificada. Personalizado, humano, ofrece el chequeo.",
    body: "Apertura personalizada (algo concreto del centro) → una frase de la escena/fuga → oferta del chequeo gratuito → recepción humana. Sin abrir con IA/automatización. Provisional: pendiente de la prueba de outreach (EXP-OU1).",
    meta: { uso: "Outreach a la base cualificada (canal madre)", cuandoNoUsar: "En agosto / sin personalización", estadoValidacion: "provisional (EXP-OU1)" } });

  await R({ key: "rec-no-hacer", type: "regla", source: "marca", authority: SP,
    title: "Reglas de «no hacer» en comunicación", summary: "Lo que nunca hacemos: abrir con tecnología, prometer ingresos, abusar del morado.",
    body: "· No abrir mensajes con IA/chatbot/automatización/API ni nombres de software.\n· No prometer ingresos, número de citas ni ROI.\n· No usar casos ficticios ni cifras sin medir; estadísticas externas siempre como sector con fuente.\n· No reportar alcance/seguidores como éxito.\n· No abusar del morado ni usar iconos cliché (robots, cerebros, engranajes).\n· No mezclar líneas de negocio (L1/L2/L3) en datos o mensajes.",
    meta: { uso: "Revisión de cualquier pieza o mensaje", cuandoNoUsar: "—", origen: "Constitución + guía de marca" } });

  await R({ key: "rec-recursos-visuales", type: "recurso", source: "marca", authority: SP,
    title: "Recursos visuales permitidos", summary: "Paleta, tipografía y composición. Sin distribuir ficheros de fuente.",
    body: "Paleta: negro base #0d090b, superficies #121015/#18151d, blanco frío #e1e8f0, morado #8b5df5 (acento), lavanda #c7b2ff.\nTipografía: Plus Jakarta Sans (jerarquía por peso). No se empaquetan ni comparten ficheros de fuente.\nComposición: dark premium, mucho aire, titular protagonista, morado como bisturí.",
    meta: { uso: "Diseñar piezas coherentes con la marca", cuandoNoUsar: "Para distribuir tipografías (no se hace)", enlaces: "ver tokens de color en Marca visual" } });

  await R({ key: "rec-estructura-diario", type: "recurso", source: "f7",
    title: "Estructura del «Diario del sistema» (LinkedIn)", summary: "Bitácora de fundadora: aprendizaje real, sin humo.",
    body: "GANCHO: una decisión o error concreto de la semana.\nCONTEXTO: qué intentabas y por qué.\nAPRENDIZAJE: qué cambiaste (con criterio, no moraleja).\nCIERRE: una pregunta honesta a quien lee.\nRegla: construir prueba, no vender.",
    meta: { uso: "Serie de autoridad en LinkedIn", cuandoNoUsar: "Para vender directamente" } });

  await R({ key: "rec-plantilla-story-reto", type: "recurso", source: "f7", sector: "estetica",
    title: "Plantilla de story-reto «¿Cuántas fueron?»", summary: "Story semanal para recoger voz de cliente (VOC).",
    body: "Story 1: pregunta directa con caja de respuesta («¿Cuántas valoraciones crees que se te escapan al mes?»).\nStory 2: revela el dato del sector.\nStory 3: invita al chequeo.\nObjetivo real: recolectar respuestas espejo (categoría VOC), no likes.",
    meta: { uso: "Recolección semanal de VOC", cuandoNoUsar: "Como métrica de vanidad (no contar visualizaciones)", umbral: "≥25 respuestas espejo/semana" } });

  await R({ key: "rec-checklist-cierre", type: "recurso", source: "f4", status: "provisional", sector: "estetica",
    title: "Checklist de cierre comercial", summary: "Antes de dar una propuesta por cerrada.",
    body: "☐ Propuesta con los números del cliente.\n☐ Máximo 2 opciones.\n☐ Garantías admisibles (ninguna de ingresos/ROI).\n☐ Caducidad de 14 días indicada.\n☐ Fecha de decisión pactada.\n☐ Pago 50/50 con hito acordado.",
    meta: { uso: "Revisión final antes de enviar/cerrar", cuandoNoUsar: "—", estadoValidacion: "provisional (precios en validación)" } });

  await R({ key: "rec-cuestionario-diagnostico", type: "recurso", source: "f4", status: "provisional", sector: "estetica",
    title: "Cuestionario del Mapa de Fugas", summary: "Datos que se piden para cuantificar la fuga en el diagnóstico de pago.",
    body: "· Volumen de valoraciones/presupuestos por semana y ticket medio.\n· Tasa estimada de cierre actual.\n· Consultas entrantes por canal y % sin responder a tiempo.\n· Tiempo dedicado hoy al seguimiento manual.\n· Software y funciones ya pagadas sin usar.\nCon esto se estima la fuga en € y se cierra el presupuesto.",
    meta: { uso: "Ejecutar el Mapa de Fugas (diagnóstico)", cuandoNoUsar: "En el chequeo gratuito (versión reducida, 6 preguntas)", estadoValidacion: "provisional" } });

  // Relaciones de recursos
  await relate("rec-plantilla-reel", "cont-serie-s1", "aplica");
  await relate("rec-carrusel-3senales", "cont-serie-s2", "aplica");
  await relate("rec-cuestionario-chequeo", "of-chequeo", "aplica");
  await relate("rec-cuestionario-chequeo", "pb-chequeo", "aplica");
  await relate("rec-estructura-propuesta", "pb-propuesta", "aplica");
  await relate("rec-estructura-propuesta", "com2-cierre", "aplica");
  await relate("rec-checklist-descubrimiento", "pb-descubrimiento", "aplica");
  await relate("rec-checklist-descubrimiento", "com2-descubrimiento", "aplica");
  await relate("rec-checklist-publicacion", "cont-sprint", "aplica");
  await relate("rec-guion-reactivacion", "com2-reactivacion", "aplica");
  await relate("rec-mensaje-outreach", "val-exp-ou1", "aplica");
  await relate("rec-no-hacer", "com-voz", "desarrolla");
  await relate("rec-no-hacer", "marca-direccion", "desarrolla");
  await relate("rec-recursos-visuales", "marca-direccion", "relacionado");
  await relate("rec-estructura-diario", "cont-serie-s7", "aplica");
  await relate("rec-plantilla-story-reto", "cont-serie-s3", "aplica");
  await relate("rec-checklist-cierre", "com2-cierre", "aplica");
  await relate("rec-cuestionario-diagnostico", "com2-diagnostico", "aplica");
  await relate("rec-cuestionario-diagnostico", "of-mapa", "aplica");

  const comercial = await prisma.knowledgeEntry.count({ where: { area: "comercial", deletedAt: null } });
  const recursos = await prisma.knowledgeEntry.count({ where: { area: "recursos", deletedAt: null } });
  const total = await prisma.knowledgeEntry.count({ where: { deletedAt: null } });
  console.log(`✅ Fase B importada. Comercial: ${comercial} · Recursos: ${recursos} · Total OS: ${total}`);
}

main()
  .catch((e) => { console.error("❌ Error Fase B:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
