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
  onUpdateWarranty,
  warrantyOptions = [],
  warrantyEnabled = true,
  billPromotion,
  focusSearch,
  cartSummary,
  footerActions,
  sideAction,
  checkoutLabel = "Checkout (F9)",
}) => {
  const [editingIndex, setEditingIndex] = useState(null);
  const cartItems = Array.isArray(items) ? items : [];
  const getMeasuredUnitOptions = (item) => {
    const defaultUnit = String(item?.defaultUnit || item?.qtyUnit || "").toUpperCase();
    return defaultUnit === "L" || defaultUnit === "ML"
      ? [{ value: "L", label: "L" }, { value: "ML", label: "ML" }]
      : [{ value: "KG", label: "KG" }, { value: "G", label: "G" }];
  };
  const discountTypeOptions = [
    { value: DISCOUNT_TYPES.FIXED, label: "Fixed (LKR)" },
    { value: DISCOUNT_TYPES.PERCENT, label: "Percent (%)" },
  ];
  const compactSelectButtonClass = "min-h-[24px] rounded-md border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 shadow-none";
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
  
  const computedSubTotal = cartItems.reduce((acc, item) => {
    const qty = toFiniteNumber(item?.qty);
    if (qty <= 0) {
      return acc;
    }

    const lineBaseTotal = item?.weightItem && (item?.qtyUnit === "G" || item?.qtyUnit === "ML")
      ? qty * toFiniteNumber(item?.perSmallUnitPrice ?? item?.perGramPrice)
      : qty * toFiniteNumber(item?.unitPrice);

    return acc + Math.max(0, lineBaseTotal);
  }, 0);
  
  const lineTotalAfterItemDiscounts = cartItems.reduce((acc, item) => acc + calculateItemTotal(item), 0);
  const previewBillDiscount = Number(billPromotion?.appliedBillDiscountAmount);
  const effectiveBillDiscount = Math.max(0, Math.min(
    lineTotalAfterItemDiscounts,
    Number.isFinite(previewBillDiscount) ? previewBillDiscount : safeBillDiscount
  ));
  const computedTotal = Math.max(0, lineTotalAfterItemDiscounts - effectiveBillDiscount);

  const getPriceLabel = (item) => {
    if (item.itemType === ItemType.SERVICE) {
      return null;
    }

    if (item.weightItem) {
      const smallUnit = item.defaultUnit === "L" || item.defaultUnit === "ML" ? "ML" : "G";
      const primaryUnit = smallUnit === "ML" ? "L" : "KG";
      return item.qtyUnit === smallUnit
        ? `1 ${smallUnit} = ${formatCurrency(item.perSmallUnitPrice ?? item.perGramPrice)}`
        : `1 ${primaryUnit} = ${formatCurrency(item.unitPrice)}`;
    }

    return `1 ${item.defaultUnit} = ${formatCurrency(item.unitPrice)}`;
  };

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="page-section-enter flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-3 py-2.5" style={{ animationDelay: "120ms" }}>
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 text-white p-2 rounded-lg">
            <Receipt size={18} />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Current Order</h2>
            <div className="mt-0.5 text-[11px] font-medium text-slate-500">
              {cartSummary || `${cartItems.length} Items`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
            {cartItems.length} Items
          </span>
          <button
            onClick={onAddCustomer}
            className={`inline-flex min-h-[38px] items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all ${
              customer
                ? "border-blue-100 bg-blue-50 text-blue-700 hover:border-blue-200 hover:text-blue-800"
                : "border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-600"
            }`}
          >
            <UserPlus size={16} />
            <span className="max-w-[170px] truncate">
              {customer ? customer.name : "Add Customer"}
            </span>
          </button>
        </div>
      </div>

      {/* --- Items List --- */}
      <div className="custom-scrollbar flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
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
              <div key={index} style={{ animationDelay: `${220 + index * 38}ms` }} className="sales-cart-item sales-panel-hover relative group overflow-visible rounded-xl border border-slate-100 bg-white shadow-sm hover:border-blue-200 transition-all">
                <div className="flex items-center gap-2 p-2">
                  <div className="flex-1">
                    <h4 className="line-clamp-1 text-[13px] font-bold leading-tight text-slate-800">{item.name}</h4>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      
                      {item.itemType === ItemType.SERVICE ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-medium text-slate-400">Price:</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-20 rounded border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-right text-[10px] font-bold text-purple-600 outline-none focus:ring-1 focus:ring-purple-500"
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
                        <span className="text-[10px] font-medium text-slate-400">
                          {getPriceLabel(item)}
                        </span>
                      )}

                      {item.weightItem && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                          {item.qtyUnit || item.defaultUnit}
                        </span>
                      )}
                      {(item.effectiveDiscountValue ?? item.discountValue) > 0 && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">
                          -{(item.effectiveDiscountType || item.discountType) === DISCOUNT_TYPES.PERCENT
                            ? `${item.effectiveDiscountValue ?? item.discountValue}%`
                            : formatCurrency(item.effectiveDiscountValue ?? item.discountValue)}
                        </span>
                      )}
                      {item.promotionApplied && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">
                          Promo
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[13px] font-bold text-blue-600">
                      {formatCurrency(calculateItemTotal(item))}
                    </div>
                    {item.promotionApplied && item.promotionName && (
                      <div className="mt-0.5 max-w-[220px] truncate text-[10px] font-semibold text-emerald-700">
                        {item.promotionName}
                      </div>
                    )}
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

                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center rounded-lg bg-slate-100 p-0.5">
                        <button
                          onClick={() => onUpdateQty(index, Math.max(0, item.qty - stepValue))}
                          className="rounded p-1 transition-all hover:bg-white"
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
                          className="w-12 rounded bg-transparent px-1 text-center text-[13px] font-bold outline-none transition-all focus:bg-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          title="Click to edit quantity"
                        />

                        <button
                          onClick={() => onUpdateQty(index, item.qty + stepValue)}
                          className="rounded p-1 transition-all hover:bg-white"
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

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                        className={`rounded-md p-1.5 transition-all ${editingIndex === index ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 hover:text-blue-600'}`}
                        title="Add Discount"
                      >
                        <Tag size={14} />
                      </button>
                      <button onClick={() => onRemoveItem(index)} className="rounded-md bg-slate-50 p-1.5 text-slate-400 transition-all hover:bg-red-50 hover:text-red-500" title="Remove Item">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {editingIndex === index && (
                  <div className="page-section-enter border-t border-slate-100 bg-slate-50 p-2.5" style={{ animationDelay: "20ms" }}>
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
                        className="w-[144px]"
                        buttonClassName={compactSelectButtonClass}
                        menuClassName={compactSelectMenuClass}
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

      <div className="page-section-enter space-y-2.5 border-t border-slate-200 bg-slate-50 px-3 py-3" style={{ animationDelay: "260ms" }}>
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
          {billPromotion?.billPromotionApplied ? (
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700">
              <span className="min-w-0 truncate font-bold">{billPromotion.billPromotionName || "Bill promotion"}</span>
              <span className="shrink-0 font-black">-{formatCurrency(billPromotion.billPromotionDiscountAmount || 0)}</span>
            </div>
          ) : null}
        </div>

        <div className="pt-2.5 border-t border-slate-200 flex justify-between items-end">
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

        <div className={`grid gap-2 ${sideAction ? "grid-cols-4" : "grid-cols-1"}`}>
          {sideAction ? <div className="col-span-1">{sideAction}</div> : null}
          <Button
            onClick={onCheckout}
            disabled={cartItems.length === 0 || loading}
            className={`${sideAction ? "col-span-3" : "col-span-1"} h-[50px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-base shadow-md shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-95`}
          >
            {loading ? "Processing..." : checkoutLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
