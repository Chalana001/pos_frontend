import React from "react";
import { AlertTriangle, CheckCircle2, Circle, CircleDollarSign, CircleSlash } from "lucide-react";
import { formatCurrency } from "../../../utils/formatters";

/**
 * The cockpit's instrument panel: what still blocks activation, and what the campaign will do
 * to money, always in view while the form is edited. Checklist items are jump buttons —
 * clicking a missing requirement opens and scrolls to the section that owns it.
 *
 * <p>Deliberately no save/simulate buttons here: the page header owns those actions. This
 * panel is instrumentation, not a second command bar competing with it.
 */
const ReadinessRail = ({
  items,
  exposure,
  warnings,
  approvalRequired,
  onJump,
}) => {
  const done = items.filter((item) => item.state === "done").length;
  const missing = items.filter((item) => item.state === "error");
  const issues = items.filter((item) => item.state !== "done");

  return (
    <aside aria-label="Readiness and exposure" className="space-y-3">
      <section className="dashboard-rise-in rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <h2 className="flex items-center justify-between text-xs font-black text-slate-800">
          Readiness
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-black tabular-nums ${
            missing.length > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
          }`}>
            {done}/{items.length}
          </span>
        </h2>
        <ul className="mt-2 space-y-0.5">
          {items.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => onJump(item)}
                className={`flex w-full items-start gap-1.5 rounded-md px-1.5 py-1 text-left text-[11px] font-semibold transition ${
                  item.state === "done" ? "text-slate-500 hover:bg-slate-50" : "text-amber-800 hover:bg-amber-50"
                }`}
              >
                {item.state === "done"
                  ? <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-600" />
                  : item.state === "error"
                    ? <CircleSlash size={13} className="mt-0.5 shrink-0 text-red-500" />
                    : <Circle size={13} className="mt-0.5 shrink-0 text-amber-500" />}
                <span className="min-w-0">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="dashboard-rise-in rounded-xl border border-slate-200 bg-white p-3 shadow-sm" style={{ animationDelay: "40ms" }}>
        <h2 className="text-xs font-black text-slate-800">Exposure</h2>
        <dl className="mt-2 space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-slate-500">{exposure.scopeLabel}</dt>
            <dd className="font-black tabular-nums text-slate-800">{exposure.count}</dd>
          </div>
          {exposure.avgPercent != null && (
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-500">Average discount</dt>
              <dd className="font-black tabular-nums text-slate-800">{Number(exposure.avgPercent).toFixed(1)}%</dd>
            </div>
          )}
          {exposure.maxLine != null && Number(exposure.maxLine) > 0 && (
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-500">Max off a line</dt>
              <dd className="font-black tabular-nums text-slate-800">{formatCurrency(exposure.maxLine)}</dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <dt className="text-slate-500">Runs</dt>
            <dd className="font-black tabular-nums text-slate-800">{exposure.days} day{exposure.days === 1 ? "" : "s"}</dd>
          </div>
          {exposure.budget != null && (
            <div className="flex items-center justify-between gap-2">
              <dt className="text-slate-500">Budget</dt>
              <dd className="font-black tabular-nums text-slate-800">{formatCurrency(exposure.budget)}</dd>
            </div>
          )}
        </dl>
        {exposure.belowCost > 0 && (
          <p className="mt-2 flex items-center gap-1.5 rounded-md bg-red-50 px-2 py-1.5 text-[11px] font-bold text-red-700">
            <AlertTriangle size={12} className="shrink-0" />
            {exposure.belowCost} priced below cost
          </p>
        )}
        {approvalRequired && (
          <p className="mt-1.5 rounded-md bg-violet-50 px-2 py-1.5 text-[11px] font-bold text-violet-700">
            Needs approval to activate
          </p>
        )}
        {warnings?.length > 0 && (
          <ul className="mt-2 space-y-1">
            {warnings.map((warning, index) => (
              <li key={`${warning.code}-${warning.promotionId ?? index}`} className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                ⚠ {warning.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-[10px] font-medium text-slate-400">
        {issues.length === 0 ? "Ready to activate" : `${issues.length} item${issues.length === 1 ? "" : "s"} to finish`}
      </p>
    </aside>
  );
};

export default ReadinessRail;
