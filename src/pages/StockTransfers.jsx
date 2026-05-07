import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { ArrowLeft, ArrowRight, Check, Search } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useBranch } from "../context/BranchContext";
import { formatDateTime } from "../utils/formatters";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Table from "../components/common/Table";
import LoadingSpinner from "../components/common/LoadingSpinner";
import CustomSelect from "../components/common/CustomSelect";

const transferStatusOptions = [
  { value: "ALL", label: "All Status" },
  { value: "IN_TRANSIT", label: "In Transit" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELED", label: "Canceled" },
];

const StockTransfers = () => {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();

  const [activeTab, setActiveTab] = useState("outgoing");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);

  const [outgoing, setOutgoing] = useState([]);
  const [outgoingPage, setOutgoingPage] = useState(0);
  const [outgoingPageInput, setOutgoingPageInput] = useState("1");
  const [outgoingTotalPages, setOutgoingTotalPages] = useState(0);
  const [outgoingTotalElements, setOutgoingTotalElements] = useState(0);

  const [incoming, setIncoming] = useState([]);
  const [incomingPage, setIncomingPage] = useState(0);
  const [incomingPageInput, setIncomingPageInput] = useState("1");
  const [incomingTotalPages, setIncomingTotalPages] = useState(0);
  const [incomingTotalElements, setIncomingTotalElements] = useState(0);

  const pageSize = 10;
  const branchId = selectedBranchId || user?.branchId || 0;

  useEffect(() => {
    if (activeTab === "outgoing") {
      setOutgoingPageInput(String(outgoingPage + 1));
    } else {
      setIncomingPageInput(String(incomingPage + 1));
    }
  }, [activeTab, incomingPage, outgoingPage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransfers();
    }, 250);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, branchId, fromDate, incomingPage, outgoingPage, search, status, toDate]);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const currentPage = activeTab === "outgoing" ? outgoingPage : incomingPage;
      const response = await api.get(`/stock-transfers/${activeTab}`, {
        params: {
          branchId,
          search: search.trim() || undefined,
          status: status !== "ALL" ? status : undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
          page: currentPage,
          size: pageSize,
        },
      });

      const content = response.data?.content || [];
      if (activeTab === "outgoing") {
        setOutgoing(content);
        setOutgoingTotalPages(response.data?.totalPages || 0);
        setOutgoingTotalElements(response.data?.totalElements || content.length);
      } else {
        setIncoming(content);
        setIncomingTotalPages(response.data?.totalPages || 0);
        setIncomingTotalElements(response.data?.totalElements || content.length);
      }
    } catch (error) {
      console.error("Failed to fetch transfers", error);
      toast.error("Failed to fetch transfers");
      if (activeTab === "outgoing") {
        setOutgoing([]);
        setOutgoingTotalPages(0);
        setOutgoingTotalElements(0);
      } else {
        setIncoming([]);
        setIncomingTotalPages(0);
        setIncomingTotalElements(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetCurrentPage = () => {
    if (activeTab === "outgoing") {
      setOutgoingPage(0);
    } else {
      setIncomingPage(0);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("ALL");
    setFromDate("");
    setToDate("");
    resetCurrentPage();
  };

  const handleReceive = async (id) => {
    try {
      await api.post(`/stock-transfers/${id}/receive`);
      toast.success("Transfer received successfully");
      fetchTransfers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to receive transfer");
    }
  };

  const handleCancel = async (id) => {
    try {
      await api.post(`/stock-transfers/${id}/cancel`, { reason: "Cancelled by user" });
      toast.success("Transfer cancelled successfully");
      fetchTransfers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to cancel transfer");
    }
  };

  const getStatusBadge = (statusValue) => {
    if (statusValue === "IN_TRANSIT") {
      return "bg-amber-100 text-amber-800";
    }
    if (statusValue === "COMPLETED") {
      return "bg-green-100 text-green-800";
    }
    return "bg-red-100 text-red-800";
  };

  const outgoingColumns = useMemo(
    () => [
      {
        header: "Date",
        render: (transfer) => formatDateTime(transfer.requestedAt),
      },
      { header: "Transfer No", accessor: "transferNo" },
      { header: "To Branch", accessor: "toBranchName" },
      {
        header: "Items",
        render: (transfer) => transfer.items?.length || 0,
      },
      {
        header: "Note",
        render: (transfer) => (
          <span className="block max-w-[240px] truncate" title={transfer.note}>
            {transfer.note || "-"}
          </span>
        ),
      },
      {
        header: "Status",
        render: (transfer) => (
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadge(transfer.status)}`}>
            {transfer.status?.replace("_", " ")}
          </span>
        ),
      },
      {
        header: "Actions",
        render: (transfer) =>
          transfer.status === "IN_TRANSIT" ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                handleCancel(transfer.id);
              }}
            >
              Cancel
            </Button>
          ) : (
            <span className="text-slate-400">-</span>
          ),
      },
    ],
    []
  );

  const incomingColumns = useMemo(
    () => [
      {
        header: "Date",
        render: (transfer) => formatDateTime(transfer.requestedAt),
      },
      { header: "Transfer No", accessor: "transferNo" },
      { header: "From Branch", accessor: "fromBranchName" },
      {
        header: "Items",
        render: (transfer) => transfer.items?.length || 0,
      },
      {
        header: "Note",
        render: (transfer) => (
          <span className="block max-w-[240px] truncate" title={transfer.note}>
            {transfer.note || "-"}
          </span>
        ),
      },
      {
        header: "Status",
        render: (transfer) => (
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadge(transfer.status)}`}>
            {transfer.status?.replace("_", " ")}
          </span>
        ),
      },
      {
        header: "Actions",
        render: (transfer) =>
          transfer.status === "IN_TRANSIT" ? (
            <Button
              size="sm"
              variant="success"
              onClick={(e) => {
                e.stopPropagation();
                handleReceive(transfer.id);
              }}
            >
              <Check size={16} className="mr-1" />
              Receive
            </Button>
          ) : (
            <span className="text-slate-400">-</span>
          ),
      },
    ],
    []
  );

  const currentData = activeTab === "outgoing" ? outgoing : incoming;
  const currentPage = activeTab === "outgoing" ? outgoingPage : incomingPage;
  const currentTotalPages = activeTab === "outgoing" ? outgoingTotalPages : incomingTotalPages;
  const currentTotalElements = activeTab === "outgoing" ? outgoingTotalElements : incomingTotalElements;
  const currentPageInput = activeTab === "outgoing" ? outgoingPageInput : incomingPageInput;

  const setCurrentPage = (value) => {
    if (activeTab === "outgoing") {
      setOutgoingPage(value);
    } else {
      setIncomingPage(value);
    }
  };

  const setCurrentPageInput = (value) => {
    if (activeTab === "outgoing") {
      setOutgoingPageInput(value);
    } else {
      setIncomingPageInput(value);
    }
  };

  const goToPage = () => {
    const requestedPage = Number(currentPageInput);
    if (!Number.isInteger(requestedPage)) {
      setCurrentPageInput(String(currentPage + 1));
      return;
    }
    const maxPage = currentTotalPages > 0 ? currentTotalPages : 1;
    setCurrentPage(Math.min(Math.max(requestedPage, 1), maxPage) - 1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Stock Transfers</h1>
        <p className="mt-1 text-sm text-slate-500">Review branch-to-branch stock movements, receipts, and cancellations.</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("outgoing")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "outgoing" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-600 hover:text-slate-800"
          }`}
        >
          <ArrowRight size={18} className="mr-1 inline" />
          Outgoing
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("incoming")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "incoming" ? "border-b-2 border-blue-600 text-blue-600" : "text-slate-600 hover:text-slate-800"
          }`}
        >
          <ArrowLeft size={18} className="mr-1 inline" />
          Incoming
        </button>
      </div>

      <Card className="overflow-hidden border border-slate-200 p-0">
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="relative w-full xl:min-w-[320px] xl:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  resetCurrentPage();
                }}
                placeholder="Search transfer no, item, barcode, or note..."
                className="h-[42px] w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="w-full xl:w-48 xl:shrink-0">
              <CustomSelect
                value={status}
                onChange={(value) => {
                  setStatus(value);
                  resetCurrentPage();
                }}
                options={transferStatusOptions}
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
                  resetCurrentPage();
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
                  resetCurrentPage();
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
            <LoadingSpinner size="lg" text="Loading transfers..." />
          </div>
        ) : (
          <Table columns={activeTab === "outgoing" ? outgoingColumns : incomingColumns} data={currentData} />
        )}

        <div className="flex flex-col items-center justify-between gap-4 border-t bg-slate-50 p-4 lg:flex-row">
          <span className="text-sm text-slate-500">
            Page {currentPage + 1} of {currentTotalPages === 0 ? 1 : currentTotalPages} | Total: {currentTotalElements}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button disabled={currentPage === 0 || loading} onClick={() => setCurrentPage(currentPage - 1)} variant="secondary" className="px-3 py-1 text-sm">
              Prev
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Go to</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={currentPageInput}
                onChange={(e) => setCurrentPageInput(e.target.value)}
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
            <Button
              disabled={currentPage >= currentTotalPages - 1 || loading}
              onClick={() => setCurrentPage(currentPage + 1)}
              variant="secondary"
              className="px-3 py-1 text-sm"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StockTransfers;
