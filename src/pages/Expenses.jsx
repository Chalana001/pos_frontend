import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Plus, Search } from "lucide-react";
import { expensesAPI } from "../api/expenses.api";
import { expenseTypesAPI } from "../api/expenseTypes.api";
import { usersAPI } from "../api/users.api";
import { useAuth } from "../context/AuthContext";
import { useBranch } from "../context/BranchContext";
import { useShift } from "../context/ShiftContext";
import { formatCurrency, formatDateTime } from "../utils/formatters";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import Table from "../components/common/Table";
import LoadingSpinner from "../components/common/LoadingSpinner";
import CustomSelect from "../components/common/CustomSelect";
import DatePicker from "../components/common/DatePicker";
import TablePagination from "../components/common/TablePagination";
import { useSearchOnType } from "../hooks/useSearchOnType";

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
  const searchRef = useSearchOnType(setSearch);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [cashierId, setCashierId] = useState("ALL");
  const [cashierOptions, setCashierOptions] = useState([{ value: "ALL", label: "All Users" }]);
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [activeExpenseTypes, setActiveExpenseTypes] = useState([]);
  const [page, setPage] = useState(0);
  const [pageInput, setPageInput] = useState("1");
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [formData, setFormData] = useState({
    amount: "",
    expenseTypeId: "",
    description: "",
    isFromDrawer: true,
  });

  const categoryOptions = useMemo(
    () => [
      { value: "ALL", label: "All Expense Types" },
      ...expenseTypes.map((expenseType) => ({
        value: String(expenseType.id),
        label: expenseType.name,
      })),
    ],
    [expenseTypes]
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
    const loadExpenseTypes = async () => {
      try {
        const [allResponse, activeResponse] = await Promise.all([
          expenseTypesAPI.list(),
          expenseTypesAPI.listActive(),
        ]);
        const allTypes = Array.isArray(allResponse.data) ? allResponse.data : [];
        const activeTypes = Array.isArray(activeResponse.data) ? activeResponse.data : [];
        setExpenseTypes(allTypes);
        setActiveExpenseTypes(activeTypes);
        setFormData((prev) => {
          const hasSelected = activeTypes.some((type) => String(type.id) === String(prev.expenseTypeId));
          return {
            ...prev,
            expenseTypeId: hasSelected ? prev.expenseTypeId : String(activeTypes[0]?.id || ""),
          };
        });
      } catch (error) {
        console.error("Failed to load expense types", error);
        setExpenseTypes([]);
        setActiveExpenseTypes([]);
      }
    };

    loadExpenseTypes();
  }, []);

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
        expenseTypeId: categoryFilter !== "ALL" ? Number(categoryFilter) : undefined,
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
    if (!formData.expenseTypeId) {
      toast.error("Expense type is required");
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
        expenseTypeId: Number(formData.expenseTypeId),
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
    setFormData({ amount: "", expenseTypeId: String(activeExpenseTypes[0]?.id || ""), description: "", isFromDrawer: true });
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
      render: (expense) => (
        <span className="text-slate-500">
          {expense.shiftId ? `#${expense.shiftId}` : "Branch Expense"}
        </span>
      ),
    },
  ];

  return (
    <div className="page-enter space-y-6">
      <div className="page-section-enter flex flex-col justify-between gap-4 sm:flex-row sm:items-center" style={{ animationDelay: "40ms" }}>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Expenses</h1>
          <p className="text-sm text-slate-500 mt-1">Track drawer and branch expenses by date, category, and user.</p>
        </div>

        <Button
          onClick={() => setShowModal(true)}
          disabled={(isCashier && !hasActiveShift) || activeExpenseTypes.length === 0}
          className={(isCashier && !hasActiveShift) || activeExpenseTypes.length === 0 ? "opacity-50 cursor-not-allowed" : ""}
          title={isCashier && !hasActiveShift ? "You need an open shift to record expenses" : activeExpenseTypes.length === 0 ? "Add at least one active expense type first" : ""}
        >
          <Plus size={20} className="mr-2" />
          Record Expense
        </Button>
      </div>

      {isCashier && !hasActiveShift && (
        <Card className="ops-alert-card" style={{ animationDelay: "90ms" }}>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-medium text-yellow-800">
              No active shift. Please open a shift to view and record expenses.
            </p>
          </div>
        </Card>
      )}

      {activeExpenseTypes.length === 0 && (
        <Card className="ops-alert-card" style={{ animationDelay: "95ms" }}>
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-medium text-amber-800">
              No active expense types found. Add one from Expense Settings before recording expenses.
            </p>
          </div>
        </Card>
      )}

      <div className={`space-y-6 transition-all duration-300 ${isCashier && !hasActiveShift ? "opacity-40 grayscale pointer-events-none select-none" : ""}`}>
        <Card className="sales-panel-enter sales-panel-hover overflow-hidden p-0" style={{ animationDelay: "120ms" }}>
          <div className="inventory-filter-bar border-b border-slate-100 bg-slate-50/50 p-4" style={{ animationDelay: "150ms" }}>
            <div className="grid grid-cols-2 gap-3 min-[440px]:grid-cols-3 min-[620px]:grid-cols-4 xl:grid-cols-[minmax(240px,1fr)_160px_160px_220px_200px_auto] xl:items-center">
              <div className="relative col-span-full min-[440px]:col-span-3 min-[620px]:col-span-2 xl:col-span-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    resetPage();
                  }}
                  placeholder="Search description..."
                  ref={searchRef}
                  className="h-[42px] w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="col-span-1">
                <DatePicker
                  value={startDate}
                  onChange={(value) => {
                    setStartDate(value);
                    resetPage();
                  }}
                  buttonClassName="h-[42px] rounded-xl"
                />
              </div>

              <div className="col-span-1">
                <DatePicker
                  value={endDate}
                  onChange={(value) => {
                    setEndDate(value);
                    resetPage();
                  }}
                  buttonClassName="h-[42px] rounded-xl"
                />
              </div>

              <div className="col-span-1">
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
              </div>

              {isAdminOrManager && (
                <div className="col-span-1">
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
                </div>
              )}

              <div className="col-span-1">
                <Button type="button" variant="secondary" onClick={clearFilters} disabled={loading} className="h-[42px] w-full px-4 text-sm">
                  Clear
                </Button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-12">
              <LoadingSpinner size="lg" text="Loading..." />
            </div>
          ) : (
            <Table columns={columns} data={expenses} />
          )}

          <TablePagination
            summary={`Showing ${expenses.length} of ${totalElements} expenses. Page ${page + 1} of ${totalPages === 0 ? 1 : totalPages}`}
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

      <Modal isOpen={showModal} onClose={handleCloseModal} title="Record Expense">
        <form onSubmit={handleSubmit} className="space-y-4">
          {isAdminOrManager && hasActiveShift && (
            <div className="page-section-enter flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3" style={{ animationDelay: "60ms" }}>
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

          <div className="page-section-enter relative z-10" style={{ animationDelay: "100ms" }}>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <CustomSelect
              value={formData.expenseTypeId}
              onChange={(value) => setFormData({ ...formData, expenseTypeId: value })}
              options={modalCategoryOptions}
              valueKey="value"
              labelKey="label"
              placeholder="Select Expense Type"
            />
          </div>

          <div className="page-section-enter" style={{ animationDelay: "140ms" }}>
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

          <div className="page-section-enter" style={{ animationDelay: "180ms" }}>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              className="w-full border border-slate-300 rounded-lg px-3 py-2 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter expense details..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          <div className="page-section-enter flex gap-2 pt-4" style={{ animationDelay: "220ms" }}>
            <Button type="submit" className="flex-1">Record Expense</Button>
            <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Expenses;
