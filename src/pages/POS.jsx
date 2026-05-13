import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { Search, ChefHat, Lock, ShoppingBag, UtensilsCrossed, Save, RefreshCw } from "lucide-react";
import { useKeyboard } from "../hooks/useKeyboard";
import { itemsAPI } from "../api/items.api";
import { ordersAPI } from "../api/orders.api";
import { shiftsAPI } from "../api/shifts.api";
import { diningTablesAPI } from "../api/diningTables.api";
import { pendingOrdersAPI } from "../api/pendingOrders.api";
import CustomerSelect from "../components/pos/CustomerSelect";
import Cart from "../components/pos/Cart";
import CheckoutOverlay from "../components/pos/CheckoutOverlay";
import BatchSelectModal from "../components/pos/BatchSelectModal";
import { formatCurrency } from "../utils/formatters";
import { ORDER_TYPES, DISCOUNT_TYPES, ItemType, SALE_MODES } from "../utils/constants";
import { useAuth } from "../context/AuthContext";
import { useBranch } from "../context/BranchContext";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ReceiptPrinter from "../components/pos/ReceiptPrinter";
import KotPrinter from "../components/pos/KotPrinter";
import { receiptSettingsAPI } from "../api/receiptSettings.api";
import { PRINT_TEMPLATE_TYPES } from "../utils/receiptSettings";
import { openPdfBlob } from "../utils/pdf";
import PanelResizeHandle from "../components/common/PanelResizeHandle";
import { BRAND_NAME_UPPER } from "../utils/branding";
import { hasPlanFeature } from "../utils/subscriptionFeatures";
import {
  addOfflineSale,
  cacheItemsForBranch,
  cacheReceiptSettings,
  getCachedItemsForBranch,
  getCachedReceiptSettings,
  getFreeLocalSalesSummary,
} from "../offline/db";

const GRAMS_PER_KILOGRAM = 1000;

const isWeightItem = (item) =>
  item?.itemType === ItemType.WEIGHT || item?.weightItem === true;

const isUnlimitedStockItem = (item) =>
  item?.itemType === ItemType.SERVICE || item?.stockUnmanaged === true;

const isBatchlessItem = (item) =>
  item?.itemType === ItemType.SERVICE || item?.itemType === ItemType.RECIPE;

const toBaseQuantity = (quantity, unit, weightItem = false) => {
  const numeric = Number(quantity);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  if (!weightItem) {
    return numeric;
  }
  return unit === "KG" ? numeric * GRAMS_PER_KILOGRAM : numeric;
};

const fromBaseQuantity = (baseQuantity, unit, weightItem = false) => {
  const numeric = Number(baseQuantity);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  if (!weightItem) {
    return numeric;
  }
  return unit === "KG" ? numeric / GRAMS_PER_KILOGRAM : numeric;
};

const getWeightStep = (unit) => (unit === "G" ? 100 : 0.1);

const getInitialWeightQuantity = (unit) => (unit === "G" ? 100 : 1);

const getPerGramPrice = (configuredPrice, weightItem = false) => {
  const numeric = Number(configuredPrice);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return weightItem ? numeric / GRAMS_PER_KILOGRAM : numeric;
};

const formatQty = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return String(value ?? "");
  }
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(3).replace(/\.?0+$/, "");
};

