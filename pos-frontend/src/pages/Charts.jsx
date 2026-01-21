import React, { useEffect, useMemo, useState } from "react";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { reportsAPI } from "../api/reports.api";
import { useBranch } from "../context/BranchContext";
import { formatCurrency } from "../utils/formatters";
import { chartTheme } from "../utils/chartTheme";


import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar
} from "recharts";

const Analytics = () => {
  const { selectedBranchId } = useBranch();

  const [loading, setLoading] = useState(false);

  const [timeframe, setTimeframe] = useState("7D"); // TODAY / 7D / 30D / CUSTOM
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 6)).toISOString().split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });

  const [salesSummary, setSalesSummary] = useState(null);
  const [topSelling, setTopSelling] = useState([]);
  const [profitItems, setProfitItems] = useState([]);
  const [trend, setTrend] = useState([]); // requires new endpoint

  const computedRange = useMemo(() => {
    const today = new Date();
    if (timeframe === "TODAY") {
      const d = today.toISOString().split("T")[0];
      return { from: d, to: d };
    }
    if (timeframe === "7D") {
      const from = new Date(today);
      from.setDate(today.getDate() - 6);
      return {
        from: from.toISOString().split("T")[0],
        to: today.toISOString().split("T")[0],
      };
    }
    if (timeframe === "30D") {
      const from = new Date(today);
      from.setDate(today.getDate() - 29);
      return {
        from: from.toISOString().split("T")[0],
        to: today.toISOString().split("T")[0],
      };
    }
    return dateRange;
  }, [timeframe, dateRange]);

  const params = useMemo(() => {
    const fromIso = new Date(computedRange.from + "T00:00:00").toISOString();
    const toIso = new Date(computedRange.to + "T23:59:59").toISOString();
    return { branchId: Number(selectedBranchId ?? 0), from: fromIso, to: toIso };
  }, [computedRange, selectedBranchId]);

  useEffect(() => {
    const load = async () => {
      // allow branchId=0
      if (params.branchId === null || params.branchId === undefined) return;

      setLoading(true);
      try {
        const [salesRes, topRes, profitRes] = await Promise.all([
          reportsAPI.salesSummary(params),
          reportsAPI.topSelling({ ...params, limit: 10 }),
          reportsAPI.profit({ ...params, limit: 10 }),
          // reportsAPI.salesTrend(params)  // ✅ add later
        ]);

        setSalesSummary(salesRes.data);
        setTopSelling(topRes.data || []);
        setProfitItems(profitRes.data || []);

        // if trend endpoint exists:
        // setTrend(trendRes.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [params]);

  const paymentData = useMemo(() => {
    if (!salesSummary) return [];
    return [
      { name: "Cash", value: salesSummary.cashSales || 0 },
      { name: "Credit", value: salesSummary.creditSales || 0 },
    ];
  }, [salesSummary]);

  if (loading && !salesSummary) {
    return (
      <Card>
        <div className="py-12">
          <LoadingSpinner size="lg" text="Loading analytics..." />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-bold text-slate-800">Analytics</h1>

        <div className="flex gap-2 flex-wrap">
          <select
            className="input"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
          >
            <option value="TODAY">Today</option>
            <option value="7D">Last 7 Days</option>
            <option value="30D">Last 30 Days</option>
            <option value="CUSTOM">Custom</option>
          </select>

          {timeframe === "CUSTOM" && (
            <>
              <input
                type="date"
                className="input"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              />
              <input
                type="date"
                className="input"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              />
            </>
          )}

          <Button variant="secondary" onClick={() => window.location.reload()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {salesSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <p className="text-sm text-slate-600">Total Sales</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(salesSummary.totalSales)}</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-600">Cash</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(salesSummary.cashSales)}</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-600">Credit</p>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(salesSummary.creditSales)}</p>
          </Card>
          <Card>
            <p className="text-sm text-slate-600">Orders</p>
            <p className="text-2xl font-bold text-slate-800">{salesSummary.totalOrders}</p>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment split */}
        <Card>
          <h3 className="font-bold text-slate-800 mb-4">Payment Split</h3>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={paymentData} dataKey="value" nameKey="name" outerRadius={110} label />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top Selling */}
        <Card>
          <h3 className="font-bold text-slate-800 mb-4">Top Selling Items</h3>
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={topSelling}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="itemName" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="qtySold" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;