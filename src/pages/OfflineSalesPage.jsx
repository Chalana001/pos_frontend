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
import { itemsAPI } from "../api/items.api";
import { ordersAPI } from "../api/orders.api";
import { shiftsAPI } from "../api/shifts.api";
import {
  cacheItemsForBranch,
  deleteOfflineSale,
  getCachedItemsForBranch,
  getCachedReceiptSettings,
  getOfflineSales,
  OFFLINE_EVENTS,
  updateOfflineSale,
} from "../offline/db";
import { useAuth } from "../context/AuthContext";
import { useShift } from "../context/ShiftContext";
import { formatCurrency } from "../utils/formatters";
import { PRINT_TEMPLATE_TYPES } from "../utils/receiptSettings";
import { BRAND_NAME_UPPER } from "../utils/branding";

const GRAMS_PER_KILOGRAM = 1000;

const isBatchTracked = (cachedItem) =>
  cachedItem && cachedItem.itemType !== "SERVICE" && cachedItem.itemType !== "RECIPE";

const hasShiftData = (value) => (Array.isArray(value) ? value.length > 0 : Boolean(value));

const sortBatchesForFifo = (batches = []) =>
  [...batches].sort((left, right) => Number(left?.batchId || 0) - Number(right?.batchId || 0));

const normalizeImportErrorMessage = (message) => {
  const source = String(message || "").trim();
  const lower = source.toLowerCase();

  if (!source) {
    return "Import failed. Retry this queued sale after refreshing the queue.";
  }
  if (lower.includes("already imported")) {
    return "This queued sale is already on the server.";
  }
  if (lower.includes("cash sales only")) {
    return "Offline import supports cash sales only.";
  }
  if (lower.includes("takeaway sales only")) {
    return "Offline import supports takeaway sales only.";
  }
  if (lower.includes("paid amount cannot be less")) {
    return "Paid amount is lower than the queued total.";
  }
  if (lower.includes("batch id is missing")) {
    return "Batch selection is required for at least one queued item.";
  }
  if (lower.includes("batch not found")) {
    return "A selected batch is no longer available.";
  }
  if (lower.includes("does not match item")) {
    return "A selected batch no longer belongs to the queued item.";
  }
  if (lower.includes("does not belong to this branch")) {
    return "A selected batch belongs to another branch.";
  }
  if (lower.includes("insufficient stock")) {
    return "Live stock is no longer enough for this queued sale.";
  }
  if (lower.includes("cannot create orders for another branch")) {
    return "You are signed in under the wrong branch for this queued sale.";
  }
  if (lower.includes("item not found")) {
    return "One of the queued items no longer exists on the server.";
  }
  if (lower.includes("item is inactive")) {
    return "One of the queued items is inactive now.";
  }
  if (lower.includes("customer not found")) {
    return "The queued customer record is no longer available.";
  }
  if (lower.includes("no open shift") || lower.includes("shift")) {
    return "Open a shift for this branch before importing.";
  }

  return source;
};

const normalizeRequestedQty = (cachedItem, qty, qtyUnit) => {
  const numericQty = Number(qty || 0);
  if (!Number.isFinite(numericQty) || numericQty <= 0) {
    return 0;
  }

  if (cachedItem?.itemType === "WEIGHT") {
    return String(qtyUnit || cachedItem?.defaultUnit || "G").toUpperCase() === "KG"
      ? Math.round(numericQty * GRAMS_PER_KILOGRAM)
      : Math.round(numericQty);
  }

  return Math.round(numericQty);
};

const buildInventoryState = (items = []) =>
  new Map(
    items.map((item) => {
      const aggregateQty =
        Number(item.availableBaseQty ?? item.availableQty ?? 0) > 0
          ? Number(item.availableBaseQty ?? item.availableQty ?? 0)
          : 0;

      return [
        Number(item.id),
        {
          itemId: Number(item.id),
          name: item.name,
          itemType: item.itemType,
          defaultUnit: item.defaultUnit,
          aggregateQty,
          batches: sortBatchesForFifo(Array.isArray(item.batches) ? item.batches : [])
            .map((batch) => ({
              batchId: Number(batch.batchId),
              qty: Number(batch.qty || 0),
              qtyUnit: batch.qtyUnit || item.defaultUnit,
            })),
        },
      ];
    })
  );

