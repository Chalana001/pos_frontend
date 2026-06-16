import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { Search, ChefHat, Lock, ShoppingBag, UtensilsCrossed, Save, RefreshCw, AlertTriangle, ChevronRight, Printer } from "lucide-react";
import { useKeyboard } from "../hooks/useKeyboard";
import { useSearchOnType } from "../hooks/useSearchOnType";
import { itemsAPI } from "../api/items.api";
import { ordersAPI } from "../api/orders.api";
import { promotionsAPI } from "../api/promotions.api";
import { shiftsAPI } from "../api/shifts.api";
import { diningTablesAPI } from "../api/diningTables.api";
import { pendingOrdersAPI } from "../api/pendingOrders.api";
import { warrantyTemplatesAPI } from "../api/warrantyTemplates.api";
import CustomerSelect from "../components/pos/CustomerSelect";
import Cart from "../components/pos/Cart";
import CheckoutOverlay from "../components/pos/CheckoutOverlay";
import BatchSelectModal from "../components/pos/BatchSelectModal";
import { formatCurrency } from "../utils/formatters";
import { ORDER_TYPES, DISCOUNT_TYPES, ItemType, SALE_MODES } from "../utils/constants";
import { useAuth } from "../context/AuthContext";
import { useBranch } from "../context/BranchContext";
import { useAppConfiguration } from "../context/AppConfigurationContext";
import LoadingSpinner from "../components/common/LoadingSpinner";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import ReceiptPrinter from "../components/pos/ReceiptPrinter";
import KotPrinter from "../components/pos/KotPrinter";
import InvoicePrinter from "../components/pos/InvoicePrinter";
import { receiptSettingsAPI } from "../api/receiptSettings.api";
import { PRINT_TEMPLATE_TYPES } from "../utils/receiptSettings";
import PanelResizeHandle from "../components/common/PanelResizeHandle";
import { BRAND_NAME_UPPER } from "../utils/branding";
import { getConfigurableFeatureAvailability, hasPlanFeature } from "../utils/subscriptionFeatures";
import {
  STOCK_BASE_UNITS_PER_UNIT,
  baseToDisplayQuantity,
  formatDisplayStockQuantity,
  formatStockQuantity,
  isBaseScaledStockItem,
  isMeasuredStockItem,
} from "../utils/stockQuantity";
import {
  addOfflineSale,
  cacheItemsForBranch,
  cacheReceiptSettings,
  getCachedItemsForBranch,
  getCachedReceiptSettings,
  getFreeLocalSalesSummary,
} from "../offline/db";

const isMeasuredItem = (item) =>
  isMeasuredStockItem(item);

const isUnlimitedStockItem = (item) =>
  item?.itemType === ItemType.SERVICE || item?.itemType === ItemType.RECIPE || item?.stockUnmanaged === true;

const isBatchlessItem = (item) =>
  item?.itemType === ItemType.SERVICE || item?.itemType === ItemType.RECIPE;

const toBaseQuantity = (quantity, unit, measuredItem = false) => {
  const numeric = Number(quantity);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  if (!measuredItem) {
    return numeric;
  }
  const normalizedUnit = String(unit || "").toUpperCase();
    return normalizedUnit === "KG" || normalizedUnit === "L" || normalizedUnit === "PCS"
    ? numeric * STOCK_BASE_UNITS_PER_UNIT
    : numeric;
};

const fromBaseQuantity = (baseQuantity, unit, measuredItem = false) => {
  const numeric = Number(baseQuantity);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  if (!measuredItem) {
    return numeric;
  }
  const normalizedUnit = String(unit || "").toUpperCase();
  return normalizedUnit === "KG" || normalizedUnit === "L" || normalizedUnit === "PCS"
    ? numeric / STOCK_BASE_UNITS_PER_UNIT
    : numeric;
};

const getMeasuredStep = (unit) => (String(unit || "").toUpperCase() === "G" || String(unit || "").toUpperCase() === "ML" ? 100 : 0.1);

const getInitialMeasuredQuantity = (unit) => (String(unit || "").toUpperCase() === "G" || String(unit || "").toUpperCase() === "ML" ? 100 : 1);

const getPerSmallUnitPrice = (configuredPrice, measuredItem = false) => {
  const numeric = Number(configuredPrice);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return measuredItem ? numeric / STOCK_BASE_UNITS_PER_UNIT : numeric;
};

const formatStockDisplay = (item, batch = null) =>
  formatDisplayStockQuantity(batch || item, 0, item);

const buildOfflineInvoiceNo = (clientSaleId) =>
  `OFF-${String(clientSaleId || "").replace(/-/g, "").slice(0, 8).toUpperCase()}`;

const getApiErrorMessage = (error, fallback = "Failed") =>
  error?.response?.data?.message || error?.response?.data?.detail || fallback;

const isStockOverrideRequiredError = (error) =>
  error?.response?.data?.code === "STOCK_OVERRIDE_REQUIRED";

const getStockOverrideShortages = (error) => {
  const shortages = Array.isArray(error?.response?.data?.shortages) ? error.response.data.shortages : [];
  return shortages.map((shortage) => {
    const itemLabel = shortage.itemName && shortage.stockItemName && shortage.itemName !== shortage.stockItemName
      ? `${shortage.itemName} / ${shortage.stockItemName}`
      : (shortage.stockItemName || shortage.itemName || "Item");
    const unit = shortage.unit || "PCS";
    const baseScaledStockItem = ["PCS", "KG", "L"].includes(String(unit).toUpperCase());
    return {
      itemLabel,
      unit,
      requiredQuantity: baseScaledStockItem
        ? baseToDisplayQuantity(shortage.requiredQuantity || 0)
        : shortage.requiredQuantity,
      availableQuantity: baseScaledStockItem
        ? baseToDisplayQuantity(shortage.availableQuantity || 0)
        : shortage.availableQuantity,
    };
  });
};

const canRoleConfirmStockOverride = (role, configuration = {}) => {
  if (role === "SUPER_ADMIN") return true;
  if (role === "ADMIN") return configuration.adminStockOverrideAllowed !== false;
  if (role === "MANAGER") return configuration.managerStockOverrideAllowed !== false;
  if (role === "CASHIER") return configuration.cashierStockOverrideAllowed === true;
  return false;
};

const canRoleAddWarranty = (role, configuration = {}) => {
  if (configuration.warrantyEnabled === false) return false;
  if (role === "SUPER_ADMIN") return true;
  if (role === "ADMIN") return configuration.adminWarrantyAllowed !== false;
  if (role === "MANAGER") return configuration.managerWarrantyAllowed !== false;
  if (role === "CASHIER") return configuration.cashierWarrantyAllowed === true;
  return false;
};

const CART_MODES = {
  ONLINE: "ONLINE",
  QUEUE: "QUEUE",
};

const getCartDraftKey = (userId, branchId) =>
  userId && branchId ? `pos-active-cart-v1:${userId}:${branchId}` : null;

