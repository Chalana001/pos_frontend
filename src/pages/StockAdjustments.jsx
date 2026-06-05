import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Search } from "lucide-react";
import api from "../api/axios";
import { usersAPI } from "../api/users.api";
import { useAuth } from "../context/AuthContext";
import { useBranch } from "../context/BranchContext";
import { ADJUSTMENT_TYPES } from "../utils/constants";
import { formatDateTime } from "../utils/formatters";
import { formatStockQuantity } from "../utils/stockQuantity";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import CustomSelect from "../components/common/CustomSelect";
import DatePicker from "../components/common/DatePicker";
import LoadingSpinner from "../components/common/LoadingSpinner";
import Table from "../components/common/Table";
import TablePagination from "../components/common/TablePagination";

const adjustmentTypeOptions = [
  { value: "ALL", label: "All Types" },
  ...Object.values(ADJUSTMENT_TYPES).map((type) => ({
    value: type,
    label: type.charAt(0) + type.slice(1).toLowerCase(),
  })),
];

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
          const positiveTypes = ["FOUND", "NEW_STOCK", "MANUAL"];
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
              {formatStockQuantity(qtyValue)}
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
    <div className="page-enter space-y-6">
      <div className="page-section-enter" style={{ animationDelay: "40ms" }}>
        <h1 className="text-3xl font-bold text-slate-800">Stock Adjustments History</h1>
        <p className="mt-1 text-sm text-slate-500">Track manual stock corrections, damaged items, and found stock changes.</p>
      </div>

      <Card className="sales-panel-enter sales-panel-hover overflow-hidden border border-slate-200 p-0" style={{ animationDelay: "90ms" }}>
        <div className="inventory-filter-bar border-b border-slate-100 bg-slate-50/50 p-4" style={{ animationDelay: "130ms" }}>
          <div className="grid grid-cols-2 gap-3 min-[440px]:grid-cols-3 min-[620px]:grid-cols-4 xl:grid-cols-12 xl:items-center">
            <div className="relative col-span-full min-[440px]:col-span-3 min-[620px]:col-span-4 xl:col-span-4">
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

            <div className="col-span-1 xl:col-span-2">
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

            <div className="col-span-1 xl:col-span-2">
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

            <div className="col-span-1 xl:col-span-2">
              <DatePicker
                value={fromDate}
                onChange={(value) => {
                  setFromDate(value);
                  resetPage();
                }}
                buttonClassName="h-[42px] rounded-xl"
              />
            </div>

            <div className="col-span-1 xl:col-span-2">
              <DatePicker
                value={toDate}
                onChange={(value) => {
                  setToDate(value);
                  resetPage();
                }}
                buttonClassName="h-[42px] rounded-xl"
              />
            </div>

            <div className="col-span-1 xl:col-span-2">
              <Button type="button" variant="secondary" onClick={clearFilters} className="h-[42px] w-full px-4 text-sm" disabled={loading}>
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

        <TablePagination
          summary={`Page ${page + 1} of ${totalPages === 0 ? 1 : totalPages} | Total: ${totalElements}`}
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

export default StockAdjustments;
