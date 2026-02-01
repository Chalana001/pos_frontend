import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Plus, Edit, Search, Tag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { itemsAPI } from "../api/items.api";
import { useAuth } from "../context/AuthContext";
import { hasPermission, canAccessAllBranches } from "../utils/permissions";
import { formatCurrency } from "../utils/formatters";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Table from "../components/common/Table";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useBranch } from "../context/BranchContext";

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
};

const ItemsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { selectedBranchId } = useBranch();
  const canSelectBranch = canAccessAllBranches(user.role);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId, user?.role]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = {};
      if (canSelectBranch && selectedBranchId) params.branchId = Number(selectedBranchId);
      const res = await itemsAPI.getWithStock(params);
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to fetch items");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Search Logic Updated
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return items.filter((it) =>
      (it.name ?? "").toLowerCase().includes(q) ||
      (it.barcode ?? "").toLowerCase().includes(q) ||
      (it.categoryName ?? "").toLowerCase().includes(q) || // New
      (it.subCategoryName ?? "").toLowerCase().includes(q) // New
    );
  }, [items, searchQuery]);

  const columns = useMemo(() => [
    { 
      header: "Barcode", 
      accessor: "barcode",
      render: (i) => <span className="font-mono font-bold text-slate-600">{i.barcode}</span> 
    },
    { 
      header: "Name", 
      accessor: "name",
      render: (i) => <span className="font-medium text-slate-800">{i.name}</span>
    },
    { 
      header: "Category", 
      render: (item) => (
        <div className="flex flex-col">
           {/* Main Category */}
           <div className="flex items-center gap-1">
              <Tag size={14} className="text-blue-500" />
              <span className="font-medium text-slate-700 text-sm">
                  {item.categoryName || "Uncategorized"}
              </span>
           </div>
           {/* Sub Category */}
           {item.subCategoryName && (
               <span className="text-xs text-slate-400 ml-5 border-l-2 border-slate-200 pl-2 mt-0.5">
                  {item.subCategoryName}
               </span>
           )}
        </div>
      ),
    },
    { header: "Cost", render: (i) => formatCurrency(i.costPrice) },
    { 
      header: "Selling", 
      render: (i) => <span className="font-bold text-slate-800">{formatCurrency(i.sellingPrice)}</span> 
    },
    { 
      header: "Reorder", 
      accessor: "reorderLevel",
      render: (i) => (
        <div className="text-center">
            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">
                {i.reorderLevel}
            </span>
        </div>
      )
    },
    { header: "Created", render: (i) => <span className="text-xs text-slate-400">{formatDateTime(i.createdAt)}</span> },
    {
      header: "Status",
      render: (i) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-bold ${
            i.active ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {i.active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      header: "Actions",
      render: (i) =>
        hasPermission(user.role, "MANAGE_ITEMS") ? (
          <button
            onClick={() => navigate(`/items/${i.id}/edit`)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit"
          >
            <Edit size={18} />
          </button>
        ) : null,
    },
  ], [navigate, user.role]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold text-slate-800">Items Registry</h1>
            <p className="text-slate-500 text-sm">Manage products and pricing</p>
        </div>

        {hasPermission(user.role, "MANAGE_ITEMS") && (
          <Button onClick={() => navigate("/items/new")}>
            <Plus size={20} className="mr-2" />
            Add Item
          </Button>
        )}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, barcode, category..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all shadow-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner size="lg" text="Loading items..." />
          </div>
        ) : (
          <Table columns={columns} data={filteredItems} />
        )}
      </Card>
    </div>
  );
};

export default ItemsPage;