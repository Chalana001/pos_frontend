import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Search, Package, AlertTriangle, Settings2, ArrowRightLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { stockAPI } from "../api/stock.api";
import { itemsAPI } from "../api/items.api";
import { categoriesAPI } from "../api/categories.api";
import api from '../api/axios';

import { useAuth } from "../context/AuthContext";
import { useBranch } from "../context/BranchContext";
import { ADJUSTMENT_TYPES } from "../utils/constants";
import { ItemType } from "../utils/constants";
import { formatCurrency } from "../utils/formatters";

import Card from "../components/common/Card";
import Table from "../components/common/Table";
import LoadingSpinner from "../components/common/LoadingSpinner";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import CustomSelect from "../components/common/CustomSelect";

const isWeightItem = (item) =>
  item?.itemType === ItemType.WEIGHT || item?.weightItem === true;

const formatQty = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return String(value ?? "");
  }
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(3).replace(/\.?0+$/, "");
};

const getDisplayQty = (entity, fallback = 0) => {
  if (isWeightItem(entity)) {
    const rawValue =
      entity?.qty ??
      entity?.totalQuantity ??
      entity?.availableBaseQty ??
      entity?.availableQty ??
      fallback;
    const numeric = Number(rawValue);
    return Number.isFinite(numeric) ? numeric / 1000 : 0;
  }

  const value =
    entity?.displayQty ??
    entity?.displayQuantity ??
    entity?.availableQty ??
    fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const getDisplayUnit = (entity, fallbackUnit = "") =>
  isWeightItem(entity) ? "KG" : (entity?.displayUnit ?? entity?.defaultUnit ?? fallbackUnit);

const formatQtyWithUnit = (value, unit) => (unit ? `${formatQty(value)} ${unit}` : formatQty(value));

const adjustmentTypeOptions = [
  { value: ADJUSTMENT_TYPES.EXPIRED, label: "Expired" },
  { value: ADJUSTMENT_TYPES.DAMAGED, label: "Damaged" },
  { value: ADJUSTMENT_TYPES.LOST, label: "Lost" },
  { value: ADJUSTMENT_TYPES.FOUND, label: "Found" },
  { value: ADJUSTMENT_TYPES.NEW_STOCK, label: "New Stock" },
  { value: ADJUSTMENT_TYPES.MANUAL, label: "Manual" },
];

const adjustmentDirectionOptions = [
  { value: "ADD", label: "+ Add" },
  { value: "REMOVE", label: "- Remove" },
];

const getDefaultAdjustmentDirection = (type) =>
  [ADJUSTMENT_TYPES.EXPIRED, ADJUSTMENT_TYPES.DAMAGED, ADJUSTMENT_TYPES.LOST].includes(type)
    ? "REMOVE"
    : "ADD";

const weightUnitOptions = [
  { value: "G", label: "Grams (G)" },
  { value: "KG", label: "Kilograms (KG)" },
];

const stockStatusOptions = [
  { value: "ALL", label: "All Stock" },
  { value: "REORDER", label: "Reorder Level" },
  { value: "OUT_OF_STOCK", label: "Out of Stock" },
  { value: "IN_STOCK", label: "In Stock" },
];

const Stock = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedBranchId } = useBranch();

  const [stockItems, setStockItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [stockValue, setStockValue] = useState(0);
  const [reorderAlertCount, setReorderAlertCount] = useState(0);
  const [outOfStockCount, setOutOfStockCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [branches, setBranches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [stockStatus, setStockStatus] = useState("ALL");
  const [categoryId, setCategoryId] = useState("");
  const [subCategoryId, setSubCategoryId] = useState("");

  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);

  const [selectedItem, setSelectedItem] = useState(null);
  const [itemBatches, setItemBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ Add qtyUnit to adjustFormData
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustFormData, setAdjustFormData] = useState({
    batchId: '',
    type: ADJUSTMENT_TYPES.MANUAL,
    direction: getDefaultAdjustmentDirection(ADJUSTMENT_TYPES.MANUAL),
    qty: '',
    qtyUnit: 'KG', 
    reason: '',
  });

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferFormData, setTransferFormData] = useState({
    batchId: '',
    toBranchId: '',
    qty: '',
    qtyUnit: 'KG',
    notes: '',
  });

  useEffect(() => {
    const fetchInitialFilters = async () => {
      try {
        const [branchRes, categoryRes] = await Promise.all([
          api.get('/branches'),
          categoriesAPI.getAll(),
        ]);
        setBranches(branchRes.data || []);
        setCategories(categoryRes.data || []);
      } catch (error) {
        toast.error("Failed to load stock filters");
      }
    };
    fetchInitialFilters();
  }, []);

  useEffect(() => {
    if (!categoryId) {
      setSubCategories([]);
      setSubCategoryId("");
      return;
    }

    const fetchSubCategories = async () => {
      try {
        const response = await categoriesAPI.getSubCategories(categoryId);
        setSubCategories(response.data || []);
      } catch (error) {
        setSubCategories([]);
        setSubCategoryId("");
        toast.error("Failed to load sub categories");
      }
    };

    fetchSubCategories();
  }, [categoryId]);

  const fetchStock = async () => {
    setLoading(true);
    try {
      const currentBranchId = selectedBranchId || 0;
      const response = await stockAPI.getByBranch(currentBranchId, {
        search: searchQuery,
        stockStatus,
        categoryId: categoryId || undefined,
        subCategoryId: subCategoryId || undefined,
        page: page,
        size: pageSize
      });

      const itemsArray = response.data.content ? response.data.content : (Array.isArray(response.data) ? response.data : []);
      setStockItems(itemsArray);
      setTotalPages(response.data.totalPages || 0);
      setTotalItems(response.data.totalElements || itemsArray.length);
      const valueResponse = await stockAPI.getValue(currentBranchId, {
        search: searchQuery,
        stockStatus,
        categoryId: categoryId || undefined,
        subCategoryId: subCategoryId || undefined,
      });
      setStockValue(Number(valueResponse.data?.stockValue || 0));
    } catch (error) {
      toast.error("Failed to fetch stock");
      setStockItems([]);
      setTotalItems(0);
      setStockValue(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchStockCounts = async () => {
    setLoadingCounts(true);
    try {
      const currentBranchId = selectedBranchId || 0;
      const baseParams = {
        search: searchQuery,
        categoryId: categoryId || undefined,
        subCategoryId: subCategoryId || undefined,
        page: 0,
        size: 1,
      };
      const [reorderRes, outRes] = await Promise.all([
        stockAPI.getByBranch(currentBranchId, { ...baseParams, stockStatus: "REORDER" }),
        stockAPI.getByBranch(currentBranchId, { ...baseParams, stockStatus: "OUT_OF_STOCK" }),
      ]);
      setReorderAlertCount(reorderRes.data.totalElements || 0);
      setOutOfStockCount(outRes.data.totalElements || 0);
    } catch (error) {
      setReorderAlertCount(0);
      setOutOfStockCount(0);
    } finally {
      setLoadingCounts(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStock();
      fetchStockCounts();
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranchId, searchQuery, stockStatus, categoryId, subCategoryId, page]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setPage(0);
  };

  const handleStockStatusChange = (value) => {
    setStockStatus(value);
    setPage(0);
  };

  const handleCategoryChange = (value) => {
    setCategoryId(value);
    setSubCategoryId("");
    setPage(0);
  };

  const handleSubCategoryChange = (value) => {
    setSubCategoryId(value);
    setPage(0);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStockStatus("ALL");
    setCategoryId("");
    setSubCategoryId("");
    setPage(0);
  };

  const loadItemBatches = async (item, setFormState) => {
    setSelectedItem(item);
    setLoadingBatches(true);
    setItemBatches([]);

    try {
      const currentBranchId = selectedBranchId || 0;
      const response = await itemsAPI.search(item.itemName, currentBranchId);

      const matchedItem = response.data?.find(i => i.id === item.itemId);
      const branchBatches = matchedItem?.batches || [];

      setItemBatches(branchBatches);
      setFormState(prev => ({
        ...prev,
        qtyUnit: isWeightItem(matchedItem || item) ? (matchedItem?.defaultUnit || item.defaultUnit || "KG") : prev.qtyUnit,
      }));

      if (branchBatches.length === 1) {
        setFormState(prev => ({ ...prev, batchId: String(branchBatches[0].batchId) }));
      }
    } catch (error) {
      console.error("Batch load error:", error);
      toast.error("Failed to load item batches");
    } finally {
      setLoadingBatches(false);
    }
  };

  const handleOpenAdjust = async (item) => {
    setAdjustFormData({
      batchId: '',
      type: ADJUSTMENT_TYPES.MANUAL,
      direction: getDefaultAdjustmentDirection(ADJUSTMENT_TYPES.MANUAL),
      qty: '',
      qtyUnit: isWeightItem(item) ? (item.defaultUnit || "KG") : "KG",
      reason: '',
    });
    setShowAdjustModal(true);
    await loadItemBatches(item, setAdjustFormData);
  };

  // ✅ Updated submit logic for weight items
  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustFormData.batchId) return toast.error("Please select a batch");

    setIsSubmitting(true);
    try {
      const currentBranchId = selectedBranchId || 0;
      const weightItem = isWeightItem(selectedItem);

      await api.post('/stock-adjustments', {
        ...adjustFormData,
        branchId: currentBranchId,
        itemId: selectedItem.itemId,
        batchId: parseInt(adjustFormData.batchId),
        direction: adjustFormData.direction,
        qty: weightItem ? parseFloat(adjustFormData.qty) : parseInt(adjustFormData.qty),
        qtyUnit: weightItem ? adjustFormData.qtyUnit : undefined,
      });

      toast.success('Stock adjusted successfully');
      setShowAdjustModal(false);
      fetchStock();
      fetchStockCounts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Adjustment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenTransfer = async (item) => {
    setTransferFormData({
      batchId: '',
      toBranchId: '',
      qty: '',
      qtyUnit: isWeightItem(item) ? (item.defaultUnit || "KG") : "KG",
      notes: '',
    });
    setShowTransferModal(true);
    await loadItemBatches(item, setTransferFormData);
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!transferFormData.batchId) return toast.error("Please select a batch");
    if (!transferFormData.toBranchId) return toast.error("Please select destination branch");

    setIsSubmitting(true);
    try {
      const currentBranchId = selectedBranchId || 0;
      const weightItem = isWeightItem(selectedItem);

      const payload = {
        fromBranchId: currentBranchId,
        toBranchId: parseInt(transferFormData.toBranchId),
        note: transferFormData.notes,
        items: [
          {
            itemId: selectedItem.itemId,
            batchId: parseInt(transferFormData.batchId),
            qty: weightItem ? parseFloat(transferFormData.qty) : parseInt(transferFormData.qty),
            qtyUnit: weightItem ? transferFormData.qtyUnit : undefined,
          }
        ]
      };

      await api.post('/stock-transfers', payload);

      toast.success('Stock transferred successfully');
      setShowTransferModal(false);
      fetchStock();
      fetchStockCounts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Transfer failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = useMemo(
    () => [
      { header: "Barcode", render: (item) => <span>{item.barcode ?? "-"}</span> },
      { header: "Name", render: (item) => <span className="font-medium text-slate-800">{item.itemName ?? "-"}</span> },
      { header: "Category", render: (item) => <span>{item.categoryName || item.subCategoryName || "-"}</span> },
      { header: "Cost", render: (item) => <span>LKR {Number(item.costPrice || 0).toFixed(2)}</span> },
      { header: "Selling", render: (item) => <span>LKR {Number(item.sellingPrice || 0).toFixed(2)}</span> },
      {
        header: "Quantity",
        render: (item) => {
          const displayQty = getDisplayQty(item, item.totalQuantity ?? 0);
          const displayUnit = getDisplayUnit(item, item.defaultUnit);
          const isLow = (item.totalQuantity ?? 0) <= 0;
          return (
            <span className={"font-semibold " + (isLow ? "text-red-600" : "text-slate-800")}>
              {formatQtyWithUnit(displayQty, displayUnit)}
              {isLow && <AlertTriangle size={14} className="inline ml-1 text-red-500" />}
            </span>
          );
        },
      },
      {
        header: "Status",
        render: (item) => {
          const qty = item.totalQuantity ?? 0;
          const reorderLevel = item.reorderLevel ?? 0;
          const isReorder = qty <= reorderLevel;
          return (
            <span className={"px-2 py-1 rounded-full text-xs font-medium " + (qty <= 0 ? "bg-red-100 text-red-800" : isReorder ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800")}>
              {qty <= 0 ? "Out of Stock" : isReorder ? "Reorder" : "In Stock"}
            </span>
          );
        },
      },
      {
        header: "Actions",
        render: (item) => (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenAdjust(item);
              }}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border-none"
            >
              <Settings2 size={16} /> Adjust
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenTransfer(item);
              }}
              className="flex items-center gap-1 text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 border-none"
              disabled={(item.totalQuantity ?? 0) <= 0}
            >
              <ArrowRightLeft size={16} /> Transfer
            </Button>
          </div>
        ),
      },
    ],
    [selectedBranchId]
  );

  const batchOptions = itemBatches.map((batch) => ({
    value: String(batch.batchId),
    label: `Batch #${batch.batchId} | Qty: ${formatQtyWithUnit(getDisplayQty(batch), getDisplayUnit(batch, selectedItem?.defaultUnit))} | Price: ${formatCurrency(batch.price)}`,
  }));

  const transferBranchOptions = branches
    .filter((branch) => String(branch.id) !== String(selectedBranchId || 0))
    .map((branch) => ({
      value: String(branch.id),
      label: branch.name,
    }));

  const categoryOptions = [
    { value: "", label: "All Categories" },
    ...categories.map((category) => ({
      value: String(category.id),
      label: category.name,
    })),
  ];

  const subCategoryOptions = [
    { value: "", label: "All Sub Categories" },
    ...subCategories.map((subCategory) => ({
      value: String(subCategory.id),
      label: subCategory.name,
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Stock Inventory</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-slate-600 mb-2">Total Items</h3>
              <p className="text-2xl font-bold text-slate-800">{totalItems}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="text-blue-600" size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-slate-600 mb-2">Reorder Alerts</h3>
              <div className="flex items-end gap-3">
                <p className="text-2xl font-bold text-amber-600">
                  {loadingCounts ? "..." : reorderAlertCount}
                </p>
                {outOfStockCount > 0 && (
                  <span className="mb-1 text-xs font-semibold text-red-600">{outOfStockCount} out</span>
                )}
              </div>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="text-amber-600" size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-medium text-slate-600 mb-2">Stock Value</h3>
          <p className="text-2xl font-bold text-green-600">LKR {Number(stockValue).toFixed(2)}</p>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(260px,1fr)_180px_220px_220px_auto] xl:items-center">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search name, barcode, or category..."
                className="h-[42px] w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <CustomSelect
              value={stockStatus}
              onChange={handleStockStatusChange}
              options={stockStatusOptions}
              valueKey="value"
              labelKey="label"
              placeholder="Stock Status"
              buttonClassName="h-[42px]"
            />
            <CustomSelect
              value={categoryId}
              onChange={handleCategoryChange}
              options={categoryOptions}
              valueKey="value"
              labelKey="label"
              placeholder="All Categories"
              buttonClassName="h-[42px]"
            />
            <CustomSelect
              value={subCategoryId}
              onChange={handleSubCategoryChange}
              options={subCategoryOptions}
              valueKey="value"
              labelKey="label"
              placeholder="All Sub Categories"
              disabled={!categoryId}
              buttonClassName="h-[42px]"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={clearFilters}
              className="h-[42px] px-4 text-sm"
            >
              Clear
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-12">
            <LoadingSpinner size="lg" text="Loading stock..." />
          </div>
        ) : (
          <Table
            columns={columns}
            data={stockItems}
            onRowClick={(item) => navigate(`/stock/item/${item.itemId}`)}
          />
        )}

        <div className="flex justify-between items-center p-4 bg-slate-50 border-t">
          <span className="text-sm text-slate-500">
            Page {page + 1} of {totalPages === 0 ? 1 : totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              disabled={page === 0 || loading}
              onClick={() => setPage(page - 1)}
              variant="secondary"
              className="px-3 py-1 text-sm"
            >
              Prev
            </Button>
            <Button
              disabled={page >= totalPages - 1 || loading}
              onClick={() => setPage(page + 1)}
              variant="secondary"
              className="px-3 py-1 text-sm"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        title={selectedItem ? `Adjust Stock: ${selectedItem.itemName}` : "Adjust Stock"}
      >
        <form onSubmit={handleAdjustSubmit} className="p-4 space-y-4">
          {loadingBatches ? (
            <div className="py-8"><LoadingSpinner text="Loading batches..." /></div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Batch *</label>
                {itemBatches.length === 1 ? (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                    <span className="text-sm text-blue-800 font-semibold">Batch #{itemBatches[0].batchId} Auto-selected</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">In Stock: {formatQtyWithUnit(getDisplayQty(itemBatches[0]), getDisplayUnit(itemBatches[0], selectedItem?.defaultUnit))}</span>
                  </div>
                ) : itemBatches.length > 1 ? (
                  <CustomSelect
                    value={adjustFormData.batchId}
                    onChange={(value) => setAdjustFormData({ ...adjustFormData, batchId: value })}
                    options={batchOptions}
                    valueKey="value"
                    labelKey="label"
                    placeholder="-- Choose a Batch --"
                  />
                ) : (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">No available batches.</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Adjustment Type *</label>
                <CustomSelect
                  value={adjustFormData.type}
                  onChange={(value) => setAdjustFormData({
                    ...adjustFormData,
                    type: value,
                    direction: getDefaultAdjustmentDirection(value),
                  })}
                  options={adjustmentTypeOptions}
                  valueKey="value"
                  labelKey="label"
                />
              </div>

              {/* ✅ Updated Quantity Input for Weight Items */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity *</label>
                <div className="flex gap-2">
                  <CustomSelect
                    value={adjustFormData.direction}
                    onChange={(value) => setAdjustFormData({ ...adjustFormData, direction: value })}
                    options={adjustmentDirectionOptions}
                    valueKey="value"
                    labelKey="label"
                    className="w-[118px] shrink-0"
                    buttonClassName="h-[42px] rounded-lg"
                  />
                  <input
                    type="number"
                    step={isWeightItem(selectedItem) ? (adjustFormData.qtyUnit === "G" ? "1" : "0.1") : "1"}
                    value={adjustFormData.qty}
                    onChange={(e) => setAdjustFormData({ ...adjustFormData, qty: e.target.value })}
                    className="flex-1 p-2 border border-slate-300 rounded-lg w-full"
                    placeholder="Enter quantity"
                    required
                  />
                  {isWeightItem(selectedItem) && (
                    <CustomSelect
                      value={adjustFormData.qtyUnit}
                      onChange={(value) => setAdjustFormData({ ...adjustFormData, qtyUnit: value })}
                      options={weightUnitOptions}
                      valueKey="value"
                      labelKey="label"
                      className="min-w-[150px]"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason *</label>
                <textarea
                  value={adjustFormData.reason}
                  onChange={(e) => setAdjustFormData({ ...adjustFormData, reason: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" disabled={isSubmitting || itemBatches.length === 0}>
                  {isSubmitting ? "Processing..." : "Confirm Adjustment"}
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>

      <Modal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        title={selectedItem ? `Transfer Stock: ${selectedItem.itemName}` : "Transfer Stock"}
      >
        <form onSubmit={handleTransferSubmit} className="p-4 space-y-4">
          {loadingBatches ? (
            <div className="py-8"><LoadingSpinner text="Loading batches..." /></div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">From Batch *</label>
                {itemBatches.length === 1 ? (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between">
                    <span className="text-sm text-purple-800 font-semibold">Batch #{itemBatches[0].batchId} Auto-selected</span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">In Stock: {formatQtyWithUnit(getDisplayQty(itemBatches[0]), getDisplayUnit(itemBatches[0], selectedItem?.defaultUnit))}</span>
                  </div>
                ) : itemBatches.length > 1 ? (
                  <CustomSelect
                    value={transferFormData.batchId}
                    onChange={(value) => setTransferFormData({ ...transferFormData, batchId: value })}
                    options={batchOptions}
                    valueKey="value"
                    labelKey="label"
                    placeholder="-- Choose a Batch --"
                  />
                ) : (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">No stock available to transfer.</div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">To Branch *</label>
                <CustomSelect
                  value={transferFormData.toBranchId}
                  onChange={(value) => setTransferFormData({ ...transferFormData, toBranchId: value })}
                  options={transferBranchOptions}
                  valueKey="value"
                  labelKey="label"
                  placeholder="-- Select Destination Branch --"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Quantity to Transfer *</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0.1"
                    step={isWeightItem(selectedItem) ? (transferFormData.qtyUnit === "G" ? "1" : "0.1") : "1"}
                    value={transferFormData.qty}
                    onChange={(e) => setTransferFormData({ ...transferFormData, qty: e.target.value })}
                    className="flex-1 p-2 border border-slate-300 rounded-lg"
                    placeholder="e.g., 5"
                    required
                  />
                  {isWeightItem(selectedItem) && (
                    <CustomSelect
                      value={transferFormData.qtyUnit}
                      onChange={(value) => setTransferFormData({ ...transferFormData, qtyUnit: value })}
                      options={weightUnitOptions}
                      valueKey="value"
                      labelKey="label"
                      className="min-w-[150px]"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={transferFormData.notes}
                  onChange={(e) => setTransferFormData({ ...transferFormData, notes: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  rows="2"
                  placeholder="Any details about this transfer..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={isSubmitting || itemBatches.length === 0}
                >
                  {isSubmitting ? "Processing..." : "Transfer Stock"}
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>

    </div>
  );
};

export default Stock;




