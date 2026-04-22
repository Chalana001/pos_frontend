import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import Modal from "../components/common/Modal"; 
import CustomSelect from "../components/common/CustomSelect"; 
import AccordionSection from "../components/items/BulkItemForm";
import { itemsAPI } from "../api/items.api";
import { categoriesAPI } from "../api/categories.api"; 
import { useBranch } from "../context/BranchContext";
import { Plus } from "lucide-react";
import { ItemType, ItemTypeLabels } from "../utils/constants"; // 🟢 Constant එක Import කළා

const uuid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

const num = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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
  branchIds: [],
});

export default function BulkAddItems() {
  const { branches: availableBranches } = useBranch();
  const [draft, setDraft] = useState(emptyDraft());
  const [cart, setCart] = useState([]);
  const [saving, setSaving] = useState(false);

  const [openImage, setOpenImage] = useState(true);
  const [openGeneral, setOpenGeneral] = useState(true);

  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);

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

  const handleCategoryChange = (catId) => {
    updateDraft("categoryId", catId);
    updateDraft("subCategoryId", "");
    loadSubCategories(catId);
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

  const imageBadge = draft.imageUrl?.trim() ? "1 Image" : "0 Image";

  const generalFilledCount = useMemo(() => {
    let c = 0;
    if (draft.name.trim()) c++;
    if (draft.barcode.trim()) c++;
    if (String(draft.categoryId).trim()) c++;
    if (String(draft.subCategoryId).trim()) c++;
    if (String(draft.costPrice).trim()) c++;
    if (String(draft.sellingPrice).trim()) c++;
    if (String(draft.reorderLevel).trim() && draft.itemType !== ItemType.SERVICE) c++;
    return c;
  }, [draft]);

  const generalBadge = `${generalFilledCount}/${draft.itemType === ItemType.SERVICE ? 6 : 7}`;

  const validateGeneral = () => {
    if (!draft.name.trim()) return "Item name is required";
    if (!draft.barcode.trim()) return "Barcode is required";
    if (!String(draft.categoryId).trim()) return "Category is required";
    if (!String(draft.subCategoryId).trim()) return "Sub Category is required";

    const cost = num(draft.costPrice);
    const sell = num(draft.sellingPrice);
    if (cost === null || cost < 0) return "Cost price invalid";
    if (sell === null || sell < 0) return "Selling price invalid";
    if (draft.itemType === ItemType.SERVICE && draft.branchIds.length === 0) {
      return "Select at least one branch for the service";
    }

    return null;
  };

  const addToList = () => {
    const err = validateGeneral();
    if (err) return toast.error(err);

    const exists = cart.find((x) => x.barcode === draft.barcode.trim());
    if (exists) {
      return toast.error("This barcode is already in the list!");
    }

    // 🟢 weightItem ඉවත් කළා
    const newItem = {
      tempId: uuid(),
      name: draft.name.trim(),
      barcode: draft.barcode.trim(),
      categoryId: draft.categoryId, 
      subCategoryId: Number(draft.subCategoryId),
      imageUrl: draft.imageUrl?.trim() || "",
      costPrice: num(draft.costPrice),
      sellingPrice: num(draft.sellingPrice),
      reorderLevel: draft.itemType === ItemType.SERVICE ? 0 : (num(draft.reorderLevel) ?? 0),
      itemType: draft.itemType,
      defaultUnit:
        draft.itemType === ItemType.WEIGHT
          ? draft.defaultUnit
          : draft.itemType === ItemType.SERVICE
            ? "SERVICE"
            : "PCS",
      branchIds: draft.itemType === ItemType.SERVICE ? draft.branchIds : [],
      active: true,
    };

    setCart((prev) => [...prev, newItem]);
    
    setDraft(emptyDraft());
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
      branchIds: row.branchIds || [],
    });

    if (row.categoryId) {
      loadSubCategories(row.categoryId);
    }

    removeRow(tempId);
    setOpenGeneral(true);
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
        defaultUnit: item.defaultUnit,
        ...(item.itemType === ItemType.SERVICE ? { branchIds: item.branchIds } : {}),
        active: item.active,
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
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
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
                  <label className="text-sm font-medium">Barcode *</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2"
                    value={draft.barcode}
                    onChange={(e) => updateDraft("barcode", e.target.value)}
                    placeholder="123456"
                  />
                </div>

                <div className="space-y-2 col-span-2 md:col-span-1">
                  <label className="text-sm font-medium">Reorder Level</label>
                  <input
                    type="number"
                    min="0"
                    className={`w-full border rounded-lg px-3 py-2 ${draft.itemType === ItemType.SERVICE ? "bg-gray-100 text-gray-400" : ""}`}
                    value={draft.itemType === ItemType.SERVICE ? "0" : draft.reorderLevel}
                    onChange={(e) => updateDraft("reorderLevel", e.target.value)}
                    disabled={draft.itemType === ItemType.SERVICE}
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2 col-span-2 relative z-20">
                  <label className="text-sm font-medium">Category *</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <CustomSelect
                        value={draft.categoryId}
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

                {/* 🟢 Enum Option එක භාවිතා කිරීම */}
                <div className="space-y-2 col-span-2 p-3 bg-slate-50 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-700">Type:</label>
                    <select
                      value={draft.itemType}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraft({
                           ...draft, 
                           itemType: val,
                           defaultUnit: val === ItemType.WEIGHT ? "KG" : val === ItemType.SERVICE ? "SERVICE" : "PCS",
                           branchIds: val === ItemType.SERVICE ? draft.branchIds : [],
                        });
                      }}
                      className="border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                    >
                      <option value={ItemType.NORMAL}>{ItemTypeLabels.NORMAL}</option>
                      <option value={ItemType.WEIGHT}>{ItemTypeLabels.WEIGHT}</option>
                      <option value={ItemType.SERVICE}>{ItemTypeLabels.SERVICE}</option>
                    </select>

                    {draft.itemType === ItemType.WEIGHT && (
                      <div className="flex items-center gap-2 ml-4 border-l pl-4 border-slate-300">
                        <label className="text-sm font-medium text-slate-700">Unit:</label>
                        <select
                          value={draft.defaultUnit}
                          onChange={(e) => updateDraft("defaultUnit", e.target.value)}
                          className="border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                        >
                          <option value="KG">KG</option>
                          <option value="G">G</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 col-span-1">
                  <label className="text-sm font-medium">Cost {draft.itemType === ItemType.WEIGHT && "(per 1 KG)"}</label>
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
                  <label className="text-sm font-medium">Sell {draft.itemType === ItemType.WEIGHT && "(per 1 KG)"}</label>
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
              </div>

              <div className="pt-2">
                <Button onClick={addToList} className="w-full">
                  + Add to List
                </Button>
              </div>
            </div>
          </AccordionSection>
        </div>

        <div className="col-span-12 lg:col-span-7">
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Items List</h2>
                <p className="text-sm text-gray-500">
                  Items to save: {totalLines}
                </p>
              </div>
            </div>

            {cart.length === 0 ? (
              <div className="border rounded-lg p-8 text-center text-gray-500">
                No items added yet. Add items from the form.
              </div>
            ) : (
              <div className="overflow-auto border rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left">
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2">Barcode</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2 text-right">Cost</th>
                      <th className="px-3 py-2 text-right">Sell</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {cart.map((row) => (
                      <tr key={row.tempId} className="border-t">
                        <td className="px-3 py-2 whitespace-nowrap">{row.name}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{row.barcode}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                            <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded border">{row.itemType}</span>
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
