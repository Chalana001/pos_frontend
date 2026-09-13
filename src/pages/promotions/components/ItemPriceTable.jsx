import React, { useMemo, useRef, useState } from "react";
import { Download, Loader2, Percent, Trash2, Upload, WandSparkles } from "lucide-react";
import toast from "react-hot-toast";

import Button from "../../../components/common/Button";
import { itemsAPI } from "../../../api/items.api";
import { formatCurrency } from "../../../utils/formatters";
import ItemSearchPicker from "./ItemSearchPicker";
import MarginBadge from "./MarginBadge";

/**
 * The price list at the centre of a campaign: one row per item, each with its own offer
 * price.
 *
 * <p>Offer price is the primary input and "% off" is derived, because a shop owner decides
 * "this sells at 399" rather than "this is 11.3% off". The percent column is editable too for
 * anyone who works the other way round; whichever is typed, the other follows.
 *
 * <p>A blank offer price means the row inherits the promotion's own discount. That is what
 * makes "20% off these fifteen items, except these three at fixed prices" a single promotion
 * rather than two.
 */
/**
 * How many items one bulk add will take.
 *
 * <p>Not a technical limit - the table would render them and the price check would post them,
 * slowly. It is a judgement: a promotion with more than a few hundred hand-priced items is a
 * category promotion wearing the wrong scope, and silently adding four thousand rows would
 * make that mistake expensive to undo.
 */
const BULK_ADD_LIMIT = 500;

