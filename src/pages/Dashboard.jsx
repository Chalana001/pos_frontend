import React, { lazy, Suspense, useCallback, useEffect, useState } from "react";
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
import { useAnimationLevel } from "../hooks/useAnimationLevel";
import { ANIMATION_LEVELS } from "../utils/animationPreferences";

const SalesOverviewChart = lazy(() => import("../components/dashboard/SalesOverviewChart"));

const getChartDateRange = () => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const to = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split("T")[0];
  const from = new Date(firstDay.getTime() - (firstDay.getTimezoneOffset() * 60000)).toISOString().split("T")[0];
  return { from, to };
};

const useCountUp = (value, enabled, duration = 950) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const target = Number(value || 0);
    if (!Number.isFinite(target)) {
      setDisplayValue(0);
      return undefined;
    }

    if (!enabled) {
      setDisplayValue(target);
      return undefined;
    }

    let frameId;
    const startTime = performance.now();
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const tick = (now) => {
      const progress = Math.min(1, (now - startTime) / duration);
      setDisplayValue(target * easeOutCubic(progress));

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        setDisplayValue(target);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [value, enabled, duration]);

  return displayValue;
};

const AnimatedValue = ({ value, type = "number", enabled = false }) => {
  const animated = useCountUp(value, enabled);

  if (type === "currency") {
    return formatCurrency(animated);
  }

  return Math.round(animated).toLocaleString("en-LK");
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();
  const [animationLevel] = useAnimationLevel();
  const highMotion = animationLevel === ANIMATION_LEVELS.HIGH;

  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState(null);
  
  const [chartData, setChartData] = useState([]);
  const [chartMode, setChartMode] = useState("daily"); 
  const [chartLoading, setChartLoading] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  const branchId = canAccessAllBranches(user?.role) ? selectedBranchId : user?.branchId;

  useEffect(() => {
    if (branchId === null || branchId === undefined) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setChartReady(false);
    setChartMode("daily");

    const loadDashboard = async () => {
      try {
        const { from, to } = getChartDateRange();
        const [kpiRes, chartRes] = await Promise.all([
          dashboardAPI.getKPIs(branchId),
          dashboardAPI.getDailyChart({ branchId, from, to }),
        ]);
        if (!active) return;
        setKpis(kpiRes.data);
        setChartData(chartRes.data);
      } catch (error) {
        if (!active) return;
        console.error("Failed to fetch dashboard data:", error);
        setKpis(null);
        setChartData([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDashboard();
    return () => {
      active = false;
    };
  }, [branchId]);

  useEffect(() => {
    if (loading) return undefined;
    const schedule = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 120));
    const cancel = window.cancelIdleCallback || window.clearTimeout;
    const handle = schedule(() => setChartReady(true), { timeout: 500 });
    return () => cancel(handle);
  }, [loading]);

  const selectChartMode = useCallback(async (mode) => {
    if (mode === chartMode || branchId === null || branchId === undefined) return;
    setChartMode(mode);
    setChartLoading(true);
    try {
      const { from, to } = getChartDateRange();
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
  }, [branchId, chartMode]);

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
        <Card className="page-section-enter shell-panel-hover" style={{ animationDelay: "120ms" }}>
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ Please select a branch to view dashboard KPIs.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const stats = [
    { title: "Today's Sales", value: kpis?.todaySales || 0, type: "currency", icon: DollarSign, color: "bg-blue-500", change: "+12.5%" },
    { title: "Cash Sales", value: kpis?.cashSales || 0, type: "currency", icon: TrendingUp, color: "bg-green-500" },
    { title: "Credit Sales", value: kpis?.creditSales || 0, type: "currency", icon: CreditCard, color: "bg-orange-500" },
    { title: "Total Orders", value: kpis?.todayOrders || 0, type: "number", icon: ShoppingCart, color: "bg-purple-500" },
    { title: "Expenses", value: kpis?.todayExpenses || 0, type: "currency", icon: TrendingDown, color: "bg-red-500" },
    { title: "Cash Drops", value: kpis?.todayCashDrops || 0, type: "currency", icon: Package, color: "bg-indigo-500" },
    { title: "Low Stock Items", value: kpis?.lowStockCount || 0, type: "number", icon: AlertTriangle, color: "bg-yellow-500", path: "/stock?status=REORDER" },
    { title: "Credit Due", value: kpis?.totalDue || 0, type: "currency", icon: Users, color: "bg-pink-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="dashboard-rise-in flex items-center justify-between" style={{ animationDelay: "40ms" }}>
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
            <div
              key={stat.title}
              className="dashboard-card-in"
              style={{ animationDelay: `${120 + index * 70}ms` }}
            >
              <Card className="dashboard-premium-card dashboard-soft-glow shell-panel-hover">
                <button
                  type="button"
                  onClick={() => stat.path && navigate(stat.path)}
                  className={`w-full text-left ${stat.path ? "cursor-pointer" : "cursor-default"}`}
                >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold text-slate-800 tabular-nums">
                      <AnimatedValue value={stat.value} type={stat.type} enabled={highMotion} />
                    </p>
                    {stat.change && <p className="text-sm text-green-600 mt-1">{stat.change}</p>}
                  </div>
                  <div
                    className={`${stat.color} dashboard-icon-pop w-12 h-12 rounded-xl flex items-center justify-center shadow-sm`}
                    style={{ animationDelay: `${260 + index * 70}ms` }}
                  >
                    <Icon className="text-white" size={24} />
                  </div>
                </div>
                </button>
              </Card>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="dashboard-card-in lg:col-span-2" style={{ animationDelay: "760ms" }}>
          <Card className="dashboard-premium-card shell-panel-hover">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800">Sales Overview</h2>
              
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => selectChartMode("daily")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    chartMode === "daily" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => selectChartMode("monthly")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    chartMode === "monthly" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            <div className="dashboard-chart-in h-[300px] w-full relative" style={{ animationDelay: "920ms" }}>
              {chartLoading && (
                <div className="absolute inset-0 z-10 bg-white/60 flex items-center justify-center rounded-lg">
                   <LoadingSpinner size="sm" />
                </div>
              )}
              
              {chartReady && chartData && chartData.length > 0 ? (
                <Suspense fallback={<div className="h-full rounded-lg bg-slate-50" />}>
                  <SalesOverviewChart data={chartData} chartMode={chartMode} animate={highMotion} />
                </Suspense>
              ) : (
                !chartLoading && chartReady && (
                  <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                    No data available for this period.
                  </div>
                )
              )}
            </div>
          </Card>
        </div>

        <div className="dashboard-card-in lg:col-span-1" style={{ animationDelay: "860ms" }}>
          <Card title="Quick Actions" className="h-full dashboard-premium-card shell-panel-hover">
            <div className="grid grid-cols-2 gap-4 mt-2">
              <button
                onClick={() => navigate("/pos")}
                className="dashboard-rise-in p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all text-left group hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-100"
                style={{ animationDelay: "960ms" }}
              >
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                  <ShoppingCart className="text-blue-600" size={20} />
                </div>
                <p className="font-semibold text-slate-800 text-sm">New Sale</p>
              </button>
              
              <button
                onClick={() => navigate("/stock")}
                className="dashboard-rise-in p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-all text-left group hover:-translate-y-1 hover:shadow-lg hover:shadow-green-100"
                style={{ animationDelay: "1040ms" }}
              >
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                  <Package className="text-green-600" size={20} />
                </div>
                <p className="font-semibold text-slate-800 text-sm">Stock Adjust</p>
              </button>
              
              <button
                onClick={() => navigate("/customers?add=1")}
                className="dashboard-rise-in p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition-all text-left group hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-100"
                style={{ animationDelay: "1120ms" }}
              >
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                  <Users className="text-purple-600" size={20} />
                </div>
                <p className="font-semibold text-slate-800 text-sm">Add User</p>
              </button>
              
              <button
                onClick={() => navigate("/reports")}
                className="dashboard-rise-in p-4 bg-orange-50 hover:bg-orange-100 rounded-xl transition-all text-left group hover:-translate-y-1 hover:shadow-lg hover:shadow-orange-100"
                style={{ animationDelay: "1200ms" }}
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
