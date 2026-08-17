// src/components/reports/ProfitAndLossReportView.jsx
//
// P&L: period-over-period headline metrics, the statement itself, and margin /
// data-quality bars. Lifted out of the Reports render body.

import { BarChart3, DollarSign, PieChart as PieIcon, TrendingUp } from "lucide-react";

import Card from "../common/Card";
import { formatCurrency } from "../../utils/formatters";
import { ComparisonMetric } from "./ReportPrimitives";

const EMPHASISED_ROWS = new Set(["Net revenue", "Gross profit", "Net profit"]);

export default function ProfitAndLossReportView({ data: reportData }) {
  const current = reportData?.current || {};
  const comparison = reportData?.comparison || {};

  const statementRows = [
    ["Item revenue", current.itemRevenue, false],
    ["Less: bill discounts", -Number(current.billDiscounts || 0), true],
    ["Less: sales returns", -Number(current.salesReturns || 0), true],
    ["Net revenue", current.netRevenue, false],
    ["Less: cost of goods sold", -Number(current.costOfGoodsSold || 0), true],
    ["Gross profit", current.grossProfit, false],
    ["Less: operating expenses", -Number(current.operatingExpenses || 0), true],
    ["Net profit", current.netProfit, false],
  ];

  const costCoverage = Number(current.costCoveragePercent || 0);

  const qualityBars = [
    { label: "Gross margin", value: current.grossMarginPercent, color: "bg-blue-600" },
    { label: "Net margin", value: current.netMarginPercent, color: "bg-blue-400" },
    { label: "Cost coverage", value: costCoverage, color: costCoverage < 95 ? "bg-amber-500" : "bg-blue-600" },
  ];

  return (
    <div className="space-y-6">
      {costCoverage < 95 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-black">Profit confidence warning</p>
          <p className="mt-1">
            Only {costCoverage.toFixed(1)}% of revenue lines have recorded cost.{" "}
            {Number(current.missingCostLineCount || 0).toLocaleString()} lines may inflate profit.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* Each tile already shows a period-over-period delta in green or red, so
            the icon chips stay neutral rather than encoding direction twice. */}
        <ComparisonMetric title="Net Revenue" current={current.netRevenue} previous={comparison.netRevenue} icon={TrendingUp} accent="accent" />
        <ComparisonMetric title="Gross Profit" current={current.grossProfit} previous={comparison.grossProfit} icon={BarChart3} accent="neutral" />
        <ComparisonMetric
          title="Net Profit"
          current={current.netProfit}
          previous={comparison.netProfit}
          icon={DollarSign}
          accent={Number(current.netProfit || 0) < 0 ? "critical" : "neutral"}
        />
        <ComparisonMetric
          title="Net Margin"
          current={current.netMarginPercent}
          previous={comparison.netMarginPercent}
          icon={PieIcon}
          accent="neutral"
          format={(value) => `${Number(value || 0).toFixed(1)}%`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="admin-panel-card overflow-hidden p-0" title="Profit & Loss Statement">
          <div className="divide-y divide-slate-200">
            {statementRows.map(([label, value, deduction]) => (
              <div
                key={label}
                className={`flex items-center justify-between px-5 py-4 ${EMPHASISED_ROWS.has(label) ? "bg-slate-50" : ""}`}
              >
                <span className={`text-sm ${label === "Net profit" ? "font-black text-slate-900" : "font-semibold text-slate-700"}`}>
                  {label}
                </span>
                <span
                  className={`font-black tabular-nums ${
                    deduction ? "text-red-700" : Number(value || 0) < 0 ? "text-red-700" : "text-slate-900"
                  }`}
                >
                  {formatCurrency(value)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="admin-panel-card border-slate-200/80 p-5" title="Margin & Data Quality">
          <div className="space-y-4">
            {qualityBars.map((metric) => (
              <div key={metric.label}>
                <div className="mb-2 flex justify-between text-sm font-bold text-slate-700">
                  <span>{metric.label}</span>
                  <span className="tabular-nums">{Number(metric.value || 0).toFixed(1)}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${metric.color}`}
                    style={{ width: `${Math.max(0, Math.min(100, Number(metric.value || 0)))}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <p>
                Returned COGS restored: <strong>{formatCurrency(current.returnedCost)}</strong>
              </p>
              <p className="mt-2">Operating expenses include only records configured for profit reporting.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
