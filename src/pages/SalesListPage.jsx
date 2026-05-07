import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { salesAPI } from "../api/sales.api";
import { usersAPI } from "../api/users.api";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import CustomSelect from "../components/common/CustomSelect";
import { useBranch } from "../context/BranchContext";
import { useAuth } from "../context/AuthContext";
import { Search, ChevronRight, ShoppingCart } from "lucide-react";
import { formatCurrency } from "../utils/formatters";

const datePresetOptions = [
  { value: "ALL", label: "All Dates" },
  { value: "TODAY", label: "Today" },
  { value: "WEEK", label: "This Week" },
  { value: "MONTH", label: "This Month" },
  { value: "YEAR", label: "This Year" },
];

const orderTypeOptions = [
  { value: "ALL", label: "All Types" },
  { value: "CASH", label: "Cash" },
  { value: "CREDIT", label: "Credit" },
];

const customerTypeOptions = [
  { value: "ALL", label: "All Customers" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "WALK_IN", label: "Walk-in" },
];

const totalOperatorOptions = [
  { value: "ALL", label: "Any Total" },
  { value: "EQUAL", label: "Total =" },
  { value: "GREATER_THAN", label: "Total >" },
  { value: "LESS_THAN", label: "Total <" },
];

const formatInputDate = (date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split("T")[0];

const getPresetRange = (preset) => {
  const now = new Date();
  let from = null;
  let to = null;

  if (preset === "TODAY") {
    from = now;
    to = now;
  } else if (preset === "WEEK") {
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    from = new Date(now);
    from.setDate(now.getDate() + diffToMonday);
    to = now;
  } else if (preset === "MONTH") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    to = now;
  } else if (preset === "YEAR") {
    from = new Date(now.getFullYear(), 0, 1);
    to = now;
  }

  return {
    from: from ? formatInputDate(from) : "",
    to: to ? formatInputDate(to) : "",
  };
};

