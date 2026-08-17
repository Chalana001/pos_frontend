import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  AlertCircle,
  BarChart3,
  Calendar,
  Clock,
  DollarSign,
  ArrowLeftRight,
  Download,
  FileText,
  Package,
  PieChart as PieIcon,
  RotateCcw,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Truck,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { reportsAPI } from "../api/reports.api";
import { useAppConfiguration } from "../context/AppConfigurationContext";
import { getCategoryFilterParams, isSingleCategoryMode } from "../utils/categoryMode";
import { categoriesAPI } from "../api/categories.api";
import { suppliersAPI } from "../api/suppliers.api";
import { formatCurrency, shortCurrency } from "../utils/formatters";
import {
  CHROME,
  MONEY,
  SEQUENTIAL_BLUE,
  TILE,
  seriesColor,
  axisProps,
  gridProps,
  tooltipProps,
  BAR_RADIUS,
  BAR_RADIUS_HORIZONTAL,
  LINE_WIDTH,
} from "../utils/chartTheme";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Table from "../components/common/Table";
import TablePagination from "../components/common/TablePagination";
import ClientPagination from "../components/common/ClientPagination";
import LoadingSpinner from "../components/common/LoadingSpinner";
import CustomSelect from "../components/common/CustomSelect";
import DatePicker from "../components/common/DatePicker";
import { useBranch } from "../context/BranchContext";
import { useAuth } from "../context/AuthContext";
import AgingReportView from "../components/reports/AgingReportView";
import StockMovementReportView from "../components/reports/StockMovementReportView";
import StockHealthReportView from "../components/reports/StockHealthReportView";
import DemandForecastReportView from "../components/reports/DemandForecastReportView";
import GrnPurchaseReportView from "../components/reports/GrnPurchaseReportView";
import StockTransferReportView from "../components/reports/StockTransferReportView";
import ProductCategoryIntelligenceView from "../components/reports/ProductCategoryIntelligenceView";
import CustomerBehaviorReportView from "../components/reports/CustomerBehaviorReportView";
import CashierBranchComparisonView from "../components/reports/CashierBranchComparisonView";
import CommercialIntelligenceView from "../components/reports/CommercialIntelligenceView";
import ExceptionCenterView from "../components/reports/ExceptionCenterView";
import {
  ChartEmptyState,
  PremiumChartCard,
  SummaryMetric,
  ComparisonMetric,
  ValuationStatusBadge,
  StatCard,
} from "../components/reports/ReportPrimitives";
import { PremiumDonutChart, OverviewBarChart } from "../components/reports/ReportCharts";
import ReturnsReportView from "../components/reports/ReturnsReportView";
import CashFlowReportView from "../components/reports/CashFlowReportView";
import ProfitAndLossReportView from "../components/reports/ProfitAndLossReportView";
import InventoryValuationReportView from "../components/reports/InventoryValuationReportView";

const PAGE_SIZE = 10;
const defaultFilters = { sortDirection: "DESC", salesSortBy: "DATE", productSortBy: "REVENUE", customerSortBy: "TOTAL_SPENT", supplierSortBy: "TOTAL_PURCHASED", itemType: "ALL", orderType: "ALL" };
const BASIC_CHART_SIZE = 8;
// Colours come from src/utils/chartTheme.js — do not add raw hex values here.
// seriesColor() clamps instead of cycling: a 9th category must be folded into
// "Other" rather than handed a repeated hue.

const formatDateInput = (date) =>
  new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split("T")[0];

const datePresetOptions = [
  { id: "allTime", label: "All Time" },
  { id: "today", label: "Today" },
  { id: "thisMonth", label: "This Month" },
  { id: "lastMonth", label: "Last Month" },
  { id: "thisYear", label: "This Year" },
  { id: "custom", label: "Custom" },
];

const productTypeOptions = [
  { value: "ALL", label: "All Types" },
  { value: "NORMAL", label: "Normal" },
  { value: "WEIGHT", label: "Weight" },
  { value: "VOLUME", label: "Volume" },
  { value: "SERVICE", label: "Service" },
  { value: "RECIPE", label: "Recipe" },
];

const sortDirectionOptions = [
  { value: "DESC", label: "Top / Highest" },
  { value: "ASC", label: "Lowest" },
];

const sortOptionsByTab = {
  salesReport: [
    { value: "DATE", label: "Date" },
    { value: "TOTAL", label: "Grand Total" },
    { value: "PAID", label: "Paid Amount" },
    { value: "DUE", label: "Due Amount" },
    { value: "DISCOUNT", label: "Discount" },
  ],
  productPerformance: [
    { value: "REVENUE", label: "Revenue" },
    { value: "QUANTITY", label: "Quantity" },
    { value: "PROFIT", label: "Profit" },
  ],
  customerPerformance: [
    { value: "TOTAL_SPENT", label: "Total Spent" },
    { value: "ORDER_COUNT", label: "Orders" },
    { value: "TOTAL_DUE", label: "Due Amount" },
    { value: "AVG_ORDER", label: "Average Order" },
    { value: "LAST_ORDER", label: "Last Order" },
  ],
  supplierPerformance: [
    { value: "TOTAL_PURCHASED", label: "Total Purchased" },
    { value: "PURCHASE_COUNT", label: "Purchases" },
    { value: "TOTAL_DUE", label: "Due Amount" },
    { value: "AVG_PURCHASE", label: "Average Purchase" },
    { value: "LAST_PURCHASE", label: "Last Purchase" },
  ],
};

const orderTypeOptions = [
  { value: "ALL", label: "All Sales" },
  { value: "CASH", label: "Cash" },
  { value: "CREDIT", label: "Credit" },
];

const pagedTabs = ["salesReport", "productPerformance", "customerPerformance", "supplierPerformance", "shiftSummary", "stockMovement", "stockTransfers", "grnPurchases"];

const allTabs = [
  { id: "overview", label: "Overview", icon: PieIcon },
  { id: "salesReport", label: "Sales Report", icon: ShoppingCart },
  { id: "productPerformance", label: "Product Performance", icon: BarChart3 },
  { id: "customerPerformance", label: "Customer Performance", icon: Users },
  { id: "supplierPerformance", label: "Supplier Performance", icon: Truck },
  { id: "returnsReports", label: "Returns", icon: RotateCcw },
  { id: "stockHealth", label: "Stock Health", icon: Package },
  { id: "demandForecast", label: "Forecast & Reorder", icon: TrendingUp },
  { id: "inventoryValuation", label: "Inventory Valuation", icon: Package },
  { id: "shiftSummary", label: "Shift / Z Report", icon: Calendar },
  { id: "cashFlow", label: "Cash Flow", icon: TrendingUp },
  { id: "profitLoss", label: "Profit & Loss", icon: BarChart3 },
  { id: "creditAging", label: "Credit Aging", icon: Users },
  { id: "supplierPayables", label: "Supplier Payables", icon: Truck },
  { id: "stockMovement", label: "Stock Movement", icon: Package },
  { id: "stockTransfers", label: "Stock Transfers", icon: ArrowLeftRight },
  { id: "customerBehavior", label: "Customer Behavior", icon: Users },
  { id: "performanceComparison", label: "Cashier / Branch", icon: BarChart3 },
  { id: "commercialIntelligence", label: "Promotions / Returns / Warranty", icon: RotateCcw },
  { id: "exceptions", label: "Exception Center", icon: AlertCircle },
  { id: "grnPurchases", label: "GRN / Purchases", icon: Truck },
];

