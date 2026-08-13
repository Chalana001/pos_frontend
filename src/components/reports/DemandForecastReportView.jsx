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

export default function DemandForecastReportView({ summary, accuracy, data, options, lookups, onOptionsChange, onRefresh, onExport, onSchedule }) {
  const [confidence, setConfidence] = useState("ALL");
  const [schedule, setSchedule] = useState({ frequency: "WEEKLY", nextRunAt: "", emailTo: "" });
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
    <Card className="p-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-bold text-slate-600">Forecast horizon<select className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" value={options.forecastDays} onChange={(event) => onOptionsChange({ ...options, forecastDays: Number(event.target.value) })}><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option><option value={60}>60 days</option><option value={90}>90 days</option></select></label>
        <label className="text-xs font-bold text-slate-600">Target cover<select className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" value={options.targetCoverDays} onChange={(event) => onOptionsChange({ ...options, targetCoverDays: Number(event.target.value) })}><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option><option value={60}>60 days</option><option value={90}>90 days</option></select></label>
        <label className="text-xs font-bold text-slate-600">Confidence<select className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" value={options.confidence} onChange={(event) => onOptionsChange({ ...options, confidence: event.target.value })}><option value="">All confidence</option><option value="HIGH">High</option><option value="MEDIUM">Medium</option><option value="LOW">Low</option><option value="INSUFFICIENT">Insufficient</option></select></label>
        <label className="text-xs font-bold text-slate-600">Category<select className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" value={options.categoryId} onChange={(event) => onOptionsChange({ ...options, categoryId: event.target.value ? Number(event.target.value) : "" })}><option value="">All categories</option>{lookups.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="text-xs font-bold text-slate-600">Supplier<select className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" value={options.supplierId} onChange={(event) => onOptionsChange({ ...options, supplierId: event.target.value ? Number(event.target.value) : "" })}><option value="">All suppliers</option>{lookups.suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="flex h-10 items-center gap-2 self-end rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"><input type="checkbox" checked={options.actionableOnly} onChange={(event) => onOptionsChange({ ...options, actionableOnly: event.target.checked })} /> Actionable only</label>
        <div className="flex gap-2 self-end"><button type="button" onClick={onRefresh} className="h-10 flex-1 rounded-lg bg-blue-600 px-3 text-sm font-bold text-white">Apply</button><button type="button" onClick={onExport} className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">Excel</button></div>
      </div>
      <details className="mt-4 border-t border-slate-100 pt-4"><summary className="cursor-pointer text-sm font-black text-slate-800">Schedule recurring forecast</summary><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><select className="h-10 rounded-lg border border-slate-200 px-3 text-sm" value={schedule.frequency} onChange={(event) => setSchedule({ ...schedule, frequency: event.target.value })}><option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option></select><input type="datetime-local" className="h-10 rounded-lg border border-slate-200 px-3 text-sm" value={schedule.nextRunAt} onChange={(event) => setSchedule({ ...schedule, nextRunAt: event.target.value })} /><input type="email" placeholder="Email recipient (optional)" className="h-10 rounded-lg border border-slate-200 px-3 text-sm" value={schedule.emailTo} onChange={(event) => setSchedule({ ...schedule, emailTo: event.target.value })} /><button type="button" onClick={() => schedule.nextRunAt && onSchedule({ ...schedule, emailTo: schedule.emailTo || null })} className="h-10 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-bold text-blue-700">Create Schedule</button></div></details>
    </Card>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([title, value, helper, Icon]) => <div key={title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex justify-between gap-3"><div><p className="text-xs font-bold uppercase text-slate-500">{title}</p><p className="mt-2 text-xl font-black text-slate-900">{value}</p><p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p></div><Icon size={20} className="text-blue-600" /></div></div>)}</div>
    <Card className="p-4" title="Forecast Accuracy">
      <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">Portfolio WAPE</p><p className="mt-1 text-xl font-black text-slate-900">{accuracy?.portfolioWape == null ? "Maturing" : `${Number(accuracy.portfolioWape).toFixed(1)}%`}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">Evaluated</p><p className="mt-1 text-xl font-black text-slate-900">{accuracy?.evaluatedSnapshots || 0}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold uppercase text-slate-500">Maturing</p><p className="mt-1 text-xl font-black text-slate-900">{accuracy?.maturingSnapshots || 0}</p></div></div>
      {accuracy?.history?.length > 0 ? <div className="mt-4 space-y-2">{accuracy.history.slice(0, 5).map((entry) => <div key={entry.id} className="flex flex-col gap-1 rounded-lg border border-slate-100 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-slate-800">{entry.forecastDays}-day forecast · {entry.scoredItems}/{entry.totalItems} scored</p><p className="text-xs text-slate-500">{new Date(entry.windowStart).toLocaleDateString()} to {new Date(entry.windowEnd).toLocaleDateString()}</p></div><p className="font-black text-slate-900">{entry.wape == null ? "Not scored" : `${Number(entry.wape).toFixed(1)}% WAPE`}</p></div>)}</div> : <p className="mt-4 rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">Accuracy appears after an exported forecast reaches the end of its forecast window.</p>}
    </Card>
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
