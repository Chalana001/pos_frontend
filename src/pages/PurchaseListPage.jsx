import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, ChevronRight } from "lucide-react";
import { purchasesAPI } from "../api/purchases.api";
import { suppliersAPI } from "../api/suppliers.api";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import CustomSelect from "../components/common/CustomSelect";
import LoadingSpinner from "../components/common/LoadingSpinner";
import TablePagination from "../components/common/TablePagination";
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
    <div className="page-enter space-y-6 pb-10">
      <div className="page-section-enter flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" style={{ animationDelay: "40ms" }}>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Purchase History</h1>
          <p className="mt-1 text-sm text-slate-500">Manage supplier invoices and GRN records.</p>
        </div>
        <Button onClick={() => navigate("/purchases/new")} className="w-full justify-center sm:w-auto">
          <Plus size={18} className="mr-2" /> New Purchase
        </Button>
      </div>

      <Card className="sales-panel-enter sales-panel-hover overflow-hidden border border-slate-200 p-0" style={{ animationDelay: "90ms" }}>
        <div className="inventory-filter-bar border-b border-slate-100 bg-slate-50/50 p-4" style={{ animationDelay: "130ms" }}>
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
          <div className="app-table-wrap">
            <table className="app-table min-w-[1140px]">
              <thead className="app-table-head">
                <tr>
                  <th className="app-table-head-cell">Date</th>
                  <th className="app-table-head-cell">Invoice No</th>
                  <th className="app-table-head-cell">Supplier</th>
                  <th className="app-table-head-cell text-center">Status</th>
                  <th className="app-table-head-cell text-right">Discount</th>
                  <th className="app-table-head-cell text-right">Grand Total</th>
                  <th className="app-table-head-cell text-right">Paid</th>
                  <th className="app-table-head-cell text-right">Due</th>
                  <th className="app-table-head-cell text-center">GRNs</th>
                  <th className="app-table-head-cell w-10"></th>
                </tr>
              </thead>
              <tbody className="app-table-body">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-8 text-center text-slate-500">
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
                        <td className={`px-6 py-4 whitespace-nowrap text-right font-semibold ${isCanceled ? "text-slate-400 line-through" : "text-slate-500"}`}>
                          {formatCurrency(purchase.discountAmount || 0)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-right font-bold ${isCanceled ? "text-slate-400 line-through" : "text-slate-800"}`}>
                          {formatCurrency(purchase.grandTotal || 0)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-right font-semibold ${isCanceled ? "text-slate-400 line-through" : "text-emerald-700"}`}>
                          {formatCurrency(purchase.paidAmount || 0)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-right font-bold ${
                          isCanceled
                            ? "text-slate-400 line-through"
                            : Number(purchase.dueAmount || 0) > 0
                              ? "text-red-600"
                              : "text-slate-400"
                        }`}>
                          {formatCurrency(purchase.dueAmount || 0)}
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

        <TablePagination
          summary={`Showing ${data.length} of ${totalElements} records. Page ${page + 1} of ${totalPages === 0 ? 1 : totalPages}`}
          page={page}
          pageInput={pageInput}
          totalPages={totalPages}
          loading={loading}
          onPageChange={setPage}
          onPageInputChange={setPageInput}
          onGoToPage={goToPage}
        />
      </Card>
    </div>
  );
};

export default PurchaseListPage;
