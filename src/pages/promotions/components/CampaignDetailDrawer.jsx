import React, { useEffect, useMemo, useRef, useState } from "react";
import { Copy, ExternalLink, X } from "lucide-react";
import { promotionsAPI } from "../../../api/promotions.api";
import { formatCurrency } from "../../../utils/formatters";
import PromotionAuditPanel from "./PromotionAuditPanel";
import PromotionStatusBadge from "./PromotionStatusBadge";
import Button from "../../../components/common/Button";

const CampaignDetailDrawer = ({ campaign, branchName, onClose, onDuplicate, onEdit }) => {
  const [promotion, setPromotion] = useState(null);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [redemptionsLoading, setRedemptionsLoading] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!campaign) return undefined;
    const opener = document.activeElement;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
    };
  }, [campaign, onClose]);

  useEffect(() => {
    if (!campaign) return undefined;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const response = await promotionsAPI.get(campaign.id);
        if (!cancelled) setPromotion(response.data);
      } catch {
        if (!cancelled) setPromotion(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [campaign]);

  useEffect(() => {
    if (!campaign) return undefined;
    let cancelled = false;
    (async () => {
      try {
        setRedemptionsLoading(true);
        const response = await promotionsAPI.redemptions({ promotionId: campaign.id, page: 0, size: 5 });
        if (!cancelled) setRedemptions(Array.isArray(response.data) ? response.data : []);
      } catch {
        if (!cancelled) setRedemptions([]);
      } finally {
        if (!cancelled) setRedemptionsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [campaign]);

  const current = useMemo(() => ({ ...campaign, ...(promotion || {}) }), [campaign, promotion]);
  const itemCount = current.items?.length || current.itemIds?.length || current.targetCount || 0;
  const scopeLabel = current.scope === "BILL" ? "Any bill" : `${current.scope || "-"} (${itemCount})`;
  const budget = current.budgetAmount != null && Number(current.budgetAmount) > 0
    ? `${formatCurrency(current.budgetConsumed || 0)} / ${formatCurrency(current.budgetAmount)}`
    : "Unlimited";
  const schedule = useMemo(() => {
    const row = current.schedules?.[0];
    if (!row) return "All day";
    if (row.startTime && row.endTime) return `${row.startTime.slice(0, 5)} – ${row.endTime.slice(0, 5)}`;
    return "Selected days";
  }, [current]);

  if (!campaign) return null;

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label="Campaign details">
      <button type="button" aria-label="Close campaign details" onClick={onClose} className="absolute inset-0 bg-slate-950/30" />
      <aside ref={panelRef} tabIndex={-1} className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-black text-slate-900">{current.name}</h2>
              <PromotionStatusBadge status={current.status || current.lifecycle} />
            </div>
            <p className="mt-1 text-xs text-slate-500">{branchName || "All branches"} · {scopeLabel}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close campaign details" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X size={19} />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto p-5">
          {loading ? (
            <div className="space-y-3">
              <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
              <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : (
            <section className="grid grid-cols-2 gap-3">
              {[
                ["Period", `${current.startAt ? new Date(current.startAt).toLocaleDateString() : "-"} – ${current.endAt ? new Date(current.endAt).toLocaleDateString() : "-"}`],
                ["Discount", current.effectType || current.discountType || "-"],
                ["Schedule", schedule],
                ["Budget", budget],
                ["Times used", Number(current.timesApplied ?? current.timesRedeemed ?? 0).toLocaleString()],
                ["Revenue", formatCurrency(current.totalRevenue || 0)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-1 truncate text-sm font-bold text-slate-800">{value}</p>
                </div>
              ))}
            </section>
          )}

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">Recent redemptions</h3>
              <span className="text-xs text-slate-400">{campaign.timesApplied || 0} total</span>
            </div>
            {redemptionsLoading ? <p className="text-sm text-slate-500">Loading…</p> : redemptions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">No promotion was applied in this period.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200">
                {redemptions.map((row, index) => (
                  <div key={`${row.orderId}-${row.level}-${row.itemId ?? index}`} className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5 text-xs last:border-b-0">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-800">{row.invoiceNo || `Order ${row.orderId}`}</div>
                      <div className="text-slate-500">{row.soldAt ? new Date(row.soldAt).toLocaleDateString() : "-"} · {row.level === "BILL" ? "Whole bill" : row.itemName || "Line"}</div>
                    </div>
                    <span className="shrink-0 font-bold text-emerald-700">-{formatCurrency(row.discountAmount)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {promotion && <PromotionAuditPanel promotionId={Number(campaign.id)} />}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 p-4">
          <Button variant="secondary" onClick={() => onDuplicate(campaign)}><Copy size={15} className="mr-2" /> Duplicate</Button>
          <Button onClick={() => onEdit(campaign.id)}><ExternalLink size={15} className="mr-2" /> Edit campaign</Button>
        </div>
      </aside>
    </div>
  );
};

export default CampaignDetailDrawer;
