"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency, formatPercent } from "@/lib/format";
import { getCategoryIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

export interface CategorySlice {
  id: string;
  name: string;
  color: string;
  icon: string;
  total: number;
}

function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as CategorySlice;
  return (
    <div className="rounded-lg border border-border/60 bg-card px-3 py-2 text-xs shadow-soft">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
        <span className="font-semibold">{d.name}</span>
      </div>
      <p className="mt-0.5 tabular-nums text-muted-foreground">{formatCurrency(d.total)}</p>
    </div>
  );
}

function LegendList({ data, total }: { data: CategorySlice[]; total: number }) {
  return (
    <ul className="w-full space-y-2">
      {data.slice(0, 6).map((d) => {
        const Icon = getCategoryIcon(d.icon);
        const share = total > 0 ? d.total / total : 0;
        return (
          <li
            key={d.id}
            className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/25 px-3 py-2.5"
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${d.color}24`, color: d.color }}
            >
              <Icon size={15} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight">{d.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{formatPercent(share)} of total</p>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(d.total)}</p>
          </li>
        );
      })}
    </ul>
  );
}

function DonutRing({
  data,
  centerLabel,
  centerValue,
  size = 168,
}: {
  data: CategorySlice[];
  centerLabel: string;
  centerValue: string;
  size?: number;
}) {
  const inner = Math.round(size * 0.38);
  const outer = Math.round(size * 0.46);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="name"
            innerRadius={inner}
            outerRadius={outer}
            paddingAngle={data.length > 1 ? 2 : 0}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell key={d.id} fill={d.color} />
            ))}
          </Pie>
          <Tooltip content={<DonutTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {centerLabel}
        </span>
        <span
          className={cn(
            "mt-0.5 font-bold tabular-nums leading-tight",
            centerValue.length > 11 ? "text-sm" : "text-base",
          )}
        >
          {centerValue}
        </span>
      </div>
    </div>
  );
}

export function CategoryDonut({
  data,
  centerLabel,
  centerValue,
  layout = "stacked",
}: {
  data: CategorySlice[];
  centerLabel: string;
  centerValue: string;
  /** stacked = donut above legend (fits narrow cards); split = side-by-side on sm+ */
  layout?: "stacked" | "split";
}) {
  const total = data.reduce((s, d) => s + d.total, 0);

  if (layout === "split") {
    return (
      <div className="grid grid-cols-1 items-center gap-5 sm:grid-cols-[minmax(0,180px)_1fr] sm:gap-6">
        <div className="mx-auto sm:mx-0">
          <DonutRing data={data} centerLabel={centerLabel} centerValue={centerValue} size={180} />
        </div>
        <div className="min-w-0">
          <LegendList data={data} total={total} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <DonutRing data={data} centerLabel={centerLabel} centerValue={centerValue} />
      <LegendList data={data} total={total} />
    </div>
  );
}
