import React, { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal"; 
import CustomSelect from "../components/common/CustomSelect"; 
import AccordionSection from "../components/items/BulkItemForm";
import { itemsAPI } from "../api/items.api";
import { categoriesAPI } from "../api/categories.api"; 
import { useBranch } from "../context/BranchContext";
import { useAuth } from "../context/AuthContext";
import { useAppConfiguration } from "../context/AppConfigurationContext";
import { Plus, Search, Trash2 } from "lucide-react";
import { ItemType, ItemTypeLabels, OVERHEAD_COST_MODES } from "../utils/constants"; // 🟢 Constant එක Import කළා

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

const emptyDraft = () => ({
  imageUrl: "",
  name: "",
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

  const [openImage, setOpenImage] = useState(true);
  const [openGeneral, setOpenGeneral] = useState(true);
  const [openProcessing, setOpenProcessing] = useState(true);
  const [openRecipe, setOpenRecipe] = useState(true);

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

  const generalFilledCount = useMemo(() => {
    let c = 0;
    if (draft.name.trim()) c++;
    if (String(draft.categoryId).trim()) c++;
    if (!singleCategoryMode && String(draft.subCategoryId).trim()) c++;
    if (String(draft.costPrice).trim()) c++;
    if (String(draft.sellingPrice).trim()) c++;
    if (
      String(draft.reorderLevel).trim() &&
      draft.itemType !== ItemType.SERVICE &&
      draft.itemType !== ItemType.RECIPE
    ) c++;
    return c;
  }, [draft, singleCategoryMode]);

  const generalBadge = `${generalFilledCount}/${
    draft.itemType === ItemType.SERVICE || draft.itemType === ItemType.RECIPE
      ? (singleCategoryMode ? 4 : 5)
      : (singleCategoryMode ? 5 : 6)
  }`;

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
    if (err) return toast.error(err);

    const nextBarcode = draft.barcode.trim();
    const exists = nextBarcode ? cart.find((x) => x.barcode === nextBarcode) : null;
    if (exists) {
      return toast.error("This barcode is already in the list!");
    }

    // 🟢 weightItem ඉවත් කළා
    const newItem = {
      tempId: uuid(),
      name: draft.name.trim(),
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
    <div className="page-enter space-y-5 p-6">
      <div className="page-section-enter flex items-center justify-between" style={{ animationDelay: "80ms" }}>
        <h1 className="text-2xl font-semibold">Bulk Add Items</h1>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setCart([])}
            disabled={saving || cart.length === 0}
          >
            Clear List
          </Button>
          <Button onClick={saveAll} disabled={saving || cart.length === 0}>
            {saving ? "Saving..." : `Save All (${totalLines})`}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12 lg:col-span-5 space-y-4">
          <AccordionSection
            title="Product Image"
            subtitle="Paste image URL to preview"
            badge={imageBadge}
            isOpen={openImage}
            onToggle={() => setOpenImage((v) => !v)}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Image URL</label>
              <input
                className="w-full border rounded-lg px-3 py-2"
                value={draft.imageUrl}
                onChange={(e) => updateDraft("imageUrl", e.target.value)}
                placeholder="https://..."
              />

              <div className="border rounded-lg h-64 flex items-center justify-center overflow-hidden bg-gray-50">
                {draft.imageUrl ? (
                  <img
                    src={draft.imageUrl}
                    alt="preview"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <span className="text-gray-400 text-sm">
                    Image preview will appear here
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => toast("You can replace by pasting a new URL")}
                >
                  Replace
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => updateDraft("imageUrl", "")}
                  disabled={!draft.imageUrl}
                >
                  Remove
                </Button>
              </div>
            </div>
          </AccordionSection>

          <AccordionSection
            title="General Information"
            badge={generalBadge}
            isOpen={openGeneral}
            onToggle={() => setOpenGeneral((v) => !v)}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Item Name *</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={draft.name}
                  onChange={(e) => updateDraft("name", e.target.value)}
                  placeholder="Ex: Sugar 1Kg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <label className="text-sm font-medium">Barcode</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2"
                    value={draft.barcode}
                    onChange={(e) => updateDraft("barcode", e.target.value)}
                    placeholder="Leave blank for auto-generate"
                  />
                  <p className="text-xs text-slate-500">Optional. Backend will generate a barcode if this is empty.</p>
                </div>

                <div className="space-y-2 col-span-2 md:col-span-1">
                  <label className="text-sm font-medium">Reorder Level</label>
                  <input
                    type="number"
                    min="0"
                    className={`w-full border rounded-lg px-3 py-2 ${
                      draft.itemType === ItemType.SERVICE || draft.itemType === ItemType.RECIPE ? "bg-gray-100 text-gray-400" : ""
                    }`}
                    value={draft.itemType === ItemType.SERVICE || draft.itemType === ItemType.RECIPE ? "0" : draft.reorderLevel}
                    onChange={(e) => updateDraft("reorderLevel", e.target.value)}
                    disabled={draft.itemType === ItemType.SERVICE || draft.itemType === ItemType.RECIPE}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2 col-span-2 relative z-20">
                  <label className="text-sm font-medium">Category *</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <CustomSelect
                        value={singleCategoryMode ? draft.subCategoryId : draft.categoryId}
                        onChange={handleCategoryChange}
                        options={categories}
                        placeholder="Select Category"
                      />
                    </div>
                    <Button type="button" variant="secondary" onClick={() => setShowCatModal(true)} className="px-3 shrink-0">
                      <Plus size={18} />
                    </Button>
                  </div>
                </div>

                {!singleCategoryMode && (
                  <div className="space-y-2 col-span-2 relative z-10">
                    <label className="text-sm font-medium">Sub Category *</label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <CustomSelect
                          value={draft.subCategoryId}
                          onChange={(val) => updateDraft("subCategoryId", val)}
                          options={subCategories}
                          placeholder="Select Sub Category"
                          disabled={!draft.categoryId}
                        />
                      </div>
                      <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={() => setShowSubCatModal(true)} 
                        className="px-3 shrink-0"
                        disabled={!draft.categoryId}
                      >
                        <Plus size={18} />
                      </Button>
                    </div>
                  </div>
                )}

                {/* 🟢 Enum Option එක භාවිතා කිරීම */}
                <div className="space-y-2 col-span-2 p-3 bg-slate-50 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-700">Type:</label>
                    <CustomSelect
                      value={draft.itemType}
                      onChange={(val) => {
                        setIngredientSearchResults({});
                        setDraft({
                           ...draft, 
                           itemType: val,
                          defaultUnit: val === ItemType.WEIGHT ? "KG" : val === ItemType.VOLUME ? "L" : val === ItemType.SERVICE ? "SERVICE" : "PCS",
                           isKotEnabled: val === ItemType.RECIPE ? draft.isKotEnabled : false,
                           overheadCostMode: val === ItemType.RECIPE ? draft.overheadCostMode : OVERHEAD_COST_MODES.NONE,
                           overheadCostValue: val === ItemType.RECIPE ? draft.overheadCostValue : "",
                           stockProcessingEnabled: [ItemType.NORMAL, ItemType.WEIGHT, ItemType.VOLUME].includes(val)
                             ? draft.stockProcessingEnabled
                             : false,
                           processingOutputs: [ItemType.NORMAL, ItemType.WEIGHT, ItemType.VOLUME].includes(val)
                             ? draft.processingOutputs
                             : [],
                           ingredients: val === ItemType.RECIPE ? draft.ingredients : [],
                           branchIds: val === ItemType.SERVICE ? draft.branchIds : [],
                           posVisible: draft.posVisible,
                        });
                      }}
                      options={allowedItemTypeOptions}
                      valueKey="value"
                      labelKey="label"
                      className="w-[190px]"
                      buttonClassName="rounded-lg px-3 py-1.5 text-sm"
                    />

                    {(draft.itemType === ItemType.WEIGHT || draft.itemType === ItemType.VOLUME) && (
                      <div className="flex items-center gap-2 ml-4 border-l pl-4 border-slate-300">
                        <label className="text-sm font-medium text-slate-700">Unit:</label>
                        <CustomSelect
                          value={draft.defaultUnit}
                          onChange={(value) => updateDraft("defaultUnit", value)}
                          options={draft.itemType === ItemType.VOLUME ? volumeUnitOptions : weightUnitOptions}
                          valueKey="value"
                          labelKey="label"
                          className="w-[96px]"
                          buttonClassName="rounded-lg px-2 py-1.5 text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 col-span-1">
                  <label className="text-sm font-medium">Cost {priceUnitLabel(draft.itemType)}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full border rounded-lg px-3 py-2"
                    value={draft.costPrice}
                    onChange={(e) => updateDraft("costPrice", e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2 col-span-1">
                  <label className="text-sm font-medium">Sell {priceUnitLabel(draft.itemType)}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full border rounded-lg px-3 py-2"
                    value={draft.sellingPrice}
                    onChange={(e) => updateDraft("sellingPrice", e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                {draft.itemType === ItemType.SERVICE && (
                  <div className="space-y-3 col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <label className="text-sm font-medium text-slate-700">Available Branches *</label>
                        <p className="text-xs text-slate-500">This service will be available only in selected branches.</p>
                      </div>
                      <span className="text-xs font-medium text-slate-600">{draft.branchIds.length} selected</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {branches.map((branch) => {
                        const checked = draft.branchIds.includes(branch.id);
                        return (
                          <label
                            key={branch.id}
                            className={`flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition ${
                              checked ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-white"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleDraftBranch(branch.id)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-700">{branch.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {draft.itemType === ItemType.RECIPE && (
                  <div className="col-span-2 space-y-4 rounded-lg border border-rose-200 bg-rose-50 p-4">
                    <label className={`flex items-center justify-between gap-3 ${kotEnabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}>
                      <div>
                        <div className="text-sm font-medium text-slate-700">Send to Kitchen (KOT)</div>
                        <p className="text-xs text-slate-500">
                          {kotEnabled
                            ? 'Enable this when the item should appear on kitchen order tickets.'
                            : 'KOT is disabled in App Configuration.'}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={kotEnabled && !!draft.isKotEnabled}
                        disabled={!kotEnabled}
                        onChange={(e) => updateDraft("isKotEnabled", e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Recipe Overhead</label>
                        <CustomSelect
                          value={draft.overheadCostMode}
                          onChange={(value) => {
                            updateDraft("overheadCostMode", value);
                            if (value === OVERHEAD_COST_MODES.NONE) updateDraft("overheadCostValue", "");
                          }}
                          options={overheadCostOptions}
                          valueKey="value"
                          labelKey="label"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                          {draft.overheadCostMode === OVERHEAD_COST_MODES.PERCENT ? "Overhead Percent" : "Overhead Amount"}
                        </label>
                        <div className="flex rounded-lg border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-blue-500">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={draft.overheadCostValue}
                            onChange={(e) => updateDraft("overheadCostValue", e.target.value)}
                            disabled={draft.overheadCostMode === OVERHEAD_COST_MODES.NONE}
                            className="w-full rounded-l-lg px-3 py-2 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                            placeholder="0"
                          />
                          <span className="flex items-center rounded-r-lg border-l border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-500">
                            {draft.overheadCostMode === OVERHEAD_COST_MODES.PERCENT ? "%" : "LKR"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <div>
                      <div className="text-sm font-medium text-slate-700">Show in POS</div>
                      <p className="text-xs text-slate-500">Turn this off for ingredient-only stock items used in recipes.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!draft.posVisible}
                      onChange={(e) => updateDraft("posVisible", e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>

                <div className={`col-span-2 rounded-lg border p-4 ${draft.active ? "border-slate-200 bg-slate-50" : "border-red-200 bg-red-50"}`}>
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <div>
                      <div className={`text-sm font-medium ${draft.active ? "text-slate-700" : "text-red-700"}`}>
                        Active Item
                      </div>
                      <p className="text-xs text-slate-500">Inactive items stay saved but are hidden from sale and stock selection.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!draft.active}
                      onChange={(e) => updateDraft("active", e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>

            </div>
          </AccordionSection>

          {isStockTrackedDraft && (
            <AccordionSection
              title="Stock Processing"
              subtitle="Link output items produced from this stock item"
              badge={draft.stockProcessingEnabled ? `${draft.processingOutputs.length} Outputs` : "Off"}
              isOpen={openProcessing}
              onToggle={() => setOpenProcessing((v) => !v)}
            >
              <div className="space-y-4">
                <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 cursor-pointer">
                  <div>
                    <div className="text-sm font-medium text-slate-700">Enable Stock Processing</div>
                    <p className="text-xs text-slate-500">Use this item as a source that can be processed into linked outputs.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!draft.stockProcessingEnabled}
                    onChange={(e) => {
                      setDraft((prev) => ({
                        ...prev,
                        stockProcessingEnabled: e.target.checked,
                        processingOutputs: e.target.checked && prev.processingOutputs.length === 0
                          ? [buildEmptyProcessingOutput()]
                          : prev.processingOutputs,
                      }));
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                {draft.stockProcessingEnabled && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-slate-500">
                        Select output stock items and default quantities produced from this source.
                      </p>
                      <Button type="button" onClick={addProcessingOutputRow}>
                        <Plus size={16} className="mr-2" />
                        Add Output
                      </Button>
                    </div>

                    {draft.processingOutputs.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                        No output items linked yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {draft.processingOutputs.map((output, index) => (
                          <div
                            key={`${output.outputItemId || "new"}-${index}`}
                            className={`relative grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_140px_120px_52px] ${
                              processingOutputSearchResults[index]?.loading || (processingOutputSearchResults[index]?.items || []).length > 0 ? "z-50" : "z-0"
                            }`}
                          >
                            <div>
                              <label className="mb-1 block text-sm font-medium text-slate-700">Output Item</label>
                              <div className="relative">
                                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                  type="text"
                                  value={output.search || ""}
                                  onChange={(e) => searchProcessingOutputItems(index, e.target.value)}
                                  onKeyDown={(e) => handleProcessingOutputSearchKeyDown(index, e)}
                                  onBlur={() => window.setTimeout(() => clearProcessingOutputSearchResults(index), 150)}
                                  placeholder="Search output item..."
                                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                          className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-2 text-left transition hover:bg-blue-50 last:border-b-0"
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
                              <label className="mb-1 block text-sm font-medium text-slate-700">Default Qty</label>
                              <div className="grid grid-cols-[minmax(0,1fr)_64px] gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.001"
                                  value={output.defaultQty}
                                  onChange={(e) => updateProcessingOutput(index, "defaultQty", e.target.value)}
                                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="0"
                                />
                                <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-600">
                                  {output.defaultQtyUnit || output.defaultUnit || "PCS"}
                                </div>
                              </div>
                            </div>

                            <label className="flex items-end gap-2 pb-2 text-sm font-medium text-slate-700">
                              <input
                                type="checkbox"
                                checked={!!output.waste}
                                onChange={(e) => updateProcessingOutput(index, "waste", e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              Waste
                            </label>

                            <div className="flex items-end">
                              <button
                                type="button"
                                onClick={() => removeProcessingOutput(index)}
                                className="flex h-[42px] w-[42px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:text-red-600"
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
            </AccordionSection>
          )}

          {draft.itemType === ItemType.RECIPE && (
            <AccordionSection
              title="Recipe Ingredients"
              subtitle="Search and add stock items used by this recipe"
              badge={`${draft.ingredients.length} Items`}
              isOpen={openRecipe}
              onToggle={() => setOpenRecipe((v) => !v)}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-slate-500">
                    Search ingredients by name or barcode. Stock quantity is not shown here.
                  </p>
                  <Button type="button" onClick={addIngredientRow}>
                    <Plus size={16} className="mr-2" />
                    Add Ingredient
                  </Button>
                </div>

                {draft.ingredients.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                    No ingredients added yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {draft.ingredients.map((ingredient, index) => (
                      <div
                        key={`${ingredient.ingredientItemId || "new"}-${index}`}
                        className={`relative grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_120px_120px_52px] ${
                          ingredientSearchResults[index]?.loading || (ingredientSearchResults[index]?.items || []).length > 0 ? "z-50" : "z-0"
                        }`}
                      >
                        <div>
                          <label className="mb-1 block text-sm font-medium text-slate-700">Ingredient</label>
                          <div className="relative">
                            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              value={ingredient.search || ""}
                              onChange={(e) => searchIngredientItems(index, e.target.value)}
                              onKeyDown={(e) => handleIngredientSearchKeyDown(index, e)}
                              onBlur={() => window.setTimeout(() => clearIngredientSearchResults(index), 150)}
                              placeholder="Scan barcode or type ingredient name..."
                              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                      className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-2 text-left transition hover:bg-blue-50 last:border-b-0"
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
                          <label className="mb-1 block text-sm font-medium text-slate-700">Qty</label>
                          <input
                            type="number"
                            min="0"
                            step="0.001"
                            value={ingredient.quantity}
                            onChange={(e) => updateIngredient(index, "quantity", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium text-slate-700">Unit</label>
                          <CustomSelect
                            value={ingredient.qtyUnit}
                            onChange={(value) => updateIngredient(index, "qtyUnit", value)}
                            options={recipeUnitOptions}
                            valueKey="value"
                            labelKey="label"
                          />
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => removeIngredient(index)}
                            className="flex h-[42px] w-[42px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:text-red-600"
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
            </AccordionSection>
          )}

          <Card className="sales-panel-enter sales-panel-hover p-4" style={{ animationDelay: "180ms" }}>
            <Button onClick={addToList} className="w-full">
              + Add to List
            </Button>
          </Card>
        </div>

        <div className="col-span-12 lg:col-span-7">
          <Card className="sales-panel-enter p-4 space-y-4" style={{ animationDelay: "130ms" }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Items List</h2>
                <p className="text-sm text-gray-500">
                  Items to save: {totalLines}
                </p>
              </div>
            </div>

            {cart.length === 0 ? (
              <div className="rounded-lg border p-8 text-center text-gray-500">
                No items added yet. Add items from the form.
              </div>
            ) : (
              <div className="overflow-auto rounded-lg border">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left">
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2">Barcode</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">POS</th>
                      <th className="px-3 py-2 text-right">Cost</th>
                      <th className="px-3 py-2 text-right">Sell</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {cart.map((row) => (
                      <tr key={row.tempId} className="border-t">
                        <td className="px-3 py-2 whitespace-nowrap">{row.name}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.barcode || "Auto"}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                            <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded border">{row.itemType}</span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`text-xs px-1.5 py-0.5 rounded border ${
                            row.posVisible ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}>
                            {row.posVisible ? "Visible" : "Hidden"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">{row.costPrice}</td>
                        <td className="px-3 py-2 text-right">{row.sellingPrice}</td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-2">
                            <button
                              className="px-2 py-1 rounded border hover:bg-gray-50"
                              onClick={() => editRow(row.tempId)}
                            >
                              Edit
                            </button>
                            <button
                              className="px-2 py-1 rounded border hover:bg-red-50 text-red-600"
                              onClick={() => removeRow(row.tempId)}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal isOpen={showCatModal} onClose={() => !savingCat && setShowCatModal(false)} title="Add New Category">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category Name</label>
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Sub-Category Name</label>
            <input
              type="text"
              value={newSubCatName}
              onChange={(e) => setNewSubCatName(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
