import React, { useState } from "react";
import { Trash2, Minus, Plus, Tag, UserPlus, Receipt, X } from "lucide-react";
import { formatCurrency } from "../../utils/formatters";
import { DISCOUNT_TYPES } from "../../utils/constants";
import Button from "../../components/common/Button";

const Cart = ({ 
  items, 
  customer, 
  onUpdateQty, 
  onRemoveItem, 
  onInlineDiscount, 
  total, 
  subTotal,
  billDiscount, 
  setBillDiscount, 
  onCheckout, 
  loading, 
  onAddCustomer 
}) => {
  const [editingIndex, setEditingIndex] = useState(null);

  // Enter press karama editor eka close wenna hadapu function eka
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setEditingIndex(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* --- Cart Header --- */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 text-white p-2 rounded-lg">
            <Receipt size={18} />
          </div>
          <h2 className="font-bold text-slate-800">Current Order</h2>
        </div>
        <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
          {items.length} Items
        </span>
      </div>

      {/* --- Customer Section --- */}
      <div className="px-4 py-3 border-b border-slate-50">
        {customer ? (
          <div className="flex items-center justify-between bg-blue-50 p-2 rounded-xl border border-blue-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                {customer.name.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-bold text-blue-800">{customer.name}</p>
                <p className="text-[10px] text-blue-600">{customer.phone}</p>
              </div>
            </div>
            <button onClick={onAddCustomer} className="text-blue-400 hover:text-blue-600">
              <UserPlus size={16} />
            </button>
          </div>
        ) : (
          <button 
            onClick={onAddCustomer}
            className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all text-sm font-medium"
          >
            <UserPlus size={18} />
            Add Customer (F4)
          </button>
        )}
      </div>

      {/* --- Items List --- */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale">
            <Receipt size={64} className="mb-4" />
            <p className="font-bold">Cart is empty</p>
          </div>
        ) : (
          items.map((item, index) => (
            <div key={index} className="relative group overflow-hidden bg-white border border-slate-100 rounded-xl hover:border-blue-200 transition-all">
              <div className="p-3 flex items-center gap-3">
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{item.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-medium text-slate-400">{formatCurrency(item.unitPrice)}</span>
                    {item.discountValue > 0 && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">
                        -{item.discountType === DISCOUNT_TYPES.PERCENT ? `${item.discountValue}%` : formatCurrency(item.discountValue)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-100 rounded-lg p-1">
                    <button onClick={() => onUpdateQty(index, item.qty - 1)} className="p-1 hover:bg-white rounded shadow-sm transition-all"><Minus size={14} /></button>
                    <span className="w-8 text-center text-sm font-bold">{item.qty}</span>
                    <button onClick={() => onUpdateQty(index, item.qty + 1)} className="p-1 hover:bg-white rounded shadow-sm transition-all"><Plus size={14} /></button>
                  </div>
                  <button 
                    onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                    className={`p-2 rounded-lg transition-all ${editingIndex === index ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:text-blue-600'}`}
                  >
                    <Tag size={16} />
                  </button>
                  <button onClick={() => onRemoveItem(index)} className="p-2 text-slate-300 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                </div>
              </div>

              {/* --- Inline Discount Editor --- */}
              {editingIndex === index && (
                <div className="bg-slate-50 border-t border-slate-100 p-3 animate-in slide-in-from-top duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Item Discount</span>
                    <button onClick={() => setEditingIndex(null)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                  </div>
                  <div className="flex gap-2">
                    <select 
                      value={item.discountType === DISCOUNT_TYPES.NONE ? DISCOUNT_TYPES.FIXED : item.discountType}
                      onChange={(e) => onInlineDiscount(index, e.target.value, item.discountValue)}
                      className="text-xs font-bold border border-slate-200 rounded-lg bg-white px-2 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={DISCOUNT_TYPES.FIXED}>Fixed (LKR)</option>
                      <option value={DISCOUNT_TYPES.PERCENT}>Percent (%)</option>
                    </select>
                    <input 
                      type="number"
                      autoFocus
                      value={item.discountValue || ""}
                      onKeyDown={handleKeyDown}
                      onChange={(e) => onInlineDiscount(index, item.discountType === DISCOUNT_TYPES.NONE ? DISCOUNT_TYPES.FIXED : item.discountType, e.target.value)}
                      placeholder="0.00"
                      className="flex-1 text-sm font-bold border border-slate-200 rounded-lg bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 shadow-inner"
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 mt-2 italic">Press Enter to apply</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* --- Summary Section --- */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-slate-500 text-sm">
            <span>Subtotal</span>
            <span className="font-medium text-slate-700">{formatCurrency(subTotal)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-500 text-sm">
            <span className="flex items-center gap-1"><Tag size={12}/> Bill Discount</span>
            <input 
              type="number" 
              value={billDiscount || ""}
              onChange={(e) => setBillDiscount(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-24 text-right font-bold text-slate-800 bg-white border border-slate-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-200 flex justify-between items-end">
          <span className="font-bold text-slate-800">Total</span>
          <span className="text-3xl font-black text-blue-600 tracking-tighter">
            {formatCurrency(total)}
          </span>
        </div>

        <Button 
          onClick={onCheckout}
          disabled={items.length === 0 || loading}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          {loading ? "Processing..." : "Checkout (F9)"}
        </Button>
      </div>
    </div>
  );
};

export default Cart;