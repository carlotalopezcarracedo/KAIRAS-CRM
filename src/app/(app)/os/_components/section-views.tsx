import Link from "next/link";
import Image from "next/image";
import {
  Check,
  ArrowRight,
  Clock,
  AlertTriangle,
  Download,
  CheckCircle2,
  X,
  Building2,
  CircleDollarSign,
  MessageCircleQuestion,
  Route,
} from "lucide-react";
import { CopyButton } from "@/components/os/copy-button";
import { StatusBadge, AuthorityBadge } from "@/components/os/os-badges";
import { KnowledgeCard, CardGrid, Empty, TypeIcon } from "./os-ui";
import { OS_TYPE_LABEL, OS_STATUS } from "../_config";
import { entryHref } from "../_sections";
import { cn } from "@/lib/utils";
import styles from "./os.module.css";
import type { SectionEntry } from "@/server/services/os/os-views-service";
import type { OsEntryType } from "@/types/os";

type E = SectionEntry;
const meta = (e: E) => (e.meta && typeof e.meta === "object" ? (e.meta as Record<string, unknown>) : {});
const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const arr = (v: unknown) => (Array.isArray(v) ? v.map(String) : undefined);
const byType = (es: E[], ...t: OsEntryType[]) => es.filter((e) => t.includes(e.type));
const find = (es: E[], key: string) => es.find((e) => e.externalKey === key);

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.12em] text-faint">{title}</h2>
        {hint ? <span className="text-xs text-faint">{hint}</span> : null}
      </div>
      {children}
    </section>
  );
}

