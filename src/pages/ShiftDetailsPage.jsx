import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Landmark,
  MapPin,
  Printer,
  Receipt,
  Search,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { shiftsAPI } from "../api/shifts.api";
import { cashDropsAPI } from "../api/cashDrops.api";
import Card from "../components/common/Card";
import Table from "../components/common/Table";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ShiftCloseDialog from "../components/shifts/ShiftCloseDialog";
import TablePagination from "../components/common/TablePagination";
import CustomSelect from "../components/common/CustomSelect";
import { resolvePaymentIcon } from "../utils/paymentMethodIcons";
import { formatCurrency, formatDateTime, formatTime } from "../utils/formatters";

const formatCategoryLabel = (value) => value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

const fetchAllPages = async (fetchPage) => {
  const firstResponse = await fetchPage(0);
  const firstData = firstResponse?.data || {};
  const firstContent = Array.isArray(firstData.content) ? firstData.content : [];
  const totalPages = Number(firstData.totalPages || 1);
  if (totalPages <= 1) return firstContent;

  const otherPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => fetchPage(index + 1))
  );
  return [
    ...firstContent,
    ...otherPages.flatMap((response) => Array.isArray(response?.data?.content) ? response.data.content : []),
  ];
};

const getPaymentLabel = (sale) => {
  const paidAmount = Number(sale?.paidAmount || 0);
  const dueAmount = Number(sale?.dueAmount || 0);
  const method = (sale?.paymentMethod || "CASH").replace("_", " ");

  if (paidAmount > 0 && dueAmount > 0) return `${method} + Credit`;
  if (dueAmount > 0) return "Credit";
  return sale?.orderType === "CREDIT" ? "Credit" : method;
};

// Pagination only earns its screen space when there is more than one page.
// A 2-record table with the footer hidden reads cleaner than one with a
// disabled Prev/Next and a "Page 1 of 1" summary.
const PaginationWhenNeeded = (props) => {
  const { totalElements, pageSize, ...rest } = props;
  if (Number(totalElements || 0) <= Number(pageSize || 0)) return null;
  return <TablePagination {...rest} />;
};

