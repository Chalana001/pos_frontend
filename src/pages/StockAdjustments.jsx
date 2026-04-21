import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { formatDateTime } from '../utils/formatters';
import Card from '../components/common/Card';
import Table from '../components/common/Table';
import LoadingSpinner from '../components/common/LoadingSpinner';

const StockAdjustments = () => {
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();

  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAdjustments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId]);

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const currentBranchId = selectedBranchId || 0;
      const response = await api.get(`/stock-adjustments/branch/${currentBranchId}`);
      setAdjustments(response.data);
    } catch (error) {
      toast.error('Failed to fetch adjustments');
    } finally {
      setLoading(false);
    }
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
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${adj.type === 'FOUND' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {adj.type}
        </span>
      ),
    },
    {
      header: 'Quantity',
      render: (adj) => {
        // API response එකෙන් එන විදිහටම fields පාවිච්චි කරනවා
        const qtyValue = adj.qtyChange || 0; 
        const isPositive = qtyValue > 0;
        
        // displayQtyChange එක තියෙනවා නම් ඒක පෙන්නනවා (-500.000 වගේ)
        const displayValue = adj.displayQtyChange !== undefined ? adj.displayQtyChange : qtyValue;
        
        // Unit එක තියෙනවා නම් ' G' හෝ ' KG' විදිහට එකතු කරනවා
        const unit = adj.qtyUnit ? ` ${adj.qtyUnit}` : '';

        return (
          <span className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{displayValue}{unit}
          </span>
        );
      },
    },
    { header: 'Reason', accessor: 'reason' },
    { header: 'By', accessor: 'username' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Stock Adjustments History</h1>
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
    </div>
  );
};

export default StockAdjustments;