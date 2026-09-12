import React, { useMemo, useRef } from "react";
import { Download, Percent, Trash2, Upload, WandSparkles } from "lucide-react";

import Button from "../../../components/common/Button";
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
const ItemPriceTable = ({
  lines,
  itemsById,
  priceCheck,
  branchId,
  onAdd,
  onRemove,
  onChange,
  onBulkPercent,
  onRoundTo99,
  onClearPrices,
}) => {
  const fileInputRef = useRef(null);

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

      <div className="border-b border-slate-200 p-4">
        <ItemSearchPicker
          branchId={branchId}
          excludedIds={lines.map((line) => line.id)}
          onSelect={onAdd}
        />
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
