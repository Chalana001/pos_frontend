import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ShieldCheck } from "lucide-react";

import { warrantiesAPI } from "../api/warranties.api";
import { useBranch } from "../context/BranchContext";
import Card from "../components/common/Card";
import LoadingSpinner from "../components/common/LoadingSpinner";
import TablePagination from "../components/common/TablePagination";
import { formatDate } from "../utils/formatters";

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

const WarrantiesPage = () => {
  const navigate = useNavigate();
  const { selectedBranchId } = useBranch();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageInput, setPageInput] = useState("1");
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    setPageInput(String(page + 1));
  }, [page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadRows();
    }, 250);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, selectedBranchId]);

  const loadRows = async () => {
    setLoading(true);
    try {
      const response = await warrantiesAPI.list({
        search: search.trim() || undefined,
        page,
        size: pageSize,
        branchId: selectedBranchId || 0,
      });
      const content = response.data?.content || [];
      setRows(content);
      setTotalPages(response.data?.totalPages || 0);
      setTotalElements(response.data?.totalElements || content.length);
    } catch (error) {
      console.error("Failed to load warranties", error);
      setRows([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
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
      <div className="page-section-enter" style={{ animationDelay: "40ms" }}>
        <h1 className="text-3xl font-bold text-slate-800">Warranties</h1>
        <p className="mt-1 text-sm text-slate-500">Track sold items that carry warranty coverage.</p>
      </div>

      <Card className="sales-panel-enter sales-panel-hover overflow-hidden border border-slate-200 p-0" style={{ animationDelay: "90ms" }}>
        <div className="inventory-filter-bar border-b border-slate-100 bg-slate-50/50 p-4" style={{ animationDelay: "130ms" }}>
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              className="h-[42px] w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search warranty no, barcode, invoice, customer, or item..."
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12">
            <LoadingSpinner size="lg" text="Loading warranties..." />
          </div>
        ) : (
          <div className="app-table-wrap">
            <table className="app-table min-w-[1040px]">
              <thead className="app-table-head">
                <tr>
                  <th className="app-table-head-cell">Warranty No</th>
                  <th className="app-table-head-cell">Invoice</th>
                  <th className="app-table-head-cell">Customer</th>
                  <th className="app-table-head-cell">Item</th>
                  <th className="app-table-head-cell">Period</th>
                  <th className="app-table-head-cell">Start</th>
                  <th className="app-table-head-cell">Expiry</th>
                  <th className="app-table-head-cell text-center">Status</th>
                </tr>
              </thead>
              <tbody className="app-table-body">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="app-table-empty">
                      No warranties found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      className="app-table-row-clickable"
                      onClick={() => navigate(`/warranties/${row.id}`)}
                    >
                      <td className="app-table-cell font-semibold text-slate-800">{row.warrantyNo}</td>
                      <td className="app-table-cell">{row.invoiceNo}</td>
                      <td className="app-table-cell">{row.customerName}</td>
                      <td className="app-table-cell">
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={16} className="text-blue-600" />
                          <span>{row.itemName}</span>
                        </div>
                      </td>
                      <td className="app-table-cell">{row.warrantyLabel}</td>
                      <td className="app-table-cell">{formatDate(row.startDate)}</td>
                      <td className="app-table-cell">{formatDate(row.endDate)}</td>
                      <td className="app-table-cell text-center">
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusClassName(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <TablePagination
          summary={`Showing ${rows.length} of ${totalElements} records. Page ${page + 1} of ${totalPages === 0 ? 1 : totalPages}`}
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

export default WarrantiesPage;
