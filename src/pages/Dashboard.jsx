import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { dashboardAPI } from "../api/dashboard.api";
import { formatCurrency } from "../utils/formatters";
import { canAccessAllBranches } from "../utils/permissions";
import Card from "../components/common/Card";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { useNavigate } from "react-router-dom";

import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  CreditCard,
  Users,
} from "lucide-react";
import { useBranch } from "../context/BranchContext";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();

  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState(null);
  
  const [chartData, setChartData] = useState([]);
  const [chartMode, setChartMode] = useState("daily"); 
  const [chartLoading, setChartLoading] = useState(false);

  // 🚀 හැම තැනටම ලේසියෙන් Dates ගන්න Helper Function එකක් හැදුවා
  const getChartDateRange = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const toStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const fromStr = new Date(firstDay.getTime() - (firstDay.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    
    return { from: fromStr, to: toStr };
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId, user?.role, user?.branchId]);

  useEffect(() => {
    if (selectedBranchId !== null && selectedBranchId !== undefined) {
      fetchChartData(chartMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartMode]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const branchId = canAccessAllBranches(user?.role) ? selectedBranchId : user?.branchId;
      if (branchId === null || branchId === undefined) return;

      const { from, to } = getChartDateRange(); // 🚀 Dates ගත්තා

      const [kpiRes, chartRes] = await Promise.all([
        dashboardAPI.getKPIs(branchId),
        // 🚀 දැන් පේජ් එක ලෝඩ් වෙද්දිම Dates යනවා! 500 Error එක එන්නේ නෑ
        dashboardAPI.getDailyChart({ branchId, from, to }) 
      ]);

      setKpis(kpiRes.data);
      setChartData(chartRes.data);
      setChartMode("daily");
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      setKpis(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async (mode) => {
    setChartLoading(true);
    try {
      const branchId = canAccessAllBranches(user?.role) ? selectedBranchId : user?.branchId;
      const { from, to } = getChartDateRange(); // 🚀 Dates ගත්තා
      
      const params = { branchId, from, to };
      
      const response = mode === "daily" 
        ? await dashboardAPI.getDailyChart(params)
        : await dashboardAPI.getMonthlyChart(params);
        
      setChartData(response.data);
    } catch (error) {
      console.error(`Failed to fetch ${mode} chart data:`, error);
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  if (selectedBranchId === null || selectedBranchId === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
          <div className="text-sm text-slate-500">
            {new Date().toLocaleDateString("en-LK", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </div>
        </div>
        <Card>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ Please select a branch to view dashboard KPIs.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const stats = [
    { title: "Today's Sales", value: formatCurrency(kpis?.todaySales || 0), icon: DollarSign, color: "bg-blue-500", change: "+12.5%" },
    { title: "Cash Sales", value: formatCurrency(kpis?.cashSales || 0), icon: TrendingUp, color: "bg-green-500" },
    { title: "Credit Sales", value: formatCurrency(kpis?.creditSales || 0), icon: CreditCard, color: "bg-orange-500" },
    { title: "Total Orders", value: kpis?.todayOrders || 0, icon: ShoppingCart, color: "bg-purple-500" },
    { title: "Expenses", value: formatCurrency(kpis?.todayExpenses || 0), icon: TrendingDown, color: "bg-red-500" },
    { title: "Cash Drops", value: formatCurrency(kpis?.todayCashDrops || 0), icon: Package, color: "bg-indigo-500" },
    { title: "Low Stock Items", value: kpis?.lowStockCount || 0, icon: AlertTriangle, color: "bg-yellow-500" },
    { title: "Credit Due", value: formatCurrency(kpis?.totalDue || 0), icon: Users, color: "bg-pink-500" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
        <div className="text-sm text-slate-500">
          {new Date().toLocaleDateString("en-LK", {
            weekday: "long", year: "numeric", month: "long", day: "numeric",
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                  {stat.change && <p className="text-sm text-green-600 mt-1">{stat.change}</p>}
                </div>
                <div className={`${stat.color} w-12 h-12 rounded-xl flex items-center justify-center shadow-sm`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800">Sales Overview</h2>
              
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setChartMode("daily")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    chartMode === "daily" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => setChartMode("monthly")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    chartMode === "monthly" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            <div className="h-[300px] w-full relative">
              {chartLoading && (
                <div className="absolute inset-0 z-10 bg-white/60 flex items-center justify-center rounded-lg">
                   <LoadingSpinner size="sm" />
                </div>
              )}
              
              {/* 🚀 Recharts Warning එක නවත්තන්න Data තියෙනවා නම් විතරක් Render කරනවා */}
              {chartData && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSalesDash" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(str) => {
                        if (!str) return "";
                        const d = new Date(str);
                        return chartMode === "monthly" 
                          ? d.toLocaleDateString('en-US', { month: 'short' }) 
                          : `${d.getDate()}/${d.getMonth()+1}`;
                      }} 
                      style={{ fontSize: '12px', fill: '#64748B' }} 
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis 
                      style={{ fontSize: '12px', fill: '#64748B' }} 
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `Rs.${val >= 1000 ? (val/1000)+'k' : val}`}
                    />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      labelFormatter={(label) => {
                        if (!label) return "";
                        const d = new Date(label);
                        return chartMode === "monthly" 
                          ? d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                          : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                      }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorSalesDash)" 
                      activeDot={{ r: 6, strokeWidth: 0, fill: '#2563EB' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                !chartLoading && (
                  <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                    No data available for this period.
                  </div>
                )
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card title="Quick Actions" className="h-full">
            <div className="grid grid-cols-2 gap-4 mt-2">
              <button
                onClick={() => navigate("/pos")}
                className="p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all text-left group"
              >
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                  <ShoppingCart className="text-blue-600" size={20} />
                </div>
                <p className="font-semibold text-slate-800 text-sm">New Sale</p>
              </button>
              
              <button
                onClick={() => navigate("/stock")}
                className="p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-all text-left group"
              >
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                  <Package className="text-green-600" size={20} />
                </div>
                <p className="font-semibold text-slate-800 text-sm">Stock Adjust</p>
              </button>
              
              <button
                onClick={() => navigate("/customers?add=1")}
                className="p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-all text-left group"
              >
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                  <Users className="text-purple-600" size={20} />
                </div>
                <p className="font-semibold text-slate-800 text-sm">Add User</p>
              </button>
              
              <button
                onClick={() => navigate("/reports")}
                className="p-4 bg-orange-50 hover:bg-orange-100 rounded-xl transition-all text-left group"
              >
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                  <DollarSign className="text-orange-600" size={20} />
                </div>
                <p className="font-semibold text-slate-800 text-sm">Reports</p>
              </button>
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;