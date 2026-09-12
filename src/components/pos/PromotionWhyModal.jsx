import React from "react";
import { CheckCircle2, Info } from "lucide-react";

import Modal from "../common/Modal";
import { formatCurrency } from "../../utils/formatters";

/**
 * Why a promotion did or did not apply.
 *
 * <p>The engine already records a verdict for every promotion it considers; until now nothing
 * showed them, so "why isn't the discount coming off?" was a question only the server could
 * answer and nobody could ask.
 */

/**
 * Outcomes worth showing, in plain words.
 *
 * <p>Two are deliberately absent. WRONG_SCOPE and NO_TARGET_MATCH mean "this promotion has
 * nothing to do with this line" — on a shop running twenty promotions they would be eighteen
 * of the twenty rows, and burying the one useful reason in noise is the same as showing
 * nothing. What is left is the set of near misses a cashier can act on, or explain.
 */
const OUTCOMES = {
  APPLIED: { label: "Applied", tone: "good" },
  LOST_TO_BETTER: { label: "Another offer gave more", tone: "muted" },
  LOST_TO_MANUAL: { label: "The manual discount was bigger", tone: "muted" },
  BLOCKED_BY_EXCLUSIVE: { label: "Another offer cannot be combined with anything", tone: "warn" },
  MANUAL_BLOCKED: { label: "This offer does not allow a discount on top", tone: "warn" },
  BELOW_MIN_BILL: { label: "The bill is below its minimum", tone: "warn" },
  NO_TIER_REACHED: { label: "Not enough bought yet to reach a tier", tone: "warn" },
  CODE_REQUIRED: { label: "Needs a promo code", tone: "warn" },
  LIMIT_REACHED: { label: "Fully redeemed", tone: "warn" },
  BUDGET_EXHAUSTED: { label: "Its budget is spent", tone: "warn" },
  CUSTOMER_LIMIT_REACHED: { label: "This customer has already used it", tone: "warn" },
  CUSTOMER_MISMATCH: { label: "Not for this customer", tone: "muted" },
  BRANCH_MISMATCH: { label: "Not for this branch", tone: "muted" },
  BELOW_COST: { label: "Would sell below cost", tone: "warn" },
  BELOW_MARGIN_FLOOR: { label: "Would leave too little margin", tone: "warn" },
  NO_DISCOUNT: { label: "Would take nothing off", tone: "muted" },
};

const TONES = {
  good: "bg-emerald-50 text-emerald-800",
  warn: "bg-amber-50 text-amber-900",
  muted: "bg-slate-50 text-slate-600",
};

/** Only what a person would actually ask about. */
export const explainableDecisions = (decisions) =>
  (Array.isArray(decisions) ? decisions : []).filter((decision) => OUTCOMES[decision.outcome]);

const PromotionWhyModal = ({ isOpen, onClose, title, decisions }) => {
  const rows = explainableDecisions(decisions);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || "Why this price"} size="md">
      {rows.length === 0 ? (
        <p className="py-4 text-sm text-slate-500">
          No promotion was in the running for this. Nothing is set up that covers it.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((decision, index) => {
            const outcome = OUTCOMES[decision.outcome];
            return (
              <li
                key={`${decision.promotionId}-${index}`}
                className={`flex items-start justify-between gap-3 rounded-lg px-3 py-2 text-sm ${TONES[outcome.tone]}`}
              >
                <span className="min-w-0">
                  <span className="block font-bold">{decision.promotionName || `Promotion ${decision.promotionId}`}</span>
                  <span className="block text-xs">{outcome.label}</span>
                </span>
                {Number(decision.discount) > 0 && (
                  <span className="shrink-0 text-xs font-black">
                    {outcome.tone === "good" ? "-" : ""}{formatCurrency(decision.discount)}
                    {outcome.tone !== "good" && <span className="font-semibold"> would have</span>}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 flex items-start gap-2 text-xs text-slate-500">
        <Info size={14} className="mt-0.5 shrink-0" />
        Only one offer wins each line unless it is set to stack. Promotions that do not cover
        this line at all are left out.
      </p>
    </Modal>
  );
};

export const WhyButton = ({ onClick, applied, label = "Why?" }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ${
      applied ? "text-emerald-700 hover:bg-emerald-50" : "text-slate-500 hover:bg-slate-100"
    }`}
  >
    {applied ? <CheckCircle2 size={11} /> : <Info size={11} />}
    {label}
  </button>
);

export default PromotionWhyModal;
