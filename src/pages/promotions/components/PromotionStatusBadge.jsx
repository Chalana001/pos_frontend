import React from "react";

import { promotionStatus } from "./promotionStatus";

const STYLES = {
  LIVE: { label: "Live", className: "bg-emerald-100 text-emerald-700" },
  ENDING_SOON: { label: "Ending soon", className: "bg-amber-100 text-amber-700" },
  SCHEDULED: { label: "Scheduled", className: "bg-blue-100 text-blue-700" },
  PAUSED: { label: "Paused", className: "bg-slate-200 text-slate-700" },
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
