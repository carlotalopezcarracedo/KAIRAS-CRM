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
  FlaskConical,
  Lightbulb,
  ShieldAlert,
  CalendarRange,
  Repeat2,
} from "lucide-react";
import { CopyButton } from "@/components/os/copy-button";
import { IntentLink as Link } from "@/components/navigation/intent-link";
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
function SourceLink({ entry, label = "Abrir fuente" }: { entry: E; label?: string }) {
  return (
    <Link
      href={entryHref(entry.id)}
      aria-label={`${label}: ${entry.title}`}
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-lavender hover:underline"
    >
      {label} <ArrowRight className="h-3 w-3" />
    </Link>
  );
}

export function StrategyOverviewView({ entries }: { entries: E[] }) {
  const current = entries.filter(
    (entry) => !["historico", "obsoleto", "archivado"].includes(entry.status),
  );
  const entryByKey = new Map(current.map((entry) => [entry.externalKey, entry]));
  const purpose = entryByKey.get("id-proposito");
  const mission = entryByKey.get("id-mision");
  const positioning = entryByKey.get("id-posicionamiento");
  const differentiation = entryByKey.get("id-diferenciacion");
  const solves = entryByKey.get("id-resuelve");
  const doesNotSolve = entryByKey.get("id-no-resuelve");
  const icp = entryByKey.get("id-icp");
  const noIcp = entryByKey.get("id-no-icp");
  const decision = entryByKey.get("val-decision-vertical");
  const funnel = entryByKey.get("com2-embudo");
  const channelStrategy = entryByKey.get("com2-mensajes-canal");
  const experiment = entryByKey.get("val-exp-ou1");
  const risk = entryByKey.get("val-riesgo-agosto");
  const guarantee = entryByKey.get("of-garantias");
  const offers = ["of-chequeo", "of-mapa", "of-proyecto", "of-continuo"]
    .map((key) => entryByKey.get(key))
    .filter((entry): entry is E => Boolean(entry));
  const hypotheses = current
    .filter((entry) => entry.type === "hipotesis")
    .sort((a, b) =>
      (a.hypothesisRef ?? a.title).localeCompare(b.hypothesisRef ?? b.title, "es", {
        numeric: true,
      }),
    );
  const evidence = current.filter((entry) => entry.type === "caso");
  const rules = current.filter(
    (entry) =>
      entry.area === "constitucion" &&
      ["regla", "prohibicion"].includes(entry.type),
  );

  if (current.length === 0) {
    return (
      <Empty
        title="La vista ejecutiva aún no tiene fuentes"
        hint="Añade identidad, oferta, validación y reglas para construir el resumen."
      />
    );
  }

  return (
    <div className={styles.fade}>
      <section className="mb-8 overflow-hidden rounded-2xl border border-line bg-[#e1e8f0] text-[#0d090b]">
        <div className="p-7 sm:p-9">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#0d090b]/45">
              Estrategia ejecutiva · lectura de 60 segundos
            </p>
            {purpose ? <SourceLink entry={purpose} label="Ver fundamento" /> : null}
          </div>
          <h2 className="mt-5 max-w-5xl text-3xl font-extrabold leading-tight tracking-[-0.035em] sm:text-4xl">
            {purpose?.summary ?? "La estrategia de KAIRAS, reunida en una sola página."}
          </h2>
          {mission ? (
            <p className="mt-4 max-w-4xl text-sm leading-6 text-[#0d090b]/65">
              {mission.summary}
            </p>
          ) : null}
        </div>
        <div className="grid border-t border-[#0d090b]/10 md:grid-cols-3">
          {[
            {
              label: "Foco actual",
              value: decision?.title.replace(/^Decisión\s*·\s*/i, "") ?? "Por definir",
            },
            { label: "Cliente prioritario", value: icp?.summary ?? "Por definir" },
            { label: "Posicionamiento", value: positioning?.summary ?? "Por definir" },
          ].map((item, index) => (
            <div
              key={item.label}
              className={cn(
                "p-5 sm:p-6",
                index > 0 ? "border-t border-[#0d090b]/10 md:border-l md:border-t-0" : "",
              )}
            >
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#0d090b]/40">
                {item.label}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <Panel title="La apuesta" hint="problema, cliente y ventaja en una sola lectura">
        <div className="grid gap-3 lg:grid-cols-3">
          <article className="rounded-2xl border border-ok/25 bg-ok-soft/20 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-ok">
              Problema elegido
            </p>
            <p className="mt-3 text-sm leading-6 text-foam">
              {solves?.summary ?? "Problema por definir."}
            </p>
            {solves ? <div className="mt-4"><SourceLink entry={solves} /></div> : null}
          </article>
          <article className="rounded-2xl border border-violet-line bg-violet-soft/25 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-lavender">
              Por qué KAIRAS
            </p>
            <p className="mt-3 text-sm leading-6 text-foam">
              {differentiation?.summary ?? "Diferenciación por definir."}
            </p>
            {differentiation ? (
              <div className="mt-4"><SourceLink entry={differentiation} /></div>
            ) : null}
          </article>
          <article className="rounded-2xl border border-danger/25 bg-danger-soft/20 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-danger">
              Fuera de alcance
            </p>
            <p className="mt-3 text-sm leading-6 text-foam">
              {doesNotSolve?.summary ?? "Límites por definir."}
            </p>
            {doesNotSolve ? (
              <div className="mt-4"><SourceLink entry={doesNotSolve} /></div>
            ) : null}
          </article>
        </div>
        {noIcp ? (
          <div className="mt-3 flex flex-col gap-2 rounded-xl border border-line bg-surface px-4 py-3 sm:flex-row sm:items-center">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-faint">
              No-ICP
            </span>
            <p className="text-xs leading-5 text-mist sm:border-l sm:border-line sm:pl-3">
              {noIcp.summary}
            </p>
          </div>
        ) : null}
      </Panel>

      {offers.length > 0 ? (
        <Panel title="De entrada a recurrencia" hint="arquitectura de oferta y precios visibles">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {offers.map((offer, index) => (
              <article key={offer.id} className="relative rounded-2xl border border-line bg-surface p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-violet-soft text-xs font-extrabold text-lavender">
                    {index + 1}
                  </span>
                  <StatusBadge status={offer.status} />
                </div>
                <h3 className="mt-4 font-bold leading-5 text-foam">{offer.title}</h3>
                <p className="mt-2 text-xs leading-5 text-mist">{offer.summary}</p>
                <div className="mt-4"><SourceLink entry={offer} /></div>
              </article>
            ))}
          </div>
          {guarantee ? (
            <div className="mt-3 rounded-xl border border-ok/20 bg-ok/5 px-4 py-3">
              <p className="text-xs leading-5 text-mist">
                <b className="text-ok">Garantías admisibles:</b> {guarantee.summary}
              </p>
            </div>
          ) : null}
        </Panel>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="mb-8 rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <div className="flex items-center gap-2 text-lavender">
            <Route className="h-4 w-4" />
            <h2 className="text-[13px] font-bold uppercase tracking-[0.12em]">
              Cómo llega al mercado
            </h2>
          </div>
          {funnel ? (
            <>
              <p className="mt-4 text-sm font-semibold leading-6 text-foam">{funnel.summary}</p>
              <div className="mt-3"><SourceLink entry={funnel} label="Abrir embudo" /></div>
            </>
          ) : null}
          {channelStrategy ? (
            <div className="mt-5 border-t border-line pt-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-faint">
                Papel de cada canal
              </p>
              <p className="mt-2 text-xs leading-5 text-mist">{channelStrategy.summary}</p>
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                {[
                  ["WhatsApp", str(meta(channelStrategy).whatsapp)],
                  ["Instagram", str(meta(channelStrategy).instagram)],
                  ["Email", str(meta(channelStrategy).email)],
                  ["Teléfono", str(meta(channelStrategy).telefono)],
                ].map(([label, value]) =>
                  value ? (
                    <div key={label} className="rounded-lg bg-raise px-3 py-2">
                      <dt className="text-[9px] font-bold uppercase tracking-wide text-faint">
                        {label}
                      </dt>
                      <dd className="mt-1 text-xs text-foam">{value}</dd>
                    </div>
                  ) : null,
                )}
              </dl>
            </div>
          ) : null}
          {experiment ? (
            <div className="mt-5 rounded-xl border border-violet-line bg-violet-soft/20 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-lavender">
                Canal madre en prueba
              </p>
              <p className="mt-2 text-sm font-semibold text-foam">{experiment.title}</p>
              <p className="mt-2 text-xs leading-5 text-mist">{experiment.summary}</p>
            </div>
          ) : null}
        </section>

        <section className="mb-8 rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <div className="flex items-center gap-2 text-warn">
            <FlaskConical className="h-4 w-4" />
            <h2 className="text-[13px] font-bold uppercase tracking-[0.12em]">
              Qué debe demostrarse
            </h2>
          </div>
          <p className="mt-2 text-xs leading-5 text-faint">
            Son supuestos activos, no hechos. Cada uno conserva su umbral de decisión.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {hypotheses.map((hypothesis) => (
              <article key={hypothesis.id} className="rounded-xl border border-line bg-ink/40 p-3.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-warn">
                    {str(meta(hypothesis).code) ?? hypothesis.hypothesisRef}
                  </span>
                  <StatusBadge status={hypothesis.status} />
                </div>
                <p className="mt-2 text-xs font-semibold leading-5 text-foam">
                  {str(meta(hypothesis).statement) ?? hypothesis.title}
                </p>
                <p className="mt-1 text-[11px] leading-4 text-faint">
                  {str(meta(hypothesis).threshold) ?? hypothesis.summary}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>

      <Panel title="Evidencia, riesgo y reglas" hint="qué sabemos y cómo decidimos">
        <div className="grid gap-3 lg:grid-cols-3">
          <article className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center gap-2 text-ok">
              <Building2 className="h-4 w-4" />
              <p className="text-[10px] font-bold uppercase tracking-[0.12em]">
                Evidencia disponible
              </p>
            </div>
            <div className="mt-4 space-y-4">
              {evidence.length > 0 ? evidence.map((caseEntry) => (
                <div key={caseEntry.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold text-foam">{caseEntry.title}</p>
                    <StatusBadge status={caseEntry.status} />
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-mist">{caseEntry.summary}</p>
                </div>
              )) : <p className="text-xs text-faint">Todavía no hay casos utilizables como evidencia.</p>}
            </div>
          </article>

          <article className="rounded-2xl border border-warn/25 bg-warn-soft/15 p-5">
            <div className="flex items-center gap-2 text-warn">
              <ShieldAlert className="h-4 w-4" />
              <p className="text-[10px] font-bold uppercase tracking-[0.12em]">
                Riesgo actual
              </p>
            </div>
            {risk ? (
              <>
                <p className="mt-4 text-sm font-semibold leading-5 text-foam">{risk.title}</p>
                <p className="mt-2 text-xs leading-5 text-mist">{risk.summary}</p>
                {str(meta(risk).mitigation) ? (
                  <p className="mt-3 text-xs leading-5 text-warn">
                    <b>Mitigación:</b> {str(meta(risk).mitigation)}
                  </p>
                ) : null}
              </>
            ) : <p className="mt-4 text-xs text-faint">No hay un riesgo prioritario registrado.</p>}
          </article>

          <article className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center gap-2 text-lavender">
              <CheckCircle2 className="h-4 w-4" />
              <p className="text-[10px] font-bold uppercase tracking-[0.12em]">
                No negociables
              </p>
            </div>
            <ul className="mt-4 space-y-3">
              {rules.map((rule) => (
                <li key={rule.id} className="flex items-start gap-2 text-xs leading-5 text-mist">
                  <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-lavender" />
                  <span>{rule.summary}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </Panel>
    </div>
  );
}

// ============================ IDENTIDAD ============================
export function IdentityView({ entries }: { entries: E[] }) {
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
  const operational = pbs.filter((entry) => !["historico", "archivado"].includes(entry.status));
  const historic = pbs.filter((entry) => ["historico", "archivado"].includes(entry.status));
  if (pbs.length === 0) return <Empty title="Sin playbooks" hint="Los procedimientos aparecerán aquí cuando tengan objetivo, pasos y criterio de cierre." />;
  return (
    <div className={styles.fade}>
      <Panel title="Listos para ejecutar" hint={`${operational.length} procedimientos operativos`}>
        <div className={cn("grid gap-4 lg:grid-cols-2", styles.stagger)}>
          {operational.map((p) => {
            const steps = arr(meta(p).steps) ?? [];
            const checklist = arr(meta(p).checklist) ?? [];
            const done = str(meta(p).definitionOfDone);
            const when = str(meta(p).whenToUse);
            return (
              <Link key={p.id} href={entryHref(p.id)} className={cn("group flex flex-col rounded-2xl border border-line bg-surface p-6", styles.lift)}>
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-soft text-lavender">
                    <TypeIcon type="playbook" className="h-5 w-5" />
                  </span>
                  <StatusBadge status={p.status} />
                </div>
                <h2 className="mt-4 text-lg font-bold leading-snug text-foam group-hover:text-lavender">
                  {p.title.replace(/^Playbook\s*·\s*/i, "")}
                </h2>
                <p className="mt-2 text-[13px] leading-5 text-mist">
                  {str(meta(p).goal) ?? p.summary ?? "Objetivo pendiente de documentar."}
                </p>
                {when ? (
                  <p className="mt-4 flex items-start gap-2 rounded-xl bg-ink/40 px-3 py-2 text-xs leading-5 text-mist">
                    <Clock className="mt-0.5 h-3.5 w-3.5 flex-none text-lavender" />
                    <span><b className="text-foam">Úsalo cuando:</b> {when}</span>
                  </p>
                ) : null}
                {steps.length > 0 ? (
                  <ol className="mt-4 space-y-2">
                    {steps.slice(0, 3).map((step, index) => (
                      <li key={step} className="flex gap-2 text-xs leading-5 text-foam/85">
                        <span className="grid h-5 w-5 flex-none place-items-center rounded-full border border-violet-line text-[10px] font-bold text-lavender">{index + 1}</span>
                        <span className="line-clamp-1">{step}</span>
                      </li>
                    ))}
                  </ol>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wide text-faint">
                  {steps.length > 0 ? <span>{steps.length} pasos</span> : null}
                  {checklist.length > 0 ? <span>· {checklist.length} controles</span> : null}
                </div>
                {done ? (
                  <div className="mt-4 border-t border-line pt-3 text-xs leading-5 text-ok">
                    <b>Cierre:</b> {done}
                  </div>
                ) : null}
              </Link>
            );
          })}
        </div>
      </Panel>
      {historic.length > 0 ? (
        <Panel title="Histórico" hint="referencia, no procedimiento vigente">
          <CardGrid cols={3}>
            {historic.map((entry) => <KnowledgeCard key={entry.id} entry={entry} />)}
          </CardGrid>
        </Panel>
      ) : null}
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

// ============================ APRENDIZAJE ============================
export function LearningView({ entries }: { entries: E[] }) {
  const decisions = byType(entries, "decision");
  const hypotheses = byType(entries, "hipotesis");
  const experiments = byType(entries, "experimento");
  const risks = byType(entries, "riesgo");

  if (entries.length === 0) {
    return <Empty title="Sin aprendizaje registrado" hint="Documenta primero la decisión o hipótesis que debe guiar el trabajo." />;
  }

  return (
    <div className={styles.fade}>
      {decisions.length > 0 ? (
        <Panel title="Decisión vigente" hint="la referencia para actuar hoy">
          {decisions.map((decision) => (
            <Link key={decision.id} href={entryHref(decision.id)} className="block rounded-2xl border border-ok/25 bg-ok/5 p-6 transition-colors hover:border-ok/45">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={decision.status} />
                {str(meta(decision).decidedAt) ? <span className="text-xs text-faint">{str(meta(decision).decidedAt)}</span> : null}
                {meta(decision).reversible === true ? <span className="text-xs text-faint">· reversible</span> : null}
              </div>
              <h2 className="mt-3 text-xl font-bold text-foam">{decision.title.replace(/^Decisión\s*·\s*/i, "")}</h2>
              <p className="mt-2 text-sm leading-6 text-mist">{decision.summary}</p>
              {str(meta(decision).why) ? <p className="mt-3 text-xs text-ok"><b>Por qué:</b> {str(meta(decision).why)}</p> : null}
            </Link>
          ))}
        </Panel>
      ) : null}

      {hypotheses.length > 0 ? (
        <Panel title="Hipótesis activas" hint="supuestos con umbral explícito">
          <div className={cn("grid gap-3 md:grid-cols-2", styles.stagger)}>
            {hypotheses.map((hypothesis) => (
              <Link key={hypothesis.id} href={entryHref(hypothesis.id)} className={cn("rounded-2xl border border-line bg-surface p-5", styles.lift)}>
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-warn-soft text-warn"><Lightbulb className="h-4 w-4" /></span>
                  <StatusBadge status={hypothesis.status} />
                </div>
                <p className="mt-3 font-semibold leading-5 text-foam">{str(meta(hypothesis).statement) ?? hypothesis.title}</p>
                <p className="mt-3 text-xs leading-5 text-warn"><b>{str(meta(hypothesis).code) ?? "Umbral"}:</b> {str(meta(hypothesis).threshold) ?? hypothesis.summary}</p>
              </Link>
            ))}
          </div>
        </Panel>
      ) : null}

      {experiments.length > 0 ? (
        <Panel title="Experimentos" hint="qué ocurrirá después de medir">
          <div className="space-y-4">
            {experiments.map((experiment) => (
              <Link key={experiment.id} href={entryHref(experiment.id)} className="block rounded-2xl border border-line bg-surface p-6 transition-colors hover:border-violet-line">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-soft text-lavender"><FlaskConical className="h-4 w-4" /></span>
                  <h3 className="font-bold text-foam">{experiment.title}</h3>
                  <StatusBadge status={experiment.status} />
                </div>
                <p className="mt-3 text-sm text-mist">{experiment.summary}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-ok/20 bg-ok/5 p-3 text-xs leading-5 text-mist"><b className="text-ok">Si funciona:</b> {str(meta(experiment).ifSuccess) ?? "Resultado por definir"}</div>
                  <div className="rounded-xl border border-warn/20 bg-warn-soft/20 p-3 text-xs leading-5 text-mist"><b className="text-warn">Si no:</b> {str(meta(experiment).ifFail) ?? "Siguiente decisión por definir"}</div>
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      ) : null}

      {risks.length > 0 ? (
        <Panel title="Riesgos">
          {risks.map((risk) => (
            <Link key={risk.id} href={entryHref(risk.id)} className="flex items-start gap-4 rounded-2xl border border-warn/25 bg-warn-soft/20 p-5">
              <ShieldAlert className="mt-0.5 h-5 w-5 flex-none text-warn" />
              <div>
                <h3 className="font-semibold text-foam">{risk.title}</h3>
                <p className="mt-1 text-xs leading-5 text-mist">{risk.summary}</p>
                {str(meta(risk).mitigation) ? <p className="mt-2 text-xs text-warn"><b>Mitigación:</b> {str(meta(risk).mitigation)}</p> : null}
              </div>
            </Link>
          ))}
        </Panel>
      ) : null}
    </div>
  );
}

// ============================ CONTENIDOS ============================
export function ContentView({ entries }: { entries: E[] }) {
  const operational = entries.filter((entry) => !["obsoleto", "historico", "archivado"].includes(entry.status));
  const sprint = operational.find((entry) => /sprint/i.test(entry.title));
  const pillars = byType(operational, "pilar_contenido");
  const series = byType(operational, "serie_contenido");
  const pieces = byType(operational, "pieza_contenido");

  return (
    <div className={styles.fade}>
      {sprint ? (
        <Panel title="Plan activo" hint="orden de publicación propuesto">
          <Link href={entryHref(sprint.id)} className="block rounded-2xl border border-info/25 bg-info/5 p-6 transition-colors hover:border-info/45">
            <div className="flex items-center gap-2">
              <CalendarRange className="h-5 w-5 text-info" />
              <StatusBadge status={sprint.status} />
            </div>
            <h2 className="mt-3 text-xl font-bold text-foam">{sprint.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-mist">{sprint.summary}</p>
            <p className="mt-3 text-xs text-info">Abre la ficha para consultar el desarrollo completo del sprint →</p>
          </Link>
        </Panel>
      ) : null}

      {pillars.length > 0 ? (
        <Panel title="Pilares" hint="para elegir el porqué de cada pieza">
          <div className={cn("grid gap-3 md:grid-cols-2 xl:grid-cols-3", styles.stagger)}>
            {pillars.map((pillar, index) => (
              <Link key={pillar.id} href={entryHref(pillar.id)} className={cn("rounded-2xl border border-line bg-surface p-5", styles.lift)}>
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-info">Pilar {index + 1}</span>
                <h3 className="mt-2 font-bold leading-5 text-foam">{pillar.title.replace(/^Pilar \d+\s*·\s*/i, "")}</h3>
                <p className="mt-3 text-xs leading-5 text-mist">{pillar.summary}</p>
              </Link>
            ))}
          </div>
        </Panel>
      ) : null}

      {series.length > 0 ? (
        <Panel title="Series recurrentes" hint="formatos que convierten el sistema en hábito">
          <div className="grid gap-3 sm:grid-cols-2">
            {series.map((seriesEntry) => (
              <Link key={seriesEntry.id} href={entryHref(seriesEntry.id)} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-violet-line">
                <Repeat2 className="mt-0.5 h-4 w-4 flex-none text-lavender" />
                <div>
                  <h3 className="font-semibold text-foam">{seriesEntry.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-mist">{seriesEntry.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      ) : null}

      <Panel title="Piezas individuales" hint="ejecución concreta">
        {pieces.length > 0 ? (
          <CardGrid cols={3}>{pieces.map((piece) => <KnowledgeCard key={piece.id} entry={piece} />)}</CardGrid>
        ) : (
          <Empty title="Aún no hay piezas individuales registradas" hint="El sprint, los pilares y las series sí están definidos. Crea cada pieza cuando tenga objetivo, público y criterio de éxito." />
        )}
      </Panel>
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
            {r.summary ? <CopyButton text={r.summary} label="Copiar resumen" /> : null}
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
            {a.summary ? <p className="text-[14px] leading-6 text-mist">{a.summary}</p> : null}
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
