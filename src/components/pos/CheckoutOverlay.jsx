import React, { useEffect, useRef } from "react";
import { X, Banknote, CreditCard, Printer, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "../../utils/formatters";
import { ORDER_TYPES } from "../../utils/constants";
import Button from "../common/Button";

const CheckoutOverlay = ({ 
  isOpen, 
  onClose, 
  total, 
  orderType, 
  setOrderType, 
  paidAmount, 
  setPaidAmount, 
  onPlaceOrder, 
  loading 
}) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const changeAmount = paidAmount - total;
  const isEnough = paidAmount >= total || orderType === ORDER_TYPES.CREDIT;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-end bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Finalize Sale</h2>
            <p className="text-slate-500 text-sm font-medium">Select payment method and confirm</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Total Display */}
          <div className="bg-blue-600 p-8 rounded-3xl text-center shadow-xl shadow-blue-100">
            <p className="text-blue-100 text-sm font-bold uppercase tracking-widest mb-1">Total Payable</p>
            <h1 className="text-5xl font-black text-white">{formatCurrency(total)}</h1>
          </div>

          {/* Payment Methods */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setOrderType(ORDER_TYPES.CASH)}
              className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${
                orderType === ORDER_TYPES.CASH 
                ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-md' 
                : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
              }`}
            >
              <Banknote size={32} />
              <span className="font-bold text-lg">Cash (F1)</span>
            </button>
            <button
              onClick={() => setOrderType(ORDER_TYPES.CREDIT)}
              className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all ${
                orderType === ORDER_TYPES.CREDIT 
                ? 'border-amber-500 bg-amber-50 text-amber-500 shadow-md' 
                : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
              }`}
            >
              <CreditCard size={32} />
              <span className="font-bold text-lg">Credit (F2)</span>
            </button>
          </div>

          {/* Cash Input Section */}
          {orderType === ORDER_TYPES.CASH && (
            <div className="space-y-4 animate-in fade-in zoom-in duration-200">
              <label className="block text-sm font-black text-slate-700 uppercase">Cash Received</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">Rs.</span>
                <input
                  ref={inputRef}
                  type="number"
                  value={paidAmount || ""}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-6 pl-16 pr-6 text-4xl font-black text-slate-800 focus:border-blue-600 focus:bg-white outline-none transition-all"
                  placeholder="0.00"
                />
              </div>

              {/* Change Calculation */}
              <div className={`p-6 rounded-2xl border-2 flex justify-between items-center ${
                changeAmount >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
              }`}>
                <span className="font-bold text-slate-600">
                  {changeAmount >= 0 ? "Change to Return" : "Still Balance"}
                </span>
                <span className={`text-3xl font-black ${changeAmount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(changeAmount))}
                </span>
              </div>
            </div>
          )}

          {orderType === ORDER_TYPES.CREDIT && (
            <div className="bg-amber-50 border-2 border-amber-100 p-6 rounded-2xl flex gap-4 items-start animate-in slide-in-from-bottom duration-300">
              <CheckCircle2 className="text-amber-500 shrink-0" size={24} />
              <p className="text-amber-800 text-sm font-medium leading-relaxed">
                This order will be saved as a <b>Credit Sale</b>. Please ensure the customer is selected before proceeding.
              </p>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="p-6 bg-slate-50 border-t">
          <Button
            onClick={onPlaceOrder}
            disabled={loading || !isEnough}
            className={`w-full py-6 rounded-2xl text-xl font-black flex items-center justify-center gap-3 shadow-xl transition-all active:scale-[0.98] ${
              loading || !isEnough ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
            }`}
          >
            {loading ? (
              "Processing..."
            ) : (
              <>
                <Printer size={24} />
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