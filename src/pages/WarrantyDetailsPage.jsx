import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, ClipboardPlus, ReceiptText, ShieldCheck, User, Wrench } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import { warrantiesAPI } from "../api/warranties.api";
import { salesAPI } from "../api/sales.api";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import CustomSelect from "../components/common/CustomSelect";
import { formatCurrency, formatDate, formatDateTime, formatQuantityWithUnit } from "../utils/formatters";

const getStatusClassName = (status) => {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-200 bg-emerald-100 text-emerald-700";
    case "EXPIRED":
      return "border-amber-200 bg-amber-100 text-amber-700";
    case "CLAIMED":
      return "border-blue-200 bg-blue-100 text-blue-700";
    case "VOID":
      return "border-slate-200 bg-slate-100 text-slate-600";
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
};

const claimActionOptions = [
  { id: "REPAIR", name: "Repair" },
  { id: "REPLACE", name: "Replace" },
];

const claimStatusOptions = [
  { id: "IN_PROGRESS", name: "In Progress" },
  { id: "COMPLETED", name: "Completed" },
  { id: "REJECTED", name: "Rejected" },
  { id: "CANCELED", name: "Canceled" },
];

const getClaimStatusClassName = (status) => {
  switch (status) {
    case "OPEN":
      return "border-blue-200 bg-blue-100 text-blue-700";
    case "IN_PROGRESS":
      return "border-violet-200 bg-violet-100 text-violet-700";
    case "COMPLETED":
      return "border-emerald-200 bg-emerald-100 text-emerald-700";
    case "REJECTED":
      return "border-rose-200 bg-rose-100 text-rose-700";
    case "CANCELED":
      return "border-slate-200 bg-slate-100 text-slate-600";
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
};

const WarrantyDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [warranty, setWarranty] = useState(null);
  const [sale, setSale] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showClaimUpdateModal, setShowClaimUpdateModal] = useState(false);
  const [claimActionType, setClaimActionType] = useState("REPAIR");
  const [claimIssue, setClaimIssue] = useState("");
  const [claimStatus, setClaimStatus] = useState("IN_PROGRESS");
  const [claimResolutionNote, setClaimResolutionNote] = useState("");
  const [submittingClaim, setSubmittingClaim] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const warrantyResponse = await warrantiesAPI.getById(id);
        setWarranty(warrantyResponse.data);
        const [saleResponse, claimResponse] = await Promise.all([
          salesAPI.getById(warrantyResponse.data.invoiceNo),
          warrantiesAPI.listClaims(id),
        ]);
        setSale(saleResponse.data);
        setClaims(claimResponse.data || []);
      } catch (error) {
        console.error("Failed to load warranty details", error);
        setWarranty(null);
        setSale(null);
        setClaims([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const activeClaim = useMemo(
    () => claims.find((claim) => claim.status === "OPEN" || claim.status === "IN_PROGRESS"),
    [claims]
  );

  const canOpenClaim = warranty?.status === "ACTIVE" && !activeClaim;

  const reloadWarrantyAndClaims = async () => {
    const [warrantyResponse, claimResponse] = await Promise.all([
      warrantiesAPI.getById(id),
      warrantiesAPI.listClaims(id),
    ]);
    setWarranty(warrantyResponse.data);
    setClaims(claimResponse.data || []);
  };

  const openClaimModal = () => {
    setClaimActionType("REPAIR");
    setClaimIssue("");
    setShowClaimModal(true);
  };

  const createClaim = async () => {
    if (!claimIssue.trim()) {
      toast.error("Enter the customer issue first");
      return;
    }

    setSubmittingClaim(true);
    try {
      await warrantiesAPI.createClaim(id, {
        actionType: claimActionType,
        issueDescription: claimIssue.trim(),
      });
      await reloadWarrantyAndClaims();
      setShowClaimModal(false);
      toast.success("Warranty claim opened");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to open warranty claim");
    } finally {
      setSubmittingClaim(false);
    }
  };

  const openClaimUpdateModal = () => {
    setClaimStatus(activeClaim?.status === "OPEN" ? "IN_PROGRESS" : "COMPLETED");
    setClaimResolutionNote(activeClaim?.resolutionNote || "");
    setShowClaimUpdateModal(true);
  };

  const updateClaim = async () => {
    if (!activeClaim) {
      return;
    }

    setSubmittingClaim(true);
    try {
      await warrantiesAPI.updateClaim(id, activeClaim.id, {
        status: claimStatus,
        resolutionNote: claimResolutionNote.trim() || null,
      });
      await reloadWarrantyAndClaims();
      setShowClaimUpdateModal(false);
      toast.success("Warranty claim updated");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update warranty claim");
    } finally {
      setSubmittingClaim(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12">
        <LoadingSpinner size="lg" text="Loading warranty..." />
      </div>
    );
  }

  if (!warranty) {
    return <div className="p-10 text-center text-red-500">Warranty record not found.</div>;
  }

  return (
    <div className="page-enter space-y-6 pb-10">
      <div className="page-section-enter flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" style={{ animationDelay: "40ms" }}>
        <Button variant="secondary" onClick={() => navigate("/warranties")} className="w-fit">
          <ArrowLeft size={18} className="mr-2" /> Back to Warranties
        </Button>
        <div className="flex flex-wrap gap-3">
          {canOpenClaim ? (
            <Button onClick={openClaimModal} className="w-fit">
              <ClipboardPlus size={18} className="mr-2" /> Open Claim
            </Button>
          ) : null}
          {activeClaim ? (
            <Button onClick={openClaimUpdateModal} className="w-fit">
              <Wrench size={18} className="mr-2" /> Update Claim
            </Button>
          ) : null}
          <Button onClick={() => navigate(`/sales/${warranty.invoiceNo}`)} className="w-fit">
            <ReceiptText size={18} className="mr-2" /> Open Sale
          </Button>
        </div>
      </div>

      <Card className="sales-panel-enter sales-panel-hover p-6" style={{ animationDelay: "90ms" }}>
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <ShieldCheck size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">{warranty.warrantyNo}</h1>
                <div className="mt-1 text-sm text-slate-500">{warranty.itemName}</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${getStatusClassName(warranty.status)}`}>
                {warranty.status}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                {warranty.warrantyLabel}
              </span>
            </div>
          </div>

          <div className="grid min-w-[260px] gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Issued</span>
              <span className="font-semibold text-slate-700">{formatDate(warranty.startDate)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Expires</span>
              <span className="font-semibold text-slate-700">{formatDate(warranty.endDate)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-slate-500">Invoice</span>
              <span className="font-semibold text-slate-700">{warranty.invoiceNo}</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="sales-panel-enter p-6" style={{ animationDelay: "140ms" }}>
          <h2 className="mb-4 text-lg font-bold text-slate-800">Warranty Record</h2>
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <User size={18} className="mt-0.5 text-slate-400" />
              <div>
                <div className="text-slate-500">Customer</div>
                <div className="font-semibold text-slate-800">{warranty.customerName}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CalendarDays size={18} className="mt-0.5 text-slate-400" />
              <div>
                <div className="text-slate-500">Coverage</div>
                <div className="font-semibold text-slate-800">
                  {formatDate(warranty.startDate)} - {formatDate(warranty.endDate)}
                </div>
              </div>
            </div>
            <div>
              <div className="text-slate-500">Barcode</div>
              <div className="font-mono font-semibold text-slate-800">{warranty.barcode}</div>
            </div>
          </div>
        </Card>

        <Card className="sales-panel-enter p-6" style={{ animationDelay: "180ms" }}>
          <h2 className="mb-4 text-lg font-bold text-slate-800">Bill Summary</h2>
          {sale ? (
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <div className="text-slate-500">Invoice</div>
                <div className="font-semibold text-slate-800">{sale.invoiceNo}</div>
              </div>
              <div>
                <div className="text-slate-500">Date</div>
                <div className="font-semibold text-slate-800">{formatDateTime(sale.createdAt)}</div>
              </div>
              <div>
                <div className="text-slate-500">Payment</div>
                <div className="font-semibold text-slate-800">{sale.paymentMethod || sale.orderType}</div>
              </div>
              <div>
                <div className="text-slate-500">Grand Total</div>
                <div className="font-semibold text-slate-800">{formatCurrency(sale.grandTotal)}</div>
              </div>
              <div>
                <div className="text-slate-500">Paid</div>
                <div className="font-semibold text-emerald-700">{formatCurrency(sale.paidAmount)}</div>
              </div>
              <div>
                <div className="text-slate-500">Due</div>
                <div className={`font-semibold ${Number(sale.dueAmount || 0) > 0 ? "text-red-600" : "text-slate-800"}`}>
                  {formatCurrency(sale.dueAmount)}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500">Sale details unavailable.</div>
          )}
        </Card>
      </div>

      {sale?.items?.length ? (
        <Card className="sales-panel-enter overflow-hidden p-0" style={{ animationDelay: "220ms" }}>
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-lg font-bold text-slate-800">Bill Items</h2>
          </div>
          <div className="app-table-wrap">
            <table className="app-table min-w-[760px]">
              <thead className="app-table-head">
                <tr>
                  <th className="app-table-head-cell">Item</th>
                  <th className="app-table-head-cell">Barcode</th>
                  <th className="app-table-head-cell text-center">Qty</th>
                  <th className="app-table-head-cell text-right">Unit Price</th>
                  <th className="app-table-head-cell text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="app-table-body">
                {sale.items.map((item) => (
                  <tr key={`${item.itemId}-${item.batchId || "NA"}`}>
                    <td className="app-table-cell font-medium text-slate-800">{item.itemName}</td>
                    <td className="app-table-cell font-mono text-xs text-slate-500">{item.barcode}</td>
                    <td className="app-table-cell text-center">{formatQuantityWithUnit(item.qty, item.qtyUnit)}</td>
                    <td className="app-table-cell text-right">{formatCurrency(item.unitPrice)}</td>
                    <td className="app-table-cell text-right font-semibold">{formatCurrency(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <Card className="sales-panel-enter overflow-hidden p-0" style={{ animationDelay: "260ms" }}>
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-800">Claim History</h2>
        </div>
        <div className="app-table-wrap">
          <table className="app-table min-w-[980px]">
            <thead className="app-table-head">
              <tr>
                <th className="app-table-head-cell">Claim No</th>
                <th className="app-table-head-cell">Received</th>
                <th className="app-table-head-cell">Action</th>
                <th className="app-table-head-cell">Issue</th>
                <th className="app-table-head-cell">Resolution</th>
                <th className="app-table-head-cell">Closed</th>
                <th className="app-table-head-cell text-center">Status</th>
              </tr>
            </thead>
            <tbody className="app-table-body">
              {claims.length === 0 ? (
                <tr>
                  <td colSpan="7" className="app-table-empty">
                    No claims recorded for this warranty.
                  </td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <tr key={claim.id}>
                    <td className="app-table-cell font-semibold text-slate-800">{claim.claimNo}</td>
                    <td className="app-table-cell">{formatDateTime(claim.receivedAt)}</td>
                    <td className="app-table-cell">{claim.actionType}</td>
                    <td className="app-table-cell max-w-[260px] whitespace-normal">{claim.issueDescription}</td>
                    <td className="app-table-cell max-w-[260px] whitespace-normal">{claim.resolutionNote || "-"}</td>
                    <td className="app-table-cell">{claim.completedAt ? formatDateTime(claim.completedAt) : "-"}</td>
                    <td className="app-table-cell text-center">
                      <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${getClaimStatusClassName(claim.status)}`}>
                        {claim.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showClaimModal ? (
        <div className="modal-overlay-enter fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="shell-surface modal-panel-enter mx-4 w-full max-w-md rounded-2xl p-6">
            <div className="mb-4 flex items-center gap-3 text-blue-600">
              <div className="rounded-full bg-blue-50 p-2">
                <ClipboardPlus size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-800">Open Warranty Claim</h3>
            </div>

            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Action</label>
            <CustomSelect
              value={claimActionType}
              onChange={setClaimActionType}
              options={claimActionOptions}
              className="mb-4"
            />

            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Customer Issue</label>
            <textarea
              rows="4"
              value={claimIssue}
              onChange={(event) => setClaimIssue(event.target.value)}
              className="mb-6 w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the problem reported by the customer"
              autoFocus
            />

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowClaimModal(false)} disabled={submittingClaim}>
                Cancel
              </Button>
              <Button onClick={createClaim} disabled={submittingClaim}>
                {submittingClaim ? "Saving..." : "Open Claim"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {showClaimUpdateModal && activeClaim ? (
        <div className="modal-overlay-enter fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="shell-surface modal-panel-enter mx-4 w-full max-w-md rounded-2xl p-6">
            <div className="mb-4 flex items-center gap-3 text-blue-600">
              <div className="rounded-full bg-blue-50 p-2">
                <Wrench size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Update Claim</h3>
                <p className="text-sm text-slate-500">{activeClaim.claimNo}</p>
              </div>
            </div>

            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Status</label>
            <CustomSelect
              value={claimStatus}
              onChange={setClaimStatus}
              options={claimStatusOptions}
              className="mb-4"
            />

            <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Resolution Note</label>
            <textarea
              rows="4"
              value={claimResolutionNote}
              onChange={(event) => setClaimResolutionNote(event.target.value)}
              className="mb-6 w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-blue-500"
              placeholder="Repair note, replacement note, or rejection reason"
            />

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowClaimUpdateModal(false)} disabled={submittingClaim}>
                Cancel
              </Button>
              <Button onClick={updateClaim} disabled={submittingClaim}>
                {submittingClaim ? "Saving..." : "Save Update"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default WarrantyDetailsPage;
