import Dexie from "dexie";

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

export const OFFLINE_EVENTS = {
  OFFLINE_SALES_CHANGED: OFFLINE_SALES_EVENT,
};

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
          data: item,
        }))
      );
    }
  });
};

export const getCachedItemsForBranch = async (branchId) => {
  if (!branchId) return [];
  const rows = await offlineDb.cachedItems.where("branchId").equals(branchId).toArray();
  return rows.map((row) => row.data);
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

export const addOfflineSale = async (saleRecord) => {
  await offlineDb.offlineSales.put(saleRecord);
  emitOfflineSalesChanged();
};

export const getOfflineSales = async () =>
  offlineDb.offlineSales.orderBy("createdAt").reverse().toArray();

export const getOfflineSalesCount = async () => offlineDb.offlineSales.count();

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
