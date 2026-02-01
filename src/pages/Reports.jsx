import React, { useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { 
  FileText, Download, TrendingUp, 
  PieChart as PieIcon, BarChart3, AlertCircle, DollarSign,
  Users, Truck
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { reportsAPI } from '../api/reports.api';
import { formatCurrency } from '../utils/formatters';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useBranch } from "../context/BranchContext";

// Chart Colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const Reports = () => {
  const [activeTab, setActiveTab] = useState('sales'); 
  const [loading, setLoading] = useState(false);
  
  // Data States
  const [reportData, setReportData] = useState(null); // List Data (Tables/Charts)
  const [profitSummary, setProfitSummary] = useState(null); // Net Profit Summary Data

  const { selectedBranchId } = useBranch();
  
  // Date State
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(1)).toISOString().split('T')[0], // 1st of current month
    to: new Date().toISOString().split('T')[0],
  });

  // Ref for export
  const reportRef = useRef(null);

  // --- API CALLS ---
  const generateReport = async (type) => {
    setLoading(true);
    setReportData(null); 
    setProfitSummary(null); // Clear old summary
    
    try {
      const params = {
        branchId: selectedBranchId,
        from: new Date(dateRange.from + 'T00:00:00').toISOString(),
        to: new Date(dateRange.to + 'T23:59:59').toISOString(),
      };

      let response;
      switch (type) {
        case 'sales':
          response = await reportsAPI.salesSummary(params);
          break;
          
        case 'topSelling':
          response = await reportsAPI.topSelling({ ...params, limit: 10 });
          break;
          
        case 'profit':
          // 1. Get Item List for Table
          response = await reportsAPI.profit({ ...params, limit: 50 });
          
          // 2. 🔥 Get Net Profit Summary (Cards)
          try {
            const summaryRes = await reportsAPI.profitSummary(params); // Make sure this API exists!
            setProfitSummary(summaryRes.data);
          } catch (err) {
            console.error("Failed to fetch profit summary", err);
            // Fallback if API fails: Calculate basic gross profit from list
            const gross = response.data.reduce((sum, item) => sum + item.profit, 0);
            const rev = response.data.reduce((sum, item) => sum + item.revenue, 0);
            setProfitSummary({ grossProfit: gross, totalRevenue: rev, totalExpenses: 0, netProfit: gross });
          }
          break;
          
        case 'topCustomers':
          response = await reportsAPI.topCustomers({ ...params, limit: 20 });
          break;
          
        case 'topSuppliers':
          response = await reportsAPI.topSuppliers({ ...params, limit: 20 });
          break;
          
        case 'lowStock':
          response = await reportsAPI.lowStock(selectedBranchId);
          break;
          
        case 'creditDue':
          response = await reportsAPI.creditDue();
          break;
          
        default:
          return;
      }
      
      setReportData(response.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  // --- EXPORT FUNCTIONS ---
  const exportToPDF = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`report_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("PDF Downloaded!");
  };

  const exportChartAsImage = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current);
    const image = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = image;
    link.download = `chart_${activeTab}.png`;
    link.click();
    toast.success("Image Downloaded!");
  };

  // --- RENDER TABS ---
  const renderTabs = () => (
    <div className="flex flex-wrap gap-2 mb-6">
      {[
        { id: 'sales', label: 'Sales Summary', icon: TrendingUp },
        { id: 'profit', label: 'Profit Analysis', icon: DollarSign },
        { id: 'topSelling', label: 'Top Products', icon: BarChart3 },
        { id: 'topCustomers', label: 'Top Customers', icon: Users },
        { id: 'topSuppliers', label: 'Top Suppliers', icon: Truck },
        { id: 'lowStock', label: 'Low Stock', icon: AlertCircle },
        { id: 'creditDue', label: 'Credit Due', icon: FileText },
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => { setActiveTab(tab.id); generateReport(tab.id); }}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-all text-sm ${
            activeTab === tab.id 
              ? 'bg-blue-600 text-white shadow-md transform scale-105' 
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
          }`}
        >
          <tab.icon size={16} /> {tab.label}
        </button>
      ))}
    </div>
  );

  // --- SPECIFIC REPORT VIEWS ---

  const SalesReport = ({ data }) => {
    const pieData = [
      { name: 'Cash', value: data.cashSales },
      { name: 'Credit', value: data.creditSales },
    ];

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-blue-50 border-blue-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase">Total Sales</h3>
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(data.totalSales)}</p>
          </Card>
          <Card className="bg-green-50 border-green-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase">Cash Sales</h3>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(data.cashSales)}</p>
          </Card>
          <Card className="bg-orange-50 border-orange-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase">Credit Sales</h3>
            <p className="text-2xl font-bold text-orange-700">{formatCurrency(data.creditSales)}</p>
          </Card>
          <Card className="bg-purple-50 border-purple-100">
            <h3 className="text-xs font-bold text-slate-500 uppercase">Total Orders</h3>
            <p className="text-2xl font-bold text-purple-700">{data.totalOrders}</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Payment Methods">
             <div className="h-[300px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : '#F59E0B'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
             </div>
          </Card>

          <Card title="Sales Overview">
             <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pieData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={60} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </Card>
        </div>
      </div>
    );
  };

  const TopSellingReport = ({ data }) => (
    <div className="space-y-6 animate-in fade-in">
       <Card className="h-[400px]">
          <h3 className="font-bold text-lg mb-4 text-slate-700">Top 10 Products by Revenue</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data.slice(0, 10)}
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="itemName" type="category" width={150} tick={{fontSize: 12}} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="revenue" fill="#8884d8" radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
       </Card>

       <Card title="Detailed Product List">
         <Table 
            columns={[
              { header: '#', render: (_, i) => i + 1 },
              { header: 'Product', accessor: 'itemName' },
              { header: 'Qty Sold', accessor: 'qtySold' },
              { header: 'Revenue', render: (i) => formatCurrency(i.revenue) }
            ]}
            data={data}
         />
       </Card>
    </div>
  );

  const ProfitReport = ({ data, summary }) => {
    // If summary is null (loading or error), default to 0
    const grossProfit = summary?.grossProfit || 0;
    const totalExpenses = summary?.totalExpenses || 0;
    const netProfit = summary?.netProfit || 0;
    
    return (
    <div className="space-y-6 animate-in fade-in">
       {/* 🔥 Updated: Net Profit Cards */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         
         {/* Gross Profit */}
         <Card className="bg-blue-50 border-blue-100">
           <h3 className="text-xs font-bold text-slate-500 uppercase">Gross Profit</h3>
           <p className="text-2xl font-bold text-blue-700">{formatCurrency(grossProfit)}</p>
         </Card>

         {/* Expenses */}
         <Card className="bg-red-50 border-red-100">
           <h3 className="text-xs font-bold text-slate-500 uppercase">Less: Expenses</h3>
           <p className="text-2xl font-bold text-red-600">- {formatCurrency(totalExpenses)}</p>
         </Card>

         {/* Net Profit */}
         <Card className="bg-emerald-50 border-emerald-100 shadow-sm ring-1 ring-emerald-200">
           <h3 className="text-xs font-bold text-slate-500 uppercase">Net Profit (Final)</h3>
           <p className="text-3xl font-bold text-emerald-700">{formatCurrency(netProfit)}</p>
         </Card>
       </div>

       <Card title="Profit Margin Analysis (Top 20 Items)">
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.slice(0, 20)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="itemName" hide />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} dot={false} name="Revenue" />
                <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} dot={false} name="Item Profit" />
              </LineChart>
            </ResponsiveContainer>
          </div>
       </Card>

       <Card title="Detailed Profit Data">
         <Table 
            columns={[
              { header: 'Product', accessor: 'itemName' },
              { header: 'Cost', render: (i) => formatCurrency(i.cost) },
              { header: 'Revenue', render: (i) => formatCurrency(i.revenue) },
              { header: 'Item Profit', render: (i) => <span className="font-bold text-green-600">{formatCurrency(i.profit)}</span> }
            ]}
            data={data}
         />
       </Card>
    </div>
  )};

  // --- MAIN RENDER ---
  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Analytics</h1>
           <p className="text-slate-500">Insights & Performance Reports</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
           <input 
              type="date" 
              value={dateRange.from}
              onChange={(e) => setDateRange(prev => ({...prev, from: e.target.value}))}
              className="px-3 py-2 rounded-lg text-sm border-none focus:ring-0 text-slate-600 outline-none"
           />
           <span className="self-center text-slate-300">to</span>
           <input 
              type="date" 
              value={dateRange.to}
              onChange={(e) => setDateRange(prev => ({...prev, to: e.target.value}))}
              className="px-3 py-2 rounded-lg text-sm border-none focus:ring-0 text-slate-600 outline-none"
           />
           <button 
              onClick={() => generateReport(activeTab)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 ml-2 shadow-sm"
           >
              Run Report
           </button>
        </div>
      </div>

      {/* Tabs */}
      {renderTabs()}

      {/* Content Area */}
      <div className="min-h-[500px]">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <LoadingSpinner size="lg" text="Analyzing data..." />
          </div>
        ) : !reportData && !loading ? (
           <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
              <PieIcon size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-600">Ready to Analyze</h3>
              <p className="text-slate-400">Select a report type and click "Run Report" to begin.</p>
           </div>
        ) : (
          <div className="space-y-6">
             {/* Action Buttons */}
             <div className="flex justify-end gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={exportChartAsImage}>
                   <PieIcon size={16} className="mr-2" /> Save Chart
                </Button>
                <Button variant="outline" size="sm" onClick={exportToPDF}>
                   <Download size={16} className="mr-2" /> Download PDF
                </Button>
             </div>

             {/* Report Container (Export Target) */}
             <div ref={reportRef} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="mb-8 border-b border-slate-100 pb-4 flex justify-between items-end">
                   <div>
                      <h2 className="text-2xl font-bold text-slate-800 capitalize">{activeTab.replace(/([A-Z])/g, ' $1').trim()} Report</h2>
                      <p className="text-sm text-slate-500 mt-1">
                        Period: {new Date(dateRange.from).toLocaleDateString()} — {new Date(dateRange.to).toLocaleDateString()}
                      </p>
                   </div>
                   <div className="text-right">
                      <p className="text-xs text-slate-400">Generated: {new Date().toLocaleString()}</p>
                   </div>
                </div>

                {/* Render Specific Reports */}
                {activeTab === 'sales' && <SalesReport data={reportData} />}
                {activeTab === 'topSelling' && <TopSellingReport data={reportData} />}
                
                {/* 🔥 Updated Profit Report with Summary Pass-through */}
                {activeTab === 'profit' && <ProfitReport data={reportData} summary={profitSummary} />}
                
                {activeTab === 'topCustomers' && (
                  <Card title="Most Valuable Customers">
                    <Table 
                      columns={[
                        { header: 'Rank', render: (_, i) => i + 1 },
                        { header: 'Customer Name', accessor: 'customerName' },
                        { header: 'Phone', accessor: 'phone' },
                        { header: 'Total Orders', accessor: 'orderCount' },
                        { header: 'Total Spent', render: (i) => <span className="font-bold text-blue-600">{formatCurrency(i.totalSpent)}</span> }
                      ]}
                      data={reportData}
                    />
                  </Card>
                )}

                {activeTab === 'topSuppliers' && (
                  <Card title="Top Suppliers by Purchase Volume">
                    <Table 
                      columns={[
                        { header: 'Rank', render: (_, i) => i + 1 },
                        { header: 'Supplier Name', accessor: 'supplierName' },
                        { header: 'Contact No', accessor: 'contactNo' },
                        { header: 'Purchases', accessor: 'purchaseCount' },
                        { header: 'Total Paid', render: (i) => <span className="font-bold text-red-600">{formatCurrency(i.totalPurchased)}</span> }
                      ]}
                      data={reportData}
                    />
                  </Card>
                )}

                {activeTab === 'creditDue' && (
                  <Card title="Outstanding Customer Credits">
                    <Table 
                      columns={[
                        { header: 'Customer', accessor: 'customerName' },
                        { header: 'Phone', render: (i) => i.phone || 'N/A' },
                        { header: 'Due Amount', render: (i) => <span className="text-red-600 font-bold">{formatCurrency(i.dueAmount)}</span> }
                      ]}
                      data={reportData}
                    />
                  </Card>
                )}

                {activeTab === 'lowStock' && (
                   <Card title="Critical Stock Alerts">
                     <Table 
                       columns={[
                         { header: 'Item Name', accessor: 'itemName' },
                         { header: 'Current Stock', render: (i) => <span className="text-red-600 font-bold">{i.quantity}</span> },
                         { header: 'Reorder Level', accessor: 'reorderLevel' },
                         { header: 'Status', render: () => <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">LOW</span> }
                       ]}
                       data={reportData}
                     />
                   </Card>
                )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;