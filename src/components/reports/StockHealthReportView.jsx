import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Clock, Package, TrendingDown, TrendingUp } from "lucide-react";

import Card from "../common/Card";
import Table from "../common/Table";
import ClientPagination from "../common/ClientPagination";
import { formatCurrency } from "../../utils/formatters";
import { tileTone } from "../../utils/chartTheme";
import useClientPagination from "../../hooks/useClientPagination";

const formatQty = (value) => {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "-";
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(3).replace(/\.?0+$/, "");
};

const formatQtyWithUnit = (value, unit) => (unit ? `${formatQty(value)} ${unit}` : formatQty(value));

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "-");
const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : "-");

const statusMeta = {
  HEALTHY: { label: "Healthy", className: "bg-emerald-100 text-emerald-700" },
  LOW_STOCK: { label: "Low stock", className: "bg-amber-100 text-amber-700" },
  OUT_OF_STOCK: { label: "Out of stock", className: "bg-red-100 text-red-700" },
  NEGATIVE: { label: "Negative", className: "bg-red-100 text-red-700" },
  EXPIRING_SOON: { label: "Expiring soon", className: "bg-amber-100 text-amber-700" },
  EXPIRED: { label: "Expired", className: "bg-red-100 text-red-700" },
  DEAD_STOCK: { label: "Dead stock", className: "bg-slate-100 text-slate-700" },
  BELOW_COST: { label: "Below cost", className: "bg-amber-100 text-amber-700" },
  MISSING_COST: { label: "Missing cost", className: "bg-slate-100 text-slate-700" },
};

const statusOptions = [
  { value: "ALL", label: "All" },
  { value: "HEALTHY", label: "Healthy" },
  { value: "LOW_STOCK", label: "Low stock" },
  { value: "OUT_OF_STOCK", label: "Out of stock" },
  { value: "NEGATIVE", label: "Negative" },
  { value: "EXPIRING_SOON", label: "Expiring soon" },
  { value: "EXPIRED", label: "Expired" },
  { value: "DEAD_STOCK", label: "Dead stock" },
  { value: "BELOW_COST", label: "Below cost" },
  { value: "MISSING_COST", label: "Missing cost" },
];

