import React from "react";
import { AlertTriangle, CheckCircle2, Circle, CircleSlash } from "lucide-react";
import { formatCurrency } from "../../../utils/formatters";

/**
 * What still blocks activation, and what the campaign will do to money.
 *
 * <p>Checklist items are jump buttons — clicking a missing requirement switches the builder
 * to the step that owns it. Deliberately no save or simulate buttons here: the page header
 * owns those actions, so this is instrumentation, not a second command bar.
 *
 * <p>Two variants. `rail` is the standalone panel it was originally built as. `inline`
 * renders the checklist without its own card, for sitting inside a builder step — used on
 * the Codes step now that the builder shows one step at a time and the right-hand rail is
 * gone. In the inline form the exposure block is omitted, because those numbers moved to
 * the summary strip under the tab bar where they are visible on every step, not only Codes.
 */
const ReadinessRail = ({
  items,
  exposure,
  warnings,
  approvalRequired,
  onJump,
  variant = "rail",
}) => {
  const done = items.filter((item) => item.state === "done").length;
  const missing = items.filter((item) => item.state === "error");
  const issues = items.filter((item) => item.state !== "done");
  const inline = variant === "inline";

  const checklist = (
    <ul className={inline ? "mt-2 space-y-0.5" : "mt-2 space-y-0.5"}>
      {items.map((item) => (
        <li key={item.key}>
          <button
            type="button"
            onClick={() => onJump(item)}
            className={`flex w-full items-start gap-1.5 rounded-md px-1.5 py-1 text-left text-xs font-medium transition ${
              item.state === "done" ? "text-slate-500 hover:bg-slate-50" : "text-warning hover:bg-warning-soft"
            }`}
          >
            {item.state === "done"
              ? <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-success" />
              : item.state === "error"
                ? <CircleSlash size={14} className="mt-0.5 shrink-0 text-danger" />
                : <Circle size={14} className="mt-0.5 shrink-0 text-warning" />}
            <span className="min-w-0">{item.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );

  const countBadge = (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
      missing.length > 0 ? "bg-warning-soft text-warning" : "bg-success-soft text-success"
    }`}>
      {done}/{items.length}
    </span>
  );

  if (inline) {
    return (
      <section aria-label="Readiness" className="border-t border-slate-200 pt-5">
        <h3 className="flex items-center justify-between text-sm font-semibold text-slate-800">
          Before you activate
          {countBadge}
        </h3>
        {checklist}
        {(approvalRequired || warnings?.length > 0) && (
          <div className="mt-2 space-y-1">
            {approvalRequired && (
              <p className="rounded-md bg-info-soft px-2 py-1.5 text-xs font-semibold text-info">
                Needs approval to activate
              </p>
            )}
            {warnings?.map((warning, index) => (
              <p key={`${warning.code}-${warning.promotionId ?? index}`} className="rounded-md bg-warning-soft px-2 py-1.5 text-xs font-medium text-warning">
                {warning.message}
              </p>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-slate-400">
          {issues.length === 0 ? "Ready to activate" : `${issues.length} item${issues.length === 1 ? "" : "s"} to finish`}
        </p>
      </section>
    );
  }

  return (
    <aside aria-label="Readiness and exposure" className="space-y-3">
      <section className="dashboard-rise-in rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <h2 className="flex items-center justify-between text-xs font-black text-slate-800">
          Readiness
          {countBadge}
        </h2>
        {checklist}
      </section>

      <section className="dashboard-rise-in rounded-xl border border-slate-200 bg-white p-3 shadow-sm" style={{ animationDelay: "40ms" }}>
        <h2 className="text-xs font-black text-slate-800">Exposure</h2>
        <dl className="mt-2 space-y-1.5 text-xs">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <dt className="min-w-0 break-words text-slate-500">{exposure.scopeLabel}</dt>
            <dd className="shrink-0 font-semibold tabular-nums text-slate-800">{exposure.count}</dd>
          </div>
          {exposure.avgPercent != null && (
            <div className="flex min-w-0 items-start justify-between gap-2">
              <dt className="min-w-0 break-words text-slate-500">Average discount</dt>
              <dd className="shrink-0 font-semibold tabular-nums text-slate-800">{Number(exposure.avgPercent).toFixed(1)}%</dd>
            </div>
          )}
          {exposure.maxLine != null && Number(exposure.maxLine) > 0 && (
            <div className="flex min-w-0 items-start justify-between gap-2">
              <dt className="min-w-0 break-words text-slate-500">Max off a line</dt>
              <dd className="shrink-0 font-semibold tabular-nums text-slate-800">{formatCurrency(exposure.maxLine)}</dd>
            </div>
          )}
          <div className="flex min-w-0 items-start justify-between gap-2">
            <dt className="min-w-0 break-words text-slate-500">Runs</dt>
            <dd className="shrink-0 font-semibold tabular-nums text-slate-800">{exposure.days} day{exposure.days === 1 ? "" : "s"}</dd>
          </div>
          {exposure.budget != null && (
            <div className="flex min-w-0 items-start justify-between gap-2">
              <dt className="min-w-0 break-words text-slate-500">Budget</dt>
              <dd className="shrink-0 font-semibold tabular-nums text-slate-800">{formatCurrency(exposure.budget)}</dd>
            </div>
          )}
        </dl>
        {exposure.belowCost > 0 && (
          <p className="mt-2 flex min-w-0 items-start gap-1.5 break-words rounded-md bg-danger-soft px-2 py-1.5 text-xs font-bold text-danger">
            <AlertTriangle size={12} className="shrink-0" />
            {exposure.belowCost} priced below cost
          </p>
        )}
        {approvalRequired && (
          <p className="mt-1.5 min-w-0 break-words rounded-md bg-info-soft px-2 py-1.5 text-xs font-bold text-info">
            Needs approval to activate
          </p>
        )}
        {warnings?.length > 0 && (
          <ul className="mt-2 space-y-1">
            {warnings.map((warning, index) => (
              <li key={`${warning.code}-${warning.promotionId ?? index}`} className="min-w-0 break-words rounded-md bg-warning-soft px-2 py-1 text-xs font-semibold text-warning">
                {warning.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-xs text-slate-400">
        {issues.length === 0 ? "Ready to activate" : `${issues.length} item${issues.length === 1 ? "" : "s"} to finish`}
      </p>
    </aside>
  );
};

export default ReadinessRail;
