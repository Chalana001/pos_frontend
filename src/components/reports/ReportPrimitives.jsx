// src/components/reports/ReportPrimitives.jsx
//
// The small presentational building blocks shared across the report screens.
//
// These previously lived inside the body of the Reports component. Defining a
// component inside another component's render means React sees a brand-new
// component type on every parent render, so it unmounts and remounts the entire
// subtree instead of updating it — losing internal state, re-firing effects and
// re-mounting charts. Reports holds 32 pieces of state, so that was happening on
// every filter change, tab switch and keystroke.
//
// Keep these at module scope. They take props only and close over nothing.

import Card from "../common/Card";
import { formatCurrency } from "../../utils/formatters";
import { tileTone } from "../../utils/chartTheme";

export const ChartEmptyState = () => (
  <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-sm font-medium text-slate-500">
    No data for this period
  </div>
);

export const PremiumChartCard = ({ title, subtitle, children }) => (
  <Card className="admin-panel-card dashboard-premium-card overflow-hidden border-slate-200/80 bg-white/95 shadow-[0_16px_44px_rgb(15_23_42/0.06)]">
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        {subtitle && <p className="mt-1 text-xs font-medium text-slate-500">{subtitle}</p>}
      </div>
      <div className="h-2 w-16 rounded-full bg-blue-600" />
    </div>
    {children}
  </Card>
);

export const SummaryMetric = ({ title, value, helper, icon: Icon, accent = "neutral", format = formatCurrency }) => (
  <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
        <p className="mt-2 text-xl font-black tabular-nums text-slate-900">{format(value)}</p>
        {helper && <p className="mt-1 max-w-[210px] truncate text-xs font-medium text-slate-500">{helper}</p>}
      </div>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tileTone(accent).chip}`}>
        <Icon size={19} />
      </div>
    </div>
  </div>
);

const changePercent = (current, previous) => {
  const currentValue = Number(current || 0);
  const previousValue = Number(previous || 0);
  if (previousValue === 0) return currentValue === 0 ? 0 : null;
  return ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
};

export const ComparisonMetric = ({ title, current, previous, icon: Icon, accent = "neutral", format = formatCurrency }) => {
  const change = changePercent(current, previous);
  const improved = change !== null && change >= 0;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-2 truncate text-xl font-black tabular-nums text-slate-900">{format(current)}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className={change === null ? "text-slate-500" : improved ? "text-emerald-700" : "text-red-700"}>
              {change === null ? "New activity" : `${improved ? "+" : ""}${change.toFixed(1)}%`}
            </span>
            <span className="text-slate-500">vs {format(previous)}</span>
          </div>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tileTone(accent).chip}`}>
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
};

const VALUATION_STATUS_STYLES = {
  SELLABLE: ["Retail", "bg-emerald-50 text-emerald-700"],
  PRICED_INTERNAL_USE: ["Internal + Priced", "bg-blue-50 text-blue-700"],
  INTERNAL_USE: ["Internal Use", "bg-slate-100 text-slate-600"],
  MISSING_PRICE: ["Missing Price", "bg-amber-50 text-amber-700"],
};

export const ValuationStatusBadge = ({ status }) => {
  const [label, className] = VALUATION_STATUS_STYLES[status] || ["Unclassified", "bg-slate-100 text-slate-600"];
  return (
    <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${className}`}>
      {label}
    </span>
  );
};

export const StatCard = ({ label, value, sub, color = "text-slate-900" }) => (
  <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className={`mt-1 text-2xl font-black tabular-nums ${color}`}>{value}</p>
    {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
  </div>
);
