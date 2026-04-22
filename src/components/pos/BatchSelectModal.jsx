import React from "react";
import { X, Calendar, Package, AlertCircle } from "lucide-react";
import { formatCurrency } from "../../utils/formatters";
import { ItemType } from "../../utils/constants";

const formatQty = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return String(value ?? "");
  }
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(3).replace(/\.?0+$/, "");
};

const isWeightItem = (item) =>
  item?.itemType === ItemType.WEIGHT || item?.weightItem === true;

const BatchSelectModal = ({ isOpen, onClose, onSelectBatch, item }) => {
  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Select Batch</h3>
            <p className="text-sm text-slate-500 font-medium line-clamp-1">{item.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {item.batches && item.batches.length > 0 ? (
            item.batches.map((batch) => {
              const displayQty = isWeightItem(item)
                ? Number(batch.qty ?? 0) / 1000
                : Number(batch.displayQty ?? batch.qty ?? 0);
              const displayUnit = isWeightItem(item) ? "KG" : (batch.displayUnit ?? item.defaultUnit ?? "");

              return (
                <button
                  key={batch.batchId}
                  onClick={() => onSelectBatch(batch)}
                  className="group w-full flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50/30 hover:shadow-md transition-all text-left relative overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-blue-500 transition-all"></div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider border border-slate-200">
                        <Package size={14} />
                        Batch #{batch.batchId}
                      </span>
                    </div>

                    {batch.expiry ? (
                      <div className="flex items-center gap-1.5 text-xs text-orange-700 font-medium ml-1">
                        <Calendar size={14} className="text-orange-500" />
                        <span>Exp: {batch.expiry}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium ml-1">
                        <AlertCircle size={14} className="text-emerald-500" />
                        <span>No Expiry</span>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {formatCurrency(batch.price)}
                    </div>
                    <div className="text-xs font-semibold text-slate-400 mt-1">
                      <span className={batch.qty > 0 ? "text-emerald-600" : "text-red-500"}>
                        {displayUnit ? `${formatQty(displayQty)} ${displayUnit}` : formatQty(displayQty)}
                      </span>{" "}
                      Available
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="text-center py-10 text-slate-400">
              <Package size={48} className="mx-auto mb-3 opacity-20" />
              <p>No batches found for this item.</p>
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            Please verify the price and batch number on the physical product.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BatchSelectModal;
