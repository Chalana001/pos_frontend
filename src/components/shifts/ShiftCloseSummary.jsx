import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { shiftsAPI } from "../../api/shifts.api";
import { cashDropsAPI } from "../../api/cashDrops.api";
import { formatCurrency, formatDateTime } from "../../utils/formatters";
import LoadingSpinner from "../common/LoadingSpinner";

// A shift is a single work session, not the whole business — this comfortably
// covers a real shift's activity in one request per category, no pagination
// needed inside the modal. If a shift ever exceeds this, the section footer
// says so rather than silently hiding the rest.
const SECTION_FETCH_SIZE = 100;

const Section = ({ title, items, totalCount, emptyText, renderRow, sumValue, sumTone, defaultOpen }) => {
  const [open, setOpen] = useState(!!defaultOpen);
  const hasItems = items.length > 0;

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <button
        type="button"
        onClick={() => hasItems && setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-slate-50 text-left ${hasItems ? "cursor-pointer hover:bg-slate-100" : "cursor-default"}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {hasItems ? (
            open ? <ChevronDown size={16} className="text-slate-600 shrink-0" /> : <ChevronRight size={16} className="text-slate-600 shrink-0" />
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <span className="font-semibold text-sm text-slate-700">{title}</span>
          <span className="text-xs text-slate-600">({totalCount})</span>
        </div>
        <span className={`font-bold text-sm shrink-0 ${sumTone || "text-slate-800"}`}>
          {formatCurrency(sumValue)}
        </span>
      </button>

      {open && hasItems && (
        <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 px-3">
          {items.map(renderRow)}
          {totalCount > items.length && (
            <p className="py-2 text-xs text-center text-slate-600">
              +{totalCount - items.length} more — see full shift history for the rest
            </p>
          )}
        </div>
      )}

      {!hasItems && (
        <p className="px-3 py-2 text-xs text-slate-600">{emptyText}</p>
      )}
    </div>
  );
};

/**
 * Itemized breakdown shown inside the close-shift modal: every sale, expense,
 * cash drop, and cash-drawer purchase that makes up this shift's numbers.
 *
 * Why purchases are here at all: a purchase paid from the shift's cash drawer
 * already reduces Expected Cash (folded into the shift's totalExpenses by
 * PurchaseService.applyDrawerCashOutIfNeeded on the backend) — but until now
 * that was invisible, just a bigger "Expenses" number with no explanation.
 * This section shows exactly which purchases account for it.
 */
const ShiftCloseSummary = ({ shiftId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sales, setSales] = useState({ items: [], total: 0 });
  const [expenses, setExpenses] = useState({ items: [], total: 0 });
  const [cashDrops, setCashDrops] = useState({ items: [], total: 0 });
  const [purchases, setPurchases] = useState({ items: [], total: 0 });

  useEffect(() => {
    if (!shiftId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const [salesRes, expensesRes, dropsRes, purchasesRes] = await Promise.all([
          shiftsAPI.getOrders(shiftId, { page: 0, size: SECTION_FETCH_SIZE }),
          shiftsAPI.getExpenses(shiftId, { page: 0, size: SECTION_FETCH_SIZE }),
          cashDropsAPI.getAll({ shiftId, page: 0, size: SECTION_FETCH_SIZE }),
          shiftsAPI.getPurchases(shiftId, { page: 0, size: SECTION_FETCH_SIZE }),
        ]);
        if (cancelled) return;
        setSales({ items: salesRes.data?.content || [], total: salesRes.data?.totalElements ?? 0 });
        setExpenses({ items: expensesRes.data?.content || [], total: expensesRes.data?.totalElements ?? 0 });
        setCashDrops({ items: dropsRes.data?.content || [], total: dropsRes.data?.totalElements ?? 0 });
        setPurchases({ items: purchasesRes.data?.content || [], total: purchasesRes.data?.totalElements ?? 0 });
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load shift close summary", err);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [shiftId]);

  if (!shiftId) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <LoadingSpinner size="sm" text="Loading shift activity..." />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600 py-2">Could not load this shift's activity. Cash totals above are still accurate.</p>;
  }

  const activeSales = sales.items.filter((s) => s.status !== "CANCELED");
  const salesSum = activeSales.reduce((acc, s) => acc + Number(s.grandTotal || 0), 0);
  const expensesSum = expenses.items.reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const cashDropsSum = cashDrops.items.reduce((acc, c) => acc + Number(c.amount || 0), 0);
  const activePurchases = purchases.items.filter((p) => p.status !== "CANCELED");
  const purchasesSum = activePurchases.reduce((acc, p) => acc + Number(p.cashSourceAmount || 0), 0);

  return (
    <div className="space-y-2">
      <Section
        title="Sales"
        items={sales.items}
        totalCount={sales.total}
        emptyText="No sales in this shift"
        sumValue={salesSum}
        sumTone="text-emerald-700"
        defaultOpen={sales.items.length > 0 && sales.items.length <= 5}
        renderRow={(sale) => (
          <div key={sale.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-slate-700 truncate">{sale.invoiceNo}</p>
              <p className="text-xs text-slate-600">{formatDateTime(sale.createdAt)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {sale.status === "CANCELED" && (
                <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">CANCELED</span>
              )}
              <span className={`font-bold ${sale.status === "CANCELED" ? "text-slate-600 line-through" : "text-slate-800"}`}>
                {formatCurrency(sale.grandTotal || 0)}
              </span>
            </div>
          </div>
        )}
      />

      <Section
        title="Expenses"
        items={expenses.items}
        totalCount={expenses.total}
        emptyText="No expenses in this shift"
        sumValue={expensesSum}
        sumTone="text-red-700"
        defaultOpen={expenses.items.length > 0 && expenses.items.length <= 5}
        renderRow={(expense) => (
          <div key={expense.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-slate-700 truncate">{expense.description || expense.category}</p>
              <p className="text-xs text-slate-600">{formatDateTime(expense.createdAt)}</p>
            </div>
            <span className="font-bold text-slate-800 shrink-0">{formatCurrency(expense.amount || 0)}</span>
          </div>
        )}
      />

      <Section
        title="Cash Drops"
        items={cashDrops.items}
        totalCount={cashDrops.total}
        emptyText="No cash drops in this shift"
        sumValue={cashDropsSum}
        sumTone="text-red-700"
        defaultOpen={cashDrops.items.length > 0 && cashDrops.items.length <= 5}
        renderRow={(drop) => (
          <div key={drop.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-slate-700 truncate">{drop.reason || "Cash drop"}</p>
              <p className="text-xs text-slate-600">{formatDateTime(drop.createdAt)}</p>
            </div>
            <span className="font-bold text-slate-800 shrink-0">{formatCurrency(drop.amount || 0)}</span>
          </div>
        )}
      />

      <Section
        title="Purchases paid from this drawer"
        items={purchases.items}
        totalCount={purchases.total}
        emptyText="No purchases paid from this shift's cash"
        sumValue={purchasesSum}
        sumTone="text-red-700"
        defaultOpen={purchases.items.length > 0}
        renderRow={(purchase) => (
          <div key={purchase.purchaseId} className="flex items-center justify-between gap-2 py-1.5 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-slate-700 truncate">{purchase.invoiceNo} · {purchase.supplierName}</p>
              <p className="text-xs text-slate-600">{formatDateTime(purchase.createdAt)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {purchase.status === "CANCELED" && (
                <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">CANCELED</span>
              )}
              <span className={`font-bold ${purchase.status === "CANCELED" ? "text-slate-600 line-through" : "text-slate-800"}`}>
                {formatCurrency(purchase.cashSourceAmount || 0)}
              </span>
            </div>
          </div>
        )}
      />
    </div>
  );
};

export default ShiftCloseSummary;
