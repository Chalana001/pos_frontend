import { useMemo, useState } from "react";
import { Repeat, ShoppingCart, UserPlus, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card from "../common/Card";
import Table from "../common/Table";
import { formatCurrency } from "../../utils/formatters";
import { axisProps, gridProps, tooltipProps, seriesColor, TILE, BAR_RADIUS } from "../../utils/chartTheme";

const activityFilters = ["ALL", "ACTIVE_30", "INACTIVE_31_60", "INACTIVE_61_90", "INACTIVE_91_PLUS"];

export default function CustomerBehaviorReportView({ data }) {
  const [activity, setActivity] = useState("ALL");
  const rows = useMemo(() => Array.isArray(data?.customers) ? data.customers : [], [data]);
  const filtered = activity === "ALL" ? rows : rows.filter((row) => row.inactivityBucket === activity);
  const openCustomer = (row) => window.location.assign(`/customers/${row.customerId}`);
  const chart = [{ name: "New", value: Number(data?.newCustomers || 0) }, { name: "Returning", value: Number(data?.returningCustomers || 0) }];
  const metrics = [["Active Customers", data?.activeCustomersInPeriod, "Completed orders in period", Users], ["New Customers", data?.newCustomers, "First purchase in period", UserPlus], ["Returning", data?.returningCustomers, "Purchased before and during period", Repeat], ["Repeat Rate", data?.repeatRatePercent, "Returning / active", Repeat], ["Orders per Customer", data?.averageOrdersPerActiveCustomer, `${data?.periodOrders || 0} period orders`, ShoppingCart]];
  return <div className="space-y-6">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">{metrics.map(([title, value, helper, Icon], index) => <div key={title} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex justify-between gap-3"><div><p className="text-xs font-bold uppercase text-slate-500">{title}</p><p className={`mt-2 text-xl font-black ${TILE.neutral.value}`}>{index === 3 ? `${Number(value || 0).toFixed(1)}%` : index === 4 ? Number(value || 0).toFixed(2) : Number(value || 0).toLocaleString()}</p><p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p></div><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${index === 0 ? TILE.accent.chip : TILE.neutral.chip}`}><Icon size={18} /></span></div></div>)}</div>
    <Card className="admin-panel-card p-5"><h2 className="text-lg font-black">New vs Returning Customers</h2><div className="mt-4 h-[260px] min-h-[260px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart}><CartesianGrid {...gridProps} /><XAxis dataKey="name" {...axisProps} /><YAxis allowDecimals={false} {...axisProps} /><Tooltip formatter={(value) => [Number(value).toLocaleString(), "Customers"]} {...tooltipProps} /><Bar dataKey="value" fill={seriesColor(0)} radius={BAR_RADIUS} /></BarChart></ResponsiveContainer></div></Card>
    <Card className="admin-panel-card overflow-hidden p-0" title="Customer Behavior"><div className="flex flex-wrap gap-2 border-b border-slate-200 p-4">{activityFilters.map((filter) => <button key={filter} onClick={() => setActivity(filter)} className={`rounded-full px-3 py-2 text-xs font-bold ${activity === filter ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>{filter.replaceAll("_", " ")}</button>)}</div>
      <div className="space-y-3 p-4 md:hidden">{filtered.map((row) => <button key={row.customerId} onClick={() => openCustomer(row)} className="w-full rounded-xl border border-slate-200 p-4 text-left"><p className="font-black">{row.customerName}</p><p className="text-xs text-slate-500">{row.phone} · {row.inactivityBucket.replaceAll("_", " ")}</p><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><p>Period: <b>{formatCurrency(row.periodSpend)}</b></p><p>Lifetime: <b>{formatCurrency(row.lifetimeSpend)}</b></p><p>Orders: <b>{row.periodOrderCount}/{row.lifetimeOrderCount}</b></p><p>Due: <b>{formatCurrency(row.currentDue)}</b></p></div></button>)}</div>
      <div className="hidden md:block"><Table columns={[{ header: "Customer", render: (row) => <div><p className="font-bold">{row.customerName}</p><p className="text-xs text-slate-500">{row.phone}</p></div> }, { header: "Type", render: (row) => row.newCustomer ? "NEW" : "RETURNING" }, { header: "Period Orders", accessor: "periodOrderCount" }, { header: "Lifetime Orders", accessor: "lifetimeOrderCount" }, { header: "Period Spend", render: (row) => formatCurrency(row.periodSpend) }, { header: "Lifetime Spend", render: (row) => formatCurrency(row.lifetimeSpend) }, { header: "Avg Order", render: (row) => formatCurrency(row.averagePeriodOrder) }, { header: "Current Due", render: (row) => formatCurrency(row.currentDue) }, { header: "Days Since", accessor: "daysSinceLastPurchase" }, { header: "Activity", accessor: "inactivityBucket" }]} data={filtered} onRowClick={openCustomer} getRowKey={(row) => row.customerId} /></div>
    </Card>
  </div>;
}
