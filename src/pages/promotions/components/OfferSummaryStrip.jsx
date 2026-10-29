import React from "react";

/**
 * The offer restated in one sentence, plus what it will cost.
 *
 * <p>Keeping this visible under the tabs is the answer to the main risk of tabbing the
 * builder away: the rule fields live on Offer, the prices live on Coverage, and a person
 * who types a value and then spends ten minutes pricing items should not have to go back
 * to find out what the campaign says. The sentence restates the current state of the form
 * on every step.
 *
 * <p>It is deliberately prose rather than a summary table. "15% off 12 rice and spice items
 * at Main, Saturdays and Sundays" is a thing a shop owner can check at a glance; five
 * disconnected numbers in the old readiness rail were not.
 */
const OfferSummaryStrip = ({ sentence, subline, metrics = [], flag, onFlagClick }) => (
  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
    <div className="min-w-0 flex-1">
      {sentence ? (
        <p className="text-sm font-semibold text-slate-800">{sentence}</p>
      ) : (
        <p className="text-sm font-medium text-slate-400">
          Set the offer to see it described here
        </p>
      )}
      {subline && <p className="mt-0.5 text-xs text-slate-500">{subline}</p>}
    </div>

    <dl className="flex flex-wrap items-center gap-x-5 gap-y-1">
      {metrics.map((metric) => (
        <div key={metric.label} className="min-w-0">
          <dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {metric.label}
          </dt>
          <dd
            className={`text-sm font-semibold tabular-nums ${
              metric.tone === "danger" ? "text-danger" : "text-slate-800"
            }`}
          >
            {metric.value}
          </dd>
        </div>
      ))}
    </dl>

    {flag && (
      <button
        type="button"
        onClick={onFlagClick}
        className="flex shrink-0 items-center gap-1.5 rounded-md bg-danger-soft px-2.5 py-1.5 text-xs font-semibold text-danger hover:bg-danger-border/30"
      >
        {flag}
        {onFlagClick && <span className="underline">Review</span>}
      </button>
    )}
  </div>
);

export default OfferSummaryStrip;
