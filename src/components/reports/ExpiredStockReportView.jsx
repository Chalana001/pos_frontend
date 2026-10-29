import { useMemo } from "react";
import { AlertTriangle, CalendarClock, Clock, Package, Search } from "lucide-react";

import Card from "../common/Card";
import Table from "../common/Table";
import { formatCurrency } from "../../utils/formatters";
import { tileTone } from "../../utils/chartTheme";

const expiryStatusMeta = {
  EXPIRED: { label: "Expired", className: "bg-danger-soft text-danger" },
  EXPIRING_SOON: { label: "Expiring soon", className: "bg-warning-soft text-warning" },
  NOT_EXPIRED: { label: "Not expired", className: "bg-success-soft text-success" },
  MISSING_EXPIRY: { label: "Missing expiry", className: "bg-slate-100 text-slate-700" },
};

const statusOptions = [
  { value: "ALL", label: "All" },
  { value: "EXPIRED", label: "Expired" },
  { value: "EXPIRING_SOON", label: "Expiring soon" },
  { value: "NOT_EXPIRED", label: "Not expired" },
  { value: "MISSING_EXPIRY", label: "Missing expiry" },
];

const formatQty = (value) => {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "-";
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(3).replace(/\.?0+$/, "");
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "-");

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
  const meta = expiryStatusMeta[status] || { label: status || "Unknown", className: "bg-slate-100 text-slate-700" };
  return <span className={`rounded-full px-2 py-1 text-xs font-bold ${meta.className}`}>{meta.label}</span>;
}

/**
 * Batch-level expiry report. The response is already server-side paginated and
 * filtered; this view adds only the status/zero-quantity presentation options
 * on top of the fetched slice. summary tiles come from the response itself.
 */
