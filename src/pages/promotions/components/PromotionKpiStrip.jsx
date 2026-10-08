import React from "react";
import { CircleDollarSign, Gift, Gauge, Ticket } from "lucide-react";
import { formatCurrency } from "../../../utils/formatters";
import { promotionStatus } from "./promotionStatus";

const TONES = {
  blue: "bg-blue-50 text-blue-700",
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  violet: "bg-violet-50 text-violet-700",
};

const KpiCard = ({ icon: Icon, label, value, sub, tone = "blue", progress, delay = 0 }) => (
  <div
    className="dashboard-rise-in rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-500">{label}</p>
        <p className="mt-1 truncate text-2xl font-black tabular-nums text-slate-900">{value}</p>
        {sub && <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{sub}</p>}
      </div>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TONES[tone] || TONES.blue}`}>
        <Icon size={18} />
      </div>
    </div>
    {progress != null && (
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-label="Budget used">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-out ${progress >= 80 ? "bg-amber-500" : "bg-emerald-500"}`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    )}
  </div>
);

/**
 * The four numbers a manager reads before any row: what is live, what it has been used for,
 * what it has spent, and how much budget is left. Everything derives from the list response
 * the page already holds; only the discount total needs the history endpoint, and when that
 * call fails the card says so rather than showing a zero nobody earned.
 */
const PromotionKpiStrip = ({ promotions = [], discountGiven, loading = false }) => {
  const live = promotions.filter((promotion) => {
    const status = promotionStatus(promotion);
    return status === "LIVE" || status === "ENDING_SOON";
  });
  const endingSoon = promotions.filter((promotion) => promotionStatus(promotion) === "ENDING_SOON").length;
  const redemptions = promotions.reduce((sum, promotion) => sum + Number(promotion.timesRedeemed || 0), 0);
  const budgeted = promotions.filter((promotion) => promotion.budgetAmount != null && Number(promotion.budgetAmount) > 0);
  const budget = budgeted.reduce((sum, promotion) => sum + Number(promotion.budgetAmount || 0), 0);
  const consumed = budgeted.reduce((sum, promotion) => sum + Number(promotion.budgetConsumed || 0), 0);
  const budgetPercent = budget > 0 ? (consumed / budget) * 100 : null;

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading promotion summary">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-[106px] animate-pulse rounded-xl border border-slate-200 bg-slate-100/80" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        icon={Gift}
        label="Live now"
        value={live.length}
        sub={endingSoon ? `${endingSoon} ending soon` : "No campaigns ending soon"}
        tone="emerald"
        delay={0}
      />
      <KpiCard icon={Ticket} label="Redemptions" value={redemptions.toLocaleString()} sub="Across all campaigns" tone="violet" delay={40} />
      <KpiCard
        icon={CircleDollarSign}
        label="Discount given"
        value={discountGiven == null ? "Unavailable" : formatCurrency(discountGiven)}
        sub={discountGiven == null ? "History did not load" : "Last 12 months, all campaigns"}
        tone="amber"
        delay={80}
      />
      <KpiCard
        icon={Gauge}
        label="Budget used"
        value={budget > 0 ? formatCurrency(consumed) : "No budget set"}
        sub={budget > 0 ? `Budget used: ${formatCurrency(consumed)} of ${formatCurrency(budget)}` : "Unlimited campaign budgets"}
        tone="blue"
        progress={budgetPercent}
        delay={120}
      />
    </div>
  );
};

export default PromotionKpiStrip;
