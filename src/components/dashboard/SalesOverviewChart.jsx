import React, { memo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatCurrency } from "../../utils/formatters";

const CHART_MARGIN = { top: 10, right: 10, left: -20, bottom: 0 };
const AXIS_STYLE = { fontSize: "12px", fill: "#64748B" };
const TOOLTIP_STYLE = {
  borderRadius: "8px",
  border: "none",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
};
const ACTIVE_DOT = { r: 6, strokeWidth: 0, fill: "#2563EB" };

const formatXAxis = (value, chartMode) => {
  if (!value) return "";
  const date = new Date(value);
  return chartMode === "monthly"
    ? date.toLocaleDateString("en-US", { month: "short" })
    : `${date.getDate()}/${date.getMonth() + 1}`;
};

const formatYAxis = (value) => `Rs.${value >= 1000 ? `${value / 1000}k` : value}`;

const formatLabel = (label, chartMode) => {
  if (!label) return "";
  const date = new Date(label);
  return chartMode === "monthly"
    ? date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

const SalesOverviewChart = ({ data, chartMode, animate }) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data} margin={CHART_MARGIN}>
      <defs>
        <linearGradient id="colorSalesDash" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
      <XAxis
        dataKey="date"
        tickFormatter={(value) => formatXAxis(value, chartMode)}
        style={AXIS_STYLE}
        axisLine={false}
        tickLine={false}
        dy={10}
      />
      <YAxis
        style={AXIS_STYLE}
        axisLine={false}
        tickLine={false}
        tickFormatter={formatYAxis}
      />
      <Tooltip
        formatter={formatCurrency}
        labelFormatter={(label) => formatLabel(label, chartMode)}
        contentStyle={TOOLTIP_STYLE}
      />
      <Area
        type="monotone"
        dataKey="sales"
        stroke="#3B82F6"
        strokeWidth={3}
        fillOpacity={1}
        fill="url(#colorSalesDash)"
        activeDot={ACTIVE_DOT}
        isAnimationActive={animate}
      />
    </AreaChart>
  </ResponsiveContainer>
);

export default memo(SalesOverviewChart);