const ItemPriceTable = ({
  lines,
  itemsById,
  priceCheck,
  branchId,
  categories = [],
  singleCategoryMode = false,
  onAdd,
  onAddMany,
  onRemove,
  onChange,
  onBulkPercent,
  onRoundTo99,
  onClearPrices,
}) => {
  const fileInputRef = useRef(null);
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  /**
   * Every item in a category, added at once.
   *
   * <p>The filter differs by how the shop is set up: a single-category shop's "categories" are
   * sub-categories under one parent, so they filter on subCategoryId; a shop with main and sub
   * categories filters on the main one and takes everything beneath it.
   */
  const addWholeCategory = async () => {
    if (!bulkCategoryId || typeof onAddMany !== "function") return;
    try {
      setBulkLoading(true);
      const response = await itemsAPI.getAll({
        [singleCategoryMode ? "subCategoryId" : "categoryId"]: Number(bulkCategoryId),
        active: true,
        page: 0,
        size: BULK_ADD_LIMIT,
      });
      const found = response.data?.content ?? [];
      const total = response.data?.totalElements ?? found.length;
      if (found.length === 0) {
        toast.error("That category has no active items");
        return;
      }
      const already = new Set(lines.map((line) => Number(line.id)));
      const fresh = found.filter((item) => !already.has(Number(item.id)));
      onAddMany(found);
      if (fresh.length === 0) {
        toast("Every item in that category was already on the list");
      } else {
        toast.success(total > found.length
          ? `Added ${fresh.length} — that category has ${total}, so add the rest by searching`
          : `Added ${fresh.length} item${fresh.length === 1 ? "" : "s"}`);
      }
      setBulkCategoryId("");
    } catch (error) {
      console.error("Bulk add by category failed", error);
      toast.error("Could not load that category's items");
    } finally {
      setBulkLoading(false);
    }
  };

  const checkByItemId = useMemo(() => {
    const map = new Map();
    (priceCheck?.items || []).forEach((row) => map.set(Number(row.itemId), row));
    return map;
  }, [priceCheck]);

  const normalPriceOf = (line) => {
    const item = itemsById.get(Number(line.id));
    return Number(item?.sellingPrice ?? 0);
  };

  const percentOf = (line) => {
    const normal = normalPriceOf(line);
    if (!normal || line.offerPrice === "" || line.offerPrice == null) return "";
    const pct = ((normal - Number(line.offerPrice)) / normal) * 100;
    return Number.isFinite(pct) ? pct.toFixed(1) : "";
  };

  const setPercent = (line, percentText) => {
    const normal = normalPriceOf(line);
    if (percentText === "") {
      onChange(line.id, { offerPrice: "" });
      return;
    }
    const pct = Number(percentText);
    if (!Number.isFinite(pct) || !normal) return;
    onChange(line.id, { offerPrice: (normal - normal * (pct / 100)).toFixed(2) });
  };

  const exportCsv = () => {
    const header = "barcode,item,normal_price,offer_price";
    const rows = lines.map((line) => {
      const item = itemsById.get(Number(line.id));
      return [
        item?.barcode ?? "",
        `"${(item?.name ?? "").replace(/"/g, '""')}"`,
        normalPriceOf(line),
        line.offerPrice ?? "",
      ].join(",");
    });
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "promotion-prices.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  // Matches on barcode and reports what it could not place, rather than rejecting the whole
  // file — a 200-row seasonal list with three unknown barcodes is still worth importing.
  const importCsv = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const byBarcode = new Map();
      itemsById.forEach((item) => item?.barcode && byBarcode.set(String(item.barcode).trim(), item));

      const updates = [];
      const unmatched = [];
      text.split(/\r?\n/).slice(1).forEach((row) => {
        if (!row.trim()) return;
        const cells = row.split(",");
        const barcode = (cells[0] || "").trim();
        const price = Number((cells[3] || "").trim());
        if (!barcode) return;
        const item = byBarcode.get(barcode);
        if (!item) {
          unmatched.push(barcode);
          return;
        }
        if (Number.isFinite(price)) updates.push({ id: item.id, offerPrice: price.toFixed(2) });
      });

      updates.forEach((update) => onChange(update.id, { offerPrice: update.offerPrice }));
      onChange(null, null, { imported: updates.length, unmatched });
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Items &amp; prices ({lines.length})</h3>
          <p className="text-xs text-slate-500">Leave an offer price blank to use the promotion&apos;s own discount.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={exportCsv} disabled={!lines.length}>
            <Download size={14} className="mr-1" /> Export
          </Button>
          <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} className="mr-1" /> Import
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={importCsv} className="hidden" />
        </div>
      </div>

      <div className="space-y-2 border-b border-slate-200 p-4">
        <ItemSearchPicker
          branchId={branchId}
          excludedIds={lines.map((line) => line.id)}
          onSelect={onAdd}
          onSelectAll={onAddMany}
        />

        {/* The other way in: a whole category, for the shop that thinks in aisles. */}
        {categories.length > 0 && typeof onAddMany === "function" ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              or add a whole category
            </span>
            <select
              value={bulkCategoryId}
              onChange={(event) => setBulkCategoryId(event.target.value)}
              aria-label="Category to add in bulk"
              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="">Choose a category…</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <Button
              size="sm"
              variant="secondary"
              onClick={addWholeCategory}
              disabled={!bulkCategoryId || bulkLoading}
            >
              {bulkLoading ? <Loader2 size={14} className="mr-1 animate-spin" /> : null}
              Add all items
            </Button>
          </div>
        ) : null}
      </div>

      {lines.length === 0 ? (
        <div className="px-4 py-12 text-center text-sm text-slate-500">
          No items yet. Search above to add the first one.
        </div>
      ) : (
        <>
          <div className="app-table-wrap">
            <table className="app-table min-w-[760px]">
              <thead className="app-table-head">
                <tr>
                  <th className="app-table-head-cell">Item</th>
                  <th className="app-table-head-cell text-right">Normal</th>
                  <th className="app-table-head-cell text-right">Offer price</th>
                  <th className="app-table-head-cell text-right">% off</th>
                  <th className="app-table-head-cell text-center">Margin</th>
                  <th className="app-table-head-cell" />
                </tr>
              </thead>
              <tbody className="app-table-body">
                {lines.map((line, index) => {
                  const item = itemsById.get(Number(line.id));
                  const check = checkByItemId.get(Number(line.id));
                  return (
                    <tr key={line.id}>
                      <td className="app-table-cell">
                        <div className="font-medium text-slate-800">{item?.name || `Item ${line.id}`}</div>
                        {item?.barcode && <div className="text-xs text-slate-500">{item.barcode}</div>}
                      </td>
                      <td className="app-table-cell text-right text-slate-600">
                        {formatCurrency(normalPriceOf(line))}
                        {/*
                          Two batches of one item are two prices, and the promotion means
                          something different against each. Only shown when they actually
                          differ - otherwise it is the same number twice.
                        */}
                        {check?.minBatchPrice != null && check?.maxBatchPrice != null
                          && Number(check.minBatchPrice) !== Number(check.maxBatchPrice) ? (
                          <div
                            className="text-xs text-amber-600"
                            title={`${check.batchCount} batches in stock, priced ${formatCurrency(check.minBatchPrice)} to ${formatCurrency(check.maxBatchPrice)}. The margin is judged on the worst of them.`}
                          >
                            batches {formatCurrency(check.minBatchPrice)}–{formatCurrency(check.maxBatchPrice)}
                          </div>
                        ) : null}
                      </td>
                      <td className="app-table-cell text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.offerPrice ?? ""}
                          placeholder="Inherit"
                          aria-label={`Offer price for ${item?.name || line.id}`}
                          onChange={(event) => onChange(line.id, { offerPrice: event.target.value })}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter") return;
                            event.preventDefault();
                            const inputs = event.target
                              .closest("tbody")
                              .querySelectorAll('input[type="number"][aria-label^="Offer price"]');
                            inputs[index + 1]?.focus();
                          }}
                          className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm"
                        />
                      </td>
                      <td className="app-table-cell text-right">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={percentOf(line)}
                          placeholder="-"
                          aria-label={`Percent off for ${item?.name || line.id}`}
                          onChange={(event) => setPercent(line, event.target.value)}
                          className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm"
                        />
                      </td>
                      <td className="app-table-cell text-center">
                        <MarginBadge
                          status={check?.status}
                          marginPercent={check?.marginPercent}
                          message={check?.message}
                        />
                      </td>
                      <td className="app-table-cell text-right">
                        <button
                          type="button"
                          onClick={() => onRemove(line.id)}
                          aria-label={`Remove ${item?.name || line.id}`}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bulk</span>
            {[5, 10, 15, 20].map((percent) => (
              <Button key={percent} size="sm" variant="secondary" onClick={() => onBulkPercent(percent)}>
                <Percent size={13} className="mr-1" />{percent}% off all
              </Button>
            ))}
            <Button size="sm" variant="secondary" onClick={onRoundTo99}>
              <WandSparkles size={13} className="mr-1" /> Round to .99
            </Button>
            <Button size="sm" variant="secondary" onClick={onClearPrices}>
              Clear prices
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default ItemPriceTable;
