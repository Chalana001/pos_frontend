import React from "react";

/**
 * Per-row margin verdict. The status comes from the backend price-check rather than being
 * recomputed here, so the badge cannot disagree with the rule the save path enforces.
 */
const STYLES = {
  OK: { label: "OK", className: "bg-emerald-100 text-emerald-700" },
  LOW_MARGIN: { label: "Low", className: "bg-amber-100 text-amber-700" },
  BELOW_COST: { label: "Below cost", className: "bg-red-100 text-red-700" },
  ABOVE_NORMAL_PRICE: { label: "Above normal", className: "bg-red-100 text-red-700" },
};

const MarginBadge = ({ status, marginPercent, message }) => {
  const style = STYLES[status] || STYLES.OK;
  return (
    <span
      title={message || undefined}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${style.className}`}
    >
      {Number.isFinite(Number(marginPercent)) ? `${Number(marginPercent).toFixed(0)}%` : "—"}
      <span className="font-semibold opacity-80">{style.label}</span>
    </span>
  );
};

export default MarginBadge;
