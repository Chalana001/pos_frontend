import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";

import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal"; // 🟢 Modal component eka import kala

import { itemsAPI } from "../api/items.api";
import { categoriesAPI } from "../api/categories.api";

import { ChevronDown, ChevronRight, Plus, X, Image as ImageIcon } from "lucide-react";

/* -----------------------------
  Collapsible Section UI
------------------------------ */
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

const ItemFormPage = ({ mode }) => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [submitting, setSubmitting] = useState(false);
  const [loadingItem, setLoadingItem] = useState(false);

  // sections
  const [secGeneral, setSecGeneral] = useState(true);
  const [secLabels, setSecLabels] = useState(false);

  // form data
  const [formData, setFormData] = useState({
    name: "",
    barcode: "",
    categoryId: "",
    subCategoryId: "",
    costPrice: "",
    sellingPrice: "",
    reorderLevel: "",
    imageUrl: "",
  });

  // Categories & SubCategories State
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);

  // 🟢 Modal States
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [savingCat, setSavingCat] = useState(false);

  const [showSubCatModal, setShowSubCatModal] = useState(false);
  const [newSubCatName, setNewSubCatName] = useState("");
  const [savingSubCat, setSavingSubCat] = useState(false);

  // image preview error
  const [imgError, setImgError] = useState(false);

  // labels UI
  const [labels, setLabels] = useState([]);
  const [labelInput, setLabelInput] = useState("");

  /* -----------------------------
    Load Categories
  ------------------------------ */
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

  /* -----------------------------
    Load item (edit only)
  ------------------------------ */
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

  /* -----------------------------
    Category & Sub-Category Handlers (Modals)
  ------------------------------ */
  const handleCategoryChange = (catId) => {
    setFormData((prev) => ({ ...prev, categoryId: catId, subCategoryId: "" }));
    loadSubCategories(catId);
  };

  // 🟢 Create Category Submit
  const submitNewCategory = async () => {
    if (!newCatName.trim()) return toast.error("Category name is required");
    
    setSavingCat(true);
    try {
      const res = await categoriesAPI.create({ name: newCatName.trim() });
      toast.success("Category created!");
      await loadCategories();
      handleCategoryChange(res.data.id); // Auto select new category
      
      // Close modal and reset
      setShowCatModal(false);
      setNewCatName("");
    } catch (e) {
      toast.error("Failed to create category");
    } finally {
      setSavingCat(false);
    }
  };

  // 🟢 Create Sub-Category Submit
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
      setFormData((prev) => ({ ...prev, subCategoryId: res.data.id })); // Auto select
      
      // Close modal and reset
      setShowSubCatModal(false);
      setNewSubCatName("");
    } catch (e) {
      toast.error("Failed to create sub-category");
    } finally {
      setSavingSubCat(false);
    }
  };

  /* -----------------------------
    Create/Edit Submit (Items)
  ------------------------------ */
  const submitItem = async () => {
    if (!formData.name.trim() || !formData.barcode.trim() || !formData.subCategoryId) {
      toast.error("Please fill required fields (Name, Barcode, Sub Category)");
      setSecGeneral(true);
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
        reorderLevel: Number(formData.reorderLevel || 0),
        imageUrl: formData.imageUrl?.trim() || null,
        active: true,
      };

      if (mode === "edit") {
        await itemsAPI.update(id, payload);
        toast.success("Item updated ✅");
      } else {
        await itemsAPI.create(payload);
        toast.success("Item created ✅");
      }
      navigate("/items");
    } catch (error) {
      toast.error(error.response?.data?.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  /* -----------------------------
    Labels UI
  ------------------------------ */
  const addLabel = () => {
    const v = labelInput.trim();
    if (!v) return;
    if (labels.includes(v)) return setLabelInput("");
    setLabels((prev) => [...prev, v]);
    setLabelInput("");
  };

  const removeLabel = (v) => setLabels((prev) => prev.filter((x) => x !== v));

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
            {/* LEFT COLUMN: Product Image */}
            <div className="lg:col-span-1">
              {/* Image Section code remains exactly the same... */}
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
                      className="w-full border border-slate-300 rounded-lg px-3 py-2"
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

            {/* RIGHT COLUMN: General + Labels */}
            <div className="lg:col-span-2 space-y-6">
              {/* 1. General */}
              <Section
                title="General Information"
                open={secGeneral}
                onToggle={() => setSecGeneral((v) => !v)}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Item Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Barcode *</label>
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>

                  {/* 🟢 Category Dropdown with Custom Modal Trigger */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                    <div className="flex gap-2">
                      <select
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                        value={formData.categoryId}
                        onChange={(e) => handleCategoryChange(e.target.value)}
                      >
                        <option value="">Select Category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <Button type="button" variant="secondary" onClick={() => setShowCatModal(true)} className="px-3">
                        <Plus size={18} />
                      </Button>
                    </div>
                  </div>

                  {/* 🟢 Sub Category Dropdown with Custom Modal Trigger */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Sub Category *</label>
                    <div className="flex gap-2">
                      <select
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                        value={formData.subCategoryId}
                        onChange={(e) => setFormData({ ...formData, subCategoryId: e.target.value })}
                        disabled={!formData.categoryId}
                      >
                        <option value="">Select Sub Category</option>
                        {subCategories.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowSubCatModal(true)}
                        className="px-3"
                        disabled={!formData.categoryId}
                      >
                        <Plus size={18} />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Cost Price</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Selling Price</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={formData.sellingPrice}
                      onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Reorder Level</label>
                    <input
                      type="number" min="0"
                      value={formData.reorderLevel}
                      onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
              </Section>

              {/* 2. Labels */}
              <Section title="Label and Certificate" open={secLabels} onToggle={() => setSecLabels((v) => !v)}>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={labelInput}
                      onChange={(e) => setLabelInput(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 flex-1"
                      placeholder="Add label"
                    />
                    <Button type="button" onClick={addLabel}>
                      <Plus size={18} className="mr-2" /> Add
                    </Button>
                  </div>
                  {labels.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {labels.map((l) => (
                        <div key={l} className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm">
                          {l}
                          <button type="button" onClick={() => removeLabel(l)} className="text-slate-500 hover:text-slate-800">
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Section>

              {/* Footer Buttons */}
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

      {/* 🟢 Category Modal */}
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

      {/* 🟢 Sub-Category Modal */}
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