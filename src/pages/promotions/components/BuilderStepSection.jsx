import React from "react";

/**
 * One step of the campaign builder, as a band in a document rather than a card.
 *
 * <p>The previous screen wrapped every step in an identical `rounded-xl border shadow-sm`
 * box, so "What does it cover?" — the price table, the whole point of the page — looked
 * exactly like "How far can it go?", a collapsed block of optional caps. Separating steps
 * with a hairline and 32px of space lets the heading carry the hierarchy instead of the
 * container competing for it.
 *
 * <p>`step` is a two-digit ordinal shown before the title, matching the tab bar. It is
 * optional because the ordinal is decoration, not information.
 */
const BuilderStepSection = ({
  step,
  title,
  hint,
  badge,
  action,
  children,
  id,
  className = "",
}) => (
  <section
    id={id}
    className={`scroll-mt-40 border-t border-slate-200 pt-6 first:border-t-0 first:pt-0 ${className}`}
  >
    <div className="mb-4 flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
          {step && (
            <span className="text-xs font-medium tabular-nums text-slate-400">{step}</span>
          )}
          <span>{title}</span>
          {badge && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
              {badge}
            </span>
          )}
        </h2>
        {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
    {children}
  </section>
);

export default BuilderStepSection;
