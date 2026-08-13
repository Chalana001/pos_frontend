import { ArrowDownToLine, ArrowUpFromLine, Package, Scale } from "lucide-react";
import Card from "../common/Card";
import Table from "../common/Table";

const qty = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });

function Metric({ title, value, helper, icon: Icon, tone }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex justify-between gap-3"><div><p className="text-xs font-bold uppercase text-slate-500">{title}</p><p className={`mt-2 text-xl font-black ${tone}`}>{qty(value)}</p><p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p></div><Icon size={20} className={tone} /></div></div>;
}

export default function StockMovementReportView({ data, totalElements }) {
  const rows = Array.isArray(data) ? data : [];
  const sums = rows.reduce((sum, row) => ({
    incoming: sum.incoming + Number(row.purchasesIn || 0) + Number(row.returnsIn || 0) + Number(row.transfersIn || 0) + Number(row.processingIn || 0) + Math.max(0, Number(row.adjustmentsNet || 0)),
    outgoing: sum.outgoing + Number(row.salesOut || 0) + Number(row.purchaseReturnsOut || 0) + Number(row.transfersOut || 0) + Number(row.processingOut || 0) + Math.max(0, -Number(row.adjustmentsNet || 0)),
    opening: sum.opening + Number(row.openingStock || 0), closing: sum.closing + Number(row.closingStock || 0),
  }), { incoming: 0, outgoing: 0, opening: 0, closing: 0 });
  const openItem = (row) => window.location.assign(`/stock/item/${row.itemId}`);

  return <div className="space-y-6">
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric title="Opening Quantity" value={sums.opening} helper="Current page items" icon={Package} tone="text-slate-800" /><Metric title="Total Inflows" value={sums.incoming} helper="Purchases, returns, transfers, processing" icon={ArrowDownToLine} tone="text-emerald-700" /><Metric title="Total Outflows" value={sums.outgoing} helper="Sales, returns, transfers, processing" icon={ArrowUpFromLine} tone="text-red-700" /><Metric title="Closing Quantity" value={sums.closing} helper={`${rows.length} of ${totalElements || rows.length} items`} icon={Scale} tone="text-blue-700" /></div>
    <div className="space-y-3 md:hidden">{rows.map((row) => <button key={row.itemId} type="button" onClick={() => openItem(row)} className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm"><div className="flex justify-between gap-3"><div className="min-w-0"><p className="truncate font-black text-slate-900">{row.itemName}</p><p className="mt-1 text-xs text-slate-500">{row.barcode || "No barcode"} · {row.unit}</p></div><p className={`font-black ${Number(row.closingStock) < 0 ? "text-red-700" : "text-blue-700"}`}>{qty(row.closingStock)}</p></div><div className="mt-4 grid grid-cols-3 gap-2 text-xs"><div><p className="text-slate-500">Opening</p><p className="mt-1 font-bold">{qty(row.openingStock)}</p></div><div><p className="text-slate-500">Purchased</p><p className="mt-1 font-bold text-emerald-700">{qty(row.purchasesIn)}</p></div><div><p className="text-slate-500">Sold</p><p className="mt-1 font-bold text-red-700">{qty(row.salesOut)}</p></div></div></button>)}</div>
    <Card className="admin-panel-card hidden overflow-hidden p-0 md:block" title="Stock Movement Ledger"><Table columns={[{ header: "Item", render: (r) => <div><p className="font-bold">{r.itemName}</p><p className="text-xs text-slate-500">{r.barcode || "No barcode"} · {r.unit}</p></div> }, { header: "Opening", render: (r) => qty(r.openingStock) }, { header: "Purchases", render: (r) => qty(r.purchasesIn) }, { header: "Sales", render: (r) => qty(r.salesOut) }, { header: "Customer Returns", render: (r) => qty(r.returnsIn) }, { header: "Supplier Returns", render: (r) => qty(r.purchaseReturnsOut) }, { header: "Adjustments", render: (r) => qty(r.adjustmentsNet) }, { header: "Transfers In/Out", render: (r) => `${qty(r.transfersIn)} / ${qty(r.transfersOut)}` }, { header: "Processing In/Out", render: (r) => `${qty(r.processingIn)} / ${qty(r.processingOut)}` }, { header: "Closing", render: (r) => <span className={`font-black ${Number(r.closingStock) < 0 ? "text-red-700" : "text-blue-700"}`}>{qty(r.closingStock)}</span> }]} data={rows} onRowClick={openItem} getRowKey={(r) => r.itemId} /></Card>
  </div>;
}
