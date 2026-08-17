import { useMemo, useState } from "react";
import { BarChart3, DollarSign, Package, TrendingUp } from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "../common/Card";
import Table from "../common/Table";
import { formatCurrency } from "../../utils/formatters";
import { axisProps, gridProps, tooltipProps, seriesColor, tileTone, BAR_RADIUS, LINE_WIDTH, DOT_RADIUS } from "../../utils/chartTheme";

const filters = [{ id: "ALL", label: "All" }, { id: "NEGATIVE", label: "Loss Making" }, { id: "LOW", label: "Margin ≤ 10%" }, { id: "MISSING", label: "Missing Cost" }];
const qty = (value, unit) => `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 3 })} ${unit || ""}`.trim();
const compactProductName = (value) => {
  const name = String(value || "Unknown product");
  return name.length > 16 ? `${name.slice(0, 15)}…` : name;
};

export default function ProductCategoryIntelligenceView({ data, intelligenceData, totalElements }) {
  const rows = useMemo(() => Array.isArray(data) ? data : [], [data]);
  const intelligenceRows = useMemo(() => Array.isArray(intelligenceData) && intelligenceData.length ? intelligenceData : rows, [intelligenceData, rows]);
  const [filter, setFilter] = useState("ALL");
  const filtered = useMemo(() => rows.filter((r) => filter === "ALL" || (filter === "NEGATIVE" && Number(r.profit) < 0) || (filter === "LOW" && Number(r.marginPercent) >= 0 && Number(r.marginPercent) <= 10) || (filter === "MISSING" && Number(r.revenue) > 0 && Number(r.cost) <= 0)), [rows, filter]);
  const totals = intelligenceRows.reduce((s, r) => ({ revenue: s.revenue + Number(r.revenue || 0), cost: s.cost + Number(r.cost || 0), profit: s.profit + Number(r.profit || 0) }), { revenue: 0, cost: 0, profit: 0 });
  // Both series are expressed as a percentage of total revenue so they share ONE
  // y-axis. A second y-scale would let the two series be aligned arbitrarily and
  // imply a relationship that isn't in the data. Absolute revenue stays in the
  // tooltip and in the table below.
  let cumulative = 0;
  const pareto = [...intelligenceRows].sort((a, b) => Number(b.revenue) - Number(a.revenue)).slice(0, 10).map((r) => {
    const revenue = Number(r.revenue || 0);
    cumulative += revenue;
    return {
      name: r.itemName || "Unknown product",
      revenue,
      revenueShare: totals.revenue ? revenue / totals.revenue * 100 : 0,
      cumulative: totals.revenue ? cumulative / totals.revenue * 100 : 0,
    };
  });
  const coverage = Number(totalElements || 0) > intelligenceRows.length ? `Top ${intelligenceRows.length} products` : "All products in period";
  const missingCostCount = intelligenceRows.filter((row) => Number(row.revenue || 0) > 0 && Number(row.cost || 0) <= 0).length;
  // Four figures, none of which mean good or bad — so they are ink, and only the
  // headline gets a tinted icon chip.
  const metrics = [["Product Revenue", totals.revenue, `${coverage}; before bill discounts`, DollarSign, "accent"], ["Gross Profit", totals.profit, `${coverage}; stored line cost`, TrendingUp, "neutral"], ["Gross Margin", totals.revenue ? totals.profit / totals.revenue * 100 : 0, coverage, BarChart3, "neutral"], ["Products", totalElements || rows.length, `${rows.length} shown on this page`, Package, "neutral"]];
  return <div className="space-y-6">
    {missingCostCount > 0 && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-black">Product profit confidence warning</p><p className="mt-1">{missingCostCount} of the {intelligenceRows.length} products in this intelligence set have revenue but no recorded cost. Product profit and margin may be overstated.</p></div>}
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([title, value, helper, Icon, tone], i) => <div key={title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex justify-between"><div><p className="text-xs font-bold uppercase text-slate-500">{title}</p><p className={`mt-2 text-xl font-black ${tileTone(tone).value}`}>{i === 2 ? `${Number(value).toFixed(1)}%` : i === 3 ? Number(value).toLocaleString() : formatCurrency(value)}</p><p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p></div><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tileTone(tone).chip}`}><Icon size={18} /></span></div></div>)}</div>
    <Card className="admin-panel-card p-5"><h2 className="text-lg font-black">Revenue Concentration</h2><p className="mt-1 text-xs font-semibold text-slate-500">Pareto view covers {coverage.toLowerCase()}; revenue is before bill-level discounts. Both series are shares of total revenue.</p><div className="mt-4 h-[380px] min-h-[380px]">{pareto.length ? <ResponsiveContainer width="100%" height="100%"><ComposedChart data={pareto} margin={{top:8,right:8,left:0,bottom:82}}><CartesianGrid {...gridProps} /><XAxis dataKey="name" interval={0} angle={-32} textAnchor="end" height={90} tickFormatter={compactProductName} {...axisProps} tick={{...axisProps.tick, fontSize:10}} /><YAxis domain={[0,100]} tickFormatter={(v) => `${v}%`} {...axisProps} /><Tooltip labelFormatter={(name) => String(name)} formatter={(value, key, entry) => key === "cumulative" ? [`${Number(value).toFixed(1)}%`, "Cumulative share"] : [`${Number(value).toFixed(1)}% · ${formatCurrency(entry?.payload?.revenue)}`, "Revenue share"]} {...tooltipProps} /><Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{fontSize:12,paddingBottom:8}} /><Bar name="Revenue share" dataKey="revenueShare" fill={seriesColor(0)} radius={BAR_RADIUS} /><Line name="Cumulative share" type="monotone" dataKey="cumulative" stroke={seriesColor(1)} strokeWidth={LINE_WIDTH} dot={{r:DOT_RADIUS,strokeWidth:0,fill:seriesColor(1)}} /></ComposedChart></ResponsiveContainer> : null}</div></Card>
    <Card className="admin-panel-card overflow-hidden p-0" title="Product Performance"><div className="flex flex-wrap gap-2 border-b border-slate-200 p-4">{filters.map(f => <button key={f.id} onClick={() => setFilter(f.id)} className={`rounded-full px-3 py-2 text-xs font-bold ${filter === f.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>{f.label}</button>)}</div><div className="space-y-3 p-4 md:hidden">{filtered.map(r => <div key={r.itemId} className="rounded-xl border border-slate-200 p-4"><p className="font-black">{r.itemName}</p><p className="mt-1 text-xs text-slate-500">{r.itemType} · {qty(r.qtySold,r.qtyUnit)}</p><div className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-slate-500">Revenue</p><p className="font-bold">{formatCurrency(r.revenue)}</p></div><div><p className="text-xs text-slate-500">Profit / Margin</p><p className={Number(r.profit)<0?"font-bold text-red-700":"font-bold text-emerald-700"}>{formatCurrency(r.profit)} · {Number(r.marginPercent||0).toFixed(1)}%</p></div></div></div>)}</div><div className="hidden md:block"><Table columns={[{header:"Item",render:r=><div><p className="font-bold">{r.itemName}</p><p className="text-xs text-slate-500">{r.itemType}</p></div>},{header:"Qty Sold",render:r=>qty(r.qtySold,r.qtyUnit)},{header:"Revenue",render:r=>formatCurrency(r.revenue)},{header:"Cost",render:r=>formatCurrency(r.cost)},{header:"Profit",render:r=><span className={Number(r.profit)<0?"font-bold text-red-700":"font-bold text-emerald-700"}>{formatCurrency(r.profit)}</span>},{header:"Margin",render:r=>`${Number(r.marginPercent||0).toFixed(1)}%`}]} data={filtered} /></div></Card>
  </div>;
}
