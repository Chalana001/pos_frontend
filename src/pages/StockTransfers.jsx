import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { formatDateTime } from '../utils/formatters';
import { TRANSFER_STATUS } from '../utils/constants';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useBranch } from '../context/BranchContext';

const StockTransfers = () => {
  const { user } = useAuth();
  const [outgoing, setOutgoing] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('outgoing');
  const { selectedBranchId } = useBranch();

  useEffect(() => {
    fetchTransfers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTransfers = async () => {
  // 💡 Admin කෙනෙක් නම් selector එකේ ID එක ගන්නවා, Manager කෙනෙක් නම් එයාගේ branchId එක ගන්නවා
  const branchId = selectedBranchId || user?.branchId;

  if (!branchId) {
    console.warn("No Branch ID available to fetch transfers.");
    setOutgoing([]);
    setIncoming([]);
    return;
  }

  setLoading(true);
  try {
    console.log("Fetching transfers for Branch ID:", branchId);
    
    const [outgoingRes, incomingRes] = await Promise.all([
      api.get(`/stock-transfers/outgoing/${branchId}`),
      api.get(`/stock-transfers/incoming/${branchId}`),
    ]);
    
    setOutgoing(outgoingRes.data);
    setIncoming(incomingRes.data);
  } catch (error) {
    console.error("Fetch error:", error);
    toast.error('Failed to fetch transfers');
  } finally {
    setLoading(false);
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
      // backend එකේ cancelReason එකක් ඉල්ලනවා නම් මේ විදිහට යවන්න පුළුවන් (දැනට හිස්ව යවමු)
      await api.post(`/stock-transfers/${id}/cancel`, { cancelReason: "Cancelled by user" });
      toast.success('Transfer cancelled successfully');
      fetchTransfers();
    } catch (error) {
      toast.error('Failed to cancel transfer');
    }
  };

  const outgoingColumns = [
    {
      header: 'Date',
      render: (transfer) => formatDateTime(transfer.createdAt || transfer.requestedAt),
    },
    { header: 'Transfer No', accessor: 'transferNo' },
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
          transfer.status === TRANSFER_STATUS.REQUESTED || transfer.status === 'IN_TRANSIT'
            ? 'bg-yellow-100 text-yellow-800'
            : transfer.status === TRANSFER_STATUS.RECEIVED || transfer.status === 'RECEIVED'
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {transfer.status?.replace('_', ' ')}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (transfer) => (
        (transfer.status === TRANSFER_STATUS.REQUESTED || transfer.status === 'IN_TRANSIT') && (
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
      render: (transfer) => formatDateTime(transfer.createdAt || transfer.requestedAt),
    },
    { header: 'Transfer No', accessor: 'transferNo' },
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
          transfer.status === TRANSFER_STATUS.REQUESTED || transfer.status === 'IN_TRANSIT'
            ? 'bg-yellow-100 text-yellow-800'
            : transfer.status === TRANSFER_STATUS.RECEIVED || transfer.status === 'RECEIVED'
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {transfer.status?.replace('_', ' ')}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (transfer) => (
        (transfer.status === TRANSFER_STATUS.REQUESTED || transfer.status === 'IN_TRANSIT') && (
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
        {/* New Transfer Button අයින් කළා */}
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
    </div>
  );
};

export default StockTransfers;