import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { customersAPI } from "../api/customers.api";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Table from "../components/common/Table";
import LoadingSpinner from "../components/common/LoadingSpinner";
import CustomSelect from "../components/common/CustomSelect";
import { formatCurrency, formatDate } from "../utils/formatters";

const statusOptions = [
  { value: "ALL", label: "All Status" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

const CustomersListPage = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);
  const [pageInput, setPageInput] = useState("1");
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 350);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, status, fromDate, toDate, page]);

  useEffect(() => {
    setPageInput(String(page + 1));
  }, [page]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await customersAPI.getAll({
        search: searchQuery,
        active: status === "ALL" ? undefined : status === "ACTIVE",
        from: fromDate || undefined,
        to: toDate || undefined,
        page,
        size: pageSize,
      });

      const content = res.data.content || [];
      setCustomers(content);
      setTotalPages(res.data.totalPages || 0);
      setTotalElements(res.data.totalElements || content.length);
    } catch {
      setCustomers([]);
      setTotalPages(0);
      setTotalElements(0);
      toast.error("Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  };

  const resetPage = () => setPage(0);

  const clearFilters = () => {
    setSearchQuery("");
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

  const columns = useMemo(() => [
    { header: "Name", accessor: "name" },
    { header: "Phone", accessor: "phone" },
    {
      header: "Created",
      render: (c) => <span className="text-slate-600">{c.createdAt ? formatDate(c.createdAt) : "-"}</span>,
    },
    {
      header: "Due Amount",
      render: (c) => (
        <span className={(c.dueAmount || 0) > 0 ? "text-red-600 font-semibold" : ""}>
          {formatCurrency(c.dueAmount || 0)}
        </span>
      ),
    },
    {
      header: "Credit Limit",
      render: (c) => formatCurrency(c.creditLimit || 0),
    },
    {
      header: "Status",
      render: (c) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            c.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {c.active ? "Active" : "Inactive"}
        </span>
      ),
    },
  ], [navigate]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Customers</h1>

        <Button onClick={() => navigate("/customers/new")}>
          <Plus size={20} className="mr-2" />
          Add Customer
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-center">
            <div className="relative lg:col-span-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  resetPage();
                }}
                placeholder="Search customer, phone, or address..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="lg:col-span-2">
              <CustomSelect
                value={status}
                onChange={(value) => {
                  setStatus(value);
                  resetPage();
                }}
                options={statusOptions}
                valueKey="value"
                labelKey="label"
                buttonClassName="h-10 rounded-lg"
              />
            </div>

            <div className="lg:col-span-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  resetPage();
                }}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="lg:col-span-2">
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  resetPage();
                }}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="lg:col-span-2">
              <Button type="button" variant="secondary" onClick={clearFilters} className="h-10 w-full px-4 text-sm">
                Clear
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-12">
            <LoadingSpinner size="lg" text="Loading customers..." />
          </div>
        ) : (
          <Table columns={columns} data={customers} onRowClick={(customer) => navigate(`/customers/${customer.id}`)} />
        )}

        <div className="flex flex-col lg:flex-row justify-between items-center p-4 bg-slate-50 border-t gap-4">
          <span className="text-sm text-slate-500">
            Showing {customers.length} of {totalElements} customers. Page {page + 1} of {totalPages === 0 ? 1 : totalPages}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button disabled={page === 0 || loading} onClick={() => setPage(page - 1)} variant="secondary" className="px-3 py-1 text-sm">
              Prev
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Go to</span>
              <input
                type="number"
                min="1"
                max={totalPages || 1}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
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

export default CustomersListPage;