const tabsByMode = {
  basic: ["overview"],
  sales: ["salesReport"],
  product: ["productPerformance"],
  customer: ["customerPerformance"],
  supplier: ["supplierPerformance"],
  returns: ["returnsReports"],
  inventory: ["inventoryValuation"],
  stockHealth: ["stockHealth"],
  forecast: ["demandForecast"],
  shifts: ["shiftSummary"],
  cashFlow: ["cashFlow"],
  profitLoss: ["profitLoss"],
  creditAging: ["creditAging"],
  supplierPayables: ["supplierPayables"],
  stockMovement: ["stockMovement"],
  stockTransfers: ["stockTransfers"],
  customerBehavior: ["customerBehavior"],
  performanceComparison: ["performanceComparison"],
  commercialIntelligence: ["commercialIntelligence"],
  exceptions: ["exceptions"],
  grnPurchases: ["grnPurchases"],
};

const pageTitleByMode = {
  basic: "Basic Reports",
  sales: "Sales Reports",
  product: "Product Reports",
  customer: "Customer Reports",
  supplier: "Supplier Reports",
  returns: "Returns Reports",
  inventory: "Inventory Valuation",
  stockHealth: "Stock Health / Reorder",
  forecast: "Demand Forecast & Reorder Planning",
  shifts: "Shift / Z Reports",
  cashFlow: "Cash Flow",
  profitLoss: "Profit & Loss",
  creditAging: "Customer Credit Aging",
  supplierPayables: "Supplier Payables Aging",
  stockMovement: "Stock Movement",
  stockTransfers: "Stock Transfer Report",
  customerBehavior: "Customer Retention & Behavior",
  performanceComparison: "Cashier & Branch Comparison",
  commercialIntelligence: "Promotions, Returns & Warranty",
  exceptions: "Business Exception Center",
  grnPurchases: "GRN / Purchase Report",
};

const getPresetDateRange = (type) => {
  const now = new Date();
  let from = new Date(now);
  let to = new Date(now);

  if (type === "thisMonth") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (type === "lastMonth") {
    from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    to = new Date(now.getFullYear(), now.getMonth(), 0);
  } else if (type === "thisYear") {
    from = new Date(now.getFullYear(), 0, 1);
  }

  return { from: formatDateInput(from), to: formatDateInput(to) };
};

const emptyPage = {
  items: [],
  page: 0,
  size: PAGE_SIZE,
  totalElements: 0,
  totalPages: 0,
  first: true,
  last: true,
};

