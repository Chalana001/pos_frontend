import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal"; 
import CustomSelect from "../components/common/CustomSelect";
import SearchSelect from "../components/common/SearchSelect";
import { itemsAPI } from "../api/items.api";
import { categoriesAPI } from "../api/categories.api"; 
import { useBranch } from "../context/BranchContext";
import { useAuth } from "../context/AuthContext";
import { useAppConfiguration } from "../context/AppConfigurationContext";
import { ChevronDown, ChevronRight, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import ResizableSplit from "../components/common/ResizableSplit";
import DraftRestoreBar from "../components/common/DraftRestoreBar";
import useUnsavedWork from "../hooks/useUnsavedWork";
import { ItemType, ItemTypeLabels, OVERHEAD_COST_MODES } from "../utils/constants"; // 🟢 Constant එක Import කළා

// Bump when the saved shape below changes, so an older draft is dropped rather than loaded
// into a form that can no longer read it.
const BULK_ITEMS_DRAFT_SCHEMA_VERSION = 1;

const uuid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const num = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const buildEmptyIngredient = () => ({
  ingredientItemId: "",
  ingredientName: "",
  ingredientBarcode: "",
  quantity: "",
  qtyUnit: "PCS",
  search: "",
});

const isBlankIngredient = (ingredient) => {
  if (!ingredient) return true;
  return (
    !ingredient.ingredientItemId &&
    !String(ingredient.ingredientName || "").trim() &&
    !String(ingredient.ingredientBarcode || "").trim() &&
    !String(ingredient.search || "").trim() &&
    Number(ingredient.quantity || 0) <= 0
  );
};

const getRecipeIngredientRows = (ingredients = []) =>
  ingredients.filter((ingredient) => !isBlankIngredient(ingredient));

const buildEmptyProcessingOutput = () => ({
  outputItemId: "",
  outputName: "",
  outputBarcode: "",
  itemType: "",
  defaultUnit: "PCS",
  defaultQty: "",
  defaultQtyUnit: "PCS",
  waste: false,
  search: "",
});

const itemTypeOptions = [
  { value: ItemType.NORMAL, label: ItemTypeLabels.NORMAL },
  { value: ItemType.WEIGHT, label: ItemTypeLabels.WEIGHT },
  { value: ItemType.VOLUME, label: ItemTypeLabels.VOLUME },
  { value: ItemType.SERVICE, label: ItemTypeLabels.SERVICE },
  { value: ItemType.RECIPE, label: ItemTypeLabels.RECIPE },
];

const getAllowedItemTypeOptions = (planName, configuration) => {
  const enabledTypes = new Set([
    ItemType.NORMAL,
    ...(configuration?.weightItemsEnabled ? [ItemType.WEIGHT] : []),
    ...(configuration?.weightItemsEnabled ? [ItemType.VOLUME] : []),
    ...(configuration?.servicesEnabled ? [ItemType.SERVICE] : []),
    ...(configuration?.recipeItemsEnabled ? [ItemType.RECIPE] : []),
  ]);

  if (planName === "FREE" || planName === "MONTHLY_DEMO") {
    return itemTypeOptions.filter((option) => option.value === ItemType.NORMAL && enabledTypes.has(option.value));
  }
  if (["STANDARD", "MONTHLY_LITE", "YEARLY_LITE", "MONTHLY_BASIC"].includes(planName)) {
    return itemTypeOptions.filter((option) =>
      [ItemType.NORMAL, ItemType.WEIGHT, ItemType.VOLUME, ItemType.SERVICE].includes(option.value) &&
      enabledTypes.has(option.value)
    );
  }
  return itemTypeOptions.filter((option) => enabledTypes.has(option.value));
};

const weightUnitOptions = [
  { value: "KG", label: "KG" },
  { value: "G", label: "G" },
];

const volumeUnitOptions = [
  { value: "L", label: "L" },
  { value: "ML", label: "ML" },
];

const recipeUnitOptions = [
  { value: "PCS", label: "PCS" },
  { value: "KG", label: "KG" },
  { value: "G", label: "G" },
  { value: "L", label: "L" },
  { value: "ML", label: "ML" },
];

const overheadCostOptions = [
  { value: OVERHEAD_COST_MODES.NONE, label: "No Overhead Cost" },
  { value: OVERHEAD_COST_MODES.FIXED, label: "Fixed Amount" },
  { value: OVERHEAD_COST_MODES.PERCENT, label: "Percent of Ingredient Cost" },
];

const priceUnitLabel = (itemType) => {
  if (itemType === ItemType.WEIGHT) return "(per 1 KG)";
  if (itemType === ItemType.VOLUME) return "(per 1 L)";
  return "";
};

const fieldClass = "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500";
const helperClass = "mt-1 text-xs leading-5 text-slate-500";

const BulkSection = ({ title, description, right, isOpen, onToggle, hideToggle = false, children }) => {
  const contentId = `bulk-section-${String(title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
  return (
    <section className="border-b border-slate-200 last:border-b-0">
      <div className="flex items-start justify-between gap-4 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 id={`${contentId}-heading`} className="text-base font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-0.5 text-slate-500">
          {right}
          {!hideToggle && (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={isOpen}
              aria-controls={contentId}
              aria-labelledby={`${contentId}-heading`}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
          )}
        </div>
      </div>
      {isOpen && <div id={contentId} className="page-section-enter px-4 pb-5 sm:px-5">{children}</div>}
    </section>
  );
};

const BulkQueueList = ({ cart, totalLines, onEdit, onRemove, compact = false }) => {
  if (cart.length === 0) {
    return (
      <div className={`${compact ? "px-2 py-10" : "px-6 py-14"} text-center`}>
        <p className="text-sm font-medium text-slate-700">No items queued</p>
        <p className="mt-1 text-xs text-slate-500">Use the form to add your first item.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-200">
      {cart.map((row) => (
        <div key={row.tempId} className={`${compact ? "px-3 py-3" : "px-4 py-3 sm:px-5"}`}>
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 text-[10px] text-slate-400">
              {row.imageUrl ? (
                <img src={row.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : "IMG"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{row.name}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{row.barcode || "Auto-generated barcode"}</p>
                </div>
                <span className="shrink-0 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  {row.itemType}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>{row.posVisible ? "Visible in POS" : "Hidden from POS"}</span>
                <span className="font-semibold tabular-nums text-slate-800">LKR {row.sellingPrice ?? 0}</span>
              </div>
              <div className="mt-2 flex justify-end gap-3">
                <button type="button" className="text-xs font-semibold text-slate-600 hover:text-slate-900" onClick={() => onEdit(row.tempId)}>Edit</button>
                <button type="button" className="text-xs font-semibold text-danger hover:brightness-90" onClick={() => onRemove(row.tempId)}>Remove</button>
              </div>
            </div>
          </div>
        </div>
      ))}
      {totalLines > 0 && (
        <div className="bg-slate-50 px-4 py-3 text-xs text-slate-500">
          Review the list before saving all items.
        </div>
      )}
    </div>
  );
};

const BulkToggleRow = ({ label, description, checked, onChange, disabled = false, stateLabel }) => {
  const active = checked && !disabled;
  return (
    <div className={`flex items-start justify-between gap-4 ${disabled ? "opacity-60" : ""}`}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">{label}</span>
          <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            {stateLabel || (active ? "On" : "Off")}
          </span>
        </div>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:cursor-not-allowed ${
          active ? "bg-accent" : "bg-slate-300"
        }`}
      >
        <span className={`h-5 w-5 rounded-full bg-white transition-transform ${active ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
};

const emptyDraft = () => ({
  imageUrl: "",
  name: "",
  altName: "",
  barcode: "",
  categoryId: "", 
  subCategoryId: "",
  costPrice: "",
  sellingPrice: "",
  reorderLevel: "",
  itemType: ItemType.NORMAL, // 🟢 Default අගය
  defaultUnit: "PCS",
  isKotEnabled: false,
  active: true,
  posVisible: true,
  overheadCostMode: OVERHEAD_COST_MODES.NONE,
  overheadCostValue: "",
  stockProcessingEnabled: false,
  processingOutputs: [],
  ingredients: [],
  branchIds: [],
});

export default function BulkAddItems() {
  const { branches: availableBranches } = useBranch();
  const { user } = useAuth();
  const { configuration } = useAppConfiguration();
  const singleCategoryMode = configuration?.categoryMode === "SINGLE_CATEGORY";
  const kotEnabled = configuration?.kotEnabled !== false;
  const allowedItemTypeOptions = useMemo(
    () => getAllowedItemTypeOptions(user?.planName, configuration),
    [configuration, user?.planName]
  );
  const [draft, setDraft] = useState(emptyDraft());
  const [cart, setCart] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showQueueDialog, setShowQueueDialog] = useState(false);

  const [openImage, setOpenImage] = useState(true);
  const [openGeneral, setOpenGeneral] = useState(true);
  const [openProcessing, setOpenProcessing] = useState(false);
  const [openRecipe, setOpenRecipe] = useState(false);

  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [ingredientSearchResults, setIngredientSearchResults] = useState({});
  const ingredientSearchRequestRef = useRef({});
  const [processingOutputSearchResults, setProcessingOutputSearchResults] = useState({});
  const processingOutputSearchRequestRef = useRef({});

  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [savingCat, setSavingCat] = useState(false);

  const [showSubCatModal, setShowSubCatModal] = useState(false);
  const [newSubCatName, setNewSubCatName] = useState("");
  const [savingSubCat, setSavingSubCat] = useState(false);

  // --- DRAFT RECOVERY ---
  //
  // The queued list plus the row still being composed, both are typed work and a dropped
  // connection used to take the lot. Deliberately absent: `categories`, `subCategories` and
  // the two search-result maps (server data, re-fetched on mount), the accordion open flags
  // and the category modals (transient UI).
  const draftPayload = useMemo(() => ({ cart, draft }), [cart, draft]);

  // An untouched composer is the empty draft the page opens with, so only a non-empty cart
  // or a named item counts as work worth offering back.
  const isDraftDirty = cart.length > 0 || !!String(draft?.name || "").trim();

  const { pendingDraft, discardDraft, clearDraft } = useUnsavedWork({
    kind: "bulk-items",
    schemaVersion: BULK_ITEMS_DRAFT_SCHEMA_VERSION,
    isDirty: isDraftDirty,
    payload: draftPayload,
  });

  const restoreDraft = () => {
    const saved = pendingDraft?.payload;
    if (!saved) return;
    setCart(Array.isArray(saved.cart) ? saved.cart : []);
    if (saved.draft) setDraft(saved.draft);
    discardDraft();
    toast.success("Draft restored");
  };

  const branches = useMemo(
    () => availableBranches.filter((branch) => Number(branch.id) !== 0),
    [availableBranches]
  );

  useEffect(() => {
    if (allowedItemTypeOptions.some((option) => option.value === draft.itemType)) return;

    setDraft((prev) => ({
      ...prev,
      itemType: ItemType.NORMAL,
      defaultUnit: "PCS",
      isKotEnabled: false,
      active: true,
      posVisible: true,
      overheadCostMode: OVERHEAD_COST_MODES.NONE,
      overheadCostValue: "",
      stockProcessingEnabled: false,
      processingOutputs: [],
      ingredients: [],
      branchIds: [],
    }));
  }, [allowedItemTypeOptions, draft.itemType]);

  useEffect(() => {
    loadCategories();
  }, [singleCategoryMode]);

  const loadCategories = async () => {
    try {
      const res = singleCategoryMode
        ? await categoriesAPI.getSingleCategories()
        : await categoriesAPI.getAll();
      setCategories(res.data || []);
    } catch (e) {
      toast.error("Failed to load categories");
    }
  };

  const loadSubCategories = async (catId) => {
    if (singleCategoryMode) {
      setSubCategories([]);
      return;
    }
    if (!catId) {
      setSubCategories([]);
      return;
    }
    try {
      const res = await categoriesAPI.getSubCategories(catId);
      setSubCategories(res.data || []);
    } catch (e) {
      toast.error("Failed to load sub-categories");
    }
  };

  const handleCategoryChange = (catId) => {
    if (singleCategoryMode) {
      updateDraft("categoryId", catId);
      updateDraft("subCategoryId", catId);
      return;
    }
    updateDraft("categoryId", catId);
    updateDraft("subCategoryId", "");
    loadSubCategories(catId);
  };

  const submitNewCategory = async () => {
    if (!newCatName.trim()) return toast.error("Category name is required");
    
    setSavingCat(true);
    try {
      const res = singleCategoryMode
        ? await categoriesAPI.createSingleCategory({ name: newCatName.trim() })
        : await categoriesAPI.create({ name: newCatName.trim() });
      toast.success("Category created!");
      await loadCategories();
      handleCategoryChange(String(res.data.id)); 
      
      setShowCatModal(false);
      setNewCatName("");
    } catch (e) {
      toast.error("Failed to create category");
    } finally {
      setSavingCat(false);
    }
  };

  const submitNewSubCategory = async () => {
    if (!newSubCatName.trim()) return toast.error("Sub-category name is required");
    if (!draft.categoryId) return toast.error("Please select a category first");
    
    setSavingSubCat(true);
    try {
      const res = await categoriesAPI.createSubCategory({
        name: newSubCatName.trim(),
        categoryId: draft.categoryId,
      });
      toast.success("Sub-category created!");
      await loadSubCategories(draft.categoryId);
      updateDraft("subCategoryId", res.data.id); 
      
      setShowSubCatModal(false);
      setNewSubCatName("");
    } catch (e) {
      toast.error("Failed to create sub-category");
    } finally {
      setSavingSubCat(false);
    }
  };

  const updateDraft = (k, v) => setDraft((p) => ({ ...p, [k]: v }));

  const toggleDraftBranch = (branchId) => {
    setDraft((prev) => ({
      ...prev,
      branchIds: prev.branchIds.includes(branchId)
        ? prev.branchIds.filter((id) => id !== branchId)
        : [...prev.branchIds, branchId],
    }));
  };

  const clearIngredientSearchResults = (index) => {
    setIngredientSearchResults((prev) => {
      if (!prev[index]) {
        return prev;
      }

      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const addIngredientRow = () => {
    setDraft((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, buildEmptyIngredient()],
    }));
  };

  const updateIngredient = (index, field, value) => {
    setDraft((prev) => {
      const nextIngredients = [...prev.ingredients];
      nextIngredients[index] = {
        ...nextIngredients[index],
        [field]: value,
      };

      return {
        ...prev,
        ingredients: nextIngredients,
      };
    });
  };

  const searchIngredientItems = async (index, query) => {
    setDraft((prev) => {
      const nextIngredients = [...prev.ingredients];
      const currentRow = nextIngredients[index];
      const isSameSelectedItem = query.trim() === (currentRow?.ingredientName || "").trim();

      nextIngredients[index] = {
        ...currentRow,
        search: query,
        ingredientItemId: isSameSelectedItem ? currentRow.ingredientItemId : "",
        ingredientName: isSameSelectedItem ? currentRow.ingredientName : "",
        ingredientBarcode: isSameSelectedItem ? currentRow.ingredientBarcode : "",
      };

      return {
        ...prev,
        ingredients: nextIngredients,
      };
    });

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      clearIngredientSearchResults(index);
      return;
    }

    const requestId = (ingredientSearchRequestRef.current[index] || 0) + 1;
    ingredientSearchRequestRef.current[index] = requestId;

    setIngredientSearchResults((prev) => ({
      ...prev,
      [index]: { loading: true, items: [] },
    }));

    try {
      const res = await itemsAPI.search(trimmedQuery);
      const itemsArray = Array.isArray(res.data) ? res.data : [];
      const filteredItems = itemsArray.filter(
        (item) =>
          (item.itemType === ItemType.NORMAL || item.itemType === ItemType.WEIGHT || item.itemType === ItemType.VOLUME) &&
          item.active !== false
      );

      if (ingredientSearchRequestRef.current[index] !== requestId) {
        return;
      }

      setIngredientSearchResults((prev) => ({
        ...prev,
        [index]: { loading: false, items: filteredItems },
      }));
    } catch (error) {
      if (ingredientSearchRequestRef.current[index] !== requestId) {
        return;
      }

      setIngredientSearchResults((prev) => ({
        ...prev,
        [index]: { loading: false, items: [] },
      }));
    }
  };

  const selectIngredientForRow = (index, ingredientItem) => {
    setDraft((prev) => {
      const nextIngredients = [...prev.ingredients];
      nextIngredients[index] = {
        ...nextIngredients[index],
        ingredientItemId: ingredientItem.id,
        ingredientName: ingredientItem.name,
        ingredientBarcode: ingredientItem.barcode || "",
        qtyUnit: ingredientItem.defaultUnit || (ingredientItem.itemType === ItemType.WEIGHT ? "KG" : ingredientItem.itemType === ItemType.VOLUME ? "L" : "PCS"),
        search: ingredientItem.name,
      };

      return {
        ...prev,
        ingredients: nextIngredients,
      };
    });

    clearIngredientSearchResults(index);
  };

  const handleIngredientSearchKeyDown = (index, event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    const searchValue = draft.ingredients[index]?.search?.trim();
    const resultItems = ingredientSearchResults[index]?.items || [];

    if (!searchValue || resultItems.length === 0) {
      toast.error("Ingredient not found");
      return;
    }

    const exactMatch = resultItems.find(
      (item) =>
        item.barcode?.toLowerCase() === searchValue.toLowerCase() ||
        item.name?.toLowerCase() === searchValue.toLowerCase()
    );

    selectIngredientForRow(index, exactMatch || resultItems[0]);
  };

  const removeIngredient = (index) => {
    clearIngredientSearchResults(index);
    setDraft((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, ingredientIndex) => ingredientIndex !== index),
    }));
  };

  const isStockTrackedDraft = [ItemType.NORMAL, ItemType.WEIGHT, ItemType.VOLUME].includes(draft.itemType);

  const clearProcessingOutputSearchResults = (index) => {
    setProcessingOutputSearchResults((prev) => {
      if (!prev[index]) return prev;
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const addProcessingOutputRow = () => {
    setDraft((prev) => ({
      ...prev,
      processingOutputs: [...prev.processingOutputs, buildEmptyProcessingOutput()],
    }));
  };

  const updateProcessingOutput = (index, field, value) => {
    setDraft((prev) => {
      const nextOutputs = [...prev.processingOutputs];
      nextOutputs[index] = {
        ...nextOutputs[index],
        [field]: value,
      };
      return {
        ...prev,
        processingOutputs: nextOutputs,
      };
    });
  };

  const searchProcessingOutputItems = async (index, query) => {
    setDraft((prev) => {
      const nextOutputs = [...prev.processingOutputs];
      const currentRow = nextOutputs[index];
      const isSameSelectedItem = query.trim() === (currentRow?.outputName || "").trim();

      nextOutputs[index] = {
        ...currentRow,
        search: query,
        outputItemId: isSameSelectedItem ? currentRow.outputItemId : "",
        outputName: isSameSelectedItem ? currentRow.outputName : "",
        outputBarcode: isSameSelectedItem ? currentRow.outputBarcode : "",
      };

      return {
        ...prev,
        processingOutputs: nextOutputs,
      };
    });

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      clearProcessingOutputSearchResults(index);
      return;
    }

    const requestId = (processingOutputSearchRequestRef.current[index] || 0) + 1;
    processingOutputSearchRequestRef.current[index] = requestId;

    setProcessingOutputSearchResults((prev) => ({
      ...prev,
      [index]: { loading: true, items: [] },
    }));

    try {
      const res = await itemsAPI.search(trimmedQuery);
      const itemsArray = Array.isArray(res.data) ? res.data : [];
      const selectedIds = new Set(
        draft.processingOutputs
          .map((output, outputIndex) => outputIndex === index ? null : Number(output.outputItemId))
          .filter(Boolean)
      );
      const filteredItems = itemsArray.filter(
        (item) =>
          [ItemType.NORMAL, ItemType.WEIGHT, ItemType.VOLUME].includes(item.itemType) &&
          item.active !== false &&
          !selectedIds.has(Number(item.id))
      );

      if (processingOutputSearchRequestRef.current[index] !== requestId) {
        return;
      }

      setProcessingOutputSearchResults((prev) => ({
        ...prev,
        [index]: { loading: false, items: filteredItems },
      }));
    } catch (error) {
      if (processingOutputSearchRequestRef.current[index] !== requestId) {
        return;
      }

      setProcessingOutputSearchResults((prev) => ({
        ...prev,
        [index]: { loading: false, items: [] },
      }));
    }
  };

  const selectProcessingOutputForRow = (index, item) => {
    const defaultQtyUnit = item.itemType === ItemType.WEIGHT ? "KG" : item.itemType === ItemType.VOLUME ? "L" : (item.defaultUnit || "PCS");
    setDraft((prev) => {
      const nextOutputs = [...prev.processingOutputs];
      nextOutputs[index] = {
        ...nextOutputs[index],
        outputItemId: item.id,
        outputName: item.name,
        outputBarcode: item.barcode || "",
        itemType: item.itemType,
        defaultUnit: item.defaultUnit || "PCS",
        defaultQtyUnit,
        search: item.name,
      };

      return {
        ...prev,
        processingOutputs: nextOutputs,
      };
    });

    clearProcessingOutputSearchResults(index);
  };

  const handleProcessingOutputSearchKeyDown = (index, event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    const searchValue = draft.processingOutputs[index]?.search?.trim();
    const resultItems = processingOutputSearchResults[index]?.items || [];

    if (!searchValue || resultItems.length === 0) {
      toast.error("Processing output item not found");
      return;
    }

    const exactMatch = resultItems.find(
      (item) =>
        item.barcode?.toLowerCase() === searchValue.toLowerCase() ||
        item.name?.toLowerCase() === searchValue.toLowerCase()
    );

    selectProcessingOutputForRow(index, exactMatch || resultItems[0]);
  };

  const removeProcessingOutput = (index) => {
    clearProcessingOutputSearchResults(index);
    setDraft((prev) => ({
      ...prev,
      processingOutputs: prev.processingOutputs.filter((_, outputIndex) => outputIndex !== index),
    }));
  };

  const imageBadge = draft.imageUrl?.trim() ? "1 Image" : "0 Image";

  const validateGeneral = () => {
    if (!draft.name.trim()) return "Item name is required";
    if (!String(draft.categoryId).trim()) return "Category is required";
    if (!String(draft.subCategoryId).trim()) return singleCategoryMode ? "Category is required" : "Sub Category is required";

    const cost = num(draft.costPrice);
    const sell = num(draft.sellingPrice);
    if (cost === null || cost < 0) return "Cost price invalid";
    if (sell === null || sell < 0) return "Selling price invalid";
    if (draft.itemType === ItemType.SERVICE && draft.branchIds.length === 0) {
      return "Select at least one branch for the service";
    }
    const recipeIngredientRows = getRecipeIngredientRows(draft.ingredients);

    if (
      draft.itemType === ItemType.RECIPE &&
      recipeIngredientRows.some((ingredient) => !ingredient.ingredientItemId || Number(ingredient.quantity || 0) <= 0)
    ) {
      return "Select each ingredient from search and enter a valid quantity";
    }
    if (
      draft.itemType === ItemType.RECIPE &&
      new Set(recipeIngredientRows.map((ingredient) => String(ingredient.ingredientItemId))).size !== recipeIngredientRows.length
    ) {
      return "Duplicate ingredient found in recipe";
    }
    if (
      draft.itemType === ItemType.RECIPE &&
      draft.overheadCostMode !== OVERHEAD_COST_MODES.NONE &&
      Number(draft.overheadCostValue || 0) <= 0
    ) {
      return "Enter a valid recipe overhead value";
    }
    if (
      isStockTrackedDraft &&
      draft.stockProcessingEnabled &&
      draft.processingOutputs.some((output) => !output.outputItemId)
    ) {
      return "Select each stock processing output from search";
    }
    if (
      isStockTrackedDraft &&
      draft.stockProcessingEnabled &&
      draft.processingOutputs.some((output) => Number(output.defaultQty || 0) <= 0)
    ) {
      return "Enter a valid default quantity for each stock processing output";
    }
    if (
      isStockTrackedDraft &&
      draft.stockProcessingEnabled &&
      new Set(draft.processingOutputs.map((output) => String(output.outputItemId))).size !== draft.processingOutputs.length
    ) {
      return "Duplicate stock processing output found";
    }

    return null;
  };

  const addToList = () => {
    const err = validateGeneral();
    if (err) {
      toast.error(err);
      return false;
    }

    const nextBarcode = draft.barcode.trim();
    const exists = nextBarcode ? cart.find((x) => x.barcode === nextBarcode) : null;
    if (exists) {
      toast.error("This barcode is already in the list!");
      return false;
    }

    // 🟢 weightItem ඉවත් කළා
    const newItem = {
      tempId: uuid(),
      name: draft.name.trim(),
      altName: draft.altName?.trim() || null,
      barcode: nextBarcode,
      categoryId: draft.categoryId, 
      subCategoryId: Number(draft.subCategoryId),
      imageUrl: draft.imageUrl?.trim() || "",
      costPrice: num(draft.costPrice),
      sellingPrice: num(draft.sellingPrice),
      reorderLevel:
        draft.itemType === ItemType.SERVICE || draft.itemType === ItemType.RECIPE
          ? 0
          : (num(draft.reorderLevel) ?? 0),
      itemType: draft.itemType,
      isKotEnabled: draft.itemType === ItemType.RECIPE && kotEnabled ? !!draft.isKotEnabled : false,
      active: !!draft.active,
      posVisible: !!draft.posVisible,
      overheadCostMode: draft.itemType === ItemType.RECIPE ? draft.overheadCostMode : OVERHEAD_COST_MODES.NONE,
      overheadCostValue:
        draft.itemType === ItemType.RECIPE && draft.overheadCostMode !== OVERHEAD_COST_MODES.NONE
          ? Number(draft.overheadCostValue || 0)
          : 0,
      stockProcessingEnabled: isStockTrackedDraft ? !!draft.stockProcessingEnabled : false,
      processingOutputs:
        isStockTrackedDraft && draft.stockProcessingEnabled
          ? draft.processingOutputs.map((output) => ({
              outputItemId: Number(output.outputItemId),
              outputName: output.outputName || "",
              outputBarcode: output.outputBarcode || "",
              itemType: output.itemType || "",
              defaultUnit: output.defaultUnit || "PCS",
              defaultQty: Number(output.defaultQty || 0),
              defaultQtyUnit: output.defaultQtyUnit || output.defaultUnit || "PCS",
              waste: !!output.waste,
              search: output.search || output.outputName || "",
            }))
          : [],
      ingredients:
        draft.itemType === ItemType.RECIPE
          ? getRecipeIngredientRows(draft.ingredients).map((ingredient) => ({
              ingredientItemId: Number(ingredient.ingredientItemId),
              ingredientName: ingredient.ingredientName || "",
              ingredientBarcode: ingredient.ingredientBarcode || "",
              quantity: Number(ingredient.quantity || 0),
              qtyUnit: ingredient.qtyUnit,
              search: ingredient.search || ingredient.ingredientName || "",
            }))
          : [],
      defaultUnit:
        draft.itemType === ItemType.WEIGHT || draft.itemType === ItemType.VOLUME
          ? draft.defaultUnit
          : draft.itemType === ItemType.SERVICE
            ? "SERVICE"
            : "PCS",
      branchIds: draft.itemType === ItemType.SERVICE ? draft.branchIds : [],
    };

    setCart((prev) => [...prev, newItem]);
    
    setDraft(emptyDraft());
    setIngredientSearchResults({});
    setProcessingOutputSearchResults({});
    setSubCategories([]);
    toast.success("Added to list");
    return true;
  };

  const addToListAndRevealQueue = () => {
    if (!addToList()) return;
    if (window.matchMedia("(max-width: 1279px)").matches) {
      setShowQueueDialog(true);
    }
  };

  const removeRow = (tempId) => setCart((p) => p.filter((x) => x.tempId !== tempId));

  const editRow = (tempId) => {
    const row = cart.find((x) => x.tempId === tempId);
    if (!row) return;

    setDraft({
      imageUrl: row.imageUrl || "",
      name: row.name || "",
      barcode: row.barcode || "",
      categoryId: row.categoryId || "",
      subCategoryId: row.subCategoryId || "",
      costPrice: row.costPrice ?? "",
      sellingPrice: row.sellingPrice ?? "",
      reorderLevel: row.reorderLevel ?? "",
      itemType: row.itemType || ItemType.NORMAL,
      defaultUnit: row.defaultUnit || "PCS",
      isKotEnabled: row.isKotEnabled ?? false,
      active: row.active ?? true,
      posVisible: row.posVisible ?? true,
      overheadCostMode: row.overheadCostMode || OVERHEAD_COST_MODES.NONE,
      overheadCostValue: row.overheadCostValue ?? "",
      stockProcessingEnabled: row.stockProcessingEnabled ?? false,
      processingOutputs: Array.isArray(row.processingOutputs)
        ? row.processingOutputs.map((output) => ({
            outputItemId: output.outputItemId,
            outputName: output.outputName || "",
            outputBarcode: output.outputBarcode || "",
            itemType: output.itemType || "",
            defaultUnit: output.defaultUnit || "PCS",
            defaultQty: output.defaultQty ?? "",
            defaultQtyUnit: output.defaultQtyUnit || output.defaultUnit || "PCS",
            waste: !!output.waste,
            search: output.outputName || "",
          }))
        : [],
      ingredients: Array.isArray(row.ingredients)
        ? row.ingredients.map((ingredient) => ({
            ingredientItemId: ingredient.ingredientItemId,
            ingredientName: ingredient.ingredientName || "",
            ingredientBarcode: ingredient.ingredientBarcode || "",
            quantity: ingredient.quantity ?? "",
            qtyUnit: ingredient.qtyUnit || "PCS",
            search: ingredient.ingredientName || "",
          }))
        : [],
      branchIds: row.branchIds || [],
    });

    if (!singleCategoryMode && row.categoryId) {
      loadSubCategories(row.categoryId);
    }

    setIngredientSearchResults({});
    setProcessingOutputSearchResults({});
    removeRow(tempId);
    setOpenGeneral(true);
    setOpenProcessing([ItemType.NORMAL, ItemType.WEIGHT, ItemType.VOLUME].includes(row.itemType || ItemType.NORMAL));
    setOpenRecipe((row.itemType || ItemType.NORMAL) === ItemType.RECIPE);
  };

  const saveAll = async () => {
    if (cart.length === 0) return toast.error("List is empty");

    setSaving(true);
    try {
      // 🟢 weightItem ඉවත් කළා
      const payload = cart.map((item) => ({
        name: item.name,
        altName: item.altName || null,
        barcode: item.barcode,
        subCategoryId: item.subCategoryId,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        reorderLevel: item.reorderLevel,
        imageUrl: item.imageUrl,
        itemType: item.itemType,
        isKotEnabled: item.itemType === ItemType.RECIPE ? !!item.isKotEnabled : false,
        ingredients:
          item.itemType === ItemType.RECIPE
            ? item.ingredients.map((ingredient) => ({
                ingredientItemId: Number(ingredient.ingredientItemId),
                quantity: Number(ingredient.quantity || 0),
                qtyUnit: ingredient.qtyUnit,
              }))
            : [],
        defaultUnit: item.defaultUnit,
        ...(item.itemType === ItemType.SERVICE ? { branchIds: item.branchIds } : {}),
        posVisible: item.posVisible,
        active: item.active,
        overheadCostMode: item.itemType === ItemType.RECIPE ? item.overheadCostMode : OVERHEAD_COST_MODES.NONE,
        overheadCostValue:
          item.itemType === ItemType.RECIPE && item.overheadCostMode !== OVERHEAD_COST_MODES.NONE
            ? Number(item.overheadCostValue || 0)
            : 0,
        stockProcessingEnabled: [ItemType.NORMAL, ItemType.WEIGHT, ItemType.VOLUME].includes(item.itemType)
          ? !!item.stockProcessingEnabled
          : false,
        processingOutputs:
          [ItemType.NORMAL, ItemType.WEIGHT, ItemType.VOLUME].includes(item.itemType) && item.stockProcessingEnabled
            ? item.processingOutputs.map((output) => ({
                outputItemId: Number(output.outputItemId),
                defaultQty: Number(output.defaultQty || 0),
                waste: !!output.waste,
              }))
            : [],
      }));

      await itemsAPI.createBulk(payload);

      // Saved for real, the draft would otherwise be offered back next visit and re-create
      // everything that just went in.
      await clearDraft();
      toast.success(`Saved ${cart.length} items successfully ✅`);
      setCart([]);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Bulk save failed");
    } finally {
      setSaving(false);
    }
  };

  const totalLines = cart.length;

return (
    <div className="page-enter -mx-2 pb-6 sm:mx-0 xl:pb-2">
      <div className="page-section-enter flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between" style={{ animationDelay: "80ms" }}>
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <button type="button" onClick={() => window.history.back()} className="rounded transition-colors hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent">Items</button>
            <span aria-hidden="true">/</span>
            <span className="text-slate-700">Bulk Add Items</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Bulk Add Items</h1>
          <p className="mt-1 text-sm text-slate-500">Add several items to a list, then save them together.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            {totalLines} {totalLines === 1 ? "item" : "items"} ready
          </span>
          <Button variant="secondary" onClick={() => setCart([])} disabled={saving || cart.length === 0}>
            Clear list
          </Button>
          <Button onClick={saveAll} disabled={saving || cart.length === 0}>
            {saving ? "Saving..." : `Save all (${totalLines})`}
          </Button>
        </div>
      </div>

      <DraftRestoreBar
        draft={pendingDraft}
        label={`Unsaved item list${pendingDraft?.payload?.cart?.length
          ? ` (${pendingDraft.payload.cart.length} item${pendingDraft.payload.cart.length === 1 ? "" : "s"})`
          : ""}`}
        onRestore={restoreDraft}
        onDiscard={discardDraft}
      />

      <ResizableSplit storageKey="pos_split_bulk_add" initialWidth={520} min={420} max={760} className="mt-5">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
            <h2 className="text-lg font-semibold text-slate-900">Add an item</h2>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">Complete this item, then add it to the list below.</p>
          </div>

          <BulkSection
            title="General Information"
            description="Primary name, identifiers, and catalog classification."
            isOpen={openGeneral}
            onToggle={() => setOpenGeneral((v) => !v)}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label htmlFor="bulkadditems-item-name" className="mb-1 block text-[13px] font-semibold text-slate-700">Item Name *</label>
                <input id="bulkadditems-item-name"
                  className={`${fieldClass}`}
                  value={draft.name}
                  onChange={(e) => updateDraft("name", e.target.value)}
                  placeholder="e.g. Ceylon Black Tea 250g"
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="bulkadditems-alt-name-sinhala-optional-used-on-receip" className="mb-1 block text-[13px] font-semibold text-slate-700">Alternate Name (Sinhala)</label>
                <input id="bulkadditems-alt-name-sinhala-optional-used-on-receip"
                  className={`${fieldClass}`}
                  value={draft.altName}
                  onChange={(e) => updateDraft("altName", e.target.value)}
                  placeholder="Optional Sinhala name"
                />
                <p className={helperClass}>Used on receipts when the receipt name source is Alternate Name.</p>
              </div>

              <div>
                <label htmlFor="bulkadditems-barcode" className="mb-1 block text-[13px] font-semibold text-slate-700">Barcode</label>
                <input id="bulkadditems-barcode"
                  className={`${fieldClass} font-mono tabular-nums`}
                  value={draft.barcode}
                  onChange={(e) => updateDraft("barcode", e.target.value)}
                  placeholder="Scan or enter barcode"
                />
                <p className={helperClass}>Leave blank to generate automatically.</p>
              </div>

              <div>
                <label className="mb-1 block text-[13px] font-semibold text-slate-700">Item Type</label>
                <CustomSelect
                  value={draft.itemType}
                  onChange={(val) => {
                    setIngredientSearchResults({});
                    setDraft((prev) => ({
                      ...prev,
                      itemType: val,
                      defaultUnit: val === ItemType.WEIGHT ? "KG" : val === ItemType.VOLUME ? "L" : val === ItemType.SERVICE ? "SERVICE" : "PCS",
                      isKotEnabled: val === ItemType.RECIPE ? prev.isKotEnabled : false,
                      overheadCostMode: val === ItemType.RECIPE ? prev.overheadCostMode : OVERHEAD_COST_MODES.NONE,
                      overheadCostValue: val === ItemType.RECIPE ? prev.overheadCostValue : "",
                      stockProcessingEnabled: [ItemType.NORMAL, ItemType.WEIGHT, ItemType.VOLUME].includes(val)
                        ? prev.stockProcessingEnabled
                        : false,
                      processingOutputs: [ItemType.NORMAL, ItemType.WEIGHT, ItemType.VOLUME].includes(val)
                        ? prev.processingOutputs
                        : [],
                      ingredients: val === ItemType.RECIPE ? prev.ingredients : [],
                      branchIds: val === ItemType.SERVICE ? prev.branchIds : [],
                    }));
                  }}
                  options={allowedItemTypeOptions}
                  valueKey="value"
                  labelKey="label"
                  buttonClassName="h-11 rounded-lg px-3 text-sm"
                />
                <p className={helperClass}>Controls units and optional capabilities.</p>
              </div>

              {(draft.itemType === ItemType.WEIGHT || draft.itemType === ItemType.VOLUME) && (
                <div>
                  <label className="mb-1 block text-[13px] font-semibold text-slate-700">Default Unit</label>
                  <CustomSelect
                    value={draft.defaultUnit}
                    onChange={(value) => updateDraft("defaultUnit", value)}
                    options={draft.itemType === ItemType.VOLUME ? volumeUnitOptions : weightUnitOptions}
                    valueKey="value"
                    labelKey="label"
                    buttonClassName="h-11 rounded-lg px-3 text-sm"
                  />
                </div>
              )}

              <div className="relative z-20">
                <label className="mb-1 block text-[13px] font-semibold text-slate-700">Category *</label>
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1">
                    <SearchSelect
                      value={singleCategoryMode ? draft.subCategoryId : draft.categoryId}
                      onChange={handleCategoryChange}
                      options={categories}
                      placeholder="Select Category"
                      searchPlaceholder="Type category name…"
                      noResultsMessage="No category matches that"
                      emptyMessage="No categories yet — add one with +"
                      menuMinWidth={260}
                      onOpen={loadCategories}
                      inputClassName="h-11 text-sm"
                    />
                  </div>
                  <Button type="button" variant="secondary" onClick={() => setShowCatModal(true)} className="h-11 shrink-0 px-3" aria-label="Add category">
                    <Plus size={18} />
                  </Button>
                </div>
              </div>

              {!singleCategoryMode && (
                <div className="relative z-10">
                  <label className="mb-1 block text-[13px] font-semibold text-slate-700">Sub Category *</label>
                  <div className="flex gap-2">
                    <div className="min-w-0 flex-1">
                      <SearchSelect
                        value={draft.subCategoryId}
                        onChange={(val) => updateDraft("subCategoryId", val)}
                        options={subCategories}
                        placeholder="Select Sub Category"
                        searchPlaceholder="Type sub-category name…"
                        noResultsMessage="No sub-category matches that"
                        emptyMessage="No sub-categories for this category"
                        menuMinWidth={260}
                        onOpen={() => loadSubCategories(draft.categoryId)}
                        disabled={!draft.categoryId}
                        inputClassName="h-11 text-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowSubCatModal(true)}
                      className="h-11 shrink-0 px-3"
                      disabled={!draft.categoryId}
                      aria-label="Add sub category"
                    >
                      <Plus size={18} />
                    </Button>
                  </div>
                </div>
              )}

              {draft.itemType === ItemType.SERVICE && (
                <div className="md:col-span-2 border-t border-slate-200 pt-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <label className="block text-[13px] font-semibold text-slate-700">Available Branches *</label>
                      <p className={helperClass}>This service is visible in POS only for selected branches.</p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-slate-500">{draft.branchIds.length} selected</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {branches.map((branch) => {
                      const checked = draft.branchIds.includes(branch.id);
                      return (
                        <label
                          key={branch.id}
                          className={`flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition ${
                            checked ? "border-accent bg-accent-soft" : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleDraftBranch(branch.id)}
                            className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
                          />
                          <span className="text-sm text-slate-700">{branch.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </BulkSection>

          <BulkSection
            title="Product Image"
            description="Paste an image URL and confirm the preview."
            right={<span className="text-xs text-slate-500">{imageBadge}</span>}
            isOpen={openImage}
            onToggle={() => setOpenImage((v) => !v)}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
              <div className="aspect-[4/3] overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50">
                {draft.imageUrl ? (
                  <img
                    src={draft.imageUrl}
                    alt="Product preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-4 text-center text-xs text-slate-500">Image preview</div>
                )}
              </div>
              <div>
                <label htmlFor="bulkadditems-image-url" className="mb-1 block text-[13px] font-semibold text-slate-700">Image URL</label>
                <input id="bulkadditems-image-url"
                  className={fieldClass}
                  value={draft.imageUrl}
                  onChange={(e) => updateDraft("imageUrl", e.target.value)}
                  placeholder="https://..."
                />
                <p className={helperClass}>Preview updates instantly.</p>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-3"
                  onClick={() => updateDraft("imageUrl", "")}
                  disabled={!draft.imageUrl}
                >
                  Remove image
                </Button>
              </div>
            </div>
          </BulkSection>

          <BulkSection
            title="Pricing & Stock"
            description="Commercial price and the low-stock threshold for this item."
            isOpen
            onToggle={() => {}}
            hideToggle
          >
            <div className="grid grid-cols-2 gap-2 min-[370px]:grid-cols-3 sm:gap-4">
              <div>
                <label htmlFor="bulkadditems-cost" className="mb-1 flex h-8 items-end text-[12px] font-semibold leading-4 text-slate-700 sm:text-[13px]">Cost {priceUnitLabel(draft.itemType)}</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-500 sm:left-3 sm:text-xs">LKR</span>
                  <input id="bulkadditems-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    className={`${fieldClass} pl-9 pr-2 text-right tabular-nums sm:pl-12 sm:pr-3`}
                    value={draft.costPrice}
                    onChange={(e) => updateDraft("costPrice", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="bulkadditems-sell" className="mb-1 flex h-8 items-end text-[12px] font-semibold leading-4 text-slate-700 sm:text-[13px]">Sell {priceUnitLabel(draft.itemType)}</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-500 sm:left-3 sm:text-xs">LKR</span>
                  <input id="bulkadditems-sell"
                    type="number"
                    min="0"
                    step="0.01"
                    className={`${fieldClass} pl-9 pr-2 text-right font-semibold tabular-nums sm:pl-12 sm:pr-3`}
                    value={draft.sellingPrice}
                    onChange={(e) => updateDraft("sellingPrice", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="bulkadditems-reorder-level" className="mb-1 flex h-8 items-end text-[12px] font-semibold leading-4 text-slate-700 sm:text-[13px]">Reorder Level</label>
                <input id="bulkadditems-reorder-level"
                  type="number"
                  min="0"
                  className={`${fieldClass} px-2 text-right tabular-nums sm:px-3`}
                  value={draft.itemType === ItemType.SERVICE || draft.itemType === ItemType.RECIPE ? "0" : draft.reorderLevel}
                  onChange={(e) => updateDraft("reorderLevel", e.target.value)}
                  disabled={draft.itemType === ItemType.SERVICE || draft.itemType === ItemType.RECIPE}
                  placeholder="0"
                />
              </div>
            </div>
            <p className={`${helperClass} mt-2`}>
              {draft.itemType === ItemType.SERVICE || draft.itemType === ItemType.RECIPE
                ? "Reorder Level is not used for service or recipe items."
                : "Reorder Level warns when available stock reaches that quantity."}
            </p>

            {draft.itemType === ItemType.RECIPE && (
              <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[13px] font-semibold text-slate-700">Recipe Overhead</label>
                  <CustomSelect
                    value={draft.overheadCostMode}
                    onChange={(value) => {
                      setDraft((prev) => ({
                        ...prev,
                        overheadCostMode: value,
                        overheadCostValue: value === OVERHEAD_COST_MODES.NONE ? "" : prev.overheadCostValue,
                      }));
                    }}
                    options={overheadCostOptions}
                    valueKey="value"
                    labelKey="label"
                    buttonClassName="h-11 rounded-lg px-3 text-sm"
                  />
                  <p className={helperClass}>For oil, spice, gas, packing, or untracked kitchen overhead.</p>
                </div>
                <div>
                  <label htmlFor="bulkadditems-overhead" className="mb-1 block text-[13px] font-semibold text-slate-700">
                    {draft.overheadCostMode === OVERHEAD_COST_MODES.PERCENT ? "Overhead Percent" : "Overhead Amount"}
                  </label>
                  <div className="grid grid-cols-[minmax(0,1fr)_64px] gap-2">
                    <input id="bulkadditems-overhead"
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.overheadCostValue}
                      onChange={(e) => updateDraft("overheadCostValue", e.target.value)}
                      disabled={draft.overheadCostMode === OVERHEAD_COST_MODES.NONE}
                      className={`${fieldClass} text-right tabular-nums`}
                      placeholder="0"
                    />
                    <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-600">
                      {draft.overheadCostMode === OVERHEAD_COST_MODES.PERCENT ? "%" : "LKR"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </BulkSection>

          {isStockTrackedDraft && (
            <BulkSection
              title="Stock Processing"
              description="Optional. Link output items produced from this stock item."
              right={<span className="text-xs text-slate-500">{draft.stockProcessingEnabled ? `${draft.processingOutputs.length} outputs` : "Optional"}</span>}
              isOpen={openProcessing}
              onToggle={() => setOpenProcessing((v) => !v)}
            >
              <div className="space-y-4">
                <BulkToggleRow
                  label="Enable as processing source"
                  description="Use this item as a source that can be processed into linked outputs."
                  checked={!!draft.stockProcessingEnabled}
                  stateLabel={draft.stockProcessingEnabled ? "On" : "Off"}
                  onChange={(checked) => {
                    setDraft((prev) => ({
                      ...prev,
                      stockProcessingEnabled: checked,
                      processingOutputs: checked && prev.processingOutputs.length === 0
                        ? [buildEmptyProcessingOutput()]
                        : prev.processingOutputs,
                    }));
                  }}
                />

                {draft.stockProcessingEnabled && (
                  <div className="space-y-3 border-t border-slate-200 pt-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm leading-6 text-slate-500">Select output stock items and default quantities produced from this source.</p>
                      <Button type="button" onClick={addProcessingOutputRow} className="shrink-0">
                        <Plus size={16} className="mr-2" />
                        Add output
                      </Button>
                    </div>

                    {draft.processingOutputs.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                        No output items linked yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {draft.processingOutputs.map((output, index) => (
                          <div
                            key={`${output.outputItemId || "new"}-${index}`}
                            className={`relative grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_140px_52px] ${
                              processingOutputSearchResults[index]?.loading || (processingOutputSearchResults[index]?.items || []).length > 0 ? "z-50" : "z-0"
                            }`}
                          >
                            <div>
                              <label className="mb-1 block text-[13px] font-semibold text-slate-700">Output Item <span className="text-accent">*</span></label>
                              <div className="relative">
                                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input aria-label="Output item"
                                  type="text"
                                  value={output.search || ""}
                                  onChange={(e) => searchProcessingOutputItems(index, e.target.value)}
                                  onKeyDown={(e) => handleProcessingOutputSearchKeyDown(index, e)}
                                  onBlur={() => window.setTimeout(() => clearProcessingOutputSearchResults(index), 150)}
                                  placeholder="Search output item..."
                                  className={`${fieldClass} pl-10`}
                                />
                                {(processingOutputSearchResults[index]?.loading || (processingOutputSearchResults[index]?.items || []).length > 0) && (
                                  <div className="relative z-[80] mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
                                    {processingOutputSearchResults[index]?.loading ? (
                                      <div className="px-4 py-3 text-sm text-slate-500">Searching...</div>
                                    ) : (
                                      processingOutputSearchResults[index].items.map((option) => (
                                        <button
                                          key={option.id}
                                          type="button"
                                          onMouseDown={(e) => e.preventDefault()}
                                          onClick={() => selectProcessingOutputForRow(index, option)}
                                          className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-2 text-left transition hover:bg-accent-soft last:border-b-0"
                                        >
                                          <div className="min-w-0">
                                            <div className="truncate font-medium text-slate-800">{option.name}</div>
                                            <div className="text-xs text-slate-500">{option.barcode || "No barcode"}</div>
                                          </div>
                                          <div className="shrink-0 rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                                            {option.defaultUnit || "PCS"}
                                          </div>
                                        </button>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                              {output.outputItemId && (
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                  <span className="rounded border border-slate-200 bg-white px-2 py-1">{output.outputName}</span>
                                  <span className="rounded border border-slate-200 bg-white px-2 py-1">{output.defaultQtyUnit || output.defaultUnit || "PCS"}</span>
                                </div>
                              )}
                            </div>

                            <div>
                              <label className="mb-1 block text-[13px] font-semibold text-slate-700">Default Qty <span className="text-accent">*</span></label>
                              <div className="grid grid-cols-[minmax(0,1fr)_64px] gap-2">
                                <input aria-label="Default quantity"
                                  type="number"
                                  min="0"
                                  step="0.001"
                                  value={output.defaultQty}
                                  onChange={(e) => updateProcessingOutput(index, "defaultQty", e.target.value)}
                                  className={`${fieldClass} px-3 tabular-nums`}
                                  placeholder="0"
                                />
                                <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600">
                                  {output.defaultQtyUnit || output.defaultUnit || "PCS"}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-end gap-3">
                              <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={!!output.waste}
                                  onChange={(e) => updateProcessingOutput(index, "waste", e.target.checked)}
                                  className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
                                />
                                Waste
                              </label>
                              <button aria-label="Remove output"
                                type="button"
                                onClick={() => removeProcessingOutput(index)}
                                className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-danger-border hover:text-danger focus:outline-none focus:ring-2 focus:ring-accent"
                                title="Remove output"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </BulkSection>
          )}

          {draft.itemType === ItemType.RECIPE && (
            <BulkSection
              title="Recipe Ingredients"
              description="Optional. Search and add stock items used by this recipe."
              right={<span className="text-xs text-slate-500">{draft.ingredients.length} items</span>}
              isOpen={openRecipe}
              onToggle={() => setOpenRecipe((v) => !v)}
            >
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-6 text-slate-500">Search ingredients by name or barcode.</p>
                  <Button type="button" onClick={addIngredientRow} className="shrink-0">
                    <Plus size={16} className="mr-2" />
                    Add ingredient
                  </Button>
                </div>

                {draft.ingredients.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                    No ingredients added yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {draft.ingredients.map((ingredient, index) => (
                      <div
                        key={`${ingredient.ingredientItemId || "new"}-${index}`}
                        className={`relative grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_120px_120px_52px] ${
                          ingredientSearchResults[index]?.loading || (ingredientSearchResults[index]?.items || []).length > 0 ? "z-50" : "z-0"
                        }`}
                      >
                        <div>
                          <label className="mb-1 block text-[13px] font-semibold text-slate-700">Ingredient <span className="text-accent">*</span></label>
                          <div className="relative">
                            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input aria-label="Ingredient"
                              type="text"
                              value={ingredient.search || ""}
                              onChange={(e) => searchIngredientItems(index, e.target.value)}
                              onKeyDown={(e) => handleIngredientSearchKeyDown(index, e)}
                              onBlur={() => window.setTimeout(() => clearIngredientSearchResults(index), 150)}
                              placeholder="Scan barcode or type ingredient name..."
                              className={`${fieldClass} pl-10`}
                            />
                            {(ingredientSearchResults[index]?.loading || (ingredientSearchResults[index]?.items || []).length > 0) && (
                              <div className="relative z-[80] mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
                                {ingredientSearchResults[index]?.loading ? (
                                  <div className="px-4 py-3 text-sm text-slate-500">Searching...</div>
                                ) : (
                                  ingredientSearchResults[index].items.map((option) => (
                                    <button
                                      key={option.id}
                                      type="button"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => selectIngredientForRow(index, option)}
                                      className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-2 text-left transition hover:bg-accent-soft last:border-b-0"
                                    >
                                      <div className="min-w-0">
                                        <div className="truncate font-medium text-slate-800">{option.name}</div>
                                        <div className="text-xs text-slate-500">{option.barcode || "No barcode"}</div>
                                      </div>
                                      <div className="shrink-0 rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                                        {option.defaultUnit || "PCS"}
                                      </div>
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                          {ingredient.ingredientItemId && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span className="rounded border border-slate-200 bg-white px-2 py-1">{ingredient.ingredientName}</span>
                              {ingredient.ingredientBarcode && (
                                <span className="rounded border border-slate-200 bg-white px-2 py-1">{ingredient.ingredientBarcode}</span>
                              )}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="mb-1 block text-[13px] font-semibold text-slate-700">Qty <span className="text-accent">*</span></label>
                          <input aria-label="Ingredient quantity"
                            type="number"
                            min="0"
                            step="0.001"
                            value={ingredient.quantity}
                            onChange={(e) => updateIngredient(index, "quantity", e.target.value)}
                            className={`${fieldClass} tabular-nums`}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-[13px] font-semibold text-slate-700">Unit</label>
                          <CustomSelect
                            value={ingredient.qtyUnit}
                            onChange={(value) => updateIngredient(index, "qtyUnit", value)}
                            options={recipeUnitOptions}
                            valueKey="value"
                            labelKey="label"
                            buttonClassName="h-11 rounded-lg px-3 text-sm"
                          />
                        </div>

                        <div className="flex items-end">
                          <button aria-label="Remove ingredient"
                            type="button"
                            onClick={() => removeIngredient(index)}
                            className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:border-danger-border hover:text-danger focus:outline-none focus:ring-2 focus:ring-accent"
                            title="Remove ingredient"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </BulkSection>
          )}

          <BulkSection
            title="Visibility & Status"
            description="Control where this queued item will be available."
            isOpen
            onToggle={() => {}}
            hideToggle
          >
            <div className="space-y-4 divide-y divide-slate-200">
              <BulkToggleRow
                label="Show in POS"
                description="Turn this off for ingredient-only stock items used in recipes."
                checked={!!draft.posVisible}
                stateLabel={draft.posVisible ? "Visible" : "Hidden"}
                onChange={(checked) => updateDraft("posVisible", checked)}
              />
              <div className="pt-4">
                <BulkToggleRow
                  label="Item active"
                  description="Inactive items stay saved but are hidden from sale and stock selection."
                  checked={!!draft.active}
                  stateLabel={draft.active ? "Active" : "Inactive"}
                  onChange={(checked) => updateDraft("active", checked)}
                />
              </div>
              {draft.itemType === ItemType.RECIPE && (
                <div className="pt-4">
                  <BulkToggleRow
                    label="Send to Kitchen (KOT)"
                    description={kotEnabled ? "Print a kitchen ticket when this recipe is sold." : "KOT is disabled in App Configuration."}
                    checked={kotEnabled && !!draft.isKotEnabled}
                    disabled={!kotEnabled}
                    stateLabel={!kotEnabled ? "Unavailable" : (draft.isKotEnabled ? "On" : "Off")}
                    onChange={(checked) => updateDraft("isKotEnabled", checked)}
                  />
                </div>
              )}
            </div>
          </BulkSection>

          <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={() => setDraft(emptyDraft())} className="flex-1">
                Clear form
              </Button>
              <Button type="button" onClick={addToListAndRevealQueue} className="flex-[2]">
                Add to list
              </Button>
            </div>
          </div>
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white xl:block">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Items to add</h2>
              <p className="mt-0.5 text-xs text-slate-500">{totalLines} {totalLines === 1 ? "item" : "items"} queued</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {totalLines} ready
            </span>
          </div>

          <BulkQueueList
            cart={cart}
            totalLines={totalLines}
            onEdit={editRow}
            onRemove={removeRow}
          />

          {cart.length === 0 && (
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 sm:px-5">
              Items are saved only when you choose Save all.
            </div>
          )}
        </div>
      </ResizableSplit>

      {createPortal(
        <button
          type="button"
          onClick={() => setShowQueueDialog(true)}
          className="fixed bottom-4 right-4 z-[70] flex h-14 min-w-14 items-center justify-center gap-2 rounded-full bg-accent px-4 text-accent-fg shadow-lg transition hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 xl:hidden"
          aria-label={`Open queued items, ${totalLines} ${totalLines === 1 ? "item" : "items"}`}
        >
          <span className="relative">
            <ShoppingCart size={22} aria-hidden="true" />
            {totalLines > 0 && (
              <span className="absolute -right-3 -top-3 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-accent bg-white px-1 text-[10px] font-bold leading-none text-slate-900 tabular-nums">
                {totalLines}
              </span>
            )}
          </span>
          <span className="text-sm font-semibold">List</span>
        </button>,
        document.body
      )}

      <Modal
        isOpen={showQueueDialog}
        onClose={() => setShowQueueDialog(false)}
        title={`Items to add${totalLines ? ` (${totalLines})` : ""}`}
      >
        <div className="-mx-2 overflow-hidden rounded-xl border border-slate-200">
          <BulkQueueList
            cart={cart}
            totalLines={totalLines}
            compact
            onEdit={(tempId) => {
              editRow(tempId);
              setShowQueueDialog(false);
            }}
            onRemove={removeRow}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setCart([]);
              setShowQueueDialog(false);
            }}
            disabled={saving || cart.length === 0}
          >
            Clear list
          </Button>
          <Button
            type="button"
            onClick={() => {
              setShowQueueDialog(false);
              saveAll();
            }}
            disabled={saving || cart.length === 0}
          >
            {saving ? "Saving..." : `Save all (${totalLines})`}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={showCatModal} onClose={() => !savingCat && setShowCatModal(false)} title="Add New Category">
        <div className="space-y-4">
          <div>
            <label htmlFor="bulkadditems-category-name" className="block text-sm font-medium text-slate-700 mb-1">Category Name</label>
            <input id="bulkadditems-category-name"
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className={fieldClass}
              placeholder="e.g. Beverages"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCatModal(false)} disabled={savingCat}>
              Cancel
            </Button>
            <Button type="button" onClick={submitNewCategory} disabled={savingCat}>
              {savingCat ? "Saving..." : "Save Category"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showSubCatModal} onClose={() => !savingSubCat && setShowSubCatModal(false)} title="Add New Sub-Category">
        <div className="space-y-4">
          <div>
            <label htmlFor="bulkadditems-sub-category-name" className="block text-sm font-medium text-slate-700 mb-1">Sub-Category Name</label>
            <input id="bulkadditems-sub-category-name"
              type="text"
              value={newSubCatName}
              onChange={(e) => setNewSubCatName(e.target.value)}
              className={fieldClass}
              placeholder="e.g. Soft Drinks"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowSubCatModal(false)} disabled={savingSubCat}>
              Cancel
            </Button>
            <Button type="button" onClick={submitNewSubCategory} disabled={savingSubCat}>
              {savingSubCat ? "Saving..." : "Save Sub-Category"}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
