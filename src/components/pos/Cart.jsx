import React, { useState } from "react";
import { Trash2, Minus, Plus, Tag, UserPlus, Receipt, X } from "lucide-react";
import { formatCurrency } from "../../utils/formatters";
import { DISCOUNT_TYPES, ItemType } from "../../utils/constants";
import Button from "../../components/common/Button";
import CustomSelect from "../../components/common/CustomSelect";

const Cart = ({
  items,
  customer,
  onUpdateQty,
  onUpdatePrice,
  onRemoveItem,
  onInlineDiscount,
  billDiscount,
  setBillDiscount,
  onCheckout,
  loading,
  onAddCustomer,
  onUpdateQtyUnit,
  focusSearch,
  cartSummary,
  footerActions,
  checkoutLabel = "Checkout (F9)",
}) => {
  const [editingIndex, setEditingIndex] = useState(null);
  const cartItems = Array.isArray(items) ? items : [];
  const qtyUnitOptions = [
    { value: "KG", label: "KG" },
    { value: "G", label: "G" },
  ];
  const discountTypeOptions = [
    { value: DISCOUNT_TYPES.FIXED, label: "Fixed (LKR)" },
    { value: DISCOUNT_TYPES.PERCENT, label: "Percent (%)" },
  ];

  const toFiniteNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };

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
    const qty = toFiniteNumber(item?.qty);
    if (qty <= 0) return 0;

    let lineTotal = 0;
    if (item?.weightItem && item?.qtyUnit === 'G') {
      lineTotal = qty * toFiniteNumber(item?.perGramPrice);
    } else {
      lineTotal = qty * toFiniteNumber(item?.unitPrice);
    }

    const discountValue = toFiniteNumber(item?.discountValue);
    if (discountValue > 0) {
      if (item?.discountType === DISCOUNT_TYPES.PERCENT) {
        lineTotal -= lineTotal * (discountValue / 100);
      } else {
        lineTotal -= discountValue;
      }
    }

    return Math.max(0, lineTotal);
  };

  const safeBillDiscount = Math.max(0, toFiniteNumber(billDiscount));
  
  const computedSubTotal = cartItems.reduce((acc, item) => {
    const qty = toFiniteNumber(item?.qty);
    if (qty <= 0) {
      return acc;
    }

    const lineBaseTotal = item?.weightItem && item?.qtyUnit === "G"
      ? qty * toFiniteNumber(item?.perGramPrice)
      : qty * toFiniteNumber(item?.unitPrice);

    return acc + Math.max(0, lineBaseTotal);
  }, 0);
  
  const computedTotal = Math.max(0, cartItems.reduce((acc, item) => acc + calculateItemTotal(item), 0) - safeBillDiscount);

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
          <div>
            <h2 className="font-bold text-slate-800">Current Order</h2>
            {cartSummary ? <div className="mt-0.5 text-[11px] font-medium text-slate-500">{cartSummary}</div> : null}
          </div>
        </div>
        <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
          {cartItems.length} Items
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
        {cartItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale">
            <Receipt size={64} className="mb-4" />
            <p className="font-bold">Cart is empty</p>
          </div>
        ) : (
          cartItems.map((item, index) => {
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
                        <CustomSelect
                          value={item.qtyUnit || item.defaultUnit}
                          onChange={(value) => {
                            onUpdateQtyUnit?.(index, value);
                            focusSearch();
                          }}
                          options={qtyUnitOptions}
                          valueKey="value"
                          labelKey="label"
                          className="w-[76px]"
                          buttonClassName="rounded-lg border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600 shadow-none"
                          menuClassName="min-w-[76px]"
                        />
                      ) : (
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
                      <CustomSelect
                        value={item.discountType === DISCOUNT_TYPES.NONE ? DISCOUNT_TYPES.FIXED : item.discountType}
                        onChange={(value) => onInlineDiscount(index, value, item.discountValue)}
                        options={discountTypeOptions}
                        valueKey="value"
                        labelKey="label"
                        className="w-[140px]"
                        buttonClassName="rounded-lg border-slate-200 bg-white px-2 py-2 text-xs font-bold shadow-none"
                      />
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
            <span className="font-medium text-slate-700">{formatCurrency(computedSubTotal)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-500 text-sm">
            <span className="flex items-center gap-1"><Tag size={12} /> Bill Discount</span>
            <input
              type="number"
              min="0"
              value={safeBillDiscount || ""}
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
          <span className="text-2xl font-black text-blue-600">
            {formatCurrency(computedTotal)}
          </span>
        </div>

        {footerActions ? (
          <div className="grid gap-2">
            {footerActions}
          </div>
        ) : null}

        <Button
          onClick={onCheckout}
          disabled={cartItems.length === 0 || loading}
          className="w-full h-[50px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-base shadow-md shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          {loading ? "Processing..." : checkoutLabel}
        </Button>
      </div>
    </div>
  );
};

export default Cart;
