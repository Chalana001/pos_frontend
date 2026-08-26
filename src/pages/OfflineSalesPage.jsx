import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Printer,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Trash2,
  UploadCloud,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "react-hot-toast";
import Button from "../components/common/Button";
import CustomSelect from "../components/common/CustomSelect";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ReceiptPrinter from "../components/pos/ReceiptPrinter";
import {
  deleteOfflineSale,
  getCachedReceiptSettings,
  OFFLINE_EVENTS,
  updateOfflineSale,
} from "../offline/db";
import {
  evaluateQueue,
  isBatchTracked,
  normalizeImportErrorMessage,
  pushRows,
  rowHasOpenShift,
  sortBatchesForFifo,
} from "../offline/sync";
import { useAuth } from "../context/AuthContext";
import { useShift } from "../context/ShiftContext";
import { formatCurrency } from "../utils/formatters";
import { PRINT_TEMPLATE_TYPES } from "../utils/receiptSettings";
import { BRAND_NAME_UPPER } from "../utils/branding";
import {
  formatDisplayStockQuantity,
  formatStockQuantity,
} from "../utils/stockQuantity";

const OfflineSalesPage = () => {
  const { isOnline, hasOnlineSession, user } = useAuth();
  const { activeShift, loadingShift, refreshShift } = useShift();
  const printRef = useRef(null);

  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [queue, setQueue] = useState({
    rows: [],
    readyRows: [],
    itemLookupByBranch: {},
    shiftMap: {},
    validationMap: {},
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [lastImportSummary, setLastImportSummary] = useState(null);

  const { rows, readyRows, itemLookupByBranch, shiftMap, validationMap } = queue;
  const online = isOnline && hasOnlineSession;

  // One call does what four effects used to: read the queue, refresh the live stock
  // snapshot, resolve per-cashier shift readiness, and replay the shortfall simulation.
  // The sync agent calls exactly the same function, so the two can never disagree about
  // which rows are ready.
  const reloadQueue = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const next = await evaluateQueue({
        online,
        isAdminOrManager,
        activeShift,
        currentUserId: user?.userId,
      });
      setQueue(next);
    } catch (error) {
      console.error(error);
      toast.error("Failed to refresh the offline queue");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeShift, isAdminOrManager, online, user?.userId]);


  useEffect(() => {
    reloadQueue();
  }, [reloadQueue]);

  useEffect(() => {
    const handler = () => reloadQueue({ silent: true });
    window.addEventListener(OFFLINE_EVENTS.OFFLINE_SALES_CHANGED, handler);
    return () => window.removeEventListener(OFFLINE_EVENTS.OFFLINE_SALES_CHANGED, handler);
  }, [reloadQueue]);

  const getRowHasOpenShift = useCallback(
    (row) => (online ? rowHasOpenShift(row, shiftMap, user?.userId) : false),
    [online, shiftMap, user?.userId]
  );

  const getRowStockValidation = useCallback(
    (row) => validationMap[row.clientSaleId] || { issues: [], hasShortfall: false },
    [validationMap]
  );

  const rowsNeedingShift = useMemo(
    () => rows.filter((row) => online && !getRowHasOpenShift(row)),
    [getRowHasOpenShift, online, rows]
  );

  const rowsWithStockIssues = useMemo(
    () => rows.filter((row) => getRowStockValidation(row).hasShortfall),
    [getRowStockValidation, rows]
  );

  const retryableRows = useMemo(
    () => rows.filter((row) => !!row.lastError && getRowHasOpenShift(row)),
    [getRowHasOpenShift, rows]
  );

  const refreshAll = async () => {
    if (online) await refreshShift();
    await reloadQueue({ silent: true });
  };

  const updateBatchSelection = async (row, itemIndex, batchId) => {
    const nextPayload = structuredClone(row.payload);
    nextPayload.items[itemIndex].batchId = batchId ? Number(batchId) : null;
    const nextPreview = Array.isArray(row.itemsPreview) ? structuredClone(row.itemsPreview) : [];
    if (nextPreview[itemIndex]) {
      nextPreview[itemIndex].batchId = batchId ? Number(batchId) : null;
    }

    await updateOfflineSale(row.clientSaleId, {
      payload: nextPayload,
      itemsPreview: nextPreview,
      lastError: null,
    });
    setLastImportSummary(null);
    await reloadQueue({ silent: true });
  };

  // One push path for the row button, the "push ready" button and the retry button. They
  // differ only in which rows they hand over and what they say afterwards; the import,
  // the delete-on-success and the lastError bookkeeping are all in sync.pushRows.
  const runPush = async (rowsToPush, { verb, skipped = 0 }) => {
    if (rowsToPush.length === 0) {
      toast.error("No queued sales are ready to import");
      return;
    }

    try {
      const { imported, failed } = await pushRows(rowsToPush);
      const plural = (count) => (count === 1 ? "" : "s");

      setLastImportSummary({
        imported,
        failed,
        skipped,
        message:
          failed > 0
            ? `${verb} ${imported} sale${plural(imported)}. ${failed} row${plural(failed)} still need attention.`
            : `${verb} ${imported} sale${plural(imported)}.`,
      });

      if (failed > 0) {
        toast.error(`${verb} ${imported}. ${failed} queued sale${plural(failed)} failed.`);
      } else {
        toast.success(`${verb} ${imported} queued sale${plural(imported)}.`);
      }
    } catch (error) {
      toast.error(normalizeImportErrorMessage(error?.response?.data?.message || "Offline import failed"));
    } finally {
      await refreshAll();
    }
  };

  const importOne = async (row) => {
    if (!online) {
      toast.error("Go online and sign in before importing queued sales");
      return;
    }
    if (!getRowHasOpenShift(row)) {
      toast.error("The cashier who made this sale needs an open shift before importing");
      return;
    }

    setSyncingId(row.clientSaleId);
    try {
      await runPush([row], { verb: "Imported" });
    } finally {
      setSyncingId(null);
    }
  };

  const importAll = async () => {
    setSyncingAll(true);
    try {
      await runPush(readyRows, {
        verb: "Imported",
        skipped: Math.max(0, rows.length - readyRows.length),
      });
    } finally {
      setSyncingAll(false);
    }
  };

  const retryFailedRows = async () => {
    setSyncingAll(true);
    try {
      await runPush(retryableRows, { verb: "Retried" });
    } finally {
      setSyncingAll(false);
    }
  };

  const removeRow = async (clientSaleId) => {
    await deleteOfflineSale(clientSaleId);
    setLastImportSummary(null);
    toast.success("Offline sale removed from queue");
  };

  const printRow = async (row) => {
    if (!printRef.current) {
      toast.error("Printer is not ready");
      return;
    }

    const cachedSettings = await getCachedReceiptSettings(
      row.branchId,
      PRINT_TEMPLATE_TYPES.THERMAL
    );
    const printPayload = row.printPayload || {};
    const fallbackCustomerName = row.customerName || "Walk-in Customer";
    const fallbackOrderData = {
      orderId: row.clientSaleId,
      // Rows queued before invoice numbers were allocated locally still fall back to the
      // old id-derived form; anything queued since reprints the number the customer has.
      invoiceNo:
        row.invoiceNo
        || `OFF-${String(row.clientSaleId || "").replace(/-/g, "").slice(0, 8).toUpperCase()}`,
      subTotal: Number(row.total || 0),
      billDiscount: Number(row.payload?.billDiscount || 0),
      netTotal: Number(row.total || 0),
      paidAmount: Number(row.total || 0),
      paymentMethod: row.payload?.paymentMethod || "CASH",
      orderType: row.payload?.orderType || "CASH",
      saleMode: row.payload?.saleMode || "TAKEAWAY",
      customerName: fallbackCustomerName,
      createdAt: row.offlineSoldAt || row.createdAt,
      branchName: row.branchName || `Branch ${row.branchId}`,
      cashierName: row.cashierName || user?.username || "Cashier",
    };
    const fallbackCartItems = Array.isArray(row.itemsPreview)
      ? row.itemsPreview.map((item) => ({
          itemId: item.itemId,
          name: item.itemName,
          qty: item.qty,
          qtyUnit: item.qtyUnit,
          unitPrice: 0,
          lineTotal: 0,
        }))
      : [];

    printRef.current.printOrder(
      printPayload.orderData || fallbackOrderData,
      printPayload.cartItems || fallbackCartItems,
      printPayload.storeName || user?.shopName || BRAND_NAME_UPPER,
      printPayload.shiftData || {
        branchName: row.branchName || `Branch ${row.branchId}`,
        cashierName: row.cashierName || user?.username || "Cashier",
      },
      printPayload.customerData || { name: fallbackCustomerName },
      printPayload.receiptSettings || cachedSettings
    );
  };

  return (
    <div className="page-enter space-y-6">
      <div className="sales-surface sales-panel-enter flex flex-col gap-4 rounded-xl p-5 lg:flex-row lg:items-center lg:justify-between" style={{ animationDelay: "80ms" }}>
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Offline Sales Queue</h1>
          <p className="mt-1 text-sm text-slate-500">
            Queued sales stay here until you import them manually.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
              isOnline ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isOnline ? "Online" : "Offline"}
          </div>
          <Button type="button" variant="outline" onClick={refreshAll}>
            <RefreshCw size={16} className="mr-2" />
            Refresh
          </Button>
          <Button
            type="button"
            onClick={importAll}
            disabled={
              readyRows.length === 0 ||
              !isOnline ||
              !hasOnlineSession ||
              syncingAll ||
              refreshing ||
              loadingShift
            }
          >
            <UploadCloud size={16} className="mr-2" />
            {syncingAll ? "Importing..." : `Push Ready Sales (${readyRows.length})`}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={retryFailedRows}
            disabled={
              retryableRows.length === 0 ||
              !isOnline ||
              !hasOnlineSession ||
              syncingAll ||
              refreshing ||
              loadingShift
            }
          >
            <RotateCcw size={16} className="mr-2" />
            Retry Failed ({retryableRows.length})
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="sales-panel-enter sales-panel-hover rounded-xl border border-slate-200 bg-white px-4 py-3" style={{ animationDelay: "120ms" }}>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Queued</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{rows.length}</div>
        </div>
        <div className="sales-panel-enter sales-panel-hover rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3" style={{ animationDelay: "170ms" }}>
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Ready</div>
          <div className="mt-2 text-2xl font-semibold text-emerald-800">{readyRows.length}</div>
        </div>
        <div className="sales-panel-enter sales-panel-hover rounded-xl border border-amber-200 bg-amber-50 px-4 py-3" style={{ animationDelay: "220ms" }}>
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Need Shift
          </div>
          <div className="mt-2 text-2xl font-semibold text-amber-800">
            {rowsNeedingShift.length}
          </div>
        </div>
        <div className="sales-panel-enter sales-panel-hover rounded-xl border border-red-200 bg-red-50 px-4 py-3" style={{ animationDelay: "270ms" }}>
          <div className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Stock Issues
          </div>
          <div className="mt-2 text-2xl font-semibold text-red-800">
            {rowsWithStockIssues.length}
          </div>
        </div>
      </div>

      {!isOnline ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Connection is offline. Review the queue now and import it after the system is back online.
        </div>
      ) : !hasOnlineSession ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Your offline queue is ready. Sign in online before importing.{" "}
          <Link to="/login" className="font-semibold text-blue-600">
            Open login
          </Link>
        </div>
      ) : refreshing || loadingShift ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Refreshing live stock and shift availability for queued branches...
        </div>
      ) : rowsNeedingShift.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {rowsNeedingShift.length} queued sale{rowsNeedingShift.length === 1 ? "" : "s"} need an
          open shift before import.{" "}
          <Link to="/shifts" className="font-semibold text-amber-900 underline">
            Open shifts
          </Link>
        </div>
      ) : rowsWithStockIssues.length > 0 ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {rowsWithStockIssues.length} queued sale{rowsWithStockIssues.length === 1 ? "" : "s"} have
          stock or batch conflicts. Fix those rows before pushing.
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Live stock check passed for the current queue snapshot.
        </div>
      )}

      {lastImportSummary ? (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          lastImportSummary.failed > 0
            ? "border-amber-200 bg-amber-50 text-amber-900"
            : "border-emerald-200 bg-emerald-50 text-emerald-900"
        }`}>
          <div className="font-semibold">{lastImportSummary.message}</div>
          <div className="mt-1 text-xs">
            Imported: {lastImportSummary.imported} | Failed: {lastImportSummary.failed} | Skipped: {lastImportSummary.skipped}
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <LoadingSpinner text="Loading offline sales..." />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          No queued offline sales.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const branchLookup = itemLookupByBranch[String(row.branchId)] || new Map();
            const displayItems = Array.isArray(row.itemsPreview) ? row.itemsPreview : [];
            const rowHasOpenShift = getRowHasOpenShift(row);
            const validation = getRowStockValidation(row);
            const issuesByIndex = new Map(
              validation.issues.map((issue) => [Number(issue.index), issue.message])
            );
            const pushDisabled =
              !isOnline ||
              !hasOnlineSession ||
              !rowHasOpenShift ||
              syncingId === row.clientSaleId ||
              refreshing ||
              loadingShift;

            return (
              <div
                key={row.clientSaleId}
                style={{ animationDelay: `${140 + rows.indexOf(row) * 40}ms` }}
                className="sales-queue-card sales-panel-hover rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-slate-900">
                        {row.branchName || `Branch ${row.branchId}`}
                      </div>
                      {rowHasOpenShift && validation.hasShortfall ? (
                        <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                          <ShieldAlert size={12} />
                          Ready · will go short
                        </div>
                      ) : rowHasOpenShift ? (
                        <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 size={12} />
                          Ready
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                          <AlertCircle size={12} />
                          Open shift required
                        </div>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {new Date(row.createdAt).toLocaleString()} | {row.cashierName || "Cashier"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{row.clientSaleId}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {formatCurrency(Number(row.total || 0))}
                    </div>
                    <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {row.itemCount || displayItems.length} items
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => printRow(row)}
                    >
                      <Printer size={15} className="mr-2" />
                      Print Slip
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => importOne(row)}
                      disabled={pushDisabled}
                    >
                      <UploadCloud size={15} className="mr-2" />
                      {syncingId === row.clientSaleId ? "Pushing..." : "Push"}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => removeRow(row.clientSaleId)}
                    >
                      <Trash2 size={15} className="mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>

                {!rowHasOpenShift && isOnline && hasOnlineSession ? (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Open a shift for this branch, then retry this import.
                  </div>
                ) : null}

                {validation.hasShortfall ? (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <div className="font-semibold">Live stock will go short on import:</div>
                    <ul className="mt-2 list-disc pl-5">
                      {validation.issues.map((issue) => (
                        <li key={`${row.clientSaleId}-${issue.index}-${issue.itemId}`}>{issue.message}</li>
                      ))}
                    </ul>
                    <div className="mt-2 text-xs">
                      This sale is already paid, so it still imports. Re-pick a batch above if the
                      shortfall is wrong; otherwise stock goes negative and the difference is
                      recorded for reconciliation.
                    </div>
                  </div>
                ) : null}

                {row.lastError ? (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {row.lastError}
                  </div>
                ) : null}

                <div className="mt-4 space-y-3">
                  {displayItems.map((item, index) => {
                    const cachedItem = branchLookup.get(Number(item.itemId));
                    const batchOptions = sortBatchesForFifo(
                      Array.isArray(cachedItem?.batches) ? cachedItem.batches : []
                    );
                    const needsChoice = isBatchTracked(cachedItem) && batchOptions.length > 1;
                    const itemIssue = issuesByIndex.get(index);

                    return (
                      <div
                        key={`${row.clientSaleId}-${item.itemId}-${index}`}
                        className={`rounded-lg border px-4 py-3 ${
                          itemIssue
                            ? "border-red-200 bg-red-50"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {item.itemName || cachedItem?.name || `Item ${item.itemId}`}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Qty {formatStockQuantity(item.qty)} {item.qtyUnit || cachedItem?.defaultUnit || ""}
                            </div>
                            {itemIssue ? (
                              <div className="mt-2 text-xs font-medium text-red-700">{itemIssue}</div>
                            ) : (
                              <div className="mt-2 text-xs font-medium text-emerald-700">
                                Stock check passed for this item.
                              </div>
                            )}
                          </div>

                          {needsChoice ? (
                            <div className="w-full max-w-xs">
                              <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                                Batch Selection
                              </label>
                              <CustomSelect
                                value={item.batchId || ""}
                                onChange={(nextValue) => updateBatchSelection(row, index, nextValue)}
                                options={[
                                  { value: "", label: "Auto FIFO / oldest batch" },
                                  ...batchOptions.map((batch) => ({
                                    value: batch.batchId,
                                    label: `Batch ${batch.batchId} | ${formatDisplayStockQuantity(batch, 0, cachedItem)}`,
                                  })),
                                ]}
                                buttonClassName="rounded-lg py-2"
                              />
                            </div>
                          ) : (
                            <div className="text-xs font-medium text-slate-500">
                              {item.batchId
                                ? `Batch ${item.batchId}`
                                : "Oldest batch will be used if needed"}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <ReceiptPrinter ref={printRef} />
    </div>
  );
};

export default OfflineSalesPage;
