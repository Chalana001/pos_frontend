import React, { useEffect, useRef } from "react";
import { X, Banknote, CreditCard, Printer, CheckCircle2, FileText, AlertTriangle } from "lucide-react";
import { formatCurrency } from "../../utils/formatters";
import { ORDER_TYPES } from "../../utils/constants";
import Button from "../common/Button";
import CustomSelect from "../common/CustomSelect";

const paymentMethodOptions = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "BANK", label: "Bank" },
  { value: "CHEQUE", label: "Cheque" },
];

const CheckoutOverlay = ({ 
  isOpen, 
  onClose, 
  total, 
  orderType, 
  setOrderType, 
  paidAmount, 
  setPaidAmount, 
  paymentMethod = "CASH",
  setPaymentMethod,
  onPlaceOrder, 
  loading,
  printFullInvoice,
  setPrintFullInvoice,
  isOnline = true,
  customer = null,
  errorMessage = "",
}) => {
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
  const creditLimit = hasCreditLimit ? Number(customer.creditLimit) : null;
  const availableCredit = hasCreditLimit ? Math.max(0, creditLimit - currentDue) : null;

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const changeAmount = normalizedPaidAmount - normalizedTotal;
  const creditDueAmount = orderType === ORDER_TYPES.CREDIT
    ? normalizedTotal
    : Math.max(0, normalizedTotal - normalizedPaidAmount);
  const projectedDue = currentDue + creditDueAmount;
  const isMixedPayment = orderType === ORDER_TYPES.CASH && creditDueAmount > 0;
  const needsCustomer = orderType === ORDER_TYPES.CREDIT || isMixedPayment;
  const canConfirm = !errorMessage
    && (orderType === ORDER_TYPES.CASH
      ? (normalizedPaidAmount >= normalizedTotal || (isOnline && !!customer))
      : (isOnline && !!customer));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-end bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-5 border-b flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Finalize Sale</h2>
            <p className="text-slate-500 text-sm font-medium">Select payment method and confirm</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Total Display */}
          <div className="bg-blue-600 px-6 py-7 rounded-2xl text-center shadow-lg shadow-blue-100">
            <p className="text-blue-100 text-sm font-bold uppercase tracking-widest mb-1">Total Payable</p>
            <h1 className="text-4xl font-black text-white">{formatCurrency(normalizedTotal)}</h1>
          </div>

          {/* Payment Methods */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setOrderType(ORDER_TYPES.CASH)}
              className={`flex min-h-[122px] flex-col items-center justify-center gap-2.5 p-5 rounded-xl border-2 transition-all ${
                orderType === ORDER_TYPES.CASH 
                ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-md' 
                : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
              }`}
            >
              <Banknote size={28} />
              <span className="font-bold text-base">Cash (F1)</span>
            </button>
            <button
              onClick={() => setOrderType(ORDER_TYPES.CREDIT)}
              disabled={!isOnline}
              className={`flex min-h-[122px] flex-col items-center justify-center gap-2.5 p-5 rounded-xl border-2 transition-all ${
                orderType === ORDER_TYPES.CREDIT 
                ? 'border-amber-500 bg-amber-50 text-amber-500 shadow-md' 
                : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
              }`}
            >
              <CreditCard size={28} />
              <span className="font-bold text-base">Credit (F2)</span>
            </button>
          </div>

          {/* Cash Input Section */}
          {orderType === ORDER_TYPES.CASH && (
            <div className="space-y-4 animate-in fade-in zoom-in duration-200">
              <label className="block text-sm font-black text-slate-700 uppercase">Cash Received</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">Rs.</span>
                <input
                  ref={inputRef}
                  type="number"
                  step="1"
                  value={normalizedPaidAmount || ""}
                  onChange={(e) => setPaidAmount(roundToRupee(e.target.value))}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl py-5 pl-16 pr-6 text-3xl font-black text-slate-800 focus:border-blue-600 focus:bg-white outline-none transition-all"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-slate-700 uppercase">Payment Method</label>
                <CustomSelect
                  value={paymentMethod}
                  onChange={(nextValue) => setPaymentMethod?.(nextValue)}
                  options={paymentMethodOptions}
                  buttonClassName="border-2 border-slate-200 px-4 py-3 font-bold focus:ring-blue-100"
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
                        <span className="font-semibold text-amber-700">{formatCurrency(creditDueAmount)}</span>
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

          {orderType === ORDER_TYPES.CREDIT && (
            <div className="bg-amber-50 border-2 border-amber-100 p-5 rounded-xl space-y-4 animate-in slide-in-from-bottom duration-300">
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

          <label className="flex items-start gap-4 rounded-xl border border-slate-200 bg-slate-50 p-[18px]">
            <input
              type="checkbox"
              checked={!!printFullInvoice}
              disabled={!isOnline}
              onChange={(event) => setPrintFullInvoice?.(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <div className="flex items-center gap-2 text-sm font-bold uppercase text-slate-700">
                <FileText size={16} />
                Full Invoice
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {isOnline
                  ? "Print an additional professional A4 invoice after this sale is confirmed."
                  : "Full invoice printing is available only while online."}
              </p>
            </div>
          </label>
        </div>

        {/* Action Button */}
        <div className="p-5 bg-slate-50 border-t">
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
          <p className="text-center text-slate-400 text-xs mt-4 font-bold uppercase tracking-widest">Press Enter to complete</p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutOverlay;
