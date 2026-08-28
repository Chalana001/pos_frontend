import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, Clock, Printer, User } from "lucide-react";
import { toast } from "react-hot-toast";
import { shiftsAPI } from "../api/shifts.api";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ShiftCloseSummary from "../components/shifts/ShiftCloseSummary";
import TablePagination from "../components/common/TablePagination";
import { formatCurrency, formatDateTime } from "../utils/formatters";

const calculateExpectedCash = (shift) => {
  if (!shift) return 0;
  return (
    (shift.openingCash || 0) +
    (shift.cashSales || 0) -
    (shift.totalExpenses || 0) -
    (shift.totalCashDrops || 0)
  );
};

const formatCategoryLabel = (value) => value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

const getPaymentLabel = (sale) => {
  const paidAmount = Number(sale?.paidAmount || 0);
  const dueAmount = Number(sale?.dueAmount || 0);
  const method = (sale?.paymentMethod || "CASH").replace("_", " ");

  if (paidAmount > 0 && dueAmount > 0) return `${method} + Credit`;
  if (dueAmount > 0) return "Credit";
  return sale?.orderType === "CREDIT" ? "Credit" : method;
};

const ShiftDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [shift, setShift] = useState(null);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
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
  const [countedCash, setCountedCash] = useState("");
  const [closing, setClosing] = useState(false);

  useEffect(() => {
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

    loadShift();
  }, [id]);

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

  const handleCloseShift = async (e) => {
    e.preventDefault();
    setClosing(true);
    try {
      const response = await shiftsAPI.closeById(shift.id, {
        countedCash: parseFloat(countedCash),
        note: "",
      });
      setShift(response.data);
      toast.success("Shift closed successfully");
      setShowCloseModal(false);
      setCountedCash("");
    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || "Failed to close shift";
      toast.error(errorMessage);
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading shift..." />;
  }

  if (!shift) {
    return <div className="p-10 text-center text-red-500">Shift not found.</div>;
  }

  return (
    <div className="page-enter space-y-6 p-4">
      <div className="page-section-enter flex flex-col justify-between gap-4 md:flex-row md:items-center" style={{ animationDelay: "40ms" }}>
        <div>
          <Button variant="secondary" onClick={() => navigate("/shifts/history")} className="mb-4">
            <ArrowLeft size={18} className="mr-2" /> Back to Shift History
          </Button>
          <h1 className="text-3xl font-bold text-slate-800">Shift #{shift.id}</h1>
          <p className="text-sm text-slate-500 mt-1">{shift.branchName || `Branch #${shift.branchId}`}</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          {shift.status === "CLOSED" && <Button variant="secondary" onClick={() => window.print()}><Printer size={17} className="mr-2" /> Print Z Report</Button>}
          {shift.status === "OPEN" && <Button variant="danger" onClick={() => setShowCloseModal(true)}>Close Shift</Button>}
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase w-fit ${shift.status === "OPEN" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>{shift.status}</span>
        </div>
      </div>

      <Card className="border border-slate-200 p-5 print:border-0 print:shadow-none">
        <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Z Report</p><h2 className="mt-1 text-xl font-black text-slate-900">Cash Reconciliation</h2></div>
          <p className="text-xs font-semibold text-slate-500">{formatDateTime(shift.openedAt)} to {formatDateTime(shift.closedAt)}</p>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Opening cash", shift.openingCash],
            ["Cash sales", shift.cashSales],
            ["Expenses", -Number(shift.totalExpenses || 0)],
            ["Cash drops", -Number(shift.totalCashDrops || 0)],
            ["Expected cash", shift.expectedCash],
            ["Counted cash", shift.countedCash],
          ].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-500">{label}</p><p className="mt-2 text-lg font-black text-slate-900">{formatCurrency(value || 0)}</p></div>)}
          <div className={`rounded-xl p-4 sm:col-span-2 ${Number(shift.cashDifference || 0) < 0 ? "bg-red-50" : Number(shift.cashDifference || 0) > 0 ? "bg-blue-50" : "bg-emerald-50"}`}>
            <p className="text-xs font-bold uppercase text-slate-500">Closing variance</p>
            <p className={`mt-2 text-2xl font-black ${Number(shift.cashDifference || 0) < 0 ? "text-red-700" : Number(shift.cashDifference || 0) > 0 ? "text-blue-700" : "text-emerald-700"}`}>{formatCurrency(shift.cashDifference || 0)}</p>
            <p className="mt-1 text-xs font-semibold text-slate-600">{Number(shift.cashDifference || 0) < 0 ? "Cash shortage" : Number(shift.cashDifference || 0) > 0 ? "Cash excess" : "Cash reconciled"}</p>
          </div>
        </div>
        {(shift.openNote || shift.closeNote) && <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">{shift.openNote && <div><p className="text-xs font-bold uppercase text-slate-500">Opening note</p><p className="mt-1 text-sm text-slate-700">{shift.openNote}</p></div>}{shift.closeNote && <div><p className="text-xs font-bold uppercase text-slate-500">Closing note</p><p className="mt-1 text-sm text-slate-700">{shift.closeNote}</p></div>}</div>}
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="ops-summary-card shell-panel shell-panel-hover p-4" style={{ animationDelay: "90ms" }}>
          <div className="text-xs text-slate-500 flex items-center gap-2 uppercase font-bold">
            <User size={14} /> Cashier
          </div>
          <div className="mt-2 text-lg font-bold text-slate-800">{shift.cashierName || `User ${shift.cashierUserId}`}</div>
        </Card>
        <Card className="ops-summary-card shell-panel shell-panel-hover p-4" style={{ animationDelay: "130ms" }}>
          <div className="text-xs text-slate-500 flex items-center gap-2 uppercase font-bold">
            <Clock size={14} /> Opened
          </div>
          <div className="mt-2 text-sm font-bold text-slate-800">{formatDateTime(shift.openedAt)}</div>
        </Card>
        <Card className="ops-summary-card shell-panel shell-panel-hover p-4" style={{ animationDelay: "170ms" }}>
          <div className="text-xs text-slate-500 uppercase font-bold">Cash Sales</div>
          <div className="mt-2 text-lg font-bold text-green-600">{formatCurrency(shift.cashSales || 0)}</div>
        </Card>
        <Card className="ops-summary-card shell-panel shell-panel-hover p-4" style={{ animationDelay: "210ms" }}>
          <div className="text-xs text-slate-500 uppercase font-bold">Difference</div>
          <div className={`mt-2 text-lg font-bold ${
            (shift.cashDifference || 0) < 0 ? "text-red-600" : (shift.cashDifference || 0) > 0 ? "text-blue-600" : "text-slate-700"
          }`}>
            {shift.status === "CLOSED" ? formatCurrency(shift.cashDifference || 0) : "--"}
          </div>
        </Card>
      </div>

      <Card className="sales-panel-enter overflow-hidden border border-slate-200 p-0" style={{ animationDelay: "130ms" }}>
        <div className="flex items-center justify-between p-4 border-b bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Sales in This Shift</h2>
            <p className="text-sm text-slate-500">Showing {sales.length} of {totalElements} sales</p>
          </div>
        </div>

        <div className="app-table-wrap">
          <table className="app-table whitespace-nowrap">
            <thead className="app-table-head">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Invoice No</th>
                <th className="p-4">Customer</th>
                <th className="p-4 text-center">Payment</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Grand Total</th>
                <th className="p-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {salesLoading ? (
                <tr><td colSpan="7" className="p-6 text-center text-slate-500">Loading...</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan="7" className="p-6 text-center text-slate-500">No sales found for this shift.</td></tr>
              ) : (
                sales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/sales/${sale.invoiceNo}`)}
                  >
                    <td className="p-4 text-slate-600">{formatDateTime(sale.createdAt)}</td>
                    <td className="p-4 font-bold text-blue-600">{sale.invoiceNo}</td>
                    <td className="p-4 font-medium text-slate-700">{sale.customerName || "Walk-in Customer"}</td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                        {getPaymentLabel(sale)}
                      </span>
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
                    <td className="p-4 text-right font-bold text-slate-800">{formatCurrency(sale.grandTotal || 0)}</td>
                    <td className="p-4 text-right text-slate-600">
                      <ChevronRight size={18} className="inline-block" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          summary={`Page ${page + 1} of ${totalPages === 0 ? 1 : totalPages}`}
          page={page}
          pageInput={pageInput}
          totalPages={totalPages}
          loading={salesLoading}
          onPageChange={setPage}
          onPageInputChange={setPageInput}
          onGoToPage={goToPage}
        />
      </Card>

      <Card className="sales-panel-enter overflow-hidden border border-slate-200 p-0" style={{ animationDelay: "170ms" }}>
        <div className="flex items-center justify-between p-4 border-b bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Expenses in This Shift</h2>
            <p className="text-sm text-slate-500">Showing {expenses.length} of {expensesTotalElements} expenses</p>
          </div>
        </div>

        <div className="app-table-wrap">
          <table className="app-table whitespace-nowrap">
            <thead className="app-table-head">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">Category</th>
                <th className="p-4">Description</th>
                <th className="p-4">Recorded By</th>
                <th className="p-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expensesLoading ? (
                <tr><td colSpan="5" className="p-6 text-center text-slate-500">Loading...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan="5" className="p-6 text-center text-slate-500">No expenses found for this shift.</td></tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-slate-600">{formatDateTime(expense.createdAt)}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                        {formatCategoryLabel(expense.category || "")}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-700 max-w-[360px] truncate" title={expense.description}>
                      {expense.description || "-"}
                    </td>
                    <td className="p-4 text-slate-600">{expense.cashierName || `User ${expense.cashierId}`}</td>
                    <td className="p-4 text-right font-bold text-red-600">{formatCurrency(expense.amount || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          summary={`Page ${expensesPage + 1} of ${expensesTotalPages === 0 ? 1 : expensesTotalPages}`}
          page={expensesPage}
          pageInput={expensesPageInput}
          totalPages={expensesTotalPages}
          loading={expensesLoading}
          onPageChange={setExpensesPage}
          onPageInputChange={setExpensesPageInput}
          onGoToPage={goToExpensesPage}
        />
      </Card>

      <Modal
        isOpen={showCloseModal}
        onClose={() => {
          setShowCloseModal(false);
          setCountedCash("");
        }}
        title={`Close Shift #${shift.id} (Cashier: ${shift.cashierName || shift.cashierUserId})`}
      >
        <form onSubmit={handleCloseShift} className="space-y-4">
          <div className="space-y-2 rounded-lg bg-slate-50 p-4">
            <div className="flex justify-between text-sm">
              <span>Expected Cash:</span>
              <span className="font-bold text-blue-600">{formatCurrency(calculateExpectedCash(shift))}</span>
            </div>
          </div>

          {showCloseModal && <ShiftCloseSummary shiftId={shift.id} />}

          <div>
            <label htmlFor="shiftdetailspage-counted-cash-amount" className="block text-sm font-medium text-slate-700 mb-1">Counted Cash Amount *</label>
            <input id="shiftdetailspage-counted-cash-amount"
              type="number"
              step="0.01"
              value={countedCash}
              onChange={(e) => setCountedCash(e.target.value)}
              className="input"
              placeholder="0.00"
              required
              autoFocus
            />
          </div>

          {countedCash && (
            <div className={`rounded-lg p-4 ${parseFloat(countedCash) === calculateExpectedCash(shift) ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
              <p className="text-sm font-medium">
                Difference: {formatCurrency(Math.abs(parseFloat(countedCash) - calculateExpectedCash(shift)))}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" variant="danger" className="flex-1" disabled={closing}>
              {closing ? "Closing..." : "Confirm Close"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => { setShowCloseModal(false); setCountedCash(""); }}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ShiftDetailsPage;
