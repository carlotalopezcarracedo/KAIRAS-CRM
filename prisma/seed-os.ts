/**
 * KAIRAS OS — importación inicial del conocimiento (Fase A: núcleo vigente).
 *
 * Idempotente: usa externalKey; reejecutar no duplica.
 * Solo escribe en tablas os_*. No toca el seed del CRM ni sus datos.
 * NO copia documentos enteros: transforma en unidades navegables, con
 * fuente, estado, autoridad y algunas relaciones. Los archivos originales
 * del proyecto de conocimiento NO se tocan (esto es capa de uso).
 *
 * Ejecutar:  npx tsx prisma/seed-os.ts
 */
import { PrismaClient, type OsEntryType, type OsStatus, type OsAuthority, type OsBusinessLine, type OsMessageLayer, type OsRelationType } from "@prisma/client";

const prisma = new PrismaClient();

// -- helpers -----------------------------------------------------------------
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
  key: string;
  type: OsEntryType;
  area: string;
  title: string;
  body?: string;
  summary?: string;
  status?: OsStatus;
  authority?: OsAuthority;
  businessLine?: OsBusinessLine;
  messageLayer?: OsMessageLayer;
  sector?: string;
  hypothesisRef?: string;
  source?: string;
  meta?: Record<string, unknown>;
};

async function entry(e: EntryInput) {
  const data = {
    type: e.type,
    area: e.area,
    title: e.title,
    body: e.body ?? null,
    summary: e.summary ?? null,
    status: e.status ?? ("vigente" as OsStatus),
    authority: e.authority ?? ("operativo" as OsAuthority),
    businessLine: e.businessLine ?? ("transversal" as OsBusinessLine),
    messageLayer: e.messageLayer ?? ("na" as OsMessageLayer),
    sector: e.sector ?? null,
    hypothesisRef: e.hypothesisRef ?? null,
    sourceId: e.source ? sources[e.source] ?? null : null,
    meta: (e.meta ?? undefined) as never,
  };
  const row = await prisma.knowledgeEntry.upsert({
    where: { externalKey: e.key },
    update: data,
    create: { externalKey: e.key, ...data },
  });
  // snapshot v1 si no existe
  await prisma.knowledgeVersion.upsert({
    where: { entryId_version: { entryId: row.id, version: row.currentVersion } },
    update: {},
    create: {
      entryId: row.id,
      version: row.currentVersion,
      titleSnapshot: row.title,
      bodySnapshot: row.body,
      statusSnapshot: row.status,
      changeReason: "Importación inicial",
    },
  });
  return row.id;
}

async function relate(fromKey: string, toKey: string, type: OsRelationType, note?: string) {
  const from = await prisma.knowledgeEntry.findUnique({ where: { externalKey: fromKey } });
  const to = await prisma.knowledgeEntry.findUnique({ where: { externalKey: toKey } });
  if (!from || !to || from.id === to.id) return;
  await prisma.knowledgeRelation.upsert({
    where: { fromId_toId_type: { fromId: from.id, toId: to.id, type } },
    update: { note: note ?? null },
    create: { fromId: from.id, toId: to.id, type, note: note ?? null },
  });
}