const POS = () => {
  const { user, isOnline, hasOnlineSession, isOfflineSession } = useAuth();
  const { selectedBranchId, branches } = useBranch();
  const { configuration } = useAppConfiguration();
  const singleCategoryMode = configuration?.categoryMode === "SINGLE_CATEGORY";
  const kotEnabled = configuration?.kotEnabled !== false;
  const printRef = useRef(null);
  const invoicePrintRef = useRef(null);
  const kotPrintRef = useRef(null);
  const searchInputRef = useRef(null);
  const categoryScrollRef = useRef(null);
  const kotPrintedQuantitiesRef = useRef({});
  const hydratedCartDraftKeysRef = useRef(new Set());

  const [myShift, setMyShift] = useState(null);
  const [loadingShift, setLoadingShift] = useState(true);

  const [allItems, setAllItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [warrantyOptions, setWarrantyOptions] = useState([{ value: "", label: "No Warranty" }]);
  const [searchQuery, setSearchQuery] = useState("");
  useSearchOnType(setSearchQuery, searchInputRef);
  const [activeCategory, setActiveCategory] = useState("All");
  const [categories, setCategories] = useState(["All"]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedBatchItem, setSelectedBatchItem] = useState(null);

  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [orderType, setOrderType] = useState(ORDER_TYPES.CASH);
  const [saleMode, setSaleMode] = useState(SALE_MODES.TAKEAWAY);
  const [cartMode, setCartMode] = useState(null);
  const [billDiscount, setBillDiscount] = useState(0);
  const [billPromotionPreview, setBillPromotionPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentError, setPaymentError] = useState("");
  const [stockOverrideDialog, setStockOverrideDialog] = useState(null);
  const [receiptSettings, setReceiptSettings] = useState(null);
  const [kotReceiptSettings, setKotReceiptSettings] = useState(null);
  const [printFullInvoice, setPrintFullInvoice] = useState(false);

  const [diningTables, setDiningTables] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [loadingDiningState, setLoadingDiningState] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [printingKot, setPrintingKot] = useState(false);
  const [freeLocalSalesSummary, setFreeLocalSalesSummary] = useState({ count: 0, total: 0 });
  const [, setKotStateVersion] = useState(0);
  const [cartPanelWidth, setCartPanelWidth] = useState(470);
  const [isResizingPanels, setIsResizingPanels] = useState(false);
  const resizeStateRef = useRef({ startX: 0, startWidth: 470 });
  const stockOverrideResolverRef = useRef(null);

  const isAdminUser = user?.role === "ADMIN" || user?.role === "MANAGER";
  const canUseServer = isOnline && hasOnlineSession && !isOfflineSession;
  const isFreeStockUnmanagedPlan = user?.planName === "FREE" || user?.planName === "MONTHLY_DEMO";
  const isFreeLocalSalesPlan = isFreeStockUnmanagedPlan;
  const canUseDining =
    hasPlanFeature(user?.planName, "DINING_TABLES") &&
    configuration.tableManagementEnabled &&
    configuration.dineInEnabled;
  const featureAvailability = useMemo(
    () => getConfigurableFeatureAvailability(user?.planName),
    [user?.planName]
  );
  const diningUnavailableMessage = !hasPlanFeature(user?.planName, "DINING_TABLES")
    ? "Tables are not available in this package."
    : "Dine-in is disabled in app configuration.";
  const activeCartMode = cartItems.length > 0
    ? (cartMode || (canUseServer && !isFreeLocalSalesPlan ? CART_MODES.ONLINE : CART_MODES.QUEUE))
    : null;
  const queueCartActive = activeCartMode === CART_MODES.QUEUE;
  const shouldUseServerForCheckout = activeCartMode
    ? activeCartMode === CART_MODES.ONLINE && canUseServer && !isFreeLocalSalesPlan
    : canUseServer && !isFreeLocalSalesPlan;
  const stockOverrideCanProceed =
    shouldUseServerForCheckout &&
    configuration?.stockOverrideMode !== "BLOCK" &&
    canRoleConfirmStockOverride(user?.role, configuration);
  const canAddWarranty = canUseServer && canRoleAddWarranty(user?.role, configuration);
  const fallbackBranchId = isAdminUser ? (selectedBranchId || null) : (user?.branchId || null);
  const effectiveBranchId = myShift?.branchId || fallbackBranchId;
  const effectiveBranch = branches.find((branch) => Number(branch.id) === Number(effectiveBranchId)) || null;
  const canSell = !!effectiveBranchId && (isFreeLocalSalesPlan || queueCartActive || (canUseServer ? !!myShift : true));
  const cartDraftKey = getCartDraftKey(user?.userId || user?.id, effectiveBranchId);

  const pendingOrdersByTable = useMemo(
    () => Object.fromEntries((pendingOrders || []).map((pendingOrder) => [Number(pendingOrder.tableId), pendingOrder])),
    [pendingOrders]
  );

  const stockItemLookup = useMemo(
    () => new Map((allItems || []).map((item) => [Number(item.id), item])),
    [allItems]
  );

  const selectedTable = useMemo(
    () => diningTables.find((table) => Number(table.id) === Number(selectedTableId)) || null,
    [diningTables, selectedTableId]
  );

  const isConfiguredItemTypeVisible = (item) => {
    if (item.itemType === ItemType.WEIGHT || item.itemType === ItemType.VOLUME) {
      return featureAvailability.weightItemsEnabled && configuration.weightItemsEnabled;
    }
    if (item.itemType === ItemType.SERVICE) {
      return featureAvailability.servicesEnabled && configuration.servicesEnabled;
    }
    if (item.itemType === ItemType.RECIPE) {
      return featureAvailability.recipeItemsEnabled && configuration.recipeItemsEnabled;
    }
    return true;
  };

  const getItemCategoryName = (item) =>
    singleCategoryMode ? item.subCategoryName || item.categoryName : item.categoryName;

  const currentSessionKey = saleMode === SALE_MODES.DINE_IN && selectedTable
    ? `DINE_IN_TABLE_${selectedTable.id}`
    : "TAKEAWAY";

  const getRecipeAvailableQty = (item) => {
    const ingredients = Array.isArray(item?.ingredients) ? item.ingredients : [];
    if (ingredients.length === 0) {
      return 0;
    }

    let maxRecipeQty = Infinity;

    for (const ingredient of ingredients) {
      const ingredientItem = stockItemLookup.get(Number(ingredient.ingredientItemId));
      const ingredientStock = Number(ingredientItem?.availableBaseQty ?? 0);
      const requiredQty = Number(ingredient?.baseQuantity ?? 0);

      if (ingredientStock <= 0 || requiredQty <= 0) {
        return 0;
      }

      maxRecipeQty = Math.min(maxRecipeQty, Math.floor(ingredientStock / requiredQty));
    }

    return Number.isFinite(maxRecipeQty) ? Math.max(0, maxRecipeQty) : 0;
  };

  const getSellableStockBaseQty = (item, batchData = null) => {
    if (item?.itemType === ItemType.SERVICE) {
      return Infinity;
    }

    if (item?.itemType === ItemType.RECIPE) {
      return Infinity;
    }

    return Number(batchData ? batchData.qty : (item?.availableBaseQty ?? 0));
  };


  useEffect(() => {
    if (!cartDraftKey || hydratedCartDraftKeysRef.current.has(cartDraftKey)) {
      return;
    }

    hydratedCartDraftKeysRef.current.add(cartDraftKey);
    if (cartItems.length > 0) {
      return;
    }

    try {
      const rawDraft = localStorage.getItem(cartDraftKey);
      if (!rawDraft) {
        return;
      }

      const draft = JSON.parse(rawDraft);
      if (!Array.isArray(draft.cartItems) || draft.cartItems.length === 0) {
        localStorage.removeItem(cartDraftKey);
        return;
      }

      setCartItems(draft.cartItems);
      setCustomer(draft.customer || null);
      setBillDiscount(Number(draft.billDiscount || 0));
      setOrderType(draft.orderType || ORDER_TYPES.CASH);
      setPaidAmount(Number(draft.paidAmount || 0));
      setPaymentMethod(draft.paymentMethod || "CASH");
      setSaleMode(draft.saleMode || SALE_MODES.TAKEAWAY);
      setCartMode(draft.cartMode || CART_MODES.QUEUE);
    } catch {
      localStorage.removeItem(cartDraftKey);
    }
  }, [cartDraftKey, cartItems.length]);

  useEffect(() => {
    if (!cartDraftKey || !hydratedCartDraftKeysRef.current.has(cartDraftKey)) {
      return;
    }

    if (cartItems.length === 0) {
      localStorage.removeItem(cartDraftKey);
      return;
    }

    localStorage.setItem(
      cartDraftKey,
      JSON.stringify({
        cartItems,
        customer,
        billDiscount,
        orderType,
        paidAmount,
        paymentMethod,
        saleMode,
        cartMode: activeCartMode || cartMode || (canUseServer && !isFreeLocalSalesPlan ? CART_MODES.ONLINE : CART_MODES.QUEUE),
        savedAt: new Date().toISOString(),
      })
    );
  }, [
    activeCartMode,
    billDiscount,
    canUseServer,
    cartDraftKey,
    cartItems,
    cartMode,
    customer,
    isFreeLocalSalesPlan,
    orderType,
    paidAmount,
    paymentMethod,
    saleMode,
  ]);

  useEffect(() => {
    if (showPayment) {
      setPaymentError("");
    }
  }, [showPayment, orderType, customer?.id, cartItems, billDiscount, paidAmount]);

  useEffect(() => {
    if (!isFreeLocalSalesPlan) {
      setFreeLocalSalesSummary({ count: 0, total: 0 });
      return;
    }

    getFreeLocalSalesSummary()
      .then(setFreeLocalSalesSummary)
      .catch(() => setFreeLocalSalesSummary({ count: 0, total: 0 }));
  }, [isFreeLocalSalesPlan]);

  useEffect(() => {
    if (!canAddWarranty) {
      setWarrantyOptions([{ value: "", label: "No Warranty" }]);
      setCartItems((currentItems) => currentItems.map((item) => ({
        ...item,
        warrantyOptionValue: "",
        warrantyLabel: "",
        warrantyPeriodValue: null,
        warrantyPeriodUnit: null,
      })));
      return;
    }

    warrantyTemplatesAPI.listActive()
      .then((response) => {
        const activeTemplates = Array.isArray(response.data) ? response.data : [];
        setWarrantyOptions([
          { value: "", label: "No Warranty" },
          ...activeTemplates.map((template) => ({
            value: String(template.id),
            label: template.label,
            periodValue: template.periodValue,
            periodUnit: template.periodUnit,
          })),
        ]);
      })
      .catch((error) => {
        console.error("Failed to load warranty templates", error);
        setWarrantyOptions([{ value: "", label: "No Warranty" }]);
      });
  }, [canAddWarranty]);

  useEffect(() => {
    if (warrantyOptions.length <= 1) {
      return;
    }

    setCartItems((currentItems) =>
      currentItems.map((item) => {
        if (!item.warrantyLabel || item.warrantyOptionValue) {
          return item;
        }

        const matchingOption = warrantyOptions.find((option) =>
          option.label === item.warrantyLabel
          && option.periodValue === item.warrantyPeriodValue
          && option.periodUnit === item.warrantyPeriodUnit
        );

        return matchingOption
          ? { ...item, warrantyOptionValue: matchingOption.value }
          : item;
      })
    );
  }, [warrantyOptions]);

  useEffect(() => {
    if (!isResizingPanels) {
      return undefined;
    }

    const handleMouseMove = (event) => {
      const deltaX = resizeStateRef.current.startX - event.clientX;
      const nextWidth = Math.max(360, Math.min(720, resizeStateRef.current.startWidth + deltaX));
      setCartPanelWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsResizingPanels(false);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingPanels]);

  const toNonNegativeNumber = (value) => {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }
    return parsed;
  };

  const roundToRupee = (value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return 0;
    }
    return Math.max(0, Math.round(parsed + Number.EPSILON));
  };

  const scrollCategoriesForward = () => {
    const container = categoryScrollRef.current;
    if (!container) {
      return;
    }

    const firstButton = container.querySelector("button");
    const buttonWidth = firstButton ? firstButton.getBoundingClientRect().width : 96;
    const gap = window.innerWidth >= 1024 ? 8 : 6;
    const nextOffset = (buttonWidth + gap) * 4;
    container.scrollBy({ left: nextOffset, behavior: "smooth" });
  };

  const calculateItemBaseTotal = (item) => {
    const qty = Number(item?.qty || 0);
    if (!Number.isFinite(qty) || qty <= 0) return 0;

    const unitPrice = Number(item?.unitPrice || 0);
    const perSmallUnitPrice = Number(item?.perSmallUnitPrice ?? item?.perGramPrice ?? 0);

    if (item?.weightItem && (item?.qtyUnit === "G" || item?.qtyUnit === "ML")) {
      return qty * (Number.isFinite(perSmallUnitPrice) ? perSmallUnitPrice : 0);
    }

    return qty * (Number.isFinite(unitPrice) ? unitPrice : 0);
  };

  const getEffectiveDiscountType = (item) =>
    item?.effectiveDiscountType || item?.discountType || DISCOUNT_TYPES.NONE;

  const getEffectiveDiscountValue = (item) => {
    const value = item?.effectiveDiscountValue ?? item?.discountValue ?? 0;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
  };

  const calculateCartItemTotal = (item) => {
    const previewLineTotal = Number(item?.effectiveLineTotal);
    if (Number.isFinite(previewLineTotal) && previewLineTotal >= 0) {
      return previewLineTotal;
    }

    let itemTotal = calculateItemBaseTotal(item);
    const discountType = getEffectiveDiscountType(item);
    const discountValue = getEffectiveDiscountValue(item);

    if (discountType === DISCOUNT_TYPES.FIXED) {
      itemTotal -= discountValue;
    } else if (discountType === DISCOUNT_TYPES.PERCENT) {
      itemTotal -= (itemTotal * discountValue) / 100;
    }

    return Math.max(0, Number.isFinite(itemTotal) ? itemTotal : 0);
  };

  const getEffectiveBillDiscount = (baseTotal) => {
    const previewDiscount = Number(billPromotionPreview?.appliedBillDiscountAmount);
    const discount = Number.isFinite(previewDiscount)
      ? previewDiscount
      : toNonNegativeNumber(billDiscount);
    return Math.max(0, Math.min(Number(baseTotal) || 0, discount));
  };

  const calculateTotal = () => {
    let total = 0;
    cartItems.forEach((item) => {
      total += calculateCartItemTotal(item);
    });

    const normalizedBillDiscount = getEffectiveBillDiscount(total);
    return roundToRupee(total - normalizedBillDiscount);
  };

  const getCheckoutCreditAmount = (total = calculateTotal()) => {
    const normalizedTotal = roundToRupee(total || 0);
    const normalizedPaidAmount = roundToRupee(paidAmount || 0);
    return orderType === ORDER_TYPES.CREDIT
      ? normalizedTotal
      : Math.max(0, normalizedTotal - normalizedPaidAmount);
  };

  const getCreditLimitValidationMessage = (total = calculateTotal()) => {
    const creditAmount = getCheckoutCreditAmount(total);

    if (creditAmount <= 0) return "";

    if (isFreeLocalSalesPlan) {
      return "FREE plan supports fully paid local cash sales only";
    }

    if (!customer) {
      return "Select customer for credit sale";
    }

    if (customer.active === false) {
      return "Cannot create credit sale for inactive customer";
    }

    if (customer.creditLimit === null || customer.creditLimit === undefined || customer.creditLimit === "") {
      return "";
    }

    const limit = Number(customer.creditLimit);
    if (!Number.isFinite(limit)) {
      return "";
    }

    const currentDue = Number(customer.dueAmount || 0);
    const projectedDue = currentDue + creditAmount;

    if (projectedDue > limit) {
      const availableCredit = Math.max(0, limit - currentDue);
      return `Credit limit exceeded. Available: ${formatCurrency(availableCredit)}, credit: ${formatCurrency(creditAmount)}, limit: ${formatCurrency(limit)}`;
    }

    return "";
  };

  const getCartLineKey = (item) => `${item.itemId}-${item.batchId || "AUTO"}`;

  const getComparableQty = (item) =>
    isMeasuredItem(item)
      ? toBaseQuantity(item.qty, item.qtyUnit || item.defaultUnit, true)
      : Number(item.qty || 0);

  const getKotEligibleItems = (items) => kotEnabled ? items.filter((item) => item.isKotEnabled) : [];

  const getPendingKotItems = () => {
    const printedMap = kotPrintedQuantitiesRef.current[currentSessionKey] || {};

    return getKotEligibleItems(cartItems)
      .map((item) => {
        const lineKey = getCartLineKey(item);
        const currentQty = getComparableQty(item);
        const printedQty = Number(printedMap[lineKey] || 0);
        const deltaQty = currentQty - printedQty;

        if (deltaQty <= 0) {
          return null;
        }

        return {
          ...item,
          qty: fromBaseQuantity(deltaQty, item.qtyUnit || item.defaultUnit, item.weightItem),
        };
      })
      .filter(Boolean);
  };

  const markKotPrinted = (sessionKey) => {
    const currentPrintedMap = { ...(kotPrintedQuantitiesRef.current[sessionKey] || {}) };
    getKotEligibleItems(cartItems).forEach((item) => {
      currentPrintedMap[getCartLineKey(item)] = Math.max(
        Number(currentPrintedMap[getCartLineKey(item)] || 0),
        getComparableQty(item)
      );
    });
    kotPrintedQuantitiesRef.current[sessionKey] = currentPrintedMap;
    setKotStateVersion((value) => value + 1);
  };

  const clearCartState = ({ preserveSaleMode = true } = {}) => {
    delete kotPrintedQuantitiesRef.current[currentSessionKey];
    setCartItems([]);
    setCustomer(null);
    setCartMode(null);
    setBillDiscount(0);
    setOrderType(ORDER_TYPES.CASH);
    setPaidAmount(0);
    setPaymentMethod("CASH");
    setPrintFullInvoice(false);
    setShowPayment(false);
    if (!preserveSaleMode) {
      setSaleMode(SALE_MODES.TAKEAWAY);
    }
  };

  const clearSelectedTableDraft = () => {
    setCartItems([]);
    setCustomer(null);
    setCartMode(null);
    setBillDiscount(0);
  };

  const mapPendingItemToCartItem = (pendingItem) => {
    const sourceItem = allItems.find((item) => Number(item.id) === Number(pendingItem.itemId));
    const weightItem = isMeasuredItem(sourceItem || pendingItem);
    const qtyUnit = pendingItem.qtyUnit || sourceItem?.defaultUnit || "PCS";
    const unitPrice = Number(pendingItem.unitPrice || 0);

    return {
      itemId: pendingItem.itemId,
      batchId: pendingItem.batchId,
      name: pendingItem.itemName,
      barcode: pendingItem.barcode || sourceItem?.barcode,
      unitPrice,
      perSmallUnitPrice: getPerSmallUnitPrice(unitPrice, weightItem),
      perGramPrice: getPerSmallUnitPrice(unitPrice, weightItem),
      qty: Number(pendingItem.qty || 0),
      qtyUnit,
      weightItem,
      itemType: sourceItem?.itemType || ItemType.NORMAL,
      defaultUnit: sourceItem?.defaultUnit || qtyUnit,
      discountType: pendingItem.discountType || DISCOUNT_TYPES.NONE,
      discountValue: Number(pendingItem.discountValue || 0),
      warrantyOptionValue: "",
      warrantyLabel: pendingItem.warrantyLabel || "",
      warrantyPeriodValue: pendingItem.warrantyPeriodValue || null,
      warrantyPeriodUnit: pendingItem.warrantyPeriodUnit || null,
      stockBaseQty: getSellableStockBaseQty(sourceItem || pendingItem),
      image: sourceItem?.imageUrl,
      isKotEnabled: !!sourceItem?.isKotEnabled,
    };
  };

  const applyPendingOrderToCart = (pendingOrder) => {
    setCartItems(Array.isArray(pendingOrder?.items) ? pendingOrder.items.map(mapPendingItemToCartItem) : []);
    setCartMode(CART_MODES.ONLINE);
    setBillDiscount(Number(pendingOrder?.billDiscount || 0));
    setCustomer(
      pendingOrder?.customerId
        ? {
            id: pendingOrder.customerId,
            name: pendingOrder.customerName,
            phone: "",
          }
        : null
    );
  };

  const refreshDiningState = async (branchId, preserveSelectedId = selectedTableId) => {
    if (!canUseServer) {
      setDiningTables([]);
      setPendingOrders([]);
      return;
    }

    if (!branchId) {
      setDiningTables([]);
      setPendingOrders([]);
      return;
    }

    try {
      setLoadingDiningState(true);
      const [tablesResponse, pendingResponse] = await Promise.all([
        diningTablesAPI.listByBranch(branchId),
        pendingOrdersAPI.listByBranch(branchId),
      ]);
      const nextTables = Array.isArray(tablesResponse.data) ? tablesResponse.data : [];
      const nextPending = Array.isArray(pendingResponse.data) ? pendingResponse.data : [];
      setDiningTables(nextTables);
      setPendingOrders(nextPending);

      if (preserveSelectedId) {
        const matched = nextTables.find((table) => Number(table.id) === Number(preserveSelectedId));
        setSelectedTableId(matched ? matched.id : null);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load dining tables");
    } finally {
      setLoadingDiningState(false);
    }
  };

  useEffect(() => {
    const loadMyShift = async () => {
      try {
        setLoadingShift(true);
        if (!canUseServer) {
          setMyShift(null);
          if (fallbackBranchId) {
            await fetchProducts(fallbackBranchId);
          } else {
            setAllItems([]);
            setFilteredItems([]);
            setCategories(["All"]);
          }
          return;
        }

        let res;

        if (isAdminUser) {
          if (!selectedBranchId || selectedBranchId === 0) {
            setMyShift(null);
            setLoadingShift(false);
            return;
          }
          res = await shiftsAPI.getAdminCurrent(selectedBranchId);
        } else {
          res = await shiftsAPI.getMine();
        }

        if (res.data && res.data.status === "OPEN") {
          setMyShift(res.data);
          fetchProducts(res.data.branchId);
        } else {
          setMyShift(null);
        }
      } catch (error) {
        setMyShift(null);
      } finally {
        setLoadingShift(false);
      }
    };

    loadMyShift();
  }, [canUseServer, fallbackBranchId, isAdminUser, selectedBranchId]);

  useEffect(() => {
    const receiptBranchId = myShift?.branchId || effectiveBranchId;

    if (!receiptBranchId) {
      setReceiptSettings(null);
      setKotReceiptSettings(null);
      return;
    }

    const loadReceiptSettings = async () => {
      try {
        if (canUseServer) {
          const [thermalResponse, kotResponse] = await Promise.all([
            receiptSettingsAPI.getByBranch(receiptBranchId, PRINT_TEMPLATE_TYPES.THERMAL),
            receiptSettingsAPI.getByBranch(receiptBranchId, PRINT_TEMPLATE_TYPES.KOT),
          ]);

          setReceiptSettings(thermalResponse.data);
          setKotReceiptSettings(kotResponse.data);

          await Promise.all([
            cacheReceiptSettings(receiptBranchId, PRINT_TEMPLATE_TYPES.THERMAL, thermalResponse.data),
            cacheReceiptSettings(receiptBranchId, PRINT_TEMPLATE_TYPES.KOT, kotResponse.data),
          ]);
          return;
        }

        const [cachedThermalSettings, cachedKotSettings] = await Promise.all([
          getCachedReceiptSettings(receiptBranchId, PRINT_TEMPLATE_TYPES.THERMAL),
          getCachedReceiptSettings(receiptBranchId, PRINT_TEMPLATE_TYPES.KOT),
        ]);

        setReceiptSettings(cachedThermalSettings);
        setKotReceiptSettings(cachedKotSettings);
      } catch (error) {
        console.error("Failed to load receipt settings", error);
        const [cachedThermalSettings, cachedKotSettings] = await Promise.all([
          getCachedReceiptSettings(receiptBranchId, PRINT_TEMPLATE_TYPES.THERMAL),
          getCachedReceiptSettings(receiptBranchId, PRINT_TEMPLATE_TYPES.KOT),
        ]);
        setReceiptSettings(cachedThermalSettings);
        setKotReceiptSettings(cachedKotSettings);
      }
    };

    loadReceiptSettings();
  }, [canUseServer, effectiveBranchId, myShift?.branchId]);

  useEffect(() => {
    if (saleMode === SALE_MODES.DINE_IN && canUseServer && canUseDining && myShift?.branchId) {
      refreshDiningState(myShift.branchId);
    }
  }, [canUseDining, canUseServer, saleMode, myShift?.branchId]);

  useEffect(() => {
    if ((!canUseServer || !canUseDining) && saleMode === SALE_MODES.DINE_IN) {
      setSaleMode(SALE_MODES.TAKEAWAY);
      setSelectedTableId(null);
      setDiningTables([]);
      setPendingOrders([]);
      toast.error(canUseDining ? "POS switched to takeaway-only queue mode." : diningUnavailableMessage);
    }
  }, [canUseDining, canUseServer, diningUnavailableMessage, saleMode]);

  const fetchProducts = async (branchId) => {
    if (!branchId) {
      setAllItems([]);
      setFilteredItems([]);
      setCategories(["All"]);
      return;
    }

    try {
      let items = [];

      if (canUseServer) {
        const response = await itemsAPI.searchForPos("", branchId);
        items = Array.isArray(response.data) ? response.data : [];
        await cacheItemsForBranch(branchId, items);
      } else {
        items = await getCachedItemsForBranch(branchId);
      }

      items = items.filter((item) => {
        if (!isConfiguredItemTypeVisible(item)) return false;
        if (item.itemType === ItemType.SERVICE || item.itemType === ItemType.RECIPE) return true;
        if (item.batches && item.batches.length > 0) return true;
        if (item.availableQty !== undefined && item.availableQty !== null) return true;
        return false;
      }).map((item) => ({
        ...item,
        stockUnmanaged: isFreeStockUnmanagedPlan && item.itemType !== ItemType.SERVICE && item.itemType !== ItemType.RECIPE,
      }));

      setAllItems(items);
      setFilteredItems(items);

      const uniqueCats = ["All", ...new Set(items.map((item) => getItemCategoryName(item)).filter(Boolean))];
      setCategories(uniqueCats);
    } catch (error) {
      console.error(error);
      const cachedItems = await getCachedItemsForBranch(branchId);
      if (cachedItems.length > 0) {
        const localItems = cachedItems
          .filter(isConfiguredItemTypeVisible)
          .map((item) => ({
            ...item,
            stockUnmanaged: isFreeStockUnmanagedPlan && item.itemType !== ItemType.SERVICE && item.itemType !== ItemType.RECIPE,
          }));
        setAllItems(localItems);
        setFilteredItems(localItems);
        setCategories(["All", ...new Set(localItems.map((item) => getItemCategoryName(item)).filter(Boolean))]);
        toast.error("Live refresh failed. Using cached items.");
      } else {
        setAllItems([]);
        setFilteredItems([]);
        setCategories(["All"]);
        toast.error(canUseServer ? "Failed to load products" : "No offline item cache for this branch");
      }
    }
  };

  useEffect(() => {
    let result = allItems;
    if (activeCategory !== "All") {
      result = result.filter((item) => getItemCategoryName(item) === activeCategory);
    }
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter((item) =>
        item.name.toLowerCase().includes(lowerQuery) ||
        item.barcode?.toLowerCase().includes(lowerQuery)
      );
    }
    setFilteredItems(result);
  }, [activeCategory, searchQuery, allItems, singleCategoryMode]);

  const addToCart = (item) => {
    if (!canSell) {
      toast.error(canUseServer ? "Please open a shift first!" : "POS queue mode is not ready for this branch");
      return;
    }

    const itemBatches = Array.isArray(item?.batches) ? item.batches.filter((batch) => Number(batch?.qty || 0) > 0) : [];
    if (!isBatchlessItem(item) && itemBatches.length > 1) {
      setSelectedBatchItem(item);
      setShowBatchModal(true);
      return;
    }

    if (!isBatchlessItem(item) && itemBatches.length === 1) {
      const batch = itemBatches[0];
      processAddToCart(item, batch.price ?? item.sellingPrice ?? 0, 1, batch);
      return;
    }

    processAddToCart(item, item.sellingPrice || 0, 1, null);
  };

  const processAddToCart = (item, price, qty, batchData = null) => {
    if (cartItems.length === 0 && !cartMode) {
      setCartMode(canUseServer && !isFreeLocalSalesPlan ? CART_MODES.ONLINE : CART_MODES.QUEUE);
    }

    const unlimitedStockItem = isUnlimitedStockItem(item);
    const isWeight = isMeasuredItem(item);
    const baseScaledStockItem = isBaseScaledStockItem(item);
    const batchId = isBatchlessItem(item) ? null : (batchData ? batchData.batchId : null);

    const defaultUnit = item.defaultUnit || "PCS";
    const qtyToAdd = isWeight ? getInitialMeasuredQuantity(defaultUnit) : qty;
    const stockBaseQty = getSellableStockBaseQty(item, batchData);
    const requestedBaseQty = baseScaledStockItem ? toBaseQuantity(qtyToAdd, defaultUnit, true) : qtyToAdd;

    if (!unlimitedStockItem && stockBaseQty < requestedBaseQty && !stockOverrideCanProceed) {
      toast.error(item.itemType === ItemType.RECIPE ? "Item is Out of Stock!" : `Insufficient stock! Available: ${formatStockDisplay(item, batchData)}`);
      return;
    } else if (!unlimitedStockItem && stockBaseQty < requestedBaseQty) {
      toast.error(item.itemType === ItemType.RECIPE ? "Recipe ingredient stock is low. Override will be required at checkout." : `Low stock. Override will be required at checkout. Available: ${formatStockDisplay(item, batchData)}`);
    }

    const existingIndex = cartItems.findIndex(
      (cartItem) => String(cartItem.itemId) === String(item.id) && String(cartItem.batchId || "AUTO") === String(batchId || "AUTO")
    );

    if (existingIndex !== -1) {
      const newItems = [...cartItems];
      const currentItem = newItems[existingIndex];
      const incrementQty = isWeight
        ? getMeasuredStep(currentItem.qtyUnit || currentItem.defaultUnit)
        : qty;
      const nextQty = currentItem.qty + incrementQty;
      const nextBaseQty = isBaseScaledStockItem(currentItem)
        ? toBaseQuantity(nextQty, currentItem.qtyUnit || currentItem.defaultUnit, true)
        : nextQty;

      if (!unlimitedStockItem && nextBaseQty > currentItem.stockBaseQty && !stockOverrideCanProceed) {
        toast.error(item.itemType === ItemType.RECIPE ? "Low stock." : `Low stock. Available: ${formatStockDisplay(item, batchData)}`);
        return;
      } else if (!unlimitedStockItem && nextBaseQty > currentItem.stockBaseQty) {
        toast.error(item.itemType === ItemType.RECIPE ? "Recipe ingredient stock is low. Override will be required at checkout." : `Low stock. Override will be required at checkout. Available: ${formatStockDisplay(item, batchData)}`);
      }

      newItems[existingIndex] = { ...newItems[existingIndex], qty: nextQty };
      setCartItems(newItems);
    } else {
      const unitPrice = Number(price);
      const smallUnitPrice = getPerSmallUnitPrice(unitPrice, isWeight);

      setCartItems((prev) => [
        ...prev,
        {
          itemId: item.id,
          batchId,
          name: item.name,
          barcode: item.barcode,
          unitPrice,
          perSmallUnitPrice: smallUnitPrice,
          perGramPrice: smallUnitPrice,
          qty: qtyToAdd,
          qtyUnit: defaultUnit,
          weightItem: isWeight,
          itemType: item.itemType,
          defaultUnit,
          discountType: DISCOUNT_TYPES.NONE,
          discountValue: 0,
          warrantyOptionValue: "",
          warrantyLabel: "",
          warrantyPeriodValue: null,
          warrantyPeriodUnit: null,
          stockBaseQty,
          stockUnmanaged: !!item.stockUnmanaged,
          image: item.imageUrl,
          isKotEnabled: !!item.isKotEnabled,
        },
      ]);
    }

    setSearchQuery("");
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();

      if (!searchQuery.trim() || filteredItems.length === 0) {
        toast.error("Item not found!");
        setSearchQuery("");
        return;
      }

      const exactMatch = filteredItems.find(
        (item) => item.barcode?.toLowerCase() === searchQuery.toLowerCase()
      );

      const itemToAdd = exactMatch || filteredItems[0];

      if (itemToAdd) {
        const stockQty = getSellableStockBaseQty(itemToAdd);

        if (!isUnlimitedStockItem(itemToAdd) && stockQty <= 0 && !stockOverrideCanProceed) {
          toast.error("Item is Out of Stock!");
          setSearchQuery("");
          return;
        }
        addToCart(itemToAdd);
      }
    }
  };

  const updateQuantity = (index, newQty, preventFocus = false) => {
    const item = cartItems[index];
    const unlimitedStockItem = isUnlimitedStockItem(item);

    const finalQty = item.weightItem && (item.qtyUnit === "KG" || item.qtyUnit === "L")
      ? Math.round(newQty * 1000) / 1000
      : Math.round(newQty);

    if (finalQty < 0) return;

    if (!unlimitedStockItem) {
      const compareQty = isBaseScaledStockItem(item)
        ? toBaseQuantity(finalQty, item.qtyUnit || item.defaultUnit, true)
        : finalQty;
      if (compareQty > item.stockBaseQty && !stockOverrideCanProceed) {
        toast.error(item.stockBaseQty > 0 ? "Low stock." : "Item is Out of Stock!");
        return;
      } else if (compareQty > item.stockBaseQty) {
        toast.error("Low stock. Override will be required at checkout.");
      }
    }

    const newItems = [...cartItems];
    newItems[index].qty = finalQty;
    setCartItems(newItems);

  };

  const updateUnitPrice = (index, newPrice) => {
    const newItems = [...cartItems];
    const nextUnitPrice = toNonNegativeNumber(newPrice);
    newItems[index].unitPrice = nextUnitPrice;
    if (newItems[index].weightItem) {
      newItems[index].perSmallUnitPrice = getPerSmallUnitPrice(nextUnitPrice, true);
      newItems[index].perGramPrice = getPerSmallUnitPrice(nextUnitPrice, true);
    }
    setCartItems(newItems);
  };

  const focusSearch = () => {
  };

  const handleResizeStart = (event) => {
    resizeStateRef.current = {
      startX: event.clientX,
      startWidth: cartPanelWidth,
    };
    setIsResizingPanels(true);
  };

  const updateQtyUnit = (index, unit) => {
    const newItems = [...cartItems];
    const item = newItems[index];

    item.qtyUnit = unit;
    item.qty = getInitialMeasuredQuantity(unit);
    setCartItems(newItems);
  };

  const removeItem = async (index) => {
    const nextItems = cartItems.filter((_, itemIndex) => itemIndex !== index);
    const savedDraft = pendingOrdersByTable[Number(selectedTableId)];
    const shouldSyncSavedDraft =
      saleMode === SALE_MODES.DINE_IN &&
      !!selectedTableId &&
      canUseServer &&
      canUseDining &&
      !!savedDraft;

    if (shouldSyncSavedDraft) {
      setSavingDraft(true);
      try {
        if (nextItems.length === 0) {
          await pendingOrdersAPI.clearTable(selectedTableId);
        } else {
          await pendingOrdersAPI.saveForTable(selectedTableId, createPendingOrderPayload(nextItems));
        }
        await refreshDiningState(myShift?.branchId, selectedTableId);
      } catch (error) {
        console.error(error);
        toast.error(error?.response?.data?.message || "Failed to update table draft");
        return;
      } finally {
        setSavingDraft(false);
      }
    }

    setCartItems(nextItems);
  };

  const handleInlineDiscount = (index, type, value) => {
    const newItems = [...cartItems];
    newItems[index].discountType = type;
    newItems[index].discountValue = toNonNegativeNumber(value);
    newItems[index].effectiveDiscountType = undefined;
    newItems[index].effectiveDiscountValue = undefined;
    newItems[index].promotionId = null;
    newItems[index].promotionName = "";
    newItems[index].promotionDiscountAmount = 0;
    newItems[index].promotionApplied = false;
    newItems[index].effectiveLineTotal = undefined;
    setCartItems(newItems);
  };

  const updateWarranty = (index, optionValue) => {
    if (!canAddWarranty) {
      return;
    }
    const selectedOption = warrantyOptions.find((option) => option.value === optionValue) || warrantyOptions[0];
    const newItems = [...cartItems];
    newItems[index].warrantyOptionValue = selectedOption.value;
    newItems[index].warrantyLabel = selectedOption.label === "No Warranty" ? "" : selectedOption.label;
    newItems[index].warrantyPeriodValue = selectedOption.periodValue || null;
    newItems[index].warrantyPeriodUnit = selectedOption.periodUnit || null;
    setCartItems(newItems);
  };

  const createOrderItemPayload = (item, useEffectiveDiscount = true) => {
    const payload = {
      itemId: item.itemId,
      batchId: item.batchId,
      qty: item.qty,
      qtyUnit: item.weightItem ? (item.qtyUnit || item.defaultUnit) : undefined,
      unitPrice: item.unitPrice,
      discountType: useEffectiveDiscount ? getEffectiveDiscountType(item) : (item.discountType || DISCOUNT_TYPES.NONE),
      discountValue: useEffectiveDiscount ? getEffectiveDiscountValue(item) : toNonNegativeNumber(item.discountValue),
    };

    if (canAddWarranty) {
      payload.warrantyLabel = item.warrantyLabel || undefined;
      payload.warrantyPeriodValue = item.warrantyPeriodValue || undefined;
      payload.warrantyPeriodUnit = item.warrantyPeriodUnit || undefined;
    }

    return payload;
  };

  const promotionPreviewSignature = useMemo(() => JSON.stringify(cartItems.map((item) => ({
    itemId: item.itemId,
    batchId: item.batchId,
    qty: item.qty,
    qtyUnit: item.weightItem ? (item.qtyUnit || item.defaultUnit) : undefined,
    unitPrice: item.unitPrice,
    discountType: item.discountType || DISCOUNT_TYPES.NONE,
    discountValue: toNonNegativeNumber(item.discountValue),
    customerId: customer?.id || null,
    billDiscount: toNonNegativeNumber(billDiscount),
  }))), [billDiscount, cartItems, customer?.id]);

  useEffect(() => {
    if (!canUseServer || queueCartActive || isFreeLocalSalesPlan || !effectiveBranchId || cartItems.length === 0) {
      setBillPromotionPreview(null);
      return undefined;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await promotionsAPI.preview({
          branchId: effectiveBranchId,
          customerId: customer ? customer.id : null,
          billDiscount,
          items: cartItems.map((item) => createOrderItemPayload(item, false)),
        });
        const previewItems = Array.isArray(response.data?.items) ? response.data.items : [];
        if (cancelled) return;
        setBillPromotionPreview({
          billPromotionId: response.data?.billPromotionId || null,
          billPromotionName: response.data?.billPromotionName || "",
          billPromotionDiscountAmount: Number(response.data?.billPromotionDiscountAmount || 0),
          appliedBillDiscountAmount: Number(response.data?.appliedBillDiscountAmount ?? billDiscount),
          billPromotionApplied: !!response.data?.billPromotionApplied,
        });

        setCartItems((currentItems) => currentItems.map((item, index) => {
          const preview = previewItems[index];
          if (!preview || String(preview.itemId) !== String(item.itemId)) {
            return item;
          }

          return {
            ...item,
            effectiveDiscountType: preview.discountType || item.discountType || DISCOUNT_TYPES.NONE,
            effectiveDiscountValue: Number(preview.discountValue || 0),
            promotionId: preview.promotionApplied ? preview.promotionId : null,
            promotionName: preview.promotionApplied ? preview.promotionName : "",
            promotionDiscountAmount: preview.promotionApplied ? Number(preview.promotionDiscountAmount || 0) : 0,
            promotionApplied: !!preview.promotionApplied,
            effectiveLineTotal: Number(preview.finalLineTotal || 0),
          };
        }));
      } catch (error) {
        console.error("Promotion preview failed", error);
        setBillPromotionPreview(null);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseServer, queueCartActive, isFreeLocalSalesPlan, effectiveBranchId, promotionPreviewSignature]);

  const createPendingOrderPayload = (items = cartItems) => ({
    customerId: customer ? customer.id : null,
    billDiscount,
    note: "",
    items: items.map((item) => createOrderItemPayload(item, true)),
  });

  const savePendingDraft = async (tableId = selectedTableId, { silent = false } = {}) => {
    if (!tableId) {
      if (!silent) toast.error("Select a table first");
      return null;
    }

    if (cartItems.length === 0) {
      if (!silent) toast.error("Cart is empty");
      return null;
    }

    setSavingDraft(true);
    try {
      const response = await pendingOrdersAPI.saveForTable(tableId, createPendingOrderPayload());
      await refreshDiningState(myShift?.branchId, tableId);
      if (!silent) {
        toast.success(`Draft saved for ${response.data.tableName}`);
      }
      return response.data;
    } catch (error) {
      console.error(error);
      if (!silent) {
        toast.error(error?.response?.data?.message || "Failed to save draft");
      }
      throw error;
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSelectTable = async (table) => {
    if (!table) return;

    setLoadingDraft(true);
    try {
      if (selectedTableId && Number(selectedTableId) !== Number(table.id) && cartItems.length > 0) {
        await savePendingDraft(selectedTableId, { silent: true });
      }

      setSelectedTableId(table.id);

      try {
        const response = await pendingOrdersAPI.getByTable(table.id);
        applyPendingOrderToCart(response.data);
      } catch (error) {
        if (error?.response?.status === 404) {
          clearSelectedTableDraft();
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to load table");
    } finally {
      setLoadingDraft(false);
      focusSearch();
    }
  };

  const handleSaleModeChange = async (nextMode) => {
    if (nextMode === saleMode) {
      return;
    }

    if (!canUseDining && nextMode === SALE_MODES.DINE_IN) {
      toast.error(diningUnavailableMessage);
      return;
    }

    if ((!canUseServer || queueCartActive) && nextMode === SALE_MODES.DINE_IN) {
      toast.error("Dine-in is not available while the current sale is in queue mode");
      return;
    }

    if (saleMode === SALE_MODES.DINE_IN && selectedTableId && cartItems.length > 0) {
      try {
        await savePendingDraft(selectedTableId, { silent: true });
      } catch (error) {
        return;
      }
      clearSelectedTableDraft();
      setSelectedTableId(null);
    }

    setSaleMode(nextMode);

    if (nextMode === SALE_MODES.TAKEAWAY) {
      setSelectedTableId(null);
    }
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return toast.error("Cart is empty");
    if (!canSell) return toast.error(canUseServer && !isFreeLocalSalesPlan ? "No active shift. Cannot checkout." : "POS queue mode is not ready.");
    if (saleMode === SALE_MODES.DINE_IN && !selectedTableId) return toast.error("Select a table before checkout");

    setPaymentError("");
    setPaidAmount(calculateTotal());
    setPaymentMethod("CASH");
    setShowPayment(true);
  };

  const handlePrintBill = () => {
    if (cartItems.length === 0) return toast.error("Cart is empty");
    if (!effectiveBranchId) return toast.error("Select a branch before printing bill");

    const total = calculateTotal();
    const subTotal = cartItems.reduce((acc, item) => acc + calculateItemBaseTotal(item), 0);
    const effectiveBillDiscount = getEffectiveBillDiscount(subTotal);
    const storeName = user?.shopName || BRAND_NAME_UPPER;
    const branchName = effectiveBranch?.name || myShift?.branchName || `Branch ${effectiveBranchId}`;
    const branchAddress = effectiveBranch?.address || myShift?.branchAddress || "";
    const branchPhone = effectiveBranch?.phone || myShift?.branchPhone || "";
    const branchLogo = effectiveBranch?.logoUrl || myShift?.branchLogo || "";
    const cashierName = user?.name || user?.username || "Cashier";
    const resolvedTableName = saleMode === SALE_MODES.DINE_IN
      ? (selectedTable?.tableName || pendingOrdersByTable[Number(selectedTableId)]?.tableName || "")
      : "";
    const billData = {
      orderId: saleMode === SALE_MODES.DINE_IN && selectedTableId ? `TABLE-${selectedTableId}` : "CURRENT",
      invoiceNo: saleMode === SALE_MODES.DINE_IN && resolvedTableName ? resolvedTableName : "CURRENT BILL",
      documentType: "PRE_BILL",
      subTitle: "Unpaid Bill",
      subTotal,
      billDiscount: effectiveBillDiscount,
      netTotal: total,
      paidAmount: 0,
      dueAmount: total,
      paymentMethod: "UNPAID",
      orderType: "UNPAID",
      saleMode,
      tableName: resolvedTableName,
      customerName: customer?.name || "Walk-in Customer",
      customerPhone: customer?.phone || "",
      createdAt: new Date().toISOString(),
      branchName,
      branchAddress,
      branchPhone,
      branchLogo,
      cashierName,
      note: "Pre-bill",
    };
    const billItems = cartItems.map((item) => ({
      ...item,
      discountType: getEffectiveDiscountType(item),
      discountValue: getEffectiveDiscountValue(item),
      lineTotal: calculateCartItemTotal(item),
    }));

    printRef.current?.printOrder(
      billData,
      billItems,
      storeName,
      { branchName, branchAddress, branchPhone, branchLogo, cashierName },
      customer,
      receiptSettings
    );
  };

  const handleStockOverrideDialogClose = (confirmed) => {
    const resolver = stockOverrideResolverRef.current;
    stockOverrideResolverRef.current = null;
    setStockOverrideDialog(null);
    if (resolver) {
      resolver(confirmed);
    }
  };

  const requestStockOverrideConfirmation = (error) => new Promise((resolve) => {
    stockOverrideResolverRef.current = resolve;
    setStockOverrideDialog({
      message: getApiErrorMessage(error, "Stock is insufficient for this sale."),
      shortages: getStockOverrideShortages(error),
    });
  });

  const handlePrintKot = async () => {
    if (!kotEnabled) {
      toast.error("KOT is disabled in app configuration");
      return;
    }
    if (!canUseServer || queueCartActive) {
      toast.error("KOT printing is unavailable while the current sale is in queue mode");
      return;
    }

    if (saleMode === SALE_MODES.DINE_IN && !selectedTableId) {
      toast.error("Select a table first");
      return;
    }

    const pendingKotItems = getPendingKotItems();
    if (pendingKotItems.length === 0) {
      toast.error("No new kitchen items to print");
      return;
    }

    setPrintingKot(true);
    try {
      if (!kotPrintRef.current) {
        return;
      }

      let kotMeta;

      if (saleMode === SALE_MODES.DINE_IN) {
        const draft = await savePendingDraft(selectedTableId, { silent: true });
        if (!draft) {
          return;
        }

        kotMeta = {
          orderId: draft.id,
          customerName: customer?.name || draft.customerName || "Walk-in Customer",
          tableName: draft.tableName,
          saleMode: "DINE IN",
          createdAt: new Date().toISOString(),
          branchName: myShift?.branchName,
          cashierName: user?.name || user?.username || "Cashier",
        };
      } else {
        kotMeta = {
          orderId: "QUICK-SALE",
          customerName: customer?.name || "Walk-in Customer",
          saleMode: "TAKEAWAY",
          createdAt: new Date().toISOString(),
          branchName: myShift?.branchName,
          cashierName: user?.name || user?.username || "Cashier",
        };
      }

      kotPrintRef.current.printKot(
        kotMeta,
        pendingKotItems,
        user?.shopName || BRAND_NAME_UPPER,
        myShift,
        kotReceiptSettings
      );

      markKotPrinted(currentSessionKey);
      toast.success("KOT ready to print");
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to print KOT");
    } finally {
      setPrintingKot(false);
    }
  };

  const handlePlaceOrder = async () => {
    const total = calculateTotal();
    const subTotal = cartItems.reduce((acc, item) => acc + calculateItemBaseTotal(item), 0);
    const effectiveBillDiscount = getEffectiveBillDiscount(subTotal);
    const kotItems = getKotEligibleItems(cartItems);
    const shouldPrintFullInvoice = printFullInvoice;
    const failCheckout = (message) => {
      setPaymentError(message);
      toast.error(message);
    };

    setPaymentError("");

    if (!effectiveBranchId) return failCheckout("Select a branch before checkout");
    const creditAmount = getCheckoutCreditAmount(total);
    if (creditAmount > 0 && !customer) return failCheckout("Select customer for credit sale");
    const creditLimitMessage = getCreditLimitValidationMessage(total);
    if (creditLimitMessage) return failCheckout(creditLimitMessage);
    if (!shouldUseServerForCheckout && creditAmount > 0) return failCheckout("Queue mode supports fully paid cash sales only");
    if (!shouldUseServerForCheckout && orderType !== ORDER_TYPES.CASH) return failCheckout("Queue mode supports cash sales only");
    if (!shouldUseServerForCheckout && saleMode !== SALE_MODES.TAKEAWAY) return failCheckout("Queue mode supports takeaway sales only");

    setLoading(true);
    try {
      const orderData = {
        branchId: effectiveBranchId,
        orderType,
        saleMode,
        tableId: saleMode === SALE_MODES.DINE_IN ? selectedTableId : null,
        customerId: customer ? customer.id : null,
        billDiscount,
        paidAmount: orderType === ORDER_TYPES.CASH ? paidAmount : 0,
        paymentMethod: orderType === ORDER_TYPES.CASH ? paymentMethod : "CREDIT",
        items: cartItems.map((item) => createOrderItemPayload(item, true)),
        note: "",
      };

      if (!shouldUseServerForCheckout) {
        const clientSaleId = window.crypto.randomUUID();
        const soldAt = new Date().toISOString();
        const storeName = user?.shopName || BRAND_NAME_UPPER;
        const branchName = effectiveBranch?.name || myShift?.branchName || `Branch ${effectiveBranchId}`;
        const branchAddress = effectiveBranch?.address || myShift?.branchAddress || "";
        const branchPhone = effectiveBranch?.phone || myShift?.branchPhone || "";
        const branchLogo = effectiveBranch?.logoUrl || myShift?.branchLogo || "";
        const cashierName = user?.name || user?.username || "Cashier";
        const customerName = customer?.name || "Walk-in Customer";
        const offlineInvoiceNo = buildOfflineInvoiceNo(clientSaleId);
        const receiptOrderData = {
          orderId: clientSaleId,
          invoiceNo: offlineInvoiceNo,
          subTotal,
          billDiscount: effectiveBillDiscount,
          netTotal: total,
          paidAmount,
          paymentMethod: orderData.paymentMethod,
          orderType,
          dueAmount: creditAmount,
          saleMode,
          customerName,
          customerPhone: customer?.phone || "",
          createdAt: soldAt,
          branchName,
          branchAddress,
          branchPhone,
          branchLogo,
          cashierName,
          note: isFreeLocalSalesPlan ? "Local FREE sale" : "Offline queued sale",
        };
        const receiptCartItems = cartItems.map((item) => ({
          ...item,
          discountType: getEffectiveDiscountType(item),
          discountValue: getEffectiveDiscountValue(item),
          lineTotal: calculateCartItemTotal(item),
        }));

        await addOfflineSale({
          clientSaleId,
          localOnly: isFreeLocalSalesPlan,
          branchId: effectiveBranchId,
          branchName,
          cashierUserId: user?.userId,
          cashierName,
          total,
          itemCount: cartItems.length,
          customerName,
          createdAt: soldAt,
          offlineSoldAt: soldAt,
          lastError: null,
          itemsPreview: cartItems.map((item) => ({
            itemId: item.itemId,
            itemName: item.name,
            batchId: item.batchId,
            qty: item.qty,
            qtyUnit: item.weightItem ? (item.qtyUnit || item.defaultUnit) : item.defaultUnit,
          })),
          printPayload: {
            orderData: receiptOrderData,
            cartItems: receiptCartItems,
            storeName,
            customerData: customer,
            shiftData: {
              branchName,
              branchAddress,
              branchPhone,
              branchLogo,
              cashierName,
            },
            receiptSettings: receiptSettings || null,
          },
          payload: {
            ...orderData,
            clientSaleId,
            offlineSoldAt: soldAt,
            items: cartItems.map((item) => createOrderItemPayload(item, true)),
          },
        });
        if (isFreeLocalSalesPlan) {
          setFreeLocalSalesSummary(await getFreeLocalSalesSummary());
        }

        if (configuration.printReceiptAfterCheckout !== false && printRef.current) {
          printRef.current.printOrder(
            receiptOrderData,
            receiptCartItems,
            storeName,
            {
              branchName,
              branchAddress,
              branchPhone,
              branchLogo,
              cashierName,
            },
            customer,
            receiptSettings
          );
        }

        toast.success(isFreeLocalSalesPlan ? "Sale saved locally" : "Sale saved to offline queue");
        clearCartState();
        return;
      }

      let response;
      try {
        response = await ordersAPI.create(orderData);
      } catch (error) {
        if (isStockOverrideRequiredError(error) && error?.response?.data?.overrideAvailable) {
          const confirmed = await requestStockOverrideConfirmation(error);
          if (!confirmed) {
            throw error;
          }
          response = await ordersAPI.create({
            ...orderData,
            allowStockOverride: true,
            stockOverrideReason: "POS stock shortage override",
          });
          toast.success("Stock override applied");
        } else {
          throw error;
        }
      }
      toast.success(`Order ${response.data.invoiceNo} success!`);

      const storeName = user?.shopName || BRAND_NAME_UPPER;
      const branchName = response.data.branchName || myShift?.branchName || effectiveBranch?.name;
      const branchAddress = response.data.branchAddress || myShift?.branchAddress || "";
      const branchPhone = response.data.branchPhone || myShift?.branchPhone || "";
      const branchLogo = response.data.branchLogo || myShift?.branchLogo || "";
      const cashierName = user?.name || user?.username || "Cashier";
      const customerName = customer?.name || response.data.customerName || "Walk-in Customer";
      const resolvedTableName = saleMode === SALE_MODES.DINE_IN
        ? (selectedTable?.tableName || pendingOrdersByTable[Number(selectedTableId)]?.tableName || "")
        : "";
      const printData = {
        orderId: response.data.id || response.data.invoiceNo,
        invoiceNo: response.data.invoiceNo,
        subTotal,
        billDiscount,
        netTotal: response.data.grandTotal ?? total,
        paidAmount: response.data.paidAmount ?? (orderType === ORDER_TYPES.CASH ? paidAmount : 0),
        dueAmount: response.data.dueAmount ?? creditAmount,
        paymentMethod: response.data.paymentMethod || orderData.paymentMethod,
        orderType: response.data.dueAmount > 0 && response.data.paidAmount > 0
          ? "CASH + CREDIT"
          : (response.data.orderType || orderType),
        saleMode,
        tableName: resolvedTableName,
        customerName,
        customerPhone: customer?.phone || "",
        createdAt: response.data.createdAt,
        branchName,
        branchAddress,
        branchPhone,
        branchLogo,
        cashierName,
        note: "",
      };

      if (configuration.printReceiptAfterCheckout !== false && printRef.current) {
        printRef.current.printOrder(printData, cartItems, storeName, myShift, customer, receiptSettings);
      }

      if (shouldPrintFullInvoice && invoicePrintRef.current) {
        invoicePrintRef.current.printInvoice(printData, cartItems, storeName, myShift, customer, receiptSettings);
      }

      const pendingKotItems = saleMode === SALE_MODES.TAKEAWAY ? getPendingKotItems() : kotItems;

      if (kotEnabled && saleMode === SALE_MODES.TAKEAWAY && pendingKotItems.length > 0 && kotPrintRef.current) {
        kotPrintRef.current.printKot(
          {
            orderId: response.data.id || response.data.invoiceNo,
            invoiceNo: response.data.invoiceNo,
            customerName: customer?.name || response.data.customerName || "Walk-in Customer",
            saleMode: "TAKEAWAY",
            createdAt: response.data.createdAt,
            branchName,
            branchAddress,
            branchPhone,
            branchLogo,
            cashierName,
          },
          pendingKotItems,
          storeName,
          myShift,
          kotReceiptSettings
        );
        markKotPrinted(currentSessionKey);
      }

      if (saleMode === SALE_MODES.DINE_IN && selectedTableId) {
        delete kotPrintedQuantitiesRef.current[currentSessionKey];
        await refreshDiningState(myShift.branchId, null);
        setSelectedTableId(null);
      }

      await fetchProducts(effectiveBranchId);

      clearCartState();

    } catch (error) {
      const message = getApiErrorMessage(error, "Failed");
      setPaymentError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useKeyboard("F4", () => setShowCustomerSelect(true));
  useKeyboard("F9", handleCheckout);
  useKeyboard("F1", () => showPayment && setOrderType(ORDER_TYPES.CASH));
  useKeyboard("F2", () => showPayment && shouldUseServerForCheckout && setOrderType(ORDER_TYPES.CREDIT));

  useKeyboard("Enter", () => {
    if (showPayment && !loading) handlePlaceOrder();
  });

  const hasKotItems = getKotEligibleItems(cartItems).length > 0;
  const pendingKotItemsCount = getPendingKotItems().length;
  const canPrintKot = saleMode === SALE_MODES.DINE_IN
    ? !!selectedTableId && pendingKotItemsCount > 0
    : pendingKotItemsCount > 0;
  const cartSummary = saleMode === SALE_MODES.DINE_IN
    ? selectedTable
      ? `${selectedTable.tableName} • ${pendingOrdersByTable[Number(selectedTable.id)]?.customerName || "Walk-in Customer"}`
      : "Dine-In • Select a table"
    : "Takeaway / Quick Sale";

  const branchLabel = myShift?.branchName || effectiveBranch?.name || effectiveBranchId;
  const checkoutTotal = calculateTotal();
  const checkoutCreditError = getCreditLimitValidationMessage(checkoutTotal);
  const checkoutError = paymentError || checkoutCreditError;

  if (loadingShift && cartItems.length === 0) {
    return <div className="h-full flex items-center justify-center"><LoadingSpinner text={canUseServer ? "Checking your shift..." : "Loading POS queue mode..."} /></div>;
  }

  return (
    <div className="page-enter flex h-full flex-col gap-1 overflow-y-auto bg-slate-100 p-1 font-sans text-slate-800 custom-scrollbar lg:gap-2 lg:overflow-hidden lg:p-2">
      <div className="flex flex-1 flex-col gap-1 lg:h-full lg:flex-row lg:gap-2 lg:overflow-hidden">
        <div className="sales-surface sales-panel-enter flex h-[58vh] min-w-0 flex-shrink-0 flex-col overflow-hidden rounded-xl lg:h-full lg:flex-1 lg:rounded-2xl relative" style={{ animationDelay: "90ms" }}>

          <header className="page-section-enter flex flex-shrink-0 flex-col gap-2 border-b border-slate-100 bg-white px-2 py-2 lg:px-4 lg:py-3" style={{ animationDelay: "140ms" }}>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="hidden sm:block lg:block">
                <h1 className="text-sm lg:text-xl font-bold text-slate-800">
                  New Sale {branchLabel ? `(Branch: ${branchLabel})` : ""}
                </h1>
                {!shouldUseServerForCheckout ? (
              <p className="mt-1 text-xs font-medium text-amber-600">
                    {isFreeLocalSalesPlan
                      ? `FREE package active. Today local: ${formatCurrency(freeLocalSalesSummary.total)} (${freeLocalSalesSummary.count})`
                      : "Queue mode active. This sale will stay local until you import it."}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center flex-1 lg:flex-none lg:w-1/3 w-full">
                <div className="relative flex-1">
                  <Search className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search barcode or name"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    disabled={!canSell}
                    className="w-full pl-8 lg:pl-10 pr-3 lg:pr-4 py-1.5 lg:py-2.5 rounded-lg lg:rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs lg:text-sm disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="inline-flex rounded-xl bg-slate-100 p-1 sales-panel-hover">
                <button
                  type="button"
                  onClick={() => handleSaleModeChange(SALE_MODES.TAKEAWAY)}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    saleMode === SALE_MODES.TAKEAWAY ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <ShoppingBag size={16} />
                  Quick Sale
                </button>
                {canUseDining && (
                  <button
                    type="button"
                    onClick={() => handleSaleModeChange(SALE_MODES.DINE_IN)}
                    disabled={!canUseServer || queueCartActive}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      saleMode === SALE_MODES.DINE_IN ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <UtensilsCrossed size={16} />
                    Dine In
                  </button>
                )}
              </div>

              {saleMode === SALE_MODES.DINE_IN ? (
                <div className="text-xs font-medium text-slate-500">
                  {selectedTable ? `Selected: ${selectedTable.tableName}` : "Select a table to load or save a draft bill"}
                </div>
              ) : null}
            </div>
          </header>

          {saleMode === SALE_MODES.DINE_IN ? (
            <div className="page-section-enter border-b border-slate-100 bg-white px-2 py-2 lg:px-6 lg:py-4" style={{ animationDelay: "180ms" }}>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-800">Dining Tables</div>
                <button
                  type="button"
                  onClick={() => refreshDiningState(myShift?.branchId)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  <RefreshCw size={14} />
                  Refresh
                </button>
              </div>

              {loadingDiningState || loadingDraft ? (
                <div className="py-6">
                  <LoadingSpinner text={loadingDraft ? "Loading table draft..." : "Loading tables..."} />
                </div>
              ) : diningTables.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                  No dining tables configured for this branch.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 xl:grid-cols-5">
                  {diningTables.map((table) => {
                    const pending = pendingOrdersByTable[Number(table.id)];
                    const isSelected = Number(selectedTableId) === Number(table.id);
                    const displayCustomer = isSelected
                      ? (customer?.name || pending?.customerName || "Walk-in Customer")
                      : (pending?.customerName || "Walk-in Customer");
                    const displayTotal = isSelected && cartItems.length > 0
                      ? calculateTotal()
                      : Number(pending?.grandTotal || 0);

                    return (
                      <button
                        key={table.id}
                        type="button"
                        onClick={() => handleSelectTable(table)}
                        className={`sales-panel-hover rounded-xl border px-3 py-3 text-left transition ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 shadow-sm"
                            : "border-slate-200 bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-slate-900">{table.tableName}</div>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            table.status === "OCCUPIED"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}>
                            {table.status}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          <div>{displayCustomer}</div>
                          <div className="mt-1 font-semibold text-slate-700">{formatCurrency(displayTotal)}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          <div className="page-section-enter flex-shrink-0 border-b border-slate-100 bg-white px-2 py-1.5 lg:px-4 lg:py-2.5" style={{ animationDelay: "220ms" }}>
            <div className="relative">
              <div ref={categoryScrollRef} className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5 pr-11 lg:gap-2 lg:pb-0 lg:pr-14">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  disabled={!canSell}
                  className={`px-3 lg:px-5 py-1 lg:py-2 rounded-md lg:rounded-lg whitespace-nowrap text-[10px] lg:text-sm font-semibold transition-all ${
                    activeCategory === cat
                      ? "bg-blue-600 text-white shadow-sm lg:shadow-md shadow-blue-200"
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                  }`}
                >
                  {cat}
                </button>
              ))}
              </div>
              {categories.length > 4 ? (
                <button
                  type="button"
                  onClick={scrollCategoriesForward}
                  className="absolute right-0 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 lg:h-9 lg:w-9"
                  aria-label="Scroll categories"
                >
                  <ChevronRight size={16} />
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50 p-1.5 custom-scrollbar lg:p-3">
            {!canSell ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Lock className="mb-2 lg:mb-4 opacity-30 w-8 h-8 lg:w-12 lg:h-12" />
                <p className="text-sm lg:text-lg font-medium text-center">
                  {canUseServer ? "Open a shift to view items" : "Select a branch online first to cache items for queue mode"}
                </p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Search className="mb-2 lg:mb-4 opacity-30 w-8 h-8 lg:w-12 lg:h-12" />
                <p className="text-sm lg:text-lg font-medium text-center">No items found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 lg:gap-3 xl:grid-cols-4 2xl:grid-cols-5">
                {filteredItems.map((item) => {
                  const unlimitedStockItem = isUnlimitedStockItem(item);
                  const stockQty = getSellableStockBaseQty(item);
                  const isOutOfStock = !unlimitedStockItem && stockQty <= 0;
                  const canSelectOutOfStock = isOutOfStock && stockOverrideCanProceed;
                  const tileDisabled = isOutOfStock && !canSelectOutOfStock;
                  const stockLabel = item.stockUnmanaged
                    ? "Available"
                    : item.itemType === ItemType.RECIPE
                      ? "Recipe"
                      : formatStockDisplay(item);

                  return (
                    <div
                      key={item.id}
                      onClick={() => !tileDisabled && addToCart(item)}
                      style={{ animationDelay: `${240 + (filteredItems.indexOf(item) % 12) * 32}ms` }}
                      className={`sales-product-tile sales-panel-hover group relative flex min-h-[144px] flex-col rounded-lg border border-slate-200 bg-white px-2 py-3 text-center transition-all lg:min-h-[164px] lg:rounded-xl lg:px-4 lg:py-3 ${
                        !tileDisabled
                          ? "hover:shadow-md cursor-pointer active:scale-95"
                          : "cursor-not-allowed opacity-90"
                      }`}
                    >
                      <div className="absolute top-1 right-1 lg:top-2 lg:right-2 flex flex-col items-end gap-1">
                        {item.itemType === ItemType.SERVICE ? (
                          <span className="px-1.5 lg:px-2 py-[1px] lg:py-0.5 bg-purple-50 text-purple-600 text-[8px] lg:text-[10px] font-bold rounded border border-purple-100 uppercase">Service</span>
                        ) : item.itemType === ItemType.RECIPE && !isOutOfStock ? (
                          <span className="px-1.5 lg:px-2 py-[1px] lg:py-0.5 bg-rose-50 text-rose-600 text-[8px] lg:text-[10px] font-bold rounded border border-rose-100 uppercase">
                            {item.isKotEnabled ? "Recipe • KOT" : "Recipe"}
                          </span>
                        ) : isOutOfStock ? (
                          <span className={`px-1.5 lg:px-2 py-[1px] lg:py-0.5 text-[8px] lg:text-[10px] font-bold rounded border uppercase ${
                            canSelectOutOfStock
                              ? "border-amber-200 bg-amber-50 text-amber-600"
                              : "border-red-100 bg-red-50 text-red-500"
                          }`}>
                            {canSelectOutOfStock ? "Override" : "Out"}
                          </span>
                        ) : (
                          <span className="px-1.5 lg:px-2 py-[1px] lg:py-0.5 bg-emerald-50 text-emerald-600 text-[8px] lg:text-[10px] font-bold rounded border border-emerald-100 whitespace-nowrap">{stockLabel}</span>
                        )}
                      </div>

                      <div className="mt-1.5 flex h-8 w-8 items-center justify-center self-center rounded-full bg-slate-50 lg:mt-1.5 lg:h-10 lg:w-10">
                        <ChefHat className={`w-4 h-4 lg:w-6 lg:h-6 ${tileDisabled ? "text-slate-200" : "text-slate-300"}`} />
                      </div>
                      <div className="mt-auto flex w-full flex-col items-center gap-0.5 pt-2">
                        <h3 className="h-[2.3rem] overflow-hidden text-[10px] font-medium leading-[1.15rem] text-slate-700 line-clamp-2 break-all lg:h-[2.7rem] lg:text-[13px] lg:leading-[1.35rem] lg:line-clamp-2">
                          {item.name}
                        </h3>
                        <p className="text-[11px] font-bold text-blue-600 lg:text-[14px]">{item.itemType === ItemType.SERVICE && item.sellingPrice === 0 ? "Open Price" : formatCurrency(item.sellingPrice)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        <PanelResizeHandle
          onMouseDown={handleResizeStart}
          isResizing={isResizingPanels}
          minHeightClassName="min-h-full"
        />
        <div
          className={`sales-surface sales-panel-enter w-full min-w-0 flex-shrink-0 flex-col h-max rounded-xl transition-opacity duration-300 lg:h-full lg:overflow-hidden lg:rounded-2xl ${!canSell ? "pointer-events-none opacity-50 grayscale" : ""}`}
          style={{ width: `min(100%, ${cartPanelWidth}px)`, animationDelay: "130ms" }}
        >
          <Cart
            items={cartItems}
            customer={customer}
            setCustomer={setCustomer}
            onUpdateQty={updateQuantity}
            onUpdatePrice={updateUnitPrice}
            onRemoveItem={removeItem}
            onInlineDiscount={handleInlineDiscount}
            onUpdateQtyUnit={updateQtyUnit}
            onUpdateWarranty={updateWarranty}
            warrantyOptions={warrantyOptions}
            warrantyEnabled={canAddWarranty}
            billDiscount={billDiscount}
            setBillDiscount={setBillDiscount}
            billPromotion={billPromotionPreview}
            onCheckout={handleCheckout}
            loading={loading}
            onAddCustomer={() => setShowCustomerSelect(true)}
            focusSearch={focusSearch}
            cartSummary={cartSummary}
            checkoutLabel={saleMode === SALE_MODES.DINE_IN ? "Checkout Table (F9)" : "Checkout (F9)"}
            sideAction={(
              <button
                type="button"
                onClick={handlePrintKot}
                disabled={!kotEnabled || !canUseServer || queueCartActive || printingKot || !hasKotItems || !canPrintKot}
                className="inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChefHat size={16} />
                {printingKot ? "Printing..." : "Print KOT"}
              </button>
            )}
            footerActions={(
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handlePrintBill}
                    disabled={cartItems.length === 0}
                    className="inline-flex h-[40px] items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Printer size={16} />
                    Print Bill
                  </button>
                  {saleMode === SALE_MODES.DINE_IN ? (
                    <button
                      type="button"
                      onClick={() => savePendingDraft()}
                      disabled={savingDraft || !selectedTableId || cartItems.length === 0}
                      className="inline-flex h-[40px] items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Save size={16} />
                      {savingDraft ? "Saving..." : "Save Draft"}
                    </button>
                  ) : (
                    <div />
                  )}
                </div>
                {!kotEnabled ? (
                  <div className="text-[11px] text-slate-500">KOT is disabled in App Configuration.</div>
                ) : saleMode === SALE_MODES.DINE_IN && !selectedTableId ? (
                  <div className="text-[11px] text-slate-500">Select a table before saving or sending KOT.</div>
                ) : !canUseServer || queueCartActive ? (
                  <div className="text-[11px] text-slate-500">KOT printing is available only for server-mode sales.</div>
                ) : !hasKotItems ? (
                  <div className="text-[11px] text-slate-500">No KOT-enabled items in the cart.</div>
                ) : !canPrintKot ? (
                  <div className="text-[11px] text-slate-500">KOT already sent for current items. Add new kitchen items to print again.</div>
                ) : null}
              </>
            )}
          />
        </div>
      </div>

      <CustomerSelect isOpen={showCustomerSelect} onClose={() => { setShowCustomerSelect(false); }} onSelectCustomer={setCustomer} />
      <CheckoutOverlay
        isOpen={showPayment}
        onClose={() => { setShowPayment(false); setPaymentError(""); }}
        total={checkoutTotal}
        orderType={orderType}
        setOrderType={setOrderType}
        paidAmount={paidAmount}
        setPaidAmount={setPaidAmount}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        onPlaceOrder={handlePlaceOrder}
        loading={loading}
        printFullInvoice={printFullInvoice}
        setPrintFullInvoice={setPrintFullInvoice}
        isOnline={shouldUseServerForCheckout}
        customer={customer}
        errorMessage={checkoutError}
      />
      <Modal
        isOpen={!!stockOverrideDialog}
        onClose={() => handleStockOverrideDialogClose(false)}
        title="Confirm Stock Override"
        size="sm"
      >
        <div className="space-y-5">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
              <AlertTriangle size={22} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Stock is insufficient for this sale.</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Continuing will complete the sale and allow negative stock for the shortage items.
              </p>
            </div>
          </div>

          {stockOverrideDialog?.shortages?.length ? (
            <div className="overflow-hidden rounded-xl border border-amber-100 bg-amber-50/50">
              <div className="border-b border-amber-100 px-4 py-2 text-xs font-bold uppercase text-amber-700">
                Shortage Items
              </div>
              <div className="divide-y divide-amber-100 bg-white">
                {stockOverrideDialog.shortages.map((shortage, index) => (
                  <div key={`${shortage.itemLabel}-${index}`} className="px-4 py-3">
                    <div className="text-sm font-semibold text-slate-800">{shortage.itemLabel}</div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>Need: <span className="font-semibold text-slate-700">{formatStockQuantity(shortage.requiredQuantity)} {shortage.unit}</span></span>
                      <span>Available: <span className="font-semibold text-red-600">{formatStockQuantity(shortage.availableQuantity)} {shortage.unit}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {stockOverrideDialog?.message}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleStockOverrideDialogClose(false)}
            >
              Go Back
            </Button>
            <Button
              type="button"
              className="bg-amber-600 text-white shadow-md shadow-amber-200 hover:bg-amber-700"
              onClick={() => handleStockOverrideDialogClose(true)}
            >
              Allow Override
            </Button>
          </div>
        </div>
      </Modal>
      <ReceiptPrinter ref={printRef} />
      <InvoicePrinter ref={invoicePrintRef} />
      <KotPrinter ref={kotPrintRef} />
      <BatchSelectModal
        isOpen={showBatchModal}
        onClose={() => {
          setShowBatchModal(false);
          setSelectedBatchItem(null);
        }}
        item={selectedBatchItem}
        onSelectBatch={(batch) => {
          processAddToCart(selectedBatchItem, batch.price ?? selectedBatchItem?.sellingPrice ?? 0, 1, batch);
          setShowBatchModal(false);
          setSelectedBatchItem(null);
        }}
      />
    </div>
  );
};

export default POS;
