import React from "react";
import { CircleDollarSign, Receipt, ShoppingBag, TrendingUp } from "lucide-react";
import { formatCurrency } from "../../../utils/formatters";

const METRICS = [
  { key: "given", label: "Discount given", icon: CircleDollarSign, tone: "text-warning bg-warning-soft" },
  { key: "used", label: "Redemptions", icon: Receipt, tone: "text-info bg-info-soft" },
  { key: "revenue", label: "Revenue on those bills", icon: TrendingUp, tone: "text-success bg-success-soft" },
  { key: "average", label: "Average per redemption", icon: ShoppingBag, tone: "text-accent bg-accent-soft" },
];

const HistoryTotalsStrip = ({ totals, loading }) => {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading history summary">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-[106px] animate-pulse rounded-xl border border-slate-200 bg-slate-100/80" />
        ))}
      </div>
    );
  }

  const values = {
    given: formatCurrency(totals.given),
    used: totals.used.toLocaleString(),
    revenue: formatCurrency(totals.revenue),
    average: totals.used ? formatCurrency(totals.given / totals.used) : formatCurrency(0),
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {METRICS.map(({ key, label, icon: Icon, tone }, index) => (
        <div
          key={key}
          className="dashboard-rise-in rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          style={{ animationDelay: `${index * 40}ms` }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">{label}</p>
              <p className="mt-1 truncate text-2xl font-black tabular-nums text-slate-900">{values[key]}</p>
            </div>
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
              <Icon size={18} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default HistoryTotalsStrip;
