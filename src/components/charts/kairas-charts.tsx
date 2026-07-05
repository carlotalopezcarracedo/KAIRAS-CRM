"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatDuration, formatMoney } from "@/lib/utils";

/**
 * Gráficas KAIRAS: sobrias, oscuras, morado solo como acento.
 * Un único sitio define colores y tooltips para que todos los módulos
 * se vean igual.
 */

export const CHART_COLORS = {
  violet: "#8b5df5",
  lavender: "#c7b2ff",
  muted: "rgba(225,232,240,0.16)",
  ok: "#57b98d",
  grid: "rgba(225,232,240,0.06)",
  text: "rgba(225,232,240,0.42)",
};

const PALETTE = [
  "#8b5df5",
  "#c7b2ff",
  "#6c9bd1",
  "#57b98d",
  "#d9a854",
  "#a78bfa",
  "#7dd3c0",
  "#94a3b8",
];

function ChartTooltip({
  active,
  payload,
  label,
  mode,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color?: string }[];
  label?: string;
  mode: "duration" | "money" | "number";
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-raise px-3.5 py-2.5 text-xs shadow-xl">
      {label ? <p className="k-label mb-1.5">{label}</p> : null}
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-2 text-mist">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: entry.color ?? CHART_COLORS.violet }}
          />
          {entry.name}:{" "}
          <span className="font-semibold text-foam">
            {mode === "duration"
              ? formatDuration(entry.value)
              : mode === "money"
                ? formatMoney(entry.value)
                : entry.value}
          </span>
        </p>
      ))}
    </div>
  );
}

export type DayHours = {
  label: string; // "L 30", "M 1"…
  facturable: number; // segundos
  interno: number; // segundos
};

/** Barras apiladas de horas (facturable + interno) por día/semana. */
export function HoursBars({ data, height = 200 }: { data: DayHours[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }} barCategoryGap="28%">
        <XAxis
          dataKey="label"
          tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
          axisLine={{ stroke: CHART_COLORS.grid }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => `${Math.round(v / 3600)}h`}
          tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={34}
        />
        <Tooltip
          cursor={{ fill: "rgba(225,232,240,0.04)" }}
          content={<ChartTooltip mode="duration" />}
        />
        <Bar
          dataKey="facturable"
          name="Facturable"
          stackId="h"
          fill={CHART_COLORS.violet}
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="interno"
          name="No facturable"
          stackId="h"
          fill={CHART_COLORS.muted}
          radius={[3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export type NamedValue = { name: string; value: number };

/** Barras de valores en euros por categoría (p. ej. etapas del pipeline). */
export function MoneyBars({
  data,
  height = 220,
  color = CHART_COLORS.violet,
}: {
  data: NamedValue[];
  height?: number;
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 12, left: 8, bottom: 0 }}
        barCategoryGap="24%"
      >
        <XAxis
          type="number"
          tickFormatter={(v: number) => formatMoney(v)}
          tick={{ fill: CHART_COLORS.text, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(225,232,240,0.04)" }}
          content={<ChartTooltip mode="money" />}
        />
        <Bar dataKey="value" name="Valor" fill={color} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Donut de distribución (p. ej. por tipo de trabajo). */
export function DistributionDonut({
  data,
  height = 200,
}: {
  data: NamedValue[];
  height?: number;
}) {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="55%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="90%"
            paddingAngle={2}
            stroke="none"
          >
            {data.map((_, index) => (
              <Cell key={index} fill={PALETTE[index % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip mode="duration" />} />
        </PieChart>
      </ResponsiveContainer>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {data.slice(0, 7).map((entry, index) => (
          <li key={entry.name} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: PALETTE[index % PALETTE.length] }}
            />
            <span className="truncate text-mist">{entry.name}</span>
            <span className="ml-auto shrink-0 text-faint">
              {total > 0 ? Math.round((entry.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