// ============================ MARCA ============================
export function MarcaView({ entries }: { entries: E[] }) {
  const current = entries.filter(
    (entry) => !["historico", "obsoleto", "archivado"].includes(entry.status),
  );
  const historic = entries.filter((entry) => ["historico", "obsoleto"].includes(entry.status));
  const logo = current.find((entry) => entry.type === "regla_marca" && /logo/i.test(entry.title));
  const colors = byType(current, "token_visual").filter((entry) => str(meta(entry).hex));
  const typography = current.find((entry) => /tipograf/i.test(entry.title));
  const artDirection = current.find((entry) => /direcci[oó]n de arte/i.test(entry.title));
  const pending = logo ? arr(meta(logo).pendientesTecnicos) ?? [] : [];
  const logoDonts = logo ? arr(meta(logo).noHacer) ?? [] : [];
  const correct = artDirection ? str(meta(artDirection).do) : undefined;
  const incorrect = artDirection ? str(meta(artDirection).dont) : undefined;

  return (
    <div className={styles.fade}>
      {logo ? (
        <Panel title="Logotipo" hint="versiones y uso operativo">
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="grid md:grid-cols-2">
              <div className="grid min-h-48 place-items-center bg-[#0d090b] p-8">
                <Image
                  src="/brand/kairas-logo-horizontal.png"
                  alt="Logotipo horizontal de KAIRAS sobre fondo oscuro"
                  width={280}
                  height={42}
                  className="h-auto w-56 max-w-full"
                />
              </div>
              <div className="grid min-h-48 place-items-center bg-[#e1e8f0] p-8">
                <Image
                  src="/brand/kairas-logo-horizontal.png"
                  alt="Versión oscura de referencia del logotipo horizontal de KAIRAS"
                  width={280}
                  height={42}
                  className="h-auto w-56 max-w-full invert"
                />
              </div>
            </div>
            <div className="border-t border-line p-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-foam">{logo.title}</p>
                <StatusBadge status={logo.status} />
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-mist">{logo.summary}</p>
              {str(meta(logo).callout) ? (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-warn/25 bg-warn-soft/35 p-3 text-xs leading-5 text-warn">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" />
                  {str(meta(logo).callout)}
                </div>
              ) : null}
              <Link
                href={entryHref(logo.id)}
                className="mt-4 inline-flex text-xs font-semibold text-lavender hover:underline"
              >
                Abrir norma completa →
              </Link>
            </div>
          </div>
        </Panel>
      ) : null}

      {colors.length > 0 ? (
        <Panel title="Paleta oficial" hint="clic para copiar el HEX">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {colors.map((c) => {
              const hex = str(meta(c).hex) ?? "#000";
              return (
                <div key={c.id} className="overflow-hidden rounded-2xl border border-line bg-surface">
                  <Link href={entryHref(c.id)}><span className="block h-20" style={{ background: hex }} /></Link>
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] text-foam">{hex}</p>
                      <p className="truncate text-[10px] text-faint">{str(meta(c).name) ?? c.title}</p>
                    </div>
                    <CopyButton text={hex} label="" />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      ) : null}

      {typography ? (
        <Panel title="Sistema tipográfico">
          <div className="rounded-2xl border border-line bg-[#e1e8f0] p-6 text-[#0d090b] sm:p-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0d090b]/50">
              {str(meta(typography).pesos)
                ? `Plus Jakarta Sans · ${str(meta(typography).pesos)}`
                : typography.title}
            </p>
            <p className="mt-5 max-w-4xl text-4xl font-extrabold tracking-[-0.045em] sm:text-5xl">
              Lo que entra no debería perderse.
            </p>
            <div className="mt-8 grid gap-5 border-t border-[#0d090b]/10 pt-5 sm:grid-cols-3">
              <div>
                <p className="text-2xl font-bold">Heading 700</p>
                <p className="mt-1 text-xs text-[#0d090b]/55">Jerarquía clara</p>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em]">Label 600</p>
                <p className="mt-1 text-xs text-[#0d090b]/55">Contexto y navegación</p>
              </div>
              <div>
                <p className="text-sm leading-6">Body 400–500 para explicar sin añadir ruido.</p>
              </div>
            </div>
          </div>
        </Panel>
      ) : null}

      {artDirection || logoDonts.length > 0 ? (
        <Panel title="Correcto / incorrecto" hint="criterio antes que decoración">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-ok/25 bg-ok-soft/25 p-5">
              <div className="flex items-center gap-2 text-ok">
                <CheckCircle2 className="h-4 w-4" />
                <p className="text-xs font-bold uppercase tracking-[0.12em]">Sí</p>
              </div>
              <p className="mt-4 text-lg font-semibold text-foam">
                {correct ?? "Aire, jerarquía y contraste."}
              </p>
              <p className="mt-2 text-sm leading-6 text-mist">
                Fondo oscuro, blanco frío y morado como acento quirúrgico.
              </p>
            </div>
            <div className="rounded-2xl border border-danger/25 bg-danger-soft/25 p-5">
              <div className="flex items-center gap-2 text-danger">
                <X className="h-4 w-4" />
                <p className="text-xs font-bold uppercase tracking-[0.12em]">No</p>
              </div>
              <p className="mt-4 text-lg font-semibold text-foam">
                {incorrect ?? "Ruido visual e iconografía cliché."}
              </p>
              {logoDonts.length > 0 ? (
                <p className="mt-2 text-sm leading-6 text-mist">{logoDonts.join(" · ")}</p>
              ) : null}
            </div>
          </div>
        </Panel>
      ) : null}

      <Panel title="Activos disponibles" hint="fuentes locales de referencia">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              label: "Logotipo horizontal",
              href: "/brand/kairas-logo-horizontal.png",
              image: "/brand/kairas-logo-horizontal.png",
            },
            {
              label: "Logotipo vertical",
              href: "/brand/kairas-logo-vertical.png",
              image: "/brand/kairas-logo-vertical.png",
            },
            {
              label: "Marca",
              href: "/brand/kairas-mark.png",
              image: "/brand/kairas-mark.png",
            },
          ].map((asset) => (
            <a
              key={asset.href}
              href={asset.href}
              download
              className={cn("group rounded-2xl border border-line bg-surface p-4", styles.lift)}
            >
              <span className="grid h-28 place-items-center rounded-xl bg-ink p-5">
                <Image
                  src={asset.image}
                  alt=""
                  width={180}
                  height={72}
                  className="max-h-16 w-auto max-w-full object-contain"
                />
              </span>
              <span className="mt-3 flex items-center gap-2 text-xs font-semibold text-foam">
                {asset.label}
                <Download className="ml-auto h-3.5 w-3.5 text-faint group-hover:text-lavender" />
              </span>
            </a>
          ))}
        </div>
      </Panel>

      {pending.length > 0 ? (
        <Panel title="Cobertura pendiente" hint="no presentar como norma cerrada">
          <div className="rounded-2xl border border-warn/25 bg-warn-soft/25 p-5">
            <div className="flex flex-wrap gap-2">
              {pending.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-warn/25 px-3 py-1 text-xs text-warn"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </Panel>
      ) : null}

      {historic.length > 0 ? (
        <Panel title="Antecedentes" hint="referencia, no norma vigente">
          <CardGrid cols={2}>
            {historic.map((entry) => (
              <KnowledgeCard key={entry.id} entry={entry} />
            ))}
          </CardGrid>
        </Panel>
      ) : null}
    </div>
  );
}

