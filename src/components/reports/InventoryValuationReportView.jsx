// src/components/reports/InventoryValuationReportView.jsx
//
// Inventory valuation: capital tied up in stock, capital by category, immediate
// valuation risks, and the per-item detail table.
//
// Lifted out of the Reports render body. This one holds hook state —
// useClientPagination — so the remount cost was not merely wasted work: every
// parent render produced a new component identity, React unmounted the subtree,
// and the current page was discarded. At module scope the identity is stable and
// the hook keeps its state across parent renders.
//
// This does NOT make pagination survive a refetch. Reports gates its whole
// content area on `loading` (Reports.jsx, `{loading ? <LoadingSpinner/> : …}`),
// which unmounts this component while data is in flight, so changing a filter or
// date preset still returns the table to page 1. Fixing that means holding the
// previous render at reduced opacity instead of swapping in a spinner — a
// separate change affecting every report view.

import { BarChart3, DollarSign, Package, ShoppingCart, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import Card from "../common/Card";
import Table from "../common/Table";
import ClientPagination from "../common/ClientPagination";
import useClientPagination from "../../hooks/useClientPagination";
import { formatCurrency, shortCurrency } from "../../utils/formatters";
import { getDisplayCategoryName } from "../../utils/categoryMode";
import {
  seriesColor,
  axisProps,
  gridProps,
  tooltipProps,
  BAR_RADIUS_HORIZONTAL,
} from "../../utils/chartTheme";
import { ChartEmptyState, PremiumChartCard, SummaryMetric, ValuationStatusBadge } from "./ReportPrimitives";

const formatQty = (value, unit) => {
  const numeric = Number(value || 0);
  const formatted = Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(3).replace(/\.?0+$/, "");
  return unit ? `${formatted} ${unit}` : formatted;
};

const qtyTone = (qty) => (Number(qty || 0) <= 0 ? "text-red-700" : "text-slate-900");

const profitTone = (value) => {
  if (value == null) return "text-slate-500";
  return Number(value) < 0 ? "text-red-700" : "text-slate-900";
};

export default function InventoryValuationReportView({ inventorySummary, singleCategoryMode }) {
  const items = Array.isArray(inventorySummary?.items) ? inventorySummary.items : [];
  const stockedItems = items.filter((item) => Number(item.qtyOnHand || 0) > 0);
  const zeroStockItems = items.filter((item) => Number(item.qtyOnHand || 0) === 0).length;
  const negativeStockItems = items.filter((item) => Number(item.qtyOnHand || 0) < 0).length;
  const itemsWithoutCost = items.filter((item) => Number(item.qtyOnHand || 0) > 0 && Number(item.costPrice || 0) <= 0).length;
  const inventoryPagination = useClientPagination(items, items.length);

  const categoryMap = items.reduce((totals, item) => {
    const category = getDisplayCategoryName(item, singleCategoryMode);
    totals[category] = (totals[category] || 0) + Number(item.stockValue || 0);
    return totals;
  }, {});
  const categoryData = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const maxCategoryValue = Math.max(...categoryData.map((entry) => Number(entry.value || 0)), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {/* Five of these are plain valuations — only the stocked-items count can
            signal a problem, so it is the only tile that changes colour. */}
        <SummaryMetric title="Stock Cost Value" value={inventorySummary?.totalStockValue || 0} helper="Capital currently in stock" icon={DollarSign} accent="accent" />
        <SummaryMetric title="Priced Stock Value" value={inventorySummary?.pricedStockValue || 0} helper="Stock with a selling price" icon={ShoppingCart} accent="neutral" />
        <SummaryMetric title="Internal-use Stock" value={inventorySummary?.internalUseStockValue || 0} helper="Cost-valued stock without retail price" icon={Package} accent="neutral" />
        <SummaryMetric title="Potential Revenue" value={inventorySummary?.totalPotentialRevenue || 0} helper="Priced items only" icon={TrendingUp} accent="neutral" />
        <SummaryMetric title="Potential Gross Profit" value={inventorySummary?.totalPotentialProfit || 0} helper="Priced items only; before expenses" icon={BarChart3} accent="neutral" />
        <SummaryMetric
          title="Stocked Items"
          value={stockedItems.length}
          helper={`${zeroStockItems} items have zero stock`}
          icon={Package}
          accent={zeroStockItems > 0 ? "warning" : "neutral"}
          format={(value) => Number(value).toLocaleString()}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <PremiumChartCard
          title={singleCategoryMode ? "Capital by Category" : "Capital by Main Category"}
          subtitle={singleCategoryMode ? "Visible categories holding the most stock value" : "Main categories holding the most stock value"}
        >
          <div className="space-y-3 md:hidden">
            {categoryData.length ? (
              categoryData.map((category) => (
                <div key={category.name}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                    <span className="min-w-0 truncate font-semibold text-slate-700">{category.name}</span>
                    <span className="shrink-0 font-bold text-slate-900">{formatCurrency(category.value)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{
                        width: `${Math.max((Number(category.value || 0) / maxCategoryValue) * 100, Number(category.value || 0) > 0 ? 2 : 0)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <ChartEmptyState />
            )}
          </div>
          <div className="hidden h-[320px] min-h-[320px] min-w-0 md:block">
            {categoryData.length ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 600, height: 320 }}>
                <BarChart data={categoryData} layout="vertical" margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
                  {/* Horizontal bars read against vertical rules, so this chart
                      flips the shared grid orientation. */}
                  <CartesianGrid {...gridProps} vertical horizontal={false} />
                  <XAxis type="number" {...axisProps} tickFormatter={shortCurrency} />
                  <YAxis type="category" dataKey="name" width={105} {...axisProps} />
                  <Tooltip formatter={(value) => formatCurrency(value)} {...tooltipProps} />
                  <Bar dataKey="value" radius={BAR_RADIUS_HORIZONTAL} fill={seriesColor(0)} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ChartEmptyState />
            )}
          </div>
        </PremiumChartCard>

        <Card className="admin-panel-card border-slate-200/80 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Stock Health</p>
          <h2 className="mt-1 text-lg font-black text-slate-900">Immediate valuation risks</h2>
          <div className="mt-5 space-y-3">
            {/* These four are ordered by severity, and the surfaces carry that
                order — this is one of the places colour genuinely means something. */}
            <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4">
              <span className="font-bold text-slate-800">Zero-stock items</span>
              <span className="text-xl font-black text-red-700">{zeroStockItems}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-red-300 bg-red-100 p-4">
              <span className="font-bold text-slate-800">Negative-stock items</span>
              <span className="text-xl font-black text-red-800">{negativeStockItems}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4">
              <span className="font-bold text-slate-800">Items without cost</span>
              <span className="text-xl font-black text-amber-700">{itemsWithoutCost}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
              <span className="font-bold text-slate-800">Sellable items missing price</span>
              <span className="text-xl font-black text-slate-800">{inventorySummary?.missingPriceItems || 0}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="admin-panel-card overflow-hidden p-0" title="Inventory Valuation Details">
        <div className="space-y-3 p-4 md:hidden">
          {inventoryPagination.pageItems.map((item) => (
            <div key={item.itemId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-900">{item.itemName}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.barcode || "No barcode"} · {getDisplayCategoryName(item, singleCategoryMode)}
                  </p>
                  <ValuationStatusBadge status={item.valuationStatus} />
                </div>
                <span className={`font-black ${qtyTone(item.qtyOnHand)}`}>{formatQty(item.qtyOnHand, item.unit)}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold text-slate-500">Stock value</p>
                  <p className="mt-1 font-bold text-slate-900">{formatCurrency(item.stockValue)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">Potential profit</p>
                  <p className={`mt-1 font-bold ${profitTone(item.potentialProfit)}`}>
                    {item.potentialProfit == null ? "N/A" : formatCurrency(item.potentialProfit)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block">
          <Table
            columns={[
              {
                header: "Item",
                render: (item) => (
                  <div>
                    <p className="font-semibold text-slate-900">{item.itemName}</p>
                    <p className="text-xs text-slate-500">
                      {item.barcode || "No barcode"} · {getDisplayCategoryName(item, singleCategoryMode)}
                    </p>
                    <ValuationStatusBadge status={item.valuationStatus} />
                  </div>
                ),
              },
              { header: "Qty", render: (item) => <span className={`font-semibold ${qtyTone(item.qtyOnHand)}`}>{formatQty(item.qtyOnHand, item.unit)}</span> },
              { header: "Avg Cost", render: (item) => formatCurrency(item.costPrice) },
              { header: "Stock Value", render: (item) => <span className="font-bold text-slate-900">{formatCurrency(item.stockValue)}</span> },
              { header: "Selling Price", render: (item) => (Number(item.sellingPrice || 0) > 0 ? formatCurrency(item.sellingPrice) : <span className="text-slate-500">N/A</span>) },
              { header: "Potential Revenue", render: (item) => (item.potentialRevenue == null ? <span className="text-slate-500">N/A</span> : formatCurrency(item.potentialRevenue)) },
              {
                header: "Potential Profit",
                render: (item) => (
                  <span className={`font-bold ${profitTone(item.potentialProfit)}`}>
                    {item.potentialProfit == null ? "N/A" : formatCurrency(item.potentialProfit)}
                  </span>
                ),
              },
            ]}
            data={inventoryPagination.pageItems}
          />
        </div>

        <ClientPagination
          page={inventoryPagination.page}
          pageSize={inventoryPagination.pageSize}
          totalItems={items.length}
          totalPages={inventoryPagination.totalPages}
          onPageChange={inventoryPagination.setPage}
          onPageSizeChange={inventoryPagination.setPageSize}
        />
      </Card>
    </div>
  );
}
