import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Plus, Search } from "lucide-react";
import { expensesAPI } from "../api/expenses.api";
import { usersAPI } from "../api/users.api";
import { useAuth } from "../context/AuthContext";
import { useBranch } from "../context/BranchContext";
import { useShift } from "../context/ShiftContext";
import { formatCurrency, formatDateTime } from "../utils/formatters";
import { EXPENSE_CATEGORIES } from "../utils/constants";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import Table from "../components/common/Table";
import LoadingSpinner from "../components/common/LoadingSpinner";
import CustomSelect from "../components/common/CustomSelect";

const toLocalDateTimeParam = (date, endOfDay = false) => {
  if (!date) return undefined;
  return `${date}T${endOfDay ? "23:59:59" : "00:00:00"}`;
};

const formatCategoryLabel = (value) => value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

const Expenses = () => {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();
  const { activeShift, refreshShift } = useShift();

  const isCashier = user?.role === "CASHIER";
  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "MANAGER";
  const hasActiveShift = Array.isArray(activeShift) ? activeShift.length > 0 : !!activeShift;

  const today = new Date().toISOString().split("T")[0];

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [cashierId, setCashierId] = useState("ALL");
  const [cashierOptions, setCashierOptions] = useState([{ value: "ALL", label: "All Users" }]);
  const [page, setPage] = useState(0);
  const [pageInput, setPageInput] = useState("1");
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [formData, setFormData] = useState({
    amount: "",
    category: EXPENSE_CATEGORIES.OTHER,
    description: "",
    isFromDrawer: true,
  });

  const categoryOptions = useMemo(
    () => [
      { value: "ALL", label: "All Categories" },
      ...Object.values(EXPENSE_CATEGORIES).map((category) => ({
        value: category,
        label: formatCategoryLabel(category),
      })),
    ],
    []
  );

  const modalCategoryOptions = useMemo(
    () => categoryOptions.filter((option) => option.value !== "ALL"),
    [categoryOptions]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchExpenses();
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId, user?.role, search, startDate, endDate, categoryFilter, cashierId, page]);

  useEffect(() => {
    setPageInput(String(page + 1));
  }, [page]);

  useEffect(() => {
    const loadCashiers = async () => {
      if (!isAdminOrManager) return;

      const allOption = { value: "ALL", label: "All Users" };
      try {
        const branchId = selectedBranchId > 0 ? selectedBranchId : user?.branchId;
        const res = await usersAPI.salesFilter(branchId ? { branchId } : {});
        const options = (Array.isArray(res.data) ? res.data : []).map((cashier) => ({
          value: String(cashier.id),
          label: cashier.username || `User ${cashier.id}`,
        }));

        setCashierOptions([allOption, ...options]);
        if (cashierId !== "ALL" && !options.some((option) => option.value === String(cashierId))) {
          setCashierId("ALL");
          setPage(0);
        }
      } catch (error) {
        console.error("Failed to load expense users", error);
        setCashierOptions([allOption]);
      }
    };

    loadCashiers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminOrManager, selectedBranchId, user?.branchId]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const branchId = isCashier ? user?.branchId : selectedBranchId;
      const response = await expensesAPI.getAll({
        branchId: branchId || 0,
        from: toLocalDateTimeParam(startDate),
        to: toLocalDateTimeParam(endDate, true),
        search: search.trim() || undefined,
        category: categoryFilter !== "ALL" ? categoryFilter : undefined,
        cashierId: cashierId !== "ALL" ? cashierId : undefined,
        page,
        size: pageSize,
      });

      const content = response.data?.content || [];
      setExpenses(content);
      setTotalPages(response.data?.totalPages || 0);
      setTotalElements(response.data?.totalElements || content.length);
    } catch (err) {
      toast.error("Failed to fetch expenses");
      setExpenses([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  };

  const resetPage = () => setPage(0);

  const clearFilters = () => {
    setSearch("");
    setStartDate(today);
    setEndDate(today);
    setCategoryFilter("ALL");
    setCashierId("ALL");
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    const amount = Number(formData.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Invalid amount");
      return;
    }

    const branchId = isCashier ? user?.branchId : selectedBranchId;
    if (!branchId) {
      toast.error("Branch ID is missing");
      return;
    }

    try {
      const payload = {
        amount,
        category: formData.category,
        description: formData.description.trim(),
        branchId,
      };

      if (isAdminOrManager) {
        payload.isFromDrawer = hasActiveShift ? formData.isFromDrawer : false;
      }

      await expensesAPI.create(payload);

      toast.success("Expense recorded successfully");
      handleCloseModal();
      refreshShift?.();
      fetchExpenses();
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || "Failed to record expense";
      toast.error(msg);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ amount: "", category: EXPENSE_CATEGORIES.OTHER, description: "", isFromDrawer: true });
  };

  const columns = [
    {
      header: "Date & Time",
      render: (expense) => formatDateTime(expense.createdAt),
    },
    { header: "Branch", accessor: "branchName" },
    {
      header: "Category",
      render: (expense) => (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
          {formatCategoryLabel(expense.category || "")}
        </span>
      ),
    },
    { header: "Description", accessor: "description" },
    {
      header: "Amount",
      render: (expense) => (
        <span className="font-semibold text-red-600">{formatCurrency(expense.amount)}</span>
      ),
    },
    { header: "Recorded By", accessor: "cashierName" },
    {
      header: "Shift",
      render: (expense) => <span className="text-slate-500">#{expense.shiftId}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Expenses</h1>
          <p className="text-sm text-slate-500 mt-1">Track drawer and branch expenses by date, category, and user.</p>
        </div>

        <Button
          onClick={() => setShowModal(true)}
          disabled={isCashier && !hasActiveShift}
          className={isCashier && !hasActiveShift ? "opacity-50 cursor-not-allowed" : ""}
          title={isCashier && !hasActiveShift ? "You need an open shift to record expenses" : ""}
        >
          <Plus size={20} className="mr-2" />
          Record Expense
        </Button>
      </div>

      {isCashier && !hasActiveShift && (
        <Card>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-medium text-yellow-800">
              No active shift. Please open a shift to view and record expenses.
            </p>
          </div>
        </Card>
      )}

      <div className={`space-y-6 transition-all duration-300 ${isCashier && !hasActiveShift ? "opacity-40 grayscale pointer-events-none select-none" : ""}`}>
        <Card className="p-0 overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 p-4">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(240px,1fr)_160px_160px_220px_200px_auto] xl:items-center">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    resetPage();
                  }}
                  placeholder="Search description..."
                  className="h-[42px] w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  resetPage();
                }}
                className="h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  resetPage();
                }}
                className="h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <CustomSelect
                value={categoryFilter}
                onChange={(value) => {
                  setCategoryFilter(value);
                  resetPage();
                }}
                options={categoryOptions}
                valueKey="value"
                labelKey="label"
                placeholder="All Categories"
                buttonClassName="h-[42px]"
              />

              {isAdminOrManager && (
                <CustomSelect
                  value={cashierId}
                  onChange={(value) => {
                    setCashierId(value);
                    resetPage();
                  }}
                  options={cashierOptions}
                  valueKey="value"
                  labelKey="label"
                  placeholder="All Users"
                  buttonClassName="h-[42px]"
                />
              )}

              <Button type="button" variant="secondary" onClick={clearFilters} disabled={loading} className="h-[42px] px-4 text-sm">
                Clear
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="py-12">
              <LoadingSpinner size="lg" text="Loading..." />
            </div>
          ) : (
            <Table columns={columns} data={expenses} />
          )}

          <div className="flex flex-col lg:flex-row justify-between items-center p-4 bg-slate-50 border-t gap-4">
            <span className="text-sm text-slate-500">
              Showing {expenses.length} of {totalElements} expenses. Page {page + 1} of {totalPages === 0 ? 1 : totalPages}
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

      <Modal isOpen={showModal} onClose={handleCloseModal} title="Record Expense">
        <form onSubmit={handleSubmit} className="space-y-4">
          {isAdminOrManager && hasActiveShift && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <input
                type="checkbox"
                id="isFromDrawer"
                checked={formData.isFromDrawer}
                onChange={(e) => setFormData({ ...formData, isFromDrawer: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="isFromDrawer" className="text-sm font-medium text-blue-900 cursor-pointer">
                Take money from the Cash Drawer (Shift)
              </label>
            </div>
          )}

          <div className="relative z-10">
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <CustomSelect
              value={formData.category}
              onChange={(value) => setFormData({ ...formData, category: value })}
              options={modalCategoryOptions}
              valueKey="value"
              labelKey="label"
              placeholder="Select Category"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
            <input
              type="text"
              inputMode="decimal"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter expense details..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">Record Expense</Button>
            <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Expenses;
