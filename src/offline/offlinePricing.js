/**
 * Prices the POS cart from a cached promotion bundle while the till is offline.
 *
 * The engine in `promotionEngine.js` is a faithful port of the server's and speaks its
 * vocabulary, `PricingLine`s and promotion snapshots. This file is the adapter: it turns the
 * app's cart rows into that shape and turns the result back into exactly what
 * `POST /promotions/preview` returns, so the cart renders an offline price the same way it
 * renders an online one.
 */
import { DISCOUNT_TYPES } from "../utils/constants";
import { displayToBaseQuantity } from "../utils/stockQuantity";
import { priceCart } from "./promotionEngine";

/**
 * A cart row as the engine needs it.
 *
 * <p>The catalogue fields the engine matches on, category, sub-category, cost, live on the
 * item record rather than the cart row, so they are looked up from the loaded item list. A row
 * whose item is not in that list still prices, it just cannot match a category promotion or be
 * held back by the margin guard; that is better than refusing to price the cart at all.
 */
const toPricingLine = (cartItem, itemsById) => {
  const source = itemsById.get(Number(cartItem.itemId)) || {};
  const unit = cartItem.weightItem ? (cartItem.qtyUnit || cartItem.defaultUnit) : cartItem.defaultUnit;
  return {
    itemId: Number(cartItem.itemId),
    itemType: cartItem.itemType || source.itemType || "NORMAL",
    subCategoryId: source.subCategoryId ?? null,
    categoryId: source.categoryId ?? null,
    // Always the price per primary unit, per kilogram, not per gram, which is what the
    // server's own quantity conversion expects.
    unitPrice: Number(cartItem.unitPrice) || 0,
    costPrice: source.costPrice ?? null,
    normalizedQty: Math.round(displayToBaseQuantity(cartItem.qty, cartItem, unit)),
    manualDiscountType: cartItem.discountType || DISCOUNT_TYPES.NONE,
    manualDiscountValue: Number(cartItem.discountValue) || 0,
  };
};

/**
 * The offline equivalent of `promotionsAPI.preview`.
 *
 * @returns the same shape the preview endpoint returns, plus `bundleVersion`, or null when
 *          there is no bundle to price from, in which case the caller shows list price, which
 *          is what an offline till did before it carried promotions at all.
 */
export const previewOffline = ({ bundle, branchId, customerId, cartItems, allItems, billDiscount = 0, at = new Date() }) => {
  if (!bundle || !Array.isArray(bundle.promotions) || bundle.promotions.length === 0) {
    return null;
  }
  const itemsById = new Map((allItems || []).map((item) => [Number(item.id), item]));
  const lines = (cartItems || []).map((cartItem) => toPricingLine(cartItem, itemsById));
  if (lines.length === 0) {
    return null;
  }
  return priceCart({ bundle, branchId, customerId, at, lines, billDiscount });
};
