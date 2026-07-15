/**
 * KAIRAS OS — importación Fase C: cierre de huecos de cobertura documental.
 *
 * Idempotente (externalKey). Solo escribe en tablas os_*.
 * Cubre: (1) documento estratégico de ABRIL 2026 como conocimiento histórico
 * por bloques, con relaciones "sustituido por"; (2) LOGO — norma operativa
 * provisional (condicionado); (3) CTAs por temperatura; (4) mensajes por nivel
 * de conciencia; (5) one-pager y bios. Transforma las fuentes en unidades
 * navegables; no copia muros de texto; no duplica lo vigente (enlaza).
 *
 * Requiere seed-os.ts y seed-os-fase-b.ts previos (referencia sus entradas).
 * Ejecutar:  npx tsx prisma/seed-os-fase-c.ts
 */
import { PrismaClient, type OsEntryType, type OsStatus, type OsAuthority, type OsBusinessLine, type OsMessageLayer, type OsRelationType } from "@prisma/client";

const prisma = new PrismaClient();

const sources: Record<string, string> = {};
async function source(key: string, label: string, phase?: string, path?: string, kind?: string) {
  const s = await prisma.knowledgeSource.upsert({
    where: { id: `src_${key}` }, update: { label, phase, path, kind },
    create: { id: `src_${key}`, label, phase, path, kind },
  });
  sources[key] = s.id; return s.id;
}

type EntryInput = {
  key: string; type: OsEntryType; area: string; title: string;
  body?: string; summary?: string; status?: OsStatus; authority?: OsAuthority;
  businessLine?: OsBusinessLine; messageLayer?: OsMessageLayer; sector?: string;
  validUntil?: Date | null; source?: string; meta?: Record<string, unknown>;
};

