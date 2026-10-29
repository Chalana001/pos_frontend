import React, { useCallback, useEffect, useRef } from "react";
import { Calendar, Package, AlertCircle } from "lucide-react";
import Modal from "../common/Modal";
import { formatCurrency } from "../../utils/formatters";
import { formatDisplayStockQuantity } from "../../utils/stockQuantity";

/**
 * Choosing a batch is a keyboard job at a busy till.
 *
 * <p>A shop with two or three price batches on the same product used to need the mouse:
 * the dialog opened, and the only way to pick a row was to click it. A cashier scanning
 * one product after another should never have to reach for the pointer, so Up/Down walk
 * the list and Enter takes the highlighted batch. Unavailable batches are skipped rather
 * than merely disabled, because an arrow key that appears to do nothing reads as a fault.
 *
 * <p>Enter itself is not handled: the rows are real buttons, so the browser activates the
 * focused one. That keeps the keyboard path identical to the click path instead of adding
 * a second way to choose a batch that could drift from the first.
 */
const BatchSelectModal = ({ isOpen, onClose, onSelectBatch, item }) => {
  const buttonRefs = useRef([]);
  const listRef = useRef(null);

  const batches = item?.batches ?? [];
  const isAvailable = (batch) => Number(batch?.qty || 0) > 0;

  // Land on the first batch that can actually be chosen. Opening the dialog onto a
  // disabled row would make the first arrow press look broken.
  useEffect(() => {
    if (!isOpen || !item) return undefined;
    buttonRefs.current = [];
    const first = batches.findIndex(isAvailable);
    const target = first >= 0 ? first : 0;
    const frame = requestAnimationFrame(() => {
      buttonRefs.current[target]?.focus();
    });
    return () => cancelAnimationFrame(frame);
    // Re-run when a different item opens the dialog, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, item?.id]);

  const moveFocus = useCallback((direction) => {
    const buttons = buttonRefs.current.filter((button) => button && !button.disabled);
    if (buttons.length === 0) return;

    const current = buttons.indexOf(document.activeElement);
    // Nothing focused yet (or focus sits on the close button): enter the list at the
    // near end so the first key press always moves somewhere predictable.
    const next = current === -1
      ? (direction > 0 ? 0 : buttons.length - 1)
      : (current + direction + buttons.length) % buttons.length;

    buttons[next]?.focus();
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveFocus(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveFocus(-1);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Batch">
      <div className="-m-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800">Select Batch</h3>
          <p className="text-sm text-slate-500 font-medium line-clamp-1">{item.name}</p>
          {item.altName && <p className="text-xs text-slate-600">{item.altName}</p>}
        </div>

        <div
          ref={listRef}
          onKeyDown={handleKeyDown}
          className="p-4 space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar"
        >
          {batches.length > 0 ? (
            batches.map((batch, index) => {
              const available = isAvailable(batch);
              const stockLabel = formatDisplayStockQuantity(batch, 0, item);

              return (
                <button
                  key={batch.batchId}
                  ref={(node) => { buttonRefs.current[index] = node; }}
                  type="button"
                  onClick={() => onSelectBatch(batch)}
                  disabled={!available}
                  className={`group w-full flex items-center justify-between p-4 border rounded-xl transition-all text-left relative overflow-hidden focus:outline-none ${
                    available
                      ? "border-slate-200 hover:border-border-strong hover:bg-accent-soft/30 hover:shadow-md focus:border-accent focus:bg-accent-soft/40 focus:ring-2 focus:ring-accent/40"
                      : "border-danger-border bg-danger-soft/40 cursor-not-allowed opacity-80"
                  }`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 transition-all ${
                    available ? "bg-transparent group-hover:bg-accent group-focus:bg-accent" : "bg-danger"
                  }`}></div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider border border-slate-200">
                        <Package size={14} />
                        Batch #{batch.batchId}
                      </span>
                    </div>

                    {batch.expiry ? (
                      <div className="flex items-center gap-1.5 text-xs text-warning font-medium ml-1">
                        <Calendar size={14} className="text-warning" />
                        <span>Exp: {batch.expiry}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-success font-medium ml-1">
                        <AlertCircle size={14} className="text-success" />
                        <span>No Expiry</span>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div className={`text-xl font-bold transition-colors ${
                      available ? "text-slate-800 group-hover:text-accent group-focus:text-accent" : "text-slate-500"
                    }`}>
                      {formatCurrency(batch.price)}
                    </div>
                    <div className="text-xs font-semibold text-slate-600 mt-1">
                      <span className={available ? "text-success" : "text-danger"}>
                        {stockLabel}
                      </span>{" "}
                      Available
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="text-center py-10 text-slate-600">
              <Package size={48} className="mx-auto mb-3 opacity-20" />
              <p>No batches found for this item.</p>
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-600">
            Batches are listed oldest first. Use ↑ ↓ to choose, Enter to select.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default BatchSelectModal;