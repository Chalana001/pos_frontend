import { DollarSign, PackageCheck, RotateCcw, Truck } from "lucide-react";
import Card from "../common/Card";
import Table from "../common/Table";
import { formatCurrency } from "../../utils/formatters";

const dateTime = (value) => value ? new Date(value).toLocaleString() : "-";

function Metric({ title, value, helper, icon: Icon, tone }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex justify-between gap-3"><div><p className="text-xs font-bold uppercase text-slate-500">{title}</p><p className={`mt-2 text-xl font-black ${tone}`}>{formatCurrency(value)}</p><p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p></div><Icon size={20} className={tone} /></div></div>;
}

export default function GrnPurchaseReportView({ summary }) {
  const rows = Array.isArray(summary?.page?.items) ? summary.page.items : [];
  const openPurchase = (row) => row.purchaseId && window.location.assign(`/purchases/${row.purchaseId}`);
  return <div className="space-y-6">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric title="Received Value" value={summary?.totalAmount} helper={`${summary?.page?.totalElements || 0} GRNs`} icon={PackageCheck} tone="text-blue-700" /><Metric title="Purchase Returns" value={summary?.totalReturns} helper="Completed supplier returns" icon={RotateCcw} tone="text-red-700" /><Metric title="Net Received Value" value={summary?.netReceivedAmount} helper="Received less returns" icon={Truck} tone="text-emerald-700" /><Metric title="Purchase Payables" value={summary?.totalDue} helper={`${summary?.uniquePurchaseCount || 0} unique purchases`} icon={DollarSign} tone="text-amber-700" /></div>
    <div className="space-y-3 md:hidden">{rows.map((row) => <button key={row.grnId} type="button" disabled={!row.purchaseId} onClick={() => openPurchase(row)} className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm disabled:cursor-default"><div className="flex justify-between gap-3"><div><p className="font-black text-slate-900">{row.grnNo}</p><p className="mt-1 text-xs text-slate-500">{row.supplierName} · {row.branchName}</p></div><p className="font-black text-blue-700">{formatCurrency(row.netReceivedAmount)}</p></div><div className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><p className="text-slate-500">Purchase invoice</p><p className="mt-1 font-bold">{row.purchaseInvoiceNo || "Unlinked"}</p></div><div><p className="text-slate-500">Purchase due</p><p className="mt-1 font-bold text-amber-700">{formatCurrency(row.purchaseDueAmount)}</p></div></div><p className="mt-3 text-xs text-slate-500">Received {dateTime(row.receivedAt)}</p></button>)}</div>
    <Card className="admin-panel-card hidden overflow-hidden p-0 md:block" title="GRN / Purchase Ledger"><Table columns={[{ header: "GRN", render: (r) => <div><p className="font-bold">{r.grnNo}</p><p className="text-xs text-slate-500">{dateTime(r.receivedAt)}</p></div> }, { header: "Supplier", render: (r) => <div><p className="font-bold">{r.supplierName}</p><p className="text-xs text-slate-500">{r.branchName}</p></div> }, { header: "Purchase", render: (r) => <div><p>{r.purchaseInvoiceNo || "Unlinked"}</p><p className="text-xs text-slate-500">{r.purchaseStatus || "-"}</p></div> }, { header: "Received", render: (r) => formatCurrency(r.totalAmount) }, { header: "Returns", render: (r) => <span className="text-red-700">{formatCurrency(r.returnAmount)}</span> }, { header: "Net Received", render: (r) => <span className="font-black text-blue-700">{formatCurrency(r.netReceivedAmount)}</span> }, { header: "Purchase Paid", render: (r) => formatCurrency(r.purchasePaidAmount) }, { header: "Purchase Due", render: (r) => <span className="font-black text-amber-700">{formatCurrency(r.purchaseDueAmount)}</span> }, { header: "Received By", render: (r) => r.createdByUsername || "-" }]} data={rows} onRowClick={openPurchase} getRowKey={(r) => r.grnId} /></Card>
  </div>;
}