export default function ExpiredStockReportView({ summary, data, options, onRefresh, onExport }) {
  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const windowLabel = summary
    ? `Expiring soon = today through ${formatDate(summary.cutoffDate)} (${Number(summary.expiryAlertMonths || 2)} calendar months).`
    : "Expiry window appears after the report loads.";

  const metrics = [
    { title: "Affected Items", value: summary?.summary?.affectedItems || 0, helper: "Items with positive stock batches", icon: Package, tone: "accent", format: (value) => Number(value || 0).toLocaleString() },
    { title: "Expired Batches", value: summary?.summary?.expiredBatches || 0, helper: `Quantity ${Number(summary?.summary?.expiredQuantity || 0).toLocaleString()}`, icon: AlertTriangle, tone: "critical", format: (value) => Number(value || 0).toLocaleString() },
    { title: "Expired Cost Value", value: summary?.summary?.expiredCostValue || 0, helper: "Batch quantity × batch cost", icon: AlertTriangle, tone: "critical", format: (value) => formatCurrency(value) },
    { title: "Expiring-Soon Batches", value: summary?.summary?.upcomingBatches || 0, helper: `Quantity ${Number(summary?.summary?.upcomingQuantity || 0).toLocaleString()}`, icon: Clock, tone: "warning", format: (value) => Number(value || 0).toLocaleString() },
    { title: "Expiring-Soon Cost Value", value: summary?.summary?.upcomingCostValue || 0, helper: "Value inside the alert window", icon: CalendarClock, tone: "warning", format: (value) => formatCurrency(value) },
    { title: "Missing-Expiry Batches", value: summary?.summary?.missingExpiryBatches || 0, helper: `Quantity ${Number(summary?.summary?.missingExpiryQuantity || 0).toLocaleString()}`, icon: Package, tone: "neutral", format: (value) => Number(value || 0).toLocaleString() },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <Metric key={metric.title} {...metric} />
        ))}
      </div>

      <Card className="admin-panel-card overflow-hidden p-0" title="Expiry Batches">
        <div className="border-b border-slate-100 bg-slate-50/60 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">{summary ? `${Number(summary.totalElements || 0).toLocaleString()} batches` : "Batches"}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{windowLabel}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {statusOptions.map((option) => {
                const active = (options?.expiryStatus || "ALL") === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => options?.onExpiryStatusChange?.(option.value)}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition-colors ${
                      active ? "border-slate-200 bg-accent text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{option.label}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => options?.onIncludeZeroChange?.(!options?.includeZeroQuantity)}
                className={`inline-flex items-center rounded-full border px-3 py-2 text-xs font-bold transition-colors ${
                  options?.includeZeroQuantity ? "border-slate-200 bg-accent text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Include zero-qty
              </button>
              {onRefresh && (
                <button type="button" onClick={onRefresh} className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
                  Refresh
                </button>
              )}
              {onExport && (
                <button type="button" onClick={onExport} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
                  <Search size={12} /> Export
                </button>
              )}
            </div>
          </div>
          {options?.search !== undefined && (
            <p className="mt-3 text-xs font-semibold text-slate-500">
              Filters apply server-side; summary tiles reflect the branch's active stock as a whole.
            </p>
          )}
        </div>

        <div className="hidden md:block">
          <Table
            columns={[
              { header: "Item", render: (row) => <div><p className="font-bold text-slate-900">{row.itemName}</p><p className="text-xs text-slate-500">{row.barcode || "No barcode"}, {row.unit || "Unitless"}</p></div> },
              { header: "Batch", render: (row) => <div><p className="font-semibold text-slate-900">{row.batchCode || `Batch #${row.batchId}`}</p><p className="text-xs text-slate-500">{row.branchName || "-"}</p></div> },
              { header: "Status", render: (row) => <StatusBadge status={row.expiryStatus} /> },
              { header: "Expiry", render: (row) => <div><p className="font-semibold text-slate-900">{formatDate(row.expireDate)}</p><p className="text-xs text-slate-500">{row.daysPastExpiry != null ? `${row.daysPastExpiry} days past` : row.daysToExpiry != null ? `${row.daysToExpiry} days left` : "-"}</p></div> },
              { header: "Quantity", render: (row) => <span className="font-bold text-slate-900">{formatQty(row.displayQuantity)}</span> },
              { header: "Unit Cost", render: (row) => <span className="text-slate-700">{formatCurrency(row.costPrice)}</span> },
              { header: "Value", render: (row) => <span className="font-bold text-slate-900">{formatCurrency(row.estimatedCostValue)}</span> },
              { header: "Supplier / GRN", render: (row) => <div><p className="font-semibold text-slate-900">{row.supplierName || "-"}</p><p className="text-xs text-slate-500">{row.grnNo ? `GRN ${row.grnNo}` : row.sourceType || "-"}</p></div> },
            ]}
            data={rows}
            getRowKey={(row) => row.batchId}
            emptyMessage="No batches match the selected expiry filters."
          />
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
              No batches match the selected expiry filters.
            </div>
          ) : (
            rows.map((row) => (
              <div key={row.batchId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-900">{row.itemName}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.batchCode || `Batch #${row.batchId}`}, {row.branchName || "-"}</p>
                  </div>
                  <StatusBadge status={row.expiryStatus} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs font-semibold text-slate-500">Expiry</p><p className="mt-1 font-bold text-slate-900">{formatDate(row.expireDate)}</p></div>
                  <div><p className="text-xs font-semibold text-slate-500">{row.daysPastExpiry != null ? "Days past" : "Days left"}</p><p className="mt-1 font-bold text-slate-900">{row.daysPastExpiry ?? row.daysToExpiry ?? "-"}</p></div>
                  <div><p className="text-xs font-semibold text-slate-500">Quantity</p><p className="mt-1 font-bold text-slate-900">{formatQty(row.displayQuantity)}</p></div>
                  <div><p className="text-xs font-semibold text-slate-500">Value</p><p className="mt-1 font-bold text-slate-900">{formatCurrency(row.estimatedCostValue)}</p></div>
                </div>
                <div className="mt-4 text-xs text-slate-500">
                  <p>Supplier: {row.supplierName || "-"}</p>
                  <p className="mt-1">{row.grnNo ? `GRN ${row.grnNo}` : row.sourceType || "-"}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {summary?.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 p-4 text-sm font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => options?.onPageChange?.(Math.max(0, Number(summary.page || 0) - 1))}
              disabled={!summary?.first}
              className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
            >
              Previous
            </button>
            <p>Page {Number(summary.page || 0) + 1} of {Number(summary.totalPages || 1)}</p>
            <button
              type="button"
              onClick={() => options?.onPageChange?.(Math.min(Number(summary.totalPages || 1) - 1, Number(summary.page || 0) + 1))}
              disabled={summary?.last}
              className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