const simulateRowStockValidation = (queueRows, itemLookupByBranch) => {
  const branchStates = {};
  const result = {};

  const orderedRows = [...queueRows].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );

  for (const row of orderedRows) {
    const branchId = Number(row.branchId);
    const branchLookup = itemLookupByBranch[String(branchId)] || new Map();
    if (!branchStates[branchId]) {
      branchStates[branchId] = buildInventoryState([...branchLookup.values()]);
    }

    const branchState = branchStates[branchId];
    const issues = [];
    const payloadItems = Array.isArray(row.payload?.items) ? row.payload.items : [];
    const previewItems = Array.isArray(row.itemsPreview) ? row.itemsPreview : [];

    payloadItems.forEach((payloadItem, index) => {
      const previewItem = previewItems[index];
      const itemId = Number(payloadItem.itemId);
      const requestedItem =
        branchLookup.get(itemId) ||
        branchState.get(itemId) ||
        null;
      const itemName =
        previewItem?.itemName ||
        requestedItem?.name ||
        `Item ${payloadItem.itemId}`;

      if (!requestedItem) {
        issues.push({
          index,
          itemId,
          message: `${itemName}: item is no longer available in this branch.`,
        });
        return;
      }

      if (!isBatchTracked(requestedItem)) {
        return;
      }

      const requiredQty = normalizeRequestedQty(
        requestedItem,
        payloadItem.qty,
        payloadItem.qtyUnit || previewItem?.qtyUnit
      );

      if (requiredQty <= 0) {
        issues.push({
          index,
          itemId,
          message: `${itemName}: invalid quantity in queued sale.`,
        });
        return;
      }

      const inventoryItem = branchState.get(itemId);
      if (!inventoryItem) {
        issues.push({
          index,
          itemId,
          message: `${itemName}: stock snapshot is missing.`,
        });
        return;
      }

      if (payloadItem.batchId) {
        const targetBatch = inventoryItem.batches.find(
          (batch) => Number(batch.batchId) === Number(payloadItem.batchId)
        );

        if (!targetBatch) {
          issues.push({
            index,
            itemId,
            message: `${itemName}: selected batch ${payloadItem.batchId} is no longer available.`,
          });
          return;
        }

        if (Number(targetBatch.qty || 0) < requiredQty) {
          issues.push({
            index,
            itemId,
            message: `${itemName}: selected batch ${payloadItem.batchId} has only ${targetBatch.qty} left.`,
          });
          return;
        }

        targetBatch.qty -= requiredQty;
        inventoryItem.aggregateQty = Math.max(0, Number(inventoryItem.aggregateQty || 0) - requiredQty);
        return;
      }

      if (inventoryItem.batches.length > 0) {
        let remainingQty = requiredQty;

        for (const batch of inventoryItem.batches) {
          if (remainingQty <= 0) {
            break;
          }

          const batchQty = Number(batch.qty || 0);
          if (batchQty <= 0) {
            continue;
          }

          const usedQty = Math.min(batchQty, remainingQty);
          batch.qty -= usedQty;
          remainingQty -= usedQty;
        }

        if (remainingQty > 0) {
          issues.push({
            index,
            itemId,
            message: `${itemName}: stock is no longer enough for auto batch selection.`,
          });
          return;
        }

        inventoryItem.aggregateQty = Math.max(0, Number(inventoryItem.aggregateQty || 0) - requiredQty);
        return;
      }

      if (Number(inventoryItem.aggregateQty || 0) < requiredQty) {
        issues.push({
          index,
          itemId,
          message: `${itemName}: available stock is lower than queued quantity.`,
        });
        return;
      }

      inventoryItem.aggregateQty -= requiredQty;
    });

    result[row.clientSaleId] = {
      issues,
      blocking: issues.length > 0,
    };
  }

  return result;
};