function Metric({ title, value, helper, icon: Icon, tone, format = (input) => input }) {
  const role = tileTone(tone);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">{title}</p>
          <p className={`mt-2 text-xl font-black ${role.value}`}>{format(value)}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p>
        </div>
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${role.chip}`}>
          <Icon size={18} />
        </span>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const meta = statusMeta[status] || { label: status || "Unknown", className: "bg-slate-100 text-slate-700" };
  return <span className={`rounded-full px-2 py-1 text-xs font-bold ${meta.className}`}>{meta.label}</span>;
}

export default function StockHealthReportView({ summary, data }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState("ALL");

  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const filteredRows = useMemo(() => {
    const matches = status === "ALL" ? rows : rows.filter((row) => (row.status || "HEALTHY") === status);
    return [...matches].sort((a, b) => Number(b.estimatedReorderCost || 0) - Number(a.estimatedReorderCost || 0));
  }, [rows, status]);
  const pagination = useClientPagination(filteredRows, status);

  const statusCounts = useMemo(
    () =>
      rows.reduce(
        (counts, row) => {
          const key = row.status || "HEALTHY";
          counts.ALL += 1;
          counts[key] = (counts[key] || 0) + 1;
          return counts;
        },
        { ALL: 0 }
      ),
    [rows]
  );

  const openItem = (row) => {
    if (row?.itemId == null) return;
    if (Number(row.currentQuantity || 0) <= 0) {
      navigate(`/stock?search=${encodeURIComponent(row.barcode || row.itemName || "")}`);
      return;
    }
    navigate(`/stock/item/${row.itemId}`);
  };

  const targetCoverLabel = summary
    ? `Target cover assumes ${Number(summary.targetCoverDays || 14)} days of demand from ${Number(summary.salesWindowDays || 90)} days of sales history.`
    : "Target cover assumptions will appear after the report loads.";

  // Stock health is one of the few report surfaces where most tiles genuinely
  // carry a state, so warning/critical are used deliberately here. The two that
  // are just figures (dead stock value, reorder cost) stay neutral.
  const metrics = [
    { title: "Total Items", value: summary?.totalItems || 0, helper: `Sales window ${summary?.salesWindowDays || 90} days`, icon: Package, tone: "accent", format: (value) => Number(value || 0).toLocaleString() },
    { title: "Below Reorder", value: summary?.belowReorderItems || 0, helper: "Qty on hand <= reorder level", icon: TrendingDown, tone: "warning", format: (value) => Number(value || 0).toLocaleString() },
    { title: "Out of Stock", value: summary?.outOfStockItems || 0, helper: "Zero stock items", icon: AlertCircle, tone: "critical", format: (value) => Number(value || 0).toLocaleString() },
    { title: "Negative Stock", value: summary?.negativeStockItems || 0, helper: "Stock below zero", icon: AlertCircle, tone: "critical", format: (value) => Number(value || 0).toLocaleString() },
    { title: "Dead Stock Value", value: summary?.deadStockValue || 0, helper: "No sales in the last 90 days", icon: Package, tone: "neutral", format: (value) => formatCurrency(value) },
    { title: "Estimated Reorder Cost", value: summary?.estimatedReorderCost || 0, helper: "To reach target cover", icon: TrendingUp, tone: "neutral", format: (value) => formatCurrency(value) },
    { title: "Items Expiring Soon", value: summary?.itemsExpiringSoon || 0, helper: "Nearest stock expires within 30 days", icon: Clock, tone: "warning", format: (value) => Number(value || 0).toLocaleString() },
    { title: "Items With Expired Stock", value: summary?.itemsWithExpiredStock || 0, helper: "Nearest positive stock is expired", icon: AlertCircle, tone: "critical", format: (value) => Number(value || 0).toLocaleString() },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Metric key={metric.title} {...metric} />
        ))}
      </div>

      <Card className="admin-panel-card overflow-hidden p-0" title="Stock Health Items">
        <div className="border-b border-slate-100 bg-slate-50/60 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">Status filter</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{targetCoverLabel}</p>
            </div>
            <p className="text-xs font-semibold text-slate-500">{filteredRows.length} matching items ordered by reorder cost</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {statusOptions.map((option) => {
              const active = status === option.value;
              const count = statusCounts[option.value] || 0;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatus(option.value)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition-colors ${
                    active ? "border-blue-200 bg-blue-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{option.label}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-xs ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {filteredRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
              No items match the selected status.
            </div>
          ) : (
            pagination.pageItems.map((row) => (
              <button key={row.itemId} type="button" onClick={() => openItem(row)} className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-900">{row.itemName}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.barcode || "No barcode"} · {row.unit || "Unitless"}</p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs font-semibold text-slate-500">On hand</p><p className="mt-1 font-bold text-slate-900">{formatQtyWithUnit(row.qtyOnHand, row.unit)}</p></div>
                  <div><p className="text-xs font-semibold text-slate-500">Reorder level</p><p className="mt-1 font-bold text-slate-900">{formatQtyWithUnit(row.reorderLevel, row.unit)}</p></div>
                  <div><p className="text-xs font-semibold text-slate-500">Sold 90 days</p><p className="mt-1 font-bold text-slate-900">{formatQtyWithUnit(row.soldLast90Days, row.unit)}</p></div>
                  <div><p className="text-xs font-semibold text-slate-500">Avg daily</p><p className="mt-1 font-bold text-slate-900">{formatQtyWithUnit(row.averageDailySales, row.unit)}</p></div>
                  <div><p className="text-xs font-semibold text-slate-500">Days of stock</p><p className="mt-1 font-bold text-slate-900">{row.estimatedDaysOfStock == null ? "-" : Number(row.estimatedDaysOfStock).toFixed(1)}</p></div>
                  <div><p className="text-xs font-semibold text-slate-500">Suggested reorder</p><p className="mt-1 font-bold text-emerald-700">{formatQtyWithUnit(row.suggestedReorderQty, row.unit)}</p></div>
                  <div><p className="text-xs font-semibold text-slate-500">Reorder cost</p><p className="mt-1 font-bold text-slate-900">{formatCurrency(row.estimatedReorderCost)}</p></div>
                  <div><p className="text-xs font-semibold text-slate-500">Last sold</p><p className="mt-1 font-bold text-slate-900">{formatDateTime(row.lastSoldAt)}</p></div>
                </div>

                <div className="mt-4 text-xs text-slate-500">
                  <p>Preferred supplier: {row.preferredSupplier || "-"}</p>
                  <p className="mt-1">Nearest expiry: {formatDate(row.nearestExpiryDate)}</p>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="hidden md:block">
          <Table
            columns={[
              { header: "Item", render: (row) => <div><p className="font-bold text-slate-900">{row.itemName}</p><p className="text-xs text-slate-500">{row.barcode || "No barcode"} · {row.unit || "Unitless"}</p></div> },
              { header: "Status", render: (row) => <StatusBadge status={row.status} /> },
              { header: "Stock Position", render: (row) => <div><p className="font-bold text-slate-900">{formatQtyWithUnit(row.qtyOnHand, row.unit)}</p><p className="text-xs text-slate-500">Reorder {formatQtyWithUnit(row.reorderLevel, row.unit)}</p></div> },
              { header: "Demand", render: (row) => <div><p className="font-bold text-slate-900">{formatQtyWithUnit(row.soldLast90Days, row.unit)}</p><p className="text-xs text-slate-500">Avg {formatQtyWithUnit(row.averageDailySales, row.unit)} / day</p></div> },
              { header: "Coverage", render: (row) => (row.estimatedDaysOfStock == null ? "-" : Number(row.estimatedDaysOfStock).toFixed(1)) },
              { header: "Suggested Reorder", render: (row) => <span className="font-bold text-emerald-700">{formatQtyWithUnit(row.suggestedReorderQty, row.unit)}</span> },
              { header: "Reorder Cost", render: (row) => <span className="font-bold text-slate-900">{formatCurrency(row.estimatedReorderCost)}</span> },
              { header: "Supplier / Expiry", render: (row) => <div><p className="font-semibold text-slate-900">{row.preferredSupplier || "-"}</p><p className="text-xs text-slate-500">{formatDate(row.nearestExpiryDate)}</p></div> },
              { header: "Last Sold", render: (row) => <span className="text-slate-700">{formatDateTime(row.lastSoldAt)}</span> },
            ]}
            data={pagination.pageItems}
            onRowClick={openItem}
            getRowKey={(row) => row.itemId}
          />
        </div>
        <ClientPagination page={pagination.page} pageSize={pagination.pageSize} totalItems={filteredRows.length} totalPages={pagination.totalPages} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} />
      </Card>
    </div>
  );
}
