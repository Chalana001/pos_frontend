import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, CheckCircle2, Clock3, Package } from "lucide-react";

import Card from "../common/Card";
import Table from "../common/Table";

const statusMeta = {
  ALL: { label: "All transfers", className: "bg-slate-100 text-slate-700" },
  IN_TRANSIT: { label: "In Transit", className: "bg-amber-100 text-amber-700" },
  COMPLETED: { label: "Completed", className: "bg-emerald-100 text-emerald-700" },
  CANCELED: { label: "Canceled", className: "bg-red-100 text-red-700" },
};

const filterOptions = [
  { value: "ALL", label: "All" },
  { value: "OPEN", label: "Pending" },
  { value: "IN_TRANSIT", label: "In Transit" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELED", label: "Canceled" },
];

const formatQty = (value) => {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "-";
  return Number.isInteger(numeric) ? numeric.toLocaleString() : numeric.toFixed(3).replace(/\.?0+$/, "");
};

const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : "-");

const getItemQuantity = (items) =>
  (Array.isArray(items) ? items : []).reduce((sum, item) => sum + Number(item?.quantity || 0), 0);

function Metric({ title, value, helper, icon: Icon, tone }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">{title}</p>
          <p className={`mt-2 text-xl font-black ${tone}`}>{Number(value || 0).toLocaleString()}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p>
        </div>
        <Icon size={20} className={tone} />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const meta = statusMeta[status] || { label: status || "Unknown", className: "bg-slate-100 text-slate-700" };
  return <span className={`rounded-full px-2 py-1 text-xs font-bold ${meta.className}`}>{meta.label}</span>;
}

export default function StockTransferReportView({ data, pageData }) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("ALL");

  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const filteredRows = useMemo(() => {
    if (statusFilter === "ALL") return rows;
    if (statusFilter === "OPEN") return rows.filter((row) => row.status === "IN_TRANSIT");
    return rows.filter((row) => (row.status || "IN_TRANSIT") === statusFilter);
  }, [rows, statusFilter]);

  const metrics = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const rowQty = getItemQuantity(row.items);
        const status = row.status || "IN_TRANSIT";

        acc.totalTransfers += 1;
        acc.totalQty += rowQty;

        if (status === "IN_TRANSIT") {
          acc.pendingTransfers += 1;
          acc.pendingQty += rowQty;
        }

        if (status === "IN_TRANSIT") {
          acc.inTransitTransfers += 1;
          acc.inTransitQty += rowQty;
        }

        if (status === "COMPLETED") {
          acc.completedTransfers += 1;
          acc.completedQty += rowQty;
        }

        return acc;
      },
      {
        totalTransfers: 0,
        totalQty: 0,
        pendingTransfers: 0,
        pendingQty: 0,
        inTransitTransfers: 0,
        inTransitQty: 0,
        completedTransfers: 0,
        completedQty: 0,
      }
    );
  }, [rows]);

  const statusCounts = useMemo(
    () =>
      rows.reduce(
        (counts, row) => {
          const status = row.status || "IN_TRANSIT";
          counts.ALL += 1;
          counts[status] = (counts[status] || 0) + 1;
          if (status === "IN_TRANSIT") counts.OPEN += 1;
          return counts;
        },
        { ALL: 0, OPEN: 0 }
      ),
    [rows]
  );

  const openTransfer = () => {
    navigate('/stock/transfers');
  };

  const quantityLabel = pageData?.totalElements > 0 ? `${formatQty(metrics.totalQty)} units on this page` : "No quantities available";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          title="Total Transfers"
          value={metrics.totalTransfers}
          helper={`${quantityLabel} | ${pageData?.totalElements || 0} total matching records`}
          icon={ArrowLeftRight}
          tone="text-blue-700"
        />
        <Metric title="Pending" value={metrics.pendingTransfers} helper={`${formatQty(metrics.pendingQty)} units still open`} icon={Clock3} tone="text-amber-700" />
        <Metric title="In Transit" value={metrics.inTransitTransfers} helper={`${formatQty(metrics.inTransitQty)} units moving now`} icon={Package} tone="text-violet-700" />
        <Metric title="Completed" value={metrics.completedTransfers} helper={`${formatQty(metrics.completedQty)} units received`} icon={CheckCircle2} tone="text-emerald-700" />
      </div>

      <Card className="admin-panel-card overflow-hidden p-0" title="Stock Transfer Activity">
        <div className="border-b border-slate-100 bg-slate-50/60 p-4">
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((option) => {
              const active = statusFilter === option.value;
              const count = statusCounts[option.value] || 0;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatusFilter(option.value)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition-colors ${
                    active ? "border-blue-200 bg-blue-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{option.label}</span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {filteredRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
              No transfers match the selected filter.
            </div>
          ) : (
            filteredRows.map((row) => {
              const itemQty = getItemQuantity(row.items);

              return (
                <button key={row.transferNo} type="button" onClick={() => openTransfer(row)} className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-black text-slate-900">{row.transferNo}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {row.fromBranchName || "-"} to {row.toBranchName || "-"}
                      </p>
                    </div>
                    <StatusBadge status={row.status} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Requested</p>
                      <p className="mt-1 font-bold text-slate-900">{formatDateTime(row.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Items</p>
                      <p className="mt-1 font-bold text-slate-900">
                        {Number(row.items?.length || 0).toLocaleString()} / {formatQty(itemQty)} units
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-slate-500">
                    <p>Created by: {row.createdByUsername || "-"}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="hidden md:block">
          <Table
            columns={[
              { header: "Requested At", render: (row) => formatDateTime(row.createdAt) },
              { header: "Transfer No", accessor: "transferNo" },
              { header: "From Branch", accessor: "fromBranchName" },
              { header: "To Branch", accessor: "toBranchName" },
              { header: "Status", render: (row) => <StatusBadge status={row.status} /> },
              { header: "Items", render: (row) => Number(row.items?.length || 0).toLocaleString() },
              { header: "Quantity", render: (row) => formatQty(getItemQuantity(row.items)) },
              { header: "Created By", render: (row) => row.createdByUsername || "-" },
            ]}
            data={filteredRows}
            onRowClick={openTransfer}
            getRowKey={(row) => row.transferNo}
          />
        </div>
      </Card>
    </div>
  );
}
