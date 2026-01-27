import React from 'react';
import { Trash2, Plus, Minus, Tag, Receipt, ShoppingBag, ChevronRight } from 'lucide-react'; // ✅ Added ChevronRight
import { formatCurrency } from '../../utils/formatters';

const Cart = ({ items, onUpdateQty, onRemoveItem, onApplyDiscount, onClear, total, subTotal, onCheckout, isCheckoutDisabled }) => {
  
  const calculateItemTotal = (item) => {
    let total = item.unitPrice * item.qty;
    if (item.discountType === 'FIXED') total -= item.discountValue;
    else if (item.discountType === 'PERCENT') total -= (total * item.discountValue) / 100;
    return Math.max(0, total);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col h-full overflow-hidden relative">
      
      {/* Decorative Receipt Header */}
      <div className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-md z-10">
         <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-emerald-400" />
            <span className="font-bold tracking-wide">CURRENT SALE</span>
         </div>
         <span className="text-xs bg-slate-800 px-2 py-1 rounded-md text-slate-400 font-mono">
            {items.length} ITEMS
         </span>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-50/50 scrollbar-thin scrollbar-thumb-slate-200">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60">
            <Receipt size={64} strokeWidth={1} className="mb-4" />
            <p className="font-medium text-lg">Cart is empty</p>
            <p className="text-sm">Scan items to begin</p>
          </div>
        ) : (
          items.map((item, index) => (
            <div key={`${item.itemId}-${index}`} className="group bg-white p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all duration-200 relative overflow-hidden">
               {/* Left accent bar on hover */}
               <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
               
               <div className="flex justify-between items-start mb-2 pl-2">
                  <div className="flex-1 min-w-0">
                     <h4 className="font-bold text-slate-800 text-sm truncate pr-2">{item.name}</h4>
                     <p className="text-xs text-slate-400 font-mono">{formatCurrency(item.unitPrice)} / unit</p>
                  </div>
                  <div className="text-right">
                     <p className="font-bold text-slate-800 font-mono">{formatCurrency(calculateItemTotal(item))}</p>
                     {item.discountType !== 'NONE' && (
                        <p className="text-[10px] text-green-600 font-medium flex items-center justify-end gap-1 bg-green-50 px-1 rounded">
                           <Tag size={10} />
                           -{item.discountType === 'PERCENT' ? `${item.discountValue}%` : item.discountValue}
                        </p>
                     )}
                  </div>
               </div>

               <div className="flex items-center justify-between pl-2">
                  <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-200">
                     <button 
                        onClick={() => onUpdateQty(index, item.qty - 1)}
                        disabled={item.qty <= 1}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white text-slate-500 disabled:opacity-30 transition-colors"
                     >
                        <Minus size={14} />
                     </button>
                     <span className="w-8 text-center font-bold text-sm text-slate-700">{item.qty}</span>
                     <button 
                        onClick={() => onUpdateQty(index, item.qty + 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white text-slate-600 transition-colors"
                     >
                        <Plus size={14} />
                     </button>
                  </div>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button 
                        onClick={() => onApplyDiscount(index)} 
                        title="Discount"
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                     >
                        <Tag size={16} />
                     </button>
                     <button 
                        onClick={() => onRemoveItem(index)}
                        title="Remove"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                     >
                        <Trash2 size={16} />
                     </button>
                  </div>
               </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Summary Footer */}
      <div className="bg-white p-5 border-t border-slate-100 z-10 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        {items.length > 0 && (
           <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm text-slate-500">
                 <span>Subtotal</span>
                 <span className="font-mono">{formatCurrency(subTotal)}</span>
              </div>
              {subTotal > total && (
                 <div className="flex justify-between text-sm text-green-600 font-medium">
                    <span>Discount</span>
                    <span className="font-mono">-{formatCurrency(subTotal - total)}</span>
                 </div>
              )}
              <div className="flex justify-between items-end pt-2 border-t border-slate-100 mt-2">
                 <span className="font-bold text-slate-800">TOTAL</span>
                 <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">{formatCurrency(total)}</span>
              </div>
           </div>
        )}
        
        <div className="flex gap-2">
           {items.length > 0 && (
               <button 
                  onClick={onClear}
                  className="px-4 rounded-xl border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all"
               >
                  <Trash2 size={20} />
               </button>
           )}
           <button
             onClick={onCheckout}
             disabled={isCheckoutDisabled}
             className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-slate-300/50 transition-all flex items-center justify-center gap-2 group"
           >
             PAY NOW
             <ChevronRight size={20} className="opacity-50 group-hover:translate-x-1 transition-transform" />
           </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;