import { useState } from "react";
import Card from "../common/Card";
import Table from "../common/Table";
import { formatCurrency } from "../../utils/formatters";
import { tileTone } from "../../utils/chartTheme";

// These grids are plain counts and totals — nothing here means good or bad, so
// the figures are ink. The tab label already says which family you are looking at.
const MetricGrid = ({ metrics, tone = "neutral" }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
    {metrics.map(([title, value]) => <div key={title} className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-bold uppercase text-slate-500">{title}</p><p className={`mt-2 text-xl font-black ${tileTone(tone).value}`}>{value}</p></div>)}
  </div>
);

export default function CommercialIntelligenceView({ promotions, returnsData, warranty }) {
  const [tab, setTab] = useState("promotions");
  const promos = Array.isArray(promotions) ? promotions : [];
  const warranties = Array.isArray(warranty?.items) ? warranty.items : [];
  const promoDiscount = promos.reduce((sum, row) => sum + Number(row.totalDiscountGiven || 0), 0);
  const promoRevenue = promos.reduce((sum, row) => sum + Number(row.totalRevenue || 0), 0);
  const marginBefore = promos.reduce((sum, row) => sum + Number(row.grossMarginBefore || 0), 0);
  const marginAfter = promos.reduce((sum, row) => sum + Number(row.grossMarginAfter || 0), 0);
  const open = (path) => window.location.assign(path);
  const pct = (value) => (value == null ? "-" : `${Number(value) > 0 ? "+" : ""}${Number(value).toFixed(1)}%`);

  return <div className="space-y-6">
    <div className="flex flex-wrap gap-2">{[["promotions", "Promotions"], ["returns", "Returns"], ["warranty", "Warranty"]].map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`min-h-11 rounded-full px-4 py-2 text-sm font-bold ${tab === id ? "bg-blue-600 text-white" : "bg-slate-100"}`}>{label}</button>)}</div>
    {tab === "promotions" && <>
      <MetricGrid tone="neutral" metrics={[["Promotions Used", promos.length], ["Times Applied", promos.reduce((sum, row) => sum + Number(row.timesApplied || 0), 0)], ["Discount Given", formatCurrency(promoDiscount)], ["Revenue On Those Sales", formatCurrency(promoRevenue)]]} />
      <MetricGrid tone="neutral" metrics={[["Margin Before", formatCurrency(marginBefore)], ["Margin After", formatCurrency(marginAfter)], ["Margin Given Up", formatCurrency(marginBefore - marginAfter)], ["Share Of Margin", marginBefore > 0 ? `${(((marginBefore - marginAfter) / marginBefore) * 100).toFixed(1)}%` : "-"]]} />
      <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">Covers item, category, bill and customer promotions, and a line two promotions stacked on counts for each. Revenue is turnover on the sales a promotion appeared on. Not uplift: the customer may have bought the same basket anyway. Basket lift compares those sales against ones no promotion touched in the same period, which is an indication rather than a controlled test.</p>
      <div className="space-y-3 md:hidden">{promos.map((row) => <button key={row.promotionId} onClick={() => open('/promotions')} className="w-full rounded-xl border p-4 text-left"><p className="font-black">{row.promotionName}</p><p className="mt-1 text-xs text-slate-500">{row.discountType}, Applied {row.timesApplied} times</p><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><p>Discount: <b>{formatCurrency(row.totalDiscountGiven)}</b></p><p>Revenue: <b>{formatCurrency(row.totalRevenue)}</b></p><p>Margin given up: <b>{formatCurrency(Number(row.grossMarginBefore || 0) - Number(row.grossMarginAfter || 0))}</b></p><p>Basket lift: <b>{pct(row.basketLiftPercent)}</b></p></div></button>)}</div>
      <Card className="admin-panel-card hidden overflow-hidden p-0 md:block" title="Promotion Effectiveness"><Table columns={[
        { header: "Promotion", render: (row) => <div><p className="font-bold">{row.promotionName}</p><p className="text-xs text-slate-500">{[row.scope, row.effectType].filter(Boolean).join(", ")}</p></div> },
        { header: "Applied", accessor: "timesApplied" },
        { header: "Units", render: (row) => Number(row.unitsMoved || 0) > 0 ? Number(row.unitsMoved).toFixed(2) : "-" },
        { header: "Discount", render: (row) => formatCurrency(row.totalDiscountGiven) },
        { header: "Revenue", render: (row) => formatCurrency(row.totalRevenue) },
        { header: "Margin given up", render: (row) => formatCurrency(Number(row.grossMarginBefore || 0) - Number(row.grossMarginAfter || 0)) },
        { header: "Share of margin", render: (row) => row.marginErosionPercent == null ? "-" : `${Number(row.marginErosionPercent).toFixed(1)}%` },
        { header: "Basket lift", render: (row) => pct(row.basketLiftPercent) },
        { header: "Codes used", render: (row) => Number(row.codesIssued || 0) === 0 ? "-" : `${row.codesUsed}/${row.codesIssued} (${Number(row.codeRedemptionRatePercent || 0).toFixed(0)}%)` },
      ]} data={promos} onRowClick={() => open('/promotions')} /></Card>
    </>}
    {tab === "returns" && <><MetricGrid tone="neutral" metrics={[["Sale Returns", returnsData?.summary?.saleReturnCount || 0], ["Sale Return Value", formatCurrency(returnsData?.summary?.saleReturnTotal || 0)], ["Purchase Returns", returnsData?.summary?.purchaseReturnCount || 0], ["Return Rate", `${Number(returnsData?.summary?.returnRate || 0).toFixed(1)}%`]]} /><button onClick={() => open('/reports/returns')} className="rounded-xl bg-blue-600 px-4 py-3 font-bold text-white">Open Detailed Returns Report</button></>}
    {tab === "warranty" && <>
      <MetricGrid tone="neutral" metrics={[["Warranties", warranty?.totalWarranties || 0], ["Active", warranty?.totalActive || 0], ["Claimed", warranty?.totalClaimed || 0], ["Expired", warranty?.totalExpired || 0]]} />
      <div className="space-y-3 md:hidden">{warranties.map((row) => <button key={row.itemId} onClick={() => open('/warranties')} className="w-full rounded-xl border p-4 text-left"><p className="font-black">{row.itemName}</p><p className="mt-1 text-xs text-slate-500">{row.barcode || "No barcode"}</p><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><p>Total: <b>{row.totalWarranties}</b></p><p>Active: <b>{row.activeCount}</b></p><p>Claimed: <b>{row.claimedCount}</b></p><p>Expired: <b>{row.expiredCount}</b></p></div></button>)}</div>
      <Card className="admin-panel-card hidden overflow-hidden p-0 md:block" title="Warranty Risk by Item"><Table columns={[{ header: "Item", render: (row) => <div><p className="font-bold">{row.itemName}</p><p className="text-xs text-slate-500">{row.barcode}</p></div> }, { header: "Total", accessor: "totalWarranties" }, { header: "Active", accessor: "activeCount" }, { header: "Claimed", accessor: "claimedCount" }, { header: "Expired", accessor: "expiredCount" }, { header: "Void", accessor: "voidCount" }]} data={warranties} onRowClick={() => open('/warranties')} /></Card>
    </>}
  </div>;
}
