import React, { memo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatCurrency, shortCurrency } from "../../utils/formatters";
import {
  CHROME,
  seriesColor,
  axisProps,
  gridProps,
  tooltipProps,
  LINE_WIDTH,
  DOT_RADIUS,
} from "../../utils/chartTheme";

const CHART_MARGIN = { top: 10, right: 10, left: -20, bottom: 0 };

const formatXAxis = (value, chartMode) => {
  if (!value) return "";
  const date = new Date(value);
  return chartMode === "monthly"
    ? date.toLocaleDateString("en-US", { month: "short" })
    : `${date.getDate()}/${date.getMonth() + 1}`;
};

const formatLabel = (label, chartMode) => {
  if (!label) return "";
  const date = new Date(label);
  return chartMode === "monthly"
    ? date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

// Chrome and colours come from utils/chartTheme so this chart matches the report
// screens. It previously carried its own hex values, a dashed grid, a 3px stroke,
// and a "Rs." y-axis prefix while the rest of the app said "LKR" — the same drift
// that had accumulated across the reports section.
const SalesOverviewChart = ({ data, chartMode, animate }) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data} margin={CHART_MARGIN}>
      <defs>
        <linearGradient id="colorSalesDash" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={seriesColor(0)} stopOpacity={0.28} />
          <stop offset="95%" stopColor={seriesColor(0)} stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid {...gridProps} />
      <XAxis
        dataKey="date"
        tickFormatter={(value) => formatXAxis(value, chartMode)}
        {...axisProps}
        dy={10}
      />
      <YAxis {...axisProps} tickFormatter={shortCurrency} />
      <Tooltip
        formatter={(value) => [formatCurrency(value), "Sales"]}
        labelFormatter={(label) => formatLabel(label, chartMode)}
        {...tooltipProps}
      />
      <Area
        type="monotone"
        dataKey="sales"
        stroke={seriesColor(0)}
        strokeWidth={LINE_WIDTH}
        fillOpacity={1}
        fill="url(#colorSalesDash)"
        activeDot={{ r: DOT_RADIUS, strokeWidth: 2, stroke: CHROME.surface, fill: seriesColor(0) }}
        isAnimationActive={animate}
      />
    </AreaChart>
  </ResponsiveContainer>
);

export default memo(SalesOverviewChart);
