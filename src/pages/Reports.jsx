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
import { getCategoryFilterParams, getDisplayCategoryName, isSingleCategoryMode } from "../utils/categoryMode";
import { categoriesAPI } from "../api/categories.api";
import { suppliersAPI } from "../api/suppliers.api";
import { formatCurrency } from "../utils/formatters";
import { formatDisplayStockBaseQuantity } from "../utils/stockQuantity";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Table from "../components/common/Table";
import TablePagination from "../components/common/TablePagination";
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

const PAGE_SIZE = 10;
const defaultFilters = { sortDirection: "DESC", salesSortBy: "DATE", productSortBy: "REVENUE", customerSortBy: "TOTAL_SPENT", supplierSortBy: "TOTAL_PURCHASED", itemType: "ALL", orderType: "ALL" };
const BASIC_CHART_SIZE = 8;
const CHART_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#4f46e5", "#f43f5e"];
const CHART_GRID = "#e2e8f0";
const CHART_TEXT = "#64748b";

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
  { id: "salesSummary", label: "Sales Summary", icon: TrendingUp },
  { id: "salesReport", label: "Sales Report", icon: ShoppingCart },
  { id: "productPerformance", label: "Product Performance", icon: BarChart3 },
  { id: "customerPerformance", label: "Customer Performance", icon: Users },
  { id: "supplierPerformance", label: "Supplier Performance", icon: Truck },
  { id: "profit", label: "Profit Analysis", icon: DollarSign },
  { id: "returnsReports", label: "Returns", icon: RotateCcw },
  { id: "lowStock", label: "Low Stock", icon: AlertCircle },
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
  { id: "creditDue", label: "Credit Due", icon: FileText },
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
  const defaultTab = visibleTabs[0]?.id || "salesSummary";
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

  const formatQty = (value, unit) => {
    const numeric = Number(value || 0);
    const formatted = Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(3).replace(/\.?0+$/, "");
    return unit ? `${formatted} ${unit}` : formatted;
  };

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

  const loadSalesContext = async (params) => {
    const hasDateRange = Boolean(dateRange.from && dateRange.to);
    const trendType = !hasDateRange || Math.abs(new Date(dateRange.to) - new Date(dateRange.from)) / 86400000 > 35 ? "MONTHLY" : "DAILY";
    const [summaryRes, trendRes] = await Promise.all([
      reportsAPI.salesSummary(params),
      reportsAPI.salesTrend({
        ...params,
        type: trendType,
      }),
    ]);
    setSalesSummary(summaryRes.data);
    setSalesTrend({
      data: Array.isArray(trendRes.data) ? trendRes.data : [],
      type: trendType,
    });
  };

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
      } else if (type === "salesSummary") {
        await loadSalesContext(params);
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
      } else if (type === "profit") {
        response = await reportsAPI.profit({ ...params, limit: 50 });
        const summaryRes = await reportsAPI.profitSummary(params);
        setProfitSummary(summaryRes.data);
        setReportData(Array.isArray(response.data) ? response.data : []);
      } else if (type === "lowStock") {
        response = await reportsAPI.lowStock(selectedBranchId && selectedBranchId !== 0 ? { branchId: selectedBranchId } : {});
        setReportData(Array.isArray(response.data) ? response.data : []);
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
      } else if (type === "creditDue") {
        response = await reportsAPI.creditDue(selectedBranchId && selectedBranchId !== 0 ? { branchId: selectedBranchId } : {});
        setReportData(Array.isArray(response.data) ? response.data : []);
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

  const shortCurrency = (value) => {
    const amount = Number(value || 0);
    if (Math.abs(amount) >= 1000000) return `Rs. ${(amount / 1000000).toFixed(1)}M`;
    if (Math.abs(amount) >= 1000) return `Rs. ${(amount / 1000).toFixed(1)}K`;
    return formatCurrency(amount);
  };

  const premiumTooltip = {
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    boxShadow: "0 18px 38px rgb(15 23 42 / 0.12)",
    color: "#0f172a",
  };

  const axisProps = {
    axisLine: false,
    tickLine: false,
    tick: { fontSize: 11, fill: CHART_TEXT },
  };

  const ChartEmptyState = () => (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-sm font-medium text-slate-400">
      No data for this period
    </div>
  );

  const PremiumChartCard = ({ title, subtitle, children }) => (
    <Card className="admin-panel-card dashboard-premium-card overflow-hidden border-slate-200/80 bg-white/95 shadow-[0_16px_44px_rgb(15_23_42/0.06)]">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-1 text-xs font-medium text-slate-500">{subtitle}</p>}
        </div>
        <div className="h-2 w-16 rounded-full bg-gradient-to-r from-blue-600 via-emerald-500 to-amber-400" />
      </div>
      {children}
    </Card>
  );

  const PremiumDonutChart = ({ data, total, valueLabel, gradientPrefix, formatter = formatCurrency }) => {
    const safeTotal = Number(total || 0);

    return (
      <div className="grid min-h-[300px] grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="relative min-h-[260px] rounded-2xl bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-2 shadow-inner">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 600, height: 320 }}>
            <PieChart>
              <defs>
                {data.map((entry, index) => (
                  <linearGradient key={`${gradientPrefix}-gradient-${entry.name}`} id={`${gradientPrefix}-${index}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS[index % CHART_COLORS.length]} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={CHART_COLORS[(index + 1) % CHART_COLORS.length]} stopOpacity={0.72} />
                  </linearGradient>
                ))}
              </defs>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="64%"
                outerRadius="86%"
                paddingAngle={4}
                cornerRadius={10}
                startAngle={90}
                endAngle={-270}
                stroke="#ffffff"
                strokeWidth={5}
              >
                {data.map((entry, index) => (
                  <Cell key={`${gradientPrefix}-cell-${entry.name}`} fill={`url(#${gradientPrefix}-${index})`} />
                ))}
              </Pie>
              <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-900 text-[18px] font-black">
                {formatter(safeTotal)}
              </text>
              <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-500 text-[11px] font-semibold uppercase tracking-wide">
                {valueLabel}
              </text>
              <Tooltip formatter={(value) => formatter(value)} contentStyle={premiumTooltip} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-8 rounded-full border border-white/70 shadow-[inset_0_0_32px_rgb(15_23_42/0.06)]" />
        </div>

        <div className="flex flex-col justify-center gap-3">
          {data.map((entry, index) => {
            const percent = safeTotal > 0 ? Math.round((Number(entry.value || 0) / safeTotal) * 100) : 0;
            return (
              <div key={`${gradientPrefix}-legend-${entry.name}`} className="rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-sm">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
                    <span className="truncate text-sm font-bold text-slate-700">{entry.name}</span>
                  </div>
                  <span className="text-sm font-black tabular-nums text-slate-900">{percent}%</span>
                </div>
                <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${percent}%`,
                      background: `linear-gradient(90deg, ${CHART_COLORS[index % CHART_COLORS.length]}, ${
                        CHART_COLORS[(index + 1) % CHART_COLORS.length]
                      })`,
                    }}
                  />
                </div>
                <p className="text-xs font-semibold text-slate-500">{formatter(entry.value)}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const SummaryMetric = ({ title, value, helper, icon: Icon, accent = "blue", format = formatCurrency }) => {
    const accentClasses = {
      blue: "bg-blue-50 text-blue-700 ring-blue-100",
      emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      amber: "bg-amber-50 text-amber-700 ring-amber-100",
      red: "bg-red-50 text-red-700 ring-red-100",
      indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100",
      cyan: "bg-cyan-50 text-cyan-700 ring-cyan-100",
      slate: "bg-slate-100 text-slate-700 ring-slate-200",
    };

    return (
      <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
            <p className="mt-2 text-xl font-black tabular-nums text-slate-900">{format(value)}</p>
            {helper && <p className="mt-1 max-w-[210px] truncate text-xs font-medium text-slate-500">{helper}</p>}
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${accentClasses[accent] || accentClasses.blue}`}>
            <Icon size={19} />
          </div>
        </div>
      </div>
    );
  };

  const ValuationStatusBadge = ({ status }) => {
    const styles = {
      SELLABLE: ["Retail", "bg-emerald-50 text-emerald-700"],
      PRICED_INTERNAL_USE: ["Internal + Priced", "bg-blue-50 text-blue-700"],
      INTERNAL_USE: ["Internal Use", "bg-slate-100 text-slate-600"],
      MISSING_PRICE: ["Missing Price", "bg-amber-50 text-amber-700"],
    };
    const [label, className] = styles[status] || ["Unclassified", "bg-slate-100 text-slate-600"];
    return <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${className}`}>{label}</span>;
  };

  const changePercent = (current, previous) => {
    const currentValue = Number(current || 0);
    const previousValue = Number(previous || 0);
    if (previousValue === 0) return currentValue === 0 ? 0 : null;
    return ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
  };

  const ComparisonMetric = ({ title, current, previous, icon: Icon, accent = "blue", format = formatCurrency }) => {
    const change = changePercent(current, previous);
    const improved = change !== null && change >= 0;

    return (
      <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</p>
            <p className="mt-2 truncate text-xl font-black tabular-nums text-slate-900">{format(current)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className={change === null ? "text-slate-500" : improved ? "text-emerald-600" : "text-red-600"}>
                {change === null ? "New activity" : `${improved ? "+" : ""}${change.toFixed(1)}%`}
              </span>
              <span className="text-slate-400">vs {format(previous)}</span>
            </div>
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${{
            blue: "bg-blue-50 text-blue-700 ring-blue-100",
            emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
            amber: "bg-amber-50 text-amber-700 ring-amber-100",
            red: "bg-red-50 text-red-700 ring-red-100",
            indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100",
          }[accent]}`}>
            <Icon size={19} />
          </div>
        </div>
      </div>
    );
  };

  const SalesKpis = () => {
    if (!salesSummary) return null;
    const pieData = [
      { name: "Cash", value: salesSummary.cashSales || 0 },
      { name: "Credit", value: salesSummary.creditSales || 0 },
    ];

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="admin-kpi-card bg-blue-50 border-blue-100">
            <h3 className="text-xs font-bold uppercase text-slate-500">Total Sales</h3>
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(salesSummary.totalSales)}</p>
          </Card>
          <Card className="admin-kpi-card bg-emerald-50 border-emerald-100">
            <h3 className="text-xs font-bold uppercase text-slate-500">Cash Sales</h3>
            <p className="text-2xl font-bold text-emerald-700">{formatCurrency(salesSummary.cashSales)}</p>
          </Card>
          <Card className="admin-kpi-card bg-amber-50 border-amber-100">
            <h3 className="text-xs font-bold uppercase text-slate-500">Credit Sales</h3>
            <p className="text-2xl font-bold text-amber-700">{formatCurrency(salesSummary.creditSales)}</p>
          </Card>
          <Card className="admin-kpi-card bg-indigo-50 border-indigo-100">
            <h3 className="text-xs font-bold uppercase text-slate-500">Orders</h3>
            <p className="text-2xl font-bold text-indigo-700">{salesSummary.totalOrders}</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="admin-panel-card" title="Payment Split">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 600, height: 320 }}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={58} outerRadius={95} paddingAngle={5}>
                    {pieData.map((entry, index) => (
                      <Cell key={entry.name} fill={index === 0 ? "#059669" : "#d97706"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="admin-panel-card" title={`Sales Trend (${salesTrend.type === "MONTHLY" ? "Monthly" : "Daily"})`}>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 600, height: 320 }}>
                <AreaChart data={salesTrend.data}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID} />
                  <XAxis dataKey="date" {...axisProps} />
                  <YAxis {...axisProps} tickFormatter={shortCurrency} />
                  <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={premiumTooltip} />
                  <Area type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" activeDot={{ r: 6, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const OverviewBarChart = ({ title, subtitle, data, nameKey, valueKey, formatter = formatCurrency }) => {
    const topRows = data.slice(0, 4);
    const maxValue = Math.max(...data.map((item) => Number(item[valueKey] || 0)), 0);

    return (
    <PremiumChartCard title={title} subtitle={subtitle}>
      <div className="grid min-h-[300px] grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
        {data.length === 0 ? (
          <ChartEmptyState />
        ) : (
          <>
            <div className="min-h-[280px] rounded-2xl bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-3 shadow-inner">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 600, height: 320 }}>
                <BarChart data={data} margin={{ top: 12, right: 8, left: -8, bottom: 34 }}>
                  <defs>
                    <linearGradient id={`${valueKey}-bar-gradient`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.96} />
                      <stop offset="55%" stopColor="#06b6d4" stopOpacity={0.88} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.82} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID} />
                  <XAxis dataKey={nameKey} {...axisProps} angle={-18} textAnchor="end" interval={0} height={58} />
                  <YAxis {...axisProps} tickFormatter={shortCurrency} />
                  <Tooltip formatter={(value) => formatter(value)} contentStyle={premiumTooltip} cursor={{ fill: "rgb(219 234 254 / 0.35)" }} />
                  <Bar dataKey={valueKey} radius={[10, 10, 0, 0]} maxBarSize={42}>
                    {data.map((entry, index) => (
                      <Cell key={`${title}-${index}`} fill={index === 0 ? "url(#" + valueKey + "-bar-gradient)" : CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-col justify-center gap-3">
              {topRows.map((entry, index) => {
                const value = Number(entry[valueKey] || 0);
                const percent = maxValue > 0 ? Math.max(4, Math.round((value / maxValue) * 100)) : 0;
                return (
                  <div key={`${title}-rank-${entry[nameKey]}-${index}`} className="rounded-xl border border-slate-200/80 bg-white/80 p-3 shadow-sm">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-[11px] font-black text-white">
                          {index + 1}
                        </span>
                        <span className="truncate text-sm font-bold text-slate-700">{entry[nameKey] || "Unknown"}</span>
                      </div>
                    </div>
                    <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${percent}%`,
                          background: `linear-gradient(90deg, ${CHART_COLORS[index % CHART_COLORS.length]}, ${
                            CHART_COLORS[(index + 1) % CHART_COLORS.length]
                          })`,
                        }}
                      />
                    </div>
                    <p className="text-xs font-semibold text-slate-500">{formatter(value)}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </PremiumChartCard>
    );
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
          <Card className="admin-panel-card dashboard-premium-card overflow-hidden border-slate-200/80 bg-slate-900 p-5 text-white shadow-[0_20px_60px_rgb(15_23_42/0.18)]">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Owner Command Center</p>
                <h2 className="mt-1 text-xl font-black">Current period versus previous period</h2>
              </div>
              <p className="text-xs font-semibold text-slate-300">
                {ownerSummary.comparisonPeriod.from} to {ownerSummary.comparisonPeriod.to}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ComparisonMetric title="Sales Growth" current={ownerSummary.current.totalSales} previous={ownerSummary.comparison.totalSales} icon={TrendingUp} accent="blue" />
              <ComparisonMetric title="Net Profit" current={ownerSummary.current.netProfit} previous={ownerSummary.comparison.netProfit} icon={DollarSign} accent="emerald" />
              <ComparisonMetric title="Average Order" current={ownerSummary.current.averageOrderValue} previous={ownerSummary.comparison.averageOrderValue} icon={ShoppingCart} accent="indigo" />
              <ComparisonMetric title="Expenses" current={ownerSummary.current.totalExpenses} previous={ownerSummary.comparison.totalExpenses} icon={AlertCircle} accent="red" />
              <ComparisonMetric title="Orders" current={ownerSummary.current.totalOrders} previous={ownerSummary.comparison.totalOrders} icon={ShoppingCart} accent="amber" format={(value) => Number(value || 0).toLocaleString()} />
              <ComparisonMetric title="Gross Margin" current={ownerSummary.current.grossMarginPercent} previous={ownerSummary.comparison.grossMarginPercent} icon={BarChart3} accent="emerald" format={(value) => `${Number(value || 0).toFixed(1)}%`} />
              <ComparisonMetric title="Cash Sales" current={ownerSummary.current.cashSales} previous={ownerSummary.comparison.cashSales} icon={DollarSign} accent="blue" />
              <ComparisonMetric title="Credit Sales" current={ownerSummary.current.creditSales} previous={ownerSummary.comparison.creditSales} icon={FileText} accent="amber" />
            </div>
          </Card>
        )}

        {ownerSummary?.risks && (
          <Card className="admin-panel-card border-slate-200/80 p-5 shadow-[0_12px_36px_rgb(15_23_42/0.06)]">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-600">Action Center</p>
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
            <SummaryMetric title="Total Sales" value={salesSummary.totalSales || 0} helper={`${salesSummary.totalOrders || 0} orders`} icon={TrendingUp} accent="blue" />
            <SummaryMetric title="Net Profit" value={profitSummary?.netProfit || 0} helper={`Gross ${formatCurrency(profitSummary?.grossProfit || 0)}`} icon={DollarSign} accent="emerald" />
            <SummaryMetric title="Average Order" value={averageOrder} helper="Sales per invoice" icon={ShoppingCart} accent="indigo" />
            <SummaryMetric title="Credit Due" value={totalCreditDue} helper={`${basicOverview.creditDue.length} customers`} icon={FileText} accent="red" />
            <SummaryMetric title="Cash Sales" value={salesSummary.cashSales || 0} helper="Paid at sale" icon={DollarSign} accent="emerald" />
            <SummaryMetric title="Credit Sales" value={salesSummary.creditSales || 0} helper="Credit invoices" icon={FileText} accent="amber" />
            <SummaryMetric title="Expenses" value={profitSummary?.totalExpenses || 0} helper="For selected range" icon={AlertCircle} accent="red" />
            <SummaryMetric title="Low Stock" value={basicOverview.lowStock.length} helper="Items below reorder" icon={AlertCircle} accent="amber" format={(value) => value} />
            <SummaryMetric title="Top Product Revenue" value={topProductRevenue} helper={productData[0]?.name || "No product data"} icon={BarChart3} accent="cyan" />
            <SummaryMetric title="Top Customer Spend" value={topCustomerSpend} helper={customerData[0]?.name || "No customer data"} icon={Users} accent="blue" />
            <SummaryMetric title="Top Supplier Purchases" value={topSupplierPurchased} helper={supplierData[0]?.name || "No supplier data"} icon={Truck} accent="slate" />
            <SummaryMetric title="Categories Selling" value={categoryData.length} helper="Categories with sales" icon={PieIcon} accent="indigo" format={(value) => value} />
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
                          <linearGradient id="basicSalesGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity={0.42} />
                            <stop offset="58%" stopColor="#06b6d4" stopOpacity={0.16} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                          </linearGradient>
                          <filter id="salesLineGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#2563eb" floodOpacity="0.22" />
                          </filter>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID} />
                        <XAxis dataKey="date" {...axisProps} />
                        <YAxis {...axisProps} tickFormatter={shortCurrency} />
                        <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={premiumTooltip} />
                        <Area
                          type="monotone"
                          dataKey="sales"
                          stroke="#2563eb"
                          strokeWidth={3}
                          fill="url(#basicSalesGradient)"
                          filter="url(#salesLineGlow)"
                          activeDot={{ r: 6, strokeWidth: 3, stroke: "#ffffff", fill: "#2563eb" }}
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

  const ProfitReport = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="admin-kpi-card bg-blue-50 border-blue-100">
          <h3 className="text-xs font-bold uppercase text-slate-500">Gross Profit</h3>
          <p className="text-2xl font-bold text-blue-700">{formatCurrency(profitSummary?.grossProfit || 0)}</p>
        </Card>
        <Card className="admin-kpi-card bg-red-50 border-red-100">
          <h3 className="text-xs font-bold uppercase text-slate-500">Expenses</h3>
          <p className="text-2xl font-bold text-red-600">- {formatCurrency(profitSummary?.totalExpenses || 0)}</p>
        </Card>
        <Card className="admin-kpi-card bg-emerald-50 border-emerald-100">
          <h3 className="text-xs font-bold uppercase text-slate-500">Net Profit</h3>
          <p className="text-2xl font-bold text-emerald-700">{formatCurrency(profitSummary?.netProfit || 0)}</p>
        </Card>
      </div>

      <Card className="admin-panel-card" title="Profit Trend by Item">
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 600, height: 320 }}>
            <LineChart data={reportData.slice(0, 20)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="itemName" hide />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} name="Revenue" />
              <Line type="monotone" dataKey="profit" stroke="#059669" strokeWidth={2} dot={false} name="Profit" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="admin-panel-card" title="Profit Details">
        <Table
          columns={[
            { header: "Product", render: (i) => <div className="flex flex-col"><span className="font-medium">{i.itemName}</span>{i.altName && <span className="text-xs text-slate-400">{i.altName}</span>}</div> },
            { header: "Qty Sold", accessor: "qtySold" },
            { header: "Cost", render: (i) => formatCurrency(i.cost) },
            { header: "Revenue", render: (i) => formatCurrency(i.revenue) },
            { header: "Profit", render: (i) => <span className="font-bold text-emerald-600">{formatCurrency(i.profit)}</span> },
          ]}
          data={reportData}
        />
      </Card>
    </div>
  );

  // ─── Returns Report Component ─────────────────────────────────────────
  const ReturnsReport = ({ data }) => {
    const { summary, topSaleItems, topPurchaseItems, reasons, trend } = data;

    const saleReasons = reasons.filter((r) => r.type === "SALE");
    const purchaseReasons = reasons.filter((r) => r.type === "PURCHASE");

    // Pie chart data for reasons
    const saleReasonPieData = saleReasons.slice(0, 6).map((r, i) => ({
      name: r.reason.length > 30 ? r.reason.substring(0, 30) + "…" : r.reason,
      value: Number(r.count),
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }));

    const trendChartData = trend.map((t) => ({
      label: t.label,
      "Sale Returns": Number(t.saleReturns || 0),
      "Purchase Returns": Number(t.purchaseReturns || 0),
    }));

    const StatCard = ({ label, value, sub, color = "text-slate-900" }) => (
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className={`mt-1 text-2xl font-black tabular-nums ${color}`}>{value}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      </div>
    );

    return (
      <div className="space-y-6">
        {/* ── KPI Summary Cards ── */}
        {summary ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Sale Returns" value={summary.saleReturnCount} sub={`${formatCurrency(summary.saleReturnTotal)} total`} color="text-orange-600" />
            <StatCard label="Items Returned (Sale)" value={summary.saleReturnItemCount} />
            <StatCard label="Purchase Returns" value={summary.purchaseReturnCount} sub={`${formatCurrency(summary.purchaseReturnTotal)} total`} color="text-blue-600" />
            <StatCard label="Items Returned (Purchase)" value={summary.purchaseReturnItemCount} />
            <StatCard label="Net Revenue" value={formatCurrency(summary.netRevenue)} sub={`Gross: ${formatCurrency(summary.grossSales)}`} color="text-emerald-600" />
            <StatCard label="Return Rate" value={`${summary.returnRate}%`} sub="Sale returns / total orders" color={summary.returnRate > 10 ? "text-red-600" : "text-slate-900"} />
          </div>
        ) : (
          <div className="flex h-20 items-center justify-center text-slate-400">No data for this period</div>
        )}

        {/* ── Return Trend Chart ── */}
        {trend.length > 0 && (
          <Card className="admin-panel-card" title="Return Trend">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={trendChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_TEXT }} />
                <YAxis tick={{ fontSize: 11, fill: CHART_TEXT }} tickFormatter={(v) => formatCurrency(v)} width={70} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="Sale Returns" fill="#f97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Purchase Returns" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* ── Top Returned Items ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="admin-panel-card" title="Top Returned Items (Sales)">
            {topSaleItems.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No sale returns in this period</p>
            ) : (
              <Table
                columns={[
                  { header: "Item", render: (i) => <div><p className="font-medium">{i.itemName}</p>{i.barcode && <p className="text-xs text-slate-400">{i.barcode}</p>}</div> },
                  { header: "Returns", render: (i) => <span className="font-semibold text-orange-600">{i.returnCount}×</span> },
                  { header: "Qty", accessor: "totalReturnedQty" },
                  { header: "Amount", render: (i) => <span className="font-bold">{formatCurrency(i.totalReturnAmount)}</span> },
                ]}
                data={topSaleItems}
              />
            )}
          </Card>

          <Card className="admin-panel-card" title="Top Returned Items (Purchases)">
            {topPurchaseItems.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No purchase returns in this period</p>
            ) : (
              <Table
                columns={[
                  { header: "Item", render: (i) => <div><p className="font-medium">{i.itemName}</p>{i.barcode && <p className="text-xs text-slate-400">{i.barcode}</p>}</div> },
                  { header: "Returns", render: (i) => <span className="font-semibold text-blue-600">{i.returnCount}×</span> },
                  { header: "Qty", accessor: "totalReturnedQty" },
                  { header: "Amount", render: (i) => <span className="font-bold">{formatCurrency(i.totalReturnAmount)}</span> },
                ]}
                data={topPurchaseItems}
              />
            )}
          </Card>
        </div>

        {/* ── Return Reasons ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Sale return reasons pie */}
          {saleReasonPieData.length > 0 && (
            <Card className="admin-panel-card" title="Sale Return Reasons">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={saleReasonPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={false}>
                      {saleReasonPieData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, name) => [v, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                  {saleReasons.map((r, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="truncate text-slate-700">{r.reason}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-semibold text-slate-900">{r.count}</span>
                        <span className="text-xs text-slate-400">{formatCurrency(r.totalAmount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Purchase return reasons table */}
          {purchaseReasons.length > 0 && (
            <Card className="admin-panel-card" title="Purchase Return Reasons">
              <Table
                columns={[
                  { header: "Reason", render: (r) => <span className="text-sm">{r.reason}</span> },
                  { header: "Count", render: (r) => <span className="font-semibold text-blue-600">{r.count}</span> },
                  { header: "Total Amount", render: (r) => formatCurrency(r.totalAmount) },
                ]}
                data={purchaseReasons}
              />
            </Card>
          )}
        </div>

        {/* Empty reasons state */}
        {saleReasons.length === 0 && purchaseReasons.length === 0 && (
          <Card className="admin-panel-card" title="Return Reasons">
            <p className="py-8 text-center text-sm text-slate-400">No return reason data available for this period.</p>
          </Card>
        )}
      </div>
    );
  };

  const InventoryValuationReport = () => {
    const items = Array.isArray(inventorySummary?.items) ? inventorySummary.items : [];
    const stockedItems = items.filter((item) => Number(item.qtyOnHand || 0) > 0);
    const zeroStockItems = items.filter((item) => Number(item.qtyOnHand || 0) === 0).length;
    const negativeStockItems = items.filter((item) => Number(item.qtyOnHand || 0) < 0).length;
    const visibleItems = items.slice(0, 50);
    const categoryMap = items.reduce((totals, item) => {
      const category = getDisplayCategoryName(item, singleCategoryMode);
      totals[category] = (totals[category] || 0) + Number(item.stockValue || 0);
      return totals;
    }, {});
    const categoryData = Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryMetric title="Stock Cost Value" value={inventorySummary?.totalStockValue || 0} helper="Capital currently in stock" icon={DollarSign} accent="blue" />
          <SummaryMetric title="Priced Stock Value" value={inventorySummary?.pricedStockValue || 0} helper="Stock with a selling price" icon={ShoppingCart} accent="emerald" />
          <SummaryMetric title="Internal-use Stock" value={inventorySummary?.internalUseStockValue || 0} helper="Cost-valued stock without retail price" icon={Package} accent="cyan" />
          <SummaryMetric title="Potential Revenue" value={inventorySummary?.totalPotentialRevenue || 0} helper="Priced items only" icon={TrendingUp} accent="emerald" />
          <SummaryMetric title="Potential Gross Profit" value={inventorySummary?.totalPotentialProfit || 0} helper="Priced items only; before expenses" icon={BarChart3} accent="cyan" />
          <SummaryMetric title="Stocked Items" value={stockedItems.length} helper={`${zeroStockItems} items have zero stock`} icon={Package} accent={zeroStockItems > 0 ? "amber" : "emerald"} format={(value) => Number(value).toLocaleString()} />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <PremiumChartCard title={singleCategoryMode ? "Capital by Category" : "Capital by Main Category"} subtitle={singleCategoryMode ? "Visible categories holding the most stock value" : "Main categories holding the most stock value"}>
            <div className="h-[320px] min-h-[320px] min-w-0">
              {categoryData.length ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} initialDimension={{ width: 600, height: 320 }}>
                  <BarChart data={categoryData} layout="vertical" margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" {...axisProps} tickFormatter={shortCurrency} />
                    <YAxis type="category" dataKey="name" width={105} {...axisProps} />
                    <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={premiumTooltip} />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <ChartEmptyState />}
            </div>
          </PremiumChartCard>

          <Card className="admin-panel-card border-slate-200/80 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-600">Stock Health</p>
            <h2 className="mt-1 text-lg font-black text-slate-900">Immediate valuation risks</h2>
            <div className="mt-5 space-y-3">
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
                <span className="text-xl font-black text-amber-700">{items.filter((item) => Number(item.qtyOnHand || 0) > 0 && Number(item.costPrice || 0) <= 0).length}</span>
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
            {visibleItems.map((item) => (
              <div key={item.itemId} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">{item.itemName}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.barcode || "No barcode"} · {getDisplayCategoryName(item, singleCategoryMode)}</p>
                    <ValuationStatusBadge status={item.valuationStatus} />
                  </div>
                  <span className={Number(item.qtyOnHand || 0) <= 0 ? "font-black text-red-600" : "font-black text-slate-900"}>{formatQty(item.qtyOnHand, item.unit)}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs font-semibold text-slate-500">Stock value</p><p className="mt-1 font-bold text-blue-700">{formatCurrency(item.stockValue)}</p></div>
                  <div><p className="text-xs font-semibold text-slate-500">Potential profit</p><p className={`mt-1 font-bold ${item.potentialProfit == null ? "text-slate-400" : Number(item.potentialProfit) < 0 ? "text-red-600" : "text-emerald-700"}`}>{item.potentialProfit == null ? "N/A" : formatCurrency(item.potentialProfit)}</p></div>
                </div>
              </div>
            ))}
          </div>
          <div className="hidden md:block">
            <Table
            columns={[
              { header: "Item", render: (item) => <div><p className="font-semibold text-slate-900">{item.itemName}</p><p className="text-xs text-slate-500">{item.barcode || "No barcode"} · {getDisplayCategoryName(item, singleCategoryMode)}</p><ValuationStatusBadge status={item.valuationStatus} /></div> },
              { header: "Qty", render: (item) => <span className={Number(item.qtyOnHand || 0) <= 0 ? "font-bold text-red-600" : "font-semibold"}>{formatQty(item.qtyOnHand, item.unit)}</span> },
              { header: "Avg Cost", render: (item) => formatCurrency(item.costPrice) },
              { header: "Stock Value", render: (item) => <span className="font-bold text-blue-700">{formatCurrency(item.stockValue)}</span> },
              { header: "Selling Price", render: (item) => Number(item.sellingPrice || 0) > 0 ? formatCurrency(item.sellingPrice) : <span className="text-slate-400">N/A</span> },
              { header: "Potential Revenue", render: (item) => item.potentialRevenue == null ? <span className="text-slate-400">N/A</span> : formatCurrency(item.potentialRevenue) },
              { header: "Potential Profit", render: (item) => item.potentialProfit == null ? <span className="font-semibold text-slate-400">N/A</span> : <span className={Number(item.potentialProfit) < 0 ? "font-bold text-red-600" : "font-bold text-emerald-700"}>{formatCurrency(item.potentialProfit)}</span> },
            ]}
              data={visibleItems}
            />
          </div>
          {items.length > visibleItems.length && (
            <p className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
              Showing the top 50 items by stock value. Category and stock-health totals include all {items.length} items.
            </p>
          )}
        </Card>
      </div>
    );
  };

  const CashFlowReport = () => {
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
          <SummaryMetric title="Cash Inflows" value={data.totalInflows || 0} helper="Sales and credit collections" icon={TrendingUp} accent="emerald" />
          <SummaryMetric title="Cash Outflows" value={data.totalOutflows || 0} helper="Operating cash payments" icon={TrendingDown} accent="red" />
          <SummaryMetric title="Net Cash Movement" value={data.netCashMovement || 0} helper="Inflows less outflows" icon={DollarSign} accent={Number(data.netCashMovement || 0) < 0 ? "red" : "blue"} />
          <SummaryMetric title="Cash Drops" value={data.cashDrops || 0} helper="Drawer-to-safe transfers, not expenses" icon={FileText} accent="amber" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <PremiumChartCard title="Daily Cash Movement" subtitle="Business cash inflows versus outflows">
            <div className="h-[320px] min-h-[320px] min-w-0">
              {daily.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={daily} margin={{ top: 12, right: 16, left: 4, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="date" {...axisProps} /><YAxis {...axisProps} tickFormatter={shortCurrency} /><Tooltip formatter={(value) => formatCurrency(value)} contentStyle={premiumTooltip} /><Area type="monotone" dataKey="inflows" stroke="#059669" fill="#d1fae5" strokeWidth={2} /><Area type="monotone" dataKey="outflows" stroke="#dc2626" fill="#fee2e2" strokeWidth={2} /></AreaChart></ResponsiveContainer> : <ChartEmptyState />}
            </div>
          </PremiumChartCard>
          <Card className="admin-panel-card border-slate-200/80 p-5" title="Cash Movement Breakdown">
            <div className="space-y-3">
              {movementBreakdown.map((movement) => <div key={movement.name} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4"><div><p className="font-bold text-slate-900">{movement.name}</p><p className={`text-xs font-semibold ${movement.type === "inflow" ? "text-emerald-600" : "text-red-600"}`}>{movement.type === "inflow" ? "Cash in" : "Cash out"}</p></div><p className="font-black tabular-nums text-slate-900">{formatCurrency(movement.value)}</p></div>)}
            </div>
          </Card>
        </div>
        <Card className="admin-panel-card overflow-hidden p-0" title="Daily Cash Reconciliation">
          <div className="space-y-3 p-4 md:hidden">{visibleDaily.map((row) => <div key={row.date} className="rounded-xl border border-slate-200 bg-white p-4"><p className="font-bold text-slate-900">{row.date}</p><div className="mt-3 grid grid-cols-3 gap-2 text-xs"><div><p className="text-slate-500">In</p><p className="mt-1 font-bold text-emerald-700">{formatCurrency(row.inflows)}</p></div><div><p className="text-slate-500">Out</p><p className="mt-1 font-bold text-red-700">{formatCurrency(row.outflows)}</p></div><div><p className="text-slate-500">Net</p><p className={`mt-1 font-black ${Number(row.netMovement || 0) < 0 ? "text-red-700" : "text-blue-700"}`}>{formatCurrency(row.netMovement)}</p></div></div></div>)}</div>
          <div className="hidden md:block"><Table columns={[{ header: "Date", accessor: "date" }, { header: "Inflows", render: (row) => <span className="font-bold text-emerald-700">{formatCurrency(row.inflows)}</span> }, { header: "Outflows", render: (row) => <span className="font-bold text-red-700">{formatCurrency(row.outflows)}</span> }, { header: "Net Movement", render: (row) => <span className={`font-black ${Number(row.netMovement || 0) < 0 ? "text-red-700" : "text-blue-700"}`}>{formatCurrency(row.netMovement)}</span> }]} data={visibleDaily} /></div>
          {daily.length > visibleDaily.length && <p className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">Showing the latest 100 active cash-movement days. KPIs and graph include all {daily.length} active days.</p>}
        </Card>
      </div>
    );
  };

  const ProfitAndLossReport = () => {
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

    return (
      <div className="space-y-6">
        {Number(current.costCoveragePercent || 0) < 95 && <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-black">Profit confidence warning</p><p className="mt-1">Only {Number(current.costCoveragePercent || 0).toFixed(1)}% of revenue lines have recorded cost. {Number(current.missingCostLineCount || 0).toLocaleString()} lines may inflate profit.</p></div>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ComparisonMetric title="Net Revenue" current={current.netRevenue} previous={comparison.netRevenue} icon={TrendingUp} accent="blue" />
          <ComparisonMetric title="Gross Profit" current={current.grossProfit} previous={comparison.grossProfit} icon={BarChart3} accent="emerald" />
          <ComparisonMetric title="Net Profit" current={current.netProfit} previous={comparison.netProfit} icon={DollarSign} accent={Number(current.netProfit || 0) < 0 ? "red" : "emerald"} />
          <ComparisonMetric title="Net Margin" current={current.netMarginPercent} previous={comparison.netMarginPercent} icon={PieIcon} accent="indigo" format={(value) => `${Number(value || 0).toFixed(1)}%`} />
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="admin-panel-card overflow-hidden p-0" title="Profit & Loss Statement">
            <div className="divide-y divide-slate-200">{statementRows.map(([label, value, deduction]) => <div key={label} className={`flex items-center justify-between px-5 py-4 ${label === "Net profit" || label === "Gross profit" || label === "Net revenue" ? "bg-slate-50" : ""}`}><span className={`text-sm ${label === "Net profit" ? "font-black text-slate-900" : "font-semibold text-slate-700"}`}>{label}</span><span className={`font-black tabular-nums ${deduction ? "text-red-600" : Number(value || 0) < 0 ? "text-red-700" : "text-slate-900"}`}>{formatCurrency(value)}</span></div>)}</div>
          </Card>
          <Card className="admin-panel-card border-slate-200/80 p-5" title="Margin & Data Quality">
            <div className="space-y-4">
              {[{ label: "Gross margin", value: current.grossMarginPercent, color: "bg-emerald-500" }, { label: "Net margin", value: current.netMarginPercent, color: "bg-blue-500" }, { label: "Cost coverage", value: current.costCoveragePercent, color: Number(current.costCoveragePercent || 0) < 95 ? "bg-amber-500" : "bg-emerald-500" }].map((metric) => <div key={metric.label}><div className="mb-2 flex justify-between text-sm font-bold text-slate-700"><span>{metric.label}</span><span>{Number(metric.value || 0).toFixed(1)}%</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${metric.color}`} style={{ width: `${Math.max(0, Math.min(100, Number(metric.value || 0)))}%` }} /></div></div>)}
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600"><p>Returned COGS restored: <strong>{formatCurrency(current.returnedCost)}</strong></p><p className="mt-2">Operating expenses include only records configured for profit reporting.</p></div>
            </div>
          </Card>
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
    if (activeTab === "salesSummary") return <SalesKpis />;
    if (activeTab === "profit") return <ProfitReport />;
    if (activeTab === "creditDue") {
      return (
        <Card className="admin-panel-card" title="Credit Due List">
          <Table
            columns={[
              { header: "Customer", accessor: "customerName" },
              { header: "Due Amount", render: (i) => <span className="font-bold text-red-600">{formatCurrency(i.dueAmount)}</span> },
            ]}
            data={reportData}
          />
        </Card>
      );
    }
    if (activeTab === "lowStock") {
      return (
        <Card className="admin-panel-card" title="Low Stock Alerts">
          <Table
            columns={[
              { header: "Item", render: (i) => <div className="flex flex-col"><span className="font-medium">{i.itemName}</span>{i.altName && <span className="text-xs text-slate-400">{i.altName}</span>}</div> },
              { header: "Stock", render: (i) => <span className="font-bold text-red-600">{formatDisplayStockBaseQuantity(i.totalQty, i, i.defaultUnit)}</span> },
              { header: "Reorder Level", render: (i) => formatDisplayStockBaseQuantity(i.reorderLevel, i, i.defaultUnit) },
              { header: "Status", render: () => <span className="rounded bg-red-100 px-2 py-1 text-xs font-bold text-red-700">LOW</span> },
            ]}
            data={reportData}
          />
        </Card>
      );
    }
    if (activeTab === "returnsReports") {
      return <ReturnsReport data={returnsData} />;
    }
    if (activeTab === "inventoryValuation") return <InventoryValuationReport />;
    if (activeTab === "cashFlow") return <CashFlowReport />;
    if (activeTab === "profitLoss") return <ProfitAndLossReport />;
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
          <Calendar size={16} className="text-slate-400" />
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
              <span className="hidden text-sm text-slate-400 sm:inline">to</span>
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
            <p className="text-slate-400">Choose a report type or date range to refresh the data.</p>
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
                <p className="text-xs font-medium text-slate-400 sm:text-right">Generated: {new Date().toLocaleString()}</p>
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
