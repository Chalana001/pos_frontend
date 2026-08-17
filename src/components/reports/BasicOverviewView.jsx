// src/components/reports/BasicOverviewView.jsx
//
// The default /reports screen: owner command centre, action centre, executive
// summary tiles, payment mix, sales trend, and the four snapshot charts.
//
// Last of the sections lifted out of the Reports render body. Purely derived —
// it computes its view model from the payloads it is given and holds no state.

import {
  AlertCircle,
  BarChart3,
  DollarSign,
  FileText,
  Package,
  PieChart as PieIcon,
  RotateCcw,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import Card from "../common/Card";
import { formatCurrency, shortCurrency } from "../../utils/formatters";
import { CHROME, seriesColor, axisProps, gridProps, tooltipProps, LINE_WIDTH } from "../../utils/chartTheme";
import { ChartEmptyState, PremiumChartCard, SummaryMetric, ComparisonMetric } from "./ReportPrimitives";
import { PremiumDonutChart, OverviewBarChart } from "./ReportCharts";

const sum = (rows, read) => rows.reduce((total, row) => total + Number(read(row) || 0), 0);

export default function BasicOverviewView({
  salesSummary,
  basicOverview,
  salesTrend,
  profitSummary,
  ownerSummary,
  datePreset,
  dateRange,
}) {
  if (!salesSummary) return null;

  const categoryData = basicOverview.categories.map((item) => ({
    name: item.categoryName || item.name || "Unknown",
    total: Number(item.totalSales || item.total || item.sales || 0),
  }));
  const productData = basicOverview.products.map((item) => ({
    name: item.itemName,
    revenue: Number(item.revenue || 0),
  }));
  const customerData = basicOverview.customers.map((item) => ({
    name: item.customerName,
    totalSpent: Number(item.totalSpent || 0),
  }));
  const supplierData = basicOverview.suppliers.map((item) => ({
    name: item.supplierName,
    totalPurchased: Number(item.totalPurchased || 0),
  }));

  const totalCreditDue = sum(basicOverview.creditDue, (item) => item.dueAmount);
  const topProductRevenue = productData[0]?.revenue || 0;
  const topCustomerSpend = customerData[0]?.totalSpent || 0;
  const topSupplierPurchased = supplierData[0]?.totalPurchased || 0;
  const averageOrder =
    Number(salesSummary.totalOrders || 0) > 0
      ? Number(salesSummary.totalSales || 0) / Number(salesSummary.totalOrders || 1)
      : 0;

  const paymentData = [
    { name: "Cash", value: Number(salesSummary.cashSales || 0) },
    { name: "Credit", value: Number(salesSummary.creditSales || 0) },
  ];
  const paymentTotal = sum(paymentData, (item) => item.value);
  const hasPaymentData = paymentData.some((item) => item.value > 0);

  const categoryChartData = categoryData
    .map((item) => ({ name: item.name, value: item.total }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
  const categoryTotal = sum(categoryData, (item) => item.total);
  const hasCategoryData = categoryChartData.some((item) => item.value > 0);

  const trendTotal = sum(salesTrend.data, (item) => item.sales);
  const trendPeak = salesTrend.data.reduce(
    (peak, item) => (Number(item.sales || 0) > Number(peak.sales || 0) ? item : peak),
    { date: "-", sales: 0 }
  );
  const trendAverage = salesTrend.data.length > 0 ? trendTotal / salesTrend.data.length : 0;

  const risks = ownerSummary?.risks;

  return (
    <div className="space-y-6">
      {ownerSummary && (
        <Card className="admin-panel-card dashboard-premium-card surface-inverted overflow-hidden p-5 text-white shadow-[0_20px_60px_rgb(15_23_42/0.18)]">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">Owner Command Center</p>
              <h2 className="mt-1 text-xl font-black">Current period versus previous period</h2>
            </div>
            <p className="text-xs font-semibold text-slate-300">
              Compared to {ownerSummary.comparisonPeriod.from} — {ownerSummary.comparisonPeriod.to}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {/* Every tile here already shows a ±% delta that is green when up and
                red when down. Colouring the icon chip as well would encode the same
                thing twice, in a second vocabulary — so the chips stay neutral. */}
            <ComparisonMetric title="Sales Growth" current={ownerSummary.current.totalSales} previous={ownerSummary.comparison.totalSales} icon={TrendingUp} accent="accent" />
            <ComparisonMetric title="Net Profit" current={ownerSummary.current.netProfit} previous={ownerSummary.comparison.netProfit} icon={DollarSign} accent="neutral" />
            <ComparisonMetric title="Average Order" current={ownerSummary.current.averageOrderValue} previous={ownerSummary.comparison.averageOrderValue} icon={ShoppingCart} accent="neutral" />
            <ComparisonMetric title="Expenses" current={ownerSummary.current.totalExpenses} previous={ownerSummary.comparison.totalExpenses} icon={AlertCircle} accent="neutral" />
            <ComparisonMetric title="Orders" current={ownerSummary.current.totalOrders} previous={ownerSummary.comparison.totalOrders} icon={ShoppingCart} accent="neutral" format={(value) => Number(value || 0).toLocaleString()} />
            <ComparisonMetric title="Gross Margin" current={ownerSummary.current.grossMarginPercent} previous={ownerSummary.comparison.grossMarginPercent} icon={BarChart3} accent="neutral" format={(value) => `${Number(value || 0).toFixed(1)}%`} />
            <ComparisonMetric title="Cash Sales" current={ownerSummary.current.cashSales} previous={ownerSummary.comparison.cashSales} icon={DollarSign} accent="neutral" />
            <ComparisonMetric title="Credit Sales" current={ownerSummary.current.creditSales} previous={ownerSummary.comparison.creditSales} icon={FileText} accent="neutral" />
          </div>
        </Card>
      )}

      {risks && (
        <Card className="admin-panel-card border-slate-200/80 p-5 shadow-[0_12px_36px_rgb(15_23_42/0.06)]">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Action Center</p>
              <h2 className="mt-1 text-lg font-black text-slate-900">What needs attention now</h2>
            </div>
            <p className="text-xs font-semibold text-slate-500">
              Inventory is current; credit is outstanding balance; returns use selected period.
            </p>
          </div>
          {/* These four surfaces DO change with state — that is the point of an
              action centre, so the conditional red/amber stays. */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className={`rounded-xl border p-4 ${risks.outOfStockItems > 0 ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-slate-900">Stock attention</p>
                <Package className={risks.outOfStockItems > 0 ? "text-red-700" : "text-emerald-700"} size={20} />
              </div>
              <p className="mt-3 text-2xl font-black tabular-nums text-slate-900">{risks.lowStockItems}</p>
              <p className="mt-1 text-xs font-semibold text-slate-600">{risks.outOfStockItems} out of stock</p>
            </div>

            <div className={`rounded-xl border p-4 ${risks.overdue91Plus > 0 ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-slate-900">Overdue 90+ days</p>
                <Users className="text-amber-700" size={20} />
              </div>
              <p className="mt-3 text-2xl font-black tabular-nums text-slate-900">{formatCurrency(risks.overdue91Plus)}</p>
              <p className="mt-1 text-xs font-semibold text-slate-600">{risks.overdueCustomerCount} customers require collection</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-slate-900">Total receivables</p>
                <FileText className="text-slate-600" size={20} />
              </div>
              <p className="mt-3 text-2xl font-black tabular-nums text-slate-900">{formatCurrency(risks.totalReceivables)}</p>
              <p className="mt-1 text-xs font-semibold text-slate-600">Outstanding across selected branch scope</p>
            </div>

            <div className={`rounded-xl border p-4 ${risks.saleReturnRatePercent > 3 ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-slate-900">Sales returns</p>
                <RotateCcw className={risks.saleReturnRatePercent > 3 ? "text-red-700" : "text-slate-600"} size={20} />
              </div>
              <p className="mt-3 text-2xl font-black tabular-nums text-slate-900">{formatCurrency(risks.saleReturnAmount)}</p>
              <p className="mt-1 text-xs font-semibold text-slate-600">
                {Number(risks.saleReturnRatePercent || 0).toFixed(1)}% of orders returned
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="admin-panel-card dashboard-premium-card overflow-hidden border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_rgb(15_23_42/0.07)]">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Executive Summary</p>
            <h2 className="mt-1 text-xl font-black text-slate-900">Sales, profit and alerts in one view</h2>
          </div>
          <p className="text-sm font-medium text-slate-500">
            {datePreset === "allTime" ? "All records" : `${dateRange.from} to ${dateRange.to}`}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {/* One accent tile leads the row; the rest are neutral. Amber is reserved
              for the two tiles that actually mean "needs attention" — money owed
              and stock below reorder. */}
          <SummaryMetric title="Total Sales" value={salesSummary.totalSales || 0} helper={`${salesSummary.totalOrders || 0} orders`} icon={TrendingUp} accent="accent" />
          <SummaryMetric title="Net Profit" value={profitSummary?.netProfit || 0} helper={`Gross ${formatCurrency(profitSummary?.grossProfit || 0)}`} icon={DollarSign} accent="neutral" />
          <SummaryMetric title="Average Order" value={averageOrder} helper="Sales per invoice" icon={ShoppingCart} accent="neutral" />
          <SummaryMetric title="Credit Due" value={totalCreditDue} helper={`${basicOverview.creditDue.length} customers`} icon={FileText} accent="warning" />
          <SummaryMetric title="Cash Sales" value={salesSummary.cashSales || 0} helper="Paid at sale" icon={DollarSign} accent="neutral" />
          <SummaryMetric title="Credit Sales" value={salesSummary.creditSales || 0} helper="Credit invoices" icon={FileText} accent="neutral" />
          <SummaryMetric title="Expenses" value={profitSummary?.totalExpenses || 0} helper="For selected range" icon={AlertCircle} accent="neutral" />
          <SummaryMetric title="Low Stock" value={basicOverview.lowStock.length} helper="Items below reorder" icon={AlertCircle} accent="warning" format={(value) => value} />
          <SummaryMetric title="Top Product Revenue" value={topProductRevenue} helper={productData[0]?.name || "No product data"} icon={BarChart3} accent="neutral" />
          <SummaryMetric title="Top Customer Spend" value={topCustomerSpend} helper={customerData[0]?.name || "No customer data"} icon={Users} accent="neutral" />
          <SummaryMetric title="Top Supplier Purchases" value={topSupplierPurchased} helper={supplierData[0]?.name || "No supplier data"} icon={Truck} accent="neutral" />
          <SummaryMetric title="Categories Selling" value={categoryData.length} helper="Categories with sales" icon={PieIcon} accent="neutral" format={(value) => value} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PremiumChartCard title="Payment Mix" subtitle="Cash sales vs credit sales">
          {!hasPaymentData ? (
            <div className="h-[300px]">
              <ChartEmptyState />
            </div>
          ) : (
            <PremiumDonutChart data={paymentData} total={paymentTotal} valueLabel="Payments" gradientPrefix="payment-mix" />
          )}
        </PremiumChartCard>

        <PremiumChartCard
          title={`Sales Trend (${salesTrend.type === "MONTHLY" ? "Monthly" : "Daily"})`}
          subtitle="Revenue movement for selected period"
        >
          <div className="grid min-h-[300px] grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
            {salesTrend.data.length === 0 ? (
              <ChartEmptyState />
            ) : (
              <>
                <div className="min-h-[280px] rounded-2xl bg-slate-50/60 p-3">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 600, height: 320 }}>
                    <AreaChart data={salesTrend.data} margin={{ top: 12, right: 12, left: -8, bottom: 0 }}>
                      <defs>
                        {/* Single hue, fading to transparent. This was previously
                            blue → cyan → green, a rainbow ramp for a magnitude fill. */}
                        <linearGradient id="basicSalesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={seriesColor(0)} stopOpacity={0.28} />
                          <stop offset="100%" stopColor={seriesColor(0)} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="date" {...axisProps} />
                      <YAxis {...axisProps} tickFormatter={shortCurrency} />
                      <Tooltip formatter={(value) => [formatCurrency(value), "Sales"]} {...tooltipProps} />
                      <Area
                        type="monotone"
                        dataKey="sales"
                        stroke={seriesColor(0)}
                        strokeWidth={LINE_WIDTH}
                        fill="url(#basicSalesGradient)"
                        activeDot={{ r: 4, strokeWidth: 2, stroke: CHROME.surface, fill: seriesColor(0) }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex flex-col justify-center gap-3">
                  {[
                    ["Trend Total", formatCurrency(trendTotal), null],
                    ["Peak Point", formatCurrency(trendPeak.sales), trendPeak.date],
                    ["Average", formatCurrency(trendAverage), null],
                  ].map(([label, value, sub]) => (
                    <div key={label} className="rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
                      <p className="mt-2 text-lg font-black tabular-nums text-slate-900">{value}</p>
                      {sub && <p className="mt-1 truncate text-xs font-semibold text-slate-500">{sub}</p>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </PremiumChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <OverviewBarChart title="Product Revenue Snapshot" subtitle="Highest earning items" data={productData} nameKey="name" valueKey="revenue" />
        <OverviewBarChart title="Customer Spend Snapshot" subtitle="Highest value customers" data={customerData} nameKey="name" valueKey="totalSpent" />
        <OverviewBarChart title="Supplier Purchase Snapshot" subtitle="Largest supplier purchase totals" data={supplierData} nameKey="name" valueKey="totalPurchased" />
        <PremiumChartCard title="Category Sales Snapshot" subtitle="Revenue distribution by category">
          {!hasCategoryData ? (
            <div className="h-[300px]">
              <ChartEmptyState />
            </div>
          ) : (
            <PremiumDonutChart data={categoryChartData} total={categoryTotal} valueLabel="Top categories" gradientPrefix="category-sales" />
          )}
        </PremiumChartCard>
      </div>
    </div>
  );
}
