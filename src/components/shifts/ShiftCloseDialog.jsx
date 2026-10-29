import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Calculator,
  ChevronDown,
  ChevronRight,
  Clock,
  Printer,
  ReceiptText,
  Settings,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";

import { shiftsAPI } from "../../api/shifts.api";
import { cashDropsAPI } from "../../api/cashDrops.api";
import { resolvePaymentIcon } from "../../utils/paymentMethodIcons";
import { formatCurrency, formatDateTime } from "../../utils/formatters";
import { calculateExpectedCash } from "../../utils/shiftCash";
import { printHtmlInFrame } from "../../utils/printFrame";
import { hasShopModule } from "../../utils/subscriptionFeatures";
import Button from "../common/Button";
import LoadingSpinner from "../common/LoadingSpinner";
import Modal from "../common/Modal";

// One page per section is enough for a real shift; the footer says so if not.
const SECTION_FETCH_SIZE = 100;

const fetchAllPages = async (fetchPage) => {
  const firstPage = await fetchPage(0);
  const firstData = firstPage?.data || {};
  const firstContent = Array.isArray(firstData.content) ? firstData.content : [];
  const pageCount = Number(firstData.totalPages || 1);
  if (pageCount <= 1) return firstContent;

  const remainingPages = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) => fetchPage(index + 1))
  );
  return [
    ...firstContent,
    ...remainingPages.flatMap((response) => Array.isArray(response?.data?.content) ? response.data.content : []),
  ];
};

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

