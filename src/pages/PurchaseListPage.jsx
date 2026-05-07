import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, ChevronRight } from "lucide-react";
import { purchasesAPI } from "../api/purchases.api";
import { suppliersAPI } from "../api/suppliers.api";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import CustomSelect from "../components/common/CustomSelect";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { formatCurrency, formatDateTime } from "../utils/formatters";

const purchaseStatusOptions = [
  { value: "ALL", label: "All Status" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELED", label: "Canceled" },
];

const PurchaseListPage = () => {
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [suppliers, setSuppliers] = useState([{ value: "ALL", label: "All Suppliers" }]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [supplierId, setSupplierId] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);
  const [pageInput, setPageInput] = useState("1");
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const response = await suppliersAPI.list();
        const options = (Array.isArray(response.data) ? response.data : []).map((supplier) => ({
          value: String(supplier.id),
          label: supplier.name || `Supplier ${supplier.id}`,
        }));
        setSuppliers([{ value: "ALL", label: "All Suppliers" }, ...options]);
      } catch (error) {
        console.error("Failed to load purchase suppliers", error);
        setSuppliers([{ value: "ALL", label: "All Suppliers" }]);
      }
    };

    loadSuppliers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, page, search, status, supplierId, toDate]);

  useEffect(() => {
    setPageInput(String(page + 1));
  }, [page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await purchasesAPI.list({
        search: search.trim() || undefined,
        supplierId: supplierId !== "ALL" ? supplierId : undefined,
        status: status !== "ALL" ? status : undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        page,
        size: pageSize,
      });

      const content = res.data?.content || [];
      setData(content);
      setTotalPages(res.data?.totalPages || 0);
      setTotalElements(res.data?.totalElements || content.length);
    } catch (error) {
      console.error("Failed to load purchases", error);
      setData([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  };

  const resetPage = () => setPage(0);

  const clearFilters = () => {
    setSearch("");
    setSupplierId("ALL");
    setStatus("ALL");
    setFromDate("");
    setToDate("");
    setPage(0);
  };

  const goToPage = () => {
    const requestedPage = Number(pageInput);
    if (!Number.isInteger(requestedPage)) {
      setPageInput(String(page + 1));
      return;
    }

    const maxPage = totalPages > 0 ? totalPages : 1;
    setPage(Math.min(Math.max(requestedPage, 1), maxPage) - 1);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Purchase History</h1>
          <p className="mt-1 text-sm text-slate-500">Manage supplier invoices and GRN records.</p>
        </div>
        <Button onClick={() => navigate("/purchases/new")} className="w-full justify-center sm:w-auto">
          <Plus size={18} className="mr-2" /> New Purchase
        </Button>
      </div>

      <Card className="overflow-hidden border border-slate-200 p-0">
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative w-full xl:min-w-[300px] xl:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search invoice, supplier, or GRN..."
                className="h-[42px] w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  resetPage();
                }}
              />
            </div>

            <div className="w-full xl:w-52 xl:shrink-0">
              <CustomSelect
                value={supplierId}
                onChange={(value) => {
                  setSupplierId(value);
                  resetPage();
                }}
                options={suppliers}
                valueKey="value"
                labelKey="label"
                buttonClassName="h-[42px]"
              />
            </div>

            <div className="w-full xl:w-44 xl:shrink-0">
              <CustomSelect
                value={status}
                onChange={(value) => {
                  setStatus(value);
                  resetPage();
                }}
                options={purchaseStatusOptions}
                valueKey="value"
                labelKey="label"
                buttonClassName="h-[42px]"
              />
            </div>

            <div className="w-full xl:w-44 xl:shrink-0">
              <input
                type="date"
                value={fromDate}
                onChange={(event) => {
                  setFromDate(event.target.value);
                  resetPage();
                }}
                className="h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="w-full xl:w-44 xl:shrink-0">
              <input
                type="date"
                value={toDate}
                onChange={(event) => {
                  setToDate(event.target.value);
                  resetPage();
                }}
                className="h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="w-full xl:w-auto xl:shrink-0">
              <Button type="button" variant="secondary" onClick={clearFilters} className="h-[42px] w-full px-4 text-sm xl:w-auto" disabled={loading}>
                Clear
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-12">
            <LoadingSpinner size="lg" text="Loading purchases..." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Invoice No</th>
                  <th className="px-6 py-3 font-medium">Supplier</th>
                  <th className="px-6 py-3 text-center font-medium">Status</th>
                  <th className="px-6 py-3 text-right font-medium">Grand Total</th>
                  <th className="px-6 py-3 text-center font-medium">GRNs</th>
                  <th className="px-6 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  data.map((purchase) => {
                    const isCanceled = purchase.status === "CANCELED";

                    return (
                      <tr
                        key={purchase.purchaseId}
                        className={`cursor-pointer transition-colors ${isCanceled ? "bg-red-50/30 hover:bg-red-50/50" : "hover:bg-slate-50"}`}
                        onClick={() => navigate(`/purchases/${purchase.purchaseId}`)}
                      >
                        <td className={`px-6 py-4 whitespace-nowrap ${isCanceled ? "text-slate-400" : "text-slate-600"}`}>
                          {formatDateTime(purchase.createdAt)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap font-semibold ${isCanceled ? "text-red-400 line-through" : "text-slate-800"}`}>
                          {purchase.invoiceNo}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap font-medium ${isCanceled ? "text-slate-400" : "text-slate-700"}`}>
                          {purchase.supplierName}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                              isCanceled
                                ? "border-red-200 bg-red-100 text-red-700"
                                : "border-green-200 bg-green-100 text-green-700"
                            }`}
                          >
                            {isCanceled ? "Canceled" : "Completed"}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-right font-bold ${isCanceled ? "text-slate-400 line-through" : "text-slate-800"}`}>
                          {formatCurrency(purchase.grandTotal || 0)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`rounded border px-2 py-1 text-xs font-semibold ${isCanceled ? "border-slate-200 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
                            View Details
                          </span>
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
        )}

        <div className="flex flex-col items-center justify-between gap-4 border-t bg-slate-50 p-4 lg:flex-row">
          <span className="text-sm text-slate-500">
            Page {page + 1} of {totalPages === 0 ? 1 : totalPages} | Total: {totalElements}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button disabled={page === 0 || loading} onClick={() => setPage(page - 1)} variant="secondary" className="px-3 py-1 text-sm">
              Prev
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Go to</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pageInput}
                onChange={(event) => setPageInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    goToPage();
                  }
                }}
                className="h-9 w-20 rounded-lg border border-slate-300 px-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button type="button" variant="secondary" onClick={goToPage} disabled={loading} className="px-3 py-1 text-sm">
                Go
              </Button>
            </div>
            <Button disabled={page >= totalPages - 1 || loading} onClick={() => setPage(page + 1)} variant="secondary" className="px-3 py-1 text-sm">
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PurchaseListPage;
