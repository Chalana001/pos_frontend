import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Card from "../components/common/Card";
import DraftRestoreBar from "../components/common/DraftRestoreBar";
import useUnsavedWork from "../hooks/useUnsavedWork";
import Button from "../components/common/Button";
import SupplierQuickAddModal from "../components/purchase/SupplierQuickAddModal";
import Modal from "../components/common/Modal";
import CustomSelect from "../components/common/CustomSelect";
import SearchSelect from "../components/common/SearchSelect";
import DatePicker from "../components/common/DatePicker";
import PanelResizeHandle from "../components/common/PanelResizeHandle";
import { suppliersAPI } from "../api/suppliers.api";
import { itemsAPI } from "../api/items.api";
import { branchesAPI } from "../api/branches.api";
import { purchasesAPI } from "../api/purchases.api";
import { Plus, Trash2, Save, Copy, Search, Pencil, Check, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { ItemType } from "../utils/constants";
import { formatCurrency, formatDate, getLocalDateString } from "../utils/formatters";
import { useSearchOnType } from "../hooks/useSearchOnType";
import usePaymentMethods from "../hooks/usePaymentMethods";
import ConfirmDialog from "../components/common/ConfirmDialog";
import {
  formatDisplayStockQuantity,
  formatStockQuantity,
  getDisplayStockQuantity,
  getPrimaryStockUnit,
  isMeasuredStockItem,
} from "../utils/stockQuantity";

// Bump when the draft payload below changes shape, so a draft written by an older build is
// discarded instead of being loaded into a form that can no longer read it.
const PURCHASE_DRAFT_SCHEMA_VERSION = 1;

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

const getMeasuredUnitOptions = (item) =>
  item?.itemType === ItemType.VOLUME ||
  item?.defaultUnit === "L" ||
  item?.defaultUnit === "ML" ||
  item?.qtyUnit === "L" ||
  item?.qtyUnit === "ML"
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

// The picker matches on these, not only on the name it prints, a supplier whose contact is
// remembered by its phone number is otherwise unfindable in a list of a few hundred.
const SUPPLIER_SEARCH_KEYS = ["name", "phone"];

// Static fallback until the configured methods load; live options come from
// usePaymentMethods inside the component.
const FALLBACK_PAYMENT_OPTIONS = [
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
  const firstQtyInputRef = useRef(null);
  const panelsContainerRef = useRef(null);

  // --- HEADER DATA ---
  const [branches, setBranches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);

  const [supplierId, setSupplierId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState(getLocalDateString());
  const [discountAmount, setDiscountAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [cashSource, setCashSource] = useState("BRANCH_CASH");
  const [cashSourceBranchId, setCashSourceBranchId] = useState("");

  // Configured payment methods drive the tender list. The drawer/cash-source
  // logic below reads each method's cash-like flag rather than its code.
  const { methods: configuredMethods } = usePaymentMethods();
  const paymentMethodOptions = configuredMethods.length
    ? configuredMethods.map((m) => ({ value: m.code, label: m.displayName }))
    : FALLBACK_PAYMENT_OPTIONS;
  const purchaseMethodConfig = configuredMethods.find((m) => m.code === paymentMethod) || null;
  const purchaseIsCashLike = purchaseMethodConfig
    ? purchaseMethodConfig.includeInExpectedCash
    : paymentMethod === "CASH";

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [selectionPanelWidth, setSelectionPanelWidth] = useState(null);
  const [isResizingPanels, setIsResizingPanels] = useState(false);
  const resizeStateRef = useRef({ startX: 0, startWidth: 620 });

  // --- ITEM SELECTION & DISTRIBUTION STATE ---
  const [search, setSearch] = useState("");
  const searchInputRef = useSearchOnType(setSearch);
  const [searchResults, setSearchResults] = useState([]);
  const currentSearchRef = useRef("");
  const [selectedItem, setSelectedItem] = useState(null);

  const [branchInputs, setBranchInputs] = useState({});

  // --- CART STATE ---
  const [cartItems, setCartItems] = useState([]);
  const [editingRow, setEditingRow] = useState(null);

  // --- CANCEL & REBUILD ---
  //
  // Arriving with ?replaces=<id> means this form is correcting an existing bill: it loads
  // that bill's lines, and saving cancels the original and issues this one in a single
  // server-side transaction. The original is never edited, an auditable system voids and
  // reissues instead, and the two bills stay linked.
  const [searchParams] = useSearchParams();
  const replacesId = searchParams.get("replaces");
  const [replacing, setReplacing] = useState(null);

  // --- DRAFT RECOVERY ---
  //
  // Only what the user typed. Deliberately absent: `branches`, `suppliers` and
  // `searchResults` (server data, re-read from the server, a restored draft must not carry
  // yesterday's prices or a supplier deleted since), `search` and `selectedItem`
  // (transient), `selectionPanelWidth` (a device preference, already in localStorage), and
  // `branchInputs`, which is the quantity block being typed for whichever item is selected
  // right now and would restore orphaned from the item it belongs to.
  const draftPayload = useMemo(
    () => ({
      supplierId,
      invoiceNo,
      date,
      discountAmount,
      paidAmount,
      paymentMethod,
      cashSource,
      cashSourceBranchId,
      cartItems,
    }),
    [
      supplierId,
      invoiceNo,
      date,
      discountAmount,
      paidAmount,
      paymentMethod,
      cashSource,
      cashSourceBranchId,
      cartItems,
    ]
  );

  // A date alone is not work. It defaults to today on every mount. Anything else means
  // the user has started building a bill.
  const isDraftDirty =
    cartItems.length > 0 ||
    !!supplierId ||
    !!invoiceNo.trim() ||
    Number(discountAmount || 0) > 0 ||
    Number(paidAmount || 0) > 0;

  const { pendingDraft, discardDraft, clearDraft } = useUnsavedWork({
    kind: "purchase",
    // A rebuild of bill 42 and a blank new purchase are different pieces of work and must
    // not be offered to each other.
    entityId: replacesId ?? null,
    schemaVersion: PURCHASE_DRAFT_SCHEMA_VERSION,
    isDirty: isDraftDirty,
    payload: draftPayload,
  });

  const restoreDraft = () => {
    const saved = pendingDraft?.payload;
    if (!saved) return;
    setSupplierId(saved.supplierId ?? "");
    setInvoiceNo(saved.invoiceNo ?? "");
    setDate(saved.date ?? getLocalDateString());
    setDiscountAmount(saved.discountAmount ?? "");
    setPaidAmount(saved.paidAmount ?? "");
    setPaymentMethod(saved.paymentMethod ?? "CASH");
    setCashSource(saved.cashSource ?? "BRANCH_CASH");
    setCashSourceBranchId(saved.cashSourceBranchId ?? "");
    setCartItems(Array.isArray(saved.cartItems) ? saved.cartItems : []);
    discardDraft();
    toast.success("Draft restored");
  };

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
  }, []);

  // Pull the bill being corrected into the form. Runs after branches load so each line can
  // carry its branch name, and only once, a re-run would duplicate every line.
  useEffect(() => {
    if (!replacesId || branches.length === 0 || replacing) return;

    let cancelled = false;
    (async () => {
      try {
        const { data } = await purchasesAPI.getById(replacesId);
        if (cancelled) return;

        if (data.status === "CANCELED") {
          toast.error("That purchase is already canceled.");
          navigate(`/purchases/${replacesId}`);
          return;
        }
        if (data.canReplace === false) {
          toast.error(`Cannot rebuild this purchase because ${data.replaceBlockedReason}.`);
          navigate(`/purchases/${replacesId}`);
          return;
        }

        setReplacing(data);
        setSupplierId(String(data.supplierId ?? ""));
        // The supplier's own invoice number carries over unchanged, a replacement for
        // INV-8821 is still INV-8821. That is the whole reason the uniqueness rule had to
        // be narrowed to live bills only.
        setInvoiceNo(data.invoiceNo ?? "");
        setDiscountAmount(data.discountAmount ? String(data.discountAmount) : "");
        setPaidAmount(data.paidAmount ? String(data.paidAmount) : "");
        setPaymentMethod(data.paymentMethod ?? "CASH");
        setCashSource(data.cashSource && data.cashSource !== "NONE" ? data.cashSource : "BRANCH_CASH");
        setCashSourceBranchId(data.cashSourceBranchId ? String(data.cashSourceBranchId) : "");

        const rows = [];
        (data.grnList || []).forEach((grn) => {
          const branch = branches.find((b) => b.id === grn.branchId);
          (grn.items || []).forEach((line) => {
            const measured = !!line.qtyUnit;
            rows.push({
              uniqueId: `${grn.id}-${line.id}`,
              itemId: line.itemId,
              name: line.itemName,
              barcode: line.barcode,
              branchId: Number(grn.branchId),
              branchName: branch?.name || grn.branchName || "Unknown",
              qty: Number(line.qty || 0),
              freeQty: Number(line.freeQty || 0),
              qtyUnit: measured ? line.qtyUnit : undefined,
              weightItem: measured,
              // The GROSS cost, not line.costPrice. costPrice is the effective cost, already
              // net of this line's share of the bill discount, and the form sends
              // discountAmount again on save. Pre-filling the net figure applied the
              // discount a second time and quietly moved a 104,446.95 bill to 100,095.12.
              costPrice: Number(line.grossCostPrice ?? line.costPrice ?? 0),
              sellingPrice: Number(line.sellingPrice || 0),
              // Only carried where the original line mapped to exactly one stock batch;
              // the server leaves it out rather than guess. Re-check before saving.
              expiryDate: line.expiryDate || null,
              zeroNegativeStock: false,
              lineTotal: calculateMeasuredLineTotal(
                Number(line.qty || 0),
                line.qtyUnit,
                Number(line.grossCostPrice ?? line.costPrice ?? 0),
                measured
              ),
            });
          });
        });
        setCartItems(rows);
      } catch (error) {
        console.error("Failed to load the purchase being replaced", error);
        toast.error(error.response?.data?.message || "Could not load that purchase.");
        navigate("/purchases");
      }
    })();

    return () => { cancelled = true; };
  }, [replacesId, branches, replacing, navigate]);

  useEffect(() => {
    const setDefaultPanelWidth = () => {
      const containerWidth = panelsContainerRef.current?.getBoundingClientRect().width;
      if (!containerWidth) {
        return;
      }

      const resizeHandleWidth = 12;
      const totalGapWidth = 32;
      const availableWidth = Math.max(0, containerWidth - resizeHandleWidth - totalGapWidth);
      let width = Math.max(420, Math.floor(availableWidth * 0.4));
      try {
        const stored = Number(window.localStorage.getItem("pos_split_purchase_form"));
        if (stored >= 420) width = stored;
      } catch { /* storage unavailable */ }
      setSelectionPanelWidth(Math.max(420, Math.min(Math.floor(availableWidth * 0.65), width)));
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
      const maxWidth = Math.max(520, Math.floor(availableWidth * 0.65));
      const nextWidth = Math.max(420, Math.min(maxWidth, resizeStateRef.current.startWidth + deltaX));
      setSelectionPanelWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsResizingPanels(false);
      setSelectionPanelWidth((settled) => {
        if (settled) {
          try {
            window.localStorage.setItem("pos_split_purchase_form", String(settled));
          } catch { /* storage unavailable */ }
        }
        return settled;
      });
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
      const branchRes = await branchesAPI.getAll();
      const branchList = branchRes.data || [];
      setBranches(isManager
        ? branchList.filter((branch) => Number(branch.id) === Number(user?.branchId))
        : branchList);
    } catch (e) {
      toast.error("Failed to load branches");
    }
  };

  // Suppliers are read when the picker is opened, never once on mount.
  //
  // The list used to be fetched when the page loaded and then kept, so a supplier created
  // from another tab or another till while this page sat open was invisible here: the
  // operator searched for a supplier that plainly existed and found nothing until they
  // refreshed. Re-reading on every open also means what they choose from is never older
  // than the click that opened it.
  const suppliersRequestRef = useRef(0);

  const loadSuppliers = useCallback(async () => {
    const requestId = suppliersRequestRef.current + 1;
    suppliersRequestRef.current = requestId;
    setSuppliersLoading(true);

    try {
      const response = await suppliersAPI.list();
      // Opened, closed and opened again while the first call was still in flight: only the
      // newest answer may be written, an older one would put a shorter list back on screen.
      if (suppliersRequestRef.current !== requestId) return;
      setSuppliers(response.data || []);
    } catch (error) {
      console.error("Failed to load suppliers", error);
      // No toast of its own: the axios interceptor already said why the call failed, and a
      // second message for every failed open is noise. Whatever loaded before stays pickable.
    } finally {
      if (suppliersRequestRef.current === requestId) {
        setSuppliersLoading(false);
      }
    }
  }, []);

  // A supplier id can arrive before any list does: a restored draft carries one, and so does
  // the bill being rebuilt. The picker reads its label out of the list, so without this the
  // field would sit on "Select Supplier" while a supplier really was selected.
  useEffect(() => {
    if (supplierId && suppliers.length === 0) {
      loadSuppliers();
    }
  }, [supplierId, suppliers.length, loadSuppliers]);

  const handleSupplierCreated = (newSupplier) => {
    setSuppliers((prev) => [...prev, newSupplier]);
    setSupplierId(newSupplier.id);
  };

  // --- 1. SEARCH ITEM ---
  const searchItems = async (q) => {
    setSearch(q);
    currentSearchRef.current = q;
    if (!q.trim() || q.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    try {
      const purchaseBranchId = isManager ? user?.branchId : 0;
      const res = await itemsAPI.searchForPurchase(q, purchaseBranchId);
      if (currentSearchRef.current === q) {
        setSearchResults(res.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearchKeyDown = async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const q = search.trim();
    if (!q) return;

    // Results already loaded, select from dropdown (manual typing case)
    if (searchResults.length > 0) {
      const exactMatch = searchResults.find(
        (item) => item.barcode?.toLowerCase() === q.toLowerCase()
      );
      selectItem(exactMatch || searchResults[0]);
      return;
    }

    // No results yet, barcode endpoint (handles barcode reader race condition)
    currentSearchRef.current = "__ENTER__";

    try {
      const purchaseBranchId = isManager ? user?.branchId : 0;
      const res = await itemsAPI.getByBarcode(q, purchaseBranchId);
      if (currentSearchRef.current === "__ENTER__") {
        selectItem(res.data);
      }
    } catch {
      if (currentSearchRef.current === "__ENTER__") {
        toast.error("Item not found!");
        setSearch("");
        currentSearchRef.current = "";
      }
    }
  };

  // --- 2. SELECT ITEM & INITIALIZE BRANCH INPUTS ---
  const [pendingNegativeStockItem, setPendingNegativeStockItem] = useState(null);

  const applySelectItem = (item, zeroNegativeStock) => {
    setSelectedItem({ ...item, zeroNegativeStock });
    setSearch("");
    currentSearchRef.current = "";
    setSearchResults([]);

    const initialInputs = {};
    branches.forEach(b => {
      initialInputs[b.id] = {
        cost: item.costPrice || 0,
        sell: item.sellingPrice || 0,
        qty: "",
        free: "",
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

  const selectItem = (item) => {
    if (Number(item.availableQty) < 0) {
      setPendingNegativeStockItem(item);
      return;
    }
    applySelectItem(item, false);
  };

  const resolveNegativeStockDialog = (zeroOut) => {
    if (pendingNegativeStockItem) {
      applySelectItem(pendingNegativeStockItem, zeroOut);
    }
    setPendingNegativeStockItem(null);
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
      const qty = (weightItem ? parseFloat(data.qty) : Number(data.qty)) || 0;
      const freeQty = (weightItem ? parseFloat(data.free) : Number(data.free)) || 0;

      // A row may be paid, free-of-charge (supplier FOC), or both.
      if (qty > 0 || freeQty > 0) {
        const branch = branches.find(b => b.id == branchIdStr);

        newRows.push({
          uniqueId: Date.now() + Math.random(),
          itemId: selectedItem.id,
          name: selectedItem.name,
          barcode: selectedItem.barcode,
          branchId: Number(branchIdStr),
          branchName: branch?.name || "Unknown",
          qty: qty,
          freeQty: freeQty,
          qtyUnit: weightItem ? data.qtyUnit : undefined,
          weightItem: weightItem,
          costPrice: Number(data.cost),
          sellingPrice: Number(data.sell),
          expiryDate: data.expiry || null,
          zeroNegativeStock: !!selectedItem.zeroNegativeStock,
          // Free units add nothing to the payable amount.
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
  };

  const startEditingRow = (item) => {
    if (editingRow && editingRow.uniqueId !== item.uniqueId) {
      toast.error("Save or cancel the current item edit first");
      return;
    }
    setEditingRow({
      uniqueId: item.uniqueId,
      cost: String(item.costPrice ?? ""),
      sell: String(item.sellingPrice ?? ""),
      qty: String(item.qty ?? ""),
      free: String(item.freeQty ?? ""),
      qtyUnit: item.qtyUnit || (item.weightItem ? getMeasuredUnitOptions(item)[0].value : ""),
      expiry: item.expiryDate || "",
    });
  };

  const cancelEditingRow = () => setEditingRow(null);

  const handleEditKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      saveEditedRow();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelEditingRow();
    }
  };

  const saveEditedRow = () => {
    if (!editingRow) return;

    const item = cartItems.find((row) => row.uniqueId === editingRow.uniqueId);
    if (!item) {
      setEditingRow(null);
      return;
    }

    const parseRowNumber = (value) => {
      if (String(value).trim() === "") return 0;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : NaN;
    };
    const cost = parseRowNumber(editingRow.cost);
    const sell = parseRowNumber(editingRow.sell);
    const qty = parseRowNumber(editingRow.qty);
    const freeQty = parseRowNumber(editingRow.free);
    const qtyUnit = item.weightItem ? editingRow.qtyUnit : item.qtyUnit;

    if (!Number.isFinite(cost) || cost < 0) return toast.error("Cost must be zero or greater");
    if (!Number.isFinite(sell) || sell < 0) return toast.error("Selling price must be zero or greater");
    if (!Number.isFinite(qty) || qty < 0) return toast.error("Quantity must be zero or greater");
    if (!Number.isFinite(freeQty) || freeQty < 0) return toast.error("Free quantity must be zero or greater");
    if (qty <= 0 && freeQty <= 0) return toast.error("Enter a paid or free quantity");

    const updatedItem = {
      ...item,
      costPrice: cost,
      sellingPrice: sell,
      qty,
      freeQty,
      qtyUnit,
      expiryDate: editingRow.expiry || null,
      lineTotal: calculateMeasuredLineTotal(qty, qtyUnit, cost, item.weightItem),
    };

    const nextItems = cartItems.map((row) =>
      row.uniqueId === editingRow.uniqueId ? updatedItem : row
    );
    const nextSubtotal = nextItems.reduce((sum, row) => sum + row.lineTotal, 0);
    const nextDiscount = Number(discountAmount || 0);
    if (nextDiscount > nextSubtotal) {
      return toast.error("Supplier discount now exceeds the updated subtotal");
    }
    if (Number(paidAmount || 0) > Math.max(0, nextSubtotal - nextDiscount)) {
      return toast.error("Paid amount now exceeds the updated grand total");
    }

    setCartItems(nextItems);
    setEditingRow(null);
  };

  const handleRemoveItem = (index) => {
    const removedItem = cartItems[index];
    if (removedItem && editingRow?.uniqueId === removedItem.uniqueId) {
      setEditingRow(null);
    }
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  // --- 4. SUBMIT ---
  const handleSubmit = async () => {
    if (editingRow) return toast.error("Save or cancel the item you are editing first");
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
    if (normalizedPaidAmount > 0 && purchaseIsCashLike && !cashSource) return toast.error("Please select a cash source");
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
        qty: item.qty > 0 ? item.qty : null,
        freeQty: item.freeQty > 0 ? item.freeQty : null,
        qtyUnit: item.qtyUnit,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        expiryDate: item.expiryDate,
        zeroNegativeStock: !!item.zeroNegativeStock
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
      // One call, not two. Cancelling and creating as separate requests would leave the
      // shop with the original's stock deleted and no replacement whenever the second one
      // is the request that fails.
      const saved = replacesId
        ? await purchasesAPI.replace(replacesId, payload)
        : await purchasesAPI.create(payload);
      // The bill is banked; the draft has done its job. Clear it before navigating, or the
      // next visit to this screen offers back a purchase that already exists.
      await clearDraft();
      toast.success(replacesId ? "Purchase rebuilt. The old bill is canceled." : "Purchase saved successfully!");
      navigate(replacesId && saved?.data?.purchaseId ? `/purchases/${saved.data.purchaseId}` : "/purchases");
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
  const canSelectCashSource = normalizedPaidAmount > 0 && purchaseIsCashLike;
  const drawerBranchOptions = branches
    .filter((branch) => branchIdsInPurchase.includes(Number(branch.id)))
    .map((branch) => ({ value: String(branch.id), label: branch.name }));
  const showBranchColumn = branches.length > 1;
  const purchaseTableColumnCount = showBranchColumn ? 8 : 7;
  const effectiveCostForLine = (item, index) => {
    // Free units dilute the unit cost even when there is no invoice discount:
    // the money paid is spread over everything received (paid + free).
    const freeQtyPrimary = getPrimaryUnitQty({ ...item, qty: item.freeQty || 0 });
    const totalQty = getPrimaryUnitQty(item) + freeQtyPrimary;

    if (normalizedDiscountAmount <= 0 || subtotal <= 0) {
      if (freeQtyPrimary <= 0) return item.costPrice;
      return totalQty > 0 ? item.lineTotal / totalQty : item.costPrice;
    }

    const allocatedBefore = cartItems.slice(0, index).reduce((sum, line) => {
      const lineDiscount = (normalizedDiscountAmount * line.lineTotal) / subtotal;
      return sum + Number(lineDiscount.toFixed(2));
    }, 0);
    const lineDiscount = index === cartItems.length - 1
      ? normalizedDiscountAmount - allocatedBefore
      : Number(((normalizedDiscountAmount * item.lineTotal) / subtotal).toFixed(2));
    const netLineTotal = Math.max(0, item.lineTotal - lineDiscount);

    return totalQty > 0 ? netLineTotal / totalQty : item.costPrice;
  };

  return (
    <div className="page-enter space-y-6 pb-10">
      <DraftRestoreBar
        draft={pendingDraft}
        label={`Unsaved purchase${pendingDraft?.payload?.cartItems?.length
          ? ` (${pendingDraft.payload.cartItems.length} item${pendingDraft.payload.cartItems.length === 1 ? "" : "s"})`
          : ""}`}
        onRestore={restoreDraft}
        onDiscard={discardDraft}
      />
      {replacing && (
        <div className="rounded-xl border border-slate-200 bg-accent-soft px-4 py-3 text-sm text-slate-900">
          <p className="font-semibold">
            Replacing {replacing.invoiceNo}. The old bill is canceled when you save.
          </p>
          <p className="mt-1 text-slate-800">
            Both bills are kept and linked, so the original stays in the audit trail. Check
            expiry dates before saving. They only carry over where a line matched exactly
            one stock batch.
          </p>
        </div>
      )}
      <div className="page-section-enter flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" style={{ animationDelay: "40ms" }}>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            {replacesId ? "Rebuild Purchase" : "New Purchase"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Add supplier invoice items and distribute stock by branch.</p>
        </div>
        <div className="purchase-summary-card shell-panel shell-panel-hover rounded-xl border border-slate-200 bg-white px-5 py-3 text-right shadow-sm" style={{ animationDelay: "90ms" }}>
          <p className="text-sm font-medium text-slate-500">Grand Total</p>
          <p className="text-2xl font-bold text-success">{formatCurrency(grandTotal)}</p>
          {normalizedDiscountAmount > 0 ? (
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Subtotal {formatCurrency(subtotal)} - Discount {formatCurrency(normalizedDiscountAmount)}
            </p>
          ) : null}
          <p className={`mt-1 text-sm font-semibold ${dueAmount > 0 ? "text-danger" : "text-success"}`}>
            Supplier Due: {formatCurrency(dueAmount)}
          </p>
        </div>
      </div>

      <Card className="sales-panel-enter overflow-visible p-0" style={{ animationDelay: "120ms" }}>
        <div className="inventory-filter-bar border-b border-slate-100 bg-slate-50/50 p-4" style={{ animationDelay: "150ms" }}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
            {/* Supplier Select */}
            <div>
              <label htmlFor="purchaseformpage-supplier" className="label-text">Supplier</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <SearchSelect
                    inputId="purchaseformpage-supplier"
                    ariaLabel="Supplier"
                    value={supplierId}
                    onChange={setSupplierId}
                    options={suppliers}
                    placeholder="Select Supplier"
                    searchPlaceholder="Type name or phone…"
                    searchKeys={SUPPLIER_SEARCH_KEYS}
                    noResultsMessage="No supplier matches that"
                    emptyMessage="No suppliers found — add one with +"
                    loading={suppliersLoading}
                    loadingMessage="Loading suppliers…"
                    menuMinWidth={300}
                    onOpen={loadSuppliers}
                  />
                </div>
                <Button
                  onClick={() => setShowSupplierModal(true)}
                  variant="secondary"
                  className="shrink-0 px-3"
                >
                  <Plus size={18} />
                </Button>
              </div>
            </div>

            <div>
              <label htmlFor="purchaseformpage-invoice-no" className="label-text">Invoice No</label>
              <input id="purchaseformpage-invoice-no" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} className="input w-full" placeholder="Ex: INV-999" />
            </div>
            <div>
              <label className="label-text">Date</label>
              <DatePicker value={date} onChange={setDate} buttonClassName="input h-10 w-full" />
            </div>
            <div>
              <label htmlFor="purchaseformpage-supplier-discount" className="label-text">Supplier Discount</label>
              <input id="purchaseformpage-supplier-discount"
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
              <label htmlFor="purchaseformpage-paid-to-supplier" className="label-text">Paid to Supplier</label>
              <div className="flex gap-2">
                <input id="purchaseformpage-paid-to-supplier"
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
                  : purchaseIsCashLike
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
          className="purchase-split-panel custom-scrollbar w-full min-w-0 flex-shrink-0 space-y-4 lg:w-[var(--purchase-panel-width)] lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto"
          style={{
            "--purchase-panel-width": selectionPanelWidth ? `min(100%, ${selectionPanelWidth}px, 65%)` : "40%",
            animationDelay: "190ms",
          }}
        >
          <Card className="sales-panel-enter overflow-visible p-0" style={{ animationDelay: "180ms" }}>
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <h3 className="text-lg font-semibold text-slate-800">Select Item</h3>
              <p className="mt-1 text-sm text-slate-500">Search item, then enter branch quantities and prices.</p>
            </div>

            <div className="p-4">
              <div className="relative mb-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                <input aria-label="Scan barcode or type name..."
                  ref={searchInputRef}
                  placeholder="Scan barcode or type name..."
                  value={search}
                  onChange={(e) => searchItems(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="h-[42px] w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-accent"
                />
                {searchResults.length > 0 && (
                  /* Below lg the results sit in normal flow: an absolutely
                     positioned list ran past the bottom of the Select Item card
                     and covered the panel underneath on a phone. From lg there is
                     room to float it over the page as before. */
                  <div className="z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-100 bg-white py-1 shadow-xl custom-scrollbar lg:absolute lg:inset-x-0">
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
                            {item.altName && (
                              <div className="truncate text-xs text-slate-600">{item.altName}</div>
                            )}
                            <div className="truncate text-xs text-slate-500">{item.barcode}</div>
                          </div>
                          <div className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                            Number(item.availableQty) < 0 ? "bg-danger-soft text-danger" : "bg-slate-100 text-slate-600"
                          }`}>
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
                      {selectedItem.altName && (
                        <div className="truncate text-xs text-slate-600">{selectedItem.altName}</div>
                      )}
                      <div className="truncate text-xs text-slate-500">{selectedItem.barcode}</div>
                      {Number(selectedItem.availableQty) < 0 && (
                        <div className="mt-0.5 text-xs font-semibold text-danger">
                          Current stock: {formatDisplayStockQuantity(selectedItem)}
                          {selectedItem.zeroNegativeStock ? " (will be adjusted to 0)" : ""}
                        </div>
                      )}
                    </div>
                    <button onClick={() => { setSelectedItem(null); }} className="shrink-0 text-xs font-semibold text-danger hover:underline">
                      Cancel
                    </button>
                  </div>

                  <div className="max-h-[520px] overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 custom-scrollbar">
                    <div className="divide-y divide-slate-100">
                      {branches.map((branch, idx) => {
                        const inputs = branchInputs[branch.id] || {};
                        const weightItem = isMeasuredItem(selectedItem);
                        return (
                          <div key={branch.id} className="purchase-branch-row px-3 py-2.5">
                            {/* Branch gets the full line to itself, so the fields below
                                always start on a clean row: Cost/Sell/Qty, then
                                Free/Unit/Expiry with Free directly under Cost. */}
                            <div className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-1.5">
                              <span className="min-w-0 truncate text-sm font-semibold text-slate-700" title={branch.name}>
                                {branch.name}
                              </span>
                              {idx === 0 && (
                                <button
                                  type="button"
                                  onClick={() => applyPricesToAll(branch.id)}
                                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                  title="Copy prices to all branches"
                                  aria-label="Copy prices to all branches"
                                >
                                  <Copy size={14} />
                                </button>
                              )}
                            </div>
                            <div className="purchase-branch-fields">
                              <label className="min-w-0">
                                <span className="mb-1 block text-xs font-semibold text-slate-500">Cost</span>
                                <input aria-label="Cost"
                                  type="number"
                                  className="input h-9 w-full min-w-0 px-2 text-right text-sm tabular-nums"
                                  placeholder="Cost"
                                  value={inputs.cost}
                                  onChange={(e) => handleInputChange(branch.id, 'cost', e.target.value)}
                                />
                              </label>
                              <label className="min-w-0">
                                <span className="mb-1 block text-xs font-semibold text-slate-500">Sell</span>
                                <input aria-label="Sell"
                                  type="number"
                                  className="input h-9 w-full min-w-0 px-2 text-right text-sm tabular-nums"
                                  placeholder="Sell"
                                  value={inputs.sell}
                                  onChange={(e) => handleInputChange(branch.id, 'sell', e.target.value)}
                                />
                              </label>
                              <label className="min-w-0">
                                <span className="mb-1 block text-xs font-semibold text-slate-500">Qty</span>
                                <input aria-label="Qty"
                                  ref={idx === 0 ? firstQtyInputRef : null}
                                  type="number"
                                  step={weightItem ? "0.1" : "1"}
                                  className={`input h-9 w-full min-w-0 px-2 text-center text-sm font-bold tabular-nums ${inputs.qty > 0 ? 'border-success-border bg-success-soft' : ''}`}
                                  placeholder="Qty"
                                  value={inputs.qty}
                                  onChange={(e) => handleInputChange(branch.id, 'qty', e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddToList();
                                  }}
                                />
                              </label>
                              <label className="min-w-0">
                                <span className="mb-1 block text-xs font-semibold text-slate-500">Free</span>
                                <input aria-label="Free qty"
                                  type="number"
                                  step={weightItem ? "0.1" : "1"}
                                  className={`input h-9 w-full min-w-0 px-2 text-center text-sm font-bold tabular-nums ${inputs.free > 0 ? 'border-info-border bg-info-soft' : ''}`}
                                  placeholder="Free"
                                  title="Free-of-charge units from the supplier (not billed)"
                                  value={inputs.free}
                                  onChange={(e) => handleInputChange(branch.id, 'free', e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddToList();
                                  }}
                                />
                              </label>
                              <div className="min-w-0">
                                <span className="mb-1 block text-xs font-semibold text-slate-500">Unit</span>
                                {weightItem ? (
                                  <CustomSelect
                                    value={inputs.qtyUnit || selectedItem.defaultUnit}
                                    onChange={(value) => handleInputChange(branch.id, 'qtyUnit', value)}
                                    options={getMeasuredUnitOptions(selectedItem)}
                                    valueKey="value"
                                    labelKey="label"
                                    buttonClassName="h-9 min-w-0 px-2 py-1 text-sm shadow-none"
                                  />
                                ) : (
                                  <div className="flex h-9 items-center justify-center px-2 text-sm text-slate-400">—</div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="mb-1 block text-xs font-semibold text-slate-500">Expiry</span>
                                <DatePicker
                                  value={inputs.expiry}
                                  onChange={(value) => handleInputChange(branch.id, 'expiry', value)}
                                  buttonClassName="input h-9 w-full min-w-0 px-2 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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

        <div className="purchase-split-panel min-w-0 flex-1 space-y-4 lg:flex lg:max-h-[calc(100vh-11rem)] lg:flex-col" style={{ animationDelay: "230ms" }}>
          <Card className="sales-panel-enter flex min-h-[520px] flex-col overflow-hidden p-0 lg:min-h-0 lg:flex-1" style={{ animationDelay: "260ms" }}>
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Purchase Items List</h3>
                  <p className="text-sm text-slate-500">{cartItems.length} rows added</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium text-slate-500">Subtotal: {formatCurrency(subtotal)}</p>
                  <p className="font-semibold text-slate-700">Total: {formatCurrency(grandTotal)}</p>
                  <p className={dueAmount > 0 ? "font-semibold text-danger" : "font-medium text-success"}>
                    Due: {formatCurrency(dueAmount)}
                  </p>
                </div>
              </div>
            </div>
            <div className="custom-scrollbar min-h-0 flex-1 overflow-x-auto lg:overflow-y-auto">
              {/* Phones scroll this table sideways rather than crushing eight columns into
                  ~380px; from lg the panel is wide enough to fit and no bar appears. */}
              <table className="w-full table-fixed text-left text-sm min-w-[600px] lg:min-w-[440px]">
                {/* Numeric columns are fixed so a long amount can never squeeze the item
                    name to nothing; the name column takes whatever is left. Branch is
                    dropped entirely for single-branch users, which hands its width back
                    to the name. */}
                <colgroup>
                  {showBranchColumn && <col style={{ width: "48px" }} />}
                  <col />
                  <col style={{ width: "60px" }} />
                  <col style={{ width: "60px" }} />
                  <col style={{ width: "46px" }} />
                  <col style={{ width: "62px" }} />
                  <col style={{ width: "74px" }} />
                  <col style={{ width: "58px" }} />
                </colgroup>
                <thead className="border-b bg-white text-xs text-slate-500">
                  <tr>
                    {showBranchColumn && <th className="px-1 py-2">Branch</th>}
                    <th className="px-1 py-2">Item Name</th>
                    <th className="px-0.5 py-2 text-right">Cost</th>
                    <th className="px-0.5 py-2 text-right">Sell</th>
                    <th className="px-0.5 py-2 text-center">Qty</th>
                    <th className="px-0.5 py-2 text-center">Expiry</th>
                    <th className="px-0.5 py-2 text-right">Total</th>
                    <th className="px-0.5 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cartItems.length === 0 ? (
                    <tr>
                      <td colSpan={purchaseTableColumnCount} className="p-6 text-center text-xs text-slate-600">
                        No items added. Search and add items to this purchase.
                      </td>
                    </tr>
                  ) : (
                    cartItems.map((item, index) => {
                      const isEditing = editingRow?.uniqueId === item.uniqueId;
                      const previewLineTotal = isEditing
                        ? calculateMeasuredLineTotal(editingRow.qty, editingRow.qtyUnit, editingRow.cost, item.weightItem)
                        : item.lineTotal;

                      return (
                        <React.Fragment key={item.uniqueId}>
                          <tr
                            className={`purchase-line-card group transition-colors ${isEditing ? "bg-accent-soft/40" : "hover:bg-slate-50"}`}
                            style={{ animationDelay: `${80 + Math.min(index, 6) * 35}ms` }}
                          >
                            {showBranchColumn && (
                              <td className="px-1 py-2 align-top">
                                <span
                                  className="block truncate rounded-md border border-slate-200 bg-slate-50 px-1 py-0.5 text-xs font-bold leading-tight text-slate-700"
                                  title={item.branchName}
                                >
                                  {item.branchName}
                                </span>
                              </td>
                            )}
                            <td className="px-1 py-2 align-top">
                              <div className="line-clamp-3 break-words font-medium leading-tight text-slate-700" title={item.name}>
                                {item.name}
                              </div>
                              <div className="truncate text-xs leading-tight text-slate-600" title={item.barcode}>{item.barcode}</div>
                            </td>
                            <td className="px-0.5 py-2 text-right align-top tabular-nums text-slate-600">
                              <div className="leading-tight">{item.costPrice.toFixed(2)}</div>
                              {normalizedDiscountAmount > 0 || item.freeQty > 0 ? (
                                <div className="text-[11px] font-semibold leading-tight text-success">
                                  Eff. {effectiveCostForLine(item, index).toFixed(2)}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-0.5 py-2 text-right align-top tabular-nums text-slate-600">
                              <span className="leading-tight">{item.sellingPrice.toFixed(2)}</span>
                            </td>
                            <td className="px-0.5 py-2 text-center align-top font-bold tabular-nums text-slate-800">
                              <div className="leading-tight">{item.weightItem ? item.qty.toFixed(2) : item.qty}</div>
                              {item.qtyUnit && <div className="text-[11px] leading-tight text-slate-500">{item.qtyUnit}</div>}
                              {item.freeQty > 0 && (
                                <div className="text-[11px] font-semibold leading-tight text-info">
                                  +{item.weightItem ? item.freeQty.toFixed(2) : item.freeQty} free
                                </div>
                              )}
                            </td>
                            <td className="px-0.5 py-2 text-center align-top text-slate-600">
                              {item.expiryDate ? (
                                <span className="block leading-tight">{formatDate(item.expiryDate)}</span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-0.5 py-2 text-right align-top font-bold tabular-nums text-slate-800">
                              <span className="leading-tight">{previewLineTotal.toLocaleString()}</span>
                            </td>
                            <td className="px-1 py-2 text-center align-top">
                              <div className="flex items-center justify-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => (isEditing ? cancelEditingRow() : startEditingRow(item))}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-accent-soft hover:text-accent"
                                  title={isEditing ? "Cancel editing" : "Edit item"}
                                  aria-label={isEditing ? `Cancel changes to ${item.name}` : `Edit ${item.name}`}
                                >
                                  {isEditing ? <X size={14} /> : <Pencil size={14} />}
                                </button>
                                {!isEditing && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(index)}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-danger-soft hover:text-danger"
                                    title="Remove item"
                                    aria-label={`Remove ${item.name}`}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {isEditing && (
                            <tr className="bg-accent-soft/30">
                              <td colSpan={purchaseTableColumnCount} className="px-1 pb-2 pt-0">
                                <div className="rounded-lg border border-border bg-white p-2">
                                  <div className="flex flex-wrap items-end gap-2">
                                    <label className="min-w-[72px] flex-1">
                                      <span className="mb-1 block text-xs font-semibold text-slate-500">Cost</span>
                                      <input
                                        aria-label={`Cost price for ${item.name}`}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={editingRow.cost}
                                        onChange={(event) => setEditingRow((current) => ({ ...current, cost: event.target.value }))}
                                        onKeyDown={handleEditKeyDown}
                                        className="input h-9 w-full min-w-0 px-2 text-right text-sm tabular-nums"
                                      />
                                    </label>
                                    <label className="min-w-[72px] flex-1">
                                      <span className="mb-1 block text-xs font-semibold text-slate-500">Sell</span>
                                      <input
                                        aria-label={`Selling price for ${item.name}`}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={editingRow.sell}
                                        onChange={(event) => setEditingRow((current) => ({ ...current, sell: event.target.value }))}
                                        onKeyDown={handleEditKeyDown}
                                        className="input h-9 w-full min-w-0 px-2 text-right text-sm tabular-nums"
                                      />
                                    </label>
                                    <label className="min-w-[62px] flex-1">
                                      <span className="mb-1 block text-xs font-semibold text-slate-500">Qty</span>
                                      <input
                                        aria-label={`Quantity for ${item.name}`}
                                        type="number"
                                        min="0"
                                        step={item.weightItem ? "0.001" : "1"}
                                        value={editingRow.qty}
                                        onChange={(event) => setEditingRow((current) => ({ ...current, qty: event.target.value }))}
                                        onKeyDown={handleEditKeyDown}
                                        className="input h-9 w-full min-w-0 px-2 text-center text-sm font-bold tabular-nums"
                                      />
                                    </label>
                                    <label className="min-w-[62px] flex-1">
                                      <span className="mb-1 block text-xs font-semibold text-slate-500">Free</span>
                                      <input
                                        aria-label={`Free quantity for ${item.name}`}
                                        type="number"
                                        min="0"
                                        step={item.weightItem ? "0.001" : "1"}
                                        value={editingRow.free}
                                        onChange={(event) => setEditingRow((current) => ({ ...current, free: event.target.value }))}
                                        onKeyDown={handleEditKeyDown}
                                        className="input h-9 w-full min-w-0 px-2 text-center text-sm font-bold tabular-nums"
                                      />
                                    </label>
                                    {item.weightItem && (
                                      <div className="min-w-[72px] flex-1">
                                        <span className="mb-1 block text-xs font-semibold text-slate-500">Unit</span>
                                        <CustomSelect
                                          value={editingRow.qtyUnit}
                                          onChange={(value) => setEditingRow((current) => ({ ...current, qtyUnit: value }))}
                                          options={getMeasuredUnitOptions(item)}
                                          valueKey="value"
                                          labelKey="label"
                                          buttonClassName="h-9 min-w-0 px-2 py-1 text-sm shadow-none"
                                        />
                                      </div>
                                    )}
                                    <div className="min-w-[116px] flex-1">
                                      <span className="mb-1 block text-xs font-semibold text-slate-500">Expiry</span>
                                      <DatePicker
                                        value={editingRow.expiry}
                                        onChange={(value) => setEditingRow((current) => ({ ...current, expiry: value }))}
                                        buttonClassName="input h-9 w-full min-w-0 px-2 text-sm"
                                      />
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={saveEditedRow}
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-success-soft text-success transition-colors hover:bg-success hover:text-white"
                                        title="Save item changes"
                                        aria-label={`Save changes to ${item.name}`}
                                      >
                                        <Check size={15} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={cancelEditingRow}
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
                                        title="Cancel editing"
                                        aria-label={`Discard changes to ${item.name}`}
                                      >
                                        <X size={15} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="page-section-enter flex justify-end" style={{ animationDelay: "300ms" }}>
            <Button
              onClick={handleSubmit}
              size="lg"
              className="finalize-purchase-btn bg-success hover:bg-success shadow-lg w-full md:w-auto px-8"
              disabled={cartItems.length === 0}
            >
              <Save size={18} className="mr-2" /> Finalize Purchase
            </Button>
          </div>
        </div>
      </div>

      <SupplierQuickAddModal
        isOpen={showSupplierModal}
        onClose={() => { setShowSupplierModal(false); }}
        onCreated={handleSupplierCreated}
      />

      <ConfirmDialog
        isOpen={!!pendingNegativeStockItem}
        onClose={() => resolveNegativeStockDialog(false)}
        onConfirm={() => resolveNegativeStockDialog(true)}
        title="Negative Stock Detected"
        tone="primary"
        message={pendingNegativeStockItem ? (
          <>
            <span className="font-semibold text-slate-800">{pendingNegativeStockItem.name}</span> currently has{" "}
            <span className="font-bold text-danger">{formatDisplayStockQuantity(pendingNegativeStockItem)}</span> stock.
          </>
        ) : null}
        detail="Do you want to adjust this back to 0 before adding the new purchase quantity? If you choose No, the purchased quantity will simply be added on top of the current negative stock."
        cancelLabel="No, just add on top"
        confirmLabel="Yes, adjust to 0 first"
      />
    </div>
  );
};

export default PurchaseFormPage;