async function entry(e: EntryInput) {
  const data = {
    type: e.type, area: e.area, title: e.title,
    body: e.body ?? null, summary: e.summary ?? null,
    status: e.status ?? ("vigente" as OsStatus),
    authority: e.authority ?? ("operativo" as OsAuthority),
    businessLine: e.businessLine ?? ("transversal" as OsBusinessLine),
    messageLayer: e.messageLayer ?? ("na" as OsMessageLayer),
    sector: e.sector ?? null, validUntil: e.validUntil ?? null,
    sourceId: e.source ? sources[e.source] ?? null : null,
    meta: (e.meta ?? undefined) as never,
  };
  const row = await prisma.knowledgeEntry.upsert({
    where: { externalKey: e.key }, update: data, create: { externalKey: e.key, ...data },
  });
  await prisma.knowledgeVersion.upsert({
    where: { entryId_version: { entryId: row.id, version: row.currentVersion } },
    update: {},
    create: { entryId: row.id, version: row.currentVersion, titleSnapshot: row.title,
      bodySnapshot: row.body, statusSnapshot: row.status, changeReason: "Importación Fase C" },
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
/** "vigente sustituye a histórico": crea la relación de sustitución. */
const sustituye = (vigenteKey: string, historicoKey: string, note?: string) =>
  relate(vigenteKey, historicoKey, "sustituye", note);

async function main() {
  const ABRIL = new Date("2026-04-15");
  await source("abril", "Documento estratégico integral (abril 2026)", "Abril 2026", "01_marca_y_estrategia/KAIRAS_documento_estrategico_exhaustivo_abril_2026.docx", "historico");
  await source("guia", "Guía de marca KAIRAS (norma de logo provisional)", "s/f", "01_marca_y_estrategia/KAIRAS_Guia_de_Marca_Profesional_final.pdf", "marca");
  await source("ctas", "CTAs por temperatura v0.1", "Fase 5", "09_estrategia_validacion/ctas_por_temperatura.md", "comunicacion");
  await source("conc", "Mensajes por nivel de conciencia", "Fase 5", "09_estrategia_validacion/mensajes_por_conciencia.md", "comunicacion");
  await source("onep", "Estructura del one-pager v0.1", "Fase 4", "10_entregables/estructura_one_pager.md", "comercial");
  await source("bios", "Elevator pitch y bios v0.1", "Fase 5", "10_entregables/elevator_pitch_y_bios_v0_1.md", "comunicacion");

  const HIST: OsAuthority = "historico";
  const SP: OsAuthority = "sistema_permanente";
  const COMPAT = "HISTÓRICO — antecedente compatible";

  // ===================== 1. DOCUMENTO DE ABRIL 2026 (histórico) =====================
  await entry({ key: "abril-definicion", type: "definicion", area: "identidad", status: "historico", authority: HIST, source: "abril", validUntil: null,
    title: "Abril 2026 · Definición y valores de KAIRAS (antecedente)", summary: `${COMPAT}. Marca de optimización operativa para pymes de servicios; valores claridad/utilidad/criterio/control.`,
    body: "Antecedente de abril 2026. KAIRAS como marca de optimización operativa, automatización y claridad de procesos para pymes de servicios; vende tiempo recuperado y orden, no IA como espectáculo. Propósito, misión, visión y valores (claridad, utilidad, criterio, control, elegancia contenida, resultado). Compatible con la Constitución vigente, que lo formaliza y estrecha el foco.",
    meta: { fecha: "2026-04", marcador: COMPAT, bloque: "definición" } });

  await entry({ key: "abril-posicionamiento", type: "posicionamiento", area: "identidad", status: "obsoleto", authority: HIST, source: "abril",
    title: "Abril 2026 · Posicionamiento y mensajes maestros (sustituido)", summary: "OBSOLETO — sustituido por el posicionamiento y el sistema de mensaje vigentes. Enemigo (caos operativo normalizado) se conserva.",
    body: "Antecedente de abril. Posicionamiento: optimización operativa para pymes de servicios; enemigo = el caos operativo normalizado (se conserva). Promesa «Menos tareas manuales. Más tiempo para lo importante» y mensajes maestros («Recupera tiempo. Ordena tu negocio»). SUSTITUIDO por el eje vigente «Lo que entra en tu negocio no debería perderse» y el sistema de mensaje Fase 5.",
    meta: { fecha: "2026-04", marcador: "OBSOLETO — sustituido por: posicionamiento vigente + sistema de mensaje", bloque: "posicionamiento" } });

  await entry({ key: "abril-icp", type: "icp", area: "identidad", status: "obsoleto", authority: HIST, source: "abril",
    title: "Abril 2026 · Cliente ideal amplio y multisector (sustituido)", summary: "OBSOLETO — sustituido por el ICP vigente (estética Vigo-Pontevedra) y la decisión de vertical.",
    body: "Antecedente de abril. ICP amplio: pymes de servicios con volumen/margen (clínicas, dentales, fisio, academias, inmobiliarias, asesorías). Buyer persona: propietaria/gerente saturada. SUSTITUIDO por el ICP constitucional (centro de estética Vigo-Pontevedra, ≥5/8, valoraciones obligatoria) y la decisión de vertical prioritario.",
    meta: { fecha: "2026-04", marcador: "OBSOLETO — sustituido por: ICP vigente (Constitución) + decisión de vertical", bloque: "ICP" } });

  await entry({ key: "abril-oferta", type: "oferta", area: "oferta", status: "obsoleto", authority: HIST, source: "abril",
    title: "Abril 2026 · Oferta por 4 líneas de servicio (sustituida)", summary: "OBSOLETO — sustituida por la arquitectura de oferta vigente (Chequeo/Mapa/Sistema Sin Fugas/Continuo).",
    body: "Antecedente de abril. Oferta organizada en 4 líneas (atención y respuesta, operativa y seguimiento, datos y organización, captación y nurturing) con el agente de WhatsApp como producto de entrada. SUSTITUIDA por la arquitectura vigente centrada en el seguimiento de valoraciones: Chequeo → Mapa de Fugas → Sistema Sin Fugas → Seguimiento Continuo.",
    meta: { fecha: "2026-04", marcador: "OBSOLETO — sustituido por: arquitectura de oferta vigente", bloque: "oferta anterior" } });

  await entry({ key: "abril-comercial", type: "playbook", area: "comercial", status: "obsoleto", authority: HIST, source: "abril",
    title: "Abril 2026 · Estrategia comercial por fases (sustituida)", summary: "OBSOLETO — sustituida por el sistema comercial vigente. Se conserva la filosofía validación-primero.",
    body: "Antecedente de abril. Estrategia comercial en fases (validación → demostración → autoridad → activación), captación por conversaciones directas + contenido + web, estructura de venta atracción→interés→diagnóstico→propuesta→cierre. Filosofía «primero validar, publicidad al final» conservada. SUSTITUIDA por el embudo comercial vigente (Chequeo→Mapa→propuesta→cierre→seguimiento).",
    meta: { fecha: "2026-04", marcador: "OBSOLETO — sustituido por: sistema comercial vigente", bloque: "estrategia comercial anterior" } });

  await entry({ key: "abril-contenidos", type: "definicion", area: "contenidos", status: "obsoleto", authority: HIST, source: "abril",
    title: "Abril 2026 · Estrategia de contenidos anterior (sustituida)", summary: "OBSOLETO — sustituida por el sistema de contenidos vigente (5 pilares + series).",
    body: "Antecedente de abril. Contenido para demostrar criterio, verbalizar problemas y preparar ventas; pilares (dolor operativo, criterio, casos, soluciones desde beneficio, relato fundador), 2 piezas/semana. SUSTITUIDA por el sistema de contenidos vigente (5 pilares nombrados + series recurrentes + sprint de 6 semanas).",
    meta: { fecha: "2026-04", marcador: "OBSOLETO — sustituido por: sistema de contenidos vigente", bloque: "contenidos anteriores" } });

  await entry({ key: "abril-identidad-visual", type: "regla_marca", area: "marca", status: "historico", authority: HIST, source: "abril",
    title: "Abril 2026 · Identidad verbal y visual (antecedente)", summary: `${COMPAT}. Dark premium, paleta y Plus Jakarta Sans idénticas a las vigentes; personalidad y palabras sí/no.`,
    body: "Antecedente de abril, plenamente compatible. ADN visual dark premium, paleta (#0D090B negro base ~80%, #E1E8F0 blanco frío, #8B5DF5 morado quirúrgico, lavanda auxiliar), Plus Jakarta Sans, reglas visuales no negociables (espacio negativo, glow controlado, morado como bisturí, nada de robots/engranajes). Personalidad y palabras que construyen/ debilitan la marca. El sistema visual vigente lo conserva.",
    meta: { fecha: "2026-04", marcador: COMPAT, bloque: "identidad verbal y visual" } });

  await entry({ key: "abril-plan", type: "playbook", area: "comercial", status: "historico", authority: HIST, source: "abril",
    title: "Abril 2026 · Plan operativo y calendario del mes (histórico)", summary: `${COMPAT}. Plan de acción de abril: cerrar Estersa, ordenar oferta/materiales, publicar criterio, preparar el primer caso.`,
    body: "Antecedente de abril, cerrado por fecha. Mes de consolidación y arranque controlado: prioridades (cerrar Estersa o equivalente, ordenar oferta/materiales/discurso, publicar contenido de criterio, preparar infraestructura del primer caso), calendario semana a semana y tareas no negociables del mes. Superado por la ejecución posterior y la decisión de vertical.",
    meta: { fecha: "2026-04", marcador: COMPAT, bloque: "plan operativo de abril" } });

  await entry({ key: "abril-reglas-marca", type: "regla_marca", area: "marca", status: "historico", authority: HIST, source: "abril",
    title: "Abril 2026 · Reglas de protección de marca (antecedente)", summary: `${COMPAT}. No convertir la marca en cuenta generalista de IA, no vender tecnología sin problema, no publicidad prematura, no copies vacíos.`,
    body: "Antecedente de abril, compatible. Decisiones no negociables de protección de marca: no cuenta generalista de IA; no vender tecnología sin aterrizar el problema; no aceptar proyectos que rompan posicionamiento/retorno; no publicidad prematura; cuidar la forma visual; no copies vacíos ni intercambiables; no dispersarse antes de validar. Formalizadas y reforzadas por la Constitución vigente.",
    meta: { fecha: "2026-04", marcador: COMPAT, bloque: "reglas de marca" } });

  // Relaciones "sustituido por" (vigente sustituye a abril)
  await sustituye("id-proposito", "abril-definicion", "la Constitución formaliza la definición");
  await sustituye("id-posicionamiento", "abril-posicionamiento");
  await sustituye("id-icp", "abril-icp");
  await sustituye("val-decision-vertical", "abril-icp", "el foco pasa a estética");
  await sustituye("of-proyecto", "abril-oferta");
  await sustituye("of-chequeo", "abril-oferta");
  await sustituye("com2-embudo", "abril-comercial");
  await sustituye("cont-pilar-1", "abril-contenidos");
  await sustituye("cont-sprint", "abril-contenidos");
  await sustituye("marca-direccion", "abril-identidad-visual");
  await sustituye("val-decision-vertical", "abril-plan", "el plan amplio da paso al foco validado");
  await sustituye("const-jerarquia", "abril-reglas-marca");
  await sustituye("const-prueba", "abril-reglas-marca");
  // antecedentes compatibles (relación adicional de linaje)
  await relate("abril-identidad-visual", "marca-direccion", "desarrolla", "mismo ADN visual");

  // ===================== 2. LOGO — norma operativa provisional =====================
  await entry({ key: "marca-logo", type: "regla_marca", area: "marca", status: "condicionado", authority: "operativo", source: "guia",
    title: "Logo de KAIRAS — norma operativa provisional", summary: "Wordmark claro sobre fondo oscuro / oscuro sobre blanco limpio, con aire generoso. Autoridad media, estado condicionado.",
    body: [
      "Norma OPERATIVA y PROVISIONAL para el uso del logotipo (solo lo documentado):",
      "· Versión principal: wordmark claro sobre fondo oscuro.",
      "· Versión inversa: wordmark oscuro solo sobre blanco sólido y limpio.",
      "· Protección: zona de aire generosa alrededor.",
      "· No pegar el logo a bordes, botones o elementos densos.",
      "· No deformar. · No añadir sombras extrañas. · No usar degradados chillones.",
      "· Uso consistente con la estética dark premium.",
      "",
      "⚠️ CALLOUT: KAIRAS todavía no dispone de un manual técnico cerrado de construcción del logotipo.",
    ].join("\n"),
    meta: {
      callout: "KAIRAS todavía no dispone de un manual técnico cerrado de construcción del logotipo.",
      versionPrincipal: "wordmark claro sobre fondo oscuro",
      versionInversa: "wordmark oscuro sobre blanco sólido y limpio",
      proteccion: "zona de aire generosa",
      noHacer: ["pegar a bordes/botones/elementos densos", "deformar", "sombras extrañas", "degradados chillones"],
      pendientesTecnicos: [
        "retícula geométrica", "proporciones exactas", "área de respeto cuantificada",
        "tamaños mínimos", "variantes oficiales cerradas", "usos monocromos técnicos",
        "especificaciones para impresión", "archivos maestros definitivos",
      ],
    } });
  await relate("marca-logo", "marca-color-violet", "relacionado", "paleta");
  await relate("marca-logo", "marca-tipografia", "relacionado", "tipografía");
  await relate("marca-logo", "marca-direccion", "relacionado", "dirección visual");
  await relate("marca-logo", "rec-recursos-visuales", "relacionado", "recursos permitidos");
  await relate("marca-logo", "rec-no-hacer", "relacionado", "no hacer");

  // ===================== 3. CTAs por temperatura =====================
  const CTA = (o: Omit<EntryInput, "area" | "type">) => entry({ ...o, area: "comunicacion", type: "cta", status: o.status ?? "provisional", authority: o.authority ?? SP, messageLayer: o.messageLayer ?? "conv", sector: "estetica" });

  await CTA({ key: "cta-fria", source: "ctas", messageLayer: "conv",
    title: "CTA en frío — baja intención (conciencia 1-2)", summary: "El contacto no debe requerir hablar con KAIRAS: reto de autodiagnóstico, checklist guardable, ver el caso.",
    body: "Audiencia fría = baja intención (mismo eje). El CTA cuesta menos compromiso del que la temperatura puede pagar.",
    meta: {
      etapaEmbudo: "descubrimiento / conciencia", canal: "IG y LinkedIn orgánico", objetivo: "reconocimiento y autodiagnóstico sin exponerse",
      ejemploAutorizado: "«Cuenta las valoraciones sin respuesta del mes pasado» · mini-checklist «3 señales» · «Guárdalo y compáralo con tu mes» · ver el caso",
      riesgo: "pedir contacto a quien aún no tiene problema → rebote", cuandoNoUsar: "nunca pedir llamada, palabra por DM ni formularios de 4 campos en frío",
      mide: "guardados y respuestas con número propio",
    } });

  await CTA({ key: "cta-templada", source: "ctas", messageLayer: "prod",
    title: "CTA templado — intención media (conciencia 3-4)", summary: "Primer contacto humano de coste bajo y valor inmediato: Chequeo de Fugas gratuito.",
    body: "Audiencia templada = intención media. Reconoce el problema o desconfía informada; se le ofrece valor inmediato con coste bajo.",
    meta: {
      etapaEmbudo: "consideración", canal: "landing de oferta, cierre de contenido con señal, WhatsApp",
      objetivo: "primera conversación útil", ejemploAutorizado: "«Chequeo de Fugas gratuito: 20 min, te digo cuánto se te escapa y por dónde» · clic-a-WhatsApp con mensaje precargado",
      riesgo: "saltar a alta intención antes de tiempo", cuandoNoUsar: "no en tráfico frío de anuncio; recepción siempre humana", mide: "chequeos agendados/realizados",
    } });

  await CTA({ key: "cta-caliente", source: "ctas", messageLayer: "prop",
    title: "CTA en caliente — alta intención (conciencia 5-6)", summary: "Encargo directo: Mapa de Fugas, propuesta, cierre con fecha, referencia.",
    body: "Audiencia caliente = alta intención. Comparando o post-chequeo/propuesta; admite encargo directo.",
    meta: {
      etapaEmbudo: "decisión", canal: "post-chequeo, comparadores, propuesta",
      objetivo: "encargo y cierre", ejemploAutorizado: "«Pide el Mapa de Fugas — 240 €, se descuenta del proyecto» · «¿Lo decidimos el [fecha]?» · pedir referencia",
      riesgo: "usar CTA caliente con audiencia fría", cuandoNoUsar: "nunca en conciencia baja", mide: "Mapas encargados, propuestas, cierres",
    } });

  await CTA({ key: "cta-prohibida", source: "ctas", messageLayer: "na", status: "vigente",
    title: "CTAs prohibidas según nivel de conciencia", summary: "Regla de la campaña de junio: no pedir a un nivel bajo lo que solo un nivel alto puede dar.",
    body: "Prohibiciones (regla ya aprobada): en frío no pedir llamada inmediata; no exigir palabra por DM a tráfico frío; no usar CTA caliente para audiencia de conciencia baja; nada de formularios de 4 campos en frío. El error de junio fue pedir CTA de nivel 3-5 a audiencia de nivel 1-2.",
    meta: { regla: "el CTA debe costar menos compromiso del que la temperatura puede pagar", origen: "lección de la campaña de junio" } });

  await CTA({ key: "cta-matriz", source: "ctas", messageLayer: "na",
    title: "Matriz de CTA por temperatura y canal", summary: "Qué CTA por defecto en cada canal: orgánico→baja, landing→media, propuesta→alta, anuncios→media máxima.",
    body: "Resumen operativo temperatura × canal: reel/carrusel → baja (1 de cada 4 → media); story → baja-media; landing → media (chequeo) con alta visible; home → media genérica; outreach frío → micro-pregunta; propuesta → alta única; anuncios futuros → media máxima (nunca alta en frío). La cadena contenido→chequeo→Mapa→proyecto se registra por origen: ingresos, no alcance.",
    meta: { defecto: { organico: "baja", landing: "media", propuesta: "alta", anuncios: "media máxima" } } });

  await relate("cta-fria", "cont-serie-s1", "aplica");
  await relate("cta-fria", "cont-serie-s3", "aplica");
  await relate("cta-fria", "rec-carrusel-3senales", "aplica");
  await relate("cta-templada", "of-chequeo", "aplica");
  await relate("cta-templada", "com2-embudo", "relacionado");
  await relate("cta-caliente", "of-mapa", "aplica");
  await relate("cta-caliente", "com2-cierre", "aplica");
  await relate("cta-prohibida", "com-voz", "desarrolla");
  await relate("cta-prohibida", "rec-no-hacer", "relacionado");
  await relate("cta-matriz", "com2-mensajes-canal", "relacionado");

  // ===================== 4. Mensajes por nivel de conciencia =====================
  const CONC = (o: Omit<EntryInput, "area" | "type">) => entry({ ...o, area: "comunicacion", type: "mensaje", status: o.status ?? "provisional", authority: o.authority ?? SP, sector: "estetica" });

  await CONC({ key: "msg-conc-1", source: "conc", messageLayer: "sect",
    title: "Conciencia 1 · No reconoce el problema", summary: "«Mi gestión va bien.» Mensaje: la escena espejo. Sin oferta ni precios.",
    body: "«Mi gestión va bien; contestar WhatsApps es parte del oficio.» Necesita entender que hay diferencia entre atender mucho y no perder nada. NO decirle: oferta, precios ni «automatización». Mensaje: la escena espejo («son las 21:30 y sigues contestando citas desde el sofá»). Prueba: ninguna, solo reconocimiento. CTA: intención cero (contar sus pérdidas de la semana).",
    meta: { nivel: 1, quePiensa: "el centro funciona", noDecir: "oferta/precios/automatización", canal: "orgánico + primera línea de outreach" } });

  await CONC({ key: "msg-conc-2", source: "conc", messageLayer: "sect",
    title: "Conciencia 2 · Reconoce síntomas pero los normaliza", summary: "«Es el día a día del sector.» Mensaje: reencuadre + cifra sectorial con fuente.",
    body: "«Se me escapan cosas, como a todos.» Necesita entender el coste (el síntoma tiene precio) y que no es falta de esfuerzo sino de sistema. NO decirle: «lo haces mal» ni soluciones técnicas. Mensaje: reencuadre + cifra sectorial CON fuente y como sector, no como ella. Prueba: dato sectorial + «lo que no se mide se repite». CTA: baja intención (mini-checklist de autodiagnóstico).",
    meta: { nivel: 2, quePiensa: "es normal en el sector", noDecir: "culpa / tecnicismos", canal: "orgánico" } });

  await CONC({ key: "msg-conc-3", source: "conc", messageLayer: "prod",
    title: "Conciencia 3 · Reconoce el problema y busca solución", summary: "«Tengo que arreglar esto.» Mensaje: diagnóstico antes que herramienta. CTA: Chequeo.",
    body: "«Necesito que esto no dependa de mí; ¿contrato a alguien? ¿una app?» Necesita el mapa de opciones honesto y el orden correcto: diagnóstico → sistema, no herramienta → esperanza. NO decirle: precios cerrados sin contexto ni atacar su software. Mensaje [PROD]: «antes de contratar o instalar nada, ¿sabes cuántas se te escaparon el mes pasado y por dónde? Se ve en 20 minutos». Prueba: caso Estersa (marco autorizado). CTA: Chequeo de Fugas gratuito.",
    meta: { nivel: 3, quePiensa: "necesito arreglarlo", canal: "landing, chequeo, contenido con CTA" } });

  await CONC({ key: "msg-conc-4", source: "conc", messageLayer: "conv",
    title: "Conciencia 4 · Conoce el software pero desconfía", summary: "«Ya probé cosas / suena a bot.» Mensaje: el anti-pitch. Persona siempre visible.",
    body: "«Tengo Flowww y no uso ni la mitad» / «un chatbot me espantaría a las clientas». Necesita entender que KAIRAS piensa igual: bots mal hechos espantan, software sin operar no sirve; por eso el diseño es sus textos, persona visible, activar lo ya pagado y empezar pequeño. NO decirle: «nuestra IA es distinta» ni tecnicismos de API. Mensaje: el anti-pitch («si buscas un bot que conteste por ti a todo, no soy yo»). Prueba: demo con sus textos + objeciones resueltas + garantías. CTA: ver conversación de ejemplo / chequeo con revisión de su software.",
    meta: { nivel: 4, quePiensa: "esto suena a humo/bot", canal: "FAQ, anti-pitch, segunda conversación" } });

  await CONC({ key: "msg-conc-5", source: "conc", messageLayer: "prod",
    title: "Conciencia 5 · Comparando proveedores", summary: "«¿Tú o los de la web?» Mensaje: las 4 diferencias verificables. CTA: Mapa.",
    body: "«Hay agencias desde 59 €/mes, ¿por qué esta y más caro?» Necesita las 4 diferencias verificables: local y presencial; diagnóstico con sus números antes de vender; honestidad de alcance por escrito; el contador mensual como entregable. NO decirle: hablar mal de competidores. Mensaje: «compara quién te da un número tuyo antes de venderte, quién pone por escrito lo que NO hace, y quién va a tu centro si algo falla». Prueba: Mapa de Fugas + tabla de alcance + garantía. CTA: Mapa (240 €, descontable).",
    meta: { nivel: 5, quePiensa: "comparando precio/proveedor", canal: "página de oferta con alcance, Mapa" } });

  await CONC({ key: "msg-conc-6", source: "conc", messageLayer: "prop",
    title: "Conciencia 6 · Ya recibió diagnóstico o propuesta", summary: "«Lo tengo que pensar.» Mensaje: qué decides hoy, reversible por diseño. CTA: decisión con fecha.",
    body: "«Me encaja, pero hay lío / es dinero / ¿y si no lo usamos?» Necesita saber qué pasa si dice sí (calendario, sus 6 horas, hito de pago) y si algo falla (garantía, salida): decisión pequeña y reversible. NO decirle: presión, descuentos, «última oportunidad». Mensaje: «te resumo lo que decides hoy… si en 30 días no cumple, lo corrijo sin coste. ¿Qué te falta por ver?» Prueba: escenarios del anexo + contador de ejemplo + referencia de Estersa si procede. CTA: decisión con fecha; si es no, motivo registrado.",
    meta: { nivel: 6, quePiensa: "lo tengo que pensar", canal: "propuesta, cierre, seguimiento" } });

  // relaciones de conciencia
  await relate("msg-conc-1", "cta-fria", "aplica");
  await relate("msg-conc-1", "cont-pilar-1", "relacionado");
  await relate("msg-conc-2", "cta-fria", "aplica");
  await relate("msg-conc-2", "val-h1", "relacionado");
  await relate("msg-conc-3", "cta-templada", "aplica");
  await relate("msg-conc-3", "of-chequeo", "aplica");
  await relate("msg-conc-3", "caso-estersa", "prueba");
  await relate("msg-conc-4", "com-obj-robotico", "responde");
  await relate("msg-conc-4", "com-obj-flowww", "responde");
  await relate("msg-conc-5", "cta-caliente", "aplica");
  await relate("msg-conc-5", "of-mapa", "aplica");
  await relate("msg-conc-5", "id-diferenciacion", "prueba");
  await relate("msg-conc-6", "com2-cierre", "aplica");
  await relate("msg-conc-6", "com2-seguimiento", "aplica");

  // ===================== 5. Materiales recomendables (one-pager + bios) =====================
  await entry({ key: "rec-estructura-one-pager", type: "recurso", area: "recursos", status: "provisional", authority: SP, source: "onep", sector: "estetica",
    title: "Estructura del one-pager de la oferta", summary: "Una cara A4, 7 bloques: titular de problema → 3 agujeros → mecanismo → qué NO es → escalera → prueba → CTA único.",
    body: "Estructura escaneable en 3 s (no publicar hasta validar en 3-5 conversaciones):\n1) Titular de problema (no de marca).\n2) Los tres agujeros (sábado 23:30, valoración sin retomar, cita sin aviso).\n3) Qué hace KAIRAS: responder y ordenar · perseguir lo abierto · el número cada mes.\n4) Qué NO es (no chatbot robótico, no cambia tu programa, no sustituye equipo, no promete ingresos).\n5) Cómo se empieza (escalera con precios de entrada).\n6) Prueba (Estersa al cierre de F2; interino admisible; nunca casos inventados).\n7) CTA único («escríbeme FUGAS»).\nReglas: máx. 180 palabras cara A; sin vocabulario prohibido; «IA» no aparece.",
    meta: { uso: "dejar en mano tras un chequeo o adjuntar tras conversación", cuandoNoUsar: "no imprimir en serie hasta validar", caras: "A (oferta) + B opcional (alcance)" } });
  await relate("rec-estructura-one-pager", "of-chequeo", "aplica");
  await relate("rec-estructura-one-pager", "id-icp", "relacionado");
  await relate("rec-estructura-one-pager", "rec-estructura-propuesta", "relacionado");

  await entry({ key: "com-bios", type: "mensaje", area: "comunicacion", status: "provisional", authority: SP, source: "bios", messageLayer: "corp", sector: "estetica",
    title: "Bios, firma comercial y pitches corporativos", summary: "Bios de IG/LinkedIn/directorios, firma única «Carlota López — fundadora de KAIRAS», y pitches CORP/PROD (el SECT está aparte).",
    body: "Bios y firma para todos los canales:\n· IG: «KAIRAS | Sistemas para que nada se te escape · consultas respondidas · valoraciones con seguimiento · el número cada mes».\n· LinkedIn (Carlota): «Fundadora de KAIRAS · sistemas de atención y seguimiento para pymes de servicios · Galicia».\n· Descripción corta: «KAIRAS monta sistemas de atención, seguimiento y medición… diagnóstico primero, sistema sobre tus herramientas, un número cada mes».\n· Firma única: «Carlota López — fundadora de KAIRAS · kairas.es · WhatsApp» (nunca más «diseñadora web» en comunicación activa).\nPitch [CORP] 30 s y [PROD] 10 s incluidos. El pitch [SECT] es la entrada canónica enlazada.\nQué NO decir: IA como identidad, «chatbots», promesas numéricas, «para cualquier negocio», vocabulario prohibido.",
    meta: { pitchCorp: "recupera lo que se escapa cada semana…", pitchProd: "que ninguna valoración se quede en el aire…", noDecir: ["IA como identidad", "chatbots", "promesas numéricas", "para cualquier negocio"] } });
  await relate("com-bios", "com-voz", "aplica");
  await relate("com-bios", "com-pitch-sect", "relacionado", "el pitch sectorial es la entrada canónica");

  // recuentos
  const total = await prisma.knowledgeEntry.count({ where: { deletedAt: null } });
  const abril = await prisma.knowledgeEntry.count({ where: { deletedAt: null, externalKey: { startsWith: "abril-" } } });
  const cta = await prisma.knowledgeEntry.count({ where: { deletedAt: null, type: "cta" } });
  console.log(`✅ Fase C importada. Bloques abril: ${abril} · CTAs: ${cta} · Total OS: ${total}`);
}

main()
  .catch((e) => { console.error("❌ Error Fase C:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
