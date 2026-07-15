import Link from "next/link";
import { Check, ArrowRight, Clock, AlertTriangle } from "lucide-react";
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
  const logo = entries.find((e) => e.type === "regla_marca" && /logo/i.test(e.title));
  const colors = byType(entries, "token_visual").filter((e) => str(meta(e).hex));
  const tipografia = entries.find((e) => /tipograf/i.test(e.title));
  const reglas = byType(entries, "regla_marca").filter((e) => e !== logo && e !== tipografia);

  return (
    <div className={styles.fade}>
      {logo ? (
        <Panel title="Logo">
          <div className="rounded-2xl border border-warn/30 bg-warn-soft/40 p-5">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warn" />
              <p className="font-semibold text-foam">{logo.title}</p>
              <StatusBadge status={logo.status} />
            </div>
            {str(meta(logo).callout) ? (
              <p className="mb-3 text-sm text-warn">{str(meta(logo).callout)}</p>
            ) : null}
            {logo.body ? <p className="whitespace-pre-wrap text-[13px] text-mist">{logo.body}</p> : null}
            {arr(meta(logo).pendientesTecnicos) ? (
              <div className="mt-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-faint">Pendiente (sin manual técnico cerrado)</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {arr(meta(logo).pendientesTecnicos)!.map((p) => (
                    <span key={p} className="rounded-full border border-line px-2 py-0.5 text-[11px] text-faint">{p}</span>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-3"><Link href={entryHref(logo.id)} className="text-xs text-lavender hover:underline">Abrir ficha →</Link></div>
          </div>
        </Panel>
      ) : null}

      {colors.length > 0 ? (
        <Panel title="Paleta" hint="clic para copiar el HEX">
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

      {tipografia ? (
        <Panel title="Tipografía">
          <div className="rounded-2xl border border-line bg-surface p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-faint">{str(meta(tipografia).pesos) ? `Plus Jakarta Sans · ${str(meta(tipografia).pesos)}` : tipografia.title}</p>
            <p className="mt-2 text-4xl font-extrabold tracking-tight text-foam">Lo que entra no debería perderse</p>
            <p className="mt-3 text-2xl font-bold text-foam">Jerarquía por peso, escala y aire</p>
            <p className="mt-2 max-w-prose text-sm text-mist">{tipografia.body ?? tipografia.summary}</p>
          </div>
        </Panel>
      ) : null}

      {reglas.length > 0 ? (
        <Panel title="Dirección y reglas">
          <CardGrid cols={3}>{reglas.map((e) => <KnowledgeCard key={e.id} entry={e} />)}</CardGrid>
        </Panel>
      ) : null}
    </div>
  );
}

// ============================ ESTRATEGIA ============================
export function EstrategiaView({ entries }: { entries: E[] }) {
  const cards = byType(entries, "principio", "definicion", "posicionamiento", "icp");
  const hyps = byType(entries, "hipotesis");
  const timeline = byType(entries, "decision", "experimento", "riesgo", "aprendizaje");
  const hypCols: { k: string; label: string }[] = [
    { k: "provisional", label: "En validación" },
    { k: "condicionado", label: "Condicionadas" },
    { k: "validado", label: "Validadas" },
  ];
  return (
    <div className={styles.fade}>
      {cards.length > 0 ? (
        <Panel title="Fundamentos">
          <CardGrid cols={3}>{cards.map((e) => <KnowledgeCard key={e.id} entry={e} />)}</CardGrid>
        </Panel>
      ) : null}

      {hyps.length > 0 ? (
        <Panel title="Hipótesis" hint={`${hyps.length} en el tablero`}>
          <div className="grid gap-3 sm:grid-cols-3">
            {hypCols.map((col) => {
              const items = hyps.filter((h) => (col.k === "provisional" ? ["provisional", "borrador"].includes(h.status) : h.status === col.k));
              return (
                <div key={col.k} className="rounded-2xl border border-line bg-surface/50 p-3">
                  <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide text-faint">{col.label} · {items.length}</p>
                  {items.map((h) => (
                    <Link key={h.id} href={entryHref(h.id)} className={cn("mb-2 block rounded-xl border border-line bg-surface p-3", styles.lift)}>
                      <p className="text-[13px] font-medium text-foam">{h.title}</p>
                      {str(meta(h).threshold) ? <p className="mt-1 text-[11px] text-faint">Umbral: {str(meta(h).threshold)}</p> : null}
                    </Link>
                  ))}
                  {items.length === 0 ? <p className="px-1 text-[12px] text-faint">—</p> : null}
                </div>
              );
            })}
          </div>
        </Panel>
      ) : null}

      {timeline.length > 0 ? (
        <Panel title="Decisiones, experimentos y riesgos">
          <div className="relative ml-2 border-l border-line pl-5">
            {timeline.map((e) => (
              <div key={e.id} className="relative mb-4">
                <span className="absolute -left-[27px] top-1 grid h-5 w-5 place-items-center rounded-full border border-line-strong bg-raise text-lavender">
                  <TypeIcon type={e.type} className="h-3 w-3" />
                </span>
                <Link href={entryHref(e.id)} className="group">
                  <p className="text-[13px] font-semibold text-foam group-hover:text-lavender">{e.title}</p>
                  {e.summary ? <p className="mt-0.5 text-[12px] text-mist">{e.summary}</p> : null}
                  <span className="text-[10px] uppercase tracking-wide text-faint">{OS_TYPE_LABEL[e.type]} · {OS_STATUS[e.status].label}</span>
                </Link>
              </div>
            ))}
          </div>
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
  const mensajes = byType(entries, "mensaje", "guion");
  const contenidos = byType(entries, "pilar_contenido", "serie_contenido", "pieza_contenido");
  return (
    <div className={styles.fade}>
      {claims.length > 0 ? (
        <Panel title="Claims">
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
        <Panel title="Contenidos" hint="pilares y series">
          <CardGrid cols={3}>{contenidos.map((e) => <KnowledgeCard key={e.id} entry={e} />)}</CardGrid>
        </Panel>
      ) : null}

      {ctas.length > 0 ? (
        <Panel title="CTAs por temperatura">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ctas.map((e) => <KnowledgeCard key={e.id} entry={e} />)}
          </div>
        </Panel>
      ) : null}

      {objeciones.length > 0 ? (
        <Panel title="Banco de objeciones">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {objeciones.map((o) => (
              <Link key={o.id} href={entryHref(o.id)} className={cn("rounded-xl border border-line bg-surface p-4", styles.lift)}>
                <p className="text-[13px] font-semibold text-foam">{o.title.replace(/^Objeci[oó]n\s*·\s*/i, "")}</p>
                {o.summary ? <p className="mt-1 line-clamp-2 text-[12px] text-mist">{o.summary}</p> : null}
              </Link>
            ))}
          </div>
        </Panel>
      ) : null}

      {mensajes.length > 0 ? (
        <Panel title="Mensajes y guiones" hint="voz, conciencia, canal">
          <CardGrid cols={3}>{mensajes.map((e) => <KnowledgeCard key={e.id} entry={e} />)}</CardGrid>
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
  const playbooks = byType(entries, "playbook").filter((e) => e.status !== "obsoleto");
  const otros = byType(entries, "guion", "regla", "mensaje", "definicion", "garantia", "precio").filter((e) => e !== embudo);
  return (
    <div className={styles.fade}>
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
        <Panel title="Escalera de oferta">
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

      {playbooks.length > 0 ? (
        <Panel title="Playbooks de venta">
          <CardGrid cols={3}>{playbooks.map((e) => <KnowledgeCard key={e.id} entry={e} />)}</CardGrid>
        </Panel>
      ) : null}

      {otros.length > 0 ? (
        <Panel title="Más conocimiento comercial">
          <CardGrid cols={3}>{otros.map((e) => <KnowledgeCard key={e.id} entry={e} />)}</CardGrid>
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
