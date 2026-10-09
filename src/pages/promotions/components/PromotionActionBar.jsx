import React from "react";
import { ChevronUp, Save } from "lucide-react";
import Button from "../../../components/common/Button";

/**
 * The rail's narrow-width stand-in: below lg the two-pane layout gives way to a single column,
 * and the save actions must not fall off-screen. The issue count opens the rail as a bottom
 * sheet so readiness detail is one tap away without competing for vertical space.
 */
const PromotionActionBar = ({ issues, saving, canSave, approvalRequired, onOpenSheet, onSaveDraft, onActivate }) => (
  <div className="sticky bottom-3 z-20 flex items-center gap-2 rounded-xl border border-slate-300 bg-white/95 p-2.5 shadow-lg backdrop-blur xl:hidden">
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
    <Button variant="secondary" size="sm" className="ml-auto" onClick={onSaveDraft} disabled={saving || !canSave}>
      Save as draft
    </Button>
    <Button size="sm" onClick={onActivate} disabled={saving || !canSave}>
      <Save size={14} className="mr-1" />
      {saving ? "Saving…" : approvalRequired ? "Approve" : "Activate"}
    </Button>
  </div>
);

export default PromotionActionBar;
