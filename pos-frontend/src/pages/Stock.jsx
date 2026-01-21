import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Search, Package, AlertTriangle } from 'lucide-react';
import { stockAPI } from '../api/stock.api';
import { useAuth } from '../context/AuthContext';
import Card from '../components/common/Card';
import Table from '../components/common/Table';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Stock = () => {
  const { user } = useAuth();
  const [stockItems, setStockItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    setLoading(true);
    try {
      const response = await stockAPI.getByBranch(user.branchId);
      setStockItems(response.data);
    } catch (error) {
      toast.error('Failed to fetch stock');
    } finally {
      setLoading(false);
    }
  };

  const filteredStock = stockItems.filter(item =>
    item.itemName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const lowStockItems = stockItems.filter(item => 
    item.quantity <= (item.reorderLevel || 0)
  );

  const totalValue = stockItems.reduce((sum, item) => 
    sum + (item.quantity * (item.cost || 0)), 0
  );

  const columns = [
    { header: 'Barcode', accessor: 'barcode' },
    { header: 'Item Name', accessor: 'itemName' },
    {
      header: 'Quantity',
      render: (item) => (
        <span className={`font-semibold ${
          item.quantity <= (item.reorderLevel || 0) ? 'text-red-600' : 'text-slate-800'
        }`}>
          {item.quantity}
          {item.quantity <= (item.reorderLevel || 0) && (
            <AlertTriangle size={14} className="inline ml-1 text-red-500" />
          )}
        </span>
      ),
    },
    { header: 'Reorder Level', accessor: 'reorderLevel' },
    {
      header: 'Status',
      render: (item) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          item.quantity > (item.reorderLevel || 0)
            ? 'bg-green-100 text-green-800'
            : item.quantity > 0
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {item.quantity > (item.reorderLevel || 0) ? 'Good' : item.quantity > 0 ? 'Low' : 'Out of Stock'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Stock Inventory</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-slate-600 mb-2">Total Items</h3>
              <p className="text-2xl font-bold text-slate-800">{stockItems.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="text-blue-600" size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-slate-600 mb-2">Low Stock Items</h3>
              <p className="text-2xl font-bold text-red-600">{lowStockItems.length}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-slate-600 mb-2">Total Stock Value</h3>
          <p className="text-2xl font-bold text-green-600">
            LKR {totalValue.toFixed(2)}
          </p>
        </Card>
      </div>

      <Card>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stock by item name or barcode..."
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