import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";

import { itemsAPI } from "../../../api/items.api";
import { formatCurrency } from "../../../utils/formatters";

/**
 * Finds items to put in a promotion by asking the server.
 *
 * <p>The old picker loaded the 300 most recently created items and filtered that array in the
 * browser, so a shop with 5,000 items could only ever promote the newest 300 — everything
 * older returned nothing, with no message saying why. `/items/search` already existed and was
 * already used by the till; this simply calls it.
 *
 * <p>Requests are debounced and the previous one is aborted, the same way the POS search does
 * it, so a fast typist does not race stale results back over fresh ones.
 */
const ItemSearchPicker = ({ branchId, excludedIds = [], onSelect, onSelectAll, placeholder = "Search items by name or barcode…" }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const abortRef = useRef(null);
  const containerRef = useRef(null);

  const excluded = new Set((excludedIds || []).map(Number));

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        setLoading(true);
        const response = await itemsAPI.searchForPos(term, branchId, controller.signal);
        setResults(Array.isArray(response.data) ? response.data : []);
        setOpen(true);
      } catch (error) {
        if (error?.name !== "CanceledError" && error?.code !== "ERR_CANCELED") {
          console.error("Item search failed", error);
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, branchId]);

  useEffect(() => {
    const onClickAway = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  const choose = useCallback((item) => {
    onSelect?.(item);
    setQuery("");
    setResults([]);
    setOpen(false);
  }, [onSelect]);

  const visible = results.filter((item) => !excluded.has(Number(item.id)));

  return (
    <div ref={containerRef} className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder={placeholder}
        aria-label="Search items to add"
        className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-9 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
      {loading && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />}

      {open && (
        <div className="custom-scrollbar absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {visible.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-slate-500">
              {loading ? "Searching…" : "No matching items"}
            </div>
          ) : (
            <>
            {/*
              Searching "soap" and then clicking two hundred rows is not the job anyone came
              here to do. One button takes the whole result.
            */}
            {typeof onSelectAll === "function" && visible.length > 1 && (
              <button
                type="button"
                onClick={() => { onSelectAll(visible); setOpen(false); setQuery(""); }}
                className="sticky top-0 z-10 flex w-full items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-bold text-blue-700 hover:bg-blue-50"
              >
                <span>Add all {visible.length} results</span>
                <span className="text-xs font-semibold text-slate-500">or pick one below</span>
              </button>
            )}
            {visible.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => choose(item)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-800">{item.name}</span>
                  {item.barcode && <span className="block text-xs text-slate-500">{item.barcode}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">
                    {formatCurrency(item.sellingPrice ?? item.unitPrice ?? 0)}
                  </span>
                  <Plus size={14} className="text-blue-600" />
                </span>
              </button>
            ))}
            </>
          )}
        </div>
      )}

      {query.trim().length === 1 && (
        <p className="mt-1 text-xs text-slate-500">Keep typing. Search starts at two characters.</p>
      )}
    </div>
  );
};

export default ItemSearchPicker;
