import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Plus, Search, TrendingDown } from "lucide-react";
import { cashDropsAPI } from "../api/cashDrops.api";
import { shiftsAPI } from "../api/shifts.api";
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

const toLocalDateTimeParam = (date, endOfDay = false) => {
  if (!date) return undefined;
  return `${date}T${endOfDay ? "23:59:59" : "00:00:00"}`;
};

const CashDrops = () => {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();
  const { activeShift, refreshShift } = useShift();

  const isAdmin = useMemo(
    () => user?.role === "ADMIN" || user?.role === "MANAGER",
    [user?.role]
  );

  const currentShift = Array.isArray(activeShift) ? activeShift[0] : activeShift;
  const hasOpenShift = currentShift?.status === "OPEN" || !!currentShift;
  const today = new Date().toISOString().split("T")[0];

  const [cashDrops, setCashDrops] = useState([]);
  const [summary, setSummary] = useState({ totalAmount: 0, dropCount: 0, averageAmount: 0 });
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [cashierId, setCashierId] = useState("ALL");
  const [cashierOptions, setCashierOptions] = useState([{ value: "ALL", label: "All Users" }]);
  const [page, setPage] = useState(0);
  const [pageInput, setPageInput] = useState("1");
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [formData, setFormData] = useState({
    amount: "",
    reason: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCashDrops();
      fetchSummary();
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId, user?.role, search, startDate, endDate, cashierId, page]);

  useEffect(() => {
    setPageInput(String(page + 1));
  }, [page]);

  useEffect(() => {
    const loadCashiers = async () => {
      if (!isAdmin) {
        return;
      }

      const allOption = { value: "ALL", label: "All Users" };
      try {
        const branchId = selectedBranchId > 0 ? selectedBranchId : user?.branchId;
        const response = await usersAPI.salesFilter(branchId ? { branchId } : {});
        const options = (Array.isArray(response.data) ? response.data : []).map((cashier) => ({
          value: String(cashier.id),
          label: cashier.username || `User ${cashier.id}`,
        }));

        setCashierOptions([allOption, ...options]);
        if (cashierId !== "ALL" && !options.some((option) => option.value === String(cashierId))) {
          setCashierId("ALL");
          setPage(0);
        }
      } catch (error) {
        console.error("Failed to load cash drop users", error);
        setCashierOptions([allOption]);
      }
    };

    loadCashiers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, selectedBranchId, user?.branchId]);

  const buildQueryParams = (includePaging = true) => {
    const branchId = user?.role === "CASHIER" ? user?.branchId : selectedBranchId;
    const params = {
      branchId: branchId || 0,
      from: toLocalDateTimeParam(startDate),
      to: toLocalDateTimeParam(endDate, true),
      search: search.trim() || undefined,
      cashierUserId: cashierId !== "ALL" ? cashierId : undefined,
    };

    if (includePaging) {
      params.page = page;
      params.size = pageSize;
    }

    return params;
  };

  const fetchCashDrops = async () => {
    setLoading(true);
    try {
      const response = await cashDropsAPI.getAll(buildQueryParams(true));
      const content = response.data?.content || [];
      setCashDrops(content);
      setTotalPages(response.data?.totalPages || 0);
      setTotalElements(response.data?.totalElements || content.length);
    } catch (err) {
      toast.error("Failed to fetch cash drops");
      setCashDrops([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const response = await cashDropsAPI.getSummary(buildQueryParams(false));
      setSummary({
        totalAmount: response.data?.totalAmount || 0,
        dropCount: response.data?.dropCount || 0,
        averageAmount: response.data?.averageAmount || 0,
      });
    } catch (error) {
      console.error("Failed to fetch cash drop summary", error);
      setSummary({ totalAmount: 0, dropCount: 0, averageAmount: 0 });
    } finally {
      setSummaryLoading(false);
    }
  };

  const resetPage = () => setPage(0);

  const clearFilters = () => {
    setSearch("");
    setStartDate(today);
    setEndDate(today);
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

    if (!hasOpenShift) {
      toast.error("No active shift. Please open a shift first.");
      return;
    }

    const amount = Number(formData.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Invalid amount");
      return;
    }

    const reason = formData.reason.trim();
    if (!reason) {
      toast.error("Reason is required");
      return;
    }

    try {
      const payload = { amount, reason };

      if (isAdmin) {
        await shiftsAPI.cashdropById(currentShift.id, payload);
      } else {
        await shiftsAPI.addCashDropMine(payload);
      }

      toast.success("Cash drop recorded successfully");
      handleCloseModal();
      refreshShift?.();
      fetchCashDrops();
      fetchSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record cash drop");
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ amount: "", reason: "" });
  };

  const columns = [
    {
      header: "Date & Time",
      render: (drop) => formatDateTime(drop.createdAt),
    },
    {
      header: "Reason",
      render: (drop) => (
        <span className="max-w-[340px] truncate block" title={drop.reason}>
          {drop.reason}
        </span>
      ),
    },
    {
      header: "Amount",
      render: (drop) => (
        <span className="font-semibold text-blue-600">
          {formatCurrency(drop.amount)}
        </span>
      ),
    },
    { header: "Recorded By", accessor: "cashierName" },
    {
      header: "Shift",
      render: (drop) => <span className="text-slate-500">#{drop.shiftId}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Cash Drops</h1>
          <p className="text-sm text-slate-500 mt-1">Review recorded cash removals by date, user, and reason.</p>
        </div>

        <Button
          onClick={() => setShowModal(true)}
          disabled={!hasOpenShift}
          className={!hasOpenShift ? "opacity-50 cursor-not-allowed" : ""}
        >
          <Plus size={20} className="mr-2" />
          Record Drop
        </Button>
      </div>

      {!hasOpenShift && (
        <Card>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-medium text-yellow-800">
              No active shift. History is available, but recording a new cash drop requires an open shift.
            </p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-slate-600 mb-2">Total Drop Amount</h3>
              <p className="text-2xl font-bold text-blue-600">
                {summaryLoading ? formatCurrency(0) : formatCurrency(summary.totalAmount)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="text-blue-600" size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-slate-600 mb-2">Number of Drops</h3>
          <p className="text-2xl font-bold text-slate-800">
            {summaryLoading ? "0" : summary.dropCount}
          </p>
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-slate-600 mb-2">Average Drop</h3>
          <p className="text-2xl font-bold text-slate-800">
            {summaryLoading ? formatCurrency(0) : formatCurrency(summary.averageAmount)}
          </p>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <div className={`grid grid-cols-1 gap-3 ${isAdmin ? "xl:grid-cols-[minmax(240px,1fr)_160px_160px_220px_auto]" : "xl:grid-cols-[minmax(260px,1fr)_180px_180px_auto]"} xl:items-center`}>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  resetPage();
                }}
                placeholder="Search reason..."
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

            {isAdmin && (
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

            <Button type="button" variant="secondary" onClick={clearFilters} className="h-[42px] px-4 text-sm" disabled={loading || summaryLoading}>
              Clear
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-12">
            <LoadingSpinner size="lg" text="Loading cash drops..." />
          </div>
        ) : (
          <Table columns={columns} data={cashDrops} />
        )}

        <div className="flex flex-col lg:flex-row justify-between items-center p-4 bg-slate-50 border-t gap-4">
          <span className="text-sm text-slate-500">
            Showing {cashDrops.length} of {totalElements} cash drops. Page {page + 1} of {totalPages === 0 ? 1 : totalPages}
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

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title="Record Cash Drop"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Amount *
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              className="input w-full"
              placeholder="0.00"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Reason *
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) =>
                setFormData({ ...formData, reason: e.target.value })
              }
              className="input w-full"
              rows="3"
              placeholder="e.g., Safe deposit, Bank deposit, etc."
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={!hasOpenShift}>
              Record Cash Drop
            </Button>
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CashDrops;
