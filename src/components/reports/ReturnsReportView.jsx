// src/components/reports/ReturnsReportView.jsx
//
// The returns report: KPI row, return trend, top returned items, and reason
// breakdowns for both sale and purchase returns.
//
// Moved out of the Reports render body. It was already fully prop-driven — it
// reads nothing from parent scope — so this is a straight lift.

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import Card from "../common/Card";
import Table from "../common/Table";
import { formatCurrency } from "../../utils/formatters";
import {
  TILE,
  seriesColor,
  axisProps,
  gridProps,
  tooltipProps,
  BAR_RADIUS,
} from "../../utils/chartTheme";
import { StatCard } from "./ReportPrimitives";

const itemColumns = [
  {
    header: "Item",
    render: (i) => (
      <div>
        <p className="font-medium">{i.itemName}</p>
        {i.barcode && <p className="text-xs text-slate-500">{i.barcode}</p>}
      </div>
    ),
  },
  // returnCount is COUNT(DISTINCT return id) per item — the number of return
  // transactions that included this item, NOT units returned. Units are the
  // "Qty returned" column.
  { header: "Return txns", render: (i) => <span className="font-semibold text-slate-900">{i.returnCount}×</span> },
  { header: "Qty returned", accessor: "totalReturnedQty" },
  { header: "Amount", render: (i) => <span className="font-bold">{formatCurrency(i.totalReturnAmount)}</span> },
];

export default function ReturnsReportView({ data }) {
  const { summary, topSaleItems, topPurchaseItems, reasons, trend } = data;

  const saleReasons = reasons.filter((r) => r.type === "SALE");
  const purchaseReasons = reasons.filter((r) => r.type === "PURCHASE");

  const saleReasonPieData = saleReasons.slice(0, 6).map((r, i) => ({
    name: r.reason.length > 30 ? `${r.reason.substring(0, 30)}…` : r.reason,
    value: Number(r.count),
    fill: seriesColor(i),
  }));

  const trendChartData = trend.map((t) => ({
    label: t.label,
    "Sale Returns": Number(t.saleReturns || 0),
    "Purchase Returns": Number(t.purchaseReturns || 0),
  }));

  return (
    <div className="space-y-6">
      {summary ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Sale Returns" value={summary.saleReturnCount} sub={`${formatCurrency(summary.saleReturnTotal)} total`} />
          <StatCard label="Items Returned (Sale)" value={summary.saleReturnItemCount} />
          <StatCard label="Purchase Returns" value={summary.purchaseReturnCount} sub={`${formatCurrency(summary.purchaseReturnTotal)} total`} />
          <StatCard label="Items Returned (Purchase)" value={summary.purchaseReturnItemCount} />
          <StatCard label="Net Revenue" value={formatCurrency(summary.netRevenue)} sub={`Gross: ${formatCurrency(summary.grossSales)}`} />
          {/* Returns raised in this period are divided by orders placed in this
              period. A return can belong to an order from an earlier period, so
              this is an activity indicator, not a like-for-like rate — it can
              exceed 100% in a quiet month. */}
          <StatCard
            label="Return Rate"
            value={`${summary.returnRate}%`}
            sub="Returns raised ÷ orders placed, this period"
            color={summary.returnRate > 10 ? TILE.critical.value : TILE.neutral.value}
          />
        </div>
      ) : (
        <div className="flex h-20 items-center justify-center text-slate-500">No data for this period</div>
      )}

      {trend.length > 0 && (
        <Card className="admin-panel-card" title="Return Trend">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={trendChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={(v) => formatCurrency(v)} width={70} />
              <Tooltip formatter={(v) => formatCurrency(v)} {...tooltipProps} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Sale Returns" fill={seriesColor(0)} radius={BAR_RADIUS} />
              <Bar dataKey="Purchase Returns" fill={seriesColor(1)} radius={BAR_RADIUS} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="admin-panel-card" title="Top Returned Items (Sales)">
          {topSaleItems.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No sale returns in this period</p>
          ) : (
            <Table columns={itemColumns} data={topSaleItems} />
          )}
        </Card>

        <Card className="admin-panel-card" title="Top Returned Items (Purchases)">
          {topPurchaseItems.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No purchase returns in this period</p>
          ) : (
            <Table columns={itemColumns} data={topPurchaseItems} />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {saleReasonPieData.length > 0 && (
          <Card className="admin-panel-card" title="Sale Return Reasons">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={saleReasonPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={false}>
                    {saleReasonPieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, name) => [v, name]} {...tooltipProps} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                {saleReasons.map((r, i) => (
                  <div key={r.reason} className="flex items-center justify-between gap-2 text-sm">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: seriesColor(i) }} />
                      <span className="truncate text-slate-700">{r.reason}</span>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <span className="font-semibold text-slate-900">{r.count}</span>
                      <span className="text-xs text-slate-500">{formatCurrency(r.totalAmount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {purchaseReasons.length > 0 && (
          <Card className="admin-panel-card" title="Purchase Return Reasons">
            <Table
              columns={[
                { header: "Reason", render: (r) => <span className="text-sm">{r.reason}</span> },
                // A count is not a status, so it stays in ink.
                { header: "Count", render: (r) => <span className="font-semibold text-slate-900">{r.count}</span> },
                { header: "Total Amount", render: (r) => formatCurrency(r.totalAmount) },
              ]}
              data={purchaseReasons}
            />
          </Card>
        )}
      </div>

      {saleReasons.length === 0 && purchaseReasons.length === 0 && (
        <Card className="admin-panel-card" title="Return Reasons">
          <p className="py-8 text-center text-sm text-slate-500">No return reason data available for this period.</p>
        </Card>
      )}
    </div>
  );
}
