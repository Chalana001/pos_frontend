import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Plus, Edit, Search } from "lucide-react";
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

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return items.filter((it) =>
      (it.name ?? "").toLowerCase().includes(q) ||
      (it.barcode ?? "").toLowerCase().includes(q) ||
      (it.category ?? "").toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const columns = [
    { header: "Barcode", accessor: "barcode" },
    { header: "Name", accessor: "name" },
    { header: "Category", accessor: "category" },
    { header: "Cost", render: (i) => formatCurrency(i.costPrice) },
    { header: "Selling", render: (i) => formatCurrency(i.sellingPrice) },
    { header: "Reorder", accessor: "reorderLevel" },
    { header: "Created", render: (i) => formatDateTime(i.createdAt) },
    {
      header: "Status",
      render: (i) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            i.active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
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
            className="p-1 text-blue-600 hover:text-blue-800"
            title="Edit"
          >
            <Edit size={18} />
          </button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Items</h1>

        {hasPermission(user.role, "MANAGE_ITEMS") && (
          <Button onClick={() => navigate("/items/new")}>
            <Plus size={20} className="mr-2" />
            Add Item
          </Button>
        )}
      </div>

      <Card>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name / barcode / category..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12">
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
