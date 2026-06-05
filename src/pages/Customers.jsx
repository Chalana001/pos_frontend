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
import DatePicker from "../components/common/DatePicker";
import TablePagination from "../components/common/TablePagination";
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
    <div className="page-enter space-y-6">
      <div className="page-section-enter flex items-center justify-between" style={{ animationDelay: "40ms" }}>
        <h1 className="text-3xl font-bold text-slate-800">Customers</h1>

        <Button onClick={() => navigate("/customers/new")}>
          <Plus size={20} className="mr-2" />
          Add Customer
        </Button>
      </div>

      <Card className="sales-panel-enter sales-panel-hover overflow-hidden p-0" style={{ animationDelay: "90ms" }}>
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <div className="grid grid-cols-2 gap-3 min-[440px]:grid-cols-3 min-[620px]:grid-cols-4 xl:grid-cols-12 xl:items-center">
            <div className="relative col-span-full min-[440px]:col-span-3 min-[620px]:col-span-4 xl:col-span-4">
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

            <div className="col-span-1 xl:col-span-2">
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

            <div className="col-span-1 xl:col-span-2">
              <DatePicker
                value={fromDate}
                onChange={(value) => {
                  setFromDate(value);
                  resetPage();
                }}
              />
            </div>

            <div className="col-span-1 xl:col-span-2">
              <DatePicker
                value={toDate}
                onChange={(value) => {
                  setToDate(value);
                  resetPage();
                }}
              />
            </div>

            <div className="col-span-1 xl:col-span-2">
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

        <TablePagination
          summary={`Showing ${customers.length} of ${totalElements} customers. Page ${page + 1} of ${totalPages === 0 ? 1 : totalPages}`}
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

export default CustomersListPage;
