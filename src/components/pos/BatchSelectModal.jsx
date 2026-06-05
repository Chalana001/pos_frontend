import React from "react";
import { Calendar, Package, AlertCircle } from "lucide-react";
import Modal from "../common/Modal";
import { formatCurrency } from "../../utils/formatters";
import { formatDisplayStockQuantity } from "../../utils/stockQuantity";

const BatchSelectModal = ({ isOpen, onClose, onSelectBatch, item }) => {
  if (!isOpen || !item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Batch">
      <div className="-m-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800">Select Batch</h3>
          <p className="text-sm text-slate-500 font-medium line-clamp-1">{item.name}</p>
        </div>

        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {item.batches && item.batches.length > 0 ? (
            item.batches.map((batch) => {
              const availableQty = Number(batch.qty || 0);
              const isAvailable = availableQty > 0;
              const stockLabel = formatDisplayStockQuantity(batch, 0, item);

              return (
                <button
                  key={batch.batchId}
                  onClick={() => isAvailable && onSelectBatch(batch)}
                  disabled={!isAvailable}
                  className={`group w-full flex items-center justify-between p-4 border rounded-xl transition-all text-left relative overflow-hidden ${
                    isAvailable
                      ? "border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 hover:shadow-md"
                      : "border-red-100 bg-red-50/40 cursor-not-allowed opacity-80"
                  }`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all ${
                    isAvailable ? "bg-transparent group-hover:bg-blue-500" : "bg-red-300"
                  }`}></div>

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
                    <div className={`text-xl font-bold transition-colors ${
                      isAvailable ? "text-slate-800 group-hover:text-blue-600" : "text-slate-500"
                    }`}>
                      {formatCurrency(batch.price)}
                    </div>
                    <div className="text-xs font-semibold text-slate-400 mt-1">
                      <span className={isAvailable ? "text-emerald-600" : "text-red-500"}>
                        {stockLabel}
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
            Batches are listed oldest first. Please verify the price and batch number on the physical product.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default BatchSelectModal;
