import { useState } from "react";
import Card from "../common/Card";
import Table from "../common/Table";
import { formatCurrency } from "../../utils/formatters";

const MetricGrid = ({ metrics, tone }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
    {metrics.map(([title, value]) => <div key={title} className="rounded-xl border p-4"><p className="text-xs font-bold uppercase text-slate-500">{title}</p><p className={`mt-2 text-xl font-black ${tone}`}>{value}</p></div>)}
  </div>
);

export default function CommercialIntelligenceView({ promotions, returnsData, warranty }) {
  const [tab, setTab] = useState("promotions");
  const promos = Array.isArray(promotions) ? promotions : [];
  const warranties = Array.isArray(warranty?.items) ? warranty.items : [];
  const promoDiscount = promos.reduce((sum, row) => sum + Number(row.totalDiscountGiven || 0), 0);
  const promoRevenue = promos.reduce((sum, row) => sum + Number(row.totalRevenue || 0), 0);
  const open = (path) => window.location.assign(path);

  return <div className="space-y-6">
    <div className="flex flex-wrap gap-2">{[["promotions", "Promotions"], ["returns", "Returns"], ["warranty", "Warranty"]].map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === id ? "bg-blue-600 text-white" : "bg-slate-100"}`}>{label}</button>)}</div>
    {tab === "promotions" && <>
      <MetricGrid tone="text-blue-700" metrics={[["Bill Promotions", promos.length], ["Times Applied", promos.reduce((sum, row) => sum + Number(row.timesApplied || 0), 0)], ["Discount Given", formatCurrency(promoDiscount)], ["Associated Revenue", formatCurrency(promoRevenue)]]} />
      <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">This report covers bill-level promotions only. Associated revenue is not incremental uplift or ROI.</p>
      <div className="space-y-3 md:hidden">{promos.map((row) => <button key={row.promotionId} onClick={() => open('/promotions')} className="w-full rounded-xl border p-4 text-left"><p className="font-black">{row.promotionName}</p><p className="mt-1 text-xs text-slate-500">{row.discountType} · Applied {row.timesApplied} times</p><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><p>Discount: <b>{formatCurrency(row.totalDiscountGiven)}</b></p><p>Revenue: <b>{formatCurrency(row.totalRevenue)}</b></p></div></button>)}</div>
      <Card className="admin-panel-card hidden overflow-hidden p-0 md:block" title="Promotion Effectiveness"><Table columns={[{ header: "Promotion", accessor: "promotionName" }, { header: "Type", accessor: "discountType" }, { header: "Applied", accessor: "timesApplied" }, { header: "Discount", render: (row) => formatCurrency(row.totalDiscountGiven) }, { header: "Revenue", render: (row) => formatCurrency(row.totalRevenue) }, { header: "Avg Order", render: (row) => formatCurrency(row.avgOrderValue) }]} data={promos} onRowClick={() => open('/promotions')} /></Card>
    </>}
    {tab === "returns" && <><MetricGrid tone="text-red-700" metrics={[["Sale Returns", returnsData?.summary?.saleReturnCount || 0], ["Sale Return Value", formatCurrency(returnsData?.summary?.saleReturnTotal || 0)], ["Purchase Returns", returnsData?.summary?.purchaseReturnCount || 0], ["Return Rate", `${Number(returnsData?.summary?.returnRate || 0).toFixed(1)}%`]]} /><button onClick={() => open('/reports/returns')} className="rounded-xl bg-blue-600 px-4 py-3 font-bold text-white">Open Detailed Returns Report</button></>}
    {tab === "warranty" && <>
      <MetricGrid tone="text-indigo-700" metrics={[["Warranties", warranty?.totalWarranties || 0], ["Active", warranty?.totalActive || 0], ["Claimed", warranty?.totalClaimed || 0], ["Expired", warranty?.totalExpired || 0]]} />
      <div className="space-y-3 md:hidden">{warranties.map((row) => <button key={row.itemId} onClick={() => open('/warranties')} className="w-full rounded-xl border p-4 text-left"><p className="font-black">{row.itemName}</p><p className="mt-1 text-xs text-slate-500">{row.barcode || "No barcode"}</p><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><p>Total: <b>{row.totalWarranties}</b></p><p>Active: <b>{row.activeCount}</b></p><p>Claimed: <b>{row.claimedCount}</b></p><p>Expired: <b>{row.expiredCount}</b></p></div></button>)}</div>
      <Card className="admin-panel-card hidden overflow-hidden p-0 md:block" title="Warranty Risk by Item"><Table columns={[{ header: "Item", render: (row) => <div><p className="font-bold">{row.itemName}</p><p className="text-xs text-slate-500">{row.barcode}</p></div> }, { header: "Total", accessor: "totalWarranties" }, { header: "Active", accessor: "activeCount" }, { header: "Claimed", accessor: "claimedCount" }, { header: "Expired", accessor: "expiredCount" }, { header: "Void", accessor: "voidCount" }]} data={warranties} onRowClick={() => open('/warranties')} /></Card>
    </>}
  </div>;
}
