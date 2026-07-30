import Link from "next/link";
import { entryHref } from "../_sections";
import { OS_RELATION_LABEL } from "../_config";

export type GraphNode = { id: string; title: string; type: string };
export type GraphRel = { id: string; type: string; otherId: string; otherTitle: string };

/** Grafo de vecindad inmediata de una entrada (estilo Obsidian, navegable). */
export function RelationshipGraph({ center, relations }: { center: GraphNode; relations: GraphRel[] }) {
  const rels = relations.slice(0, 10);
  if (rels.length === 0) return null;
  const W = 640, H = 300, cx = W / 2, cy = H / 2, R = 108;
  const pts = rels.map((_, i) => {
    const a = (i / rels.length) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  });
  const short = (t: string) => (t.length > 22 ? t.slice(0, 21) + "…" : t);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-[radial-gradient(500px_260px_at_50%_45%,rgba(139,93,245,0.08),transparent_70%)] bg-surface">
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[300px] w-full min-w-[520px]" role="img" aria-label={`Relaciones de ${center.title}`}>
          <g stroke="rgba(139,93,245,0.3)" strokeWidth="1.5">
            {pts.map((p, i) => <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} />)}
          </g>
          {rels.map((r, i) => {
            const p = pts[i];
            const mx = (cx + p.x) / 2, my = (cy + p.y) / 2;
            return (
              <text key={`l${r.id}`} x={mx} y={my} textAnchor="middle" fontSize="9" fill="rgba(225,232,240,0.42)">
                {OS_RELATION_LABEL[r.type] ?? r.type}
              </text>
            );
          })}
          {rels.map((r, i) => {
            const p = pts[i];
            return (
              <Link key={r.id} href={entryHref(r.otherId)} prefetch={false}>
                <g>
                  <circle cx={p.x} cy={p.y} r="8" fill="#1e1b24" stroke="rgba(225,232,240,0.22)" />
                  <text x={p.x} y={p.y + (p.y < cy ? -14 : 22)} textAnchor="middle" fontSize="10" fill="#aab2be">{short(r.otherTitle)}</text>
                </g>
              </Link>
            );
          })}
          <circle cx={cx} cy={cy} r="30" fill="#8b5df5" />
          <text x={cx} y={cy + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">
            {center.title.length > 14 ? center.title.slice(0, 13) + "…" : center.title}
          </text>
        </svg>
      </div>
    </div>
  );
}
