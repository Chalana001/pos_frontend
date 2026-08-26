import { itemsAPI } from "../api/items.api";
import { ordersAPI } from "../api/orders.api";
import { shiftsAPI } from "../api/shifts.api";
import {
  displayToBaseQuantity,
  formatDisplayStockBaseQuantity,
  formatDisplayStockQuantity,
} from "../utils/stockQuantity";
import {
  cacheItemsForBranch,
  deleteOfflineSale,
  getCachedItemsForBranch,
  getOfflineSales,
  updateOfflineSale,
} from "./db";

/**
 * The offline queue's sync engine.
 *
 * This used to live inside OfflineSalesPage as component state, which meant it only
 * existed while that page was open — so nothing could push the queue in the background.
 * It lives here so the page and the automatic sync agent share one implementation of the
 * eligibility rules. If those rules were written twice they would drift, and a row
 * blocked in one place would go through in the other.
 */

export const isBatchTracked = (cachedItem) =>
  cachedItem && cachedItem.itemType !== "SERVICE" && cachedItem.itemType !== "RECIPE";

const hasShiftData = (value) => (Array.isArray(value) ? value.length > 0 : Boolean(value));

export const sortBatchesForFifo = (batches = []) =>
  [...batches].sort((left, right) => Number(left?.batchId || 0) - Number(right?.batchId || 0));

export const normalizeImportErrorMessage = (message) => {
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
    return "The cashier who made this sale needs an open shift at this branch before it can be imported.";
  }
  if (lower.includes("offline cashier not found")) {
    return "The cashier who made this sale no longer exists on the server.";
  }
  if (lower.includes("offline cashier belongs to another branch")) {
    return "The cashier who made this sale is now assigned to another branch.";
  }

  return source;
};

const normalizeRequestedQty = (cachedItem, qty, qtyUnit) => {
  const numericQty = Number(qty || 0);
  if (!Number.isFinite(numericQty) || numericQty <= 0) {
    return 0;
  }
  return Math.round(displayToBaseQuantity(numericQty, cachedItem, qtyUnit || cachedItem?.defaultUnit));
};

const buildInventoryState = (items = []) =>
  new Map(
    items.map((item) => {
      const rawAggregateQty = item.availableBaseQty !== undefined && item.availableBaseQty !== null
        ? Number(item.availableBaseQty)
        : displayToBaseQuantity(item.availableQty ?? 0, item, item.defaultUnit);
      const aggregateQty = Number(rawAggregateQty) > 0 ? Number(rawAggregateQty) : 0;

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
              qty: batch.qty !== undefined && batch.qty !== null
                ? Number(batch.qty || 0)
                : Math.round(displayToBaseQuantity(batch.displayQty ?? 0, item, batch.qtyUnit || item.defaultUnit)),
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
            message: `${itemName}: selected batch ${payloadItem.batchId} has only ${formatDisplayStockQuantity(targetBatch, 0, requestedItem)} left.`,
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
        const availableLabel = formatDisplayStockBaseQuantity(inventoryItem.aggregateQty, requestedItem, requestedItem.defaultUnit || "");
        issues.push({
          index,
          itemId,
          message: `${itemName}: available stock is lower than queued quantity. Available: ${availableLabel}.`,
        });
        return;
      }

      inventoryItem.aggregateQty -= requiredQty;
    });

    // Warnings, not a gate. These rows are completed, paid, receipted sales — refusing
    // to import one does not un-sell the goods, it just keeps real revenue off the books
    // and strands the transaction here forever. The server absorbs the shortfall, lets
    // stock go negative and audits it, so the operator is told what will go short and
    // can re-pick a batch, but is never blocked from banking the sale.
    result[row.clientSaleId] = {
      issues,
      hasShortfall: issues.length > 0,
    };
  }

  return result;
};

/**
 * Pull a live stock snapshot for the branches that have queued rows, and refresh the
 * local cache from it. The simulation below is only as honest as this snapshot.
 */
export const fetchLiveItemsForBranches = async (branchIds) => {
  const pairs = await Promise.all(
    (branchIds || []).map(async (branchId) => {
      const response = await itemsAPI.searchForPos("", branchId);
      const items = Array.isArray(response.data) ? response.data : [];
      await cacheItemsForBranch(branchId, items);
      return [branchId, items];
    })
  );
  return Object.fromEntries(pairs);
};

/**
 * Which cashiers currently hold an open shift, per branch.
 *
 * The server banks an imported sale into the shift of the cashier who MADE it and
 * rejects the import when that cashier has none open, so readiness has to be resolved
 * per cashier. Asking only whether "some shift is open here" would mark rows ready that
 * the server then refuses.
 */
