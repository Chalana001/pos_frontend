import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import {
  AlertCircle,
  BarChart3,
  Calendar,
  DollarSign,
  Download,
  FileText,
  PieChart as PieIcon,
  ShoppingCart,
  TrendingUp,
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
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import { reportsAPI } from "../api/reports.api";
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

const PAGE_SIZE = 10;
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

const pagedTabs = ["salesReport", "productPerformance", "customerPerformance", "supplierPerformance"];

const allTabs = [
  { id: "overview", label: "Overview", icon: PieIcon },
  { id: "salesSummary", label: "Sales Summary", icon: TrendingUp },
  { id: "salesReport", label: "Sales Report", icon: ShoppingCart },
  { id: "productPerformance", label: "Product Performance", icon: BarChart3 },
  { id: "customerPerformance", label: "Customer Performance", icon: Users },
  { id: "supplierPerformance", label: "Supplier Performance", icon: Truck },
  { id: "profit", label: "Profit Analysis", icon: DollarSign },
  { id: "lowStock", label: "Low Stock", icon: AlertCircle },
  { id: "creditDue", label: "Credit Due", icon: FileText },
];

const tabsByMode = {
  basic: ["overview"],
  sales: ["salesReport"],
  product: ["productPerformance"],
  customer: ["customerPerformance"],
  supplier: ["supplierPerformance"],
};

const pageTitleByMode = {
  basic: "Basic Reports",
  sales: "Sales Reports",
  product: "Product Reports",
  customer: "Customer Reports",
  supplier: "Supplier Reports",
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
  const [salesSummary, setSalesSummary] = useState(null);
  const [salesTrend, setSalesTrend] = useState({ data: [], type: "DAILY" });
  const [basicOverview, setBasicOverview] = useState({
    categories: [],
    products: [],
    customers: [],
    suppliers: [],
    lowStock: [],
    creditDue: [],
  });
  const [datePreset, setDatePreset] = useState("thisMonth");
  const [dateRange, setDateRange] = useState(() => getPresetDateRange("thisMonth"));
  const [filterVersion, setFilterVersion] = useState(0);
  const [filters, setFilters] = useState({
    sortDirection: "DESC",
    salesSortBy: "DATE",
    productSortBy: "REVENUE",
    customerSortBy: "TOTAL_SPENT",
    supplierSortBy: "TOTAL_PURCHASED",
    itemType: "ALL",
    orderType: "ALL",
  });

  const { selectedBranchId } = useBranch();
  const reportRef = useRef(null);

  useEffect(() => {
    setActiveTab(defaultTab);
    setLoadedTab(null);
    setReportData([]);
    setPageData(emptyPage);
    resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      lowStockRes,
      creditDueRes,
    ] = await Promise.all([
      reportsAPI.salesSummary(params),
      reportsAPI.salesTrend({ ...params, type: trendType }),
      reportsAPI.salesByCategory(params),
      reportsAPI.productPerformance({ ...params, page: 0, size: BASIC_CHART_SIZE, sortBy: "REVENUE", sortDirection: "DESC" }),
      reportsAPI.customerPerformance({ ...params, page: 0, size: BASIC_CHART_SIZE, sortBy: "TOTAL_SPENT", sortDirection: "DESC" }),
      reportsAPI.supplierPerformance({ ...params, page: 0, size: BASIC_CHART_SIZE, sortBy: "TOTAL_PURCHASED", sortDirection: "DESC" }),
      reportsAPI.profitSummary(params),
      reportsAPI.lowStock(branchOnlyParams),
      reportsAPI.creditDue(),
    ]);

    setSalesSummary(summaryRes.data);
    setSalesTrend({
      data: Array.isArray(trendRes.data) ? trendRes.data : [],
      type: trendType,
    });
    setProfitSummary(profitSummaryRes.data);
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
    setSalesSummary(null);
    setSalesTrend({ data: [], type: "DAILY" });

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
        response = await reportsAPI.productPerformance({
          ...params,
          page,
          size: PAGE_SIZE,
          sortBy: filters.productSortBy,
          sortDirection: filters.sortDirection,
          itemType: filters.itemType !== "ALL" ? filters.itemType : undefined,
        });
        setPagedResponse(response.data);
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
      } else if (type === "creditDue") {
        response = await reportsAPI.creditDue();
        setReportData(Array.isArray(response.data) ? response.data : []);
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
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`report_${activeTab}_${dateRange.from}.pdf`);
    toast.success("PDF downloaded");
  };

  const exportChartAsImage = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current);
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `report_${activeTab}.png`;
    link.click();
    toast.success("Image downloaded");
  };

  const reportTypeByTab = {
    salesReport: "SALES",
    productPerformance: "PRODUCT",
    customerPerformance: "CUSTOMER",
    supplierPerformance: "SUPPLIER",
  };

  const handleExcelExport = async () => {
    const reportType = reportTypeByTab[activeTab];
    if (!reportType) return;

    try {
      const params = {
        ...commonParams(),
        reportType,
        sortDirection: filters.sortDirection,
      };

      if (activeTab === "salesReport") {
        params.sortBy = filters.salesSortBy;
        if (filters.orderType !== "ALL") params.orderType = filters.orderType;
      } else if (activeTab === "productPerformance") {
        params.sortBy = filters.productSortBy;
        if (filters.itemType !== "ALL") params.itemType = filters.itemType;
      } else if (activeTab === "customerPerformance") {
        params.sortBy = filters.customerSortBy;
      } else if (activeTab === "supplierPerformance") {
        params.sortBy = filters.supplierSortBy;
      }

      const response = await reportsAPI.exportReport(params);
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const rangeLabel = datePreset === "allTime" ? "all-time" : `${dateRange.from || "start"}_${dateRange.to || "end"}`;
      link.href = url;
      link.download = `${reportType.toLowerCase()}-report-${rangeLabel}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success("Excel exported");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export Excel");
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
          <ResponsiveContainer width="100%" height="100%">
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
              <ResponsiveContainer width="100%" height="100%">
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
              <ResponsiveContainer width="100%" height="100%">
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
              <ResponsiveContainer width="100%" height="100%">
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
    const totalTopProductRevenue = productData.reduce((sum, item) => sum + item.revenue, 0);
    const totalTopCustomerSpend = customerData.reduce((sum, item) => sum + item.totalSpent, 0);
    const totalTopSupplierPurchased = supplierData.reduce((sum, item) => sum + item.totalPurchased, 0);
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
    const categoryTotal = categoryChartData.reduce((sum, item) => sum + item.value, 0);
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
            <SummaryMetric title="Top Product Revenue" value={totalTopProductRevenue} helper={productData[0]?.name || "No product data"} icon={BarChart3} accent="cyan" />
            <SummaryMetric title="Top Customer Spend" value={totalTopCustomerSpend} helper={customerData[0]?.name || "No customer data"} icon={Users} accent="blue" />
            <SummaryMetric title="Supplier Purchases" value={totalTopSupplierPurchased} helper={supplierData[0]?.name || "No supplier data"} icon={Truck} accent="slate" />
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
                    <ResponsiveContainer width="100%" height="100%">
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
          <ResponsiveContainer width="100%" height="100%">
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
            { header: "Product", accessor: "itemName" },
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

  const ProductPerformance = () => (
    <Card className="admin-panel-card overflow-hidden p-0" title="Product Performance Details">
      <Table
        columns={[
          { header: "#", render: (_, i) => pageData.page * pageData.size + i + 1 },
          { header: "Item", render: (i) => <div><p className="font-semibold">{i.itemName}</p><p className="text-xs text-slate-500">{i.itemType || "UNKNOWN"}</p></div> },
          { header: "Qty Sold", render: (i) => formatQty(i.qtySold, i.qtyUnit) },
          { header: "Revenue", render: (i) => formatCurrency(i.revenue) },
          { header: "Cost", render: (i) => formatCurrency(i.cost) },
          { header: "Profit", render: (i) => <span className="font-bold text-emerald-600">{formatCurrency(i.profit)}</span> },
          { header: "Margin", render: (i) => `${Number(i.marginPercent || 0).toFixed(1)}%` },
        ]}
        data={reportData}
      />
    </Card>
  );

  const renderPagedTable = () => {
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

    if (activeTab === "productPerformance") return <ProductPerformance />;

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
              { header: "Item", accessor: "itemName" },
              { header: "Stock", render: (i) => <span className="font-bold text-red-600">{formatDisplayStockBaseQuantity(i.totalQty, i, i.defaultUnit)}</span> },
              { header: "Reorder Level", render: (i) => formatDisplayStockBaseQuantity(i.reorderLevel, i, i.defaultUnit) },
              { header: "Status", render: () => <span className="rounded bg-red-100 px-2 py-1 text-xs font-bold text-red-700">LOW</span> },
            ]}
            data={reportData}
          />
        </Card>
      );
    }
    return null;
  };

  const hasActiveReportData = loadedTab === activeTab;

  return (
    <div className="page-enter space-y-6 pb-10">
      <div className="page-section-enter flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">{pageTitleByMode[mode] || "Reports"}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "basic" ? "Quick chart overview for business direction." : "Detailed paginated report data with Excel export."}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
          <Calendar size={16} className="text-slate-400" />
          {activeDateLabel}
          <span className="text-slate-300">|</span>
          <span className="font-medium text-slate-500">{datePreset === "allTime" ? "All records" : `${dateRange.from} to ${dateRange.to}`}</span>
        </div>
      </div>

      <Card className="admin-panel-card overflow-visible p-0">
        <div className="inventory-filter-bar border-b border-slate-100 bg-slate-50/50 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="flex flex-wrap gap-2">
              {datePresetOptions.map((option) => (
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

          {isPagedTab && (
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
      </Card>

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
                  <Button variant="outline" size="sm" onClick={exportChartAsImage}>
                    <PieIcon size={16} className="mr-2" /> Save Image
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportToPDF}>
                    <Download size={16} className="mr-2" /> Download PDF
                  </Button>
                </>
              )}
            </div>

            <div ref={reportRef} className="admin-panel-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-8 flex items-end justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">
                    {allTabs.find((tab) => tab.id === activeTab)?.label || "Report"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">Period: {datePreset === "allTime" ? "All Time" : `${dateRange.from} to ${dateRange.to}`}</p>
                </div>
                <p className="text-right text-xs text-slate-400">Generated: {new Date().toLocaleString()}</p>
              </div>

              {renderReportContent()}
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
