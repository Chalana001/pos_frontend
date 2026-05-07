import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Search } from "lucide-react";
import api from "../api/axios";
import { usersAPI } from "../api/users.api";
import { useAuth } from "../context/AuthContext";
import { useBranch } from "../context/BranchContext";
import { ADJUSTMENT_TYPES } from "../utils/constants";
import { formatDateTime } from "../utils/formatters";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import CustomSelect from "../components/common/CustomSelect";
import LoadingSpinner from "../components/common/LoadingSpinner";
import Table from "../components/common/Table";

const adjustmentTypeOptions = [
  { value: "ALL", label: "All Types" },
  ...Object.values(ADJUSTMENT_TYPES).map((type) => ({
    value: type,
    label: type.charAt(0) + type.slice(1).toLowerCase(),
  })),
];

const formatQty = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return String(value ?? "");
  }
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(3).replace(/\.?0+$/, "");
};

const StockAdjustments = () => {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();

  const [adjustments, setAdjustments] = useState([]);
  const [users, setUsers] = useState([{ value: "ALL", label: "All Users" }]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [userId, setUserId] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(0);
  const [pageInput, setPageInput] = useState("1");
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const branchId = selectedBranchId || user?.branchId || 0;

  useEffect(() => {
    const loadUsers = async () => {
      const allOption = { value: "ALL", label: "All Users" };
      try {
        const response = await usersAPI.salesFilter(branchId > 0 ? { branchId } : {});
        const options = (Array.isArray(response.data) ? response.data : []).map((entry) => ({
          value: String(entry.id),
          label: entry.username || `User ${entry.id}`,
        }));
        setUsers([allOption, ...options]);
        if (userId !== "ALL" && !options.some((option) => option.value === String(userId))) {
          setUserId("ALL");
        }
      } catch (error) {
        console.error("Failed to load users for stock adjustments", error);
        setUsers([allOption]);
      }
    };

    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAdjustments();
    }, 250);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, fromDate, page, search, toDate, type, userId]);

  useEffect(() => {
    setPageInput(String(page + 1));
  }, [page]);

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const response = await api.get("/stock-adjustments", {
        params: {
          branchId,
          search: search.trim() || undefined,
          type: type !== "ALL" ? type : undefined,
          userId: userId !== "ALL" ? userId : undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
          page,
          size: pageSize,
        },
      });

      const content = response.data?.content || [];
      setAdjustments(content);
      setTotalPages(response.data?.totalPages || 0);
      setTotalElements(response.data?.totalElements || content.length);
    } catch (error) {
      console.error("Failed to fetch adjustments", error);
      toast.error("Failed to fetch adjustments");
      setAdjustments([]);
      setTotalPages(0);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  };

  const resetPage = () => setPage(0);

  const clearFilters = () => {
    setSearch("");
    setType("ALL");
    setUserId("ALL");
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

  const showBranchColumn = Number(branchId) === 0;

  const columns = useMemo(() => {
    const baseColumns = [
      {
        header: "Date & Time",
        render: (adj) => formatDateTime(adj.createdAt),
      },
      { header: "Item", accessor: "itemName" },
      {
        header: "Type",
        render: (adj) => {
          const positiveTypes = ["FOUND", "MANUAL"];
          const positive = positiveTypes.includes(adj.type);
          return (
            <span className={`rounded-full px-2 py-1 text-xs font-medium ${positive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              {adj.type?.replace("_", " ")}
            </span>
          );
        },
      },
      {
        header: "Quantity",
        render: (adj) => {
          const qtyValue = Number(adj.displayQtyChange ?? adj.qtyChange ?? 0);
          const isPositive = qtyValue > 0;
          const unit = adj.qtyUnit ? ` ${adj.qtyUnit}` : "";
          return (
            <span className={`font-semibold ${isPositive ? "text-green-600" : "text-red-600"}`}>
              {isPositive ? "+" : ""}
              {formatQty(qtyValue)}
              {unit}
            </span>
          );
        },
      },
      {
        header: "Reason",
        render: (adj) => (
          <span className="block max-w-[280px] truncate" title={adj.reason}>
            {adj.reason || "-"}
          </span>
        ),
      },
      { header: "By", render: (adj) => adj.username || "-" },
    ];

    if (showBranchColumn) {
      baseColumns.splice(2, 0, { header: "Branch", render: (adj) => adj.branchName || "-" });
    }

    return baseColumns;
  }, [showBranchColumn]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Stock Adjustments History</h1>
        <p className="mt-1 text-sm text-slate-500">Track manual stock corrections, damaged items, and found stock changes.</p>
      </div>

      <Card className="overflow-hidden border border-slate-200 p-0">
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative w-full xl:min-w-[280px] xl:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  resetPage();
                }}
                placeholder="Search item, barcode, or reason..."
                className="h-[42px] w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="w-full xl:w-40 xl:shrink-0">
              <CustomSelect
                value={type}
                onChange={(value) => {
                  setType(value);
                  resetPage();
                }}
                options={adjustmentTypeOptions}
                valueKey="value"
                labelKey="label"
                buttonClassName="h-[42px]"
              />
            </div>

            <div className="w-full xl:w-40 xl:shrink-0">
              <CustomSelect
                value={userId}
                onChange={(value) => {
                  setUserId(value);
                  resetPage();
                }}
                options={users}
                valueKey="value"
                labelKey="label"
                buttonClassName="h-[42px]"
              />
            </div>

            <div className="w-full xl:w-44 xl:shrink-0">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  resetPage();
                }}
                className="h-[42px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="w-full xl:w-44 xl:shrink-0">
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
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
            <LoadingSpinner size="lg" text="Loading adjustments..." />
          </div>
        ) : (
          <Table columns={columns} data={adjustments} />
        )}

        <div className="flex flex-col items-center justify-between gap-4 border-t bg-slate-50 p-4 lg:flex-row">
          <span className="text-sm text-slate-500">
            Page {page + 1} of {totalPages === 0 ? 1 : totalPages} | Total: {totalElements}
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
  );
};

export default StockAdjustments;
