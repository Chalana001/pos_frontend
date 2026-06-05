import { ItemType } from "./constants";

export const STOCK_BASE_UNITS_PER_UNIT = 1000;

export const isMeasuredStockItem = (item) =>
  item?.itemType === ItemType.WEIGHT || item?.itemType === ItemType.VOLUME || item?.weightItem === true;

export const isBaseScaledStockItem = (item) =>
  item?.itemType === ItemType.NORMAL || isMeasuredStockItem(item);

export const formatStockQuantity = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return String(value ?? "");
  }
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(3).replace(/\.?0+$/, "");
};

export const getPrimaryStockUnit = (item, fallbackUnit = "") => {
  if (isMeasuredStockItem(item)) {
    return item?.itemType === ItemType.VOLUME || item?.defaultUnit === "L" || item?.defaultUnit === "ML" ? "L" : "KG";
  }
  return item?.displayUnit ?? item?.defaultUnit ?? fallbackUnit;
};

export const baseToDisplayQuantity = (baseQuantity) => {
  const numeric = Number(baseQuantity);
  return Number.isFinite(numeric) ? numeric / STOCK_BASE_UNITS_PER_UNIT : 0;
};

export const displayToBaseQuantity = (displayQuantity, itemContext = null, unit = null) => {
  const numeric = Number(displayQuantity);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  if (!isBaseScaledStockItem(itemContext)) {
    return numeric;
  }

  const normalizedUnit = String(unit || getPrimaryStockUnit(itemContext, "") || "").toUpperCase();
  return normalizedUnit === "G" || normalizedUnit === "ML"
    ? numeric
    : numeric * STOCK_BASE_UNITS_PER_UNIT;
};

export const getDisplayStockBaseQuantity = (baseQuantity, itemContext = null) => {
  const numeric = Number(baseQuantity);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return isBaseScaledStockItem(itemContext) ? baseToDisplayQuantity(numeric) : numeric;
};

export const getDisplayStockQuantity = (entity, fallback = 0, itemContext = null) => {
  const context = itemContext || entity;
  const displayValue = entity?.displayQty ?? entity?.displayQuantity;
  if (displayValue !== undefined && displayValue !== null) {
    const numeric = Number(displayValue);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  const explicitBaseValue = entity?.availableBaseQty ?? entity?.totalBaseQty ?? entity?.baseQty;
  if (explicitBaseValue !== undefined && explicitBaseValue !== null) {
    return baseToDisplayQuantity(explicitBaseValue);
  }

  const totalQuantity = entity?.totalQuantity;
  if (totalQuantity !== undefined && totalQuantity !== null) {
    const numeric = Number(totalQuantity);
    if (!Number.isFinite(numeric)) {
      return 0;
    }
    return isBaseScaledStockItem(context) ? baseToDisplayQuantity(numeric) : numeric;
  }

  const qtyValue = entity?.qty;
  if (qtyValue !== undefined && qtyValue !== null) {
    const numeric = Number(qtyValue);
    if (!Number.isFinite(numeric)) {
      return 0;
    }
    return isBaseScaledStockItem(context) ? baseToDisplayQuantity(numeric) : numeric;
  }

  const availableQty = entity?.availableQty;
  if (availableQty !== undefined && availableQty !== null) {
    const numeric = Number(availableQty);
    if (!Number.isFinite(numeric)) {
      return 0;
    }
    return numeric;
  }

  const fallbackNumeric = Number(fallback);
  return Number.isFinite(fallbackNumeric) ? fallbackNumeric : 0;
};

export const formatDisplayStockQuantity = (entity, fallback = 0, itemContext = null) => {
  const qty = getDisplayStockQuantity(entity, fallback, itemContext);
  const unit = getPrimaryStockUnit(itemContext || entity, entity?.displayUnit || entity?.defaultUnit || "");
  return unit ? `${formatStockQuantity(qty)} ${unit}` : formatStockQuantity(qty);
};

export const formatDisplayStockBaseQuantity = (baseQuantity, itemContext = null, fallbackUnit = "") => {
  const qty = getDisplayStockBaseQuantity(baseQuantity, itemContext);
  const unit = getPrimaryStockUnit(itemContext, fallbackUnit);
  return unit ? `${formatStockQuantity(qty)} ${unit}` : formatStockQuantity(qty);
};
