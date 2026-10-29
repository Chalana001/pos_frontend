import React from "react";
import { ChevronUp } from "lucide-react";
import { formatCurrency } from "../../utils/formatters";
import Button from "../../components/common/Button";

/**
 * The mobile POS keeps the order on the selling screen: up to five lines of the
 * current cart above the total and the checkout button, sitting under the item
 * grid instead of behind the old floating Cart button.
 *
 * <p>This bar is for glancing and for the last step of the sale. Editing —
 * quantities, discounts, offers, customer — stays in the full cart, which the
 * line list and the total both open. The lines are read-only on purpose: no
 * controls here means no new focus traps to fight the scan-type-scan loop.
 *
 * <p>The list is capped around five rows (four on short screens) and scrolls
 * beyond that, so the grid keeps the rest of the screen.
 */
const MobileCartBar = ({
  lines,
  itemCount,
  total,
  checkoutLabel,
  queueMode = false,
  loading = false,
  onCheckout,
  onOpenCart,
}) => {
  const empty = lines.length === 0;

  return (
    <div className="sales-surface sales-panel-enter flex shrink-0 flex-col rounded-xl lg:hidden">
      {!empty && (
        <button
          type="button"
          onClick={onOpenCart}
          aria-label={`View all ${itemCount} items in the cart`}
          title="Open cart"
          className="custom-scrollbar block max-h-[min(200px,26dvh)] w-full divide-y divide-slate-50 overflow-y-auto px-2 text-left transition hover:bg-slate-50"
        >
          {lines.map((line, index) => (
            <div key={index} className="flex h-10 items-center gap-2">
              <span className="shrink-0 text-xs font-bold tabular-nums text-slate-500">{line.qtyLabel}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-700">{line.name}</span>
              <span className="shrink-0 text-[13px] font-bold tabular-nums text-accent">{formatCurrency(line.amount)}</span>
            </div>
          ))}
        </button>
      )}

      <div className="flex items-center gap-2 border-t border-slate-100 px-2 py-2">
        <button
          type="button"
          onClick={onOpenCart}
          aria-label="Open cart"
          title="Open cart"
          className="flex min-w-0 flex-1 flex-col rounded-lg px-2 py-1 text-left transition hover:bg-slate-50"
        >
          <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
            {empty ? "Cart is empty" : `Total · ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
            {!empty && <ChevronUp size={12} aria-hidden="true" />}
          </span>
          <span className="text-lg font-black leading-tight tabular-nums text-accent">{formatCurrency(total)}</span>
        </button>
        <Button
          onClick={onCheckout}
          disabled={empty || loading}
          className={`h-11 shrink-0 whitespace-nowrap px-4 text-sm ${queueMode ? "bg-warning hover:bg-warning shadow-amber-200" : "bg-accent hover:bg-accent shadow-slate-200"} text-white rounded-xl font-bold shadow-md flex items-center justify-center gap-2 transition-all active:scale-95`}
        >
          {loading ? "Processing..." : checkoutLabel}
        </Button>
      </div>
    </div>
  );
};

export default MobileCartBar;
