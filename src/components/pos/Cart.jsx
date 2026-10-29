import React, { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Minus, Plus, Tag, UserPlus, UserRoundCheck, Receipt, X, KeyRound } from "lucide-react";
import { formatCurrency } from "../../utils/formatters";
import { DISCOUNT_TYPES, ItemType } from "../../utils/constants";
import Button from "../../components/common/Button";
import CustomSelect from "../../components/common/CustomSelect";
import LoyaltyPanel from "./LoyaltyPanel";
import PromotionWhyModal, { WhyButton, explainableDecisions } from "./PromotionWhyModal";

/** A scanner sends keys far faster than a person can type a quantity. */
const SCANNER_KEY_GAP_MS = 30;
/** Two fast keys can be a slip; three in a row is a label. */
const SCANNER_MIN_KEYS = 3;

/**
 * The quantity box, with a guard for a scan that arrives while it holds focus.
 *
 * <p>The POS now focuses this box as soon as an item lands, so the next thing typed
 * is the quantity. That is the loop cashiers want. It also means a scan made without
 * pressing Enter first would be typed in here and saved as a quantity, which is how a
 * 13-digit barcode once became a quantity on an unlimited-stock line. A barcode
 * arrives as three or more keystrokes tens of milliseconds apart, so that burst is
 * recognised, the quantity is put back to what it was, and the scanned characters are
 * handed to the item search instead.
 *
 * <p>Enter keeps its meaning: commit the quantity and hand focus back to the search
 * box, ready for the next scan.
 */
const QuantityInput = ({ qty, onChange, focusSearch, onScanToSearch }) => {
  const burstRef = useRef({ last: 0, count: 0, chars: "", original: null });

  const resetBurst = () => {
    burstRef.current = { last: 0, count: 0, chars: "", original: null };
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      resetBurst();
      // Commit the value, then hand the keyboard back to the search box. Leaving the
      // blur alone and letting onBlur do it raced the re-render that follows the
      // quantity commit, which parked focus on <body> and broke the scan loop.
      event.preventDefault();
      event.currentTarget.blur();
      requestAnimationFrame(() => focusSearch?.());
      return;
    }

    // Only printable characters can be part of a barcode.
    if (event.key.length !== 1) {
      resetBurst();
      return;
    }

    const burst = burstRef.current;
    const now = performance.now();
    if (burst.original === null) burst.original = qty;
    burst.count = now - burst.last < SCANNER_KEY_GAP_MS ? burst.count + 1 : 1;
    burst.last = now;
    burst.chars += event.key;

    if (burst.count < SCANNER_MIN_KEYS) return;

    // A scan, not a quantity. Reject this key so it is not committed, restore the
    // quantity the cashier actually had, and replay the label into the search box.
    event.preventDefault();
    const captured = burst.chars;
    const original = burst.original;
    resetBurst();
    onChange(original);
    onScanToSearch?.(captured);
  };

  return (
    <input aria-label="Quantity"
      // type="text" with a numeric inputMode, not type="number": a number input cannot
      // select its contents, so typing a quantity would append to the default ("1"
      // then "5" became 15) and the whole scan-type-scan loop breaks. Text still gets
      // the numeric keypad on a tablet through inputMode, and the value is parsed on
      // the way out just as before.
      type="text"
      inputMode="decimal"
      value={qty === 0 ? "" : qty}
      onChange={(e) => onChange(e.target.value)}
      onBlur={focusSearch}
      onKeyDown={handleKeyDown}
      className="w-9 rounded bg-transparent px-0.5 text-center text-[13px] font-bold outline-none transition-all focus:bg-white focus-visible:ring-2 focus-visible:ring-accent"
      title="Click to edit quantity"
    />
  );
};