export const resolveShiftReadiness = async ({ branchIds, isAdminOrManager, activeShift, currentUserId }) => {
  if (!branchIds || branchIds.length === 0) return {};

  if (!isAdminOrManager) {
    const ownShiftCashierIds = hasShiftData(activeShift) ? [Number(currentUserId)] : [];
    return Object.fromEntries(branchIds.map((branchId) => [branchId, ownShiftCashierIds]));
  }

  const pairs = await Promise.all(
    branchIds.map(async (branchId) => {
      try {
        const response = await shiftsAPI.getActiveByBranch(branchId);
        const shifts = Array.isArray(response.data) ? response.data : [];
        return [branchId, shifts.map((shift) => Number(shift.cashierUserId)).filter(Boolean)];
      } catch {
        return [branchId, []];
      }
    })
  );
  return Object.fromEntries(pairs);
};

export const rowHasOpenShift = (row, shiftMap, currentUserId) => {
  const openCashierIds = shiftMap[Number(row.branchId)] || [];
  // A row queued before the cashier was recorded sends no cashier id, and the server
  // falls back to whoever is importing — so that is the shift to check for it.
  const cashierId = Number(row.cashierUserId) || Number(currentUserId);
  if (!cashierId) return false;
  return openCashierIds.includes(cashierId);
};

/**
 * Everything a caller needs to decide what can be pushed right now.
 *
 * `online` is the caller's answer to "can I reach the server" — the page reads its auth
 * context, the sync agent runs a reachability probe. Offline, this still returns the
 * rows so the queue stays visible; nothing is ready to push.
 */
export const evaluateQueue = async ({ online, isAdminOrManager, activeShift, currentUserId }) => {
  const rows = await getOfflineSales();
  const branchIds = [...new Set(rows.map((row) => Number(row.branchId)).filter(Boolean))];

  let itemsByBranch = Object.fromEntries(
    await Promise.all(branchIds.map(async (branchId) => [branchId, await getCachedItemsForBranch(branchId)]))
  );
  let shiftMap = {};

  if (online && branchIds.length > 0) {
    try {
      itemsByBranch = { ...itemsByBranch, ...(await fetchLiveItemsForBranches(branchIds)) };
    } catch {
      // Fall back to the cached snapshot; the shortfall report is advisory either way.
    }
    shiftMap = await resolveShiftReadiness({ branchIds, isAdminOrManager, activeShift, currentUserId });
  }

  const itemLookupByBranch = Object.fromEntries(
    Object.entries(itemsByBranch).map(([branchId, items]) => [
      branchId,
      new Map((items || []).map((item) => [Number(item.id), item])),
    ])
  );

  const validationMap = simulateRowStockValidation(rows, itemLookupByBranch);
  const readyRows = online ? rows.filter((row) => rowHasOpenShift(row, shiftMap, currentUserId)) : [];

  return { rows, readyRows, itemsByBranch, itemLookupByBranch, shiftMap, validationMap };
};

// Only one push may be in flight at a time. Correctness is already guaranteed by
// clientSaleId and the server's "Already imported" replay — this is about not firing the
// same work twice when the page and the sync agent both decide to act.
let inFlightPush = null;

/**
 * Import queued rows, then reconcile the local queue with what the server said:
 * successes are deleted, failures keep a human-readable lastError for the queue page.
 */
export const pushRows = async (rowsToPush) => {
  if (!rowsToPush || rowsToPush.length === 0) {
    return { imported: 0, failed: 0, results: [] };
  }
  if (inFlightPush) return inFlightPush;

  inFlightPush = (async () => {
    try {
      const response = await ordersAPI.importOfflineSalesBulk(rowsToPush.map((row) => row.payload));
      const results = Array.isArray(response.data) ? response.data : [];
      const resultsById = new Map(results.map((result) => [result.clientSaleId, result]));

      const successRows = rowsToPush.filter((row) => resultsById.get(row.clientSaleId)?.success);
      const failedRows = rowsToPush.filter((row) => !resultsById.get(row.clientSaleId)?.success);

      await Promise.all(successRows.map((row) => deleteOfflineSale(row.clientSaleId)));
      await Promise.all(
        failedRows.map((row) =>
          updateOfflineSale(row.clientSaleId, {
            lastError: normalizeImportErrorMessage(
              resultsById.get(row.clientSaleId)?.message || "Offline import failed"
            ),
          })
        )
      );

      return { imported: successRows.length, failed: failedRows.length, results };
    } finally {
      inFlightPush = null;
    }
  })();

  return inFlightPush;
};
