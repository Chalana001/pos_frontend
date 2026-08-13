import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Package, UserRound } from "lucide-react";
import api from "../api/axios";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Table from "../components/common/Table";
import LoadingSpinner from "../components/common/LoadingSpinner";

const statusMeta = {
  IN_TRANSIT: { label: "In Transit", className: "bg-amber-100 text-amber-700" },
  COMPLETED: { label: "Completed", className: "bg-emerald-100 text-emerald-700" },
  CANCELED: { label: "Canceled", className: "bg-red-100 text-red-700" },
};

const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : "-");

const formatQty = (value) => {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "-";
  return Number.isInteger(numeric) ? numeric.toLocaleString() : numeric.toFixed(3).replace(/\.?0+$/, "");
};

function StatusBadge({ status }) {
  const meta = statusMeta[status] || { label: status || "Unknown", className: "bg-slate-100 text-slate-700" };
  return <span className={`rounded-full px-2 py-1 text-xs font-bold ${meta.className}`}>{meta.label}</span>;
}

function Metric({ title, value, helper, icon: Icon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-slate-500">{title}</p>
          <p className="mt-2 text-lg font-black text-slate-900">{value}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p>
        </div>
        <Icon size={18} className="text-slate-500" />
      </div>
    </div>
  );
}

export default function StockTransferDetailsPage() {
  const { transferNo } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transfer, setTransfer] = useState(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/stock-transfers/details/${transferNo}`);
        if (active) setTransfer(response.data || null);
      } catch (error) {
        console.error("Failed to load stock transfer details", error);
        if (active) setTransfer(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [transferNo]);

  const items = useMemo(() => (Array.isArray(transfer?.items) ? transfer.items : []), [transfer]);
  const totalQty = useMemo(() => items.reduce((sum, item) => sum + Number(item.qty ?? item.quantity ?? 0), 0), [items]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingSpinner size="lg" text="Loading transfer details..." />
      </div>
    );
  }

  if (!transfer) {
    return (
      <div className="page-enter space-y-4">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} className="mr-2" /> Back
        </Button>
        <Card className="p-6 text-center text-sm text-slate-500">Transfer record not found.</Card>
      </div>
    );
  }

  return (
    <div className="page-enter space-y-6 pb-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} className="mr-2" /> Back
          </Button>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-800">Stock Transfer Details</h1>
          <p className="mt-1 text-sm text-slate-500">{transfer.transferNo}</p>
        </div>
        <StatusBadge status={transfer.status} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Transfer No" value={transfer.transferNo || "-"} helper="Reference number" icon={Package} />
        <Metric title="Requested" value={formatDateTime(transfer.requestedAt)} helper="Created time" icon={CalendarDays} />
        <Metric title="Requested By" value={transfer.requestedByUserName || "-"} helper="Source user" icon={UserRound} />
        <Metric title="Quantity" value={formatQty(totalQty)} helper={`${items.length.toLocaleString()} item lines`} icon={Package} />
      </div>

      <Card className="admin-panel-card overflow-hidden p-0" title="Transfer Summary">
        <div className="grid gap-4 border-b border-slate-100 p-4 md:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">From Branch</p>
            <p className="mt-2 font-black text-slate-900">{transfer.fromBranchName || "-"}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">To Branch</p>
            <p className="mt-2 font-black text-slate-900">{transfer.toBranchName || "-"}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Received By</p>
            <p className="mt-2 font-black text-slate-900">{transfer.receivedByUserName || "-"}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-slate-500">Cancel Reason</p>
            <p className="mt-2 font-black text-slate-900">{transfer.cancelReason || "-"}</p>
          </div>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
              No transfer items found.
            </div>
          ) : (
            items.map((item) => (
              <div key={item.itemId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-900">{item.itemName}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.barcode || "No barcode"}</p>
                  </div>
                  <p className="font-black text-blue-700">{formatQty(item.qty ?? item.quantity)}</p>
                </div>
                <p className="mt-3 text-xs text-slate-500">{item.qtyUnit || item.unit || "Unitless"}</p>
              </div>
            ))
          )}
        </div>

        <div className="hidden md:block">
          <Table
            columns={[
              { header: "Item", render: (row) => <div><p className="font-bold text-slate-900">{row.itemName}</p><p className="text-xs text-slate-500">{row.barcode || "No barcode"}</p></div> },
              { header: "Quantity", render: (row) => formatQty(row.qty ?? row.quantity) },
              { header: "Unit", render: (row) => row.qtyUnit || row.unit || "-" },
            ]}
            data={items}
            getRowKey={(row) => row.itemId}
          />
        </div>
      </Card>
    </div>
  );
}
