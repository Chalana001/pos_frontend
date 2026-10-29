import React from "react";

import { promotionStatus } from "./promotionStatus";

const STYLES = {
  DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-600 border border-dashed border-slate-300" },
  PENDING_APPROVAL: { label: "Awaiting approval", className: "bg-info-soft text-info" },
  LIVE: { label: "Live", className: "bg-success-soft text-success" },
  ENDING_SOON: { label: "Ending soon", className: "bg-warning-soft text-warning" },
  SCHEDULED: { label: "Scheduled", className: "bg-slate-100 text-accent" },
  PAUSED: { label: "Paused", className: "bg-slate-200 text-slate-700" },
  EXHAUSTED: { label: "Limit reached", className: "bg-warning-soft text-warning" },
  ENDED: { label: "Ended", className: "bg-slate-100 text-slate-600" },
  ARCHIVED: { label: "Archived", className: "bg-slate-100 text-slate-600" },
};

const PromotionStatusBadge = ({ promotion, status }) => {
  const resolved = status || promotionStatus(promotion);
  const style = STYLES[resolved] || STYLES.ENDED;
  return (
    <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${style.className}`}>
      {style.label}
    </span>
  );
};

export default PromotionStatusBadge;
