import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, ArrowRight, ArrowLeft, Check, X } from 'lucide-react';
import api from '../api/axios';
import { itemsAPI } from '../api/items.api';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../utils/formatters';
import { TRANSFER_STATUS } from '../utils/constants';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Table from '../components/common/Table';
import LoadingSpinner from '../components/common/LoadingSpinner';

const StockTransfers = () => {
  const { user } = useAuth();
  const [outgoing, setOutgoing] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [branches, setBranches] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('outgoing');
  
  const [transferItems, setTransferItems] = useState([]);
  const [formData, setFormData] = useState({
    toBranchId: '',
    note: '',
  });

  const [newItem, setNewItem] = useState({
    itemId: '',
    qty: '',
  });

  useEffect(() => {
    fetchTransfers();
    fetchBranches();
    fetchItems();
  }, []);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const [outgoingRes, incomingRes] = await Promise.all([
        api.get('/stock-transfers/outgoing', { params: { branchId: user.branchId } }),
        api.get('/stock-transfers/incoming', { params: { branchId: user.branchId } }),
      ]);
      setOutgoing(outgoingRes.data);
      setIncoming(incomingRes.data);
    } catch (error) {
      toast.error('Failed to fetch transfers');
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await api.get('/branches');
      setBranches(response.data.filter(b => b.id !== user.branchId));
    } catch (error) {
      console.error('Failed to fetch branches');
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

  const handleAddItem = () => {
    if (!newItem.itemId || !newItem.qty) {
      toast.error('Please select item and quantity');
      return;
    }

    const item = items.find(i => i.id === parseInt(newItem.itemId));
    const exists = transferItems.find(ti => ti.itemId === parseInt(newItem.itemId));

    if (exists) {
      toast.error('Item already added');
      return;
    }

    setTransferItems([
      ...transferItems,
      {
        itemId: parseInt(newItem.itemId),
        itemName: item.name,
        qty: parseInt(newItem.qty),
      },
    ]);
    setNewItem({ itemId: '', qty: '' });
  };

  const handleRemoveItem = (index) => {
    setTransferItems(transferItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (transferItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      await api.post('/stock-transfers', {
        fromBranchId: user.branchId,
        toBranchId: parseInt(formData.toBranchId),
        note: formData.note,
        items: transferItems.map(item => ({
          itemId: item.itemId,
          qty: item.qty,
        })),
      });
      toast.success('Transfer request created successfully');
      fetchTransfers();
      handleCloseModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create transfer');
    }
  };

  const handleReceive = async (id) => {
    try {
      await api.post(`/stock-transfers/${id}/receive`);
      toast.success('Transfer received successfully');
      fetchTransfers();
    } catch (error) {
      toast.error('Failed to receive transfer');
    }
  };

  const handleCancel = async (id) => {
    try {
      await api.post(`/stock-transfers/${id}/cancel`);
      toast.success('Transfer cancelled successfully');
      fetchTransfers();
    } catch (error) {
      toast.error('Failed to cancel transfer');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ toBranchId: '', note: '' });
    setTransferItems([]);
    setNewItem({ itemId: '', qty: '' });
  };

  const outgoingColumns = [
    {
      header: 'Date',
      render: (transfer) => formatDateTime(transfer.createdAt),
    },
    { header: 'To Branch', accessor: 'toBranchName' },
    {
      header: 'Items',
      render: (transfer) => transfer.items?.length || 0,
    },
    { header: 'Note', accessor: 'note' },
    {
      header: 'Status',
      render: (transfer) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          transfer.status === TRANSFER_STATUS.REQUESTED
            ? 'bg-yellow-100 text-yellow-800'
            : transfer.status === TRANSFER_STATUS.RECEIVED
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {transfer.status}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (transfer) => (
        transfer.status === TRANSFER_STATUS.REQUESTED && (
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleCancel(transfer.id)}
          >
            Cancel
          </Button>
        )
      ),
    },
  ];

  const incomingColumns = [
    {
      header: 'Date',
      render: (transfer) => formatDateTime(transfer.createdAt),
    },
    { header: 'From Branch', accessor: 'fromBranchName' },
    {
      header: 'Items',
      render: (transfer) => transfer.items?.length || 0,
    },
    { header: 'Note', accessor: 'note' },
    {
      header: 'Status',
      render: (transfer) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          transfer.status === TRANSFER_STATUS.REQUESTED
            ? 'bg-yellow-100 text-yellow-800'
            : transfer.status === TRANSFER_STATUS.RECEIVED
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {transfer.status}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (transfer) => (
        transfer.status === TRANSFER_STATUS.REQUESTED && (
          <Button
            size="sm"
            variant="success"
            onClick={() => handleReceive(transfer.id)}
          >
            <Check size={16} className="mr-1" />
            Receive
          </Button>
        )
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Stock Transfers</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={20} className="mr-2" />
          New Transfer
        </Button>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('outgoing')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'outgoing'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <ArrowRight size={18} className="inline mr-1" />
          Outgoing ({outgoing.length})
        </button>
        <button
          onClick={() => setActiveTab('incoming')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'incoming'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          <ArrowLeft size={18} className="inline mr-1" />
          Incoming ({incoming.length})
        </button>
      </div>

      <Card>
        {loading ? (
          <div className="py-12">
            <LoadingSpinner size="lg" text="Loading transfers..." />
          </div>
        ) : activeTab === 'outgoing' ? (
          <Table columns={outgoingColumns} data={outgoing} />
        ) : (
          <Table columns={incomingColumns} data={incoming} />
        )}
      </Card>

      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title="Create Stock Transfer"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Transfer To Branch *
            </label>
            <select
              value={formData.toBranchId}
              onChange={(e) => setFormData({ ...formData, toBranchId: e.target.value })}
              className="input"
              required
            >
              <option value="">Select Branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Note
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              className="input"
              rows="2"
              placeholder="Optional transfer note..."
            />
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-slate-800 mb-3">Add Items</h3>
            
            <div className="flex gap-2 mb-4">
              <select
                value={newItem.itemId}
                onChange={(e) => setNewItem({ ...newItem, itemId: e.target.value })}
                className="input flex-1"
              >
                <option value="">Select Item</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.barcode})
                  </option>
                ))}
              </select>
              
              <input
                type="number"
                value={newItem.qty}
                onChange={(e) => setNewItem({ ...newItem, qty: e.target.value })}
                className="input w-32"
                placeholder="Qty"
                min="1"
              />
              
              <Button type="button" onClick={handleAddItem}>
                Add
              </Button>
            </div>

            {transferItems.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-700">Items to Transfer:</h4>
                {transferItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-800">{item.itemName}</p>
                      <p className="text-sm text-slate-500">Quantity: {item.qty}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button type="submit" className="flex-1" disabled={transferItems.length === 0}>
              Create Transfer ({transferItems.length} items)
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

export default StockTransfers;