// ============================ ESTRATEGIA ============================
export function EstrategiaView({ entries }: { entries: E[] }) {
  const current = entries.filter(
    (entry) => !["historico", "obsoleto", "archivado"].includes(entry.status),
  );
  const historic = entries.filter((entry) => ["historico", "obsoleto"].includes(entry.status));
  const purpose = current.find((entry) => /^Prop[oó]sito$/i.test(entry.title));
  const mission = current.find((entry) => /^Misi[oó]n$/i.test(entry.title));
  const vision = current.find((entry) => /^Visi[oó]n$/i.test(entry.title));
  const positioning = current.find((entry) => /posicionamiento corporativo/i.test(entry.title));
  const differentiation = current.find((entry) => /diferenciaci[oó]n/i.test(entry.title));
  const solves = current.find((entry) => /^Problemas que resuelve$/i.test(entry.title));
  const doesNotSolve = current.find((entry) => /problemas que no resuelve/i.test(entry.title));
  const icp = current.find((entry) => /^Cliente ideal/i.test(entry.title));
  const noIcp = current.find((entry) => /^No-ICP$/i.test(entry.title));
  const principles = current.filter(
    (entry) =>
      entry.type === "principio" &&
      ![purpose?.id, mission?.id, vision?.id].includes(entry.id),
  );

  return (
    <div className={styles.fade}>
      {purpose ? (
        <Link
          href={entryHref(purpose.id)}
          className="group mb-8 block rounded-2xl border border-line bg-[#e1e8f0] p-7 text-[#0d090b] sm:p-9"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0d090b]/45">
            Propósito
          </p>
          <p className="mt-5 max-w-4xl text-3xl font-extrabold leading-tight tracking-[-0.035em] sm:text-4xl">
            {purpose.summary}
          </p>
          <span className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-[#5b34c9]">
            Ver fundamento <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      ) : null}

      {[mission, vision, positioning].some(Boolean) ? (
        <Panel title="Fundamentos" hint="una marca, una dirección">
          <div className="grid gap-3 md:grid-cols-3">
            {[mission, vision, positioning].filter(Boolean).map((entry) => (
              <Link
                key={entry!.id}
                href={entryHref(entry!.id)}
                className={cn("rounded-2xl border border-line bg-surface p-5", styles.lift)}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-lavender">
                  {entry!.title}
                </p>
                <p className="mt-3 text-sm leading-6 text-foam/85">{entry!.summary}</p>
              </Link>
            ))}
          </div>
        </Panel>
      ) : null}

      {solves || doesNotSolve ? (
        <Panel title="Qué es / qué no es">
          <div className="grid gap-3 md:grid-cols-2">
            {solves ? (
              <Link href={entryHref(solves.id)} className="rounded-2xl border border-ok/25 bg-ok-soft/20 p-5">
                <div className="flex items-center gap-2 text-ok">
                  <CheckCircle2 className="h-4 w-4" />
                  <p className="text-xs font-bold uppercase tracking-[0.12em]">KAIRAS resuelve</p>
                </div>
                <p className="mt-4 text-sm leading-6 text-foam">{solves.summary}</p>
              </Link>
            ) : null}
            {doesNotSolve ? (
              <Link href={entryHref(doesNotSolve.id)} className="rounded-2xl border border-danger/25 bg-danger-soft/20 p-5">
                <div className="flex items-center gap-2 text-danger">
                  <X className="h-4 w-4" />
                  <p className="text-xs font-bold uppercase tracking-[0.12em]">KAIRAS no promete</p>
                </div>
                <p className="mt-4 text-sm leading-6 text-foam">{doesNotSolve.summary}</p>
              </Link>
            ) : null}
          </div>
        </Panel>
      ) : null}

      {icp || noIcp ? (
        <Panel title="Encaje" hint="para quién sí y para quién no">
          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
            {icp ? (
              <Link
                href={entryHref(icp.id)}
                className={cn("rounded-2xl border border-violet-line bg-violet-soft/35 p-6", styles.lift)}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-lavender">Cliente ideal</p>
                <p className="mt-3 text-xl font-bold text-foam">{icp.title}</p>
                <p className="mt-3 text-sm leading-6 text-mist">{icp.summary}</p>
              </Link>
            ) : null}
            {noIcp ? (
              <Link
                href={entryHref(noIcp.id)}
                className={cn("rounded-2xl border border-line bg-surface p-6", styles.lift)}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-faint">No-ICP</p>
                <p className="mt-3 text-sm leading-6 text-mist">{noIcp.summary}</p>
              </Link>
            ) : null}
          </div>
        </Panel>
      ) : null}

      {differentiation ? (
        <Panel title="Diferenciación">
          <Link
            href={entryHref(differentiation.id)}
            className="block rounded-2xl border border-line bg-surface p-6"
          >
            <p className="max-w-4xl text-xl font-semibold leading-8 text-foam">
              {differentiation.summary}
            </p>
          </Link>
        </Panel>
      ) : null}

      {principles.length > 0 ? (
        <Panel title="Principios">
          <CardGrid cols={2}>
            {principles.map((entry) => (
              <KnowledgeCard key={entry.id} entry={entry} />
            ))}
          </CardGrid>
        </Panel>
      ) : null}

      {historic.length > 0 ? (
        <Panel title="Antecedentes estratégicos" hint="no usar como criterio vigente">
          <CardGrid cols={3}>
            {historic.map((entry) => (
              <KnowledgeCard key={entry.id} entry={entry} />
            ))}
          </CardGrid>
        </Panel>
      ) : null}
    </div>
  );
}

