import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { 
  FileText, Download, TrendingUp, 
  PieChart as PieIcon, BarChart3, AlertCircle, DollarSign,
  Users, Truck, Calendar
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

const formatDateInput = (date) =>
  new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

const datePresetOptions = [
  { id: 'today', label: 'Today' },
  { id: 'thisMonth', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
  { id: 'thisYear', label: 'This Year' },
  { id: 'custom', label: 'Custom' },
];

const productRankOptions = [
  { value: 'REVENUE', label: 'Revenue' },
  { value: 'QUANTITY', label: 'Quantity' },
  { value: 'PROFIT', label: 'Profit' },
];

const productTypeOptions = [
  { value: 'ALL', label: 'All Types' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'WEIGHT', label: 'Weight' },
  { value: 'SERVICE', label: 'Service' },
  { value: 'RECIPE', label: 'Recipe' },
];

const productLimitOptions = [10, 20, 50];

const getPresetDateRange = (type) => {
  const now = new Date();
  let from = new Date(now);
  let to = new Date(now);

  if (type === 'thisMonth') {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (type === 'lastMonth') {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    to = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (type === 'thisYear') {
    from = new Date(now.getFullYear(), 0, 1);
  }

  return { from: formatDateInput(from), to: formatDateInput(to) };
};

const Reports = () => {
  const [activeTab, setActiveTab] = useState('sales'); 
  const [loading, setLoading] = useState(false);
  
  const [reportData, setReportData] = useState(null);       
  const [loadedTab, setLoadedTab] = useState(null);
  const [profitSummary, setProfitSummary] = useState(null); 
  const [salesTrend, setSalesTrend] = useState({ data: [], type: 'DAILY' });

  const { selectedBranchId } = useBranch();
  
  // 🚀 Default Dates (YYYY-MM-DD)
  const [datePreset, setDatePreset] = useState('thisMonth');
  const [dateRange, setDateRange] = useState(() => getPresetDateRange('thisMonth'));
  const [filterVersion, setFilterVersion] = useState(0);
  const [productFilters, setProductFilters] = useState({
    rankBy: 'REVENUE',
    itemType: 'ALL',
    limit: 10,
  });

  const reportRef = useRef(null);

  const setQuickDateOld = (type) => {
    const now = new Date();
    let from = new Date();
    let to = new Date();

    if (type === 'today') {
       // already today
    } else if (type === 'thisMonth') {
       from = new Date(now.getFullYear(), now.getMonth(), 1); 
       to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (type === 'lastMonth') {
       from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
       to = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (type === 'thisYear') {
       from = new Date(now.getFullYear(), 0, 1); 
       to = new Date(now.getFullYear(), 11, 31); 
    }

    const formatDate = (d) => {
      // ලංකාවේ Timezone එකට ගළපලා YYYY-MM-DD ගන්නවා
      return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    };
    
    setDateRange({ from: formatDate(from), to: formatDate(to) });
    toast.success(`Date filter applied: ${type.replace(/([A-Z])/g, ' $1').trim()}`);
  };

  const setQuickDate = (type) => {
    setDatePreset(type);
    setReportData(null);
    setLoadedTab(null);
    setLoading(true);
    if (type !== 'custom') {
      setDateRange(getPresetDateRange(type));
    }
    setFilterVersion((version) => version + 1);
  };

  const activeDateLabel = useMemo(
    () => datePresetOptions.find((option) => option.id === datePreset)?.label || 'Custom',
    [datePreset]
  );

  const handleCustomDateChange = (field, value) => {
    setDatePreset('custom');
    setReportData(null);
    setLoadedTab(null);
    setLoading(true);
    setDateRange((prev) => ({ ...prev, [field]: value }));
    setFilterVersion((version) => version + 1);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setReportData(null);
    setLoadedTab(null);
    setLoading(true);
  };

  const handleProductFilterChange = (field, value) => {
    setProductFilters((prev) => ({
      ...prev,
      [field]: field === 'limit' ? Number(value) : value,
    }));
    setReportData(null);
    setLoadedTab(null);
    setLoading(true);
    setFilterVersion((version) => version + 1);
  };

  const formatQty = (value, unit) => {
    const numeric = Number(value || 0);
    const formatted = Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(3).replace(/\.?0+$/, '');
    return unit ? `${formatted} ${unit}` : formatted;
  };

  const generateReport = async (type) => {
    setLoading(true);
    setReportData(null); 
    setLoadedTab(null);
    setProfitSummary(null);
    setSalesTrend({ data: [], type: 'DAILY' }); 
    
    try {
      // 🚀 API එක ඉල්ලන විදිහටම YYYY-MM-DD යවනවා. 
      // branchId එක 0 හෝ null නම් යවන්නේ නෑ (API එකේ optional නිසා)
      const params = {
        from: dateRange.from,
        to: dateRange.to,
        ...(selectedBranchId && selectedBranchId !== 0 && { branchId: selectedBranchId })
      };

      let response;
      switch (type) {
        case 'sales':
          response = await reportsAPI.salesSummary(params);
          
          try {
             const fromDate = new Date(dateRange.from);
             const toDate = new Date(dateRange.to);
             const diffTime = Math.abs(toDate - fromDate);
             const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
             const trendType = diffDays > 35 ? 'MONTHLY' : 'DAILY';

             const trendRes = await reportsAPI.salesTrend({ ...params, type: trendType });
             setSalesTrend({ data: trendRes.data, type: trendType });
          } catch (err) {
             console.error("Error fetching sales trend", err);
             setSalesTrend({ data: [], type: 'DAILY' });
          }
          break;
          
        case 'topSelling':
          response = await reportsAPI.topSelling({
            ...params,
            rankBy: productFilters.rankBy,
            itemType: productFilters.itemType !== 'ALL' ? productFilters.itemType : undefined,
            limit: productFilters.limit,
          });
          break;
          
        case 'profit':
          response = await reportsAPI.profit({ ...params, limit: 50 });
          try {
            const summaryRes = await reportsAPI.profitSummary(params);
            setProfitSummary(summaryRes.data);
          } catch (err) {
            console.error("Failed to fetch profit summary", err);
            const gross = response.data.reduce((sum, item) => sum + item.profit, 0);
            setProfitSummary({ grossProfit: gross, totalExpenses: 0, netProfit: gross });
          }
          break;
          
        case 'topCustomers':
          response = await reportsAPI.topCustomers({ ...params, limit: 20 });
          break;
          
        case 'topSuppliers':
          response = await reportsAPI.topSuppliers({ ...params, limit: 20 });
          break;
          
        case 'lowStock':
          // API එකට යවන්නේ branchId විතරයි
          response = await reportsAPI.lowStock(selectedBranchId && selectedBranchId !== 0 ? { branchId: selectedBranchId } : {});
          break;
          
        case 'creditDue':
          // API එකට parameters නෑ
          response = await reportsAPI.creditDue();
          break;
          
        default:
          return;
      }
      
      const arrayReportTypes = ['topSelling', 'profit', 'topCustomers', 'topSuppliers', 'lowStock', 'creditDue'];
      setReportData(arrayReportTypes.includes(type) ? (Array.isArray(response.data) ? response.data : []) : response.data);
      setLoadedTab(type);
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      generateReport(activeTab);
    }, 250);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, dateRange.from, dateRange.to, filterVersion, productFilters.itemType, productFilters.limit, productFilters.rankBy, selectedBranchId]);

  const exportToPDF = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`report_${activeTab}_${dateRange.from}.pdf`);
    toast.success("PDF Downloaded!");
  };

  const exportChartAsImage = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current);
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `chart_${activeTab}.png`;
    link.click();
    toast.success("Image Downloaded!");
  };

  const SalesReport = ({ data, trendData }) => {
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
          <Card title="Payment Split">
             <div className="h-[300px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData} cx="50%" cy="50%"
                      innerRadius={60} outerRadius={100}
                      paddingAngle={5} dataKey="value"
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

          <Card title={`Sales Trend (${trendData.type === 'MONTHLY' ? 'Monthly' : 'Daily'})`}>
             <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData.data}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    
                    <XAxis 
                        dataKey="date" 
                        tickFormatter={(str) => {
                            const d = new Date(str);
                            if (trendData.type === 'MONTHLY') {
                                return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                            }
                            return `${d.getDate()}/${d.getMonth()+1}`;
                        }}
                        style={{ fontSize: '12px' }}
                    />
                    <YAxis style={{ fontSize: '12px' }} />
                    <Tooltip 
                        formatter={(value) => formatCurrency(value)}
                        labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, {
                            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                        })} 
                    />
                    {/* 🚀 API එකෙන් එන්නේ sales නිසා dataKey="sales" කළා */}
                    <Area type="monotone" dataKey="sales" stroke="#3B82F6" fillOpacity={1} fill="url(#colorSales)" />
                  </AreaChart>
                </ResponsiveContainer>
             </div>
          </Card>
        </div>
      </div>
    );
  };

  const ProfitReport = ({ data, summary }) => {
    const grossProfit = summary?.grossProfit || 0;
    const totalExpenses = summary?.totalExpenses || 0;
    const netProfit = summary?.netProfit || 0;

    return (
    <div className="space-y-6 animate-in fade-in">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <Card className="bg-blue-50 border-blue-100">
           <h3 className="text-xs font-bold text-slate-500 uppercase">Gross Profit</h3>
           <p className="text-2xl font-bold text-blue-700">{formatCurrency(grossProfit)}</p>
         </Card>
         <Card className="bg-red-50 border-red-100">
           <h3 className="text-xs font-bold text-slate-500 uppercase">Less: Expenses</h3>
           <p className="text-2xl font-bold text-red-600">- {formatCurrency(totalExpenses)}</p>
         </Card>
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
              { header: 'Qty Sold', accessor: 'qtySold' },
              { header: 'Cost', render: (i) => formatCurrency(i.cost) },
              { header: 'Revenue', render: (i) => formatCurrency(i.revenue) },
              { header: 'Profit', render: (i) => <span className="font-bold text-green-600">{formatCurrency(i.profit)}</span> }
            ]}
            data={data}
         />
       </Card>
    </div>
  )};

  const hasActiveReportData = !!reportData && loadedTab === activeTab;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Insights and performance reports.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
          <Calendar size={16} className="text-slate-400" />
          {activeDateLabel}
          <span className="text-slate-300">|</span>
          <span className="font-medium text-slate-500">{dateRange.from} to {dateRange.to}</span>
        </div>
      </div>

      <Card className="overflow-visible p-0">
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="flex flex-wrap gap-2">
              {datePresetOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setQuickDate(option.id)}
                  className={`h-[38px] rounded-xl border px-3 text-sm font-semibold transition-colors ${
                    datePreset === option.id
                      ? 'border-blue-200 bg-blue-600 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center xl:ml-auto">
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => handleCustomDateChange('from', e.target.value)}
                className="h-[38px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="hidden text-sm text-slate-400 sm:inline">to</span>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => handleCustomDateChange('to', e.target.value)}
                className="h-[38px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {activeTab === 'topSelling' && (
            <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 xl:flex-row xl:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Product Performance</p>
                <p className="mt-1 text-sm text-slate-500">Rank products by revenue, quantity, or profit.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:ml-auto xl:w-[620px]">
                <select
                  value={productFilters.rankBy}
                  onChange={(e) => handleProductFilterChange('rankBy', e.target.value)}
                  className="h-[38px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {productRankOptions.map((option) => (
                    <option key={option.value} value={option.value}>Rank: {option.label}</option>
                  ))}
                </select>
                <select
                  value={productFilters.itemType}
                  onChange={(e) => handleProductFilterChange('itemType', e.target.value)}
                  className="h-[38px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {productTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <select
                  value={productFilters.limit}
                  onChange={(e) => handleProductFilterChange('limit', e.target.value)}
                  className="h-[38px] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {productLimitOptions.map((limit) => (
                    <option key={limit} value={limit}>Top {limit}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {[
          { id: 'sales', label: 'Sales Summary', icon: TrendingUp },
          { id: 'profit', label: 'Profit Analysis', icon: DollarSign },
          { id: 'topSelling', label: 'Product Performance', icon: BarChart3 },
          { id: 'topCustomers', label: 'Top Customers', icon: Users },
          { id: 'topSuppliers', label: 'Top Suppliers', icon: Truck },
          { id: 'lowStock', label: 'Low Stock', icon: AlertCircle },
          { id: 'creditDue', label: 'Credit Due', icon: FileText },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-all text-sm ${
              activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[500px]">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <LoadingSpinner size="lg" text="Analyzing data..." />
          </div>
        ) : !hasActiveReportData && !loading ? (
           <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-300">
              <PieIcon size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-600">Loading Report</h3>
              <p className="text-slate-400">Choose a report type or date range to refresh the data.</p>
           </div>
        ) : (
          <div className="space-y-6">
             <div className="flex justify-end gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={exportChartAsImage}>
                   <PieIcon size={16} className="mr-2" /> Save Chart
                </Button>
                <Button variant="outline" size="sm" onClick={exportToPDF}>
                   <Download size={16} className="mr-2" /> Download PDF
                </Button>
             </div>

             <div ref={reportRef} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-8 border-b border-slate-100 pb-4 flex justify-between items-end">
                   <div>
                      <h2 className="text-2xl font-bold text-slate-800 capitalize">{activeTab.replace(/([A-Z])/g, ' $1').trim()} Report</h2>
                      <p className="text-sm text-slate-500 mt-1">
                        Period: {dateRange.from} — {dateRange.to}
                      </p>
                   </div>
                   <div className="text-right">
                      <p className="text-xs text-slate-400">Generated: {new Date().toLocaleString()}</p>
                   </div>
                </div>

                {activeTab === 'sales' && hasActiveReportData && <SalesReport data={reportData} trendData={salesTrend} />}
                
                {activeTab === 'topSelling' && hasActiveReportData && (
                   <div className="space-y-6">
                      <Card className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart layout="vertical" data={reportData.slice(0, productFilters.limit)} margin={{ top:5, right:30, left:40, bottom:5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="itemName" type="category" width={150} tick={{fontSize:12}} />
                            <Tooltip formatter={(value) => productFilters.rankBy === 'QUANTITY' ? value : formatCurrency(value)} />
                            <Bar dataKey={productFilters.rankBy === 'QUANTITY' ? 'qtySold' : productFilters.rankBy === 'PROFIT' ? 'profit' : 'revenue'} fill="#8884d8" radius={[0,4,4,0]}>
                              {reportData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </Card>
                      <Card title="Product Performance Details">
                         <Table 
                            columns={[
                               {header:'#', render:(_,i)=>i+1}, 
                               {header:'Item', render:(i)=>(
                                  <div>
                                    <p className="font-semibold text-slate-800">{i.itemName}</p>
                                    <p className="text-xs text-slate-500">{i.itemType || 'UNKNOWN'}</p>
                                  </div>
                               )}, 
                               {header:'Qty Sold', render:(i)=>formatQty(i.qtySold, i.qtyUnit)}, 
                               {header:'Revenue', render:(i)=>formatCurrency(i.revenue)},
                               {header:'Cost', render:(i)=>formatCurrency(i.cost)},
                               {header:'Profit', render:(i)=><span className="font-bold text-green-600">{formatCurrency(i.profit)}</span>},
                               {header:'Margin', render:(i)=>`${Number(i.marginPercent || 0).toFixed(1)}%`}
                            ]} 
                            data={reportData} 
                         />
                      </Card>
                   </div>
                )}
                
                {activeTab === 'profit' && hasActiveReportData && <ProfitReport data={reportData} summary={profitSummary} />}
                
                {activeTab === 'topCustomers' && hasActiveReportData && (
                  <Card title="Loyal Customers">
                    <Table columns={[{header:'Rank', render:(_,i)=>i+1}, {header:'Name', accessor:'customerName'}, {header:'Phone', accessor:'phone'}, {header:'Orders', accessor:'orderCount'}, {header:'Spent', render:(i)=><span className="font-bold text-blue-600">{formatCurrency(i.totalSpent)}</span>}]} data={reportData} />
                  </Card>
                )}

                {activeTab === 'topSuppliers' && hasActiveReportData && (
                  <Card title="Top Suppliers">
                    <Table columns={[{header:'Rank', render:(_,i)=>i+1}, {header:'Name', accessor:'supplierName'}, {header:'Phone', accessor:'contactNo'}, {header:'Purchases', accessor:'purchaseCount'}, {header:'Paid', render:(i)=><span className="font-bold text-red-600">{formatCurrency(i.totalPurchased)}</span>}]} data={reportData} />
                  </Card>
                )}

                {activeTab === 'creditDue' && hasActiveReportData && (
                  <Card title="Credit Due List">
                    {/* 🚀 API එකෙන් phone එවන්නේ නැති නිසා Table එකෙන් අයින් කළා */}
                    <Table columns={[
                        {header:'Customer', accessor:'customerName'}, 
                        {header:'Due Amount', render:(i)=><span className="text-red-600 font-bold">{formatCurrency(i.dueAmount)}</span>}
                    ]} data={reportData} />
                  </Card>
                )}

                {activeTab === 'lowStock' && hasActiveReportData && (
                   <Card title="Low Stock Alerts">
                     {/* 🚀 API එකෙන් එවන totalQty දැම්මා */}
                     <Table columns={[
                         {header:'Item', accessor:'itemName'}, 
                         {header:'Stock', render:(i)=><span className="text-red-600 font-bold">{i.totalQty}</span>}, 
                         {header:'Reorder Level', accessor:'reorderLevel'}, 
                         {header:'Status', render:()=><span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">LOW</span>}
                     ]} data={reportData} />
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
