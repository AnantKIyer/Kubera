"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency, formatPercent } from "@/lib/format";
import { getCategoryIcon } from "@/lib/icons";

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

export function CategoryDonut({
  data,
  centerLabel,
  centerValue,
}: {
  data: CategorySlice[];
  centerLabel: string;
  centerValue: string;
}) {
  const total = data.reduce((s, d) => s + d.total, 0);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[200px_1fr] sm:items-center">
      <div className="relative mx-auto h-[200px] w-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="name"
              innerRadius={64}
              outerRadius={92}
              paddingAngle={data.length > 1 ? 2 : 0}
              stroke="none"
            >
              {data.map((d) => (
                <Cell key={d.id} fill={d.color} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {centerLabel}
          </span>
          <span className="text-lg font-bold tabular-nums">{centerValue}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        {data.slice(0, 6).map((d) => {
          const Icon = getCategoryIcon(d.icon);
          return (
            <div key={d.id} className="flex items-center gap-2.5">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${d.color}24`, color: d.color }}
              >
                <Icon size={14} />
              </div>
              <span className="flex-1 truncate text-sm">{d.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {total > 0 ? formatPercent(d.total / total) : "0%"}
              </span>
              <span className="w-24 text-right text-sm font-medium tabular-nums">
                {formatCurrency(d.total)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
