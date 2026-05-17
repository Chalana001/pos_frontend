import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Wrench } from "lucide-react";

import { warrantiesAPI } from "../api/warranties.api";
import { useBranch } from "../context/BranchContext";
import Card from "../components/common/Card";
import CustomSelect from "../components/common/CustomSelect";
import LoadingSpinner from "../components/common/LoadingSpinner";
import TablePagination from "../components/common/TablePagination";
import { formatDateTime } from "../utils/formatters";

const statusOptions = [
  { value: "ALL", label: "All Status" },
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELED", label: "Canceled" },
];

const getStatusClassName = (status) => {
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

const WarrantyClaimsPage = () => {
  const navigate = useNavigate();
  const { selectedBranchId } = useBranch();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
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
  }, [page, search, selectedBranchId, status]);

  const loadRows = async () => {
    setLoading(true);
    try {
      const response = await warrantiesAPI.listClaimQueue({
        search: search.trim() || undefined,
        status: status !== "ALL" ? status : undefined,
        page,
        size: pageSize,
        branchId: selectedBranchId || 0,
      });
      const content = response.data?.content || [];
      setRows(content);
      setTotalPages(response.data?.totalPages || 0);
      setTotalElements(response.data?.totalElements || content.length);
    } catch (error) {
      console.error("Failed to load warranty claims", error);
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
        <h1 className="text-3xl font-bold text-slate-800">Warranty Claims</h1>
        <p className="mt-1 text-sm text-slate-500">Track items received for repair or replacement work.</p>
      </div>

      <Card className="sales-panel-enter sales-panel-hover overflow-hidden border border-slate-200 p-0" style={{ animationDelay: "90ms" }}>
        <div className="inventory-filter-bar border-b border-slate-100 bg-slate-50/50 p-4" style={{ animationDelay: "130ms" }}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative w-full lg:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
                className="h-[42px] w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search claim, warranty, barcode, invoice, customer, or item..."
              />
            </div>
            <div className="w-full lg:w-48">
              <CustomSelect
                value={status}
                onChange={(value) => {
                  setStatus(value);
                  setPage(0);
                }}
                options={statusOptions}
                valueKey="value"
                labelKey="label"
                buttonClassName="h-[42px]"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-12">
            <LoadingSpinner size="lg" text="Loading claims..." />
          </div>
        ) : (
          <div className="app-table-wrap">
            <table className="app-table min-w-[1180px]">
              <thead className="app-table-head">
                <tr>
                  <th className="app-table-head-cell">Claim No</th>
                  <th className="app-table-head-cell">Warranty</th>
                  <th className="app-table-head-cell">Invoice</th>
                  <th className="app-table-head-cell">Customer</th>
                  <th className="app-table-head-cell">Item</th>
                  <th className="app-table-head-cell">Action</th>
                  <th className="app-table-head-cell">Received</th>
                  <th className="app-table-head-cell text-center">Status</th>
                </tr>
              </thead>
              <tbody className="app-table-body">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="app-table-empty">
                      No warranty claims found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      className="app-table-row-clickable"
                      onClick={() => navigate(`/warranties/${row.warrantyId}`)}
                    >
                      <td className="app-table-cell font-semibold text-slate-800">{row.claimNo}</td>
                      <td className="app-table-cell">{row.warrantyNo}</td>
                      <td className="app-table-cell">{row.invoiceNo}</td>
                      <td className="app-table-cell">{row.customerName}</td>
                      <td className="app-table-cell">
                        <div className="flex items-center gap-2">
                          <Wrench size={16} className="text-blue-600" />
                          <span>{row.itemName}</span>
                        </div>
                      </td>
                      <td className="app-table-cell">{row.actionType}</td>
                      <td className="app-table-cell">{formatDateTime(row.receivedAt)}</td>
                      <td className="app-table-cell text-center">
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusClassName(row.status)}`}>
                          {row.status.replace("_", " ")}
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

export default WarrantyClaimsPage;
