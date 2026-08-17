import React, { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { dashboardAPI } from "../api/dashboard.api";
import { formatCurrency } from "../utils/formatters";
import { tileTone } from "../utils/chartTheme";
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

// "Add User" was the previous label on the third action, but the route it opens
// is the customer list with the add form — it creates a customer, not a user.
const quickActions = [
  { label: "New Sale", path: "/pos", icon: ShoppingCart },
  { label: "Stock Adjust", path: "/stock", icon: Package },
  { label: "Add Customer", path: "/customers?add=1", icon: Users },
  { label: "Reports", path: "/reports", icon: DollarSign },
];

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
          {/* Amber is this app's warning colour everywhere else; yellow was a
              one-off here. */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">
              Please select a branch to view dashboard KPIs.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Eight tiles, eight saturated fills, is the "rainbow" problem the report
  // screens had — see utils/chartTheme.js. A tile's value is ink; colour is
  // reserved for the two figures that mean "needs attention", and one accent
  // leads the row.
  //
  // The Today's Sales tile used to carry a hardcoded change: "+12.5%", rendered
  // in green on every load regardless of the number beside it. DashboardKpiResponse
  // has no comparison field, so no real figure was ever available — it was a
  // placeholder that shipped. Removed rather than faked; see the note in
  // dashboardAPI about what adding a real one would take.
  const stats = [
    { title: "Today's Sales", value: kpis?.todaySales || 0, type: "currency", icon: DollarSign, tone: "accent" },
    { title: "Cash Sales", value: kpis?.cashSales || 0, type: "currency", icon: TrendingUp, tone: "neutral" },
    { title: "Credit Sales", value: kpis?.creditSales || 0, type: "currency", icon: CreditCard, tone: "neutral" },
    { title: "Total Orders", value: kpis?.todayOrders || 0, type: "number", icon: ShoppingCart, tone: "neutral" },
    { title: "Expenses", value: kpis?.todayExpenses || 0, type: "currency", icon: TrendingDown, tone: "neutral" },
    { title: "Cash Drops", value: kpis?.todayCashDrops || 0, type: "currency", icon: Package, tone: "neutral" },
    { title: "Low Stock Items", value: kpis?.lowStockCount || 0, type: "number", icon: AlertTriangle, tone: Number(kpis?.lowStockCount || 0) > 0 ? "warning" : "neutral", path: "/stock?status=REORDER" },
    { title: "Credit Due", value: kpis?.totalDue || 0, type: "currency", icon: Users, tone: Number(kpis?.totalDue || 0) > 0 ? "warning" : "neutral" },
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
                    <p className={`text-2xl font-bold tabular-nums ${tileTone(stat.tone).value}`}>
                      <AnimatedValue value={stat.value} type={stat.type} enabled={highMotion} />
                    </p>
                  </div>
                  <div
                    className={`${tileTone(stat.tone).chip} dashboard-icon-pop w-12 h-12 rounded-xl flex items-center justify-center`}
                    style={{ animationDelay: `${260 + index * 70}ms` }}
                  >
                    <Icon size={22} />
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
                    chartMode === "daily" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Daily
                </button>
                <button
                  onClick={() => selectChartMode("monthly")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    chartMode === "monthly" ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
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
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    No data available for this period.
                  </div>
                )
              )}
            </div>
          </Card>
        </div>

        <div className="dashboard-card-in lg:col-span-1" style={{ animationDelay: "860ms" }}>
          <Card title="Quick Actions" className="h-full dashboard-premium-card shell-panel-hover">
            {/* Four destinations with no ordering between them, so they share one
                surface. The blue icon marks "this is an action" — that is the only
                distinction colour is carrying here. */}
            <div className="grid grid-cols-2 gap-4 mt-2">
              {quickActions.map((action, index) => {
                const ActionIcon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={() => navigate(action.path)}
                    className="dashboard-rise-in group rounded-xl bg-slate-50 p-4 text-left transition-all hover:-translate-y-1 hover:bg-blue-50 hover:shadow-lg hover:shadow-slate-100"
                    style={{ animationDelay: `${960 + index * 80}ms` }}
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm transition-transform group-hover:scale-110">
                      <ActionIcon className="text-blue-600" size={20} />
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{action.label}</p>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