const shiftDuration = (openedAt, closedAt) => {
  if (!openedAt) return "—";
  const start = new Date(openedAt).getTime();
  const end = closedAt ? new Date(closedAt).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return "—";
  const minutes = Math.round((end - start) / 60000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const ShiftDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [shift, setShift] = useState(null);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expensesAmount, setExpensesAmount] = useState(0);
  const [cashDrops, setCashDrops] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [purchasesAmount, setPurchasesAmount] = useState(0);
  const [cashDropsTotal, setCashDropsTotal] = useState(0);
  const [cashDropsTotalPages, setCashDropsTotalPages] = useState(0);
  const [cashDropsLoading, setCashDropsLoading] = useState(true);
  const [cashDropsPage, setCashDropsPage] = useState(0);
  const [cashDropsPageInput, setCashDropsPageInput] = useState("1");
  const [purchasesTotal, setPurchasesTotal] = useState(0);
  const [purchasesTotalPages, setPurchasesTotalPages] = useState(0);
  const [purchasesLoading, setPurchasesLoading] = useState(true);
  const [purchasesPage, setPurchasesPage] = useState(0);
  const [purchasesPageInput, setPurchasesPageInput] = useState("1");
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(false);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pageInput, setPageInput] = useState("1");
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [expensesPage, setExpensesPage] = useState(0);
  const [expensesPageInput, setExpensesPageInput] = useState("1");
  const [expensesTotalPages, setExpensesTotalPages] = useState(0);
  const [expensesTotalElements, setExpensesTotalElements] = useState(0);
  const [showCloseModal, setShowCloseModal] = useState(false);

  // Sales table controls: invoice search and payment-method filter are
  // client-side over the fetched page — the API has no server-side filter for
  // these yet, and the shift's own sales list is small enough that this stays
  // honest: filtered rows are the page's real rows.
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("ALL");

  // Derived values live above the loading early-return so hook order stays
  // stable across renders.
  const paymentRows = useMemo(() => paymentSummary?.methods || [], [paymentSummary]);
  const paymentFilterOptions = useMemo(() => [
    { value: "ALL", label: "All methods" },
    ...paymentRows.map((m) => ({ value: m.code, label: m.displayName })),
  ], [paymentRows]);
  const filteredSales = useMemo(() => sales.filter((sale) => {
    const matchesInvoice = !invoiceSearch.trim()
      || (sale.invoiceNo || "").toLowerCase().includes(invoiceSearch.trim().toLowerCase());
    const matchesPayment = paymentFilter === "ALL" || sale.paymentMethod === paymentFilter;
    return matchesInvoice && matchesPayment;
  }), [sales, invoiceSearch, paymentFilter]);

  const loadShift = async () => {
    setLoading(true);
    try {
      const response = await shiftsAPI.getById(id);
      setShift(response.data);
    } catch (error) {
      console.error("Failed to load shift", error);
      setShift(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShift();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    shiftsAPI.getPaymentSummary(id)
      .then((response) => { if (!cancelled) setPaymentSummary(response.data); })
      .catch((error) => {
        console.error("Failed to load shift payment summary", error);
        if (!cancelled) setPaymentSummary(null);
      });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchAllPages((page) => shiftsAPI.getExpenses(id, { page, size: 100 })),
      fetchAllPages((page) => shiftsAPI.getPurchases(id, { page, size: 100 })),
    ])
      .then(([allExpenses, allPurchases]) => {
        if (cancelled) return;
        setExpensesAmount(allExpenses.reduce((total, expense) => total + Number(expense.amount || 0), 0));
        setPurchasesAmount(allPurchases
          .filter((purchase) => purchase.status !== "CANCELED")
          .reduce((total, purchase) => total + Number(purchase.cashSourceAmount || 0), 0));
      })
      .catch((error) => {
        console.error("Failed to calculate shift expense and purchase totals", error);
        if (!cancelled) {
          setExpensesAmount(0);
          setPurchasesAmount(0);
        }
      });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setCashDropsLoading(true);
    cashDropsAPI.getAll({ shiftId: id, page: cashDropsPage, size: 5 })
      .then((response) => {
        if (cancelled) return;
        setCashDrops(response.data?.content || []);
        setCashDropsTotal(response.data?.totalElements || 0);
        setCashDropsTotalPages(response.data?.totalPages || 0);
      })
      .catch((error) => {
        console.error("Failed to load shift cash drops", error);
        if (!cancelled) {
          setCashDrops([]);
          setCashDropsTotal(0);
          setCashDropsTotalPages(0);
        }
      })
      .finally(() => { if (!cancelled) setCashDropsLoading(false); });
    return () => { cancelled = true; };
  }, [id, cashDropsPage]);

  useEffect(() => {
    let cancelled = false;
    setPurchasesLoading(true);
    shiftsAPI.getPurchases(id, { page: purchasesPage, size: 5 })
      .then((response) => {
        if (cancelled) return;
        setPurchases(response.data?.content || []);
        setPurchasesTotal(response.data?.totalElements || 0);
        setPurchasesTotalPages(response.data?.totalPages || 0);
      })
      .catch((error) => {
        console.error("Failed to load shift drawer purchases", error);
        if (!cancelled) {
          setPurchases([]);
          setPurchasesTotal(0);
          setPurchasesTotalPages(0);
        }
      })
      .finally(() => { if (!cancelled) setPurchasesLoading(false); });
    return () => { cancelled = true; };
  }, [id, purchasesPage]);

  useEffect(() => {
    const loadSales = async () => {
      setSalesLoading(true);
      try {
        const response = await shiftsAPI.getOrders(id, { page, size: pageSize });
        const content = response.data?.content || [];
        setSales(content);
        setTotalPages(response.data?.totalPages || 0);
        setTotalElements(response.data?.totalElements || content.length);
      } catch (error) {
        console.error("Failed to load shift sales", error);
        setSales([]);
        setTotalPages(0);
        setTotalElements(0);
      } finally {
        setSalesLoading(false);
      }
    };

    loadSales();
  }, [id, page, pageSize]);

  useEffect(() => {
    const loadExpenses = async () => {
      setExpensesLoading(true);
      try {
        const response = await shiftsAPI.getExpenses(id, { page: expensesPage, size: pageSize });
        const content = response.data?.content || [];
        setExpenses(content);
        setExpensesTotalPages(response.data?.totalPages || 0);
        setExpensesTotalElements(response.data?.totalElements || content.length);
      } catch (error) {
        console.error("Failed to load shift expenses", error);
        setExpenses([]);
        setExpensesTotalPages(0);
        setExpensesTotalElements(0);
      } finally {
        setExpensesLoading(false);
      }
    };

    loadExpenses();
  }, [id, expensesPage, pageSize]);

  useEffect(() => {
    setPageInput(String(page + 1));
  }, [page]);

  useEffect(() => {
    setExpensesPageInput(String(expensesPage + 1));
  }, [expensesPage]);

  useEffect(() => {
    setCashDropsPageInput(String(cashDropsPage + 1));
  }, [cashDropsPage]);

  useEffect(() => {
    setPurchasesPageInput(String(purchasesPage + 1));
  }, [purchasesPage]);

  const goToPage = () => {
    const requestedPage = Number(pageInput);
    if (!Number.isInteger(requestedPage)) {
      setPageInput(String(page + 1));
      return;
    }

    const maxPage = totalPages > 0 ? totalPages : 1;
    setPage(Math.min(Math.max(requestedPage, 1), maxPage) - 1);
  };

  const goToExpensesPage = () => {
    const requestedPage = Number(expensesPageInput);
    if (!Number.isInteger(requestedPage)) {
      setExpensesPageInput(String(expensesPage + 1));
      return;
    }

    const maxPage = expensesTotalPages > 0 ? expensesTotalPages : 1;
    setExpensesPage(Math.min(Math.max(requestedPage, 1), maxPage) - 1);
  };

  const goToCashDropsPage = () => {
    const requestedPage = Number(cashDropsPageInput);
    if (!Number.isInteger(requestedPage)) {
      setCashDropsPageInput(String(cashDropsPage + 1));
      return;
    }

    const maxPage = cashDropsTotalPages > 0 ? cashDropsTotalPages : 1;
    setCashDropsPage(Math.min(Math.max(requestedPage, 1), maxPage) - 1);
  };

  const goToPurchasesPage = () => {
    const requestedPage = Number(purchasesPageInput);
    if (!Number.isInteger(requestedPage)) {
      setPurchasesPageInput(String(purchasesPage + 1));
      return;
    }

    const maxPage = purchasesTotalPages > 0 ? purchasesTotalPages : 1;
    setPurchasesPage(Math.min(Math.max(requestedPage, 1), maxPage) - 1);
  };

  const handleCloseShift = async (shiftId, payload) => {
    // Shift details is the admin/manager surface; closeById has always been
    // its path and stays that way. Errors propagate to the dialog so the
    // modal stays open on a failed close.
    try {
      const response = await shiftsAPI.closeById(shiftId, payload);
      setShift(response.data);
      toast.success("Shift closed successfully");
      setShowCloseModal(false);
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || "Failed to close shift";
      toast.error(errorMessage);
      throw error;
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading shift..." />;
  }

  if (!shift) {
    return <div className="p-10 text-center text-red-500">Shift not found.</div>;
  }

  const totalSalesAmount = paymentSummary?.totalSales
    ?? (Number(shift.cashSales || 0) + Number(shift.cardSales || 0) + Number(shift.bankSales || 0));
  const expectedCash = Number(shift.expectedCash ?? 0);
  const countedCash = Number(shift.countedCash ?? 0);
  const shiftVariance = Number(shift.cashDifference || 0);
  const denominationRows = shift.denominationCounts || [];

  const salesColumns = [
    { key: "invoice", header: "Invoice", headerClassName: "whitespace-nowrap", className: "whitespace-nowrap font-bold text-blue-700", render: (sale) => sale.invoiceNo },
    { key: "time", header: "Time", headerClassName: "whitespace-nowrap", className: "whitespace-nowrap text-xs text-slate-600", render: (sale) => formatTime(sale.createdAt) },
    { key: "payment", header: "Payment", headerClassName: "text-center", className: "whitespace-nowrap text-center", render: (sale) => <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-700">{getPaymentLabel(sale)}</span> },
    { key: "status", header: "Status", headerClassName: "text-center", className: "whitespace-nowrap text-center", render: (sale) => <span className={`rounded px-2 py-1 text-[10px] font-bold ${sale.status === "CANCELED" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>{sale.status || "COMPLETED"}</span> },
    { key: "amount", header: "Amount", headerClassName: "whitespace-nowrap text-right", className: "whitespace-nowrap text-right font-bold text-slate-900", render: (sale) => formatCurrency(sale.grandTotal || 0) },
  ];
  const expenseColumns = [
    { key: "time", header: "Time", headerClassName: "whitespace-nowrap", className: "whitespace-nowrap text-xs text-slate-600", render: (expense) => formatTime(expense.createdAt) },
    { key: "category", header: "Category", className: "whitespace-nowrap text-xs", render: (expense) => formatCategoryLabel(expense.category || "") },
    { key: "amount", header: "Amount", headerClassName: "whitespace-nowrap text-right", className: "whitespace-nowrap text-right text-xs font-bold text-rose-700", render: (expense) => formatCurrency(expense.amount || 0) },
  ];
  const cashDropColumns = [
    { key: "time", header: "Time", headerClassName: "whitespace-nowrap", className: "whitespace-nowrap text-xs text-slate-600", render: (drop) => formatTime(drop.createdAt) },
    { key: "reason", header: "Reason", className: "max-w-[160px] truncate text-xs", render: (drop) => drop.reason || "Cash drop" },
    { key: "amount", header: "Amount", headerClassName: "whitespace-nowrap text-right", className: "whitespace-nowrap text-right text-xs font-bold text-slate-800", render: (drop) => formatCurrency(drop.amount || 0) },
  ];
  const purchaseColumns = [
    { key: "invoice", header: "Purchase", headerClassName: "whitespace-nowrap", className: "whitespace-nowrap text-xs font-semibold text-blue-700", render: (purchase) => purchase.invoiceNo || `Purchase #${purchase.purchaseId}` },
    { key: "supplier", header: "Supplier", className: "max-w-[130px] truncate text-xs", render: (purchase) => purchase.supplierName || "—" },
    { key: "amount", header: "Amount", headerClassName: "whitespace-nowrap text-right", className: "whitespace-nowrap text-right text-xs font-bold text-slate-800", render: (purchase) => formatCurrency(purchase.cashSourceAmount || 0) },
  ];
  const summaryCards = [
    { label: "Total Sales", value: totalSalesAmount, tone: "text-slate-900", sub: `${paymentSummary?.totalTransactions ?? totalElements} transactions` },
    { label: "Expected Drawer Cash", value: expectedCash, tone: "text-blue-700", sub: "Only drawer tenders counted" },
    { label: "Closing Counted Cash", value: countedCash, tone: "text-slate-900", sub: shift.countedCash != null ? "Physical count at close" : "Not closed yet" },
    {
      label: "Cash Variance",
      value: shiftVariance,
      tone: shiftVariance === 0 ? "text-emerald-700" : shiftVariance < 0 ? "text-rose-700" : "text-amber-700",
      sub: shiftVariance === 0 ? "Reconciled" : shiftVariance < 0 ? "Shortage" : "Overage",
      cardTone: shiftVariance === 0 ? "bg-emerald-50/60 border-emerald-200" : shiftVariance < 0 ? "bg-rose-50/60 border-rose-200" : "bg-amber-50/60 border-amber-200",
      icon: shiftVariance === 0 ? <CheckCircle2 size={18} /> : shiftVariance < 0 ? <TrendingDown size={18} /> : <TrendingUp size={18} />,
    },
  ];

  return (
    <div className="page-enter space-y-4 p-4">
      {/* A. Shift header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center print:hidden">
        <div>
          <Button variant="secondary" onClick={() => navigate("/shifts/history")} className="mb-3"><ArrowLeft size={17} className="mr-2" /> Back to Shift History</Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-black text-slate-900">Shift #{shift.id}</h1>
            <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${shift.status === "OPEN" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{shift.status}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5"><MapPin size={15} />{shift.branchName || `Branch #${shift.branchId}`}</span>
            <span className="hidden text-slate-300 sm:inline">|</span>
            <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} />{formatDateTime(shift.openedAt)}{shift.closedAt ? ` to ${formatDateTime(shift.closedAt)}` : ""}</span>
            <span className="hidden text-slate-300 sm:inline">|</span>
            <span className="inline-flex items-center gap-1.5"><Clock size={15} />{shiftDuration(shift.openedAt, shift.closedAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {shift.status === "CLOSED" && <Button variant="secondary" onClick={() => window.print()}><Printer size={16} className="mr-2" /> Print Z Report</Button>}
          {shift.status === "OPEN" && <Button variant="danger" onClick={() => setShowCloseModal(true)}>Cash Reconciliation</Button>}
        </div>
      </div>

      {/* B. Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 print:hidden">
        {summaryCards.map((card) => (
          <div key={card.label} className={`rounded-xl border p-4 ${card.cardTone || "border-slate-200 bg-white"}`}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{card.label}</p>
              {card.icon && <span className={card.tone}>{card.icon}</span>}
            </div>
            <p className={`mt-2 text-xl font-black ${card.tone}`}>{formatCurrency(card.value || 0)}</p>
            <p className="mt-0.5 text-xs text-slate-500">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* C. Upper information grid: reconciliation | payment methods | denominations.
          items-start keeps each card at its own content height — the grid's
          default stretch is what ballooned the two left cards to match the
          denomination table's tall list. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start print:hidden">
        <Card className="overflow-hidden border border-slate-200 p-0">
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
            <span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Receipt size={19} /></span>
            <div>
              <h2 className="font-bold text-slate-900">Cash Reconciliation</h2>
              <p className="text-xs text-slate-500">Drawer movements and validation</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {[["Opening cash", shift.openingCash, ""], ["Cash sales", shift.cashSales, "text-blue-700"], ["Expenses", -Number(shift.totalExpenses || 0), "text-rose-700"], ["Cash drops", -Number(shift.totalCashDrops || 0), "text-rose-700"], ["Expected cash", shift.expectedCash, "text-blue-700 font-bold"], ["Counted cash", shift.countedCash, ""], ["Variance", shiftVariance, shiftVariance === 0 ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"]].map(([label, amount, tone]) => (
              <div key={label} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-slate-600">{label}</span>
                <span className={`font-semibold ${tone}`}>{formatCurrency(amount || 0)}</span>
              </div>
            ))}
          </div>
          {(shift.openNote || shift.closeNote) && (
            <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-xs space-y-1">
              {shift.openNote && <p><span className="font-semibold text-slate-500">Opening note: </span>{shift.openNote}</p>}
              {shift.closeNote && <p><span className="font-semibold text-slate-500">Closing note: </span>{shift.closeNote}</p>}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden border border-slate-200 p-0">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><Wallet size={19} /></span>
              <div>
                <h2 className="font-bold text-slate-900">Sales by Payment Method</h2>
                <p className="text-xs text-slate-500">{paymentSummary?.totalTransactions ?? 0} transactions</p>
              </div>
            </div>
            <span className="text-sm font-black text-emerald-700">{formatCurrency(totalSalesAmount)}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {paymentRows.length > 0 ? paymentRows.map((method) => {
              const Icon = resolvePaymentIcon(method);
              return (
                <div key={method.code} className="flex items-center justify-between gap-2 px-4 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon size={16} className="shrink-0 text-blue-700" />
                    <p className="truncate text-sm font-semibold text-slate-700">{method.displayName}</p>
                    <span className="shrink-0 text-xs text-slate-400">{method.transactionCount} txn</span>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-slate-900">{formatCurrency(method.amount || 0)}</span>
                </div>
              );
            }) : (
              <div className="px-4 py-8 text-center">
                <Wallet size={20} className="mx-auto text-slate-300 mb-1" />
                <p className="text-sm text-slate-500">No sales in this shift</p>
              </div>
            )}
            {paymentSummary?.cashCollections > 0 && (
              <div className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-slate-600">Credit collections (cash)</span>
                <span className="font-bold text-emerald-700">{formatCurrency(paymentSummary.cashCollections)}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Content-driven height; mobile order puts the physical count first
            per the approved mobile reference. Denominations render as a
            two-column chip grid instead of a table: a table's minimum column
            widths forced horizontal scrolling inside this panel, which read
            badly; chips never scroll either way. */}
        <Card className="order-first overflow-hidden border border-slate-200 p-0 lg:order-none print:hidden">
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
            <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><Banknote size={19} /></span>
            <div>
              <h2 className="font-bold text-slate-900">Cash Count by Denomination</h2>
              <p className="text-xs text-slate-500">Physical count at shift close</p>
            </div>
          </div>
          {denominationRows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">No denomination count recorded.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 p-3">
              {denominationRows.map((row) => {
                const amount = Number(row.denomination) * Number(row.quantity);
                return (
                  <div key={row.denomination} className={`flex items-center justify-between rounded-lg border px-3 py-2 ${amount > 0 ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50/60"}`}>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Banknote size={13} className={amount > 0 ? "text-emerald-600" : "text-slate-300"} />
                      <span className="text-xs font-bold text-slate-700">Rs {Number(row.denomination).toLocaleString("en-LK")}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="text-xs font-semibold text-slate-600">×{Number(row.quantity)}</span>
                      <span className={`ml-1.5 text-xs font-bold ${amount > 0 ? "text-slate-900" : "text-slate-400"}`}>{formatCurrency(amount)}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="mx-3 mb-3 flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2.5">
            <span className="text-sm font-bold text-blue-900">Counted Cash Total</span>
            <span className="text-base font-black text-blue-900">{formatCurrency(shift.countedCash || 0)}</span>
          </div>
        </Card>

        {/* Compact Cashier & Shift Timeline: one cohesive full-width row
            beneath the upper grid, not three oversized cards. */}
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 lg:col-span-3 print:hidden">
          <div className="grid grid-cols-1 gap-3 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
            <div className="flex items-center gap-2.5 sm:pr-4">
              <User size={15} className="shrink-0 text-slate-500" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Cashier</p>
                <p className="truncate text-sm font-semibold text-slate-800">{shift.cashierName || `User ${shift.cashierUserId}`}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 sm:px-4">
              <Clock size={15} className="shrink-0 text-emerald-600" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Opened</p>
                <p className="text-sm font-semibold text-slate-800">{formatDateTime(shift.openedAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 sm:pl-4">
              <Clock size={15} className="shrink-0 text-slate-400" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Closed</p>
                <p className="text-sm font-semibold text-slate-800">{shift.closedAt ? formatDateTime(shift.closedAt) : "—"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* D. Main transaction area — Row 1: Sales in This Shift, full width */}
      <Card className="sales-panel-enter overflow-hidden border border-slate-200 p-0 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><ShoppingCart size={19} /></span>
            <div>
              <h2 className="font-bold text-slate-900">Sales in This Shift</h2>
              <p className="text-xs text-slate-500">Showing {filteredSales.length} of {totalElements} sales</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                aria-label="Search invoice"
                type="text"
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                placeholder="Search invoice…"
                className="h-9 w-44 rounded-lg border border-slate-300 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="w-40">
              <CustomSelect
                value={paymentFilter}
                onChange={setPaymentFilter}
                options={paymentFilterOptions}
                buttonClassName="h-9"
                menuClassName="min-w-[160px]"
              />
            </div>
            <div className="rounded-lg bg-blue-50 px-3 py-2">
              <p className="text-[10px] font-medium text-blue-600">Total Sales</p>
              <p className="text-base font-black text-blue-700">{formatCurrency(totalSalesAmount)}</p>
            </div>
          </div>
        </div>
        {/* Bounded scroll: the page keeps its own height; long sales lists
            scroll under the sticky header inside this card only. */}
        <div className="app-table-wrap-fixed max-h-[420px] rounded-none">
          <Table columns={salesColumns} data={filteredSales} loading={salesLoading} skeletonRows={4} compact emptyMessage="No sales match the current filters." onRowClick={(sale) => navigate(`/sales/${sale.invoiceNo}`)} />
        </div>
        <PaginationWhenNeeded
          summary={`Page ${page + 1} of ${totalPages === 0 ? 1 : totalPages} · ${totalElements} sales`}
          page={page}
          pageInput={pageInput}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          loading={salesLoading}
          onPageChange={setPage}
          onPageInputChange={setPageInput}
          onGoToPage={goToPage}
        />
      </Card>

      {/* D. Row 2: Purchases → Expenses → Cash Drops, three independent panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 print:hidden">
        <Card className="overflow-hidden border border-slate-200 p-0">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 p-3">
            <div className="flex items-center gap-2.5">
              <span className="rounded-lg bg-orange-50 p-2 text-orange-700"><Banknote size={17} /></span>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Purchases Paid from This Drawer</h2>
                <p className="text-[11px] text-slate-500">{purchasesTotal} purchases</p>
              </div>
            </div>
            <span className="rounded-lg bg-orange-50 px-2 py-1 text-xs font-bold text-orange-700">{formatCurrency(purchasesAmount)}</span>
          </div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            <Table columns={purchaseColumns} data={purchases} loading={purchasesLoading} skeletonRows={3} compact emptyMessage="No drawer-paid purchases for this shift." />
          </div>
          <PaginationWhenNeeded
            summary={`Page ${purchasesPage + 1} of ${purchasesTotalPages === 0 ? 1 : purchasesTotalPages}`}
            page={purchasesPage}
            pageInput={purchasesPageInput}
            totalPages={purchasesTotalPages}
            totalElements={purchasesTotal}
            pageSize={5}
            loading={purchasesLoading}
            onPageChange={setPurchasesPage}
            onPageInputChange={setPurchasesPageInput}
            onGoToPage={goToPurchasesPage}
          />
        </Card>

        <Card className="overflow-hidden border border-slate-200 p-0">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 p-3">
            <div className="flex items-center gap-2.5">
              <span className="rounded-lg bg-rose-50 p-2 text-rose-700"><FileText size={17} /></span>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Expenses</h2>
                <p className="text-[11px] text-slate-500">{expensesTotalElements} records</p>
              </div>
            </div>
            <span className="rounded-lg bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700">{formatCurrency(expensesAmount)}</span>
          </div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            <Table columns={expenseColumns} data={expenses} loading={expensesLoading} skeletonRows={3} compact emptyMessage="No expenses for this shift." />
          </div>
          <PaginationWhenNeeded
            summary={`Page ${expensesPage + 1} of ${expensesTotalPages === 0 ? 1 : expensesTotalPages}`}
            page={expensesPage}
            pageInput={expensesPageInput}
            totalPages={expensesTotalPages}
            totalElements={expensesTotalElements}
            pageSize={pageSize}
            loading={expensesLoading}
            onPageChange={setExpensesPage}
            onPageInputChange={setExpensesPageInput}
            onGoToPage={goToExpensesPage}
          />
        </Card>

        <Card className="overflow-hidden border border-slate-200 p-0">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 p-3">
            <div className="flex items-center gap-2.5">
              <span className="rounded-lg bg-blue-50 p-2 text-blue-700"><TrendingDown size={17} /></span>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Cash Drops</h2>
                <p className="text-[11px] text-slate-500">{cashDropsTotal} drops</p>
              </div>
            </div>
            <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{formatCurrency(shift.totalCashDrops || 0)}</span>
          </div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            <Table columns={cashDropColumns} data={cashDrops} loading={cashDropsLoading} skeletonRows={3} compact emptyMessage="No cash drops for this shift." />
          </div>
          <PaginationWhenNeeded
            summary={`Page ${cashDropsPage + 1} of ${cashDropsTotalPages === 0 ? 1 : cashDropsTotalPages}`}
            page={cashDropsPage}
            pageInput={cashDropsPageInput}
            totalPages={cashDropsTotalPages}
            totalElements={cashDropsTotal}
            pageSize={5}
            loading={cashDropsLoading}
            onPageChange={setCashDropsPage}
            onPageInputChange={setCashDropsPageInput}
            onGoToPage={goToCashDropsPage}
          />
        </Card>
      </div>

      <ShiftCloseDialog
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        shift={shift}
        closeShift={handleCloseShift}
        onClosed={() => loadShift()}
      />
    </div>
  );
};

export default ShiftDetailsPage;
