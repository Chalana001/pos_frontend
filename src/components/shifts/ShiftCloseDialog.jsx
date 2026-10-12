import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  ChevronDown,
  ChevronRight,
  Clock,
  Printer,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react";
import { toast } from "react-hot-toast";

import { shiftsAPI } from "../../api/shifts.api";
import { cashDropsAPI } from "../../api/cashDrops.api";
import { resolvePaymentIcon } from "../../utils/paymentMethodIcons";
import { formatCurrency, formatDateTime } from "../../utils/formatters";
import { calculateExpectedCash } from "../../utils/shiftCash";
import { printHtmlInFrame } from "../../utils/printFrame";
import Button from "../common/Button";
import LoadingSpinner from "../common/LoadingSpinner";
import Modal from "../common/Modal";

// One page per section is enough for a real shift; the footer says so if not.
const SECTION_FETCH_SIZE = 100;

// Categories that render as a group when the shift genuinely contains two or
// more distinct methods of that category. Membership is the method's
// authoritative category from the payment-method configuration (or the
// historical fallback for unknown codes) — never display-name matching.
const GROUPED_CATEGORIES = new Set(["CARD", "BANK_TRANSFER", "MOBILE_DIGITAL"]);

const CATEGORY_LABELS = {
  CASH: "Cash",
  CARD: "Card Payment",
  BANK_TRANSFER: "Bank & Transfer",
  MOBILE_DIGITAL: "Mobile / Digital",
  CREDIT: "Credit / Deferred",
  OTHER: "Other",
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

/**
 * The Close Shift dialog: dynamic sales by payment method, physical-cash
 * reconciliation, and the supporting drawer summary.
 *
 * The method rows come from GET /shifts/{id}/payment-summary, one grouped
 * aggregation of the order_payments ledger over the shift window — the same
 * rows the shift's cash/card/bank buckets were incremented from. Totals are
 * never derived in the browser, and no payment method is hardcoded: a method
 * an admin adds in Settings appears here on its next open.
 *
 * Expected Cash is the shift's own event ledger (opening float + cash sales −
 * expenses − cash drops), NOT total sales: card, bank, QR and every other
 * non-cash tender stay out of the drawer number. The formula lives in
 * shiftCash.js and mirrors the backend exactly.
 */
const ShiftCloseDialog = ({
  isOpen,
  onClose,
  shift,
  onClosed,
  closeShift,
}) => {
  // closeShift(shiftId, payload) is supplied by the page so the existing
  // authorization rules (cashier closes own vs admin closes by id) stay where
  // they have always lived.
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [drawerPurchases, setDrawerPurchases] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [cashDrops, setCashDrops] = useState([]);
  const [sales, setSales] = useState([]);
  const [showDrawerPurchases, setShowDrawerPurchases] = useState(false);
  const [showExpenses, setShowExpenses] = useState(false);
  const [showCashDrops, setShowCashDrops] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());
  const [expandedMethods, setExpandedMethods] = useState(() => new Set());
  const [countedCash, setCountedCash] = useState("");
  const [note, setNote] = useState("");
  const [closing, setClosing] = useState(false);
  const printFrameRef = useRef(null);

  const shiftId = shift?.id ?? null;

  useEffect(() => {
    if (!isOpen || !shiftId) return undefined;
    let cancelled = false;
    setSummaryLoading(true);
    setSummaryError(false);

    // Payment-method breakdown, the per-method drill-down sales list and the
    // itemized drawer movements load together; none of these change any
    // number, they only explain them.
    Promise.all([
      shiftsAPI.getPaymentSummary(shiftId).then((res) => res.data),
      shiftsAPI.getOrders(shiftId, { page: 0, size: SECTION_FETCH_SIZE })
        .then((res) => (res.data?.content || [])
          .filter((s) => s.status !== "CANCELED"))
        .catch(() => []),
      shiftsAPI.getPurchases(shiftId, { page: 0, size: SECTION_FETCH_SIZE })
        .then((res) => (res.data?.content || [])
          .filter((p) => p.status !== "CANCELED"))
        .catch(() => []),
      shiftsAPI.getExpenses(shiftId, { page: 0, size: SECTION_FETCH_SIZE })
        .then((res) => res.data?.content || [])
        .catch(() => []),
      cashDropsAPI.getAll({ shiftId, page: 0, size: SECTION_FETCH_SIZE })
        .then((res) => res.data?.content || [])
        .catch(() => []),
    ])
      .then(([summaryData, salesRows, purchases, expenseRows, dropRows]) => {
        if (cancelled) return;
        setSummary(summaryData);
        setSales(salesRows);
        setDrawerPurchases(purchases);
        setExpenses(expenseRows);
        setCashDrops(dropRows);
      })
      .catch(() => {
        if (!cancelled) setSummaryError(true);
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, shiftId]);

  // Rows come back sorted by amount; grouping is presentation only and never
  // changes the numbers: parent totals are sums of their member rows, and
  // totalSales/totalTransactions come from the backend sum of all rows, so
  // parent + child can never be counted twice.
  const groupedRows = useMemo(() => {
    const rows = summary?.methods || [];
    const groups = new Map();
    const single = [];
    for (const row of rows) {
      const groupKey = GROUPED_CATEGORIES.has(row.category)
        && rows.filter((r) => r.category === row.category).length > 1
        ? row.category
        : null;
      if (groupKey) {
        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        groups.get(groupKey).push(row);
      } else {
        single.push(row);
      }
    }
    const groupEntries = [...groups.entries()].map(([category, members]) => ({
      key: category,
      category,
      label: CATEGORY_LABELS[category] || category,
      amount: members.reduce((acc, m) => acc + Number(m.amount || 0), 0),
      transactionCount: members.reduce((acc, m) => acc + Number(m.transactionCount || 0), 0),
      members,
    }));
    return { groups: groupEntries, single };
  }, [summary]);

  const expectedCash = useMemo(() => calculateExpectedCash(shift), [shift]);
  // Drawer purchases are already inside totalExpenses (the backend folds them
  // in when the purchase is paid). Splitting them here is display only: the
  // subtraction keeps the total identical, it just says where the money went.
  const drawerPurchasesSum = useMemo(
    () => drawerPurchases.reduce((acc, p) => acc + Number(p.cashSourceAmount || 0), 0),
    [drawerPurchases]
  );
  const regularExpenses = useMemo(
    () => Math.max(0, Number(shift?.totalExpenses || 0) - drawerPurchasesSum),
    [shift?.totalExpenses, drawerPurchasesSum]
  );
  const counted = countedCash === "" ? null : Number(countedCash);
  const difference = counted === null ? null : counted - expectedCash;
  const isExact = difference !== null && Math.abs(difference) < 0.005;

  const toggleGroup = (key) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (!shiftId) {
      toast.error("No active shift selected");
      return;
    }
    if (counted === null || Number.isNaN(counted) || counted < 0) {
      toast.error("Enter the counted cash amount");
      return;
    }
    try {
      setClosing(true);
      await closeShift(shiftId, { countedCash: counted, note: note.trim() });
      toast.success("Shift closed successfully");
      setCountedCash("");
      setNote("");
      onClosed?.();
    } catch (error) {
      // The shift is NOT closed: the modal stays up with the error surfaced,
      // exactly like the previous close flow.
      const message = error?.response?.data?.detail
        || error?.response?.data?.message
        || "Failed to close shift";
      toast.error(message);
    } finally {
      setClosing(false);
    }
  };

  // Print-time HTML escaping: the report is a document written into an
  // iframe, so user-entered text (descriptions, references, notes) must not
  // be able to break its markup.
  const escapeHtml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  // The per-method sales list comes from the shift's order list (already
  // fetched, one page) filtered by the row's code — the same sales the
  // aggregated row above counted, itemized.
  const salesForMethod = (code) => sales.filter((s) => s.paymentMethod === code);

  const handlePrint = () => {
    const frame = printFrameRef.current;
    if (!frame || !shift) return;

    const allMethodRows = [...groupedRows.single, ...groupedRows.groups.flatMap((g) => g.members)];
    // Per-method block: the summary row plus that method's individual sales
    // (invoice, time, reference with its configured label, amount).
    const methodBlocks = allMethodRows.map((m) => {
      const list = salesForMethod(m.code);
      const saleRows = list.map((sale) => `
          <tr>
            <td>${sale.invoiceNo}</td>
            <td>${formatDateTime(sale.createdAt)}</td>
            <td>${sale.bankReference ? `${escapeHtml(m.referenceLabel || "Reference")}: ${escapeHtml(sale.bankReference)}` : ""}</td>
            <td style="text-align:right">${formatCurrency(sale.grandTotal || 0)}</td>
          </tr>`).join("");
      return `
        <tr class="method-head">
          <td>${escapeHtml(m.displayName)}${m.unknown ? " (unknown)" : ""}</td>
          <td style="text-align:right">${m.transactionCount}</td>
          <td style="text-align:right">${Number(m.percentage || 0).toFixed(1)}%</td>
          <td style="text-align:right">${formatCurrency(m.amount)}</td>
        </tr>
        ${saleRows || '<tr><td colspan="4" class="muted">No sales loaded for this method</td></tr>'}`;
    }).join("");

    const expenseRows = expenses.map((e) => `
        <tr><td>${escapeHtml(e.description || e.category)}</td><td style="text-align:right">${formatCurrency(e.amount || 0)}</td></tr>`)
      .join("") || '<tr><td class="muted">No expenses</td><td></td></tr>';
    const purchaseRows = drawerPurchases.map((p) => `
        <tr><td>${escapeHtml(p.invoiceNo)} · ${escapeHtml(p.supplierName)}</td><td style="text-align:right">${formatCurrency(p.cashSourceAmount || 0)}</td></tr>`)
      .join("") || '<tr><td class="muted">No purchases from drawer</td><td></td></tr>';
    const dropRows = cashDrops.map((d) => `
        <tr><td>${escapeHtml(d.reason || "Cash drop")}${d.bankAccountName ? " · " + escapeHtml(d.bankAccountName) : ""}</td><td style="text-align:right">${formatCurrency(d.amount || 0)}</td></tr>`)
      .join("") || '<tr><td class="muted">No cash drops</td><td></td></tr>';

    const html = `<!doctype html>
      <html><head><title>Shift Report</title>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; margin: 24px; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        h2 { font-size: 13px; text-transform: uppercase; color: #475569; margin: 14px 0 6px; }
        .sub { color: #64748b; font-size: 12px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        th, td { padding: 5px 4px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
        th { text-align: left; font-size: 10px; text-transform: uppercase; color: #475569; }
        td.num, th.num { text-align: right; }
        .total td { font-weight: bold; border-top: 2px solid #94a3b8; }
        .method-head td { font-weight: bold; background: #f1f5f9; }
        .muted { color: #94a3b8; }
      </style></head><body>
      <h1>Shift Report</h1>
      <div class="sub">
        ${escapeHtml(shift.cashierName || `User ${shift.cashierUserId}`)} · ${escapeHtml(shift.branchName || `Branch ${shift.branchId}`)}<br/>
        Opened ${formatDateTime(shift.openedAt)}${shift.closedAt ? ` · Closed ${formatDateTime(shift.closedAt)}` : ""}
        ${shift.closedAt ? "" : " · (still open at print time)"}
      </div>

      <h2>Sales by payment method</h2>
      <table>
        <thead><tr><th>Method / Sale</th><th class="num">Txns</th><th class="num">%</th><th class="num">Amount</th></tr></thead>
        <tbody>
          ${methodBlocks || '<tr><td colspan="4" class="muted">No sales in this shift</td></tr>'}
          <tr class="total"><td>Total sales</td><td class="num">${summary?.totalTransactions ?? 0}</td><td class="num">100%</td><td class="num">${formatCurrency(summary?.totalSales ?? 0)}</td></tr>
        </tbody>
      </table>

      <h2>Cash drawer movements</h2>
      <table>
        <tbody>
          <tr><td>Opening float</td><td class="num">${formatCurrency(shift.openingCash)}</td></tr>
          <tr><td>Cash sales (drawer tender)</td><td class="num">${formatCurrency(shift.cashSales)}</td></tr>
        </tbody>
      </table>

      <h2>Expenses</h2>
      <table>
        <tbody>
          ${expenseRows}
          <tr class="total"><td>Expenses total</td><td class="num">-${formatCurrency(regularExpenses)}</td></tr>
        </tbody>
      </table>

      <h2>Purchases paid from drawer</h2>
      <table>
        <tbody>
          ${purchaseRows}
          <tr class="total"><td>Purchases total</td><td class="num">-${formatCurrency(drawerPurchasesSum)}</td></tr>
        </tbody>
      </table>

      <h2>Cash drops</h2>
      <table>
        <tbody>
          ${dropRows}
          <tr class="total"><td>Cash drops total</td><td class="num">-${formatCurrency(shift.totalCashDrops)}</td></tr>
        </tbody>
      </table>

      <table>
        <tbody>
          <tr class="total"><td>Expected cash in drawer</td><td class="num">${formatCurrency(expectedCash)}</td></tr>
          ${shift.countedCash != null ? `<tr><td>Counted cash</td><td class="num">${formatCurrency(shift.countedCash)}</td></tr>` : ""}
          ${shift.cashDifference != null ? `<tr><td>Difference</td><td class="num">${formatCurrency(shift.cashDifference)}</td></tr>` : ""}
        </tbody>
      </table>
      ${note.trim() ? `<p class="sub">Note: ${escapeHtml(note.trim())}</p>` : ""}
      </body></html>`;
    printHtmlInFrame(frame, html);
  };

  if (!isOpen || !shift) return null;

  const MethodSalesList = ({ row }) => {
    const list = salesForMethod(row.code);
    if (list.length === 0) {
      return <p className="px-11 py-2 text-xs text-slate-400">No sales loaded for this method</p>;
    }
    return (
      <div className="divide-y divide-slate-100 border-t border-slate-200 bg-white">
        {list.map((sale) => (
          <div key={sale.id} className="flex items-center justify-between gap-2 px-11 py-2 text-xs">
            <div className="min-w-0">
              <p className="font-semibold text-slate-600 truncate">{sale.invoiceNo}</p>
              <p className="text-slate-400">{formatDateTime(sale.createdAt)}</p>
              {sale.bankReference && (
                <p className="text-slate-400 truncate">
                  {row.referenceLabel || "Reference"}: {sale.bankReference}
                </p>
              )}
            </div>
            <p className="font-bold text-slate-700 shrink-0">{formatCurrency(sale.grandTotal || 0)}</p>
          </div>
        ))}
        {sales.length >= SECTION_FETCH_SIZE && (
          <p className="px-11 py-1.5 text-[10px] text-slate-400">
            First {SECTION_FETCH_SIZE} sales shown; see shift history for the rest
          </p>
        )}
      </div>
    );
  };

  const toggleMethod = (code) => {
    setExpandedMethods((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const MethodRowInner = ({ row, indent }) => {
    const methodOpen = expandedMethods.has(row.code);
    return (
      <div className={indent ? "" : "rounded-lg border border-slate-200 overflow-hidden bg-slate-50/50"}>
        <button
          type="button"
          aria-expanded={methodOpen}
          aria-controls={`shiftclose-method-${row.code}`}
          onClick={() => toggleMethod(row.code)}
          className={`w-full flex items-center justify-between gap-3 ${indent ? "pl-7 pr-3" : "px-3"} py-2.5 text-left hover:bg-slate-100 transition-colors`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {methodOpen ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
            {(() => {
              const Icon = resolvePaymentIcon({ iconKey: row.iconKey, category: row.category });
              return <Icon size={18} className="text-slate-500 shrink-0" />;
            })()}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-700 truncate flex items-center gap-2">
                {row.displayName}
                {row.unknown && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">UNKNOWN</span>}
                {row.inactive && !row.unknown && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">INACTIVE</span>}
              </p>
              <p className="text-xs text-slate-500">{row.transactionCount} txn{row.transactionCount === 1 ? "" : "s"} · {Number(row.percentage || 0).toFixed(1)}%</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-slate-800">{formatCurrency(row.amount)}</p>
            {row.includeInExpectedCash && (
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">in drawer</p>
            )}
          </div>
        </button>
        {methodOpen && (
          <div id={`shiftclose-method-${row.code}`}>
            <MethodSalesList row={row} />
          </div>
        )}
      </div>
    );
  };

  // Other-Summary row: icon + label + count + amount, independently
  // expandable to its own records. Amounts come from the shift's ledger, the
  // list below only explains them.
  const SummaryRow = ({ icon, label, count, amount, open, onToggle, domId, renderDetails }) => (
    <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50/50">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={domId}
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {open ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
          {icon}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-700 truncate">{label}</p>
            <p className="text-xs text-slate-500">{count} record{count === 1 ? "" : "s"}</p>
          </div>
        </div>
        <p className="text-sm font-bold text-red-600 shrink-0">-{formatCurrency(amount)}</p>
      </button>
      {open && (
        <div id={domId} className="mt-0 border-t border-slate-200 bg-white px-3 py-2 space-y-1.5">
          {renderDetails()}
        </div>
      )}
    </div>
  );

  const GroupRow = ({ group }) => {
    const open = expandedGroups.has(group.key);
    return (
      <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50/50">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`shiftclose-group-${group.key}`}
          onClick={() => toggleGroup(group.key)}
          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            {open ? <ChevronDown size={16} className="text-slate-600 shrink-0" /> : <ChevronRight size={16} className="text-slate-600 shrink-0" />}
            {(() => {
              const Icon = resolvePaymentIcon({ category: group.category });
              return <Icon size={18} className="text-slate-500 shrink-0" />;
            })()}
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-700">{group.label}</p>
              <p className="text-xs text-slate-500">{group.transactionCount} txn{group.transactionCount === 1 ? "" : "s"} · {group.members.length} methods</p>
            </div>
          </div>
          <p className="text-sm font-bold text-slate-800 shrink-0">{formatCurrency(group.amount)}</p>
        </button>
        {open && (
          <div id={`shiftclose-group-${group.key}`} className="divide-y divide-slate-100 border-t border-slate-200 bg-white">
            {group.members.map((member) => (
              <MethodRowInner key={member.code} row={member} indent />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Close Shift"
    >
      <form onSubmit={handleConfirm} className="space-y-5">
        {/* Shift information — genuine record values, nothing invented */}
        <div className="page-section-enter grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ animationDelay: "40ms" }}>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1"><User size={12} /> Cashier</p>
            <p className="text-sm font-semibold text-slate-800 truncate">{shift.cashierName || `User ${shift.cashierUserId}`}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1"><Clock size={12} /> Opened</p>
            <p className="text-sm font-semibold text-slate-800 truncate">{formatDateTime(shift.openedAt)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1"><Clock size={12} /> Duration</p>
            <p className="text-sm font-semibold text-slate-800">{shiftDuration(shift.openedAt, shift.closedAt)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1"><ReceiptText size={12} /> Transactions</p>
            <p className="text-sm font-semibold text-slate-800">{summary?.totalTransactions ?? (summaryLoading ? "…" : 0)}</p>
          </div>
        </div>

        {/* Two-column reference layout; single column below lg */}
        <div className="page-section-enter grid grid-cols-1 lg:grid-cols-2 gap-5" style={{ animationDelay: "70ms" }}>

          {/* LEFT — Sales by Payment Method (All Tenders) */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 self-start">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">Sales by Payment Method</h3>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">All tenders</span>
            </div>
            <p className="text-2xl font-black text-emerald-600 -mt-1">{formatCurrency(summary?.totalSales ?? 0)}</p>

            {summaryLoading ? (
              <div className="flex items-center justify-center py-8 rounded-lg border border-slate-200">
                <LoadingSpinner size="sm" text="Loading sales breakdown..." />
              </div>
            ) : summaryError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-600 shrink-0" />
                <p className="text-sm text-red-700">Could not load the payment breakdown. The cash reconciliation on the right is still accurate.</p>
              </div>
            ) : groupedRows.single.length + groupedRows.groups.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center">
                <Wallet size={20} className="mx-auto text-slate-400 mb-1" />
                <p className="text-sm text-slate-600">No sales in this shift</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_auto] gap-2 px-1 pb-1 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  <span>Payment Method · Transactions</span>
                  <span>Amount (LKR)</span>
                </div>
                {groupedRows.groups.map((group) => (
                  <GroupRow key={group.key} group={group} />
                ))}
                {groupedRows.single.map((row) => (
                  <MethodRowInner key={row.code} row={row} />
                ))}
                <div className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2.5 rounded-lg bg-slate-800 text-white">
                  <div>
                    <p className="text-sm font-bold">Total Sales (All Payment Methods)</p>
                    <p className="text-xs text-slate-300">{summary?.totalTransactions ?? 0} transactions</p>
                  </div>
                  <p className="text-sm font-black text-emerald-400 self-center">{formatCurrency(summary?.totalSales ?? 0)}</p>
                </div>
                <p className="text-xs text-slate-500 px-1">
                  Tap a method to list its sales. Only tenders marked
                  <span className="font-semibold text-emerald-600"> in drawer</span> count toward expected cash.
                </p>
              </div>
            )}
          </div>

          {/* RIGHT — Other Summary above the cash cards */}
          <div className="space-y-4">

            {/* Other Summary */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">Other Summary</h3>

              <SummaryRow
                icon={<TrendingDown size={18} className="text-red-500 shrink-0" />}
                label="Expenses"
                count={expenses.length}
                amount={regularExpenses}
                open={showExpenses}
                onToggle={() => setShowExpenses((v) => !v)}
                domId="shiftclose-expenses"
                renderDetails={() => expenses.length === 0 ? (
                  <p className="text-xs text-slate-400">No expenses in this shift</p>
                ) : expenses.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="truncate"><span className="text-slate-400">{formatDateTime(e.createdAt)}</span> {e.description || e.category}</span>
                    <span className="font-semibold text-slate-700 shrink-0">{formatCurrency(e.amount || 0)}</span>
                  </div>
                ))}
              />

              <SummaryRow
                icon={<Banknote size={18} className="text-red-500 shrink-0" />}
                label="Purchases Paid from This Drawer"
                count={drawerPurchases.length}
                amount={drawerPurchasesSum}
                open={showDrawerPurchases}
                onToggle={() => setShowDrawerPurchases((v) => !v)}
                domId="shiftclose-drawer-purchases"
                renderDetails={() => drawerPurchases.length === 0 ? (
                  <p className="text-xs text-slate-400">No purchases paid from this shift's drawer</p>
                ) : drawerPurchases.map((p) => (
                  <div key={p.purchaseId} className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="truncate">{p.invoiceNo} · {p.supplierName}</span>
                    <span className="font-semibold text-slate-700 shrink-0">{formatCurrency(p.cashSourceAmount || 0)}</span>
                  </div>
                ))}
              />

              <SummaryRow
                icon={<TrendingUp size={18} className="text-red-500 shrink-0" />}
                label="Cash Drops"
                count={cashDrops.length}
                amount={Number(shift?.totalCashDrops || 0)}
                open={showCashDrops}
                onToggle={() => setShowCashDrops((v) => !v)}
                domId="shiftclose-cash-drops"
                renderDetails={() => cashDrops.length === 0 ? (
                  <p className="text-xs text-slate-400">No cash drops in this shift</p>
                ) : cashDrops.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="truncate"><span className="text-slate-400">{formatDateTime(d.createdAt)}</span> {d.reason || "Cash drop"}{d.bankAccountName ? ` · ${d.bankAccountName}` : ""}</span>
                    <span className="font-semibold text-slate-700 shrink-0">{formatCurrency(d.amount || 0)}</span>
                  </div>
                ))}
              />

              {summary?.cashCollections > 0 && (
                <div className="flex items-center justify-between gap-3 pt-1 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Banknote size={18} className="text-emerald-500 shrink-0" />
                    <span>Credit collections (cash, informational)</span>
                  </div>
                  <span className="font-bold text-emerald-700">{formatCurrency(summary.cashCollections)}</span>
                </div>
              )}
              <p className="text-xs text-slate-400 px-1 pt-1">
                Drawer purchases and cash drops already reduce Expected Cash; each row expands to its own records.
              </p>
            </div>

            {/* Expected Cash in Drawer */}
            <div className="rounded-xl border-2 border-blue-200 bg-blue-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Banknote size={18} className="text-blue-700" />
                  <h3 className="text-sm font-bold uppercase tracking-wide text-blue-800">Expected Cash in Drawer</h3>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${shift.status === "OPEN" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{shift.status}</span>
              </div>
              <p className="text-3xl font-black text-blue-700">{formatCurrency(expectedCash)}</p>
              <div className="rounded-lg bg-white border border-slate-200 px-4 py-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600"><span>Opening float</span><span className="font-semibold">{formatCurrency(shift.openingCash)}</span></div>
                <div className="flex justify-between text-slate-600"><span>Cash sales (drawer tender)</span><span className="font-semibold">{formatCurrency(shift.cashSales)}</span></div>
                <div className="flex justify-between text-slate-600"><span>Total drawer movements</span><span className="font-semibold text-red-600">-{formatCurrency(Number(shift?.totalExpenses || 0) + Number(shift?.totalCashDrops || 0))}</span></div>
              </div>
              <p className="text-xs text-slate-500">
                Only payments that contribute to physical drawer cash are included. Card, bank and other non-cash tenders never enter this figure.
              </p>
            </div>

            {/* Cash Count */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Banknote size={18} className="text-slate-600" />
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800">Cash Count</h3>
              </div>
              <div>
                <label htmlFor="shiftclose-counted-cash" className="block text-sm font-medium text-slate-700 mb-1">Counted Cash Amount *</label>
                <input
                  id="shiftclose-counted-cash"
                  type="number"
                  step="0.01"
                  min="0"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  className="input"
                  placeholder="0.00"
                  required
                  autoFocus
                />
              </div>

              {difference !== null && (
                <div className={`rounded-lg p-3 flex items-center justify-between gap-3 border ${
                  isExact ? "bg-emerald-50 border-emerald-200" : difference < 0 ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
                }`}>
                  <div className="flex items-center gap-2">
                    {isExact ? <Banknote size={16} className="text-emerald-600" />
                      : difference < 0 ? <TrendingDown size={16} className="text-red-600" />
                      : <TrendingUp size={16} className="text-amber-600" />}
                    <p className="text-sm font-bold text-slate-700">
                      {isExact ? "Drawer reconciled" : difference < 0 ? "Shortage" : "Excess"}
                    </p>
                  </div>
                  <p className={`text-lg font-black ${
                    isExact ? "text-emerald-700" : difference < 0 ? "text-red-700" : "text-amber-700"
                  }`}>
                    {formatCurrency(Math.abs(difference))}
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="shiftclose-note" className="block text-sm font-medium text-slate-700 mb-1">Note (optional)</label>
                <textarea
                  id="shiftclose-note"
                  rows="2"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="input"
                  placeholder="Anything worth recording about this shift"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="page-section-enter flex flex-col sm:flex-row gap-2 pt-1" style={{ animationDelay: "130ms" }}>
          <Button type="submit" variant="danger" className="flex-1" disabled={closing}>
            {closing ? "Closing..." : "Confirm Close"}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={closing}>
            Cancel
          </Button>
          <Button type="button" variant="outline" onClick={handlePrint} disabled={closing}>
            <Printer size={16} className="mr-1" />
            Print Shift Report
          </Button>
        </div>

        {/* Hidden iframe for the shift report print (same shared path as receipts) */}
        <iframe ref={printFrameRef} title="Shift report print frame" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
};

export default ShiftCloseDialog;
