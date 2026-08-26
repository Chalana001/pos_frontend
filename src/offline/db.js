import Dexie from "dexie";
import { displayToBaseQuantity, getDisplayStockBaseQuantity } from "../utils/stockQuantity";

const OFFLINE_SALES_EVENT = "pos:offline-sales-updated";

class PosOfflineDatabase extends Dexie {
  constructor() {
    super("pos-offline-db");

    this.version(1).stores({
      cachedItems: "[branchId+itemId], branchId, itemId, syncedAt",
      cachedBranches: "id, active",
      cachedUsers: "userId, username, lastSyncedAt",
      offlineSales: "clientSaleId, branchId, cashierUserId, createdAt",
      appMeta: "key",
    });

    this.version(2).stores({
      cachedItems: "[branchId+itemId], branchId, itemId, syncedAt",
      cachedBranches: "id, active",
      cachedUsers: "userId, username, lastSyncedAt",
      cachedReceiptSettings: "[branchId+templateType], branchId, templateType, syncedAt",
      offlineSales: "clientSaleId, branchId, cashierUserId, createdAt",
      appMeta: "key",
    });
  }
}

export const offlineDb = new PosOfflineDatabase();

const emitOfflineSalesChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OFFLINE_SALES_EVENT));
  }
};

const isLocalOnlySale = (sale) => sale?.localOnly === true;

const getLocalDateKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const OFFLINE_EVENTS = {
  OFFLINE_SALES_CHANGED: OFFLINE_SALES_EVENT,
};

const sortBatchesForFifo = (batches) =>
  Array.isArray(batches)
    ? [...batches].sort((left, right) => Number(left?.batchId || 0) - Number(right?.batchId || 0))
    : [];

const normalizeCachedItem = (item) => ({
  ...item,
  batches: sortBatchesForFifo(item?.batches),
});

export const cacheBranches = async (branches) => {
  await offlineDb.cachedBranches.clear();
  if (Array.isArray(branches) && branches.length > 0) {
    await offlineDb.cachedBranches.bulkPut(branches);
  }
};

export const getCachedBranches = async () => offlineDb.cachedBranches.orderBy("id").toArray();

export const cacheItemsForBranch = async (branchId, items) => {
  if (!branchId) return;

  await offlineDb.transaction("rw", offlineDb.cachedItems, async () => {
    await offlineDb.cachedItems.where("branchId").equals(branchId).delete();
    if (Array.isArray(items) && items.length > 0) {
      await offlineDb.cachedItems.bulkPut(
        items.map((item) => ({
          branchId,
          itemId: Number(item.id),
          syncedAt: new Date().toISOString(),
          data: normalizeCachedItem(item),
        }))
      );
    }
  });
};

export const getCachedItemsForBranch = async (branchId) => {
  if (!branchId) return [];
  const rows = await offlineDb.cachedItems.where("branchId").equals(branchId).toArray();
  return rows.map((row) => normalizeCachedItem(row.data));
};

export const cacheReceiptSettings = async (branchId, templateType, settings) => {
  if (!branchId || !templateType || !settings) return;

  await offlineDb.cachedReceiptSettings.put({
    branchId: Number(branchId),
    templateType,
    syncedAt: new Date().toISOString(),
    data: settings,
  });
};

export const getCachedReceiptSettings = async (branchId, templateType) => {
  if (!branchId || !templateType) return null;
  const row = await offlineDb.cachedReceiptSettings.get([Number(branchId), templateType]);
  return row?.data || null;
};

export const saveCachedUser = async (userRecord) => {
  if (!userRecord?.userId) return;
  const existing = await offlineDb.cachedUsers.get(userRecord.userId);
  await offlineDb.cachedUsers.put({
    ...existing,
    ...userRecord,
    lastSyncedAt: new Date().toISOString(),
  });
  await offlineDb.appMeta.put({ key: "lastOfflineUserId", value: userRecord.userId });
};

export const getCachedUserById = async (userId) => {
  if (!userId) return null;
  return offlineDb.cachedUsers.get(userId);
};

export const getLastCachedUser = async () => {
  const meta = await offlineDb.appMeta.get("lastOfflineUserId");
  if (!meta?.value) return null;
  return getCachedUserById(meta.value);
};

// Stock is mirrored across several fields depending on where an item came from, and
// getDisplayStockQuantity reads whichever it finds first. Both lists have to move or
// the cashier keeps seeing the pre-sale number on screen.
const BASE_QTY_FIELDS = ["qty", "availableBaseQty", "totalBaseQty", "baseQty", "totalQuantity"];
const DISPLAY_QTY_FIELDS = ["displayQty", "displayQuantity", "availableQty"];

