import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Search } from 'lucide-react';
import api from '../api/axios';
import { itemsAPI } from '../api/items.api';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../utils/formatters';
import { ADJUSTMENT_TYPES } from '../utils/constants';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Table from '../components/common/Table';
import LoadingSpinner from '../components/common/LoadingSpinner';

const StockAdjustments = () => {
  const { user } = useAuth();
  const [adjustments, setAdjustments] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    itemId: '',
    type: ADJUSTMENT_TYPES.MANUAL,
    qty: '',
    reason: '',
  });

  useEffect(() => {
    fetchAdjustments();
    fetchItems();
  }, []);

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/stock-adjustments/branch/${user.branchId}`);
      setAdjustments(response.data);
    } catch (error) {
      toast.error('Failed to fetch adjustments');
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const response = await itemsAPI.getAll();
      setItems(response.data);
    } catch (error) {
      console.error('Failed to fetch items');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/stock-adjustments', {
        ...formData,
        branchId: user.branchId,
        itemId: parseInt(formData.itemId),
        qty: parseInt(formData.qty),
      });
      toast.success('Stock adjustment recorded successfully');
      fetchAdjustments();
      handleCloseModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create adjustment');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      itemId: '',
      type: ADJUSTMENT_TYPES.MANUAL,
      qty: '',
      reason: '',
    });
  };

  const columns = [
    {
      header: 'Date & Time',
      render: (adj) => formatDateTime(adj.createdAt),
    },
    { header: 'Item', accessor: 'itemName' },
    {
      header: 'Type',
      render: (adj) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          adj.type === 'FOUND' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {adj.type}
        </span>
      ),
    },
    {
      header: 'Quantity',
      render: (adj) => (
        <span className={`font-semibold ${adj.qty > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {adj.qty > 0 ? '+' : ''}{adj.qty}
        </span>
      ),
    },
    { header: 'Reason', accessor: 'reason' },
    { header: 'By', accessor: 'username' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Stock Adjustments</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={20} className="mr-2" />
          New Adjustment
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="py-12">
            <LoadingSpinner size="lg" text="Loading adjustments..." />
          </div>
        ) : (
          <Table columns={columns} data={adjustments} />
        )}
      </Card>

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title="Create Stock Adjustment"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Item *
            </label>
            <select
              value={formData.itemId}
              onChange={(e) => setFormData({ ...formData, itemId: e.target.value })}
              className="input"
              required
            >
              <option value="">Select Item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.barcode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Adjustment Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="input"
              required
            >
              <option value={ADJUSTMENT_TYPES.EXPIRED}>Expired</option>
              <option value={ADJUSTMENT_TYPES.DAMAGED}>Damaged</option>
              <option value={ADJUSTMENT_TYPES.LOST}>Lost</option>
              <option value={ADJUSTMENT_TYPES.FOUND}>Found</option>
              <option value={ADJUSTMENT_TYPES.MANUAL}>Manual</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Quantity * (use negative for removal)
            </label>
            <input
              type="number"
              value={formData.qty}
              onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
              className="input"
              placeholder="e.g., -5 for removal, +5 for addition"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Negative values reduce stock, positive values increase stock
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Reason *
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="input"
              rows="3"
              placeholder="Explain the reason for this adjustment..."
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              Create Adjustment
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

export default StockAdjustments;