const SalesListPage = () => {
  const navigate = useNavigate();
  const { selectedBranchId } = useBranch();
  const { user } = useAuth();

  const [data, setData] = useState([]);
  const [cashierOptions, setCashierOptions] = useState([{ value: "ALL", label: "All Cashiers" }]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [orderType, setOrderType] = useState("ALL");
  const [customerType, setCustomerType] = useState("ALL");
  const [cashierId, setCashierId] = useState("ALL");
  const [totalOperator, setTotalOperator] = useState("ALL");
  const [totalAmount, setTotalAmount] = useState("");
  const [page, setPage] = useState(0);
  const [pageInput, setPageInput] = useState("1");
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 350);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, selectedBranchId, fromDate, toDate, orderType, customerType, cashierId, totalOperator, totalAmount]);

  useEffect(() => {
    loadCashiers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId, user?.branchId, user?.role]);

  useEffect(() => {
    setPageInput(String(page + 1));
  }, [page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const amount = Number(totalAmount);
      const hasTotalFilter = totalOperator !== "ALL" && totalAmount !== "" && Number.isFinite(amount);
      const res = await salesAPI.list({
        search,
        page,
        size: pageSize,
        branchId: selectedBranchId > 0 ? selectedBranchId : null,
        from: fromDate || undefined,
        to: toDate || undefined,
        orderType: orderType !== "ALL" ? orderType : undefined,
        customerType: customerType !== "ALL" ? customerType : undefined,
        cashierId: cashierId !== "ALL" ? cashierId : undefined,
        totalOperator: hasTotalFilter ? totalOperator : undefined,
        totalAmount: hasTotalFilter ? amount : undefined,
      });

      setData(res.data.content || []);
      setTotalPages(res.data.totalPages || 0);
      setTotalElements(res.data.totalElements || 0);
    } catch (error) {
      console.error("Failed to load sales", error);
      setData([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  };

  const loadCashiers = async () => {
    const allOption = { value: "ALL", label: "All Cashiers" };
    try {
      const branchId = selectedBranchId > 0 ? selectedBranchId : user?.branchId;
      const res = await usersAPI.salesFilter(branchId ? { branchId } : {});
      const users = Array.isArray(res.data) ? res.data : [];
      const options = users
        .filter((cashier) => cashier.enabled !== false)
        .map((cashier) => ({
          value: String(cashier.id),
          label: cashier.username || `User ${cashier.id}`,
        }));
      setCashierOptions([allOption, ...options]);
      if (cashierId !== "ALL" && !options.some((option) => option.value === String(cashierId))) {
        setCashierId("ALL");
      }
    } catch (error) {
      console.error("Failed to load cashiers", error);
      setCashierOptions([allOption]);
      setCashierId("ALL");
    }
  };

  const resetPage = () => setPage(0);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    resetPage();
  };

  const handleDatePreset = (value) => {
    setDatePreset(value);
    const range = getPresetRange(value);
    setFromDate(range.from);
    setToDate(range.to);
    resetPage();
  };

  const handleManualDate = (field, value) => {
    setDatePreset("ALL");
    if (field === "from") {
      setFromDate(value);
    } else {
      setToDate(value);
    }
    resetPage();
  };

  const clearFilters = () => {
    setSearch("");
    setDatePreset("ALL");
    setFromDate("");
    setToDate("");
    setOrderType("ALL");
    setCustomerType("ALL");
    setCashierId("ALL");
    setTotalOperator("ALL");
    setTotalAmount("");
    setPage(0);
  };

  const goToPage = () => {
    const requestedPage = Number(pageInput);
    if (!Number.isInteger(requestedPage)) {
      setPageInput(String(page + 1));
      return;
    }
    const maxPage = totalPages > 0 ? totalPages : 1;
    const nextPage = Math.min(Math.max(requestedPage, 1), maxPage) - 1;
    setPage(nextPage);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Sales History</h1>
          <p className="text-slate-500 text-sm">Manage Customer Invoices & Transactions</p>
        </div>
        <Button onClick={() => navigate("/pos")} className="bg-blue-600 w-full sm:w-auto flex justify-center">
          <ShoppingCart size={18} className="mr-2" /> Open POS
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-center">
          <div className="relative lg:col-span-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search invoice, customer, or phone..."
              className="h-10 w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={search}
              onChange={handleSearch}
            />
          </div>

          <div className="lg:col-span-2">
            <CustomSelect
              value={datePreset}
              onChange={handleDatePreset}
              options={datePresetOptions}
              valueKey="value"
              labelKey="label"
              buttonClassName="h-10 rounded-lg"
            />
          </div>

          <div className="lg:col-span-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => handleManualDate("from", e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="lg:col-span-2">
            <input
              type="date"
              value={toDate}
              onChange={(e) => handleManualDate("to", e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="lg:col-span-2">
            <Button type="button" variant="secondary" onClick={clearFilters} className="h-10 w-full px-4 text-sm">
              Clear
            </Button>
          </div>

          <div className="lg:col-span-2">
            <CustomSelect
              value={orderType}
              onChange={(value) => {
                setOrderType(value);
                resetPage();
              }}
              options={orderTypeOptions}
              valueKey="value"
              labelKey="label"
              buttonClassName="h-10 rounded-lg"
            />
          </div>

          <div className="lg:col-span-2">
            <CustomSelect
              value={customerType}
              onChange={(value) => {
                setCustomerType(value);
                resetPage();
              }}
              options={customerTypeOptions}
              valueKey="value"
              labelKey="label"
              buttonClassName="h-10 rounded-lg"
            />
          </div>

          <div className="lg:col-span-2">
            <CustomSelect
              value={cashierId}
              onChange={(value) => {
                setCashierId(value);
                resetPage();
              }}
              options={cashierOptions}
              valueKey="value"
              labelKey="label"
              buttonClassName="h-10 rounded-lg"
            />
          </div>

          <div className="lg:col-span-2">
            <CustomSelect
              value={totalOperator}
              onChange={(value) => {
                setTotalOperator(value);
                resetPage();
              }}
              options={totalOperatorOptions}
              valueKey="value"
              labelKey="label"
              buttonClassName="h-10 rounded-lg"
            />
          </div>

          <div className="lg:col-span-2">
            <input
              type="number"
              min="0"
              value={totalAmount}
              onChange={(e) => {
                setTotalAmount(e.target.value);
                resetPage();
              }}
              placeholder="Total amount"
              disabled={totalOperator === "ALL"}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
            />
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden border border-slate-200">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-slate-100 text-slate-600 uppercase font-semibold border-b">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Invoice No</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Sold By</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Payment</th>
                <th className="p-4 text-right">Grand Total</th>
                <th className="p-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="8" className="p-6 text-center text-slate-500">Loading...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="8" className="p-6 text-center text-slate-500">No records found.</td></tr>
              ) : (
                data.map((sale) => (
                  <tr
                    key={sale.id}
                    className={`hover:bg-blue-50 cursor-pointer transition-colors ${sale.status === "CANCELED" ? "opacity-60 bg-red-50/20" : ""}`}
                    onClick={() => navigate(`/sales/${sale.invoiceNo}`)}
                  >
                    <td className="p-4 text-slate-600">
                      {new Date(sale.createdAt).toLocaleDateString()}
                    </td>
                    <td className={`p-4 font-bold ${sale.status === "CANCELED" ? "text-red-500 line-through" : "text-blue-600"}`}>
                      {sale.invoiceNo}
                    </td>
                    <td className="p-4 font-medium text-slate-700">
                      {sale.customerName || "Walk-in Customer"}
                    </td>
                    <td className="p-4 text-slate-600">
                      {sale.cashierName || "Unknown"}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-bold border ${
                        sale.status === "CANCELED"
                          ? "bg-red-100 text-red-700 border-red-200"
                          : "bg-green-100 text-green-700 border-green-200"
                      }`}>
                        {sale.status || "COMPLETED"}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                        {sale.orderType || "CASH"}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-slate-800 text-base sm:text-lg">
                      {formatCurrency(sale.grandTotal)}
                    </td>
                    <td className="p-4 text-slate-400 text-right">
                      <ChevronRight size={18} className="inline-block" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-center p-4 bg-slate-50 border-t gap-4">
          <span className="text-sm text-slate-500">
            Showing {data.length} of {totalElements} records. Page {page + 1} of {totalPages === 0 ? 1 : totalPages}
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

export default SalesListPage;
