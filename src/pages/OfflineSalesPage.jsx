import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Clock3,
  RefreshCw,
  Trash2,
  UploadCloud,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "react-hot-toast";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { ordersAPI } from "../api/orders.api";
import { shiftsAPI } from "../api/shifts.api";
import {
  deleteOfflineSale,
  getCachedItemsForBranch,
  getOfflineSales,
  OFFLINE_EVENTS,
  updateOfflineSale,
} from "../offline/db";
import { useAuth } from "../context/AuthContext";
import { useShift } from "../context/ShiftContext";
import { formatCurrency } from "../utils/formatters";

const isBatchTracked = (cachedItem) =>
  cachedItem && cachedItem.itemType !== "SERVICE" && cachedItem.itemType !== "RECIPE";

const hasShiftData = (value) => (Array.isArray(value) ? value.length > 0 : Boolean(value));

const OfflineSalesPage = () => {
  const { isOnline, hasOnlineSession, user } = useAuth();
  const { activeShift, loadingShift, refreshShift } = useShift();

  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [rows, setRows] = useState([]);
  const [cachedItemsByBranch, setCachedItemsByBranch] = useState({});
  const [branchShiftMap, setBranchShiftMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [checkingShifts, setCheckingShifts] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingId, setSyncingId] = useState(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const nextRows = await getOfflineSales();
      setRows(nextRows);

      const branchIds = [...new Set(nextRows.map((row) => Number(row.branchId)).filter(Boolean))];
      const cachedPairs = await Promise.all(
        branchIds.map(async (branchId) => [branchId, await getCachedItemsForBranch(branchId)])
      );
      setCachedItemsByBranch(Object.fromEntries(cachedPairs));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadShiftReadiness = useCallback(
    async (queueRows) => {
      if (!isOnline || !hasOnlineSession) {
        setBranchShiftMap({});
        setCheckingShifts(false);
        return;
      }

      const branchIds = [...new Set((queueRows || []).map((row) => Number(row.branchId)).filter(Boolean))];
      if (branchIds.length === 0) {
        setBranchShiftMap({});
        setCheckingShifts(false);
        return;
      }

      if (!isAdminOrManager) {
        const hasOpenShift = hasShiftData(activeShift);
        setBranchShiftMap(Object.fromEntries(branchIds.map((branchId) => [branchId, hasOpenShift])));
        setCheckingShifts(false);
        return;
      }

      setCheckingShifts(true);
      try {
        const pairs = await Promise.all(
          branchIds.map(async (branchId) => {
            try {
              const response = await shiftsAPI.getActiveByBranch(branchId);
              return [branchId, hasShiftData(response.data)];
            } catch {
              return [branchId, false];
            }
          })
        );
        setBranchShiftMap(Object.fromEntries(pairs));
      } finally {
        setCheckingShifts(false);
      }
    },
    [activeShift, hasOnlineSession, isAdminOrManager, isOnline]
  );

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    const handler = () => {
      loadRows();
    };
    window.addEventListener(OFFLINE_EVENTS.OFFLINE_SALES_CHANGED, handler);
    return () => window.removeEventListener(OFFLINE_EVENTS.OFFLINE_SALES_CHANGED, handler);
  }, [loadRows]);

  useEffect(() => {
    loadShiftReadiness(rows);
  }, [loadShiftReadiness, rows]);

  const itemLookupByBranch = useMemo(() => {
    const result = {};
    Object.entries(cachedItemsByBranch).forEach(([branchId, items]) => {
      result[branchId] = new Map((items || []).map((item) => [Number(item.id), item]));
    });
    return result;
  }, [cachedItemsByBranch]);

  const getRowHasOpenShift = useCallback(
    (row) => {
      if (!isOnline || !hasOnlineSession) return false;
      return Boolean(branchShiftMap[Number(row.branchId)]);
    },
    [branchShiftMap, hasOnlineSession, isOnline]
  );

  const readyRows = useMemo(
    () => rows.filter((row) => getRowHasOpenShift(row)),
    [getRowHasOpenShift, rows]
  );

  const rowsNeedingShift = useMemo(
    () => rows.filter((row) => isOnline && hasOnlineSession && !getRowHasOpenShift(row)),
    [getRowHasOpenShift, hasOnlineSession, isOnline, rows]
  );

  const refreshAll = async () => {
    await Promise.all([
      loadRows(),
      isOnline && hasOnlineSession ? refreshShift() : Promise.resolve(),
    ]);
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
    await loadRows();
  };

  const importOne = async (row) => {
    if (!isOnline) {
      toast.error("Go online before importing queued sales");
      return;
    }
    if (!hasOnlineSession) {
      toast.error("Sign in online before importing queued sales");
      return;
    }
    if (!getRowHasOpenShift(row)) {
      toast.error("Open a shift for this branch before importing");
      return;
    }

    setSyncingId(row.clientSaleId);
    try {
      const response = await ordersAPI.importOfflineSale(row.payload);
      if (response.data?.success) {
        await deleteOfflineSale(row.clientSaleId);
        toast.success(response.data.message || "Offline sale imported");
      } else {
        const message = response.data?.message || "Offline import failed";
        await updateOfflineSale(row.clientSaleId, { lastError: message });
        toast.error(message);
      }
    } catch (error) {
      const message = error?.response?.data?.message || "Offline import failed";
      await updateOfflineSale(row.clientSaleId, { lastError: message });
      toast.error(message);
    } finally {
      setSyncingId(null);
      await refreshAll();
    }
  };

  const importAll = async () => {
    if (readyRows.length === 0) {
      toast.error("No queue rows are ready to import");
      return;
    }

    setSyncingAll(true);
    try {
      for (const row of readyRows) {
        // Keep sequential imports so partial failures stay visible.
        // eslint-disable-next-line no-await-in-loop
        await importOne(row);
      }
    } finally {
      setSyncingAll(false);
    }
  };

  const removeRow = async (clientSaleId) => {
    await deleteOfflineSale(clientSaleId);
    toast.success("Offline sale removed from queue");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
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
              checkingShifts ||
              loadingShift
            }
          >
            <UploadCloud size={16} className="mr-2" />
            {syncingAll ? "Importing..." : `Push Ready Sales (${readyRows.length})`}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Queued</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900">{rows.length}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Ready</div>
          <div className="mt-2 text-2xl font-semibold text-emerald-800">{readyRows.length}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Need Shift
          </div>
          <div className="mt-2 text-2xl font-semibold text-amber-800">
            {rowsNeedingShift.length}
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
      ) : checkingShifts || loadingShift ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Checking shift availability for queued branches...
        </div>
      ) : rowsNeedingShift.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {rowsNeedingShift.length} queued sale{rowsNeedingShift.length === 1 ? "" : "s"} need an
          open shift before import.{" "}
          <Link to="/shifts" className="font-semibold text-amber-900 underline">
            Open shifts
          </Link>
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
            const pushDisabled =
              !isOnline ||
              !hasOnlineSession ||
              !rowHasOpenShift ||
              syncingId === row.clientSaleId ||
              checkingShifts ||
              loadingShift;

            return (
              <div
                key={row.clientSaleId}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-slate-900">
                        {row.branchName || `Branch ${row.branchId}`}
                      </div>
                      {rowHasOpenShift ? (
                        <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          <Clock3 size={12} />
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

                {row.lastError ? (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {row.lastError}
                  </div>
                ) : null}

                <div className="mt-4 space-y-3">
                  {displayItems.map((item, index) => {
                    const cachedItem = branchLookup.get(Number(item.itemId));
                    const batchOptions = Array.isArray(cachedItem?.batches) ? cachedItem.batches : [];
                    const needsChoice = isBatchTracked(cachedItem) && batchOptions.length > 1;

                    return (
                      <div
                        key={`${row.clientSaleId}-${item.itemId}-${index}`}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="text-sm font-medium text-slate-900">
                              {item.itemName || cachedItem?.name || `Item ${item.itemId}`}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Qty {item.qty} {item.qtyUnit || cachedItem?.defaultUnit || ""}
                            </div>
                          </div>

                          {needsChoice ? (
                            <div className="w-full max-w-xs">
                              <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">
                                Batch Selection
                              </label>
                              <select
                                value={item.batchId || ""}
                                onChange={(event) =>
                                  updateBatchSelection(row, index, event.target.value)
                                }
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                              >
                                <option value="">Auto / oldest batch</option>
                                {batchOptions.map((batch) => (
                                  <option key={batch.batchId} value={batch.batchId}>
                                    Batch {batch.batchId} | {batch.qty}{" "}
                                    {batch.qtyUnit || cachedItem?.defaultUnit || ""}
                                  </option>
                                ))}
                              </select>
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
    </div>
  );
};

export default OfflineSalesPage;
