// src/components/reports/CashFlowReportView.jsx
//
// Cash flow: inflow/outflow headline figures, a daily movement chart, the
// movement breakdown, and a daily reconciliation table.
//
// Lifted out of the Reports render body; it only ever needed the report payload.

import { DollarSign, FileText, TrendingDown, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import Card from "../common/Card";
import Table from "../common/Table";
import { formatCurrency, shortCurrency } from "../../utils/formatters";
import { MONEY, axisProps, gridProps, tooltipProps, LINE_WIDTH } from "../../utils/chartTheme";
import { ChartEmptyState, PremiumChartCard, SummaryMetric } from "./ReportPrimitives";

const netTone = (value) => (Number(value || 0) < 0 ? "text-red-700" : "text-slate-900");

export default function CashFlowReportView({ data: reportData }) {
  const data = reportData || {};
  const daily = Array.isArray(data.dailyMovements) ? data.dailyMovements : [];
  const visibleDaily = daily.slice(-100);
  const movementBreakdown = [
    { name: "Cash sales", value: Number(data.cashSales || 0), type: "inflow" },
    { name: "Credit collections", value: Number(data.creditCollections || 0), type: "inflow" },
    { name: "Expenses", value: Number(data.expenses || 0), type: "outflow" },
    { name: "Purchase payments", value: Number(data.purchasePayments || 0), type: "outflow" },
    { name: "Supplier payments", value: Number(data.supplierPayments || 0), type: "outflow" },
    { name: "Cash refunds", value: Number(data.cashRefunds || 0), type: "outflow" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* Inflows and outflows are both normal business activity — neither is a
            "good" or "critical" state, so the chips stay neutral. Only a negative
            net movement is a condition worth flagging. */}
        <SummaryMetric title="Cash Inflows" value={data.totalInflows || 0} helper="Sales and credit collections" icon={TrendingUp} accent="neutral" />
        <SummaryMetric title="Cash Outflows" value={data.totalOutflows || 0} helper="Operating cash payments" icon={TrendingDown} accent="neutral" />
        <SummaryMetric
          title="Net Cash Movement"
          value={data.netCashMovement || 0}
          helper="Inflows less outflows"
          icon={DollarSign}
          accent={Number(data.netCashMovement || 0) < 0 ? "critical" : "accent"}
        />
        <SummaryMetric title="Cash Drops" value={data.cashDrops || 0} helper="Drawer-to-safe transfers, not expenses" icon={FileText} accent="neutral" />
      </div>

      {Array.isArray(data.cashDropsByAccount) && data.cashDropsByAccount.length > 0 && (
        <Card className="admin-panel-card overflow-hidden p-0" title="Cash Drops by Bank Account">
          <Table
            columns={[
              {
                header: "Account",
                render: (row) => (
                  <span className={row.accountName === "Unbanked" ? "italic text-slate-500" : "font-semibold text-slate-800"}>
                    {row.accountName}
                  </span>
                ),
              },
              { header: "Drops", render: (row) => row.dropCount },
              { header: "Amount", render: (row) => <span className="font-bold text-blue-600">{formatCurrency(row.amount)}</span> },
              {
                header: "% of Total",
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(row.percentageOfTotal, 100)}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-600">{row.percentageOfTotal.toFixed(1)}%</span>
                  </div>
                ),
              },
            ]}
            data={data.cashDropsByAccount}
            getRowKey={(row) => row.accountName}
          />
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <PremiumChartCard title="Daily Cash Movement" subtitle="Business cash inflows versus outflows">
          <div className="h-[320px] min-h-[320px] min-w-0">
            {daily.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={daily} margin={{ top: 12, right: 16, left: 4, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="date" {...axisProps} />
                  <YAxis {...axisProps} tickFormatter={shortCurrency} />
                  <Tooltip formatter={(value) => formatCurrency(value)} {...tooltipProps} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  {/* Inflow vs outflow is a polarity, so these wear the semantic
                      money colours rather than categorical slots. */}
                  <Area type="monotone" name="Inflows" dataKey="inflows" stroke={MONEY.positive} fill={MONEY.positive} fillOpacity={0.12} strokeWidth={LINE_WIDTH} />
                  <Area type="monotone" name="Outflows" dataKey="outflows" stroke={MONEY.negative} fill={MONEY.negative} fillOpacity={0.12} strokeWidth={LINE_WIDTH} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmptyState />
            )}
          </div>
        </PremiumChartCard>

        <Card className="admin-panel-card border-slate-200/80 p-5" title="Cash Movement Breakdown">
          <div className="space-y-3">
            {movementBreakdown.map((movement) => (
              <div key={movement.name} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="font-bold text-slate-900">{movement.name}</p>
                  <p className={`text-xs font-semibold ${movement.type === "inflow" ? "text-emerald-700" : "text-red-700"}`}>
                    {movement.type === "inflow" ? "Cash in" : "Cash out"}
                  </p>
                </div>
                <p className="font-black tabular-nums text-slate-900">{formatCurrency(movement.value)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="admin-panel-card overflow-hidden p-0" title="Daily Cash Reconciliation">
        <div className="space-y-3 p-4 md:hidden">
          {visibleDaily.map((row) => (
            <div key={row.date} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="font-bold text-slate-900">{row.date}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-slate-500">In</p>
                  <p className="mt-1 font-bold text-emerald-700">{formatCurrency(row.inflows)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Out</p>
                  <p className="mt-1 font-bold text-red-700">{formatCurrency(row.outflows)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Net</p>
                  <p className={`mt-1 font-black ${netTone(row.netMovement)}`}>{formatCurrency(row.netMovement)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block">
          <Table
            columns={[
              { header: "Date", accessor: "date" },
              { header: "Inflows", render: (row) => <span className="font-bold text-emerald-700">{formatCurrency(row.inflows)}</span> },
              { header: "Outflows", render: (row) => <span className="font-bold text-red-700">{formatCurrency(row.outflows)}</span> },
              { header: "Net Movement", render: (row) => <span className={`font-black ${netTone(row.netMovement)}`}>{formatCurrency(row.netMovement)}</span> },
            ]}
            data={visibleDaily}
          />
        </div>

        {daily.length > visibleDaily.length && (
          <p className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
            Showing the latest 100 active cash-movement days. KPIs and graph include all {daily.length} active days.
          </p>
        )}
      </Card>
    </div>
  );
}
