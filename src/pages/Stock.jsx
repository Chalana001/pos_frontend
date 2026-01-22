import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Search, Package, AlertTriangle } from "lucide-react";
import { stockAPI } from "../api/stock.api";
import { useAuth } from "../context/AuthContext";
import Card from "../components/common/Card";
import Table from "../components/common/Table";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useBranch } from "../context/BranchContext";

const Stock = () => {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();

  console

  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // ✅ Fetch stock when branch changes (and ONLY when branch exists)
  useEffect(() => {

    const fetchStock = async () => {
      setLoading(true);
      try {
        const response = await stockAPI.getByBranch(selectedBranchId);
        setStockItems(response.data || []);
      } catch (error) {
        toast.error("Failed to fetch stock");
        setStockItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStock();
  }, [selectedBranchId]);

  // ✅ Search filter (works with your StockResponse)
  const filteredStock = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return stockItems;

    return stockItems.filter((item) => {
      return (
        item?.name?.toLowerCase().includes(q) ||
        String(item?.barcode || "").includes(q) ||
        String(item?.itemId || "").includes(q) ||
        String(item?.id || "").includes(q)
      );
    });
  }, [stockItems, searchQuery]);

  // ✅ low stock rule (since reorderLevel not in response)
  const lowStockItems = useMemo(() => {
    return stockItems.filter((item) => (item?.quantity ?? 0) <= 0);
  }, [stockItems]);

  // ✅ total stock value using costPrice
  const totalValue = useMemo(() => {
    return stockItems.reduce((sum, item) => {
      const qty = item?.quantity ?? 0;
      const cost = item?.costPrice ?? 0;
      return sum + qty * cost;
    }, 0);
  }, [stockItems]);

  // ✅ table columns aligned with StockResponse fields
  const columns = useMemo(
    () => [
      { header: "Stock ID", accessor: "id" },
      { header: "Item ID", accessor: "itemId" },
      {
        header: "Barcode",
        render: (item) => <span>{item.barcode ?? "-"}</span>,
      },
      {
        header: "Name",
        render: (item) => (
          <span className="font-medium text-slate-800">{item.name ?? "-"}</span>
        ),
      },
      {
        header: "Cost",
        render: (item) => (
          <span>LKR {Number(item.costPrice || 0).toFixed(2)}</span>
        ),
      },
      {
        header: "Selling",
        render: (item) => (
          <span>LKR {Number(item.sellingPrice || 0).toFixed(2)}</span>
        ),
      },
      {
        header: "Quantity",
        render: (item) => {
          const qty = item.quantity ?? 0;
          const isLow = qty <= 0;

          return (
            <span
              className={`font-semibold ${
                isLow ? "text-red-600" : "text-slate-800"
              }`}
            >
              {qty}
              {isLow && (
                <AlertTriangle size={14} className="inline ml-1 text-red-500" />
              )}
            </span>
          );
        },
      },
      {
        header: "Status",
        render: (item) => {
          const qty = item.quantity ?? 0;

          return (
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                qty > 0
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {qty > 0 ? "In Stock" : "Out of Stock"}
            </span>
          );
        },
      },
      {
        header: "Updated At",
        render: (item) => (
          <span className="text-slate-600">
            {item.updatedAt ? item.updatedAt.replace("T", " ") : "-"}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Stock Inventory</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-slate-600 mb-2">
                Total Items
              </h3>
              <p className="text-2xl font-bold text-slate-800">
                {stockItems.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="text-blue-600" size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-slate-600 mb-2">
                Out of Stock Items
              </h3>
              <p className="text-2xl font-bold text-red-600">
                {lowStockItems.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-slate-600 mb-2">
            Total Stock Value
          </h3>
          <p className="text-2xl font-bold text-green-600">
            LKR {Number(totalValue).toFixed(2)}
          </p>
        </Card>
      </div>

      {/* Table + Search */}
      <Card>
        <div className="mb-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by stock id / item id / name / barcode..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12">
            <LoadingSpinner size="lg" text="Loading stock..." />
          </div>
        ) : (
          <Table columns={columns} data={filteredStock} />
        )}
      </Card>
    </div>
  );
};

export default Stock;
