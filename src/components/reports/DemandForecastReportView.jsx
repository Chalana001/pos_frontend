import { useMemo, useState } from "react";
import { AlertTriangle, BadgeDollarSign, PackageSearch, TrendingUp } from "lucide-react";

import Card from "../common/Card";
import Table from "../common/Table";
import { formatCurrency } from "../../utils/formatters";

const formatQty = (value, unit) => `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 3 })}${unit ? ` ${unit}` : ""}`;
const confidenceStyle = {
  HIGH: "bg-emerald-100 text-emerald-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  LOW: "bg-amber-100 text-amber-700",
  INSUFFICIENT: "bg-slate-100 text-slate-700",
};

function ConfidenceBadge({ value }) {
  return <span className={`rounded-full px-2 py-1 text-xs font-black ${confidenceStyle[value] || confidenceStyle.INSUFFICIENT}`}>{value || "INSUFFICIENT"}</span>;
}

export default function DemandForecastReportView({ summary, data }) {
  const [confidence, setConfidence] = useState("ALL");
  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const filtered = useMemo(() => [...(confidence === "ALL" ? rows : rows.filter((row) => row.confidence === confidence))]
    .sort((a, b) => Number(b.estimatedReorderCost || 0) - Number(a.estimatedReorderCost || 0)), [rows, confidence]);
  const metrics = [
    ["Projected Revenue", formatCurrency(summary?.projectedRevenue), `${summary?.forecastDays || 30}-day directional projection`, TrendingUp],
    ["Reorder Budget", formatCurrency(summary?.estimatedReorderCost), `${summary?.targetCoverDays || 14}-day target cover`, BadgeDollarSign],
    ["Actionable Items", Number(summary?.actionableItems || 0).toLocaleString(), "Suggested reorder above zero", PackageSearch],
    ["Needs Review", Number(summary?.lowConfidenceItems || 0).toLocaleString(), "Medium, low, or insufficient confidence", AlertTriangle],
  ];

  return <div className="space-y-6">
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
      <p className="font-black">Directional forecast, not a guarantee</p>
      <p className="mt-1">Uses {summary?.historyDays || 90} days of completed sales, weighting the latest 30 days more heavily. Confidence reflects selling-day coverage and demand variability.</p>
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([title, value, helper, Icon]) => <div key={title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex justify-between gap-3"><div><p className="text-xs font-bold uppercase text-slate-500">{title}</p><p className="mt-2 text-xl font-black text-slate-900">{value}</p><p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p></div><Icon size={20} className="text-blue-600" /></div></div>)}</div>
    <Card className="overflow-hidden p-0" title="Item Demand Forecast">
      <div className="border-b border-slate-100 bg-slate-50 p-4"><p className="mb-2 text-xs font-bold text-slate-600">Filter by confidence</p><div role="group" aria-label="Filter by confidence" className="flex gap-2 overflow-x-auto pb-1">{["ALL", "HIGH", "MEDIUM", "LOW", "INSUFFICIENT"].map((value) => <button key={value} type="button" aria-pressed={confidence === value} onClick={() => setConfidence(value)} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-bold ${confidence === value ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600"}`}>{value}</button>)}</div></div>
      <div className="space-y-3 p-4 md:hidden">{filtered.length === 0 ? <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No items match the {confidence.toLowerCase()} confidence filter.</p> : filtered.map((row) => <div key={row.itemId} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-slate-900">{row.itemName}</p><p className="text-xs text-slate-500">{row.barcode || "No barcode"} · {row.trend?.replaceAll("_", " ") || "UNKNOWN"}</p></div><ConfidenceBadge value={row.confidence} /></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-slate-500">On hand</p><p className="font-bold">{formatQty(row.qtyOnHand, row.unit)}</p></div><div><p className="text-xs text-slate-500">Projected demand</p><p className="font-bold">{formatQty(row.projectedDemand, row.unit)}</p></div><div><p className="text-xs text-slate-500">Stockout</p><p className="font-bold">{row.estimatedStockoutDays == null ? "-" : `${Number(row.estimatedStockoutDays).toFixed(1)} days`}</p></div><div><p className="text-xs text-slate-500">Forecast reorder</p><p className="font-bold text-emerald-700">{formatQty(row.suggestedReorderQty, row.unit)}</p></div><div><p className="text-xs text-slate-500">Reorder-level gap</p><p className="font-bold">{formatQty(row.reorderLevelGapQty, row.unit)}</p></div></div>{row.warning && <p className="mt-3 text-xs font-semibold text-amber-700">{row.warning}</p>}</div>)}</div>
      <div className="hidden md:block"><Table columns={[
        { header: "Item", render: (row) => <div><p className="font-bold">{row.itemName}</p><p className="text-xs text-slate-500">{row.barcode || "No barcode"}</p></div> },
        { header: "Confidence", render: (row) => <div><ConfidenceBadge value={row.confidence} /><p className="mt-1 text-[10px] text-slate-500">{row.trend?.replaceAll("_", " ")}</p></div> },
        { header: "History", render: (row) => <div><p>{formatQty(row.soldLast30Days, row.unit)} recent</p><p className="text-xs text-slate-500">{row.activeSalesDays} selling days</p></div> },
        { header: "Forecast", render: (row) => <div><p className="font-bold">{formatQty(row.projectedDemand, row.unit)}</p><p className="text-xs text-slate-500">{formatCurrency(row.projectedRevenue)}</p></div> },
        { header: "Stockout", render: (row) => row.estimatedStockoutDays == null ? "-" : `${Number(row.estimatedStockoutDays).toFixed(1)} days` },
        { header: "Suggested Reorder", render: (row) => <div><p className="font-bold text-emerald-700">{formatQty(row.suggestedReorderQty, row.unit)}</p><p className="text-xs text-slate-500">{formatCurrency(row.estimatedReorderCost)}</p></div> },
        { header: "Warning", render: (row) => <span className="text-xs text-slate-600">{row.warning || "Stable history"}</span> },
      ]} data={filtered} getRowKey={(row) => row.itemId} /></div>
    </Card>
  </div>;
}