const Cart = ({
  items,
  customer,
  onUpdateQty,
  onUpdatePrice,
  onRemoveItem,
  onInlineDiscount,
  onRemovePromotion,
  onRestorePromotion,
  billDiscount,
  setBillDiscount,
  onCheckout,
  loading,
  onAddCustomer,
  onClearCart,
  onUpdateQtyUnit,
  onUpdateWarranty,
  warrantyOptions = [],
  warrantyEnabled = true,
  billPromotion,
  promotionCode,
  setPromotionCode,
  codeStatus,
  loyaltyPoints,
  setLoyaltyPoints,
  loyaltyRefreshKey,
  loyaltyCustomerId,
  loyaltyDiscount = 0,
  onLoyaltyValueChange,
  focusSearch,
  onScanToSearch,
  cartSummary,
  footerActions,
  sideAction,
  checkoutLabel = "Checkout (F9)",
  queueMode = false,
}) => {
  const [editingIndex, setEditingIndex] = useState(null);
  // { title, decisions } while the "why this price" panel is open.
  const [whyPanel, setWhyPanel] = useState(null);
  // Stable reference, so the effect below fires when the cart actually changes
  // rather than on every render - otherwise it overwrites its own "previous"
  // snapshot and can miss the change it is meant to chase.
  const cartItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  const listRef = useRef(null);
  const previousItemsRef = useRef([]);
  // The row whose discount panel is open, so a click elsewhere can be told apart
  // from a click inside it.
  const editingRowRef = useRef(null);
  // Its own snapshot: the scroll effect above owns previousItemsRef, and reading that
  // one here would see the value it has already advanced to. Null means "first paint,
  // nothing to react to yet" - an empty array is a real state the first add must
  // compare against, or the very first item of a sale would never get focus.
  const focusPreviousRef = useRef(null);

  // Follow the row that just changed.
  //
  // A cashier scanning into a full cart cannot see whether the scan landed: a
  // new line is appended below the fold, and a repeat scan of something already
  // in the cart just bumps a quantity that may be scrolled out of view. Either
  // way the feedback is off screen. So chase whichever row moved - the appended
  // one, or the one whose quantity went up.
  useEffect(() => {
    const previous = previousItemsRef.current;
    previousItemsRef.current = cartItems;

    const list = listRef.current;
    if (!list || cartItems.length === 0) return;

    // Nothing to chase on the first paint, or when a line was removed.
    if (previous.length === 0 || cartItems.length < previous.length) return;

    const target = cartItems.length > previous.length
      ? cartItems.length - 1
      : cartItems.findIndex((item, i) => previous[i] && item.qty > previous[i].qty);

    if (target < 0) return;

    const row = list.children[target];
    if (!row) return;

    // Honour the app's own animation preference rather than jumping regardless.
    const still = document.documentElement.dataset.animationLevel === "off";
    row.scrollIntoView({ block: "nearest", behavior: still ? "auto" : "smooth" });
  }, [cartItems]);

  /**
   * Select the quantity of a line that was just added or increased.
   *
   * <p>The loop a cashier actually works in is scan, type the quantity, scan again. That
   * loop only closes if the quantity is already focused and selected the moment the item
   * lands, so the first digit typed replaces the default instead of appending to it.
   *
   * <p>`select()` rather than `setSelectionRange(0, len)` because it also works for an
   * `<input type="number">`, which ignores selection ranges in some engines. Falls back
   * to a plain focus when selection is unavailable.
   */
  useEffect(() => {
    const previous = focusPreviousRef.current;
    focusPreviousRef.current = cartItems;
    // First paint after mount: there is no "before" to compare with.
    if (previous === null) return;
    if (cartItems.length < previous.length) return;

    // A brand-new line takes focus; otherwise the line whose quantity went up.
    const target = cartItems.length > previous.length
      ? cartItems.length - 1
      : cartItems.findIndex((item, i) => previous[i] && item.qty > previous[i].qty);
    if (target < 0) return;

    const inputs = listRef.current?.querySelectorAll('input[aria-label="Quantity"]');
    const input = inputs?.[target];
    if (!input) return;

    input.focus({ preventScroll: true });
    // Select on the next frame: React commits the new row and its value, and the
    // browser parks the caret at the end of the text, which would undo a selection
    // made here immediately. Waiting a frame means the digits a cashier types next
    // replace the default instead of appending to it.
    requestAnimationFrame(() => {
      input.select();
    });
  }, [cartItems]);
  const getMeasuredUnitOptions = (item) => {
    const defaultUnit = String(item?.defaultUnit || item?.qtyUnit || "").toUpperCase();
    return defaultUnit === "L" || defaultUnit === "ML"
      ? [{ value: "L", label: "L" }, { value: "ML", label: "ML" }]
      : [{ value: "KG", label: "KG" }, { value: "G", label: "G" }];
  };
  // Cashiers reach for a rate far more often than a flat figure; defaulting typed values to rupees caused surprises.
  const discountTypeOptions = [
    { value: DISCOUNT_TYPES.PERCENT, label: "Percent (%)" },
    { value: DISCOUNT_TYPES.FIXED, label: "Fixed (LKR)" },
  ];
  const compactSelectButtonClass = "min-h-[24px] rounded-md border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-semibold text-slate-600 shadow-none";
  const compactSelectMenuClass = "min-w-[144px]";
  const safeWarrantyOptions = warrantyOptions.length > 0
    ? warrantyOptions
    : [{ value: "", label: "No Warranty" }];

  const toFiniteNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setEditingIndex(null);
    }
  };

  // The discount panel is a transient thing, not a mode: it closes as soon as the cashier
  // moves on. It used to stay open until the tag or the X was clicked again, so it sat under
  // a line the cashier had finished with while they scanned the next item.
  //
  // Clicking anywhere outside the row closes it. The discount-type dropdown renders its menu
  // in a portal on document.body, so that menu has to be treated as inside the panel or
  // picking Percent would shut the thing the cashier is using.
  useEffect(() => {
    if (editingIndex === null) return undefined;
    const closeOnOutsideClick = (event) => {
      if (editingRowRef.current?.contains(event.target)) return;
      if (event.target?.closest?.(".custom-select-menu")) return;
      setEditingIndex(null);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [editingIndex]);

  // Scanning the next item, or removing one, is the cashier moving on too. Indexes shift on a
  // removal as well, so a panel left open would be sitting on a different line than it opened on.
  useEffect(() => {
    setEditingIndex(null);
  }, [cartItems.length]);

  const handleManualQtyChange = (index, value) => {
    const numVal = parseFloat(value);
    if (!isNaN(numVal) && numVal >= 0) {
      onUpdateQty(index, numVal, true);
    } else if (value === "") {
      onUpdateQty(index, 0, true);
    }
  };

  const calculateItemTotal = (item) => {
    const previewLineTotal = Number(item?.effectiveLineTotal);
    if (Number.isFinite(previewLineTotal) && previewLineTotal >= 0) {
      return previewLineTotal;
    }

    const qty = toFiniteNumber(item?.qty);
    if (qty <= 0) return 0;

    let lineTotal = item?.weightItem && (item?.qtyUnit === 'G' || item?.qtyUnit === 'ML')
      ? qty * toFiniteNumber(item?.perSmallUnitPrice ?? item?.perGramPrice)
      : qty * toFiniteNumber(item?.unitPrice);

    const discountType = item?.effectiveDiscountType || item?.discountType;
    const discountValue = toFiniteNumber(item?.effectiveDiscountValue ?? item?.discountValue);
    if (discountValue > 0) {
      if (discountType === DISCOUNT_TYPES.PERCENT) {
        lineTotal -= lineTotal * (discountValue / 100);
      } else {
        lineTotal -= discountValue;
      }
    }

    return Math.max(0, lineTotal);
  };

  const safeBillDiscount = Math.max(0, toFiniteNumber(billDiscount));
  
  const { computedSubTotal, lineTotalAfterItemDiscounts } = useMemo(() => cartItems.reduce((totals, item) => {
    const qty = toFiniteNumber(item?.qty);
    if (qty <= 0) return totals;
    const lineBaseTotal = item?.weightItem && (item?.qtyUnit === "G" || item?.qtyUnit === "ML")
      ? qty * toFiniteNumber(item?.perSmallUnitPrice ?? item?.perGramPrice)
      : qty * toFiniteNumber(item?.unitPrice);
    totals.computedSubTotal += Math.max(0, lineBaseTotal);
    totals.lineTotalAfterItemDiscounts += calculateItemTotal(item);
    return totals;
  }, { computedSubTotal: 0, lineTotalAfterItemDiscounts: 0 }), [cartItems]);

  /**
   * What the per-line cuts came to, split by who made them.
   *
   * <p>Subtotal is the shelf price and Total is what is owed, and everything taken off a line,
   * a cashier's own discount, a promotion, used to happen in the gap between the two with
   * nothing naming it. A bill-level promotion got its own row and a line-level one did not, so
   * a cashier reading "Subtotal 1,000, Bill Discount 0, Total 820" had no way to account for
   * the 180 and no way to tell a customer where it went.
   *
   * <p>The promotion's own figure is the one the engine reported for each line, so this agrees
   * with the receipt rather than re-deriving it; what is left over is the manual discount.
   */
  const promotionSavings = useMemo(
    () => cartItems.reduce((sum, item) => sum + Math.max(0, toFiniteNumber(item?.promotionDiscountAmount)), 0),
    [cartItems]
  );
  const manualLineDiscounts = Math.max(0, computedSubTotal - lineTotalAfterItemDiscounts - promotionSavings);
  const previewBillDiscount = Number(billPromotion?.appliedBillDiscountAmount);
  const effectiveBillDiscount = Math.max(0, Math.min(
    lineTotalAfterItemDiscounts,
    Number.isFinite(previewBillDiscount) ? previewBillDiscount : safeBillDiscount
  ));
  // What the bill comes to before points. This is the figure the points panel is allowed to
  // spend against, and the base the server quotes a redemption from, feeding it the total
  // *after* points would shrink the ceiling as the cashier typed.
  const totalBeforePoints = Math.max(0, lineTotalAfterItemDiscounts - effectiveBillDiscount);
  const pointsDiscount = Math.min(totalBeforePoints, Math.max(0, Number(loyaltyDiscount) || 0));
  const computedTotal = Math.max(0, totalBeforePoints - pointsDiscount);

  /**
   * What one unit of this line is actually selling for, and the shelf price it came from.
   *
   * <p>The shelf price alone was no help the moment an offer applied: a cashier looking at
   * "1 KG = LKR 100.00" on a line that had already come down to 80 had to divide the line
   * total by the quantity in their head before they could judge a discount. The live figure
   * is that division, taken from the line total so it accounts for the offer and for any
   * discount already typed, with the shelf price struck through beside it when the two differ.
   */
  const getUnitPriceInfo = (item) => {
    if (item.itemType === ItemType.SERVICE) {
      return null;
    }

    const smallUnit = item.defaultUnit === "L" || item.defaultUnit === "ML" ? "ML" : "G";
    const primaryUnit = smallUnit === "ML" ? "L" : "KG";
    const showingSmallUnit = item.weightItem && item.qtyUnit === smallUnit;
    const unit = item.weightItem ? (showingSmallUnit ? smallUnit : primaryUnit) : item.defaultUnit;

    const listPrice = showingSmallUnit
      ? toFiniteNumber(item.perSmallUnitPrice ?? item.perGramPrice)
      : toFiniteNumber(item.unitPrice);

    const qty = toFiniteNumber(item.qty);
    const livePrice = qty > 0 ? calculateItemTotal(item) / qty : listPrice;

    return {
      unit,
      listPrice,
      livePrice,
      // Half a cent, so a rounding tail never draws a strike-through over an unchanged price.
      discounted: Math.abs(livePrice - listPrice) >= 0.005,
    };
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <PromotionWhyModal
        isOpen={!!whyPanel}
        onClose={() => setWhyPanel(null)}
        title={whyPanel?.title}
        decisions={whyPanel?.decisions}
      />
      <div className="page-section-enter flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-3 py-2.5" style={{ animationDelay: "120ms" }}>
        <div className="flex items-center gap-2">
          <div className="bg-accent text-white p-2 rounded-lg">
            <Receipt size={18} />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Current Order</h2>
            <div className="mt-0.5 text-xs font-medium text-slate-500">
              {cartSummary || `${cartItems.length} Items`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-accent">
            {cartItems.length} Items
          </span>
          <button
            onClick={onAddCustomer}
            type="button"
            aria-label={customer ? `Change customer: ${customer.name}` : "Add customer"}
            title={customer ? `Change customer: ${customer.name}` : "Add customer (F4)"}
            className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border transition-all ${customer ? "max-w-[150px] px-2" : "w-9"} ${
              customer
                ? "border-slate-200 bg-accent-soft text-accent hover:border-slate-200 hover:text-slate-800"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-accent"
            }`}
          >
            {customer ? <UserRoundCheck size={15} className="shrink-0" /> : <UserPlus size={15} />}
            {customer && <span className="truncate text-xs font-semibold">{customer.name}</span>}
          </button>
          <button
            type="button"
            onClick={onClearCart}
            disabled={cartItems.length === 0}
            aria-label="Clear current cart"
            title="Clear current cart"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-danger-border bg-white px-2.5 text-xs font-semibold text-danger transition hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 size={14} />
            <span>Clear all</span>
          </button>
        </div>
      </div>

      {/* --- Items List --- */}
      <div ref={listRef} className="custom-scrollbar flex-1 overflow-y-auto px-1.5 py-2 space-y-1.5">
        {cartItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale">
            <Receipt size={64} className="mb-4" />
            <p className="font-bold">Cart is empty</p>
          </div>
        ) : (
          cartItems.map((item, index) => {
            const stepValue = item.weightItem
              ? ((item.qtyUnit === 'G' || item.qtyUnit === 'ML') ? 100 : 0.1)
              : 1;

            return (
              <div
                key={index}
                ref={editingIndex === index ? editingRowRef : null}
                style={{ animationDelay: `${220 + index * 38}ms` }}
                className="sales-cart-item sales-panel-hover relative group overflow-visible rounded-xl border border-slate-100 bg-white shadow-sm hover:border-slate-200 transition-all"
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 p-2">
                  {/* The minimum is what makes the controls wrap before the name does: without
                      it the controls take their full single-row width at any cart size and the
                      name is squeezed to nothing instead. */}
                  <div className="min-w-[168px] flex-1 basis-[168px]">
                    {/* Both names on one line, the second wrapping under the first only when
                        it has to. They used to be two blocks, so every row paid for a second
                        line whether the alt name needed one or not. */}
                    <h4 className="line-clamp-2 text-[13px] font-bold leading-tight text-slate-800">
                      {item.name}
                      {item.altName && (
                        <span className="ml-1.5 text-xs font-medium text-slate-600">{item.altName}</span>
                      )}
                    </h4>
                    {/* Price and money in one wrapping row: side by side when the cashier has
                        widened the cart, stacked when they have not. Height follows the space
                        available instead of always costing two lines. */}
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                    <div className="flex items-center gap-1.5">
                      {item.itemType === ItemType.SERVICE ? (
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium text-slate-600">Price:</span>
                          <input aria-label="Unit price"
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-20 rounded border border-info-border bg-info-soft px-1.5 py-0.5 text-right text-xs font-bold text-info outline-none focus:ring-1 focus:ring-accent"
                            value={item.unitPrice === 0 ? "" : item.unitPrice}
                            onChange={(e) => onUpdatePrice(index, e.target.value)}
                            onBlur={focusSearch}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.currentTarget.blur();
                            }}
                            placeholder="0.00"
                            title="Edit Service Price"
                          />
                        </div>
                      ) : (() => {
                        const price = getUnitPriceInfo(item);
                        if (!price) return null;
                        return (
                          <>
                            <span className={`text-xs font-medium ${price.discounted ? "text-success" : "text-slate-600"}`}>
                              1 {price.unit} = {formatCurrency(price.livePrice)}
                            </span>
                            {price.discounted && (
                              <span className="text-xs text-slate-400 line-through">
                                {formatCurrency(price.listPrice)}
                              </span>
                            )}
                          </>
                        );
                      })()}

                      {/* No unit chip here: "1 KG =" on the left and the unit selector beside
                          the quantity already say it twice. */}
                    </div>
                    {/* The money and what came off it stay together: the total is the figure a
                        discount chip is talking about. */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-bold text-accent">
                        {formatCurrency(calculateItemTotal(item))}
                      </span>
                      {(item.effectiveDiscountValue ?? item.discountValue) > 0 && (
                        <span className="shrink-0 text-xs bg-warning-soft text-warning px-1.5 py-0.5 rounded font-bold">
                          {(item.effectiveDiscountType || item.discountType) === DISCOUNT_TYPES.PERCENT
                            ? `-${item.effectiveDiscountValue ?? item.discountValue}%`
                            // A fixed figure is shown for the whole line. The engine's
                            // effectiveDiscountValue is per unit (per kg on a weighed
                            // item), so 0.5 kg at 20 off a kilo read as "-LKR 20.00"
                            // beside a line that had only lost 10.
                            : `-${formatCurrency(
                              Number.isFinite(Number(item.appliedDiscountAmount)) && item.effectiveDiscountType
                                ? item.appliedDiscountAmount
                                : (item.effectiveDiscountValue ?? item.discountValue)
                            )}`}
                        </span>
                      )}
                      {/* One chip, named: the offer's own name says more than "Promo" and
                          saves the line it used to take underneath. */}
                      {item.promotionApplied && (
                        <span
                          className="inline-flex max-w-[168px] items-center rounded bg-success-soft py-0.5 pl-1.5 pr-0.5 text-xs font-bold text-success"
                          title={item.promotionName || "Promotion applied"}
                        >
                          <span className="min-w-0 truncate">{item.promotionName || "Promo"}</span>
                          <button
                            type="button"
                            aria-label="Remove offer"
                            title="Remove offer"
                            onClick={() => onRemovePromotion?.(index)}
                            className="relative ml-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-success before:absolute before:-inset-y-2 before:-inset-x-1.5 before:content-[''] hover:bg-success-soft hover:text-success"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      )}
                    </div>
                    </div>
                    {warrantyEnabled ? (
                      <div className="mt-1 max-w-[144px]">
                        <CustomSelect
                          value={item.warrantyOptionValue || ""}
                          onChange={(value) => {
                            onUpdateWarranty?.(index, value);
                            focusSearch();
                          }}
                          options={safeWarrantyOptions}
                          valueKey="value"
                          labelKey="label"
                          className="w-full"
                          buttonClassName={compactSelectButtonClass}
                          menuClassName={compactSelectMenuClass}
                          menuPlacement="top"
                        />
                      </div>
                    ) : null}
                  </div>

                  {/* Keep quantity and line actions compact so more of the cart stays visible.
                      They stay whole, never shrinking or splitting: when the cart is too
                      narrow for them beside the prices, the whole group drops to its own row
                      instead of crushing into the discount and offer chips. */}
                  <div className="flex flex-nowrap items-center justify-end gap-1.5">
                    <div className="flex shrink-0 flex-nowrap items-center gap-1">
                      <div className="flex items-center rounded-lg bg-slate-100 p-0.5">
                        <button
                          onClick={() => onUpdateQty(index, Math.max(0, item.qty - stepValue))}
                          aria-label="Decrease quantity"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md transition-all hover:bg-white"
                        >
                          <Minus size={14} />
                        </button>

                        <QuantityInput
                          qty={item.qty}
                          onChange={(value) => handleManualQtyChange(index, value)}
                          focusSearch={focusSearch}
                          onScanToSearch={onScanToSearch}
                        />

                        <button
                          onClick={() => onUpdateQty(index, item.qty + stepValue)}
                          aria-label="Increase quantity"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md transition-all hover:bg-white"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      {item.weightItem ? (
                        <CustomSelect
                          value={item.qtyUnit || item.defaultUnit}
                          onChange={(value) => {
                            onUpdateQtyUnit?.(index, value);
                            focusSearch();
                          }}
                          options={getMeasuredUnitOptions(item)}
                          valueKey="value"
                          labelKey="label"
                          className="w-[58px]"
                          buttonClassName={compactSelectButtonClass}
                          menuClassName="min-w-[58px]"
                        />
                      ) : (
                        item.itemType !== ItemType.SERVICE && (
                          <span className="text-xs font-bold text-slate-500 min-w-[2rem] text-center px-1">
                            {item.defaultUnit}
                          </span>
                        )
                      )}
                    </div>

                    <div className="flex shrink-0 flex-nowrap items-center gap-1">
                      <button aria-label="Add Discount"
                        onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-md transition-all ${editingIndex === index ? 'bg-accent text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:text-accent'}`}
                        title="Add Discount"
                      >
                        <Tag size={14} />
                      </button>
                      <button onClick={() => onRemoveItem(index)} className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-slate-50 text-slate-600 transition-all hover:bg-danger-soft hover:text-danger" title="Remove Item">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {editingIndex === index && (
                  <div className="page-section-enter border-t border-slate-100 bg-slate-50 p-2.5" style={{ animationDelay: "20ms" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Item Discount</span>
                      <button onClick={() => setEditingIndex(null)} className="inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-600 hover:text-slate-900"><X size={14} /></button>
                    </div>
                    {(item.promotionApplied || item.promotionExcluded) && (
                      <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-success-soft px-2.5 py-1.5">
                        <span className="min-w-0 truncate text-xs font-bold text-success">
                          {item.promotionExcluded
                            ? "Offers off this line"
                            : (item.promotionName || "Promotion applied")}
                        </span>
                        {item.promotionExcluded ? (
                          <button
                            type="button"
                            onClick={() => onRestorePromotion?.(index)}
                            className="inline-flex h-11 shrink-0 items-center rounded-md px-3 text-xs font-bold text-success hover:bg-success-soft"
                          >
                            Restore offer
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onRemovePromotion?.(index)}
                            className="inline-flex h-11 shrink-0 items-center rounded-md px-3 text-xs font-bold text-success hover:bg-success-soft"
                          >
                            Remove offer
                          </button>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <CustomSelect
                        value={item.discountType === DISCOUNT_TYPES.NONE ? DISCOUNT_TYPES.PERCENT : item.discountType}
                        onChange={(value) => onInlineDiscount(index, value, item.discountValue)}
                        options={discountTypeOptions}
                        valueKey="value"
                        labelKey="label"
                        className="w-[144px]"
                        buttonClassName={compactSelectButtonClass}
                        menuClassName={compactSelectMenuClass}
                      />
                      <input aria-label="Line discount"
                        type="number"
                        autoFocus
                        min="0"
                        value={item.discountValue || ""}
                        onKeyDown={handleKeyDown}
                        onChange={(e) => onInlineDiscount(index, item.discountType === DISCOUNT_TYPES.NONE ? DISCOUNT_TYPES.PERCENT : item.discountType, e.target.value)}
                        placeholder="0.00"
                        className="flex-1 text-sm font-bold border border-slate-200 rounded-lg bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-accent shadow-inner"
                      />
                    </div>
                    <p className="text-xs text-slate-600 mt-2 italic">Press Enter to apply</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="page-section-enter space-y-2.5 border-t border-slate-200 bg-slate-50 px-3 py-3" style={{ animationDelay: "260ms" }}>
        <div className="space-y-2">
          <div className="flex justify-between text-slate-500 text-sm">
            <span>Subtotal</span>
            <span className="font-medium text-slate-700">{formatCurrency(computedSubTotal)}</span>
          </div>
          {manualLineDiscounts > 0.004 ? (
            <div className="flex justify-between text-slate-500 text-sm">
              <span className="flex items-center gap-1"><Tag size={12} /> Item Discounts</span>
              <span className="font-medium text-slate-700">-{formatCurrency(manualLineDiscounts)}</span>
            </div>
          ) : null}
          {promotionSavings > 0.004 ? (
            <div className="flex items-center justify-between rounded-lg bg-success-soft px-2.5 py-1.5 text-xs text-success">
              <span className="min-w-0 truncate font-bold">Item offers</span>
              <span className="shrink-0 font-black">-{formatCurrency(promotionSavings)}</span>
            </div>
          ) : null}
          <div className="flex justify-between items-center text-slate-500 text-sm">
            <span className="flex items-center gap-1"><Tag size={12} /> Bill Discount</span>
            <input aria-label="Bill discount"
              type="number"
              min="0"
              value={safeBillDiscount || ""}
              onChange={(e) => setBillDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
              onBlur={focusSearch} 
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              placeholder="0.00"
              className="w-24 text-right font-bold text-slate-800 bg-white border border-slate-200 rounded px-2 py-1 focus:ring-2 focus:ring-accent outline-none"
            />
          </div>
          {billPromotion?.billPromotionApplied ? (
            <div className="flex items-center justify-between rounded-lg bg-success-soft px-2.5 py-1.5 text-xs text-success">
              <span className="min-w-0 truncate font-bold">{billPromotion.billPromotionName || "Bill promotion"}</span>
              <span className="shrink-0 font-black">-{formatCurrency(billPromotion.billPromotionDiscountAmount || 0)}</span>
            </div>
          ) : null}
          {explainableDecisions(billPromotion?.billDecisions).length > 0 && (
            <div className="flex justify-end">
              <WhyButton
                applied={!!billPromotion?.billPromotionApplied}
                label={billPromotion?.billPromotionApplied ? "Why this bill offer?" : "No bill offer. Why?"}
                onClick={() => setWhyPanel({
                  title: "Whole bill",
                  decisions: billPromotion?.billDecisions,
                })}
              />
            </div>
          )}
          {typeof setPromotionCode === "function" && (
            <div className="space-y-1">
              <div className="flex justify-between items-center text-slate-500 text-sm">
                <span className="flex items-center gap-1"><KeyRound size={12} /> Promo Code</span>
                <input aria-label="Promo code"
                  type="text"
                  value={promotionCode || ""}
                  onChange={(e) => setPromotionCode(e.target.value.toUpperCase())}
                  onBlur={focusSearch}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                  }}
                  placeholder="None"
                  maxLength={40}
                  className={`w-32 text-right font-mono font-bold uppercase bg-white border rounded px-2 py-1 focus:ring-2 focus:ring-accent outline-none ${
                    codeStatus && !codeStatus.valid ? "border-danger-border text-danger" : "border-slate-200 text-slate-800"
                  }`}
                />
              </div>
              {codeStatus && promotionCode ? (
                <div className={`rounded-lg px-2.5 py-1.5 text-xs ${
                  codeStatus.valid ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                }`}>
                  {codeStatus.valid
                    ? `Code applied: ${codeStatus.promotionName || codeStatus.code}`
                    : codeStatus.message || "This code cannot be used"}
                </div>
              ) : null}
            </div>
          )}

          {typeof setLoyaltyPoints === "function" && (
            <LoyaltyPanel
              customerId={loyaltyCustomerId}
              billTotal={totalBeforePoints}
              points={loyaltyPoints}
              setPoints={setLoyaltyPoints}
              refreshKey={loyaltyRefreshKey}
              focusSearch={focusSearch}
              onValueChange={onLoyaltyValueChange}
            />
          )}
        </div>

        {pointsDiscount > 0 ? (
          <div className="flex items-center justify-between rounded-lg bg-info-soft px-2.5 py-1.5 text-xs text-info">
            <span className="font-bold">Points</span>
            <span className="font-black">-{formatCurrency(pointsDiscount)}</span>
          </div>
        ) : null}

        <div className="pt-2.5 border-t border-slate-200 flex justify-between items-end">
          <span className="font-bold text-slate-800">Total</span>
          <span className="text-2xl font-black text-accent">
            {formatCurrency(computedTotal)}
          </span>
        </div>

        {footerActions ? (
          <div className="grid gap-2">
            {footerActions}
          </div>
        ) : null}

        {/* Print Bill, Print KOT and Checkout share one row. The compact actions
            size to their content; checkout takes whatever is left, so it stays
            the widest thing here whether one secondary button shows or two. */}
        <div className="flex items-stretch gap-2">
          {sideAction}
          <Button
            onClick={onCheckout}
            disabled={cartItems.length === 0 || loading}
            className={`flex-1 h-[50px] ${queueMode ? "bg-warning hover:bg-warning shadow-amber-200" : "bg-accent hover:bg-accent shadow-slate-200"} text-white rounded-xl font-bold text-base shadow-md flex items-center justify-center gap-2 transition-all active:scale-95`}
          >
            {loading ? "Processing..." : checkoutLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
