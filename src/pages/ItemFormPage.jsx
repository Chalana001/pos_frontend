import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";

import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import CustomSelect from "../components/common/CustomSelect";

import { itemsAPI } from "../api/items.api";
import { categoriesAPI } from "../api/categories.api";
import { useBranch } from "../context/BranchContext";
import { ItemType, ItemTypeLabels } from "../utils/constants";

import { ChevronDown, ChevronRight, Plus, X, Image as ImageIcon, ChefHat, Search, Trash2 } from "lucide-react";

const Section = ({ title, open, onToggle, right, children }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition"
      >
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <div className="flex items-center gap-3">
          {right}
          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </button>
      {open && <div className="p-5">{children}</div>}
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

const itemTypeOptions = [
  { value: ItemType.NORMAL, label: ItemTypeLabels.NORMAL },
  { value: ItemType.WEIGHT, label: ItemTypeLabels.WEIGHT },
  { value: ItemType.SERVICE, label: ItemTypeLabels.SERVICE },
  { value: ItemType.RECIPE, label: ItemTypeLabels.RECIPE },
];

const weightUnitOptions = [
  { value: "KG", label: "KG" },
  { value: "G", label: "G" },
];

const recipeUnitOptions = [
  { value: "PCS", label: "PCS" },
  { value: "KG", label: "KG" },
  { value: "G", label: "G" },
];

const ItemFormPage = ({ mode }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { branches: availableBranches } = useBranch();

  const [submitting, setSubmitting] = useState(false);
  const [loadingItem, setLoadingItem] = useState(false);

  const [secGeneral, setSecGeneral] = useState(true);
  const [secRecipe, setSecRecipe] = useState(true);
  const [secLabels, setSecLabels] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
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
  });

  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [ingredientSearchResults, setIngredientSearchResults] = useState({});
  const ingredientSearchRequestRef = useRef({});

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
  }, []);

  const loadCategories = async () => {
    try {
      const res = await categoriesAPI.getAll();
      setCategories(res.data || []);
    } catch (e) {
      toast.error("Failed to load categories");
    }
  };

  const loadSubCategories = async (catId) => {
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
          barcode: item.barcode ?? "",
          categoryId: item.categoryId ?? "",
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
        });

        if (item.categoryId) {
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
  }, [mode, id, navigate]);

  const handleCategoryChange = (catId) => {
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
      const res = await categoriesAPI.create({ name: newCatName.trim() });
      toast.success("Category created!");
      await loadCategories();
      handleCategoryChange(res.data.id);

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
          (item.itemType === ItemType.NORMAL || item.itemType === ItemType.WEIGHT) &&
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
        qtyUnit: ingredientItem.defaultUnit || (ingredientItem.itemType === ItemType.WEIGHT ? "KG" : "PCS"),
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

  const submitItem = async () => {
    if (!formData.name.trim() || !formData.subCategoryId) {
      toast.error("Please fill required fields (Name, Sub Category)");
      setSecGeneral(true);
      return;
    }

    if (formData.itemType === ItemType.SERVICE && formData.branchIds.length === 0) {
      toast.error("Select at least one branch for the service");
      setSecGeneral(true);
      return;
    }

    if (formData.itemType === ItemType.RECIPE && formData.ingredients.length === 0) {
      toast.error("Add at least one ingredient for the recipe");
      setSecRecipe(true);
      return;
    }

    if (
      formData.itemType === ItemType.RECIPE &&
      formData.ingredients.some((ingredient) => !ingredient.ingredientItemId || Number(ingredient.quantity || 0) <= 0)
    ) {
      toast.error("Select each ingredient from search and enter a valid quantity");
      setSecRecipe(true);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        barcode: formData.barcode.trim(),
        subCategoryId: Number(formData.subCategoryId),
        costPrice: Number(formData.costPrice || 0),
        sellingPrice: Number(formData.sellingPrice || 0),
        reorderLevel: formData.itemType === ItemType.SERVICE || formData.itemType === ItemType.RECIPE
          ? 0
          : Number(formData.reorderLevel || 0),
        imageUrl: formData.imageUrl?.trim() || null,
        itemType: formData.itemType,
        isKotEnabled: formData.itemType === ItemType.RECIPE ? !!formData.isKotEnabled : false,
        ingredients: formData.itemType === ItemType.RECIPE
          ? formData.ingredients.map((ingredient) => ({
              ingredientItemId: Number(ingredient.ingredientItemId),
              quantity: Number(ingredient.quantity || 0),
              qtyUnit: ingredient.qtyUnit,
            }))
          : [],
        defaultUnit:
          formData.itemType === ItemType.WEIGHT
            ? formData.defaultUnit
            : formData.itemType === ItemType.SERVICE
              ? "SERVICE"
              : "PCS",
        active: formData.active,
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">
          {mode === "edit" ? "Edit Item" : "Add New Item"}
        </h1>
      </div>

      <Card>
        {loadingItem ? (
          <div className="py-12 text-slate-600">Loading item...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden h-full">
                <div className="px-5 py-4 bg-slate-50 border-b">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <ImageIcon size={18} />
                    Product Image
                  </h3>
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Image URL
                    </label>
                    <input
                      type="text"
                      value={formData.imageUrl}
                      onChange={(e) => {
                        setFormData({ ...formData, imageUrl: e.target.value });
                        setImgError(false);
                      }}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
                      {formData.imageUrl && !imgError ? (
                        <img
                          src={formData.imageUrl}
                          alt="preview"
                          className="w-full h-full object-cover"
                          onError={() => setImgError(true)}
                        />
                      ) : (
                        <div className="text-center text-slate-500 text-sm px-4">
                          {imgError ? "Invalid image URL" : "Image preview"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <Section
                title="General Information"
                open={secGeneral}
                onToggle={() => setSecGeneral((value) => !value)}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Item Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Barcode *</label>
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="relative z-20">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                    <div className="flex gap-2">
                      <CustomSelect
                        value={formData.categoryId}
                        onChange={handleCategoryChange}
                        options={categories}
                        placeholder="Select Category"
                      />
                      <Button type="button" variant="secondary" onClick={() => setShowCatModal(true)} className="px-3 shrink-0">
                        <Plus size={18} />
                      </Button>
                    </div>
                  </div>

                  <div className="relative z-10">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Sub Category *</label>
                    <div className="flex gap-2">
                      <CustomSelect
                        value={formData.subCategoryId}
                        onChange={(value) => setFormData({ ...formData, subCategoryId: value })}
                        options={subCategories}
                        placeholder="Select Sub Category"
                        disabled={!formData.categoryId}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowSubCatModal(true)}
                        className="px-3 shrink-0"
                        disabled={!formData.categoryId}
                      >
                        <Plus size={18} />
                      </Button>
                    </div>
                  </div>

                  <div className="md:col-span-2 flex flex-col md:flex-row items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium text-slate-700">Item Type:</label>
                      <CustomSelect
                        value={formData.itemType}
                        onChange={(value) => {
                          setFormData({
                            ...formData,
                            itemType: value,
                            defaultUnit: value === ItemType.WEIGHT ? "KG" : value === ItemType.SERVICE ? "SERVICE" : "PCS",
                            isKotEnabled: value === ItemType.RECIPE ? formData.isKotEnabled : false,
                            ingredients: value === ItemType.RECIPE ? formData.ingredients : [],
                            branchIds: value === ItemType.SERVICE ? formData.branchIds : [],
                          });
                        }}
                        options={itemTypeOptions}
                        valueKey="value"
                        labelKey="label"
                        className="w-[190px]"
                        buttonClassName="rounded-lg px-3 py-1.5"
                      />
                    </div>

                    {formData.itemType === ItemType.WEIGHT && (
                      <div className="flex items-center gap-2 mt-2 md:mt-0 md:ml-4 border-l md:pl-4 border-slate-300">
                        <label className="text-sm font-medium text-slate-700">Default Unit:</label>
                        <CustomSelect
                          value={formData.defaultUnit}
                          onChange={(value) => setFormData({ ...formData, defaultUnit: value })}
                          options={weightUnitOptions}
                          valueKey="value"
                          labelKey="label"
                          className="w-[96px]"
                          buttonClassName="rounded-lg px-3 py-1.5"
                        />
                      </div>
                    )}
                  </div>

                  {formData.itemType === ItemType.RECIPE && (
                    <div className="md:col-span-2 rounded-xl border border-rose-200 bg-rose-50 p-4">
                      <label className="flex items-center justify-between gap-3 cursor-pointer">
                        <div>
                          <div className="text-sm font-medium text-slate-700">Send to Kitchen (KOT)</div>
                          <p className="text-xs text-slate-500">Enable this when the item should appear on kitchen order tickets.</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={!!formData.isKotEnabled}
                          onChange={(e) => setFormData({ ...formData, isKotEnabled: e.target.checked })}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                    </div>
                  )}

                  {formData.itemType === ItemType.SERVICE && (
                    <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-700">Available Branches *</label>
                          <p className="text-xs text-slate-500">This service is visible in POS only for selected branches.</p>
                        </div>
                        <span className="text-xs font-medium text-slate-600">{formData.branchIds.length} selected</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {branches.map((branch) => {
                          const checked = formData.branchIds.includes(branch.id);
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
                                onChange={() => toggleBranchId(branch.id)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-slate-700">{branch.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Cost Price {formData.itemType === ItemType.WEIGHT && "(per 1 KG)"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Selling Price {formData.itemType === ItemType.WEIGHT && "(per 1 KG)"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.sellingPrice}
                      onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Reorder Level</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.itemType === ItemType.SERVICE || formData.itemType === ItemType.RECIPE ? "0" : formData.reorderLevel}
                      onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                      disabled={formData.itemType === ItemType.SERVICE || formData.itemType === ItemType.RECIPE}
                      className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formData.itemType === ItemType.SERVICE || formData.itemType === ItemType.RECIPE
                          ? "bg-slate-100 text-slate-400 border-slate-200"
                          : "border-slate-300"
                      }`}
                    />
                  </div>
                </div>
              </Section>

              {formData.itemType === ItemType.RECIPE && (
                <Section
                  title="Recipe Ingredients"
                  open={secRecipe}
                  onToggle={() => setSecRecipe((value) => !value)}
                  right={<ChefHat size={18} className="text-rose-500" />}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-slate-500">
                        Select the stock items that should be deducted when this food item is sold.
                      </p>
                      <Button type="button" onClick={addIngredientRow}>
                        <Plus size={16} className="mr-2" />
                        Add Ingredient
                      </Button>
                    </div>

                    {formData.ingredients.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                        No ingredients added yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {formData.ingredients.map((ingredient, index) => (
                          <div key={`${ingredient.ingredientItemId || "new"}-${index}`} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_120px_120px_52px]">
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
                                  <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl">
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
                </Section>
              )}

              <Section title="Label and Certificate" open={secLabels} onToggle={() => setSecLabels((value) => !value)}>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={labelInput}
                      onChange={(e) => setLabelInput(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add label"
                    />
                    <Button type="button" onClick={addLabel}>
                      <Plus size={18} className="mr-2" /> Add
                    </Button>
                  </div>
                  {labels.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {labels.map((label) => (
                        <div key={label} className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm">
                          {label}
                          <button type="button" onClick={() => removeLabel(label)} className="text-slate-500 hover:text-slate-800">
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Section>

              <div className="flex justify-end gap-2 border-t pt-4">
                <Button type="button" variant="secondary" onClick={() => navigate("/items")} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="button" onClick={submitItem} disabled={submitting}>
                  {submitting ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

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
};

export default ItemFormPage;
