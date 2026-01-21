import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FileText, Download, Calendar } from 'lucide-react';
import { reportsAPI } from '../api/reports.api';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import { canAccessAllBranches } from '../utils/permissions';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import LoadingSpinner from '../components/common/LoadingSpinner';

const Reports = () => {
  const { user } = useAuth();
  const [activeReport, setActiveReport] = useState('sales');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(user.branchId || 1);
  
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  const generateReport = async (type) => {
    setLoading(true);
    setActiveReport(type);
    
    try {
      const params = {
        branchId: selectedBranch,
        from: new Date(dateRange.from + 'T00:00:00').toISOString(),
        to: new Date(dateRange.to + 'T23:59:59').toISOString(),
      };

      let response;
      switch (type) {
        case 'sales':
          response = await reportsAPI.salesSummary(params);
          break;
        case 'topSelling':
          response = await reportsAPI.topSelling({ ...params, limit: 20 });
          break;
        case 'lowStock':
          response = await reportsAPI.lowStock(selectedBranch);
          break;
        case 'creditDue':
          response = await reportsAPI.creditDue();
          break;
        case 'profit':
          response = await reportsAPI.profit({ ...params, limit: 50 });
          break;
        default:
          return;
      }
      
      setReportData(response.data);
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const renderSalesSummary = () => {
    if (!reportData) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <h3 className="text-sm font-medium text-slate-600 mb-2">Total Sales</h3>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(reportData.totalSales)}
          </p>
        </Card>
        <Card>
          <h3 className="text-sm font-medium text-slate-600 mb-2">Cash Sales</h3>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(reportData.cashSales)}
          </p>
        </Card>
        <Card>
          <h3 className="text-sm font-medium text-slate-600 mb-2">Credit Sales</h3>
          <p className="text-2xl font-bold text-orange-600">
            {formatCurrency(reportData.creditSales)}
          </p>
        </Card>
        <Card>
          <h3 className="text-sm font-medium text-slate-600 mb-2">Total Orders</h3>
          <p className="text-2xl font-bold text-slate-800">
            {reportData.totalOrders}
          </p>
        </Card>
        <Card>
          <h3 className="text-sm font-medium text-slate-600 mb-2">Total Discount</h3>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(reportData.totalDiscount)}
          </p>
        </Card>
      </div>
    );
  };

  const renderTopSelling = () => {
    if (!reportData) return null;

    const columns = [
      { header: 'Rank', render: (_, index) => index + 1 },
      { header: 'Item Name', accessor: 'itemName' },
      { header: 'Quantity Sold', accessor: 'qtySold' },
      {
        header: 'Revenue',
        render: (item) => formatCurrency(item.revenue),
      },
    ];

    return <Table columns={columns} data={reportData} />;
  };

  const renderLowStock = () => {
    if (!reportData) return null;

    const columns = [
      { header: 'Item Name', accessor: 'itemName' },
      {
        header: 'Current Stock',
        render: (item) => (
          <span className="font-semibold text-red-600">{item.quantity}</span>
        ),
      },
      { header: 'Reorder Level', accessor: 'reorderLevel' },
      {
        header: 'Status',
        render: (item) => (
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
            Low Stock
          </span>
        ),
      },
    ];

    return <Table columns={columns} data={reportData} />;
  };

  const renderCreditDue = () => {
    if (!reportData) return null;

    const columns = [
      { header: 'Customer Name', accessor: 'customerName' },
      { header: 'Phone', accessor: 'phone' },
      {
        header: 'Due Amount',
        render: (item) => (
          <span className="font-semibold text-red-600">
            {formatCurrency(item.dueAmount)}
          </span>
        ),
      },
    ];

    const totalDue = reportData.reduce((sum, item) => sum + item.dueAmount, 0);

    return (
      <>
        <Card className="mb-6">
          <h3 className="text-sm font-medium text-slate-600 mb-2">Total Credit Due</h3>
          <p className="text-3xl font-bold text-red-600">{formatCurrency(totalDue)}</p>
        </Card>
        <Table columns={columns} data={reportData} />
      </>
    );
  };

  const renderProfitReport = () => {
    if (!reportData) return null;

    const columns = [
      { header: 'Item Name', accessor: 'itemName' },
      { header: 'Qty Sold', accessor: 'qtySold' },
      {
        header: 'Revenue',
        render: (item) => formatCurrency(item.revenue),
      },
      {
        header: 'Cost',
        render: (item) => formatCurrency(item.cost),
      },
      {
        header: 'Profit',
        render: (item) => (
          <span className={`font-semibold ${item.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(item.profit)}
          </span>
        ),
      },
    ];

    const totalProfit = reportData.reduce((sum, item) => sum + item.profit, 0);

    return (
      <>
        <Card className="mb-6">
          <h3 className="text-sm font-medium text-slate-600 mb-2">Total Profit</h3>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(totalProfit)}</p>
        </Card>
        <Table columns={columns} data={reportData} />
      </>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Reports</h1>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="input"
            />
          </div>
          {canAccessAllBranches(user.role) && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Branch
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(Number(e.target.value))}
                className="input"
              >
                <option value="1">Branch 1</option>
                <option value="2">Branch 2</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => generateReport('sales')}>
            <FileText size={18} className="mr-2" />
            Sales Summary
          </Button>
          <Button onClick={() => generateReport('topSelling')} variant="secondary">
            Top Selling Items
          </Button>
          <Button onClick={() => generateReport('lowStock')} variant="secondary">
            Low Stock
          </Button>
          <Button onClick={() => generateReport('creditDue')} variant="secondary">
            Credit Due
          </Button>
          <Button onClick={() => generateReport('profit')} variant="secondary">
            Profit Report
          </Button>
        </div>
      </Card>

      {loading ? (
        <Card>
          <div className="py-12">
            <LoadingSpinner size="lg" text="Generating report..." />
          </div>
        </Card>
      ) : reportData ? (
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800">
              {activeReport === 'sales' && 'Sales Summary Report'}
              {activeReport === 'topSelling' && 'Top Selling Items'}
              {activeReport === 'lowStock' && 'Low Stock Items'}
              {activeReport === 'creditDue' && 'Credit Due Report'}
              {activeReport === 'profit' && 'Profit Report'}
            </h2>
            <Button variant="outline" size="sm">
              <Download size={18} className="mr-2" />
              Export
            </Button>
          </div>

          {activeReport === 'sales' && renderSalesSummary()}
          {activeReport === 'topSelling' && renderTopSelling()}
          {activeReport === 'lowStock' && renderLowStock()}
          {activeReport === 'creditDue' && renderCreditDue()}
          {activeReport === 'profit' && renderProfitReport()}
        </Card>
      ) : null}
    </div>
  );
};

export default Reports;