const PAYMENT_TONES = {
  CASH: { icon: "bg-success-soft text-success", badge: "bg-success-soft text-success" },
  CARD: { icon: "bg-slate-100 text-accent", badge: "bg-accent-soft text-slate-800" },
  BANK_TRANSFER: { icon: "bg-info-soft text-info", badge: "bg-info-soft text-info" },
  MOBILE_DIGITAL: { icon: "bg-danger-soft text-danger", badge: "bg-danger-soft text-danger" },
  CREDIT: { icon: "bg-warning-soft text-warning", badge: "bg-warning-soft text-warning" },
  OTHER: { icon: "bg-slate-100 text-slate-700", badge: "bg-slate-100 text-slate-800" },
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
  const [expandedGroups, setExpandedGroups] = useState(() => new Set(["CARD"]));
  const [expandedMethods, setExpandedMethods] = useState(() => new Set());
  const [countedCash, setCountedCash] = useState("");
  const [cashCountSettings, setCashCountSettings] = useState({ enabled: false, denominations: [] });
  const [cashCountSettingsLoading, setCashCountSettingsLoading] = useState(true);
  const [countByDenomination, setCountByDenomination] = useState(false);
  const [denominationQuantities, setDenominationQuantities] = useState({});
  const [note, setNote] = useState("");
  const [closing, setClosing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const printFrameRef = useRef(null);

  const shiftId = shift?.id ?? null;

  useEffect(() => {
    if (!isOpen || !shiftId || !hasShopModule("SHIFTS_DENOMINATION_COUNT")) {
      setCashCountSettings({ enabled: false, denominations: [] });
      setCashCountSettingsLoading(false);
      setCountByDenomination(false);
      return undefined;
    }
    let cancelled = false;
    setCashCountSettingsLoading(true);
    shiftsAPI.getCashCountSettings()
      .then(({ data }) => {
        if (cancelled) return;
        const denominations = Array.isArray(data?.denominations) ? data.denominations : [];
        setCashCountSettings({ enabled: data?.enabled === true, denominations });
        setCountByDenomination(data?.enabled === true);
        setDenominationQuantities(Object.fromEntries(denominations.map((denomination) => [denomination, 0])));
      })
      .catch(() => {
        if (!cancelled) setCashCountSettings({ enabled: false, denominations: [] });
      })
      .finally(() => {
        if (!cancelled) setCashCountSettingsLoading(false);
      });
    return () => { cancelled = true; };
  }, [isOpen, shiftId]);

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
  const denominationCounts = cashCountSettings.denominations.map((denomination) => ({
    denomination,
    quantity: Number(denominationQuantities[denomination] || 0),
  }));
  const denominationTotal = denominationCounts.reduce(
    (total, row) => total + row.denomination * row.quantity,
    0
  );
  const useDenominationCount = cashCountSettings.enabled && countByDenomination;
  const counted = useDenominationCount
    ? denominationTotal
    : countedCash === "" ? null : Number(countedCash);
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
      await closeShift(shiftId, {
        countedCash: counted,
        note: note.trim(),
        denominationCounts: useDenominationCount ? denominationCounts : undefined,
      });
      toast.success("Shift closed successfully");
      setCountedCash("");
      setDenominationQuantities(Object.fromEntries(cashCountSettings.denominations.map((denomination) => [denomination, 0])));
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

  const handlePrint = async () => {
    const frame = printFrameRef.current;
    if (!frame || !shift || printing) return;

    setPrinting(true);
    let reportSales;
    let reportPurchases;
    let reportExpenses;
    let reportCashDrops;
    try {
      [reportSales, reportPurchases, reportExpenses, reportCashDrops] = await Promise.all([
        fetchAllPages((page) => shiftsAPI.getOrders(shiftId, { page, size: SECTION_FETCH_SIZE })),
        fetchAllPages((page) => shiftsAPI.getPurchases(shiftId, { page, size: SECTION_FETCH_SIZE })),
        fetchAllPages((page) => shiftsAPI.getExpenses(shiftId, { page, size: SECTION_FETCH_SIZE })),
        fetchAllPages((page) => cashDropsAPI.getAll({ shiftId, page, size: SECTION_FETCH_SIZE })),
      ]);
      reportSales = reportSales.filter((sale) => sale.status !== "CANCELED");
      reportPurchases = reportPurchases.filter((purchase) => purchase.status !== "CANCELED");
    } catch (error) {
      toast.error("Could not load all shift records for the report. Please try again.");
      setPrinting(false);
      return;
    }

    const allMethodRows = [...groupedRows.single, ...groupedRows.groups.flatMap((g) => g.members)];
    const methodByCode = new Map(allMethodRows.map((method) => [method.code, method]));
    const methodRows = allMethodRows.map((method) => `
      <tr>
        <td>${escapeHtml(method.displayName)}${method.unknown ? " <span class=\"muted\">(unknown)</span>" : ""}</td>
        <td class="num">${Number(method.transactionCount || 0)}</td>
        <td class="num">${formatCurrency(method.amount || 0)}</td>
      </tr>`).join("") || '<tr><td colspan="3" class="muted">No sales in this shift</td></tr>';
    const saleRows = reportSales.map((sale) => {
      const method = methodByCode.get(sale.paymentMethod);
      const tender = method?.displayName || sale.paymentMethod || "Unknown";
      const reference = sale.bankReference
        ? `${method?.referenceLabel || "Reference"}: ${sale.bankReference}`
        : "—";
      return `
        <tr>
          <td>${escapeHtml(sale.invoiceNo || "—")}</td>
          <td>${escapeHtml(formatDateTime(sale.createdAt))}</td>
          <td>${escapeHtml(tender)}</td>
          <td>${escapeHtml(reference)}</td>
          <td class="num">${formatCurrency(sale.grandTotal || 0)}</td>
        </tr>`;
    }).join("") || '<tr><td colspan="5" class="muted">No sale details loaded</td></tr>';

    const expenseRows = reportExpenses.map((expense) => `
      <tr><td>${escapeHtml(expense.description || expense.category || "Expense")}</td><td class="num">${formatCurrency(expense.amount || 0)}</td></tr>`)
      .join("") || '<tr><td class="muted">No expenses recorded</td><td class="num">—</td></tr>';
    const purchaseRows = reportPurchases.map((purchase) => `
      <tr><td>${escapeHtml(purchase.invoiceNo || "Purchase")} · ${escapeHtml(purchase.supplierName || "Supplier")}</td><td class="num">${formatCurrency(purchase.cashSourceAmount || 0)}</td></tr>`)
      .join("") || '<tr><td class="muted">No drawer purchases recorded</td><td class="num">—</td></tr>';
    const dropRows = reportCashDrops.map((drop) => `
      <tr><td>${escapeHtml(drop.reason || "Cash drop")}${drop.bankAccountName ? ` · ${escapeHtml(drop.bankAccountName)}` : ""}</td><td class="num">${formatCurrency(drop.amount || 0)}</td></tr>`)
      .join("") || '<tr><td class="muted">No cash drops recorded</td><td class="num">—</td></tr>';

    const rawCountedCash = counted ?? (shift.countedCash == null ? null : Number(shift.countedCash));
    const countedCash = Number.isFinite(rawCountedCash) ? rawCountedCash : null;
    const cashDifference = countedCash === null ? null : countedCash - expectedCash;
    const printedDenominations = useDenominationCount ? denominationCounts : (shift.denominationCounts || []);
    const denominationRows = printedDenominations.map(({ denomination, quantity }) => `
      <tr><td>${formatCurrency(denomination)}</td><td class="num">${Number(quantity || 0)}</td><td class="num">${formatCurrency(Number(denomination) * Number(quantity || 0))}</td></tr>`)
      .join("") || '<tr><td colspan="3" class="muted">No denomination count recorded</td></tr>';
    const openedAt = formatDateTime(shift.openedAt);
    const closedAt = shift.closedAt ? formatDateTime(shift.closedAt) : "Not closed yet";
    const duration = shiftDuration(shift.openedAt, shift.closedAt);
    const openingNote = shift.openNote || "—";
    const closingNote = note.trim() || shift.closeNote || "—";

    const html = `<!doctype html>
      <html><head><meta charset="utf-8"><title>Shift Z Report</title>
      <style>
        @page { size: A4 portrait; margin: 12mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; color: #172554; margin: 0; font-size: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .brand { display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #dbeafe; padding-bottom:10px; }
        .brand-name { color:#0f766e; font-size:10px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; }
        h1 { color:#0f172a; font-size:22px; margin:3px 0 0; letter-spacing:.4px; }
        .shift-meta { color:#475569; text-align:right; line-height:1.55; font-size:10px; }
        .columns { display:grid; grid-template-columns:1.03fr .97fr; gap:10px; align-items:start; }
        .section { margin:0 0 9px; border:1px solid #dbe3ef; border-radius:7px; overflow:hidden; break-inside:avoid; }
        h2 { margin:0; padding:7px 9px; border-bottom:1px solid #dbe3ef; background:#f8fafc; color:#1e3a8a; font-size:11px; }
        table { width:100%; border-collapse:collapse; }
        th, td { padding:4px 6px; border-bottom:1px solid #e8eef6; font-size:9px; vertical-align:top; }
        th { background:#f8fafc; color:#475569; font-size:8px; text-align:left; text-transform:uppercase; letter-spacing:.3px; }
        td.num, th.num { text-align:right; white-space:nowrap; }
        tbody tr:last-child td { border-bottom:0; }
        .total td { background:#ecfdf5; color:#047857; font-weight:700; }
        .recon td:first-child { color:#475569; }
        .recon .expected-row td { color:#1d4ed8; font-weight:700; background:#eff6ff; }
        .recon .counted-row td { color:#047857; font-weight:700; background:#ecfdf5; }
        .recon .difference-row td { color:#be123c; font-weight:700; background:#fff1f2; }
        .muted { color:#94a3b8; }
        .notes { display:grid; grid-template-columns:1fr 1fr; gap:8px; padding:8px; }
        .note-label { color:#64748b; font-size:8px; font-weight:700; text-transform:uppercase; }
        .note-value { margin-top:3px; color:#334155; white-space:pre-wrap; }
        .notice { color:#64748b; font-size:8px; padding:0 7px 6px; }
        .page-break { break-before:page; page-break-before:always; }
        .footer { display:flex; justify-content:space-between; color:#64748b; border-top:1px solid #dbe3ef; padding-top:6px; margin-top:8px; font-size:8px; }
        thead { display:table-header-group; }
        tr { break-inside:avoid; }
      </style></head><body>
      <header class="brand">
        <div><div class="brand-name">ZenSys POS · Shift Close</div><h1>SHIFT Z REPORT</h1></div>
        <div class="shift-meta"><strong>Shift #${escapeHtml(shift.id)}</strong> · ${escapeHtml(shift.status || "OPEN")}<br/>Cashier: ${escapeHtml(shift.cashierName || `User ${shift.cashierUserId}`)} · ${escapeHtml(shift.branchName || `Branch ${shift.branchId}`)}</div>
      </header>
      <div class="shift-meta" style="text-align:left;margin:9px 0">Opened ${escapeHtml(openedAt)} · Closed ${escapeHtml(closedAt)} · Duration ${escapeHtml(duration)}</div>

      <main class="columns">
        <div>
          <section class="section"><h2>Sales by Payment Method</h2>
            <table><thead><tr><th>Payment Method</th><th class="num">Transactions</th><th class="num">Amount (LKR)</th></tr></thead>
              <tbody>${methodRows}<tr class="total"><td>Total Sales</td><td class="num">${summary?.totalTransactions ?? reportSales.length}</td><td class="num">${formatCurrency(summary?.totalSales ?? 0)}</td></tr></tbody>
            </table>
          </section>
          <section class="section"><h2>Shift Notes</h2><div class="notes">
            <div><div class="note-label">Opening Note</div><div class="note-value">${escapeHtml(openingNote)}</div></div>
            <div><div class="note-label">Closing Note</div><div class="note-value">${escapeHtml(closingNote)}</div></div>
          </div></section>
        </div>
        <div>
          <section class="section"><h2>Cash Drawer Reconciliation</h2>
            <table class="recon"><tbody>
              <tr><td>Opening Float</td><td class="num">${formatCurrency(shift.openingCash || 0)}</td></tr>
              <tr><td>Cash Sales (drawer tender)</td><td class="num">${formatCurrency(shift.cashSales || 0)}</td></tr>
              <tr><td>Expenses from drawer</td><td class="num">−${formatCurrency(regularExpenses)}</td></tr>
              <tr><td>Drawer purchases</td><td class="num">−${formatCurrency(drawerPurchasesSum)}</td></tr>
              <tr><td>Cash drops</td><td class="num">−${formatCurrency(shift.totalCashDrops || 0)}</td></tr>
              <tr class="expected-row"><td>Expected Cash</td><td class="num">${formatCurrency(expectedCash)}</td></tr>
              ${countedCash === null ? "" : `<tr class="counted-row"><td>Counted Cash</td><td class="num">${formatCurrency(countedCash)}</td></tr>`}
              ${cashDifference === null ? "" : `<tr class="difference-row"><td>Difference ${cashDifference < 0 ? "(shortage)" : cashDifference > 0 ? "(surplus)" : "(balanced)"}</td><td class="num">${cashDifference > 0 ? "+" : cashDifference < 0 ? "−" : ""}${formatCurrency(Math.abs(cashDifference))}</td></tr>`}
            </tbody></table>
            <div class="notice">Only cash tenders affect the drawer balance; card, bank, mobile, and credit tenders are excluded.</div>
          </section>
          <section class="section"><h2>Counter Cash · Denomination Count</h2>
            <table><thead><tr><th>Denomination</th><th class="num">Qty</th><th class="num">Subtotal (LKR)</th></tr></thead>
              <tbody>${denominationRows}</tbody>
            </table>
            ${printedDenominations.length ? '<div class="notice">Count entered at shift close</div>' : '<div class="notice">No denomination count was entered for this shift.</div>'}
          </section>
        </div>
      </main>
      <div class="footer"><span>Printed ${escapeHtml(formatDateTime(new Date().toISOString()))}</span><span>Shift #${escapeHtml(shift.id)}</span></div>

      <section class="page-break">
        <header class="brand"><div><div class="brand-name">ZenSys POS · Shift Close</div><h1>SHIFT ACTIVITY DETAILS</h1></div><div class="shift-meta">Shift #${escapeHtml(shift.id)}<br/>${escapeHtml(openedAt)} – ${escapeHtml(closedAt)}</div></header>
        <section class="section" style="margin-top:10px"><h2>Sale Details (${reportSales.length} transactions)</h2>
          <table><thead><tr><th>Invoice</th><th>Time</th><th>Tender</th><th>Reference</th><th class="num">Amount (LKR)</th></tr></thead><tbody>${saleRows}</tbody></table>
          <div class="notice">Complete shift sale list</div>
        </section>
        <div class="columns">
          <section class="section"><h2>Expense Records</h2><table><thead><tr><th>Description</th><th class="num">Amount (LKR)</th></tr></thead><tbody>${expenseRows}</tbody></table></section>
          <section class="section"><h2>Drawer Purchase Records</h2><table><thead><tr><th>Purchase · Supplier</th><th class="num">Amount (LKR)</th></tr></thead><tbody>${purchaseRows}</tbody></table></section>
        </div>
        <section class="section"><h2>Cash Drop Records</h2><table><thead><tr><th>Reason · Destination</th><th class="num">Amount (LKR)</th></tr></thead><tbody>${dropRows}</tbody></table></section>
        <div class="footer"><span>Printed ${escapeHtml(formatDateTime(new Date().toISOString()))}</span><span>Shift #${escapeHtml(shift.id)} · Details</span></div>
      </section>
      </body></html>`;
    printHtmlInFrame(frame, html);
    setPrinting(false);
  };

  if (!isOpen || !shift) return null;

  const cashierLabel = shift.cashierName || `User ${shift.cashierUserId}`;
  const cashDenominations = Array.isArray(cashCountSettings.denominations) ? cashCountSettings.denominations : [];
  const denominationSplitIndex = Math.ceil(cashDenominations.length / 2);
  const denominationColumns = [
    cashDenominations.slice(0, denominationSplitIndex),
    cashDenominations.slice(denominationSplitIndex),
  ];
  const renderDenominationRow = (denomination) => {
    const quantity = Number(denominationQuantities[denomination] || 0);
    return (
      <div key={denomination} className="grid grid-cols-[minmax(0,1fr)_3.5rem_0.75rem_minmax(4.5rem,auto)] items-center gap-1 border-b border-slate-100 px-1.5 py-0 text-[11px] last:border-b-0">
        <span className="font-medium text-slate-700">Rs {denomination.toLocaleString("en-LK")}</span>
        <input
          type="number"
          min="0"
          step="1"
          value={quantity}
          onChange={(event) => setDenominationQuantities((current) => ({
            ...current,
            [denomination]: event.target.value === "" ? 0 : Number(event.target.value),
          }))}
          aria-label={`Quantity of Rs ${denomination.toLocaleString("en-LK")}`}
          className="h-5 w-full rounded border border-slate-300 px-1 text-center text-[11px] focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <span className="text-center text-slate-400">×</span>
        <span className="text-right font-semibold text-slate-700">{formatCurrency(denomination * quantity)}</span>
      </div>
    );
  };

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
    const tone = PAYMENT_TONES[row.category] || PAYMENT_TONES.OTHER;
    return (
      <div className={indent ? "" : "overflow-hidden border-b border-slate-200 last:border-b-0 bg-white"}>
        <button
          type="button"
          aria-expanded={methodOpen}
          aria-controls={`shiftclose-method-${row.code}`}
          onClick={() => toggleMethod(row.code)}
          className={`w-full grid grid-cols-[minmax(0,1fr)_5rem_8.5rem] items-center gap-2 ${indent ? "pl-9 pr-3 bg-accent-soft/80 hover:bg-slate-100/70" : "px-4 hover:bg-slate-50"} py-2.5 text-left transition-colors`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {methodOpen ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
            {(() => {
              const Icon = resolvePaymentIcon({ iconKey: row.iconKey, category: row.category });
              return <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${tone.icon}`}><Icon size={19} /></span>;
            })()}
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-700 truncate flex items-center gap-2">
                <span className={`rounded-md px-2.5 py-1 ${tone.badge}`}>{row.displayName}</span>
                {row.unknown && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">UNKNOWN</span>}
                {row.inactive && !row.unknown && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-warning-soft text-warning">INACTIVE</span>}
              </p>
            </div>
          </div>
          <p className="text-sm text-center text-slate-600">{row.transactionCount}</p>
          <div className="text-right min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{formatCurrency(row.amount)}</p>
            {row.includeInExpectedCash && <p className="text-[10px] font-bold text-success uppercase tracking-wide">in drawer</p>}
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
    <div className="overflow-hidden bg-white">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={domId}
        onClick={onToggle}
        className="w-full grid grid-cols-[minmax(0,1fr)_2rem_auto_1rem] items-center gap-2 px-2.5 py-1 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {open ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 shrink-0">{icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-700 truncate">{label}</p>
          </div>
        </div>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-center text-[11px] text-slate-700">{count}</span>
        <p className="text-xs font-bold text-danger shrink-0">{formatCurrency(amount)}</p>
        <ChevronRight size={16} className="text-slate-500" />
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
    const tone = PAYMENT_TONES[group.category] || PAYMENT_TONES.OTHER;
    return (
      <div className="overflow-hidden border-b border-slate-200 last:border-b-0 bg-white">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`shiftclose-group-${group.key}`}
          onClick={() => toggleGroup(group.key)}
          className="w-full grid grid-cols-[minmax(0,1fr)_5rem_8.5rem] items-center gap-2 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            {open ? <ChevronDown size={16} className="text-slate-600 shrink-0" /> : <ChevronRight size={16} className="text-slate-600 shrink-0" />}
            {(() => {
              const Icon = resolvePaymentIcon({ category: group.category });
              return <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${tone.icon}`}><Icon size={19} /></span>;
            })()}
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-700 truncate"><span className={`inline-block rounded-md px-2.5 py-1 ${tone.badge}`}>{group.label}</span></p>
            </div>
          </div>
          <p className="text-sm text-center text-slate-600">{group.transactionCount}</p>
          <p className="text-sm font-bold text-right text-slate-800 truncate">{formatCurrency(group.amount)}</p>
        </button>
        {open && (
          <div id={`shiftclose-group-${group.key}`} className="divide-y divide-slate-200 border-t border-slate-200 bg-accent-soft/80">
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
      size="3xl"
      title={`Close Shift (Cashier: ${cashierLabel})`}
    >
      <form onSubmit={handleConfirm} className="space-y-2 sm:space-y-3">
        {/* Shift information — genuine record values, nothing invented */}
        <div className="page-section-enter grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 rounded-xl border border-slate-200 bg-white divide-y sm:divide-y-0 sm:divide-x divide-slate-200" style={{ animationDelay: "40ms" }}>
          <div className="flex items-center gap-2.5 px-3 py-2 min-w-0">
            <span className="h-9 w-9 rounded-full bg-accent-soft text-accent flex items-center justify-center shrink-0"><Clock size={17} /></span>
            <div className="min-w-0"><p className="text-sm font-semibold text-slate-500">Shift Opened</p><p className="text-sm font-medium text-slate-800 truncate">{formatDateTime(shift.openedAt)}</p></div>
          </div>
          <div className="flex items-center gap-2.5 px-3 py-2 min-w-0">
            <span className="h-9 w-9 rounded-full bg-success-soft text-success flex items-center justify-center shrink-0"><Wallet size={17} /></span>
            <div><p className="text-sm font-semibold text-slate-500">Status</p><span className={`mt-0.5 inline-flex rounded-md px-2.5 py-1 text-xs font-bold ${shift.status === "OPEN" ? "bg-success-soft text-success" : "bg-slate-100 text-slate-700"}`}>{shift.status || "—"}</span></div>
          </div>
          <div className="flex items-center gap-2.5 px-3 py-2 min-w-0">
            <span className="h-9 w-9 rounded-full bg-info-soft text-info flex items-center justify-center shrink-0"><Clock size={17} /></span>
            <div><p className="text-sm font-semibold text-slate-500">Duration</p><p className="text-sm font-medium text-slate-800">{shiftDuration(shift.openedAt, shift.closedAt)}</p></div>
          </div>
          <div className="flex items-center gap-2.5 px-3 py-2 min-w-0">
            <span className="h-9 w-9 rounded-full bg-warning-soft text-warning flex items-center justify-center shrink-0"><ReceiptText size={17} /></span>
            <div><p className="text-sm font-semibold text-slate-500">Total Transactions</p><p className="text-sm font-medium text-slate-800">{summary?.totalTransactions ?? (summaryLoading ? "…" : 0)}</p></div>
          </div>
        </div>

        {/* Two-column reference layout; single column below lg */}
        <div className="page-section-enter grid grid-cols-1 lg:grid-cols-2 items-start gap-2 sm:gap-3" style={{ animationDelay: "70ms" }}>
          <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-3">
          <div className="order-1 min-w-0">
          <div className="rounded-xl border border-slate-200 bg-white p-2 sm:p-2.5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-800">Sales by Payment Method (All Tenders)</h3>
              <p className="flex items-center gap-2 text-lg font-black text-success whitespace-nowrap"><Wallet size={19} />{formatCurrency(summary?.totalSales ?? 0)}</p>
            </div>

            {summaryLoading ? (
              <div className="flex items-center justify-center py-8 rounded-lg border border-slate-200">
                <LoadingSpinner size="sm" text="Loading sales breakdown..." />
              </div>
            ) : summaryError ? (
              <div className="rounded-lg border border-danger-border bg-danger-soft px-4 py-3 flex items-center gap-2">
                <AlertTriangle size={16} className="text-danger shrink-0" />
                <p className="text-sm text-danger">Could not load the payment breakdown. The cash reconciliation on the right is still accurate.</p>
              </div>
            ) : groupedRows.single.length + groupedRows.groups.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-6 text-center">
                <Wallet size={20} className="mx-auto text-slate-400 mb-1" />
                <p className="text-sm text-slate-600">No sales in this shift</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <div className="grid grid-cols-[minmax(0,1fr)_5rem_8.5rem] gap-2 bg-slate-50 px-4 py-2.5 border-b border-slate-200 text-xs font-bold text-slate-600">
                  <span>Payment Method</span>
                  <span className="text-center">Transactions</span>
                  <span className="text-right">Amount (LKR)</span>
                </div>
                {groupedRows.groups.map((group) => (
                  <GroupRow key={group.key} group={group} />
                ))}
                {groupedRows.single.map((row) => (
                  <MethodRowInner key={row.code} row={row} />
                ))}
                <div className="grid grid-cols-[minmax(0,1fr)_5rem_8.5rem] items-center gap-2 px-3 py-2 bg-success-soft text-slate-800 border-t border-success-border">
                  <div>
                    <p className="text-sm font-bold">Total Sales (All Payment Methods)</p>
                  </div>
                  <p className="text-sm text-center text-slate-600">{summary?.totalTransactions ?? 0}</p>
                  <p className="text-sm font-black text-right text-success truncate">{formatCurrency(summary?.totalSales ?? 0)}</p>
                </div>
                <p className="text-xs text-slate-500 px-1">
                  Tap a method to list its sales. Only tenders marked
                  <span className="font-semibold text-success"> in drawer</span> count toward expected cash.
                </p>
              </div>
            )}
          </div>

          </div>

          {/* Mobile stack order: Sales, Other Summary, Expected Cash, Cash Count. */}
          <div className="order-3 min-w-0 rounded-xl border border-slate-200 bg-white p-2 sm:p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><Banknote size={19} /></span>
                <div><h3 className="text-base font-bold text-slate-800">Expected Cash in Drawer</h3><p className="text-xs text-slate-500">Cash sales only (based on records)</p></div>
              </div>
              <span className="text-xl font-black text-accent">{formatCurrency(expectedCash)}</span>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-accent-soft px-3 py-2 text-xs text-accent">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <p>Only cash sales are included in expected cash. Card, bank and other payment methods never enter the cash drawer.</p>
            </div>
          </div>

          </div>

          <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-3">
            {/* Other Summary */}
            <div className="order-2 min-w-0 rounded-xl border border-slate-200 bg-white p-2 sm:p-2.5 space-y-1.5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800"><Calculator size={17} /> Other Summary</h3>

              <div className="overflow-hidden rounded-lg border border-slate-200 divide-y divide-slate-200">
              <SummaryRow
                icon={<TrendingDown size={18} className="text-warning shrink-0" />}
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
                icon={<Banknote size={18} className="text-danger shrink-0" />}
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
                icon={<TrendingUp size={18} className="text-accent shrink-0" />}
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
              </div>

              {summary?.cashCollections > 0 && (
                <div className="flex items-center justify-between gap-3 pt-1 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Banknote size={18} className="text-success shrink-0" />
                    <span>Credit collections (cash, informational)</span>
                  </div>
                  <span className="font-bold text-success">{formatCurrency(summary.cashCollections)}</span>
                </div>
              )}
              <p className="text-[10px] leading-4 text-slate-400 px-1">Drawer purchases and cash drops already reduce Expected Cash.</p>
            </div>

            {/* Cash Count */}
            <div className="order-4 min-w-0 rounded-xl border border-slate-200 bg-white p-2 sm:p-2.5 space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><Banknote size={17} /></span>
                <h3 className="text-sm font-bold text-slate-800">Cash Count</h3>
                </div>
                {cashCountSettings.enabled && (
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={countByDenomination}
                      onChange={(event) => setCountByDenomination(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
                    />
                    <span className="hidden sm:inline text-xs">Count by denomination (optional)</span>
                    <span className="sm:hidden">Count by denomination</span>
                  </label>
                )}
              </div>
              {cashCountSettingsLoading ? (
                <p className="text-sm text-slate-500">Loading cash count options...</p>
              ) : (
                <>
                  {useDenominationCount && (
                    <div>
                      <div className="sm:hidden">
                        <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_0.75rem_minmax(4.5rem,auto)] gap-1 border-b border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                          <span>Denomination</span><span className="text-center">Qty</span><span /><span className="text-right">Subtotal</span>
                        </div>
                        {cashDenominations.map(renderDenominationRow)}
                      </div>
                      <div className="hidden gap-1.5 sm:grid sm:grid-cols-2 sm:divide-x sm:divide-slate-200">
                        {denominationColumns.map((column, columnIndex) => (
                          <div key={columnIndex} className={columnIndex === 1 ? "sm:pl-2" : "sm:pr-2"}>
                            <div className="grid grid-cols-[minmax(0,1fr)_3.5rem_0.75rem_minmax(4.5rem,auto)] gap-1 border-b border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                              <span>Denomination</span><span className="text-center">Qty</span><span /><span className="text-right">Subtotal</span>
                            </div>
                            {column.map(renderDenominationRow)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!useDenominationCount && <div>
                    <label htmlFor="shiftclose-counted-cash" className="mb-1 block text-sm font-medium text-slate-700">Counted Cash {useDenominationCount ? "(Total)" : "*"}</label>
                    <input
                      id="shiftclose-counted-cash"
                      type={useDenominationCount ? "text" : "number"}
                      step={useDenominationCount ? undefined : "0.01"}
                      min={useDenominationCount ? undefined : "0"}
                      value={useDenominationCount ? formatCurrency(denominationTotal) : countedCash}
                      onChange={useDenominationCount ? undefined : (event) => setCountedCash(event.target.value)}
                      className="input !h-12 !border-2 !border-accent !text-lg"
                      placeholder="0.00"
                      readOnly={useDenominationCount}
                      required
                      autoFocus
                    />
                  </div>}
                </>
              )}

              {useDenominationCount && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-success-border bg-success-soft px-2 py-1">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-800">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-success-soft text-success"><Wallet size={13} /></span>
                    Counted Cash (Total)
                  </div>
                  <span className="text-sm font-black text-success">{formatCurrency(denominationTotal)}</span>
                </div>
              )}

              {useDenominationCount && (
                <Link to="/settings/cash-denominations" className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent">
                  <Settings size={14} /> Manage denominations in Settings
                </Link>
              )}

              {difference !== null && (
                <div className={`rounded-lg p-1.5 flex items-center justify-between gap-3 border ${
                  isExact ? "bg-success-soft border-success-border" : difference < 0 ? "bg-danger-soft border-danger-border" : "bg-warning-soft border-warning-border"
                }`}>
          <div className="flex items-center gap-2">
                    {isExact ? <Banknote size={16} className="text-success" />
                      : difference < 0 ? <TrendingDown size={16} className="text-danger" />
                      : <TrendingUp size={16} className="text-warning" />}
                    <div><p className={`text-xs font-bold ${isExact ? "text-success" : difference < 0 ? "text-danger" : "text-warning"}`}>
                      {isExact ? "Drawer reconciled" : difference < 0 ? "Shortage" : "Excess"}
                    </p><p className="text-xs text-slate-500">(Counted - Expected)</p></div>
                  </div>
                  <p className={`text-sm font-black ${
                    isExact ? "text-success" : difference < 0 ? "text-danger" : "text-warning"
                  }`}>
                    {formatCurrency(difference)}
                  </p>
                </div>
              )}

              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-slate-600">Add a note (optional)</summary>
                <textarea id="shiftclose-note" rows="2" value={note} onChange={(e) => setNote(e.target.value)} className="input mt-2" placeholder="Anything worth recording about this shift" />
              </details>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="page-section-enter sticky bottom-[-12px] z-10 -mx-3 -mb-3 mt-2 flex items-center justify-between gap-2 border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur sm:px-3" style={{ animationDelay: "130ms" }}>
          <Button type="button" variant="outline" onClick={handlePrint} disabled={closing || printing} className="min-w-0 flex-1 whitespace-nowrap px-2 text-xs sm:flex-none sm:min-w-56 sm:px-4 sm:text-sm">
            <Printer size={16} className="mr-1.5 sm:mr-2" />
            <span className="sm:hidden">{printing ? "Printing..." : "Print"}</span>
            <span className="hidden sm:inline">{printing ? "Preparing Z Report..." : "Print Z Report"}</span>
          </Button>
          <Button type="submit" variant="danger" className="min-w-0 flex-1 whitespace-nowrap px-2 text-xs sm:flex-none sm:min-w-64 sm:px-4 sm:text-sm" disabled={closing || cashCountSettingsLoading}>
              {closing ? "Closing..." : "✓  Confirm Close"}
          </Button>
        </div>

        {/* Hidden iframe for the shift report print (same shared path as receipts) */}
        <iframe ref={printFrameRef} title="Shift report print frame" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
};

export default ShiftCloseDialog;
