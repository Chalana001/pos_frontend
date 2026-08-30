import { AlertCircle, Calendar, Clock, DollarSign } from "lucide-react";
import { Bar, BarChart, Cell, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "../common/Card";
import Table from "../common/Table";
import { formatCurrency, shortCurrency } from "../../utils/formatters";
import { axisProps, gridProps, tooltipProps, BAR_RADIUS, ordinalRamp, tileTone } from "../../utils/chartTheme";

// Aging buckets are ordered age bands, so they take a one-hue ramp — the reader
// sees severity increase in the colour itself, not in four unrelated hues.
const BUCKET_COLORS = ordinalRamp(4);

const formatDateTime = (value) => value ? new Date(value).toLocaleString() : "-";

const priorityClass = (priority) => priority === "CRITICAL" ? "bg-red-100 text-red-700" : priority === "HIGH" ? "bg-amber-100 text-amber-700" : priority === "MEDIUM" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700";

function Metric({ title, value, helper, icon: Icon, accent = "accent" }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase text-slate-500">{title}</p><p className="mt-2 text-xl font-black text-slate-900">{formatCurrency(value)}</p><p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p></div><div className={`rounded-xl p-2.5 ${tileTone(accent).chip}`}><Icon size={19} /></div></div></div>;
}

export default function AgingReportView({ data, kind }) {
  const isSupplier = kind === "supplier";
  const rows = Array.isArray(data) ? data : [];
  const config = isSupplier ? {
    totalTitle: "Total Payables", countLabel: "suppliers", recentHelper: "Recently received purchases", middleHelper: "Plan supplier payment", highHelper: "High supplier risk", criticalHelper: "Critical overdue payables",
    chartTitle: "Payables Aging", chartSubtitle: "Outstanding supplier balances by purchase age", tableTitle: "Supplier Payment Priority",
    id: "supplierId", name: "supplierName", contact: "contactNo", count: "unpaidPurchaseCount", countText: "purchases", oldestNumber: "oldestInvoiceNo", oldestDate: "oldestPurchaseAt", route: "/suppliers/",
  } : {
    totalTitle: "Total Receivables", countLabel: "customers", recentHelper: "Recently issued credit", middleHelper: "Collection follow-up", highHelper: "High collection risk", criticalHelper: "Critical overdue credit",
    chartTitle: "Receivables Aging", chartSubtitle: "Outstanding customer credit by invoice age", tableTitle: "Collection Priority",
    id: "customerId", name: "customerName", contact: "phone", count: "unpaidInvoiceCount", countText: "invoices", oldestNumber: "oldestInvoiceNo", oldestDate: "oldestOrderAt", route: "/customers/",
  };
  const totals = rows.reduce((sum, row) => ({ current: sum.current + Number(row.bucket0to30 || 0), d31: sum.d31 + Number(row.bucket31to60 || 0), d61: sum.d61 + Number(row.bucket61to90 || 0), d91: sum.d91 + Number(row.bucket91plus || 0), total: sum.total + Number(row.totalDue || 0) }), { current: 0, d31: 0, d61: 0, d91: 0, total: 0 });
  const buckets = [{ name: "0-30 days", value: totals.current }, { name: "31-60 days", value: totals.d31 }, { name: "61-90 days", value: totals.d61 }, { name: "91+ days", value: totals.d91 }];
  const openRow = (row) => window.location.assign(`${config.route}${row[config.id]}`);

  return <div className="space-y-6">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric title={config.totalTitle} value={totals.total} helper={`${rows.length} ${config.countLabel}`} icon={DollarSign} /><Metric title="0-30 Days" value={totals.current} helper={config.recentHelper} icon={Calendar} accent="neutral" /><Metric title="31-60 Days" value={totals.d31} helper={config.middleHelper} icon={Clock} accent="warning" /><Metric title="61-90 Days" value={totals.d61} helper={config.highHelper} icon={AlertCircle} accent="warning" /><Metric title="91+ Days" value={totals.d91} helper={config.criticalHelper} icon={AlertCircle} accent="critical" /></div>
    <Card className="admin-panel-card border-slate-200/80 p-5"><h2 className="text-lg font-black text-slate-900">{config.chartTitle}</h2><p className="mt-1 text-xs font-semibold text-slate-500">{config.chartSubtitle}</p><div className="mt-5 h-[300px] min-h-[300px] min-w-0">{totals.total > 0 ? <ResponsiveContainer width="100%" height="100%"><BarChart data={buckets} margin={{ top: 12, right: 16, left: 4, bottom: 0 }}><CartesianGrid {...gridProps} /><XAxis dataKey="name" {...axisProps} /><YAxis {...axisProps} tickFormatter={shortCurrency} /><Tooltip formatter={(value) => formatCurrency(value)} {...tooltipProps} /><Bar dataKey="value" radius={BAR_RADIUS}>{buckets.map((bucket, index) => <Cell key={bucket.name} fill={BUCKET_COLORS[index]} />)}</Bar></BarChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">No outstanding balances</div>}</div></Card>
    <div className="space-y-3 md:hidden">{rows.map((row) => <button key={row[config.id]} type="button" onClick={() => openRow(row)} className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-black text-slate-900">{row[config.name]}</p><p className="mt-1 text-xs text-slate-500">{row[config.contact] || "No contact"} · {row[config.count]} {config.countText}</p></div><span className={`rounded-full px-2 py-1 text-xs font-black ${priorityClass(row.priority)}`}>{row.priority}</span></div><p className="mt-4 text-xl font-black text-slate-900">{formatCurrency(row.totalDue)}</p><p className="mt-1 text-xs font-semibold text-red-600">91+ overdue: {formatCurrency(row.bucket91plus)}</p></button>)}</div>
    <Card className="admin-panel-card hidden overflow-hidden p-0 md:block" title={config.tableTitle}><Table columns={[{ header: isSupplier ? "Supplier" : "Customer", render: (row) => <div><p className="font-bold">{row[config.name]}</p><p className="text-xs text-slate-500">{row[config.contact] || "No contact"}</p></div> }, { header: "Priority", accessor: "priority" }, { header: isSupplier ? "Purchases" : "Invoices", render: (row) => row[config.count] }, { header: "Total Due", render: (row) => <span className="font-black">{formatCurrency(row.totalDue)}</span> }, { header: "31-60", render: (row) => formatCurrency(row.bucket31to60) }, { header: "61-90", render: (row) => formatCurrency(row.bucket61to90) }, { header: "91+", render: (row) => <span className={Number(row.bucket91plus) > 0 ? "font-bold text-red-700" : "font-bold"}>{formatCurrency(row.bucket91plus)}</span> }, { header: "Oldest Invoice", render: (row) => <div><p>{row[config.oldestNumber] || "-"}</p><p className="text-xs text-slate-500">{formatDateTime(row[config.oldestDate])}</p></div> }, { header: "Last Payment", render: (row) => row.lastPaymentAt ? formatDateTime(row.lastPaymentAt) : "Never" }]} data={rows} onRowClick={openRow} getRowKey={(row) => row[config.id]} /></Card>
  </div>;
}