// ============================ MARKETING ============================
export function MarketingView({ entries }: { entries: E[] }) {
  const claims = byType(entries, "claim");
  const objeciones = byType(entries, "objecion");
  const ctas = byType(entries, "cta");
  const voice = entries.find((entry) => /voz y tono/i.test(entry.title));
  const mensajes = byType(entries, "mensaje", "guion").filter((entry) => entry !== voice);
  const contenidos = byType(entries, "pilar_contenido", "serie_contenido", "pieza_contenido");
  const awareness = mensajes
    .filter((entry) => typeof meta(entry).nivel === "number")
    .sort((a, b) => Number(meta(a).nivel) - Number(meta(b).nivel));
  const otherMessages = mensajes.filter((entry) => !awareness.includes(entry));
  const temperatureCtas = ctas.filter((entry) => /fr[ií]o|templado|caliente/i.test(entry.title));
  const otherCtas = ctas.filter((entry) => !temperatureCtas.includes(entry));

  return (
    <div className={styles.fade}>
      {voice ? (
        <Panel title="Voz y tono" hint="criterio rápido antes de escribir">
          <div className="grid overflow-hidden rounded-2xl border border-line md:grid-cols-[1.1fr_0.9fr]">
            <Link href={entryHref(voice.id)} className="bg-surface p-6 sm:p-8">
              <p className="text-2xl font-bold leading-snug text-foam">{voice.summary}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-lavender">
                Abrir guía de voz <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
            <div className="grid grid-cols-2 border-t border-line md:border-l md:border-t-0">
              <div className="bg-ok-soft/20 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-ok">Usar</p>
                <p className="mt-3 text-sm leading-6 text-foam">{str(meta(voice).si)}</p>
              </div>
              <div className="border-l border-line bg-danger-soft/20 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-danger">Evitar</p>
                <p className="mt-3 text-sm leading-6 text-foam">{str(meta(voice).no)}</p>
              </div>
            </div>
          </div>
        </Panel>
      ) : null}

      {claims.length > 0 ? (
        <Panel title="Claims" hint="capa y vigencia visibles">
          <div className="grid gap-3 sm:grid-cols-2">
            {claims.map((c) => (
              <Link key={c.id} href={entryHref(c.id)} className={cn("rounded-2xl border border-line bg-gradient-to-b from-raise to-surface p-6", styles.lift)}>
                <p className="text-xl font-bold leading-snug text-foam">«{str(meta(c).copyText) ?? c.summary ?? c.title}»</p>
                <p className="mt-2 text-[11px] uppercase tracking-wide text-faint">{OS_STATUS[c.status].label}</p>
              </Link>
            ))}
          </div>
        </Panel>
      ) : null}

      {contenidos.length > 0 ? (
        <Panel title="Mapa de contenidos" hint="pilares, series y piezas">
          <CardGrid cols={3}>{contenidos.map((e) => <KnowledgeCard key={e.id} entry={e} />)}</CardGrid>
        </Panel>
      ) : null}

      {awareness.length > 0 ? (
        <Panel title="Mensaje por nivel de conciencia" hint="no adelantar la oferta">
          <div className="grid gap-2 md:grid-cols-3">
            {awareness.map((entry) => (
              <Link
                key={entry.id}
                href={entryHref(entry.id)}
                className={cn("relative rounded-2xl border border-line bg-surface p-5", styles.lift)}
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-violet-soft text-xs font-extrabold text-lavender">
                  {String(meta(entry).nivel)}
                </span>
                <p className="mt-4 text-sm font-semibold leading-5 text-foam">
                  {entry.title.replace(/^Conciencia\s+\d+\s*·\s*/i, "")}
                </p>
                <p className="mt-2 text-xs leading-5 text-mist">{entry.summary}</p>
                {str(meta(entry).canal) ? (
                  <p className="mt-3 text-[10px] uppercase tracking-[0.1em] text-faint">
                    {str(meta(entry).canal)}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        </Panel>
      ) : null}

      {objeciones.length > 0 ? (
        <Panel title="Banco de objeciones" hint="respuesta recomendada y contexto">
          <div className="space-y-3">
            {objeciones.map((o) => (
              <Link
                key={o.id}
                href={entryHref(o.id)}
                className={cn("grid gap-4 rounded-2xl border border-line bg-surface p-5 md:grid-cols-[0.35fr_0.65fr]", styles.lift)}
              >
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-faint">
                    Objeción
                  </p>
                  <p className="mt-2 text-base font-semibold text-foam">
                    «{str(meta(o).objecion) ?? o.title.replace(/^Objeci[oó]n\s*·\s*/i, "")}»
                  </p>
                </div>
                <div className="border-t border-line pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ok">
                    Respuesta recomendada
                  </p>
                  <p className="mt-2 text-sm leading-6 text-mist">
                    {str(meta(o).respuesta) ?? o.summary}
                  </p>
                  {str(meta(o).estructura) ? (
                    <p className="mt-3 text-[10px] uppercase tracking-[0.1em] text-faint">
                      {str(meta(o).estructura)}
                    </p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      ) : null}

      {temperatureCtas.length > 0 ? (
        <Panel title="CTA por temperatura" hint="el compromiso debe encajar con la intención">
          <div className="grid gap-3 md:grid-cols-3">
            {temperatureCtas.map((entry) => (
              <Link
                key={entry.id}
                href={entryHref(entry.id)}
                className={cn("rounded-2xl border border-line bg-surface p-5", styles.lift)}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-foam">{entry.title.replace(/^CTA\s+/i, "")}</p>
                  <StatusBadge status={entry.status} />
                </div>
                <p className="mt-3 text-xs leading-5 text-mist">{entry.summary}</p>
                {str(meta(entry).ejemploAutorizado) ? (
                  <p className="mt-4 rounded-xl bg-raise p-3 text-xs leading-5 text-foam/85">
                    {str(meta(entry).ejemploAutorizado)}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        </Panel>
      ) : null}

      {otherMessages.length > 0 || otherCtas.length > 0 ? (
        <Panel title="Mensajes y marcos" hint="pitches, bios, reglas y guiones">
          <CardGrid cols={3}>
            {[...otherMessages, ...otherCtas].map((entry) => (
              <KnowledgeCard key={entry.id} entry={entry} />
            ))}
          </CardGrid>
        </Panel>
      ) : null}
    </div>
  );
}

// ============================ COMERCIAL ============================
export function ComercialView({ entries }: { entries: E[] }) {
  const embudo = find(entries, "com2-embudo") ?? entries.find((e) => /embudo/i.test(e.title));
  const etapas = embudo ? arr(meta(embudo).etapas) : undefined;
  const ofertas = byType(entries, "oferta");
  const price = entries.find((entry) => entry.type === "precio" || /precios vigentes/i.test(entry.title));
  const cases = byType(entries, "caso");
  const objections = byType(entries, "objecion");
  const scripts = byType(entries, "guion");
  const playbooks = byType(entries, "playbook").filter((e) => e.status !== "obsoleto");
  const otros = byType(entries, "regla", "mensaje", "definicion", "garantia").filter((e) => e !== embudo);
  return (
    <div className={styles.fade}>
      <Panel title="Ruta contextual" hint="del sector a la propuesta">
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface p-4">
          <div className="flex min-w-max items-center gap-2">
            {["Sector", "Dolor", "Oferta", "Objeciones", "Caso", "Guion", "Propuesta"].map(
              (step, index, all) => (
                <div key={step} className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-xl bg-raise px-3 py-2 text-xs font-semibold text-foam">
                    {index === 0 ? <Route className="h-3.5 w-3.5 text-lavender" /> : null}
                    {step}
                  </span>
                  {index < all.length - 1 ? <ArrowRight className="h-3.5 w-3.5 text-faint" /> : null}
                </div>
              ),
            )}
          </div>
        </div>
      </Panel>

      {price ? (
        <Panel title="Precio vigente" hint="fuente operativa, no factura fiscal">
          <Link
            href={entryHref(price.id)}
            className={cn("flex items-start gap-4 rounded-2xl border border-violet-line bg-violet-soft/30 p-6", styles.lift)}
          >
            <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-violet text-white">
              <CircleDollarSign className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-bold text-foam">{price.title}</span>
                <StatusBadge status={price.status} />
              </span>
              <span className="mt-2 block text-sm leading-6 text-mist">{price.summary}</span>
            </span>
          </Link>
        </Panel>
      ) : null}

      {embudo && etapas ? (
        <Panel title="Embudo comercial">
          <Link href={entryHref(embudo.id)} className="mb-3 block text-[13px] text-mist hover:text-foam">{embudo.summary}</Link>
          <div className="flex flex-wrap items-center gap-2">
            {etapas.map((et, i) => (
              <div key={et} className="flex items-center gap-2">
                <span className="rounded-xl border border-line bg-surface px-3 py-2 text-[12px] font-medium capitalize text-foam">{i + 1}. {et}</span>
                {i < etapas.length - 1 ? <ArrowRight className="h-3.5 w-3.5 text-faint" /> : null}
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {ofertas.length > 0 ? (
        <Panel title="Escalera de oferta" hint="alcance y estado antes de vender">
          <div className="space-y-2">
            {ofertas.map((o, i) => (
              <Link key={o.id} href={entryHref(o.id)} className={cn("flex items-center gap-4 rounded-2xl border border-line bg-surface p-4", styles.lift)}>
                <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-violet-soft font-bold text-lavender">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foam">{o.title}</p>
                  {o.summary ? <p className="truncate text-[12px] text-mist">{o.summary}</p> : null}
                </div>
                <StatusBadge status={o.status} />
              </Link>
            ))}
          </div>
        </Panel>
      ) : null}

      {cases.length > 0 ? (
        <Panel title="Casos y límites de uso" hint="evidencia comercial, no promesa universal">
          <div className="grid gap-3 md:grid-cols-3">
            {cases.map((entry) => (
              <Link
                key={entry.id}
                href={entryHref(entry.id)}
                className={cn("flex flex-col rounded-2xl border border-line bg-surface p-5", styles.lift)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-raise text-lavender">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <StatusBadge status={entry.status} />
                </div>
                <p className="mt-4 font-semibold leading-5 text-foam">{entry.title}</p>
                <p className="mt-2 text-xs leading-5 text-mist">{entry.summary}</p>
                <span className="mt-auto pt-4 text-[10px] uppercase tracking-[0.1em] text-faint">
                  Abrir evidencia y límites
                </span>
              </Link>
            ))}
          </div>
        </Panel>
      ) : null}

      {objections.length > 0 ? (
        <Panel title="Objeciones relacionadas">
          <div className="grid gap-3 md:grid-cols-2">
            {objections.slice(0, 6).map((entry) => (
              <Link
                key={entry.id}
                href={entryHref(entry.id)}
                className={cn("rounded-2xl border border-line bg-surface p-5", styles.lift)}
              >
                <div className="flex items-center gap-2 text-lavender">
                  <MessageCircleQuestion className="h-4 w-4" />
                  <p className="text-xs font-bold">
                    {str(meta(entry).objecion) ?? entry.title.replace(/^Objeci[oó]n\s*·\s*/i, "")}
                  </p>
                </div>
                <p className="mt-3 line-clamp-3 text-xs leading-5 text-mist">
                  {str(meta(entry).respuesta) ?? entry.summary}
                </p>
              </Link>
            ))}
          </div>
        </Panel>
      ) : null}

      {playbooks.length > 0 ? (
        <Panel title="Procesos comerciales" hint="ejecución relacionada">
          <CardGrid cols={3}>
            {playbooks.slice(0, 3).map((entry) => (
              <KnowledgeCard key={entry.id} entry={entry} />
            ))}
          </CardGrid>
        </Panel>
      ) : null}

      {scripts.length > 0 || otros.length > 0 ? (
        <Panel title="Guiones y referencias">
          <CardGrid cols={3}>
            {[...scripts, ...otros].slice(0, 9).map((entry) => (
              <KnowledgeCard key={entry.id} entry={entry} />
            ))}
          </CardGrid>
        </Panel>
      ) : null}
    </div>
  );
}

// ============================ CLIENTES ============================
export function ClientesView({ entries }: { entries: E[] }) {
  const casos = byType(entries, "caso");
  if (casos.length === 0) return <Empty title="Sin fichas de cliente todavía" />;
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", styles.stagger)}>
      {casos.map((c) => (
        <Link key={c.id} href={entryHref(c.id)} className={cn("flex flex-col gap-3 rounded-2xl border border-line bg-surface p-6", styles.lift)}>
          <div className="flex items-start justify-between">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-raise text-lavender font-bold">
              {c.title.charAt(0)}
            </span>
            <StatusBadge status={c.status} />
          </div>
          <p className="font-semibold leading-snug text-foam">{c.title}</p>
          {c.summary ? <p className="line-clamp-3 text-[13px] text-mist">{c.summary}</p> : null}
          <div className="mt-auto flex flex-wrap gap-1.5 text-[10px]">
            {str(meta(c).publication) ? <span className="rounded-full border border-line px-2 py-0.5 text-faint">{str(meta(c).publication)}</span> : null}
            {str(meta(c).resultKind) ? <span className="rounded-full border border-line px-2 py-0.5 text-faint">{str(meta(c).resultKind)}</span> : null}
          </div>
        </Link>
      ))}
    </div>
  );
}

// ============================ PLAYBOOKS ============================
export function PlaybooksView({ entries }: { entries: E[] }) {
  const pbs = byType(entries, "playbook").filter((e) => e.status !== "obsoleto");
  if (pbs.length === 0) return <Empty title="Sin playbooks" />;
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2", styles.stagger)}>
      {pbs.map((p) => (
        <Link key={p.id} href={entryHref(p.id)} className={cn("flex flex-col gap-3 rounded-2xl border border-line bg-surface p-6", styles.lift)}>
          <div className="flex items-center justify-between">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-soft text-lavender">
              <TypeIcon type="playbook" className="h-5 w-5" />
            </span>
            <StatusBadge status={p.status} />
          </div>
          <p className="text-lg font-bold leading-snug text-foam">{p.title.replace(/^Playbook\s*·\s*/i, "")}</p>
          {str(meta(p).goal) ? <p className="text-[13px] text-mist">{str(meta(p).goal)}</p> : p.summary ? <p className="text-[13px] text-mist">{p.summary}</p> : null}
          <div className="mt-auto flex flex-wrap gap-2 text-[11px] text-faint">
            {str(meta(p).whenToUse) ? <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {str(meta(p).whenToUse)}</span> : null}
          </div>
        </Link>
      ))}
    </div>
  );
}

// ============================ PROCESOS ============================
export function ProcesosView({ entries }: { entries: E[] }) {
  const flows = byType(entries, "playbook").filter((e) => arr(meta(e).steps) && e.status !== "obsoleto");
  if (flows.length === 0) return <Empty title="Sin procesos con pasos" hint="Los procesos se muestran a partir de playbooks con pasos definidos." />;
  return (
    <div className={cn("space-y-5", styles.stagger)}>
      {flows.map((f) => {
        const steps = arr(meta(f).steps)!;
        const checklist = arr(meta(f).checklist);
        return (
          <section key={f.id} className="rounded-2xl border border-line bg-surface p-6">
            <div className="mb-4 flex items-center gap-2">
              <Link href={entryHref(f.id)} className="text-lg font-bold text-foam hover:text-lavender">{f.title.replace(/^Playbook\s*·\s*/i, "")}</Link>
              <StatusBadge status={f.status} />
            </div>
            <div className="flex flex-col gap-0">
              {steps.map((s, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="grid h-7 w-7 flex-none place-items-center rounded-full border border-violet-line bg-violet-soft text-[12px] font-bold text-lavender">{i + 1}</span>
                    {i < steps.length - 1 ? <span className="my-1 w-px flex-1 bg-line" /> : null}
                  </div>
                  <p className="pb-4 pt-0.5 text-[13px] text-foam/90">{s}</p>
                </div>
              ))}
            </div>
            {checklist ? (
              <div className="mt-2 rounded-xl border border-line bg-ink/40 p-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-faint">Checklist</p>
                {checklist.map((c, i) => (
                  <p key={i} className="flex items-start gap-2 py-0.5 text-[13px] text-mist"><Check className="mt-0.5 h-3.5 w-3.5 flex-none text-ok" /> {c}</p>
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

// ============================ RECURSOS ============================
export function RecursosView({ entries }: { entries: E[] }) {
  const recs = byType(entries, "recurso", "guion");
  if (recs.length === 0) return <Empty title="Sin recursos" />;
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", styles.stagger)}>
      {recs.map((r) => (
        <div key={r.id} className={cn("flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5", styles.lift)}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wide text-faint">{OS_TYPE_LABEL[r.type]}</span>
            {r.body ? <CopyButton text={r.body} label="Copiar" /> : null}
          </div>
          <Link href={entryHref(r.id)} className="font-semibold leading-snug text-foam hover:text-lavender">{r.title}</Link>
          {str(meta(r).uso) ? <p className="text-[12px] text-mist"><b className="text-faint">Uso:</b> {str(meta(r).uso)}</p> : r.summary ? <p className="line-clamp-2 text-[12px] text-mist">{r.summary}</p> : null}
          {str(meta(r).cuandoNoUsar) ? <p className="text-[12px] text-warn/80"><b>No usar:</b> {str(meta(r).cuandoNoUsar)}</p> : null}
        </div>
      ))}
    </div>
  );
}

// ============================ CONSTITUCIÓN ============================
export function ConstitucionView({ entries }: { entries: E[] }) {
  const arts = byType(entries, "principio", "regla", "prohibicion", "articulo_constitucion", "definicion");
  if (arts.length === 0) return <Empty title="Sin artículos" />;
  return (
    <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
      <nav className="hidden lg:block">
        <div className="sticky top-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-faint">Índice</p>
          <ul className="space-y-1">
            {arts.map((a) => (
              <li key={a.id}><a href={`#art-${a.id}`} className="block truncate text-[12px] text-mist hover:text-lavender">{a.title.replace(/^No negociable\s*·\s*|^Regla\s*·\s*/i, "")}</a></li>
            ))}
          </ul>
        </div>
      </nav>
      <div className={cn("space-y-4", styles.stagger)}>
        {arts.map((a) => (
          <article key={a.id} id={`art-${a.id}`} className="scroll-mt-4 rounded-2xl border border-line bg-surface p-6">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-foam">{a.title}</h3>
              <AuthorityBadge authority={a.authority} />
            </div>
            {a.body ? <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-foam/85">{a.body}</p> : a.summary ? <p className="text-[14px] text-mist">{a.summary}</p> : null}
            <div className="mt-3"><Link href={entryHref(a.id)} className="text-xs text-lavender hover:underline">Ficha completa · relaciones →</Link></div>
          </article>
        ))}
      </div>
    </div>
  );
}

// ============================ FALLBACK ============================
export function GenericView({ entries }: { entries: E[] }) {
  if (entries.length === 0) return <Empty title="Sin entradas" />;
  return <CardGrid cols={3}>{entries.map((e) => <KnowledgeCard key={e.id} entry={e} />)}</CardGrid>;
}
