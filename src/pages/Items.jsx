import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { itemsAPI } from '../api/items.api';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { formatCurrency } from '../utils/formatters';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Table from '../components/common/Table';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useBranch } from "../context/BranchContext";
import { canAccessAllBranches } from "../utils/permissions";

const Items = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { selectedBranchId } = useBranch();
  const canSelectBranch = canAccessAllBranches(user.role);

  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    price: '',
    cost: '',
    reorderLevel: '',
    category: '',
  });


  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId, user?.role]);


  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = {};

      // ✅ Admin/Manager: if branch selected -> send branchId
      // ✅ All branches: no branchId
      // ✅ Cashier: always no branchId
      if (canSelectBranch && selectedBranchId) {
        params.branchId = Number(selectedBranchId);
      }

      const response = await itemsAPI.getWithStock(params);
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error("Failed to fetch items");
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await itemsAPI.update(editingItem.id, formData);
        toast.success('Item updated successfully');
      } else {
        await itemsAPI.create(formData);
        toast.success('Item created successfully');
      }
      fetchItems();
      handleCloseModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };
  console.log(items);
  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      barcode: item.barcode,
      price: item.price,
      cost: item.cost,
      reorderLevel: item.reorderLevel,
      category: item.category,
    });
    setShowModal(true);
  };

  const handleToggleActive = async (id) => {
    try {
      await itemsAPI.toggleActive(id);
      toast.success('Item status updated');
      fetchItems();
    } catch (error) {
      toast.error('Failed to update item');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData({
      name: '',
      barcode: '',
      price: '',
      cost: '',
      reorderLevel: '',
      category: '',
    });
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.barcode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = [
    { header: 'Barcode', accessor: 'barcode' },
    { header: 'Name', accessor: 'name' },
    {
      header: 'Price',
      render: (item) => formatCurrency(item.price)
    },
    {
      header: 'Cost',
      render: (item) => formatCurrency(item.cost)
    },
    { header: 'Category', accessor: 'category' },
    {
      header: "Qty",
      render: (item) => {
        const qty = Number(item.quantity ?? 0);
        const reorder = Number(item.reorderLevel ?? 0);

        const isLow = qty <= reorder;

        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${isLow ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
              }`}
          >
            {qty}
          </span>
        );
      },
    },

    { header: 'Reorder Level', accessor: 'reorderLevel' },
    {
      header: 'Status',
      render: (item) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
          {item.active ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      header: 'Actions',
      render: (item) => (
        <div className="flex gap-2">
          {hasPermission(user.role, 'MANAGE_ITEMS') && (
            <>
              <button
                onClick={() => handleEdit(item)}
                className="p-1 text-blue-600 hover:text-blue-800"
              >
                <Edit size={18} />
              </button>
              <button
                onClick={() => handleToggleActive(item.id)}
                className="p-1 text-slate-600 hover:text-slate-800"
              >
                {item.active ? 'Disable' : 'Enable'}
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Items Management</h1>
        {hasPermission(user.role, 'MANAGE_ITEMS') && (
          <Button onClick={() => setShowModal(true)}>
            <Plus size={20} className="mr-2" />
            Add Item
          </Button>
        )}
      </div>

      <Card>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items by name or barcode..."
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

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingItem ? 'Edit Item' : 'Add New Item'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Item Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Barcode *
            </label>
            <input
              type="text"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              className="input"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Selling Price *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cost Price *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                className="input"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Reorder Level
              </label>
              <input
                type="number"
                value={formData.reorderLevel}
                onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              {editingItem ? 'Update Item' : 'Create Item'}
            </Button>
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Items;