const getStockDisplayQty = (item, batch = null) => {
  if (!isWeightItem(item)) {
    const rawQty = batch ? batch.qty : item.availableQty;
    const numeric = Number(rawQty);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  const rawBaseQty = batch
    ? batch.qty
    : (item.availableBaseQty ?? item.availableQty ?? 0);
  const numeric = Number(rawBaseQty);
  return Number.isFinite(numeric) ? numeric / GRAMS_PER_KILOGRAM : 0;
};

const getStockDisplayUnit = (item) => (isWeightItem(item) ? "KG" : (item.defaultUnit || "PCS"));

const formatStockDisplay = (item, batch = null) =>
  `${formatQty(getStockDisplayQty(item, batch))} ${getStockDisplayUnit(item)}`;

const buildOfflineInvoiceNo = (clientSaleId) =>
  `OFF-${String(clientSaleId || "").replace(/-/g, "").slice(0, 8).toUpperCase()}`;

const getApiErrorMessage = (error, fallback = "Failed") =>
  error?.response?.data?.message || error?.response?.data?.detail || fallback;

const CART_MODES = {
  ONLINE: "ONLINE",
  QUEUE: "QUEUE",
};

const getCartDraftKey = (userId, branchId) =>
  userId && branchId ? `pos-active-cart-v1:${userId}:${branchId}` : null;

const POS = () => {
  const { user, isOnline, hasOnlineSession, isOfflineSession } = useAuth();
  const { selectedBranchId, branches } = useBranch();
  const printRef = useRef(null);
  const kotPrintRef = useRef(null);
  const searchInputRef = useRef(null);
  const kotPrintedQuantitiesRef = useRef({});
  const hydratedCartDraftKeysRef = useRef(new Set());

  const [myShift, setMyShift] = useState(null);
  const [loadingShift, setLoadingShift] = useState(true);

  const [allItems, setAllItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [categories, setCategories] = useState(["All"]);

  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedBatchItem, setSelectedBatchItem] = useState(null);

  const [customer, setCustomer] = useState(null);
  const [orderType, setOrderType] = useState(ORDER_TYPES.CASH);
  const [saleMode, setSaleMode] = useState(SALE_MODES.TAKEAWAY);
  const [cartMode, setCartMode] = useState(null);
  const [billDiscount, setBillDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentError, setPaymentError] = useState("");
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

  const isAdminUser = user?.role === "ADMIN" || user?.role === "MANAGER";
  const canUseServer = isOnline && hasOnlineSession && !isOfflineSession;
  const isFreeStockUnmanagedPlan = user?.planName === "FREE" || user?.planName === "MONTHLY_DEMO";
  const isFreeLocalSalesPlan = isFreeStockUnmanagedPlan;
  const canUseDining = hasPlanFeature(user?.planName, "DINING_TABLES");
  const activeCartMode = cartItems.length > 0
    ? (cartMode || (canUseServer && !isFreeLocalSalesPlan ? CART_MODES.ONLINE : CART_MODES.QUEUE))
    : null;
  const queueCartActive = activeCartMode === CART_MODES.QUEUE;
  const shouldUseServerForCheckout = activeCartMode
    ? activeCartMode === CART_MODES.ONLINE && canUseServer && !isFreeLocalSalesPlan
    : canUseServer && !isFreeLocalSalesPlan;
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
      return getRecipeAvailableQty(item);
    }

    return Number(batchData ? batchData.qty : (item?.availableBaseQty ?? 0));
  };

  useEffect(() => {
    if (searchInputRef.current && !loadingShift && canSell) {
      searchInputRef.current.focus();
    }
  }, [canSell, loadingShift]);

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

  const calculateItemBaseTotal = (item) => {
    const qty = Number(item?.qty || 0);
    if (!Number.isFinite(qty) || qty <= 0) return 0;

    const unitPrice = Number(item?.unitPrice || 0);
    const perGramPrice = Number(item?.perGramPrice || 0);

    if (item?.weightItem && item?.qtyUnit === "G") {
      return qty * (Number.isFinite(perGramPrice) ? perGramPrice : 0);
    }

    return qty * (Number.isFinite(unitPrice) ? unitPrice : 0);
  };

  const calculateTotal = () => {
    let total = 0;
    cartItems.forEach((item) => {
      let itemTotal = calculateItemBaseTotal(item);
      const discountValue = Number(item?.discountValue || 0);

      if (item.discountType === DISCOUNT_TYPES.FIXED) {
        itemTotal -= discountValue;
      } else if (item.discountType === DISCOUNT_TYPES.PERCENT) {
        itemTotal -= (itemTotal * discountValue) / 100;
      }

      total += Math.max(0, Number.isFinite(itemTotal) ? itemTotal : 0);
    });

    const normalizedBillDiscount = toNonNegativeNumber(billDiscount);
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

  const getCartLineKey = (item) => `${item.itemId}-${item.batchId ?? "NA"}`;

  const getComparableQty = (item) =>
    isWeightItem(item)
      ? toBaseQuantity(item.qty, item.qtyUnit || item.defaultUnit, true)
      : Number(item.qty || 0);

  const getKotEligibleItems = (items) => items.filter((item) => item.isKotEnabled);

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
    const weightItem = isWeightItem(sourceItem || pendingItem);
    const qtyUnit = pendingItem.qtyUnit || sourceItem?.defaultUnit || "PCS";
    const unitPrice = Number(pendingItem.unitPrice || 0);

    return {
      itemId: pendingItem.itemId,
      batchId: pendingItem.batchId,
      name: pendingItem.itemName,
      barcode: pendingItem.barcode || sourceItem?.barcode,
      unitPrice,
      perGramPrice: getPerGramPrice(unitPrice, weightItem),
      qty: Number(pendingItem.qty || 0),
      qtyUnit,
      weightItem,
      itemType: sourceItem?.itemType || ItemType.NORMAL,
      defaultUnit: sourceItem?.defaultUnit || qtyUnit,
      discountType: pendingItem.discountType || DISCOUNT_TYPES.NONE,
      discountValue: Number(pendingItem.discountValue || 0),
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
      toast.error(canUseDining ? "POS switched to takeaway-only queue mode." : "Tables are not available in this package.");
    }
  }, [canUseDining, canUseServer, saleMode]);

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

      const uniqueCats = ["All", ...new Set(items.map((item) => item.categoryName).filter(Boolean))];
      setCategories(uniqueCats);
    } catch (error) {
      console.error(error);
      const cachedItems = await getCachedItemsForBranch(branchId);
      if (cachedItems.length > 0) {
        const localItems = cachedItems.map((item) => ({
          ...item,
          stockUnmanaged: isFreeStockUnmanagedPlan && item.itemType !== ItemType.SERVICE && item.itemType !== ItemType.RECIPE,
        }));
        setAllItems(localItems);
        setFilteredItems(localItems);
        setCategories(["All", ...new Set(localItems.map((item) => item.categoryName).filter(Boolean))]);
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
      result = result.filter((item) => item.categoryName === activeCategory);
    }
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter((item) =>
        item.name.toLowerCase().includes(lowerQuery) ||
        item.barcode?.toLowerCase().includes(lowerQuery)
      );
    }
    setFilteredItems(result);
  }, [activeCategory, searchQuery, allItems]);

  const addToCart = (item) => {
    if (!canSell) {
      toast.error(canUseServer ? "Please open a shift first!" : "POS queue mode is not ready for this branch");
      return;
    }

    if (isBatchlessItem(item)) {
      processAddToCart(item, item.sellingPrice || 0, 1, null);
      return;
    }

    if (item.batches && item.batches.length > 1) {
      setSelectedBatchItem(item);
      setShowBatchModal(true);
      return;
    }

    const targetBatch = item.batches && item.batches.length > 0 ? item.batches[0] : null;
    processAddToCart(item, targetBatch ? targetBatch.price : item.sellingPrice, 1, targetBatch);
  };

  const handleBatchSelect = (batch) => {
    processAddToCart(selectedBatchItem, batch.price, 1, batch);
    setShowBatchModal(false);
    setSelectedBatchItem(null);
  };

  const processAddToCart = (item, price, qty, batchData = null) => {
    if (cartItems.length === 0 && !cartMode) {
      setCartMode(canUseServer && !isFreeLocalSalesPlan ? CART_MODES.ONLINE : CART_MODES.QUEUE);
    }

    const unlimitedStockItem = isUnlimitedStockItem(item);
    const isWeight = isWeightItem(item);
    const batchId = batchData ? batchData.batchId : (item.batches?.[0]?.batchId || null);

    const defaultUnit = item.defaultUnit || "PCS";
    const qtyToAdd = isWeight ? getInitialWeightQuantity(defaultUnit) : qty;
    const stockBaseQty = getSellableStockBaseQty(item, batchData);
    const requestedBaseQty = isWeight ? toBaseQuantity(qtyToAdd, defaultUnit, true) : qtyToAdd;

    if (!unlimitedStockItem && stockBaseQty < requestedBaseQty) {
      toast.error(item.itemType === ItemType.RECIPE ? "Item is Out of Stock!" : `Insufficient stock! Available: ${formatStockDisplay(item, batchData)}`);
      if (searchInputRef.current) searchInputRef.current.focus();
      return;
    }

    const existingIndex = cartItems.findIndex(
      (cartItem) => String(cartItem.itemId) === String(item.id) && String(cartItem.batchId) === String(batchId)
    );

    if (existingIndex !== -1) {
      const newItems = [...cartItems];
      const currentItem = newItems[existingIndex];
      const incrementQty = isWeight
        ? getWeightStep(currentItem.qtyUnit || currentItem.defaultUnit)
        : qty;
      const nextQty = currentItem.qty + incrementQty;
      const nextBaseQty = isWeight
        ? toBaseQuantity(nextQty, currentItem.qtyUnit || currentItem.defaultUnit, true)
        : nextQty;

      if (!unlimitedStockItem && nextBaseQty > currentItem.stockBaseQty) {
        toast.error(item.itemType === ItemType.RECIPE ? "Low stock." : `Low stock. Available: ${formatStockDisplay(item, batchData)}`);
        if (searchInputRef.current) searchInputRef.current.focus();
        return;
      }

      newItems[existingIndex] = { ...newItems[existingIndex], qty: nextQty };
      setCartItems(newItems);
    } else {
      const unitPrice = Number(price);
      const gramPrice = getPerGramPrice(unitPrice, isWeight);

      setCartItems((prev) => [
        ...prev,
        {
          itemId: item.id,
          batchId,
          name: item.name,
          barcode: item.barcode,
          unitPrice,
          perGramPrice: gramPrice,
          qty: qtyToAdd,
          qtyUnit: defaultUnit,
          weightItem: isWeight,
          itemType: item.itemType,
          defaultUnit,
          discountType: DISCOUNT_TYPES.NONE,
          discountValue: 0,
          stockBaseQty,
          stockUnmanaged: !!item.stockUnmanaged,
          image: item.imageUrl,
          isKotEnabled: !!item.isKotEnabled,
        },
      ]);
    }

    setSearchQuery("");
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
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

        if (!isUnlimitedStockItem(itemToAdd) && stockQty <= 0) {
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

    let finalQty = newQty;
    if (item.weightItem && item.qtyUnit === "KG") {
      finalQty = Math.round(newQty * 1000) / 1000;
    } else if (item.weightItem && item.qtyUnit === "G") {
      finalQty = Math.round(newQty);
    } else {
      finalQty = Math.round(newQty);
    }

    if (finalQty < 0) return;

    if (!unlimitedStockItem && item.stockBaseQty > 0) {
      const compareQty = item.weightItem
        ? toBaseQuantity(finalQty, item.qtyUnit || item.defaultUnit, true)
        : finalQty;
      if (compareQty > item.stockBaseQty) {
        toast.error("Low stock.");
        return;
      }
    }

    const newItems = [...cartItems];
    newItems[index].qty = finalQty;
    setCartItems(newItems);

    if (!preventFocus && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const updateUnitPrice = (index, newPrice) => {
    const newItems = [...cartItems];
    const nextUnitPrice = toNonNegativeNumber(newPrice);
    newItems[index].unitPrice = nextUnitPrice;
    if (newItems[index].weightItem) {
      newItems[index].perGramPrice = getPerGramPrice(nextUnitPrice, true);
    }
    setCartItems(newItems);
  };

  const focusSearch = () => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
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
    item.qty = getInitialWeightQuantity(unit);
    setCartItems(newItems);
  };

  const removeItem = (index) => {
    setCartItems(cartItems.filter((_, itemIndex) => itemIndex !== index));
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const handleInlineDiscount = (index, type, value) => {
    const newItems = [...cartItems];
    newItems[index].discountType = type;
    newItems[index].discountValue = toNonNegativeNumber(value);
    setCartItems(newItems);
  };

  const createPendingOrderPayload = () => ({
    customerId: customer ? customer.id : null,
    billDiscount,
    note: "",
    items: cartItems.map((item) => ({
      itemId: item.itemId,
      batchId: item.batchId,
      qty: item.qty,
      qtyUnit: item.weightItem ? (item.qtyUnit || item.defaultUnit) : undefined,
      unitPrice: item.unitPrice,
      discountType: item.discountType,
      discountValue: item.discountValue,
    })),
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
      toast.error("Tables are not available in this package");
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

  const handlePrintKot = async () => {
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
        items: cartItems.map((item) => ({
          itemId: item.itemId,
          batchId: item.batchId,
          qty: item.qty,
          qtyUnit: item.weightItem ? (item.qtyUnit || item.defaultUnit) : undefined,
          unitPrice: item.unitPrice,
          discountType: item.discountType,
          discountValue: item.discountValue,
        })),
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
          billDiscount,
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
          lineTotal: calculateItemBaseTotal(item),
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
            items: cartItems.map((item) => ({
              itemId: item.itemId,
              batchId: item.batchId,
              qty: item.qty,
              qtyUnit: item.weightItem ? (item.qtyUnit || item.defaultUnit) : undefined,
              unitPrice: item.unitPrice,
              discountType: item.discountType,
              discountValue: item.discountValue,
            })),
          },
        });
        if (isFreeLocalSalesPlan) {
          setFreeLocalSalesSummary(await getFreeLocalSalesSummary());
        }

        if (printRef.current) {
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
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
        return;
      }

      const response = await ordersAPI.create(orderData);
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

      if (printRef.current) {
        printRef.current.printOrder(printData, cartItems, storeName, myShift, customer, receiptSettings);
      }

      if (shouldPrintFullInvoice) {
        const invoicePdfResponse = await ordersAPI.downloadInvoicePdf(response.data.invoiceNo);
        openPdfBlob(invoicePdfResponse.data, `${response.data.invoiceNo}.pdf`);
      }

      const pendingKotItems = saleMode === SALE_MODES.TAKEAWAY ? getPendingKotItems() : kotItems;

      if (saleMode === SALE_MODES.TAKEAWAY && pendingKotItems.length > 0 && kotPrintRef.current) {
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

      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
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
    <div className="page-enter flex h-full flex-col gap-1.5 overflow-y-auto bg-slate-100 p-1.5 font-sans text-slate-800 custom-scrollbar lg:gap-4 lg:overflow-hidden lg:p-4">
      <div className="flex flex-1 flex-col gap-1.5 lg:h-full lg:flex-row lg:gap-4 lg:overflow-hidden">
        <div className="sales-surface sales-panel-enter flex h-[55vh] min-w-0 flex-shrink-0 flex-col overflow-hidden rounded-xl lg:h-full lg:flex-1 lg:rounded-2xl relative" style={{ animationDelay: "90ms" }}>

          <header className="page-section-enter flex flex-shrink-0 flex-col gap-3 border-b border-slate-100 bg-white px-2 py-2 lg:px-6 lg:py-5" style={{ animationDelay: "140ms" }}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
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

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
                <button
                  type="button"
                  onClick={() => handleSaleModeChange(SALE_MODES.DINE_IN)}
                  disabled={!canUseServer || !canUseDining || queueCartActive}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    saleMode === SALE_MODES.DINE_IN ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <UtensilsCrossed size={16} />
                  Dine In
                </button>
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

          <div className="page-section-enter flex-shrink-0 border-b border-slate-100 bg-white px-2 py-1.5 lg:px-6 lg:py-4" style={{ animationDelay: "220ms" }}>
            <div className="flex gap-1.5 lg:gap-2 overflow-x-auto scrollbar-hide pb-0.5 lg:pb-0">
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
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50 p-1.5 custom-scrollbar lg:p-6">
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
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-4 lg:gap-3 xl:grid-cols-5 2xl:grid-cols-6">
                {filteredItems.map((item) => {
                  const unlimitedStockItem = isUnlimitedStockItem(item);
                  const stockQty = getSellableStockBaseQty(item);
                  const isOutOfStock = !unlimitedStockItem && stockQty <= 0;
                  const stockLabel = item.stockUnmanaged
                    ? "Available"
                    : item.itemType === ItemType.RECIPE
                      ? "Recipe"
                      : formatStockDisplay(item);

                  return (
                    <div
                      key={item.id}
                      onClick={() => !isOutOfStock && addToCart(item)}
                      style={{ animationDelay: `${240 + (filteredItems.indexOf(item) % 12) * 32}ms` }}
                      className={`sales-product-tile sales-panel-hover group relative flex flex-col items-center rounded-lg border border-slate-200 bg-white p-2 text-center transition-all lg:rounded-xl lg:px-3 lg:py-4 ${
                        !isOutOfStock
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
                          <span className="px-1.5 lg:px-2 py-[1px] lg:py-0.5 bg-red-50 text-red-500 text-[8px] lg:text-[10px] font-bold rounded border border-red-100 uppercase">Out</span>
                        ) : (
                          <span className="px-1.5 lg:px-2 py-[1px] lg:py-0.5 bg-emerald-50 text-emerald-600 text-[8px] lg:text-[10px] font-bold rounded border border-emerald-100 whitespace-nowrap">{stockLabel}</span>
                        )}
                      </div>

                      <div className="mt-3 mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 lg:mt-3 lg:mb-3 lg:h-14 lg:w-14">
                        <ChefHat className={`w-4 h-4 lg:w-6 lg:h-6 ${isOutOfStock ? "text-slate-200" : "text-slate-300"}`} />
                      </div>
                      <h3 className="mb-0.5 min-h-[1.25rem] text-[9px] font-semibold leading-tight text-slate-800 line-clamp-2 lg:mb-2 lg:min-h-[2rem] lg:text-[13px]">{item.name}</h3>
                      <p className="text-[10px] font-bold text-blue-600 lg:text-[13px]">{item.itemType === ItemType.SERVICE && item.sellingPrice === 0 ? "Open Price" : formatCurrency(item.sellingPrice)}</p>
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
            billDiscount={billDiscount}
            setBillDiscount={setBillDiscount}
            onCheckout={handleCheckout}
            loading={loading}
            onAddCustomer={() => setShowCustomerSelect(true)}
            focusSearch={focusSearch}
            cartSummary={cartSummary}
            checkoutLabel={saleMode === SALE_MODES.DINE_IN ? "Checkout Table (F9)" : "Checkout (F9)"}
            footerActions={(
              <>
                <div className="grid grid-cols-2 gap-2">
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
                  <button
                    type="button"
                    onClick={handlePrintKot}
                    disabled={!canUseServer || queueCartActive || printingKot || !hasKotItems || !canPrintKot}
                    className="inline-flex h-[40px] items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ChefHat size={16} />
                    {printingKot ? "Printing..." : "Print KOT"}
                  </button>
                </div>
                {saleMode === SALE_MODES.DINE_IN && !selectedTableId ? (
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

      <CustomerSelect isOpen={showCustomerSelect} onClose={() => { setShowCustomerSelect(false); if (searchInputRef.current) searchInputRef.current.focus(); }} onSelectCustomer={setCustomer} />
      <CheckoutOverlay
        isOpen={showPayment}
        onClose={() => { setShowPayment(false); setPaymentError(""); if (searchInputRef.current) searchInputRef.current.focus(); }}
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
      <BatchSelectModal isOpen={showBatchModal} onClose={() => { setShowBatchModal(false); if (searchInputRef.current) searchInputRef.current.focus(); }} onSelectBatch={handleBatchSelect} item={selectedBatchItem} />
      <ReceiptPrinter ref={printRef} />
      <KotPrinter ref={kotPrintRef} />
    </div>
  );
};

export default POS;
