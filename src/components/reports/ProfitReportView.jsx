// src/components/reports/ProfitReportView.jsx
//
// Per-item profit report: headline figures, a revenue-vs-profit line chart, and
// the detail table. Lifted out of the Reports render body.

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import Card from "../common/Card";
import Table from "../common/Table";
import { formatCurrency, shortCurrency } from "../../utils/formatters";
import {
  TILE,
  seriesColor,
  axisProps,
  gridProps,
  tooltipProps,
  LINE_WIDTH,
} from "../../utils/chartTheme";

// Three measures of the same thing do not need three tinted surfaces. The
// figures carry direction where it exists: expenses are shown as a deduction,
// and a negative net profit turns red.
const HeadlineFigure = ({ label, value, tone = TILE.neutral.value, prefix = "" }) => (
  <Card className="admin-kpi-card border-slate-200 bg-white">
    <h3 className="text-xs font-bold uppercase text-slate-500">{label}</h3>
    <p className={`text-2xl font-bold tabular-nums ${tone}`}>
      {prefix}
      {formatCurrency(value)}
    </p>
  </Card>
);

export default function ProfitReportView({ profitSummary, reportData }) {
  const rows = Array.isArray(reportData) ? reportData : [];
  const netProfit = Number(profitSummary?.netProfit || 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <HeadlineFigure label="Gross Profit" value={profitSummary?.grossProfit || 0} />
        <HeadlineFigure label="Expenses" value={profitSummary?.totalExpenses || 0} prefix="- " />
        <HeadlineFigure
          label="Net Profit"
          value={netProfit}
          tone={netProfit < 0 ? TILE.critical.value : TILE.neutral.value}
        />
      </div>

      <Card className="admin-panel-card" title="Profit Trend by Item">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 600, height: 320 }}>
            <LineChart data={rows.slice(0, 20)}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="itemName" hide />
              {/* This axis previously carried no shared chrome, so its ticks did
                  not match any other chart in the app. */}
              <YAxis {...axisProps} tickFormatter={shortCurrency} />
              <Tooltip formatter={(value) => formatCurrency(value)} {...tooltipProps} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="revenue" stroke={seriesColor(0)} strokeWidth={LINE_WIDTH} dot={false} name="Revenue" />
              <Line type="monotone" dataKey="profit" stroke={seriesColor(1)} strokeWidth={LINE_WIDTH} dot={false} name="Profit" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="admin-panel-card" title="Profit Details">
        <Table
          columns={[
            {
              header: "Product",
              render: (i) => (
                <div className="flex flex-col">
                  <span className="font-medium">{i.itemName}</span>
                  {i.altName && <span className="text-xs text-slate-500">{i.altName}</span>}
                </div>
              ),
            },
            { header: "Qty Sold", accessor: "qtySold" },
            { header: "Cost", render: (i) => formatCurrency(i.cost) },
            { header: "Revenue", render: (i) => formatCurrency(i.revenue) },
            {
              header: "Profit",
              render: (i) => (
                <span className={`font-bold ${Number(i.profit) < 0 ? TILE.critical.value : "text-slate-900"}`}>
                  {formatCurrency(i.profit)}
                </span>
              ),
            },
          ]}
          data={rows}
        />
      </Card>
    </div>
  );
}
