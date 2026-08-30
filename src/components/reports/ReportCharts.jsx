// src/components/reports/ReportCharts.jsx
//
// The two composite chart blocks shared by the report screens: a donut with a
// legend rail, and a ranked bar chart with a top-4 rail.
//
// Like ReportPrimitives, these were declared inside the Reports render body and
// so were remounted — charts and all — on every parent state change. They are
// pure: props in, JSX out.

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency, shortCurrency } from "../../utils/formatters";
import {
  CHROME,
  SEQUENTIAL_BLUE,
  seriesColor,
  axisProps,
  gridProps,
  tooltipProps,
  BAR_RADIUS,
} from "../../utils/chartTheme";
import { ChartEmptyState, PremiumChartCard } from "./ReportPrimitives";

// Axis ticks have a fixed budget of horizontal space; long product names must be
// clipped here rather than allowed to overlap their neighbours.
const truncateTick = (value) => {
  const text = String(value ?? "");
  return text.length > 14 ? `${text.slice(0, 13)}…` : text;
};

export const PremiumDonutChart = ({ data, total, valueLabel, gradientPrefix, formatter = formatCurrency }) => {
  const safeTotal = Number(total || 0);

  return (
    <div className="grid min-h-[300px] grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div className="relative min-h-[260px] rounded-2xl bg-gradient-to-br from-slate-50 via-surface to-blue-50/40 p-2 shadow-inner">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 600, height: 320 }}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="64%"
              outerRadius="86%"
              paddingAngle={2}
              cornerRadius={4}
              startAngle={90}
              endAngle={-270}
              stroke={CHROME.surface}
              strokeWidth={2}
            >
              {/* One flat slot colour per slice. Previously each slice was a
                  gradient running from its own colour into the NEXT slice's,
                  which blended the whole ring into a rainbow. */}
              {data.map((entry, index) => (
                <Cell key={`${gradientPrefix}-cell-${entry.name}`} fill={seriesColor(index)} />
              ))}
            </Pie>
            <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-900 text-[18px] font-black">
              {formatter(safeTotal)}
            </text>
            <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-500 text-xs font-semibold uppercase tracking-wide">
              {valueLabel}
            </text>
            <Tooltip formatter={(value) => formatter(value)} {...tooltipProps} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-8 rounded-full border border-white/70 shadow-[inset_0_0_32px_rgb(15_23_42/0.06)]" />
      </div>

      <div className="flex flex-col justify-center gap-3">
        {data.map((entry, index) => {
          const percent = safeTotal > 0 ? Math.round((Number(entry.value || 0) / safeTotal) * 100) : 0;
          return (
            <div key={`${gradientPrefix}-legend-${entry.name}`} className="rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: seriesColor(index) }} />
                  <span className="truncate text-sm font-bold text-slate-700">{entry.name}</span>
                </div>
                <span className="text-sm font-black tabular-nums text-slate-900">{percent}%</span>
              </div>
              <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ width: `${percent}%`, background: seriesColor(index) }} />
              </div>
              <p className="text-xs font-semibold text-slate-500">{formatter(entry.value)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const OverviewBarChart = ({ title, subtitle, data, nameKey, valueKey, formatter = formatCurrency }) => {
  const topRows = data.slice(0, 4);
  const maxValue = Math.max(...data.map((item) => Number(item[valueKey] || 0)), 0);

  return (
    <PremiumChartCard title={title} subtitle={subtitle}>
      <div className="grid min-h-[300px] grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
        {data.length === 0 ? (
          <ChartEmptyState />
        ) : (
          <>
            <div className="min-h-[280px] rounded-2xl bg-gradient-to-br from-slate-50 via-surface to-blue-50/40 p-3 shadow-inner">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 600, height: 320 }}>
                <BarChart data={data} margin={{ top: 12, right: 8, left: -8, bottom: 34 }}>
                  <CartesianGrid {...gridProps} />
                  {/* Long item names collide at -18°. Steeper angle plus truncation
                      keeps every tick readable; the full name is in the tooltip and
                      in the legend list beside the chart. */}
                  <XAxis
                    dataKey={nameKey}
                    {...axisProps}
                    tick={{ ...axisProps.tick, fontSize: 10 }}
                    tickFormatter={truncateTick}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                    height={86}
                  />
                  <YAxis {...axisProps} tickFormatter={shortCurrency} />
                  <Tooltip formatter={(value) => formatter(value)} {...tooltipProps} />
                  {/* These are nominal categories (products, customers, suppliers) — one
                      measure, so one hue. Bar length already encodes the value; giving each
                      bar its own colour spends the identity channel on nothing. The leader
                      is emphasised with a darker step of the same hue, not a different one. */}
                  <Bar dataKey={valueKey} radius={BAR_RADIUS} maxBarSize={42}>
                    {data.map((entry, index) => (
                      <Cell key={`${title}-${index}`} fill={index === 0 ? seriesColor(0) : SEQUENTIAL_BLUE[4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-col justify-center gap-3">
              {topRows.map((entry, index) => {
                const value = Number(entry[valueKey] || 0);
                const percent = maxValue > 0 ? Math.max(4, Math.round((value / maxValue) * 100)) : 0;
                return (
                  <div key={`${title}-rank-${entry[nameKey]}-${index}`} className="rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-sm">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-black text-white">
                          {index + 1}
                        </span>
                        <span className="truncate text-sm font-bold text-slate-700">{entry[nameKey] || "Unknown"}</span>
                      </div>
                    </div>
                    <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${percent}%`,
                          background: index === 0 ? seriesColor(0) : SEQUENTIAL_BLUE[4],
                        }}
                      />
                    </div>
                    <p className="text-xs font-semibold text-slate-500">{formatter(value)}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </PremiumChartCard>
  );
};
