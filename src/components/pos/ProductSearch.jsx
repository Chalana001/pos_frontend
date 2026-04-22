import React, { useEffect, useState } from "react";
import { Search, Barcode, Box } from "lucide-react";
import { itemsAPI } from "../../api/items.api";
import { useDebounce } from "../../hooks/useDebounce";
import Modal from "../common/Modal";
import LoadingSpinner from "../common/LoadingSpinner";
import { formatCurrency } from "../../utils/formatters";
import { ItemType } from "../../utils/constants";

const formatQty = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return String(value ?? "");
  }
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(3).replace(/\.?0+$/, "");
};

const getStockDisplay = (item) => {
  if (item.itemType === ItemType.WEIGHT) {
    const rawBaseQty = Number(item.availableBaseQty ?? item.availableQty ?? 0);
    const qty = Number.isFinite(rawBaseQty) ? rawBaseQty / 1000 : 0;
    return `${formatQty(qty)} KG`;
  }

  const qty = Number(item.availableQty ?? 0);
  return item.defaultUnit ? `${formatQty(qty)} ${item.defaultUnit}` : formatQty(qty);
};

const ProductSearch = ({ isOpen, onClose, onSelectItem, branchId }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setItems([]);
      return;
    }
    if (debouncedSearch?.trim()) searchItems(debouncedSearch.trim());
    else setItems([]);
  }, [debouncedSearch, isOpen]);

  const searchItems = async (name) => {
    setLoading(true);
    try {
      const response = await itemsAPI.searchForPos(name, branchId);
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Search Products" size="lg">
      <div className="p-4 bg-white min-h-[500px] flex flex-col">
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name..."
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-lg"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
          {loading ? (
            <div className="flex justify-center py-10"><LoadingSpinner /></div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
              <Box size={48} className="mb-2" />
              <p>No products found</p>
            </div>
          ) : (
            items.map((item) => {
              const isService = item.itemType === ItemType.SERVICE;
              const qtyLabel = getStockDisplay(item);

              return (
                <button
                  key={item.id}
                  onClick={() => { onSelectItem(item); onClose(); }}
                  className="w-full flex justify-between items-center p-4 rounded-xl border border-slate-100 hover:border-blue-400 hover:shadow-md hover:bg-blue-50/30 transition-all text-left group"
                >
                  <div>
                    <h3 className="font-bold text-slate-800 group-hover:text-blue-700">{item.name}</h3>
                    <div className="flex gap-3 text-sm text-slate-500 mt-1">
                      <span className="flex items-center gap-1"><Barcode size={14} /> {item.barcode}</span>
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-semibold">{item.category}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-900 font-mono">{formatCurrency(item.sellingPrice)}</div>
                    <div className={`text-xs font-medium mt-1 ${isService ? "text-purple-600" : (item.availableQty > 0 ? "text-emerald-600" : "text-red-500")}`}>
                      {isService ? "Service Item" : `${qtyLabel} in stock`}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ProductSearch;
