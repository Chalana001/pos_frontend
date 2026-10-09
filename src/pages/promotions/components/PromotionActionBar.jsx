import React from "react";
import { ChevronUp } from "lucide-react";

/**
 * The rail's narrow-width stand-in: below xl the split layout stacks, and readiness is one
 * tap away. The save actions stay in the page header at every breakpoint, so this bar only
 * routes to the panel — it is not a second command bar.
 */
const PromotionActionBar = ({ issues, onOpenSheet }) => (
  <div className="sticky bottom-3 z-20 flex items-center justify-center rounded-xl border border-slate-300 bg-white/95 p-2 shadow-lg backdrop-blur xl:hidden">
    <button
      type="button"
      onClick={onOpenSheet}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-black ${
        issues === 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
      }`}
    >
      <ChevronUp size={14} />
      {issues === 0 ? "Ready" : `${issues} to finish`}
    </button>
  </div>
);

export default PromotionActionBar;
