import React, { useEffect, useState } from "react";
import { Search, Barcode } from "lucide-react";
import { itemsAPI } from "../../api/items.api";
import { useDebounce } from "../../hooks/useDebounce";
import Modal from "../common/Modal";
import LoadingSpinner from "../common/LoadingSpinner";

const ProductSearch = ({ isOpen, onClose, onSelectItem, branchId }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setItems([]);
      setLoading(false);
      return;
    }

    if (debouncedSearch?.trim()) {
      searchItems(debouncedSearch.trim());
    } else {
      setItems([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, isOpen]);

  const searchItems = async (name) => {
    setLoading(true);
    try {
      const response = await itemsAPI.search(name, branchId);

      // backend returns: List<ItemResponse>
      const data = Array.isArray(response.data) ? response.data : [];
      setItems(data);
    } catch (error) {
      console.error("Search failed:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item) => {
    onSelectItem(item);
    setSearchQuery("");
    setItems([]);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Search Products" size="lg">
      {/* Search box */}
      <div className="mb-4">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={20}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name..."
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </div>

        {/* Helper text */}
        <p className="text-xs text-slate-500 mt-2">
          Tip: Type at least 2 characters for better results.
        </p>
      </div>

      {/* Results */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="py-8">
            <LoadingSpinner text="Searching..." />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <Barcode size={48} className="mx-auto mb-2 text-slate-300" />
            <p className="font-medium">No items found</p>
            <p className="text-sm text-slate-400 mt-1">
              Try searching by product name
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const sellingPrice = Number(item?.sellingPrice ?? 0).toFixed(2);

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="w-full p-4 bg-slate-50 hover:bg-blue-50 rounded-lg transition-colors text-left border border-slate-200 hover:border-blue-300"
                >
                  <div className="flex justify-between items-start gap-4">
                    {/* Left */}
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate">
                        {item.name}
                      </h3>

                      <div className="flex flex-col gap-1 mt-1">
                        <p className="text-sm text-slate-500">
                          Barcode:{" "}
                          <span className="font-medium text-slate-600">
                            {item.barcode || "-"}
                          </span>
                        </p>

                        <p className="text-xs text-slate-400">
                          Category: {item.category || "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-blue-600">
                        LKR {sellingPrice}
                      </p>

                      <p className="text-xs text-slate-500 mt-1">
                        Reorder Level:{" "}
                        <span className="font-semibold">
                          {item.reorderLevel ?? 0}
                        </span>
                      </p>

                      {!item.active && (
                        <span className="inline-block mt-2 text-[11px] px-2 py-0.5 rounded bg-red-100 text-red-700">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ProductSearch;
