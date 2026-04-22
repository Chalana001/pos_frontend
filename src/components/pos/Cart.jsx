import React, { useState } from "react";
import { Trash2, Minus, Plus, Tag, UserPlus, Receipt, X } from "lucide-react";
import { formatCurrency } from "../../utils/formatters";
import { DISCOUNT_TYPES, ItemType } from "../../utils/constants";
import Button from "../../components/common/Button";

const Cart = ({
  items,
  customer,
  onUpdateQty,
  onUpdatePrice,
  onRemoveItem,
  onInlineDiscount,
  total,
  subTotal,
  billDiscount,
  setBillDiscount,
  onCheckout,
  loading,
  onAddCustomer,
  onUpdateQtyUnit,
  focusSearch
}) => {
  const [editingIndex, setEditingIndex] = useState(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setEditingIndex(null);
    }
  };

  const handleManualQtyChange = (index, value) => {
    const numVal = parseFloat(value);
    if (!isNaN(numVal) && numVal >= 0) {
      onUpdateQty(index, numVal, true);
    } else if (value === "") {
      onUpdateQty(index, 0, true);
    }
  };

  const calculateItemTotal = (item) => {
    if (!item.qty || item.qty <= 0) return 0;

    let lineTotal = 0;
    if (item.weightItem && item.qtyUnit === 'G') {
      lineTotal = item.qty * item.perGramPrice;
    } else {
      lineTotal = item.qty * item.unitPrice;
    }

    if (item.discountValue > 0) {
      if (item.discountType === DISCOUNT_TYPES.PERCENT) {
        lineTotal -= lineTotal * (item.discountValue / 100);
      } else {
        lineTotal -= parseFloat(item.discountValue);
      }
    }

    return Math.max(0, lineTotal);
  };

  const getPriceLabel = (item) => {
    if (item.itemType === ItemType.SERVICE) {
      return null;
    }

    if (item.weightItem) {
      return item.qtyUnit === "G"
        ? `1 G = ${formatCurrency(item.perGramPrice)}`
        : `1 KG = ${formatCurrency(item.unitPrice)}`;
    }

    return `1 ${item.defaultUnit} = ${formatCurrency(item.unitPrice)}`;
  };

  return (
    <div className="flex flex-col h-full bg-white">
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
          items.map((item, index) => {
            const stepValue = item.weightItem
              ? (item.qtyUnit === 'G' ? 100 : 0.1)
              : 1;

            return (
              <div key={index} className="relative group overflow-hidden bg-white border border-slate-100 rounded-xl hover:border-blue-200 transition-all shadow-sm">
                <div className="p-3 flex items-center gap-3">
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{item.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      
                      {item.itemType === ItemType.SERVICE ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-medium text-slate-400">Price:</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-20 text-right font-bold text-purple-600 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.5 text-[11px] focus:ring-1 focus:ring-purple-500 outline-none"
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
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400">
                          {getPriceLabel(item)}
                        </span>
                      )}

                      {item.weightItem && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                          {item.qtyUnit || item.defaultUnit}
                        </span>
                      )}
                      {item.discountValue > 0 && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">
                          -{item.discountType === DISCOUNT_TYPES.PERCENT ? `${item.discountValue}%` : formatCurrency(item.discountValue)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 font-bold text-blue-600 text-sm">
                      {formatCurrency(calculateItemTotal(item))}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-slate-100 rounded-lg p-1">
                        <button
                          onClick={() => onUpdateQty(index, Math.max(0, item.qty - stepValue))}
                          className="p-1 hover:bg-white rounded shadow-sm transition-all"
                        >
                          <Minus size={14} />
                        </button>

                        <input
                          type="number"
                          value={item.qty === 0 ? "" : item.qty}
                          onChange={(e) => handleManualQtyChange(index, e.target.value)}
                          onBlur={focusSearch}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          className="w-14 text-center text-sm font-bold bg-transparent outline-none focus:bg-white rounded px-1 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          title="Click to edit quantity"
                        />

                        <button
                          onClick={() => onUpdateQty(index, item.qty + stepValue)}
                          className="p-1 hover:bg-white rounded shadow-sm transition-all"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      {item.weightItem ? (
                        <select
                          value={item.qtyUnit || item.defaultUnit}
                          onChange={(e) => {
                            onUpdateQtyUnit?.(index, e.target.value);
                            focusSearch();
                          }}
                          className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded p-1 outline-none cursor-pointer hover:bg-slate-100 focus:ring-1 focus:ring-blue-500 transition-all"
                        >
                          <option value="KG">KG</option>
                          <option value="G">G</option>
                        </select>
                      ) : (
                        /* 🟢 මෙතන තමයි වෙනස කළේ! Service එකක් නෙවෙයි නම් විතරක් 'PCS' කියලා පෙන්වන්න හදලා තියෙනවා */
                        item.itemType !== ItemType.SERVICE && (
                          <span className="text-xs font-bold text-slate-500 min-w-[2rem] text-center px-1">
                            {item.defaultUnit}
                          </span>
                        )
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                        className={`p-1.5 rounded-lg transition-all ${editingIndex === index ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:text-blue-600'}`}
                        title="Add Discount"
                      >
                        <Tag size={14} />
                      </button>
                      <button onClick={() => onRemoveItem(index)} className="p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all" title="Remove Item">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

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
                        min="0"
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
            );
          })
        )}
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-slate-500 text-sm">
            <span>Subtotal</span>
            <span className="font-medium text-slate-700">{formatCurrency(subTotal)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-500 text-sm">
            <span className="flex items-center gap-1"><Tag size={12} /> Bill Discount</span>
            <input
              type="number"
              min="0"
              value={billDiscount || ""}
              onChange={(e) => setBillDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
              onBlur={focusSearch} 
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
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
