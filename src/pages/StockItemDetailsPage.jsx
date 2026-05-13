import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Boxes, CalendarDays, Package, Search, Tag, Workflow } from "lucide-react";
import { stockAPI } from "../api/stock.api";
import { suppliersAPI } from "../api/suppliers.api";
import { useBranch } from "../context/BranchContext";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import LoadingSpinner from "../components/common/LoadingSpinner";
import CustomSelect from "../components/common/CustomSelect";
import TablePagination from "../components/common/TablePagination";
import { formatCurrency, formatDateTime } from "../utils/formatters";

const purchaseStatusOptions = [
  { value: "ALL", label: "All Status" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELED", label: "Canceled" },
];

const formatQty = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return String(value ?? "");
  }
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(3).replace(/\.?0+$/, "");
};

const formatQtyWithUnit = (value, unit) => (unit ? `${formatQty(value)} ${unit}` : formatQty(value));

const StockItemDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedBranchId } = useBranch();
  const branchId = selectedBranchId || 0;

  const [itemDetails, setItemDetails] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
  const [supplierQuery, setSupplierQuery] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pageInput, setPageInput] = useState("1");
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    const loadItemDetails = async () => {
      setLoading(true);
      try {
        const response = await stockAPI.getItem(branchId, id);
        setItemDetails(response.data);
      } catch (error) {
        console.error("Failed to load stock item details", error);
        setItemDetails(null);
        navigate("/stock", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    loadItemDetails();
  }, [branchId, id, navigate]);

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const response = await suppliersAPI.list();
        setSuppliers(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Failed to load suppliers for stock filters", error);
        setSuppliers([]);
      }
    };

    loadSuppliers();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const loadPurchaseHistory = async () => {
        if (!itemDetails) {
          return;
        }
        setHistoryLoading(true);
        try {
          const response = await stockAPI.getItemPurchases(branchId, id, {
            page,
            size: pageSize,
            search: search.trim() || undefined,
            supplierId: selectedSupplierId || undefined,
            status: status !== "ALL" ? status : undefined,
            from: fromDate || undefined,
            to: toDate || undefined,
          });
          const content = response.data?.content || [];
          setPurchaseHistory(content);
          setTotalPages(response.data?.totalPages || 0);
          setTotalElements(response.data?.totalElements || content.length);
        } catch (error) {
          console.error("Failed to load stock purchase history", error);
          setPurchaseHistory([]);
          setTotalPages(0);
          setTotalElements(0);
        } finally {
          setHistoryLoading(false);
        }
      };

      loadPurchaseHistory();
    }, 250);

    return () => clearTimeout(timer);
  }, [branchId, fromDate, id, itemDetails, page, pageSize, search, selectedSupplierId, status, toDate]);

  useEffect(() => {
    setPageInput(String(page + 1));
  }, [page]);

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => String(supplier.id) === String(selectedSupplierId)),
    [selectedSupplierId, suppliers]
  );

  const filteredSuppliers = useMemo(() => {
    const query = supplierQuery.trim().toLowerCase();
    const source = Array.isArray(suppliers) ? suppliers : [];
    const matches = query
      ? source.filter((supplier) => String(supplier.name || "").toLowerCase().includes(query))
      : source;
    return matches.slice(0, 8);
  }, [supplierQuery, suppliers]);

  const metaBadges = useMemo(() => {
    if (!itemDetails) return [];
    return [
      itemDetails.itemType,
      itemDetails.defaultUnit ? `Unit: ${itemDetails.defaultUnit}` : null,
      itemDetails.reorderLevel ? `Reorder: ${formatQtyWithUnit(itemDetails.reorderLevel, itemDetails.defaultUnit)}` : null,
    ].filter(Boolean);
  }, [itemDetails]);

  const summaryCards = useMemo(
    () => {
      if (!itemDetails) {
        return [];
      }

      return [
        {
          key: "stock",
          label: "Total Stock",
          value: formatQtyWithUnit(itemDetails.displayQuantity, itemDetails.itemType === "WEIGHT" ? "KG" : itemDetails.defaultUnit),
          helper: "Total available quantity",
          icon: Package,
          tone: "bg-blue-50 text-blue-700",
        },
        {
          key: "batches",
          label: "Active Batches",
          value: String(itemDetails.activeBatches?.length || 0),
          helper: "Batches currently active",
          icon: Boxes,
          tone: "bg-emerald-50 text-emerald-700",
        },
        {
          key: "category",
          label: "Category",
          value: itemDetails.categoryName || "-",
          helper: "Item category",
          icon: Tag,
          tone: "bg-slate-100 text-slate-700",
        },
        {
          key: "sub-category",
          label: "Sub Category",
          value: itemDetails.subCategoryName || "-",
          helper: "Item sub category",
          icon: Workflow,
          tone: "bg-violet-50 text-violet-700",
        },
      ];
    },
    [itemDetails]
  );

  const resetPage = () => setPage(0);

  const clearSupplierFilter = () => {
    setSelectedSupplierId("");
    setSupplierQuery("");
    setSupplierDropdownOpen(false);
    resetPage();
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("ALL");
    setFromDate("");
    setToDate("");
    setSelectedSupplierId("");
    setSupplierQuery("");
    setSupplierDropdownOpen(false);
    setPage(0);
  };

  const handleSupplierInputChange = (value) => {
    setSupplierQuery(value);
    if (selectedSupplierId) {
      setSelectedSupplierId("");
    }
    setSupplierDropdownOpen(true);
    resetPage();
  };

  const handleSupplierSelect = (supplier) => {
    setSelectedSupplierId(String(supplier.id));
    setSupplierQuery(supplier.name || "");
    setSupplierDropdownOpen(false);
    resetPage();
  };

  const goToPage = () => {
    const requestedPage = Number(pageInput);
    if (!Number.isInteger(requestedPage)) {
      setPageInput(String(page + 1));
      return;
    }

    const maxPage = totalPages > 0 ? totalPages : 1;
    setPage(Math.min(Math.max(requestedPage, 1), maxPage) - 1);
  };

  if (loading) {
    return <LoadingSpinner text="Loading stock item..." />;
  }

  if (!itemDetails) {
    return <div className="p-10 text-center text-red-500">Stock item not found.</div>;
  }

  return (
    <div className="page-enter space-y-6">
      <div className="flex flex-col gap-4">
        <div className="page-section-enter min-w-0" style={{ animationDelay: "40ms" }}>
          <Button variant="secondary" onClick={() => navigate("/stock")} className="mb-3">
            <ArrowLeft size={18} className="mr-2" /> Back to Stock
          </Button>
          <h1 className="text-3xl font-bold text-slate-800">{itemDetails.itemName}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {metaBadges.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.key}
                className="inventory-kpi-card shell-panel shell-panel-hover border border-slate-200 p-6 shadow-sm"
                style={{ animationDelay: `${90 + summaryCards.indexOf(card) * 40}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${card.tone}`}>
                    <Icon size={28} />
                  </div>
                  <div className="h-16 w-px bg-slate-200" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-500">{card.label}</div>
                    <div className="mt-1 truncate text-2xl font-bold text-slate-900">{card.value}</div>
                    <div className="mt-1 text-sm text-slate-500">{card.helper}</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <Card className="sales-panel-enter overflow-hidden border border-slate-200 p-0 shadow-sm" style={{ animationDelay: "130ms" }}>
        <div className="border-b bg-white px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-slate-100 p-2 text-slate-700">
              <CalendarDays size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Active Stock Batches</h2>
              <p className="text-sm text-slate-500">Current available batches for this item</p>
            </div>
          </div>
        </div>

        <div className="app-table-wrap">
          <table className="app-table min-w-[760px]">
            <thead className="app-table-head">
              <tr>
                <th className="p-4 font-semibold uppercase">Batch</th>
                <th className="p-4 font-semibold uppercase">Branch</th>
                <th className="p-4 font-semibold uppercase">Qty</th>
                <th className="p-4 text-right font-semibold uppercase">Cost</th>
                <th className="p-4 text-right font-semibold uppercase">Selling</th>
                <th className="p-4 font-semibold uppercase">Received</th>
                <th className="p-4 font-semibold uppercase">Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itemDetails.activeBatches?.length ? (
                itemDetails.activeBatches.map((batch) => (
                  <tr key={batch.batchId} className="hover:bg-slate-50">
                    <td className="p-4 font-semibold text-slate-800">{batch.batchCode || `Batch #${batch.batchId}`}</td>
                    <td className="p-4 text-slate-600">{batch.branchName || `Branch #${batch.branchId}`}</td>
                    <td className="p-4">
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        {formatQtyWithUnit(batch.displayQty, batch.displayUnit)}
                      </span>
                    </td>
                    <td className="p-4 text-right text-slate-700">{formatCurrency(batch.costPrice || 0)}</td>
                    <td className="p-4 text-right font-semibold text-slate-800">{formatCurrency(batch.sellingPrice || 0)}</td>
                    <td className="p-4 text-slate-600">{formatDateTime(batch.receivedAt)}</td>
                    <td className="p-4 text-slate-600">{batch.expiry ? formatDateTime(batch.expiry) : "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-slate-500">
                    No active batches available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="sales-panel-enter overflow-hidden border border-slate-200 p-0 shadow-sm" style={{ animationDelay: "170ms" }}>
        <div className="border-b bg-white px-5 py-4">
          <div className="flex flex-col gap-1 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-slate-100 p-2 text-slate-700">
                <CalendarDays size={18} />
              </div>
              <div>
              <h2 className="text-lg font-bold text-slate-800">Purchase History</h2>
              <p className="text-sm text-slate-500">Showing {purchaseHistory.length} of {totalElements} records</p>
              </div>
            </div>
          </div>
        </div>

        <div className="inventory-filter-bar border-b bg-white px-4 py-4" style={{ animationDelay: "210ms" }}>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-center">
            <div className="relative lg:col-span-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  resetPage();
                }}
                placeholder="Search invoice or GRN..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="relative lg:col-span-3">
              <input
                type="text"
                value={selectedSupplier ? selectedSupplier.name : supplierQuery}
                onFocus={() => setSupplierDropdownOpen(true)}
                onBlur={() => window.setTimeout(() => setSupplierDropdownOpen(false), 150)}
                onChange={(e) => handleSupplierInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filteredSuppliers.length > 0) {
                    handleSupplierSelect(filteredSuppliers[0]);
                  }
                }}
                placeholder="Search supplier..."
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 pr-10 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {(selectedSupplierId || supplierQuery) && (
                <button
                  type="button"
                  onClick={clearSupplierFilter}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}

              {supplierDropdownOpen && filteredSuppliers.length > 0 && !selectedSupplierId && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  {filteredSuppliers.map((supplier) => (
                    <button
                      key={supplier.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSupplierSelect(supplier)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <span className="truncate">{supplier.name}</span>
                      {supplier.phone ? <span className="ml-3 text-xs text-slate-400">{supplier.phone}</span> : null}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              <CustomSelect
                value={status}
                onChange={(value) => {
                  setStatus(value);
                  resetPage();
                }}
                options={purchaseStatusOptions}
                valueKey="value"
                labelKey="label"
                buttonClassName="h-10 rounded-lg"
              />
            </div>

            <div className="lg:col-span-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  resetPage();
                }}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="lg:col-span-2">
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  resetPage();
                }}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="lg:col-span-12 flex justify-end">
              <Button type="button" variant="secondary" onClick={clearFilters} disabled={historyLoading} className="h-10 px-4 text-sm">
                Clear
              </Button>
            </div>
          </div>
        </div>

        <div className="app-table-wrap">
          <table className="app-table min-w-[920px] whitespace-nowrap">
            <thead className="app-table-head">
              <tr>
                <th className="p-4 font-semibold uppercase">Received</th>
                <th className="p-4 font-semibold uppercase">Invoice</th>
                <th className="p-4 font-semibold uppercase">GRN</th>
                <th className="p-4 font-semibold uppercase">Supplier</th>
                <th className="p-4 font-semibold uppercase">Qty</th>
                <th className="p-4 text-right font-semibold uppercase">Cost</th>
                <th className="p-4 text-right font-semibold uppercase">Line Total</th>
                <th className="p-4 text-center font-semibold uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historyLoading ? (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-slate-500">
                    Loading...
                  </td>
                </tr>
              ) : purchaseHistory.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-slate-500">
                    No purchase history found for this item.
                  </td>
                </tr>
              ) : (
                purchaseHistory.map((entry) => (
                  <tr
                    key={`${entry.purchaseId}-${entry.grnNo}-${entry.receivedAt}`}
                    className="cursor-pointer transition-colors hover:bg-blue-50"
                    onClick={() => navigate(`/purchases/${entry.purchaseId}`)}
                  >
                    <td className="p-4 text-slate-600">{formatDateTime(entry.receivedAt)}</td>
                    <td className="p-4 font-bold text-blue-600">{entry.invoiceNo}</td>
                    <td className="p-4 text-slate-700">{entry.grnNo}</td>
                    <td className="p-4 text-slate-700">{entry.supplierName}</td>
                    <td className="p-4 text-slate-700">{formatQtyWithUnit(entry.qty, entry.qtyUnit)}</td>
                    <td className="p-4 text-right text-slate-700">{formatCurrency(entry.costPrice || 0)}</td>
                    <td className="p-4 text-right font-semibold text-slate-800">{formatCurrency(entry.lineTotal || 0)}</td>
                    <td className="p-4 text-center">
                      <span
                        className={`rounded border px-2 py-1 text-xs font-bold ${
                          entry.status === "CANCELED"
                            ? "border-red-200 bg-red-100 text-red-700"
                            : "border-green-200 bg-green-100 text-green-700"
                        }`}
                      >
                        {entry.status || "COMPLETED"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          summary={`Page ${page + 1} of ${totalPages === 0 ? 1 : totalPages}`}
          page={page}
          pageInput={pageInput}
          totalPages={totalPages}
          loading={historyLoading}
          onPageChange={setPage}
          onPageInputChange={setPageInput}
          onGoToPage={goToPage}
        />
      </Card>
    </div>
  );
};

export default StockItemDetailsPage;
