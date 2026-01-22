import React from 'react';
import { Trash2, Plus, Minus } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import Button from '../common/Button';

const Cart = ({ items, onUpdateQty, onRemoveItem, onApplyDiscount }) => {
  const calculateItemTotal = (item) => {
    let total = item.unitPrice * item.qty;

    if (item.discountType === 'FIXED') {
      total -= item.discountValue;
    } else if (item.discountType === 'PERCENT') {
      total -= (total * item.discountValue) / 100;
    }

    return Math.max(0, total);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.unitPrice * item.qty), 0);
  };

  const calculateTotalDiscount = () => {
    return items.reduce((sum, item) => {
      const itemTotal = item.unitPrice * item.qty;
      return sum + (itemTotal - calculateItemTotal(item));
    }, 0);
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            <p>Cart is empty</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={item.itemId} className="bg-white p-3 rounded-lg border border-slate-200">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800">{item.name}</h4>
                    <p className="text-sm text-slate-500">{formatCurrency(item.unitPrice)} each</p>
                  </div>
                  <button
                    onClick={() => onRemoveItem(index)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateQty(index, item.qty - 1)}
                      className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded"
                      disabled={item.qty <= 1}
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-12 text-center font-semibold">{item.qty}</span>
                    <button
                      onClick={() => onUpdateQty(index, item.qty + 1)}
                      className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-blue-600">{formatCurrency(calculateItemTotal(item))}</p>
                    {item.discountType !== 'NONE' && (
                      <p className="text-xs text-green-600">
                        Discount: {item.discountType === 'PERCENT' ? `${item.discountValue}%` : formatCurrency(item.discountValue)}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onApplyDiscount(index)}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-700"
                >
                  {item.discountType === 'NONE' ? '+ Add Discount' : 'Edit Discount'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="border-t border-slate-200 pt-4 mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Subtotal:</span>
            <span className="font-semibold">{formatCurrency(calculateSubtotal())}</span>
          </div>
          {calculateTotalDiscount() > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Discount:</span>
              <span className="font-semibold text-green-600">-{formatCurrency(calculateTotalDiscount())}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t pt-2">
            <span>Total:</span>
            <span className="text-blue-600">{formatCurrency(calculateTotal())}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;