import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import SupplierQuickAddModal from "../components/purchase/SupplierQuickAddModal";
import CustomSelect from "../components/common/CustomSelect";
import DatePicker from "../components/common/DatePicker";
import PanelResizeHandle from "../components/common/PanelResizeHandle";
import { suppliersAPI } from "../api/suppliers.api";
import { itemsAPI } from "../api/items.api";
import { branchesAPI } from "../api/branches.api";
import { purchasesAPI } from "../api/purchases.api";
import { Plus, Trash2, Save, Copy, Search } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { ItemType } from "../utils/constants";
import { formatCurrency } from "../utils/formatters";
import {
  formatDisplayStockQuantity,
  formatStockQuantity,
  getDisplayStockQuantity,
  getPrimaryStockUnit,
  isMeasuredStockItem,
} from "../utils/stockQuantity";

const isMeasuredItem = (item) =>
  isMeasuredStockItem(item);

const weightUnitOptions = [
  { value: "G", label: "G" },
  { value: "KG", label: "KG" },
];

const volumeUnitOptions = [
  { value: "ML", label: "ML" },
  { value: "L", label: "L" },
];

const getMeasuredUnitOptions = (item) => item?.itemType === ItemType.VOLUME || item?.defaultUnit === "L" || item?.defaultUnit === "ML"
  ? volumeUnitOptions
  : weightUnitOptions;

const calculateMeasuredLineTotal = (qty, unit, costPrice, measuredItem) => {
  const normalizedQty = Number(qty || 0);
  const normalizedCost = Number(costPrice || 0);
  if (!measuredItem) return normalizedQty * normalizedCost;
  return (unit === "G" || unit === "ML")
    ? (normalizedQty / 1000) * normalizedCost
    : normalizedQty * normalizedCost;
};

const getPrimaryUnitQty = (item) => {
  const qty = Number(item?.qty || 0);
  if (!item?.weightItem) return qty;
  return item.qtyUnit === "G" || item.qtyUnit === "ML" ? qty / 1000 : qty;
};

const paymentMethodOptions = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "BANK", label: "Bank" },
  { value: "CHEQUE", label: "Cheque" },
];

const cashSourceOptions = [
  { value: "BRANCH_CASH", label: "Branch Cash" },
  { value: "CASH_DRAWER", label: "Cash Drawer" },
];

const getAutoCashSourceForPaymentMethod = (method) => {
  if (method === "CASH") return null;
  if (method === "BANK") return "BANK";
  return "NONE";
};

const getCashSourceLabel = (value) => {
  if (value === "BRANCH_CASH") return "Branch Cash";
  if (value === "CASH_DRAWER") return "Cash Drawer";
  if (value === "BANK") return "Bank";
  return "No Cash Out";
};

const PurchaseFormPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManager = user?.role === "MANAGER";

  // 🚀 Refs
  const searchInputRef = useRef(null);
  const firstQtyInputRef = useRef(null);
  const panelsContainerRef = useRef(null);

  // --- HEADER DATA ---
  const [branches, setBranches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [supplierId, setSupplierId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [discountAmount, setDiscountAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [cashSource, setCashSource] = useState("BRANCH_CASH");
  const [cashSourceBranchId, setCashSourceBranchId] = useState("");

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [selectionPanelWidth, setSelectionPanelWidth] = useState(null);
  const [isResizingPanels, setIsResizingPanels] = useState(false);
  const resizeStateRef = useRef({ startX: 0, startWidth: 620 });

  // --- ITEM SELECTION & DISTRIBUTION STATE ---
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  const [branchInputs, setBranchInputs] = useState({});

  // --- CART STATE ---
  const [cartItems, setCartItems] = useState([]);

  const formatStockQty = (item) => {
    if (item.batches && item.batches.length > 0) {
      const totalDisplayQty = item.batches.reduce(
        (sum, batch) => sum + getDisplayStockQuantity(batch, 0, item),
        0
      );
      return `${formatStockQuantity(totalDisplayQty)} ${getPrimaryStockUnit(item, item.defaultUnit || "PCS")}`;
    }

    return formatDisplayStockQuantity(item);
  };

  useEffect(() => {
    loadInitialData();
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    const setDefaultPanelWidth = () => {
      const containerWidth = panelsContainerRef.current?.getBoundingClientRect().width;
      if (!containerWidth) {
        return;
      }

      const resizeHandleWidth = 12;
      const totalGapWidth = 32;
      const availableWidth = Math.max(0, containerWidth - resizeHandleWidth - totalGapWidth);
      setSelectionPanelWidth(Math.max(420, Math.floor(availableWidth / 2)));
    };

    requestAnimationFrame(setDefaultPanelWidth);
  }, []);

  useEffect(() => {
    if (!isResizingPanels) {
      return undefined;
    }

    const handleMouseMove = (event) => {
      const deltaX = event.clientX - resizeStateRef.current.startX;
      const containerWidth = panelsContainerRef.current?.getBoundingClientRect().width || window.innerWidth;
      const resizeHandleWidth = 12;
      const totalGapWidth = 32;
      const availableWidth = Math.max(0, containerWidth - resizeHandleWidth - totalGapWidth);
      const maxWidth = Math.max(520, Math.floor(availableWidth * 0.5));
      const nextWidth = Math.max(420, Math.min(maxWidth, resizeStateRef.current.startWidth + deltaX));
      setSelectionPanelWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsResizingPanels(false);
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingPanels]);

  const handleResizeStart = (event) => {
    event.preventDefault();
    resizeStateRef.current = {
      startX: event.clientX,
      startWidth: selectionPanelWidth || 520,
    };
    setIsResizingPanels(true);
  };

  const loadInitialData = async () => {
    try {
      const [suppRes, branchRes] = await Promise.all([
        suppliersAPI.list(),
        branchesAPI.getAll()
      ]);
      setSuppliers(suppRes.data || []);
      const branchList = branchRes.data || [];
      setBranches(isManager
        ? branchList.filter((branch) => Number(branch.id) === Number(user?.branchId))
        : branchList);
    } catch (e) {
      toast.error("Failed to load initial data");
    }
  };

  const handleSupplierCreated = (newSupplier) => {
    setSuppliers((prev) => [...prev, newSupplier]);
    setSupplierId(newSupplier.id);
  };

  // --- 1. SEARCH ITEM ---
  const searchItems = async (q) => {
    setSearch(q);
    if (!q) {
      setSearchResults([]);
      return;
    }
    try {
      const purchaseBranchId = isManager ? user?.branchId : 0;
      const res = await itemsAPI.searchForPurchase(q, purchaseBranchId);
      setSearchResults(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!search.trim() || searchResults.length === 0) {
        toast.error("Item not found!");
        setSearch("");
        return;
      }

      const exactMatch = searchResults.find(
        item => item.barcode?.toLowerCase() === search.toLowerCase()
      );

      const itemToSelect = exactMatch || searchResults[0];

      if (itemToSelect) {
        selectItem(itemToSelect);
      }
    }
  };

  // --- 2. SELECT ITEM & INITIALIZE BRANCH INPUTS ---
  const selectItem = (item) => {
    setSelectedItem(item);
    setSearch("");
    setSearchResults([]);

    const initialInputs = {};
    branches.forEach(b => {
      initialInputs[b.id] = {
        cost: item.costPrice || 0,
        sell: item.sellingPrice || 0,
        qty: "",
        qtyUnit: item.defaultUnit || "PCS",
        expiry: ""
      };
    });
    setBranchInputs(initialInputs);

    setTimeout(() => {
      if (firstQtyInputRef.current) {
        firstQtyInputRef.current.focus();
      }
    }, 100);
  };

  const handleInputChange = (branchId, field, value) => {
    setBranchInputs(prev => ({
      ...prev,
      [branchId]: {
        ...prev[branchId],
        [field]: value
      }
    }));
  };

  const applyPricesToAll = (sourceBranchId) => {
    const source = branchInputs[sourceBranchId];
    const newInputs = { ...branchInputs };
    branches.forEach(b => {
      if (b.id !== sourceBranchId) {
        newInputs[b.id] = {
          ...newInputs[b.id],
          cost: source.cost,
          sell: source.sell,
          expiry: source.expiry
        };
      }
    });
    setBranchInputs(newInputs);
    toast.success("Prices applied to all branches");
  };

  // --- 3. ADD TO CART ---
  const handleAddToList = () => {
    if (!selectedItem) return;

    const newRows = [];

    Object.entries(branchInputs).forEach(([branchIdStr, data]) => {
      const weightItem = isMeasuredItem(selectedItem);
      const qty = weightItem ? parseFloat(data.qty) : Number(data.qty);

      if (qty > 0) {
        const branch = branches.find(b => b.id == branchIdStr);

        newRows.push({
          uniqueId: Date.now() + Math.random(),
          itemId: selectedItem.id,
          name: selectedItem.name,
          barcode: selectedItem.barcode,
          branchId: Number(branchIdStr),
          branchName: branch?.name || "Unknown",
          qty: qty,
          qtyUnit: weightItem ? data.qtyUnit : undefined,
          weightItem: weightItem,
          costPrice: Number(data.cost),
          sellingPrice: Number(data.sell),
          expiryDate: data.expiry || null,
          lineTotal: calculateMeasuredLineTotal(qty, data.qtyUnit, data.cost, weightItem)
        });
      }
    });

    if (newRows.length === 0) {
      toast.error("Please enter Quantity for at least one branch");
      return;
    }

    setCartItems(prev => [...prev, ...newRows]);
    setSelectedItem(null);
    setBranchInputs({});

    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleRemoveItem = (index) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // --- 4. SUBMIT ---
  const handleSubmit = async () => {
    if (!supplierId) return toast.error("Please select a Supplier");
    if (cartItems.length === 0) return toast.error("No items in the list");
    const normalizedDiscountAmount = Number(discountAmount || 0);
    const normalizedPaidAmount = Number(paidAmount || 0);
    if (normalizedDiscountAmount < 0) return toast.error("Discount amount cannot be negative");
    if (normalizedDiscountAmount > subtotal) return toast.error("Discount amount cannot exceed subtotal");
    if (normalizedPaidAmount < 0) return toast.error("Paid amount cannot be negative");
    if (normalizedPaidAmount > grandTotal) return toast.error("Paid amount cannot exceed grand total");
    const autoCashSource = getAutoCashSourceForPaymentMethod(paymentMethod);
    const effectiveCashSource = normalizedPaidAmount > 0
      ? (autoCashSource || cashSource || "BRANCH_CASH")
      : "NONE";
    if (normalizedPaidAmount > 0 && paymentMethod === "CASH" && !cashSource) return toast.error("Please select a cash source");
    const branchIdsInPurchase = [...new Set(cartItems.map((item) => Number(item.branchId)))];
    const needsDrawerBranch = effectiveCashSource === "CASH_DRAWER" && branchIdsInPurchase.length > 1;
    if (needsDrawerBranch && !cashSourceBranchId) return toast.error("Please select the drawer branch");

    const branchesMap = {};

    cartItems.forEach(item => {
      if (!branchesMap[item.branchId]) {
        branchesMap[item.branchId] = {
          branchId: item.branchId,
          items: []
        };
      }

      branchesMap[item.branchId].items.push({
        itemId: item.itemId,
        qty: item.qty,
        qtyUnit: item.qtyUnit,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        expiryDate: item.expiryDate
      });
    });

    const branchesPayload = Object.values(branchesMap);

    const payload = {
      supplierId: Number(supplierId),
      // 🟢 වෙනස් කරපු තැන: invoiceNo හිස් නම් null යවනවා 
      invoiceNo: invoiceNo ? invoiceNo : null,
      discountAmount: normalizedDiscountAmount,
      paidAmount: normalizedPaidAmount,
      paymentMethod,
      cashSource: effectiveCashSource,
      cashSourceBranchId: effectiveCashSource === "CASH_DRAWER"
        ? Number(cashSourceBranchId || branchIdsInPurchase[0] || 0)
        : null,
      branches: branchesPayload
    };

    try {
      await purchasesAPI.create(payload);
      toast.success("Purchase saved successfully!");
      navigate("/purchases");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to save purchase.");
    }
  };

  const subtotal = cartItems.reduce((acc, curr) => acc + curr.lineTotal, 0);
  const normalizedDiscountAmount = Math.max(0, Number(discountAmount || 0));
  const grandTotal = Math.max(0, subtotal - normalizedDiscountAmount);
  const normalizedPaidAmount = Math.max(0, Number(paidAmount || 0));
  const dueAmount = Math.max(0, grandTotal - normalizedPaidAmount);
  const branchIdsInPurchase = [...new Set(cartItems.map((item) => Number(item.branchId)))];
  const autoCashSource = getAutoCashSourceForPaymentMethod(paymentMethod);
  const effectiveDisplayCashSource = normalizedPaidAmount > 0
    ? (autoCashSource || cashSource || "BRANCH_CASH")
    : "NONE";
  const canSelectCashSource = normalizedPaidAmount > 0 && paymentMethod === "CASH";
  const drawerBranchOptions = branches
    .filter((branch) => branchIdsInPurchase.includes(Number(branch.id)))
    .map((branch) => ({ value: String(branch.id), label: branch.name }));
  const effectiveCostForLine = (item, index) => {
    if (normalizedDiscountAmount <= 0 || subtotal <= 0) {
      return item.costPrice;
    }

    const allocatedBefore = cartItems.slice(0, index).reduce((sum, line) => {
      const lineDiscount = (normalizedDiscountAmount * line.lineTotal) / subtotal;
      return sum + Number(lineDiscount.toFixed(2));
    }, 0);
    const lineDiscount = index === cartItems.length - 1
      ? normalizedDiscountAmount - allocatedBefore
      : Number(((normalizedDiscountAmount * item.lineTotal) / subtotal).toFixed(2));
    const netLineTotal = Math.max(0, item.lineTotal - lineDiscount);
    const qty = getPrimaryUnitQty(item);

    return qty > 0 ? netLineTotal / qty : item.costPrice;
  };

  return (
    <div className="page-enter space-y-6 pb-10">
      <div className="page-section-enter flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" style={{ animationDelay: "40ms" }}>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">New Purchase</h1>
          <p className="mt-1 text-sm text-slate-500">Add supplier invoice items and distribute stock by branch.</p>
        </div>
        <div className="purchase-summary-card shell-panel shell-panel-hover rounded-xl border border-slate-200 bg-white px-5 py-3 text-right shadow-sm" style={{ animationDelay: "90ms" }}>
          <p className="text-sm font-medium text-slate-500">Grand Total</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(grandTotal)}</p>
          {normalizedDiscountAmount > 0 ? (
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Subtotal {formatCurrency(subtotal)} - Discount {formatCurrency(normalizedDiscountAmount)}
            </p>
          ) : null}
          <p className={`mt-1 text-sm font-semibold ${dueAmount > 0 ? "text-red-600" : "text-emerald-600"}`}>
            Supplier Due: {formatCurrency(dueAmount)}
          </p>
        </div>
      </div>

      <Card className="sales-panel-enter overflow-visible p-0" style={{ animationDelay: "120ms" }}>
        <div className="inventory-filter-bar border-b border-slate-100 bg-slate-50/50 p-4" style={{ animationDelay: "150ms" }}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
            {/* Supplier Select */}
            <div>
              <label className="label-text">Supplier</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <CustomSelect
                    value={supplierId}
                    onChange={setSupplierId}
                    options={suppliers}
                    placeholder="Select Supplier"
                    disabled={cartItems.length > 0}
                  />
                </div>
                <Button
                  onClick={() => setShowSupplierModal(true)}
                  variant="secondary"
                  className="shrink-0 px-3"
                  disabled={cartItems.length > 0}
                >
                  <Plus size={18} />
                </Button>
              </div>
            </div>

            <div>
              <label className="label-text">Invoice No</label>
              <input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="input w-full" placeholder="Ex: INV-999" />
            </div>
            <div>
              <label className="label-text">Date</label>
              <DatePicker value={date} onChange={setDate} buttonClassName="input h-10 w-full" />
            </div>
            <div>
              <label className="label-text">Supplier Discount</label>
              <input
                type="number"
                min="0"
                max={subtotal || 0}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="input w-full text-right"
                placeholder="0.00"
              />
              <p className="mt-1 text-xs text-slate-500">Discount given on this invoice.</p>
            </div>
            <div>
              <label className="label-text">Paid to Supplier</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max={grandTotal || 0}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="input w-full text-right"
                  placeholder="0.00"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setPaidAmount(String(grandTotal))}
                  disabled={cartItems.length === 0}
                  className="shrink-0 px-3"
                >
                  Full
                </Button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Balance will be added to supplier payable.
              </p>
            </div>
            <div>
              <label className="label-text">Payment Method</label>
              <CustomSelect
                value={paymentMethod}
                onChange={(value) => {
                  setPaymentMethod(value);
                  if (value !== "CASH") setCashSourceBranchId("");
                  if (value === "CASH" && cashSource === "BANK") setCashSource("BRANCH_CASH");
                }}
                options={paymentMethodOptions}
              />
            </div>
            <div>
              <label className="label-text">Cash Source</label>
              <CustomSelect
                value={effectiveDisplayCashSource}
                onChange={(value) => {
                  setCashSource(value);
                  if (value !== "CASH_DRAWER") setCashSourceBranchId("");
                }}
                options={canSelectCashSource
                  ? cashSourceOptions
                  : [{ value: effectiveDisplayCashSource, label: getCashSourceLabel(effectiveDisplayCashSource) }]
                }
                disabled={!canSelectCashSource}
              />
              <p className="mt-1 text-xs text-slate-500">
                {canSelectCashSource
                  ? "Cash payments can use branch cash or your open drawer shift."
                  : paymentMethod === "CASH"
                    ? "Enter a paid amount to select a cash source."
                    : "Cash source is set automatically for this payment method."}
              </p>
            </div>
            {effectiveDisplayCashSource === "CASH_DRAWER" && branchIdsInPurchase.length > 1 && (
              <div>
                <label className="label-text">Drawer Branch</label>
                <CustomSelect
                  value={cashSourceBranchId}
                  onChange={setCashSourceBranchId}
                  options={drawerBranchOptions}
                  valueKey="value"
                  labelKey="label"
                  placeholder="Select branch"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Uses your open shift in this branch.
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div ref={panelsContainerRef} className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div
          className="purchase-split-panel w-full min-w-0 flex-shrink-0 space-y-4"
          style={{ width: selectionPanelWidth ? `min(100%, ${selectionPanelWidth}px, 50%)` : "50%", animationDelay: "190ms" }}
        >
          <Card className="sales-panel-enter overflow-visible p-0" style={{ animationDelay: "180ms" }}>
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <h3 className="text-lg font-semibold text-slate-800">Select Item</h3>
              <p className="mt-1 text-sm text-slate-500">Search item, then enter branch quantities and prices.</p>
            </div>

            <div className="p-4">
              <div className="relative mb-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  ref={searchInputRef}
                  placeholder="Scan barcode or type name..."
                  value={search}
                  onChange={(e) => searchItems(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="h-[42px] w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                {searchResults.length > 0 && (
                  <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-100 bg-white py-1 shadow-xl custom-scrollbar">
                    {searchResults.map((item, index) => {
                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => selectItem(item)}
                          className="purchase-line-card flex w-full items-center justify-between gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-50"
                          style={{ animationDelay: `${70 + Math.min(index, 5) * 35}ms` }}
                        >
                          <div className="min-w-0">
                            <div className="truncate font-medium text-slate-800">{item.name}</div>
                            <div className="truncate text-xs text-slate-500">{item.barcode}</div>
                          </div>
                          <div className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            Stock: {formatStockQty(item)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedItem && (
                <div className="page-section-enter" style={{ animationDelay: "220ms" }}>
                  <div className="purchase-summary-card mb-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3" style={{ animationDelay: "250ms" }}>
                    <div className="min-w-0">
                      <div className="truncate font-bold text-slate-800">{selectedItem.name}</div>
                      <div className="truncate text-xs text-slate-500">{selectedItem.barcode}</div>
                    </div>
                    <button onClick={() => { setSelectedItem(null); if (searchInputRef.current) searchInputRef.current.focus(); }} className="shrink-0 text-xs font-semibold text-red-500 hover:underline">
                      Cancel
                    </button>
                  </div>

                  <div className="custom-scrollbar max-h-[520px] overflow-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[760px] text-left text-sm">
                      <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase text-slate-500">
                        <tr>
                          <th className="w-[190px] px-3 py-2">Branch</th>
                          <th className="w-[120px] px-2 py-2 text-right">Cost</th>
                          <th className="w-[120px] px-2 py-2 text-right">Sell</th>
                          <th className="w-[110px] px-2 py-2 text-center">Qty</th>
                          {isMeasuredItem(selectedItem) && <th className="w-[92px] px-2 py-2 text-center">Unit</th>}
                          <th className="w-[160px] px-2 py-2 text-center">Expiry</th>
                          <th className="w-[42px] px-2 py-2 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {branches.map((branch, idx) => {
                          const inputs = branchInputs[branch.id] || {};
                          const weightItem = isMeasuredItem(selectedItem);
                          return (
                            <tr key={branch.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2">
                                <div className="max-w-[170px] truncate text-sm font-semibold text-slate-700" title={branch.name}>
                                  {branch.name}
                                </div>
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  className="input h-9 w-full min-w-[100px] px-2 text-right text-sm"
                                  placeholder="Cost"
                                  value={inputs.cost}
                                  onChange={(e) => handleInputChange(branch.id, 'cost', e.target.value)}
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="number"
                                  className="input h-9 w-full min-w-[100px] px-2 text-right text-sm"
                                  placeholder="Sell"
                                  value={inputs.sell}
                                  onChange={(e) => handleInputChange(branch.id, 'sell', e.target.value)}
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  ref={idx === 0 ? firstQtyInputRef : null}
                                  type="number"
                                  step={weightItem ? "0.1" : "1"}
                                  className={`input h-9 w-full min-w-[92px] px-2 text-center text-sm font-bold ${inputs.qty > 0 ? 'border-green-500 bg-green-50' : ''}`}
                                  placeholder="Qty"
                                  value={inputs.qty}
                                  onChange={(e) => handleInputChange(branch.id, 'qty', e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddToList();
                                  }}
                                />
                              </td>
                              {weightItem && (
                                <td className="px-2 py-2">
                                  <CustomSelect
                                    value={inputs.qtyUnit || selectedItem.defaultUnit}
                                    onChange={(value) => handleInputChange(branch.id, 'qtyUnit', value)}
                                    options={getMeasuredUnitOptions(selectedItem)}
                                    valueKey="value"
                                    labelKey="label"
                                    buttonClassName="h-9 px-2 py-1 text-xs shadow-none"
                                    className="min-w-[78px]"
                                  />
                                </td>
                              )}
                              <td className="px-2 py-2">
                                <DatePicker
                                  value={inputs.expiry}
                                  onChange={(value) => handleInputChange(branch.id, 'expiry', value)}
                                  buttonClassName="input h-9 w-full min-w-[140px] px-2 text-sm"
                                />
                              </td>
                              <td className="px-2 py-2 text-center">
                                {idx === 0 && (
                                  <button onClick={() => applyPricesToAll(branch.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" title="Copy prices to all branches">
                                    <Copy size={14} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <Button onClick={handleAddToList} className="mt-3 inline-flex w-full items-center justify-center shadow-sm">
                    <Plus size={18} className="mr-1" /> Add to List (Enter)
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        <PanelResizeHandle onMouseDown={handleResizeStart} isResizing={isResizingPanels} />

        <div className="purchase-split-panel min-w-0 flex-1 space-y-4" style={{ animationDelay: "230ms" }}>
          <Card className="sales-panel-enter flex min-h-[520px] flex-col overflow-hidden p-0" style={{ animationDelay: "260ms" }}>
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Purchase Items List</h3>
                  <p className="text-sm text-slate-500">{cartItems.length} rows added</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium text-slate-500">Subtotal: {formatCurrency(subtotal)}</p>
                  <p className="font-semibold text-slate-700">Total: {formatCurrency(grandTotal)}</p>
                  <p className={dueAmount > 0 ? "font-semibold text-red-600" : "font-medium text-emerald-600"}>
                    Due: {formatCurrency(dueAmount)}
                  </p>
                </div>
              </div>
            </div>
            <div className="custom-scrollbar flex-1 overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b bg-white text-slate-500">
                  <tr>
                    <th className="p-3">Branch</th>
                    <th className="p-3">Item Name</th>
                    <th className="p-3 text-right">Cost</th>
                    <th className="p-3 text-right">Sell</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Line Total</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cartItems.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-10 text-center text-slate-400">
                        No items added. Search and distribute items to branches.
                      </td>
                    </tr>
                  ) : (
                    cartItems.map((item, index) => (
                      <tr
                        key={item.uniqueId}
                        className="purchase-line-card group transition-colors hover:bg-slate-50"
                        style={{ animationDelay: `${80 + Math.min(index, 6) * 35}ms` }}
                      >
                        <td className="p-3">
                          <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700">
                            {item.branchName}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-slate-700">{item.name}</div>
                          <div className="text-xs text-slate-400">{item.barcode}</div>
                        </td>
                        <td className="p-3 text-right text-slate-600">
                          <div>{item.costPrice.toFixed(2)}</div>
                          {normalizedDiscountAmount > 0 ? (
                            <div className="text-[11px] font-semibold text-emerald-600">
                              Eff. {effectiveCostForLine(item, index).toFixed(2)}
                            </div>
                          ) : null}
                        </td>
                        <td className="p-3 text-right text-slate-600">{item.sellingPrice.toFixed(2)}</td>
                        <td className="p-3 text-center font-bold text-slate-800">
                          {item.weightItem ? item.qty.toFixed(2) : item.qty}
                          {item.qtyUnit && <span className="text-xs text-slate-500 ml-1">{item.qtyUnit}</span>}
                        </td>
                        <td className="p-3 text-right font-bold text-slate-800">{item.lineTotal.toLocaleString()}</td>
                        <td className="p-3 text-center">
                          <button onClick={() => handleRemoveItem(index)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="page-section-enter flex justify-end" style={{ animationDelay: "300ms" }}>
            <Button
              onClick={handleSubmit}
              size="lg"
              className="bg-green-600 hover:bg-green-700 shadow-lg w-full md:w-auto px-8"
              disabled={cartItems.length === 0}
            >
              <Save size={18} className="mr-2" /> Finalize Purchase
            </Button>
          </div>
        </div>
      </div>

      <SupplierQuickAddModal
        isOpen={showSupplierModal}
        onClose={() => { setShowSupplierModal(false); if (searchInputRef.current) searchInputRef.current.focus(); }}
        onCreated={handleSupplierCreated}
      />
    </div>
  );
};

export default PurchaseFormPage;
