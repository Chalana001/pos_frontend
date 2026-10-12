import React, { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { X, CreditCard, Printer, CheckCircle2, FileText, AlertTriangle, ReceiptText } from "lucide-react";
import { formatCurrency } from "../../utils/formatters";
import { resolvePaymentIcon } from "../../utils/paymentMethodIcons";
import Button from "../common/Button";

export const salePaymentMethods = new Set(["CASH", "CARD", "BANK", "CREDIT"]);

// What the till prints once the sale is banked: the thermal slip, or the A4
// invoice - exactly one of them, never both. The old tick printed the receipt
// plus an optional second document; shops wanted the choice, not the extra paper.
export const saleDocumentTypes = new Set(["RECEIPT", "INVOICE"]);

// Static fallback used only until the tenant's configured methods load; the
// live list comes from the backend (usePaymentMethods) and is passed as a prop.
const defaultPaymentMethods = [
  { code: "CASH", displayName: "Cash", category: "CASH", referencePolicy: "NONE", includeInExpectedCash: true, allowsCredit: false, hint: "F1" },
  { code: "CARD", displayName: "Card", category: "CARD", referencePolicy: "OPTIONAL", referenceLabel: "Approval Code", includeInExpectedCash: false, allowsCredit: false },
  { code: "BANK", displayName: "Bank", category: "BANK_TRANSFER", referencePolicy: "REQUIRED", referenceLabel: "Bank Reference", includeInExpectedCash: false, allowsCredit: false },
  { code: "CREDIT", displayName: "Credit", category: "CREDIT", referencePolicy: "NONE", includeInExpectedCash: false, allowsCredit: true, hint: "F2" },
];

const documentTypeOptions = [
  { value: "RECEIPT", label: "Receipt", icon: ReceiptText },
  { value: "INVOICE", label: "Invoice", icon: FileText },
];

const CheckoutOverlay = ({
  isOpen,
  onClose,
  total,
  paymentMethod = "CASH",
  onSelectPaymentMethod,
  paidAmount,
  setPaidAmount,
  bankReference = "",
  setBankReference,
  onPlaceOrder,
  loading,
  printDocumentType = "RECEIPT",
  onSelectPrintDocumentType,
  isOnline = true,
  customer = null,
  errorMessage = "",
  paymentMethods = null,
}) => {
  // The active, sorted method list: backend-driven when provided, else fallback.
  const methods = (Array.isArray(paymentMethods) && paymentMethods.length
    ? paymentMethods
    : defaultPaymentMethods
  ).map((m) => ({
    ...m,
    hint: m.code === "CASH" ? "F1" : m.code === "CREDIT" ? "F2" : m.hint || undefined,
  }));
  const activeMethod = methods.find((m) => m.code === paymentMethod) || null;
  const isCashLike = activeMethod ? activeMethod.includeInExpectedCash : paymentMethod === "CASH";
  const isCredit = activeMethod ? activeMethod.allowsCredit : paymentMethod === "CREDIT";
  const referencePolicy = activeMethod?.referencePolicy || "NONE";
  const referenceLabel = activeMethod?.referenceLabel || "Reference";
  const needsReference = referencePolicy !== "NONE";
  const inputRef = useRef(null);
  const roundToRupee = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 0;
    }
    return Math.max(0, Math.round(parsed + Number.EPSILON));
  };
  const normalizedTotal = roundToRupee(total);
  const normalizedPaidAmount = roundToRupee(paidAmount);
  const hasCreditLimit = customer?.creditLimit !== null
    && customer?.creditLimit !== undefined
    && customer?.creditLimit !== ""
    && Number.isFinite(Number(customer.creditLimit));
  const currentDue = Number(customer?.dueAmount || 0);
  const creditLimit = hasCreditLimit ? Number(customer.creditLimit) : 0;
  const availableCredit = hasCreditLimit ? Math.max(0, creditLimit - currentDue) : 0;

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const bodyRef = useRef(null);
  const fitRef = useRef(null);

  // Shrink the panel to whatever height it actually has.
  //
  // Clamps alone cannot guarantee this: the body's height is not fixed. Cash and
  // credit show different controls, and a missing customer or a rejected payment
  // adds a row. So measure the content at its natural size, compare it with the
  // room available, and scale by the ratio. zoom rather than transform, because
  // zoom reflows: text stays crisp and the number input keeps its caret and
  // scroll position.
  //
  // The scale is sticky: cash is the tallest section, so re-fitting on every
  // method click made the whole panel breathe - the total card included. The
  // scale follows the room the window gives (allowGrow, on resize) and can only
  // tighten when the content genuinely grows; it never loosens on a swap.
  const fitToHeight = useCallback((allowGrow = false) => {
    const body = bodyRef.current;
    const fit = fitRef.current;
    if (!body || !fit) return;

    // clientHeight counts the body's own padding, which sits outside the element
    // being scaled, comparing against it left a constant overflow the size of
    // that padding, whatever the ratio worked out to.
    const style = getComputedStyle(body);
    // The 2px absorbs sub-pixel rounding; without it the fit lands a pixel over
    // and the scrollbar appears for no visible reason.
    const available = body.clientHeight
      - parseFloat(style.paddingTop)
      - parseFloat(style.paddingBottom)
      - 2;
    if (available <= 0) return;

    // A zoom already applied changes what scrollHeight reports, so measure at 1
    // and remember what was on the element before.
    const current = fit.style.zoom === "" ? 1 : Number(fit.style.zoom);
    fit.style.zoom = "1";
    const natural = fit.scrollHeight;
    if (!natural) return;

    // A floor, so an absurdly short window scrolls rather than shrinking the
    // total past reading distance on a till. 0.6 was measured, not guessed: the
    // tallest arrangement of this panel needs about 0.68 to fit a 560px window,
    // and an earlier 0.7 floor clipped it and left the scrollbar in place.
    const target = natural > available
      ? Math.max(0.6, available / natural)
      : 1;
    fit.style.zoom = String(allowGrow ? target : Math.min(current, target));
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return undefined;

    // A fresh open starts from scale 1 so the panel is fitted, not inherited.
    if (fitRef.current) fitRef.current.style.zoom = "1";
    fitToHeight(true);

    // Watch the panel, never the element being zoomed - that would re-trigger
    // on its own change and loop. A resize changes the room, so growth back out
    // is allowed there; content swaps are not resizes.
    const body = bodyRef.current;
    const onResize = () => fitToHeight(true);
    const observer = body ? new ResizeObserver(onResize) : null;
    if (body) observer.observe(body);
    window.addEventListener("resize", onResize);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [isOpen, fitToHeight]);

  // Content swaps change the natural height, so re-fit when they do - sticky,
  // so switching to a shorter section keeps the scale the tall one needed.
  useEffect(() => {
    fitToHeight();
  }, [fitToHeight, paymentMethod, bankReference, printDocumentType, errorMessage, customer, isOnline]);

  if (!isOpen) return null;

  const creditDueAmount = isCredit
    ? normalizedTotal
    : Math.max(0, normalizedTotal - normalizedPaidAmount);
  const changeAmount = isCashLike
    ? normalizedPaidAmount - normalizedTotal
    : 0;
  const projectedDue = currentDue + creditDueAmount;
  const isMixedPayment = isCashLike && creditDueAmount > 0;
  const needsCustomer = isCredit || isMixedPayment;
  const canConfirm = !errorMessage
    && (isCredit
      ? (isOnline && !!customer)
      : (isCashLike
        ? (normalizedPaidAmount >= normalizedTotal || (isOnline && !!customer))
        : isOnline));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-end bg-slate-900/60 backdrop-blur-sm">
      {/* role/aria-modal match common/Modal. Besides the accessibility, useSearchOnType
          finds an open dialog through [role="dialog"] so that a scan while this is up
          does not land in the item search behind it. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Checkout"
        className="shell-surface modal-panel-enter sales-highlight-ring flex h-full w-full max-w-md flex-col"
      >
        
        {/* Header */}
        <div className="checkout-head page-section-enter flex items-center justify-between border-b bg-slate-50" style={{ animationDelay: "70ms" }}>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Finalize Sale</h2>
            <p className="text-slate-500 text-sm font-medium">Select payment method and confirm</p>
          </div>
          <button onClick={onClose} aria-label="Close checkout" className="inline-flex h-11 w-11 items-center justify-center hover:bg-slate-200 rounded-full transition-colors">
            <X size={22} />
          </button>
        </div>

        <div ref={bodyRef} className="checkout-body custom-scrollbar flex-1 overflow-y-auto">
          <div ref={fitRef} className="checkout-fit">
          {/* Total Display */}
          <div className="checkout-total sales-panel-enter bg-blue-600 px-6 rounded-2xl text-center shadow-lg shadow-blue-100" style={{ animationDelay: "120ms" }}>
            <p className="text-blue-100 text-sm font-bold uppercase tracking-widest mb-1">Total Payable</p>
            <h1 className="checkout-amount font-black text-white">{formatCurrency(normalizedTotal)}</h1>
          </div>

          {/* Payment Methods */}
          <div className="sales-panel-enter" style={{ animationDelay: "180ms" }}>
            <label className="mb-2 block text-sm font-black text-slate-700 uppercase">Payment Method</label>

            {/* Four tiles in one row everywhere; the tile itself resizes between
                phones and desktops, the row never reflows. */}
            <div className="checkout-methods grid" role="group" aria-label="Payment Method">
              {methods.map((option) => {
                const MethodIcon = resolvePaymentIcon(option);
                const isSelected = paymentMethod === option.code;
                return (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => onSelectPaymentMethod?.(option.code)}
                    aria-pressed={isSelected}
                    className={`checkout-method flex flex-col items-center justify-center rounded-xl border-2 font-black uppercase transition-all active:scale-[0.98] ${
                      isSelected
                        ? "border-blue-600 bg-blue-50 text-blue-700 shadow-md shadow-blue-100"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-300 hover:bg-blue-50/60"
                    }`}
                  >
                    {MethodIcon ? <MethodIcon size={28} className={isSelected ? "text-blue-600" : "text-slate-500"} /> : null}
                    <span className="checkout-method-label">
                      {option.displayName}
                      {option.hint ? <sup className="ml-0.5 font-bold">{`(${option.hint})`}</sup> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash Input Section (any cash-like method) */}
          {isCashLike && (
            <div className="sales-panel-enter space-y-4" style={{ animationDelay: "220ms" }}>
              <label htmlFor="checkoutoverlay-cash-received" className="block text-sm font-black text-slate-700 uppercase">Cash Received</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-600">Rs.</span>
                <input id="checkoutoverlay-cash-received"
                  ref={inputRef}
                  type="number"
                  step="1"
                  value={normalizedPaidAmount || ""}
                  onChange={(e) => setPaidAmount(roundToRupee(e.target.value))}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-5 pl-16 pr-6 text-3xl font-black text-slate-800 focus:border-blue-600 focus:bg-white outline-none transition-all"
                  placeholder="0.00"
                />
              </div>

              {/* Change Calculation */}
              <div className={`px-5 py-4 rounded-xl border-2 flex justify-between items-center ${
                changeAmount >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
              }`}>
                <span className="font-bold text-slate-600">
                  {changeAmount >= 0 ? "Change to Return" : "Credit Due"}
                </span>
                <span className={`text-2xl font-black ${changeAmount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(changeAmount))}
                </span>
              </div>

              {isMixedPayment && (
                <div className="rounded-xl border-2 border-amber-100 bg-amber-50 p-4 space-y-3">
                  <div className="flex gap-3 items-start">
                    <CreditCard className="mt-0.5 shrink-0 text-amber-600" size={20} />
                    <p className="text-sm font-semibold leading-relaxed text-amber-800">
                      This will be saved as cash plus customer credit. Select a customer before confirming.
                    </p>
                  </div>
                  {customer && (
                    <div className="rounded-lg border border-amber-200 bg-white/70 p-3 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Customer</span>
                        <span className="font-bold text-slate-800 text-right">{customer.name}</span>
                      </div>
                      <div className="mt-2 flex justify-between gap-3">
                        <span className="text-slate-500">Current Due</span>
                        <span className="font-semibold text-slate-800">{formatCurrency(currentDue)}</span>
                      </div>
                      <div className="mt-2 flex justify-between gap-3">
                        <span className="text-slate-500">New Credit</span>
                        <span className="font-semibold text-slate-700">{formatCurrency(creditDueAmount)}</span>
                      </div>
                      <div className="mt-2 flex justify-between gap-3">
                        <span className="text-slate-500">Projected Due</span>
                        <span className="font-semibold text-slate-800">{formatCurrency(projectedDue)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {needsReference && (
            <div className="sales-panel-enter space-y-2" style={{ animationDelay: "220ms" }}>
              <label htmlFor="checkoutoverlay-bank-reference" className="block text-sm font-black text-slate-700 uppercase">
                {referenceLabel}{referencePolicy === "REQUIRED" ? " *" : " (optional)"}
              </label>
              <input
                id="checkoutoverlay-bank-reference"
                type="text"
                value={bankReference}
                onChange={(event) => setBankReference?.(event.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-base font-bold text-slate-800 focus:border-blue-600 focus:bg-white outline-none transition-all"
                placeholder={`Enter ${referenceLabel.toLowerCase()}`}
                autoComplete="off"
              />
              {!isCashLike && (
                <p className="text-sm font-medium text-slate-500">The full invoice total will be paid by {activeMethod?.displayName || "this method"}.</p>
              )}
            </div>
          )}

          {!isCashLike && !isCredit && !needsReference && (
            <div className="sales-panel-enter rounded-xl border-2 border-blue-100 bg-blue-50 px-5 py-4" style={{ animationDelay: "220ms" }}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-600">{activeMethod?.displayName || "Payment"}</span>
                <span className="text-2xl font-black text-blue-600">{formatCurrency(normalizedTotal)}</span>
              </div>
            </div>
          )}

          {isCredit && (
            <div className="sales-panel-enter bg-amber-50 border-2 border-amber-100 p-5 rounded-xl space-y-4" style={{ animationDelay: "220ms" }}>
              <div className="flex gap-4 items-start">
                <CheckCircle2 className="text-amber-500 shrink-0" size={24} />
                <p className="text-amber-800 text-sm font-medium leading-relaxed">
                  This order will be saved as a <b>Credit Sale</b>. Please ensure the customer is selected before proceeding.
                </p>
              </div>

              {customer && (
                <div className="rounded-lg border border-amber-200 bg-white/70 p-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Customer</span>
                    <span className="font-bold text-slate-800 text-right">{customer.name}</span>
                  </div>
                  <div className="mt-2 flex justify-between gap-3">
                    <span className="text-slate-500">Current Due</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(currentDue)}</span>
                  </div>
                  <div className="mt-2 flex justify-between gap-3">
                    <span className="text-slate-500">Credit Limit</span>
                    <span className="font-semibold text-slate-800">
                      {hasCreditLimit ? formatCurrency(creditLimit) : "No limit set"}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between gap-3">
                    <span className="text-slate-500">{hasCreditLimit ? "Available" : "Projected Due"}</span>
                    <span className="font-semibold text-slate-800">
                      {hasCreditLimit ? formatCurrency(availableCredit) : formatCurrency(projectedDue)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}


          {needsCustomer && !customer && !errorMessage && (
            <div className="rounded-xl border-2 border-amber-100 bg-amber-50 p-4 flex gap-3 items-start">
              <AlertTriangle className="mt-0.5 shrink-0 text-amber-600" size={20} />
              <p className="text-sm font-semibold leading-relaxed text-amber-800">
                Select a customer to save the remaining balance as credit.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl border-2 border-red-100 bg-red-50 p-4 flex gap-3 items-start">
              <AlertTriangle className="mt-0.5 shrink-0 text-red-600" size={20} />
              <p className="text-sm font-semibold leading-relaxed text-red-700">{errorMessage}</p>
            </div>
          )}

          {/* Print document: thermal slip or A4 invoice, exactly one. Tiles match
              the payment-method row so both selectors read as one family. */}
          <div className="sales-panel-enter" style={{ animationDelay: "240ms" }}>
            <label className="mb-2 block text-sm font-black text-slate-700 uppercase">Print</label>
            <div className="checkout-methods checkout-docs grid" role="group" aria-label="Print document type">
              {documentTypeOptions.map((option) => {
                const DocIcon = option.icon;
                const isSelected = printDocumentType === option.value;
                const disabled = option.value === "INVOICE" && !isOnline;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => !disabled && onSelectPrintDocumentType?.(option.value)}
                    disabled={disabled}
                    aria-pressed={isSelected}
                    className={`checkout-method checkout-doc flex flex-col items-center justify-center rounded-xl border-2 font-black uppercase transition-all active:scale-[0.98] ${
                      isSelected
                        ? "border-blue-600 bg-blue-50 text-blue-700 shadow-md shadow-blue-100"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-300 hover:bg-blue-50/60"
                    } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {DocIcon ? <DocIcon size={28} className={isSelected ? "text-blue-600" : "text-slate-500"} /> : null}
                    <span className="checkout-method-label">{option.label}</span>
                  </button>
                );
              })}
            </div>
            {!isOnline && (
              <p className="mt-2 text-sm font-medium text-slate-500">
                A4 invoice printing is available only while online.
              </p>
            )}
          </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="page-section-enter border-t bg-slate-50 p-5" style={{ animationDelay: "260ms" }}>
          <Button
            onClick={onPlaceOrder}
            disabled={loading || !canConfirm}
            className={`w-full h-[52px] rounded-xl text-base font-black flex items-center justify-center gap-3 shadow-md transition-all active:scale-[0.98] ${
              loading || !canConfirm ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
            }`}
          >
            {loading ? (
              "Processing..."
            ) : (
              <>
                <Printer size={20} />
                CONFIRM & PRINT
              </>
            )}
          </Button>
          <p className="text-center text-slate-600 text-xs mt-4 font-bold uppercase tracking-widest">Press Enter to complete</p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutOverlay;
