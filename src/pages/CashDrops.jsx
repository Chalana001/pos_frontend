import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Landmark, Plus, Search, TrendingDown } from "lucide-react";
import { cashDropsAPI } from "../api/cashDrops.api";
import { shiftsAPI } from "../api/shifts.api";
import { usersAPI } from "../api/users.api";
import { bankAccountsAPI } from "../api/bankAccounts.api";
import { useAuth } from "../context/AuthContext";
import { useBranch } from "../context/BranchContext";
import { useShift } from "../context/ShiftContext";
import { formatCurrency, formatDateTime, getLocalDateString } from "../utils/formatters";
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

const CashDrops = () => {
  const { user } = useAuth();
  const { selectedBranchId, branches } = useBranch();
  const { activeShift, refreshShift } = useShift();

  const isAdmin = useMemo(
    () => user?.role === "ADMIN" || user?.role === "MANAGER",
    [user?.role]
  );

  const currentShift = Array.isArray(activeShift) ? activeShift[0] : activeShift;
  const hasOpenShift = currentShift?.status === "OPEN" || !!currentShift;
  const today = getLocalDateString();

  const [cashDrops, setCashDrops] = useState([]);
  const [summary, setSummary] = useState({ totalAmount: 0, dropCount: 0, averageAmount: 0 });
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayTotalLoading, setTodayTotalLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useSearchOnType(setSearch);
  // This is a live operational log, not a report — it defaults to showing
  // EVERYTHING, not just today. A "today only" default filter reads as "this
  // is all the data there is" and makes real totals look wrong when they're
  // just hidden behind an invisible date filter (that's exactly what
  // happened here). The dedicated "Today's Drop" card below covers the
  // at-a-glance "how much went out today" need instead.
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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
    bankAccountId: "",
  });
  const [bankAccountOptions, setBankAccountOptions] = useState([{ value: "", label: "Cash / Safe (not banked yet)" }]);

  const [showOutsideModal, setShowOutsideModal] = useState(false);
  const [outsideSaving, setOutsideSaving] = useState(false);
  const [outsideForm, setOutsideForm] = useState({
    branchId: "",
    amount: "",
    reason: "",
    bankAccountId: "",
  });
  const branchOptions = (branches || []).filter((branch) => branch.id > 0);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCashDrops();
      fetchSummary();
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId, user?.role, search, startDate, endDate, cashierId, page]);

  // Deliberately its own effect, with its own params — "Today's Drop" stays
  // pinned to today regardless of whatever date range the table above is
  // filtered to, so it's a stable reference point rather than something that
  // silently changes meaning when someone adjusts the date filter.
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTodayTotal();
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId, user?.role, cashierId]);

  useEffect(() => {
    setPageInput(String(page + 1));
  }, [page]);

  useEffect(() => {
    const loadBankAccounts = async () => {
      try {
        const response = await bankAccountsAPI.listActive();
        const options = (Array.isArray(response.data) ? response.data : []).map((account) => ({
          value: String(account.id),
          label: account.bankName ? `${account.name} (${account.bankName})` : account.name,
        }));
        setBankAccountOptions([{ value: "", label: "Cash / Safe (not banked yet)" }, ...options]);
      } catch (error) {
        console.error("Failed to load bank accounts", error);
      }
    };

    loadBankAccounts();
  }, []);

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

  // Fixed to today's calendar date, on purpose — not built from
  // buildQueryParams(), which reads the table's adjustable startDate/endDate.
  const fetchTodayTotal = async () => {
    setTodayTotalLoading(true);
    try {
      const branchId = user?.role === "CASHIER" ? user?.branchId : selectedBranchId;
      const response = await cashDropsAPI.getSummary({
        branchId: branchId || 0,
        from: toLocalDateTimeParam(today),
        to: toLocalDateTimeParam(today, true),
        cashierUserId: cashierId !== "ALL" ? cashierId : undefined,
      });
      setTodayTotal(response.data?.totalAmount || 0);
    } catch (error) {
      console.error("Failed to fetch today's cash drop total", error);
      setTodayTotal(0);
    } finally {
      setTodayTotalLoading(false);
    }
  };

  const resetPage = () => setPage(0);

  const clearFilters = () => {
    setSearch("");
    setStartDate("");
    setEndDate("");
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
      const payload = {
        amount,
        reason,
        bankAccountId: formData.bankAccountId ? Number(formData.bankAccountId) : undefined,
      };

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
    setFormData({ amount: "", reason: "", bankAccountId: "" });
  };

  const handleOutsideSubmit = async (e) => {
    e.preventDefault();

    const branchId = outsideForm.branchId;
    if (!branchId) {
      toast.error("Select a branch");
      return;
    }

    const amount = Number(outsideForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Invalid amount");
      return;
    }

    const reason = outsideForm.reason.trim();
    if (!reason) {
      toast.error("Reason is required");
      return;
    }

    try {
      setOutsideSaving(true);
      await cashDropsAPI.createOutsideShift({
        branchId: Number(branchId),
        amount,
        reason,
        bankAccountId: outsideForm.bankAccountId ? Number(outsideForm.bankAccountId) : undefined,
      });

      toast.success("Bank deposit recorded");
      handleCloseOutsideModal();
      fetchCashDrops();
      fetchSummary();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to record bank deposit");
    } finally {
      setOutsideSaving(false);
    }
  };

  const handleCloseOutsideModal = () => {
    setShowOutsideModal(false);
    setOutsideForm({ branchId: "", amount: "", reason: "", bankAccountId: "" });
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
      header: "Bank Account",
      render: (drop) => (
        <span className="text-slate-600">{drop.bankAccountName || "—"}</span>
      ),
    },
    {
      header: "Shift",
      render: (drop) =>
        drop.outsideShift || !drop.shiftId ? (
          <span className="px-2 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-700">
            Outside Shift
          </span>
        ) : (
          <span className="text-slate-500">#{drop.shiftId}</span>
        ),
    },
  ];

  return (
    <div className="page-enter space-y-6">
      <div className="page-section-enter flex flex-col justify-between gap-4 sm:flex-row sm:items-center" style={{ animationDelay: "40ms" }}>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Cash Drops</h1>
          <p className="text-sm text-slate-500 mt-1">Review recorded cash removals by date, user, and reason.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <Button variant="secondary" onClick={() => setShowOutsideModal(true)}>
              <Landmark size={20} className="mr-2" />
              Bank Deposit (Outside Shift)
            </Button>
          )}
          <Button
            onClick={() => setShowModal(true)}
            disabled={!hasOpenShift}
            className={!hasOpenShift ? "opacity-50 cursor-not-allowed" : ""}
          >
            <Plus size={20} className="mr-2" />
            Record Drop
          </Button>
        </div>
      </div>

      {!hasOpenShift && (
        <Card className="ops-alert-card" style={{ animationDelay: "90ms" }}>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-medium text-yellow-800">
              No active shift. History is available, but recording a new cash drop requires an open shift.
            </p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <Card className="ops-summary-card shell-panel shell-panel-hover" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-slate-600 mb-2">
                Total Drop Amount
                {(startDate || endDate || search || cashierId !== "ALL") && (
                  <span className="ml-1 font-normal text-slate-400">(filtered)</span>
                )}
              </h3>
              <p className="text-2xl font-bold text-blue-600">
                {summaryLoading ? formatCurrency(0) : formatCurrency(summary.totalAmount)}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="text-blue-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="ops-summary-card shell-panel shell-panel-hover" style={{ animationDelay: "150ms" }}>
          <h3 className="text-sm font-medium text-slate-600 mb-2">Today's Drop</h3>
          <p className="text-2xl font-bold text-emerald-600">
            {todayTotalLoading ? formatCurrency(0) : formatCurrency(todayTotal)}
          </p>
        </Card>

        <Card className="ops-summary-card shell-panel shell-panel-hover" style={{ animationDelay: "180ms" }}>
          <h3 className="text-sm font-medium text-slate-600 mb-2">Number of Drops</h3>
          <p className="text-2xl font-bold text-slate-800">
            {summaryLoading ? "0" : summary.dropCount}
          </p>
        </Card>

        <Card className="ops-summary-card shell-panel shell-panel-hover" style={{ animationDelay: "210ms" }}>
          <h3 className="text-sm font-medium text-slate-600 mb-2">Average Drop</h3>
          <p className="text-2xl font-bold text-slate-800">
            {summaryLoading ? formatCurrency(0) : formatCurrency(summary.averageAmount)}
          </p>
        </Card>
      </div>

      <Card className="sales-panel-enter sales-panel-hover overflow-hidden p-0" style={{ animationDelay: "130ms" }}>
        <div className="inventory-filter-bar border-b border-slate-100 bg-slate-50/50 p-4" style={{ animationDelay: "170ms" }}>
          <div className={`grid grid-cols-2 gap-3 min-[440px]:grid-cols-3 min-[620px]:grid-cols-4 ${isAdmin ? "xl:grid-cols-[minmax(240px,1fr)_160px_160px_220px_auto]" : "xl:grid-cols-[minmax(260px,1fr)_180px_180px_auto]"} xl:items-center`}>
            <div className={`relative w-full col-span-full ${isAdmin ? "min-[620px]:col-span-2" : "min-[620px]:col-span-2"} min-[440px]:col-span-3 xl:col-span-1`}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input aria-label="Search reason..."
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  resetPage();
                }}
                placeholder="Search reason..."
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

            {isAdmin && (
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
              <Button type="button" variant="secondary" onClick={clearFilters} className="h-[42px] w-full px-4 text-sm" disabled={loading || summaryLoading}>
                Clear
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-12">
            <LoadingSpinner size="lg" text="Loading cash drops..." />
          </div>
        ) : (
          <Table columns={columns} data={cashDrops} />
        )}

        <TablePagination
          summary={`Showing ${cashDrops.length} of ${totalElements} cash drops. Page ${page + 1} of ${totalPages === 0 ? 1 : totalPages}`}
          page={page}
          pageInput={pageInput}
          totalPages={totalPages}
          loading={loading}
          onPageChange={setPage}
          onPageInputChange={setPageInput}
          onGoToPage={goToPage}
        />
      </Card>

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title="Record Cash Drop"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="page-section-enter" style={{ animationDelay: "60ms" }}>
            <label htmlFor="cashdrops-amount" className="block text-sm font-medium text-slate-700 mb-1">
              Amount *
            </label>
            <input id="cashdrops-amount"
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

          <div className="page-section-enter" style={{ animationDelay: "100ms" }}>
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

          <div className="page-section-enter" style={{ animationDelay: "120ms" }}>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Bank Account
            </label>
            <CustomSelect
              value={formData.bankAccountId}
              onChange={(value) => setFormData({ ...formData, bankAccountId: value })}
              options={bankAccountOptions}
              valueKey="value"
              labelKey="label"
              placeholder="Cash / Safe (not banked yet)"
            />
          </div>

          <div className="page-section-enter flex gap-2 pt-4" style={{ animationDelay: "140ms" }}>
            <Button type="submit" className="flex-1" disabled={!hasOpenShift}>
              Record Cash Drop
            </Button>
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showOutsideModal}
        onClose={handleCloseOutsideModal}
        title="Record Bank Deposit (Outside Shift)"
      >
        <form onSubmit={handleOutsideSubmit} className="space-y-4">
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-xs text-blue-800">
              For cash that's already out of a till — e.g. banking the day's collected cash after every
              shift is closed. This is just a record; it does not change any shift's expected cash.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Branch *</label>
            <CustomSelect
              value={outsideForm.branchId}
              onChange={(value) => setOutsideForm({ ...outsideForm, branchId: value })}
              options={branchOptions.map((branch) => ({ value: String(branch.id), label: branch.name }))}
              valueKey="value"
              labelKey="label"
              placeholder="Select a branch"
            />
          </div>

          <div>
            <label htmlFor="cashdrops-outside-amount" className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
            <input id="cashdrops-outside-amount"
              type="text"
              inputMode="decimal"
              value={outsideForm.amount}
              onChange={(e) => setOutsideForm({ ...outsideForm, amount: e.target.value })}
              className="input w-full"
              placeholder="0.00"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bank Account</label>
            <CustomSelect
              value={outsideForm.bankAccountId}
              onChange={(value) => setOutsideForm({ ...outsideForm, bankAccountId: value })}
              options={bankAccountOptions}
              valueKey="value"
              labelKey="label"
              placeholder="Cash / Safe (not banked yet)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason *</label>
            <textarea
              value={outsideForm.reason}
              onChange={(e) => setOutsideForm({ ...outsideForm, reason: e.target.value })}
              className="input w-full"
              rows="3"
              placeholder="e.g., End of day bank deposit"
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={outsideSaving}>
              {outsideSaving ? "Recording..." : "Record Bank Deposit"}
            </Button>
            <Button type="button" variant="secondary" onClick={handleCloseOutsideModal}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CashDrops;