const subtractQuantityFields = (entity, consumedBaseQty, itemContext) => {
  if (!entity || !(consumedBaseQty > 0)) return entity;

  const next = { ...entity };
  const consumedDisplayQty = getDisplayStockBaseQuantity(consumedBaseQty, itemContext);

  BASE_QTY_FIELDS.forEach((field) => {
    if (next[field] !== undefined && next[field] !== null) {
      next[field] = Math.max(0, Number(next[field] || 0) - consumedBaseQty);
    }
  });

  DISPLAY_QTY_FIELDS.forEach((field) => {
    if (next[field] !== undefined && next[field] !== null) {
      next[field] = Math.max(0, Number(next[field] || 0) - consumedDisplayQty);
    }
  });

  return next;
};

/**
 * Decrement cached stock for a sale that was just written to the offline queue.
 *
 * Without this the cache never moves while offline, so the second sale of an item sees
 * exactly the stock the first one saw and a branch with three units on hand will happily
 * sell thirty. The conflict only surfaced at import, with the receipts already printed.
 *
 * The consumption mirrors what simulateRowStockValidation replays at import time —
 * explicit batch if one was chosen, FIFO by ascending batchId otherwise — so what the
 * cashier sees offline and what the queue page reports later agree.
 *
 * This makes one terminal honest, not the whole shop: two browsers cannot see each
 * other's IndexedDB, so a second till still sells against its own copy of the stock.
 */
export const applyOfflineStockUsage = async (branchId, lines) => {
  if (!branchId || !Array.isArray(lines) || lines.length === 0) return;

  await offlineDb.transaction("rw", offlineDb.cachedItems, async () => {
    for (const line of lines) {
      const itemId = Number(line?.itemId);
      if (!itemId) continue;

      const row = await offlineDb.cachedItems.get([Number(branchId), itemId]);
      const item = row?.data;
      // SERVICE and RECIPE items carry no stock of their own.
      if (!item || item.itemType === "SERVICE" || item.itemType === "RECIPE") continue;

      const requiredBaseQty = Math.round(
        displayToBaseQuantity(Number(line.qty || 0), item, line.qtyUnit || item.defaultUnit)
      );
      if (!Number.isFinite(requiredBaseQty) || requiredBaseQty <= 0) continue;

      const batches = sortBatchesForFifo(item.batches);
      let remainingQty = requiredBaseQty;
      let nextBatches = batches;

      if (batches.length > 0) {
        nextBatches = batches.map((batch) => {
          if (remainingQty <= 0) return batch;
          if (line.batchId && Number(batch.batchId) !== Number(line.batchId)) return batch;

          const availableQty = Number(batch.qty || 0);
          if (availableQty <= 0) return batch;

          const usedQty = Math.min(availableQty, remainingQty);
          remainingQty -= usedQty;
          return subtractQuantityFields(batch, usedQty, item);
        });
      }

      // Whatever a batch could not cover still leaves the shelf, so the aggregate drops
      // by the full amount either way.
      const nextItem = subtractQuantityFields({ ...item, batches: nextBatches }, requiredBaseQty, item);
      await offlineDb.cachedItems.put({ ...row, data: nextItem });
    }
  });
};

export const addOfflineSale = async (saleRecord) => {
  await offlineDb.offlineSales.put(saleRecord);
  emitOfflineSalesChanged();
};

export const getOfflineSales = async () =>
  (await offlineDb.offlineSales.orderBy("createdAt").reverse().toArray()).filter((row) => !isLocalOnlySale(row));

export const getOfflineSalesCount = async () =>
  (await offlineDb.offlineSales.toArray()).filter((row) => !isLocalOnlySale(row)).length;

export const getFreeLocalSalesSummary = async () => {
  const todayKey = getLocalDateKey();
  const rows = (await offlineDb.offlineSales.toArray()).filter((row) =>
    isLocalOnlySale(row) && String(row.createdAt || "").startsWith(todayKey)
  );

  return {
    count: rows.length,
    total: rows.reduce((sum, row) => sum + Number(row.total || 0), 0),
  };
};

export const clearFreeLocalSalesIfNewDay = async () => {
  const todayKey = getLocalDateKey();
  const metaKey = "freeLocalSalesLastClearDate";
  const meta = await offlineDb.appMeta.get(metaKey);
  if (meta?.value === todayKey) {
    return false;
  }

  const localRows = (await offlineDb.offlineSales.toArray()).filter(isLocalOnlySale);
  if (localRows.length > 0) {
    await offlineDb.offlineSales.bulkDelete(localRows.map((row) => row.clientSaleId));
  }
  await offlineDb.appMeta.put({ key: metaKey, value: todayKey });
  if (localRows.length > 0) {
    emitOfflineSalesChanged();
  }
  return localRows.length > 0;
};

export const updateOfflineSale = async (clientSaleId, patch) => {
  await offlineDb.offlineSales.update(clientSaleId, patch);
  emitOfflineSalesChanged();
};

export const deleteOfflineSale = async (clientSaleId) => {
  await offlineDb.offlineSales.delete(clientSaleId);
  emitOfflineSalesChanged();
};

export const replaceOfflineSales = async (rows) => {
  await offlineDb.offlineSales.clear();
  if (Array.isArray(rows) && rows.length > 0) {
    await offlineDb.offlineSales.bulkPut(rows);
  }
  emitOfflineSalesChanged();
};