const Reports = ({ mode = "basic" }) => {
  const { configuration } = useAppConfiguration();
  const singleCategoryMode = isSingleCategoryMode(configuration);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPreset = datePresetOptions.some((option) => option.id === searchParams.get("preset")) ? searchParams.get("preset") : "thisMonth";
  const visibleTabs = useMemo(() => {
    const visibleIds = tabsByMode[mode] || tabsByMode.basic;
    return allTabs.filter((tab) => visibleIds.includes(tab.id));
  }, [mode]);
  // visibleTabs is never empty — tabsByMode falls back to `basic` for an unknown
  // mode — so this default is belt-and-braces only.
  const defaultTab = visibleTabs[0]?.id || "overview";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [loading, setLoading] = useState(false);
  const [loadedTab, setLoadedTab] = useState(null);
  const [reportData, setReportData] = useState([]);
  const [pageData, setPageData] = useState(emptyPage);
  const [page, setPage] = useState(0);
  const [pageInput, setPageInput] = useState("1");
  const [profitSummary, setProfitSummary] = useState(null);
  const [ownerSummary, setOwnerSummary] = useState(null);
  const [inventorySummary, setInventorySummary] = useState(null);
  const [stockHealthSummary, setStockHealthSummary] = useState(null);
  const [forecastSummary, setForecastSummary] = useState(null);
  const [forecastAccuracy, setForecastAccuracy] = useState(null);
  const [forecastOptions, setForecastOptions] = useState({ forecastDays: 30, targetCoverDays: 30, categoryId: "", supplierId: "", confidence: "", actionableOnly: false });
  const [forecastLookups, setForecastLookups] = useState({ categories: [], suppliers: [] });
  const [salesSummary, setSalesSummary] = useState(null);
  const [salesTrend, setSalesTrend] = useState({ data: [], type: "DAILY" });
  const [returnsData, setReturnsData] = useState({
    summary: null,
    topSaleItems: [],
    topPurchaseItems: [],
    reasons: [],
    trend: [],
  });
  const [basicOverview, setBasicOverview] = useState({
    categories: [],
    products: [],
    customers: [],
    suppliers: [],
    lowStock: [],
    creditDue: [],
  });
  const [productIntelligenceData, setProductIntelligenceData] = useState([]);
  const [comparisonData, setComparisonData] = useState({ cashiers: [], branches: [] });
  const [commercialData, setCommercialData] = useState({ promotions: [], warranty: null });
  const [datePreset, setDatePreset] = useState(initialPreset);
  const [dateRange, setDateRange] = useState(() => initialPreset === "custom" ? { from: searchParams.get("from") || "", to: searchParams.get("to") || "" } : getPresetDateRange(initialPreset));
  const [filterVersion, setFilterVersion] = useState(0);

  useEffect(() => {
    if (mode !== "forecast") return;
    Promise.all([singleCategoryMode ? categoriesAPI.getSingleCategories() : categoriesAPI.getAll(), suppliersAPI.list({ page: 0, size: 100 })])
      .then(([categoryResponse, supplierResponse]) => setForecastLookups({
        categories: Array.isArray(categoryResponse.data) ? categoryResponse.data : categoryResponse.data?.items || [],
        suppliers: supplierResponse.data?.items || supplierResponse.data?.content || (Array.isArray(supplierResponse.data) ? supplierResponse.data : []),
      }))
      .catch((error) => console.error("Failed to load forecast filters", error));
  }, [mode, singleCategoryMode]);
  const [exporting, setExporting] = useState(null);
  const [exportJobs, setExportJobs] = useState([]);
  const [reportSchedules, setReportSchedules] = useState([]);
  const [scheduleForm, setScheduleForm] = useState({ frequency: "DAILY", nextRunAt: "", emailTo: "" });
  const [chartsReady, setChartsReady] = useState(false);
  const [filters, setFilters] = useState(() => Object.fromEntries(Object.entries(defaultFilters).map(([key, value]) => [key, searchParams.get(key) || value])));
  const [savedViews, setSavedViews] = useState([]);

  const { selectedBranchId, setSelectedBranchId, branches } = useBranch();
  const { user } = useAuth();
  const reportRef = useRef(null);
  const restoredBranchRef = useRef(false);
  const savedViewsKey = `reportViews:${window.location.hostname}:${user?.userId || user?.username || "anonymous"}:${mode}`;

  useEffect(() => {
    setChartsReady(false);
    if (loadedTab !== activeTab) return undefined;
    const timer = window.setTimeout(() => setChartsReady(true), 400);
    return () => window.clearTimeout(timer);
  }, [activeTab, loadedTab]);

  useEffect(() => {
    if (restoredBranchRef.current) return;
    const branch = Number(searchParams.get("branch"));
    if (Number.isFinite(branch) && branches.some((item) => Number(item.id) === branch)) {
      setSelectedBranchId(branch);
      restoredBranchRef.current = true;
    }
    try { setSavedViews(JSON.parse(localStorage.getItem(savedViewsKey) || "[]")); } catch { setSavedViews([]); }
  }, [branches, savedViewsKey, searchParams, setSelectedBranchId]);

  useEffect(() => {
    const next = new URLSearchParams();
    next.set("preset", datePreset);
    if (datePreset === "custom") { if (dateRange.from) next.set("from", dateRange.from); if (dateRange.to) next.set("to", dateRange.to); }
    next.set("branch", String(selectedBranchId || 0));
    Object.entries(filters).forEach(([key, value]) => { if (value !== defaultFilters[key]) next.set(key, value); });
    setSearchParams(next, { replace: true });
  }, [datePreset, dateRange.from, dateRange.to, filters, selectedBranchId, setSearchParams]);

  const saveCurrentView = () => {
    const name = window.prompt("Saved view name");
    if (!name?.trim()) return;
    const view = { name: name.trim(), datePreset, dateRange, filters, branchId: selectedBranchId || 0 };
    const next = [...savedViews.filter((item) => item.name !== view.name), view].slice(-20);
    localStorage.setItem(savedViewsKey, JSON.stringify(next));
    setSavedViews(next);
    toast.success("Report view saved");
  };
  const loadSavedView = (view) => { setDatePreset(view.datePreset || "thisMonth"); setDateRange(view.dateRange || getPresetDateRange("thisMonth")); setFilters({ ...defaultFilters, ...(view.filters || {}) }); setSelectedBranchId(view.branchId || 0); setFilterVersion((value) => value + 1); };
  const deleteSavedView = (name) => { const next = savedViews.filter((item) => item.name !== name); localStorage.setItem(savedViewsKey, JSON.stringify(next)); setSavedViews(next); };

  useEffect(() => {
    setActiveTab(defaultTab);
    setLoadedTab(null);
    setReportData([]);
    setPageData(emptyPage);
    setStockHealthSummary(null);
    setForecastSummary(null);
    resetPage();
  }, [defaultTab]);

  const activeDateLabel = useMemo(
    () => datePresetOptions.find((option) => option.id === datePreset)?.label || "Custom",
    [datePreset]
  );

  const isPagedTab = pagedTabs.includes(activeTab);
  const activeSortKey = {
    salesReport: "salesSortBy",
    productPerformance: "productSortBy",
    customerPerformance: "customerSortBy",
    supplierPerformance: "supplierSortBy",
  }[activeTab];

  const formatDateTime = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleString();
  };

  const resetPage = () => {
    setPage(0);
    setPageInput("1");
  };

  const setQuickDate = (type) => {
    if (type === "allTime" && (activeTab === "cashFlow" || activeTab === "profitLoss")) {
      setDatePreset("thisYear");
      setDateRange(getPresetDateRange("thisYear"));
      resetPage();
      setFilterVersion((version) => version + 1);
      return;
    }
    setDatePreset(type);
    if (type === "allTime") {
      setDateRange({ from: "", to: "" });
    } else if (type !== "custom") {
      setDateRange(getPresetDateRange(type));
    }
    resetPage();
    setFilterVersion((version) => version + 1);
  };

  const handleCustomDateChange = (field, value) => {
    setDatePreset("custom");
    setDateRange((prev) => ({ ...prev, [field]: value }));
    resetPage();
    setFilterVersion((version) => version + 1);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setLoadedTab(null);
    setReportData([]);
    setPageData(emptyPage);
    setStockHealthSummary(null);
    setForecastSummary(null);
    resetPage();
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    resetPage();
    setFilterVersion((version) => version + 1);
  };

  const goToPage = () => {
    const requestedPage = Number(pageInput);
    if (!Number.isInteger(requestedPage)) {
      setPageInput(String(page + 1));
      return;
    }
    const maxPage = pageData.totalPages > 0 ? pageData.totalPages : 1;
    setPage(Math.min(Math.max(requestedPage, 1), maxPage) - 1);
  };

  const commonParams = () => ({
    ...(dateRange.from ? { from: dateRange.from } : {}),
    ...(dateRange.to ? { to: dateRange.to } : {}),
    ...(selectedBranchId && selectedBranchId !== 0 ? { branchId: selectedBranchId } : {}),
  });

  const setPagedResponse = (payload) => {
    const normalized = {
      ...emptyPage,
      ...(payload || {}),
      items: Array.isArray(payload?.items) ? payload.items : [],
    };
    setPageData(normalized);
    setReportData(normalized.items);
  };

  const loadBasicOverview = async (params) => {
    const hasDateRange = Boolean(dateRange.from && dateRange.to);
    const trendType = !hasDateRange || Math.abs(new Date(dateRange.to) - new Date(dateRange.from)) / 86400000 > 35 ? "MONTHLY" : "DAILY";
    const branchOnlyParams = selectedBranchId && selectedBranchId !== 0 ? { branchId: selectedBranchId } : {};

    const [
      summaryRes,
      trendRes,
      categoryRes,
      productRes,
      customerRes,
      supplierRes,
      profitSummaryRes,
      ownerSummaryRes,
      lowStockRes,
      creditDueRes,
    ] = await Promise.all([
      reportsAPI.salesSummary(params),
      reportsAPI.salesTrend({ ...params, type: trendType }),
      reportsAPI.salesByCategory({ ...params, categoryMode: singleCategoryMode ? "SINGLE_CATEGORY" : "MAIN_AND_SUB" }),
      reportsAPI.productPerformance({ ...params, page: 0, size: BASIC_CHART_SIZE, sortBy: "REVENUE", sortDirection: "DESC" }),
      reportsAPI.customerPerformance({ ...params, page: 0, size: BASIC_CHART_SIZE, sortBy: "TOTAL_SPENT", sortDirection: "DESC" }),
      reportsAPI.supplierPerformance({ ...params, page: 0, size: BASIC_CHART_SIZE, sortBy: "TOTAL_PURCHASED", sortDirection: "DESC" }),
      reportsAPI.profitSummary(params),
      dateRange.from && dateRange.to ? reportsAPI.ownerCommandCenter(params) : Promise.resolve({ data: null }),
      reportsAPI.lowStock(branchOnlyParams),
      reportsAPI.creditDue(branchOnlyParams),
    ]);

    setSalesSummary(summaryRes.data);
    setSalesTrend({
      data: Array.isArray(trendRes.data) ? trendRes.data : [],
      type: trendType,
    });
    setProfitSummary(profitSummaryRes.data);
    setOwnerSummary(ownerSummaryRes.data);
    setBasicOverview({
      categories: Array.isArray(categoryRes.data) ? categoryRes.data : [],
      products: Array.isArray(productRes.data?.items) ? productRes.data.items : [],
      customers: Array.isArray(customerRes.data?.items) ? customerRes.data.items : [],
      suppliers: Array.isArray(supplierRes.data?.items) ? supplierRes.data.items : [],
      lowStock: Array.isArray(lowStockRes.data) ? lowStockRes.data : [],
      creditDue: Array.isArray(creditDueRes.data) ? creditDueRes.data : [],
    });
  };

  const generateReport = async (type) => {
    setLoading(true);
    setLoadedTab(null);
    setReportData([]);
    setProfitSummary(null);
    setOwnerSummary(null);
    setInventorySummary(null);
    setStockHealthSummary(null);
    setForecastSummary(null);
    setSalesSummary(null);
    setSalesTrend({ data: [], type: "DAILY" });
    setReturnsData({ summary: null, topSaleItems: [], topPurchaseItems: [], reasons: [], trend: [] });

    try {
      const params = commonParams();
      let response;

      if (type === "overview") {
        await loadBasicOverview(params);
        setReportData([]);
      } else if (type === "salesReport") {
        response = await reportsAPI.salesReport({
          ...params,
          page,
          size: PAGE_SIZE,
          sortBy: filters.salesSortBy,
          sortDirection: filters.sortDirection,
          orderType: filters.orderType !== "ALL" ? filters.orderType : undefined,
        });
        setPagedResponse(response.data);
      } else if (type === "productPerformance") {
        const commonProductParams = {
          ...params,
          itemType: filters.itemType !== "ALL" ? filters.itemType : undefined,
        };
        const [pageResponse, intelligenceResponse] = await Promise.all([
          reportsAPI.productPerformance({ ...commonProductParams, page, size: PAGE_SIZE, sortBy: filters.productSortBy, sortDirection: filters.sortDirection }),
          reportsAPI.productPerformance({ ...commonProductParams, page: 0, size: 100, sortBy: "REVENUE", sortDirection: "DESC" }),
        ]);
        response = pageResponse;
        setPagedResponse(pageResponse.data);
        setProductIntelligenceData(Array.isArray(intelligenceResponse.data?.items) ? intelligenceResponse.data.items : []);
      } else if (type === "customerPerformance") {
        response = await reportsAPI.customerPerformance({
          ...params,
          page,
          size: PAGE_SIZE,
          sortBy: filters.customerSortBy,
          sortDirection: filters.sortDirection,
        });
        setPagedResponse(response.data);
      } else if (type === "supplierPerformance") {
        response = await reportsAPI.supplierPerformance({
          ...params,
          page,
          size: PAGE_SIZE,
          sortBy: filters.supplierSortBy,
          sortDirection: filters.sortDirection,
        });
        setPagedResponse(response.data);
      } else if (type === "inventoryValuation") {
        response = await reportsAPI.inventoryValuation(selectedBranchId && selectedBranchId !== 0 ? { branchId: selectedBranchId } : {});
        setInventorySummary(response.data);
        setReportData(Array.isArray(response.data?.items) ? response.data.items : []);
      } else if (type === "stockHealth") {
        response = await reportsAPI.stockHealth(selectedBranchId && selectedBranchId !== 0 ? { branchId: selectedBranchId } : {});
        setStockHealthSummary(response.data);
        setReportData(Array.isArray(response.data?.items) ? response.data.items : []);
      } else if (type === "demandForecast") {
        const [forecastResponse, accuracyResponse] = await Promise.all([
          reportsAPI.demandForecast({ ...(selectedBranchId && selectedBranchId !== 0 ? { branchId: selectedBranchId } : {}), ...forecastOptions, ...getCategoryFilterParams(forecastOptions.categoryId, singleCategoryMode), supplierId: forecastOptions.supplierId || undefined, confidence: forecastOptions.confidence || undefined }),
          reportsAPI.forecastAccuracy(),
        ]);
        response = forecastResponse;
        setForecastAccuracy(accuracyResponse.data);
        setForecastSummary(response.data);
        setReportData(Array.isArray(response.data?.items) ? response.data.items : []);
      } else if (type === "shiftSummary") {
        response = await reportsAPI.shiftSummary({
          ...params,
          page,
          size: PAGE_SIZE,
        });
        setPagedResponse(response.data);
      } else if (type === "cashFlow") {
        response = await reportsAPI.cashFlow(params);
        setReportData(response.data);
      } else if (type === "profitLoss") {
        response = await reportsAPI.profitAndLoss(params);
        setReportData(response.data);
      } else if (type === "creditAging") {
        response = await reportsAPI.creditAging(selectedBranchId && selectedBranchId !== 0 ? { branchId: selectedBranchId } : {});
        setReportData(Array.isArray(response.data) ? response.data : []);
      } else if (type === "supplierPayables") {
        response = await reportsAPI.supplierPayablesAging(selectedBranchId && selectedBranchId !== 0 ? { branchId: selectedBranchId } : {});
        setReportData(Array.isArray(response.data) ? response.data : []);
      } else if (type === "stockMovement") {
        response = await reportsAPI.stockMovement({ ...params, page, size: PAGE_SIZE });
        setPagedResponse(response.data);
      } else if (type === "stockTransfers") {
        response = await reportsAPI.stockTransferReport({
          ...params,
          ...(selectedBranchId && selectedBranchId !== 0 ? { branchId: selectedBranchId } : {}),
          page,
          size: PAGE_SIZE,
        });
        setPagedResponse(response.data);
      } else if (type === "customerBehavior") {
        response = await reportsAPI.customerBehavior(params);
        setReportData(response.data);
      } else if (type === "performanceComparison") {
        const [cashierResult, branchResult] = await Promise.allSettled([
          reportsAPI.cashierPerformance(params),
          reportsAPI.branchComparison(params),
        ]);
        const cashiers = cashierResult.status === "fulfilled" && Array.isArray(cashierResult.value.data) ? cashierResult.value.data : [];
        const branches = branchResult.status === "fulfilled" && Array.isArray(branchResult.value.data) ? branchResult.value.data : [];
        setComparisonData({ cashiers, branches });
        setReportData([]);
      } else if (type === "commercialIntelligence") {
        const [promotionsResponse, warrantyResponse, summaryRes] = await Promise.all([
          reportsAPI.promotionEffectiveness(params),
          reportsAPI.warrantyReport(params),
          reportsAPI.returnsSummary(params),
        ]);
        setCommercialData({ promotions: promotionsResponse.data || [], warranty: warrantyResponse.data || null });
        setReturnsData({ summary: summaryRes.data, topSaleItems: [], topPurchaseItems: [], reasons: [], trend: [] });
        setReportData([]);
      } else if (type === "exceptions") {
        response = await reportsAPI.exceptionCenter(params);
        setReportData(response.data);
      } else if (type === "grnPurchases") {
        response = await reportsAPI.grnReport({ ...params, page, size: PAGE_SIZE });
        setPagedResponse(response.data?.page || {});
        setInventorySummary(response.data);
      } else if (type === "returnsReports") {
        const [summaryRes, topSaleRes, topPurRes, reasonsRes, trendRes] = await Promise.all([
          reportsAPI.returnsSummary(params),
          reportsAPI.topReturnedItems({ ...params, type: "SALE", limit: 10 }),
          reportsAPI.topReturnedItems({ ...params, type: "PURCHASE", limit: 10 }),
          reportsAPI.returnReasons(params),
          reportsAPI.returnTrend(params),
        ]);
        setReturnsData({
          summary: summaryRes.data,
          topSaleItems: Array.isArray(topSaleRes.data) ? topSaleRes.data : [],
          topPurchaseItems: Array.isArray(topPurRes.data) ? topPurRes.data : [],
          reasons: Array.isArray(reasonsRes.data) ? reasonsRes.data : [],
          trend: Array.isArray(trendRes.data) ? trendRes.data : [],
        });
        setReportData([]);
      }

      setLoadedTab(type);
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate report");
      setPageData(emptyPage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      generateReport(activeTab);
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, dateRange.from, dateRange.to, filterVersion, selectedBranchId, page]);

  useEffect(() => {
    setPageInput(String(page + 1));
  }, [page]);

  const exportToPDF = async () => {
    if (!reportRef.current || exporting) return;
    setExporting("pdf");
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(reportRef.current, {
        scale: 1,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.9);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageCount = Math.max(1, Math.ceil(pdfHeight / pageHeight));
      for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
        if (pageIndex > 0) {
          pdf.addPage();
        }
        const y = -(pageIndex * pageHeight);
        pdf.addImage(imgData, "JPEG", 0, y, pdfWidth, pdfHeight);
      }
      pdf.save(`report_${activeTab}_${dateRange.from || "all-time"}.pdf`);
      toast.success("PDF downloaded");
    } catch (error) {
      console.error("PDF export failed", error);
      toast.error("Failed to export PDF");
    } finally {
      setExporting(null);
    }
  };

  const exportChartAsImage = async () => {
    if (!reportRef.current || exporting) return;
    setExporting("image");
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(reportRef.current, {
        scale: 1,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `report_${activeTab}.png`;
      link.click();
      toast.success("Image downloaded");
    } catch (error) {
      console.error("Image export failed", error);
      toast.error("Failed to save image");
    } finally {
      setExporting(null);
    }
  };

  const reportTypeByTab = {
    salesReport: "SALES",
    productPerformance: "PRODUCT",
    customerPerformance: "CUSTOMER",
    supplierPerformance: "SUPPLIER",
  };

  const loadExportJobs = async () => {
    try {
      const response = await reportsAPI.exportJobs({ page: 0, size: 5 });
      setExportJobs(response.data?.items || []);
    } catch (error) {
      console.error("Failed to load report exports", error);
    }
  };

  const loadReportSchedules = async () => {
    try {
      const response = await reportsAPI.reportSchedules();
      setReportSchedules(response.data || []);
    } catch (error) {
      console.error("Failed to load report schedules", error);
    }
  };

  useEffect(() => {
    if (!isPagedTab) return undefined;
    loadExportJobs();
    loadReportSchedules();
    const timer = window.setInterval(loadExportJobs, 5000);
    return () => window.clearInterval(timer);
  }, [isPagedTab]);

  const buildExportParams = () => {
    const params = { ...commonParams(), reportType: reportTypeByTab[activeTab], sortDirection: filters.sortDirection };
    if (activeTab === "salesReport") { params.sortBy = filters.salesSortBy; if (filters.orderType !== "ALL") params.orderType = filters.orderType; }
    if (activeTab === "productPerformance") { params.sortBy = filters.productSortBy; if (filters.itemType !== "ALL") params.itemType = filters.itemType; }
    if (activeTab === "customerPerformance") params.sortBy = filters.customerSortBy;
    if (activeTab === "supplierPerformance") params.sortBy = filters.supplierSortBy;
    return params;
  };

  const handleExcelExport = async () => {
    const reportType = reportTypeByTab[activeTab];
    if (!reportType) return;

    try {
      await reportsAPI.createExportJob(buildExportParams());
      await loadExportJobs();
      toast.success("Excel export queued");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export Excel");
    }
  };

  const mutateExportJob = async (action, job) => {
    try {
      await reportsAPI[action](job.id);
      await loadExportJobs();
      toast.success(action === "deleteExportJob" ? "Export deleted" : action === "cancelExportJob" ? "Export cancelled" : "Export queued for retry");
    } catch (error) {
      console.error("Failed to update report export", error);
      toast.error("Could not update export");
    }
  };

  const createSchedule = async () => {
    if (!scheduleForm.nextRunAt) return toast.error("Choose the first run time");
    try {
      await reportsAPI.createReportSchedule({ report: buildExportParams(), frequency: scheduleForm.frequency, nextRunAt: scheduleForm.nextRunAt, emailTo: scheduleForm.emailTo || null });
      setScheduleForm((value) => ({ ...value, nextRunAt: "" }));
      await loadReportSchedules();
      toast.success("Recurring report scheduled");
    } catch (error) {
      console.error("Failed to schedule report", error);
      toast.error("Could not schedule report");
    }
  };

  const downloadExportJob = async (job) => {
    try {
      const response = await reportsAPI.downloadExportJob(job.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = job.fileName || `${job.reportType.toLowerCase()}-report.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download report export", error);
      toast.error("Export download failed");
    }
  };

  const BasicOverview = () => {
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
    const totalCreditDue = basicOverview.creditDue.reduce((sum, item) => sum + Number(item.dueAmount || 0), 0);
    const topProductRevenue = productData[0]?.revenue || 0;
    const topCustomerSpend = customerData[0]?.totalSpent || 0;
    const topSupplierPurchased = supplierData[0]?.totalPurchased || 0;
    const averageOrder = Number(salesSummary.totalOrders || 0) > 0 ? Number(salesSummary.totalSales || 0) / Number(salesSummary.totalOrders || 1) : 0;
    const paymentData = [
      { name: "Cash", value: Number(salesSummary.cashSales || 0) },
      { name: "Credit", value: Number(salesSummary.creditSales || 0) },
    ];
    const paymentTotal = paymentData.reduce((sum, item) => sum + item.value, 0);
    const categoryChartData = categoryData
      .map((item) => ({ name: item.name, value: item.total }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    const categoryTotal = categoryData.reduce((sum, item) => sum + item.total, 0);
    const trendTotal = salesTrend.data.reduce((sum, item) => sum + Number(item.sales || 0), 0);
    const trendPeak = salesTrend.data.reduce(
      (peak, item) => (Number(item.sales || 0) > Number(peak.sales || 0) ? item : peak),
      { date: "-", sales: 0 }
    );
    const trendAverage = salesTrend.data.length > 0 ? trendTotal / salesTrend.data.length : 0;
    const hasPaymentData = paymentData.some((item) => item.value > 0);
    const hasCategoryData = categoryChartData.some((item) => item.value > 0);

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

        {ownerSummary?.risks && (
          <Card className="admin-panel-card border-slate-200/80 p-5 shadow-[0_12px_36px_rgb(15_23_42/0.06)]">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">Action Center</p>
                <h2 className="mt-1 text-lg font-black text-slate-900">What needs attention now</h2>
              </div>
              <p className="text-xs font-semibold text-slate-500">Inventory is current; credit is outstanding balance; returns use selected period.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className={`rounded-xl border p-4 ${ownerSummary.risks.outOfStockItems > 0 ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-slate-900">Stock attention</p>
                  <Package className={ownerSummary.risks.outOfStockItems > 0 ? "text-red-600" : "text-emerald-600"} size={20} />
                </div>
                <p className="mt-3 text-2xl font-black tabular-nums text-slate-900">{ownerSummary.risks.lowStockItems}</p>
                <p className="mt-1 text-xs font-semibold text-slate-600">{ownerSummary.risks.outOfStockItems} out of stock</p>
              </div>

              <div className={`rounded-xl border p-4 ${ownerSummary.risks.overdue91Plus > 0 ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-slate-900">Overdue 90+ days</p>
                  <Users className="text-amber-600" size={20} />
                </div>
                <p className="mt-3 text-2xl font-black tabular-nums text-slate-900">{formatCurrency(ownerSummary.risks.overdue91Plus)}</p>
                <p className="mt-1 text-xs font-semibold text-slate-600">{ownerSummary.risks.overdueCustomerCount} customers require collection</p>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-slate-900">Total receivables</p>
                  <FileText className="text-blue-600" size={20} />
                </div>
                <p className="mt-3 text-2xl font-black tabular-nums text-slate-900">{formatCurrency(ownerSummary.risks.totalReceivables)}</p>
                <p className="mt-1 text-xs font-semibold text-slate-600">Outstanding across selected branch scope</p>
              </div>

              <div className={`rounded-xl border p-4 ${ownerSummary.risks.saleReturnRatePercent > 3 ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-slate-900">Sales returns</p>
                  <RotateCcw className={ownerSummary.risks.saleReturnRatePercent > 3 ? "text-red-600" : "text-slate-600"} size={20} />
                </div>
                <p className="mt-3 text-2xl font-black tabular-nums text-slate-900">{formatCurrency(ownerSummary.risks.saleReturnAmount)}</p>
                <p className="mt-1 text-xs font-semibold text-slate-600">{Number(ownerSummary.risks.saleReturnRatePercent || 0).toFixed(1)}% of orders returned</p>
              </div>
            </div>
          </Card>
        )}

        <Card className="admin-panel-card dashboard-premium-card overflow-hidden border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50 p-5 shadow-[0_18px_50px_rgb(15_23_42/0.07)]">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Executive Summary</p>
              <h2 className="mt-1 text-xl font-black text-slate-900">Sales, profit and alerts in one view</h2>
            </div>
            <p className="text-sm font-medium text-slate-500">{datePreset === "allTime" ? "All records" : `${dateRange.from} to ${dateRange.to}`}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {/* One accent tile leads the row; the rest are neutral. Amber/red are
                reserved for the two tiles that actually mean "needs attention" —
                money owed and stock below reorder. */}
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

          <PremiumChartCard title={`Sales Trend (${salesTrend.type === "MONTHLY" ? "Monthly" : "Daily"})`} subtitle="Revenue movement for selected period">
            <div className="grid min-h-[300px] grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
              {salesTrend.data.length === 0 ? (
                <ChartEmptyState />
              ) : (
                <>
                  <div className="min-h-[280px] rounded-2xl bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-3 shadow-inner">
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
                    <div className="rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Trend Total</p>
                      <p className="mt-2 text-lg font-black tabular-nums text-slate-900">{formatCurrency(trendTotal)}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Peak Point</p>
                      <p className="mt-2 text-lg font-black tabular-nums text-slate-900">{formatCurrency(trendPeak.sales)}</p>
                      <p className="mt-1 truncate text-xs font-semibold text-slate-500">{trendPeak.date}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Average</p>
                      <p className="mt-2 text-lg font-black tabular-nums text-slate-900">{formatCurrency(trendAverage)}</p>
                    </div>
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
  };

  const renderPagedTable = () => {
    if (activeTab === "grnPurchases") return <GrnPurchaseReportView summary={{ ...inventorySummary, page: pageData }} />;
    if (activeTab === "stockMovement") return <StockMovementReportView data={reportData} totalElements={pageData.totalElements} />;
    if (activeTab === "stockTransfers") return <StockTransferReportView data={reportData} pageData={pageData} />;
    if (activeTab === "shiftSummary") {
      const totalCashSales = reportData.reduce((sum, shift) => sum + Number(shift.cashSales || 0), 0);
      const totalExpected = reportData.reduce((sum, shift) => sum + Number(shift.expectedClosingCash || 0), 0);
      const totalCounted = reportData.reduce((sum, shift) => sum + Number(shift.countedCash || 0), 0);
      const totalVariance = reportData.reduce((sum, shift) => sum + Number(shift.cashDifference || 0), 0);
      const shortageCount = reportData.filter((shift) => Number(shift.cashDifference || 0) < 0).length;

      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryMetric title="Cash Sales" value={totalCashSales} helper="Shifts on this page" icon={DollarSign} accent="emerald" />
            <SummaryMetric title="Expected Cash" value={totalExpected} helper="After expenses and drops" icon={TrendingUp} accent="blue" />
            <SummaryMetric title="Counted Cash" value={totalCounted} helper="Physical closing counts" icon={DollarSign} accent="indigo" />
            <SummaryMetric title="Net Variance" value={totalVariance} helper={`${shortageCount} shifts short`} icon={AlertCircle} accent={totalVariance < 0 ? "red" : "emerald"} />
            <SummaryMetric title="Shifts" value={pageData.totalElements} helper={`${reportData.length} shown`} icon={Calendar} accent="amber" format={(value) => Number(value || 0).toLocaleString()} />
          </div>

          <div className="space-y-3 md:hidden">
            {reportData.map((shift) => (
              <button key={shift.shiftId} type="button" onClick={() => window.location.assign(`/shifts/history/${shift.shiftId}`)} className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-black text-slate-900">Shift #{shift.shiftId}</p><p className="mt-1 text-xs text-slate-500">{shift.cashierUsername} · {formatDateTime(shift.openedAt)}</p></div>
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ${shift.shiftStatus === "CLOSED" ? "bg-slate-100 text-slate-700" : "bg-emerald-100 text-emerald-700"}`}>{shift.shiftStatus}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs font-semibold text-slate-500">Cash sales</p><p className="mt-1 font-bold">{formatCurrency(shift.cashSales)}</p></div>
                  <div><p className="text-xs font-semibold text-slate-500">Variance</p><p className={`mt-1 font-black ${Number(shift.cashDifference || 0) < 0 ? "text-red-600" : Number(shift.cashDifference || 0) > 0 ? "text-blue-600" : "text-emerald-700"}`}>{formatCurrency(shift.cashDifference)}</p></div>
                </div>
              </button>
            ))}
          </div>

          <Card className="admin-panel-card hidden overflow-hidden p-0 md:block" title="Shift Reconciliation Details">
            <Table
              columns={[
                { header: "Shift", render: (shift) => <div><p className="font-bold">#{shift.shiftId}</p><p className="text-xs text-slate-500">{shift.cashierUsername}</p></div> },
                { header: "Opened", render: (shift) => formatDateTime(shift.openedAt) },
                { header: "Orders", accessor: "orderCount" },
                { header: "Cash Sales", render: (shift) => formatCurrency(shift.cashSales) },
                { header: "Credit Sales", render: (shift) => formatCurrency(shift.creditSales) },
                { header: "Expenses", render: (shift) => formatCurrency(shift.totalExpenses) },
                { header: "Cash Drops", render: (shift) => formatCurrency(shift.totalCashDrops) },
                { header: "Expected", render: (shift) => formatCurrency(shift.expectedClosingCash) },
                { header: "Counted", render: (shift) => formatCurrency(shift.countedCash) },
                { header: "Variance", render: (shift) => <span className={`font-black ${Number(shift.cashDifference || 0) < 0 ? "text-red-600" : Number(shift.cashDifference || 0) > 0 ? "text-blue-600" : "text-emerald-700"}`}>{formatCurrency(shift.cashDifference)}</span> },
              ]}
              data={reportData}
              onRowClick={(shift) => window.location.assign(`/shifts/history/${shift.shiftId}`)}
              getRowKey={(shift) => shift.shiftId}
            />
          </Card>
        </div>
      );
    }

    if (activeTab === "salesReport") {
      return (
        <Card className="admin-panel-card overflow-hidden p-0" title="Sales Details">
          <Table
            columns={[
              { header: "Date", render: (i) => formatDateTime(i.createdAt) },
              { header: "Invoice", accessor: "invoiceNo" },
              { header: "Customer", render: (i) => <div><p className="font-semibold">{i.customerName}</p><p className="text-xs text-slate-500">{i.customerPhone || "-"}</p></div> },
              { header: "Cashier", accessor: "cashierName" },
              { header: "Type", accessor: "orderType" },
              { header: "Total", render: (i) => <span className="font-bold">{formatCurrency(i.grandTotal)}</span> },
              { header: "Paid", render: (i) => formatCurrency(i.paidAmount) },
              { header: "Due", render: (i) => <span className={(i.dueAmount || 0) > 0 ? "font-bold text-red-600" : ""}>{formatCurrency(i.dueAmount)}</span> },
            ]}
            data={reportData}
          />
        </Card>
      );
    }

    if (activeTab === "productPerformance") return <ProductCategoryIntelligenceView data={reportData} intelligenceData={productIntelligenceData} totalElements={pageData.totalElements} />;

    if (activeTab === "customerPerformance") {
      return (
        <Card className="admin-panel-card overflow-hidden p-0" title="Customer Performance Details">
          <Table
            columns={[
              { header: "#", render: (_, i) => pageData.page * pageData.size + i + 1 },
              { header: "Customer", render: (i) => <div><p className="font-semibold">{i.customerName}</p><p className="text-xs text-slate-500">{i.phone}</p></div> },
              { header: "Orders", accessor: "orderCount" },
              { header: "Spent", render: (i) => <span className="font-bold text-blue-600">{formatCurrency(i.totalSpent)}</span> },
              { header: "Paid", render: (i) => formatCurrency(i.totalPaid) },
              { header: "Due", render: (i) => <span className={(i.totalDue || 0) > 0 ? "font-bold text-red-600" : ""}>{formatCurrency(i.totalDue)}</span> },
              { header: "Avg Order", render: (i) => formatCurrency(i.averageOrderValue) },
              { header: "Last Order", render: (i) => formatDateTime(i.lastOrderAt) },
            ]}
            data={reportData}
          />
        </Card>
      );
    }

    if (activeTab === "supplierPerformance") {
      return (
        <Card className="admin-panel-card overflow-hidden p-0" title="Supplier Performance Details">
          <Table
            columns={[
              { header: "#", render: (_, i) => pageData.page * pageData.size + i + 1 },
              { header: "Supplier", render: (i) => <div><p className="font-semibold">{i.supplierName}</p><p className="text-xs text-slate-500">{i.contactNo}</p></div> },
              { header: "Purchases", accessor: "purchaseCount" },
              { header: "Purchased", render: (i) => <span className="font-bold text-blue-600">{formatCurrency(i.totalPurchased)}</span> },
              { header: "Paid", render: (i) => formatCurrency(i.totalPaid) },
              { header: "Due", render: (i) => <span className={(i.totalDue || 0) > 0 ? "font-bold text-red-600" : ""}>{formatCurrency(i.totalDue)}</span> },
              { header: "Avg Purchase", render: (i) => formatCurrency(i.averagePurchaseValue) },
              { header: "Last Purchase", render: (i) => formatDateTime(i.lastPurchaseAt) },
            ]}
            data={reportData}
          />
        </Card>
      );
    }

    return null;
  };

  const renderReportContent = () => {
    if (isPagedTab) return renderPagedTable();
    if (activeTab === "overview") return <BasicOverview />;
    if (activeTab === "returnsReports") {
      return <ReturnsReportView data={returnsData} />;
    }
    if (activeTab === "inventoryValuation") return <InventoryValuationReportView inventorySummary={inventorySummary} singleCategoryMode={singleCategoryMode} />;
    if (activeTab === "cashFlow") return <CashFlowReportView data={reportData} />;
    if (activeTab === "profitLoss") return <ProfitAndLossReportView data={reportData} />;
    if (activeTab === "creditAging") return <AgingReportView data={reportData} kind="customer" />;
    if (activeTab === "supplierPayables") return <AgingReportView data={reportData} kind="supplier" />;
    if (activeTab === "customerBehavior") return <CustomerBehaviorReportView data={reportData} />;
    if (activeTab === "performanceComparison") return <CashierBranchComparisonView cashierData={comparisonData.cashiers} branchData={comparisonData.branches} />;
    if (activeTab === "commercialIntelligence") return <CommercialIntelligenceView promotions={commercialData.promotions} warranty={commercialData.warranty} returnsData={returnsData} />;
    if (activeTab === "exceptions") return <ExceptionCenterView data={reportData} />;
    if (activeTab === "stockHealth") return <StockHealthReportView summary={stockHealthSummary} data={reportData} />;
    if (activeTab === "demandForecast") return <DemandForecastReportView summary={forecastSummary} accuracy={forecastAccuracy} data={reportData} options={forecastOptions} lookups={forecastLookups} onOptionsChange={(next) => { setForecastOptions(next); setLoadedTab(null); }} onRefresh={() => generateReport("demandForecast")} onExport={async () => { const categoryParams = getCategoryFilterParams(forecastOptions.categoryId, singleCategoryMode); await reportsAPI.createExportJob({ reportType: "DEMAND_FORECAST", branchId: selectedBranchId || null, ...forecastOptions, ...categoryParams, supplierId: forecastOptions.supplierId || null, confidence: forecastOptions.confidence || null }); await loadExportJobs(); toast.success("Forecast export queued"); }} onSchedule={async (schedule) => { const categoryParams = getCategoryFilterParams(forecastOptions.categoryId, singleCategoryMode); await reportsAPI.createReportSchedule({ report: { reportType: "DEMAND_FORECAST", branchId: selectedBranchId || null, ...forecastOptions, ...categoryParams, supplierId: forecastOptions.supplierId || null, confidence: forecastOptions.confidence || null }, ...schedule }); await loadReportSchedules(); toast.success("Recurring forecast scheduled"); }} />;
    return null;
  };

  const hasActiveReportData = loadedTab === activeTab;

  return (
    <div className="page-enter space-y-6 pb-10">
      <div className="page-section-enter flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">{pageTitleByMode[mode] || "Reports"}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "basic" ? "Quick chart overview for business direction." : mode === "cashFlow" ? "Cash-only business inflows, outflows, and daily movement." : mode === "profitLoss" ? "Canonical revenue, cost, margin, and operating profit statement." : mode === "creditAging" ? "Current outstanding customer credit grouped by invoice age and collection priority." : mode === "supplierPayables" ? "Current supplier obligations grouped by purchase age and payment priority." : mode === "stockMovement" ? "Opening, inflow, outflow, processing, and closing stock reconciliation." : mode === "stockTransfers" ? "Branch transfer counts, movement quantities, and transfer drill-downs." : mode === "stockHealth" ? "Current stock coverage, reorder suggestions, and expiry risk." : mode === "forecast" ? "Confidence-labelled demand projections and practical reorder planning." : mode === "grnPurchases" ? "Received goods value, supplier returns, and linked purchase payment status." : mode === "customerBehavior" ? "New, returning, repeat, value, and inactivity behavior for registered customers." : mode === "performanceComparison" ? "Sales, orders, discounts, returns, refunds, and expenses by cashier and branch." : mode === "commercialIntelligence" ? "Bill-promotion usage, return impact, and warranty status intelligence." : mode === "exceptions" ? "Current and period-based business risks requiring owner or manager attention." : "Detailed paginated report data with Excel export."}
          </p>
        </div>
        {!(["creditAging", "supplierPayables", "stockHealth"].includes(mode)) && <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
          <Calendar size={16} className="text-slate-500" />
          {activeDateLabel}
          <span className="text-slate-300">|</span>
          <span className="font-medium text-slate-500">{datePreset === "allTime" ? "All records" : `${dateRange.from} to ${dateRange.to}`}</span>
        </div>}
      </div>

      <Card className="admin-panel-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button variant="secondary" onClick={saveCurrentView}>Save Current View</Button>
          <select className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm" defaultValue="" onChange={(event) => { const view = savedViews.find((item) => item.name === event.target.value); if (view) loadSavedView(view); event.target.value = ""; }}>
            <option value="">Load saved view...</option>
            {savedViews.map((view) => <option key={view.name} value={view.name}>{view.name}</option>)}
          </select>
          {savedViews.length > 0 && <Button variant="secondary" onClick={() => { const name = window.prompt("Saved view name to delete"); if (name) deleteSavedView(name); }}>Delete View</Button>}
          <p className="text-xs font-semibold text-slate-500">Filters are stored in the URL for sharing and reload.</p>
        </div>
      </Card>

      {!(["creditAging", "supplierPayables", "stockHealth"].includes(mode)) && <Card className="admin-panel-card overflow-visible p-0">
        <div className="inventory-filter-bar border-b border-slate-100 bg-slate-50/50 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="flex flex-wrap gap-2">
              {datePresetOptions.filter((option) => !(["cashFlow", "profitLoss"].includes(mode) && option.id === "allTime")).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setQuickDate(option.id)}
                  className={`h-[38px] rounded-xl border px-3 text-sm font-semibold transition-colors ${
                    datePreset === option.id
                      ? "border-blue-200 bg-blue-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center xl:ml-auto">
              <DatePicker
                value={dateRange.from}
                onChange={(value) => handleCustomDateChange("from", value)}
                buttonClassName="h-[38px] rounded-xl"
              />
              <span className="hidden text-sm text-slate-500 sm:inline">to</span>
              <DatePicker
                value={dateRange.to}
                onChange={(value) => handleCustomDateChange("to", value)}
                buttonClassName="h-[38px] rounded-xl"
              />
            </div>
          </div>

          {isPagedTab && !["shiftSummary", "stockMovement", "stockTransfers", "grnPurchases"].includes(activeTab) && (
            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2 lg:grid-cols-4">
              <CustomSelect
                value={filters[activeSortKey]}
                onChange={(value) => handleFilterChange(activeSortKey, value)}
                options={sortOptionsByTab[activeTab]}
                buttonClassName="h-[38px] py-0 font-semibold shadow-sm focus:ring-blue-100"
              />
              <CustomSelect
                value={filters.sortDirection}
                onChange={(value) => handleFilterChange("sortDirection", value)}
                options={sortDirectionOptions}
                buttonClassName="h-[38px] py-0 font-semibold shadow-sm focus:ring-blue-100"
              />
              {activeTab === "productPerformance" && (
                <CustomSelect
                  value={filters.itemType}
                  onChange={(value) => handleFilterChange("itemType", value)}
                  options={productTypeOptions}
                  buttonClassName="h-[38px] py-0 font-semibold shadow-sm focus:ring-blue-100"
                />
              )}
              {activeTab === "salesReport" && (
                <CustomSelect
                  value={filters.orderType}
                  onChange={(value) => handleFilterChange("orderType", value)}
                  options={orderTypeOptions}
                  buttonClassName="h-[38px] py-0 font-semibold shadow-sm focus:ring-blue-100"
                />
              )}
            </div>
          )}
        </div>
      </Card>}

      {visibleTabs.length > 1 && (
        <div className="page-section-enter flex flex-wrap gap-2 border-b border-slate-200 pb-2">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`report-tab-chip flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab.id ? "bg-blue-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-[500px]">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner size="lg" text="Analyzing data..." />
          </div>
        ) : !hasActiveReportData ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 py-20 text-center">
            <PieIcon size={48} className="mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-600">Loading Report</h3>
            <p className="text-slate-500">Choose a report type or date range to refresh the data.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="mb-4 flex justify-end gap-2">
              {isPagedTab ? (
                <Button variant="outline" size="sm" onClick={handleExcelExport}>
                  <Download size={16} className="mr-2" /> Export Excel
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={exportChartAsImage} disabled={!!exporting}>
                    <PieIcon size={16} className="mr-2" /> {exporting === "image" ? "Saving..." : "Save Image"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportToPDF} disabled={!!exporting}>
                    <Download size={16} className="mr-2" /> {exporting === "pdf" ? "Preparing..." : "Download PDF"}
                  </Button>
                </>
              )}
            </div>

            {isPagedTab && (
              <Card className="p-4">
                <h3 className="text-sm font-black text-slate-800">Schedule This Report</h3>
                <p className="mt-1 text-xs text-slate-500">Generate the current filtered report automatically and optionally email it.</p>
                <div className="mt-3 grid gap-3 md:grid-cols-4">
                  <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm" value={scheduleForm.frequency} onChange={(event) => setScheduleForm((value) => ({ ...value, frequency: event.target.value }))}>
                    <option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option>
                  </select>
                  <input type="datetime-local" className="h-10 rounded-xl border border-slate-200 px-3 text-sm" value={scheduleForm.nextRunAt} onChange={(event) => setScheduleForm((value) => ({ ...value, nextRunAt: event.target.value }))} />
                  <input type="email" placeholder="Email recipient (optional)" className="h-10 rounded-xl border border-slate-200 px-3 text-sm" value={scheduleForm.emailTo} onChange={(event) => setScheduleForm((value) => ({ ...value, emailTo: event.target.value }))} />
                  <Button variant="outline" onClick={createSchedule}>Create Schedule</Button>
                </div>
                {reportSchedules.length > 0 && <div className="mt-4 divide-y divide-slate-100">
                  {reportSchedules.map((schedule) => <div key={schedule.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="text-sm font-bold text-slate-800">{schedule.reportType} · {schedule.frequency}</p><p className="text-xs text-slate-500">Next: {new Date(schedule.nextRunAt).toLocaleString()}{schedule.emailTo ? ` · ${schedule.emailTo}` : ""}</p></div>
                    <div className="flex gap-2"><Button variant="outline" size="sm" onClick={async () => { await reportsAPI.setReportScheduleEnabled(schedule.id, !schedule.enabled); await loadReportSchedules(); }}>{schedule.enabled ? "Pause" : "Resume"}</Button><Button variant="outline" size="sm" onClick={async () => { await reportsAPI.deleteReportSchedule(schedule.id); await loadReportSchedules(); }}>Delete</Button></div>
                  </div>)}
                </div>}
              </Card>
            )}

            {isPagedTab && exportJobs.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-800">Recent Excel Exports</h3>
                    <p className="text-xs text-slate-500">Queued exports continue in the background.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={loadExportJobs}>Refresh</Button>
                </div>
                <div className="mt-3 divide-y divide-slate-100">
                  {exportJobs.map((job) => (
                    <div key={job.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{job.reportType} report</p>
                        <p className="text-xs text-slate-500">{new Date(job.createdAt).toLocaleString()} · {job.status}</p>
                        {job.errorMessage && <p className="mt-1 text-xs font-semibold text-red-600">{job.errorMessage}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {job.downloadable && <Button variant="outline" size="sm" onClick={() => downloadExportJob(job)}><Download size={14} className="mr-2" />Download</Button>}
                        {job.status === "QUEUED" && <Button variant="outline" size="sm" onClick={() => mutateExportJob("cancelExportJob", job)}>Cancel</Button>}
                        {job.status === "FAILED" && <Button variant="outline" size="sm" onClick={() => mutateExportJob("retryExportJob", job)}>Retry</Button>}
                        {job.status !== "PROCESSING" && <Button variant="outline" size="sm" onClick={() => mutateExportJob("deleteExportJob", job)}>Delete</Button>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <div ref={reportRef} className="admin-panel-card overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50/60 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                    {allTabs.find((tab) => tab.id === activeTab)?.label || "Report"}
                  </h2>
                  <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">{["creditAging", "supplierPayables", "stockHealth"].includes(mode) ? "Current position as of generation time" : `Period: ${datePreset === "allTime" ? "All Time" : `${dateRange.from} to ${dateRange.to}`}`}</p>
                </div>
                <p className="text-xs font-medium text-slate-500 sm:text-right">Generated: {new Date().toLocaleString()}</p>
              </div>

              <div className="p-4 sm:p-5">{chartsReady ? renderReportContent() : <div className="h-40" aria-hidden="true" />}</div>
            </div>

            {isPagedTab && (
              <Card className="overflow-hidden p-0">
                <TablePagination
                  summary={`Showing ${reportData.length} of ${pageData.totalElements} records. Page ${page + 1} of ${
                    pageData.totalPages === 0 ? 1 : pageData.totalPages
                  }`}
                  page={page}
                  pageInput={pageInput}
                  totalPages={pageData.totalPages}
                  loading={loading}
                  onPageChange={setPage}
                  onPageInputChange={setPageInput}
                  onGoToPage={goToPage}
                />
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
