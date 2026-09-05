import React from "react";

import { promotionStatus } from "./promotionStatus";

const STYLES = {
  DRAFT: { label: "Draft", className: "bg-slate-100 text-slate-600 border border-dashed border-slate-300" },
  PENDING_APPROVAL: { label: "Awaiting approval", className: "bg-violet-100 text-violet-700" },
  LIVE: { label: "Live", className: "bg-emerald-100 text-emerald-700" },
  ENDING_SOON: { label: "Ending soon", className: "bg-amber-100 text-amber-700" },
  SCHEDULED: { label: "Scheduled", className: "bg-blue-100 text-blue-700" },
  PAUSED: { label: "Paused", className: "bg-slate-200 text-slate-700" },
  EXHAUSTED: { label: "Limit reached", className: "bg-orange-100 text-orange-700" },
  ENDED: { label: "Ended", className: "bg-slate-100 text-slate-500" },
  ARCHIVED: { label: "Archived", className: "bg-slate-100 text-slate-500" },
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