async function main() {
  // -- Fuentes (trazabilidad) ------------------------------------------------
  await source("const", "Constitución de KAIRAS", "Fase 9", "00_CONSTITUCION_KAIRAS.md", "constitucion");
  await source("marca", "Documento maestro de marca", "Marzo 2026", "01_marca_y_estrategia/KAIRAS_Documento_Maestro_IA.docx", "marca");
  await source("f4", "Arquitectura de oferta v0.2", "Fase 4", "09_estrategia_validacion/arquitectura_oferta_v0_1.md", "oferta");
  await source("f5", "Sistema de mensaje v0.1", "Fase 5", "09_estrategia_validacion/arquitectura_mensaje_v0_1.md", "comunicacion");
  await source("f7", "Sistema de contenidos", "Fase 7", "10_entregables/sistema_contenidos/", "contenido");
  await source("f8", "Sistema de validación", "Fase 8", "09_estrategia_validacion/sistema_validacion/", "validacion");
  await source("casos", "Casos y clientes", "Fase 1", "05_clientes_y_casos/", "cliente");
  await source("f3", "Selección de mercado", "Fase 3", "09_estrategia_validacion/seleccion_mercado.md", "estrategia");
  await source("redteam", "Red Team", "Fase 10", "(auditoría crítica)", "historico");

  const C: OsAuthority = "constitucion";
  const SP: OsAuthority = "sistema_permanente";

  // ========================= IDENTIDAD Y ESTRATEGIA =========================
  await entry({ key: "id-proposito", type: "principio", area: "identidad", authority: C, source: "const",
    title: "Propósito", summary: "Que los negocios de servicios no pierdan lo que ya se han ganado.",
    body: "KAIRAS existe para que los negocios de servicios no pierdan lo que ya se han ganado: el tiempo, los clientes y las oportunidades que se escapan por falta de sistema. (Constitución, Art. 1)" });
  await entry({ key: "id-mision", type: "principio", area: "identidad", authority: C, source: "const",
    title: "Misión", summary: "Diagnosticar fricciones y construir sistemas de atención, seguimiento y medición sobre las herramientas que ya usan.",
    body: "Diagnosticar fricciones operativas reales en pymes de servicios y construir, sobre las herramientas que ya usan, sistemas de atención, seguimiento y medición que reduzcan carga manual y conviertan fugas invisibles en números visibles. (Art. 2)" });
  await entry({ key: "id-vision", type: "principio", area: "identidad", authority: C, source: "const",
    title: "Visión", summary: "Referencia en Galicia en optimización operativa con resultados medidos, no prometidos.",
    body: "Ser la referencia en Galicia —y después fuera— en optimización operativa aplicada a negocios reales: una marca con criterio, presencia local y resultados medidos, no prometidos. (Art. 3)" });
  await entry({ key: "id-principios", type: "principio", area: "identidad", authority: C, source: "const",
    title: "Principios", summary: "Claridad · Utilidad · Criterio · Control · Elegancia contenida · Resultado medido · Honestidad de prueba.",
    body: "Claridad (si no se entiende, está mal planteado) · Utilidad · Criterio (ni opinión hueca ni humo) · Control · Elegancia contenida · Orientación a resultado medido · Honestidad de prueba (nada se afirma sin evidencia; los límites se dicen en voz alta). (Art. 4)" });
  await entry({ key: "id-filosofia", type: "principio", area: "identidad", authority: C, source: "const",
    title: "Filosofía operativa", summary: "KAIRAS no opina: apuesta, mide y decide por regla escrita antes de ver el resultado.",
    body: "La jerarquía de valor de toda actividad es: clientes cerrados > ingresos > propuestas > llamadas cualificadas > leads > conversaciones > acciones de intención > alcance. Ninguna decisión invierte este orden. (Art. 5)" });
  await entry({ key: "id-posicionamiento", type: "posicionamiento", area: "identidad", authority: C, source: "const",
    title: "Posicionamiento corporativo", summary: "Optimización operativa y automatización aplicada para pymes de servicios.",
    body: "Categoría: optimización operativa y automatización aplicada para pymes de servicios. Eje verbal: «Lo que entra en tu negocio no debería perderse». La marca corporativa nunca queda capturada por un vertical. (Art. 7)" });
  await entry({ key: "id-diferenciacion", type: "posicionamiento", area: "identidad", authority: C, source: "const",
    title: "Diferenciación", summary: "Presencia local · diagnóstico con números del cliente antes de vender · honestidad de alcance · el número mensual.",
    body: "Cuatro hechos verificables, no adjetivos: (1) presencia local y presencial en Galicia; (2) diagnóstico con los números del cliente antes de vender; (3) honestidad de alcance por escrito; (4) el número mensual como entregable. El enemigo comercial es el caos normalizado. (Art. 9)" });
  await entry({ key: "id-icp", type: "icp", area: "identidad", authority: C, source: "const", sector: "estetica",
    title: "Cliente ideal (ICP)", summary: "Centro de estética de Vigo-Pontevedra que cumple ≥5 de 8 condiciones (valoraciones obligatoria).",
    body: "Centro de estética o medicina estética de Vigo-Pontevedra que cumple ≥5 de 8: (1) hace valoraciones/presupuestos [obligatoria]; (2) ticket ≥150 €; (3) ≥10 consultas/día; (4) seguimiento manual o inexistente; (5) no sabe cuántas pierde; (6) decisora accesible; (7) ya paga software/publicidad/recepción; (8) el problema le toca ingresos/tiempo/atención. (Art. 10)",
    meta: { obligatoria: "hace valoraciones/presupuestos", minimo: "5 de 8" } });
  await entry({ key: "id-no-icp", type: "icp", area: "identidad", authority: C, source: "const", sector: "estetica",
    title: "No-ICP", summary: "Walk-in de bajo ticket sin consulta previa, franquicias corporativas, centros con <5 valoraciones/mes.",
    body: "No-ICP: servicios walk-in de bajo ticket sin consulta previa; franquicias de decisión corporativa (cuentas especiales aparte); centros con <5 valoraciones/mes. (Art. 10)" });
  await entry({ key: "id-resuelve", type: "definicion", area: "identidad", authority: C, source: "const",
    title: "Problemas que resuelve", summary: "Consultas sin responder a tiempo, valoraciones que se enfrían, citas sin confirmar, funciones ya pagadas sin operar, la ceguera del dato.",
    body: "Consultas que entran y no se responden a tiempo; valoraciones y presupuestos que se enfrían sin seguimiento; citas sin confirmar y huecos sin recolocar; información y funciones ya pagadas que nadie opera; la ceguera sobre cuánto de todo eso ocurre cada mes. (Art. 11)" });
  await entry({ key: "id-no-resuelve", type: "definicion", area: "identidad", authority: C, source: "const",
    title: "Problemas que NO resuelve", summary: "Captación/publicidad, web y branding activos (solo inbound), datos clínicos, sustitución de personal, 'ponerme IA' sin problema.",
    body: "No resuelve: captación de clientes nuevos (marketing); diseño web y branding como servicio activo (L2/L3 solo inbound, suelos 600/1.500 €); gestión de datos clínicos; sustitución de personal; «ponerme IA» sin problema comprable detrás. (Art. 12)" });

  // ============================ MARCA VISUAL ================================
  const brandTokens: [string, string, string, string][] = [
    ["ink", "Negro base", "#0d090b", "--color-ink"],
    ["surface", "Superficie / cards", "#121015", "--color-surface"],
    ["raise", "Superficie elevada", "#18151d", "--color-raise"],
    ["foam", "Blanco frío", "#e1e8f0", "--color-foam"],
    ["violet", "Morado KAIRAS", "#8b5df5", "--color-violet"],
    ["lavender", "Lavanda", "#c7b2ff", "--color-lavender"],
  ];
  for (const [k, name, hex, cssVar] of brandTokens) {
    await entry({ key: `marca-color-${k}`, type: "token_visual", area: "marca", authority: SP, source: "marca",
      title: `${name} · ${hex}`, summary: `${cssVar} — ${hex}`,
      body: `Token de color de marca. Usar mediante la variable ${cssVar}. El morado es acento (bisturí), nunca color dominante.`,
      meta: { kind: "color", name, hex, cssVar } });
  }
  await entry({ key: "marca-tipografia", type: "regla_marca", area: "marca", authority: SP, source: "marca",
    title: "Tipografía · Plus Jakarta Sans", summary: "Display 800 · Heading 700 · Label 600 uppercase · Body 400-500.",
    body: "Tipografía oficial: Plus Jakarta Sans. Jerarquía por peso, escala y aire, no por adornos. (No se empaquetan ni comparten ficheros de fuente.)",
    meta: { kind: "tipografia", pesos: "400/500/600/700/800" } });
  await entry({ key: "marca-direccion", type: "regla_marca", area: "marca", authority: SP, source: "marca",
    title: "Dirección de arte", summary: "Dark premium, mucho aire, titular protagonista, morado como acento.",
    body: "Dark premium, minimalismo cinematográfico, mucho espacio negativo, tipografía protagonista, morado como bisturí. Prohibido: robots, cerebros, engranajes, futurismo barato, abuso del morado.",
    meta: { kind: "composicion", do: "aire, jerarquía, contraste", dont: "iconos cliché, ruido visual" } });

  // ============================ COMUNICACIÓN ================================
  await entry({ key: "com-claim-corp", type: "claim", area: "comunicacion", authority: SP, source: "f5", messageLayer: "corp", status: "provisional",
    title: "Claim corporativo · «Lo que entra en tu negocio no debería perderse»", summary: "Eje corporativo.",
    body: "Lo que entra en tu negocio no debería perderse.", meta: { copyText: "Lo que entra en tu negocio no debería perderse.", layer: "corp" } });
  await entry({ key: "com-claim-prod", type: "claim", area: "comunicacion", authority: SP, source: "f5", messageLayer: "prod", status: "provisional", sector: "estetica",
    title: "Claim de producto · «Que ninguna valoración se quede en el aire»", summary: "Claim del producto de seguimiento.",
    body: "Que ninguna valoración se quede en el aire.", meta: { copyText: "Que ninguna valoración se quede en el aire.", layer: "prod" } });
  await entry({ key: "com-voz", type: "definicion", area: "comunicacion", authority: SP, source: "f5",
    title: "Voz y tono", summary: "Clara, directa, doméstica, de escena. Sin humo. Prohibido abrir con tecnología.",
    body: "Lenguaje doméstico y de escena (las 23:30, el sábado, «se quedó en el aire»). Prohibido abrir con IA/chatbot/automatización/API/nombres de software. «Fugas» dosificado. Cifras externas siempre como sector con fuente.",
    meta: { si: "tiempo, orden, sistema, seguimiento, fuga, número, escena", no: "revolución, disrupción, 360, IA como reclamo" } });
  // Objeciones (banco v0.1)
  const objeciones: [string, string, string][] = [
    ["flowww", "Ya tengo Flowww / un programa", "No te lo cambio: lo completo. Tu programa manda recordatorios; no conversa con la consulta nueva ni persigue el presupuesto en el aire. Y muchos módulos que pagas están sin configurar."],
    ["robotico", "Va a sonar robótico", "Los textos los apruebas tú frase por frase; lo delicado pasa siempre a una persona; primer mes con dos rondas de ajuste. Te enseño una conversación de ejemplo antes de firmar."],
    ["tiempo", "No tengo tiempo para implantarlo", "Tu parte son ~6 horas en un mes. El resto lo hago yo, incluido operar el circuito el primer mes."],
    ["precio", "Es caro", "Comparémoslo con lo que ya se te va: 3 valoraciones frías al mes son cientos de euros. Pago mitad al empezar, mitad cuando funciona. Si aprieta, empezamos por un flujo."],
    ["datos", "¿Y la protección de datos?", "El circuito solo toca logística (nombre, teléfono, servicio, fecha). Historiales, jamás. Contrato de encargado de tratamiento, datos en la UE."],
  ];
  for (const [k, title, resp] of objeciones) {
    await entry({ key: `com-obj-${k}`, type: "objecion", area: "comunicacion", authority: SP, source: "f5", messageLayer: "conv", sector: "estetica",
      title: `Objeción · ${title}`, summary: resp.slice(0, 110) + "…", body: resp,
      meta: { objecion: title, respuesta: resp, estructura: "validar → diseño → prueba → paso pequeño" } });
  }
  await entry({ key: "com-pitch-sect", type: "mensaje", area: "comunicacion", authority: SP, source: "f5", messageLayer: "sect", sector: "estetica",
    title: "Elevator pitch sectorial", summary: "Para dueña de centro de estética.",
    body: "Trabajo con centros de estética de la zona en las consultas y valoraciones que se pierden por el camino: la del sábado a las 23:30, la que pidió precio y nadie retomó. Monto un circuito para que nada se quede sin respuesta ni seguimiento, con tus textos y una persona siempre a mano — y cada mes te digo cuántas entraron, se cerraron y recuperamos." });

  // ============================== OFERTA ===================================
  await entry({ key: "of-chequeo", type: "oferta", area: "oferta", authority: SP, source: "f4", status: "provisional", hypothesisRef: "H10",
    title: "Chequeo de Fugas (entrada gratuita)", summary: "Llamada de 20-25 min con cuestionario previo. 1 fuga + 1 siguiente paso.",
    body: "Gratuito. Llamada de 20-25 min con cuestionario previo; entrega una fuga y un siguiente paso. Presencial solo cuentas prioritarias.",
    meta: { precio: "gratis", plazo: "20-25 min", estadoValidacion: "provisional (H10)" } });
  await entry({ key: "of-mapa", type: "oferta", area: "oferta", authority: SP, source: "f4", status: "provisional", hypothesisRef: "H10",
    title: "Mapa de Fugas (diagnóstico de pago)", summary: "240 € + IVA, 1 semana, presupuesto cerrado. 100% descontable del proyecto.",
    body: "240 € + IVA. Una semana. La fuga cuantificada con los números del centro y presupuesto cerrado. 100% descontable del proyecto en ≤30 días. Garantía verificable de entregable.",
    meta: { precio: "240 € + IVA", plazo: "1 semana", descontable: true, estadoValidacion: "provisional (H4/H10)" } });
  await entry({ key: "of-proyecto", type: "oferta", area: "oferta", authority: SP, source: "f4", status: "provisional", hypothesisRef: "H4",
    title: "Sistema Sin Fugas (proyecto)", summary: "Seguimiento 890 € · Completo Esencial 1.290 € · Completo API/Integrado desde 1.590 €.",
    body: "Seguimiento 890 € (690-1.090). Completo Esencial 1.290 € (semi-manual, tope 26 h, sin API). Completo API/Integrado desde 1.590 €. Núcleo: seguimiento de valoraciones + contador de fugas; atención conversacional como ampliación. Pago 50/50 con hito.",
    meta: { seguimiento: "890 €", completoEsencial: "1290 €", completoIntegrado: "desde 1590 €", estadoValidacion: "provisional (H4/H5)" } });
  await entry({ key: "of-continuo", type: "oferta", area: "oferta", authority: SP, source: "f4", status: "provisional", hypothesisRef: "H12",
    title: "Seguimiento Continuo (recurrencia)", summary: "Base 89 €/mes · Plus desde 159 €/mes. Sin permanencia.",
    body: "Base 89 €/mes (1 h, sin plataforma). Plus desde 159 €/mes (2 h, plataforma a coste real). Exceso 45 €/h pre-aprobado. Sin permanencia. Contador de fugas mensual como entregable.",
    meta: { base: "89 €/mes", plus: "desde 159 €/mes", permanencia: "sin", estadoValidacion: "provisional (H12/H4b)" } });
  await entry({ key: "of-garantias", type: "garantia", area: "oferta", authority: SP, source: "f4",
    title: "Garantías admisibles", summary: "Funcionamiento (SLA) · 50/50 por hito · 2 rondas de ajuste 30 días · sin permanencia. Nunca ROI/ingresos.",
    body: "Permitidas: entregable verificable del Mapa; pago 50/50 con hito; garantía de funcionamiento tipo SLA; dos rondas de ajuste en 30 días; piloto de rescate; sin permanencia. Prohibidas: ingresos, nº de citas, ROI, devolución ilimitada, urgencia falsa." });

  // ========================== CLIENTES Y CASOS =============================
  await entry({ key: "caso-estersa", type: "caso", area: "clientes", authority: SP, source: "casos", status: "condicionado", sector: "estetica",
    title: "Estersa — clínica médico-estética (Pontevedra)", summary: "Coordinación de información de pacientes. En implantación. Prueba de método/sector, NO de la oferta de seguimiento. Sin cifras hasta permiso.",
    body: "Problema: información de pacientes repartida entre el programa de gestión, documentos y memoria. Solución: capa que unifica y clasifica fichas. Estado: Fase 1 cerrada (490 € + IVA), Fase 2 en implantación avanzada (🔄). Resultados: cualitativos; falta medir tiempo/errores. Es prueba de método y sector, NO de la oferta de seguimiento de valoraciones. Sin nombre ni cifras en público hasta permiso.",
    meta: { publication: "interno", resultKind: "en_curso", inversion: "490 € + IVA (F1)", permisoPublicacion: "pendiente" } });
  await entry({ key: "caso-vaia", type: "caso", area: "clientes", authority: SP, source: "casos", status: "provisional", sector: "otro",
    title: "Vaia Pelos — peluquería canina", summary: "Demanda inbound espontánea (llegó por ChatGPT). Propuesta 390 € pendiente de cierre.",
    body: "Pidió automatización de WhatsApp con derivación humana («sin perder el trato cercano»). Llegó buscando en ChatGPT soluciones en Galicia. Propuesta de 390 € tras reunión presencial; pendiente de cierre. Historia de demanda publicable (sin cifras).",
    meta: { publication: "anonimizado", resultKind: "ninguno", origen: "ChatGPT / LLM", estado: "propuesta pendiente" } });
  await entry({ key: "caso-serea", type: "caso", area: "clientes", authority: SP, source: "casos", status: "historico",
    title: "Serea / Laura Pérez — branding (L2/L3)", summary: "Cierre de 2.100 € + IVA (pack marca/web/campaña). Línea branding, no L1.",
    body: "Cierre de 2.100 € + IVA por un pack de marca/materiales/campaña. Pertenece a la línea de branding (L3), no a la oferta de automatización (L1). Valida el patrón conversación→diagnóstico→propuesta con ticket alto.",
    businessLine: "L3_branding", meta: { publication: "interno", resultKind: "medido", inversion: "2.100 € + IVA", linea: "L3 branding" } });

  // ============================= CONTENIDOS ================================
  const pilares: [string, string, string][] = [
    ["1", "«Lo que se escapa» — el dinero invisible", "Hacer visible la fuga económica. Conciencia 1-2. Valida H1/H2."],
    ["2", "«El después» — seguimiento como sistema", "El silencio no es un no; perseguir no es memoria, es método. H2/H12."],
    ["3", "«Con tus palabras» — lo humano como diseño", "Desactiva la objeción robótica. H8/H3/H11."],
    ["4", "«Trabajo real» — método, casos, bitácora", "Construir prueba. H9/H7/H5."],
    ["5", "«La puerta» — oferta y conversión sin humo", "La escalera visible. H10/H4/H6."],
  ];
  for (const [n, title, body] of pilares) {
    await entry({ key: `cont-pilar-${n}`, type: "pilar_contenido", area: "contenidos", authority: SP, source: "f7", sector: "estetica",
      title: `Pilar ${n} · ${title}`, summary: body, body });
  }
  const series: [string, string, string][] = [
    ["s1", "«La que se escapó»", "Reel de escena, semanal. Columna vertebral."],
    ["s3", "«¿Cuántas fueron?»", "Story-reto semanal. Recolección de VOC (categoría Espejo)."],
    ["s7", "«Diario del sistema»", "Bitácora de fundadora en LinkedIn."],
    ["s2", "«3 señales»", "Formato validado (CTR 3,5% en frío)."],
  ];
  for (const [k, title, body] of series) {
    await entry({ key: `cont-serie-${k}`, type: "serie_contenido", area: "contenidos", authority: SP, source: "f7", sector: "estetica",
      title: `Serie ${title}`, summary: body, body });
  }
  await entry({ key: "cont-sprint", type: "definicion", area: "contenidos", authority: SP, source: "f7", status: "provisional",
    title: "Sprint de 6 semanas (v0.1)", summary: "Fundación → El número → Mecanismo humano → Trabajo real → Objeciones y puerta → Cierre.",
    body: "Semanas: 1 Fundación · 2 El número · 3 Mecanismo humano · 4 Trabajo real · 5 Objeciones y puerta · 6 Cierre. Umbrales: ≥6 conversaciones, ≥3 chequeos, ≥25 respuestas espejo. Seguidores/alcance NO se reportan como éxito." });

  // ============================= VALIDACIÓN ================================
  const hipotesis: [string, string, string, string][] = [
    ["H1", "El dolor se verbaliza sin ayuda", "≥60% lo menciona espontáneamente", "estetica"],
    ["H2", "La fuga mayor son las valoraciones sin seguimiento", "≥50% reconoce valoraciones sin cierre y sin proceso", "estetica"],
    ["H3", "WhatsApp es el canal dominante de la fuga", "≥60% declara WhatsApp/IG dominante", "estetica"],
    ["H4", "El proyecto se vende en 890-1.290 €", "≥2 propuestas aceptadas en rango", "estetica"],
    ["H8", "La objeción nº1 es el miedo a perder el trato humano", "ranking de objeciones verbatim", "estetica"],
    ["H10", "El chequeo gratuito convierte a diagnóstico de pago", "≥50% acepta chequeo y ≥25% avanza", "estetica"],
    ["H12", "Hay apetito por la recurrencia", "la cuota se percibe natural en los cierres", "estetica"],
  ];
  for (const [code, statement, threshold, sector] of hipotesis) {
    await entry({ key: `val-${code.toLowerCase()}`, type: "hipotesis", area: "validacion", authority: SP, source: "f8", sector, hypothesisRef: code, status: "provisional",
      title: `${code} · ${statement}`, summary: `Umbral: ${threshold}`,
      body: `Hipótesis viva. ${statement}. Umbral de confirmación: ${threshold}. Estado: en validación (aún sin datos de campo).`,
      meta: { code, statement, threshold, state: "en_curso" } });
  }
  await entry({ key: "val-exp-ou1", type: "experimento", area: "validacion", authority: SP, source: "f8", status: "provisional", sector: "estetica",
    title: "EXP-OU1 · Outreach a la base cualificada (canal madre)", summary: "≥10% respuesta y ≥5 conversaciones/semana en la semana 6.",
    body: "Mensaje L1 personalizado a ~99 fichas cualificadas (Notion), chequeo gratuito, recepción humana. Éxito: ≥10% respuesta y ≥5 conversaciones cualificadas/semana. Fracaso: <5% con 2 variantes → diagnosticar mensaje vs. sector antes de abandonar.",
    meta: { code: "EXP-OU1", area: "outreach", state: "propuesto", ifSuccess: "escalar + ampliar lista (SERGAS)", ifFail: "pivotar subsector o ángulo" } });
  await entry({ key: "val-decision-vertical", type: "decision", area: "validacion", authority: SP, source: "f3",
    title: "Decisión · Vertical prioritario = estética (Vigo-Pontevedra)", summary: "Estética 302/400 en la matriz; fisio secundario (275).",
    body: "Qué: subsector prioritario = clínicas/centros de estética Vigo-Pontevedra. Por qué: 302/400 en matriz de 20 criterios; encaje con Estersa, Flowww y base cualificada. Evidencia: Fase 3. Reversible: sí (revisión trimestral). Sustituye: la dispersión sectorial previa.",
    meta: { decidedAt: "2026-07-13", why: "matriz 302/400 + activos reales", reversible: true } });
  await entry({ key: "val-riesgo-agosto", type: "riesgo", area: "validacion", authority: SP, source: "redteam", status: "provisional",
    title: "Riesgo · Validación en agosto (estacionalidad)", summary: "Alta prob./alto impacto. Riesgo de falsa refutación.",
    body: "Lanzar la prueba de demanda en agosto puede dar respuesta baja y una FALSA refutación de H-outreach que dispare pivotes en septiembre. Señalado por el Red Team. Mitigación: diagnóstico en agosto, arranque en septiembre.",
    meta: { probability: "alta", impact: "alto", mitigation: "diagnóstico ahora, arranque septiembre" } });

  // ============================== PLAYBOOKS ================================
  await entry({ key: "pb-descubrimiento", type: "playbook", area: "playbooks", authority: SP, source: "f5",
    title: "Playbook · Entrevista de descubrimiento", summary: "Investigar, no vender. Verbatim-o-nada. Cortesía ≠ señal.",
    body: "Objetivo: rellenar el tablero H1-H12 con conversaciones reales. No es venta.",
    meta: {
      goal: "Investigar el dolor real sin inducir",
      whenToUse: "Primeras 10-15 conversaciones con dueñas de centro",
      whenNotToUse: "Cuando ya hay señal clara y toca proponer",
      steps: ["Apertura honesta (no vender hoy)", "Contexto del negocio", "La escena real (en pasado, sin inducir)", "Canales y volumen", "Valoraciones y presupuestos", "Decisión y dinero (sin tarifa)", "Cierre: chequeo solo si hay señal"],
      checklist: ["≥2 verbatims exactos", "número propio", "objeción registrada", "próximo paso con fecha"],
      definitionOfDone: "Ficha de conversación registrada con verbatims y resultado",
    } });
  await entry({ key: "pb-chequeo", type: "playbook", area: "playbooks", authority: SP, source: "f4",
    title: "Playbook · Chequeo de Fugas", summary: "Llamada 20-25 min: 1 fuga cuantificada + 1 siguiente paso.",
    body: "Objetivo: entregar valor y cualificar; abrir la escalera.",
    meta: {
      goal: "Estimar la fuga con los números del centro y proponer el siguiente paso",
      whenToUse: "Prospecto con señal de dolor",
      steps: ["Cuestionario previo de 6 preguntas", "Llamada de 20-25 min", "Estimar 1 fuga con sus números", "Recomendación de titular", "Invitar al Mapa si procede"],
      checklist: ["número del centro estimado", "fuga principal identificada", "siguiente paso pactado"],
      definitionOfDone: "Resumen enviado + estado en hoja comercial",
    } });
  await entry({ key: "pb-propuesta", type: "playbook", area: "playbooks", authority: SP, source: "f4",
    title: "Playbook · Propuesta comercial", summary: "4 páginas + 2 anexos, máx. 2 opciones, caducidad 14 días, fecha de decisión.",
    body: "Objetivo: cerrar con los números del cliente delante.",
    meta: {
      goal: "Presentar la oferta con sus datos y una decisión con fecha",
      steps: ["Su espejo (sus números)", "El sistema (módulos elegidos, sin catálogo técnico)", "Inversión y garantías", "Cómo sabremos que funciona", "Fecha de decisión"],
      checklist: ["números del centro", "máx. 2 opciones", "caducidad 14 días", "fecha de decisión pactada"],
      definitionOfDone: "Propuesta registrada con importe y caducidad",
    } });

  // ========================= CONSTITUCIÓN (gobierno) =======================
  await entry({ key: "const-jerarquia", type: "prohibicion", area: "constitucion", authority: C, source: "const",
    title: "No negociable · Jerarquía de métricas", summary: "Clientes > ingresos > propuestas > llamadas > leads > conversaciones > intención > alcance.",
    body: "Nunca se reporta alcance como éxito. Seguidores, alcance, impresiones y likes están prohibidos como criterio de decisión. (Constitución, T.VIII Art. 39-40; T.VI)" });
  await entry({ key: "const-lineas", type: "prohibicion", area: "constitucion", authority: C, source: "const",
    title: "No negociable · Separación de líneas de negocio", summary: "L1/L2/L3 se leen siempre por separado en datos y decisiones.",
    body: "Los datos y decisiones nunca mezclan líneas de negocio (L1 automatización · L2 web · L3 branding). Lección central de la Fase 2. (Art. 34)" });
  await entry({ key: "const-prueba", type: "prohibicion", area: "constitucion", authority: C, source: "const",
    title: "No negociable · Honestidad de prueba", summary: "Nada de casos inventados, cifras sin medir ni estadísticas ajenas como propias.",
    body: "Nunca se comunican casos ficticios ni cifras no medidas; las estadísticas externas se citan como sector con fuente. (Art. 26-27)" });
  await entry({ key: "const-preregistro", type: "regla", area: "constitucion", authority: C, source: "const",
    title: "Regla · Pre-registro experimental", summary: "Ningún experimento sin umbral de éxito/fracaso escrito antes.",
    body: "Un experimento sin criterio de éxito/fracaso pre-registrado no es un experimento: es gasto con esperanza. (T.IX Art. 44; sistema de validación)" });
  await entry({ key: "const-humano", type: "regla", area: "constitucion", authority: C, source: "const",
    title: "Regla · Recepción humana", summary: "La primera conversación de un desconocido la atiende una persona, no un bot.",
    body: "La automatización de la recepción entra cuando el volumen desborde a la persona, nunca antes. (Art. 34-38; lección de la campaña de junio)" });

  // ============================ RELACIONES ================================
  await relate("of-mapa", "of-proyecto", "aplica", "el Mapa se descuenta del proyecto");
  await relate("val-h10", "of-chequeo", "valida", "H10 valida el chequeo→pago");
  await relate("val-h2", "of-proyecto", "valida", "H2 sostiene el núcleo de seguimiento");
  await relate("val-h4", "of-proyecto", "valida");
  await relate("com-obj-robotico", "cont-pilar-3", "responde");
  await relate("caso-estersa", "id-diferenciacion", "prueba", "prueba de método y sector (no de la oferta)");
  await relate("const-jerarquia", "id-filosofia", "desarrolla");
  await relate("pb-chequeo", "of-chequeo", "aplica");
  await relate("pb-propuesta", "of-proyecto", "aplica");
  await relate("val-riesgo-agosto", "val-exp-ou1", "depende_de");
  await relate("id-icp", "val-decision-vertical", "depende_de");

  const total = await prisma.knowledgeEntry.count({ where: { deletedAt: null } });
  console.log(`✅ KAIRAS OS — importación inicial completada. Entradas: ${total}`);
}

main()
  .catch((e) => {
    console.error("❌ Error en la importación:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