const OfflineSalesPage = () => {
  const { isOnline, hasOnlineSession, user } = useAuth();
  const { activeShift, loadingShift, refreshShift } = useShift();
  const printRef = useRef(null);

  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [rows, setRows] = useState([]);
  const [cachedItemsByBranch, setCachedItemsByBranch] = useState({});
  const [branchShiftMap, setBranchShiftMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [checkingShifts, setCheckingShifts] = useState(false);
  const [checkingStock, setCheckingStock] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [lastImportSummary, setLastImportSummary] = useState(null);

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

  const refreshStockSnapshots = useCallback(
    async (queueRows = rows) => {
      if (!isOnline || !hasOnlineSession) {
        return;
      }

      const branchIds = [...new Set((queueRows || []).map((row) => Number(row.branchId)).filter(Boolean))];
      if (branchIds.length === 0) {
        return;
      }

      setCheckingStock(true);
      try {
        const livePairs = await Promise.all(
          branchIds.map(async (branchId) => {
            const response = await itemsAPI.searchForPos("", branchId);
            const items = Array.isArray(response.data) ? response.data : [];
            await cacheItemsForBranch(branchId, items);
            return [branchId, items];
          })
        );
        setCachedItemsByBranch((current) => ({
          ...current,
          ...Object.fromEntries(livePairs),
        }));
      } catch (error) {
        console.error(error);
        toast.error("Failed to refresh live stock snapshot");
      } finally {
        setCheckingStock(false);
      }
    },
    [hasOnlineSession, isOnline, rows]
  );

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

  useEffect(() => {
    if (rows.length > 0 && isOnline && hasOnlineSession) {
      refreshStockSnapshots(rows);
    }
  }, [hasOnlineSession, isOnline, refreshStockSnapshots, rows]);

  const itemLookupByBranch = useMemo(() => {
    const result = {};
    Object.entries(cachedItemsByBranch).forEach(([branchId, items]) => {
      result[branchId] = new Map((items || []).map((item) => [Number(item.id), item]));
    });
    return result;
  }, [cachedItemsByBranch]);

  const rowValidationMap = useMemo(
    () => simulateRowStockValidation(rows, itemLookupByBranch),
    [itemLookupByBranch, rows]
  );

  const getRowHasOpenShift = useCallback(
    (row) => {
      if (!isOnline || !hasOnlineSession) return false;
      return Boolean(branchShiftMap[Number(row.branchId)]);
    },
    [branchShiftMap, hasOnlineSession, isOnline]
  );

  const getRowStockValidation = useCallback(
    (row) => rowValidationMap[row.clientSaleId] || { issues: [], blocking: false },
    [rowValidationMap]
  );

  const readyRows = useMemo(
    () =>
      rows.filter((row) => {
        const validation = getRowStockValidation(row);
        return getRowHasOpenShift(row) && !validation.blocking;
      }),
    [getRowHasOpenShift, getRowStockValidation, rows]
  );

  const rowsNeedingShift = useMemo(
    () => rows.filter((row) => isOnline && hasOnlineSession && !getRowHasOpenShift(row)),
    [getRowHasOpenShift, hasOnlineSession, isOnline, rows]
  );

  const rowsWithStockIssues = useMemo(
    () => rows.filter((row) => getRowStockValidation(row).blocking),
    [getRowStockValidation, rows]
  );

  const retryableRows = useMemo(
    () =>
      rows.filter((row) => {
        const validation = getRowStockValidation(row);
        return !!row.lastError && getRowHasOpenShift(row) && !validation.blocking;
      }),
    [getRowHasOpenShift, getRowStockValidation, rows]
  );

  const refreshAll = async () => {
    await Promise.all([
      loadRows(),
      isOnline && hasOnlineSession ? refreshShift() : Promise.resolve(),
    ]);
    if (isOnline && hasOnlineSession) {
      await refreshStockSnapshots();
    }
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
    await loadRows();
  };

  const importOne = async (row) => {
    const validation = getRowStockValidation(row);

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
    if (validation.blocking) {
      toast.error("Fix stock issues before importing this queued sale");
      return;
    }

    setSyncingId(row.clientSaleId);
    try {
      const response = await ordersAPI.importOfflineSale(row.payload);
      if (response.data?.success) {
        await deleteOfflineSale(row.clientSaleId);
        setLastImportSummary({
          imported: 1,
          failed: 0,
          skipped: 0,
          message: response.data.message || "Offline sale imported",
        });
        toast.success(response.data.message || "Offline sale imported");
      } else {
        const message = normalizeImportErrorMessage(response.data?.message || "Offline import failed");
        await updateOfflineSale(row.clientSaleId, { lastError: message });
        toast.error(message);
      }
    } catch (error) {
      const message = normalizeImportErrorMessage(
        error?.response?.data?.message || "Offline import failed"
      );
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
      const response = await ordersAPI.importOfflineSalesBulk(
        readyRows.map((row) => row.payload)
      );
      const results = Array.isArray(response.data) ? response.data : [];
      const resultsById = new Map(results.map((item) => [item.clientSaleId, item]));
      const successRows = readyRows.filter((row) => resultsById.get(row.clientSaleId)?.success);
      const failedRows = readyRows.filter((row) => !resultsById.get(row.clientSaleId)?.success);
      const skippedCount = Math.max(0, rows.length - readyRows.length);

      await Promise.all(
        successRows.map((row) => deleteOfflineSale(row.clientSaleId))
      );

      await Promise.all(
        failedRows.map((row) => {
          const result = resultsById.get(row.clientSaleId);
          const message = normalizeImportErrorMessage(result?.message || "Offline import failed");
          return updateOfflineSale(row.clientSaleId, { lastError: message });
        })
      );

      setLastImportSummary({
        imported: successRows.length,
        failed: failedRows.length,
        skipped: skippedCount,
        message:
          failedRows.length > 0
            ? `Imported ${successRows.length} sale${successRows.length === 1 ? "" : "s"}. ${failedRows.length} row${failedRows.length === 1 ? "" : "s"} still need attention.`
            : `Imported ${successRows.length} sale${successRows.length === 1 ? "" : "s"}.`,
      });

      if (failedRows.length > 0) {
        toast.error(
          `Imported ${successRows.length}. ${failedRows.length} queued sale${failedRows.length === 1 ? "" : "s"} failed.`
        );
      } else {
        toast.success(`Imported ${successRows.length} queued sale${successRows.length === 1 ? "" : "s"}.`);
      }
    } finally {
      setSyncingAll(false);
      await refreshAll();
    }
  };

  const retryFailedRows = async () => {
    if (retryableRows.length === 0) {
      toast.error("No failed rows are ready to retry");
      return;
    }

    setSyncingAll(true);
    try {
      const response = await ordersAPI.importOfflineSalesBulk(
        retryableRows.map((row) => row.payload)
      );
      const results = Array.isArray(response.data) ? response.data : [];
      const resultsById = new Map(results.map((item) => [item.clientSaleId, item]));
      const successRows = retryableRows.filter((row) => resultsById.get(row.clientSaleId)?.success);
      const failedRows = retryableRows.filter((row) => !resultsById.get(row.clientSaleId)?.success);

      await Promise.all(successRows.map((row) => deleteOfflineSale(row.clientSaleId)));
      await Promise.all(
        failedRows.map((row) => {
          const result = resultsById.get(row.clientSaleId);
          const message = normalizeImportErrorMessage(result?.message || "Offline import failed");
          return updateOfflineSale(row.clientSaleId, { lastError: message });
        })
      );

      setLastImportSummary({
        imported: successRows.length,
        failed: failedRows.length,
        skipped: 0,
        message:
          failedRows.length > 0
            ? `Retried ${retryableRows.length} failed row${retryableRows.length === 1 ? "" : "s"}. ${failedRows.length} still failed.`
            : `Retried ${retryableRows.length} failed row${retryableRows.length === 1 ? "" : "s"} successfully.`,
      });

      if (failedRows.length > 0) {
        toast.error(`${failedRows.length} retried row${failedRows.length === 1 ? "" : "s"} still failed.`);
      } else {
        toast.success(`Retried ${successRows.length} row${successRows.length === 1 ? "" : "s"} successfully.`);
      }
    } finally {
      setSyncingAll(false);
      await refreshAll();
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
      invoiceNo: `OFF-${String(row.clientSaleId || "").replace(/-/g, "").slice(0, 8).toUpperCase()}`,
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
              checkingShifts ||
              checkingStock ||
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
              checkingShifts ||
              checkingStock ||
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
      ) : checkingShifts || loadingShift ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Checking shift availability for queued branches...
        </div>
      ) : checkingStock ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Refreshing live stock snapshot for queued branches...
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
              validation.blocking ||
              syncingId === row.clientSaleId ||
              checkingShifts ||
              checkingStock ||
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
                      {validation.blocking ? (
                        <div className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                          <ShieldAlert size={12} />
                          Stock issue
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

                {validation.blocking ? (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    <div className="font-semibold">Stock validation blocked this row:</div>
                    <ul className="mt-2 list-disc pl-5">
                      {validation.issues.map((issue) => (
                        <li key={`${row.clientSaleId}-${issue.index}-${issue.itemId}`}>{issue.message}</li>
                      ))}
                    </ul>
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
                              Qty {item.qty} {item.qtyUnit || cachedItem?.defaultUnit || ""}
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
                                    label: `Batch ${batch.batchId} | ${batch.qty} ${batch.qtyUnit || cachedItem?.defaultUnit || ""}`,
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
