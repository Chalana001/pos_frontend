import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";

import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import CustomSelect from "../components/common/CustomSelect";
import SearchSelect from "../components/common/SearchSelect";

import { itemsAPI } from "../api/items.api";
import { categoriesAPI } from "../api/categories.api";
import { useBranch } from "../context/BranchContext";
import { useAuth } from "../context/AuthContext";
import { useAppConfiguration } from "../context/AppConfigurationContext";
import { ItemType, ItemTypeLabels, OVERHEAD_COST_MODES } from "../utils/constants";

import { ChevronDown, ChevronRight, Plus, X, Image as ImageIcon, ChefHat, Search, Trash2, ArrowLeft } from "lucide-react";

const fieldClass = "h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500";
const helperClass = "mt-1 text-xs leading-5 text-slate-500";

const Section = ({ title, description, open, onToggle, right, children }) => {
  const contentId = `item-section-${String(title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
  return (
    <section className="border-b border-slate-200 last:border-b-0">
      <div className="flex items-start justify-between gap-4 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 id={`${contentId}-heading`} className="text-base font-semibold text-slate-900 sm:text-lg">{title}</h2>
          {description && <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-0.5 text-slate-500">
          {right}
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={contentId}
            aria-labelledby={`${contentId}-heading`}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
      </div>
      {open && <div id={contentId} className="page-section-enter px-4 pb-5 sm:px-5">{children}</div>}
    </section>
  );
};

const ToggleRow = ({ label, description, checked, onChange, disabled = false, stateLabel }) => {
  const active = checked && !disabled;
  return (
    <div className={`flex items-start justify-between gap-4 py-1 ${disabled ? "opacity-60" : ""}`}>
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
  defaultSellingPrice: "",
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

const priceUnitLabel = (itemType) => {
  if (itemType === ItemType.WEIGHT) return "(per 1 KG)";
  if (itemType === ItemType.VOLUME) return "(per 1 L)";
  return "";
};

const ItemFormPage = ({ mode }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { branches: availableBranches } = useBranch();
  const { user } = useAuth();
  const { configuration } = useAppConfiguration();
  const singleCategoryMode = configuration?.categoryMode === "SINGLE_CATEGORY";
  const kotEnabled = configuration?.kotEnabled !== false;
  const allowedItemTypeOptions = useMemo(
    () => getAllowedItemTypeOptions(user?.planName, configuration),
    [configuration, user?.planName]
  );

  const [submitting, setSubmitting] = useState(false);
  const [loadingItem, setLoadingItem] = useState(false);

  const [secGeneral, setSecGeneral] = useState(true);
  const [secPricing, setSecPricing] = useState(true);
  const [secProcessing, setSecProcessing] = useState(false);
  const [secRecipe, setSecRecipe] = useState(true);
  const [secLabels, setSecLabels] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    altName: "",
    barcode: "",
    categoryId: "",
    subCategoryId: "",
    costPrice: "",
    sellingPrice: "",
    reorderLevel: "",
    imageUrl: "",
    itemType: ItemType.NORMAL,
    defaultUnit: "PCS",
    isKotEnabled: false,
    ingredients: [],
    branchIds: [],
    active: true,
    posVisible: true,
    overheadCostMode: OVERHEAD_COST_MODES.NONE,
    overheadCostValue: "",
    stockProcessingEnabled: false,
    processingOutputs: [],
  });

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

  const branches = useMemo(
    () => availableBranches.filter((branch) => Number(branch.id) !== 0),
    [availableBranches]
  );

  const [imgError, setImgError] = useState(false);
  const [labels, setLabels] = useState([]);
  const [labelInput, setLabelInput] = useState("");

  useEffect(() => {
    loadCategories();
  }, [singleCategoryMode]);

  useEffect(() => {
    if (mode !== "create") return;
    if (allowedItemTypeOptions.some((option) => option.value === formData.itemType)) return;

    setFormData((prev) => ({
      ...prev,
      itemType: ItemType.NORMAL,
      defaultUnit: "PCS",
      isKotEnabled: false,
      ingredients: [],
      branchIds: [],
      overheadCostMode: OVERHEAD_COST_MODES.NONE,
      overheadCostValue: "",
    }));
  }, [allowedItemTypeOptions, formData.itemType, mode]);

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

  useEffect(() => {
    const load = async () => {
      if (mode !== "edit") return;
      setLoadingItem(true);
      try {
        const res = await itemsAPI.getById(id);
        const item = res.data;

        setFormData({
          name: item.name ?? "",
          altName: item.altName ?? "",
          barcode: item.barcode ?? "",
          categoryId: singleCategoryMode ? item.subCategoryId ?? "" : item.categoryId ?? "",
          subCategoryId: item.subCategoryId ?? "",
          costPrice: item.costPrice ?? "",
          sellingPrice: item.sellingPrice ?? "",
          reorderLevel: item.reorderLevel ?? "",
          imageUrl: item.imageUrl ?? "",
          itemType: item.itemType || ItemType.NORMAL,
          defaultUnit: item.defaultUnit ?? "PCS",
          isKotEnabled: item.isKotEnabled ?? false,
          ingredients: Array.isArray(item.ingredients)
            ? item.ingredients.map((ingredient) => ({
                ingredientItemId: ingredient.ingredientItemId,
                ingredientName: ingredient.ingredientName || "",
                ingredientBarcode: ingredient.ingredientBarcode || "",
                quantity: ingredient.quantity ?? "",
                qtyUnit: ingredient.qtyUnit || "PCS",
                search: ingredient.ingredientName || "",
              }))
            : [],
          branchIds: item.branchIds ?? [],
          active: item.active ?? true,
          posVisible: item.posVisible ?? true,
          overheadCostMode: item.overheadCostMode || OVERHEAD_COST_MODES.NONE,
          overheadCostValue: item.overheadCostValue ?? "",
          stockProcessingEnabled: item.stockProcessingEnabled ?? false,
          processingOutputs: Array.isArray(item.processingOutputs)
            ? item.processingOutputs.map((output) => ({
                outputItemId: output.outputItemId,
                outputName: output.outputName || "",
                outputBarcode: output.outputBarcode || "",
                itemType: output.itemType || "",
                defaultUnit: output.defaultUnit || "PCS",
                defaultQty: output.defaultQty ?? "",
                defaultQtyUnit: output.defaultQtyUnit || "PCS",
                defaultSellingPrice: output.defaultSellingPrice ?? "",
                waste: !!output.waste,
                search: output.outputName || "",
              }))
            : [],
        });

        if (!singleCategoryMode && item.categoryId) {
          loadSubCategories(item.categoryId);
        }
      } catch {
        toast.error("Failed to load item");
        navigate("/items");
      } finally {
        setLoadingItem(false);
      }
    };
    load();
  }, [mode, id, navigate, singleCategoryMode]);

  const handleCategoryChange = (catId) => {
    if (singleCategoryMode) {
      setFormData((prev) => ({ ...prev, categoryId: catId, subCategoryId: catId }));
      return;
    }
    setFormData((prev) => ({ ...prev, categoryId: catId, subCategoryId: "" }));
    loadSubCategories(catId);
  };

  const toggleBranchId = (branchId) => {
    setFormData((prev) => ({
      ...prev,
      branchIds: prev.branchIds.includes(branchId)
        ? prev.branchIds.filter((branchValue) => branchValue !== branchId)
        : [...prev.branchIds, branchId],
    }));
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

    setSavingSubCat(true);
    try {
      const res = await categoriesAPI.createSubCategory({
        name: newSubCatName.trim(),
        categoryId: formData.categoryId,
      });
      toast.success("Sub-category created!");
      await loadSubCategories(formData.categoryId);
      setFormData((prev) => ({ ...prev, subCategoryId: res.data.id }));

      setShowSubCatModal(false);
      setNewSubCatName("");
    } catch (e) {
      toast.error("Failed to create sub-category");
    } finally {
      setSavingSubCat(false);
    }
  };

  const addIngredientRow = () => {
    setFormData((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, buildEmptyIngredient()],
    }));
  };

  const updateIngredient = (index, field, value) => {
    setFormData((prev) => {
      const nextIngredients = [...prev.ingredients];
      const nextRow = { ...nextIngredients[index], [field]: value };

      nextIngredients[index] = nextRow;
      return {
        ...prev,
        ingredients: nextIngredients,
      };
    });
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

  const searchIngredientItems = async (index, query) => {
    setFormData((prev) => {
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
          item.active !== false &&
          Number(item.id) !== Number(id)
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
    setFormData((prev) => {
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

    const searchValue = formData.ingredients[index]?.search?.trim();
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
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, ingredientIndex) => ingredientIndex !== index),
    }));
  };

  const isStockTrackedFormItem = [ItemType.NORMAL, ItemType.WEIGHT, ItemType.VOLUME].includes(formData.itemType);

  const addProcessingOutputRow = () => {
    setFormData((prev) => ({
      ...prev,
      processingOutputs: [...prev.processingOutputs, buildEmptyProcessingOutput()],
    }));
  };

  const updateProcessingOutput = (index, field, value) => {
    setFormData((prev) => {
      const nextOutputs = [...prev.processingOutputs];
      nextOutputs[index] = { ...nextOutputs[index], [field]: value };
      return { ...prev, processingOutputs: nextOutputs };
    });
  };

  const clearProcessingOutputSearchResults = (index) => {
    setProcessingOutputSearchResults((prev) => {
      if (!prev[index]) return prev;
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const searchProcessingOutputItems = async (index, query) => {
    setFormData((prev) => {
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
      return { ...prev, processingOutputs: nextOutputs };
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
        formData.processingOutputs
          .map((output, outputIndex) => outputIndex === index ? null : Number(output.outputItemId))
          .filter(Boolean)
      );
      const filteredItems = itemsArray.filter(
        (item) =>
          [ItemType.NORMAL, ItemType.WEIGHT, ItemType.VOLUME].includes(item.itemType) &&
          item.active !== false &&
          Number(item.id) !== Number(id) &&
          !selectedIds.has(Number(item.id))
      );

      if (processingOutputSearchRequestRef.current[index] !== requestId) return;
      setProcessingOutputSearchResults((prev) => ({
        ...prev,
        [index]: { loading: false, items: filteredItems },
      }));
    } catch {
      if (processingOutputSearchRequestRef.current[index] !== requestId) return;
      setProcessingOutputSearchResults((prev) => ({
        ...prev,
        [index]: { loading: false, items: [] },
      }));
    }
  };

  const selectProcessingOutputForRow = (index, item) => {
    const defaultQtyUnit = item.itemType === ItemType.WEIGHT ? "KG" : item.itemType === ItemType.VOLUME ? "L" : (item.defaultUnit || "PCS");
    setFormData((prev) => {
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
      return { ...prev, processingOutputs: nextOutputs };
    });
    clearProcessingOutputSearchResults(index);
  };

  const handleProcessingOutputSearchKeyDown = (index, event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const searchValue = formData.processingOutputs[index]?.search?.trim();
    const resultItems = processingOutputSearchResults[index]?.items || [];
    if (!searchValue || resultItems.length === 0) {
      toast.error("Output item not found");
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
    setFormData((prev) => ({
      ...prev,
      processingOutputs: prev.processingOutputs.filter((_, outputIndex) => outputIndex !== index),
    }));
  };

  const getItemValidationError = () => {
    if (!formData.name.trim() || !formData.subCategoryId) {
      return { message: `Please fill required fields (Name, ${singleCategoryMode ? "Category" : "Sub Category"})`, section: "general" };
    }

    if (formData.itemType === ItemType.SERVICE && formData.branchIds.length === 0) {
      return { message: "Select at least one branch for the service", section: "general" };
    }

    const recipeIngredientRows = getRecipeIngredientRows(formData.ingredients);
    if (
      formData.itemType === ItemType.RECIPE &&
      recipeIngredientRows.some((ingredient) => !ingredient.ingredientItemId || Number(ingredient.quantity || 0) <= 0)
    ) {
      return { message: "Select each ingredient from search and enter a valid quantity", section: "recipe" };
    }

    if (
      formData.itemType === ItemType.RECIPE &&
      formData.overheadCostMode !== OVERHEAD_COST_MODES.NONE &&
      Number(formData.overheadCostValue || 0) <= 0
    ) {
      return { message: "Enter a valid recipe overhead value", section: "pricing" };
    }

    if (
      isStockTrackedFormItem &&
      formData.stockProcessingEnabled &&
      formData.processingOutputs.some((output) => !output.outputItemId)
    ) {
      return { message: "Select each stock processing output from search", section: "processing" };
    }

    if (
      isStockTrackedFormItem &&
      formData.stockProcessingEnabled &&
      formData.processingOutputs.some((output) => Number(output.defaultQty || 0) <= 0)
    ) {
      return { message: "Enter a valid default quantity for each stock processing output", section: "processing" };
    }

    return null;
  };

  const submitItem = async () => {
    const validationError = getItemValidationError();
    if (validationError) {
      toast.error(validationError.message);
      if (validationError.section === "general") setSecGeneral(true);
      if (validationError.section === "pricing") setSecPricing(true);
      if (validationError.section === "processing") setSecProcessing(true);
      if (validationError.section === "recipe") setSecRecipe(true);
      return;
    }

    const recipeIngredientRows = getRecipeIngredientRows(formData.ingredients);
    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        altName: formData.altName?.trim() || null,
        barcode: formData.barcode.trim(),
        subCategoryId: Number(formData.subCategoryId),
        costPrice: Number(formData.costPrice || 0),
        sellingPrice: Number(formData.sellingPrice || 0),
        reorderLevel: formData.itemType === ItemType.SERVICE || formData.itemType === ItemType.RECIPE
          ? 0
          : Number(formData.reorderLevel || 0),
        imageUrl: formData.imageUrl?.trim() || null,
        itemType: formData.itemType,
        isKotEnabled: formData.itemType === ItemType.RECIPE
          ? (kotEnabled ? !!formData.isKotEnabled : undefined)
          : false,
        ingredients: formData.itemType === ItemType.RECIPE
          ? recipeIngredientRows.map((ingredient) => ({
              ingredientItemId: Number(ingredient.ingredientItemId),
              quantity: Number(ingredient.quantity || 0),
              qtyUnit: ingredient.qtyUnit,
            }))
          : [],
        defaultUnit:
          formData.itemType === ItemType.WEIGHT || formData.itemType === ItemType.VOLUME
            ? formData.defaultUnit
            : formData.itemType === ItemType.SERVICE
              ? "SERVICE"
              : "PCS",
        active: formData.active,
        posVisible: formData.posVisible,
        overheadCostMode: formData.itemType === ItemType.RECIPE ? formData.overheadCostMode : OVERHEAD_COST_MODES.NONE,
        overheadCostValue:
          formData.itemType === ItemType.RECIPE && formData.overheadCostMode !== OVERHEAD_COST_MODES.NONE
            ? Number(formData.overheadCostValue || 0)
            : 0,
        stockProcessingEnabled: isStockTrackedFormItem ? !!formData.stockProcessingEnabled : false,
        processingOutputs: isStockTrackedFormItem && formData.stockProcessingEnabled
          ? formData.processingOutputs.map((output) => ({
              outputItemId: Number(output.outputItemId),
              defaultQty: Number(output.defaultQty),
              defaultSellingPrice: output.waste || !output.defaultSellingPrice ? null : Number(output.defaultSellingPrice),
              waste: !!output.waste,
            }))
          : [],
        ...(formData.itemType === ItemType.SERVICE ? { branchIds: formData.branchIds } : {}),
      };

      if (mode === "edit") {
        await itemsAPI.update(id, payload);
        toast.success("Item updated");
      } else {
        await itemsAPI.create(payload);
        toast.success("Item created");
      }
      navigate("/items");
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const addLabel = () => {
    const value = labelInput.trim();
    if (!value) return;
    if (labels.includes(value)) return setLabelInput("");
    setLabels((prev) => [...prev, value]);
    setLabelInput("");
  };

  const removeLabel = (value) => setLabels((prev) => prev.filter((label) => label !== value));

return (
    <div className="page-enter -mx-2 pb-24 sm:mx-0 xl:pb-2">
      <div className="page-section-enter flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between" style={{ animationDelay: "80ms" }}>
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <button type="button" onClick={() => navigate("/items")} className="inline-flex items-center gap-1 rounded transition-colors hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-accent">
              <ArrowLeft size={14} aria-hidden="true" />
              Items
            </button>
            <span aria-hidden="true">/</span>
            <span className="text-slate-700">{mode === "edit" ? "Edit Item" : "Add New Item"}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {mode === "edit" ? "Edit Item" : "Add New Item"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "edit" ? "Update this item without losing its sales and stock history." : "Create a product, service, or recipe for this shop."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            Required fields marked *
          </span>
          <Button type="button" variant="secondary" onClick={() => navigate("/items")} disabled={submitting} className="hidden sm:inline-flex">
            Cancel
          </Button>
        </div>
      </div>

      {loadingItem ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
          Loading item...
        </div>
      ) : (
        <div className="sales-panel-enter mt-6 grid grid-cols-1 rounded-xl border border-slate-200 bg-white xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start xl:gap-6 xl:rounded-none xl:border-0 xl:bg-transparent" style={{ animationDelay: "130ms" }}>
          <div className="contents xl:block xl:min-w-0 xl:overflow-hidden xl:rounded-xl xl:border xl:border-slate-200 xl:bg-white">
            <div className="order-1">
              <Section
                title="General Information"
                description="Primary name, identifiers, and catalog classification."
                open={secGeneral}
                onToggle={() => setSecGeneral((value) => !value)}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label htmlFor="itemformpage-item-name" className="mb-1 block text-[13px] font-semibold text-slate-700">Item Name *</label>
                    <input id="itemformpage-item-name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={fieldClass}
                      placeholder="e.g. Ceylon Black Tea 250g"
                    />
                    <p className={helperClass}>Shown on POS tiles and customer receipts.</p>
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="itemformpage-alt-name-sinhala-used-on-receipts-when-t" className="mb-1 block text-[13px] font-semibold text-slate-700">
                      Alternate Name (Sinhala)
                    </label>
                    <input id="itemformpage-alt-name-sinhala-used-on-receipts-when-t"
                      type="text"
                      value={formData.altName}
                      onChange={(e) => setFormData({ ...formData, altName: e.target.value })}
                      className={fieldClass}
                      placeholder="Optional Sinhala name"
                    />
                    <p className={helperClass}>Used on receipts when the receipt name source is set to Alternate Name.</p>
                  </div>

                  <div>
                    <label htmlFor="itemformpage-barcode" className="mb-1 block text-[13px] font-semibold text-slate-700">Barcode</label>
                    <input id="itemformpage-barcode"
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      className={`${fieldClass} font-mono tabular-nums`}
                      placeholder="Scan or enter barcode"
                    />
                    <p className={helperClass}>Leave blank to generate automatically.</p>
                  </div>

                  <div>
                    <label className="mb-1 block text-[13px] font-semibold text-slate-700">Item Type</label>
                    <CustomSelect
                      value={formData.itemType}
                      onChange={(value) => {
                        setFormData({
                          ...formData,
                          itemType: value,
                          defaultUnit: value === ItemType.WEIGHT ? "KG" : value === ItemType.VOLUME ? "L" : value === ItemType.SERVICE ? "SERVICE" : "PCS",
                          isKotEnabled: value === ItemType.RECIPE ? formData.isKotEnabled : false,
                          ingredients: value === ItemType.RECIPE ? formData.ingredients : [],
                          overheadCostMode: value === ItemType.RECIPE ? formData.overheadCostMode : OVERHEAD_COST_MODES.NONE,
                          overheadCostValue: value === ItemType.RECIPE ? formData.overheadCostValue : "",
                          branchIds: value === ItemType.SERVICE ? formData.branchIds : [],
                          stockProcessingEnabled: [ItemType.NORMAL, ItemType.WEIGHT, ItemType.VOLUME].includes(value)
                            ? formData.stockProcessingEnabled
                            : false,
                          processingOutputs: [ItemType.NORMAL, ItemType.WEIGHT, ItemType.VOLUME].includes(value)
                            ? formData.processingOutputs
                            : [],
                        });
                      }}
                      options={allowedItemTypeOptions}
                      valueKey="value"
                      labelKey="label"
                      buttonClassName="h-11 rounded-lg px-3 text-sm"
                    />
                    <p className={helperClass}>Controls unit and available item capabilities.</p>
                  </div>

                  {(formData.itemType === ItemType.WEIGHT || formData.itemType === ItemType.VOLUME) && (
                    <div>
                      <label className="mb-1 block text-[13px] font-semibold text-slate-700">Default Unit</label>
                      <CustomSelect
                        value={formData.defaultUnit}
                        onChange={(value) => setFormData({ ...formData, defaultUnit: value })}
                        options={formData.itemType === ItemType.VOLUME ? volumeUnitOptions : weightUnitOptions}
                        valueKey="value"
                        labelKey="label"
                        buttonClassName="h-11 rounded-lg px-3 text-sm"
                      />
                    </div>
                  )}

                  <div className="relative z-20">
                    <label className="mb-1 block text-[13px] font-semibold text-slate-700">Category *</label>
                    <div className="flex gap-2">
                      <SearchSelect
                        value={singleCategoryMode ? formData.subCategoryId : formData.categoryId}
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
                      <Button type="button" variant="secondary" onClick={() => setShowCatModal(true)} className="h-11 shrink-0 px-3" aria-label="Add category">
                        <Plus size={18} />
                      </Button>
                    </div>
                  </div>

                  {!singleCategoryMode && (
                    <div className="relative z-10">
                      <label className="mb-1 block text-[13px] font-semibold text-slate-700">Sub Category *</label>
                      <div className="flex gap-2">
                        <SearchSelect
                          value={formData.subCategoryId}
                          onChange={(value) => setFormData({ ...formData, subCategoryId: value })}
                          options={subCategories}
                          placeholder="Select Sub Category"
                          searchPlaceholder="Type sub-category name…"
                          noResultsMessage="No sub-category matches that"
                          emptyMessage="No sub-categories for this category"
                          menuMinWidth={260}
                          onOpen={() => loadSubCategories(formData.categoryId)}
                          disabled={!formData.categoryId}
                          inputClassName="h-11 text-sm"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setShowSubCatModal(true)}
                          className="h-11 shrink-0 px-3"
                          disabled={!formData.categoryId}
                          aria-label="Add sub category"
                        >
                          <Plus size={18} />
                        </Button>
                      </div>
                    </div>
                  )}

                  {formData.itemType === ItemType.SERVICE && (
                    <div className="md:col-span-2 border-t border-slate-200 pt-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <label className="block text-[13px] font-semibold text-slate-700">Available Branches *</label>
                          <p className={helperClass}>This service is visible in POS only for selected branches.</p>
                        </div>
                        <span className="shrink-0 text-xs font-medium text-slate-500">{formData.branchIds.length} selected</span>
                      </div>

                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {branches.map((branch) => {
                          const checked = formData.branchIds.includes(branch.id);
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
                                onChange={() => toggleBranchId(branch.id)}
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
              </Section>
            </div>

            <div className="order-3">
              <Section
                title="Pricing & Stock"
                description="Commercial price and the low-stock threshold for this item."
                open={secPricing}
                onToggle={() => setSecPricing((value) => !value)}
              >
                <div className="grid grid-cols-2 gap-2 min-[370px]:grid-cols-3 sm:gap-4">
                  <div>
                    <label htmlFor="itemformpage-cost-price" className="mb-1 flex h-8 items-end text-[12px] font-semibold leading-4 text-slate-700 sm:text-[13px]">
                      <span>Cost Price {priceUnitLabel(formData.itemType)}</span>
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-500 sm:left-3 sm:text-xs">LKR</span>
                      <input id="itemformpage-cost-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.costPrice}
                        onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                        className={`${fieldClass} pl-9 pr-2 text-right tabular-nums sm:pl-12 sm:pr-3`}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="itemformpage-selling-price" className="mb-1 flex h-8 items-end text-[12px] font-semibold leading-4 text-slate-700 sm:text-[13px]">
                      <span>Selling Price {priceUnitLabel(formData.itemType)}</span>
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-500 sm:left-3 sm:text-xs">LKR</span>
                      <input id="itemformpage-selling-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.sellingPrice}
                        onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                        className={`${fieldClass} pl-9 pr-2 text-right font-semibold tabular-nums sm:pl-12 sm:pr-3`}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="itemformpage-reorder-level" className="mb-1 flex h-8 items-end text-[12px] font-semibold leading-4 text-slate-700 sm:text-[13px]">Reorder Level</label>
                    <input id="itemformpage-reorder-level"
                      type="number"
                      min="0"
                      value={formData.itemType === ItemType.SERVICE || formData.itemType === ItemType.RECIPE ? "0" : formData.reorderLevel}
                      onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                      disabled={formData.itemType === ItemType.SERVICE || formData.itemType === ItemType.RECIPE}
                      className={`${fieldClass} px-2 text-right tabular-nums sm:px-3`}
                      placeholder="0"
                    />
                  </div>
                </div>

                <p className={`${helperClass} mt-2`}>
                  {formData.itemType === ItemType.SERVICE || formData.itemType === ItemType.RECIPE
                    ? "Reorder Level is not used for service or recipe items."
                    : "Reorder Level warns when available stock reaches that quantity."}
                </p>

                {formData.itemType === ItemType.RECIPE && (
                  <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-200 pt-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-[13px] font-semibold text-slate-700">Recipe Overhead</label>
                      <CustomSelect
                        value={formData.overheadCostMode}
                        onChange={(value) => setFormData((prev) => ({
                          ...prev,
                          overheadCostMode: value,
                          overheadCostValue: value === OVERHEAD_COST_MODES.NONE ? "" : prev.overheadCostValue,
                        }))}
                        options={[
                          { value: OVERHEAD_COST_MODES.NONE, label: "None" },
                          { value: OVERHEAD_COST_MODES.FIXED, label: "Fixed Amount" },
                          { value: OVERHEAD_COST_MODES.PERCENT, label: "Percent" },
                        ]}
                        valueKey="value"
                        labelKey="label"
                        buttonClassName="h-11 rounded-lg px-3 text-sm"
                      />
                      <p className={helperClass}>For oil, spice, gas, packing, or untracked kitchen overhead.</p>
                    </div>

                    <div>
                      <label htmlFor="itemformpage-overhead-cost" className="mb-1 block text-[13px] font-semibold text-slate-700">
                        {formData.overheadCostMode === OVERHEAD_COST_MODES.PERCENT ? "Overhead Percent" : "Overhead Amount"}
                        {formData.overheadCostMode !== OVERHEAD_COST_MODES.NONE && <span className="ml-1 text-accent">*</span>}
                      </label>
                      <div className="grid grid-cols-[minmax(0,1fr)_64px] gap-2">
                        <input id="itemformpage-overhead-cost"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.overheadCostValue}
                          onChange={(e) => setFormData((prev) => ({ ...prev, overheadCostValue: e.target.value }))}
                          disabled={formData.overheadCostMode === OVERHEAD_COST_MODES.NONE}
                          className={`${fieldClass} text-right tabular-nums`}
                        />
                        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-600">
                          {formData.overheadCostMode === OVERHEAD_COST_MODES.PERCENT ? "%" : "LKR"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Section>
            </div>

            {isStockTrackedFormItem && (
              <div className="order-4">
                <Section
                  title="Stock Processing"
                  description="Optional. Use this stock item as a source for linked output items."
                  open={secProcessing}
                  onToggle={() => setSecProcessing((value) => !value)}
                >
                  <div className="space-y-4">
                    <ToggleRow
                      label="Enable as processing source"
                      description="Cut or convert this item into linked stock items."
                      checked={!!formData.stockProcessingEnabled}
                      stateLabel={formData.stockProcessingEnabled ? "On" : "Off"}
                      onChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          stockProcessingEnabled: checked,
                          processingOutputs: checked && prev.processingOutputs.length === 0
                            ? [buildEmptyProcessingOutput()]
                            : prev.processingOutputs,
                        }))
                      }
                    />

                    {formData.stockProcessingEnabled && (
                      <div className="space-y-3 border-t border-slate-200 pt-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-sm leading-6 text-slate-500">
                            Link the items produced from this source. Waste rows are tracked in processing history without adding sellable stock.
                          </p>
                          <Button type="button" onClick={addProcessingOutputRow} className="shrink-0">
                            <Plus size={16} className="mr-2" />
                            Add Output
                          </Button>
                        </div>

                        {formData.processingOutputs.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                            No output items linked yet.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {formData.processingOutputs.map((output, index) => (
                              <div
                                key={`${output.outputItemId || "new"}-${index}`}
                                className={`relative grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_140px_130px_120px_52px] ${
                                  processingOutputSearchResults[index]?.loading || (processingOutputSearchResults[index]?.items || []).length > 0 ? "z-50" : "z-0"
                                }`}
                              >
                                <div>
                                  <label className="mb-1 block text-[13px] font-semibold text-slate-700">Output Item <span className="text-accent">*</span></label>
                                  <div className="relative">
                                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input aria-label={`Output item ${index + 1}`}
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
                                    <input aria-label={`Default quantity for output ${index + 1}`}
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

                                <div>
                                  <label htmlFor={`itemformpage-default-sell-price-${index}`} className="mb-1 block text-[13px] font-semibold text-slate-700">Default Sell Price</label>
                                  <input id={`itemformpage-default-sell-price-${index}`}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={output.defaultSellingPrice}
                                    onChange={(e) => updateProcessingOutput(index, "defaultSellingPrice", e.target.value)}
                                    disabled={!!output.waste}
                                    className={`${fieldClass} text-right tabular-nums`}
                                    placeholder="Item price"
                                  />
                                </div>

                                <label className="flex min-h-11 items-end gap-2 pb-2 text-sm font-medium text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={!!output.waste}
                                    onChange={(e) => updateProcessingOutput(index, "waste", e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent"
                                  />
                                  Waste
                                </label>

                                <div className="flex items-end">
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
                </Section>
              </div>
            )}

            {formData.itemType === ItemType.RECIPE && (
              <div className="order-4">
                <Section
                  title="Recipe Ingredients"
                  description="Optional. Stock items deducted when this recipe is sold."
                  open={secRecipe}
                  onToggle={() => setSecRecipe((value) => !value)}
                  right={<ChefHat size={18} className="text-danger" />}
                >
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm leading-6 text-slate-500">
                        Select the stock items that should be deducted when this food item is sold.
                      </p>
                      <Button type="button" onClick={addIngredientRow} className="shrink-0">
                        <Plus size={16} className="mr-2" />
                        Add Ingredient
                      </Button>
                    </div>

                    {formData.ingredients.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                        No ingredients added yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {formData.ingredients.map((ingredient, index) => (
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
                                <input aria-label={`Ingredient ${index + 1}`}
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
                              <input aria-label={`Quantity for ingredient ${index + 1}`}
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
                </Section>
              </div>
            )}

            <div className="order-4">
              <Section
                title="Labels & Certificates"
                description="Optional. Add free-text labels used by this shop."
                open={secLabels}
                onToggle={() => setSecLabels((value) => !value)}
              >
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input aria-label="Add label"
                      type="text"
                      value={labelInput}
                      onChange={(e) => setLabelInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addLabel();
                        }
                      }}
                      className={`${fieldClass} flex-1`}
                      placeholder="Add label"
                    />
                    <Button type="button" onClick={addLabel} className="shrink-0">
                      <Plus size={18} className="mr-2" /> Add
                    </Button>
                  </div>
                  {labels.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {labels.map((label) => (
                        <div key={label} className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                          {label}
                          <button type="button" onClick={() => removeLabel(label)} className="text-slate-500 hover:text-slate-900" aria-label={`Remove ${label}`}>
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Section>
            </div>
          </div>

          <aside className="contents xl:sticky xl:top-0 xl:block xl:self-start xl:space-y-4">
            <section className="order-2 border-b border-slate-200 px-4 py-5 sm:px-5 xl:rounded-xl xl:border xl:border-slate-200 xl:bg-white" aria-labelledby="item-image-heading">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="item-image-heading" className="text-base font-semibold text-slate-900 sm:text-lg">Product Image</h2>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">Paste an image URL and confirm the preview.</p>
                </div>
                <ImageIcon size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
              </div>

              <div className="mt-4 overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50">
                <div className="flex aspect-[4/3] items-center justify-center">
                  {formData.imageUrl && !imgError ? (
                    <img
                      src={formData.imageUrl}
                      alt="Product preview"
                      className="h-full w-full object-cover"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <div className="px-4 text-center text-sm text-slate-500">
                      <ImageIcon size={24} className="mx-auto mb-2 text-slate-400" aria-hidden="true" />
                      {imgError ? "Invalid image URL" : "Image preview"}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3">
                <label htmlFor="itemformpage-image-url" className="mb-1 block text-[13px] font-semibold text-slate-700">Image URL</label>
                <input id="itemformpage-image-url"
                  type="text"
                  value={formData.imageUrl}
                  onChange={(e) => {
                    setFormData({ ...formData, imageUrl: e.target.value });
                    setImgError(false);
                  }}
                  className={fieldClass}
                  placeholder="https://..."
                />
                <p className={helperClass}>Preview updates instantly.</p>
              </div>
            </section>

            <section className="order-5 border-b border-slate-200 px-4 py-5 sm:px-5 xl:rounded-xl xl:border xl:border-slate-200 xl:bg-white" aria-labelledby="item-status-heading">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 id="item-status-heading" className="text-base font-semibold text-slate-900 sm:text-lg">Visibility & Status</h2>
                  <p className="mt-0.5 text-xs leading-5 text-slate-500">Control where this item is available.</p>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  {formData.active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="space-y-4 divide-y divide-slate-200">
                <ToggleRow
                  label="Show in POS"
                  description="Turn this off for ingredient-only stock items used in recipes."
                  checked={!!formData.posVisible}
                  stateLabel={formData.posVisible ? "Visible" : "Hidden"}
                  onChange={(checked) => setFormData({ ...formData, posVisible: checked })}
                />
                <div className="pt-4">
                  <ToggleRow
                    label="Item active"
                    description="Turn this off to deactivate the item without deleting its history."
                    checked={!!formData.active}
                    stateLabel={formData.active ? "Active" : "Inactive"}
                    onChange={(checked) => setFormData({ ...formData, active: checked })}
                  />
                  {!formData.active && (
                    <div className="mt-3 rounded-lg border border-danger-border bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
                      This item will be deactivated after saving.
                    </div>
                  )}
                </div>
                {formData.itemType === ItemType.RECIPE && (
                  <div className="pt-4">
                    <ToggleRow
                      label="Send to Kitchen (KOT)"
                      description={kotEnabled ? "Print a kitchen ticket when this recipe is sold." : "KOT is disabled in App Configuration."}
                      checked={kotEnabled && !!formData.isKotEnabled}
                      disabled={!kotEnabled}
                      stateLabel={!kotEnabled ? "Unavailable" : (formData.isKotEnabled ? "On" : "Off")}
                      onChange={(checked) => setFormData({ ...formData, isKotEnabled: checked })}
                    />
                  </div>
                )}
              </div>
            </section>

            <div className="hidden xl:block">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-slate-500">
                    {getItemValidationError() ? "Complete the required fields" : "Ready to save"}
                  </span>
                  <span className="text-slate-400">*</span>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" onClick={() => navigate("/items")} disabled={submitting} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="button" onClick={submitItem} disabled={submitting} className="flex-[2]">
                    {submitting ? "Saving..." : "Save Item"}
                  </Button>
                </div>
              </div>
            </div>
          </aside>

          </div>
      )}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur xl:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
        <div className="mx-auto flex max-w-3xl gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate("/items")} disabled={submitting} className="flex-1">
            Cancel
          </Button>
          <Button type="button" onClick={submitItem} disabled={submitting} className="flex-[2]">
            {submitting ? "Saving..." : "Save Item"}
          </Button>
        </div>
      </div>
      <Modal isOpen={showCatModal} onClose={() => !savingCat && setShowCatModal(false)} title="Add New Category">
        <div className="space-y-4">
          <div>
            <label htmlFor="itemformpage-new-category-name" className="block text-sm font-medium text-slate-700 mb-1">Category Name</label>
            <input id="itemformpage-new-category-name"
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
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
            <label htmlFor="itemformpage-sub-category-name" className="block text-sm font-medium text-slate-700 mb-1">Sub-Category Name</label>
            <input id="itemformpage-sub-category-name"
              type="text"
              value={newSubCatName}
              onChange={(e) => setNewSubCatName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
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
};

export default ItemFormPage;
