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
  const [showDrawerPurchases, setShowDrawerPurchases] = useState(false);
  const [showExpenses, setShowExpenses] = useState(false);
  const [showCashDrops, setShowCashDrops] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());
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

    // Payment-method breakdown and the itemized drawer movements load
    // together; expenses, drops and purchases explain the totals, they never
    // change any number.
    Promise.all([
      shiftsAPI.getPaymentSummary(shiftId).then((res) => res.data),
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
      .then(([summaryData, purchases, expenseRows, dropRows]) => {
        if (cancelled) return;
        setSummary(summaryData);
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

  const handlePrint = () => {
    const frame = printFrameRef.current;
    if (!frame || !shift) return;
    const methodRows = [...groupedRows.single, ...groupedRows.groups.flatMap((g) => g.members)]
      .map((m) => `
        <tr>
          <td>${m.displayName}</td>
          <td style="text-align:right">${m.transactionCount}</td>
          <td style="text-align:right">${formatCurrency(m.amount)}</td>
        </tr>`)
      .join("");
    const html = `<!doctype html>
      <html><head><title>Shift Report</title>
      <style>
        body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; margin: 24px; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        .sub { color: #64748b; font-size: 12px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th, td { padding: 6px 4px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
        th { text-align: left; font-size: 11px; text-transform: uppercase; color: #475569; }
        td.num, th.num { text-align: right; }
        .total td { font-weight: bold; border-top: 2px solid #94a3b8; }
      </style></head><body>
      <h1>Shift Report</h1>
      <div class="sub">
        ${shift.cashierName || `User ${shift.cashierUserId}`} · ${shift.branchName || `Branch ${shift.branchId}`}<br/>
        Opened ${formatDateTime(shift.openedAt)}${shift.closedAt ? ` · Closed ${formatDateTime(shift.closedAt)}` : ""}
      </div>
      <table>
        <thead><tr><th>Payment method</th><th class="num">Txns</th><th class="num">Amount</th></tr></thead>
        <tbody>
          ${methodRows || '<tr><td colspan="3">No sales in this shift</td></tr>'}
          <tr class="total"><td>Total sales</td><td class="num">${summary?.totalTransactions ?? 0}</td><td class="num">${formatCurrency(summary?.totalSales ?? 0)}</td></tr>
        </tbody>
      </table>
      <table>
        <tbody>
          <tr><td>Opening float</td><td class="num">${formatCurrency(shift.openingCash)}</td></tr>
          <tr><td>Cash sales</td><td class="num">${formatCurrency(shift.cashSales)}</td></tr>
          <tr><td>Expenses</td><td class="num">-${formatCurrency(regularExpenses)}</td></tr>
          <tr><td>Purchases paid from drawer</td><td class="num">-${formatCurrency(drawerPurchasesSum)}</td></tr>
          <tr><td>Cash drops</td><td class="num">-${formatCurrency(shift.totalCashDrops)}</td></tr>
          <tr class="total"><td>Expected cash in drawer</td><td class="num">${formatCurrency(expectedCash)}</td></tr>
        </tbody>
      </table>
      </body></html>`;
    printHtmlInFrame(frame, html);
  };

  if (!isOpen || !shift) return null;

  const MethodRowInner = ({ row, indent }) => (
    <div className={`flex items-center justify-between gap-3 ${indent ? "pl-11" : "px-3"} py-2.5`}>
      <div className="flex items-center gap-3 min-w-0">
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

        {/* Sales by payment method — dynamic, backend-aggregated */}
        <div className="page-section-enter" style={{ animationDelay: "70ms" }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700">Sales by Payment Method</h3>
            <span className="text-sm font-bold text-emerald-700">
              Total {formatCurrency(summary?.totalSales ?? 0)}
            </span>
          </div>

          {summaryLoading ? (
            <div className="flex items-center justify-center py-8 rounded-lg border border-slate-200">
              <LoadingSpinner size="sm" text="Loading sales breakdown..." />
            </div>
          ) : summaryError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-600 shrink-0" />
              <p className="text-sm text-red-700">Could not load the payment breakdown. The cash reconciliation below is still accurate.</p>
            </div>
          ) : groupedRows.single.length + groupedRows.groups.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center">
              <Wallet size={20} className="mx-auto text-slate-400 mb-1" />
              <p className="text-sm text-slate-600">No sales in this shift</p>
            </div>
          ) : (
            <div className="space-y-2">
              {groupedRows.groups.map((group) => (
                <GroupRow key={group.key} group={group} />
              ))}
              {groupedRows.single.map((row) => (
                <div key={row.code} className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50/50">
                  <MethodRowInner row={row} />
                </div>
              ))}
              <p className="text-xs text-slate-500 px-1">
                Grouped by payment category; expand for the individual methods. Only tenders marked
                <span className="font-semibold text-emerald-600"> in drawer</span> count toward expected cash.
              </p>
            </div>
          )}
        </div>

        {/* Physical cash reconciliation — the drawer, not total sales */}
        <div className="page-section-enter rounded-xl border-2 border-blue-200 bg-blue-50/40 p-4 space-y-3" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center gap-2">
            <Banknote size={18} className="text-blue-700" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-blue-800">Cash Reconciliation</h3>
          </div>
          <div className="rounded-lg bg-white border border-slate-200 px-4 py-3 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600"><span>Opening float</span><span className="font-semibold">{formatCurrency(shift.openingCash)}</span></div>
            <div className="flex justify-between text-slate-600"><span>Cash sales (drawer tender)</span><span className="font-semibold">{formatCurrency(shift.cashSales)}</span></div>
            <div className="pt-1">
              <button
                type="button"
                className="w-full flex items-center justify-between text-slate-600 hover:text-slate-800"
                aria-expanded={showExpenses}
                aria-controls="shiftclose-expenses"
                onClick={() => setShowExpenses((v) => !v)}
              >
                <span className="flex items-center gap-1.5">
                  {showExpenses ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  Expenses ({expenses.length})
                </span>
                <span className="font-semibold text-red-600">-{formatCurrency(regularExpenses)}</span>
              </button>
              {showExpenses && (
                <div id="shiftclose-expenses" className="mt-1.5 ml-5 space-y-1">
                  {expenses.length === 0 ? (
                    <p className="text-xs text-slate-400">No expenses in this shift</p>
                  ) : expenses.map((e) => (
                    <div key={e.id} className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="truncate">{e.description || e.category}</span>
                      <span className="font-semibold text-slate-700 shrink-0">{formatCurrency(e.amount || 0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="pt-1">
              <button
                type="button"
                className="w-full flex items-center justify-between text-slate-600 hover:text-slate-800"
                aria-expanded={showDrawerPurchases}
                aria-controls="shiftclose-drawer-purchases"
                onClick={() => setShowDrawerPurchases((v) => !v)}
              >
                <span className="flex items-center gap-1.5">
                  {showDrawerPurchases ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  Purchases paid from drawer ({drawerPurchases.length})
                </span>
                <span className="font-semibold text-red-600">-{formatCurrency(drawerPurchasesSum)}</span>
              </button>
              {showDrawerPurchases && (
                <div id="shiftclose-drawer-purchases" className="mt-1.5 ml-5 space-y-1">
                  {drawerPurchases.length === 0 ? (
                    <p className="text-xs text-slate-400">No purchases paid from this shift's drawer</p>
                  ) : drawerPurchases.map((p) => (
                    <div key={p.purchaseId} className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="truncate">{p.invoiceNo} · {p.supplierName}</span>
                      <span className="font-semibold text-slate-700 shrink-0">{formatCurrency(p.cashSourceAmount || 0)}</span>
                    </div>
                  ))}
                  <p className="text-[10px] text-slate-400">Included in the Expenses total above; shown separately so the drawer-money-to-suppliers is visible.</p>
                </div>
              )}
            </div>
            <div className="pt-1">
              <button
                type="button"
                className="w-full flex items-center justify-between text-slate-600 hover:text-slate-800"
                aria-expanded={showCashDrops}
                aria-controls="shiftclose-cash-drops"
                onClick={() => setShowCashDrops((v) => !v)}
              >
                <span className="flex items-center gap-1.5">
                  {showCashDrops ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  Cash drops ({cashDrops.length})
                </span>
                <span className="font-semibold text-red-600">-{formatCurrency(shift.totalCashDrops)}</span>
              </button>
              {showCashDrops && (
                <div id="shiftclose-cash-drops" className="mt-1.5 ml-5 space-y-1">
                  {cashDrops.length === 0 ? (
                    <p className="text-xs text-slate-400">No cash drops in this shift</p>
                  ) : cashDrops.map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="truncate">{d.reason || "Cash drop"}{d.bankAccountName ? ` · ${d.bankAccountName}` : ""}</span>
                      <span className="font-semibold text-slate-700 shrink-0">{formatCurrency(d.amount || 0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {summary?.cashCollections > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Credit collections (cash, informational)</span>
                <span className="font-semibold">{formatCurrency(summary.cashCollections)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-200">
              <span className="font-bold text-blue-800">Expected Cash in Drawer</span>
              <span className="text-lg font-black text-blue-700">{formatCurrency(expectedCash)}</span>
            </div>
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
