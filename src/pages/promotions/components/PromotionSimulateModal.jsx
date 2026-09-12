import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { FlaskConical } from "lucide-react";

import { promotionsAPI } from "../../../api/promotions.api";
import Modal from "../../../components/common/Modal";
import LoadingSpinner from "../../../components/common/LoadingSpinner";
import { formatCurrency } from "../../../utils/formatters";

const DAY_OPTIONS = [7, 30, 90];

/**
 * "What would this have cost?" — the promotion as typed, replayed over the shop's recent real
 * sales by the same engine that will price tomorrow's. Cheap to run, and the honest answer to
 * whether a discount is a good idea before anyone can find out the expensive way.
 */
const PromotionSimulateModal = ({ isOpen, onClose, payload, branchId }) => {
  const [days, setDays] = useState(30);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const response = await promotionsAPI.simulate({
          promotion: payload,
          days,
          branchId: branchId ? Number(branchId) : null,
        });
        if (!cancelled) setResult(response.data);
      } catch (error) {
        if (!cancelled) {
          toast.error(error?.response?.data?.message || "Could not run the simulation");
          setResult(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // payload is rebuilt every render; the modal only re-runs when opened or the window changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, days]);

  const Stat = ({ label, value, tone }) => (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-bold ${tone || "text-slate-800"}`}>{value}</div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="What would this have cost?" size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            Replays this promotion, on its own, over completed sales from the last
          </p>
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {DAY_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDays(option)}
                className={`rounded-md px-3 py-1.5 text-xs font-bold ${
                  days === option ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {option} days
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-10"><LoadingSpinner size="lg" text="Replaying sales…" /></div>
        ) : !result ? (
          <div className="py-10 text-center text-sm text-slate-500">No result.</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Orders scanned" value={result.ordersScanned} />
              <Stat label="Orders affected" value={`${result.ordersAffected} (${result.affectedRatePercent}%)`} />
              <Stat label="Projected discount" value={formatCurrency(result.projectedDiscount)} tone="text-red-600" />
              <Stat label="Worst single order" value={formatCurrency(result.maxOrderDiscount)} tone="text-amber-700" />
              <Stat label="Per affected order" value={formatCurrency(result.averageDiscountPerAffectedOrder)} />
              <Stat label="Per day" value={formatCurrency(result.projectedDailyDiscount)} />
              <Stat
                label="Budget lasts"
                value={result.budgetDaysRemaining != null ? `${result.budgetDaysRemaining} days` : "No budget set"}
                tone={result.budgetDaysRemaining != null && Number(result.budgetDaysRemaining) < 7 ? "text-red-600" : undefined}
              />
              <Stat
                label="Margin erosion"
                value={result.marginErosionPercent != null ? `${result.marginErosionPercent}%` : "-"}
                tone={result.marginErosionPercent != null && Number(result.marginErosionPercent) > 50 ? "text-red-600" : undefined}
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              Gross margin on the affected sales would have gone from{" "}
              <span className="font-bold">{formatCurrency(result.grossMarginBefore)}</span> to{" "}
              <span className="font-bold">{formatCurrency(result.grossMarginAfter)}</span>.
              {result.truncated && (
                <span className="ml-1 text-amber-700">Only the newest {result.ordersScanned} orders were scanned.</span>
              )}
            </div>

            {result.topItems?.length > 0 && (
              <div>
                <h4 className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <FlaskConical size={12} /> Where the money goes
                </h4>
                <table className="w-full text-sm">
                  <tbody>
                    {result.topItems.map((row) => (
                      <tr key={row.itemId} className="border-t border-slate-100">
                        <td className="py-1.5 text-slate-800">{row.itemName || `Item ${row.itemId}`}</td>
                        <td className="py-1.5 text-right text-slate-500">{row.timesDiscounted}×</td>
                        <td className="py-1.5 text-right font-semibold text-slate-800">{formatCurrency(row.discount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

export default PromotionSimulateModal;
