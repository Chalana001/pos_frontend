import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Building2, Calendar, ChevronRight, CreditCard, Landmark, Mail, Phone, Truck, UserRound } from "lucide-react";
import { toast } from "react-hot-toast";

import { purchasesAPI } from "../api/purchases.api";
import { suppliersAPI } from "../api/suppliers.api";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { formatCurrency, formatDateTime } from "../utils/formatters";

const SupplierViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [supplierResponse, purchasesResponse] = await Promise.all([
        suppliersAPI.getById(id),
        purchasesAPI.list({ supplierId: id, page: 0, size: 50 }),
      ]);
      setSupplier(supplierResponse.data);
      setPurchases(purchasesResponse.data?.content || []);
    } catch (error) {
      console.error("Failed to load supplier", error);
      toast.error("Failed to load supplier");
      navigate("/suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading && !supplier) {
    return (
      <div className="py-12">
        <LoadingSpinner size="lg" text="Loading supplier..." />
      </div>
    );
  }

  const bankDetails = supplier?.bankDetails || {};
  const hasBankDetails = [
    bankDetails.bankName,
    bankDetails.branchName,
    bankDetails.accountNumber,
    bankDetails.accountName,
  ].some((value) => String(value || "").trim());

  return (
    <div className="page-enter space-y-6 pb-10">
      <div className="page-section-enter flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" style={{ animationDelay: "40ms" }}>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Supplier Profile</h1>
          <p className="mt-1 text-sm text-slate-500">Supplier payable balance and purchase invoices.</p>
        </div>
        <Button variant="secondary" onClick={() => navigate("/suppliers")} className="w-full justify-center sm:w-auto">
          <ArrowLeft size={18} className="mr-2" /> Back
        </Button>
      </div>

      <Card className="sales-panel-enter p-6" style={{ animationDelay: "90ms" }}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="page-section-enter flex gap-4" style={{ animationDelay: "130ms" }}>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Truck size={28} />
            </div>
            <div>
              <div className="text-xs text-slate-500">Supplier ID: {id}</div>
              <div className="mt-1 text-2xl font-bold text-slate-800">{supplier?.name || "-"}</div>
              <div className="mt-3 flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:gap-5">
                <span className="inline-flex items-center gap-2">
                  <Phone size={15} /> {supplier?.phone || "-"}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Mail size={15} /> {supplier?.email || "-"}
                </span>
              </div>
              <div className="mt-3 max-w-2xl rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {supplier?.address || "-"}
              </div>
            </div>
          </div>

          <div className="grid min-w-[280px] grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="profile-stat-card shell-panel shell-panel-hover rounded-xl border border-slate-200 bg-white p-4" style={{ animationDelay: "180ms" }}>
              <div className="text-xs font-semibold uppercase text-slate-400">Payable</div>
              <div className={`mt-1 text-2xl font-bold ${Number(supplier?.dueAmount || 0) > 0 ? "text-red-600" : "text-slate-800"}`}>
                {formatCurrency(supplier?.dueAmount || 0)}
              </div>
            </div>
            <div className="profile-stat-card shell-panel shell-panel-hover rounded-xl border border-slate-200 bg-white p-4" style={{ animationDelay: "220ms" }}>
              <div className="text-xs font-semibold uppercase text-slate-400">Status</div>
              <div className="mt-2">
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${supplier?.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                  {supplier?.active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card className="sales-panel-enter overflow-hidden p-0" style={{ animationDelay: "130ms" }}>
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <div className="flex items-center gap-2">
            <Landmark size={18} className="text-slate-500" />
            <h2 className="text-lg font-bold text-slate-800">Bank Details</h2>
          </div>
        </div>

        {hasBankDetails ? (
          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="profile-detail-card shell-panel shell-panel-hover rounded-xl border border-slate-200 bg-white p-4" style={{ animationDelay: "170ms" }}>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                <Landmark size={14} /> Bank
              </div>
              <div className="mt-2 font-semibold text-slate-800">{bankDetails.bankName || "-"}</div>
            </div>
            <div className="profile-detail-card shell-panel shell-panel-hover rounded-xl border border-slate-200 bg-white p-4" style={{ animationDelay: "210ms" }}>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                <Building2 size={14} /> Branch
              </div>
              <div className="mt-2 font-semibold text-slate-800">{bankDetails.branchName || "-"}</div>
            </div>
            <div className="profile-detail-card shell-panel shell-panel-hover rounded-xl border border-slate-200 bg-white p-4" style={{ animationDelay: "250ms" }}>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                <UserRound size={14} /> Account Name
              </div>
              <div className="mt-2 font-semibold text-slate-800">{bankDetails.accountName || "-"}</div>
            </div>
            <div className="profile-detail-card shell-panel shell-panel-hover rounded-xl border border-slate-200 bg-white p-4" style={{ animationDelay: "290ms" }}>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                <CreditCard size={14} /> Account Number
              </div>
              <div className="mt-2 break-all font-semibold text-slate-800">{bankDetails.accountNumber || "-"}</div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-sm text-slate-500">No bank details saved for this supplier.</div>
        )}
      </Card>

      <Card className="sales-panel-enter overflow-hidden p-0" style={{ animationDelay: "170ms" }}>
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Purchase History</h2>
              <p className="text-sm text-slate-500">{purchases.length} recent invoices</p>
            </div>
            <Button onClick={() => navigate("/purchases/new")} className="w-full justify-center sm:w-auto">
              New Purchase
            </Button>
          </div>
        </div>

        <div className="app-table-wrap">
          <table className="app-table min-w-[980px]">
            <thead className="app-table-head">
              <tr>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Invoice No</th>
                <th className="px-6 py-3 text-center font-medium">Status</th>
                <th className="px-6 py-3 text-right font-medium">Discount</th>
                <th className="px-6 py-3 text-right font-medium">Total</th>
                <th className="px-6 py-3 text-right font-medium">Paid</th>
                <th className="px-6 py-3 text-right font-medium">Due</th>
                <th className="px-6 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-slate-500">
                    No purchases found for this supplier.
                  </td>
                </tr>
              ) : (
                purchases.map((purchase) => {
                  const isCanceled = purchase.status === "CANCELED";
                  return (
                    <tr
                      key={purchase.purchaseId}
                      className={`cursor-pointer transition-colors ${isCanceled ? "bg-red-50/30 hover:bg-red-50/50" : "hover:bg-slate-50"}`}
                      onClick={() => navigate(`/purchases/${purchase.purchaseId}`)}
                    >
                      <td className="px-6 py-4 text-slate-600">
                        <span className="inline-flex items-center gap-2">
                          <Calendar size={14} /> {formatDateTime(purchase.createdAt)}
                        </span>
                      </td>
                      <td className={`px-6 py-4 font-semibold ${isCanceled ? "text-red-400 line-through" : "text-slate-800"}`}>
                        {purchase.invoiceNo}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase ${isCanceled ? "border-red-200 bg-red-100 text-red-700" : "border-green-200 bg-green-100 text-green-700"}`}>
                          {isCanceled ? "Canceled" : "Completed"}
                        </span>
                      </td>
                      <td className={`px-6 py-4 text-right font-semibold ${isCanceled ? "text-slate-400 line-through" : "text-slate-500"}`}>
                        {formatCurrency(purchase.discountAmount || 0)}
                      </td>
                      <td className={`px-6 py-4 text-right font-bold ${isCanceled ? "text-slate-400 line-through" : "text-slate-800"}`}>
                        {formatCurrency(purchase.grandTotal || 0)}
                      </td>
                      <td className={`px-6 py-4 text-right font-semibold ${isCanceled ? "text-slate-400 line-through" : "text-emerald-700"}`}>
                        {formatCurrency(purchase.paidAmount || 0)}
                      </td>
                      <td className={`px-6 py-4 text-right font-bold ${isCanceled ? "text-slate-400 line-through" : Number(purchase.dueAmount || 0) > 0 ? "text-red-600" : "text-slate-400"}`}>
                        {formatCurrency(purchase.dueAmount || 0)}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        <ChevronRight size={18} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default SupplierViewPage;
